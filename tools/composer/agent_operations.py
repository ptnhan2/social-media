"""CLI fallback for structured Composer operations.

The Vite bridge uses the canonical TypeScript implementation. This command is
the same contract for Python agents and automation that cannot run the browser.
It is deliberately local-only and never calls a paid provider implicitly.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def find_beat(doc: dict[str, Any], beat_id: str | None) -> dict[str, Any] | None:
    return next((beat for beat in doc.get("beats", []) if beat.get("id") == beat_id), None)


def envelope(request: dict[str, Any], status: str, **extra: Any) -> dict[str, Any]:
    return {
        "operationId": f"op-{request.get('operation', 'unknown')}-{request.get('projectId', 'unknown')}-{int(time.time() * 1000)}",
        "operation": request.get("operation"),
        "status": status,
        "projectId": request.get("projectId"),
        **extra,
    }


def dispatch(doc: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    target = request.get("target") or {}
    beat = find_beat(doc, target.get("beatId"))
    operation = request.get("operation")
    if operation == "inspect_segment":
        if not beat:
            return envelope(request, "rejected", message="Target beat not found")
        shot = next((item for item in doc.get("shots", []) if item.get("id") == target.get("shotId") or item.get("beatId") == beat.get("id")), None)
        element = next((item for item in beat.get("elements", []) if item.get("id") == target.get("elementId")), None)
        return envelope(request, "ok", data={"beat": beat, "shot": shot, "element": element, "evidence": {"transcript": beat.get("transcript"), "treatmentId": beat.get("treatment", {}).get("id"), "assetIds": [asset.get("id") for asset in beat.get("treatment", {}).get("assets", [])]}})
    if operation == "diagnose_feedback":
        if not beat:
            return envelope(request, "rejected", message="Target beat not found")
        category = request.get("category", "custom")
        start = target.get("startSec", beat.get("startSec", 0))
        end = target.get("endSec", beat.get("startSec", 0) + beat.get("durationSec", 0))
        base = {"id": f"patch-{request.get('projectId')}-{beat.get('id')}-{int(time.time() * 1000)}", "videoId": request.get("projectId"), "baseVersion": doc.get("version", "v001"), "reason": request.get("note") or "Local Composer correction", "affectedRange": {"startSec": start, "endSec": end}, "status": "draft"}
        if category == "too-slow":
            return envelope(request, "ok", diagnosis="Tighten the beat while preserving the transcript.", patch={**base, "operations": [{"op": "updateBeat", "beatId": beat["id"], "changes": {"durationSec": max(1.5, beat.get("durationSec", 1.5) - 0.6)}}]})
        if category == "not-cinematic" and beat.get("treatment", {}).get("id") == "screen-proof-in-world":
            return envelope(request, "ok", diagnosis="Replace the flat proof with a character reflection.", patch={**base, "operations": [{"op": "replaceTreatment", "beatId": beat["id"], "treatmentId": "host-reflection-cinematic", "params": {"subtitle": beat.get("transcript", ""), "lightSide": "left"}}]})
        return envelope(request, "needs_approval", diagnosis="No deterministic local patch is safe for this complaint.", message="Preserve the feedback and request an explicit alternative or rule.")
    if operation in {"apply_patch", "rollback_patch", "promote_feedback_rule", "render_preview_window", "compare_preview"}:
        return envelope(request, "needs_approval", message=f"{operation} requires the project store or render executor.")
    return envelope(request, "rejected", message=f"Unsupported or incomplete operation: {operation}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--edit-doc", type=Path, required=True)
    parser.add_argument("--request", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(dispatch(load(args.edit_doc), load(args.request)), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
