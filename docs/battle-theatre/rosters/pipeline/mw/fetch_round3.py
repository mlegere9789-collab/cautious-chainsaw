"""Round 3 downloads for family MW."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import mwfetch

D = 'https://archive.org/download/'
items = [
    ('minnesotacivil01minnrich', 'minnesotacivil01minnrich_djvu.xml', 'MN-CIVILINDIAN-1890-v1'),
    ('personalhistoric00leew', 'personalhistoric00leew_djvu.txt', 'MI7CAV-LEE-1902'),
    ('rosterofsurvivor00boie', 'rosterofsurvivor00boie_djvu.txt', 'MI-BOIES-1913'),
    ('michiganinwa00mich', 'michiganinwa00mich_djvu.txt', 'MI-IN-THE-WAR-1882'),
]
for ident, fn, sid in items:
    mwfetch.fetch(D + ident + '/' + fn, fn, sid)
print('round3 done; total bytes', mwfetch.total_bytes())
