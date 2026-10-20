import {SEED} from './seed.js';
import {extractBooks,readPdfItems} from './extract.js';
import {mergeState,pull,push} from './sync.js';
import {FIREBASE_DB_URL,DATA_PATH,firebaseReady} from './config.js';
import {initAuth,onUser,currentUser,signIn,signOutUser,idToken} from './auth.js';

const $=s=>document.querySelector(s);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const now=()=>Date.now();
const hid=(...a)=>{let h1=0x811c9dc5,h2=5381;const s=a.join('\u0001').toLowerCase();for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,16777619)>>>0;h2=(Math.imul(h2,33)+c)>>>0;}return 'k'+h1.toString(36)+h2.toString(36);};
const pad=n=>String(n).padStart(2,'0');
const dkey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MEDAL=[{e:'⭐',n:'도장 찍기'},{e:'🥉',n:'동메달'},{e:'🥈',n:'은메달'},{e:'🥇',n:'금메달'}];
const CHEER=['','우와! 동메달! 🐠','대단해! 은메달! 🐬','최고야! 금메달! 🐳'];

// ---------- 상태 ----------
let S=JSON.parse(localStorage.getItem('wb_state')||'null');
localStorage.removeItem('wb_cfg');
if(!S){S={books:{},cats:{},events:{}};seedImport(SEED);}
let sel=localStorage.getItem('wb_sel')||'';
let calMonth=new Date();calMonth.setDate(1);
function save(){localStorage.setItem('wb_state',JSON.stringify(S));scheduleSync();}
function liveCats(){return Object.values(S.cats).filter(c=>!c.del).sort((a,b)=>(a.o||0)-(b.o||0));}
function liveBooks(){return Object.values(S.books).filter(b=>!b.del&&S.cats[b.c]&&!S.cats[b.c].del);}
function majors(){const m=[];for(const c of liveCats())if(!m.includes(c.major))m.push(c.major);return m;}
function catFor(major,minor){let c=liveCats().find(c=>c.major===major&&c.minor===minor);
  if(!c){c={id:hid('c',major,minor),major,minor,o:now()+Object.keys(S.cats).length,u:S.cats[hid('c',major,minor)]?now():0};S.cats[c.id]=c;}return c;}
function seedImport(list){let o=1;for(const b of list){const c=catFor(b.major,b.minor);const id=hid('b',b.major,b.minor,b.title);if(S.books[id]&&!S.books[id].del)continue;S.books[id]={id,c:c.id,title:b.title,author:b.author||'',m:0,o:o++,u:S.books[id]?now():0};}}

// ---------- 화면 ----------
function render(){renderSide();renderContent();renderScore();if(!$('#vAtt').classList.contains('hidden'))renderAtt();}
function renderScore(){const bs=liveBooks();const c=[0,0,0,0];bs.forEach(b=>c[b.m||0]++);
  $('#score').textContent=`🥇${c[3]} 🥈${c[2]} 🥉${c[1]}`;}
function renderSide(){const ms=majors();if(!ms.includes(sel))sel=ms[0]||'';
  $('#majors').innerHTML=ms.map((m,i)=>{const bs=liveBooks().filter(b=>S.cats[b.c].major===m);const d=bs.filter(b=>b.m>0).length;
   return `<button class="major ${m===sel?'on':''}" data-m="${esc(m)}">${['🐳','🦈','🐙','🐢','🐬','🦀','🐠','🦑'][i%8]} ${esc(m)}<span class="n">${d}/${bs.length}</span></button>`}).join('');}
