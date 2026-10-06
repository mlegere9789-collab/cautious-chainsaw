// v7b-fifteen.mjs - fifteen popup / caption texts, drawn from the page exactly as a viewer sees them (DOM text of the live page), each mapped fragment by fragment to the source record it comes from
// (file, id, field), read from baseline/dist/data.  Output: results/v7b-fifteen.json (the report prints the table from it).
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, PROTO, REPO, args, writeJson } from './lib.mjs';
import { rj, loadOob, loadKeyframes } from './srcdata.mjs';

const norm = (s) => s.replace(/\s+/g, ' ').trim();
// the source index: every string with where it lives
const IDX = []; const add = (str, where) => { if (typeof str === 'string' && str.trim()) IDX.push([norm(str), where]); };
for (const d of [1, 2, 3]) for (const e of rj(`chronology_day${d}.json`).events) { add(e.event, `chronology_day${d}.json event tick ${e.tick} .event`); add(e.narrative, `chronology_day${d}.json event tick ${e.tick} .narrative`); add(e.location, `chronology_day${d}.json event tick ${e.tick} .location`); }
for (const p of [1, 2, 3]) for (const v of rj(`vignettes_part${p}.json`).vignettes) { add(v.title, `vignettes_part${p}.json ${v.vignette_id} .title`); add(v.panel_summary, `vignettes_part${p}.json ${v.vignette_id} .panel_summary`); add(v.trigger_location, `vignettes_part${p}.json ${v.vignette_id} .trigger_location`); for (const para of String(v.full_script).split(/\n{2,}/)) add(para, `vignettes_part${p}.json ${v.vignette_id} .full_script`); }
const sj = rj('oob/commander_successions.json'); for (const r of [...sj.union_successions, ...sj.confederate_successions]) for (const [k, v] of Object.entries(r)) add(v, `oob/commander_successions.json ${r.event_id} .${k}`);
const oob = loadOob(); for (const o of oob.values()) for (const [k, v] of Object.entries(o.raw)) { if (typeof v === 'string') add(v, `oob/${o.file} ${o.id} .${k}`); else if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) add(v2, `oob/${o.file} ${o.id} .${k}.${k2}`); }
const kf = loadKeyframes(); for (const [id, arr] of kf.units) for (const r of arr) if (r.notes) add(r.notes, `placements ${id} tick ${r.tick} .notes`);
const tour = JSON.parse(fs.readFileSync(path.join(PROTO, 'data', 'popup-data.json'), 'utf8')).tour; for (const t of tour) { add(t.title, `bundle NPS tour stop ${t.id} .title`); add(t.subtitle, `bundle NPS tour stop ${t.id} .subtitle`); for (const para of t.narrative.split(/\n{2,}/)) add(para, `bundle NPS tour stop ${t.id} .narrative`); }
const find = (frag) => { const f = norm(frag).replace(/…$/, ''); if (f.length < 14) return null; const hit = IDX.find(([s]) => s.includes(f)); return hit ? hit[1] : null; };

