// golden-lib.js  --  shared by build-golden.js, verify-golden.js, score-golden.js
// Loads the CURRENT site data (DEPLOY_DIR/data/*.json) into "virtual collections" and evaluates
// declarative anchors.  An anchor is plain JSON so the golden set can be re-verified from the JSON alone.
//
// Anchor kinds (all evaluated by evalAnchor):
//   field    {collection,id,path,op,value}             op: eq | includes | regex | gte | lte | exists | wc_lte | absent
//   count    {collection,where:[{path,op,value}],equals}
//   sum      {collection,where,field,equals}
//   argmax   {collection,where,field,id,value}          record with the largest numeric field (ties => first)
//   argmin   {collection,where,field,id,value}
//   members  {collection,id,path,includes_all:[..]}     array-valued field contains all listed values
//   ids      {collection,where,ids:[..]}                exact id set for a where-clause
//   ncand    {collection,where,min}                     at least `min` records match (ambiguity evidence)
//   page     {file,includes|regex}                      first-party static page text (DEPLOY_DIR/<file>), tags stripped
//   file     {file}                                     file exists in DEPLOY_DIR
//   tickmap  {day,clock,tick,tol}                       real clock -> tick via time-facts-anchors.csv (piecewise linear)
//   text     {collection,id,path,includes}              alias of field/includes (kept for readability of quotes)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEPLOY = process.env.GOLDEN_DEPLOY_DIR || path.resolve(__dirname, '../../../legacy/dist');
const DATA = path.join(DEPLOY, 'data');
const ANCHORS_CSV = process.env.GOLDEN_TIME_ANCHORS || path.join(__dirname, '../fixtures/time-facts-anchors.csv');

const J = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const REG_FILES = [
  'union_regiments_i_ii_corps.json', 'union_regiments_iii_v_corps.json', 'union_regiments_vi_xi_xii_corps.json',
  'confederate_regiments_first_corps.json', 'confederate_regiments_second_corps.json', 'confederate_regiments_third_corps.json',
  'union_cavalry_artillery.json', 'confederate_cavalry.json',
];

