"""Build the unit tree (army > corps > division > brigade > regiment/battery/battalion) from PDF B.3 (order of battle,
plan-clean.txt lines 16891-17071) plus the B.2.4 ledger rows. Names, commanders and strength figures are copied as printed;
nothing is added from memory. Used by build_arrivals.py.

Slug rules (ids are stable):
  corps/division/artillery rows that have a ledger row use the ledger row id (arrivals_cells.ROWS);
  other corps/divisions: us-5c, us-5c-1d, cs-1c-res-art ...;
  brigade/battalion id = parent id + '-' + surname slug of the FIRST commander alternative ('Hoke/Avery' -> hoke);
  regiment/battery id = brigade id + '-' + lowercase alphanumerics of the name ('19th IN' -> 19in, '1st NY E' -> 1nye).
"""
import re
from oob_parse import (corps_blocks, parse_union, split_top, split_commas, expand_regs, UNION_HDR, CS_HDR, lines,
                       parse_brigade_item)

UNION_B3 = (16907, 16966)
CS_B3 = (16970, 17006)
STRENGTH_TABLE = (17018, 17069)
BRIGADE_FIGURES = (17070, 17071)

UCORPS = {'I Corps': 'us-1c', 'II Corps': 'us-2c', 'III Corps': 'us-3c', 'V Corps': 'us-5c', 'VI Corps': 'us-6c',
          'XI Corps': 'us-11c', 'XII Corps': 'us-12c', 'Cavalry Corps': 'us-cav', 'Artillery Reserve': 'us-art-reserve'}
CCORPS = {'I Corps': 'cs-1c', 'II Corps': 'cs-2c', 'III Corps': 'cs-3c', 'Cavalry Division': 'cs-cav-div'}

# Confederate division labels as printed in B.3 -> (unit id, level)
CS_LABELS = {
    'cs-1c': [('McLaws', 'cs-1c-mclaws'), ('Pickett', 'cs-1c-pickett'), ('Hood/Law', 'cs-1c-hood'), ('Reserve artillery Walton', 'cs-1c-res-art')],
    'cs-2c': [('Early', 'cs-2c-early'), ('Johnson', 'cs-2c-johnson'), ('Rodes', 'cs-2c-rodes'), ('Reserve artillery J. T. Brown', 'cs-2c-res-art')],
    'cs-3c': [('R. H. Anderson', 'cs-3c-anderson'), ('Heth/Pettigrew', 'cs-3c-heth'), ('Pender/Lane/Trimble', 'cs-3c-pender'), ('Reserve artillery R. L. Walker', 'cs-3c-res-art')],
}

# printed ledger names for the artillery groups, so units carry the ledger-row id where one exists
LEDGER_ART_IDS = {'us-1c': 'us-1c-art', 'us-2c': 'us-2c-art', 'us-3c': 'us-3c-art'}


def slug_alnum(s):
    s = re.sub(r'(\d)(?:st|nd|rd|th)\b', r'\1', s)
    return re.sub(r'[^a-z0-9]', '', s.lower())


def commander_slug(name):
    """Surname slug of the first alternative: 'Meredith's Iron Brigade' -> meredith; 'Vincent (mw)/Rice' -> vincent."""
    n = name.split('/')[0]
    n = re.sub(r'\([^)]*\)', '', n)
    n = re.sub(r"\b(Iron Brigade|Irish Brigade|Excelsior|reserve|battalion|artillery|Louisiana)\b", '', n, flags=re.I)
    n = n.replace("'s", '').replace('’s', '').replace("’", '').replace("'", '').strip()
    toks = [t for t in re.split(r'\s+', n) if t]
    return re.sub(r'[^a-z0-9]', '', toks[-1].lower()) if toks else ''


def commanders_from(name):
    """['Vincent (mw)', 'Rice'] from 'Vincent (mw)/Rice' (as printed); brigade nicknames/qualifiers are removed
    ('Meredith's Iron Brigade' -> 'Meredith', 'Brewster Excelsior' -> 'Brewster', 'Merritt reserve' -> 'Merritt',
    'Hays's Louisiana' -> 'Hays', 'Crawford (PA Reserves)' -> 'Crawford')."""
    out = []
    for c in name.split('/'):
        c = c.strip()
        c = re.sub(r"[’']s (Iron Brigade|Irish Brigade|Louisiana)$", '', c)
        c = re.sub(r' (Excelsior|reserve)$', '', c)
        c = re.sub(r' \(PA Reserves\)$', '', c)
        if c:
            out.append(c)
    return out


