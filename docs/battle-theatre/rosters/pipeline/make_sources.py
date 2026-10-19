"""Write docs/battle-theatre/rosters/SOURCES.csv.  Status codes:
 FETCHED   = fetched and parsed in the pilot (this session)
 META      = existence, identifier and/or copyright flag verified in this session (IA metadata or a web page read), not parsed
 TERMS     = the site's terms page was read in this session
 CANDIDATE = from the author's prior knowledge or a search snippet, not verified: Stage 0 must verify before any use
 BLOCKED   = reachable only through a bot challenge or lending wall: not fetched, by rule
"""
import csv, os

OUT = '../../../../docs/battle-theatre/rosters/SOURCES.csv'
H = ['id', 'army', 'scope', 'source', 'years', 'coverage', 'format_and_quality', 'licence_or_terms', 'bulk_or_per_unit_fetch_rule', 'status', 'locator', 'notes']
R = []


def a(*x):
    assert len(x) == len(H), (len(x), x[:3])
    R.append(x)


# ------------------------------------------------------------------ UNION
a('U01', 'Union', 'Wisconsin', 'Roster of Wisconsin Volunteers, War of the Rebellion, 1861-1865, 2 vols (Adjutant General, 1886)', '1886',
  'Every Wisconsin unit, whole war: name, residence, enlistment date, remarks (discharge, wounds, death, transfer). 6th Wisconsin = book pp.494-537.',
  'IA djvu.xml with word coordinates (59 MB per volume). Rows rebuilt from coordinates: names good; about 25 percent of date years or remark words lost or garbled in the OCR layer (measured, pilot).',
  'Public domain (IA flag NOT_IN_COPYRIGHT).', 'IA download of the item files, one request per file, rate-limited; no per-regiment endpoint.', 'FETCHED',
  'archive.org/details/rosterofwisconsi01wisc and rosterofwisconsi02wisc', 'No status at 30 June 1863; remarks are service history only.')
a('U02', 'Union', 'Maine', 'Annual Report of the Adjutant General of Maine for 1863, Appendix D: company returns of each regiment, status 1 Dec 1863 with every change since 1 Nov 1862', '1863-64',
  'Every man on a Maine regiment roll in 1863: name, age, residence, married/single, muster date, remark (sick, wounded, discharged, died, promoted). 20th Maine = report pp.572-602 (IA leaves 791-821).',
  'IA djvu.xml with coordinates (60 MB). Ditto marks and a few ink blots corrupt a minority of rows (sample: 1 merged pair in 60 rows).',
  'Public domain state publication.', 'IA download of one item (one request).', 'FETCHED', 'archive.org/details/annualreportofad1863main',
  'Remarks give December 1863 status, not July: Wd. at Gettysburg survives only for men still absent.')
a('U03', 'Union', 'Maine', 'Maine at Gettysburg (Report of the Maine Commissioners, 1898): per-regiment Participants lists, casualty reports, rosters of officers', '1898',
  'Named participants by company for every Maine unit at Gettysburg (20th Maine: about 575 names incl. 62 on special duty) plus revised report of casualties. Strongest per-man Present-Documented source found.',
  'IA djvu.xml; two-column text parsed by x-coordinate: 90 percent of participant names matched a return row automatically, rest are spelling/OCR variants.',
  'Public domain (1898).', 'IA download (one item).', 'FETCHED', 'archive.org/details/maineatgettysbur01main',
  'CONTESTED: 575 names against 386 in the official report (see PLAN section 3).')
a('U04', 'Union', 'Maine', 'Supplement to the Annual Reports of the Adjutant General of Maine, 1861-1866 (1867)', '1867',
  'Alphabetical name index of every Maine soldier with rank, company and regiment.', 'IA djvu txt 3.5 MB; columns scrambled in the plain text, coordinates would be needed.',
  'Public domain (1867).', 'IA download.', 'META', 'archive.org/details/supplementtoannu00main', 'Use as completeness check of the name universe, not for presence.')
