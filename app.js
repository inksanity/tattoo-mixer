// --- Safari/iPad fix: roundRect polyfill ---
(function(){
  const P = CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (P && !P.roundRect) {
    P.roundRect = function(x, y, w, h, r) {
      r = Math.min(r || 0, Math.abs(w)/2, Math.abs(h)/2);
      this.beginPath();
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.arcTo(x + w, y, x + w, y + r, r);
      this.lineTo(x + w, y + h - r);
      this.arcTo(x + w, y + h, x + w - r, y + h, r);
      this.lineTo(x + r, y + h);
      this.arcTo(x, y + h, x, y + h - r, r);
      this.lineTo(x, y + r);
      this.arcTo(x, y, x + r, y, r);
      return this;
    };
  }
})();

/*  NOTE:
    We intentionally DO NOT declare `const root = …` here.
    `index.html` already defines:
      const root = document.documentElement;
    to avoid the "Identifier 'root' has already been declared" error.
*/

// ---------- Brands (10 inks each, placeholder names) ----------
const BRANDS = {
  "Radiant":[
    {name:"Radiant White",hex:"#FFFFFF"},{name:"Real Black",hex:"#111111"},{name:"Blood Red",hex:"#C21807"},
    {name:"Blue",hex:"#1E50A2"},{name:"Canary Yellow",hex:"#FFD12A"},{name:"Medium Green",hex:"#2FA84F"},
    {name:"Tiger Orange",hex:"#FF7A00"},{name:"Chocolate",hex:"#6B3E26"},{name:"Fuchsia",hex:"#C218C2"},{name:"Lavender",hex:"#B57EDC"}
  ],
  "Eternal":[
    {name:"Lining Black",hex:"#111111"},{name:"White",hex:"#FFFFFF"},{name:"Bright Orange",hex:"#FF7F2A"},
    {name:"True Blue",hex:"#0076CE"},{name:"Light Purple",hex:"#B27AD3"},{name:"Lime Green",hex:"#7FD321"},
    {name:"Dark Brown",hex:"#4D2C1E"},{name:"Light Magenta",hex:"#FF6FB5"},{name:"Lipstick Red",hex:"#C21E3A"},{name:"Caramel",hex:"#A86D3D"}
  ],
  "Solid":[
    {name:"El Picante",hex:"#CF4F2E"},{name:"Satan Red",hex:"#B0122E"},{name:"Traditional Orange",hex:"#FF6A1C"},
    {name:"Oro",hex:"#E6B422"},{name:"Dirty Green",hex:"#6B8F3B"},{name:"Jade",hex:"#00A86B"},
    {name:"Green 7",hex:"#008B45"},{name:"Blue 15",hex:"#1E50A2"},{name:"Old Brown",hex:"#5C3B2E"},{name:"Coffee",hex:"#4B3621"}
  ],
  "Raw":[
    {name:"Raw White",hex:"#FFFFFF"},{name:"Pitch Black",hex:"#111111"},{name:"Bright Yellow",hex:"#FFD11A"},
    {name:"Blue Sky",hex:"#2CA9E1"},{name:"Raw Green",hex:"#2E8B57"},{name:"Laker Purple",hex:"#7F3FBF"},
    {name:"Light Red",hex:"#E24C4B"},{name:"Agent Orange",hex:"#FF6A00"},{name:"Bloodberry",hex:"#B03060"},{name:"Yellow Ochre",hex:"#C99700"}
  ]
};

// ---------- State & DOM ----------
const state={tier:'basic',brand:'Radiant',cap:'M',unit:'drops',swatches:['#F56A6A','#52A7FF','#73D98E','#B093F1'],style:'pngSquare',eyedropper:false,markersOn:true,markers:[],_results:[],_imgBitmap:null,selectedSwatch:-1};
const $=id=>document.getElementById(id);
const segBasic=$('segBasic'), segPro=$('segPro'), tierBadge=$('tierBadge');
const btnImport=$('btnImport'), btnExtract=$('btnExtract'), kSel=$('kColors'), fileInput=$('fileInput');
const btnSave=$('btnSave'), btnLoad=$('btnLoad'), loadInput=$('loadInput'), btnExportPNG=$('btnExportPNG'), btnExportPDF=$('btnExportPDF');
const brandSel=$('brandSel'), capSel=$('capSel'), unitSel=$('unitSel');
const statusChip=$('statusChip'), hdrHint=$('hdrHint'), tip=$('tip'), modeHint=$('modeHint');
const paletteStrip=$('paletteStrip'), recipes=$('recipes');
const canvas=$('canvas'); const ctx=canvas.getContext('2d',{willReadFrequently:true});
const wrap=$('canvasWrap'); const btnEyedropper=$('btnEyedropper'), loupe=$('loupe'), loupeCanvas=$('loupeCanvas'), lctx=loupeCanvas.getContext('2d');
const metaGrid=$('metaGrid'); const studioInput=$('studioInput'); const clientInput=$('clientInput'); const dateInput=$('dateInput'); const placementInput=$('placementInput');
const markerSel=$('markerSel'); const exportMarkers=$('exportMarkers'); const biasPure=$('biasPure'); const sampleSizeSel=$('sampleSize');
const modal=$('modal'); const btnUpgrade=$('btnUpgrade'); const closeModal=$('closeModal');
const btnStyleSquare=$('btnStyleSquare'), btnStyleSplatPng=$('btnStyleSplatPng'), btnStyleSplatSvg=$('btnStyleSplatSvg');
const splatModal=$('splatModal'); const btnSplatConfig=$('btnSplatConfig'); const splatInput=$('splatInput'); const splatSave=$('splatSave'); const splatClear=$('splatClear'); const splatClose=$('splatClose');

