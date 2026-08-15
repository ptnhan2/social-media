"""Critic subagent — delegates visual analysis to VLM.

The parent agent cannot see video (DeepSeek is text-only).
It delegates to this subagent via the `task` tool.
The subagent calls visual_critique (GLM-4V-Flash) and returns findings.
"""

from deepagents import SubAgent
from tools import visual_critique

CRITIC_SUBAGENT: SubAgent = {
    "name": "critic",
    "description": (
        "Visual critic — analyzes rendered videos using a VLM. "
        "Returns scores for composition, color, motion, text, pacing. "
        "Use AFTER rendering to evaluate quality. "
        "Pass the video path in the description."
    ),
    "system_prompt": """\
You are a visual critic. You analyze rendered videos using a VLM (GLM-4V-Flash).

CRITICAL: You MUST call the visual_critique tool. Do NOT use read_file on .mp4 files.

1. Call visual_critique(video_path=<path from description>, aspect="all")
2. Parse the scores and feedback from the result
3. Return a summary with scores (1-5) for each aspect and the top issue

Scoring: 1-2 = unacceptable, 3 = adequate, 4-5 = good to excellent.
The video path may start with /workspace/ — pass it as-is to visual_critique.
""",
    "tools": [visual_critique],
}
