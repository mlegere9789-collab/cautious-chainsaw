#!/usr/bin/env python3
"""Outcome of each retried lookup: automatic rules from the attempts and the evidence lines, plus explicit dispositions for the special rows.

Outcome vocabulary (field `outcome`):
  answered_with_evidence            the retry retrieved a source that states (part of) what was asked; evidence lines carry it (`evidence`, `answer_extent`)
  retrieved                         the asked page or record is now retrieved (HTTP 200) and read; `says` tells what it holds
  retrieved_no_statement            retrieved and read, and it does not state what the lookup needed
  resolved_other_route              the question was answered by another reachable route (catalogue feed, real file name, local tool now installed)
  superseded_by_shard_retry         the shard itself retried successfully later; the old failure is not a failure any more
  still_failed_host_refused         the egress proxy answers 403 to CONNECT for the host (probed again today); not worked around
  still_failed_http_error           the site answered an error code (and no other route exists)
  still_failed_no_source_found      asked again of the reachable full-text indexes (Chronicling America, archive.org, the National Park Service pages, the local corpus): no source states it
  still_failed_local_hits_unread    the local re-run found matches that have not been read by hand yet (a hit is read before it is used): nothing is claimed
  still_failed_retry_not_run        the only retry route (the re-run over the whole local corpus) is queued behind the machine lock and had not run when the file was written
  not_retried_blocked_host_instruction   host with its own bot block (note of 2026-11-13): no request made
  not_requested_robots_disallowed   the host's robots.txt disallows the path or host: no request made
  owner_only                        needs a visit or a request to an archive that is not on a reachable host
"""
import collections, json, re

RE_REFUSED = re.compile(r'CONNECT tunnel failed')


def kind_of(a):
    if a['kind'] == 'url_request':
        if a.get('http') == 200:
            return 'ok'
        if a.get('http') == 0 and RE_REFUSED.search(a.get('error') or ''):
            return 'refused'
        if a.get('http') == 0:
            return 'noanswer'
        return 'httperr'
    return a['kind']


def ev_extent(EV):
    sup = {e.get('support') for e in EV}
    if sup == {'supports_sub_claim'}:
        return 'supports_the_sub_claim'
    if 'conflicts_with_row' in sup:
        return 'conflicts_with_the_row_value_or_adds_a_value (see the lines)'
    return 'supports_in_part'


R_REFUSED = ('the egress proxy answers 403 to CONNECT for this host (probed 2026-11-13 and again 2026-11-16, one request each, {when}); the host is not on the reachable list; '
             'the refusal is recorded and not worked around')
R_DNR = ('the host answers with its own bot protection (HTTP 403 from the site); the note of 2026-11-13 and the task say not to retry it: no request was made')
R_NARA = ('catalog.archives.gov/robots.txt (read 2026-11-13, F-018) is "User-agent: * Disallow: /": no page of the host may be fetched by a program; no request was made; its API needs a key, '
          'which is a credential and is not used')
PENDING_LOCAL = set()   # lookups whose question is in local_rescan.py and has no result yet (filled by assemble.py)
R_PENDING = ('the re-run of the shard\'s own local question over the whole enlarged local corpus (r2/local_rescan.py, 12 questions over the saved texts) was queued behind the machine lock and had not '
             'started when this file was written; nothing was read from it; after it has run, `python3 -I assemble.py` adds its result to this row')
R_JSON = ('the HTML page of loc.gov answers the site\'s challenge page (HTTP 403, not solved or bypassed); the documented JSON interface of the same record (?fo=json, an allowed path) answered 200 and was read')

# ------------------------------------------------------------------------------------------------ explicit dispositions
OVR = {}


def ov(lks, outcome, reason, extra=None):
    for lk in ([lks] if isinstance(lks, str) else lks):
        OVR[lk] = {'outcome': outcome, 'reason': reason}
        if extra:
            OVR[lk].update(extra)


ov(['LKR-sources-a-loc_99448794', 'LKR-sources-a-loc_2004629149'], 'retrieved',
   'the loc.gov JSON record answers 200 (2026-11-13, F-004 / F-005) and was read; the timeouts of 2026-11-04 were transient')
