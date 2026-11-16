# Text blocks of the sixth pass of GATE-SPEC-B.md, part 2 (section 3 rows, 5, 6). Used by build_doc.py.

# ---- section 3: cells to append to column 3 and replacement of column 4, per gate (None = keep) ----
ROWS = {
 'Q01': ('; runner `q01_oob.py` (54 tests) with a stored result (FAIL: 3,510 BLOCKED-INPUT, 133 FAIL, 0 PASS) (pass 6)',
         '`kit/verified_oob.json` not written (a scratch build gives 82 of 825 units verified, 46 partly, 697 unverified at 02:44 on 16 November from four kit evidence groups); every table-dependent item is BLOCKED-INPUT; 133 presence items FAIL (the 108 units the layer does not draw and 25 formations); the dense scan is owed; cannot pass on inputs'),
 'Q02': ('; runner `q02_provenance.py` (35 and 15 tests) with a stored result (FAIL: 176 FAIL, 49 PASS, 76 N/A over the 55 datum classes of its registry) (pass 6)',
         'the data: tiers, extracts, premise claims, procedural blocks and Source Manifest fields are missing in many classes (4, Q02); the census passes; "the claim equals what the span supports" is owed (U-11)'),
 'Q03': ('; runner `q03_anachronism.py` (117 and 6 tests), no stored result yet (pass 6)',
         'no stored result; K.9 read literally fails the kit data (248 of 249 items state no validity), the drawn flag has 34 stars after 4 July, no ground audit file exists; a full run is about 300 s of CPU, through the lock'),
 'Q04': ('; runner `q04_arrival.py` (67 tests), no stored result (pass 6)',
         'the dense run over S* (333 scenarios in 10 groups) on the dense grid never started; the layer has no entity for the 108 undrawn units; the pixel statement is owed on a browser'),
 'Q05': ('; runner `q05_speed.py` (42 tests), no stored result (pass 6)',
         'no stored result; no documented range for limbers, caissons, wagons or gun pieces on the road (BLOCKED-INPUT until an open L3 register entry exists); the full S* run never started'),
 'Q06': ('; runner `q06_path.py` (49 tests), no stored result (pass 6)',
         'the 108 units the layer does not draw have no path (FAIL, the research files of 1,536 records are not consumed by the layer); the 90 s deployment is procedural and has no register entry'),
 'Q10': ('; pass 6: negative controls of the WebGPU harness (`weather3d-gpu-negctl.mjs`) and a static scrub-purity lint of the weather path', None),
 'Q12': ('; pass 6: node reproductions of the scrub and arrival-window tests (`sw-round-1/pre/`), the crowd levels-of-detail hooks (`lod.mjs`: 23 + 6 tests), the static purity lint', None),
 'Q14': ('; runner `q14_ordnance.py` (47 tests) with a stored result (FAIL: 61 FAIL, 101 BLOCKED-INPUT, 43 PASS) (pass 6)',
         'no verified battery table (a scratch build gives 0 of 131 batteries verified); the layer draws 0 Confederate guns and 124 Union guns against the plan\'s 281 to 282 and 366 to 372; one battery\'s fire plan fires 784,105 rounds; 9 of the 16 OCR texts absent here'),
 'Q15': ('; pass 6: the owner\'s PC (MSI) is connected through Remote Control but its folder cannot be attached by a cloud session; the campaign log plans a session on the PC', None),
 'Q19': ('; runner `q19_claims.py` (26 tests) with a stored result (FAIL: 121 FAIL, 29 PASS) (pass 6)',
         'no recorded independence in the Source Manifest (3,603 entries, none with a relation), no Section P ledger, 586 of 5,374 ledger claims have no span, 39 of 49 visible data classes name no claim id'),
 'Q20': ('; runner `q20_cavalry.py` (41 tests) with a stored result (FAIL: 212 FAIL, 79 BLOCKED-INPUT, 20 PASS) (pass 6)',
         '33 documented cavalry units not drawn, no machine action table, no verified OOB, 48 regiments with no arms record of their own, EG-CAV-01 to 08 not in the register'),
 'Q21': ('; at 02:46 on 16 November 927,000 states on 927 units and 589 claims, 0 failures, and `checkScene` 252,144 states, 0 failures (pass 6)', None),
 'Q23': ('; runner `q23_marking.py` (36 and 12 tests) with a stored result (FAIL: 43 FAIL, 50 PASS) (pass 6)',
         'marks missing for audio, animation clips, gun counts, individual soldiers and open gaps; the frames are NOT-RUN; 11 of 385 non-documented register entries have no marking (the older check says 10)'),
 'Q25': ('; runner `q25_library.py` (38 tests) with a stored result (FAIL: 237 FAIL, 15 PASS) (pass 6)',
         '75 acquisition entries reached by no status row, 78 acquisition-list rows with no status row, no `terms.json` and no work queue, owner steps unwritten for five print-only or licence-checked works'),
 'Q27': ('; pass 6: the owner\'s order of 16 November (no cap) makes it a report, not a comparison', 'report-only: no per-phase spend record in a file, no record of a fresh-context verification per milestone; cannot pass on inputs'),
}

