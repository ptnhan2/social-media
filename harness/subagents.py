"""Critic subagent — delegates visual analysis to VLM.

Returns structured CritiqueResult (typed scores) via response_format.
"""

from pydantic import BaseModel, Field
from deepagents import SubAgent
from tools import visual_critique


class CritiqueResult(BaseModel):
    """Structured critique from the VLM critic subagent."""
    composition_score: int = Field(description="1-5, layout and focal point quality")
    color_score: int = Field(description="1-5, harmony, contrast, temperature")
    motion_score: int = Field(description="1-5, purposeful animation, smoothness")
    text_score: int = Field(description="1-5, readability, hierarchy, occlusion")
    pacing_score: int = Field(description="1-5, rhythm, breathing room, flow")
    top_issue: str = Field(description="The single most impactful improvement")
    suggestions: list[str] = Field(description="Specific actionable suggestions")


CRITIC_SUBAGENT: SubAgent = {
    "name": "critic",
    "description": (
        "Visual critic — analyzes rendered videos using a VLM. "
        "Returns structured scores for composition, color, motion, text, pacing. "
        "Use AFTER rendering to evaluate quality. "
        "Pass the video path in the description."
    ),
    "system_prompt": """\
You are a visual critic. You analyze rendered videos using a VLM (GLM-4V-Flash).

CRITICAL: You MUST call the visual_critique tool. Do NOT use read_file on .mp4 files.

1. Call visual_critique(video_path=<path from description>, aspect="all")
2. Parse the scores and feedback from the result
3. Return a CritiqueResult with scores (1-5) for each aspect, the top issue, and suggestions

Scoring: 1-2 = unacceptable, 3 = adequate, 4-5 = good to excellent.
The video path may start with /workspace/ — pass it as-is to visual_critique.
""",
    "tools": [visual_critique],
    "response_format": CritiqueResult,
}
