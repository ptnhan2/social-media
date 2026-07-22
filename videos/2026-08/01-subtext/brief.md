# Video #1: Why AI Can't Write Subtext — Production Brief

## Tóm tắt video (tiếng Việt — cho bạn review logic)

### Section 1: MYTH — "Chỉ cần nói AI đừng giải thích cảm xúc" (1-2 phút)

Nhiều writer cố prompt: "Don't name emotions, show don't tell." Output vẫn flat, vẫn nghe "giả AI." Tại sao? Vì vấn đề không phải prompt — mà là cách model được train.

### Section 2: REALITY — Subtext là gì + tại sao AI không làm được (3-4 phút)

**Subtext** = nhân vật nói vòng quanh ý thật. Reader tự suy ra meaning. Ví dụ: Hemingway "Hills Like White Elephants" — không bao giờ nói "abortion" nhưng cả story là về chuyện đó. Reader phải tự infer.

**Tại sao AI fail**: AI được train bằng **RLHF** (Reinforcement Learning from Human Feedback). Quá trình này reward: helpful, clear, explicit. Model học được: LUÔN giải thích, LUÔN rõ ràng. Khi AI viết "she felt sadness" — nó làm ĐÚNG như được train.

**Bằng chứng nghiên cứu**: ACL paper "Narrative Flattening" (2026) phát hiện: post-training (RLHF) đàn áp sự mơ hồ (ambiguity). AI theo nghĩa đen không thể KHÔNG giải thích. Càng align nhiều (train để safe + helpful) → writing càng ít variation về tone và implication.

**Insight chính**: Subtext cần mơ hồ. AI được train ngược lại. Đó là feature, không phải bug.

### Section 3: PROOF — So sánh Claude vs ChatGPT trên subtext (2-3 phút)

Từ test NailedIt.ai: cả 2 model viết cảnh character trải qua grief — không được dùng "sad, cry, tears, heartbreak."

- **Claude**: thể hiện grief qua hành động cụ thể — tưới cây đã chết, order coffee nhầm, cầm 2 cốc. Tốt hơn.
- **ChatGPT**: dùng symbol chung chung — empty apartment, silence. Kết bằng: "Just like the stain on the plate, the stain on his heart would never wash away." Tệ — giải thích metaphor thay vì show.

Claude tốt hơn nhưng vẫn chưa đủ. Cả 2 đều default về naming/symbolizing emotions thay vì embodying qua behavior.

**Cộng đồng confirm**: Reddit r/WritingWithAI (214 upvotes, 77 comments): "It defaults to naming emotions rather than evoking them through concrete detail. 'She felt sadness' vs making the reader feel it through sensory specifics. This required the most manual rewriting."

### Section 4: TAKEAWAY — Prompt framework cho subtext (2-3 phút)

3 quy tắc ép AI viết subtext:

**Quy tắc 1: Không bao giờ để AI gọi tên cảm xúc**
→ Prompt: "Describe what the character DOES, not what they FEEL. No emotion words."

**Quy tắc 2: Cho AI biết subtext riêng**
→ Prompt: "The character is angry about [X] but will never mention [X] directly. Show anger through behavior only."

**Quy tắc 3: Ràng buộc đối thoại**
→ Prompt: "Characters must talk about [Y] while the real tension is about [X]. They talk around X, never directly."

**Kết luận**: "Model không hỏng. Nó được tối ưu cho mục đích khác fiction. Prompt của bạn bridge gap đó."

### CTA
"Building an AI agent for novelists. Follow for updates."

---

## Thông tin kỹ thuật

- **Tiêu đề (English)**: "Why AI Can't Write Subtext — And the Prompt Framework That Fixes It"
- **Cơ chế**: #5 First principles
- **Cấu trúc**: D (Myth → Reality → Proof → Takeaway)
- **Độ dài**: 8-12 phút
- **Nguồn**: ACL Narrative Flattening paper, NailedIt.ai, Reddit r/WritingWithAI (214↑, 77 comments), r/ClaudeAI
- **Hook (agent draft, English)**: "While researching why AI-generated fiction always feels generic, I found something unexpected in an ACL research paper: AI can't write subtext not because it's broken, but because it's working exactly as designed. The training process that makes AI helpful and clear is the same process that kills ambiguity. And ambiguity is what makes fiction feel real."
- **Visuals**: Diagram RLHF training pipeline, side-by-side Claude vs ChatGPT output, prompt framework template on screen

---

## English script (for production — agent sẽ viết full từ outline tiếng Việt trên)

Agent sẽ dựa vào outline tiếng Việt ở trên để viết full English script cho voiceover, đảm bảo:
- First-person analytical voice
- Remove 7 AI-script tells
- "Therefore/But" giữa sections
- 130-150 wpm, contractions, <20 words/sentence
- Read aloud trước khi generate ElevenLabs