# ---- 5.1 thresholds: rows to append to the table ----
T51_ROWS = r"""| Q02 | a source extract of at most 14 words (the plan: under 15 words, p. 134 E.6) | `lib/pq_common.py MAX_QUOTE_WORDS`, `lib/extracts.py quote_ok`, recorded as T-Q02-1 in the records of Q02 and Q25 | the plan; the working limit of 14 by the runners' author |
| Q05 | foot movement at most 2.5146 m/s times 1.0001; a leg declared `march` averages 1.0668 to 1.3039 m/s and one declared `double_quick` 2.30505 to 2.5146 m/s; a cavalry mount no faster than the slowest documented gallop (4.4704 m/s of Wheeler 1863, against 4.9174 of Cooper 1861 and 6.096 of the Instruction for Field Artillery for teams); path joins and position resolution 1.0 m | `q05_speed.py` (`FACTOR`, `JOIN_M`), `q06_path.py`, recorded as T-Q05-1 and T-Q05-2 | DD-G01 and DD-G-Q05-01 to -05 (delegated, from Hardee, Casey, Wheeler, Cooper and the Instruction) |
| Q06 | a change of formation lasts 90 s | `q06_path.py DEPLOY_S`, recorded as T-Q06-1 | DD-G-Q06-02: the shell's tuning value of DEC-008, plausible-procedural, no manual figure in the repository |
| Q12 (crowd hooks, not a gate threshold) | the share of a coarser level of detail moves by at most 0.0105 for a 1 cm step in distance; at most 96 figures at the finest level | `app/src/crowd/lod.mjs`, `crowd-lod.test.mjs`, `crowd-lod-real.test.mjs` | the crowd lane's author (delegated block of 15 November, "the cross-fade between levels of detail of the crowd") |"""
T51_AFTER = r"""At the sixth pass the thresholds of the new runners are the four rows above; no threshold of an earlier row was changed, and the runners read none from a registry (`gate_results/thresholds.json` does not exist: 2.6). The delegated decisions that fix a reading rather than a number are listed in 2.6."""

# ---- 5.2: new readings ----
R52 = r"""21. Q01.5 "arrivals record with window, place, route and sources": the runner requires place and route of every unit on the field and fails the 108 units the layer does not draw and the 25 formations above no drawn leaf (DD-G-OOB-02); `history.test.mjs` "what is drawn: only units with a printed road of approach; every drawn unit has an entry, every other leaf says why not; counts add up" only requires that the other leaves say why.
22. Q05.1 "within documented ranges": the runner bounds a declared gait from both ends (a leg declared `march` must average 1.0668 to 1.3039 m/s) and a cavalry mount by the slowest documented gallop; the tests bound only the upper end, with the foot double-quick for every mover.
23. Q14.4 and Q14.6 "within documented figures": the runner judges the fire plans the crowd driver builds against the manuals' maxima and the war establishment of 224 rounds a gun doubled (it finds a plan of 784,105 rounds from 33 pieces); the app's ballistics and fx tests check unit-level rates.
24. Q03.2 "valid on its date": the runner reads K.9 literally (every kit item has `valid_from` and `valid_to`: 248 of 249 do not) and fails the 34-star colour on and after 4 July; `check_kit.py` validates manifests and does not ask for the dates on the items.
25. Q23.3 "marked": the runner finds that the works overlay draws a documented and an inferred work alike apart from colour (the same outline pattern and glyph), which the stub-layer test "Evidence overlay: tiers are drawn as colour AND outline AND glyph" of `ui.spec.mjs` does not see.
26. Q02 and Q19 "source and tier", "independent": the runners fail every class whose Source Manifest lacks `date_written`, rights, `reliability_tier` or a recorded relation, while the app's nine contract validators report 0 problems (`contract_validators_of_the_app` in `Q02.json`): the contract does not ask for those fields.
27. Q23.7: 10 of 385 by `check_coverage.py` and 11 by `q23_marking.py` (`n/a` is an empty marking to the second): the stricter reading is the runner's."""

