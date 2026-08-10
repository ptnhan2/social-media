"""Diagram generator — Mermaid + D3 charts.
agent_skills = ['beautiful-mermaid', 'd3-viz']"""
from __future__ import annotations
import subprocess, time
from pathlib import Path
from typing import Any
from tools.base_tool import BaseTool, ToolResult, ToolStatus


class DiagramGen(BaseTool):
    name = "diagram_gen"
    capability = "graphics"
    provider = "mermaid"
    agent_skills = ["beautiful-mermaid", "d3-viz"]
    capabilities = ["flowchart", "sequence", "class_diagram", "bar_chart", "line_chart"]

    def get_status(self) -> ToolStatus:
        try:
            subprocess.run(["mmdc", "--version"], capture_output=True, timeout=5)
            return ToolStatus.AVAILABLE
        except Exception:
            return ToolStatus.UNAVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        start = time.time()
        try:
            diagram_type = inputs.get("type", "flowchart")
            content = inputs["content"]  # Mermaid syntax
            output = inputs.get("output_path", "diagram.png")
            format = inputs.get("format", "png")

            # Write mermaid source
            mmd_file = Path(output).with_suffix(".mmd")
            mmd_file.write_text(content, encoding="utf-8")

            # Render via mmdc (mermaid-cli)
            subprocess.run(["mmdc", "-i", str(mmd_file), "-o", output, "-t", "dark",
                          "-w", str(inputs.get("width", 1920))], capture_output=True, timeout=60)
            mmd_file.unlink()

            return ToolResult(success=True, data={"output": output, "type": diagram_type},
                            artifacts=[output], cost_usd=0.0,
                            duration_seconds=round(time.time() - start, 2))
        except Exception as e:
            return ToolResult(success=False, error=f"Diagram gen failed: {e}")
