#!/usr/bin/env python3
"""Self-test of tools/t0/overlap.py: the audit must be able to fail.

    python tools/t0/tests/overlap_selftest.py

Five synthetic patch sets on a 4-word bundle:
  1 chained       Y is written against X's output: no problem, counted as needed by a later anchor
  2 refine        Y edits inside X's output and X's text stays: no problem
  3 dead          Y matches with or without X and overwrites everything X wrote: undeclared -> problem; declared -> none; declared but not overwritten -> (checked by main)
  4 anchor        a patch whose find occurs a different number of times than `expect`: anchor failure
  5 dead, order   the same pair with the two patches swapped is not an overwrite (X then has an effect): no problem
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import overlap  # noqa: E402

TEXTS = {'js': 'alpha beta gamma delta', 'help': '', 'book': '', 'css': ''}


def P(i, find, repl, expect=1, regex=False):
    return {'id': i, 'target': 'js', 'find': find, 'repl': repl, 'expect': expect, 'regex': regex, '_group': 'T'}


def run(seq, declared=()):
    out = []
    return overlap.analyse(TEXTS, seq, 'T', {d: {} for d in declared}, out.append)


def main():
    n = 0
    # 1 chained
    r = run([P('x', 'beta', 'beta2'), P('y', 'beta2', 'beta3')])
    assert not (r['anchor_failures'] or r['unexplained'] or r['undeclared']) and r['chained'] == 1 and r['dead'] == 0, r; n += 1
    # 2 refine: Y inserts inside X's text, X's words stay
    r = run([P('x', 'gamma', 'gamma and more words here'), P('y', 'and more', 'and some more')])
    assert not (r['anchor_failures'] or r['unexplained'] or r['undeclared']) and r['dead'] == 0, r; n += 1
    # 3 dead: Y is a regex over the whole word and does not need X
    dead = [P('x', 'delta', 'delta extra'), P('y', r'delta( extra)?', 'delta final', regex=True)]
    r = run(dead)
    assert r['dead'] == 1 and len(r['undeclared']) == 1 and 'x [T]' in r['undeclared'][0], r; n += 1
    r = run(dead, declared=['x'])
    assert r['dead'] == 1 and not r['undeclared'] and r['declared_used'] == ['x'], r; n += 1
    # 4 anchor failure: two occurrences expected, one present
    r = run([P('z', 'alpha', 'ALPHA', expect=2)])
    assert r['anchor_failures'] and 'z [T]' in r['anchor_failures'][0], r; n += 1
    # 5 swapped: y first (writes the final wording over the plain word), x later matches the final wording: x is not overwritten
    r = run([P('y', r'delta( extra)?', 'delta final', regex=True), P('x', 'delta final', 'delta final extra')])
    assert not (r['anchor_failures'] or r['unexplained'] or r['undeclared']) and r['dead'] == 0, r; n += 1
    print('PASS overlap_selftest: %d cases' % n)
    return 0


if __name__ == '__main__':
    sys.exit(main())