class Tree:
    def __init__(self):
        self.units = {}
        self.order = []

    def add(self, **kw):
        uid = kw['id']
        if uid in self.units:
            raise SystemExit('FAIL duplicate unit id %s (%s vs %s)' % (uid, self.units[uid].get('name_printed'), kw.get('name_printed')))
        u = dict(army=None, level=None, arm=None, parent=None, name_printed=None, name=None, commanders_printed=[],
                 regs_printed=None, strength=None, status='on_field', ledger_row=None, source='PDF-B3', flags=[], notes=[])
        u.update(kw)
        self.units[uid] = u
        self.order.append(uid)
        return u


def add_regs(tree, parent, regs_text, army, arm, level_default='regiment', bare_suffix=None):
    """Expand a printed regiment/battery list under `parent`. Returns the list of created ids."""
    out = []
    if not regs_text:
        return out
    toks = expand_regs(regs_text, 'art' if arm == 'artillery' else ('cav' if arm == 'cavalry' else 'inf'))
    for t in toks:
        for nm in t['names']:
            level = level_default
            if arm == 'artillery':
                level = 'battery'
            elif re.search(r'\b(Bn|Bns)\b', nm):
                level = 'battalion'
            bare = bool(bare_suffix) and re.match(r'^\d+(?:st|nd|rd|th)$', nm)
            if bare:
                nm = nm + ' ' + bare_suffix  # e.g. '5th' printed under 'Crawford (PA Reserves)' -> '5th PA Reserves'
            uid = parent + '-' + slug_alnum(nm)
            u = tree.add(id=uid, army=army, level=level, arm=arm, parent=parent, name_printed=t['printed'], name=nm)
            if t['state_inherited']:
                u['flags'].append('state_inherited_from_next_token')
            if len(t['names']) > 1:
                u['flags'].append('expanded_from_printed_token')
            if t.get('suffix_inherited'):
                u['flags'].append('plural_suffix_distributed_from_next_token')
            if bare:
                u['flags'].append('state_not_printed_name_from_division_label_%s' % bare_suffix.replace(' ', '_'))
            if arm == 'cavalry' and re.search(r' [A-Z](?: and [A-Z])?$', nm):
                u['flags'].append('letters_after_cavalry_regiment_are_companies_not_expanded')
            out.append(uid)
    return out


def parse_union_b3(tree):
    blocks = corps_blocks(UNION_B3[0], UNION_B3[1], UNION_HDR)
    labels = [b['label'] for b in blocks]
    assert labels == list(UCORPS), labels
    for b in blocks:
        cid = UCORPS[b['label']]
        corps = tree.units.get(cid) or tree.add(id=cid, army='US', level='corps', parent='us-aop', name_printed=b['label'], name=b['label'])
        corps['commanders_printed'] = [c.strip() for c in re.split(r',\s*', b['cmd'])]
        corps['commanders_raw_b3'] = b['cmd']
        if cid == 'us-cav':
            corps['level'] = 'corps'
        body = b['body']
        segs = parse_union(body)
        for seg in segs:
            parse_union_segment(tree, cid, seg)


DIV_RE = re.compile(r'^(\d+)(?:st|nd|rd|th) Div (.+?): (.*)$')


