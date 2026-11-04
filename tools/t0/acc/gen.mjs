#!/usr/bin/env node
// ACC group (R1e, accuracy fixes found by acceptance check 6): casualty rates above 100 percent.
//
//   node tools/t0/acc/gen.mjs            writes tools/t0/patches-next/ACC.json (data, group ACC) and tools/t0/patches-next/PG-zacc.json (pages)
//   node tools/t0/acc/gen.mjs --check    regenerates in memory and requires equality with the files on disk
//
// Why a group of its own: R1d (release id 753e318f) must rebuild byte for byte, so DATA.json is not edited. ACC anchors on the text DATA leaves in
// data/oob/*.json (the R1d output) and must follow DATA in group_order; PG-zacc anchors on the text PG-core writes in regiment.html and report.html
// (PGC-regiment-rate), so its name sorts after PG-core.
//
// The two records (both found by the R1d acceptance pass; both printed a rate above 100 percent on /regiment and /report, which compute losses / strength):
//  * U-107PA, 107th Pennsylvania: the record was the 107th New York's, relabelled by DATA, and kept that regiment's strength (122) against the Pennsylvania
//    regiment's 165 losses (OR 27/1 p.173) = 135.2 percent. The strength is not unknown: Lieut. Col. MacThomson's own report (OR 27/1 p.304; the Archive's OCR
//    is in tmp/library/or27, and Pennsylvania at Gettysburg vol. 2 p.566 prints it) says the regiment went into the fight on July 1 with 230 enlisted men and
//    25 commissioned officers. 255 men engaged; 165 / 255 = 64.7 percent.
//  * U-6US-CAV, 6th US Cavalry: the return's 242 casualties are those of Fairfield, Pa. on July 3 (footnote to OR 27/1 p.185, said by DATA in the key action), the file's
//    226 is the strength it carries for the regiment, and no report held in the repository gives the regiment's strength at Fairfield. Lieut. Nolan (OR 27/1 p.948)
//    counts 290 enlisted men killed, wounded and missing besides the officers, so the sources also differ on the loss. A rate would be a guess: none is given,
//    and the key action says why.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const DIST = path.join(ROOT, 'release', 'R1d', 'dist'); // the text ACC anchors on (frozen, release id 753e318f)
const OUT_DATA = path.join(ROOT, 'tools', 't0', 'patches-next', 'ACC.json');
const OUT_PG = path.join(ROOT, 'tools', 't0', 'patches-next', 'PG-zacc.json');

// pages that are CRLF in the tree are matched with LF strings: the builder converts an LF-authored string for a pure-CRLF page (tools/t0/t0build/util.py eol_adapt), counts stay strict
const isPureCrlf = (t) => t.includes('\r\n') && !t.replace(/\r\n/g, '').includes('\n');
const read = (rel) => { const t = fs.readFileSync(path.join(DIST, rel), 'utf8'); return isPureCrlf(t) ? t.replace(/\r\n/g, '\n') : t; };
const count = (t, s) => t.split(s).length - 1;
/** the exact text of one regiment record: from its opening brace to the end of its line (records are one per line) */
function record(file, id) {
  const t = read(file); const key = `{"regiment_id":"${id}",`; const i = t.indexOf(key);
  if (i < 0 || t.indexOf(key, i + 1) >= 0) throw new Error(`${file}: record ${id} not found exactly once`);
  let j = t.indexOf('\n', i); if (j < 0) j = t.length;
  let rec = t.slice(i, j).replace(/\r$/, ''); if (rec.endsWith(',')) rec = rec.slice(0, -1);
  JSON.parse(rec); // it must be the whole record
  if (count(t, rec) !== 1) throw new Error(`${file}: record ${id} text is not unique`);
  return rec;
}

