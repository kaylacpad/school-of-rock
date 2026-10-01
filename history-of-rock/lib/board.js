// Draws the chalkboard and wires up every interaction.
// Data comes from data/chart.json (the transcribed chart) and data/artists.json (artist cards).
export function initBoard(chart, artistData){
/* ================= DATA ================= */
const S=chart.scale, [OX,OY]=chart.origin;
const X=x=>(x-OX)*S, Y=y=>(y-OY)*S;
const G={};
for(const [id,g] of Object.entries(chart.genres)){ const [x,y,w,h]=g.box;
  G[id]={n:g.name,y0:g.born,b:g.blurb,deep:!!g.deep,x:X(x),y:Y(y),w:w*S,h:h*S}; }
const seg=s=>{ const P=s.points.map(([x,y])=>`${X(x)},${Y(y)}`);
  return s.type==="L"?`M${P[0]} L${P[1]}`:s.type==="Q"?`M${P[0]} Q${P[1]} ${P[2]}`:`M${P[0]} C${P[1]} ${P[2]} ${P[3]}`; };
const E=chart.edges.map(e=>[e.from,e.to,e.segments.map(seg),!!e.dashed]);
const ANN=chart.annotations.map(seg);
const LH=chart.rowSpacing*S, INDENT=chart.indent*S, GLH=chart.genreFont*1.05;
const L={};
for(const [k,groups] of Object.entries(chart.lists)) L[k]=groups.map(g=>{ const [nx,ny]=g.nudge||[0,0];
  return [X(g.x+nx),Y(g.y+ny),g.names,g.anchor,g.rotate,g.rowSpacing?g.rowSpacing*S:undefined]; });
const A={};
for(const [name,a] of Object.entries(artistData.artists)) A[name]={yrs:a.years,why:a.whyTheyMatter,songs:a.topSongs,
  films:(a.seenIn||[]).map(f=>[f.title,String(f.year),f.note,!!f.schoolOfRock]),from:a.influencedBy||[],to:a.influenced||[]};
const LESSON=chart.lesson.map(l=>[l.genre,l.text]);
const rootEl=document.documentElement;
rootEl.style.setProperty("--artist-size",chart.artistFont+"px");
rootEl.style.setProperty("--genre-size",chart.genreFont+"px");
rootEl.style.setProperty("--title-size",chart.titleFont+"px");
const titleEl=document.getElementById("titleText");
titleEl.textContent=chart.title.text; titleEl.setAttribute("x",X(chart.title.x)); titleEl.setAttribute("y",Y(chart.title.y));

/* ================= BUILD ================= */
const NS="http://www.w3.org/2000/svg";
const $=s=>document.querySelector(s);
const el=(tag,attrs={},parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;};
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const parents={}, children={};
Object.keys(G).forEach(k=>{parents[k]=[];children[k]=[];});
E.forEach(([a,b,,d])=>{ if(!d){children[a].push(b);parents[b].push(a);} });

// list keys are a genre id, or "a>b" for bridge artists written on an arrow (they belong to both)
const keyGenres=k=>k.split(">");
function parseName(raw){ const ann=raw.startsWith("~"); raw=raw.replace(/^~/,""); const [disp,id]=raw.split("=>");
  return {disp, id:(id||disp.replace(/[\n|]/g," ")), ann}; }
const artistGenres={}; // artist id -> [genre ids]
Object.entries(L).forEach(([k,groups])=>groups.forEach(([, ,names])=>names.forEach(raw=>{ const {id,ann}=parseName(raw); if(ann)return;
  keyGenres(k).forEach(g=>{ const a=(artistGenres[id]=artistGenres[id]||[]); if(!a.includes(g))a.push(g); }); })));
const namesForGenre=g=>{ const out=[]; Object.entries(L).forEach(([k,groups])=>{ if(keyGenres(k).includes(g)) groups.forEach(gr=>gr[2].forEach(raw=>{const {id,ann}=parseName(raw); if(!ann&&!out.includes(id))out.push(id);})); }); return out; };
const agEls=g=>[...document.querySelectorAll(".artist-group")].filter(e=>e.dataset.gs.split(" ").includes(g));
const segs=(a,b)=>edgeEls.filter(p=>p.dataset.a===a&&p.dataset.b===b);


const edgesG=$("#edges"), hlG=$("#hl"), genresG=$("#genres"), artistsG=$("#artists");
const edgeEls=[];
// each connection is drawn exactly where the chalkboard draws it; some run through a group of artists in two segments
E.forEach(([a,b,ds,dashed])=>{
  ds.forEach((d,i)=>{ const last=i===ds.length-1;
    const p=el("path",{d,class:"edge"+(dashed?" dashed":"")},edgesG);
    if(!dashed&&last) p.setAttribute("marker-end","url(#arr)");
    p.dataset.a=a;p.dataset.b=b;p.dataset.last=last?"1":"";edgeEls.push(p); });
});
ANN.forEach(d=>el("path",{d,class:"edge anno","marker-end":"url(#arr)"},edgesG));

const genreEls={};
Object.entries(G).forEach(([id,g])=>{
  const grp=el("g",{class:"genre",tabindex:"0",role:"button","aria-label":g.n.replace("\n"," ")},genresG);
  el("rect",{x:g.x-g.w/2,y:g.y-g.h/2,width:g.w,height:g.h,rx:2},grp);
  const lines=g.n.split("\n");
  lines.forEach((ln,i)=>{const t=el("text",{x:g.x,y:g.y+(i-(lines.length-1)/2)*GLH},grp);t.textContent=ln.toUpperCase();});
  const tk=el("text",{class:"tick",x:g.x+g.w/2+3,y:g.y-g.h/2+2},grp); tk.textContent="✓";
  grp.addEventListener("click",e=>{e.stopPropagation(); if(moved) return; openGenre(id,true);});
  grp.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openGenre(id,true);}});
  genreEls[id]=grp;
});

