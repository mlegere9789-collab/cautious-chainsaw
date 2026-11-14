"""tl-02 close-out builder.
    python3 -I tmp/tl-02/build2.py --check [T1-0xx ...]   resolve every citation of the named rows (all rows if none), print problems
    python3 -I tmp/tl-02/build2.py --write                 run every search, write all outputs (needs zero problems)
"""
import os, sys, json, collections, re, importlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tl2lib as T

MODS = ['rows_a', 'rows_b', 'rows_c']


def load_rows():
    for m in MODS:
        if os.path.exists(os.path.join(HERE, m + '.py')):
            importlib.import_module(m)


def check(only=None):
    errs = []
    nq = 0
    out = {}
    for rid, r in T.ROWS.items():
        if only and rid not in only:
            continue
        cites = collections.OrderedDict()
        for key, c in r['cites'].items():
            try:
                cites[key] = T.resolve(key, c)
                nq += 1
            except T.QuoteError as e:
                errs.append('%s %s' % (rid, e))
        used = set()
        for s in r['subs']:
            claim, tier, support, keys, note = s
            for k in keys:
                used.add(k)
                if k not in r['cites']:
                    errs.append('%s sub cites unknown key %s' % (rid, k))
            if tier == 'documented' and not keys:
                errs.append('%s documented sub-claim without citation: %s' % (rid, claim[:70]))
            if tier == 'documented' and keys and all(r['cites'].get(k, {}).get('src') == 'COMPUTED' for k in keys):
                errs.append('%s documented sub-claim resting on a computation only: %s' % (rid, claim[:70]))
        for sc in r['scenarios']:
            for k in sc['cites']:
                used.add(k)
                if k not in r['cites']:
                    errs.append('%s scenario cites unknown key %s' % (rid, k))
        for k in r['cites']:
            if k not in used:
                errs.append('%s citation %s is not used by any sub-claim or scenario' % (rid, k))
        if r['verdict'] == 'confirmed' and (r['remains'] or any(s[2] not in ('supported', 'computed', 'procedural') for s in r['subs'])):
            errs.append('%s confirmed but has unsupported parts' % rid)
        if r['verdict'] in ('partially_supported', 'unsupported', 'gap') and not r['register']:
            errs.append('%s needs a proposed register entry' % rid)
        out[rid] = cites
    return out, errs, nq


if __name__ == '__main__':
    load_rows()
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    if mode == '--check':
        only = set(a for a in sys.argv[2:] if not a.startswith('-')) or None
        cites, errs, nq = check(only)
        for rid, cs in cites.items():
            for k, c in cs.items():
                if c['source_id'] not in ('OR27', 'COMPUTED') and '-v' in sys.argv:
                    print(rid, k, c['source_id'], 'p.', c['printed_page'], '|', c.get('page_basis'))
        print('rows %d, citations resolved %d, problems %d' % (len(T.ROWS), nq, len(errs)))
        for e in errs:
            print('  !!', e)
        sys.exit(1 if errs else 0)


# =============================================================================================== write mode
def _mapverdict(r):
    v = r['verdict']
    if v == 'confirmed':
        return 'procedural' if r['id'] == 'T1-105' else 'supported'
    if v == 'corrected':
        return 'conflict' if any(s[2] == 'conflict' for s in r['subs']) else 'corrected'
    if v == 'partially_supported':
        return 'partial'
    if v == 'gap':
        return 'gap_open'
    return v


def _status(r):
    """status in the shard vocabulary (verified | inferred | gap): 'verified' only when the first documented sub-claim of the row (the
    central claim) is carried by an Official Records citation, so that merge_horde's OR recheck cannot label a row that rests on other
    primary or published sources as verified against the OR text."""
    t = r['claim']['tier']
    v = r['verdict']
    if v in ('gap', 'unsupported') or t == 'open gap':
        return 'gap'
    if v == 'partially_supported':
        return 'inferred'
    if t == 'documented':
        for s in r['subs']:
            if s[1] == 'documented' and s[2] in ('supported', 'conflict'):
                return 'verified' if any(r['cites'][k]['src'] == 'OR27' for k in s[3]) else 'inferred'
        return 'inferred'
    return 'inferred'


