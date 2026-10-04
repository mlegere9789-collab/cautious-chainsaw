// The copy_lint rule catalogue. Every rule is derived from docs/content/STYLEGUIDE.md (section numbers in `guide`) and from a
// defect that was measured on the deployed build (docs/plan/specialists/docs-copy.md section 2).
//
// A rule is { id, sev, title, why, fix, guide, kinds, skipQuoted?, find(text, ctx) -> [{index, length}] }.
//   sev   'E' fails the run when a violation is new; 'W' fails only with --strict.
//   kinds which item kinds the rule looks at (see lib/extract.mjs)
// ctx = { kind, where, key, names, counts, facts, proseKeys }
import { DEFAULT_PROSE_KEYS } from './extract.mjs';

const READ = ['html-text', 'html-attr', 'html-title', 'js-string', 'text', 'json', 'json-ld'];
const PROSE = READ; // alt text, titles and meta descriptions are read (or heard) like body text
const ALL = [...READ, 'html-link'];

const rx = (re, text, mapper) => {
  const out = [];
  const g = re.global ? re : new RegExp(re.source, re.flags + 'g');
  let m;
  while ((m = g.exec(text))) {
    if (m[0].length === 0) { g.lastIndex++; continue; }
    const r = mapper ? mapper(m) : { index: m.index, length: m[0].length };
    if (r) out.push(r);
  }
  return out;
};

