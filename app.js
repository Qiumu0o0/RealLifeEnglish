"use strict";
const $ = id => document.getElementById(id);
const catalog = window.APP_CATALOG;
const categories = catalog.categories.slice();
const storageKey = "real-life-english-fruit-v1";
const wordForms = {apple:"apples",avocado:"avocados",banana:"bananas",lemon:"lemons",orange:"oranges",pear:"pears",cookies:"cookie",scroll:"scrolls",croquettes:"croquette",yogurt:"yoghurt","dog treat":"dog treats"};
const normalize = english => wordForms[english.trim().toLowerCase()] || english.trim().toLowerCase();
const wordKey = word => normalize(word.english)+"::"+word.chinese.trim();
function flatMap(items, transform) { return [].concat.apply([],items.map(transform)); }
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}") || {}; } catch {}
let marks = saved.marks && typeof saved.marks === "object" && !Array.isArray(saved.marks) ? {...saved.marks} : {};
let selected = saved.category || "fruit-vegetables";
let mode = saved.mode === "review" ? "review" : "all";
let customVocabulary = null, cards = [], deck = [], index = 0, flipped = false;
let renderTicket=0, loadingCard=false;
const imageCache=new Map();
function loadImage(path,callback) {
  if(!path){callback(null);return;}
  const source=window.APP_IMAGE_DATA&&window.APP_IMAGE_DATA[path]||path;
  if(typeof Image==='undefined'){callback(source);return;}
  const existing=imageCache.get(path);
  if(existing){if(existing.done)callback(existing.source);else existing.waiters.push(callback);return;}
  const entry={done:false,source:null,waiters:[callback]},image=new Image();
  imageCache.set(path,entry);
  function finish(ok){
    entry.done=true;entry.source=ok?source:null;
    const callbacks=entry.waiters.splice(0);callbacks.forEach(fn=>fn(entry.source));
    if(imageCache.size>12){for(const [key,value] of imageCache){if(key!==path&&value.done){imageCache.delete(key);break;}}}
  }
  image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=source;
}

