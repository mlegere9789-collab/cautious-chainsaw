"""verification: the runners read the verification records of GATE-SPEC-A 1.10 and U-29 and never write one.

A *judgment part* is a part of a gate check that no program decides (the table of 1.10: that a claim equals what its span supports (Q02.3), that a picture shows the mark
(Q23.3, Q23.6), ...). The runner computes every necessary condition that a program can decide, records the judgment part as NOT-RUN with the exact question in `owed`, and the item
cannot be PASS until a valid verification record names it with the verdict `agree`; `disagree` is FAIL and `cannot_confirm` stays NOT-RUN. "Do not self-certify what you have not run"
(p. 136, Q, last paragraph).

The record (`GOVERNANCE/gate_results/verification/<milestone>-<n>.json`, schema `bt-gate-verification/1`, adopted by DD-G24 because the plan gives no format):
    id, milestone, date_utc, context ("fresh"), effort, instructions (the sentence of p. 136, verbatim), inputs [{path, sha256}], items [{item, gate, verdict, evidence, looked_at, note}], findings.
`item` is the id of an item of the gate's record (`Q02/Q02.3/layer.kit_items`) or `<item id>#<member id>` for one member of a class item.

Validity (U-12 "the record is valid while every input hash it names is unchanged"), as read here:
    * schema, `context` fresh, `instructions` equal to the sentence of p. 136 (case, punctuation and spacing folded), at least one input, every item well formed;
    * every DATA input (anything that is not a gate result file) still has the sha256 the record names;
    * a gate result file named as an input (gate_results/Qnn.json) is what the verifier read: its header (run id, times) changes at every run, so its own hash is not compared with the
      next run (DD-G-VER-01); the data files it was made from are what expires the verification;
    * an `agree` needs a non-empty `evidence`; a picture item needs `looked_at: true` besides (U-10).
An invalid record, and an entry that is not well formed, are listed in the record of the gate (`verification`) and never applied.
"""
import json
import os
import re

import pq_common as pq

SENTENCE = 'Run a fresh-context verification subagent for each milestone with instructions to flag only correctness and requirement gaps.'
SCHEMA = 'bt-gate-verification/1'
VERDICTS = ('agree', 'disagree', 'cannot_confirm')
GATE_RESULT = re.compile(r'(^|/)gate_results/[A-Za-z0-9-]+(\.prev)?\.json$')


def _fold(s):
    return re.sub(r'[^a-z0-9]+', ' ', str(s or '').lower()).strip()