const historyStack=[]; function pushHistory(){ historyStack.push([...state.swatches]); if(historyStack.length>50) historyStack.shift(); } 
$('btnUndo').onclick=()=>{ if(!historyStack.length) return; state.swatches=historyStack.pop(); renderPalette(); computeAllRecipes(); drawMarkers(); };

// Populate brands
Object.keys(BRANDS).forEach(b=>{ const o=document.createElement('option'); o.value=b; o.textContent=b; brandSel.appendChild(o); }); 
brandSel.value=state.brand;

// ---------- Tier switching ----------
segBasic.onclick=()=>setTier('basic'); 
segPro.onclick=()=>setTier('pro');
function setTier(t){ 
  state.tier=t;
  segBasic.classList.toggle('active',t==='basic'); segPro.classList.toggle('active',t==='pro');
  tierBadge.textContent=t==='basic'?'Basic':'Pro'; const basic=t==='basic';
  lock(btnSave,basic); lock(btnLoad,basic); lock(btnExportPNG,basic); lock(btnExportPDF,basic);
  lock(btnExtract,basic); kSel.disabled=basic; unitSel.disabled=basic;
  metaGrid.style.display=basic?'none':'grid'; btnUpgrade.style.display=basic?'inline-flex':'none';
  hdrHint.textContent=basic?'Tap with the Eyedropper to add colors (Auto-extract is Pro)':'Import image → Auto-extract or long-press to sample areas';
  tip.textContent=basic?'Basic: manual Eyedropper + drops only. Pro unlocks auto-extract, save/export, %, ml, oz, session fields, and Pro palette styles.':'Pro: auto-extract, 3D splats, %, ml, oz.';
  modeHint.textContent=basic?'Drops only (Basic)':'Drops / %, ml, oz (Pro)';
  renderPalette(); computeAllRecipes(); drawMarkers();
}
function lock(btn,l){ if(l){btn.classList.add('disabled','locked');} else {btn.classList.remove('disabled','locked');} }
btnUpgrade.onclick=()=>{ modal.style.display='flex'; }; 
closeModal.onclick=()=>{ modal.style.display='none'; };
modal.addEventListener('click',(e)=>{ if(e.target===modal) modal.style.display='none'; });

// ---------- Import image ----------
btnImport.onclick=()=>fileInput.click();
fileInput.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; const img=await createImageBitmap(f); state._imgBitmap=img; state.markers=[]; fitAndDraw(img); };
function fitAndDraw(img){ const maxW=1600,maxH=900; let w=img.width,h=img.height; const sc=Math.min(1,maxW/w,maxH/h); w=Math.round(w*sc); h=Math.round(h*sc); canvas.width=w; canvas.height=h; ctx.clearRect(0,0,w,h); ctx.drawImage(img,0,0,w,h); drawMarkers(); }

// ---------- Markers ----------
markerSel.onchange=()=>{ state.markersOn=markerSel.value==='on'; drawMarkers(); };
function addMarkerFromClientCoords(clientX,clientY){ const r=canvas.getBoundingClientRect(); const w=wrap.getBoundingClientRect(); const x=((clientX-r.left)/r.width); const y=((clientY-r.top)/r.height); state.markers.push({x:Math.min(1,Math.max(0,x)),y:Math.min(1,Math.max(0,y))}); drawMarkers(); }
function drawMarkers(){ wrap.querySelectorAll('.marker').forEach(m=>m.remove()); if(!state._imgBitmap||!state.markersOn) return; const r=canvas.getBoundingClientRect(); const w=wrap.getBoundingClientRect(); state.markers.forEach((m,i)=>{ const el=document.createElement('div'); el.className='marker'; if(state.selectedSwatch>=0 && i!==state.selectedSwatch) el.classList.add('dim'); el.textContent=(i+1); el.style.left=((m.x*r.width)+(r.left-w.left))+'px'; el.style.top=((m.y*r.height)+(r.top-w.top))+'px'; wrap.appendChild(el); }); }

