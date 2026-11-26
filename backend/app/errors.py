"""
Error handling: every error the API returns has the SAME simple shape:

    { "error": "A message a human can read", "field": "amount" }

`field` says which input was wrong, or is null when the error is not about
one specific field (for example 401 "Not authenticated").

Why? By default FastAPI answers bad input with status 422 and a long, nested
list. One predictable format makes the frontend much simpler: it can always
show `response.error`, and highlight the input named in `response.field`.

Status codes we use:
    400  the input is wrong (validation failed)
    401  not logged in / bad token / wrong password
    404  the thing does not exist (or belongs to another user)
    409  conflict, e.g. the email is already registered
    500  a bug or a problem on the server
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("cashflow")


def error_response(status_code: int, message: str, field: str | None = None, headers=None):
    """Build a JSON response in our standard error format."""
    return JSONResponse(
        status_code=status_code,
        content={"error": message, "field": field},
        headers=headers,
    )


def _friendly_message(err: dict) -> str:
    """Turn one Pydantic error into a short, readable sentence."""
    msg = err["msg"]
    # Pydantic writes "Value error, Category cannot be empty"; drop the prefix
    if msg.startswith("Value error, "):
        msg = msg[len("Value error, "):]
    if err["type"] == "missing":
        msg = "This field is required"
    # The email checker explains in a lot of technical detail what's wrong
    # ("The part after the @-sign is a special-use or reserved name...").
    # The user only needs to know the address isn't valid.
    elif err["loc"] and err["loc"][-1] == "email":
        msg = "Enter a valid email address"
    return msg


async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Called when the request body/query does not match the Pydantic schema."""
    first = exc.errors()[0]  # we report the first problem, which keeps it simple

    # loc looks like ("body", "amount") or ("query", "month"); the last part
    # is the field name. If the whole body is missing/invalid JSON, it's ("body",)
    loc = [part for part in first["loc"] if part not in ("body", "query", "path")]
    field = str(loc[-1]) if loc else None

    message = _friendly_message(first)
    if field:
        message = f"{field}: {message}"
    return error_response(status.HTTP_400_BAD_REQUEST, message, field)


async def http_error_handler(request: Request, exc: StarletteHTTPException):
    """Called for every HTTPException we raise ourselves (401, 404, 409, ...)."""
    return error_response(exc.status_code, str(exc.detail), headers=exc.headers)


async def unexpected_error_handler(request: Request, exc: Exception):
    """Last safety net: any crash becomes a clean 500 instead of a stack trace."""
    logger.exception("Unexpected error on %s %s", request.method, request.url.path)
    return error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR, "Something went wrong on the server."
    )


def register_error_handlers(app: FastAPI) -> None:
    """Tell FastAPI to use the handlers above. Called once from main.py."""
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
