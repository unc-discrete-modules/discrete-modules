import base64
import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import xmlsec
from lxml import etree
from onelogin.saml2.constants import OneLogin_Saml2_Constants as C
from onelogin.saml2.utils import OneLogin_Saml2_Utils

from src.services.saml import ENTITY_ID, ISSUER

ACS = "https://discrete-modules.apps.cloudapps.unc.edu/saml/acs"


def certificate(directory: Path, name: str) -> tuple[Path, Path]:
    key, cert = directory / f"{name}.key", directory / f"{name}.crt"
    subprocess.run(
        [
            "openssl",
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-nodes",
            "-keyout",
            str(key),
            "-out",
            str(cert),
            "-days",
            "2",
            "-subj",
            f"/CN={name}.example.test",
        ],
        check=True,
        capture_output=True,
    )
    return key, cert


def idp_metadata(cert: Path) -> str:
    encoded = "".join(cert.read_text().splitlines()[1:-1])
    return f'''<md:EntityDescriptor xmlns:md="{C.NS_MD}" xmlns:ds="{C.NS_DS}"
        entityID="{ISSUER}">
      <md:IDPSSODescriptor protocolSupportEnumeration="{C.NS_SAMLP}"
          WantAuthnRequestsSigned="true">
        <md:KeyDescriptor use="signing"><ds:KeyInfo><ds:X509Data>
          <ds:X509Certificate>{encoded}</ds:X509Certificate>
        </ds:X509Data></ds:KeyInfo></md:KeyDescriptor>
        <md:SingleSignOnService Binding="{C.BINDING_HTTP_POST}"
          Location="https://sso.unc.edu/idp/profile/SAML2/POST/SSO"/>
      </md:IDPSSODescriptor>
    </md:EntityDescriptor>'''


def saml_response(
    key: Path,
    cert: Path,
    request_id: str,
    *,
    email="student@example.unc.edu",
    mutate=None,
    signed="assertion",
    encrypt_to: Path | None = None,
) -> str:
    now = datetime.now(UTC)

    def timestamp(delta=0):
        return (now + timedelta(seconds=delta)).strftime("%Y-%m-%dT%H:%M:%SZ")

    root = etree.fromstring(
        f'''<samlp:Response xmlns:samlp="{C.NS_SAMLP}"
        xmlns:saml="{C.NS_SAML}" ID="_{uuid4().hex}" Version="2.0"
        IssueInstant="{timestamp()}" Destination="{ACS}" InResponseTo="{request_id}">
      <saml:Issuer>{ISSUER}</saml:Issuer>
      <samlp:Status><samlp:StatusCode Value="{C.STATUS_SUCCESS}"/></samlp:Status>
      <saml:Assertion ID="_{uuid4().hex}" Version="2.0" IssueInstant="{timestamp()}">
        <saml:Issuer>{ISSUER}</saml:Issuer>
        <saml:Subject>
          <saml:NameID Format="{C.NAMEID_EMAIL_ADDRESS}"/>
          <saml:SubjectConfirmation Method="{C.CM_BEARER}">
            <saml:SubjectConfirmationData InResponseTo="{request_id}"
              Recipient="{ACS}" NotOnOrAfter="{timestamp(300)}"/>
          </saml:SubjectConfirmation>
        </saml:Subject>
        <saml:Conditions NotBefore="{timestamp(-60)}" NotOnOrAfter="{timestamp(300)}">
          <saml:AudienceRestriction><saml:Audience>{ENTITY_ID}</saml:Audience></saml:AudienceRestriction>
        </saml:Conditions>
        <saml:AuthnStatement AuthnInstant="{timestamp()}" SessionIndex="test-session"
            SessionNotOnOrAfter="{timestamp(3600)}">
          <saml:AuthnContext><saml:AuthnContextClassRef>{C.AC_PASSWORD_PROTECTED}</saml:AuthnContextClassRef></saml:AuthnContext>
        </saml:AuthnStatement>
        <saml:AttributeStatement>
          <saml:Attribute Name="urn:oid:0.9.2342.19200300.100.1.3"><saml:AttributeValue/></saml:Attribute>
        </saml:AttributeStatement>
      </saml:Assertion>
    </samlp:Response>'''.encode()
    )
    root.find(".//saml:NameID", C.NSMAP).text = email
    root.find(".//saml:AttributeValue", C.NSMAP).text = email
    if mutate:
        mutate(root)
    assertion = root.find("saml:Assertion", C.NSMAP)
    if signed == "assertion":
        root.replace(
            assertion,
            etree.fromstring(
                OneLogin_Saml2_Utils.add_sign(
                    etree.tostring(assertion), key.read_text(), cert.read_text()
                )
            ),
        )
    if encrypt_to:
        assertion = root.find("saml:Assertion", C.NSMAP)
        wrapper = etree.Element(f"{{{C.NS_SAML}}}EncryptedAssertion")
        template = xmlsec.template.encrypted_data_create(
            root, xmlsec.Transform.AES128, type=xmlsec.EncryptionType.ELEMENT, ns="xenc"
        )
        xmlsec.template.encrypted_data_ensure_cipher_value(template)
        info = xmlsec.template.encrypted_data_ensure_key_info(template, ns="ds")
        encrypted_key = xmlsec.template.add_encrypted_key(
            info, xmlsec.Transform.RSA_OAEP
        )
        xmlsec.template.encrypted_data_ensure_cipher_value(encrypted_key)
        manager = xmlsec.KeysManager()
        manager.add_key(
            xmlsec.Key.from_file(str(encrypt_to), xmlsec.KeyFormat.CERT_PEM)
        )
        context = xmlsec.EncryptionContext(manager)
        context.key = xmlsec.Key.generate(
            xmlsec.KeyData.AES, 128, xmlsec.KeyDataType.SESSION
        )
        encrypted = context.encrypt_xml(template, assertion)
        root.replace(encrypted, wrapper)
        wrapper.append(encrypted)
    if signed == "response":
        root = etree.fromstring(
            OneLogin_Saml2_Utils.add_sign(root, key.read_text(), cert.read_text())
        )
    return base64.b64encode(etree.tostring(root)).decode()