function renderContent(){
  const el=$('#content');if(!sel){el.innerHTML=`<div class="empty">🐳<br>아직 책이 없어요!<br>왼쪽에서 PDF를 불러오거나 대분류를 추가해 주세요.</div>`;return;}
  const cats=liveCats().filter(c=>c.major===sel);const bs=liveBooks().filter(b=>S.cats[b.c].major===sel);
  const done=bs.filter(b=>b.m>0).length;const pct=bs.length?Math.round(done/bs.length*100):0;
  let h=`<div class="mhead"><h2>${esc(sel)}</h2><div class="prog"><i style="width:${pct}%"></i><b>🐟 ${done} / ${bs.length}권</b></div>
   <button class="btn" data-act="renMajor">✏️ 이름</button><button class="btn" data-act="addMinor">＋ 중분류</button><button class="btn danger" data-act="delMajor">🗑️</button></div>`;
  for(const c of cats){const rows=bs.filter(b=>b.c===c.id).sort((a,b)=>a.o-b.o);
    h+=`<div class="group"><div class="ghead"><span class="t">🌊 ${esc(c.minor)} <span class="small">${rows.filter(b=>b.m>0).length}/${rows.length}</span></span>
     <button class="btn" data-act="addBook" data-c="${c.id}">＋ 책</button><button class="btn" data-act="renMinor" data-c="${c.id}">✏️</button><button class="btn danger" data-act="delMinor" data-c="${c.id}">🗑️</button></div>
     <table><thead><tr><th>책명</th><th class="au">저자</th><th class="st">스탬프</th><th></th></tr></thead><tbody>`+
     (rows.length?rows.map(b=>`<tr class="done${b.m||0}"><td class="title">${esc(b.title)}<span class="au2">${esc(b.author)}</span></td><td class="au">${esc(b.author)}</td>
       <td class="st"><button class="stamp m${b.m||0}" data-stamp="${b.id}" aria-label="스탬프"><span class="e">${MEDAL[b.m||0].e}</span>${b.m?'':'<small>꾹!</small>'}</button></td>
       <td class="ed"><button data-act="editBook" data-b="${b.id}" aria-label="수정">✏️</button></td></tr>`).join(''):`<tr><td colspan="4" style="color:#8ab">책을 추가해 주세요 🐚</td></tr>`)+`</tbody></table></div>`;}
  el.innerHTML=h;
}

// ---------- 스탬프 ----------
function stamp(id,btn){const b=S.books[id];const prev=b.m||0;const m=(prev+1)%4;b.m=m;b.u=now();
  const t=new Date();const eid=uid();S.events[eid]={b:id,m,t:t.getTime(),d:dkey(t),title:b.title};
  save();render();
  const nb=document.querySelector(`[data-stamp="${id}"]`);if(nb&&m)nb.classList.add('pop');
  if(m)celebrate(m,nb||btn);else{toast('도장을 다시 처음부터! 🫧');sound(0);}
}
function celebrate(m,origin){
  const fx=$('#fx');const r=origin?origin.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0,height:0};
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  const items=[['🫧','🐟','⭐'],['🫧','🐠','🐟','✨','🐚'],['🫧','🐬','🐠','✨','💎','🐚'],['🐳','🦈','🐠','🐬','⭐','✨','🫧','💛','🐙']][m];
  const n=[0,24,40,70][m];
  for(let i=0;i<n;i++){const s=document.createElement('div');s.className='conf';s.textContent=items[i%items.length];
    const a=Math.random()*Math.PI*2,d=150+Math.random()*(m*180);s.style.left=cx+'px';s.style.top=cy+'px';
    s.style.setProperty('--dx',Math.cos(a)*d+'px');s.style.setProperty('--dy',(Math.sin(a)*d-80+Math.random()*300)+'px');s.style.setProperty('--r',(Math.random()*720-360)+'deg');
    s.style.animationDelay=Math.random()*.3+'s';fx.appendChild(s);setTimeout(()=>s.remove(),3000);}
  const big=document.createElement('div');big.className='bigmedal';big.innerHTML=`<div class="m">${MEDAL[m].e}</div><div class="w">${CHEER[m]}</div>`;fx.appendChild(big);setTimeout(()=>big.remove(),2300);
  if(m>=2){const d=document.createElement('div');d.className='dash';d.textContent=m===3?'🐋':'🦈';d.style.transform='scaleX(-1)';fx.appendChild(d);setTimeout(()=>d.remove(),2300);}
  if(navigator.vibrate)navigator.vibrate(m===3?[60,40,60,40,120]:[50]);
  sound(m);
}
let ac;function sound(m){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();const notes=[[300,200],[523,659,784],[523,659,784,1047],[523,659,784,1047,1319,1568]][m];
  notes.forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.value=f;const t=ac.currentTime+i*.11;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.3,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.35);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.4);});}catch(e){}}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),2200);}

