"use strict";
const $ = id => document.getElementById(id);
const catalog = window.APP_CATALOG;
const categories = catalog.categories.slice();
const wordDictionary = catalog.wordDictionary || {};
const guestStorageKey = "real-life-english-fruit-v1";
let storageKey=guestStorageKey+(window.Cloud&&window.Cloud.userId()?":user:"+window.Cloud.userId():"");
const speechVoiceKey="real-life-english-speech-voice-v1";
let speechVoice=localStorage.getItem(speechVoiceKey)||"auto",speechVoices=[];
const autoSpeakKey="real-life-english-auto-speak-v1";
let autoSpeak=localStorage.getItem(autoSpeakKey)!=="false",lastAutoSpokenKey="";
const wordForms = {apple:"apples",avocado:"avocados",banana:"bananas",lemon:"lemons",orange:"oranges",pear:"pears",cookies:"cookie",scroll:"scrolls",croquettes:"croquette",yogurt:"yoghurt","dog treat":"dog treats"};
const normalize = english => wordForms[english.trim().toLowerCase()] || english.trim().toLowerCase();
const wordKey = word => normalize(word.english)+"::"+word.chinese.trim();
function flatMap(items, transform) { return [].concat.apply([],items.map(transform)); }
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}") || {}; } catch {}
let marks = saved.marks && typeof saved.marks === "object" && !Array.isArray(saved.marks) ? {...saved.marks} : {};
let markTimes=saved.markTimes&&typeof saved.markTimes==='object'?{...saved.markTimes}:{};
let selected = saved.category || "fruit-vegetables";
let mode = saved.mode === "review" ? "review" : "all";
let customVocabulary = null, cards = [], deck = [], index = 0, flipped = false;
let renderTicket=0, loadingCard=false;
let vocabularyFilter="all";
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
try {
  if (saved.customVocabulary) customVocabulary = parseVocabulary(saved.customVocabulary);
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
function tokenMeaning(token,card){
  const key=token.toLowerCase(),base=key.replace(/(?:ies|es|s)$/i,ending=>ending==="ies"?"y":"");
  return wordDictionary[key]||wordDictionary[base]||{chinese:"暂无独立释义；在“"+card.english+"”中表示："+card.chinese,phonetic:""};
}
function openDictionary(token,card){
  const entry=tokenMeaning(token,card);
  $("dictionary-word").textContent=token;
  $("dictionary-phonetic").textContent=entry.phonetic||"";
  $("dictionary-meaning").textContent=entry.chinese;
  $("dictionary-audio-status").textContent="";
  if(window.AndroidApp&&typeof window.AndroidApp.speechLocale==="function")showSpeechStatus(window.AndroidApp.speechLocale(speechVoice));
  $("dictionary-speak").onclick=()=>speakText(token,true);
  $("dictionary-overlay").hidden=false;
}
function speechLabel(tag){const labels={"en-AU":"澳洲英语","en-US":"美式英语","en-GB":"英式英语","en-CA":"加拿大英语"};return labels[tag]||tag||"英语";}
function showSpeechStatus(result){
  const messages={loading:"语音引擎尚未就绪，请稍后重试。",missing:"未找到英语语音包，请在系统文字转语音设置中安装。",unsupported:"当前语音引擎不支持英语。",invalid:"无法朗读该单词。"};
  if(result&&result.startsWith("fallback|")){const parts=result.split("|");$("dictionary-audio-status").textContent="所选语音不可用，已使用 "+parts.slice(3).join("|")+"（"+speechLabel(parts[2])+"）。";return;}
  if(result&&result.startsWith("ok|")){const parts=result.split("|");$("dictionary-audio-status").textContent="发音："+parts.slice(2).join("|")+"（"+speechLabel(parts[1])+"）";return;}
  $("dictionary-audio-status").textContent=messages[result]||"";
}
function speakText(word,report){
  if(window.AndroidApp&&typeof window.AndroidApp.speak==="function"){
    const result=window.AndroidApp.speak(word,speechVoice);if(report)showSpeechStatus(result);return result;
  }
  if("speechSynthesis" in window){window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(word),selected=speechVoices.find(voice=>(voice.voiceURI||voice.name)===speechVoice);if(selected){utterance.voice=selected;utterance.lang=selected.lang;}else utterance.lang="en-AU";window.speechSynthesis.speak(utterance);return;}
  if(report)$("dictionary-audio-status").textContent="当前设备不支持语音播放。";
}
function renderCardWord(card){
  const root=$("word");root.textContent="";
  if(!card){root.textContent=currentCards().length?"这一轮完成了":"该分类暂无词条";return;}
  if(flipped){root.textContent=card.chinese;return;}
  const parts=card.english.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*|[^A-Za-z]+/g)||[card.english];
  for(const part of parts){
    if(!/^[A-Za-z]/.test(part)){root.append(document.createTextNode?document.createTextNode(part):{textContent:part});continue;}
    const token=document.createElement("button");token.type="button";token.className="word-token";token.textContent=part;
    token.setAttribute("aria-label","查询 "+part+" 的释义");
    token.onclick=event=>{event.stopPropagation();openDictionary(part,card);};root.append(token);
  }
}
window.refreshProfile=()=>{
  const all=deduplicate(cards),known=all.filter(c=>marks[c.key]==="known").length;
  $("profile-progress").textContent="已掌握 "+known+" / "+all.length+" 个词（全部分类）";
};
function persist() {
  try { localStorage.setItem(storageKey,JSON.stringify({schemaVersion:3,marks,markTimes,category:selected,mode,customVocabulary})); }
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
    renderCardWord(c);
    const picture=$("picture");picture.hidden=!source;
    if(source&&picture.getAttribute("src")!==source)picture.src=source;
    if(!source)picture.removeAttribute("src");
    picture.alt=c?c.chinese+"商品图片":"";
    $("image-placeholder").hidden=!!source||!c;
    for(const id of ["again","remember","card"])$(id).disabled=!c;
    if(c&&!flipped&&autoSpeak&&lastAutoSpokenKey!==c.key){lastAutoSpokenKey=c.key;speakText(c.english,false);}
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
  marks[c.key]=value;markTimes[c.key]=Math.max(Date.now(),Number(markTimes[c.key]||0)+1);if(window.Cloud)window.Cloud.changed();$("status").textContent=c.english+(value==="known"?" 已标记掌握。":" 已加入待记。");
  if(value==="known"){deck.splice(index,1);index=Math.min(index,Math.max(0,deck.length-1));}
  else if(index<deck.length-1)index++;
  flipped=false;persist();render();renderList();if(!$("words-panel").hidden)renderVocabularyList();
}
function renderList() {
  const q=$("search").value.trim().toLowerCase();$("list").textContent="";
  for(const c of currentCards().filter(c=>marks[c.key]!=="known"&&(c.english+" "+c.chinese).toLowerCase().includes(q))) {
    const li=document.createElement("li");li.textContent=c.english+" → "+c.chinese;
    if(selected==="all-categories"){const detail=document.createElement("small");detail.textContent=c.categoryLabel;li.append(detail);}
    $("list").append(li);
  }
}
function renderVocabularyList(){
  const q=$("vocabulary-search").value.trim().toLowerCase(),groups=$("vocabulary-groups");groups.textContent="";
  let shown=0;
  for(const category of categories){
    const words=deduplicate(cards.filter(card=>card.category===category.id)).filter(card=>{
      const known=marks[card.key]==="known";
      return (vocabularyFilter==="all"||(vocabularyFilter==="known"?known:!known))&&(card.english+" "+card.chinese).toLowerCase().includes(q);
    });
    if(!words.length)continue;shown+=words.length;
    const group=document.createElement("details"),summary=document.createElement("summary"),list=document.createElement("ul");
    group.className="category-group";group.open=!!q;summary.textContent=category.label+" · "+words.length;group.append(summary);
    for(const card of words){const row=document.createElement("li"),english=document.createElement("span"),chinese=document.createElement("span");row.className="vocabulary-row";english.textContent=card.english;chinese.textContent=card.chinese+(marks[card.key]==="known"?" · 已学":" · 未学");row.append(english);row.append(chinese);list.append(row);}
    group.append(list);groups.append(group);
  }
  $("vocabulary-summary").textContent="共 "+shown+" 个词条";
  if(!shown){const empty=document.createElement("p");empty.className="empty-list";empty.textContent="没有符合条件的词条。";groups.append(empty);}
}
window.refreshVocabularyList=renderVocabularyList;
rebuildCards();fillCategories();buildDeck();persist();
function fillSpeechVoices(){
  const select=$("speech-voice");select.textContent="";const automatic=document.createElement("option");automatic.value="auto";automatic.textContent="自动选择";select.append(automatic);
  let items=[];
  if(window.AndroidApp&&typeof window.AndroidApp.englishVoices==="function"){try{items=JSON.parse(window.AndroidApp.englishVoices()).map(voice=>({...voice,id:voice.name,label:voice.name+" · "+speechLabel(voice.locale)+(voice.network?" · 在线":" · 本地")}));}catch(_){}}
  else if("speechSynthesis" in window){speechVoices=window.speechSynthesis.getVoices().filter(voice=>voice.lang.toLowerCase().startsWith("en"));items=speechVoices.map(voice=>({id:voice.voiceURI||voice.name,label:voice.name+" · "+speechLabel(voice.lang)}));}
  for(const item of items.sort((a,b)=>a.label.localeCompare(b))){const option=document.createElement("option");option.value=item.id;option.textContent=item.label;select.append(option);}
  if(items.some(item=>item.id===speechVoice))select.value=speechVoice;else {speechVoice="auto";select.value="auto";}
  $("speech-voice-status").textContent=items.length?"找到 "+items.length+" 个英语语音。":"尚未发现英语语音，请检查系统语音设置。";
}
window.refreshSpeechVoices=fillSpeechVoices;
fillSpeechVoices();if("speechSynthesis" in window)window.speechSynthesis.onvoiceschanged=fillSpeechVoices;
$("speech-voice").onchange=()=>{speechVoice=$("speech-voice").value;localStorage.setItem(speechVoiceKey,speechVoice);const option=$("speech-voice").selectedOptions&&$("speech-voice").selectedOptions[0];$("speech-voice-status").textContent="已保存："+(option?option.textContent:"自动选择");};
if(window.AndroidApp&&typeof window.AndroidApp.installSpeechData==="function"){$("install-speech").hidden=false;$("install-speech").onclick=()=>window.AndroidApp.installSpeechData();}
$("auto-speak").checked=autoSpeak;
$("auto-speak").onchange=()=>{autoSpeak=$("auto-speak").checked;localStorage.setItem(autoSpeakKey,String(autoSpeak));$("auto-speak-status").textContent=autoSpeak?"已开启：进入新卡片时自动朗读完整词组。":"已关闭自动朗读。";};
$("category").onchange=()=>{selected=$("category").value;mode="all";$("status").textContent="";$("search").value="";buildDeck();persist();};
$("card").onclick=()=>{if(deck.length&&!loadingCard){flipped=!flipped;render();}};
$("card").onkeydown=event=>{if((event.key==="Enter"||event.key===" ")&&event.target===$("card")){event.preventDefault();$("card").click();}};
$("previous").onclick=()=>move(-1);$("next").onclick=()=>move(1);
$("again").onclick=()=>mark("again");$("remember").onclick=()=>mark("known");
$("all").onclick=()=>{mode="all";buildDeck();persist();};$("review").onclick=()=>{mode="review";buildDeck();persist();};
$("shuffle").onclick=()=>{for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}index=0;flipped=false;render();};
$("reset").onclick=()=>{if(confirm("重置当前所选分类的学习进度？")){for(const c of currentCards()){marks[c.key]='unlearned';markTimes[c.key]=Math.max(Date.now(),Number(markTimes[c.key]||0)+1);}persist();if(window.Cloud)window.Cloud.changed();buildDeck();$("status").textContent="当前分类进度已重置。";}};
$("search").oninput=renderList;
for(const filter of ["all","known","unlearned"]){$("filter-"+filter).onclick=()=>{vocabularyFilter=filter;for(const item of ["all","known","unlearned"])$("filter-"+item).classList.toggle("primary",item===filter);renderVocabularyList();};}
$("vocabulary-search").oninput=renderVocabularyList;
$("dictionary-close").onclick=()=>{$("dictionary-overlay").hidden=true;};
$("dictionary-overlay").onclick=event=>{if(event.target===$("dictionary-overlay"))$("dictionary-overlay").hidden=true;};
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
  $("update").disabled=true;$("update-status").textContent="正在查询最新 Android 版本…";
  try {
    const response=await fetch("https://api.github.com/repos/Qiumu0o0/RealLifeEnglish/releases/latest");
    if(!response.ok)throw Error();
    const release=await response.json(),asset=release.assets.find(a=>a.name==="RealLifeEnglish.apk");
    if(!asset||!asset.browser_download_url.startsWith("https://github.com/Qiumu0o0/RealLifeEnglish/releases/download/"))throw Error();
    $("update-status").textContent="最新 Android 版本 "+release.tag_name+" · ";
    const link=document.createElement("a");link.textContent="下载 APK";link.href=asset.browser_download_url;$("update-status").append(link);
  }catch{$("update-status").textContent="检查失败，请检查网络或稍后重试。";}
  finally{$("update").disabled=false;}
};
document.addEventListener("keydown",event=>{
  if($("study-panel").hidden)return;
  if(event.target.matches("input,textarea,button,select")||event.ctrlKey||event.altKey||event.metaKey)return;
  if(event.code==="Space"){event.preventDefault();if(deck.length&&!loadingCard){flipped=!flipped;render();}}
  if(event.key==="ArrowRight")move(1);if(event.key==="ArrowLeft")move(-1);
  if(event.key==="1")mark("again");if(event.key==="2")mark("known");
});
window.APP_READY=true;
if(window.Cloud)window.Cloud.mount({
  records:()=>Object.keys(marks).filter(key=>key.includes('::')&&['known','again','unlearned'].includes(marks[key])).map(key=>({word_key:key,state:marks[key],changed_at:Number(markTimes[key]||0)})),
  merge(rows){
    let changed=false;
    for(const row of rows){
      if(!row||typeof row.word_key!=='string'||!['known','again','unlearned'].includes(row.state)||!Number.isSafeInteger(row.changed_at)||row.changed_at<0)continue;
      if(row.changed_at>=Number(markTimes[row.word_key]||0)){
        if(marks[row.word_key]!==row.state)changed=true;
        marks[row.word_key]=row.state;markTimes[row.word_key]=row.changed_at;
      }
    }
    persist();if(changed)buildDeck();window.refreshProfile();if(!$("words-panel").hidden)renderVocabularyList();
  },
  scope(userId){
    persist();storageKey=guestStorageKey+(userId?':user:'+userId:'');
    let data={};try{data=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch(_){}
    marks=data.marks&&typeof data.marks==='object'&&!Array.isArray(data.marks)?{...data.marks}:{};
    markTimes=data.markTimes&&typeof data.markTimes==='object'?{...data.markTimes}:{};
    $("status").textContent='';persist();buildDeck();window.refreshProfile();
  },
  importGuest(){
    let data={};try{data=JSON.parse(localStorage.getItem(guestStorageKey)||'{}')||{};}catch(_){}
    for(const key of Object.keys(data.marks||{})){
      if(!key.includes('::')||!['known','again','unlearned'].includes(data.marks[key]))continue;
      if(marks[key]===undefined){marks[key]=data.marks[key];markTimes[key]=Number(data.markTimes&&data.markTimes[key]||0);}
    }
    persist();buildDeck();window.refreshProfile();
  }
});