const artistGroupEls={};
Object.entries(L).forEach(([k,groups])=>{
  const ag=el("g",{class:"artist-group","data-gs":keyGenres(k).join(" ")},artistsG); artistGroupEls[k]=ag;
  groups.forEach(([x,y,names,anchor,rot,rowH],gi)=>{ const LHg=rowH||LH;
    const lg=el("g",{class:"lst","data-g":k,"data-i":gi},ag);
    if(rot) lg.setAttribute("transform",`rotate(${rot} ${x} ${y})`);
    let row=0;
    names.forEach(raw=>{
      const {disp,id,ann}=parseName(raw);
      const parts=disp.split(/(?=[\n|])/);
      const t=el("text",{x,y:y+row*LHg,class:ann?"artist anno":"artist"+(A[id]?" rich":""),"text-anchor":anchor||"start"},lg);
      parts.forEach((pt,pi)=>{ const ind=pt.startsWith("|"); const txt=pt.replace(/^[\n|]/,"");
        const ts=el("tspan",pi?{x:x+(ind?INDENT:0),dy:LHg}:{},t); ts.textContent=txt.toUpperCase(); });
      row+=parts.length;
      if(ann) return;
      t.setAttribute("tabindex","0"); t.setAttribute("role","button"); t.setAttribute("aria-label",id);
      if(A[id]){ const s=el("tspan",{class:"star",dx:"4"},t); s.textContent="★"; }
      t.addEventListener("click",e=>{e.stopPropagation(); if(moved) return; openArtist(id,true);});
      t.addEventListener("keydown",e=>{if(e.key==="Enter"){openArtist(id,true);}});
    });
  });
});

