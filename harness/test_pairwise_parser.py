"""Offline unit test for _parse_pairwise_verdict (F2 structured output)."""
import sys

sys.path.insert(0, "harness")
from harness_tools import _parse_pairwise_verdict as p

cases = [
    ('{"assessment": "different", "winner": "second", "reason": "x"}', "after"),
    ('{"assessment": "different", "winner": "first", "reason": "x"}', "before"),
    ('{"assessment": "identical", "winner": null, "reason": "x"}', "identical"),
    ('{"assessment": "nearly-identical", "winner": null}', "identical"),
    ('{"assessment": "different", "winner": null}', "unparsed"),
    ("WINNER: second overall better", "after"),
    ("The two images are identical.", "identical"),
    ("garbage response", "unparsed"),
    ('{"assessment": "different", "winner": "SECOND"}', "after"),
    ('```json\n{"assessment": "identical", "winner": null}\n```', "identical"),
    ("the WINNER: first is better", "before"),
]
ok = True
for text, want in cases:
    got = p(text)
    mark = "PASS" if got == want else "FAIL"
    if got != want:
        ok = False
    print(f"{mark} want={want} got={got} | {text[:50]}")
print("ALL PASS" if ok else "FAILURES")
sys.exit(0 if ok else 1)
