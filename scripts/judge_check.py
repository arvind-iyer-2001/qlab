#!/usr/bin/env python3
"""
qlab-judge-check — verify the judge end-to-end with a known-good and a
known-bad solution for a given problem.

Submits the canonical reference.q (expects ACCEPTED) and a deliberately
wrong function (expects WRONG_ANSWER / not accepted). Optionally waits for
a uvicorn --reload restart to settle before testing.

Usage:
  uv run scripts/judge_check.py 1
  uv run scripts/judge_check.py 7 --wait-reload
  QLAB_JWT=eyJ... uv run scripts/judge_check.py 1

Env:
  QLAB_API_URL   base url (default http://localhost:8000)
  QLAB_JWT       bearer token; falls back to ./.qlab-jwt then QLAB_JWT= in .env
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = os.getenv("QLAB_API_URL", "http://localhost:8000")


def resolve_token() -> str:
    if os.getenv("QLAB_JWT"):
        return os.environ["QLAB_JWT"].strip()
    f = ROOT / ".qlab-jwt"
    if f.exists():
        return f.read_text().strip()
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("QLAB_JWT="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ERROR: no JWT. Set $QLAB_JWT, create .qlab-jwt, or add QLAB_JWT= to .env")


def find_problem(pid: int) -> Path:
    for d in sorted((ROOT / "problems").iterdir()):
        meta = d / "problem.json"
        if meta.exists() and json.loads(meta.read_text()).get("id") == pid:
            return d
    sys.exit(f"ERROR: no problems/*/problem.json with id={pid}")


def post(path: str, body: dict, token: str) -> tuple[int, dict]:
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def wait_reload() -> None:
    print("Waiting for /health to settle…", end="", flush=True)
    for _ in range(40):
        try:
            with urllib.request.urlopen(API + "/health", timeout=2) as r:
                if r.status == 200:
                    print(" ok")
                    return
        except Exception:
            pass
        print(".", end="", flush=True)
        time.sleep(0.5)
    print(" timeout (continuing anyway)")


def main() -> int:
    ap = argparse.ArgumentParser(description="Judge smoke-test: reference + wrong solution.")
    ap.add_argument("problem_id", type=int)
    ap.add_argument("--wait-reload", action="store_true", help="poll /health before testing")
    args = ap.parse_args()

    token = resolve_token()
    pdir = find_problem(args.problem_id)
    reference = (pdir / "reference.q").read_text().strip()

    if args.wait_reload:
        wait_reload()

    print(f"Problem {args.problem_id} ({pdir.name})\n")

    # 1) reference solution → expect ACCEPTED
    code_ok, body_ok = post("/submissions", {"problem_id": args.problem_id, "code": reference}, token)
    status_ok = body_ok.get("status", "")
    ref_pass = status_ok == "ACCEPTED"
    print(f"[reference]  HTTP {code_ok}  status={status_ok!r}  "
          f"timing_ms={body_ok.get('timing_ms')}  chars={body_ok.get('char_count')}")
    print(f"             {'PASS' if ref_pass else 'FAIL — expected ACCEPTED'}")

    # 2) deliberately wrong solution → expect NOT accepted
    wrong = 'func:{[x] `wrong}'
    code_bad, body_bad = post("/submissions", {"problem_id": args.problem_id, "code": wrong}, token)
    status_bad = body_bad.get("status", "")
    bad_pass = status_bad and status_bad != "ACCEPTED"
    print(f"[wrong]      HTTP {code_bad}  status={status_bad!r}")
    print(f"             {'PASS' if bad_pass else 'FAIL — wrong solution was accepted!'}")

    ok = ref_pass and bad_pass
    print("\n" + ("✅ judge healthy" if ok else "❌ judge check failed"))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
