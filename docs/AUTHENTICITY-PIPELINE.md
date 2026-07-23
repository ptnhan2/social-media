# Authenticity Pipeline — Stack-Optimized (No Tool Changes)

> Researched July 22, 2026 from 150+ sources.
> Core principle: OPTIMIZE the existing stack (ElevenLabs default + Open Design + CapCut), NOT replace it.

---

## 1. ElevenLabs Default Voice Optimization

### Settings (from 50+ sources)

| Setting | Value | Why |
|---------|-------|-----|
| **Stability** | **35-45%** (LOW) | Counter-intuitive — low stability = natural variation, not robotic |
| Similarity | 75-80% | Consistent but not stiff |
| Style | 0-15% | Low for narration — high = over-dramatic |
| Speaker Boost | ON | Clarity |
| Speed | 0.95-1.05 | Slightly slower = more natural |
| Model | Multilingual v2 (narration) / Eleven v3 (emotion) | v3 supports audio tags |

### Script Formatting = Performance Direction

**Language**: Script = English. User drafts hook in Vietnamese → agent translates to English preserving voice. Agent provides Vietnamese summary per section for user to verify logic.

| Technique | Effect | Example |
|-----------|--------|---------|
| `...` (ellipsis) | Natural pause, hesitation | "AI can't write subtext... and here's why." |
| `—` (em dash) | Dramatic break | "The problem isn't the model — it's the training." |
| ALL CAPS | Emphasis | "AI LITERALLY cannot do this" |
| `"quotes"` | Emphasis shift | The model treats this as "important" |
| Expand numbers | Correct reading | "twenty twenty-six" not "2026" |
| Chunks 500-800 chars | Separate files, reduce artifacts | Each chunk = 1 segment |

### ElevenLabs v3 Audio Tags

```
[excited] AI can actually do this!
[whispers] But there's a catch...
[sighs] And that's why most AI novels fail.
[narration] The context window problem is simple.
```

### Post-Processing Chain (CapCut or DAW)

```
1. HPF 80Hz (cut low rumble)
2. Subtractive EQ: cut mud 200-400Hz, nasal 700-1200Hz
3. Compression 3:1 ratio
4. De-esser 5-8kHz (AI voice needs STRONGER de-essing — extend to 12-16kHz)
5. Presence boost +2dB at 3-5kHz
6. Air shelf +1dB at 10kHz+
7. Subtle saturation (add warmth, reduce "too clean")
8. Light reverb (add physicality — AI voice has no spatial presence)
9. Limiter -1.0dB
10. Normalize -14 LUFS (YouTube standard)
```

**Key insight**: AI voice sounds fake because it's too "perfect." Saturation + reverb = physicality. Stronger de-essing = reduce TTS sibilance.

---

## 2. Open Design + CapCut Pipeline

### Open Design: DESIGN.md = Brand Contract

Create one `DESIGN.md` that locks:
- Palette: 2 primary + 1 accent (exact hex)
- Typography: font stack + weights
- Lighting style: 1 phrase ("golden hour side-light, cinematic")
- Composition: 2 rules max ("rule of thirds, subject lower-left")
- Anti-patterns: "NO purple gradients, NO emoji icons, NO Inter-as-display"

Every video: same DESIGN.md, different composition → consistency without sameness.

### Open Design: Anti-Slop Engine (Built-in)

- Vision self-critique: screenshots own output → scores → iterates until pass
- Hallmark anti-slop: 21 macro structures, detects generic patterns
- Sketch phase: 2-3 throwaway directions before committing
- Humanizer: strips AI tells (em-dashes overuse, "moreover," "furthermore")

### Voice-Led Editing (CRITICAL)

```
1. Generate ElevenLabs audio FIRST
2. Measure exact duration per segment (FFmpeg: ffprobe)
3. Pass durations to Open Design → generate visuals to MATCH audio
4. Import both into CapCut
5. Audio sets the timeline, visuals support
```

### CapCut Settings

