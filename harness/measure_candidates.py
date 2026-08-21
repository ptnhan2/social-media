"""D3-prep: measure tutorial-candidate principles against current baseline
renders — deterministic PIL analysis, no VLM.

Measures per treatment render (mid-clip frame):
- accent-area % (amber hue band, cyan hue band) — for the ≤N%-of-frame family
- text hierarchy ratios come from the style store (reported separately)
"""
import colorsys
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent.parent
WND = ROOT / "projects" / "isaacverse-final" / "renders" / "windows"
STORE = json.loads((ROOT / "libraries" / "04-visual" / "isaacverse-style.json").read_text(encoding="utf-8-sig"))

RENDERS = {
    "chapter-card (0-3.5s)": "vs_cc_A.mp4",
    "semantic-diagram (3.5-7s)": "knob_baseline.mp4",
    "host-reflection (7-10.5s)": "hr3_baseline.mp4",
    "process-timeline (10.5-14s)": "sanity_pt_base.mp4",
}


def frame_at(video: Path, t: float, width: int = 640):
    import subprocess, tempfile
    tmp = tempfile.mkdtemp()
    fp = Path(tmp) / "f.png"
    subprocess.run(["ffmpeg", "-y", "-ss", str(t), "-i", str(video), "-frames:v", "1",
                    "-vf", f"scale={width}:-1", str(fp)], capture_output=True, timeout=30)
    img = Image.open(fp).convert("RGB") if fp.exists() else None
    return img


def hue_band_share(img: Image.Image, lo_deg: float, hi_deg: float, min_sat=0.35, min_val=0.35):
    """% of pixels whose hue is in [lo,hi) with sat/val above floors."""
    px = list(img.convert("HSV").getdata())
    total = len(px)
    n = 0
    for h, s, v in px:
        hue = h * 360 / 255
        if lo_deg <= hue < hi_deg and s / 255 >= min_sat and v / 255 >= min_val:
            n += 1
    return 100.0 * n / total


import tempfile, subprocess  # noqa: E402

print("=== accent-area measurement (mid-clip frame of each baseline render) ===")
results = {}
for name, fname in RENDERS.items():
    p = WND / fname
    if not p.exists():
        print(f"  {name}: RENDER MISSING ({fname})")
        continue
    img = frame_at(p, 1.5)
    amber = hue_band_share(img, 25, 55)   # amber/orange band
    cyan = hue_band_share(img, 165, 200)  # cyan band
    results[name] = {"amber_pct": round(amber, 2), "cyan_pct": round(cyan, 2)}
    print(f"  {name}: amber={amber:.2f}%  cyan={cyan:.2f}%")

print("\n=== text hierarchy from style store (candidate: title >=1.8x sub >=1.5x meta) ===")
sd = STORE["treatments"]["semantic-diagram"]
cc = STORE["treatments"]["chapter-card"]
hr = STORE["treatments"]["host-reflection"]
print(f"  semantic-diagram: title={sd['title']['fontSize']} node={sd['node']['fontSize']} detail={sd['node']['detailFontSize']}"
      f" -> title/node={sd['title']['fontSize']/sd['node']['fontSize']:.2f}x node/detail={sd['node']['fontSize']/sd['node']['detailFontSize']:.2f}x")
print(f"  chapter-card: title={cc['title']['fontSizeLong']} subtitle(hardcoded 20)=20"
      f" -> ratio={cc['title']['fontSizeLong']/20:.2f}x")
print(f"  host-reflection: subtitle={hr['subtitle']['fontSize']}px at 1080p = {hr['subtitle']['fontSize']/1080*100:.1f}% frame height (candidate: <=4%)")
print(f"  host-reflection: letterboxBottom={hr['letterboxBottomPct']}% (subtitle sits inside bottom bar)")

out = ROOT / "harness" / "candidate_measurements.json"
out.write_text(json.dumps({"renders": results,
                           "store_hierarchy": {
                               "semantic_title_node": round(sd['title']['fontSize'] / sd['node']['fontSize'], 2),
                               "semantic_node_detail": round(sd['node']['fontSize'] / sd['node']['detailFontSize'], 2),
                               "chapter_title_subtitle": round(cc['title']['fontSizeLong'] / 20, 2),
                               "host_sub_height_pct": round(hr['subtitle']['fontSize'] / 1080 * 100, 1),
                           }}, indent=1), encoding="utf-8")
print(f"\nwritten to {out}")
