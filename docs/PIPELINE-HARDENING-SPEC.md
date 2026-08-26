# Pipeline Hardening Spec — 6 điểm yếu dễ vỡ nhất + giải pháp chi tiết

> Status: **APPROVED + Đợt 1 SHIPPED 2026-08-26** (commits bb404b5..59e3c68).
> Đợt 2-3: chờ triển khai theo roadmap dưới.
> Written 2026-08-26 chiều, từ buổi deep-dive kiến trúc sau night run E2 parity.
> Research-backed — mọi giải pháp đều có căn cứ nghiên cứu hoặc precedent nội bộ,
> không đề xuất theo bản năng (citations inline từng phần).
> Related: `GENERATOR-SPEC.md` (kiến trúc đang được harden), `TODO-NEXT.md` (roadmap).

---

## 0. Bối cảnh — vì sao có spec này

Đêm 25-26/08: E2 parity gate PASS (semantic-diagram 1.222, process-timeline 1.266),
default render path flipped sang editor, Playwright E2E 13/13, reviewer bắt B1 MAJOR.
Hệ thống "hoạt động" — nhưng buổi deep-dive sau đó chỉ ra **6 điểm yếu** mà chung một
đặc tính nguy hiểm: **vẻ ngoài hoạt động bình thường khi đang hỏng** (silent failure).

Tiêu chí xếp hạng: **im lặng (silent) × lan truyền (blast radius) × phát hiện muộn
(detection lag)**. Crash ồn ào là TỐT (thấy ngay, sửa ngay) — nguy hiểm nhất là
chỗ hỏng im lặng, lan truyền, chỉ phát hiện ở điểm đắt nhất của pipeline.

Ba nguồn chính cho thiết kế:

| Nguồn research | Bài học áp dụng |
|---|---|
| **Figma components** (blog "How We Rebuilt the Foundations of Component Instances", 03/2026 + API docs) | Per-field override ledger (`overriddenFields[]`), restricted override surface, push overrides to main, reset — pattern trùng khớp hệ mình; Figma rebuild sau 10 năm = reconciliation là bài genuinely hard |
| **Redux Persist migrations** (docs/migrations.md) | `version` field + migration registry áp tuần tự tại boundary — giải pháp kinh điển cho persisted JSON schema evolution |
| **VLM research 2026** (TimeCatch arXiv 2608.23474, TimeBlind arXiv 2602.00288, REVEAL arXiv 2602.11244, SoM arXiv 2310.11441, GCoT CVPR 2026, Visual Thoughts NeurIPS 2025) | VLM gần random cho temporal/spot-the-diff NHƯNG mạnh cho frame-level semantic — vấn đề là prompt design, không phải model |

---

## 1. Tổng quan 6 điểm yếu + giải pháp

| # | Điểm yếu | Lớp lỗi | Giải pháp cốt lõi | Căn cứ | Effort |
|---|---|---|---|---|---|
| 6 | **Schema silent degradation trong sync** | Sai + Thiếu | `schemaVersion` + migration registry + validate output + accessor warnings | Redux Persist `createMigrate` | 3-4h |
| 1 | **Sync seam** (giữa EditDoc / style store / EditorDoc) | Thiếu/Dư/Sai | Chain `update_style`→generate + per-field override ledger + edited-fixture tests | Figma `overriddenFields[]` + spec risk #1 | 1h + 1-2 ngày |
| 2 | **KEEP gate duyệt trên render stale** | Sai | Revision stamping + freshness assertion | Read-your-writes / ETag pattern | 1-2h |
| 3 | **VLM oracle hỏi sai task** | Sai | SoM overlay + grounded structured prompts + verification layer + task classification | SoM, GCoT, Visual Thoughts, TimeCatch | 1 buổi |
| 4 | **Style store nhiễm bẩn, không rollback** | Lan truyền | Versioned snapshots + rollback tool + 1-principle-per-promotion + correlation check | Precedent nội bộ `rollbackVersion` + canary principle | 2-3h |
| 5 | **Concurrency agent↔human trên editor/current.json** | Dư (lost update) | Bridge tham gia optimistic locking | Pattern có sẵn trong UI (409) | 1h |