/* ================= PAN / ZOOM ================= */
const board=$("#board"), world=$("#world");
let view={x:0,y:0,k:1};
const BW=1280, BH=960, BY=60; // content bounds (y from 60..1020)
function apply(){ world.setAttribute("transform",`translate(${view.x},${view.y}) scale(${view.k})`); }
function fitView(){
  const bb=world.getBBox(); const CX0=bb.x-10, CY0=bb.y-10, cw=bb.width+20, ch=bb.height+20;
  const r=board.getBoundingClientRect(); const padTop=56, padBot=76;
  const k=Math.min((r.width-24)/cw, (r.height-padTop-padBot)/ch);
  return {k, x:(r.width-cw*k)/2-CX0*k, y:padTop+((r.height-padTop-padBot)-ch*k)/2 - CY0*k};
}
function startView(){
  const r=board.getBoundingClientRect(); if(r.width>720) return fitView();
  const k=0.45; const cx=(G.rnb.x+G.rockabilly.x)/2+20, cy=(G.rnb.y+G.rockabilly.y)/2; return {k, x:r.width/2-cx*k, y:r.height/2-cy*k};
}
function clampK(k){ const f=fitView().k; return Math.max(f*0.7, Math.min(k, 3.5)); }
let anim=null;
function flyTo(target, dur=750){
  cancelAnimationFrame(anim);
  if(reduce||dur===0){view={...target};apply();return;}
  const s={...view}, t0=performance.now();
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const step=now=>{const p=Math.min(1,(now-t0)/dur),e=ease(p);
    view={x:s.x+(target.x-s.x)*e,y:s.y+(target.y-s.y)*e,k:s.k+(target.k-s.k)*e};apply();
    if(p<1)anim=requestAnimationFrame(step);};
  anim=requestAnimationFrame(step);
}
function focusOn(wx,wy,k){
  const r=board.getBoundingClientRect(); const panelOpen=$("#panel").classList.contains("open");
  const mobile=r.width<=720;
  const visW = panelOpen&&!mobile ? r.width-Math.min(390,r.width*.92)-20 : r.width;
  const visH = panelOpen&&mobile ? r.height*.36 : r.height;
  k=clampK(k||Math.max(view.k,1.2));
  flyTo({k, x:visW/2-wx*k, y:visH/2-wy*k});
}
function zoomAt(px,py,factor){
  const k=clampK(view.k*factor); const wx=(px-view.x)/view.k, wy=(py-view.y)/view.k;
  view={k,x:px-wx*k,y:py-wy*k}; apply();
}
board.addEventListener("wheel",e=>{e.preventDefault(); const r=board.getBoundingClientRect(); cancelAnimationFrame(anim);
  zoomAt(e.clientX-r.left,e.clientY-r.top,Math.exp(-e.deltaY*0.0015));},{passive:false});
const pts=new Map(); let moved=false, start=null, pinch=null;
board.addEventListener("pointerdown",e=>{
  if(e.target.closest(".hud,.zoom,.timeline,.panel,.lesson"))return;
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); cancelAnimationFrame(anim);
  if(pts.size===1){moved=false;start={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};}
  if(pts.size===2){[...pts.keys()].forEach(id=>{try{board.setPointerCapture(id);}catch(_){}});const [p1,p2]=[...pts.values()];pinch={d:Math.hypot(p1.x-p2.x,p1.y-p2.y),k:view.k};}
});
board.addEventListener("pointermove",e=>{
  if(!pts.has(e.pointerId))return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pts.size===2&&pinch){const [p1,p2]=[...pts.values()];const r=board.getBoundingClientRect();
    const d=Math.hypot(p1.x-p2.x,p1.y-p2.y);zoomAt((p1.x+p2.x)/2-r.left,(p1.y+p2.y)/2-r.top,(pinch.k*d/pinch.d)/view.k);moved=true;return;}
  if(start){const dx=e.clientX-start.x,dy=e.clientY-start.y; if(!moved&&Math.hypot(dx,dy)>4){moved=true;board.classList.add("dragging");hideHint();try{board.setPointerCapture(e.pointerId);}catch(_){}}
    if(moved){view.x=start.vx+dx;view.y=start.vy+dy;apply();}}
});
const endPtr=e=>{pts.delete(e.pointerId); if(pts.size<2)pinch=null; if(pts.size===0){start=null;board.classList.remove("dragging");setTimeout(()=>moved=false,0);}};
board.addEventListener("pointerup",endPtr); board.addEventListener("pointercancel",endPtr);
board.addEventListener("click",e=>{ if(moved) return; if(e.target.closest(".hud,.zoom,.timeline,.panel,.lesson"))return; clearTrace(); });
$("#zin").onclick=()=>{const r=board.getBoundingClientRect();cancelAnimationFrame(anim);zoomAt(r.width/2,r.height/2,1.35);};
$("#zout").onclick=()=>{const r=board.getBoundingClientRect();cancelAnimationFrame(anim);zoomAt(r.width/2,r.height/2,1/1.35);};
$("#zfit").onclick=()=>flyTo(fitView());
addEventListener("resize",()=>{ if(!$("#panel").classList.contains("open")) flyTo(fitView(),0); });

