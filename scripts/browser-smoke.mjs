import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'android/app/build');
await fs.mkdir(output,{recursive:true});
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless','--disable-gpu','--disable-background-networking','--no-first-run',
  '--remote-debugging-port=0','--user-data-dir='+path.join(output,'smoke-profile-'+Date.now())
],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let socket;
try {
  const address=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Browser start timeout')),15000);
    browser.on('error',reject);
    browser.stderr.on('data',chunk=>{const match=chunk.toString().match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});
  });
  socket=new WebSocket(address);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let counter=0;const pending=new Map(),events=[];
  socket.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id){const request=pending.get(message.id);if(request){pending.delete(message.id);message.error?request.reject(Error(message.error.message)):request.resolve(message.result);}}
    else events.push(message);
  };
  function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}));});}
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  await send('Page.enable',{},sessionId);
  if(process.env.LEGACY_WEBVIEW){
    await send('Page.addScriptToEvaluateOnNewDocument',{source:'Array.prototype.flatMap=undefined;Element.prototype.replaceChildren=undefined;'},sessionId);
  }
  if(process.env.MOCK_NATIVE){
    const catalogText=await fs.readFile(path.join(root,'data/app/catalog.js'),'utf8');
    const catalog=JSON.parse(catalogText.match(/window.APP_CATALOG=(.*);/)[1]);
    const images={};
    for(const id of ['fruit-vegetables','meat-seafood']){
      const category=catalog.categories.find(c=>c.id===id),image=category.images[category.words[0].english.toLowerCase()];
      images[image]='data:image/jpeg;base64,'+(await fs.readFile(path.join(root,image))).toString('base64');
    }
    await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.testImages='+JSON.stringify(images)+';window.AndroidApp={getImageData:function(path){return window.testImages[path]||"";},checkUpdates:function(){}};'},sessionId);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
  await send('Page.navigate',{url:pathToFileURL(process.env.APP_TEST_HTML||(process.argv.includes('--apk')?path.join(root,'android/app/build/apk-startup-test.html'):path.join(root,'index.html'))).href},sessionId);
  async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
  const deadline=Date.now()+10000;
  while(!events.some(e=>e.sessionId===sessionId&&e.method==='Page.loadEventFired')){
    if(Date.now()>deadline)throw Error('Page load timeout');
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  async function waitCard(){await evaluate('new Promise(function(resolve,reject){var end=Date.now()+8000;var timer=setInterval(function(){if(document.getElementById("card").getAttribute("aria-busy")==="false"){clearInterval(timer);resolve(true);}else if(Date.now()>end){clearInterval(timer);reject(Error("Card load timeout"));}},20);})');await evaluate('document.getElementById("picture").decode()');}
  await waitCard();
  const first=await evaluate('({ready:window.APP_READY,options:document.getElementById("category").options.length,count:document.getElementById("count").textContent,width:innerWidth,scroll:document.documentElement.scrollWidth,frame:document.querySelector(".image-slot").getBoundingClientRect().height,card:document.getElementById("card").getBoundingClientRect().height})');
  if(!first.ready)throw Error('Application did not initialize');
  if(first.options!==19||first.scroll>first.width)throw Error('Mobile layout or catalog mismatch: '+JSON.stringify(first));
  const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
  await fs.writeFile(path.join(output,'mobile-smoke.png'),Buffer.from(screenshot.data,'base64'));
  await evaluate('document.getElementById("category").value="meat-seafood";document.getElementById("category").dispatchEvent(new Event("change"));');
  await waitCard();
  const second=await evaluate('({count:document.getElementById("count").textContent,word:document.getElementById("word").textContent,image:document.getElementById("picture").naturalWidth,frame:document.querySelector(".image-slot").getBoundingClientRect().height,card:document.getElementById("card").getBoundingClientRect().height})');
  if(!/^\d+ /.test(second.count)||!second.image)throw Error('Category image failed');
  if(first.frame!==second.frame||Math.abs(first.card-second.card)>1)throw Error('Card layout shifted');
  await evaluate('document.getElementById("tab-profile").click()');
  const profile=await evaluate('({hidden:document.getElementById("study-panel").hidden,update:document.getElementById("update").getBoundingClientRect().height,progress:document.getElementById("profile-progress").textContent})');
  if(!profile.hidden||!profile.update||!profile.progress.includes('已掌握'))throw Error('Profile navigation failed');
  const profileShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
  await fs.writeFile(path.join(output,'profile-smoke.png'),Buffer.from(profileShot.data,'base64'));
  await evaluate('document.getElementById("tab-words").click()');
  const vocabulary=await evaluate('({hidden:document.getElementById("words-panel").hidden,groups:document.querySelectorAll(".category-group").length,summary:document.getElementById("vocabulary-summary").textContent})');
  if(vocabulary.hidden||vocabulary.groups<1||!vocabulary.summary.includes('个词条'))throw Error('Vocabulary navigation failed');
  await evaluate('document.getElementById("tab-study").click();document.querySelector(".word-token").click()');
  const dictionary=await evaluate('({hidden:document.getElementById("dictionary-overlay").hidden,word:document.getElementById("dictionary-word").textContent,phonetic:document.getElementById("dictionary-phonetic").textContent,meaning:document.getElementById("dictionary-meaning").textContent,speak:document.getElementById("dictionary-speak").getBoundingClientRect().height})');
  if(dictionary.hidden||!dictionary.word||!dictionary.phonetic||!dictionary.meaning||!dictionary.speak)throw Error('Word dictionary failed');
  await evaluate('document.getElementById("dictionary-close").click()');
  await evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"2",bubbles:true}));document.getElementById("tab-study").click()');
  if(await evaluate('document.getElementById("word").textContent')!==second.word)throw Error('Profile shortcut changed study card');
  console.log('Real mobile browser:',JSON.stringify({first,second,profile,vocabulary,dictionary}));
  await send('Browser.close');
} finally {if(socket)socket.close();browser.kill();}
