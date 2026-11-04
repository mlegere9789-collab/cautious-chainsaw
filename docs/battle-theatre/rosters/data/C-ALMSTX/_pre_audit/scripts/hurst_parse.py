"""14th Alabama Infantry: Hurst, History of the Fourteenth Regiment Alabama Vols., with a list of the names of every man that ever belonged to the regiment (Richmond, 1863).
Roll compiled before the battle (latest dated event 3 May 1863; no Gettysburg event) -> a man listed as died/discharged/transferred/deserted/resigned/killed is Absent-Documented."""
import sys, re, datetime
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *

SRC = CACHE + r'\norm\historyoffourtee01hurs_djvu.txt'
COMP = [('A', 704), ('B', 978), ('C', 1247), ('D', 1536), ('E', 1825), ('F', 2037), ('G', 2308), ('H', 2621), ('I', 2922), ('K', 3250), (None, 3515)]
APP = 4242
BEFORE = datetime.date(1863, 6, 30)
OFF = re.compile(r"^(Captain|Capt\.?|[1I]st\s+Lieutenant|[1I]sf\s+Lieutenant|[2-9lI]\w?\s*(?:Jr\.?\s*)?Lieutenant|\w{1,3}\s+Jr\s+Lieutenant|Orderly\s+Sergeant|Orderly\s+Serg't|\w{1,4}\s+Sergeant|\w{1,4}\s+Serg't|\w{1,4}\s+Corp(?:'l|oral)|\w{1,4}\s+\"|Musician|Color\s+Serg't|Colonel|Major|Adjutant)\s+(.*)$", re.I)
PRIV = re.compile(r"^([A-Z][A-Za-z'\-]+(?:\s[A-Za-z]{2,12})?)\s*[,.]\s*([A-Z]{1,3}(?:[ .]+[A-Z]\b)?\.?)(?=\s|\.|$)\s*(.*)$")


def norm_key(c, name):
    return c + ':' + re.sub(r'[^a-z]', '', name.lower())


def run():
    lines = open(SRC, encoding='utf-8', errors='replace').read().split('\n')
    wr = Writer('14th-alabama')
    keymap = {}
    for (c, lo), (_, hi) in zip(COMP[:-1], COMP[1:]):
        cur = None
        in_priv = False
        def flush():
            nonlocal cur
            if not cur:
                return
            rem = re.sub(r'\s+', ' ', cur['rem']).strip(' |.,')
            label, basis, rs, fl = classify(rem, compiled_before=BEFORE)
            fl = fl + name_flags(cur['name'])
            n = len(wr.rows)
            wr.add(unit_id='C-14AL', regiment='14th Alabama Infantry', company=c, section=cur['sect'], name_as_printed=cur['name'], rank=cur['rank'],
                   source_entry=rem[:300], presence_label=label, presence_basis=basis, dup_group=norm_key(c, cur['name']),
                   source_id='AL-HURST-1863', locator='roll of Co. %s, djvu line %d' % (c, cur['ln']), parse_flags=';'.join(sorted(set(fl))), roll_status=rs)
            keymap[norm_key(c, cur['name'])] = n
            cur = None
        for ln in range(lo, hi):
            raw = lines[ln - 1].strip()
            if not raw or len(raw) < 3:
                continue
            if re.match(r"^(Privates|\d+|[-—_=\. ]+)\.?$", raw):
                if raw.lower().startswith('privates'): in_priv = True
                flush() if False else None
                continue
            if re.search(r"(Original|Ori|Orig|Or\w+)\s*\w*\s*(list|[Il]ist|L[i1]st|luist)\s+of", raw, re.I) or re.match(r"^[A-Z' ]{6,}\.?$", raw):
                flush(); continue
            mo = OFF.match(raw) if not in_priv else None
            if mo:
                flush()
                body = mo.group(2)
                nm, _, rem = body.partition(',')
                cur = dict(name=nm.strip(' .'), rem=rem.strip(), rank=re.sub(r'\s+', ' ', mo.group(1)), sect='officers/NCOs', ln=ln)
                continue
            mp = PRIV.match(raw)
            if mp:
                in_priv = True
                flush()
                cur = dict(name='%s, %s' % (mp.group(1), mp.group(2).strip(' .')), rem=mp.group(3), rank='Private', sect='privates', ln=ln)
                continue
            if cur is not None:
                cur['rem'] += ' ' + raw
        flush()
    # appendix casualties after 1 Jan 1863 (Chancellorsville): attached as separate rows linked by dup_group where the name matches
    comp = None
    for ln in range(APP, len(lines) + 1):
        raw = lines[ln - 1].strip()
        m = re.match(r"^Casualties\s+r?f?\s*Company\s+([A-K])", raw) or re.match(r"^Company\s+([A-K])\.?$", raw)
        if m:
            comp = m.group(1); continue
        if comp is None:
            continue
        mp = PRIV.match(raw)
        mo = OFF.match(raw)
        if mp:
            nm = '%s, %s' % (mp.group(1), mp.group(2).strip(' .')); rem = mp.group(3); rank = 'Private'
        elif mo:
            nm, _, rem = mo.group(2).partition(','); nm = nm.strip(' .'); rank = mo.group(1)
        else:
            continue
        k = norm_key(comp, nm)
        label, basis, rs, fl = classify(rem, compiled_before=BEFORE)
        wr.add(unit_id='C-14AL', regiment='14th Alabama Infantry', company=comp, section='appendix: casualties 1863 (Chancellorsville)', name_as_printed=nm, rank=rank,
               source_entry=rem[:300], presence_label=label, presence_basis=basis, dup_group=k, source_id='AL-HURST-1863', locator='appendix, djvu line %d' % ln,
               parse_flags=';'.join(sorted(set(fl + name_flags(nm) + ([] if k in keymap else ['no-match-in-roll'])))), roll_status=rs)
    p = wr.save('alabama')
    print(p, wr.stats())
    progress('alabama 14th Alabama (Hurst 1863) parsed: %d rows' % len(wr.rows))


run()
