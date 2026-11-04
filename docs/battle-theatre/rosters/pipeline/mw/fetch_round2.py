"""Round 2 downloads for family MW (Internet Archive items; each verified not access-restricted in ia_audit.json)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import mwfetch

D = 'https://archive.org/download/'
items = [
    ('reportindiana04dougrich', 'reportindiana04dougrich_djvu.xml', 'IN-AGR-v4'),
    ('reportindiana05dougrich', 'reportindiana05dougrich_djvu.xml', 'IN-AGR-v5'),
    ('reportofadjutant02indi', 'reportofadjutant02indi_djvu.xml', 'IN-AGR-v2'),
    ('reportofadjutantv5illi', 'reportofadjutantv5illi_djvu.txt', 'IL-AGR-1900-v5'),
    ('reportofadjutantv5illi', 'reportofadjutantv5illi_djvu.xml', 'IL-AGR-1900-v5'),
    ('reportofadjutantv8illi', 'reportofadjutantv8illi_djvu.xml', 'IL-AGR-1900-v8'),
    ('servicerecordmich00browrich', 'servicerecordmich00browrich_djvu.txt', 'MI-ROS-brown'),
    ('historicalsketch00isha', 'historicalsketch00isha_djvu.txt', 'MI7CAV-ISHAM-1893'),
    ('cu31924030907236', 'cu31924030907236_djvu.txt', 'MI4-BARRETT-1888'),
    ('rosterofsurvivor00mich', 'rosterofsurvivor00mich_djvu.txt', 'MI16-SURVIVORS-1895'),
]
for ident, fn, sid in items:
    mwfetch.fetch(D + ident + '/' + fn, fn, sid)
print('round2 done; total bytes', mwfetch.total_bytes())
