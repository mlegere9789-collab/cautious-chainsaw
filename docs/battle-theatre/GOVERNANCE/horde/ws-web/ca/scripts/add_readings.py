#!/usr/bin/env python3
"""Add or replace entries of readings_overlay.json (readings of the print made by looking at the saved image crops).

Usage: python3 -I add_readings.py JOBS.json ENTRIES.json [--viewed YYYY-MM-DD]
  JOBS.json    the job list given to crop_batch.py ({page, quote, tag}); it ties a tag to the page and the quote
  ENTRIES.json list of {"tag": job tag, "reading": "<what the print reads, the same passage as the quote>", "corrections": [[ocr, print], ...], "note": optional}
The overlay entry is keyed by (page, first 60 characters of the quote) and names every crop of the job (tag, or tag_1, tag_2 ..., found in images.jsonl).
The reading must be the print of the same words as the quote (not more, not less); the builder checks every quoted fragment of a claim against it.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib

OVERLAY = os.path.join(calib.CA_DOCS, 'readings_overlay.json')


def main():
    jobs = {j['tag']: j for j in json.load(open(sys.argv[1], encoding='utf-8'))}
    entries = json.load(open(sys.argv[2], encoding='utf-8'))
    viewed = sys.argv[sys.argv.index('--viewed') + 1] if '--viewed' in sys.argv else calib.now()[:10]
    imgs = {}
    for l in open(os.path.join(calib.CA_DOCS, 'images.jsonl'), encoding='utf-8'):
        if l.strip():
            d = json.loads(l)
            imgs.setdefault(d['page_id'], []).append(d['tag'])
    ov = json.load(open(OVERLAY, encoding='utf-8')) if os.path.exists(OVERLAY) else []
    by_key = {(e['page'], e['start']): i for i, e in enumerate(ov)}
    for e in entries:
        j = jobs[e['tag']]
        tags = sorted([t for t in imgs.get(j['page'], []) if t == j['tag'] or (t.startswith(j['tag'] + '_') and t[len(j['tag']) + 1:].isdigit())],
                      key=lambda t: (len(t), t))
        if not tags:
            raise SystemExit('no image saved for %s' % e['tag'])
        start = calib.norm(j['quote'])[:60]
        ent = {'page': j['page'], 'start': start, 'imgs': tags, 'reading': e['reading'], 'corrections': e.get('corrections') or [], 'viewed': viewed}
        if e.get('note'):
            ent['note'] = e['note']
        k = (j['page'], start)
        if k in by_key:
            ov[by_key[k]] = ent
        else:
            by_key[k] = len(ov)
            ov.append(ent)
    with open(OVERLAY, 'w', encoding='utf-8') as f:
        json.dump(ov, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write('\n')
    print('overlay entries: %d' % len(ov))


if __name__ == '__main__':
    main()
