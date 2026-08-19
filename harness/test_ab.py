"""Controlled A/B test: baseline → critique → change → re-render → critique.

Same session, same thread, same VLM. Both scores from same run.
"""
import json, urllib.request, time, re

API = "http://localhost:2024"

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, headers={"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read().decode())

def run(tid, query, max_interrupts=3):
    result = api("POST", f"/threads/{tid}/runs/wait", {
        "assistant_id": "agent",
        "input": {"messages": [{"role": "user", "content": query}]},
    })
    cycles = 0
    while "__interrupt__" in result and cycles < max_interrupts:
        cycles += 1
        result = api("POST", f"/threads/{tid}/runs/wait", {
            "assistant_id": "agent",
            "command": {"resume": {"decisions": [{"type": "approve"}]}},
        })
        if "error" in result:
            break
    return result, cycles

def extract_scores(text):
    """Extract 5 scores from critique text."""
    scores = {}
    patterns = [
        (r"composition[:\s]*(\d)", "composition"),
        (r"color[:\s]*(\d)", "color"),
        (r"motion[:\s]*(\d)", "motion"),
        (r"text[:\s]*(\d)", "text"),
        (r"pacing[:\s]*(\d)", "pacing"),
    ]
    lower = text.lower()
    for pattern, name in patterns:
        m = re.search(pattern, lower)
        if m:
            scores[name] = int(m.group(1))
    return scores

# Ensure style is at baseline (damping=18)
print("Resetting style to baseline (damping=18)...")
import subprocess, os
style_path = "libraries/04-visual/isaacverse-style.json"
with open(style_path, "r") as f:
    s = json.load(f)
s["treatments"]["semantic-diagram"]["entrance"]["damping"] = 18
s["treatments"]["semantic-diagram"]["entrance"]["durationSec"] = 0.75
s["treatments"]["semantic-diagram"]["edge"]["stroke"]["mode"] = "solid"
s["version"] = 1
with open(style_path, "w") as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
import shutil
shutil.copy2(style_path, "remotion-composer/shared/isaacverse/isaacverse-style.json")
print("Style reset: damping=18, mode=solid\n")

# === STEP 1: Baseline render + critique ===
print("=" * 60)
print("STEP 1: BASELINE (damping=18) — render + critique")
print("=" * 60)

tid = api("POST", "/threads", {})["thread_id"]
print(f"Thread: {tid}")

result, cycles = run(tid, "Render isaacverse-final 3.5 to 7 draft. Then use the critic subagent to critique it. I need the 5 scores: composition, color, motion, text, pacing. Report scores clearly.")
msgs = result.get("messages", [])
baseline_scores = {}
for m in msgs:
    c = m.get("content", "")
    t = m.get("type", "")
    if t == "tool" and c:
        scores = extract_scores(str(c))
        if len(scores) >= 3:
            baseline_scores = scores
            print(f"  Baseline scores: {scores}")
    if t == "ai" and c and len(str(c)) > 20:
        print(f"  [AI] {str(c)[:200]}")

if not baseline_scores:
    # Try extracting from AI response
    for m in msgs:
        c = m.get("content", "")
        if c:
            scores = extract_scores(str(c))
            if len(scores) >= 3:
                baseline_scores = scores
                print(f"  Baseline scores (from AI): {scores}")

print(f"  Tool calls: {sum(len(m.get('tool_calls', [])) for m in msgs)} | Interrupts: {cycles}")

# === STEP 2: Change damping 18→10 ===
print(f"\n{'='*60}")
print("STEP 2: CHANGE (damping 18→10)")
print(f"{'='*60}")

tid2 = api("POST", "/threads", {})["thread_id"]
result2, cycles2 = run(tid2, "Use update_style to change treatments.semantic-diagram.entrance.damping to 10.")
msgs2 = result2.get("messages", [])
for m in msgs2:
    c = m.get("content", "")
    t = m.get("type", "")
    tc = m.get("tool_calls", [])
    if tc:
        for item in tc:
            print(f"  [{t}] {item.get('name')}({str(item.get('args',''))[:100]})")
    elif t == "tool" and c:
        print(f"  [RESULT] {str(c)[:200]}")
    elif t == "ai" and c and len(str(c)) > 20:
        print(f"  [AI] {str(c)[:200]}")

# === STEP 3: Re-render + critique with damping=10 ===
print(f"\n{'='*60}")
print("STEP 3: AFTER (damping=10) — render + critique")
print(f"{'='*60}")

tid3 = api("POST", "/threads", {})["thread_id"]
result3, cycles3 = run(tid3, "Render isaacverse-final 3.5 to 7 draft. Then use the critic subagent to critique it. I need the 5 scores: composition, color, motion, text, pacing. Report scores clearly.")
msgs3 = result3.get("messages", [])
after_scores = {}
for m in msgs3:
    c = m.get("content", "")
    t = m.get("type", "")
    if t == "tool" and c:
        scores = extract_scores(str(c))
        if len(scores) >= 3:
            after_scores = scores
            print(f"  After scores: {scores}")
    if t == "ai" and c and len(str(c)) > 20:
        print(f"  [AI] {str(c)[:200]}")

if not after_scores:
    for m in msgs3:
        c = m.get("content", "")
        if c:
            scores = extract_scores(str(c))
            if len(scores) >= 3:
                after_scores = scores
                print(f"  After scores (from AI): {scores}")

print(f"  Tool calls: {sum(len(m.get('tool_calls', [])) for m in msgs3)} | Interrupts: {cycles3}")

# === COMPARISON ===
print(f"\n{'='*60}")
print("A/B COMPARISON (same session, same VLM)")
print(f"{'='*60}")
print(f"{'Aspect':<15} {'Baseline':>10} {'After':>10} {'Delta':>10}")
print(f"{'-'*45}")
for aspect in ["composition", "color", "motion", "text", "pacing"]:
    b = baseline_scores.get(aspect, "?")
    a = after_scores.get(aspect, "?")
    if isinstance(b, int) and isinstance(a, int):
        delta = a - b
        sign = "+" if delta > 0 else ""
        print(f"{aspect:<15} {b:>10} {a:>10} {sign}{delta:>9}")
    else:
        print(f"{aspect:<15} {str(b):>10} {str(a):>10} {'?':>10}")

print(f"\n{'='*60}")
if baseline_scores and after_scores:
    motion_delta = after_scores.get("motion", 0) - baseline_scores.get("motion", 0)
    if motion_delta > 0:
        print(f"✅ MOTION IMPROVED: {baseline_scores.get('motion')} → {after_scores.get('motion')} (+{motion_delta})")
    elif motion_delta < 0:
        print(f"❌ MOTION REGRESSED: {baseline_scores.get('motion')} → {after_scores.get('motion')} ({motion_delta})")
    else:
        print(f"➡️ MOTION UNCHANGED: {baseline_scores.get('motion')} → {after_scores.get('motion')}")
else:
    print("⚠️ Could not extract scores from one or both critiques")
print(f"{'='*60}")
