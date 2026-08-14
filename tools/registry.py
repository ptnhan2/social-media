"""Tool Registry — discovers tools in tools/ and surfaces agent_skills."""
from __future__ import annotations
import importlib, inspect, pkgutil
from pathlib import Path
from typing import Any
from tools.base_tool import BaseTool, ToolStatus


class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, BaseTool] = {}
        self._discovered = False

    def discover(self) -> None:
        """Scan tools/ subdirectories for BaseTool subclasses."""
        if self._discovered:
            return
        import tools
        for importer, modname, ispkg in pkgutil.walk_packages(tools.__path__, prefix="tools."):
            if modname.endswith("__init__"):
                continue
            try:
                module = importlib.import_module(modname)
            except Exception:
                continue
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (isinstance(attr, type) and attr is not BaseTool
                        and issubclass(attr, BaseTool) and attr.name):
                    instance = attr()
                    self._tools[instance.name] = instance
        self._discovered = True

    def get_info(self, tool_name: str) -> dict[str, Any]:
        """Return tool metadata including agent_skills — THE WIRE."""
        self.discover()
        tool = self._tools.get(tool_name)
        if not tool:
            return {"name": tool_name, "available": False}
        return tool.get_info()

    def get_by_capability(self, capability: str) -> list[BaseTool]:
        self.discover()
        return [t for t in self._tools.values() if t.capability == capability]

    def provider_menu_summary(self) -> dict[str, Any]:
        """Human-ready rollup: capability → configured/total."""
        self.discover()
        from collections import defaultdict
        by_cap = defaultdict(list)
        for t in self._tools.values():
            by_cap[t.capability].append(t)
        caps = {}
        for cap, tools in by_cap.items():
            configured = sum(1 for t in tools if t.get_status() == ToolStatus.AVAILABLE)
            caps[cap] = {
                "configured": configured,
                "total": len(tools),
                "providers": [t.provider for t in tools],
            }
        return {"capabilities": caps}

    def execute(self, tool_name: str, inputs: dict[str, Any]):
        """Execute a tool by name. Agent should read agent_skills first."""
        self.discover()
        tool = self._tools.get(tool_name)
        if not tool:
            from tools.base_tool import ToolResult
            return ToolResult(success=False, error=f"Tool '{tool_name}' not found")
        return tool.execute(inputs)


# Singleton
registry = ToolRegistry()
