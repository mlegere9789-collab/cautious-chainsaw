#!/usr/bin/env python3
"""Overlap audit of the bundle patch set, replayed the way the builder applies it.

    python tools/t0/overlap.py [--train R1g ...] [--deep] [--pristine] [--report out.json]

WHAT IT PROVES.  The first version of this tool listed every pair of patches whose `find` spans intersect in the PRISTINE bundle and failed on any
pair that was not in trains.json `known_overlaps`.  That condition cannot hold for a cumulative release: a later group is written against the text an earlier
group produced (its anchor does not exist in the pristine bundle at all, or sits inside text the earlier group re-emitted), so the pristine geometry
reported 47 "overlaps" and 31 "pristine-count mismatches" that are all deliberate layering, and the exit code said nothing about real trouble.
The true conditions, replayed for every train with the builder's own applier (t0build.patches.apply_patch, fixed group order), are:

  A. ANCHORS.  Every bundle patch of the train matches the CURRENT text exactly `expect` times when its turn comes (the builder's assertion, here for all
     trains at once and before anything is built).
  B. PROVENANCE.  The text a patch writes is tracked as its "changed core" (what its replacement adds to its find: common prefix and suffix are context, not
     change).  A later patch Y whose match covers part of the core of an earlier patch X CONSUMES X.  Each consumption is classified:
       chained     Y's anchor stops matching when X is left out (the replay without X is run): Y was written against X's output, the order is forced and the
                   builder fails loudly in the other order.  Nothing can be lost silently.
       refined     Y keeps at least half of the text it covers of X's core (difflib blocks) and changes the rest: Y edits X's output, X's work stays.
       superseded  Y matches with or without X (a regex over a whole field, a find inside text X merely re-emitted) and its replacement does NOT keep X's core:
                   X's change is overwritten and X has no effect on the bundle.  This is the only silent loss, so every such pair must be DECLARED in
                   tools/t0/overlap-declared.json with the reason; an undeclared one fails, and so does a declared one that no longer occurs.
  C. EXPLAINED ANCHORS.  A patch whose find does not match `expect` times in the pristine bundle must consume an earlier patch (it is chained); if it does not,
     its anchor came from nowhere and the audit fails.

Exit 0 when A, B and C hold for every audited train, 1 otherwise.  --pristine also prints the old geometric list (information only).
trains.json `known_overlaps` pairs are still honoured (they are declared supersessions/chains of the first release).  Page-target patches (files of dist) are
not part of this audit: the builder asserts their counts per file.
"""
import difflib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from t0build import patches  # noqa: E402
from t0build.util import REPO, T0, load_json, read_text  # noqa: E402

DECLARED = os.path.join(T0, 'overlap-declared.json')
KEEP_FRACTION = 0.5          # Y keeps at least this share of the text it covers of X's core -> refinement


def load_texts(cfg):
    L = cfg['legacy']
    return {'js': read_text(os.path.join(REPO, L['dir'], L['entry'])), 'help': read_text(os.path.join(REPO, L['dir'], L['help'])),
            'book': read_text(os.path.join(REPO, L['dir'], L['book'])), 'css': read_text(os.path.join(REPO, L['dir'], L['css']))}


def matches(text, p):
    """[(start, end, replacement)] of patch p in text (the replacement is what apply_patch would write)."""
    if p.get('regex'):
        return [(m.start(), m.end(), m.expand(p['repl'])) for m in re.finditer(p['find'], text)]
    out, i = [], text.find(p['find'])
    while i != -1:
        out.append((i, i + len(p['find']), p['repl']))
        i = text.find(p['find'], i + len(p['find']))        # non-overlapping, like str.replace / str.count in apply_patch
    return out


def core_of(old, new):
    """(prefix, suffix) lengths shared by the matched text and its replacement: the rest is the change."""
    k = 0
    while k < len(old) and k < len(new) and old[k] == new[k]:
        k += 1
    j = 0
    while j < len(old) - k and j < len(new) - k and old[len(old) - 1 - j] == new[len(new) - 1 - j]:
        j += 1
    return k, j


def sequence(found, bundle):
    return [p for g in bundle for p in found[g]['patches'] if p['target'] in patches.BUNDLE_TARGETS]


