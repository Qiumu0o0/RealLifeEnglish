import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),base=path.join(root,'data/collected');
const byProduct=new Map();
for(const file of (await fs.readdir(path.join(base,'links'))).filter(f=>/^batch-\d+\.json$/.test(f)).sort()){
  for(const item of JSON.parse(await fs.readFile(path.join(base,'links',file),'utf8'))){
    const key=item.category+'|'+item.product_name+'|'+item.pack_size;
    if(!byProduct.has(key)||item.product_id)byProduct.set(key,item);
  }
}
const links=[...byProduct.values()];
const terms=JSON.parse(await fs.readFile(path.join(base,'term-candidates.json'),'utf8'));
let results=[];try{results=JSON.parse(await fs.readFile(path.join(base,'image-download-results.json'),'utf8'));}catch{}
const manifest=new Map();
for(const product of links){
  if(!product.product_id||!/^\d+$/.test(product.product_id))continue;
  const id=product.product_id;
  if(!manifest.has(id))manifest.set(id,{
    category:'collected',english:product.english,product_name:product.product_name,pack_size:product.pack_size,
    product_url:product.product_url,product_id:id,image:'images/'+id+'.jpg',
    image_candidates:[`https://shop.coles.com.au/wcsstore/Coles-CAS/images/${id.slice(0,3).split('').join('/')}/${id}-zm.jpg`,`https://cdn.productimages.coles.com.au/productimages/${id[0]}/${id}.jpg`]
  });
}
for(const term of terms){
  const link=links.find(p=>p.category===term.category&&p.product_name===term.product_name&&p.pack_size===term.pack_size);
  term.product_url=link&&link.product_url||null;
  term.product_id=link&&link.product_id||null;
  const image=results.find(r=>r.product_id===term.product_id&&r.status==='downloaded');
  term.image=image?image.image:null;term.image_url=image?image.image_url:null;
  term.image_status=image?'downloaded':term.product_id?'pending_or_failed':'product_link_not_resolved';
}
await fs.writeFile(path.join(base,'image-downloads.json'),JSON.stringify([...manifest.values()],null,2)+'\n');
await fs.writeFile(path.join(base,'product-links.json'),JSON.stringify(links,null,2)+'\n');
await fs.writeFile(path.join(base,'term-candidates.json'),JSON.stringify(terms,null,2)+'\n');
const summary={candidates:terms.length,representative_products:links.length,resolved_products:links.filter(p=>p.product_id).length,unique_image_targets:manifest.size,downloaded_images:results.filter(r=>r.status==='downloaded').length,candidates_with_images:terms.filter(t=>t.image).length,pending_review:terms.filter(t=>t.review_status==='candidate').length,integrated_into_app:false};
await fs.writeFile(path.join(base,'terms-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
