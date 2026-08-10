"""Pixabay Music — stock music search + download.
agent_skills = ['music'] — read skills/music/SKILL.md before calling."""
from __future__ import annotations
import os, time
from pathlib import Path
from typing import Any
from tools.base_tool import BaseTool, ToolResult, ToolStatus


class PixabayMusic(BaseTool):
    name = "pixabay_music"
    capability = "music_generation"
    provider = "pixabay"
    agent_skills = ["music"]
    install_instructions = "Set PIXABAY_API_KEY env var. Get key free at https://pixabay.com/api/docs/"
    capabilities = ["search_music", "download_music", "stock_music"]
    best_for = ["royalty-free music", "free — no attribution required"]

    def get_status(self) -> ToolStatus:
        return ToolStatus.AVAILABLE if os.environ.get("PIXABAY_API_KEY") else ToolStatus.UNAVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        api_key = os.environ.get("PIXABAY_API_KEY")
        if not api_key:
            return ToolResult(success=False, error="No PIXABAY_API_KEY. " + self.install_instructions)
        start = time.time()
        try:
            import requests
            query = inputs.get("query", "")
            params: dict[str, Any] = {"key": api_key, "per_page": 5}
            if query:
                params["q"] = query
            resp = requests.get("https://pixabay.com/api/videos/", params=params, timeout=30)
            # Pixabay music is served via the video API (music = video type)
            # Alternative: use the dedicated music endpoint if available
            resp.raise_for_status()
            data = resp.json()
            hits = data.get("hits", [])
            if not hits:
                # Try image API with music tags as fallback
                return ToolResult(success=False, error=f"No music found for: {query}",
                                  data={"total": data.get("total", 0)})
            hit = hits[0]
            # Download the medium quality video (contains audio)
            video_url = hit.get("videos", {}).get("medium", {}).get("url") or hit.get("videos", {}).get("small", {}).get("url")
            if not video_url:
                return ToolResult(success=False, error="No download URL in hit")
            dl_resp = requests.get(video_url, timeout=120)
            dl_resp.raise_for_status()
            output_path = Path(inputs.get("output_path", "pixabay_music.mp3"))
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(dl_resp.content)
            return ToolResult(
                success=True,
                data={"provider": "pixabay", "user": hit.get("user", "Unknown"),
                      "tags": hit.get("tags", ""), "output": str(output_path),
                      "license": "Pixabay Content License (free, no attribution required)",
                      "page_url": hit.get("pageURL", ""), "duration": hit.get("duration", 0)},
                artifacts=[str(output_path)], cost_usd=0.0, duration_seconds=round(time.time() - start, 2),
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Pixabay music failed: {e}")


# Also provide a simpler music search via the Pixabay music API endpoint
class PixabayMusicSearch(BaseTool):
    """Search Pixabay music library (https://pixabay.com/api/music/)."""
    name = "pixabay_music_search"
    capability = "music_generation"
    provider = "pixabay"
    agent_skills = ["music"]
    install_instructions = "Set PIXABAY_API_KEY env var."

    def get_status(self) -> ToolStatus:
        return ToolStatus.AVAILABLE if os.environ.get("PIXABAY_API_KEY") else ToolStatus.UNAVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        api_key = os.environ.get("PIXABAY_API_KEY")
        if not api_key:
            return ToolResult(success=False, error="No PIXABAY_API_KEY")
        start = time.time()
        try:
            import requests
            params: dict[str, Any] = {"key": api_key, "per_page": 5}
            if inputs.get("query"):
                params["q"] = inputs["query"]
            if inputs.get("music_type"):
                params["music_type"] = inputs["music_type"]
            resp = requests.get("https://pixabay.com/api/music/", params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            hits = data.get("hits", [])
            if not hits:
                return ToolResult(success=False, error="No music found")
            hit = hits[0]
            audio_url = hit.get("audio", "")
            if not audio_url:
                return ToolResult(success=False, error="No audio URL")
            dl_resp = requests.get(audio_url, timeout=120)
            dl_resp.raise_for_status()
            output_path = Path(inputs.get("output_path", "background_music.mp3"))
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(dl_resp.content)
            return ToolResult(
                success=True,
                data={"provider": "pixabay", "user": hit.get("user", "Unknown"),
                      "tags": hit.get("tags", ""), "output": str(output_path),
                      "license": "Pixabay Content License",
                      "page_url": hit.get("pageURL", ""), "duration": hit.get("duration", 0)},
                artifacts=[str(output_path)], cost_usd=0.0, duration_seconds=round(time.time() - start, 2),
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Music search failed: {e}")
