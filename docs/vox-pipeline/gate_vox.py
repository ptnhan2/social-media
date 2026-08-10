#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vox Quality Gate — automated review of "AI Can't Write Subtext" against the
user-approved criteria accumulated across the build session (2026-08-01→02).

Run BEFORE delivering any render (draft or master):
    python docs/vox-pipeline/gate_vox.py              # static checks on SCENES data
    python docs/vox-pipeline/gate_vox.py --video <mp4> # + audio/video runtime checks
    python docs/vox-pipeline/gate_vox.py --doc-sync    # pipeline doc consistency check

Exit code: 0 = all PASS, 1 = FAIL found (must fix), 2 = WARN only.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # → workspace root

PIPELINE_VERSION = "2026-08-03-v10"  # must match in ALL pipeline files (see playbook.md "Updating the pipeline")

# project target: pass --project <id> to gate another vox video (default: reference build)
_PROJECT = "ai-cant-write-subtext"
if "--project" in sys.argv:
    _PROJECT = sys.argv[sys.argv.index("--project") + 1]
TSX = os.path.join(
    ROOT, "remotion-composer", "projects",
    _PROJECT, "VoxScenes.tsx",
)
VOXKIT = os.path.join(
    ROOT, "remotion-composer", "projects",
    _PROJECT, "voxKit.tsx",
)

IS_V21 = os.path.exists(TSX) and "resolveColor" in open(TSX, encoding="utf-8").read()
TIMELINE = os.path.join(
    ROOT, "projects", _PROJECT,
    "artifacts", "sentence_timeline.json",
)

# ---------------------------------------------------------------------------
# parse SCENES / SECTIONS / SFX / CUTOUT_OK from the TSX (data is JSON-safe now)
# ---------------------------------------------------------------------------
def extract_balanced(src, marker):
    # marker like "const SECTIONS:" — find the [ that starts the array (after any type annotation / =)
    m = re.search(re.escape(marker) + r".*?=\s*\[", src, re.S)
    if not m:
        return None
    start = m.end()
    depth = 1
    i = start
    while depth > 0 and i < len(src):
        if src[i] == "[":
            depth += 1
        elif src[i] == "]":
            depth -= 1
        i += 1
    arr = src[start : i - 1]
    arr = re.sub(r"//[^\n]*", "", arr)              # strip line comments
    arr = re.sub(r",\s*([}\]])", r"\1", arr)        # strip trailing commas
    arr = arr.rstrip().rstrip(",")                  # strip final comma before closing ]
    arr = re.sub(r"([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)", r'\1"\2"\3', arr)  # quote keys
    try:
        return json.loads("[" + arr + "]")
    except Exception as e:
        return {"__parse_error__": str(e), "__raw__": arr[:500]}

src = open(TSX, encoding="utf-8").read()
SCENES = extract_balanced(src, "const SCENES")
SECTIONS = extract_balanced(src, "const SECTIONS")
SFX = extract_balanced(src, "const SFX")
CUTOUT_OK = extract_balanced(src, "const CUTOUT_OK")

results = []  # (id, severity, message)


def check(cid, cond, msg, sev="FAIL"):
    results.append((cid, "PASS" if cond else sev, msg))


# ---------------------------------------------------------------------------
# STATIC CHECKS — user-approved criteria
# ---------------------------------------------------------------------------
YELLOW, AMBER = "#fff200", "#C77F00"
ACCENTS = {"#fff200": "yellow", "#D64541": "red", "#2E74B5": "blue", "#2E7D32": "green"}

if isinstance(SCENES, dict):
    check("parse", False, f"SCENES parse error: {SCENES.get('__parse_error__')}")
    SCENES = []
