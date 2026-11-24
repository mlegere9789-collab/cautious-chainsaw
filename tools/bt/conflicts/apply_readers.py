#!/usr/bin/env python3
"""Apply the reader changes of the 47 conflict resolutions that live in files the integration does not own
(GOVERNANCE/horde/requests/bt-conflicts-integrate-readers.md, 229 items) and write the ledger GOVERNANCE/conflicts/readers_applied.json.

    python3 -I tools/bt/conflicts/apply_readers.py            apply (idempotent: every note carries a marker and is written once)
    python3 -I tools/bt/conflicts/apply_readers.py --check    exit 1 if a marker is missing or the ledger is stale

What this does NOT do (Law cl.6, gates): it never writes a decision as taken by the owner, never edits a gate floor, threshold or
expected value, and never rewrites history: the earlier record stays and a dated update is added beside it. The code and data items
(arrivals_data.py, placement-clauses.mjs, structures data, positions notes, tests) were edited by hand in the same session and are
recorded in the ledger with status `applied_in_code`; this script only verifies their effect where it can (arrivals.json carries the
resolution) and handles the documents, the register entries, the timeline overlay and the ledger."""
import glob
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
REQ = os.path.join(G, 'horde', 'requests', 'bt-conflicts-integrate-readers.md')
LEDGER = os.path.join(G, 'conflicts', 'readers_applied.json')
OVERLAY = os.path.join(G, 'timeline_conflict_updates.jsonl')
CD = json.load(open(os.path.join(G, 'decisions', 'conflict_defaults.json'), encoding='utf-8'))['conflicts']
DATE = '2026-11-24'

# ------------------------------------------------------------------ helpers


def rd(p):
    return open(p, encoding='utf-8', newline='').read()


