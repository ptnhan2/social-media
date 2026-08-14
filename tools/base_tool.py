"""BaseTool — shared interface for local production tools.
Keeps the ESSENTIAL interface: agent_skills wire, execute(), ToolResult, .env loading."""
from __future__ import annotations
import os, time, subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from enum import Enum


def _load_dotenv() -> None:
    """Load .env from project root into os.environ (once at import)."""
    for env_path in [Path.cwd() / ".env", Path(__file__).resolve().parent.parent / ".env"]:
        if not env_path.is_file():
            continue
        with open(env_path, encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip()
                if value[:1] in ("'", '"'):
                    quote = value[0]
                    end = value.find(quote, 1)
                    value = value[1:end] if end != -1 else value[1:]
                if key and key not in os.environ:
                    os.environ[key] = value


_load_dotenv()


class ToolStatus(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"


@dataclass
class ToolResult:
    success: bool = False
    data: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    artifacts: list[str] = field(default_factory=list)
    cost_usd: float = 0.0
    duration_seconds: float = 0.0
    model: str | None = None


from abc import ABC


class BaseTool(ABC):
    """Every tool inherits this. The agent_skills field is the wire to skills/."""

    # Identity
    name: str = ""
    capability: str = ""
    provider: str = ""

    # THE WIRE: agent reads these skills BEFORE calling execute()
    agent_skills: list[str] = []

    # Metadata
    dependencies: list[str] = []
    install_instructions: str = ""
    fallback_tools: list[str] = []
    capabilities: list[str] = []
    best_for: list[str] = []
    input_schema: dict = {}

    def get_status(self) -> ToolStatus:
        """Override: check if API key / binary available."""
        return ToolStatus.AVAILABLE

    def estimate_cost(self, inputs: dict[str, Any]) -> float:
        return 0.0

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        """Override: do the actual work. Return ToolResult."""
        raise NotImplementedError

    def get_info(self) -> dict[str, Any]:
        """Return metadata for registry — includes agent_skills for the wire."""
        return {
            "name": self.name,
            "capability": self.capability,
            "provider": self.provider,
            "agent_skills": self.agent_skills,
            "status": self.get_status().value,
            "install_instructions": self.install_instructions,
            "fallback_tools": self.fallback_tools,
            "capabilities": self.capabilities,
            "best_for": self.best_for,
        }
