"""Round-2 patches for fence-3, rows S-063 .. S-077 (baseline = round-1 rows of 2026-11-13)."""
import sys, json
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from r2lib import P, OR_span, SV_span, LIB_span, WEB_span, cite  # noqa

ROOT = '/home/user/cautious-chainsaw'
PATCHES = {}
_MAN = {}


def patch(sid):
    def deco(fn):
        PATCHES[sid] = fn
        return fn
    return deco


def manifest(pid):
    if not _MAN:
        for l in open(ROOT + '/docs/battle-theatre/GOVERNANCE/horde/ws-web/ca/pages.jsonl'):
            try:
                d = json.loads(l)
            except Exception:
                continue
            _MAN[d['page_id']] = d
    return _MAN[pid]


def CA(pid, a, b=None, note=None, nth=0, maxlen=900):
    """A Chronicling America OCR page saved under tmp/library/web/ca/pages (fetched 2026-11-13 by the web-evidence workstream)."""
    m = manifest(pid)
    lccn, date, ed, seq = pid.split('/')
    sid = 'LOC-CA-%s-%s-P%s' % (lccn, date, seq.split('-')[1])
    src = '%s, %s, page %s (Library of Congress, Chronicling America; OCR text as saved 2026-11-13)' % (m['paper'].split(' (')[0].title() if False else m['paper'], date, seq.split('-')[1])
    return WEB_span('tmp/library/web/ca/pages/' + pid + '.txt', a, b, nth=nth, source_id=sid, source=src, page=seq.split('-')[1], note=note, maxlen=maxlen,
                    extra={'url': m['resource_url'], 'fetched': m['fetched_at'], 'paper': m['paper'], 'page_basis': 'page %s of the issue' % seq.split('-')[1]})


USSC_SRC = 'U.S. Sanitary Commission, Report on the Operations of the Sanitary Commission during and after the Battles at Gettysburg, July 1st, 2d and 3d, 1863 (New York: Wm. C. Bryant & Co., 1863; archive.org item reportonoperatio00doug)'
USSC_PATH = 'tmp/library/medical/USSC-GETTYSBURG-1863/reportonoperatio00doug_djvu.txt'


def USSC(a, b=None, page=None, note=None, nth=0):
    out = WEB_span(USSC_PATH, a, b, nth=nth, source_id='USSC-GETTYSBURG-1863', source=USSC_SRC, page=page, note=note)
    out['page_basis'] = 'set by hand from the page numerals printed in the OCR text' if page else out.get('page_basis')
    return out


# --------------------------------------------------------------------------------------------------
@patch('S-063')
def S063(d):
    p = P(d)
    c2 = LIB_span('NPS-BRIEN-FARM', 'Historic fences on Brien land are noted in two of the four maps', 'Cope continued with the stone', title='M. Sherfy, The Brien Farm and Family (NPS, 1972)',
                  note='Sherfy 1972, appendix "Brien farm layout": the four maps are Brien\'s drawing for his damage claims, Warren\'s 1868-1869 map, a tract map of about 1895 and Lt. Col. Cope\'s map for the 1896 report of the Park Commission; the fences are identified on Warren\'s and Cope\'s maps, not on Brien\'s. OCR "Eramitsburg" is Emmitsburg; the text continues "stone ■wall" (OCR). The pdf page number is that of the file as served.')
    p.widen('c2', c2)
    p.rev('Round 2: the quotation of c2 widened to the whole list of map differences (north side of the buildings, field south of the house), and to the sentence that names the four maps and says which two show fences; the first quotation held only the Emmitsburg Road difference.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-066')
