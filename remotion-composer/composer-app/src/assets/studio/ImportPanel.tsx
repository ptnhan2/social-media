import React from "react";
import { bridge, fileUrl } from "./imageOps";
import { buildSubstitutions, defaultFields, normalizeOptions, optionLabel, optionPrompt, Recipe, RecipeField, resolvePrompt } from "./promptUtils";

type StockResult = { id: string; source: string; thumb: string; large: string; alt: string; photographer: string };
type PoseEntry = { name: string; anchor: Record<string, unknown> };
type InboxFile = { name: string; path: string; mtime: number; size: number };

const SEARCH_PRESETS = [
  { label: "👉", title: "Chỉ tay", query: "man pointing hand gesture isolated white background" },
  { label: "🤔", title: "Suy nghĩ", query: "man thinking hand on chin isolated white background" },
  { label: "🎉", title: "Ăn mừng", query: "man celebrating arms raised isolated white background" },
  { label: "🤷", title: "Xõe tay", query: "man shrugging shoulders isolated white background" },
  { label: "🎤", title: "Trình bày", query: "man presenting gesture isolated white background" },
  { label: "😤", title: "Tự tin", query: "confident man arms crossed isolated white background" },
  { label: "😱", title: "Ngạc nhiên", query: "man surprised shocked expression isolated" },
  { label: "😌", title: "Thư giãn", query: "person leaning casual pose isolated studio" },
];

type TabId = "stock" | "gen" | "upload";

function overridesKey(projectId: string): string {
  return `asset-studio:prompts:${projectId}`;
}

