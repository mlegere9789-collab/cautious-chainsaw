"""Participants lists of "Maine at Gettysburg" (1898), from word boxes: the nominal lists of the officers and men of each Maine command present
in the battle.  Layout: headings (Company A. / SERGEANTS. / CORPORALS. / PRIVATES. ...), then entries of the form
    Rank, Given Surname, Residence.           (officers, staff, first sergeants)
    Given Surname, Residence,                 (sergeants, corporals, musicians)
    Surname, Given, Residence,                (privates)
set in two columns, plus run-in paragraphs ("On Special Duty or Detached Service: ...").  An entry is cut at the commas of its line; a line of
which the fields do not form entries is listed, never guessed.  Names are kept as printed.
"""
import re, statistics, collections
import mtable as T

RANK_RX = re.compile(r"(?i)^(?:(?:1st|first|2d|2nd|second|ist|lst)\s+)?(?:colonel|lieut\.?[- ]?colonel|major|captain|capt\.?|adjutant|quartermaster|surgeon|assistant\s+surgeon|chaplain|"
                     r"sergeant[- ]major|hospital\s+steward|quartermaster[- ]sergeant|commissary[- ]sergeant|drum[- ]major|fife[- ]major|lieutenant|lieut\.?|"
                     r"(?:first|orderly|ord\.?|1st|ist)?\s*sergeant|sergt\.?|corporal|musician|musicians|wagoner|bugler|saddler|farrier|blacksmith|cook|artificer|principal\s+musician|"
                     r"quartermaster\s+sergeant|commissary\s+sergeant|company\s+clerk|sergeant|acting\s+[a-z ]+|chief\s+[a-z ]+)\W*$")
SECTION_RX = [(re.compile(r'(?i)^serg[a-z]{0,6}nts?\W*$'), 'SERGEANTS.'), (re.compile(r'(?i)^corporals?\W*$'), 'CORPORALS.'), (re.compile(r'(?i)^privates?\W*$'), 'PRIVATES.'),
              (re.compile(r'(?i)^musicians?\W*$'), 'MUSICIANS.'), (re.compile(r'(?i)^wagoners?\W*$'), 'WAGONER.'), (re.compile(r'(?i)^buglers?\W*$'), 'BUGLERS.'),
              (re.compile(r'(?i)^(?:saddlers?|farriers?|blacksmiths?|teamsters?|cooks?|artificers?)\W*$'), None)]
STOP_RX = re.compile(r'(?i)^(?:REVISED\s+REPORT|CASUALTIES|HISTORICAL\s+SKETCH|Note\b|SUMMARY|ROSTER|REGIMENTAL\s+DEDICATION|ADDRESS)')
COMPANY_RX = re.compile(r'^(?:Company|Co\.)\s+([A-M])\W*$')


def split_columns(row, R0):
    """A visual row -> cell-lines: one per column (the right column starts at R0)."""
    row = sorted(row, key=lambda w: w['x0'])
    if R0 is None:
        return [row]
    left = [w for w in row if w['x0'] < R0 - 20]
    right = [w for w in row if w['x0'] >= R0 - 20]
    if left and right and (right[0]['x0'] - left[-1]['x1'] >= 25):
        return [left, right]
    return [row]


def fields_of(ws):
    """Comma-separated fields of a cell-line: [(tokens as words)] ."""
    out, cur = [], []
    for w in ws:
        cur.append(w)
        if re.search(r'[,;]\W*$', w['w']) or re.search(r'\.\W*$', w['w']) and len(w['w']) > 3 and False:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def ftxt(f):
    return ' '.join(w['w'] for w in f)


def is_cap(f):
    t = ftxt(f)
    return bool(re.match(r'^[A-ZÀ-Ý][A-Za-z\'\.\- ]*', t)) and not t[:1].islower()


def parse_cell_line(ws):
    """-> list of entries dict(rank, name_words, rem_words) and list of unparsed field texts"""
    fs = fields_of(ws)
    entries, bad = [], []
    i, n = 0, len(fs)
    while i < n:
        f = fs[i]
        t = ftxt(f).strip(' ,;.')
        if RANK_RX.match(t) and i + 1 < n and len(fs[i + 1]) >= 2:
            e = {'rank_words': f, 'name_words': fs[i + 1], 'rem_words': []}
            j = i + 2
            if j < n and is_cap(fs[j]) and len(fs[j]) <= 3:
                e['rem_words'] += fs[j]
                j += 1
            entries.append(e); i = j
        elif len(f) == 1 and i + 2 < n and is_cap(fs[i + 1]) and 1 <= len(fs[i + 1]) <= 3 and is_cap(fs[i + 2]) and len(fs[i + 2]) <= 3 and not RANK_RX.match(ftxt(fs[i + 1]).strip(' ,;.')):
            e = {'rank_words': [], 'name_words': f + fs[i + 1], 'rem_words': list(fs[i + 2])}
            entries.append(e); i += 3
        elif 2 <= len(f) <= 5 and i + 1 < n and is_cap(fs[i + 1]) and len(fs[i + 1]) <= 3:
            e = {'rank_words': [], 'name_words': f, 'rem_words': list(fs[i + 1])}
            entries.append(e); i += 2
        elif entries and t[:1].islower():
            entries[-1]['rem_words'] += f; i += 1                 # a note (color bearer, ...) belongs to the entry before it
        else:
            bad.append(ftxt(f)); i += 1
    # notes that follow an entry on the same line (lowercase fields) were attached above; continuation of residence tokens too
    return entries, bad