// ---------- Auto-extract ----------
btnExtract.onclick=()=>{ 
  if(state.tier==='basic'){ flash('Pro only'); return; } 
  if(canvas.width===0){ flash('Load an image first'); return; } 
  const k=parseInt(kSel.value,10); 
  const {colors,coords}=extractPaletteWithCoords(canvas,k,biasPure.checked); 
  state.swatches=colors.map(rgbToHex); 
  state.markers=coords.map(([x,y])=>({x,y})); 
  renderPalette(); computeAllRecipes(); drawMarkers(); 
};

// ---------- Eyedropper ----------
btnEyedropper.onclick=()=>{ state.eyedropper=!state.eyedropper; btnEyedropper.classList.toggle('primary',state.eyedropper); wrap.setAttribute('data-sampling',state.eyedropper?'on':'off'); flash(state.eyedropper?'Eyedropper ON':'Eyedropper OFF'); };
function updateLoupe(clientX,clientY){ if(canvas.width===0) return; const r=canvas.getBoundingClientRect(); const w=wrap.getBoundingClientRect(); const x=(clientX-r.left)*(canvas.width/r.width); const y=(clientY-r.top)*(canvas.height/r.height); lctx.imageSmoothingEnabled=false; lctx.clearRect(0,0,90,90); lctx.drawImage(canvas,Math.max(0,x-15),Math.max(0,y-15),30,30,0,0,90,90); const lx=clientX-w.left-45; const ly=clientY-w.top-105; loupe.style.left=lx+'px'; loupe.style.top=ly+'px'; loupe.style.display='block'; }
function pickAt(clientX,clientY){ const rect=canvas.getBoundingClientRect(); const x=Math.floor((clientX-rect.left)*(canvas.width/rect.width)); const y=Math.floor((clientY-rect.top)*(canvas.height/rect.height)); const k=parseInt(sampleSizeSel.value,10); const r=Math.max(0,Math.floor(k/2)); const sx=Math.max(0,x-r), sy=Math.max(0,y-r); const sw=Math.min(canvas.width-sx,k), sh=Math.min(canvas.height-sy,k); const data=ctx.getImageData(sx,sy,sw,sh).data; let R=0,G=0,B=0,W=0; for(let i=0;i<data.length;i+=4){ const rr=data[i],gg=data[i+1],bb=data[i+2]; const mx=Math.max(rr,gg,bb),mn=Math.min(rr,gg,bb); const sat=(mx-mn)/255; const weight=0.6+0.4*sat; R+=rr*weight; G+=gg*weight; B+=bb*weight; W+=weight; } const hx=rgbToHex([Math.round(R/W),Math.round(G/W),Math.round(B/W)]); pushHistory(); state.swatches.push(hx); addMarkerFromClientCoords(clientX,clientY); renderPalette(); computeAllRecipes(); loupe.style.display='none'; }
canvas.addEventListener('mousemove', e=>{ if(state.eyedropper) updateLoupe(e.clientX,e.clientY); }); 
canvas.addEventListener('mouseleave',()=>{ loupe.style.display='none'; }); 
canvas.addEventListener('click', e=>{ if(state.eyedropper) pickAt(e.clientX,e.clientY); });
canvas.addEventListener('touchstart', e=>{ if(!state.eyedropper) return; e.preventDefault(); const t=e.touches[0]; updateLoupe(t.clientX,t.clientY); }, {passive:false});
canvas.addEventListener('touchmove',  e=>{ if(!state.eyedropper) return; e.preventDefault(); const t=e.touches[0]; updateLoupe(t.clientX,t.clientY); }, {passive:false});
canvas.addEventListener('touchend',   e=>{ if(!state.eyedropper) return; e.preventDefault(); const t=e.changedTouches[0]; pickAt(t.clientX,t.clientY); }, {passive:false});