ov('LKR-sources-b-R21.PG.LOC-CHRONAM', 'retrieved', 'the Chronicling America JSON search answered 200 (2026-11-13, F-010, 1.9 MB) and was read; the timeout of 2026-11-04 was transient')
ov(['LKR-sources-b-L1', 'LKR-terrain-2-L3'], 'retrieved', 'archive.org is reachable: /metadata/cu31924077699761 answered 200 (2026-11-13, F-012, 215,834 bytes); the CONNECT 403 of 2026-11-04 no longer occurs')
ov(['LKR-sources-b-L2', 'LKR-terrain-2-L4'], 'retrieved', 'www.nps.gov is reachable: the plants page answered 200 (2026-11-13, F-013); the CONNECT 403 of 2026-11-04 no longer occurs')
ov('LKR-ws-town-L34', 'retrieved', 'the loc.gov JSON item record answers 200 (2026-11-16, F-200, 56,888 bytes): Bachelder, Gettysburg battle-field (1863); the timeout of 2026-11-15 was transient')
ov(['LKR-tl-02-L3', 'LKR-tl-01-L5'], 'retrieved', R_JSON + '; the full text of the same book (Jacobs, Notes on the Rebel Invasion, 1864) was also fetched from tile.loc.gov (F-150) and is in the local ws9 library (archive.org copy)')
ov('LKR-fence-3-L20', 'retrieved', R_JSON + ' (record: Gardner, General Meade\'s Headquarters at Gettysburg, 1863)')
ov(['LKR-sources-b-R21.PG.LOC-2004629149', 'LKR-sources-b-R21.PG.LOC-99446453', 'LKR-sources-b-R12.033.1', 'LKR-sources-b-R12.033.2'], 'retrieved', R_JSON)
ov('LKR-tl-01-L12', 'still_failed_host_refused', 'three items in one row: the Cornell Broadhead diary page (digital.library.cornell.edu) and the HMDB marker are on hosts the egress proxy refuses (CONNECT 403, probed again 2026-11-16); the loc.gov item 02010458 was retrieved through the JSON interface (F-003) and the Jacobs text read')
ov('LKR-terrain-1-W2', 'not_requested_robots_disallowed',
   'www.loc.gov/robots.txt (F-019) disallows /pictures/search, the path of this URL; it was not requested again. The 2026-11-13 retry (F-011) did request it once, in error (answer: 200, 0 results, not used as evidence); the same question belongs on an allowed path (/photos/ or /collections/civil-war-glass-negatives/?q=), where the photo-match catalogue (ws10-photomatch, 127 catalogued photographs) already holds the records')
ov(['LKR-ws-town-L26', 'LKR-ws-town-L28'], 'superseded_by_shard_retry',
   'the shard retried these LOC searches itself and they answered 200 (its lookups.jsonl L29..L32, 2026-11-15); the path /search is disallowed by robots.txt (F-019), so it is not requested again here')
ov('LKR-terrain-1-W3', 'still_failed_http_error', 'the page gett/learn/historyculture/artillery-at-gettysburg.htm answers 404 (2026-11-13, F-014) and is not in the National Park Service sitemaps saved the same day (F-035..F-040); the artillery pages that do exist (Hazlett\'s Battery, Trostle barn and house, Bigelow\'s Battery) were fetched on 2026-11-16 (F-300..F-303)')
ov('LKR-sources-b-R12.029.1', 'still_failed_http_error', 'gis/gisday/gallery2001/GWS/musselman.htm answers 404 (2026-11-13, F-016) and is not in the saved National Park Service sitemaps (F-035..F-040)')
ov('LKR-sources-b-R21.PG.GUTENBERG-SEARCH-FREMANTLE', 'resolved_other_route',
   'robots.txt of gutenberg.org (F-017) disallows /ebooks/search, so the search URL is not requested; the catalogue feed that Gutenberg itself recommends (pg_catalog.csv, F-243, 21,290,329 bytes) lists "Three Months in the Southern States, April-June 1863" (Fremantle) as PG20928; the book is also local in the ws9 library (archive.org copy FREMANTLE-1864)')
ov('LKR-sources-b-R21.PG.GUTENBERG-SEARCH-HASKELL', 'resolved_other_route',
   'search path disallowed by robots.txt (F-017); the catalogue feed (F-243) lists "The Battle of Gettysburg" (Haskell) as PG33121; the book is also local in the ws9 library (HASKELL-1908)')
