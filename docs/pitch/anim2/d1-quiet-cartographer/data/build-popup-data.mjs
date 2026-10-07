// build-popup-data.mjs - extracts the REAL TEXT the popups show (read-only from the repo) into data/popup-data.json, inlined into battle-studio.html next to dataset.json.
//
//     node docs/pitch/anim/prototype/data/build-popup-data.mjs            write data/popup-data.json
//     node docs/pitch/anim/prototype/data/build-popup-data.mjs --check    exit 1 when the committed file differs from a fresh build
//
// Why a second file: dataset.json (the engine's) truncates event sentences to 140 characters and carries vignette titles only, because the tile engine needs nothing more.  A popup shows the
// whole sentence, the whole story, the commander's name and the tour's paragraphs, so it needs the text itself, copied verbatim and nothing else:
//   events      baseline/dist/data/chronology_day{1,2,3}.json   tick, significance, location, event, narrative, units_involved.   NOT copied: `time` (a hand-typed clock that contradicts the
//               clock module, 02-popups.md F-07) and `flag` (a production note, "Place precisely", never for visitors, F-17).  Neither can reach a card because neither is in this file.
//   stories     baseline/dist/data/vignettes_part{1,2,3}.json   title, trigger tick and place, panel_summary, full_script, units_featured, lat/lng
//   successions baseline/dist/data/oob/commander_successions.json   42 rows with a per-row `source`; NOT copied: `approx_time` (a hand-typed clock).  `kind` is typed HERE from the row's own words
//               by an explicit table that a test audits (the app guessed it and gave 9 of 42 rows the neutral title "Command change", 5 of them wounds, 02-popups.md F-06)
//   tour        the 16 stops of the production bundle (`th`), extracted with a parser from baseline/dist/assets/index-*.js and compared with release/R1c/dist
//   oob         commander, strength, casualties, key action of every placed unit and its ancestors (baseline/dist/data/oob/*.json), secondary sources by their own metadata
// Every source file is listed with its SHA-256.  Nothing is invented, shortened or paraphrased; the only transform is the one `text.display` documents (the internal "Commander succession
// XX-nnn activates." sentence is not shown, and the id it names becomes a link to that command change).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..', '..');
const DATA = path.join(REPO, 'baseline', 'dist', 'data');
const OUT = path.join(HERE, 'popup-data.json');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const used = [];
const readRaw = (abs, label) => { const t = fs.readFileSync(abs, 'utf8'); used.push({ file: label, bytes: Buffer.byteLength(t), sha256: sha(t) }); return t; };
const readData = (rel) => JSON.parse(readRaw(path.join(DATA, rel), 'baseline/dist/data/' + rel));

/** the typed kind of a command change, from the row's own words (event, then cause); an explicit table, audited by test/popups-data.test.mjs against the text */
const KIND_RULES = [
  [/\bKIA\b/i, 'killed'],
  [/\bmortally wounded\b/i, 'mortally-wounded'],
  [/\bwounded and captured\b/i, 'wounded-captured'],
  [/\bcaptured\b/i, 'captured'],
  [/\b(wounded|blinded)\b/i, 'wounded'],
  [/\breplaced by\b/i, 'relieved'],
  [/\bto division\b/i, 'promoted'],
  [/\barrives\b/i, 'arrives'],
];
const kindOf = (row) => { for (const [re, k] of KIND_RULES) if (re.test(row.event)) return k; throw new Error('no kind for succession ' + row.event_id + ': ' + row.event); };

/** the 16 stops, parsed out of the minified production bundle (the array of objects that carry `tickWindow`) */
function extractTour(file, label) {
  const src = readRaw(file, label); const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' }); let found = null;
  walk.simple(ast, { ArrayExpression(n) { if (found || n.elements.length < 10) return; if (n.elements.every((e) => e && e.type === 'ObjectExpression' && e.properties.some((p) => p.key && (p.key.name === 'tickWindow' || p.key.value === 'tickWindow')))) found = n; } });
  if (!found) throw new Error('tour array not found in ' + label);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + src.slice(found.start, found.end))();
}