// ---------- 출석부 ----------
function renderAtt(){
  const y=calMonth.getFullYear(),mo=calMonth.getMonth();const prefix=`${y}-${pad(mo+1)}`;
  const ev=Object.values(S.events).filter(e=>e.m>0&&e.d.startsWith(prefix));
  const byDay={};ev.forEach(e=>{(byDay[e.d]=byDay[e.d]||[]).push(e)});
  const days=Object.keys(byDay).length;const medals=[0,0,0,0];ev.forEach(e=>medals[e.m]++);
  const first=new Date(y,mo,1).getDay(),last=new Date(y,mo+1,0).getDate();const today=dkey(new Date());
  let g='<div class="grid">'+'일월화수목금토'.split('').map(d=>`<div class="dow">${d}</div>`).join('');
  for(let i=0;i<first;i++)g+='<div class="day blank"></div>';
  for(let d=1;d<=last;d++){const k=`${prefix}-${pad(d)}`;const e=byDay[k];
    g+=`<div class="day ${e?'on':''} ${k===today?'today':''}" data-day="${k}"><span class="dn">${d}</span>${e?`<span class="ic">${e.length>=3?'🐳':'🦈'}</span><span class="cnt">${e.length}권</span>`:''}</div>`;}
  g+='</div>';
  $('#att').innerHTML=`<div class="cal"><div class="calh"><button data-cal="-1">◀</button><span>🗓️ ${y}년 ${mo+1}월 출석부</span><button data-cal="1">▶</button></div>
   <div class="sum"><div>출석한 날<b>${days}일</b></div><div>이번 달 읽은 책<b>${ev.length}권</b></div><div>메달<b style="font-size:24px">🥇${medals[3]} 🥈${medals[2]} 🥉${medals[1]}</b></div></div>${g}
   <div class="daylist" id="daylist"><p class="help" style="color:#557">날짜를 누르면 그날 읽은 책이 보여요. (메달을 올릴 때마다 1권으로 셉니다)</p></div></div>`;
}
function showDay(k){const ev=Object.values(S.events).filter(e=>e.m>0&&e.d===k).sort((a,b)=>a.t-b.t);
  $('#daylist').innerHTML=`<h3 style="font-family:Jua;font-weight:normal">📖 ${k} — ${ev.length}권</h3>`+(ev.length?ev.map(e=>`<div>${MEDAL[e.m].e} ${esc(S.books[e.b]?.title||e.title)} <span style="color:#89a">${new Date(e.t).toTimeString().slice(0,5)}</span></div>`).join(''):'<div>이 날은 기록이 없어요 🫧</div>');}

// ---------- 모달 ----------
function modal(html,onSubmit){$('#modalCard').innerHTML=html;$('#modal').classList.remove('hidden');
  const f=$('#modalCard').querySelector('form');if(f)f.onsubmit=e=>{e.preventDefault();if(onSubmit(new FormData(f))!==false)closeModal();};
  $('#modalCard').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);}