def S066(d):
    p = P(d)
    us = p.cite(USSC('The Eleventh Corps Hospital occupied the house and farm of Geo. Spangler.', 'of whom 100 were said to be confederates', page='24',
                     note='Sanitary Commission report of 1863 (printed p.24, after the numeral 24 and the footnote on the corps hospitals): the corps hospitals as the Commission\'s inspectors saw them in July 1863; "These figures are approximative only". The table beside it counts the Eleventh Corps at 1,800 Union and 100 Confederate, 1,900 in all. The divisions are "consolidated under the charge of Dr. Armstrong" at that time; Brinton\'s earlier charge of the 2nd Division is the NPS study\'s statement (c1).'))
    p.edit(1, claim='The Eleventh Corps hospital stood at the George Spangler farm: the Sanitary Commission\'s report of 1863 says it "occupied the house and farm of Geo. Spangler", its divisions consolidated under Dr. Armstrong, holding 1,900 wounded "of whom 100 were said to be confederates" (approximate figures); the NPS study has Dr. D. G. Brinton in charge of the 2nd Division of that hospital, to which the wounded Armistead was brought.',
           add_cites=[us], why='Two independent statements of the site: the contemporary Commission report (1863) and the NPS study quoting Brinton\'s 1869 letter. The report gives the consolidated hospital and its head at the time of the inspection, not the division heads of 3 Jul.')
    c1 = LIB_span('NPS-COMMON-PRIDE-2', 'Union officer came to them while Holland was with Armistead', 'at the George Spangler', title='NPS, K. R. Georg, "A Common Pride and Fame" part II (1981)',
                  note='The sentence before the name of Brinton: a Union officer came to Holland and Armistead "and that was the man who directed the ambulance to the field hospital"; the text continues "farm, was the attending physician to the Virginia general". The pdf page break of p.184 stands before the first word.')
    p.widen('c1', c1)
    p.edit(4, support='supported', claim='An ambulance took the wounded Armistead to the hospital: a Union officer who came to Holland and Armistead "directed the ambulance to the field hospital" (the NPS study), and Brinton had the general brought to his hospital the same afternoon.',
           why='The study\'s own wording for the ambulance; Brinton\'s letter (S-066.2) dates the arrival to about 4 o\'clock.')
    p.rev('Round 2: the Sanitary Commission report of 1863 (acquired 2026-11-14) added as a second, contemporary witness to the Eleventh Corps hospital at the Spangler farm and its 1,900 wounded.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-076')
