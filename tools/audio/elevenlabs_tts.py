"""ElevenLabs TTS — text-to-speech via ElevenLabs API.
agent_skills = ['elevenlabs', 'text-to-speech'] — read skills/elevenlabs/SKILL.md before calling."""
from __future__ import annotations
import os, time
from pathlib import Path
from typing import Any
from tools.base_tool import BaseTool, ToolResult, ToolStatus


class ElevenLabsTTS(BaseTool):
    name = "elevenlabs_tts"
    capability = "tts"
    provider = "elevenlabs"
    agent_skills = ["elevenlabs", "text-to-speech"]
    install_instructions = "Set ELEVENLABS_API_KEY env var. Get key at https://elevenlabs.io"
    fallback_tools = ["openai_tts", "piper_tts"]
    capabilities = ["text_to_speech", "voice_selection"]
    best_for = ["high-quality narration", "multilingual spoken delivery"]

    DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

    def get_status(self) -> ToolStatus:
        return ToolStatus.AVAILABLE if os.environ.get("ELEVENLABS_API_KEY") else ToolStatus.UNAVAILABLE

    def estimate_cost(self, inputs: dict[str, Any]) -> float:
        return round(len(inputs.get("text", "")) * 0.0003, 4)

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        api_key = os.environ.get("ELEVENLABS_API_KEY")
        if not api_key:
            return ToolResult(success=False, error="No ELEVENLABS_API_KEY. " + self.install_instructions)
        start = time.time()
        try:
            import requests
            text = inputs["text"]
            voice_id = inputs.get("voice_id", self.DEFAULT_VOICE_ID)
            model_id = inputs.get("model_id", "eleven_v3")
            voice_settings = {
                "stability": inputs.get("stability", 0.5),
                "similarity_boost": inputs.get("similarity_boost", 0.75),
                "style": inputs.get("style", 0.0),
                "speed": inputs.get("speed", 1.0),
                "use_speaker_boost": inputs.get("use_speaker_boost", True),
            }
            payload: dict[str, Any] = {"text": text, "model_id": model_id, "voice_settings": voice_settings}
            if inputs.get("language"):
                payload["language"] = inputs["language"]
            response = requests.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
                json=payload, params={"output_format": inputs.get("output_format", "mp3_44100_128")}, timeout=120,
            )
            response.raise_for_status()
            output_path = Path(inputs.get("output_path", "tts_output.mp3"))
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(response.content)
            return ToolResult(
                success=True,
                data={"provider": self.provider, "model": model_id, "voice_id": voice_id,
                      "voice_settings": voice_settings, "output": str(output_path)},
                artifacts=[str(output_path)], model=model_id,
                cost_usd=self.estimate_cost(inputs), duration_seconds=round(time.time() - start, 2),
            )
        except Exception as exc:
            return ToolResult(success=False, error=f"TTS failed: {exc}", duration_seconds=round(time.time() - start, 2))
