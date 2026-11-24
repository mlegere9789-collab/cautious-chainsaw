#!/usr/bin/env python3
"""Daily gain ledger: counts only, read from files, no model involved.

    python3 -I tools/horde/scoreboard.py [--cost USD] [--note TEXT] [--no-append]

Appends one JSON line to docs/battle-theatre/GOVERNANCE/horde/SCOREBOARD.jsonl and prints it with the change against the
previous line of an EARLIER UTC day. Exit status 0 when at least one good metric improved (or no earlier line exists), 3 when
none did (a stalled day: the next task must be the stall diagnosis), 4 when a good metric got worse (a regression to explain).
A metric that cannot be read is null, never guessed. Nothing here claims a requirement is met: the passes flags come from the
gate runners only.
"""
import glob, gzip, json, os, re, subprocess, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
OUT = os.path.join(GOV, 'horde', 'SCOREBOARD.jsonl')


def jload(p):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def governance():
    try:
        r = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'tools', 'bt', 'check_governance.py')], cwd=ROOT, capture_output=True, text=True, timeout=300)
        s = r.stdout
        i = s.find('{')
        d = json.loads(s[i:]) if i >= 0 else None
        return d
    except Exception:
        return None


def gates():
    out, tot = {}, {'PASS': 0, 'FAIL': 0, 'BLOCKED-INPUT': 0, 'N/A': 0, 'NOT-RUN': 0}
    green = 0
    for f in sorted(glob.glob(os.path.join(GOV, 'gate_results', 'Q*.json'))):
        if f.endswith('.prev.json'):
            continue
        d = jload(f)
        if not isinstance(d, dict) or not isinstance(d.get('counts'), dict):
            continue
        c = {k: int(d['counts'].get(k, 0) or 0) for k in tot}
        out[os.path.basename(f)[:-5]] = c
        for k in tot:
            tot[k] += c[k]
        if c['PASS'] > 0 and c['FAIL'] == 0 and c['BLOCKED-INPUT'] == 0 and c['NOT-RUN'] == 0:
            green += 1
    return out, tot, green


def timeline_verified():
    n = v = 0
    try:
        with open(os.path.join(GOV, 'timeline_seed.jsonl'), encoding='utf-8') as f:
            for line in f:
                o = json.loads(line)
                n += 1
                if (o.get('status') or o.get('verification')) not in (None, 'seeded_unverified'):
                    v += 1
    except Exception:
        return None, None
    return n, v


def conflicts():
    reg = jload(os.path.join(GOV, 'conflict_register.json'))
    items = reg.get('conflicts') if isinstance(reg, dict) else reg
    resolved = None
    if isinstance(items, list):
        resolved = sum(1 for x in items if str(x.get('default_status', '')).startswith('RESOLVED'))
    files = len(glob.glob(os.path.join(GOV, 'conflicts', 'resolutions', 'C-*.json')))
    return resolved, files


