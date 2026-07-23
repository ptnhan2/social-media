# Video #1: Why AI Can't Write Subtext — Production Brief

## Tóm tắt video (tiếng Việt — cho bạn review)

### Emotional journey: Curiosity → discovery

Viewer bắt đầu với "tôi biết AI viết vô hồn nhưng không biết tại sao" → kết thúc với "À, ra là vì AI được train ngược với fiction. Và tôi biết cách bridge gap."

### Script flow (không section header — organic storytelling)

**Mở (circular open loop + anxiety cascade):**

Bạn viết với AI 3 tiếng. Output hoàn hảo ngữ pháp. Bạn đọc lại... và không cảm thấy gì. Nhân vật nói "tôi cảm thấy buồn" thay vì cho bạn thấy họ buồn. Bạn sửa prompt: "show don't tell." Vẫn vậy. "Don't name emotions." Vẫn vậy. "Be subtle." Vẫn. Như. Vậy.

Bạn bắt đầu nghĩ: có phải mình dở prompt? Hay model dở?

Thực ra — cả hai đều không. Và khi tôi nói cho bạn biết lý do thực sự, bạn sẽ không nhìn AI viết fiction như cũ nữa. Hãy nhớ câu này — cuối video chúng ta quay lại.

**Root cause (personification + contrast):**

Subtext là gì? Là khi nhân vật nói A nhưng ý là B. Người đọc tự suy ra. Hemingway viết cả câu chuyện về phá thai mà không bao giờ dùng từ "phá thai." Người đọc phải tự infer. Đó là điều khiến fiction sống.

Bây giờ — tưởng tượng AI là một nhân viên được train từ nhỏ rằng: "Rõ ràng = tốt. Mơ hồ = tệ. Luôn giải thích. Luôn helpful. Luôn explicit." Bạn bảo nhân viên này: "Đừng giải thích, hãy ngụ ý." Nó sẽ nhìn bạn như bạn nói nó phản bội mọi thứ nó được dạy.

Và đúng vậy — đó chính xác là điều đang xảy ra. AI được train bằng RLHF (Reinforcement Learning from Human Feedback). Quá trình này reward: helpful, clear, explicit. Model học: LUÔN giải thích. Khi nó viết "she felt sadness" — nó làm ĐÚNG như được train.

Ngày xưa, writer học 5 năm 10 năm để master subtext. Bây giờ bạn bảo AI "hãy ngụ ý" trong 1 prompt. Giống như bảo một người luôn honest "đừng honest nữa" — bạn không thay đổi style, bạn đang chống lại bản chất.

**Evidence (story, không phải list — dual perspective):**

NailedIt.ai cho cả Claude và ChatGPT viết cảnh buồn — không được dùng "sad, cry, tears."

Claude tưới cây đã chết. Order coffee nhầm. Cầm hai cốc — một cho người đã mất. Bạn đọc và cảm thấy buồn.

ChatGPT viết: "Just like the stain on the plate, the stain on his heart would never wash away." Bạn đọc và nghĩ: "Ồ, ẩn dụ." Nhưng bạn không cảm thấy gì.

Khác biệt? Claude show qua hành động. ChatGPT tell qua metaphor. Cả hai đều fail ở subtext thật — nhưng fail khác nhau. Claude gần hơn, nhưng vẫn chưa đủ.

Và đây không chỉ là chuyên gia mới thấy. Reddit r/WritingWithAI — 214 upvotes, 77 comments — writer sau writer nói cùng điều: "AI names emotions thay vì evoke them. 'She felt sadness' thay vì make reader feel it. Phần này tốn nhiều công sửa nhất."

ACL paper "Narrative Flattening" (2026) chứng minh: RLHF đàn áp sự mơ hồ. AI theo nghĩa đen không thể KHÔNG giải thích. Càng align nhiều → writing càng ít variation. Đây không phải bug. Đây là feature.

**Fix (earned optimism — acknowledge difficulty trước):**

Vậy — bạn phải chấp nhận sống với AI viết vô hồn mãi mãi? Không. Nhưng fix không phải "prompt hay hơn." Fix là hiểu AI được train ngược với fiction, rồi viết prompt CỤ THỂ chống lại training đó.

Ba điều — nhưng đừng nghĩ đây là "tips." Đây là countermeasure. Mỗi điều trực tiếp chống lại 1 thứ RLHF dạy AI.

**Một**: Không bao giờ để AI gọi tên cảm xúc. "Describe what the character DOES, not what they FEEL." — Bạn đang trực tiếp chống lại training "be explicit about emotions." AI sẽ KHÔNG muốn làm điều này. Bạn phải ép.

**Hai**: Cho AI biết subtext riêng. "The character is angry about X but will never mention X directly." — AI được train để disclose, không giữ bí mật. Bạn đang bảo nó làm điều nó được dạy KHÔNG làm.

**Ba**: Ràng buộc đối thoại. "Characters must talk about Y while the real tension is about X." — Bạn tạo khoảng cách giữa what-is-said và what-is-meant. Khoảng cách đó = subtext. AI tự nhiên xóa khoảng cách đó — bạn phải tạo lại.

