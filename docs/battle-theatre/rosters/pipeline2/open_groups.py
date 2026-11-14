"""Which roster work items still need an engineer, in run order.  Standard library only, reads files, writes nothing.

    python3 -I docs/battle-theatre/rosters/pipeline2/open_groups.py            one line per open item: position, id, why it is open
    python3 -I docs/battle-theatre/rosters/pipeline2/open_groups.py --json     the same as JSON [{"id", "title", "why"}]; the planning step returns exactly these
    python3 -I docs/battle-theatre/rosters/pipeline2/open_groups.py --all      every item with its state, closed ones included

Why this exists.  The roster workflow runs two engineers at a time (it caps concurrent agents at CPUs - 2) and a restart of the
machine starts the planning step again and walks the returned list from the top.  An item that is finished but still returned costs a
build and a review (about a quarter of an hour of a slot) on every restart, so the planning step returns only what is open.

Closure rules (all checked from files):
  state item (id union-* or conf-*), round 1:  closed when (a) every unit of the item has its file under data2/ or is listed in
      GOVERNANCE/horde/ws-rosters/<id>/CLOSED.json under "units_without_file" with a gap id and a reason, and (b) rosters/reports/<id>.md
      and rosters/sources/<id>.json exist.  Closed means "built as far as the sources read allow, with every gap named"; it does not mean
      "complete" and it does not mean "independently sampled" (that is the item roster-qa).
  state item, round 2 (work_items_data.ROUND2):  open until GOVERNANCE/horde/ws-rosters/<id>/CLOSED-R2.json exists.
  roster-gettysburg-lists:  open until GOVERNANCE/horde/ws-rosters/roster-gettysburg-lists/CLOSED.json exists.
  roster-qa:  open until its CLOSED.json exists; after that it is open again (at the end of the list) whenever a state item has closed
      that the "covers" list of that file does not name.
CLOSED.json form (written by the engineer of the item as its last file):
  {"f": "roster2-closed/1", "work_item": ID, "round": 1, "units_without_file": [{"unit": KEY, "gap": "EG-ROS-..", "reason": ".."}],
   "covers": [ids, for roster-qa], "verify": {"files": N, "v1_defects": 0, "v3_defects": 0}, "note": ".."}
"""
import sys, os, json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import work_items_data as W

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
R2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters')
D2 = os.path.join(R2, 'data2')
WS = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters')


def jload(p):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def closed_json(gid, name='CLOSED.json'):
    return jload(os.path.join(WS, gid, name))


def state_round1(g):
    """(closed, [reasons it is open])."""
    why = []
    cl = closed_json(g['id']) or {}
    gaps = {x.get('unit') for x in cl.get('units_without_file', []) if x.get('gap') and x.get('reason')}
    missing = [u['key'] for u in g['units'] if not os.path.exists(os.path.join(D2, u['path']))]
    unresolved = [k for k in missing if k not in gaps]
    if unresolved:
        why.append('%d of %d units have neither a file nor a recorded gap' % (len(unresolved), len(g['units'])))
    if not os.path.exists(os.path.join(R2, 'reports', g['id'] + '.md')):
        why.append('no report rosters/reports/%s.md' % g['id'])
    if not os.path.exists(os.path.join(R2, 'sources', g['id'] + '.json')):
        why.append('no pointer file rosters/sources/%s.json' % g['id'])
    return (not why), why


def evaluate():
    wi = jload(os.path.join(R2, 'work-items.json'))
    groups = {g['id']: g for g in wi['groups']}
    state_ids = [i for i, g in groups.items() if g.get('units')]
    closed_state = []
    state = {}
    for i in state_ids:
        ok, why = state_round1(groups[i])
        state[i] = (ok, why)
        if ok:
            closed_state.append(i)
    out = {}          # id -> (is_open, why)
    for i in W.RUN_ORDER:
        if i in state:
            ok, why = state[i]
            if not ok:
                out[i] = (True, 'round 1: ' + '; '.join(why))
            elif i in W.ROUND2 and not closed_json(i, 'CLOSED-R2.json'):
                out[i] = (True, 'round 2: ' + W.ROUND2[i]['summary'])
            else:
                out[i] = (False, 'closed')
        elif i == 'roster-gettysburg-lists':
            out[i] = (not closed_json(i), 'no CLOSED.json' if not closed_json(i) else 'closed')
        elif i == 'roster-qa':
            qa = closed_json(i)
            if not qa:
                out[i] = (True, 'round 1 not done (the sample of the closed items)')
            else:
                new = [s for s in closed_state if s not in (qa.get('covers') or [])]
                out[i] = (bool(new), ('later round: closed items not yet covered: ' + ', '.join(new)) if new else 'closed (covers all closed items)')
        else:
            out[i] = (False, 'not a returned item')
    order = list(W.RUN_ORDER)
    if closed_json('roster-qa') and 'roster-qa' in order:      # later rounds of the sample go to the end of the list
        order.remove('roster-qa')
        order.append('roster-qa')
    for i in state_ids:                                          # safeguard: an open state item missing from RUN_ORDER is never dropped
        if i not in order:
            ok, why = state[i]
            out[i] = (not ok, 'round 1 (not in RUN_ORDER, appended): ' + '; '.join(why) if not ok else 'closed (round 1; not returned)')
            if not ok:
                order.append(i)
    return wi, groups, order, out, state


def title_of(i, groups):
    return W.RETURN_TITLES.get(i) or groups[i]['title']


def main(argv):
    wi, groups, order, out, state = evaluate()
    if '--all' in argv:
        for i in order:
            print('%-26s %-7s %s' % (i, 'OPEN' if out[i][0] else 'closed', out[i][1]))
        for i, g in groups.items():
            if i not in order:
                if g.get('units'):
                    print('%-26s %-7s %s' % (i, 'closed', 'round 1 closed (files, report and pointer file exist); not returned'))
                else:
                    print('%-26s %-7s %s' % (i, '-', 'not a returned item: ' + str(g.get('done_by', ''))))
        return 0
    rows = [(i, out[i][1]) for i in order if out[i][0]]
    if '--json' in argv:
        print(json.dumps([{'id': i, 'title': title_of(i, groups), 'why': why} for i, why in rows], ensure_ascii=False, indent=1))
    else:
        for n, (i, why) in enumerate(rows, 1):
            print('%2d %-26s %s' % (n, i, why))
        print('%d open of %d returned items' % (len(rows), len(W.RUN_ORDER)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