function buildCollections() {
  const C = {};
  const add = (name, idKey, rec, file, idFn) => {
    const id = idFn ? idFn(rec) : rec[idKey];
    (C[name] = C[name] || new Map()).set(id, Object.assign({}, rec, { __id: id, __file: file }));
  };
  for (const f of REG_FILES) for (const r of J('oob/' + f).regiments) {
    add('regiments', 'regiment_id', r, 'oob/' + f);
    // derived (never stored in the JSON): side
  }
  for (const r of C.regiments.values()) r.__side = r.__id.startsWith('C-') ? 'confederate' : 'union';
  const ub = J('oob/union_oob_brigades.json'), cb = J('oob/confederate_oob_corps_div_bde.json'), uc = J('oob/union_oob_corps_division.json');
  for (const b of ub.brigades) add('brigades', 'brigade_id', b, 'oob/union_oob_brigades.json');
  for (const b of cb.brigades) add('brigades', 'brigade_id', b, 'oob/confederate_oob_corps_div_bde.json');
  for (const x of uc.divisions) add('divisions', 'division_id', x, 'oob/union_oob_corps_division.json');
  for (const x of cb.divisions) add('divisions', 'division_id', x, 'oob/confederate_oob_corps_div_bde.json');
  for (const x of uc.corps) add('corps', 'corps_id', x, 'oob/union_oob_corps_division.json');
  for (const x of cb.corps) add('corps', 'corps_id', x, 'oob/confederate_oob_corps_div_bde.json');
  add('armies', 'army_id', Object.assign({ army_id: 'U-AOP', designation: 'Army of the Potomac' }, uc.metadata), 'oob/union_oob_corps_division.json');
  add('armies', 'army_id', cb.army, 'oob/confederate_oob_corps_div_bde.json');
  // batteries
  const ua = J('oob/union_artillery.json'), ca = J('oob/confederate_artillery.json');
  const ucav = J('oob/union_cavalry_artillery.json'), ccav = J('oob/confederate_cavalry.json');
  for (const br of ua.artillery_reserve.brigades) for (const b of br.batteries) add('batteries', 'battery_id', Object.assign({ __side: 'union' }, b), 'oob/union_artillery.json');
  for (const br of ua.corps_artillery_brigades) for (const b of br.batteries) add('batteries', 'battery_id', Object.assign({ __side: 'union' }, b), 'oob/union_artillery.json');
  for (const k of ['first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery']) for (const bt of ca[k].battalions) for (const b of bt.batteries) add('batteries', 'battery_id', Object.assign({ __side: 'confederate' }, b), 'oob/confederate_artillery.json');
  for (const b of ucav.horse_artillery) add('batteries', 'battery_id', Object.assign({ __side: 'union' }, b), 'oob/union_cavalry_artillery.json');
  for (const b of ccav.horse_artillery) add('batteries', 'battery_id', Object.assign({ __side: 'confederate' }, b), 'oob/confederate_cavalry.json');
  add('meta', null, ua.metadata, 'oob/union_artillery.json', () => 'union_artillery');
  add('meta', null, ca.first_corps_artillery, 'oob/confederate_artillery.json', () => 'confederate_first_corps_artillery');
  // successions
  const su = J('oob/commander_successions.json');
  for (const s of su.union_successions) add('successions', 'event_id', s, 'oob/commander_successions.json');
  for (const s of su.confederate_successions) add('successions', 'event_id', s, 'oob/commander_successions.json');
  // vignettes, chronology
  for (const f of ['vignettes_part1.json', 'vignettes_part2.json', 'vignettes_part3.json']) for (const v of J(f).vignettes) add('vignettes', 'vignette_id', v, f);
  for (const d of [1, 2, 3]) for (const e of J(`chronology_day${d}.json`).events) add('chronology', null, Object.assign({ day: d }, e), `chronology_day${d}.json`, (r) => 'D' + d + 'T' + r.tick);
  // terrain
  const t = J('terrain.json');
  for (const l of t.key_locations) add('locations', 'location_id', l, 'terrain.json');
  for (const l of t.roads) add('roads', 'road_id', l, 'terrain.json');
  for (const l of t.structures) add('structures', 'structure_id', l, 'terrain.json');
  for (const l of t.terrain_features) add('features', 'feature_id', l, 'terrain.json');
  // casualty apportionment: one pseudo-record per corps + the notable notes
  const cas = J('casualty_apportionment.json');
  for (const x of cas.union_corps) add('casualty_corps', 'corps_id', Object.assign({ __side: 'union' }, x), 'casualty_apportionment.json');
  for (const x of cas.confederate_corps) add('casualty_corps', 'corps_id', Object.assign({ __side: 'confederate' }, x), 'casualty_apportionment.json');
  add('casualty_notes', null, cas.notable_intensity_notes, 'casualty_apportionment.json', () => 'notable_intensity_notes');
  add('monuments', 'id', { id: 'meta', note: J('monuments.json')._note }, 'monuments.json');
  for (const m of J('monuments.json').monuments) add('monuments', 'id', m, 'monuments.json');
  return C;
}
const COL = buildCollections();

