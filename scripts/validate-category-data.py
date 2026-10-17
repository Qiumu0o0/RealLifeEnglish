"""Validate category vocabulary records and their local image assets."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "data"
index = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))
total = 0
images = set()
for category in index["categories"]:
    folder = ROOT / category["category"]
    words = json.loads((folder / "vocabulary.json").read_text(encoding="utf-8"))
    mapping = json.loads((folder / "images.json").read_text(encoding="utf-8"))
    assert len(words) == category["word_count"], folder
    assert len(words) == len({w["english"].lower() for w in words}), folder
    for word in words:
        assert set(word) == {"english", "chinese"}, word
        assert word["english"].strip() and word["chinese"].strip(), word
        filename = (folder / mapping[word["english"].lower()]).resolve()
        assert filename.is_relative_to(folder.resolve()), filename
        assert filename.is_file(), filename
        if filename not in images:
            with Image.open(filename) as image:
                image.verify()
            images.add(filename)
    total += len(words)
assert total == index["total_word_records"]
assert len(images) == index["total_local_image_files"]
print(f"Validated {total} word records and {len(images)} local images.")
