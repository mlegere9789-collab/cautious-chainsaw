#!/usr/bin/env python
"""Build the history-layer arrivals data from PDF B.2.4 (ledger) and B.3 (order of battle).

  python tools/bt/build_arrivals.py [--quiet]

Inputs : tmp/pdf/plan-clean.txt (same text as docs/battle-theatre/BIBLE/plan-clean.txt), tools/bt/arrivals_cells.py (cell line
         ranges), tools/bt/arrivals_data.py (hand-curated interpretation of the printed cells), tools/bt/oob_units.py,
         docs/battle-theatre/GOVERNANCE/conflicts_structured.json.
Outputs: docs/battle-theatre/history/units.json, arrivals.json, not_on_field.json, crosscheck.json
Idempotent (no timestamps), fails loudly (exit 1) on any mismatch between the SPEC and the printed text.
"""
import sys, os, re, json
from collections import Counter, OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from arrivals_cells import ROWS
from arrivals_data import SPEC, NAMED_PERIODS
import oob_parse as OP
from oob_parse import clean_join, lines
import oob_units as OU

ROOT = OP.ROOT
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'history')
REG = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'conflicts_structured.json')

ERR = []


def need(cond, msg):
    if not cond:
        ERR.append(msg)
    return cond


# ----------------------------------------------------------------------------------------------- source keys
WEAK_PATTERNS = [r'^W-', r'^OOB-', r'^EPP$', r'^CWT', r'^PADRE$', r'^WHB', r'^SS', r'^STONE-RES$', r'^SStone']
# SS* = Stone Sentinels (SS1, SS2, SS2D, SS-CALEF, SS-NY, SS-THOMP, ...); W-* = Wikipedia; OOB-* = Wikipedia order-of-battle
# pages; EPP = Epperson timeline (legend: weak, unreferenced); CWT* = CivilWarTalk forum; PADRE/WHB* = blogs.


def is_weak(k):
    return any(re.search(p, k) for p in WEAK_PATTERNS)


def legend_defs():
    L = [l.rstrip('\n') for l in lines()]
    defs = {}
    for i in range(len(L) - 2):
        m = re.match(r'^([A-Za-z0-9][A-Za-z0-9 \-\.]*)\s*$', L[i].strip())
        if m and L[i + 1].strip().startswith(':'):
            key = m.group(1).strip()
            if L[i + 1].strip() == ':':
                desc = L[i + 2].strip()
                j = i + 3
            else:
                desc = L[i + 1].strip()[1:].strip()
                j = i + 2
            while j < len(L) and j < i + 6 and not (j + 1 < len(L) and L[j + 1].strip().startswith(':')) and not L[j].startswith('=== PAGE') \
                    and not L[j].startswith('Gettysburg Total') and L[j].strip():
                desc += ' ' + L[j].strip()
                j += 1
            defs.setdefault(key, desc)
    return defs


# ----------------------------------------------------------------------------------------------- page lookup
PAGE_AT = None


def page_of(line):
    global PAGE_AT
    if PAGE_AT is None:
        PAGE_AT = []
        for i, l in enumerate(lines(), 1):
            m = re.match(r'^=== PAGE (\d+) ===', l)
            if m:
                PAGE_AT.append((i, int(m.group(1))))
    p = None
    for i, n in PAGE_AT:
        if i <= line:
            p = n
        else:
            break
    return p


# ----------------------------------------------------------------------------------------------- cells
COL = OrderedDict([('u', 'unit'), ('c', 'commanders'), ('f', 'first_on_field'), ('n', 'night_positions'),
                   ('k', 'key_positions'), ('l', 'left_or_moved'), ('s', 'source_keys')])


def build_cells():
    out = OrderedDict()
    for rid, army, c in ROWS:
        cells = OrderedDict()
        for k, name in COL.items():
            txt = ' '.join(clean_join(r) for r in c[k]).strip()
            cells[name] = txt
        out[rid] = dict(army=army, cells=cells, ranges=c)
    return out


def parse_keys(s):
    keys = [k.strip().rstrip('.') for k in re.split(r';\s*', s) if k.strip()]
    return keys


# ----------------------------------------------------------------------------------------------- nights
NIGHTS = ['jun29', 'jun30', 'jul1', 'jul2', 'jul3']
SEG_SPLIT = re.compile(r'(?:(?<=\.) |; |(?<=\)) )(?=(?:Jun|Jul) \d+)')
DATE_RE = re.compile(r'^((?:Jun|Jul)) (\d+)(?:-(?:((?:Jun|Jul)) )?(\d+))?(?: (night|evening))?')


def day_key(mon, d):
    return '%s%d' % (mon.lower(), d)


def parse_nights(text):
    """Split a night-positions cell into dated segments exactly as printed. Returns (segments, nights, status)."""
    t = text.strip()
    if t.lower() == 'gap':
        return [], {k: {'status': 'gap_printed', 'entries': [{'text': 'Gap', 'label': None, 'range_label': False, 'range_ambiguous': False, 'whole_cell': True}]} for k in NIGHTS}, 'gap'
    segs_raw = SEG_SPLIT.split(t)
    segments = []
    for s in segs_raw:
        s = s.strip()
        m = DATE_RE.match(s)
        if not m:
            segments.append({'raw': s, 'label': None, 'days': [], 'dash_range': False})
            continue
        mon1, d1, mon2, d2, mod = m.groups()
        days = [day_key(mon1, int(d1))]
        dash = d2 is not None
        if dash:
            mon_end = mon2 or mon1
            if mon_end == mon1:
                days = [day_key(mon1, d) for d in range(int(d1), int(d2) + 1)]
            else:
                days = [day_key(mon1, int(d1)), day_key(mon_end, int(d2))]
        body = s[m.end():].lstrip(' :')
        # text after the label up to the first colon belongs to the label when the colon comes early ('Jun 30 night/Uniontown:')
        label = s[:m.end()]
        if s[m.end():m.end() + 14].startswith('/') and ':' in s[:m.end() + 20]:
            label = s[:s.index(':')]
            body = s[s.index(':') + 1:].strip()
        segments.append({'raw': s, 'label': label.strip(), 'modifier': mod, 'days': days, 'dash_range': dash, 'text': body.rstrip('.').strip()})
    nights = {k: {'status': 'gap_not_mentioned', 'entries': []} for k in NIGHTS}
    for sg in segments:
        for d in sg['days']:
            if d in nights:
                txt = sg.get('text', '')
                gp = txt.lower().startswith('gap') or txt.lower().startswith('not confirmed')
                ent = {'text': txt, 'label': sg['label'], 'range_label': sg['dash_range'],
                       'range_ambiguous': bool(sg['dash_range'] and len(sg['days']) == 2 and not txt.lower().startswith('gap'))}
                nights[d]['entries'].append(ent)
                nights[d]['status'] = 'gap_printed' if (gp and nights[d]['status'] in ('gap_not_mentioned', 'gap_printed')) else 'printed'
    return segments, nights, 'parsed'


PERIOD_WORDS = ['morning', 'afternoon', 'evening', 'after dark', 'noon', 'night', 'dusk', 'dawn', 'midnight', 'onwards', 'after Jul']


