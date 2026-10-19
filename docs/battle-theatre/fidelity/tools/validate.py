"""Minimal JSON-Schema (draft 2020-12 subset: type, required, enum, const, pattern, minimum/maximum, minItems/maxItems, items, properties, additionalProperties-as-schema)
validator, because no jsonschema package is installed. Validates the pilot outputs against schema/*.json. usage: python validate.py -> results/validation.json"""
import importlib, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(BASE, 'pilot'))
TY = {'object': dict, 'array': list, 'string': str, 'number': (int, float), 'integer': int, 'boolean': bool, 'null': type(None)}
def check(v, s, path, errs):
    t = s.get('type')
    if t:
        ts = t if isinstance(t, list) else [t]
        ok = any(isinstance(v, TY[x]) and not (x in ('number', 'integer') and isinstance(v, bool)) and not (x == 'integer' and isinstance(v, float)) for x in ts)
        if not ok: errs.append(f'{path}: type {type(v).__name__} not {ts}'); return
    if 'enum' in s and v not in s['enum']: errs.append(f'{path}: {v!r} not in enum')
    if 'const' in s and v != s['const']: errs.append(f'{path}: not const')
    if 'pattern' in s and isinstance(v, str) and not re.search(s['pattern'], v): errs.append(f'{path}: {v!r} !~ {s["pattern"]}')
    if 'minimum' in s and isinstance(v, (int, float)) and v < s['minimum']: errs.append(f'{path}: below minimum')
    if 'maximum' in s and isinstance(v, (int, float)) and v > s['maximum']: errs.append(f'{path}: above maximum')
    if isinstance(v, list):
        if 'minItems' in s and len(v) < s['minItems']: errs.append(f'{path}: fewer than {s["minItems"]} items')
        if 'maxItems' in s and len(v) > s['maxItems']: errs.append(f'{path}: more than {s["maxItems"]} items')
        if 'items' in s:
            for i, x in enumerate(v): check(x, s['items'], f'{path}[{i}]', errs)
    if isinstance(v, dict):
        for k in s.get('required', []):
            if k not in v: errs.append(f'{path}: missing {k}')
        for k, sub in s.get('properties', {}).items():
            if k in v: check(v[k], sub, f'{path}.{k}', errs)
        ap = s.get('additionalProperties')
        if isinstance(ap, dict):
            for k, x in v.items():
                if k not in s.get('properties', {}): check(x, ap, f'{path}.{k}', errs)
def run(schema_file, items, label):
    s = json.load(open(os.path.join(BASE, 'schema', schema_file), encoding='utf-8'))
    errs = []
    for i, it in enumerate(items): check(it, s, f'{label}[{i}]', errs)
    return dict(schema=s['$id'], rows=len(items), errors=len(errs), first_errors=errs[:8])
res = {}
res['unit_minutes_A'] = run('unit-state.schema.json', [json.loads(l) for l in open(os.path.join(BASE, 'pilot', 'unit-minutes.A.jsonl'), encoding='utf-8')], 'row')
res['events_pilot_100'] = run('event.schema.json', [json.loads(l) for l in open(os.path.join(BASE, 'events', 'pilot-100.jsonl'), encoding='utf-8')], 'ev')
res['sources'] = run('source.schema.json', json.load(open(os.path.join(BASE, 'pilot', 'sources.json'), encoding='utf-8'))['sources'], 'src')
D = importlib.import_module('defs_passA')
wps = []
for u, ws in D.WP.items():
    for w in ws:
        w = dict(w); w['pos'] = list(w['pos']); w['rel'] = list(w['rel']) if w['rel'] else None; wps.append(w)
res['waypoints_A'] = run('waypoint.schema.json', wps, 'wp')
# the extra integrity checks that are not schema: one-minute resolution complete, ids unique
rows = [json.loads(l) for l in open(os.path.join(BASE, 'pilot', 'unit-minutes.A.jsonl'), encoding='utf-8')]
res['integrity'] = dict(units=len({r['unit'] for r in rows}), rows=len(rows), expected_rows=len(D.ORDER) * 61, unique_unit_minute=len({(r['unit'], r['minute']) for r in rows}) == len(rows))
ev = [json.loads(l) for l in open(os.path.join(BASE, 'events', 'pilot-100.jsonl'), encoding='utf-8')]
res['integrity']['events_unique_ids'] = len({e['id'] for e in ev}) == len(ev)
json.dump(res, open(os.path.join(BASE, 'results', 'validation.json'), 'w'), indent=1)
print(json.dumps(res, indent=1)[:2500])
sys.exit(1 if any(v.get('errors') for v in res.values() if isinstance(v, dict) and 'errors' in v) else 0)
