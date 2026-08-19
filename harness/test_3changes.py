"""Test 3 changes: damping dramatic (18→2), stroke mode (solid→gradient), revealDuration (0.65→3.0).

Each change: render → critique → compare to baseline.
"""
import sys, os, json, shutil, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
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

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE = os.path.join(ROOT, "libraries", "04-visual", "isaacverse-style.json")
SHARED = os.path.join(ROOT, "remotion-composer", "shared", "isaacverse", "isaacverse-style.json")

def reset_style():
    with open(STYLE, "r") as f:
        s = json.load(f)
    s["treatments"]["semantic-diagram"]["entrance"]["damping"] = 18
    s["treatments"]["semantic-diagram"]["entrance"]["durationSec"] = 0.75
    s["treatments"]["semantic-diagram"]["edge"]["stroke"]["mode"] = "solid"
    s["treatments"]["semantic-diagram"]["edge"]["revealDurationSec"] = 0.65
    s["version"] = 1
    with open(STYLE, "w") as f:
        json.dump(s, f, indent=2, ensure_ascii=False)
    shutil.copy2(STYLE, SHARED)

def extract_scores(text):
    scores = {}
    for name, pattern in [("composition", r"composition[:\s\-]* (\d)"), ("color", r"color[:\s\-]* (\d)"),
                          ("motion", r"motion[:\s\-]* (\d)"), ("text", r"text[:\s\-]* (\d)"),
                          ("pacing", r"pacing[:\s\-]* (\d)")]:
        m = re.search(pattern, text.lower())
        if m: scores[name] = int(m.group(1))
    return scores

def render_and_critique(label):
    print(f"  Rendering ({label})...")
    path = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5, "end_sec": 7, "quality": "draft"})
    print(f"  Path: {path}")
    # Check file size to verify render actually changed
    full = path.replace("/workspace/", ROOT + "/").replace("/", os.sep)
    if os.path.exists(full):
        print(f"  File size: {os.path.getsize(full)} bytes")
    print(f"  Critiquing...")
    critique = visual_critique.invoke({"video_path": path, "aspect": "all"})
    scores = extract_scores(critique)
    print(f"  Scores: {scores}")
    print(f"  Critique excerpt: {critique[200:500]}")
    return scores

# === BASELINE ===
print("=" * 60)
print("BASELINE (all defaults)")
print("=" * 60)
reset_style()
baseline = render_and_critique("baseline")

# === TEST 1: damping 18→2 (very dramatic) ===
print("\n" + "=" * 60)
print("TEST 1: entrance.damping 18→2 (very bouncy)")
print("=" * 60)
update_style.invoke({"style_path": "treatments.semantic-diagram.entrance.damping", "new_value": "2"})
test1 = render_and_critique("damping=2")
reset_style()

# === TEST 2: stroke.mode solid→gradient ===
print("\n" + "=" * 60)
print("TEST 2: edge.stroke.mode solid→gradient (color change)")
print("=" * 60)
update_style.invoke({"style_path": "treatments.semantic-diagram.edge.stroke.mode", "new_value": "\"gradient\""})
test2 = render_and_critique("gradient")
reset_style()

# === TEST 3: revealDurationSec 0.65→3.0 ===
print("\n" + "=" * 60)
print("TEST 3: edge.revealDurationSec 0.65→3.0 (very slow draw-on)")
print("=" * 60)
update_style.invoke({"style_path": "treatments.semantic-diagram.edge.revealDurationSec", "new_value": "3.0"})
test3 = render_and_critique("reveal=3.0")
reset_style()

# === SUMMARY ===
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"{'Test':<30} {'comp':>5} {'color':>5} {'motion':>6} {'text':>5} {'pacing':>6}")
print("-" * 57)
print(f"{'Baseline':<30} {baseline.get('composition','?'):>5} {baseline.get('color','?'):>5} {baseline.get('motion','?'):>6} {baseline.get('text','?'):>5} {baseline.get('pacing','?'):>6}")
print(f"{'damping 18→2':<30} {test1.get('composition','?'):>5} {test1.get('color','?'):>5} {test1.get('motion','?'):>6} {test1.get('text','?'):>5} {test1.get('pacing','?'):>6}")
print(f"{'solid→gradient':<30} {test2.get('composition','?'):>5} {test2.get('color','?'):>5} {test2.get('motion','?'):>6} {test2.get('text','?'):>5} {test2.get('pacing','?'):>6}")
print(f"{'reveal 0.65→3.0':<30} {test3.get('composition','?'):>5} {test3.get('color','?'):>5} {test3.get('motion','?'):>6} {test3.get('text','?'):>5} {test3.get('pacing','?'):>6}")