const ACRONYMS = new Set(['NPS', 'USCT', 'CSA', 'USA', 'NY', 'PA', 'OR', 'PDF', 'HTML', 'CSS', 'WCAG', 'API', 'URL', 'AM', 'PM', 'GPS', 'AR', 'UI', 'FAQ', 'RSS', 'JSON', 'NVDA', 'JAWS', 'VPAT', 'CWSS', 'LOC', 'NARA', 'NOAA', 'USGS', 'SHSP', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII', 'XIX', 'XX', 'XXI', 'ID', 'OK', 'US', 'EST', 'LMT']);
const ROMAN = /^[IVXLC]+$/;
const MONTHS = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

/** Remove quoted passages (curly or straight pairs) so first-person words inside a quotation are not judged. */
const withoutQuotations = (t) => t.replace(/\u201c[^\u201d]*\u201d/g, (m) => ' '.repeat(m.length)).replace(/"[^"]{2,}"/g, (m) => ' '.repeat(m.length));

export const RULES = [
  {
    id: 'DASH', sev: 'E', guide: '6.7', kinds: READ,
    title: 'Typewriter dash ("--")',
    why: 'A double hyphen is a typewriter dash; screen readers read it as "hyphen hyphen" and it is typographically wrong.',
    fix: 'Use an em dash (\u2014) for a break in a sentence and an en dash (\u2013) for a range.',
    find: (t) => rx(/\s--\s|(?<=[A-Za-z0-9\u2019'\u201d")\]])--(?=[A-Za-z0-9\u201c"'\u2018(\[])/g, t),
  },
  {
    id: 'HYPHEN', sev: 'W', guide: '6.7', kinds: PROSE,
    title: 'Spaced hyphen used as a dash',
    why: 'A hyphen with a space on each side is a dash typed on a keyboard.',
    fix: 'Use a spaced em dash (\u2014) or restructure the sentence.',
    find: (t) => rx(/(?<=[A-Za-z0-9\u2019\u201d)])\s-\s(?=[A-Za-z0-9\u201c(])/g, t),
  },
  {
    id: 'TICK', sev: 'E', guide: '6.5', kinds: READ,
    title: 'Developer word "tick"',
    why: '"Tick" is the implementation name of the 675 steps; visitors see "moments" (and the step length is not five minutes everywhere).',
    fix: 'Say "moment" for a point in time, or the clock time. "Frame N of 675" belongs only in a tooltip.',
    find: (t) => rx(/\bticks?\b/gi, t),
  },
  {
    id: 'UNDEFINED', sev: 'E', guide: '6.9', kinds: READ,
    title: 'Programming value shown as text (undefined, NaN, [object Object])',
    why: 'A variable that was never set is printed to the visitor.',
    fix: 'Fix the code path; never print a missing value. Omit the label instead (section 6.9).',
    find: (t) => rx(/\bundefined\b|\bNaN\b|\[object Object\]/g, t),
  },
  {
    id: 'TODO', sev: 'E', guide: '6.16', kinds: ALL,
    title: 'Work-in-progress marker (TODO, FIXME, TBD, HACK)',
    why: 'Unfinished work is visible to visitors.',
    fix: 'Finish the text. Owner inputs use the marker [OWNER TO PROVIDE: ...] and block publishing instead.',
    find: (t) => rx(/\b(?:TODO|FIXME|TBD|HACK|XXX)\b/g, t),
  },
  {
    id: 'ALIAS', sev: 'E', guide: '6.9', kinds: READ,
    title: 'Database wording ("alias for")',
    why: 'Search rows printed "14th Brooklyn (alias for U-84NY)": a record relationship, not something a visitor needs.',
    fix: 'Fold the alias into the unit it names ("84th New York Infantry (14th Brooklyn)").',
    find: (t) => rx(/\balias(?:es)?\s+(?:for|of)\b/gi, t),
  },
  {
    id: 'IDLEAK', sev: 'E', guide: '6.9', kinds: READ,
    title: 'Internal identifier shown to the visitor',
    why: 'Record ids (U-84NY, US-017) and snake_case field names are database words.',
    fix: 'Resolve the id to a designation at build time; never print a key.',
    find: (t, ctx) => {
      // a bare id that is the whole value of a data field is a reference, not text a visitor reads; an id inside a sentence is a leak
      const notWhole = (m) => (ctx.kind === 'json' && m.index === 0 && m[0].length === t.length ? null : { index: m.index, length: m[0].length });
      return [
        ...rx(/(?<![A-Za-z0-9-])(?:U|C|US|CS|UA|CA)-(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)*(?![A-Za-z0-9-])/g, t, notWhole),
        ...rx(/\b[a-z]{3,}(?:_[a-z0-9]{2,}){2,}\b/g, t, notWhole),
      ];
    },
  },
  {
    id: 'DEVLOG', sev: 'E', guide: '6.2', kinds: READ,
    title: 'Development history or process voice in product copy',
    why: 'Visitors are told about drafts, deployments and limits of the build ("earlier drafts", "we haven\'t been able to").',
    fix: 'Say what the page does and does not do. History belongs in the changelog, limits in Known issues.',
    find: (t) => rx(/\bearlier drafts?\b|\b(?:this|current|latest|live|production|new) deployments?\b|\bdeployments? (?:of|to) (?:the |this )?(?:site|app|map|build|release)\b|\bwe haven['\u2019]t\b|\bhaven['\u2019]t been able\b|\bproof[- ]of[- ]concept\b|\bbuild plan\b|\bcompiled bundle\b|\bno source project\b|\bYouTube vignette\b|\bshould be reconciled\b|\bwork-?arounds?\b/gi, t),
  },
  {
    id: 'AIPERSONA', sev: 'E', guide: '6.2', kinds: READ,
    title: 'AI or persona wording for Ask the Historian',
    why: 'Ask the Historian searches the site\'s own records; it does not generate text, so AI and assistant wording is false.',
    fix: 'Say "answers come only from this site\'s records, not from an AI" (disclaimer D-HISTORIAN) or "research tool".',
    find: (t) => rx(/\bAI[- ](?:style|powered|driven|assistant|historian|generated|enabled)\b|\bchat-?bots?\b|\bvirtual assistant\b|\bsearch-and-answer assistant\b|\bI['\u2019]m ready\b|\bI couldn['\u2019]t find\b|\bartificial intelligence\b/gi, t),
  },
  {
    id: 'COUNT', sev: 'E', guide: '6.8', kinds: PROSE,
    title: 'Typed count that disagrees with facts.json',
    why: 'A count typed into copy drifts: "467 regiments", "445+ units" and "675 five-minute ticks" were all live at once.',
    fix: 'Take the number from data-src/build/facts.json (data-fact hydration or the build); never type a total.',
    find: (t, ctx) => {
      const out = [];
      const counts = ctx.counts;
      if (!counts) return out;
      const re = new RegExp(`(?<![\\w.,/:-])(\\d{1,3}(?:,\\d{3})+|\\d+)(\\+)?\\s+(?:(?:Union and Confederate|Confederate and Union|more|total|different|additional|other|Union|Confederate|narrative|narrated|named|distinct|individual|mapped|tracked|listed|separate|real|historical|key|[a-z]+-minute|[a-z]+-by-[a-z]+)\\s+){0,2}?(${counts.nounPattern})\\b`, 'gi');
      let m;
      while ((m = re.exec(t))) {
        const num = Number(m[1].replace(/,/g, ''));
        if (!m[1].includes(',') && num >= 1800 && num <= 1899) continue; // a year
        const noun = counts.lookup(m[3]);
        if (!noun) continue;
        if (num < noun.minTotal) continue;
        if (noun.allowed.includes(num) && !m[2]) continue;
        out.push({ index: m.index, length: m[0].length, detail: `"${m[0]}": facts say ${noun.allowed.join(' or ')} (${noun.facts.join(', ')})` });
      }
      return out;
    },
  },
  {
    id: 'QUOTES', sev: 'W', guide: '6.7', kinds: ['html-text', 'js-string', 'text', 'json', 'json-ld'],
    title: 'Straight quote or apostrophe in prose',
    why: 'Rendered text uses typographic quotes (\u201c \u201d \u2019); straight ones are for code and attributes. (Identity fields in data stay ASCII and are curled at render time.)',
    fix: 'Use \u2019 for an apostrophe and \u201c \u201d around a quotation.',
    find: (t, ctx) => {
      if (ctx.kind === 'json' && ctx.key && !ctx.proseKeys.includes(ctx.key)) return [];
      return [...rx(/(?<=[A-Za-z])'(?=[A-Za-z])/g, t), ...rx(/"[^"\n]{2,160}"/g, t)];
    },
  },
  {
    id: 'NAME', sev: 'E', guide: '6.3', kinds: READ,
    title: 'Retired or inconsistent name',
    why: 'One thing should have one name: product, menu, tools and places (tools/copy/names.json).',
    fix: 'Use the canonical name the finding gives.',
    find: (t, ctx) => {
      const out = [];
      for (const n of ctx.names) {
        const re = new RegExp(n.re, n.flags ?? '');
        const g = re.global ? re : new RegExp(re.source, re.flags + 'g');
        let m;
        while ((m = g.exec(t))) { if (m[0].length === 0) { g.lastIndex++; continue; } out.push({ index: m.index, length: m[0].length, detail: `"${m[0]}" -> "${n.good}"` }); }
      }
      return out;
    },
  },
  {
    id: 'TIMEFMT', sev: 'E', guide: '6.8', kinds: PROSE,
    title: 'Clock written in a non-standard format',
    why: 'Four clock formats were in use. The site writes "4:30 PM" (space, capitals); "7:30am" and "4 pm" are not used.',
    fix: 'Write H:MM AM/PM with a space ("4:30 PM"), or "about 4:30 PM" when approximate.',
    find: (t) => [
      ...rx(/\b\d{1,2}:\d{2}\s?(?:[AaPp]\.[Mm]\.?|[AaPp][Mm])\b/g, t, (m) => (/^\d{1,2}:\d{2}[ \u00a0](?:AM|PM)$/.test(m[0]) ? null : { index: m.index, length: m[0].length })),
      ...rx(/\b\d{1,2}\s?(?:am|pm|a\.m\.|p\.m\.)(?![A-Za-z])/g, t),
    ],
  },
  {
    id: 'REALTIME', sev: 'E', guide: '6.2', kinds: PROSE,
    title: '"Real time", "minute by minute", "five-minute" claims',
    why: 'The map is a time-lapse whose step is not five minutes everywhere; only Watch Together sync and live audio are real time.',
    fix: 'Say "moment by moment" or "time-lapse"; give the clock string, not a step length.',
    find: (t) => rx(/\breal[- ]time\b|\bminute[- ]by[- ]minute\b|\bfive[- ]minute\b|\b5[- ]minute\b|\bevery (?:five|5) minutes\b/gi, t),
  },
  {
    id: 'CASUALTY', sev: 'E', guide: '6.10', kinds: PROSE,
    title: 'Casualty abbreviation (KIA, WIA, MIA)',
    why: 'Casualties are written out: killed, wounded, captured or missing.',
    fix: 'Spell the word out.',
    find: (t) => rx(/\b(?:KIA|WIA|MIA)\b/g, t),
  },
  {
    id: 'ABBREV', sev: 'W', guide: '6.4', kinds: PROSE,
    title: 'Unexplained abbreviation',
    why: '"Confed", "Fwd", "1hr" and ranks without a period are shorthand a visitor has to decode.',
    fix: 'Spell out ("Confederate"); ranks take a period ("Lt. Col.").',
    find: (t) => rx(/\bConfed\b|\bFwd\b|\b\d+\s?hrs?\b|\bLt Col\b|\b(?:Gen|Col|Maj|Capt|Lt|Sgt|Pvt)(?=\s[A-Z][a-z])/g, t),
  },
  {
    id: 'EMOJI', sev: 'E', guide: '6.7', kinds: READ,
    title: 'Emoji or pictograph in copy or a label',
    why: 'Emoji render differently per system and are read aloud ("globe showing Americas"); they are not icons.',
    fix: 'Use an SVG icon with an accessible name, or no symbol.',
    find: (t) => rx(/\p{Extended_Pictographic}/gu, t, (m) => (/[\u00a9\u00ae\u2122]/.test(m[0]) ? null : { index: m.index, length: m[0].length })),
  },
  {
    id: 'WE', sev: 'E', guide: '6.2', kinds: ['html-text', 'html-attr', 'js-string', 'text'], skipQuoted: true,
    title: 'First person plural ("we", "our", "us")',
    why: 'There is no team. UI and legal copy are neutral ("this site"); only About, Corrections and FAQ may have a person speak, in the singular.',
    fix: 'Rewrite in the neutral voice, or use "I" on the three pages where the owner speaks.',
    find: (t) => rx(/\b(?:we|We|our|Our|ours|us)\b|\b[Ww]e['\u2019](?:re|ve|ll|d)\b/g, withoutQuotations(t)),
  },
  {
    id: 'HEDGE', sev: 'W', guide: '6.2', kinds: PROSE,
    title: 'Apologetic intensifier ("genuine", "real, working")',
    why: 'Words that insist on authenticity apologise for the work.',
    fix: 'Delete the adjective.',
    find: (t) => rx(/\bgenuine(?:ly)?\b|\breal, working\b/gi, t),
  },
  {
    id: 'ELLIPSIS', sev: 'W', guide: '6.7', kinds: PROSE,
    title: 'Three dots instead of an ellipsis',
    why: 'Three full stops break typographic and screen-reader conventions.',
    fix: 'Use the single character \u2026 (U+2026).',
    find: (t) => rx(/(?<!\.)\.{3}(?!\.)/g, t),
  },
  {
    id: 'RANGE', sev: 'W', guide: '6.8', kinds: PROSE,
    title: 'Date range with a hyphen',
    why: 'Ranges take an en dash: "July 1\u20133".',
    fix: 'Use \u2013 with no spaces.',
    find: (t) => rx(new RegExp(`\\b${MONTHS}\\.?\\s\\d{1,2}-\\d{1,2}\\b|\\bDays?\\s\\d-\\d\\b`, 'g'), t),
  },
  {
    id: 'CAPS', sev: 'W', guide: '6.6', kinds: PROSE,
    title: 'ALL CAPS phrase typed in source',
    why: 'Capitals are typed by CSS (text-transform) so that screen readers read words, not letters.',
    fix: 'Write sentence case in the source.',
    find: (t) => rx(/\b[A-Z]{3,}(?:[ \t]+[A-Z]{2,}){1,}\b/g, t, (m) => {
      if (t[m.index - 1] === '[' && /^OWNER TO (?:PROVIDE|CONFIRM)/.test(m[0])) return null; // the visible owner-input marker is meant to shout
      const words = m[0].split(/\s+/).filter((w) => !ACRONYMS.has(w) && !ROMAN.test(w));
      return words.length >= 2 ? { index: m.index, length: m[0].length } : null;
    }),
  },
  {
    id: 'ABSENCE', sev: 'W', guide: '6.9', kinds: PROSE,
    title: 'A data gap phrased as a fact about the past',
    why: '"Commander unrecorded" states an absence in the records as if it were history.',
    fix: 'Omit the label, or use the phrase library of section 6.9.',
    find: (t) => rx(/\bunrecorded\b|\bN\/A\b|\bCommander (?:not recorded|unknown)\b/gi, t),
  },
  {
    id: 'PERSONAL_EMAIL', sev: 'E', guide: '6.16', kinds: ALL,
    title: 'Personal Gmail address in shipped text',
    why: 'The contact plan (D-CONTACT) uses role addresses; the personal mailbox stays private.',
    fix: 'Use the role address from tools/copy/trust-config.json.',
    find: (t) => rx(/[A-Za-z0-9._%+-]+@gmail\.com/gi, t),
  },
  {
    id: 'CLAIM', sev: 'E', guide: '6.13', kinds: READ,
    title: 'Claim of accuracy, review or conformance without evidence',
    why: 'No time or fact is signed yet, and the site has not been evaluated for WCAG conformance. Copy may not say otherwise (TM-V18, D-EVIDENCE).',
    fix: 'Say "about", "unreviewed reconstruction", or link the evidence.',
    find: (t) => rx(/\baccurate to the minute\b|\bminute[- ]accurate\b|\bfully conforms?\b|\bfully accessible\b|\bWCAG(?: 2\.[012])?(?: Level)? A{1,3} (?:compliant|conformant|conformance)\b|\b100% accurate\b|\bhistorian[- ]reviewed\b|\b(?:reviewed|verified) by (?:a |the )?historians?\b/gi, t),
  },
];

export const RULE_IDS = RULES.map((r) => r.id);
export const ruleById = (id) => RULES.find((r) => r.id === id);

/** Build the ctx.counts object from facts (see tools/copy/counts.json). */
export function buildCounts(countsConfig, facts) {
  const nouns = [];
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  for (const c of countsConfig.nouns) {
    const allowed = [];
    for (const f of c.facts) { const v = get(facts, f); if (typeof v === 'number') allowed.push(v); }
    if (!allowed.length) continue;
    nouns.push({ names: c.nouns, facts: c.facts, allowed, minTotal: c.minTotal ?? 10 });
  }
  const all = nouns.flatMap((n) => n.names).sort((a, b) => b.length - a.length);
  return {
    nounPattern: all.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|'),
    lookup: (s) => { const k = s.toLowerCase().replace(/\s+/g, ' '); return nouns.find((n) => n.names.includes(k)); },
    nouns,
  };
}

export function matchRules(item, ctxBase, only = null) {
  const out = [];
  for (const r of RULES) {
    if (only && !only.has(r.id)) continue;
    if (!r.kinds.includes(item.kind)) continue;
    if (r.skipQuoted && item.quoted) continue;
    if (item.ignore && (item.ignore.has(r.id) || item.ignore.has('*'))) continue;
    const found = r.find(item.text, { ...ctxBase, kind: item.kind, where: item.where, key: item.key });
    for (const f of found) out.push({ rule: r.id, sev: r.sev, ...f });
  }
  return out;
}

export { DEFAULT_PROSE_KEYS };
