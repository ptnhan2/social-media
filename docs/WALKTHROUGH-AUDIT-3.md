# User Walkthrough Audit #3 — nhu cầu user, workflow, CRUD, lỗ hổng hệ thống

> Date: 2026-08-30 19:15 · Method: đóng vai YouTuber làm video explainer 2.5 phút
> ("How to write code that other developers can actually read"), đi qua TOÀN BỘ
> flow từ picker → create → shape → idea → story → script. Đây là audit SÂU NHẤT
> — tập trung vào nhu cầu user và lỗ hổng hệ thống, không chỉ UI bugs.

## Đã hoạt động tốt ✓

- Journey stepper update đúng từng stage (idea → story → script)
- Editor button disable/enable đúng (disabled khi chưa có script)
- Title fallback: slug → originalIdea → story idea ✓
- Story card SSE refresh: story xuất hiện tự động khi agent viết ✓
- History refresh: hiển thị đúng 3 events sau SSE ✓
- Delete project: xoá sạch cả project dir + public copy ✓
- Shape presets: chọn Explainer hiển thị đúng target ✓
- Script textareas: luôn enabled (fix #7) ✓
- 7 beats hiển thị đúng shape đã chọn ✓

## A. WORKFLOW GAPS — user cần nhưng flow không hỗ trợ

### A1. "Bắt đầu" không BẮT ĐẦU — chỉ pre-fill prompt
Nút "🚀 Bắt đầu với agent" chỉ mở drawer + điền prompt. User phải click "Send"
thêm lần nữa. **Không có chỉ dẫn nào** nói user cần Send. Đây là 2 bước ngầm
trong UI 1 bước — confusing.
**Fix:** Auto-send prompt khi click "Bắt đầu", HOẶC rename thành "Soạn prompt
cho agent →" + hiển thị hướng dẫn "click Send trong drawer".

### A2. Không có confirmation trước Generate
Một click "🎬 Generate video" trigger 7 TTS calls + timeline + render (tốn
tiền + 5-10 phút). Không có confirm dialog, không cost estimate.
**Fix:** Confirm dialog: "Sẽ generate voice cho 7 beats (~$0.10, ~5 phút).
Tiếp tục?"

### A3. Không có total duration display
7 beats: 20+20+20+20+25+22+23 = 150s. Nhưng UI chỉ hiển thị từng beat
riêng lẻ — không có tổng. User phải tự cộng.
**Fix:** Script card header: "7 beats · 150s total · target 150s ✓"

### A4. Create card biến mất sau khi story xuất hiện
User chọn "Explainer 7 beats" → story được draft → create card (với shape
selector) biến mất hoàn toàn. Không thể quay lại đổi shape.
**Fix:** Hiển thị shape info trong story card header ("Target: Explainer
~2.5 phút · 7 beats") để user biết agent đang follow shape nào.

### A5. Không có inputs cho audience / tone / language
User không thể chỉ định: video cho ai (beginner/expert), tone gì (nghiêm
túc/hài hước), ngôn ngữ nào (Vietnamese/English). Đây là inputs CƠ BẢN của
content creation.
**Fix:** Thêm optional fields trong CreateCard (dropdown hoặc free text).

## B. CRUD GAPS — vẫn tồn tại từ audit trước

### B1. Không ADD/DELETE/REORDER beat
Script có 7 beats nhưng user không thể: thêm beat 8, xoá beat 3, hay swap
beat 2 và 5. Phải đi qua agent.
**Impact:** Script editing là tính năng CỐT LÕI của studio — thiếu CRUD
trên đối tượng chính là thiếu table stakes.

### B2. Không CHANGE TREATMENT
Mọi beat đều "CHAPTER-CARD" — không thể đổi sang semantic-diagram hay
process-timeline từ studio. Với explainer 7 beats, variety quan trọng.
**Impact:** Video trông đơn điệu, user không có control về visual style.

### B3. Không EDIT DURATION
Beat durations (20.0s, 25.0s...) read-only. User không thể điều chỉnh pacing.
**Impact:** Voice-first retime sẽ override anyway, nhưng user cần xem và
điều chỉnh planned duration TRƯỚC khi generate.

### B4. Không EDIT DIRECTION pre-voice
Direction textarea disabled khi chưa có voice clip. User muốn đặt
direction tags TRƯỚC khi generate.
**Impact:** Direction phải chờ sau voice generation — backwards workflow.

## C. SYSTEM COHERENCE

### C1. Agent drawer quick actions vô dụng cho empty project
Timeline/Render ±2s/Critique/Improve hiển thị cho project không có script.
Chúng sẽ fail hoặc vô nghĩa.
**Fix:** Ẩn khi chưa có script.

### C2. Không có preview của treatment
"CHAPTER-CARD" là text chip. User không biết nó trông như thế nào cho đến
khi mở editor. Không có thumbnail, mini-preview, hay description.
**Fix:** Hover tooltip hoặc mini-preview image cho mỗi treatment type.

### C3. Story draft vs videoDoc story có thể lệch
Story draft nói "Readable code is a gift..." nhưng videoDoc có thể nói khác
(vì write_edit_doc nhận story input riêng). Không có cơ chế đảm bảo
consistency.

## D. NHU CẦU USER SÂU HƠN — user cần nhưng hệ thống chưa nghĩ tới

### D1. Storyboard preview trước Generate
User cần thấy CÁI GÌ sẽ được render TRƯỚC khi bấm Generate. Hiện tại: chỉ
thấy text + treatment chips. Không có visual preview.
**Ý tưởng:** Render storyboard frames (static images) từ treatments — rẻ,
nhanh, cho user thấy "video sẽ trông thế nào" trước khi tốn tiền TTS.

### D2. Export/Share sau approval
Video approved → user cần download hoặc share. Phải vào editor → Export.
Studio nên có nút "Download MP4" hoặc "Share" trực tiếp từ approval card.

### D3. Project metadata (title, description, tags)
Cho YouTube creator: video title, description, tags, thumbnail — không có
chỗ nào edit những thứ này. Studio chỉ có idea/surfaceProblem/deeperProblem
(từ story) — không phải YouTube metadata.

### D4. Iterate: sửa script → re-generate CHỈ beats thay đổi
Hiện tại Generate chạy TTS cho TẤT CẢ beats. Nếu user sửa 1 câu trong beat
3, chỉ cần re-voice beat 3 — không re-voice cả 7 beats.
**Fix:** Detect changed beats → only re-generate those + re-render timeline.

### D5. Progress feedback trong lúc Generate
"Đang chạy: TTS voice…" — không có progress bar, ETA, hay per-beat status.
User không biết còn bao lâu, đang chạy beat nào.

## PRIORITIZED FIX ROADMAP

| Priority | Item | Effort | Impact |
|---|---|---|---|
| P0 | A1: Auto-send hoặc rename "Bắt đầu" | Small | UX confusion |
| P0 | A3: Total duration + shape info trong script card | Small | Thông tin thiếu |
| P0 | A2: Confirm dialog trước Generate | Small | Ngăn click nhầm tốn tiền |
| P1 | A4: Shape info trong story card | Small | User biết agent follow gì |
| P1 | B1: ADD/DELETE beat (REORDER defer) | Medium | CRUD table stakes |
| P1 | D4: Partial generate (chỉ beats thay đổi) | Medium | Tiết kiệm TTS cost |
| P1 | C1: Hide quick actions khi chưa có script | Small | UI polish |
| P2 | B2: Treatment selector per beat | Medium | Visual variety |
| P2 | B3: Edit duration per beat | Small | Pacing control |
| P2 | B4: Direction pre-voice | Medium | Workflow đúng |
| P2 | D1: Storyboard preview | Large | Trust trước generate |
| P2 | D2: Export/Share từ studio | Small | Post-approval flow |
| P2 | D5: Progress feedback | Medium | Generate UX |
| P3 | A5: Audience/tone/language inputs | Small | Content inputs |
| P3 | D3: Project metadata (YouTube) | Medium | Creator workflow |