def parse_union_segment(tree, cid, seg):
    m = DIV_RE.match(seg)
    if m:
        n = m.group(1)
        did = '%s-%sd' % (cid, n)
        label = seg[:seg.index(': ')]
        d = tree.units.get(did) or tree.add(id=did, army='US', level='division', arm='infantry' if cid != 'us-cav' else 'cavalry', parent=cid,
                                             name_printed=label, name=label)
        d['commanders_printed'] = commanders_from(m.group(2))
        d['commanders_raw_b3'] = m.group(2)
        if '(PA Reserves)' in m.group(2):
            d['notes'].append('B.3 prints the division label as "Crawford (PA Reserves)"')
        body = m.group(3)
        arm = 'cavalry' if cid == 'us-cav' else 'infantry'
        for item in split_top(body, ';'):
            parse_brigade_like(tree, did, item, arm)
        return
    if seg.startswith('Horse Artillery:'):
        txt = seg.split(': ', 1)[1]
        aid = 'us-cav-art'
        u = tree.add(id=aid, army='US', level='artillery_brigade', arm='artillery', parent=cid, name_printed='Horse Artillery', name='Horse Artillery',
                     commanders_printed=[c.strip() for c in txt.split(',')])
        u['regs_printed'] = None
        u['notes'].append('B.3 prints only the names "%s" for Horse Artillery; no batteries are listed in B.3' % txt)
        return
    m = re.match(r'^Artillery (.+?): (.*)$', seg)
    if m:
        aid = LEDGER_ART_IDS.get(cid, cid + '-art')
        u = tree.add(id=aid, army='US', level='artillery_brigade', arm='artillery', parent=cid, name_printed='Artillery ' + m.group(1),
                     name='Artillery ' + m.group(1), commanders_printed=commanders_from(m.group(1)), regs_printed=m.group(2))
        add_regs(tree, aid, m.group(2), 'US', 'artillery')
        return
    m = re.match(r'^(\d+(?:st|nd|rd|th) (?:Regular|Vol|Volunteer)) \(([^)]*)\): (.*)$', seg)
    if m:
        cmdr = m.group(2)
        bid = cid + '-' + commander_slug(cmdr)
        u = tree.add(id=bid, army='US', level='artillery_brigade', arm='artillery', parent=cid,
                     name_printed='%s (%s)' % (m.group(1), cmdr), name=m.group(1) + ' Brigade', commanders_printed=[cmdr], regs_printed=m.group(3))
        add_regs(tree, bid, m.group(3), 'US', 'artillery')
        return
    raise SystemExit('FAIL unparsed Union segment under %s: %r' % (cid, seg[:120]))


def parse_brigade_like(tree, did, item, arm):
    item = item.strip().rstrip('.')
    m = re.match(r'^(1st Co\. Massachusetts Sharpshooters) attached$', item)
    if m:
        uid = did + '-1comass'
        tree.add(id=uid, army='US', level='company', arm=arm, parent=did, name_printed=item, name=m.group(1),
                 flags=['attached_company_printed_without_brigade'])
        return
    name, regs = parse_brigade_item(item)
    bid = did + '-' + commander_slug(name)
    u = tree.add(id=bid, army='US', level='brigade', arm=arm, parent=did, name_printed=name, name=name,
                 commanders_printed=commanders_from(name), regs_printed=regs)
    if regs:
        add_regs(tree, bid, regs, 'US', arm, bare_suffix='PA Reserves' if did == 'us-5c-3d' else None)


def split_cs_division(body, labels):
    """Split corps body on the known division labels (initials such as 'R. H. Anderson' must not split)."""
    pos = []
    for lab, uid in labels:
        pat = re.compile(r'(?:^|(?<=\. ))' + re.escape(lab) + r': ')
        mm = pat.search(body)
        if not mm:
            raise SystemExit('FAIL CS label %r not found' % lab)
        pos.append((mm.start(), mm.end(), lab, uid))
    pos.sort()
    out = []
    for i, (s, e, lab, uid) in enumerate(pos):
        end = pos[i + 1][0] if i + 1 < len(pos) else len(body)
        out.append((lab, uid, body[e:end].strip().rstrip('.').strip()))
    return out


def parse_cs_b3(tree):
    blocks = corps_blocks(CS_B3[0], CS_B3[1], CS_HDR)
    labels = [b['label'] for b in blocks]
    assert labels == list(CCORPS), labels
    for b in blocks:
        cid = CCORPS[b['label']]
        corps = tree.units.get(cid) or tree.add(id=cid, army='CS', level='corps' if cid != 'cs-cav-div' else 'division', parent='cs-anv', name_printed=b['label'], name=b['label'])
        corps['commanders_printed'] = [c.strip() for c in re.split(r',\s*', b['cmd'])]
        corps['commanders_raw_b3'] = b['cmd']
        body = b['body']
        if cid == 'cs-cav-div':
            parse_cs_cavalry(tree, cid, body)
            continue
        for lab, did, dbody in split_cs_division(body, CS_LABELS[cid]):
            if lab.startswith('Reserve artillery'):
                cm = lab.replace('Reserve artillery ', '')
                tree.add(id=did, army='CS', level='artillery_group', arm='artillery', parent=cid, name_printed=lab, name=lab,
                         commanders_printed=[cm])
                for item in split_commas(dbody):
                    parse_cs_battalion(tree, did, item)
                continue
            d = tree.units.get(did) or tree.add(id=did, army='CS', level='division', arm='infantry', parent=cid, name_printed=lab, name=lab)
            d['commanders_printed'] = commanders_from(lab)
            for item in split_top(dbody, ';'):
                parse_cs_item(tree, did, item.strip())


