"""Writes tl-NN-CO-<id>.md proposed register entries for the rows of tl-09..12 that stay open and have no entry yet."""
import json, os, glob, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', '..', '..'))
G = ROOT + '/docs/battle-theatre/GOVERNANCE/'
reg_all = ' '.join(open(p, encoding='utf-8').read() for p in glob.glob(G + 'register/*.md'))
made = {}
for n in ('09', '10', '11', '12'):
    shard = 'tl-' + n
    pdir = G + 'horde/%s/proposed-register/' % shard
    existing = {p: open(p, encoding='utf-8').read() for p in glob.glob(pdir + '*.md') if '-CO-' not in os.path.basename(p)}
    seed = {json.loads(l)['id']: json.loads(l) for l in open(G + 'timeline_seed.jsonl')}
    cnt = 0
    for l in open(G + 'timeline_corrections/%s.jsonl' % shard):
        r = json.loads(l)
        if r['verdict'] == 'confirmed':
            continue
        rid = r['id']
        covered = [os.path.basename(p) for p, t in existing.items() if rid in t] + (['register/EG-TL-' + rid] if ('EG-TL-' + rid) in reg_all else [])
        if covered:
            continue
        cat = 'source conflict (selectable scenario)' if r['scenarios'] else 'evidence missing'
        desc = 'Row %s (%s). Verdict %s.' % (rid, (seed[rid]['text_raw'].split('|')[0]).strip(), r['verdict'])
        if r['remains_unsupported']:
            desc += ' Still unsupported or open: ' + ' / '.join(s.replace('|', '/') for s in r['remains_unsupported'])[:1400]
        comp = '; '.join('%s: %s [%s]' % (s['id'], s['value'], s['basis']) for s in r['scenarios'])[:1500].replace('|', '/') or '-'
        body = '''# {shard}-CO-{rid}: {title}

| Field | Content |
|---|---|
| ID | {shard}-CO-{rid} |
| Requirement IDs | R11 |
| Category | {cat} |
| Description | {desc} |
| Why literal 100% is not possible or blocked | No non-lead source read supports the open part exactly (Law cl.4). The shard audit of 2026-11-04 recorded the lookup and the close-out of 2026-11-24 re-read it against the local OR27 text; a failed lookup is recorded as failed, nothing is invented. Not a physics limit. |
| Evidence searched | Shard notes of horde/{shard}/results.jsonl for this row; the quotes of the shard re-matched against the local OR27 text by the close-out (see timeline_corrections/{shard}.jsonl, before.quote_recheck). Local texts only; archive.org and loc.gov page requests are not repeated. |
| Autonomous substitute applied | None beyond the marked reconstruction below. |
| Strongest evidence-based reconstruction | Show the part the OR text supports with its tier marking and mark the open part as a visible gap; carry every conflicting value as a selectable scenario, no default. |
| Confidence tier | {tier} |
| Competing values | {comp} |
| Product marking | Tier glyph on the open part. |
| Visual and audio impact | Timing, placement or count of the open part only |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | none (work continues); default views of conflicts remain PENDING OWNER |
| Agent recommendation | Carry all values as selectable scenarios where sources conflict; pick no default beyond a recorded owner decision (Law cl.6). |
| Status | open (proposed by the {shard} close-out, not yet integrated) |
| Owner decision and date | (filled only from the Decision Log) |
'''.format(shard=shard, rid=rid, title=(seed[rid]['text_raw'].split('|')[0]).strip().replace('|', '/') + ' (' + rid + ')', cat=cat, desc=desc.replace('\n', ' '), tier=r['tier_change']['shard_effective'] or 'open gap', comp=comp)
        path = pdir + '%s-CO-%s.md' % (shard, rid)
        open(path, 'w', encoding='utf-8').write(body)
        cnt += 1
    made[shard] = cnt
print(made)
