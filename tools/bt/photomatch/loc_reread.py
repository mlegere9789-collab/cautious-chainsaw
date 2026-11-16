#!/usr/bin/env python3
"""Fifth photo-match session (2026-11-16): read the Library of Congress catalogue record of EVERY registered photograph again, fresh from the open JSON of the record, for any stated camera position.
Why: the earlier passes read each record once (2026-11-11 to 14) and made statements from the records that say a place or direction; the Library revises records, and an earlier reading could have missed a note.
What it does: for each record of photograph_registry.json it fetches https://www.loc.gov/pictures/item/<id>/?fo=json (1 request per 1.2 s, polite, no retries on a block, a cut-short transfer is a failure and is
retried twice), saves the JSON under tmp/library/web/photomatch/fourth/loc_items/ (sha256 in the output), compares the text fields (title, summary, notes, dates, call number, contents) with the copy that the
earlier passes saved (tmp/photomatch/raw/item_<id>.json), and lists every sentence of the record's own words (title, summary, notes, contents) that holds a place or direction cue (rule below).
The rule only finds sentences to read; whether a sentence is a camera-position statement is decided by reading it (the output lists them with the statement ids that already cover them).
Rule: a sentence is a cue when it holds a view word (view, looking, taken, photographed, from, facing, shows, camera) with a direction or vantage word (north, south, east, west, northeast..., toward, across, along,
roof, summit, crest, hill, ridge, house, barn, road, pike, lane, edge, window, cupola, steeple, tower, position).
Output: tools/bt/photomatch/loc_reread_20261116.json.
Usage: python3 -I tools/bt/photomatch/loc_reread.py [--limit N]"""
import hashlib, json, os, re, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT_DIR = os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'fourth', 'loc_items'); OLD = os.path.join(ROOT, 'tmp', 'photomatch', 'raw')
os.makedirs(OUT_DIR, exist_ok=True)
VIEW = re.compile(r"\b(view|views|looking|looks|taken|photographed|photograph shows|photo shows|facing|camera|shows|showing|seen from|from the)\b", re.I)
WHERE = re.compile(r"\b(north|south|east|west|northeast|northwest|southeast|southwest|northward|southward|eastward|westward|toward|towards|across|along|roof|summit|crest|hill|ridge|house|barn|road|pike|lane|edge|window|cupola|steeple|tower|position|gate|cemetery|woods|wheat|orchard)\b", re.I)
def sha(b): return hashlib.sha256(b).hexdigest()
def words_of(it):
    """The record's own words as a list of (field, text)."""
    out = [('title', it.get('title') or ''), ('summary', it.get('summary') or ''), ('created_published', it.get('created_published') or ''), ('contents', it.get('contents') or '')]
    for i, n in enumerate(it.get('notes') or []):
        out.append((f'note{i}', n.get('note') if isinstance(n, dict) else str(n)))
    return [(f, t) for f, t in out if t]
def cues(it):
    res = []
    for f, t in words_of(it):
        for s in re.split(r'(?<=[.;!?])\s+|\s\|\|\s', t):
            if VIEW.search(s) and WHERE.search(s): res.append({'field': f, 'sentence': s.strip()[:400]})
    return res
def fetch(pk):
    dst = os.path.join(OUT_DIR, f'item_{pk}.json')
    if os.path.exists(dst) and os.path.getsize(dst) > 200:
        try: json.load(open(dst)); return 'cached'
        except Exception: pass
    for attempt in range(3):
        r = subprocess.run(['curl', '-sS', '-m', '120', '-A', 'Mozilla/5.0 (compatible; research fetch; 1 request per second)', '-o', dst + '.part', '-w', '%{http_code}', f'https://www.loc.gov/pictures/item/{pk}/?fo=json'], capture_output=True, text=True)
        code = r.stdout.strip()
        if r.returncode == 0 and code == '200':
            try:
                json.load(open(dst + '.part')); os.replace(dst + '.part', dst); return 'ok'
            except Exception: pass
        if code in ('403', '429') or code.startswith('4') and code != '200' and r.returncode == 0: break       # a block or a not-found is recorded, never worked around
        time.sleep(5 * (attempt + 1))
    if os.path.exists(dst + '.part'): os.remove(dst + '.part')
    return 'failed http ' + (code or '?')
