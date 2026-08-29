---
description: Readiness handoff — verify servers, run UI audit, open deep links, pre-verify everything before the user checks (rules 17+18). Use when finishing work with deliverables for the user.
---

# HANDOFF — giao việc cho user theo đúng rule #17 (readiness) + #18 (pre-verified)

Bạn (agent chính) đang kết thúc một khoảng việc có thứ user cần check. Thực hiện ĐÚNG THỨ TỰ — không bỏ bước:

## 1. Verify bằng agent chuyên (không tự tin theo cảm tính)

Dispatch **verify** subagent (task tool, subagent_type `verify`) với claim cần verify.
Nếu việc liên quan UI → dispatch thêm **ui-probe** subagent (subagent_type `ui-probe`) với flow cần click-through.
Verdict nào FAIL/PARTIAL → fix xong rồi mới sang bước 2. Không handoff khi còn FAIL.

## 2. Readiness — mở sẵn mọi thứ

- Verify HTTP liveness: Composer `http://localhost:5174`, agent `http://127.0.0.1:2025/ok` — chết thì khởi động lại (background process tool, KHÔNG chạy shell chính — rule #19)
- Mở browser deep-link đúng context: `Start-Process "http://localhost:5174/editor?project=$ARGUMENTS"` (mặc định project ai-dialogue-therapy nếu không có args)
- Artifacts user cần xem: mở sẵn file/URL (HTML review pages mở bằng browser)

## 3. Checklist pre-verified (rule #18)

Tạo/update checklist HTML tại **`reviews/YYYY-MM-DD-<ten-kebab>.html`** — `reviews/` là nơi DUY NHẤT cho HTML user-facing (AGENTS.md Document Hygiene); cũ/superseded → `reviews/archive/`. CẤM đặt trong `docs/` hay root. Checklist chỉ chứa những gì ĐÃ verify ở bước 1, mỗi mục kèm:
- Cách user tự nhìn thấy (click đâu, nghe gì — chỉ mô tả, không giao việc)
- Evidence agent đã verify (số liệu, screenshots paths, HTTP status)
- Mục L5 perception (nghe giọng, taste) ghi rõ "human gate — quyết của bạn"

## 4. Báo cáo ngắn

Trả lời user: những gì đã mở sẵn (URLs), verdict verify, checklist ở đâu. KHÔNG viết "bạn mở X → click Y" — mọi thứ đã mở sẵn.

$ARGUMENTS
