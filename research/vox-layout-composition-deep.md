# Báo cáo nghiên cứu: Layout & Composition của Video Vox Style

**Ngày:** 2026-08-02
**Phạm vi:** Vox YouTube channel (các era: Classic Vox, Borders/Johnny Harris, Atlas/Sam Ellis, Earworm/Estelle Caswell, Vox hiện tại), Johnny Harris solo, Cleo Abram/Huge If True
**Mục đích:** Cung cấp dữ liệu cụ thể để reimplement layout Vox-style trong Remotion/React

---

## 1. Giải phẫu khung hình điển hình (Typical Frame Anatomy)

### 1.1 Các vùng (zones) trong frame 16:9

Frame Vox-style có thể chia thành 4 vùng chính theo chiều dọc:

```
┌─────────────────────────────────────────────┐
│  VÙNG TIÊU ĐỀ (Top Title Strip)             │  ~5-10% chiều cao
│  - Headline chính, bold condensed sans       │  top: 5-8% margin
│  - Có thể có subtitle phụ                   │
├─────────────────────────────────────────────┤
│                                             │
│  VÙNG NỘI DUNG CHÍNH (Center Media Zone)    │  ~60-70% chiều cao
│  - Ảnh cắt dán (paper cutout)               │
│  - Map animation                            │
│  - Data visualization                       │
│  - Archival photo/footage                   │
│                                             │
├─────────────────────────────────────────────┤
│  VÙNG CHÚ THÍCH (Annotation Zone)           │  ~10-15% chiều cao
│  - Mũi tên, callout lines                   │
│  - Label văn bản nhỏ                        │
│  - Highlight sweep vàng                     │
├─────────────────────────────────────────────┤
│  VÙNG SUBTITLE/CAPTION (Bottom Caption)     │  4-5% margin bottom
│  - Bold white text, black outline           │
│  - Max 2 dòng, ~42 ký tự/dòng               │
└─────────────────────────────────────────────┘
```

