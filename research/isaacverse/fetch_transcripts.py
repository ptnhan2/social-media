import json, os, sys
from youtube_transcript_api import YouTubeTranscriptApi

videos = [
    ("82Mpsgc8cLM", "How I Blew Up My Youtube Channel"),
    ("cX8c3R2LFd4", "How I Actually Write Viral Scripts"),
    ("KhQTKG3Xtbs", "How I Actually Make AI Voice Sound Real"),
    ("ciAywjey0cY", "How I Actually Edit Viral Videos"),
    ("_rXj297vYYs", "I Tried Making a Viral AI Video"),
    ("mI7cq4uHCZ4", "How I Actually Make Viral Thumbnails"),
    ("GPoti7DZsME", "How I Broke Youtube with 1 Video"),
    ("X1WJlNUJOgg", "I Tried Youtube Shorts for 365 Days"),
]
out = "research/isaacverse/transcripts"
os.makedirs(out, exist_ok=True)
api = YouTubeTranscriptApi()

def fetch_any(api, vid):
    # try new API fetch with language preference, then any transcript (incl. generated)
    try:
        return api.fetch(vid, languages=["en", "en-US", "en-GB"])
    except Exception:
        pass
    try:
        lst = api.list(vid)
        # prefer manually created, else generated
        for t in lst:
            return t.fetch()
    except Exception:
        pass
    # older API fallback
    return YouTubeTranscriptApi.get_transcript(vid)

results = []
for vid, title in videos:
    try:
        t = fetch_any(api, vid)
        snippets = [{"text": s.text, "start": round(s.start, 2), "duration": round(s.duration, 2)} for s in t]
        full = " ".join(s.text for s in t)
        with open(f"{out}/{vid}.json", "w", encoding="utf-8") as f:
            json.dump({"id": vid, "title": title, "snippets": snippets}, f, ensure_ascii=False, indent=2)
        with open(f"{out}/{vid}.txt", "w", encoding="utf-8") as f:
            f.write(full)
        print(f"OK {vid} | {title} | {len(snippets)} seg | {len(full)} chars")
        results.append((vid, title, len(snippets), len(full)))
    except Exception as e:
        print(f"FAIL {vid} | {title} | {type(e).__name__}: {e}")
        results.append((vid, title, 0, 0))

with open(f"{out}/_index.json", "w", encoding="utf-8") as f:
    json.dump([{"id": r[0], "title": r[1], "segments": r[2], "chars": r[3]} for r in results], f, ensure_ascii=False, indent=2)
print("DONE")