def S076(d):
    p = P(d)
    us1 = p.cite(USSC('On Monday, July 6, I left Washington for Baltimore to meet yourself and Mr. Knapp.', None, page='17',
                      note='Sanitary Commission report of 1863, printed p.17: the agent\'s account of his journey to Gettysburg; 6 Jul 1863 was a Monday.'))
    us2 = p.cite(USSC('I left Baltimore on Monday evening, upon a freight train', 'was then over a mile from the town', page='17',
                      note='Same passage: the freight train left Baltimore on the evening of Monday 6 Jul and reached Gettysburg late on Tuesday 7 Jul at "the temporary terminus of the railway", more than a mile from the town; the passage goes on that crowds of slightly wounded men came to the terminus and that a relief lodge was set up there that night.'))
    us3 = p.cite(USSC('until the opening of the railroad permitted our reaching the field by that route, when, on Tuesday morning, July 7, a storehouse was taken in town', None, page='16',
                      note='Same report, an agent\'s account of the first days: the stores had been issued from a school-house on the Baltimore pike until the railroad opened; "Twelve wagon loads ... were therefore taken on to the battle-field, previous to the opening of the railroad to Gettysburg" (same page).'))
    ev = p.cite(CA('sn86059058/1863-07-25/ed-1/seq-1', 'I started on the 5th inst. for the battle-field of Gettysburg', 'by the way of Westminster',
                   note='Report of the Indiana Military Agency, Washington, 16 Jul 1863, to Governor Morton, printed in the Evansville Journal of 25 Jul 1863 (OCR "Boldiers", "Westminster" is clean): the party started on the 5th, found the railroad to Gettysburg out of order and went by way of Westminster (the date of the discovery is not stated).'))
    p.add('rail_state_5_to_7_jul', 'The railroad to Gettysburg was out of order when an Indiana agent set out for the field on 5 Jul (he went by way of Westminster instead) and had opened by Tuesday 7 Jul: a Sanitary Commission agent who left Baltimore on the evening of Monday 6 Jul on a freight train reached Gettysburg late on Tuesday afternoon 7 Jul at the temporary terminus of the railway, over a mile from the town; the Commission closed its school-house depot on the Baltimore pike and took a storehouse in the town on the morning of 7 Jul, after "the opening of the railroad" had permitted reaching the field by that route.',
          'documented', [ev, us1, us2, us3], support='supported',
          why='Two independent contemporary witnesses bracket the reopening: out of order at the start of the journey of 5 Jul (Evansville Journal), trains to a temporary terminus a mile from the town on 7 Jul (Sanitary Commission report, 1863). The plan\'s "Traffic resumes Jul 10" is three days later than the Commission\'s date for the first trains (7 Jul).')
    p.edit(2, claim='Rail traffic resumed on 10 Jul (printed).', tier='open_gap', support='none',
           why='Contradicted as a first date: a Sanitary Commission agent\'s train reached the temporary terminus on 7 Jul (S-076.3); no local text dates the reopening of the line to the station in the town, and the only local timetable (the Compiler\'s standing "Change of Time" advertisement) does not date it. The plan notes that "one passage says 1865" (Wikipedia, not admissible).')
    p.unsupported_set(['The date the line reached the station in the town (the Commission\'s report gives a temporary terminus more than a mile from the town on 7 Jul).', 'The plan\'s "10 Jul" and the "1865" of one passage (Wikipedia, not admissible).'])
    p.lookup('Sanitary Commission report of 1863 (acquired 2026-11-14), Chronicling America July 1863 pages: the railroad to Gettysburg, first train, opened, out of order', 'USSC-GETTYSBURG-1863, tmp/library/web/ca pages of 4-31 Jul 1863',
             'found: out of order when an agent set out on 5 Jul (Evansville Journal 25 Jul); freight train reached the temporary terminus a mile from the town late on 7 Jul and the school-house depot closed on 7 Jul "the opening of the railroad" (USSC); no text gives 10 Jul')
    p.verdict('corrected', 'open',
              'Repairs of the Gettysburg Railroad were ordered after the bridge near Littlestown was mended (Haupt, 4 Jul 1863); the line was out of order when an Indiana agent set out on 5 Jul, and a freight train from Baltimore reached a temporary terminus of the railway more than a mile from the town late on Tuesday 7 Jul (Sanitary Commission report, 1863), so the plan\'s "traffic resumes Jul 10" is three days late for the first trains; the date the line reached the station is not stated by any local text.')
    p.product(['State schedule S-076: change "Traffic resumes, Jul 10" to "first trains reach a temporary terminus more than a mile from the town on Tue 7 Jul (documented, Sanitary Commission report 1863); line to the station undated (open gap)"; keep "Cut" until the evening of 6 Jul (out of order on 5 Jul). The 1865 variant stays unsupported.'])
    p.rev('Round 2: the Sanitary Commission report of 1863 (acquired 2026-11-14) and the Evansville Journal of 25 Jul 1863 (Library of Congress page text) date the first trains to Tue 7 Jul at a temporary terminus a mile from the town, which contradicts the printed 10 Jul; verdict partially_supported -> corrected.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-077')
