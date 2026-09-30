// Organisation-chain and naming helpers over the OOB index (used by the registry, crosswalk and rules).
import { naturalCompare } from './util.mjs';

export const surnameOf = (name) => {
  const t = String(name ?? '').replace(/\(.*?\)/g, '').replace(/,.*$/, '').trim().split(/\s+/);
  return (t[t.length - 1] || '').replace(/[^A-Za-z'-]/g, '');
};

/** All commander surnames in a commander chain (commander, successor, second_successor, survivor...). */
export function commanderChain(c, acc = []) {
  if (!c || typeof c !== 'object') return acc;
  if (c.name) acc.push({ name: c.name, surname: surnameOf(c.name), fate: c.fate ?? null, assumed_command: c.assumed_command ?? null });
  for (const k of ['successor', 'second_successor', 'survivor']) if (c[k]) commanderChain(c[k], acc);
  return acc;
}

export function chainOf(oob, rec) {
  const get = (id) => (id ? oob.records.get(id) ?? null : null);
  const out = { brigade: null, division: null, corps: null, artillery_parent: null };
  if (rec.kind === 'regiment' || (rec.kind === 'battery' && rec.filed_as === 'regiment')) {
    out.brigade = get(rec.raw.parent_brigade_id);
    out.division = get(out.brigade?.raw.parent_division_id);
    out.corps = get(out.division?.raw.parent_corps_id) ?? get(out.brigade?.raw.parent_corps_id) ?? get(rec.raw.parent_corps_id);
  } else if (rec.kind === 'brigade') {
    out.division = get(rec.raw.parent_division_id);
    out.corps = get(rec.raw.parent_corps_id) ?? get(out.division?.raw.parent_corps_id);
  } else if (rec.kind === 'division') {
    out.corps = get(rec.raw.parent_corps_id);
  } else if (rec.kind === 'battery') {
    out.artillery_parent = get(rec.parent_artillery_id);
    out.corps = rec.parent_corps_id ? get(rec.parent_corps_id) : null;
  }
  return out;
}

const ORDINAL_WORDS = { First: 1, Second: 2, Third: 3, Fourth: 4, Fifth: 5, Sixth: 6, Seventh: 7, Eighth: 8, Ninth: 9, Tenth: 10 };

/** "20th Maine Volunteer Infantry" -> {n:20, rest:'Maine Volunteer Infantry'}; null if no leading ordinal. */
export function leadingOrdinal(designation) {
  const m = String(designation ?? '').match(/^(\d+)(?:st|nd|rd|th)\s+(.*)$/);
  return m ? { n: Number(m[1]), rest: m[2] } : null;
}

/**
 * Natural-sort key for a designation: numeric ordinal first (so 9th < 10th < 102nd), then state/name text.
 * Non-ordinal designations ("Cobb's Legion", "Battery B, 1st ...") sort by text after all ordinals.
 */
export function sortKeyOf(designation, id) {
  const lo = leadingOrdinal(designation);
  if (lo) return `1|${String(lo.n).padStart(4, '0')}|${lo.rest.toLowerCase()}|${id}`;
  const w = String(designation ?? '').match(/^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth)\b/);
  if (w) return `1|${String(ORDINAL_WORDS[w[1]]).padStart(4, '0')}|${String(designation).toLowerCase()}|${id}`;
  return `2|${String(designation ?? id).toLowerCase()}|${id}`;
}

export const compareBySortKey = (a, b) => naturalCompare(a.sort_key, b.sort_key);

export const STATE_CODES = {
  Alabama: 'AL', Arkansas: 'AR', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New York': 'NY', 'North Carolina': 'NC', Ohio: 'OH', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', Tennessee: 'TN', Texas: 'TX', Vermont: 'VT', Virginia: 'VA', 'West Virginia': 'WV', Wisconsin: 'WI',
};
