"""(1) Write tutorial candidates into taste-standard.md as CANDIDATE entries
(hypotheses — verification happens via cycles + KEEP gates, not text review).
(2) Generate a static visual learning browser (learning-browser.html) showing
the ACTUAL Isaac frames the AI analyzed + its observations per moment.

Redesign rationale (user feedback 2026-08-22): the user cannot evaluate
abstract text principles — their taste enters through VISUAL A/B decisions.
Text review is the wrong mechanism; transparency + visual browsing is right.
"""
import base64
import json
import sys
from pathlib import Path

sys.path.insert(0, "harness")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(".")
CAND_FILE = ROOT / "harness" / "memories" / "tutorial-candidates.json"
STD_FILE = ROOT / "harness" / "memories" / "taste-standard.md"
BROWSER = ROOT / "docs" / "learning-browser.html"

data = json.loads(CAND_FILE.read_text(encoding="utf-8-sig"))


def classify(p: str) -> str:
    low = p.lower()
    if "ellipsis" in low or "0.01%" in low or "pause cue" in low:
        return "junk"
    if "accent" in low and ("%" in low or "frame area" in low):
        return "accent-area"
    if any(w in low for w in ("hierarchy", "size ratio", "×", "x larger", "larger than", "font size", "title")):
        return "text-hierarchy"
    if "subtitle" in low or "caption" in low:
        return "subtitle"
    if any(w in low for w in ("motion blur", "gesture", "animated", "static-to-motion", "consecutive frames")):
        return "motion"
    if any(w in low for w in ("black-screen", "black screen", "hard break", "cut")):
        return "pacing"
    if any(w in low for w in ("position", "centered", "panel", "negative space", "z-space", "focal")):
        return "composition"
    return "other"


# ---------- (1) taste-standard.md ----------
clusters: dict[str, list] = {}
for c in data.get("all_candidates", []):
    clusters.setdefault(classify(c["principle"]), []).append(c)

SECTION = """
## Tutorial Candidates — học từ Isaac (CANDIDATE, CHƯA VERIFY)

> Sinh 2026-08-22 từ 3 video Isaac (04-editing, 02-scripts, 06-thumbnails) qua
> montage VLM. Đây là GIẢ THUYẾT — mỗi nguyên tắc phải qua verification cycle
> (pixel-diff + pairwise + KEEP gate của user) trước khi thành nguyên tắc
> thật trong các mục ở trên. Không tự áp nguyên tắc CANDIDATE khi phán xét;
> chỉ dùng để gợi ý knob/khía cạnh cần thử. Khi promote: cap tỉ lệ nguyên tắc
> nguồn-Isaac ≤ 50% của standard (divergence là mục tiêu). Xem gốc: docs/
> learning-browser.html + harness/memories/tutorial-candidates.json.
"""

LABELS = {
    "accent-area": "### Accent area (màu nhấn chiếm bao nhiêu % khung)",
    "text-hierarchy": "### Text hierarchy (tỉ lệ cỡ chữ các tầng)",
    "subtitle": "### Subtitle spec",
    "motion": "### Motion (HOÃN verify — oracle mù motion tới khi có F4)",
    "composition": "### Composition",
    "pacing": "### Pacing",
    "other": "### Khác",
}

# category mapping for the structured schema (see taste-standard.md header)
CATEGORY_MAP = {
    "accent-area": "color",
    "text-hierarchy": "typography",
    "subtitle": "typography",
    "motion": "motion",
    "composition": "composition",
    "pacing": "pacing",
    "other": "composition",
}

lines = [SECTION]
for key in ("accent-area", "text-hierarchy", "subtitle", "composition", "pacing", "motion", "other"):
    if key not in clusters:
        continue
    lines.append(LABELS[key])
    lines.append("")
    entries = []
    for i, c in enumerate(sorted(clusters[key], key=lambda x: x.get("provenance", "")), start=1):
        prov = c.get("provenance", "").replace(" - ", " ")
        entries.append({
            "id": f"tut-{key}-{i:03d}",
            "principle": c["principle"],
            "scope": "global",
            "category": CATEGORY_MAP[key],
            "direction": "unverified",
            "source": f"tutorial:{prov}",
            "confidence": "low",
            "verified": 0,
            "rejected": 0,
            "promoted": False,
            "status": "CANDIDATE",
        })
    lines.append("```json")
    for e in entries:
        lines.append(json.dumps(e, ensure_ascii=False))
    lines.append("```")
    lines.append("")

# idempotent: replace the existing section if present
current = STD_FILE.read_text(encoding="utf-8-sig")
marker = "## Tutorial Candidates"
if marker in current:
    current = current.split(marker)[0].rstrip() + "\n"