---

## 2. Research grounding chi tiết

### 2.1 Figma components — pattern trùng hệ mình

Figma component model map 1-1 sang hệ mình:

| Figma | Hệ mình |
|---|---|
| Main component | (EditDoc + style store) → projection |
| Instance | EditorDoc clip |
| Local override | `userEdited` ledger |
| Edit main → instances auto-update | sync generator |
| **Push overrides to main component** | **chưa có** (đẩy edit người ngược lên style knob) |
| Reset overrides | regenerate clip |
| `overrides: {id, overriddenFields[]}` API | **mình chỉ có boolean per-clip** — Figma track FIELD nào |

Điểm Figma làm hơn mình:
1. **Field-level ledger**: update được fontSize của instance mà người đã di chuyển
   vị trí (chỉ position là override). Mình giữ nguyên cả clip + stale spam.
2. **Restricted override surface**: "You can't override: layer order, positions
   of layers within, constraints... you must detach" — đánh đổi biểu đạt để merge
   tractable. Mình cho override mọi thứ.
3. **10 năm vẫn phải rebuild foundations** ("back-dirties", invalidation cascades)
   — bằng chứng reconciliation là bài hard kể cả với công ty ~$10B.

### 2.2 Redux Persist migrations — chuẩn cho schema evolution

```js
// pattern redux-persist: version + migrations áp tuần tự từ persisted → current
const migrations = {
  1: (state) => ({ ...state, auth: migrateV0toV1(state.auth) }),
  2: (state) => ({ ...state, geometry: undefined }),
};
const config = { key: 'primary', version: 2, migrate: createMigrate(migrations) };
```

Nguyên tắc rút ra: **migrate MỘT chỗ duy nhất tại boundary, mọi consumer gọi chung
một hàm** — đóng đúng GENERATOR-SPEC risk #3 ("fold these into the generator so
the persisted doc is canonical, not a load-time fixup").

### 2.3 VLM research — chẩn đoán chính xác điểm mạnh/yếu

**Điểm YẾU (đã chứng minh bằng benchmark):**
- TimeCatch: VLM detect temporal anomaly (swap frame liền kề) **gần random**
  (max 57.4%) trong khi human near-ceiling — frame-level anomaly thì detect tốt.
- TimeBlind: minimal-pairs (cùng static, khác temporal) — model tốt nhất 48.2%
  vs human 98.2%; tăng frames/reasoning chỉ +3.3%.
- REVEAL: mô tả tự tin cảnh chạy ngược là chạy xuôi.
- Visual Thoughts: **spot-the-difference là task "Hardest-to-Describe"** — chính
  là task mình đã hỏi VLM đêm qua ("hai frame khác gì?").

**Điểm MẠNH (đã chứng minh):**
- Set-of-Mark (Microsoft): overlay số lên regions → GPT-4V **vượt fine-tuned
  specialist** trên RefCOCOg zero-shot. Đánh số biến suy luận không gian mơ hồ
  → tham chiếu rời rạc.
- GCoT (CVPR 2026): yêu cầu bbox cùng nhận định → expose hallucination
  (answer-grounding consistency chỉ 15-36% nếu không grounding-first).
- Visual Thoughts: structured visual thoughts (output có field) hiệu quả hơn
  natural-language tự do; concise > verbose.

**Kết luận thiết kế:** VLM KHÔNG bỏ, KHÔNG chạy local — **hỏi đúng task với
đúng prompt technique**. Detection (có đổi không?) = deterministic; Localization
(đổi ở đâu?) = deterministic; **Semantic interpretation (đổi CÁI GÌ?) = VLM với
SoM + grounding + verification**; Judgment (đẹp không?) = human.

