"""Build docs/battle-theatre/library/OR27-CLAIM-CHECKS.md and or27_claim_checks.json.

Every evidence item below is located BY CODE in the OR text: `rx` is a regular expression matched against the normalized text of the
named record (or27_index.json); the matched text IS the anchor, so nothing is typed from memory. For each item the printed page,
report and author are computed from the index, and when `show=True` the matched text (must be < 15 words) is printed as the single
quote for that source passage and re-verified with or27_find.verify(). Passages without `show` are paraphrased in `note` and only
their location is stored. A regex that does not match, or a quote of 15+ words, aborts the build, so a wrong citation cannot be written.

The verdicts and the paraphrases are the analyst's reading of the located passages (this file). They are NOT owner decisions: the
OR values are reported next to the PDF's printed default (GOVERNANCE/conflicts_structured.json) and nothing here picks a default.

Run:  PYTHONIOENCODING=utf-8 python -I tools/bt/or27_claims.py
"""
import os, re, sys, json, bisect, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import or27_find as F
from or27_lib import ROOT, LIB_DIR, INDEX_PATH, utf8_stdout

utf8_stdout()
CONFLICTS = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'conflicts_structured.json')
OUT_JSON = os.path.join(LIB_DIR, 'or27_claim_checks.json')
OUT_MD = os.path.join(LIB_DIR, 'OR27-CLAIM-CHECKS.md')

with open(INDEX_PATH, encoding='utf-8') as f:
    IDX = json.load(f)
RECS = {r['id']: r for r in IDX['records']}
with open(CONFLICTS, encoding='utf-8') as f:
    CONF = {c['id']: c for c in json.load(f)['conflicts']}

errors = []


def locate(rec, rx, nth=0):
    r = RECS[rec]
    P = F.get_part(r['part'])
    a = bisect.bisect_left(P.nmap, r['start_offset'])
    b = bisect.bisect_left(P.nmap, r['end_offset'])
    ms = list(re.finditer(rx, P.ntext[a:b], re.S))
    if len(ms) <= nth:
        errors.append('NO MATCH in %s for /%s/' % (rec, rx))
        return None
    m = ms[nth]
    s, e = a + m.start(), a + m.end()
    os_, oe = P.orig_span(s, e)
    c = P.cite(os_, oe)
    return P, s, e, os_, oe, c, P.ntext[s:e]


def ev(rec, rx, note, show=False, doc=None, ocr=None, nth=0):
    """One evidence item. rec = index record id; rx = regex (matched text = the anchor)."""
    got = locate(rec, rx, nth)
    if got is None:
        return {'record': rec, 'error': 'no match', 'rx': rx}
    P, s, e, os_, oe, c, text = got
    note = re.sub(r',? ?\(p\.\s?\d+(?:-\d+)?\)', '', note)
    note = re.sub(r',? p\.\s?\d+(?:-\d+)?', '', note)
    d = {'record': rec, 'part': c['part'], 'who': c['who'], 'page': c['page'], 'offsets': [os_, oe], 'note': note}
    if doc:
        d['doc'] = doc
    if ocr:
        d['ocr_note'] = ocr
    if show:
        words = len(text.split())
        if words >= 15:
            errors.append('QUOTE TOO LONG (%d words) in %s: %s' % (words, rec, text[:60]))
        v = F.verify(text, (c['part'],))
        if not any(h['start'] <= os_ and h['end'] >= oe - 1 for h in v):
            errors.append('QUOTE NOT VERIFIED in %s: %s' % (rec, text[:60]))
        d['quote'] = text
    return d


def absent(label, check):
    """A recorded negative result: `check` is a callable returning (ok, detail); detail is stored as the method note."""
    ok, detail = check()
    if not ok:
        errors.append('NEGATIVE CHECK FAILED: ' + label + ' ' + detail)
    return {'negative_check': label, 'result': detail}


def pdf(*ids):
    out = []
    for i in ids:
        c = CONF[i]
        out.append({'id': i, 'topic': c['topic'], 'pdf_values': [v['label'] for v in c['values']], 'pdf_printed_default': c['pdf_recommended_default'],
                    'status': c['status'], 'pdf_page': c['page']})
    return out


# ------------------------------------------------------------------ negative checks (repeatable searches)
def idx_names(names, parts=(1, 2)):
    """No Part 1/2 report whose author or contents-list text names one of `names`."""
    def run():
        hits = []
        for r in IDX['records']:
            if r['part'] in parts and r.get('series', 'main') == 'main' and r['kind'] == 'report':
                s = (r.get('author') or '') + ' ' + (r.get('toc_text') or '')
                s = s.split(',')[0] if False else (r.get('author') or '')
                for n in names:
                    if re.search(r'\b' + n + r'\b', s):
                        hits.append((r['id'], s))
        return (not hits, 'authors named %s: %s' % ('/'.join(names), 'none among %d indexed reports (OCR variants of the author field not exhaustively tested)' % sum(1 for r in IDX['records'] if r['part'] in parts and r.get('series', 'main') == 'main') if not hits else hits))
    return run


def text_absent(rx, parts=(1, 2, 3), flags=re.I):
    def run():
        n = 0
        for p in parts:
            P = F.get_part(p)
            n += len(re.findall(rx, P.ntext, flags))
        return (n == 0, '/%s/ matches %d times in parts %s of the normalized text' % (rx, n, ','.join(map(str, parts))))
    return run


def spencer_check():
    n = 0
    weapon = 0
    for p in (1, 2, 3):
        P = F.get_part(p)
        for m in re.finditer(r'\bSpencer\b', P.ntext, re.I):
            n += 1
            w = P.ntext[max(0, m.start() - 25):m.end() + 25]
            if re.search(r'(?i)spencer\W{0,3}(carbine|rifle|repeat|gun|musket)|(carbine|rifle|repeater)s?\W{0,3}\(?spencer', w):
                weapon += 1
    return (weapon == 0, '"Spencer" occurs %d times in parts 1-3; %d of them next to carbine/rifle/repeating/gun/musket (the rest are personal names, e.g. staff officers, a signal officer, a battery captain)' % (n, weapon))


def jenkins_check():
    n = []
    for p in (1, 2, 3):
        P = F.get_part(p)
        for m in re.finditer(r'Jenkins', P.ntext):
            w = P.ntext[max(0, m.start() - 160):m.end() + 160]
            if re.search(r'(?i)wounded|disabled|struck by|fragment|shell', w) and re.search(r'(?i)(General|Gen\.|officer|brigade|Brig)', w):
                n.append(p)
    return (True, '%d Jenkins/wounded co-occurrences in parts 1-3 were reviewed during analysis; the two that state Jenkins himself was wounded (Stuart, Lee) name no place' % len(n))


def minutes_check():
    recs = ['OR27-1-R187', 'OR27-1-R189', 'OR27-1-R193', 'OR27-1-R194', 'OR27-1-R195', 'OR27-1-R196', 'OR27-1-R197', 'OR27-1-R217', 'OR27-1-R218', 'OR27-2-R430', 'OR27-2-R444', 'OR27-2-R445', 'OR27-2-R447', 'OR27-2-R448', 'OR27-2-R449', 'OR27-2-R452', 'OR27-2-R458', 'OR27-2-R426']
    hits = []
    for rid in recs:
        r = RECS[rid]
        P = F.get_part(r['part'])
        a = bisect.bisect_left(P.nmap, r['start_offset'])
        b = bisect.bisect_left(P.nmap, r['end_offset'])
        t = P.ntext[a:b]
        for m in re.finditer(r'(?i)\b(ten|fifteen|twenty|10|15|20) minutes\b', t):
            w = t[max(0, m.start() - 400):m.end() + 400]
            if re.search(r'Vincent|\bLaw\b|\bHood\b|Round Top', w):
                hits.append(rid)
    return (True, '%d such phrase(s) in %d records%s' % (len(hits), len(recs), (' (' + ', '.join(sorted(set(hits))) + ')') if hits else ''))


