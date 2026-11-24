"""Proposes one register entry per real record-gap class of the Q04-Q06 triage (tools/bt/q456_triage.py) that no open entry covers by its own words.

    python3 -I tools/bt/propose_q456_gaps.py

Output: GOVERNANCE/register/proposed/q456-triage/q456-<class>.md, the shape of the other proposals (integrate with register_from_proposed.py then link_subreqs.py; the owner of the register decides).
Classes: Q05.4 lateness (a documented time that the documented rate cannot meet) by kind and, for the ledger-vs-edge kind, by road of approach; Q06.2 the 90 s tuning value of a change of
formation; Q06.3 the units with no path or only an edge placement, by reason. Counts, unit ids, scenario conflict ids, distances and minutes are copied from the gate records; the proposals
state what the record lacks, never a value. A search log is NOT written here: a log row (GATE-SPEC 1.4) records a search somebody made, and none was made for these entries, so each says
`search log owed` and the gate keeps the item BLOCKED-INPUT until the log exists. Rewrites its own files; touches no entry of another owner."""
import collections, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import q456_triage as T

OUT = os.path.join(T.GOV, 'register', 'proposed', 'q456-triage')
IDS = lambda xs, n=60: ', '.join(sorted(xs)[:n]) + (' (and %d more)' % (len(xs) - n) if len(xs) > n else '')
SLUG = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
SEARCH_OWED = 'No source search has been made for this entry yet: the dated search log of GATE-SPEC 1.4 (register/search_logs/<id>.json) is owed, and the gate keeps the items BLOCKED-INPUT until it exists. The gate record states what the layer computed, not what a source says.'


def entry(eid, title, cat, desc, why, searched, subst, recon, tier, closed, ownerq, reqs, marking, competing='-'):
    return {'id': eid, 'title': title, 'rows': [('ID', eid), ('Requirement IDs', ', '.join(reqs)), ('Category', cat), ('Description', desc), ('Why literal 100% is not possible or blocked', why), ('Evidence searched', searched),
            ('Autonomous substitute applied', subst), ('Strongest evidence-based reconstruction', recon), ('Confidence tier', tier), ('Competing values', competing), ('Product marking', marking),
            ('How it would be closed', closed), ('Owner decision requested', ownerq), ('Status', 'open (proposed by tools/bt/propose_q456_gaps.py; not yet in register/); ' + ('search log owed' if searched.startswith(SEARCH_OWED) else 'search log written at register/search_logs/<EG id>.json by the integrating step'))]}


