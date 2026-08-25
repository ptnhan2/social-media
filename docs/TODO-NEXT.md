# TODO NEXT — NIGHT RUN 2026-08-25/26 — HOÀN TẤT 5/5 PHASE

> Kết quả night run (user ngủ, autonomous mode ~23:45→07:00). Quyết định ghi
> trong commits `1fd5998..HEAD`. Evidence: qa/parity/*.json + git log.

## Objective (north star) — ĐẠT

1. **E2 parity gate <2.0: PASS cả 2 window + default render path ĐÃ FLIP sang editor**
   - semantic-diagram (3.5-7): meanOfMeans **1.223** / max 1.621
   - process-timeline (10.5-14): meanOfMeans **1.266** / max 1.576
   - Hành trình: 9.316 → 3.922 → 2.388 → 1.288 → 1.223 (−87%)
2. **Playwright E2E Asset Studio: 13/13 PASS local + CI job studio-e2e GREEN**

## Phase results

### Phase 0 — Parity tooling ✅
- `tools/quality/parity_diff.py` (pure PIL, gate <2.0), `render-window.mjs
  --editor-doc` (cold doc cho parity, không đụng live doc),
  `scripts/parity-measure.mjs` (cold-generate → render 2 paths → diff →
  report qa/parity/*.json)
- Baseline: 9.316 meanOfMeans — diff mang tính hệ thống (layout), không transient

### Phase 1+2 — Parity closes ✅ (commit d6e1d90)
Root causes (theo mức độ đóng góp):
1. **BeatCamera**: overlay clips nằm NGOÀI camera (treatment scale 1→1.12 +
   drift; editor đứng yên) — fix: overlay lồng trong beat Sequence + camera
2. **Colors**: projection hardcode #f2b84b/#61d7e8 trong khi store v73 là
   #ff6b35/#00d4ff — fix: đọc store như treatment
3. **Node layout**: box DOM auto-height (83.35 thực vs 100 hardcode) + dot +
   inset shadow + activeFrom timing + group scale (transformOrigin) +
   activePulse — fix: estimator calibrated từ Chromium measureText
   (line-height 1.44/1.35, ~0.75em/char uppercase-900)
4. **clipStyle spring**: port CHÍNH XÁC thuật toán Remotion (advance/
   springCalculation/measureSpring + duration stretch) — không import remotion
   (clipStyle phải chạy được trong node/vitest). animSpring/animEasing/
   animSlidePx/pulse metadata
5. **Edges**: treatment vẽ trong viewBox 100×100 non-uniform stretch — px math
   sai scale curvature ~3.4× + stroke mỏng ~10×; fix: viewBox units + reveal
   double-offset + custom viewBox/pathD/revealTo (progress curve 100×12)
6. **Presence**: pose PNG thật aspect 0.52-0.56 (không phải 3:4!) — box rộng
   hơn 43px lệch tâm; fix PRESENCE_ASPECT map + p-* presets chính xác
   (movement cubic-out, opacity linear ramps) + double drop-shadow
7. **Text padding "0 2%"**: lệch trái/phải 2% box width — bỏ padding
8. **process-timeline**: bg glow, gradient title + filter, spring stagger
   0.18s, computed box layout, footer right-anchor

### Phase 3 — Flip ✅ (commit de96a8b)
- render-window.mjs + harness render_window/qa_gate: default `editor`
  (treatment = generator preview qua `--path treatment`)
- LIVE editor doc sync mode: 91 clips refresh, 2 userEdited giữ, +7 elements
- Render verify editor path trên live doc OK

### Phase 4 — Playwright E2E ✅ (commits d7972cd, 64de09b)
- 13/13 tests: boot/shortcuts/import/rename/session-persist/undo-redo/tools/
  zoom-to-sel/lasso/wand/eraser/poses/inbox — mock toàn bộ bridge
- **3 production bug suite bắt được**: uploadDataUrl src không bust (history
  entry bị dedupe nuốt + stale-cache), docsEqual bỏ name/locked (rename/lock
  không vào history), stale closure showShortcuts (Escape không đóng modal)
- CI `studio-e2e` job GREEN (ubuntu, chromium, ~2 phút, trace on failure)
- vite.config.ts portable (bỏ hardcode C:/DevWork — CI boot được)

### Phase 5 — Review + close-out ✅
- **reviewer-agent cold-read diff**: bắt B1 MAJOR — overlay lồng trong beat
  Sequence bị clip khi beat clip split/trim (regression với edited timeline,
  parity gate không bắt được vì cold projection không có split). ĐÃ FIX:
  overlay chỉ nest khi NẰM GỌN trong 1 beat clip, spanning → root
- Hardening: B2 (presence aspect fallback), B3 (edge y2 default), R2
  (imageCache bounded 64), parity-measure cleanup, vitest exclude e2e
- Re-verify sau fix: parity PASS 1.222, E2E 13/13, vitest 157/157, CI xanh

## Morning review (cần user)

1. **Flip blessing**: E2 gate đạt — master render production có chuyển hẳn
   sang editor flow không? (per GENERATOR-SPEC §2.6 "master render uses the
   editor flow" — hiện master vẫn render qua lệnh cũ, chỉ default
   render-window/harness là editor)
2. `repurpose` pipeline approval (defer từ trước)
3. Multi-doc studio + anchor editor kéo thả (design session)
4. User tự bake thêm poses bằng studio (công cụ đủ)

## Next-session backlog

1. **E2 parity cho các treatment còn lại** (host-reflection, chapter-card,
   cinematic-metaphor, candidate-comparison) — cùng method: parity-measure →
   fix → đo lại. Camera + colors + presence fixes đã cover phần chung
2. **Latent risks từ review** (docs/GENERATOR-SPEC): estimator glyph-width
   fragility với content mới (W/M vs i/l chars), e_phase baseline tautology
   (không guard cross-path), R1 test: overlay spanning qua split
3. Playwright batch 3: marquee select, guides/rulers, gen panel (mock),
   recipes CRUD (mock)
4. Studio performance: canvas render optimizations nếu user phàn nàn

## Gotchas mới (đêm này — chi tiết trong HARNESS-RECOVERY)

1. Playwright `route.request().postData()` là SYNC — `.then()` crash cả route
   handler → mọi request treo, page chết
2. Vite vitest default collect cả e2e/*.spec.ts — phải pin include src/**
3. `.gitignore` rule `*.png` nuốt fixture E2E — CI fail ENOENT khi module
   load (fs.readFileSync top-level)
4. Repo-wide gitignore paths phải thêm exception `!remotion-composer/composer-app/e2e/fixtures/*.png`