a('U05', 'Union', 'Maine', 'Maine Adjutant General Annual Report 1864-65 (final regimental rosters, e.g. 20th Maine pp.623-661)', '1866',
  'Final-status roster of every Maine regiment (wounds, deaths, transfers with dates).', 'Not found on Internet Archive in this session (searches on identifiers and titles).',
  'Public domain.', 'Maine State Library / Maine State Archives (Digital Maine).', 'BLOCKED',
  'digitalmaine.com', 'Digital Maine answers programmatic requests with a Cloudflare bot challenge: not fetched (rule: never circumvent). A browser download by the owner, or a written request to the Maine State Archives, is the route.')
a('U06', 'Union', 'Maine', 'Maine State Archives, Digital Maine: List of Deceased Soldiers of the 20th Maine at Gettysburg (1863) and Hospital Records, 20th Maine, 1863', '1863',
  'Names of the dead and the hospital lists of one regiment.', 'PDF with transcription.', 'Item page states No Copyright - United States.',
  'Manual download only (bot challenge on automated requests).', 'BLOCKED', 'digitalmaine.com/cw_hr_20th_me/1 and /2', 'Item page read once through the fetch tool; files not downloaded.')
a('U07', 'Union', 'Pennsylvania', 'Bates, History of Pennsylvania Volunteers 1861-5, 5 vols (1869-71)', '1869',
  'All Pennsylvania units (about 66 infantry regiments at Gettysburg): field and staff, company officers and men with enlistment and fate.',
  'IA djvu txt/xml 7.9 MB per volume; same table layout family as Wisconsin.', 'Public domain.', 'IA download per volume.', 'META', 'archive.org/details/historyofpennsy00bate (vols 1-5: historyofpenn00bate, historyofpennsyl03bate, historyofpennsyl04bate)',
  'Largest single unit share of the Union army (19,321 infantry per repository OOB).')
a('U08', 'Union', 'New York', 'Annual Report of the Adjutant General of the State of New York (1863 report; Registers of New York Volunteer regiments 1893-1905)', '1863; 1893-1905',
  'Muster-in rolls and registers: name, age, enlistment, fate, for all New York regiments (67 infantry at Gettysburg).', 'IA text/xml, large; layout varies by edition.',
  'Public domain.', 'IA download per volume.', 'META', 'archive.org/details/annualreportofa1863v2newy, annualreportadj01unkngoog',
  'The 1890s Registers are the useful edition: confirm volume numbers in Stage 0. Phisterer, New York in the War of the Rebellion (IA newyorkinwarofre05phis etc.) gives unit histories and strengths.')
a('U09', 'Union', 'New York', 'New York at Gettysburg (Gettysburg Monuments Commission, 3 vols, 1900)', '1900',
  'Per-regiment histories with casualties; some regiments carry rosters.', 'IA; two items found (newyorkatgettysb00foxw is only 32 images).', 'Public domain.', 'IA download.', 'META', 'archive.org/details/newyorkatgettysb0001unse',
  'Content of rosters per regiment not inspected: Stage 0 check, because the Maine experience shows a commission volume can contain a participants list.')
a('U10', 'Union', 'all states (officers)', 'Official Army Register of the Volunteer Force of the US Army, 1861-65 (8 parts, 1865)', '1865',
  'Every volunteer officer: rank, dates, fate. Part 3 (Pennsylvania, ... ) etc.', 'IA text (1.4 MB per part).', 'Public domain.', 'IA download per part.', 'META', 'archive.org/details/cu31924092911092 (part 3) and parts 5, 6',
  'Officers only; the Maine at Gettysburg officer roster cites this register.')
