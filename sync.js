// Firebase Realtime Database REST 동기화 (SDK 불필요). 가족 코드 = 데이터 경로.
export function mergeState(a,b){
  const out={books:{},cats:{},events:{}};
  for(const k of ['books','cats']){const keys=new Set([...Object.keys(a[k]||{}),...Object.keys(b[k]||{})]);
    for(const id of keys){const x=(a[k]||{})[id],y=(b[k]||{})[id];out[k][id]=!x?y:!y?x:((y.u||0)>(x.u||0)?y:x);}}
  out.events={...(b.events||{}),...(a.events||{})};
  return out;
}
export async function pull(url,code){
  const r=await fetch(`${url.replace(/\/$/,'')}/families/${encodeURIComponent(code)}.json`,{cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();return j||{books:{},cats:{},events:{}};
}
export async function push(url,code,state){
  const r=await fetch(`${url.replace(/\/$/,'')}/families/${encodeURIComponent(code)}.json`,{method:'PUT',body:JSON.stringify(state)});
  if(!r.ok)throw new Error('HTTP '+r.status);
}
