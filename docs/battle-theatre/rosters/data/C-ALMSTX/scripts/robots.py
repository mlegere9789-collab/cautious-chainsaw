import sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
import iahelp as h
for host in ['https://archives.alabama.gov', 'https://www.mdah.ms.gov', 'https://sos.tn.gov', 'https://www.tsl.texas.gov', 'https://www.floridamemory.com', 'https://digitalheritage.arkansas.gov']:
    p = h.fetch(host + '/robots.txt', host.split('//')[1] + '_robots.txt', 'robots.txt only (terms check); no other request to this host')
    print(host, p)
    if p:
        print(open(p, encoding='utf-8', errors='replace').read()[:700].replace('\n', ' | '))
