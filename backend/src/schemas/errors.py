from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    loc: list[str | int] = Field(description="Location of the invalid input.")
    msg: str
    type: str


class ErrorBody(BaseModel):
    code: str = Field(description="Machine-readable code, e.g. not_found.")
    message: str = Field(description="Human-readable explanation.")
    details: list[ErrorDetail] | None = Field(
        default=None,
        description="Per-field problems; set for schema validation failures.",
    )


class ErrorResponse(BaseModel):
    """Body of every 4xx response."""

    error: ErrorBody
