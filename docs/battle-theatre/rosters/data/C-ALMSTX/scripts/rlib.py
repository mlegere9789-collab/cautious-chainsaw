"""Shared helpers for family C-ALMSTX roster parsers (standard library only).
Presence labels follow rosters/PLAN.md section 2.2: first rule that fires sets the label.
  CAS-REMARK  (rule 2)  remark names Gettysburg (or a casualty on 1-3 July 1863) -> Present-Documented
  OFFICER-HISTORY (4)   named present by a report/history
  SEP-BEFORE  (rule 7)  separation dated (or battle-dated) before 1 July 1863 -> Absent-Documented
  ENL-AFTER   (rule 8)  enlisted/commissioned after 3 July 1863 -> Absent-Documented
  CONFLICT    (rule 10) two statements disagree -> Unknown, flag contested
  ONROLL-NO-STATUS (12) -> Unknown, roll_status on-roll-undetermined
  OCR-DATE-LOST (13)    -> Unknown, roll_status unreadable-or-ambiguous
"""
import re, csv, os, json, datetime, difflib

ROOT = r'C:\Users\mlege\gettysburg-map'
DATA = ROOT + r'\docs\battle-theatre\rosters\data\C-ALMSTX'
CACHE = ROOT + r'\tmp\library\rosters\C-ALMSTX'
D0 = datetime.date(1863, 7, 1)   # first day of battle
D1 = datetime.date(1863, 7, 3)   # last day
COLS = ['unit_id', 'regiment', 'company', 'section', 'name_as_printed', 'rank', 'enlist_or_commission_date',
        'source_entry', 'presence_label', 'presence_basis', 'dup_group', 'source_id', 'locator', 'parse_flags', 'roll_status']

MON = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
OCRMON = {'mav': 5, 'julv': 7, 'jnly': 7, 'juue': 6, 'junc': 6, 'sept': 9, 'deo': 12, 'dee': 12, 'aprd': 4, 'api': 4, 'marcb': 3, 'augnst': 8, 'octobei': 10}


def mon_of(tok):
    t = re.sub(r'[^A-Za-z]', '', tok).lower()
    if not t:
        return None
    if t in OCRMON:
        return OCRMON[t]
    return MON.get(t[:3]) if len(t) >= 3 and t[:3] in MON and (len(t) <= 9) else None


def fix_year(s):
    s = s.strip().strip("'\u2018\u2019`\u201c\u201d\"")
    s = s.replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1').replace('!', '1').replace('i', '1')
    d = re.sub(r'\D', '', s)
    if len(d) == 4 and d.startswith('18') and '1860' <= d <= '1869':
        return int(d)
    if len(d) == 2 and d[0] == '6' and d[1] in '0123456789':
        y = 1860 + int(d[1])
        return y if y <= 1865 else None
    if len(d) == 1 and d in '12345':     # lost the "6": '6x -> x  (rare)
        return None
    return None


_MD = r'(Jan|Feb|Mar|Apr|May|Mav|Jun|Jul|Julv|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?'
# "July 2, '63" / "July 2d 1863" / "July, 1863" / "2 July, 1863" / "2d July 1863"
RE_MDY = re.compile(_MD + r"\s*(\d{1,2})?(?:st|d|nd|rd|th)?\s*[,.]?\s*['\u2018\u2019`\"]?\s*(18\d\d|\d{2})\b", re.I)
RE_DMY = re.compile(r"\b(\d{1,2})(?:st|d|nd|rd|th)?\s+" + _MD + r"\s*[,.]?\s*['\u2018\u2019`\"]?\s*(18\d\d|\d{2})\b", re.I)


def parse_dates(text):
    """-> list of (date, precision, span) ; precision 'day'|'month'. Year-less mentions are ignored."""
    out = []
    used = []
    for m in RE_DMY.finditer(text):
        mo = mon_of(m.group(2)); yr = fix_year(m.group(3))
        if mo and yr:
            try:
                out.append((datetime.date(yr, mo, min(int(m.group(1)), 28 if mo == 2 else 30 if mo in (4, 6, 9, 11) else 31)), 'day', m.span())); used.append(m.span())
            except ValueError:
                pass
    for m in RE_MDY.finditer(text):
        if any(a <= m.start() < b for a, b in used):
            continue
        mo = mon_of(m.group(1)); yr = fix_year(m.group(3))
        if not (mo and yr):
            continue
        if m.group(2):
            d = int(m.group(2))
            if not 1 <= d <= 31:
                continue
            try:
                out.append((datetime.date(yr, mo, min(d, 28 if mo == 2 else 30 if mo in (4, 6, 9, 11) else 31)), 'day', m.span()))
            except ValueError:
                pass
        else:
            out.append((datetime.date(yr, mo, 1), 'month', m.span()))
    out.sort(key=lambda t: t[2][0])
    return out


