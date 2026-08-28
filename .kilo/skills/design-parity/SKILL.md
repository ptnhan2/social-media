---
name: design-parity
description: Use when designing a new feature or pipeline, writing or updating any spec document (docs/PIPELINE-*.md, feature specs), adding a new tool or capability the agent will use, or planning anything that creates agent capability. Audits the design for agent-human parity (rule 16) BEFORE implementation - the black-box spec v1 failure must not recur.
---

# DESIGN PARITY — audit rule #16 trước khi implement

Mọi thiết kế mới (spec, pipeline, tool, capability) phải qua audit này TRƯỚC khi viết code. Rule #16 từng bị vi phạm nghiêm trọng nhất trong lịch sử repo (spec v1 = 15/15 stage hộp đen) chính vì không có trigger lúc design.

## Audit checklist — mỗi stage/artifact của thiết kế phải trả lời

1. **Agent làm gì ở stage này?** → Liệt kê cụ thể.
2. **User XEM ở đâu?** → UI surface cụ thể (panel nào, tab nào, clip nào trên timeline). "Report cuối" KHÔNG đủ — intermediate state cũng phải thấy được.
3. **User SỬA được gì với quyền tương đương?** → Field nào edit được? Nút regenerate/retry? Override?
4. **Artifact = file + UI surface cả hai bên?** → Single source of truth khai báo rõ (như editor/current.json, providerText trên voice clip).
5. **Human edit → learning signal?** → Diff agent-version vs human-version ghi vào feedback.jsonl ở đâu?
6. **Stage nào KHÔNG có human surface** → hoặc thêm surface, hoặc ghi rõ lý do chính đáng (chỉ chấp cho pure-machine internals như hash/cache), KHÔNG mặc kệ.

## Pattern chuẩn đã chứng minh (dùng làm tham chiếu)

- Voice clip: providerText/sentenceText/QC = clip metadata, agent viết qua bridge, user sửa trong Audio tab, per-field override giữ sửa của user
- Prompt Asset Studio: agent edit được thì user cũng xem + edit được
- editor/current.json: một file, hai first-class editors, revision + optimistic locking

## Output của audit

Thêm section "## Parity audit" vào spec: bảng stage → human surface → edit quyền → learning hook. Thiếu section này = spec CHƯA sẵn sàng implement.