ov('LKR-sources-b-R21.PG.GUTENBERG-SEARCH-PIERCE', 'resolved_other_route',
   'search path disallowed by robots.txt (F-017); the catalogue feed (F-243) has no title by Tillie Pierce (Alleman), so the book is not on Project Gutenberg; the text is local in the ws9 library (TPIERCE-1889, archive.org copy)')
ov(['LKR-sources-a-not_requested-0', 'LKR-sources-b-R21.PG.NARA-102279222', 'LKR-fence-3-L56'], 'not_requested_robots_disallowed', R_NARA)
ov('LKR-BH-fence-3-R14.S-063#bh1', 'not_requested_robots_disallowed', R_NARA + '; the claim files of Abraham Brien named in the 1972 study are also described by the study itself (its figures were read from the page images, evidence line WLK2-brien-study-image-check)')
ov('LKR-terrain-2-L2', 'resolved_other_route', 'tools/bt/or27_find.py --self-test was run again on 2026-11-16 and ends "SELF-TEST OK": the raw Official Records text (three volumes, tmp/library/or27) is in this container now')
ov('LKR-tl-02-L28', 'resolved_other_route', 'the text layer exists under another file name than the one derived from the identifier (item regulations-for-the-instruction-1851, file "Regulations for the instruction1851_djvu.txt", 383,816 bytes): fetched through /cors/ on 2026-11-16 (F-364; the derived name answered 404 at F-361; metadata F-363)')
ov('LKR-terrain-1-W7', 'resolved_other_route', 'the /cors/ route avoids the refused data nodes: terrain-1 itself fetched the second scan on 2026-11-14 (its R13.G-10.g reads "65 out of 88 horses" identically in two scans); a third scan (battlesleadersof03john, F-360) and the second scan again (battlesleadersci03underich, F-359) were fetched on 2026-11-16 and both read "and 65 out of 88 horses were killed or wounded" like the local copy')
ov('LKR-fence-1-L98', 'still_failed_http_error', 'the page image of OR27-1 printed p. 431: the /download/ page route redirects to a refused data node (F-140, F-141) and the /cors/ page route answers 404 (F-244, 2026-11-16); the only working route is the 899 MB jp2 zip streamed to one entry, as fence-2 did for two other leaves (its L102, L104); it was not repeated because the claim row R14.E-17 no longer lists a page-image entry (bh1 is gone from the correction file since 2026-11-13)')
ov('LKR-fence-2-L98', 'superseded_by_shard_retry', 'the first run (short read of the 899 MB zip) was followed by successful runs of the same shard (its L102 and L104: only the entries _0879.jp2 and _0548.jp2 kept and read); the /cors/ page route does not exist (F-244, 404)')
ov('LKR-fence-1-L99', 'still_failed_http_error', 'the identifier warofrebellion012702rootrich does not exist on archive.org (the metadata call answers an empty record, F-365, 2026-11-16); the second scans of the volume that do exist are local (tmp/fence-1/dl/or27_w2)')
ov('LKR-fence-3-L8', 'answered_with_evidence', 'the page-image check owed for the 1972 Brien farm study was done on 2026-11-16 now that pdftoppm is installed: pages 7 and 15 of the PDF were rendered and looked at; the digits fence-3 used (194 panels, $174, $15 of $1,028) are right and the PDF text layer\'s are wrong')
ov('LKR-fence-3-L84', 'answered_with_evidence', 'the cemetery-enclosures study (47.8 MB, fetched again from npshistory.com, F-350, sha256 equal to the 2026-11-13 acquisition) was rendered to images (pdftoppm, now installed) and read: its dividing-fence statements are in the evidence lines')
ov('LKR-fence-3-L15', 'still_failed_host_refused', 'www.savasbeatie.com is refused by the egress proxy (CONNECT 403, 2026-11-16, F-236); the shard\'s own failure was the tool\'s 10 MB limit, which does not apply to curl, but the host is not reachable')
ov('LKR-r03-1-L2', 'retrieved_no_statement', 'Law\'s essay "The Struggle for Round Top" is in Battles and Leaders vol. III (three scans read: the local copy and the two fetched via /cors/, F-359 and F-360); every "minutes" in the essay\'s pages is about other matters (Cabell\'s signal guns, Lee\'s survey, Pickett\'s loss), and no ten- or fifteen-minute interval about Vincent is printed in it')
ov('LKR-r03-1-L4', 'retrieved_no_statement', 'the first-pass log was lost with the session of 2026-11-04 and cannot be rebuilt; its subject (Law\'s essay, the Gutenberg chapter by Longstreet) is now read from text: see LKR-r03-1-L2 and the shard\'s own LK-R03-1-R01')
ov(['LKR-tl-12-W7', 'LKR-tl-12-W8'], 'still_failed_host_refused', 'the NCpedia page (www.ncpedia.org) is refused by the egress proxy (CONNECT 403, 2026-11-16, F-235); the National Park Service page on the Confederate commanders (F-161, read 2026-11-13) was the reachable route and is used for Armistead (R03.C-038); archive.org full text for "Pettigrew Falling Waters mortally wounded" returned 0 hits (B24)')
ov('LKR-tl-02-L2', 'still_failed_no_source_found', 'archive.org full text for "Marcellus Jones first shot Gettysburg" returned 0 hits (B21) and for "Marcellus E. Jones" Eighth Illinois Cavalry 41 hits of which two are dated 1930 or earlier (Illinois Monuments at Gettysburg, 1892; Military Essays and Recollections, 1891) that were not read for the carbine account; the account of the first shot in the Official Records is local and was read by the shard')
ov('LKR-tl-02-L7', 'still_failed_no_source_found', 'the 1865 letter of Lieutenant Aaron B. Jerome is not on a reachable host: archive.org full text for the signal officer, the Seminary cupola, Buford and Reynolds returned 0 hits (A19, B18) and the earlier queries of 2026-11-13 (3) returned 0 or leads only; Jacobs 1864 p. 25 (verbatim now) places a signal officer of Howard\'s on the COLLEGE cupola (evidence line WLK2-jerome-jacobs-college-cupola); the Jerome letter lies in the Bachelder papers (New Hampshire Historical Society), owner-only')
ov(['LKR-tl-02-L5', 'LKR-tl-02-L6'], 'answered_with_evidence', 'the two summariser-only readings of the Jacobs passages (p. 23 skirmishing, p. 25 cupola) are replaced by a verbatim reading of the saved text (local ws9 JACOBS-1864 and the Library of Congress text F-150): see the evidence line; the p. 23 passage on Buford\'s skirmishing was not turned into a line (no row depends on it in this pass)')
ov('LKR-tl-01-L3', 'still_failed_host_refused', 'digital.library.cornell.edu is refused by the egress proxy (CONNECT 403, 2026-11-16, F-210; also F-138 on 2026-11-13); archive.org full text for the Broadhead diary returned 2,290 hits for the bare words but none dated 1930 or earlier in the first 12 listed (B23)')
ov('LKR-tl-01-L4', 'still_failed_no_source_found', 'archive.org full-text search for the Broadhead diary (B23, 2026-11-16) lists no item dated 1930 or earlier among the first 12 hits, and the advanced search of ws-town for the title (its L9, 2026-11-14) returned no item; the diary is printed in Pennsylvania Magazine and in 1864 pamphlet form not found on archive.org')
ov(['LKR-tl-01-L7', 'LKR-tl-01-L8'], 'still_failed_no_source_found', 'the 1885 Star and Sentinel and Compiler issues with Jacobs\'s thermometer readings: eleven full-text queries of 2026-11-13 and one more on 2026-11-16 (B26) found no item that prints the 1863 readings; the eight Compiler issues of 1885 were read on 2026-11-13; the weather rows that depended on them (T1-132, T2-053, T2-068, T2-073, T2-113, T3-048, T3-072, T3-095) now rest on Official Records statements (evidence lines of 2026-11-13)')

