"""Weights updater — attribute user votes back to the principles that
motivated each cycle (closes the learning loop input -> output -> weights).

Scans preferences.jsonl for records with a `motivation` field; for every
`taste-standard#<cluster>` reference, counts keep/reject votes and rewrites
the `[verified N / rejected M]` tally on CANDIDATE lines in taste-standard.md.

Promotion rules (enforced by future cycles, documented in the file):
  - verified >= 2  -> eligible for APPROVED principle
  - rejected >= 2  -> DEMOTED (agent must stop proposing it)

Run after any vote session / cycle batch:
    harness/.venv/Scripts/python.exe harness/tally_principles.py
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).parent.parent
PREFS = ROOT / "harness" / "memories" / "preferences.jsonl"
STD = ROOT / "harness" / "memories" / "taste-standard.md"

CLUSTER_KEYS = ("accent-area", "text-hierarchy", "subtitle", "motion",
                "composition", "pacing", "other")

tally = defaultdict(lambda: {"keep": 0, "reject": 0})
examples = []
for line in PREFS.read_text(encoding="utf-8-sig").splitlines():
    line = line.strip()
    if not line:
        continue
    try:
        rec = json.loads(line)
    except json.JSONDecodeError:
        continue
    mot = str(rec.get("motivation") or "")
    m = re.search(r"taste-standard#([\w-]+)", mot)
    if not m:
        continue
    cluster = m.group(1)
    verdict = rec.get("user_verdict")
    if verdict == "b":
        tally[cluster]["keep"] += 1
    elif verdict == "a":
        tally[cluster]["reject"] += 1
    examples.append((cluster, verdict, rec.get("knob", "?")))


def cluster_of_header(header_line: str):
    low = header_line.lower()
    for k in CLUSTER_KEYS:
        if k.replace("-", " ") in low:
            return k
    return header_line.lower().replace(" ", "-")


result = []
current_cluster = None
for ln in STD.read_text(encoding="utf-8-sig").splitlines():
    if ln.startswith("### "):
        current_cluster = cluster_of_header(ln)
        result.append(ln)
        continue
    cm = re.match(r"^(\s*- CANDIDATE: )(.*)$", ln)
    if cm and current_cluster in tally:
        body = re.sub(r"\s*\[(?:verified|rejected)[^\]]*\]\s*", " ", cm.group(2)).strip()
        t = tally[current_cluster]
        result.append(f"{cm.group(1)}{body} [verified {t['keep']} / rejected {t['reject']}]")
    else:
        result.append(ln)

if tally:
    STD.write_text("\n".join(result) + "\n", encoding="utf-8")

print("Attributed votes:", dict(tally) or "none yet")
for cluster, verdict, knob in examples[-8:]:
    print(f"  {cluster}: {verdict} ({knob})")
print("taste-standard.md tallies updated." if tally else "No tally changes (nothing attributed yet).")
