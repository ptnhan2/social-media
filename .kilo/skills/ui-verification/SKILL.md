---
name: ui-verification
description: Use when claiming any UI works, right after changing UI or editor code (components, CSS, panels, timeline), when writing "UI verified" in any report or checklist, or when a bug report involves visual/layout issues. Covers the L0-L4 layer taxonomy and the deterministic DOM oracle (rule 20).
---

# UI VERIFICATION — đúng oracle, đúng tầng (AGENTS.md rule #20)

Claim "UI verified" phải nêu tầng đã chạm: L0 code · L1 data · L2 API · L3 DOM click-through · L4 DOM geometry + screenshot · L5 perception (human gate — không claim).

Cách làm đúng:
1. **Pure-UI** (tràn chữ, vị trí, kích thước, overlap, hit-target, hover) → DOM assertions: chạy `node remotion-composer/scripts/ui-audit.mjs --url <deep-link>` (playwright, JSON report + screenshots). KHÔNG dùng VLM cho thứ DOM đo được.
2. **Click-through flow** → dispatch **ui-probe** subagent (task tool, subagent_type `ui-probe`) — nó mở browser thật, click đúng flow, thu snapshot/geometry evidence.
3. Typecheck/tests xanh KHÔNG thay thế L3-L4. Tool lỗi lúc chạy → fix tool rồi chạy lại, không bỏ qua.
4. Evidence (số đo, screenshots paths) đính vào report/checklist.