ov('LKR-tl-01-L6', 'resolved_other_route', 'the Jacobs text (Notes on the Rebel Invasion, 1864) was read by a summariser in that shard; it is local verbatim (ws9 JACOBS-1864, archive.org copy) and a second copy was fetched from the Library of Congress text service (F-150, tile.loc.gov); the passages are read from the text in the evidence line WLK2-jerome-jacobs-college-cupola')
ov('LKR-fence-2-L123', 'still_failed_no_source_found', 'asked again of the National Park Service pages that exist for Little Round Top: the page itself (F-320) and "Fortifications on Little Round Top Then & Now" (F-321, 2026-11-16) say that boulders gave shelter and that "Temporary stone walls would have been easy to build with the vast number of rocks nearby": no rails; the shard\'s own local re-run (round 3, 2026-11-15) found no passage that places rails on Little Round Top itself')

OWNER = ('the itemised damage claims are in the Pennsylvania State Archives (Record Group 2, Board of Commissioners to Assess Damages in Border Counties, War Damage Claims Abstracts); no copy was found on a reachable host '
         '(archive.org full text for the series returned 0 hits, A13, 2026-11-16; the National Archives catalogue disallows programs); a visit or a written request to the Archives is an owner-only act')
ov(['LKR-BH-fence-2-R14.S-021#bh1', 'LKR-BH-fence-2-R14.S-030#bh1', 'LKR-BH-fence-3-R14.S-055#bh1', 'LKR-BH-fence-3-R14.S-059#bh1', 'LKR-BH-fence-3-R14.S-068#bh1'], 'owner_only', OWNER)
ov('LKR-BH-fence-1-R14.S-003#bh1', 'retrieved', 'www.loc.gov is reachable: the collection page of the Civil War photographs answers the site\'s challenge page as HTML (403, not solved) and its JSON interface answered 200 (F-008, 2026-11-13); the specific Brady photograph of mid-July 1863 is identified by the photo-match workstream (GOVERNANCE/horde/ws10-photomatch: 127 catalogued photographs, 430 verified image files), which is where the fence lines are read')
ov('LKR-fence-2-L87', 'retrieved', 'the National Park Service Then-and-Now page on the Evergreen Cemetery gatehouse (F-318, 2026-11-16) says the gatehouse (built 1855) "was used to shelter wounded and suffered damage from the fighting that raged in front of it on the evening of July 2" and that Brady photographed it about two weeks after the battle: fence-2 S-044 already cites these NPS pages; the enclosure study whose scrambled text the shard could not use was read from page images (F-350, pp. 3-8): it mentions the gatehouse only as the end point of the iron fence of 1865')
ov('LKR-BH-fence-3-R14.S-066#bh1', 'still_failed_no_source_found', 'where Armistead lay at the Spangler hospital and the hour: Chronicling America (C07), archive.org full text (A08, B06, B27) found nothing; the National Park Service page on the Confederate commanders (F-161, evidence line WLK-armistead-nps-T3137-01) says only that he "died in a Federal field hospital the day after his wounding" with no place or hour; the Spangler-farm page of the Gettysburg Foundation is on a refused host (F-217)')
ov(['LKR-BH-fence-1-R14.E-14#bh0'], 'retrieved', 'the National Park Service pages on Little Round Top are identified and retrieved (F-320 the park page, F-321 "Fortifications on Little Round Top Then & Now", 2026-11-16; the site index and sitemaps F-034..F-040 were used to find them): they give only the general statement that "Temporary stone walls would have been easy to build with the vast number of rocks nearby" (not an 1863 source); the row stays on the National Park Service CLI and CLR texts it already cites')
ov(['LKR-BH-fence-1-R14.E-17#bh0'], 'retrieved_no_statement', 'the item is identified as the National Park Service Civil War Series booklet "The Battle of Gettysburg" (npshistory.com/publications/civil_war_series/16): all 20 sections were fetched (F-201, F-330..F-348, 2026-11-16) and section 10 (the Second Corps on Cemetery Ridge on 2 July) was read: it contains no statement about rail breastworks on Cemetery Ridge (searched: breastwork, rails, fence rails, rail fence, barricade, stone wall)')
ov(['LKR-BH-terrain-2-R13.P-01#bh1'], 'still_failed_host_refused', 'gettysburg.stonesentinels.com is refused by the egress proxy (CONNECT 403, probed again 2026-11-16, F-216); the National Park Service pages on the High Water Mark and the copse of trees (F-305) say "a clump of bushes and small trees" in 1863 and give the 1887 date of the iron fence (evidence line WLK2-copse-nps)')

