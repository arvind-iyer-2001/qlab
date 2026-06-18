"""
Stateless q code runner — backs the "Test" tab.

Unlike the judge it does not score anything: it loads the user's code in a
throwaway container, evaluates the final expression, and returns its formatted
value (or the q error). No persistent state, mirrors the judge's docker flow.
"""

import asyncio
import base64
import json
import os
import tempfile

from services.judge import _strip_bare_slash, _escape_q_string

DOCKER_IMAGE = os.getenv("QLAB_DOCKER_IMAGE", "")
DOCKER_LICENSE = os.getenv("QLAB_KC_LIC", os.path.expanduser("~/.kx/kc.lic"))
Q_BINARY = os.getenv("QLAB_Q_BINARY", "q")
RUN_TIMEOUT = int(os.getenv("QLAB_JUDGE_TIMEOUT", "10"))


def _build_run_script(code: str) -> str | None:
    """Split code into body + final expression; emit a JSON-printing script.

    Returns None if there is no runnable code (caller maps that to an error).
    """
    stripped = _strip_bare_slash(code)
    lines = [
        ln for ln in stripped.splitlines()
        if ln.strip() and not ln.strip().startswith("/")
    ]
    if not lines:
        return None

    body = lines[:-1]
    last = lines[-1]
    escaped_last = _escape_q_string(last)

    out = [
        *body,
        # Evaluate + format the final expression, catching q errors.
        f'r:@[{{.Q.s1 value x}};"{escaped_last}";{{-1 .j.j `ok`output`error!(0b;"";x);exit 0}}];',
        '-1 .j.j `ok`output`error!(1b;r;"");',
        "exit 0",
    ]
    return "\n".join(out) + "\n"


async def run_code(code: str, license_b64: str | None = None) -> dict:
    script = _build_run_script(code)
    if script is None:
        return {"ok": False, "output": "", "error": "No code to run"}

    lic_path = DOCKER_LICENSE
    tmp_lic = None
    if license_b64:
        try:
            tmp_lic = tempfile.NamedTemporaryFile(suffix=".lic", delete=False)
            tmp_lic.write(base64.b64decode(license_b64))
            tmp_lic.flush()
            tmp_lic.close()
            lic_path = tmp_lic.name
        except Exception as e:
            if tmp_lic:
                os.unlink(tmp_lic.name)
            return {"ok": False, "output": "", "error": f"Failed to materialize license: {e}"}

    if DOCKER_IMAGE:
        cmd = [
            "docker", "run", "--rm", "-i",
            "--entrypoint", "/bin/sh",
            "-v", f"{lic_path}:/root/.kx/kc.lic:ro",
            DOCKER_IMAGE,
            "-c", "cat > /tmp/e.q && exec /root/.kx/bin/q /tmp/e.q",
        ]
    else:
        cmd = [Q_BINARY, "-"]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=script.encode()), timeout=RUN_TIMEOUT
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            return {"ok": False, "output": "", "error": f"Exceeded {RUN_TIMEOUT}s time limit"}

        out = stdout.decode().strip()
        if not out:
            err = stderr.decode().strip()
            # body (e.g. a bad func definition) failed before producing JSON
            return {"ok": False, "output": "", "error": err[:1000] or "No output"}

        try:
            data = json.loads(out.splitlines()[-1])
        except json.JSONDecodeError:
            return {"ok": False, "output": "", "error": out[:1000]}
        return {
            "ok": bool(data.get("ok")),
            "output": data.get("output", ""),
            "error": data.get("error", ""),
        }
    except Exception as e:
        return {"ok": False, "output": "", "error": str(e)}
    finally:
        if tmp_lic:
            try:
                os.unlink(tmp_lic.name)
            except OSError:
                pass