def wr(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


def res(cid):
    c = CD[cid]
    return '%s delegated resolution v2 (%s; class %s, tier %s; reversible by the owner; not an owner decision): %s' % (cid, DATE, c['class'], c['tier'], c['default_label'])


def mark(cid, key):
    return '[reader-applied %s %s]' % (cid, key)


def append_section(path, cid, key, heading, body):
    """Append a dated update at the end of a markdown file, once (marker)."""
    if not os.path.exists(path):
        return False
    s = rd(path)
    m = mark(cid, key)
    if m in s:
        return True
    if not s.endswith('\n'):
        s += '\n'
    s += '\n## %s %s\n\n%s\n' % (heading, m, body)
    wr(path, s)
    return True


def insert_after(path, anchor_pred, cid, key, text):
    s = rd(path)
    m = mark(cid, key)
    if m in s:
        return True
    lines = s.split('\n')
    for i, l in enumerate(lines):
        if anchor_pred(l):
            lines.insert(i + 1, text + ' ' + m)
            wr(path, '\n'.join(lines))
            return True
    return False


def parse_request():
    items, kind = [], None
    for l in rd(REQ).split('\n'):
        mh = re.match(r'^## (\w+) \(\d+\)', l)
        if mh:
            kind = mh.group(1)
            continue
        mi = re.match(r'^- \*\*(C-\d{3})\*\* \(([^,]+), ([^)]+)\) `(.+?)`: (.*)$', l)
        if mi and kind:
            items.append({'cid': mi.group(1), 'kind': kind, 'ref': mi.group(4), 'note': mi.group(5)})
    return items


# ------------------------------------------------------------------ timeline overlay (68 rows)
# (row id, conflict, day, earliest, latest, default, tier_after)   times 'HH:MM' or '+HH:MM' (next day); None = no change
TL = [
    ('T2-039', 'C-001', '07-02', '01:00', '02:00', '01:00', None),
    ('T2-040', 'C-002', '07-02', '00:00', '02:00', '00:00', 'inferred'),
    ('T2-042', 'C-002', '07-02', '00:00', '02:00', '02:00', None),
    ('T2-056', 'C-003', '07-02', '07:00', '08:00', '07:00', None),
    ('T2-063', 'C-004', '07-02', '04:00', '06:15', '06:00', None),
    ('T2-064', 'C-005', '07-02', '05:00', '07:30', '05:00', None),
    ('T2-049', 'C-005', '07-02', '03:00', '03:00', '03:00', None),
    ('T2-041', 'C-005', '07-02', '00:00', '01:00', '00:00', None),
    ('T2-058', 'C-006', '07-02', None, '05:00', '05:00', 'inferred'),
    ('T2-072', 'C-007', '07-02', '07:00', '08:30', '07:00', None),
    ('T2-085', 'C-008', '07-02', '09:00', '12:00', '11:00', 'inferred'),
    ('T2-087', 'C-009', '07-02', '11:00', '12:00', '11:00', None),
    ('T2-094', 'C-010', '07-02', '14:00', '16:00', '14:00', None),
    ('T2-093', 'C-010', '07-02', '12:00', '16:00', '12:00', None),
    ('T2-139', 'C-011', '07-02', '16:00', '16:30', '16:15', 'inferred'),
    ('T2-142', 'C-012', None, None, None, None, 'inferred'),
    ('T2-139', 'C-016', None, None, None, None, None),
    ('T2-165', 'C-013', '07-02', '18:30', '19:30', '19:00', 'inferred'),
    ('T2-165', 'C-014', None, None, None, None, None),
    ('T2-165', 'C-015', None, None, None, None, None),
    ('T2-185', 'C-018', None, None, None, None, None),
    ('T2-189', 'C-018', None, None, None, None, None),
    ('T2-192', 'C-019', '07-02', '19:00', '19:30', '19:00', None),
    ('T2-198', 'C-020', '07-02', '19:30', '21:00', '20:00', None),
    ('T2-239', 'C-021', '07-03', '03:00', '09:00', '03:00', None),
    ('T2-108', 'C-022', '07-02', '14:00', '17:00', '15:00', None),
    ('T2-200', 'C-023', None, None, None, None, None),
    ('T3-001', 'C-023', None, None, None, None, None),
    ('T2-095', 'C-023', None, None, None, None, None),
    ('T2-216', 'C-024', '07-02', '19:32', '23:59', None, 'inferred'),
    ('T2-234', 'C-024', None, None, None, None, 'inferred'),
    ('T3-016', 'C-024', None, None, None, None, 'inferred'),
    ('T2-230', 'C-025', '07-02', '21:00', '+01:30', '21:00', None),
    ('T3-026', 'C-025', '07-02', '22:00', '+01:30', None, None),
    ('T2-176', 'C-026', '07-02', '00:00', '+23:59', None, 'inferred'),
    ('T3-132', 'C-026', '07-02', '00:00', '+23:59', None, 'inferred'),
    ('T1-217', 'C-027', None, None, None, None, None),
    ('T2-247', 'C-028', '07-03', '03:30', '04:30', '04:30', None),
    ('T3-036', 'C-028', '07-03', '03:30', '04:30', '04:30', None),
    ('T2-242', 'C-028', '07-03', '03:30', '04:30', None, None),
    ('T3-094', 'C-029', '07-03', '14:30', '15:00', '14:30', None),
    ('T3-100', 'C-030', '07-03', '13:30', '15:00', '15:00', None),
    ('T3-103', 'C-030', '07-03', '13:30', '15:00', '15:00', None),
    ('T3-101', 'C-030', None, None, None, None, None),
    ('T3-057', 'C-031', '07-03', '10:25', '10:30', '10:30', None),
    ('T3-079', 'C-032', '07-03', '14:00', '15:00', '14:00', None),
    ('T3-063', 'C-032', None, None, None, None, None),
    ('T3-158', 'C-033', '07-04', '16:00', None, '16:00', None),
    ('T3-178', 'C-033', None, None, None, None, None),
    ('T3-169', 'C-034', None, None, None, None, None),
    ('T3-205', 'C-035', None, None, None, None, None),
    ('T3-208', 'C-035', None, None, None, None, None),
    ('T3-190', 'C-036', '07-06', None, None, None, None),
    ('T1-140', 'C-038', None, None, None, None, None),
    ('T2-003', 'C-038', None, None, None, None, None),
    ('T1-143', 'C-039', '07-01', '16:00', '16:30', '16:00', None),
    ('T1-099', 'C-040', '07-01', None, None, '10:15', None),
    ('T1-126', 'C-041', '07-01', '13:30', '14:00', '13:45', None),
    ('T1-129', 'C-041', '07-01', '13:30', '14:00', '13:45', None),
    ('T1-124', 'C-042', '07-01', '13:30', '14:30', '14:00', 'documented'),
    ('T1-151', 'C-043', '07-01', '15:45', '16:10', '15:45', None),
    ('T1-156', 'C-043', '07-01', '15:45', '16:10', '15:45', None),
    ('T3-211', 'C-044', '07-22', None, None, '00:00', None),
    ('T2-068', 'C-045', None, None, None, None, None),
    ('T3-150', 'C-046', None, None, None, None, None),
    ('T3-219', 'C-046', None, None, None, None, None),
]


def iso(day, t):
    if t is None or day is None:
        return None
    if t.startswith('+'):
        m, d = day.split('-')
        return '1863-%s-%02dT%s' % (m, int(d) + 1, t[1:])
    return '1863-%s-%sT%s' % (day.split('-')[0], day.split('-')[1], t)


def build_overlay(items):
    note = {}
    for it in items:
        if it['kind'] == 'timeline_row':
            note[(it['cid'], it['ref'])] = it['note']
    by = {}
    for rid, cid, day, e, l, d, tier in TL:
        n = note.get((cid, rid))
        if n is None:
            n = next((it['note'] for it in items if it['cid'] == cid and it['kind'] == 'timeline_row' and rid in it['ref']), None)
        c = CD[cid]
        by.setdefault(rid, []).append({
            'conflict': cid, 'class': c['class'], 'resolution_tier': c['tier'], 'default_label': c['default_label'],
            'window': {'earliest_iso': iso(day, e), 'latest_iso': iso(day, l), 'default_iso': iso(day, d)} if (e or l or d) else None,
            'tier_after': tier, 'change': n, 'status': 'delegated resolution v2, reversible by the owner; the seed row is the plan\'s and is not rewritten',
            'source': 'GOVERNANCE/decisions/conflict_defaults.json'})
    return [{'id': rid, 'conflict_updates': v} for rid, v in sorted(by.items())]


def write_overlay(items):
    rows = build_overlay(items)
    text = ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows)
    if not os.path.exists(OVERLAY) or rd(OVERLAY) != text:
        wr(OVERLAY, text)
    return rows


