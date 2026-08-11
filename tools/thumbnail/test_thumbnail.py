import tempfile
import unittest
from pathlib import Path

from tools.thumbnail.thumbnail_generator import THUMBNAIL_TYPES, generate
from tools.thumbnail.thumbnail_qa import check


class ThumbnailTest(unittest.TestCase):
    def test_all_ten_types_are_declared(self):
        self.assertEqual(len(THUMBNAIL_TYPES), 10)

    def test_generated_thumbnail_passes_dimensions_and_contrast(self):
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / "thumb.png"
            generate("The timeline is not the edit", "single-claim", image)
            report = check(image)
            self.assertEqual(report["status"], "pass")


if __name__ == "__main__":
    unittest.main()
