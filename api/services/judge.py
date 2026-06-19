"""
Judge service — runs a sandboxed q subprocess per submission.

Flow:
  1. Validate user code
  2. Build a self-contained q script (inlining test_gen + reference from MongoDB)
  3. Pipe script to: docker run --rm -i <QLAB_DOCKER_IMAGE> -
     (or fall back to local q binary if QLAB_DOCKER_IMAGE is unset)
  4. Parse JSON result from stdout
  5. Return JudgeResult
"""

import asyncio
import json
import os
import re

from models import JudgeResult, SubmissionStatus

DOCKER_IMAGE = os.getenv("QLAB_DOCKER_IMAGE", "")
# Default/host license as a base64 key (q-solver style) — no file on disk.
HOST_LICENSE_B64 = os.getenv("QLAB_LICENSE_B64", "")
Q_BINARY = os.getenv("QLAB_Q_BINARY", "q")
JUDGE_TIMEOUT = int(os.getenv("QLAB_JUDGE_TIMEOUT", "10"))

# Friendly message shown when q fails because the kdb+ license is missing,
# expired, or rejected — instead of leaking the raw banner/error.
LICENSE_ERROR_MESSAGE = (
    "kdb+ license expired or invalid — re-upload your license under "
    "Profile → License."
)

# Signals in q's stderr that indicate a license problem rather than a bug in
# the user's code: kdb+ references the license file (kc.lic / k4.lic), prints
# 'lic for an unlicensed feature, or reports the host unlicensed/expired. Kept
# conservative so ordinary 'type / 'length user errors are not remapped.
_LICENSE_SIGNALS = [
    re.compile(r"k[c4]\.lic", re.IGNORECASE),
    re.compile(r"unlicensed", re.IGNORECASE),
    re.compile(r"'lic\b", re.IGNORECASE),
    re.compile(r"licen[cs]e .*expir", re.IGNORECASE),
    re.compile(r"expir.* licen[cs]e", re.IGNORECASE),
]


def friendly_license_error(stderr: str) -> str | None:
    """Map a license-related q stderr to a user-facing message, else None.

    Returns LICENSE_ERROR_MESSAGE when `stderr` looks like a kdb+ license
    failure; returns None for any other (e.g. genuine code) error so callers
    fall through to the raw message.
    """
    if not stderr:
        return None
    if any(p.search(stderr) for p in _LICENSE_SIGNALS):
        return LICENSE_ERROR_MESSAGE
    return None

# Shell run inside the container: decode the base64 license (passed as the
# KDBLIC env var) to kc.lic, then read the piped q script and run it. Using an
# env var instead of a mounted file keeps the license a base64 key end to end.
_DECODE_LIC = 'mkdir -p /root/.kx && printf %s "$KDBLIC" | base64 -d > /root/.kx/kc.lic && '


def _resolve_license_b64(license_b64: str | None) -> str | None:
    """Per-user license wins; else the default host base64 env (QLAB_LICENSE_B64)."""
    return license_b64 or HOST_LICENSE_B64 or None


def _docker_q_cmd(qfile: str) -> list[str]:
    """docker run that decodes the env license then runs q on the piped script."""
    return [
        "docker", "run", "--rm", "-i",
        "-e", "KDBLIC",  # value inherited from the subprocess env (kept out of argv)
        "--entrypoint", "/bin/sh",
        DOCKER_IMAGE,
        "-c", _DECODE_LIC + f"cat > {qfile} && exec /root/.kx/bin/q {qfile}",
    ]


def _subprocess_env(license_b64: str | None) -> dict | None:
    """Process env carrying the resolved base64 license as KDBLIC."""
    b64 = _resolve_license_b64(license_b64)
    env = os.environ.copy()
    env["KDBLIC"] = b64 or ""
    return env


def _validate_single_param(code: str) -> str | None:
    m = re.search(r"func:\{(\[([^\]]*)\])?", code)
    if m and m.group(2):
        params = [p.strip() for p in m.group(2).split(";") if p.strip()]
        if len(params) > 1:
            return (
                f"func must take exactly one parameter, got {len(params)}: "
                f"{', '.join(params)}. Wrap your args in a list: func:{{[x]...}}"
            )
    return None


def _strip_bare_slash(code: str) -> str:
    """Remove bare '/' lines — they start block comments and break inlining."""
    return "\n".join(
        line for line in code.splitlines() if line.strip() != "/"
    )


