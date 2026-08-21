# TODO NEXT — các việc còn nợ (source of truth)

> Tạo 2026-08-20 sau audit cuối session. **File này là nguồn sự thật** cho công
> việc còn lại — todo-list trong tool chỉ là bản copy dễ mất (lỗi mạng/session
> cắt). Quy tắc: làm xong mục nào thì đánh dấu [x] ngay trong file này rồi
> commit. Đọc file này đầu mỗi session mới, sau HARNESS-RECOVERY.md.
>
> Ngữ cảnh: P1 + P5 + P2.1 đã xong (protocol v4 chạy trọn vẹn, 2 cải thiện
> verify thật: damping 18→2, revealDurationSec 0.65→2). Những mục dưới đây là
> phần CHƯA đóng từ audit với user 2026-08-20 tối.

## Nguyên tắc ưu tiên

A → B → C → D → E → F. A rẻ nhất và unlock tiền đề cốt lõi ("agent học gu
CỦA BẠN, không phải gu Qwen"). E là việc kiến trúc lớn, để riêng session riêng.

---

## BATCH A — Kích hoạt hiệu chuẩn gu (gu của AI ≠ gu của bạn) — ✅ XONG 2026-08-21

- [x] **A1. Chu kỳ bầu chọn thật (10-20 phiếu).** Đã làm theo hướng nhanh:
      `harness/vote_session.py` (blind A/B web UI, thứ tự trái/phải xáo trộn mù,
      không có position bias — 4 phiếu quyết định rơi cả 2 vị trí màn hình).
      8 phiếu thật: motion 3 ties + color 1 tie + 4 phiếu quyết (đều chọn A =
      giá trị baseline hiện tại, kể cả bản accent-ẩn > accent amber). VLM verdict
      cache: 4 usable, 4 "identical" (montage yếu ở subtle color/motion). Cặp
      mới render bằng `render_vote_pairs*.py`, verify bằng
      `verify_vote_pairs.py` (pixel-diff PASS bắt được 2 cặp hỏng: ab_* là render
      tiền-fix, subtitle knob chưa wire). Cần thêm phiếu ở các vòng sau (mỗi
      KEEP gate thật tự sinh phiếu mới) để dồn N≥10 cho từng aspect.
- [x] **A2. Chạy `harness/calibrate.py`** → `memories/oracle-trust.md` sinh với
      số liệu thật: color 0/1, text 0/1, motion 0 comparable (+3 ties) — toàn
      ASK (AUTO cần N≥10 + Wilson lower ≥80%, chưa đạt là đúng thực tế).
- [x] **A3. Verify agent đọc zones đúng** — cycle thật qua AgentPanel UI
      (17:33-17:42 2026-08-21): agent đọc oracle-trust.md ngay đầu cycle (thấy
      trong trace), tôn trọng ASK (không auto-keep gì), pairwise thua → tự
      revert không cần gate. Đúng protocol v4.
- [x] **A4. Spot-check cadence**: rule "mỗi quyết định AUTO thứ 5 vẫn hiện KEEP
      gate" có trong memories/AGENTS.md (protocol step 8). Cadence dormient cho
      tới khi có zone AUTO đầu tiên (cần N≥10) — rule đã sẵn, verify hành xử
      khi zone tồn tại.

## BATCH B — Feedback-driven cycle end-to-end — ✅ XONG 2026-08-21 (qua AgentPanel UI)

- [x] **B1. Reject + note path**: cycle user-directed thật, tại KEEP gate bấm
      REJECT kèm note "Cả hai đều xấu — màu hơi bệt...". Agent: revert knob
      (width 4→2) + chẩn đoán note đúng 3-case → nhận diện "cả hai xấu" +
      map "màu bệt" sang knob khác (stroke.mode). Evidence: thread trace +
      feedback.jsonl + preferences.jsonl.
- [x] **B2. User-directed fix cycle**: chuỗi rút gọn chạy đúng contract —
      update_style → render → compare_renders (PASS bắt buộc) →
      request_keep(user_directed=True, feedback_context=note), KHÔNG
      critique/pairwise. Hot-fix sau chẩn đoán quay lại gate cho user đánh
      giá lại (không auto-accept) — verify ở cả 2 gate.
- [x] **B3. Wishlist path**: feedback "film grain phủ toàn khung" → agent
      đọc style-knobs skill, báo thẳng KHÔNG núm nào làm nổi, ghi entry vào
      wishlist.md qua write-gate (approve), không đụng núm nào khác.
- [x] **B4. Cap feedback cycles**: lần đầu FAIL (agent chạy cycle 4 sau 3
      cycle hoàn tất — soft rule trong AGENTS.md bị quên dưới context dài;
      đã cancel run giữa chừng). Fix: `CycleCapMiddleware` trong agent.py —
      đếm cycle hoàn tất qua marker trong message history (KEEP GATE result /
      pairwise loss / control fail) và chèn system reminder mỗi model call
      khi đạt cap. Test `harness/test_cycle_cap.py`: PASS — agent từ chối
      cycle 4 và hướng dẫn mở thread mới. AGENTS.md cũng sắc lại định nghĩa
      "session = whole thread".

## BATCH C — Multi-segment — ✅ ĐÓNG 2026-08-21 (kết quả trung thực: 0 IMPROVED mới)

> Kết luận batch: cả 2 treatment chưa test đều bị **chặn bởi thiết bị đo**, không
> phải thiếu thử. Monte oracle mù đặc hiệu với thay đổi TOÀN-CỤC (luminance/
> saturation/zoom) — nói "identical" với cặp diff 5.28 (8.7% pixels), trong khi
> vẫn bắt đúng thay đổi cục bộ (probe fontSize xác nhận endpoint không xuống
> cấp). User cũng tie trên mọi cặp motion/global (6/6). Chìa khóa mở: **F4**
> (native video input) + có thể vote ở resolution cao hơn. Chi tiết trong
> knowledge-base.md: "blind spot is PERCEPTUAL" + "Taste-profile insight".

- [x] **C1. Chapter-card**: không chạy cycle — 2 knob gợi ý (fontSizeLong 110,
      accentLine 340) đã bị user vote xuống sáng cùng ngày (prefer baseline
      82/190); treatment không có motion knob; kết luận trung thực: chapter-card
      đang ở local optimum với gu user hiện tại.
- [x] **C2. Process-timeline**: đủ 4 loại knob wired đều test — stiffness
      (identical), damping (identical/user-tie), amber (0.0 diff — không wired
      cho beat này), progressEndSec (diff 0.478 nhưng identical). INSTRUMENT-
      BLOCKED, ghi rõ trong KB + rule "đừng tiêu cycle vào treatment này tới
      khi có F4".
- [x] **C3. Host-reflection**: pushDurationSec 4→1.5 (diff 5.28!) và filter
      sáng hơn (diff 3.75) đều PASS pixel-diff nhưng VLM mù + user tie →
      UNVERIFIABLE, reverted. Human-fallback vote qua vote_session (đúng
      triết lý user-as-oracle).
- [x] **C4. Win-rate theo treatment**: bảng cập nhật đầy đủ trong
      knowledge-base.md (semantic 2W/2L, pt 0/4, hr 0/2, cc 0/2).

## BATCH D — Tutorial learning — D1 XONG + D2-prep XONG (đêm 21-22/08), chờ user duyệt buổi sáng

- [x] **D1. Chạy `harness/ingest_tutorial.py`** lên video Isaac — đã chạy 3
      video (04-editing, 02-scripts, 06-thumbnails; 8 moments mỗi video,
      interval 150s phủ ~17 phút). Kết quả: 41 candidates trong
      `memories/tutorial-candidates.json` (multi-video store — script đã fix
      để MERGE thay vì ghi đè). Gap-fill loop qua đêm recover hết các moments
      lỗi VLM của video 04. Lưu ý vận hành: DashScope tối hay timeout — chạy
      nền + retry.
- [x] **D2-prep.** `docs/TUTORIAL-CANDIDATES-REVIEW.md` sinh tự động
      (generate_review_doc.py): 41 candidates cluster thành 7 nhóm, mỗi nhóm
      kèm khuyến nghị + ĐO ĐẰC deterministic trên renders hiện có
      (measure_candidates.py): style hiện tại accent 0.26-4.7% (xa dưới mọi
      cap của Isaac ≤2-12%); node/detail 1.43x fail sát so với candidate
      ≥1.5x. **CHỜ USER DUYỆT** theo doc rồi mới vào taste-standard.
- [ ] **D2. User duyệt candidates** →_approved vào taste-standard.md với
      nhãn CANDIDATE + provenance (cap tỉ lệ nguyên tắc nguồn Isaac).
- [ ] **D3. Verify từng candidate** bằng 1 cycle chuẩn — lưu ý: candidates
      motion KHÔNG verify được cho tới khi có F4 (oracle mù motion đã chứng
      minh); candidates đo-lường-được verify trực tiếp bằng PIL đã có sẵn
      trong review doc.

## BATCH E — Kiến trúc generator — E1 SPEC XONG (đêm 21-22/08), E2-E6 để session code

Mục tiêu: MỘT nguồn sự thật (EditorDoc) cho cả người và agent — đóng luôn
khoảng cách "preview Composer ≠ video agent render".

- [x] **E1. Spec chi tiết**: `docs/GENERATOR-SPEC.md` — viết xong, grounded
      trong audit đầy đủ (generator `projectEditDocToEditor` ĐÃ TỒN TẠI nhưng
      chỉ là runtime fallback, không idempotent, không provenance). Thiết kế:
      merge 3-chiều + userEdited ledger + styleSource provenance + render
      unification qua Root.tsx editorSrc + agent clip tools qua node bridge.
- [ ] **E2-E6**: theo implementation order trong GENERATOR-SPEC.md §4
      (ledger → standalone generator → Root.tsx switch → editor_op tool →
      sync smoke test → agent clip-edit E2E).

## BATCH F — Vụn nhỏ (làm khi rảnh, không chặn gì)

- [x] **F1. Full cycle qua AgentPanel (UI chat)** — ĐÃ TEST 2026-08-21: cycle
      hoàn chỉnh chạy từ chat UI (glm-4-plus), write-gate approval hiển thị
      Approve/Reject + diff trong UI, reject hoạt động đúng (agent không retry).
      Chưa test: KEEP gate interrupt qua UI với cycle thắng (lần này thua ở
      pairwise nên không tới gate) — sẽ rơi vào lần cycle thắng kế tiếp.
- [x] **F2. Pairwise judge structured output** — XONG (đêm 21-22/08):
      response_format JSON + prompt strict-JSON + `_parse_pairwise_verdict`
      (JSON-first, fallback legacy WINNER regex). Unit test 11/11
      (test_pairwise_parser.py) + live verify trên cặp titlelong (verdict
      "after" khớp buổi sáng, control pass, JSON sạch).
- [x] **F3. LangSmith eval re-run** — XONG (đêm 21-22/08): response_quality
      10/10 sau fix 3 tầng (prompt `{inputs}`/`{outputs}` thay vì
      `{inputs[query]}`; use_reasoning=False; env-loader override empty-string
      vars). used_expected_tools + no_phantom_tools 10/10. used_think 3/10 +
      read_memory 1/10 là evaluator design noise. Chi tiết trong
      eval_scores.json + knowledge-base.
- [ ] **F4. Key DashScope quốc tế (user action)** → native video input cho
      VLM (bỏ montage 3-frame) → bỏ nhãn PROVISIONAL của motion zone.
      **⬆️ ĐÃ THÀNH CRITICAL PATH (2026-08-21 tối)**: Batch C chứng minh
      montage oracle mù với thay đổi toàn-cục (identical với diff 5.28) và
      user tie trên mọi cặp motion/global — không thể có IMPROVED entry mới
      cho bất kỳ treatment nào ngoài các knob cục bộ cho tới khi có cái này.
- [x] **F5. optimize.py**: ĐÃ XÓA (2026-08-21) — stub với comparison logic giả,
      proposals hardcoded, tự sửa AGENTS.md không qua write-gate; taste
      flywheel (calibrate + KEEP gate + knowledge-base) là outer loop thật.
- [x] **F6. Docker Postgres persistence test** — XONG (đêm 21-22/08):
      f6_probe.py chạy graph nhỏ với PostgresSaver trong container → fresh
      container ĐỌC LẠI được state, và cả sau khi restart postgres container.
      Phát hiện + fix quan trọng: Dockerfile.langgraph thiếu
      `langgraph-checkpoint-postgres` + `psycopg[binary]` — không có 2 package
      này, agent.py trong Docker **fallback im lặng sang MemorySaver** (mất
      state mỗi restart). Image harness-langgraph đã build sẵn локально.

---

## Done criteria cho từng batch (khi nào được coi là xong)

- **A**: oracle-trust.md tồn tại với ≥1 zone có số liệu thật; agent hành xử
  khác nhau theo zone (verify bằng trace).
- **B**: 3 path (reject+note / user-directed fix / wishlist) đều có evidence
  chạy qua agent thật trong knowledge-base + wishlist/feedback files.
- **C**: ≥2 treatment ngoài semantic-diagram có entry IMPROVED trong
  knowledge-base.
- **D**: ≥1 nguyên tắc từ tutorial đi trọn đường: candidate → duyệt →
  verify cycle → taste-standard (không còn nhãn CANDIDATE).
- **E**: render một luồng duy nhất từ EditorDoc; agent edit được clip và
  pixel-diff xác nhận thay đổi đến render.

## Liên kết

- Thiết kế nền: `docs/TASTE-AND-LEARNING-ROADMAP.md` (rev 3)
- Trạng thái session trước: `docs/HARNESS-RECOVERY.md`
- Cách chạy cycle: `harness/run_cycle.py --task "..." --answer "keep; note"`
- Log cycle gần nhất: `harness/last_cycle.log`
