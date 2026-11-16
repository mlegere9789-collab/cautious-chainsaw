# Corrections to earlier extracts (workstream bt-web, task nps-landscape)

Every correction found when an earlier extract was checked against a page image or a better text variant. The extract keeps its id (`xid`); the definition file line was changed in place, the builder was run again and `scripts/verify_extracts.py` finds the new quote. The evidence and timeline lines in `GOVERNANCE/evidence_corrections/web-nps-landscape.jsonl` and `GOVERNANCE/timeline_corrections/web-nps-landscape.jsonl` are rebuilt from the extracts (the integrators must take the rebuilt line for this id and drop the old one).

## 2026-11-15

### NPSX-HSR-LEISTER-BARN-p025-01 (Leister barn, fencing beside the barn): the meaning was inverted
- What was wrong: the first reading cut the quote from the reading-order text of the Leister report, which interleaves lines of the typescript. In that text the word `not` of the sentence stands after `rail` (`...extend outward two units of post and rail not fence (east)...`). The definition deleted it with the pair `{{not|}}` as a stray word and so the record said that the fencing pattern "appears to have changed" (claim, quote and state date).
- What the page says (page image of PDF p. 25 looked at): "The fencing pattern adjacent to the barn appears not to have changed: two units of post and rail fence extend outward (east) from the SE corner of the shed to meet a north/south wall and rider fence. Together, they enclosed an eastern barnyard." The sentence belongs to the section on the Tyson stereoview of 1866-68 (heading on PDF p. 23): in the Tyson view the pattern appears not to have changed from the Gardner view of 1863.
- What changed: the quote is cut from the layout text of the report (flag `~L`; it reads the lines in order), the claim and the state date say "appears not to have changed", the Tyson heading of PDF p. 23 is the context quote, and the certainty stays hedged ("appears").
- How it was found: while reading the layout text of PDF pp. 13-29 for the second reading of the report (b3-leister-barn.xdef), the sentence read differently in the two text variants.
- Audit afterwards (repeated on 2026-11-16 over all 1,308 records): the 222 correction pairs of the extracts were scanned for a deleted word or a changed negation between the text layer and the quote. There are 8 deletions, all numerals (list and footnote numbers: `2.`, `3.`, `1*.`, `71`, `72`, `117`, `33`, `36`) and no pair touches a negation word. Two quotes (NPSX-HS-MCPHERSON-p107-01 and -03) show a negation count that differs from their raw excerpt only because the text layer is letter-spaced (`D id n o t s e e` is `Did not see`; `d o e s n o t t h i n k` is `does not think`).

### Digits read from page images in the second readings (not errors of earlier records; recorded because the text layer was wrong)
- NPS-BRIEN-FARM PDF p. 15: the text layer reads "195 panels ... $ 175", the page image reads 194 panels and $174 (the typewriter's 4 is read as 5). The new record NPSX-BRIEN-FARM-p015-03 carries the pair `{{(195|(194}}` and `{{175;|$174;}}`.
- NPS-HSR-SLYDER PDF pp. 9 and 10: the text layer reads "(189!?)$" for the brooder house and corn crib (page image: 1895) and "18S>2" for the date-stone (page image: 1852); the quotes carry the pairs.

## 2026-11-16

### Typed forms of the Historic American Buildings Survey (1950s): words the text layer misreads
- The Library's scans of the typed forms (HABS Nos. PA-342 to PA-363) carry recognition errors (`Gulp House` for `Culp House`, `1312` for `1812`, `Hoof shingled` for `Roof shingled`, `Givil War` for `Civil War`). Every extract cut from such a form was checked against the page image (page_image_viewed true); the two misread words that sit inside a quote carry explicit pairs (`{{Hoof|Roof}}` in NPSX-HABS-pa0012-p002-02 and `{{Givil|Civil}}` in NPSX-HABS-pa0020-p002-01); the dates (1812, 1832, 1852, 1863, 1957) were read from the images, and the date of the Black Horse Tavern is taken from the Library's own record text (page 0), not from the misread form.
- The Library's record of the McClean house gives the initial construction as before 1853 in its dates line and before 1858 in its significance note; both are quoted (NPSX-HABS-pa0015-p000-02, source wording: conflict), neither is changed.
