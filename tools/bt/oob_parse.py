"""Parse PDF B.3 (order of battle) text from tmp/pdf/plan-clean.txt into a nested structure, exactly as printed.
Used by build_arrivals.py. Regiment-list expansion only inherits a printed state/arm suffix from the next token that carries
one (e.g. '81st, 148th PA' -> '81st PA', '148th PA'); nothing else is added."""
import re, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PDF = os.path.join(ROOT, 'tmp', 'pdf', 'plan-clean.txt')
if not os.path.exists(PDF):  # identical copy kept in the repo
    PDF = os.path.join(ROOT, 'docs', 'battle-theatre', 'BIBLE', 'plan-clean.txt')
LINES = None


def lines():
    global LINES
    if LINES is None:
        LINES = open(PDF, encoding='utf-8').read().split('\n')
    return LINES


def clean_join(rng):
    """Join PDF lines a..b (1-based, inclusive) dropping page footers/markers; hyphen-wrap joins without space."""
    out = ''
    for i in range(rng[0], rng[1] + 1):
        t = lines()[i - 1].strip()
        if not t or t.startswith('=== PAGE') or t.startswith('Gettysburg Total War animation plan, version 2 | page'):
            continue
        if out.endswith('-') and not out.endswith(' -'):
            out += t
        else:
            out += (' ' if out else '') + t
    return out


UNION_HDR = re.compile(r'^(I|II|III|V|VI|XI|XII) Corps$|^Cavalry Corps$|^Artillery Reserve$')
CS_HDR = re.compile(r'^(I|II|III) Corps$|^Cavalry Division$')


def corps_blocks(a, b, hdr):
    """Return list of (corps_label, commander_line, body_text) for lines a..b."""
    blocks, cur = [], None
    for i in range(a, b + 1):
        raw = lines()[i - 1]
        t = raw.strip()
        if not t or t.startswith('=== PAGE') or t.startswith('Gettysburg Total War animation plan, version 2 | page'):
            continue
        if hdr.match(t) and not raw.startswith(' '):
            cur = {'label': t, 'cmd': None, 'body': ''}
            blocks.append(cur)
            continue
        if cur is None:
            continue
        if cur['cmd'] is None:
            cur['cmd'] = t
            continue
        cur['body'] += ('' if cur['body'].endswith('-') else (' ' if cur['body'] else '')) + t
    return blocks


def split_top(s, sep=';'):
    """Split on sep at paren depth 0."""
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == sep and depth == 0:
            out.append(cur.strip())
            cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def split_commas(s):
    return split_top(s, ',')


STATES = {'NH', 'NY', 'PA', 'ME', 'MA', 'VT', 'CT', 'RI', 'NJ', 'DE', 'MD', 'WV', 'OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'US',
          'SC', 'NC', 'VA', 'GA', 'AL', 'MS', 'LA', 'TX', 'AR', 'TN', 'FL', 'MO', 'KY'}
ORD = r'(\d+)(?:st|nd|rd|th)'


def expand_regs(text, arm):
    """Expand a printed regiment/battery list into tokens. Returns list of dicts {printed, name, parse}."""
    toks = split_commas(text)
    items = []
    # first pass: parse each token into parts
    for t in toks:
        items.append(parse_token(t))
    # inherit state from next token that has one
    for i, it in enumerate(items):
        if it.get('kind') in ('num', 'range', 'pair') and not it.get('state'):
            for j in range(i + 1, len(items)):
                if items[j].get('state'):
                    it['state'] = items[j]['state']
                    it['inherited_state'] = True
                    break
                if items[j].get('kind') not in ('num', 'range', 'pair'):
                    break
    # legions: bare names inherit 'Legion' from next 'X Legions'
    for i, it in enumerate(items):
        if it.get('kind') == 'name' and not it.get('suffix'):
            for j in range(i + 1, len(items)):
                if items[j].get('kind') == 'name' and items[j].get('suffix') == 'Legions':
                    it['suffix'] = 'Legions'
                    it['inherited_suffix'] = True
                    break
                if items[j].get('kind') != 'name':
                    break
    out = []
    for it in items:
        out.append(finish(it, arm))
    return out