a('U11', 'Union', 'Michigan', 'Record of Service of Michigan Volunteers in the Civil War, 1861-1865 (46 vols, 1905)', '1905', 'All Michigan units (7 infantry, 4 cavalry at Gettysburg).', 'IA text per volume.',
  'Public domain.', 'IA download per volume.', 'META', 'archive.org/details/recordofserviceo03mich (and 08, 22)', 'One volume per regiment: easy per-unit fetch.')
a('U12', 'Union', 'Ohio', 'Official Roster of the Soldiers of the State of Ohio in the War of the Rebellion, 12 vols (1886-95)', '1886-95', 'All Ohio units (13 infantry at Gettysburg).', 'IA text 4.3 MB per volume.',
  'Public domain (IA NOT_IN_COPYRIGHT).', 'IA download per volume.', 'META', 'archive.org/details/ohiowarroster03howerich', '')
a('U13', 'Union', 'Massachusetts', 'Massachusetts Soldiers, Sailors and Marines in the Civil War, 8 vols (1931-37)', '1931-37', 'All Massachusetts units (17 infantry at Gettysburg).', 'IA text 4.3 MB per volume.',
  'State publication; IA flags NOT_IN_COPYRIGHT; confirm US copyright status in Stage 0 (published 1931-37).', 'IA download per volume.', 'META', 'archive.org/details/massachusettssol11931mass', '')
a('U14', 'Union', 'New Jersey', 'Stryker, Record of Officers and Men of New Jersey in the Civil War, 2 vols (1876)', '1876', 'All New Jersey units (12 infantry at Gettysburg).', 'IA text 4.8 MB per volume.',
  'Public domain (IA NOT_IN_COPYRIGHT).', 'IA download per volume.', 'META', 'archive.org/details/newjerseyincivil01recorich', '')
a('U15', 'Union', 'New Hampshire', 'Ayling, Revised Register of the Soldiers and Sailors of New Hampshire (1895)', '1895', 'All NH units (3 infantry at Gettysburg).', 'IA text 5.3 MB.',
  'Public domain.', 'IA download.', 'META', 'archive.org/details/cu31924096263128', '')
a('U16', 'Union', 'Vermont', 'Revised Roster of Vermont Volunteers (1892)', '1892', 'All Vermont units (8 infantry in the 2nd Vermont Brigade at Gettysburg).', 'IA text.', 'Public domain.', 'IA download.', 'META', 'archive.org/details/cu31924080774148', '')
a('U17', 'Union', 'Connecticut', 'Catalogue of Connecticut Volunteer Organizations (1869 edition)', '1869', 'All Connecticut units (5 infantry at Gettysburg).', 'IA text.', 'Public domain.', 'IA download.', 'META', 'archive.org/details/connecticutvolorg00catarich', '')
a('U18', 'Union', 'Indiana', 'Report of the Adjutant General of the State of Indiana, 8 vols (1865-69)', '1865-69', 'All Indiana units (4 infantry in the Iron Brigade and 3rd Division at Gettysburg).', 'IA text per volume.', 'Public domain.', 'IA download per volume.', 'META', 'archive.org/details/reportindiana04dougrich', '')
a('U19', 'Union', 'Illinois', 'Report of the Adjutant General of the State of Illinois (1867)', '1867', 'Illinois units (1 infantry, 2 cavalry at Gettysburg).', 'IA text.', 'Public domain.', 'IA download.', 'META', 'archive.org/details/reportofadjutant00illi', '')
a('U20', 'Union', 'Minnesota', 'Minnesota in the Civil and Indian Wars 1861-1865 (1890-93)', '1890-93', '1st Minnesota (262 men at Gettysburg per repository OOB): full roster.', 'IA text.', 'Public domain.', 'IA download.', 'META', 'archive.org/details/minnesotacivil02minnrich', '')
a('U21', 'Union', 'Delaware, Maryland, Rhode Island, West Virginia, Regular Army, US Sharpshooters', 'No source verified', 'various',
  'About 4,800 infantry (6.9 percent of the repository Union infantry strength) plus Regular Army enlisted men.', 'Unknown.', 'Unknown.', 'To be found.', 'CANDIDATE', 'n/a',
  'Regular Army enlisted men have no state roster: NARA registers of enlistments (candidate), Heitman covers officers only.')