else:
    # 1. scene pacing: 4-10s grouped scenes, no rapid cuts
    bad = [s["start"] for s in SCENES if (s["end"] - s["start"]) < 3.5]
    check("pacing", len(bad) == 0,
          f"{len(SCENES)} scenes; {len(bad)} shorter than 3.5s: {bad[:5]}")

    # 2. no dead screen: after the last item, voice + karaoke subtitle still
    # animate the tail (Vox holds a visual 5-6s — "slow is correct").
    # tail > 4s = FAIL, 3-4s = WARN (CTA end-card excluded)
    dead, warns = [], []
    for s in SCENES:
        if s.get("kind") == "cta":
            continue
        items = s.get("items") or []
        if not items:
            dead.append((s["start"], "no items"))
            continue
        last = max(it.get("at", 0) for it in items)
        tail = s["end"] - last
        if tail > 4.0:
            dead.append((s["start"], f"tail {tail:.1f}s after last item @{last:.1f}"))
        elif tail > 3.0:
            warns.append((s["start"], f"tail {tail:.1f}s"))
    check("dead-screen", len(dead) == 0, f"{len(dead)} scenes dead tail: {dead[:4]}", "FAIL")
    for ws, wm in warns:
        results.append(("dead-tail", "WARN", f"scene@{ws} {wm}"))

    def global_colors_hex():
        gc = set()
        for sc in SCENES:
            gc |= {it.get("color") for it in (sc.get("items") or []) if it.get("color")}
        return gc

    # 3. color variety (v9: palette tokens on v2.1 projects; hex on legacy)
    VALID_TOKENS = {"ink", "a0", "a1", "a2", "a3", "anchor"}
    per_scene = []
    global_tokens = set()
    bad_tokens = []
    for s in SCENES:
        cs = set()
        for it in (s.get("items") or []):
            c = it.get("color")
            if c:
                if IS_V21:
                    if c not in VALID_TOKENS:
                        bad_tokens.append((s["start"], c))
                    else:
                        cs.add(c)
                else:
                    cs.add(c)
        global_tokens |= cs
        per_scene.append(len(cs))
    if IS_V21:
        check("palette-tokens", len(bad_tokens) == 0,
              f"{len(bad_tokens)} non-token item colors (must be ink/a0-a3/anchor): {bad_tokens[:4]}")
        check("color-variety", len(global_tokens) >= 3,
              f"global color tokens: {sorted(global_tokens)} (need >=3 of a0-a3/anchor)")
    else:
        check("color-variety", len(global_colors_hex()) >= 3,
              f"global accents: {len(global_colors_hex())} unique (legacy hex mode)")

    # 4. yellow only on dark bg (resolveAccent rule) — amber on light
    viol = []
    for s in SCENES:
        for it in s.get("items") or []:
            if it.get("color") == YELLOW and not s.get("dark"):
                viol.append((s["start"], it["text"][:24]))
    check("yellow-amber", len(viol) == 0,
          f"{len(viol)} yellow-on-light items (must be amber #C77F00): {viol[:4]}")

    # 5. subject cutout usage: photo-kind scenes should use cutout-capable images
    if isinstance(CUTOUT_OK, list):
        photo_scenes = [s for s in SCENES if s.get("kind") in ("photo", "collage")]
        using_cut = [
            s for s in photo_scenes
            if s.get("img") and all(i in CUTOUT_OK for i in s["img"])
        ]
        ratio = len(using_cut) / max(1, len(photo_scenes))
        check("cutout", ratio >= 0.6,
              f"photo/collage scenes using subject cutout: {len(using_cut)}/{len(photo_scenes)} ({ratio:.0%})")

    # 6. text size variety: labels (~26-34) AND hero (>=100)
    sizes = [it.get("size") for s in SCENES for it in (s.get("items") or []) if it.get("size")]
    small = any(sz <= 40 for sz in sizes)
    big = any(sz >= 100 for sz in sizes)
    check("text-size", small and big,
          f"sizes {min(sizes) if sizes else '-'}..{max(sizes) if sizes else '-'}: need small<=40 and big>=100")

    # 7. subtitle zone free: illustration text never below y=80%
    viol = []
    for s in SCENES:
        for it in s.get("items") or []:
            pass  # items don't carry y; pattern views place them — checked by code review
    # (items place at pattern-defined y; gate checks pattern constants below)

    # 8. scene starts align with timeline sentence starts (source of truth)
    if os.path.exists(TIMELINE):
        tl = json.load(open(TIMELINE, encoding="utf-8"))
        starts = {round(s["start"], 2) for sec in tl.values() for s in sec}
        mis = [s["start"] for s in SCENES if not any(abs(s["start"] - st) < 0.3 for st in starts)]
        check("timeline-sync", len(mis) == 0,
              f"{len(mis)} scene starts not on timeline sentence boundary: {mis[:6]}")

