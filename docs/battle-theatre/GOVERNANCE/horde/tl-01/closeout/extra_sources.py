"""Sources added to the builder in the fourth start of the close-out (2026-11-15): texts that another workstream saved after the
earlier passes of this shard had searched the local library. Imported by build.py; nothing here is read from the network.

  HISTORY-ADAMS-1886  History of Cumberland and Adams Counties, Pennsylvania (Warner, Beers and Co., Chicago 1886), Adams County part
  HOKE-1887           J. Hoke, The Great Invasion of 1863; or, General Lee in Pennsylvania (Dayton, Ohio 1887)
                      both acquired 2026-11-14 by the town workstream from archive.org, sha256 in docs/battle-theatre/town/SOURCES.md
  CA-<lccn>-<date>-p<n>  one page of a newspaper of 1863 (Library of Congress, Chronicling America) as saved by the web-evidence
                      workstream under tmp/library/web/ca/pages/<lccn>/<date>/ed-1/seq-<n>.txt (OCR text layer of the page image)

A later published book is a published source and is never a "lead", but it is not an eyewitness account and not a report of the time:
a sub-claim that rests on it alone is tier "inferred" (DD-TL01-11); where it agrees with an 1863 source it is a further citation."""
import os, re, hashlib

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', '..', '..'))

BOOKS = {
    'HISTORY-ADAMS-1886': dict(
        path='tmp/library/town/HISTORY-ADAMS-1886/cu31924028852619_djvu.txt',
        sha256='76c101c0575eab9d7d4a45ca46787244b97d848deef8449509eb835cd9289ab1',
        title='History of Cumberland and Adams Counties, Pennsylvania (Warner, Beers and Co., Chicago 1886), Adams County part',
        date='1886', archive_identifier='cu31924028852619', index='docs/battle-theatre/town/SOURCES.md'),
    'HOKE-1887': dict(
        path='tmp/library/town/HOKE-1887/greatinvasionof102hoke_djvu.txt',
        sha256='e4692cd1734125b48c1d1effb3654e3f0155ede4a19a06d4d3898b1ba56a74d7',
        title='J. Hoke, The Great Invasion of 1863; or, General Lee in Pennsylvania (Dayton, Ohio 1887)',
        date='1887', archive_identifier='greatinvasionof102hoke', index='docs/battle-theatre/town/SOURCES.md'),
}

# LCCN -> title as printed by the Library of Congress (from the saved search results of the web-evidence workstream)
PAPERS = {
    'sn83045462': 'Evening Star (Washington, D.C.)',
    'sn83021205': 'Worcester Daily Spy (Worcester, Mass.)',
    'sn83030213': 'New-York Daily Tribune',
    'sn83030313': 'The New York Herald',
    'sn84031490': 'Chicago Daily Tribune',
    'sn83020847': 'Springfield Weekly Republican',
    'sn86059058': 'The Daily Evansville Journal',
    'sn82014306': 'Indiana State Sentinel (Indianapolis)',
    'sn83026172': 'Daily National Intelligencer (Washington City)',
    'sn84027060': 'The Burlington Weekly Hawk-Eye',
    'sn83045784': 'Weekly National Intelligencer',
    'sn83032312': 'Monmouth Herald and Inquirer (Freehold, N.J.)',
    'sn83032103': 'West-Jersey Pioneer (Bridgeton, N.J.)',
    # added in the fifth start (2026-11-16): pages saved by the web-evidence workstream after the fourth start had searched
    'sn83016025': 'The Portland Daily Press (Portland, Me.)',
    'sn84024669': 'Richmond Whig (Richmond, Va.)',
    'sn84024735': 'Richmond Enquirer (Richmond, Va.)',
}
CA_RX = re.compile(r'^CA-(sn\d{8})-(\d{4}-\d\d-\d\d)-p(\d+)$')

def ca_path(sid):
    m = CA_RX.match(sid)
    return 'tmp/library/web/ca/pages/%s/%s/ed-1/seq-%s.txt' % (m.group(1), m.group(2), m.group(3))

def register(LIB, FIXED_PAGE, LABEL, sources):
    """add the book entries and every CA page named in `sources` (ids used by the row data) to the builder's tables"""
    for sid, b in BOOKS.items():
        LIB[sid] = dict(path=b['path'], sha256=b['sha256'], title=b['title'], date=b['date'],
                        archive_identifier=b['archive_identifier'], index=b['index'])
        LABEL[sid] = b['title']
    for sid in sources:
        m = CA_RX.match(sid)
        if not m: continue
        lccn, date, seq = m.groups()
        p = os.path.join(ROOT, ca_path(sid))
        sha = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        title = PAPERS[lccn]
        d = '%s %d, %s' % (['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][int(date[5:7])], int(date[8:10]), date[:4])
        LIB[sid] = dict(path=ca_path(sid), sha256=sha, title='%s, %s, page %s' % (title, d, seq), date=date, archive_identifier=None,
                        index='tmp/library/web/ca (Chronicling America pages saved by the web-evidence workstream; LCCN %s)' % lccn)
        LABEL[sid] = '%s, %s, page %s (Library of Congress, Chronicling America; OCR text layer)' % (title, d, seq)
        FIXED_PAGE[sid] = (seq, 'page %s of the issue (image sequence %s of Chronicling America, LCCN %s, %s)' % (seq, seq, lccn, date))
