"""Structured logging + per-request correlation IDs.

Replaces the bare ``logging.basicConfig`` / stray ``print`` calls with a single
configurable handler. In production (``QLAB_LOG_FORMAT=json``, the default) every
record is emitted as one JSON line carrying the active request ID; for local dev
set ``QLAB_LOG_FORMAT=text`` for a human-readable line.

The request ID lives in a :class:`contextvars.ContextVar` so any logger anywhere
in the call stack picks it up without threading it through function signatures.
``RequestContextMiddleware`` sets it per request and echoes it back on the
``X-Request-ID`` response header.
"""

import json
import logging
import os
import sys
import time
import uuid
from contextvars import ContextVar

from starlette.types import ASGIApp, Receive, Scope, Send

# Empty string => "no request in scope" (startup logs, background tasks).
request_id_var: ContextVar[str] = ContextVar("request_id", default="")

REQUEST_ID_HEADER = "x-request-id"

# Uvicorn logs all non-access server events (startup, shutdown, reload) through a
# logger literally named "uvicorn.error" regardless of level — misleading in JSON
# output. Alias it back to "uvicorn" so INFO startup lines don't read as errors.
_LOGGER_ALIASES = {"uvicorn.error": "uvicorn"}

# Attributes present on every LogRecord — anything not in here is treated as a
# caller-supplied "extra" and folded into the JSON output.
_RESERVED = frozenset(
    logging.LogRecord("", 0, "", 0, "", (), None).__dict__
) | {"message", "asctime", "taskName"}


def get_request_id() -> str:
    """Return the current request's correlation ID (empty string if none)."""
    return request_id_var.get()


class JsonFormatter(logging.Formatter):
    """Render a LogRecord as a single JSON line."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": _LOGGER_ALIASES.get(record.name, record.name),
            "message": record.getMessage(),
        }
        rid = request_id_var.get()
        if rid:
            payload["request_id"] = rid
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        # Fold in any structured extras passed via logger.info(..., extra={...}).
        for key, val in record.__dict__.items():
            if key not in _RESERVED and not key.startswith("_"):
                payload[key] = val
        return json.dumps(payload, default=str)


class TextFormatter(logging.Formatter):
    """Human-readable formatter that still surfaces the request ID."""

    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        rid = request_id_var.get()
        return f"{base} [req={rid}]" if rid else base


def configure_logging() -> None:
    """Install a single root handler. Idempotent — safe to call more than once."""
    level = os.getenv("QLAB_LOG_LEVEL", "INFO").upper()
    fmt = os.getenv("QLAB_LOG_FORMAT", "json").lower()

    handler = logging.StreamHandler(sys.stdout)
    if fmt == "text":
        handler.setFormatter(
            TextFormatter("%(levelname)s %(name)s: %(message)s")
        )
    else:
        handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)
    # Align uvicorn's own loggers onto our handler so access/error logs are
    # structured too instead of using uvicorn's default formatters.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(name)
        lg.handlers.clear()
        lg.propagate = True


class RequestContextMiddleware:
    """Assign a request ID, time the request, and log start/finish.

    Pure-ASGI (not ``BaseHTTPMiddleware``) so the ``contextvars`` write lands in
    the same context the downstream handler and its loggers run in.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self.logger = logging.getLogger("qlab.request")

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        rid = headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        token = request_id_var.set(rid)

        method = scope.get("method", "")
        path = scope.get("path", "")
        start = time.perf_counter()
        status_holder = {"code": 500}

        async def send_wrapper(message) -> None:
            if message["type"] == "http.response.start":
                status_holder["code"] = message["status"]
                message.setdefault("headers", [])
                message["headers"].append(
                    (REQUEST_ID_HEADER.encode(), rid.encode())
                )
            await send(message)

        self.logger.info(
            "request.start", extra={"method": method, "path": path}
        )
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            self.logger.exception(
                "request.error",
                extra={"method": method, "path": path, "duration_ms": duration_ms},
            )
            raise
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            self.logger.info(
                "request.complete",
                extra={
                    "method": method,
                    "path": path,
                    "status": status_holder["code"],
                    "duration_ms": duration_ms,
                },
            )
            request_id_var.reset(token)
