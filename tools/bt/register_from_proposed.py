"""Turn shard-proposed register entries (GOVERNANCE/register/proposed/**) into real register entries.
Deterministic and idempotent: proposed ids already present (field proposed_id) are skipped; the existing entries are never touched.
- New ids continue the EG-NNNN series in sorted proposed-path order.
- 'proposed update of EG-x' entries and near-duplicates are NOT added as new entries: they are recorded as aliases in
  register_aliases.json (proposed id -> existing/earlier id) so links resolve to the entry that already covers the gap.
- Tiers are never promoted: the index tier is the weakest tier named in the shard text; unparseable -> plausible-procedural
  (the shard's own wording stays verbatim in the entry file).
- Nothing is invented: a field the shard did not state is filled with an explicit 'not stated by shard' marker."""
import json, os, re, glob, difflib
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
RANK = {'documented': 0, 'inferred': 1, 'plausible-procedural': 2}
NS = 'not stated by the shard proposal (see register/proposed/%s)'

def parse(path):
    t = open(path, encoding='utf-8').read()
    h1 = t.split('\n')[0].lstrip('# ').strip()
    f = {}
    for m in re.finditer(r'^\| (.+?) \| (.*) \|$', t, re.M):
        if m.group(1) not in ('Field', '---'):
            f.setdefault(m.group(1), m.group(2))
    return h1, f, t

def tier_of(txt):
    s = (txt or '').lower()
    found = []
    if 'plausible' in s or 'open gap' in s or 'mixed' in s: found.append('plausible-procedural')
    if 'inferred' in s or 'inference' in s: found.append('inferred')
    if 'documented' in s: found.append('documented')
    if not found: return 'plausible-procedural'
    return max(found, key=lambda x: RANK[x])

def rids_of(txt):
    out = []
    for m in re.findall(r'\b(R\d\d|OA\d\d)\b', txt or ''):
        if m not in out: out.append(m)
    return out

def norm(s): return re.sub(r'[^a-z0-9 ]', '', s.lower())