def iso(d):
    return d.isoformat() if d else ''


def has_gb(text):
    """OCR-tolerant 'Gettysburg' detector (token fuzzy match)."""
    toks = re.findall(r"[A-Za-z][A-Za-z'\-]{5,}", text)
    cand = list(toks)
    for i in range(len(toks) - 1):
        cand.append(toks[i] + toks[i + 1])
    for t in cand:
        tl = t.lower().replace('-', '').replace("'", '')
        if 7 <= len(tl) <= 12 and difflib.SequenceMatcher(None, tl, 'gettysburg').ratio() >= 0.8:
            return True
    return False


SEP_VERB = re.compile(r"\b(kill\w*|died|dying|death|deserted|desertion|discharg\w*|resign\w*|dismiss\w*|cashier\w*|retired|"
                      r"transferred|transfer|mustered\s+out|dropped|furnish\w*\s+substitute|put\s+in\s+(?:a\s+)?substitute|"
                      r"went\s+to|disabled|reformed|exchanged\s+out|honorably)\b", re.I)
CAS_VERB = re.compile(r"\b(kill\w*|wound\w*|captur\w*|prisoner|taken|missing|died|mortally|disabled|lost\s+(?:an?\s+)?(?:arm|leg|foot|hand|eye))\b", re.I)
DOUBT = re.compile(r"(no member|not remember|seems? to|is not known|uncertain|probably|perhaps|not certain|cannot say|do(?:es)? not know)", re.I)
NEG = re.compile(r"\b(absent|not\s+(?:at|in|present|engaged)|sick|furlough|hospital|detached|detail(?:ed)?|at\s+home|was\s+not)\b", re.I)
# AUDIT 2026-10-30: SAFE_BATTLES (substring list with surnames such as Stone, Ball, Harper, Frazier, Plains, and places such as
# New Orleans, Warrenton, Boonsboro, Vicksburg that were also fought over or named after 1 July 1863) is replaced by this pattern list.
# Battles every instance of which falls before 1 July 1863. A bare 'killed at <battle>' with no date counts as a separation only with a kill-like verb.
SAFE_RE = re.compile(r"(first\s+manassas|second\s+manassas|\bmanassas\b|bull\s+run|seven\s+pines|fair\s+oaks|gaines?\W{0,3}s?\W{0,2}(?:mill|mil\b|farm)|gaines'(?!\w)|"
                     r"fraz[ie]+r?\W{0,2}s?\W{0,3}s?\W{0,2}farm|frayser\W{0,2}s?\W{0,2}farm|malvern|savage\W{0,2}s?\s+station|white\s+oak\s+swamp|glendale|seven\s+days|williamsburg|yorktown|"
                     r"cedar\s+(?:run|mountain)|slaughter\W{0,2}s?\s+mountain|groveton|chantilly|ox\s+hill|sharps(?:b\w*|[-*])|sharpslurg|antietam|south\s+mountain|"
                     r"chancellorsvil\w*|fredericksburg|suffolk|cross\s+keys|port\s+republic|fort\s+donelson|donelson|shiloh|perryville|murfreesboro|"
                     r"stones?\W{0,2}s?\s+river|munfordville|richmond,\s+ky|farmington|champion\s+hill|big\s+black|dranesville|ball\W{0,2}s\s+bluff|wilson\W{0,2}s\s+creek|"
                     r"\bbelmont\b|santa\s+rosa|oak\s+grove)", re.I)
KILLISH = re.compile(r"\b(kill\w*|mortally|died\s+of\s+(?:his\s+)?wounds|fell\b|shot)|wounded\s+(?:at\s+)?[A-Za-z' ,]{3,30}?\s+and\s+died\b|"
                     r"\bdied\b.{0,40}\b(?:manassas|yorktown)\b|\b(?:manassas|yorktown)\b.{0,25}\bdied\b", re.I)
