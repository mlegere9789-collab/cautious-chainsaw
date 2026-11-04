# Change order: bring every workstream under the 144-page plan (issued 2026-10-19)

Authority: the owner's order of 2026-10-19 to follow the whole PDF at all times and adjust current work, past work and all processes. The PDF governs Part F and the evidence standards of the whole site. Where an owner chat instruction conflicts with the PDF, nothing is silently chosen: see decision_log.md DEC-001..005.

Status key: DONE = changed in this session; QUEUED = needs a running job to finish first or an owner act; BLOCKED = cannot be done by Claude (account, licence, permission, hardware).

## A. Cross-cutting processes
| # | Change | Status |
|---|---|---|
| A1 | Repo-level CLAUDE.md with the Law, hard rules and owner constraints so every future session loads them | DONE (CLAUDE.md) |
| A2 | Phase-0 governance: requirements.json (22 PDF requirements + owner additions OA01-OA09 kept separate), gates Q01-Q28, Evidence-Gap Register (110 entries), Decision Log (5 conflicts + 10 standing + 47 pending defaults), library manifest, budget template, hardware profile, progress.md | DONE (docs/battle-theatre/GOVERNANCE) |
| A3 | Machine check `tools/bt/check_governance.py` (Q18 coverage, requirement wording frozen, register completeness, no unverified seed marked passing, no agent-decided decisions) | DONE; reports honestly: 0 sub-requirements passing, 908 unlinked = unfinished work |
| A4 | History-layer seeds from the PDF (691 timeline rows with tiers, weak-source flags, status `seeded_unverified`) | DONE (timeline_seed.jsonl) |
| A5 | Structured extraction of arrivals/OOB, structures/state schedule, kit specs, environment (with validators for Q03, Q04, Q07-Q09, Q11, Q22) | IN PROGRESS (four background agents; outputs under docs/battle-theatre/{history,structures,kit,environment}) |
| A6 | Evidence-label crosswalk: our site labels Documented / Measured / Computed / Modelled / Contested / Unknown map onto PDF tiers documented / inferred / plausible-procedural (Measured and Computed are subsets of documented only when a non-lead source or an independent computation supports them; Modelled = plausible-procedural; Contested = a carried conflict) | DONE here; apply in Release 2 UI |
| A7 | Weak-source quarantine (PDF E.2): Wikipedia, forums, blogs, auction listings, Stone Sentinels/aggregators and memory cannot be the sole support for a "Documented" datum on ANY page | QUEUED for the DATA audit pass and the Historian corpus (re-grade existing items) |
| A8 | Claim ledger schema (PDF Appendix B) for Historian growth waves and roster data: claim, source span, tier, independence roots, rights | QUEUED (schema file next) |
| A9 | Never state a headline like "100%" or "zero errors"; use the PDF wording "documented at regiment level, plausible at individual level" | DONE in CLAUDE.md |

