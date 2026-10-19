// skins/glyphs.mjs - the shared GEOMETRY of the symbol vocabulary: arm glyphs, posture marks, corps badges, echelon marks.  Pure path-drawing functions, no state, no colours of their own:
// every function takes the context, a centre, a half-size and a style {ink, fill, lw}.  A skin chooses the style (hairline or heavy, filled or outlined, glowing or inked); the SHAPES
// are shared so that "infantry", "retreat" or "the Maltese cross" mean the same thing in every skin and in every legend.
//
// Only context calls that skins/contract.mjs's recordingContext implements are used (no ellipse, no radial gradient, no strokeText), so the shipped conformance check can run on any skin.
//
// What each shape stands for is defined in semantics.mjs (CHANNELS); the arm glyphs follow the APP-6 grammar (04-benchmarks.md R01: infantry = crossed lines, cavalry = one diagonal,
// artillery = filled circle); the corps badges are the seven shapes of the circular of 21 March 1863 (03-data-fuel.md section 5).  Posture marks are this project's own pictograms.

const TAU = Math.PI * 2;
const poly = (c, pts, cx, cy, s) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(cx + p[0] * s, cy + p[1] * s) : c.moveTo(cx + p[0] * s, cy + p[1] * s))); c.closePath(); };
const dot = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };

/** arm glyphs.  (cx, cy) centre, s half-size (a 6 px half-size fills a 12 px cell).  st = { ink, lw }.  state = 'mounted'|'dismounted'|'deployed'|'limbered'|null */
export function armGlyph(c, arm, cx, cy, s, st, state = null) {
  c.strokeStyle = st.ink; c.fillStyle = st.ink; c.lineWidth = st.lw; c.lineCap = 'round'; c.lineJoin = 'round';
  if (arm === 'infantry') {
    c.beginPath(); c.moveTo(cx - s, cy - s * 0.78); c.lineTo(cx + s, cy + s * 0.78); c.moveTo(cx + s, cy - s * 0.78); c.lineTo(cx - s, cy + s * 0.78); c.stroke();
  } else if (arm === 'cavalry') {
    c.beginPath(); c.moveTo(cx - s, cy + s * 0.8); c.lineTo(cx + s, cy - s * 0.8); c.stroke();
    if (state === 'dismounted') { c.beginPath(); c.moveTo(cx - s * 0.9, cy + s * 1.0); c.lineTo(cx + s * 0.9, cy + s * 1.0); c.stroke(); }   // standing on the ground; mounted cavalry is the plain slash
  } else if (arm === 'artillery') {
    const r = s * (state === 'limbered' ? 0.52 : 0.72);
    if (state === 'limbered') { dot(c, cx - s * 0.5, cy, r); c.beginPath(); c.arc(cx + s * 0.62, cy, r * 0.78, 0, TAU); c.stroke(); }   // gun hitched to its limber
    else { dot(c, cx, cy - (state === 'deployed' ? s * 0.12 : 0), r); if (state === 'deployed') { c.beginPath(); c.moveTo(cx, cy + r * 0.6); c.lineTo(cx, cy + s * 0.98); c.stroke(); } }   // trail on the ground
  } else if (arm === 'mixed') {
    for (let i = -1; i <= 1; i++) dot(c, cx + i * s * 0.78, cy, s * 0.24);
  }
}

/** echelon marks, APP-6 style: battalion II (two ticks), brigade X, division XX, corps XXX.  Centred on (cx, cy); half-height s. */
export function echelonMarks(c, level, cx, cy, s, st, maxW = Infinity) {
  c.strokeStyle = st.ink; c.lineWidth = st.lw; c.lineCap = 'round';
  c.beginPath();
  if (level === 1) { c.moveTo(cx - s * 0.45, cy - s * 0.8); c.lineTo(cx - s * 0.45, cy + s * 0.8); c.moveTo(cx + s * 0.45, cy - s * 0.8); c.lineTo(cx + s * 0.45, cy + s * 0.8); }
  else if (level >= 2) {
    const n = level - 1; const pitch = Math.min(s * 1.0, maxW / n); const x0 = cx - (n - 1) * pitch / 2; const a = Math.min(s * 0.55, pitch * 0.4);
    for (let i = 0; i < n; i++) { const x = x0 + i * pitch; c.moveTo(x - a, cy - a); c.lineTo(x + a, cy + a); c.moveTo(x + a, cy - a); c.lineTo(x - a, cy + a); }
  }
  c.stroke();
}

