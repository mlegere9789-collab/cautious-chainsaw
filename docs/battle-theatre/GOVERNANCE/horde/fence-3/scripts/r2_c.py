"""Round-2 patches for fence-3, rows S-078 .. S-088 (baseline = round-1 rows of 2026-11-13). New evidence: the Chronicling America pages saved 2026-11-13."""
import sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from r2lib import P, OR_span, SV_span, LIB_span, WEB_span, cite  # noqa
from r2_b import CA  # noqa

PATCHES = {}


def patch(sid):
    def deco(fn):
        PATCHES[sid] = fn
        return fn
    return deco


# --------------------------------------------------------------------------------------------------
@patch('S-080')
def S080(d):
    p = P(d)
    port = p.cite(CA('sn83016025/1863-08-24/ed-1/seq-2', 'The plan proposed is that the State of Penn', 'about twelve acres',
                     note='Portland Daily Press, 24 Aug 1863, page 2: the plan of the Pennsylvania purchase as the paper reports it (OCR drops the hyphen of "Penn-sylvania"); the page image was viewed (the print reads "shall purchase the ground—about twelve acres—on the battle-field near the present Gettysburg cemetery"; the OCR garbles "battle-field", which lies outside the quotation).'))
    wheel = p.cite(CA('sn84026845/1863-11-24/ed-1/seq-1', 'amounting to seventeen acres', None,
                      note='Daily Intelligencer (Wheeling), 24 Nov 1863, page 1, a letter describing the visit to the cemetery; the page image was viewed: the print reads "After examining the grounds at the Cemetery, including the plan of that part of it recently bought by the State of Pennsylvania, amounting to seventeen acres, in which our dead are now being re-buried" (the OCR of the rest of the sentence is garbled, so only the clean words are quoted).'))
    fn6 = p.cite(LIB_span('NPS-ADHI', 'McConaughy had written a letter to Governor Curtin on July 25', "for a soldiers' cemetery at Gettysburg.", title='NPS, H. D. Unrau, Administrative History: Gettysburg National Military Park and National Cemetery (1991)',
                          note='Footnote 6 of the study (the pdf page of the file as served); the letter itself is not local.'))
    p.edit(4, claim='McConaughy wrote to Governor Curtin on 25 July 1863 "explaining his plans, proposals, and activities for a soldiers\' cemetery at Gettysburg" (NPS footnote); the Evergreen Cemetery Association agreed on 14 August to sell Wills twelve acres and "a day or two later" Wills bought five more (NPS): the purchases by Wills are of August 1863. Wills\'s report to Curtin of 17 Aug 1863 named in the first close-out is withdrawn: no local text states it.',
           add_cites=[fn6], why='NPS footnotes list further letters (29 Jul, 5, 14 Aug of McConaughy; 3, 7, 10, 11 Aug of Wills); only the letter of 25 Jul is quoted here and none of the letters is local.')
    p.add('plan_of_twelve_acres_reported_in_august', 'A Maine newspaper of 24 Aug 1863 reports the plan "that the State of Pennsylvania shall purchase the ground—about twelve acres—on the battle-field near the present Gettysburg cemetery" (the page image was viewed); the NPS dates the sale of twelve acres to 14 Aug 1863 (S-080.1).',
          'documented', [port], support='supported',
          why='A contemporary newspaper statement of the plan, consistent with the NPS account that twelve acres were sold first; it prices nothing.')
    p.add('seventeen_acres_in_a_second_newspaper', 'A letter in the Wheeling Daily Intelligencer of 24 Nov 1863 describes the part of the cemetery "recently bought by the State of Pennsylvania, amounting to seventeen acres, in which our dead are now being re-buried" (the page image was viewed; only "amounting to seventeen acres" is clean in the OCR).',
          'documented', [wheel], support='supported',
          why='A second contemporary newspaper naming seventeen acres (after the Tribune of S-080.3), and stating that reburial was in progress in late November 1863.')
    p.verdict(corrected_claim=p.d['corrected_claim'] + ' Round 2 adds two contemporary newspapers: the Portland Daily Press of 24 Aug 1863 reports the plan of "about twelve acres", and the Wheeling Daily Intelligencer of 24 Nov 1863 names "seventeen acres" with the dead "now being re-buried".')
    p.rev('Round 2: two more contemporary newspapers added (Portland Daily Press, 24 Aug 1863: the plan of about twelve acres; Wheeling Daily Intelligencer, 24 Nov 1863: seventeen acres, reburial in progress), both read against the page images.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-082')
