# TODO NEXT — NIGHT RUN 2026-08-26/27 — VLM DEEPSEEK + VIDEO #1

> Night plan (user ngủ ~23:40, autonomous 6h → ~05:40). Quy tắc: commit +
> push theo phase, check CI sau mỗi push, RCA khi fail, không dừng giữa chừng.
> PAUSE chỉ khi: paid key cạn / CI đỏ beyond fixable / repo corruption.

---

## 🌅 MORNING REMINDERS — NHẮC USER NGAY LÚC SÁNG (đứng đầu file!)

1. **Flip blessing master render**: E2 gate đạt (1.222/1.266), default
   render-window đã là editor — nhưng `npm run render:master` vẫn path cũ.
   Chốt = master production dùng editor flow per GENERATOR-SPEC §2.6.
2. **Review video #1 draft** (nếu đêm nay produce xong): topic "Why AI
   Dialogue Sounds Like Therapy" — xem trong Composer, feedback qua UI.
3. **`repurpose` pipeline approval**: transcript → X/blog/shorts — có trigger
   trong AGENTS.md nhưng chưa build. Có làm không?
4. **Multi-doc Studio + anchor editor kéo thả**: cần design session.
5. **Model chính đã đổi**: Ox Alpha chết (404) → glm-5.3-flash qua Zhipu
   coding endpoint. E6 đã re-verify PASS 7/7 với model mới.

## Night phases

### Phase 0 — Model & VLM setup (30 phút) — BẮT ĐẦU

1. **HARNESS_MODEL → glm-5.3-flash qua coding endpoint**:
   - `.env`: `HARNESS_MODEL=openai:glm-5.3-flash` +
     `OPENAI_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4` (coding plan)
   - Restart langgraph server (port 2025) + smoke test agent responds
2. **VLM → deepseek-v4-flash-vision-exp**:
   - Thêm DeepSeek provider vào `_VLM_DEFAULTS` trong harness_tools.py
   - `.env`: `VLM_PROVIDER=deepseek`, `VLM_MODEL=deepseek-v4-flash-vision-exp`
   - Research note: model ra 21/08/2026, beats Opus 4.8 trên 3/11 agent
     benchmarks, ảnh ≤384 tokens, giá flash ($0.22/1M off-peak), API
     OpenAI-compatible (base_url=api.deepseek.com/v1), 800×800 image resize
3. **Check CI cho commit 973e666** (webhook delay từ lúc mất mạng)
4. Smoke test VLM: gửi ảnh đơn giản → verify response

### Phase 1 — VLM QA pipeline với DeepSeek (1.5h)

5. **Re-run vlm_qa pipeline với DeepSeek** (frontier-class — glm-4v-flash
   hallucinated "owl mask" trên semantic diagram; DeepSeek phải ground đúng)
6. **Verify IoU > 0.3** cho ít nhất một số region (DeepSeek là model mạnh,
   nếu vẫn IoU=0 → debug coordinate space thêm)
7. **Refactor visual_critique** → gọi vlm_qa pipeline (TODO treo từ hôm qua)
8. **Update oracle-trust.md** với config DeepSeek

### Phase 2 — Produce video #1 từ content plan (3h) — FULL PIPELINE E2E

Video #2: **"Why AI Dialogue Sounds Like Therapy"**
- Demand evidence mạnh nhất: Reddit r/slatestarcodex 445↑, 193 comments
- Mechanism #3 Case study (theo content-plan rotation — tránh 2 mechanism
  giống nhau liên tiếp)
- Sources: Reddit threads, r/ClaudeAI 214↑

Steps (pipeline chuẩn — AGENTS.md trigger):
9.  **Story phase** (`lên content`): research topic → audience/goal →
    surface + deeper problem → hero journey beats → script
10. **Build VideoDoc** (04-video-doc.json): cấu trúc 12-point journey
11. **Build EditDoc** (05-edit-doc.json): beats + treatments + audio plan
    (dùng style store v73 — 40 principles đã học)
12. **Voice**: TTS script qua ElevenLabs (monitor credits — PAUSE nếu cạn)
13. **Assets**: stock search (Pexels/Unsplash) cho relevant footage +
    character poses có sẵn
14. **Cold projection** → EditorDoc (generate-editor.mjs --mode cold)
15. **Draft render** + QA gates (pixel-diff, structural, VLM critique)
16. **Document MỌI blocker** gặp phải — đây là lần đầu pipeline chạy full
    cho video mới, mọi gap là phát hiện quý

Lưu ý: project mới cần project slug riêng (không phải isaacverse-final).
Kiểm tra project_store.py createBlankProject + sync-project-public.

### Phase 3 — Polish + close-out (1h)

17. **Parity residuals** (4 treatment — nếu còn thời gian)
18. **Per-field ledger**: update trim/move/nudge ops (hiện default ['all'])
19. **Docs**: TODO-NEXT (file này) cập nhật kết quả + knowledge-base entry
20. **Memory save**: night-run-2026-08-27 decisions
21. **Final push + CI check** (3 workflows xanh)

## Trọng tâm đêm nay

**Video #1 là việc quan trọng nhất.** Toàn bộ 11 ngày build infrastructure
để chuẩn bị cho việc này. Video thật sẽ phơi ra mọi gap còn lại của
pipeline — mỗi gap là phát hiện quý cho việc hoàn thiện harness.

VLM DeepSeek là việc quan trọng thứ hai — pipeline SoM đã đúng mechanics,
chỉ thiếu model đủ mạnh để ground bbox chính xác.

## Gotchas (từ các đêm trước — không lặp lại)

1. Playwright postData() là SYNC — không .then()
2. vitest collect e2e/*.spec.ts — đã pin include src/**
3. .gitignore *.png nuốt fixture — đã có exception
4. Remotion Sequence clips children — overlay spanning → root
5. PowerShell `&` với path có backslash — dùng workdir + full path
6. LangGraph server port 2024 ghost socket — dùng port 2025
7. Windows cp1252 encoding — reconfigure stdout utf-8 trong mọi script
8. CHỐT: check CI sau MỖI push (lesson reinforced)
