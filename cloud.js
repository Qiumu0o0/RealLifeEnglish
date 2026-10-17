/* Public project settings only. Never put a secret/service-role key here. */
(function () {
  'use strict';
  const url='https://zlcgkmjlswfkfjzlbknk.supabase.co';
  const key='sb_publishable_XNRA-5nquTYkwZOzJqGbgA_h5jD2dg0';
  const sessionKey='rle-auth-v1';
  let session=null,app=null,epoch=0,busy=false,queued=false,timer=null,refreshing=null;
  try { session=JSON.parse(localStorage.getItem(sessionKey)||'null'); } catch (_) {}
  if(!session||!session.user||!session.user.id||!session.refresh_token)session=null;
  const $=id=>document.getElementById(id);
  function message(text){$('auth-status').textContent=text;}
  function draw(){
    $('account-name').textContent=session?'已登录：'+session.user.email:'当前使用：本地用户（未登录）';
    $('auth-form').hidden=!!session;$('account-actions').hidden=!session;
  }
  function saveSession(next){
    // Refuse login if credentials cannot be stored; do not silently mix account scopes.
    if(next)localStorage.setItem(sessionKey,JSON.stringify(next));else localStorage.removeItem(sessionKey);
    session=next;
  }
  async function request(path,body,token){
    const controller=typeof AbortController!=='undefined'?new AbortController():null;
    const timeout=setTimeout(()=>{if(controller)controller.abort();},15000);
    try {
      const options={method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body)};
      if(token)options.headers.Authorization='Bearer '+token;
      if(controller)options.signal=controller.signal;
      const response=await fetch(url+path,options);
      const text=await response.text();let data={};try{data=text?JSON.parse(text):{};}catch(_){}
      if(!response.ok){
        const error=Error(data.msg||data.message||data.error_description||'请求失败');error.status=response.status;error.code=data.code;throw error;
      }
      return data;
    } finally {clearTimeout(timeout);}
  }
  function makeSession(data){
    if(!data.access_token||!data.refresh_token||!data.user||!data.user.id)throw Error('登录响应无效');
    return {access_token:data.access_token,refresh_token:data.refresh_token,user:{id:data.user.id,email:data.user.email},expires_at:Date.now()+Number(data.expires_in||3600)*1000};
  }
  async function token(){
    if(!session)throw Error('请先登录');
    if(session.expires_at>Date.now()+60000)return session.access_token;
    if(!refreshing){
      const generation=epoch;
      refreshing=request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(data=>{
        if(generation!==epoch)throw Error('账号已切换');
        const next=makeSession(data);if(next.user.id!==session.user.id)throw Error('账号不匹配');
        saveSession(next);return next.access_token;
      }).finally(()=>{refreshing=null;});
    }
    return refreshing;
  }
  async function sync(){
    if(!session||!app)return;
    if(busy){queued=true;return;}
    busy=true;const generation=epoch;message('正在同步…');
    try {
      const access=await token();if(generation!==epoch)return;
      const rows=await request('/rest/v1/rpc/sync_progress',{changes:app.records()},access);
      if(generation!==epoch)return;
      if(!Array.isArray(rows))throw Error('同步响应无效');
      app.merge(rows);message('已同步 · '+new Date().toLocaleTimeString());
    }catch(error){
      if(generation===epoch)message(error.code==='PGRST202'||error.code==='42P01'?'云端尚未初始化，请先执行 supabase/setup.sql。':error.status===401||error.status===400?'登录已过期或配置有误，请退出后重新登录。':'同步失败，进度已保存在本机；联网后可重试。');
    }finally{busy=false;if((queued||generation!==epoch)&&session){queued=false;schedule();}}
  }
  function schedule(){if(!session)return;clearTimeout(timer);timer=setTimeout(sync,1200);}
  async function authenticate(signup){
    const form=$('auth-form');if(!form.reportValidity())return;
    const email=$('auth-email').value.trim(),password=$('auth-password').value;
    if(signup&&password.length<8){message('注册密码至少 8 位。');return;}
    $('sign-in').disabled=true;$('sign-up').disabled=true;
    const generation=epoch;message(signup?'正在注册…':'正在登录…');
    try {
      const path=signup?'/auth/v1/signup?redirect_to='+encodeURIComponent('https://qiumu0o0.github.io/RealLifeEnglish/'):'/auth/v1/token?grant_type=password';
      const data=await request(path,{email,password});
      if(generation!==epoch)return;
      if(!data.access_token){message('请查收验证邮件，验证后回到网页或 APP 登录。');return;}
      const next=makeSession(data);saveSession(next);epoch++;app.scope(next.user.id);draw();await sync();
    }catch(error){message(error.status===429?'请求过于频繁，请稍后重试。':error.status?'注册或登录失败：'+error.message:'无法连接或保存登录，请检查网络和存储权限。');}
    finally{$('auth-password').value='';$('sign-in').disabled=false;$('sign-up').disabled=false;}
  }
  window.Cloud={
    userId:()=>session?session.user.id:null,
    changed:schedule,
    mount(adapter){
      app=adapter;draw();
      $('auth-form').onsubmit=event=>{event.preventDefault();return authenticate(false);};
      $('sign-up').onclick=()=>authenticate(true);
      $('sync-now').onclick=sync;
      $('import-local').onclick=()=>{if(confirm('将此设备未登录时的学习记录合并到当前账号？')){app.importGuest();schedule();}};
      $('sign-out').onclick=()=>{
        const old=session;if(!old)return;
        try{saveSession(null);}catch(_){message('无法清除登录信息，请检查存储权限。');return;}
        epoch++;clearTimeout(timer);app.scope(null);draw();message('已退出，未登录记录和账号记录分别保留在本机。');
        request('/auth/v1/logout?scope=local',{},old.access_token).catch(()=>{});
      };
      window.addEventListener('online',sync);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
      setInterval(sync,60000);
      if(session)sync();
    }
  };
}());
