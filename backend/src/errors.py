from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from src.schemas.errors import ErrorBody, ErrorDetail, ErrorResponse

ERROR_CODES = {404: "not_found", 422: "validation_error"}

NOT_FOUND = {404: {"model": ErrorResponse, "description": "Resource not found"}}
INVALID = {422: {"model": ErrorResponse, "description": "Invalid request"}}


def _response(status_code: int, body: ErrorBody) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(error=body).model_dump(mode="json"),
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        code = ERROR_CODES.get(exc.status_code, "http_error")
        return _response(exc.status_code, ErrorBody(code=code, message=str(exc.detail)))

    @app.exception_handler(RequestValidationError)
    async def validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details = [
            ErrorDetail(loc=list(e["loc"]), msg=e["msg"], type=e["type"])
            for e in exc.errors()
        ]
        return _response(
            422,
            ErrorBody(
                code=ERROR_CODES[422],
                message="Request validation failed",
                details=details,
            ),
        )
