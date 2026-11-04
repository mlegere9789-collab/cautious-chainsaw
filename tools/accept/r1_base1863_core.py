#!/usr/bin/env python3
"""Regenerate tools/t0/patches-next/BASE1863.json from tools/t0/base1863/gtb63.js (node tools/t0/base1863/build-base1863.mjs) and keep ONLY the patches Release 1 uses:
the bundle patches of the reconstruction base (target js) except the Walkthrough / Street View / Soldier's Eye ones, plus B63:page-index-copy.  The dropped patches (Virtual Walkthrough map,
Street View embed removal, Soldier's Eye View removal, seven sub-pages, compare) wait for an owner decision (see docs/accept/R1-STATUS.md).
    python tools/accept/r1_base1863_core.py
"""
import json, os, subprocess, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
subprocess.run(['node', os.path.join(REPO, 'tools', 't0', 'base1863', 'build-base1863.mjs')], cwd=REPO, check=True, stdout=subprocess.DEVNULL)
p = os.path.join(REPO, 'tools', 't0', 'patches-next', 'BASE1863.json')
raw = open(p, encoding='utf-8', newline='').read()
g = json.loads(raw)
keep = [x for x in g['patches'] if x['id'] == 'B63:page-index-copy' or (x['target'] == 'js' and not x['id'].startswith(('B63:walkthrough', 'B63:streetview', 'B63:soldiers-eye')))]
g['patches'] = keep
g['description'] += (" [Release 1 integration 2026-10-20: the generator at HEAD also emits patches that move the Virtual Walkthrough map and seven sub-pages to the reconstruction and REMOVE the Street View embed and the Soldier's Eye View"
                     " (B63:walkthrough-style, streetview-embed, soldiers-eye-*, page-*); those are left out of this file pending an owner decision (standing rule: do not break the Virtual Walkthrough; no feature is dropped without the owner).]")
open(p, 'w', encoding='utf-8', newline='').write(json.dumps(g, indent=1, ensure_ascii=False) + ('\n' if raw.endswith('\n') else ''))
print('BASE1863.json: %d patches kept' % len(keep))
