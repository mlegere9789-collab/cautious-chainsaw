"""Parse the 'time window' text of each seeded timeline row (PDF B.2 columns) into [earliest, latest, default] in LOCAL MEAN TIME minutes
since 1863-06-01T00:00 LMT, WITHOUT inventing precision (PDF Law cl.4):
- only clock times printed in the cell are used; 'about'/tilde/approx marks set approx=true but do not add a tolerance (the PDF states none);
- a printed range a-b gives earliest=a, latest=b, default=midpoint (PDF B.2 engine rule: midpoint unless a participant's primary report exists, which is an
  engine rule not a historical claim);
- phrases without a clock time (morning, afternoon, evening, night, 'hour not given') stay phrase-only (window null) except the PDF's own marker bands for
  [NIGHT] [DUSK] [DAWN] which come from its computed sun table for that date;
- alternatives printed inside parentheses ('13:00-14:00 per Eshleman') are kept as alternatives, never replacing the first value.
Output: docs/battle-theatre/GOVERNANCE/timeline_windows.jsonl and a stats line. Idempotent."""
import json, re, os, sys, datetime
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
MON = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12}
BASE = datetime.datetime(1863, 6, 1)
# PDF B.2.2/B.10.2 computed sun table (LMT): civil twilight start/ sunrise/ sunset / civil end, minutes after midnight, per day Jul 1..4
BANDS = {  # [NIGHT] = civil end of day d .. civil start of day d+1 ; [DUSK] sunset..civil end ; [DAWN] civil start..sunrise
    'DUSK': (19 * 60 + 32, 20 * 60 + 4), 'DAWN': (4 * 60 + 3, 4 * 60 + 35), 'NIGHT': (20 * 60 + 4, 24 * 60 + 4 * 60 + 3)}
TIME = re.compile(r'(?<![\d:])(\d{1,2}):(\d{2})(?!\d)')
DATE = re.compile(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})\b')

def minutes(y, mo, d, h, m):
    return int((datetime.datetime(y, mo, d) - BASE).total_seconds() // 60) + h * 60 + m

def iso(mins):
    t = BASE + datetime.timedelta(minutes=mins); return t.strftime('1863-%m-%dT%H:%M') if t.year == 1863 else t.strftime('%Y-%m-%dT%H:%M')

def parse(raw):
    out = {'raw': raw, 'date': None, 'earliest': None, 'latest': None, 'default': None, 'approx': False, 'phrase': None, 'alternatives': [], 'band': None, 'parse_status': 'phrase_only'}
    md = DATE.search(raw)
    if not md: out['parse_status'] = 'no_date'; return out
    mo, d = MON[md.group(1)], int(md.group(2)); y = 1863
    out['date'] = f'1863-{mo:02d}-{d:02d}'
    rest = raw[md.end():]
    out['approx'] = bool(re.search(r'[~≈]|\babout\b|\bapprox', raw))
    mb = re.search(r'\[(NIGHT|DUSK|DAWN)\]|\b(NIGHT|DUSK|DAWN)\b', raw)
    if mb: out['band'] = (mb.group(1) or mb.group(2))
    # split off parenthetical alternatives
    main = re.sub(r'\([^)]*\)', lambda m: ' ', rest)
    main = re.sub(r'\[?(NIGHT|DUSK|DAWN)\]?(/TWILIGHT)?', ' ', main)
    paren = re.findall(r'\(([^)]*)\)', rest)
    def conv(h, m):  # hours >= 24 spill to next day (PDF notes write 24:00, 26:00)
        return minutes(y, mo, d, int(h), int(m))
    ts = [conv(h, m) for h, m in TIME.findall(main)]
    if ts:
        out['earliest'], out['latest'] = min(ts[:2]), max(ts[:2])
        out['default'] = (out['earliest'] + out['latest']) // 2 if len(ts[:2]) == 2 and ts[0] != ts[1] else ts[0]
        out['parse_status'] = 'range' if len(ts[:2]) == 2 and ts[0] != ts[1] else 'point'
    else:
        ph = re.search(r'\b(early morning|morning|forenoon|midday|noon|afternoon|late afternoon|evening|night|dusk|dawn|all day|midnight|daybreak|before dawn|pre-dawn)\b', main, re.I)
        out['phrase'] = ph.group(1).lower() if ph else None
        if out['band'] in BANDS and not ph:
            lo, hi = BANDS[out['band']]; out['earliest'], out['latest'] = minutes(y, mo, d, 0, 0) + lo, minutes(y, mo, d, 0, 0) + hi
            out['default'] = (out['earliest'] + out['latest']) // 2; out['parse_status'] = 'band_from_sun_table'
    for p in paren:
        alt = [conv(h, m) for h, m in TIME.findall(p)]
        if alt: out['alternatives'].append({'text': p.strip(), 'times': alt})
    for k in ('earliest', 'latest', 'default'):
        if out[k] is not None: out[k + '_iso'] = iso(out[k])
    return out

def main():
    rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_seed.jsonl'), encoding='utf-8')]
    stats = {}
    with open(os.path.join(G, 'timeline_windows.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows:
            w = parse(r['time_window_raw']); w['id'] = r['id']; w['tier'] = r['tier']
            stats[w['parse_status']] = stats.get(w['parse_status'], 0) + 1
            f.write(json.dumps(w, ensure_ascii=False) + '\n')
    print('rows', len(rows), stats)
    # self-checks
    assert parse('Jul 1 ~16:00')['default_iso'] == '1863-07-01T16:00'
    r = parse('Jul 3 13:00-15:00'); assert (r['earliest_iso'], r['latest_iso'], r['default_iso']) == ('1863-07-03T13:00', '1863-07-03T15:00', '1863-07-03T14:00')
    assert parse('Jul 3 morning (hour not given)')['parse_status'] == 'phrase_only'
    r = parse('Jul 3 ~13:00 (13:00-14:00 per Eshleman)'); assert r['default_iso'] == '1863-07-03T13:00' and r['alternatives'][0]['times'][0] == minutes(1863, 7, 3, 13, 0)
    assert parse('Jul 2 [NIGHT]')['parse_status'] == 'band_from_sun_table'
    assert parse('Jul 3 24:00')['default_iso'] == '1863-07-04T00:00'
    print('timewindows self-test OK')

if __name__ == '__main__':
    main()
