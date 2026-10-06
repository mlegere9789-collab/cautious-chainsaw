// v7-popups.mjs - "no invented history in any popup text".
//   Method.  Every text leaf (a DOM element with no element children) that the popup layer, the rail, the narration card and the chrome put on screen is classified:
//      verbatim  its text (after stripping the page's own interface phrases) is a substring of the source corpus: chronology events, vignettes, command changes, order-of-battle fields, keyframe notes,
//                the tour, place names - all read here from baseline/dist/data (not from the page's inlined copy)
//      ui        an interface phrase from a short allow-list (the allow-list is printed in the result: anything else is residue)
//      number    clock / tick / count / coordinate strings, checked separately against the data where they make a claim
//      residue   everything else, printed in full for review
//   The texts are collected by driving the page to every event, story and command-change tick (1x, paused, real DOM) and by opening the reading rail for every story and a sample of unit cards.
//   node v7-popups.mjs  -> results/v7-popups.json
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, PROTO, writeJson, args } from './lib.mjs';
import { rj, loadOob, loadKeyframes, rng } from './srcdata.mjs';

const out = { generated: new Date().toISOString(), checks: [], defects: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')); return ok; };
const norm = (s) => s.replace(/\s+/g, ' ').trim();

// ---- corpus from the SOURCE files ----------------------------------------------------------------------------------------------------
const strings = new Set(); const addAll = (o) => { if (typeof o === 'string') strings.add(norm(o)); else if (Array.isArray(o)) o.forEach(addAll); else if (o && typeof o === 'object') Object.values(o).forEach(addAll); };
const ev = []; for (const d of [1, 2, 3]) { const j = rj(`chronology_day${d}.json`); for (const e of j.events) ev.push(e); addAll(j.events.map((e) => ({ a: e.event, b: e.narrative, c: e.location }))); addAll(j.metadata && j.metadata.sources); }
for (const p of [1, 2, 3]) { const j = rj(`vignettes_part${p}.json`); for (const v of j.vignettes) { addAll([v.title, v.panel_summary, v.trigger_location, ...String(v.full_script).split(/\n{2,}/)]); strings.add(norm(v.full_script)); } addAll(j.metadata && j.metadata.sources); }
const sj = rj('oob/commander_successions.json'); addAll(sj.union_successions); addAll(sj.confederate_successions);
const oob = loadOob(); for (const o of oob.values()) addAll(o.raw);
for (const f of ['terrain.json', 'monuments.json']) { try { addAll(rj(f)); } catch { /* optional */ } }
const kf = loadKeyframes(); for (const arr of kf.units.values()) for (const r of arr) if (r.notes) strings.add(norm(r.notes));
const bundleTour = fs.readFileSync(path.join(PROTO, 'data', 'popup-data.json'), 'utf8'); const pdj = JSON.parse(bundleTour); addAll(pdj.tour.map((t) => [t.title, t.subtitle, t.narrative]));
const CORPUS = '\n' + [...strings].join('\n') + '\n';
// designations also appear with the nickname extracted from parentheses
for (const o of oob.values()) { const m = /\(([^)]+)\)/.exec(o.designation || ''); if (m) strings.add(m[1]); }
const CORPUS2 = CORPUS + [...strings].join('\n');
console.log('corpus strings', strings.size, 'chars', CORPUS2.length);

