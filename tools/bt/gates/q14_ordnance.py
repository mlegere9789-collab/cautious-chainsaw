#!/usr/bin/env python3
"""Gate Q14: "Ordnance ranges, elevations and rates of fire within documented figures; per-battery gun counts match the verified battery table." (plan p. 136, Q). GATE-SPEC.md 2, Q14.1 to Q14.7.

    python3 tools/bt/gates/q14_ordnance.py [--out DIR] [--scenarios default|sample|ofat] [--mutate FILE.mjs] [--no-write] [--quiet]

Writes `<out>/Q14.json` (default GOVERNANCE/gate_results), record `bt-gate-result/1`. Exit code 0 PASS, 1 FAIL, 2 INCOMPLETE, 3 runner error. It sets no `passes` flag.

What it reads: the kit weapons table (`kit/weapons.json`), the printed tables of the period manuals as the repository holds them (`drill/ordnance_tables.json`, `drill_artillery.json`, `drill_infantry.json`, whose
phrases and figures it finds again in the OCR text of the manuals when the text is on this machine), the verified battery table (`kit/verified_batteries.json`, schema `kit-verified-batteries-1`), the plan's own
printed totals (BIBLE/plan-clean.txt) and what the REAL product holds, dumped by the node child q14_layer.mjs: the layer's gun record of every battery, the guns the world draws, the printed range table of
`anim3d/ballistics.mjs` and its inverse, and every `FirePlan` that the crowd driver builds for the layer (the plans the page runs), enumerated shot by shot.

  Q14.1 weapons table   every weapon the product can fire has a row with tier and sources (or a registered gap), conflicts as ranges, no tier above its evidence
  Q14.2 ranges          every printed range of the product's table is a printed value of the manual it cites, the inverse returns the documented elevation, nothing beyond the table is invented;
                        a drawn piece with no documented per-elevation table is a W.1 gap: COVERED only by a register entry at link level L3, else FAIL; a gate for projectile events has no domain (empty: BLOCKED-INPUT)
  Q14.3 ammunition      the band rule is checked against the manuals; no product code chooses a round by range (empty domain: BLOCKED-INPUT)
  Q14.4 rates of fire   over every sliding 60-second window of every plan no piece or soldier fires faster than the documented maximum (guns: Gibbon and the Instruction for Field Artillery; muskets: none is
                        documented: the plan's typical 2 to 3 a minute is a lead and a ceiling, exceeding it is FAIL, staying inside is COVERED at best and only with an L3 entry)
  Q14.5 gun counts      per battery: guns drawn, guns fired and the type equal the verified battery table at every date it has; army totals lie inside the plan's printed ranges; per emplacement G-01 to G-18
  Q14.6 ammunition      expenditure of every firing battery does not exceed the documented stock (Instruction for Field Artillery: war establishment 224 rounds a gun, campaign allowance double)
  Q14.7 crew            eight or nine per piece as a selectable scenario; the posts of a detachment are documented; the drill state machine

With no verified battery table the table-dependent items are BLOCKED-INPUT ("input missing: ...") and never a pass; checks that need no table are computed and a failure is a FAIL.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (HERE, os.path.join(HERE, 'lib'), os.path.abspath(os.path.join(HERE, '..'))):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from oobgates_common import cond, covered_by_register, first_failed, gate_rows, layer_dump  # noqa: E402
from pq_common import Env, InputMissing, Record, base_parser, guarded_main, is_placeholder, node_version, sha256_file  # noqa: E402

GATE = 'Q14'
VB_REL = 'kit/verified_batteries.json'
VB_SCHEMAS = ('kit-verified-batteries-1',)
MISSING_VB = 'input missing: docs/battle-theatre/kit/verified_batteries.json (the verified battery table of GATE-SPEC Q14.5: guns by date and state with tier and citation, built from the Official Records; no table, no comparison)'
YD = 0.9144
# the register entries that name a gap this gate meets (GATE-SPEC 1.4: a gap is COVERED only by an entry at link level L3). None for the per-elevation tables: no entry names that gap.
GAP_ENTRIES = {'per-elevation': [], 'rate': ['EG-ANIM-01'], 'stock': ['EG-0018'], 'crew': ['EG-0018'], 'drill-states': []}
TIERS3 = ('documented', 'inferred', 'plausible-procedural')
OPEN_PROJECTILE_EVENTS = 'empty domain: no fire plan of the crowd driver (the code the page runs) carries a target, a round or a range, so the shell emits no projectile event whose range or round could be checked'


# ======================================================================================== OCR texts of the manuals (re-match in this run, K5)
class OcrStore:
    """The OCR text of the manuals named in drill/*.json `sources` (ocr_file, sha256): read from the path the source names or, failing that, from the scratch copy tmp/bt-gates/library-misc;
    a text whose sha256 differs from the pinned one is not the acquired text (status sha_mismatch). Nothing is fetched."""

    def __init__(self, env, sources):
        self.env, self.sources, self.cache = env, sources or {}, {}

    def load(self, manual):
        if manual in self.cache:
            return self.cache[manual]
        s = self.sources.get(manual)
        out = None
        if s and s.get('ocr_file'):
            for c in (self.env.p(s['ocr_file']), self.env.p('tmp/bt-gates/library-misc/' + os.path.basename(s['ocr_file']))):
                if os.path.isfile(c):
                    with open(c, encoding='utf-8', errors='replace', newline='') as f:
                        raw = f.read()
                    ok = (not s.get('sha256')) or sha256_file(c) == s['sha256']
                    out = {'path': self.env.rel(c), 'sha_ok': ok, 'lines': raw.split('\n'), 'folded': None, 'raw': raw}
                    break
        self.cache[manual] = out
        return out

    def phrase(self, manual, phrase):
        t = self.load(manual)
        if t is None:
            return 'no_text'
        if not t['sha_ok']:
            return 'sha_mismatch'
        from extracts import fold  # noqa: PLC0415
        if t['folded'] is None:
            t['folded'] = ' ' + fold(t['raw']) + ' '
        q = fold(phrase)
        return 'found' if q and (' ' + q + ' ') in t['folded'] else 'not_found'

    def window(self, manual, line, tokens, before=3, after=120):
        """Every token (a printed figure, digits only) stands in the OCR lines around the item's recorded line."""
        t = self.load(manual)
        if t is None:
            return 'no_text'
        if not t['sha_ok']:
            return 'sha_mismatch'
        lo = max(0, int(line) - 1 - before)
        win = ' '.join(t['lines'][lo:int(line) + after]).replace(',', '')
        return 'found' if all(re.search(r'(?<!\d)%s(?!\d)' % re.escape(str(x).replace(',', '')), win) for x in tokens) else 'not_found'


# ======================================================================================== inputs
def load_inputs(rec, env):
    K = {}
    for key, rel, role in (('weapons', 'kit/weapons.json', 'data'), ('ord', 'drill/ordnance_tables.json', 'data'), ('art', 'drill/drill_artillery.json', 'data'), ('inf', 'drill/drill_infantry.json', 'data'),
                           ('fx', 'app/data/fx3d/weapons.json', 'data'), ('guns', 'app/data/battery-guns.json', 'data'), ('structures', 'structures/structures.json', 'data'), ('conflicts', 'GOVERNANCE/conflicts_structured.json', 'data')):
        try:
            K[key] = rec.read_json(env.btp(rel), role)
        except InputMissing as e:
            K[key] = None
            K.setdefault('missing', []).append(str(e))
    try:
        K['vb'] = rec.read_json(env.btp(VB_REL), 'table')
    except InputMissing:
        K['vb'] = None
    try:
        K['plan'] = rec.read_text(env.btp('BIBLE/plan-clean.txt'), 'text')
    except InputMissing:
        K['plan'] = None
    for rel in ('app/src/anim3d/ballistics.mjs', 'app/src/anim3d/fire-plan.mjs', 'app/src/crowd/anim.mjs', 'app/src/world-from-units.mjs', 'app/src/history/real.mjs'):
        rec.add_input(env.btp(rel), 'code')
    for fn in ('q14_ordnance.py', 'q14_layer.mjs', 'oob_layer_lib.mjs', 'oobgates_common.py'):
        rec.add_input(os.path.join(HERE, fn), 'runner')
    srcs = {}
    for k in ('ord', 'art', 'inf'):
        for m, s in ((K.get(k) or {}).get('sources') or {}).items():
            srcs[m] = s
    K['sources'] = srcs
    items = {}
    for k in ('ord', 'art', 'inf'):
        for it in (K.get(k) or {}).get('items') or []:
            items[it['id']] = it
    K['items'] = items
    return K


def parse_elev(e):
    """'0' -> 0, '1 30' -> 1.5, '3 45' -> 3.75 (degrees and minutes as the tables print them)."""
    p = str(e).split()
    return float(p[0]) + (float(p[1]) / 60.0 if len(p) > 1 else 0.0)


def readings(item):
    """[(block, elevation deg, range yd, range_ocr)] of every table row of a drill range item that has a reading (damaged cells have none)."""
    out = []
    d = (item or {}).get('data') or {}

    def walk(o, name):
        if isinstance(o, dict):
            if isinstance(o.get('rows'), list):
                for r in o['rows']:
                    if isinstance(r, dict) and r.get('range_yd_reading') is not None:
                        out.append((name, parse_elev(r.get('elevation')), r['range_yd_reading'], r.get('range_ocr')))
            for k, v in o.items():
                if k != 'rows':
                    walk(v, k if k != 'data' else name)
    walk(d, 'shot')
    return out


def block_matches(block, round_):
    b = str(block).lower()
    return ('shell' in b) if round_ == 'shell' else ('case' in b) if round_ == 'case' else not ('shell' in b or 'case' in b)


def paraphrase_reading(item, elev, yd, round_):
    """A figure the repository's own reading states in words ('spherical case: 3 deg 45 min 1,130') for a block that has no structured row: the segment of the paraphrase that names the round, the elevation and the number."""
    deg = int(elev)
    mins = int(round((elev - deg) * 60))
    etxt = ('%d deg %d min' % (deg, mins)) if mins else ('%d deg' % deg)
    words = {'shell': r'shell', 'case': r'case', 'shot': r'shot'}[round_]
    num = r'(?<!\d)%s(?!\d)' % (r'%d,?%03d' % (yd // 1000, yd % 1000) if yd >= 1000 else str(yd))
    for seg in re.split(r'[;.]', str((item or {}).get('paraphrase') or '')):
        if re.search(words, seg, re.I) and etxt in seg and re.search(num, seg):
            return seg.strip()
    return None


# ======================================================================================== Q14.1
def q141_weapons(rec, env, D, K, rows):
    W = K['weapons']
    if W is None:
        rec.item('Q14/Q14.1/table/default', 'BLOCKED-INPUT', 'input missing: docs/battle-theatre/kit/weapons.json (the weapons table)', {'missing': 'kit/weapons.json'}, check='Q14.1', scenario='default', subjects=['table'], sub_requirements=rows)
        return
    weapons, pieces = W.get('weapons') or {}, (W.get('artillery') or {}).get('pieces') or {}
    fired = {}
    for wid in ((K.get('fx') or {}).get('weapons') or {}):
        fired[wid] = 'the FX weapon catalogue (app/data/fx3d/weapons.json)'
    for b in D['batteries']:
        if b['guns']['status'] != 'drawn':
            continue
        for t in b['guns']['types']:
            fired.setdefault(t['type_id'], 'a drawn battery (%s)' % b['id'])
    for wid in sorted(fired):
        row = weapons.get(wid) or pieces.get(wid)
        sid = 'Q14/Q14.1/%s/default' % wid
        kw = dict(check='Q14.1', scenario='default', subjects=[wid], sub_requirements=rows)
        if row is None:
            rec.item(sid, 'FAIL', 'the product can fire %s (%s) and the weapons table has no row for it' % (wid, fired[wid]), {'fired_by': fired[wid]}, **kw)
            continue
        tier = row.get('tier')
        srcs = row.get('source_keys') or row.get('table_source_keys') or []
        gap = tier == 'gap' or bool(row.get('gap_ids')) or bool(row.get('placeholder'))
        conds = [cond('a tier is stated (documented, inferred or plausible-procedural)', tier in TIERS3 or tier == 'gap', 'tier %r' % tier)]
        conds.append(cond('sources are named', bool(srcs) or gap, 'no source key and no gap id'))
        conds.append(cond('the row is not a gap, a placeholder or an unspecified stand-in (a weapon the product fires needs a table row of its own)', not gap, 'gap ids %s, tier %s, placeholder %s' % (row.get('gap_ids'), tier, row.get('placeholder'))))
        bad_c = [c.get('id') for c in row.get('conflicts') or [] if len(c.get('positions') or c.get('values') or []) < 2]
        conds.append(cond('every source conflict is carried as a range of at least two positions', not bad_c, 'conflicts without two positions: %s' % bad_c))
        if tier == 'documented':
            confirmed = []
            for m in row.get('manual_confirmation') or []:
                confirmed += m.get('drill_item_ids') or []
            ok_items = [i for i in confirmed if i in K['items']]
            conds.append(cond('a documented tier needs a claim support that this run can re-match: a manual item (drill/*.json) that confirms it', bool(ok_items) and not bool(row.get('weak_source')),
                              'the row says %s (%s) and names no manual item that confirms it; the claim is not re-matched in any stored text (GATE-SPEC K5: a stored flag is not evidence)' % (tier, (row.get('tier_basis') or row.get('tier_note') or '')[:140])))
        bad = first_failed(conds)
        ev = {'conditions': conds, 'fired_by': fired[wid], 'tier': tier, 'weak_source': row.get('weak_source'), 'source_keys': srcs, 'gap_ids': row.get('gap_ids')}
        if bad:
            rec.item(sid, 'FAIL', 'weapons table: ' + '; '.join(bad), ev, **kw)
        else:
            rec.item(sid, 'PASS', 'a table row with tier %s, sources %s and its conflicts as ranges' % (tier, ', '.join(srcs[:3])), ev, **kw)


# ======================================================================================== Q14.2
def q142_ranges(rec, env, D, K, ocr, rows, gap_entries=None):
    gap_entries = gap_entries or GAP_ENTRIES
    items, ball = K['items'], D['ballistics']
    kw = lambda subj: dict(check='Q14.2', scenario='default', subjects=[subj], sub_requirements=rows)  # noqa: E731
    for r in ball['rows']:
        sid = 'Q14/Q14.2/%s/%s@%s' % (r['piece'], r['round'], r['elev_deg'])
        found, ids = [], []
        for src in r.get('src') or []:
            it = items.get(src)
            if not it:
                continue
            for blk, el, yd, ocr_s in readings(it):
                if block_matches(blk, r['round']) and abs(el - r['elev_deg']) < 1e-6 and yd == r['range_yd']:
                    found.append({'item': src, 'block': blk, 'elevation': el, 'yd': yd, 'range_ocr': ocr_s, 'manual': it.get('manual'), 'ocr_line': it.get('ocr_line')})
        ev = {'product_row': {k: r[k] for k in ('piece', 'round', 'elev_deg', 'range_yd', 'src')}, 'documented_readings': found}
        if not found:
            for src in r.get('src') or []:
                seg = paraphrase_reading(items.get(src), r['elev_deg'], r['range_yd'], r['round'])
                if seg and items[src].get('ocr_line'):
                    found.append({'item': src, 'block': 'paraphrase', 'elevation': r['elev_deg'], 'yd': r['range_yd'], 'range_ocr': '%d,%03d' % (r['range_yd'] // 1000, r['range_yd'] % 1000) if r['range_yd'] >= 1000 else str(r['range_yd']), 'manual': items[src].get('manual'), 'ocr_line': items[src].get('ocr_line'), 'segment': seg})
        if not found:
            rec.item(sid, 'FAIL', 'the product prints %s yd at %s deg for %s (%s); no cited manual item (%s) prints that value at that elevation' % (r['range_yd'], r['elev_deg'], r['piece'], r['round'], ', '.join(r.get('src') or [])), ev, **kw(r['piece']))
            continue
        res = []
        for f in found:
            it = items[f['item']]
            a = ocr.phrase(f['manual'], it['verbatim'])
            b = ocr.window(f['manual'], it['ocr_line'], [f['range_ocr']] if f['range_ocr'] else [f['yd']]) if a == 'found' else a
            res.append((a, b))
        ev['ocr'] = [{'item': f['item'], 'phrase': a, 'figure': b} for f, (a, b) in zip(found, res)]
        if any(a == 'found' and b == 'found' for a, b in res):
            rec.item(sid, 'PASS', 'the printed value %s yd at %s deg stands in %s and was found again in the OCR text of the manual in this run' % (r['range_yd'], r['elev_deg'], found[0]['item']), ev, **kw(r['piece']))
        elif any(a in ('no_text', 'sha_mismatch') or b in ('no_text', 'sha_mismatch') for a, b in res):
            rec.item(sid, 'NOT-RUN', 'the value matches %s but the OCR text of %s is not on this machine (or is not the pinned acquisition): the figure is not re-matched here' % (found[0]['item'], found[0]['manual']), ev, **kw(r['piece']))
        else:
            rec.item(sid, 'FAIL', 'the value matches the repository item %s but the figure is not found in the OCR text of %s near its recorded line' % (found[0]['item'], found[0]['manual']), ev, **kw(r['piece']))
    # the inverse and the edge of the table: per piece and round
    by = {}
    for x in ball['inverse']:
        by.setdefault((x['piece'], x['round']), []).append(x)
    beyond = {(x['piece'], x['round']): x for x in ball['beyond']}
    for (piece, rd), xs in sorted(by.items()):
        bad = [x for x in xs if not x['ok']]
        b = beyond.get((piece, rd), {})
        conds = [cond('the elevation for each documented range equals the documented elevation (inverse of the printed table)', not bad, '%d point(s) differ: %s' % (len(bad), bad[:2])),
                 cond('beyond the last documented range nothing is invented (no elevation, no impact)', b.get('elevation_beyond') == 'NaN' and b.get('impact_beyond') is None, json.dumps(b)),
                 cond('the flight time of every documented point above 0 deg is finite and positive', all((x['flight_s'] or 0) > 0 for x in xs if x['elev_deg'] > 0), None)]
        bad_c = first_failed(conds)
        sid = 'Q14/Q14.2/%s/%s@inverse' % (piece, rd)
        if bad_c:
            rec.item(sid, 'FAIL', 'ballistics: ' + '; '.join(bad_c), {'conditions': conds}, **kw(piece))
        else:
            rec.item(sid, 'PASS', 'the elevation returns the documented elevation at all %d points, nothing is invented beyond %s yd' % (len(xs), b.get('top_yd')), {'conditions': conds}, **kw(piece))
    # pieces the product draws that have no printed per-elevation table (W.1 gap)
    have = set(D['ballistics']['table'].keys())
    drawn_types = {}
    for b in D['batteries']:
        if b['guns']['status'] == 'drawn':
            for t in b['guns']['types']:
                drawn_types.setdefault(t['type_id'], []).append(b['id'])
    for tid in sorted(drawn_types):
        if tid in have:
            continue
        ok, why, states = covered_by_register(env, gap_entries['per-elevation'])
        ev = {'guns_drawn_in': drawn_types[tid][:8], 'batteries': len(drawn_types[tid]), 'no_table_in': 'drill/ordnance_tables.json negative_findings (the manuals hold no table for this piece)', 'register': states, 'product_marking_checked': False}
        if ok:
            rec.item('Q14/Q14.2/%s/gap' % tid, 'COVERED', 'W.1 gap: no per-elevation table is documented for %s; covered by an open register entry at link level L3 (marking in the product not checked here)' % tid, ev, **kw(tid))
        else:
            rec.item('Q14/Q14.2/%s/gap' % tid, 'FAIL', 'the product draws %s (%d batteries) and no per-elevation table of it is documented (W.1 gap); the gap is not covered: %s' % (tid, len(drawn_types[tid]), '; '.join(why)), ev, **kw(tid))
    # projectile events: a plan with a target has a range the table must hold
    evs = D.get('events') or []
    if not evs:
        rec.item('Q14/Q14.2/projectile-events/default', 'BLOCKED-INPUT', OPEN_PROJECTILE_EVENTS, {'plans': sum(len(v) for v in D['plans'].values()), 'scenarios': sorted(D['plans'])}, **kw('projectile-events'))
    for n, e in enumerate(evs):
        iid = 'Q14/Q14.2/event/%s:%d/%s' % (e['unit'], n, e['scenario'])
        ev = dict(e)
        tab = D['ballistics']['table'].get(e['piece']) or {}
        top = max((pt[1] for k, rd in tab.items() if k != 'src' and isinstance(rd, list) for pt in rd), default=None)
        kw2 = dict(check='Q14.2', scenario=e['scenario'], subjects=[e['unit']], sub_requirements=rows)
        if e['in_table'] and top is not None and e['range_yd'] <= top:
            rec.item(iid, 'PASS', 'the shot of %s at %.0f yd has an elevation (%s deg) from the documented table and the range does not exceed the documented %s yd' % (e['piece'], e['range_yd'], e['elevation_deg'], top), ev, **kw2)
        else:
            rec.item(iid, 'FAIL', 'the product fires %s at %.0f yd and the documented table gives no elevation there (largest documented range %s yd)' % (e['piece'], e['range_yd'], top), ev, **kw2)


# ======================================================================================== Q14.3
def q143_bands(rec, env, D, K, ocr, rows):
    kw = lambda subj: dict(check='Q14.3', scenario='default', subjects=[subj], sub_requirements=rows)  # noqa: E731
    W = K['weapons'] or {}
    ac = ((W.get('artillery') or {}).get('ammunition_choice')) or {}
    bands = ac.get('range_bands_yd') or {}
    fa, gb = K['items'].get('ART-FA-101'), K['items'].get('ART-GB-22')
    conds = []
    if not bands or not fa or not gb:
        rec.item('Q14/Q14.3/band-rule/default', 'BLOCKED-INPUT', 'input missing: the kit ammunition bands (kit/weapons.json artillery.ammunition_choice.range_bands_yd) or the manual items ART-FA-101 and ART-GB-22', {'bands': bands}, **kw('band-rule'))
    else:
        try:
            from kit_evidence_lib import numbers_in_text  # noqa: PLC0415
        except Exception:
            numbers_in_text = lambda t: {int(x) for x in re.findall(r'\d+', t)}  # noqa: E731
        fa_nums = numbers_in_text(fa['verbatim'] + ' ' + fa.get('verbatim2', ''))
        gb_nums = numbers_in_text(gb['verbatim'] + ' ' + gb.get('verbatim2', ''))
        c_lo, c_hi = bands.get('canister_inside', [None, None])
        dbl = bands.get('double_canister_inside')
        conds.append(cond('the canister band begins where the Instruction for Field Artillery says (350 yd)', c_lo in fa_nums, 'kit %s, manual figures %s' % (c_lo, sorted(fa_nums))))
        conds.append(cond('the canister band ends inside the maximum-effect band of Gibbon (400 to 450 yd)', c_hi in gb_nums or (c_hi is not None and any(a <= c_hi <= b for a, b in [(400, 450)])), 'kit %s, Gibbon figures %s' % (c_hi, sorted(gb_nums))))
        conds.append(cond('the double-canister band is a documented figure of a manual (150 to 160 yd), or the disagreement is carried as a conflict of the kit', dbl in fa_nums or any('double' in json.dumps(c).lower() for c in (W.get('artillery') or {}).get('conflicts') or []),
                          'kit %s yd; the manual prints %s; no conflict of the kit carries the difference (the kit note says: %s)' % (dbl, sorted(n for n in fa_nums if n > 100), (ac.get('manual_check') or '')[:120])))
        ocr_res = [ocr.phrase(fa['manual'], fa['verbatim']), ocr.phrase(gb['manual'], gb['verbatim'])]
        conds.append(cond('the manual phrases were found again in the OCR text in this run', all(x == 'found' for x in ocr_res), 'ocr %s' % ocr_res))
        bad = first_failed(conds)
        ev = {'conditions': conds, 'kit_bands': bands, 'tier': ac.get('tier'), 'ocr': ocr_res}
        if any(x in ('no_text', 'sha_mismatch') for x in ocr_res) and len(bad) == 1:
            rec.item('Q14/Q14.3/band-rule/default', 'NOT-RUN', 'the manual phrases cannot be re-matched here (OCR text not on this machine)', ev, **kw('band-rule'))
        elif bad:
            rec.item('Q14/Q14.3/band-rule/default', 'FAIL', 'ammunition bands: ' + '; '.join(bad), ev, **kw('band-rule'))
        else:
            rec.item('Q14/Q14.3/band-rule/default', 'PASS', 'the kit bands agree with the manuals and the OCR phrases were found again', ev, **kw('band-rule'))
    evs = D.get('events') or []
    if not evs:
        rec.item('Q14/Q14.3/events/default', 'BLOCKED-INPUT', OPEN_PROJECTILE_EVENTS + ' (so no ammunition is chosen by range anywhere in the product)', {'plans': sum(len(v) for v in D['plans'].values())}, **kw('events'))
    c_lo, c_hi = (bands.get('canister_inside') or [None, None]) if bands else (None, None)
    for n, e in enumerate(evs):
        r_, yd = e['round'], e['range_yd']
        if c_lo is None:
            continue
        want = ('canister', 'double_canister') if yd < c_lo else ('shot', 'shell', 'case', 'canister', 'double_canister') if yd <= c_hi else ('shot', 'shell', 'case')
        iid = 'Q14/Q14.3/event/%s:%d/%s' % (e['unit'], n, e['scenario'])
        kw2 = dict(check='Q14.3', scenario=e['scenario'], subjects=[e['unit']], sub_requirements=rows)
        if r_ in want:
            rec.item(iid, 'PASS', 'a %s round at %.0f yd agrees with the bands (canister inside %s, shot, shell and case beyond %s)' % (r_, yd, c_lo, c_hi), dict(e, bands=bands), **kw2)
        else:
            rec.item(iid, 'FAIL', 'a %s round is fired at %.0f yd; the bands say canister inside %s yd and shot, shell or case beyond %s yd' % (r_, yd, c_lo, c_hi), dict(e, bands=bands), **kw2)


# ======================================================================================== Q14.4
def rate_ceiling(K, ocr, weapon):
    """(ceiling per 60 s, documented?, evidence) for a plan weapon: guns from the manuals (a primary source, found again in the OCR); a muzzle-loading long arm from the plan's typical figure (a lead)."""
    if weapon == 'cannon':
        fa, gb = K['items'].get('ART-FA-100'), K['items'].get('ART-GB-21')
        res, nums = [], []
        try:
            from kit_evidence_lib import numbers_in_text  # noqa: PLC0415
        except Exception:
            numbers_in_text = lambda t: {int(x) for x in re.findall(r'\d+', t)}  # noqa: E731
        for it in (fa, gb):
            if not it:
                continue
            ph = [it['verbatim']] + ([it['verbatim2']] if it.get('verbatim2') else [])
            res.append({'item': it['id'], 'manual': it['manual'], 'phrases': [ocr.phrase(it['manual'], p) for p in ph], 'text': ' | '.join(ph)})
            nums += list(numbers_in_text(' '.join(ph)))
        return (max(nums) if nums else None), True, {'items': res, 'figures': sorted(set(nums)), 'reading': 'documented maximum: the highest rate a manual prints (Gibbon: two or three shots a minute when pressed; the Instruction: two solid shot or three canisters a minute)'}
    r = None
    for q in ((K['weapons'] or {}).get('ammunition') or {}).get('rates_and_ranges') or []:
        if 'muzzle_loader_per_min' in (q.get('values') or {}):
            r = q['values']['muzzle_loader_per_min']
    return (max(r) if r else None), False, {'plan_typical_per_min': r, 'reading': 'no manual prints a maximum for a rifle-musket (INF-RATE-01 is a minimum drill standard); the plan prints 2 to 3 a minute as typical on lead sources: a ceiling that is no documented bound (X-46)',
                                            'inf_rate_01': (K['items'].get('INF-RATE-01') or {}).get('rate')}


def q144_rates(rec, env, D, K, ocr, rows, gap_entries=None):
    gap_entries = gap_entries or GAP_ENTRIES
    rate_cache = {}
    scen = D['plans']
    for sid_ in sorted(scen):
        bad = []
        for p in scen[sid_]:
            w = p['weapon']
            if w not in rate_cache:
                rate_cache[w] = rate_ceiling(K, ocr, w)
            ceil, documented, cev = rate_cache[w]
            mx = p['max_in_60s']['count']
            ev = {'plan': {k: p[k] for k in ('unit', 'activity', 'mode', 'weapon', 'n', 'start_s', 'end_s', 'cycle_min', 'cycle_max', 'floor_s', 'window_s', 'shots')}, 'max_in_60s': p['max_in_60s'], 'ceiling_per_60s': ceil, 'documented_maximum': documented, 'ceiling_evidence': cev}
            if p['window_s'] == 0:
                continue
            iid = 'Q14/Q14.4/%s:%s/%s' % (p['animator'], p['activity'], sid_)
            if sid_ != 'default':
                if ceil is not None and mx > ceil:
                    bad.append({'unit': p['animator'], 'activity': p['activity'], 'max_in_60s': mx, 'ceiling': ceil})
                continue
            kw = dict(check='Q14.4', scenario=sid_, subjects=[p['unit']], sub_requirements=rows)
            if ceil is None:
                rec.item(iid, 'BLOCKED-INPUT', 'input missing: no rate of fire is documented for the %s weapon class of this plan' % w, ev, **kw)
            elif mx > ceil:
                rec.item(iid, 'FAIL', 'a figure of the %s plan fires %d shots inside one 60-second window (at %s s); the %s is %d a minute (%s)' % (p['activity'], mx, p['max_in_60s']['t_s'], 'documented maximum' if documented else "plan's typical figure, a lead", ceil, '; '.join(r['item'] for r in cev.get('items', [])) or 'plan'), ev, **kw)
            elif documented:
                ph = [x for r in cev['items'] for x in r['phrases']]
                if all(x == 'found' for x in ph):
                    rec.item(iid, 'PASS', 'no piece fires more than %d shots in any 60-second window of this plan (largest %d, %d shots over %.0f s); the documented maximum was found again in the manuals\' OCR text' % (ceil, mx, p['shots'], p['window_s']), ev, **kw)
                else:
                    rec.item(iid, 'NOT-RUN', 'within the documented maximum (%d, largest %d) but the manual phrases are not re-matched here (OCR text not on this machine)' % (ceil, mx), ev, **kw)
            else:
                ok, why, states = covered_by_register(env, gap_entries['rate'])
                ev['register'] = states
                if ok:
                    rec.item(iid, 'COVERED', 'within the plan\'s typical figure (%d) but no maximum is documented (W.1 gap); covered by an L3 register entry' % ceil, ev, **kw)
                else:
                    rec.item(iid, 'FAIL', 'no documented maximum rate exists for this weapon class and the gap is not covered: %s (largest %d in 60 s against the plan\'s typical %d)' % ('; '.join(why), mx, ceil), ev, **kw)
        if sid_ != 'default':
            ev = {'plans': len(scen[sid_]), 'exceeding_the_ceiling': bad}
            iid = 'Q14/Q14.4/plans-scan/%s' % sid_
            kw = dict(check='Q14.4', scenario=sid_, subjects=sorted({b['unit'] for b in bad}) or ['plans'], sub_requirements=rows)
            has_undocumented = any(not rate_cache.get(p['weapon'], (None, False, None))[1] for p in scen[sid_])
            if bad:
                rec.item(iid, 'FAIL', '%d of %d plans exceed the ceiling in scenario %s' % (len(bad), len(scen[sid_]), sid_), ev, **kw)
            elif has_undocumented:
                rec.item(iid, 'BLOCKED-INPUT', 'input missing: a documented maximum rate for every weapon class of the plans (a muzzle-loading long arm has none): the plans stay inside the ceilings in scenario %s but that is not a pass' % sid_, ev, **kw)
            else:
                rec.item(iid, 'PASS', 'every plan stays inside the documented maximum in scenario %s' % sid_, ev, **kw)
    if not scen.get('default'):
        rec.item('Q14/Q14.4/plans/default', 'BLOCKED-INPUT', 'input missing: the product builds no fire plan in the default scenario to check', {}, check='Q14.4', scenario='default', subjects=['plans'], sub_requirements=rows)


# ======================================================================================== Q14.5
def plan_text_totals(plan):
    """The printed army totals of the plan (p. 79): '366-372 Union, 281-282 Confederate'."""
    if not plan:
        return None
    for n, ln in enumerate(plan.split('\n'), 1):
        m = re.search(r'(\d+)\s*[-–]\s*(\d+)\s+Union,\s*(\d+)\s*[-–]\s*(\d+)\s+Confederate', ln)
        if m:
            a, b, c, d = (int(x) for x in m.groups())
            return {'line': n, 'text': ln.strip(), 'US': [a, b], 'CS': [c, d]}
    return None


def date_end_min(s):
    """Minutes since 1863-06-01 00:00 of the end of the last day of an as_of ('1863-07-01' or '1863-07-01/1863-07-03')."""
    m = re.findall(r'(\d{4})-(\d{2})-(\d{2})', str(s or ''))
    if not m:
        return None
    y, mo, d = (int(x) for x in m[-1])
    import datetime
    return int((datetime.date(y, mo, d) - datetime.date(1863, 6, 1)).days * 1440 + 1439)


def q145_counts(rec, env, D, K, rows, rowmap):
    vb = K.get('vb')
    vbu = {}
    table_ok = vb is not None and vb.get('schema') in VB_SCHEMAS
    if table_ok:
        vbu = dict(vb.get('batteries') or {})
    fired = {}
    for p in D['plans'].get('default', []):
        if p['activity'] == 'serve_guns':
            fired[p['unit']] = fired.get(p['unit'], 0) + p['n']
    for b in sorted(D['batteries'], key=lambda x: x['id']):
        bid = b['id']
        g = b['guns']
        kw = dict(check='Q14.5', scenario='default', subjects=[bid], sub_requirements=rows)
        conds = [cond('the guns the world draws equal the count the layer states', (g['status'] != 'drawn') or b['world']['guns'] == g['count'], 'layer %s, world %s' % (g['count'], b['world']['guns']))]
        if bid in fired:
            conds.append(cond('the pieces whose fire the crowd driver builds equal the guns drawn for the battery (a battery whose count is not stated fires no invented number of pieces)', fired[bid] == (g['count'] if g['status'] == 'drawn' else 0),
                              'the crowd driver fires %d piece(s); the layer draws %s (status %s)' % (fired[bid], g['count'] if g['status'] == 'drawn' else 0, g['status'])))
        bad = first_failed(conds)
        ev = {'layer_guns': g, 'world': b['world'], 'render': b['render'], 'fired_pieces': fired.get(bid), 'conditions': conds}
        if bad:
            rec.item('Q14/Q14.5/%s/default' % bid, 'FAIL', 'gun count: ' + '; '.join(bad), dict(ev, layer_only_result='FAIL'), **kw)
            continue
        if not table_ok:
            rec.item('Q14/Q14.5/%s/default' % bid, 'BLOCKED-INPUT', MISSING_VB + ' (layer-only finding: the guns drawn equal the guns fired and the count stated)', dict(ev, layer_only_result='PASS', missing=VB_REL), **kw)
            continue
        t = vbu.get(bid)
        if t is None or t.get('unverified') or not (t.get('range_by_date') or {}):
            rec.item('Q14/Q14.5/%s/default' % bid, 'BLOCKED-INPUT', 'input missing: the verified battery table has %s for this battery' % ('no row' if t is None else 'no verified gun count (status %s)' % t.get('status')), ev, **kw)
            continue
        cmp_ = []
        for d, st in sorted(t['range_by_date'].items()):
            end = date_end_min(d)
            present = (b.get('enter_min') is not None and end is not None and b['enter_min'] <= end)
            have = (g['count'] if g['status'] == 'drawn' else 0) if present else 0
            ok = any(r['low'] <= have <= r['high'] for s_, r in st.items() if s_ in ('present', 'engaged'))
            cmp_.append({'date': d, 'layer_guns': have, 'present': present, 'table': {s_: [r['low'], r['high']] for s_, r in st.items()}, 'ok': ok})
        types = set(x['type_id'] for x in g['types'])
        cand = set()
        for f in t.get('guns') or []:
            for pc in f.get('pieces') or []:
                cand |= set(pc.get('type_candidates') or [])
        conds2 = [cond('the count equals a verified total for every date the table has', all(c['ok'] for c in cmp_), json.dumps([c for c in cmp_ if not c['ok']][:2])),
                  cond('the type is one the verified figures allow', (not cand) or (not types) or types <= cand, 'layer %s, table %s' % (sorted(types), sorted(cand)))]
        bad2 = first_failed(conds2)
        ev2 = dict(ev, table_dates=cmp_, conditions=conds + conds2)
        if bad2:
            rec.item('Q14/Q14.5/%s/default' % bid, 'FAIL', 'gun count: ' + '; '.join(bad2), ev2, **kw)
        else:
            rec.item('Q14/Q14.5/%s/default' % bid, 'PASS', 'guns by type and number equal the verified battery table on every date it has', ev2, **kw)
    # army totals against the plan's printed ranges
    tot = plan_text_totals(K.get('plan'))
    for side, name in (('US', 'union'), ('CS', 'confederate')):
        iid = 'Q14/Q14.5/army-total/%s' % side
        kw = dict(check='Q14.5', scenario='default', subjects=['army-total-%s' % side], sub_requirements=rows)
        have = D['drawn_guns'][name]
        if not tot:
            rec.item(iid, 'BLOCKED-INPUT', 'input missing: the printed army totals of the plan (BIBLE/plan-clean.txt, p. 79) could not be read', {'layer_guns': have}, **kw)
            continue
        lo, hi = tot[side]
        ev = {'layer_guns_drawn': have, 'plan_range': [lo, hi], 'plan_line': tot['line'], 'plan_text': tot['text']}
        if lo <= have <= hi:
            rec.item(iid, 'PASS', 'the layer draws %d guns, inside the plan\'s printed range %d to %d' % (have, lo, hi), ev, **kw)
        else:
            rec.item(iid, 'FAIL', 'the layer draws %d %s guns; the plan prints %d to %d on the field (p. 79, line %d of the plan text)' % (have, name, lo, hi, tot['line']), ev, **kw)
    # per emplacement G-01 .. G-18
    S = (K.get('structures') or {}).get('structures') or []
    for s in sorted([x for x in S if str(x.get('id', '')).startswith('G-')], key=lambda x: x['id']):
        gid = s['id']
        rec.item('Q14/Q14.5/%s/default' % gid, 'BLOCKED-INPUT', 'input missing: no machine record of the batteries, gun types and counts at emplacement %s by time (structures.json holds the printed description only)' % gid,
                 {'description': str(s.get('description'))[:240], 'time_printed': s.get('time_printed'), 'emplacement_class': s.get('emplacement_class')}, check='Q14.5', scenario='default', subjects=[gid], sub_requirements=sorted(set(rows + [rowmap.get(gid)] if rowmap.get(gid) else rows)))


# ======================================================================================== Q14.6
def q146_expenditure(rec, env, D, K, rows):
    a = K['items'].get('ORD-BATT-WAR')
    stock = (a or {}).get('data', {}).get('per_gun')
    dbl = 'double' in (K['items'].get('ART-FA-116') or {}).get('verbatim', '').lower()
    for sid_ in sorted(D['plans']):
        per = {}
        for p in D['plans'][sid_]:
            if p['activity'] != 'serve_guns' or p['window_s'] == 0:
                continue
            e = per.setdefault(p['unit'], {'pieces': 0, 'shots': 0, 'window_s': p['window_s']})
            e['pieces'] += p['n']
            e['shots'] += p['shots']
        bad = []
        for unit, e in sorted(per.items()):
            ceiling = None
            if stock and dbl:
                ceiling = 2 * stock * e['pieces']
            ev = {'unit': unit, 'pieces': e['pieces'], 'rounds_expended': e['shots'], 'window_s': e['window_s'], 'documented_stock_per_gun': stock, 'campaign_allowance_double': dbl, 'ceiling': ceiling,
                  'sources': ['ORD-BATT-WAR (Instruction for Field Artillery, Part I Art. II, war establishment)', 'ART-FA-116 (campaign allowance)']}
            if sid_ != 'default':
                if ceiling is not None and e['shots'] > ceiling:
                    bad.append(dict(ev))
                continue
            kw = dict(check='Q14.6', scenario=sid_, subjects=[unit], sub_requirements=rows)
            iid = 'Q14/Q14.6/%s/%s' % (unit, sid_)
            if ceiling is None:
                rec.item(iid, 'BLOCKED-INPUT', 'input missing: no documented per-battery stock (the war-establishment item ORD-BATT-WAR with its per-gun figure, or ART-FA-116)', ev, **kw)
            elif e['shots'] > ceiling:
                rec.item(iid, 'FAIL', 'the battery fires %d rounds from %d pieces over %.0f s; the documented stock is %d a gun and the campaign allowance double that (%d for the battery)' % (e['shots'], e['pieces'], e['window_s'], stock, ceiling), ev, **kw)
            else:
                rec.item(iid, 'PASS', 'the %d rounds fired are inside the documented campaign allowance of %d' % (e['shots'], ceiling), ev, **kw)
        if sid_ != 'default':
            iid = 'Q14/Q14.6/batteries-scan/%s' % sid_
            kw = dict(check='Q14.6', scenario=sid_, subjects=sorted(b['unit'] for b in bad) or ['batteries'], sub_requirements=rows)
            if bad:
                rec.item(iid, 'FAIL', '%d of %d firing batteries exceed the documented allowance in scenario %s' % (len(bad), len(per), sid_), {'exceeding': bad[:10], 'batteries': len(per)}, **kw)
            elif per:
                rec.item(iid, 'PASS', 'every firing battery stays inside the documented allowance in scenario %s' % sid_, {'batteries': len(per)}, **kw)
    if not any(p['activity'] == 'serve_guns' for p in D['plans'].get('default', [])):
        rec.item('Q14/Q14.6/batteries/default', 'BLOCKED-INPUT', 'input missing: no battery fires in the default scenario, so there is no expenditure to compare with a documented stock', {}, check='Q14.6', scenario='default', subjects=['batteries'], sub_requirements=rows)
    rec.owe('Q14.6: the documented per-battery expenditures (Smith 4th NY 240 rounds, Wheeler 13th NY 850, Bigelow about three tons including 92 canister, McCarthy 20) are not mapped to roster batteries here; only the war-establishment stock of the Instruction for Field Artillery is applied')


# ======================================================================================== Q14.7
def q147_crew(rec, env, D, K, ocr, rows):
    kw = lambda subj: dict(check='Q14.7', scenario='default', subjects=[subj], sub_requirements=rows)  # noqa: E731
    C = K.get('conflicts') or {}
    crew_conf = [c for c in (C.get('conflicts') or []) if re.search(r'crew|detachment|cannoneer', json.dumps(c), re.I)]
    kitc = [c for c in ((K.get('weapons') or {}).get('artillery') or {}).get('conflicts') or [] if re.search(r'crew', json.dumps(c), re.I)]
    posts = D['crew']['posts']
    conds = [cond('a source conflict of the crew (eight or nine at the piece) is registered', bool(crew_conf or kitc), 'no conflict about the crew in conflicts_structured.json (47) or in the kit conflicts'),
             cond('the product offers the crew size as a selectable scenario value (the crew posts differ with the choice)', bool(D['crew'].get('selectable')), '%s (%d posts, crowd driver %s)' % (D['crew'].get('selectable_basis'), len(posts), D['crew']['crowd_per_gun']))]
    bad_c = first_failed(conds)
    ev_c = {'conditions': conds, 'posts': posts, 'crew_conflicts': [c.get('id') for c in crew_conf + kitc], 'register': 'EG-0018 names the Confederate crew size as a gap'}
    if bad_c:
        rec.item('Q14/Q14.7/crew-size/default', 'FAIL', 'crew size: ' + '; '.join(bad_c), ev_c, **kw('crew-size'))
    else:
        rec.item('Q14/Q14.7/crew-size/default', 'PASS', 'the crew of eight or nine at the piece is a registered conflict and a selectable scenario value', ev_c, **kw('crew-size'))
    roles = {r['role']: r for r in ((((K.get('weapons') or {}).get('artillery') or {}).get('crew')) or {}).get('roles') or []}
    miss = [p for p in posts if p not in roles or not roles[p].get('manual_item_ids')]
    ids = sorted({i for p in posts if p in roles for i in roles[p].get('manual_item_ids') or []})
    res = {}
    for i in ids:
        it = K['items'].get(i)
        res[i] = ocr.phrase(it['manual'], it['verbatim']) if it else 'no_item'
    ev = {'posts': posts, 'posts_without_a_documented_role': miss, 'manual_items': res}
    if miss or any(v == 'no_item' for v in res.values()):
        rec.item('Q14/Q14.7/crew-posts/default', 'FAIL', 'the product draws posts with no documented role/manual item: %s; missing items %s' % (miss, [k for k, v in res.items() if v == 'no_item']), ev, **kw('crew-posts'))
    elif any(v in ('no_text', 'sha_mismatch') for v in res.values()):
        rec.item('Q14/Q14.7/crew-posts/default', 'NOT-RUN', 'every post has a documented role but the manual phrases cannot be re-matched here (OCR text not on this machine)', ev, **kw('crew-posts'))
    elif any(v != 'found' for v in res.values()):
        rec.item('Q14/Q14.7/crew-posts/default', 'FAIL', 'a manual phrase for a post is not found in the OCR text: %s' % {k: v for k, v in res.items() if v != 'found'}, ev, **kw('crew-posts'))
    else:
        rec.item('Q14/Q14.7/crew-posts/default', 'PASS', 'each of the %d posts has a documented role and its manual phrases were found again in the OCR text' % len(posts), ev, **kw('crew-posts'))
    rec.item('Q14/Q14.7/drill-state-machine/default', 'NOT-RUN', 'not implemented in this runner: the ten states of one gun detachment (B.6.14.3) and their timing need a machine list of the product\'s detachment states to compare with the kit\'s drill_states; owed', {'kit_drill_states': (K.get('weapons') or {}).get('meta', {}).get('counts', {}).get('drill_states')}, **kw('drill-state-machine'))
    rec.owe('Q14.7: the drill state machine of a gun detachment (ten states, B.6.14.3) is not compared with the product (needs a machine list of the product\'s detachment states)')


# ======================================================================================== the run
def evaluate(rec, env, D, K, ocr=None, gap_entries=None):
    rows, _ = gate_rows(env, GATE)
    ocr = ocr or OcrStore(env, K.get('sources'))
    rowmap = {}
    fn = os.path.join(env.gov, 'requirements.json')
    try:
        with open(fn, encoding='utf-8') as f:
            ids = {s['id'] for s in json.load(f)['sub_requirements']}
        rowmap = {i.split('.')[-1]: i for i in ids if i.startswith('R13.G-')}
    except (OSError, ValueError, KeyError):
        pass
    q141_weapons(rec, env, D, K, rows)
    q142_ranges(rec, env, D, K, ocr, rows, gap_entries)
    q143_bands(rec, env, D, K, ocr, rows)
    q144_rates(rec, env, D, K, ocr, rows, gap_entries)
    q145_counts(rec, env, D, K, rows, rowmap)
    q146_expenditure(rec, env, D, K, rows)
    q147_crew(rec, env, D, K, ocr, rows)
    ss = D.get('scenario_set') or {}
    if not ss.get('complete'):
        rec.incomplete('scenario set: %s (%s)' % (ss.get('id'), ss.get('note') or 'not S*'))
        rec.owe('Q14.4, Q14.6: the scenario set S* was not enumerated; this run covered %s scenario(s): %s' % (ss.get('count'), ss.get('note')))
    rec.extra['scenario_set'] = ss
    if K.get('vb') is None:
        rec.owe('Q14.5 needs `kit/verified_batteries.json` to be written by its owner before any battery item can leave BLOCKED-INPUT')
    elif K['vb'].get('schema') not in VB_SCHEMAS:
        rec.incomplete('the verified battery table has the schema %r, which this runner does not know' % K['vb'].get('schema'))
    rec.owe('Q14.2: OCR texts of the manuals that are not under tmp/library/misc are read from tmp/bt-gates/library-misc when it exists; a run without either has NOT-RUN items')
    if K.get('missing'):
        rec.incomplete('inputs missing: %s' % '; '.join(K['missing']))


def run(env, dump=None, inputs=None, ocr=None, write=True, mutate=None, scenarios='sample', argv=None, gap_entries=None):
    rec = Record(GATE, env, renderer_class='mixed', argv=argv)
    rec.tool_versions['node'] = node_version()
    K = inputs if inputs is not None else load_inputs(rec, env)
    D = dump if dump is not None else layer_dump(env, 'q14_layer.mjs', ['--scenarios', scenarios], mutate=mutate)
    evaluate(rec, env, D, K, ocr, gap_entries)
    rec.extra['verified_battery_table'] = {'path': 'docs/battle-theatre/' + VB_REL, 'present': K.get('vb') is not None, 'schema': (K.get('vb') or {}).get('schema'), 'batteries': len((K.get('vb') or {}).get('batteries') or {})}
    out = rec.finish()
    if write:
        rec.write(out)
    return rec, out


def main(argv=None):
    ap = base_parser(__doc__.split('\n')[0])
    ap.add_argument('--scenarios', default='sample', choices=['default', 'sample', 'ofat'], help='scenario set for the fire plans (default: sample = default and six samples; none is S*)')
    ap.add_argument('--mutate', default=None, help='test hook: a module that injects a defect into the real pipeline (see oob_layer_lib.mjs)')
    a = ap.parse_args(argv)
    env = Env(root=a.root, out=a.out)
    rec, out = run(env, write=not a.no_write, mutate=a.mutate, scenarios=a.scenarios, argv=['python3', 'tools/bt/gates/q14_ordnance.py'] + list(argv if argv is not None else sys.argv[1:]))
    if not a.quiet:
        c = out['counts']
        print('Q14 verdict %s: %d items, PASS %d, COVERED %d, FAIL %d, NOT-RUN %d, BLOCKED-INPUT %d, N/A %d' % (out['verdict'], out['totals']['items'], c['PASS'], c['COVERED'], c['FAIL'], c['NOT-RUN'], c['BLOCKED-INPUT'], c['N/A']))
    return {'PASS': 0, 'FAIL': 1, 'INCOMPLETE': 2}[out['verdict']]


if __name__ == '__main__':
    guarded_main(main)
