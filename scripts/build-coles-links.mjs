import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const index=JSON.parse(await fs.readFile(path.join(root,'data/app/index.json'),'utf8'));
const collected=JSON.parse(await fs.readFile(path.join(root,'tmp/coles/collected/term-candidates.json'),'utf8'));
const direct=new Map();
for(const item of collected)if(item.product_url)direct.set(item.category+'|'+item.english.trim().toLowerCase(),item.product_url);
for(const category of index.categories){
  const legacyFile=path.join(root,'tmp/coles/legacy',category.category,'sources.json');
  try{for(const item of JSON.parse(await fs.readFile(legacyFile,'utf8')))if(item.product_url&&!direct.has(category.category+'|'+item.english.trim().toLowerCase()))direct.set(category.category+'|'+item.english.trim().toLowerCase(),item.product_url);}catch{}
  const words=JSON.parse(await fs.readFile(path.join(root,'data/app',category.vocabulary),'utf8'));
  const links={};
  for(const word of words){
    const key=word.english.trim().toLowerCase();
    links[key]=direct.get(category.category+'|'+key)||('https://www.coles.com.au/search?q='+encodeURIComponent(word.english.trim()));
  }
  await fs.writeFile(path.join(root,'data/app',category.links),JSON.stringify(links,null,2)+'\n');
}
console.log('Built Coles links for',index.categories.length,'categories');
