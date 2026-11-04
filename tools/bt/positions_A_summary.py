"""Regenerate docs/battle-theatre/history/positions/POSITIONS_A_SUMMARY.md after the full-passage fidelity re-check.
    PYTHONIOENCODING=utf-8 python -I tools/bt/positions_A_summary.py
Computed from positions_A.jsonl: section 1 counts, section 2 per-unit table (claims, location days, time span, verdict) and the brigade verdict list, section 5 conflict groups.
Kept from the frozen pre-recheck summary (_orig_A/POSITIONS_A_SUMMARY.before_recheck.md): the hand-written 'why' per unit, sections 3, 4, 6, 7, 8 and the intro. Section 4 prose is edited by hand
against the repaired claims (see RECHECK_A_NOTES.md)."""
import os, sys, json, re, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
POS = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
U = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json'), encoding='utf-8'))['units']}
CL = [json.loads(l) for l in open(os.path.join(POS, 'positions_A.jsonl'), encoding='utf-8')]
OLD_CL = [json.loads(l) for l in open(os.path.join(POS, '_orig_A', 'positions_A.before_recheck.jsonl'), encoding='utf-8')]
OLD = open(os.path.join(POS, '_orig_A', 'POSITIONS_A_SUMMARY.before_recheck.md'), encoding='utf-8').read()
KIN = {'position', 'night_position', 'engagement', 'movement', 'march', 'arrival_road', 'departure'}
RK = ('arrival_road', 'march', 'departure')


def desc(i):
    out = [i]
    for ch in U[i].get('children') or []:
        out += desc(ch)
    return out


def anc(i):
    out = []
    i = U[i].get('parent')
    while i:
        out.append(i); i = U[i].get('parent')
    return out


secs = re.split(r'\n(?=## )', OLD)
head = secs[0]
sec = {int(re.match(r'## (\d)', s).group(1)): s for s in secs[1:]}


NAMED = re.compile(r'Emmitsburg|Cashtown|Chambersburg|Hagerstown|Taneytown|Hanover|Harrisburg|York|Baltimore|Millerstown|Fairfield|Mummasburg|Middletown|Carlisle|Westminster|Frederick|Heidlersburg|Abbottstown|Cumberland|Sharpsburg|Boonsboro', re.I)


SEC4_EDITS = [
    ('in position 11 a.m. (Stone, Dana) or about noon (Wister, Huidekoper)', 'in position 11 a.m. (Stone, Dana) or about noon (Huidekoper; the hour in the Wister report is printed "13 m.", an OCR-damaged glyph, and is not read as a number)'),
    ('but a dispatch printed "C a. m." (6 a.m.) in D0959 already gives the route plan', 'but a dispatch in D0959 whose hour is printed "C a. m." (an OCR glyph, not read as a number; no clock is stored) already gives the route plan'),
    ('between 10 and 11 (Gates, 1.5 miles west of Gettysburg, brigade line formed in the Hagerstown road)', 'between 10 and 11 (Gates, "1^" miles west of Gettysburg with the fraction OCR-damaged, brigade line formed in the Hagerstown road)'),
    ('July 3 about 12 m. from Emmitsburg 4 miles along the Gettysburg road, engaged about four hours', 'July 3 left Emmitsburg at a time printed "about 12 m." (noon or 12 miles: the passage does not settle it), 4 miles along the Gettysburg road, engaged about four hours'),
    ("Pleasonton's 10.40 dispatch already speaks", "Pleasonton's 10.40 dispatch (no a. m./p. m. printed; a. m. read from the dispatch series) already speaks"),
    ('Times are those printed;', 'Times are those printed, except that after the full-passage re-check an hour is stored (`t_iso`) only where it stands in the same or an explicitly continuing sentence as the fact (see RECHECK_A_NOTES.md);'),
]


def doc(c):
    return c['tier'] == 'documented'


def road_counter(cs):
    return collections.Counter(c['place']['direction_or_road'] for c in cs if c['place']['direction_or_road'] and c['kind'] in RK and doc(c))


def old_road_counter(cs):
    return collections.Counter(c['place']['direction_or_road'] for c in cs if c['place']['direction_or_road'] and c['kind'] in RK and c['tier'] != 'open gap')


def new_roads(old_text, uid, ancestors):
    """Road columns recomputed from the repaired claims: every documented arrival_road / march / departure claim of the unit's subtree (or of its ancestors for the
    'via parent' column) that carries a road as printed, counted per road string. (The pre-recheck columns were hand-curated from normalised road names.)"""
    ids = anc(uid) if ancestors else desc(uid)
    cnt = road_counter([c for c in CL if c['unit_id'] in ids])
    if not cnt:
        return ('-' if ancestors else 'none'), []
    return '; '.join('%s x%d' % (k, v) for k, v in sorted(cnt.items(), key=lambda kv: (-kv[1], kv[0]))), []