a('U22', 'Union', 'cavalry, artillery, staff, detachments', 'State rosters above (cavalry and batteries are ordinary state units) plus OR 27 returns for HQ, provost guard, Engineer Brigade, Signal Corps, ambulance and wagon trains', '1863',
  'Named staff in OR; wagon trains and teamsters are largely unnamed civilians.', 'OR text.', 'Public domain.', 'IA download.', 'META', 'archive.org/details/warofrebellion012701rootrich', 'Civilian teamsters and sutlers: expected Unknown.')
a('U23', 'Union', 'Army of the Potomac', 'Official Records, Series I vol 27 parts 1-3 (Gettysburg campaign): organisation, June 30 returns, casualty returns, reports', '1880-1901',
  'Army, corps, brigade strengths and casualty counts; regimental commander reports (e.g. Chamberlain 386 all told; Dawes brigade guard of 100). Abstract from returns of the Army of the Potomac, OR 27/1 p.151.',
  'IA djvu txt 4 MB per part; tables are garbled in text and need page images.', 'Public domain (IA NOT_IN_COPYRIGHT).', 'IA download.', 'FETCHED', 'archive.org/details/warofrebellion012701rootrich (part 1, parsed), warofrebellion012703rootrich (part 3), warofrebellion0027geor (Part II, Reports: downloaded, not parsed)',
  'Regiment-level strength present is rarely in OR; brigade-level is.')
a('U24', 'Union', 'all', 'Fox, Regimental Losses in the American Civil War (1889)', '1889',
  'Enrolled strength, killed and mortally wounded by battle, per regiment; Gettysburg casualty tables (Greatest Losses in Battles, pp.430-440).', 'IA text/xml.', 'Public domain.', 'IA download.', 'FETCHED', 'archive.org/details/reglossescivilwar00foxwrich',
  'No Present-at-Gettysburg figure per regiment. Counts killed only; wounded and missing appear in notes and tables for top regiments.')
a('U25', 'Union', 'all', 'Busey and Martin, Regimental Strengths and Losses at Gettysburg (4th ed., 2005; 1994 ed. on IA)', '1994/2005',
  'Present-for-duty strength and casualties for every regiment and battery on both sides.', 'Print / IA lending.', 'Copyrighted; IA item is access-restricted (lending): not read.',
  'Buy or borrow; facts may be cited, text must not be copied.', 'BLOCKED', 'archive.org/details/regimentalstreng0000john', 'The repository OOB (baseline/dist/data/oob) already cites it: its strengths (386, 344, 843 for the pilot units) are second-hand and were checked against primary text where possible.')
a('U26', 'Union', 'Gettysburg dead', 'Revised Report ... relative to the Soldiers National Cemetery at Gettysburg (1867) and cemetery registers', '1865-67',
  'Burials by state and loyal-state lots (about 3,500 Union dead): names for the killed.', 'IA text.', 'Public domain.', 'IA download.', 'META', 'archive.org/details/revisedreportma00cemegoog', 'Many graves are unknown; names are a subset of Present-Documented.')
a('U27', 'Union', 'all', 'NARA Compiled Military Service Records (Union, state series; muster rolls and cards per man)', 'RG 94',
  'Per-man abstracts of the bi-monthly company muster rolls (the only source of per-man Present/Absent status for 30 June 1863) for all Union volunteers.',
  'Microfilm images; on Fold3 (paid) and indexed on FamilySearch; NARA Catalog availability of images NOT verified.', 'NARA records are US government works; Fold3 and FamilySearch impose their own terms (see X02, X03).',
  'Stage 0 must test whether images are retrievable from the NARA Catalog API (key, 10,000 requests per month default, no scraping, no caching, bulk only via the AWS Open Data Registry).', 'CANDIDATE', 'catalog.archives.gov', 'This is the key to 100 percent per-man presence for the Union side.')
