#!/usr/bin/env python3
"""List the Park Service extracts (GOVERNANCE/horde/ws-web/nps/extracts/extracts.jsonl) that name a structure of a group, as citations ready for a row.

    python3 tools/bt/town/extracts_for_group.py farms-emmitsburg-road            # a readable list
    python3 tools/bt/town/extracts_for_group.py farms-emmitsburg-road --out tmp/town-farms-emmitsburg-road/extract-candidates.jsonl

An extract is a head start, not evidence of this pass: its quote is looked for again in the local text with the validator's matcher (offset and page are the ones
the validator will check), its `use_for_1863` and `state_date` say what time it speaks about (set `describes` from that and from the passage itself), and a
quote the text layer damaged comes with its raw excerpt (use quote_mode "ocr"). Read the passage before you write a row. The extract's repository keys name
records (bld-*), fences (FEN-*), walls (P-*), hospitals (H-*), gazetteer places and requirements; only ids of the group's inventory are listed here.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import validate_evidence as V  # noqa: E402

EXTRACTS = os.path.join(V.REAL_ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-web', 'nps', 'extracts', 'extracts.jsonl')


def candidates(ctx, gid):
    g = ctx.groups()[gid]
    ids = set()
    for k, v in g['members'].items():
        if k != 'hospitals':
            ids.update(v)
    base = {i.split('#')[0] for i in ids}
    out = []
    for l in open(EXTRACTS, encoding='utf-8'):
        if not l.strip():
            continue
        r = json.loads(l)
        keys = [k for k in (r.get('repo_keys') or []) if k in ids or k in base]
        if not keys:
            continue
        sid = r['source_id']
        led = ctx.ledger().get(sid)
        c = {'xid': r['xid'], 'buildings': keys, 'claim': r['claim'], 'state_date': r['state_date'], 'use_for_1863': r['use_for_1863'], 'source_wording_tier': r['tier_proposed']}
        if not led or led.get('text', '-') in ('-', ''):
            c['problem'] = 'source %s is not a local text of the ledger' % sid
            out.append(c)
            continue
        mode = r.get('quote_mode', 'anchors')
        quote = r['quote']
        find = quote
        cite = {'source': sid, 'part': None, 'page': r['pdf_page'], 'quote': quote}
        if mode == 'cleaned' and r.get('source_text_excerpt'):
            find = r['source_text_excerpt']
            if V.quote_skeleton(find) != V.quote_skeleton(quote):
                cite.update({'quote_mode': 'ocr', 'raw': find, 'ocr_note': 'damaged glyphs of the text layer repaired as the extract records'})
        raw, skel, omap, marks = ctx.text(led['text'])
        st = V.match_quote(skel, omap, find)
        if not st:
            c['problem'] = 'quote not found again in %s (the text may differ from the one the extract was made from)' % led['text']
        else:
            # the occurrence on the extract's page when there are several
            best = st[0]
            for s in st:
                pg = [n for pos, n in marks if pos <= s]
                if pg and pg[-1] == r['pdf_page']:
                    best = s
                    break
            cite['text_offset'] = best
            cite['page'] = ([n for pos, n in marks if pos <= best] or [r['pdf_page']])[-1]
            c['occurrences'] = len(st)
        c['cite'] = cite
        out.append(c)
    return out


def main(argv):
    if not argv or argv[0].startswith('--'):
        print(__doc__)
        return 2
    gid = argv[0]
    ctx = V.Ctx(V.REAL_ROOT)
    if gid not in ctx.groups():
        print('group %r is not in evidence/groups.json' % gid)
        return 2
    cs = candidates(ctx, gid)
    if '--out' in argv:
        p = argv[argv.index('--out') + 1]
        os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as f:
            for c in cs:
                f.write(json.dumps(c, ensure_ascii=False) + '\n')
        print('wrote %s (%d extracts, %d with a problem)' % (p, len(cs), sum(1 for c in cs if c.get('problem'))))
        return 0
    for c in cs:
        print('%s  %s  [%s; use %s; source wording %s]' % (c['xid'], ', '.join(c['buildings']), c['state_date'], c['use_for_1863'], c['source_wording_tier']))
        print('    claim: ' + c['claim'])
        if c.get('problem'):
            print('    PROBLEM: ' + c['problem'])
        else:
            print('    cite : source=%s page=%s text_offset=%s%s' % (c['cite']['source'], c['cite']['page'], c['cite']['text_offset'], '  (quote_mode ocr: raw excerpt kept)' if c['cite'].get('raw') else ''))
    print('%d extracts name a structure of %s' % (len(cs), gid))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
