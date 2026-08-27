# Production Pipeline Spec — nửa "produce" của harness (Phase 2)

> **Status: DRAFT v1 — 2026-08-27. Chờ user duyệt trước khi implement.**
> **Review UI (human-facing): `docs/PIPELINE-PRODUCTION-SPEC-REVIEW.html`** —
> mở file này bằng browser; checklist D1-D6 trong đó là các điểm cần chốt.
> Bối cảnh: harness hiện là refinement-only (11 tool critique/fix, 0 tool
> produce — verified 27/08). Video #1 do builder (Kilo) làm tay. Flow chốt:
> produce → TỰ critique → TỰ fix → lặp → user review một lần.
> **Nguyên tắc từ user (27/08): production tool KHÔNG phải 1 hàm gọi API —
> mỗi tool là pipeline nhiều stage + QC gates + provenance + learning hooks.**

---

## 0. Nguyên tắc thiết kế

1. **Tool = pipeline stages + gates**, không phải wrapper mỏng. Mỗi stage có
   input/output rõ, gate fail thì dừng có kiểm chứng (fail loudly).
2. **Audio QC = deterministic số** (WER, LUFS, peak, duration drift) — VLM mù
   âm thanh (oracle-trust.md). Taste cuối cùng = human KEEP gate.
3. **VO là đồng hồ của video** (voice-first): measured duration của voice
   quyết định `durationSec` của beat, không phải ngược lại.
4. **Dựng trên cái có sẵn, không rebuild** — kho đã có nhiều hơn tưởng tượng:
   - `tools/audio/isaacverse_voice.py`: plan/generate/assemble/score_takes
     (sentence batching, multi-take, best-take scoring, EQ chain) — GIỮ, extend
   - `tools/audio/elevenlabs_tts.py` (registry tool) — GIỮ làm transport
   - `VoicePlan` schema (`voice.ts`) + `AudioPlan`/`AudioMixer` (`audio.tsx`:
     DuckZones, master targetLufs) — render side đã hiểu ducking/voice segments
   - whisperx `transcriber` (skills 05-audio): word-level timestamps → WER QC
   - `libraries/05-audio/skills.md`: toàn bộ con số quy chuẩn đã mine
     (sound-design, voice-performance-director, asset-director rules)
5. **Provenance bắt buộc** mọi stage (provider, settings, seed, license) —
   để agent học được cái gì tạo ra kết quả tốt, không phải đoán lại.
6. **Learning hooks**: mỗi tool ghi vào memory những gì human-approved
   (voice settings thắng, query pattern thắng, grade ID) — close the loop.

---

## 1. VOICE PIPELINE — `voice_pipeline` (ưu tiên #1: VO là đồng hồ)

Wrap + extend `isaacverse_voice.py`. Tool expose theo OPERATION (như hiện tại)
thêm operations mới; agent gọi từng stage, không nhảy cóc.

### Stage map

| # | Stage | Input → Output | Gate |
|---|---|---|---|
| A | **plan** | script + beat map → `VoicePlan` (batch per beat) | validate: mọi beat có ≥1 batch |
| B | **direction** | VoicePlan → per-batch `delivery_cues` + provider text prep | human review cues 1 lần |
| C | **sample gate** | 1 batch khó nhất → 1 sample take | **human approve (≤3 iter)** |
| D | **generate** | approved settings → multi-take (2-3) per batch, `with-timestamps` | settings identical mọi call |
| E | **qc** | takes → metrics | WER / clip / duration / silence gates |
| F | **select** | QC-passed takes → best per batch | auto (score có sẵn) |
| G | **post** | selected takes → per-batch WAV stems + chain | loudnorm 2-pass |
| H | **timing** | stems → beat `durationSec` proposal | patch qua editor_op/patch |
| I | **mix-plan** | stems + cues → `AudioPlan` (DuckZones, ambience, SFX) | schema validate |
| J | **record** | kết quả → memory (KB + preferences) | — |

### Chi tiết stage

**A. plan** — batch theo **BEAT**, không phải 2 câu tùy ý (bug hiện tại:
`batch_size=2` cắt tuỳ hứng, không khớp beat → không regen được per-beat).
Input thêm `beat_map: [{beatId, transcript}]` từ 05-edit-doc.json.
GIỮ: `sentence_parts()`, settings defaults (stability 0.35, similarity 0.75,
style 0.35 — từ pipeline cũ). SỬA: batch_id = beatId.