class Verifications:
    """All the valid verification records under GOVERNANCE/gate_results/verification/ for one gate."""

    def __init__(self, env, rec, gate, folder=None):
        self.env, self.rec, self.gate = env, rec, gate
        self.folder = folder or os.path.join(env.gov, 'gate_results', 'verification')
        self.records = []              # [{id, file, items}] valid records
        self.invalid = []              # [{file, why}]
        self.dropped_entries = []      # [{record, item, why}]
        self._by_item = {}
        self._read()

    # ------------------------------------------------------------------------------------------------- reading
    def _read(self):
        if not os.path.isdir(self.folder):
            return
        for fn in sorted(os.listdir(self.folder)):
            if not fn.endswith('.json'):
                continue
            path = os.path.join(self.folder, fn)
            self.rec.add_input(path, 'verification record')
            why = self._validate_file(path, fn)
            if why:
                self.invalid.append({'file': fn, 'why': why})

    def _validate_file(self, path, fn):
        try:
            with open(path, encoding='utf-8') as f:
                d = json.load(f)
        except (OSError, ValueError) as e:
            return 'not readable JSON (%s)' % str(e)[:80]
        if not isinstance(d, dict):
            return 'not a JSON object'
        if d.get('schema') != SCHEMA:
            return 'schema is %r, not %r' % (d.get('schema'), SCHEMA)
        for k in ('id', 'milestone', 'date_utc', 'inputs', 'items'):
            if pq.is_placeholder(d.get(k)):
                return 'lacks %s' % k
        if d.get('context') != 'fresh':
            return 'context is %r: a verification is made in a fresh context' % d.get('context')
        if _fold(d.get('instructions')) != _fold(SENTENCE):
            return 'instructions are not the sentence of p. 136 verbatim'
        ins = d.get('inputs')
        if not isinstance(ins, list) or not ins:
            return 'names no input'
        data_inputs = 0
        for i in ins:
            if not isinstance(i, dict) or pq.is_placeholder(i.get('path')) or pq.is_placeholder(i.get('sha256')):
                return 'an input without path and sha256'
            p = str(i['path']).replace('\\', '/')
            if GATE_RESULT.search(p):
                continue
            data_inputs += 1
            ap = os.path.join(self.env.root, *p.split('/'))
            if not os.path.isfile(ap):
                return 'input %s is not on disk' % p
            if pq.sha256_file(ap) != str(i['sha256']).lower():
                return 'input %s changed since the verification (its sha256 differs): the record has expired (U-12)' % p
        if not data_inputs:
            return 'names no data file as input (only gate result files): it certifies nothing that can expire'
        items = d.get('items')
        if not isinstance(items, list):
            return 'items is not a list'
        good = []
        for e in items:
            w = self._check_entry(e)
            if w:
                self.dropped_entries.append({'record': d['id'], 'item': (e or {}).get('item') if isinstance(e, dict) else None, 'why': w})
                continue
            if e.get('gate') != self.gate:
                continue
            good.append(e)
            self._by_item.setdefault(e['item'], []).append(dict(e, record=d['id'], file=fn))
        self.records.append({'id': d['id'], 'file': fn, 'items': len(good), 'milestone': d.get('milestone')})
        return None

    @staticmethod
    def _check_entry(e):
        if not isinstance(e, dict):
            return 'an item that is not an object'
        if pq.is_placeholder(e.get('item')) or pq.is_placeholder(e.get('gate')):
            return 'an item without item and gate'
        if e.get('verdict') not in VERDICTS:
            return 'verdict %r is none of %s' % (e.get('verdict'), ', '.join(VERDICTS))
        if e['verdict'] == 'agree' and pq.is_placeholder(e.get('evidence')):
            return 'an agree without evidence (what was re-read)'
        return None

    # ------------------------------------------------------------------------------------------------- asking
    def entries(self, item_id):
        return list(self._by_item.get(item_id, []))

    def member_entries(self, item_id):
        """{member id: [entries]} for the entries named `<item id>#<member id>`."""
        pre = item_id + '#'
        out = {}
        for k, v in self._by_item.items():
            if k.startswith(pre):
                out.setdefault(k[len(pre):], []).extend(v)
        return out

    def judge(self, item_id, members=None, picture=False):
        """The verification verdict for an item, or for its members: {status, by, disagree[], unverified, verified, note}.
        status: 'disagree' (any entry says so), 'agree' (an item-level agree, or every member of `members` agreed), 'cannot_confirm' (the verifier could not, nothing else decides it) or 'none'.
        A picture item needs `looked_at: true` on an agree (U-10)."""
        def ok_agree(e):
            return e['verdict'] == 'agree' and (not picture or e.get('looked_at') is True)

        item_level = self.entries(item_id)
        mem = self.member_entries(item_id)
        by = sorted({e['record'] for e in item_level} | {e['record'] for v in mem.values() for e in v})
        dis = [e for e in item_level if e['verdict'] == 'disagree'] + [e for v in mem.values() for e in v if e['verdict'] == 'disagree']
        if dis:
            return {'status': 'disagree', 'by': by, 'disagree': sorted({e['item'] for e in dis}), 'note': '; '.join(str(e.get('note') or e.get('evidence'))[:120] for e in dis[:2])}
        if any(ok_agree(e) for e in item_level):
            return {'status': 'agree', 'by': by, 'verified': len(members) if members is not None else None, 'unverified': 0}
        if members:
            agreed = {m for m in members if any(ok_agree(e) for e in mem.get(m, []))}
            if len(agreed) == len(members):
                return {'status': 'agree', 'by': by, 'verified': len(agreed), 'unverified': 0}
            cc = any(e['verdict'] == 'cannot_confirm' for e in item_level) or any(e['verdict'] == 'cannot_confirm' for v in mem.values() for e in v)
            return {'status': 'cannot_confirm' if cc and not agreed else 'none', 'by': by, 'verified': len(agreed), 'unverified': len(members) - len(agreed)}
        if any(e['verdict'] == 'cannot_confirm' for e in item_level):
            return {'status': 'cannot_confirm', 'by': by}
        return {'status': 'none', 'by': by}

    # ------------------------------------------------------------------------------------------------- applying
    def apply_disagreements(self):
        """An independent re-derivation that disagrees with an item, even one the runner found PASS, makes that item FAIL until the defect is fixed (U-29)."""
        n = 0
        for it in self.rec.items:
            es = [e for e in self.entries(it['id']) + [x for v in self.member_entries(it['id']).values() for x in v] if e['verdict'] == 'disagree']
            if not es or it['result'] == 'FAIL':
                continue
            it['evidence'] = dict(it.get('evidence') or {}, verification={'records': sorted({e['record'] for e in es}), 'disagree': sorted({e['item'] for e in es}), 'mechanical_result': it['result']})
            it['reason'] = 'an independent verification disagrees (%s): %s' % (', '.join(sorted({e['record'] for e in es})), '; '.join(str(e.get('note') or e.get('evidence'))[:140] for e in es[:2]))
            it['result'] = 'FAIL'
            it['pass'] = False
            n += 1
        return n

    def summary(self):
        return {'folder': self.env.rel(self.folder), 'records_valid': len(self.records), 'records_invalid': self.invalid, 'entries_dropped': self.dropped_entries[:20],
                'applied_to': self.gate}
