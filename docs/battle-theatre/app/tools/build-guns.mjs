// Builds app/data/battery-guns.json: which battery of the order of battle (history/units.json) has a STATED gun count in the kit data (kit/artillery_batteries.json: 29 of 125 batteries, the PDF B.6.14 gap
// for the rest). The match is by the battery's printed name (normalised: ordinals, state abbreviations, spaces); a kit entry that joins two or more batteries ("3rd US F&K") or attaches another unit
// ("1st NY K with 11th NY attached") is NOT split between them (that would invent a count): it is listed under `combined` and no battery takes it. Nothing here chooses a default count.
//   node docs/battle-theatre/app/tools/build-guns.mjs        (BATTERY_GUNS_OUT=path writes elsewhere, used by the reproducibility test)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const STATE = [[/new york/g, 'ny'], [/massachusetts/g, 'ma'], [/connecticut/g, 'ct'], [/new hampshire/g, 'nh'], [/pennsylvania/g, 'pa'], [/rhode island/g, 'ri'], [/maryland/g, 'md'], [/new jersey/g, 'nj'], [/\bw\.?\s?va\.?/g, 'wv'], [/\bmaine\b/g, 'me'], [/\bohio\b/g, 'oh'], [/\bmichigan\b/g, 'mi']];
export const normBattery = s => { let t = String(s).toLowerCase().replace(/[’']/g, '').replace(/independent/g, ''); for (const [re, to] of STATE) t = t.replace(re, to); return t.replace(/(\d+)(st|nd|rd|th)\b/g, '$1').replace(/[^a-z0-9]/g, ''); };

// The verified battery table (kit/verified_batteries.json, built from the Official Records and state volumes by tools/bt/kit_verified.py) as the layer adopts it (gate Q14.5): a battery of the roster whose table row is
// `verified` takes a gun count when ONE count lies inside the documented range of every date the table has in the states present or engaged (the same dates the gate compares). A count that differs by date
// (6, then 5, then 4) is not one number and the layer has no per-date gun count: such a battery is not adopted and keeps what it had. A conflict set (`alt` lines, status conflict) is never adopted, no default is chosen.
// The count drawn is the top of the common range (a point where the lines agree); the type is named only where the figures name or narrow it to one, else it stays open and `type_candidates` lists the allowed ones.
const GUN_STATES = ['present', 'engaged'];
export function verifiedGuns(vb, hist, kitMatched = []) {
  const kitBy = new Map(kitMatched.map(m => [m.history, m]));
  const out = [];
  for (const u of hist) {
    const b = (vb.batteries || {})[u.id];
    if (!b || b.status !== 'verified' || b.unverified || !Object.keys(b.range_by_date || {}).length) continue;
    let lo = -Infinity, hi = Infinity, used = 0; const dates = {};
    for (const [d, st] of Object.entries(b.range_by_date)) {
      const rs = Object.entries(st).filter(([k]) => GUN_STATES.includes(k)).map(([, v]) => v);
      if (!rs.length) continue;
      used++; const a = Math.min(...rs.map(r => r.low)), z = Math.max(...rs.map(r => r.high));
      dates[d] = [a, z]; lo = Math.max(lo, a); hi = Math.min(hi, z);
    }
    if (!used || lo > hi) continue;
    const lines = (b.guns || []).filter(f => GUN_STATES.includes(f.state) && f.tier === 'documented' && !f.alt);
    if (!lines.length || (b.guns || []).some(f => f.alt && GUN_STATES.includes(f.state))) continue;
    const last = [...lines].reverse().find(f => f.total === hi) || lines[lines.length - 1];          // the latest documented line that states the count drawn: its pieces name the types
    const cand = [...new Set((b.guns || []).flatMap(f => (f.pieces || []).flatMap(p => p.type_candidates || [])))].sort();
    let guns = last.pieces.map(p => ({ count: p.count, type_id: p.type_id || ((p.type_candidates || []).length === 1 ? p.type_candidates[0] : null), printed_type: p.printed }));
    if (guns.some(g => !g.type_id || !Number.isInteger(g.count)) || guns.reduce((n, g) => n + g.count, 0) !== hi) {
      const k = kitBy.get(u.id);                       // the kit's stated types stand where the verified figures allow them and agree with the count; otherwise the type stays open
      guns = k && k.total === hi && k.guns.length && k.guns.every(g => g.type_id && cand.includes(g.type_id) && Number.isInteger(g.count)) ? k.guns.map(g => ({ ...g })) : [];
    }
    const typeId = guns.length ? guns[0].type_id : null, pieces = last.pieces;
    out.push({ history: u.id, history_name: u.name, total: hi, range: [lo, hi], guns, type_open: !guns.length, type_candidates: cand,
      guns_printed: pieces.map(p => p.printed).join(' + '), tier: 'documented', weak_source: false, dates,
      source_keys: [...new Set(lines.map(f => (f.cite || {}).source_id).filter(Boolean))].sort(), evidence_ids: lines.map(f => f.evidence_ids[0]).filter(Boolean),
      basis: `documented in the verified battery table: one count (${lo === hi ? hi : `${lo} to ${hi}, the top is drawn`}) lies inside the documented figures of all ${used} date(s) in the states present or engaged` });
  }
  return out;
}

export function build() {
  const ab = J('kit/artillery_batteries.json'), units = J('history/units.json').units;
  const hist = units.filter(u => u.arm === 'artillery' && u.level === 'battery'), byNorm = new Map();
  for (const u of hist) { const k = normBattery(u.name); if (!byNorm.has(k)) byNorm.set(k, []); byNorm.get(k).push(u); }
  const vbDoc = fs.existsSync(path.join(BT, 'kit/verified_batteries.json')) ? J('kit/verified_batteries.json') : { batteries: {} };
  const stated = Object.values(ab.batteries).filter(b => String(b.guns_status).startsWith('stated')), matched = [], combined = [], unmatched = [];
  for (const b of stated) {
    const total = b.guns.reduce((s, g) => s + (Number.isInteger(g.count) ? g.count : 0), 0), counted = b.guns.length && b.guns.every(g => Number.isInteger(g.count) && g.count > 0);
    const rec = { kit: b.id, kit_name: b.name, guns: b.guns.map(g => ({ count: g.count ?? null, type_id: g.type_id ?? null, printed_type: g.printed_type })), guns_printed: b.guns_printed, total: counted ? total : null, tier: b.tier, weak_source: !!b.weak_source, source_keys: b.source_keys, conflicts: b.conflicts || [], notes: b.notes || null };
    if (/&| with |attached/i.test(b.name)) {          // a combined entry: find the history batteries it joins, to say which ones are left without a count
      const parts = b.name.replace(/ with .*$/i, '').split(/\s*&\s*/), lead = parts[0].trim().split(/\s+/), prefix = lead.slice(0, -1).join(' ');
      const members = hist.filter(u => parts.some((p, i) => normBattery(i === 0 ? p : `${prefix} ${p}`) === normBattery(u.name)));
      combined.push({ ...rec, history: members.map(u => u.id), reason: `the kit entry “${b.name}” joins or attaches more than one battery; the printed count belongs to the entry and is not split between batteries` }); continue;
    }
    const hit = byNorm.get(normBattery(b.name));
    if (hit && hit.length === 1) matched.push({ history: hit[0].id, history_name: hit[0].name, status: counted ? 'stated' : 'type_only', ...rec });
    else unmatched.push({ ...rec, reason: hit ? `${hit.length} batteries of the roster carry that name` : 'no battery of that name in history/units.json (the order of battle has no such unit or the name differs)' });
  }
  return {
    version: 1,
    _doc: 'Gun counts as STATED in the kit data (PDF B.6.14), keyed to the batteries of the order of battle. A battery not listed here has no stated gun count and is drawn without guns (its card says so); no default count (the 4-gun Confederate default of the PDF is a total check only) is ever applied. Built by app/tools/build-guns.mjs.',
    kit_counts: { batteries_in_kit: Object.keys(ab.batteries).length, with_stated_guns: stated.length },
    matched: matched.sort((a, b) => a.history.localeCompare(b.history)), combined, unmatched,
    verified: verifiedGuns(vbDoc, hist, matched).sort((a, b) => a.history.localeCompare(b.history)),
    detachment: { crew_per_piece: 9, basis: 'the printed manuals’ detachment: gunner and Nos. 1-7, chief of caisson ninth (kit/KIT-NOTES.md section 4 item 11; drill/drill_artillery.json); the PDF’s “eight at the piece” leaves the chief of caisson with the caisson', tier: 'documented', source_keys: ['FIELDART-1863'], limbers_behind_m: [10, 15], limbers_note: 'PDF B.6.14.9 inferred 10-15 yd behind; the manual puts the limber end-of-pole 6 yd from the trail handspike when unlimbered (inferred, weak)', teams: { teams_per_gun: 2, horses_per_team: 6, drivers_per_team: 3 } },
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.env.BATTERY_GUNS_OUT || path.join(BT, 'app/data/battery-guns.json'), doc = build();
  if (process.argv.includes('--check')) {            // exit 1 when the checked-in data is not what the builder gives from the kit tables
    const same = fs.existsSync(out) && fs.readFileSync(out, 'utf8') === JSON.stringify(doc, null, 1) + '\n';
    console.log(same ? `battery-guns.json is current (${doc.verified.length} batteries adopt a verified count)` : 'battery-guns.json is stale: run node docs/battle-theatre/app/tools/build-guns.mjs');
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(out, JSON.stringify(doc, null, 1) + '\n');
  console.log(`${doc.verified.length} batteries adopt a verified count; stated ${doc.kit_counts.with_stated_guns} of ${doc.kit_counts.batteries_in_kit} kit batteries: ${doc.matched.length} matched to one battery of the roster, ${doc.combined.length} combined entries, ${doc.unmatched.length} unmatched -> ${out}`);
  for (const u of doc.unmatched) console.log('  unmatched:', u.kit, '|', u.reason);
  for (const c of doc.combined) console.log('  combined:', c.kit, '->', c.history.join(', ') || '(none found)');
}