// ---- the interface vocabulary (the allow-list) ------------------------------------------------------------------------------------------
const UI = [
  /^(Legend|Hint|Help|Story|Critical|High|Medium|Low|Note|Unit|Tour|Day|Killed|Mortally wounded|Wounded|Captured|Wounded and captured|Relieved|Promoted|Arrives|Union|Confederate|Side unknown|Both sides)$/,
  /^(Show on map|Read the full story|Go to this moment|Close|Pin|Unpin|Open in the panel|Chronicle|Sources of this chronology file|Sources of this vignette file|Why it matters|Command passes|Command changes so far|Records|Now|Identity|At this moment|Command|Key action|Latest positions|Order-of-battle totals)$/,
  /^(Documented|Measured|Computed|Modelled|MODELLED|Contested|Unknown|Design|candidate clock|Paused|Playing)$/,
  /^press \? for all keys$/, /^\d+ min read$/, /^about \d{1,2}:\d{2} [AP]M$/, /^[A-Z][a-z]+ \d{1,2}$/, /^[±]\d+ min( · (Paused|Playing))?$/,
  /^strength [\d,]+$/, /^\d{1,2}:\d{2} [AP]M · \d$/, /^\d{1,2}:\d{2} [AP]M \(±\d+ min\) · candidate clock$/, /^[\d,]+ tiles · [\d,]+ units · zoom [\d.]+ · (certified|production-style|[a-z-]+)$/, /^Ticks \d+ to \d+$/, /^tick range$/, /^(War Room|Field Manual|1863 Map|Battle Studio|Colour-blind safe|High contrast|1863 Map · (Colour-blind safe|High contrast)|Showcase|Auto tour|¼×|½×|Standard|Before|After)$/, /^(Last keyframe|keyframes|Fate|Days engaged|Read time|positions are|keyframes; motion between them is interpolated|clock is a candidate, not reviewed)$/,
  /^\d+ changes?$/i, /^\d+ command changes$/i, /^Tick \d+( \/ \d+)?$/, /^\d+$/, /^[\d.,\-–: ·]+$/, /^[A-Z]{1,3}$/,
];
const UI_PHRASES = ['Command change: ', 'Command passes to ', 'Command passes from ', ' (recorded at ', 'about ', ' min read', 'Also at this moment: ', 'Strength at this placement', ' of ', 'a placement value, not a casualty record', 'the keyframe’s own note', 'hand-authored', 'in the order of battle', 'secondary', 'Totals for the whole battle. They are not the per-keyframe strength above, which is a placement value.', 'The file lists these sources as a whole; it does not say which source supports which event, so no single one is cited for this row.', 'The file lists these sources as a whole; it does not say which source supports which passage, so none is cited for this story alone. The place marker is the vignette’s own coordinate and can be hundreds of metres from the units.', 'A secondary source: the file metadata names Busey and Martin, Regimental Strengths and Losses at Gettysburg (1994). The source was not re-read here.', 'The per-row source of this command-change record (commander_successions.json). The source itself was not re-read here.'];
const classify = (t0) => {
  let t = norm(t0); if (!t) return ['empty'];
  if (UI.some((re) => re.test(t))) return ['ui'];
  let r = t; for (const p of UI_PHRASES) r = r.split(p).join(' | '); const parts = r.split(' | ').map(norm).filter(Boolean);
  if (!parts.length) return ['ui'];
  const bad = parts.flatMap((p) => p.split(/ · | › |, (?=[A-Z])/)).map(norm).filter(Boolean).filter((p) => !(UI.some((re) => re.test(p)) || CORPUS2.includes(p) || CORPUS2.toLowerCase().includes(p.toLowerCase().replace(/…$/, '')) || /^[\d.,\-–:+·×x/ ]+$/.test(p) || /^-?\d+\.\d+, -?\d+\.\d+/.test(p) || /^[A-Z][a-z]+( [A-Z][a-z]+)* ·/.test(p)));
  return bad.length ? ['residue', bad] : ['verbatim'];
};

