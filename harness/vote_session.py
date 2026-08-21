"""Taste-calibration vote session (Batch A1) — collect REAL user A/B votes.

Reuses verified render pairs (pixel-diff gate PASS) and presents each pair
BLIND (randomized left/right) in a local web page. The user picks which side
they prefer; each vote is appended to /memories/preferences.jsonl in the exact
schema request_keep writes, so calibrate.py can score user-vs-VLM agreement.

Per pair the VLM (qwen3-vl-plus, same montage pipeline as pairwise_verdict)
also gives its verdict — cached to memories/vote_verdicts.json so re-runs are
free. Verdicts run BEFORE the server starts (~2-3 min).

Run:
    harness/.venv/Scripts/python.exe harness/vote_session.py [--port 8765]

Then open http://localhost:8765 and vote honestly. Ctrl+C or finishing all
pairs runs calibrate.py automatically on whatever votes exist.
"""
from __future__ import annotations

import argparse
import datetime
import http.server
import json
import os
import random
import re
import socketserver
import sys
import threading
import urllib.parse
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HARNESS = Path(__file__).parent
sys.path.insert(0, str(HARNESS))

for line in (HARNESS.parent / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            os.environ.setdefault(k.strip(), v)

from harness_tools import pairwise_verdict  # noqa: E402

WND = HARNESS.parent / "projects" / "isaacverse-final" / "renders" / "windows"
PREFERENCES = HARNESS / "memories" / "preferences.jsonl"
VERDICT_CACHE = HARNESS / "memories" / "vote_verdicts.json"

# id, aspect, knob, a/b values (true A = before/old, B = after/new), files.
# MORNING session (2026-08-22): 1080p re-vote of the C3 pairs — tests the
# resolution hypothesis (motion/global changes tied at 360p; maybe the user
# can discriminate at 1080p). VLM verdicts run fresh on the new sources.
PAIRS = [
    {"id": "hr3color1080", "aspect": "color",
     "knob": "treatments.host-reflection.filter",
     "a": "saturate(.72) brightness(.72)", "b": "saturate(.8) brightness(.88)",
     "a_file": "hr3_1080_baseline.mp4", "b_file": "hr3_1080_color.mp4",
     "desc": "độ sáng/độ rực của host-reflection (tối mờ vs sáng) — bản 1080p"},
    {"id": "hr3push1080", "aspect": "motion",
     "knob": "treatments.host-reflection.pushDurationSec",
     "a": "4", "b": "1.5",
     "a_file": "hr3_1080_baseline.mp4", "b_file": "hr3_1080_push.mp4",
     "desc": "tốc độ camera zoom-in (chậm vs nhanh) — bản 1080p"},
]

state = {
    "index": 0,          # current pair pointer
    "votes": [],         # vote summaries for the page
    "done": False,
    "lock": threading.Lock(),
}
rng = random.Random()
BLIND: dict[str, str] = {}  # pair_id -> "ab" | "ba"


def load_verdict_cache() -> dict:
    if VERDICT_CACHE.exists():
        try:
            return json.loads(VERDICT_CACHE.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError:
            return {}
    return {}


def run_verdicts() -> None:
    """VLM verdicts for every pair (control once, then skipped — same session)."""
    cache = load_verdict_cache()
    control_ok = False
    for i, p in enumerate(PAIRS):
        if p["id"] in cache:
            print(f"  [verdict {i+1}/{len(PAIRS)}] {p['id']}: cached -> {cache[p['id']]['winner']}")
            continue
        print(f"  [verdict {i+1}/{len(PAIRS)}] {p['id']}: calling VLM (qwen3-vl-plus)...", flush=True)
        try:
            out = pairwise_verdict.invoke({
                "video_a": f"projects/isaacverse-final/renders/windows/{p['a_file']}",
                "video_b": f"projects/isaacverse-final/renders/windows/{p['b_file']}",
                "skip_control": control_ok,
            })
        except Exception as e:  # noqa: BLE001
            out = f"VERDICT ERROR: {e}"
        first = out.splitlines()[0] if out else ""
        m = re.search(r"Pairwise verdict: (\w+)", first)
        winner = m.group(1).lower() if m else "unparsed"
        if "CONTROL FAILED" in out or "ORACLE UNAVAILABLE" in out or "VERDICT ERROR" in out:
            winner = "error"
        if winner in ("after", "before") and "control passed" in out:
            control_ok = True
        cache[p["id"]] = {"winner": winner,
                          "raw": (first + (" | " + out.splitlines()[1] if len(out.splitlines()) > 1 else ""))[:220],
                          "ts": datetime.datetime.now().isoformat(timespec="seconds")}
        VERDICT_CACHE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"      -> {winner}")
    globals()["_VERDICTS"] = cache


_VERDICTS: dict = {}


def record_vote(pair: dict, choice: str) -> None:
    """choice: '1' | '2' (screen side) | 'tie'."""
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    blind = BLIND.get(pair["id"], "ab")
    if choice == "tie":
        user_verdict = "tie"
    else:  # map screen side back through the blind order
        side_a = "1" if blind == "ab" else "2"
        user_verdict = "a" if choice == side_a else "b"
    v = _VERDICTS.get(pair["id"], {})
    winner = v.get("winner", "")
    vlm_summary = f"Pairwise verdict: {winner}" if winner in ("after", "before") else ""
    rec = {
        "kind": "vote_session", "ts": ts, "knob": pair["knob"],
        "a": pair["a"], "b": pair["b"],
        "user_verdict": user_verdict, "vlm_verdict": vlm_summary,
        "aspect": pair["aspect"], "user_directed": False,
        "segment_note": f"vote_session:{pair['id']}", "blind_order": blind,
    }
    with open(PREFERENCES, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    with state["lock"]:
        state["votes"].append({"pair": pair["id"], "aspect": pair["aspect"],
                               "user": user_verdict, "vlm": winner or "-"})


PAGE = """<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Vote gu thẩm mỹ</title><style>
 body{background:#0b0e14;color:#e8e2d5;font-family:system-ui,Segoe UI,Arial;margin:0;padding:24px}
 h1{font-size:18px;margin:0 0 4px} .meta{color:#8a94a6;font-size:13px;margin-bottom:16px}
 .row{display:flex;gap:16px;justify-content:center}
 .cell{flex:1;max-width:480px;text-align:center}
 video{width:100%;border-radius:8px;background:#000}
 .lbl{font-weight:700;margin:8px 0;color:#f2b84b}
 button{background:#1b2230;color:#e8e2d5;border:1px solid #2c3a52;border-radius:8px;
   padding:10px 22px;font-size:15px;cursor:pointer;margin:14px 6px 0}
 button:hover{background:#243048}
 .vote{border-color:#f2b84b;font-weight:700}
 .bar{height:6px;background:#1b2230;border-radius:3px;margin:10px auto 18px;max-width:640px}
 .bar div{height:6px;background:#f2b84b;border-radius:3px}
 .done{text-align:center;padding:40px} .ok{color:#7dd88f;font-size:20px}
 table{margin:16px auto;border-collapse:collapse;font-size:14px}
 td,th{border:1px solid #2c3a52;padding:6px 12px}
</style></head><body>
<div id="app"></div>
<script>
let S=null;
async function load(){S=await (await fetch('/api/state')).json();render();}
function render(){
 const a=document.getElementById('app');
 if(S.done){let rows=S.votes.map(v=>`<tr><td>${v.pair}</td><td>${v.aspect}</td><td>${v.user}</td><td>${v.vlm}</td></tr>`).join('');
  a.innerHTML=`<div class="done"><div class="ok">Xong — cảm ơn bạn!</div>
  <p>Đã ghi ${S.votes.length} phiếu vào preferences.jsonl.</p>
  <table><tr><th>Cặp</th><th>Aspect</th><th>Bạn</th><th>VLM</th></tr>${rows}</table>
  <p style="color:#8a94a6">Quay lại terminal để xem kết quả calibrate (chạy tự động).</p></div>`;return;}
 const p=S.pair;
 a.innerHTML=`<h1>Cặp ${S.index+1}/${S.total} — gu của BẠN là chuẩn</h1>
 <div class="meta">Khía cạnh: <b>${p.aspect}</b> · ${p.desc}. Xem kỹ cả hai rồi chọn bên bạn THÍCH HƠN.</div>
 <div class="bar"><div style="width:${(S.index/S.total)*100}%"></div></div>
 <div class="row">
  <div class="cell"><div class="lbl">Video 1</div><video id="v1" src="/video/${p.f1}" controls muted playsinline></video></div>
  <div class="cell"><div class="lbl">Video 2</div><video id="v2" src="/video/${p.f2}" controls muted playsinline></video></div>
 </div>
 <div style="text-align:center">
  <button onclick="sync()">▶ Phát cả hai</button>
  <button class="vote" onclick="vote('1')">1 tốt hơn</button>
  <button class="vote" onclick="vote('2')">2 tốt hơn</button>
  <button onclick="vote('tie')">Như nhau</button>
 </div>`;
}
function sync(){const v1=document.getElementById('v1'),v2=document.getElementById('v2');
 v1.currentTime=0;v2.currentTime=0;v1.play();v2.play();}
async function vote(c){await fetch('/api/vote',{method:'POST',
 headers:{'Content-Type':'application/json'},body:JSON.stringify({choice:c})});load();}
load();
</script></body></html>"""


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):  # noqa: N802 — quiet
        pass

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        u = urllib.parse.urlparse(self.path)
        if u.path == "/" or u.path == "/index.html":
            body = PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif u.path == "/api/state":
            with state["lock"]:
                if state["index"] >= len(PAIRS):
                    self._json({"done": True, "total": len(PAIRS), "votes": state["votes"]})
                    return
                p = PAIRS[state["index"]]
                blind = BLIND.get(p["id"], "ab")
                f1, f2 = (p["a_file"], p["b_file"]) if blind == "ab" else (p["b_file"], p["a_file"])
                self._json({"done": False, "total": len(PAIRS), "index": state["index"],
                            "pair": {"id": p["id"], "aspect": p["aspect"], "desc": p["desc"],
                                     "f1": f1, "f2": f2},
                            "votes": state["votes"]})
        elif u.path.startswith("/video/"):
            name = os.path.basename(urllib.parse.unquote(u.path[len("/video/"):]))
            fp = WND / name
            if not fp.is_file():
                self.send_error(404)
                return
            size = fp.stat().st_size
            rng_header = self.headers.get("Range")
            start, end = 0, size - 1
            code = 200
            if rng_header:
                m = re.match(r"bytes=(\d*)-(\d*)", rng_header)
                if m:
                    if m.group(1):
                        start = int(m.group(1))
                    if m.group(2):
                        end = min(int(m.group(2)), size - 1)
                    code = 206
            length = end - start + 1
            self.send_response(code)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Accept-Ranges", "bytes")
            if code == 206:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(length))
            self.end_headers()
            with open(fp, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = f.read(min(64 * 1024, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        else:
            self.send_error(404)

    def do_POST(self):  # noqa: N802
        if urllib.parse.urlparse(self.path).path != "/api/vote":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", 0))
        try:
            choice = json.loads(self.rfile.read(length)).get("choice")
        except Exception:  # noqa: BLE001
            choice = None
        if choice not in ("1", "2", "tie"):
            self._json({"ok": False}, 400)
            return
        with state["lock"]:
            if state["index"] >= len(PAIRS):
                self._json({"ok": False, "reason": "done"}, 400)
                return
            pair = PAIRS[state["index"]]
            state["index"] += 1
        record_vote(pair, choice)
        self._json({"ok": True})


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()

    for p in PAIRS:
        for k in ("a_file", "b_file"):
            if not (WND / p[k]).is_file():
                sys.exit(f"missing render for pair {p['id']}: {p[k]}")
        BLIND[p["id"]] = rng.choice(("ab", "ba"))

    print(f"Blind order: {BLIND}")
    print(f"\nVLM verdicts ({len(PAIRS)} pairs, cached in memories/vote_verdicts.json):")
    run_verdicts()

    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", args.port), Handler) as httpd:
        print(f"\n  >> Mở http://localhost:{args.port} và bấm chọn theo gu của BẠN <<")
        print("  (Ctrl+C khi xong — calibrate chạy tự động với số phiếu hiện có)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
    print("\n=== CALIBRATE ===")
    import subprocess
    subprocess.run([sys.executable, str(HARNESS / "calibrate.py")], check=False)


if __name__ == "__main__":
    main()