def S077(d):
    p = P(d)
    SOU = 'tmp/library/medical/SOUDER-LEAVES-1864/leavesfrombattle00soud_djvu.txt'
    SOUS = 'Mrs. Emily B. Souder, Leaves from the Battle-field of Gettysburg: a series of letters from a field hospital (Philadelphia, 1864; archive.org item leavesfrombattle00soud)'
    sou1 = p.cite(WEB_span(SOU, 'At all events, the Second Corps is being moved to the General Hospital with all convenient despatch.', None, source_id='SOUDER-LEAVES-1864', source=SOUS, page='61',
                           note='Souder, letter headed "Gettysburg, July 27, 1863. Wednesday evening" (the heading as printed; 27 July 1863 was a Monday and the Wednesday after it is 29 July, so the date is uncertain by two days), printed p.61.'))
    sou2 = p.cite(WEB_span(SOU, 'The Third and Fifth Corps are being brought into the General Hospital, which is near the railroad. The Twelfth Corps is entirely removed ; the Eleventh nearly so.', None, source_id='SOUDER-LEAVES-1864', source=SOUS, page='62',
                           note='Same letter, printed p.62 (the running head "62 LEAVES FROM THE" stands in the preceding sentence).'))
    ms1 = p.cite(WEB_span('tmp/library/medical/MSHWR-P2V2-1877-2NDISSUE/medicalsurgicalh22unit_djvu.txt', 'On July 23d, the patient was transferred to the Camp Letterman Hospital', 'under the charge of Acting Assistant Surgeon Charles S. Gauntt',
                          source_id='MSHWR-P2V2-1877', source='Medical and Surgical History of the War of the Rebellion, Part II, vol. II, Surgical History (Surgeon General\'s Office, 1876-1877; archive.org item medicalsurgicalh22unit)', page=None,
                          note='A case history: wounded at Gettysburg on 2 Jul 1863, admitted to the Twelfth Corps field hospital the same day, transferred on 23 Jul 1863 to the Camp Letterman Hospital. The Surgeon General\'s volumes use the name "Camp Letterman" for the hospital at Gettysburg in case histories of patients admitted as early as 6 Jul, so the name is retrospective and these entries do not date the founding of the camp.'))
    ms2 = p.cite(WEB_span('tmp/library/medical/MSHWR-P2V2-1877-2NDISSUE/medicalsurgicalh22unit_djvu.txt', 'that he was treated at Camp Letterman, from August 5th to November 5, 1863', None,
                          source_id='MSHWR-P2V2-1877', source='Medical and Surgical History of the War of the Rebellion, Part II, vol. II, Surgical History (Surgeon General\'s Office, 1876-1877; archive.org item medicalsurgicalh22unit)', page=None,
                          note='Case 796 (Pvt. T. Lindsay, 69th Pennsylvania, wounded 2 Jul 1863): Surgeon H. Janes, U.S.V., reports treatment at Camp Letterman from 5 Aug to 5 Nov 1863, then transfer to Newton University Hospital, Baltimore.'))
    ms3 = p.cite(WEB_span('tmp/library/medical/MSHWR-P1V2-1870-ALT/medicalsurgical12barnrich_djvu.txt', 'he was transferred to Camp Letterman Hospital, and on November 14th', None,
                          source_id='MSHWR-P1V2-1870', source='Medical and Surgical History of the War of the Rebellion, Part I, vol. II, Surgical History (Surgeon General\'s Office, 1870; archive.org item medicalsurgical12barnrich)', page=None,
                          note='A case history of a Gettysburg amputation: "on August 3d, he was transferred to Camp Letterman Hospital, and on November 14th, [OCR "1o"] to the hospital at York, Pennsylvania"; the year 1863 follows from the July 1863 wound and the discharge of 27 June 1864 that the same case gives (OCR "18(54").'))
    ms0 = p.cite(WEB_span('tmp/library/medical/MSHWR-P1V2-1870-ALT/medicalsurgical12barnrich_djvu.txt', 'Admitted to Camp Letterman Hospital, Gettysburg, July 6th', None,
                          source_id='MSHWR-P1V2-1870', source='Medical and Surgical History of the War of the Rebellion, Part I, vol. II, Surgical History (Surgeon General\'s Office, 1870; archive.org item medicalsurgical12barnrich)', page=None,
                          note='A case history: wounded at Gettysburg on 1 Jul 1863, "Admitted to Camp Letterman Hospital, Gettysburg, July 6th": the name is applied to the hospital at Gettysburg for an admission of 6 Jul, when no Camp Letterman as a distinct camp is dated by any text.'))
    p.add('late_july_consolidation_into_the_general_hospital', 'A letter written at Gettysburg by a Philadelphia volunteer (Souder; printed headed 27 July 1863, Wednesday evening) says the Second Corps was being moved to "the General Hospital", that "the Third and Fifth Corps are being brought into the General Hospital, which is near the railroad", and that the Twelfth Corps hospital was "entirely removed" and the Eleventh "nearly so": the corps hospitals were being consolidated into the general hospital in the last days of July 1863.',
          'documented', [sou1, sou2], support='supported',
          why='Eyewitness letter published in 1864; it does not name Camp Letterman; the general hospital "near the railroad" is presumably the camp the NPS describes east of the town, an identification no quoted text makes. It brackets the consolidation to the last days of July, after the printed 20 or 22 Jul opening values and before the winter closing.')
    p.add('operating_period_from_case_histories', 'The Surgeon General\'s case histories record patients transferred to the Camp Letterman Hospital on 23 Jul 1863 and still treated there from 5 Aug to 5 Nov 1863 and transferred from it on 14 Nov 1863 (the year read from the case): a lower bound of the period in which the hospital was receiving and discharging patients, from 23 Jul to 14 Nov 1863.',
          'documented', [ms1, ms2, ms3, ms0], support='partial',
          why='Case histories compiled in 1870-1877 from the hospital records; they name "Camp Letterman" retrospectively (also for admissions dated 6 Jul), so they do not date the founding of the camp, nor its closing; they show it was operating on 23 Jul and on 5 and 14 Nov 1863. The printed closing "Nov 20" is therefore not contradicted and not supported.')
    p.edit(4, claim='Construction began on 10 Jul; the camp opened on 20 Jul (ABT) or 22 Jul (CWN, Wikipedia) and closed on 20 Nov (printed).',
           why='No local text gives any of these dates; the two opening values of conflict C-044 stay selectable and unsourced here. What the new local texts give is a window: consolidation into the general hospital near the railroad in the last days of July (S-077.5) and case histories at Camp Letterman from 23 Jul to 14 Nov 1863 (S-077.6).')
    p.unsupported_set(['Construction on 10 Jul, the opening day (20 or 22 Jul) and the closing day 20 Nov (the case histories show operation from 23 Jul to at least 14 Nov 1863).'])
    p.lookup('Medical and Surgical History (parts I-III vol. II), Sanitary Commission report, Souder 1864: Camp Letterman, the general hospital, dates', 'tmp/library/medical (MSHWR, USSC-GETTYSBURG-1863, SOUDER-LEAVES-1864)',
             'found: case histories at Camp Letterman from 23 Jul to 14 Nov 1863; consolidation into the general hospital near the railroad in late July (Souder); none gives 10 Jul, 20 Jul, 22 Jul or 20 Nov')
    p.rev('Round 2: Souder\'s letter and three Surgeon General case histories (local texts acquired 2026-11-14) added: consolidation into the general hospital in the last days of July and operation from 23 Jul to at least 14 Nov 1863; the printed 10 Jul, 20/22 Jul and 20 Nov remain unsupported.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-067')
