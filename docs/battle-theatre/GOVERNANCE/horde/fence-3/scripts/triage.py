"""Triage for the second reading: for every sub-claim with cites, list numbers and capitalised names of the claim that are NOT found in the
text of its cited quotes (nor the citation notes). Output is a worklist, not a verdict."""
import json, re, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-3.jsonl'
only = sys.argv[2] if len(sys.argv) > 2 else None
WORDS = {'The','A','An','In','On','At','By','Of','For','To','No','Not','It','Its','He','His','They','Their','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Jul','July','Aug','Nov','NPS','OR','PDF','SS','NY','PA','Official','Records','Union','Confederate','Corps','Division','Brigade','Battery','Regiment','Cavalry','Infantry','Artillery','Army','General','Gen','Col','Lt','Capt','Maj','Major','Colonel','Captain','Lieutenant','Brig','See','This','These','That','Those','There','When','While','After','Before','During','Between','From','Until','With','Without','And','But','Or','Also','Both','Each','Every','Some','Most','All','Any','Many','Few','Only','Still','Then','Thus','Here','Where','Which','Who','Whose','What','Why','How','If','As','Is','Was','Were','Are','Be','Been','Has','Had','Have','Do','Does','Did','Will','Would','Could','Should','May','Might','Must','Can','Cannot','Plan','Printed','Row','Shard'}
def toks(s):
    nums = set(re.findall(r'\d[\d,.:]*\d|\d', s))
    names = set(w for w in re.findall(r"\b[A-Z][a-z]{2,}(?:'s)?\b", s) if w not in WORDS)
    return nums, names
def nrm(s):
    return re.sub(r'\s+', ' ', s.replace('’', "'")).lower()
for l in open(P):
    d = json.loads(l)
    if only and d['schedule_id'] != only:
        continue
    for sc in d['subclaims']:
        if not sc['cites']:
            continue
        blob = nrm(' '.join(d['citations'][c]['quote'] + ' ' + (d['citations'][c].get('note') or '') + ' ' + (d['citations'][c].get('section_title') or '') + ' ' + (d['citations'][c].get('source') or '') for c in sc['cites']))
        nums, names = toks(sc['claim'])
        missing_n = sorted(n for n in nums if nrm(n).rstrip('.,') not in blob and nrm(n).replace(',', '') not in blob.replace(',', ''))
        missing_w = sorted(w for w in names if nrm(w).replace("'s", '') not in blob)
        if missing_n or len(missing_w) >= 2:
            print('%s [%s/%s] nums-not-in-quotes=%s names-not-in-quotes=%s' % (sc['sc'], sc['tier'], sc['support'], missing_n, missing_w[:14]))
