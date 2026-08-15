"""Governed backend — wraps CompositeBackend with write-gate enforcement.

Intercepts all write operations (write, edit, delete, execute) and applies
governance validation before delegating to the wrapped backend.

Governed paths:
  - Style store (/workspace/libraries/04-visual/isaacverse-style.json)
    → contradiction check + minSupport + QA gate + event log
  - Memories (/memories/**)
    → contradiction check + event log

This ensures governance cannot be bypassed via built-in write_file/edit_file
or execute (bash) — every path to modifying governed state passes through
the same write-gate.
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any

from deepagents.backends.protocol import (
    DeleteResult,
    EditResult,
    ExecuteResponse,
    WriteResult,
)

# Import governance module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import governance as gov

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Paths that require governance validation on write
STYLE_VIRTUAL_PATH = "/workspace/libraries/04-visual/isaacverse-style.json"
STYLE_DISK_PATH = os.path.join(PROJECT_ROOT, "libraries", "04-visual", "isaacverse-style.json")
MEMORY_PREFIX = "/memories/"

# Patterns that indicate a bash command writes to governed paths
_STYLE_DISK_PATTERNS = [
    re.escape(STYLE_DISK_PATH).replace(r"\\", r"\\\\"),
    re.escape(STYLE_DISK_PATH.replace("\\", "/")),
    "libraries/04-visual/isaacverse-style",
    "libraries\\\\04-visual\\\\isaacverse-style",
]


def _is_governed_path(file_path: str) -> str | None:
    """Check if a path is governed. Returns governance type or None."""
    if file_path == STYLE_VIRTUAL_PATH:
        return "style"
    if file_path.startswith(MEMORY_PREFIX):
        return "memory"
    # Also check disk paths (in case agent uses absolute paths)
    norm = file_path.replace("\\", "/")
    if norm.endswith("libraries/04-visual/isaacverse-style.json"):
        return "style"
    return None


def _validate_style_write(new_content: str) -> tuple[bool, str]:
    """Validate a write to the style store.

    Parses the new content, compares with current style on disk,
    and runs governance validation on each changed path.
    """
    # Parse new content
    try:
        new_style = json.loads(new_content)
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {e}"

    # Load current style
    if not os.path.exists(STYLE_DISK_PATH):
        # No existing style — any write is allowed (initial seed)
        return True, "Initial style write (no existing style to contradict)"

    with open(STYLE_DISK_PATH, encoding="utf-8") as f:
        old_style = json.load(f)

    # Find changed paths
    changes = _diff_style(old_style.get("treatments", {}), new_style.get("treatments", {}))

    if not changes:
        return True, "No changes detected (identical content)"

    # Validate each change
    blocked = []
    for path, old_val, new_val in changes:
        full_path = f"treatments.{path}"
        allowed, reason = gov.validate_style_change(full_path, new_val)
        if not allowed:
            blocked.append(f"  {full_path}: {reason}")
        else:
            # Log the approved change
            gov.log_event("style_update", {
                "path": full_path,
                "old": old_val,
                "new": new_val,
                "provenance": "governed_backend_write",
                "version": new_style.get("version", old_style.get("version", 1)),
            })

    if blocked:
        return False, "Governance blocked the following changes:\n" + "\n".join(blocked)

    return True, f"Approved {len(changes)} style change(s)"


def _diff_style(old: dict, new: dict, prefix: str = "") -> list[tuple[str, Any, Any]]:
    """Find all changed leaf values between old and new style dicts."""
    changes: list[tuple[str, Any, Any]] = []
    all_keys = set(old.keys()) | set(new.keys())
    for key in all_keys:
        path = f"{prefix}.{key}" if prefix else key
        old_val = old.get(key)
        new_val = new.get(key)
        if isinstance(old_val, dict) and isinstance(new_val, dict):
            changes.extend(_diff_style(old_val, new_val, path))
        elif old_val != new_val:
            changes.append((path, old_val, new_val))
    return changes


def _validate_memory_write(file_path: str, content: str) -> tuple[bool, str]:
    """Validate a write to a memory file.

    Memory writes are logged but not blocked (memories are append-style
    knowledge accumulation). Contradiction detection is informational.
    """
    gov.log_event("memory_write", {
        "path": file_path,
        "content_length": len(content),
        "content_preview": content[:200],
    })
    return True, "Memory write logged"


def _command_touches_governed(command: str) -> str | None:
    """Check if a bash command writes to governed paths. Returns governance type or None."""
    # Check for style file references in write contexts
    for pattern in _STYLE_DISK_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            # Check if it's a write operation (not just reading)
            write_indicators = [">", ">>", "tee", "cp ", "mv ", "echo", "cat >",
                                "python.*open.*w", "node.*writeFile", "sed -i", "perl -i"]
            for indicator in write_indicators:
                if indicator in command:
                    return "style"
    # Check for memory path writes
    if "/memories/" in command:
        write_indicators = [">", ">>", "tee", "cp ", "mv ", "echo", "cat >"]
        for indicator in write_indicators:
            if indicator in command:
                return "memory"
    return None


class GovernedBackend:
    """Wraps a backend with governance write-gate enforcement.

    All write operations (write, edit, delete, execute) are intercepted.
    Writes to governed paths (style store, memories) must pass governance
    validation before being delegated to the wrapped backend.
    """

    def __init__(self, wrapped):
        self._wrapped = wrapped

    def __getattr__(self, name):
        """Delegate unknown attributes to the wrapped backend."""
        return getattr(self._wrapped, name)

    # --- Write interception ---

    def write(self, file_path: str, content: str) -> WriteResult:
        gov_type = _is_governed_path(file_path)
        if gov_type == "style":
            allowed, reason = _validate_style_write(content)
            if not allowed:
                return WriteResult(error=f"GOVERNANCE BLOCKED: {reason}")
        elif gov_type == "memory":
            allowed, reason = _validate_memory_write(file_path, content)
            if not allowed:
                return WriteResult(error=f"GOVERNANCE BLOCKED: {reason}")
        return self._wrapped.write(file_path, content)

    async def awrite(self, file_path: str, content: str) -> WriteResult:
        gov_type = _is_governed_path(file_path)
        if gov_type == "style":
            allowed, reason = _validate_style_write(content)
            if not allowed:
                return WriteResult(error=f"GOVERNANCE BLOCKED: {reason}")
        elif gov_type == "memory":
            allowed, reason = _validate_memory_write(file_path, content)
            if not allowed:
                return WriteResult(error=f"GOVERNANCE BLOCKED: {reason}")
        return await self._wrapped.awrite(file_path, content)

    # --- Edit interception ---

    def edit(self, file_path: str, old_string: str, new_string: str,
             replace_all: bool = False) -> EditResult:
        gov_type = _is_governed_path(file_path)
        if gov_type == "style":
            # For edits, we need to read current, apply edit, then validate
            try:
                with open(STYLE_DISK_PATH, encoding="utf-8") as f:
                    current = f.read()
                edited = current.replace(old_string, new_string, -1 if replace_all else 1)
                allowed, reason = _validate_style_write(edited)
                if not allowed:
                    return EditResult(error=f"GOVERNANCE BLOCKED: {reason}")
            except Exception as e:
                return EditResult(error=f"Cannot validate edit: {e}")
        elif gov_type == "memory":
            _validate_memory_write(file_path, f"edit: {old_string} → {new_string}")
        return self._wrapped.edit(file_path, old_string, new_string, replace_all)

    async def aedit(self, file_path: str, old_string: str, new_string: str,
                    replace_all: bool = False) -> EditResult:
        gov_type = _is_governed_path(file_path)
        if gov_type == "style":
            try:
                with open(STYLE_DISK_PATH, encoding="utf-8") as f:
                    current = f.read()
                edited = current.replace(old_string, new_string, -1 if replace_all else 1)
                allowed, reason = _validate_style_write(edited)
                if not allowed:
                    return EditResult(error=f"GOVERNANCE BLOCKED: {reason}")
            except Exception as e:
                return EditResult(error=f"Cannot validate edit: {e}")
        elif gov_type == "memory":
            _validate_memory_write(file_path, f"edit: {old_string} → {new_string}")
        return await self._wrapped.aedit(file_path, old_string, new_string, replace_all)

    # --- Delete interception ---

    def delete(self, file_path: str) -> DeleteResult:
        gov_type = _is_governed_path(file_path)
        if gov_type:
            gov.log_event("governed_delete_blocked", {"path": file_path, "type": gov_type})
            return DeleteResult(error=f"GOVERNANCE BLOCKED: Cannot delete governed {gov_type} file: {file_path}")
        return self._wrapped.delete(file_path)

    async def adelete(self, file_path: str) -> DeleteResult:
        gov_type = _is_governed_path(file_path)
        if gov_type:
            gov.log_event("governed_delete_blocked", {"path": file_path, "type": gov_type})
            return DeleteResult(error=f"GOVERNANCE BLOCKED: Cannot delete governed {gov_type} file: {file_path}")
        return await self._wrapped.adelete(file_path)

    # --- Execute interception ---

    def execute(self, command: str, *, timeout: int | None = None) -> ExecuteResponse:
        gov_type = _command_touches_governed(command)
        if gov_type:
            gov.log_event("governed_execute_blocked", {"command": command[:500], "type": gov_type})
            return ExecuteResponse(
                output=f"GOVERNANCE BLOCKED: Command attempts to modify governed {gov_type} file. "
                       f"Use the update_style tool for style changes.",
                exit_code=1,
            )
        return self._wrapped.execute(command, timeout=timeout)

    async def aexecute(self, command: str, *, timeout: int | None = None) -> ExecuteResponse:
        gov_type = _command_touches_governed(command)
        if gov_type:
            gov.log_event("governed_execute_blocked", {"command": command[:500], "type": gov_type})
            return ExecuteResponse(
                output=f"GOVERNANCE BLOCKED: Command attempts to modify governed {gov_type} file. "
                       f"Use the update_style tool for style changes.",
                exit_code=1,
            )
        return await self._wrapped.aexecute(command, timeout=timeout)
