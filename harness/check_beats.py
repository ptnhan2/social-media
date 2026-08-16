import json
doc = json.load(open("projects/isaacverse-final/05-edit-doc.json", encoding="utf-8"))
for b in doc["beats"]:
    s = b["startSec"]
    e = s + b["durationSec"]
    t = b.get("treatmentId", "?")
    title = b.get("title", "")
    print(f"  {b['id']} | {s}-{e}s | treatment={t} | {title}")
