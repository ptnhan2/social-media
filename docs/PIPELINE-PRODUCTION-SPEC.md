# Production Pipeline Spec — nửa "produce" của harness (Phase 2)

> **Status: DRAFT v2 — 2026-08-27 (tối). Chờ user duyệt trước khi implement.**
> **Review UI (human-facing): `docs/PIPELINE-PRODUCTION-SPEC-REVIEW.html`** —
> mở file này bằng browser; checklist D1-D8 trong đó là các điểm cần chốt.
> v2 thay v1: đối chiếu **Agent-Human Parity** (AGENTS.md rule #16) — v1 là
> hộp đen: agent chạy stages, user chỉ thấy approve/reject. v2: mỗi stage
> khai báo human surface (XEM + SỬA), mọi artifact là file chung, human edits
> = learning signal.

---

## 0. Nguyên tắc thiết kế

1. **Tool = pipeline stages + gates** (user correction 27/08: không 1 hàm).
2. **Agent-Human Parity — rule #16, ràng buộc kiến trúc, không phải tính năng
   thêm sau**: mọi artifact agent đọc/ghi thì human phải xem + sửa được qua UI
   cùng expressive power. Không stage nào ship thiếu human surface của nó.
3. **One artifact, two first-class editors**: mỗi artifact = 1 file (single
   source of truth) + agent tool (đọc/ghi qua file) + Composer UI panel (đọc/
   ghi qua API có optimistic locking — pattern `/api/project/editor` + revision
   hiện có). Conflict → 409 machinery có sẵn, không clobber.
4. **Human edits = learning signal cao cấp**: mọi lần human sửa artifact mà
   agent đã tạo → ghi DIFF (agent-version vs human-version) vào feedback.jsonl
   (knob=`voice.direction.sentence-3` v.v.) — đây là feedback dạng demonstration,
   mạnh hơn approve/reject (ILF research: feedback > demonstrations).
5. **Audio QC = deterministic số** (WER/LUFS/peak/duration) — VLM mù tiếng.
   Taste cuối = human gate.
6. **VO là đồng hồ**: voice-first timing coupling.
7. **Dựng trên cái có sẵn**: `isaacverse_voice.py`, `voice.ts` schema,
   `audio.tsx` AudioPlan/AudioMixer (DuckZones, master LUFS), whisperx
   transcriber, skills 05-audio numbers, `/api/project/editor` locking pattern,
   Asset Studio prompt-parity precedent.
8. **Provenance bắt buộc** + **learning hooks** mọi stage.

---

## 1. VOICE PIPELINE — `voice_pipeline` + Composer "Voice" panel

### Artifacts (files — single source of truth, cả 2 bên ghi)

| File | Nội dung | Human surface |
|---|---|---|
| `projects/<slug>/voice/plan.json` | VoicePlan mở rộng: sentences + batchId=beatId + deliveryCues + providerText + qcMetrics + takes + selection | **Voice Direction panel** |
| `projects/<slug>/voice/takes/*.wav` | Stems per batch/take (48kHz) | Takes & QC panel (audio players) |
| `projects/<slug>/voice/manifest.json` | Provenance + settings + costs + history | Hiện trong panel (read-only + history) |
| Beat timing patch | Đề xuất durationSec mới | **Timing diff view** (trước khi apply) |

### Stage map — mỗi stage có agent action + human surface + gate

| # | Stage | Agent làm gì | Human surface (XEM + SỬA) | Gate |
|---|---|---|---|---|
| A | **plan** | Script + beat map → sentences, batch per BEAT | Direction panel: danh sách beat ↔ câu; **user sửa text câu, tách/gộp batch** (sửa → bump revision, agent đọc lại) | mọi beat ≥1 batch |
| B | **direction** | Sinh `voice_performance` + per-batch `delivery_cues` + `providerText` (CHUỖI THẬT gửi ElevenLabs: tags/CAPS/breaks) | **Provider text field — như prompt Asset Studio: user thấy đúng chuỗi sẽ gửi, sửa trực tiếp** (thêm [pause], CAPS từ cần nhấn). Sửa = feedback diff | human review cues 1 lần |
| C | **sample gate** | Gen 1 take từ batch khó nhất + QC metrics | **Sample player + compare với scripted expectation; user SỬA direction rồi bấm "re-sample"** — không chỉ approve/reject | approve ≤3 iter (mỗi iter có thể là user-edit) |
| D | **generate** | Multi-take 2-3/batch, identical settings, `with-timestamps` | **Voice settings panel: voiceId, stability, style, speed — user chỉnh được** (edit = feedback về gu giọng) | settings so programmatic mỗi call |
| E | **qc** | WER (whisperx) ≤5%, clip ≥−0.5dB FAIL, duration ±15%, silence >1.5s, confidence <0.8 | **QC dashboard per take: badge PASS/FAIL + số (WER, LUFS, peak, dur) + audio player + transcript diff highlight** (từ sai chỗ nào) | take fail → loại; batch fail → regen |
| F | **select** | Best-take scoring (có sẵn) trên QC-passed | **Takes list per batch: play từng take, user ĐỔI take được** (override = feedback mạnh nhất về gu) | auto + human override |
| G | **post** | Chain: HPF 80 → denoise → EQ → comp 3:1 → 2-pass loudnorm −16/−1.5 | **Chain params = knobs trong style store** (fonts-parity precedent) → hiện trong panel; preview A/B trước/sau per take | loudnorm 2-pass |
| H | **timing** | Stem durations → beat durationSec proposal | **Timing diff view trong Composer: beat trước → sau, voice waveform overlay; user chỉnh padding từng beat trước khi apply** | apply qua patch (không hand-edit) |
| I | **mix-plan** | Emit AudioPlan (stems, music duck 18-20dB cut 2-4kHz, SFX, DuckZones, master −16/−1.5) | Composer đã có audio controls per track (gain/mute) — mix-plan artifacts hiện trong audio inspector | schema validate |
| J | **record** | Ghi KB + preferences | Đã có (human verdicts flow qua gates); THÊM: mọi human-edit diff từ B/C/D/F/H cũng ghi feedback.jsonl | — |

### Fixes bugs pipeline cũ (giữ từ v1)
directive extract nhưng KHÔNG áp vào text (giờ providerText là artifact user
xem/sửa được); batch không theo beat; không QC/WER; không timestamps; không
timing coupling. Quy tắc sắt provider text: không đổi TỪ, chỉ thêm tags/caps
— user edit cũng theo rule này (UI validate).

---

## 2. IMAGE SOURCING — `source_image` + Composer "Assets" panel

| Stage | Agent | Human surface (XEM + SỬA) |
|---|---|---|
| query build | Per beat: subject + mood + CHAI 3-pass | **Query card per beat — như prompt Asset Studio: user thấy query, sửa query, bấm re-search** (edit = feedback về query pattern) |
| fetch | Unsplash (Pexels fallback) | — |
| dedupe | Perceptual hash vs ảnh đã dùng mọi video | Dedupe log hiện trong panel |
| provenance | Photographer + license + URL + query | **Provenance badge trên mỗi ảnh** |
| cohesion | Grade từ style store | **Grade = knob** (user chỉnh toàn video) |
| relevance QC | VLM grounded presence check (AUTO được) | **QC verdict per ảnh (match/không) + user thay ảnh: chọn candidate khác hoặc upload ảnh own** (upload API có sẵn) |
| gate | — | Taste keep — sau khi user đã có thể chỉnh mọi thứ |

Output artifacts: `projects/<slug>/assets/images/manifest.json` (queries,
candidates, provenance, QC verdicts, selection) + files. Panel sửa manifest
qua API locking như voice.

## 3. TIMELINE GENERATION — `generate_timeline`

Wrap generate-editor cold + validate trước. **Human surface**: generation
report hiện trong Composer (clips generated, strict warnings, missing assets,
style version) — không nuốt warning trong stdout như hiện tại; user thấy và
bấm regenerate sau khi tự fix edit-doc qua editor hiện có.

## 4. EDIT-DOC VALIDATION — `validate_edit_doc`

Rules (contiguity, duration>0, assets tồn tại, cues resolvable, params đủ,
schemaVersion). **Human surface**: validation report panel — cùng report agent
đọc, render dạng checklist PASS/FAIL trong Composer; user fix bằng editor UI
hiện có rồi re-validate.

## 5. PROJECT SCAFFOLDING — `new_project`

Contract chuẩn. **Human surface**: project list + create đã có trong Composer.

---

## 6. API & LOCKING (đối xứng `/api/project/editor`)

Mọi production artifact qua cùng pattern:
- `GET /api/project/voice?projectId=` → plan.json + takes manifest
- `POST /api/project/voice` `{plan, expectedRevision}` → 409 nếu stale (như
  editor). Tương tự `/api/project/images` cho image manifest.
- Agent side: tool đọc file TRỰC TIẾP trước mỗi stage (không cache), ghi qua
  cùng file; revision bump bởi cả 2 bên; editor-ops bridge pattern (optimistic
  locking + retry) áp cho voice/images bridge operations.
- **Agent tool và UI là 2 client của cùng 1 file** — không có đường riêng nào.

## 7. LEARNING HOOKS (nâng cấp: edits ≠ chỉ verdicts)

- Mọi human EDIT trên artifact: diff (agent→human) ghi feedback.jsonl với
  knob cụ thể (`voice.direction.batch-3.providerText`,
  `image.query.beat-5`, `voice.take-selection.batch-2`)
- pattern_extractor mở rộng: nhóm edit-patterns (user hay sửa gì? caps? pause?
  query words?) → principle candidates
- voice-identity.md: settings thắng + lịch sử user overrides
- Nguyên tắc: **approve/reject là tín hiệu 1 bit; edit là tín hiệu đầy đủ** —
  học từ cả hai, ưu tiên edit.

## 8. ROADMAP v2 — parity ship CÙNG stage, không bolt-on sau

| M | Pipeline + UI cùng lúc | Tests |
|---|---|---|
| M1a | Voice core stages A-E + **Direction panel (provider text editable) + QC dashboard** | unit: text-prep mapping, QC thresholds; UI: panel render + edit → revision bump + 409 |
| M1b | Stages F-J + **Takes panel (player + override) + Timing diff view** | unit: scoring, timing math; E2E: 1 beat thật, user override take → feedback.jsonl có diff |
| M2 | Image sourcing + **Query cards + candidate grid + provenance** | unit: query builder, dedupe; E2E: 1 beat, user sửa query → re-search → feedback |
| M3 | Timeline/validate + **report panel**; mini-video 10-15s zero-manual | E2E produce |
| M4 | Mix-plan emit + audio inspector wiring | audio smoke |

Nguyên tắc里程碑: **mỗi M ship đủ cặp (agent stage + human surface)** — không
có "UI sau này".

## 9. PROGRESS LOG (vừa làm vừa ghi)

- **2026-08-27 tối (v2)**: user đối chiếu rule đồng quyền (AGENTS.md #16 —
  giờ mới persist vào constitution + memory) → audit v1: 10/10 stage voice +
  5/5 image là hộp đen (user chỉ approve/reject). Viết lại v2: artifacts là
  files + API locking đối xứng editor + human surface khai báo TỪNG STAGE
  (provider text editable như prompt Asset Studio, QC dashboard + players,
  take override, timing diff, query cards). Learning hooks nâng cấp: human
  edits = feedback đầy đủ (diff), không chỉ verdicts. Roadmap tách M1a/M1b
  để UI ship cùng stage.
- **2026-08-27 chiều (v1)**: research LUFS/ loudnorm (−16/−1.5, 2-pass),
  ElevenLabs (with-timestamps, v3 audio tags, v2 caps/dictionary), skills
  05-audio numbers; phát hiện `isaacverse_voice.py` + bugs (directive không
  áp, batch không theo beat, không QC/timestamps/timing). Spec v1.
