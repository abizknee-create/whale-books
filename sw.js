// 고래 책방 서비스워커. 앱 파일은 네트워크 우선(no-store) → 오프라인일 때만 캐시. 큰 라이브러리/아이콘만 캐시 우선.
const V='v9';const C='whalebooks-'+V;
const APP=['./','index.html','style.css','app.js','extract.js','seed.js','sync.js','auth.js','config.js','manifest.webmanifest'];
const STATIC=['pdf.min.mjs','pdf.worker.min.mjs','icon.svg','icon-192.png','icon-512.png'];
const isStatic=p=>STATIC.some(f=>p.endsWith('/'+f));
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all([...APP,...STATIC].map(f=>fetch(new Request(f,{cache:'reload'})).then(r=>r.ok&&c.put(f,r)).catch(()=>{})))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data==='version')e.source&&e.source.postMessage({version:V});});
self.addEventListener('fetch',e=>{const req=e.request;const u=new URL(req.url);if(req.method!=='GET'||u.origin!==location.origin)return;
 if(isStatic(u.pathname)){e.respondWith(caches.match(req,{ignoreSearch:true}).then(h=>h||fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(req,cp));}return r;})));return;}
 const key=req.mode==='navigate'?'index.html':req;
 e.respondWith(fetch(req.url,{cache:'no-store',credentials:'same-origin'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(key,cp));}return r;})
  .catch(()=>caches.match(key,{ignoreSearch:true}).then(h=>h||caches.match('index.html'))));});
