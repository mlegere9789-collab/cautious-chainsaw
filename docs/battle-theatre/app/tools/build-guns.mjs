// Builds app/data/battery-guns.json: which battery of the order of battle (history/units.json) has a STATED gun count in the kit data (kit/artillery_batteries.json: 29 of 125 batteries, the PDF B.6.14 gap
// for the rest). The match is by the battery's printed name (normalised: ordinals, state abbreviations, spaces); a kit entry that joins two or more batteries ("3rd US F&K") or attaches another unit
// ("1st NY K with 11th NY attached") is NOT split between them (that would invent a count): it is listed under `combined` and no battery takes it. Nothing here chooses a default count.
//   node docs/battle-theatre/app/tools/build-guns.mjs        (BATTERY_GUNS_OUT=path writes elsewhere, used by the reproducibility test)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const STATE = [[/new york/g, 'ny'], [/massachusetts/g, 'ma'], [/connecticut/g, 'ct'], [/new hampshire/g, 'nh'], [/pennsylvania/g, 'pa'], [/rhode island/g, 'ri'], [/maryland/g, 'md'], [/new jersey/g, 'nj'], [/\bw\.?\s?va\.?/g, 'wv'], [/\bmaine\b/g, 'me'], [/\bohio\b/g, 'oh'], [/\bmichigan\b/g, 'mi']];
export const normBattery = s => { let t = String(s).toLowerCase().replace(/[’']/g, '').replace(/independent/g, ''); for (const [re, to] of STATE) t = t.replace(re, to); return t.replace(/(\d+)(st|nd|rd|th)\b/g, '$1').replace(/[^a-z0-9]/g, ''); };

export function build() {
  const ab = J('kit/artillery_batteries.json'), units = J('history/units.json').units;
  const hist = units.filter(u => u.arm === 'artillery' && u.level === 'battery'), byNorm = new Map();
  for (const u of hist) { const k = normBattery(u.name); if (!byNorm.has(k)) byNorm.set(k, []); byNorm.get(k).push(u); }
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
    detachment: { crew_per_piece: 9, basis: 'the printed manuals’ detachment: gunner and Nos. 1-7, chief of caisson ninth (kit/KIT-NOTES.md section 4 item 11; drill/drill_artillery.json); the PDF’s “eight at the piece” leaves the chief of caisson with the caisson', tier: 'documented', source_keys: ['FIELDART-1863'], limbers_behind_m: [10, 15], limbers_note: 'PDF B.6.14.9 inferred 10-15 yd behind; the manual puts the limber end-of-pole 6 yd from the trail handspike when unlimbered (inferred, weak)', teams: { teams_per_gun: 2, horses_per_team: 6, drivers_per_team: 3 } },
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.env.BATTERY_GUNS_OUT || path.join(BT, 'app/data/battery-guns.json'), doc = build();
  fs.writeFileSync(out, JSON.stringify(doc, null, 1) + '\n');
  console.log(`stated ${doc.kit_counts.with_stated_guns} of ${doc.kit_counts.batteries_in_kit} kit batteries: ${doc.matched.length} matched to one battery of the roster, ${doc.combined.length} combined entries, ${doc.unmatched.length} unmatched -> ${out}`);
  for (const u of doc.unmatched) console.log('  unmatched:', u.kit, '|', u.reason);
  for (const c of doc.combined) console.log('  combined:', c.kit, '->', c.history.join(', ') || '(none found)');
}