STD_FILE.write_text(current + "\n" + "\n".join(lines), encoding="utf-8")
n_kept = sum(len(v) for k, v in clusters.items() if k != "junk")
print(f"taste-standard.md: +{n_kept} CANDIDATE entries (junk excluded: {len(clusters.get('junk', []))})")

# ---------- (2) learning browser ----------
from ingest_tutorial import montage_b64  # noqa: E402

videos = data.get("videos", [])
cards = []
total_moments = 0
for v in videos:
    vname = Path(v["video"]).name
    vcards = []
    for m in v.get("moments", []):
        desc = str(m.get("description", ""))
        if "VLM API error" in desc:
            continue
        total_moments += 1
        principles = [ln.strip()[len("PRINCIPLE:"):].strip()
                      for ln in desc.splitlines() if ln.strip().upper().startswith("PRINCIPLE:")]
        # truncate observations before the PRINCIPLE lines
        obs = desc.split("PRINCIPLE:")[0].strip()
        vpath = Path(v["video"])
        if not vpath.is_absolute():
            vpath = ROOT / v["video"]
        b64 = None
        try:
            b64 = montage_b64(vpath, m["t_sec"])
        except Exception:
            pass
        phtml = "".join(f'<li class="principle">{p}</li>' for p in principles) or '<li class="none">(moment này không sinh nguyên tắc)</li>'
        img = f'<img src="data:image/jpeg;base64,{b64}" alt="t={m["t_sec"]}s"/>' if b64 else '<div class="noimg">(không trích xuất được frame)</div>'
        vcards.append(f"""
<div class="card">
  {img}
  <div class="meta">t={m['t_sec']:.0f}s</div>
  <details><summary>AI quan sát thấy gì (nhấn để mở)</summary><pre>{obs}</pre></details>
  <div class="principles"><div class="plabel">Nguyên tắc rút ra (CANDIDATE — chưa verify):</div><ul>{phtml}</ul></div>
</div>""")
    cards.append(f'<h2>{vname}</h2><div class="grid">{"".join(vcards)}</div>')

html = f"""<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>AI học gì từ video Isaac</title><style>
 body{{background:#0b0e14;color:#e8e2d5;font-family:system-ui,Segoe UI,Arial;margin:0;padding:28px}}
 h1{{font-size:20px}} .sub{{color:#8a94a6;font-size:14px;margin-bottom:24px;max-width:820px;line-height:1.5}}
 h2{{font-size:16px;color:#f2b84b;margin:28px 0 12px}}
 .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:18px}}
 .card{{background:#131824;border:1px solid #2c3a52;border-radius:10px;padding:14px}}
 .card img{{width:100%;border-radius:6px;background:#000}}
 .noimg{{color:#8a94a6;padding:20px;text-align:center}}
 .meta{{color:#f2b84b;font-weight:700;margin:8px 0}}
 details summary{{cursor:pointer;color:#61d7e8;font-size:13px}}
 details pre{{white-space:pre-wrap;font-size:12px;color:#b9c2d0;background:#0b0e14;padding:10px;border-radius:6px;max-height:300px;overflow:auto}}
 .plabel{{font-size:12px;color:#8a94a6;margin-top:8px}}
 .principles ul{{margin:6px 0 0;padding-left:18px}}
 .principle{{font-size:13px;line-height:1.45;margin-bottom:6px}}
</style></head><body>
<h1>AI học gì từ video Isaac</h1>
<div class="sub">Đêm 21-22/08, AI xem <b>{len(videos)} video</b> hướng dẫn của Isaac, mỗi video lấy 8 thời điểm (mỗi thời điểm = 3 frame liên tiếp như ảnh dưới).
Từ đó nó mô tả <i>cách Isaac dựng hình</i> (màu, cỡ chữ, bố cục — không phải nội dung) và rút ra các nguyên tắc ứng viên.
Những nguyên tắc này chỉ là <b>giả thuyết</b>: cái nào đáng tin sẽ được verify bằng cycle thật, và quyết định cuối cùng vẫn là phiếu A/B của bạn trên video. Trang này để bạn xem AI đã học từ cái gì — không cần quyết gì cả.</div>
{"".join(cards)}
<div class="sub" style="margin-top:30px">Tổng: {total_moments} moments được phân tích. Dữ liệu gốc: harness/memories/tutorial-candidates.json.</div>
</body></html>"""

BROWSER.write_text(html, encoding="utf-8")
print(f"docs/learning-browser.html: {total_moments} moment cards, {BROWSER.stat().st_size // 1024} KB")