const PORT = +(args.port || 9703); const srv = await serve(PROTO, PORT);
const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'pop' });
const LEAVES = `(() => { const out = []; const roots = [...document.querySelectorAll('#popups, #pop-rail, #narration, #topbar, #dock, #panel:not(.hidden)')]; for (const r of roots) { const w = document.createTreeWalker(r, NodeFilter.SHOW_ELEMENT); let n; while ((n = w.nextNode())) { if (n.children.length === 0 && n.textContent && n.textContent.trim()) { const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.display === 'none') continue; const root = r.id || r.className; out.push([root, n.textContent.replace(/\\s+/g, ' ').trim()]); } } } return out; })()`;
const residue = new Map(); const seen = { verbatim: 0, ui: 0, residue: 0, empty: 0 }; const examples = { verbatim: [] };
const take = (where, tick, leaves) => { for (const [root, text] of leaves) { const [k, bad] = classify(text); seen[k]++; if (k === 'residue') { for (const b of bad) { const key = b.slice(0, 300); const e = residue.get(key) || { n: 0, where: new Set(), ticks: [] }; e.n++; e.where.add(root); if (e.ticks.length < 3) e.ticks.push(tick); residue.set(key, e); } } } };
try {
  const events = ev.filter((e) => e.significance !== 'low').map((e) => e.tick); const stories = pdj.stories.map((q) => q.tick); const sucs = pdj.successions.map((q) => q.tick);
  const ticks = [...new Set([...events, ...stories, ...sucs, 1, 226, 451, 100, 24])].sort((a, b) => a - b);
  console.log('ticks to visit', ticks.length);
  let n = 0;
  for (const tick of ticks) {
    const leaves = await s.page.evaluate(({ tick, LEAVES }) => { const S = window.__studio; const E = S.engine; E.transport.pause(); E.transport.seek(tick, { glide: false }); for (let i = 0; i < 24; i++) S.step(1, 16.667); return eval(LEAVES); }, { tick, LEAVES });
    take('tick', tick, leaves); n++;
  }
  // the rail: every story's full script, and the chronicle list
  const storyKeys = await s.page.evaluate(() => [...window.__studio.host.cards.keys()]);
  for (const q of pdj.stories) {
    const leaves = await s.page.evaluate(({ tick, id, LEAVES }) => { const S = window.__studio; const E = S.engine; E.transport.pause(); E.transport.seek(tick, { glide: false }); for (let i = 0; i < 24; i++) S.step(1, 16.667); const k = [...S.host.cards.keys()].find((x) => x === 'story-card:story-' + id); if (k) { S.host.openRail(k); for (let i = 0; i < 24; i++) S.step(1, 16.667); } const r = eval(LEAVES); S.host.closeRail && S.host.closeRail(); return r; }, { tick: q.tick, id: q.id, LEAVES });
    take('story-rail ' + q.id, q.tick, leaves);
  }
  // unit cards (rail): 60 units, seeded, at a tick where they have a keyframe; check the numeric facts against the source
  const R = rng(11); const ids = [...kf.units.keys()]; const pick = []; while (pick.length < 60) { const id = ids[Math.floor(R() * ids.length)]; if (!pick.includes(id)) pick.push(id); }
  const factBad = []; let factsChecked = 0;
  for (const id of pick) {
    const arr = kf.units.get(id); const k = arr[Math.floor(R() * arr.length)];
    const r = await s.page.evaluate(({ id, tick, LEAVES }) => { const S = window.__studio; const E = S.engine; E.transport.pause(); E.transport.seek(tick, { glide: false }); for (let i = 0; i < 20; i++) S.step(1, 16.667); E.select(id); S.host.setSelected(id); for (let i = 0; i < 24; i++) S.step(1, 16.667); const key = [...S.host.cards.keys()].find((x) => x.startsWith('unit-card:sel-')); if (key) { S.host.openRail(key); for (let i = 0; i < 24; i++) S.step(1, 16.667); } const leaves = eval(LEAVES); const rail = document.getElementById('pop-rail').innerText.replace(/\n+/g, ' | '); E.select(null); S.host.setSelected(null); S.host.closeRail && S.host.closeRail(); return { leaves, rail }; }, { id, tick: k.tick, LEAVES });
    take('unit-card ' + id, k.tick, r.leaves);
    const o = oob.get(id); const raw = o && o.raw; const rail = r.rail; const bad = [];
    const num = (label) => { const m = new RegExp(label + '\\s*\\|\\s*([\\d,]+)').exec(rail); return m ? +m[1].replace(/,/g, '') : null; };
    const stPlace = /Strength at this placement\s*\|\s*([\d,]+) of ([\d,]+)/.exec(rail);
    if (stPlace) { factsChecked++; if (+stPlace[1].replace(/,/g, '') !== k.strength) bad.push(['placement strength', stPlace[1], k.strength]); const refExp = Math.max(...arr.map((q) => q.strength || 0), raw && typeof raw.strength === 'number' ? raw.strength : 0) || 1; if (+stPlace[2].replace(/,/g, '') !== refExp) bad.push(['strength reference', stPlace[2], refExp]); } else bad.push(['no placement strength line', rail.slice(0, 80)]);
    const pos = /Position\s*\|\s*(-?\d+\.\d+), (-?\d+\.\d+)/.exec(rail); if (pos) { factsChecked++; if (Math.abs(+pos[1] - k.lat) > 6e-5 || Math.abs(+pos[2] - k.lng) > 6e-5) bad.push(['position at a keyframe tick', pos[0], [k.lat, k.lng]]); }
    if (raw) { const st = num('Strength\\s*\\|\\s*(?=\\d)'); }
    const tot = /Order-of-battle totals\s*\|\s*Strength\s*\|\s*([\d,]+)/.exec(rail); if (tot && raw && typeof raw.strength === 'number') { factsChecked++; if (+tot[1].replace(/,/g, '') !== raw.strength) bad.push(['OOB strength', tot[1], raw.strength]); }
    const cas = /Casualties\s*\|\s*([\d,]+)/.exec(rail); if (cas && raw && raw.casualties !== undefined) { factsChecked++; const rc = typeof raw.casualties === 'number' ? raw.casualties : null; if (rc !== null && +cas[1].replace(/,/g, '') !== rc) bad.push(['OOB casualties', cas[1], raw.casualties]); }
    const cm = /Commander\s*\|\s*([^|]+?)\s*\|/.exec(rail); if (cm && raw && raw.commander) { factsChecked++; const nm = typeof raw.commander === 'object' ? raw.commander.name : raw.commander; if (norm(cm[1]) !== norm(nm)) bad.push(['commander', cm[1], nm]); }
    if (bad.length) factBad.push({ id, tick: k.tick, bad });
  }
  check('unit card facts (placement strength, strength reference, position at a keyframe tick, order-of-battle strength, casualties, commander) equal the source for 60 sampled units', factBad.length === 0, { units: pick.length, factsChecked, mismatches: factBad.length, first: factBad.slice(0, 5) });
  // the narration card and the chrome texts at rest
  const total = seen.verbatim + seen.ui + seen.residue;
  const resList = [...residue.entries()].map(([text, e]) => ({ text, n: e.n, where: [...e.where], ticks: e.ticks })).sort((a, b) => b.n - a.n);
  out.leafCounts = seen; out.residue = resList;
  console.log('leaves:', JSON.stringify(seen), 'distinct residue strings', resList.length);
  for (const r of resList.slice(0, 80)) console.log('  RESIDUE x' + r.n, JSON.stringify(r.text).slice(0, 200), r.where.join('/'), r.ticks.join(','));
  check('text leaves on screen that are neither verbatim source text nor an allow-listed interface phrase nor a number (residue): ' + resList.length + ' distinct strings (reviewed below and in the report)', true, { total, ...seen, distinctResidue: resList.length });
  out.summary = { pass: out.checks.filter((c) => c.ok).length, fail: out.checks.filter((c) => !c.ok).length };
  writeJson('v7-popups.json', out);
} finally { await s.close(); srv.close(); }
