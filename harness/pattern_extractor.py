"""Pattern extractor — meta-patterns from user feedback history.

Reads memories/feedback.jsonl + memories/preferences.jsonl, merges with the
seeded user design directives (2026-08-22 design review), and writes
memories/feedback-patterns.json + memories/self-check.md.

Design decisions (2026-08-23):
- The 5 user design directives are SEED patterns with HIGH confidence — they
  come from an explicit design-review conversation, which is stronger
  evidence than any single KEEP-gate note.
- A/B votes (preferences.jsonl) are recorded as weak evidence only: the
  2026-08-22 review established most knob A/B differences were
  imperceptible, so votes do NOT inflate confidence (most were ties anyway).
- feedback notes DO count: each note that targets a category is a real
  signal from the user.

Usage:
  python harness/pattern_extractor.py           # extract + write both files
  python harness/pattern_extractor.py --check   # print, write nothing
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

MEMORIES = Path(__file__).parent / "memories"
FEEDBACK_FILE = MEMORIES / "feedback.jsonl"
PREFERENCES_FILE = MEMORIES / "preferences.jsonl"
PATTERNS_FILE = MEMORIES / "feedback-patterns.json"
SELF_CHECK_FILE = MEMORIES / "self-check.md"

CATEGORIES = ("typography", "color", "composition", "motion", "pacing", "narrative")

# The 5 design directives from the user's design review (2026-08-22).
# Source: docs/PATTERN-LEARNING-AND-EVAL-SPEC.md §7 — the review that
# invalidated knob A/B testing and set the design-level direction.
SEED_PATTERNS = [
    {
        "category": "typography",
        "consistent_direction": "bolder+bigger",
        "bias": "always prefer bold typography (900+) with visual effects (stroke/gradient/shadow)",
        "confidence": "high",
        "auto_check": "verify all text elements in treatments.tsx have fontWeight >= 900 AND a visual effect (text-shadow/drop-shadow/gradient fill)",
        "source": "user:2026-08-22 design review",
    },
    {
        "category": "color",
        "consistent_direction": "more-vivid+higher-contrast",
        "bias": "always prefer vivid, saturated colors with high contrast; never washed out or muted",
        "confidence": "high",
        "auto_check": "verify filter strings have saturate >= 1.0 and brightness >= 0.85; accents must pop against background",
        "source": "user:2026-08-22 design review",
    },
    {
        "category": "composition",
        "consistent_direction": "gradients+organic-curves",
        "bias": "prefer gradients over flat fills; organic curves over mechanical straight lines",
        "confidence": "high",
        "auto_check": "verify major fills use linear-gradient/radial-gradient; connectors use curved paths, not straight lines",
        "source": "user:2026-08-22 design review",
    },
    {
        "category": "narrative",
        "consistent_direction": "story-over-information",
        "bias": "present information as narrative (character/host tells the story), not raw data display",
        "confidence": "high",
        "auto_check": "verify information treatments have a narrative element (host presence, story arc) — flag as requires-design if not",
        "source": "user:2026-08-22 design review",
    },
    {
        "category": "motion",
        "consistent_direction": "purposeful-motion",
        "bias": "motion must serve the narrative; keep draw-on reveals and spring entrances",
        "confidence": "medium",
        "auto_check": "verify every element has purposeful animation (spring/interpolate, not static)",
        "source": "inherited: mot-101 + verified cycles (damping 18→2, reveal 0.65→2)",
    },
]

# Vietnamese + English keyword → category hints for feedback notes.
NOTE_KEYWORDS = {
    "typography": ("chữ", "text", "font", "typography", "mỏng", "thin", "letter", "title", "mềm"),
    "color": ("màu", "color", "bệt", "nhạt", "washed", "washed out", "contrast", "tương phản", "saturated", "rực"),
    "composition": ("đường", "line", "layout", "sắp xếp", "composition", "curves", "vuông", "straight"),
    "motion": ("chuyển động", "motion", "animation", "spring", "nảy", "bounce"),
    "pacing": ("nhịp", "pacing", "tempo", "nhanh", "chậm", "fast", "slow"),
    "narrative": ("kể chuyện", "narrative", "story", "character", "nhân vật"),
}


def _load_jsonl(path: Path) -> list[dict]:
    records = []
    if not path.exists():
        return records
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return records


def _note_category(note: str, knob: str = "") -> str | None:
    text = f"{note} {knob}".lower()
    for cat, kws in NOTE_KEYWORDS.items():
        if any(kw in text for kw in kws):
            return cat
    return None


def _confidence_for(mention_count: int) -> str:
    if mention_count >= 3:
        return "high"
    if mention_count == 2:
        return "medium"
    if mention_count == 1:
        return "low"
    return "none"


def extract_patterns() -> dict:
    """Build the feedback-patterns document from seeds + real feedback history."""
    notes = _load_jsonl(FEEDBACK_FILE)
    votes = _load_jsonl(PREFERENCES_FILE)

    # evidence per category from real notes
    note_evidence: dict[str, list[dict]] = {c: [] for c in CATEGORIES}
    for n in notes:
        cat = _note_category(n.get("note", ""), n.get("knob_under_test", ""))
        if cat:
            note_evidence[cat].append(n)

    # votes: decided (non-tie) vs tie per aspect — weak evidence, recorded only
    vote_stats: dict[str, dict] = {}
    for v in votes:
        aspect = (v.get("aspect") or "").lower()
        cat = {"text": "typography", "color": "color", "motion": "motion",
               "pacing": "pacing", "composition": "composition"}.get(aspect)
        if not cat:
            continue
        s = vote_stats.setdefault(cat, {"decided": 0, "tie": 0})
        if v.get("user_verdict") in ("a", "b"):
            s["decided"] += 1
        else:
            s["tie"] += 1

    patterns = []
    for seed in SEED_PATTERNS:
        cat = seed["category"]
        mentions = 1 + len(note_evidence.get(cat, []))  # seed counts as 1 strong signal
        # seeds are already high/medium confidence from the design review;
        # extra notes can only reinforce, never downgrade below the seed
        derived = _confidence_for(mentions)
        order = {"none": 0, "low": 1, "medium": 2, "high": 3}
        confidence = seed["confidence"] if order[seed["confidence"]] >= order[derived] else derived
        entry = {
            "category": cat,
            "mention_count": mentions,
            "consistent_direction": seed["consistent_direction"],
            "bias": seed["bias"],
            "confidence": confidence,
            "auto_check": seed["auto_check"],
            "last_mentioned": note_evidence[cat][-1].get("ts", "2026-08-22") if note_evidence.get(cat) else "2026-08-22",
            "source": seed["source"],
            "note_samples": [n.get("note", "")[:200] for n in note_evidence.get(cat, [])][-3:],
            "vote_evidence": vote_stats.get(cat),
        }
        patterns.append(entry)

    # categories with real notes but no seed pattern
    seeded_cats = {p["category"] for p in patterns}
    for cat in CATEGORIES:
        if cat in seeded_cats or not note_evidence.get(cat):
            continue
        mentions = len(note_evidence[cat])
        patterns.append({
            "category": cat,
            "mention_count": mentions,
            "consistent_direction": "unclassified",
            "bias": None,
            "confidence": _confidence_for(mentions),
            "auto_check": f"review {mentions} user note(s) in this category and classify a direction",
            "last_mentioned": note_evidence[cat][-1].get("ts", ""),
            "source": "feedback notes",
            "note_samples": [n.get("note", "")[:200] for n in note_evidence[cat]][-3:],
            "vote_evidence": vote_stats.get(cat),
        })

    doc = {
        "patterns": patterns,
        "total_feedback_notes": len(notes),
        "total_votes": len(votes),
        "learning_phase": _learning_phase(patterns),
        "generated_by": "pattern_extractor.py",
    }
    return doc


def _learning_phase(patterns: list[dict]) -> dict:
    """Phase transitions per spec §3.4."""
    high_cats = [p["category"] for p in patterns if p["confidence"] == "high"]
    feedback_total = sum(p["mention_count"] for p in patterns)
    phase = 1
    reasons = [f"phase 1: user drives ({len(high_cats)} high-confidence categories, {feedback_total} total signals)"]
    if feedback_total >= 5 and len(high_cats) >= 2:
        phase = 2
        reasons = [f"phase 2: patterns recognized ({len(high_cats)} high categories, {feedback_total} signals)"]
    if len(high_cats) >= 3:
        # phase 3 also needs >= 2 verified principles — read from taste-standard
        verified = 0
        try:
            from validate_principles import extract_principles
            std = (Path(__file__).parent / "memories" / "taste-standard.md").read_text(encoding="utf-8-sig")
            verified = sum(1 for p in extract_principles(std) if p.get("verified", 0) >= 1)
        except Exception:
            pass
        if verified >= 2:
            phase = 3
            reasons = [f"phase 3: self-evaluating ({len(high_cats)} high categories, {verified} verified principles)"]
        else:
            reasons.append(f"phase 3 blocked: only {verified} verified principles (needs >= 2)")
    return {"phase": phase, "reasons": reasons}


def generate_self_check(patterns_doc: dict) -> str:
    """Generate the self-check checklist markdown from the patterns."""
    order = {"high": 0, "medium": 1, "low": 2, "none": 3}
    lines = [
        "# Self-Check Checklist (auto-generated — DO NOT hand-edit)",
        "",
        f"Generated by pattern_extractor.py. Learning phase: {patterns_doc['learning_phase']['phase']}",
        f"({patterns_doc['learning_phase']['reasons'][0]})",
        "",
        "Run this checklist against the CURRENT treatment code BEFORE proposing any",
        "change and AFTER applying one. Fix violations you find — even ones the user",
        "did not mention this session.",
        "",
    ]
    for p in sorted(patterns_doc["patterns"], key=lambda x: order.get(x["confidence"], 9)):
        tag = p["confidence"].upper()
        lines.append(f"- [{tag}] {p['category']}: {p['auto_check']} ← {p['mention_count']} mention(s), bias: {p['bias'] or 'unclassified'}")
    lines += [
        "",
        "Categories not listed have no feedback evidence — use inherited principles",
        "from taste-standard.md for them.",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    doc = extract_patterns()
    check_only = "--check" in sys.argv
    rendered = json.dumps(doc, ensure_ascii=False, indent=2)
    if check_only:
        print(rendered)
        print("\n--- self-check.md preview ---")
        print(generate_self_check(doc))
        return 0
    PATTERNS_FILE.write_text(rendered, encoding="utf-8")
    SELF_CHECK_FILE.write_text(generate_self_check(doc), encoding="utf-8")
    print(f"Wrote {PATTERNS_FILE.name} ({len(doc['patterns'])} patterns) + {SELF_CHECK_FILE.name}")
    print(f"Learning phase: {doc['learning_phase']['phase']} — {doc['learning_phase']['reasons'][0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
