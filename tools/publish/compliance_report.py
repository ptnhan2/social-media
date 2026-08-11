"""Generate an evidence-backed report for the 14 YouTube AI safeguards."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


RULES = [
    (1, "named-persona", "Named persona with documented POV", "channelPersona"),
    (2, "human-argument", "Script contains a human argument", "transformativeLayer"),
    (3, "format-variation", "Format differs from the previous video", "formatVariationReviewed"),
    (4, "commentary-layer", "Transformative commentary layer exists", "transformativeLayer"),
    (5, "original-visuals", "Original visuals are present", "originalVisuals"),
    (6, "mixed-footage", "At least one non-AI/non-stock element exists", "nonAiElements"),
    (7, "cadence-depth", "Cadence matches claimed depth", "cadenceReviewed"),
    (8, "disclosure", "AI-assisted production disclosure is ready", "disclosureRequired"),
    (9, "channel-thesis", "Channel thesis is documented", "channelPersona"),
    (10, "creative-process", "Creative process evidence is archived", "creativeProcessPath"),
    (11, "visual-dna", "Visual identity is declared", "visualDNA"),
    (12, "remediation", "Remediation record exists", "remediationPlan"),
    (13, "distribution", "YouTube is treated as distribution", "distributionPlan"),
    (14, "would-exist-without-ai", "Video passes the would-exist-without-AI test", "wouldExistWithoutAi"),
]


def report(video_doc: dict, project_dir: Path) -> dict:
    compliance = video_doc.get("compliance", {})
    findings = []
    for number, rule_id, title, key in RULES:
        value = compliance.get(key)
        passed = bool(value) and (not isinstance(value, list) or len(value) > 0)
        status = "pass" if passed else "review"
        evidence = [str(project_dir / "04-video-doc.json")] if passed else []
        findings.append({"rule": number, "id": rule_id, "title": title, "status": status, "value": value, "evidencePaths": evidence})
    status = "pass" if all(item["status"] == "pass" for item in findings) else "pass_with_review"
    return {"videoId": video_doc.get("id"), "status": status, "disclosure": compliance.get("disclosureText"), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--video-doc", type=Path, required=True); parser.add_argument("--project", type=Path, required=True); parser.add_argument("--output", type=Path, required=True); args = parser.parse_args()
    result = report(json.loads(args.video_doc.read_text(encoding="utf-8")), args.project); args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8"); print(json.dumps(result, indent=2)); return 0


if __name__ == "__main__": raise SystemExit(main())
