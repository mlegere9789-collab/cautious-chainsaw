import sys
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f
ids = ['massachusettssol%d1931mass' % i for i in range(1, 9)] + ['massachusettssol1937mass']
for i in ids:
    p = f.get('https://archive.org/download/%s/%s_djvu.txt' % (i, i), i + '_djvu.txt')
    print(i, p)
