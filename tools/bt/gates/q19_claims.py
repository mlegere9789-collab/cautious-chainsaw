#!/usr/bin/env python3
"""Gate Q19, claim ledger: "every visible-result datum has two independent sources or a flag; no lead-only support."

Defined by docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC.md (Q19.1 to Q19.7, K3: COVERED counts, A-07, A-22, U-17, DD-G11).
Command:  python3 tools/bt/gates/q19_claims.py [--root DIR] [--out DIR] [--layer-dump FILE] [--tier-names FILE] [--no-write]
          (light to medium: reads every visible datum class of tools/bt/gates/datum_classes.json; no network)
Output:   docs/battle-theatre/GOVERNANCE/gate_results/Q19.json

An item is a visible datum class (a class whose values change what is seen or heard); every member of the class is judged (K10):
  Q19.1  census of the visible data by class, with claim ids: a class with no claim id on its members is listed.
  Q19.2  ledger link: each member names claim ids that resolve in the claim ledgers (position ledgers, troop maps, layer claims, day positions, vegetation and memorial claims) to a span
         (a quote and a report with a page, or character offsets) in a stored source. A member that is itself a ledger claim links to itself.
  Q19.3  independence: two sources are independent when the Source Manifest RECORDS their relation (`independent_of` or `derived_from` present on both) and neither is in the other's ancestry
         and they share no root. A manifest entry with no recorded relation is "not recorded", never "independent": nothing is assumed (the Source Manifest of the layer has no such field today).
  Q19.4  two or a flag: PASS iff the member has two independent non-lead, non-weak sources; COVERED (the gate text has the branch) iff it is flagged (single source, lead only, inferred or procedural),
         the flag is shown in the product, and an open register entry names where the second source would come from; FAIL otherwise.
  Q19.5  no lead-only support: no documented member rests on lead (or weak) sources alone.
  Q19.6  conflicts: the claims that disagree are grouped (`conflicts_with` of the ledgers, resolving both ways) and every conflict C-001..C-047 has its default recorded as a delegated default with its
         label and its tier, every value selectable; the support of each value is computed by Q19.3 (it cannot be where no independence is recorded).
  Q19.7  built once: every claim has a span; the ledger of Section P over every datum class (GOVERNANCE/claim_ledger.json or app/data/claim-ledger.json) exists; the disposition table has a row per claim.
"""
import json
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (HERE, os.path.join(HERE, 'lib')):          # explicit, so that `python3 -I` (no script folder on sys.path) finds q02_provenance
    if _p not in sys.path:
        sys.path.insert(0, _p)
import pq_common as pq  # noqa: E402
import datum_scan as ds  # noqa: E402
import q02_provenance as q02  # noqa: E402

GATE = 'Q19'
SECTION_P_LEDGERS = ('docs/battle-theatre/GOVERNANCE/claim_ledger.json', 'docs/battle-theatre/app/data/claim-ledger.json', 'docs/battle-theatre/app/data/claims.json')
FLAG_SHOWN_TEXT = ('single source', 'single-source', 'lead only')


class Rel:
    """The independence relation of the Source Manifest: recorded relations only."""

    def __init__(self, man):
        self.man = man

    def recorded(self, sid):
        f = self.man.fields.get(sid)
        return bool(f) and (f.get('independent_of') is not None or f.get('derived_from') is not None)

    def ancestry(self, sid, seen=None):
        seen = seen if seen is not None else set()
        f = self.man.fields.get(sid) or {}
        for k in ('independent_of', 'derived_from'):
            for a in ds.as_list(f.get(k)):
                if isinstance(a, str) and a not in seen:
                    seen.add(a)
                    self.ancestry(a, seen)
        return seen

    def roots(self, sid):
        anc = self.ancestry(sid)
        r = {a for a in anc if not self.ancestry(a)}
        return r or {sid}

    def independent(self, a, b):
        if a == b or not (self.recorded(a) and self.recorded(b)):
            return False
        if a in self.ancestry(b) or b in self.ancestry(a):
            return False
        return not (self.roots(a) & self.roots(b))


