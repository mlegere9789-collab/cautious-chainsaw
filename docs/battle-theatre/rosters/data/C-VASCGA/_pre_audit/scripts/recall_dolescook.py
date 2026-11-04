"""Recall check for the Doles-Cook parse: lines that look like entry headers (upper case, comma, ending in a dash) but were not taken as entries.
Writes recall_dolescook.txt (the tombstone log for rows that could not be read). Run: python -X utf8 recall_dolescook.py"""
import re, sys, csv, glob
sys.argv = ['x']
import dolescook_parse as P
cand = []
for uid, regname, a, b in P.REGS:
    for i in range(P.roll_start(a, b) - 1, b):
        s = re.sub(r'\s+', ' ', P.lines[i]).strip()
        if re.match(r'^[^a-z]{6,}[—\-~–]\s*$', s) and ',' in s and not s.startswith('MUSTER') and not P.HDR.match(P.lines[i]) and not (P.HDR2.match(P.lines[i]) and P.upper_frac(P.HDR2.match(P.lines[i]).group(1)) >= 0.6 and len(P.lines[i].strip()) <= 80 and not re.match(r'^\s*(MUSTER|PANY|COM)', P.lines[i])):
            cand.append((uid, i + 1, s))
open('recall_dolescook.txt', 'w', encoding='utf8').write('\n'.join('%s line %d: %s' % c for c in cand))
print(len(cand), 'candidate header lines not taken as entries')
for c in cand[:10]:
    print(c)
