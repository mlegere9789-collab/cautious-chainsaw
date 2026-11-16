"""Discovery sweep (reading aid, not a logged search) over the corpora that were local after the tl-04 first pass:
TOWN (tmp/library/town books), MED (tmp/library/medical texts) and CA (1863 newspaper pages saved by the web workstream, tmp/library/web/ca/pages and retry).
    python3 -I tmp/tl-04/ext_sweep.py <topic> [<topic> ...]   writes tmp/tl-04/ext/sweep_<topic>.txt
Hits are printed with normalised context; nothing here is a citation (citations are re-matched by build.py)."""
import os, re, sys, glob, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
LIBR = os.path.join(ROOT, 'tmp', 'library')
BOOKS = {
    'HOKE-1887': 'town/HOKE-1887/greatinvasionof102hoke_djvu.txt',
    'HISTORY-ADAMS-1886': 'town/HISTORY-ADAMS-1886/cu31924028852619_djvu.txt',
    'CONEWAGO-REILY-1885': 'town/CONEWAGO-REILY-1885/ConewagoACollection_djvu.txt',
    'BARTON-ANGELS-1898': 'town/BARTON-ANGELS-1898/angelsofbattlefi00bart_djvu.txt',
    'USSC-GETTYSBURG-1863': 'medical/USSC-GETTYSBURG-1863/reportonoperatio00doug_djvu.txt',
    'SOUDER-LEAVES-1864': 'medical/SOUDER-LEAVES-1864/leavesfrombattle00soud_djvu.txt',
}
TOPICS = {
 'wounded_night': dict(p=r'wounded', n=r'(Wednesday (night|evening)|night of the (first|1st)|first night|evening of the (first|1st)|that night)', w=250),
 'water_burial': dict(p=r'(canteens?|water\b|bury|buried|burial|burying|unburied)', n=r'(Wednesday (night|evening)|night of the (first|1st)|first night|first day)', w=250),
 'fires_lights': dict(p=r'(camp-?fires?|watch-?fires?|lanterns?|candles?|fires? (were|was)|lights? (were|was|in the))', n=r'(Wednesday (night|evening)|night of the (first|1st)|first night|Gettysburg)', w=250),
 'cellars': dict(p=r'cellars?', n=r'(Wednesday|night|first day|rebel|Confederate)', w=250),
 'searches': dict(p=r'(search(ed|ing)|ransack|plunder|pillag|rifled)', n=r'(houses?|cellars?|garrets?|rooms?)', w=200),
 'klingel': dict(p=r'K[lI1][il1]ng[l1e]{1,2}\b', n=None, w=0),
 'lady': dict(p=r'\bLady\b', n=r'(farm|house|barn|hospital|Daniel)', w=200),
 'rose': dict(p=r'\bRose\b', n=r'(farm|barn|wheat|cavalry|Buford|Gamble|Devin)', w=250),
 'spangler': dict(p=r'Spang[l1]er', n=r'(hospital|wounded|Eleventh|11th|surgeon|barn)', w=300),
 'moon': dict(p=r'\bmoon(-?light|-?shine)?\b', n=r'(Gettysburg|Wednesday|Thursday|battle|bivouac|march|night|clouds?|dark)', w=250),
 'fog_dawn': dict(p=r'\b(fog|foggy|mist|misty|hazy|haze)\b', n=r'(Thursday|July 2|second day|morning|Gettysburg)', w=250),
 'weather_first': dict(p=r'\b(cloudy|overcast|rain(ed|ing|y)?|shower|clear sky|cloudless|sultry|oppressive)\b', n=r'(Wednesday|July 1|first day|Gettysburg)', w=250),
 'sunset': dict(p=r'\b(sunset|sun (was )?(set|setting|went down)|twilight|dusk)\b', n=r'(Gettysburg|Wednesday|first day|Cemetery|Seminary)', w=250),
 'thompson': dict(p=r'Thompson', n=r'(Lee|headquarters|Seminary|Chambersburg (pike|road)|General)', w=250),
 'works': dict(p=r'(breast-?works?|intrench\w*|entrench\w*|rifle-?pits?|earth-?works?)', n=r'(Culp|Wednesday night|night of the (first|1st)|Slocum|Twelfth Corps|Cemetery Hill)', w=250),
 'cemetery_damage': dict(p=r'(head-?stones?|tomb-?stones?|monuments?|grave-?stones?|iron fence)', n=r'(Cemetery|Evergreen|Howard|Cemetery Hill)', w=250),
 'slocum_cmd': dict(p=r'Slocum', n=r'(command|Hancock|Howard|senior|ranking)', w=200),
 'ewell_halt': dict(p=r'(Ewell|Early|Johnson)', n=r'(Cemetery Hill|Culp.s Hill|narrow streets|attack|advance|if practicable)', w=250),
 'lee_hq': dict(p=r'(headquarters|head-quarters)', n=r'(Lee|Seminary|Thompson|Chambersburg|porch)', w=250),
}
_RX = {}


def norm(t):
    t = re.sub(r'-\s*\n\s*(?=[a-z])', '', t)
    return re.sub(r'\s+', ' ', t)


def sources():
    out = {}
    for sid, rel in BOOKS.items():
        p = os.path.join(LIBR, rel)
        if os.path.exists(p):
            out[sid] = p
    for base in ('ca/pages', 'retry/ca/pages'):
        for root, ds, fs in os.walk(os.path.join(LIBR, 'web', base)):
            for f in fs:
                if f.endswith('.txt'):
                    p = os.path.join(root, f)
                    m = re.search(r'/(sn\d{8})/(\d{4}-\d\d-\d\d)/ed-(\d+)/seq-(\d+)\.txt$', p)
                    if m:
                        out['CA-%s-%s-p%s%s' % (m.group(1), m.group(2), m.group(4), '' if m.group(3) == '1' else '-ed' + m.group(3))] = p
    return out


def main(topics):
    src = sources()
    comp = {tp: (re.compile(TOPICS[tp]['p'], re.I), re.compile(TOPICS[tp]['n'], re.I) if TOPICS[tp]['n'] else None) for tp in topics}
    seen = {tp: set() for tp in topics}
    lines = {tp: [] for tp in topics}
    for sid, p in sorted(src.items()):
        raw = open(p, encoding='utf-8', errors='replace', newline='').read()
        has_g = 'ettysburg' in raw
        t = None
        for tp in topics:
            if sid.startswith('CA-') and not has_g and tp != 'moon':
                continue
            if t is None:
                t = norm(raw)
            spec = TOPICS[tp]
            rx, nr = comp[tp]
            for m in rx.finditer(t):
                if nr and not nr.search(t[max(0, m.start() - spec['w']):m.end() + spec['w']]):
                    continue
                ctx = t[max(0, m.start() - 300):m.end() + 400]
                key = hashlib.md5(re.sub(r'\W', '', ctx[150:330]).lower().encode()).hexdigest()
                if key in seen[tp]:
                    continue
                seen[tp].add(key)
                lines[tp].append('[%s @%d] ...%s<<%s>>%s...' % (sid, m.start(), t[max(0, m.start() - 300):m.start()], m.group(0), t[m.end():m.end() + 400]))
    for tp in topics:
        open(os.path.join(HERE, 'ext', 'sweep_%s.txt' % tp), 'w', encoding='utf-8').write('\n\n'.join(lines[tp]))
        print(tp, len(lines[tp]), 'hits')


if __name__ == '__main__':
    main(sys.argv[1:] or list(TOPICS))
