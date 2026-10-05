// Builds data-src/environment/weather_by_day.json and data-src/environment/source_windows.json from weather-spec.mjs, the cached sources and
// data-src/environment/visual_readings.json.   node tools/environment/build-weather.mjs [--check]
// Nothing is typed into the output by hand: every quote is located in the scans, every number is re-extracted from its quote, and the readings of the
// independent witnesses are compared. The build FAILS (exit 1) if a spec quote cannot be found on its stated page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCached, readCached } from './fetch.mjs';
import { htmlToText } from './htmltext.mjs';
import { pretty } from './json-out.mjs';
import { alnumKey, loadIaLeaves } from './ia-pages.mjs';
import { locateQuote, pageOfLeaf, windowAround, readerN } from './source-verify.mjs';
import { weekdayOf } from './clock.mjs';
import { NOTES_COPIES, NOTES_QUOTES, ARTICLE_1885, ARTICLE_QUOTES } from './weather-spec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'data-src', 'environment');

/** extraction rules, applied to a quote's text: the validator re-runs exactly these */
export function extract(rule, text) {
  const t = text.replace(/\s+/g, ' ');
  if (rule.type === 'triple') { const m = /(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*$/.exec(t); return m ? Number(m[rule.index + 1]) : null; }
  if (rule.type === 'regex') { const m = new RegExp(rule.pattern).exec(t); return m ? Number(m[rule.group]) : null; }
  if (rule.type === 'regex-decimal') { const m = new RegExp(rule.pattern).exec(t); return m ? Number(`${m[1]}.${m[2]}`) : null; }
  throw new Error('unknown extract rule ' + rule.type);
}
/** does a visual read such as "7?" or "1.?90" agree with a number? '?' matches any one character */
export function readCompatible(read, value) {
  const s = String(value);
  if (read.length !== s.length) return false;
  return [...read].every((c, i) => c === '?' || c === s[i]);
}
const ECW_DAY = { '1863-07-01': 'July 1', '1863-07-02': 'July 2', '1863-07-03': 'July 3' };
/** ECW's typed numbers for a day: [7am, 2pm, 9pm] or null */
export function ecwTemps(ecwText, date) {
  const label = ECW_DAY[date];
  if (!label) return null;
  const line = ecwText.split('\n').find((l) => l.startsWith(label + ':'));
  const m = line && /(\d+)° at 7AM, (\d+)° at 2PM, and (\d+)° at 9PM/.exec(line);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
export function ecwWind(ecwText) { const m = /southern breeze of (\d+) miles per hour/.exec(ecwText); return m ? Number(m[1]) : null; }

/** classify a reading from its witnesses: how many independent paths agree, and the level */
export function verify(wit) {
  const rx = wit.find((w) => w.id === 'rx'), ecw = wit.find((w) => w.id === 'ecw'), img = wit.find((w) => w.id === 'ecw-image');
  const clipping = (ecw && ecw.agrees) || (img && img.exact && img.agrees);
  const compat = img && !img.exact && img.agrees;
  const disagree = wit.some((w) => w.agrees === false);
  let level;
  if (disagree) level = 'conflict';
  else if (rx && rx.agrees && clipping) level = 'two_independent_paths';
  else if (rx && rx.agrees && compat) level = 'rx_plus_compatible_damaged_image';
  else level = 'single_transcription';
  return { verification: { independent_paths_agreeing: (rx && rx.agrees ? 1 : 0) + (clipping ? 1 : 0), level } };
}

export async function build() {
  const problems = [];
  // ---------------- the 1864 Notes in three scans
  const copies = {};
  for (const c of NOTES_COPIES) copies[c.id] = { ...c, leaves: (await loadIaLeaves(c.ia, { kind: c.kind })).leaves };
  const quotes = [], windows = {};
  for (const q of NOTES_QUOTES) {
    const witnesses = [], ocrMisses = [];
    for (const c of Object.values(copies)) {
      const hits = locateQuote(c.leaves, q.text).filter((h) => { const p = pageOfLeaf(c.leaves, h.leaf).page; return p === q.page; });
      if (!hits.length) { if (q.page <= c.max_page) ocrMisses.push(c.id); continue; } // an OCR slip in one copy ("Frib^ay") is recorded, not hidden
      const h = hits[0];
      witnesses.push({ witness: c.id, ia: c.ia, kind: c.kind, leaf: h.leaf, printed_page: q.page, reader_n: readerN(c.ia, h.leaf), ...(h.spans ? { spans: true } : {}) });
      windows[`${q.id}|${c.id}`] = { leaf: h.leaf, printed_page: q.page, text: windowAround(c.leaves, h.leaf, q.text) };
    }
    if (witnesses.length < 2) problems.push(`${q.id}: found in only ${witnesses.length} of the three copies`);
    quotes.push({ id: q.id, source: 'jacobs-notes-1864', text: q.text, printed_page: q.page, date: q.date, element: q.element || null, role: q.role, ...(q.note ? { note: q.note } : {}), witnesses, ...(ocrMisses.length ? { ocr_misses: ocrMisses.map((m) => `copy ${m}: the OCR text of that page does not match the quote exactly (a character-recognition slip)`) } : {}) });
  }
  // the absence claims: the "seemed tame" sentence and a thermometer table are in none of the three scans
  const absent = {};
  for (const needle of ['seemed tame', 'Thermometer', 'thermometer', 'barometer', 'miles per hour']) absent[needle] = Object.values(copies).map((c) => ({ copy: c.id, found: locateQuote(c.leaves, needle).length > 0 }));

  // ---------------- the 1885 article: two typed witnesses and one image
  const rxFetch = await fetchCached(ARTICLE_1885.rx.url, { name: ARTICLE_1885.rx.cache });
  const ecwFetch = await fetchCached(ARTICLE_1885.ecw.url, { name: ARTICLE_1885.ecw.cache });
  const rxText = htmlToText(readCached(rxFetch.file)), ecwText = htmlToText(readCached(ecwFetch.file));
  const visual = JSON.parse(fs.readFileSync(path.join(OUT, 'visual_readings.json'), 'utf8')).readings.find((r) => r.id === 'VR-ecw-clipping-1885');
  const imgMeta = JSON.parse(fs.readFileSync(path.join(ROOT, 'tmp', 'env-cache', ARTICLE_1885.ecw_image.cache + '.meta.json'), 'utf8'));
  if (imgMeta.sha256 !== visual.image.sha256) problems.push('the cached clipping image differs from the one the visual reading was made on');
  const rxKey = alnumKey(rxText);
  const aq = {};
  for (const q of ARTICLE_QUOTES) {
    if (!rxKey.includes(alnumKey(q.text))) problems.push(`${q.id}: not found in the Civil War Rx transcription`);
    const witnesses = [{ witness: 'rx', url: ARTICLE_1885.rx.url, sha256: rxFetch.meta.sha256, retrieved: rxFetch.meta.retrieved.slice(0, 10) }];
    const flatRx = rxText.replace(/\s+/g, ' '), flatQ = q.text.replace(/\s+/g, ' ');
    const i = flatRx.indexOf(flatQ) >= 0 ? flatRx.indexOf(flatQ) : flatRx.indexOf(flatQ.slice(0, 30));
    windows[`${q.id}|rx`] = { text: i >= 0 ? rxText.replace(/\s+/g, ' ').slice(Math.max(0, i - 80), i + q.text.length + 80) : '' };
    aq[q.id] = { id: q.id, source: ARTICLE_1885.id, text: q.text, date: q.date, element: q.element, ...(q.note ? { note: q.note } : {}), witnesses };
    quotes.push(aq[q.id]);
  }

  // ---------------- observations
  const obs = [];
  const cellOf = (id) => visual.cells.find((c) => c.id === id);
  const textOf = (id) => visual.texts.find((c) => c.id === id);
  const SLOTS = [['7am', '7 A.M.'], ['2pm', '2 P.M.'], ['9pm', '9 P.M.']];
  const tempQuotes = { '1863-06-25': 'Q-H-t-jun25', '1863-06-26': 'Q-H-t-jun26', '1863-06-27': 'Q-H-t-jun27', '1863-06-28': 'Q-H-t-jun28', '1863-06-29': 'Q-H-t-jun29', '1863-06-30': 'Q-H-t-jun30', '1863-07-01': 'Q-H-t-jul1', '1863-07-02': 'Q-H-t-jul2', '1863-07-03': 'Q-H-t-jul3', '1863-07-04': 'Q-H-t-jul4' };
  const dayIdx = { '1863-07-01': 'd1', '1863-07-02': 'd2', '1863-07-03': 'd3', '1863-07-04': 'd4' };
  for (const [date, qid] of Object.entries(tempQuotes)) {
    SLOTS.forEach(([slot, header], i) => {
      const rule = { type: 'triple', index: i };
      const value = extract(rule, aq[qid].text);
      const wit = [{ id: 'rx', value: extract(rule, aq[qid].text), agrees: true }];
      const ecw = ecwTemps(ecwText, date);
      if (ecw) wit.push({ id: 'ecw', value: ecw[i], agrees: ecw[i] === value });
      const cell = dayIdx[date] && cellOf(`${dayIdx[date]}-${slot}`);
      if (cell) wit.push({ id: 'ecw-image', read: cell.read, legibility: cell.legibility, agrees: cell.legibility === 'clear' ? cell.read === String(value) : readCompatible(cell.read, value), exact: cell.legibility === 'clear' });
      obs.push({
        id: `W-${date}-temp-${slot}`, date, element: 'temperature', slot, time_label_as_printed: header, value,
        unit_as_printed: null, unit_inferred: 'degrees Fahrenheit', unit_basis: 'No unit is printed in the table. Fahrenheit is inferred: the readings (51 to 87) are only plausible for a Pennsylvania June-July in Fahrenheit, and the author notes 87 as the July maximum "at the time of Pickett\'s charge".',
        badge: 'Measured', badge_basis: 'a thermometer reading by Michael Jacobs (Smithsonian observer), relayed second-hand by his son in 1885; the original observation form was not seen',
        quote: qid, extract: rule, witnesses: wit, ...verify(wit),
      });
    });
  }
  // precipitation
  const rain = (id, date, date_end, qid, rule, valueInches, slotLabel, extra = {}) => {
    const value = extract(rule, aq[qid].text);
    if (value !== valueInches) problems.push(`${id}: extracted ${value}, expected ${valueInches}`);
    obs.push({ id, date, ...(date_end ? { date_end } : {}), element: 'precipitation', slot: slotLabel, value, unit_as_printed: extra.unit_printed || null, unit_inferred: 'inches', unit_basis: extra.unit_basis, badge: 'Measured', badge_basis: 'rain-gauge total by Michael Jacobs, relayed by his son in 1885', quote: qid, extract: rule, witnesses: extra.wit, ...(extra.verification ? { verification: extra.verification } : {}), ...(extra.note ? { note: extra.note } : {}) });
  };
  rain('W-1863-06-25-precip-total', '1863-06-25', '1863-06-27', 'Q-H-rain-total', { type: 'regex-decimal', pattern: 'in inches (\\d), - (\\d{3})' }, 1.28, 'June 25 8 p.m. to June 27 7 a.m.', {
    garbled: true, unit_printed: 'inches', unit_basis: 'The paragraph says "the precipitation being in inches"; the figure itself is garbled in the transcription.',
    wit: [{ id: 'rx', value: null, read_as_printed_in_transcription: '1, - 280', agrees: null }],
    verification: { independent_paths_agreeing: 0, level: 'garbled_single_transcription' }, note: 'UNVERIFIED: the transcription prints "1, - 280". 1.280 inches is a reading by analogy with the two later figures (1.390 and 1.300), not a verified value; the clipping image does not cover this paragraph.',
  });
  {
    const rule = { type: 'regex', pattern: 'aggregating (\\d\\.\\d{3})', group: 1 };
    const v = extract(rule, aq['Q-H-d4-text'].text), t = textOf('rain-d4');
    const wit = [{ id: 'rx', value: v, agrees: true }, { id: 'ecw-image', read: t.read.replace('aggregating ', ''), legibility: t.legibility, agrees: readCompatible(t.read.replace('aggregating ', ''), v.toFixed(3)), exact: false }];
    rain('W-1863-07-04-precip-total', '1863-07-04', '1863-07-05', 'Q-H-d4-text', rule, 1.39, 'July 4 6 a.m. to July 5 4 a.m.', { unit_basis: 'No unit is printed beside this figure; inches is inferred from the "in inches" of the first rainfall paragraph and the magnitude.', wit, verification: verify(wit).verification });
  }
  {
    const rule = { type: 'regex', pattern: 'which measured (\\d\\.\\d{3})', group: 1 };
    const v = extract(rule, aq['Q-H-after'].text), t = textOf('rain-jul8');
    const wit = [{ id: 'rx', value: v, agrees: true }, { id: 'ecw-image', read: t.read.replace('which measured ', ''), legibility: t.legibility, agrees: readCompatible(t.read.replace('which measured ', ''), v.toFixed(3)), exact: false }];
    rain('W-1863-07-08-precip-total', '1863-07-08', null, 'Q-H-after', rule, 1.3, 'July 8 3 a.m. to 11:30 a.m.', { unit_basis: 'No unit is printed beside this figure; inches inferred as above.', wit, verification: verify(wit).verification });
  }
  // the July maximum
  {
    const rule = { type: 'regex', pattern: 'was (\\d{2})\\(, at the time of Pickett', group: 1 };
    const v = extract(rule, aq['Q-H-max'].text), t = textOf('max-july');
    const wit = [{ id: 'rx', value: v, agrees: true }, { id: 'ecw-image', read: '?7', legibility: t.legibility, agrees: readCompatible('?7', v), exact: false }];
    obs.push({ id: 'W-1863-07-03-temp-july-max', date: '1863-07-03', element: 'temperature_month_max', slot: 'July 1863 maximum, "at the time of Pickett\'s charge"', value: v, unit_as_printed: 'raised circle (degree sign)', unit_inferred: 'degrees Fahrenheit', unit_basis: 'a raised circle follows the figure in the clipping image; the scale is inferred as for the table', badge: 'Measured', badge_basis: 'a thermometer reading, relayed second-hand', quote: 'Q-H-max', extract: rule, witnesses: wit, ...verify(wit), note: 'It equals the 2 p.m. reading of July 3 in the table; the article does not time it more closely than "at the time of Pickett\'s charge".' });
  }
  // wind (Contested)
  {
    const rxRule = { type: 'regex', pattern: '\\((\\d+) miles per hour\\)', group: 1 };
    const rxVal = extract(rxRule, aq['Q-H-d1-text'].text), ecwVal = ecwWind(ecwText);
    const wt = textOf('wind-d1');
    const imgVal = Number(/\((\d+) miles per hour\)/.exec(wt.read)[1]);
    obs.push({
      id: 'W-1863-07-01-wind-speed', date: '1863-07-01', element: 'wind_speed', slot: 'whole day ("A very gentle southern breeze")', value: null,
      values: [
        { value: rxVal, unit_as_printed: 'miles per hour', source_witness: 'rx', quote: 'Q-H-d1-text', note: 'typed transcription (Civil War Rx, 2013); its other slips ("1, - 280", "87(") look like character-recognition errors, so a dropped digit is plausible' },
        { value: ecwVal, unit_as_printed: 'miles per hour', source_witness: 'ecw', note: 'typed by Emerging Civil War (2023) from the clipping image; the same wording "of 12 miles per hour"' },
        { value: imgVal, unit_as_printed: 'miles per hour', source_witness: 'ecw-image', note: 'read from the clipping image at 291 px wide: "(12 miles per hour)"; the reader cannot rule out a stray mark before the 2' },
      ],
      unit_as_printed: 'miles per hour', badge: 'Contested', badge_basis: 'two readings of the same printed sentence disagree (2 against 12); neither can be checked against the printed page or the observation form (not located / not accessible)',
      status: 'open', quote: 'Q-H-d1-text', extract: rxRule,
      assessment: 'The image reading and the Emerging Civil War transcription both give 12; the Civil War Rx transcription gives 2. The image is low resolution and ECW most probably typed from it, so this is one reading, not two. Nothing here chooses a value.',
      would_settle: 'the printed Star and Sentinel page (Gettysburg, August 1885: issue, page and column unknown; the Library of Congress lists the title as not digitised), or the original form (American Philosophical Society "Meteorological Observations Made for the Franklin Institute 1839-1865" and the NARA/NCEI microfilm).',
      witnesses: [{ id: 'rx', value: rxVal }, { id: 'ecw', value: ecwVal }, { id: 'ecw-image', read: '12', legibility: wt.legibility }],
      verification: { independent_paths_agreeing: 0, level: 'conflict' },
    });
    obs.push({
      id: 'W-1863-07-02-wind-speed', date: '1863-07-02', element: 'wind_speed', slot: 'whole day ("wind as on preceding day")', value: null, values: null, unit_as_printed: null,
      badge: 'Contested', badge_basis: 'the article gives no figure of its own for July 2: it says "wind as on preceding day", so it inherits the July 1 conflict', status: 'open', quote: 'Q-H-d2-text', inherits: 'W-1863-07-01-wind-speed',
      witnesses: [{ id: 'ecw-image', read: 'wind as on preceding day', legibility: 'clear' }], verification: { independent_paths_agreeing: 0, level: 'conflict' },
    });
    obs.push({
      id: 'W-1863-07-03-wind-direction', date: '1863-07-03', element: 'wind_direction', slot: 'whole day', value: 'S.S.W.', value_text: 'Wind S. S. W., very gentle.', unit_as_printed: null, badge: 'Observed', badge_basis: 'an observer\'s estimate of direction and force; no speed is given for July 3',
      quote: 'Q-H-d3-text', witnesses: [{ id: 'rx', value: 'S.S.W.', agrees: true }, { id: 'ecw-image', read: 'Wind S. S. W., very gentle.', legibility: 'clear', agrees: true, exact: true }], verification: { independent_paths_agreeing: 2, level: 'two_independent_paths' },
      note: 'There is NO miles-per-hour figure for July 3 in the article. The pitch (row 14 of the conflict ledger) places the 12 against 2 conflict on July 3; it belongs to the first day (July 1) and is inherited by July 2.',
    });
    obs.push({ id: 'W-1863-07-01-wind-direction', date: '1863-07-01', element: 'wind_direction', slot: 'whole day', value: 'S', value_text: 'A very gentle southern breeze', unit_as_printed: null, badge: 'Observed', badge_basis: 'an observer\'s estimate', quote: 'Q-H-d1-text', witnesses: [{ id: 'rx', value: 'S', agrees: true }, { id: 'ecw', value: 'S', agrees: true }, { id: 'ecw-image', read: 'southern breeze', legibility: 'clear', agrees: true, exact: true }], verification: { independent_paths_agreeing: 2, level: 'two_independent_paths' } });
  }
  // sky, thunder, remarks
  const plain = (id, date, element, slot, text, quote, badge, basis, extra = {}) => obs.push({ id, date, element, slot, value: null, value_text: text, unit_as_printed: null, badge, badge_basis: basis, quote, ...extra });
  plain('W-1863-06-15-sky-clear-statement', '1863-06-15', 'sky', 'June 15 to July 22, 1863', 'not an entirely clear day', 'Q-H-clear', 'Observed', 'a summary statement of the observer\'s records', { date_end: '1863-07-22', verification: { independent_paths_agreeing: 1, level: 'single_transcription' } });
  plain('W-1863-06-27-sky', '1863-06-27', 'sky', 'June 27-28 all observations, June 29 until the 9 p.m. observation', 'entire sky covered with clouds', 'Q-H-sky-jun27-29', 'Observed', 'observer\'s record of cloud cover', { date_end: '1863-06-29', verification: { independent_paths_agreeing: 1, level: 'single_transcription' } });
  plain('W-1863-06-30-sky', '1863-06-30', 'sky', '7 a.m. and 2 p.m. complete, 9 p.m. four-tenths', 'obscuration complete at 7 a.m. and 2 p.m. (cumulo-stratus from S.S.E.); four-tenths covered at 9 p.m.', 'Q-H-sky-jun30', 'Observed', 'observer\'s record of cloud cover and type', { verification: { independent_paths_agreeing: 1, level: 'single_transcription' } });
  plain('W-1863-06-30-wind', '1863-06-30', 'wind', 'the days before the battle', 'records of the wind are those of almost an entire calm', 'Q-H-wind-calm', 'Observed', 'observer\'s estimate of force', { verification: { independent_paths_agreeing: 1, level: 'single_transcription' } });
  plain('W-1863-07-01-sky', '1863-07-01', 'sky', 'all day: cumulo-stratus at 7 a.m. and 2 p.m., cirro-stratus at 9 p.m.', 'entire sky covered with clouds', 'Q-H-d1-text', 'Observed', 'observer\'s record of cloud cover and type', { witnesses: [{ id: 'rx', agrees: true }, { id: 'ecw-image', read: 'the entire sky was covered with clouds, viz: cumulo-stratus at 7 a. m. and 2 p. m.; and cirro-stratus at 9 p. m.', legibility: 'clear', agrees: true, exact: true }], verification: { independent_paths_agreeing: 2, level: 'two_independent_paths' } });
  plain('W-1863-07-02-sky', '1863-07-02', 'sky', '8 a.m. covered; 2 p.m. three-tenths clear; 9 p.m. cirrus', 'sky still covered (cumulo-stratus) at 8 a.m.; three-tenths clear at 2 p.m.; cirrus clouds at 9 p.m.', 'Q-H-d2-text', 'Observed', 'observer\'s record of cloud cover and type', { witnesses: [{ id: 'rx', agrees: true }, { id: 'ecw-image', read: 'At 8 a. m., sky still covered, (cumulo-stratus). At 2 p. m., three-tenths are clear. At 9 p. m., there are cirrus clouds', legibility: 'clear', agrees: true, exact: true }], verification: { independent_paths_agreeing: 2, level: 'two_independent_paths' }, note: 'The 8 a.m. observation is printed as 8 a.m. (the table heading for the day says 7 A.M.).' });
  plain('W-1863-07-03-sky', '1863-07-03', 'sky', '8 a.m. complete cumulo-stratus; 2 p.m. four-tenths covered (cumulus); 9 p.m. seven-tenths cumulus', 'completely covered at 8 a.m.; four-tenths covered at 2 p.m. with cumulus or the massive thunder-cloud of summer; seven-tenths cumulus at 9 p.m.', 'Q-H-d3-text', 'Observed', 'observer\'s record of cloud cover and type', { witnesses: [{ id: 'rx', agrees: true }, { id: 'ecw-image', read: 'At 8 a. m., sky again completely covered with cumulo-stratus clouds; at 2 p. m., only four-tenths of the heavens are covered, but with cumulus or the massive thunder-cloud of summer; at 9 p. m., seven-tenths cumulus.', legibility: 'clear', agrees: true, exact: true }], verification: { independent_paths_agreeing: 2, level: 'two_independent_paths' } });
  plain('W-1863-07-03-thunder', '1863-07-03', 'thunder', '6 p.m.', 'Thunder storm in neighborhood at 6 p. m. The thunder seemed tame, after the artillery firing of the afternoon.', 'Q-H-thunder', 'Observed', 'observer\'s note; a thunderstorm "in neighborhood", not necessarily over the field', { witnesses: [{ id: 'rx', agrees: true }, { id: 'ecw', agrees: true }, { id: 'ecw-image', read: textOf('thunder-d3').read, legibility: 'clear', agrees: true, exact: true }], verification: { independent_paths_agreeing: 2, level: 'two_independent_paths' }, note: 'These words are in the 1885 article by H. E. Jacobs, NOT in the 1864 Notes (searched in all three scans: absent). The pitch attributes them to the Notes.' });
  plain('W-1863-07-05-showers', '1863-07-05', 'precipitation', 'slight showers on the 5th and the 7th', 'slight showers on the 5th and 7th', 'Q-H-after', 'Observed', 'observer\'s record', { date_end: '1863-07-07', verification: { independent_paths_agreeing: 1, level: 'single_transcription' } });
  // narrative remarks from the 1864 Notes (Reported)
  const nq = Object.fromEntries(quotes.filter((q) => q.source === 'jacobs-notes-1864').map((q) => [q.id, q]));
  const rep = (id, qid, slot, text, note) => obs.push({ id, date: nq[qid].date, element: nq[qid].element, slot, value: null, value_text: text, unit_as_printed: null, badge: 'Reported', badge_basis: 'a narrative statement by Michael Jacobs in a book published in 1864; not a recorded observation', quote: qid, verification: { independent_paths_agreeing: nq[qid].witnesses.length, level: nq[qid].witnesses.length >= 2 ? 'two_independent_scans' : 'single_scan' }, ...(note ? { note } : {}) });
  rep('W-1863-06-25-rain-night', 'Q-N-rain-jun25', 'night of Thursday June 25', 'heavy rain that night', 'Agrees in kind with the 1885 article ("June 25th, at 8 p. m., a rain began").');
  rep('W-1863-06-26-wet-brigade', 'Q-N-wet-jun26', 'Friday June 26, a Confederate brigade passing through the town', 'rain "during the most of the day"; a marching brigade wet and heated; smell remark', 'The line the pitch calls "wet from the rain" is dated Friday June 26 and is about a marching Confederate brigade and the smell of its men; it is not a description of July 1 or of the battlefield.');
  rep('W-1863-07-02-morning', 'Q-N-morning-jul2', 'morning of Thursday July 2', 'pleasant morning, calm air, sun shining mildly through a smoky atmosphere', 'Contrast: Haskell, a staff officer riding up the Taneytown road, wrote "thick and sultry, the sky overcast with low, vapory clouds" (see contested.C-morning-jul2).');
  rep('W-1863-07-02-sunset-ref', 'Q-N-sunset-jul2', 'July 2 evening', 'the Sixth corps arrived "at about sunset"', 'Computed sunset July 2 at Gettysburg: 19:32 local mean time (astro_by_day.json).');
  rep('W-1863-07-02-dusk-ref', 'Q-N-dark-jul2', 'July 2 evening', 'the enemy advanced "under cover of the forest and approaching darkness"');
  rep('W-1863-07-03-dawn-ref', 'Q-N-dawn-jul3', 'July 3 dawn', 'artillery opened "at the dawn of day"', 'Computed civil dawn July 3: 04:03 local mean time.');
  rep('W-1863-07-03-sunrise-ref', 'Q-N-sunrise-jul3', 'July 3 sunrise', 'infantry attack "at sunrise"', 'Computed sunrise July 3: 04:36 local mean time.');
  rep('W-1863-07-03-cannonade-clock', 'Q-N-cannonade-jul3', 'July 3 afternoon', '"At seven minutes past 1 p. m." the cannonade began (clock reference, not weather)', 'Jacobs gives a clock time to the minute; other witnesses say "about 1" or "1.30" (see the conflict ledger).');
  rep('W-1863-07-03-thunder-simile', 'Q-N-thunder-simile', 'July 3 afternoon', 'the noise of the guns compared to "the most terrific thunder-storm ever witnessed"', 'A SIMILE for the guns. It is not evidence of a thunderstorm; the observer\'s own 6 p.m. thunderstorm note is the 1885 entry.');

  // ---------------- by-day view
  const dates = []; for (let d = 25; d <= 30; d++) dates.push(`1863-06-${d}`); for (let d = 1; d <= 8; d++) dates.push(`1863-07-0${d}`);
  const days = dates.map((date) => {
    const inDay = obs.filter((o) => o.date === date || (o.date_end && o.date <= date && date <= o.date_end));
    const t = {};
    for (const slot of ['7am', '2pm', '9pm']) { const o = obs.find((x) => x.id === `W-${date}-temp-${slot}`); if (o) t[slot] = { value: o.value, badge: o.badge, verification: o.verification.level }; }
    return { date, weekday: weekdayOf(date), temperature_F: Object.keys(t).length ? t : null, observation_ids: inDay.map((o) => o.id) };
  });
  const allTemps = obs.filter((o) => o.element === 'temperature');
  const maxT = allTemps.reduce((m, o) => (o.value > m.value ? o : m), allTemps[0]);

  // ---------------- external statements (NCEI, MRCC) cached as text
  const ncei = await fetchCached('https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C01085', { name: 'ncei-C01085-iso.xml' });
  const mrcc = await fetchCached('https://mrcc.purdue.edu/FORTS/stations', { name: 'mrcc-forts-stations.html' });
  const tge = await fetchCached('https://www.thegettysburgexperience.com/dr-michael-jacobs-gettysburgs-weatherman', { name: 'tge-jacobs-weatherman.html' });
  const hn = await fetchCached('https://historynet.com/gettysburg-heat/', { name: 'historynet-gettysburg-heat.html' });
  const TGE = { cache: 'tge-jacobs-weatherman.html', url: 'https://www.thegettysburgexperience.com/dr-michael-jacobs-gettysburgs-weatherman', sha256: tge.meta.sha256, retrieved: tge.meta.retrieved.slice(0, 10) };
  const HN = { cache: 'historynet-gettysburg-heat.html', url: 'https://historynet.com/gettysburg-heat/', sha256: hn.meta.sha256, retrieved: hn.meta.retrieved.slice(0, 10) };
  const external_statements = [
    { id: 'X-ncei-use', cache: 'ncei-C01085-iso.xml', url: 'https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C01085', sha256: ncei.meta.sha256, retrieved: ncei.meta.retrieved.slice(0, 10), text: 'Controlled user access to the NERMS system' },
    { id: 'X-ncei-schedule', cache: 'ncei-C01085-iso.xml', url: 'https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C01085', sha256: ncei.meta.sha256, retrieved: ncei.meta.retrieved.slice(0, 10), text: 'Observations were generally conducted three times daily, around 7am, 2pm and 9pm.' },
    { id: 'X-ncei-film', cache: 'ncei-C01085-iso.xml', url: 'https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C01085', sha256: ncei.meta.sha256, retrieved: ncei.meta.retrieved.slice(0, 10), text: 'The original forms were deteriorating in the National Archives and were converted to microfilm in the late 1930s as part of a Works Projects Administration program.' },
    { id: 'X-tge-son', ...TGE, text: 'the oft quoted primary source of weather conditions during the battle is an article entitled Meteorology of the Battle, that comes to us through the professor\u2019s son 22 years after the battle', note: 'Jeffrey J. Harding, Gettysburg Experience Magazine (second-hand: a magazine article, not a record). Supports the finding that the numbers in circulation come from H. E. Jacobs\u2019s 1885 article, not from the 1864 Notes.' },
    { id: 'X-tge-aps', ...TGE, text: 'included an original set of Professor Jacobs\u2019s original daily weather observation records, both those made for the Franklin Institute and those made on behalf of the Smithsonian Institution', note: 'Harding on the American Philosophical Society collection "Meteorological Observations Made for the Franklin Institute 1839-1865". Not seen by this project.' },
    { id: 'X-tge-film', ...TGE, text: 'both the NCEI and the National Archives held microfilm copies of almost all of Professor Jacobs\u2019s daily observation records obtained on behalf of the Smithsonian Institution', note: 'Not seen by this project; the NCEI images are controlled-access.' },
    { id: 'X-tge-july', ...TGE, text: 'When comparing the daily weather observation forms for July of 1863 (NCEI/NA copies vs. APS originals), one can readily see that the same information is presented save for certain highlighted items.', note: 'Harding says he compared the July 1863 forms at both places: the form for the battle month exists in both. He prints no readings from it in the page that was cached.' },
    { id: 'X-tge-gap', ...TGE, text: 'All of the records for these months, save for August 1863, can be found in the APS collection.', note: 'The months meant, from the sentence before: NCEI and the National Archives lack the monthly reports for August to December 1863 and January to June 1864 (so August 1863 is held by neither). July 1863, the battle month, is not among the missing months.' },
    { id: 'X-tge-list', ...TGE, text: 'Meteorological observations made for the Franklin Institute 1839-1865, Mss 551.5.j12. Gettysburg College, Musselman Library Archives. Michael Jacobs Collection, MS-107, and VFM 386. National Archives. RG 27, Microfilm Publication T907, Reel 445.', note: 'The call numbers in Harding\u2019s list of archives. Which of these holds which month is stated only in the sentences above.' },
    { id: 'X-tge-inscription', ...TGE, text: 'Great battles of Gettysburg fought', note: 'Harding reports that Jacobs wrote these words on his July 1863 report; a second-hand report of a form note, not a reading of the form.' },
    { id: 'X-hn-1885', ...HN, text: 'Jacobs\u2019 original records were more detailed than the secondary source version of his records that was published by his son (Henry Eyster Jacobs) in 1885', note: 'Harding in a HistoryNet interview: the original forms (in the NCEI FORTS database) hold more than the 1885 article.' },
    { id: 'X-mrcc-keyed', cache: 'mrcc-forts-stations.html', url: 'https://mrcc.purdue.edu/FORTS/stations', sha256: mrcc.meta.sha256, retrieved: mrcc.meta.retrieved.slice(0, 10), text: 'Harrisburg', note: 'The MRCC list of keyed (digitised) FORTS stations names these Pennsylvania stations: Blooming Grove, Canonsburg, Carlisle, Erie, Franklin, Germantown, Harrisburg, Morrisville, Philadelphia, Pittsburgh. Gettysburg is not among them, so there is no keyed copy of Jacobs\'s readings to cross-check against; the NCEI images are controlled-access and were never fetched.', absent_text: 'Gettysburg' },
  ];

  for (const x of external_statements) {
    const text = htmlToText(readCached((await fetchCached(x.url, { name: x.cache })).file)).replace(/\s+/g, ' ');
    const i = text.indexOf(x.text);
    windows[x.id] = { text: i >= 0 ? text.slice(Math.max(0, i - 60), i + x.text.length + 60) : text.slice(0, 300) };
    if (x.absent_text) windows[x.id + '|absent'] = { text: 'the list of Pennsylvania stations: ' + text.slice(text.indexOf('Blooming_Grove') - 20, text.indexOf('Pittsburgh') + 40) };
  }
  const contested = [
    { id: 'C-wind-jul1', observation: 'W-1863-07-01-wind-speed', question: 'How fast was the wind on July 1 (and, by inheritance, July 2)?', values: [{ value: 2, unit: 'miles per hour', sources: ['rx'] }, { value: 12, unit: 'miles per hour', sources: ['ecw', 'ecw-image'] }], status: 'open', shown_first: null, shown_first_rule: 'No value is shown first: both are shown with their sources until the printed page or the form is read. A page may state "Contested: 2 or 12 miles per hour".' },
    { id: 'C-morning-jul2', question: 'What was the morning of July 2 like?', values: [{ summary: 'pleasant, calm, sun shining mildly through a smoky atmosphere', witness: 'Michael Jacobs, Notes (1864), p. 32', quote: 'Q-N-morning-jul2', badge: 'Reported' }, { summary: 'thick and sultry, sky overcast with low, vapory clouds', witness: 'Frank A. Haskell, The Battle of Gettysburg (Wisconsin History Commission reprint, 1908), p. 20', quote: 'Q-haskell-morning', badge: 'Reported' }], status: 'open', note: 'Different places and hours: Jacobs was in the town; Haskell rode with the Second Corps up the Taneytown road before six. Written down at different times (Jacobs 1863-64; Haskell a letter of July 1863 first printed in 1898). Both are shown.' },
  ];

  return { problems, copies, quotes, absent, obs, days, maxT, external_statements, contested, windows, rxFetch, ecwFetch, imgMeta, visual };
}

export async function buildHaskell() {
  const r = await loadIaLeaves('battleofgettysbu00haskuoft', { kind: 'djvu' });
  const text = 'The morning was thick and sultry, the sky overcast with low, vapory clouds';
  const hits = locateQuote(r.leaves, text);
  if (!hits.length) throw new Error('Haskell quote not found');
  const leaf = hits[0].leaf, p = pageOfLeaf(r.leaves, leaf);
  return { text, leaf, page: p.page, window: windowAround(r.leaves, leaf, text), meta: r.meta };
}

async function main() {
  const b = await build();
  const hk = await buildHaskell();
  b.quotes.push({ id: 'Q-haskell-morning', source: 'haskell-1908', text: hk.text, printed_page: hk.page, date: '1863-07-02', element: 'sky', role: 'weather remark (morning of July 2, before six)', witnesses: [{ witness: 'toronto-1908', ia: 'battleofgettysbu00haskuoft', kind: 'djvu', leaf: hk.leaf, printed_page: hk.page, note: 'the page number is printed in square brackets at the foot of the page: [20]' }] });
  b.windows['Q-haskell-morning|toronto-1908'] = { leaf: hk.leaf, printed_page: hk.page, text: hk.window };
  if (b.problems.length) { console.error('BUILD PROBLEMS:\n - ' + b.problems.join('\n - ')); process.exit(1); }
  const now = '2026-10-04';
  const counts = {};
  for (const o of b.obs) counts[o.verification?.level || 'none'] = (counts[o.verification?.level || 'none'] || 0) + 1;
  const tempCounts = {};
  for (const o of b.obs.filter((x) => x.element === 'temperature')) tempCounts[o.verification.level] = (tempCounts[o.verification.level] || 0) + 1;
  const data = {
    schema_version: 1, dataset: 'weather_by_day',
    title: 'Weather at Gettysburg, June 25 to July 8, 1863, from Michael Jacobs\'s record and his own narrative',
    status: 'Verified as far as the sources allow; see verification_summary and warnings. The numbers are second-hand: the original observation forms were not seen.',
    badge_legend: {
      Measured: 'an instrument reading (thermometer, rain gauge) by the observer; here relayed second-hand',
      Observed: 'a trained observer\'s eye estimate recorded in his log (cloud cover and type, wind direction and force, thunder)',
      Reported: 'a narrative statement by a witness, not a log entry',
      Computed: 'derived from an ephemeris (none in this file; see astro_by_day.json)',
      Modelled: 'an estimate from a model (none in this file; a heat index would be Modelled and is not included)',
      Contested: 'two or more sources disagree and none is chosen',
    },
    site: { name: 'Gettysburg, Pennsylvania (Pennsylvania College, the observer\'s station)', note: 'The readings were taken in the town by Michael Jacobs; the thermometer exposure is not recorded in these sources (the pitch\'s remark that it was in shade is an inference).' },
    sources: [
      { id: 'jacobs-notes-1864', kind: 'book', tier: 'A1', title: 'Notes on the Rebel Invasion of Maryland and Pennsylvania, and the Battle of Gettysburg, July 1st, 2d and 3d, 1863. By M. Jacobs', author: 'Michael Jacobs', imprint: 'Philadelphia: J. B. Lippincott & Co., 1864', imprint_year: 1864, copyright_entry: 'Entered, according to Act of Congress, in the year 1863, by J. B. Lippincott & Co. (printed on the verso of the title page)', rights: 'public domain in the United States by date (published 1864)', first_edition_only: true, copies: NOTES_COPIES.map(({ id, ia, kind, holder, pages_in_scan }) => ({ id, ia, kind, holder, pages_in_scan, url: `https://archive.org/details/${ia}` })), not_used: [{ ia: 'notesonrebelinva00jaco_0', reason: 'FIFTH EDITION, REVISED, "Copyrighted 1888 by G. E. Jacobs" (IA publisher G.E. Jacobs, date 1888): a later revised edition with its own pagination; the plan says to use original editions. It is also public domain by date but was not used.' }], imprint_evidence: ['the title page of copy A (leaf 11): "PHILADELPHIA: J. B. LIPPINCOTT & CO. 1864."', 'the entry notice of copy A (leaf 12): "Entered, according to Act of Congress, in the year 1863, by J. B. LIPPINCOTT & CO., ..."'], contains_weather_table: false, contains_weather_table_basis: `searched all three scans for "Thermometer" and "barometer" and "seemed tame": ${Object.entries(b.absent).map(([k, v]) => `${k}: ${v.map((x) => x.copy + '=' + (x.found ? 'FOUND' : 'absent')).join(' ')}`).join('; ')}` },
      { id: ARTICLE_1885.id, kind: 'newspaper article', tier: 'A1', title: ARTICLE_1885.title, author: ARTICLE_1885.author, imprint: ARTICLE_1885.publication, imprint_year: 1885, issue_date_reported: ARTICLE_1885.issue_date_reported, issue_date_basis: ARTICLE_1885.issue_date_basis, rights: 'public domain in the United States by date (published 1885)', page: 'UNKNOWN [OWNER TO PROVIDE: issue, page and column from the printed newspaper]', witnesses: [{ id: 'rx', name: ARTICLE_1885.rx.name, url: ARTICLE_1885.rx.url, kind: 'typed transcription of the full article', sha256: b.rxFetch.meta.sha256, retrieved: b.rxFetch.meta.retrieved.slice(0, 10) }, { id: 'ecw', name: ARTICLE_1885.ecw.name, url: ARTICLE_1885.ecw.url, kind: 'typed summary with the readings for July 1-3 (blog text; only the thunder sentence is quoted)', sha256: b.ecwFetch.meta.sha256, retrieved: b.ecwFetch.meta.retrieved.slice(0, 10) }, { id: 'ecw-image', name: ARTICLE_1885.ecw_image.name, url: ARTICLE_1885.ecw_image.url, kind: 'image of the printed clipping, read by the Claude model (data-src/environment/visual_readings.json)', sha256: b.imgMeta.sha256, retrieved: '2026-10-04' }], scan_search: 'The Library of Congress item record for The Star and Sentinel (Gettysburg, Pa.) 1867-1961, LCCN sn83032076, says digitized: false. No other scan was located.', note: 'This, and not the 1864 Notes, is the printed source of the thermometer table, the cloud record, the rain totals and the thunder note. It reports the observations of Michael Jacobs (1808-1871), made for the Smithsonian Institution, as examined by his son on July 29-30, 1885.' },
      { id: 'haskell-1908', kind: 'book', tier: 'A1', title: 'The Battle of Gettysburg, by Frank Aretas Haskell, Wisconsin History Commission Reprints, No. 1', imprint: 'Wisconsin History Commission, November 1908 (Democrat Printing Co., State Printer)', imprint_year: 1908, rights: 'public domain in the United States by date', ia: 'battleofgettysbu00haskuoft', note: 'Haskell wrote it as a letter in July 1863; first printed 1898 (MOLLUS Massachusetts Commandery); this is the 1908 reprint, whose pages carry the numbers in square brackets.' },
      { id: 'ncei-c01085', kind: 'catalogue record', tier: 'B', title: 'NOAA NCEI, Pre-Weather Bureau Observation Networks (gov.noaa.ncdc:C01085)', url: 'https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C01085', rights: 'US Government work; the record itself is quoted. Its images are "Controlled user access to the NERMS system": they were NOT fetched, scraped or viewed. The pitch asks to write ncei.info@noaa.gov before republishing any image.' },
      { id: 'mrcc-forts', kind: 'catalogue record', tier: 'B', title: 'Midwestern Regional Climate Center, FORTS keyed stations list', url: 'https://mrcc.purdue.edu/FORTS/stations', rights: 'only the station list was read; the data-download pages ask for a contact form and were not used.' },
    ],
    where_the_readings_are: {
      holdings: [
        { holder: 'American Philosophical Society, Philadelphia', what: 'Mss 551.5.j12, "Meteorological Observations Made for the Franklin Institute 1839-1865": an original set of Jacobs\u2019s daily forms (his retained copy), per Harding', evidence: ['X-tge-aps', 'X-tge-list'], seen_by_this_project: false },
        { holder: 'National Archives (NARA)', what: 'RG 27, Microfilm Publication T907, Reel 445: microfilm of the forms Jacobs submitted to the Smithsonian (almost all of them); no monthly reports for August 1863 to June 1864', evidence: ['X-tge-film', 'X-tge-gap', 'X-tge-list'], seen_by_this_project: false },
        { holder: 'NOAA NCEI, Asheville (FORTS database)', what: 'microfilm copies of the same forms, per Harding; the NCEI catalogue record says its images are under "Controlled user access to the NERMS system"', evidence: ['X-ncei-use', 'X-tge-film', 'X-hn-1885'], seen_by_this_project: false },
        { holder: 'Gettysburg College, Musselman Library Archives', what: 'Michael Jacobs Collection, MS-107, and VFM 386: named in Harding\u2019s list of archives; what it holds of the weather record is not stated in the cached page', evidence: ['X-tge-list'], seen_by_this_project: false },
      ],
      july_1863_form: 'Harding says he compared the July 1863 forms at NCEI/NARA and at the APS and that they carry the same information (X-tge-july). So the form that would settle the wind speed (2 against 12 miles per hour, C-wind-jul1) and the first rain figure exists in at least two places. [OWNER TO PROVIDE: a read of the July 1 to July 4 1863 form from the APS or from NARA microfilm T907 reel 445; no NCEI image may be displayed without written permission.]',
      statement: 'Michael Jacobs observed three times a day for the Smithsonian Institution. Copies of his forms are said to be at the American Philosophical Society (Franklin Institute series, per the Gettysburg Experience article), and as microfilm at NARA and NCEI. This project saw none of them. What it holds is the 1885 article by his son.',
      evidence: ['Gettysburg Experience, "Dr. Michael Jacobs: Gettysburg\'s Weatherman" (https://www.thegettysburgexperience.com/dr-michael-jacobs-gettysburgs-weatherman), read 2026-10-04: the oft-quoted source is the article "Meteorology of the Battle" that comes through the professor\'s son 22 years after the battle.', 'HistoryNet interview with Jeffrey J. Harding (https://historynet.com/gettysburg-heat/), read 2026-10-04: his original records were more detailed than the version published by his son in 1885.'],
    },
    external_statements: b.external_statements,
    quotes: b.quotes,
    observations: b.obs,
    days: b.days,
    contested: b.contested,
    pitch_checks: [
      { id: 'PC1', claim: 'July 2: readings of 74, 81 and 76 degrees', where: 'PITCH.md idea 1', computed: b.obs.filter((o) => o.date === '1863-07-02' && o.element === 'temperature').map((o) => o.value).join(', '), agrees: b.obs.filter((o) => o.date === '1863-07-02' && o.element === 'temperature').map((o) => o.value).join(',') === '74,81,76' },
      { id: 'PC2', claim: 'July 3, 2 p.m., 87 degrees is the highest of the readings in the transcribed June 25 to July 8 record', where: 'PITCH.md idea 1', computed: `maximum of the ${b.obs.filter((o) => o.element === 'temperature').length} tabulated readings (June 25 to July 4) = ${b.maxT.value} (${b.maxT.date} ${b.maxT.slot}); no tabulated readings exist for July 5-8`, agrees: b.maxT.value === 87 && b.maxT.id === 'W-1863-07-03-temp-2pm' },
      { id: 'PC3', claim: 'Thunder storm in the neighborhood at 6 p.m. on July 3; the thunder "seemed tame, after the artillery firing"', where: 'PITCH.md idea 1', computed: 'present in the 1885 article (two typed witnesses and the image); ABSENT from all three 1864 scans of the Notes', agrees: true, correction: 'The pitch cites the Notes (ENV-F11); the sentence is in H. E. Jacobs\'s 1885 article.' },
      { id: 'PC4', claim: 'Rainfall 1.39 inches over July 4-5', where: 'PITCH.md idea 1', computed: '1.390 aggregating July 4 6 a.m. to July 5 4 a.m. (typed witness; the image digit is damaged and compatible)', agrees: true, note: 'unit "inches" is inferred, not printed beside this figure' },
      { id: 'PC5', claim: 'Jacobs: "pleasant, the air was calm, the sun shone mildly through a smoky atmosphere" on the morning of July 2', where: 'PITCH.md idea 1', computed: 'Notes (1864) p. 32, found in three scans', agrees: true },
      { id: 'PC6', claim: 'Jacobs\'s "wet from the rain" line is dated June 26, not July 1', where: 'PITCH.md credibility notes', computed: 'Notes (1864) p. 16, three scans; the same page continues "General Early ... remained in town over Friday night", and the heading "Friday, June 26." is on p. 14', agrees: true },
      { id: 'PC7', claim: 'Wind on July 3: about 12 mph in one transcription, about 2 mph in another', where: 'PITCH.md conflict ledger row 14 and idea 1', computed: 'The conflict (2 against 12 miles per hour) is in the paragraph for the FIRST DAY (July 1); July 2 says "wind as on preceding day"; July 3 gives "Wind S. S. W., very gentle" with no speed', agrees: false, correction: 'Misdated in the pitch: the conflict is about July 1 (inherited by July 2), not July 3.' },
      { id: 'PC8', claim: 'Jacobs timed the July 3 cannonade at seven minutes past 1 p.m.', where: 'PITCH.md idea 1', computed: 'Notes (1864) p. 41, found in three scans: "At seven minutes past 1 p. m., the awful and portentous silence was broken."', agrees: true },
      { id: 'PC9', claim: 'Weather figures come from Jacobs\'s Notes on the Rebel Invasion (the task brief and ENV-F10/F11)', where: 'task brief', computed: 'The Notes contain no thermometer table and no wind speed; the figures are in the 1885 newspaper article by his son', agrees: false, correction: 'Source of the numbers is jacobs-meteorology-1885, not jacobs-notes-1864.' },
    ],
    warnings: [
      'The 1885 article is known to this project only through two typed web transcriptions and one low-resolution image. No scan of the Star and Sentinel page was located (LoC: not digitised), and the original observation forms (APS, NARA, NCEI microfilm) were not seen. [OWNER TO PROVIDE or commission a read of the printed page or the form.]',
      'The Civil War Rx transcription contains character-recognition style slips ("1, - 280", "87(", "1.300.The maximum"); a dropped digit in "(2 miles per hour)" is therefore plausible, but nothing here decides it.',
      'The IA item notesonrebelinva00jaco_0 is the 1888 fifth, revised edition; it was not used. Use the 1864 scans (three used here).',
      'Measured means an instrument reading; the cloud, wind-direction and thunder entries are Observed; Michael Jacobs\'s narrative lines are Reported.',
      'No per-tick temperature may be drawn from these three daily readings; the pitch already says bands, not points.',
      'Rights: the Notes (1864) and the article (1885) are public domain by date. NCEI images were never fetched (controlled access). Nese and Harding (2025) is copyrighted and was not used.',
    ],
    verification_summary: {
      observations: b.obs.length, by_level: counts,
      temperature_readings: b.obs.filter((o) => o.element === 'temperature').length, temperature_by_level: tempCounts,
      values_confirmed_by_two_independent_paths: b.obs.filter((o) => o.verification && o.verification.level === 'two_independent_paths' && typeof o.value === 'number').length,
      two_paths_definition: 'path 1 = the Civil War Rx typed text; path 2 = the clipping (Emerging Civil War typed it, and the Claude model read the image). A damaged image cell that is merely compatible does not count as a second path.',
      numbers_contested: b.obs.filter((o) => o.badge === 'Contested' && o.element === 'wind_speed').length,
    },
  };
  fs.mkdirSync(OUT, { recursive: true });
  const outputs = { 'weather_by_day.json': pretty(data) + '\n', 'source_windows.json': pretty({ schema_version: 1, note: 'Short windows of the source text around each quote, committed so the quotes can be re-checked offline. The authoritative check is against the cached source (tmp/env-cache), see validate.mjs.', windows: b.windows }) + '\n' };
  const check = process.argv.includes('--check');
  let bad = 0;
  for (const [name, text] of Object.entries(outputs)) {
    const file = path.join(OUT, name);
    if (check) { const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null; if (cur !== text) { console.error('STALE: ' + name); bad++; } else console.log('ok ' + name); }
    else { fs.writeFileSync(file, text); console.log('wrote ' + path.relative(ROOT, file) + ' (' + text.length + ' bytes)'); }
  }
  console.log(JSON.stringify(data.verification_summary, null, 1));
  process.exit(bad ? 1 : 0);
}
if (process.argv[1] && path.basename(process.argv[1]) === 'build-weather.mjs') await main();
