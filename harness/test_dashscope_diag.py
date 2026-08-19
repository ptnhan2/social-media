"""Diagnose DashScope upload stall: find payload size threshold.

Tests (each timed, results written to stdout as ASCII-safe):
  1. text-only tiny call          (baseline — known working)
  2. single 640px PNG frame       (~50KB b64)
  3. two frames                   (~100KB)
  4. native video base64          (~350KB)
"""
import sys, os, time, base64, json, subprocess, tempfile, urllib.request, urllib.error

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pathlib import Path
for line in Path(__file__).parent.parent / ".env" and (Path(__file__).parent.parent / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            os.environ.setdefault(k.strip(), v)

VIDEO = os.path.join(Path(__file__).parent.parent, "projects", "isaacverse-final", "renders", "windows", "ab_A_damping18.mp4")
KEY = os.environ["DASHSCOPE_API_KEY"]
URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"


def call(content, label, timeout=120):
    payload = json.dumps({"model": "qwen3-vl-flash", "messages": [{"role": "user", "content": content}], "max_tokens": 60}).encode()
    req = urllib.request.Request(URL, data=payload, headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}, method="POST")
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            out = json.loads(r.read().decode())
        dt = time.time() - t0
        txt = out["choices"][0]["message"]["content"][:80].replace("\n", " ")
        print(f"{label:<22} payload={len(payload)//1024}KB  OK  {dt:.1f}s  -> {txt}", flush=True)
        return True
    except Exception as e:
        dt = time.time() - t0
        print(f"{label:<22} payload={len(payload)//1024}KB  FAIL {dt:.1f}s  {str(e)[:120]}", flush=True)
        return False


# extract 2 frames
tmp = tempfile.mkdtemp()
frames = []
for i, t in enumerate(["1.5", "3.0"]):
    fp = os.path.join(tmp, f"f{i}.png")
    subprocess.run(["ffmpeg", "-y", "-ss", t, "-i", VIDEO, "-frames:v", "1", "-q:v", "2", "-vf", "scale=640:-1", fp], capture_output=True, timeout=30)
    if os.path.exists(fp):
        frames.append(base64.b64encode(open(fp, "rb").read()).decode())
print(f"frames extracted: {len(frames)}", flush=True)

call([{"type": "text", "text": "Say OK"}], "1-text-tiny")
call([{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{frames[0]}"}}, {"type": "text", "text": "One word: what is this?"}], "2-one-frame")
call([{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{frames[0]}"}}, {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{frames[1]}"}}, {"type": "text", "text": "One word each."}], "3-two-frames")
vb64 = base64.b64encode(open(VIDEO, "rb").read()).decode()
call([{"type": "video_url", "video_url": {"url": f"data:video/mp4;base64,{vb64}"}, "fps": 2}, {"type": "text", "text": "One sentence: what motion?"}], "4-video-native", timeout=240)
print("done", flush=True)
