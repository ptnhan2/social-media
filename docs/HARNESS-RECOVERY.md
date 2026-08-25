# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-26 ~06:50 (night run 25/26, including bonus parity round).
> Previous: 03:15 25/08.
> **TRẠNG THÁI: NIGHT RUN HOÀN TẤT 5/5 PHASE + BONUS PARITY ROUND** — E2 parity
> GATE PASS + default render path flipped sang editor + Playwright E2E 13/13 +
> review hardening + parity round 2 (4 treatments).
> Full evidence + decisions: `docs/TODO-NEXT.md` + git log `1fd5998..HEAD`.

---

## 🌅 VIỆC TIẾP THEO (session sau)

1. **Morning review với user** (xem TODO-NEXT "Morning review"): flip
   blessing cho master render, repurpose approval, multi-doc design
2. **Parity residuals 4 treatment** (TODO-NEXT bảng BONUS ROUND): chapter-card
   2.28, cinematic 3.24, candidate 3.45, host-reflection 5.9-6.3 — sub-pixel/
   gradient/blend nuances; method đã có pattern
3. Playwright batch 3 + latent risks từ review (TODO-NEXT backlog)

## 🌙 TÓM TẮT ĐÊM (chi tiết TODO-NEXT + commits 1fd5998..HEAD)

- **E2 GATE PASS**: semantic-diagram 1.222, process-timeline 1.266
  (threshold 2.0, cold projection) — re-verified sau mọi round. Default
  render path = editor; treatment = preview (`--path treatment`).
- **8 root causes parity round 1**: camera nesting, store colors, node
  DOM-height estimator + group scale + pulse, Remotion spring port chính xác,
  edge viewBox units, PRESENCE_ASPECT (0.52-0.56 không phải 3:4), text
  padding, process-timeline layout.
- **Bonus round 2** (4 treatments): chapter-card 39.2→2.28 (title LUÔN wrap
  2 dòng — 86% shrink-to-fit parent), candidate 15.7→3.45 (grid + spring +
  group scale 0.96), host-reflection beat-7 29.9→5.92 (mixBlendMode screen),
  cinematic 3.24 chưa đụng.
- **Playwright E2E**: 13/13 + CI job studio-e2e GREEN. Suite bắt 3 bug
  production thật (upload src bust, docsEqual bỏ name/locked, stale closure
  Escape).
- **reviewer-agent bắt B1 MAJOR**: overlay clip khi beat split/trim — đã fix.
- LIVE editor doc synced x2 (91 + 98 refresh), 157/157 vitest, CI xanh mọi
  commit (3 workflows).

## 🔧 VẬN HÀNH

```powershell
# Composer dev (:5174)
cd remotion-composer\composer-app; npx vite --port 5174
# Asset Studio E2E (tự boot server riêng :5199)
cd remotion-composer\composer-app; npm run test:e2e
# Parity measurement (cold doc, 2 paths, report qa/parity/)
node remotion-composer\scripts\parity-measure.mjs --project isaacverse-final --start 3.5 --end 7
# Render (default giờ là EDITOR path; treatment = preview)
node remotion-composer\scripts\render-window.mjs --project isaacverse-final --start 3.5 --end 7 --quality draft
node remotion-composer\scripts\render-window.mjs --project isaacverse-final --start 3.5 --end 7 --quality draft --path treatment
```

## ⚠️ GOTCHAS MỚI (đêm này)

1. **Playwright postData()**: SYNC, không phải promise — `.then()` crash route
   handler → mọi request treo, browser session chết
2. **vitest collect e2e specs**: mặc định vitest nhặt cả `e2e/*.spec.ts` —
   vite.config.ts đã pin `test.include: ["src/**/*.test.{ts,tsx}"]`
3. **`.gitignore *.png` nuốt E2E fixture** → CI fail ENOENT ở module load —
   đã thêm exception `!remotion-composer/composer-app/e2e/fixtures/*.png`
4. **Remotion Sequence clips children**: overlay lồng trong beat Sequence bị
   clip theo duration của Sequence đó — overlay spanning qua split/trim phải
   render ở root level
5. **preview canvas của studio** trong browser thật không ảnh hưởng fetch
   monkeypatch — chỉ page.route của Playwright chặn được <img> loads
6. **VLM glm-4v-flash noisy với global diff** (như memory) — dùng region crop
   + quantitative bbox/profile (PIL) thay vì tin VLM descriptions

## 📌 GHI NHỚ TỪ MEMORY (vẫn đúng)

- Check CI (`gh run list`) sau MỖI push — đêm này CI xanh mọi commit
- Ox Alpha không xem được ảnh — VLM Zhipu cho image analysis (region crops)
- Lean discipline: diff lớn → reviewer-agent cold-read (đã làm, bắt được B1)
