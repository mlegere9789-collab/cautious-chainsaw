#!/usr/bin/env python3
"""Turn extracts/extracts.jsonl into evidence lines for the two correction folders.

Writes (own files of workstream bt-web; the integrators of the evidence and timeline shards merge them):
  docs/battle-theatre/GOVERNANCE/evidence_corrections/web-nps-landscape.jsonl
  docs/battle-theatre/GOVERNANCE/timeline_corrections/web-nps-landscape.jsonl

One line per (target id, extract). A line carries: id (sub-requirement id or timeline row id), verdict
(always partially_supported: one piece of added evidence never completes a requirement), sub_claim,
tier, the state date the passage refers to (and use_for_1863: direct / indirect / none), one citation
(source id, title, author, date, url, pdf page, printed page, retrieval date, verbatim quote, sha256 of the
saved text, local path, text variant) and `remains_unsupported`.

Target ids:
  explicit repository keys   E-xx -> R14.E-xx, P-xx -> R13.P-xx, G-xx -> R13.G-xx, S-xxx -> R14.S-xxx
  object keys (bld-*, FEN-*, H-*, RD-*, ...) -> the state-schedule rows (R14.S-xxx) naming the object, for passages
                              whose state date is 1863 or earlier (use_for_1863 direct)
  topic parents              fields, woodlots, orchards -> R20.0000 and R02.0000; fences, buildings -> R13.0000 and R02.0000;
                              hospitals -> R13.0000 and R05.0000; monuments and avenues (later features) -> R02.0000;
                              earthworks -> R14.0000; burials, damage -> R05.0000 (casualty and burial landscape) / R13.0000;
                              roads, general -> R02.0000
Timeline rows: no timeline row is matched mechanically here; rows are added by hand in
GOVERNANCE/horde/ws-web/nps/timeline_links.jsonl (id, xid, note) and written to the timeline folder by this script.

Run with python3 -I.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
OUT_E = os.path.join(GOV, 'evidence_corrections', 'web-nps-landscape.jsonl')
OUT_T = os.path.join(GOV, 'timeline_corrections', 'web-nps-landscape.jsonl')

PARENTS = {
    'fields': ['R20.0000', 'R02.0000'], 'woodlots': ['R20.0000', 'R02.0000'], 'orchards': ['R20.0000', 'R02.0000'],
    'fences': ['R13.0000', 'R02.0000'], 'buildings': ['R13.0000', 'R02.0000'],
    'hospitals': ['R13.0000', 'R05.0000'],
    'monuments': ['R02.0000'], 'avenues': ['R02.0000'], 'later': ['R02.0000'],
    'earthworks': ['R14.0000'], 'burials': ['R05.0000'], 'damage': ['R13.0000'],
    'roads': ['R02.0000'], 'general': ['R02.0000'], 'cemetery': ['R02.0000'],
}
# an object key is matched to the state-schedule rows (changes of state) only when the passage speaks of a change or a use in the battle
CHANGE = r'burn|fire|destroy|damag|demolish|razed|hospital|wounded|lost|loss|torn|shell|breastwork|rebuilt|built|erected|removed|replaced|used as|headquarters|prisoner|trampled|swept'
UNSUPPORTED = {
    'documented': 'one official secondary source (a National Park Service report); the underlying records it names (census, damage claims, maps) were not read here, and no second independent source is cited',
    'inferred': 'the report itself hedges or reports conflicting evidence; carry as inferred and keep every reading selectable',
}


def load_jsonl(p):
    return [json.loads(l) for l in open(p, encoding='utf-8') if l.strip()] if os.path.exists(p) else []


def main():
    rows = load_jsonl(os.path.join(NPS, 'extracts', 'extracts.jsonl'))
    sched = json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'structures', 'state_schedule.json')))['rows']
    by_obj = {}
    for s in sched:
        for o in s.get('object_ids', []):
            by_obj.setdefault(o, set()).add(s['id'])
            by_obj.setdefault(o.split('#')[0], set()).add(s['id'])
    lines, tl = [], []
    for r in rows:
        ids = []
        why = {}
        for k in r['repo_keys']:
            m = re.fullmatch(r'(E|P|G)-\d\d', k)
            if re.fullmatch(r'R\d\d\.[A-Za-z0-9-]+', k):
                ids.append(k); why[k] = 'terrain-source or requirement id named by the extract'
            elif m:
                rid = ('R14.' if m.group(1) == 'E' else 'R13.') + k
                ids.append(rid); why[rid] = 'repository id ' + k
            elif re.fullmatch(r'S-\d{3}', k):
                ids.append('R14.' + k); why['R14.' + k] = 'repository id ' + k
            elif r['use_for_1863'] == 'direct' and k in by_obj and re.search(CHANGE, r['claim'] + ' ' + r['feature'], re.I):
                for sid in sorted(by_obj[k]):
                    ids.append('R14.' + sid); why['R14.' + sid] = 'object ' + k + ' of state-schedule row ' + sid
        for p in PARENTS.get(r['subtopic'], ['R02.0000']):
            ids.append(p); why[p] = 'topic ' + r['subtopic']
        seen = set()
        for rid in ids:
            if rid in seen:
                continue
            seen.add(rid)
            src_date = r.get('source_date')
            line = {
                'id': rid,
                'shard': 'web-nps-landscape',
                'verdict': 'partially_supported',
                'sub_claim': r['claim'],
                'tier': r['tier_proposed'],
                'tier_basis': r['tier_basis'],
                'state_date': r['state_date'],
                'use_for_1863': r['use_for_1863'],
                'matched_by': why[rid],
                'xid': r['xid'],
                'citation': {
                    'source_id': r['source_id'], 'title': r['source_title'], 'author': r['source_author'], 'date': src_date,
                    'source_class': r['source_kind'], 'url': r['url'],
                    'pdf_page': r['pdf_page'], 'printed_page': r['printed_page'],
                    'retrieved': r['retrieved'],
                    'quote': r['quote'], 'quote_mode': r.get('quote_mode'),
                    'context_quote': r.get('context_quote'), 'context_pdf_page': r.get('context_pdf_page'),
                    'source_text_excerpt': r.get('source_text_excerpt'),
                    'basis_named_by_report': r.get('basis_named'),
                    'text_variant': r['text_variant'], 'local_path': r['text_path'], 'text_sha256': r['text_sha256'],
                    'page_marker': '=== PAGE %d ===' % r['pdf_page'],
                },
                'remains_unsupported': UNSUPPORTED[r['tier_proposed']],
            }
            if r['use_for_1863'] != 'direct':
                line['caution'] = ('modern, reconstructed or later state: not an 1863 profile (hard rule)' if r['use_for_1863'] == 'indirect'
                                   else 'a feature that did not exist in July 1863: never drawn in the 1863 scene')
            lines.append(line)
    os.makedirs(os.path.dirname(OUT_E), exist_ok=True)
    with open(OUT_E, 'w', encoding='utf-8') as f:
        for l in lines:
            f.write(json.dumps(l, ensure_ascii=False, sort_keys=True) + '\n')
    # timeline rows: hand-made links
    links = load_jsonl(os.path.join(NPS, 'timeline_links.jsonl'))
    byx = {r['xid']: r for r in rows}
    os.makedirs(os.path.dirname(OUT_T), exist_ok=True)
    n = 0
    with open(OUT_T, 'w', encoding='utf-8') as f:
        for lk in links:
            r = byx.get(lk['xid'])
            if not r:
                print('timeline link to unknown xid', lk['xid'])
                continue
            f.write(json.dumps({
                'id': lk['id'], 'shard': 'web-nps-landscape', 'verdict': 'partially_supported',
                'sub_claim': lk.get('sub_claim') or r['claim'], 'tier': lk.get('tier') or r['tier_proposed'],
                'note': lk.get('note'), 'state_date': r['state_date'], 'xid': r['xid'],
                'citation': {
                    'source_id': r['source_id'], 'title': r['source_title'], 'author': r['source_author'], 'date': r['source_date'],
                    'source_class': r['source_kind'], 'url': r['url'], 'pdf_page': r['pdf_page'], 'printed_page': r['printed_page'],
                    'retrieved': r['retrieved'], 'quote': r['quote'], 'quote_mode': r.get('quote_mode'),
                    'context_quote': r.get('context_quote'), 'context_pdf_page': r.get('context_pdf_page'),
                    'text_variant': r['text_variant'], 'local_path': r['text_path'], 'text_sha256': r['text_sha256'],
                    'page_marker': '=== PAGE %d ===' % r['pdf_page'],
                },
                'remains_unsupported': UNSUPPORTED[r['tier_proposed']],
            }, ensure_ascii=False, sort_keys=True) + '\n')
            n += 1
    ids = {l['id'] for l in lines}
    print('%d evidence lines for %d ids -> %s; %d timeline lines -> %s' % (len(lines), len(ids), os.path.relpath(OUT_E, ROOT), n, os.path.relpath(OUT_T, ROOT)))


if __name__ == '__main__':
    main()
