"""Proposes one register entry per real data-gap class of the Q01 triage (tools/bt/q01_triage.py) that no open entry covers by its own words.

    python3 -I tools/bt/propose_q01_gaps.py [--result Q01.json]

Output: GOVERNANCE/register/proposed/q01-triage/q01-<class>.md, the shape of the other shard proposals (integrate with register_from_proposed.py then link_subreqs.py; the owner of the register decides).
Counts, unit ids and requirement ids are copied from the gate record; the proposals state what the record lacks and what was searched, never a value. Rewrites its own files; touches no entry of another owner."""
import argparse, collections, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import q01_triage as T

OUT = os.path.join(T.BT, 'GOVERNANCE', 'register', 'proposed', 'q01-triage')
IDS = lambda xs, n=120: ', '.join(sorted(xs)[:n]) + (' (and %d more)' % (len(xs) - n) if len(xs) > n else '')

# class -> (title, category, why not possible, evidence searched, substitute, strongest reconstruction, tier, closed by, owner decision)
ENTRIES = collections.OrderedDict([
    ('kit-evidence-not-run', ('Kit units without a verified strength or commander: 22 of 26 research groups have no evidence file', 'evidence missing',
        'No non-lead source has been read for these units yet: the kit evidence pass has run for four groups (us-1c, us-2c-1d, us-2c-2d3d, us-3c-1d). The kit tables hold the owner PDF\'s values, which cite Wikipedia and web pages (leads), so nothing may be called verified.',
        'The pass plan (kit/evidence/PLAN.md) names the reports and tables to read per group; for the groups listed none has been read into an evidence file. No lookup failed: the work is not yet done.',
        'The unit is drawn at the layer\'s tier (printed single figure or plausible-procedural share) and gates Q01.3, Q01.4 and Q01.7 report BLOCKED-INPUT, never PASS.',
        'The Official Records organization tables and returns (OR27-1-R008, R009, R013; OR27-2-R424, R425, R427) state regiment commanders with succession, and return strengths by corps and division; the evidence pass extracts them with verbatim quotes.',
        'inferred', 'Run the kit evidence pass for each listed group (tools/bt/kit_evidence_plan.py, kit_evidence_check.py), then python3 -I tools/bt/kit_verified.py build.', '-')),
    ('table-gap', ('Strength of kit units searched in the reports and not found', 'evidence missing',
        'The evidence pass searched the reports of the group and recorded a gap line: the record gives no strength figure for the unit (or only one that cannot be tied to the unit).',
        'The gap lines of kit/verified_oob.json (units[].gaps) name the source ids and terms searched and the result.',
        'The layer draws the unit with a marked range or share; Q01.3 and Q01.4 report BLOCKED-INPUT.',
        'The strongest statement the record supports is the layer\'s own tier-marked figure; nothing higher.', 'plausible-procedural',
        'A report or return not yet read that gives the figure; otherwise the gap stays open and visible on the unit card.', 'Whether a different source class (state volume, regimental history in print) may be searched.')),
    ('roster-missing', ('Kit rows of the Official Records tables that the roster does not hold (not drawn)', 'evidence missing (unit not in the roster)',
        'The roster (history/units.json) lacks these units; history/undrawn/roster-gaps.json lists the Official Records entries the roster lacks, and the undrawn-units research has not yet added them to the layer.',
        'roster-gaps.json: entries with action add or absent; kit/verified_oob.json rows with in_roster false and no crosswalk alias.',
        'The units are not drawn; Q01.2 fails for each.',
        'The Official Records organization tables name each unit and its parent; the kit row carries the same parent.', 'documented',
        'Add each unit to the roster through the undrawn-units pipeline with its arrival record (a march, never a spawn), or record the unit as documented absent.', '-')),
    ('support-class-missing', ('Support-troop classes of the kit that the layer holds as no unit (ambulance corps, stretcher bearers, provost guards, signal, engineers, ordnance, teamsters, sutlers, medical staff)', 'evidence missing (class not drawn)',
        'The layer carries combat units; the support classes of PDF K.1 exist in the kit as class records without a roster unit, strength or arrival ledger row.',
        'kit/verified_oob.json rows US.SUP.* and CS.SUP.*: no non-lead strength source has been read for the classes.',
        'Not drawn; Q01.2 fails for each class.',
        'None above the kit class record: no strength or arrival is stated by a source read so far.', 'plausible-procedural',
        'A strength and arrival source for each class (Letterman, the army returns), then a layer unit that arrives as a march.', 'Whether classes with no unit-level record may be drawn as procedural shares (marked).')),
    ('strength-conflict-set', ('Strength of units with a conflict set in the Official Records and state volumes (alternatives carried, none chosen)', 'source conflict (selectable scenario)',
        'The sources print different strengths for the unit under the same or comparable bases (the evidence lines carry alternatives A, B, ...). Only the owner decides a default view of conflicting sources (Law cl. 6), and the history layer has no per-scenario instance count (a scenario changes timing, not the figures drawn).',
        'kit/verified_oob.json strength.figures with `alt` letters; history/units.json `strength_verified` (status conflict) carries every alternative with its key, range, tier and date.',
        'Every alternative is carried in the layer and on the card; the figure drawn stays the plausible-procedural share (not a documented figure), so Q01.3 FAILs rather than passes.',
        'Each alternative is a documented line; none is preferred.', 'documented',
        'The owner\'s selection of the default view, or per-scenario instance counts in the layer so that each alternative is a selectable scenario.', 'Default view of each conflict set (PENDING OWNER).')),
    ('layer-printed-vs-table', ('Formations that carry the PDF\'s printed single figure while the table holds Official Records ranges', 'source conflict (weak printed figure vs documented ranges)',
        'The PDF prints one figure for 13 corps and 8 brigades (Stone Sentinels, a weak source); the table holds ranges of several bases from the returns. The printed figure sets the pool that the procedural shares of the leaves without a documented range are cut from, so replacing it changes figures drawn for other units.',
        'kit/verified_oob.json strength.ranges of the formation; history/units.json `strength.strength` and the allocation in app/src/history/strength.mjs.',
        'The printed figure stays, marked weak and inferred; the documented ranges are in the table for the owner.',
        'A formation total is the sum of its leaves where all leaves have documented figures.', 'inferred',
        'The owner decides whether a documented formation range replaces the printed figure as the pool of the remaining leaves; then the builder follows.', 'Whether the printed corps and brigade figures give way to the documented ranges (PENDING OWNER).')),
    ('table-inferred-only', ('Units whose table row holds only inferred lines for strength or commander', 'evidence partly missing',
        'No documented line was found for the field: the table holds inferred lines only (a derived figure, an estimate, a regimental history without a primary source). The layer adopts only documented lines (Law cl. 4).',
        'kit/verified_oob.json rows with field status inferred; kit/evidence/<group>.jsonl.',
        'The layer keeps its printed commander or procedural share; the inferred lines are carried as alternatives.',
        'The inferred line, marked inferred.', 'inferred',
        'A primary source (return or report) for the field.', '-')),
    ('arrivals-no-road', ('Arrivals ledger prints no road or direction of approach for the unit', 'evidence missing',
        'The ledger rows and reports read name an arrival hour and place but no road of approach for these units; a road modelled from sibling formations is a reconstruction (EG-0070), not a record.',
        'history/arrivals.json: the entry place and approach of each record; reports read for the corps.',
        'The unit is not drawn with an approach road; Q01.5 fails.',
        'The corps road, where one is printed for the corps, marked as inferred.', 'inferred',
        'A report that names the road of the unit or its brigade.', '-')),
    ('arrivals-road-off-ground', ('The printed road of approach lies outside the loaded ground (Black Horse Tavern Road, Third Corps)', 'evidence missing (ground not loaded)',
        'The ledger prints the Black Horse Tavern Road for the unit; the road does not cross the edge of the loaded terrain, so no entry place can be placed from it.',
        'history/arrivals.json AP-07; the gazetteer roads and the loaded ground extent.',
        'No entry place is drawn; Q01.5 fails.',
        'The point where the printed road meets the edge of the loaded ground cannot be fixed from the record read.', 'plausible-procedural',
        'Extend the loaded ground along the road, or a source that places the column at the edge.', 'Whether the loaded ground may be extended.')),
    ('arrivals-road-conflict', ('Corps road and a unit\'s own reports print different roads of approach (2nd Corps, Jones\' artillery battalion)', 'source conflict (selectable scenario)',
        'The ledger prints the Harrisburg Road for the corps; the unit\'s own report (OR27-2-R468) says the York road. Both are non-lead sources.',
        'history/arrivals.json and the cited report passage.', 'Both values carried; no default chosen (PENDING OWNER).',
        'Two scenarios, none preferred.', 'documented', 'The owner\'s selection of the default view.', 'Default view of the competing roads (PENDING OWNER).')),
    ('required-set', ('Units drawn with a strength whose kit row does not require a strength (artillery battalions, headquarters)', 'evidence missing (kit required set)',
        'groups.json lists guns and casualties as the required fields of an artillery battalion, so the evidence pass never looked for the men of the battalion; the layer draws a figure for it.',
        'kit/evidence/groups.json required sets; kit/verified_oob.json fields.strength absent for these units.',
        'Q01.3 reports BLOCKED-INPUT.',
        'None above the layer\'s tier-marked figure.', 'plausible-procedural',
        'Add strength to the required set of these units in groups.json and read the battalion returns, or record that the layer must not draw a figure.', '-')),
])
MAP = {'kit-evidence-not-run': ['kit-evidence-not-run'], 'table-gap': ['table-gap'], 'roster-missing': ['roster-missing'], 'support-class-missing': ['support-class-missing'],
       'arrivals-no-road': ['arrivals-no-road', 'arrivals-no-leaf-route', 'arrivals-open-gap'], 'arrivals-road-off-ground': ['arrivals-road-off-ground'], 'arrivals-road-conflict': ['arrivals-road-conflict'],
       'required-set': ['required-set', 'layer-no-figure'], 'strength-conflict-set': ['strength-conflict-set'], 'layer-printed-vs-table': ['layer-printed-vs-table'], 'table-inferred-only': ['table-inferred-only']}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--result', default=T.RESULT)
    ap.add_argument('--out', default=OUT)
    a = ap.parse_args(argv)
    res, table = T.load(a.result), T.load(T.TABLE)
    units = table['units']
    researched = {u['group'] for u in units.values() if u['status'] in ('verified', 'partly')}
    by = collections.defaultdict(list)
    for it in res['items']:
        if it['result'] in T.BAD:
            by[T.classify(it, units, researched)].append(it)
    os.makedirs(a.out, exist_ok=True)
    n = 0
    for key, (title, cat, why, searched, subst, recon, tier, closed, ownerq) in ENTRIES.items():
        its = [i for c in MAP[key] for i in by.get(c, [])]
        if not its:
            continue
        subjects = sorted({i['subjects'][0] for i in its})
        reqs = sorted({s.split('.')[0] for i in its for s in i.get('sub_requirements') or []}) or ['R04']
        if key == 'kit-evidence-not-run':
            g = collections.Counter(units[s]['group'] for s in subjects if s in units)
            where = 'Units by research group: ' + '; '.join('%s %d' % (k, v) for k, v in sorted(g.items())) + '.'
        else:
            where = 'Units: ' + IDS(subjects) + '.'
        checks = collections.Counter(i['check'] for i in its)
        desc = '%d %s item(s) of gate Q01 (%s) over %d unit(s). %s' % (len(its), '/'.join(sorted({i['result'] for i in its})), ', '.join('%s %d' % kv for kv in sorted(checks.items())), len(subjects), where)
        rows = [('ID', 'q01-' + key), ('Requirement IDs', ', '.join(reqs)), ('Category', cat), ('Description', desc), ('Why literal 100% is not possible or blocked', why), ('Evidence searched', searched),
                ('Autonomous substitute applied', subst), ('Strongest evidence-based reconstruction', recon), ('Confidence tier', tier), ('Competing values', 'Harrisburg Road (ledger, corps); York road (OR27-2-R468, the unit\'s report)' if key == 'arrivals-road-conflict' else '-'),
                ('Product marking', 'The unit card says what is open and this id; the tier glyph stays on the value.'), ('How it would be closed', closed), ('Owner decision requested', ownerq),
                ('Status', 'open (proposed by tools/bt/propose_q01_gaps.py; not yet in register/)')]
        with open(os.path.join(a.out, 'q01-%s.md' % key), 'w', encoding='utf-8', newline='\n') as f:
            f.write('# q01-%s: %s\n\n| Field | Content |\n|---|---|\n' % (key, title) + ''.join('| %s | %s |\n' % (k, str(v).replace('|', '/')) for k, v in rows))
        n += 1
    print('q01 proposals written', n)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
