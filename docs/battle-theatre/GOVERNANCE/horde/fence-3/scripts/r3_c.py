"""Round-3 patches for fence-3, part 3 (2026-11-16): lookup records of the negative searches of this pass for sub-claims that stay open (no change to any claim or citation)."""
import sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from r3lib import P3  # noqa

PATCHES = {}


def patch(sid, queries):
    def deco(fn):
        PATCHES[sid] = fn
        return fn
    return deco


def mk(sid, items, note):
    def fn(d):
        p = P3(d)
        for q, corpora, res, st in items:
            p.lookup(q, corpora, res, st)
        p.rev(note)
        return p.finish()
    PATCHES[sid] = fn


mk('S-055', [('all local texts that name Rummel (27 files, 17 contexts near fence, rail, destroy, claim or $219)', 'tmp/library (rg, Python contexts)',
              'the only fence statements are Kidd (Michigan at Gettysburg), the 2nd Pennsylvania Cavalry history and the New Jersey final report, all cited; the NPS texts name Rummel only in map legends, the cavalry route and Rummel Woods; no statement that the fences were destroyed and no $219.95 claim', 'failed')],
   'Round 3: the Rummel fence search was repeated over all 27 local texts that name Rummel; nothing new; "destroyed" and the claim stay open gaps.')
mk('S-060', [('27 local texts that name Powers Hill (Official Records, state volumes, NPS texts, library): Meade, headquarters or staff near Powers Hill together with a clock expression', 'tmp/library (rg, Python contexts)',
              'no context carries an hour for the move of Meade\'s headquarters (0 contexts)', 'failed')],
   'Round 3: 27 local texts that name Powers Hill were searched for an hour of the move of the headquarters: none; the hour stays an open gap.')
mk('S-065', [('the whole local library (multi-line match "Granite School", 12 files): hospital, wounded, surgeon, Second Corps, McAllister, evacuated; includes the NPS landscape documents, the HABS record pa3648, the NPS Boundary Study 1988 and the newspaper pages', 'tmp/library (rg -U)',
              'only "Granite Schoolhouse Lane" and "Granite School House Road" (road names, an artillery-park lane), the General Management Plan\'s list of farms and buildings without surface remains, and the Boundary Study\'s hospital-site passage about Baltimore Pike (no schoolhouse); no hospital use, no evacuation, no 1862 and no 1921', 'failed')],
   'Round 3: "Granite School" was searched again over the whole local library (12 files, road names and the list of vanished buildings only); the row stays unsupported.')
mk('S-068', [('NPS landscape extracts naming Klingel or Klingle (35 records, 15 distinct passages read) and the HABS record pa2625', 'tmp/library/web/nps, web-nps-landscape.jsonl',
              'post-and-rail fence on both sides of the road with portions dismantled, a claim for thousands of rails, the house fortified on 2 Jul, two orchards; no statement that all fences were missing on 4 Jul and no day for the owner\'s return', 'failed')],
   'Round 3: the NPS landscape records naming Klingel were read again (15 distinct passages); nothing for "all fences missing" or the day of the return.')
mk('S-075', [('web-photomatch.jsonl (the photo-matching records) and the local newspaper pages: Gardner, the Leister wall, the cemetery gatehouse with 6 Jul or 7 Jul', 'docs/battle-theatre/GOVERNANCE/evidence_corrections/web-photomatch.jsonl, tmp/library/web/ca/pages',
              'the only record naming 6 July concerns another photograph (O\'Sullivan, the Slaughter Pen, 6 July 1863); no date of 6 or 7 Jul for the Leister wall or the gatehouse views', 'failed')],
   'Round 3: the photo-matching records and the newspaper pages were searched for 6 and 7 Jul as photograph dates: nothing for the Leister wall or the gatehouse.')
mk('S-077', [('local newspaper pages (Chronicling America): "Camp Letterman"; Letterman, Medical Recollections (1866): Camp Letterman and the general hospital; the NPS Boundary Study 1988', 'tmp/library/web/ca/pages (rg), tmp/fence-3/r3/txt/LETTERMAN-1866.txt, NPS-BOUNDARY-1988',
              'no page names Camp Letterman (0 files); the Recollections do not name it (they have the wounded under Surgeon Janes and supplies to the railroad depot); the Boundary Study says only that the 11 acres of Hospital Woods remain of "the U.S. General Hospital for about 5,000 Union and Confederate troops"; no 10 Jul, 20 Jul, 22 Jul or 20 Nov', 'failed')],
   'Round 3: Camp Letterman was searched again in the newspaper pages, Letterman 1866 and the Boundary Study; no date; the Boundary Study adds only "about 5,000" for the general hospital.')
mk('S-081', [('the whole local library: "1,258" or "1258" near bodies, graves, reinterments, cemetery, buried or remains (23 files with the digits)', 'tmp/library (rg, Python contexts)',
              'no context concerns the reburials (0 of the 23 files); the printed 1,258 on 19 Nov stays unsupported against 1,188 (Tribune list, NPS typescript) and about 1,200 (CLR)', 'failed')],
   'Round 3: "1,258" was searched again in the whole local library with a context check: no reburial statement.')
mk('S-083', [('254 local newspaper pages dated 18-25 Nov 1863: the platform or stand with feet, square, raised, elevated, capacious, spacious, seats or benches near Gettysburg, the cemetery or the President', 'tmp/library/web/ca/pages (Python scan)',
              'one match, the Evening Star of 20 Nov (the platform "in the centre of the cemetery"; already cited); no dimension, footprint, height or rail', 'failed')],
   'Round 3: 254 newspaper pages of 18-25 Nov 1863 were scanned for a dimension of the platform: only the Evening Star passage already cited; footprint, height and rail stay open.')
mk('S-087', [('245 local newspaper pages dated 19-25 Nov 1863 that name Gettysburg or the cemetery: widows, boys, "six governors", governors present', 'tmp/library/web/ca/pages (Python scan)',
              'two contexts, both irrelevant (Vermont\'s dead; a dinner for soldiers in Chicago); no widows or boys at the edge of the crowd and no count of six governors', 'failed')],
   'Round 3: 245 newspaper pages of 19-25 Nov 1863 were scanned for widows, boys and a count of governors: nothing; they stay open gaps.')
