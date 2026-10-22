// Firebase Realtime Database REST 동기화. 구글 로그인 ID 토큰(?auth=)으로만 접근 가능.
export function mergeState(a,b){
  const out={books:{},cats:{},events:{},coupons:{}};
  for(const k of ['books','cats']){const keys=new Set([...Object.keys(a[k]||{}),...Object.keys(b[k]||{})]);
    for(const id of keys){const x=(a[k]||{})[id],y=(b[k]||{})[id];out[k][id]=!x?y:!y?x:((y.u||0)>(x.u||0)?y:x);}}
  // 이벤트: 합집합. 한쪽이라도 취소(x)면 취소 유지 → 다른 기기 병합으로 되살아나지 않음.
  const ea=a.events||{},eb=b.events||{};
  for(const id of new Set([...Object.keys(ea),...Object.keys(eb)])){const x=ea[id],y=eb[id];
    out.events[id]=!x?{...y}:!y?{...x}:((x.x||y.x)?{...x,x:1}:{...x});}
  // 쿠폰: 마일스톤별 고정 id(m10…). 합집합, 한쪽이라도 used면 사용됨 유지, 생성시각은 이른 쪽.
  const ca=a.coupons||{},cb=b.coupons||{};
  for(const id of new Set([...Object.keys(ca),...Object.keys(cb)])){const x=ca[id],y=cb[id];
    out.coupons[id]=!x?{...y}:!y?{...x}:{...x,t:Math.min(x.t||0,y.t||0)||x.t,used:(x.used||y.used)?1:undefined,u:Math.max(x.u||0,y.u||0)};
    if(!out.coupons[id].used)delete out.coupons[id].used;}
  return out;
}
const u=(url,path,tok)=>`${url.replace(/\/$/,'')}/${path}.json?auth=${encodeURIComponent(tok)}`;
const err=r=>new Error(r.status===401||r.status===403?'이 구글 계정은 허용되지 않았어요':'HTTP '+r.status);
export async function pull(url,path,tok){
  const r=await fetch(u(url,path,tok),{cache:'no-store'});
  if(!r.ok)throw err(r);const j=await r.json();return j||{books:{},cats:{},events:{},coupons:{}};
}
export async function push(url,path,tok,state){
  const r=await fetch(u(url,path,tok),{method:'PUT',body:JSON.stringify(state)});
  if(!r.ok)throw err(r);
}
