#!/usr/bin/env python3
"""Third pass (2026-11-14): a systematic scan of EVERY saved National Park Service text for passages that say where a July 1863 photograph was taken.
Why: the earlier passes found their statements by reading and keyword searches (statements_data.py); no scan covered all 53 saved PDF texts and all saved pages with one fixed rule,
so a camera place stated in a figure caption could have been missed. This script applies one rule to the whole library and lists every passage that is not yet a statement.
Inputs: tmp/library/web/nps/<ID>/<ID>.txt (53 PDF texts with '=== PAGE n ===' markers), tmp/library/web/nps/pages/<ID>/<ID>.txt (20 NPS pages), tmp/library/web/photomatch/www.nps.gov/*.txt
(NPS Then-And-Now pages and Place pages), tools/bt/photomatch/position_statements.json (what is already a statement).
Rule: a passage is a candidate when its window (the sentence around a trigger, at most 520 characters) holds
  (a) a picture credit or id: Library of Congress, LC-DIG, LC-B8, LC-USZ, ppmsca, cwpb, cwp, Digital ID, Brady, Gardner, O'Sullivan, Gibson, Tyson, Weaver, Waud, Bachelder, Mumper, Tipton, Frassanito, 'photograph', 'stereo', and
  (b) a place or direction of view: looking <direction>, view <direction>, 'taken from/near/at', 'photographed from', 'from the <vantage>', camera, tripod, vantage, 'stood'.
Output: tools/bt/photomatch/nps_photo_scan.json (counts per source, every candidate with source, pdf page marker, offset in the normalised page, window, covered flag).
The scan finds passages; it does not decide anything. A candidate becomes a statement only when a person reads it and statements_data.py quotes it (the builder then refuses a quote it cannot find in the saved text).
Usage: nice python3 -I tools/bt/photomatch/scan_nps_photos.py"""
import json, os, re, sys, glob, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
NPS = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps'); WEB = os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'www.nps.gov')
def norm(s): return re.sub(r'\s+', ' ', s).strip()
A = re.compile(r"Library of Congress|LC-DIG|LCDIG|LC-B8|LC-USZ|ppmsca|cwpb|\bcwp\b|Digital ID|\bLOC\b|Brady|Gardner|O.Sullivan|Gibson|Tyson|Weaver|Waud|Bachelder|Mumper|Tipton|Frassanito|photograph|stereo", re.I)
B = re.compile(r"looking (?:north|south|east|west|northeast|northwest|southeast|southwest|toward|towards|across|up|down|at|out|over|along|back|from|to)\b|view(?:s|ed)? (?:north|south|east|west|northeast|northwest|southeast|southwest|toward|towards|across|from|of|looking|along|to)\b|facing|taken (?:from|near|at|on|along|by|in|just)|photograph(?:ed)? (?:from|near|at|on|along|by|in|just|the)\b|from the (?:summit|roof|top|crest|hill|ridge|house|cupola|steeple|dome|tower|window|porch|barn|road|lane|edge|south|north|east|west)|camera|tripod|vantage|\bstood\b|viewpoint|point of view", re.I)
PAGE = re.compile(r'=== PAGE (\d+) ===')
def pages_of(path):
    t = open(path, encoding='utf-8', errors='replace').read(); parts = PAGE.split(t)
    if len(parts) < 3: return {0: t}
    return {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}
def covered_set():
    """(source, page, offset) of every statement fragment: the builder stored where each quote stands in the normalised page."""
    st = json.load(open(os.path.join(HERE, 'position_statements.json')))['statements']; out = []
    for s in st:
        frs = s.get('quote_fragments') or [{'page': s.get('page'), 'offset_in_normalised_page': s.get('offset_in_normalised_page'), 'fragment': s['quote']}]
        for f in frs:
            if f.get('offset_in_normalised_page') is not None: out.append((s['src'], f.get('page'), f['offset_in_normalised_page'], len(f.get('fragment') or '')))
    return out
def windows(txt):
    """Yield (start, end) windows of at most 520 characters around each trigger of kind A that also has a B trigger within the window; overlapping windows are merged."""
    spans = []
    for m in A.finditer(txt):
        s = max(0, m.start() - 260); e = min(len(txt), m.end() + 260)
        # cut at a sentence boundary on each side when one is near
        b = txt.rfind('. ', s, m.start()); s = b + 2 if b != -1 and m.start() - b < 260 else s
        d = txt.find('. ', m.end(), e); e = d + 1 if d != -1 else e
        w = txt[s:e]
        if B.search(w): spans.append((s, e))
    spans.sort(); merged = []
    for s, e in spans:
        if merged and s <= merged[-1][1] + 40: merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else: merged.append((s, e))
    return merged
def main():
    cov = covered_set(); srcs = {}
    for p in sorted(glob.glob(os.path.join(NPS, 'NPS-*', 'NPS-*.txt'))):
        if p.endswith('.layout.txt') or p.endswith('.raw.txt'): continue
        srcs[os.path.basename(p)[:-4]] = p
    for p in sorted(glob.glob(os.path.join(NPS, 'pages', 'NPSGOV-*', 'NPSGOV-*.txt'))): srcs[os.path.basename(p)[:-4]] = p
    for p in sorted(glob.glob(os.path.join(WEB, '*.txt'))): srcs['WEB:' + os.path.basename(p)[:-8]] = p
    out = []; counts = {}
    for sid, p in srcs.items():
        pg = pages_of(p); n = 0
        for pn, raw in pg.items():
            txt = norm(raw)
            for s, e in windows(txt):
                w = txt[s:e]; k = sid[4:] if sid.startswith('WEB:') else sid
                c = any(src == k and (pg == pn or pg in (None, 'page', 'record')) and s - 60 <= off <= e + 60 for src, pg, off, _ln in cov)
                out.append({'source': sid, 'page': pn, 'offset': s, 'window': w, 'covered_by_a_statement': c}); n += 1
        counts[sid] = n
    res = {'_doc': 'Passages of the saved National Park Service texts whose window holds a picture credit or photographer word and a place or direction of view (rule in scan_nps_photos.py). A list of places to read, not statements. covered_by_a_statement = a statement of that source stores an offset for its quote that lies in this window (same page).',
           'sources_scanned': len(srcs), 'candidates': len(out), 'covered': sum(1 for o in out if o['covered_by_a_statement']), 'per_source': counts, 'passages': out}
    json.dump(res, open(os.path.join(HERE, 'nps_photo_scan.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(srcs), 'texts;', len(out), 'candidate passages;', res['covered'], 'already statements')
if __name__ == '__main__': main()
