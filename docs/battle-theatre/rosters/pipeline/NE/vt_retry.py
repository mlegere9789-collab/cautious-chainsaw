import sys, time
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f
i = 'cu31924080774148'
for k in range(12):
    p = f.get('https://archive.org/download/%s/%s_djvu.txt' % (i, i), i + '_djvu.txt', maxbytes=80 << 20)
    print(k, p, flush=True)
    if p:
        break
    time.sleep(240)
