"""Debug: call render_window directly + show full error."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load .env
from pathlib import Path
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            v = v.strip()
            if "#" in v and not (v.startswith('"') or v.startswith("'")):
                v = v.split("#")[0].strip()
            if v:
                os.environ.setdefault(k.strip(), v)

from harness_tools import render_window

print("Testing render_window directly...")
print(f"PROJECT_ROOT: {os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}")
print(f"RENDERER_DIR: {os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'remotion-composer')}")

# Check if node is available
import subprocess
r = subprocess.run(["node", "--version"], capture_output=True, text=True)
print(f"Node version: {r.stdout.strip()}")

# Check if render script exists
script = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "remotion-composer", "scripts", "render-window.mjs")
print(f"Render script exists: {os.path.exists(script)}")

# Run render
print("\nCalling render_window...")
result = render_window.invoke({
    "project_slug": "isaacverse-final",
    "start_sec": 3.5,
    "end_sec": 7,
    "quality": "draft",
})
print(f"Result: {result[:500]}")
