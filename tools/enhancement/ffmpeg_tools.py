"""FFmpeg tools — audio mixer, video analyzer, frame sampler, scene detect, etc.
All use ffmpeg/ffprobe CLI. Each declares agent_skills = ['ffmpeg']."""
from __future__ import annotations
import subprocess, json, time, os
from pathlib import Path
from typing import Any
from tools.base_tool import BaseTool, ToolResult, ToolStatus


def _run(cmd: list[str], timeout: int = 120) -> tuple[str, str]:
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return r.stdout, r.stderr


class AudioMixer(BaseTool):
    name = "audio_mixer"
    capability = "audio_processing"
    provider = "ffmpeg"
    agent_skills = ["ffmpeg", "video-toolkit"]
    capabilities = ["mix", "duck", "normalize"]
    best_for = ["final mix: narration + music + SFX"]

    def get_status(self) -> ToolStatus:
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
            return ToolStatus.AVAILABLE
        except Exception:
            return ToolStatus.UNAVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        start = time.time()
        try:
            narration = inputs["narration"]
            music = inputs.get("music")
            sfx = inputs.get("sfx", [])
            output = inputs["output_path"]
            music_vol = inputs.get("music_volume", 0.05)
            # Build ffmpeg command: narration + ducked music + SFX
            cmd = ["ffmpeg", "-y", "-i", narration]
            if music:
                cmd += ["-i", music]
            for s in sfx:
                cmd += ["-i", s]
            # Mix: narration at 1.0, music at music_vol, sfx at their vol
            filter_parts = ["[0:a]volume=1.0[a0]"]
            n_inputs = 1
            if music:
                filter_parts.append(f"[1:a]volume={music_vol}[a1]")
                n_inputs = 2
            sfx_idx = 2
            for i, s in enumerate(sfx):
                vol = s.get("vol", 0.5)
                filter_parts.append(f"[{sfx_idx+i}:a]volume={vol}[as{i}]")
            inputs_str = "[a0]"
            if music:
                inputs_str += "[a1]"
            for i in range(len(sfx)):
                inputs_str += f"[as{i}]"
            n_total = 1 + (1 if music else 0) + len(sfx)
            filter_parts.append(f"{inputs_str}amix=inputs={n_total}:duration=longest[aout]")
            cmd += ["-filter_complex", ";".join(filter_parts), "-map", "[aout]",
                    "-b:a", "128k", str(output)]
            _run(cmd, timeout=300)
            return ToolResult(success=True, data={"output": output}, artifacts=[output],
                            cost_usd=0.0, duration_seconds=round(time.time() - start, 2))
        except Exception as e:
            return ToolResult(success=False, error=f"Audio mix failed: {e}")


class VideoAnalyzer(BaseTool):
    name = "video_analyzer"
    capability = "analysis"
    provider = "ffmpeg"
    agent_skills = ["video-understand", "ffmpeg"]
    capabilities = ["duration", "volume", "freeze_detect", "scene_detect", "frame_extract"]
    best_for = ["gate metrics", "video quality analysis"]

    def get_status(self) -> ToolStatus:
        try:
            subprocess.run(["ffprobe", "-version"], capture_output=True, timeout=5)
            return ToolStatus.AVAILABLE
        except Exception:
            return ToolStatus.UNAVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        start = time.time()
        try:
            vid = inputs["video_path"]
            op = inputs.get("operation", "info")
            if op == "duration":
                out, _ = _run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", vid])
                return ToolResult(success=True, data={"duration": float(out.strip())})
            elif op == "volume":
                out, _ = _run(["ffmpeg", "-i", vid, "-af", "volumedetect", "-f", "null", "NUL"])
                import re
                mean = re.search(r"mean_volume: (-?\d+\.?\d*)", out)
                mx = re.search(r"max_volume: (-?\d+\.?\d*)", out)
                return ToolResult(success=True, data={"mean_volume": float(mean.group(1)) if mean else None,
                                "max_volume": float(mx.group(1)) if mx else None})
            elif op == "freeze":
                threshold = inputs.get("threshold", "-42dB")
                out, _ = _run(["ffmpeg", "-i", vid, "-vf", f"freezedetect=n={threshold}:d=0.5", "-an", "-f", "null", "NUL"])
                durs = [float(x) for x in __import__("re").findall(r"freeze_duration: ([\d.]+)", out)]
                return ToolResult(success=True, data={"freeze_durations": durs, "total_frozen": sum(durs)})
            elif op == "frame":
                t = inputs.get("timestamp", 0)
                output = inputs.get("output_path", f"frame_{t}.png")
                _run(["ffmpeg", "-y", "-ss", str(t), "-i", vid, "-vframes", "1",
                     "-vf", f"scale={inputs.get('width', 320)}:-2", output])
                return ToolResult(success=True, data={"output": output}, artifacts=[output])
            return ToolResult(success=False, error=f"Unknown operation: {op}")
        except Exception as e:
            return ToolResult(success=False, error=f"Analysis failed: {e}")


