"""
Stateless q code runner — backs the "Test" tab.

Unlike the judge it does not score anything: it loads the user's code in a
throwaway container, evaluates the final expression, and returns its formatted
value (or the q error). No persistent state, mirrors the judge's docker flow.
"""

import asyncio
import json
import os

from services.judge import (
    _strip_bare_slash,
    _escape_q_string,
    _docker_q_cmd,
    _subprocess_env,
)

DOCKER_IMAGE = os.getenv("QLAB_DOCKER_IMAGE", "")
Q_BINARY = os.getenv("QLAB_Q_BINARY", "q")
RUN_TIMEOUT = int(os.getenv("QLAB_JUDGE_TIMEOUT", "10"))


def _line_net_depth(line: str) -> int:
    """Net change in (){}[ ] nesting for one physical line.

    Skips characters inside double-quoted strings (with `\\` escapes) and a
    trailing `/` comment (q treats `/` as a comment only at line start or when
    preceded by whitespace), so braces/quotes in those positions don't count.
    """
    depth = 0
    in_str = False
    i = 0
    n = len(line)
    while i < n:
        c = line[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
        elif c == "/" and (i == 0 or line[i - 1] in " \t"):
            break  # inline comment runs to end of line
        elif c in "{[(":
            depth += 1
        elif c in "}])":
            depth -= 1
        i += 1
    return depth


def _split_top_level_statements(lines: list[str]) -> list[str]:
    """Group physical lines into top-level q statements.

    A statement ends at a newline only when nesting depth has returned to 0, so
    a multi-line `{}` block (even with its closing brace at column 0) stays one
    statement. Each returned statement can then be evaluated on its own via
    `value` — which handles internal newlines fine but does not run several
    top-level statements from a single joined string.
    """
    statements: list[str] = []
    current: list[str] = []
    depth = 0
    for line in lines:
        current.append(line)
        depth += _line_net_depth(line)
        if depth <= 0:
            depth = 0
            statements.append("\n".join(current))
            current = []
    if current:
        statements.append("\n".join(current))
    return statements


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

    statements = _split_top_level_statements(lines)
    body = statements[:-1]
    last = statements[-1]

    out = []
    # Evaluate each body statement (the user's definitions) via its own `value`
    # call. `value` handles newlines inside a single statement (so a multiline
    # func with its closing brace at column 0 still parses), but it will not run
    # several top-level statements from one joined string — hence one call each.
    for stmt in body:
        escaped = _escape_q_string(stmt)
        out.append(
            f'@[value;"{escaped}";{{-1 .j.j `ok`output`error!(0b;"";x);exit 0}}];'
        )
    escaped_last = _escape_q_string(last)
    out += [
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

    if DOCKER_IMAGE:
        # License rides in as a base64 KDBLIC env var, decoded in-container.
        cmd = _docker_q_cmd("/tmp/e.q")
        env = _subprocess_env(license_b64)
    else:
        cmd = [Q_BINARY, "-"]
        env = None

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            env=env,
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
