"""Validate harvested facts and decoded images without changing the app catalog."""
import json
from pathlib import Path
from PIL import Image

base = Path(__file__).resolve().parents[1] / 'data' / 'collected'
products = json.loads((base / 'products.json').read_text(encoding='utf-8'))
terms = json.loads((base / 'term-candidates.json').read_text(encoding='utf-8'))
results = json.loads((base / 'image-download-results.json').read_text(encoding='utf-8'))
observed = {(p['category'], p['product_name'], p['pack_size']) for p in products}
for term in terms:
    assert (term['category'], term['product_name'], term['pack_size']) in observed
    assert term['english'].casefold() in term['product_name'].casefold()
    assert term['chinese'].strip()
    assert term['review_status'] == 'candidate'
    if term.get('product_url'):
        assert term['product_url'].startswith('https://www.coles.com.au/product/')
        assert term['product_url'].endswith('-' + term['product_id'])
    if term.get('image'):
        assert term['image_status'] == 'downloaded'
        assert (base / term['image']).is_file()
decoded = 0
for result in results:
    if result['status'] != 'downloaded':
        continue
    image = (base / result['image']).resolve()
    assert image.parent == (base / 'images').resolve()
    with Image.open(image) as picture:
        assert picture.width > 0 and picture.height > 0
        picture.verify()
    decoded += 1
coverage = json.loads((base / 'coverage.json').read_text(encoding='utf-8'))
assert coverage['unique_category_products'] == len(products)
assert coverage['complete'] is False
print(f'Validated {len(products)} source products, {len(terms)} bilingual candidates, {decoded} decoded images')
