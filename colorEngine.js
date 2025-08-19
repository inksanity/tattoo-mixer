
/* Tattoo Lab - colorEngine.js */
(function(global){
  const clamp01 = x => Math.min(1, Math.max(0, x));
  function srgbToLinear(c){ return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); }
  function linearToSrgb(c){ return c<=0.0031308 ? 12.92*c : 1.055*Math.pow(c,1/2.4)-0.055; }
  function hexToRgb(hx){ hx=hx.replace('#',''); return [parseInt(hx.slice(0,2),16),parseInt(hx.slice(2,4),16),parseInt(hx.slice(4,6),16)]; }
  const to01 = ([r,g,b]) => [r/255,g/255,b/255];

  function rgb01ToCMY([r,g,b]){ const rl=srgbToLinear(r), gl=srgbToLinear(g), bl=srgbToLinear(b); return [1-rl,1-gl,1-bl]; }
  function cmyToRgb01([C,M,Y]){ const rl=1-C, gl=1-M, bl=1-Y; return [linearToSrgb(rl),linearToSrgb(gl),linearToSrgb(bl)]; }

  function mixSubtractiveCMY(colors01, weights){
    let C=1,M=1,Y=1,W=0;
    for(let i=0;i<colors01.length;i++){
      const w = Math.max(0, weights?.[i] ?? 1);
      const [c,m,y] = rgb01ToCMY(colors01[i]);
      C *= Math.pow(Math.min(1,Math.max(0,c)), w);
      M *= Math.pow(Math.min(1,Math.max(0,m)), w);
      Y *= Math.pow(Math.min(1,Math.max(0,y)), w);
      W += w;
    }
    if(W>0){ C**=(1/W); M**=(1/W); Y**=(1/W); }
    return cmyToRgb01([C,M,Y]);
  }

  // OKLab helpers (Björn Ottosson)
  function srgb01ToOkLab([r,g,b]){
    const R=srgbToLinear(r), G=srgbToLinear(g), B=srgbToLinear(b);
    const l = 0.4122214708*R + 0.5363325363*G + 0.0514459929*B;
    const m = 0.2119034982*R + 0.6806995451*G + 0.1073969566*B;
    const s = 0.0883024619*R + 0.2817188376*G + 0.6299787005*B;
    const l_=Math.cbrt(l), m_=Math.cbrt(m), s_=Math.cbrt(s);
    const L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_;
    const a = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_;
    const b2= 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_;
    return [L,a,b2];
  }
  function okLabToSrgb01([L,a,b]){
    const l_ = L + 0.3963377774*a + 0.2158037573*b;
    const m_ = L - 0.1055613458*a - 0.0638541728*b;
    const s_ = L - 0.0894841775*a - 1.2914855480*b;
    const l = l_**3, m = m_**3, s = s_**3;
    const R = +4.0767416621*l - 3.3077115913*m + 0.2309699292*s;
    const G = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s;
    const B = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s;
    function toSRGB(x){ return x<=0.0031308 ? 12.92*x : 1.055*(x**(1/2.4))-0.055; }
    return [toSRGB(R), toSRGB(G), toSRGB(B)];
  }
  function okLabDeltaE(a,b){ const dL=a[0]-b[0], da=a[1]-b[1], db=a[2]-b[2]; return Math.sqrt(dL*dL+da*da+db*db); }

  function projectSimplex(v){
    const n=v.length, u=[...v].sort((x,y)=>y-x); let css=0, rho=-1;
    for(let i=0;i<n;i++){ css+=u[i]; if(u[i]+(1-css)/(i+1)>0) rho=i; }
    const theta=(1-u.slice(0,rho+1).reduce((s,x)=>s+x,0))/(rho+1);
    return v.map(x=>Math.max(0,x+theta));
  }

  function refineWeightsSubtractive(inksHex, initW, targetHex, iters=80, step=0.2){
    let w = initW.slice(); const sum=w.reduce((s,x)=>s+x,0)||1; w=w.map(x=>x/sum);
    const inks01 = inksHex.map(h=>to01(hexToRgb(h)));
    const tgt01 = to01(hexToRgb(targetHex)); const tgtLab = srgb01ToOkLab(tgt01);
    for(let it=0; it<iters; it++){
      const mix01 = mixSubtractiveCMY(inks01, w);
      const mixLab = srgb01ToOkLab(mix01);
      const base = okLabDeltaE(mixLab, tgtLab);
      const g = new Array(w.length).fill(0);
      const eps=1e-2;
      for(let j=0;j<w.length;j++){
        let w2=w.slice(); w2[j]=Math.max(0,w2[j]+eps); w2=projectSimplex(w2);
        const mix2 = mixSubtractiveCMY(inks01, w2);
        const loss2 = okLabDeltaE(srgb01ToOkLab(mix2), tgtLab);
        g[j]=(loss2-base)/eps;
      }
      for(let j=0;j<w.length;j++) w[j]-= step*g[j];
      w = projectSimplex(w);
      step*=0.97;
    }
    return w;
  }

  global.TLColor = { mixSubtractiveCMY, srgbToOkLab: srgb01ToOkLab, okLabToSrgb: okLabToSrgb01, refineWeightsSubtractive };
})(typeof window!=='undefined' ? window : globalThis);
