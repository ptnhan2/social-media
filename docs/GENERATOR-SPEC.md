# GENERATOR SPEC — EditDoc → EditorDoc as a formal, repeatable projection

> Status: **IMPLEMENTED 2026-08-23** (E2-E6, afternoon session after the
> pattern-learning overnight). Written 2026-08-21 night session, grounded in
> the code audit below.
>
> Implementation status per acceptance criteria (§2.6):
> - E2 (render unification): **DONE — GATE MET + DEFAULT FLIPPED (2026-08-25/26
>   night)**. Both measurement windows passed mean abs diff < 2.0 on COLD
>   projections: semantic-diagram 3.5-7 = 1.223 mean / 1.621 max;
>   process-timeline 10.5-14 = 1.266 / 1.576 (evidence:
>   `projects/isaacverse-final/qa/parity/*.json`, rerunnable via
>   `node remotion-composer/scripts/parity-measure.mjs --project isaacverse-final
>   --start 3.5 --end 7`). The editor flow is now the DEFAULT render path
>   (render-window.mjs + harness render_window/qa_gate); the treatment flow
>   stays as the generator preview (`--path treatment`). Master renders move
>   to the editor flow pending the user's morning blessing (spec §2.6 last
>   clause). Journey to the gate (9.316 → 1.222): BeatCamera nesting,
>   store-color resolution, node DOM-height estimator + group scale + pulse,
>   exact Remotion spring port in clipStyle, edge viewBox units, presence
>   PRESENCE_ASPECT exact-fit, text padding removal, process-timeline layout.
>   Post-review hardening: overlays spanning past a split/trimmed beat clip
>   render at the ROOT level (Remotion clips children to the parent Sequence).
> - E3 (agent clip tools): DONE — scripts/editor-ops.mjs bridge + harness
>   editor_op tool (list/split/trim/move/metadata/ripple/delete).
> - E4 (provenance): DONE — styleSource + styleResolvedAt baked into element
>   clips; ~33 clips carry provenance at store v73.
> - E5 (merge preservation): DONE — userEdited ledger in all 37 editor ops +
>   userDeletedClipIds; 3 generator tests (cold/sync/scoped) + 10 ledger
>   tests. NOTE: the pre-ledger golden doc could not be merged safely (no
>   userEdited data existed) — it was cold-regenerated instead (backed up at
>   editor/current.json.bak-golden). Future syncs are safe.
> - E6 (agent clip-edit E2E): DONE — E6 PASS 7/7 (2026-08-25 night): the
>   clip-editor subagent runs the full protocol editor_op → qa_gate →
>   request_keep → persist. Driver: harness/e6_e2e.py.

## 0. Problem

Today the project has TWO render flows and no formal bridge between them:

| | Treatment flow (CLI/harness) | Editor flow (Composer preview) |
|---|---|---|
| Input | EditDoc (`05-edit-doc.json`) + style store | EditorDoc (`editor/current.json`) |
| Renderer | `<BeatTreatment/>` reads style store at render time (`getStyle`) | `<EditorClipOverlay/>` reads only `clip.metadata` (baked at projection) |
| Who edits | The agent (style knobs) | The human (editorOperations) |
| Style changes | Live — next render picks them up | Dead — metadata was baked once |

The EditorDoc was produced ONCE by a runtime fallback (`projectEditDocToEditor`,
`editorProjection.ts:156`) and then hand-mutated by the Composer (45 revisions,
splits like `clip:beat:final-beat-04:part-a`). Regenerating it today would
DESTROY those user edits; never regenerating it means style-store changes and
EditDoc changes never reach the edited timeline. This split is the root of the
"preview ≠ agent render" gap and of the 2026-08-19 BeatContent regression
class.

**Goal**: ONE source of truth (EditorDoc) for both humans and agents, with a
generator that can re-project from (EditDoc + style store) at any time without
destroying human work.

## 1. Current architecture facts (audit 2026-08-21)

- `EditorDoc` schema: `shared/isaacverse/editor.ts:101-113`. Clips carry a
  free-form `metadata: Record<string, unknown>` (`editor.ts:40`) — already
  sufficient for provenance without schema changes.
