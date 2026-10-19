// Helpers for the row-level position fixes (fixes/zpos.mjs, fixes/zrejoin.mjs): every function appends ONE asserted regex patch to `out`.
// Rows are located in baseline/dist/data/placements_*.json and density_*.json by (file, unit id as corrected by fixes/ids.mjs, tick); the patch anchors on the row's own
// unit id, tick, latitude and longitude, so a row another group changed fails the build loudly instead of being reverted silently.
//
// Engine fact the helpers respect (index chunk, addPlacementsForDay): placementsByTick = {...old, ...rowsOfTheDay} replaces a whole tick list when a later day file has rows
// for the same tick, so a row for tick T must live in a file of the day that owns T (day 1: ticks 1-225, day 2: 226-450, day 3: 451-675).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remapId, noteOf, preArrival } from './idmap.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DATA = path.join(HERE, '..', '..', '..', 'baseline', 'dist', 'data');
export const BS = String.fromCharCode(92);
const META = '.*+?^${}()|[]' + BS;
export const esc = (s) => { let o = ''; for (const ch of String(s)) o += META.includes(ch) ? BS + ch : ch; return o; };
const NOTEPAT = '(?:[^"' + BS + BS + ']|' + BS + BS + '.)*';           // regex text for the body of a JSON string: (?:[^"\\]|\\.)*
const NOT_NL = '[^' + BS + 'n]';
const NL = BS + 'n';
const LINE = new RegExp(String.raw`^(\s*)\{"unit_id":"([^"]+)","tick":(\d+),"lat":([\d.-]+),"lng":([\d.-]+),(.*)$`);
/** a number as it may be written in the files: trailing zeros are optional */
export const numRe = (x) => esc(String(Number(x))) + '0*';
/** the file of the day that owns a tick, by the tick range the file names */
export const FILE_FOR_TICK = [[50, 'placements_day1_ticks1_50'], [100, 'placements_day1_ticks51_100'], [225, 'placements_day1_ticks101_225'], [300, 'placements_day2_ticks226_300'],
  [375, 'placements_day2_ticks301_375'], [450, 'placements_day2_ticks376_450'], [520, 'placements_day3_ticks451_520'], [600, 'placements_day3_ticks521_600'], [675, 'placements_day3_ticks601_675']];
export const fileForTick = (t) => FILE_FOR_TICK.find(([m]) => t <= m)[1];