def claim_index(sc):
    """claim id -> {tier, quote, report, page, span} over the ledger classes."""
    idx = {}
    for cid, c in sc.classes.items():
        if not c.get('claims'):
            continue
        for m in sc.members(cid) or []:
            k = m['extra'].get('claim_id') or (m['claim_ids'][0] if cid == 'layer.provenance.claims' and m['claim_ids'] else None)
            if not k and cid in ('data.daypositions', 'data.vegetation', 'data.site_memorial_years', 'data.placement_claims'):
                mm = re.search(r'\.claims\.([^.\[]+)$', m['id']) or re.search(r':([^:]+)$', m['id'])
                k = mm.group(1) if mm else None
            if k:
                has_span = bool(m['quote']) and bool(m['sources'] or m['extra'].get('report_id') or m['extra'].get('volume'))
                idx.setdefault(str(k), {'tier': m['tier'], 'quote': m['quote'], 'span': has_span, 'class': cid, 'sources': m['sources']})
    return idx


def flag_shown_in_product(env, content_classes, cid):
    """Is the flag of a member shown in the product? The tier marks of a class are shown when the class's mark code is found (static search); a 'single source' flag when the interface code says so."""
    ok = {}
    for c in content_classes.get('classes', []):
        if cid in c.get('datum_classes', []) and c.get('mark_evidence'):
            miss = False
            for e in c['mark_evidence']:
                p = os.path.join(env.root, *e['file'].split('/'))
                if not os.path.isfile(p) or any(pat not in open(p, encoding='utf-8').read() for pat in e['patterns']):
                    miss = True
            ok['tier_mark'] = not miss
    ok.setdefault('tier_mark', False)
    src = os.path.join(env.bt, 'app', 'src')
    single = False
    if os.path.isdir(src):
        for dp, dn, fn in os.walk(src):
            for f in fn:
                if f.endswith('.mjs'):
                    t = open(os.path.join(dp, f), encoding='utf-8').read()
                    if any(x in t for x in ('flag_single_source', 'single source', 'single-source')):
                        single = True
    ok['single_source'] = single
    return ok