**Kết (callback + snap-back + earned optimism):**

Đầu video tôi nói: khi bạn biết lý do, bạn sẽ không nhìn AI viết fiction như cũ. Đây là lý do:

AI không hỏng. Nó được tối ưu để helpful, clear, explicit. Nhưng fiction không cần helpful. Fiction cần trust — trust rằng reader đủ thông minh để tự hiểu. AI sẽ luôn muốn giải thích. Nhiệm vụ của bạn là để nó ngụ ý.

Prompt của bạn không sửa AI. Prompt của bạn bridge gap giữa hai mục đích đó.

Và đó là điều mà 5 năm học viết không dạy bạn — vì trước AI, không ai cần học cách chống lại training. Bây giờ thì cần.

### CTA
"Building an AI agent for novelists. Follow for updates."

---

## Thông tin kỹ thuật

- **Tiêu đề (English)**: "Why AI Can't Write Subtext — And the Prompt Framework That Fixes It"
- **Cơ chế**: #5 First principles
- **Emotional journey**: Curiosity → discovery
- **The ONE thing**: AI không hỏng — nó được train ngược với fiction
- **The gap**: Viewer biết AI viết vô hồn nhưng nghĩ vấn đề là prompt
- **Snap-back**: "Fiction không cần helpful. Fiction cần trust."
- **Callback**: Mở "khi bạn biết lý do, bạn sẽ không nhìn AI như cũ" → kết "đó là lý do"
- **Độ dài**: 8-12 phút
- **Nguồn**: ACL Narrative Flattening paper, NailedIt.ai, Reddit r/WritingWithAI (214↑, 77 comments)

### Hook (English — agent draft)
"You just spent three hours writing with AI. The grammar is perfect. The structure is sound. And something is... off. Your characters say exactly what they mean. Nobody talks around anything. It reads like a textbook wearing a novel's clothes. You think the problem is your prompt. It's not. The problem is how AI was trained — and once you see it, you can't unsee it. Remember that — we'll come back to it."

### Storytelling techniques used
1. **Circular open loop**: "Remember that — we'll come back to it" → callback at end
2. **Anxiety cascade**: Rapid-fire "still. still. still." creates overwhelm
3. **Personification**: AI = employee trained since childhood to be clear/explicit
4. **Contrast**: "5 năm học vs 1 prompt" / "Claude show vs ChatGPT tell"
5. **Honesty**: "Claude gần hơn, nhưng vẫn chưa đủ" — doesn't oversell
6. **Writing for ear**: "textbook wearing a novel's clothes", "AI sẽ KHÔNG muốn làm điều này"
7. **Earned optimism**: "Bạn phải chấp nhận sống với AI vô hồn mãi?" → "Không. NHƯNG..."
8. **Dual perspective**: "không chỉ chuyên gia — Reddit writer sau writer nói cùng điều"

---

## Vietnamese summary per section (cho user check logic)

**Mở**: Bạn viết với AI → output vô hồn → sửa prompt không hiệu quả → không phải lỗi prompt, không phải lỗi model → "hãy nhớ câu này, cuối video quay lại"

**Root cause**: Subtext = nhân vật nói A ý B (Hemingway). AI được train RLHF = rõ ràng = tốt. AI không thể KHÔNG giải thích. "Ngày xưa 5 năm vs bây giờ 1 prompt" = Contrast. AI như nhân viên được train honest, bạn bảo đừng honest.

**Evidence**: NailedIt test — Claude show qua hành động (tưới cây chết), ChatGPT tell qua metaphor. Cả hai fail nhưng khác nhau. Reddit confirm (214↑). ACL paper confirm: RLHF đàn áp mơ hồ.

**Fix**: Không phải "prompt hay hơn" — là countermeasure. (1) Không cho AI gọi tên cảm xúc [chống training "be explicit"]. (2) Cho AI subtext riêng [ép AI giữ bí mật]. (3) Ràng buộc đối thoại [tạo khoảng cách = subtext].

**Kết (callback)**: Đầu video nói "khi biết lý do sẽ không nhìn AI như cũ" → kết: AI được train helpful/clear/explicit. Fiction cần trust/ambiguity/imply. Prompt bridge gap. "5 năm học viết không dạy điều này — vì trước AI, không ai cần học chống training."

---

## English script (for production — agent viết full từ outline trên)

Agent viết full English voiceover, đảm bảo:
- Organic flow — KHÔNG section header
- 12 storytelling techniques từ AUTHENTICITY-PIPELINE.md
- 3-beat hook: Pull in (viewer's experience) → Flip (not your prompt) → Seal (remember this)
- Contrast, personification, callback
- "But/Therefore" giữa beats (không "and then")
- 130-150 wpm, contractions, <20 words/sentence, 4.2 "you" per 100 words
- Read aloud → fix stumbling
- Vietnamese summary per section cho user verify logic
