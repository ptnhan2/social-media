# AUTO-CUT HEAD ATTEMPT LOG — kết quả + bài học (2026-08-23/24)

> **TRẠNG THÁI: DEFERRED** — chuyển sang manual studio (Asset Studio).
> Tự động hoá sẽ quay lại khi có model tốt hơn hoặc SAM fine-tuned cho cartoons.
>
> Mục đích: ghi lại TẤT CẢ những gì đã thử, kết quả ra sao, và bài học rút ra —
> để session sau không lặp lại cùng sai lầm và biết tiếp tục từ đâu.

## 1. Mục tiêu ban đầu

Tự động: stock body photo → tách nền → detect cổ/viền cằm → ghép cartoon
head lên đúng vị trí → export pose asset. Không cần user thao tác tay.

## 2. Những gì đã thử (9+ cách, theo thứ tự thời gian)

### 2.1 MediaPipe FaceLandmarker + width profile
- **Cách**: detect 478 face landmarks → tìm viền hàm từ jaw contour landmarks → crop
- **Kết quả**: ❌ Front view OK (~90%), 3/4 view SAI HOÀN TOÀN (landmarks đặt sai vị trí trên cartoon face quay ngang)
- **Nguyên nhân**: MediaPipe train trên real faces, không tối ưu cho stylized/cartoon art

### 2.2 Width profile analysis (flood-fill alpha)
- **Cách**: đo width mỗi hàng pixel → tìm điểm hẹp nhất (cổ) → cắt tại đó
- **Kết quả**: ❌ Chỉ thấy trán và tóc (cut quá cao) — width profile bị nhiễu bởi cel shading tạo alpha không đều
- **Bài học**: heuristic width analysis không đủ chính xác cho artwork phức tạp

### 2.3 Alpha narrowing scan (tìm điểm cổ thu hẹp)
- **Cách**: từ chin landmark scan xuống tìm row mà width giảm <55% jaw width
- **Kết quả**: ❌ Không tìm thấy narrowing rõ ràng — cartoon style có neck gần bằng jaw width
- **Bài học**: ngưỡng % phụ thuộc style, không universal

### 2.4 Ear-lobe fallback
- **Cách**: dùng ear lobe landmarks (102, 331) làm mốc cắt
- **Kết quả**: ❌ CẮT NGANG GIỮA MẶT — ear lobes ở y≈836 nhưng chin ở y≈1186 (350px chênh lệch!)
- **Bài học**: ear lobes ở tầm mũi/miệng, KHÔNG phải tầm cằm. Fallback này sai hoàn toàn.

### 2.5 Submental landmark (175)
- **Cách**: dùng landmark 175 (dưới cằm) làm mốc cắt
- **Kết quả**: ⚠️ Landmark 175 nằm CAO HƠN chin (152) trong cartoon face — ngược với real face
- **Bài học**: cartoon faces có tỉ lệ khác real faces, landmark positions không đáng tin

### 2.6 Parabola fit qua jaw contour
- **Cách**: fit đường cong parabola qua 18 jaw landmarks → cut dọc theo parabola
- **Kết quả**: ⚠️ Front view tạm ổn, 3/4 view SAI (landmarks sai → parabola cũng sai)
- **Bài học**: garbage in = garbage out. Nếu landmarks sai thì curve cũng sai.

### 2.7 Stability AI "head only" prompt (5+ lần thử)
- **Cách**: gen ảnh với prompt yêu cầu "chỉ đầu, không cổ không vai"
- **Kết quả**: ❌ LUÔN LUÔN bao gồm cổ và vai dù prompt rất explicit
- **Các prompt đã thử**: "head only", "cropped at jawline", "no neck no shoulders", "emoji icon", "mascot logo", "game avatar", negative prompts
- **Bài học**: image generation models KHÔNG THỂ chỉ generate đầu trơn tru — chúng luôn thêm context (cổ/vai) để trông tự nhiên

### 2.8 SAM (Segment Anything Model)
- **Cách**: point prompt tại nose tip → SAM segment object tại đó
- **Kết quả**: ❌ SAM segment TOÀN BỘ NGƯỜI (head + body là 1 object với SAM)
- **Bài học**: SAM hiểu "người" là 1 object, không tách được đầu khỏi thân

### 2.9 rembg models (u2net, isnet, birefnet-portrait, bria-rmbg)
- **Cách**: các model chuyên portrait segmentation
- **Kết quả**: ✅ Tách NỀN rất sạch / ❌ Nhưng KHÔNG tách được đầu khỏi thân
- **Bài học**: background removal ≠ head extraction. Đây là 2 bài toán khác nhau.

## 3. Những gì HOẠT ĐỘNG (kết quả tốt nhất)

| Thành phần | Công nghệ | Trạng thái |
|---|---|---|
| Background removal | rembg isnet-general-use | ✅ Sạch, nhanh |
| Chin detection | MediaPipe FaceLandmarker (152) | ✅ Chính xác (front view) |
| Face bounding box | MediaPipe landmarks centroid | ✅ Đủ chính xác |
| Head asset format | PNG 512×512 transparent | ✅ Chuẩn hoá |
| Composite method | PIL alpha_composite | ✅ Hoạt động |

**Điểm gần thành công nhất (90%)**: MediaPipe chin (152) + rembg cutout +
crop tại chin_y + margin nhỏ → front view OK. Nhưng:
- 3/4 view FAIL (landmarks sai vị trí trên cartoon)
- Fixed margins "hên xui" (user feedback chính xác)

## 4. Khoảng trống cần lấp (cho session tương lai)

1. **Head-neck boundary detection**: cần model chuyên phân biệt đầu/cổ trên
   cartoon/stylized faces. Candidates:
   - BiSeNet face parsing (semantic segmentation: face/hair/neck classes)
   - Fine-tuned SAM cho cartoon faces
   - Custom contour tracing với edge detection

2. **Multi-angle support**: cần model hoạt động trên mọi góc quay
   - MediaPipe hạn chế với turned faces
   - Có thể dùng 3DMM (3D Morphable Model) để fit 3D face rồi project

3. **Style-consistent head generation**: cần prompt engineering tốt hơn HOẶC
   fine-tune model trên character style cụ thể của từng kênh

## 5. Giải pháp hiện tại: MANUAL STUDIO

Asset Studio (docs/ASSET-STUDIO-SPEC.md) cho phép user:
1. Upload stock body photo
2. Click nút tách nền (rembg AI — hoạt động tốt)
3. Drag-drop cartoon head lên body (manual positioning)
4. Scale/rotate head
5. Save pose vào library
6. Export vào editor asset system

→ User kiểm soát chất lượng cuối cùng, không phụ thuộc thuật toán chưa hoàn thiện.
