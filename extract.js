// 책 목록 추출기: pdf.js text items -> [{major, minor, title, author}]
const TITLE_RE=/^(도서명|책\s*이름|책명|책\s*제목|제목|서명|도서|title|book\s*title|book)$/i;
const AUTHOR_RE=/^(저자|지은이|글|글쓴이|작가|저자명|글\/그림|글·그림|author|writer)/i;
const PUB_RE=/^(출판사|출판|펴낸곳|발행처|publisher)/i;
const NO_RE=/^(no\.?|번호|순번|연번)$/i;
const BULLET_RE=/^[■□◆◇●○▶▷★☆#【\[<〈《]/;
const GRADE_RE=/(\d+\s*(학년|단계|레벨|세|권)|level\s*\d|유아|초등|중등|고등|저학년|고학년)/i;
const JUNK_RE=/(저작권|무단|배포|copyright|all rights|페이지|page\s*\d)/i;
const clean=s=>s.replace(/\s+/g,' ').trim();

export async function readPdfItems(pdfjs,data){
  const doc=await pdfjs.getDocument({data}).promise; const pages=[];
  for(let i=1;i<=doc.numPages;i++){
    const pg=await doc.getPage(i); const tc=await pg.getTextContent();
    pages.push(tc.items.filter(t=>t.str&&t.str.trim()).map(t=>({s:t.str,x:t.transform[4],y:t.transform[5],w:t.width,h:Math.abs(t.transform[3])||t.height||10})));
  }
  return pages;
}
function toLines(items){
  const s=[...items].sort((a,b)=>b.y-a.y||a.x-b.x); const lines=[];
  for(const it of s){const l=lines.find(L=>Math.abs(L.y-it.y)<=Math.max(2,it.h*0.3)); if(l){l.items.push(it)}else lines.push({y:it.y,items:[it]});}
  lines.forEach(l=>{l.items.sort((a,b)=>a.x-b.x);l.text=clean(l.items.map(i=>i.s).join(' '));l.h=Math.max(...l.items.map(i=>i.h));});
  return lines.sort((a,b)=>b.y-a.y);
}
function findHeader(lines){
  for(const l of lines){
    const t=l.items.find(i=>TITLE_RE.test(clean(i.s)));
    if(t&&l.items.length>=2){
      const cells=lines.filter(L=>Math.abs(L.y-l.y)<=l.h*1.8).flatMap(L=>L.items);
      return {y:l.y,cells};
    }
  }
  return null;
}
function buildCols(cells){
  // 같은 x대 셀 병합(여러 줄 헤더)
  const groups=[];
  for(const c of [...cells].sort((a,b)=>a.x-b.x)){const cx=c.x+c.w/2;const g=groups.find(g=>Math.abs(g.cx-cx)<20);if(g){g.label+=' '+clean(c.s);g.minX=Math.min(g.minX,c.x);g.maxX=Math.max(g.maxX,c.x+c.w);}else groups.push({cx,label:clean(c.s),minX:c.x,maxX:c.x+c.w});}
  groups.sort((a,b)=>a.cx-b.cx);
  groups.forEach((g,i)=>{g.left=i?groups[i-1].maxX+1:-1e9;g.right=i<groups.length-1?(g.cx+groups[i+1].cx)/2:1e9;g.nextMin=i<groups.length-1?groups[i+1].minX:1e9;});
  const find=re=>groups.find(g=>g.label.split(' ').some(w=>re.test(w))||re.test(g.label));
  return {groups,title:find(TITLE_RE),author:find(AUTHOR_RE),pub:find(PUB_RE),no:find(NO_RE)};
}
function isHeading(l,medH){
  const t=l.text; if(t.length>30||t.length<2||JUNK_RE.test(t))return false;
  if(/[다요]\.?$|[.!?…]$/.test(t))return false;
  if(/^\d+$/.test(t))return false;
  return BULLET_RE.test(t)||l.h>medH*1.2||(GRADE_RE.test(t)&&l.items.length<=2);
}
const headName=t=>clean(t.replace(/^[■□◆◇●○▶▷★☆#【\[<〈《\s]+|[】\]>〉》\s]+$/g,''));
function validTitle(t){return t&&!/^[-\d\s.]+$/.test(t)&&!TITLE_RE.test(t)&&!JUNK_RE.test(t)&&t.length<=120;}

export function extractBooks(pages,fileName='PDF'){
  const major=clean(fileName.replace(/\.pdf$/i,''))||'추천도서';
  const all=pages.flatMap(p=>p.map(i=>i.h)).sort((a,b)=>a-b); const medH=all[Math.floor(all.length/2)]||10;
  const out=[]; let minor='전체 목록'; let cols=null;
  for(const items of pages){
    const lines=toLines(items);
    const hasHdr=lines.some(l=>l.items.length>=2&&l.items.some(i=>TITLE_RE.test(clean(i.s))));
    if(cols||hasHdr){
      const frags=[];const events=[];let skipUntil=-1e9;
      for(const l of lines){
        if(l.items.length>=2&&l.items.some(i=>TITLE_RE.test(clean(i.s)))){const cells=lines.filter(L=>Math.abs(L.y-l.y)<=l.h*1.8).flatMap(L=>L.items);cols=buildCols(cells);skipUntil=Math.min(...cells.map(c=>c.y))-1;events.push({y:l.y,reset:true});continue;}
        if(l.y>=skipUntil&&l.y<=skipUntil+l.h*4)continue;
        if(isHeading(l,medH)&&l.items.length<=2){events.push({y:l.y,heading:headName(l.text)});continue;}
        const T=cols&&cols.title; if(!T)continue;
        for(const it of l.items){ if(it.x>=T.left-3&&it.x<T.cx&&it.x+it.w<=Math.max(T.right+15,T.nextMin+5)&&!JUNK_RE.test(it.s)) frags.push({...it,cols}); }
      }
      frags.sort((a,b)=>b.y-a.y);
      const books=[];
      for(const f of frags){const b=books[books.length-1]; if(b&&b.cols===f.cols&&b.lastY-f.y<=f.h*1.8&&!events.some(e=>e.y<b.lastY&&e.y>f.y)){b.parts.push(f);b.lastY=f.y;}else books.push({parts:[f],topY:f.y,lastY:f.y,cols:f.cols});}
      const pick=(col,b)=>col?clean(items.filter(i=>{const cx=i.x+i.w/2;return cx>col.left&&cx<col.right&&i.y<=b.topY+b.parts[0].h*0.6&&i.y>=b.lastY-b.parts[0].h*0.6&&i.x+i.w<=col.right+15}).sort((a,c)=>c.y-a.y||a.x-c.x).map(i=>i.s).join(' ')):'';
      const seq=[...books.map(b=>({y:b.topY,b})),...events].sort((a,b)=>b.y-a.y);
      for(const e of seq){ if(e.reset)continue; if(e.heading){minor=e.heading;continue;} const b=e.b;
        const title=clean(b.parts.map(p=>p.s).join(' ')); if(!validTitle(title))continue;
        let author=pick(b.cols.author,b); if(!author||author==='-')author=pick(b.cols.pub,b); if(author==='-')author='';
        out.push({major,minor,title,author});}
    } else {
      // 목록형
      for(const l of lines){
        if(isHeading(l,medH)){minor=headName(l.text);continue;}
        let t=l.text; if(JUNK_RE.test(t)||t.length>80)continue;
        if(/[다요]\.$/.test(t)&&t.length>20)continue;
        if(!/^\s*(\d+\s*[.)]|[-•·▪*◦])\s*/.test(t)&&l.items.length<2)continue;
        t=t.replace(/^\s*(\d+\s*[.)]|[-•·▪*◦])\s*/,'');
        let parts;
        if(/\s[\/|]\s|\t/.test(t)) parts=t.split(/\s*[\/|\t]\s*/);
        else if(/\(([^)]+)\)\s*$/.test(t)){const m=t.match(/^(.*?)\s*\(([^)]+)\)\s*$/);parts=[m[1],m[2]];}
        else if(/\s[-–—]\s/.test(t)) parts=t.split(/\s[-–—]\s/);
        else { // x 간격으로 셀 분리
          parts=[];let cur=null;for(const it of l.items){if(cur&&it.x-(cur.x+cur.w)<it.h*1.5){cur.s+=' '+it.s;cur.w=it.x+it.w-cur.x;}else{cur={...it};parts.push(cur);}}
          parts=parts.map(p=>p.s.replace(/^\s*(\d+\s*[.)])\s*/,''));
        }
        parts=parts.map(clean).filter(Boolean); const title=parts[0];
        if(!validTitle(title))continue;
        out.push({major,minor,title,author:(parts[1]||'').replace(/\s*(글|지음|저|글\s*·\s*그림)$/,'')||parts[2]||''});
      }
    }
  }
  const seen=new Set(); return out.filter(b=>{const k=b.minor+'|'+b.title.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
}