// ---------- Palette render (with delete) ----------
function renderPalette(){ 
  paletteStrip.innerHTML=''; 
  const style = (state.tier==='basic') ? 'pngSquare' : state.style; 
  state.swatches.forEach((hx,idx)=>{ 
    let el; 
    if(style==='pngSquare'){ el=document.createElement('div'); el.className='square'; el.style.setProperty('--chipColor',hx);} 
    else if(style==='pngSplat'){ el=document.createElement('div'); el.className='splat'; el.style.setProperty('--chipColor',hx);} 
    else { el=document.createElement('div'); el.className='svgSplat'; const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 100 100'); svg.style.width='100%'; svg.style.height='100%'; const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('fill',hx); path.setAttribute('d',CUSTOM_SPLAT_PATH || "M52,8 C63,5 83,12 89,26 C98,36 98,56 90,68 C85,83 63,96 46,92 C33,96 18,88 13,73 C6,62 10,42 20,31 C25,18 38,12 52,8 Z"); svg.appendChild(path); el.appendChild(svg); } 
    const label=document.createElement('div'); label.className='slabel'; label.textContent=hx; el.appendChild(label); 
    el.onclick=()=>{ state.selectedSwatch=idx; drawMarkers(); }; 
    let timer=null; 
    el.addEventListener('touchstart',()=>{ timer=setTimeout(()=>{ pushHistory(); state.swatches.splice(idx,1); state.selectedSwatch=-1; renderPalette(); computeAllRecipes(); drawMarkers(); },550);},{passive:true}); 
    el.addEventListener('touchend',()=>clearTimeout(timer),{passive:true}); 
    el.addEventListener('touchmove',()=>clearTimeout(timer),{passive:true}); 
    el.addEventListener('contextmenu',(e)=>{ e.preventDefault(); pushHistory(); state.swatches.splice(idx,1); state.selectedSwatch=-1; renderPalette(); computeAllRecipes(); drawMarkers(); }); 
    paletteStrip.appendChild(el); 
  }); 
}

// ---------- Color helpers ----------
function hexToRgb(hx){ hx=hx.replace('#',''); return [parseInt(hx.slice(0,2),16),parseInt(hx.slice(2,4),16),parseInt(hx.slice(4,6),16)]; }
function rgbToHex([r,g,b]){ return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('').toUpperCase(); }
function srgbToLinear(c){ c/=255; return c<=0.04045? c/12.92 : Math.pow((c+0.055)/1.055,2.4); }
function rgbToXyz([r,g,b]){ const R=srgbToLinear(r),G=srgbToLinear(g),B=srgbToLinear(b); return [R*0.4124564+G*0.3575761+B*0.1804375, R*0.2126729+G*0.7151522+B*0.0721750, R*0.0193339+G*0.1191920+B*0.9503041]; }
function xyzToLab([X,Y,Z]){ const Xr=0.95047,Yr=1.00000,Zr=1.08883; const f=t=> t>0.008856? Math.cbrt(t):(7.787*t+16/116); const fx=f(X/Xr),fy=f(Y/Yr),fz=f(Z/Zr); return [116*fy-16, 500*(fx-fy), 200*(fy-fz)]; }
function rgbToLab(rgb){ return xyzToLab(rgbToXyz(rgb)); }
function distLab(a,b){ return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2); }

// ---------- Auto-extract (k-means in Lab) ----------
function extractPaletteWithCoords(cv,k,preferPure){ 
  const w=cv.width,h=cv.height; 
  const data=ctx.getImageData(0,0,w,h).data; 
  const step=Math.max(1,Math.floor((w*h)/5000)); 
  const pts=[],pos=[],wts=[]; 
  for(let i=0;i<data.length;i+=4*step){ 
    const idx=i/4; const x=idx%w, y=(idx-x)/w; 
    const rr=data[i],gg=data[i+1],bb=data[i+2]; 
    const mx=Math.max(rr,gg,bb),mn=Math.min(rr,gg,bb); 
    let weight=1; 
    if(preferPure){ const sat=(mx-mn)/255; const lum=(0.2126*rr+0.7152*gg+0.0722*bb)/255; weight=0.6+0.5*sat+0.1*Math.abs(lum-0.5);} 
    pts.push([rr,gg,bb]); pos.push([x/w,y/h]); wts.push(weight);
  } 
  const centers=[],labCenters=[]; 
  for(let i=0;i<k;i++){ const p=pts[Math.floor(Math.random()*pts.length)]; centers.push(p); labCenters.push(rgbToLab(p)); } 
  let changed=true,iter=0; const assign=new Array(pts.length).fill(0); 
  while(changed && iter<12){ 
    iter++; changed=false; 
    const buckets=Array.from({length:k},()=>({sum:[0,0,0],w:0})); 
    for(let i=0;i<pts.length;i++){ 
      const lp=rgbToLab(pts[i]); let bi=0,bd=1e9; 
      for(let j=0;j<k;j++){ const d=distLab(lp,labCenters[j]); if(d<bd){bd=d; bi=j} } 
      assign[i]=bi; const b=buckets[bi]; const wt=wts[i]; 
      b.sum[0]+=pts[i][0]*wt; b.sum[1]+=pts[i][1]*wt; b.sum[2]+=pts[i][2]*wt; b.w+=wt; 
    } 
    for(let j=0;j<k;j++){ 
      if(buckets[j].w>0){ 
        const nc=[buckets[j].sum[0]/buckets[j].w,buckets[j].sum[1]/buckets[j].w,buckets[j].sum[2]/buckets[j].w]; 
        const nl=rgbToLab(nc); 
        if(distLab(nl,labCenters[j])>1){ changed=true; labCenters[j]=nl; centers[j]=nc; } 
      } 
    } 
  } 
  const coords=[]; 
  for(let j=0;j<k;j++){ 
    let bestI=-1,bestD=1e9; const cl=labCenters[j]; 
    for(let i=0;i<pts.length;i++){ if(assign[i]!==j) continue; const d=distLab(rgbToLab(pts[i]),cl); if(d<bestD){ bestD=d; bestI=i; } } 
    coords.push(bestI>=0?pos[bestI]:[0.5,0.5]); 
  } 
  centers.sort((a,b)=> rgbToLab(b)[0]-rgbToLab(a)[0]); 
  return {colors:centers.map(c=>[Math.round(c[0]),Math.round(c[1]),Math.round(c[2])]), coords}; 
}

