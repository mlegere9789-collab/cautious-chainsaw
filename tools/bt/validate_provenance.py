"""Provenance validator implementing PDF Appendix B rules + Section E/P (gates Q02, Q19, Q23 inputs).
A datum is a dict following the Appendix B schema. Use validate(datum) -> list of problems; run this file to self-test.
Rules:
- tier=documented needs >=1 non-lead source and a short supporting extract (<15 words) in that source; leads (encyclopedia-lead, forum-lead, blog, wiki, auction, memory) never support documented.
- tier=inferred needs non-empty reasoning. tier=plausible-procedural needs a procedural block (generator, seed, distribution, documented_context) and a register id when the gap affects a requirement.
- visible-result data need two independent roots (independent_of chains must not share a root) or a flag.
- render_flag must equal 0/1/2 for documented/inferred/plausible-procedural.
- every state change carries a state_schedule; every kit item carries validity dates; copyrighted sources store spans, not text."""
import sys, json
LEAD_TYPES = {'encyclopedia-lead', 'forum-lead', 'blog', 'wiki', 'auction', 'memory'}
FLAG = {'documented': 0, 'inferred': 1, 'plausible-procedural': 2}

def roots(src, by_id):
    seen, stack = set(), list(src.get('independent_of') or [])
    out = {src['source_id']}
    # independence: sources that list each other (or a common ancestor) in independent_of==[] are roots; a source derived from another lists it under 'derived_from'
    for d in (src.get('derived_from') or []):
        out |= roots(by_id[d], by_id) if d in by_id else {d}
    return out

def validate(d, visible_result=True):
    p = []
    t = d.get('tier')
    if t not in FLAG: return ['bad or missing tier']
    srcs = d.get('sources') or []
    by_id = {s['source_id']: s for s in srcs}
    if d.get('render_flag') != FLAG[t]: p.append('render_flag does not match tier')
    if t == 'documented':
        good = [s for s in srcs if s.get('type') not in LEAD_TYPES and s.get('quote_or_extract') and len(s['quote_or_extract'].split()) < 15]
        if not good: p.append('documented needs a non-lead source with a short (<15 words) extract')
        if visible_result and not d.get('flag_single_source'):
            rs = [roots(s, by_id) for s in good]
            distinct = False
            for i in range(len(rs)):
                for j in range(i + 1, len(rs)):
                    if not (rs[i] & rs[j]): distinct = True
            if not distinct: p.append('visible-result datum needs two independent roots or flag_single_source')
    if t == 'inferred' and not (d.get('reasoning') or '').strip(): p.append('inferred needs reasoning')
    if t == 'plausible-procedural':
        pr = d.get('procedural') or {}
        for k in ('generator', 'seed', 'distribution', 'documented_context'):
            if k not in pr: p.append(f'procedural block missing {k}')
        if d.get('affects_requirement') and not d.get('register_ids'): p.append('gap affecting a requirement needs a register id')
    if d.get('state_change') and not d.get('state_schedule'): p.append('state change without state_schedule')
    if d.get('kit_item') and not (d.get('validity') or {}).get('valid_from'): p.append('kit item without validity dates')
    for s in srcs:
        if s.get('copyrighted') and s.get('quote_or_extract') and len(s['quote_or_extract'].split()) >= 15: p.append('copyrighted source: store span not text')
    return p

def _selftest():
    ok = {'tier': 'documented', 'render_flag': 0, 'sources': [{'source_id': 'A', 'type': 'primary-document', 'quote_or_extract': 'about ten fifteen', 'independent_of': []}, {'source_id': 'B', 'type': 'nps-report', 'quote_or_extract': 'ten fifteen', 'independent_of': []}]}
    assert validate(ok) == [], validate(ok)
    wiki = {'tier': 'documented', 'render_flag': 0, 'sources': [{'source_id': 'W', 'type': 'encyclopedia-lead', 'quote_or_extract': 'x'}]}
    assert validate(wiki), 'wikipedia-only documented must fail'
    copy = {'tier': 'documented', 'render_flag': 0, 'sources': [{'source_id': 'A', 'type': 'primary-document', 'quote_or_extract': 'a', 'independent_of': []}, {'source_id': 'B', 'type': 'primary-document', 'quote_or_extract': 'b', 'derived_from': ['A']}]}
    assert any('independent' in x for x in validate(copy)), 'derived source must not count as independent'
    assert validate({'tier': 'inferred', 'render_flag': 1}) == ['inferred needs reasoning']
    assert validate({'tier': 'plausible-procedural', 'render_flag': 2, 'procedural': {'generator': 'g', 'seed': 1, 'distribution': 'd', 'documented_context': 'c'}}) == []
    assert validate({'tier': 'inferred', 'render_flag': 0, 'reasoning': 'r'}) == ['render_flag does not match tier']
    print('validate_provenance self-test OK')

if __name__ == '__main__':
    _selftest()
    sys.exit(0)
