# Research — AI magic system behavior (AI side) — 03-sanderson-laws

> Subagent research 2026-08-03 (17 queries). Evidence: AI mô tả quyền năng nhưng không enforce giới hạn.

## (a) Failure modes quan sát được
1. **Cost/weakness bị bỏ qua, power thêm tự do**: Sudowrite: "You decided fire magic costs blood on page 12. By page 247, your protagonist is throwing fireballs like confetti... No blood. No cost." SagaScope: "A magic system where practitioners can do 'anything with enough willpower' removes all stakes"; "generated solutions rarely respect your system's constraints, because the AI does not 'know' those constraints."
2. **Quên luật đã đặt theo khoảng cách (context drift)**: benchmark "Lost in Stories" (Microsoft/SUTD, ACL 2026) phân loại "World-building & Setting: Core Rules Violations" là error class đo được. Noveble: limitation lập ch.1 bị phá ch.15. Jenova: "AI forgets your protagonist's mentor died in Chapter 3 and cheerfully resurrects him in Chapter 47."
3. **Deus ex machina**: Sudowrite bán tính năng "flag scenes where magic solves problems the reader hasn't been prepared for"; Novarrium: climax "rely on information or abilities that were never established."
4. **Rules dài dòng nhưng nông cơ học**: The_Djinnbop (r/magicbuilding, 31-05-2023) về hệ 10 luật ChatGPT: "Despite the fancy language several of them read like 'magic can be imbued in an item, but it only lasts so long before running out'" — 1 luật nhồi 10 lần.
5. **Homogenization / power-creep**: Narrative Flattening (UChicago, arXiv 2605.27878); Doshi & Hauser 2024 (AI co-writing giảm diversity); hệ thống hội tụ archetype (elemental bending, mana pools).

## (b) Complaint cộng đồng (verbatim)
- **GoyCrusader88, r/ClaudeAI** (~4 tháng trước): "when we actually get to writing... he basically forgets everything. The general plot will stay the same, but he constantly forgets details and messes up the personalities of characters."
- **r/WritingWithAI** (via eesel.ai): "GPT 5... It can't seem to keep anything in memory.. so it will completely forget how a character looks or speaks from the previous chapter."
- **r/WritingWithAI** (via metamandrill.com): "NovelAI's 8K context is kind of a joke these days; it forgets my hero's eye color by chapter three."
- **The_Djinnbop, r/magicbuilding**: quote ở (a)4.

## (c) Data points định lượng
- **ConStory-Bench** (2,000 prompts, 8–10K từ): GPT-5-Reasoning tốt nhất vẫn **0.113 errors/10K từ**; mid-tier 0.52–0.71; tệ nhất 3.45. Contradiction **tập trung ở 40–60% vị trí story**; world-rule facts lập ở ~24% bị contradicted ở ~39% (gap ~23%). Lỗi tăng tuyến tính theo độ dài.
- **Lost in the Middle** (Liu et al. 2023): recall ~90%+ ở 2 mép context, **50–70% ở giữa** — đúng vùng "chapter-a-day".
- Novarrium 25-chapter test: "even dedicated fiction platforms introduce timeline and detail errors by the midpoint." ChatGPT giữ coherence "khoảng 5,000–10,000 từ, sau đó vỡ".

## Sources
- arxiv.org/abs/2603.05890 (Lost in Stories, 2026); arxiv.org/abs/2605.27878 (Narrative Flattening); arxiv.org/abs/2510.07777 (Context Equilibria/Drift); arxiv.org/abs/2307.03172 (Lost in the Middle)
- sudowrite.com/blog/writing-magic-systems-ai/; sagascope.com; noveble.com; novarrium.com
- reddit.com/r/ClaudeAI/comments/1pjoax9; reddit.com/r/magicbuilding/comments/13wsqop; eesel.ai/blog/chatgpt-vs-sudowrite; metamandrill.com/best-ai-story-generator-2026
