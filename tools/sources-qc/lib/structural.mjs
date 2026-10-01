// Structural checks of the Official Records entries (Parts I-III) and the page pointers (Part XIII) of
// Gettysburg_Sources_v2.docx against an INDEPENDENT derivation: the OCR of the Internet Archive scans
// (warofrebellion271unit / 272unit / 273unit) as segmented by the historian ingestion
// (historian-src/corpus/or27/reports.json, dispatches.json, raw passages) and the Archive's own folio maps.
//
// "Independent" means: the docx took its report numbers, titles and page ranges from Civil War Cycling's index
// and its links from HathiTrust/eHistory; the OCR index was built by reading the printed headers of the scan.
// Two separate derivations that agree on (report number, author, side, first page) are strong evidence that the
// entry identifies a real report at the page it names. They do NOT prove that the link opens that page
// (HathiTrust and eHistory refuse automated fetches).
//
// Everything here is a pure function of its inputs so it can be unit-tested; the CLI is structural-check.mjs.

export const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

export function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** edit-distance tolerance by word length: OCR misreads a letter or two in long names, never in short ones */
export const tolFor = (len) => (len >= 9 ? 2 : len >= 5 ? 1 : 0);

export function surnameOf(author) {
  const t = norm(author).replace(/\b(jr|sr)\b/g, '').trim().split(' ').filter(Boolean);
  return t.at(-1) ?? null;
}

/** best fuzzy match of `word` among `tokens`; returns {dist, token} */
export function bestToken(word, tokens) {
  let best = { dist: 99, token: null };
  for (const t of tokens) {
    const d = lev(word, t);
    if (d < best.dist) best = { dist: d, token: t };
  }
  return best;
}

const STOP = new Set(['of', 'the', 'and', 'for', 'at', 'in', 'on', 'to', 'from', 'by', 'a', 'an', 'army', 'corps', 'report', 'reports', 'return', 'commanding']);
export function titleOverlap(a, b) {
  const ta = norm(a).split(' ').filter((w) => w.length > 2 && !STOP.has(w));
  const tb = norm(b).split(' ').filter(Boolean);
  if (!ta.length) return null;
  let hit = 0;
  for (const w of ta) if (bestToken(w, tb).dist <= tolFor(w.length)) hit++;
  return hit / ta.length;
}

/** docx kind (from title or description) -> acceptable corpus kinds */
const KIND_OK = {
  report: ['report'],
  return: ['return', 'report'],
  itinerary: ['itinerary', 'return'],
  order_of_battle: ['organization'],
  roster: ['honors', 'other'],
  testimony: ['proceedings'],
};

export function classifyPages(docx, ocr) {
  const ds = docx.start, de = docx.end, os = ocr.start, oe = ocr.end;
  const dS = ds - os, dE = de - oe;
  let cls;
  if (dS === 0 && dE === 0) cls = 'exact';
  else if (Math.abs(dS) <= 1 && Math.abs(dE) <= 1) cls = 'boundary';
  else if (Math.abs(dS) <= 1) cls = 'end_differs';
  else cls = 'start_differs';
  return { cls, delta_start: dS, delta_end: dE };
}

/**
 * Check one Parts I-III entry.
 * ctx = { reports: Map("part:no" -> corpus report), folios: {1:Set,2:Set,3:Set}, hathiVolume: {1:id,2:id,3:id},
 *         hathiOffsetMode: {1:n,2:n}, fallback: (entry)=>{...}|null }
 */
