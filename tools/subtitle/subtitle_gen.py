"""Subtitle generator — creates SRT from text + timing.
agent_skills = ['remotion-best-practices']"""
from __future__ import annotations
import time
from pathlib import Path
from typing import Any
from tools.base_tool import BaseTool, ToolResult, ToolStatus


class SubtitleGen(BaseTool):
    name = "subtitle_gen"
    capability = "subtitle"
    provider = "internal"
    agent_skills = ["remotion-best-practices"]
    capabilities = ["srt", "vtt", "burn"]

    def get_status(self) -> ToolStatus:
        return ToolStatus.AVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        start = time.time()
        try:
            segments = inputs["segments"]  # [{start, end, text}, ...]
            fmt = inputs.get("format", "srt")
            output = Path(inputs.get("output_path", "subtitles.srt"))
            output.parent.mkdir(parents=True, exist_ok=True)
            with open(output, "w", encoding="utf-8") as f:
                for i, seg in enumerate(segments, 1):
                    if fmt == "srt":
                        f.write(f"{i}\n{_srt_time(seg['start'])} --> {_srt_time(seg['end'])}\n{seg['text']}\n\n")
                    elif fmt == "vtt":
                        if i == 1:
                            f.write("WEBVTT\n\n")
                        f.write(f"{_vtt_time(seg['start'])} --> {_vtt_time(seg['end'])}\n{seg['text']}\n\n")
            return ToolResult(success=True, data={"output": str(output), "segments": len(segments)},
                            artifacts=[str(output)], cost_usd=0.0,
                            duration_seconds=round(time.time() - start, 2))
        except Exception as e:
            return ToolResult(success=False, error=f"Subtitle gen failed: {e}")


def _srt_time(t: float) -> str:
    h, m = int(t // 3600), int((t % 3600) // 60)
    s, ms = int(t % 60), int((t % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _vtt_time(t: float) -> str:
    h, m = int(t // 3600), int((t % 3600) // 60)
    s, ms = int(t % 60), int((t % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
