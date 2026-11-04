from dataclasses import dataclass
from urllib.parse import urlsplit

from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.constants import OneLogin_Saml2_Constants as C
from onelogin.saml2.idp_metadata_parser import OneLogin_Saml2_IdPMetadataParser
from onelogin.saml2.response import OneLogin_Saml2_Response
from onelogin.saml2.settings import OneLogin_Saml2_Settings
from onelogin.saml2.utils import OneLogin_Saml2_Utils

from src.config import Settings
from src.email import validate_email

ISSUER = "https://sso.unc.edu/idp"
ENTITY_ID = "https://discrete-modules.apps.cloudapps.unc.edu/"
ACS_PATH = "/saml/acs"


class SamlConfigurationError(Exception):
    pass


class SamlValidationError(Exception):
    pass


class CorrelatedResponse(OneLogin_Saml2_Response):
    def is_valid(self, request_data, request_id=None, raise_exceptions=False):
        if not super().is_valid(request_data, request_id, raise_exceptions):
            return False
        try:
            expected_acs = self._settings.get_sp_data()["assertionConsumerService"][
                "url"
            ]
            if (
                self.document.get("Destination") != expected_acs
                or self.get_in_response_to() != request_id
            ):
                raise ValueError("Invalid destination or correlation")
            restrictions = self._query_assertion(
                "/saml:Conditions/saml:AudienceRestriction"
            )
            if not restrictions or any(
                ENTITY_ID
                not in node.xpath("./saml:Audience/text()", namespaces=C.NSMAP)
                for node in restrictions
            ):
                raise ValueError("Missing or invalid audience restriction")
            if self._query_assertion("/saml:Issuer/text()") != [ISSUER]:
                raise ValueError("Missing or invalid assertion issuer")
            # Require exact bearer fields; the toolkit accepts absent fields and URL prefixes.
            confirmations = self._query_assertion(
                "/saml:Subject/saml:SubjectConfirmation"
            )
            for confirmation in confirmations:
                data = confirmation.find("saml:SubjectConfirmationData", C.NSMAP)
                if (
                    confirmation.get("Method") == C.CM_BEARER
                    and data is not None
                    and data.get("Recipient") == expected_acs
                    and data.get("InResponseTo") == request_id
                    and data.get("NotOnOrAfter")
                ):
                    expiry = OneLogin_Saml2_Utils.parse_SAML_to_time(
                        data.get("NotOnOrAfter")
                    )
                    not_before = data.get("NotBefore")
                    now = OneLogin_Saml2_Utils.now()
                    if expiry > now and (
                        not not_before
                        or OneLogin_Saml2_Utils.parse_SAML_to_time(not_before) <= now
                    ):
                        self.valid_scd_not_on_or_after = expiry
                        return True
            raise ValueError("Missing correlated bearer confirmation")
        except Exception:
            self._error = "Invalid application SAML constraints"
            if raise_exceptions:
                raise
            return False


@dataclass(frozen=True)
class SamlIdentity:
    email: str
    response_id: str
    assertion_id: str
    assertion_expires_at: int
    session_expires_at: int | None


