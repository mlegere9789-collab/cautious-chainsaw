# vis-figures shard report (2026-11-04)

Scope: figure sub-requirements (R04 uniforms, equipment, commanders; R17 appearance; R10 flags; R16 horses; OA02 one-to-one; OA04 named commanders and Dawes) against src/figures3d, data/figures3d and their tests. Linux, node only, no browser run; nothing here has been seen on a GPU.

Baseline (full suite): 355 tests, 350 pass, 4 fail, 1 skipped. Figures failures: figures3d-evidence "evidence.json on disk" and "statutory star count". Cause: an earlier round extended src/figures3d/evidence.mjs and tiers.mjs (33-star base, state order, ANV 13 stars, flag scenarios) without regenerating data/figures3d/*.json or updating the old assertion ('NOT read'). Fixed: ran tools/figures3d-build.mjs (regenerates evidence.json, TIERS.json, hashes, manifest, 13-star flag texture), updated the test assertion to the current evidence state (it now requires the -STAR-BASE-33 basis and the residual-doubt wording, so the inferred tier is still checked). Final full run: 364 tests, 362 pass, 1 fail, 1 skipped; the one failure is the load-sensitive heap test "no allocation churn" (anim3d.test.mjs:152; retains about 350 KB against a 128 KB ceiling in the --no-maglev configuration when the machine is busy; it passes alone and passed in the baseline; it is not touched by any change here). The anim3d "catalogue" test is fixed in the vis-anim shard; the failure in the other shard from the baseline passed in the final run.

New code: src/figures3d/commanders.mjs, tools/figures3d-commanders.mjs, data/figures3d/commanders.json (27 named commanders, all marked "no individual model", tiers never promoted, Dawes documented rank/command only), tests/figures3d-commanders.test.mjs (6 tests, including the ANV 12/13 star scenario).

Rows: results.jsonl has 14 rows (VISFIG-01..14): met 4 (weapons, national colour star count, ANV scenario, tier marking), partially met 9, open 1 (Union regimental colours, Irish flag, guidon: marked gaps, EG-FIG-0003). Proposed register: EG-VISFIG-01 (ANV 12 vs 13 stars, source conflict, PENDING OWNER), EG-VISFIG-02 (commanders and Dawes, update of EG-FIG-0004).

Owner-decision items: ANV star-count default; permission to read public-domain portraits and the Dawes memoir; permission to search state flag collections for regimental colours (EG-FIG-0003).

Integration note (not done, outside this shard): the history/UI card should show the commander card text from data/figures3d/commanders.json.

BROWSER-VERIFICATION-LIST (deferred; also FIGURES3D-NOTES sections 7, 9.9, 9.14, 9.19): contact sheets of the nine subjects at LOD0/1/2 in the product shader; faces at 2 m; the 13-star flag texture and a scenario switch for the ANV flag; a general-rank officer from commanders.json next to a private (officer sash, shoulder straps visible, gap marking); GAP-coloured regimental flags visible and hatched; 125,000-figure throughput (cost model G1, V1); instance count equals the roster strength at the Pickett's Charge minute.
