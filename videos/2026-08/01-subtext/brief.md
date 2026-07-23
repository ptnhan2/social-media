# Video #1: Why AI Can't Write Subtext — Production Brief

## Tóm tắt video (tiếng Việt — cho bạn review)

### Mở đầu (Hook — 3-beat)

**Beat 1 (Pull in)**: Bạn vừa viết 3 tiếng với AI. Ngữ pháp hoàn hảo. Cấu trúc đúng. Bạn đọc lại... và không cảm thấy gì cả. Nhân vật nói "tôi cảm thấy buồn" thay vì cho bạn thấy họ đang buồn.

**Beat 2 (Flip)**: Bạn nghĩ vấn đề là prompt. Nên bạn sửa prompt. Thêm "show don't tell." Thêm "không giải thích cảm xúc." Và kết quả vẫn vậy. Vẫn phẳng. Vẫn vô hồn.

**Beat 3 (Seal)**: Vấn đề không phải prompt của bạn. Vấn đề nằm trong cách AI được train — và một khi bạn hiểu điều đó, bạn không thể nhìn AI viết fiction như cũ nữa.

### Nội dung chính

**Tại sao AI không viết được subtext?**

Subtext là khi nhân vật nói A nhưng ý là B. Người đọc tự suy ra. Hemingway viết cả câu chuyện về phá thai mà không bao giờ dùng từ "phá thai." Người đọc phải tự infer. Đó là điều khiến fiction sống — nó tin người đọc đủ thông minh để tự hiểu.

AI không làm được điều này. Không phải vì nó "dumb." Mà vì nó được train bằng RLHF (Reinforcement Learning from Human Feedback) — quá trình reward AI khi nó helpful, clear, explicit. Tức là: AI được dạy rằng RÕ RÀNG = TỐT. Mơ hồ = TỆ.

Nhưng subtext CẦN mơ hồ. Subtext cần nhân vật KHÔNG nói rõ. AI được train ngược lại với những gì fiction cần. Đó là feature, không phải bug.

**Bằng chứng (không phải list — là story):**

NailedIt.ai cho cả Claude và ChatGPT viết cảnh buồn — không được dùng "sad, cry, tears, heartbreak." Kết quả?

Claude tưới cây đã chết. Order coffee nhầm. Cầm hai cốc — một cho người đã mất. Bạn ĐỌC và cảm thấy buồn.

ChatGPT viết: "Just like the stain on the plate, the stain on his heart would never wash away." Bạn đọc và nghĩ: "Ồ, ẩn dụ." Nhưng bạn không cảm thấy gì.

Khác biệt? Claude show qua hành động. ChatGPT tell qua metaphor. Cả hai đều fail ở subtext thật — nhưng fail theo cách khác nhau.

Reddit r/WritingWithAI (214 upvotes, 77 comments): "It defaults to naming emotions rather than evoking them through concrete detail. 'She felt sadness' vs making the reader feel it through sensory specifics. This required the most manual rewriting."

ACL paper "Narrative Flattening" (2026): RLHF đàn áp sự mơ hồ. AI theo nghĩa đen không thể KHÔNG giải thích. Càng align nhiều → writing càng ít variation.

**Cách khắc phục:**

3 quy tắc — nhưng không phải "tips." là cách override training bias của AI:

**Quy tắc 1**: Không bao giờ để AI gọi tên cảm xúc. "Describe what the character DOES, not what they FEEL." — Đây không phải styling. Đây là trực tiếp chống lại RLHF training.

**Quy tắc 2**: Cho AI biết subtext riêng. "The character is angry about X but will never mention X directly." — Bạn đang cho AI thông tin mà nó được train KHÔNG được giữ bí mật. Bạn phải ép nó.

**Quy tắc 3**: Ràng buộc đối thoại. "Characters must talk about Y while the real tension is about X." — Bạn đang tạo khoảng cách giữa what-is-said và what-is-meant. Khoảng cách đó = subtext. AI không tự tạo được.

### Kết (Snap-back)

