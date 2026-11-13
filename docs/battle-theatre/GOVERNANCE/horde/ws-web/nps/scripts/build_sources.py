#!/usr/bin/env python3
"""Build the tracked source list, the index and the library pointer entries.

Inputs
  catalogue.json                  what was asked for (id, url, listing title, topics)
  source_meta.json                what each document says about itself (title page: author,
                                  date, series) plus reading notes; filled in by hand from the
                                  saved text or page image, never from memory
  tmp/library/web/nps/MANIFEST.json   what was actually served (bytes, sha256, pages, text hashes)
  lookups.jsonl                   web pages fetched with fetch_pages.py
Outputs
  sources.json                    tracked list used by build_extracts.py
  INDEX.md                        the index of acquired reports
  GOVERNANCE/library/acquired_3.json   pointer entries (merged by id under a file lock; entries of
                                  other tasks in that file are kept untouched)
Run:  python3 -I build_sources.py
"""
import fcntl, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
ACQ3 = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library', 'acquired_3.json')
RIGHTS = 'United States government work'


def load(p, default=None):
    if os.path.exists(p):
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    return default


def main():
    cat = load(os.path.join(NPS, 'catalogue.json'))
    meta = load(os.path.join(NPS, 'source_meta.json'), {'items': {}})['items']
    man = load(os.path.join(LIB, 'MANIFEST.json'), {'items': {}})['items']
    lookups = {}
    lp = os.path.join(NPS, 'lookups.jsonl')
    if os.path.exists(lp):
        for line in open(lp, encoding='utf-8'):
            if line.strip():
                r = json.loads(line)
                lookups[r['id']] = r
    sources = []
    for e in cat['items']:
        sid = e['id']
        m = man.get(sid, {})
        mm = meta.get(sid, {})
        s = {
            'id': sid, 'url': e['url'], 'listing_title': e['listing_title'],
            'title': mm.get('title') or e['listing_title'],
            'author': mm.get('author'), 'date': mm.get('date'), 'series': mm.get('series'),
            'self_description_from': mm.get('from'),
            'topics': e['topics'],
            'status': m.get('status', 'not_fetched'),
            'http': m.get('http'), 'fetched_at': m.get('fetched_at'),
            'bytes': m.get('bytes'), 'sha256': m.get('sha256'),
            'pages': m.get('pages'), 'pages_with_text': m.get('pages_with_text'),
            'text_path': m.get('text_path'), 'text_bytes': m.get('text_bytes'), 'text_sha256': m.get('text_sha256'),
            'layout_text_path': m.get('layout_text_path'), 'layout_text_sha256': m.get('layout_text_sha256'),
            'file_kept': m.get('file_kept'), 'file_path': m.get('file_path'),
            'failure': m.get('reason'),
            'rights_basis': mm.get('rights_basis', RIGHTS),
            'rights_note': mm.get('rights_note'),
            'text_quality': mm.get('text_quality'),
            'text_defect': mm.get('text_defect'),
            'default_variant': mm.get('default_variant'),
            'raw_text_path': m.get('raw_text_path'), 'raw_text_sha256': m.get('raw_text_sha256'),
            'state_dates_note': mm.get('state_dates_note'),
            'covers': mm.get('covers'),
            'used_for_extracts': mm.get('used_for_extracts'),
            'kind': mm.get('kind', 'official secondary (National Park Service report)'),
        }
        sources.append(s)
    # web pages of the National Park Service
    for sid, r in sorted(lookups.items()):
        mm = meta.get(sid, {})
        sources.append({
            'id': sid, 'url': r['url'], 'listing_title': r.get('title'), 'title': mm.get('title') or r.get('title'),
            'author': mm.get('author', 'National Park Service'), 'date': mm.get('date', 'web page, undated unless noted; as served ' + (r.get('at') or '')[:10]),
            'series': None, 'self_description_from': 'page title', 'topics': mm.get('topics', []),
            'status': 'acquired' if r.get('status') == 'ok' else 'failed',
            'http': r.get('http'), 'fetched_at': r.get('at'), 'bytes': r.get('bytes'), 'sha256': r.get('sha256'),
            'pages': 1, 'pages_with_text': 1, 'text_path': r.get('text_path'), 'text_bytes': r.get('text_bytes'),
            'text_sha256': r.get('text_sha256'), 'layout_text_path': None, 'layout_text_sha256': None,
            'file_kept': r.get('status') == 'ok', 'file_path': (r.get('text_path') or '').replace('.txt', '.html') or None,
            'failure': r.get('reason'), 'rights_basis': mm.get('rights_basis', RIGHTS), 'rights_note': mm.get('rights_note'),
            'text_quality': 'web page text (tags stripped)', 'state_dates_note': mm.get('state_dates_note'),
            'covers': mm.get('covers'), 'used_for_extracts': mm.get('used_for_extracts'),
            'kind': 'official web page (National Park Service)',
        })
    with open(os.path.join(NPS, 'sources.json'), 'w', encoding='utf-8') as f:
        json.dump({'_doc': 'Sources of the nps-landscape task (workstream bt-web). Generated by scripts/build_sources.py; hashes are of the files as served on the fetch date. Texts live under tmp/library/web/nps (untracked).',
                   'sources': sources}, f, indent=1, ensure_ascii=False)

    # INDEX.md
    ok = [s for s in sources if s['status'] == 'acquired']
    bad = [s for s in sources if s['status'] != 'acquired']
    with open(os.path.join(NPS, 'INDEX.md'), 'w', encoding='utf-8') as f:
        f.write('# National Park Service reports on the 1863 Gettysburg landscape: index\n\n')
        f.write('Workstream bt-web, task nps-landscape. Generated by `scripts/build_sources.py` from `catalogue.json`, `source_meta.json` and the local manifest; do not edit by hand.\n\n')
        f.write('- Acquired: %d documents and pages (%.1f MB as served). Not acquired: %d (listed at the end with the reason).\n' % (len(ok), sum((s['bytes'] or 0) for s in ok) / 1e6, len(bad)))
        f.write('- Texts: `tmp/library/web/nps/<ID>/<ID>.txt` (reading order) and `<ID>.layout.txt` (layout), one `=== PAGE n ===` marker per PDF page (n is the PDF page index, not the printed page). The tree is untracked; `scripts/acquire.py` rebuilds it from `catalogue.json` and the hashes below detect a changed file.\n')
        f.write('- Rights basis: `United States government work` for reports written by or for the National Park Service; a different basis is stated on the entry where the document itself shows another author or owner.\n')
        f.write('- Author, date and series are taken from the document itself (title page or cover as saved); `not stated` means the saved text shows none.\n')
        f.write('- "Feature states" says which dates the descriptions in the document refer to. A modern survey describes modern or reconstructed features unless it says otherwise; see `extracts/` for the dated passages.\n\n')
        f.write('Extract sheets: `extracts/fields-woodlots.md`, `extracts/fences.md`, `extracts/farm-buildings.md`, `extracts/hospitals.md`, `extracts/monuments-later.md`, `extracts/other-landscape.md`; machine-readable: `extracts/extracts.jsonl`.\n\n')
        for s in ok:
            f.write('## %s\n\n' % s['id'])
            f.write('- Title: %s\n' % s['title'])
            f.write('- Author: %s | Date: %s%s\n' % (s['author'] or 'not stated', s['date'] or 'not stated', (' | Series: ' + s['series']) if s['series'] else ''))
            f.write('- URL: %s (HTTP %s, fetched %s)\n' % (s['url'], s['http'], s['fetched_at']))
            f.write('- File as served: %s bytes, sha256 `%s`%s\n' % (s['bytes'], s['sha256'], '' if s['file_kept'] else ' (PDF deleted after text extraction to stay inside the disk budget)'))
            f.write('- Text: `%s`, %s bytes, sha256 `%s`; %s of %s pages carry text\n' % (s['text_path'], s['text_bytes'], s['text_sha256'], s['pages_with_text'], s['pages']))
            f.write('- Rights basis: %s%s\n' % (s['rights_basis'], ('. ' + s['rights_note']) if s['rights_note'] else ''))
            if s['text_quality']:
                f.write('- Text quality: %s\n' % s['text_quality'])
            if s['covers']:
                f.write('- Covers: %s\n' % s['covers'])
            if s['state_dates_note']:
                f.write('- Feature states: %s\n' % s['state_dates_note'])
            if s['used_for_extracts'] is not None:
                f.write('- Used for extracts: %s\n' % s['used_for_extracts'])
            f.write('\n')
        if bad:
            f.write('## Not acquired\n\n')
            for s in bad:
                f.write('- %s: %s (%s): %s\n' % (s['id'], s['url'], s['status'], s['failure'] or 'not fetched'))
    # acquired_3.json: merge by id under a lock
    os.makedirs(os.path.join(ROOT, 'tmp'), exist_ok=True)
    with open(os.path.join(ROOT, 'tmp', 'acquired_3.lock'), 'w') as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        cur = load(ACQ3, None)
        if cur is None:
            cur = {'_doc': 'Workstream bt-web (2026-11-13) tracked pointers to sources acquired from the hosts that became reachable on 2026-11-13. Raw files and texts live under tmp/library/web/ (gitignored). Each task of the workstream merges its own entries by id; entries are never removed by another task.',
                   'items': []}
        items = cur.setdefault('items', [])
        byid = {it.get('id'): i for i, it in enumerate(items)}
        for s in ok:
            ent = {
                'id': s['id'], 'task': 'nps-landscape', 'title': s['title'], 'creator': s['author'], 'date': s['date'],
                'url': s['url'], 'bytes': s['bytes'], 'sha256': s['sha256'], 'fetched_at': s['fetched_at'],
                'pages': s['pages'], 'pages_with_text': s['pages_with_text'],
                'local_path': s['text_path'], 'text_bytes': s['text_bytes'], 'text_sha256': s['text_sha256'],
                'file_kept': s['file_kept'],
                'rights_basis': s['rights_basis'], 'rights_note': s['rights_note'],
                'text_quality': s['text_quality'] or 'text layer of the PDF as served (pdftotext 24.02.0); not proofread',
            }
            if s['id'] in byid:
                items[byid[s['id']]] = ent
            else:
                items.append(ent)
                byid[s['id']] = len(items) - 1
        fails = cur.setdefault('blocked_or_failed', [])
        have = {(x.get('source'), x.get('task')) for x in fails}
        for s in bad:
            key = (s['url'], 'nps-landscape')
            if key not in have:
                fails.append({'source': s['url'], 'task': 'nps-landscape', 'id': s['id'], 'reason': s['failure'] or 'not fetched', 'at': s['fetched_at']})
        tmp = ACQ3 + '.tmp.%d' % os.getpid()
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(cur, f, indent=1, ensure_ascii=False)
        os.replace(tmp, ACQ3)
    print('sources: %d acquired, %d not acquired; INDEX.md, sources.json and acquired_3.json written' % (len(ok), len(bad)))


if __name__ == '__main__':
    main()