def _escape_q_string(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def _build_judge_script(
    user_code: str,
    test_gen_code: str,
    reference_solution: str,
    seed: int = 42,
    compare_unordered: bool = False,
) -> str:
    escaped_user_code = _escape_q_string(user_code)
    safe_test_gen = _strip_bare_slash(test_gen_code)
    safe_reference = _strip_bare_slash(reference_solution)

    lines = [
        "/ qlab judge runner",
        "",
        f"\\S {seed}",
        "",
        "/ test cases",
        safe_test_gen,
        "",
        "/ reference solution",
        safe_reference,
        'expected:@[value;"func each x";{-1 .j.j `status`error!("error";"ref solution failed: ",x);exit 1}];',
        "",
        "delete func from `.;",
        "",
        f'@[value;"{escaped_user_code}";{{-1 .j.j `status`error!("error_parse";"Submission failed to parse: ",x);exit 0}}];',
        "",
        'actual:@[value;"func each x";{-1 .j.j `status`error!("error_runtime";"Runtime error: ",x);exit 0}];',
        "",
        *(["expected:asc each expected;", "actual:asc each actual;"] if compare_unordered else []),
        "mismatches:where not expected~'actual;",
        "if[count mismatches;",
        "  idx:first mismatches;",
        '  -1 .j.j `status`error`failing_input`expected_output`actual_output!(',
        '    "wrong";"Output mismatch";',
        "    .Q.s1 x idx;",
        "    .Q.s1 expected idx;",
        "    .Q.s1 actual idx);",
        "  exit 0];",
        "",
        "t0:.z.p;",
        "do[1000;func each x];",
        "timing:`long$1e-6*`long$.z.p-t0;",
        "charcount:-2+count string func;",
        "",
        "-1 .j.j `status`timing_ms`char_count`expected_output`actual_output!(\"correct\";timing;charcount;.Q.s1 first expected;.Q.s1 first actual);",
        "exit 0",
    ]
    return "\n".join(lines) + "\n"


async def run_judge(
    user_code: str,
    test_gen_code: str,
    reference_solution: str,
    seed: int = 42,
    compare_unordered: bool = False,
    license_b64: str | None = None,
) -> JudgeResult:
    param_error = _validate_single_param(user_code)
    if param_error:
        return JudgeResult(status=SubmissionStatus.invalid, error=param_error)

    if not test_gen_code or not reference_solution:
        return JudgeResult(
            status=SubmissionStatus.error,
            error="Problem is missing test_gen_code or reference_solution in database. Re-seed.",
        )

    script = _build_judge_script(user_code, test_gen_code, reference_solution, seed, compare_unordered)
    return await _run_q_process(script, license_b64)


async def _run_q_process(script: str, license_b64: str | None = None) -> JudgeResult:
    if DOCKER_IMAGE:
        # Pipe script via stdin into a shell that writes it to a temp file and
        # runs q on it — q - is REPL mode and breaks multi-line expressions.
        # The base64 license rides in via the KDBLIC env var, decoded in-container.
        cmd = _docker_q_cmd("/tmp/j.q")
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
                proc.communicate(input=script.encode()), timeout=JUDGE_TIMEOUT
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            return JudgeResult(
                status=SubmissionStatus.timeout,
                error=f"Exceeded {JUDGE_TIMEOUT}s time limit",
            )

        output = stdout.decode().strip()
        if not output:
            err = stderr.decode().strip()
            lic_msg = friendly_license_error(err)
            if lic_msg:
                return JudgeResult(status=SubmissionStatus.error, error=lic_msg)
            return JudgeResult(
                status=SubmissionStatus.error,
                error=f"No output from judge. stderr: {err[:500]}",
            )

        last_line = output.splitlines()[-1]
        data = json.loads(last_line)

        return JudgeResult(
            status=SubmissionStatus(data["status"]),
            timing_ms=data.get("timing_ms"),
            char_count=data.get("char_count"),
            error=data.get("error"),
            failing_input=data.get("failing_input"),
            expected_output=data.get("expected_output"),
            actual_output=data.get("actual_output"),
        )

    except json.JSONDecodeError as e:
        return JudgeResult(
            status=SubmissionStatus.error,
            error=f"Judge output was not valid JSON: {e}",
        )
    except Exception as e:
        return JudgeResult(status=SubmissionStatus.error, error=str(e))
