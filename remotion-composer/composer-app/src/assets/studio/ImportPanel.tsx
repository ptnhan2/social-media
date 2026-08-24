import React from "react";
import { bridge, fileUrl } from "./imageOps";

type StockResult = { id: string; source: string; thumb: string; large: string; alt: string };
type Recipe = {
  label: string;
  description: string;
  enabled?: boolean;
  fields: { name: string; label: string; type: string; options: string[]; optional?: boolean }[];
};
type PoseEntry = { name: string; anchor: Record<string, unknown> };

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

  const [recipes, setRecipes] = React.useState<Record<string, Recipe>>({});
  const [selectedRecipe, setSelectedRecipe] = React.useState("");
  const [recipeFields, setRecipeFields] = React.useState<Record<string, string>>({});
  const [genResults, setGenResults] = React.useState<{ url: string; path: string }[]>([]);

  const [poses, setPoses] = React.useState<PoseEntry[]>([]);

  const refreshPoses = React.useCallback(async () => {
    try {
      const data = await bridge({ op: "list-poses", project: projectId });
      setPoses((data.poses as PoseEntry[]) || []);
    } catch {
      /* ignore */
    }
  }, [projectId]);

  React.useEffect(() => {
    void refreshPoses();
    bridge({ op: "list-recipes" })
      .then((data) => {
        const r = (data.recipes as Record<string, Recipe>) || {};
        setRecipes(r);
        const first = Object.keys(r)[0];
        if (first) {
          setSelectedRecipe(first);
          const defaults: Record<string, string> = {};
          for (const f of r[first].fields) defaults[f.name] = f.options[0];
          setRecipeFields(defaults);
        }
      })
      .catch(() => undefined);
    const onRefresh = () => void refreshPoses();
    window.addEventListener("asset-studio:refresh-poses", onRefresh);
    return () => window.removeEventListener("asset-studio:refresh-poses", onRefresh);
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

  const searchStock = (q: string) =>
    run("Đang tìm ảnh…", async () => {
      const r = await fetch(`/api/assets/search-stock?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      setStockResults(data.results || []);
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
      const data = await bridge({ op: "generate", recipe: selectedRecipe, fields: recipeFields, project: projectId });
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
          {stockBusy ? <p className="as4-hint">Đang tìm…</p> : null}
          <div className="as4-stock-grid">
            {stockResults.map((item) => (
              <button key={item.id} type="button" className="as4-stock-item" title={`${item.alt} — click để thêm layer`}
                onClick={() => void importStock(item)}>
                <img src={item.thumb} alt={item.alt} loading="lazy" />
              </button>
            ))}
          </div>
          {stockResults.length === 0 && (
            <p className="as4-hint">Click preset hoặc gõ từ khoá → Enter. Click kết quả = thêm layer ngay.</p>
          )}
        </div>
      )}

      {tab === "gen" && (
        <div className="as4-tab-body">
          <select
            className="as4-select"
            value={selectedRecipe}
            onChange={(e) => {
              setSelectedRecipe(e.target.value);
              const r = recipes[e.target.value];
              const defaults: Record<string, string> = {};
              if (r) for (const f of r.fields) defaults[f.name] = f.options[0];
              setRecipeFields(defaults);
            }}
          >
            {Object.entries(recipes).map(([key, r]) => (
              <option key={key} value={key}>
                {r.label}
              </option>
            ))}
          </select>
          {selectedRecipe &&
            recipes[selectedRecipe]?.fields.map((f) => (
              <label key={f.name} className="as4-field">
                <span>{f.label}</span>
                <select
                  value={recipeFields[f.name] || f.options[0]}
                  onChange={(e) => setRecipeFields((prev) => ({ ...prev, [f.name]: e.target.value }))}
                >
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          <button type="button" className="as4-btn primary wide" onClick={() => void doGenerate()}>
            ✨ Generate
          </button>
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
              }}
            />
            📁 Chọn file…
          </label>
          <p className="as4-hint">Hoặc kéo-thả ảnh thẳng vào canvas bất cứ lúc nào.</p>
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