def main(argv=None):
    ap = pq.base_parser(__doc__.split('\n')[0])
    ap.add_argument('--registry', default=os.path.join(HERE, 'datum_classes.json'))
    ap.add_argument('--content-classes', default=os.path.join(HERE, 'content_classes.json'))
    ap.add_argument('--layer-dump', default=None)
    ap.add_argument('--tier-names', default=None)
    ap.add_argument('--app', default=None)
    args = ap.parse_args(argv)
    env = pq.Env(args.root, args.out)
    rec = pq.Record(GATE, env, covered_counts=True, argv=['python3', 'tools/bt/gates/q19_claims.py'] + (argv if argv is not None else sys.argv[1:]))
    rec.owe('Q19.3 independence needs a recorded relation (`independent_of` or `derived_from`) on every Source Manifest entry; the owner of the manifest writes it, no runner invents one')
    try:
        registry = rec.read_json(args.registry, 'datum-class registry')
    except pq.InputMissing as e:
        rec.blocked('Q19/Q19.1/census', str(e), 'the datum-class registry')
        return pq.finish_cli(rec, args)
    try:
        cc = rec.read_json(args.content_classes, 'content-class registry')
    except pq.InputMissing:
        cc = {'classes': []}
        rec.note('content-class registry missing: no flag can be shown to be in the product')
    tmp = tempfile.mkdtemp(prefix='q19-')
    layer = None
    try:
        if args.layer_dump:
            rec.add_input(args.layer_dump, 'layer dump')
            layer = json.load(open(args.layer_dump, encoding='utf-8'))
        else:
            layer = q02.run_layer_dump(env, rec, args.app, os.path.join(tmp, 'layer.json'))
    except (pq.InputMissing, OSError, ValueError) as e:
        rec.note('the history layer could not be built: %s' % e)
    sc = ds.Scanner(env, rec, registry, layer, {})
    stm = sc.statements()
    try:
        names = {}
        if stm:
            if args.tier_names:
                rec.add_input(args.tier_names, 'tier readings')
                names = json.load(open(args.tier_names, encoding='utf-8'))
            else:
                names = q02.run_tier_names(env, rec, args.app, stm, os.path.join(tmp, 'names.json'))
        sc.apply_tiernames(names)
    except pq.InputMissing as e:
        rec.note('tier statements could not be read by the app code: %s' % e)
        rec.incomplete('the app\'s own reading of tier statements did not run')
    man = ds.Manifests(env, rec, (layer or {}).get('manifest'))
    rel = Rel(man)
    ctx = type('Ctx', (), {})()
    ctx.manifests = man
    reg_entries = {}
    try:
        for e in rec.read_json(os.path.join(env.gov, 'register_index.json'), 'register index'):
            if e.get('status') in ('open', 'awaiting owner') and os.path.isfile(os.path.join(env.gov, 'register', e['id'] + '.md')):
                reg_entries[e['id']] = e
    except pq.InputMissing:
        rec.note('register index missing: no entry names where a second source would come from')
    cidx = claim_index(sc)
    visible = [cid for cid in sorted(sc.classes) if sc.classes[cid].get('visible', True) and not sc.classes[cid].get('conflicts') and not sc.classes[cid].get('exempt') and not sc.classes[cid].get('register_entries')]
    # ---- Q19.1 census
    rows, no_claims = [], []
    for cid in visible:
        ms = sc.members(cid)
        if ms is None:
            rec.item('Q19/Q19.1/%s' % cid, 'BLOCKED-INPUT', 'input missing: %s' % sc.error(cid), {'class': cid}, check='Q19.1')
            continue
        own_claims = bool(sc.classes[cid].get('claims'))
        with_claims = sum(1 for m in ms if m['claim_ids'] or own_claims)
        rows.append({'class': cid, 'members': len(ms), 'with_claim_ids': with_claims, 'is_a_claim_ledger': own_claims})
        if ms and not with_claims:
            no_claims.append(cid)
    rec.item('Q19/Q19.1/census', 'FAIL' if no_claims else ('PASS' if rows else 'BLOCKED-INPUT'),
             ('%d of %d visible data classes name no claim id on any member: %s' % (len(no_claims), len(rows), ', '.join(no_claims[:6]) + (' ...' if len(no_claims) > 6 else ''))) if no_claims else
             ('every visible data class has claim ids' if rows else 'input missing: no visible data class could be read'), {'classes': rows, 'ledger_claims_indexed': len(cidx)}, check='Q19.1')
    # ---- Q19.2 to Q19.5 per class
    for cid in visible:
        ms = sc.members(cid)
        if not ms:
            if ms is not None:
                rec.item('Q19/Q19.2/%s' % cid, 'FAIL', 'a visible class in which no record carries a tier or a claim', {'class': cid}, check='Q19.2')
            continue
        own = bool(sc.classes[cid].get('claims'))
        shown = flag_shown_in_product(env, cc, cid)

        def q2(m, own=own):
            if own:
                k = m['extra'].get('claim_id') or (m['claim_ids'][0] if m['claim_ids'] else None)
                if not (m['quote'] and (m['sources'] or m['extra'].get('report_id'))):
                    return ['the claim has no span in a stored source (no quote with a report or source)']
                return []
            if not m['claim_ids']:
                return ['no claim id: the datum cites no claim of the ledger']
            bad = [c for c in m['claim_ids'] if c not in cidx]
            nospan = [c for c in m['claim_ids'] if c in cidx and not cidx[c]['span']]
            out = []
            if bad:
                out.append('claim id %s resolves in no ledger' % bad[0])
            if nospan:
                out.append('claim %s has no span' % nospan[0])
            return out

        q02.scan_item(rec, 'Q19.2', cid, ms, q2, ok_reason='all %d members link to a ledger claim with a span', fail_reason='', gate='Q19')

        srcs_of = lambda m: [s for s in m['sources'] if man.resolves(s)] or m['sources']
        ind_pairs = {}

        def q3(m):
            ok = [s for s in m['sources'] if man.klass(s) == 'ok']
            norec = [s for s in ok if not rel.recorded(s)]
            out = []
            if len(ok) >= 2:
                good = any(rel.independent(a, b) for i, a in enumerate(ok) for b in ok[i + 1:])
                ind_pairs[m['id']] = good
                if not good:
                    out.append('two or more sources but no pair is shown independent (%s)' % ('independence not recorded for %s' % ', '.join(norec[:3]) if norec else 'they share a root or one derives from the other'))
            return out

        multi = [m for m in ms if len([s for s in m['sources'] if man.klass(s) == 'ok']) >= 2]
        q02.scan_item(rec, 'Q19.3', cid, multi, q3, ok_reason='every member with two or more sources has a pair shown independent', fail_reason='', na_reason='no member has two or more non-lead sources, so no independence is to be computed', gate='Q19')

        def q4(m):
            ok = [s for s in m['sources'] if man.klass(s) == 'ok']
            if len(ok) >= 2 and any(rel.independent(a, b) for i, a in enumerate(ok) for b in ok[i + 1:]):
                return []
            return ['__flag__']

        flagged_covered, plain_fail = [], []
        scanned = 0
        reasons = []
        for m in ms:
            scanned += 1
            if q4(m) == []:
                continue
            ok = [s for s in m['sources'] if man.klass(s) == 'ok']
            kinds = [man.klass(s) for s in m['sources']]
            lead_only = bool(m['sources']) and all(k in ('lead', 'weak') for k in kinds)
            why = []
            t = m['tier']
            if t in ('inferred', 'plausible-procedural', 'open gap'):
                flag = 'tier'
                if not shown['tier_mark']:
                    why.append('the tier flag (%s) is not shown in the product for this class (no mark code found)' % t)
            elif t == 'documented' and m['extra'].get('flag_single_source'):
                flag = 'single source'
                if not shown['single_source']:
                    why.append('the flag "single source" is set in the data but no code of the product shows it')
            elif t == 'documented':
                flag = None
                why.append('documented with %d independent source(s) and no flag' % (len(ok) if len(ok) < 2 else 0) if len(ok) < 2 else 'documented with sources that are not shown independent and no flag')
            else:
                flag = None
                why.append('no tier and no flag')
            if lead_only and t == 'documented':
                why.append('documented on lead or weak sources alone')
            regs = [r for r in m['register_ids'] if r in reg_entries and not pq.is_placeholder(reg_entries[r].get('searched'))]
            if not regs:
                why.append('no open register entry names where the second source would come from')
            if why:
                plain_fail.append(m['id'])
                reasons.extend((m['id'], w) for w in why)
            else:
                flagged_covered.append(m['id'])
        indep = len(ms) - len(flagged_covered) - len(plain_fail)
        ev = {'class': cid, 'scanned': scanned, 'two_independent_sources': indep, 'flagged_and_covered': len(flagged_covered), 'failing': len(plain_fail), 'reasons': q02.top_reasons(reasons),
              'first': pq.first_n(plain_fail), 'flag_shown': shown, 'tier_counts': q02.tier_counts(ms)}
        if len(plain_fail) > 20:
            ev['sidecar'] = rec.sidecar('Q194-%s' % cid.replace('.', '_'), [{'id': i, 'reason': r} for i, r in sorted(reasons)])
        if plain_fail:
            rec.item('Q19/Q19.4/%s' % cid, 'FAIL', '%d of %d members have neither two independent sources nor a shown flag with an entry for the second source: %s' % (len(plain_fail), scanned, '; '.join('%s (%d)' % (r, n) for r, n in list(ev['reasons'].items())[:3])), ev, check='Q19.4')
        elif flagged_covered:
            rec.item('Q19/Q19.4/%s' % cid, 'COVERED', '%d members are flagged with the flag shown and an entry for the second source; %d have two independent sources' % (len(flagged_covered), indep), ev, check='Q19.4')
        else:
            rec.item('Q19/Q19.4/%s' % cid, 'PASS', 'all %d members have two independent non-lead sources' % scanned, ev, check='Q19.4')

        def q5(m):
            kinds = [man.klass(s) for s in m['sources']]
            if m['sources'] and all(k in ('lead', 'weak') for k in kinds):
                if m['tier'] == 'documented':
                    return ['documented on lead or weak sources alone (%s)' % ', '.join(m['sources'][:3])]
                if any(k == 'lead' for k in kinds) and m['weak_source'] is not True:
                    return ['lead-only support not flagged weak']
            return []

        q02.scan_item(rec, 'Q19.5', cid, [m for m in ms if m['sources']], q5, ok_reason='no member rests on lead or weak sources alone', fail_reason='', na_reason='no member names a source id', gate='Q19')
    # ---- Q19.6 conflicts
    conflicts_checks(env, rec, sc, rel, man, cidx)
    # ---- Q19.7 built once
    sec_p = [p for p in SECTION_P_LEDGERS if os.path.isfile(os.path.join(env.root, *p.split('/')))]
    for p in SECTION_P_LEDGERS:
        rec.add_input(os.path.join(env.root, *p.split('/')), 'claim ledger of Section P')
    if not sec_p:
        rec.item('Q19/Q19.7/section-p-ledger', 'BLOCKED-INPUT', 'input missing: the claim ledger of Section P over every datum class (%s): claims, claim_support and conflicts as tables with character-offset spans' % ' or '.join(os.path.basename(p) for p in SECTION_P_LEDGERS[:2]),
                 {'looked_for': list(SECTION_P_LEDGERS)}, check='Q19.7')
    else:
        rec.item('Q19/Q19.7/section-p-ledger', 'PASS', 'a claim ledger file of Section P exists: %s' % ', '.join(sec_p), {'files': sec_p}, check='Q19.7')
    dp = os.path.join(env.bt, 'app', 'data', 'claim-dispositions.json')
    try:
        disp = rec.read_json(dp, 'disposition table')
        n_claims = sum(len(sc.members(c) or []) for c, k in sc.classes.items() if k['source'].get('kind') == 'jsonl' and any(re.search(r'positions_[A-E]\.jsonl$', f) for f in k['source'].get('files', [])))
        rows_n = len(disp.get('rows') or [])
        rec.item('Q19/Q19.7/disposition-rows', 'PASS' if rows_n == n_claims and n_claims else 'FAIL', ('the disposition table has one row per claim (%d)' % rows_n) if rows_n == n_claims and n_claims else
                 'the disposition table has %d rows and the position ledgers %d claims' % (rows_n, n_claims), {'rows': rows_n, 'claims': n_claims}, check='Q19.7')
    except pq.InputMissing as e:
        rec.blocked('Q19/Q19.7/disposition-rows', str(e), 'the table of what was done with each claim')
    spanless = [k for k, v in cidx.items() if not v['span'] and v['tier'] != 'open gap']
    rec.item('Q19/Q19.7/claims-have-spans', 'FAIL' if spanless else ('PASS' if cidx else 'BLOCKED-INPUT'), ('%d of %d ledger claims have no span (a claim without a span fails, P.4; open gaps are not claims)' % (len(spanless), len(cidx))) if spanless else
             ('every ledger claim has a span' if cidx else 'input missing: no ledger claim could be read'), {'claims': len(cidx), 'without_span': pq.first_n(spanless, 20), 'without_span_count': len(spanless)}, check='Q19.7')
    rec.extra['independence'] = {'manifest_entries': len(man.by), 'entries_with_a_recorded_relation': sum(1 for s in man.by if rel.recorded(s))}
    return pq.finish_cli(rec, args)


