"""Generate small, content-addressed runtime thumbnails; keep source images intact."""
import base64
import hashlib
import io
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/app-images'
OUT.mkdir(parents=True, exist_ok=True)
index = json.loads((ROOT / 'data/index.json').read_text(encoding='utf-8'))
mapping, embedded = {}, {}
source_bytes = 0
for category in index['categories']:
    images = json.loads((ROOT / 'data' / category['images']).read_text(encoding='utf-8'))
    for relative in set(images.values()):
        original = 'data/' + category['category'] + '/' + relative
        data = (ROOT / original).read_bytes()
        source_bytes += len(data)
        name = hashlib.sha256(data).hexdigest()[:20] + '.jpg'
        target = OUT / name
        if not target.exists():
            with Image.open(io.BytesIO(data)) as image:
                image = ImageOps.exif_transpose(image).convert('RGB')
                image.thumbnail((384, 384), Image.Resampling.LANCZOS)
                image.save(target, 'JPEG', quality=78, optimize=True)
        runtime = 'data/app-images/' + name
        mapping[original] = runtime
        embedded[runtime] = 'data:image/jpeg;base64,' + base64.b64encode(target.read_bytes()).decode('ascii')
(OUT / 'index.json').write_text(json.dumps(mapping, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(ROOT / 'data/app-images.js').write_text('window.APP_IMAGE_DATA='+json.dumps(embedded,separators=(',', ':'))+';\n', encoding='utf-8')
print(f'Thumbnails: {len(embedded)} unique, {sum((ROOT / p).stat().st_size for p in embedded):,} bytes; sources {source_bytes:,} bytes')