def S082(d):
    p = P(d)
    stone = p.cite(CA('sn83016025/1863-08-24/ed-1/seq-2', 'The ground to be en closed by a well built stone wall', 'at a cost of about $2000',
                      note='Portland Daily Press, 24 Aug 1863, page 2: the plan for the Pennsylvania purchase as the paper reports it; the page image was viewed (the print reads "The ground to be enclosed by a well built stone wall, and a keeper\'s house to be erected on the lot at a cost of about $2000"). The OCR splits "enclosed" and "keeper\'s".'))
    p.add('stone_wall_planned_in_august_1863', 'A newspaper of 24 Aug 1863 reports the plan that "the ground [be] enclosed by a well built stone wall, and a keeper\'s house ... erected on the lot at a cost of about $2000": an enclosure planned in August 1863, not a wall standing on 19 Nov (the Tribune of 19 Nov has the stone enclosure still to come).',
          'documented', [stone], support='supported',
          why='A plan statement only. It does not date any wall or fence as built; with the Tribune\'s "will be surrounded by a substantial stone" (S-082.2) it shows the plan was a stone wall, while the sale condition (S-082.3) was an iron railing on the division line with Evergreen.')
    p.rev('Round 2: the August 1863 plan of a stone enclosure (Portland Daily Press, page image viewed) added as a plan statement; the iron-fence-on-19-Nov claim stays an open gap.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-086')
def S086(d):
    p = P(d)
    rep = p.cite(CA('sn86053570/1863-11-20/ed-1/seq-2', 'On Thursday morning the sun roso brightly, and after being temporarily obscured, smiled pleasantly throughout', None,
                    note='Daily National Republican (Washington), 20 Nov 1863, page 2, under "The dedicatory ceremonies"; the page image was viewed: the print reads "On Thursday morning the sun rose brightly, and after being temporarily obscured, smiled pleasantly throughout the day, and the ceremonies proceeded according to the programme" (the OCR prints "roso"; the words "tho Jay" after the quotation are "the day").'))
    p.add('sun_rose_bright_then_temporarily_obscured', 'The Washington National Republican of 20 Nov 1863 says that on the morning of 19 Nov "the sun rose brightly, and after being temporarily obscured, smiled pleasantly throughout the day" (the page image was viewed): a bright sunrise, an obscuring of the sun of unstated hour and length, and sun for the rest of the day.',
          'documented', [rep], support='supported',
          why='A fifth contemporary newspaper, and the first to mention any obscuring of the sun. It gives no hour for the obscuring and does not say clouds covered the whole sky; it contradicts neither the bright morning of the other four nor the plan\'s "cloudy, clearing to sun at the prayer" outright, but it gives the opposite order (bright, then obscured, then sunny).')
    p.edit(4, tier='inferred', support='partial', cites=[rep],
           claim='The default is cloudy clearing to sun at the prayer (conflict E-007: cloudy per W-CONS, "perfect" morning per GC-COMP).',
           why='The plan\'s default has no local source for the clouds before the prayer or for a clearing at it. The only contemporary mention of the sun being obscured is the National Republican\'s (bright sunrise, then "temporarily obscured", then sun "throughout the day"), which has no hour and the opposite order; the four other papers call the morning bright, unclouded, fine or beautiful. The conflict E-007 stays open with every value selectable.')
    p.verdict(corrected_claim='Five contemporary newspaper statements describe the morning of 19 Nov 1863: unclouded, bright, fine or beautiful (Adams Sentinel, New-York Tribune, Evening Star twice), with mist in the distance from the stand, and the Washington National Republican adds that the sun "rose brightly, and after being temporarily obscured, smiled pleasantly throughout the day"; none says the morning was cloudy, none gives the hour of the obscuring and none mentions the sun at the prayer; the plan\'s cloudy-to-sunny default has no local source and conflict E-007 stays open with no default chosen.')
    p.rev('Round 2: the National Republican of 20 Nov 1863 ("the sun rose brightly, and after being temporarily obscured, smiled pleasantly throughout the day") added after reading the page image; S-086.4 moves from open gap to inferred/partial (an obscuring is documented, its hour and the plan\'s clearing at the prayer are not).')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-087')