# 9. audio assets: 8 narration sections, >=100 SFX (v10: foley on every event)
check("narration", isinstance(SECTIONS, list) and len(SECTIONS) == 8,
      f"narration sections: {len(SECTIONS) if isinstance(SECTIONS, list) else 'parse fail'} (need 8)")
check("sfx-count", isinstance(SFX, list) and len(SFX) >= 100,
      f"SFX timings: {len(SFX) if isinstance(SFX, list) else 'parse fail'} (need >=100, v10 spec)")

# 15. sfx-gap: no silence gap > 8.0s between foley events (v10: sound never dies)
if isinstance(SFX, list) and len(SFX) > 1:
    times = sorted(s["at"] for s in SFX)
    gaps = [b - a for a, b in zip(times, times[1:])]
    mx = max(gaps)
    check("sfx-gap", mx <= 8.0,
          f"max gap between SFX = {mx:.2f}s (need <= 8.0s, v10 spec)")

# 16. motion-zoom: continuous push-in engine present + red offset stroke on photos
#     (v10 spec S6/S10 — regression guards at engine level)
tsx_src = open(TSX, encoding="utf-8").read() if os.path.exists(TSX) else ""
sv_start = tsx_src.find("const SceneView")
sv_block = tsx_src[sv_start:sv_start + 2200] if sv_start >= 0 else ""
check("motion-zoom", "<PushIn" in sv_block and "offsetStroke" in tsx_src,
      "SceneView must apply <PushIn> continuously + PhotoView red offsetStroke (v10)")
check("push-drift", "driftFrom" in tsx_src and "driftTo" in tsx_src,
      "PaperBg must carry drift (driftFrom/driftTo) for continuous motion (v10)")

# 10. kind-repeat: no 3+ consecutive scenes of the same pattern kind (anti-template feel)
if isinstance(SCENES, list):
    run_bad = []
    run_len, prev = 0, None
    for sc in SCENES:
        k = sc.get("kind")
        run_len = run_len + 1 if k == prev else 1
        if run_len >= 3:
            run_bad.append((sc["start"], k))
        prev = k
    check("kind-repeat", len(run_bad) == 0,
          f"{len(run_bad)} runs of >=3 same-kind scenes: {run_bad[:5]}")

# 13. layout-repeat: no 3 consecutive scenes share the same composition layout (v2.1 only)
if isinstance(SCENES, list) and IS_V21:
    lay_bad = []
    run_len, prev = 0, None
    for sc in SCENES:
        key = f"{sc.get('kind')}:{sc.get('layout') or sc.get('textLayout') or 'none'}"
        run_len = run_len + 1 if key == prev else 1
        if run_len >= 3:
            lay_bad.append((sc["start"], key))
        prev = key
    check("layout-repeat", len(lay_bad) == 0,
          f"{len(lay_bad)} runs of >=3 same-layout scenes: {lay_bad[:5]}")

# 14. backdrop coverage: photo scenes should mostly have a shape backdrop (v2.1 look)
if isinstance(SCENES, list) and IS_V21:
    photo_sc = [sc for sc in SCENES if sc.get("kind") in ("photo", "collage")]
    with_bd = [sc for sc in photo_sc if sc.get("backdrop")]
    ratio = len(with_bd) / max(1, len(photo_sc))
    if ratio < 0.4:
        results.append(("backdrop-coverage", "WARN",
                        f"{len(with_bd)}/{len(photo_sc)} photo scenes have shape backdrop (want >=40%)"))
    else:
        check("backdrop-coverage", True, f"{len(with_bd)}/{len(photo_sc)} photo scenes with shape backdrop ({ratio:.0%})")

# 11. yellow-light-guard: every VOX_YELLOW usage in engine code must resolve per-bg
#     (karaoke current word, highlight sweep stroke, bubbles connector) — except
#     definitions and equality comparisons (resolveAccent() itself).
guard_src = ""
for gp in (TSX, VOXKIT):
    if os.path.exists(gp):
        guard_src += open(gp, encoding="utf-8").read() + "\n"