a('U28', 'Union', 'all', 'Regimental histories and memoirs with rosters or officer lists (example: Dawes 1890, list of line officers present at Gettysburg)', '1865-1925',
  'Named officers; sometimes full rolls with present marks.', 'IA text.', 'Public domain (pre-1931).', 'IA download; per unit.', 'FETCHED', 'archive.org/details/cu31924030918944 (Dawes)', 'Contains the facts that overrode the roster for Colonel Bragg and Lieutenant Hyatt in the pilot.')
# ------------------------------------------------------------------ CONFEDERATE
a('C01', 'Confederate', 'North Carolina', 'Moore, Roster of North Carolina Troops in the War between the States, 4 vols (1882)', '1882',
  'All NC units: officers and men with enlistment, county, wounds, deaths, transfers. 26th NC = vol 2 pp.362-406 (IA leaves 380-405). Gettysburg is annotated (w. at Gettysburg, k. July 1st).',
  'IA djvu txt 2.5 MB per volume; one entry per line: easiest layout of the three pilots. OCR noise in names (about 6 percent of rows on the sampled page) and some entries glued across lines.',
  'Public domain.', 'IA download per volume.', 'FETCHED', 'archive.org/details/rosterofnorthcar02nort (vol 2); rosterofnorthcar03moor, rosterofnorthcar04moor, rosternorthcaro00moorgoog',
  'Clark 1901 and Manarin both note Moore is incomplete and sometimes wrong (the pilot found 512 Gettysburg annotations for a regiment with 708 killed, wounded and missing).')
a('C02', 'Confederate', 'North Carolina', 'Clark, Histories of the Several Regiments and Battalions from North Carolina in the Great War, 5 vols (1901)', '1901',
  'Regimental histories by veterans; 26th NC chapter gives the company officers present, present-for-duty by company on the 30 June 1863 muster rolls (885), casualty totals, colour bearers.',
  'IA djvu txt ~2 MB per volume.', 'Public domain.', 'IA download per volume.', 'FETCHED', 'archive.org/details/cu31924092908544 (vol 2: 26th NC pp.303-378); other volumes cu31924092908536, historiessevera01clargoog, historiessevera00clargoog',
  'Best open source of unit-level Confederate present counts; compare with repository OOB 843.')
a('C03', 'Confederate', 'North Carolina', 'Manarin, Jordan et al., North Carolina Troops 1861-1865: A Roster, 22 vols (1966-2022)', '1966-2022',
  'The authoritative modern NC roster from compiled service records, with wounds and captures per man.', 'Print; IA copy of vol III is lending-restricted.',
  'Copyrighted (NC Office of Archives and History, UNC Press). The state publishes a free name index PDF (name: volume: page) but not the text.', 'Link-out and cross-check only; buy volumes if the owner wants them transcribed under licence.', 'BLOCKED',
  'dncr.nc.gov/explore/arts-history/office-archives-and-history/division-historical-resources/historical-publications/north-carolina-troops-1861-1865-roster', 'Page read in this session: the NC Civil War Roster Database online (launched July 2025) holds only the US Navy records so far; Confederate service records are print only.')
a('C04', 'Confederate', 'Virginia', 'Library of Virginia Confederate Pension Rolls and Disability Applications databases; Index to Virginia Confederate Rosters', '1888-1934',
  'Pension and disability applicants (about 46,000 entries): later-life records, not service rosters.', 'Searchable web database with images.', 'State library terms not read.', 'Per-name link-out; no bulk rule verified.', 'META',
  'lva.virginia.gov/public/guides/opac/conpenabout.htm', 'Does not establish presence at Gettysburg. The roster source for Virginia units is still unresolved (Howard Virginia Regimental Series is copyrighted print; IA search found nothing).')