STRONG_SEP = re.compile(r"\b(kill\w*|died|deserted|discharg\w*|resign\w*|dismiss\w*|cashier\w*|retired|transferred|mustered\s+out|dropped|substitute)\b", re.I)
NOT_SEP = re.compile(r"(?:\b(?:since|after)\s+(?:the\s+)?war\b|\bdied\s+at\s+the\s+age\b|\bwhere\s+he\s+died\b|\b19[0-4]\d\b|\bliving\s+when\b|\bdied\s+(?:in|at)\s+\w+\s+in\s+(?:19|18[7-9])\d\d)", re.I)
DUTY = re.compile(r"discharg\w*\s+(?:\w+\s+){0,2}(?:duty|duties|office)\b", re.I)
LATER = re.compile(r"(chick\w*|wilderness|spott?sylvania|petersburg|cold\s+harbor|knoxville|appomattox|deep\s+bottom|fussell|fort\s+harrison|darbytown|cedar\s+creek|"
                   r"monocacy|hanover\s+junction|north\s+anna|bean'?s?\s+station|dandridge|lookout|mission\w*\s+ridge|atlanta|franklin|nashville|jonesboro|"
                   r"williamsburg\s+road|bermuda|drewry|reams|hatcher|five\s+forks|sailor|farmville|south\s+side|new\s+market|fort\s+gilmer|boydton|weldon|"
                   r"\b1864\b|\b1865\b|'6[45]\b|loudon|battle\s+mountain|strasburg|snicker|gettysburg|falling\s+waters|hagerstown|williamsport|funkstown|"
                   r"brandy\s+station|bunker|fort\s+gaines|cedar\s+creek|winchester,\s+va\.?\s*(?:\w+\s+){0,2}1864)", re.I)
ENL_VERB = re.compile(r"(?<![Rr]e-)(?<![Rr]e)\b(enlisted|joined|recruited|conscripted|volunteered|substitute\s+for)\b")
OTHER_EVENT = re.compile(r"\b(transferred|discharged|killed|died|wounded|deserted|promoted|elected|appointed|captured|resigned)\b", re.I)


def assoc_date(s, vm):
    """date tied to the verb match vm inside segment s: the first date within 90 characters after the verb, else a date ending within 22 characters before it."""
    ds = parse_dates(s)
    after = [d for d, p, sp in ds if sp[0] >= vm.end() - 1 and sp[0] - vm.end() <= 90]
    if after:
        return after[0]
    before = [d for d, p, sp in ds if sp[1] <= vm.start() and vm.start() - sp[1] <= 22]
    if before:
        return before[-1]
    return None

PA_CAMP = re.compile(r"(falling\s+waters|hagerstown|williamsport|funkstown|monterey|fairfield|cashtown|chambersburg|greencastle|pennsylvania|\bpa\b\.?|hanover|carlisle|shippensburg|waynesboro|emmitsburg|boonsboro)", re.I)


def split_segments(text):
    return [s.strip() for s in re.split(r"[;]|\.\s+(?=[A-Z])", text) if s.strip()]


