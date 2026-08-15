"""Verify video deps + frame extraction."""
from deepagents.middleware._video import video_dependencies_available, extract_video_frames

print("Video deps available:", video_dependencies_available())

with open("projects/isaacverse-final/renders/windows/isaacverse-final-draft-0.00-3.95.mp4", "rb") as f:
    content = f.read()

frames = extract_video_frames(content, offset_seconds=0.5, duration_seconds=2.0, sampling_rate=1.0)
print(f"Frames extracted: {len(frames)}")
if frames:
    f = frames[0]
    print(f"Keys: {list(f.keys())}")
    for k, v in f.items():
        if k == "source":
            print(f"  {k}: {type(v).__name__} ({len(str(v))} chars)")
        else:
            print(f"  {k}: {v}")

