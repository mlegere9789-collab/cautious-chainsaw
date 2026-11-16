"""Make a stable local copy of a web page that the web workstream fetched (read-only on tmp/library/web/retry), so that a citation can name a
file in this shard's own scratch tree.  python3 -I webcopy.py F-304 NPSWEB-THE-ANGLE [F-305 NPSWEB-COPSE ...]
Copies <fetch dir>/<name>.txt (the workstream's text conversion of the saved html) to tmp/terrain-2/nps/<ID>.txt and records in
tmp/terrain-2/nps/web_registry.json: url, fetch id, fetched_at (UTC, from the workstream's fetch log), http status, sha256 of the saved html and
of the text.  Nothing is fetched here."""
import sys, os, json, hashlib, shutil, glob
ROOT = '/home/user/cautious-chainsaw'
FETCHES = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/ws-web/retry/fetches.jsonl')
OUT = os.path.join(ROOT, 'tmp/terrain-2/nps')
REG = os.path.join(OUT, 'web_registry.json')
os.makedirs(OUT, exist_ok=True)
reg = json.load(open(REG)) if os.path.exists(REG) else {}
fet = {}
for l in open(FETCHES, encoding='utf-8'):
    if l.strip():
        r = json.loads(l); fet[r['fid']] = r
def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()
args = sys.argv[1:]
for fid, new in zip(args[0::2], args[1::2]):
    r = fet[fid]
    if r['http'] != 200 or not r.get('file'):
        raise SystemExit('%s: not a 200 fetch' % fid)
    html = os.path.join(ROOT, r['file'])
    txt = html + '.txt'
    if not os.path.exists(txt):
        raise SystemExit('%s: no text conversion next to the saved page' % fid)
    dst = os.path.join(OUT, new + '.txt')
    shutil.copyfile(txt, dst)
    reg[new] = dict(url=r.get('final_url') or r['asked_url'], fetch_id=fid, fetched_at=r['at'], http=r['http'], html_path=r['file'], html_sha256=sha(html),
                    text_path=os.path.relpath(dst, ROOT), text_sha256=sha(dst), fetched_by='web workstream (horde/ws-web/retry/fetches.jsonl)')
    print(new, '<-', fid, r['at'], r.get('final_url'), os.path.getsize(dst), 'bytes')
json.dump(reg, open(REG, 'w'), indent=1, sort_keys=True)
