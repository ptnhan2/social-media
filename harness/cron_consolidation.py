#!/usr/bin/env python
"""Cron job: run consolidation agent periodically.

Schedule (crontab -e):
  0 */6 * * *  cd /app && harness/.venv/bin/python harness/cron_consolidation.py

Or with Docker:
  docker exec harness-langgraph-1 python harness/cron_consolidation.py
"""
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from consolidation_agent import analyze_feedback, propose_refinements

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_DIR = os.path.join(PROJECT_ROOT, "harness", "logs")


def main():
    print(f"[{datetime.now(timezone.utc).isoformat()}] Consolidation cron started")

    patterns = analyze_feedback()
    if not patterns:
        print("No feedback patterns to consolidate.")
        return

    proposals = propose_refinements(patterns)

    # Write proposals to a file for the main agent to pick up
    output = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "patterns": patterns,
        "proposals": proposals,
    }
    output_file = os.path.join(LOG_DIR, "consolidation_proposals.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(proposals)} proposal(s) to {output_file}")
    for p in proposals:
        print(f"  - {p['style_path']} = {p['proposed_value']}: {p['reason'][:80]}")


if __name__ == "__main__":
    main()
