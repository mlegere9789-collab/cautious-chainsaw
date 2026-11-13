# Request from bt-timeline (shard tl-02 close-out), 2026-11-13

Files I do not own and what I would like changed in them. Nothing below was edited by me.

## 1. tools/bt/merge_horde.py (and the files it writes)
- Read GOVERNANCE/timeline_corrections/*.jsonl and overlay, per row id, `corrected_claim.tier`, `verdict` and `remains_unsupported` on timeline_verified.jsonl (new fields, do not overwrite `status_effective`). The tl-02 lines carry `tier_change` (seed, shard_effective, corrected) so a promotion can be seen and gated.
- Treat `library_passages` (verbatim quotes from non-OR texts) as citations: they are stored under the key `verbatim` on purpose so that horde/OR-RECHECK/or_recheck.py does not try to find them in the Official Records.
- Expected effect on status_effective for tl-02: rows T1-058..T1-115 keep status `verified` only where the corrected claim is documented; partially supported rows are stored as `inferred`.

## 2. GOVERNANCE/register/ (existing entries)
Proposed updates are in horde/tl-02/proposed-register/ (titles start with "proposed update of EG-TL-T1-0xx"):
- EG-TL-T1-066: close at corps level (III Corps Bridgeport, V Corps Union Mills, II Corps Uniontown); brigade level stays open (tl-02-CO-T1-066).
- EG-TL-T1-067: picket posts and camp layout now documented; fires, cooking and civilians stay open (tl-02-CO-T1-067).
- EG-TL-T1-071: picket posts documented at unit and post level (Beveridge 1891; Cheney 1901); coordinates and the advance-post holder stay open (tl-02-CO-T1-071).
- EG-TL-T1-073: morning civilian activity documented from about breakfast; dawn stays open (tl-02-CO-T1-073).
- EG-TL-T1-104: unchanged, still no location of aid posts (tl-02-CO-T1-104).
The older proposed entries tl-02-EG-007, -008 and -012 are marked "proposed closed" by the close-out evidence (Biddle 1880; New York vol. 2; U.S. Cavalry Tactics 1841/1855); the integrator decides.

## 3. GOVERNANCE/conflict_register.json and conflicts_structured.json (new conflicts found, no default recorded)
Carry as selectable scenarios, none has a recorded delegated default:
1. First contact hour on Jul 1 (T1-082): 05:30 / 07:30 / about 08:00 / about 08:30 / 08:00-09:00 / 09:30 (sources in timeline_corrections/tl-02.jsonl, row T1-082).
2. First shot (T1-083): Lt. Jones 8th Illinois 7:30 (Illinois Monuments 1892) / 9th New York corporal about 5:30 (Cheney 1901, Hall 1908) / Roder's first Union gun (Calef).
3. Pipe Creek circular written late Jun 30 (Meade 1913) or dated Jul 1 (OR heading and Meade report) (T1-061).
4. Reynolds' message to Meade: left about 10:00 (Weld diary; Meade 1913) against 09:00-09:30 (row) (T1-091).
5. Hall's retirement about 11:10 on his own clock against 10:45 in the row, and one or two pieces left (Hall, Calef) (T1-106).
6. Sky and ground on the morning of Jul 1: clear (Beveridge) / muggy, roads very bad (Weld) / very cloudy (Jacobs, via a secondary summary not found in his 1864 text) (T1-075, T1-080).
7. John Burns: about noon (Eustice, Huidekoper) against 10:15-10:30 (row) (T1-100).
8. 147th New York losses 207 (Cutler) against 301 counting missing (Fox) (T1-103).
Existing conflict C-040 (Reynolds' death) was applied unchanged with two new scenario values (about 10:00 Beveridge; rifle volley Weld).

## 4. Product notes (app data owners)
- The row T1-099 text "Show a rifle round; do not show a shell" is a scenario, not a finding: Heth (OR p.637) says a shell.
- Calef's sections: Newman commanded the LEFT section and Pergel the CENTRE section (Calef's own report), not the other way round; it was Pergel's section that was withdrawn because the woods came within 200 yards.
- Archer's brigade has five units (13th Alabama, 5th Alabama Battalion, 1st, 7th, 14th Tennessee).
- "Grey Eagle", "Herbst Woods", the 7-mile cavalry front and the 15-foot cut depth are in no text read; do not show them as documented.