/* ================= SOUND (synth chalk scratch) ================= */
let ac=null, soundOn=true;
function scratch(len=.12, vol=.07){
  if(!soundOn)return;
  try{
    ac=ac||new (window.AudioContext||window.webkitAudioContext)();
    const n=Math.floor(ac.sampleRate*len), buf=ac.createBuffer(1,n,ac.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<n;i++){const env=Math.sin(Math.PI*i/n); d[i]=(Math.random()*2-1)*env*(0.6+0.4*Math.sin(i/37));}
    const src=ac.createBufferSource(); src.buffer=buf;
    const bp=ac.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=2600+Math.random()*1200; bp.Q.value=1.4;
    const g=ac.createGain(); g.gain.value=vol; src.connect(bp).connect(g).connect(ac.destination); src.start();
  }catch(_){}
}
$("#soundBtn").onclick=()=>{soundOn=!soundOn;$("#soundBtn").textContent=soundOn?"🔊":"🔇";$("#soundBtn").setAttribute("aria-pressed",soundOn);};

/* ================= TRACE (chalk-drawn lineage) ================= */
let traceTimers=[];
function clearTrace(){
  traceTimers.forEach(clearTimeout); traceTimers=[]; hlG.innerHTML="";
  document.getElementById("map").classList.remove("dim");
  document.querySelectorAll(".lit").forEach(n=>n.classList.remove("lit"));
}
function trace(id, dir){
  clearTrace();
  const map=document.getElementById("map"); map.classList.add("dim");
  const seen=new Set([id]); let frontier=[id]; const layers=[];
  while(frontier.length){
    const next=[], layer=[];
    frontier.forEach(n=>{ (dir==="roots"?parents[n]:children[n]).forEach(m=>{
      layer.push(dir==="roots"?[m,n]:[n,m]); if(!seen.has(m)){seen.add(m);next.push(m);} }); });
    if(layer.length)layers.push(layer); frontier=next;
  }
  genreEls[id].classList.add("lit"); agEls(id).forEach(e=>e.classList.add("lit"));
  const ids=[...seen];
  layers.forEach((layer,i)=>{
    traceTimers.push(setTimeout(()=>{
      layer.forEach(([a,b])=>{
        const other = dir==="roots"?a:b;
        genreEls[other].classList.add("lit"); agEls(other).forEach(e=>e.classList.add("lit"));
        segs(a,b).forEach(src=>{
        const p=el("path",{d:src.getAttribute("d"),class:"hl "+dir},hlG);
        const L_=p.getTotalLength(); p.style.strokeDasharray=L_; p.style.strokeDashoffset=L_;
        const mk=src.dataset.last?(dir==="roots"?"url(#arrY)":"url(#arrP)"):null;
        if(reduce){p.style.strokeDashoffset=0; if(mk)p.setAttribute("marker-end",mk);}
        else{ p.animate([{strokeDashoffset:L_},{strokeDashoffset:0}],{duration:520,easing:"ease-out",fill:"forwards"})
            .onfinish=()=>{ if(mk)p.setAttribute("marker-end",mk); }; }
        });
      });
      scratch(.35,.06);
    }, reduce?0:i*560));
  });
  // frame the whole lineage
  const xs=ids.map(k=>G[k].x), ys=ids.map(k=>G[k].y);
  const cx=(Math.min(...xs)+Math.max(...xs))/2, cy=(Math.min(...ys)+Math.max(...ys))/2;
  const r=board.getBoundingClientRect(); const mobile=r.width<=720;
  const vw=(mobile?r.width:r.width-400)-80, vh=(mobile?r.height*.36:r.height-160);
  const spanX=Math.max(...xs)-Math.min(...xs)+160, spanY=Math.max(...ys)-Math.min(...ys)+160;
  focusOn(cx,cy,Math.min(vw/spanX, vh/spanY, 1.8));
}

