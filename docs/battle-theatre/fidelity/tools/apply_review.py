"""Merge the manual review of the 100 pilot event candidates into events/pilot-100.jsonl and compute the extraction quality.
The review was done by reading each sentence (and, for NEEDS_CONTEXT, noting that the sentence alone does not settle day or type). Verdict vocabulary:
  OK            valid battle event; type, time binding and day acceptable as extracted
  OK_MULTI      valid, but the sentence holds more than one event (to be split) - type/time acceptable for the main one
  TYPE_WRONG    a real event, wrong type label (trigger word came from another clause)
  TIME_MISBOUND a real event, but the clock belongs to a different clause
  DAY_WRONG     a real event on another day than assigned (carried-day error)
  SPLIT_ERROR   sentence boundary cut the event
  NOT_EVENT     no battle event in the sentence (summary, praise, out of scope)
  NEEDS_CONTEXT cannot be judged from the sentence; the passage or report must be read
usage: python apply_review.py   -> events/pilot-100.jsonl, results/events-review.json"""
import collections, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
R = {  # id -> (verdict, flags, note)
 1: ('NOT_EVENT', [], 'Maryland Heights / Harpers Ferry, outside the field of the battle'),
 2: ('OK_MULTI', [], 'retire through town + take position in the cemetery at 5 pm + fire a few rounds'),
 3: ('TIME_MISBOUND', ['DAY?'], '4.30 a.m. belongs to the posting; the trigger (enemy opened) is the 1.30 pm cannonade, probably 3 July; same sentence as 0004'),
 4: ('DAY_WRONG', ['DUPLICATE_SENTENCE'], 'the 1.30 pm artillery fire is the 3 July cannonade, not 1 July'),
 5: ('DAY_WRONG', ['MULTI', 'TIME_MISBOUND'], '9 o clock (2 July) and "daybreak on the 3d" are different events'),
 6: ('NEEDS_CONTEXT', [], 'Brabble: which day and which retreat'),
 7: ('TYPE_WRONG', ['OBSCURE_EVENT'], 'staff officer joins Cutler at 3 o clock on 1 July; "repulsed" is from another clause'),
 8: ('SPLIT_ERROR', [], 'sentence cut at "about 3 p.m." (Tidball)'),
 9: ('OK', [], 'battery retires through Gettysburg to Cemetery Hill after support driven back, about 5 pm'),
 10: ('OK_MULTI', [], 'retire along the railroad embankment; division reformed about 5 pm'),
 11: ('TYPE_WRONG', ['MULTI', 'ITINERARY'], '6 a.m. 1 July broke camp; the sentence runs into 2 July; "ordered" is from the 2 July clause'),
 12: ('OK', [], '114th PA left Emmitsburg about 2 pm on 1 July'),
 13: ('NEEDS_CONTEXT', [], '5th NJ: day of the march at 10 a.m.'),
 14: ('OK', [], 'II Corps marched from Taneytown at 1.30 pm, 1 July'),
 15: ('OK', [], '98th PA started from near Manchester at 9 pm on 1 July'),
 16: ('OK_MULTI', ['ACTORS_FROM_OTHER_CLAUSE'], 'a brigade of the Second Division formed on Cutler at 2 o clock; linked units belong to the earlier clause'),
 17: ('TYPE_WRONG', [], 'command change: Schurz commanded XI Corps 10.30 a.m. to 4 p.m., Hancock arrived (type command_change)'),
 18: ('OK', [], '1 July left Hanover at 6 pm toward Gettysburg'),
 19: ('OK', [], 'Perrin received orders about 8 a.m., 1 July'),
 20: ('OK', [], 'Wilcox: within sight of the fire at 2.30 pm, halted'),
 21: ('TYPE_WRONG', [], '"to avoid being captured" is not a capture; event is the withdrawal of two companies from the buildings'),
 22: ('NOT_EVENT', ['SUMMARY'], 'summary of the regiment conduct'),
 23: ('OK', ['ACTOR_MISSING'], 'Reynolds fell mortally wounded about 10.15 a.m. (Wadsworth); the person is not linked in the sentence'),
 24: ('DAY_WRONG', ['TYPE_WRONG'], 'evening change of position, east of the cemetery: 2 July, not 1; trigger "captured" from a later clause'),
 25: ('TYPE_WRONG', [], 'regiment rallied on Cemetery Hill about 4 o clock, 1 July; "killed" is the loss count'),
 26: ('TYPE_WRONG', [], 'engagement ended about 4 pm; casualty clause is secondary'),
 27: ('TYPE_WRONG', ['SPLIT_ERROR'], 'command devolved on Doubleday and Howard arrived about 11.30; sentence starts mid-way'),
 28: ('OK', [], 'Confederate batteries opened on XI Corps about 4 pm, 2 July'),
 29: ('OK', [], 'about 5.30 pm four batteries opened on the line'),
 30: ('OK', [], 'rifle section opened fire about 4 pm'),
 31: ('OK', [], 'fire from Andrews battalion about 4 o clock on the 2d'),
 32: ('OK', [], 'line attacked about 4 pm'),
 33: ('OK', [], 'enemy retired about 7 o clock; action about one and a half hours'),
 34: ('OK', [], '6.30 pm began canister on a column'),
 35: ('OK', [], 'held until 7 pm, left had retired'),
 36: ('OK', [], '5 pm advanced to the assault'),
 37: ('OK_MULTI', [], 'withdrew pickets at daybreak and arrived on the field about 8 a.m.'),
 38: ('OK_MULTI', [], 'rested from 10 a.m. until 6 pm, then moved to the extreme left; trigger "ordered" is secondary'),
 39: ('OK', [], 'moved about 1 o clock with the 3rd and 4th Maine and 20th Indiana'),
 40: ('OK', [], 'rested until 4 pm then ordered forward'),
 41: ('OK', [], 'about 4 pm marched rapidly to the left to assist III Corps'),
 42: ('OK', [], 'about 7 pm ordered to the pike'),
 43: ('OK', [], 'Rice itinerary: ordered to the front about 4 pm, 2 July (the pilot event)'),
 44: ('OK', [], 'Caldwell: between 4 and 5 received orders to report to Sykes'),
 45: ('OK', [], 'Egan relieved about 4 o clock, ordered by Birney to move left'),
 46: ('OK', [], 'about 5 pm ordered to advance to support'),
 47: ('OK', [], 'about 7.30 enemy advanced on the right flank'),
 48: ('TYPE_WRONG', [], 'engaged until 8 pm; loss count is secondary'),
 49: ('TIME_MISBOUND', [], '8 p.m. belongs to another clause; Sickles wounded early in the action'),
 50: ('OK', [], 'Birney at 6 o clock found Sickles wounded and took command'),
 51: ('TYPE_WRONG', [], 'Rice: possession of the ground by 8-9 pm (two clocks in one sentence)'),
 52: ('TYPE_WRONG', ['DUPLICATE_SENTENCE'], 'same sentence as 0051, second clock'),
 53: ('TYPE_WRONG', ['DAY?'], 'picket detail deployed as skirmishers at 4 pm, one man wounded'),
 54: ('TYPE_WRONG', [], 'visit to the ground about 9 pm found enemy dead and wounded'),
 55: ('DAY_WRONG', ['TYPE_WRONG'], 'enemy advanced in force about 4 pm "of the 3d"'),
 56: ('SPLIT_ERROR', [], '"Near 6 p.m." starts a sentence that is cut'),
 57: ('TYPE_WRONG', [], 'arrival near the wood about 10 pm; skirmishers sent forward (night 2 July)'),
 58: ('OK_MULTI', [], 'batteries opened 4.30 a.m., fired fifteen minutes, ceased for infantry'),
 59: ('NEEDS_CONTEXT', [], 'Geary: 9.30 pm Candy relief; day not settled by the sentence'),
 60: ('NEEDS_CONTEXT', [], 'Price: relieved by 123rd NY about 8 pm; day not settled'),
 61: ('NEEDS_CONTEXT', [], 'McKeen: 4 pm artillery fire; day not settled'),
 62: ('OK_MULTI', [], 'skirmishers commenced firing at 3 a.m.; general by 4 o clock, 3 July'),
 63: ('OK', [], 'firing 5.30 a.m. to 10 a.m., enemy retreated, 3 July'),
 64: ('OK', [], 'about 1 o clock the enemy opened with artillery, 3 July'),
 65: ('OK', [], '3.30 a.m. the enemy opened on us, fight general, 3 July'),
 66: ('OK', ['CONTESTED_CLOCK'], 'McMahon: began firing by Hancock\'s order about 4 pm; other witnesses put the cannonade reply at about 2 pm'),
 67: ('DAY_WRONG', [], 'opened at dusk on the line advancing from the town: East Cemetery Hill, 2 July'),
 68: ('NEEDS_CONTEXT', ['AMPM_UNRESOLVED'], '5.30 o clock: a.m. or p.m. is not settled; charge of the woods'),
 69: ('OK', [], '72nd NY moved to the front at 2 pm and returned at 7 pm'),
 70: ('OK', [], 'about 3 pm Hunt ordered the battery forward, 3 July'),
 71: ('OK', [], 'about 3 pm ordered to support the left near the cemetery'),
 72: ('OK', [], 'about 2 a.m. 3 July ordered to re-enforce Johnson'),
 73: ('OK', [], 'Custer: 10 a.m. 3 July moved out and met the enemy'),
 74: ('OK_MULTI', [], 'moved about 2 pm one mile to the right; remained until 6.30'),
 75: ('OK_MULTI', [], '6 pm moved up the line; 7.30 left the breastworks'),
 76: ('OK', [], 'Muhlenberg and Kinzie batteries posted at 1 a.m. 3 July'),
 77: ('OK', [], '67th NY marched forward at 11 a.m., 3 July'),
 78: ('TIME_MISBOUND', ['CASUALTY_LIST'], 'casualty list; the 3 o clock belongs to another sentence'),
 79: ('DAY_WRONG', ['TIME_MISBOUND', 'OBSCURE_EVENT'], 'accidental caisson-limber explosion on 2 July, Private Begg mortally wounded'),
 80: ('TYPE_WRONG', [], 'about 2 o clock that night the 1st Texas and 3rd Arkansas moved to the right and formed on the left of the 4th and 5th'),
 81: ('TYPE_WRONG', [], 'Culp\'s Hill engagement ended 10.30 a.m., 3 July'),
 82: ('TYPE_WRONG', ['DUPLICATE_SENTENCE', 'TIME_MISBOUND'], 'same sentence as 0079'),
 83: ('TYPE_WRONG', [], 'about noon ordered behind the crest; the cannonade opened 1.30 pm'),
 84: ('NEEDS_CONTEXT', [], 'Ayer: 10 pm train to the front to remove wounded; day not settled'),
 85: ('TYPE_WRONG', ['MULTI'], 'Merritt marched about noon on the 3d; "killed" is the 2 July Lt Thompson clause'),
 86: ('TYPE_WRONG', [], 'about 2 pm four guns ordered into action in the cemetery; casualties are secondary'),
 87: ('TYPE_WRONG', ['DUPLICATE_SENTENCE'], 'cannonade opened 1.30 pm (same sentence as 0083)'),
 88: ('NOT_EVENT', ['SUMMARY'], 'Lee\'s letter listing wounded generals: several events, none dated here'),
 89: ('TYPE_WRONG', [], 'Fisher\'s brigade marched to the left of Sykes\'s corps and engaged'),
 90: ('OK', ['ACTOR_MISSING'], 'Maj. B. W. Leigh, Johnson\'s adjutant-general, killed in Greene\'s front (2 July evening)'),
 91: ('NOT_EVENT', ['SUMMARY'], 'praise of Lane\'s brigade'),
 92: ('DAY_WRONG', ['TYPE_WRONG'], 'Egan had his horse killed under him (a horse, not a person; 2 July)'),
 93: ('OK_MULTI', ['CASUALTY_LIST'], 'four dated casualties in one sentence'),
 94: ('OK_MULTI', [], 'news that Reynolds was mortally wounded reached Williams near Two Taverns'),
 95: ('OK', ['AUTHOR_MISSING'], 'Reynolds killed early in the action'),
 96: ('DAY_WRONG', ['TYPE_WRONG'], 'ordered by Robinson to take a hill that commanded the road: 1 July'),
 97: ('OK', ['SECONDARY_SOURCE'], 'Halleck summary: Reynolds fell'),
 98: ('TYPE_WRONG', ['HEARSAY'], 'prisoners report Confederate generals killed: intelligence item, hearsay'),
 99: ('OK', [], 'Major Grover, 76th NY, killed early on 1 July'),
 100: ('NOT_EVENT', [], 'acknowledgment of services of the 24th Michigan'),
}
TYPE_FIX = {7: 'staff_arrival', 11: 'march_itinerary', 17: 'command_change', 21: 'withdrawal', 24: 'position_change', 25: 'rally', 26: 'engagement_end', 27: 'command_change',
            48: 'engagement_end', 51: 'ground_gained', 52: 'ground_gained', 53: 'skirmisher_deploy', 54: 'ground_inspection', 55: 'attack', 57: 'night_advance', 79: 'accident',
            80: 'move', 81: 'engagement_end', 82: 'accident', 83: 'move_to_position', 85: 'march', 86: 'battery_in_action', 87: 'cannonade_open', 89: 'arrival_engage', 92: 'horse_killed',
            96: 'order', 98: 'intelligence_hearsay', 5: 'fire_open', 67: 'fire_open', 3: 'move_to_position', 4: 'cannonade_open', 78: 'casualty_list'}