def replay(texts, seq, start=0, skip=None, lenient=False, track=False, snapshots=()):
    """Apply seq[start:] in order to `texts` (a dict target -> text).  Returns a dict:
         texts      the texts after the last patch,
         bad        [(index, found)] anchors that did not match `expect` (the replay stops at the first one unless lenient),
         cons       [(y, x)] patch y's match covered part of the changed core of the earlier patch x (track=True),
         cores      {index: [core strings]} what each patch added to the text it matched (track=True),
         snaps      {index: texts before that patch} for the indexes in `snapshots`.
    The changed core of a patch is its replacement without the prefix and suffix it shares with the matched text (context, not change)."""
    cur = dict(texts)
    owners = {k: [] for k in cur}                    # (start, end, index) of the changed core each patch wrote
    bad, cons, cores, snaps = [], [], {}, {}
    for yi in range(start, len(seq)):
        p = seq[yi]
        if yi in snapshots:
            snaps[yi] = dict(cur)
        if yi == skip:
            continue
        t = cur[p['target']]
        ms = matches(t, p)
        if len(ms) != p['expect']:
            bad.append((yi, len(ms)))
            if lenient:
                continue
            break
        if not track:
            cur[p['target']] = ''.join(_splice(t, ms))
            continue
        ow = owners[p['target']]
        parts, last, newregs, taken, pos, cs = [], 0, [], set(), 0, []
        for (s, e, r) in ms:
            parts.append(t[last:s]); pos += s - last
            k, j = core_of(t[s:e], r)
            parts.append(r); newregs.append((pos + k, pos + len(r) - j, yi)); cs.append(r[k:len(r) - j]); pos += len(r); last = e
            for (a, b, x) in ow:
                if (a < e and b > s) or (a == b and s < a < e):
                    taken.add(x)
        parts.append(t[last:])
        out = []
        for (a, b, x) in ow:
            pieces = [(a, b)]
            for (s, e, r) in ms:
                np_ = []
                for (u, v) in pieces:
                    if v <= s or u >= e:
                        np_.append((u, v))
                    else:
                        if u < s:
                            np_.append((u, s))
                        if v > e:
                            np_.append((e, v))
                pieces = np_
            for (u, v) in pieces:
                d = sum(len(r) - (e - s) for (s, e, r) in ms if e <= u)
                out.append((u + d, v + d, x))
        cons += [(yi, x) for x in sorted(taken)]
        cores[yi] = cs
        owners[p['target']] = sorted(out + newregs)
        cur[p['target']] = ''.join(parts)
    return {'texts': cur, 'bad': bad, 'cons': cons, 'cores': cores, 'snaps': snaps}


def _splice(t, ms):
    last = 0
    for (s, e, r) in ms:
        yield t[last:s]
        yield r
        last = e
    yield t[last:]


def audit(cfg, texts, train, declared, log, deep=True):
    """Audit one train of trains.json.  Returns a dict of counts and findings (findings are strings)."""
    found = patches.load_groups(os.path.join(T0, 'patches'), cfg, train)
    bundle, _pages = patches.select_groups(found, cfg, train)
    return analyse(texts, sequence(found, bundle), train, declared, log, deep)


def analyse(texts, seq, train, declared, log, deep=True):
    """The audit proper, on a list of bundle patches in application order (dicts with id, target, find, repl, expect, regex, _group)."""
    res = {'train': train, 'patches': len(seq), 'anchor_failures': [], 'unexplained': [], 'undeclared': [], 'declared_used': [],
           'consumptions': 0, 'verbatim': 0, 'chained': 0, 'effective': 0, 'dead': 0}
    base = replay(texts, seq, track=True)
    if base['bad']:
        res['anchor_failures'] = ['%s [%s]: found %d, expect %d' % (seq[i]['id'], seq[i]['_group'], n, seq[i]['expect']) for i, n in base['bad']]
        return res
    final, cons, cores = base['texts'], base['cons'], base['cores']
    res['consumptions'] = len(cons)
    # C. an anchor that is not in the pristine bundle (or not exactly `expect` times) has a reason: it consumes an earlier patch's output (it was written against it), or an
    #    earlier patch took one of its pristine occurrences (a11:G-close-mobile: four in the pristine bundle, group C rewrites one first, the row expects three)
    consumers = {y for (y, _x) in cons}
    pspans = [[(sp[0], sp[1]) for sp in matches(texts[p['target']], p)] for p in seq]
    for yi, p in enumerate(seq):
        n = len(pspans[yi])
        if n == p['expect'] or yi in consumers:
            continue
        took = any(seq[xi]['target'] == p['target'] and any(a < e and s < b for (a, b) in pspans[xi] for (s, e) in pspans[yi]) for xi in range(yi))
        if not took:
            res['unexplained'].append('%s [%s]: %d in the pristine bundle, expect %d, and no earlier patch consumed or took an occurrence' % (p['id'], p['_group'], n, p['expect']))
    if not deep:
        log('%-5s %4d bundle patches, %3d consumptions (anchors only)' % (train, len(seq), len(cons)))
        return res
    # B. every patch whose work a later patch covered: is it still in the bundle?
    victims = sorted({x for (_y, x) in cons})
    cand = []
    for x in victims:
        tgt = seq[x]['target']
        if cores[x] and all(c in final[tgt] for c in cores[x] if c):
            res['verbatim'] += 1                      # what it wrote is in the bundle word for word
        else:
            cand.append(x)
    snaps = replay(texts, seq, snapshots=set(cand))['snaps'] if cand else {}
    for x in cand:
        r = replay(snaps[x], seq, start=x + 1)           # the rest of the build without x
        if r['bad']:
            res['chained'] += 1                       # a later patch needs x's output: removing x fails loudly
        elif r['texts'] == final:
            res['dead'] += 1                          # the bundle is the same without x: its work was overwritten
            by = sorted({seq[y]['id'] for (y, xx) in cons if xx == x})
            if seq[x]['id'] in declared:
                res['declared_used'].append(seq[x]['id'])
            else:
                res['undeclared'].append('%s [%s] has no effect on the bundle (overwritten by %s): declare it in tools/t0/overlap-declared.json or drop it'
                                         % (seq[x]['id'], seq[x]['_group'], ', '.join(by)))
        else:
            res['effective'] += 1                     # a later patch rewrote part of it; the rest is still in the bundle
    log('%-5s %4d bundle patches, %3d consumptions of %2d earlier patches: %2d verbatim in the bundle, %2d needed by a later anchor, %2d changed and still in effect, %d overwritten (%d declared)'
        % (train, len(seq), len(cons), len(victims), res['verbatim'], res['chained'], res['effective'], res['dead'], len(res['declared_used'])))
    return res


