import unittest

from tools.audio.isaacverse_voice import score_take_metrics


class VoiceScoringTest(unittest.TestCase):
    def test_dynamic_take_beats_flat_take(self):
        dynamic = score_take_metrics(-22.0, -4.0, 3.0, 3.0)
        flat = score_take_metrics(-18.0, -15.0, 3.0, 3.0)
        self.assertGreater(dynamic, flat)

    def test_timing_drift_is_penalized(self):
        on_time = score_take_metrics(-22.0, -4.0, 3.0, 3.0)
        late = score_take_metrics(-22.0, -4.0, 6.0, 3.0)
        self.assertGreater(on_time, late)


if __name__ == "__main__":
    unittest.main()
