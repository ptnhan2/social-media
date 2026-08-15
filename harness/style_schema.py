"""JSON Schema validation for the style store.

Validates structure, types, ranges, and enums for all style knobs.
Used by update_style and GovernedBackend to ensure style changes are valid
before persisting.
"""

from __future__ import annotations

import json
from typing import Any

# JSON Schema for the style store
STYLE_SCHEMA: dict[str, Any] = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["version", "treatments"],
    "properties": {
        "version": {"type": "integer", "minimum": 1},
        "seed": {"type": "string"},
        "status": {"type": "string"},
        "colors": {
            "type": "object",
            "additionalProperties": {"type": "string"},
        },
        "treatments": {
            "type": "object",
            "properties": {
                "semantic-diagram": {
                    "type": "object",
                    "properties": {
                        "edge": {
                            "type": "object",
                            "properties": {
                                "stroke": {
                                    "type": "object",
                                    "properties": {
                                        "mode": {"type": "string", "enum": ["solid", "gradient", "brush"]},
                                        "color": {"type": "string"},
                                        "width": {"type": "number", "minimum": 0.5, "maximum": 10},
                                        "linecap": {"type": "string", "enum": ["round", "butt", "square"]},
                                        "gradientStops": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                            "minItems": 2,
                                            "maxItems": 4,
                                        },
                                        "brushDasharray": {"type": "string"},
                                    },
                                },
                                "revealDurationSec": {"type": "number", "minimum": 0.1, "maximum": 5.0},
                            },
                        },
                        "node": {
                            "type": "object",
                            "properties": {
                                "borderWidth": {"type": "number", "minimum": 0, "maximum": 10},
                                "borderRadius": {"type": "number", "minimum": 0, "maximum": 50},
                                "background": {"type": "string"},
                                "fontSize": {"type": "number", "minimum": 8, "maximum": 60},
                                "detailFontSize": {"type": "number", "minimum": 8, "maximum": 40},
                            },
                        },
                        "title": {
                            "type": "object",
                            "properties": {
                                "fontSize": {"type": "number", "minimum": 10, "maximum": 100},
                                "fontWeight": {"type": "number", "minimum": 100, "maximum": 900},
                                "letterSpacing": {"type": "string"},
                            },
                        },
                        "kicker": {
                            "type": "object",
                            "properties": {
                                "fontSize": {"type": "number", "minimum": 8, "maximum": 40},
                                "fontWeight": {"type": "number", "minimum": 100, "maximum": 900},
                                "letterSpacing": {"type": "string"},
                            },
                        },
                        "entrance": {
                            "type": "object",
                            "properties": {
                                "damping": {"type": "number", "minimum": 1, "maximum": 100},
                                "stiffness": {"type": "number", "minimum": 1, "maximum": 1000},
                                "mass": {"type": "number", "minimum": 0.1, "maximum": 10},
                                "durationSec": {"type": "number", "minimum": 0.1, "maximum": 5.0},
                            },
                        },
                    },
                },
                "chapter-card": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "object",
                            "properties": {
                                "fontSizeLong": {"type": "number", "minimum": 30, "maximum": 200},
                                "fontSizeShort": {"type": "number", "minimum": 30, "maximum": 200},
                                "lineHeight": {"type": "number", "minimum": 0.5, "maximum": 3.0},
                                "fontWeight": {"type": "number", "minimum": 100, "maximum": 900},
                            },
                        },
                        "accentLine": {
                            "type": "object",
                            "properties": {
                                "height": {"type": "number", "minimum": 1, "maximum": 30},
                                "maxWidth": {"type": "number", "minimum": 10, "maximum": 500},
                            },
                        },
                        "reveal": {
                            "type": "object",
                            "properties": {
                                "inDurationSec": {"type": "number", "minimum": 0.1, "maximum": 5.0},
                                "lineStartSec": {"type": "number", "minimum": 0, "maximum": 10},
                                "lineEndSec": {"type": "number", "minimum": 0, "maximum": 10},
                            },
                        },
                    },
                },
                "host-reflection": {
                    "type": "object",
                    "properties": {
                        "filter": {"type": "string"},
                        "pushStart": {"type": "number", "minimum": 1.0, "maximum": 1.5},
                        "pushDurationSec": {"type": "number", "minimum": 0.5, "maximum": 20},
                        "entranceDurationSec": {"type": "number", "minimum": 0.1, "maximum": 5.0},
                        "letterboxTopPct": {"type": "number", "minimum": 0, "maximum": 50},
                        "letterboxBottomPct": {"type": "number", "minimum": 0, "maximum": 50},
                        "subtitle": {
                            "type": "object",
                            "properties": {
                                "fontFamily": {"type": "string"},
                                "fontStyle": {"type": "string", "enum": ["normal", "italic", "oblique"]},
                                "fontSize": {"type": "number", "minimum": 10, "maximum": 60},
                            },
                        },
                    },
                },
                "screen-proof": {
                    "type": "object",
                    "properties": {
                        "cameraStart": {"type": "number", "minimum": 1.0, "maximum": 1.5},
                        "cameraDurationSec": {"type": "number", "minimum": 0.5, "maximum": 20},
                        "entranceDurationSec": {"type": "number", "minimum": 0.1, "maximum": 5.0},
                        "focusStartSec": {"type": "number", "minimum": 0, "maximum": 10},
                        "focusEndSec": {"type": "number", "minimum": 0, "maximum": 10},
                    },
                },
                "audience-demand": {
                    "type": "object",
                    "properties": {
                        "contextInStartSec": {"type": "number", "minimum": 0, "maximum": 30},
                        "contextInEndSec": {"type": "number", "minimum": 0, "maximum": 30},
                        "responseInStartSec": {"type": "number", "minimum": 0, "maximum": 30},
                        "responseInEndSec": {"type": "number", "minimum": 0, "maximum": 30},
                    },
                },
                "process-timeline": {
                    "type": "object",
                    "properties": {
                        "titleInDurationSec": {"type": "number", "minimum": 0.1, "maximum": 5.0},
                        "progressStartSec": {"type": "number", "minimum": 0, "maximum": 10},
                        "progressEndSec": {"type": "number", "minimum": 0, "maximum": 10},
                    },
                },
                "candidate-comparison": {
                    "type": "object",
                    "properties": {
                        "titleInDurationSec": {"type": "number", "minimum": 0.1, "maximum": 5.0},
                        "candidateStaggerSec": {"type": "number", "minimum": 0, "maximum": 5},
                    },
                },
                "cinematic-metaphor": {
                    "type": "object",
                    "properties": {
                        "entranceDurationSec": {"type": "number", "minimum": 0.1, "maximum": 5.0},
                        "pushStart": {"type": "number", "minimum": 1.0, "maximum": 1.5},
                        "pushDurationSec": {"type": "number", "minimum": 0.5, "maximum": 20},
                    },
                },
            },
        },
    },
}


