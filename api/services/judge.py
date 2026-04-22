"""
Judge service — spawns a sandboxed q subprocess per submission.

Flow:
  1. Load problem metadata (test_gen code + reference solution) from /problems/
  2. Write a self-contained q judge script to a temp file
  3. Run: q <tempfile> with timeout + memory limits
  4. Parse JSON result from stdout
  5. Return JudgeResult
"""

import asyncio
import json
import os
import re
import tempfile
from pathlib import Path

from models import JudgeResult, SubmissionStatus

PROBLEMS_DIR = Path(os.getenv("PROBLEMS_DIR", "/problems"))
JUDGE_SANDBOX = Path(os.getenv("JUDGE_SANDBOX", "/judge/sandbox.q"))
JUDGE_HARNESS = Path(os.getenv("JUDGE_HARNESS", "/judge/harness.q"))
Q_BINARY = os.getenv("QLAB_Q_BINARY", "q")
JUDGE_TIMEOUT = int(os.getenv("QLAB_JUDGE_TIMEOUT", "10"))


def _validate_single_param(code: str) -> str | None:
    """
    Returns an error string if func uses multiple params, else None.
    Catches: func:{[t;h]...} but allows func:{[x]...} and func:{...}
    """
    m = re.search(r"func:\{(\[([^\]]*)\])?", code)
    if m and m.group(2):
        params = [p.strip() for p in m.group(2).split(";") if p.strip()]
        if len(params) > 1:
            return (
                f"func must take exactly one parameter, got {len(params)}: "
                f"{', '.join(params)}. Wrap your args in a list: func:{{[x]...}}"
            )
    return None


def _build_judge_script(
    user_code: str,
    problem_id: str,
    seed: int = 42,
) -> str:
    """
    Generates a self-contained q script that:
      1. Sets fixed random seed
      2. Loads test_gen.q via \\l (avoids bare-/ block-comment trap from embedding)
      3. Loads reference.q via \\l, computes expected outputs
      4. Evaluates user code via value (traps parse errors)
      5. Runs user func, compares to expected (traps runtime errors)
      6. If correct, times with .z.p (avoids \\t system command escaping issues)
      7. Prints one JSON line to stdout and exits
    """
    escaped_user_code = _escape_q_string(user_code)

    # Absolute paths for \\l — script is run from a temp dir so relative paths break
    test_gen_path = (PROBLEMS_DIR / problem_id / "test_gen.q").resolve()
    ref_path = (PROBLEMS_DIR / problem_id / "reference.q").resolve()

    lines = [
        "/ qlab judge runner",
        "",
        "/ Fixed seed for reproducibility",
        f"\\S {seed}",
        "",
        "/ Load test cases via \\l — avoids bare-/ block-comment trap when embedding",
        f"\\l {test_gen_path}",
        "",
        "/ Load reference solution",
        f"\\l {ref_path}",
        'expected:@[value;"func each x";{-1 .j.j `status`error!("error";"ref solution failed: ",x);exit 1}];',
        "",
        "/ Clear reference func before evaluating user code",
        "delete func from `.;",
        "",
        "/ Evaluate user code string — traps parse errors",
        f'@[value;"{escaped_user_code}";{{-1 .j.j `status`error!("error_parse";"Submission failed to parse: ",x);exit 0}}];',
        "",
        "/ Run user func — value evaluates in global scope, x is the test cases",
        'actual:@[value;"func each x";{-1 .j.j `status`error!("error_runtime";"Runtime error: ",x);exit 0}];',
        "",
        "/ Compare outputs element-wise",
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
        "/ Correct! Time with .z.p — equivalent to \\t:1000, no system cmd needed",
        "t0:.z.p;",
        "do[1000;func each x];",
        "timing:`long$1e-6*`long$.z.p-t0;",
        "",
        "/ Code length per spec: -2+count string func",
        "charcount:-2+count string func;",
        "",
        "-1 .j.j `status`timing_ms`char_count!(\"correct\";timing;charcount);",
        "exit 0",
    ]
    return "\n".join(lines) + "\n"


def _escape_q_string(s: str) -> str:
    """Escape a string for embedding inside q double quotes."""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


async def run_judge(
    user_code: str,
    problem_id: str,
    seed: int = 42,
) -> JudgeResult:
    """
    Main entry point. Runs the judge and returns a JudgeResult.
    """
    # Validate param count before hitting q
    param_error = _validate_single_param(user_code)
    if param_error:
        return JudgeResult(status=SubmissionStatus.invalid, error=param_error)

    problem_dir = PROBLEMS_DIR / problem_id
    if not problem_dir.exists():
        return JudgeResult(
            status=SubmissionStatus.error,
            error=f"Problem '{problem_id}' not found",
        )

    script = _build_judge_script(user_code, problem_id, seed)

    # Write script to temp file and run
    with tempfile.NamedTemporaryFile(suffix=".q", mode="w", delete=False) as f:
        f.write(script)
        script_path = f.name

    try:
        result = await _run_q_process(script_path)
    finally:
        os.unlink(script_path)

    return result


async def _run_q_process(script_path: str) -> JudgeResult:
    """Spawn q, wait for result, parse JSON from stdout."""
    try:
        proc = await asyncio.create_subprocess_exec(
            Q_BINARY,
            script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=JUDGE_TIMEOUT
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
            return JudgeResult(
                status=SubmissionStatus.error,
                error=f"No output from judge. stderr: {err[:500]}",
            )

        # q outputs one JSON line (the last -1 .j.j call)
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