"AI không hỏng. Nó được tối ưu cho mục đích khác fiction. Khi nó nói 'she felt sadness' — nó làm đúng như được dạy: helpful, clear, explicit. Nhưng fiction không cần helpful. Fiction cần trust. Trust rằng reader đủ thông minh để tự hiểu. Prompt của bạn không sửa AI — prompt của bạn bridge gap giữa hai mục đích đó."

### CTA
"Building an AI agent for novelists. Follow for updates."

---

## Thông tin kỹ thuật

- **Tiêu đề (English)**: "Why AI Can't Write Subtext — And the Prompt Framework That Fixes It"
- **Cơ chế**: #5 First principles
- **Cấu trúc**: D (Myth → Reality → Proof → Takeaway) — nhưng KHÔNG dùng section headers. Flow tự nhiên: scene → problem → root cause → evidence → fix → snap-back
- **Độ dài**: 8-12 phút
- **Nguồn**: ACL Narrative Flattening paper, NailedIt.ai, Reddit r/WritingWithAI (214↑, 77 comments), r/ClaudeAI
- **Emotional job**: Viewer nên rời đi với cảm giác "À, ra là vậy" — hiểu được TẠI SAO AI viết vô hồn, không chỉ HOW to fix
- **The ONE thing**: AI không hỏng — nó được tối ưu cho mục đích khác fiction
- **The gap**: Viewer biết AI viết vô hồn nhưng không biết TẠI SAO (nghĩ là prompt sai)
- **Snap-back**: "Fiction không cần helpful. Fiction cần trust."

### Hook (English — agent draft)
"You just spent three hours writing with AI. The grammar is perfect. The structure is sound. And something is... off. Your characters say exactly what they mean. Nobody talks around anything. It reads like a textbook wearing a novel's clothes. You think the problem is your prompt. It's not. The problem is how AI was trained — and once you see it, you can't unsee it."

### Visual cues
- Mở: Screen với AI output text, highlight "she felt sadness" → cross out
- RLHF training loop diagram (reward → clear → explicit → repeat)
- Side-by-side: Claude output (actions) vs ChatGPT output (metaphor) — annotated
- Reddit quote on screen (214↑, 77 comments)
- Prompt framework: 3 rules as visual template, each rule appearing as you explain
- Snap-back: Split screen — "helpful/clear/explicit" (AI training) vs "trust/ambiguity/imply" (fiction craft)

---

## Vietnamese summary per section (cho user check logic)

**Hook**: Bạn viết với AI 3 tiếng → output hoàn hảo nhưng vô hồn → bạn nghĩ sai prompt → sai, vấn đề là training

**Root cause**: Subtext cần mơ hồ. AI được train RLHF → reward rõ ràng. AI không thể KHÔNG giải thích. Paper ACL chứng minh.

**Evidence (story, không phải list)**: Test NailedIt — Claude show qua hành động (tưới cây chết), ChatGPT tell qua metaphor. Cả hai fail nhưng khác nhau. Reddit confirm (214↑). 

**Fix**: 3 quy tắc — nhưng frame là "override training bias" không phải "tips." Quy tắc 1: không cho AI gọi tên cảm xúc (chống RLHF). Quy tắc 2: cho AI subtext riêng (ép AI giữ bí mật). Quy tắc 3: ràng buộc đối thoại (tạo khoảng cách = subtext).

**Snap-back**: AI không hỏng. Nó được train để helpful/clear/explicit. Fiction cần trust/ambiguity/imply. Prompt bridge gap.

---

## English script (for production — agent sẽ viết full từ outline trên)

Agent viết full English voiceover script dựa trên outline tiếng Việt, đảm bảo:
- Mở bằng SCENE không phải section header
- Show suffering trước khi explain root cause
- Storytelling: Claude vs ChatGPT comparison như story có character
- 3-beat hook: Pull in → Flip → Seal
- Snap-back close
- 1-3-1 sentence rhythm
- "Therefore/But" giữa sections
- 130-150 wpm, contractions, <20 words/sentence
- Read aloud trước khi generate ElevenLabs