**B. direction** (nhấn nhá — ý user #1) — theo **voice-performance-director**
(skills 05-audio): top-level `voice_performance` (intent, pacing profile,
energy curve, pause policy) + per-batch `delivery_cues` (pace, energy,
emphasis_words, pause timing). Provider text prep:
- **multilingual_v2** (mặc định hiện tại): KHÔNG có phoneme tags → emphasis
  bằng CAPS + punctuation (ellipsis = pause); từ khó → pronunciation dictionary
  (≤3 locators/request) hoặc alias tags. QUY TẮC SẮT: không đổi từ, chỉ prepend
  tags + caps (ElevenLabs best-practices).
- **eleven_v3** (khi cần cảm xúc mạnh): audio tags `[pause]` `[whispers]`
  `[excited]` + IPA (80-90% consistent); KHÔNG có SSML break; stability mode
  Creative/Natural/Robust. Cảnh báo: quá nhiều break tags → instability
  artifacts; tag phải khớp tính cách giọng.
- SỬA bug hiện tại: `directive()` extract được emphasis/emotion nhưng
  `_generate()` gửi batch_text TRẦN — directive chưa bao giờ được áp vào text.
- Mapping directive → text prep là FUNCTION thuần có unit test.

**C. sample gate** (tiết kiệm + chất lượng — asset-director rules): trước khi
batch, generate đúng 1 take từ batch **khó nhất** (nhiều emphasis/pause nhất
— không phải batch đầu), kèm QC metrics. Human approve qua request_keep-style
interrupt (≤3 iterations). Flat-voice failure rule: monotone/rushed/miss pauses
→ KHÔNG batch — sửa direction rồi sample lại. Chi phí sample ~$0.03-0.08 phòng
waste $1-3.

**D. generate** — multi-take (2-3 take/batch, seed khác nhau). **Voice
consistency enforcement** (longform rule #1): identical provider settings trên
MỌI call, so programmatically, ghi `voice_consistency.identical_settings=true`.
Dùng endpoint **`with-timestamps`**: trả character-level alignment → word timing
→ (a) đề xuất pause offsets chính xác, (b) data cho subtitles sau này.
Settings: ElevenLabs mapping từ skills — stability thấp hơn (variation),
moderate style, speed 0.7-1.2, similarity_boost cao.

**E. qc** (xử lý chất lượng — ý user #3/#4, deterministic):
- **WER gate**: transcribe take (whisperx transcriber, word timestamps) → so
  với script → WER ≤ 5% (từ khóa: tên riêng/term kỹ thuật 0 sai).
- **Clip gate**: `max_volume` ≥ -0.5 dBFS → FAIL (lấy từ `audio_take_metrics`
  có sẵn).
- **Duration gate**: measured vs expected (chars/WPM heuristic + alignment)
  ±15% (asset-director rule).
- **Silence/garble**: trailing/leading silence > 1.5s flag; transcription
  confidence trung bình < 0.8 flag (whisperx probability).
- LUFS measure (pyloudnorm hoặc loudnorm print_format=json) — ghi số, chưa
  norm ở stage này.
Take fail QC → loại, dùng take khác; cả batch fail → báo để regen (không
nuốt lỗi).

**F. select** — GIỮ `choose_best_take`/`score_take_metrics` (dynamic range −
timing penalty − clipped penalty), lọc sẵn theo QC pass. Target duration dùng
alignment thực (không còn heuristic chars/14 khi có timestamps).

**G. post** (âm vang/tiếng phòng — ý user #3/#4) — chain TTS chuẩn từ
sound-design skills, áp PER BATCH STEM (stems giữ nguyên để re-mix), uniform
loudnorm ở cuối:
```
highpass=f=80 (HPF 80-100Hz)
afftdn (denoise — TTS artifacts)
equalizer=f=500:t=q:w=1:g=-3 (cut boxiness)
equalizer=f=3000:t=q:w=1.5:g=+2.5 (presence boost 2-5k)
[nếu artifact 6-8k: notch cut]
acompressor=threshold=-26dB:ratio=3:attack=2:release=15 (3:1, TTS cần comp hơn human)
loudnorm 2-PASS I=-16:TP=-1.5:LRA=11 (linear=true) — YouTube/streaming target
```
LƯU Ý "tiếng phòng/âm vang": VO TTS giữ KHÔ (dry) — room feel đến từ
**ambience bed** + **ducking** (AudioPlan đã model: `ambience`, `DuckZone`,
master `targetLufs`), KHÔNG reverb trực tiếp vào voice (reverb vào TTS = muddiness
— sound-design rule). Chỉ scene đánh dấu `bigSpace: true` mới thêm light room
send (aecho nhẹ, knob-gated `voice.roomSend`) — default OFF.

**H. timing coupling** (cái bỏ sót lớn nhất) — measured duration từng stem →
đề xuất beat `durationSec = stem + pauseBefore + breathPad(0.25-0.4s)`, tổng ≥
voice. Output = **patch proposal** áp qua editor_op/patch (KHÔNG hand-edit
current.json — invariant). Nếu VO > planned ×1.05 → flag cho script rewrite
(longform rule), không tự kéo beat vô hạn.

**I. mix-plan** — emit `AudioPlan` schema có sẵn: voice segments (stems +
offsets), music beds (duck 18-20dB under VO, cut 2-4kHz music band), SFX cues
(whoosh lead 10-20ms, levels theo skills), DuckZones (6-12dB duck, 22dB cho
educational phức tạp), master `{targetLufs: -16, maxTruePeakDbfs: -1.5,
limiter: true}`. Render side (AudioMixer) đã consume schema này — không cần
render thay đổi.

**J. record** — voice identity + settings + take selection + QC scores +
human sample verdict → `harness/memories/` (KB entry + preferences.jsonl qua
request_keep). Principle ví dụ: "stability 0.35 + style 0.35 phù hợp topic
tech; voice X giữ làm identity kênh".

### Data flow (không đổi schema render)

`VoicePlan` mở rộng (batchId=beatId, deliveryCues, qcMetrics, alignment) —
backward-compatible: mọi field mới optional. Stems + manifest ghi
`projects/<slug>/voice/` (stems WAV 48kHz, manifest JSON). `dubbing/` giữ cho
dub flow sau.

---

## 2. IMAGE SOURCING — `source_image` pipeline

| Stage | Nội dung |
|---|---|
| query build | per beat: subject (script semantics) + visual anchor + mood/màu → prompt; **CHAI 3-pass self-review** (draft → critique 5-aspects → rewrite — asset-director rule) |
| fetch | Unsplash (Pexels fallback khi key fixed); orientation/size filter |
| dedupe | perceptual hash vs các video trước (không tái sử dụng ảnh đã dùng) |
| provenance | photographer + license + URL + query → manifest (bắt buộc) |
| cohesion | grade từ style store (một hệ filter); KHÔNG dán cover mỗi ảnh một kiểu |
| relevance QC | VLM AUTO được (presence/subject match — local high-contrast + grounded prompt theo oracle-trust); fail → query lại (≤2 vòng) |
| gate | request_keep cho taste (human) |
| learning | query pattern thắng → KB |

---

## 3. TIMELINE GENERATION — `generate_timeline`

Wrap `generate-editor.mjs` cold mode + BẮT BUỘC qua `validate_edit_doc` trước.
Output structured JSON cho agent tự chẩn đoán: clips generated, strict
projection warnings, missing assets, style version applied, backup path.
Không nuốt warning (hiện tại warnings in stdout — agent không thấy).

## 4. EDIT-DOC VALIDATION — `validate_edit_doc`

Rules: beats contiguous (start[i+1] == end[i]), durationSec > 0, assets tồn
tại trên disk (theo src path), audio cues resolvable (src tồn tại), treatment
params đủ fields bắt buộc per treatment id, schemaVersion hiện hành, không
clip id trùng. Return: `{ok, errors[], warnings[]}` structured.

## 5. PROJECT SCAFFOLDING — `new_project`

`00-state.json` + 7 dirs chuẩn + public sync + projects registry list.
Đơn giản thật — nhưng contract đúng (schemaVersion, slug regex) mới không
gãy ở các tool sau.

---

## 6. AGENT SURFACE & PROTOCOL

- Mỗi pipeline = 1 tool, nhiều `operation`; kết quả luôn structured JSON
  (metrics, warnings, artifacts) — agent đọc để tự quyết bước tiếp.
- Budget tier: produce run ≤ 40 calls (rule 11 đã tier), mỗi stage-gate là
  điểm dừng tự nhiên.
- Gates cho human: sample approval (voice), image taste keep, final keep.
  Builder KHÔNG chạy thay agent — builder chỉ duyệt gate (như font A/B).
- Agent KHÔNG có shell → các operations mới expose qua harness_tools.py
  (wrap tools/audio BaseTool qua registry, hoặc port logic vào harness_tools).

## 7. LEARNING HOOKS (schema additions)

- `voice-identity.md` (memories): voice đang dùng + settings + verdict history
- preferences.jsonl: mở rộng knob=`voice.settings.*`, `image.query-pattern`
- KB entries: mỗi production run (chi phí, QC numbers, quyết định)

## 8. ROADMAP

| Milestone | Nội dung | Tests |
|---|---|---|
| M1 | Voice core: batch-per-beat, direction→text-prep, sample gate, QC gates (WER/clip/duration), timing coupling, post chain 2-pass | unit: text-prep mapping, QC thresholds, timing math; E2E: 1 beat thật |
| M2 | Image sourcing: query CHAI, dedupe, provenance, relevance QC | unit: query builder, dedupe; E2E: 1 beat |
| M3 | Timeline/validation/scaffold + structured warnings | unit rules; E2E produce mini-video 10-15s zero-manual |
| M4 | Mix-plan emit + DuckZones + master targets (render đã sẵn) | parity audio smoke |

## 9. PROGRESS LOG (vừa làm vừa ghi — traceability)

- **2026-08-27 tối**: research LUFS/loudnorm (YouTube -16 LUFS, TP -1.5, 2-pass
  linear=true), ElevenLabs capabilities (with-timestamps char alignment; v3
  audio tags KHÔNG SSML; v2 CAPS/dictionary; nhiều break = instability),
  khoá học skills 05-audio đã mine đủ số chuẩn (sound-design chain, ±15%,
  voice-performance-director, sample gate ≤3, voice consistency enforcement).
  Phát hiện `isaacverse_voice.py` tồn tại (plan/generate/assemble/score) +
  bug: directive extract nhưng KHÔNG áp vào text, batch không theo beat, thiếu
  QC/WER/timestamps/timing-coupling. Spec v1 viết — chờ duyệt.