| Technique | Setting | Purpose |
|-----------|---------|---------|
| Auto-captions | Montserrat Bold, black stroke 15px, spring anim 0.1s, max 3 words | Retention + accessibility |
| Enhance Voice | Strength 50-70% | Clean AI voice |
| Normalize Loudness | -14 LUFS | YouTube standard |
| Background music | -22dB or lower | Don't compete with voice |
| Film grain overlay | Subtle | **CRITICAL** — masks AI "too perfect" look |
| Transitions | 90% hard cuts, 10% creative | Hard cuts = pro, fades = amateur |
| Visual change | Every 1.8-2.5 seconds | Prevent viewer loss |
| Pattern interrupts | Every 90-120s | Reset attention |
| Color grade | Consistent LUT | Visual identity |

**Key insight**: Film grain = #1 technique to make AI visuals not look AI. AI makes everything mathematically perfect — grain adds randomness we associate with real cameras.

---

## 3. Content/Process Authenticity (No Tool Changes)

### ⚠️ CRITICAL: "Alive" vs "Mechanical" — The Difference That Matters

> Research from web5ngay (4.24M subs), Vui Vẻ (1.2M subs), Kurzgesagt (23M subs), Zenn (150K+ in 2 months).
> Passing compliance ≠ being engaging. Content must FEEL alive, not just pass review.

| Mechanical (AVOID) | Alive (TARGET) |
|---|---|
| Opens with "Section 1: Myth — nhiều writer cố..." | Opens with a SCENE: "Bạn viết với AI 3 tiếng. Output hoàn hảo. Và bạn xóa hết." |
| Explains concepts like Wikipedia definition | Shows someone SUFFERING without the concept first |
| Evidence = list of sources | Evidence = STORY with tension and characters |
| Ends with "3 quy tắc prompt" | Ends with snap-back to viewer's life: "AI không hỏng. Nó được tối ưu cho mục đích khác." |
| Sounds like anyone could have made it | Sounds like only THIS channel could have made it |
| No POV — just facts | Strong POV — "this is how I see it" |
| Smooth, resolved, no friction | Has rough edges, admits uncertainty, leaves some things complex |

### Core Principle: "Show Suffering Before Framework"

> **DON'T explain the framework first. Show someone suffering WITHOUT it first.**

❌ "Sanderson's Second Law states that limitations are more important than powers."
✅ "Here's a mistake that killed more fantasy novels than bad prose ever did. The hero is trapped. The villain is closing in. And suddenly — the hero discovers a NEW magic power. One the reader has never heard of. One that solves everything. The reader closes the book."

### Storytelling Techniques from KTTV (2.72M subs — analyzed from actual transcripts)

> These are NOT "structures" (templates). They are STORYTELLING TECHNIQUES that make content feel alive. Every video is a different emotional journey, but all use these techniques.

**1. Circular open loop + callback**
- Mở video bằng một promise/question → kết video bằng callback đến promise đó
- VD KTTV: Mở "nếu cuối năm này đúng thì quay lại video" → Kết "cuối năm nhớ quay lại chia sẻ"
- Viewer cảm thấy tham gia conversation đang tiếp diễn, không phải one-way lecture

**2. Anxiety cascade → relief**
- Rapid-fire examples tạo overwhelm → THEN promise simplicity = relief
- VD KTTV: "AI bùng nổ... rồi thì Trump đánh thuế... rồi thì Trung Quốc... Thái Lan..." → "Việc phân tích phức tạp. Thế nên mình sẽ chia sẻ 5 điều"
- Viewer được "giải cứu" khỏi anxiety → sẵn sàng nghe

**3. Cultural reference = emotional stakes**
- Dùng reference mà viewer đã biết/thương → create emotional investment
- VD KTTV: "lời dặn của Bác Hồ — sánh vai các cường quốc năm châu"
- VD cho Craft × AI: "Sanderson spent years designing Allomancy" → viewer đã biết Sanderson = emotional stake

**4. Personification — biến abstract thành character**
- Abstract concept → character với tính cách
- VD KTTV: AI = "đống thằng đệ ngang tiến sĩ", Vietnam = "ông chủ đất sống vui vẻ"
- VD cho Craft × AI: RLHF training = "AI được dạy rằng rõ ràng = tốt, mơ hồ = tệ. Nó không thể KHÔNG giải thích — giống như bảo một người luôn honest đừng honest nữa."

