#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Writes docs/battle-theatre/medical/evidence/groups.json from tools/bt/medical/groups_def.py (every source id is checked against sources.json) and prints the
group sections of PLAN.md as markdown to stdout (or to --md PATH). The rest of PLAN.md is written by hand.

    python3 -I tools/bt/medical/build_plan.py [--md PATH]
"""
import os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
MED = os.path.join(ROOT, 'docs', 'battle-theatre', 'medical')
sys.path.insert(0, HERE)
from groups_def import G  # noqa: E402


def main(argv):
    reg = json.load(open(os.path.join(MED, 'sources.json'), encoding='utf-8'))['sources']
    cands = {c['id']: c for c in json.load(open(os.path.join(MED, 'evidence', 'SITES-CANDIDATES.json'), encoding='utf-8'))['sites']}
    bad = []
    seen = set()
    for g in G:
        if g['id'] in seen:
            bad.append('duplicate group id ' + g['id'])
        seen.add(g['id'])
        for k in ('local', 'acquire'):
            for sid in g[k]:
                if sid not in reg:
                    bad.append('%s: %s %s is not in sources.json' % (g['id'], k, sid))
        for c in g.get('site_candidates', []):
            if c not in cands:
                bad.append('%s: site candidate %s is not in SITES-CANDIDATES.json' % (g['id'], c))
    if not 14 <= len(G) <= 22:
        bad.append('the number of groups must be 14 to 22, it is %d' % len(G))
    # a local source must be a local file now; an acquire source must be planned (no local file with a hash) or at least present in the registry
    for g in G:
        for sid in g['local']:
            for f in reg[sid]['files'].values():
                p = os.path.join(ROOT, f['path'])
                if not os.path.exists(p):
                    bad.append('%s: local source %s has no file on disk (%s)' % (g['id'], sid, f['path']))
    if bad:
        print('\n'.join(bad))
        return 1
    out = {'schema': 'medical-groups/1', 'generated': '2026-11-14',
           '_doc': 'The research groups of the medical evidence work (OA12). Written by tools/bt/medical/build_plan.py from tools/bt/medical/groups_def.py. topics: the first word of a row topic must be one of these '
                   '(or misc); kinds: the kinds the group is expected to use (the validator warns about others, it does not refuse them); sources_local: texts on disk now; sources_acquire: texts to download first '
                   '(the ledger of SOURCES.md records each download). rows.least is the number of verified rows a pass must reach (or the REPORT says why not, with the gap registered); rows.aim is what a thorough pass is expected to yield. '
                   'Group ids are lowercase letters, digits and hyphens.',
           'conventions': {'evidence_file': 'docs/battle-theatre/medical/evidence/<group>.jsonl', 'report_file': 'docs/battle-theatre/medical/evidence/<group>.REPORT.md',
                           'proposed_register': 'docs/battle-theatre/GOVERNANCE/horde/ws-medical/proposed-register/<group>-*.md', 'row_id': 'med.<group>.<nnn>',
                           'validate': 'python3 -I tools/bt/medical/validate_evidence.py <group>'},
           'groups': []}
    for g in G:
        e = {'id': g['id'], 'title': g['title'], 'area': g['area'], 'scope': g['scope'], 'questions': g['questions'], 'topics': g['topics'], 'kinds': g['kinds'],
             'sources_local': g['local'], 'sources_acquire': g['acquire'], 'scene_outputs': g['scene'], 'rows': {'least': g['rows'][0], 'aim': g['rows'][1]},
             'depends_on': g['depends'], 'conflicts_expected': g['conflicts'], 'gaps_expected': g['gaps']}
        if g.get('site_candidates'):
            e['site_candidates'] = [{'id': c, 'name': cands[c]['name'], 'side': cands[c]['side'], 'local_sources_with_hospital_co_mention': cands[c]['n_sources']} for c in g['site_candidates']]
        out['groups'].append(e)
    with open(os.path.join(MED, 'evidence', 'groups.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1)
    md = []
    w = md.append
    for i, g in enumerate(G, 1):
        w('## %d. `%s`: %s\n' % (i, g['id'], g['title']))
        w('*Area %s. Rows: at least %d, aim %d. Depends on: %s.*\n' % (g['area'], g['rows'][0], g['rows'][1], ', '.join('`%s`' % d for d in g['depends']) or 'nothing'))
        w(g['scope'] + '\n')
        w('**Questions the rows answer**\n')
        for q in g['questions']:
            w('* ' + q)
        w('')
        w('**Topics** `%s`. **Kinds** `%s`.\n' % ('`, `'.join(g['topics']), '`, `'.join(g['kinds'])))
        w('**Local sources**: %s.\n' % ', '.join('`%s`' % s for s in g['local']))
        w('**To acquire first**: %s.\n' % (', '.join('`%s`' % s for s in g['acquire']) or 'nothing'))
        w('**What the scenes take from it**: ' + g['scene'] + '\n')
        w('**Conflicts expected** (carried as selectable scenarios, no default): ' + g['conflicts'] + '\n')
        w('**Gaps expected** (registered, shown as gaps): ' + g['gaps'] + '\n')
        if g.get('site_candidates'):
            w('**Candidate sites** (inventory scan, not evidence; the number is how many local texts put the name beside a hospital word):\n')
            w('| candidate | name | side | local texts |')
            w('|---|---|---|---|')
            for c in g['site_candidates']:
                w('| `%s` | %s | %s | %d |' % (c, cands[c]['name'], cands[c]['side'], cands[c]['n_sources']))
            w('')
    text = '\n'.join(md)
    if '--md' in argv:
        head = ('# Research groups of the medical evidence work (OA12)\n\nGenerated by `tools/bt/medical/build_plan.py` from `groups_def.py`; the same content is in `groups.json`. '
                'The plan, the evidence contract and the scene work are in `PLAN.md`; the sources in `../SOURCES.md`. Source ids are those of `../sources.json`. '
                'Seed rows (verified by the validator) already exist in some group files: keep them, do not renumber, append the next id.\n\n')
        with open(argv[argv.index('--md') + 1], 'w', encoding='utf-8') as f:
            f.write(head + text)
    else:
        print(text)
    print('wrote groups.json with %d groups' % len(G), file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