const patches = [];
// ---- 107th Pennsylvania
{
  const file = 'data/oob/union_regiments_i_ii_corps.json';
  const find = record(file, 'U-107PA');
  const o = JSON.parse(find);
  if (o.strength !== 122 || o.casualties !== 165 || 'casualty_percentage' in o) throw new Error('U-107PA is not the R1d record: ' + find);
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === 'strength') out.strength = 255;
    else if (k === 'casualties') { out.casualties = v; out.casualty_percentage = Math.round((1000 * 165) / 255) / 10; }
    else if (k === 'key_action') out.key_action = 'Oak Ridge -- Paul\'s brigade (the record was labelled 107th New York; that regiment served in the XII Corps). Strength 255: Lieutenant Colonel MacThomson reports that the regiment went into the fight on July 1 with 230 enlisted men and 25 commissioned officers (OR 27/1 p.304); the 165 casualties are the printed return (OR 27/1 p.173), and the rate is computed from the two.';
    else out[k] = v;
  }
  patches.push({ id: 'ACC-oob-107PA-strength', target: file, find, repl: JSON.stringify(out), expect: 1,
    note: 'wrong-number: strength 122 was the 107th New York\'s; MacThomson\'s report (OR 27/1 p.304) gives 230 men and 25 officers = 255 engaged, so the 165 losses of the return (p.173) are 64.7 percent, not 135.2' });
}
// ---- 6th United States Cavalry
{
  const file = 'data/oob/union_cavalry_artillery.json';
  const find = ' The return\'s 242 casualties for this regiment occurred at Fairfield, Pa. (OR 27/1 p.185 footnote), not on the Gettysburg field."';
  const t = read(file); if (count(t, find) !== 1) throw new Error('6th US Cavalry key action not found exactly once');
  const repl = ' The return\'s 242 casualties for this regiment occurred at Fairfield, Pa. (OR 27/1 p.185 footnote), not on the Gettysburg field. No casualty rate is given: the strength shown (226) is the figure this record carries and no report held here gives the regiment\'s strength at Fairfield. The sources also differ on the loss: Lieutenant Nolan counts 290 enlisted men killed, wounded and missing there (OR 27/1 p.948) against the return\'s 242."';
  patches.push({ id: 'ACC-oob-6USCAV-no-rate', target: file, find, repl, expect: 1,
    note: 'impossible-rate: 242 losses (Fairfield) over a strength of 226 printed 107.1 percent; the strength at Fairfield is in no source held, and Nolan (OR 27/1 p.948) differs from the return, so no rate is given and the record says why' });
}
// ---- the pages: a rate above 100 percent is never printed
const CAP_TITLE = 'No rate is given: the losses and the strength in this record are not for the same body of men (see the key action).';
const pages = [];
{
  const file = 'regiment.html';
  const find = "    const rate = r.casualty_percentage != null ? r.casualty_percentage\n      : (r.strength && r.casualties != null ? Math.round(r.casualties / r.strength * 1000) / 10 : null);\n    document.getElementById('b-rate').textContent = rate != null ? rate + '%' : '—';\n";
  const repl = "    let rate = r.casualty_percentage != null ? r.casualty_percentage\n      : (r.strength && r.casualties != null ? Math.round(r.casualties / r.strength * 1000) / 10 : null);\n"
    + "    // losses cannot exceed the men engaged: a rate above 100 % means the two numbers of the record are not for the same body of men, and it is not printed (the key action below says why)\n"
    + "    const rateOver = rate != null && rate > 100;\n    if (rateOver) rate = null;\n"
    + "    document.getElementById('b-rate').textContent = rate != null ? rate + '%' : '—';\n"
    + `    document.getElementById('b-rate').title = rateOver ? ${JSON.stringify(CAP_TITLE)} : '';\n`;
  const t = read(file); if (count(t, find) !== 1) throw new Error('regiment.html rate block not found exactly once');
  pages.push({ id: 'ACC-regiment-rate-cap', target: file, find, repl, expect: 1, note: 'a computed or recorded casualty rate above 100 percent is shown as a dash with the reason in the tooltip (the 107th Pennsylvania printed 135.2 percent, the 6th US Cavalry 107.1)' });
}
{
  const file = 'report.html';
  const find = "    const rate = r.casualty_percentage != null ? r.casualty_percentage\n      : (r.strength && r.casualties != null ? Math.round(r.casualties / r.strength * 1000) / 10 : null);\n    setRow('r-rate', rate != null ? rate + '%' : null);\n";
  const repl = "    let rate = r.casualty_percentage != null ? r.casualty_percentage\n      : (r.strength && r.casualties != null ? Math.round(r.casualties / r.strength * 1000) / 10 : null);\n"
    + "    // losses cannot exceed the men engaged: a rate above 100 % means the two numbers of the record are not for the same body of men, so the row is not printed (the key action row says why)\n"
    + "    if (rate != null && rate > 100) rate = null;\n"
    + "    setRow('r-rate', rate != null ? rate + '%' : null);\n";
  const t = read(file); if (count(t, find) !== 1) throw new Error('report.html rate block not found exactly once');
  pages.push({ id: 'ACC-report-rate-cap', target: file, find, repl, expect: 1, note: 'same guard for the report page: no row for a rate above 100 percent' });
}

const dataDoc = { group: 'ACC', description: 'Accuracy group of release R1e (acceptance check 6): the strength of the 107th Pennsylvania from its commander\'s report and no casualty rate for the 6th US Cavalry (losses of Fairfield over a strength not for the same action). Generated by tools/t0/acc/gen.mjs; anchors on the text DATA leaves, so it follows DATA in group_order. Evidence in the patch notes and docs/accept/R1E-STATUS.md.', patches };
const pgDoc = { group: 'PG-zacc', description: 'Page part of ACC: /regiment and /report never print a casualty rate above 100 percent. The name sorts after PG-core, whose PGC-regiment-rate patch writes the text this anchors on.', train: 'R1e', patches: pages };
const ser = (o) => JSON.stringify(o, null, 1) + '\n';
if (process.argv.includes('--check')) {
  for (const [f, o] of [[OUT_DATA, dataDoc], [OUT_PG, pgDoc]]) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== ser(o)) { console.error('STALE: ' + path.relative(ROOT, f)); process.exit(1); } }
  console.log('OK: ACC.json and PG-zacc.json match the generator');
} else {
  fs.writeFileSync(OUT_DATA, ser(dataDoc)); fs.writeFileSync(OUT_PG, ser(pgDoc));
  console.log(`wrote ${path.relative(ROOT, OUT_DATA)} (${patches.length} patches) and ${path.relative(ROOT, OUT_PG)} (${pages.length} patches)`);
}