def table():
    rows = []
    for l in re.findall(r'^\| us-.*$', sec[2], re.M):
        rows.append([x.strip() for x in l.strip().strip('|').split('|')])
    out = []; warns = []; changed = []
    for p in rows:
        uid = p[0]
        ds = desc(uid)
        sub = [c for c in CL if c['unit_id'] in ds]
        subd = [c for c in sub if doc(c)]
        gaps = sum(1 for c in sub if c['tier'] == 'open gap')
        days = sorted({c['when']['date'][5:] for c in subd if c['kind'] in KIN})
        asub = [c for c in CL if c['unit_id'] in anc(uid) and doc(c) and c['kind'] in KIN]
        via = sorted({c['when']['date'][5:] for c in asub} - set(days))
        ts = sorted(c['when']['t_iso'] for c in sub if c['when'].get('t_iso') and c['tier'] != 'open gap')
        span = (ts[0][5:] + ' to ' + ts[-1][5:]) if ts else '-'
        road, w1 = new_roads(p[5], uid, False)
        rvia, w2 = new_roads(p[6], uid, True)
        warns += w1 + w2
        okd = all(('07-0%d' % d) in days for d in (1, 2, 3))
        rd = any(c['place']['direction_or_road'] and NAMED.search(c['place']['direction_or_road']) and c['kind'] in RK for c in subd)
        v = 'full' if okd and rd else 'partial'
        if not subd:
            v = 'none'
        if p[8].startswith('none (not on field)'):
            v = p[8]
        why = p[9]
        if v.split(' ')[0] != p[8].split(' ')[0]:
            changed.append((uid, p[8], v))
            why += ' (Recheck: was %s.)' % p[8]
        out.append((uid, '| %s | %s | %d (%d) | %s | %s | %s | %s | %s | %s | %s |' % (uid, p[1], len(sub), gaps, ','.join(days) or '-', ','.join(via) or '-', road, rvia, span, v, why), v))
    return out, warns, changed


def groups():
    byid = {c['claim_id']: c for c in CL}
    seen = set(); comps = []
    for c in CL:
        if c['claim_id'] in seen or not [x for x in c['conflicts_with'] if x in byid]:
            continue
        stack = [c['claim_id']]; comp = []
        while stack:
            x = stack.pop()
            if x in seen:
                continue
            seen.add(x); comp.append(x)
            stack += [y for y in byid[x]['conflicts_with'] if y in byid and y not in seen]
        comps.append(comp)
    ext = collections.Counter(x for c in CL for x in c['conflicts_with'] if x not in byid)
    def key(cid):
        c = byid[cid]; return (c['when']['t_iso'] or '9999', cid)
    gl = []
    for comp in comps:
        cs = sorted((byid[x] for x in comp), key=lambda c: (c['when']['t_iso'] is None, c['when']['t_iso'] or '', c['claim_id']))
        dates = sorted({c['when']['date'] for c in cs})
        gl.append((dates[0], cs, dates))
    gl.sort(key=lambda g: (g[0], g[1][0]['when']['t_iso'] or '9999'))
    return gl, ext


def apply4(t):
    for a, b in SEC4_EDITS:
        if a not in t:
            print('WARN section 4 edit not applied:', a[:60])
        t = t.replace(a, b)
    return t


