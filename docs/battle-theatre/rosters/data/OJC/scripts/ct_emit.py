import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, re, datetime, collections
from ojc_common import *
import lab, emit
from ct_parse import resolve_ditto, DITTO

R = json.load(open(os.path.join(CACHE, 'ct_rows.json')))
SRC = 'CT-CAT-1869'
UNITMAP = {
    'U-5CT': ('U-5CT', '5th Connecticut Infantry', '5th-connecticut'),
    'U-14CT': ('U-14CT', '14th Connecticut Infantry', '14th-connecticut'),
    'U-17CT': ('U-17CT', '17th Connecticut Infantry', '17th-connecticut'),
    'U-20CT': ('U-20CT', '20th Connecticut Infantry', '20th-connecticut'),
    'U-27CT': ('U-27CT', '27th Connecticut Infantry', '27th-connecticut'),
}
HA = {'B': ('U-ART-1CTB', '1st Connecticut Heavy Artillery, Battery B (Company B)', '1st-connecticut-heavy-artillery-battery-b'),
      'M': ('U-ART-1CTM', '1st Connecticut Heavy Artillery, Battery M (Company M)', '1st-connecticut-heavy-artillery-battery-m')}


import difflib
def _sim(a, b):
    return difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio()


def gap_fill(cur, prev):
    """The OCR drops ditto marks; when every printed word of the remark is (fuzzily, in order) a word of the row above and
    the row above is longer by 1-4 words, the missing words are the dittoed ones."""
    ct, pt = cur.split(), prev.split()
    if not ct or not pt or not (1 <= len(pt) - len(ct) <= 4) or len(ct) < 2:
        return cur, False
    j = 0
    for tk in ct:
        while j < len(pt) and _sim(tk, pt[j]) < 0.74:
            j += 1
        if j >= len(pt):
            return cur, False
        j += 1
    # first printed word must be the first or second word of the previous row
    return ' '.join(pt), True


def smart_fill(cur, prev):
    toks = cur.split()
    if not prev or not toks:
        return cur, None
    ptoks = prev.split()
    nd = [t for t in toks if not DITTO.match(t)]
    has_ditto = len(nd) < len(toks)
    if has_ditto or len(toks) < len(ptoks):
        if not nd:
            return resolve_ditto(cur, prev)[0], 'ditto'
        # subsequence match of the printed (non-ditto) words inside the row above
        j = 0; pos = []
        okm = True
        for tk in nd:
            while j < len(ptoks) and not (_sim(tk, ptoks[j]) >= 0.74 and (not re.search(r'\d', tk) or re.sub(r'\D', '', tk) == re.sub(r'\D', '', ptoks[j]))):
                j += 1
            if j >= len(ptoks):
                okm = False; break
            pos.append(j); j += 1
        if okm and len(ptoks) - len(nd) <= 6 and (has_ditto or 1 <= len(ptoks) - len(nd) <= 4) and len(nd) >= 1:
            out = list(ptoks)
            for tk, p in zip(nd, pos):
                out[p] = tk
            return ' '.join(out), ('ditto' if has_ditto else 'gap')
        if has_ditto:
            r2, ch = resolve_ditto(cur, prev)
            return r2, ('ditto' if ch else None)
    return cur, None


def norm_rows(rs):
    out = []
    prev_rem = prev_res = ''
    last_block = None
    for r in rs:
        block = (r['company'], r['section'])
        if block != last_block:
            prev_rem = prev_res = ''
            last_block = block
        flags = []
        rem0 = re.sub(r'\s+', ' ', r['rem']).strip()
        rem, how = smart_fill(rem0, prev_rem)
        if how == 'ditto': flags.append('remark-ditto-resolved')
        elif how == 'gap': flags.append('remark-dropped-ditto-filled')
        res = r['res'].strip()
        if res and (DITTO.match(res) or res.lower() in ('it', 'u', 'a', 'i', 'k', 'n', 'c', "'", 'ii', 'l', '1')) and prev_res:
            res, flags = prev_res, flags + ['residence-ditto-resolved']
        prev_rem, prev_res = rem, (res if res else prev_res)
        dtxt = re.sub(r'(\d)\s+(\d)', r'\1\2', r['date'])
        ds = lab.find_dates(dtxt)
        enl = None; note = ''
        ok = True
        rank = r.get('rank', '')
        officer = bool(emit.OFFICER_RANK.match(rank.strip())) if rank else False
        if r['section'] == 'field-staff' or officer:
            ok = False
        if ds and ds[0]['day']:
            d0 = ds[0]
            yr = d0['year']
            if not yr and r['block_year']:
                yr = r['block_year']; note = 'year from block heading'
            if yr:
                try:
                    enl = datetime.date(yr, d0['month'], min(d0['day'], 28 if d0['month'] == 2 else 30 if d0['month'] in (4, 6, 9, 11) else 31))
                except ValueError:
                    enl = None
            elif r['section'] == 'company':
                ok = False; flags.append('muster-year-not-printed-original-section')
        name = r['name'].strip()
        out.append(dict(company=r['company'], section=r['section'], rank=rank, name=name, age='', res=res, enl_text=r['date'], enl=enl,
                        enl_note=note, enl_ok=ok, rem=rem, page=r['page'], flags=flags))
    return out


allstats = {}
for key, (uid, lab_, outn) in UNITMAP.items():
    rs = [r for r in R if r['unit'] == key]
    rows = norm_rows(rs)
    out, st = emit.process(rows, uid, lab_, outn, SRC)
    allstats[uid] = st
    print(uid, st['rows'], st['labels'], st['unreadable_share'])
for co, (uid, lab_, outn) in HA.items():
    rs = [r for r in R if r['unit'] == 'HA1' and r['company'] == co]
    rows = norm_rows(rs)
    out, st = emit.process(rows, uid, lab_, outn, SRC)
    allstats[uid] = st
    print(uid, st['rows'], st['labels'], st['unreadable_share'])
json.dump(allstats, open(os.path.join(CACHE, 'ct_stats.json'), 'w'), indent=1)