export const ImportPanel: React.FC<{
  projectId: string;
  onAddLayer: (path: string, name: string) => void;
  onStatus: (status: string) => void;
  onBusy: (busy: boolean) => void;
}> = ({ projectId, onAddLayer, onStatus, onBusy }) => {
  const [tab, setTab] = React.useState<TabId>("stock");
  const [stockQuery, setStockQuery] = React.useState("");
  const [stockResults, setStockResults] = React.useState<StockResult[]>([]);
  const [stockBusy, setStockBusy] = React.useState(false);
  const [stockPage, setStockPage] = React.useState(1);
  const [stockQueryActive, setStockQueryActive] = React.useState("");

  const [recipes, setRecipes] = React.useState<Record<string, Recipe>>({});
  const [selectedRecipe, setSelectedRecipe] = React.useState("");
  const [recipeFields, setRecipeFields] = React.useState<Record<string, string>>({});
  // editable template draft for the selected recipe (placeholders stay live)
  const [templateDraft, setTemplateDraft] = React.useState("");
  // working copy of the recipe fields: options normalized to {label, prompt}
  // — added options AND per-option prompt edits live here until saved
  const [fieldsDraft, setFieldsDraft] = React.useState<RecipeField[]>([]);
  const [addingField, setAddingField] = React.useState<string | null>(null);
  const [addOptionText, setAddOptionText] = React.useState("");
  // custom-mode prompt — persisted per project
  const [customPrompt, setCustomPrompt] = React.useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(overridesKey(projectId)) || "{}") as Record<string, string>;
      return stored.__custom__ ?? "";
    } catch {
      return "";
    }
  });
  const [newRecipeName, setNewRecipeName] = React.useState("");
  const [recipeSaving, setRecipeSaving] = React.useState(false);
  // gen call options (áp cho mọi chế độ generate)
  const [genAspect, setGenAspect] = React.useState("1:1");
  const [genSeed, setGenSeed] = React.useState("");
  const [genNegative, setGenNegative] = React.useState("");
  const [genResults, setGenResults] = React.useState<{ url: string; path: string }[]>([]);

  const [poses, setPoses] = React.useState<PoseEntry[]>([]);
  const [inboxFiles, setInboxFiles] = React.useState<InboxFile[]>([]);

  const refreshInbox = React.useCallback(async () => {
    try {
      const data = await bridge({ op: "list-inbox", project: projectId });
      setInboxFiles((data.files as InboxFile[]) || []);
    } catch {
      /* ignore */
    }
  }, [projectId]);

  const refreshPoses = React.useCallback(async () => {
    try {
      const data = await bridge({ op: "list-poses", project: projectId });
      setPoses((data.poses as PoseEntry[]) || []);
    } catch {
      /* ignore */
    }
  }, [projectId]);

  const refreshRecipes = React.useCallback(async () => {
    try {
      const data = await bridge({ op: "list-recipes", project: projectId });
      const r = (data.recipes as Record<string, Recipe>) || {};
      setRecipes(r);
      return r;
    } catch {
      return {};
    }
  }, [projectId]);

  const selectRecipe = React.useCallback((id: string, all?: Record<string, Recipe>) => {
    const r = (all ?? recipes)[id];
    setSelectedRecipe(id);
    setRecipeFields(r ? defaultFields(r) : {});
    setTemplateDraft(r ? r.promptTemplate ?? r.prompt ?? "" : "");
    setFieldsDraft(r ? r.fields.map((f) => ({ ...f, options: normalizeOptions(f.options) })) : []);
    setAddingField(null);
    setAddOptionText("");
  }, [recipes]);

  // persist custom prompt (debounced)
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(overridesKey(projectId), JSON.stringify({ __custom__: customPrompt }));
      } catch {
        /* ignore */
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [customPrompt, projectId]);

  const selectedRecipeDef = selectedRecipe === "__custom__" ? null : recipes[selectedRecipe];

  const fieldDraft = (fieldName: string): RecipeField | undefined =>
    fieldsDraft.find((f) => f.name === fieldName);

  const selectedOptionPrompt = (fieldName: string): string => {
    const f = fieldDraft(fieldName);
    const selected = recipeFields[fieldName];
    const opt = f?.options.find((o) => optionLabel(o) === selected);
    return opt ? optionPrompt(opt) : "";
  };

  const setSelectedOptionPrompt = (fieldName: string, prompt: string) => {
    const selected = recipeFields[fieldName];
    setFieldsDraft((prev) =>
      prev.map((f) =>
        f.name === fieldName
          ? {
              ...f,
              options: f.options.map((o) => (optionLabel(o) === selected ? { ...normalizeOptions([o])[0], prompt } : o)),
            }
          : f,
      ),
    );
  };

  const resolvedPrompt = React.useMemo(() => {
    if (selectedRecipe === "__custom__") return customPrompt.trim();
    if (!selectedRecipeDef) return "";
    return resolvePrompt(templateDraft, buildSubstitutions(recipeFields, fieldsDraft));
  }, [selectedRecipe, selectedRecipeDef, templateDraft, recipeFields, fieldsDraft, customPrompt]);

  const effectivePrompt = resolvedPrompt;

  const structureDirty = React.useMemo(() => {
    if (!selectedRecipeDef) return false;
    const templateChanged = templateDraft !== (selectedRecipeDef.promptTemplate ?? selectedRecipeDef.prompt ?? "");
    const fieldsChanged =
      JSON.stringify(fieldsDraft) !==
      JSON.stringify(selectedRecipeDef.fields.map((f) => ({ ...f, options: normalizeOptions(f.options) })));
    const defaultsChanged =
      selectedRecipeDef.user &&
      JSON.stringify(recipeFields) !== JSON.stringify(defaultFields(selectedRecipeDef));
    return templateChanged || fieldsChanged || defaultsChanged;
  }, [selectedRecipeDef, templateDraft, fieldsDraft, recipeFields]);

  const saveRecipe = (asNew: boolean) =>
    void (async () => {
      const label = asNew ? newRecipeName.trim() : selectedRecipeDef?.label ?? "";
      if (!label || !templateDraft.trim()) return;
      setRecipeSaving(true);
      onBusy(true);
      try {
        const payload: Record<string, unknown> = {
          op: "save-recipe",
          project: projectId,
          label,
          promptTemplate: templateDraft.trim(),
          fields: fieldsDraft,
          defaults: recipeFields,
        };
        if (!asNew && selectedRecipeDef?.user) payload.id = selectedRecipe;
        const data = await bridge(payload);
        const r = await refreshRecipes();
        const id = String(data.id);
        if (r[id]) selectRecipe(id, r);
        if (asNew) setNewRecipeName("");
        onStatus(
          asNew
            ? `✓ Đã lưu recipe "${label}" (template + options — chỉnh riêng từng option được)`
            : `✓ Đã cập nhật recipe "${label}"`,
        );
      } catch (e) {
        onStatus(`❌ ${String((e as Error).message || e)}`);
      } finally {
        setRecipeSaving(false);
        onBusy(false);
      }
    })();

  const deletePreset = () =>
    void (async () => {
      const r = recipes[selectedRecipe];
      if (!r?.user) return;
      if (!window.confirm(`Xoá recipe "${r.label}"?`)) return;
      onBusy(true);
      try {
        await bridge({ op: "delete-recipe", project: projectId, id: selectedRecipe });
        const next = await refreshRecipes();
        const first = Object.keys(next)[0] || "__custom__";
        if (next[first]) selectRecipe(first, next);
        else setSelectedRecipe("__custom__");
        onStatus("✓ Đã xoá recipe");
      } catch (e) {
        onStatus(`❌ ${String((e as Error).message || e)}`);
      } finally {
        onBusy(false);
      }
    })();

  const addOptionToField = (fieldName: string) => {
    const v = addOptionText.trim();
    if (!v) return;
    setFieldsDraft((prev) =>
      prev.map((f) =>
        f.name === fieldName && !f.options.some((o) => optionLabel(o) === v)
          ? { ...f, options: [...f.options, { label: v, prompt: v }] }
          : f,
      ),
    );
    setRecipeFields((prev) => ({ ...prev, [fieldName]: v }));
    setAddOptionText("");
    setAddingField(null);
  };

  React.useEffect(() => {
    void refreshPoses();
    void refreshInbox();
    refreshRecipes().then((r) => {
      const first = Object.keys(r)[0];
      if (first) selectRecipe(first, r);
    });
    const onRefresh = () => void refreshPoses();
    window.addEventListener("asset-studio:refresh-poses", onRefresh);
    return () => window.removeEventListener("asset-studio:refresh-poses", onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPoses]);

  const run = async (label: string, fn: () => Promise<void>) => {
    onBusy(true);
    onStatus(label);
    try {
      await fn();
    } catch (e) {
      onStatus(`❌ ${String((e as Error).message || e)}`);
    } finally {
      onBusy(false);
    }
  };

  const searchStock = (q: string, page = 1) =>
    run("Đang tìm ảnh…", async () => {
      setStockBusy(true);
      try {
        const r = await fetch(`/api/assets/search-stock?q=${encodeURIComponent(q)}&page=${page}`);
        const data = await r.json();
        setStockResults((prev) => (page === 1 ? data.results || [] : [...prev, ...(data.results || [])]));
        setStockPage(page);
        setStockQueryActive(q);
      } finally {
        setStockBusy(false);
      }
    });

  const importStock = (item: StockResult) =>
    run("Đang tải ảnh stock…", async () => {
      const r = await fetch("/api/assets/body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, url: item.large }),
      });
      const data = await r.json();
      onAddLayer(String(data.path), "body");
    });

  const onFileUpload = (file: File) =>
    run("Đang upload…", async () => {
      const dataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(String(reader.result));
        reader.readAsDataURL(file);
      });
      const r = await fetch("/api/assets/body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, data: dataUrl }),
      });
      const data = await r.json();
      onAddLayer(String(data.path), file.name.split(".")[0].slice(0, 15));
    });

  const doGenerate = () =>
    run("Đang generate…", async () => {
      const prompt = effectivePrompt.trim();
      if (!prompt) throw new Error("Prompt trống");
      const data = await bridge({
        op: "generate",
        prompt,
        project: projectId,
        aspect_ratio: genAspect,
        seed: genSeed.trim() || undefined,
        negative_prompt: genNegative.trim() || undefined,
      });
      setGenResults((prev) => [{ url: String(data.out), path: String(data.out) }, ...prev].slice(0, 6));
      onStatus("✓ Generated — click ảnh để thêm vào canvas");
    });

  return (
    <section className="as4-panel as4-import-panel">
      <header className="as4-panel-header">
        <div className="as4-tabs">
          <button type="button" className={`as4-tab ${tab === "stock" ? "active" : ""}`} onClick={() => setTab("stock")}>
            Stock
          </button>
          <button type="button" className={`as4-tab ${tab === "gen" ? "active" : ""}`} onClick={() => setTab("gen")}>
            Gen AI
          </button>
          <button type="button" className={`as4-tab ${tab === "upload" ? "active" : ""}`} onClick={() => setTab("upload")}>
            Upload
          </button>
        </div>
      </header>

      {tab === "stock" && (
        <div className="as4-tab-body">
          <div className="as4-presets">
            {SEARCH_PRESETS.map((p) => (
              <button key={p.label} type="button" className="as4-preset-btn" title={p.title}
                onClick={() => void searchStock(p.query)}>
                {p.label}
              </button>
            ))}
          </div>
          <input
            className="as4-search-input"
            value={stockQuery}
            onChange={(e) => setStockQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && stockQuery.trim()) void searchStock(stockQuery.trim());
            }}
            placeholder="Tìm ảnh stock (Pexels + Unsplash)…"
          />
          {stockBusy && <p className="as4-hint">Đang tìm ảnh…</p>}
          <div className="as4-stock-grid">
            {stockResults.map((item) => (
              <button
                key={item.id}
                type="button"
                className="as4-stock-item"
                title={`${item.alt} — ${item.photographer} (${item.source}) — click để thêm layer`}
                onClick={() => void importStock(item)}
              >
                <img src={item.thumb} alt={item.alt} loading="lazy" />
                <small className="as4-stock-credit">{item.photographer}</small>
              </button>
            ))}
          </div>
          {!stockBusy && stockResults.length === 0 && (
            <p className="as4-hint">Click preset hoặc gõ từ khoá → Enter. Click kết quả = thêm layer ngay.</p>
          )}
          {!stockBusy && stockResults.length > 0 && (
            <button
              type="button"
              className="as4-btn ghost wide"
              onClick={() => void searchStock(stockQueryActive || stockQuery, stockPage + 1)}
              disabled={stockBusy}
            >
              ⬇ Load thêm (trang {stockPage + 1})
            </button>
          )}
        </div>
      )}

      {tab === "gen" && (
        <div className="as4-tab-body">
          <select
            className="as4-select"
            value={selectedRecipe}
            onChange={(e) => selectRecipe(e.target.value)}
          >
            {Object.entries(recipes).map(([key, r]) => (
              <option key={key} value={key}>
                {r.user ? "★ " : ""}
                {r.label}
              </option>
            ))}
            <option value="__custom__">✏️ Custom prompt</option>
          </select>

          {selectedRecipe === "__custom__" ? (
            <>
              <textarea
                className="as4-prompt-box"
                rows={6}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Mô tả ảnh muốn generate (English) — ví dụ: A comic ink style character head of a young woman, confident expression, wearing headphones, pure white background, only the head..."
              />
              <p className="as4-hint">Prompt custom được ghi nhớ cho lần sau.</p>
            </>
          ) : (
            (() => {
              const r = selectedRecipeDef;
              if (!r) return null;
              const isUser = Boolean(r.user);
              return (
                <>
                  {r.fields.map((f) => (
                    <div key={f.name} className="as4-field">
                      <span>{f.label}</span>
                      <div className="as4-field-row">
                        <select
                          value={recipeFields[f.name] || optionLabel(f.options[0])}
                          onChange={(e) => setRecipeFields((prev) => ({ ...prev, [f.name]: e.target.value }))}
                        >
                          {fieldDraft(f.name)?.options.map((o) => (
                            <option key={optionLabel(o)} value={optionLabel(o)}>
                              {optionLabel(o)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="as4-icon-btn"
                          title={`Thêm option mới cho ${f.label}`}
                          onClick={() => {
                            setAddingField(addingField === f.name ? null : f.name);
                            setAddOptionText("");
                          }}
                        >
                          ＋
                        </button>
                      </div>
                      {addingField === f.name && (
                        <div className="as4-field-row">
                          <input
                            autoFocus
                            value={addOptionText}
                            onChange={(e) => setAddOptionText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addOptionToField(f.name);
                              if (e.key === "Escape") setAddingField(null);
                            }}
                            placeholder={`Option mới cho ${f.label} (vd: watercolor)`}
                          />
                          <button type="button" className="as4-btn ghost" onClick={() => addOptionToField(f.name)}>
                            Thêm
                          </button>
                        </div>
                      )}
                      {/* prompt text của option đang chọn — xem + sửa trực tiếp */}
                      {recipeFields[f.name] && recipeFields[f.name] !== "none" && (
                        <textarea
                          className="as4-option-prompt"
                          rows={2}
                          value={selectedOptionPrompt(f.name)}
                          onChange={(e) => setSelectedOptionPrompt(f.name, e.target.value)}
                          title={`Prompt của "${recipeFields[f.name]}" — sửa rồi Lưu recipe để giữ lại`}
                        />
                      )}
                    </div>
                  ))}

                  <div className="as4-prompt-wrap">
                    <div className="as4-filter-header">
                      <span>
                        Prompt template {structureDirty ? "(chưa lưu)" : ""}
                        {!isUser && " — built-in, chỉnh xong nhớ Lưu thành recipe mới"}
                      </span>
                      <button
                        type="button"
                        className="as4-icon-btn"
                        title="Reset template + options về bản gốc của recipe"
                        onClick={() => {
                          setTemplateDraft(r.promptTemplate ?? r.prompt ?? "");
                          setFieldsDraft(r.fields.map((f2) => ({ ...f2, options: normalizeOptions(f2.options) })));
                          setRecipeFields(defaultFields(r));
                        }}
                      >
                        ↺
                      </button>
                    </div>
                    <textarea
                      className="as4-prompt-box"
                      rows={5}
                      value={templateDraft}
                      onChange={(e) => setTemplateDraft(e.target.value)}
                    />
                    <p className="as4-hint">
                      Dùng <code>{"{{style}}"}</code> v.v. làm chỗ thay thế — đổi option ở trên vẫn chạy.
                    </p>
                  </div>

                  <div className="as4-prompt-resolved" title="Prompt thực tế gửi đi sau khi thay option">
                    <b>Prompt gửi đi:</b> {resolvedPrompt || "(trống)"}
                  </div>

                  {isUser && (
                    <button
                      type="button"
                      className="as4-btn primary wide"
                      onClick={() => saveRecipe(false)}
                      disabled={recipeSaving || !structureDirty || !templateDraft.trim()}
                    >
                      💾 Cập nhật recipe này
                    </button>
                  )}

                  <div className="as4-preset-save">
                    <input
                      value={newRecipeName}
                      onChange={(e) => setNewRecipeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRecipe(true);
                      }}
                      placeholder="Tên recipe mới…"
                      disabled={recipeSaving}
                    />
                    <button
                      type="button"
                      className="as4-btn ghost"
                      onClick={() => saveRecipe(true)}
                      disabled={recipeSaving || !newRecipeName.trim() || !templateDraft.trim()}
                      title="Lưu template + options + lựa chọn hiện tại thành recipe mới — giữ nguyên cấu trúc, chỉnh riêng từng option được"
                    >
                      💾 Lưu thành recipe mới
                    </button>
                  </div>

                  {isUser && (
                    <button type="button" className="as4-btn ghost wide danger" onClick={deletePreset}>
                      🗑 Xoá recipe này
                    </button>
                  )}
                </>
              );
            })()
          )}

          <button type="button" className="as4-btn primary wide" onClick={() => void doGenerate()}
            disabled={!effectivePrompt.trim()}>
            ✨ Generate
          </button>

          <div className="as4-gen-options">
            <label className="as4-field">
              <span>Tỉ lệ</span>
              <select value={genAspect} onChange={(e) => setGenAspect(e.target.value)} title="Aspect ratio của ảnh generate">
                {["1:1", "4:5", "2:3", "9:16", "3:2", "5:4", "16:9", "21:9", "9:21"].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="as4-field">
              <span>Seed</span>
              <input
                value={genSeed}
                onChange={(e) => setGenSeed(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="random"
                title="Cố định seed để tái tạo ảnh giống nhau"
              />
            </label>
            <label className="as4-field">
              <span>Negative</span>
              <input
                value={genNegative}
                onChange={(e) => setGenNegative(e.target.value)}
                placeholder="things to avoid (optional)"
                title="Negative prompt — những gì KHÔNG muốn xuất hiện"
              />
            </label>
          </div>

          <div className="as4-gen-grid">
            {genResults.map((item, i) => (
              <button key={i} type="button" className="as4-gen-item" title="Click để thêm layer"
                onClick={() => onAddLayer(item.path, "head")}>
                <img src={fileUrl(item.path)} alt="" />
              </button>
            ))}
          </div>
          {genResults.length === 0 && <p className="as4-hint">Generate → click kết quả để thêm head layer</p>}
        </div>
      )}

      {tab === "upload" && (
        <div className="as4-tab-body">
          <label className="as4-upload-zone">
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFileUpload(f);
                e.target.value = "";
                window.setTimeout(() => void refreshInbox(), 800);
              }}
            />
            📁 Chọn file…
          </label>
          <p className="as4-hint">Hoặc kéo-thả ảnh thẳng vào canvas bất cứ lúc nào.</p>
          {inboxFiles.length > 0 && (
            <div className="as4-inbox">
              <div className="as4-filter-header">
                <span>File gần đây ({inboxFiles.length})</span>
                <button type="button" className="as4-icon-btn" title="Làm mới" onClick={() => void refreshInbox()}>
                  ↻
                </button>
              </div>
              <div className="as4-stock-grid as4-inbox-grid">
                {inboxFiles.map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    className="as4-stock-item"
                    title={`${f.name} — click để thêm layer`}
                    onClick={() => onAddLayer(f.path, f.name.replace(/\.[^.]+$/, "").slice(0, 15))}
                  >
                    <img src={fileUrl(f.path)} alt={f.name} loading="lazy" />
                  </button>
                ))}
              </div>
              <p className="as4-hint">Mọi ảnh đã import/generate vẫn nằm đây — không mất khi reset doc.</p>
            </div>
          )}
        </div>
      )}

      <div className="as4-poses">
        <div className="as4-filter-header">
          <span>Pose library ({poses.length})</span>
          <button type="button" className="as4-icon-btn" title="Làm mới" onClick={() => void refreshPoses()}>
            ↻
          </button>
        </div>
        <div className="as4-pose-grid">
          {poses.map((pose) => (
            <div key={pose.name} className="as4-pose-item" title={pose.name}>
              <img src={`/${projectId}/character/poses/${pose.name}.png`} alt={pose.name} />
              <small>{pose.name}</small>
            </div>
          ))}
          {poses.length === 0 && <p className="as4-hint">Chưa có pose — ghép xong thì Save pose ở menu</p>}
        </div>
      </div>
    </section>
  );
};
