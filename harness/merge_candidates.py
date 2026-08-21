"""Merge the git-committed video-04 candidates with the current video-02 file
into a multi-video structure, then normalize ingest output format."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.parent
OUT = ROOT / "harness" / "memories" / "tutorial-candidates.json"

old = json.loads(subprocess.run(
    ["git", "show", "0495f33:harness/memories/tutorial-candidates.json"],
    capture_output=True, text=True, encoding="utf-8", cwd=str(ROOT)).stdout)
new = json.loads(OUT.read_text(encoding="utf-8-sig"))

merged = {
    "videos": [old, new],
    "all_candidates": old["candidates"] + new["candidates"],
    "note": ("Candidates are HYPOTHESES only — each must pass a standard "
             "protocol v4 verification cycle before entering taste-standard.md. "
             "Isaac-derived principles are one school, not gospel (divergence "
             "is a goal). Human review required."),
}
OUT.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"merged: {len(old['candidates'])} (video 04) + {len(new['candidates'])} (video 02) "
      f"= {len(merged['all_candidates'])} candidates")