a('C05', 'Confederate', 'Georgia', 'Henderson, Roster of the Confederate Soldiers of Georgia 1861-1865, 6 vols (1959-64)', '1959-64',
  'All Georgia infantry and some others (volunteer and regular regiments only), name, rank, fate.', 'IA copy is lending-restricted (access-restricted-item true); FamilySearch catalog shows digital volumes 1-6.',
  'Copyrighted modern compilation.', 'Not fetched. FamilySearch terms forbid bulk download without written permission (X02).', 'BLOCKED', 'familysearch.org/search/catalog/258092; archive.org/details/rosterofconfeder0003unse',
  'Georgia is 11,684 of 57,104 repository Confederate infantry.')
a('C06', 'Confederate', 'Georgia (Doles-Cook brigade)', 'Thomas, History of the Doles-Cook Brigade of Northern Virginia, containing muster rolls of each company (1903)', '1903',
  'Muster rolls of Doles brigade regiments (4th, 12th, 21st, 44th Georgia) as compiled in 1903.', 'IA text 1.4 MB.', 'Public domain (IA NOT_IN_COPYRIGHT).', 'IA download.', 'META', 'archive.org/details/historyofdolesco00thom',
  'Example of the open route for Confederate states with a restricted modern roster: contemporary compilations and unit histories.')
a('C07', 'Confederate', 'Alabama', 'Alabama Department of Archives and History: Civil War Service Database; FamilySearch index of NARA M311', '1900s-',
  'Card-file transcription from muster rolls, newspapers, pension and census records (ADAH) and an index of the compiled service records.', 'Web database; one card per source, so one man can have several entries.',
  'Terms not read (search snippets only).', 'Unknown: ask ADAH.', 'CANDIDATE', 'museum.alabama.gov/research/CivilWarService.aspx', 'Alabama 5,837 repository infantry.')
a('C08', 'Confederate', 'Mississippi', 'Mississippi Department of Archives and History Confederate records (RG 9, Series 608 finding aid); NARA M269 on Fold3', '1861-65',
  'Compiled service records on microfilm; no free MDAH name database found.', 'Finding aid, microfilm.', 'Not read.', 'Ask MDAH; Fold3 link-out only.', 'CANDIDATE', 'finding.mdah.ms.gov/government-records/series-608', 'Mississippi 4,593 infantry.')
a('C09', 'Confederate', 'South Carolina', 'FamilySearch index of NARA M267 (SC compiled service records); Broadfoot Roster of Confederate Soldiers (print)', '1861-65',
  'Compiled service records index; Broadfoot 2-vol SC extract is copyrighted print.', 'FamilySearch web; print.', 'FamilySearch terms (X02); Broadfoot copyrighted.', 'Link-out; written permission for bulk.', 'CANDIDATE', 'familysearch.org/search/collection/1849624', 'South Carolina 4,064 infantry.')
a('C10', 'Confederate', 'Louisiana', 'Booth, Records of Louisiana Confederate Soldiers and Louisiana Confederate Commands, 3 vols (1920)', '1920',
  'All Louisiana units (10 infantry at Gettysburg: Hays brigade, Nicholls/Stafford etc.).', 'IA text 2.2 MB.', 'Published 1920: public domain.', 'IA download.', 'META', 'archive.org/details/recordsofl00loui',
  'Louisiana 2,399 infantry. Booth is known to be incomplete: expect Unknown.')
a('C11', 'Confederate', 'Texas, Florida, Tennessee, Arkansas, Maryland', 'No source verified', 'various', 'About 3,500 infantry (6 percent).', 'Unknown.', 'Unknown.', 'To be found (Hood brigade rosters, Florida and Arkansas state rosters).', 'CANDIDATE', 'n/a', '')
a('C12', 'Confederate', 'artillery, cavalry, staff', 'State rosters above (artillery and cavalry are ordinary state units); ANV staff from OR 27 part 2', '1863', 'About 90 batteries and cavalry regiments plus HQ.', 'OR text.', 'Public domain.', 'IA download.', 'META',
  'archive.org/details/warofrebellion0027geor', 'Artillery battalions: names from state rosters are mixed into infantry columns; mapping to battery needed.')
