import json,collections,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
R=[json.loads(l) for l in open('results.jsonl',encoding='utf-8')]
qf=[r for r in R if r['kind']=='quote-field']; em=[r for r in R if r['kind']!='quote-field']
def cnt(rs): return collections.Counter(r['found'] for r in rs)
rm=[r for r in R if 'REPORT MISMATCH' in r['note']]; pm=[r for r in R if 'page differs' in r['note']]; pn=[r for r in R if 'not claimed pt' in r['note']]
uq=len({r['quote'] for r in R if r['found']!='not_checkable'})
L=['# OR-RECHECK: shard quotes vs Official Records Ser. I vol. 27 OCR text','',
'Method: `or_recheck.py` (this folder; run `python -I or_recheck.py`, then `make_report.py`) reads every `horde/*/results.jsonl` (read-only), extracts quote strings (fields `quote`, `exact_quote`, `passage_quote`, `quote_under_15_words`; plus, lower confidence, double-quoted fragments of 4+ words inside `passage_ref` / `supporting_passage*` free text), and searches them in the raw OCR text of pt.1-3 (archive.org cu31924077699761, cu31924077728255, cu31924077700262; sha256 in tmp/library/or27/MANIFEST.json, identical to library/acquired.json) using the or27_find normalised view (whitespace, line-break hyphenation, running heads removed). Verdicts: **yes** = verbatim in the normalised text; **fuzzy** = matches only after case/punctuation/ligature/long-s squashing (distance 0) or within 15% edit distance (distance recorded); **no** = not found (nearest candidate recorded, never accepted); **not_checkable** = attributed to a non-OR source (e.g. New York at Gettysburg), not in the downloaded text. A quote is searched in its claimed part first, then the other parts. Offsets are character offsets in the original raw file. Ellipsis/bracketed quotes are split into pieces, all of which must match.','',
'## Counts','','| group | yes | fuzzy | no | not_checkable | total |','|---|---|---|---|---|---|']
for n,rs in (('structured quote fields',qf),('embedded quoted fragments in free text (low confidence)',em),('all',R)):
    c=cnt(rs);L.append('| %s | %d | %d | %d | %d | %d |'%(n,c['yes'],c['fuzzy'],c['no'],c['not_checkable'],len(rs)))
L+=['','Distinct quote strings checked (excluding not_checkable): %d. The same quote often appears in several fields or shards.'%uq,'',
'Citation drift among found quotes: report id differs from the shard citation %d, printed page differs %d (often a one-page or page-range difference), found in a different part than claimed %d. Short generic quotes (e.g. "At 12 m.") match their first occurrence and are inherently ambiguous. See `note`.'%(len(rm),len(pm),len(pn)),'',
'## Quotes NOT found','','### Structured quote fields (%d)'%cnt(qf)['no'],'',
'All are tl-12 strings labelled `quote` that are summaries/paraphrases (form "Name: ..."), not verbatim text, so they cannot match; they should not be presented as quotations.','']
for r in qf:
    if r['found']=='no': L.append('- %s %s (pt.%s claimed, nearest edit distance %s): %s'%(r['shard'],r['row_id'],r['claimed_part'],r['edit_distance'],r['quote'][:160].replace('\n',' ')))
L+=['','### Embedded fragments of free text not found (%d; LOW CONFIDENCE)'%cnt(em)['no'],'',
'Extracted by pattern from quotation marks inside prose fields. Many are paraphrase, code regexes, web-page text (NPS, LOC) or extraction artifacts, not OR quotations. Listed so none is hidden; each needs a human look before being called a defect.','']
for r in em:
    if r['found']=='no': L.append('- %s %s: %s'%(r['shard'],r['row_id'],r['quote'][:140].replace('\n',' ')))
L+=['','### Fuzzy (%d)'%cnt(R)['fuzzy'],'','See results.jsonl rows with found=fuzzy (edit_distance and note).','',
'### not_checkable (%d)'%cnt(R)['not_checkable'],'','Quotes attributed to non-OR sources (fence-2 New York at Gettysburg etc.); not verified here.','']
open('REPORT.md','w',encoding='utf-8').write('\n'.join(L))
print(cnt(qf),cnt(em),cnt(R),len(rm),len(pm),len(pn),uq)
