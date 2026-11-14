"""Row-spec framework for the fence-3 close-out."""
import json, os, sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')

ROWS_IN = {}
for l in open('/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/horde/fence-3/results.jsonl'):
    r = json.loads(l)
    ROWS_IN[r['id']] = r

# plan text (B.8.7) printed row data, from the structures seed
SCHED = {r['id']: r for r in json.load(open('/home/user/cautious-chainsaw/docs/battle-theatre/structures/state_schedule.json'))['rows']}


class Row:
    def __init__(self, sid):
        self.sid = sid                                   # 'S-017'
        self.id = 'R14.' + sid
        old = ROWS_IN[self.id]
        s = SCHED[sid]
        self.d = {
            'id': self.id, 'shard': 'fence-3', 'schedule_id': sid, 'requirement': 'R14',
            'sub_requirement_text': 'State-schedule entry %s changes state at its documented window.' % sid,
            'printed': {'object': s['object_printed'], 'from_state': s['from_state'], 'to_state': s['to_state'], 'time': s['time']['printed'],
                        'trigger': s['trigger'], 'tier_printed': s.get('tier_printed'), 'source_keys': s['source_keys'], 'plan_section': ('PDF B.8.7 pp.100-102' if s.get('section') == 'B.8.7' else 'PDF %s p.118' % s.get('section'))},
            'before': {'verdict': old['verdict'], 'tier': old['tier'], 'status': old['status'], 'fence_relevance': old.get('fence_relevance'),
                       'proposed_register': old.get('register_ref') or None, 'n_subclaims_in_shard': len(old.get('subclaims') or [])},
            'verdict': None, 'status': None, 'corrected_claim': None, 'subclaims': [], 'citations': {}, 'unsupported': [], 'lookups': [],
            'register': [], 'blocked_host': [], 'product_consequence': [], 'changes_from_shard': [],
        }
        self._k = {}

    def cite(self, c, cid=None):
        key = (c['source_id'], c['offset_start'], c['offset_end'])
        if key in self._k:
            return self._k[key]
        cid = cid or 'c%d' % (len(self.d['citations']) + 1)
        c = dict(c)
        c['cid'] = cid
        self.d['citations'][cid] = c
        self._k[key] = cid
        return cid

    def sub(self, kind, claim, tier, cites=(), support='supported', why=None, **extra):
        n = len(self.d['subclaims']) + 1
        sc = {'sc': '%s.%d' % (self.sid, n), 'kind': kind, 'claim': claim, 'tier': tier, 'support': support, 'cites': list(cites)}
        if why:
            sc['why'] = why
        sc.update(extra)
        self.d['subclaims'].append(sc)
        return sc['sc']

    def unsupported(self, text):
        self.d['unsupported'].append(text)

    def lookup(self, query, corpora, result, status='failed'):
        self.d['lookups'].append({'query': query, 'corpora': corpora, 'result': result, 'status': status})

    def finish(self, verdict, status, corrected_claim, register=(), blocked_host=(), product=(), changes=()):
        self.prune()
        self.d['verdict'] = verdict
        self.d['status'] = status
        self.d['corrected_claim'] = corrected_claim
        self.d['register'] = list(register)
        self.d['blocked_host'] = list(blocked_host)
        self.d['product_consequence'] = list(product)
        self.d['changes_from_shard'] = list(changes)
        return self.d

    def prune(self):
        used = []
        for sc in self.d['subclaims']:
            for cid in sc['cites']:
                if cid not in used:
                    used.append(cid)
        # keep first-use order, renumber
        mapping = {cid: 'c%d' % (i + 1) for i, cid in enumerate(used)}
        newc = {}
        for cid in used:
            c = dict(self.d['citations'][cid])
            c['cid'] = mapping[cid]
            newc[mapping[cid]] = c
        for sc in self.d['subclaims']:
            sc['cites'] = [mapping[x] for x in sc['cites']]
        self.d['citations'] = newc