a('C13', 'Confederate', 'all', 'NARA Compiled Military Service Records of Confederate soldiers (state M-series, e.g. M270 North Carolina, M267 South Carolina, M269 Mississippi, M311 Alabama; M253 consolidated index)', 'RG 109',
  'Per-man abstracts of muster rolls: the Confederate equivalent of U27. Gettysburg-era rolls survive unevenly.', 'Fold3 (paid, 207,719 records for NC); FamilySearch free with account, index credited to Fold3.', 'Fold3: automated access beyond human use is prohibited and content may not train AI (read). FamilySearch: no bulk download or scraping without written permission (read).',
  'Link-out only unless FamilySearch gives written permission (reply in about 45 days per its terms page).', 'TERMS', 'familysearch.org/search/collection/1932376; fold3.com/publication/37', 'Share of 30 June 1863 Confederate muster rolls that survive is unmeasured (record loss, PLAN section 2).')
a('C14', 'Confederate', 'prisoners', 'NARA RG 109 Selected Records of the War Department relating to Confederate Prisoners of War (microfilm: Fort Delaware reels 53-64, Point Lookout reel 130, Johnson Island reel 84); Fort McHenry', '1863-65',
  'Names of Gettysburg prisoners with date and place of capture.', 'Microfilm; IA has a scan page.', 'Public domain; image-only.', 'Per-reel, IA.', 'META', 'archive.org/details/selectedrecordso0096unit', 'Prisoners of Gettysburg are Present-Documented by definition.')
a('C15', 'Confederate', 'Gettysburg dead', 'Hollywood Cemetery Richmond (Gettysburg dead reburied 1872-73), Ladies Memorial Associations lists, Weaver lists', '1864-1873', 'Names of the Confederate dead from Gettysburg.', 'Not located.', 'Unknown.', 'Unknown.', 'CANDIDATE', 'n/a', 'IA search for Hollywood Cemetery found only a 1893 historical sketch (archive.org/details/historicalsketch00bigg): lists not located.')
a('C16', 'Confederate', 'all', 'Confederate Military History (1899), state volumes', '1899', 'Narrative, some roster lists.', 'IA text.', 'Public domain.', 'IA download.', 'META', 'archive.org/details/confedmilhist08evanrich', 'Not a roster.')
# ------------------------------------------------------------------ CROSS-ARMY / ACCESS
a('X01', 'both', 'all', 'NPS Civil War Soldiers and Sailors System (CWSS)', '1990s-2014',
  'About 6.3 million index records (name, side, unit, company; rank on the underlying cards) built from the NARA General Index Cards; the page says historians estimate about 3.5 million men served, the surplus being men in several units or with spelling variants.', 'Web search only; stated as no longer maintained (page last updated May 2014).',
  'Pages read (overview, database page, NPS disclaimer): no reuse terms, no API, no bulk download stated; NPS-created material generally public domain but not all content; volunteers and the Genealogical Society of Utah/FGS edited the data. The task rule says use needs written NPS permission.',
  'Do not scrape. Route: the NPS Civil War program Contact Us form (nps.gov/subjects/civilwar/contactus.htm) and the general NPS contacts page: ask in writing for a name-level extract of the Gettysburg units under a stated licence, quoting the NPS disclaimer; keep the reply on file. nps.gov/robots.txt disallows /search/ only.', 'TERMS',
  'nps.gov/civilwar/soldiers-and-sailors-database.htm; nps.gov/subjects/civilwar/soldiers-and-sailors-overview.htm; nps.gov/aboutus/disclaimer.htm',
  'The page itself warns that linking a man to a regiment does not show he was at a battle.')
