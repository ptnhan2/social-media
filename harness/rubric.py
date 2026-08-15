"""Taste rubric for RubricMiddleware — defines what "good" looks like.

The rubric is a string passed in agent invocation state: {"rubric": TASTE_RUBRIC, ...}
The RubricMiddleware grader evaluates the transcript against this rubric.
If any criterion fails, the grader returns needs_revision with specific gaps,
and the agent loops to fix the issues.
"""

TASTE_RUBRIC = """\
## Taste Rubric — IsaacVerse Render Quality

A good render must satisfy ALL of the following criteria. The grader should
verify each one against the transcript (which includes render results and any
VLM critique). If ANY criterion cannot be confirmed, mark it as failed with
a specific gap description.

### Criterion 1: Motion present
Every visual element must have purposeful animation (fade, slide, scale,
draw-on, push). Static frames with no motion are unacceptable.
Verify: Does the VLM critique or render output indicate motion? Is the
motion score >= 3?

### Criterion 2: Text legible
All text must be readable at draft resolution. Font sizes must be appropriate
for the content type (titles 80-120px, subtitles 18-27px, body 14-20px).
Verify: Does the text legibility score >= 3? Are there any reported
occlusion or overflow issues?

### Criterion 3: Composition balanced
The layout must have a clear focal point. Elements must not compete for
attention. Negative space must be used intentionally.
Verify: Does the composition score >= 3? Are there clutter or balance issues?

### Criterion 4: No rendering errors
The render must complete without errors. No black frames, no missing assets,
no broken layouts, no text overflow.
Verify: Did the render_window tool return a valid .mp4 path (not an error)?
Did any tool return a failure message?

### Criterion 5: Style change verified (if applicable)
If a style change was made, the post-change render must look different from
the pre-change render, and the difference must be an improvement.
Verify: Was a before/after comparison done? Did the VLM critique improve
on the changed aspect?
"""

# Default rubric for general improvement sessions
IMPROVEMENT_RUBRIC = TASTE_RUBRIC

# Focused rubric for style knob changes
STYLE_CHANGE_RUBRIC = """\
## Style Change Verification Rubric

After changing a style knob and re-rendering, verify:

### Criterion 1: Render succeeded
The post-change render completed without errors and produced a valid .mp4.

### Criterion 2: Change is visible
The VLM critique or visual comparison shows that the changed aspect is
actually different in the render (not identical to before).

### Criterion 3: Change is an improvement
The changed aspect's score improved or stayed the same. No other aspect
regressed significantly (dropped by 2+ points).

### Criterion 4: No side effects
The style change didn't break other visual elements. No new errors,
no layout shifts, no missing assets.
"""
