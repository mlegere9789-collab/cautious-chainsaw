// tools/frame-check.mjs - the INDEPENDENT check of a drawn frame: a brute-force routine that shares no code with the engine's verifier.  It runs inside the page (page.evaluate(frameCheck)) on the
// frame the page just drew.  The "vital core" of a tile is its box (the mark and its code, one object), the name that has grown out of it (the label rectangle) and the pin at its true position.
// Reports: core overlaps (tile box against tile box), pins covered (a box lying on another tile's true position), label overlaps, the smallest gap between two cores, unrepresented units,
// and what the crowd marks stand for (marks, records merged).
export function frameCheck() {
  const S = window.__studio; const f = S.engine.frame; const dx = f.view.dx; const dy = f.view.dy; const spec = f.spec; const items = [];
  for (const t of f.tiles) {
    if (t.life !== 'live' && t.life !== 'dying') continue; if (t.opacity < 0.5) continue;
    const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; items.push({ o: t.key, k: 'core', x0: t.x + dx - hw, y0: t.y + dy - hh, x1: t.x + dx + hw, y1: t.y + dy + hh });
    if (t.label && t.label.opacity >= 0.5) items.push({ o: t.key, k: 'label', x0: t.label.x0 + dx, y0: t.label.y0 + dy, x1: t.label.x1 + dx, y1: t.label.y1 + dy });
    if (t.displaced) { const h = spec.pinHalf; items.push({ o: t.key, k: 'pin', x0: t.px + dx - h, y0: t.py + dy - h, x1: t.px + dx + h, y1: t.py + dy + h }); }
  }
  let coreOver = 0; let pinCovered = 0; let labelOver = 0; let minGap = Infinity; const worst = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i]; const b = items[j]; if (a.o === b.o) continue; if (a.k === 'pin' && b.k === 'pin') continue;
    const gx = Math.max(a.x0 - b.x1, b.x0 - a.x1); const gy = Math.max(a.y0 - b.y1, b.y0 - a.y1); const gap = Math.max(gx, gy);
    if (a.k === 'core' && b.k === 'core' && gap < minGap) minGap = gap;
    if (gx < -1e-6 && gy < -1e-6) { const kinds = [a.k, b.k].sort().join('+'); if (kinds === 'core+core') coreOver++; else if (kinds.includes('pin')) pinCovered++; else labelOver++; if (worst.length < 4) worst.push([a.o, a.k, b.o, b.k]); }
  }
  const live = f.tiles.filter((t) => t.life === 'live'); const aggs = live.filter((t) => t.kind === 'agg');
  const rect = (t) => ({ x: t.x + dx, y: t.y + dy });
  return { tiles: live.length, marks: live.filter((t) => t.kind === 'leaf').length, crowds: aggs.length, merged: aggs.reduce((s, t) => s + t.n, 0), onField: f.onField, unrepresented: f.unrepresented, coreOverlaps: coreOver, pinsCovered: pinCovered, labelOverlaps: labelOver, minCoreGap: minGap === Infinity ? null : +minGap.toFixed(2), engineOverlaps: f.overlaps, names: live.filter((t) => t.label && t.label.opacity >= 0.99).length, displaced: live.filter((t) => t.displaced).length, worst, rect: null, cardsOver: S.cardStats ? S.cardStats.over : null };
}
