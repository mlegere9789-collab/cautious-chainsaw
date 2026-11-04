"""Build docs/battle-theatre/history/positions/POSITIONS_B_SUMMARY.md from positions_B.jsonl (scope B: Union II, III, XII Corps).

All counts, per-brigade coverage tables and conflict groups are computed from the claim file; the hand-written front matter comes from
tools/bt/positions_summary_B_front.md and the helper notes notes_B_*.md are appended verbatim.

    PYTHONIOENCODING=utf-8 python -I tools/bt/positions_B_summary.py
"""
import os, sys, json, glob, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
POS = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
UNITS = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json')
SCOPE = 'B'


def load():
    with open(os.path.join(POS, 'positions_%s.jsonl' % SCOPE), encoding='utf-8') as f:
        rows = [json.loads(l) for l in f if l.strip()]
    with open(UNITS, encoding='utf-8') as f:
        units = {u['id']: u for u in json.load(f)['units']}
    return rows, units


def descendants(uid, units):
    out = [uid]
    for c in units[uid].get('children', []) or []:
        out += descendants(c, units)
    return out


def ctx(r):
    """claims the re-check marked as context only (the passage speaks of another command): not counted in coverage verdicts"""
    return str(r.get('unit_attribution') or '').startswith('context')


def tkey(r):
    w = r['when']
    return w['t_iso'] or ((w['date'] + 'T??:??') if w['date'] else None)


def span(rows):
    ks = sorted(k for k in (tkey(r) for r in rows) if k)
    return (ks[0], ks[-1]) if ks else (None, None)


def verdict(own, parents=()):
    cl = [r for r in own if r['tier'] != 'open gap']
    if not cl:
        return 'none', 'no OR passage found (open gap)'

    def has(pred):
        return any(pred(r) for r in cl)
    appr = has(lambda r: r['kind'] in ('march', 'arrival_road', 'night_position') and r['when']['date'] <= '1863-07-02')
    j2 = has(lambda r: r['when']['date'] == '1863-07-02' and r['kind'] in ('position', 'engagement', 'movement', 'night_position'))
    j3 = has(lambda r: r['when']['date'] == '1863-07-03' and r['kind'] in ('position', 'engagement', 'movement', 'night_position'))
    dep = has(lambda r: r['when']['date'] >= '1863-07-04' and r['kind'] in ('departure', 'march', 'movement'))
    pdep = any(r['when']['date'] >= '1863-07-04' and r['kind'] in ('departure', 'march', 'movement') and r['tier'] != 'open gap' for r in parents)
    miss = [n for n, ok in (('approach (Jun 28-Jul 2 march/bivouac/arrival)', appr), ('Jul 2 field position/action', j2), ('Jul 3 position/action', j3),
                            ('departure (Jul 4+)' + (' [only a corps/division claim]' if pdep else ''), dep)) if not ok]
    if not miss:
        return 'full', 'approach, Jul 2, Jul 3 and departure all have OR claims'
    return 'partial', 'missing: ' + '; '.join(miss)


def roadflag(own, parents):
    def road(r):
        return bool(r['place'].get('direction_or_road')) and r['kind'] in ('arrival_road', 'march', 'departure', 'night_position', 'position') and r['when']['date'] <= '1863-07-02'
    return [r for r in own if road(r)], [r for r in parents if road(r)]


def conflict_groups(rows):
    by = {r['claim_id']: r for r in rows}
    adj = collections.defaultdict(set)
    for r in rows:
        for c in r['conflicts_with']:
            if c in by:
                adj[r['claim_id']].add(c)
                adj[c].add(r['claim_id'])
    seen, groups = set(), []
    for k in sorted(adj):
        if k in seen:
            continue
        stack, comp = [k], []
        while stack:
            x = stack.pop()
            if x in seen:
                continue
            seen.add(x)
            comp.append(x)
            stack += list(adj[x] - seen)
        groups.append(sorted(comp))
    return groups, by


