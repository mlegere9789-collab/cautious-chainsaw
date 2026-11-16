"""Round-3 patches for fence-3, part 2 (2026-11-16): the Indianapolis reprint of the prayer, the page-image reading of the Chicago Tribune digits, and the negative newspaper searches."""
import sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from r3lib import P3, NPSX  # noqa
from r2_b import CA  # noqa

PATCHES = {}


def patch(sid):
    def deco(fn):
        PATCHES[sid] = fn
        return fn
    return deco


@patch('S-085')
def S085(d):
    p = P3(d)
    c = p.cite(CA('sn82015683/1863-11-24/ed-1/seq-2', 'the trees a:e not dead though their foliage', 'i gone',
                  note='Daily State Sentinel (Indianapolis), 24 Nov 1863, page 2: a reprint of the Chaplain\'s prayer at the dedication. The OCR is garbled ("a:e" for are, "i gone" for is gone; the line continues "so our heroes te T.tl(-i\'l though their forms are fallen"); '
                       'the page was not checked on an image, so the garbled words are not carried as a quotation of the prayer, only as the second newspaper that prints it.'))
    p.edit(2, add_cites=[c], why=p.sc(2)['why'] + ' Round 3: the Indianapolis Daily State Sentinel of 24 Nov 1863 (local page text, garbled OCR) is now cited for the second newspaper that prints the prayer; before it was named without a citation.')
    p.rev('Round 3: the Indianapolis Daily State Sentinel of 24 Nov 1863 (garbled OCR of the prayer line) is now cited; the claim named it before without a citation.')
    return p.finish()


@patch('S-087')
def S087(d):
    p = P3(d)
    cid = None
    for k, c in p.d['citations'].items():
        if c['quote'].startswith('The number assembled was between'):
            cid = k
    assert cid, 'Chicago Tribune citation not found'
    p.image_reading(cid, 'between 39,009 find 50,000', 'between 30,000 and 50,000', 'the first number: 30,000 (the text layer reads 39,009)',
                    'crop of the page image of the Chicago Daily Tribune, 21 Nov 1863, page 1 (Library of Congress, Chronicling America, IIIF image service of the page), saved by the round-2 pass as tmp/fence-3/img/sn84031490_1863-11-21_ed-1_seq-1.assembled.jpg; '
                    'viewed again 2026-11-16: the print reads "The number assembled was between 30,000 and 50,000".',
                    ['tmp/fence-3/img/sn84031490_1863-11-21_ed-1_seq-1.assembled.jpg'])
    p.rev('Round 3: the page image of the Chicago Daily Tribune digits (30,000 and 50,000) is now recorded in the citation as an image reading (the text layer reads 39,009).')
    return p.finish()


@patch('S-088')
def S088(d):
    p = P3(d)
    p.lookup('local Library of Congress newspaper pages (Chronicling America, 601 pages dated 18-25 Nov 1863 from the web-evidence workstream): "torch" and the evening of 18 Nov at Gettysburg', 'tmp/library/web/ca/pages (rg)',
             '"torch" occurs on 12 of the pages; none concerns Gettysburg on 18 Nov 1863 (a Georgia raid, a Christmas-eve procession joke, an Irish poem, a battle report and similar); no torch-lit procession and no drink at Gettysburg', 'failed')
    p.rev('Round 3: "torch" searched in the 601 local newspaper pages of 18-25 Nov 1863: twelve pages, none about Gettysburg; torches and alcohol stay an open gap.')
    return p.finish()


@patch('S-076')
def S076(d):
    p = P3(d)
    p.lookup('local Library of Congress newspaper pages (246 pages dated 6-15 Jul 1863): railroad or trains with Gettysburg together with open, resume, complete, repair, running', 'tmp/library/web/ca/pages (python scan)',
             'six matches, all about the capture of the rebel wagon train on the Hagerstown road (Kilpatrick) or a resort advertisement; no report of the reopening of the Gettysburg railroad', 'failed')
    # the only blocked_host entry of this row is the plan's Wikipedia key (not an admissible source, no URL printed): it is a missing-source note, not a refused host
    old = p.d['blocked_host']
    p.lookup('what would settle the date the line reached the station (read from outside this machine, not a refused host): the U.S. Military Railroads construction corps report (Haupt) and the Gettysburg Railroad company records for July 1863; the plan\'s key Wiki-Station is Wikipedia and is not an admissible source',
             'none local', 'not available locally: ' + '; '.join(b.get('what_to_read', '') for b in old)[:600], 'failed')
    p.blocked([])
    p.rev('Round 3: 246 local newspaper pages of 6-15 Jul 1863 scanned for the reopening of the Gettysburg railroad: nothing; the printed 10 Jul stays unsupported (the first trains reached a temporary terminus on 7 Jul). The row keeps status open: its only "blocked" entry was the plan\'s Wikipedia key (not an admissible source, no URL), now recorded as a lookup note.')
    return p.finish()


@patch('S-058')
def S058(d):
    p = P3(d)
    for sc in p.d['subclaims']:
        for k in ('why', 'claim'):
            if k in sc and 'CLAUDE.md' in sc[k]:
                sc[k] = sc[k].replace('(CLAUDE.md, pre-existing features)', '(the standing project rule on pre-existing features)')
                assert 'CLAUDE.md' not in sc[k]
    p.rev('Round 3: the reference to the project instruction file in S-058.1 was reworded (the file name does not belong in an evidence row); no change to any quotation or claim.')
    return p.finish()


@patch('S-064')
def S064(d):
    p = P3(d)
    c = p.cite(NPSX('NPS-CLR-ROT-V1', 'The Leister House served as the headquarters for Union General George Meade', 'ceased on July 3', raw=True,
                    note='NPS Cultural Landscape Report, Record of Treatment vol. I, printed p.246 (pdf p.272); OCR "fghting" is fighting.'))
    p.edit(2, add_cites=[c], why=p.sc(2)['why'] + ' Round 3: a third NPS document, the Record of Treatment vol. I, states the window as printed: Meade\'s headquarters on 2 and 3 Jul and "used as a hospital after fighting ceased on July 3" (OCR "fghting").')
    p.rev('Round 3: the Record of Treatment vol. I (printed p.246) added to S-064.2: the Leister house "was used as a hospital after fighting ceased on July 3", the window of the printed row.')
    return p.finish()