def main():
    reg = json.load(open(os.path.join(HERE, 'photograph_registry.json')))['photographs']
    lim = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    covered = {}
    for s in json.load(open(os.path.join(HERE, 'position_statements.json')))['statements']:
        for pk in (s.get('loc') or []) + (s.get('cand') or []): covered.setdefault(pk, []).append(s['id'])
    rows = []; last = 0.0
    for p in (reg[:lim] if lim else reg):
        pk = p['loc_id']; dt = time.time() - last
        if dt < 1.2 and not os.path.exists(os.path.join(OUT_DIR, f'item_{pk}.json')): time.sleep(1.2 - dt)   # pace only a request that goes to the network
        st = fetch(pk); last = time.time() if st != 'cached' else last
        row = {'loc_id': pk, 'title': p['title'][:120], 'fetch': st, 'class': p['class'], 'verdict': p['verdict'], 'statement_ids': covered.get(pk, [])}
        _f = os.path.join(OUT_DIR, f'item_{pk}.json')
        if os.path.exists(_f): row['retrieved_utc'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(os.path.getmtime(_f)))   # when the file was saved (a later run that finds it cached keeps this time)
        new = os.path.join(OUT_DIR, f'item_{pk}.json')
        if st in ('ok', 'cached'):
            b = open(new, 'rb').read(); row['sha256'] = sha(b); row['bytes'] = len(b)
            it = json.loads(b).get('item') or {}; row['cues'] = cues(it)
            oldp = os.path.join(OLD, f'item_{pk}.json')
            if os.path.exists(oldp):
                ot = json.load(open(oldp)).get('item') or {}
                ch = []
                for k in ('title', 'summary', 'created_published', 'call_number', 'contents'):
                    if (it.get(k) or '') != (ot.get(k) or ''): ch.append({'field': k, 'old': (ot.get(k) or '')[:300], 'new': (it.get(k) or '')[:300]})
                nn = [n.get('note') for n in it.get('notes') or []]; on = [n.get('note') for n in ot.get('notes') or []]
                if nn != on: ch.append({'field': 'notes', 'added': [n for n in nn if n not in on][:6], 'removed': [n for n in on if n not in nn][:6]})
                row['changed_since_first_reading'] = ch
            else: row['changed_since_first_reading'] = 'no earlier copy of this record is saved (the record belongs to a later catalogue pass)'
        rows.append(row)
    res = {'_doc': __doc__.split('\n')[0], 'retrieved_utc': min((r['retrieved_utc'] for r in rows if r.get('retrieved_utc')), default=None), 'last_checked_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'records': len(rows), 'fetched_ok': sum(1 for r in rows if r['fetch'] in ('ok', 'cached')),
           'failed': [{'loc_id': r['loc_id'], 'fetch': r['fetch']} for r in rows if r['fetch'] not in ('ok', 'cached')], 'changed': [r['loc_id'] for r in rows if isinstance(r.get('changed_since_first_reading'), list) and r['changed_since_first_reading']],
           'records_with_cues': sum(1 for r in rows if r.get('cues')), 'rows': rows}
    json.dump(res, open(os.path.join(HERE, 'loc_reread_20261116.json'), 'w'), indent=1, ensure_ascii=False)
    print(res['records'], 'records;', res['fetched_ok'], 'fetched;', len(res['failed']), 'failed;', len(res['changed']), 'changed since the first reading;', res['records_with_cues'], 'with a place or direction cue')
if __name__ == '__main__': main()