- The existing projection: `projectEditDocToEditor(doc, options)` at
  `editorProjection.ts:156`. Beats → `clip:beat:<beatId>` on `video-main`
  (`:122`); treatment elements → element clips packed into `visual-N` lanes
  (`:137-140`, `packIntoTracks :83`); audioPlan → voice/music/sfx clips
  (`:104-117`); markers for beats/shots/motion-phases (`:119-154`).
  Element clips bake full visual style into `metadata` (`elementClipFromTreatment`
  `:35-81`) — this baking is exactly where style resolution must move.
- Dual render switch: `EditVideo.tsx:223-232` — `editor ? <BeatContent/> :
  <BeatTreatment/> + <BeatElementOverlay/>`. `BeatContent` is an empty stub;
  the editor path renders `overlayClips` (`:240-244`) styled by
  `clipStyle.ts` (pure metadata math, no store reads).
- CLI render never passes an EditorDoc: `Root.tsx:5` renders
  `<ProjectLoader src="05-edit-doc.json"/>` with no `editorSrc`; the loader
  only fetches `editor/current.json` when `editorSrc` is passed
  (`ProjectLoader.tsx:23`). `render-window.mjs` even syncs the public editor
  JSON into the bundle (`syncRuntimePublic`, `:109`) — unused today.
- 38 editor operations exist as pure functions in
  `composer-app/src/editor/editorOperations.ts` (split/trim/ripple/keyframes/
  speed/groups/...) — exposed to the UI only, NOT to any API or agent.
- Deterministic ids: projection ids derive from EditDoc ids
  (`clip:beat:<id>`, `<beatId>:title`, `clip:voice:<segmentId>`); operation
  ids append suffixes (`:part-a`, `:dup:<ts>`, `clip:text:<ts>`).

## 2. Design

### 2.1 The generator is a MERGE, not an overwrite

`generate(editorDoc?, editDoc, styleStore) → EditorDoc` runs in three modes:

1. **Cold** (no existing EditorDoc): pure projection — today's
   `projectEditDocToEditor` output, plus style provenance (§2.2).
2. **Sync** (existing doc): three-way merge per beat (§2.3).
3. **Scoped** (single beat): re-project one beat's clips only — the
   "surgical edits" primitive (project rule 7).

The generator becomes a **standalone, runnable step** (CLI:
`node scripts/generate-editor.mjs --project <slug> [--beat <beatId>]`), no
longer only a runtime fallback inside two React components.

### 2.2 Style resolution moves INTO the generator (with provenance)

The generator resolves style knobs → concrete values at projection time and
records where each value came from:

```jsonc
// clip.metadata additions (element clips)
{
  "styleSource": {
    "fontSize":   "treatments.semantic-diagram.node.fontSize",   // prop -> knob
    "background": "treatments.semantic-diagram.node.background",
    "glow":       "treatments.semantic-diagram.node.glow"
  },
  "styleResolvedAt": { "storeVersion": 64, "seed": "isaac-forensic-2026-08" }
}
```

Consequences:
- The EditorDoc becomes **self-contained**: `clipStyle.ts` keeps rendering from
  metadata alone; the editor flow needs no store fetch.
- A style-store change is detectable: `styleResolvedAt.storeVersion` vs the
  current store version tells the harness exactly WHICH clips are stale.
- Hardcoded treatment values that have no knob are recorded as
  `"styleSource": { "prop": null }` (fixed by treatment code) — the audit
  baseline for future knob extraction.

### 2.3 Three-way merge policy (the core rule)

Per generated clip id, on Sync/Scoped regeneration:

| Existing clip state | Generator action |
|---|---|
| Unmodified since last projection | **Regenerate** — replace with fresh projection (picks up style + EditDoc changes) |
| User-modified (any editorOperation touched it, or `metadata.userEdited`) | **Keep user version**, set `metadata.stale: true` + `staleReason: "style" \| "editdoc"` — surfaced in the UI, never silently overwritten |
| Missing in EditDoc (beat removed) | Delete UNLESS user-modified (then keep + `stale`) |
| New in EditDoc (beat added) | Insert |