def S087(d):
    p = P(d)
    chi = p.cite(CA('sn84031490/1863-11-21/ed-1/seq-1', 'The number assembled was between 39,009 find 50,000', None,
                    note='Chicago Daily Tribune, 21 Nov 1863, page 1, special dispatch from Harrisburg dated 20 Nov 1863, headed "50,000 persons in attendance". The page image was viewed: the print reads "The number assembled was between 30,000 and 50,000" (the OCR prints "39,009 find"); the headline reads "50,000 PERSONS IN ATTENDANCE".'))
    press = p.cite(CA('sn84031490/1863-11-21/ed-1/seq-1', 'The capacious stand was filled with', 'members of the press',
                      note='Same dispatch (OCR "offi cers" for officers). The dispatch adds that the crowd "was packed so densely" that the marshals on horseback could not move through it.'))
    p.sc(1)['why'] = 'Four statements, none measured. The printed range (about 15,000 to 20,000) is inside the spread; round 2 adds the Chicago Tribune\'s 30,000 to 50,000 (S-087.6), so the estimates run from about 15,000 to 50,000.'
    p.add('chicago_tribune_30000_to_50000', 'The Chicago Daily Tribune\'s special dispatch of 20 Nov 1863 (headline "50,000 persons in attendance") puts the number assembled at "between 30,000 and 50,000" (OCR "39,009"; the digits read from the page image): the highest contemporary estimate read here, far above the AP figure of about 15,000 civilians.',
          'documented', [chi], support='supported',
          why='One more witness statement, not measured; with the others the estimates run from about 15,000 (AP, the Tribune correspondent) through 20,000 at the stand (Sentinel) and 20,000-40,000 in the town to 30,000-50,000 (Chicago Tribune). The plan\'s "15,000 to 20,000" is the low end of the spread; no value is chosen.')
    p.add('members_of_the_press_on_the_stand', 'The same dispatch lists the members of the press on the stand with the officers, Governors and their staffs, Foreign Ministers and Admirals: reporters were present on the stand, not in the crowd; the crowd was "packed so densely" that the marshals on horseback could not move through it.',
          'documented', [press], support='partial',
          why='The plan\'s "reporters" in the crowd is refined to "members of the press" on the stand; widows and boys at the edge are still unsupported.')
    p.edit(5, claim='Widows, boys at the edge (a photograph) and a count of "six governors" (printed); reporters: see S-087.7 (on the stand).',
           why='The newspapers give military, civilians (men, women and children), ladies, the governors present and the press on the stand, with no count of governors; widows and boys at the edge are not found; the plan\'s keys are W-CONS (Wikipedia) and EWH (Eyewitness to History; the host refused the connection on 2026-11-13).')
    p.verdict(corrected_claim=p.d['corrected_claim'] + ' Round 2: a Chicago Tribune special dispatch of 20 Nov 1863 puts the number assembled at between 30,000 and 50,000 (digits read from the page image), so the spread of contemporary estimates is about 15,000 to 50,000 and the printed 15,000 to 20,000 is its low end; the dispatch places the members of the press on the stand.')
    p.rev('Round 2: the Chicago Tribune dispatch (page image viewed for the digits 30,000 and 50,000) adds the highest estimate and the press on the stand; the spread of estimates is now about 15,000 to 50,000.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-085')
def S085(d):
    p = P(d)
    a = p.cite(CA('sn83030213/1863-11-20/ed-1/seq-1', 'scene forever. As the trees', 'are mot dead',
                  note='New-York Daily Tribune, 20 Nov 1863, page 1, the Associated Press report of the dedication from Gettysburg: the prayer of the Chaplain (the Rev. T. H. Stockton) before the President\'s address. The OCR interleaves the columns here; the page image was viewed and reads "and scene forever. As the trees are not dead, though their foliage is gone, so our heroes are not dead, though their forms have fallen" (OCR "mot" for "not").'))
    b = p.cite(CA('sn83030213/1863-11-20/ed-1/seq-1', 'though their foliage is gone, so our heroes are', None,
                  note='Same page and sentence, the second half as the OCR gives it after the interleaved column ("are uot": not).'))
    p.edit(2, tier='inferred', support='partial', cites=[a, b],
           claim='Trees leaf-off or nearly so, grass dormant (printed, "inferred"): the only text is the Chaplain\'s prayer at the dedication, "As the trees are not dead, though their foliage is gone, so our heroes are not dead, though their forms have fallen" (New-York Daily Tribune, 20 Nov 1863; also in the Indianapolis Daily State Sentinel of 24 Nov, OCR garbled), a simile that presupposes trees without foliage; it does not describe the cemetery ground, and nothing says the grass was dormant.',
           why='By season and by the prayer\'s simile (the page image was viewed for the words); the photograph of the crowd (a reading of a picture, ppmsca-32850 viewed 2026-11-13) shows bare saplings and low dry grass. No text states the state of the trees or grass at the cemetery.')
    p.rev('Round 2: the prayer line "As the trees are not dead, though their foliage is gone" (Tribune of 20 Nov 1863, page image viewed) added to S-085.2 as the only text about foliage; it stays inferred.')
    return p.finish()
