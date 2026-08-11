"""Small JSON project checkpoint CLI used by the produce/check/resume workflow."""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any


REQUIRED_DIRS = ("edit/versions", "feedback", "patches", "qa", "renders/windows", "assets", "thumbnail", "dubbing", "publish")
REQUIRED_FILES = ("00-state.json", "04-video-doc.json", "05-edit-doc.json")
SAFE_ID = re.compile(r"^[A-Za-z0-9._-]+$")


def atomic_write(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(prefix=f"{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, indent=2)
            stream.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def project_path(value: str) -> Path:
    path = Path(value).resolve()
    if not SAFE_ID.fullmatch(path.name):
        raise ValueError(f"Unsafe project identifier: {path.name}")
    return path


def scaffold(project: Path) -> dict[str, Any]:
    project.mkdir(parents=True, exist_ok=True)
    for relative in REQUIRED_DIRS:
        (project / relative).mkdir(parents=True, exist_ok=True)
    state_path = project / "00-state.json"
    if not state_path.exists():
        state = {
            "projectId": project.name,
            "pipelineVersion": "2026-08-11-isaacverse-v1",
            "stage": "scaffold",
            "status": "in_progress",
            "completedStages": [],
            "currentVersion": "v000",
            "nextAction": "Create the source VideoDoc and EditDoc.",
        }
        atomic_write(state_path, state)
    return json.loads(state_path.read_text(encoding="utf-8"))


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def check(project: Path) -> dict[str, Any]:
    state = scaffold(project)
    missing = [name for name in REQUIRED_FILES if not (project / name).exists()]
    malformed: list[str] = []
    for relative in REQUIRED_FILES:
        target = project / relative
        if target.exists():
            try:
                load_json(target)
            except json.JSONDecodeError:
                malformed.append(relative)
    result = {
        "projectId": project.name,
        "status": "fail" if missing or malformed else "pass",
        "currentVersion": state.get("currentVersion", "v000"),
        "missing": missing,
        "malformed": malformed,
        "nextAction": state.get("nextAction"),
    }
    return result


def checkpoint(project: Path, stage: str, status: str, next_action: str) -> dict[str, Any]:
    state = scaffold(project)
    completed = list(state.get("completedStages", []))
    if status == "complete" and stage not in completed:
        completed.append(stage)
    state.update({"stage": stage, "status": status, "completedStages": completed, "nextAction": next_action})
    atomic_write(project / "00-state.json", state)
    return state


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("scaffold", "check", "resume", "checkpoint"))
    parser.add_argument("--project", required=True, type=project_path)
    parser.add_argument("--stage")
    parser.add_argument("--status", default="in_progress")
    parser.add_argument("--next-action", default="Continue at the next incomplete pipeline stage.")
    args = parser.parse_args()

    if args.command == "scaffold": result = scaffold(args.project)
    elif args.command == "check": result = check(args.project)
    elif args.command == "resume":
        result = {"state": scaffold(args.project), "check": check(args.project)}
    else:
        if not args.stage: parser.error("--stage is required for checkpoint")
        result = checkpoint(args.project, args.stage, args.status, args.next_action)
    print(json.dumps(result, indent=2))
    if args.command == "check" and result["status"] == "fail": return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