# ---- 5.3: sixth-pass update of the owner-chat rows ----
U53 = r"""Update at the sixth pass (read at 02:4x to 02:5x UTC on 16 November; none of it is a pass rule): no OA row gained a gate id and none of the mappings above changed; the new material is evidence and tests. **OA03** the rosters grew a Pennsylvania lane (`roster-union-pa.test.mjs` 9 tests; `roster-qa.test.mjs` 11), the Maine, Massachusetts, New Hampshire and Vermont files are as at the fifth pass. **OA10** {{L:town}} the structures lane's `check_structures.py` and `structures3d.test.mjs` are unchanged and `structures-node.mjs` of the spec owner reproduces the structures spec's state logic without a browser (Q07). **OA11** {{L:life}} still no camp-life or activity module under `app/src/ext/`. **OA12** {{L:medical}} still no hospital-scenes module and no "Graphic detail" setting. The derived gates OA-G01 to OA-G12 of GATE-SPEC.md 3.1 have no runner. The owner's order of 16 November does not change these rows; its point 4 (resolve the 47 conflicts by research) is the first instruction that changes the inputs of the gates Q02 (Q02.7), Q04 to Q06 (the scenario defaults), Q19 (Q19.6), Q22 and Q28."""

# ---- 5.4: new bullets ----
M54 = r"""- Start `q19_claims.py` or `q23_marking.py` with `python3 -I`: both fail at the import of `q02_provenance` (2.6); start them as scripts.
- Run a runner for an experiment without `--out` (or point `--out` at `GOVERNANCE/gate_results`): the stored record and its `.prev.json` are replaced by a run on whatever the tree holds at that minute (use a scratch folder, as `pass6/run_light2.sh` does).
- Run a dense scan (`--scenarios 'S*' --grid dense`, or `q03_anachronism.py` in full) outside the lock, or from the live tree: the first takes hours on this machine and the second about 300 s of CPU; the runners' author prepared frozen copies (`tmp/bt-gates/q456/snap1` and `snap2`) so that edits in the working tree do not change a run that waits for the lock.
- Read a FAIL on a unit the layer does not draw as a defect of the runner, or hide the unit to make the item pass: it is the layer's open gap (Law 7); and never read a BLOCKED-INPUT as a pass or leave it out of the verdict (it makes the verdict INCOMPLETE).
- Count a record as current when an input it hashed has changed since (`pass6/result_currency.py` compares the recorded sha256 with today's files: at 02:4x UTC 5 of the 102 inputs of `Q02.json` differ), or compare records of different input digests."""

# ---- 6: sixth-pass paragraph ----
P6 = r"""At the sixth pass (locked job A and the light runs of 7.8): `FINAL-ACCEPTANCE.md` is unchanged since 4 November (4,534 bytes, last commit b1f6814d); a text search of `tools/accept` and `tools/t0` for the gate ids, `check_governance`, `check_coverage`, `gate_results`, `GATE-HOOKS` and `tools/bt/gates` finds nothing (the first search, which matched binary files under `tools/t0/overlay`, was repeated with text files only); `GOVERNANCE/final-passes/` still does not exist. The two pack test files: {{T:bt_pack_test}} The runners of 2.6 change the relation to Section Z in one respect: Section Z item 6 names "machine gates Q03-Q12, Q23", and of those the runners of Q03 to Q06 and Q23 exist and none of Q07 to Q12 does; there is still no `run_all.py` that a milestone check could call, no `milestone.py`, and every stored record is FAIL."""
