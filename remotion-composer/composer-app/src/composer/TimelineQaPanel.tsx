import React from "react";

/** Timeline-QA panel (PIPELINE-PRODUCTION-SPEC v3, M3): the generation report
 *  surface — checklist PASS/FAIL, warnings, missing assets, style version —
 *  read from the SAME report file the agent reads. The Generate button and
 *  the agent's generate_timeline tool run the SAME script through the SAME
 *  endpoint: one pipeline, two operators (parity by construction). */
type TimelineCheck = { id: string; label: string; pass: boolean; detail?: string[] };
type TimelineReport = {
  ok: boolean;
  projectId: string;
  mode?: string;
  generatedAt?: string;
  styleVersion?: number | null;
  checks?: TimelineCheck[];
  warnings?: string[];
  blocking?: string[];
};

export const TimelineQaPanel: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [report, setReport] = React.useState<TimelineReport | null>(null);
  const [noReport, setNoReport] = React.useState(false);
  const [genState, setGenState] = React.useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = React.useState("");

  const loadReport = React.useCallback(async () => {
    try {
      const payload = await fetch(`/api/project/timeline-report?projectId=${encodeURIComponent(projectId)}`).then((r) => (r.ok ? r.json() : null));
      if (payload) { setReport(payload as TimelineReport); setNoReport(false); }
      else { setNoReport(true); setReport(null); }
    } catch {
      setNoReport(true);
    }
  }, [projectId]);

  React.useEffect(() => { void loadReport(); }, [loadReport]);

  const generate = async () => {
    setGenState("running"); setMessage("");
    try {
      const start = await fetch("/api/project/generate-timeline", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      }).then((r) => r.json());
      if (!start.jobId) throw new Error(start.error || "job failed to start");
      for (let i = 0; i < 60; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await fetch(`/api/project/generate-timeline/status?jobId=${encodeURIComponent(start.jobId)}`).then((r) => r.json());
        if (status.status === "done" || status.status === "error") {
          if (status.status === "error") throw new Error(status.message || "generation failed");
          setGenState("done");
          setMessage(`Generated${status.result?.warnings?.length ? ` — ${status.result.warnings.length} warning(s)` : " — clean"}`);
          await loadReport();
          return;
        }
      }
      throw new Error("generation timed out");
    } catch (error) {
      setGenState("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="ve-timeline-qa">
      <div className="ve-prop-section">
        <button type="button" className="ve-prop-btn" disabled={genState === "running"} onClick={() => void generate()}>
          {genState === "running" ? "Generating…" : "Generate timeline (validate + sync)"}
        </button>
        {message ? <p className="ve-hint">{message}</p> : null}
      </div>
      {noReport ? (
        <p className="ve-hint">Chưa có report — bấm Generate để validate edit-doc và dựng timeline.</p>
      ) : report ? (
        <div className="ve-prop-section">
          <span className="ve-prop-label-row">
            <span>Report {report.ok ? <b style={{ color: "#2dd4a0" }}>OK</b> : <b style={{ color: "#ff6b6b" }}>ATTENTION</b>}</span>
            <small style={{ color: "#6b7280" }}>{report.styleVersion != null ? `style v${report.styleVersion}` : ""}{report.generatedAt ? ` · ${report.generatedAt.slice(0, 16).replace("T", " ")}` : ""}</small>
          </span>
          <ul className="ve-qa-checks">
            {(report.checks ?? []).map((check) => (
              <li key={check.id} className={check.pass ? "pass" : "fail"}>
                <span className="ve-qa-mark">{check.pass ? "✓" : "✗"}</span>
                <span className="ve-qa-label">{check.label}</span>
                {!check.pass && check.detail ? (
                  <ul className="ve-qa-detail">
                    {check.detail.slice(0, 6).map((line, index) => <li key={index}>{line}</li>)}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          {report.warnings?.length ? (
            <div className="ve-qa-warnings">
              <span>Warnings ({report.warnings.length})</span>
              <ul>{report.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="ve-hint">Loading report…</p>
      )}
    </div>
  );
};
