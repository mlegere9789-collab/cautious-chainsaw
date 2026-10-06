// How well do popup data point at tiles? Which referenced unit ids have a drawn tile (latest keyframe <= tick) and how far is the
// vignette's declared lat/lng from them. All numbers computed from release/R1c/dist/data (= the data the app loads).
import fs from 'node:fs';
const D = 'release/R1c/dist/data/';
const J = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const files = fs.readdirSync(D).filter((f) => /^(placements_day|density_)/.test(f));
const kf = {}; // unit -> sorted [{tick,lat,lng}]
let rows = 0;
for (const f of files) {
  const j = J(f); const arr = Array.isArray(j) ? j : j.placements || [];
  for (const p of arr) { if (!p.unit_id || p.lat == null) continue; (kf[p.unit_id] ||= []).push({ tick: p.tick, lat: p.lat, lng: p.lng }); rows++; }
}
for (const u in kf) kf[u].sort((a, b) => a.tick - b.tick);
const posAt = (u, T) => { const a = kf[u]; if (!a) return null; let r = null; for (const k of a) { if (k.tick <= T) r = k; else break; } return r; };
const hav = (a, b, c, d) => { const R = 6371000, r = Math.PI / 180, dl = (c - a) * r, dg = (d - b) * r; const x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const out = { keyframeRows: rows, units: Object.keys(kf).length };
// vignettes
const vg = [1, 2, 3].flatMap((p) => J(`vignettes_part${p}.json`).vignettes);
out.vig = vg.map((v) => {
  const fe = (v.units_featured || []).map((u) => { const p = posAt(u, v.trigger_tick); return { u, hasKeyframes: !!kf[u], tile: !!p, dM: p ? Math.round(hav(v.trigger_lat, v.trigger_lng, p.lat, p.lng)) : null }; });
  return { id: v.vignette_id, tick: v.trigger_tick, featured: fe.length, withTile: fe.filter((x) => x.tile).length, dMs: fe.map((x) => x.dM) };
});
out.vigSummary = { total: vg.length, vignettesWithAtLeastOneFeaturedTile: out.vig.filter((v) => v.withTile > 0).length, featuredIds: out.vig.reduce((a, v) => a + v.featured, 0), featuredIdsWithTile: out.vig.reduce((a, v) => a + v.withTile, 0), allDistancesM: out.vig.flatMap((v) => v.dMs).filter((x) => x != null).sort((a, b) => a - b) };
// events
const ev = [1, 2, 3].flatMap((d) => J(`chronology_day${d}.json`).events).filter((e) => e.significance !== 'low');
const evr = ev.map((e) => { const ids = e.units_involved || []; const w = ids.filter((u) => posAt(u, e.tick)); return { tick: e.tick, sig: e.significance, ids: ids.length, withTile: w.length }; });
out.evSummary = { events: ev.length, withNoUnitsListed: evr.filter((e) => e.ids === 0).length, withAtLeastOneTile: evr.filter((e) => e.withTile > 0).length, withNoTile: evr.filter((e) => e.ids > 0 && e.withTile === 0).length, idsTotal: evr.reduce((a, e) => a + e.ids, 0), idsWithTile: evr.reduce((a, e) => a + e.withTile, 0) };
// raw ids in the copy that the app prints
out.rawIdLeaks = { storyBadgeIds: vg.filter((v) => (v.units_featured || []).length).length, eventTextWithInternalIds: ev.filter((e) => /\b(CS|V|CH|SUC)-\d{2,3}\b/.test(e.event + ' ' + (e.narrative || ''))).map((e) => [e.tick, (e.event.match(/\b(CS|V|CH|SUC)-\d{2,3}\b/) || [])[0]]) };
fs.writeFileSync('tmp/pitch-anim/popups/out/anchors.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ keyframeRows: out.keyframeRows, units: out.units, vigSummary: { ...out.vigSummary, allDistancesM: out.vigSummary.allDistancesM.join(',') }, evSummary: out.evSummary, rawIdLeaks: out.rawIdLeaks }, null, 1));
console.log(out.vig.map((v) => `${v.id} t${v.tick} feat=${v.featured} tiles=${v.withTile} d=${v.dMs.join('/')}`).join('\n'));
