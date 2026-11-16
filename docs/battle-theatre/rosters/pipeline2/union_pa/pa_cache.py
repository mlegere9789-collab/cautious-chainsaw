"""Cache the word boxes of one volume of Bates (aligned to the pinned search text) in the work directory, then delete the xml.

    tools/horde/bench.sh python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_cache.py VOL [--keep-xml]     (run from the repo root)

Reads tmp/library/rosters/_pa_xml/<identifier>_djvu.xml (pa_fetch.py), aligns the words of every leaf to the white-space tokens of the leaf
in the pinned search text, writes tmp/library/rosters/union-pa-work/leaves-vol<VOL>.jsonl.gz  (one JSON line per leaf:
{"leaf":n,"a":start,"b":end,"pg":printed page,"ntok":text tokens,"words":[[x0,x1,yt,yb,w,conf,ln,off],...]}) and
tmp/library/rosters/union-pa-work/alignment-vol<VOL>.json (counts per leaf), then deletes the xml (bytes and sha256 stay in the manifest).
The xml is only deleted when the cache was written completely.
"""
import os, sys, json, gzip
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pa_lib as L


def main(argv):
    vol = int(argv[0])
    keep = '--keep-xml' in argv
    os.makedirs(L.WORK, exist_ok=True)
    text, pm, ent = L.load_text(vol)
    xp = L.xml_path(vol)
    if not os.path.exists(xp):
        print('no xml at', xp)
        return 1
    tmp = L.cache_path(vol) + '.part'
    al, tot = {}, [0, 0, 0, 0]
    seen = set()
    with gzip.open(tmp, 'wt', encoding='utf-8') as f:
        for leaf, ws in L.xml_leaves(xp):
            if leaf >= len(pm.ranges):
                al[str(leaf)] = {'xml_words': len(ws), 'error': 'leaf beyond the page index'}
                continue
            a, b = pm.span(leaf)
            ok, bad, ntok = L.align(ws, text, a, b)
            seen.add(leaf)
            rec = {'leaf': leaf, 'a': a, 'b': b, 'pg': pm.printed(leaf), 'ntok': ntok,
                   'words': [[w['x0'], w['x1'], w['yt'], w['yb'], w['w'], w['conf'], w['ln'], w['off']] for w in ws]}
            f.write(json.dumps(rec, ensure_ascii=False, separators=(',', ':')) + '\n')
            al[str(leaf)] = {'xml_words': len(ws), 'aligned': ok, 'unaligned': bad, 'text_tokens': ntok}
            tot[0] += len(ws); tot[1] += ok; tot[2] += ntok
        tot[3] = len(seen)
    os.replace(tmp, L.cache_path(vol))
    missing = [i for i in range(len(pm.ranges)) if i not in seen]
    json.dump({'vol': vol, 'leaves_in_index': len(pm.ranges), 'leaves_in_xml': len(seen), 'leaves_without_xml': missing,
               'total_xml_words': tot[0], 'aligned': tot[1], 'text_tokens': tot[2], 'per_leaf': al},
              open(os.path.join(L.WORK, 'alignment-vol%d.json' % vol), 'w'), indent=0)
    print('vol', vol, 'leaves', tot[3], 'of', len(pm.ranges), 'xml words', tot[0], 'aligned', tot[1], 'text tokens', tot[2])
    if not keep:
        os.remove(xp)
        print('deleted', xp)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