// ---------- Mix solving ----------
function solveWeights(targetRgb, subset){ 
  const A=subset.map(ink=>hexToRgb(ink.hex)).map(v=>v.map(s=>{s/=255; return s<=0.04045? s/12.92: Math.pow((s+0.055)/1.055,2.4)})); 
  const c=targetRgb.map(s=>{s/=255; return s<=0.04045? s/12.92: Math.pow((s+0.055)/1.055,2.4)}); 
  const n=A.length; let w=Array(n).fill(1/n); 
  function mulAw(w){ const y=[0,0,0]; for(let j=0;j<n;j++){ y[0]+=A[j][0]*w[j]; y[1]+=A[j][1]*w[j]; y[2]+=A[j][2]*w[j]; } return y; } 
  function grad(w){ const y=mulAw(w); const r=[y[0]-c[0],y[1]-c[1],y[2]-c[2]]; const g=Array(n).fill(0); for(let j=0;j<n;j++){ g[j]=2*(A[j][0]*r[0]+A[j][1]*r[1]+A[j][2]*r[2]) } return g; } 
  function projectSimplex(v){ const u=[...v].sort((a,b)=>b-a); let css=0,rho=0; for(let i=0;i<v.length;i++){ css+=u[i]; if(u[i]+(1-css)/(i+1)>0) rho=i } const theta=(1-u.slice(0,rho+1).reduce((s,x)=>s+x,0))/(rho+1); return v.map(x=> Math.max(0,x+theta)); } 
  let t=0.1; for(let it=0; it<400; it++){ const g=grad(w); w=w.map((wi,i)=> wi - t*g[i]); w=projectSimplex(w); t*=0.98; } 
  return w; 
}
function pickSubset(targetHex,brandInks){ 
  const targetLab=rgbToLab(hexToRgb(targetHex)); 
  const arr=brandInks.map(ink=>({ink,d:distLab(targetLab,rgbToLab(hexToRgb(ink.hex)))})); 
  arr.sort((a,b)=>a.d-b.d); 
  const chosen=arr.slice(0,3).map(x=>x.ink); 
  const L=targetLab[0]; 
  const hasWhite=brandInks.find(i=>/white/i.test(i.name)), hasBlack=brandInks.find(i=>/black/i.test(i.name)); 
  if(L>70 && hasWhite && !chosen.includes(hasWhite)) chosen.push(hasWhite); 
  if(L<30 && hasBlack && !chosen.includes(hasBlack)) chosen.push(hasBlack); 
  return chosen.slice(0,4); 
}
function computeAllRecipes(){ 
  const inks=BRANDS[state.brand]; 
  const capDrops={S:20,M:40,L:80}[state.cap]; 
  const results=state.swatches.map(hx=>{ 
    const subset=pickSubset(hx,inks); 
    const w=solveWeights(hexToRgb(hx),subset); 
    const comp=subset.map((ink,i)=>({ink,w:w[i]})).filter(x=>x.w>0.02).sort((a,b)=>b.w-a.w).slice(0,4); 
    const sum=comp.reduce((s,c)=>s+c.w,0)||1; comp.forEach(c=>c.w/=sum); 
    const raw=comp.map(c=>c.w*capDrops); 
    const drops=raw.map(x=>Math.max(0,Math.round(x))); 
    let diff=capDrops - drops.reduce((s,x)=>s+x,0); 
    while(diff!==0){ const idx=drops.indexOf(Math.max(...drops)); drops[idx]+= (diff>0?1:-1); diff=capDrops - drops.reduce((s,x)=>s+x,0); } 
    comp.forEach((c,i)=> c.drops=drops[i]); 
    return {hex:hx,comp,total:capDrops}; 
  }); 
  state._results=results; 
  renderRecipes(); 
}
function renderRecipes(){ 
  recipes.innerHTML=''; 
  const unit= state.tier==='basic' ? 'drops' : unitSel.value; 
  state._results.forEach(res=>{ 
    const card=document.createElement('div'); card.className='recipe'; 
    const sw=document.createElement('div'); sw.className='sw'; sw.style.background=res.hex; 
    const body=document.createElement('div'); 
    const hdr=document.createElement('div'); hdr.style.fontWeight='700'; hdr.textContent=res.hex; 
    const meta=document.createElement('div'); meta.className='hint'; meta.textContent=`${state.brand} • ${state.cap} • total ${res.total} drops`; 
    const list=document.createElement('div'); list.className='inkrow'; 
    res.comp.forEach(c=>{ 
      let value=''; 
      if(unit==='drops') value=`${c.drops} drops`; 
      else if(unit==='percent') value=`${Math.round(c.w*100)}%`; 
      else if(unit==='ml') value=`${(c.drops*0.05).toFixed(2)} ml`; 
      else if(unit==='oz') value=`${(c.drops*0.05/29.5735).toFixed(3)} oz`; 
      const chip=document.createElement('div'); chip.className='chip'; chip.textContent=`${c.ink.name}: ${value}`; 
      list.appendChild(chip); 
    }); 
    body.appendChild(hdr); body.appendChild(meta); body.appendChild(list); 
    card.appendChild(sw); card.appendChild(body); 
    recipes.appendChild(card); 
  }); 
}
function flash(m){ statusChip.textContent=m; setTimeout(()=> statusChip.textContent='Ready',1100); }

