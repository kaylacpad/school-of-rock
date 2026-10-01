// Checks that no artist name touches a line, a box, the title, or another name.
// Usage: start the site (npm run dev), then in a second terminal: npm run check-layout
// First time only: npm install --no-save playwright && npx playwright install chromium
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
await page.goto(url);
const issues = await page.evaluate(async()=>{
 await document.fonts.ready; await new Promise(r=>setTimeout(r,2500));
 const pad=(b,p)=>({x:b.x-p,y:b.y-p,w:b.width+2*p,h:b.height+2*p});
 const hit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
 const inb=(pt,b)=>pt.x>b.x&&pt.x<b.x+b.w&&pt.y>b.y&&pt.y<b.y+b.h;
 const W=document.getElementById('world').getCTM();
 const texts=[...document.querySelectorAll('.artist')].map(t=>({n:t.textContent.replace('★','').trim(),b:pad(t.getBBox(),2),rot:!!t.closest('[transform]'),M:t.getCTM().inverse().multiply(W)}));
 const rects=[...document.querySelectorAll('.genre')].map(g=>{const r=g.querySelector('rect');return {n:g.getAttribute('aria-label'),b:pad(r.getBBox(),5),raw:r.getBBox(),labels:[...g.querySelectorAll('text:not(.tick)')].map(t=>t.getBBox())}});
 const edges=[...document.querySelectorAll('.edge')].map(p=>{const L=p.getTotalLength(),pts=[];for(let s=0;s<=L;s+=2)pts.push(p.getPointAtLength(s));return {n:p.dataset.a+'>'+p.dataset.b,pts}});
 const title=pad(document.querySelector('.title').getBBox(),4);
 const out=[];
 texts.forEach((t,i)=>{
   rects.forEach(r=>{if(hit(t.b,r.b))out.push(`TEXT-BOX ${t.n} x ${r.n}`)});
   edges.forEach(e=>{if(e.pts.some(p=>inb(t.rot?new DOMPoint(p.x,p.y).matrixTransform(t.M):p,pad({x:t.b.x,y:t.b.y,width:t.b.w,height:t.b.h},1))))out.push(`TEXT-LINE ${t.n} x ${e.n}`)});
   if(t.rot) return;
   if(hit(t.b,title))out.push(`TEXT-TITLE ${t.n}`);
 });
 rects.forEach(r=>{
   r.labels.forEach(l=>{ if(l.width>r.raw.width-14) out.push(`LABEL-OVERFLOW ${r.n} need w>=${Math.ceil(l.width+22)}`)});
   edges.forEach(e=>{ const [a,b]=e.n.split('>'); const inner={x:r.raw.x+3,y:r.raw.y+3,w:r.raw.width-6,h:r.raw.height-6};
     if(e.pts.some(p=>inb(p,inner))) out.push(`LINE-THRU-BOX ${e.n} x ${r.n}`)});
 });
 const tt=[...document.querySelectorAll('.lst')].flatMap(g=>[...g.querySelectorAll('text')].map(t=>{const m=t.getCTM(), w=document.getElementById('world').getCTM().inverse(); const b=t.getBBox();
   const pts=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(w.multiply(m));return p;});
   const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y); return {g,n:t.textContent,b:{x:Math.min(...xs)-4,y:Math.min(...ys)-3,w:Math.max(...xs)-Math.min(...xs)+8,h:Math.max(...ys)-Math.min(...ys)+6}};}));
 tt.forEach((a,i)=>tt.slice(i+1).forEach(c=>{if(a.g!==c.g&&hit(a.b,c.b))out.push(`TEXT-TEXT ${a.n} x ${c.n}`)}));
 // box-box
 rects.forEach((r,i)=>rects.slice(i+1).forEach(s=>{if(hit(pad({x:r.raw.x,y:r.raw.y,width:r.raw.width,height:r.raw.height},10),{x:s.raw.x,y:s.raw.y,w:s.raw.width,h:s.raw.height}))out.push(`BOX-BOX ${r.n} x ${s.n}`)}));
 return out;
});
await browser.close();
if (issues.length) {
  console.log(`✗ ${issues.length} layout issue(s):`);
  issues.forEach((i) => console.log("  " + i));
  process.exit(1);
} else {
  console.log("✓ No overlaps. Every name is clear of lines, boxes, and other names.");
}
