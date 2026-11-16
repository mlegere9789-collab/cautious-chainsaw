"""Recompute the hit counts of the lookup records of the older rows with real regular expressions (read-only).  python3 -I lookups_recompute.py"""
import sys, re, os, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tlib
ORT = {p: tlib.get_part(p) for p in (1, 2, 3)}
def or_ids(part, ids):
    """matches of pattern inside the report records whose number is in ids (set of ints) of vol. 27 part `part`"""
    P = ORT[part]
    recs = [r for r in tlib.OR_IDX if r['part'] == part]
    sel = []
    for r in recs:
        m = re.match(r'OR27-%d-[RSD](\d+)$' % part, r['id'])
        if m and int(m.group(1)) in ids: sel.append(r)
    return P, sel
def or_count(part, ids, pat):
    P, sel = or_ids(part, ids)
    rx = re.compile(pat, re.I); n = 0
    for r in sel:
        s = bisect.bisect_left(P.nmap, r['start_offset']); e = bisect.bisect_left(P.nmap, r['end_offset'])
        n += len(rx.findall(P.ntext[s:e]))
    return n, len(sel)
def rng(a, b): return set(range(a, b + 1))
LIB = {sid: tlib.lib_text(sid)[2] for sid in sorted(tlib.lib_ids()) if not sid.startswith(('ADAMS-SENTINEL', 'GBG-COMPILER', 'T-or27'))}
NPS = {sid: tlib.nps_text(sid)[2] for sid in tlib.nps_ids() if not sid.startswith('NPSWEB-')}
def lib_count(pat, only=None):
    rx = re.compile(pat, re.I); tot = 0; k = 0
    for sid, t in LIB.items():
        if only and not sid.startswith(only): continue
        n = len(rx.findall(t)); tot += n; k += 1 if n else 0
    return tot, k
def nps_count(pat, only=None):
    rx = re.compile(pat, re.I); tot = 0; k = 0
    for sid, t in NPS.items():
        if only and not sid.startswith(only): continue
        n = len(rx.findall(t)); tot += n; k += 1 if n else 0
    return tot, k
def all_or(pat, parts=(1,)):
    rx = re.compile(pat, re.I)
    return sum(len(rx.findall(ORT[p].ntext)) for p in parts)