class FrameSampler(BaseTool):
    name = "frame_sampler"
    capability = "analysis"
    provider = "ffmpeg"
    agent_skills = ["ffmpeg"]
    capabilities = ["frame_extract", "storyboard"]
    best_for = ["storyboard generation", "preview frames"]

    def get_status(self) -> ToolStatus:
        return VideoAnalyzer().get_status()

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        return VideoAnalyzer().execute({**inputs, "operation": "frame"})


class SceneDetect(BaseTool):
    name = "scene_detect"
    capability = "analysis"
    provider = "ffmpeg"
    agent_skills = ["ffmpeg"]
    capabilities = ["scene_boundaries"]

    def get_status(self) -> ToolStatus:
        return VideoAnalyzer().get_status()

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        vid = inputs["video_path"]
        threshold = inputs.get("threshold", 0.3)
        out, _ = _run(["ffmpeg", "-i", vid, "-vf", f"select='gt(scene,{threshold})',showinfo", "-an", "-f", "null", "NUL"])
        import re
        pts = [float(x) for x in re.findall(r"pts_time:([\d.]+)", out)]
        return ToolResult(success=True, data={"scene_starts": pts, "count": len(pts)})


class BgRemove(BaseTool):
    name = "bg_remove"
    capability = "enhancement"
    provider = "rembg"
    agent_skills = ["ffmpeg"]
    capabilities = ["background_removal"]
    best_for = ["subject cutout", "alpha extraction"]

    def get_status(self) -> ToolStatus:
        try:
            subprocess.run(["python", "-c", "import rembg"], capture_output=True, timeout=5)
            return ToolStatus.AVAILABLE
        except Exception:
            return ToolStatus.UNAVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        start = time.time()
        try:
            from rembg import remove, new_session
            from PIL import Image
            session = new_session(inputs.get("model", "u2net"))
            src = Image.open(inputs["input_path"]).convert("RGB")
            result = remove(src, session=session)
            output = inputs.get("output_path", "cutout.png")
            result.save(output)
            return ToolResult(success=True, data={"output": output}, artifacts=[output],
                            cost_usd=0.0, duration_seconds=round(time.time() - start, 2))
        except Exception as e:
            return ToolResult(success=False, error=f"rembg failed: {e}")


