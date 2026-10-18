import fs from 'node:fs';

const sourcePath = new URL('../tmp/coles/collected/products.json', import.meta.url);
const outputPath = new URL('../data/raw/products.json', import.meta.url);
const products = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const output = products.map(({ category, product_name, pack_size, source_pages }) => ({
  category,
  product_name,
  pack_size,
  source_page: source_pages[0],
}));

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Exported ${output.length} raw product records.`);