const PORT = +(args.port || 9703); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'fifteen' });
const LEAVES = `(() => { const out = []; for (const r of document.querySelectorAll('#popups .pc, #pop-rail, #narration')) { const w = document.createTreeWalker(r, NodeFilter.SHOW_ELEMENT); let n; while ((n = w.nextNode())) { if (n.children.length === 0 && n.textContent.trim()) { const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.display === 'none') continue; out.push(n.textContent.replace(/\\s+/g, ' ').trim()); } } } return out; })()`;
const items = [];
const grab = async (label, kind, setup) => { const texts = await s.page.evaluate(({ setup, LEAVES }) => { const S = window.__studio; const E = S.engine; if (S.director.running) S.director.stop('closed'); S.host.closeRail && S.host.closeRail(); S.host.dismissAll && S.host.dismissAll(); S.narration.hide && S.narration.hide(); E.select(null); S.host.setSelected && S.host.setSelected(null); const T0 = S.host.state.mod.tour; if (T0) { T0.active = false; T0.phase = 'idle'; } E.transport.pause(); for (let i = 0; i < 12; i++) S.step(1, 50); eval(setup); return eval(LEAVES); }, { setup, LEAVES }); items.push({ label, kind, texts }); };
try {
  const step = 'for (let i = 0; i < 40; i++) S.step(1, 16.667);';
  await grab('event card, critical (tick 28)', 'event card', `E.transport.pause(); E.transport.seek(28, { glide: false }); ${step}`);
  await grab('event card, critical (tick 551)', 'event card', `E.transport.pause(); E.transport.seek(551, { glide: false }); ${step}`);
  await grab('event card, critical (tick 518, text quotes "1:00pm")', 'event card', `E.transport.pause(); E.transport.seek(518, { glide: false }); ${step}`);
  await grab('story peek: The First Shot (tick 12)', 'story card', `E.transport.pause(); E.transport.seek(12, { glide: false }); ${step}`);
  await grab('story peek: Armistead at The Angle (tick 551)', 'story card', `E.transport.pause(); E.transport.seek(551, { glide: false }); ${step}`);
  await grab('story rail (full script) V-001', 'story rail', `E.transport.pause(); E.transport.seek(12, { glide: false }); ${step} S.host.openRail('story-card:story-V-001'); ${step}`);
  await grab('command toast: Reynolds killed (tick 28)', 'command toast', `E.transport.pause(); E.transport.seek(28, { glide: false }); ${step}`);
  await grab('command toasts: burst at tick 550', 'command toast', `E.transport.pause(); E.transport.seek(550, { glide: false }); ${step}`);
  await grab('command cross-out: Sherrill -> Bull (tick 551)', 'cross-out', `E.transport.pause(); E.transport.seek(551, { glide: false }); ${step}`);
  await grab('unit card (rail): Battery A, 4th US Artillery (tick 552)', 'unit card', `E.transport.pause(); E.transport.seek(552, { glide: false }); ${step} E.select('U-ART-A4US'); S.host.setSelected('U-ART-A4US'); ${step} S.host.openRail([...S.host.cards.keys()].find((x) => x.startsWith('unit-card:sel-'))); ${step}`);
  await grab('unit card: a Contested unit U-5TX (tick 150)', 'unit card', `E.transport.pause(); E.transport.seek(150, { glide: false }); ${step} E.select('U-5TX'); S.host.setSelected('U-5TX'); ${step} S.host.openRail([...S.host.cards.keys()].find((x) => x.startsWith('unit-card:sel-'))); ${step}`);
  await grab('day banner (tick 226)', 'day banner', `E.transport.pause(); E.transport.seek(225, { glide: false }); ${step} E.transport.play(); for (let i = 0; i < 80; i++) S.step(1, 16.667); E.transport.pause();`);
  await grab('auto-tour stop 1 (rail, preview)', 'tour popup', `E.transport.pause(); S.host.preview('tour'); ${step} for (let i = 0; i < 30; i++) S.step(1, 50);`);
  await grab('showcase caption: step "open" (tick 548)', 'tour caption', `S.startTour('showcase'); for (let i = 0; i < 20; i++) S.step(1, 50);`);
  await grab('hint: keys', 'hint', `S.director.running && S.director.stop('closed'); E.transport.pause(); E.transport.seek(5, { glide: false }); const st = S.host.state.mod.hints; if (st) { st.shown.clear(); st.n = 0; st.t0 = -1e9; } for (let i = 0; i < 200; i++) S.step(1, 16.667); S.host.preview('hints'); ${step}`);
  // map fragments to sources
  for (const it of items) { it.mapped = it.texts.map((t) => { const parts = t.split(/ · | › /); const w = parts.map((p) => ({ frag: p.slice(0, 160), src: find(p) })); const whole = find(t); return { text: t.slice(0, 400), source: whole, parts: whole ? null : w }; }); }
  writeJson('v7b-fifteen.json', { generated: new Date().toISOString(), items });
  for (const it of items) { console.log('\n== ' + it.label + ' (' + it.kind + ')'); for (const m of it.mapped) console.log('  ' + (m.source ? 'SRC ' + m.source : (m.parts && m.parts.every((p) => p.src) ? 'SRC(parts) ' + [...new Set(m.parts.map((p) => p.src))].slice(0, 3).join(' | ') : 'UI/other')) + '  <- ' + m.text.slice(0, 150)); }
} finally { await s.close(); srv.close(); }