def conflicts_checks(env, rec, sc, rel, man, cidx):
    """Q19.6: the grouping of disagreeing claims, the default of every conflict recorded as a delegated default, and the support of every value."""
    ids = set(cidx)
    p = os.path.join(env.bt, 'history', 'positions')
    refs = []
    for fn in sorted(os.listdir(p)) if os.path.isdir(p) else []:
        if re.match(r'^positions_[A-E]\.jsonl$', fn):
            for row in rec.read_jsonl(os.path.join(p, fn), 'position ledger'):
                for c in row.get('conflicts_with') or []:
                    refs.append((row['claim_id'], c))
    conflict_ids = set()
    try:
        conflict_ids = {c['id'] for c in (rec.read_json(os.path.join(env.gov, 'conflicts_structured.json'), 'conflicts').get('conflicts') or [])}
    except pq.InputMissing:
        pass
    to_conflict = [(a, b) for a, b in refs if re.match(r'^C-\d+$', b)]
    to_claim = [(a, b) for a, b in refs if not re.match(r'^C-\d+$', b)]
    missing = [(a, b) for a, b in to_claim if b not in ids] + [(a, b) for a, b in to_conflict if b not in conflict_ids]
    ev = {'conflicts_with_links': len(refs), 'to_a_register_conflict': len(to_conflict), 'to_another_claim': len(to_claim), 'pointing_at_nothing': pq.first_n(['%s->%s' % x for x in missing], 20), 'pointing_at_nothing_count': len(missing)}
    rec.item('Q19/Q19.6/claim-conflict-links', 'FAIL' if missing else ('PASS' if refs else 'N/A'), ('%d conflicts_with link(s) of the position ledgers point at neither a claim nor a conflict of the register' % len(missing)) if missing else
             ('every conflicts_with link resolves to a claim or to a conflict of the register' if refs else 'no claim of the position ledgers lists a conflict'), ev, check='Q19.6')
    dp = os.path.join(env.bt, 'app', 'data', 'conflict-defaults.json')
    cp = os.path.join(env.gov, 'conflicts_structured.json')
    try:
        dd = rec.read_json(dp, 'delegated defaults')
        cs = rec.read_json(cp, 'conflicts')
    except pq.InputMissing as e:
        rec.blocked('Q19/Q19.6/defaults-recorded', str(e), 'the delegated defaults and the conflicts')
        return
    conflicts = cs.get('conflicts') or []
    entries = dd.get('conflicts') or {}
    label = dd.get('label') or ''
    prob, unc = [], []
    for c in conflicts:
        e = entries.get(c['id'])
        if not e:
            prob.append((c['id'], 'no delegated default recorded'))
        else:
            if not any(k in e for k in ('default_scenario_id', 'default', 'default_value')):
                prob.append((c['id'], 'the default is not named (default_scenario_id)'))
            if pq.is_placeholder(e.get('tier')):
                prob.append((c['id'], 'no tier on the default'))
        vals = c.get('values') or []
        if len(vals) < 2:
            prob.append((c['id'], 'fewer than two selectable values'))
        for v in vals:
            m = re.search(r'\(([A-Za-z0-9][^()]*)\)\s*$', str(v.get('label') or ''))
            keys = [k.strip() for k in re.split(r'[;,]', m.group(1)) if k.strip()] if m else []
            if not keys:
                unc.append((c['id'], 'a value names no source key, so its support cannot be computed'))
            elif any(not rel.recorded(k) for k in keys):
                unc.append((c['id'], 'the independence of the sources of a value is not recorded in any Source Manifest'))
    if not re.search(r'delegated authority.*reversible by the owner', label, re.I):
        prob.append(('label', 'the label "Default chosen under delegated authority, reversible by the owner" is not in the defaults file'))
    ev = {'conflicts': len(conflicts), 'with_a_problem': len({i for i, _ in prob}), 'reasons': q02.top_reasons(prob), 'first': pq.first_n([i for i, _ in prob])}
    rec.item('Q19/Q19.6/defaults-recorded', 'FAIL' if prob else ('PASS' if conflicts else 'BLOCKED-INPUT'), ('%d conflict(s) lack their delegated default, its tier, or two selectable values' % len({i for i, _ in prob})) if prob else
             ('every conflict has its default recorded under delegated authority, its tier and its values' if conflicts else 'input missing: the structured conflict register has no conflict'), ev, check='Q19.6')
    ev2 = {'conflicts': len(conflicts), 'values_without_computable_support': len(unc), 'reasons': q02.top_reasons(unc), 'manifest_entries_with_a_relation': sum(1 for s in man.by if rel.recorded(s)), 'manifest_entries': len(man.by)}
    rec.item('Q19/Q19.6/value-support', 'FAIL' if unc else ('PASS' if conflicts else 'BLOCKED-INPUT'), ('the support of %d conflicting value(s) is not computable: %s' % (len(unc), '; '.join('%s (%d)' % (r, n) for r, n in list(ev2['reasons'].items())[:2]))) if unc else
             ('the support of every value was computed from recorded independence' if conflicts else 'input missing: no conflict'), ev2, check='Q19.6')


if __name__ == '__main__':
    pq.guarded_main(main)