// ---------- Save/Load & Export ----------
btnSave.onclick=()=>{ 
  if(state.tier==='basic'){ flash('Pro only'); return; } 
  const payload={brand:state.brand,cap:state.cap,unit:unitSel.value,swatches:state.swatches,markers:state.markers,studio:studioInput.value,client:clientInput.value,date:dateInput.value,placement:placementInput.value}; 
  const blob=new Blob([JSON.stringify(payload)],{type:'application/json'}); 
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tattoo_lab_session.tatmix'; a.click(); 
};
btnLoad.onclick=()=>{ if(state.tier==='basic'){ flash('Pro only'); return; } loadInput.click(); };
loadInput.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; const txt=await f.text(); try{ const o=JSON.parse(txt); state.brand=o.brand||state.brand; brandSel.value=state.brand; state.cap=o.cap||state.cap; capSel.value=state.cap; state.swatches=o.swatches||state.swatches; state.markers=o.markers||[]; studioInput.value=o.studio||''; clientInput.value=o.client||''; dateInput.value=o.date||''; placementInput.value=o.placement||''; renderPalette(); computeAllRecipes(); drawMarkers(); flash('Loaded'); }catch{ flash('Invalid file'); } };

function buildPages(includeMarkers){ 
  const A4W=1654,A4H=2339; 
  const pages=[]; let idx=0; 
  const perPageHeader=720,itemH=96; 
  const maxPerPage=Math.max(1,Math.floor((A4H-perPageHeader)/itemH)); 
  while(idx<state._results.length || (idx===0 && state._results.length===0)){ 
    const c=document.createElement('canvas'); c.width=A4W; c.height=A4H; const cx=c.getContext('2d'); 
    cx.fillStyle=root.classList.contains('light')?'#ffffff':'#0b0e13'; cx.fillRect(0,0,A4W,A4H); 
    cx.fillStyle=root.classList.contains('light')?'#0b1220':'#eef2f8'; cx.font='bold 42px Inter, Arial'; cx.fillText('Tattoo Lab — Mix Sheet',64,86); 
    cx.font='16px Inter, Arial'; cx.fillText(`Brand: ${state.brand}   Cap: ${state.cap}   Units: ${state.tier==='basic'?'drops':unitSel.value}`,64,126); 
    const metaY=164; cx.font='14px Inter, Arial'; cx.fillText(`Studio/Artist: ${studioInput.value||'-'}`,64,metaY); cx.fillText(`Client: ${clientInput.value||'-'}`,64,metaY+22); cx.fillText(`Date: ${dateInput.value||'-'}`,64,metaY+44); cx.fillText(`Placement: ${placementInput.value||'-'}`,64,metaY+66); 
    const refX=64,refY=metaY+96,refW=A4W-128,refH=420; cx.strokeStyle=root.classList.contains('light')?'#dbe1ec':'#1f2736'; cx.lineWidth=2; cx.strokeRect(refX,refY,refW,refH); 
    if(canvas.width>0){ 
      const scale=Math.min(refW/canvas.width,refH/canvas.height); 
      const w=Math.floor(canvas.width*scale), h=Math.floor(canvas.height*scale); 
      const ox=refX+Math.floor((refW-w)/2), oy=refY+Math.floor((refH-h)/2); 
      cx.drawImage(canvas,0,0,canvas.width,canvas.height,ox,oy,w,h); 
      if(includeMarkers){ 
        for(let i=0;i<state.markers.length;i++){ 
          const m=state.markers[i]; const mx=ox+m.x*w, my=oy+m.y*h; 
          cx.fillStyle='#ffffff'; cx.beginPath(); cx.arc(mx,my,14,0,Math.PI*2); cx.fill(); 
          cx.lineWidth=3; cx.strokeStyle='#ff7a1a'; cx.stroke(); 
          cx.fillStyle='#0b1220'; cx.font='bold 16px Inter, Arial'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(String(i+1),mx,my+1); 
          cx.textAlign='start'; cx.textBaseline='alphabetic'; 
        } 
      } 
    } 
    let px=64,py=refY+refH+24; const step=140,size=64; const maxShow=Math.min(10,state.swatches.length); 
    for(let i=0;i<maxShow;i++){ const hx=state.swatches[i]; cx.fillStyle=hx; cx.strokeStyle=root.classList.contains('light')?'#dbe1ec':'#1f2736'; cx.lineWidth=2; cx.beginPath(); cx.roundRect(px,py,size,size,14); cx.fill(); cx.stroke(); cx.fillStyle=root.classList.contains('light')?'#0b1220':'#eef2f8'; cx.font='12px Inter, Arial'; cx.fillText(hx,px,py+size+18); px+=step; if(px > A4W-64-step){ px=64; py += size+36; } } 
    let ry=perPageHeader; const start=idx; const end=Math.min(state._results.length,idx+maxPerPage); 
    for(let j=start;j<end;j++){ 
      const res=state._results[j]; 
      cx.fillStyle=res.hex; cx.strokeStyle=root.classList.contains('light')?'#dbe1ec':'#1f2736'; cx.lineWidth=2; cx.beginPath(); cx.roundRect(64,ry+10,48,48,10); cx.fill(); cx.stroke(); 
      cx.fillStyle=root.classList.contains('light')?'#0b1220':'#eef2f8'; cx.font='bold 18px Inter, Arial'; cx.fillText(res.hex,64+60,ry+32); 
      cx.font='12px Inter, Arial'; cx.fillText(`${state.brand} • ${state.cap} • total ${res.total} drops`,64+60,ry+52); 
      let cx0=64+60, cy0=ry+72, chipH=22; 
      res.comp.forEach(c=>{ 
        const label=`${c.ink.name}: ${c.drops} drops`; 
        const mw=Math.max(110,Math.ceil(cx.measureText(label).width)+20); 
        cx.fillStyle=root.classList.contains('light')?'#f3f5f9':'#0c0f15'; cx.strokeStyle=root.classList.contains('light')?'#c8d2e6':'#2a354b'; cx.lineWidth=1.5; 
        cx.beginPath(); cx.roundRect(cx0,cy0,mw,chipH,11); cx.fill(); cx.stroke(); 
        cx.fillStyle=root.classList.contains('light')?'#0b1220':'#eef2f8'; cx.font='12px Inter, Arial'; cx.fillText(label,cx0+10,cy0+15); 
        cx0 += mw + 10; if(cx0 > (A4W-64-110)){ cx0 = 64+60; cy0 += chipH + 8; } 
      }); 
      ry += 96; 
    } 
    pages.push(c); idx=end; if(idx>=state._results.length) break; 
  } 
  return pages; 
}
btnExportPNG.onclick=()=>{ if(state.tier==='basic'){ flash('Pro only'); return; } const pages=buildPages(true); pages.forEach((cv,i)=>{ const a=document.createElement('a'); a.href=cv.toDataURL('image/png'); a.download=`TattooLab_mix_p${i+1}.png`; a.click(); }); };
btnExportPDF.onclick=()=>{ if(state.tier==='basic'){ flash('Pro only'); return; } const pages=buildPages(true); const w=window.open('','_blank'); w.document.write('<html><head><title>Tattoo Lab — Print</title><style>img{max-width:100%;page-break-after:always;margin:0;display:block}</style></head><body></body></html>'); pages.forEach(cv=>{ const img=w.document.createElement('img'); img.src=cv.toDataURL('image/png'); w.document.body.appendChild(img); }); w.document.close(); w.focus(); setTimeout(()=> w.print(),300); };

