// layout-lab/lib/expand.mjs - the EXPANDABLE LIST: the user opens an aggregate tile and its members appear as a fixed-slot roster (strategy (c) used as the
// expansion of strategy (a)).  The roster is a macro tile (header + a grid of member chips in order-of-battle order, one fixed slot per member), placed with the
// same exact nearest-free search among every other chip, label and true position of the frame; the members' own true positions stay visible as pins with leaders.
// If no free place exists within `budget` px the expansion falls back to a docked panel (reported, never an overlap).
import { nearestFree, Occ, chipRect } from './engine.mjs';
import { verifyFrame } from './geom.mjs';

function leavesOf(t) { if (!t.members) return [t]; return t.members.flatMap(leavesOf); }

export function expandAggregate(res, aggKey, spec, { budget = 200, maxCols = 4, cap = 24 } = {}) {
  const agg = res.placed.find((p) => p.t.key === aggKey); if (!agg) throw new Error('no such aggregate ' + aggKey);
  const members = leavesOf(agg.t).sort((a, b) => ((a.chain.slice().reverse().join('>') + a.key) < (b.chain.slice().reverse().join('>') + b.key) ? -1 : 1));
  const shown = members.slice(0, cap); const more = members.length - shown.length;
  const gap = spec.gap; const cw = Math.max(...shown.map((t) => t.chipW)) + gap; const ch = spec.chipH + gap;
  const cols = Math.max(1, Math.min(maxCols, shown.length)); const rows = Math.ceil(shown.length / cols);
  const headerH = 16; const gridW = cols * cw; const gridH = rows * ch + (more ? 14 : 0);
  const parts = [{ x0: -gridW / 2, y0: -(gridH + headerH) / 2, x1: gridW / 2, y1: -(gridH + headerH) / 2 + headerH }];   // header strip
  const slots = shown.map((t, i) => ({ t, dx: ((i % cols) - (cols - 1) / 2) * cw, dy: -(gridH + headerH) / 2 + headerH + gap + (Math.floor(i / cols) + 0.5) * ch - gap / 2 }));
  for (const s of slots) parts.push({ x0: s.dx - s.t.chipW / 2, y0: s.dy - spec.chipH / 2, x1: s.dx + s.t.chipW / 2, y1: s.dy + spec.chipH / 2 });
  if (more) parts.push({ x0: -gridW / 2, y0: (gridH + headerH) / 2 - 14, x1: gridW / 2, y1: (gridH + headerH) / 2 });
  // obstacles: every OTHER tile's chip / label / true position, and the true positions of the members (their pins must stay visible)
  const occ = new Occ(64);
  for (const p of res.placed) {
    if (p === agg) continue;
    occ.add({ ...p.chip, owner: p.t.key, kind: 'chip' });
    if (p.label) occ.add({ ...p.label.rect, owner: p.t.key, kind: 'label' });
    occ.add({ x0: p.t.ax - spec.pinHalf, y0: p.t.ay - spec.pinHalf, x1: p.t.ax + spec.pinHalf, y1: p.t.ay + spec.pinHalf, owner: p.t.key, kind: 'pin' });
  }
  for (const t of shown) occ.add({ x0: t.ax - spec.pinHalf, y0: t.ay - spec.pinHalf, x1: t.ax + spec.pinHalf, y1: t.ay + spec.pinHalf, owner: t.key, kind: 'pin' });
  const A = { x: agg.t.ax, y: agg.t.ay }; const P0 = { x: agg.cx, y: agg.cy };
  const c = nearestFree(parts, A, P0, budget, occ, '<roster>', gap, { nf: 0, cand: 0 }, 400);
  if (!c) return { ok: false, members: members.length, shown: shown.length };
  // build the new frame: every other tile unchanged, the aggregate replaced by the roster
  const placed = res.placed.filter((p) => p !== agg); const items = res.items.filter((i) => i.owner !== agg.t.key);
  const header = { x0: c.x + parts[0].x0, y0: c.y + parts[0].y0, x1: c.x + parts[0].x1, y1: c.y + parts[0].y1, owner: aggKey + ':header', kind: 'chip' };
  items.push({ ...header });
  const rosterPlaced = [];
  slots.forEach((s) => {
    const cx = c.x + s.dx; const cy = c.y + s.dy; const chip = chipRect(s.t, cx, cy); chip.owner = s.t.key; chip.kind = 'chip';
    rosterPlaced.push({ t: s.t, cx, cy, off: { ox: cx - s.t.ax, oy: cy - s.t.ay }, chip, label: null, displaced: true, rosterOf: aggKey });
    items.push({ owner: s.t.key, kind: 'chip', x0: chip.x0, y0: chip.y0, x1: chip.x1, y1: chip.y1 });
    items.push({ owner: s.t.key, kind: 'pin', x0: s.t.ax - spec.pinHalf, y0: s.t.ay - spec.pinHalf, x1: s.t.ax + spec.pinHalf, y1: s.t.ay + spec.pinHalf });
  });
  const v = verifyFrame(items, gap - 1e-6);
  return { ok: true, members: members.length, shown: shown.length, more, overlaps: v.overlaps, clearanceViolations: v.clearanceViolations, header, cols, rows, displacementPx: Math.hypot(c.x - A.x, c.y - A.y),
    res: { ...res, placed: [...placed, ...rosterPlaced], items, overlays: [{ rect: { x0: header.x0, y0: header.y0, x1: header.x1, y1: header.y0 + gridH + headerH }, title: `${agg.t.short} ${agg.t.badge}  (${members.length} units)` }] } };
}
