---
name: server-lifecycle
description: Use when starting, restarting, or checking any dev server, agent server, watcher, worker, or other long-running process. Covers the background-process rule (rule 19) and the Windows langgraph UTF-8 gotcha.
---

# SERVER LIFECYCLE — server/long-running process (AGENTS.md rule #19)

Mọi tiến trình sống dai KHÔNG BAO GIỜ chạy trong shell chính (block conversation = agent treo):

1. **Khởi động**: background process tool (persistent: true cho thứ cần sống qua session). Command đúng:
   - Composer UI: `npm --prefix remotion-composer/composer-app run dev` (port 5174)
   - LangGraph agent: `harness\.venv\Scripts\python.exe -m langgraph_cli dev --port 2025 --host 127.0.0.1` — BOOT MẤT ~80s (graph import chậm): đợi tối thiểu 90-120s trước khi kết luận chết. Các `UnicodeEncodeError` emoji logging trong log là NOISE không chết (logging catch rồi) — đừng nhầm thành crash.
2. **Fallback** khi background tool crash lúc boot: Start-Process detached + redirect log file + verify port liveness — vẫn không block shell
3. **Verify**: HTTP probe trước khi báo sống (5174 → 200; 2025 → /ok 200; Test-NetConnection có thể báo False dù HTTP 200 — tin HTTP)
4. Command ngắn (build/test/render) chạy shell bình thường với timeout hợp lý
