"""Writes one proposed register entry per row of shard tl-01 that stays gap, unsupported or partial (and per row with any unsupported sub-claim).
Format = the register template used by every other proposed entry (GOVERNANCE/register/EG-*.md); file name tl-01-CO-<row>.md.
merge_horde.py copies these files to GOVERNANCE/register/proposed/tl-01/; an owner decision or the register builder promotes them."""
import os, glob, re

def _cell(s):
    return str(s).replace('|', '/').replace('\n', ' ').strip() or '-'

def write(dirpath, out_rows):
    os.makedirs(dirpath, exist_ok=True)
    for f in glob.glob(os.path.join(dirpath, 'tl-01-CO-*.md')):
        os.remove(f)
    n = 0
    for r, line, cites in out_rows:
        g = r.get('register')
        if not g:
            continue
        rid = line['id']
        eid = 'tl-01-CO-' + rid
        cc = line['corrected_claim']
        searched = '; '.join(line['searched']) if line['searched'] else '-'
        unsupported = [s['claim'] for s in line['sub_claims'] if s['support'] == 'unsupported'] + list(line['remains_unsupported'])
        seen = []
        for u in unsupported:
            if u not in seen:
                seen.append(u)
        desc = '%s Timeline row %s (seed p.%s, seed tier %s). Not supported by any non-lead source read: %s' % (g['title'], rid, line['seed']['page'], line['seed']['tier'], '; '.join(seen) if seen else 'see the row')
        # the label of the highest tier that the supported part of the row reaches, and of the unsupported part
        tiers = sorted({s['tier'] for s in line['sub_claims']})
        reg_tier = g['tier']
        if reg_tier not in ('documented', 'inferred', 'plausible-procedural'):
            reg_tier = 'inferred' if reg_tier == 'open gap' else reg_tier
        rows = [
            ('ID', eid),
            ('Requirement IDs', g.get('rids') or 'R11'),
            ('Category', 'evidence partly missing' if line['verdict'] in ('confirmed', 'corrected', 'partially_supported') else 'evidence missing'),
            ('Description', desc),
            ('Why literal 100% is not possible or blocked', g['why']),
            ('Evidence searched', searched),
            ('Autonomous substitute applied', g.get('subst') or '-'),
            ('Strongest evidence-based reconstruction', g['recon']),
            ('Confidence tier', g['tier']),
            ('Competing values', g.get('competing') or '-'),
            ('Product marking', cc.get('marking') or 'tier glyph on every sub-claim that is not documented; the unsupported items are shown as marked gaps'),
            ('Visual and audio impact', g.get('impact') or '-'),
            ('Review status', 'internal review only (DEC-006: no public review label); proposed by the close-out of shard tl-01 (2026-11-13), not yet merged'),
            ('Owner decision requested', g.get('ask') or 'none: no default is chosen where sources conflict; every scenario stays selectable'),
            ('Agent recommendation', 'Carry the supported part as marked; show the unsupported items only as marked gaps; do not present them as documented.'),
            ('Status', 'proposed'),
            ('Owner decision and date', '(filled only from the Decision Log)'),
        ]
        title = '%s: %s' % (eid, g['title'])
        if len(title) > 90:
            title = title[:87] + '...'
        md = ['# ' + title, '', '| Field | Content |', '|---|---|']
        for k, v in rows:
            md.append('| %s | %s |' % (k, _cell(v)))
        if line.get('register_related'):
            md.append('| Related entries | %s |' % _cell(', '.join(line['register_related'])))
        md.append('')
        with open(os.path.join(dirpath, eid + '.md'), 'w', encoding='utf-8', newline='\n') as f:
            f.write('\n'.join(md))
        n += 1
    return n