// ---------- Style toggles ----------
$('btnStyleSquare').onclick=()=>{ if(state.tier==='basic'){ flash('Pro only'); return; } state.style='pngSquare'; renderPalette(); };
$('btnStyleSplatPng').onclick=()=>{ if(state.tier==='basic'){ flash('Pro only'); return; } state.style='pngSplat'; renderPalette(); };
$('btnStyleSplatSvg').onclick=()=>{ if(state.tier==='basic'){ flash('Pro only'); return; } state.style='svgSplat'; renderPalette(); };
$('btnSplatConfig').onclick=()=>{ if(state.tier==='basic'){ flash('Pro only'); return; } $('splatInput').value=localStorage.getItem('tl-splat')||''; $('splatModal').style.display='flex'; };
$('splatSave').onclick=()=>{ const val=$('splatInput').value.trim(); if(val){ localStorage.setItem('tl-splat',val);} else { localStorage.removeItem('tl-splat'); } renderPalette(); flash('Splat path saved'); };
$('splatClear').onclick=()=>{ localStorage.removeItem('tl-splat'); renderPalette(); flash('Splat path cleared'); };
$('splatClose').onclick=()=>{ $('splatModal').style.display='none'; };

// ---------- Selects & init ----------
brandSel.onchange=()=>{ state.brand=brandSel.value; computeAllRecipes(); };
capSel.onchange=()=>{ state.cap=capSel.value; computeAllRecipes(); };
unitSel.onchange=()=>{ if(state.tier==='basic'){ unitSel.value='drops'; return; } renderRecipes(); };

