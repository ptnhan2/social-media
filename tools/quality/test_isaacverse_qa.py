import unittest

from tools.quality.isaacverse_qa import parse_freeze_events


class IsaacVerseQATest(unittest.TestCase):
    def test_parse_freeze_events(self):
        stderr = "freeze_start: 1.250\nfreeze_end: 2.000\nfreeze_duration: 0.750\n"
        self.assertEqual(parse_freeze_events(stderr), [{"startSec": 1.25, "endSec": 2.0, "durationSec": 0.75}])

    def test_empty_freeze_output_is_safe(self):
        self.assertEqual(parse_freeze_events(""), [])


if __name__ == "__main__":
    unittest.main()
