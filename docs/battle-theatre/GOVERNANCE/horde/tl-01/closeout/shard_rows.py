"""Applies the close-out of shard tl-01 to the shard's own result rows (horde/tl-01/results.jsonl).

For every row: the pre-close-out values are kept under *_before, `verdict`, `tier`, `status`, `citations`, `citation`, `passage_ref`, `notes` carry the close-out
result, every citation is the code-verified record (report id and printed page as FOUND in the text, the verbatim passage as the quote), and the findings of
OR-RECHECK (quote matching) and OR-RECHECK-2 (claim-level reading) are listed with what was done about each.
The status words stay inside the vocabulary merge_horde.py already carries: verified, partially_verified, gap, inferred, failed_lookup."""
import collections, re

SEQ = ['documented', 'inferred', 'plausible-procedural', 'open gap']


def status_of(line):
    v = line['verdict']
    remains = bool(line['remains_unsupported']) or any(s['support'] == 'unsupported' for s in line['sub_claims'])
    if v == 'confirmed':
        return 'verified'
    if v == 'corrected':
        return 'partially_verified' if remains else 'verified'
    if v == 'partially_supported':
        return 'partially_verified'
    if v == 'unsupported':
        return 'gap'
    return 'gap'


def _clean(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def apply(old, out_rows, rc1, rc2):
    by = {line['id']: (r, line, cites) for r, line, cites in out_rows}
    new = []
    for o in old:
        r, line, cites = by[o['id']]
        n = collections.OrderedDict(o)
        n['verdict_before'] = o.get('verdict')
        n['tier_before'] = o.get('tier')
        n['status_before'] = o.get('status')
        n['notes_before'] = o.get('notes')
        n['citations_before'] = o.get('citations')
        cc = line['corrected_claim']
        n['verdict'] = line['verdict']
        n['tier'] = cc['tier']
        n['status'] = status_of(line)
        cits = []
        used = collections.OrderedDict()
        for s in line['sub_claims']:
            for k in s['citations']:
                used.setdefault(k, []).append(s['n'])
        for sc in line['scenarios']:
            for k in sc.get('citations', []):
                used.setdefault(k, []).append('scenario ' + str(sc['id']))
        for c in line['citations']:
            what = ', '.join(('sub-claim %s' % x) if isinstance(x, int) else x for x in used.get(c['key'], []))
            d = collections.OrderedDict()
            d['key'] = c['key']
            d['work'] = c.get('work')
            d['source_id'] = c['source_id']
            d['part'] = c.get('part')
            d['report_id'] = c.get('report_id')
            d['author'] = c.get('author')
            d['printed_page'] = c.get('printed_page')
            d['page_basis'] = c.get('page_basis')
            d['passage_ref'] = 'supports ' + (what or 'the row') + (('; ' + _clean(c.get('supports'))) if c.get('supports') else '')
            d['quote_under_15_words'] = c['quote']
            d['text_offset'] = c['text_offset']
            d['text_offset_end'] = c['text_offset_end']
            d['source_file'] = c.get('source_file')
            d['sha256'] = c.get('sha256')
            d['quote_reverified_by_code_this_pass'] = True
            for k in ('reading', 'image_check', 'witness', 'note'):
                if c.get(k):
                    d[k] = c[k]
            cits.append(d)
        n['citations'] = cits
        n['citation'] = '; '.join('%s%s p.%s' % (c['source_id'], (' ' + c['report_id']) if c.get('report_id') else '', c['printed_page'] if c.get('printed_page') else 'n/a') for c in cits) or None
        n['passage_ref'] = ' | '.join(_clean(c['passage_ref']) for c in cits) or None
        subs = line['sub_claims']
        cnt = collections.Counter(s['support'] for s in subs)
        n['sub_claim_support'] = dict(cnt)
        n['sub_claim_tiers'] = dict(collections.Counter(s['tier'] for s in subs))
        n['seed_sources_in_conflict'] = o.get('seed_sources_in_conflict') if line['scenarios'] else o.get('seed_sources_in_conflict')
        n['scenarios_no_default'] = [collections.OrderedDict(id=s['id'], label=s['value'], source=s['basis'], tier=s['tier'], citations=s['citations']) for s in line['scenarios']] or None
        n['default_picked'] = line['default']
        n['remains_unsupported'] = line['remains_unsupported']
        n['corrected_claim_text'] = cc['text']
        n['time_window'] = cc['time_window']
        n['corrections_file'] = 'GOVERNANCE/timeline_corrections/tl-01.jsonl'
        regs = []
        if line['register_proposed']:
            regs.append(line['register_proposed'])
        regs += line['register_related']
        n['register_refs'] = regs or None
        rc = rc1.get(o['id']) or []
        n['or_recheck_findings'] = [collections.OrderedDict(quote=x.get('quote'), found=x.get('found'), claimed_report=x.get('claimed_report'), found_report=x.get('found_report'), claimed_page=x.get('claimed_printed_page'), found_page=x.get('found_page'), note=x.get('note')) for x in rc] or None
        c2 = rc2.get(o['id'])
        n['or_claim_check_finding'] = collections.OrderedDict(verdict=c2.get('verdict'), report_id=c2.get('report_id'), printed_page=c2.get('printed_page'), tier_suggestion=c2.get('tier_suggestion'), note=c2.get('note')) if c2 else None
        n['recheck_applied'] = line['recheck_applied']
        n['closeout_searched'] = line['searched']
        n['notes'] = 'Close-out 2026-11-13: %s%s%s' % (line['verdict'].upper(), '. ' + cc['text'] if cc.get('text') else '', (' Remains unsupported: ' + '; '.join(line['remains_unsupported']) + '.') if line['remains_unsupported'] else '')
        n['own_checks_this_pass'] = (o.get('own_checks_this_pass') or []) + ['close-out: every citation of this row re-matched verbatim in the local source text by closeout/build.py (report, printed page, offset recorded)']
        new.append(n)
    return new
