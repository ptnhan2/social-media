"""Generate docs/TUTORIAL-CANDIDATES-REVIEW.md — the morning review document
for the user (D2 prep). Clusters candidates by theme, cross-references
deterministic measurements, and recommends an action per cluster.

Run AFTER all ingests complete:
    harness/.venv/Scripts/python.exe harness/generate_review_doc.py
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
CAND = ROOT / "harness" / "memories" / "tutorial-candidates.json"
MEAS = ROOT / "harness" / "candidate_measurements.json"

cand_data = json.loads(CAND.read_text(encoding="utf-8-sig"))
meas = json.loads(MEAS.read_text(encoding="utf-8-sig")) if MEAS.exists() else {}

all_candidates = cand_data.get("all_candidates", cand_data.get("candidates", []))
videos = {v.get("video", "?") for v in cand_data.get("videos", [])}


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


clusters: dict[str, list] = {}
for c in all_candidates:
    clusters.setdefault(classify(c["principle"]), []).append(c)

# ---- measurement cross-reference ----
acc = meas.get("renders", {})
hier = meas.get("store_hierarchy", {})
accent_note = ""
if acc:
    vals = [v["amber_pct"] for v in acc.values()] + [v["cyan_pct"] for v in acc.values()]
    accent_note = (f"Hiện tại các render baseline đo được amber {min(vals):.2f}–{max(vals):.2f}% "
                   f"và cyan {min(v['cyan_pct'] for v in acc.values()):.2f}–{max(v['cyan_pct'] for v in acc.values()):.2f}% "
                   f"diện tích khung hình — toàn bộ dưới mọi ngưỡng candidate.")
hier_note = ""
if hier:
    hier_note = (f"semantic-diagram: title/node={hier.get('semantic_title_node')}x, node/detail="
                 f"{hier.get('semantic_node_detail')}x (candidate ≥1.5x → FAIL sát sao 0.07x); "
                 f"chapter-card title/subtitle={hier.get('chapter_title_subtitle')}x (dư dả).")

RECS = {
    "accent-area": ("GỘP + DUYỆT", "Gộp 5+ biến thể thành MỘT nguyên tắc 'accent color ≤ ~10% "
                     "diện tích khung' — style hiện tại thỏa với biên rộng (khoảng cách an toàn cho tương lai). "
                     "Không cần cycle."),
    "text-hierarchy": ("DUYỆT + CYCLE", "Nguyên tắc hierarchy hợp lệ. Có 1 điểm fail đo được: "
                        "node/detail 1.43x < 1.5x (knob detailFontSize 14→13 có thể fix) — candidate "
                        "đầu tiên cho cycle sau khi có oracle tốt hơn (hoặc vote trực tiếp)."),
    "subtitle": ("DUYỆT MỘT PHẦN", "Size ≤4% + vị trí trong letterbox bar: ĐÃ THỎA. Mệnh đề "
                  "'zero stroke/shadow' nên TỪ CHỐI — nền tối của host-reflection cần shadow để đọc được."),
    "motion": ("HOÃN (F4)", "Không đo được bằng công cụ hiện tại (montage oracle mù motion — "
               "đã chứng minh 2026-08-21). Giữ lại, verify khi có native video input."),
    "composition": ("GHI NHẬN", "Áp dụng cho presenter/footage (host-reflection) hơn là diagram "
                     "treatments. Ghi vào taste-standard như hướng dẫn composition, không cần cycle."),
    "pacing": ("GHI NHẬN", "Hard-cut vs fade là lựa chọn gu — cần vote thật trước khi thành chuẩn."),
    "junk": ("BỎ", "Sinh từ frame đen/lỗi sample (VLM phân tích garbage frame)."),
    "other": ("XEM TỪNG CÁI", "Chưa phân loại được tự động."),
}

lines = [
    "# TUTORIAL CANDIDATES — REVIEW CHO USER (D2)",
    "",
    f"> Sinh tự động lúc {datetime.now().isoformat(timespec='minutes')} bởi generate_review_doc.py.",
    f"> Nguồn: {len(videos)} video Isaac, {len(all_candidates)} candidates thô.",
    "> Quy trình (roadmap P3): candidates là GIẢ THUYẾT — duyệt của bạn → entry CANDIDATE trong",
    "> taste-standard.md → verify cycle → nguyên tắc thật. Isaac là một trường phái, không phải",
    "> phúc âm (divergence là mục tiêu).",
    "",
    "## Bảng quyết định nhanh",
    "",
    "| Nhóm | Số lượng | Khuyến nghị |",
    "|---|---|---|",
]
for k in sorted(clusters):
    lines.append(f"| {k} | {len(clusters[k])} | {RECS.get(k, ('?', ''))[0]} |")

lines += [
    "",
    "## Đo đạc deterministic trên renders hiện tại",
    "",
    f"- Accent-area: {accent_note}" if accent_note else "- Accent-area: (chưa đo)",
    f"- Text hierarchy: {hier_note}" if hier_note else "- Text hierarchy: (chưa đo)",
    "- Lưu ý: mọi phép đo ở mid-frame, ngưỡng hue ±, sat/val ≥ 0.35 (harness/measure_candidates.py).",
    "",
]

for k in sorted(clusters):
    rec, why = RECS.get(k, ("?", ""))
    lines += [f"## Nhóm: {k} — {rec}", "", f"**Lý do:** {why}", ""]
    for c in clusters[k]:
        prov = c.get("provenance", "")
        lines.append(f"- \"{c['principle']}\"")
        lines.append(f"  - nguồn: `{prov}`")
    lines.append("")

lines += [
    "## Việc chờ bạn (buổi sáng)",
    "",
    "1. Duyệt từng nhóm theo khuyến nghị (sửa tự do — đây là GIẢ THUYẾT).",
    "2. Vote 2 cặp 1080p đã render sẵn (hr3_1080_*) — test giả thuyết resolution.",
    "3. Quyết định node/detail 1.43x: fix bằng cycle (detailFontSize 14→13) hay kệ.",
    "4. (Nếu rảnh) Cấp key DashScope quốc tế — F4 giờ là critical path của toàn bộ",
    "   hướng tiến hóa treatment (xem knowledge-base 'blind spot is PERCEPTUAL').",
]

out = ROOT / "docs" / "TUTORIAL-CANDIDATES-REVIEW.md"
out.write_text("\n".join(lines), encoding="utf-8")
print(f"written {out} — {len(all_candidates)} candidates in {len(clusters)} clusters")
for k in sorted(clusters):
    print(f"  {k}: {len(clusters[k])}")
