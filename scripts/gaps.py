#!/usr/bin/env python3
"""
qlab-gaps — audit all markdown docs for stated-but-unfinished work.

Greps every tracked *.md for gap markers (TODO, FIXME, "not yet",
"planned", "future", "pending", "unchecked", unticked checkboxes) and
prints a table of file:line | marker | text. Entry point for "what's
left?" / "gaps vs future plans?" questions.

Usage:
  uv run scripts/gaps.py
  uv run scripts/gaps.py --path docs
"""
import argparse
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MARKERS = re.compile(
    r"(TODO|FIXME|XXX|HACK"
    r"|not\s+yet|planned|future\s+work|pending|unimplemented"
    r"|\bWIP\b|coming\s+soon|^\s*[-*]\s+\[ \])",
    re.IGNORECASE,
)


def md_files(scope: Path) -> list[Path]:
    try:
        out = subprocess.run(
            ["git", "ls-files", "*.md"], cwd=ROOT, capture_output=True, text=True, check=True
        ).stdout
        files = [ROOT / p for p in out.splitlines()]
    except subprocess.CalledProcessError:
        files = list(ROOT.rglob("*.md"))
    skip = ("graphify-out", "node_modules", ".agents")
    files = [f for f in files if not any(part in skip for part in f.relative_to(ROOT).parts)]
    return [f for f in files if scope in f.parents or f == scope or scope == ROOT]


def main() -> int:
    ap = argparse.ArgumentParser(description="Audit markdown docs for unfinished work.")
    ap.add_argument("--path", default=".", help="restrict to a subdirectory")
    args = ap.parse_args()
    scope = (ROOT / args.path).resolve()

    rows: list[tuple[str, str, str]] = []
    for f in md_files(scope):
        try:
            lines = f.read_text(errors="ignore").splitlines()
        except OSError:
            continue
        for i, line in enumerate(lines, 1):
            m = MARKERS.search(line)
            if m:
                rel = f.relative_to(ROOT)
                marker = "[ ]" if "[ ]" in line else m.group(0).strip().upper()
                text = line.strip()[:90]
                rows.append((f"{rel}:{i}", marker, text))

    if not rows:
        print("No gap markers found.")
        return 0

    wloc = max(len(r[0]) for r in rows)
    wmk = max(len(r[1]) for r in rows)
    print(f"{'LOCATION':<{wloc}}  {'MARKER':<{wmk}}  TEXT")
    for loc, mk, text in rows:
        print(f"{loc:<{wloc}}  {mk:<{wmk}}  {text}")
    print(f"\n{len(rows)} gap marker(s) across markdown docs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