def banned_check(obj, where, errs):
    BAN = re.compile(r'\b(AI|Claude|Anthropic|agents?|subagents?|LLM|chatbot|language model)\b')
    s = json.dumps(obj, ensure_ascii=False)
    m = BAN.search(s)
    if m:
        errs.append('banned word %r in %s' % (m.group(0), where))


def write_all():
    import datetime
    load_rows()
    cites, errs, nq = check(None)
    if errs:
        print('refusing to write: %d problems' % len(errs))
        for e in errs:
            print('  !!', e)
        sys.exit(1)
    GOV = T.G
    SH = os.path.join(GOV, 'horde', 'tl-02')
    seed = {}
    for l in open(os.path.join(GOV, 'timeline_seed.jsonl'), encoding='utf-8'):
        r = json.loads(l)
        seed[r['id']] = r
    ver = {}
    for l in open(os.path.join(GOV, 'timeline_verified.jsonl'), encoding='utf-8'):
        r = json.loads(l)
        ver[r['id']] = r
    res_path = os.path.join(SH, 'results.jsonl')
    bak = os.path.join(SH, 'results.pre-closeout.jsonl')
    if not os.path.exists(bak):
        import shutil
        shutil.copyfile(res_path, bak)
    old = {}
    for l in open(bak, encoding='utf-8'):
        if l.strip():
            r = json.loads(l)
            old[r['id']] = r
    # ---- run every search once
    specs = []
    for r in T.ROWS.values():
        for s in r['searched']:
            specs.append(s)
    print('running %d searches ...' % len(specs), flush=True)
    if os.environ.get('TL2_NOSEARCH'):
        sres = {id(s): dict(hits=None, by_source=collections.OrderedDict(), sample=[]) for s in specs}
        print('DRY RUN: searches not run (hit counts recorded as null)')
    else:
        sres = T.run_searches(specs)
    slog = []
    # ---- build lines
    out = []
    bad = []
    for rid, r in T.ROWS.items():
        cc = r['claim']
        sd, v0, o0 = seed[rid], ver[rid], old[rid]
        subs = []
        for n, (claim, tier, support, keys, note) in enumerate(r['subs'], 1):
            d = collections.OrderedDict(n=n, claim=claim, tier=tier, support=support, citations=keys)
            if note:
                d['note'] = note
            subs.append(d)
        searched = []
        for s in r['searched']:
            x = sres[id(s)]
            scope = s['scope'] if isinstance(s['scope'], str) else ', '.join(s['scope'])
            ent = collections.OrderedDict(scope=scope, pattern=s['pattern'], near=s['near'], window_chars=s['win'] if s['near'] else None, what=s['what'], hits=x['hits'], status=('run' if x['hits'] is not None else 'not run in this build'),
                                          hits_by_source=dict(list(x['by_source'].items())[:8]), sample=[dict(source=a, offset=b, context=re.sub(r'\s+', ' ', c)[:160]) for a, b, c in x['sample'][:2]])
            searched.append(ent)
            slog.append(dict(row=rid, **ent))
        regid = ('tl-02-CO-' + rid) if (r['register'] or r['verdict'] in ('partially_supported', 'unsupported', 'gap')) else None
        line = collections.OrderedDict()
        line['id'] = rid
        line['shard'] = 'tl-02'
        line['seed'] = {'page': sd['page'], 'tier': sd['tier'], 'time_window_raw': sd['time_window_raw']}
        line['before'] = {'status_effective': v0.get('status_effective'), 'shard_verdict': o0.get('verdict'), 'shard_tier': o0.get('tier'), 'shard_status': o0.get('status'),
                          'or_recheck': v0.get('or_recheck'), 'or_claim_check_verdict': (v0.get('or_claim_check') or {}).get('verdict') if v0.get('or_claim_check') else None}
        line['verdict'] = r['verdict']
        tw = collections.OrderedDict(text=cc['when'], start=cc.get('start'), end=cc.get('end'), basis=cc['basis'])
        line['corrected_claim'] = collections.OrderedDict(event=cc['event'], unit=cc['unit'], place=cc['place'], time_window=tw, text=cc['text'], tier=cc['tier'],
                                                          marking=cc.get('marking') or 'tier glyph on every sub-claim that is not documented')
        eff = v0.get('tier') or o0.get('tier')
        line['tier_change'] = collections.OrderedDict(seed=sd['tier'], shard_effective=o0.get('tier'), corrected=cc['tier'],
                                                      note=('promotion proposed relative to the seed (owner or integrator decision; see delegated-decision block DD-TL02-01)' if
                                                            T_RANK[cc['tier']] < T_RANK[sd['tier']] else ('demotion relative to the seed' if T_RANK[cc['tier']] > T_RANK[sd['tier']] else 'tier unchanged against the seed'))
                                                      + ('; higher than the tier the shard audit had set (' + str(o0.get('tier')) + '): evidence added in this close-out' if o0.get('tier') in T_RANK and T_RANK[cc['tier']] < T_RANK[o0.get('tier')] else ''))
        line['sub_claims'] = subs
        line['citations'] = list(cites[rid].values())
        line['scenarios'] = [collections.OrderedDict(id=sc['id'], value=sc['value'], basis=sc['basis'], tier=sc['tier'], citations=sc['cites']) for sc in r['scenarios']]
        line['default'] = r['default']
        line['remains_unsupported'] = r['remains']
        line['searched'] = searched
        line['recheck_applied'] = r['recheck'] or 'none needed'
        line['register_proposed'] = regid
        line['register_related'] = r['related']
        banned_check(line, rid, bad)
        out.append((r, line, regid))
    if bad:
        print('BANNED WORDS:', bad)
        sys.exit(1)
    os.makedirs(os.path.join(GOV, 'timeline_corrections'), exist_ok=True)
    with open(os.path.join(GOV, 'timeline_corrections', 'tl-02.jsonl'), 'w', encoding='utf-8', newline='\n') as f:
        for r, line, regid in out:
            f.write(json.dumps(line, ensure_ascii=False) + '\n')
    with open(os.path.join(SH, 'search_log.jsonl'), 'w', encoding='utf-8', newline='\n') as f:
        for e in slog:
            f.write(json.dumps(e, ensure_ascii=False) + '\n')
    # ---- results.jsonl (shard rows with the findings applied)
    new_rows = []
    for r, line, regid in out:
        rid = r['id']
        o = collections.OrderedDict(old[rid])
        cs = line['citations']
        or_c = [c for c in cs if c['source_id'] == 'OR27']
        lib_c = [c for c in cs if c['source_id'] not in ('OR27', 'COMPUTED')]
        cmp_c = [c for c in cs if c['source_id'] == 'COMPUTED']
        tier_new = r['claim']['tier']
        o['verdict'] = _mapverdict(r)
        o['tier'] = tier_new
        o['status'] = _status(r)
        o['source_citation'] = ['OR Ser.I vol.27 pt.%d, %s %s, p.%s' % (c['part'], c['report_id'], c['author'], c['printed_page']) for c in or_c] + \
                               ['%s p.%s' % (c['work'], c['printed_page'] if c['printed_page'] is not None else 'n/s') for c in lib_c] + ['computed: %s' % c['what'] for c in cmp_c]
        o['supporting_passages'] = [collections.OrderedDict(report='%s %s' % (c['report_id'], c['author']), printed_page=c['printed_page'], quote=c['quote'], text_offset=c['text_offset'], verified_by_or27_find=True) for c in or_c]
        o['library_passages'] = [collections.OrderedDict(source_id=c['source_id'], work=c['work'], printed_page=c['printed_page'], verbatim=c['quote'], text_offset=c['text_offset'], sha256=c['sha256']) for c in lib_c]
        o['computed_values'] = [collections.OrderedDict(what=c['what'], value=c['value'], method=c['method']) for c in cmp_c]
        sup = [s['claim'] for s in line['sub_claims'] if s['support'] in ('supported', 'computed')]
        uns = [s['claim'] for s in line['sub_claims'] if s['support'] in ('unsupported', 'contradicted')]
        cfl = [s['claim'] for s in line['sub_claims'] if s['support'] == 'conflict']
        o['subclaims'] = collections.OrderedDict(supported=sup, not_supported=uns, conflict=cfl)
        o['conflict_scenarios'] = line['scenarios'] or None
        o['default_picked'] = r['default'] or 'none'
        o['register_ref'] = [x for x in ([regid] + [x for x in r['related'] if x.startswith(('tl-02-EG', 'EG-TL', 'C-'))]) if x] or None
        o['seed_window'] = o.get('seed_window') or seed[rid]['time_window_raw']
        o['notes'] = 'Close-out (2026-11-13): %s. %s' % (r['verdict'], (r['recheck'] or '')[:700])
        o['closeout'] = collections.OrderedDict(verdict=r['verdict'], corrections_file='GOVERNANCE/timeline_corrections/tl-02.jsonl', claim=cc_text(r), remains_unsupported=r['remains'])
        o['citation'] = '; '.join(o['source_citation'])
        pr = ' | '.join('%s p.%s: "%s"' % (c['report_id'], c['printed_page'], c['quote']) for c in or_c)
        if not pr:
            pr = ('library texts and computed values, see timeline_corrections/tl-02.jsonl (%d citations)' % len(cs)) if cs else 'procedural fallback; no fact asserted'
        o['passage_ref'] = pr
        o['audit_downgrade'] = o.get('audit_downgrade')
        new_rows.append(o)
        banned_check(o, rid + ' results', bad)
    if bad:
        print('BANNED WORDS:', bad)
        sys.exit(1)
    with open(res_path, 'w', encoding='utf-8', newline='\n') as f:
        for o in new_rows:
            f.write(json.dumps(o, ensure_ascii=False) + '\n')
    # ---- proposed register entries
    regdir = os.path.join(SH, 'proposed-register')
    import glob
    for p in glob.glob(os.path.join(regdir, 'tl-02-CO-*.md')):
        os.remove(p)
    nreg = 0
    for r, line, regid in out:
        if not regid:
            continue
        g = r['register'] or REG_DEFAULT(r)
        text = register_md(r, line, regid, g)
        banned_check(text, regid, bad)
        with open(os.path.join(regdir, regid + '.md'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        nreg += 1
    if bad:
        print('BANNED WORDS:', bad)
        sys.exit(1)
    write_counts(out, new_rows, nreg)
    print('wrote %d corrections lines, %d results rows, %d register entries, %d search records' % (len(out), len(new_rows), nreg, len(slog)))


T_RANK = {'documented': 0, 'inferred': 1, 'plausible-procedural': 2, 'open gap': 3}


def cc_text(r):
    return r['claim']['text']


def REG_DEFAULT(r):
    return T.REG(title='%s: %s' % (r['id'], (r['remains'] or ['unsupported part'])[0][:110]), why='; '.join(r['remains']) or 'part of the row stays unsupported', recon='Show the supported part; mark the rest as an open gap.',
                 tier=r['claim']['tier'] if r['claim']['tier'] != 'documented' else 'inferred', impact=r['id'], ask='none (work continues)')


def register_md(r, line, regid, g):
    cc = r['claim']
    comp = g['competing'] if g['competing'] != '-' else ('; '.join('%s: %s' % (s['id'], s['value']) for s in r['scenarios']) or '-')
    esc = lambda x: x.replace('|', '\\|')
    searched = '; '.join('%s: regex `%s`%s (%s)%s' % (s['scope'], esc(s['pattern']), (' near `%s`' % esc(s['near'])) if s['near'] else '', ('%d hits' % s['hits']) if s['hits'] is not None else 'hit count pending: search not yet run', (' [%s]' % s['what']) if s['what'] else '') for s in line['searched']) or 'see timeline_corrections/tl-02.jsonl'
    unsup = [s['claim'] for s in line['sub_claims'] if s['support'] in ('unsupported', 'contradicted')] + r['remains']
    desc = 'Row %s (%s). Verdict %s. Corrected claim: %s ' % (r['id'], seed_window(r['id']), r['verdict'], cc['text'])
    if unsup:
        desc += 'Still unsupported or open: ' + ' / '.join(dict.fromkeys(x.rstrip('. ') for x in unsup)) + '.'
    rows = [('ID', regid), ('Requirement IDs', g['rids']), ('Category', g['category']), ('Description', desc),
            ('Why literal 100% is not possible or blocked', g['why'] + (' No non-lead source read supports the open part exactly (Law cl.4); not a physics limit.' if unsup else ' The values differ between sources and each is documented; no default is picked (Law cl.6); not a physics limit.')),
            ('Evidence searched', searched + '. Local texts only: Official Records vol. 27 parts 1-3, the 99-text library and the texts acquired for this close-out (horde/tl-02/sources_tl02.json). Every search is re-runnable and logged in horde/tl-02/search_log.jsonl.'),
            ('Autonomous substitute applied', g['subst'] if g['subst'] != '-' else 'None beyond the marked reconstruction below.'),
            ('Strongest evidence-based reconstruction', g['recon']), ('Confidence tier', g['tier']), ('Competing values', comp),
            ('Product marking', 'Tier glyph on the open part; scenario selector where values compete.' if r['scenarios'] else 'Tier glyph on the open part.'),
            ('Visual and audio impact', g['impact']), ('Review status', 'internal review only (DEC-006: no public review label)'), ('Owner decision requested', g['ask']),
            ('Agent recommendation', g['recommend'] or 'Carry all values as selectable scenarios where sources conflict; pick no default beyond a recorded delegated decision (Law cl.6).'),
            ('Status', 'open'), ('Owner decision and date', '(filled only from the Decision Log)')]
    t = '# %s: %s\n\n| Field | Content |\n|---|---|\n' % (regid, g['title'])
    for k, v in rows:
        t += '| %s | %s |\n' % (k, str(v).replace('\\|', '\x00').replace('|', '/').replace('\x00', '\\|').replace('\n', ' '))
    return t


_seed = None


def seed_window(rid):
    global _seed
    if _seed is None:
        _seed = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(T.G, 'timeline_seed.jsonl'), encoding='utf-8')}
    return _seed[rid]['time_window_raw'].strip()


