"""Verbatim time and place phrase extraction for the positions ledger.

The claim authors write descriptive 'w' (when) and 'pl' (place) strings. The Appendix-B style claim needs the phrase AS PRINTED, so this
module finds, in the normalized OR text window around the located passage, (a) the time phrase and (b) the place phrases, exactly as they
occur in the OCR (OCR errors kept). The authors' descriptive strings are kept as `description`.
"""
import re

PLACES = [
    'Cashtown', 'Fayetteville', 'Heidlersburg', 'Chambersburg', 'Greenwood', 'Marsh Creek', 'New Guilford', 'Gettysburg', 'Hunterstown',
    'Emmitsburg', 'Hagerstown', 'Williamsport', 'Carlisle', 'Dover', 'Hanover', 'Westminster', 'Fairfield', 'Monterey Springs', 'Greencastle',
    'Scotland', 'Green Village', 'Greenville', 'Middletown', 'Petersburg', 'Mummasburg', 'Hillstown', 'Berlin', 'Wrightsville', 'Millerstown',
    'Black Horse Tavern', 'Peach Orchard', 'peach orchard', 'Rock Creek', 'Cemetery Hill', "Culp's Hill", "Gulp's Hill", 'Round Top', 'Seminary Ridge',
    'Oak Ridge', 'Little Round Top', 'Shippensburg', 'Waynesborough', 'Funkstown', 'Downsville', 'Boonsborough', 'Cavetown', 'Leitersburg',
    'Falling Waters', 'Shepherdstown', 'Martinsburg', 'Winchester', 'Berryville', 'Front Royal', 'Culpeper', 'Sharpsburg', 'Frederick',
    'Rockville', 'Union Mills', 'Jefferson', 'Dillsburg', 'Bunker Hill', 'Darkesville', 'Hainesville', 'Gordonsville', 'Hanover Junction',
    'Bream\'s Hotel', 'theological seminary', 'theological college', 'Gettysburg College', 'railroad cut', 'railroad embankment', 'wheat-field',
    'Emmitsburg road', 'Emmitsburg pike', 'Emmitsburg turnpike', 'Fairfield road', 'Heidlersburg road', 'Middletown road', 'Cashtown road',
    'Baltimore pike', 'York road', 'York turnpike', 'Hanover road', 'Chambersburg pike', 'Hunterstown road', 'Mummasburg road', 'Carlisle road',
    'Millerstown road', 'Williamsport road', 'Boonsborough road', 'Greenwood road', 'Fairfield turnpike', 'Cashtown pike', 'Gettysburg pike',
    'Chambersburg and Gettysburg turnpike', 'Chambersburg road', 'Gettysburg road', 'Fairfield and Waynesborough', 'South Mountain', 'Jack Mountain',
    'Cemetery Ridge', 'McPherson', 'Willoughby Run', 'Staunton', 'Potomac', 'Antietam', 'Atlantic', 'Hamilton', 'Brandy Station', 'Culp\'s farm',
    'Gulp\'s farm', 'Pitzer', 'Wolf Hill', 'Benner', 'Oak Hill', 'the Diamond', 'Cemetery', 'Seminary', 'Spangler', 'Codori', 'Sherfy',
]
SUFFIX = r"(?:road|roads|pike|turnpike|creek|run|ridge|hill|hills|mountain|gap|farm|house|woods|orchard|bridge|ford|tavern|college|seminary|cut|church|depot|river|embankment|lane|wall|fence|barn|ravine|hollow|field|fields|Court-House|Station|Springs|Gap)"
CAP = r"[A-Z][A-Za-z'\.\-]*"
PH_RX = re.compile(r"(?:the )?(?:%s\s+){1,3}%s\b" % (CAP, SUFFIX))
TIME_RX = re.compile(
    r"(?:\b(?:about|at|before|after|until|near|by|between|just before|shortly before|late in the|early in the|early on the|toward)\s+)?"
    r"(?:\d{1,2}(?:[.:,]\d{1,2})?\s*(?:o.{1,3}cl[o0e]?c?k\.?\s*)?(?:in the (?:morning|afternoon|evening)\s*)?(?:[apAP]\.?\s?[mM]\.?\s?|\bm\.\s)"
    r"|\b\d{1,2}(?:[.:,]\d{2})?\s*o.{1,3}cl\S{0,4}(?:\s+(?:in the\s+)?(?:morning|afternoon|evening|at night|night))?"
    r"|\b(?:day-?light|day-?break|daybreak|sunrise|sunset|sun-up|dusk|dawn|midnight|nightfall|twilight|noon)\b"
    r"|\b(?:early|late)\s+(?:in the\s+)?(?:morning|afternoon|evening)\b"
    r"|\b(?:the\s+)?(?:following|next|ensuing)\s+(?:morning|evening|day|night)\b)",
    re.I)