export function checkReportEntry(e, ctx) {
  const f = e.fields;
  const flags = [];
  const notes = [];
  const checks = {};
  const key = `${f.or_part}:${f.report_no}`;
  const c = ctx.reports.get(key) ?? null;

  // ---- links (shape only; the hosts refuse automated fetches) ----
  const hathiExpected = ctx.hathiVolume[f.or_part];
  checks.hathi_volume = { ok: f.hathi_id === hathiExpected, entry: f.hathi_id, expected: hathiExpected };
  if (!checks.hathi_volume.ok) flags.push('hathi_volume_mismatch');
  const mode = ctx.hathiOffsetMode[f.or_part];
  const off = f.hathi_seq != null && f.page_start != null ? f.hathi_seq - f.page_start : null;
  checks.hathi_seq_offset = { offset: off, modal: mode, ok: off === mode };
  if (off !== mode) flags.push('hathi_seq_offset_outlier');
  if (f.or_part === 1) {
    checks.ehistory = { ok: f.ehistory_serial === 43 && f.ehistory_page === f.page_start, serial: f.ehistory_serial, page: f.ehistory_page };
    if (!checks.ehistory.ok) flags.push('ehistory_link_mismatch');
  } else {
    checks.ehistory = { ok: true, absent: true, note: 'Parts II and III carry only a HathiTrust scan link (no eHistory transcription link)' };
    notes.push('no_ehistory_link');
  }
  const folios = ctx.folios[f.or_part];
  checks.page_start_in_ia_folios = { ok: !!folios && folios.has(f.page_start), page: f.page_start };
  if (!checks.page_start_in_ia_folios.ok) flags.push('page_start_not_in_ia_folio_map');

  // ---- identity against the OCR index ----
  if (!c) {
    const fb = ctx.fallback ? ctx.fallback(e) : null;
    checks.number_in_ocr_index = { ok: false, key };
    checks.fallback = fb;
    if (fb && fb.ok) {
      notes.push('header_missing_in_ocr_index_but_confirmed_by_contents_list_and_signature');
      return { checks, flags, notes, ocr: null, status: flags.length ? 'flag' : 'pass_notes' };
    }
    flags.push('not_found_in_ocr_index');
    return { checks, flags, notes, ocr: null, status: 'flag' };
  }
  checks.number_in_ocr_index = { ok: true, key, id: c.id };

  // author (person) or title overlap (non-person documents)
  const person = f.doc_kind === 'report' && f.author && !/\b(medals|roll|record|organization|abstract|itinerary|return)\b/i.test(f.author);
  if (person && c.author?.name) {
    const sur = surnameOf(f.author);
    const toks = norm(`${c.author.name} ${c.author.raw ?? ''}`).split(' ').filter(Boolean);
    const b = bestToken(sur, toks);
    const ok = b.dist <= tolFor(sur.length);
    checks.author = { ok, entry: f.author, ocr: c.author.name, surname: sur, matched: b.token, edit_distance: b.dist, mode: 'surname' };
    if (!ok) flags.push('author_surname_mismatch');
    else if (b.dist > 0) notes.push(`author_surname_fuzzy_${b.dist}`);
  } else {
    const ov = titleOverlap(f.title_after_number ?? e.title, `${c.title} ${c.toc_title ?? ''}`);
    const ok = ov != null && ov >= 0.6;
    checks.author = { ok, entry: f.title_after_number, ocr: c.toc_title ?? c.title, title_overlap: ov, mode: 'title_overlap' };
    if (!ok) flags.push('title_mismatch');
  }

  // side: Part I union, Part II other federal (union), Part III confederate
  const wantSide = f.side === 'other_federal' ? 'union' : f.side;
  checks.side = { ok: c.side === wantSide, entry: f.side, ocr: c.side };
  if (!checks.side.ok) flags.push('side_mismatch');

  // kind (note only): the generic description template names every item an "after-action report"
  const dk = f.doc_kind_from_description ?? f.doc_kind;
  const okKinds = KIND_OK[dk] ?? [dk];
  checks.kind = { ok: okKinds.includes(c.kind), entry: dk, ocr: c.kind };
  if (!checks.kind.ok) notes.push(`kind_differs:${dk}->${c.kind}`);

  // pages
  const pg = classifyPages({ start: f.page_start, end: f.page_end }, c.pages);
  checks.pages = { ...pg, docx: [f.page_start, f.page_end], ocr: [c.pages.start, c.pages.end] };
  if (pg.cls === 'boundary') notes.push('page_boundary_differs_by_one');
  if (pg.cls === 'end_differs') notes.push(`end_page_differs_by_${pg.delta_end}`);
  if (pg.cls === 'start_differs') flags.push('first_page_differs');

  // scope: does the OCR say the report is about the Gettysburg campaign at all?
  checks.scope = { ocr: c.scope, claim: 'the Gettysburg Campaign' };
  if (c.scope !== 'gettysburg') notes.push(`scope_${c.scope}`);
  checks.contemporaneity = { ocr_contemporaneous: c.persp?.contemporaneous ?? null, lag_days: c.persp?.lag_days ?? null };

  const hard = flags.filter((x) => !['hathi_seq_offset_outlier'].includes(x));
  const status = hard.length ? 'flag' : notes.some((x) => /^(page_boundary|end_page|header_missing|author_surname_fuzzy)/.test(x)) ? 'pass_notes' : 'pass';
  return {
    checks, flags, notes, status,
    ocr: { id: c.id, pages: c.pages, scope: c.scope, kind: c.kind, level: c.level, side: c.side, words: c.words ?? null, written: c.written?.iso ?? null, composite: !!c.composite, scan: c.scan ?? null, persp: c.persp ? { contemporaneous: c.persp.contemporaneous ?? null, retrospective: c.persp.retrospective ?? null, lag_days: c.persp.lag_days ?? null, genre: c.persp.genre ?? null } : null },
  };
}