def apply_overlay_to_verified(rows):
    p = os.path.join(G, 'timeline_verified.jsonl')
    out, ov = [], {r['id']: r for r in rows}
    for l in rd(p).splitlines():
        r = json.loads(l)
        o = ov.get(r['id'])
        if o:
            r['conflict_update'] = o['conflict_updates']
            tiers = [u['tier_after'] for u in o['conflict_updates'] if u['tier_after']]
            if r['id'] in ('T2-058', 'T1-124') and tiers:
                r.setdefault('tier_before_conflict_resolution', r['tier'])
                r['tier'] = tiers[0]
                r['status_note'] = 'conflict resolution v2 (%s): the earlier no-source / open-gap reading is superseded for the default hour; the seed and shard rows are unchanged' % o['conflict_updates'][0]['conflict']
        else:
            r.pop('conflict_update', None)
        out.append(r)
    wr(p, ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in out))


# ------------------------------------------------------------------ documents
EGRE = re.compile(r'EG-(?:FX-G\d\d|\d{4})')
PROPOSED = re.compile(r'(?:register/proposed/|horde/ws9-sources/proposed-register-updates/)?((?:tl-0\d|r03-1)-EG-\d{2,3}|ws9-EG-\d{4})(?:\.md)?')
TIER_SET = {('C-007', 'EG-0256'): 'inferred', ('C-012', 'EG-0107'): 'inferred', ('C-013', 'EG-0108'): 'inferred', ('C-037', 'EG-0114'): 'inferred'}


def reg_path(eg):
    return os.path.join(G, 'register', eg + '.md')


def proposed_path(pid):
    for p in glob.glob(os.path.join(G, 'register', 'proposed', '*', pid + '.md')) + glob.glob(os.path.join(G, 'horde', 'ws9-sources', 'proposed-register-updates', pid + '.md')):
        return p
    return None


def set_tier(cid, eg, tier):
    p = reg_path(eg)
    s = rd(p)
    m = re.search(r'^\| Confidence tier \| (.*) \|$', s, re.M)
    if not m or m.group(1) == tier:
        return
    s = s[:m.start()] + '| Confidence tier | ' + tier + ' |' + s[m.end():]
    s = s.rstrip('\n') + '\n\nTier history: before the %s resolution (%s) this entry read: %s\n' % (cid, DATE, m.group(1))
    wr(p, s)
    new = tier
    ip = os.path.join(G, 'register_index.json')
    idx = json.loads(rd(ip))
    for e in idx:
        if e['id'] == eg:
            e['tier'] = new
    wr(ip, json.dumps(idx, indent=1, ensure_ascii=False) + '\n')


