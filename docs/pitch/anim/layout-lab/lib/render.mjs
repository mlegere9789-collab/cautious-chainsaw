// layout-lab/lib/render.mjs - renders a solved frame as SVG (pure string building: runs in node, and in the browser lab).
// This is a LAYOUT proof-of-rendering, not the final tile design: chip = side colour + arm glyph + short code + strength bar (+ count badge for aggregates).
import { verifyFrame } from './geom.mjs';

const COL = { union: '#3a6bc4', confederate: '#c43a3a' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = (n) => (Math.round(n * 10) / 10);

function glyph(arm, x, y) {            // 14 x 14 box at (x,y): infantry = x, cavalry = slash, artillery = dot
  const c = '#fff';
  if (arm === 'cavalry') return `<line x1="${x + 3}" y1="${y + 12}" x2="${x + 11}" y2="${y + 2}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
  if (arm === 'artillery') return `<circle cx="${x + 7}" cy="${y + 7}" r="3.2" fill="${c}"/>`;
  if (arm === 'mixed') return `<path d="M${x + 3} ${y + 3}L${x + 11} ${y + 11}M${x + 11} ${y + 3}L${x + 3} ${y + 11}" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/><circle cx="${x + 7}" cy="${y + 7}" r="1.6" fill="${c}"/>`;
  return `<path d="M${x + 3} ${y + 3}L${x + 11} ${y + 11}M${x + 11} ${y + 3}L${x + 3} ${y + 11}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
}

/** res = solver result; view = {x0,y0,w,h} in layout world px; opts: { spec, title, showTrue:boolean, marks:'overlaps'|false, scale } */
export function renderSvg(res, view, opts = {}) {
  const spec = opts.spec; const sc = opts.scale ?? 1;
  const inView = (r) => r.x1 > view.x0 - 5 && r.x0 < view.x0 + view.w + 5 && r.y1 > view.y0 - 5 && r.y0 < view.y0 + view.h + 5;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${f1(view.w * sc)}" height="${f1(view.h * sc)}" viewBox="${f1(view.x0)} ${f1(view.y0)} ${f1(view.w)} ${f1(view.h)}" font-family="'Segoe UI',system-ui,Arial,sans-serif">`);
  out.push(`<defs><linearGradient id="mix" x1="0" x2="1"><stop offset="0.5" stop-color="${COL.union}"/><stop offset="0.5" stop-color="${COL.confederate}"/></linearGradient></defs>`);
  out.push(`<rect x="${view.x0}" y="${view.y0}" width="${view.w}" height="${view.h}" fill="${opts.bg || '#10151c'}"/>`);
  if (opts.grid) { const g = opts.grid; for (let x = Math.ceil(view.x0 / g) * g; x < view.x0 + view.w; x += g) out.push(`<line x1="${x}" y1="${view.y0}" x2="${x}" y2="${view.y0 + view.h}" stroke="#1a222c" stroke-width="1"/>`); for (let y = Math.ceil(view.y0 / g) * g; y < view.y0 + view.h; y += g) out.push(`<line x1="${view.x0}" y1="${y}" x2="${view.x0 + view.w}" y2="${y}" stroke="#1a222c" stroke-width="1"/>`); }
  // leaders first (under everything)
  for (const p of res.placed) {
    if (!p.displaced) continue;
    if (!inView({ x0: Math.min(p.t.ax, p.cx), x1: Math.max(p.t.ax, p.cx), y0: Math.min(p.t.ay, p.cy), y1: Math.max(p.t.ay, p.cy) })) continue;
    const c = p.chip; const tx = Math.max(c.x0, Math.min(c.x1, p.t.ax)); const ty = Math.max(c.y0, Math.min(c.y1, p.t.ay));
    out.push(`<line x1="${f1(p.t.ax)}" y1="${f1(p.t.ay)}" x2="${f1(tx)}" y2="${f1(ty)}" stroke="rgba(255,255,255,.55)" stroke-width="1"/>`);
  }
  // aggregate hulls (member spread) as thin dashed circles + member pins
  for (const p of res.placed) {
    if (p.t.kind !== 'agg' || !opts.hulls) continue;
    const stack = [...p.t.members]; const pts = []; while (stack.length) { const q = stack.pop(); if (q.members) stack.push(...q.members); else pts.push(q); }
    for (const q of pts) out.push(`<circle cx="${f1(q.ax)}" cy="${f1(q.ay)}" r="1.6" fill="rgba(255,255,255,.7)"/>`);
  }
  // pins of displaced tiles
  for (const p of res.placed) if (p.displaced && inView({ x0: p.t.ax - 3, x1: p.t.ax + 3, y0: p.t.ay - 3, y1: p.t.ay + 3 })) out.push(`<circle cx="${f1(p.t.ax)}" cy="${f1(p.t.ay)}" r="${spec.pinHalf}" fill="#fff" stroke="#10151c" stroke-width=".8"/>`);
  // chips
  for (const p of res.placed) {
    const c = p.chip; if (!inView(c)) continue; const t = p.t;
    const w = c.x1 - c.x0; const h = c.y1 - c.y0; const r = spec.ring; const bw = w - 2 * r; const bh = h - 2 * r;
    const fill = t.side === 'mixed' ? 'url(#mix)' : COL[t.side];
    const agg = t.kind === 'agg';
    if (agg) out.push(`<rect x="${f1(c.x0 + r - 1.5)}" y="${f1(c.y0 + r - 1.5)}" width="${f1(bw + 3)}" height="${f1(bh + 3)}" rx="4" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>`);
    out.push(`<rect x="${f1(c.x0 + r)}" y="${f1(c.y0 + r)}" width="${f1(bw)}" height="${f1(bh)}" rx="3" fill="${fill}" fill-opacity=".95" stroke="rgba(255,255,255,.9)" stroke-width="1"/>`);
    out.push(glyph(t.arm, c.x0 + r + 3, c.y0 + r + 1));
    const codeX = c.x0 + r + 3 + spec.glyphW + spec.glyphGap - 1;
    out.push(`<text x="${f1(codeX)}" y="${f1(c.y0 + r + (bh - 3) / 2 + 4)}" font-size="11" font-weight="700" fill="#fff">${esc(t.short)}</text>`);
    // strength bar (inside, bottom)
    out.push(`<rect x="${f1(c.x0 + r + 2)}" y="${f1(c.y1 - r - 4)}" width="${f1(bw - 4)}" height="2" rx="1" fill="rgba(0,0,0,.45)"/><rect x="${f1(c.x0 + r + 2)}" y="${f1(c.y1 - r - 4)}" width="${f1(Math.max(0, Math.min(1, t.ratio ?? 1)) * (bw - 4))}" height="2" rx="1" fill="#fff"/>`);
    if (agg) { const bwid = bw * 0.0; out.push(`<text x="${f1(c.x1 - r - 4)}" y="${f1(c.y0 + r + (bh - 3) / 2 + 4)}" font-size="10" font-weight="700" fill="#fff" text-anchor="end">${esc(t.badge)}</text>`); }
  }
  // labels
  for (const p of res.placed) {
    if (!p.label || !inView(p.label.rect)) continue; const r = p.label.rect;
    const anchor = p.label.slot === 'l' ? 'end' : (p.label.slot === 'r' ? 'start' : 'middle'); const x = p.label.slot === 'l' ? r.x1 - 4 : p.label.slot === 'r' ? r.x0 + 4 : (r.x0 + r.x1) / 2;
    out.push(`<text x="${f1(x)}" y="${f1((r.y0 + r.y1) / 2 + 4)}" font-size="12" font-weight="600" text-anchor="${anchor}" fill="#eef3fa" stroke="#10151c" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${esc(p.t.labelText)}</text>`);
  }
  // overlap marks
  if (opts.marks) {
    const v = verifyFrame(res.items, (spec?.gap ?? 2) - 1e-6, true);
    for (const [i, j] of v.pairs) for (const k of [i, j]) { const it = res.items[k]; if (inView(it)) out.push(`<rect x="${f1(it.x0)}" y="${f1(it.y0)}" width="${f1(it.x1 - it.x0)}" height="${f1(it.y1 - it.y0)}" fill="rgba(255,0,200,.18)" stroke="#ff2bd6" stroke-width="1"/>`); }
  }
  if (opts.title) out.push(`<text x="${view.x0 + 8}" y="${view.y0 + 18}" font-size="13" font-weight="700" fill="#e8d5a3">${esc(opts.title)}</text>`);
  out.push('</svg>');
  return out.join('\n');
}

/** legacy drawing (rotated rect glyphs + black pill labels) for the "as shipped" panels */
export function renderLegacySvg(L, view, opts = {}) {
  const sc = opts.scale ?? 1; const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${f1(view.w * sc)}" height="${f1(view.h * sc)}" viewBox="${f1(view.x0)} ${f1(view.y0)} ${f1(view.w)} ${f1(view.h)}" font-family="sans-serif">`);
  out.push(`<rect x="${view.x0}" y="${view.y0}" width="${view.w}" height="${view.h}" fill="${opts.bg || '#10151c'}"/>`);
  const inV = (x, y) => x > view.x0 - 130 && x < view.x0 + view.w + 130 && y > view.y0 - 30 && y < view.y0 + view.h + 30;
  L.pe.forEach((p, i) => { const g = L.glyphs[i]; if (!inV(g.cx, g.cy)) return;
    if (Math.hypot(p.dx, p.dy) >= 3) out.push(`<line x1="${f1(p.x)}" y1="${f1(p.y)}" x2="${f1(g.cx)}" y2="${f1(g.cy)}" stroke="${p.u.side === 'union' ? 'rgba(80,120,200,.4)' : 'rgba(180,80,60,.4)'}" stroke-width=".5"/>`);
    const col = p.u.side === 'union' ? '#3a6bc4' : '#c43a3a';
    out.push(`<polygon points="${g.poly.map((q) => f1(q[0]) + ',' + f1(q[1])).join(' ')}" fill="${col}" fill-opacity=".88" stroke="${p.u.side === 'union' ? '#1a3a7a' : '#7a1a1a'}" stroke-width="1"/>`);
    out.push(`<circle cx="${f1(g.cx)}" cy="${f1(g.cy - 7)}" r="3.5" fill="#aaa" stroke="rgba(0,0,0,.8)" stroke-width="1"/>`); });
  L.labels.forEach((l) => { if (!inV((l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2)) return; out.push(`<rect x="${f1(l.x0)}" y="${f1(l.y0)}" width="${f1(l.x1 - l.x0)}" height="${f1(l.y1 - l.y0)}" fill="rgba(0,0,0,.72)"/>`); });
  if (opts.title) out.push(`<text x="${view.x0 + 8}" y="${view.y0 + 18}" font-size="13" font-weight="700" fill="#e8d5a3">${esc(opts.title)}</text>`);
  out.push('</svg>'); return out.join('\n');
}