def validate_style_schema(style: dict) -> tuple[bool, str]:
    """Validate a style dict against the schema.

    Returns (valid, error_message). If valid, error_message is empty.
    Uses jsonschema if available, otherwise does manual checks.
    """
    try:
        import jsonschema
        jsonschema.validate(instance=style, schema=STYLE_SCHEMA)
        return True, ""
    except ImportError:
        # Fallback: manual validation (basic checks)
        return _manual_validate(style)
    except jsonschema.ValidationError as e:
        path = ".".join(str(p) for p in e.absolute_path) if e.absolute_path else "(root)"
        return False, f"Schema validation failed at '{path}': {e.message}"


def _manual_validate(style: dict) -> tuple[bool, str]:
    """Manual validation fallback when jsonschema is not installed."""
    if not isinstance(style, dict):
        return False, "Style must be a JSON object"
    if "version" not in style:
        return False, "Missing 'version' key"
    if not isinstance(style["version"], int) or style["version"] < 1:
        return False, "'version' must be a positive integer"
    if "treatments" not in style:
        return False, "Missing 'treatments' key"
    if not isinstance(style["treatments"], dict):
        return False, "'treatments' must be an object"

    # Check edge.stroke.mode enum
    treatments = style["treatments"]
    sd = treatments.get("semantic-diagram", {})
    edge = sd.get("edge", {})
    stroke = edge.get("stroke", {})
    mode = stroke.get("mode")
    if mode and mode not in ("solid", "gradient", "brush"):
        return False, f"edge.stroke.mode must be 'solid', 'gradient', or 'brush', got '{mode}'"

    # Check numeric ranges
    width = stroke.get("width")
    if width is not None and (not isinstance(width, (int, float)) or width < 0.5 or width > 10):
        return False, f"edge.stroke.width must be 0.5-10, got {width}"

    reveal = edge.get("revealDurationSec")
    if reveal is not None and (not isinstance(reveal, (int, float)) or reveal < 0.1 or reveal > 5.0):
        return False, f"edge.revealDurationSec must be 0.1-5.0, got {reveal}"

    cc = treatments.get("chapter-card", {})
    title = cc.get("title", {})
    for field in ("fontSizeShort", "fontSizeLong"):
        val = title.get(field)
        if val is not None and (not isinstance(val, (int, float)) or val < 30 or val > 200):
            return False, f"chapter-card.title.{field} must be 30-200, got {val}"

    hr = treatments.get("host-reflection", {})
    ltp = hr.get("letterboxTopPct")
    if ltp is not None and (not isinstance(ltp, (int, float)) or ltp < 0 or ltp > 50):
        return False, f"host-reflection.letterboxTopPct must be 0-50, got {ltp}"

    return True, ""
