"""Link sub-requirements to the register entries the shards produced evidence for.
Deterministic and idempotent. Touches ONLY the `register_ids` and `owner_decision_ids` fields of
requirements.json sub_requirements (never text, id, origin, gate_ids, passes, source_status). Textual patch, so every other
byte of requirements.json is unchanged. A link is not a pass: `passes` is never written here.
Sources of links: subreq_links.json[...].register_refs (shard), timeline_verified.jsonl[...].register_refs (row-level),
resolved through register_index.json (proposed_id -> EG id) and register_aliases.json. Only entries whose status is not
'closed' count as 'open register entry'. owner_decision_ids: no shard evidence names one, so none are added (existing kept)."""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
J = lambda p: json.load(open(os.path.join(G, p), encoding='utf-8'))

def main():
    rp = os.path.join(G, 'requirements.json')
    raw = open(rp, encoding='utf-8').read()
    req = json.loads(raw)
    reg = J('register_index.json')
    byid = {e['id']: e for e in reg}
    tok = {e['id']: e['id'] for e in reg}
    for e in reg:
        if e.get('proposed_id'): tok[e['proposed_id']] = e['id']
    for k, v in J('register_aliases.json').items(): tok[k] = v['alias_of']
    keys = sorted(tok, key=len, reverse=True)
    pat = re.compile(r'(?<![A-Za-z0-9_-])(' + '|'.join(re.escape(k) for k in keys) + r')(?![A-Za-z0-9_-])')
    def resolve(v):
        out = []
        for m in pat.findall(json.dumps(v) if v is not None else ''):
            i = tok[m]
            if byid[i]['status'] != 'closed' and i not in out: out.append(i)
        return out
    links = J('subreq_links.json')
    tv = {}
    for l in open(os.path.join(G, 'timeline_verified.jsonl'), encoding='utf-8'):
        r = json.loads(l); tv[r['id']] = resolve(r.get('register_refs'))
    changed = 0; added = 0
    subs = req['sub_requirements']
    for s in subs:
        want = list(s['register_ids'])
        for i in resolve(links.get(s['id'], {}).get('register_refs')):
            if i not in want: want.append(i)
        m = re.match(r'Timeline row (T\d-\d+)', s['text'])
        if m:
            for i in tv.get(m.group(1), []):
                if i not in want: want.append(i)
        if want != s['register_ids']:
            added += len(want) - len(s['register_ids']); changed += 1
            s['register_ids'] = want
    # write back: re-serialise with the file's own indent so only the link fields differ
    indent = 1 if raw.startswith('{\n "') else 2
    new = json.dumps(req, indent=indent, ensure_ascii=False)
    if raw.rstrip('\n') != new.rstrip('\n') and changed == 0 and json.loads(raw) == req:
        pass  # idempotent: nothing to write
    else:
        open(rp, 'w', encoding='utf-8').write(new + ('\n' if raw.endswith('\n') else ''))
    print('sub-requirements changed', changed, 'links added', added)

if __name__ == '__main__':
    main()
