"""Subagent definitions for the harness agent.

Each subagent is a scoped expert with its own tools and system prompt.
The parent agent delegates via the `task` tool.
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from deepagents import SubAgent

from visual_critique import visual_critique


class CritiqueResult(BaseModel):
    """Structured critique from the VLM critic subagent."""
    composition_score: int = Field(description="1-5, layout and focal point quality")
    color_score: int = Field(description="1-5, harmony, contrast, temperature")
    motion_score: int = Field(description="1-5, purposeful animation, smoothness")
    text_score: int = Field(description="1-5, readability, hierarchy, occlusion")
    pacing_score: int = Field(description="1-5, rhythm, breathing room, flow")
    top_issue: str = Field(description="The single most impactful improvement")
    suggestions: list[str] = Field(description="Specific actionable suggestions")


CRITIC_SYSTEM_PROMPT = """\
You are the visual critic subagent. You analyze rendered videos using a VLM (vision language model).

## CRITICAL: You MUST call the visual_critique tool

You CANNOT see video — your model is text-only. Do NOT use read_file on .mp4 files.
The ONLY way to analyze a video is to call the `visual_critique` tool with the video path.

## Your job

1. Receive a video path from the parent agent (in the task description).
2. Call visual_critique(video_path=<the path>, aspect="all") to get VLM analysis.
3. Parse the VLM's scores and feedback from the tool result.
4. Return a structured CritiqueResult with scores (1-5) for each aspect, the top issue, and suggestions.

## Scoring guide

- 1-2: Unacceptable — missing or broken (no motion, unreadable text, black frames)
- 3: Adequate but flat — functional, no depth or variation
- 4-5: Good to excellent — purposeful, polished, narrative-driven

## Rules

- ALWAYS call visual_critique FIRST. Do not try any other approach.
- Be honest in scoring. Don't inflate scores to please the parent.
- The top_issue should be the single change with the highest impact.
- Suggestions should be specific (name the style knob or element, not vague advice).
- The video path may start with /workspace/ — pass it as-is to visual_critique.
"""


CRITIC_SUBAGENT: SubAgent = {
    "name": "critic",
    "description": (
        "Visual critic — analyzes rendered videos using a VLM (GLM-4V-Flash). "
        "Returns structured critique with scores for composition, color, motion, text, pacing. "
        "Use this AFTER rendering to evaluate visual quality. "
        "Pass the video path in the description."
    ),
    "system_prompt": CRITIC_SYSTEM_PROMPT,
    "tools": [visual_critique],
    "response_format": CritiqueResult,
}

# All subagents — passed to create_deep_agent(subagents=...)
ALL_SUBAGENTS = [CRITIC_SUBAGENT]