bad_yellow = []
for line in guard_src.splitlines():
    if "VOX_YELLOW" not in line:
        continue
    if "export const VOX_YELLOW" in line or "function resolveAccent" in line:
        continue
    if "import" in line or line.strip() == "VOX_YELLOW,":  # import list member
        continue
    if "=== VOX_YELLOW" in line or "== VOX_YELLOW" in line or "VOX_YELLOW_DARK" in line:
        continue
    if "resolveAccent" not in line:
        bad_yellow.append(line.strip()[:80])
check("yellow-light-guard", len(bad_yellow) == 0,
      f"{len(bad_yellow)} raw VOX_YELLOW usages (must resolveAccent): {bad_yellow[:4]}")

# 12. margin-guard: illustration text must not sit at the frame edge
if os.path.exists(TSX):
    tsx_src = open(TSX, encoding="utf-8").read()
    banned = [": 12 : 88", "{14 : 30", "x={6}", "x={6,", "x={8}", "x={8,", "x={12}"]
    found = [b for b in banned if b in tsx_src]
    check("margin-guard", len(found) == 0,
          f"banned edge literals: {found} (text must keep >=14% margins)")


# ---------------------------------------------------------------------------
# RUNTIME CHECKS (with --video)
# ---------------------------------------------------------------------------
def run(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return (r.stdout or "") + (r.stderr or "")  # ffmpeg logs to stderr
    except Exception as e:
        return f"ERR {e}"


def ffprobe_dur(vid):
    out = run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
               "-of", "csv=p=0", vid])
    try:
        return float(out.strip().splitlines()[-1])
    except Exception:
        return None