function main() {
  // ---- events -------------------------------------------------------------------------------------------------------------------
  const events = []; const eventSources = {};
  for (const d of [1, 2, 3]) {
    const j = readData(`chronology_day${d}.json`); eventSources[`chronology_day${d}.json`] = j.metadata.sources;
    for (const e of j.events) events.push({ tick: e.tick, sig: e.significance, place: e.location || null, text: e.event, narrative: e.narrative || null, units: e.units_involved || [], file: `chronology_day${d}.json` });
  }
  events.sort((a, b) => a.tick - b.tick);

  // ---- stories ------------------------------------------------------------------------------------------------------------------
  const stories = []; const storySources = {};
  for (const p of [1, 2, 3]) {
    const j = readData(`vignettes_part${p}.json`); storySources[`vignettes_part${p}.json`] = j.metadata.sources;
    for (const v of j.vignettes) stories.push({ id: v.vignette_id, title: v.title, tick: +v.trigger_tick, place: v.trigger_location, lat: +v.trigger_lat, lng: +v.trigger_lng, units: v.units_featured || [], summary: v.panel_summary, script: v.full_script, file: `vignettes_part${p}.json` });
  }
  stories.sort((a, b) => a.tick - b.tick || (a.id < b.id ? -1 : 1));

  // ---- successions --------------------------------------------------------------------------------------------------------------
  const sj = readData('oob/commander_successions.json'); const successionSources = sj.metadata.sources;
  const successions = [];
  for (const [side, rows] of [['union', sj.union_successions], ['confederate', sj.confederate_successions]]) for (const r of rows) {
    successions.push({ id: r.event_id, tick: r.approx_tick, unit: r.unit_id, side, event: r.event, from: r.from_commander, to: r.to_commander, cause: r.cause, notes: r.notes || null, source: r.source, kind: kindOf(r) });
  }
  successions.sort((a, b) => a.tick - b.tick || (a.id < b.id ? -1 : 1));

  // ---- order of battle: commander, strength, casualties, key action -----------------------------------------------------------------
  const ds = JSON.parse(fs.readFileSync(path.join(HERE, 'dataset.json'), 'utf8')); const want = new Set();
  for (const u of ds.units) { want.add(u.id); } for (const n of ds.nodes) want.add(n.id);
  const ID_KEYS = ['corps_id', 'division_id', 'brigade_id', 'regiment_id', 'battery_id']; const oob = {}; const oobSources = [];
  const oobFiles = fs.readdirSync(path.join(DATA, 'oob')).filter((f) => f !== 'commander_successions.json').sort();
  const take = (o) => {
    const id = ID_KEYS.map((k) => o[k]).find(Boolean); if (!id || !want.has(id)) return;
    const c = o.commander && typeof o.commander === 'object' ? o.commander : null;
    const succ = c && (c.successor || c.survivor) ? (c.successor || c.survivor) : null;
    const rec = { cmd: c ? { name: c.name, fate: c.fate || null, succ: succ ? { name: succ.name, note: succ.assumed_command || succ.fate || null } : null, note: c.notes || null } : null, str: o.strength ?? null, cas: o.casualties ?? null, pct: o.casualty_percentage ?? null, days: o.days_engaged || null, state: o.state || null, key: o.key_action || null };
    if (!oob[id]) oob[id] = rec;
  };
  const visit = (o) => { if (Array.isArray(o)) o.forEach(visit); else if (o && typeof o === 'object') { take(o); for (const v of Object.values(o)) visit(v); } };
  for (const f of oobFiles) { const j = JSON.parse(readRaw(path.join(DATA, 'oob', f), 'baseline/dist/data/oob/' + f)); visit(j); const m = j.metadata || {}; if (m.sources) oobSources.push(...m.sources); }

  // ---- tour ---------------------------------------------------------------------------------------------------------------------
  const assets = (dir) => path.join(REPO, dir, 'assets');
  const entry = (dir) => { const f = fs.readdirSync(assets(dir)).find((x) => /^index-[A-Za-z0-9_-]+\.js$/.test(x)); return path.join(assets(dir), f); };
  const baseFile = entry('baseline/dist'); const tourBase = extractTour(baseFile, 'baseline/dist/assets/' + path.basename(baseFile));
  let tourCheck = 'not compared (release/R1c/dist not present)';
  const r1c = path.join(REPO, 'release', 'R1c', 'dist');
  if (fs.existsSync(path.join(r1c, 'assets'))) { const f = entry('release/R1c/dist'); const t2 = extractTour(f, 'release/R1c/dist/assets/' + path.basename(f)); tourCheck = JSON.stringify(t2) === JSON.stringify(tourBase) ? 'identical to release/R1c/dist/assets/' + path.basename(f) : 'DIFFERS from release/R1c/dist/assets/' + path.basename(f); }
  const tour = tourBase.map((s) => ({ id: s.id, title: s.title, subtitle: s.subtitle, lat: s.lat, lng: s.lng, zoom: s.zoom, tick: s.tick, tickWindow: s.tickWindow, narrative: s.narrative, videoUrl: s.videoUrl || null }));

  const doc = {
    format: 'battle-studio-popup-data/1',
    note: 'Verbatim text from the repo data files for the popups. Not copied on purpose: the hand-typed `time` of event rows and `approx_time` of command changes (clocks that contradict the clock module) and the production `flag` notes. See data/build-popup-data.mjs.',
    sources: used, fileSources: { events: eventSources, stories: storySources, successions: successionSources, oob: [...new Set(oobSources)] },
    counts: { events: events.length, stories: stories.length, successions: successions.length, tour: tour.length, oob: Object.keys(oob).length },
    events, stories, successions, oob, tour, tourCheck,
  };
  const text = JSON.stringify(doc) + '\n';
  if (process.argv.includes('--check')) { const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''; if (cur !== text) { console.error('popup-data.json is stale: run node docs/pitch/anim/prototype/data/build-popup-data.mjs'); process.exit(1); } console.log('popup-data.json is current'); return; }
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${path.relative(process.cwd(), OUT)}  ${(text.length / 1024).toFixed(0)} KB  events ${events.length} stories ${stories.length} successions ${successions.length} oob ${Object.keys(oob).length} tour ${tour.length} (${tourCheck})`);
}
main();