### 2.4 Industry taxonomy — ai giải quyết kiểu gì

| Hệ thống | Cách xử lý agent+human co-editing |Trade-off |
|---|---|---|
| Descript Underlord | Agent = operator trên 1 doc (transcript = timeline), operations-based, không re-projection | An toàn nhưng agent không học gu systematic |
| Runway/Opus | Output disposable, regenerate tự do | Không craft để bảo vệ → không merge problem |
| **Figma components** | **Source + derived-with-overrides + merge** (= hệ mình) | Phức tạp nhưng duy nhất hỗ trợ cả learning lẫn craft |
| Generated code (protobuf/OpenAPI) | Protected regions + regeneration | Merge thô per-region |

Hệ mình chọn pattern Figma vì có tính năng mà không ai trong ngành video có:
**agent học gu thẩm mỹ + re-apply systematic lên timeline người đang chỉnh**.
Cái giá là merge machinery — và spec này là về làm cho machinery đó không vỡ.

---

## 3. Chi tiết thiết kế từng giải pháp

### 3.1 #6 — Schema versioning + validation (làm TRƯỚC, chuẩn ngành nhất)

**Vấn đề recap (đã verify trong code):**

| Hiện tượng | Bằng chứng |
|---|---|
| Sync không validate schema | grep `generate-editor.mjs`: zero validate/schema calls |
| Accessor mềm nuốt lỗi | `asArr(p.nodes)` → [] → beat trống trơn KHÔNG lỗi |
| Migrations chạy load-time, sync đọc raw | `migrateElementGeometry` ở `VideoEditor.tsx:226/242`, không có trong generate-editor → preview (migrated) ≠ render (raw) |
| Semantic drift không version marker | đêm qua đổi edge x1/y1 px → viewBox units; clip cũ px render lệch 8.8× màn hình; sync refresh 91+98 clips cứu, nhưng 2 userEdited clip sống sót nhờ MAY (không phải edge) |
| Không validate output trước ghi | doc xấu lan xuống renderer, renderer defensive-fallback che tiếp |

**Thiết kế:**

```ts
// MỚI: remotion-composer/shared/isaacverse/editorMigrations.ts
export const CURRENT_EDITOR_SCHEMA = 3;

/** Migration registry — áp TUẦN TỰ từ doc.schemaVersion → CURRENT.
 *  Mỗi entry: (doc) => doc. Idempotent bắt buộc: migrate(migrate(x)) === migrate(x). */
const MIGRATIONS: Record<number, (doc: EditorDoc) => EditorDoc> = {
  // v0/v1: doc chưa có schemaVersion — fold load-time migrations vào đây
  1: (doc) => normalizeTrackNames(migrateElementGeometry(doc, doc.width, doc.height)),
  // v2: edge clips x1/y1 px → viewBox units (thay đổi đêm 25-26/08)
  2: (doc) => ({
    ...doc,
    tracks: doc.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) =>
        c.metadata?.elementType === "edge" && (c.metadata.x1 ?? 0) > 100
          ? { ...c, metadata: { ...c.metadata, x1: (c.metadata.x1 / 1920) * 100, y1: (c.metadata.y1 / 1080) * 100, x2: (c.metadata.x2 / 1920) * 100, y2: (c.metadata.y2 / 1080) * 100 } }
          : c,
      )),
    })),
  }),
};

export function migrateEditorDoc(doc: EditorDoc): EditorDoc {
  let v = doc.schemaVersion ?? 1;
  while (v < CURRENT_EDITOR_SCHEMA) {
    doc = MIGRATIONS[v](doc);
    v += 1;
  }
  return { ...doc, schemaVersion: CURRENT_EDITOR_SCHEMA };
}
```

