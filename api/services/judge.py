"""
Judge service — runs a sandboxed q subprocess per submission.

Flow:
  1. Validate user code
  2. Build a self-contained q script (inlining test_gen + reference from MongoDB)
  3. Pipe script to: docker run --rm -i <QLAB_DOCKER_IMAGE> -
     (or, only when QLAB_ALLOW_LOCAL_Q=1, fall back to the unsandboxed local q
      binary for dev; otherwise judging fails closed)
  4. Parse JSON result from stdout
  5. Return JudgeResult
"""

import asyncio
import json
import os
import re
import tempfile
import uuid

from models import JudgeResult, SubmissionStatus

DOCKER_IMAGE = os.getenv("QLAB_DOCKER_IMAGE", "")
# Fail-closed: untrusted submissions MUST run in the sandbox container. The bare
# local q binary has no network/memory/cpu isolation, so it is only allowed when
# a developer explicitly opts in (QLAB_ALLOW_LOCAL_Q=1) for a machine without
# docker. Prod leaves this unset, so a missing QLAB_DOCKER_IMAGE refuses to judge
# rather than silently running code on the host.
ALLOW_LOCAL_Q = os.getenv("QLAB_ALLOW_LOCAL_Q", "").strip().lower() in ("1", "true", "yes")
# Default/host license as a base64 key (q-solver style) — no file on disk.
HOST_LICENSE_B64 = os.getenv("QLAB_LICENSE_B64", "")
Q_BINARY = os.getenv("QLAB_Q_BINARY", "q")

# Returned when neither the sandbox image nor the dev opt-in is configured.
NO_SANDBOX_MESSAGE = (
    "Judge is misconfigured: QLAB_DOCKER_IMAGE is not set and the local q "
    "fallback is disabled. Untrusted code must run in the sandbox container."
)
JUDGE_TIMEOUT = int(os.getenv("QLAB_JUDGE_TIMEOUT", "10"))
# Container resource caps — untrusted user code must not exhaust the host.
DOCKER_MEMORY = os.getenv("QLAB_DOCKER_MEMORY", "256m")
DOCKER_CPUS = os.getenv("QLAB_DOCKER_CPUS", "1")

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


def _docker_q_cmd(qfile: str, name: str) -> list[str]:
    """docker run that decodes the env license then runs q on the piped script.

    Hardened for untrusted code: `--network none` (no egress), `--memory` and
    `--cpus` caps, and a unique `--name` so a timeout can `docker kill` the
    container on the daemon even after the local CLI process is killed.
    """
    return [
        "docker", "run", "--rm", "-i",
        "--name", name,
        "--network", "none",
        "--memory", DOCKER_MEMORY,
        "--cpus", DOCKER_CPUS,
        "-e", "KDBLIC",  # value inherited from the subprocess env (kept out of argv)
        "--entrypoint", "/bin/sh",
        DOCKER_IMAGE,
        "-c", _DECODE_LIC + f"cat > {qfile} && exec /root/.kx/bin/q {qfile}",
    ]


def _new_container_name(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


async def _docker_kill(name: str) -> None:
    """Best-effort kill of a leaked container by name (used on timeout)."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "kill", name,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.communicate()
    except Exception:
        pass


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

    asc_lines = ["  refOut:asc each refOut;", "  usrOut:asc each usrOut;"] if compare_unordered else []
    lines = [
        "/ qlab judge runner",
        "",
        f"\\S {seed}",
        "",
        "/ test cases (defines global x)",
        safe_test_gen,
        "",
        "/ reference solution (defines global func)",
        safe_reference,
        "",
        "/ Grade inside a lambda so refOut/usrOut are LOCALS. q evaluates value'd",
        "/ user code in the GLOBAL scope, so it can neither read these locals nor",
        "/ enumerate them via `key` — closing the read-the-expected-output bypass.",
        "/ The submission itself runs in the isolated .user namespace, and the",
        "/ reference `func` is deleted before it runs so it cannot be re-invoked.",
        "/ (Container isolation in _docker_q_cmd is the host-level trust boundary;",
        "/  a fully cheat-proof judge would grade the reference in a separate",
        "/  process from user code — tracked as follow-up.)",
        ".qlab.grade:{[uc]",
        '  refOut:@[value;"func each x";{-1 .j.j `status`error!("error";"ref solution failed: ",x);exit 1}];',
        "  delete func from `.;",
        '  system"d .user";',
        '  @[value;uc;{system"d .";-1 .j.j `status`error!("error_parse";"Submission failed to parse: ",x);exit 0}];',
        '  system"d .";',
        '  usrOut:@[value;".user.func each x";{-1 .j.j `status`error!("error_runtime";"Runtime error: ",x);exit 0}];',
        *asc_lines,
        "  mism:where not refOut~'usrOut;",
        "  if[count mism;",
        "    idx:first mism;",
        '    -1 .j.j `status`error`failing_input`expected_output`actual_output!(',
        '      "wrong";"Output mismatch";.Q.s1 x idx;.Q.s1 refOut idx;.Q.s1 usrOut idx);',
        "    exit 0];",
        "  t0:.z.p;",
        "  do[1000;.user.func each x];",
        "  tim:`long$1e-6*`long$.z.p-t0;",
        "  cc:-2+count string .user.func;",
        '  -1 .j.j `status`timing_ms`char_count`expected_output`actual_output!("correct";tim;cc;.Q.s1 first refOut;.Q.s1 first usrOut);',
        "  exit 0};",
        f'.qlab.grade["{escaped_user_code}"];',
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
    container_name = None
    tmp_path = None
    if DOCKER_IMAGE:
        # Pipe script via stdin into a shell that writes it to a temp file and
        # runs q on it — q - is REPL mode and breaks multi-line expressions.
        # The base64 license rides in via the KDBLIC env var, decoded in-container.
        container_name = _new_container_name("qlab-judge")
        cmd = _docker_q_cmd("/tmp/j.q", container_name)
        env = _subprocess_env(license_b64)
        stdin_bytes = script.encode()
    elif ALLOW_LOCAL_Q:
        # Dev-only fallback q: run from a temp file, not `q -`. Stdin REPL mode
        # cannot parse multi-line definitions (the judge wraps grading in one
        # multi-line lambda), so it must read a script file like the container.
        fd, tmp_path = tempfile.mkstemp(suffix=".q", prefix="qlab-judge-")
        os.write(fd, script.encode())
        os.close(fd)
        cmd = [Q_BINARY, tmp_path]
        env = None
        stdin_bytes = b""
    else:
        return JudgeResult(status=SubmissionStatus.error, error=NO_SANDBOX_MESSAGE)

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
                proc.communicate(input=stdin_bytes), timeout=JUDGE_TIMEOUT
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            # proc.kill() only reaps the local docker CLI; the container keeps
            # running on the daemon. Kill it by name to stop the leak.
            if container_name:
                await _docker_kill(container_name)
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
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
