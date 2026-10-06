import fs from 'node:fs';
const which = process.argv[2] || 'R1c';
const SUF = process.argv[3] === 'phone' ? '-phone' : '';
const r = JSON.parse(fs.readFileSync(`tmp/pitch-anim/popups/out/cover-${which}${SUF}.json`, 'utf8'));
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const mean = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null);
const out = { which, event: {}, sample5: {} };
for (const cam of ['def', 'follow']) {
  for (const z of r.zooms) {
    const rows = r.event.filter((e) => e.zoom === z && e[cam]);
    const T = rows.map((e) => (cam === 'def' ? e.def.transient : e.follow.transient));
    const P = rows.map((e) => (cam === 'def' ? e.def.persistent : e.follow.persistent));
    const subjRows = rows.filter((e, i) => T[i].subjTotal > 0);
    const subjT = subjRows.map((e) => (cam === 'def' ? e.def.transient : e.follow.transient));
    const subjP = subjRows.map((e) => (cam === 'def' ? e.def.persistent : e.follow.persistent));
    const subjAny = subjRows.map((e, i) => (subjT[i].subjDetail.filter((d) => d.inView && d.coveredBy.length).length + 0) + (subjP[i].subjDetail.filter((d) => d.inView && d.coveredBy.length).length));
    const subjBoth = subjRows.filter((e, i) => { const idsT = new Set(subjT[i].subjDetail.filter((d) => d.inView && d.coveredBy.length).map((d) => d.id)); const idsP = new Set(subjP[i].subjDetail.filter((d) => d.inView && d.coveredBy.length).map((d) => d.id)); return idsT.size + idsP.size > 0; }).length;
    const tilesVis = T.map((t) => t.tilesVisible);
    out.event[`${cam}@z${z}`] = {
      snapshots: rows.length,
      tilesVisibleMean: mean(tilesVis),
      tilesCoveredByCards: { mean: mean(T.map((t) => t.anyTiles)), median: q(T.map((t) => t.anyTiles), .5), p95: q(T.map((t) => t.anyTiles), .95), max: Math.max(...T.map((t) => t.anyTiles)) },
      tilesHalfHiddenByCards: { mean: mean(T.map((t) => t.anyHalf)), max: Math.max(...T.map((t) => t.anyHalf)) },
      labelsCovered: { mean: mean(T.map((t) => t.anyLabels)), max: Math.max(...T.map((t) => t.anyLabels)) },
      snapshotsWithAnyTileCovered: T.filter((t) => t.anyTiles > 0).length,
      persistentTilesCovered: { mean: mean(P.map((t) => t.anyTiles)), max: Math.max(...P.map((t) => t.anyTiles)) },
      withSubjectsOnScreen: subjRows.length,
      subjectTileUnderACard: subjT.filter((t) => t.subjCovered > 0).length,
      subjectTileUnderAnyOverlay: subjBoth,
      subjectTilesTotal: subjT.reduce((a, t) => a + t.subjTotal, 0),
      subjectTilesUnderCards: subjT.reduce((a, t) => a + t.subjCovered, 0),
    };
  }
}
for (const z of r.zooms) {
  const rows = r.sample5.filter((e) => e.zoom === z);
  out.sample5[`z${z}`] = {
    samples: rows.length,
    tilesVisibleMean: mean(rows.map((e) => e.tiles)),
    persistentTilesCoveredMean: mean(rows.map((e) => e.persistentTiles)),
    persistentTilesCoveredMax: Math.max(...rows.map((e) => e.persistentTiles)),
    persistentHalfHiddenMean: mean(rows.map((e) => e.persistentHalf)),
    persistentHalfHiddenMax: Math.max(...rows.map((e) => e.persistentHalf)),
    samplesWithAHalfHiddenTile: rows.filter((e) => e.persistentHalf > 0).length,
    samplesWithAnyTileCovered: rows.filter((e) => e.persistentTiles > 0).length,
    labelsCoveredMean: mean(rows.map((e) => e.persistentLabels)),
    byOverlayMeanTiles: Object.fromEntries((SUF ? ['mlegend', 'mminimap', 'mtop', 'mdays', 'timeline'] : ['legend', 'minimap', 'hud', 'trailsbtn', 'tourbtn', 'navctrl', 'attrib', 'timeline']).map((n) => [n, mean(rows.map((e) => (e.byPopup[n] ? e.byPopup[n].tiles : 0)))])),
    tilesUnderUnitPanelRectMean: mean(rows.map((e) => e.underPanel)),
    shareTilesUnderUnitPanelRect: +(rows.reduce((a, e) => a + e.underPanel, 0) / Math.max(1, rows.reduce((a, e) => a + e.tiles, 0))).toFixed(3),
  };
}
fs.writeFileSync(`tmp/pitch-anim/popups/out/cover-summary-${which}${SUF}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