GZ_SAFE = {
    'cashtown': 'GZ-075', 'hunterstown': 'GZ-076', 'heidlersburg': 'GZ-077', 'marsh creek': 'GZ-068', 'emmitsburg road': 'GZ-041',
    'emmitsburg pike': 'GZ-041', 'emmitsburg turnpike': 'GZ-041', 'peach orchard': 'GZ-014', 'black horse tavern': 'GZ-035', 'rock creek': 'GZ-066',
    'cemetery hill': 'GZ-003', "culp's hill": 'GZ-002', "gulp's hill": 'GZ-002', 'little round top': 'GZ-009', 'seminary ridge': 'GZ-073',
    'oak ridge': 'GZ-022', 'oak hill': 'GZ-023', 'york road': 'GZ-044', 'york turnpike': 'GZ-044', 'baltimore pike': 'GZ-039',
    'hanover road': 'GZ-043', 'carlisle road': 'GZ-046', 'mummasburg road': 'GZ-047', 'cemetery ridge': 'GZ-006', 'willoughby run': 'GZ-067',
    'wheat-field': 'GZ-013', 'millerstown road': 'GZ-053', 'hunterstown road': 'GZ-058', 'heidlersburg road': 'GZ-045',
    'chambersburg pike': 'GZ-040', 'wolf hill': 'GZ-024',
}


def _find_ci(seg, term):
    i = seg.lower().find(term.lower())
    return i


def extract_when(seg, rs, re_, desc, t):
    """Return a phrase exactly as in seg (normalized OCR text) or None."""
    if desc:
        d = re.sub(r'\s*\([^)]*\)', '', desc).strip(' ;,')
        for part in [p.strip() for p in re.split(r';', d) if p.strip()]:
            i = _find_ci(seg, part)
            if i >= 0 and len(part) >= 4:
                return seg[i:i + len(part)]
    cands = []
    for m in TIME_RX.finditer(seg):
        s0, e0 = m.start(), m.end()
        txt = seg[s0:e0].strip()
        if len(txt) < 3:
            continue
        near = (s0 <= re_ + 250 and e0 >= rs - 250)
        if near:
            cands.append((s0, e0, txt))
    if not cands:
        return None
    pref = None
    if t:
        h = int(t[:2])
        hs = {str(h), str(h % 12 or 12)}
        for s0, e0, txt in cands:
            nums = re.findall(r'\d+', txt)
            if nums and nums[0] in hs:
                pref = txt
                break
    if pref is None:
        # first inside the anchor, else the nearest to it
        inside = [c for c in cands if rs - 5 <= c[0] <= re_ + 5]
        c0 = inside[0] if inside else min(cands, key=lambda c: min(abs(c[0] - rs), abs(c[0] - re_)))
        pref = c0[2]
    return pref.strip(' ,;')


def extract_places(seg, rs, re_, desc):
    """Verbatim place phrases from seg that the authors' description also names. Returns list in text order."""
    found = {}
    dl = (desc or '').lower()
    for term in PLACES:
        if term.lower() in dl or term.lower().replace("'", '') in dl:
            for m in re.finditer(re.escape(term), seg, re.I if term[0].islower() else 0):
                if m.start() >= rs - 450 and m.end() <= re_ + 450:
                    found.setdefault(m.start(), seg[m.start():m.end()])
    for m in PH_RX.finditer(seg):
        ph = m.group(0)
        heads = [w for w in re.findall(CAP, ph) if len(w) > 2][:-1]
        if heads and all(h.lower().strip("'.") in dl for h in heads[-2:]):
            found.setdefault(m.start(), ph)
    items = sorted(found.items())
    out = []
    for _, ph in items:
        if any(ph.lower() in o.lower() and ph.lower() != o.lower() for o in out):
            continue
        out = [o for o in out if not (o.lower() in ph.lower() and o.lower() != ph.lower())]
        if ph.lower() not in [o.lower() for o in out]:
            out.append(ph)
    return out[:5]


def gaz_from_printed(phrases):
    ids = []
    for ph in phrases:
        k = ph.lower().strip()
        k = re.sub(r'^the\s+', '', k)
        if k in GZ_SAFE and GZ_SAFE[k] not in ids:
            ids.append(GZ_SAFE[k])
    return ids


SPATIAL_RX = re.compile(r"(?:on|to|in|at|near|behind|in front of|in rear of|along|across|beyond|toward|towards|from|within|over|upon|opposite|between)\s+(?:the|our|a|an|his|its)\s+[^,.;:]{3,70}", re.I)


def extract_spatial(seg, rs, re_):
    """Fallback: first spatial phrase inside the anchor (verbatim), skipping time phrases."""
    inner = seg[max(0, rs):re_]
    bad = re.compile(r"\d|morning|evening|afternoon|night|day|p\. ?m|a\. ?m|hour|o.clock|July|June|battle|action|engage|fight|command|report|order|time", re.I)
    for m in SPATIAL_RX.finditer(inner):
        ph = m.group(0).strip(' ,;')
        if not bad.search(ph):
            return ph
    return None