def parse_cs_battalion(tree, parent, item):
    item = item.strip().rstrip('.')
    m = re.match(r"^(.+?)['’]s battalion(?: \(([^)]*)\))?$", item)
    if m:
        bid = parent + '-' + commander_slug(m.group(1))
        u = tree.add(id=bid, army='CS', level='artillery_battalion', arm='artillery', parent=parent, name_printed=item,
                     name=m.group(1) + "'s battalion", commanders_printed=[m.group(1)], regs_printed=m.group(2))
        if m.group(2):
            add_regs(tree, bid, m.group(2), 'CS', 'artillery')
        return
    m = re.match(r'^Washington \(LA\) Artillery$', item)
    if m:
        bid = parent + '-washington'
        tree.add(id=bid, army='CS', level='artillery_battalion', arm='artillery', parent=parent, name_printed=item, name=item)
        return
    m = re.match(r'^1st VA Artillery Bn$', item)
    if m:
        bid = parent + '-1vaartbn'
        tree.add(id=bid, army='CS', level='artillery_battalion', arm='artillery', parent=parent, name_printed=item, name=item)
        return
    raise SystemExit('FAIL unparsed CS artillery item %r under %s' % (item, parent))


def parse_cs_item(tree, did, item):
    item = item.strip().rstrip('.')
    arm = 'infantry'
    m = re.match(r"^(.+?)['’]s battalion$", item)
    if m:
        bid = did + '-' + commander_slug(m.group(1))
        tree.add(id=bid, army='CS', level='artillery_battalion', arm='artillery', parent=did, name_printed=item,
                 name=m.group(1) + "'s battalion", commanders_printed=[m.group(1)])
        return
    m = re.match(r"^(.+?)['’]s artillery battalion$", item)
    if m:
        bid = did + '-' + commander_slug(m.group(1))
        tree.add(id=bid, army='CS', level='artillery_battalion', arm='artillery', parent=did, name_printed=item,
                 name=m.group(1) + "'s battalion", commanders_printed=[m.group(1)])
        return
    m = re.match(r'^(\d+)(?:st|nd|rd|th) (VA) Cavalry Bn$', item)
    if m:
        uid = did + '-' + slug_alnum(item)
        tree.add(id=uid, army='CS', level='battalion', arm='cavalry', parent=did, name_printed=item, name=item)
        return
    name, regs = parse_brigade_item(item)
    if regs is None:
        raise SystemExit('FAIL CS item without regiment list: %r under %s' % (item, did))
    bid = did + '-' + commander_slug(name)
    tree.add(id=bid, army='CS', level='brigade', arm=arm, parent=did, name_printed=name, name=name, commanders_printed=commanders_from(name), regs_printed=regs)
    add_regs(tree, bid, regs, 'CS', arm)


CAV_PARENT = {'hampton': 'cs-cav-div', 'flee': 'cs-cav-flee-chambliss', 'chambliss': 'cs-cav-flee-chambliss', 'jenkins': 'cs-cav-div'}