**Điểm áp dụng — MỌI boundary đọc `editor/current.json` (một hàm duy nhất):**
1. `generate-editor.mjs` — migrate TRƯỚC khi three-way merge (và ghi schemaVersion mới vào output)
2. `editor-ops.mjs` — migrate trước khi apply op
3. `ProjectLoader.tsx` / render bundle path — migrate sau fetch (thay load-time fixup trong VideoEditor)
4. Composer UI load — gọi chung hàm (bỏ migrate rải rác ở VideoEditor.tsx:226/242)

**Kèm 2 việc:**

*a) Validate output trước khi ghi* (đóng cửa silent-corrupt):
```ts
// trong generate-editor.mjs + editor-ops.mjs, trước writeFileSync:
const issues = validateEditorDoc(result);  // dùng validate.ts/schema.ts có sẵn
if (issues.length > 0) {
  console.error("EDITOR DOC INVALID — refusing to write:", issues);
  process.exit(1);  // FAIL LOUDLY — triết lệ lenient giữ ở INPUT, OUTPUT phải hợp lệ
}
```

*b) Accessor warning trail* (không chặn, nhưng để lại vết):
```ts
// strict-wrapper cho sync mode: asNum/asStr/asArr ghi warning khi fallback ăn vào
// output summary JSON thêm: "warnings": ["beat final-beat-02: params.nodes missing — projecting empty"]
```

**Test:**
- Fixture doc schema-1 (geometry px, edge px) → migrate → assert fraction + viewBox units
- Idempotency: `migrateEditorDoc(migrateEditorDoc(x))` deep-equal `migrateEditorDoc(x)`
- Sync test: doc cũ + sync → output hợp lệ + schemaVersion mới
- Validate test: doc故意 hỏng (range start > end) → sync REFUSE với error list

**Files đụng:** mới `editorMigrations.ts`; sửa `generate-editor.mjs`, `editor-ops.mjs`, `ProjectLoader.tsx`, `VideoEditor.tsx` (bỏ migrate inline), `editor.ts` (thêm schemaVersion field).

---

### 3.2 #1 — Sync seam (3 phần: 1a rẻ làm ngay, 1b đắt làm sau, 1c test)

**Vấn đề recap:** sync là điểm DUY NHẤT 3 lớp reconciliation. Bug thật đã xảy ra:
update_style không chain generate (LIVE gap), B1 overlay clip, render-window sync
regression, per-clip boolean ledger over-stale.

#### 1a. Chain `update_style → generate` (đóng lỗ sống, 1h)

```python
# harness/harness_tools.py update_style — sau khi ghi store + bump version:
treatment_id = parse_treatment_from_path(style_path)
# "treatments.semantic-diagram.node.fontSize" → "semantic-diagram"
# "colors.amber" → None (global knob)
if treatment_id:
    affected = [b.id for b in editdoc.beats if b.treatment.id == treatment_id]
    for beat in affected:
        run(["node", GENERATE_EDITOR, "--project", slug, "--beat", beat])
else:
    run(["node", GENERATE_EDITOR, "--project", slug, "--mode", "sync"])
# render sau đó tự thấy thay đổi — đúng GENERATOR-SPEC risk #1 dòng 196-200
```

#### 1b. Per-field override ledger — Figma pattern (1-2 ngày, session riêng)

**Thiết kế:**
```ts
// metadata mới — thay userEdited: true:
metadata.overridden: { range: true, x: true, y: true }  // FIELD nào bị op chạm

// editorOperations.ts là chỗ DUY NHẤT mark — mỗi op biết mình chạm field nào:
// trimClipRange     → { range: true }
// moveClipInTime    → { range: true }
// setEditorClipMetadata(key) → { [key]: true }
// splitClipRange    → parts mang overridden: { range: true } + splitFrom marker
```

**Sync merge mới:**
```
- clip không overridden    → regenerate toàn bộ (như cũ)
- clip overridden field F  → GIỮ F, regenerate phần còn lại từ projection mới
  (fontSize mới đến được, vị trí tay giữ nguyên)
```

**Migration 3 trong editorMigrations:** `userEdited: true` cũ →
`overridden: { all: true }` (giữ semantics cũ cho docs tồn tại — an toàn).