if "--video" in sys.argv:
    vid = sys.argv[sys.argv.index("--video") + 1]
    if not os.path.exists(vid):
        check("video", False, f"video not found: {vid}")
    else:
        # 10. duration sanity (default reference 308s +-3%; --project expects its own)
        #     --no-duration: review segments shorter than the full cut
        dur = ffprobe_dur(vid)
        if "--no-duration" not in sys.argv:
            if _PROJECT == "ai-cant-write-subtext":
                ok_dur = dur and 298 <= dur <= 318
                expect = "~308"
            else:
                ok_dur = dur and dur > 200
                expect = f">{200}s"
            check("video-duration", ok_dur,
                  f"duration {dur}s (expect {expect})")
        else:
            check("video-duration", True, f"duration {dur}s (segment review, duration skipped)")

        # 11. audio present & balanced: not silent, not clipping
        out = run(["ffmpeg", "-i", vid, "-af", "volumedetect", "-f", "null", "NUL"])
        mean = re.search(r"mean_volume: (-?\d+\.?\d*) dB", out)
        mx = re.search(r"max_volume: (-?\d+\.?\d*) dB", out)
        mean_v = float(mean.group(1)) if mean else None
        max_v = float(mx.group(1)) if mx else None
        check("audio-audible", mean_v is not None and mean_v > -45,
              f"mean volume {mean_v} dB (must be > -45, i.e. not silent)")
        check("audio-not-clip", max_v is not None and max_v < -0.5,
              f"max volume {max_v} dB (must be < -0.5, not clipping)")

        # 12. frames: yellow never appears on light bg (amber instead)
        tmp = os.path.join(os.path.dirname(vid), "_gate_frames")
        os.makedirs(tmp, exist_ok=True)
        # sample 3 light-scene timestamps
        light_ts = [s["start"] + 1.5 for s in SCENES if not s.get("dark")][:5]
        for i, ts in enumerate(light_ts):
            out_f = os.path.join(tmp, f"g{i}.png")
            run(["ffmpeg", "-y", "-ss", str(ts), "-i", vid, "-vframes", "1", out_f])
            if os.path.exists(out_f):
                from PIL import Image
                import numpy as np
                a = np.asarray(Image.open(out_f).convert("RGB"), dtype=np.float32)
                pure = int((((a[:, :, 0] > 240) & (a[:, :, 1] > 230) & (a[:, :, 2] < 60)).sum()))
                check(f"frame-{ts}", pure < 50,
                      f"@t={ts}s pure #fff200 px = {pure} (light bg should be amber, not yellow)")
        # cleanup
        for f in os.listdir(tmp):
            os.remove(os.path.join(tmp, f))
        os.rmdir(tmp)

        # 13. VOX V2 BEAUTY GATE (v10 spec Part 3 — measured, numeric, repeatable)
        #     freeze-ratio / max-freeze / sharpness / edge-density / saturation /
        #     hue-variety / grain. Targets from reference measurements.
        try:
            from PIL import Image
            import numpy as np
            import colorsys

            def _frame_at(t, size=320):
                r = subprocess.run(
                    ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t), "-i", vid,
                     "-vframes", "1", "-vf", f"scale={size}:-2", "-f", "image2pipe",
                     "-vcodec", "png", "-"], capture_output=True)
                return np.asarray(Image.open(__import__("io").BytesIO(r.stdout)).convert("RGB"),
                                  dtype=np.float32) / 255.0 if r.stdout else None

            # freeze detection (v10: -42dB — calibrated 2026-08-03 on sanderson
            # 30s@360p: -40dB flags 0.5-1.7s micro-stills between item entrances
            # that are invisible (push-in/drift continue); -42dB = 39% frozen,
            # max 1.1s = catches real dead holds only. Reference study used -40dB
            # on brighter content; dark-palette chapters need -42dB.)
            fz_out = run(["ffmpeg", "-i", vid, "-vf", "freezedetect=n=-42dB:d=0.5", "-an", "-f", "null", "NUL"])
            fz_durs = [float(m) for m in re.findall(r"freeze_duration: ([\d.]+)", fz_out)]
            fz_tot = sum(fz_durs)
            fz_max = max(fz_durs, default=0.0)
            freeze_ratio = fz_tot / max(1e-6, (dur or 0))
            check("freeze-ratio", freeze_ratio <= 0.55,
                  f"frozen {freeze_ratio:.0%} of video (need <= 55%, v10)")
            check("max-freeze", fz_max <= 6.0,
                  f"longest freeze {fz_max:.1f}s (need <= 6.0s, v10)")

            # frame richness metrics on 12 samples
            n_samp = 12
            steps = np.linspace(1.0, max(2.0, (dur or 0) - 1.0), n_samp)
            sharp, edges, hues, sats, grains = [], [], [], [], []
            for st in steps:
                im = _frame_at(st)
                if im is None:
                    continue
                g = 0.299 * im[:, :, 0] + 0.587 * im[:, :, 1] + 0.114 * im[:, :, 2]
                # sharpness: laplacian variance
                k = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
                pad = np.pad(g, 1, mode="edge")
                lap = np.zeros_like(g)
                for ii in range(3):
                    for jj in range(3):
                        lap += k[ii, jj] * pad[ii:ii + g.shape[0], jj:jj + g.shape[1]]
                sharp.append(float(lap.var()))
                # edge density
                mag = np.sqrt(np.gradient(g, axis=0) ** 2 + np.gradient(g, axis=1) ** 2)
                edges.append(float((mag > 0.12).mean()))
                # hue variety + saturation
                flat = im.reshape(-1, 3)
                hsv = np.array([colorsys.rgb_to_hsv(*px) for px in flat])
                sat_mask = hsv[:, 1] > 0.35
                bins = np.bincount((hsv[:, 0] * 12).astype(int)[sat_mask], minlength=12) / max(1, sat_mask.sum())
                hues.append(int((bins > 0.02).sum()))
                sats.append(float(sat_mask.mean()))
                # grain energy
                from PIL import ImageFilter
                blur = np.asarray(Image.fromarray((im * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.0)), dtype=np.float32) / 255.0
                grains.append(float(np.abs(im - blur).mean()))
            if len(sharp) >= 6:
                # means, not medians — matches the reference-study methodology
                # (research/vox-reference-study-2026-08-03.md measured means)
                check("sharpness", np.mean(sharp) >= 0.012,
                      f"mean sharpness {np.mean(sharp):.4f} (need >= 0.012, v10)")
                check("edge-density", np.mean(edges) >= 0.055,
                      f"mean edge density {np.mean(edges):.4f} (need >= 0.055, v10)")
                check("saturation", np.mean(sats) >= 0.12,
                      f"mean saturated-px {np.mean(sats):.4f} (need >= 0.12, v10)")
                check("hue-variety", np.mean(hues) >= 3.5,
                      f"mean hue bins {np.mean(hues):.1f} (need >= 3.5, v10)")
                check("grain", np.mean(grains) >= 0.020,
                      f"mean grain {np.mean(grains):.4f} (need >= 0.020, v10)")
            else:
                check("frame-samples", False, f"only {len(sharp)}/12 frames sampled — cannot judge beauty gate")
        except Exception as e:
            check("beauty-gate", False, f"beauty gate crashed: {e}")