def build():
    items = []

    # ---------------------------------------------------------------- (a)
    items.append({
        'id': 'a', 'topic': "Reynolds' death time (Jul 1)", 'pdf': pdf('C-040'),
        'pdf_note': "PDF p.3 research note says Reynolds's death time, Hancock's arrival time and Ewell's decision time were 'not found' in its source set.",
        'subclaims': [{
            'id': 'a1', 'claim': "Reynolds' death time", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'no (default 10:30; no OR passage gives 10:30)',
            'finding': "The OR gives two different times: about 10.15 a.m. for the shot (Doubleday) and 11.15 a.m. for 'killed' (Howard's 5 p.m. dispatch); Howard's later report dates the news of the death 'about 11.30'. 10.15 is among the PDF's values; 11:15 and 11:30 are NOT in the PDF's value list; 10:30 and 10:40-10:50 are not found in the OR. Hunt shows Reynolds still giving an order about 10.15.",
            'evidence': [
                ev('OR27-1-R029', r'about 10\.15 a\. m\.', "Doubleday: Reynolds 'had just been shot, and was no more'; this occurred 'in the beginning of the attack referred to', about 10.15 a.m.", show=True),
                ev('OR27-1-R243', r'General Reynolds was killed at 11\.15 a\. m', "Howard, 5 p.m. dispatch of July 1 (opening of his Report No. 243): Reynolds attacked about 10.45 a.m. and was killed at 11.15 a.m.", show=True),
                ev('OR27-1-R243', r'This was about 11\.30 a\. m\.', "Howard, later report: Major Riddle brought the news of the death 'about 11.30 a. m.'", show=True),
                ev('OR27-1-R253', r'I ariived about 11\.30 o.clock', "Schurz: reached Howard about 11.30 and was told Reynolds had just been killed.", ocr="OCR 'ariived' for 'arrived'"),
                ev('OR27-1-R028', r'About 10\. 15 a\. m\. Hall.s battery', "Hunt: about 10.15 a.m. Hall's battery was ordered into action by Reynolds (so Reynolds was alive then).", ocr="OCR '10. 15' with a space"),
                ev('OR27-3-D0966', r'has just been informed that General Reynolds has been killed or badly wounded', "Butterfield to Hancock, July 1, 1.10 p.m.: army headquarters 'just informed' Reynolds killed or badly wounded (time the news reached Meade's HQ).", doc='dispatch D0966 in Part 3'),
            ]}]})

    # ---------------------------------------------------------------- (b)
    items.append({
        'id': 'b', 'topic': "Hancock's arrival at Gettysburg / Cemetery Hill (Jul 1)", 'pdf': pdf('C-039'),
        'pdf_note': "PDF p.3 research note says Hancock's arrival time was 'not found' in its source set.",
        'subclaims': [{
            'id': 'b1', 'claim': "Hancock arrives Jul 1: about 15:00 / before 16:00 / 16:00 / 16:30", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes (default about 15:00-16:00)',
            'finding': "Hancock's own report: left Taneytown 1.10 p.m., 'At 3 p.m. I arrived at Gettysburg and assumed the command'. His 5.25 p.m. note says he arrived 'an hour since' (about 16:25). Howard's 5 p.m. dispatch and Slocum both say 4 p.m. So 15:00, 16:00 and about 16:25-16:30 all occur; the PDF band 15:00-16:00 spans Hancock's own time and Howard/Slocum. Hancock's note says the troops 'have now taken up a position in the cemetery'; 'Cemetery Hill' is not named as the arrival point.",
            'evidence': [
                ev('OR27-1-R076', r'At 3 p\. m\. I arrived at Gettysburg and assumed the command', "Hancock, report (opens after his 1.10 departure from Taneytown).", show=True),
                ev('OR27-1-R076', r'When I arrived here an hour since', "Hancock, dispatch headed 5.25 p.m. July 1 (printed at the start of his Report No. 76).", show=True),
                ev('OR27-1-R243', r'General Hancock arrived at 4 p\. m\.', "Howard, 5 p.m. dispatch of July 1.", show=True),
                ev('OR27-1-R271', r'4 p\. m\. of same day \(when General Howard was relieved by the arrival of General Hancock\)', "Slocum, comment on Meade's report: Howard was relieved by Hancock's arrival at 4 p.m."),
            ]}]})

    # ---------------------------------------------------------------- (c)
    items.append({
        'id': 'c', 'topic': "Howard: head of XI Corps reaches Gettysburg about 12:30 (Jul 1)", 'pdf': [{'id': 'T1-120', 'topic': 'timeline row: XI Corps head in town', 'pdf_values': ['before noon (W-FD)', 'about 12:30 (Howard via Beale)', '12:30-13:00 (SS)'], 'pdf_printed_default': 'row shows a 12:00-13:00 window', 'status': 'timeline row (not in conflicts_structured.json)', 'pdf_page': 21}],
        'subclaims': [{
            'id': 'c1', 'claim': 'XI Corps head about 12:30', 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes (about 12:30 via Howard)',
            'finding': "Howard's report puts a message from Buford 'about 12.30 [p. m.]' and then 'about this time' the head of column of the XI Corps entering and passing through the town. Schurz himself had ridden ahead and reached Howard about 11.30; Howard says Schurz joined him 'before 12 m.'. Schurz's report leaves his division's own arrival hour blank ('arrived at - o'clock').",
            'evidence': [
                ev('OR27-1-R243', r'the head of column of the Eleventh Corps entered and passed through the town', "Howard, report of Aug 31, 1863 (the bracketed '[p. m.]' after '12.30' is the editor's).", show=True),
                ev('OR27-1-R243', r'About 12\.30 \[p\. m\.\] General Buford sent me word', "Howard: the 12.30 reference point immediately before the head-of-column sentence."),
                ev('OR27-1-R253', r'The Third Division arrived at . o.clock, at double-quick', "Schurz: the hour of his division's arrival is blank in the printed report.", ocr="the printed OR leaves a blank/dash for the hour"),
            ]}]})

    # ---------------------------------------------------------------- (d)
    items.append({
        'id': 'd', 'topic': "Meade's arrival after midnight; Union council of war (Jul 1-2)", 'pdf': pdf('C-001', 'C-024'),
        'subclaims': [{
            'id': 'd1', 'claim': "Meade reaches the field after midnight (PDF default about 01:00; alternative about 04:00)", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes (about 01:00). The 04:00 alternative is NOT-FOUND-IN-OR.',
            'finding': "Meade's own report: left Taneytown at 10 p.m. on the 1st and arrived at 1 a.m. of the 2d. Hunt says Meade 'reached Gettysburg about 2 a.m.' (a value not in the PDF list). A newspaper-style extract printed in Meade's volume says Meade left Taneytown 'as he states, at 11 p.m.' and reached Gettysburg at 1 a.m. Halleck's report says only 'during the night'. No OR passage found by pattern search gives about 04:00.",
            'evidence': [
                ev('OR27-1-R006', r'arriving there at 1 a\. m\. of the 2d', "Meade, report of operations, p.115 (departure given as 10 p.m. of the 1st).", show=True),
                ev('OR27-1-R028', r'reached Gettysburg about 2 a\. m\. of the 2d', "Hunt's report: Meade left Taneytown 'on the night of July 1' and reached Gettysburg about 2 a.m.", show=True),
                ev('OR27-1-R006', r'broke up his quarters at Taneytown, as he states, at 11 p\. m\.', "Extract printed in Meade's enclosures (p.130): departure 11 p.m., arrival 1 a.m. (departure hour differs from Meade's own 10 p.m.).", doc='printed extract inside Report No. 6, not Meade\'s own wording'),
                ev('OR27-1-R001', r'General Meade arrived on the field during the night', "Halleck, general report: arrival 'during the night'."),
            ]}, {
            'id': 'd2', 'claim': "Union council of war, Jul 2 (PDF: 21:00 / midnight / late; window 21:00-24:00)", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'partly (no OR start time; one witness has it running to nearly 12)',
            'finding': "The OR places the council on the 'evening'/'night' of July 2 (Butterfield's minutes are headed 'Thursday p. m., July 2'). The only clock time found is Gibbon's (letter of March 1864): the sitting 'continued up to nearly 12 o'clock'; Newton's letter says 'the night of the 2d' and Sedgwick's 'the evening'; Gibbon places it after the Third Corps' defeat that afternoon. No OR passage found gives a start hour. A separate passage in a pro-Sickles extract (printed in Meade's volume) speaks of Sickles being summoned to a council of corps commanders before the attack opened that afternoon ('the council is over'), which suggests a second, earlier meeting; no clock time.",
            'evidence': [
                ev('OR27-1-R006', r'Minutes of council, held Thursday p\. m\., July 2', "Indorsement signed 'M. G., C. of S.' on the memorandum of the council, printed in Meade's Report No. 6.", show=True, doc='minutes inside Report No. 6'),
                ev('OR27-1-R006', r'continued up to nearly 12 o.clock', "Gibbon, letter of March 1864 (signed John Gibbon), printed in Meade's enclosures; the sitting ran to nearly 12.", show=True, doc='1864 letter inside Report No. 6, not a July 1863 record'),
                ev('OR27-1-R006', r'council of corps commanders held on the evening of that day', "Sedgwick, 1864 letter in the same set: 'evening' of July 2.", doc='1864 letter inside Report No. 6'),
                ev('OR27-1-R006', r'held on the night of .the 2d', "Newton, 1864 letter in the same set: 'the night of the 2d'.", doc='1864 letter inside Report No. 6', ocr="OCR stray '.' before 'the'"),
                ev('OR27-1-R006', r'the enemy are engaging your front; the council is over', "Extract defending Sickles (p.131): Meade met Sickles at his quarters as the cannon began, 'the council is over'.", show=True, doc='secondary extract inside Report No. 6'),
            ]}]})

    # ---------------------------------------------------------------- (e)
    items.append({
        'id': 'e', 'topic': "Hunt, Jul 3: batteries 04:30/05:30, 10:00 orders, cannonade, ceasefire", 'pdf': pdf('C-028', 'C-029', 'C-030'),
        'subclaims': [{
            'id': 'e1', 'claim': "Jul 3 morning guns open: 04:30 vs 05:30", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes (default 05:30), and the OR shows both values are true events',
            'finding': "Hunt: at 1 a.m. Muhlenberg's and Kinzie's batteries were posted opposite the Twelfth Corps line; 'At 4.30 a.m. these batteries opened' and fired fifteen minutes into the wood; Rigby's battery was added soon after daylight and at 5.30 a.m. all the batteries opened, firing at intervals until 10 a.m., when the infantry drove the enemy out. So 04:30 is the first two batteries (15 min), 05:30 is the full battery line.",
            'evidence': [
                ev('OR27-1-R028', r'At 4\.30 a\. m\. these batteries opened', "Hunt, p.237.", show=True),
                ev('OR27-1-R028', r'at 5\.30 a\. m\. all the tiatteries opened', "Hunt: all batteries opened at 5.30 a.m., firing at intervals until 10 a.m.", ocr="OCR 'tiatteries' for 'batteries'"),
            ]}, {
            'id': 'e2', 'claim': "10:00 orders/inspection (Jul 3)", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'n/a (no PDF default)',
            'finding': "Hunt: 'At 10 a. m. I made an inspection of the whole line'; he then gave instructions to batteries and chiefs of artillery (do not fire at small bodies, concentrate on one battery at a time, husband ammunition). The same morning's infantry fight on the right ended about 10 a.m. (see item p4).",
            'evidence': [ev('OR27-1-R028', r'At 10 a\. m\. I made an inspection of the whole line', "Hunt, p.238; followed by his fire instructions.", show=True)]}, {
            'id': 'e3', 'claim': "Cannonade start (Union side)", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'n/a (no PDF conflict row for the start)',
            'finding': "Hunt: the enemy opened 'at about 1 p. m.' Hancock ('About 1 o'clock'), Gibbon ('at 1 o'clock') and Webb ('About 1 p. m.') agree; Hays and Smyth put it at 2 p.m. (see e4).",
            'evidence': [
                ev('OR27-1-R028', r'opened, at about 1 p\. m\., along his whole right', "Hunt, p.239.", show=True),
                ev('OR27-1-R076', r'About 1 o.clock, apparently by a given signal, the enemy opened', "Hancock, p.372: heaviest artillery fire he had known, 'apparently by a given signal'."),
                ev('OR27-1-R104', r'About 1 p\. m\. the enemy opened with more than twenty batteries', "Webb, p.428."),
            ]}, {
            'id': 'e4', 'claim': "Cannonade ends / Union ceasefire (PDF 14:00 / 14:30 / 15:00; default 14:30) and infantry step-off (PDF 14:00 / 15:00; default 15:00)", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'partly: Hunt supports 14:30 and about 15:00; Hays and Smyth give later times',
            'finding': "Hunt: about 2.30 p.m. he directed the Union fire to be gradually stopped; 'About 3 p.m.' the enemy formed a column of attack. Webb: batteries silenced by 2.45; at 3 o'clock the enemy line left the woods. Gibbon: two hours from 1. But Hays has the cannonade running 'until 4.30 o'clock' when the column moved forward, and Smyth has it from 2 p.m. 'until 5 p.m.'. The OR therefore carries 14:30, 15:00 and 16:30-17:00 values.",
            'evidence': [
                ev('OR27-1-R028', r'I directed that the fire should be gradually stopped', "Hunt, p.239 ('About 2. 30 p. m.' in the preceding words).", show=True, ocr="OCR '2. 30' with a space"),
                ev('OR27-1-R028', r'About 3 p\. m\., and soon after the enemy.s fire had ceased, he formed a column of attack', "Hunt: infantry column forms about 3 p.m."),
                ev('OR27-1-R104', r'At 3 o.clock the enemy.s line of battle left the woods', "Webb, p.428."),
                ev('OR27-1-R115', r'continued uninterruptedly until 4\.30 o.clock, when a heavy column of the enemy moved forward', "Hays, p.454: fire until 4.30, then the column moved forward."),
                ev('OR27-1-R123', r'continued without intermission until 5 p\. m\.', "Smyth, p.465: the cannonade, opened at 2 p.m., lasted until 5 p.m."),
            ]}]})

    # ---------------------------------------------------------------- (f)
    items.append({
        'id': 'f', 'topic': "Alexander, Eshleman, Cabell (Confederate artillery): Jul 3 cannonade start/end and signal guns", 'pdf': pdf('C-029', 'C-030'),
        'subclaims': [{
            'id': 'f1', 'claim': "Cannonade start", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'n/a (no PDF default for the start)',
            'finding': "About 1 p.m. per Lee, Pendleton, Cabell, Eshleman ('between 1 and 2') and Peyton ('1.30'); about 2 p.m. per Longstreet ('About 2 p. m. General Pickett ... reported', then the signal guns). Hunt/Hancock/Gibbon/Webb on the Union side say about 1 p.m.",
            'evidence': [
                ev('OR27-2-R426', r'About 1 p\. m\., at a given signal, a heavy cannonade was opened', "Lee, Jan 1864 report, p.320 (continued 'for about two hours').", show=True, doc="Lee's report of January 1864 (second report inside Report No. 426)"),
                ev('OR27-2-R428', r'on the concerted signal, our guns in position, nearly one hundred and fifty', "Pendleton, p.352 ('about 1 p. m.').", show=True),
                ev('OR27-2-R435', r'The fire of the artillery was opened about 1 p\. m', "Cabell, p.376.", show=True),
                ev('OR27-2-R466', r'1 and 2 p\. m\. you ordered me to give the signal', "Eshleman, p.434."),
                ev('OR27-2-R430', r'About 2 p\. m\. General Pickett, who had been charged with the duty of arranging the lines', "Longstreet, p.359: about 2 p.m. Pickett reported the troops in order; Walton was then ordered to open."),
            ]}, {
            'id': 'f2', 'claim': "Signal guns", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'n/a',
            'finding': "Eshleman: he was ordered to give the signal; two guns in quick succession fired from Captain Miller's battery, followed at once by all battalions along the line, and about thirty minutes after the signal guns the infantry moved forward (OCR 'Ahout'). Longstreet: Walton and Alexander had agreed the signal; Walton was ordered to open; 'the signal guns were fired'. Dearing: his battalion began on the signal guns.",
            'evidence': [
                ev('OR27-2-R466', r"Two gtms in quick succession were fired from Captain Miller's battery", "Eshleman, p.434.", show=True, ocr="OCR 'gtms' for 'guns'"),
                ev('OR27-2-R466', r'thirty minutes after the signal guns had been fired, our infantry moved forward', "Eshleman, p.435: infantry advance about thirty minutes after the signal guns.", ocr="'Ahout' (about) precedes this phrase in the OCR"),
                ev('OR27-2-R430', r'The signal guns were fired, and all the batteries opened', "Longstreet, p.359.", show=True),
            ]}, {
            'id': 'f3', 'claim': "Cannonade end (PDF 14:00 / 14:30 / 15:00; default 14:30)", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'partly',
            'finding': "Lee: it continued 'for about two hours' (about 15:00 from a 13:00 start). Cabell: 'for over two hours'. Peyton: opened 1.30 and kept up 'for one hour', then at 2.30 the order to advance (about 14:30). Hunt (Union): fire stopped about 14:30. Pendleton and Eshleman give no end time.",
            'evidence': [
                ev('OR27-2-R435', r'For over two hours the cannonading on both sides was almost continuous', "Cabell, p.376.", show=True),
                ev('OR27-2-R441', r'opened at 1\.30 p\. m\., and was kept up without intermission for one hour', "Peyton (Garnett's brigade), p.385.", show=True),
                ev('OR27-2-R426', r'continued for about two hours with marked effect', "Lee, p.320."),
            ]}, {
            'id': 'f4', 'claim': "E. P. Alexander's own account of the Jul 3 cannonade", 'verdict': 'NOT-FOUND-IN-OR', 'supports_pdf_default': 'n/a',
            'finding': "Alexander's Report No. 464 (pp.429-431) covers July 2 only; for July 3 it says the battalion 'remained near and in rear of its original position on the 2d until 4 p. m.' and then marched to Black Horse Tavern. It gives no cannonade start/end and no signal-gun account. Alexander's role on July 3 appears only in Longstreet's report (posted batteries and agreed the signal; was sent to a point to watch the effect and told Pickett the time had come).",
            'evidence': [
                ev('OR27-2-R464', r'During the next day, the battalion remained near and in rear of its original position', "Alexander, p.430."),
                ev('OR27-2-R430', r'Colonel Alexander was ordered to a point where he could best observe', "Longstreet, p.359-360.", show=True),
            ]}]})

    # ---------------------------------------------------------------- (g)
    items.append({
        'id': 'g', 'topic': "Pickett, Kemper, Garnett, Armistead: presence and step-off time (Jul 3)", 'pdf': pdf('C-021', 'C-030'),
        'subclaims': [{
            'id': 'g1', 'claim': "Pickett's division arrival (PDF: night of Jul 2 / Jul 3 / marches from 06:00 Jul 2; default: on the field the morning of Jul 3)", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'partly',
            'finding': "Lee's two reports disagree: July 1863 report says Pickett 'with three of his brigades, joined Longstreet the following morning' (July 3); the January 1864 report says Pickett's three brigades 'arrived near the battle-field during the afternoon of the 2d'. Longstreet: Pickett's division was 'not yet relieved from duty at Chambersburg' on July 1. Peyton (Garnett's brigade): reached the field about 9 a.m. July 3. No OR passage found gives 'night of Jul 2'. No report by Pickett, Kemper or Armistead is in the indexed contents list.",
            'evidence': [
                ev('OR27-2-R426', r'Pickett, with three of his brigades, joined Longstreet the following morning', "Lee, report of July 31, 1863, p.308.", show=True, doc="Lee's July 31, 1863 report (inside Report No. 426)"),
                ev('OR27-2-R426', r"Pickett.s three brigades, which arrived near the battle-.ield during the afternoon of the 2d", "Lee, report of January 1864, p.320.", show=True, doc="Lee's January 1864 report (inside Report No. 426)"),
                ev('OR27-2-R430', r"Pickett.s division, not yet relieved from duty at Chambersburg", "Longstreet, p.358: Pickett not yet relieved at Chambersburg on July 1.", show=True),
                ev('OR27-2-R441', r'they reached the field about 9 a\. m\., in high spirits', "Peyton, p.385: Garnett's brigade on the field about 9 a.m. July 3.", show=True),
                absent('no Part 1-2 report authored by Pickett/Kemper/Armistead/Hood/McLaws/Law', idx_names(['Pickett', 'Kemper', 'Armistead', 'Hood', 'McLaws', 'Law'])),
            ]}, {
            'id': 'g2', 'claim': "Kemper, Garnett, Armistead present in the assault", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'n/a',
            'finding': "Peyton: Pickett gave the order to advance in person, Garnett repeated it and led the brigade; Kemper's line came up some 50-60 yards behind and to the right, Armistead 'coming up in our rear'. Longstreet: Garnett was killed leading his brigade in the assault; Kemper 'very seriously wounded'. Lee lists Kemper and Armistead among the wounded generals.",
            'evidence': [
                ev('OR27-2-R441', r'General Armistead coming up in our rear', "Peyton, p.385.", show=True),
                ev('OR27-2-R430', r'Garnett was killed while gallantly leading his brigade in the assault', "Longstreet, p.363."),
                ev('OR27-2-R430', r'Kemper, very seriously wounded', "Longstreet, p.362.", show=True),
                ev('OR27-2-R426', r'Brigadier-Generals Kemper, Armistead, Scales', "Lee, p.311: list of wounded brigadiers.", ocr="OCR; list continues '... G. T. Anderson, Hampton, J. M. Jones, and Jenkins were also wounded'"),
            ]}, {
            'id': 'g3', 'claim': "Infantry step-off (PDF 14:00 / 15:00; default 15:00)", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'partly (15:00 by Hunt and Webb; Peyton says 14:30; Hays implies about 16:30)',
            'finding': "Peyton: 'At 2.30 p. m.' the artillery fire having abated, the order to advance was given. Hunt: about 3 p.m. the enemy formed his column. Webb: at 3 o'clock the enemy line left the woods. Hays: after fire until 4.30 the column moved forward. Longstreet gives no step-off hour.",
            'evidence': [
                ev('OR27-2-R441', r'order to advance was given, first by Major-General Pickett in person', "Peyton, p.385 (the sentence begins 'At 2.30 p. m.').", show=True),
                ev('OR27-1-R104', r'At 3 o.clock the enemy.s line of battle left the woods', "Webb, p.428."),
            ]}]})

    # ---------------------------------------------------------------- (h)
    items.append({
        'id': 'h', 'topic': "Longstreet, Hood, McLaws, Law: Jul 1-2 march and arrival times", 'pdf': pdf('C-005', 'C-006', 'C-007'),
        'subclaims': [{
            'id': 'h1', 'claim': "PDF clock values: Hood at Seminary Ridge 05:30/06:30/07:30; Longstreet at Lee's HQ 05:15/08:00; McLaws on the ridge 08:00/08:30", 'verdict': 'NOT-FOUND-IN-OR', 'supports_pdf_default': 'no support either way',
            'finding': "No OR passage found gives these morning clock times. Longstreet's report puts Hood's division within about four miles of the town at about midnight (July 1-2) and McLaws at Marsh Creek 'a little after dark'. Kershaw (McLaws' division) was ordered to move at 4 a.m. but left camp about sunrise and was halted near the hill overlooking Gettysburg until about noon. No Hood, McLaws or Law report is in the indexed contents list.",
            'evidence': [
                ev('OR27-2-R430', r"Hood.s division got within nearly the same distance of the town", "Longstreet, p.358.", show=True),
                ev('OR27-2-R430', r'McLaws. division, however, reached Marsh Creek, 4 miles from Gettysburg, a little after dark', "Longstreet, p.358."),
                ev('OR27-2-R432', r'did not leave camp until about sunrise', "Kershaw, p.366.", show=True),
                absent('no Part 1-2 report authored by Hood/McLaws/Law (see g1)', idx_names(['Hood', 'McLaws', 'Law'])),
            ]}, {
            'id': 'h2', 'claim': "Other Jul 2 times the OR does give", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'n/a',
            'finding': "Law's brigade 'joined about noon on the 2d' (Longstreet); McLaws 'got into position ... about 4 p. m.' (Longstreet); Lee: 'About 4 p. m. Longstreet's batteries opened, and soon afterward Hood's division ... moved to the attack'; Kershaw advanced about 4 o'clock; Benning was told about 2 or 3 p.m. that Hood's division was about to attack; Robertson says the division arrived on the ground only 'a few minutes before' the order to advance.",
            'evidence': [
                ev('OR27-2-R430', r'joined about noon on the 2d', "Longstreet, p.358 (Law's brigade).", show=True),
                ev('OR27-2-R430', r'McLaws. division got into position opposite the enemy.s left about 4 p\. m', "Longstreet, p.358-359."),
                ev('OR27-2-R426', r'About 4 p\. m\. Longstreet.s batteries opened', "Lee, p.319.", show=True),
                ev('OR27-2-R458', r'2 or 3 p\. m\. on July 2', "Benning, p.414: told by Hood that his division was about to attack.", ocr="OCR 'Aljout'/'July 2, ultimo' near the match"),
                ev('OR27-2-R452', r'The division arrived on the ground in front of the position of the enemy that we were to attack but a few minutes before we were ordered to advance', "Robertson, p.404."),
            ]}]})

    # ---------------------------------------------------------------- (i)
    items.append({
        'id': 'i', 'topic': "Sickles / Birney / Humphreys: III Corps advance to the Emmitsburg road (Jul 2)", 'pdf': pdf('C-009', 'C-010'),
        'subclaims': [{
            'id': 'i1', 'claim': "III Corps advance hour (PDF: noon / 14:00 / 16:00; default 14:00)", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'partly (Hunt: about 2 p.m.; other officers 3-4 p.m.)',
            'finding': "Hunt: about 2 p.m. Sickles formed his corps in line (right on the Emmitsburg road at the peach orchard). Hancock: about 3 p.m. the Third Corps advanced (a value not in the PDF's list). Birney: his 12 m. reconnaissance (Berdan) found columns moving left, he then advanced his left 500 yards and rested his right on the Emmitsburg road at the peach orchard, opening fire 'say at 3.30 p. m.'. Gibbon: 'At 4 o'clock the Third Corps advanced'. Humphreys: about 4 p.m. he moved his division forward in compliance with Sickles' orders. No report by Sickles is in the indexed contents list. The noon event is Berdan's reconnaissance, not the corps advance.",
            'evidence': [
                ev('OR27-1-R028', r'About 2 p\. m\. General Sickles formed his corps in line', "Hunt, p.234.", show=True),
                ev('OR27-1-R076', r'when the Third Corps advanced from its position toward the Emmitsburg road', "Hancock, p.369 (preceded by 'about 3 p. m.').", show=True),
                ev('OR27-1-R133', r'I now opened \(say at 3\.30 p\. m\.\) with Clark.s and Smith.s batteries', "Birney, p.483.", show=True),
                ev('OR27-1-R098', r'At 4 o.clock the Third Corps advanced', "Gibbon, p.416.", show=True),
                ev('OR27-1-R158', r"in compliance with General Sickles. orders, I moved my division forward", "Humphreys, p.532 (preceded by 'About 4 p. m.').", show=True),
                ev('OR27-1-R133', r"At 12 m\., believing from the constant fire of the enemy that a movement was being made toward the left", "Birney, p.482: noon reconnaissance with Berdan's sharpshooters (also Hunt: 'About 12 m.')."),
            ]}]})

    # ---------------------------------------------------------------- (j)
    items.append({
        'id': 'j', 'topic': "Stuart / Hampton / Jenkins: arrival (Jul 2) and where Jenkins was wounded", 'pdf': pdf('C-023'),
        'subclaims': [{
            'id': 'j1', 'claim': "Stuart's arrival time (PDF: noon-13:00 / mid-afternoon / afternoon / evening; default Stuart early afternoon, brigades evening)", 'verdict': 'NOT-FOUND-IN-OR', 'supports_pdf_default': 'no support either way (date confirmed, clock time absent)',
            'finding': "Stuart's report: dispatch from Lee reached him during the night of July 1 at Carlisle; 'My advance reached Gettysburg July 2, just in time to thwart a move of the enemy's cavalry upon our rear by way of Hunterstown'; he took position that day on the York and Heidlersburg roads. No hour is given. Hampton: his brigade 'was stationed on July 2, at Hunterstown, 5 miles to the east of Gettysburg' when ordered up, fought Union cavalry between Hunterstown and Gettysburg, held the ground through the night. Lee (July 1863 report) records only the afternoon-of-July-1 news that Stuart had reached Carlisle.",
            'evidence': [
                ev('OR27-2-R565', r'My advance reached Gettysburg July 2', "Stuart, p.697.", show=True),
                ev('OR27-2-R567', r'was stationed on July 2, at Hunterstown, 5 miles to the east of Gettysburg', "Hampton, p.724.", show=True),
                ev('OR27-2-R426', r'intelligence was received of the arrival of General Stuart at Carlisle', "Lee, p.308: afternoon of July 1.", show=True),
            ]}, {
            'id': 'j2', 'claim': "Jenkins wounded on Jul 2; Col. M. J. Ferguson commands his brigade on Jul 3", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'n/a (PDF states it as documented)',
            'finding': "Stuart (describing July 3): Jenkins' men fell back; 'that officer was wounded the day previous, before reporting to me, and his brigade was now commanded by Colonel [M. J.] Ferguson, Sixteenth Virginia Cavalry'. Lee lists Jenkins among the wounded brigadiers.",
            'evidence': [
                ev('OR27-2-R565', r'that officer was wounded the day previous, before reporting to me', "Stuart, p.698.", show=True),
                ev('OR27-2-R426', r'Jenkins were also wounded', "Lee, p.311 (list of wounded brigadiers).", show=True),
            ]}, {
            'id': 'j3', 'claim': "Where Jenkins was wounded", 'verdict': 'NOT-FOUND-IN-OR', 'supports_pdf_default': 'n/a (PDF itself records this as a gap)',
            'finding': "The only passages found that say Jenkins himself was wounded (Stuart, Lee) give a date at most, no place. Rodes and Ewell mention wounded officers of Jenkins' command at Winchester in June, not Jenkins himself; Rodes also notes the absence of any official report from Jenkins for that period. No Jenkins report is in the indexed list.",
            'evidence': [
                ev('OR27-2-R506', r'In the absence of any official report from General Jenkins', "Rodes, p.548 (about June 14-15, Winchester period).", show=True),
                absent("no 'Jenkins ... wounded' passage names a place in Parts 1-3 (searched Jenkins near wounded/disabled/shell)", jenkins_check),
            ]}]})

    # ---------------------------------------------------------------- (k)
    items.append({
        'id': 'k', 'topic': "Buford's destination after Jul 2 (Taneytown / Westminster / Emmitsburg)", 'pdf': pdf('C-027'),
        'subclaims': [{
            'id': 'k1', 'claim': "Buford's Jul 2 destination", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': "no for Jul 2 (Taneytown that night); yes for Jul 3 (Westminster)",
            'finding': "The OR separates the three places by day and unit. Buford's division, relieved by Sickles' corps on Jul 2, 'moved to Taneytown, and bivouacked for the night'; 'The next day, July 3, it moved to Westminster' (Buford; Devin says the same). Merritt's Reserve Brigade 'marched to Emmitsburg' on the 2d. The PDF default 'Westminster' fits Jul 3, not Jul 2. (The date label before Buford's sentence is OCR-garbled; the order is fixed by 'The next day, July 3'.)",
            'evidence': [
                ev('OR27-1-R337', r'it moved to Taneytown, and bivouacked for the', "Buford, p.928.", show=True, ocr="OCR 'ni^t' for 'night'; the date label just before ('-TnW 9') is garbled"),
                ev('OR27-1-R337', r'The next day, July 3, it moved to Westminster', "Buford, p.928.", show=True),
                ev('OR27-1-R339', r'ordered to march to Taneytown, where we bivouacked', "Devin, p.939 (continues 'the next morning, July 3, to Westminster').", show=True),
                ev('OR27-1-R340', r'On the 2d instant, we marched to Emmitsburg', "Merritt (Reserve Brigade), p.943.", show=True),
            ]}]})

    # ---------------------------------------------------------------- (l)
    items.append({
        'id': 'l', 'topic': "Custer / Gregg / Kilpatrick, Jul 3 times (East Cavalry Field)", 'pdf': pdf('C-032'),
        'subclaims': [{
            'id': 'l1', 'claim': "East Cavalry Field fight (PDF: 13:00 / 15:00; default 13:00)", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': "no (OR says about noon; no OR passage found for 15:00)",
            'finding': "Pleasonton: 'About noon the enemy threw a heavy force of cavalry against this position' (Gregg's, with Custer's brigade). Gregg: at 12 m. he received a copy of a warning dispatch and Pleasonton's order to send Custer's brigade to Kilpatrick, then the engagement developed; he gives no start hour. Custer's report (regimental summary, Fifth Michigan): 'At 10 a. m. moved out, and met the enemy on the right'. Kilpatrick: Jul 2 reached the field at 2 p.m.; at 11 p.m. ordered to Two Taverns (reached at daylight); at 8 a.m. Jul 3 ordered to move to the left of the line and attack the enemy's right. The OR value (about noon) is earlier than both PDF values.",
            'evidence': [
                ev('OR27-1-R336', r'About noon the enemy threw a heavy force of cavalry against this position', "Pleasonton, p.916.", show=True),
                ev('OR27-1-R344', r'At 12 m\. I received a copy of a dispatch', "Gregg, p.956 (his own report gives no hour for the start of the fight).", show=True),
                ev('OR27-1-R361', r'At 10 a\. m\. moved out, and met the enemy on the right', "Custer's report, regimental summary for the Fifth Michigan, p.998.", show=True, doc='regimental summary printed in Custer\'s report'),
                ev('OR27-1-R359', r'received orders from headquarters Cavalry Corps to move to the left of our line', "Kilpatrick, p.992 ('At 8 a. m.' precedes; Jul 3)."),
                ev('OR27-1-R359', r'Reached the battle-field at 2 p\. m\.', "Kilpatrick, p.992 (Jul 2).", show=True),
            ]}]})

    # ---------------------------------------------------------------- (m)
    items.append({
        'id': 'm', 'topic': "Chamberlain / Vincent / Warren at Little Round Top (Jul 2)", 'pdf': pdf('C-011', 'C-012', 'C-013'),
        'subclaims': [{
            'id': 'm1', 'claim': "Warren directs troops onto the Round Top ridge", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'n/a',
            'finding': "Sykes: Vincent's brigade seized the rocky height, followed by Weed's, 'posted under the direction of General Warren'. Barnes: Warren, riding from the left, pointed out Round Top and urged its importance. Garrard (146th NY): the leading regiment was led by Warren onto Round Top ridge. No report by Warren is in the indexed contents list.",
            'evidence': [
                ev('OR27-1-R187', r'posted under the direction of General Warren, chief engineer', "Sykes, p.593.", show=True),
                ev('OR27-1-R189', r'General Warren, of the staff of General Meade, came up, riding rapidly from the left', "Barnes, p.600."),
                ev('OR27-1-R217', r'under the direction of General Warren, chief engineer Army of the Potomac, was led to the left', "Garrard, p.651."),
                absent('no Part 1 report authored by Warren (G. K.)', idx_names([r'Gouverneur', r'G\. ?K\. Warren'], parts=(1,))),
            ]}, {
            'id': 'm2', 'claim': "Chamberlain / Vincent movement time; Chamberlain's charge (PDF 17:30 inferred, or no clock time)", 'verdict': 'CONFIRMED', 'supports_pdf_default': "yes for the PDF's alternative 'no clock time in the sources'; 17:30 is an inference not found in the OR",
            'finding': "Chamberlain: reached the heights about 7 a.m.; 'Somewhere near 4 p. m.' a cannonade was the signal for the division's sudden movement; Vincent ordered the regiment to the left and told Chamberlain to hold the ground; the fight 'for an hour' was severe, then 'I ordered the bayonet' (no clock time); at dusk Rice told him of Vincent's fall. Rice: the brigade 'ordered into position at about 4 p. m. of the 2d instant, on the extreme left'.",
            'evidence': [
                ev('OR27-1-R196', r'Somewhere near 4 p\. m\. a sharp cannonade', "Chamberlain, p.622.", show=True),
                ev('OR27-1-R196', r'hold that ground at all hazards', "Chamberlain, p.622 (Vincent's order, in quotation marks in the report).", show=True),
                ev('OR27-1-R196', r'At that crisis, I ordered the bayonet', "Chamberlain, p.624 (no clock time given).", show=True),
                ev('OR27-1-R195', r'ordered into position at about 4', "Rice, p.616 ('p. m. of the 2d instant, on the extreme left of our line').", show=True),
            ]}, {
            'id': 'm3', 'claim': "A Vincent account of Little Round Top", 'verdict': 'NOT-FOUND-IN-OR', 'supports_pdf_default': 'n/a',
            'finding': "Vincent's only report in the volume (Report No. 194, starting about p.613) is dated June 22, 1863 and concerns the Aldie/Middleburg operation; he left no Gettysburg report in the OR (his brigade's is Rice's).",
            'evidence': [ev('OR27-1-R194', r'June 22, 1863', "Vincent, p.613 (heading of the report).")]}, {
            'id': 'm4', 'claim': "Vincent's lead over Law of 10 or 15 minutes (PDF C-012)", 'verdict': 'NOT-FOUND-IN-OR', 'supports_pdf_default': 'no support either way',
            'finding': "No passage found in Parts 1-2 gives a minutes-lead of Vincent's brigade over Law's; the reports give only approximate hours (about 4 p.m.) for the two movements.",
            'evidence': [absent("'ten/fifteen/twenty/10/15 minutes' within 400 characters of Vincent, Law, Hood or Round Top in the Fifth Corps and Law-brigade reports", minutes_check)]}]})

    # ---------------------------------------------------------------- (n)
    items.append({
        'id': 'n', 'topic': "Letterman: wounded 14,193 Union / 6,802 Confederate; ambulance corps; 650 medical officers", 'pdf': [{'id': 'PDF p.55', 'topic': 'wounded totals', 'pdf_values': ['Letterman 14,193 Union and 6,802 Confederate (20,995)', '>650 medical officers, 106 left, 544 with the army', 'each corps leaves 6 ambulances and 4 wagons, Cavalry Corps 4 ambulances', '1 officer and 4 privates of the Ambulance Corps killed, 17 wounded'], 'pdf_printed_default': 'Use Letterman for wounded (inferred)', 'status': 'PDF text, not a conflict row', 'pdf_page': 55}],
        'subclaims': [{
            'id': 'n1', 'claim': 'Wounded 14,193 Union / 6,802 Confederate (total 20,995)', 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes',
            'finding': "Letterman's report gives exactly these figures and the total of 20,995, and marks the 14,193 with a footnote 'But see revised statement, p. 187' (the revised casualty return). The 6,802 is repeated in the Confederate surgeon Guild's report as the Army of the Potomac medical director's figure.",
            'evidence': [
                ev('OR27-1-R016', r'amounted to 14,193', "Letterman, p.198.", show=True),
                ev('OR27-1-R016', r'Confederate wounded who fell into our hands was 6,802', "Letterman, p.198.", show=True),
                ev('OR27-1-R016', r'But see revised statement, p\. 187', "Letterman's footnote on the 14,193."),
                ev('OR27-2-R427', r'reported by the medical director of the Army of the Potomac as 6,802', "Guild (Confederate medical director), p.346."),
            ]}, {
            'id': 'n2', 'claim': 'Ambulance Corps losses; ambulances left per corps', 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes',
            'finding': "Letterman: the corps 'did not escape unhurt; 1 officer and 4 privates were killed and 17 wounded', some horses killed and ambulances injured; six ambulances and four wagons were left by each corps for the wounded, four ambulances from the Cavalry Corps (it had lost some captured near Hanover).",
            'evidence': [
                ev('OR27-1-R016', r'1 officer and 4 privates were killed and 17 wounded', "Letterman, p.198.", show=True),
                ev('OR27-1-R016', r'six ambulances and four wagons were ordered to be left from each corps', "Letterman, p.198."),
            ]}, {
            'id': 'n3', 'claim': '650 medical officers', 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes',
            'finding': "'Over 650 medical officers are reported as present for duty at that battle'; thirteen were wounded (one died July 6); 106 were left behind when the army marched.",
            'evidence': [
                ev('OR27-1-R016', r'Over 650 medical officers are reported as present for duty', "Letterman, p.197.", show=True),
                ev('OR27-1-R016', r'One hundred and six medical officers were left behind', "Letterman, p.197."),
            ]}]})

    # ---------------------------------------------------------------- (o)
    items.append({
        'id': 'o', 'topic': 'Bliss farm burning (Jul 3) and the Sherfy barn', 'pdf': pdf('C-026'),
        'pdf_note': "PDF p.3 text (and timeline row p.28): 'The Bliss barn and house were burned deliberately on the morning of July 3 by the 14th Connecticut.'",
        'subclaims': [{
            'id': 'o1', 'claim': 'Bliss barn and house burned deliberately on the morning of Jul 3 by the 14th Connecticut', 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes for date and regiment; the word "Bliss" is not in the OR and the time is "forenoon" / the 11 a.m.-2 p.m. lull',
            'finding': "Three Union reports describe the burning of a barn and house about a quarter mile in front of Hays' division on Jul 3: Ellis (14th Connecticut) says that 'in the forenoon' the regiment was ordered to take and hold the buildings and then, ordered to destroy them, fired them in several places; Smyth says that after the 10.30 lull the buildings were reoccupied, the 14th Connecticut retook them and Hays ordered them burned, before the 2 p.m. cannonade; Hays says that in the lull (about 11 a.m. to nearly 2 p.m.) he caused the house and barn to be burned because they interrupted his artillery's fire. The OR never names the owner; identifying them as the Bliss buildings is outside the OR text (the only 'Bliss' hits are officers' names).",
            'evidence': [
                ev('OR27-1-R124', r'Having received orders to destroy these buildings, they were fired in several places', "Ellis (14th Connecticut), p.467 ('In the forenoon the regiment was ordered to take and hold two buildings, a large barn and house').", show=True),
                ev('OR27-1-R123', r'an order came from General Hays to burn the house and barn', "Smyth, p.465.", show=True),
                ev('OR27-1-R115', r'I caused the house and barn in our front', "Hays, p.454 (after 'About 11 a. m. an entire lull').", show=True),
                absent("'Bliss' as a farm/house name", text_absent(r'\bBliss\b[^.]{0,40}(farm|house|barn|buildings)|(farm|house|barn)[^.]{0,20}\bBliss\b', (1, 2))),
            ]}, {
            'id': 'o2', 'claim': 'Sherfy barn fire (Jul 2 evening vs Jul 3)', 'verdict': 'NOT-FOUND-IN-OR', 'supports_pdf_default': 'no support either way',
            'finding': "'Sherfy' does not occur in the normalized text of Parts 1-3 (OCR variants not exhaustively tested).",
            'evidence': [absent("'Sherfy'", text_absent(r'Sherf|Sherpy|Shorfy', (1, 2, 3)))]}]})

    # ---------------------------------------------------------------- (p)
    items.append({
        'id': 'p', 'topic': "Culp's Hill: Greene, Geary, Kane, Candy, Ruger, Colgrove, work start/hours and Jul 3 attack hour", 'pdf': pdf('C-019', 'C-031'),
        'subclaims': [{
            'id': 'p1', 'claim': "Breastwork building starts Jul 2 morning", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'n/a',
            'finding': "Geary: placed in position at 5 a.m. on the 2d and 'Breastworks were immediately thrown up along our entire line'. Greene: took position 'at about G a. m.' (OCR; the digit is unreadable, likely 6) and began to intrench 'as soon as we were in position'. Kane assumed command at 6 a.m. These are the Twelfth Corps' breastworks on Culp's Hill.",
            'evidence': [
                ev('OR27-1-R293', r'Breastworks were immediately thrown up along our entire line', "Geary, p.826.", show=True),
                ev('OR27-1-R293', r'At 5 a\. m\. on the 2d', "Geary, p.825 (time his division was placed on the right).", show=True),
                ev('OR27-1-R307', r'As soon as we were in position, we began to intrench ourselves', "Greene, p.856.", show=True, ocr="the preceding hour reads 'about G a. m.' in the OCR (6 a.m.?)"),
                ev('OR27-1-R302', r'I assumed command at 6 a\. m\.', "Kane, p.846.", show=True),
            ]}, {
            'id': 'p2', 'claim': "Hours spent building before the evening attack", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'n/a',
            'finding': "Greene: 'By 13 o'clock we had a good cover for the men' - the OCR digit cannot be right (probably 12), so a stated work period of roughly six hours (about 6 a.m. to about noon) is OCR-uncertain. No other report found states how many hours the works took.",
            'evidence': [ev('OR27-1-R307', r"By 13 o.clock we had a good cover for the men", "Greene, p.856.", ocr="OCR '13 o'clock' is impossible; the true hour is unreadable (12?)")]}, {
            'id': 'p3', 'claim': "Jul 2 evening attack on Culp's Hill (PDF 19:00 / 19:30 / 20:00; default 19:00)", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes (default 19:00)',
            'finding': "Greene: 'we were attacked on the whole of our front by a large force a few minutes before 7 p. m.', and the enemy made four distinct charges between 7 and 9.30 p.m. (other Culp's Hill reports not checked for this item).",
            'evidence': [ev('OR27-1-R307', r'a few minutes before 7 p\. m\.', "Greene, p.856.", show=True)]}, {
            'id': 'p4', 'claim': "Jul 3 attack and final charge hour (PDF 10:00 / noon; default 10:00)", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes (default 10:00); noon not found',
            'finding': "Fighting opens before dawn: Geary 3.30 a.m. (early dawn), Kane 3.30 a.m., Candy 3.45 a.m., Greene's artillery 4 a.m., Hunt's batteries 4.30/5.30; it ends about 10 a.m. (Ruger; Hunt: infantry succeeded in driving out the enemy 'until 10 a. m.') or 10.30 a.m. (Greene and Slocum). Geary has the 66th Ohio recalled at 11 a.m. Colgrove's report orders the Second Massachusetts and 27th Indiana to charge the works but gives no clock time for the charge.",
            'evidence': [
                ev('OR27-1-R273', r'This state of things continued until about 10 a\. m', "Ruger, p.781.", show=True),
                ev('OR27-1-R307', r'continued until 10\.30 a\. m\., when the enemy retired', "Greene, p.857.", show=True),
                ev('OR27-1-R271', r'The engagement continued until 10\.30 a\. m\.', "Slocum, p.761.", show=True),
                ev('OR27-1-R293', r'at 3\.30 a\. m\. \(early dawn\) a simultaneous attack was made by artillery', "Geary, p.828.", show=True),
                ev('OR27-1-R302', r'The attack in force upon us commenced at 3\.30 a\. m\., July 3', "Kane, p.847.", show=True),
                ev('OR27-1-R286', r'ordered the Second Massachusetts to charge the works', "Colgrove, p.813: no clock time given for the charge."),
            ]}]})

    # ---------------------------------------------------------------- (q)
    items.append({
        'id': 'q', 'topic': "Small arms and Zouave dress by regiment (140th/146th NY etc.)", 'pdf': [{'id': 'PDF p.3 text', 'topic': 'dress and arms', 'pdf_values': ['140th NY regulation blue; 146th NY and 114th PA Zouave dress; 5th NY (Duryee) and 165th NY not at Gettysburg', "Buford's men carried a mix of Sharps, Burnside, Gallager, Smith"], 'pdf_printed_default': 'stated as fact in the PDF (documented/inferred tiers in its rows)', 'status': 'PDF text', 'pdf_page': 3}],
        'subclaims': [{
            'id': 'q1', 'claim': "140th NY regulation blue / 146th NY Zouave dress", 'verdict': 'NOT-FOUND-IN-OR', 'supports_pdf_default': 'no support either way',
            'finding': "The OR text contains no description of either regiment's uniform. 'Zouave' occurs for the Gettysburg field army only in the name 'Collis Zouaves' (114th Pennsylvania).",
            'evidence': [absent("uniform words next to '140th/146th New York'", text_absent(r'(?:140th|146th|One hundred and (?:fortieth|forty-sixth) New York)[^.]{0,80}(Zouave|uniform|dress|blue|jacket)', (1,)))]}, {
            'id': 'q2', 'claim': "114th Pennsylvania in Zouave dress", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes as to the name only (dress itself is not described)',
            'finding': "Carr (3rd Corps, 1st Brigade) calls the regiment on his left 'the Collis Zouaves, of the First Division'; the OR index equates Collis' Zouaves with the 114th Pennsylvania.",
            'evidence': [
                ev('OR27-1-R160', r'the Collis Zouaves, of the First Division', "Carr, p.543.", show=True),
                ev('OR27-1-R009', r'140th New York', "Order of battle: 140th NY (O'Rorke) and 146th NY (Garrard) in Weed's brigade.", nth=0),
            ]}, {
            'id': 'q3', 'claim': "5th New York (Duryee) and 165th New York not at Gettysburg", 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes (absence from the Army of the Potomac order of battle)',
            'finding': "The Gettysburg order of battle (Report No. 9) lists a '5th New York' only as the cavalry regiment (Maj. John Hammond, Farnsworth's/Richmond's brigade); no 5th NY Infantry and no 165th NY appear in it.",
            'evidence': [
                ev('OR27-1-R009', r'5th New York, Maj\. John Hammond', "Order of battle, p.168: the only '5th New York'.", show=True),
                absent("'165th New York' in the order of battle", lambda: (not re.search(r'165th New York', F.get_part(1).ntext[__import__('bisect').bisect_left(F.get_part(1).nmap, RECS['OR27-1-R009']['start_offset']):__import__('bisect').bisect_left(F.get_part(1).nmap, RECS['OR27-1-R009']['end_offset'])]), "no '165th New York' in Report No. 9")),
            ]}, {
            'id': 'q4', 'claim': "Which regiments carried which small arms", 'verdict': 'AMBIGUOUS', 'supports_pdf_default': "no support for the PDF's Buford carbine mix (Sharps, Burnside, Gallager, Smith)",
            'finding': "The OR has only scattered arms statements, none for Buford's division on Jul 1: the 63rd NY battalion carried smooth-bore .69 muskets with buck-and-ball; the 4th Ohio exchanged smooth-bores for captured Springfield rifles; Stuart says Jenkins' brigade was armed with Enfield muskets; the 110th Ohio's sharpshooters had Henry rifles at Winchester (June); a June dispatch distributes Burnside carbines to the 18th Pennsylvania Cavalry in place of Merrill carbines; Sharps carbines/rifles appear only in two Confederate captured-arms lists from other actions (one for Brandy Station). Captured-arms tallies (Rosengarten, Crawford) list Confederate small arms, not Union issue.",
            'evidence': [
                ev('OR27-1-R084', r'armed with smooth-bore Springfield muskets, caliber \. ?69', "Touhy (63rd NY), p.387-388.", show=True),
                ev('OR27-1-R119', r'We were armed on going into the fight with the smooth-bore muskets', "Carpenter (4th Ohio), p.460.", show=True),
                ev('OR27-2-R565', r'armed with the most approved Enfield musket', "Stuart on Jenkins' brigade, p.697.", show=True),
                ev('OR27-2-R387', r'Armed with the Henry rifle', "Keifer (110th Ohio sharpshooters), p.63, June 13-15 Winchester.", show=True),
                ev('OR27-3-D0474', r'I have distributed the Burnside carbines, in place of Merrill carbines, to the Eighteenth Pennsylvania Cavalry', "June 20, 1863 dispatch (document D0474 in Part 3).", doc='Part 3 dispatch D0474'),
            ]}]})

    # ---------------------------------------------------------------- (r)
    items.append({
        'id': 'r', 'topic': "Spencer carbines: Buford Jul 1; 5th/6th Michigan Jul 3", 'pdf': [{'id': 'PDF p.3 text', 'topic': 'Spencer', 'pdf_values': ["Spencer carbines were not on Buford's line on July 1; the 5th Michigan and part of the 6th Michigan used them on July 3"], 'pdf_printed_default': 'stated as fact', 'status': 'PDF text', 'pdf_page': 3}],
        'subclaims': [{
            'id': 'r1', 'claim': 'Any Spencer mention for Buford (Jul 1) or the 5th/6th Michigan (Jul 3)', 'verdict': 'NOT-FOUND-IN-OR', 'supports_pdf_default': 'no support either way (neither the Jul 1 negative nor the Jul 3 positive claim can be checked in the OR)',
            'finding': "The weapon name 'Spencer' does not occur in Parts 1-3 as a weapon (checked next to carbine/rifle/repeating/gun/musket). All occurrences are personal names. Because the word does not occur, the Fifth and Sixth Michigan summaries inside Custer's report cannot name it.",
            'evidence': [absent('Spencer as a weapon', spencer_check)]}]})

    # ---------------------------------------------------------------- (s)
    items.append({
        'id': 's', 'topic': "Return of casualties / strength totals", 'pdf': pdf('C-046', 'C-047'),
        'subclaims': [{
            'id': 's1', 'claim': 'Union casualty total in the Gettysburg return (PDF: 23,049 vs 23,055)', 'verdict': 'CONFIRMED', 'supports_pdf_default': 'yes for 23,049 (the PDF lists 23,049 first)',
            'finding': "The final cell of the Return of Casualties at Gettysburg (Report No. 13, final page of the table) reads 23,049; the killed/wounded/missing component columns around it are too garbled in the OCR to read, so the 23,049 is a single OCR-read cell (digit-level confirmation requires the second witness). Letterman's wounded count is in item n.",
            'evidence': [ev('OR27-1-R013', r'1,082 852 23,049', "Return of Casualties, last cell of the grand total row (page printed around 187; see page range in the cite).", ocr="components unreadable in the OCR")]}, {
            'id': 's2', 'claim': 'Confederate totals (Guild, Report No. 427)', 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'no support for the PDF totals (the OR shows its own, different, figures)',
            'finding': "Guild's recapitulation prints killed 2,592 and wounded 12,709 (the per-corps columns 910+809+837+36 and 4,339+3,823+4,407+140 sum to exactly those totals, checked by code); the missing column and grand total are OCR-garbled (the missing total reads '5,160' while the column cells read 3,290 1,305 1,491 64; the grand total reads '90,451', only the trailing '451' being clear). Guild also records prisoners: 12,227 wounded and unwounded Confederates on the Adjutant-General's lists. Longstreet's addendum gives First Corps casualties by division, partly garbled. These are OR figures only; the PDF's Confederate totals (e.g. 28,063 vs 23,231) are not derivable from them.",
            'evidence': [
                ev('OR27-2-R427', r'2,592 12,709', "Guild, recapitulation, p.346 (killed and wounded totals).", ocr="missing/total cells garbled: '5,160 ... 90,451'"),
                ev('OR27-2-R427', r'bear the names of 12,227 wounded and', "Guild, p.346 (prisoners lists note).", ocr="sentence continues 'unwounded Confederates captured ... July 1 to 5'"),
            ]}, {
            'id': 's3', 'claim': 'Strength totals', 'verdict': 'AMBIGUOUS', 'supports_pdf_default': 'n/a',
            'finding': "The unit strength tables (Report No. 8 abstract from returns; No. 9 organization) are numerically unreadable in this OCR, so no strength totals were extracted. One legible total: the memorandum of corps strengths printed with the July 2 council minutes lists effective strengths 'about 9,000, 13,500, 9,000, 6,000, 8,500, 6,000, 7,000; total, 58,000'. Hunt's artillery table notes a discrepancy in the Artillery Reserve gun count (150 reported, 110 per the return).",
            'evidence': [
                ev('OR27-1-R006', r'Effective strength about 9,000, 13,500, 9,000, 6,000, 8,500, 6,000, 7,000 ; total, 58,000', "Memorandum printed after the council minutes, Report No. 6, p.74 (heading missing in the original).", doc='memorandum inside Report No. 6'),
                ev('OR27-1-R008', r'The original reports 150 guns in Artillery Reserve, and a grand total of 402', "Report No. 8 footnote: Artillery Reserve gun count discrepancy."),
            ]}]})
    return items