def rosters():
    n = 0
    try:
        for f in glob.glob(os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2', '**', '*.jsonl.gz'), recursive=True):
            with gzip.open(f, 'rt', encoding='utf-8', errors='replace') as g:
                n += sum(1 for _ in g)
    except Exception:
        return None
    return n


def site():
    p = os.path.join(ROOT, 'docs', 'plan', 'STATUS', 'STATUS.md')
    out = {}
    try:
        for line in open(p, encoding='utf-8'):
            m = re.match(r'\|\s*\**(SHIPPED|BUILT_NOT_SHIPPED|OPEN_BUILDABLE|OPEN_NEEDS_DECISION|OWNER_ONLY|SUPERSEDED|Total)\**\s*\|\s*\**([\d,]+)\**', line)
            if m:
                out[m.group(1).lower()] = int(m.group(2).replace(',', ''))
    except Exception:
        pass
    d = jload(os.path.join(ROOT, 'docs', 'accept', 'eight-pass-state.json'))
    streak = None
    try:
        runs = d['runs']
        best = 0
        for r in runs:
            cur = 0
            for p_ in r.get('passes', []):
                cur = cur + 1 if p_.get('verdict') == 'CLEAN' else 0
                best = max(best, cur)
        streak = best
    except Exception:
        pass
    out['best_clean_streak'] = streak
    return out


def main():
    a = sys.argv[1:]
    cost = float(a[a.index('--cost') + 1]) if '--cost' in a else None
    note = a[a.index('--note') + 1] if '--note' in a else None
    g = governance()
    gt, gtot, green = gates()
    gtot['EVALUATED'] = gtot['PASS'] + gtot['FAIL']                       # items a runner could judge
    gtot['OPEN'] = gtot['FAIL'] + gtot['BLOCKED-INPUT'] + gtot['NOT-RUN']   # items not yet passing; BLOCKED turning into FAIL is neutral here, PASS rising is the gain
    tn, tv = timeline_verified()
    cr, cf = conflicts()
    now = datetime.datetime.now(datetime.timezone.utc)
    cnt = (g or {}).get('counts', {})
    rec = {
        't': now.strftime('%Y-%m-%dT%H:%MZ'), 'cost_usd': cost, 'note': note,
        'bt': {
            'subreq_total': cnt.get('sub_requirements'), 'subreq_passing': cnt.get('passing'),
            'linked_open_register': cnt.get('linked_open_register'), 'register_entries': cnt.get('register_entries'),
            'timeline_rows': tn, 'timeline_verified_canonical': tv,
            'conflicts_total': cnt.get('conflicts'), 'conflicts_resolved': cr, 'conflict_resolution_files': cf,
            'gates_total': cnt.get('gates'), 'gates_with_result': len(gt), 'gates_green': green,
            'gate_items': gtot, 'gate_detail': gt, 'coverage': (g or {}).get('coverage'), 'roster_lines': rosters(),
        },
        'site': site(),
    }
    prev = None
    try:
        today = now.strftime('%Y-%m-%d')
        for line in open(OUT, encoding='utf-8'):
            o = json.loads(line)
            if o.get('t', '')[:10] < today:
                prev = o
    except Exception:
        pass
    # good metrics: higher is better (up) or lower is better (down)
    def pick(r, path):
        for k in path:
            r = r.get(k) if isinstance(r, dict) else None
        return r
    up = [('bt', 'subreq_passing'), ('bt', 'gates_green'), ('bt', 'timeline_verified_canonical'), ('bt', 'conflicts_resolved'), ('bt', 'conflict_resolution_files'),
          ('bt', 'roster_lines'), ('bt', 'gate_items', 'PASS'), ('bt', 'gate_items', 'EVALUATED'), ('site', 'shipped'), ('site', 'built_not_shipped'), ('site', 'best_clean_streak')]
    down = [('bt', 'gate_items', 'OPEN'), ('site', 'open_buildable'), ('site', 'open_needs_decision')]
    better, worse = [], []
    if prev:
        for path in up:
            x, y = pick(rec, path), pick(prev, path)
            if isinstance(x, (int, float)) and isinstance(y, (int, float)):
                (better if x > y else worse if x < y else []).append('.'.join(path) + ' %s -> %s' % (y, x)) if x != y else None
        for path in down:
            x, y = pick(rec, path), pick(prev, path)
            if isinstance(x, (int, float)) and isinstance(y, (int, float)):
                (better if x < y else worse if x > y else []).append('.'.join(path) + ' %s -> %s' % (y, x)) if x != y else None
    rec['vs_previous_day'] = {'previous': prev.get('t') if prev else None, 'better': better, 'worse': worse}
    last = None
    try:
        for line in open(OUT, encoding='utf-8'):
            last = json.loads(line)
    except Exception:
        pass
    if last:
        d = []
        for path in up + down:
            x, y = pick(rec, path), pick(last, path)
            if isinstance(x, (int, float)) and isinstance(y, (int, float)) and x != y:
                d.append('.'.join(path) + ' %s -> %s' % (y, x))
        rec['vs_last_line'] = {'previous': last.get('t'), 'changes': d}
    line = json.dumps(rec, separators=(',', ':'), ensure_ascii=False)
    if '--no-append' not in a:
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        with open(OUT, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    print(json.dumps(rec, indent=1, ensure_ascii=False))
    if prev is None or better and not worse:
        return 0
    if worse:
        return 4
    return 3


if __name__ == '__main__':
    sys.exit(main())
