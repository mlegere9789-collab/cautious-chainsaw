#!/usr/bin/env python3
"""Overlap audit of the de-conflicted patch set against the PRISTINE legacy bundle (chapter 02 section 7: "the 14 overlaps").

    python tools/t0/overlap.py [--with GROUP ...]     (optional groups of trains.json; none exist today)

For every bundle-target patch (js/help/book/css) of every group in the fixed order it lists the spans of its `find` in the pristine
text, reports count mismatches against `expect`, and prints every pair of patches whose spans intersect.  In the shipped set the
overlap list must be empty: the sequential applier (asserted counts on the CURRENT text) already fails loudly on a semantic overlap,
this tool shows the geometric one before anything is built.  Exit 1 when there is an overlap or a pristine-count mismatch, except
that a pristine-count mismatch is expected for patches whose anchor only exists after an earlier patch (listed as "chained").
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from t0build import patches  # noqa: E402
from t0build.util import REPO, T0, load_json, read_text  # noqa: E402


def main():
    for _st in (sys.stdout, sys.stderr):      # patch ids / paths may hold non-ASCII text; never die on a cp1252 console
        try:
            _st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    cfg = load_json(os.path.join(T0, 'trains.json'))
    found = patches.load_groups(os.path.join(T0, 'patches'), cfg)
    with_groups = [sys.argv[i + 1] for i, a in enumerate(sys.argv[:-1]) if a == '--with']
    groups = list(cfg['group_order']) + with_groups
    texts = {'js': read_text(os.path.join(REPO, cfg['legacy']['dir'], cfg['legacy']['entry'])),
             'help': read_text(os.path.join(REPO, cfg['legacy']['dir'], cfg['legacy']['help'])),
             'book': read_text(os.path.join(REPO, cfg['legacy']['dir'], cfg['legacy']['book'])),
             'css': read_text(os.path.join(REPO, cfg['legacy']['dir'], cfg['legacy']['css']))}
    spans, mismatches = [], []
    for g in groups:
        for p in found[g]['patches']:
            if p['target'] not in patches.BUNDLE_TARGETS:
                continue
            text = texts[p['target']]
            if p.get('regex'):
                ms = [(m.start(), m.end()) for m in re.finditer(p['find'], text)]
            else:
                ms, i = [], text.find(p['find'])
                while i != -1:
                    ms.append((i, i + len(p['find'])))
                    i = text.find(p['find'], i + 1)
            if len(ms) != p['expect']:
                mismatches.append((g, p['id'], len(ms), p['expect']))
            spans += [(p['target'], s, e, g, p['id']) for s, e in ms]
    spans.sort()
    known = {(k['a'], k['b']) for k in cfg.get('known_overlaps', [])} | {(k['b'], k['a']) for k in cfg.get('known_overlaps', [])}
    known_ids = {i for k in cfg.get('known_overlaps', []) for i in (k['a'], k['b'])}
    overlaps = []
    for i, a in enumerate(spans):
        for b in spans[i + 1:]:
            if b[0] != a[0] or b[1] >= a[2]:
                break
            if (a[3], a[4]) != (b[3], b[4]):
                overlaps.append((a, b, (a[4], b[4]) in known))
    print('patches with spans: %d, total spans: %d' % (len({(s[3], s[4]) for s in spans}), len(spans)))
    bad_mis = [m for m in mismatches if m[1] not in known_ids]
    print('pristine-count mismatches: %d (%d explained by a known overlap)' % (len(mismatches), len(mismatches) - len(bad_mis)))
    for m in mismatches:
        print('  %s [%s] %s: %d in pristine, expect %d' % ('mismatch' if m in bad_mis else 'known   ', m[0], m[1], m[2], m[3]))
    bad_ov = [o for o in overlaps if not o[2]]
    print('geometric overlaps: %d (%d known and resolved by group order)' % (len(overlaps), len(overlaps) - len(bad_ov)))
    for a, b, ok in overlaps:
        print('  %s [%s] %s  <->  [%s] %s   (%s %d-%d / %d-%d)' % ('known  ' if ok else 'OVERLAP', a[3], a[4], b[3], b[4], a[0], a[1], a[2], b[1], b[2]))
    return 1 if bad_ov or bad_mis else 0


if __name__ == '__main__':
    sys.exit(main())