let CUSTOM_SPLAT_PATH = localStorage.getItem('tl-splat') || null;
renderPalette(); computeAllRecipes(); setTier('basic');

// ---------- License: Firebase Realtime Database (one-time use) ----------
(function initRealtimeLicense(){
  try{
    if(!window.TL_CONFIG?.proGate) return;
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.TL_CONFIG.firebase);
    const auth = firebase.auth();
    const db = firebase.database();

    auth.signInAnonymously().catch(()=>{});

    const DEVICE_KEY = 'tl-device-id';
    let deviceId = localStorage.getItem(DEVICE_KEY);
    if(!deviceId){ deviceId = (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())); localStorage.setItem(DEVICE_KEY, deviceId); }

    if(localStorage.getItem('tl-pro-unlocked') === '1'){
      try{ setTier && setTier('pro'); }catch(e){}
    }

    const btnEnterKey = document.getElementById('btnEnterKey') || (typeof btnUpgrade !== 'undefined' ? btnUpgrade : null);
    const unlockModal = document.getElementById('unlockModal');
    const unlockCancel = document.getElementById('unlockCancel');
    const unlockConfirm = document.getElementById('unlockConfirm');
    const licenseInput = document.getElementById('licenseInput');
    const unlockStatus = document.getElementById('unlockStatus');

    if(btnEnterKey){
      btnEnterKey.onclick = ()=>{
        if(unlockStatus) unlockStatus.textContent='';
        if(licenseInput) licenseInput.value='';
        unlockModal.style.display='flex';
      };
    }
    if(unlockCancel){ unlockCancel.onclick = ()=> unlockModal.style.display='none'; }

    async function redeemKey(key){
      const ref = db.ref('licenses/'+key);
      const snap = await ref.get();
      if(!snap.exists()) return {ok:false, msg:'Invalid license key.'};
      const data = snap.val();
      if(data.used){
        if(data.claimedBy === deviceId){
          return {ok:true, already:true};
        }
        return {ok:false, msg:'This key has already been used.'};
      }
      const res = await ref.transaction(curr => {
        if(curr && curr.used === true) return;
        return {
          ...(curr||{}),
          used: true,
          claimedBy: deviceId,
          claimedAt: firebase.database.ServerValue.TIMESTAMP
        };
      }, {applyLocally:false});
      if(!res.committed){
        return {ok:false, msg:'This key has already been used.'};
      }
      return {ok:true};
    }

    if(unlockConfirm){
      unlockConfirm.onclick = async ()=>{
        const key = (licenseInput.value||'').trim();
        if(!key){ unlockStatus.textContent='Enter a license key.'; return; }
        unlockStatus.textContent='Checking key...';
        try{
          const out = await redeemKey(key);
          if(out.ok){
            localStorage.setItem('tl-pro-unlocked','1');
            try{ setTier && setTier('pro'); }catch(e){}
            unlockModal.style.display='none';
            if(typeof flash!=='undefined') flash(out.already?'Pro already unlocked on this device':'Pro unlocked — welcome!');
          }else{
            unlockStatus.textContent = out.msg || 'Could not redeem key.';
          }
        }catch(e){
          console.error(e);
          unlockStatus.textContent='Could not redeem key. Try again.';
        }
      };
    }
  }catch(e){ console.error('Realtime license init failed', e); }
})();
