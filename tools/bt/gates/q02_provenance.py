#!/usr/bin/env python3
"""Gate Q02, provenance completeness: "no datum without source and tier; no documented tier without a source extract."

Defined by docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC.md (Q02.1 to Q02.9, K5, K10, U-08, U-09, U-26, T-Q02-1).
Command:  python3 tools/bt/gates/q02_provenance.py [--root DIR] [--out DIR] [--registry FILE] [--layer-dump FILE] [--tier-names FILE] [--classes a,b] [--no-write]
          (heavy: it re-matches every documented extract; run it through tools/horde/bench.sh in the background. No network.)
Output:   docs/battle-theatre/GOVERNANCE/gate_results/Q02.json  (record bt-gate-result/1)

What it does, in the order of the record:
  Q02.1  the census: the page's load list (lib/loadlist.py reads app/src and render/prototype/src) is diffed against the datum-class registry (tools/bt/gates/datum_classes.json);
         a data file that the page loads and no class names is FAIL.
  Q02.2  every member of every class has a tier of the four (read the way the product reads it, with the app's own `tierName`) and a source id, or the reasoning of an inferred datum, or
         the procedural block of a plausible-procedural one; an open gap has a register entry.
  Q02.3  every documented member has a source that is neither a lead nor weak, an extract of at most 14 words, and the extract is found again in the stored text at the cited report and page
         (Official Records through tools/bt/or27_find.py, the state volumes through statevol_find.py, other texts through the acquisition ledgers); numbers of the claim stand in the span.
         A text that is not on this machine is NOT-RUN for that member, never a pass. "The claim equals what the span supports" is not machine-checkable: it is owed (U-11).
  Q02.4  an inferred member has reasoning and premise claim ids that resolve to documented claims of the ledgers.
  Q02.5  a plausible-procedural member has the complete procedural block (generator, seed, distribution, documented_context, substitute) and an open register id.
  Q02.6  every source id resolves in a Source Manifest and each manifest entry has date_written, rights and reliability_tier.
  Q02.7  every conflict lists all its values with source keys.
  Q02.8  no documented member rests on lead (or weak) sources alone; a lead-supported member is flagged weak.
  Q02.9  every kit item has valid_from and valid_to; every state change has a state_schedule.
The layer classes come from node tools/bt/gates/q02_layer.mjs (the real history layer built by the app's own code); the tier statements are read by node tools/bt/gates/q23_app.mjs.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
import pq_common as pq  # noqa: E402
import datum_scan as ds  # noqa: E402
import extracts as ex  # noqa: E402
import loadlist  # noqa: E402

GATE = 'Q02'
LOAD_EXT = ('.json', '.jsonl', '.bin', '.png', '.webp', '.glb', '.gltf', '.ogg', '.mp3', '.wav', '.jpg', '.jpeg')


class Ctx:
    pass


def top_reasons(pairs, n=8):
    c = {}
    for _, r in pairs:
        c[r] = c.get(r, 0) + 1
    return dict(sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))[:n])


def scan_item(rec, check, cid, domain, fn, *, ok_reason, fail_reason, na_reason=None, notrun=None, extra=None, gate='Q02', **kw):
    """One item (class, check): `fn(member)` returns the list of reasons that member fails; every member of the domain is judged (K10)."""
    scanned, failing, nr = 0, [], []
    for m in domain:
        scanned += 1
        for r in fn(m):
            failing.append((m['id'], r))
    ev = {'class': cid, 'scanned': scanned, 'failing': len({i for i, _ in failing}), 'failures': len(failing), 'reasons': top_reasons(failing), 'first': pq.first_n([i for i, _ in failing]), 'tier_counts': tier_counts(domain)}
    if extra:
        ev.update(extra() if callable(extra) else extra)
    notrun = notrun() if callable(notrun) else notrun
    if len(failing) > 20:
        ev['sidecar'] = rec.sidecar('%s-%s' % (check.replace('.', ''), cid.replace('.', '_')), [{'id': i, 'reason': r} for i, r in sorted(failing)])
    iid = '%s/%s/%s' % (gate, check, cid)
    if not scanned:
        rec.item(iid, 'N/A', na_reason or 'no member of the class is in the domain of this check', ev, check=check, **kw)
    elif failing:
        rec.item(iid, 'FAIL', '%d of %d members fail: %s' % (len({i for i, _ in failing}), scanned, '; '.join('%s (%d)' % (r, c) for r, c in list(ev['reasons'].items())[:3])), ev, check=check, **kw)
    elif notrun:
        rec.item(iid, 'NOT-RUN', notrun, ev, check=check, **kw)
    else:
        rec.item(iid, 'PASS', ok_reason % scanned if '%d' in ok_reason else ok_reason, ev, check=check, **kw)


def tier_counts(ms):
    c = {}
    for m in ms:
        k = m['tier'] or ('statement:none' if m['tier_raw'] else 'none')
        c[k] = c.get(k, 0) + 1
    return dict(sorted(c.items()))


# ------------------------------------------------------------------------------------------------------------- node children
def run_layer_dump(env, rec, app, out):
    script = os.path.join(HERE, 'q02_layer.mjs')
    args = ['--out', out] + (['--app', app] if app else [])
    code, so, se = pq.run_node(env, script, args)
    if code != 0:
        raise pq.InputMissing('node q02_layer.mjs failed (exit %d): %s' % (code, (se or so).strip().splitlines()[-1][:200] if (se or so).strip() else ''))
    rec.tool_versions['node'] = pq.node_version()
    rec.add_input(script, 'node child')
    return json.load(open(out, encoding='utf-8'))


def run_tier_names(env, rec, app, statements, out):
    script = os.path.join(HERE, 'q23_app.mjs')
    tin = out + '.in.json'
    json.dump(statements, open(tin, 'w', encoding='utf-8'))
    args = ['--out', out, '--tiers', tin, '--no-layer'] + (['--app', app] if app else [])
    code, so, se = pq.run_node(env, script, args)
    if code != 0:
        raise pq.InputMissing('node q23_app.mjs failed (exit %d): %s' % (code, (se or so).strip().splitlines()[-1][:200] if (se or so).strip() else ''))
    rec.add_input(script, 'node child')
    d = json.load(open(out, encoding='utf-8'))
    if d.get('tier_names') is None:
        raise pq.InputMissing('the app code that reads tier statements (src/ui/extensions.mjs tierName) did not run: %s' % '; '.join(d.get('errors') or []))
    return d['tier_names']


# ------------------------------------------------------------------------------------------------------------- the extract re-match (Q02.3)
def rematch(m, ts):
    """For every extract of a documented member: [(status, detail)] with status found | not_found | no_text | bad_quote | page_mismatch."""
    e = m['extra']
    res = []
    cits = e.get('citations')
    quotes = []
    if cits:
        for c in cits:
            if c.get('quote'):
                quotes.append((c['quote'], c.get('report_id'), c.get('printed_page'), c.get('source_id'), None, None))
    elif m['quote']:
        sid = m['sources'][0] if m['sources'] else None
        quotes.append((m['quote'], e.get('report_id') or (sid if sid and sid.startswith('OR27-') else None), e.get('printed_page'), sid, e.get('volume'), e.get('section')))
    for q, rid, page, sid, vol, sec in quotes:
        if rid and str(rid).startswith('OR27-'):
            r = ts.find_or27(q, rid, page)
            if r['status'] == 'found' and r.get('page_ok') is False:
                res.append(('page_mismatch', 'the extract is in %s but not on printed page %s' % (rid, page)))
            else:
                res.append((r['status'], r.get('reason') or ('%s %s' % (rid, r.get('records', '')))))
        elif vol:
            r = ts.find_statevol(q, vol, sec)
            res.append((r['status'], r.get('reason') or '%s %s' % (vol, sec)))
        elif sid and ts.has_text(sid):
            r = ts.find(sid, q)
            res.append((r['status'], sid))
        else:
            res.append(('no_text', 'no stored text for source %s on this machine' % (sid or rid or 'none')))
    return res


def numbers_ok(m):
    ct = m['extra'].get('claim_text')
    if not ct or not m['quote']:
        return []
    ok, missing = ex.numbers_in_span(ct, m['quote'])
    return [] if ok else ['number(s) %s of the claim are not in the extract' % ', '.join(missing[:4])]


# ------------------------------------------------------------------------------------------------------------- Q02.1 census, Q02.6 manifests, Q02.7 conflicts
def census(env, rec, registry):
    ll = loadlist.scan(env)
    if ll is None:
        rec.blocked('Q02/Q02.1/census', 'docs/battle-theatre/app/src/config.mjs', 'the URLS of the shell: the page\'s load list cannot be read')
        return
    covered = {}
    for c in registry.get('classes', []):
        for f in c.get('files', []):
            covered.setdefault(f, []).append(c['id'])
        s = c.get('source', {})
        for f in ([s['file']] if s.get('file') else []) + list(s.get('files') or []):
            covered.setdefault(f, []).append(c['id'])
    loaded = [f for f in ll['files'] if not f.endswith('/') and f.lower().endswith(LOAD_EXT)]
    missing = sorted(f for f in loaded if f not in covered)
    absent = sorted(f for f in covered if not os.path.isfile(os.path.join(env.root, *f.split('/'))))
    ev = {'loaded_files': len(loaded), 'classes': len(registry.get('classes', [])), 'not_in_registry': missing, 'registry_files_not_on_disk': absent[:20], 'unresolved_literals': ll['unresolved'], 'config': ll['config']}
    if missing:
        rec.item('Q02/Q02.1/census', 'FAIL', '%d data file(s) that the page loads are in no datum class of the registry' % len(missing), ev, check='Q02.1')
    elif ll['unresolved']:
        rec.item('Q02/Q02.1/census', 'FAIL', '%d file(s) named by the loaders do not exist' % len(ll['unresolved']), ev, check='Q02.1')
    elif not loaded:
        rec.item('Q02/Q02.1/census', 'BLOCKED-INPUT', 'input missing: the scan found no data file that the page loads', ev, check='Q02.1')
    else:
        rec.item('Q02/Q02.1/census', 'PASS', 'every one of the %d data files that the page loads is in a datum class' % len(loaded), ev, check='Q02.1')
    rec.item('Q02/Q02.1/registry-on-disk', 'PASS' if not absent else 'FAIL', 'every file the registry names is on disk' if not absent else '%d file(s) named by the registry are not on disk' % len(absent), {'missing': absent[:20]}, check='Q02.1')


def manifest_items(rec, man, layer_manifest_present):
    """Q02.6: each Source Manifest entry has date_written, rights and reliability_tier. One item per manifest origin."""
    origins = {}
    for sid, orgs in man.by.items():
        o = man.origin[sid]
        origins.setdefault(o, []).append(sid)
    for o in sorted(origins):
        if o in ('register', 'library'):
            continue        # the register's ids and the library's status ids are not sources of data; they are judged by Q18 and Q25
        bad = []
        for sid in sorted(origins[o]):
            f = man.fields[sid]
            miss = [k for k in ('date_written', 'rights', 'reliability_tier') if pq.is_placeholder(f.get(k))]
            if miss:
                bad.append((sid, 'lacks ' + ', '.join(miss)))
        ev = {'manifest': o, 'entries': len(origins[o]), 'incomplete': len(bad), 'reasons': top_reasons(bad), 'first': pq.first_n([i for i, _ in bad])}
        if len(bad) > 20:
            ev['sidecar'] = rec.sidecar('Q026-manifest-%s' % o, [{'id': i, 'reason': r} for i, r in bad])
        rec.item('Q02/Q02.6/manifest-%s' % o, 'FAIL' if bad else 'PASS', ('%d of %d source entries lack date_written, rights or reliability_tier' % (len(bad), len(origins[o]))) if bad else 'every entry has date_written, rights and reliability_tier', ev, check='Q02.6')
    if not origins:
        rec.item('Q02/Q02.6/manifest', 'BLOCKED-INPUT', 'input missing: no Source Manifest was found (layer sources, kit sources, Official Records index)', {}, check='Q02.6')


def conflicts_item(env, rec):
    """Q02.7: every conflict lists all its values with source keys (PDF B.2.5); the structured file and the register agree on the 47."""
    p = os.path.join(env.gov, 'conflicts_structured.json')
    try:
        doc = rec.read_json(p, 'conflicts')
    except pq.InputMissing as e:
        rec.blocked('Q02/Q02.7/conflicts', str(e), 'the structured conflict register')
        return
    rows = doc.get('conflicts') or []
    bad = []
    for c in rows:
        vals = c.get('values') or []
        if len(vals) < 2:
            bad.append((c.get('id'), 'lists fewer than two values'))
        for v in vals:
            lab = str(v.get('label') or '')
            if not (re.search(r'\(([A-Za-z0-9][^()]*)\)\s*$', lab) or v.get('sources') or v.get('source')):
                bad.append((c.get('id'), 'a value names no source key (%s)' % lab[:40]))
        if c.get('pdf_recommended_default') in (None, '') and c.get('selectable_alternatives') in (None, []):
            bad.append((c.get('id'), 'no recommended default and no selectable alternatives recorded'))
    ev = {'conflicts': len(rows), 'with_a_problem': len({i for i, _ in bad}), 'reasons': top_reasons(bad), 'first': pq.first_n([i for i, _ in bad])}
    if not rows:
        rec.item('Q02/Q02.7/conflicts', 'BLOCKED-INPUT', 'input missing: the structured conflict register has no conflict', ev, check='Q02.7')
    else:
        rec.item('Q02/Q02.7/conflicts', 'FAIL' if bad else 'PASS', ('%d conflict(s) have a value with no source key, fewer than two values or no recorded alternatives' % len({i for i, _ in bad})) if bad else 'every conflict lists all its values with source keys', ev, check='Q02.7')


# ------------------------------------------------------------------------------------------------------------- main
def main(argv=None):
    ap = pq.base_parser(__doc__.split('\n')[0])
    ap.add_argument('--registry', default=os.path.join(HERE, 'datum_classes.json'))
    ap.add_argument('--layer-dump', default=None, help='a layer dump written by q02_layer.mjs (default: run the node child)')
    ap.add_argument('--tier-names', default=None, help='a JSON map tier statement -> canonical tier or null (default: ask the app with q23_app.mjs)')
    ap.add_argument('--app', default=None, help='the app folder for the node children (tests)')
    ap.add_argument('--classes', default=None, help='comma list of classes (a subset run is INCOMPLETE, U-26)')
    args = ap.parse_args(argv)
    env = pq.Env(args.root, args.out)
    rec = pq.Record(GATE, env, argv=['python3', 'tools/bt/gates/q02_provenance.py'] + (argv if argv is not None else sys.argv[1:]))
    rec.threshold('T-Q02-1', pq.MAX_QUOTE_WORDS, 'PLAN (p. 134, E.6; working limit 14 words)', 'words in a source extract')
    rec.owe('Q02.3 "the claim equals what the span supports" is not machine-checkable: it needs the fresh-context verification run of U-11 (Q27.5)')
    try:
        registry = rec.read_json(args.registry, 'datum-class registry')
    except pq.InputMissing as e:
        rec.blocked('Q02/Q02.1/census', str(e), 'the datum-class registry')
        return pq.finish_cli(rec, args)
    wanted = set(args.classes.split(',')) if args.classes else None
    if wanted:
        registry = dict(registry, classes=[c for c in registry['classes'] if c['id'] in wanted])
        rec.incomplete('a subset of the classes was run (%s): the scan is not exhaustive (U-26)' % args.classes)
    tmp = tempfile.mkdtemp(prefix='q02-')
    # ---- the layer
    layer = None
    if any(c['source']['kind'] == 'layer' for c in registry['classes']):
        try:
            if args.layer_dump:
                rec.add_input(args.layer_dump, 'layer dump')
                layer = json.load(open(args.layer_dump, encoding='utf-8'))
            else:
                layer = run_layer_dump(env, rec, args.app, os.path.join(tmp, 'layer.json'))
        except (pq.InputMissing, OSError, ValueError) as e:
            rec.note('the history layer could not be built: %s' % e)
    sc = ds.Scanner(env, rec, registry, layer, {})
    try:
        stm = sc.statements()
        names = {}
        if stm:
            if args.tier_names:
                rec.add_input(args.tier_names, 'tier readings')
                names = json.load(open(args.tier_names, encoding='utf-8'))
            else:
                names = run_tier_names(env, rec, args.app, stm, os.path.join(tmp, 'names.json'))
        sc.apply_tiernames(names)
    except pq.InputMissing as e:
        rec.note('tier statements could not be read by the app code (%s): every statement counts as stating no tier' % e)
        rec.incomplete('the app\'s own reading of tier statements (tierName) did not run')
    man = ds.Manifests(env, rec, (layer or {}).get('manifest'))
    ctx = Ctx()
    ctx.manifests = man
    reg_open = set()
    try:
        for e in rec.read_json(os.path.join(env.gov, 'register_index.json'), 'register index'):
            if e.get('status') in ('open', 'awaiting owner') and os.path.isfile(os.path.join(env.gov, 'register', e['id'] + '.md')):
                reg_open.add(e['id'])
    except pq.InputMissing:
        rec.note('register index missing: no register id resolves')
    ctx.register_open = reg_open
    ts = ex.TextStore(env)
    # claim ledger index (Q02.4 premises)
    ctx.claim_tier = {}
    for cid in sc.classes:
        if sc.classes[cid].get('claims'):
            for m in sc.members(cid) or []:
                k = m['extra'].get('claim_id') or (m['claim_ids'][0] if m['claim_ids'] and cid == 'layer.provenance.claims' else None)
                if k and m['tier']:
                    ctx.claim_tier.setdefault(str(k), m['tier'])
    # ---- Q02.1 and the manifests and the conflicts
    census(env, rec, registry)
    manifest_items(rec, man, layer is not None)
    conflicts_item(env, rec)
    # ---- per class
    for cid in sorted(sc.classes):
        c = sc.classes[cid]
        ms = sc.members(cid)
        if ms is None:
            for chk in ('Q02.2',):
                rec.item('Q02/%s/%s' % (chk, cid), 'BLOCKED-INPUT', 'input missing: %s (%s)' % (sc.error(cid), c['label']), {'class': cid}, check=chk)
            continue
        if c.get('conflicts'):
            rec.item('Q02/Q02.2/%s' % cid, 'N/A', 'a conflict register: judged by Q02.7 (every conflict lists all values with source keys)', {'class': cid, 'rows': len(ms)}, check='Q02.2')
            continue
        if c.get('exempt'):
            void = [m['id'] for m in ms if m['tier_raw'] is not None or m['sources']]
            if void:
                rec.item('Q02/Q02.2/%s' % cid, 'FAIL', 'declared exempt (%s) but %d record(s) carry a tier or a source: the exemption is void' % (c['exempt'][:80], len(void)), {'class': cid, 'first': void[:10]}, check='Q02.2')
            else:
                rec.item('Q02/Q02.2/%s' % cid, 'N/A', 'exempt: %s; no record of the file carries a tier or a source' % c['exempt'], {'class': cid, 'members': len(ms)}, check='Q02.2')
            continue
        if not ms:
            rec.item('Q02/Q02.2/%s' % cid, 'FAIL', 'a class the page loads in which no record carries a tier (no member found: %s)' % c['label'], {'class': cid, 'files': c.get('files')}, check='Q02.2')
            continue
        # Q02.2
        scan_item(rec, 'Q02.2', cid, ms, lambda m: ds.check_tier_source(m, ctx), ok_reason='all %d members have a tier and a source, reasoning or procedural block',
                  fail_reason='', extra={'tier_statements_not_exact': sum(1 for m in ms if m['tier_raw'] and not m['tier_exact'])})
        if c.get('register_entries'):
            continue
        # Q02.3
        doc_ms = [m for m in ms if m['tier'] == 'documented']
        unverifiable, matched = [], 0

        def q3(m):
            nonlocal matched
            reasons = list(ds.check_documented(m, ctx)) + numbers_ok(m)
            if m['quote'] or m['extra'].get('citations'):
                for status, detail in rematch(m, ts):
                    if status == 'found':
                        matched += 1
                    elif status in ('not_found', 'page_mismatch'):
                        reasons.append('the extract is not found in the stored text at the cited place (%s)' % detail if status == 'not_found' else detail)
                    elif status == 'bad_quote':
                        pass
                    elif status == 'no_text':
                        unverifiable.append(m['id'])
            return reasons

        scan_item(rec, 'Q02.3', cid, doc_ms, q3, ok_reason='all %d documented members have a non-lead source and a short extract that was found again in the stored text', fail_reason='',
                  na_reason='no member of the class is documented', notrun=lambda: ('%d documented member(s) have an extract whose source text is not on this machine' % len(set(unverifiable))) if unverifiable else None,
                  extra=lambda: {'extracts_found_again': matched, 'extracts_without_stored_text': len(set(unverifiable)), 'span_basis': 'the extract itself (a claim number must stand in it)'})
        # Q02.4, Q02.5
        scan_item(rec, 'Q02.4', cid, [m for m in ms if m['tier'] == 'inferred'], lambda m: ds.check_inferred(m, ctx), ok_reason='all %d inferred members have reasoning and documented premises', fail_reason='', na_reason='no member of the class is inferred')
        scan_item(rec, 'Q02.5', cid, [m for m in ms if m['tier'] == 'plausible-procedural'], lambda m: ds.check_procedural(m, ctx), ok_reason='all %d plausible-procedural members have the procedural block and an open register id', fail_reason='',
                  na_reason='no member of the class is plausible-procedural')
        # Q02.6 (the source ids of the class resolve), Q02.8
        used = {}
        for m in ms:
            for s in m['sources']:
                used.setdefault(s, []).append(m['id'])
        unresolved = sorted(s for s in used if not man.resolves(s))
        if used:
            ev = {'class': cid, 'source_ids_used': len(used), 'unresolved': len(unresolved), 'first': unresolved[:20]}
            if len(unresolved) > 20:
                ev['sidecar'] = rec.sidecar('Q026-unresolved-%s' % cid.replace('.', '_'), [{'source': s, 'first_member': used[s][0], 'members': len(used[s])} for s in unresolved])
            rec.item('Q02/Q02.6/%s' % cid, 'FAIL' if unresolved else 'PASS', ('%d of %d source ids used by the class are in no Source Manifest' % (len(unresolved), len(used))) if unresolved else 'every source id used by the class resolves in a Source Manifest', ev, check='Q02.6')
        scan_item(rec, 'Q02.8', cid, [m for m in ms if m['sources']], lambda m: ds.check_quarantine(m, ctx), ok_reason='no member rests on lead or weak sources alone', fail_reason='', na_reason='no member of the class names a source id')
        # Q02.9
        if c.get('validity'):
            scan_item(rec, 'Q02.9', cid, ms, lambda m: ds.check_validity(m, ctx, c), ok_reason='every member has its validity dates or state_schedule', fail_reason='')
    rec.note('Q02.3 span basis: the extract itself; the number rule of the citation checker (p. 126, D.4.3 stage 11) is applied to a claim text where the data has one')
    if layer:
        rec.extra['layer'] = layer.get('layer')
        rec.extra['contract_validators_of_the_app'] = layer.get('contract')
    rec.extra['text_store'] = ts.status()
    return pq.finish_cli(rec, args)


if __name__ == '__main__':
    pq.guarded_main(main)