function closeModal(){$('#modal').classList.add('hidden');}
function ask(title,label,val,cb){modal(`<form><h3>${title}</h3><label>${label}</label><input name="v" value="${esc(val)}" required autofocus><div class="row"><button type="button" class="btn" data-close>취소</button><button class="btn primary">저장</button></div></form>`,fd=>{const v=String(fd.get('v')).trim();if(v)cb(v);});}
function confirmBox(msg,cb){modal(`<h3>🤔 확인</h3><p>${msg}</p><div class="row"><button class="btn" data-close>취소</button><button class="btn danger" id="okBtn">삭제</button></div>`);$('#okBtn').onclick=()=>{cb();closeModal();};}
function bookForm(b,catId){const cats=liveCats();
  modal(`<form><h3>${b?'✏️ 책 수정':'📘 책 추가'}</h3><label>책명</label><input name="title" required value="${esc(b?.title)}">
  <label>저자 (없으면 출판사)</label><input name="author" value="${esc(b?.author)}">
  <label>분류</label><select name="c">${cats.map(c=>`<option value="${c.id}" ${c.id===(b?.c||catId)?'selected':''}>${esc(c.major)} › ${esc(c.minor)}</option>`).join('')}</select>
  ${b?`<label>메달</label><select name="m">${MEDAL.map((x,i)=>`<option value="${i}" ${i===(b.m||0)?'selected':''}>${x.e} ${i?x.n:'없음'}</option>`).join('')}</select>`:''}
  <div class="row">${b?'<button type="button" class="btn danger" id="delB">🗑️ 삭제</button>':''}<button type="button" class="btn" data-close>취소</button><button class="btn primary">저장</button></div></form>`,
  fd=>{const o={title:String(fd.get('title')).trim(),author:String(fd.get('author')).trim(),c:fd.get('c')};if(!o.title)return false;
    if(b){Object.assign(b,o,{m:+fd.get('m'),u:now()});}else{const id=uid();S.books[id]={id,...o,m:0,o:now(),u:now()};}save();render();toast('저장했어요 🐬');});
  if(b)$('#delB').onclick=()=>{confirmBox(`"${esc(b.title)}" 책을 지울까요?`,()=>{b.del=1;b.u=now();save();render();});};}

// ---------- PDF ----------
let pdfjs;async function loadPdfjs(){if(!pdfjs){pdfjs=await import('./pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./pdf.worker.min.mjs',location.href).href;}return pdfjs;}
async function importFiles(files){
  for(const f of files){toast('📄 PDF 읽는 중...');
    try{const lib=await loadPdfjs();const pages=await readPdfItems(lib,new Uint8Array(await f.arrayBuffer()));
      const list=extractBooks(pages,f.name);previewImport(list,f.name);}catch(e){console.error(e);toast('PDF를 읽지 못했어요 😢');}}
}
function previewImport(list,fname){
  const major=list[0]?.major||fname.replace(/\.pdf$/i,'');
  modal(`<form><h3>📄 PDF에서 ${list.length}권 찾았어요</h3>
   <label>대분류 이름</label><input name="major" value="${esc(major)}" required>
   <p class="help">확인 후 틀린 곳은 고쳐 주세요. 체크를 끄면 가져오지 않아요.</p>
   <table class="prev"><thead><tr><th></th><th>중분류</th><th>책명</th><th>저자</th></tr></thead><tbody>
   ${list.map((b,i)=>`<tr><td><input type="checkbox" name="ok${i}" checked style="width:24px;height:24px"></td><td><input name="mi${i}" value="${esc(b.minor)}"></td><td><input name="t${i}" value="${esc(b.title)}"></td><td><input name="a${i}" value="${esc(b.author)}"></td></tr>`).join('')}
   </tbody></table>${list.length?'':'<p>책을 찾지 못했어요. 직접 추가해 주세요.</p>'}
   <div class="row"><button type="button" class="btn" data-close>취소</button><button class="btn primary">가져오기</button></div></form>`,
  fd=>{const mj=String(fd.get('major')).trim();const out=[];list.forEach((b,i)=>{if(fd.get('ok'+i)){const t=String(fd.get('t'+i)).trim();if(t)out.push({major:mj,minor:String(fd.get('mi'+i)).trim()||'전체 목록',title:t,author:String(fd.get('a'+i)).trim()});}});
    const exist=new Set(liveBooks().map(b=>S.cats[b.c].major+'|'+S.cats[b.c].minor+'|'+b.title.toLowerCase()));
    const fresh=out.filter(b=>!exist.has(b.major+'|'+b.minor+'|'+b.title.toLowerCase()));
    seedImport(fresh);sel=mj;save();render();toast(`🐳 ${fresh.length}권을 가져왔어요!`);});
}