class VideoDownloader(BaseTool):
    name = "video_downloader"
    capability = "analysis"
    provider = "yt-dlp"
    agent_skills = ["video-download"]
    capabilities = ["download", "subtitles"]

    def get_status(self) -> ToolStatus:
        try:
            subprocess.run(["yt-dlp", "--version"], capture_output=True, timeout=5)
            return ToolStatus.AVAILABLE
        except Exception:
            return ToolStatus.UNAVAILABLE

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        start = time.time()
        try:
            url = inputs["url"]
            output = inputs.get("output_path", "%(title)s.%(ext)s")
            quality = inputs.get("quality", "best[height<=360]")
            cmd = ["yt-dlp", "-f", quality, "-o", output, url]
            if inputs.get("subtitles"):
                cmd += ["--write-auto-subs", "--sub-langs", inputs.get("sub_lang", "en")]
            _run(cmd, timeout=300)
            return ToolResult(success=True, data={"url": url, "output": output},
                            cost_usd=0.0, duration_seconds=round(time.time() - start, 2))
        except Exception as e:
            return ToolResult(success=False, error=f"Download failed: {e}")


class VideoTrimmer(BaseTool):
    name = "video_trimmer"
    capability = "video"
    provider = "ffmpeg"
    agent_skills = ["ffmpeg", "video-toolkit"]

    def get_status(self) -> ToolStatus:
        return VideoAnalyzer().get_status()

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        vid = inputs["video_path"]
        start_t = inputs["start"]
        end_t = inputs["end"]
        output = inputs["output_path"]
        _run(["ffmpeg", "-y", "-ss", str(start_t), "-to", str(end_t), "-i", vid, "-c", "copy", output])
        return ToolResult(success=True, data={"output": output}, artifacts=[output])


class SilenceCutter(BaseTool):
    name = "silence_cutter"
    capability = "video"
    provider = "ffmpeg"
    agent_skills = ["ffmpeg"]

    def get_status(self) -> ToolStatus:
        return VideoAnalyzer().get_status()

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        # Simplified: detect silence and output segments list
        vid = inputs["audio_path"]
        threshold = inputs.get("threshold", "-30dB")
        min_dur = inputs.get("min_duration", 0.5)
        out, _ = _run(["ffmpeg", "-i", vid, "-af", f"silencedetect=n={threshold}:d={min_dur}", "-f", "null", "NUL"])
        import re
        starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
        ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
        return ToolResult(success=True, data={"silence_starts": starts, "silence_ends": ends})


class VideoStitch(BaseTool):
    name = "video_stitch"
    capability = "video"
    provider = "ffmpeg"
    agent_skills = ["ffmpeg", "video-toolkit"]

    def get_status(self) -> ToolStatus:
        return VideoAnalyzer().get_status()

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        clips = inputs["clips"]
        output = inputs["output_path"]
        # Create concat list file
        list_file = Path(output).parent / "concat_list.txt"
        with open(list_file, "w") as f:
            for c in clips:
                f.write(f"file '{c}'\n")
        _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file), "-c", "copy", output])
        list_file.unlink()
        return ToolResult(success=True, data={"output": output}, artifacts=[output])


class Upscale(BaseTool):
    name = "upscale"
    capability = "enhancement"
    provider = "ffmpeg"
    agent_skills = ["ffmpeg"]

    def get_status(self) -> ToolStatus:
        return VideoAnalyzer().get_status()

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        vid = inputs["video_path"]
        output = inputs["output_path"]
        scale = inputs.get("scale", "3840:2160")  # 4K default
        _run(["ffmpeg", "-y", "-i", vid, "-vf", f"scale={scale}", "-crf", "18", output])
        return ToolResult(success=True, data={"output": output}, artifacts=[output])


class ColorGrade(BaseTool):
    name = "color_grade"
    capability = "enhancement"
    provider = "ffmpeg"
    agent_skills = ["ffmpeg"]

    def get_status(self) -> ToolStatus:
        return VideoAnalyzer().get_status()

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        vid = inputs["video_path"]
        output = inputs["output_path"]
        # Apply LUT or eq filter
        filter_str = inputs.get("filter", "eq=contrast=1.1:brightness=0.05:saturation=1.1")
        _run(["ffmpeg", "-y", "-i", vid, "-vf", filter_str, "-c:a", "copy", output])
        return ToolResult(success=True, data={"output": output}, artifacts=[output])