## B. Existing workstreams
| Workstream | Adjustment under the PDF | Status |
|---|---|---|
| Release 1 (clock, data audit, look, motion, monuments; running) | (1) clock work must carry every source value as a scenario and not hide a default; PDF defaults are not owner-approved. (2) DATA audit applies A7 and the known-correction list, with the 140th NY item treated as disputed. (3) Unit markers obey the arrival gating rule (no marker before earliest documented arrival; Pickett not before Jul 3 04:36 by default, Stuart's brigades gated to evening Jul 2 except Hampton at Hunterstown). (4) Provenance shown per item. The running job is not edited; a verifier pass is queued against these four rules after it finishes | QUEUED |
| 1863 basemap (b1863) | Follow B.9.2: LiDAR + Warren (1868-69, hilltops good to about 50 ft, creeks worse, land cover "about 1868"), every edit a documented polygon with reason and source, unexplained residuals recorded not overwritten, per-object provenance and tier, de-modernization list, never copy the NPS rebuilt walls (48-52 in) or the rebuilt Culp's Hill/LRT works, photo-match accuracy tests, honest accuracy bound. Add a register entry for every unexplained residual | QUEUED (checklist applied at next b1863 fix pass) |
| Rosters | Not a PDF requirement (owner addition OA03). Keep PLAN.md; add claim-ledger fields and rights per name; permission requests to FamilySearch/NPS remain owner-sent | BLOCKED on owner for permissions; schema work QUEUED |
| Fidelity metric | Define the 97% target on documented unit-level quantities (position region + time window, orientation, activity class), carried with uncertainty windows rather than false-precision points (PDF D). Map gates Q04-Q06, Q12, Q17, Q20 into the metric harness; thresholds set at creation from the slice and never lowered | QUEUED |
| Render / crowd | Hardware recorded (8 GB laptop GPU). One-to-one instancing up to strength figure (Section N). Two tiers on one cache (real-time LOD + offline path). Frame-time gate Q15 against measured pilot (6-11 ms @1080p placeholder) | QUEUED |
| Audio | Physical delay = distance / speed of sound at modelled temperature, attenuation, absorption, occlusion, silent woods, voice culling only if per-source timing is preserved (Section S, Q13). Labeling per DEC-001 (OPEN) | QUEUED; labeling BLOCKED on owner decision |
| Assets/commanders | Appearance only from sources; Rufus Dawes and most commanders have no documented appearance in the PDF: register entries EG-0004 etc.; K.7 photo-reference rule | QUEUED |
| Tour/monuments reuse | Read-only reuse as camera bookmarks (OA01); no change to the existing sections | OK |

## C. Hard truths this change order does not hide
1. Nothing in the PDF is verified: every row is `seeded_unverified` until checked against a primary source; the Official Records and the print-only standard works were not read by the PDF's authors. Phase 1 (library audit) is the real next gate.
2. The 22 requirements cannot all pass in one session; check_governance.py shows 908 sub-requirements unfinished. Work proceeds by the PDF's own order (Section Y).
3. Items that need the owner: permissions (FamilySearch/NPS), licence/account acts (D.8), DEC-001..005, the 10 standing decisions, the 47 conflict defaults.
4. The hardware is an 8 GB VRAM laptop GPU; PDF items that assume 24 GB (3DGS training) or a UE5 film path are bounded (EG register entry on hardware).

## D. Terrain findings (agent report, verified by re-running tools/bt/terrain_check.py)
- 1863 basemap (b1863) already has: 3DEP 1 m DEM, EPT point cloud, 2 m canopy model, Warren sheet georeferenced (16.5 m leave-one-out error), land cover, roads, structures, per-feature sources, rephotography check. NOT done anywhere: an 1863 elevation surface (Warren contour tracing/TIN), an elevation error model, PAMAP ingest, datum reconciliation, DEM edit polygons, flow-accumulation drainage, documented/inferred/plausible-procedural crosswalk.
- b1863 labels Warren-only woods "Documented"; under the PDF tier rules that must be "inferred" (single map source, 5 years after the battle). Two Warren georeferences in the build disagree by a median 24.5 m (reconcile). Q03 fails the base map's own anachronism hunt (35 sites open). Q16: every camera pose is estimated. Q21: no per-field crop schedule.
- PDF catalog slips: row 1 cites LOC 99446453 but the project uses 99448794; only Tables 1 and 5 print tiers; B.9.2 relies on an "1860 census" no catalog row contains; rows 25 and 39 truncated URLs; row 15 credits Lt. Chase while the project's LOC read says P. M. Blake revised in 1873; B.9.3 retry list partly stale (LRT CLR and CLR Record of Treatment already read); PHMC 1880 PDF now redirects to a site search page.
- Probe: 66 unique URLs: 36 ok, 11 redirect, 11 blocked (LOC 403 to HEAD, eHistory/W&M robots 403), 3 robots-disallowed, 3 not found, 1 moved, 1 host not resolving. Nothing worked around.
