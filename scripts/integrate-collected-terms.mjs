import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const candidates = JSON.parse(await fs.readFile(path.join(root, 'tmp/coles/collected/term-candidates.json'), 'utf8'));
const index = JSON.parse(await fs.readFile(path.join(root, 'data/app/index.json'), 'utf8'));
let added = 0;

for (const category of index.categories) {
  const folder = path.join(root, 'data/app/categories', category.category);
  const vocabularyPath = path.join(root, 'data/app', category.vocabulary);
  const imagesPath = path.join(root, 'data/app', category.images);
  const vocabulary = JSON.parse(await fs.readFile(vocabularyPath, 'utf8'));
  const images = JSON.parse(await fs.readFile(imagesPath, 'utf8'));
  const known = new Set(vocabulary.map(word => `${word.english.trim().toLowerCase()}\0${word.chinese.trim()}`));

  for (const candidate of candidates.filter(item => item.category === category.category)) {
    const key = `${candidate.english.trim().toLowerCase()}\0${candidate.chinese.trim()}`;
    if (known.has(key)) continue;
    const imageKey = candidate.english.trim().toLowerCase();
    if (!images[imageKey]) {
      const filename = `coles-${candidate.product_id}.jpg`;
      await fs.copyFile(
        path.join(root, 'tmp/coles/collected', candidate.image),
        path.join(folder, 'images', filename),
      );
      images[imageKey] = `images/${filename}`;
    }
    vocabulary.push({ english: candidate.english.trim(), chinese: candidate.chinese.trim() });
    known.add(key);
    added += 1;
  }

  await fs.writeFile(vocabularyPath, `${JSON.stringify(vocabulary, null, 2)}\n`);
  await fs.writeFile(imagesPath, `${JSON.stringify(images, null, 2)}\n`);
}

console.log(`Added ${added} vocabulary records.`);
