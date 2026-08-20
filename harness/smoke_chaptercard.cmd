@echo off
REM Multi-segment smoke: chapter-card (0-3.5s) — text/pacing knobs territory.
set PYTHONIOENCODING=utf-8
(
echo keep; title dễ đọc hơn, giữ
echo yes
echo yes
echo yes
echo yes
) | harness\.venv\Scripts\python.exe -u harness\agent.py "Improve the weakest aspect of segment 0-3.5s of project isaacverse-final (chapter-card treatment). Follow protocol v4 from AGENTS.md exactly, ONE cycle only: read /memories/knowledge-base.md first, render baseline and copy it aside with the copy_render tool, critique via the critic subagent, pick ONE real knob that exists for chapter-card (check /skills/style-knobs/SKILL.md — chapter-card has NO motion knobs; if the weakest aspect is motion, report honestly and improve the second-weakest instead), change it, re-render, compare_renders gate, pairwise_verdict, then request_keep. Record to /memories/knowledge-base.md and report."
