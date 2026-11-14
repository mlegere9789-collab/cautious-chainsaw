import json, subprocess, sys, time, os
OUT = '/home/user/cautious-chainsaw/tmp/fence-3/web/chronam'
os.makedirs(OUT, exist_ok=True)
def curl(url, dest):
    r = subprocess.run(['curl', '-sS', '-m', '60', '-o', dest, '-w', '%{http_code} %{size_download}', '-H', 'Accept: application/json', url], capture_output=True, text=True)
    time.sleep(1.1)
    return r.stdout.strip()
paper, lccn = sys.argv[1], sys.argv[2]
dates = sys.argv[3].split(',')
pages = [int(x) for x in sys.argv[4].split(',')]
log = []
for dt in dates:
    for sp in pages:
        jp = '%s/%s_%s_sp%d.json' % (OUT, paper, dt, sp)
        st = curl('https://www.loc.gov/resource/%s/%s/ed-1/?sp=%d&fo=json' % (lccn, dt, sp), jp)
        line = '%s %s sp%d json %s' % (paper, dt, sp, st)
        try:
            d = json.load(open(jp, encoding='utf-8'))
            ft = d['resource']['fulltext_file']
        except Exception as e:
            print(line, 'NO fulltext (%s)' % type(e).__name__)
            continue
        tp = '%s/%s_%s_sp%d.txt' % (OUT, paper, dt, sp)
        st2 = curl(ft, tp)
        print(line, '| text', st2)
