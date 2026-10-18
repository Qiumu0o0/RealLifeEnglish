import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),base=path.join(root,'data/collected');
const source=JSON.parse(await fs.readFile(path.join(base,'products.json'),'utf8'));
const lines=(await fs.readFile(path.join(base,'term-translations.tsv'),'utf8')).split(/\r?\n/).filter(l=>l&&!l.startsWith('#'));
const output=[],notFound=[],formDifferences=[],rejected=[];
function forms(term){
  const forms=[term];
  if(/ies$/i.test(term))forms.push(term.slice(0,-3)+'y');
  else if(/(?:oes|ches|shes|xes)$/i.test(term))forms.push(term.slice(0,-2));
  else if(/s$/i.test(term)&&!/(?:ss|asparagus|couscous|hummus|citrus)$/i.test(term))forms.push(term.slice(0,-1));
  else if(/y$/i.test(term)&&!/[aeiou]y$/i.test(term))forms.push(term.slice(0,-1)+'ies');
  else forms.push(term+'s');
  return forms;
}
for(const line of lines){
  const [category,term,chinese]=line.split('\t');
  if(!category||!term||!chinese)throw Error('Invalid translation row: '+line);
  const alternatives=forms(term),matches=[],observed=new Set();
  const patterns=alternatives.map(form=>new RegExp('\\b'+form.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i'));
  for(const product of source.filter(p=>p.category===category)){
    const hit=patterns.map(p=>p.exec(product.product_name)).find(Boolean);
    const wrongMeaning=hit&&(
      (term==='Cherries'&&/tomato/i.test(product.product_name))||
      (term==='Peaches'&&/bouquet|chrysanthemum|flowers/i.test(product.product_name))||
      (term==='Oysters'&&/oyster blade|sauce/i.test(product.product_name))||
      (term==='Duck'&&(/duck fat/i.test(product.product_name)||!patterns.some(p=>p.test(product.product_name.replace(/luv a duck/ig,'')))))||
      (term==='Sirloin'&&/pork/i.test(product.product_name))||
      (term==='Pads'&&/cotton|cleansing|make.?up|facial|remover|blister|heel|incontinence|bladder|nursing|breast/i.test(product.product_name))
    );
    if(wrongMeaning){rejected.push({category,term,product_name:product.product_name,reason:'Compound or product context does not support the proposed meaning'});continue;}
    if(hit){observed.add(hit[0].toLowerCase());matches.push(product);}
  }
  if(!matches.length){notFound.push({category,term});continue;}
  function score(product){
    const hit=patterns.map(p=>p.exec(product.product_name)).find(Boolean);
    const tail=product.product_name.slice(hit.index+hit[0].length).trim().split(/\s+/).filter(Boolean).length;
    const prepared=/salad|sauce|juice|flavou?r|paste|seasoning|\bwith\b/i.test(product.product_name)&&!/salad|sauce|juice|paste|seasoning/i.test(term);
    return tail*3+(prepared?50:0)+(hit[0].toLowerCase()===term.toLowerCase()?0:5);
  }
  matches.sort((a,b)=>score(a)-score(b));
  const first=matches[0],actual=patterns.map(p=>p.exec(first.product_name)).find(Boolean)[0];
  output.push({category,english:actual,chinese,core_term:term,product_name:first.product_name,pack_size:first.pack_size,source_pages:first.source_pages,matching_products:matches.length,review_status:'candidate',image_status:'not_resolved'});
  if(observed.size>1)formDifferences.push({category,retained:actual,observed_forms:[...observed]});
}
// Candidates remain separate: words in flavours/ingredients are not necessarily the product itself.
await fs.writeFile(path.join(base,'term-candidates.json'),JSON.stringify(output,null,2)+'\n');
await fs.writeFile(path.join(base,'term-form-differences.json'),JSON.stringify(formDifferences,null,2)+'\n');
await fs.writeFile(path.join(base,'unobserved-terms.json'),JSON.stringify(notFound,null,2)+'\n');
await fs.writeFile(path.join(base,'rejected-term-matches.json'),JSON.stringify(rejected,null,2)+'\n');
console.log(JSON.stringify({translationPatterns:lines.length,observedCandidates:output.length,formDifferences:formDifferences.length,unobservedPatterns:notFound.length}));
