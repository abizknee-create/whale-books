// Firebase Realtime Database REST 동기화. 구글 로그인 ID 토큰(?auth=)으로만 접근 가능.
export function mergeState(a,b){
  const out={books:{},cats:{},events:{}};
  for(const k of ['books','cats']){const keys=new Set([...Object.keys(a[k]||{}),...Object.keys(b[k]||{})]);
    for(const id of keys){const x=(a[k]||{})[id],y=(b[k]||{})[id];out[k][id]=!x?y:!y?x:((y.u||0)>(x.u||0)?y:x);}}
  out.events={...(b.events||{}),...(a.events||{})};
  return out;
}
const u=(url,path,tok)=>`${url.replace(/\/$/,'')}/${path}.json?auth=${encodeURIComponent(tok)}`;
const err=r=>new Error(r.status===401||r.status===403?'이 구글 계정은 허용되지 않았어요':'HTTP '+r.status);
export async function pull(url,path,tok){
  const r=await fetch(u(url,path,tok),{cache:'no-store'});
  if(!r.ok)throw err(r);const j=await r.json();return j||{books:{},cats:{},events:{}};
}
export async function push(url,path,tok,state){
  const r=await fetch(u(url,path,tok),{method:'PUT',body:JSON.stringify(state)});
  if(!r.ok)throw err(r);
}