**5. Contrast as primary argument**
- Không "AI nhanh" — là "ngày xưa 5 năm, bây giờ 1 phút"
- Contrast IS the insight. Viewer tự hiểu, không cần explain
- Luôn tìm cặp contrast: before/after, expectation/reality, common belief/truth

**6. Honesty through self-criticism**
- Khen rồi chê trong cùng câu. Tạo trust vì không one-sided
- VD KTTV: "vừa thông minh, mỗi tội đừng lười học" (khen + chê)
- VD Craft × AI: "Claude tốt hơn ChatGPT ở subtext — nhưng vẫn chưa đủ. Cả hai đều fail."
- "Mình chỉ DÁM cung cấp" — authority through humility, not expertise

**7. Writing for the EAR (not eye)**
- Onomatopoeia, slang, vivid imagery — bạn NGHE được
- VD KTTV: "quét mã vèo vèo", "ảo lòi", "úp sọt tới khô huyết tương", "thèm nhỏ rãi"
- VD Craft × AI (English): "AI doesn't just name emotions — it SLAPS labels on them", "the prose reads like a textbook wearing a novel's clothes"
- Test: đọc aloud. Nếu nghe như essay → rewrite. Nếu nghe như người nói → OK.

**8. Earned optimism**
- Không "X is great!" — là "X có tiềm năng, NHƯNG phải acknowledge difficulty trước"
- VD KTTV: toàn video nói VN có tiềm năng → kết: "không phải tự nhiên thành được, đứng im thì mơ cũng không theo"
- VD Craft × AI: "AI không hỏng — nó được tối ưu cho mục đích khác. Prompt bridge gap — NHƯNG chỉ nếu bạn hiểu gap tồn tại."

**9. Dual perspective**
- Mỗi point relevant cho CẢ experts VÀ beginners
- VD KTTV: "không chỉ tập đoàn siêu cường... mà người bình thường cũng..."
- VD Craft × AI: "Cho dù bạn dùng Sudowrite $99/month hay ChatGPT free — cùng vấn đề: AI names emotions."

**10. Urgency/deadline**
- Tạo time pressure để viewer feel stakes
- VD KTTV: "còn 10 năm nữa, sau 2039 già đi"
- VD Craft × AI: "Mỗi lần AI viết 'she felt sadness' thay vì show qua hành động — reader mất trust. Và trust khó lấy lại."

**11. Vietnamese idioms/cultural wisdom as argument**
- Thành ngữ/tục ngữ KHÔNG phải decoration — IS the argument
- VD KTTV: "ăn khoai vác mai", "thượng vàng hạ cám", "một lần bất tín vạn lần bất tin"
- For English content: use English idioms/metaphors that serve same function
- VD: "You can't un-ring a bell" = once AI explains, you can't make it mysterious again

**12. English words mixed naturally**
- KTTV mixes "SHOW ra", "livestream", "TikTok" naturally
- For English Craft × AI content: mix technical terms naturally, don't over-explain
- "RLHF literally trains AI to be a helpful assistant. Fiction doesn't need a helpful assistant. It needs a mysterious one."

---

## 4. Complete Production Pipeline

```
1. RESEARCH (45-60 min)
   ├── Define 1-sentence thesis (what you argue, not what you cover)
   ├── Collect 5-10 sources: academic + Reddit + craft lectures
   ├── Mine 1 Reddit thread for audience vocabulary (exact quotes)
   └── Write 1-page research brief

2. SCRIPT (60-90 min)
   ├── Hook + thesis: Agent drafts from research + framework, with research-based anchor
   ├── AI draft remaining sections from research brief
   ├── Human rewrite: remove 7 AI tells, vary rhythm, add open loops
   ├── Add inline visual direction: [SHOW: diagram], [TEXT: stat]
   ├── "Therefore/But" between sections
   └── Read aloud → fix stumbling

3. VOICEOVER + VISUALS + RENDER (automated via HyperFrames)
   ├── HyperFrames ElevenLabs skill: generate VO with API key
   │   (Settings: stability 35-45%, similarity 75-80%, style 0-15% — verify during setup)
   ├── HyperFrames transcribe: Whisper word-level timestamps for captions
   ├── Open Design DESIGN.md: generate visuals per scene matching narration
   ├── HyperFrames render: HTML composition → MP4 (visuals + VO + captions)
   └── Film grain overlay applied

4. FINAL POLISH (CapCut, 15-20 min)
   ├── Import HyperFrames MP4
   ├── Background music -22dB
   ├── Enhance Voice 50-70%, normalize -14 LUFS
   ├── 90% hard cuts (if needed beyond HyperFrames transitions)
   ├── Pattern interrupts every 90-120s
   └── Export 1080p, 30fps, H.264

5. PUBLISH (10 min)
   ├── Source links in description (Kurzgesagt model)
   ├── AI disclosure toggle ON
   ├── 1 specific CTA
   └── Respond to first comments (human signal)
```

