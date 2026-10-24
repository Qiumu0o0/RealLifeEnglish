import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const index=JSON.parse(await fs.readFile(path.join(root,'data/app/index.json'),'utf8'));
let dictionary={};
try{dictionary=JSON.parse(await fs.readFile(path.join(root,'data/app/word-dictionary.json'),'utf8'));}catch{}
for(const item of index.categories){
  const words=JSON.parse(await fs.readFile(path.join(root,'data/app',item.vocabulary),'utf8'));
  for(const word of words){
    if(/^[A-Za-z]+(?:[-'][A-Za-z]+)*$/.test(word.english)){
      const key=word.english.toLowerCase();
      if(!dictionary[key])dictionary[key]=word.chinese;
    }
  }
}
const ordered=Object.fromEntries(Object.entries(dictionary).sort(([a],[b])=>a.localeCompare(b)));
await fs.writeFile(path.join(root,'data/app/word-dictionary.json'),JSON.stringify(ordered,null,2)+'\n');
console.log('Word dictionary built:',Object.keys(ordered).length,'entries');
