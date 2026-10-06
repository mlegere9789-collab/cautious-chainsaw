import fs from 'node:fs';
const which = process.argv[2] || 'R1c';
const T = JSON.parse(fs.readFileSync(`tmp/pitch-anim/popups/out/timing-${which}.json`, 'utf8'));
const D = 'release/R1c/dist/data/';
const J = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const ev = [1, 2, 3].flatMap((d) => J(`chronology_day${d}.json`).events).filter((e) => e.significance !== 'low');
const vg = [1, 2, 3].flatMap((p) => J(`vignettes_part${p}.json`).vignettes);
const cs = J('oob/commander_successions.json'); const succ = [...cs.union_successions, ...cs.confederate_successions];
const [FROM, TO] = T.window;
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const out = {};
for (const [sp, run] of Object.entries(T.speeds)) {
  const evs = run.log.ev.filter((r) => r.tickOnly === undefined);
  // segments
  const seg = (getter) => { const S = []; let cur = null; for (const r of evs) { const v = getter(r); if (cur && v !== cur.v) { S.push({ ...cur, end: r.t }); cur = null; } if (!cur && v) cur = { v, t0: r.t, tick: r.tick }; } if (cur) S.push({ ...cur, end: evs.length ? evs[evs.length - 1].t : cur.t0 }); return S; };
  const eSeg = seg((r) => r.event), sSeg = seg((r) => r.story);
  // toasts: track each distinct text's first appearance and disappearance
  const tmap = new Map(); for (const r of evs) { const set = new Set(r.toasts || []); for (const t of set) if (!tmap.has(t) || tmap.get(t).end !== null) { if (!tmap.has(t) || tmap.get(t).end !== null) tmap.set(t, { t0: r.t, end: null, tick: r.tick }); } for (const [t, o] of tmap) if (o.end === null && !set.has(t)) o.end = r.t; }
  const tSeg = [...tmap.entries()].map(([k, o]) => ({ v: k, ...o, dur: o.end == null ? null : o.end - o.t0 }));
  const expEvents = ev.filter((e) => e.tick > FROM && e.tick < TO);
  const expStories = vg.filter((v) => v.trigger_tick > FROM - 3 && v.trigger_tick < TO);
  const expSucc = succ.filter((s2) => s2.approx_tick > FROM && s2.approx_tick <= TO);
  const matchedE = expEvents.filter((e) => eSeg.some((s2) => s2.v && e.event.startsWith(s2.v.slice(0, 40))));
  const eDur = eSeg.map((s2) => s2.end - s2.t0);
  const sDur = sSeg.map((s2) => s2.end - s2.t0);
  const fr = run.log.frames.slice(5);
  out[sp] = {
    wallMs: run.wallMs, windowTicks: [FROM, TO], eventsExpected: expEvents.length, eventCardsRendered: eSeg.length, eventsMatched: matchedE.length, eventsNeverRendered: expEvents.length - matchedE.length,
    eventCardMs: { min: Math.round(Math.min(...eDur)), median: Math.round(q(eDur, .5)), p90: Math.round(q(eDur, .9)), max: Math.round(Math.max(...eDur)), idealTickMs: 500 / +sp },
    storiesExpected: expStories.length, storySegments: sSeg.length, storyMs: sDur.length ? { min: Math.round(Math.min(...sDur)), median: Math.round(q(sDur, .5)), max: Math.round(Math.max(...sDur)) } : null,
    successionsExpected: expSucc.length, toastsSeen: tSeg.length, toastMs: tSeg.filter((x) => x.dur).length ? { min: Math.round(Math.min(...tSeg.filter((x) => x.dur).map((x) => x.dur))), median: Math.round(q(tSeg.filter((x) => x.dur).map((x) => x.dur), .5)), max: Math.round(Math.max(...tSeg.filter((x) => x.dur).map((x) => x.dur))) } : null,
    frames: { n: fr.length, p50: +q(fr, .5).toFixed(1), p95: +q(fr, .95).toFixed(1), max: +Math.max(...fr).toFixed(1), over33ms: fr.filter((x) => x > 33.4).length, over50ms: fr.filter((x) => x > 50).length },
    longtasks: run.log.longtasks.length, longtaskMs: run.log.longtasks.length ? Math.max(...run.log.longtasks.map((l) => l[1])) : 0,
    pillPositions: [...new Set(evs.map((r) => (r.pill || []).join(',')))].length,
  };
}
fs.writeFileSync(`tmp/pitch-anim/popups/out/timing-summary-${which}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