**Không trộn vào đợt hotfix** — việc lớn, cần session riêng + test kỹ.

#### 1c. Edited-fixture sync tests (B1-class, 2-3h)

```js
// generate-editor.test.mjs — fixture mới:
// doc có: beat đã split + overlay spanning qua split + 2 clip userEdited
//        + 1 id trong userDeletedClipIds
// chạy sync → assert:
//   - overlay KHÔNG bị clip (B1 regression test)
//   - userEdited clips giữ nguyên
//   - deleted id không sống lại
//   - markers đúng
```

---

### 3.3 #2 — KEEP gate revision stamping (giết "duyệt trên hư cấu")

**Vấn đề recap:** human duyệt render diff — nếu render stale thì duyệt trên thứ
không tồn tại. Đã xảy ra thật (đêm E6: render-window không sync live doc suốt
vài tiếng — mọi approval trong khoảng đó dựa trên render không chứa edit thật).

**Thiết kế:**

```
render-window.mjs: khi render xong → ghi sidecar report JSON cạnh output:
{
  "outputPath": "...",
  "renderedFromRevision": 39,        // revision của doc ĐANG render (đọc lúc render)
  "docHash": "sha1:abc123...",       // hash nội dung doc
  "renderedAt": "2026-08-26T17:00:00Z"
}

harness request_keep: TRƯỚC KHI hỏi human:
  current_rev = đọc editor/current.json revision
  render_report = đọc sidecar của video sẽ duyệt
  if current_rev != render_report.renderedFromRevision:
    REFUSE: "RENDER STALE (rendered r39, current r41) — re-render trước khi duyệt"
```

**Về lâu dài:** hash doc vào output metadata (stdout JSON của render-window đã
có chỗ nhét). Pattern = ETag/cache validation (read-your-writes consistency).

**Test:** giả lập render từ revision cũ + doc đã nhảy revision → request_keep
phải REFUSE với message rõ ràng.

---

### 3.4 #3 — VLM prompting pipeline (thiết kế mới sau research, 1 buổi)

**Chẩn đoán (từ research 2.3):** VLM không yếu — mình HỎI SAI. Đêm qua hỏi
"hai frame khác nhau chỗ nào?" = spot-the-difference = task Hardest-to-Describe
(Visual Thoughts) + đúng vùng temporal blindness (TimeCatch). Giải pháp: hỏi
đúng task (frame-level semantic) với đúng technique (SoM + grounding + structured).

#### Pipeline 5 bước

```
Step 1: DETERMINISTIC pre-processing (đã có, <100ms)
  compare_renders pixel-diff → region-block analysis
  → output: changed_regions = [{id: 3, bbox, diff_score}, ...]

Step 2: SoM OVERLAY (mới, ~50ms, PIL)
  render frame A + frame B với SỐ overlay lên các changed_regions
  (vùng diff cao nhất = "①", thứ 2 = "②", ...)
  → output: marked_A.png, marked_B.png

Step 3: VLM API (frontier: GPT-5 / Gemini-3-Pro / Claude Opus 4.5 — KHÔNG local)
  với GROUNDED + STRUCTURED prompt (template dưới)
  → output JSON per region

Step 4: VERIFICATION (deterministic, ~10ms)
  VLM bbox vs pixel-diff region → IoU > 0.3? → TIN
  IoU thấp / "not_found" → flag UNRELIABLE → defer human

Step 5: TASK ROUTING (quyết định cuối)
  - Frame-level semantic (element có/không, nội dung, màu, OCR):
    VLM + verify → AUTO được phép
  - Aesthetic (đẹp/xấu, composition): HUMAN luôn
  - Motion/temporal (timing, pacing, animation): deterministic temporal
    profile (frame-diff theo thời gian) → flag → HUMAN
```

#### Prompt template (grounded + structured — không free-form)