const getPath = (o, p) => p.split('.').reduce((a, k) => (a === undefined || a === null ? undefined : a[k]), o);
const words = (s) => (String(s || '').match(/[A-Za-z0-9']+/g) || []).length;
const norm = (s) => String(s).replace(/\s+/g, ' ');

function cmp(actual, op, value) {
  switch (op) {
    case 'eq': return actual === value;
    case 'includes':
      if (Array.isArray(actual)) return actual.includes(value);
      return typeof actual === 'string' && norm(actual).toLowerCase().includes(norm(value).toLowerCase());
    case 'regex': return typeof actual === 'string' && new RegExp(value, 'i').test(actual);
    case 'gte': return typeof actual === 'number' && actual >= value;
    case 'lte': return typeof actual === 'number' && actual <= value;
    case 'exists': return actual !== undefined && actual !== null;
    case 'absent': return actual === undefined || actual === null;
    case 'wc_lte': return typeof actual === 'string' && words(actual) <= value;
    case 'ne': return actual !== value;
    case 'in': return Array.isArray(value) && value.includes(actual);
    default: throw new Error('bad op ' + op);
  }
}
function matchWhere(rec, where) {
  return (where || []).every((w) => cmp(getPath(rec, w.path), w.op || 'eq', w.value));
}
function select(collection, where) {
  if (!COL[collection]) throw new Error('unknown collection ' + collection);
  return [...COL[collection].values()].filter((r) => matchWhere(r, where));
}

// ---- time model (piecewise-linear real clock <-> tick) from time-facts-anchors.csv ----
function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur); return out;
}
function loadAnchors() {
  if (!fs.existsSync(ANCHORS_CSV)) return [];
  const lines = fs.readFileSync(ANCHORS_CSV, 'utf8').split(/\r?\n/).filter(Boolean).slice(1);
  return lines.map((l) => {
    const c = parseCsvLine(l);
    const m = /July (\d) (\d+):(\d+)(am|pm)/.exec(c[1]);
    let h = +m[2] % 12 + (m[4] === 'pm' ? 12 : 0);
    return { tick: +c[0], day: +m[1], minutes: (+m[1] - 1) * 1440 + h * 60 + +m[3], label: c[1], event: c[3] };
  });
}
const ANCH = loadAnchors();
function clockToMinutes(day, clock) {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(clock.trim());
  if (!m) throw new Error('bad clock ' + clock);
  const h = (+m[1] % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0);
  return (day - 1) * 1440 + h * 60 + +m[2];
}
function clockToTick(day, clock) {
  const t = clockToMinutes(day, clock);
  const A = ANCH;
  if (t <= A[0].minutes) return A[0].tick;
  for (let i = 1; i < A.length; i++) {
    if (t <= A[i].minutes) {
      const a = A[i - 1], b = A[i];
      const span = b.minutes - a.minutes;
      return a.tick + (span <= 0 ? 0 : ((t - a.minutes) / span) * (b.tick - a.tick));
    }
  }
  return A[A.length - 1].tick;
}

function pageText(file) {
  const p = path.join(DEPLOY, file);
  const h = fs.readFileSync(p, 'utf8').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&ndash;|&mdash;/g, '-').replace(/&larr;/g, '<-').replace(/&#?\w+;/g, ' ');
  return norm(h);
}

// returns {ok:boolean, observed:any, note?:string}
function evalAnchor(a) {
  try {
    switch (a.type) {
      case 'field': case 'text': {
        const rec = COL[a.collection] && COL[a.collection].get(a.id);
        if (!rec) return { ok: false, observed: null, note: `record ${a.collection}/${a.id} not found` };
        const v = getPath(rec, a.path);
        const ok = cmp(v, a.op || 'eq', a.value);
        return { ok, observed: typeof v === 'string' && v.length > 160 ? excerpt(v, a.value) : v };
      }
      case 'count': { const n = select(a.collection, a.where).length; return { ok: n === a.equals, observed: n }; }
      case 'sum': { const s = select(a.collection, a.where).reduce((x, r) => x + (+getPath(r, a.field) || 0), 0); return { ok: s === a.equals, observed: s }; }
      case 'argmax': case 'argmin': {
        const recs = select(a.collection, a.where).filter((r) => typeof getPath(r, a.field) === 'number');
        recs.sort((x, y) => (a.type === 'argmax' ? getPath(y, a.field) - getPath(x, a.field) : getPath(x, a.field) - getPath(y, a.field)));
        const top = recs[0];
        return { ok: top && top.__id === a.id && getPath(top, a.field) === a.value, observed: top ? [top.__id, getPath(top, a.field)] : null };
      }
      case 'members': {
        const rec = COL[a.collection].get(a.id); if (!rec) return { ok: false, observed: null, note: 'record not found' };
        const arr = getPath(rec, a.path) || [];
        return { ok: a.includes_all.every((x) => arr.includes(x)), observed: arr };
      }
      case 'ids': {
        const got = select(a.collection, a.where).map((r) => r.__id).sort();
        const want = [...a.ids].sort();
        return { ok: JSON.stringify(got) === JSON.stringify(want), observed: got };
      }
      case 'ncand': { const n = select(a.collection, a.where).length; return { ok: n >= a.min, observed: n }; }
      case 'file': return { ok: fs.existsSync(path.join(DEPLOY, a.file)), observed: a.file };
      case 'page': {
        const t = pageText(a.file);
        const ok = a.regex ? new RegExp(a.regex, 'i').test(t) : t.toLowerCase().includes(a.includes.toLowerCase());
        return { ok, observed: ok ? '(found)' : '(absent)' };
      }
      case 'tickmap': {
        const t = clockToTick(a.day, a.clock);
        return { ok: Math.abs(t - a.tick) <= (a.tol == null ? 3 : a.tol), observed: +t.toFixed(1) };
      }
      default: return { ok: false, observed: null, note: 'unknown anchor type ' + a.type };
    }
  } catch (e) { return { ok: false, observed: null, note: 'error: ' + e.message }; }
}
function excerpt(s, needle) {
  const i = needle ? norm(s).toLowerCase().indexOf(norm(String(needle)).toLowerCase()) : -1;
  const t = norm(s);
  return i < 0 ? t.slice(0, 160) + '...' : (i > 60 ? '...' : '') + t.slice(Math.max(0, i - 60), i + String(needle).length + 60) + '...';
}

// ---- anchor constructors (build-time helpers; they evaluate immediately and throw on failure) ----
const A = {};
const must = (a) => { const r = evalAnchor(a); if (!r.ok) throw new Error('ANCHOR FAILED ' + JSON.stringify(a) + ' -> ' + JSON.stringify(r)); return Object.assign({}, a, { verified: true, observed: r.observed }); };
A.f = (collection, id, p, op, value) => must({ type: 'field', collection, id, path: p, op, value });
A.eq = (collection, id, p, value) => A.f(collection, id, p, 'eq', value);
A.has = (collection, id, p, value) => A.f(collection, id, p, 'includes', value);
A.re = (collection, id, p, value) => A.f(collection, id, p, 'regex', value);
A.wc = (collection, id, p, n) => A.f(collection, id, p, 'wc_lte', n);
A.absent = (collection, id, p) => A.f(collection, id, p, 'absent');
A.count = (collection, where, equals) => must({ type: 'count', collection, where, equals });
A.sum = (collection, where, field, equals) => must({ type: 'sum', collection, where, field, equals });
A.argmax = (collection, where, field, id, value) => must({ type: 'argmax', collection, where, field, id, value });
A.argmin = (collection, where, field, id, value) => must({ type: 'argmin', collection, where, field, id, value });
A.members = (collection, id, p, includes_all) => must({ type: 'members', collection, id, path: p, includes_all });
A.ids = (collection, where, ids) => must({ type: 'ids', collection, where, ids });
A.ncand = (collection, where, min) => must({ type: 'ncand', collection, where, min });
A.page = (file, includes) => must({ type: 'page', file, includes });
A.file = (file) => must({ type: 'file', file });
A.tick = (day, clock, tick, tol) => must({ type: 'tickmap', day, clock, tick, tol });
const W = (p, value, op) => ({ path: p, op: op || 'eq', value });

// ---- id resolver: does an expected_source_id / cited id exist? (site record ids, prefixed extended ids, S1:/S2: catalog ids, TIME: rows, SITE: pages)
let SRC = { s1: {}, s2: {}, time: [] };
try { SRC = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/source-ids.json'), 'utf8')); } catch (e) { /* optional */ }
function resolveId(id) {
  const m = /^(S1|S2|TIME|SITE):(.+)$/.exec(id);
  if (m) {
    if (m[1] === 'S1') return !!SRC.s1[m[2]];
    if (m[1] === 'S2') return !!SRC.s2[m[2]];
    if (m[1] === 'TIME') return SRC.time.includes(m[2]);
    if (m[1] === 'SITE') return fs.existsSync(path.join(DEPLOY, m[2] + '.html'));
  }
  const pre = /^(BDE|DIV|CORPS|ARMY|ART|SUCC|ROAD|STR|TF|CAS|META):(.+)$/.exec(id);
  if (pre) {
    const map = { BDE: ['brigades'], DIV: ['divisions'], CORPS: ['corps'], ART: ['batteries'], SUCC: ['successions'], ROAD: ['roads'], STR: ['structures'], TF: ['features'] };
    if (pre[1] === 'ARMY') return pre[2] === 'U' || pre[2] === 'C';
    if (pre[1] === 'CAS') return COL.casualty_notes.has(pre[2]);
    if (pre[1] === 'META') return COL.meta.has(pre[2]);
    return map[pre[1]].some((c) => COL[c].has(pre[2]));
  }
  return ['regiments', 'vignettes', 'chronology', 'locations'].some((c) => COL[c].has(id));
}

// ---- point matching (shared by build self-check and score-golden)
const rxi = (s) => new RegExp(s, 'i');
function pointCovered(p, text) {
  if (p.judge_only) return null;
  const all = (p.patterns || []).every((r) => rxi(r).test(text));
  if (p.any_of && p.any_of.length) return all && p.any_of.filter((r) => rxi(r).test(text)).length >= (p.min_any || 1);
  return all;
}

export { pointCovered, resolveId, DEPLOY, DATA, COL, select, evalAnchor, A, W, getPath, words, clockToTick, clockToMinutes, ANCH, pageText, J };
