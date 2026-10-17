import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../cloud.js',import.meta.url),'utf8');
function boot(saved=null){
  const nodes={},storage=new Map(),calls=[],events={};let nextId='user-a',confirmEmail=false,fail=false,expired=false,mergeCount=0;
  if(saved)storage.set('rle-auth-v1',JSON.stringify(saved));
  const node=id=>nodes[id]||(nodes[id]={value:'',hidden:false,textContent:'',reportValidity:()=>true});
  const adapter={scopeId:null,rows:[{word_key:'apples::苹果',state:'known',changed_at:123}],records(){return this.rows;},merge(rows){mergeCount++;this.rows=rows;},scope(id){this.scopeId=id;this.rows=[];},importGuest(){this.imported=true;}};
  const context={window:{addEventListener(name,fn){events[name]=fn;}},document:{getElementById:node,addEventListener(){}},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v),removeItem:key=>storage.delete(key)},confirm:()=>true,setTimeout:()=>1,clearTimeout(){},setInterval(){},fetch:async(url,options)=>{
    calls.push({url,options});
    if(fail)throw Error('offline');
    let data={};
    if(url.includes('/token')||url.includes('/signup'))data=confirmEmail?{user:{id:nextId}}:{access_token:'token-'+nextId,refresh_token:'refresh-'+nextId,expires_in:expired?-1:3600,user:{id:nextId,email:'test@example.com'}};
    else if(url.includes('/rpc/'))data=JSON.parse(options.body).changes;
    return {ok:true,status:200,text:async()=>JSON.stringify(data)};
  }};
  vm.createContext(context);vm.runInContext(source,context);context.window.Cloud.mount(adapter);
  node('auth-email').value='test@example.com';node('auth-password').value='test-password';
  return {node,storage,calls,adapter,cloud:context.window.Cloud,events,setNextId:id=>{nextId=id;},setConfirm:v=>{confirmEmail=v;},setFail:v=>{fail=v;},get mergeCount(){return mergeCount;}};
}
const a=boot();
assert.equal(a.cloud.userId(),null);assert.equal(a.node('auth-form').hidden,false);
a.setConfirm(true);await a.node('sign-up').onclick();assert.equal(a.cloud.userId(),null);assert(a.node('auth-status').textContent.includes('验证邮件'));
a.setConfirm(false);await a.node('auth-form').onsubmit({preventDefault(){}});
assert.equal(a.cloud.userId(),'user-a');assert.equal(a.adapter.scopeId,'user-a');assert(a.node('auth-form').hidden);assert.equal(a.adapter.imported,undefined);
assert.equal(a.node('auth-password').value,'');assert(!a.storage.get('rle-auth-v1').includes('test-password'));
a.adapter.rows=[{word_key:'test::测试',state:'unlearned',changed_at:456}];
await a.node('sync-now').onclick();assert.equal(a.adapter.rows[0].state,'unlearned');
assert(a.calls.at(-1).options.headers.Authorization==='Bearer token-user-a');
a.setFail(true);const count=a.mergeCount;await a.node('sync-now').onclick();assert.equal(a.mergeCount,count);assert(a.node('auth-status').textContent.includes('本机'));
a.setFail(false);a.node('import-local').onclick();assert(a.adapter.imported);
a.node('sign-out').onclick();assert.equal(a.cloud.userId(),null);assert.equal(a.adapter.scopeId,null);assert(!a.storage.has('rle-auth-v1'));
a.setNextId('user-b');a.node('auth-password').value='password-b';await a.node('auth-form').onsubmit({preventDefault(){}});assert.equal(a.adapter.scopeId,'user-b');
const b=boot({access_token:'old',refresh_token:'refresh',expires_at:0,user:{id:'user-a',email:'a@example.com'}});
await new Promise(resolve=>setImmediate(resolve));
assert(b.calls.some(c=>c.url.includes('grant_type=refresh_token')));assert.equal(b.cloud.userId(),'user-a');
console.log('Cloud: email confirmation, login, token refresh, logout/account isolation, explicit import, reset tombstones, offline retention and password non-persistence OK');