```
System: "You are a precise visual QA analyst. You MUST ground every claim
in a bounding box. If you cannot locate an element, output 'not_found'.
Never guess."

User: [marked_A.png] [marked_B.png]
"I numbered the regions with the largest pixel differences between these
two frames (LEFT = version A, RIGHT = version B). For EACH numbered region,
output JSON:
{
  "region": <số>,
  "element_type": "text" | "image" | "shape" | "character" | "empty",
  "present_in": "left_only" | "right_only" | "both",
  "bbox": [x1, y1, x2, y2],       // REQUIRED — where you see it
  "semantic_note": "<1 câu ngắn, vd: 'orange gradient title text, uppercase'>"
}
Rules:
- bbox in pixels of the frame (1920x1080)
- If you cannot see the element in a region, bbox = null + semantic_note = 'not_found'
- Do NOT describe regions that were not numbered"
```

#### Ví dụ before/after (so với đêm qua)

**Đêm qua (SAI — spot-the-diff free-form):**
> gửi side-by-side → *"List every visual difference"* → VLM: "BEGIN box missing
> on the right" (hallucination — không có box nào) → agent bị lừa.

**Đúng cách:**
1. Pixel-diff: region (768-960, 324-432) changed 70% → overlay "③"
2. VLM: *"Vùng ③: element_type? present_in? bbox?"*
3. VLM trả lời: `{"region": 3, "element_type": "text", "present_in": "right_only", "bbox": [770, 325, 950, 430], "semantic_note": "cyan uppercase kicker text"}`
4. Verify: bbox [770,325,950,430] vs pixel-diff region IoU > 0.3 ✓ → TIN
   → biết SEMANTIC (text cyan, có ở 1 bên) mà pixel-diff không tự biết được

#### Task classification table (cập nhật oracle-trust.md)

| Task | Hỏi VLM? | Tool | Auto? |
|---|---|---|---|
| Element có/không trong vùng (presence) | ✓ SoM + bbox | VLM + verify | AUTO được |
| Nội dung text (OCR) | ✓ | VLM + verify | AUTO được |
| Màu / hình dạng / loại element | ✓ | VLM + verify | AUTO được |
| Vùng nào khác nhau (localization) | ✗ | pixel-diff region-block | AUTO |
| Có thay đổi motion không (detection) | ✗ | temporal frame-diff profile | AUTO |
| Motion đẹp/xấu (temporal judgment) | ✗ — VLM gần random (TimeCatch) | HUMAN | ASK luôn |
| Composition đẹp/xấu (aesthetic) | ✗ | HUMAN | ASK luôn |
| "Hai frame khác gì?" (spot-the-diff) | ✗ TUYỆT ĐỐI không hỏi | deterministic + SoM→semantic | — |

#### Implementation

- `harness/vlm_qa.py` (mới): SoM overlay (PIL draw số lên changed regions) +
  prompt builder + response parser + IoU verification
- `harness_tools.py` `visual_critique` → refactor gọi vlm_qa pipeline
  (giữ API name cho protocol v5 tương thích)
- `harness/memories/oracle-trust.md` → viết lại: task table trên + 4 citations
  (TimeCatch, TimeBlind, REVEAL, SoM) + template prompt
- VLM config: ưu tiên frontier API (OpenRouter đã có key); glm-4v-flash giữ
  làm fallback rẻ cho task presence đơn giản

**Test:**
- Fixture: 2 frame khác 1 element đã biết → pipeline phải detect đúng region +
  VLM semantic đúng + IoU pass
- Hallucination test: prompt bắt buộc bbox → VLM trả not_found cho vùng trống
- Golden prompt test: cùng input → output parse được JSON (schema check)

---

### 3.5 #4 — Style store rollback + blast-radius control

**Vấn đề recap:** 1 principle sai → MỌI treatment → MỌI video sau. Lan truyền
lớn nhất hệ thống. Hiện CHỈ có git history (verify: không có style rollback
tool — `rollbackVersion` chỉ tồn tại cho EditDoc). Đêm pattern-learning promote
5 principles một lúc — rollback không tách được cái nào sai.

