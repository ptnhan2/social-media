"""Validate the structured principle schema in taste-standard.md.

Extracts every ```json fenced block, parses the principle objects (arrays or
line-per-object), and verifies schema completeness per
docs/PATTERN-LEARNING-AND-EVAL-SPEC.md §3.1.

Exit code 0 = valid, 1 = violations found.
Usage: python harness/validate_principles.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

STD_FILE = Path(__file__).parent / "memories" / "taste-standard.md"

REQUIRED_FIELDS = [
    "id", "principle", "scope", "category", "direction", "source",
    "confidence", "verified", "rejected", "promoted", "status",
]
VALID_CATEGORIES = {"typography", "color", "composition", "motion", "pacing", "narrative"}
VALID_CONFIDENCE = {"high", "medium", "low", "none"}
VALID_STATUS = {"ACTIVE", "CANDIDATE"}


def extract_principles(text: str) -> list[dict]:
    """Parse every ```json fenced block into principle objects."""
    principles: list[dict] = []
    for block in re.findall(r"```json\s*\n(.*?)```", text, re.DOTALL):
        block = block.strip()
        # Try whole-block JSON (array) first
        try:
            data = json.loads(block)
            if isinstance(data, list):
                principles.extend(o for o in data if isinstance(o, dict))
                continue
            if isinstance(data, dict):
                principles.append(data)
                continue
        except json.JSONDecodeError:
            pass
        # Fall back to line-per-object
        for line in block.splitlines():
            line = line.strip().rstrip(",")
            if not line:
                continue
            try:
                obj = json.loads(line)
                if isinstance(obj, dict):
                    principles.append(obj)
            except json.JSONDecodeError:
                continue
    return principles


def validate(principles: list[dict]) -> list[str]:
    errors: list[str] = []
    seen_ids: set[str] = set()
    for p in principles:
        pid = p.get("id", "<missing-id>")
        for field in REQUIRED_FIELDS:
            if field not in p:
                errors.append(f"{pid}: missing field '{field}'")
        if "id" in p:
            if p["id"] in seen_ids:
                errors.append(f"{pid}: duplicate id")
            seen_ids.add(p["id"])
        scope = p.get("scope", "")
        if scope and scope not in ("global", "one-time") and not scope.startswith(("treatment:", "category:")):
            errors.append(f"{pid}: invalid scope '{scope}'")
        cat = p.get("category", "")
        if cat and cat not in VALID_CATEGORIES:
            errors.append(f"{pid}: invalid category '{cat}'")
        conf = p.get("confidence", "")
        if conf and conf not in VALID_CONFIDENCE:
            errors.append(f"{pid}: invalid confidence '{conf}'")
        status = p.get("status", "")
        if status and status not in VALID_STATUS:
            errors.append(f"{pid}: invalid status '{status}'")
        for count_field in ("verified", "rejected"):
            v = p.get(count_field)
            if v is not None and (not isinstance(v, int) or isinstance(v, bool) or v < 0):
                errors.append(f"{pid}: '{count_field}' must be a non-negative int, got {v!r}")
        if "promoted" in p:
            if not isinstance(p["promoted"], bool):
                errors.append(f"{pid}: 'promoted' must be bool")
            elif p["promoted"] and p.get("verified", 0) < 2:
                errors.append(f"{pid}: promoted=true requires verified >= 2 (has {p.get('verified', 0)})")
        if isinstance(p.get("principle"), str) and len(p["principle"]) < 10:
            errors.append(f"{pid}: principle text too short")
    return errors


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    text = STD_FILE.read_text(encoding="utf-8-sig")
    principles = extract_principles(text)
    if not principles:
        print("FAIL: no principle objects found in taste-standard.md")
        return 1
    errors = validate(principles)
    n_active = sum(1 for p in principles if p.get("status") == "ACTIVE")
    n_cand = sum(1 for p in principles if p.get("status") == "CANDIDATE")
    by_cat: dict[str, int] = {}
    for p in principles:
        by_cat[p.get("category", "?")] = by_cat.get(p.get("category", "?"), 0) + 1
    print(f"Parsed {len(principles)} principles ({n_active} ACTIVE, {n_cand} CANDIDATE)")
    print("By category: " + ", ".join(f"{k}={v}" for k, v in sorted(by_cat.items())))
    if errors:
        print(f"\n{len(errors)} SCHEMA VIOLATIONS:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("Schema OK — all principles valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
