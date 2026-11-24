"""Propose one register entry per timeline row that is still seeded_unverified and is covered by no open register entry.
Why: gate Q17 needs every timeline row either realized or covered by an open register entry, and CLAUDE.md forbids calling a
row verified without the check. A row that a shard read and found supported/partial/conflicting is still an OPEN verification and
realization gap; it is registered here, in the shard's own words, never as a pass and never as 'verified'.
Output: GOVERNANCE/register/proposed/tl-verify/tl-VP-<row>.md (same shape as the other shard proposals); integrate them with
register_from_proposed.py then link_subreqs.py. Idempotent: rows already covered, and rows whose proposal file exists, are skipped.
Nothing is invented: every value is copied from timeline_seed.jsonl / timeline_verified.jsonl."""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
OUT = os.path.join(G, 'register', 'proposed', 'tl-verify')
J = lambda p: json.load(open(os.path.join(G, p), encoding='utf-8'))
JL = lambda p: [json.loads(l) for l in open(os.path.join(G, p), encoding='utf-8')]
cl = lambda s, n=600: re.sub(r'\s+', ' ', str(s or '')).replace('|', '/').strip()[:n]

def uncovered_rows():
    req = J('requirements.json'); idx = J('register_index.json')
    op = {e['id'] for e in idx if e['status'] != 'closed'}
    sub = {}
    for s in req['sub_requirements']:
        m = re.match(r'Timeline row (T\d-\d+)', s['text'])
        if m and s['requirement_id'] == 'R11': sub[m.group(1)] = s
    return [r for r, s in sub.items() if not set(s['register_ids']) & op]

def main():
    seed = {r['id']: r for r in JL('timeline_seed.jsonl')}
    tv = {r['id']: r for r in JL('timeline_verified.jsonl')}
    os.makedirs(OUT, exist_ok=True); n = 0
    for rid in sorted(uncovered_rows()):
        s = seed[rid]
        verified = s['status'] == 'verified'   # verified rows are still unrealized: Q17 needs a realization or an open entry
        p = os.path.join(OUT, 'tl-VP-%s.md' % rid)
        if os.path.exists(p): continue
        t = tv.get(rid, {}); v = t.get('verdict') or 'no shard verdict'
        conflict = 'conflict' in v
        desc = ('Seed row %s (%s, tier %s) is ' + ('marked verified in the seed but has no passing visual realization record. ' if verified else 'still seeded_unverified; this proposal is not a verification and the row has no visual realization record. ') +
                'The shard reading (%s) gave verdict "%s". Shard note: %s') % (rid, cl(s['time_window_raw'], 80), s['tier'], t.get('shard', 'no shard'), v, cl(t.get('notes'), 500))
        rows = [('ID', 'tl-VP-' + rid), ('Requirement IDs', 'R11, R04'),
                ('Category', 'source conflict (selectable scenario)' if conflict else ('evidence missing (row not yet realized)' if verified else 'evidence missing (row not yet verified or realized)')),
                ('Seed rows', rid), ('Description', desc),
                ('Why literal 100% is not possible or blocked', ('The row is not realized until a realization record passes gate Q17; that has not happened.' if verified else 'The row stays seeded_unverified until a recorded primary-source check marks it verified (CLAUDE.md hard rule); it is not realized until a realization record passes gate Q17. Neither has happened.')),
                ('Evidence searched', 'Shard %s results (timeline_verified.jsonl): citation %s; passage %s. Reading status: %s.' % (t.get('shard', 'none'), cl(t.get('citation'), 300) or 'none recorded', cl(t.get('passage_ref'), 300) or 'none recorded', t.get('status_effective') or t.get('status') or 'none')),
                ('Autonomous substitute applied', 'Row carried at its seed tier (%s), marked unverified; any conflicting values carried as selectable scenarios, no default.' % s['tier']),
                ('Strongest evidence-based reconstruction', 'The shard citation above; nothing added.'),
                ('Confidence tier', s['tier'] if s['tier'] in ('documented', 'inferred', 'plausible-procedural') else 'inferred'),
                ('Competing values', 'See the conflict register and the shard note.' if conflict else '-'),
                ('Product marking', 'Tier glyph on the event; unverified-row marker in the evidence layer.'),
                ('How it would be closed', ('A passing realization record (scene) for the row.' if verified else 'An independent primary-source check recorded in timeline_corrections and the Decision Log, then a passing realization record (scene) for the row.')),
                ('Owner decision requested', 'Default view of competing values, where any (PENDING OWNER; none chosen here).' if conflict else '-'),
                ('Status', 'open (proposed by tools/bt/propose_row_gaps.py)')]
        open(p, 'w', encoding='utf-8').write('# tl-VP-%s: Row %s not yet realized%s\n\n| Field | Content |\n|---|---|\n' % (rid, rid, '' if verified else ' or verified') + ''.join('| %s | %s |\n' % r for r in rows))
        n += 1
    print('row-gap proposals written', n)

if __name__ == '__main__': main()