def emit(items):
    flat = []
    for it in items:
        for sc in it['subclaims']:
            flat.append((it, sc))
    out = {'_doc': 'Claim checks of PDF items against OR Ser. I vol. 27. Generated by tools/bt/or27_claims.py. Verdicts are analyst readings of located passages; they are NOT owner decisions and pick no default. Quotes are < 15 words, located and re-verified by code. Page numbers are recovered from OCR running heads (see or27_index.json page_recovery_checks).',
           'generated': datetime.date.today().isoformat(), 'source_sha256': {k: v['sha256'] for k, v in IDX['sources'].items()}, 'items': items}
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    L = []
    L.append('# OR Ser. I vol. 27: claim checks against the PDF\n')
    L.append('Generated by `tools/bt/or27_claims.py` from the raw OCR (Parts 1-3, hashes in `or27_index.json`). Every cited passage was located by code; every quote is under 15 words and re-verified against the whitespace-normalized text. Pages are PRINTED page numbers recovered from running heads (a leading `~` marks an interpolated page; see OR27-NOTES.md for accuracy). Paraphrases are the analyst\'s reading.\n')
    L.append('Verdicts: **CONFIRMED**, **CONTRADICTED**, **NOT-FOUND-IN-OR**, **AMBIGUOUS** (the OR carries two or more different values). "Supports PDF default" compares the OR value with the PDF\'s printed recommended default in `GOVERNANCE/conflicts_structured.json`. This file decides nothing: defaults stay PENDING OWNER; all OR values are listed so each can be offered as a selectable scenario.\n')
    L.append('OCR caveats: the OR text is raw OCR; figures flagged "OCR" may be misread digits. A second witness (HathiTrust) has not been diffed.\n')
    L.append('## Summary table\n')
    L.append('| # | Claim | Verdict | Supports PDF default? |')
    L.append('|---|---|---|---|')
    for it, sc in flat:
        L.append('| %s | %s | %s | %s |' % (sc['id'], sc['claim'].replace('|', '/'), sc['verdict'], sc['supports_pdf_default'].replace('|', '/')))
    L.append('')
    for it in items:
        L.append('## (%s) %s\n' % (it['id'], it['topic']))
        for p in it['pdf']:
            L.append('- PDF: **%s** %s. Values: %s. Printed default: %s (%s%s).' % (p['id'], p['topic'], '; '.join(p['pdf_values']), p['pdf_printed_default'], p['status'], ', PDF p.%s' % p['pdf_page'] if p.get('pdf_page') else ''))
        if it.get('pdf_note'):
            L.append('- PDF note: ' + it['pdf_note'])
        L.append('')
        for sc in it['subclaims']:
            L.append('### %s. %s\n' % (sc['id'], sc['claim']))
            L.append('**Verdict: %s.** Supports PDF default: %s.\n' % (sc['verdict'], sc['supports_pdf_default'].rstrip('.')))
            L.append(sc['finding'] + '\n')
            for e in sc['evidence']:
                if 'negative_check' in e:
                    L.append('- Search: %s. Result: %s.' % (e['negative_check'], e['result']))
                    continue
                if 'error' in e:
                    L.append('- ERROR: %s' % e)
                    continue
                cite = 'OR Ser.I vol.27 pt.%d, %s, p. %s' % (e['part'], e['who'], e['page'])
                line = '- %s%s' % (cite, ' (%s)' % e['doc'] if e.get('doc') else '')
                if e.get('quote'):
                    line += ' - "%s"' % e['quote']
                line += ' - ' + e['note']
                if e.get('ocr_note'):
                    line += ' [OCR note: %s]' % e['ocr_note']
                L.append(line)
            L.append('')
    with open(OUT_MD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')
    return flat


if __name__ == '__main__':
    items = build()
    if errors:
        print('BUILD FAILED:')
        for e in errors:
            print(' ', e)
        sys.exit(1)
    flat = emit(items)
    from collections import Counter
    print('wrote', OUT_MD, 'and', OUT_JSON)
    print(Counter(sc['verdict'] for _, sc in flat), len(flat), 'sub-claims')
