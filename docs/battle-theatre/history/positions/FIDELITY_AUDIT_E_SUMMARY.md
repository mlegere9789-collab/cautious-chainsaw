# Fidelity audit, ledger E (state regimental volumes)

Scope: positions_E.jsonl (199 claims: 90 documented, 109 inferred). Ledger not edited. Seed 23 (see FIDELITY_SAMPLE_E.json). Each passage was located with tools/bt/statevol_find.py logic (normalized text, offset mapped back to the raw volume) and read 1,200 characters either side; where the claim named material outside that window the cited section was searched. Judged against the passage only.

## Counts

| Group | n | FAITHFUL | OVERSTATED | SHIFTED | UNSUPPORTED_HERE |
|---|---|---|---|---|---|
| Documented, random sample (30, stratified by kind) | 30 | 22 | 4 | 2 | 2 |
| Inferred, random sample | 10 | 10 | 0 | 0 | 0 |
| Targeted extras, documented (three 84th PA, 26th PA Black Horse Tavern) | 4 | 2 | 2 | 0 | 0 |
| Targeted extras, inferred (XI Corps 2nd Division roads) | 4 | 3 | 1 | 0 | 0 |
| Total | 48 | 37 | 7 | 2 | 2 |

Documented sample fidelity rate: 22/30 = 73 percent FAITHFUL. Only three of the non-faithful claims are material: POS-E-US-3C-2D-BREWSTER-120NY-001, POS-E-US-3C-2D-CARR-26PA-006 and POS-E-US-3C-2D-CARR-84PA-003. The rest are minor glosses or support located elsewhere in the same section.

## Non-FAITHFUL claims, exact difference

Material:
- POS-E-US-3C-2D-BREWSTER-120NY-001 (SHIFTED). The claim places the 120th NY on the left of Humphreys' line with Carr's brigade on the right holding the Emmitsburg road, dated July 2 before 4 o'clock (the second position). The anchor sentence is de Trobriand's description, quoted by Sharpe, of the line after the change of front, once Graham's angle broke about 6 o'clock. The second-position paragraph is separate and earlier and does not say the 120th was on the left. The author (Sharpe) was on Meade's staff and is quoting another officer.
- POS-E-US-3C-2D-CARR-26PA-006 (SHIFTED). Date field 1863-07-02; the passage says the third day. The ledger note records the conflict, but the date field departs from the printed text. "Led all Pennsylvania regiments in killed and wounded" is implied, not stated (other regiments are said to have approached its losses).
- POS-E-US-3C-2D-CARR-84PA-003 (OVERSTATED). The claim says the monument was placed near Carr's headquarters. Carr's letter only suggests that it be erected there. Other elements (guard duty from the morning of July 1, relief July 6, report at Williamsport, between Emmitsburg and Gettysburg) are in the letter.

Minor:
- POS-E-US-11C-3D-KRZYZANOWSKI-119NY-002: "(north of the town)" added; passage has only through the town to the front.
- POS-E-US-11C-3D-KRZYZANOWSKI-75PA-002: "forenoon" gloss absent from the passage.
- POS-E-US-CAV-3D-FARNSWORTH-18PA-002: "forenoon" for the Hanover fight; passage gives no hour.
- POS-E-US-11C-2D-001 (same text as 11C-3D-001): "forenoon" fits the 45th NY (11:15) but not Steinwehr's division (about 2 p.m. elsewhere).
- POS-E-US-11C-2D-COSTER-73PA-003: road of approach "the Emmitsburg road" is inferred from the junction name; the passage never says the corps marched on it.
- POS-E-US-3C-2D-CARR-26PA-002: "the road passing the Black Horse Tavern" and the note's "strayed onto the Black Horse Tavern road" go beyond the passage (tavern named as the place of the Confederate lines; no road named).
- POS-E-US-CAV-1D-DEVIN-6NY-002 and POS-E-US-CAV-3D-CUSTER-5MI-003 (UNSUPPORTED_HERE, no error): the anchor passage covers only part of the claim; the rest is in the same section (inscription on pp. 1131-1132; the Littlestown night march on p. 138).

## The three 84th Pennsylvania supply-train claims (PA1B-S027, pp. 474-475)

-001 and -002 are FAITHFUL to Captain Merchant's address (order at Taneytown the night of June 30; started with the train July 1 on the Taneytown-Emmitsburg road; order to report at Westminster). -003 is FAITHFUL to Carr's letter except the monument-placement overstatement above. The two accounts differ on where the train was on July 1 (Taneytown-Emmitsburg road versus between Emmitsburg and Gettysburg) and on who asked for the order to be rescinded (Opp versus his adjutant); neither claim blends them. Both sources place the regiment with the train, not on the field.

## XI Corps 2nd Division Emmitsburg Pike / Black Horse Tavern

11C-2D-004 (inferred, 154th NY sketch: last to reach Cemetery Hill by the Emmitsburg Pike) is FAITHFUL and correctly inferred. 154NY-003, 11C-2D-002, COSTER-005, 134NY-001, 1NYI-002 and 1NYI-006 are FAITHFUL. The only road overstatement is 73PA-003. No XI Corps claim names the Black Horse Tavern; that claim belongs to Carr's brigade (3rd Corps) and is the 26PA-002 item above. Source conflict, not a fidelity error: Allen has 50 men from each of four regiments on a flank watch at daybreak July 1; the 154th NY sketch has 50 men each of the 154th and 73rd PA on a Strykersville reconnaissance June 30.

## Tier checks

Inferred sample: no inferred claim is understated (all unsigned sketches or another regiment's witness). Documented overstated or doubtful against the rule (own regiment's officers as authors, stated as fact):
- 120NY-001: Sharpe quoting de Trobriand; the ledger rates his sister claim BREWSTER-001 inferred. Treat both alike.
- 84PA-003: Carr is brigade commander.
- 73PA-004: embeds a compiler (Bates) sentence in a documented claim.
- 7MI-001, 5MI-003, CAV-3D-003: Kidd was a captain of the 6th Michigan speaking of other regiments and the division.
- 26PA-002/-003/-006 (Private Cooper) and 75PA-001/-002/-004 (First Sergeant Nachtigall): regimental members, not officers.
- 73NY-002, 6NY-003, 157NY-002: monument inscriptions; authorship not shown.

## Patterns

1. Time-of-day glosses ("forenoon", "afternoon") and compass directions ("north of the town") added in parenthetical when/place text, not in the passage (5 claims).
2. A road of approach stated where the passage gives only a place (73PA-003, 26PA-002).
3. Two passages fused into one time slot (120NY-001) and a suggestion turned into an event (84PA-003).
4. Tier drift: non-officer, other-regiment or quoted authors under documented.

## Recommendation

Accept the numbers, places and verbs (no number or unit identity error in 48 claims). Re-check scope for patterns 1 and 2 (when.printed glosses and direction_or_road fields on documented arrival_road and march claims) and for pattern 4 (tier by author). Correct 120NY-001, 26PA-006 and 84PA-003 before use. The ledger should not be treated as fully clean until those are fixed.
