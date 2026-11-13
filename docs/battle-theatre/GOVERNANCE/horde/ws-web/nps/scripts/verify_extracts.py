#!/usr/bin/env python3
"""Independent check of extracts/extracts.jsonl against the saved texts and the library pointer file.

For every extract:
  - the named page exists in the named text variant, and the sha256 of that text file equals the one recorded
    in the extract and the one in sources.json (and, for the standard text, in GOVERNANCE/library/acquired_3.json);
  - the quote is found on that page: exact (whitespace-normalised) for quote_mode sentences/anchors; for quote_mode
    cleaned the letters and digits of the quote occur exactly once on the page and the recorded raw excerpt occurs
    verbatim on the page; the same holds for the optional context quote (a second passage of the same page that
    carries a date, name or number the claim needs);
  - every number written in the claim (digits, thousands commas ignored, 1/2 for the half sign) occurs in the quote
    or in the context quote, except the year of the source's own date (a claim may say 'the 1940 report') and 1863
    when the state date itself says 1863;
  - use_for_1863 follows from state_date by the same rule the builder uses; tier_proposed follows from source_certainty;
  - repo_keys are ids of this repository (checked against structures.json, state_schedule.json, gazetteer, structures3d).
Also checks that every xid is unique and that every source named exists in sources.json with a rights basis.
Warnings (not failures, listed in the report): a four-digit year of the state date that appears neither on the quoted
page nor on the pages next to it.

Writes extracts/verify_report.json (counts, problems, warnings) and exits 1 when a problem is found.
Run with python3 -I.
"""
import importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(spec)
spec.loader.exec_module(be)


def repo_ids():
    ids = set()
    bt = os.path.join(ROOT, 'docs', 'battle-theatre')
    for rel in ('structures/structures.json', 'structures/state_schedule.json', 'app/data/structures3d.json', 'app/data/gazetteer.json'):
        p = os.path.join(bt, rel)
        if os.path.exists(p):
            txt = open(p, encoding='utf-8').read()
            ids.update(re.findall(r'"((?:bld|FEN|RD|ENV|WS|GZ|H|P|G|E|S|STR)-[A-Za-z0-9_#-]+)"', txt))
    base = {i.split('#')[0] for i in ids}
    return ids | base


def numbers(s):
    """The numbers written in a text: digit groups with decimals; thousands commas dropped; the half sign read as 1/2."""
    s = (s or '').replace('½', '1/2')
    s = re.sub(r'(?<=\d),(?=\d{3}(?!\d))', '', s)
    return set(re.findall(r'\d+(?:\.\d+)?', s))


def check_quote(problems, x, label, flat, q, mode, tmpl, excerpt, lig):
    """Verify one quote (the main one or the context) against the flattened page text; returns True when it is of cleaned mode."""
    if mode == 'cleaned':
        key, _ = be._alnum_map(flat, lig)
        tmpl = tmpl or q
        match_form = be._CORR.sub(lambda m: m.group(1), tmpl)
        if be.norm(be._CORR.sub(lambda m: m.group(2), tmpl)) != q:
            problems.append('%s: %s differs from its template with the OCR corrections applied' % (x, label))
        qk, _ = be._alnum_map(be.norm(match_form), lig)
        if key.count(qk) != 1:
            problems.append('%s: %s cleaned letters found %d times on the page' % (x, label, key.count(qk)))
        if not excerpt or excerpt not in flat:
            problems.append('%s: %s raw excerpt missing from the page' % (x, label))
        return True
    if q not in flat:
        problems.append('%s: %s not found verbatim on the page' % (x, label))
    return False


