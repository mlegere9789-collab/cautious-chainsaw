// tools/colour.mjs - a verbatim copy of docs/pitch/anim2/symbology/src/colour.mjs (WCAG 2.x contrast, CIEDE2000, colour-vision simulation; the symbology job wrote and tested it), so this folder stands alone.
// src/colour.mjs - colour maths used by the pipeline and by the tests: WCAG 2.x relative luminance and contrast ratio, CIE Lab and CIEDE2000, and colour-vision-deficiency simulation.
// Pure functions, no dependencies, runs in node and in the browser.
//
// WCAG relative luminance:  L = 0.2126 R + 0.7152 G + 0.0722 B  with  c = c8/255,  c_lin = c/12.92 (c <= 0.04045; WCAG text says 0.03928, an erratum with no effect on 8-bit values) else ((c+0.055)/1.055)^2.4
//   source: https://www.w3.org/WAI/GL/wiki/Relative_luminance (read 2026-10-06).  Contrast ratio (L1+0.05)/(L2+0.05): https://www.w3.org/TR/WCAG22/ (SC 1.4.3, 1.4.11).
// CVD simulation: the 3x3 matrices of Machado, Oliveira and Fernandes (2009), severity 1.0, from https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html (read 2026-10-06).  That page does not say in which space
//   they apply; they are applied here to LINEAR sRGB and the result is clipped to 0..1 and re-encoded (assumption, the usual practice).

export const hexToRgb = (hex) => { let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((x) => x + x).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
export const rgbToHex = (rgb) => '#' + rgb.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
export const lin = (c8) => { const c = c8 / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const enc = (l) => { const c = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, c * 255)); };
export const luminance = (hex) => { const [r, g, b] = hexToRgb(hex); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
export const contrast = (a, b) => { const la = luminance(a); const lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

/** alpha-composite a colour (hex, alpha) over an opaque hex background */
export const over = (fg, alpha, bg) => { const F = hexToRgb(fg); const B = hexToRgb(bg); return rgbToHex(F.map((v, i) => v * alpha + B[i] * (1 - alpha))); };
export const mix = (a, b, k) => { const A = hexToRgb(a); const B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * k)); };

// ---- CIE Lab (D65) and CIEDE2000 -------------------------------------------------------------------------------------------------------------------------
export function rgbToLab(hex) {
  const [r8, g8, b8] = hexToRgb(hex); const r = lin(r8); const g = lin(g8); const b = lin(b8);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047; const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b; const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X); const fy = f(Y); const fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
export function deltaE2000(lab1, lab2) {
  const [L1, a1, b1] = lab1; const [L2, a2, b2] = lab2; const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1); const C2 = Math.hypot(a2, b2); const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1; const a2p = (1 + G) * a2; const C1p = Math.hypot(a1p, b1); const C2p = Math.hypot(a2p, b2);
  const h = (b, a) => { const x = Math.atan2(b, a) / rad; return x >= 0 ? x : x + 360; };
  const h1p = C1p === 0 ? 0 : h(b1, a1p); const h2p = C2p === 0 ? 0 : h(b2, a2p);
  const dLp = L2 - L1; const dCp = C2p - C1p;
  let dhp = 0; if (C1p * C2p !== 0) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * rad / 2);
  const Lbp = (L1 + L2) / 2; const Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p; if (C1p * C2p === 0) hbp = h1p + h2p; else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2; else hbp = (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2;
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2)); const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2); const Sc = 1 + 0.045 * Cbp; const Sh = 1 + 0.015 * Cbp * T; const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}
export const deltaE = (hexA, hexB) => deltaE2000(rgbToLab(hexA), rgbToLab(hexB));

// ---- colour-vision-deficiency simulation (severity 1.0) -----------------------------------------------------------------------------------------------
export const CVD_MATRICES = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
export const CVD_TYPES = ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
/** simulate one colour (hex) as seen by a viewer with the named deficiency; 'achromatopsia' = the WCAG relative-luminance grey */
export function simulate(hex, type) {
  if (type === 'normal') return hex;
  const [r8, g8, b8] = hexToRgb(hex); const v = [lin(r8), lin(g8), lin(b8)];
  if (type === 'achromatopsia') { const y = 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; const e = enc(y); return rgbToHex([e, e, e]); }
  const M = CVD_MATRICES[type]; return rgbToHex(M.map((row) => enc(row[0] * v[0] + row[1] * v[1] + row[2] * v[2])));
}
/** a piece of JS (as text) that applies the same simulation to an ImageData in the browser, so the simulation sheet uses exactly these matrices */
export const SIM_SOURCE = `(function(){const M=${JSON.stringify(CVD_MATRICES)};const L=new Float32Array(256);for(let i=0;i<256;i++){const c=i/255;L[i]=c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
const E=(l)=>{const c=l<=0.0031308?l*12.92:1.055*Math.pow(l,1/2.4)-0.055;return Math.max(0,Math.min(255,Math.round(c*255)));};
return function(img,type){const d=img.data;for(let i=0;i<d.length;i+=4){const r=L[d[i]],g=L[d[i+1]],b=L[d[i+2]];if(type==='achromatopsia'){const e=E(0.2126*r+0.7152*g+0.0722*b);d[i]=d[i+1]=d[i+2]=e;continue;}const m=M[type];d[i]=E(m[0][0]*r+m[0][1]*g+m[0][2]*b);d[i+1]=E(m[1][0]*r+m[1][1]*g+m[1][2]*b);d[i+2]=E(m[2][0]*r+m[2][1]*g+m[2][2]*b);}return img;};})()`;
