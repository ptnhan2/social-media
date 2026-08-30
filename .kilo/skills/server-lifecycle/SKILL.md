---
name: server-lifecycle
description: Use when starting, restarting, or checking any dev server, agent server, watcher, worker, or other long-running process. Covers the background-process rule (rule 19). The CANONICAL runbook lives in AGENTS.md "Server Runbook" — follow it exactly.
---

# SERVER LIFECYCLE — server/long-running process (AGENTS.md rule #19)

**Runbook chuẩn: AGENTS.md → section "Server Runbook" — đọc và làm THEO ĐÚNG, không suy diễn lại.** Tóm tắt:

Mọi tiến trình sống dai KHÔNG BAO GIỜ chạy trong shell chính (block conversation = agent treo):

1. **Khởi động**: background process tool (persistent: true). Command đúng:
   - Composer UI: `npm --prefix remotion-composer/composer-app run dev` (port 5174, boot 5–30s)
   - LangGraph agent: `harness\.venv\Scripts\python.exe -m langgraph_cli dev --port 2025 --host 127.0.0.1` (**boot ~80s — KHÔNG kết luận chết trước 180s**; UnicodeEncodeError trong log là NOISE; KHÔNG cần PYTHONUTF8=1)
2. **Nếu langgraph pid chết trong ~30s đầu**: start lại CÙNG command MỘT lần (thường sống lần 2). Chỉ investigate nếu chết 2 lần liền.
3. **Verify**: HTTP probe trước khi báo sống (5174 → 200; 2025 → /ok 200 — port listening ≠ sống).
4. **Kill**: TÌM ĐÚNG PORT → `taskkill /F /T /PID` (cả cây — multiprocessing child giữ port). Không bao giờ kill theo port đoán.
5. **Máy 100% CPU?** Mọi boot chậm 10–50× — ĐỢI, đừng kết luận chết.
6. Command ngắn (build/test/render) chạy shell bình thường với timeout hợp lý.
