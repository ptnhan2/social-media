"""IsaacVerse voice pipeline: sentence batches, takes, selection, assembly and EQ.

The generation step delegates to the existing ElevenLabs registry tool. This file
keeps candidate/provenance state separate from the final selected voice track.
"""

from __future__ import annotations

import json
import re
import subprocess
import time
from pathlib import Path
from typing import Any

from tools.base_tool import BaseTool, ToolResult, ToolStatus


def score_take_metrics(mean_db: float, peak_db: float, duration_sec: float, target_duration_sec: float) -> float:
    """Prefer a take with usable dynamics and timing close to its sentence batch."""
    dynamic_range = max(0.0, peak_db - mean_db)
    timing_penalty = abs(duration_sec - target_duration_sec) * 0.5
    clipped_penalty = max(0.0, peak_db + 1.0) * 2.0
    return round(dynamic_range - timing_penalty - clipped_penalty, 4)


def audio_take_metrics(path: str | Path) -> dict[str, float]:
    file = Path(path)
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(file)], capture_output=True, text=True, check=True)
    measured = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(file), "-af", "volumedetect", "-f", "null", "NUL"], capture_output=True, text=True, check=False)
    mean_match = re.search(r"mean_volume:\s*(-?[0-9.]+) dB", measured.stderr)
    peak_match = re.search(r"max_volume:\s*(-?[0-9.]+) dB", measured.stderr)
    return {"durationSec": float(probe.stdout.strip()), "meanDb": float(mean_match.group(1)) if mean_match else -60.0, "peakDb": float(peak_match.group(1)) if peak_match else -60.0}


def choose_best_take(takes: list[dict[str, Any]], target_duration_sec: float) -> dict[str, Any] | None:
    scored: list[dict[str, Any]] = []
    for take in takes:
        try:
            metrics = audio_take_metrics(take["path"])
        except (OSError, subprocess.CalledProcessError, ValueError):
            continue
        scored.append({**take, "metrics": metrics, "score": score_take_metrics(metrics["meanDb"], metrics["peakDb"], metrics["durationSec"], target_duration_sec)})
    return max(scored, key=lambda item: item["score"], default=None)