**Total: ~2.5-3 hours/video** (research + script = 2h, automated render + CapCut polish = 30-45 min)

---

## 5. Organization Reference Rule

**Khi nhắc tổ chức/chuyên nghiệp — phải giải thích vai trò bằng analogy dễ hiểu**

| ❌ Đừng viết | ✅ Viết |
|---|---|
| "NailedIt.ai" | "NailedIt.ai — một trang test AI side-by-side, giống như blind taste test cho rượu vang" |
| "ACL paper" | "Bài nghiên cứu từ ACL — hội đồng khoa học về ngôn ngữ AI, giống như FDA nhưng cho nghiên cứu AI" |
| "RLHF" | "RLHF — cách AI được 'dạy dỗ' từ nhỏ, giống như nuôi dạy một đứa trẻ: reward khi ngoan, punish khi hư" |
| "OpenAI" | "OpenAI — công ty tạo ra ChatGPT, giống như Shakespeare của thế giới AI" |

Nguyên tắc: viewer không biết tổ chức này là ai → phải hiểu significance trong 1 câu. Dùng analogy từ đời thường.

---

## 6. Six Script Patterns (rotate for variety — NOT academic templates)

> Each pattern = direction for organic flow. NOT rigid template. Still use 12 storytelling techniques.

| # | Pattern | Flow | Feel | Max/month |
|---|---------|------|------|-----------|
| 1 | **The Detective** | Mystery → investigate → root cause reveal → fix | "À ra là vậy" | 2 |
| 2 | **The Contrarian** | "Everyone thinks X" → evidence against → real answer | "Mình sai từ đầu" | 2 |
| 3 | **The Deep Dive** | Surface observation → layer 1 → layer 2 → root cause | "Sâu hơn mình tưởng" | 2 |
| 4 | **The Comparison** | Two things side by side → what reveals → what it means | "Khác biệt nói lên tất cả" | 2 |
| 5 | **The Cascade** | One problem → bigger problem → biggest problem | "Hóa ra vấn đề lớn hơn" | 2 |
| 6 | **The Build** | Small observation → expand → reveal system → apply | "Từ nhỏ đến lớn" | 2 |

Rules:
- No 2 consecutive videos use same pattern
- Define emotional job BEFORE choosing pattern
- Pattern guides flow direction, storytelling techniques fill the content

---

## 6. Authenticity Checklist (Test Before Publishing)

Answer YES to at least 10/12:

1. Script written or heavily rewritten by human?
2. Contains analysis/synthesis/conclusions AI couldn't generate alone?
3. Sources cited (on screen + description)?
4. Viewer would instantly recognize this as YOUR channel?
5. Has unique angle/perspective, not just summarizing facts?
6. Voiceover has emotional variation (not flat/robotic)?
7. Visuals are custom (not shared stock)?
8. Video delivers on title/thumbnail promise?
9. Would this video still have value if AI tools didn't exist?
10. Upload frequency sustainable (not spam)?
11. Creative decisions documented (for appeal)?
12. AI disclosure toggled?

---

## 7. Single Highest-Impact Technique

**Hook + thesis drafted by agent from real research, reviewed by user.** The hook should contain a research-based anchor ("While researching the ACL paper on Narrative Flattening, I found...") that references actual research done for the video. User reviews the Vietnamese summary to verify the research is real and the logic is correct. The authenticity comes from: (1) the research actually happened, (2) the framework is human-designed, (3) the user reviewed and approved the logic.
