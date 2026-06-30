"""Tests for structured logging + request-ID propagation (PENDING_TASKS §7.2)."""

import json
import logging

from fastapi import FastAPI
from starlette.testclient import TestClient

from services.logging_config import (
    REQUEST_ID_HEADER,
    JsonFormatter,
    RequestContextMiddleware,
    get_request_id,
    request_id_var,
)


def test_json_formatter_emits_valid_json_with_core_fields():
    rec = logging.LogRecord(
        name="qlab.test", level=logging.INFO, pathname=__file__, lineno=1,
        msg="hello %s", args=("world",), exc_info=None,
    )
    out = json.loads(JsonFormatter().format(rec))
    assert out["level"] == "INFO"
    assert out["logger"] == "qlab.test"
    assert out["message"] == "hello world"
    assert "ts" in out


def test_json_formatter_includes_request_id_when_set():
    token = request_id_var.set("abc123")
    try:
        rec = logging.LogRecord("l", logging.INFO, __file__, 1, "m", (), None)
        out = json.loads(JsonFormatter().format(rec))
        assert out["request_id"] == "abc123"
    finally:
        request_id_var.reset(token)


def test_json_formatter_omits_request_id_when_absent():
    rec = logging.LogRecord("l", logging.INFO, __file__, 1, "m", (), None)
    assert "request_id" not in json.loads(JsonFormatter().format(rec))


def test_json_formatter_folds_in_extras():
    rec = logging.LogRecord("l", logging.INFO, __file__, 1, "m", (), None)
    rec.duration_ms = 12.5
    rec.path = "/x"
    out = json.loads(JsonFormatter().format(rec))
    assert out["duration_ms"] == 12.5
    assert out["path"] == "/x"


def test_json_formatter_captures_exception():
    try:
        raise ValueError("boom")
    except ValueError:
        import sys
        rec = logging.LogRecord("l", logging.ERROR, __file__, 1, "m", (), sys.exc_info())
    out = json.loads(JsonFormatter().format(rec))
    assert "ValueError: boom" in out["exc"]


def _app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RequestContextMiddleware)

    @app.get("/ping")
    def ping():
        return {"rid": get_request_id()}

    return app


def test_middleware_generates_request_id_header():
    client = TestClient(_app())
    resp = client.get("/ping")
    assert resp.status_code == 200
    rid = resp.headers.get(REQUEST_ID_HEADER)
    assert rid
    # The handler saw the same ID that came back on the header.
    assert resp.json()["rid"] == rid


def test_middleware_honors_incoming_request_id():
    client = TestClient(_app())
    resp = client.get("/ping", headers={REQUEST_ID_HEADER: "client-supplied-id"})
    assert resp.headers[REQUEST_ID_HEADER] == "client-supplied-id"
    assert resp.json()["rid"] == "client-supplied-id"


def test_request_id_resets_between_requests():
    client = TestClient(_app())
    first = client.get("/ping").json()["rid"]
    second = client.get("/ping").json()["rid"]
    assert first != second
    # Outside any request, the contextvar is empty.
    assert get_request_id() == ""