export function makePos(tag) {
  const files = fs.readdirSync(DATA).filter((x) => /^(placements_|density_).*\.json$/.test(x)).sort();
  const ROWS = [];
  const FIRST = {};
  for (const f of files) {
    fs.readFileSync(path.join(DATA, f), 'utf8').split('\n').forEach((l, i) => {
      const m = LINE.exec(l);
      if (!m) return;
      const note = noteOf(l);
      const unit = remapId(f, m[2], m[3], note);
      if (preArrival(m[2], m[3])) return;   // removed by fixes/prearrival.mjs
      const row = { f: f.replace(/\.json$/, ''), file: f, i, indent: m[1], unit0: m[2], unit, tick: +m[3], latS: m[4], lngS: m[5], rest: m[6], line: l, note };
      ROWS.push(row);
      if (!FIRST[row.f]) FIRST[row.f] = row;
    });
  }
  const errors = [];
  const out = [];
  const effects = [];   // {op:'del'|'add', file, unit}: row counts the page texts of fixes/texts.mjs depend on
  const used = new Set();
  function pick(file, unit, tick, at) {
    const hits = ROWS.filter((r) => r.f === file && r.unit === unit && r.tick === tick && (!at || (r.latS === at[0] && r.lngS === at[1])));
    if (hits.length !== 1) { errors.push(`${tag}: ${file} ${unit} t${tick}${at ? ' @' + at.join(',') : ''} selects ${hits.length} rows`); return null; }
    return hits[0];
  }
  const key = (r) => `"unit_id":"${r.unit}","tick":${r.tick},"lat":${r.latS},"lng":${r.lngS},`;
  const nid = (kindWord, r, extra = '') => { const b = `DATA-${tag}-${kindWord}-${r.f.replace(/_/g, '-')}-${r.unit}-${r.tick}${extra}`; let n = b, k = 1; while (used.has(n)) n = b + '-' + ++k; used.add(n); return n; };
  const bef = (r) => `${r.f} ${r.unit} tick ${r.tick} (${r.latS}, ${r.lngS})${r.note ? ': ' + r.note.slice(0, 90) : ''}`;

  function del(file, unit, tick, cls, why, src, at) {
    const r = pick(file, unit, tick, at); if (!r) return;
    const k = esc(key(r));
    effects.push({ op: 'del', file: r.file, unit: r.unit });
    out.push({ id: nid('del', r), target: 'data/' + r.file, regex: true, expect: 1, cls, before: `${bef(r)} -- ${why}`, src,
      find: `(?:,${NL}[ ${BS}t]*${BS}{${k}${NOT_NL}*${BS}}(?=${NL}[ ${BS}t]*${BS}])|[ ${BS}t]*${BS}{${k}${NOT_NL}*${BS}},${NL})`, repl: '' });
  }
  function retick(file, unit, from, to, cls, why, src, at) {
    const r = pick(file, unit, from, at); if (!r) return;
    out.push({ id: nid('tick', r, '-to-' + to), target: 'data/' + r.file, regex: true, expect: 1, cls, before: `${bef(r)} -- ${why}`, src,
      find: `("unit_id":"${esc(r.unit)}","tick":)${from}(,"lat":${esc(r.latS)},"lng":${esc(r.lngS)},)`, repl: `${BS}g<1>${to}${BS}g<2>` });
  }
  function move(file, unit, tick, lat, lng, cls, why, src, at) {
    const r = pick(file, unit, tick, at); if (!r) return;
    out.push({ id: nid('move', r), target: 'data/' + r.file, regex: true, expect: 1, cls, before: `${bef(r)} -- ${why}`, src,
      find: `("unit_id":"${esc(r.unit)}","tick":${tick},)"lat":${esc(r.latS)},"lng":${esc(r.lngS)}`, repl: `${BS}g<1>"lat":${lat},"lng":${lng}` });
  }
  function note(file, unit, tick, text, cls, why, src, at) {
    const r = pick(file, unit, tick, at); if (!r) return;
    if (!/"notes":"/.test(r.rest)) { errors.push(`${tag}: ${file} ${unit} t${tick} has no note to replace`); return; }
    out.push({ id: nid('note', r), target: 'data/' + r.file, regex: true, expect: 1, cls, before: `${bef(r)} -- ${why}`, src,
      find: `("unit_id":"${esc(r.unit)}","tick":${tick},"lat":${esc(r.latS)},"lng":${esc(r.lngS)},${NOT_NL}*?"notes":")${NOTEPAT}"`,
      repl: `${BS}g<1>${JSON.stringify(text).slice(1, -1).split(BS).join(BS + BS)}"` });
  }
  /** insert a new row as the FIRST element of the placements array of the file of the right day (anchor: the array header, which no other patch touches) */
  function addTo(unit, nu, cls, why, src, extra = '') {
    const file = fileForTick(nu.tick);
    const a = FIRST[file];
    if (!a) { errors.push(`${tag}: no first row in ${file}`); return; }
    const row = { unit_id: unit, tick: nu.tick, lat: Number(nu.lat), lng: Number(nu.lng), bearing: nu.bearing ?? 0, disposition: nu.disposition, strength: nu.strength, notes: nu.note };
    if (row.strength === undefined) delete row.strength;
    if (row.notes === undefined) delete row.notes;
    const json = JSON.stringify(row).split(BS).join(BS + BS);
    effects.push({ op: 'add', file: a.file, unit });
    out.push({ id: nid('add', { f: file, unit, tick: nu.tick }, extra), target: 'data/' + a.file, regex: true, expect: 1, cls, before: `${unit}: ${why}`, src,
      find: `("placements": ${BS}[${NL})`, repl: `${BS}g<1>    ${json},
` });
  }
  return { ROWS, FIRST, errors, out, effects, pick, del, retick, move, note, addTo, bef };
}