R = []
def add(row, label, pat, val): R.append((row, label, pat, val)); print(row, '|', label, '|', pat[:100], '|', val)
add('P-01', 'OR1 R076-R135', r'stone wall|stone fence|low wall', or_count(1, rng(76, 135), r'stone wall|stone fence|low wall'))
add('P-01', 'LIB', r'(stone fence|stone wall|low wall).{0,200}(angle|clump of trees|copse)|(angle|clump of trees|copse).{0,200}(stone fence|stone wall|low wall)', lib_count(r'(stone fence|stone wall|low wall).{0,200}(angle|clump of trees|copse)|(angle|clump of trees|copse).{0,200}(stone fence|stone wall|low wall)'))
add('P-01', 'NPS 80 yd', r'(eighty|80)[- ](yards|yds\.?|feet|ft\.?).{0,300}(angle|wall)|(angle|wall).{0,300}(eighty|80)[- ](yards|yds\.?|feet|ft\.?)', nps_count(r'(eighty|80)[- ](yards|yds\.?|feet|ft\.?).{0,300}(angle|wall)|(angle|wall).{0,300}(eighty|80)[- ](yards|yds\.?|feet|ft\.?)'))
add('P-01', 'NPS copse height', r'(copse|clump of trees).{0,300}(feet|foot|ft\.)', nps_count(r'(copse|clump of trees).{0,300}(feet|foot|ft\.)'))
add('P-02', 'OR1 R243-R270', r'stone wall|stone fence|lane|brick-kiln', or_count(1, rng(243, 270), r'stone wall|stone fence|lane|brick-kiln'))
add('P-02', 'OR2 all', r'brickyard|brick-kiln', all_or(r'brickyard|brick-kiln', (2,)))
add('P-02', 'NPS', r'Brickyard Lane', nps_count(r'Brickyard Lane'))
add('P-02', 'LIB', r'Brickyard Lane', lib_count(r'Brickyard Lane'))
add('P-03', 'OR1 R243-R270', r'stone wall|stone fence', or_count(1, rng(243, 270), r'stone wall|stone fence'))
add('P-03', 'NPS', r'Baltimore (Pike|Turnpike).{0,300}(stone wall|stone fence|walls?)|(stone wall|stone fence|walls?).{0,300}Baltimore (Pike|Turnpike)', nps_count(r'Baltimore (Pike|Turnpike).{0,300}(stone wall|stone fence|walls?)|(stone wall|stone fence|walls?).{0,300}Baltimore (Pike|Turnpike)'))
add('P-04', 'OR1 R152,R153,R192', r'stone wall|wheat-field|Rose', or_count(1, {152, 153, 192}, r'stone wall|wheat-field|Rose'))
add('P-04', 'OR2 R432', r'stone wall', or_count(2, {432}, r'stone wall'))
add('P-04', 'NPS', r'Rose Woods?.{0,300}(stone wall|wall)|(stone wall|wall).{0,300}Rose Woods?', nps_count(r'Rose Woods?.{0,300}(stone wall|wall)|(stone wall|wall).{0,300}Rose Woods?'))
add('P-05', 'OR1 R135,R146,R147', r'stone wall|stone fence', or_count(1, {135, 146, 147}, r'stone wall|stone fence'))
add('P-05', 'OR2 R452-R458', r'stone wall|stone fence|rock fence', or_count(2, rng(452, 458), r'stone wall|stone fence|rock fence'))
add('P-05', 'NPS', r'Houck.{0,300}(wall|fence)|(wall|fence).{0,300}Houck', nps_count(r'Houck.{0,300}(wall|fence)|(wall|fence).{0,300}Houck'))
add('P-05', 'LIB', r'(Ellis|Cromwell).{0,300}(stone wall|wall)|(stone wall|wall).{0,300}(Ellis|Cromwell)', lib_count(r'(Ellis|Cromwell).{0,300}(stone wall|wall)|(stone wall|wall).{0,300}(Ellis|Cromwell)', 'NY-GB'))
add('P-06', 'OR1 R318,R320', r'stone wall|Bigelow|prolonge', or_count(1, {318, 320}, r'stone wall|Bigelow|prolonge'))
add('P-06', 'OR1 all', r'Trostle', all_or(r'Trostle', (1,)))
add('P-06', 'LIB', r'Trostle', lib_count(r'Trostle'))
add('P-06', 'NPS', r'Trostle', nps_count(r'Trostle'))
add('P-07', 'OR1 R036-R060', r'stone wall|stone fence|fence', or_count(1, rng(36, 60), r'stone wall|stone fence|fence'))
add('P-07', 'OR2 R504-R519', r'stone wall|stone fence', or_count(2, rng(504, 519), r'stone wall|stone fence'))
add('P-07', 'OR1-2 Oak Ridge', r'Oak Ridge', all_or(r'Oak Ridge', (1, 2)))
add('P-07', 'NPS', r'Forney.{0,300}(stone wall|stone fence)|(stone wall|stone fence).{0,300}Forney', nps_count(r'Forney.{0,300}(stone wall|stone fence)|(stone wall|stone fence).{0,300}Forney'))
add('P-08', 'OR1 R272-R306', r'stone wall|stone fence', or_count(1, rng(272, 306), r'stone wall|stone fence'))
add('P-08', 'NPS', r'Pardee Field', nps_count(r'Pardee Field'))
add('P-09', 'OR1 R272-R282', r'stone wall|stone fence|rods', or_count(1, rng(272, 282), r'stone wall|stone fence|rods'))
add('P-09', 'OR1 R271-R313', r'rods', or_count(1, rng(271, 313), r'rods'))
add('P-10', 'OR1 R098-R101,R146,R158,R167', r'fences|breastwork|demolish', or_count(1, {98, 99, 100, 101, 146, 158, 167}, r'fences|breastwork|demolish'))
add('P-10', 'OR2 R441,R552,R553', r'post and rail|post and plank', or_count(2, {441, 552, 553}, r'post and rail|post and plank'))
add('P-10', 'NPS', r'Emmitsburg Road.{0,300}fences?|fences?.{0,300}Emmitsburg Road', nps_count(r'Emmitsburg Road.{0,300}fences?|fences?.{0,300}Emmitsburg Road'))
import json
json.dump(R, open('/home/user/cautious-chainsaw/tmp/terrain-2/work/lookups_recomputed.json', 'w'), indent=1)
