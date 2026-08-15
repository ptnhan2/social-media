"""Test visual_critique with real API key."""
import os, sys
from pathlib import Path

# Load .env (same logic as agent.py — strip inline comments)
env_file = Path(__file__).parent.parent / ".env"
for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        os.environ.setdefault(k.strip(), v)

key = os.environ.get("OPENROUTER_API_KEY", "")
print(f"OPENROUTER_API_KEY set: {bool(key)} (len={len(key)})")
print(f"Key starts with: {key[:15]}...")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from visual_critique import visual_critique

video = "projects/isaacverse-final/renders/windows/isaacverse-final-draft-0.00-3.95.mp4"
result = visual_critique.invoke({"video_path": video, "aspect": "all"})
print(result)
