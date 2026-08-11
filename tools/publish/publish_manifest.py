"""Create a truthful publish dry-run manifest; no upload is claimed."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def create(project: Path, master: Path, thumbnail: Path, gate: Path, compliance: Path) -> dict:
    gate_data = json.loads(gate.read_text(encoding="utf-8"))
    compliance_data = json.loads(compliance.read_text(encoding="utf-8"))
    blocked = gate_data.get("status") == "FAIL" or compliance_data.get("status") == "fail"
    return {
        "videoId": project.name,
        "masterSrc": str(master),
        "thumbnailSrc": str(thumbnail),
        "title": "The timeline is not the edit",
        "description": "Choose the decision first. Then let the frame move.\n\nAI-assisted production and synthetic narration are disclosed in this package.",
        "captions": [],
        "dubs": json.loads((project / "dubbing/dub-plan.json").read_text(encoding="utf-8")).get("dubs", []) if (project / "dubbing/dub-plan.json").exists() else [],
        "complianceReportPath": str(compliance),
        "gateReportPath": str(gate),
        "status": "blocked" if blocked else "dry_run",
        "upload": {"attempted": False, "reason": "YouTube OAuth/API call was not invoked in the local final run."},
    }


def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--project", type=Path, required=True); parser.add_argument("--master", type=Path, required=True); parser.add_argument("--thumbnail", type=Path, required=True); parser.add_argument("--gate", type=Path, required=True); parser.add_argument("--compliance", type=Path, required=True); parser.add_argument("--output", type=Path, required=True); args = parser.parse_args()
    result = create(args.project, args.master, args.thumbnail, args.gate, args.compliance); args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8"); print(json.dumps(result, indent=2)); return 0 if result["status"] != "blocked" else 1


if __name__ == "__main__": raise SystemExit(main())
