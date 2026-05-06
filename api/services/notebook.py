"""
Notebook execution service.

Connects to a dedicated q process on QLAB_NB_PORT (default 5001) that
is started by start.sh.  Each cell execution opens a fresh IPC connection,
evaluates the code with `value` (so global variables persist in the q
process across calls), and formats the result with .Q.s1.

Reset kills the process on the port and spawns a fresh one so the user
gets a clean environment without restarting the whole stack.
"""

import asyncio
import os
from contextlib import asynccontextmanager

import pykx as kx

NB_HOST = os.getenv("QLAB_NB_HOST", "localhost")
NB_PORT = int(os.getenv("QLAB_NB_PORT", "5001"))
Q_BINARY = os.getenv("QLAB_Q_BINARY", "q")
EXECUTE_TIMEOUT = int(os.getenv("QLAB_EXECUTE_TIMEOUT", "10"))


@asynccontextmanager
async def _conn():
    async with kx.AsyncQConnection(host=NB_HOST, port=NB_PORT) as q:
        yield q


def _escape(code: str) -> str:
    """Escape a code string for embedding inside a q double-quoted string."""
    return (
        code
        .replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "")
        .replace("\t", "\\t")
    )


async def execute_cell(cell_code: str) -> dict:
    """
    Evaluate cell_code on the notebook q process and return the result
    as a formatted string.

    - Uses `value "<escaped>"` so globals are set in the notebook process.
    - Wraps with .Q.s1 for q-style display.
    - Returns {"output": str, "error": str|None, "ok": bool}
    """
    code = cell_code.strip()
    if not code:
        return {"output": "", "error": None, "ok": True}

    # Within a q value() string, newlines are NOT statement separators.
    # Replace them with semicolons so multiple statements execute correctly.
    code = code.replace("\n", ";")
    escaped = _escape(code)
    q_expr = f'.Q.s1 value "{escaped}"'

    try:
        async with _conn() as q:
            result = await asyncio.wait_for(q(q_expr), timeout=EXECUTE_TIMEOUT)

        # pykx returns a CharVector for the .Q.s1 result
        output = result.py() if hasattr(result, "py") else str(result)
        if isinstance(output, bytes):
            output = output.decode("utf-8")
        output = output.rstrip("\n")
        # Suppress bare "::" — returned by void expressions
        if output == "::":
            output = ""
        return {"output": output, "error": None, "ok": True}

    except asyncio.TimeoutError:
        return {
            "output": "",
            "error": f"Timed out after {EXECUTE_TIMEOUT}s",
            "ok": False,
        }
    except ConnectionRefusedError:
        return {
            "output": "",
            "error": "Notebook process is offline — click Reset to restart it.",
            "ok": False,
        }
    except Exception as e:
        msg = str(e)
        # pykx surfaces q runtime/parse errors as generic exceptions whose
        # message starts with the q error string
        return {"output": "", "error": msg, "ok": False}


async def reset_notebook() -> dict:
    """
    Kill whatever is running on NB_PORT and spawn a fresh q process there.
    Uses shell so the new q process is detached from FastAPI's process group.
    """
    try:
        cmd = (
            f"fuser -k {NB_PORT}/tcp 2>/dev/null || true; "
            f"sleep 0.4; "
            f"nohup {Q_BINARY} -p {NB_PORT} -q </dev/null >/dev/null 2>&1 &"
        )
        proc = await asyncio.create_subprocess_shell(
            cmd, stderr=asyncio.subprocess.DEVNULL
        )
        await asyncio.wait_for(proc.wait(), timeout=5)
        # Give q a moment to start accepting connections
        await asyncio.sleep(1.5)
        return {"ok": True, "message": "Notebook reset — fresh q environment ready."}
    except Exception as e:
        return {"ok": False, "message": str(e)}