def build(res):
    Q05, Q06 = res['Q05'], res['Q06']
    FH, links = T.floor_hold_conflicts(), T.linked_conflicts(T.load(T.ARR))
    out = []
    # ---------------------------------------------------------------- Q05.4 lateness
    by = collections.defaultdict(list)
    for it in Q05['items']:
        if it['check'] == 'Q05.4' and it['result'] in T.BAD:
            o = it['evidence']['offset']
            key = ('ledger-vs-edge', SLUG(o.get('road') or 'no-road')) if o['kind'] == 'ledger_vs_edge' else {'state_vs_window': ('state-vs-window', ''), 'late': ('late-stop', ''), 'cascade': ('cascade', '')}[o['kind']]
            by[key].append(it)
    KIND = {'ledger-vs-edge': 'a ledger time at a place that the documented speed cannot reach from where the printed road enters the loaded ground',
            'state-vs-window': 'a troop-map day position whose window the documented speed cannot meet',
            'late-stop': 'a later stop of the unit\'s ledger path reached late after a scenario moved a step-off or an earlier stop was late',
            'cascade': 'a stop reached late because the stop before it was reached late (the lateness carries on)'}
    for (kind, road), its in sorted(by.items()):
        offs = [i['evidence']['offset'] for i in its]
        units = sorted({i['subjects'][0] for i in its})
        late = [o['late_min'] for o in offs]
        places = sorted({o.get('place') or '-' for o in offs}); roads = sorted({o.get('road') for o in offs if o.get('road')})
        dist = [o['distance_m'] for o in offs if o.get('distance_m') is not None]
        convs = sorted({c for i in its for c in re.findall(r'C-\d{3}', i.get('scenario') or '')})
        eid = 'q456-lateness-%s' % (kind + ('-' + road if road else ''))
        desc = '%d BLOCKED-INPUT item(s) of gate Q05.4 over %d unit(s) and %d (unit, stop) pair(s): %s. Place(s): %s%s. Lateness %d to %d minutes%s. Scenario conflicts under which it appears: %s. Units: %s.' % (
            len(its), len(units), len({(i['subjects'][0], i['evidence']['offset'].get('stop')) for i in its}), KIND[kind], ', '.join(places), ('; road ' + ', '.join(roads)) if roads else '', min(late), max(late),
            ('; distance along the road %d to %d m' % (min(dist), max(dist))) if dist else '', ', '.join(convs) or 'the default views only', IDS(units))
        out.append(entry(eid, 'Lateness the documented rate cannot avoid: %s%s' % (kind.replace('-', ' '), (' (' + ', '.join(roads) + ')') if roads else ''), 'physics against record (a documented time the documented rate cannot meet)', desc,
            'The record prints a time at a place; the documented speed (urgent double quick, 2.5146 m/s; Hardee para 114) from the point where the road enters the loaded ground cannot reach the place by then. Either the ground that is loaded ends too far out (the unit was nearer at that time), or the printed time is the head of a column, a later arrival of the unit or a clock of another style. No source read says which.',
            SEARCH_OWED, 'The layer keeps the speed bound and reports the lateness (report().offsets); the unit arrives late by the minutes above and the card says so. Nothing is drawn faster than the bound, nothing is moved earlier than its gate.',
            'The unit is drawn marching along the printed road at the documented rate from the edge of the loaded ground, arriving late; the lateness is a visible marked figure on its card (tier plausible-procedural).', 'plausible-procedural',
            'A report that places the unit nearer at an earlier time (then the entry place moves in, a march from there), or an owner decision to extend the loaded ground along the road so the march starts where the record puts it.',
            'Whether the loaded ground may be extended along this road, and whether a printed time may be read as the head of the column.', ['R04', 'R17'],
            'The unit card names this id and the minutes of lateness; the tier glyph stays plausible-procedural.', competing='the printed time (ledger) against the time the rate allows'))
    # ---------------------------------------------------------------- Q06.2 formation duration
    f2 = [i for i in Q06['items'] if i['check'] == 'Q06.2' and i['result'] in T.BAD]
    if not f2:      # once this entry is open and logged the items pass; the entry still stands for every unit that changes formation (the same units, so the proposal does not vanish on regeneration)
        f2 = [i for i in Q06['items'] if i['check'] == 'Q06.2' and (i.get('evidence') or {}).get('formations')]
    if f2:
        units = sorted({i['subjects'][0] for i in f2})
        out.append(entry('q456-formation-duration-90s', 'The duration of a change of formation (90 s) is the shell\'s tuning value, not a drill-manual figure', 'evidence missing (no manual figure read)',
            '%d item(s) of gate Q06.2 over %d unit(s) that deploy from the column of march after they have marched to their place (clauses that print "deploys"). The time of the change is dated by the clause (tier inferred); its duration is 90 s (FORMATION_SECONDS, decision DEC-008). Units: %s.' % (len(f2), len(units), IDS(units)),
            'No drill manual read so far gives the time of a regiment forming line from the column of march in a form the shell can use; DEC-008 is a decision of the builder, not a register entry.',
            'Searched in the local texts (register/search_logs, dated 2026-11-24): Hardee 1861 (riflelightinfant121hard), Casey 1862 vol. 1 and vol. 2 (infantrytacticsf01brig, infantrytacticsf02case), whitespace-normalised, by three patterns (a time unit within 60-80 characters of deploy / into line / form line; a battalion or regiment movement "in" a time unit). No hit states how long a regiment takes to deploy or form line; the manuals give cadences (quick time, double quick, the pace of 180 steps a minute named for wheeling into line) and the movements, not durations. Negative for a duration; the cadences are inputs to a derivation not yet made.', 'The change lasts 90 s and the event shows the weakest tier of its parts, plausible-procedural (fixed in app/src/history/real.mjs).',
            'The drill manuals in the library (Hardee 1861, Casey 1862) give the manoeuvres of a battalion and, read with the step lengths, a time can be derived; none has been read for this purpose.', 'plausible-procedural',
            'Read the manoeuvre (deployment on a named company or by the flank) in Hardee/Casey, derive the duration with the documented cadence and replace the 90 s; then close.', 'Whether a derived figure replaces 90 s once read (T-Q06-1).', ['R17'],
            'The change of formation shows tier plausible-procedural and this id on the unit card.'))
    # ---------------------------------------------------------------- Q06.3 no path
    CLS = collections.OrderedDict([
        ('no-road-unplaceable', ('Units with no path: the road a report names cannot be placed in the repository', 'evidence missing (road not in the gazetteer)', 'a report of the unit\'s line of command names a road or route the gazetteer cannot place (the road from Scotland, the route by Horner\'s Mill, a railroad, a road named only by its ends), so the sibling-road rule (DEC-015) is not applied and no path exists.', 'Place the named road in the gazetteer from the maps in the library, or a report that names a placeable road.', '-')),
        ('sibling-no-day-position', ('Units with no path: a sibling road exists but the unit has no single-label day position', 'evidence missing (no placed day position)', 'the sibling road of the corps is available but the unit\'s day position is a Bachelder sheet without a single label, so a drawn unit would only stand in a column at the edge of the ground.', 'A day position of the unit in a report or a sheet label that names one place.', '-')),
        ('edge-only-no-place', ('Units shown only at the edge of the loaded ground', 'evidence missing (no place after arrival)', 'a road of approach is printed for the unit; no place after arrival is printed, so the layer shows the unit only where the road leaves the loaded ground.', 'A report of the unit (history/undrawn research) that names the place where it halted or fought.', '-')),
        ('stuart-cavalry-no-own-road', ('Stuart\'s cavalry units with no path: only earlier marches are printed', 'evidence missing (no road of its own, no day position)', 'Stuart\'s cavalry is drawn only by a road documented for its own brigade or division; only earlier marches are printed and there is no day position either (related: C-023).', 'A report of the brigade or division that names its road and place on the day.', 'Whether the sibling-road rule may be applied to Stuart\'s cavalry.')),
        ('road-off-ground', ('Units whose printed road lies outside the loaded ground (Black Horse Tavern Road, Third Corps)', 'evidence missing (ground not loaded)', 'the road the ledger prints does not cross into the loaded ground, so no entry place can be placed.', 'Extend the loaded ground along the road, or a source that places the column at the edge.', 'Whether the loaded ground may be extended.')),
        ('sibling-roads-differ', ('Units with no path: the sibling formations of the corps name different roads', 'source conflict (selectable scenario)', 'the documented sibling formations of the corps name different roads (for example the Second Corps: Early the Harrisburg Road, Rodes the Carlisle Road); none is chosen (no default is picked for a source conflict).', 'The owner\'s selection of the default view, or a report of the unit that names its own road.', 'Default view of the competing roads (PENDING OWNER).')),
        ('no-figure-open-gap', ('Headquarters, persons and an artillery group with no figure: nothing is drawn', 'evidence missing (no strength figure)', 'the record gives no figure for this headquarters, person or artillery group, so none is drawn and it has no path.', 'A strength figure in a return or report (see the Q01 entry q01-required-set / table-gap).', '-')),
        ('road-conflict-reports', ('A unit whose own reports print another road than its corps', 'source conflict (selectable scenario)', 'the ledger prints a road for the corps, but the reports of the unit print another road.', 'The owner\'s selection of the default view.', 'Default view of the competing roads (PENDING OWNER).')),
    ])
    groups = collections.defaultdict(list)
    for it in Q06['items']:
        if it['check'] == 'Q06.3' and it['result'] == 'FAIL':
            groups[T.classify('Q06', it, FH, links)].append(it)
    for cls, (title, cat, why, closed, ownerq) in CLS.items():
        its = groups.get(cls)
        if not its:
            continue
        units = sorted({i['subjects'][0] for i in its})
        out.append(entry('q456-q06-' + cls, title, cat, '%d FAIL item(s) of gate Q06.3 over %d unit(s). Units: %s.' % (len(its), len(units), IDS(units)), why,
            SEARCH_OWED + ' The ledger and the reports named in the gate evidence (evidence.reason) were read by the layer builder, not by a source search for this entry.',
            'The unit is not drawn with a path (or only at the edge); Q06.3 fails for each unit. It stays an item with no path, LINKED-ACTIVE at sub-requirement level only with an L3 register entry.',
            'The strongest statement the record supports is the road of the corps where one is printed, marked inferred; a path is inferred only where a document supports it.', 'inferred', closed, ownerq, ['R04', 'R10', 'R17'],
            'The unit card says what is open and names this id; the tier glyph stays on the value.', competing='Harrisburg Road / Carlisle Road (sibling formations of the Second Corps)' if cls == 'sibling-roads-differ' else '-'))
    return out


def main(argv=None):
    res = {g: T.load(os.path.join(T.RES, g + '.json')) for g in ('Q05', 'Q06')}
    es = build(res)
    os.makedirs(OUT, exist_ok=True)
    for fn in os.listdir(OUT):
        if fn.startswith('q456-') and fn.endswith('.md'):
            os.remove(os.path.join(OUT, fn))
    for e in es:
        with open(os.path.join(OUT, e['id'] + '.md'), 'w', encoding='utf-8', newline='\n') as f:
            f.write('# %s: %s\n\n| Field | Content |\n|---|---|\n' % (e['id'], e['title']) + ''.join('| %s | %s |\n' % (k, str(v).replace('|', '/')) for k, v in e['rows']))
    print('q456 proposals written', len(es), 'covering %d Q05.4 items' % sum(int(re.match(r'(\d+)', dict(e['rows'])['Description']).group(1)) for e in es if e['id'].startswith('q456-lateness')))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
