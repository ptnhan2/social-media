"""Pixabay Image — stock image search + download.
agent_skills = [] — no vendor skill needed (generic API)."""
from __future__ import annotations
import os, time
from pathlib import Path
from typing import Any
from tools.base_tool import BaseTool, ToolResult, ToolStatus


class PixabayImage(BaseTool):
    name = "pixabay_image"
    capability = "image_generation"
    provider = "pixabay"
    agent_skills = []
    install_instructions = "Set PIXABAY_API_KEY env var. Get key free at https://pixabay.com/api/docs/"
    capabilities = ["search_image", "download_image", "stock_image"]
    best_for = ["royalty-free library", "free stock images — no attribution required"]

    def get_status(self) -> ToolStatus:
        return ToolStatus.AVAILABLE if os.environ.get("PIXABAY_API_KEY") else ToolStatus.UNAVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        api_key = os.environ.get("PIXABAY_API_KEY")
        if not api_key:
            return ToolResult(success=False, error="No PIXABAY_API_KEY. " + self.install_instructions)
        start = time.time()
        try:
            import requests
            query = inputs["query"]
            params: dict[str, Any] = {
                "key": api_key, "q": query,
                "per_page": max(3, min(inputs.get("per_page", 5), 200)),
                "page": inputs.get("page", 1), "safesearch": "true",
            }
            if inputs.get("image_type") and inputs["image_type"] != "all":
                params["image_type"] = inputs["image_type"]
            if inputs.get("orientation") and inputs["orientation"] != "all":
                params["orientation"] = inputs["orientation"]
            if inputs.get("category"):
                params["category"] = inputs["category"]
            resp = requests.get("https://pixabay.com/api/", params=params, timeout=30)
            resp.raise_for_status()
            hits = resp.json().get("hits", [])
            if not hits:
                return ToolResult(success=False, error=f"No images for: {query}")
            hit = hits[0]
            image_url = hit.get("largeImageURL", hit.get("webformatURL"))
            img_resp = requests.get(image_url, timeout=60)
            img_resp.raise_for_status()
            output_path = Path(inputs.get("output_path", f"pixabay_{hit['id']}.jpg"))
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(img_resp.content)
            return ToolResult(
                success=True,
                data={"provider": "pixabay", "image_id": hit["id"], "user": hit.get("user", "Unknown"),
                      "tags": hit.get("tags", ""), "output": str(output_path),
                      "license": "Pixabay Content License (free, no attribution required)",
                      "page_url": hit.get("pageURL", "")},
                artifacts=[str(output_path)], cost_usd=0.0, duration_seconds=round(time.time() - start, 2),
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Pixabay image failed: {e}")
