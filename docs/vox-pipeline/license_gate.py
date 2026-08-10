#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
License & provenance gate for vox pipeline projects.

MANDATORY step after the assets stage and BEFORE compose: every asset must carry
full provenance (license, provider, original_url + author for images), and image
tags must be clean (no ai_generated, no model/celebrity/personality tags — Pixabay
first hits are not trustworthy, playbook 5b.1).

Run:
    python docs/vox-pipeline/license_gate.py --project ai-dialogue

Exit code: 0 = ALL ASSETS VALID, 1 = FAIL found (fix and re-run until 0).
Pipeline rule: assets stage is NOT complete until this gate passes.
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # workspace root

PIPELINE_VERSION = "2026-08-03-v10"  # must match in ALL pipeline files (see playbook.md "Updating the pipeline")

BANNED_TAG_SUBSTRINGS = ["ai generated", "ai-generated", "celebrity", "famous", "personality", "trademark"]
BANNED_TAG_TOKENS = ["model", "models", "modeling", "celebrity"]


def parse_tags(summary: str) -> list[str]:
    m = re.search(r"tags:\s*([^;]*)", summary or "")
    if not m:
        return []
    return [t.strip().lower() for t in m.group(1).split(",") if t.strip()]


def audit(project_id: str) -> list[tuple[str, str, str]]:
    """Returns list of (asset_id, severity, message). Empty = clean."""
    manifest_path = os.path.join(ROOT, "openmontage", "projects", project_id, "artifacts", "asset_manifest.json")
    results: list[tuple[str, str, str]] = []
    if not os.path.exists(manifest_path):
        return [("manifest", "FAIL", f"asset_manifest.json not found: {manifest_path}")]
    manifest = json.load(open(manifest_path, encoding="utf-8"))
    assets = manifest.get("assets", [])

    for a in assets:
        aid = a.get("id", "?")
        atype = a.get("type", "?")
        missing = []
        if not a.get("license"):
            missing.append("license")
        if not a.get("provider"):
            missing.append("provider")
        if atype == "image":
            if not a.get("original_url"):
                missing.append("original_url")
            gs = a.get("generation_summary", "")
            if "author" not in gs:
                missing.append("author(gen_summary)")
            tags = parse_tags(gs)
            for banned in BANNED_TAG_SUBSTRINGS:
                if any(banned in t for t in tags):
                    results.append((aid, "FAIL", f"banned tag '{banned}' in tags"))
            for banned in BANNED_TAG_TOKENS:
                if any(t == banned or t.startswith(banned + " ") or t.endswith(" " + banned) for t in tags):
                    results.append((aid, "FAIL", f"model/celebrity tag '{banned}' in tags"))
        if atype == "music" and not a.get("duration_seconds"):
            missing.append("duration_seconds")
        if missing:
            results.append((aid, "FAIL", f"missing: {', '.join(missing)}"))

    return results


def main() -> int:
    ap = argparse.ArgumentParser(description="Vox license/provenance gate")
    ap.add_argument("--project", required=True, help="OpenMontage project id under projects/")
    args = ap.parse_args()

    results = audit(args.project)
    manifest_path = os.path.join(ROOT, "openmontage", "projects", args.project, "artifacts", "asset_manifest.json")
    n_assets = len(json.load(open(manifest_path, encoding="utf-8")).get("assets", [])) if os.path.exists(manifest_path) else 0
    print("=" * 72)
    print("LICENSE GATE (PIPELINE_VERSION %s)" % PIPELINE_VERSION)
    print("=" * 72)
    print(f"[INFO] auditing {n_assets} assets in {args.project}")
    if not results:
        print(f"[PASS] project {args.project}: ALL ASSETS VALID")
    for aid, sev, msg in results:
        print(f"[{sev:4s}] {aid:24s} {msg}")
    fails = [r for r in results if r[1] == "FAIL"]
    print("-" * 72)
    print(f"TOTAL: {len(results)} | FAIL {len(fails)} | PASS {len(results) - len(fails)}")
    if fails:
        print(">>> FIX the failed assets, re-run this gate until 0 FAIL. Assets stage is NOT complete until then.")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
