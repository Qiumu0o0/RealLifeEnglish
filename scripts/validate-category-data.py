"""Validate category vocabulary records and their Coles links."""
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1] / "data" / "app"
index = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))
total = 0
links = set()
for category in index["categories"]:
    folder = ROOT / "categories" / category["category"]
    words = json.loads((folder / "vocabulary.json").read_text(encoding="utf-8"))
    mapping = json.loads((folder / "links.json").read_text(encoding="utf-8"))
    assert len(words) == len({(w["english"].lower(), w["chinese"]) for w in words}), folder
    for word in words:
        assert set(word) == {"english", "chinese"}, word
        assert word["english"].strip() and word["chinese"].strip(), word
        link = mapping[word["english"].lower()]
        parsed = urlparse(link)
        assert parsed.scheme == "https" and parsed.hostname == "www.coles.com.au", link
        assert parsed.path.startswith("/product/") or parsed.path == "/search", link
        links.add(link)
    total += len(words)
print(f"Validated {total} word records and {len(links)} Coles links.")
