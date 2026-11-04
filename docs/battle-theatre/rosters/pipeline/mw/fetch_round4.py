"""Round 4 downloads for family MW: Michigan 3rd Infantry page coordinates, Lee 7th Michigan Cavalry retry, Official Army Register parts."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import mwfetch

D = 'https://archive.org/download/'
items = [
    ('recordofserviceo03mich', 'recordofserviceo03mich_djvu.xml', 'MI-ROS-v3'),
    ('personalhistoric00leew', 'personalhistoric00leew_djvu.txt', 'MI7CAV-LEE-1902'),
    ('cu31924092911118', 'cu31924092911118_djvu.txt', 'OAR-1865-part5'),
    ('cu31924092911126', 'cu31924092911126_djvu.txt', 'OAR-1865-part6'),
    ('cu31924092911100', 'cu31924092911100_djvu.txt', 'OAR-1865-part4'),
    ('cu31924092911134', 'cu31924092911134_djvu.txt', 'OAR-1865-part7'),
]
for ident, fn, sid in items:
    mwfetch.fetch(D + ident + '/' + fn, fn, sid)
print('round4 done; total bytes', mwfetch.total_bytes())
