import React from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { IsaacVerseEditDoc } from "./types";
import { IsaacVerseEditVideo } from "./EditVideo";

const resolveSource = (source: string) => source.startsWith("http://") || source.startsWith("https://") || source.startsWith("data:") ? source : staticFile(source.replace(/^\/+/, ""));

const normalizeSources = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeSources);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === "src" && typeof child === "string" ? resolveSource(child) : normalizeSources(child)]));
};

export const ProjectLoader: React.FC<{ src: string }> = ({ src }) => {
  const [doc, setDoc] = React.useState<IsaacVerseEditDoc | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const handle = React.useMemo(() => delayRender(`Loading edit document: ${src}`), [src]);

  React.useEffect(() => {
    let cancelled = false;
    fetch(resolveSource(src))
      .then((response) => { if (!response.ok) throw new Error(`EditDoc request failed: ${response.status}`); return response.json(); })
      .then((payload) => { if (cancelled) return; setDoc(normalizeSources(payload) as IsaacVerseEditDoc); continueRender(handle); })
      .catch((reason: unknown) => { if (cancelled) return; const message = reason instanceof Error ? reason.message : String(reason); setError(message); cancelRender(new Error(message)); });
    return () => { cancelled = true; };
  }, [handle, src]);

  if (error) return <div style={{ color: "#ec6a5e", padding: 40, fontFamily: "monospace" }}>Project loader error: {error}</div>;
  if (!doc) return <div style={{ color: "#61d7e8", padding: 40, fontFamily: "monospace" }}>Loading project…</div>;
  return <IsaacVerseEditVideo doc={doc} />;
};
