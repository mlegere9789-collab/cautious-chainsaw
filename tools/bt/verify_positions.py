"""Independent checks of docs/battle-theatre/history/positions/positions_<SCOPE>.jsonl (the OR position claim ledgers).
usage: python tools/bt/verify_positions.py A [sample=12] [seed=3]
Checks: counts by tier/kind; every unit_id exists in history/units.json; every documented claim has a quote or extract; no quote of 15 words or more;
t_iso only with a printed clock phrase (shape check); a random sample of quotes re-verified by tools/bt/or27_find.py --verify against the cited report id.
Exit 1 on any hard failure."""
import json, os, sys, random, subprocess, collections, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
scope = sys.argv[1]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 12
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 3
cl = [json.loads(l) for l in open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions', 'positions_%s.jsonl' % scope), encoding='utf-8')]
h = json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json'), encoding='utf-8'))
ids = {u['id'] for u in (h if isinstance(h, list) else h['units'])}
fail = []
print('claims', len(cl), dict(collections.Counter(c['tier'] for c in cl)), dict(collections.Counter(c['kind'] for c in cl)))
ids_c = [c['claim_id'] for c in cl]
if len(ids_c) != len(set(ids_c)):
    fail.append('duplicate claim ids')
bad = sorted({c['unit_id'] for c in cl if c['unit_id'] not in ids})
if bad:
    fail.append('unit ids not in units.json: %s' % bad[:10])
src = lambda c: c.get('source') or {}
qs = [c for c in cl if src(c).get('quote')]
long_q = [c['claim_id'] for c in qs if len(src(c)['quote'].split()) >= 15]
if long_q:
    fail.append('quotes of 15 words or more: %s' % long_q[:5])
nodoc = [c['claim_id'] for c in cl if c['tier'] == 'documented' and not (src(c).get('quote') or src(c).get('extract'))]
if nodoc:
    fail.append('documented without quote or extract: %s' % nodoc[:5])
badt = [c['claim_id'] for c in cl if (c.get('when') or {}).get('t_iso') and not re.match(r'^1863-0[67]-\d\dT\d\d:\d\d$', c['when']['t_iso'])]
if badt:
    fail.append('malformed t_iso: %s' % badt[:5])
noclock = [c['claim_id'] for c in cl if (c.get('when') or {}).get('t_iso') and not re.search(r'\d|noon|midnight', (c['when'].get('printed') or ''), re.I)]
if noclock:
    fail.append('t_iso set but the printed phrase has no digit, noon or midnight: %s' % noclock[:5])
# fidelity re-check fields (present when the scope has been re-checked): every claim carries a valid fidelity_check; claim_support_verified only for passed_full_read / corrected;
# a documented claim is never 'downgraded' or 'not_rechecked'; an 'OCR glyph only' time description carries no t_iso
if any('fidelity_check' in c for c in cl):
    FID = {'passed_full_read', 'corrected', 'downgraded', 'not_rechecked'}
    print('fidelity_check', dict(collections.Counter(c.get('fidelity_check') for c in cl)))
    miss = [c['claim_id'] for c in cl if c.get('fidelity_check') not in FID]
    if miss: fail.append('claims without a valid fidelity_check: %s' % miss[:5])
    wrong = [c['claim_id'] for c in cl if bool(c.get('claim_support_verified')) != (c.get('fidelity_check') in ('passed_full_read', 'corrected'))]
    if wrong: fail.append('claim_support_verified disagrees with fidelity_check: %s' % wrong[:5])
    baddoc = [c['claim_id'] for c in cl if c['tier'] == 'documented' and c.get('fidelity_check') not in ('passed_full_read', 'corrected')]
    if baddoc and os.environ.get('POS_PARTIAL'):
        print('PARTIAL: %d documented claims not yet re-checked' % len(baddoc)); baddoc = []
    if baddoc: fail.append('documented claim that is not passed_full_read/corrected: %s' % baddoc[:5])
    ocrt = [c['claim_id'] for c in cl if str((c.get('when') or {}).get('description') or '').startswith('OCR glyph only') and (c['when'].get('t_iso') or not c.get('ocr_uncertain'))]
    if ocrt: fail.append('OCR glyph only time with t_iso or without ocr_uncertain: %s' % ocrt[:5])
    difft = [c['claim_id'] for c in cl if str((c.get('when') or {}).get('description') or '').startswith('time in a different sentence') and c['when'].get('t_iso')]
    if difft: fail.append('time in a different sentence but t_iso still set: %s' % difft[:5])
print('quotes', len(qs), 'weak_source true', sum(1 for c in cl if c.get('weak_source')), 'ocr_uncertain', sum(1 for c in cl if c.get('ocr_uncertain')))
random.seed(seed)
bad_q = 0
for c in random.sample(qs, min(n, len(qs))):
    if src(c).get('volume'):
        # state-volume ledger (scope E): the quote must be found by statevol_find.py in the cited volume, under the cited section id
        out = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'tools', 'bt', 'statevol_find.py'), '--verify', src(c)['quote'], '--vol', src(c)['volume']], capture_output=True, text=True, encoding='utf-8', timeout=40).stdout
        cited = src(c)['section']
    else:
        out = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'tools', 'bt', 'or27_find.py'), '--verify', src(c)['quote']], capture_output=True, text=True, encoding='utf-8', timeout=40).stdout
        cited = src(c)['report_id']
    if cited not in out:
        bad_q += 1
        print('CHECK', c['claim_id'], cited, src(c)['quote'][:60], '|', out[:90].replace('\n', ' '))
print('sampled', min(n, len(qs)), 'not found under the cited report', bad_q)
if bad_q:
    fail.append('%d sampled quotes not verified under their cited report' % bad_q)
for f in fail:
    print('FAIL', f)
print('verify_positions %s: %s' % (scope, 'FAILED' if fail else 'OK'))
sys.exit(1 if fail else 0)
