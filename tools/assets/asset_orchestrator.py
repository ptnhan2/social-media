"""Plan and resolve assets for semantic treatments.

This tool is deliberately provider-neutral. Providers may generate/capture assets,
but every result is normalized into the same manifest with provenance and QA state.
"""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from tools.base_tool import BaseTool, ToolResult, ToolStatus


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class AssetOrchestrator(BaseTool):
    name = "asset_orchestrator"
    capability = "asset_orchestration"
    provider = "local-manifest"
    agent_skills = ["media-use", "video-download", "video-edit"]
    capabilities = ["plan asset slots", "resolve local files", "record provenance", "validate manifest"]
    best_for = ["semantic treatment asset resolution", "agent-generated project manifests"]
    input_schema = {
        "operation": "plan | resolve_local | execute_provider",
        "video_id": "string",
        "manifest_path": "string",
        "requests": "array of {id, kind, role, description, required, src?}",
        "provider_tool": "string (execute_provider)",
        "provider_inputs": "object (execute_provider)",
        "skills_read": "boolean (execute_provider)",
    }

    def get_status(self) -> ToolStatus:
        return ToolStatus.AVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        operation = inputs.get("operation", "plan")
        video_id = str(inputs.get("video_id", "")).strip()
        manifest_path = Path(str(inputs.get("manifest_path", "")))
        requests = inputs.get("requests", [])
        if not video_id:
            return ToolResult(success=False, error="video_id is required")
        if not manifest_path:
            return ToolResult(success=False, error="manifest_path is required")
        if not isinstance(requests, list):
            return ToolResult(success=False, error="requests must be an array")

        try:
            if operation == "plan":
                manifest = self._plan(video_id, requests)
            elif operation == "resolve_local":
                manifest = self._resolve_local(video_id, requests)
            elif operation == "execute_provider":
                manifest = self._execute_provider(video_id, requests, inputs)
            else:
                return ToolResult(success=False, error=f"unsupported operation: {operation}")
            manifest_path.parent.mkdir(parents=True, exist_ok=True)
            manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
            return ToolResult(success=True, data=manifest, artifacts=[str(manifest_path)])
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))

    def _plan(self, video_id: str, requests: list[Any]) -> dict[str, Any]:
        entries = []
        for request in requests:
            if not isinstance(request, dict):
                raise ValueError("each asset request must be an object")
            asset_id = str(request.get("id", "")).strip()
            if not asset_id:
                raise ValueError("asset request id is required")
            entries.append({
                "id": asset_id,
                "kind": request.get("kind", "image"),
                "src": request.get("src"),
                "status": "planned",
                "description": request.get("description", ""),
                "provenance": {
                    "provider": request.get("provider"),
                    "sourceUrl": request.get("sourceUrl"),
                    "prompt": request.get("prompt"),
                },
                "usedBy": request.get("usedBy", []),
                "qa": {"passed": False, "checks": []},
            })
        return {"videoId": video_id, "entries": entries, "updatedAt": now_iso()}

    def _resolve_local(self, video_id: str, requests: list[Any]) -> dict[str, Any]:
        manifest = self._plan(video_id, requests)
        for entry in manifest["entries"]:
            src = entry.get("src")
            if not src or str(src).startswith(("http://", "https://")):
                continue
            path = Path(str(src))
            if not path.is_file():
                entry["status"] = "failed"
                entry["qa"] = {"passed": False, "checks": ["local_file_exists"], "failures": ["file_not_found"]}
                continue
            entry["status"] = "ready"
            entry["provenance"]["provider"] = entry["provenance"].get("provider") or "local"
            entry["provenance"]["sourceUrl"] = entry["provenance"].get("sourceUrl") or str(path.resolve())
            entry["qa"] = {"passed": True, "checks": ["local_file_exists"], "failures": []}
        return manifest

    def _execute_provider(self, video_id: str, requests: list[Any], inputs: dict[str, Any]) -> dict[str, Any]:
        """Execute one configured provider tool and normalize its artifact result."""
        from tools.registry import registry

        tool_name = str(inputs.get("provider_tool", "")).strip()
        if not tool_name:
            raise ValueError("provider_tool is required")
        info = registry.get_info(tool_name)
        if info.get("available") is False or info.get("status") not in (None, "available"):
            return {
                "videoId": video_id,
                "entries": self._plan(video_id, requests)["entries"],
                "updatedAt": now_iso(),
                "providerError": {"tool": tool_name, "requiredSkills": info.get("agent_skills", []), "error": "tool unavailable"},
            }
        if inputs.get("skills_read") is not True:
            raise ValueError(f"read agent_skills before executing {tool_name}: {info.get('agent_skills', [])}")
        result = registry.execute(tool_name, inputs.get("provider_inputs", {}))
        manifest = self._plan(video_id, requests)
        if not result.success:
            for entry in manifest["entries"]:
                entry["status"] = "failed"
                entry["qa"] = {"passed": False, "checks": [], "failures": [result.error or "provider_failed"]}
            return manifest
        artifacts = result.artifacts
        for entry in manifest["entries"]:
            entry["status"] = "ready" if artifacts else "failed"
            entry["provenance"]["provider"] = tool_name
            entry["provenance"]["generatedAt"] = now_iso()
            entry["qa"] = {"passed": bool(artifacts), "checks": ["provider_success"], "failures": [] if artifacts else ["provider_returned_no_artifact"]}
        manifest["providerArtifacts"] = artifacts
        return manifest