**Thiết kế:**

```
a) Snapshot: mỗi lần write gate promote → ghi copy
   libraries/04-visual/style-versions/v073.json, v074.json...
   (giữ nguyên file chính isaacverse-style.json cho runtime)

b) Tool style_rollback(target_version) — @tool, approval-gated (giữ KEEP gate):
   - khôi phục từ snapshot
   - bump version MỚI (không ghi đè lịch sử — audit trail giữ)
   - auto-run generate sync (editor doc refresh theo gu cũ)
   - log vào knowledge-base: reason rollback

c) Protocol write gate (harness/memories/AGENTS.md):
   MỖI lần promote TỐI ĐA 1 principle
   → rollback luôn tách bạch, diff luôn đọc được

d) minSupport correlation check (pattern_extractor):
   2 evidence phải đến từ ≥2 video khác nhau HOẶC ≥2 session feedback khác nhau
   (không tính 2 feedback cùng nguồn là "độc lập")

e) Post-promotion smoke (tùy chọn, rẻ):
   promote xong → render 1 window chuẩn + pixel-diff vs trước promote
   → diff bất thường (mean > ngưỡng) → tự động flag cho human
```

**Precedent:** `rollbackVersion` của project store (có sẵn `expectedBaseVersion`
guard) — copy pattern.

**Test:** promote → rollback → assert store content == snapshot + version bumped
+ sync đã chạy. Correlation check: 2 evidence cùng video → từ chối promote.

---

### 3.6 #5 — Concurrency: bridge tham gia optimistic locking

**Vấn đề recap (đã verify):** Composer save CÓ optimistic locking
(`vite.config.ts:125` — `expectedEditVersion` → 409). Bridge `editor-ops.mjs`
KHÔNG check version — đọc file, apply op, ghi file (blind). Human đang kéo-thả
trong Composer + agent chạy `editor_op` cùng lúc → lost update im lặng.

**Thiết kế:**

```
editor-ops.mjs:
  read doc → ghi nhớ revision R
  apply op
  TRƯỚC KHI GHI: re-read file
    revision vẫn R?  → ghi (bump R+1)
    revision đổi?    → exit 1:
      "CONFLICT: editor doc moved (r39 → r41) — op aborted, re-read và retry"

harness editor_op: gặp CONFLICT → re-read + retry 1 lần (op là idempotent
theo clipId nên retry an toàn)
```

**Test:** giả lập: đọc doc → ghi đè file từ ngoài → op cố ghi → phải exit 1
với CONFLICT message, file không bị ghi đè.

---

## 4. Roadmap thực thi (3 đợt, lean — rẻ & giết rủi ro lớn trước)

### Đợt 1 — "Giết im lặng" (~1 ngày làm việc)

| # | Việc | Spec | Effort | Giết được |
|---|---|---|---|---|
| 1 | Revision stamping + KEEP freshness assertion | §3.3 | 1-2h | Cả lớp "duyệt trên hư cấu" |
| 2 | Bridge optimistic locking | §3.6 | 1h | Lost update agent↔human |
| 3 | Chain update_style → generate | §3.2-1a | 1h | Lỗ "sync thiếu" đang sống |
| 4 | Schema versioning + validate output + accessor warnings | §3.1 | 3-4h | Schema silent degradation + risk #3 + semantic drift |

Verify cuối đợt 1: full test suite + parity gate re-run + CI xanh.

### Đợt 2 — "Giết lan truyền" (~1 ngày)

| # | Việc | Spec | Effort |
|---|---|---|---|
| 5 | Style rollback tool + 1-principle-per-promote + correlation check | §3.5 | 2-3h |
| 6 | Edited-fixture sync tests (B1-class) | §3.2-1c | 2-3h |
| 7 | VLM prompting pipeline: SoM + grounded structured + verification + oracle-trust rewrite | §3.4 | 1 buổi |