/* ================= PANEL ================= */
const panel=$("#panel"), body=$("#panelBody");
let history_=[], visited=new Set();
function showPanel(){ panel.classList.add("open"); board.classList.add("panel-open"); }
function closePanel(){ panel.classList.remove("open"); board.classList.remove("panel-open"); history_=[]; document.querySelectorAll(".genre.active").forEach(n=>n.classList.remove("active")); clearTrace(); }
$("#closeBtn").onclick=closePanel;
$("#backBtn").onclick=()=>{ history_.pop(); const prev=history_.pop(); if(!prev)return; prev.t==="g"?openGenre(prev.id,true):openArtist(prev.id,true); };
addEventListener("keydown",e=>{ if(e.key==="Escape"){ if(lessonOn)endLesson(); else closePanel(); } });

function chip(label, onClick, cls=""){ const b=document.createElement("button"); b.className="chip "+cls; b.textContent=label; if(onClick)b.onclick=onClick; else b.disabled=false; return b; }
function h(tag,txt,cls){const e=document.createElement(tag); if(txt!=null)e.textContent=txt; if(cls)e.className=cls; return e;}
function setCrumb(){ $("#crumb").textContent=history_.map(x=>x.t==="g"?G[x.id].n.replace("\n"," "):x.id).join("  ›  "); $("#backBtn").hidden=history_.length<2; }

function markVisited(id){ visited.add(id); genreEls[id].classList.add("visited"); updateProgress(); }
function updateProgress(){ const total=Object.keys(G).length; $("#progress").innerHTML = visited.size===total ? `★ <b>Gold star.</b> Every genre explored.` : `<b>${visited.size}</b> of ${total} genres explored`; }

function openGenre(id, fly){
  scratch(); hideHint();
  document.querySelectorAll(".genre.active").forEach(n=>n.classList.remove("active"));
  genreEls[id].classList.add("active"); markVisited(id);
  const g=G[id]; history_.push({t:"g",id}); setCrumb();
  body.innerHTML="";
  body.append(h("h2",g.n.replace("\n"," ")), h("p",g.y0<1950?`Born in the ${Math.floor(g.y0/10)*10}s`:`Born around ${g.y0}`,"era"), h("p",g.b));
  const acts=h("div",null,"actions");
  const r=h("button","Trace its roots","chalk-btn roots"); r.onclick=()=>trace(id,"roots");
  const l=h("button","Trace its legacy","chalk-btn legacy"); l.onclick=()=>trace(id,"legacy");
  if(parents[id].length)acts.append(r); if(children[id].length)acts.append(l); if(acts.children.length)body.append(acts);
  if(parents[id].length){ body.append(h("h3","Came from")); const c=h("div",null,"chips"); parents[id].forEach(p=>c.append(chip(G[p].n.replace("\n"," "),()=>openGenre(p,true)))); body.append(c);}
  if(children[id].length){ body.append(h("h3","Led to")); const c=h("div",null,"chips"); children[id].forEach(p=>c.append(chip(G[p].n.replace("\n"," "),()=>openGenre(p,true)))); body.append(c);}
  const names=namesForGenre(id);
  if(names.length){ body.append(h("h3","Artists on the board")); const c=h("div",null,"chips");
    names.forEach(n=>c.append(chip(n+(A[n]?" ★":""),()=>openArtist(n,true),A[n]?"rich":""))); body.append(c);
    if(names.some(n=>A[n])) body.append(h("p","★ = full artist card in this prototype","muted"));
  } else body.append(h("p","No artists written on this box in the original chart. A great spot to add some.","muted"));
  showPanel(); body.scrollTop=0;
  if(fly) requestAnimationFrame(()=>focusOn(g.x,g.y));
}