**Nguồn:** GitHub vox-style-guide.md (https://github.com/CK42BB/vox-explainer-skill/blob/main/references/vox-style-guide.md) ghi rõ subtitle style: "bold sans, bottom-center, ~4% margin, max 2 lines / ~42 chars per line, sentence-case". Easy-Peasy.AI guide xác nhận "bold condensed kinetic typography" ở top hoặc center frame.

### 1.2 Safe margins cụ thể cho 16:9 (1920x1080)

Dựa trên chuẩn broadcast ITU-R BT.1848 và phân tích từ các nguồn:

| Vùng | Margin | Pixel (1920x1080) | Ghi chú |
|------|--------|-------------------|---------|
| **Title-safe** (text quan trọng) | 10% mỗi cạnh | 1536×864 (center) | Không đặt chữ gần mép hơn vùng này |
| **Action-safe** (hình ảnh chính) | 5% mỗi cạnh | 1728×972 (center) | Element chính không vượt quá vùng này |
| **Subtitle bottom** | ~4% bottom | Cách bottom ~43px | Vox-style guide ghi rõ "~4% margin" |
| **Top title** | ~5-8% top | Cách top ~54-86px | Ước lượng từ phân tích frame Vox |

**Nguồn:**
- ITU-R BT.1848-1: action safe 3.5%, graphics safe 5% cho broadcast
- GitHub vox-style-guide.md: "bottom-center, ~4% margin"
- Infinite Creation Lower Third guide: "Title Safe Zone — typically 10% in from all edges. At 1920×1080, the title safe zone starts at 192px from the left and 108px from the bottom."

**Lưu ý quan trọng:** Trên mobile (19.5:9, 18:9), crop có thể nặng hơn. Eks.tv khuyến nghị dùng 80% title-safe area (tương đương ~20% margin) cho nội dung quan trọng nếu muốn an toàn trên mọi thiết bị mobile. Tuy nhiên Vox không tuân thủ chặt broadcast standards vì họ publish chủ yếu trên YouTube — họ dùng margin khoảng 4-5% cho subtitle và title.

---

## 2. Các pattern bố cục text + image (Text/Image Composition Patterns)

### 2.1 Pattern "Photo Cutout + Center Title"

**Mô tả:** Ảnh/video archival được đặt như paper cutout (viền trắng 3-6px, drop shadow) ở trung tâm frame, trên nền giấy texture ấm (cream/off-white). Title bold xuất hiện phía trên hoặc phía dưới ảnh.

**Stacking order (từ dưới lên):**
1. Background: textured paper (cream #F5F0E8 ~estimate)
2. Background accent: solid color field bên ngoài (optional, ~10-15% frame edge)
3. Photo cutout với white border (3-6px) + soft drop shadow
4. Flat geometric accent (1-2 shapes, màu accent)
5. Title text: bold condensed sans, có thể có highlight sweep vàng
6. Caption/subtitle: bottom-center

**Khi nào dùng:** Scene giới thiệu nhân vật/sự kiện lịch sử, cold open.

**Nguồn:** GitHub vox-style-guide.md xác nhận "visible white borders (3–6px sticker edge) and soft drop shadows" và style suffix mô tả "generous margins, 16:9 composition with clear focal hierarchy".

### 2.2 Pattern "Split Frame: Map Left / Info Right" (Atlas style)

**Mô tả:** Đặc trưng của Vox Atlas (Sam Ellis). Map animation chiếm ~60-70% frame bên trái, panel thông tin (callout text, label, data) chiếm ~30-40% bên phải.

**Đặc điểm:**
- Map zoom với callout lines và label
- Clean, decluttered Mapbox-style map (đã strip label)
- Màu fill cho vùng/quốc gia được highlight
- Info panel có thể overlay lên map (không tách biệt cứng)
- Toggle giữa map view và ground-level footage

**Nguồn:** Storybench Sam Ellis interview (https://www.storybench.org/vox-atlas-producer-sam-ellis-on-his-map-animations/): "These stories generally have the same layout – maps with animation on top, news clips, photos and data visualizations."

### 2.3 Pattern "Full-Frame Typography" (Earworm style)

**Mô tả:** Text LÀ visual chính — không có ảnh nền nổi bật. Bold condensed sans-serif word xuất hiện từng từ, thường kèm highlight sweep vàng.

**Đặc điểm:**
- Background: solid dark color hoặc footage mờ (desaturated)
- Typography chiếm phần lớn frame
- Word-by-word stamp animation
- Highlight sweep vàng là signature move
- Thường dùng cho cold open hoặc key moment

**Nguồn:** Medium "I Watched 50 Vox Videos": "In a Vox-style breakdown, text isn't supporting a visual — text IS the visual. Large, bold numbers fill the frame." (https://medium.com/@seijiyushin/i-watched-50-vox-videos-back-to-back-here-is-what-they-all-share-88a42e293459)

### 2.4 Pattern "Archival Document + Highlight" (investigative)

**Mô tả:** Scan tài liệu (báo, tòa án, văn bản) được đặt trên nền gỗ/bàn, với slow push-in. Highlight sweep vàng quét qua dòng text quan trọng.

**Stacking order:**
1. Background: wooden desk texture hoặc dark surface
2. Document scan (có film grain, vignette)
3. Yellow marker highlight sweep (animated)
4. Bold typography hiển thị text được highlight

### 2.5 Pattern "Data Chart + Narration Sync"

**Mô tả:** Biểu đồ (bar chart, pie chart, timeline) xuất hiện trên nền cream paper texture. Các thanh/phần tử mọc lên đồng bộ với voiceover.

**Đặc điểm:**
- Bar chart: tallest bar màu accent (vàng Vox), còn lại muted navy
- Counter animation: 1.5-2 giây từ 0 đến final value
- Callout line + label cho data point quan trọng

### 2.6 Pattern "Split Frame Comparison" (Old vs New)

**Mô tả:** Frame chia đôi — một bên là "cũ" (messy, crossed-out paper collage), một bên là "mới" (clean, arrow-guided).

**Nguồn:** VideoAI.me (https://videoai.me/blog/vox-style-explainer-video-examples-2026): "splits the frame: a messy, crossed-out paper collage of the painful old process on one side, a clean, arrow-guided version of your product on the other."

---

## 3. Hierarchy giữa text và image

### 3.1 Nguyên tắc chung

Khi cả text và image cùng xuất hiện trên frame:

1. **Text wins over image** — Vox ưu tiên typography. Nếu narrator nói một con số, con số đó phải xuất hiện TO trên màn hình. Không bao giờ để một con số "trôi qua" chỉ bằng audio.

2. **Image hỗ trợ text, không cạnh tranh** — Ảnh/visual luôn bị desaturate khi text xuất hiện. Text dùng màu accent hoặc trắng đậm để nổi bật.

3. **Limited color palette** — Medium "50 Vox Videos" ghi nhận: "Pull a still from any Vox video and count the colors. There will usually be three. Sometimes four. Almost never five. A dark background. An off-white for type. One saturated accent color, applied to roughly five to ten percent of the frame."

**Nguồn:** Medium "I Watched 50 Vox Videos Back-to-Back" (https://medium.com/@seijiyushin/i-watched-50-vox-videos-back-to-back-here-is-what-they-all-share-88a42e293459)

### 3.2 Quan hệ kích thước text

| Loại text | Vị trí | Kích thước tương đối (estimate) | Font |
|-----------|--------|-------------------------------|------|
| **Headline chính** | Top/center frame | 100% (lớn nhất), bold | Bold condensed sans (Archivo Black, Inter ExtraBold) |
| **Subtitle phụ** | Dưới headline | ~50-60% của headline | Regular sans |
| **Body/label** | Cạnh ảnh, callout | ~30-40% của headline | Sans-serif, regular weight |
| **Lower third text** | Bottom 10-15% | Primary ~36pt, secondary ~60-75% primary size | Bold sans for primary, regular for secondary |
| **Data number (trong chart)** | Center frame | Rất lớn, tương đương headline | Bold condensed |
| **Caption/subtitle** | Bottom center | ~4% margin bottom | Bold sans, white fill + black outline |

**Nguồn:**
- Infinite Creation (https://infinitecreation.io/tutorial-lower-thirds): "Primary line: minimum 36pt equivalent on a 1920×1080 canvas. Secondary line: 60–75% of the primary size"
- GitHub vox-style-guide.md: "bold condensed sans for on-frame titles; small caps labels"

---

## 4. Grid và symmetry

### 4.1 Vox có dùng grid không?

Dựa trên phân tích tổng hợp, Vox không áp dụng grid chặt chẽ như Swiss Design, nhưng tuân thủ các nguyên tắc ngầm:

1. **Rule of Thirds áp dụng lỏng** — Subject chính thường đặt gần intersection points nhưng không cứng nhắc. Thường dùng để đặt focal point lệch tâm.

2. **Center-weighted composition** cho typography — Khi text là visual chính, text được căn giữa frame (horizontal + vertical center).

3. **Asymmetrical balance** — Flat geometric shapes (triangle, circle, dot) được đặt bất đối xứng để tạo visual interest. GitHub style guide: "A triangle, circle, or dot in the accent color, placed asymmetrically. One or two per frame maximum."

4. **Không dùng strict column grid** — Khác với báo in, Vox video không dùng cột. Thay vào đó là layered composition với não bộ xử lý như magazine spread.

### 4.2 Magazine spread analogy

GitHub vox-style-guide.md xác nhận: "If a frame could be a movie still, it's wrong. If it could be a magazine spread, it's right." Đây là nguyên tắc quan trọng nhất để hiểu composition Vox — mỗi frame nên trông như một trang tạp chí editorial được thiết kế, không phải một still từ phim.

**Nguồn:** GitHub vox-style-guide.md (https://github.com/CK42BB/vox-explainer-skill/blob/main/references/vox-style-guide.md)

---

## 5. Layer count và stacking order

### 5.1 Số layer điển hình mỗi scene

Phân tích từ nhiều nguồn cho thấy một frame Vox thường có **3-5 layer** chính, không tính các sub-layer:

| Scene type | Số layer chính | Các layer cụ thể |
|------------|---------------|-----------------|
| **Cold open title** | 3-4 | Background color/texture → Archival footage (muted) → Typography → Highlight sweep |
| **Map scene (Atlas)** | 4-5 | Map base → Country/region fill → Route line → Callout labels → Annotation arrows |
| **Document/archival** | 4-5 | Desk/paper background → Document scan → Vignette + grain → Highlight sweep → Caption text |
| **Data chart** | 3-4 | Paper texture BG → Chart bars (staggered) → Callout labels → Narration text |
| **Photo cutout collage** | 4-6 | Solid outer frame → Textured paper → Photo cutout (white border) → Washi tape → Flat accent shapes → Title/caption |
| **Johnny Harris map** | 5-6 | Mapbox basemap → Region fill → Animated route → 3D camera (lat/lon/zoom/bearing/pitch) → Label pins → Callout text |

### 5.2 Stacking order chuẩn (từ dưới lên)

```
Layer 1 (Bottom):  Background
  ├── Solid color field (outer 10-15% of frame, optional)
  └── Textured paper/cream surface (aged, subtle grain)

Layer 2:  Main visual element
  ├── Archival photo as paper cutout (3-6px white border + drop shadow)
  ├── Map basemap with decluttered labels
  ├── Data chart on paper
  └── Scanned document

Layer 3:  Annotation/Accent layer
  ├── Washi tape strips at corners
  ├── Flat geometric shapes (1-2 max, accent color, placed asymmetrically)
  ├── Halftone dot patterns
  └── Callout lines từ element đến label

Layer 4:  Typography layer
  ├── Bold headline (top/center)
  ├── Highlight sweep (yellow, animated)
  ├── Labels/captions
  └── Lower third text

Layer 5 (Top):  Subtitle/Narration text
  └── White fill, black outline (3-4px), bold sans, bottom-center
```

**Nguồn:** Tổng hợp từ GitHub vox-style-guide.md, Easy-Peasy.AI technique breakdown, và VideoAI.me pattern analysis.

---

## 6. Scene-by-scene composition logic

### 6.1 Cold Open (0-12 giây)

**Cấu trúc narrative:** Visual anchor → Question/Promise → Title card

**Composition:**
- **0-3s:** Một visual hook mạnh — map, con số khó tin, hoặc single dramatic shot. Thường dùng full-frame typography hoặc bold image chiếm toàn bộ frame.
- **3-7s:** Narrator đặt câu hỏi hoặc đưa ra claim. Visual: slow push-in vào anchor.
- **7-12s:** Hard cut đến title card. Title card: center-aligned bold text trên dark/colored background. Horizontal rule animate in. Đây là pattern xuất hiện trong 48/50 Vox video.

**Đặc điểm kỹ thuật:**
- Không có channel branding sequence
- Không có "hey what's up guys"
- Narrator nói ~15-20 từ trước title card
- Animation: soft ease-out cho entry, faster sharper exit

**Nguồn:** Medium "50 Vox Videos": "Every single Vox video opens with the same structure... A bold visual hook in the first three seconds. Usually a map, a number that sounds impossible, or a single dramatic shot. Then a question or claim from the narrator. Then a hard cut to the title card." (https://medium.com/@seijiyushin/i-watched-50-vox-videos-back-to-back-here-is-what-they-all-share-88a42e293459)

### 6.2 Map Scene (Atlas style — Sam Ellis)

**Cấu trúc visual:** Basemap → Region zoom → Color fill → Route/annotation → Ground footage toggle

**Composition cụ thể:**
1. **Basemap:** Clean, decluttered map style (Mapbox custom style, labels stripped)
2. **Camera move:** Zoom + pan đến region. Johnny Harris animates 5 properties: latitude, longitude, zoom, bearing, pitch
3. **Region highlight:** Country/area fills với accent color, thường có border
4. **Annotations:** Thin white callout lines nối từ map element đến label text. Labels xuất hiện on cue (sync với voiceover).
5. **Toggle:** Sau khi giải thích trên map, cut/toggle sang ground-level footage hoặc ảnh từ khu vực đó — tạo "bird's eye to ground level" context.

**Thời lượng map scene:** 15-30 giây mỗi beat map, sau đó toggle sang footage/ảnh.

**Nguồn:** Storybench Sam Ellis interview: "Toggling between a map and what's happening on the ground seems to really help people understand the story." (https://www.storybench.org/vox-atlas-producer-sam-ellis-on-his-map-animations/)

### 6.3 Document/Archival Scene

**Cấu trúc visual:** Document scan trên surface → Slow push-in → Highlight sweep → Bold text reveal

**Composition cụ thể:**
1. **Background:** Wooden desk hoặc dark surface (không pure black)
2. **Document:** Scan báo/tài liệu — có film grain, vignette, slight chromatic aberration ở rìa
3. **Camera move:** Slow push-in (3-5% zoom over clip), 2D only — no 3D rotation
4. **Highlight:** Yellow marker sweep quét qua cụm từ quan trọng, đồng bộ với voiceover
5. **Text reveal:** Phrase được highlight enlarge ra thành bold kinetic typography

**Đặc điểm kỹ thuật:**
- Chromatic aberration ở rìa frame (Gaussian blur mask circular, feather ~50)
- Lens characteristics để tạo cảm giác "real" cho 2D elements
- Nền có thể dùng motion background (nhiều texture chạy 2-3 texture/giây)

**Nguồn:** PremiumBeat "5 Breakdowns" — technique 5 (lens characteristics) và technique 4 (motion background) (https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/)

### 6.4 Data/Chart Scene

**Cấu trúc visual:** Chart trên nền paper → Bars/circles grow (staggered) → Callout numbers appear → Counter animation

**Composition cụ thể:**
1. **Background:** Warm cream paper với subtle grain
2. **Chart elements:** Bar chart — tallest bar màu accent (vàng Vox), còn lại muted navy. Counter animation: 1.5-2s từ 0 đến final value. Stagger delay giữa các element: 150-300ms.
3. **Labels:** Thin callout lines + white text labels
4. **Timing:** Hold time sau khi stat xuất hiện: 2-3 giây minimum (viewer cần thời gian đọc + process)

**Nguồn:** MotionGraphicsEditor.ai (https://motiongraphicseditor.ai/how-to-create-vox-style-animated-infographics-with-ai-the-complete-breakdown/): "Counter animations: 1.5–2 seconds from 0 to final value. Stagger delay between elements: 150–300ms. Hold time after a stat appears: 2–3 seconds minimum."

### 6.5 Collage/Paper Cutout Scene

**Cấu trúc visual:** Textured background → Cutout elements (stagger anim) → Tape/pin accents → Title

**Composition cụ thể:**
1. **Outer frame:** Solid saturated color (vd: vermillion red cho chủ đề lịch sử) — ~10-15% frame edge
2. **Inner panel:** Aged cream/off-white paper với subtle grain
3. **Cutout elements:** Archival photo/illustration cutout — white border (3-6px sticker edge), soft drop shadow. Arranged với shallow layered depth. Có thể có multiple cutouts ở các vị trí khác nhau.
4. **Tape/pins:** Washi tape strips ở các góc panel, như thể được ghim lên bảng
5. **Halftone dots:** Screen-print dot patterns làm accent fills hoặc shadows
6. **Flat geometric:** 1-2 shapes (triangle, circle, dot) màu accent, đặt asymmetrically

**Animation:** Slow 2D push-in (3-5% zoom). Layer parallax (background drifts slower). Elements slide in từ edge và settle (không morphing, không dissolve trong shot).

**Nguồn:** GitHub vox-style-guide.md — toàn bộ section "Visual Grammar" và "Motion grammar"

### 6.6 Scene Transitions

**Các kiểu transition phổ biến:**
1. **3D camera track backward + blur:** Camera zoom out từ scene hiện tại, blur tăng tại edit point, sau đó focus vào scene mới. Tạo linear sense of movement.
2. **Hard cut:** Dùng khi chuyển từ map sang ground footage, hoặc sang title card.
3. **Crossfade:** 300-500ms, dùng cho social media/short form.

**Timing:**
- Transition duration: 300-500ms
- Blur peak: tại chính xác edit point
- Camera ease: EasyEase keyframes, peak tại midpoint

**Nguồn:** PremiumBeat technique 2 (tracking transitions), MotionGraphicsEditor.ai transition timing.

---

## 7. So sánh với các kênh explainer tương tự

### 7.1 Johnny Harris (solo, post-Vox)

| Yếu tố | Vox Classic | Johnny Harris |
|--------|------------|---------------|
| **Phong cách** | Paper collage editorial | Cinematic documentary + sketchy maps |
| **Map style** | Clean, decluttered Mapbox | Sketchy, hand-drawn feel, vintage textures |
| **Camera work** | 2D push-in, static | 3D orbit, bearing/pitch animation (5-property map animation) |
| **On-location** | Hiếm (chủ yếu archive) | Thường xuyên (travel, drone footage) |
| **Texture** | Halftone, paper grain | Film grain, vintage textures, light leaks |
| **Typography** | Bold condensed sans trên frame | Bold text overlay, thường dùng highlight sweep |
| **Narration** | Calm, editorial | Conversational, personal |
| **Cấu trúc video** | 5-part arc (cold open → context → escalation → complication → resolution) | Visual anchor → context bridge → recurring anchors → zoom-out |
| **Thời lượng** | 5-10 phút | 15-30 phút |

**Điểm chung:** Cả hai đều dùng "visual anchors before context", đều có animation background, đều viết script SAU KHI tìm visual.

**Nguồn:** Athens blog Johnny Harris summary (https://tryathens.com/blog/johnny-harris-writing-advice), Medium breakdown, Easy-Peasy.AI guide.

### 7.2 Cleo Abram / Huge If True

| Yếu tố | Vox Classic | Cleo Abram |
|--------|------------|------------|
| **Phong cách** | Mixed-media editorial collage | Direct-to-camera + motion graphics |
| **Talking head** | Không (Joe Posner's rule: "no desks") | Có — direct-to-camera là core |
| **Text overlay** | Bold kinetic typography, on-beat | Text overlay nhiều màu (vàng, xanh lá, xanh dương) + emoji, 1-2s mỗi overlay |
| **B-roll** | Archival photo cutouts, maps | Motion graphics heavy, visual metaphor |
| **Pacing** | Đều, editorial | Extreme opening hooks (<1s cuts), sau đó chậm lại |
| **Split screen** | Hiếm | Thường dùng (reaction format, split screen với expert) |
| **Thời lượng** | 5-10 phút | 8-20 phút |

**Điểm chung:** Cả hai đều xuất thân từ Vox, dùng motion graphics làm visual metaphor (không generic B-roll), và đều front-load payoff trong 3-5 giây đầu.

**Nguồn:** EditorDuel Cleo Abram analysis, The Philox profile (https://thephilox.com/meet-cleo-abram-a-beacon-of-optimistic-tech-journalism-2)

### 7.3 Vox Earworm (Estelle Caswell)

| Yếu tố | Vox Classic | Vox Earworm |
|--------|------------|-------------|
| **Chủ đề** | News, politics, science | Music theory, music history |
| **Visual style** | Paper collage, maps | Mixed-media animation, music notation graphics |
| **Đặc trưng** | Editorial typography, halftone | Collage + character animation, music visualization |
| **Design approach** | Joey Sendaydiego: "find one anchor motif, repeat" | Estelle Caswell: self-taught, visual metaphor cho music concepts |
| **Team** | Team sản xuất (script, design, animation, fact-check) | Estelle làm hầu hết các khâu (multi-hyphenate) |

**Nguồn:** School of Motion podcast với Estelle Caswell (https://schoolofmotion.com/blog/estelle-caswell-vox-podcast), Podenco portfolio (https://podenco.tv/vox-earwormdub-music)

---

## 8. Các nguyên tắc kỹ thuật cụ thể cho Remotion/React implementation

### 8.1 Frame rate và animation

| Yếu tố | Giá trị | Ghi chú |
|--------|---------|---------|
| **Timeline chính** | 24fps | Chuẩn Vox |
| **Graphics composition** | 12fps ("on twos") | Tạo stutter feel, đặc trưng Vox |
| **Animation curve** | Soft ease-out cho entry, faster sharper exit | Dùng chung 1 motion language cho toàn video |
| **Element entry direction** | Lower thirds: slide từ trái. Statistics: fade up. Maps: scale in từ slight zoom | Nhất quán trong toàn video |

**Nguồn:** PremiumBeat technique 1 (12fps), Medium "50 Vox Videos" pattern 5 (animation curve consistency).

### 8.2 Color palette

| Vai trò | Màu | Ghi chú |
|---------|-----|---------|
| **Background chính** | Cream/off-white (#F5F0E8 ~estimate) | Aged paper, subtle grain |
| **Background alt** | Dark (#1a1a2e ~estimate) | Cho title card, nighttime scenes |
| **Text chính** | White (#FFFFFF) hoặc off-white | Bold, high contrast |
| **Accent color** | Vox Yellow (#FFD600 ~estimate) | Dùng cho highlight sweep, tallest chart bar, flat accent shapes |
| **Secondary elements** | Muted navy, charcoal, gray | Tất cả các visual hỗ trợ đều desaturated |

**Quy tắc:** Chỉ 3-4 màu trên mỗi frame. Accent color chiếm ~5-10% diện tích frame. Áp dụng NHẤT QUÁN qua TẤT CẢ các scene.

**Nguồn:** Medium "50 Vox Videos" pattern 6, Easy-Peasy.AI technique 7.

### 8.3 Subtitle/Caption specs

| Thuộc tính | Giá trị |
|-----------|---------|
| **Font** | Bold condensed sans (Archivo Black, Inter ExtraBold) ~estimate |
| **Fill** | White (#FFFFFF) |
| **Outline** | Black, 3-4px |
| **Vị trí** | Bottom-center |
| **Margin bottom** | ~4% (43px trên 1080p) |
| **Max dòng** | 2 dòng |
| **Max ký tự/dòng** | ~42 characters |
| **Case** | Sentence-case |
| **Tùy chọn** | Highlight 1 key word mỗi caption bằng accent color |

**Nguồn:** GitHub vox-style-guide.md "Subtitle style (Stage 6)"

### 8.4 Texture và imperfections

Các yếu tố "cố ý không hoàn hảo" tạo nên Vox look:

1. **Film grain** — overlay trên toàn bộ footage
2. **Paper texture** — nền không bao giờ pure white
3. **Halftone dot patterns** — screen-print dots cho accent fills
4. **Chromatic aberration** — slight RGB split ở rìa frame (free plugin Quick Chromatic Aberration)
5. **Vignette** — soft darkening ở rìa, kéo mắt vào center
6. **Torn/rough edges** — cho paper cutouts (feDisplacementMap SVG filter trong web)
7. **Choppy stop-motion** — 12fps animation trong timeline 24fps

**Nguồn:** PremiumBeat, Easy-Peasy.AI technique 6, GitHub vox-style-guide.md.

### 8.5 Typography specs

| Loại | Font | Weight | Size (1920x1080 estimate) |
|------|------|--------|---------------------------|
| Headline (title card) | Archivo Black / Inter ExtraBold | 900 (Black) | ~80-120px |
| Sub-headline | Inter / Helvetica Neue | 700 (Bold) | ~48-64px |
| Body/label | Inter / Helvetica Neue | 400-500 (Regular-Medium) | ~24-36px |
| Data number (chart) | Archivo Black | 900 | ~100-160px |
| Lower third primary | Inter / Roboto | 700 (Bold) | ~36pt minimum |
| Lower third secondary | Inter / Roboto | 400-500 | ~60-75% của primary |
| Subtitle | Archivo Black / Inter ExtraBold | 700-900 | ~28-36px (estimate) |

**Nguồn:** GitHub vox-style-guide.md, Infinite Creation lower third guide, Easy-Peasy.AI.

### 8.6 Camera moves

| Move | Thông số | Ghi chú |
|------|----------|---------|
| **Slow push-in** | 3-5% zoom over clip | 2D only, không 3D rotation |
| **Layer parallax** | Background drifts slower than foreground | Tạo shallow depth |
| **Map zoom** | Animate 5 properties: lat, lon, zoom, bearing, pitch | Offset bearing keyframes để camera "comes down and orbits" |
| **Transition blur** | Gaussian blur, peak tại edit point | Kết hợp với camera track backward |

**Nguồn:** GitHub vox-style-guide.md motion grammar, Easy-Peasy.AI technique 3.

---

## 9. Quy trình sản xuất tham khảo

### 9.1 Vox production timeline (từ Storybench interviews)

- **Thời gian sản xuất 1 video:** 2-3 tuần (full-time, 1 producer làm tất cả các khâu)
- **Team size:** ~9 người trong credit (cho video phức tạp)
- **Quy trình:** Research → Script → Visual concept → Asset creation (Photoshop, cắt dán) → Animation (After Effects) → Assembly (Premiere) → Sound design
- **Công cụ:** After Effects (animation), Photoshop (cutouts, assets), Premiere (assembly), GEOlayers + Mapbox (maps)

### 9.2 Johnny Harris workflow

- **Visual-first:** Tìm visual idea trước, viết script sau
- **"Visual anchors before context":** Mở đầu bằng bằng chứng trực quan, sau đó mới cung cấp ngữ cảnh
- **Recurring anchors:** Cùng một visual quay lại xuyên suốt video như một nhân vật
- **Three-act structure:** Hook/Mystery → Development (expert insights + visual evidence) → Resolution/Takeaway

**Nguồn:** Athens blog, Medium breakdown, Storybench interviews.

---

## 10. Tóm tắt actionable cho Remotion/React

### Component architecture gợi ý

```tsx
// Cấu trúc component cây cho một frame Vox-style
<VoxFrame>
  <OuterColorField color={accentColor} width="10%" />  {/* Optional */}
  <TexturedPaperBackground texture={paperTexture} />
  <PaperCutoutLayer>
    <PhotoCutout src={image} borderWidth={4} shadowDepth={8} />
    <WashiTape rotation={-3} position="topLeft" />
    <HalftonePattern density={30} />
  </PaperCutoutLayer>
  <AnnotationLayer>
    <CalloutLine from={pointA} to={pointB} color="white" thickness={2} />
    <FlatAccent shape="circle" color={accentColor} size={24} />
  </AnnotationLayer>
  <TypographyLayer>
    <BoldHeadline text="TITLE" fontSize={96} fontFamily="Archivo Black" />
    <HighlightSweep color="#FFD600" duration={1.5} />
  </TypographyLayer>
  <SubtitleLayer
    text="Subtitle text here"
    marginBottom="4%"
    maxLines={2}
    maxChars={42}
  />
  <TextureOverlay>
    <FilmGrain opacity={0.03} />
    <Vignette intensity={0.3} />
  </TextureOverlay>
</VoxFrame>
```

### Constants cho 1920x1080

```ts
const FRAME = { width: 1920, height: 1080 };
const SAFE = {
  titleSafe: { x: 192, y: 108, width: 1536, height: 864 },    // 10% margin
  actionSafe: { x: 96, y: 54, width: 1728, height: 972 },      // 5% margin
  subtitleBottom: 43,  // ~4% bottom margin
  topTitleMargin: 86,  // ~8% top margin (estimate)
};
const FPS = { timeline: 24, graphics: 12 };
const COLORS = {
  accent: '#FFD600',      // Vox yellow (estimate)
  background: '#F5F0E8',  // Cream paper (estimate)
  dark: '#1a1a2e',        // Dark background (estimate)
  text: '#FFFFFF',
  muted: '#2c3e50',       // Navy/charcoal (estimate)
};
const STICKER_BORDER = { width: 4, unit: 'px' }; // 3-6px
const ANIMATION = {
  counterDuration: 1.5,   // seconds, 0 to final value
  staggerDelay: 0.2,      // seconds, between elements
  holdAfterStat: 2.5,     // seconds minimum
  transitionDuration: 0.4, // seconds, 300-500ms
  pushInZoom: 1.05,       // 3-5% zoom factor
};
```

---

## 11. Danh sách nguồn đầy đủ

1. **GitHub vox-style-guide.md** — Visual grammar, frame composition, subtitle specs
   https://github.com/CK42BB/vox-explainer-skill/blob/main/references/vox-style-guide.md

2. **Medium "I Watched 50 Vox Videos Back-to-Back"** — 7 patterns: cold open, per-number rule, color palette, animation curve
   https://medium.com/@seijiyushin/i-watched-50-vox-videos-back-to-back-here-is-what-they-all-share-88a42e293459

3. **PremiumBeat "5 Breakdowns on Replicating the VOX Motion Graphic Look"** — 12fps, tracking transitions, lower thirds, motion BG, lens characteristics
   https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/

4. **Cliptude "Vox Style Animation"** — Visual language pillars, three pillars (Geography, Numbers, Time)
   https://cliptude.com/vox-style-animation/

5. **VideoAI.me "12 Vox-Style Explainer Video Examples"** — Scene archetypes, "one idea per scene", paper collage
   https://videoai.me/blog/vox-style-explainer-video-examples-2026

6. **Easy-Peasy.AI "How to Make Vox-Style Videos with AI"** — 7 techniques, script formula, prompt cookbook
   https://easy-peasy.ai/blog/how-to-make-vox-style-videos-with-ai

7. **Storybench "How Vox uses animation" (Joey Sendaydiego)** — Art director process, paper construction visuals
   https://www.storybench.org/how-vox-uses-animation-to-make-complicated-topics-digestible-for-everyone/

8. **Storybench "Vox Atlas: Producer Sam Ellis"** — Map animation formula, toggle map/ground footage
   https://www.storybench.org/vox-atlas-producer-sam-ellis-on-his-map-animations/

9. **School of Motion "Vox Earworm Storytelling: Estelle Caswell"** — Design approach, self-taught motion design
   https://schoolofmotion.com/blog/estelle-caswell-vox-podcast

10. **Athens "Johnny Harris's Advice on Storytelling"** — Visual anchors, script-after-visuals, three-act structure
    https://tryathens.com/blog/johnny-harris-writing-advice

11. **EditorDuel "How Cleo Abram's Editing Formula Turns Science Explainers Into Addictive Content"** — Opening hooks, text overlays, visual metaphors, pacing shifts
    https://blog.editorduel.com/blog/cleo-abram-editing-formula-science-explainers (trang 404, dữ liệu từ search snippet)

12. **The Philox "Meet Cleo Abram"** — Visual style: direct-to-camera, bold animations, graphs, text
    https://thephilox.com/meet-cleo-abram-a-beacon-of-optimistic-tech-journalism-2

13. **MotionGraphicsEditor.ai "How to Create Vox-Style Animated Infographics"** — Counter animation timing, stagger delay, hold time
    https://motiongraphicseditor.ai/how-to-create-vox-style-animated-infographics-with-ai-the-complete-breakdown/

14. **Infinite Creation "Lower Third Design"** — Safe zone placement, typography rules, animation timing
    https://infinitecreation.io/tutorial-lower-thirds

15. **ITU-R BT.1848-1** — Safe areas for 16:9 (action safe 3.5%, graphics safe 5%)

---

## Ghi chú

- **Mọi giá trị đánh dấu "~estimate" là ước lượng từ phân tích frame và tổng hợp nguồn, KHÔNG phải số liệu chính thức từ Vox.**
- **Màu sắc (Vox yellow #FFD600, cream #F5F0E8, dark #1a1a2e) là estimate — cần verify từ actual frame extractions.**
- **Không nguồn nào công khai grid system hay exact pixel margins của Vox. Các giá trị margin dựa trên broadcast standards và phân tích từ style guide.**
- **Vox không có một "brand guideline" công khai.** Style được định nghĩa qua thực hành nhất quán của team sản xuất, do các art director như Joey Sendaydiego, Joss Fong, Joe Posner thiết lập.