def main():
    sources = {s['id']: s for s in json.load(open(os.path.join(NPS, 'sources.json')))['sources']}
    acq = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library', 'acquired_3.json')))['items']}
    known = repo_ids()
    rows = [json.loads(l) for l in open(os.path.join(NPS, 'extracts', 'extracts.jsonl'), encoding='utf-8') if l.strip()]
    problems, warnings, seen = [], [], set()
    unknown_keys = {}
    counts = {'extracts': len(rows), 'exact': 0, 'cleaned': 0, 'with_context': 0}
    for r in rows:
        x = r['xid']
        if x in seen:
            problems.append('%s: duplicate xid' % x)
        seen.add(x)
        sid = r['source_id']
        s = sources.get(sid)
        if not s:
            problems.append('%s: source %s not in sources.json' % (x, sid)); continue
        if not s.get('rights_basis'):
            problems.append('%s: no rights basis for %s' % (x, sid))
        variant = None if r['text_variant'] == 'reading-order' else r['text_variant']
        try:
            pgs, tsha, tpath = be.pages(sid, variant)
        except SystemExit as e:
            problems.append('%s: %s' % (x, e)); continue
        if tsha != r['text_sha256']:
            problems.append('%s: text hash changed (%s) since the extract was built' % (x, tpath))
        if variant is None:
            if sid not in acq or acq[sid]['text_sha256'] != tsha:
                problems.append('%s: acquired_3.json text hash differs from the saved text of %s' % (x, sid))
        p = r['pdf_page']
        if p not in pgs:
            problems.append('%s: page %d missing' % (x, p)); continue
        flat = be.norm(pgs[p])
        q = r['quote']
        lig = 'fi' if s.get('text_defect') == 'fi-ligature' else (s.get('text_defect') == 'ligature')
        cleaned = check_quote(problems, x, 'quote', flat, q, r.get('quote_mode', 'anchors'), r.get('quote_template'), r.get('source_text_excerpt'), lig)
        counts['cleaned' if cleaned else 'exact'] += 1
        cq = r.get('context_quote')
        if cq:
            counts['with_context'] += 1
            check_quote(problems, x, 'context quote', flat, cq, r.get('context_mode', 'anchors'), r.get('context_template'), r.get('context_excerpt'), lig)
        # every number of the claim stands in the quote or in the context quote
        allowed = numbers(q) | numbers(cq)
        m = re.search(r'(\d{4})', str(s.get('date') or ''))
        if m:
            allowed.add(m.group(1))
        if '1863' in r['state_date']:
            allowed.add('1863')
        missing = sorted(n for n in numbers(r['claim']) if n not in allowed)
        if missing:
            problems.append('%s: number(s) %s of the claim are in neither the quote nor the context quote' % (x, ', '.join(missing)))
        use, _ = be.use_for_1863(r['state_date'])
        if r['use_for_1863'] not in ('direct', 'indirect', 'none'):
            problems.append('%s: bad use_for_1863 %r' % (x, r['use_for_1863']))
        if r['tier_proposed'] != {'stated': 'documented', 'hedged': 'inferred', 'conflict': 'inferred'}[r['source_certainty']]:
            problems.append('%s: tier does not follow the source wording' % x)
        if r['use_for_1863'] == 'direct' and re.search(r'modern|reconstruct|replant|rebuilt|20[0-2]\d', r['state_date']) and not re.match(r'1[0-8]\d\d', r['state_date']):
            problems.append('%s: a modern state date marked direct: %r' % (x, r['state_date']))
        # state-date years should be found on the quoted page or the pages next to it (warning only)
        near = ' '.join(be.norm(pgs[k]) for k in (p - 1, p, p + 1) if k in pgs)
        for y in sorted(set(re.findall(r'\b(1[6-9]\d\d|20[0-2]\d)\b', r['state_date']))):
            if y != '1863' and y not in near:
                warnings.append('%s: state-date year %s is on neither page %d nor the pages next to it' % (x, y, p))
        for k in r.get('repo_keys', []):
            if k not in known and not re.fullmatch(r'R\d\d\.[A-Za-z0-9-]+', k):
                unknown_keys[k] = unknown_keys.get(k, 0) + 1
    for k, n in sorted(unknown_keys.items()):
        problems.append('repo key %r used %d time(s) is not an id found in the repository data' % (k, n))
    rep = {'checked': counts, 'problems': problems, 'warnings': warnings, 'sources_with_extracts': sorted({r['source_id'] for r in rows})}
    with open(os.path.join(NPS, 'extracts', 'verify_report.json'), 'w', encoding='utf-8') as f:
        json.dump(rep, f, indent=1, ensure_ascii=False)
    print('%d extracts checked (%d exact, %d cleaned, %d with a context quote); %d problem(s), %d warning(s)' % (len(rows), counts['exact'], counts['cleaned'], counts['with_context'], len(problems), len(warnings)))
    for pr in problems[:200]:
        print(' -', pr)
    for w in warnings[:40]:
        print(' ?', w)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
