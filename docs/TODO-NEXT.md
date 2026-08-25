# TODO NEXT — NIGHT RUN 2026-08-25/26 — E2 PARITY CLOSE + PLAYWRIGHT E2E

> Night plan (user ngủ, autonomous mode 8h ~23:45→07:45). User đã cấp toàn quyền
> quyết định; việc bắt buộc user → dồn sang mục "Morning review".
> Quy tắc đêm: commit + push theo phase, CHECK CI sau mỗi push (lesson
> check_ci_after_push), RCA khi fail (không blind revert), không fake gate.

## Objective (north star)

1. **E2 parity gate <2.0** (mean abs diff 0-255, compare trên cold projection):
   đóng 3 gap còn lại (node layout math, footer, presence timing) trên 2 window
   (semantic-diagram 3.5-7 + process-timeline 10.5-14). Gate đạt → flip default
   render path (`--path editor` default + harness render_window default), master
   render giữ chờ user bless buổi sáng. Gate KHÔNG đạt → documented honestly.
2. **Playwright E2E suite cho Asset Studio**: infra (config + webServer +
   chromium + Konva-DOM strategy) + ~12-15 test smoke/chức năng + CI job.

## Phases

### Phase 0 — Boot + baseline (~30')
- [ ] Vite dev server :5174 (background, persistent)
- [ ] Parity tooling (PERMANENT, không phải temp script):
  - `render-window.mjs --editor-doc <path>`: render editor path với doc chỉ định
    (cold doc cho parity, không đụng live doc)
  - `tools/quality/parity_diff.py`: pure PIL pixel-diff lib (mean + changed%,
    không phụ thuộc harness)
  - `scripts/parity-measure.mjs`: orchestrator — cold-generate → render 2 paths
    → diff → JSON report
- [ ] Baseline: semantic-diagram window, cold doc, record mean (kỳ vọng 7-14)

### Phase 1 — Node layout parity (~2h)
- [ ] P1.1 Node box height estimator (pure TS): padding 14/18/13 + label line +
  detail wrap estimate + dot 8px (margin -4). Calibrate vs browser measureText
  (chrome-devtools, Arial 900 uppercase 20px / detail 13px)
- [ ] P1.2 Projection node: height từ estimator, label top = boxTop+14, detail
  top = boxTop+14+labelH+6, DOT element mới (8×8, gradient, glow), boxShadow
  DOUBLE match (`0 0 18px c38, inset 0 0 18px c12`)
- [ ] P1.3 Node timing: `activeFrom ?? 0` (EditDoc có activeFrom 0.2/0.8/1.4 —
  projection đang sai với stagger 0.3+i*0.25)
- [ ] P1.4 clipStyle spring EXACT: import Remotion `spring` (pure fn, không
  hook) + `md.animSpring {damping,stiffness,mass,durationSec,from}` + pulse
  support (`md.pulse {amp,periodSec}` — activePulse 1+0.08*sin) + fps param
  cho overlayStyleAt. Fallback nếu bundle issue: analytic spring thủ công
- [ ] P1.5 Unit tests: estimator, spring parity (clipStyle == treatment math),
  pulse, projection snapshot
- [ ] P1.6 Measure lại + calibrate tối đa 2 vòng

### Phase 2 — Footer + presence + edges (~1.25h)
- [ ] P2.1 Footer: right-anchor (right edge 1850, bottom 1035), textAlign
  right, letterSpacing 1.12, color rgba(244,232,207,0.45) — semantic-diagram
  "follow the thread" + process-timeline "step N/M" (verify vị trí treatment)
- [ ] P2.2 Presence exact presets trong clipStyle: `p-slide-l/r/u/d` (±70px
  frame-absolute), `p-pop` (spring 9/170/0.7, scale 0.4+0.6s), `p-jump-in`,
  `p-drop-in`, `p-peek` (-46% clip width), `p-fade-scale` (cubic-out eased) +
  filter double drop-shadow (black + accent33). Update PRESENCE_TO_CLIP_ANIM
- [ ] P2.3 Edge reveal timing align vs treatment Edge component

### Phase 3 — Gate + flip decision (~45')
- [ ] P3.1 Gate measurement 2 windows, interior frames, frame-aligned starts
  (tránh cross-beat boundary artifact như frame-0=40 đêm trước)
- [ ] P3.2 Gate <2.0 cả 2 window → flip default (render-window + harness
  render_window tool default editor; treatment = generator preview).
  KHÔNG đạt → gap table documented. Sau đó: sync LIVE editor doc (sync mode —
  unmodified refresh, userEdited keep) + verify editor-ops list

### Phase 4 — Playwright E2E Asset Studio (~2h)
- [ ] P4.1 Infra (autonomous decisions): @playwright/test trong composer-app;
  webServer = vite ephemeral port, reuseExistingServer; chromium; Konva
  strategy = assert qua Konva node attrs + store state (page.evaluate), KHÔNG
  pixel-sample canvas; data-testid trên panels; bridge API mock qua route
  interception
- [ ] P4.2 Tests batch 1: boot smoke (7 tools + panels), image upload
  (fixture PNG), tool switch + cursor, undo/redo + history, session persist
  across reload
- [ ] P4.3 Tests batch 2: lasso polygon, wand flood-fill (fixture), eraser,
  zoom-to-selection, guides/rulers, cheat sheet, mocked gen/inbox/recipes
- [ ] P4.4 `npm run test:e2e` + CI job `studio-e2e` (ubuntu + chromium,
  ~3min) — local green TRƯỚC khi commit

### Phase 5 — Guardrails + close-out (~1h)
- [ ] P5.1 Full verify: vitest (137+new), typecheck, build; push theo phase +
  `gh run list` sau MỖI push
- [ ] P5.2 reviewer-agent subagent đọc diff cold (lean gate >200 dòng)
- [ ] P5.3 Docs sync: GENERATOR-SPEC (E2 final + gate numbers + flip decision),
    TODO-NEXT (kết quả đêm — file này), HARNESS-RECOVERY (rewrite cho buổi
    sáng), ASSET-STUDIO-SPEC (E2E section), knowledge-base entry
- [ ] P5.4 Memory save night-run-2026-08-26 decisions

## Morning review (cần user — không làm đêm)

1. Flip blessing: nếu gate đạt, master render production có dùng editor flow
   không (per GENERATOR-SPEC §2.6 "master render uses the editor flow")
2. `repurpose` pipeline approval (đã defer từ trước)
3. Multi-doc studio + anchor editor kéo thả (design session)
4. User tự bake thêm poses bằng studio (công cụ đủ)

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| clipStyle import remotion spring → bundle/UI issue | spring là pure fn; nếu typecheck/bundle fail → analytic spring thủ công (công thức sẵn: ω0=√(k/m), ζ=d/(2√(km))) |
| Node height estimator sai | Calibration loop khách quan theo pixel-diff, tối đa 2 vòng; còn sai → VLM side-by-side tìm residual |
| Gate không đạt honestly | DOCUMENT gap table, KHÔNG fake; treatment stays master (quyết định như B6 đêm trước) |
| Playwright flaky trên Windows | retry 1 lần, headless chromium, route mock thay vì python bridge thật |
| CI đỏ | RCA ngay theo protocol §8, không push thêm khi đang đỏ |

## PAUSE conditions (chỉ khi)

CI đỏ beyond fixable / git repo corruption / disk full. Mọi thứ khác → RCA +
fix + tiếp tục. Paid key không dùng đêm nay (render local, pixel-diff free;
VLM chỉ dùng làm tie-breaker evidence nếu cần).