def S067(d):
    p = P(d)
    p.widen('c1', OR_span(2, 'OR27-2-R427', 'At midnight, July', 'fall back to Hagerstown',
                          note='Guild, Medical Director, Army of Northern Virginia, report of 20 Jul 1863; OCR "July .3" is July 3. The quotation now includes the hour, which the first quotation left to this note.'))
    p.rev('Round 2: the quotation of c1 widened to start at "At midnight, July 3", so that the hour of the order of withdrawal is inside it.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-068')
def S068(d):
    p = P(d)
    p.widen('c3', LIB_span('NPS-CLI-ERR', 'In the 1870s, both Catherine Trostle and Daniel Klingel filed claims with the federal government', 'and 50 chickens', title='NPS Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield (2024)',
                           note='The first quotation stopped in the middle of "materials"; it now runs to the end of the sentence. Items listed on both claims: "over 90 acres of field crops, thousands of fence rails and other fencing materials, and 50 chickens".'))
    p.edit(3, claim='Daniel Klingel and Catherine Trostle each filed a claim with the federal government in the 1870s; the items listed on their claims included "thousands of fence rails and other fencing materials" (NPS).')
    p.rev('Round 2: the quotation of c3 (cut in the middle of the word "materials") widened to the whole sentence; the claim says "their claims" because the NPS does not separate the two lists.')
    return p.finish()
