"""Health check + logging utilities for the harness.

Provides:
- Health check endpoint (/health) for Docker/kubernetes
- Structured logging via structlog (if installed) or stdlib fallback
- Request/response logging for tool calls
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "harness", "logs")


def setup_logging():
    """Configure logging with structlog if available, else stdlib."""
    try:
        import structlog
        structlog.configure(
            processors=[
                structlog.stdlib.add_log_level,
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.dev.ConsoleRenderer(),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            logger_factory=structlog.stdlib.LoggerFactory(),
        )
        return structlog.get_logger("harness")
    except ImportError:
        import logging
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            stream=sys.stdout,
        )
        return logging.getLogger("harness")


def log_tool_call(tool_name: str, args: dict, result: str, duration_sec: float):
    """Log a tool call to the tool call log."""
    os.makedirs(LOG_DIR, exist_ok=True)
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tool": tool_name,
        "args": args,
        "result_length": len(result) if result else 0,
        "result_preview": (result or "")[:200],
        "duration_sec": round(duration_sec, 3),
    }
    with open(os.path.join(LOG_DIR, "tool_calls.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False, default=str) + "\n")


def health_check() -> dict:
    """Return health status for the harness."""
    style_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "libraries", "04-visual", "isaacverse-style.json"
    )
    store_file = os.path.join(LOG_DIR, "store.json")

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "style_store": os.path.exists(style_file),
            "persistent_store": os.path.exists(store_file),
            "logs_dir": os.path.exists(LOG_DIR),
            "deepseek_key": bool(os.environ.get("DEEPSEEK_API_KEY")),
            "vlm_key": bool(
                os.environ.get("ZHIPU_API_KEY") or
                os.environ.get("GOOGLE_API_KEY") or
                os.environ.get("OPENAI_API_KEY") or
                os.environ.get("OPENROUTER_API_KEY")
            ),
        },
    }


if __name__ == "__main__":
    print(json.dumps(health_check(), indent=2))