def parse(leaves, words_of, start_rx=r'(?i)^(?:PARTICIPANTS\W*$|Present\s+for\s+Duty)'):
    rows, bad_lines, notes = [], [], []
    started = False
    ctx = {'co': '', 'rk': 'PARTICIPANTS.', 'sec': ''}
    stopped = False
    for leaf in leaves:
        if stopped:
            break
        ws = [w for w in words_of(leaf) if w.get('off') is not None]
        if not ws:
            continue
        rs = [sorted(r, key=lambda w: w['x0']) for r in T.cluster_rows(ws, 16.0)]
        firsts = sorted(r[0]['x0'] for r in rs if len(r) >= 3)
        left0 = firsts[len(firsts) // 4] if firsts else 0
        # right-column start: the most common x0 of a word that follows a gap of at least 40 px, between left0+560 and left0+900
        starts = collections.Counter()
        for r in rs:
            for a, b in zip(r, r[1:]):
                if b['x0'] - a['x1'] >= 40 and left0 + 560 <= b['x0'] <= left0 + 900:
                    starts[int(b['x0'] // 12)] += 1
        R0 = None
        if starts:
            k, c = starts.most_common(1)[0]
            if c >= 5:
                R0 = k * 12 + 6
        para = []                      # run-in paragraph (special duty ...)
        for r in rs:
            txt = ' '.join(w['w'] for w in r)
            if not started:
                if re.match(start_rx, txt):
                    started = True
                    ctx['rk'] = 'PARTICIPANTS.'
                continue
            if re.match(r'^\d{1,3}\s+MAINE\s+AT\s+GETT', txt) or re.match(r'(?i)^[A-Z\)\' ]*\s*(?:REGIMENT|BATTERY|BATTALION|CAVALRY)\s+PARTICIPANTS\W*\d*$', txt) or re.match(r'^\d{1,3}$', txt) or re.match(r'(?i)^MAINE\s+AT\s+GETT', txt) or re.match(r'(?i)^[A-Z\' ]*(?:REGIMENT|BATTERY|BATTALION|CAVALRY)\s+PARTICIPANTS', txt) \
                    or re.match(r"(?i)^(?:hall.?s|stevens.?|dow.?s)\s+(?:battery\s+)?participants", txt):
                continue
            if STOP_RX.match(txt) and not txt.startswith('Note') or (txt.startswith('Note') and len(txt) > 5):
                stopped = True
                break
            if re.match(r'(?i)^(?:PARTICIPANTS\W*|Present\s+for\s+Duty\W*|\(including.*)$', txt):
                continue
            m = COMPANY_RX.match(txt)
            if m:
                ctx['co'], ctx['sec'] = m.group(1), ''
                para = []
                continue
            if re.match(r'(?i)^(?:Company|Co\.)\s+\S{1,2}\W*$', txt):
                notes.append({'leaf': leaf, 'company heading not read': txt})
                continue
            if re.match(r'(?i)^FIELD,?\s+STAFF', txt):
                ctx['co'], ctx['sec'] = 'FS', txt
                continue
            sec = None
            t1 = re.sub(r'[^A-Za-z ]', '', txt).strip()
            for rx, lab in SECTION_RX:
                if rx.match(t1) and len(r) <= 2 and r[0]['x0'] > left0 + 150:
                    sec = lab or txt
            if sec:
                ctx['sec'] = sec
                para = []
                continue
            if re.match(r'(?i)^(?:On\s+Special\s+Duty|Detached\s+Service|Present\s+for\s+Duty|\(including)', txt) or para:
                para.append(r)
                continue
            for cell in split_columns(r, R0):
                ents, bad = parse_cell_line(cell)
                for e in ents:
                    rows.append({'leaf': leaf, 'co': ctx['co'], 'rk': ' '.join(x for x in (ctx['rk'], ctx['sec']) if x), 'entry': e})
                for b in bad:
                    bad_lines.append({'leaf': leaf, 'text': b[:100]})
        if para:
            notes.append({'leaf': leaf, 'paragraph lines not parsed': len(para), 'first': ' '.join(w['w'] for w in para[0])[:90]})
    return rows, bad_lines, notes
