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

## BATCH A — Kích hoạt hiệu chuẩn gu (gu của AI ≠ gu của bạn)

- [ ] **A1. Chu kỳ bầu chọn thật (10-20 phiếu).** Mỗi phiếu = 1 quyết định
      KEEP thật của user trên một cặp video A/B. Cách rẻ nhất: chạy
      `harness/run_cycle.py` nhiều lần (mỗi lần ~6-8 phút, ~6k VND model),
      mỗi lần kết thúc bằng KEEP gate → user bấm. Đa dạng hóa: xen kẽ
      semantic-diagram (3.5-7s) và chapter-card (0-3.5s), thay đổi knob mỗi
      lần. LƯU Ý: mỗi phiếu phải GHI THẬT ý của user — đừng bấm máy móc.
      - Nhanh hơn: viết `vote_session.py` tái dùng các cặp A/B ĐÃ CÓ
        (fixtest_A/B, cycle_baseline/damping2, knob_*.mp4 trong
        renders/windows/) + vài cặp mới, trình từng cặp cho user vote không
        cần chạy full cycle. ~30 phút cho 10 phiếu.
- [ ] **A2. Chạy `harness/calibrate.py`** → sinh `memories/oracle-trust.md`.
      AUTO zone cần N≥10 + Wilson lower bound ≥80%. Dưới mức đó: mọi thứ ASK.
- [ ] **A3. Verify agent đọc zones đúng.** Chạy 1 cycle trên aspect ở AUTO
      zone → agent phải auto-keep KHÔNG interrupt (trừ lần thứ 5 — spot check).
- [ ] **A4. Spot-check cadence**: xác nhận logic "mỗi quyết định AUTO thứ 5
      vẫn hiện KEEP gate" — hiện nằm trong AGENTS.md như quy tắc, cần verify
      agent tuân thủ.

## BATCH B — Feedback-driven cycle end-to-end (chưa test lần nào)

- [ ] **B1. Reject + note path**: chạy 1 cycle, ở KEEP gate bấm REJECT kèm
      note kiểu "cả hai đều xấu — màu hơi bệt". Verify: agent REVERT knob +
      chẩn đoán note theo 3 trường hợp (map knob / mơ hồ / không biểu đạt).
- [ ] **B2. User-directed fix cycle**: sau B1, agent phải chạy chuỗi rút gọn
      (update_style → render → compare_renders → request_keep với
      user_directed=True, KHÔNG VLM) và quay lại cổng KEEP cho user xem fix.
      Đây là lời hứa "hot fix rồi cho đánh giá lại" — KHÔNG auto-accept.
- [ ] **B3. Wishlist path**: cho feedback không núm nào làm nổi ("đường nối
      nên là nét cọ loang màu") → agent phải báo thật + ghi vào
      `memories/wishlist.md`, không đổi núm nào khác.
- [ ] **B4. Cap feedback cycles**: verify feedback-cycle đếm vào budget 3
      vòng/session; quá cap agent DỪNG và báo kẹt (không ping-pong vô tận).

## BATCH C — Multi-segment: chưa có cải thiện THÀNH CÔNG nào ngoài semantic-diagram

- [ ] **C1. Chapter-card cycle thành công** (2 lần trước fail gate vì chọn
      knob delta nhỏ/sai). Lần này chọn knob delta lớn: fontSizeLong 82→110
      (title 28 chars dùng fontSizeLong) hoặc accentLine.maxWidth 190→340.
- [ ] **C2. Process-timeline segment (10.5-14s)**: knob map = spring
      damping/stiffness (mới wire), progressStartSec/progressEndSec.
- [ ] **C3. Host-reflection segment (7-10.5s)**: pushStart, pushDurationSec.
- [ ] **C4. Ghi win-rate theo treatment** vào knowledge-base.md; nếu oracle
      giữ được tỉ lệ thắng ở mọi treatment → zones tổng quát hóa; không thì
      hiệu chuẩn riêng từng treatment (calibrate.py mở rộng).

## BATCH D — Tutorial learning (script có sẵn, chưa chạy)

- [ ] **D1. Chạy `harness/ingest_tutorial.py`** lên video Isaac — ưu tiên
      `research/isaacverse/source/04 - How I Actually Edit Viral Videos.mp4`
      (liên quan nhất). `--moments 5 --interval 8`. Kết quả:
      `memories/tutorial-candidates.json`.
- [ ] **D2. User duyệt candidates** →_approved vào taste-standard.md với
      nhãn CANDIDATE + provenance (cap tỉ lệ nguyên tắc nguồn Isaac).
- [ ] **D3. Verify từng candidate** bằng 1 cycle chuẩn (cái nào qua được
      pairwise + KEEP gate mới thành nguyên tắc thật).

## BATCH E — Kiến trúc generator (item kiến trúc LỚN NHẤT, session riêng)

Mục tiêu: MỘT nguồn sự thật (EditorDoc) cho cả người và agent — đóng luôn
khoảng cách "preview Composer ≠ video agent render".

- [ ] **E1. Spec chi tiết**: generator = bước chiếu EditDoc → EditorDoc thành
      formal step (chạy được per-beat, lặp lại được). Viết
      `docs/GENERATOR-SPEC.md` trước khi code.
- [ ] **E2. Hợp nhất render về một luồng EditorDoc** (luồng treatment hiện
      tại thành "generator preview").
- [ ] **E3. Bọc `editorOperations.ts` (split/trim/ripple) thành agent tools**
      — agent có động từ chỉnh sửa như người dùng.
- [ ] **E4. Provenance trên clips**: generator ghi `clip.metadata.styleSource`
      (núm nào sinh thuộc tính nào) — rẻ lúc sinh, không tái tạo được sau.
- [ ] **E5. Chính sách merge**: clip user đã sửa = "user-owned", tái sinh
      không đụng.
- [ ] **E6. Smoke test**: agent sửa một clip (đổi text/timing) như người
      dùng, render, verify pixel-diff.

## BATCH F — Vụn nhỏ (làm khi rảnh, không chặn gì)

- [ ] **F1. Full cycle qua AgentPanel (UI chat)** — mọi smoke test đến giờ
      chạy qua CLI; chưa test agent chạy trọn cycle khi điều khiển từ chat
      UI.
- [ ] **F2. Pairwise judge chuyển sang structured output** (response_format
      JSON với verdict field) — hết phụ thuộc regex parse.
- [ ] **F3. LangSmith eval re-run** với judge glm-4-flash (đã đổi default,
      chưa chạy lại).
- [ ] **F4. Key DashScope quốc tế (user action)** → native video input cho
      VLM (bỏ montage 3-frame) → bỏ nhãn PROVISIONAL của motion zone.
- [ ] **F5. optimize.py**: fix logic so sánh hoặc xóa hẳn (đã demote — taste
      flywheel mới là outer loop thật).
- [ ] **F6. Docker Postgres persistence test** (build xong từ trước, chưa
      test restart).

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
