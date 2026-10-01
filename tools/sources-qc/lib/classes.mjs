// Classification of the 114 non-OR entries (Parts IV-XII) by what KIND of thing the entry points at, which part of the
// story it covers, and whether the Historian's catalogue already plans the same source.
//
// Everything here is read from the entry's own title and description in the list plus, where the link probe fetched it,
// the host's page title. It is the registry builder's judgement from those labels, NOT a verifier finding, and every
// record carries basis: 'list-title-and-description'. It exists so the QC report can say how many of the 114 are separate
// writings, how many are indexes/volumes/duplicates, and how many are about the fighting rather than the invasion.

/**
 * resource_class
 *   writing      one document, letter, diary, account, article or report by identifiable hands
 *   scholarship  a modern essay or study (secondary: facts, never a quote corpus without a licence)
 *   volume       a whole book or serial volume that CONTAINS many writings (counts as one work, not as its contents)
 *   index        a finding aid, index, collection or landing page
 *   guide        a park overview or blog post that points at other sources
 * scope_hint (from the description only)
 *   battle       about the fighting at Gettysburg 1-3 July (including the retreat)
 *   campaign     about the invasion, the occupation of Carlisle/Chambersburg/York, or the approach march
 *   post-battle  Lincoln's address, the 1913 reunion, an interview, a postwar order
 *   resource     a volume or index covering all of it
 */
const R = (resource_class, scope_hint, extra = {}) => ({ resource_class, scope_hint, basis: 'list-title-and-description', ...extra });

const RANGE_RULES = [
  [544, 544, R('writing', 'campaign')],
  [545, 548, R('writing', 'battle')],
  [549, 549, R('volume', 'battle')],
  [550, 550, R('writing', 'battle')],
  [551, 551, R('volume', 'battle')],
  [552, 552, R('writing', 'campaign')],
  [553, 556, R('writing', 'battle')],
  [557, 558, R('writing', 'battle')],
  [559, 559, R('guide', 'battle')],
  [560, 560, R('scholarship', 'battle')],
  [561, 562, R('scholarship', 'campaign')],
  [563, 563, R('scholarship', 'battle')],
  [564, 565, R('scholarship', 'post-battle')],
  [566, 566, R('scholarship', 'battle')],
  [567, 567, R('scholarship', 'battle')],
  [568, 568, R('scholarship', 'battle')],
  [569, 570, R('scholarship', 'post-battle')],
  [571, 571, R('index', 'resource')],
  [572, 576, R('volume', 'resource')],
  [577, 578, R('index', 'resource')],
  [579, 628, R('writing', 'campaign')],
  [629, 629, R('writing', 'post-battle')],
  [630, 630, R('writing', 'post-battle')],
  [631, 631, R('volume', 'post-battle')],
  [632, 633, R('writing', 'campaign')],
  [634, 635, R('writing', 'battle')],
  [636, 636, R('writing', 'campaign')],
  [637, 638, R('scholarship', 'campaign')],
  [639, 639, R('guide', 'resource')],
  [640, 640, R('writing', 'campaign')],
  [641, 641, R('index', 'resource')],
  [642, 642, R('writing', 'campaign')],
  [643, 643, R('index', 'resource')],
  [644, 644, R('writing', 'campaign')],
  [645, 647, R('writing', 'campaign')],
  [648, 650, R('writing', 'campaign')],
  [651, 651, R('index', 'resource')],
  [652, 652, R('writing', 'campaign')],
  [653, 656, R('volume', 'battle')],
  [657, 657, R('volume', 'resource')],
];

/** overrides where the range default is wrong for a single entry */
const OVERRIDES = {
  579: R('writing', 'campaign', { note: 'the Google Books link is a 2001 LSU Press edition (Terry L. Jones), not the 1860s-70s text' }),
  582: R('writing', 'campaign'),
  583: R('writing', 'campaign'),
  584: R('writing', 'campaign', { note: 'HathiTrust catalog API names the volume: Clark, Histories of the several regiments and battalions from North Carolina, v.2 (1901)' }),
  585: R('writing', 'campaign', { note: 'HathiTrust catalog API names the volume: Southern Historical Society Papers v.33 (1905)' }),
  606: R('writing', 'campaign', { note: 'the Google Books link is R. J. Trout, Galloping Thunder (Stackpole, 2002), a modern book, not Shreve\'s own words' }),
  608: R('writing', 'campaign'),
  610: R('writing', 'campaign'),
  616: R('writing', 'campaign'),
  622: R('volume', 'campaign'),
  628: R('volume', 'campaign'),
  635: R('volume', 'battle'),
  627: R('writing', 'campaign'),
  626: R('writing', 'campaign'),
};

export function classOf(n) {
  if (OVERRIDES[n]) return OVERRIDES[n];
  for (const [a, b, c] of RANGE_RULES) if (n >= a && n <= b) return c;
  return null;
}

/**
 * Overlap with the Historian's existing source catalogues (docs/plan/data/hist-sources-1.catalog.json = "H1",
 * hist-sources-2.catalog.json = "H2"). Matched on the work named in the entry title against the catalogue entry name.
 */
