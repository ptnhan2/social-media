"""Critic subagent — delegates visual analysis to VLM.

Returns structured CritiqueResult (typed scores) via response_format.
"""

from pydantic import BaseModel, Field
from deepagents import SubAgent
from harness_tools import editor_op, copy_render, qa_gate, render_window, request_keep, visual_critique


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


CLIP_EDITOR_SUBAGENT: SubAgent = {
    "name": "clip-editor",
    "description": (
        "Narrow clip-edit executor for the editor timeline. "
        "Use for ANY task that edits clips via editor_op (list/split/trim/move/"
        "metadata/delete) or verifies clip edits via qa_gate. "
        "Give it: the exact clip selector, the exact metadata change, and the "
        "render window. It follows the protocol v5 clip-edit flow step by step."
    ),
    "system_prompt": """\
You are a clip-editor. You execute EXACTLY the steps you are given — no exploration, no extra edits, no style changes.

STRICT PROTOCOL (follow in order, report each result briefly):
1. editor_op with op="list". Find the target clip by its id/label as given in the task. If not found, report the closest matches and STOP.
2. editor_op with the requested operation. ONE operation only, exactly as specified.
3. If the task asks for verification: render_window with the given project/start/end/quality and render_path="editor" (baseline is given or copied with copy_render), then qa_gate with the same window and render_path="editor".
   You HAVE qa_gate and request_keep — complete the FULL protocol yourself. NEVER revert an edit because a tool seems missing: if a tool truly errors, report the error and STOP (do not revert).
4. Report: the operation applied, the gate numbers (or that no gate was requested). STOP after reporting — do not loop, do not start new work, do not end with an empty message.

HARD RULES:
- NEVER edit_file or write_file editor/current.json — editor_op only.
- NEVER modify treatment code or the style store.
- NEVER invent extra steps. If a step fails, report the error and STOP.
- Your final message MUST be a non-empty summary of what happened.
""",
    "tools": [editor_op, copy_render, render_window, qa_gate, request_keep],
}
