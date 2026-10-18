import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Input records are extracted from observed Coles product links, not guessed products.
const root = path.resolve(import.meta.dirname, '..');
const manifestPath=process.argv[2]||'data/image-downloads.json';
const resultsPath=process.argv[3]||'data/image-download-results.json';
const manifest = JSON.parse(await fs.readFile(path.join(root, manifestPath), 'utf8'));
const results = [];
let previous = [];
try { previous = JSON.parse(await fs.readFile(path.join(root, resultsPath), 'utf8')); } catch {}
let next = 0;
function curl(url, target) {
  return new Promise(resolve => {
    const child = spawn('curl.exe', ['-L', '--compressed', '--fail', '--silent', '--show-error',
      '--proto', '=https', '--proto-redir', '=https', '--connect-timeout', '8', '--max-time', '18', url, '-o', target], { windowsHide: true });
    let error = '';
    child.stderr.on('data', chunk => { error += chunk; });
    child.on('error', err => resolve({ ok: false, error: err.message }));
    child.on('close', code => resolve({ ok: code === 0, error: error.slice(-250) }));
  });
}
function isImage(bytes) {
  return (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    || bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    || (bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP');
}
async function worker() {
  while (next < manifest.length) {
    const item = manifest[next++];
    const filename = path.join(root, 'data', item.category, item.image);
    const pending = filename + '.part';
    await fs.mkdir(path.dirname(filename), { recursive: true });
    let result = { ...item, status: 'missing' };
    try {
      const old = previous.find(record => record.category === item.category && record.image === item.image && record.product_url === item.product_url && record.status === 'downloaded');
      if (old && isImage(await fs.readFile(filename))) {
        results.push({ ...item, status: 'downloaded', image_url: old.image_url, reused: true }); continue;
      }
    } catch {}
    for (const url of item.image_candidates) {
      const response = await curl(url, pending);
      try {
        if (response.ok && isImage(await fs.readFile(pending))) {
          await fs.rename(pending, filename);
          result = { ...item, status: 'downloaded', image_url: url }; break;
        }
      } catch {}
      result.error = response.error || 'Response was not an image';
    }
    await fs.rm(pending, { force: true });
    results.push(result);
    if (results.length % 20 === 0) console.log('Processed', results.length, '/', manifest.length);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
results.sort((a,b) => (a.category+a.english).localeCompare(b.category+b.english));
await fs.writeFile(path.join(root, resultsPath), JSON.stringify(results, null, 2)+'\n');
console.log('Downloaded', results.filter(r=>r.status==='downloaded').length, '/', results.length);
