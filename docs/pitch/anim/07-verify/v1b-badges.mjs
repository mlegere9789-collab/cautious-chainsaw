// v1b-badges.mjs - the Union corps badges of the "1863 Map" style: which units would get a badge, and is the corps the page derives (roman numeral in the ids of the parent chain) the corps the order of battle
// says (parent_corps_id, and the corps named in the designation)?  Independent of the page code: the chain is read from the page's data, the corps from the raw OOB records.
import fs from 'node:fs';
import path from 'node:path';
import { PROTO, writeJson } from './lib.mjs';
import { loadOob, loadKeyframes } from './srcdata.mjs';
const ds = JSON.parse(fs.readFileSync(path.join(PROTO, 'data', 'dataset.json'), 'utf8')); const oob = loadOob(); const nodes = new Map(ds.nodes.map((n) => [n.id, n]));
const ORD = { First: 'I', Second: 'II', Third: 'III', Fourth: 'IV', Fifth: 'V', Sixth: 'VI', Eleventh: 'XI', Twelfth: 'XII' };
const BADGE = { I: 'sphere', II: 'trefoil', III: 'lozenge', V: 'maltese', VI: 'cross', XI: 'crescent', XII: 'star' };
const chainOf = (id) => { const out = []; let c = id; const seen = new Set(); while (c && !seen.has(c) && c !== 'ROOT') { seen.add(c); out.push(c); c = (nodes.get(c) || {}).parent; } return out; };
const RE = [/^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)-(\d)-\d+$/, /^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)-(\d)$/, /^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)$/];
const rows = []; const bad = [];
for (const u of ds.units) {
  if (u.side !== 'union') continue; const documented = !!(u.inOob && u.parentSource === 'oob'); const ch = u.id ? [u.id, ...chainOf(u.parent || 'ROOT')] : [];
  let roman = null; for (const id of ch) { for (const re of RE) { const m = re.exec(id); if (m) { roman = roman || m[1]; break; } } }
  const infantryLike = u.arm === 'infantry' || ['brigade', 'division', 'corps', 'army'].includes(u.kind); const pageBadge = documented && roman && u.arm !== 'artillery' && u.arm !== 'cavalry' && infantryLike ? BADGE[roman] || null : null;
  const o = oob.get(u.id); let mine = null; if (o) { const raw = o.raw; mine = raw.parent_corps_id ? raw.parent_corps_id.replace(/^U-/, '') : null; if (!mine && raw.corps_id) mine = raw.corps_id.replace(/^U-/, ''); if (!mine && o.designation) { const m = /(First|Second|Third|Fourth|Fifth|Sixth|Eleventh|Twelfth) Corps/.exec(o.designation); if (m) mine = ORD[m[1]]; } }
  const fromDesig = o && o.designation ? (() => { const m = /(First|Second|Third|Fourth|Fifth|Sixth|Eleventh|Twelfth) Corps/.exec(o.designation); return m ? ORD[m[1]] : null; })() : null;
  rows.push({ id: u.id, pageBadge, roman, mine, fromDesig, documented, arm: u.arm });
  if (pageBadge && ((mine && mine !== roman) || (fromDesig && fromDesig !== roman))) bad.push({ id: u.id, pageRoman: roman, oobParentCorps: mine, designationCorps: fromDesig, designation: o && o.designation });
}
const withBadge = rows.filter((r) => r.pageBadge); const confirmed = withBadge.filter((r) => r.mine && r.mine === r.roman);
const res = { unionUnits: rows.length, withBadge: withBadge.length, badgeByCorps: Object.fromEntries(Object.entries(withBadge.reduce((a, r) => (a[r.roman] = (a[r.roman] || 0) + 1, a), {}))), confirmedByOobParentCorps: confirmed.length, mismatches: bad };
console.log(JSON.stringify(res)); writeJson('v1b-badges.json', res);