ov('LKR-fence-1-L6', 'still_failed_no_source_found', 'the question (is the word lunette or epaulement used of the East Cemetery Hill works?) was run again over the three local Official Records volumes on 2026-11-16: part 1 has no hit; part 2 has 3 matches, all in OR27-2-R400 (the Court of Inquiry on the fortifications of Winchester: "a flank to one of the lunettes"), none about Gettysburg; the corpus is closed, the word is not used of Gettysburg in the Official Records')
ov('LKR-fence-3-L41', 'still_failed_no_source_found', 'the question was run again over the 198 saved National Park Service texts on 2026-11-16: the only hits are the Record of Treatment volume I (three variants of one text) that has Candy\'s brigade in a lane "to the stone wall" bordering Pardee Field (Abraham Spangler Field 8), already cited by terrain-2; no text calls any wall "the Pardee Field wall"')


URL_KINDS = {'host_refused', 'http_error', 'web_failure', 'timeout', 'robots_disallowed', 'http_partial', 'tool_failure'}


def nurl(u):
    from urllib.parse import urlparse
    p = urlparse((u or '').strip())
    return (p.netloc.lower(), p.path.rstrip('/'), p.query)


def decide_auto(r, A, EV, row_hosts, host_of, DNR_HOSTS, REACH, evid_short):
    lk = r['lk_id']
    hosts = row_hosts(r)
    url_hosts = {host_of(u) for u in r['urls']}
    asked = {nurl(u) for u in r['urls']}
    n_ca = sum(1 for a in A if a['kind'] in ('chronicling_america_search_and_ocr_read', 'chronicling_america_search'))
    n_fts = sum(1 for a in A if a['kind'] == 'archive_org_fulltext_search')
    local = [a for a in A if a['kind'] == 'local_rescan']
    urlatt = [a for a in A if a['kind'] == 'url_request']
    exact_ok = [a for a in urlatt if (nurl(a['url']) in asked and a.get('http') == 200) or any(x.get('http') == 200 and nurl(x['url']) in asked for x in a.get('alt_requests', []))
                or (nurl(a['url']) in asked and any(x.get('http') == 200 for x in a.get('alt_requests', [])))]
    refused = [a for a in urlatt if kind_of(a) == 'refused']
    httperr = [a for a in urlatt if kind_of(a) == 'httperr' and nurl(a['url']) in asked and not any(x.get('http') == 200 for x in a.get('alt_requests', []))]
    read = [a for a in urlatt if a.get('http') == 200]

    if lk in OVR:
        o = dict(OVR[lk])
        if EV and o['outcome'] != 'answered_with_evidence':
            o['evidence_note'] = 'evidence lines were written from sources found by this retry'
        return o
    if EV:
        srcs = sorted({e['citation'].get('source_id', '?') for e in EV})
        return {'outcome': 'answered_with_evidence', 'answer_extent': ev_extent(EV),
                'reason': 'the retry found or read source(s) %s that state (part of) what was asked; the evidence lines carry the quotes and say what stays unsupported' % ', '.join(srcs[:6])}
    if url_hosts & DNR_HOSTS or (hosts & DNR_HOSTS and not (hosts - DNR_HOSTS - {'www.loc.gov', 'archive.org'})):
        return {'outcome': 'not_retried_blocked_host_instruction', 'reason': R_DNR}
    if r['kind'] in URL_KINDS or (r['kind'] == 'blocked_host_entry' and r['urls']):
        if exact_ok:
            return {'outcome': 'retrieved', 'reason': 'the asked URL was retrieved (HTTP 200, or through the JSON interface of the same record) and read; see `says` of the attempt'}
        if refused:
            when = ', '.join('%s %s' % (a['attempt'], (a.get('at') or '')[:10]) for a in refused[:6])
            return {'outcome': 'still_failed_host_refused', 'reason': R_REFUSED.format(when=when)}
        if httperr:
            return {'outcome': 'still_failed_http_error', 'reason': 'the site answered %s' % ', '.join(sorted({str(a.get('http')) for a in httperr}))}
    if r['kind'] == 'blocked_host_entry' or r['kind'] in URL_KINDS:
        if refused:
            when = ', '.join('%s %s' % (a['attempt'], (a.get('at') or '')[:10]) for a in refused[:6])
            extra = ''
            if read:
                extra = '; reachable pages were also read in looking for the statement (%s) and do not state it' % ', '.join(a['attempt'] for a in read[:6])
            return {'outcome': 'still_failed_host_refused', 'reason': R_REFUSED.format(when=when) + extra}
    if local and local[0]['matches'] > 0:
        a = local[0]
        return {'outcome': 'still_failed_local_hits_unread',
                'reason': 'the shard\'s own local question was re-run over the current local corpus (%d of %d files match, %d matches); those matches were not read by hand in this pass, '
                          'so nothing is claimed from them: the contexts are in the attempt, and each is to be read against its text before any use' % (a['files_with_match'], a['files_scanned'], a['matches'])}
    if n_ca or n_fts or local or read:
        parts = []
        if n_ca:
            parts.append('%d Chronicling America search(es) with the OCR text of the top results read' % n_ca)
        if n_fts:
            parts.append('%d archive.org full-text query(ies)' % n_fts)
        if read:
            parts.append('%d reachable page(s) read in looking for it (%s)' % (len(read), ', '.join(a['attempt'] for a in read[:8])))
        if local:
            a = local[0]
            parts.append('the shard\'s own local question re-run over the current local corpus (%d of %d files match, %d matches)' % (a['files_with_match'], a['files_scanned'], a['matches']))
        return {'outcome': 'still_failed_no_source_found', 'reason': 'asked again of the reachable sources: ' + '; '.join(parts) + '; no source read states what the lookup asked for'}
    if refused:
        when = ', '.join('%s %s' % (a['attempt'], (a.get('at') or '')[:10]) for a in refused[:6])
        return {'outcome': 'still_failed_host_refused', 'reason': R_REFUSED.format(when=when)}
    return {'outcome': 'still_failed_no_route', 'reason': 'no retry route on the reachable hosts was found for this lookup (no URL, no host on the reachable list, no full-text query that fits)'}


