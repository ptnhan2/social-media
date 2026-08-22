"""Offline tests for pattern_extractor — seeds, evidence merge, self-check order."""
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pattern_extractor as px  # noqa: E402

passed = 0
failed = 0


def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"PASS {name}")
    else:
        failed += 1
        print(f"FAIL {name} {detail}")


# 1. extraction on the real memory files
doc = px.extract_patterns()
check("returns patterns list", isinstance(doc.get("patterns"), list) and len(doc["patterns"]) >= 4)
check("has learning_phase", "phase" in doc.get("learning_phase", {}))
check("has totals", doc.get("total_feedback_notes", -1) >= 0 and doc.get("total_votes", -1) >= 0)

# 2. seed categories present with high confidence
by_cat = {p["category"]: p for p in doc["patterns"]}
check("typography seed high", by_cat.get("typography", {}).get("confidence") == "high")
check("color seed high", by_cat.get("color", {}).get("confidence") == "high")
check("composition seed high", by_cat.get("composition", {}).get("confidence") == "high")

# 3. note evidence merges in (feedback.jsonl has a typography-ish note: "đường dày hơn...")
#    — keyword 'đường' maps to composition; verify SOME category gained notes
total_mentions = sum(p["mention_count"] for p in doc["patterns"])
check("mentions >= seeds (evidence merged)", total_mentions >= len(px.SEED_PATTERNS),
      f"total={total_mentions} seeds={len(px.SEED_PATTERNS)}")

# 4. self-check ordering: HIGH first, NONE last
md = px.generate_self_check(doc)
lines = [l for l in md.splitlines() if l.startswith("- [")]
tags = [l.split("[")[1].split("]")[0] for l in lines]
order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "NONE": 3}
check("self-check sorted HIGH first", not tags or tags[0] == "HIGH", str(tags))
check("self-check sorted non-decreasing", all(order[a] <= order[b] for a, b in zip(tags, tags[1:])), str(tags))
check("self-check is generated doc", "auto-generated" in md and "DO NOT hand-edit" in md)

# 5. note categorization sanity
check("note_category maps Vietnamese typography note",
      px._note_category("chữ mỏng quá") == "typography")
check("note_category maps color note",
      px._note_category("màu nhạt, bệt") == "color")
check("note_category returns None for unrelated",
      px._note_category("hello world") is None)

# 6. jsonl writing is valid JSON
_ = json.loads(json.dumps(doc, ensure_ascii=False))  # round-trip
check("doc serializes to valid JSON", True)

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