class SamlService:
    def __init__(self, settings: Settings):
        self.settings = settings
        try:
            if not all(
                (
                    settings.saml_idp_metadata_path,
                    settings.saml_sp_certificate_path,
                    settings.saml_sp_private_key_path,
                )
            ):
                raise ValueError("Missing SAML files")
            parsed = OneLogin_Saml2_IdPMetadataParser.parse(
                settings.saml_idp_metadata_path.read_text(), entity_id=ISSUER
            )
            idp = parsed["idp"]
            if (
                idp["entityId"] != ISSUER
                or not (
                    idp.get("x509cert") or idp.get("x509certMulti", {}).get("signing")
                )
                or urlsplit(idp["singleSignOnService"]["url"]).scheme != "https"
            ):
                raise ValueError("Invalid UNC trust configuration")
            self.config = {
                "strict": True,
                "debug": False,
                "sp": {
                    "entityId": ENTITY_ID,
                    "assertionConsumerService": {
                        "url": settings.public_origin + ACS_PATH,
                        "binding": C.BINDING_HTTP_POST,
                    },
                    "NameIDFormat": C.NAMEID_EMAIL_ADDRESS,
                    "x509cert": settings.saml_sp_certificate_path.read_text(),
                    "privateKey": settings.saml_sp_private_key_path.read_text(),
                },
                "idp": idp,
                "security": {
                    "authnRequestsSigned": True,
                    "signatureAlgorithm": C.RSA_SHA256,
                    "digestAlgorithm": C.SHA256,
                    "rejectDeprecatedAlgorithm": True,
                    "rejectUnsolicitedResponsesWithInResponseTo": True,
                    "requestedAuthnContext": False,
                    "wantAttributeStatement": settings.saml_email_source == "attribute",
                    "wantNameId": settings.saml_email_source == "nameid",
                    "signMetadata": True,
                },
            }
            OneLogin_Saml2_Settings(self.config)
        except Exception as exc:
            raise SamlConfigurationError from exc

    def auth(self, post_data: dict[str, str] | None = None) -> OneLogin_Saml2_Auth:
        origin = urlsplit(self.settings.public_origin)
        return OneLogin_Saml2_Auth(
            {
                "https": "on" if origin.scheme == "https" else "off",
                "http_host": origin.netloc,
                "script_name": ACS_PATH,
                "get_data": {},
                "post_data": post_data or {},
            },
            self.config,
        )

    def login(self, relay_state: str) -> tuple[str, str]:
        if not self.settings.saml_email_source:
            raise SamlConfigurationError("Email mapping must be configured")
        try:
            auth = self.auth()
            url = auth.login(return_to=relay_state)
            return url, auth.get_last_request_id()
        except Exception as exc:
            raise SamlConfigurationError from exc

    def metadata(self) -> str:
        settings = OneLogin_Saml2_Settings(self.config)
        metadata = settings.get_sp_metadata()
        if settings.validate_metadata(metadata):
            raise SamlConfigurationError("Invalid SP metadata")
        return metadata

    def validate(self, post_data: dict[str, str], request_id: str) -> SamlIdentity:
        try:
            auth = self.auth(post_data)
            auth.response_class = CorrelatedResponse
            auth.process_response(request_id=request_id)
            if auth.get_errors() or not auth.is_authenticated():
                raise ValueError("Invalid SAML response")
            # The toolkit compares InResponseTo only when the response contains it.
            if auth.get_last_response_in_response_to() != request_id:
                raise ValueError("Missing request correlation")
            if self.settings.saml_email_source == "nameid":
                if auth.get_nameid_format() != C.NAMEID_EMAIL_ADDRESS:
                    raise ValueError("Expected email NameID")
                emails = [auth.get_nameid()]
            elif self.settings.saml_email_source == "attribute":
                emails = auth.get_attribute(self.settings.saml_email_attribute) or []
            else:
                raise SamlConfigurationError("Email mapping must be configured")
            if len(emails) != 1 or not isinstance(emails[0], str):
                raise ValueError("Expected one email")
            email = validate_email(emails[0])
            response_id = auth.get_last_message_id()
            assertion_id = auth.get_last_assertion_id()
            expiry = auth.get_last_assertion_not_on_or_after()
            if not all((response_id, assertion_id, expiry)) or any(
                len(value) > 255 for value in (response_id, assertion_id)
            ):
                raise ValueError("Missing replay identifiers or assertion expiry")
            return SamlIdentity(
                email,
                response_id,
                assertion_id,
                int(expiry),
                auth.get_session_expiration(),
            )
        except SamlConfigurationError:
            raise
        except Exception as exc:
            raise SamlValidationError from exc
