// pagemap.mjs - printed page -> scan leaf -> reader index, for the Internet Archive scans of the Official Records (UIUC copies).
//
// What the Internet Archive publishes with each scan:
//   <id>_page_numbers.json   one entry per ACCESS leaf: { leafNum, pageNumber } (pageNumber is the OCR's reading of the printed folio, "" on plates, blanks and where it could not read one)
//   <id>_scandata.xml        every leaf the camera took, with addToAccessFormats true/false (leaf 0 is a colour card, a few blank or duplicate leaves are excluded)
// leafNum is the scandata leaf number. The BookReader's page index (the "n" of archive.org/details/<id>/page/n<k>) counts only the leaves that are in the access formats, from 0:
//     reader(leaf) = leaf - (number of excluded leaves with a smaller number)
// (Part 1: leaf 20 is printed page 2 and reader index n19; leaves 470, 471, 886, 887 and 1193 are excluded, so the offset between leaf and reader index is 1, then 3, then 5.)
// That derivation is computed from the files, and it is the plan's "reader index = leafNum - 3, then - 5 after leaf 887" in a general form. It has NOT been checked against a live BookReader
// (no browser was launched for this build): the printed page is the citation, the leaf and the link are a convenience.
//
// A printed page's leaf: the leaf of the same folio in page_numbers.json when it holds one (exact), otherwise the offset (leaf - folio) of the nearest folio that it does hold (not exact).

export function parsePageNumbers(json) {
  const pages = (json && json.pages) || [];
  const pairs = [];
  for (const p of pages) if (p && /^\d{1,4}$/.test(String(p.pageNumber || '')) && Number.isInteger(p.leafNum)) pairs.push({ leaf: p.leafNum, page: +p.pageNumber });
  return { pairs, leaves: pages.length };
}
/** leaf numbers that are not in the access formats */
export function excludedLeaves(scandataXml) {
  const out = [];
  for (const m of String(scandataXml).matchAll(/<page leafNum="(\d+)">([\s\S]*?)<\/page>/g)) if (/<addToAccessFormats>false<\/addToAccessFormats>/.test(m[2])) out.push(+m[1]);
  return out.sort((a, b) => a - b);
}

export function createPageMap({ pageNumbers, scandata = null, iaId }) {
  const { pairs } = parsePageNumbers(pageNumbers);
  // keep one leaf per folio (the first) and require the folios to rise with the leaves: a misread folio ("894" for "394") breaks the run and is dropped
  const good = []; let lastLeaf = -1, lastPage = -1;
  for (const p of pairs.sort((a, b) => a.leaf - b.leaf)) {
    if (p.leaf > lastLeaf && p.page > lastPage && p.page - lastPage <= 6) { good.push(p); lastLeaf = p.leaf; lastPage = p.page; }
    else if (p.leaf > lastLeaf && p.page > lastPage && good.length >= 2 && p.page - lastPage > 6) { /* a jump: kept only if the next folios confirm it (handled by the nearest-offset rule) */ }
  }
  const byPage = new Map(good.map((p) => [p.page, p.leaf]));
  const excluded = scandata ? excludedLeaves(scandata) : [];
  const readerOf = (leaf) => { let n = 0; for (const x of excluded) { if (x < leaf) n++; else break; } return leaf - n; };
  const offsets = good.map((p) => ({ page: p.page, off: p.leaf - p.page }));
  function leafOf(page) {
    if (!Number.isInteger(page)) return null;
    if (byPage.has(page)) return { leaf: byPage.get(page), reader: readerOf(byPage.get(page)), exact: true };
    // nearest folio the file holds
    let lo = 0, hi = offsets.length - 1, best = null;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (offsets[mid].page < page) lo = mid + 1; else hi = mid - 1; }
    for (const k of [hi, lo]) { const o = offsets[k]; if (o && (!best || Math.abs(o.page - page) < Math.abs(best.page - page))) best = o; }
    if (!best) return null;
    const leaf = page + best.off;
    return { leaf, reader: readerOf(leaf), exact: false };
  }
  const url = (reader) => `https://archive.org/details/${iaId}/page/n${reader}/mode/1up`;
  return {
    iaId, leafOf, url, excluded, folios: good.length,
    scan(page) { const r = leafOf(page); return r ? { ia_id: iaId, leaf: r.leaf, reader: r.reader, exact: r.exact, url: url(r.reader) } : null; },
  };
}
