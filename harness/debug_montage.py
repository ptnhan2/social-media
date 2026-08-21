"""Debug the montage instrument: build both montages, save to disk, PIL-compare."""
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

from harness_tools import _montage_b64, _frame_image, _pixel_diff_stats, _duration_of
import base64

A = "projects/isaacverse-final/renders/windows/hr3_baseline.mp4"
B = "projects/isaacverse-final/renders/windows/hr3_after_color.mp4"

dur = _duration_of(A)
times = [round(dur * f, 2) for f in (0.18, 0.3, 0.42)]
print("duration:", dur, "times:", times)

ma, mb = _montage_b64(A, times), _montage_b64(B, times)
print("montage A bytes:", len(base64.b64decode(ma)), "| montage B bytes:", len(base64.b64decode(mb)))
print("montage b64 strings equal:", ma == mb)

# save both montages for inspection
out = Path(__file__).parent / "debug_montages"
out.mkdir(exist_ok=True)
(out / "montage_A.jpg").write_bytes(base64.b64decode(ma))
(out / "montage_B.jpg").write_bytes(base64.b64decode(mb))

# PIL-compare the two montage files directly
from PIL import Image
ia = Image.open(out / "montage_A.jpg").convert("RGB")
ib = Image.open(out / "montage_B.jpg").convert("RGB")
mean, changed = _pixel_diff_stats(ia, ib)
print(f"montage-vs-montage PIL diff: mean={mean:.3f} changed_pct={changed:.3f}")
print("saved to harness/debug_montages/ for inspection")