/**
 * Check one Part XIII page pointer. ctx = { pageSides: Map(page -> {starts:[sides], inferred:'union'|'confederate'|null, dispatches:n}),
 *   folios3:Set, lastFolio:number }
 */
export function checkPagePointer(e, ctx) {
  const f = e.fields;
  const flags = [];
  const notes = [];
  const checks = {};
  checks.ehistory = { ok: f.ehistory_serial === 45 && f.ehistory_page === f.page, serial: f.ehistory_serial, page: f.ehistory_page };
  if (!checks.ehistory.ok) flags.push('ehistory_link_mismatch');
  checks.page_in_volume = { ok: f.page >= 3 && f.page <= ctx.lastFolio, page: f.page, volume_folios: [3, ctx.lastFolio] };
  if (!checks.page_in_volume.ok) flags.push('page_outside_volume');
  checks.page_in_ia_folios = { ok: ctx.folios3.has(f.page) || f.page === 3, page: f.page };
  if (!checks.page_in_ia_folios.ok) flags.push('page_not_in_ia_folio_map');
  const ps = ctx.pageSides.get(f.page) ?? { starts: [], inferred: null, dispatches: 0 };
  checks.dispatches_starting_on_page = ps.dispatches;
  const inferred = ps.starts.length ? (new Set(ps.starts).size === 1 ? ps.starts[0] : 'mixed') : ps.inferred;
  checks.side = { label: f.page_side, label_text: f.page_label, ocr_side: inferred, basis: ps.starts.length ? 'dispatch_headers_on_page' : ps.inferred ? 'continuation_of_previous_dispatch' : 'none' };
  let label_state;
  if (f.page_side === 'unknown' || /transition/i.test(f.page_label ?? '')) {
    label_state = 'hedged';
    notes.push('label_hedged_section_transition');
    checks.side.ok = null;
    if (inferred === 'union' || inferred === 'confederate') checks.side.corrected = inferred;
  } else if (!inferred) {
    label_state = 'unchecked';
    checks.side.ok = null;
    notes.push('side_not_checkable_no_dispatch_data');
  } else {
    checks.side.ok = inferred === f.page_side;
    label_state = checks.side.ok ? 'agrees' : 'disagrees';
    if (!checks.side.ok) flags.push('side_label_disagrees');
  }
  if (ps.dispatches === 0) notes.push('no_dispatch_begins_on_page');
  const status = flags.length ? 'flag' : label_state === 'hedged' ? 'pass_notes' : 'pass';
  return { checks, flags, notes, status, label_state, dispatches: ps.dispatches };
}

/** Build the page -> sides table from dispatch rows [{page, side}] (sorted by page). */
export function buildPageSides(rows, lastPage) {
  const byPage = new Map();
  for (const r of rows) {
    if (r.page == null) continue;
    if (!byPage.has(r.page)) byPage.set(r.page, []);
    byPage.get(r.page).push(r.side);
  }
  const out = new Map();
  let lastSide = null;
  for (let p = 1; p <= lastPage; p++) {
    const starts = byPage.get(p) ?? [];
    if (starts.length) lastSide = new Set(starts).size === 1 ? starts[0] : lastSide;
    out.set(p, { starts, inferred: starts.length ? null : lastSide, dispatches: starts.length });
  }
  return out;
}

/** Parse the contents-list line and signature for a report whose header the OCR index could not find. */
export function contentsLineCheck(normalizedText, e) {
  const f = e.fields;
  const sur = surnameOf(f.author);
  if (!sur) return { ok: false, why: 'no_author' };
  const re = new RegExp(`^No\\. ${f.report_no}\\.\\s*[\\u2014\\u2013-]+\\s*(.+)$`, 'm');
  const m = re.exec(normalizedText);
  if (!m) return { ok: false, why: 'contents_line_not_found' };
  const toks = norm(m[1]).split(' ');
  const b = bestToken(sur, toks);
  return { ok: b.dist <= tolFor(sur.length), contents_line: m[0].trim(), surname: sur, edit_distance: b.dist };
}