/** posture marks (Modelled).  s = half-size, about 3.5 for a 7 px mark.  st = { ink, lw } */
export function postureMark(c, posture, cx, cy, s, st) {
  c.strokeStyle = st.ink; c.fillStyle = st.ink; c.lineWidth = st.lw; c.lineCap = 'round'; c.lineJoin = 'round';
  switch (posture) {
    case 'line': c.fillRect(cx - s, cy - st.lw * 0.7, s * 2, st.lw * 1.4); break;                                                        // a formed line
    case 'charge': poly(c, [[0.5, -1], [-0.62, 0.12], [0.02, 0.12], [-0.5, 1], [0.7, -0.18], [0.04, -0.18]], cx, cy, s); c.fill(); break; // a burst
    case 'retreat': c.beginPath(); c.moveTo(cx - s * 0.7, cy - s); c.lineTo(cx - s * 0.7, cy + s); c.stroke(); poly(c, [[-0.7, -1], [1, -0.3], [-0.7, 0.4]], cx, cy, s); c.fill(); break;   // a flag
    case 'march': for (let i = -1; i <= 1; i++) dot(c, cx + i * s * 0.95, cy, s * 0.26); break;                                           // a column of dots
    case 'skirmish': for (const p of [[-0.8, -0.5], [0.1, -0.9], [0.9, -0.1], [-0.2, 0.55], [0.7, 0.9]]) dot(c, cx + p[0] * s, cy + p[1] * s, s * 0.24); break;   // scattered
    case 'reserve': c.beginPath(); c.arc(cx, cy, s * 0.78, 0, TAU); c.stroke(); break;                                                    // held back
    case 'bivouac': poly(c, [[-1, 0.8], [0, -0.95], [1, 0.8]], cx, cy, s); c.fill(); break;                                               // a tent
    default: break;
  }
}

/** Union corps badges (Documented, circular of 21 March 1863).  r = radius of the circumscribed circle; st = { fill, edge, lw } (edge may be null). */
export function corpsBadge(c, shape, cx, cy, r, st) {
  const paint = () => { if (st.fill) { c.fillStyle = st.fill; c.fill(); } if (st.edge) { c.strokeStyle = st.edge; c.lineWidth = st.lw; c.lineJoin = 'round'; c.stroke(); } };
  switch (shape) {
    case 'sphere': c.beginPath(); c.arc(cx, cy, r * 0.92, 0, TAU); paint(); break;
    case 'trefoil': {
      c.beginPath(); const R = r * 0.5; const d = r * 0.5;
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; const x = cx + Math.cos(a) * d; const y = cy + Math.sin(a) * d + r * 0.06; c.moveTo(x + R, y); c.arc(x, y, R, 0, TAU); }
      paint(); break;
    }
    case 'lozenge': poly(c, [[0, -1.12], [0.82, 0], [0, 1.12], [-0.82, 0]], cx, cy, r); paint(); break;
    case 'maltese': poly(c, [[-0.2, -1], [0, -0.78], [0.2, -1], [0.34, -0.34], [1, -0.2], [0.78, 0], [1, 0.2], [0.34, 0.34], [0.2, 1], [0, 0.78], [-0.2, 1], [-0.34, 0.34], [-1, 0.2], [-0.78, 0], [-1, -0.2], [-0.34, -0.34]], cx, cy, r); paint(); break;
    case 'cross': poly(c, [[-0.27, -1], [0.27, -1], [0.27, -0.27], [1, -0.27], [1, 0.27], [0.27, 0.27], [0.27, 1], [-0.27, 1], [-0.27, 0.27], [-1, 0.27], [-1, -0.27], [-0.27, -0.27]], cx, cy, r); paint(); break;
    case 'crescent': {
      c.beginPath(); c.arc(cx, cy, r * 0.95, 0, TAU); c.moveTo(cx + r * 0.3 + r * 0.7, cy); c.arc(cx + r * 0.3, cy, r * 0.7, 0, TAU);
      if (st.fill) { c.fillStyle = st.fill; c.fill('evenodd'); } if (st.edge) { c.strokeStyle = st.edge; c.lineWidth = st.lw; c.stroke(); } break;
    }
    case 'star': { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.42 : r * 1.06; const x = cx + Math.cos(a) * rr; const y = cy + Math.sin(a) * rr; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); paint(); break; }
    default: break;
  }
}

/** Rounded rectangle path (no paint). */
export function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
}

/** Rectangle with two opposite corners cut (top-left and bottom-right by k): the Confederate silhouette of the Field Manual skin.  Redundant with colour: silhouette first, colour second. */
export function chamfer(c, x, y, w, h, k) {
  c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h - k); c.lineTo(x + w - k, y + h); c.lineTo(x, y + h); c.lineTo(x, y + k); c.closePath();
}

/** a swallow-tailed pennant (the 1863 skin's flag): hoist at x, fly end at x + w, notch depth n */
export function pennant(c, x, y, w, h, n) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - n, y + h / 2); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath();
}

/** Rectangle with all four corners cut by k (an octagonal silhouette): the War Room's Confederate plate */
export function bevel(c, x, y, w, h, k) {
  c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + w - k, y); c.lineTo(x + w, y + k); c.lineTo(x + w, y + h - k); c.lineTo(x + w - k, y + h); c.lineTo(x + k, y + h); c.lineTo(x, y + h - k); c.lineTo(x, y + k); c.closePath();
}

/** chevron marks (rank-insignia style echelon): n nested V shapes, centred on (cx, cy), half-width a */
export function chevrons(c, n, cx, cy, a, st, maxH = Infinity) {
  c.strokeStyle = st.ink; c.lineWidth = st.lw; c.lineCap = 'round'; c.lineJoin = 'round';
  const pitch = Math.min(a * 0.62, maxH / Math.max(1, n)); const h = a * 0.7; const y0 = cy - ((n - 1) * pitch) / 2 - h / 2;
  c.beginPath();
  for (let i = 0; i < n; i++) { const y = y0 + i * pitch; c.moveTo(cx - a, y + h); c.lineTo(cx, y); c.lineTo(cx + a, y + h); }
  c.stroke();
}
