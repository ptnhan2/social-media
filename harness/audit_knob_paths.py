"""Knob-wiring audit: cross-check every getStyle() path in the shared
treatments/EditVideo code against the actual style-store keys.

Reports: paths read by code but missing from the store (mismatch = dead knob),
and store keys never read by code (orphan = dead knob from the other side)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
STORE = json.loads((ROOT / "libraries" / "04-visual" / "isaacverse-style.json").read_text(encoding="utf-8-sig"))


def flatten(d, p=""):
    out = {}
    for k, v in d.items():
        kk = f"{p}.{k}" if p else k
        if isinstance(v, dict):
            out.update(flatten(v, kk))
        else:
            out[kk] = v
    return out


store_paths = set(flatten(STORE)) - {"version", "seed", "status"}

code_paths = {}
for f in (ROOT / "remotion-composer" / "shared" / "isaacverse").glob("*.tsx"):
    text = f.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r'getStyle(?:<[^>]+>)?\(\s*"([^"]+)"\s*,\s*([^)]+?)\)', text):
        path, fallback = m.group(1), m.group(2).strip()
        code_paths.setdefault(path, []).append((f.name, fallback))

print("=== CODE READS BUT STORE MISSING (dead knobs — path mismatch) ===")
for p in sorted(code_paths):
    if p not in store_paths:
        for fname, fb in code_paths[p]:
            print(f"  {p}  [{fname}] default={fb}")

print("\n=== STORE HAS BUT CODE NEVER READS (orphan knobs) ===")
read_paths = set(code_paths)
for p in sorted(store_paths - read_paths):
    print(f"  {p}  (store value: {json.dumps(flatten(STORE)[p])})")