### Đợt 3 — Riêng một session (1-2 ngày, KHÔNG trộn)

| # | Việc | Spec | Effort |
|---|---|---|---|
| 8 | Per-field override ledger (Figma pattern) + migration 3 | §3.2-1b | 1-2 ngày |

### Song song (bất cứ lúc nào, không phụ thuộc)

- Parity residuals 4 treatment (chapter-card 2.28, cinematic 3.24, candidate
  3.45, host-reflection 5.9-6.3) — method đã có pattern từ đêm 25-26
- Playwright batch 3 (marquee, guides, gen panel mock, recipes CRUD mock)

---

## 5. Test plan tổng

| Lớp | Test | Nơi |
|---|---|---|
| Migration | fixture schema cũ → migrate → assert + idempotency | `editorMigrations.test.ts` (mới) |
| Validate output | doc hỏng → sync REFUSE | `generate-editor.test.mjs` mở rộng |
| Merge | edited-fixture (split + spanning overlay + deleted ids) | `generate-editor.test.mjs` mở rộng |
| Freshness | render stale → request_keep REFUSE | `harness/test_unit.py` mở rộng |
| Concurrency | revision đổi giữa chừng → op CONFLICT | `editor-ops` test |
| Style rollback | promote → rollback → content + version + sync | `harness/test_unit.py` |
| VLM pipeline | SoM fixture + hallucination not_found + JSON schema | `harness/test_vlm_qa.py` (mới) |
| Parity gate | 2 window chuẩn re-run sau mọi đợt | `parity-measure.mjs` |

---

## 6. Acceptance criteria

Đợt 1 xong khi: **— HOÀN TẤT 26/08 (CI xanh 3 workflows)**
- [x] request_keep từ chối render stale (5 tests PASS)
- [x] editor_op conflict → exit 1 + CONFLICT payload, file byte-identical (2 tests PASS)
- [x] update_style → sync tự chạy (E2E smoke PASS: "generator refreshed (scoped)")
- [x] doc schema cũ → sync → migrate + validate + ghi schemaVersion mới (10 vitest + E2E: live doc stamped v3, 106 refresh)
- [x] Sync trên doc hỏng → REFUSE với error list, KHÔNG ghi file (validate-refusals wired + tested)
- [x] CI xanh (3 workflows trên 59e3c68), parity gate vẫn PASS (1.222/1.266 re-verified)

Đợt 2 xong khi:
- [ ] style_rollback tool hoạt động + 1-principle-per-promote trong protocol
- [ ] edited-fixture sync test PASS (B1 regression locked)
- [ ] VLM pipeline: fixture SoM → semantic đúng + IoU verify + not_found cho vùng trống
- [ ] oracle-trust.md rewrite với citations

Đợt 3 xong khi: **— HOÀN TẤT 26/08 (CI xanh 3 workflows)**
- [x] Per-field ledger: clip overridden-fontSize nhưng KHÔNG overridden-range →
      sync KEEPS fontSize, REFRESHES range từ fresh projection (test PASS:
      generate-editor.test.mjs "per-field override merge")
- [x] Migration userEdited → overridden: { all: true } an toàn (migrateV3
      in editorMigrations.ts; backward compat fallback trong merge:
      `|| (userEdited ? { all: true } : {})`)

---

## 7. Ghi chú kỷ luật

- Đợt 1 + 2 mỗi việc commit riêng, push + check CI (lesson check_ci_after_push)
- VLM pipeline (việc 7) là research-backed — KHÔNG deviate khỏi template prompt
  trong §3.4 nếu chưa test; mọi thay đổi prompt phải qua fixture test trước
- Per-field ledger (đợt 3) cần design review riêng trước khi code
- Sau khi hoàn tất: doc-sync update GENERATOR-SPEC (risk #1, #3 đóng) +
  ARCHITECTURE-MAP (files mới) + knowledge-base entry