def run(inv, att, EV_BY_LK, OUT, SUMMARY, TODAY, row_hosts, host_of, DNR_HOSTS, REACH, evid_short):
    import rlib
    cnt = collections.Counter()
    by_shard = collections.defaultdict(collections.Counter)
    rows = []
    for r in inv:
        lk = r['lk_id']
        A = att.get(lk, [])
        EV = EV_BY_LK.get(lk, [])
        d = decide_auto(r, A, EV, row_hosts, host_of, DNR_HOSTS, REACH, evid_short)
        pend = lk in PENDING_LOCAL
        if pend and not A and d['outcome'] == 'still_failed_no_route':
            d = {'outcome': 'still_failed_retry_not_run', 'reason': R_PENDING}
        out = {'lk_id': lk, 'retry_date': TODAY, 'origin': r['origin'], 'kind_recorded': r['kind'], 'status_recorded': r.get('orig_status'), 'date_recorded': r.get('orig_date'),
               'asked': (r['asked'] or '')[:1200], 'result_recorded': (r.get('orig_result') or '')[:900], 'urls_recorded': r['urls'], 'attempts': A,
               'outcome': d['outcome'], 'reason': d['reason']}
        for k in ('answer_extent', 'evidence_note'):
            if k in d:
                out[k] = d[k]
        if pend:
            out['local_rerun_pending'] = R_PENDING
        if EV:
            out['evidence'] = [evid_short(e) for e in EV]
        if r.get('affects'):
            out['affects'] = r['affects']
        rows.append(out)
        cnt[out['outcome']] += 1
        by_shard[r['origin']['shard']][out['outcome']] += 1
    with open(OUT, 'w') as f:
        for o in rows:
            f.write(json.dumps(o, ensure_ascii=False, sort_keys=True) + '\n')
    json.dump({'rows': len(rows), 'outcomes': dict(cnt), 'by_shard': {k: dict(v) for k, v in by_shard.items()}, 'written': rlib.now_utc()}, open(SUMMARY, 'w'), indent=1, sort_keys=True)
    print('rows', len(rows))
    for k, v in cnt.most_common():
        print('  %-42s %d' % (k, v))
    noatt = [o['lk_id'] for o in rows if not o['attempts'] and o['outcome'].startswith('still_failed_no_route')]
    print('rows without any attempt and no route:', len(noatt))
    for x in noatt[:60]:
        print('   ', x)