def parse_cs_cavalry(tree, cid, body):
    items = split_top(body, ';')
    for item in items:
        item = item.strip().rstrip('.')
        m = re.match(r"^Stuart Horse Artillery \(([^)]*)\)$", item)
        if m:
            tree.add(id='cs-cav-horse-art', army='CS', level='artillery_battalion', arm='artillery', parent=cid, name_printed=item,
                     name='Stuart Horse Artillery', commanders_printed=[m.group(1)])
            continue
        if re.match(r"^Robertson['’]s and Jones['’]s brigades", item):
            tree.units[cid]['notes'].append('B.3: "%s"' % item)
            continue
        if re.match(r"^Imboden['’]s command", item):
            tree.units[cid]['notes'].append('B.3: "%s"' % item)
            continue
        name, regs = parse_brigade_item(item)
        if regs is None:
            raise SystemExit('FAIL cavalry item without regs: %r' % item)
        slug = {'Hampton': 'hampton', 'F. Lee': 'flee', 'Jenkins/Witcher': 'jenkins', 'W. H. F. Lee/Chambliss': 'chambliss'}.get(name)
        if not slug:
            raise SystemExit('FAIL unknown cavalry brigade %r' % name)
        bid = 'cs-cav-' + slug
        tree.add(id=bid, army='CS', level='brigade', arm='cavalry', parent=CAV_PARENT[slug], name_printed=name, name=name, commanders_printed=commanders_from(name), regs_printed=regs)
        add_regs(tree, bid, regs, 'CS', 'cavalry')


def parse_strengths():
    """Return {'US': [{label, strength, lost, rate}], 'CS': [...]} exactly as printed in the B.3 table."""
    L = [l.strip() for l in lines()[STRENGTH_TABLE[0] - 1:STRENGTH_TABLE[1]] if l.strip() and not l.startswith('===')]
    out = {'US': [], 'CS': []}
    assert len(L) % 4 == 0, len(L)
    for i in range(0, len(L), 4):
        lab, st, lo, rate = L[i:i + 4]
        side = 'CS' if '(' in lab else 'US'
        out[side].append({'label': lab, 'strength_printed': st, 'lost_printed': lo, 'rate_printed': rate,
                          'strength': int(st.replace(',', '')), 'lost': int(lo.replace(',', '')), 'rate_pct': int(rate.rstrip('%'))})
    return out


STRENGTH_IDS = {
    ('US', 'I'): 'us-1c', ('US', 'II'): 'us-2c', ('US', 'III'): 'us-3c', ('US', 'V'): 'us-5c', ('US', 'VI'): 'us-6c', ('US', 'XI'): 'us-11c',
    ('US', 'XII'): 'us-12c', ('US', 'Cavalry'): 'us-cav', ('US', 'Artillery Reserve'): 'us-art-reserve',
    ('CS', 'I (Longstreet)'): 'cs-1c', ('CS', 'II (Ewell)'): 'cs-2c', ('CS', 'III (Hill)'): 'cs-3c', ('CS', 'Cavalry (Stuart)'): 'cs-cav-div',
}

BRIGADE_FIG_IDS = {
    'Iron Brigade': 'us-1c-1d-meredith', 'Cutler': 'us-1c-1d-cutler', 'Paul': 'us-1c-2d-paul', 'Armistead': 'cs-1c-pickett-armistead',
    'Garnett': 'cs-1c-pickett-garnett', 'Pettigrew': 'cs-3c-heth-pettigrew', 'Iverson': 'cs-2c-rodes-iverson', 'Barksdale': 'cs-1c-mclaws-barksdale',
}


def parse_brigade_figures():
    txt = ' '.join(l.strip() for l in lines()[BRIGADE_FIGURES[0] - 1:BRIGADE_FIGURES[1]])
    m = re.search(r'Brigade-level figures in the notes include (.*?)\. The Union table', txt)
    assert m, txt[:200]
    out = []
    for part in m.group(1).split(', '):
        mm = re.match(r'^(.+?) ([\d,]+) \(([\d,]+)(?: lost)?\)$', part.strip())
        if not mm:
            raise SystemExit('FAIL brigade figure %r' % part)
        out.append({'label': mm.group(1), 'strength_printed': mm.group(2), 'lost_printed': mm.group(3),
                    'strength': int(mm.group(2).replace(',', '')), 'lost': int(mm.group(3).replace(',', ''))})
    return out


def build_b3_tree():
    t = Tree()
    t.add(id='us-aop', army='US', level='army', parent=None, name_printed='Army of the Potomac (MG George G. Meade)', name='Army of the Potomac',
          commanders_printed=['MG George G. Meade'])
    t.add(id='cs-anv', army='CS', level='army', parent=None, name_printed='Army of Northern Virginia (Gen. Robert E. Lee)', name='Army of Northern Virginia',
          commanders_printed=['Gen. Robert E. Lee'])
    parse_union_b3(t)
    parse_cs_b3(t)
    return t
