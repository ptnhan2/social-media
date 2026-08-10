"""Transcriber — Whisper speech-to-text.
agent_skills = ['speech-to-text'] — read skills/speech-to-text/SKILL.md before calling."""
from __future__ import annotations
import os, time, subprocess, json
from pathlib import Path
from typing import Any
from tools.base_tool import BaseTool, ToolResult, ToolStatus


class Transcriber(BaseTool):
    name = "transcriber"
    capability = "analysis"
    provider = "whisper"
    agent_skills = ["speech-to-text"]
    capabilities = ["transcription", "word_timestamps"]
    best_for = ["phase 3 transcript", "subtitle generation"]

    def get_status(self) -> ToolStatus:
        # Check if whisper/whisper-cli is available
        for cmd in ["whisper", "whisper-cli", "python -c 'import whisper'"]:
            try:
                subprocess.run(cmd.split()[0], capture_output=True, timeout=5)
                return ToolStatus.AVAILABLE
            except Exception:
                pass
        return ToolStatus.UNAVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        start = time.time()
        try:
            audio_path = inputs["audio_path"]
            model = inputs.get("model", "base")
            language = inputs.get("language", "en")
            output_format = inputs.get("output_format", "srt")

            # Try openai-whisper Python package first
            try:
                import whisper
                result = whisper.transcribe(audio_path, model=model, language=language)
                output_path = Path(inputs.get("output_path", "transcript.srt"))
                output_path.parent.mkdir(parents=True, exist_ok=True)
                # Write SRT
                with open(output_path, "w", encoding="utf-8") as f:
                    for i, seg in enumerate(result["segments"], 1):
                        f.write(f"{i}\n{seg['start']:.2f} --> {seg['end']:.2f}\n{seg['text']}\n\n")
                return ToolResult(
                    success=True,
                    data={"text": result["text"], "segments": len(result["segments"]),
                          "output": str(output_path)},
                    artifacts=[str(output_path)], cost_usd=0.0,
                    duration_seconds=round(time.time() - start, 2),
                )
            except ImportError:
                pass

            # Fallback: whisper-cli
            output_path = Path(inputs.get("output_path", "transcript.srt"))
            subprocess.run(["whisper", audio_path, "--model", model, "--language", language,
                           "--output_format", output_format, "--output_dir", str(output_path.parent)],
                          capture_output=True, timeout=600)
            return ToolResult(
                success=True,
                data={"output": str(output_path)},
                artifacts=[str(output_path)], cost_usd=0.0,
                duration_seconds=round(time.time() - start, 2),
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Transcription failed: {e}")