"User-modified" is tracked by an **operations ledger**: `setEditorClipMetadata`
and every structural operation append `metadata.userEdited = true` (one-line
change each, `editorOperations.ts`) — cheaper and more reliable than diffing.

Track-level: user-added tracks (`track:<kind>:user:<ts>`, `track:overlay:*`)
are NEVER touched by the generator. Fixed tracks (video-main/voice/music/sfx)
can gain/lose generated clips per the table above.

### 2.4 Render unification (E2)

- `Root.tsx` gains the editor source: `FinalProject = <ProjectLoader
  src="isaacverse-final/05-edit-doc.json" editorSrc="isaacverse-final/editor/current.json" />`.
  The editor flow becomes the DEFAULT render path for the CLI/harness.
- The treatment path (`<BeatTreatment/>`) is NOT deleted — it becomes the
  **generator preview**: what a cold projection would render given the current
  store. Harness A/B cycles may keep using it for knob verification (cheaper:
  no EditorDoc dependency), but master renders move to the editor flow.
- `render-window.mjs` needs no change (it already syncs the public editor JSON).

### 2.5 Agent clip tools (E3)

Wrap the pure `editorOperations.ts` functions as harness tools via a node CLI
bridge (no long-lived server dependency):

```
scripts/editor-ops.mjs --op split --project isaacverse-final --clipId <id> --timeSec 12.3
  -> reads editor/current.json, applies ONE operation, validates, writes
     a new revision (same store.saveEditor path as the UI), prints the result JSON
```

Harness side: one python tool `editor_op(op, clipId, **args)` shells out to the
bridge. The KEEP gate (request_keep) protects destructive ops exactly like
style changes — the agent never edits clips without the human seeing the
render diff. All clip ops stay out of `/workspace/remotion-composer/shared/**`
(denied) — the bridge lives in scripts/ and only mutates project JSON.

### 2.6 Acceptance criteria (per TODO-NEXT Batch E)

- **E2 done** = one render flow: `render-window.mjs` output pixel-identical
  (baseline) whether driven by the old treatment path or the new editor path,
  proven by compare_renders on 2 segments; master render uses the editor flow.
- **E3 done** = agent can split/trim/move a clip through the tool bridge; the
  UI timeline shows the result after reload; revision counter advanced once.
- **E4 done** = every generated element clip carries `styleSource` +
  `styleResolvedAt`; a store-version bump flags stale clips.
- **E5 done** = regeneration after a manual split keeps BOTH split parts
  (`:part-a`/`:part-b` marked `userEdited`), regenerating only untouched
  beats; no user edit is ever lost (fixture: 45-revision `current.json`
  survives a full Sync with zero diff on user-owned clips).
- **E6 done** = agent-driven clip edit (change a text, move a clip) reaches a
  render with pixel-diff > 0.05 through the editor flow, end to end, via the
  KEEP gate.

## 3. Risks / open questions

1. **Style-baking changes the A/B cycle mechanics**: today a knob change
   re-renders without touching the EditorDoc; after E2, a knob change requires
   a scoped regeneration (Sync) before the render shows it. The harness
   `update_style` tool must chain `generate --beat` + render. Keep the
   treatment-path preview for cheap knob A/B until native-video oracle lands.
2. **The 45-revision current.json is the merge fixture** — treat it as the
   golden test; back it up before the first Sync run.
3. **`migrateElementGeometry`/`normalizeTrackNames` run at load today**
   (VideoEditor.tsx:225) — fold these into the generator so the persisted doc
   is canonical, not a load-time fixup.
4. **Beat-level timing**: ripple/trim on beat clips desyncs EditDoc
   `startSec` vs clip ranges. Policy: clip ranges WIN in the editor flow
   (it is the truth); the EditDoc stays the narrative/semantic layer only.

## 4. Implementation order (next session)

1. `editorOps` ledger (`userEdited` flags) + unit tests — no behavior change.
2. Standalone `scripts/generate-editor.mjs` (cold + scoped + sync modes) with
   `styleSource` baking; golden test against `current.json`.
3. `Root.tsx` editorSrc switch + identity render QA (E2 gate).
4. `editor_op` harness tool + KEEP-gate wiring (E3).
5. Sync smoke test on the real project (E5), then the agent clip-edit E2E (E6).
