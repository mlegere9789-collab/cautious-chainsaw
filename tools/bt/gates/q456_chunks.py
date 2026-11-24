"""Merge the dumps of a chunked scan (--chunk i/n of q04_arrival.mjs, q05_speed.mjs, q06_path.mjs).

Why: one node process holding the whole S* scan exceeds even an 8 GB heap. Chunk i of n scans the scenarios with index % n == i, every unit and
class as the unchunked scan does; the dumps are merged here, and the merged dump says complete only when all n chunks are present and the unchunked
scan would have been complete. Nothing is sampled: every (unit, behaviour) pair is scanned in the first scenario of some chunk that holds it."""


def merge(dumps):
    n = dumps[0]['scenario_set']['chunk']['n']
    idxs = sorted(d['scenario_set']['chunk']['i'] for d in dumps)
    if idxs != list(range(n)):
        raise ValueError('chunk dumps %s are not all %d chunks' % (idxs, n))
    dumps = sorted(dumps, key=lambda d: d['scenario_set']['chunk']['i'])
    base = dumps[0]
    scans = {}
    for d in dumps:
        for sc in d['scans']:
            old = scans.get(sc['scenario'])
            if old is None or (sc.get('scanned_units') and not old.get('scanned_units')):
                scans[sc['scenario']] = sc
        for uid, byh in d['behaviours'].items():
            for h, rec in byh.items():
                base['behaviours'].setdefault(uid, {}).setdefault(h, rec)
        for f in d.get('inputs_read') or []:
            if f not in base.setdefault('inputs_read', []):
                base['inputs_read'].append(f)
    base['scans'] = [scans[sid] for sid in base['scenarios'] if sid in scans]
    ss = base['scenario_set']
    ss['complete'] = bool(ss['chunk']['complete_if_all'])
    ss['merged_chunks'] = n
    return base