def classify(remark, in_date=None, out_date=None, enlist_known=True, compiled_before=None, section=''):
    """Return (label, basis, roll_status, flags(list), note).
    remark: free text; in_date/out_date: datetime.date or None; compiled_before: date of a roll compiled before the battle
    (a man listed there as discharged/died/transferred/deserted is Absent-Documented)."""
    flags = []
    t = (remark or '').replace('\u2019', "'").replace('\u2018', "'").strip()   # AUDIT: curly apostrophes (Brewer) defeated the battle-name patterns
    segs = split_segments(t) if t else []
    # --- rule 2: Gettysburg named, or casualty dated 1-3 July 1863
    gb_seg = None; julycas = None; gb_campaign = None
    for s in segs:
        if has_gb(s):
            if has_gb(re.sub(r"\b[A-Za-z\-']{7,12}\s+campaign\b", ' ', s, flags=re.I)):
                gb_seg = s
                break
            gb_campaign = gb_campaign or s
    if gb_seg is None:
        for s in segs:
            ds = parse_dates(s)
            if any(D0 <= d <= D1 for d, p, _ in ds if p == 'day') and CAS_VERB.search(s):
                julycas = s
                break
    sep = None
    for s in segs:
        if NOT_SEP.search(s):
            continue
        low = s.lower()
        for vm in STRONG_SEP.finditer(s):
            if DUTY.match(s[vm.start():vm.start() + 60]):
                continue
            d = assoc_date(s, vm)
            if d is not None:
                if d < D0:
                    sep = (s, 'dated %s' % iso(d))
                    break
                continue          # separation dated on or after the battle: not a pre-battle separation
            if KILLISH.search(s) and SAFE_RE.search(s) and not re.search(r"williamsburg road|wilderness|spotts|cold harbor|petersburg|hatcher|reams|deep bottom|fussell|cedar creek|monocacy", low):
                sep = (s, 'battle-dated before July 1863')
                break
        if sep:
            break
    if out_date and out_date < D0 and not sep:
        sep = ('mustered out %s' % iso(out_date), 'out-date')
    if compiled_before and not sep:
        for s in segs:
            if re.search(r"\b(died|discharg\w*|transferred|deserted|resign\w*|dismiss\w*|killed|retired|cashier\w*|dropped|substitute)\b", s, re.I):
                sep = (s, 'listed so in roll compiled %s' % iso(compiled_before)); break
    if gb_seg or julycas:
        seg = gb_seg or julycas
        if DOUBT.search(seg) or (NEG.search(seg) and not CAS_VERB.search(seg)):
            flags.append('contested')
            return ('Unknown', 'CONFLICT: remark names Gettysburg with absence wording: %s' % seg[:120], 'unreadable-or-ambiguous', flags)
        if sep:
            flags.append('contested')
            return ('Unknown', 'CONFLICT: Gettysburg remark and a separation before it (%s | %s)' % (seg[:70], sep[0][:70]), 'unreadable-or-ambiguous', flags)
        if julycas and not gb_seg:
            flags.append('date-only')
            return ('Present-Documented', 'CAS-REMARK: casualty dated 1-3 July 1863 in remark: %s' % seg[:120], 'named-present', flags)
        return ('Present-Documented', 'CAS-REMARK: remark names Gettysburg: %s' % seg[:120], 'named-present', flags)
    if sep:
        return ('Absent-Documented', 'SEP-BEFORE: %s (%s)' % (sep[0][:110], sep[1]), 'off-roll-before-battle', flags)
    if in_date and in_date > D1:
        return ('Absent-Documented', 'ENL-AFTER: enlisted/commissioned %s' % iso(in_date), 'not-yet-enlisted', flags)
    # enlistment verbs inside remark (AUDIT: the date must follow the verb; re-enlisted, elected, appointed and commissioned are not first enlistment)
    for s in segs:
        for em in ENL_VERB.finditer(s):
            near = [(d, sp) for d, p, sp in parse_dates(s) if 0 <= sp[0] - em.end() <= 40]
            if near and near[0][0] > D1 and not OTHER_EVENT.search(s[em.end():near[0][1][0]]):
                return ('Absent-Documented', 'ENL-AFTER: %s' % s[:110], 'not-yet-enlisted', flags)
    if gb_campaign:
        flags.append('gettysburg-campaign-only')
        return ('Unknown', 'ONROLL-NO-STATUS: remark mentions the Gettysburg campaign, not the battle: %s' % gb_campaign[:100], 'on-roll-undetermined', flags)
    if PA_CAMP.search(t) and parse_dates(t) and any(datetime.date(1863, 6, 15) <= d <= datetime.date(1863, 7, 20) for d, p, _ in parse_dates(t)):
        flags.append('pa-campaign-undetermined')
        return ('Unknown', 'ONROLL-NO-STATUS: remark places him in the Pennsylvania campaign but not at Gettysburg: %s' % t[:100], 'on-roll-undetermined', flags)
    # separation verb without a usable date (AUDIT: not when a date after the battle or a later campaign is named, not 'discharged his duties', not 'since the war')
    for s in segs:
        if NOT_SEP.search(s) or LATER.search(s):
            continue
        for vm in STRONG_SEP.finditer(s):
            if DUTY.match(s[vm.start():vm.start() + 60]):
                continue
            if assoc_date(s, vm) is not None:
                continue
            flags.append('undated-separation')
            return ('Unknown', 'OCR-DATE-LOST: separation wording without a printed date: %s' % s[:110], 'unreadable-or-ambiguous', flags)
    return ('Unknown', 'ONROLL-NO-STATUS: on roll, no source status for the battle', 'on-roll-undetermined', flags)


def name_flags(name):
    f = []
    n = name or ''
    if re.search(r"[0-9\[\]{}|<>~^*=_\\/%$#@&]", n):
        f.append('ocr-noise-in-name')
    if len(re.sub(r"[^A-Za-z]", '', n)) < 3 or not re.search(r"[A-Z]", n):
        f.append('name-garbled')
    return f


class Writer:
    def __init__(self, slug):
        self.slug = slug
        self.rows = []

    def add(self, **kw):
        r = {c: '' for c in COLS}
        r.update(kw)
        self.rows.append(r)

    def save(self, subdir=''):
        d = os.path.join(DATA, subdir) if subdir else DATA
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, self.slug + '.csv')
        with open(p, 'w', encoding='utf-8', newline='') as f:
            w = csv.DictWriter(f, fieldnames=COLS)
            w.writeheader()
            for r in self.rows:
                w.writerow(r)
        return p

    def stats(self):
        from collections import Counter
        lab = Counter(r['presence_label'] for r in self.rows)
        rs = Counter(r['roll_status'] for r in self.rows)
        fl = sum(1 for r in self.rows if re.search(r'name-garbled|ocr-noise-in-name', r['parse_flags']))
        return dict(rows=len(self.rows), labels=dict(lab), roll_status=dict(rs), name_flagged_rows=fl)


def progress(line):
    with open(os.path.join(DATA, 'progress.md'), 'a', encoding='utf-8') as f:
        f.write('- %s %s\n' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M'), line))