def pristine_geometry(cfg, texts, train='R1g'):
    """the old report: spans of every find in the PRISTINE bundle and their intersections (information only)"""
    found = patches.load_groups(os.path.join(T0, 'patches'), cfg, train)
    bundle, _ = patches.select_groups(found, cfg, train)
    spans = []
    for p in sequence(found, bundle):
        spans += [(p['target'], s, e, p['_group'], p['id']) for s, e, _r in matches(texts[p['target']], p)]
    spans.sort()
    n = 0
    for i, a in enumerate(spans):
        for b in spans[i + 1:]:
            if b[0] != a[0] or b[1] >= a[2]:
                break
            if (a[3], a[4]) != (b[3], b[4]):
                n += 1
    return len(spans), n


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    for _st in (sys.stdout, sys.stderr):      # patch ids / paths may hold non-ASCII text; never die on a cp1252 console
        try:
            _st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    cfg = load_json(os.path.join(T0, 'trains.json'))
    trains = [argv[i + 1] for i, a in enumerate(argv[:-1]) if a == '--train'] or list(cfg['train_order'])
    report = next((argv[i + 1] for i, a in enumerate(argv[:-1]) if a == '--report'), None)
    decl_doc = load_json(DECLARED) if os.path.exists(DECLARED) else {'declared': []}
    declared = {d['patch']: d for d in decl_doc['declared']}
    texts = load_texts(cfg)
    out = []
    # the deep part (the build without each covered patch, about a minute per train) runs for the newest train, or for every train with --deep; the older trains are frozen
    # (rebuilt byte for byte by static.determinism) and have their anchors replayed here, with the consumptions counted
    results = [audit(cfg, texts, t, declared, out.append, deep=(t == cfg['train_order'][-1]) or '--deep' in argv) for t in trains]
    for line in out:
        print(line)
    if '--pristine' in argv:
        n_spans, n_ov = pristine_geometry(cfg, texts, trains[-1])
        print('pristine geometry (information only, %s): %d spans, %d intersecting pairs' % (trains[-1], n_spans, n_ov))
    problems = []
    for r in results:
        problems += ['%s: anchor failure: %s' % (r['train'], m) for m in r['anchor_failures']]
        problems += ['%s: unexplained anchor: %s' % (r['train'], m) for m in r['unexplained']]
        problems += ['%s: undeclared overwrite: %s' % (r['train'], m) for m in r['undeclared']]
    used = {k for r in results for k in r['declared_used']}
    if trains[-1] == cfg['train_order'][-1] or '--deep' in argv:
        problems += ['overlap-declared.json declares %s, which no train overwrites any more: remove the entry' % k for k in declared if k not in used]
    print('declared overwrites in use: %d of %d (tools/t0/overlap-declared.json)' % (len(used), len(declared)))
    for m in problems:
        print('FAIL ' + m)
    print('overlap audit: %s (%d trains, %d problems)' % ('FAIL' if problems else 'PASS', len(results), len(problems)))
    if report:
        with open(report, 'w', encoding='utf-8') as f:
            json.dump({'results': results, 'problems': problems}, f, indent=1)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