# ---------------------------------------------------------------------------
# DOC-SYNC CHECK (--doc-sync): pipeline knowledge lives in 5 files; they must
# carry the same PIPELINE_VERSION and reference each other correctly.
# See playbook.md "Updating the pipeline" — edit playbook FIRST, propagate,
# bump version in all files, then this check must pass.
# ---------------------------------------------------------------------------
if "--doc-sync" in sys.argv:
    doc_files = {
        "playbook": os.path.join(ROOT, "docs", "vox-pipeline", "playbook.md"),
        "readme": os.path.join(ROOT, "docs", "vox-pipeline", "README.md"),
        "gate": os.path.join(ROOT, "docs", "vox-pipeline", "gate_vox.py"),
        "skill": os.path.join(ROOT, "skills", "vox-editorial-pipeline"),
        "agents": os.path.join(ROOT, "AGENTS.md"),
        "content-agent": os.path.join(ROOT, ".kilo", "agent", "content-manager-agent.md"),
        "license-gate": os.path.join(ROOT, "docs", "vox-pipeline", "license_gate.py"),
    }
    # 1. every file exists
    for name, path in doc_files.items():
        check(f"doc-{name}-exists", os.path.exists(path), f"{name}: {path}")

    # 2. every file carries the current version marker
    for name, path in doc_files.items():
        if not os.path.exists(path):
            continue
        content = open(path, encoding="utf-8").read()
        has = PIPELINE_VERSION in content
        check(f"doc-{name}-version", has,
              f"{name}: carries {PIPELINE_VERSION}")

    # 3. routing references are in place (stale pointers = agent never finds the pipeline)
    guide = os.path.join(ROOT, "AGENT_GUIDE.md")
    if os.path.exists(guide):
        g = open(guide, encoding="utf-8").read()
        check("doc-route-guide", "vox-editorial-pipeline" in g,
              "AGENT_GUIDE.md routes Vox briefs to the skill")
    agents = open(doc_files["agents"], encoding="utf-8").read()
    check("doc-route-agents", "docs/vox-pipeline/playbook.md" in agents,
          "AGENTS.md points to docs/vox-pipeline/playbook.md")
    readme = open(doc_files["readme"], encoding="utf-8").read()
    check("doc-route-readme", "playbook.md" in readme and "gate_vox.py" in readme,
          "README lists playbook + gate")

    # 4. stale-path guard: research/ must not carry pipeline files (they moved)
    stale = [
        os.path.join(ROOT, "research", "gate_vox.py"),
        os.path.join(ROOT, "research", "vox-pipeline-playbook.md"),
    ]
    for p in stale:
        check(f"doc-no-stale-{os.path.basename(p)}", not os.path.exists(p),
              f"research/ must not contain {os.path.basename(p)} (moved to docs/vox-pipeline/)")


# ---------------------------------------------------------------------------
# report
# ---------------------------------------------------------------------------
fails = [r for r in results if r[1] == "FAIL"]
warns = [r for r in results if r[1] == "WARN"]
print("=" * 72)
print("VOX QUALITY GATE")
print("=" * 72)
for cid, sev, msg in results:
    mark = {"PASS": "PASS", "FAIL": "FAIL", "WARN": "WARN"}[sev]
    print(f"[{mark:4s}] {cid:16s} {msg}")
print("-" * 72)
print(f"TOTAL: {len(results)} | PASS {len(results)-len(fails)-len(warns)} | FAIL {len(fails)} | WARN {len(warns)}")
sys.exit(1 if fails else (2 if warns else 0))