def main():
    rows, units = load()
    out = []
    P = out.append
    n = len(rows)
    tiers = collections.Counter(r['tier'] for r in rows)
    kinds = collections.Counter(r['kind'] for r in rows)
    P('## Generated tables (from positions_B.jsonl)\n')
    P('%d claim records: %d documented, %d inferred, %d open gap. Kinds: %s. Reports cited: %d distinct records. Claims in a conflict group: %d. Claims with an interpolated page: %d. Claims flagged ocr_uncertain: %d. Every quote is under 15 words and was re-verified by code against the OR text at build time (`tools/bt/positions_claims.py`).\n' % (
        n, tiers['documented'], tiers['inferred'], tiers['open gap'], ', '.join('%s %d' % kv for kv in sorted(kinds.items())),
        len({r['source']['report_id'] for r in rows if r['source']['report_id']}), sum(1 for r in rows if r['conflicts_with']),
        sum(1 for r in rows if r['source']['interpolated']), sum(1 for r in rows if r['ocr_uncertain'])))
    P('### Counts by corps and division\n')
    P('| Unit | Claims | Documented | Inferred | Open gap | Earliest | Latest |')
    P('|---|---|---|---|---|---|---|')
    for rid in ('us-2c', 'us-3c', 'us-12c'):
        root = units[rid]
        for uid in [rid] + [d for d in root.get('children', []) if units[d]['level'] in ('division', 'artillery_brigade')]:
            ids = set(descendants(uid, units))
            rr = [r for r in rows if r['unit_id'] in ids]
            e, l = span(rr)
            P('| %s%s %s | %d | %d | %d | %d | %s | %s |' % ('' if uid == rid else '&nbsp;&nbsp;', uid, units[uid]['name'], len(rr), sum(r['tier'] == 'documented' for r in rr),
                                                          sum(r['tier'] == 'inferred' for r in rr), sum(r['tier'] == 'open gap' for r in rr), e, l))
    P('')
    P('### Per brigade, division and artillery brigade: coverage\n')
    P('"Own" = claims on the unit itself plus its regiments, battalions and batteries. "Road of approach (own)" = an own claim up to July 2 whose place carries a road phrase (count). "Position on field" = own position/engagement/movement/night_position claims on July 2-3 with a printed place (count). Verdict rule: **full** = own OR claims for approach (June 28 - July 2 march, bivouac or arrival), a July 2 field position/action, a July 3 position/action and a departure on July 4 or later; **partial** = some but not all (what is missing is named); **none** = no OR passage found. This describes the OR record held in the claim file, not a historical judgement.\n')
    P('| Unit | Own claims | Earliest | Latest | Road of approach (own) | Position on field (own) | Verdict | Why |')
    P('|---|---|---|---|---|---|---|---|')
    vc = collections.Counter()
    for rid in ('us-2c', 'us-3c', 'us-12c'):
        root = units[rid]
        targets = [rid]
        for d in root.get('children', []):
            targets.append(d)
            if units[d]['level'] == 'division':
                targets += [c for c in units[d].get('children', []) if units[c]['level'] == 'brigade']
        for t in targets:
            ids = set(descendants(t, units))
            own = [r for r in rows if r['unit_id'] in ids and not ctx(r)]
            parents = []
            p = units[t].get('parent')
            while p:
                parents += [r for r in rows if r['unit_id'] == p and not ctx(r)]
                p = units[p].get('parent')
            cl = [r for r in own if r['tier'] != 'open gap']
            e, l = span(cl)
            ra, rb = roadflag(cl, parents)
            pos = [r for r in cl if r['kind'] in ('position', 'engagement', 'movement', 'night_position') and r['when']['date'] in ('1863-07-02', '1863-07-03') and r['place']['printed']]
            v, why = verdict(own, parents)
            if units[t]['level'] in ('brigade', 'artillery_brigade'):
                vc[v] += 1
            P('| %s %s | %d | %s | %s | %s | %s | %s | %s |' % (t, units[t]['name'], len(cl), e or '-', l or '-',
                ('yes (%d)' % len(ra)) if ra else (('via parent (%d)' % len(rb)) if rb else 'no'), ('yes (%d)' % len(pos)) if pos else 'no', v, why))
    P('')
    P('Brigade-level verdict counts (brigades and artillery brigades only): ' + ', '.join('%s %d' % kv for kv in sorted(vc.items())) + '.\n')
    gaps = [r for r in rows if r['tier'] == 'open gap']
    P('### Open-gap claims (NOT_FOUND recorded with the searches tried): %d\n' % len(gaps))
    for g in gaps:
        P('- **%s** (%s, kind %s): %s' % (g['claim_id'], units[g['unit_id']]['name'], g['kind'], g['note']))
        P('  - searches: ' + ' | '.join(g.get('searches_tried') or []))
        P('  - reports searched: ' + ', '.join(g.get('reports_searched') or []))
    P('')
    P('### Approach claims that decide where units enter the map (June 28 - July 2)\n')
    P('Claims of kind `arrival_road`, plus any claim up to July 2 whose place carries a road phrase. "t" is the literal clock conversion when a clock time is printed; citation is report id and printed page (~ = interpolated page range).\n')
    for rid in ('us-2c', 'us-3c', 'us-12c'):
        P('#### %s %s\n' % (rid, units[rid]['name']))
        ids = set(descendants(rid, units))
        sel = [r for r in rows if r['unit_id'] in ids and r['tier'] != 'open gap' and r['when']['date'] <= '1863-07-02' and (r['kind'] == 'arrival_road' or r['place'].get('direction_or_road'))]
        sel.sort(key=lambda r: (r['unit_id'], tkey(r) or ''))
        for r in sel:
            s = r['source']
            P('- %s | %s | %s | %s | road: %s | place: %s | t=%s | %s p.%s%s' % (r['claim_id'], r['kind'], r['unit_id'], r['when']['printed'] or r['when']['date'], r['place']['direction_or_road'], r['place']['printed'], r['when']['t_iso'], s['report_id'], s['printed_page'], '~' if s['interpolated'] else ''))
        P('')
    groups, by = conflict_groups(rows)
    P('### Conflicts between reports (both values kept; none resolved): %d groups\n' % len(groups))
    P('Each group is a set of claims linked by `conflicts_with` (symmetric).\n')
    for gi, grp in enumerate(groups, 1):
        P('**G%02d** (%d claims)' % (gi, len(grp)))
        for cid in grp:
            r = by[cid]
            s = r['source']
            P('- %s | %s | %s | %s | %s p.%s%s | %s' % (cid, r['unit_id'], r['kind'], r['when']['printed'] or r['when']['date'], s['report_id'], s['printed_page'], '~' if s['interpolated'] else '', r['activity'][:140]))
        P('')
    ocr = [r for r in rows if r['ocr_uncertain']]
    P('### OCR-uncertain claims: %d\n' % len(ocr))
    for r in ocr:
        P('- %s: %s' % (r['claim_id'], (r['note'] or r['activity'])[:180]))
    P('')
    text = '\n'.join(out)
    front = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'positions_summary_B_front.md')
    final = ''
    if os.path.exists(front):
        final += open(front, encoding='utf-8').read().rstrip() + '\n\n---\n\n'
    final += text
    for nf in sorted(glob.glob(os.path.join(POS, 'notes_B_*.md'))):
        final += '\n\n---\n\n## Helper notes: %s\n\n' % os.path.basename(nf) + open(nf, encoding='utf-8').read()
    outp = os.path.join(POS, 'POSITIONS_B_SUMMARY.md')
    with open(outp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(final)
    print('wrote', outp, len(final), 'chars')


if __name__ == '__main__':
    main()
