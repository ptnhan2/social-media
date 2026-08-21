"""Gap-fill failed tutorial moments (VLM errors) — one pass.
Re-describes every moment whose description is a VLM error, rebuilds that
video's candidate list, and re-merges the store. Safe to re-run."""
import json
import sys
import os
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

for line in (Path(__file__).parent.parent / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            os.environ.setdefault(k.strip(), v)

from ingest_tutorial import describe_moment, merge_into_store, OUT_FILE

store = json.loads(OUT_FILE.read_text(encoding="utf-8-sig"))
changed = False
for video in store.get("videos", []):
    failed = [m for m in video.get("moments", []) if "VLM API error" in str(m.get("description", ""))]
    if not failed:
        continue
    print(f"{Path(video['video']).name}: {len(failed)} failed moments to retry", flush=True)
    vpath = Path(video["video"])
    if not vpath.is_absolute():
        vpath = Path(__file__).parent.parent / video["video"]
    for m in failed:
        desc = describe_moment(vpath, m["t_sec"])
        if "VLM API error" in desc:
            print(f"  t={m['t_sec']}s: still failing", flush=True)
            continue
        print(f"  t={m['t_sec']}s: RECOVERED ({len(desc)} chars)", flush=True)
        m["description"] = desc
        changed = True
    # rebuild candidates from all moments
    candidates = []
    for m in video.get("moments", []):
        for line in str(m.get("description", "")).splitlines():
            line = line.strip()
            if line.upper().startswith("PRINCIPLE:"):
                candidates.append({
                    "principle": line[len("PRINCIPLE:"):].strip(),
                    "provenance": f"tutorial:{Path(video['video']).name}@{m['t_sec']}s",
                    "status": "candidate",
                })
    video["candidates"] = candidates
if changed:
    merge_into_store.__wrapped__ if hasattr(merge_into_store, "__wrapped__") else None
    # merge_into_store appends by video name — rebuild the store manually instead
    store["all_candidates"] = [c for v in store["videos"] for c in v["candidates"]]
    OUT_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
    print("store updated")
else:
    print("nothing recovered this pass")