def main():
    t, warns, changed = table()
    n = len(CL); tc = collections.Counter(c['tier'] for c in CL); kc = collections.Counter(c['kind'] for c in CL)
    fc = collections.Counter(c.get('fidelity_check') for c in CL)
    qn = sum(1 for c in CL if c['source'].get('quote')); en = sum(1 for c in CL if c['source'].get('extract') and not c['source'].get('quote'))
    interp = sum(1 for c in CL if c['source'].get('interpolated') and c['tier'] != 'open gap')
    s1 = ['## 1. Counts and method', '',
          '- Claims: %d (documented %d, inferred %d, open gap %d). This is the ledger after the full-passage fidelity re-check (`RECHECK_A_NOTES.md`): every claim was re-read against at least 1,200 characters on each side of its cited passage in the raw OR text; fidelity_check: passed_full_read %d, corrected %d, downgraded %d, not_rechecked %d (the open gaps have no cited passage).' % (n, tc['documented'], tc['inferred'], tc['open gap'], fc['passed_full_read'], fc['corrected'], fc['downgraded'], fc['not_rechecked']),
          '- By kind: ' + ', '.join('%s %d' % kv for kv in kc.most_common()) + '.',
          '- Verbatim quotes under 15 words: %d claims carry a quote verified present in the OR text by code (`tools/bt/or27_find.py` `verify`, inside the named report record); %d further claims rest on a short verified extract (close reading); every quote is case-sensitive exact OCR text, errors included.' % (qn, en),
          '- Pages: printed page from the index page model; %d claims fall in a run of pages whose running heads the OCR lost and carry the page RANGE with `interpolated: true`.' % interp,
          '- `t_iso` is set only where a clock time is printed in the same sentence as the fact or an explicitly continuing sentence (%d claims after the re-check; was 232); `approx` marks "about/near/toward/after". OCR-uncertain claims (digits, dates, names): %d.' % (sum(1 for c in CL if c['when'].get('t_iso')), sum(1 for c in CL if c['ocr_uncertain'])),
          '- `claim_support_verified` is true only for claims whose fidelity_check is passed_full_read or corrected (%d); a time borrowed from another sentence is not stored as `t_iso` (`when.description` says "time in a different sentence" and gives the phrase).' % sum(1 for c in CL if c['claim_support_verified'])]
    for l in sec[1].split('\n')[2:]:
        if l.startswith('- Gazetteer') or l.startswith('- Tier meaning') or l.startswith('- Coverage'):
            s1.append(l)
    # section 2
    tl = sec[2].split('\n')
    hi = next(i for i, l in enumerate(tl) if l.startswith('| unit'))
    s2 = tl[:hi + 2]
    s2 += [r[1] for r in t]
    s2 += ['']
    bl = [l for l in sec[2].split('\n') if l.startswith('- us-') and ': ' in l]
    s2 += ['Brigade verdicts (the 21 infantry and cavalry brigades of scope A in units.json; artillery brigades and the horse artillery group are in the table above):', '']
    vd = {r[0]: r[2] for r in t}
    cnt = collections.Counter()
    for l in bl:
        uid = l[2:].split(':')[0]
        v = vd.get(uid, '?'); cnt[v.split(' ')[0] if not v.startswith('none') else 'none (not on field)'] += 1
        s2.append('- %s: %s' % (uid, v))
    s2 += ['', 'Totals: ' + ', '.join('%s %d' % (k, v) for k, v in sorted(cnt.items(), key=lambda kv: ['partial', 'full', 'none (not on field)'].index(kv[0]))) + '.', '']
    for l in sec[2].split('\n'):
        if l.startswith('Rule used:'):
            s2.append(l + ' After the re-check a road counts only if the printed road string contains a place name (Emmitsburg, Cashtown, Chambersburg, Hagerstown, Taneytown, Hanover, Harrisburg, York, Baltimore, ...): "the main road", "the direct route" and "toward Gettysburg (road not named)" do not count.')
    s2.append('')
    s2.append('Verdict changes caused by the re-check (rule applied to the repaired claims: documented tier only): ' + ('; '.join('%s %s -> %s' % x for x in changed) if changed else 'none') + '.')
    # section 5
    gl, ext = groups()
    s5 = ['## 5. Conflicts between reports (both values, nothing resolved)', '',
          '%d conflict groups (connected sets of claims whose `conflicts_with` lists link them), regenerated from the repaired claims. In each, the printed values are listed side by side. External conflict-register ids referenced by claims: %s. These ids are context only; nothing is added to the register here.' % (len(gl), ', '.join('%s x%d' % kv for kv in sorted(ext.items())) or 'none'), '']
    for gi, (d0, cs, dates) in enumerate(gl, 1):
        s5.append('### Group %d (%s; %d claims): %s' % (gi, d0 if len(dates) == 1 else '%s to %s' % (dates[0], dates[-1]), len(cs), cs[0]['activity'][:80]))
        s5 += ['', '| claim | unit | report, author, page | printed time | t_iso | place | fidelity |', '|---|---|---|---|---|---|---|']
        for c in cs:
            s = c['source']
            s5.append('| %s | %s | %s %s p.%s | %s | %s | %s | %s |' % (c['claim_id'], c['unit_id'], (s.get('report_id') or '')[5:], s.get('author') or '', s.get('printed_page'), (c['when'].get('printed') or '') + ((' [' + c['when']['description'][:60] + ']') if c['when'].get('description') else ''), c['when'].get('t_iso') or '', (c['place'].get('printed') or '')[:55], c.get('fidelity_check')))
        s5.append('')
    tail5 = sec[5].split('### Conflicts internal to one report')
    s5.append('### Conflicts internal to one report' + tail5[1].rstrip('\n') if len(tail5) > 1 else '')
    s8 = sec[8].rstrip('\n') + '\n- `docs/battle-theatre/history/positions/RECHECK_A_NOTES.md` (what the full-passage re-check found and changed), `docs/battle-theatre/history/positions/draft_A/recheck/*.json` (one decision per claim; the builder applies them), `tools/bt/recheck_ctx.py` (prints the passage around each claim), `tools/bt/positions_A_summary.py` (this file\'s generator), `tools/bt/verify_positions.py A` (hard checks incl. fidelity_check)\n'
    out = '\n\n'.join([head.rstrip('\n'), '\n'.join(s1), '\n'.join(s2), sec[3].rstrip('\n'), sec[4].rstrip('\n'), '\n'.join(s5), sec[6].rstrip('\n'), sec[7].rstrip('\n'), s8])
    open(os.path.join(POS, 'POSITIONS_A_SUMMARY.md'), 'w', encoding='utf-8', newline='\n').write(out + '\n')
    print('summary written; verdict changes:', changed)
    for w in warns:
        print('WARN', w)


if __name__ == '__main__':
    main()