function initials(n){ return n.replace(/^The /,"").split(/[\s&-]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase(); }
function artistLink(n){
  if(artistGenres[n]) return chip(n+(A[n]?" ★":""),()=>openArtist(n,true),A[n]?"rich":"");
  const c=chip(n,null,"plain"); c.title="Not on the original chart"; c.tabIndex=-1; return c;
}
function openArtist(n, fly){
  scratch(.08,.05); hideHint();
  const gs=artistGenres[n]||[]; gs.forEach(markVisited);
  history_.push({t:"a",id:n}); setCrumb(); body.innerHTML="";
  const a=A[n];
  const por=h("div",null,"portrait"); por.append(h("span",initials(n)), h("small","Artist photo loads here on the full site (Wikimedia Commons)")); body.append(por);
  body.append(h("h2",n));
  if(a){
    body.append(h("p",a.yrs,"era"), h("p",a.why));
    body.append(h("h3","Top songs")); const ul=h("ul",null,"songs");
    a.songs.forEach(s=>{const li=h("li"); li.append(h("span",s), h("span","▶ preview","pv")); ul.append(li);}); body.append(ul);
    body.append(h("h3","Seen in"));
    if(a.films.length) a.films.forEach(([t,y,s,sor])=>{ const d=h("div",null,"film"+(sor?" sor":"")); const tt=h("span",null,"t"); tt.textContent=t+" ("+y+")"; if(sor)tt.append(h("span","School of Rock","sor-badge")); d.append(tt,h("span",s,"s")); body.append(d); });
    else body.append(h("p","Film and TV placements get added in the full dataset.","muted"));
    body.append(h("h3","Influenced by")); let c=h("div",null,"chips"); a.from.forEach(x=>c.append(artistLink(x))); body.append(c);
    body.append(h("h3","Influenced")); c=h("div",null,"chips"); a.to.forEach(x=>c.append(artistLink(x))); body.append(c);
  } else {
    body.append(h("p","Bio, top songs with previews, and film placements plug in here once the full artist dataset is built. In this prototype, the starred artists have complete cards.","muted"));
  }
  if(gs.length){ body.append(h("h3","On the board in")); const c=h("div",null,"chips"); gs.forEach(g=>c.append(chip(G[g].n.replace("\n"," "),()=>openGenre(g,true)))); body.append(c); }
  const others=Object.keys(A).filter(x=>x!==n);
  if(!a){ body.append(h("h3","Try a full card")); const c=h("div",null,"chips"); others.slice(0,5).forEach(x=>c.append(artistLink(x))); body.append(c); }
  showPanel(); body.scrollTop=0;
  document.querySelectorAll(".genre.active").forEach(x=>x.classList.remove("active"));
  if(gs[0]){ genreEls[gs[0]].classList.add("active"); if(fly) requestAnimationFrame(()=>focusOn(G[gs[0]].x,G[gs[0]].y)); }
}

/* ================= SEARCH ================= */
const idx=[...Object.entries(G).map(([id,g])=>({label:g.n.replace("\n"," "),t:"g",id,sub:"genre"})),
  ...Object.keys(artistGenres).map(n=>({label:n,t:"a",id:n,sub:G[artistGenres[n][0]].n.replace("\n"," ")}))];
const q=$("#q"), res=$("#results"); let sel=0, cur=[];
function render(){ res.innerHTML=""; cur.forEach((r,i)=>{const b=document.createElement("button"); b.className=i===sel?"sel":""; b.textContent=r.label; const s=document.createElement("small"); s.textContent=r.sub; b.append(s);
  b.onclick=()=>pick(r); res.append(b);}); res.classList.toggle("open",cur.length>0); }
function pick(r){ q.value=""; cur=[]; render(); q.blur(); r.t==="g"?openGenre(r.id,true):openArtist(r.id,true); }
q.addEventListener("input",()=>{const v=q.value.trim().toLowerCase(); sel=0;
  cur = v? idx.filter(r=>r.label.toLowerCase().includes(v)).sort((a,b)=>a.label.toLowerCase().indexOf(v)-b.label.toLowerCase().indexOf(v)).slice(0,8):[]; render();});
q.addEventListener("keydown",e=>{ if(e.key==="ArrowDown"){sel=Math.min(sel+1,cur.length-1);render();e.preventDefault();}
  else if(e.key==="ArrowUp"){sel=Math.max(sel-1,0);render();e.preventDefault();} else if(e.key==="Enter"&&cur[sel]){pick(cur[sel]);} });
q.addEventListener("blur",()=>setTimeout(()=>{res.classList.remove("open");},150));

/* ================= TIMELINE ================= */
const yr=$("#year");
yr.addEventListener("input",()=>{
  const y=+yr.value; $("#yearOut").textContent = y>=2000?"Now":y+(y%10===0?"s":"");
  Object.entries(G).forEach(([id,g])=>{ genreEls[id].classList.toggle("unborn",g.y0>y); });
  document.querySelectorAll(".artist-group").forEach(e=>e.classList.toggle("unborn", Math.max(...e.dataset.gs.split(" ").map(g=>G[g].y0))>y));
  document.querySelectorAll(".anno").forEach(e=>e.classList.toggle("unborn", y<1966));
  edgeEls.forEach(p=>p.classList.toggle("unborn", G[p.dataset.a].y0>y || G[p.dataset.b].y0>y));
});
let lastDecade=null; yr.addEventListener("input",()=>{const d=Math.floor(+yr.value/10); if(d!==lastDecade){lastDecade=d;scratch(.05,.04);}});

/* ================= LESSON ================= */
let lessonOn=false, li=0;
function showStep(){
  const [id,txt]=LESSON[li];
  $("#lessonStep").textContent=`Lesson ${li+1} of ${LESSON.length}: ${G[id].n.replace("\n"," ")}`;
  $("#lessonText").textContent=txt;
  $("#lessonPrev").disabled = li===0; $("#lessonNext").textContent = li===LESSON.length-1 ? "Finish" : "Next";
  clearTrace(); const map=document.getElementById("map"); map.classList.add("dim");
  LESSON.slice(0,li+1).forEach(([g])=>{genreEls[g].classList.add("lit");agEls(g).forEach(e=>e.classList.add("lit"));});
  // draw the path so far, newest segment animated
  for(let i=1;i<=li;i++){
    const a=LESSON[i-1][0], b=LESSON[i][0];
    segs(a,b).forEach(src=>{
    const mk=src.dataset.last?"url(#arrY)":null;
    const p=el("path",{d:src.getAttribute("d"),class:"hl roots"},hlG); if(mk)p.setAttribute("marker-end",mk);
    if(i===li&&!reduce){const L_=p.getTotalLength(); p.removeAttribute("marker-end"); p.style.strokeDasharray=L_;
      p.animate([{strokeDashoffset:L_},{strokeDashoffset:0}],{duration:700,easing:"ease-out",fill:"forwards"}).onfinish=()=>{ if(mk)p.setAttribute("marker-end",mk); };}
    });
  }
  markVisited(id); scratch(.3,.06);
  const g=G[id]; const r=board.getBoundingClientRect();
  const k=clampK(Math.min(1.25, r.width/900)); flyTo({k,x:r.width/2-g.x*k,y:(r.height-170)/2-g.y*k+30},900);
}
function startLesson(){ closePanel(); lessonOn=true; li=0; $("#lesson").classList.add("open"); hideHint(); showStep(); $("#lessonNext").focus(); }
function endLesson(){ lessonOn=false; $("#lesson").classList.remove("open"); clearTrace(); flyTo(fitView()); }
$("#lessonBtn").onclick=startLesson; $("#lessonExit").onclick=endLesson;
$("#lessonNext").onclick=()=>{ if(li<LESSON.length-1){li++;showStep();} else { const last=LESSON[li][0]; endLesson(); openGenre(last,true);} };
$("#lessonPrev").onclick=()=>{ if(li>0){li--;showStep();} };

/* ================= INTRO ================= */
let hinted=false; function hideHint(){ if(hinted)return; hinted=true; $("#hint").style.opacity=0; }
updateProgress();
view=startView(); apply();
if(!reduce){
  edgeEls.forEach((p,i)=>{ const L_=p.getTotalLength(); const dash=p.classList.contains("dashed");
    const m=p.getAttribute("marker-end"); if(m)p.removeAttribute("marker-end"); if(p.classList.contains("anno"))return;
    p.style.strokeDasharray=L_; p.style.strokeDashoffset=L_;
    const order=Math.hypot(G[p.dataset.a].x-G.blues.x,G[p.dataset.a].y-G.blues.y)*0.75; // ripple outward from Blues
    p.animate([{strokeDashoffset:L_},{strokeDashoffset:0}],{duration:600,delay:250+order*1.6,easing:"ease-out",fill:"forwards"})
     .onfinish=()=>{ p.style.strokeDasharray=dash?"7 7":""; p.style.strokeDashoffset=""; p.getAnimations().forEach(a=>a.cancel()); if(m)p.setAttribute("marker-end",m); };
  });
}
}
