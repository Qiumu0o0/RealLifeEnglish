import fs from 'node:fs';

const sourcePath = new URL('../data/collected/products.json', import.meta.url);
const outputPath = new URL('../data/collected/product-names.json', import.meta.url);
const products = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const names = [...new Set(products.map(({ product_name }) => product_name))]
  .sort((left, right) => left.localeCompare(right, 'en-AU'));

const output = {
  source_record_count: products.length,
  unique_name_count: names.length,
  names,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Exported ${names.length} unique names from ${products.length} product records.`);