// ---------- 설정 / 동기화 ----------
const dbUrl=()=>FIREBASE_DB_URL;
let syncTimer,syncing=false,lastSync='',syncErr='';
function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(doSync,1500);}
async function doSync(quiet=true){
  if(!currentUser()||syncing||!navigator.onLine)return;syncing=true;
  try{const tok=await idToken();const remote=await pull(dbUrl(),DATA_PATH,tok);const R={books:remote.books||{},cats:remote.cats||{},events:remote.events||{}};const merged=mergeState(S,R);
    const changedLocal=JSON.stringify(merged)!==JSON.stringify(S);const changedRemote=JSON.stringify(merged)!==JSON.stringify(R);
    if(changedRemote)await push(dbUrl(),DATA_PATH,tok,merged);
    if(changedLocal){S=merged;localStorage.setItem('wb_state',JSON.stringify(S));if($('#modal').classList.contains('hidden'))render();}
    lastSync=new Date().toLocaleTimeString('ko-KR');syncErr='';if(!quiet)toast('☁️ 동기화 완료!');
  }catch(e){console.warn(e);syncErr=e.message;if(!quiet)toast('동기화 실패: '+e.message);}finally{syncing=false;updateLogin();}
}
function updateLogin(){const b=$('#loginBtn');if(!b)return;const u=currentUser();
  b.textContent=u?(syncErr?'⚠️':'☁️'):'🔑';b.title=u?`${u.email} 로그인됨`:'구글로 로그인';b.classList.toggle('on',!!u&&!syncErr);}
async function doSignIn(){if(!firebaseReady())return toast('아직 로그인 준비 중이에요 (설정값 필요)');if(!navigator.onLine)return toast('인터넷에 연결하면 로그인할 수 있어요');
  try{await signIn();}catch(e){console.warn(e);toast('로그인 실패: '+(e.code||e.message));}}
function loginHtml(){const u=currentUser();
  if(u)return `<div class="login on"><p>☁️ <b>${esc(u.email)}</b> 로그인됨 — 모든 기기 기록이 함께 보여요</p>${syncErr?`<p class="help">⚠️ ${esc(syncErr)}</p>`:''}<p class="help">마지막 동기화: ${lastSync||'없음'}</p><div class="row"><button type="button" class="btn" id="syncNow">🔄 지금 동기화</button><button type="button" class="btn" id="logoutBtn">로그아웃</button></div></div>`;
  return `<div class="login"><p>🔑 <b>구글로 로그인하면 모든 기기 기록이 함께 보여요</b></p><p class="help">로그인하지 않아도 이 기기에서는 그대로 쓸 수 있어요.</p><button type="button" class="btn primary" id="loginGo">🐳 구글로 로그인</button></div>`;}
function settings(){
  modal(`<form><h3>⚙️ 설정 · 기기 동기화</h3>
  ${loginHtml()}
  <div class="row"><button type="button" class="btn" id="expBtn">💾 백업 저장</button><button type="button" class="btn" id="impBtn">📂 백업 불러오기</button><button type="button" class="btn danger" id="resetBtn">초기화</button></div>
  <div class="row"><button type="button" class="btn" data-close>닫기</button></div></form>`,()=>{});
  const g=$('#loginGo');if(g)g.onclick=()=>{closeModal();doSignIn();};
  const o=$('#logoutBtn');if(o)o.onclick=async()=>{await signOutUser();closeModal();toast('로그아웃했어요 (이 기기 기록은 남아요)');};
  const n=$('#syncNow');if(n)n.onclick=()=>doSync(false);
  $('#expBtn').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S)],{type:'application/json'}));a.download=`고래책방-백업-${dkey(new Date())}.json`;a.click();};
  $('#impBtn').onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='application/json';i.onchange=async()=>{try{const j=JSON.parse(await i.files[0].text());S=mergeState(S,j);save();render();closeModal();toast('백업을 합쳤어요');}catch(e){toast('백업 파일 오류');}};i.click();};
  $('#resetBtn').onclick=()=>confirmBox('이 기기의 모든 메달을 지울까요? (책 목록은 남아요)',()=>{for(const b of Object.values(S.books)){if(b.m){b.m=0;b.u=now();}}save();render();});
}

