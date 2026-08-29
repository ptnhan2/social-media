# Production Pipeline Spec — nửa "produce" của harness (Phase 2)

> **Status: DRAFT v3 — 2026-08-27 (23:56). Chờ user duyệt.**
> **Review UI: `reviews/2026-08-27-pipeline-production-spec-review.html`** — checklist D1-D8.
> v3: **timeline-centric parity** (user correction #3): KHÔNG panel mới — voice
> segments = audio clips trên timeline có sẵn, direction/QC/takes/provenance =
> clip metadata, edit surface = PropertiesPanel Audio tab (đã có), regen =
> per-clip surgical. v2 (panel song song) bị hủy — phục tạp hóa.

---

## 0. Nguyên tắc thiết kế

1. **Tool = pipeline stages + gates** (không 1 hàm gọi API).
2. **Agent-Human Parity = chính là editor paradigm** (AGENTS.md #16): user
   luôn mở editor khi làm video → **timeline là TRUNG TÂM parity**. Mọi
   production artifact trở thành **timeline object** (audio clip / image clip),
   metadata chỉnh qua **PropertiesPanel per-type tabs** (đã có), không panel
   song song nào.
3. **Một representation: `editor/current.json`** — đã có revision + optimistic
   locking + **per-field override ledger** (Figma pattern, hardening đợt 3) +
   schema migrations. Voice/image parity KHÔNG cần cơ chế mới: user sửa
   `providerText` của clip → field đánh dấu overridden → agent regen direction
   lần sau GIỮ sửa của user (hoặc flag stale) — đúng machinery đang chạy.
4. **Human edits = learning signal đầy đủ** (diff agent→human vào feedback.jsonl).
5. **Audio QC = deterministic số** (WER/LUFS/peak/duration); taste = human gate.
6. **VO là đồng hồ**: voice-first timing — audio clip duration hiện NGANG HÀNG
   beat video clip trên timeline = timing diff view chính nó.
7. **Dựng trên cái có sẵn**: voice/music/audio-event clip kinds (editor.ts:97),
   VoiceTrack render gain/fade/speed/mute/solo per clip (audio.tsx), Audio tab
   PropertiesPanel (đã show cho audio clips), addAssetTrack audio +
   capabilities trim/split/gain/fade (editorOperations), upload API, Asset
   Studio prompt precedent, isaacverse_voice.py stages, whisperx, skills
   05-audio numbers.
8. **Provenance + learning hooks** mọi stage.

---

## 1. VOICE PIPELINE — voice clips trên timeline

### Voice segment = audio clip (bảng mapping stage → timeline object)

| # | Stage | Timeline object / metadata | Human surface (ĐÃ CÓ — chỉ extend) | Gate |
|---|---|---|---|---|
| A | **plan** | Audio clips scaffold trên voice track, 1 batch/beat: `clip.source.beatId`, `metadata.sentenceId` | **Timeline trực tiếp**: clip nào thuộc beat nào, kéo/trim/split bằng tool hiện có; PropertiesPanel đổi text câu trong **Audio tab** (field `sentenceText`) | mọi beat ≥1 batch |
| B | **direction** | `clip.metadata.providerText` — CHUỖI THẬT gửi ElevenLabs (tags/CAPS/breaks) | **Audio tab: provider-text field** — như prompt Asset Studio: thấy đúng chuỗi, sửa trực tiếp, UI validate rule "không đổi từ chỉ thêm tags" | review cues 1 lần |
| C | **sample gate** | Sample clip hiện trên timeline (draft màu khác) | Nghe ngay trong editor (Player có audio); **sửa providerText tại chỗ → nút Re-sample** | approve ≤3 iter |
| D | **generate** | Takes ghi `voice/takes/`; selected take → `clip.source.src`; `metadata.voiceSettings` + alignment | **Audio tab: voice settings** (voiceId/stability/style/speed — theo clip hoặc apply-all) | settings identical mọi call (so programmatic) |
| E | **qc** | `clip.metadata.qc = {wer, lufs, peakDb, durationSec, expectedSec, transcript, diffHl}` | **QC badge trên clip** (FAIL = đỏ) + **Audio tab: QC readout** — số liệu + transcript diff highlight từ sai + play từng take | WER ≤5%, clip ≥−0.5dB, dur ±15%, silence >1.5s |
| F | **select** | `metadata.takeId` + danh sách takes | **Audio tab: take switcher** — play từng take, đổi take 1 click (override = feedback mạnh nhất) | auto + human override |
| G | **post** | Chain áp vào stem files; **chain params = style-store knobs** | **Audio tab: A/B preview trước/sau** + knobs hiện trong panel (fonts-parity precedent) | loudnorm 2-pass −16/−1.5 |
| H | **timing** | Audio clip measured duration đặt NGANG beat video clip — lệch hiện trực quan trên timeline | **Timeline = timing diff view**: beat dài hơn/thấp hơn voice thấy ngay; padding per-beat = field `breathPadSec` trong Audio tab; apply durationSec = ripple (tool có sẵn); VO >×1.05 → badge "rewrite?" | patch + verify |
| I | **mix-plan** | Music/SFX clips trên audio tracks (clip kinds đã có) | Audio controls sẵn (gain/mute/solo/track volume); AudioMixer render DuckZones + master LUFS | schema validate |
| J | **record** | — | Mọi edit (B/C/D/F/H) diff → feedback.jsonl | — |

### Bridge ops (agent + UI gọi chung)

- `regen_voice_clip(clipId, {providerText?, voiceSettings?})` — surgical 1
  batch: gen takes mới → QC → update clip (bump revision, per-field override
  mark). UI nút "Regenerate" và agent tool gọi CÙNG op.
- `scaffold_voice_track(slug)` — stage A: tạo clips theo edit-doc beats.
- HTTP: `POST /api/project/audio-regen` (pattern `/api/render` job có sẵn:
  spawn + poll status) — regen là job chạy nền vì TTS mất vài giây.

### Data

- Takes + stems: `projects/<slug>/voice/takes/*.wav` (files — không nhét
  binary vào doc); doc chỉ giữ paths + metadata.
- Plan chi tiết (voice_performance, cues, costs): `voice/plan.json` — read-only
  history/provenance; CÁI CHỈNH ĐƯỢC nằm trong clip metadata (một nguồn).
- Bugs pipeline cũ fix như v1: directive phải áp vào providerText; batch theo
  beat; QC; with-timestamps; timing coupling.

---

## 2. IMAGE SOURCING — image clips + PropertiesPanel Image tab

| Stage | Timeline object / metadata | Human surface |
|---|---|---|
| query build | `imageClip.metadata.query` (per beat) + `metadata.queryHistory[]` | **Image tab: query field — sửa + nút Re-search** (Asset-Studio-prompt pattern) |
| fetch + dedupe | Candidates ghi `assets/images/manifest.json` (per beat); dùng ảnh nào → `clip.source.src` | **Image tab: candidate grid** — click đổi ảnh; dedupe/provenance badge (photographer, license) mỗi ảnh |
| cohesion | Grade = style-store knob | **Grade knob** trong panel (toàn video) |
| relevance QC | `metadata.qcVerdict` | Badge trên clip + verdict trong tab; fail → gợi ý re-query |
| upload own | Upload API có sẵn | **Image tab: nút Upload** — ảnh own thay thế, provenance = "user-upload" |
| gate | — | Taste keep — SAU khi user đã đổi query/ảnh/grade thoải mái |

Agent side: `requery_image_clip(clipId, {query?})` — cùng op UI gọi.

## 3. TIMELINE GENERATION — `generate_timeline`

Wrap generate-editor cold + validate trước. **Human surface**: generation
report = panel trong Composer (warnings checklist PASS/FAIL, missing assets,
style version); user fix edit-doc bằng editor hiện có → regenerate. Không
nuốt warning trong stdout.

## 4. EDIT-DOC VALIDATION — `validate_edit_doc`

Rules: contiguity, duration>0, assets tồn tại, cues resolvable, params đủ,
schemaVersion, voice clips có src + QC pass (khi có voice track). Report =
checklist PASS/FAIL trong panel — cùng report agent đọc.

## 5. PROJECT SCAFFOLDING — `new_project`

Contract chuẩn. UI project list + create đã có.

---

## 6. Kiến trúc: KHÔNG panel framework mới

| v2 (hủy) | v3 (thay bằng) |
|---|---|
| Voice Direction panel (riêng) | Audio tab trên voice clips (đã có tab, thêm fields) |
| QC dashboard (riêng) | QC badge trên clip + readout trong Audio tab |
| Takes panel (riêng) | Take switcher trong Audio tab |
| Timing diff view (riêng) | Timeline trực tiếp (audio clip ngang beat clip) + `breathPadSec` field |
| Query cards (riêng) | Image tab trên image clips |
| API voice/images artifacts riêng | 2 bridge ops (`regen_voice_clip`, `requery_image_clip`) + HTTP job pattern có sẵn |

Mọi chỉnh sửa chảy qua **một doc** (`editor/current.json`): revision, locking,
per-field override, migrations — không state song song nào để lệch.

## 7. LEARNING HOOKS

- Human edits trên clip metadata → diff (agent-version → human-version) vào
  feedback.jsonl, knob = `voice.<clipId>.providerText`,
  `image.<clipId>.query`, `voice.<clipId>.takeId`...
- pattern_extractor nhóm edit-patterns (thêm [pause] ở đâu? đổi từ nào trong
  query?) → principle candidates. Edit = demonstration (ILF) > 1-bit verdict.
- voice-identity.md: settings thắng + lịch sử overrides.

## 8. ROADMAP v3 (nhỏ hơn v2 — không panel framework)

| M | Nội dung | Tests |
|---|---|---|
| M1a | Stage A-E: scaffold voice track + providerText metadata + QC gates + **Audio tab extensions (sentenceText, providerText, QC readout)** + regen bridge op | unit: text-prep mapping, QC thresholds, per-field override giữ user text khi agent regen; UI: field edit → revision bump; E2E: 1 beat thật |
| M1b | Stage F-J: take switcher + post chain knobs + timing (breathPadSec + ripple) + **QC badge** | unit: scoring, timing; E2E: user override take → feedback.jsonl có diff |
| M2 | Image: query metadata + candidate grid trong Image tab + requery bridge | E2E: user sửa query → re-search → feedback |
| M3 | generate_timeline + validate + report panel; mini-video 10-15s zero-manual | E2E produce |
| M4 | Mix-plan (music/SFX clips + DuckZones) + audio inspector wiring | audio smoke |

## 9. PROGRESS LOG

- **2026-08-29 15:00 (A1 ĐÓNG — agent tự viết edit-doc)**: mắt xích đầu tiên
  của produce flow giờ là agent capability. `write_edit_doc` (harness tool +
  scripts/write-edit-doc.mjs bridge qua saveSourceDocs — write-path chuẩn của
  store, không nhân bản contract): agent thiết kế story + beats, bridge xây
  CẢ 04-video-doc + 05-edit-doc, startSec tính cộng dồn (order + duration là
  quyết của agent; voice-first retime sẽ điều chỉnh lại). Gates: timeline
  semantics REFUSE (gap/overlap/start≠0), schema WARN, overwrite guard +
  backup. E2E agent-loop-test: 3-beat → TTS (rewrite flags surfaced) →
  generate-timeline (0 warnings) → render 17.07s (-16.8dB). Fix theo: render
  bundle cache key giờ gồm projects-manifest.json (A2 hole — composition mới
  vô hình đến khi source .tsx đổi). Chain: produce ĐỦ capacity từ story đến
  render; còn A3 (critique→fix→KEEP vòng tròn) để kiểm chứng trọn vòng.
- **2026-08-29 03:15 (M3 SHIPPED + ZERO-MANUAL E2E — overnight autonomous
  session)**: đóng timeline step của produce loop. (1) validateEditDocTimeline
  (shared/validate.ts, pure): contiguity (beats tile không gap/overlap, start
  tại 0), cue form (id+reason), treatment params, asset src shape. (2)
  generate-timeline.mjs: pre-flight (schema + semantics + asset existence) →
  generate-editor sync → voice post-check (src + QC) → report tại
  projects/<slug>/qa/timeline-report.json + public sync. BLOCKING = vỡ cấu
  trúc (gap/overlap, missing assets); schema discipline = WARNINGS (surfaced,
  không nuốt, không chặn — generator vốn lenient theo thiết kế). (3) HTTP
  /api/project/generate-timeline (+status, +timeline-report GET). (4) Timeline
  QA tab trong Composer: checklist PASS/FAIL + warnings + style version +
  Generate button — human surface của CÙNG report file agent đọc. (5) Harness
  tool generate_timeline đăng ký trong Deep Agents. **E2E zero-manual PASSED**
  (tiêu chí M3): projects/mini-loop-test — 3-beat 13.7s: scaffold-voice-plan
  --regen (TTS v3, retime 12→13.69s, rewrite flag beat-02 surfaced) →
  generate-timeline (5/5 PASS, 0 warnings) → render-window draft (mp4 919KB,
  audio -16.5dB/peak -1.5dB, frames thật). Friction ghi nhận: composition
  registration trong Root.tsx vẫn thủ công (→ TODO A2). Cùng đêm: M1b (take
  switcher + QC badge + breathPad ripple) + M2 (image query cards) shipped
  chi tiết trong commits 4fa02d0, a656e39, 48b55bb, ebc3363.
- **2026-08-29 00:20 (M1a hoàn thiện + v3)**: session 28/08 cả ngày (nhiều
  chủ đề, docs update trễ — vi phạm discipline #2, đã cân đối lại trong
  TODO-NEXT). Hoàn thiện M1a thực chiến: (1) user bắt bug panel layout
  grid-in-grid → fix `.ve-prop-voice`; (2) async-button contract (busy
  disable + label đổi tại nút); (3) regen race fix (UI gửi draftProvider
  trong POST); (4) stale public sync fix (endpoint sync sau apply); (5)
  **v3 migration theo user directive** — eleven_v3 là chuẩn (v2 fossil từ
  SDK language-kwarg bug cũ), break tags retired (v3 từ chối), audio tags +
  CAPS passthrough, WER normalizer strip [tags]; (6) demo A/B user-confirmed:
  `[assertive]` + CAPS nghe khác biệt rõ. Remaining M1a polish → M1b (xem
  TODO-NEXT B1-B3).
- **2026-08-28 ~01:20 (M1a SHIPPED)**: voice parity loop live end-to-end.
  Shipped: `voiceClip.ts` (buildProviderText + validate + QC builder),
  projection sinh sentenceText/providerText cho voice clips, Audio tab
  VoiceSection (sentence + provider text + voice settings + QC readout +
  Regen button), bridge op `voice_apply` (machine fields override-marked,
  providerText user-edit sống sót — có test), `tools/audio/voice_regen.py`
  (TTS takes + QC deterministic + post-chain 2-pass loudnorm), API
  `/api/project/audio-regen` (+status, job pattern, apply qua bridge),
  AudioMixer clip-src override (timeline clip = truth cho audio của nó).
  Tests: 184/184 vitest (12 mới) + 5/5 node. E2E THẬT trên
  ai-dialogue-therapy: job 13s, 2 takes, QC 4/4 PASS (loudness −16.54 LUFS
  trúng target −16), apply rev 8 qua bridge; editor doc restore từ backup
  sau E2E (transcript segment chỉ là hook line — clip sẽ co lại đúng 4.6s;
  per-beat segments là việc của produce flow khi viết audioPlan).
  Bugs vấp trong E2E: (1) editor-ops in JSON pretty-print đa dòng → parser
  dòng-cuối vỡ → fix jsonSpan (từ { đầu đến } cuối); (2) route prefix
  match: /status phải đăng ký TRƯỚC route chính.
- **2026-08-27 23:56 (v3 — user correction #3)**: "tại sao không dựa vào
  timeline editor luôn? user lúc nào cũng mở editor, có track audio sẵn, chỉ
  cần fix prompt + regen từng đoạn track audio" → audit code: voice/music/
  audio-event clip kinds + VoiceTrack (gain/fade/speed/mute/solo) + Audio tab
  + addAssetTrack audio + per-field override ledger ĐÃ TỒN TẠI → hủy thiết kế
  panel song song của v2, chuyển toàn bộ parity vào timeline + PropertiesPanel
  tabs. V2 phục tạp hóa; v3 nhỏ hơn và dùng đúng machinery đã harden.
- **2026-08-27 tối (v2)**: parity rule (AGENTS.md #16) audit v1 15/15 hộp đen
  → viết lại với human surface mỗi stage — nhưng theo hướng panel mới (sai).
- **2026-08-27 chiều (v1)**: research LUFS/ElevenLabs/skills; phát hiện
  isaacverse_voice.py + 5 bugs; spec stages+gates (đúng) nhưng chưa parity.