def parse_token(t):
    t0 = t.strip()
    # range 5th-8th NJ / 70th-74th, 1st-5th VA, 5th-9th LA, 1st-3rd
    m = re.match(r'^' + ORD + r'-' + ORD + r'(?: (%s))?$' % '|'.join(sorted(STATES)), t0)
    if m:
        return {'printed': t0, 'kind': 'range', 'a': int(m.group(1)), 'b': int(m.group(2)), 'state': m.group(3)}
    # '34th and 36th VA Bns' / '1st and 2nd SC' / '1st and 3rd NY' / '1st and 2nd US Sharpshooters'
    m = re.match(r'^' + ORD + r' and ' + ORD + r'(?: (%s))?(?: (.+))?$' % '|'.join(sorted(STATES)), t0)
    if m:
        return {'printed': t0, 'kind': 'pair', 'a': int(m.group(1)), 'b': int(m.group(2)), 'state': m.group(3), 'suffix': m.group(4)}
    # 3rd WV A and C  /  1st NY E and L / 1st OH I and K  (battery letters)
    m = re.match(r'^(?:' + ORD + r' )?(%s) ([A-Z](?: and [A-Z])?)$' % '|'.join(sorted(STATES)), t0)
    if m:
        return {'printed': t0, 'kind': 'battery', 'num': int(m.group(1)) if m.group(1) else None, 'state': m.group(2), 'letters': m.group(3)}
    # 1st NJ B (ledger style 'E&L')
    m = re.match(r'^' + ORD + r' (%s) ([A-Z])&([A-Z])$' % '|'.join(sorted(STATES)), t0)
    if m:
        return {'printed': t0, 'kind': 'battery', 'num': int(m.group(1)), 'state': m.group(2), 'letters': m.group(3) + ' and ' + m.group(4)}
    # numbered, optional state, optional suffix (Bn, Prov, SS Bn, Rifles, Heavy, Sharpshooters, Legions...)
    m = re.match(r'^' + ORD + r'(?: (%s))?(?: (.+))?$' % '|'.join(sorted(STATES)), t0)
    if m:
        return {'printed': t0, 'kind': 'num', 'num': int(m.group(1)), 'state': m.group(2), 'suffix': m.group(3)}
    # name token e.g. "Cobb's", "Phillips Legions", "Ashland", "Brooks SC", "Madison LA", "Excelsior"
    m = re.match(r'^(.+?) (Legions)$', t0)
    if m:
        return {'printed': t0, 'kind': 'name', 'base': m.group(1), 'suffix': 'Legions'}
    return {'printed': t0, 'kind': 'name', 'base': t0, 'suffix': None}


def ordsuf(n):
    if 10 <= n % 100 <= 20:
        return 'th'
    return {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')


def O(n):
    return '%d%s' % (n, ordsuf(n))


def finish(it, arm):
    k = it['kind']
    recs = []
    if k == 'range':
        for n in range(it['a'], it['b'] + 1):
            recs.append(O(n) + (' ' + it['state'] if it.get('state') else ''))
    elif k == 'pair':
        suf = it.get('suffix') or ''
        if suf.endswith('Bns'):
            suf = suf[:-1]  # printed plural 'Bns' distributed over both: '34th and 36th VA Bns' -> '34th VA Bn', '36th VA Bn'
        for n in (it['a'], it['b']):
            recs.append(O(n) + (' ' + it['state'] if it.get('state') else '') + (' ' + suf if suf else ''))
    elif k == 'battery':
        pre = ((O(it['num']) + ' ') if it['num'] else '') + it['state'] + ' '
        if arm == 'cav':
            recs.append(pre + it['letters'])  # cavalry: letters are companies of one regiment, not expanded
        else:
            for letter in it['letters'].split(' and '):
                recs.append(pre + letter)
    elif k == 'num':
        recs.append(O(it['num']) + (' ' + it['state'] if it.get('state') else '') + (' ' + it['suffix'] if it.get('suffix') else ''))
    else:
        suf = it.get('suffix')
        if suf == 'Legions':
            suf = 'Legion'  # printed plural 'Cobb's, Phillips Legions' distributed over both names
        recs.append(it['base'] + (' ' + suf if suf else ''))
    return {'printed': it['printed'], 'names': recs,
            'state_inherited': bool(it.get('inherited_state')),
            'suffix_inherited': bool(it.get('inherited_suffix')),
            'kind': k}


def split_label_body(seg):
    m = re.match(r'^([^:]+?): (.*)$', seg)
    return (m.group(1), m.group(2)) if m else (None, seg)


def parse_union(body):
    """Split a Union corps body into division/artillery segments."""
    segs = re.split(r'(?<=\.) (?=\d+(?:st|nd|rd|th) Div |Artillery |Horse Artillery|\d+(?:st|nd|rd|th) (?:Regular|Vol|Volunteer))', body)
    return [s.rstrip('.') for s in segs]


def parse_cs(body):
    segs = re.split(r'(?<=\.) (?=[A-Z][^:;.()]*: |Reserve artillery )', body)
    return [s.rstrip('.') for s in segs]


def parse_brigade_item(item):
    """'Meredith's Iron Brigade (19th IN, ...)' -> (name, regs_text or None)."""
    m = re.match(r'^(.*) \(([^()]*)\)$', item)
    if m:
        return m.group(1), m.group(2)
    return item, None
