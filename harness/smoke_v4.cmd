@echo off
REM Smoke test: full protocol v4 cycle through the real agent (CLI).
REM Feeds keep/reject + note answers to the keep gate and yes to memory-write approvals.
set PYTHONIOENCODING=utf-8
(
echo keep; animation nhanh hon nhe, giu
echo yes
echo yes
echo yes
echo yes
) | harness\.venv\Scripts\python.exe -u harness\agent.py "Improve the weakest aspect of segment 3.5-7s of project isaacverse-final. Follow protocol v4 from AGENTS.md exactly, ONE cycle only: read /memories/knowledge-base.md first, render baseline and copy it aside, critique via the critic subagent, pick ONE real knob from the style-knobs skill (verify the path exists in the style store with read_file before changing it), change it, re-render, compare_renders gate, pairwise_verdict, then request_keep. Record the result to /memories/knowledge-base.md and report."