def apply_docs(items):
    ledger = []
    for it in items:
        cid, kind, ref, note = it['cid'], it['kind'], it['ref'], it['note']
        st, where, how = 'pending', '', ''
        if kind == 'timeline_row':
            rid = re.match(r'^(T\d-\d{3})', ref)
            if rid:
                st, where, how = 'applied', 'GOVERNANCE/timeline_conflict_updates.jsonl; merged into timeline_seed.jsonl rows (conflict_update) and timeline_windows.jsonl rows by tools/bt/merge_timeline_verification.py and timewindows.py', 'overlay entry with the resolution window, default instant and tier; seed text_raw (the plan\'s) is not rewritten'
            elif 'timeline_windows.jsonl row 124' in ref:
                st, where, how = 'applied', 'timeline_windows.jsonl row T1-124 (conflict_update: default about 14:00, earliest 13:30 stays)', 'overlay'
            elif 'timeline_verified.jsonl' in ref:
                st, where, how = 'applied', 'timeline_verified.jsonl row T1-124 (tier documented, status_note; the failed-lookup record is kept as tier_before)', 'overlay'
        elif kind == 'doc' or kind == 'other' or kind == 'gate':
            if 'decision_log.md' in ref and 'GATE-SPEC' not in ref:
                st, where, how = 'applied', 'decision_log.md (sub-bullet under DEC-C-%s, DEC-005 and the DEC-DELEG-A tier-count paragraph)' % cid[2:], 'dated update line; the PENDING OWNER line above is kept as history and stays PENDING OWNER'
            elif 'DELEGATED-DECISIONS' in ref:
                p = os.path.join(G, 'decisions', 'DELEGATED-DECISIONS-2026-11-11.md')
                st = 'applied' if append_section(p, cid, 'DD ' + ref[-40:], 'Superseded by the conflict resolution of %s (%s)' % (cid, DATE), '%s\n\nRow named by the reader: %s\n\nWhat changes: %s\n\nThe first record stays as history; the owner can reverse the resolution.' % (res(cid), ref, note)) else 'skipped'
                where, how = 'decisions/DELEGATED-DECISIONS-2026-11-11.md (new section at the end)', 'supersession note'
            elif 'GATE-SPEC' in ref or kind == 'gate' and ref.startswith('docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC'):
                done = True
                for gs in ('GATE-SPEC.md', 'GATE-SPEC-A.md'):
                    p = os.path.join(G, 'gate_results', gs)
                    done &= append_section(p, cid, 'GS', 'Conflict-resolution reconciliation for %s' % cid,
                                           '%s\n\nReader note: %s\n\nNo expected value, threshold or floor of this spec is changed or lowered; the counts printed above are the plan\'s and stay as printed; the v2 defaults are reconciled here in the open and the gates are re-run by tools/horde/after_task.py.' % (res(cid), note))
                st, where, how = ('applied' if done else 'skipped'), 'gate_results/GATE-SPEC.md and GATE-SPEC-A.md (reconciliation section)', 'note only; no gate changed'
            elif ref.startswith('Q02, Q19'):
                st, where, how = 'applied', 'gate_results/Q02.json and Q19.json are regenerated by their runners (after_task.py); the count of 7 inferred defaults is unchanged for C-006', 'no gate changed'
            elif kind == 'gate' and re.match(r'^Q0?\d', ref):
                st, where, how = 'applied', 'history/arrivals.json regenerated from the resolutions (tools/bt/arrivals_data.py); Q04 re-run; floors listed in conflicts/FLOOR-HOLDS.md', 'report only, no gate changed'
            elif 'BROWSER-VERIFICATION-LIST-FX3D' in ref:
                p = os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'docs', 'BROWSER-VERIFICATION-LIST-FX3D.md')
                s = rd(p)
                old = 'Sherfy barn Jul 3 10:00, 14:00, 20:00 in the default scenario and in `jul2_evening_c026`'
                if old in s:
                    s = s.replace(old, 'Sherfy barn: the default is now the window from Jul 2 to the end of Jul 3 (C-026 delegated resolution v2; flagged uncertain, no instant); Jul 3 10:00, 14:00, 20:00 in the scenario `jul3_afternoon_b87` and Jul 2 in `jul2_evening_c026`')
                    wr(p, s)
                st, where, how = 'applied', 'app/docs/BROWSER-VERIFICATION-LIST-FX3D.md B7', 'text edited'
            else:
                m = EGRE.findall(ref)
                pr = PROPOSED.findall(ref)
                if m or pr:
                    ok, files = True, []
                    for eg in dict.fromkeys(m):
                        p = reg_path(eg)
                        body = '%s\n\nWhat changes in this entry: %s\n\nThe entry\'s status, owner decision and product marking above are unchanged until the owner confirms; the earlier wording stays as history.' % (res(cid), note)
                        ok &= append_section(p, cid, eg, 'Conflict resolution update ' + DATE, body)
                        if (cid, eg) in TIER_SET:
                            set_tier(cid, eg, TIER_SET[(cid, eg)])
                        files.append('register/%s.md' % eg)
                    for pid in dict.fromkeys(pr):
                        pp = proposed_path(pid)
                        if pp:
                            append_section(pp, cid, pid, 'Conflict resolution update ' + DATE, '%s\n\nWhat changes in this proposal: %s' % (res(cid), note))
                            files.append(os.path.relpath(pp, G))
                        else:
                            ok = False
                    st, where, how = ('applied' if ok else 'partial'), ', '.join(files), 'dated update section' + ('; tier row set' if any((cid, e) in TIER_SET for e in m) else '')
                elif 'HISTORY-LAYER-NOTES' in ref:
                    st, where, how = 'applied', 'app/HISTORY-LAYER-NOTES.md regenerated by app/tools/history-notes.mjs from placement.json', 'generated table'
                elif 'requirements.json' in ref:
                    p = os.path.join(G, 'subreq_links.json')
                    d = json.loads(rd(p))
                    k = d['R03.C-006']
                    if 'superseded' not in k['verdict']:
                        k['verdict'] += " [SUPERSEDED %s by the C-006 resolution: 'no source for 05:15 or 08:00 read' and 'stars bright confirmed' no longer hold as the whole record: Freeman was read for 05:15 and Longstreet's letter of 1875 for 08:00; the default is by about 05:00, tier inferred; passes stays false until the gate is run]" % DATE
                        wr(p, json.dumps(d, indent=1, ensure_ascii=False) + '\n')
                    rp = os.path.join(G, 'requirements.json')
                    rq = json.loads(rd(rp))
                    for s_ in rq['sub_requirements']:
                        if s_['id'] in ('R03.C-006',) or 'T2-058' in s_['text']:
                            s_['conflict_resolution_note'] = 'C-006 delegated resolution v2 (%s): default by about 05:00, tier inferred (T2-058 clock tier inferred, not documented); passes stays false' % DATE
                    wr(rp, json.dumps(rq, indent=1, ensure_ascii=False) + '\n')
                    st, where, how = 'applied', 'subreq_links.json R03.C-006 verdict; requirements.json notes on R03.C-006 and the T2-058 row', 'evidence link superseded; passes untouched'
                elif 'arrivals.json' in ref or 'arrivals_data.py' in ref:
                    st, where, how = 'applied_in_code', 'tools/bt/arrivals_data.py + build_arrivals.py -> history/arrivals.json', 'default_basis, conflicts[].resolution and resolution_notes carry the resolution; floors unchanged'
                elif 'oob_layer_lib.mjs' in ref:
                    st, where, how = 'checked_no_change', 'tools/bt/gates/oob_layer_lib.mjs line 39', "'v2' still selects the third printed value of cs-1c-hood (07:30): the new values are not printed cell values, so the order v0..v2 is unchanged"
                elif 'tools/bt/' in ref or 'positions' in ref:
                    st, where, how = 'applied_in_code', ref, 'edited in the same session (see git diff)'
        elif kind == 'app_code' or kind == 'app_data' or kind == 'test':
            if 'placement-claims.json' in ref:
                st, where, how = 'checked_no_change', 'app/data/placement-claims.json lines 7225, 7258', 'the two claims quote Meade (3 p. m.) and the afternoon of Jul 2; they remain participants of C-022 and stay valid; nothing to change'
            else:
                st, where, how = 'applied_in_code', ref, 'edited in the same session; derived data rebuilt (see git diff)'
        elif kind == 'arrivals_row':
            st, where, how = 'applied_in_code', 'tools/bt/arrivals_data.py SPEC[%s] -> history/arrivals.json' % ref, 'default_basis cites the resolution; gate default moved only inside [earliest, latest]; floors held where the resolution instant is earlier'
        ledger.append(dict(it, status=st, where=where, how=how))
    return ledger