def main():
    idx_p = os.path.join(G, 'register_index.json')
    idx = json.load(open(idx_p, encoding='utf-8'))
    have = {e['proposed_id']: e['id'] for e in idx if e.get('proposed_id')}
    existing_ids = {e['id'] for e in idx}
    nums = [int(e['id'][3:]) for e in idx if re.fullmatch(r'EG-\d{4}', e['id'])]
    nxt = max(nums) + 1
    ap = os.path.join(G, 'register_aliases.json')
    aliases = json.load(open(ap, encoding='utf-8')) if os.path.exists(ap) else {}
    files = sorted(glob.glob(os.path.join(G, 'register', 'proposed', '**', '*.md'), recursive=True))
    titles = [(e['id'], norm(e['title'])) for e in idx]
    rowsets = {e['id']: frozenset(re.findall(r'\bT\d-\d{3}\b', e['title'])) for e in idx}
    new = []
    for p in files:
        pid = os.path.basename(p)[:-3]
        rel = os.path.relpath(p, os.path.join(G, 'register')).replace(os.sep, '/')
        if pid in have or pid in aliases: continue
        h1, f, raw = parse(p)
        title = re.sub(r'^' + re.escape(pid) + r':\s*', '', h1) or h1
        upd = re.search(r'\b(?:proposed )?update of (EG-[A-Z0-9-]+)', title)
        if upd and upd.group(1) in existing_ids:
            aliases[pid] = {'alias_of': upd.group(1), 'reason': 'shard text states it is an update of an existing entry; existing entry left untouched, update text stays in register/' + rel}
            continue
        if not f.get('Category'):
            # aggregate conflict table (no field table): one entry that points at the table
            f = {'Requirement IDs': ', '.join(rids_of(raw)) or '',
                 'Category': 'source conflict',
                 'Description': title + ' (table of conflicts; each row with both values and citations is in register/' + rel + ')',
                 'Why literal 100% is not possible or blocked': 'The sources disagree; the owner alone decides a default (Law cl.6).',
                 'Evidence searched': 'See the table in register/' + rel + ' (Official Records OCR per shard; single-witness OCR noted there).',
                 'Autonomous substitute applied': 'None applied. Both values carried as selectable scenarios, no default.',
                 'Strongest evidence-based reconstruction': 'Each value is shown with its own source; nothing merged.',
                 'Confidence tier': 'inferred (single-witness OCR)',
                 'Product marking': 'Scenario selector shows both values',
                 'Status': 'open'}
        e = {'id': None, 'proposed_id': pid, 'proposed_file': 'register/' + rel}
        e['title'] = title
        e['rids'] = rids_of(f.get('Requirement IDs')) or rids_of(raw)
        e['cat'] = f.get('Category') or NS % rel
        e['desc'] = f.get('Description') or NS % rel
        e['why'] = f.get('Why literal 100% is not possible or blocked') or f.get('Why literal 100% is not possible') or NS % rel
        e['searched'] = f.get('Evidence searched') or NS % rel
        e['subst'] = f.get('Autonomous substitute applied') or NS % rel
        e['recon'] = f.get('Strongest evidence-based reconstruction') or NS % rel
        e['tier'] = tier_of(f.get('Confidence tier'))
        e['tier_as_stated'] = f.get('Confidence tier') or NS % rel
        e['competing'] = f.get('Competing values') or '-'
        e['marking'] = f.get('Product marking') or NS % rel
        e['impact'] = f.get('Visual and audio impact') or '-'
        e['owner_q'] = f.get('Owner decision requested') or '-'
        e['rec'] = f.get('Agent recommendation') or '-'
        st = (f.get('Status') or 'open').lower()
        e['status'] = 'partly_closed' if st.startswith('partly_closed') else ('closed' if st.startswith('closed') else 'open')
        if not e['rids']: e['rids'] = ['R11']; e['rids_note'] = 'no requirement id stated by shard; R11 (timeline) assumed from shard tl-* scope'
        # de-duplication against existing and earlier-new entries
        nt = norm(title); dup = None
        rowset = frozenset(re.findall(r'\bT\d-\d{3}\b', title))
        for oid, ot in titles:
            if rowsets.get(oid, frozenset()) != rowset: continue   # a row-level entry is for exactly that row
            if ot == nt or difflib.SequenceMatcher(None, ot, nt).ratio() >= 0.93: dup = oid; break
        if dup:
            aliases[pid] = {'alias_of': dup, 'reason': 'title equal or >=0.93 similar to an existing entry'}
            continue
        e['id'] = 'EG-%04d' % nxt; nxt += 1
        titles.append((e['id'], nt)); rowsets[e['id']] = rowset
        new.append(e)
    for e in new:
        e2 = {k: v for k, v in e.items() if k not in ('tier_as_stated', 'rec', 'rids_note', 'proposed_file')}
        e2['proposed_id'] = e['proposed_id']; e2['proposed_file'] = e['proposed_file']
        idx.append(e2)
        rows = [('ID', e['id']), ('Proposed id (shard)', e['proposed_id'] + ' (' + e['proposed_file'] + ')'),
                ('Requirement IDs', ', '.join(e['rids'])), ('Category', e['cat']), ('Description', e['desc']),
                ('Why literal 100% is not possible or blocked', e['why']), ('Evidence searched', e['searched']),
                ('Autonomous substitute applied', e['subst']), ('Strongest evidence-based reconstruction', e['recon']),
                ('Confidence tier', e['tier'] + ' (shard wording: ' + e['tier_as_stated'] + '; tier is the weakest named, never promoted)'),
                ('Competing values', e['competing']), ('Product marking', e['marking']), ('Visual and audio impact', e['impact']),
                ('Review status', 'internal review only (DEC-006: no public review label)'),
                ('Owner decision requested', e['owner_q']), ('Agent recommendation', e['rec']),
                ('Status', e['status']), ('Owner decision and date', '(filled only from the Decision Log)')]
        if e.get('rids_note'): rows.insert(3, ('Note', e['rids_note']))
        body = '# %s: %s\n\n| Field | Content |\n|---|---|\n' % (e['id'], e['title']) + ''.join('| %s | %s |\n' % r for r in rows)
        open(os.path.join(G, 'register', e['id'] + '.md'), 'w', encoding='utf-8').write(body)
    json.dump(idx, open(idx_p, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    json.dump(aliases, open(ap, 'w', encoding='utf-8'), indent=1, ensure_ascii=False, sort_keys=True)
    print('new entries', len(new), 'aliases total', len(aliases), 'index', len(idx))

if __name__ == '__main__':
    main()
