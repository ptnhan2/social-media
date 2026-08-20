"""Protocol v4 cycle driver — runs the agent with scripted gate answers.

Avoids cmd.exe escaping entirely (the .cmd approach broke on Vietnamese text
and parentheses). Answers are fed via subprocess stdin.

Usage:
    harness/.venv/Scripts/python.exe harness/run_cycle.py --task "<prompt>" \
        [--answer "keep; note text"] [--answer yes] ...
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--task", required=True, help="Task prompt for the agent")
    ap.add_argument("--answer", action="append", default=[],
                    help="Scripted answer for each gate, in order (keep/reject + note, or yes/no)")
    ap.add_argument("--model", default=None, help="Override HARNESS_MODEL for this run")
    args = ap.parse_args()

    env_extra = {}
    if args.model:
        env_extra["HARNESS_MODEL"] = args.model

    import os
    env = {**os.environ, **env_extra, "PYTHONIOENCODING": "utf-8"}

    stdin_text = "\n".join(args.answer) + "\n" if args.answer else ""
    cmd = [str(ROOT / "harness" / ".venv" / "Scripts" / "python.exe"),
           "-u", str(Path(__file__).parent / "agent.py"), args.task]
    proc = subprocess.run(cmd, input=stdin_text, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", cwd=str(ROOT), env=env, timeout=1800)
    out = proc.stdout or ""
    # always write the full log to a file (console codepages choke on unicode)
    log_path = ROOT / "harness" / "last_cycle.log"
    log_path.write_text(out + "\n--- STDERR ---\n" + (proc.stderr or ""), encoding="utf-8")
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        print(out)
    except Exception:
        print(f"(console could not render unicode — full log at {log_path})")
    if proc.returncode != 0:
        print("STDERR:", (proc.stderr or "")[-800:], file=sys.stderr)
        sys.exit(proc.returncode)


if __name__ == "__main__":
    main()
