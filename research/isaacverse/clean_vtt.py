import re, glob, os

def vtt_to_text(path):
    lines = []
    seen_prev = ""
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.rstrip("\n")
            if not line.strip():
                continue
            if line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:") or line.startswith("NOTE"):
                continue
            if re.match(r"^\d\d:\d\d:\d\d", line) or "-->" in line:
                continue
            if re.match(r"^\d+$", line):  # cue index
                continue
            # strip tags <...>
            text = re.sub(r"<[^>]+>", "", line)
            text = re.sub(r"&amp;", "&", text)
            text = text.strip()
            if not text:
                continue
            # dedupe consecutive identical (auto-subs repeat)
            if text == seen_prev:
                continue
            seen_prev = text
            lines.append(text)
    return " ".join(lines)

def split_sentences(text):
    # split on sentence enders, keep punctuation, drop empties
    parts = re.split(r"(?<=[.?!])\s+", text)
    return "\n".join(p.strip() for p in parts if p.strip())

titles = {
    "82Mpsgc8cLM": "How I Blew Up My Youtube Channel",
    "cX8c3R2LFd4": "How I Actually Write Viral Scripts",
    "KhQTKG3Xtbs": "How I Actually Make AI Voice Sound Real",
    "ciAywjey0cY": "How I Actually Edit Viral Videos",
    "_rXj297vYYs": "I Tried Making a Viral AI Video!",
    "mI7cq4uHCZ4": "How I Actually Make Viral Thumbnails",
    "GPoti7DZsME": "How I Broke Youtube with 1 Video",
    "X1WJlNUJOgg": "I Tried Youtube Shorts for 365 Days!",
}

out = []
for vid, title in titles.items():
    p = f"research/isaacverse/transcripts/{vid}.en.vtt"
    if not os.path.exists(p):
        continue
    txt = vtt_to_text(p)
    txt = split_sentences(txt)
    # save individual cleaned txt
    with open(f"research/isaacverse/transcripts/{vid}.txt", "w", encoding="utf-8") as f:
        f.write(txt)
    out.append(f"\n\n===== [{vid}] {title} =====\n{txt}")

with open("research/isaacverse/transcripts_all.txt", "w", encoding="utf-8") as f:
    f.write("".join(out))

print("cleaned files:")
for vid in titles:
    p = f"research/isaacverse/transcripts/{vid}.txt"
    if os.path.exists(p):
        print(f"  {vid}: {os.path.getsize(p)} bytes")
print("combined:", os.path.getsize("research/isaacverse/transcripts_all.txt"), "bytes")
