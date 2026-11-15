"""crop.py LCCN DATE SEQ PHRASE [OUT]  -> fetch (1 request) an IIIF crop of the page image around the first occurrence of PHRASE (matched on ALTO words)
reads the local ALTO file; the IIIF id comes from the saved LoC search results (tmp/library/web/ca/search/*.json)"""
import sys, re, os, gzip, json, glob, subprocess, time
import xml.etree.ElementTree as ET
ROOT = '/home/user/cautious-chainsaw'
lccn, date, seq, phrase = sys.argv[1:5]
out = sys.argv[5] if len(sys.argv) > 5 else '/home/user/cautious-chainsaw/tmp/tl-01/run3/crops/%s_%s_%s.jpg' % (lccn, date, seq)
os.makedirs(os.path.dirname(out), exist_ok=True)
alto = ROOT + '/tmp/library/web/ca/pages/%s/%s/ed-1/seq-%s.alto.xml.gz' % (lccn, date, seq)
root = ET.fromstring(gzip.open(alto).read())
ns = {'a': root.tag.split('}')[0].strip('{')}
words = []
for s in root.iter('{%s}String' % ns['a']):
    c = s.get('CONTENT') or ''
    words.append((c, int(float(s.get('HPOS', 0))), int(float(s.get('VPOS', 0))), int(float(s.get('WIDTH', 0))), int(float(s.get('HEIGHT', 0)))))
page = root.find('.//a:Page', ns)
pw, ph = int(float(page.get('WIDTH'))), int(float(page.get('HEIGHT')))
toks = phrase.split()
def norm(w): return re.sub(r'\W', '', w).lower()
nt = [norm(t) for t in toks]
hit = None
for i in range(len(words)):
    if all(i + j < len(words) and norm(words[i + j][0]) == nt[j] for j in range(len(nt))):
        hit = (i, i + len(nt)); break
if not hit:
    print('phrase not found in ALTO words'); sys.exit(1)
ws = words[hit[0]:hit[1]]
x0 = min(w[1] for w in ws); y0 = min(w[2] for w in ws); x1 = max(w[1] + w[3] for w in ws); y1 = max(w[2] + w[4] for w in ws)
pad = int(os.environ.get("PAD", "60"))
x0 = max(0, x0 - pad); y0 = max(0, y0 - 2 * pad); x1 = min(pw, x1 + pad); y1 = min(ph, y1 + 2 * pad)
# the IIIF id
base = None
want = '/%s/%s/ed-1/?sp=%s' % (lccn, date, seq)
for f in glob.glob(ROOT + '/tmp/library/web/ca/search/*.json'):
    d = json.load(open(f))
    for r in d.get('results', []):
        if (r.get('id') or '').endswith(want) or want in (r.get('id') or ''):
            for u in r.get('image_url', []):
                m = re.match(r'(https://tile\.loc\.gov/image-services/iiif/[^/]+)/full/', u)
                if m: base = m.group(1); break
        if base: break
    if base: break
print('page', pw, ph, 'region', x0, y0, x1 - x0, y1 - y0, 'base', base)
if not base: sys.exit(2)
env = dict(os.environ)
info_cache = ROOT + '/tmp/tl-01/run3/crops/info_' + re.sub(r'\W', '_', base[-60:]) + '.json'
if os.path.exists(info_cache):
    info = json.load(open(info_cache))
else:
    r0 = subprocess.run(['curl', '-sS', '-m', '60', base + '/info.json'], capture_output=True, text=True, env=env)
    info = json.loads(r0.stdout); json.dump(info, open(info_cache, 'w'))
iw, ih = int(info['width']), int(info['height'])
fx, fy = iw / pw, ih / ph
print('image', iw, ih, 'scale', round(fx, 4), round(fy, 4))
X0, Y0, X1, Y1 = int(x0 * fx), int(y0 * fy), int(x1 * fx), int(y1 * fy)
url = '%s/%d,%d,%d,%d/full/0/default.jpg' % (base, X0, Y0, X1 - X0, Y1 - Y0)
print('URL', url)
if os.environ.get('DRY'): sys.exit(0)
time.sleep(1.1)
r = subprocess.run(['curl', '-sS', '-m', '60', '-o', out, '-w', '%{http_code} %{size_download}', url], capture_output=True, text=True, env=env)
print(r.stdout, r.stderr[:200], out)
