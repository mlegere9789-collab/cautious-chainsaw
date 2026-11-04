"""Round 1 downloads for family MW (Internet Archive items verified not access-restricted in ia_audit.json)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import mwfetch

D = 'https://archive.org/download/'
items = [
    ('minnesotacivil01minnrich', 'minnesotacivil01minnrich_djvu.txt', 'MN-CIVILINDIAN-1890-v1'),
    ('historyoftwentyf00curt', 'historyoftwentyf00curt_djvu.txt', 'MI24-CURTIS-1891'),
    ('recordofserviceo03mich', 'recordofserviceo03mich_djvu.txt', 'MI-ROS-v3'),
    ('reportofadjutantv6illi', 'reportofadjutantv6illi_djvu.txt', 'IL-AGR-1900-v6'),
    ('reportofadjutantv8illi', 'reportofadjutantv8illi_djvu.txt', 'IL-AGR-1900-v8'),
    ('reportofadjutant02indi', 'reportofadjutant02indi_djvu.txt', 'IN-AGR-v2'),
    ('reportofadjutant03indi', 'reportofadjutant03indi_djvu.txt', 'IN-AGR-v3'),
    ('reportindiana04dougrich', 'reportindiana04dougrich_djvu.txt', 'IN-AGR-v4'),
    ('reportindiana05dougrich', 'reportindiana05dougrich_djvu.txt', 'IN-AGR-v5'),
    ('reportindiana06dougrich', 'reportindiana06dougrich_djvu.txt', 'IN-AGR-v6'),
    ('reportindiana07dougrich', 'reportindiana07dougrich_djvu.txt', 'IN-AGR-v7'),
    ('rosterofwisconsi02wisc', 'rosterofwisconsi02wisc_djvu.xml', 'WI-ROSTER-1886-v2'),
]
for ident, fn, sid in items:
    mwfetch.fetch(D + ident + '/' + fn, fn, sid)
print('round1 done; total bytes', mwfetch.total_bytes())