a('X02', 'both', 'all', 'FamilySearch (Civil War service record indexes, digital library volumes)', 'n/a', 'Indexes to NARA state series (NC, SC, AL, MS and more) and digital copies of printed rosters.', 'Web; free account.',
  'Terms read: no bulk download or scraping without prior written permission; no circumventing controls; personal, noncommercial viewing only; permission requests answered in about 45 days.', 'Per-name deep links only; written permission for anything else.', 'TERMS', 'familysearch.org/en/terms', 'robots.txt disallows record pages (/ark:/61903/1:).')
a('X03', 'both', 'all', 'Fold3, Find a Grave (both under Ancestry terms)', 'n/a', 'CMSR images (Fold3); grave records (Find a Grave).', 'Web.',
  'Terms read (Ancestry terms section 1.3): no automated or programmatic access beyond standard human use, no reproduction, no use to train AI systems; more than a small number of public-domain images needs written permission.', 'Link-out only, as the brief says.', 'TERMS', 'ancestry.com/c/legal/termsandconditions', '')
a('X04', 'both', 'all', 'NARA Catalog API and AWS Open Data copy of the Catalog', 'n/a', 'Descriptions, digital object metadata, OCR text, transcriptions.', 'JSON API.',
  'Terms read: API key required; 10,000 queries per month default; scraping or downloading the whole Catalog through the API is not allowed (bulk via AWS Open Data Registry); content should not be cached; not-endorsed-by-NARA notice required.', 'Key and small targeted queries only.', 'TERMS', 'archives.gov/research/catalog/help/api', 'Stage 0 question: are the M-series CSR images served by the Catalog?')
a('X05', 'both', 'all', 'Library of Congress (loc.gov)', 'n/a', 'Maps, photographs, some Civil War rosters.', 'Web/API.', 'Terms read: at most 10 requests per minute; robots.txt honoured; rights per item. robots.txt shows Crawl-Delay 5.', 'Rate-limited, polite.', 'TERMS', 'loc.gov/legal', 'Not used in the pilot.')
a('X06', 'both', 'all', 'Internet Archive full texts, djvu.xml and page images', 'n/a', 'Every PD source above.', 'djvu.xml has word boxes; _hocr.html on these items is also ABBYY-derived, so it is NOT a second OCR; page images at archive.org/download/ID/page/nN_w1500.jpg.',
  'robots.txt disallows only /control/ and /report/. Per-item possible-copyright-status is shown in metadata; items with access-restricted-item true are lending copies and are not used.', 'One request per file, 1.5-3 s between requests, identifying User-Agent, cache on disk.', 'FETCHED', 'archive.org', 'Used for all pilot data. Page image index n equals the djvu page index minus 1.')
a('X07', 'both', 'blocked by rule', 'ehistory.osu.edu, HathiTrust babel, Perseus, civilwartalk', 'n/a', 'n/a', 'n/a', 'Blocked by the brief', 'Not touched.', 'BLOCKED', 'n/a', 'The Hathi copy of the Maine 1864-65 report, if any, is therefore not an option.')
a('X08', 'both', 'Gettysburg', 'Gettysburg-specific indexes: state Gettysburg commission volumes (Maine verified), Pennsylvania at Gettysburg (IA cu31924092925035), Michigan at Gettysburg (IA cu31924030924736), New York at Gettysburg, Soldiers National Cemetery, Camp Letterman hospital records', '1889-1904',
  'Participants lists, casualty lists, burial lists.', 'IA text.', 'Public domain.', 'IA download.', 'META', 'archive.org', 'Content per volume not inspected except Maine. Priority Stage 1 check.')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(H)
    w.writerows(R)
print(len(R), 'rows')
from collections import Counter
print(Counter(r[9] for r in R))
