// format.js - small pure helpers for composing text. Numbers are formatted here and nowhere else (invariant I2: no numeral that is not a fact-row value or inside a quote).

export const fmtN = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const fmtPct = (p) => (p == null ? null : `${Number.isInteger(p) ? p : (Math.round(p * 10) / 10).toString()}%`);
export const SIDE_NAME = { U: 'Union', C: 'Confederate' };
export const DAY_NAME = { 1: 'July 1', 2: 'July 2', 3: 'July 3' };

export function joinList(items, conj = 'and') {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  if (a.length === 2) return `${a[0]} ${conj} ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, ${conj} ${a[a.length - 1]}`;
}
export const daysText = (days) => {
  const d = (days || []).filter((x) => x >= 1 && x <= 3);
  if (!d.length) return '';
  const names = d.map((x) => DAY_NAME[x]);
  return names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1].replace('July ', '')}` : 'all three days';
};
/** "the Iron Brigade", "the Third Corps", but "Vincent's Brigade" (a possessive proper name takes no article) */
export const withThe = (label) => (/^[A-Z][A-Za-z.'\u2019 -]*?['\u2019]s\b/.test(label) ? label : `the ${label}`);
export const ucfirst = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const endSent = (s) => (s && !/[.!?”"')]$/.test(s.trim()) ? s.trim() + '.' : (s || '').trim());
export const shortRank = (r) => ({ 'Lieutenant General': 'Lt. Gen.', 'Major General': 'Maj. Gen.', 'Brigadier General': 'Brig. Gen.', 'Lieutenant Colonel': 'Lt. Col.', Colonel: 'Col.', Captain: 'Capt.', Lieutenant: 'Lt.', General: 'Gen.' }[r] || r || '');
export const personLabel = (rank, name) => `${shortRank(rank)} ${name}`.trim();
/** "Survived — Medal of Honor 1893" style fate text, safe to embed in parentheses. */
export const fateText = (f) => (f ? f.replace(/\.$/, '') : '');

/** text of blocks for plain-text consumers (eval, clipboard, screen reader summaries). Contains no ids. */
export function renderText(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.t === 'lead') out.push(b.runs.map((r) => r.txt).join(''));
    else if (b.t === 'quote') out.push(`“${b.text}” — ${b.attrib}.`);
    else if (b.t === 'note') out.push(endSent(b.txt));
    else if (b.t === 'list') out.push((b.title ? b.title + ' ' : '') + b.items.map((i) => i.txt).join('; ') + (b.more ? `; ${b.more}` : ''));
    else if (b.t === 'table') out.push((b.caption ? b.caption + ': ' : '') + b.rows.map((r) => r.join(' | ')).join('; ') + (b.note ? ` ${b.note}` : ''));
    else if (b.t === 'chips') out.push(b.items.map((i) => i.label).join(' / '));
  }
  return out.join('\n\n');
}
