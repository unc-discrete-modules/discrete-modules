from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from src.email import validate_email


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str | None = None
    allowed_origins: list[str] = Field(default_factory=list)
    admin_emails: list[str] = Field(default_factory=list)
    content_dir: Path = Path(__file__).resolve().parents[2] / "content"
    environment: Literal["development", "production"] = "production"
    public_origin: str = "https://discrete-modules.apps.cloudapps.unc.edu"
    auth_cookie_secure: bool = True
    saml_idp_metadata_path: Path | None = None
    saml_sp_certificate_path: Path | None = None
    saml_sp_private_key_path: Path | None = None
    saml_email_source: Literal["nameid", "attribute"] | None = None
    saml_email_attribute: str | None = None

    @model_validator(mode="after")
    def validate_auth_configuration(self) -> "Settings":
        origin = urlsplit(self.public_origin)
        if (
            origin.scheme not in ("http", "https")
            or not origin.netloc
            or origin.username
            or origin.password
            or origin.path
            or origin.query
            or origin.fragment
        ):
            raise ValueError("PUBLIC_ORIGIN must be an origin without a trailing slash")
        if self.environment == "production" and (
            origin.scheme != "https" or not self.auth_cookie_secure
        ):
            raise ValueError(
                "Production authentication requires HTTPS and secure cookies"
            )
        if self.saml_email_source == "attribute" and not self.saml_email_attribute:
            raise ValueError("SAML_EMAIL_ATTRIBUTE is required for attribute mapping")
        return self

    @field_validator("allowed_origins")
    @classmethod
    def reject_wildcard_origin(cls, value: list[str]) -> list[str]:
        if "*" in value:
            raise ValueError("ALLOWED_ORIGINS must list explicit origins, not '*'")
        return value

    @field_validator("admin_emails")
    @classmethod
    def validate_admin_emails(cls, value: list[str]) -> list[str]:
        return [validate_email(email) for email in value]

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, value: str | None) -> str | None:
        if value and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value
