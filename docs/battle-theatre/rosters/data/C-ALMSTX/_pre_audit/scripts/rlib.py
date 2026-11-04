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
# battles every instance of which falls before 1 July 1863 (verb 'killed'/'died of wounds' there = separation)
SAFE_BATTLES = ['first manassas', 'second manassas', 'manassas', 'bull run', 'seven pines', 'fair oaks', 'gaines', 'gaine', 'frazier', 'frayser',
                'malvern', 'savage', 'mechanicsville', 'seven days', 'williamsburg', 'yorktown', 'cedar run', 'cedar mountain', 'sharpsburg',
                'sharpslurg', 'sharpsbnrg', 'antietam', 'boonsboro', 'south mountain', 'chancellorsville', 'chancellorsvillc', 'fredericksburg', 'suffolk', 'donelson',
                'shiloh', 'perryville', 'murfreesboro', 'stone', 'vicksburg', 'harper', 'cross keys', 'dranesville', 'ball', 'plains', 'rappahannock',
                'slaughter', 'chantilly', 'ox hill', 'warrenton', 'groveton', 'sharps', 'wilson\'s creek', 'belmont', 'oak grove', 'savages',
                'new orleans', 'pensacola', 'santa rosa', 'corinth', 'farmington', 'richmond, ky', 'munfordville', 'raymond', 'jackson, miss', 'champion hill', 'big black']
LATER = re.compile(r"(chick\w*|wilderness|spott?sylvania|petersburg|cold\s+harbor|knoxville|appomattox|deep\s+bottom|fussell|fort\s+harrison|darbytown|cedar\s+creek|monocacy|hanover\s+junction|north\s+anna|bean|dandridge|lookout|mission\w*\s+ridge|atlanta|franklin|nashville|jonesboro|williamsburg\s+road|bermuda|drewry|reams|hatcher|five\s+forks|sailor|farmville|south\s+side|new\s+market|fort\s+gilmer|winchester\s+road|boydton|weldon|1864|1865|'6[45]|battle\s+of\s+the\s+wilderness)", re.I)
PA_CAMP = re.compile(r"(falling\s+waters|hagerstown|williamsport|funkstown|monterey|fairfield|cashtown|chambersburg|greencastle|pennsylvania|\bpa\b\.?|hanover|carlisle|shippensburg|waynesboro|emmitsburg|boonsboro)", re.I)


def split_segments(text):
    return [s.strip() for s in re.split(r"[;]|\.\s+(?=[A-Z])", text) if s.strip()]


def classify(remark, in_date=None, out_date=None, enlist_known=True, compiled_before=None, section=''):
    """Return (label, basis, roll_status, flags(list), note).
    remark: free text; in_date/out_date: datetime.date or None; compiled_before: date of a roll compiled before the battle
    (a man listed there as discharged/died/transferred/deserted is Absent-Documented)."""
    flags = []
    t = (remark or '').strip()
    segs = split_segments(t) if t else []
    # --- rule 2: Gettysburg named, or casualty dated 1-3 July 1863
    gb_seg = None; julycas = None; gb_campaign = None
    for s in segs:
        if has_gb(s):
            if has_gb(re.sub(r"[A-Za-z\-']{7,12}\s+campaign", ' ', s, flags=re.I)):
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
        if not SEP_VERB.search(s):
            continue
        ds = [d for d, p, _ in parse_dates(s)]
        low = s.lower()
        if re.search(r"\b(kill\w*|died|death|mortally)\b", low) and any(b in low for b in SAFE_BATTLES) and not re.search(r"williamsburg road|wilderness|spotts|cold harbor|petersburg|hatcher|reams|deep bottom|fussell|cedar creek|monocacy", low):
            # 'killed at <safe battle>'  (guard: later namesakes)
            if not ds or all(d < D0 for d in ds):
                sep = (s, 'battle-dated before July 1863'); break
        if ds and ds[0] < D0 and re.search(r"\b(kill\w*|died|death|deserted|discharg\w*|resign\w*|dismiss\w*|cashier\w*|retired|transferred|mustered\s+out|dropped|substitute)\b", low):
            sep = (s, 'dated %s' % iso(ds[0])); break
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
    # enlistment verbs inside remark
    for s in segs:
        if re.search(r"\b(enlisted|joined|recruit\w*|conscript\w*|substitute\s+for|volunteered|appointed|elected|commissioned)\b", s, re.I):
            ds = [d for d, p, _ in parse_dates(s)]
            if ds and ds[0] > D1 and not re.search(r"kill|wound|captur|died", s, re.I):
                return ('Absent-Documented', 'ENL-AFTER: %s' % s[:110], 'not-yet-enlisted', flags)
    if gb_campaign:
        flags.append('gettysburg-campaign-only')
        return ('Unknown', 'ONROLL-NO-STATUS: remark mentions the Gettysburg campaign, not the battle: %s' % gb_campaign[:100], 'on-roll-undetermined', flags)
    if PA_CAMP.search(t) and parse_dates(t) and any(datetime.date(1863, 6, 15) <= d <= datetime.date(1863, 7, 20) for d, p, _ in parse_dates(t)):
        flags.append('pa-campaign-undetermined')
        return ('Unknown', 'ONROLL-NO-STATUS: remark places him in the Pennsylvania campaign but not at Gettysburg: %s' % t[:100], 'on-roll-undetermined', flags)
    # separation verb without a usable date
    for s in segs:
        if SEP_VERB.search(s) and not re.search(r"\bkilled\b.*\b(wilderness|spotts|petersburg|cold harbor|chickamauga|knoxville|appomattox)", s, re.I):
            if re.search(r"\b(discharg\w*|resign\w*|dismiss\w*|cashier\w*|deserted|retired|transferred|killed|died)\b", s, re.I):
                flags.append('undated-separation')
                return ('Unknown', 'OCR-DATE-LOST: separation wording without a usable date: %s' % s[:110], 'unreadable-or-ambiguous', flags)
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