// ---------- 이벤트 ----------
document.addEventListener('click',e=>{
  const t=e.target.closest('button,[data-day]');if(!t)return;
  if(t.dataset.stamp)return stamp(t.dataset.stamp,t);
  if(t.dataset.m!==undefined&&t.classList.contains('major')){sel=t.dataset.m;localStorage.setItem('wb_sel',sel);$('#side').classList.remove('open');render();$('#content').scrollTop=0;return;}
  if(t.dataset.view){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));$('#vBooks').classList.toggle('hidden',t.dataset.view!=='books');$('#vAtt').classList.toggle('hidden',t.dataset.view!=='att');$('#menuBtn').style.visibility=t.dataset.view==='books'?'':'hidden';render();return;}
  if(t.dataset.cal){calMonth.setMonth(calMonth.getMonth()+ +t.dataset.cal);renderAtt();return;}
  if(t.dataset.day)return showDay(t.dataset.day);
  const a=t.dataset.act;const c=t.dataset.c&&S.cats[t.dataset.c];
  if(a==='addBook')return bookForm(null,t.dataset.c);
  if(a==='editBook')return bookForm(S.books[t.dataset.b]);
  if(a==='addMinor')return ask('＋ 중분류 추가','중분류 이름','',v=>{catFor(sel,v);save();render();});
  if(a==='renMinor')return ask('✏️ 중분류 이름 바꾸기','중분류 이름',c.minor,v=>{c.minor=v;c.u=now();save();render();});
  if(a==='delMinor')return confirmBox(`"${esc(c.minor)}" 중분류와 안의 책을 모두 지울까요?`,()=>{c.del=1;c.u=now();save();render();});
  if(a==='renMajor')return ask('✏️ 대분류 이름 바꾸기','대분류 이름',sel,v=>{liveCats().filter(x=>x.major===sel).forEach(x=>{x.major=v;x.u=now();});sel=v;save();render();});
  if(a==='delMajor')return confirmBox(`"${esc(sel)}" 대분류 전체를 지울까요?`,()=>{liveCats().filter(x=>x.major===sel).forEach(x=>{x.del=1;x.u=now();});sel='';save();render();});
});
$('#addMajor').onclick=()=>ask('＋ 대분류 추가','대분류 이름','',v=>{catFor(v,'전체 목록');sel=v;save();render();});
$('#importBtn').onclick=()=>$('#pdfFile').click();
$('#pdfFile').onchange=e=>{importFiles([...e.target.files]);e.target.value='';};
$('#setBtn').onclick=settings;
$('#loginBtn').onclick=()=>currentUser()?settings():doSignIn();
$('#menuBtn').onclick=()=>$('#side').classList.toggle('open');
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
window.addEventListener('focus',()=>doSync());window.addEventListener('online',()=>doSync());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)doSync();});
setInterval(()=>doSync(),20000);

// 배경 거품 & 헤엄치는 친구들
const bub=document.querySelector('.bubbles');for(let i=0;i<18;i++){const s=document.createElement('span');const z=8+Math.random()*28;Object.assign(s.style,{width:z+'px',height:z+'px',left:Math.random()*100+'%',animationDuration:(8+Math.random()*12)+'s',animationDelay:(-Math.random()*20)+'s'});bub.appendChild(s);}
[['🐋','68%',0,26],['🦈','80%',-11,19],['🐠','40%',-5,30]].forEach(([e,top,dl,du])=>{const s=document.createElement('div');s.className='swimmer';s.textContent=e;Object.assign(s.style,{top,animationDelay:dl+'s',animationDuration:du+'s',transform:'scaleX(-1)',opacity:.55});document.querySelector('.sea').appendChild(s);});

render();updateLogin();
let wasIn=false;onUser(u=>{updateLogin();if(u&&!wasIn)doSync(false);wasIn=!!u;});
initAuth();window.addEventListener('online',()=>initAuth());
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
window.__wb={get S(){return S},stamp,mergeState};
