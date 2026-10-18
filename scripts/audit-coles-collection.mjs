import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const base=path.join(root,'data/collected');
const index=JSON.parse(await fs.readFile(path.join(root,'data/index.json'),'utf8'));
const summary=[],all=[];
for(const category of index.categories){
  const dir=path.join(base,category.category),pages=[];
  for(const file of (await fs.readdir(dir)).filter(f=>/^page-.*\.json$/.test(f)).sort()){
    const record=JSON.parse(await fs.readFile(path.join(dir,file),'utf8'));
    if(record.category!==category.category||!Array.isArray(record.products))throw Error('Invalid page: '+file);
    pages.push({...record,file});
  }
  const readable=pages.filter(p=>p.products.length),expected=Math.max(0,...pages.map(p=>p.reported_pages||0));
  const readableNumbers=new Set(readable.map(p=>p.page));
  const missing=Array.from({length:expected},(_,i)=>i+1).filter(p=>!readableNumbers.has(p));
  const products=new Map();
  for(const page of readable)for(const product of page.products){
    if(!product.product_name||!product.pack_size)throw Error('Incomplete product: '+page.file);
    const key=product.product_name+'|'+product.pack_size;
    if(!products.has(key))products.set(key,{...product,source_pages:[]});
    const entry=products.get(key);if(!entry.source_pages.includes(page.source_url))entry.source_pages.push(page.source_url);
  }
  const rows=[...products.values()];
  await fs.writeFile(path.join(dir,'products.json'),JSON.stringify(rows,null,2)+'\n');
  all.push(...rows.map(p=>({category:category.category,...p})));
  summary.push({category:category.category,chinese:category.chinese,attempted_snapshots:pages.length,expected_pages:expected,readable_pages:readableNumbers.size,missing_pages:missing,observed_rows:readable.reduce((n,p)=>n+p.products.length,0),unique_products:rows.length,reported_totals:[...new Set(readable.map(p=>p.reported_total).filter(Boolean))].sort((a,b)=>a-b),complete:false,note:expected?'Text snapshots only; different crawl dates and totals, possible overlaps/gaps even when every page is readable.':'No product listing or page count returned; not evidence that the category has no products.'});
}
const report={checked_at:'2026-10-18',method:'web.run public text snapshots',complete:false,scope:'All page numbers advertised by the observed category snapshots were attempted, without a per-category product or word cap. This is not a live or complete Coles catalog.',attempted_snapshots:summary.reduce((n,c)=>n+c.attempted_snapshots,0),readable_pages:summary.reduce((n,c)=>n+c.readable_pages,0),observed_rows:summary.reduce((n,c)=>n+c.observed_rows,0),unique_category_products:all.length,categories:summary};
await fs.writeFile(path.join(base,'coverage.json'),JSON.stringify(report,null,2)+'\n');
await fs.writeFile(path.join(base,'products.json'),JSON.stringify(all,null,2)+'\n');
const table=summary.map(c=>`| ${c.chinese} | ${c.expected_pages||'未知'} | ${c.readable_pages} | ${c.unique_products} | ${c.missing_pages.join(', ')|| (c.expected_pages?'—':'未返回商品')} |`).join('\n');
await fs.writeFile(path.join(base,'README.md'),`# Coles 分页采集\n\n本次通过 web.run 实际检查 ${report.attempted_snapshots} 个分页快照，读到 ${report.observed_rows} 条商品记录；在每个分类中按名称和规格去重后共 ${all.length} 条。没有每类 20 词或每类 48 商品的截断。\n\n这不是实时全量库存：分页快照日期、商品总数和排序会变化；部分页没有返回商品。即使页码全部可读，也不能证明某一时刻的全部商品已覆盖。空结果不代表该分类没有商品。\n\n## 分类覆盖\n\n| 分类 | 页面声明页数 | 可读页数 | 分类内去重商品 | 缺失页码 |\n| --- | ---: | ---: | ---: | --- |\n${table}\n\n## 文件\n\n- 每类 page-*.json：实际读取的商品名称、规格、页码、来源 URL、页面声明总数；空页也保留。\n- 每类 products.json：分类内去重后的商品清单。\n- products.json：所有分类的商品清单，保留来源页；跨分类不合并。\n- coverage.json：机器可读的覆盖情况与缺失页码。\n- [核心词与图片处理说明](TERMS.md)：双语候选、词形差异、已解析商品链接与下载图片；数量见 [terms-summary.json](terms-summary.json)。\n\n## 与 APP 词库的区别\n\n这里保存的是原始商品事实，不是已审核的英语词卡。完整商品名可能包含品牌、口味和规格，不能直接当成核心单词。中文释义、单复数合并以及对应图片仍需核对后才能接入 APP；现有 APP 词库没有被原始清单覆盖。\n\n## 可复查来源\n\n- [Coles browse](https://www.coles.com.au/browse)\n- [果蔬第 2 页](https://www.coles.com.au/browse/fruit-vegetables?page=2)\n- [国际食品可读入口](https://www.coles.com.au/browse/pantry/international-foods)\n- [宠物可读入口](https://www.coles.com.au/browse/pet?sortBy=recommendedDescending)\n\n运行 node scripts/audit-coles-collection.mjs 可重新生成汇总；该脚本只整理已采集数据，不声称能直接绕过网站防护。\n`);
console.log(JSON.stringify({snapshots:report.attempted_snapshots,readablePages:report.readable_pages,observedRows:report.observed_rows,uniqueCategoryProducts:all.length}));