rows = [json.loads(l) for l in open(os.path.join(BASE, 'events', 'pilot-100.candidates.jsonl'), encoding='utf-8')]
assert len(rows) == 100 == len(R)
for r in rows:
    i = int(r['id'][-4:]); v, fl, note = R[i]
    r['review'] = dict(status='reviewed-pass-1', verdict=v, flags=fl, note=note, reviewer='fidelity agent pass 1 (single reviewer: no second reader yet)')
    if i in TYPE_FIX: r['type_corrected'] = TYPE_FIX[i]
    r['evidence_label'] = ('Documented (as stated by the witness)' if v in ('OK', 'OK_MULTI') else 'Needs correction before it can carry a label')
with open(os.path.join(BASE, 'events', 'pilot-100.jsonl'), 'w', encoding='utf-8') as f:
    for r in rows: f.write(json.dumps(r, ensure_ascii=False) + '\n')
c = collections.Counter(R[i][0] for i in R)
valid = sum(c[k] for k in ('OK', 'OK_MULTI', 'TYPE_WRONG', 'TIME_MISBOUND', 'DAY_WRONG'))
usable_as_extracted = c['OK'] + c['OK_MULTI']
timed = [r for r in rows if r['time']]
stats = dict(n=100, verdicts=dict(c), real_events=valid, real_events_share=valid / 100, usable_as_extracted=usable_as_extracted,
             usable_as_extracted_share=usable_as_extracted / 100, strict_ok=c['OK'],
             timed_rows=len(timed), timed_usable=sum(1 for r in timed if r['review']['verdict'] in ('OK', 'OK_MULTI')),
             untimed_rows=100 - len(timed), untimed_usable=sum(1 for r in rows if not r['time'] and r['review']['verdict'] in ('OK', 'OK_MULTI')),
             wilson95_usable=None)
import math
def wilson(k, n, z=1.96):
    p = k / n; d = 1 + z * z / n; c0 = (p + z * z / (2 * n)) / d; h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(c0 - h, 3), round(c0 + h, 3)]
stats['wilson95_usable'] = wilson(usable_as_extracted, 100); stats['wilson95_real_event'] = wilson(valid, 100)
stats['flag_counts'] = dict(collections.Counter(f for i in R for f in R[i][1]))
os.makedirs(os.path.join(BASE, 'results'), exist_ok=True)
json.dump(stats, open(os.path.join(BASE, 'results', 'events-review.json'), 'w'), indent=1)
print(json.dumps(stats, indent=1))