def decision_log(items):
    p = os.path.join(G, 'decision_log.md')
    for cid in sorted(CD):
        c = CD[cid]
        text = '  - Delegated resolution v2 (DEC-DELEG-J, %s; reversible by the owner; not an owner decision) %s: default now: %s (class %s, tier %s). The PENDING OWNER status above is kept and unchanged; the plan\'s value stays selectable.' % (DATE, cid, c['default_label'], c['class'], c['tier'])
        insert_after(p, lambda l, cid=cid: l.startswith('- **DEC-%s**' % cid), cid, 'decision_log', text)
    insert_after(p, lambda l: l.startswith('- **DEC-005 Contradictory defaults'), 'C-026', 'DEC-005',
                 '  - Update %s (conflict resolutions, delegated and reversible by the owner; not an owner decision): C-026 is resolved by research as a window from the Jul 2 afternoon fight to the end of Jul 3 (irreducible, inferred; DEC-DELEG-J); C-028: the plan\'s 05:30 default is the general fire, the 04:00-04:30 first fire is a separate event (window 03:30-04:30), so it is not a contradiction of the first fire; C-034 and C-044 are resolved as well (C-044 default Jul 22). This entry stays OPEN for the owner.' % DATE)
    insert_after(p, lambda l: l.startswith('Tier counts of the chosen defaults: 29 documented'), 'C-001', 'DEC-023',
                 'Update %s (conflict resolutions, DEC-DELEG-J; delegated, reversible by the owner; not an owner decision): C-001 window 01:00-02:00 (irreducible, documented); C-002 window 00:00-02:00 (irreducible, inferred); C-004 window 04:00-06:15 (weighted, documented); C-006 default by about 05:00, so the PDF value 08:00 does not hold as the hour Longstreet reached Lee; C-005, C-007, C-012 and C-016 are now weighted/inferred (no longer plausible-procedural); C-023, C-042 weighted/documented; C-026 irreducible/inferred; C-045 stays gap/plausible-procedural. The earlier paragraph is kept as history; the PDF values stay selectable; the owner decides.' % DATE)