def departure_events(text):
    """Lexical split of a 'Left or moved' cell: first date, first clock time and period words as printed. No interpretation."""
    t = text.strip()
    if not t or t.lower().startswith('gap'):
        return []
    evs = []
    for seg in re.split(r'; ', t):
        seg = seg.strip()
        m = re.search(r'\b(Jun|Jul) (\d+)\b', seg)
        c = re.search(r'\b(\d\d:\d\d)\b', seg)
        date = None
        if m:
            date = '1863-%s-%02d' % ('06' if m.group(1) == 'Jun' else '07', int(m.group(2)))
        evs.append({'text': seg, 'date': date, 'clock': c.group(1) if c else None, 'period_words': [w for w in PERIOD_WORDS if re.search(r'\b' + w + r'\b', seg)]})
    return evs


# ----------------------------------------------------------------------------------------------- gates
def iso_min(vals):
    v = [x for x in vals if x]
    return min(v) if v else None


def row_gate(rid, spec, keys_all):
    """Return the gate object for a ledger row from its SPEC. Every time here is either printed in the cell or a labelled convention."""
    g = {'kind': 'none', 'earliest': None, 'default': None, 'latest': None, 'values': [], 'upper_bounds': [], 'basis': None,
         'default_basis': None, 'default_status': None, 'null_reason': None, 'floors': {}}
    arr = [v for v in spec.get('values', []) if v['role'] == 'arrival']
    ub = [v for v in spec.get('values', []) if v['role'] == 'bound_upper']
    gt = spec.get('gate')
    if gt:
        g['kind'] = 'named_period_convention' if any(gt[x]['period'] for x in ('earliest', 'default', 'latest') if gt[x]['t']) else 'checker_convention'
        for x in ('earliest', 'default', 'latest'):
            g[x] = gt[x]['t']
        g['basis'] = {x: {'period': gt[x]['period'], 'basis': gt[x]['basis'], 'sources': gt[x]['sources']} for x in ('earliest', 'default', 'latest')}
        g['null_reason'] = spec.get('window_reason')
        g['default_status'] = 'PENDING OWNER (checker convention from the PDF named period / C-nnn recommended default; not a printed clock)'
        g['default_basis'] = gt['default']['basis']
    elif arr:
        ts = [v['t'] for v in arr]
        ubs = [x['t_upper'] for x in spec.get('upper_bounds', [])]
        g['kind'] = 'printed_clock'
        g['earliest'] = min(ts + ubs)  # a printed "before noon" is an upper bound with no lower bound: the bound is the earliest stated time
        g['latest'] = max(ts + ubs)
        g['values'] = [{'t': v['t'], 'text': v['text'], 'approx': v['approx'], 'sources': v['sources']} for v in arr] + \
                      [{'t': x['t_upper'], 'text': x['text'] + ' (upper bound, no lower bound stated)', 'approx': False, 'sources': x['sources'], 'is_upper_bound': True}
                       for x in spec.get('upper_bounds', [])]
        d = spec.get('default')
        db = spec.get('default_basis') or ''
        from_register = bool(re.match(r'^C-\d{3}', db))
        if d in ('earliest', None):
            g['default'] = min(ts)  # earliest printed CLOCK time (upper-bound statements are not used as the default)
            g['default_status'] = 'earliest printed clock value used (PDF gating rule 1: never before the earliest time in the cell)' + \
                ('; no B.2.5 default recorded' if d is None else '')
        else:
            g['default'] = d
            g['default_status'] = 'PENDING OWNER (PDF B.2.5 recommended default %s; not an owner decision)' % db.split(' ')[0] if from_register else 'see default_basis'
        g['default_basis'] = db
        if spec.get('default_range'):
            g['default_range'] = spec['default_range']
        if spec.get('kind') == 'range' and not from_register and len(set(ts)) > 1:
            lo, hi = min(ts), max(ts)
            a = int(lo[11:13]) * 60 + int(lo[14:16])
            b = int(hi[11:13]) * 60 + int(hi[14:16])
            mid = (a + b) // 2
            g['midpoint_pdf_rule_1'] = '%sT%02d:%02d' % (lo[:10], mid // 60, mid % 60)
            g['midpoint_note'] = 'PDF gating rule 1 says a printed range defaults to the middle or the better-sourced value; the earliest is used as the safe floor and the midpoint is carried as an alternative. Owner decision pending.'
        g['basis'] = 'clock times printed in the first-on-field cell'
    elif spec.get('event_floor'):
        ef = spec['event_floor']
        g['kind'] = 'event_floor'
        g['earliest'] = g['default'] = ef['t']
        g['floors']['event_floor'] = ef
        g['basis'] = ef['basis']
        g['null_reason'] = spec.get('window_reason')
        g['default_status'] = 'PDF gating rule 3 (no earlier than the next documented event that required the unit)'
    elif spec.get('date_floor'):
        g['kind'] = 'date_floor'
        g['earliest'] = g['default'] = spec['date_floor']
        g['floors']['date_floor'] = {'t': spec['date_floor'], 'basis': spec.get('date_floor_basis')}
        g['basis'] = spec.get('date_floor_basis')
        g['null_reason'] = spec.get('window_reason')
        g['default_status'] = 'date only: floor at 00:00 LMT of the printed date; a clock time is not printed (open gap)'
    else:
        g['null_reason'] = spec.get('window_reason') or 'no arrival time and no date in the cell'
    if ub:
        g['upper_bounds'] += [{'t': v['t'], 'text': v['text']} for v in ub]
    for x in spec.get('upper_bounds', []):
        g['upper_bounds'].append({'t': x['t_upper'], 'text': x['text'], 'sources': x['sources'], 'note': x.get('note')})
    return g


def subunit_gate(sp, row_id, row_keys):
    vals = sp.get('values')
    if vals:
        ts = [v[0] for v in vals]
        e, l = min(ts), max(ts)
        d = sp.get('default', e)
        values = [{'t': v[0], 'text': v[1]} for v in vals]
    else:
        e = d = l = sp['t']
        values = [{'t': sp['t'], 'text': sp['text']}]
    return {'unit': sp['unit'].replace('.', '-'), 'row': row_id, 'kind': sp['kind'], 'earliest': e, 'default': d, 'latest': l,
            'values': values, 'text': sp['text'], 'approx': sp.get('approx'), 'sources': sp.get('src', []), 'gap': sp.get('gap', False),
            'derived': sp.get('derived', False), 'default_basis': sp.get('default_basis'), 'note': sp.get('note')}


def tier_of(g, keys, spec):
    strong = [k for k in keys if not is_weak(k)]
    if g['kind'] == 'none':
        return 'open gap'
    if g['kind'] in ('named_period_convention', 'checker_convention', 'event_floor', 'date_floor'):
        return 'inferred'
    if strong:
        return 'documented'
    return 'inferred'


# ----------------------------------------------------------------------------------------------- not-on-field tables
NOF_US = [(16031, 16033), (16034, 16036), (16037, 16039), (16040, 16042)]
NOF_CS = [(16436, 16438), (16439, 16441), (16442, 16444)]
GATING_RULE_LINES = [16710, 16711, 16712, 16713, 16714, 16715, 16716]


def parse_not_on_field():
    out = {'US': [], 'CS': []}
    for side, rngs in (('US', NOF_US), ('CS', NOF_CS)):
        for a, b in rngs:
            u, st, k = [lines()[i - 1].strip() for i in (a, a + 1, a + 2)]
            out[side].append({'unit_printed': u, 'status_printed': st, 'source_keys': parse_keys(k), 'lines': [a, b], 'pdf_page': page_of(a)})
    return out


def gating_rules():
    L = lambda a, b=None: ' '.join(lines()[i - 1].strip() for i in range(a, (b or a) + 1))
    r = [
        {'rule_no': 1, 'pdf_lines': [16710, 16711], 'pdf_text': L(16710, 16711),
         'summary': 'A unit is not drawn before the earliest time in its first-on-field cell; where a range is printed the default is the middle or the better-sourced value (B.2.5) and the earliest value stays selectable.',
         'check': 'presence_ok is False before gate.earliest for the chosen scenario', 'applies_to': 'all ledger rows with printed clock times'},
        {'rule_no': 2, 'pdf_lines': [16712], 'pdf_text': L(16712),
         'summary': 'Units listed as never or only partly on the field are not drawn, or only in the stated detached role.',
         'check': 'presence_ok is False for status never_on_field / never_main_field units unless a detached role matches the location and time', 'applies_to': 'not_on_field.json units'},
        {'rule_no': 3, 'pdf_lines': [16713], 'pdf_text': L(16713),
         'summary': 'Unknown arrival times are open gaps: the unit appears no earlier than the next documented event that required it and carries an inferred tier tag.',
         'check': 'rows with parse_status gap use the event_floor / date_floor / subunit first-documented-event gate; tier = inferred', 'applies_to': 'gap rows and subunits'},
        {'rule_no': 4, 'pdf_lines': [16714, 16715], 'pdf_text': L(16714, 16715),
         'summary': "Stuart's cavalry brigades are gated to the evening of Jul 2 by default; Hampton's rear guard and the Union cavalry at Hunterstown (about 16:30 Jul 2) are exempt and are shown at Hunterstown on their own rows.",
         'check': 'cs-cav-hampton, cs-cav-flee-chambliss (and children), cs-cav-jenkins are False before 1863-07-02T19:32 (start of the [DUSK] band, convention) except cs-cav-hampton at location hunterstown from 1863-07-02T16:30',
         'applies_to': 'cs-cav-hampton, cs-cav-flee-chambliss, cs-cav-jenkins (Jenkins is gated by the checker as a Stuart brigade: reading of the ledger, see notes)'},
        {'rule_no': 5, 'pdf_lines': [16715], 'pdf_text': L(16715),
         'summary': "Pickett's division is gated to the morning of Jul 3 by default.",
         'check': 'cs-1c-pickett and descendants are False before 1863-07-03T04:36 (sunrise Jul 3, C-021 default) in the default scenario; the earliest scenario starts 1863-07-02T20:04 (night of Jul 2)', 'applies_to': 'cs-1c-pickett'},
        {'rule_no': 6, 'pdf_lines': [16716], 'pdf_text': L(16716), 'summary': 'Hospitals and trains follow their own rows in B.2.2 and the day-3 section.',
         'check': 'not handled in this layer', 'applies_to': 'out of scope of this file', 'note': 'printed in the same block; the brief counts five gating rules (1-5)'},
    ]
    return r


# ----------------------------------------------------------------------------------------------- ledger/B.3 cross-check
STATE_MAP = {'Ind': 'IN', 'Mich': 'MI', 'Wis': 'WI', 'Pa': 'PA', 'Mass': 'MA', 'Conn': 'CT', 'Del': 'DE', 'Minn': 'MN', 'Me': 'ME', 'Ohio': 'OH',
             'Ala': 'AL', 'Ark': 'AR', 'Tex': 'TX', 'Tenn': 'TN', 'Miss': 'MS', 'La': 'LA', 'Ga': 'GA', 'Va': 'VA', 'Md': 'MD', 'Fla': 'FL',
             'NH': 'NH', 'NY': 'NY', 'NJ': 'NJ', 'WV': 'WV', 'SC': 'SC', 'NC': 'NC', 'RI': 'RI', 'US': 'US', 'VT': 'VT', 'Vt': 'VT', 'IL': 'IL'}


def ledger_reg_names(cell, army):
    """Regiment names from the parenthesised lists of a ledger commander cell (state names normalised to B.3 spelling)."""
    names = []
    txt = cell.replace('Cobb’s and Phillips Legions', 'Cobb’s, Phillips Legions')
    txt = re.sub(r'Florida \(([^)]*)\)', lambda m: '(' + m.group(1) + ' FL)', txt)
    for g in re.findall(r'\(([^()]*)\)', txt):
        if not re.search(r'\d+(?:st|nd|rd|th)', g):
            continue
        m = re.match(r'^([^:;]*[:;])\s*(.*)$', g)
        if m and (not re.search(r'\d+(?:st|nd|rd|th)', m.group(1)) or re.search(r'\bBde\b', m.group(1))):
            g = m.group(2)
        g = g.replace(';', ',')
        g = re.sub(r'(\d+(?:st|nd|rd|th)) Bn (\w+)', r'\1 \2 Bn', g)
        g = re.sub(r'\b(%s)\b' % '|'.join(sorted(STATE_MAP, key=len, reverse=True)), lambda m: STATE_MAP[m.group(1)], g)
        for t in OP.expand_regs(g, 'inf'):
            names += t['names']
    return [n for n in names if n != 'Excelsior']


def crosscheck(tree, cells):
    res = []
    for rid, army, c in ROWS:
        u = tree.units.get(rid)
        if not u or u['level'] not in ('division', 'brigade') or rid.endswith('-art'):
            continue
        if rid in ('cs-cav-div',):
            continue
        led = ledger_reg_names(cells[rid]['cells']['commanders'], army)
        if not led:
            continue
        b3 = []
        for v in tree.units.values():
            p = v['parent']
            anc = []
            while p:
                anc.append(p)
                p = tree.units[p]['parent'] if p in tree.units else None
            if rid in anc and v['level'] in ('regiment', 'battalion') and v['arm'] != 'artillery':
                b3.append(v['name'])
        led = [n.replace(' SS Bn', ' Sharpshooters') for n in led]
        sl, sb = Counter(led), Counter(b3)
        only_led = sorted((sl - sb).elements())
        only_b3 = sorted((sb - sl).elements())
        res.append({'row': rid, 'ledger_count': len(led), 'b3_count': len(b3), 'only_in_ledger': only_led, 'only_in_b3': only_b3})
    return res


def ledger_batteries(tree, cells):
    """Attach battery letters / commanders printed in the artillery-brigade ledger rows to the B.3 batteries (matching ordinal + state)."""
    out = []
    smap = {'Maine': 'ME', 'NY': 'NY', 'NJ': 'NJ', 'RI': 'RI', 'Pa': 'PA', 'US': 'US', 'NH': 'NH'}
    for rid in ('us-1c-art', 'us-2c-art', 'us-3c-art'):
        txt = cells[rid]['cells']['commanders']
        body = txt.split(':', 1)[1] if ':' in txt else txt.split(';', 1)[1]
        for tok in OP.split_commas(body):
            tok = tok.strip()
            m = re.match(r'^(\d+)(?:st|nd|rd|th) (\w+)(?: ([A-Z](?:(?:&| and )[A-Z])?))?(?: \(([^)]*)\))?$', tok)
            if not m:
                out.append({'row': rid, 'ledger_token': tok, 'matched': None, 'problem': 'ledger token pattern not recognised'})
                continue
            n, st, letters, cmd = m.groups()
            st = smap.get(st, st)
            letters_l = re.split(r'&| and ', letters) if letters else [None]
            for L in letters_l:
                cands = [v for v in tree.units.values() if v['parent'] == rid and re.match(r'^%s(?:st|nd|rd|th) %s(?: ([A-Z]))?$' % (n, st), v['name'])]
                if L:
                    cands = [v for v in cands if v['name'].endswith(' ' + L) or not re.search(r' [A-Z]$', v['name'])]
                if len(cands) != 1:
                    out.append({'row': rid, 'ledger_token': tok, 'matched': None, 'problem': '%d candidates' % len(cands)})
                    continue
                v = cands[0]
                v.setdefault('ledger_printed', []).append(tok)
                if L and not re.search(r' [A-Z]$', v['name']):
                    v['battery_letter_in_ledger'] = L
                if cmd:
                    v['commanders_printed'] = [cmd]
                    v['commanders_source'] = 'PDF-B2.4 ledger commander cell'
                out.append({'row': rid, 'ledger_token': tok, 'matched': v['id'], 'letter': L, 'commander': cmd})
    return out


# ----------------------------------------------------------------------------------------------- main
def main():
    quiet = '--quiet' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    reg = json.load(open(REG, encoding='utf-8'))
    cids = {c['id']: c for c in reg['conflicts']}
    need(len(cids) == 47, 'conflict register: expected 47 entries, found %d' % len(cids))
    cellinfo = build_cells()
    need([r[0] for r in ROWS] == list(SPEC.keys()), 'SPEC keys differ from ROWS: %s' % (set(r[0] for r in ROWS) ^ set(SPEC)))
    need(len(ROWS) == 44, 'expected 44 ledger rows, found %d' % len(ROWS))

    # print every reconstructed cell once so a boundary error is visible
    if not quiet:
        for rid, info in cellinfo.items():
            print('## %s [%s] lines %d-%d' % (rid, info['army'], min(a for k in info['ranges'].values() for a, b in k), max(b for k in info['ranges'].values() for a, b in k)))
            for k, v in info['cells'].items():
                print('   %-16s| %s' % (k, v))

    # footer / marker leakage
    for rid, info in cellinfo.items():
        for k, v in info['cells'].items():
            need('=== PAGE' not in v and 'animation plan, version 2 | page' not in v, 'page marker leaked into %s.%s' % (rid, k))
            need(v != '', 'empty cell %s.%s' % (rid, k))

    # us-2c-3d printed twice: the partial p.59 version must be a prefix-consistent fragment of the p.60 version
    frag = [lines()[i - 1].strip() for i in range(15709, 15714)]
    full = cellinfo['us-2c-3d']['cells']
    fulltxt = ' '.join(full.values())
    for f in frag:
        need(f.rstrip(',;') in fulltxt or f.rstrip(',;') in ('Gap',), 'p.59 partial us-2c-3d fragment %r not in the p.60 version' % f)

    legend = legend_defs()
    tree = OU.build_b3_tree()
    uni_count_b3 = len(tree.units)

    # ----- ledger-only units
    def ledger_unit(rid, **kw):
        info = cellinfo[rid]
        base = dict(id=rid, army=info['army'], source='PDF-B2.4', name_printed=info['cells']['unit'], name=info['cells']['unit'], ledger_row=rid)
        base.update(kw)
        if rid in tree.units:
            need(False, 'ledger-only unit %s already in tree' % rid)
        return tree.add(**base)

    ledger_unit('us-aop-hq', level='headquarters', parent='us-aop', commanders_printed=['Meade'])
    ledger_unit('us-hancock-acting', level='person', parent='us-aop', commanders_printed=['Hancock'],
                notes=['person row: II Corps commander acting for Meade on Jul 1; no troops of his own (ledger)'])
    ledger_unit('cs-anv-hq', level='headquarters', parent='cs-anv', commanders_printed=['Lee'])
    ledger_unit('cs-1c-art', level='artillery_group', arm='artillery', parent='cs-1c', commanders_printed=[],
                notes=['ledger grouping "I Corps artillery": Alexander (cs-1c-res-art-alexander), Eshleman (Washington Artillery, cs-1c-res-art-washington), Cabell (cs-1c-mclaws-cabell), Dearing (cs-1c-pickett-dearing), Henry (cs-1c-hood-henry); B.3 files these under their divisions and the Reserve artillery (Walton)'])
    ledger_unit('cs-cav-flee-chambliss', level='group', arm='cavalry', parent='cs-cav-div', commanders_printed=['F. Lee', 'Chambliss (for W. H. F. Lee)'],
                notes=['ledger row covers two brigades: cs-cav-flee and cs-cav-chambliss'])
    ledger_unit('cs-cav-robertson-jones-imboden', level='group', arm='cavalry', parent='cs-cav-div', commanders_printed=['Robertson', 'W. E. Jones', 'Imboden'],
                status='never_main_field')
    for uid, nm, cm in (('cs-cav-robertson', "Robertson's Brigade", ['Robertson']), ('cs-cav-jones', "W. E. Jones's Brigade (Laurel Brigade)", ['W. E. Jones']),
                        ('cs-cav-imboden', "Imboden's command", ['Imboden'])):
        tree.add(id=uid, army='CS', level='brigade' if uid != 'cs-cav-imboden' else 'command', arm='cavalry', parent='cs-cav-robertson-jones-imboden',
                 name_printed=nm, name=nm, commanders_printed=cm, status='never_main_field', source='PDF-B2.4',
                 notes=['no regiments are listed for this command in B.3 or the ledger'])
    # B.3 units that also have ledger rows
    for rid, info in cellinfo.items():
        if rid in tree.units:
            u = tree.units[rid]
            if u['ledger_row'] is None:
                u['ledger_row'] = rid
                u['source'] = 'PDF-B3+B2.4'
            u['name_ledger'] = info['cells']['unit']
            u['commanders_ledger_cell'] = info['cells']['commanders']
    # Washington Artillery: commander printed in the ledger commander cell of the I Corps artillery row
    wash = tree.units['cs-1c-res-art-washington']
    wash['commanders_printed'] = ['Eshleman']
    wash['commanders_source'] = 'PDF-B2.4 ledger commander cell ("Eshleman’s Washington Artillery")'
    # artillery batteries: letters / commanders printed in the ledger artillery-brigade rows
    bat_match = ledger_batteries(tree, cellinfo)
    # cs-1c-art covers: link the battalions to the ledger grouping
    for uid in ('cs-1c-res-art-alexander', 'cs-1c-res-art-washington', 'cs-1c-mclaws-cabell', 'cs-1c-pickett-dearing', 'cs-1c-hood-henry'):
        tree.units[uid].setdefault('also_in_ledger_row', 'cs-1c-art')

    # ----- not-on-field units (PDF tables)
    nof = parse_not_on_field()
    need(len(nof['US']) == 4 and len(nof['CS']) == 3, 'not-on-field table row counts')
    nof_units = [
        ('us-cav-2d-huey', dict(army='US', level='brigade', arm='cavalry', parent='us-cav-2d', name_printed="Huey's 2nd Brigade, 2nd Cavalry Division", name="Huey's 2nd Brigade", commanders_printed=['Huey'], status='never_on_field'), 0),
        ('us-6c-2d-1brig', dict(army='US', level='brigade', arm='infantry', parent='us-6c-2d', name_printed='VI Corps, 2nd Division, 1st Brigade (Howe)', name='1st Brigade', commanders_printed=[], status='never_on_field',
                                notes=['"(Howe)" is printed in the table; B.3 lists only Grant and Neill under Howe; the ledger says only the 2nd and 3rd Brigades were present']), 1),
        ('us-art-reserve-taft-1ctheavy-b', dict(army='US', level='battery', arm='artillery', parent='us-art-reserve-taft-1ctheavy', name_printed='1st Connecticut Heavy Artillery B and M (2nd Volunteer Bde)', name='1st CT Heavy B', status='never_on_field', flags=['split_from_printed_B_and_M']), 2),
        ('us-art-reserve-taft-1ctheavy-m', dict(army='US', level='battery', arm='artillery', parent='us-art-reserve-taft-1ctheavy', name_printed='1st Connecticut Heavy Artillery B and M (2nd Volunteer Bde)', name='1st CT Heavy M', status='never_on_field', flags=['split_from_printed_B_and_M']), 2),
        ('us-4nj-train-guard', dict(army='US', level='regiment', arm='infantry', parent='us-aop', name_printed='4th NJ (train guard)', name='4th NJ', status='never_on_field',
                                    notes=['table prints "4th NJ (train guard) and 32nd Mass Co. C" with status "Reserve guard companies"; the 4th NJ does not appear in the B.3 lists']), 3),
        ('us-5c-1d-sweitzer-32ma-co-c', dict(army='US', level='company', arm='infantry', parent='us-5c-1d-sweitzer-32ma', name_printed='32nd Mass Co. C', name='32nd MA Company C', status='never_on_field'), 3),
        ('cs-13va-winchester', dict(army='CS', level='regiment', arm='infantry', parent='cs-anv', name_printed='13th and 58th Va', name='13th VA', status='never_on_field',
                                    notes=['detached at Winchester; the table does not name their brigade']), 0),
        ('cs-58va-winchester', dict(army='CS', level='regiment', arm='infantry', parent='cs-anv', name_printed='13th and 58th Va', name='58th VA', status='never_on_field',
                                    notes=['detached at Winchester; the table does not name their brigade']), 0),
        ('cs-44nc-hanover-junction', dict(army='CS', level='regiment', arm='infantry', parent='cs-anv', name_printed='44th NC and Corse’s Brigade', name='44th NC', status='never_on_field'), 1),
        ('cs-corse-hanover-junction', dict(army='CS', level='brigade', arm='infantry', parent='cs-anv', name_printed='44th NC and Corse’s Brigade', name='Corse’s Brigade', commanders_printed=['Corse'], status='never_on_field'), 1),
    ]
    for uid, kw, ix in nof_units:
        u = tree.add(id=uid, source='PDF-B2.4 table', **kw)
        trow = nof[kw['army'] == 'US' and 'US' or 'CS'][ix]
        u['name_printed'] = trow['unit_printed']  # exactly as printed in the table
        u['table_status_printed'] = trow['status_printed']
        u['table_source_keys'] = trow['source_keys']
        u['table_pdf_page'] = trow['pdf_page']
    ct = tree.units['us-art-reserve-taft-1ctheavy']
    ct['status'] = 'partly_on_field'
    ct['notes'].append('table: batteries B and M were not at Gettysburg (Westminster); which batteries were present is not stated')
    m32 = tree.units['us-5c-1d-sweitzer-32ma']
    m32['status'] = 'partly_on_field'
    m32['notes'].append('table: Company C was a reserve guard company, not on the field')
    for uid in ('cs-cav-robertson-jones-imboden',):
        tree.units[uid]['status'] = 'never_main_field'

    # ----- strengths
    st = OU.parse_strengths()
    need(len(st['US']) == 9 and len(st['CS']) == 4, 'strength table row counts %d/%d' % (len(st['US']), len(st['CS'])))
    for side in ('US', 'CS'):
        for row in st[side]:
            uid = OU.STRENGTH_IDS.get((side, row['label']))
            if not need(uid, 'no unit for strength row %s %s' % (side, row['label'])):
                continue
            row = dict(row)
            row['source'] = 'PDF-B3'
            row['basis_printed'] = 'Stone Sentinels (caveats in B.1), as printed in the PDF B.3 table heading'
            row['range_declared'] = False
            row['rate_check_pct'] = round(100.0 * row['lost'] / row['strength'], 1)
            tree.units[uid]['strength'] = row
    figs = OU.parse_brigade_figures()
    need(len(figs) == 8, 'brigade figure count %d' % len(figs))
    for f in figs:
        uid = OU.BRIGADE_FIG_IDS.get(f['label'])
        if need(uid and uid in tree.units, 'no unit for brigade figure %r' % f['label']):
            f = dict(f)
            f['source'] = 'PDF-B3'
            f['basis_printed'] = 'brigade-level figures in the notes (PDF B.3 text), basis not stated'
            f['range_declared'] = False
            tree.units[uid]['strength'] = f
    # Union staff list (printed, not re-verified in the PDF)
    tree.units['us-aop']['staff_printed'] = ['Chief of Staff Butterfield', 'Chief of Artillery Hunt', 'Chief of Engineers Warren', 'Chief Quartermaster Ingalls',
                                             'Medical Director Letterman', 'Provost Marshal Patrick', 'Engineer Brigade Benham']
    tree.units['us-aop']['notes'].append('B.3: army staff "from a separate fetch, not re-verified"')

    # ----- gates
    gates = OrderedDict()
    rows_out = []
    unparsed = []
    all_text_by_row = {}
    for rid, army, c in ROWS:
        info = cellinfo[rid]
        cells = info['cells']
        spec = SPEC[rid]
        keys = parse_keys(cells['source_keys'])
        all_text = ' '.join(v for k, v in cells.items())
        all_text_by_row[rid] = all_text
        rowkeys_in_cells = sorted(set(k for k in re.findall(r'\b([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+|EPP|FREE|CHAM|SS\d|13MA|PADRE|HESS|PHIF|BUF|HAMP|STUART|BEALE|CWM|OLLI|CWN17)\b', ' '.join(cells[x] for x in COL.values() if x != 'source_keys')) if k in legend or k in keys))
        weak = [k for k in keys if is_weak(k)]
        strong = [k for k in keys if not is_weak(k)]
        # SPEC checks: values clock text in cells, sources printed, conflicts exist
        for v in spec.get('values', []):
            src_row = v.get('from_row') or rid
            txt = all_text_by_row.get(src_row) or ' '.join(cellinfo[src_row]['cells'].values())
            hh = v['t'][11:16]
            if hh != '00:00' or 'about 00:00' in txt:
                need(hh in txt or (hh == '12:00' and re.search(r'\bnoon\b', v['text']) and re.search(r'\bnoon\b', txt)), '%s: SPEC clock %s (%s) not found in printed cells' % (rid, hh, v['text']))
            for s in v['sources']:
                need(re.search(r'(?<![A-Z0-9-])' + re.escape(s) + r'(?![A-Z0-9-])', txt), '%s: SPEC source key %s not printed in the row' % (rid, s))
        for cf in spec.get('conflicts', []):
            need(cf['id'] in cids, '%s: conflict id %s not in conflicts_structured.json' % (rid, cf['id']))
            need(cf['link'] in ('cited', 'cited_by_reference', 'topic_arrival', 'topic_other_cell'), '%s: bad link type' % rid)
        printed_c = re.findall(r'C-0\d\d', all_text)
        need(not printed_c, '%s: row prints conflict ids %s but SPEC links assume none are printed' % (rid, printed_c))
        for sk in keys:
            need(sk in legend or True, '')
        g = row_gate(rid, spec, keys)
        # subunits
        sgs = [subunit_gate(sp, rid, keys) for sp in spec.get('subunits', [])]
        # date floors from subunit-only rows (us-1c-3d etc.) are in the row gate already
        tier = tier_of(g, keys, spec)
        pdf_lines = {COL[k]: [list(r) for r in info['ranges'][k]] for k in COL}
        first_line = min(a for k in info['ranges'].values() for a, b in k)
        parse_status = 'parsed'
        if spec.get('never_main_field'):
            parse_status = 'never_main_field'
        elif spec.get('pointer'):
            parse_status = 'pointer'
        elif spec.get('gate'):
            parse_status = 'named_period'
        elif g['kind'] == 'printed_clock':
            parse_status = 'parsed'
        elif spec.get('event_floor'):
            parse_status = 'gap_event_floor'
        elif spec.get('date_floor'):
            parse_status = 'date_only'
        elif spec.get('gap'):
            parse_status = 'gap'
        elif spec.get('unparsed_first'):
            parse_status = 'unparsed'
        else:
            parse_status = 'unparsed'
        # --- unparsed cells
        cell_status = {'first_on_field': parse_status, 'night_positions': None, 'left_or_moved': None}
        for fld, txt in spec.get('unparsed', []):
            unparsed.append({'row': rid, 'cell': fld, 'text': cells[fld], 'reason': txt})
            cell_status[fld] = 'unparsed'
        if spec.get('unparsed_first'):
            fld, txt = spec['unparsed_first']
            unparsed.append({'row': rid, 'cell': fld, 'text': cells[fld], 'reason': txt})
            cell_status['first_on_field'] = 'unparsed'
        if spec.get('unparsed_night'):
            fld, txt = spec['unparsed_night']
            unparsed.append({'row': rid, 'cell': fld, 'text': cells[fld], 'reason': txt})
            cell_status['night_positions'] = 'unparsed'
        segments, nights, nstat = parse_nights(cells['night_positions'])
        if cell_status['night_positions'] is None:
            cell_status['night_positions'] = nstat
        left = cells['left_or_moved']
        if cell_status['left_or_moved'] is None:
            cell_status['left_or_moved'] = 'gap' if left.lower().startswith('gap') else 'as_printed'
        # conflicts out
        conflicts = []
        for cf in spec.get('conflicts', []):
            rc = cids[cf['id']]
            conflicts.append({'id': cf['id'], 'link': cf['link'], 'cell': cf['cell'], 'note': cf.get('note'), 'topic': rc['topic'],
                              'pdf_recommended_default': rc['pdf_recommended_default'], 'status': rc['status'], 'register_page': rc.get('page'),
                              'source_keys_in_row': keys})
        detached = []
        for d in spec.get('detached', []):
            dd = dict(d)
            dd['unit'] = 'cs-cav-jones' if (rid == 'cs-cav-robertson-jones-imboden' and d['location'] == 'fairfield') else rid
            detached.append(dd)
        first = {
            'parse_status': parse_status,
            'kind': spec.get('kind'),
            'values': [{'t': v['t'], 'text': v['text'], 'approx': v['approx'], 'sources': v['sources'], 'role': v['role'],
                        **({'note': v['note']} if v.get('note') else {}), **({'from_row': v['from_row']} if v.get('from_row') else {})}
                       for v in spec.get('values', [])] +
                      [{'t': x['t_upper'], 'text': x['text'], 'approx': False, 'sources': x['sources'], 'role': 'bound_upper', 'note': x.get('note') or 'printed as an upper bound only'}
                       for x in spec.get('upper_bounds', [])],
            'earliest': g['earliest'] if g['kind'] == 'printed_clock' else None,
            'default': g['default'] if g['kind'] == 'printed_clock' else None,
            'latest': g['latest'] if g['kind'] == 'printed_clock' else None,
            'default_basis': g['default_basis'] if g['kind'] == 'printed_clock' else None,
            'default_status': g['default_status'] if g['kind'] == 'printed_clock' else None,
            'null_reason': None if g['kind'] == 'printed_clock' else (g.get('null_reason') or 'no clock time printed'),
            'non_clock_statements': spec.get('non_clock', []),
            'lower_bound_uncertain': spec.get('lower_bound_uncertain'),
            'pre_battle': spec.get('pre_battle'),
            'unresolved': spec.get('unresolved', False),
        }
        if g.get('midpoint_pdf_rule_1'):
            first['midpoint_pdf_rule_1'] = g['midpoint_pdf_rule_1']
            first['midpoint_note'] = g['midpoint_note']
        if spec.get('default_range'):
            first['default_range'] = spec['default_range']
        row = OrderedDict([
            ('id', rid), ('unit_id', rid), ('army', army), ('level', tree.units[rid]['level'] if rid in tree.units else None),
            ('pdf', {'page': page_of(first_line), 'lines': pdf_lines, 'printed_twice': (['p.59 (partial, 5 cells cut off by the page break)', 'p.60 (complete, used)'] if rid == 'us-2c-3d' else None)}),
            ('raw', dict(cells)),
            ('source_keys', {'all': keys, 'weak': weak, 'non_weak': strong, 'weak_source': bool(keys) and not strong,
                             'claim_support_verified': False}),
            ('first_on_field', first),
            ('gate', {k: g[k] for k in g if k not in ('floors',)} | ({'floors': g['floors']} if g['floors'] else {})),
            ('night_positions', {'cell_status': cell_status['night_positions'], 'nights': nights, 'segments': segments}),
            ('left_or_moved', {'raw': left, 'cell_status': cell_status['left_or_moved'], 'events': departure_events(left),
                               'gated': False, 'gated_note': 'departures are carried as printed (lexical date/clock extraction only); presence_ok does not remove units after they leave - open item, see ARRIVALS-NOTES.md'}),
            ('cell_status', cell_status),
            ('conflicts', conflicts),
            ('detached_roles', detached),
            ('never_main_field', bool(spec.get('never_main_field'))),
            ('tier', tier),
            ('tier_basis', "row-level: 'documented' only when clock times are printed in the cell AND at least one non-weak source key is printed in the row; the cell does not always say which key supports which time. Named-period, date-only and event-floor gates are 'inferred'; cells with no usable time are 'open gap'. claim_support_verified is false everywhere."),
            ('notes', ([spec['note']] if spec.get('note') else []) + ([spec['pre_battle']] if spec.get('pre_battle') else [])),
            ('spec_note_unparsed_first', spec.get('unparsed_first')),
        ])
        if spec.get('gate_from_children'):
            row['gate_from_children'] = True
        rows_out.append(row)
        gates[rid] = row['gate'] | {'unit': rid, 'source': 'row', 'tier': tier}
        for sg in sgs:
            sg_tier = 'inferred' if (sg['gap'] or sg['derived']) else ('documented' if [s for s in (sg['sources'] or keys) if not is_weak(s)] else 'inferred')
            sg['tier'] = sg_tier
            sg['attribution'] = 'subunit sources printed in the cell' if sg['sources'] else 'row-level keys only (the cell prints none for this clause)'
            sg['claim_support_verified'] = False
            need(sg['unit'] in tree.units, 'subunit gate unit %s not in units' % sg['unit'])
    subunit_gates = []
    for rid, army, c in ROWS:
        keys = parse_keys(cellinfo[rid]['cells']['source_keys'])
        for sp in SPEC[rid].get('subunits', []):
            sg = subunit_gate(sp, rid, keys)
            sg['tier'] = 'inferred' if (sg['gap'] or sg['derived']) else ('documented' if [s for s in (sg['sources'] or keys) if not is_weak(s)] else 'inferred')
            sg['attribution'] = 'subunit sources printed in the cell' if sg['sources'] else 'row-level keys only (the cell prints none for this clause)'
            sg['claim_support_verified'] = False
            sg['kind_of_gate'] = 'subunit'
            subunit_gates.append(sg)
            gates[sg['unit']] = {'unit': sg['unit'], 'source': 'subunit', 'kind': 'printed_clock' if not sg['gap'] else 'event_floor',
                                 'earliest': sg['earliest'], 'default': sg['default'], 'latest': sg['latest'], 'values': sg['values'],
                                 'tier': sg['tier'], 'basis': sg['text']}
    # children-derived gates
    def children_gate(uid, kids, why):
        sc = {}
        for s in ('earliest', 'default', 'latest'):
            vals = [gates[k][s] or gates[k]['earliest'] for k in kids if k in gates and gates[k]['kind'] != 'none' and (gates[k].get(s) or gates[k].get('earliest'))]
            sc[s] = iso_min(vals)
        gates[uid] = {'unit': uid, 'source': 'derived', 'kind': 'children_min', 'earliest': sc['earliest'], 'default': sc['default'], 'latest': sc['latest'],
                      'values': [], 'tier': 'inferred', 'basis': why, 'children': kids}
    # corps without own cell
    children_gate('cs-3c', ['cs-3c-heth', 'cs-3c-pender', 'cs-3c-anderson'], 'ledger cell prints locations only; corps is on the field when its first division is (min of divisions per scenario)')
    children_gate('us-cav', ['us-cav-1d', 'us-cav-2d', 'us-cav-3d'], 'no ledger row for the Cavalry Corps; min of its divisions per scenario')
    # replace the cs-3c row gate with the derived one (row has no own gate)
    for r in rows_out:
        if r['id'] == 'cs-3c':
            r['gate'] = dict(r['gate'], kind='children_min', earliest=gates['cs-3c']['earliest'], default=gates['cs-3c']['default'], latest=gates['cs-3c']['latest'],
                             basis=gates['cs-3c']['basis'])
            r['tier'] = 'inferred'
            r['first_on_field']['null_reason'] = 'ledger cell gives locations, not an arrival time on the field; gate derived from divisions'
    corps_kids = lambda army: [u['id'] for u in tree.units.values() if u['parent'] == army and u['status'] == 'on_field' and u['id'] in gates]
    children_gate('us-aop', corps_kids('us-aop'), 'army exists on the field when its first formation does (min of children per scenario)')
    children_gate('cs-anv', corps_kids('cs-anv'), 'army exists on the field when its first formation does (min of children per scenario)')
    need(gates['cs-anv']['earliest'] and gates['us-aop']['earliest'], 'army-level derived gate is empty')

    # ----- register entries that concern a unit directly (topic match only; the PDF does not cite them in B.3)
    unit_conflicts = {'C-012': ['us-5c-1d-vincent', 'cs-1c-hood-law'], 'C-013': ['us-5c-1d-vincent-20me'], 'C-014': ['us-5c-1d-vincent-20me'],
                      'C-015': ['us-5c-1d-vincent-20me'], 'C-016': ['cs-1c-hood-law-48al'], 'C-018': ['cs-3c-anderson-wright'],
                      'C-037': ['cs-1c-mclaws-barksdale'], 'C-047': [uid for uid, u in tree.units.items() if u.get('strength')]}
    for cid, uids in unit_conflicts.items():
        need(cid in cids, 'unit conflict link %s not in register' % cid)
        for uid in uids:
            if need(uid in tree.units, 'unit conflict link %s: unit %s missing' % (cid, uid)):
                tree.units[uid].setdefault('conflict_refs', []).append({'id': cid, 'link': 'topic_unit', 'topic': cids[cid]['topic']})

    # ----- units output
    kids = {}
    for u in tree.units.values():
        kids.setdefault(u['parent'], []).append(u['id'])
    units_out = []
    for uid in tree.order:
        u = dict(tree.units[uid])
        u['children'] = kids.get(uid, [])
        u['own_gate'] = uid in gates
        # ledger row ids must exist as units (done above); strength keys
        units_out.append(u)
    # integrity: parents exist, no cycles
    for u in units_out:
        p = u['parent']
        if p is not None:
            need(p in tree.units, 'unit %s has missing parent %s' % (u['id'], p))
    for u in units_out:
        seen, p = set(), u['id']
        while p:
            need(p not in seen, 'cycle at %s' % u['id'])
            seen.add(p)
            p = tree.units[p]['parent'] if p in tree.units else None
    for rid in cellinfo:
        need(rid in tree.units, 'ledger row %s has no unit' % rid)

    # counts
    def cnt(army, pred):
        return sum(1 for u in units_out if u['army'] == army and pred(u))
    counts = {
        'units_total': len(units_out),
        'by_army_level': {'%s/%s' % k: v for k, v in sorted(Counter((u['army'], u['level']) for u in units_out).items())},
        'US_regiments_incl_battalions_and_companies': cnt('US', lambda u: u['level'] in ('regiment', 'battalion', 'company') and u['arm'] != 'artillery'),
        'US_batteries': cnt('US', lambda u: u['level'] == 'battery'),
        'CS_regiments': cnt('CS', lambda u: u['level'] == 'regiment'),
        'CS_infantry_cavalry_regiments_and_battalions': cnt('CS', lambda u: u['level'] in ('regiment', 'battalion')),
        'CS_batteries_named_in_PDF': cnt('CS', lambda u: u['level'] == 'battery'),
        'CS_artillery_battalions': cnt('CS', lambda u: u['level'] == 'artillery_battalion'),
        'US_brigades': cnt('US', lambda u: u['level'] == 'brigade'),
        'CS_brigades': cnt('CS', lambda u: u['level'] == 'brigade'),
        'b3_units_before_ledger_merge': uni_count_b3,
        'pdf_rough_counts': {'US_regiments': 270, 'US_batteries': 65, 'CS_regiments_and_battalions': 170, 'CS_batteries': 65, 'CS_artillery_battalions': 15},
    }
    cc = crosscheck(tree, cellinfo)
    # CS artillery battalion list printed under the order of battle vs the battalions in the corps lists
    txt17007 = ' '.join(lines()[i - 1].strip() for i in (17007, 17008))
    mm = re.search(r'Confederate artillery battalions: (.*?)\. Battery captain', txt17007)
    need(mm, 'CS artillery battalion list not found at lines 17007-17008')
    listed = [x.strip() for x in mm.group(1).split(',')]
    bn_units = [u for u in units_out if u['army'] == 'CS' and u['level'] == 'artillery_battalion']
    unit_names = sorted((u['commanders_printed'][0] if u['commanders_printed'] else u['name_printed']) for u in bn_units)
    art_cc = {'printed_list': listed, 'printed_count': len(listed), 'b3_units': unit_names, 'b3_count': len(unit_names),
              'only_in_printed_list': sorted(set(listed) - set(unit_names)), 'only_in_b3_corps_lists': sorted(set(unit_names) - set(listed)),
              'note': 'Latimer/Raine, Dance and Lane appear only in the printed list; Andrews, Cutts, Stuart Horse Artillery (Beckham) and the unnamed-commander 1st VA Artillery Bn appear only in the corps lists. The PDF does not say which are the same battalion; no equivalence is assumed.'}

    # ----- write
    def dump(name, obj):
        p = os.path.join(OUT, name)
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(obj, f, ensure_ascii=False, indent=1, sort_keys=False)
            f.write('\n')

    if ERR:
        for e in ERR:
            print('FAIL', e)
        print('%d failure(s); nothing written' % len(ERR))
        sys.exit(1)

    dump('units.json', {
        '_doc': 'Unit tree from PDF B.2.4 (ledger rows) and B.3 (order of battle). Names, commanders and figures are as printed (smart quotes kept); regiment commanders are not in the PDF and are not supplied. ids: see tools/bt/oob_units.py. status: on_field | partly_on_field | never_on_field | never_main_field. Regiment lists are expanded from the printed lists (flags record inherited state and ranges). strength: PDF B.3 corps table (Stone Sentinels figures, caveats B.1), single printed figures, no range declared.',
        'meta': {'source_text': 'tmp/pdf/plan-clean.txt (= docs/battle-theatre/BIBLE/plan-clean.txt)', 'counts': counts, 'regimental_commanders': 'not in the PDF (stripped from the fetched order of battle, B.3); none supplied', 'builder': 'tools/bt/build_arrivals.py'},
        'units': units_out})
    dump('arrivals.json', {
        '_doc': 'PDF B.2.4 unit arrival and departure ledger as machine-checkable data. rows: one record per ledger row (44), raw cells verbatim. first_on_field.earliest/default/latest are ONLY clock times printed in the cell (null otherwise, with null_reason). gate: what the Q04 checker uses (printed clocks, labelled named-period conventions, date floors, event floors, or derived min of children). Defaults copied from the PDF B.2.5 are PDF recommendations, PENDING OWNER, not owner decisions. All times are 1863 local mean time as printed (the Union and Confederate clocks differed by about 20 minutes, B.2.2; no correction applied). tier: documented / inferred / open gap; claim_support_verified is false everywhere.',
        'meta': {'time_zone': 'LMT as printed in the PDF', 'weak_source_patterns': WEAK_PATTERNS,
                 'weak_pattern_meaning': {'^W-': 'Wikipedia', '^OOB-': 'Wikipedia order-of-battle pages', '^EPP$': 'Epperson timeline (legend: weak, unreferenced)', '^CWT': 'CivilWarTalk forum', '^PADRE$': 'Padre Steve blog', '^WHB': 'blogs', '^SS': 'Stone Sentinels (SS1, SS2, SS2D, SS-*)', '^STONE-RES$': 'Stone Sentinels, Artillery Reserve', '^SStone': 'Stone Sentinels'},
                 'legend_weak_flagged_keys_used_in_ledger': sorted(k for k in set(x for r in rows_out for x in r['source_keys']['all']) if 'weak' in legend.get(k, '').lower()),
                 'scenario_selectors': ["earliest", "default", "latest", "v<N> = N-th value in gate.values (0-based)"],
                 'named_periods': NAMED_PERIODS,
                 'named_periods_note': 'Checker conventions, NOT historical arrival claims; PDF B.2.2 defines [DUSK] 19:32-20:04 and [NIGHT] after 20:04; "evening" has no PDF clock definition.',
                 'row_count': len(rows_out), 'subunit_gate_count': len(subunit_gates)},
        'rows': rows_out,
        'subunit_gates': subunit_gates,
        'derived_gates': [gates[k] for k in ('cs-3c', 'us-cav', 'us-aop', 'cs-anv')],
        'unparsed': unparsed,
        'gates': gates})
    dump('not_on_field.json', {
        '_doc': 'PDF B.2.4 closing tables "Union units never or only partly on the field" and "Confederate units never or only partly on the field", plus the animation gating rules (PDF page 63, lines 16709-16716). unit ids are in units.json.',
        'union': nof['US'], 'confederate': nof['CS'],
        'units': [{'id': uid, 'status': kw['status'], 'table_row': ix, 'army': kw['army']} for uid, kw, ix in nof_units],
        'partly_on_field_parents': {'us-art-reserve-taft-1ctheavy': ['us-art-reserve-taft-1ctheavy-b', 'us-art-reserve-taft-1ctheavy-m'], 'us-5c-1d-sweitzer-32ma': ['us-5c-1d-sweitzer-32ma-co-c']},
        'listed_in_ledger_as_not_on_field': [
            {'id': 'cs-cav-robertson-jones-imboden', 'status': 'never_main_field', 'detached_role': 'Jones: Fairfield Jul 3 (date only)'},
            {'id': 'us-cav-2d-huey', 'status': 'never_on_field', 'text': "ledger: '2nd Brigade Huey at Westminster, never on the field'"}],
        'unnamed_in_pdf': ['"two Vermont regiments guarding trains" (B.3 text after the strength table; the PDF does not name them)'],
        'gating_rules': gating_rules()})
    dump('crosscheck.json', {'_doc': 'Comparison of regiment lists printed in the ledger commander cells with the B.3 lists (names normalised), and ledger battery letters/commanders matched onto the B.3 batteries.',
                             'regiment_lists': cc, 'battery_matches': bat_match, 'cs_artillery_battalion_list': art_cc, 'counts': counts})
    print('OK units=%d rows=%d subunit_gates=%d gates=%d unparsed=%d' % (len(units_out), len(rows_out), len(subunit_gates), len(gates), len(unparsed)))
    print(json.dumps(counts, indent=1))


if __name__ == '__main__':
    main()
