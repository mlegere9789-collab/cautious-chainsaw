"""Integrate the 47 conflict resolutions (GOVERNANCE/conflicts/resolutions/C-001..C-047.json) into
  - GOVERNANCE/decisions/conflict_defaults.json (version 2; the first delegated default of 2026-11-11 is kept as previous_default and as a scenario),
  - GOVERNANCE/conflict_register.json and conflicts_structured.json (default_status / status, resolution path),
  - decision_log.md and decisions/DELEGATED-DECISIONS-2026-11-11.md (one appended block DEC-DELEG-J; append only, idempotent).
Then run `node tools/bt/build_conflict_defaults.mjs` to rebuild the app data file.

    python3 -I tools/bt/conflicts/integrate_resolutions.py [--check]

Idempotent: the defaults file is rebuilt from the previous_default it keeps, the register fields are set, the two documents are appended only when the block is absent.
Nothing is deleted: every scenario of the first pass stays, every position of a resolution is a selectable scenario with the reason it was not chosen.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
RES = os.path.join(G, 'conflicts', 'resolutions')
DEFS = os.path.join(G, 'decisions', 'conflict_defaults.json')
STATUS = 'RESOLVED_DELEGATED_2026_11_16'
BLOCK = 'DEC-DELEG-J'
OWNER_WORDS = '"u must resolve the 47 conflicts. do the research and resolve them." (owner chat, 2026-11-16, recorded in decision_log.md DEC-OWNER-2026-11-16)'


def load_resolutions():
    out = {}
    for f in sorted(glob.glob(os.path.join(RES, 'C-*.json'))):
        d = json.load(open(f, encoding='utf-8'))
        out[d['id']] = d
    if len(out) != 47:
        raise SystemExit('expected 47 resolutions, found %d' % len(out))
    return out


def rel(cid):
    return 'docs/battle-theatre/GOVERNANCE/conflicts/resolutions/%s.json' % cid


def pos_value_text(p):
    v = p.get('value') or {}
    if isinstance(v, dict):
        if v.get('at'):
            return v['at']
        if v.get('from') or v.get('to'):
            return '%s to %s' % (v.get('from'), v.get('to'))
    return ''


def arrival_floors():
    """{conflict id: (floor iso, [unit rows])}: for each conflict that the arrivals ledger links to an arrival (topic_arrival, cited_by_reference), the highest gate floor of
    its rows (history/arrivals.json, read only). A floor kind (named_period_convention, date_floor, event_floor) is its default, a printed clock is its earliest."""
    a = json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'arrivals.json'), encoding='utf-8'))
    out = {}
    for row in a['rows']:
        g = row['gate']
        fl = g.get('default') if g.get('kind') in ('named_period_convention', 'date_floor', 'event_floor') else g.get('earliest')
        for c in row['conflicts']:
            if c['link'] in ('topic_arrival', 'cited_by_reference') and fl:
                out.setdefault(c['id'], []).append((fl, row['unit_id']))
    return out


def clamp(r, floors):
    """The resolution's instant may be earlier than the arrival gate's floor (Q04 and the ledger): the floor is never moved here. The drawn instant is then the highest floor it
    falls below, and the case is reported as an owner decision. Returns (at, info or None)."""
    at = ((r['default'].get('animation') or {}).get('at'))
    if not at:
        return None, None
    below = [(f, u) for f, u in floors.get(r['id'], []) if at < f]
    if not below:
        return at, None
    top = max(f for f, _ in below)
    return top, {'resolution_at': at, 'floor': top, 'rows': sorted({u for f, u in below})}


def drawn_text(r, at=None, info=None):
    """The text the arrival layer parses: a clock and a day only when the resolution draws an instant; otherwise a sentence with no clock."""
    d = r['default']
    a = d.get('animation') or {}
    at = at or a.get('at')
    if info:
        return '%s Jul %d (drawn at the arrival gate floor; the resolution\'s instant, %s, is earlier than the floor and the floor is not moved: owner decision): %s' % (at[11:16], int(at[8:10]), info['resolution_at'][11:16], d['label'])
    if at and not at.endswith('T00:00'):
        day = int(at[8:10])
        return '%s Jul %d (drawn instant, %s): %s' % (at[11:16], day, a.get('rule', ''), d['label'])
    if at and at.endswith('T00:00') and re.search(r'\b(00:00|midnight)\b', d['label'], re.I):
        return '00:00 Jul %d (drawn instant, %s): %s' % (int(at[8:10]), a.get('rule', ''), d['label'])
    return None   # no clock: the layer leaves its own gate unchanged and the window or gap is shown


def build_scenarios(old, r):
    cid = r['id']
    prev_id = old['default_scenario_id']
    by_sid = {}
    for p in r['positions']:
        for s in p.get('scenario_ids', []):
            by_sid.setdefault(s, []).append(p)
    scen = []
    for s in old['scenarios']:
        ps = by_sid.get(s['id'], [])
        e = dict(s)
        if s['id'] == prev_id:
            e['source'] = 'first delegated default of 2026-11-11 (previous default; kept selectable)'
        if ps:
            e['positions'] = [p['id'] for p in ps]
            e['stance'] = 'default' if any(p['stance'] == 'default' for p in ps) else 'selectable'
            reasons = [p['reason_not_chosen']['text'] for p in ps if p.get('reason_not_chosen')]
            if reasons:
                e['reason_not_chosen'] = ' '.join(dict.fromkeys(reasons))
            e['tier'] = ps[0].get('tier')
        scen.append(e)
    have = {s['id'] for s in scen}
    for p in r['positions']:
        if p.get('scenario_ids'):
            continue
        sid = p['id']
        if sid in have:
            continue
        e = {'id': sid, 'label': p['label'], 'source': 'added by the resolution of 2026-11-16 (nothing deleted)', 'positions': [p['id']], 'stance': p['stance'], 'tier': p.get('tier')}
        if p.get('reason_not_chosen'):
            e['reason_not_chosen'] = p['reason_not_chosen']['text']
        scen.append(e)
    newid = cid + '-R2'
    scen.append({'id': newid, 'label': r['default']['label'], 'source': 'default by research, 2026-11-16 (delegated; reversible by the owner)', 'positions': r['default'].get('positions', []), 'stance': 'default', 'tier': r['tier']})
    return newid, scen


def position_rows(r):
    rows = []
    for p in r['positions']:
        row = {'id': p['id'], 'label': p['label'], 'kind': p.get('kind'), 'tier': p.get('tier'), 'stance': p['stance'], 'origin': p.get('origin'), 'clock': p.get('clock'), 'scenario_ids': p.get('scenario_ids', []), 'value': p.get('value')}
        if p.get('reason_not_chosen'):
            row['reason_not_chosen'] = p['reason_not_chosen']
        rows.append(row)
    return rows


def build_defaults(cd, R):
    cd = json.loads(json.dumps(cd))
    cd['version'] = 2
    cd['_doc'] = ('Delegated defaults. Version 1 (2026-11-11): the first delegated default for each conflict. Version 2 (2026-11-16): each conflict resolved by research under the owner\'s order '
                  '"u must resolve the 47 conflicts. do the research and resolve them."; the first default is kept as previous_default and as a selectable scenario; the plan\'s value and every position of the resolution stay selectable. '
                  'Not owner decisions; reversible by the owner. Built by tools/bt/conflicts/integrate_resolutions.py from GOVERNANCE/conflicts/resolutions/. conflict_register.json and requirements.json are not edited by hand.')
    cd['label'] = 'Default chosen under delegated authority (resolved by research, 2026-11-16), reversible by the owner'
    floors = arrival_floors()
    for cid, r in R.items():
        old = cd['conflicts'][cid]
        if 'previous_default' not in old:
            old['previous_default'] = {'date': '2026-11-11', 'default_scenario_id': old['default_scenario_id'], 'default_label': old['default_label'], 'tier': old['tier'], 'basis': old['basis'], 'rationale': old['rationale']}
        prev = old['previous_default']
        # rebuild from the first-pass scenarios (the previous default scenario keeps its id) so a second run gives the same file
        base = {'default_scenario_id': prev['default_scenario_id'], 'scenarios': [s for s in old['scenarios'] if not s['id'].endswith('-R2') and not (s['id'].startswith(cid + '-P'))]}
        newid, scen = build_scenarios(base, r)
        d = r['default']
        cat, cinfo = clamp(r, floors)
        new = {
            'topic': r['topic'],
            'pdf_recommended_default': old['pdf_recommended_default'],
            'default_scenario_id': newid,
            'default_label': d['label'],
            'tier': r['tier'],
            'class': r['class'],
            'mode': d['mode'],
            'basis': r['basis']['kind'],
            'basis_text': r['basis']['text'],
            'event_date': r.get('event_date'),
            'window': d['label'] if d['mode'] in ('window', 'range', 'unresolved_set') else None,
            'animation': d.get('animation'),
            'drawn_text': drawn_text(r, cat, cinfo),
            'scenarios': scen,
            'positions': position_rows(r),
            'rationale': d.get('basis_text') or r['basis']['text'],
            'source_panel_text': r['source_panel_text'],
            'holds': r['holds'],
            'what_would_change_it': r['what_would_change_it'],
            'failed_searches_count': len(r['failed_searches']),
            'resolution_file': rel(cid),
            'previous_default': prev,
            'reversible': True,
            'product_label': 'Default chosen under delegated authority (resolved by research, 2026-11-16), reversible by the owner; tier: %s; class: %s' % (r['tier'], r['class']),
            'status': 'DELEGATED DECISION (owner order 2026-11-16, resolved by research); PDF default and first delegated default kept as selectable scenarios; not an owner decision',
        }
        if cinfo:
            new['drawn_clamped'] = cinfo
        if r.get('owner_note'):
            new['owner_note'] = r['owner_note']
        if d.get('note'):
            new['default_note'] = d['note']
        if d.get('range'):
            new['range'] = d['range']
        if d.get('value') is not None:
            new['value'] = d['value']
        cd['conflicts'][cid] = new
    return cd


def verify(cd, R):
    """Problems in a defaults file against the resolutions: a lost value, a default without a resolution file, missing panel text, a lost previous default."""
    bad = []
    C = cd.get('conflicts', {})
    if set(C) != set(R):
        bad.append('conflict ids differ from the resolutions: %s' % sorted(set(C) ^ set(R)))
    for cid, r in R.items():
        d = C.get(cid)
        if not d:
            continue
        sids = {s['id'] for s in d.get('scenarios', [])}
        if not d.get('resolution_file') or not os.path.exists(os.path.join(ROOT, d['resolution_file'])):
            bad.append('%s: default has no resolution file' % cid)
        if not d.get('source_panel_text') or len(d['source_panel_text']) < 40:
            bad.append('%s: source panel text missing' % cid)
        if d.get('default_label') != r['default']['label'] or d.get('tier') != r['tier'] or d.get('class') != r['class']:
            bad.append('%s: default differs from its resolution' % cid)
        if not d.get('previous_default') or d['previous_default'].get('default_scenario_id') not in sids:
            bad.append('%s: first delegated default lost' % cid)
        for p in r['positions']:
            ids = p.get('scenario_ids') or [p['id']]
            for x in ids:
                if x not in sids:
                    bad.append('%s: value %s (%s) lost' % (cid, x, p['id']))
            if p['stance'] != 'default' and not any(s.get('reason_not_chosen') for s in d.get('scenarios', []) if p['id'] in s.get('positions', [])):
                bad.append('%s: %s has no reason it was not chosen' % (cid, p['id']))
    return bad


def set_register(R, check):
    reg_p = os.path.join(G, 'conflict_register.json')
    reg = json.load(open(reg_p, encoding='utf-8'))
    for c in reg:
        c['default_status'] = STATUS
        c['resolution'] = rel(c['id'])
    st_p = os.path.join(G, 'conflicts_structured.json')
    st = json.load(open(st_p, encoding='utf-8'))
    for c in st['conflicts']:
        c['status'] = STATUS
        c['resolution'] = rel(c['id'])
    if not check:
        for path, obj in ((reg_p, reg), (st_p, st)):
            crlf = b'\r\n' in open(path, 'rb').read(400)          # keep the line ending the file has
            with open(path, 'w', encoding='utf-8', newline='\r\n' if crlf else '\n') as f:
                json.dump(obj, f, indent=1)


def short(s, n=170):
    s = re.sub(r'\s+', ' ', str(s)).strip()
    return s if len(s) <= n else s[:n - 1].rstrip() + '...'


def summary(R, cd):
    cls, tier = {}, {}
    for r in R.values():
        cls[r['class']] = cls.get(r['class'], 0) + 1
        tier[r['tier']] = tier.get(r['tier'], 0) + 1
    chg_pdf, chg_first, unres = [], [], []
    for cid, r in R.items():
        prev = cd['conflicts'][cid]['previous_default']
        pdf = cd['conflicts'][cid]['pdf_recommended_default']
        new = r['default']['label']
        h = r['holds']
        if h['pdf_default']['holds'] != 'yes':
            chg_pdf.append((cid, pdf, new, '%s: %s' % (h['pdf_default']['holds'], h['pdf_default']['note'])))
        if h['first_delegated']['holds'] != 'yes':
            chg_first.append((cid, prev['default_label'], new, '%s: %s' % (h['first_delegated']['holds'], h['first_delegated']['note'])))
        if r['class'] in ('gap', 'irreducible'):
            unres.append((cid, r['class'], new, r['failed_searches']))
    return cls, tier, chg_pdf, chg_first, unres


def md_cell(s):
    return short(s, 150).replace('|', '/')


def text_blocks(R, cd):
    cls, tier, chg_pdf, chg_first, unres = summary(R, cd)
    L = []
    L.append('## %s (2026-11-16) DELEGATED DECISION: resolution of the 47 conflicts by research under the owner\'s order (reversible by the owner; NOT an owner decision on any default; PENDING OWNER confirmation)' % BLOCK)
    L.append('Authority: %s. Method: GOVERNANCE/conflicts/PLAN.md; each conflict has a resolution file (GOVERNANCE/conflicts/resolutions/C-nnn.json, validated by tools/bt/conflicts/validate_resolution.py --all --complete) with every position, its witness, date, vantage, clock, tier and the reason it was not chosen. Supersedes the first delegated defaults of 2026-11-11 (DEC-DELEG-A), which stay as previous_default and as selectable scenarios in decisions/conflict_defaults.json (version 2).' % OWNER_WORDS)
    L.append('Counts: class gap %d, irreducible %d, settled %d, weighted %d; tier documented %d, inferred %d, plausible-procedural %d, open gap %d. The plan\'s recommended value and every other value stay selectable; nothing is deleted; times are local and no row corrects the 20-minute clock difference unless a source says so. A window or gap is shown in the product as a window or a gap, never as a made-up instant.' % (
        cls.get('gap', 0), cls.get('irreducible', 0), cls.get('settled', 0), cls.get('weighted', 0), tier.get('documented', 0), tier.get('inferred', 0), tier.get('plausible-procedural', 0), tier.get('open gap', 0)))
    L.append('')
    L.append('### Defaults that changed against the PDF (holds is not yes): %d of 47' % len(chg_pdf))
    L.append('| id | PDF value | new default | why |')
    L.append('|---|---|---|---|')
    for a in chg_pdf:
        L.append('| %s | %s | %s | %s |' % (a[0], md_cell(a[1]), md_cell(a[2]), md_cell(a[3])))
    L.append('')
    L.append('### Defaults that changed against the first delegated default of 2026-11-11 (holds is not yes): %d of 47' % len(chg_first))
    L.append('| id | first delegated default | new default | why |')
    L.append('|---|---|---|---|')
    for a in chg_first:
        L.append('| %s | %s | %s | %s |' % (a[0], md_cell(a[1]), md_cell(a[2]), md_cell(a[3])))
    L.append('')
    L.append('### Left as gap or irreducible (window or range shown; failed searches in each resolution file): %d of 47' % len(unres))
    L.append('| id | class | default shown | failed searches (count; first) |')
    L.append('|---|---|---|---|')
    for cid, c, new, fs in unres:
        f0 = fs[0] if fs else {}
        L.append('| %s | %s | %s | %d; %s |' % (cid, c, md_cell(new), len(fs), md_cell('%s: %s (%s)' % (f0.get('where', ''), f0.get('query', ''), f0.get('outcome', '')))))
    L.append('')
    clamped = [(cid, cd['conflicts'][cid]['drawn_clamped']) for cid in R if cd['conflicts'][cid].get('drawn_clamped')]
    L.append('### Owner decisions left open: the resolution\'s instant is earlier than an arrival gate floor (the floor is NOT moved; the viewer draws at the floor): %d' % len(clamped))
    for cid, c in clamped:
        L.append('- %s: resolution instant %s, gate floor %s (rows %s). To draw at the resolution\'s instant the owner must lower the floor; no gate was edited.' % (cid, c['resolution_at'], c['floor'], ', '.join(c['rows'])))
    L.append('- C-023: no hour is recorded for Stuart or for his brigades; Hampton was at Hunterstown before sundown (Green, Hampton), so the arrival gate floor 19:32 of cs-cav-hampton is later than the record (resolution C-023, gate Q04.6). The floor is not moved; the owner decides.')
    L.append('')
    L.append('Q04 floors (Pickett 04:36, Stuart 19:32) are not moved by this decision. Where a new default is earlier than a Q04 floor, or a floor is later than the record, the resolution says so and the point is an owner decision (see the owner notes in the resolution files); no gate was lowered or edited. Every alternative stays selectable in the viewer with the reason it was not chosen.')
    return '\n'.join(L) + '\n'


def append_once(path, marker, text):
    """Append the block; when it is already there (it is the last block of the file) it is replaced by the regenerated text."""
    cur = open(path, encoding='utf-8').read()
    if marker in cur:
        i = cur.index('\n' + marker)
        if cur[i + 1:] .count('\n## ') != 0:
            raise SystemExit('%s is not the last block of %s: refusing to rewrite' % (marker, path))
        if cur[:i] + '\n' + text == cur or cur[:i + 1] + '\n' + text == cur:
            return False
        open(path, 'w', encoding='utf-8').write(cur[:i].rstrip('\n') + '\n')
        cur = open(path, encoding='utf-8').read()
    with open(path, 'a', encoding='utf-8') as f:
        if not cur.endswith('\n'):
            f.write('\n')
        f.write('\n' + text)
    return True


def main():
    check = '--check' in sys.argv
    R = load_resolutions()
    cd = json.load(open(DEFS, encoding='utf-8'))
    new = build_defaults(cd, R)
    probs = verify(new, R)
    if probs:
        print('\n'.join(probs))
        sys.exit(1)
    if check:
        same = json.dumps(new, sort_keys=True) == json.dumps(cd, sort_keys=True)
        print('conflict_defaults.json is current' if same else 'conflict_defaults.json differs')
        sys.exit(0 if same else 1)
    json.dump(new, open(DEFS, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    open(DEFS, 'a').write('\n')
    set_register(R, False)
    txt = text_blocks(R, new)
    a = append_once(os.path.join(G, 'decision_log.md'), '## ' + BLOCK + ' ', txt)
    b = append_once(os.path.join(G, 'decisions', 'DELEGATED-DECISIONS-2026-11-11.md'), '## ' + BLOCK + ' ', txt)
    print('defaults v2 written; register and structured set to %s; decision_log appended: %s; delegated decisions appended: %s' % (STATUS, a, b))


if __name__ == '__main__':
    main()