function parseVocabulary(data) {
  if (!Array.isArray(data) || !data.length) throw Error("词库应为非空数组，每项包含 english 和 chinese。");
  const unique = new Map();
  for (const word of data) {
    if (!word || typeof word.english !== "string" || !word.english.trim() || typeof word.chinese !== "string" || !word.chinese.trim()) throw Error("每个词需要非空 english 和 chinese。");
    const key = normalize(word.english);
    if (!unique.has(key)) unique.set(key, {english:word.english.trim(),chinese:word.chinese.trim()});
  }
  return [...unique.values()];
}
function sameWords(a,b) {
  return a.length === b.length && a.every(w=>b.some(x=>normalize(x.english)===normalize(w.english)&&x.chinese===w.chinese));
}
// Keep old fruit progress, but do not let the old saved default dictionary hide new categories.
try {
  if (saved.customVocabulary) customVocabulary = parseVocabulary(saved.customVocabulary);
  else if (saved.vocabulary) {
    const previous = parseVocabulary(Array.isArray(saved.vocabulary) ? saved.vocabulary : flatMap(saved.vocabulary.products,p=>p.terms));
    if (!sameWords(previous,catalog.legacyWords)) { customVocabulary=previous; selected="imported"; }
  }
} catch {}
function setCustomCategory(words) {
  const mapped = {};
  for (const word of words) {
    const match = flatMap(categories.filter(c=>c.id!=="imported"),c=>c.words.map(w=>({category:c,word:w})))
      .find(x=>normalize(x.word.english)===normalize(word.english)&&x.word.chinese===word.chinese);
    if (match) mapped[word.english.toLowerCase()] = match.category.images[match.word.english.toLowerCase()];
  }
  const custom = {id:"imported",label:"导入词库",words,images:mapped};
  const position = categories.findIndex(c=>c.id==="imported");
  if (position < 0) categories.push(custom); else categories[position]=custom;
}
if (customVocabulary) setCustomCategory(customVocabulary);
for (const [key,value] of Object.entries(marks)) {
  if (!key.includes("::")) {
    const matches=flatMap(categories,c=>c.words).filter(w=>normalize(w.english)===normalize(key));
    for(const word of matches){const id=wordKey(word);if(value==="known"||!marks[id])marks[id]=value;}
    if(matches.length)delete marks[key];
  }
}
if (selected!=="all-categories"&&!categories.some(c=>c.id===selected)) selected="fruit-vegetables";
function rebuildCards() {
  cards=flatMap(categories,category=>category.words.map(word=>({
    ...word,key:wordKey(word),category:category.id,
    categoryLabel:category.label,image:category.images[word.english.toLowerCase()]||null
  })));
}
function fillCategories() {
  $("category").textContent="";
  for (const item of [{id:"all-categories",label:"全部分类",words:deduplicate(cards)},...categories]) {
    const option=document.createElement("option");option.value=item.id;
    option.textContent=item.label+" · "+item.words.length+" 词";$("category").append(option);
  }
  $("category").value=selected;
}
function deduplicate(items) {
  const unique=new Map();
  for(const card of items){
    if(!unique.has(card.key))unique.set(card.key,{...card});
    else {const saved=unique.get(card.key);if(!saved.categoryLabel.split(" / ").includes(card.categoryLabel))saved.categoryLabel+=" / "+card.categoryLabel;}
  }
  return [...unique.values()];
}
function currentCards() { return deduplicate(cards.filter(c=>selected==="all-categories"||c.category===selected)); }
function persist() {
  try { localStorage.setItem(storageKey,JSON.stringify({schemaVersion:2,marks,category:selected,mode,customVocabulary})); }
  catch { $("status").textContent="浏览器无法保存记录；本次仍可学习。"; }
}
function buildDeck() {
  deck=currentCards().filter(c=>marks[c.key]!=="known"&&(mode==="all"||marks[c.key]==="again"));
  index=0;flipped=false;render();renderList();
}
function render() {
  const current=currentCards(),mastered=current.filter(c=>marks[c.key]==="known").length,c=deck[index];
  const ticket=++renderTicket;
  $("count").textContent=current.length+" 个核心词";$("known").textContent="已掌握 "+mastered+" / "+current.length;
  $("progress").max=current.length||1;$("progress").value=mastered;
  $("all").classList.toggle("primary",mode==="all");$("review").classList.toggle("primary",mode==="review");
  $("position").textContent=c?(mode==="review"?"待记复习":"学习未掌握")+" · "+(index+1)+" / "+deck.length:"当前没有待学词卡";
  $("label").textContent=flipped?"中文释义":"ENGLISH";
  loadingCard=!!c;
  $("image-loading").hidden=!loadingCard;
  $("card").setAttribute("aria-busy",String(loadingCard));
  loadImage(c?c.image:null,source=>{
    if(ticket!==renderTicket)return;
    loadingCard=false;$("image-loading").hidden=true;$("card").setAttribute("aria-busy","false");
    $("word").textContent=c?(flipped?c.chinese:c.english):(current.length?"这一轮完成了":"该分类暂无词条");
    const picture=$("picture");picture.hidden=!source;
    if(source&&picture.getAttribute("src")!==source)picture.src=source;
    if(!source)picture.removeAttribute("src");
    picture.alt=c?c.chinese+"商品图片":"";
    $("image-placeholder").hidden=!!source||!c;
    for(const id of ["again","remember","card"])$(id).disabled=!c;
    for(let offset=1;offset<=3;offset++){const next=deck[index+offset];if(next)loadImage(next.image,()=>{});}
  });
  $("context").textContent=c?c.categoryLabel:(!current.length?"请选择其他分类。":"已掌握词不会重复出现，可选择其他分类继续学习。");
  $("hint").textContent=c?(flipped?"按 1 标记待记 · 按 2 标记掌握":"点击卡片查看中文 · 空格翻面"):"";
  $("card").disabled=!c||loadingCard;$("card").setAttribute("aria-label",flipped?"显示英文单词":"显示中文答案");
  for(const id of ["again","remember"])$(id).disabled=!c||loadingCard;
  $("shuffle").disabled=!c;
  $("previous").disabled=!c||index===0;$("next").disabled=!c||index===deck.length-1;
}
function move(delta) { index=Math.max(0,Math.min(deck.length-1,index+delta));flipped=false;render(); }
function mark(value) {
  const c=deck[index];if(!c||loadingCard)return;
  marks[c.key]=value;$("status").textContent=c.english+(value==="known"?" 已标记掌握。":" 已加入待记。");
  if(value==="known"){deck.splice(index,1);index=Math.min(index,Math.max(0,deck.length-1));}
  else if(index<deck.length-1)index++;
  flipped=false;persist();render();renderList();
}
function renderList() {
  const q=$("search").value.trim().toLowerCase();$("list").textContent="";
  for(const c of currentCards().filter(c=>marks[c.key]!=="known"&&(c.english+" "+c.chinese).toLowerCase().includes(q))) {
    const li=document.createElement("li");li.textContent=c.english+" → "+c.chinese;
    if(selected==="all-categories"){const detail=document.createElement("small");detail.textContent=c.categoryLabel;li.append(detail);}
    $("list").append(li);
  }
}
rebuildCards();fillCategories();buildDeck();persist();
$("category").onchange=()=>{selected=$("category").value;mode="all";$("status").textContent="";$("search").value="";buildDeck();persist();};
$("card").onclick=()=>{if(deck.length&&!loadingCard){flipped=!flipped;render();}};
$("previous").onclick=()=>move(-1);$("next").onclick=()=>move(1);
$("again").onclick=()=>mark("again");$("remember").onclick=()=>mark("known");
$("all").onclick=()=>{mode="all";buildDeck();persist();};$("review").onclick=()=>{mode="review";buildDeck();persist();};
$("shuffle").onclick=()=>{for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}index=0;flipped=false;render();};
$("reset").onclick=()=>{if(confirm("重置当前所选分类的学习进度？")){for(const c of currentCards())delete marks[c.key];persist();buildDeck();$("status").textContent="当前分类进度已重置。";}};
$("search").oninput=renderList;
$("import").onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  try {
    customVocabulary=parseVocabulary(JSON.parse((await file.text()).replace(/^\uFEFF/,"")));
    setCustomCategory(customVocabulary);selected="imported";mode="all";
    rebuildCards();fillCategories();persist();buildDeck();$("status").textContent="已导入 "+customVocabulary.length+" 个词。";
  }catch(error){$("status").textContent="导入失败："+error.message;}
  event.target.value="";
};
$("update").onclick=async()=>{
  if(window.AndroidApp&&typeof window.AndroidApp.checkUpdates==="function"){window.AndroidApp.checkUpdates();return;}
  $("update").disabled=true;$("status").textContent="正在查询最新 Android 版本…";
  try {
    const response=await fetch("https://api.github.com/repos/Qiumu0o0/RealLifeEnglish/releases/latest");
    if(!response.ok)throw Error();
    const release=await response.json(),asset=release.assets.find(a=>a.name==="RealLifeEnglish.apk");
    if(!asset||!asset.browser_download_url.startsWith("https://github.com/Qiumu0o0/RealLifeEnglish/releases/download/"))throw Error();
    $("status").textContent="最新 Android 版本 "+release.tag_name+" · ";
    const link=document.createElement("a");link.textContent="下载 APK";link.href=asset.browser_download_url;$("status").append(link);
  }catch{$("status").textContent="检查失败，请检查网络或稍后重试。";}
  finally{$("update").disabled=false;}
};
document.addEventListener("keydown",event=>{
  if(event.target.matches("input,textarea,button,select")||event.ctrlKey||event.altKey||event.metaKey)return;
  if(event.code==="Space"){event.preventDefault();if(deck.length&&!loadingCard){flipped=!flipped;render();}}
  if(event.key==="ArrowRight")move(1);if(event.key==="ArrowLeft")move(-1);
  if(event.key==="1")mark("again");if(event.key==="2")mark("known");
});
window.APP_READY=true;
