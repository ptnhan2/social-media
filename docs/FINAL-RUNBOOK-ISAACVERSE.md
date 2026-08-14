# IsaacVerse Final Runbook

## Final Project

Project: `projects/isaacverse-final/`

Current version: `v009`

Current editable timeline revision: `projects/isaacverse-final/editor/current.json`

State: `projects/isaacverse-final/00-state.json`

Acceptance report: `projects/isaacverse-final/FINAL-REPORT.json`

## Resume

```powershell
python tools/project/project_store.py resume --project projects/isaacverse-final
```

The project state is authoritative. Do not reset it to `fixture.ts` or regenerate `05-edit-doc.json` from `04-video-doc.json` after a patch unless intentionally starting a new version.

## Composer

```powershell
cd remotion-composer/composer-app
npm run dev
```

The Composer loads `isaacverse-final` from `/api/project/load`. It supports one full live timeline, beat ranges, atomic `ReviewSlice` targets for shot/phase/element/voice/music/SFX/transition, feedback records, structured diagnosis, alternatives, similar-beat batches, future-rule promotion, canvas beat editing, affected-window previews, apply, rollback, and reload persistence.

For Kilo-assisted fixes, select a slice and choose `Hand off to Kilo`. Then run
`/review-pending` in the Kilo session. Composer writes the exact selection and
user note to `feedback/inbox/`; Kilo reads it, writes diagnosis/patch/evidence
back, and Composer polls the result.

## Draft And Window Render

```powershell
cd remotion-composer
npm run produce:pilot
node scripts/render-window.mjs --project isaacverse-final --start 7 --end 10.5 --quality draft
```

Draft preset: exact `640x360`, `ultrafast`, `crf=32`.

Window frame ranges are inclusive and include 0.45 seconds of transition padding.

## QA

```powershell
cd C:\DevWork\social-media
python tools/quality/isaacverse_gate.py --video-doc projects/isaacverse-final/04-video-doc.json --edit-doc projects/isaacverse-final/05-edit-doc.json --video projects/isaacverse-final/renders/master_1080p.mp4 --output projects/isaacverse-final/qa/structural-master.json
python tools/quality/isaacverse_qa.py --video projects/isaacverse-final/renders/master_1080p.mp4 --mode master --output projects/isaacverse-final/qa/diagnosis-master.json
```

The final v009 master has:

- 1920x1080 video;
- 30.058667 seconds;
- one video stream and one audio stream;
- calibrated freeze ratio `0.5334` and maximum freeze event `2.3s`;
- no deterministic media-QA failures;
- structural gate `PASS_WITH_VISION_REVIEW`.

## Final Artifacts

- Master: `projects/isaacverse-final/renders/master_1080p.mp4`
- Kilo before window: `projects/isaacverse-final/renders/windows/kilo-motion-before-v004.mp4`
- Kilo after window: `projects/isaacverse-final/renders/windows/kilo-motion-after-v009.mp4`
- Thumbnail: `projects/isaacverse-final/thumbnail/final.png`
- Compliance: `projects/isaacverse-final/publish/compliance-report-v004.json`
- Publish dry-run: `projects/isaacverse-final/publish/publish-manifest-v004.json`
- Dubbing plan: `projects/isaacverse-final/dubbing/dub-plan.json`

## Explicit Caveats

- This is a complete 30-second acceptance pilot, not the full long-form 12-slot release. The structural warning is intentional and recorded.
- Vision/taste approval is still a human gate.
- YouTube OAuth upload was not invoked. The publish manifest is truthful `dry_run`, not a false upload claim.
- Compliance remains `pass_with_review` for format variation and cadence evidence.
- Thumbnail, compliance, dubbing, and publish-manifest files retain their truthful v004 provenance because the v009 change is scoped to one motion phase.
- The persisted editor timeline has additional local revisions for editor-surface acceptance; those revisions are not yet promoted into a fresh final report until the fresh-project editor gate passes.