def write_counts(out, new_rows, nreg):
    cnt = collections.OrderedDict()
    cnt['rows'] = len(out)
    cnt['verdict'] = dict(collections.Counter(l['verdict'] for _, l, _ in out))
    cnt['verdict_of_rows_not_verified_before'] = dict(collections.Counter(l['verdict'] for _, l, _ in out if l['before']['status_effective'] != 'verified_against_or_text'))
    cnt['verdict_of_rows_verified_before'] = dict(collections.Counter(l['verdict'] for _, l, _ in out if l['before']['status_effective'] == 'verified_against_or_text'))
    cnt['rows_not_verified_before'] = sum(1 for _, l, _ in out if l['before']['status_effective'] != 'verified_against_or_text')
    cnt['sub_claims'] = sum(len(l['sub_claims']) for _, l, _ in out)
    cnt['sub_claims_by_tier'] = dict(collections.Counter(s['tier'] for _, l, _ in out for s in l['sub_claims']))
    cnt['sub_claims_by_support'] = dict(collections.Counter(s['support'] for _, l, _ in out for s in l['sub_claims']))
    cnt['citations'] = sum(len(l['citations']) for _, l, _ in out)
    cnt['citations_by_source'] = dict(collections.Counter(c['source_id'] for _, l, _ in out for c in l['citations']))
    cnt['rows_with_scenarios'] = [l['id'] for _, l, _ in out if l['scenarios']]
    cnt['rows_with_default'] = [l['id'] for _, l, _ in out if l['default']]
    cnt['proposed_register_entries'] = nreg
    cnt['results_tier'] = dict(collections.Counter(r['tier'] for r in new_rows))
    cnt['results_status'] = dict(collections.Counter(r['status'] for r in new_rows))
    cnt['rows_by_verdict'] = {v: [l['id'] for _, l, _ in out if l['verdict'] == v] for v in T.VERDICTS}
    cnt['tier_vs_seed'] = {'promotion': [l['id'] for _, l, _ in out if T_RANK[l['corrected_claim']['tier']] < T_RANK[l['seed']['tier']]],
                           'demotion': [l['id'] for _, l, _ in out if T_RANK[l['corrected_claim']['tier']] > T_RANK[l['seed']['tier']]],
                           'unchanged': [l['id'] for _, l, _ in out if T_RANK[l['corrected_claim']['tier']] == T_RANK[l['seed']['tier']]]}
    cnt['searches_run'] = sum(len(l['searched']) for _, l, _ in out)
    cnt['searches_with_zero_hits'] = sum(1 for _, l, _ in out for s in l['searched'] if s['hits'] == 0)
    cnt['searches_not_run'] = sum(1 for _, l, _ in out for s in l['searched'] if s['hits'] is None)
    json.dump(cnt, open(os.path.join(HERE, 'counts.json'), 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
    json.dump(cnt, open(os.path.join(T.G, 'horde', 'tl-02', 'counts.json'), 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)


if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == '--write':
    write_all()