def sentence_parts(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [part.strip() for part in parts if part.strip()]


def directive(text: str) -> dict[str, Any]:
    emphasis = re.findall(r"\b[A-Z][A-Z0-9']{1,}\b", text)
    if "!" in text:
        emotion = "excited"
    elif "..." in text:
        emotion = "disappointed"
    elif "?" in text:
        emotion = "curious"
    else:
        emotion = "neutral"
    return {
        "emphasisWords": emphasis,
        "pauseBeforeSec": 0.18 if "..." in text else 0.0,
        "emotion": emotion,
    }


class IsaacVerseVoice(BaseTool):
    name = "isaacverse_voice"
    capability = "voice_pipeline"
    provider = "elevenlabs-orchestrator"
    agent_skills = ["elevenlabs", "text-to-speech", "ffmpeg"]
    capabilities = ["sentence batching", "multi-take generation", "candidate manifest", "chop-combine assembly", "EQ postprocess", "dubbing plan"]
    best_for = ["humanized AI narration", "per-sentence voice iteration"]
    input_schema = {
            "operation": "plan | generate | assemble | dub_plan | score_takes",
        "video_id": "string",
        "text": "string (plan)",
        "plan_path": "string",
        "output_path": "string",
        "takes_per_batch": "integer",
        "batch_size": "integer",
        "skills_read": "boolean (generate)",
    }

    def get_status(self) -> ToolStatus:
        return ToolStatus.AVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        operation = str(inputs.get("operation", "plan"))
        try:
            if operation == "plan":
                return self._plan(inputs)
            if operation == "generate":
                return self._generate(inputs)
            if operation == "assemble":
                return self._assemble(inputs)
            if operation == "dub_plan":
                return self._dub_plan(inputs)
            if operation == "score_takes":
                return self._score_takes(inputs)
            return ToolResult(success=False, error=f"unsupported operation: {operation}")
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))

    def _plan(self, inputs: dict[str, Any]) -> ToolResult:
        text = str(inputs.get("text", "")).strip()
        video_id = str(inputs.get("video_id", "")).strip()
        if not text or not video_id:
            return ToolResult(success=False, error="video_id and text are required")
        batch_size = max(1, int(inputs.get("batch_size", 2)))
        sentences = sentence_parts(text)
        rows = []
        for index, value in enumerate(sentences):
            batch = index // batch_size
            rows.append({
                "id": f"sentence-{index + 1:04d}",
                "order": index,
                "text": value,
                "directive": directive(value),
                "batchId": f"batch-{batch + 1:04d}",
            })
        plan = {
            "videoId": video_id,
            "voiceId": inputs.get("voice_id", ""),
            "modelId": inputs.get("model_id", "eleven_multilingual_v2"),
            "settings": {
                "stability": float(inputs.get("stability", 0.35)),
                "similarityBoost": float(inputs.get("similarity_boost", 0.75)),
                "style": float(inputs.get("style", 0.35)),
                "speed": float(inputs.get("speed", 1.0)),
            },
            "sentences": rows,
            "takes": [],
            "selectedSegments": [],
            "eqPreset": "isaacverse-clean",
            "dubs": [],
        }
        output = Path(str(inputs.get("output_path", f"{video_id}-voice-plan.json")))
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
        return ToolResult(success=True, data=plan, artifacts=[str(output)])

    def _generate(self, inputs: dict[str, Any]) -> ToolResult:
        if inputs.get("skills_read") is not True:
            return ToolResult(success=False, error="read agent_skills before ElevenLabs generation")
        plan_path = Path(str(inputs.get("plan_path", "")))
        if not plan_path.is_file():
            return ToolResult(success=False, error="plan_path does not exist")
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        takes_per_batch = max(1, int(inputs.get("takes_per_batch", 3)))
        output_dir = Path(str(inputs.get("output_dir", plan_path.parent / "voice-takes")))
        output_dir.mkdir(parents=True, exist_ok=True)
        from tools.registry import registry

        t0 = time.time()
        failures = []
        for batch in sorted({row["batchId"] for row in plan["sentences"]}):
            rows = [row for row in plan["sentences"] if row["batchId"] == batch]
            batch_text = " ".join(row["text"] for row in rows)
            for take_index in range(takes_per_batch):
                path = output_dir / f"{batch}-take-{take_index + 1:02d}.mp3"
                tts_inputs = {
                    "text": batch_text,
                    "model_id": plan.get("modelId", "eleven_multilingual_v2"),
                    "stability": plan["settings"]["stability"],
                    "similarity_boost": plan["settings"]["similarityBoost"],
                    "style": plan["settings"]["style"],
                    "speed": plan["settings"]["speed"],
                    "output_path": str(path),
                }
                if plan.get("voiceId"):
                    tts_inputs["voice_id"] = plan["voiceId"]
                result = registry.execute("elevenlabs_tts", tts_inputs)
                if result.success:
                    plan["takes"].append({
                        "id": f"{batch}-take-{take_index + 1:02d}",
                        "sentenceIds": [row["id"] for row in rows],
                        "path": str(path),
                        "provenance": {"provider": "elevenlabs", "model": plan.get("modelId"), "settings": plan["settings"]},
                    })
                else:
                    failures.append(result.error or f"failed {batch} take {take_index + 1}")
        plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
        return ToolResult(success=not failures, data={"plan": plan, "failures": failures}, artifacts=[str(plan_path)], duration_seconds=round(time.time() - t0, 2))

    def _assemble(self, inputs: dict[str, Any]) -> ToolResult:
        plan_path = Path(str(inputs.get("plan_path", "")))
        output = Path(str(inputs.get("output_path", plan_path.with_name("voice-final.mp3"))))
        if not plan_path.is_file():
            return ToolResult(success=False, error="plan_path does not exist")
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        selected = inputs.get("selected_segments") or []
        if not selected:
            selected = []
            for batch in sorted({row["batchId"] for row in plan["sentences"]}):
                rows = [row for row in plan["sentences"] if row["batchId"] == batch]
                candidates = [take for take in plan["takes"] if batch in take["id"]]
                best = choose_best_take(candidates, max(0.5, len(" ".join(row["text"] for row in rows)) / 14.0))
                if best:
                    selected.extend({"sentenceId": row["id"], "takeId": best["id"], "selectionScore": best["score"]} for row in rows)
        by_id = {take["id"]: take for take in plan["takes"]}
        paths = [by_id[item["takeId"]]["path"] for item in selected if item.get("takeId") in by_id]
        if not paths:
            return ToolResult(success=False, error="no selected voice takes")
        output.parent.mkdir(parents=True, exist_ok=True)
        concat = output.with_suffix(".concat.txt")
        concat.write_text("\n".join(f"file '{Path(path).resolve().as_posix()}'" for path in paths), encoding="utf-8")
        filters = "highpass=f=80,afftdn,equalizer=f=250:t=q:w=1:g=-2,loudnorm=I=-16:TP=-1:LRA=7"
        subprocess.run(["ffmpeg", "-hide_banner", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-af", filters, "-c:a", "libmp3lame", "-q:a", "2", str(output)], check=True)
        plan["selectedSegments"] = selected
        plan["finalPath"] = str(output)
        plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
        return ToolResult(success=True, data={"selected": selected, "output": str(output)}, artifacts=[str(output), str(plan_path)])

    def _dub_plan(self, inputs: dict[str, Any]) -> ToolResult:
        plan_path = Path(str(inputs.get("plan_path", "")))
        languages = inputs.get("languages", [])
        if not plan_path.is_file() or not isinstance(languages, list):
            return ToolResult(success=False, error="plan_path and languages are required")
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        plan["dubs"] = [{"language": language, "status": "planned"} for language in languages]
        plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
        return ToolResult(success=True, data={"dubs": plan["dubs"]}, artifacts=[str(plan_path)])

    def _score_takes(self, inputs: dict[str, Any]) -> ToolResult:
        plan_path = Path(str(inputs.get("plan_path", "")))
        if not plan_path.is_file():
            return ToolResult(success=False, error="plan_path does not exist")
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        scores = []
        for take in plan.get("takes", []):
            try:
                metrics = audio_take_metrics(take["path"])
                score = score_take_metrics(metrics["meanDb"], metrics["peakDb"], metrics["durationSec"], float(inputs.get("target_duration_sec", metrics["durationSec"])))
                take["metrics"] = metrics
                take["score"] = score
                scores.append({"takeId": take["id"], "score": score, "metrics": metrics})
            except (OSError, subprocess.CalledProcessError, ValueError) as exc:
                take["scoreError"] = str(exc)
        plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
        return ToolResult(success=True, data={"scores": scores}, artifacts=[str(plan_path)])