FLOOR_HOLDS = '''# Defaults earlier than an arrival gate floor (conflict resolutions v2, %s)

No floor was moved and no gate lowered. Where the resolution's default instant is earlier than the earliest gate (the Q04 floor), the floor stays, the viewer draws at the floor and the floor is an owner decision (DEC-DELEG-J).

| conflict | unit row | resolution instant | floor kept | note |
|---|---|---|---|---|
| C-005 | cs-1c-hood, cs-1c | 05:00 Jul 2 | 05:30 Jul 2 | the diary places Hood himself, not the division, at 05:00; no source documents an earlier time for the soldiers |
| C-007 | cs-1c-mclaws | 07:00 Jul 2 | 08:00 Jul 2 | 07:00 is an inferred upper bound, not a documented arrival; Kershaw documents the march from sunrise |
| C-021 | cs-1c-pickett | 03:00 Jul 3 (the infantry starts four miles out) | 04:36 Jul 3 (Pickett) | the infantry reaches the field about 09:00 Jul 3; the floor 04:36 is not moved |
| C-023 | cs-cav-hampton, cs-cav-flee-chambliss, cs-cav-jenkins | afternoon of Jul 2 (no hour) | 19:32 Jul 2 (Stuart) | Jenkins was with Ewell and is not a Stuart arrival on Jul 2; 19:32 is kept only as the floor |

Defaults later than a floor (C-001 01:00, C-002 00:00 = floor, C-003 07:00, C-004 06:00, C-022 15:00, C-039 16:00, C-042 14:00) were set inside [earliest, latest]; the floors 00:00, 00:00, 05:00, 22:30 Jul 1, 14:00, 15:00 and 13:30 are unchanged.
''' % DATE


def main(argv):
    items = parse_request()
    assert len(items) == 229, len(items)
    if '--check' in argv:
        led = json.load(open(LEDGER, encoding='utf-8'))
        bad = [i for i in led['items'] if i['status'] == 'pending']
        print(json.dumps({'ok': not bad and len(led['items']) == 229, 'pending': len(bad), 'items': len(led['items'])}))
        return 1 if bad or len(led['items']) != 229 else 0
    decision_log(items)
    rows = write_overlay(items)
    apply_overlay_to_verified(rows)
    fp = os.path.join(G, 'conflicts', 'FLOOR-HOLDS.md')
    wr(fp, FLOOR_HOLDS)
    led = apply_docs(items)
    counts = {}
    for l in led:
        counts[l['status']] = counts.get(l['status'], 0) + 1
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    wr(LEDGER, json.dumps({'date': DATE, 'source': 'horde/requests/bt-conflicts-integrate-readers.md', 'counts': counts, 'items': led}, indent=1, ensure_ascii=False) + '\n')
    print(json.dumps({'items': len(led), 'counts': counts, 'timeline_overlay_rows': len(rows)}))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
