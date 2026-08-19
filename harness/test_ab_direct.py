"""Direct A/B test — bypass agent, call tools directly.

1. render_window (damping=18) → visual_critique → baseline scores
2. update_style (damping 18→10)
3. render_window (damping=10) → visual_critique → after scores
4. Compare
"""
import sys, os, json, shutil
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

from harness_tools import render_window, visual_critique, update_style
import re

def extract_scores(text):
    scores = {}
    for name, pattern in [
        ("composition", r"composition[:\s\-]* (\d)"),
        ("color", r"color[:\s\-]* (\d)"),
        ("motion", r"motion[:\s\-]* (\d)"),
        ("text", r"text[:\s\-]* (\d)"),
        ("pacing", r"pacing[:\s\-]* (\d)"),
    ]:
        m = re.search(pattern, text.lower())
        if m:
            scores[name] = int(m.group(1))
    return scores

# Reset to baseline
print("Resetting style: damping=18, mode=solid")
style_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "libraries/04-visual/isaacverse-style.json")
with open(style_path, "r") as f:
    s = json.load(f)
s["treatments"]["semantic-diagram"]["entrance"]["damping"] = 18
s["treatments"]["semantic-diagram"]["entrance"]["durationSec"] = 0.75
s["treatments"]["semantic-diagram"]["edge"]["stroke"]["mode"] = "solid"
with open(style_path, "w") as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
shutil.copy2(style_path, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "remotion-composer", "shared", "isaacverse", "isaacverse-style.json"))

# === BASELINE ===
print("\n" + "=" * 60)
print("STEP 1: BASELINE (damping=18)")
print("=" * 60)
print("Rendering...")
path1 = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5, "end_sec": 7, "quality": "draft"})
print(f"  Render: {path1}")
print("Critiquing...")
critique1 = visual_critique.invoke({"video_path": path1, "aspect": "all"})
print(f"  Critique: {critique1[:300]}")
baseline = extract_scores(critique1)
print(f"  Scores: {baseline}")

# === CHANGE ===
print("\n" + "=" * 60)
print("STEP 2: CHANGE (damping 18→10)")
print("=" * 60)
result = update_style.invoke({"style_path": "treatments.semantic-diagram.entrance.damping", "new_value": "10"})
print(f"  {result[:200]}")

# === AFTER ===
print("\n" + "=" * 60)
print("STEP 3: AFTER (damping=10)")
print("=" * 60)
print("Rendering...")
path2 = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5, "end_sec": 7, "quality": "draft"})
print(f"  Render: {path2}")
print("Critiquing...")
critique2 = visual_critique.invoke({"video_path": path2, "aspect": "all"})
print(f"  Critique: {critique2[:300]}")
after = extract_scores(critique2)
print(f"  Scores: {after}")

# === COMPARISON ===
print("\n" + "=" * 60)
print("A/B COMPARISON")
print("=" * 60)
print(f"{'Aspect':<15} {'Baseline':>10} {'After':>10} {'Delta':>10}")
print("-" * 45)
for a in ["composition", "color", "motion", "text", "pacing"]:
    b = baseline.get(a, "?")
    n = after.get(a, "?")
    if isinstance(b, int) and isinstance(n, int):
        d = n - b
        print(f"{a:<15} {b:>10} {n:>10} {'+'if d>0 else ''}{d:>9}")
    else:
        print(f"{a:<15} {str(b):>10} {str(n):>10} {'?':>10}")

# Revert
print("\nReverting to baseline...")
update_style.invoke({"style_path": "treatments.semantic-diagram.entrance.damping", "new_value": "18"})
print("Done.")