export const CATALOG_OVERLAP = [
  [544, 552, ['H1:SRC-08'], 'Southern Historical Society Papers (SHSP), vols. 1-43; the plan skips SHSP pending a historian (docs/plan/FINAL/14 H.2 item 5)'],
  [553, 555, ['H1:SRC-31'], 'Project Gutenberg Haskell #33121; the 1908 IA scan and the Bartleby reprint are the same work'],
  [557, 557, ['H2:SRC-23'], 'Civilian narratives (Pierce, Buehler, Hoke, Jacobs, Bates)'],
  [558, 558, ['H1:SRC-31'], 'Project Gutenberg Storrick #50504'],
  [559, 559, ['H2:SRC-23', 'H2:SRC-05'], 'NPS Civilians at Gettysburg page'],
  [572, 574, ['H1:SRC-01', 'H1:SRC-02', 'H1:SRC-06', 'H2:SRC-19'], 'Official Records vol. 27 parts 1-3 are the first thing the historian ingests (IA OCR)'],
  [575, 575, ['H1:SRC-38'], 'eHistory OR transcriptions are listed in the catalogue as NOT VERIFIED and blocked to bots'],
  [576, 576, ['H1:SRC-01'], 'Internet Archive OR set'],
  [584, 584, ['H1:SRC-12'], 'Clark, Histories of the several regiments and battalions from North Carolina'],
  [585, 585, ['H1:SRC-08'], 'SHSP v.33'],
  [610, 610, ['H1:SRC-28'], 'Chronicling America July 1863 coverage'],
  [622, 622, ['H2:SRC-23'], 'Hoke'],
  [628, 628, ['H2:SRC-23'], 'Hoke'],
  [634, 634, ['H1:SRC-28'], 'Chronicling America July 1863 coverage'],
  [652, 652, ['H1:SRC-08'], 'SHSP vol. 28'],
  [653, 655, ['H1:SRC-03'], 'New York Monuments Commission Final Report / New York at Gettysburg'],
  [656, 656, ['H1:SRC-04'], 'Pennsylvania at Gettysburg'],
];

export function overlapOf(n) {
  const ids = [];
  const why = [];
  for (const [a, b, c, w] of CATALOG_OVERLAP) if (n >= a && n <= b) { ids.push(...c); why.push(w); }
  return ids.length ? { catalog_ids: [...new Set(ids)], why: why.join('; '), basis: 'title match to the catalogue entry name (registry-builder judgement)' } : null;
}

/**
 * Relations between non-OR entries (same work on several hosts, item inside a collection). Only recorded where the
 * two entries' own titles or hosts make it plain. 'same_book' means the same Google Books id (a hard fact from the URL).
 */
export const WORK_GROUPS = [
  { id: 'haskell-battle-of-gettysburg', members: [553, 554, 555], relation: 'same-work-different-host', basis: 'identical author and title in the list (Gutenberg, IA 1908 scan, Bartleby reprint)' },
  { id: 'wingate-22nd-nysng-1896', members: [594, 598, 604], relation: 'same-book-different-pages', basis: 'identical Google Books id CJQQAAAAYAAJ (hard fact from the URL); 598 and 604 are accounts quoted inside the book at pp. 221 and 214' },
  { id: 'landis-battery-report', members: [595, 599], relation: 'same-document-two-pages', basis: 'identical Cornell idno=39923305 and identical title; second reviewer: "two pages of the same report and should be merged"' },
  { id: 'ny-final-report-1900', members: [653, 654, 655], relation: 'same-work-different-scans', basis: 'titles name the same New York Monuments Commission publication (Fox, New York at Gettysburg)' },
  { id: 'franklin-repository-1863-07-08', members: [636, 648], relation: 'same-issue-different-host', basis: 'identical newspaper and date in both titles (UVA PDF and the Valley of the Shadow transcription)' },
  { id: 'cormany-diaries', members: [640, 641], relation: 'item-inside-collection', basis: 'entry 641 is the collection page of the Cormany papers that contains the 640 diary' },
  { id: 'stouffer-papers', members: [642, 643], relation: 'item-inside-collection', basis: 'entry 643 is the collection page that contains the 642 diary' },
  { id: 'leach-letters', members: [630, 631], relation: 'item-inside-collection', basis: 'entry 631 is the edited edition of the Chester K. Leach letters; 630 is one letter as a PDF' },
  { id: 'or27-volume-links', members: [572, 573, 657], relation: 'same-volume-as-parts-I-III-XIII', basis: 'HathiTrust volume ids equal the ids used by the Part I, Part II/III and Part XIII entries' },
  { id: 'gcjcwe-journal', members: [566, 567, 568, 569, 570, 571], relation: 'item-inside-collection', basis: 'entries 566-570 link to issue pages of the journal that entry 571 links to' },
];

/** entries whose own text says they are provenance/finding aids for the list itself */
export const SELF_REFERENTIAL = {
  577: 'index used to build Parts I-III of the list (its own description)',
  578: 'index used to build Parts I-III of the list (its own description)',
  639: 'finding aid used to build Part IX (its own description)',
};
