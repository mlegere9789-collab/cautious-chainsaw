# 15 - Integrated roadmap: one WBS, one critical path, honest calendars

Status: PLAN ONLY, 2026-09-30; nothing built or deployed. Obeys `01-decision-register.md` (ADR ids `D-*`); every deviation is in section 13. Tags: [V] re-checked by me now (verdict counts in `merged/*.json`, WP coverage script, schedule model); [S ch] a chapter figure; [E] my estimate. Machine-readable twin: `15-roadmap.json` (98 nodes with id, title, chapter, effort, deps, tranche, category, device impact, path fractions, source WPs). Effort = AI-assisted solo person-days; a day = 8 h of owner attention including review (chapter 03 A1). Chapters cited as `02`..`14`.

## 0. Headline: what the integrated numbers say

1. **Scope reconciled.** The chapters define 447 work packages (T0 19, ARCH 34, TIME 23, PERF 28, UX 34, A11Y 33, PAGE 47, PAGEC 35, INFRA 34, SEO 31, CONTENT 27, QA 25, DATA 24, HIST 36, DEC 17); a script confirms each maps to at least one of **98 integrated nodes (RM-01..RM-98)** [V]. The findings base is 852: 523 CONFIRMED, 285 CORRECTED, 25 UNVERIFIABLE, 18 NOT_VERIFIED, 1 REFUTED (`time-facts-15`, dropped); 68 critical and 332 high among the non-refuted [V].
2. **Re-total.** Chapter roll-ups sum to about 850-1,430 d once the optional items they list separately are added (chapters alone 815-1,364 d). After merging overlaps the WBS totals **729-1,236 d** (P50 982), about 13% lower. The register's Tier-1 envelope was 145-210 d [S 01] and chapter 03 already restated it to about 164-254 d [S 03 s.7]; the specified programme is 3-5 times that.

| Path | AI-assisted days (low-high) | P50 | Unassisted x1.5 | Nodes in scope |
|---|---|---|---|---|
| S Survival (R0 plus the criticals) | 22-39 | 31 | 34-59 | 13 |
| L Legacy A-line (the register's A-line on the frozen app plus static layer: no critical defect, CWV green, Tier 1 usable on phones, Historian P1) | 173-302 | 237 | 260-452 | 49 |
| A Grade-A path (adds the rebuild core to cutover) | 434-738 | 586 | 651-1,107 | 86 |
| F Full A+ (Tier 1 at A+, Tier 2 at A, proof) | 553-939 | 746 | 829-1,408 | 89 |
| Deferred Tier-2 depth (remainder of F nodes) | 45-79 | 62 | 68-118 | - |
| P7 optional and conditional pool (Labs kept, on-site, Historian B/C, SEO tier 3) | 131-218 | 174 | 196-327 | 9 |
| Everything specified | 729-1,236 | 982 | 1,094-1,853 | 98 |

3. **Capacity is the binding constraint, and it is not close.** Net WBS days available (hours minus operations load, 1 day per 8 h) [V model]:

| Scenario | Net d/week now | at 10 h/month ops | to 2027-06-30 | to 2027-12-31 | to 2028-12-31 |
|---|---|---|---|---|---|
| 10 h/week | 1.25 | 0.96 | 43 d | 68 d | 118 d |
| 15 h/week | 1.88 | 1.59 | 67 d | 108 d | 191 d |
| 30 h/week | 3.75 | 3.46 | 138 d | 228 d | 408 d |

   Against path sizes at P50 (S 31, T0-complete 76, L 237, A 586, F 746 days): at 10 h/week the survival path fits in 2027 and Tranche 0 only just; at 15 h/week Tranche 0 plus S1 and S2 fit by end-2027 and L lands about mid-2029; at 30 h/week L lands about January 2028, the A path about December 2029 and F about October 2030. **The register's dates (R0 2026-10-21, R1 11-05, S3 2027-01-26, cutover 2027-05-15) cannot hold for the specified scope at any of the three capacities**; only owner-side actions (keys, privacy text, contact, GSC baselines) can keep theirs.
4. **What still parallelises.** Ignoring capacity, the dependency-only critical path is 19 d (S), 47 d (L) and 97-117 d (A, F) [V graph]: the programme is wide, not deep. Three lanes (ship and platform; rebuild; data, Historian, content) could reach F in 12-14 months; one person cannot. Lead times no capacity removes: the 28-day GSC baseline, 4-week spacing of identity trains, the reviewer (155-226 h for the A-line [S 13]), 7 nightlies plus a 14-day beta plus 60 days of `/classic/`, the 30-day RUM window, counsel.
5. **Recommendation (owner answer by DG-0, 2026-10-07).** Sign a capacity contract: **Plan S** (at most 12 h/week): survival path, then maintenance mode; **Plan L** (15-30 h/week): survival, Tranche 0, the SEO/data/Historian A-line, no rebuild before a capacity review at DG-3; **Plan A/F** only with a second contributor at 30 h/week or more, or proven 1.5-2x AI leverage (5.5). Claim milestones (M1..M5), never "A+", before D-EVIDENCE is met (section 7). Chapter 03's Plan A/B/C thresholds (35, 15-34, under 15 h/week) were sized on 71-115 d of rebuild only (section 13, item 1).

## 1. Assumptions and method

- **Effort.** AI-assisted days as the chapters define them (Claude drafts, owner reviews and runs devices); unassisted = x1.5 (1.3-1.7 [S 03 A5]; about 1.1-1.2 for reviewer-bound history work). Ranges are sums of chapter ranges after de-duplication; P50 is the midpoint. I keep the wide bounds and plan on the high end (the register's rule: effort at most hours x weeks x 0.7).
- **Excluded everywhere:** reviewer hours (155-226 h for the A-line [S 13]), counsel fees, independent accessibility evaluation, devices, Mapbox and Netlify spend, and the owner minutes of the register's section 2 (about 7 h). CWSS rosters (`HIST-30`, blocked on NPS) are not sized.
- **Throughput.** Net d/week = (hours per week minus operations hours) / 8. Operations load ramps 0 until R0 ships, then 3, 6 and 10 h/month by week 8, 21, 34 (`RM-28` and chapter 09 Appendix B). Start 2026-10-05. Deploys Tuesday to Thursday only; no promotion 2026-11-15..20, 2027-06-25..07-05, 2027-11-15..20 or Fridays after 12:00 ET [S 01 s.4.3]; those freezes are floors on ship dates and are not modelled as lost capacity.
- **Paths.** Each node carries fractions of its effort included in S, L, A and F (last four columns of section 3). S = what the register calls the hard chain plus criticals that block basic use. L = register A-line (Tranche 0, R0/R1, landing, Historian P1) plus what the chapters mark A-line for data, rights, legal and time. A = L plus the rebuild core (the parts each rebuild node needs for grade A). F = every Tier-1 item at A+ and Tier-2 items at A (D-SCOPE-TIERS); the rest of Tier-2 depth is "deferred" and the Labs and stretch items are P7.
- **Schedule model.** One worker; a fixed priority queue (5.4) consumed at each tranche's net capacity; train floors (S1 not before 2026-11-03, S2 and S3 each 28 days after the previous) never bind at these capacities.
- **Confidence.** Node effort is a chapter estimate nobody has run; only R0 and R1 have scratch-verified scripts [S 02]. Dates are P50 with a band from the low and high sums.

## 2. De-duplication ledger (what was merged, count once)

Deductions are approximate [E]; they compare the sum of the source WPs with the merged node values.

| Cluster | Source WPs | Owning node(s) | Gross of sources | Merged | Deducted (d) |
|---|---|---|---|---|---|
| Service worker, reload, boot payload, hashed names (six chapters) | T0-03/04/05, INFRA-22, PERF-05/24/25, TIME-21, QA-07 | RM-06, RM-07 | 6-11 | 4.5-8 | 1.5-3 |
| One clock (four chapters, 9 implementations) | TIME-02/03/06/10..12/14/16/17/20, ARCH-13, UX-17, A11Y-10, PAGE-04, PAGEC-27, QA-09 | RM-43/44/59/60 | 27-47.5 | 24.8-44.5 | 2.3-3 |
| Deep links (nine emitters, one reader) | T0-09, UX-04/05, ARCH-28, PAGE-03, PAGEC-03/18, TIME-05/15 | RM-12, RM-61 | 12.6-22.5 | 9-15 | 3.6-7.5 |
| Design system, dialogs, tokens, shell, boot UI (a11y, design, rebuild) | UX-07..12/14/16/23, ARCH-19/26, A11Y-04..09/16, PAGE-06/07, PERF-18 | RM-57, RM-58 | 45.5-75.8 | 31.5-53.5 | 14-22.3 |
| Panels and ports (UX twins of ARCH) | ARCH-21..27, UX-15/18/19/22/24..26, PAGEC-32/33, PERF-15 | RM-63..66 | 43-71 | 35.5-59 | 7.5-12 |
| Static layer and shared page WPs (08a, 08b, platform) | PAGE-05..08/11..13, PAGEC-01/02/05, UX-13, A11Y-24, ARCH-29 | RM-62, RM-72 | | | 11-19 [S 08a] |
| Validators, schemas, versioning, CI | DATA-01/02/03, QA-11, ARCH-11, TIME-20, HIST-06 | RM-31, RM-43, RM-40 | 12-18.5 | 8-13 | 4-5.5 |
| Headers, redirects, embed, caching | INFRA-10/11/12/14, T0-15, SEO-03/05, QA-03, PAGEC-31, PERF-24, DEC-05 | RM-16, RM-23, RM-24 | 11.3-21.6 | 8.5-15.5 | 2.8-6.1 |
| Privacy, legal, contact | DEC-06/07/08, INFRA-21/26/27, CONTENT-16/17/24, PAGEC-29/30, DATA-22, A11Y-31 | RM-19/20/36/39 | 15-27 | 10.5-19.3 | 4.5-7.7 |
| Test harness, regression | T0-18, QA-04/05/08/10/12/14/22, A11Y-29, UX-34, INFRA-32, ARCH-05..08 | RM-07/08/51/72/88 | | | 6-10 |
| Performance vs rebuild (chapter 05 own note) | PERF-11..16/18b/20 inside ARCH nodes | RM-55/56/58/69 | 39-68 | 24-40 | 15-28 |
| SEO tier 2 vs Historian, pages, content | SEO-14..25, PAGE-29, HIST-22/26, CONTENT-21/22 | RM-81, RM-83 | 40-70.5 | 30-55 | 10-15.5 |
| Copy and data hygiene (CONTENT, DATA, HIST) | CONTENT-03/04, DATA-17/19, HIST-33 | RM-37..39 | | | 8-12 |

Listed clusters explain about 90-160 d; the rest is rounding, the reviewer programme, telemetry and WP-DEC packets counted inside chapters. **Added by this chapter:** RM-03 (ratification and WBS upkeep, 1-2 d) and the priority queue. **Sized nowhere and still open:** reviewer hours, counsel, independent evaluation, devices, cloud spend, CWSS rosters, migration of existing shared links (no inventory exists [S 04]).


## 3. The integrated work-breakdown structure (98 nodes)

Columns: **Source WPs** are the chapter work packages the node absorbs (the JSON keeps them verbatim with audit ids); **Days** = low-high AI-assisted person-days plus size class (S under 0.5, M 0.5-2, L 2-5, XL over 5, by midpoint); **Deps** are node numbers (RM- omitted); **S/L/A/F %** is the share of the node in each path. A node in P0-P2 ships bytes only through the R0 mechanism; anything that ships bytes waits for R0 (D-ORDER). Tranche effort (P50 days by path):

| Tranche | Nodes | Gross days (low-high) | S | L | A | F |
|---|---|---|---|---|---|---|
| P0 Ground truth | 4 | 9-18 | 7 | 13 | 13 | 13 |
| P1 R0 mechanism | 3 | 12-18 | 12 | 15 | 15 | 15 |
| P2 R1 hotfix (Tranche 0 complete) | 14 | 38-64 | 12 | 47 | 51 | 51 |
| P3 Legacy A-line web layer | 28 | 150-262 | 0 | 162 | 206 | 206 |
| P4 Rebuild foundations | 13 | 112-191 | 0 | 0 | 120 | 152 |
| P5 Ports, depth, cutover | 25 | 261-436 | 0 | 0 | 172 | 287 |
| P6 Proof | 2 | 16-28 | 0 | 0 | 9 | 22 |
| P7 Optional pool | 9 | 131-218 | - | - | - | - |

Effort by primary owner category (P50 days): Function 7/18/86/104, Fit and finish 0/0/36/63, UX 0/0/33/48, Reliability 8/26/79/85, Performance 8/28/63/63, Accessibility 0/4/23/39, SEO 0/26/39/48, Security and privacy 8/32/47/54, Documentation 0/13/35/47, Data accuracy 0/63/93/133, Historian 0/27/50/63 (columns S/L/A/F; totals 31/237/586/746). Data accuracy is the largest single line on the F path: 133 d plus the reviewer.

**P0 Ground truth (no bytes shipped)** (4 nodes, 9.25-17.5 d)

| ID | Node | Source WPs (chapters `02-14`) | Days | Deps | S/L/A/F % |
|---|---|---|---|---|---|
| RM-01 | Owner console, accounts, keys, archive and capacity statement | T0-01, T0-17, ARCH-01, INFRA-01/02, INFRA-03, INFRA-04, SEO-01, DEC-15 | 3.5-6.5 L | - | 60/100/100/100 |
| RM-02 | Private repo, publish-dir isolation, staging site, Git-deploy byte-identity, CI skeleton, registries, gitleaks, ADR files | T0-02, ARCH-02, INFRA-09A/05/13, QA-01, DEC-17 | 3.75-7 XL | 01 | 65/100/100/100 |
| RM-03 | Decision ratification: 11 class-B ADRs, capacity contract, WBS upkeep | DEC-14 | 1-2 M | 01 | 50/100/100/100 |
| RM-04 | Reviewer and second-reader recruitment, charter, permission emails, provenance answers | DEC-10, reg.actions 8,10 | 1-2 M | 01 | 0/100/100/100 |

**P1 R0 mechanism release** (3 nodes, 12-18.5 d)

| ID | Node | Source WPs (chapters `02-14`) | Days | Deps | S/L/A/F % |
|---|---|---|---|---|---|
| RM-05 | Real-tile measurement harness and baseline of record (CDP Referer injection; boot-contract spike) | PERF-01, DEC-01 | 3-4 L | 02 | 50/100/100/100 |
| RM-06 | R0 mechanism release: patch runner, hashed names (entry and both lazy chunks), no-reload SW plus kill switch, boot-after-paint loader, intro deleted | T0-03/04/05, INFRA-22, PERF-05/25, PERF-24, TIME-21 | 4.5-8 XL | 02,05 | 100/100/100/100 |
| RM-07 | R0 acceptance drills: first-visit, seeded old-SW upgrade, kill switch, rename drill, minimal Playwright base | QA-07, QA-04, T0-18 | 4.5-6.5 XL | 02 | 65/100/100/100 |

**P2 R1 legacy hotfix trains (Tranche 0 complete)** (14 nodes, 37.75-64.5 d)

| ID | Node | Source WPs (chapters `02-14`) | Days | Deps | S/L/A/F % |
|---|---|---|---|---|---|
| RM-08 | Safety-net remainder: static gates, probe cron, tap/layout detectors, LH assert, clock lint, scorecard skeleton, journeys | QA-02/03/05/06/09/23, T0-18 | 4.5-6.5 XL | 07 | 0/65/100/100 |
| RM-09 | T0 group A: gold trail C5, sound removal, pointer capture, monuments loop, keys/Esc, storage guards, attribution, error boundary | T0-06, UX-01, AMD-T0-1 | 1-1.75 M | 06,07 | 100/100/100/100 |
| RM-10 | T0 mobile shell: overlays unmounted on mobile, panels, 14 Tools tiles, dock, landscape, dvh, layout auto-detect | T0-08, UX-01/02/03 | 4-7 XL | 09 | 60/100/100/100 |
| RM-11 | T0 clock and data: date +2 fix, Day 2/3 load on jump, merge fix, i2 carry-forward, minimap subscription | T0-07, TIME-01 | 1-2 M | 09 | 50/100/100/100 |
| RM-12 | T0 deep-link reader, moments.json v0, Turning Points anchors, emitters repointed | T0-09, UX-04/05, PAGE-03, PAGEC-03, PAGEC-18, TIME-05 | 3-5 L | 11 | 35/100/100/100 |
| RM-13 | T0 accessibility bridge: 13 bundle patches, shell shim, skip link, 12 px floor, contrast, button-reset and sprite-id fixes | T0-10/11, A11Y-01/02/03, PAGE-01/02, UX-06 | 3.5-5.5 L | 10 | 0/100/100/100 |
| RM-14 | Page hotfix core: Watch Together XSS, AR hidden, dev pages removed, Historian undefined, dashboard/search/report defects, map sub-pages non-blocking | T0-12/13, PAGEC-12/15/24/34, INFRA-28, CONTENT-01, HIST-01, PERF-19, PAGE-16, PAGE-20 | 6-9 XL | 06 | 35/100/100/100 |
| RM-15 | Interim OG card, manifest fixes, media-rights register, GSC verification file | T0-14, DEC-09, INFRA-23, SEO-04/07 | 2.5-4.5 L | 06 | 0/100/100/100 |
| RM-16 | R1 headers: embed class, dev-page twins, netlify.app host 301, CSP-RO host list | T0-15, INFRA-14, SEO-03, PAGEC-31, DEC-05 | 2-3.5 L | 06,05 | 0/100/100/100 |
| RM-17 | Truthful-copy subset (16 bundle rows, 3 Help rows, banner) and copy_lint in warn mode | T0-16, CONTENT-02, CONTENT-06, A11Y-23 | 1-2 M | 06 | 0/100/100/100 |
| RM-18 | R1 legacy performance increment: idle CPU to zero, shell CLS, one map on phones, Day-data stage 1 | PERF-06/07/08/09 | 3.25-6.5 L | 09,11 | 0/100/100/100 |
| RM-19 | Interim privacy correction and data-flow inventory | INFRA-26, DEC-07 | 0.5-1.5 M | 01 | 100/100/100/100 |
| RM-20 | Contact architecture: role addresses, forwarder, DMARC ladder, security.txt, Report-a-problem intake | INFRA-20/21, DEC-06 | 1.5-3.25 L | 01 | 65/100/100/100 |
| RM-21 | Release pipeline: production fast-forward, rollback drill, versioning, Netlify environments, runbooks | QA-16, INFRA-09B, T0-19 | 4-6.5 XL | 02,07 | 0/60/100/100 |

*Ship rule for P2 (review 3, D-ORDER 4.1).* `RM-19` and `RM-20` list only `RM-01` as a dependency because their drafting, DNS records, forwarder and console actions run before R0, but every deploy file they change (`privacy.html`, `terms.html`, `security.txt`, the Report-a-problem form) ships in R1 after `RM-06/07`; likewise `RM-15`'s image and manifest files and `RM-16`'s header rules ship in R1a/R1c, never in R0, and no `/data/*` edit ships in Tranche 0.

**P3 Legacy A-line web layer (S1-S3, data, Historian P1, clock bridge, trust)** (28 nodes, 150.25-261.5 d)

| ID | Node | Source WPs (chapters `02-14`) | Days | Deps | S/L/A/F % |
|---|---|---|---|---|---|
| RM-22 | Page hotfix extended: Dashboard, Search, Report/Regiment, Compare, Camera, Documentary, High Ground, Ground | PAGE-16/20/23/30/38/44/46 and remaining Wave-0 items, PAGEC-30 | 7-11 XL | 14 | 0/60/100/100 |
| RM-23 | Header and redirect generator emitting every rule for both URL spellings; caching classes; hashed data paths | INFRA-10/11, QA-03, PERF-24 | 3-5.5 L | 16 | 0/100/100/100 |
| RM-24 | Train S1: extensionless canonical form, sitemap index, robots and AI-crawler policy, IndexNow, OG/twitter parity | SEO-05/06, INFRA-12 | 3.5-6.5 L | 23,15,01 | 0/100/100/100 |
| RM-25 | Train S2: product name, titles, descriptions, home JSON-LD, trust-pack links, in-app names | SEO-08/09/12, CONTENT-07, CONTENT-02, UX-29, SEO-11 | 6-11 XL | 24 | 0/100/100/100 |
| RM-26 | First-party collector /api/ingest, vitals client, RUM operations, bot policy, SEO events | INFRA-15/29, PERF-03/04, QA-17, SEO-13 | 6.5-12 XL | 19,21,23 | 0/100/100/100 |
| RM-27 | CSP stages 0-2 in report-only with a working collector; third-party script origins | INFRA-16/19, PAGEC-04, PAGE-12 | 2.5-5.5 L | 26,23 | 0/60/100/100 |
| RM-28 | Operations: monitoring, alerts, synthetic monitors, scheduled drills, test health | INFRA-08, QA-18/25, T0-19 | 4-7 XL | 21 | 0/60/100/100 |
| RM-29 | Continuity and vendor register: backups, second remote, delegate letter, vendor triggers, lite snapshot | INFRA-06/07, DEC-13 | 2.5-5.5 L | 02,01 | 0/100/100/100 |
| RM-30 | Train S3: static landing at /, app moved to /map, forwarder, keep/revert measurement, landing performance | SEO-10, PERF-27, CONTENT-13 | 5-8.5 XL | 25,26,05 | 0/100/100/100 |
| RM-31 | Data authoring repo, versioning (data_version, dv), schemas, 60-rule validator, ratchet, CI | DATA-01/02/03, QA-11, ARCH-11 | 8-13 XL | 02 | 0/60/100/100 |
| RM-32 | Data compat drop 1.0.1 (value-only, after R0) | DATA-09 | 1-1.5 M | 31,06 | 0/100/100/100 |
| RM-33 | Data identity: unit registry, ID crosswalk, OOB completion (VI Corps), unit index, batteries searchable | DATA-06/07/20, HIST-05 | 8-12 XL | 31 | 0/80/100/100 |
| RM-34 | Numbers and casualty authority (A-line part), retire 467/445+/51,000 | DATA-08 | 2.5-4 L | 33,04 | 0/100/100/100 |
| RM-35 | Rights: source registry, tier gate, provenance retro-audit, dispositions, counsel questions | HIST-02, DATA-04/05 | 3.5-6.5 L | 31,04 | 0/70/100/100 |
| RM-36 | Legal pack: merged Privacy and Terms, counsel packet, data controls, Privacy-and-data panel wiring | INFRA-27, DEC-08, CONTENT-24, PAGEC-29, HIST-34 | 3.5-6.5 L | 19,20,35 | 0/60/100/100 |
| RM-37 | Copy foundation: facts.json, features/glossary parity, style guide, copy lint, catalogue, in-app Help and About | CONTENT-04/05/06/12/13, PAGE-14 | 9-15 XL | 17,31 | 0/50/100/100 |
| RM-38 | Data text hygiene, unit census, headline-figure and quotation adjudication | CONTENT-03/08, DATA-17/19, PAGE-09 | 6.5-12 XL | 33,37 | 0/80/100/100 |
| RM-39 | Trust pages: About, Sources and Methods, Corrections, Contact, Accessibility statement, FAQ, changelog | CONTENT-14..20, DATA-22, A11Y-31, HIST-33 | 12-20 XL | 20,35,04 | 0/35/100/100 |
| RM-40 | Historian P0: /hx/ platform, fetch and OCR normaliser, entity registry, build and CI, eval harness, governance | HIST-03..07/33-36, INFRA-34 | 8-15.5 XL | 06,35 | 0/100/100/100 |
| RM-41 | Historian P1: search-core, entities and facts tier, composers and linter, UI v2 with page UI | HIST-08..11, PAGEC-06/07/08, PERF-23, A11Y-26, INFRA-34 | 12-18 XL | 40,14 | 0/100/100/100 |
| RM-42 | Reviewer programme: queue, review states, public surfaces, review packets, decisions.jsonl | TIME-04, DEC-11, DATA-23, HIST-35 | 2.5-6 L | 04 | 0/100/100/100 |
| RM-43 | Time module: 33-anchor piecewise clock, schemas, golden tick-clock, validators TM-V1..V21 | TIME-02/03/06/20, ARCH-13, QA-09 | 7-12.5 XL | 02 | 0/100/100/100 |
| RM-44 | Clock on the legacy app (bridge patch on all surfaces) plus truthful clock copy | TIME-10, TIME-16, CONTENT-09 | 4.75-9 XL | 43,42,06 | 0/100/100/100 |
| RM-45 | Content triage: wrong-day, misordered, composite events, quotations, arrival audit and kinematics | TIME-07/08/09 | 5-9 XL | 42,43 | 0/70/100/100 |
| RM-46 | Performance budgets, ratchet, lab gates, INP harness and real-device runs | PERF-02/17, QA-06, QA-13 | 5-9 XL | 05,08 | 0/60/100/100 |
| RM-47 | Motion data: densification tooling, keyframe campaign wave 1, hold and interpolation policy | DATA-10/11/12 | 6-10 XL | 43,33 | 0/70/100/100 |
| RM-48 | Geometry, extents, places, terrain vs 3DEP, monuments extraction and rights (A part) | DATA-14/15 | 4-6 L | 31,35 | 0/70/100/100 |
| RM-49 | SEO operations: KPI ledger, traffic-quality protocol, SEO CI suite and runbook | SEO-02/30 | 2-3.5 L | 01 | 0/100/100/100 |

**P4 Rebuild foundations** (13 nodes, 112-191 d)

| ID | Node | Source WPs (chapters `02-14`) | Days | Deps | S/L/A/F % |
|---|---|---|---|---|---|
| RM-50 | Spikes: map-engine facade (O1/O2/O3), unit-render benchmark on a real Android, verification-debt burn-down | DEC-02/03/16, ARCH-17 | 4-7 XL | 05 | 0/0/100/100 |
| RM-51 | Spec extraction, parity harness (T1/T2), hermetic legacy rig, quarry salvage, intended-diff registry | ARCH-03..08, QA-19 | 12-19 XL | 02,07 | 0/0/100/100 |
| RM-52 | Toolchain, build, chunk map and hash scheme, app CI gates, Astro spike | ARCH-09/10/31, DEC-04/12, PERF-12 | 6.5-10.5 XL | 02 | 0/0/100/100 |
| RM-53 | Runtime data layer, storage layer and migration, hashed data delivery | ARCH-12, DATA-21, PERF-09, PERF-22 | 4-8 XL | 31,52 | 0/0/100/100 |
| RM-54 | Pure keyframe engine (stateAt) with the signed carry-forward rule | ARCH-14, DATA-10 | 4.5-8 XL | 43,51 | 0/0/100/100 |
| RM-55 | Store slices, playback clock, one lazy map behind a facade, GPU resilience, failure containment | ARCH-15/16/20, PERF-10/11/13 | 6.5-11 XL | 52,50 | 0/0/100/100 |
| RM-56 | Unit renderer R1 (owned canvas, symbol-layer gate R2) and compositing budget | ARCH-18, PERF-14/16 | 5.5-9 XL | 54,55,50 | 0/0/100/100 |
| RM-57 | Design system: tokens, type scale, icons, motion, theming, component library, accessibility primitives | UX-07..12, A11Y-04..08, PAGE-06/07 | 18.5-31.5 XL | 52 | 0/0/70/100 |
| RM-58 | One responsive shell, entry and boot UI, static /map shell, Text/Chronicle route | ARCH-19/26, UX-14/16/23, PERF-18, A11Y-09/16 | 13-22 XL | 57,55,50 | 0/0/80/100 |
| RM-59 | Clock surfaces rebuild-native: playback semantics, hour steps, seek-safe state, ensureDay, accessible time | TIME-10, TIME-11/12/17, UX-17, A11Y-10 | 9-15 XL | 43,54,57 | 0/0/80/100 |
| RM-60 | Time extended: sub-pages and exports adopt the module, solar lighting, per-minute intensity, Historian time tier | TIME-13/14/18/19, PAGE-04 | 4-8 XL | 43 | 0/0/30/100 |
| RM-61 | Permanent URL-state contract, moments registry, dv migration, bookmarks | UX-04/05, ARCH-28, TIME-05/15 | 6-10 XL | 12,43,52 | 0/0/80/100 |
| RM-62 | Static-site layer: Astro layouts, shared chrome, tokens for 27 pages, head/SEO/share template, CSP-clean templates | ARCH-29, PAGE-05/08/11/12, PAGEC-01/02, UX-13, A11Y-24, UX-27, UX-28 | 18.5-32 XL | 52,57 | 0/0/50/100 |

**P5 Rebuild ports, Tier-1/2 depth, cutover** (25 nodes, 261.25-436.5 d)

| ID | Node | Source WPs (chapters `02-14`) | Days | Deps | S/L/A/F % |
|---|---|---|---|---|---|
| RM-63 | Ports A: map surface, transport/HUD/timeline, bookmarks, share, unit/story/event panels, notifications | ARCH-21/22/23, UX-18, PERF-15 | 11.5-18 XL | 56,58,59 | 0/0/100/100 |
| RM-64 | Ports B: search, filter, legend, roster, OOB, Follow Ancestor, tools, walkthrough, command palette, header IA | ARCH-24/25/26, UX-15/19 | 13-21 XL | 63 | 0/0/100/100 |
| RM-65 | Compact presets and mobile-only parity | ARCH-27 | 3-5 L | 63,64 | 0/0/100/100 |
| RM-66 | States, share/cite/embed UI, Ask drawer, Help and trust layer | UX-22/24/25/26, PAGEC-32/33 | 8-15 XL | 64,41 | 0/0/60/100 |
| RM-67 | Cartography, symbology, legend, overlays, day/night | UX-20/21, A11Y-19 | 9-16 XL | 56,57 | 0/0/50/100 |
| RM-68 | Accessibility structural layer: Data View, unit cursor, pointer alternatives, live regions, forms, settings, reflow | A11Y-11..15/17/18/20..22 | 16-27 XL | 63,57,54 | 0/0/70/100 |
| RM-69 | Map-page loader facade and map-page template (Ground load path) | PERF-20, PAGE-10, PAGE-46 | 3-5.5 L | 50,62 | 0/0/30/50 |
| RM-70 | Cutover mechanics: /next beta, flags, go/no-go automation, rollback drills, decommission legacy | ARCH-30/32/33, INFRA-25 | 5-8.5 XL | 51,65,21 | 0/0/100/100 |
| RM-71 | UX research programme (card sort, tree test, usability rounds) and UX governance | UX-33/34 | 4.5-7.5 XL | 58 | 0/0/50/100 |
| RM-72 | Regression suites: function, console/fault/GPU, visual, accessibility automation, Historian gates, soak | QA-08/10/12/14/20/22, A11Y-29, PAGE-13, PAGEC-05 | 15.5-22.5 XL | 08,51 | 0/0/70/100 |
| RM-73 | Scorecard and traceability generator (rest) | QA-23 | 2-3.5 L | 08 | 0/0/100/100 |
| RM-74 | Historian P2: Official Records ingestion, linkers, time evidence, passage engine, golden-passage set, audit | HIST-12..19 | 16.5-23.5 XL | 41,42,43 | 0/0/100/100 |
| RM-75 | Historian P3: state books, casualty facts, unit and place page data | HIST-20/21/22 | 5.5-9 XL | 74,34 | 0/0/50/100 |
| RM-76 | Historian P4: voices, contested-topic registry, reviewed answers, regimental histories | HIST-23..27, SEO-23 | 11.5-18.5 XL | 75,42 | 0/0/0/60 |
| RM-77 | Tier-1 page A+: Dashboard chart and content, Search engine and UX, Report and Regiment unit model | PAGE-17..19/21/22/24..27, A11Y-25 | 14.5-25 XL | 62,33,41 | 0/0/60/100 |
| RM-78 | Tier-2 page A+: Compare, Camera, Documentary, Aftermath, Ground, Students, Turning Points, Find Ancestor, Ledger | PAGE-31/32/34..36/40/42, PAGEC-18..20/22/23/26..28, A11Y-27 | 21-35 XL | 62,43 | 0/0/30/60 |
| RM-79 | Labs dispositions and retirement mechanics; Immersive keep-gate; tours by link | PAGEC-09/16/35, PAGE-43 | 6-10 XL | 14 | 0/0/60/100 |
| RM-80 | Event-less stretches and night moments (sourced) | TIME-22 | 3-5 L | 45,59 | 0/0/0/50 |
| RM-81 | Train S4: programmatic content in gated batches (moments, ancestors, corps, embeds, cite, OG build, classroom kit v1) | SEO-14..20/24/25/27..29, PAGE-29 | 30-55 XL | 30,62,40 | 0/0/30/50 |
| RM-82 | User guide v2: truth audit, generator, PDF/UA or accessible HTML | CONTENT-10/11 | 6-9 XL | 37 | 0/0/50/70 |
| RM-83 | Teach hub, Students edition, press and embed kit, inclusive-history content | CONTENT-21/22/23/25, PAGE-40/41, SEO-24 | 12.5-21 XL | 39,42 | 0/0/0/50 |
| RM-84 | Repo docs and shipped-comment strip | CONTENT-26 | 2.5-4.5 L | 51 | 0/0/50/100 |
| RM-85 | Classroom mode, school-network readiness, in-app browser and hostile-environment matrix | UX-30, INFRA-30/31, QA-21 | 12.5-23 XL | 58,27 | 0/0/30/50 |
| RM-86 | A+ data depth: keyframe waves 2-3, roads, DEM and OSM, formation model, tenures, provenance backfill | DATA-08, 11, 12, 13, 14, 15, 16, 18, 24, PAGE-15 | 27.5-44.5 XL | 47,35,42 | 0/0/15/100 |
| RM-87 | Performance exception register, nav speed, static stability | PERF-21/26/28 | 1.75-4 L | 30,46 | 0/0/100/100 |

**P6 Proof and A+ evidence** (2 nodes, 15.5-28 d)

| ID | Node | Source WPs (chapters `02-14`) | Days | Deps | S/L/A/F % |
|---|---|---|---|---|---|
| RM-88 | CSP enforcement by class, end state, security evidence dossier | INFRA-17/18/33, QA-15, INFRA-32 | 6-12 XL | 27,62 | 0/0/60/100 |
| RM-89 | Proof: manual AT programme, independent accessibility evaluation, real-device runs, user sessions, dossier | A11Y-30/32/33, QA-21/24, CONTENT-27 | 9.5-16 XL | 68,72,70 | 0/0/30/100 |

**P7 Optional and conditional pool (unscheduled)** (9 nodes, 131-218 d)

| ID | Node | Source WPs (chapters `02-14`) | Days | Deps | S/L/A/F % |
|---|---|---|---|---|---|
| RM-90 | Immersive A+ (only if kept) | PAGEC-10/11 | 3-5 L | 79 | -/-/-/- |
| RM-91 | AR keep: heading engine, markers, on-site test (only if funded) | PAGEC-13/14 | 6-9 XL | 79 | -/-/-/- |
| RM-92 | Watch Together live relay (only if funded) | PAGEC-17 | 4-6 L | 79 | -/-/-/- |
| RM-93 | Cinematic Export v2 on an owned basemap (only if funded) | PAGEC-25 | 9-14 XL | 79 | -/-/-/- |
| RM-94 | Sandbox kept, real viewshed, Ground heat v2, page optional features, Turning Points stretch | PAGE-19/28/33/37/39/43/45/47, PAGEC-21 | 30-46 XL | 62 | -/-/-/- |
| RM-95 | On-site mode, map-mode convergence, offline pack | UX-31/32, INFRA-24 | 32-51 XL | 58 | -/-/-/- |
| RM-96 | Historian P5 base, optional semantic reranker B, LLM C-lite | HIST-28/29/31/32 | 27-49 XL | 76 | -/-/-/- |
| RM-97 | SEO tier-3: places, commanders, day pages, dataset and DOI, video channel | SEO-16/21/22/26/31 | 12-23 XL | 81 | -/-/-/- |
| RM-98 | Contingent: AST-split bridge, July 4 epilogue ticks, Labs accessibility if kept, CWSS rosters if permitted (rosters not sized) | ARCH-34, TIME-23, A11Y-28, HIST-30 | 8-15 XL | 79 | -/-/-/- |

## 4. Dependency graph and critical path

```
P0  RM-01 owner console/archive --> RM-02 repo,CI,staging --> RM-03 ratify ADRs        RM-04 reviewer + emails (long lead, parallel)
P1                                   |--> RM-05 real-tile harness --+--> RM-06 R0 mechanism <-- RM-07 R0 drills
P2  RM-06 --> RM-09 crash/input --> RM-10 mobile shell --> RM-13 a11y bridge;  RM-09 --> RM-11 date/data --> RM-12 deep links
             RM-06 --> RM-14 page core --> RM-22;  RM-15 OG, RM-16 headers, RM-17 copy, RM-18 perf;  RM-07 --> RM-08 QA net, RM-21 pipeline;  RM-19 privacy, RM-20 contact (need only RM-01)
P3  RM-16 --> RM-23 generator --> RM-24 S1 --> RM-25 S2 --> RM-30 S3 landing/map        RM-19+21+23 --> RM-26 collector --> RM-27 CSP
    RM-02 --> RM-31 data repo --> RM-33 identity --> RM-34 numbers, RM-38 text          RM-02 --> RM-43 time --> RM-44 bridge <-- RM-42 reviewer (DG-3)
    RM-31/04 --> RM-35 rights --> RM-36 legal, RM-40 Historian P0 --> RM-41 P1          RM-43+42 --> RM-45 triage;  RM-20+35 --> RM-39 trust pages
P4  RM-02+07 --> RM-51 parity harness   RM-02 --> RM-52 toolchain --> RM-53/55 data,store,map --> RM-56 renderer(needs RM-50 spikes) ; RM-52 --> RM-57 design system
P5  RM-56+58+59 --> RM-63 ports A --> RM-64 ports B --> RM-65 compact --> RM-70 cutover(needs RM-51, RM-21)      RM-41+42+43 --> RM-74 Historian P2 --> 75 --> 76
P6  RM-68+72+70 --> RM-89 proof (independent evaluation, devices, dossier);   RM-27+62 --> RM-88 CSP enforcement
```

**Effort-critical chains (unlimited parallelism) [V graph].** S: RM-01, 02, 05, 06, 09, 10 = 19 d. L: RM-01, 02, 05, 06, 16, 23, 24, 25, 30 = 47 d (it is the SEO train chain, which is also the calendar chain). A and F: RM-01, 02, 52, 57, 58, 63, 64, 65, 70, 89 = 97 d and 117 d. A single worker sums all nodes, so the serial length is 31, 237, 586 and 746 d.

**Calendar-critical chains (lead times that capacity does not shorten).**
1. GSC/Bing verified (owner action 2, about 2026-10-02) + 28 days baseline -> S1 (not before 2026-11-03) -> +28 d -> S2 -> +28 d -> S3 -> +28 d -> S4 batches of at most 100 URLs/week; a cutover may not fall within 4 weeks of an S-train.
2. Reviewer named (DG-2, 2026-11-30) -> 5-6 h/week for 8-10 weeks -> D-TIME sign-off (DG-3, 2027-01-31) -> RM-44 (bridge) or RM-59 (native clock) -> hour pages and clock strings.
3. Real mid-range Android (owner) -> RM-50 readouts (DG-2) -> RM-55/56 -> cutover -> 7 nightlies and a 14-day beta -> `/classic/` for 60 days.
4. Netlify RUM 30-day window after the last performance deploy -> the official "green" claim; first-party n >= 100 per template needs weeks at about 113 views/day.
5. Counsel lead time (unpriced) -> open data licence, any LLM tier, Classroom student statements (D-LEGAL step 3).
6. Freeze windows and credits (15 credits per production deploy; batch weekly; plan unverified).

**Hard ordering rules (register).** Archive -> R0 -> everything that ships bytes; new hashed filenames only; one identity-level SEO change per train; other releases stay 48 h clear of an S-train; no `/data/*` edits in Tranche 0; `RM-26` waits for `RM-19` and a Functions-capable deploy path (`RM-21`); Historian P2 waits for `RM-35`; HSTS preload and CAA changes only after the certificate renews (2026-11-10).

## 5. Tranches, calendars, WIP, stop rules, ordering

### 5.1 Calendar by capacity (P50, band from low and high effort; effort-bound lower limits)

| Milestone (path) | Net effort P50 | 10 h/week | 15 h/week | 30 h/week |
|---|---|---|---|---|
| M1 Survival complete: R0, pan/zoom, mobile shell core, date fix, deep links, privacy, contact (S) | 31 d | Apr 2027 (Feb 2027 to May 2027) | Jan 2027 (Dec 2026 to Mar 2027) | Dec 2026 (Nov 2026 to Dec 2026) |
| M2 Tranche 0 complete: R0 plus R1a/b/c, all of P0-P2 (L) | 76 d | Dec 2027 (Aug 2027 to Apr 2028) | Jul 2027 (May 2027 to Oct 2027) | Feb 2027 (Jan 2027 to Apr 2027) |
| M3a Train S1 shipped (L) | 85 d | Feb 2028 (Oct 2027 to Jul 2028) | Aug 2027 (Jun 2027 to Nov 2027) | Mar 2027 (Jan 2027 to Apr 2027) |
| M3b Train S2 shipped (L) | 105 d | Jul 2028 (Jan 2028 to Dec 2028) | Nov 2027 (Aug 2027 to Mar 2028) | Apr 2027 (Mar 2027 to Jun 2027) |
| M3c Train S3: landing at / and app at /map (L) | 147 d | Apr 2029 (Jul 2028 to Dec 2029) | May 2028 (Dec 2027 to Oct 2028) | Jul 2027 (Apr 2027 to Sep 2027) |
| M3 Legacy A-line complete (L) | 237 d | Nov 2030 (Oct 2029 to Dec 2031) | May 2029 (Sep 2028 to Feb 2030) | Jan 2028 (Sep 2027 to May 2028) |
| M4 Rebuild cut over at /map (A) | 477 d | beyond 2031 | beyond 2031 | May 2029 (Aug 2028 to Jan 2030) |
| M5 Full A+ path complete, evidence in hand (F) | 746 d | beyond 2031 | beyond 2031 | Oct 2030 (Oct 2029 to Nov 2031) |

Weeks from 2026-10-05, P50 (low-high effort):

| Milestone | 10 h/week | 15 h/week | 30 h/week |
|---|---|---|---|
| M1 survival (S) | 25 (19-32) | 17 (12-21) | 8 (6-11) |
| R0 shipped (S) | 15 (11-19) | 10 (7-13) | 5 (4-6) |
| M2 Tranche 0 complete (L) | 63 (47-80) | 42 (31-53) | 20 (15-26) |
| S3 landing and /map (L) | 130 (95-165) | 84 (61-106) | 40 (30-51) |
| M3 legacy A-line (L) | 214 (156-272) | 137 (100-174) | 66 (48-83) |
| M4 cutover (A) | 458 (338-578) | 286 (211-361) | 135 (99-170) |
| M5 full path (F) | 736 (546-927) | 455 (337-572) | 212 (157-267) |

"Beyond 2031" means effort alone exceeds five years. The lead times of section 4 are floors on top: S3 not before 2027-01, S4 not ending before about 2027-04, cutover needs DG-4 and a beta, the green claim needs the 30-day window. **R0 ship dates (Tuesday deploys, survival path, P50 with band):** 2026-11-10 at 30 h/week (Oct 31 to Nov 18), 2026-12-15 at 15 h (Nov 26 to Jan 1), 2027-01-19 at 10 h (Dec 22 to Feb 15). The register's 2026-10-21 leaves about 11 net days even at 30 h/week for an R0 kit of 14-24 net days (survival fractions of `RM-01, 02, 03, 05, 06, 07`), so it holds at no capacity; best case 2026-10-31 at 30 h with low-end effort. The register says to stop and re-plan if R0 misses 2026-10-21: this is that re-plan.

### 5.2 Commitments by plan (what to promise, what to shelve)

| Plan | Hours | Commit | Shelve until capacity changes | Expected honest state at end of 2027 (P50) |
|---|---|---|---|---|
| S | 10-12 | RM-01..03, 05..07, 09..12, 14 (slice), 19, 20; then SEO S1 (RM-23/24) only if hours rise | everything else; enter maintenance mode after M1 (section 8) | Tranche 0 mostly done (about 68 net days); overall B / B-; no rebuild |
| L | 15-30 | S, then P2 complete, S1-S3, RM-31..38, RM-40..45, RM-46..49; capacity review at DG-3 | rebuild P4-P6, Tier-2 depth, P7 | at 15 h: T0 + S1 + S2 done; at 30 h: legacy A-line (L) done about Jan 2028; overall B+ / B |
| A/F | 30+ plus a second contributor | L in parallel with RM-50..56 (spikes, harness, toolchain); rebuild lane starts at DG-3 with the reviewer and devices in hand | Tier-2 depth and P7 | cutover 2028-2029; A+ only per section 7 |

### 5.3 Work in progress and lanes

WIP limit 2 (D-SCOPE-TIERS): one **ship lane** (R0, R1, trains, headers, collector; never waits on a foundation) and one **foundation lane** (data repo, time module, Historian P0/P1, later the rebuild). The ship lane owns the calendar; the foundation lane uses gate waits (baselines, reviewer replies, counsel) as work time. No third lane: no estimate here includes the context-switch cost.

### 5.4 Priority queue used by the schedule model

R0 kit 01, 02, 03, 05, 06, 07, 04; survival 09, 11, 19, 20, 10, 12, 14; Tranche 0 08, 13, 15..18, 21; web layer 23, 24, 49, 26, 25, 22, 31..33, 43, 42, 30, 34..38, 44, 45, 40, 41, 39, 46, 27..29, 47, 48; rebuild 50-89 in order. Rationale: hard chain, then grade per day (5.7), then fixed-date trains, then reviewer-lead-time foundations, then the rebuild.

### 5.5 Sensitivity (does any lever change the answer?)

| Owner hours | Capacity case | L legacy A-line done | A cutover done | F full path done |
|---|---|---|---|---|
| 15 h/week | base | May 2029 | Mar 2032 | beyond 2033 |
| 15 h/week | AI leverage x1.5 | Jul 2028 | May 2030 | Jul 2032 |
| 15 h/week | +1 contributor, same hours (x1.85) | Mar 2028 | Sep 2029 | Jun 2031 |
| 15 h/week | both (x2.8) | Sep 2027 | Sep 2028 | Nov 2029 |
| 30 h/week | base | Jan 2028 | May 2029 | Oct 2030 |
| 30 h/week | AI leverage x1.5 | Aug 2027 | Jun 2028 | Jun 2029 |
| 30 h/week | +1 contributor, same hours (x1.85) | Jun 2027 | Feb 2028 | Dec 2028 |
| 30 h/week | both (x2.8) | Mar 2027 | Sep 2027 | Mar 2028 |

AI leverage (agentic runs on validators, migrations, templates, test suites) is the cheapest lever and is unmeasured; a second contributor helps only the parallel lanes (about x1.85). Even both together leave F near 2028-2029 at 30 h/week, and train, reviewer, beta and RUM lead times are floors: the decision is scope, not speed.

### 5.6 Stop rules (apply to every tranche)

1. A phase slips more than 20%: scope review; defer mobile-only polish, Tier-2 depth and Labs, never the harness, a11y primitives, R0 drills or the one-week net [S 01, 03, 06, 12].
2. R0 not shipped by 2026-10-21: re-plan as in 5.1; no byte ships outside R0.
3. Operations above 10 h/month for two months: maintenance mode (8.2) until two months are under 8.
4. Historian review backlog over 14 days: freeze new-source ingestion; no reviewer by P4: skip SHSP, ship "Unreviewed reconstruction" [S 14].
5. After an S-train, structural signals (canonical chosen elsewhere, indexed count down 20% over 14 days, redirect-matrix error) revert through the versioned redirect map; click counts are too small to decide [S 10].
6. Landing keep/revert (D-ROOT): map launch per landing view under 45% at day 90 add a preview; under 30% revert to app-at-root.
7. `/map` mobile under 95 with real tiles: record the ceiling (floor 90) in `docs/perf-exceptions.md`; never delay the boot to dodge the trace [S 05 s.12].
8. Credits at 70% of the month (15 per deploy): batch weekly, hold non-critical trains.
9. Capacity review at DG-3: under 35 h/week confirmed and no second contributor means Plan L stays and the rebuild does not start.
10. No public "A+" before the section 7 evidence; every train quotes measured numbers only.

### 5.7 Grade-impact-per-day ordering (used to build the queue)

| Rank | Node | Est. grade points moved (4.3 scale, desktop plus mobile) | Days (P50) | Points per day |
|---|---|---|---|---|
| 1 | RM-14 slice Historian undefined fix and dev-page removal (cheapest slice of RM-14) | 2.0 | 0.9 | 2.22 |
| 2 | RM-09 T0 group A: pan/zoom, sound freeze, C5, error boundary | 2.9 | 1.4 | 2.07 |
| 3 | RM-19 Interim privacy correction | 0.8 | 1.0 | 0.80 |
| 4 | RM-11 Date +2, Day 2/3 load on jump, minimap | 1.2 | 1.5 | 0.80 |
| 5 | RM-10 Mobile shell | 3.3 | 5.5 | 0.60 |
| 6 | RM-06 R0 mechanism (hard prerequisite) | 3.7 | 6.2 | 0.59 |
| 7 | RM-13 A11y bridge and shared layer | 2.6 | 4.5 | 0.58 |
| 8 | RM-12 Deep links and moments v0 | 2.0 | 4.0 | 0.50 |
| 9 | RM-18 R1 legacy performance increment | 1.7 | 4.9 | 0.35 |
| 10 | RM-33 Data identity: 95 unresolved ids, blue Confederates, batteries | 2.0 | 10.0 | 0.20 |
| 11 | RM-24+25 S1 and S2 trains | 1.8 | 12.5 | 0.14 |
| 12 | RM-41 Historian P1 | 2.0 | 15.0 | 0.13 |
| 13 | RM-43/44/45 Clock model, bridge, triage (C4 is critical) | 2.0 | 23.7 | 0.08 |
| 14 | RM-57..70 Rebuild core: design system to ports | 8.0 | 150.0 | 0.05 |

Points are my estimates from the chapters' "moves" columns (steps on a 4.3 scale, desktop plus mobile) [E, low to medium confidence]. Fix input, crash and false-text defects first (about 2 points/day); R0 ranks mid-table but is the prerequisite of every byte; SEO trains, Historian and the clock earn less per day but are the only route to those categories and are lead-time gated; the rebuild earns 0.05 points/day: it buys the ceiling, not the recovery.

### 5.8 What to cut first (in this order), and what never to cut

Cut in this order: (1) P7 pool, all nine nodes (131-218 d); (2) deferred Tier-2 depth (45-79 d); (3) `RM-83` Teach hub, Students edition, inclusive history (keep the reviewer-signed minimum only if CD-2 is answered); (4) `RM-85` classroom mode beyond the IT-admin page; (5) `RM-81` S4 growth content beyond the first two batches; (6) `RM-80`, `RM-76` (voices), `RM-86` (A+ data depth); (7) `RM-82` guide v2 (ship the truthful v1); (8) `RM-78`, `RM-67`, `RM-69`; (9) `RM-71` research beyond one round; (10) the rebuild `RM-50..66` as a whole (Plan L). **Never cut:** the archive and repo (RM-01/02), R0 and its drills (RM-06/07), pointer-capture and crash fixes (RM-09), privacy and contact (RM-19/20), the stored-XSS fix and dev-page removal inside RM-14, reviewer recruitment (RM-04), the minimum continuity pack (RM-29), the one-week QA net (part of RM-07/08).

## 6. Minimum path to A versus full path to A+, by category (desktop D / mobile M)

### 6.1 Expected honest grade after each milestone (re-scored from specialist evidence)

Baseline is the verified state of chapter 02, not the audit's first scoring. Cells are D / M on the audit's letter scale. M1 = survival path (subset of P0-P2), M2 = Tranche 0 complete (P0-P2), M3 = legacy A-line (through P3), M4b = grade-A path (through P5: rebuild cut over, before independent evidence), M5 = full path with the section 7 evidence (through P6). Dates by scenario are in section 5.1.

| Category | Now | M1 S | M2 T0 | M3 L | M4b A | M5 F + evidence | Confidence |
|---|---|---|---|---|---|---|---|
| Function | C / D- | B / C+ | B+ / B- | B+ / B | A / A- | A+ / A | now H; M2 M (scratch-verified); mobile L |
| Fit and finish | C+ / D+ | C+ / C | B- / C+ | B / B- | A- / B+ | A+ / A | M2 M; later L |
| UX | C+ / D | B- / C | B / C+ | B+ / B- | A- / B+ | A+ / A | L (no user has ever been tested) |
| Reliability | C / C- | B / B- | B / B- | B+ / B | A- / A- | A+ / A | M; iOS and GPU loss unproven |
| Performance | C / D+ | B- / C+ | B- / C+ (lab higher; RUM lags) | A- / B+ | A / A- | A+ / A | lab H, field L; mobile A+ needs `/map` >= 95, P about 35% [S 05] |
| Accessibility | D / D | D / D | C / C | C+ / C | B+ / B+ | A+ / A+ | M; independent evaluation, else capped A [S 07 O-2] |
| SEO (technical) | B- / B- | B- / B- | B / B | A- / A- | A / A | A / A | M; A+ needs outcome floors that no work package controls [S 10] |
| Security and privacy | B- / B- | B / B | B+ / B+ | B+ / B+ | A- / A- | A+ / A+ | M; CSP Report-Only until RM-88; counsel, outside review |
| Documentation | B- / C+ | B- / C+ | B- / B- | B+ / B | A- / A- | A / A | M; capped A- without non-author readers [S 11 X-13] |
| Data accuracy | C- / C- | C- / C- | C- / C- | B / B | B+ / B+ | A- / A- | L; needs a named reviewer; A+ is the least likely cell |
| Ask the Historian | D+ / D | C- / D+ | C / C- | B / B | A- / A- | A+ / A | M through P1; A+ needs Golden-Core >= 95% and 100 outside questions |
| **Overall** | C+ / D+ | B- / C+ | B / B- | B+ / B | A- / A- | A / A | matches chapter 02 (B / B- after Tranche 0) |

Reconciliation: chapter 02 grades accessibility C+ / C+ after Tranche 0; chapter 07, which owns it, grades C / C (about 23 failing criteria become 11 failing plus 15 partial). This table uses chapter 07. Honest expectation for the whole F path: the table shows A+ in 8 of 11 desktop cells and 2 of 11 mobile cells, and even those are conditional; data accuracy, mobile performance, SEO outcomes and documentation depend on outside evidence, real tiles or people the owner does not control.

### 6.2 Minimum path to A and additions for A+

| Category | Minimum path to A (nodes) | Additional for A+ (nodes) | Desktop limit | Mobile limit |
|---|---|---|---|---|
| Function | RM-09..12 now; rebuild core RM-51..56, 58, 61, 63..65, 70 (H5, H6, H12, H13, D1, D4 need the rebuild or an amendment) | RM-66, 72, 77, 79 | legacy ceiling B+ [S 03] | B- after RM-09/10; A needs RM-65 |
| Fit and finish | RM-13; RM-57 (70%), 58, 62 (50%), 65 | rest of RM-57, 62; RM-67 | emoji icons until RM-57 | dense panels until RM-58/65 |
| UX | RM-10, 58, 59, 64 | RM-66, 71 (card sort, tree test, SUS >= 80), 72, 85 | onboarding modal removed at cutover | device matrix and Samsung Internet unproven |
| Reliability | RM-06..08, 21, 28, 29; RM-55 (GPU), 70 (drills) | RM-72 (soak, faults), 85, 89 | none | iOS canvas memory, in-app browsers unverified |
| Performance | RM-05, 06, 18, 26, 46 (CWV green on legacy); RM-52..56, 58 (real-tile 90+) | RM-69, 87, 89; RM-30 landing >= 98 | lab 97-100 likely | `/map` 92-97, central 94; floor 90 |
| Accessibility | RM-13; RM-57 primitives; RM-58 (Text route); RM-68 (70%) | rest of RM-68; RM-72 automation; RM-89 independent evaluation | keyboard and Data View | TalkBack, VoiceOver iOS; targets 44 px |
| SEO | RM-15, 16, 23, 24, 25, 30, 49 | RM-81 (140-200 URLs), 83; outcome floors | Lighthouse SEO on indexable URLs only | same |
| Security and privacy | RM-01, 14 (XSS), 16, 19, 20, 26, 27, 29, 36 | RM-88 (CSP enforced by class), 89 (dossier), counsel | securityheaders A+, Observatory 100 | Classroom and IAB modes |
| Documentation | RM-17, 37, 38, 39 | RM-82, 83, 84, 89 | guide PDF/UA or accessible HTML primary | Help two taps from Tools |
| Data accuracy | RM-04, 11, 31..35, 38, 42..45, 47, 48 | RM-60, 80, 86; reviewer sign-off | clock and identity | same |
| Ask the Historian | RM-14 slice, 35, 40, 41 (B), 74 (A-) | RM-75, 76, 89 | 100 outside questions | latency on a real Android |

## 7. Consolidated A+ scorecard (link: chapter 12 X1-X12 and the category gates)

A category is A+ only when every row passes on both device classes, has at least six gates (fewer caps at A-), and cites a non-author artefact (D-EVIDENCE). Missing result = failed. The scorecard is computed by `RM-73` (`WP-QA-23`). The 11 categories of this section group the audit's 13 that chapter 12 s.6.3 grades (content depth + data consistency = Data accuracy; visual design + fit and finish = Fit and finish; security + privacy/legal = Security and privacy) and add Ask the Historian; `tools/gates.json` carries both `cat` (13) and `group` (11) so either roll-up is computed and the six-gate cap is applied to each.

| Category | Desktop pass thresholds | Mobile pass thresholds | Gates and evidence |
|---|---|---|---|
| Function | 0 uncaught errors and 0 console errors in journeys J1-J8 and with uBlock lists; drag and wheel change `getCenter()`/zoom; tap selects; deep links round-trip (>= 99% live, 100% fixtures); 57/57 audit ids gated | same by touch; pinch, double-tap; sheet scroll never pans the map | ch02 X3-X7, ch03 E-10, ch06 UX-A4/A9, ch12 X1/X4 |
| Fit and finish | 24-row viewport matrix: 0 OFFSCREEN, OCCLUDED, OVERLAP, CLIPPED_TEXT, H_OVERFLOW; text >= 12 px; 0 raw hex outside tokens; one shell | targets >= 44 px; map >= 73% of height in compact portrait; safe-area insets | ch06 UX-A1..A7/A14/A16, ch12 X3 |
| UX | first Play in 1 tap; 0 blocking overlays; card sort >= 70%; first-tap INP <= 100 ms | Round 2: 5 of 5 users complete T1 in 30 s, SUS >= 80, SEQ >= 6; one independent AT session; one professional critique | ch06 UX-A8/A11/A13/A15/A19 |
| Reliability | fault matrix 6/6; R0 and kill-switch drills <= 90 days old; rollback < 60 s; soak heap +<= 30 MB over 60 min; error sessions <= 0.1% | GPU-loss recovery < 3 s over 20 cycles; iPhone SE and Samsung Internet per release candidate | ch03 E-15, ch12 X9/X10 |
| Performance | Lighthouse >= 95 (median of 5, production-Referer tiles); LCP <= 2.5 s [1.5], INP <= 200 ms [150], CLS <= 0.1 [0.05], FCP <= 1.8 s [1.2], TTFB <= 800 ms, TBT <= 200 ms | same; `/map` mobile floor 90 with a recorded ceiling, Text route >= 98; real Moto G Power-class, iPhone SE, 4 GB Chromebook archived | ch05 L1-L4, R1-R4, F1-F3, D1 |
| Accessibility | WCAG 2.2 AA 0 failing criteria on 6 flows (independent); axe 0 over about 34 states; Lighthouse 100; keyboard 22 tasks; 30 green nights; NVDA and JAWS | TalkBack and VoiceOver iOS T1-T12/T17-T22; reflow 320 px; orientation unlocked | ch07 AX-01..19 |
| SEO | TA-01..18: one URL identity, sitemap equals canonical set, valid OG per template, JSON-LD valid, thin-content gate 100%, GSC clean 60 days after S1 | same parity; mobile-first raw HTML equals rendered | ch10 s.1; outcome bands are reported, not gated |
| Security and privacy | securityheaders A+, Observatory >= 100; CSP enforced on 100% of HTML, no unsafe-inline at end state; 0 violations in the crawl; contacted origins equal disclosed origins; keys evidence <= 90 days; DMARC quarantine or reject; counsel sign-off | Classroom mode passes with only the site and `api.mapbox.com`; IAB matrix 0 page-originated errors | ch09 E1-E13 |
| Documentation | `copy_lint` 0; counts from `facts.json`; guide passes veraPDF `ua1` (or HTML primary); trust pages live; corrections >= 10 dated entries; acknowledgement <= 3 days | strings fit at 320 px; no keyboard text on touch | ch11 X-01..14 |
| Data accuracy | 0 unresolved unit ids; 675/675 ticks renderable; one clock string per tick; validators 0 errors; provenance >= 95%; review coverage published; no "Reviewed" without a decision | same | ch13 DQ-1..13, ch04 TX-01..15 |
| Ask the Historian | >= 22,000 passages, 100% page citations, Golden-Core >= 95%, recall@5 >= 0.90, citation precision >= 0.95, 0 unsupported claims, >= 100 outside questions, reviewer audit | shell <= 45 KB br; INP <= 200 ms in a 100-query session on a real Android | ch14 A1/A2 |

**Definition of green.** Official: Netlify RUM 30-day p75 for All, Mobile and Desktop all Good (LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1, FCP <= 1.8 s, TTFB <= 800 ms), about a month after the last performance deploy. Feedback: first-party per-template 7-day p75, n >= 100, else "insufficient", never green (templates: landing, `/map` desktop, `/map` mobile, content, tools, Historian). Lab: Lighthouse on the URLs the owner names as scored, `/map` included. **Public claim rule:** "A+" only when the scorecard is A+ in two consecutive weekly runs, the RUM window is clear, and five artefacts exist: independent accessibility evaluation of 6 flows, real-device runs, outside security review, one professional UX critique, 8-10 user sessions plus 100 outside Historian questions [S 01 D-EVIDENCE]. Until then: "partially conforms" and milestones.

## 8. Recurring operations, maintenance mode, continuity, vendor exit

### 8.1 Steady-state duties (hours per month, owner time, excluding content and outreach)

Chapter 09 Appendix B totals 7.0 h, chapter 10 adds up to 3 h of SEO operations, test health and alert triage about 1 h (my estimate), weekly release batching about 1.3 h (my estimate): **12.3 h against the 10 h ceiling** [V sum]. Fitted plan (9.2 h):

| Duty | h/month | Automation | Alert or trigger |
|---|---|---|---|
| Dependency and security PRs | 1.0 | Renovate patch auto-merge on green CI; Mapbox minors quarterly behind parity | critical advisory: same week |
| Weekly digest (RUM per template, probes, CSP, credits, Mapbox usage, DMARC, certificates) | 0.7 | one scheduled issue, read in 10 minutes | any red row; p75 not Good 2 weeks running, n >= 100 |
| Quarterly drills (restore 2 h, kill switch 1 h, rollback 0.5 h; DNS cut-over twice a year) | 1.0 average | scripted runbooks, `ops/drills.md` | drill older than 90 days |
| Corrections and contact triage (ack <= 3 days, fix or explain <= 30 days; Historian fix <= 14 days; takedown <= 24 h) | 2.0 | auto-responder, labels, spam filter | SLA breach |
| SEO operations (KPI ledger, GSC/Bing exports, release annotations) | 2.0 after S4, 3.0 before | CI suite and exports | structural rollback signals (section 5.6) |
| Test health, release promotions (at most 4 a month plus a hotfix reserve), filter follow-ups | 0.5 + 0.7 + 0.3 | auto-quarantine; `release.yml` runbook 30 minutes | flake > 1% over 30 runs; credits >= 70% |
| Incident buffer | 1.0 | - | - |

Historian review (12-16 h/month) is the reviewer's time; the owner's part is sign-off and corrections triage (in the 2.0 above).

**Alert thresholds and vendor exit triggers** [S 09 Appendix B, 01 D-CONTINUITY]:

| Vendor or asset | Numeric trigger | Exit path |
|---|---|---|
| Netlify (hosting, DNS, RUM, Functions, Blobs) | credits >= 70% of month; cost rise > USD 20/month; outage > 4 h; 2 code rate-limit slots on Free/Personal (ingest takes one) | lite snapshot on a second host; DNS records exported and rehearsed twice a year |
| Mapbox (live map) | loads > 35,000/month (70% of the 50k free tier; today about 3.4k); usage alerts at 50/70/90%; unexplained 403 rate; price or ToS change; no documented hard spend cap [U] | O3/O5 behind the map facade (WP-DEC-02); bots and headless get a poster |
| Google Embed key, NPS video | billing over USD 1; X-Frame-Options added on video pages | link-out |
| GitHub (repo, CI) | Actions minutes > 80%; plan change | second remote, GitLab CI |
| Name.com (registrar) | renewal price > 2x; lock or 2FA incident; domain expires 2027-06-13 | transfer per the continuity letter; renew to 2031 or later now |
| TLS | expiry alerts at 20/10/5 days (current certificate to 2026-11-10; Netlify renews at <= 30 days) | manual renewal runbook |
| LLM provider (only Historian C-lite) | USD 25/month cap; provider terms change for minors | `HISTORIAN_ENABLED=false` |

### 8.2 Maintenance mode

Enter when operations exceed 10 h/month for two months, capacity falls below 8 h/week for a month, or the owner is away more than 14 days. **Pauses:** outreach, new content and S4 batches, Tier-2 work, new Historian sources, non-hotfix promotions. **Never pauses:** security patches, domain and TLS renewals, corrections and takedowns, credit and usage alerts, the weekly digest, the kill switch. The site stays on the last green release; the delegate holds the runbooks. Leave after two months under 8 h.

### 8.3 Backup and continuity (RM-29, D-CONTINUITY)

3-2-1: private GitHub plus a second remote from day one plus a monthly encrypted bundle to cloud storage; large artefacts (OCR cache about 75 MB, golden sets) by git-lfs or hashed archive; the 126 archived zips stay outside git with `ARCHIVE_MANIFEST.tsv`. Secret-free `ops/inventory.yaml` (Netlify settings, env var names, DNS export, registrar, Mapbox and Google restrictions, GSC/Bing owners, alert routes); secrets in a password manager with emergency access for a named delegate; recovery mailbox separate from the public contact. Quarterly restore drill from an empty machine to a fresh Netlify site in 2 h; lite snapshot (landing, Text route, legal) deployable to a second host, RTO 4 h; continuity letter and sunset plan (static archive with a "not updated since" banner). Maintainability contract for AI-assisted code: dependency budget in CI, one ADR per non-obvious choice, every runbook runnable by the owner in 30 minutes without an AI session, tests as the safety net, commit trailers recording assistance.

## 9. Verification-debt register (every UNVERIFIABLE and NOT_VERIFIED finding, plus chapter debt)

Nothing below is scheduled for build until its row is closed with evidence or dropped (a dated waiver with `review_by` is allowed [S 12]). The single REFUTED finding, `time-facts-15`, is excluded.

| # | Item (finding ids) | What resolves it | When | Blocks |
|---|---|---|---|---|
| V1 | Real-mouse drag and wheel on the live map (`app-latent-04`, `mobile-02`, `perf-runtime-01`) | headed desktop browser, 5 minutes | this week, before R1a | order of RM-09 vs C1 |
| V2 | Real-tile boot and Lighthouse (`perf-cwv MISSED-06`; `deploy-history-33` UNV per-deploy baselines; `perf-runtime-36` UNV boot long tasks) | RM-05 harness with the production Referer; one trace on a real phone | before the R0 gate | every budget |
| V3 | Netlify plan, credits, preview metering, `pretty_urls=false`, header precedence, Blobs, rate-limit slots, Split Testing re-check | owner screenshots; WP-DEC-05 spike on a Deploy Preview | DG-0, before S1 | RM-16, 23, 26, 70 |
| V4 | Mapbox allow-list, scopes, spend cap, Product Terms of 2026-07-21, raster tiles outside the SDK, `webglcontextlost` on 3.24.1 | dashboard, read terms, `WEBGL_lose_context` x20 | DG-0, DG-2 | RM-50, 55 |
| V5 | Google key restriction and enabled APIs; account security (`infra-netlify-39` UNV) | Cloud console; 2FA and passkey audit | week 1 | RM-01, 14 |
| V6 | Traffic quality (`infra-netlify-32` UNV): do probes count in Analytics; RUM pollution | E1 probe, two weeks of measurement | R0 + 2 weeks | RM-26 |
| V7 | Devices: iPhone SE, mid-range Android, Samsung Internet, Chromebook; Street View pano ids (`deploy-history-31` UNV); Documentary nav row (`pagesB-16` UNV) | owner devices at the R1b gate | before R1b | RM-10, 13, 78 |
| V8 | iOS AR gesture chain (`pages-C-40..43` NV), Safari MediaRecorder (`pages-C-73/74` NV), canvas memory, in-app browsers | device sessions, only if Labs are kept | DG-3, DG-4 | RM-91, 93, 85 |
| V9 | Assistive technology never run; landmark reconciliation; overlap thresholds (`app-a11y-20` UNV) | WP-A11Y-29 step 0 headed sweeps and an NVDA smoke on the live site; AT log per phase | before R1b | RM-13, 68, 89 |
| V10 | History: 5 R anchors, 45 low-confidence rows, unread primary sources, Confederate casualty authority, 22 cavalry commanders | reviewer sprint (5-6 h/week for 8-10 weeks) | DG-3 | RM-34, 42-45, 74 |
| V11 | Rights: NPS CWSS redistribution, atlases behind positions, paid-app and YouTube provenance, HMDB and Stone Sentinels terms, share-alike duties, counsel scope | owner answers (register action 10); permission emails; counsel | DG-0 answers, DG-3 counsel | RM-35, 36, 86 |
| V12 | Toolchain: Vite 8, Astro 7, TypeScript 7 options; private-repo Actions minutes; forwarder DMARC; Forms limits | WP-ARCH-09 smoke, WP-DEC-04, billing page | DG-2 | RM-52 |
| V13 | Historian: `perf-runtime-33` (budgets), `hist-sources-1-13` (OCR gates), `hist-sources-1-16` (QA harness), `hist-current-27` (feedback logging) all UNV; IA reader-index offsets; phone latency | pilot on OR27-1; 10x fixture; real Android; decision none in Stage A | P0 and P1 exits | RM-40, 41, 74 |
| V14 | SEO method: `seo-growth-28` (keyword map), `seo-growth-37` (monitoring design) UNV; older GSC or Bing property; vendor token spellings | D30 re-score from real GSC data; owner login | 2026-10-30 | RM-49 |
| V15 | Research and feature proposals: `ux-flows-22/27`, `pagesA-15/30`, `pagesB-23/38` (UNV); Sandbox `pagesB-31/32/33` (UNV) | pilot round, decide by user tests; Sandbox only if kept | RM-71; DG-3 | Tier-2 depth |
| V16 | `app-latent-36`, `app-latent-43`, `app-bugs-37` UNV and `app-latent-42` NV (observability, prevention, test hook, closure hygiene) | red-first tests and the hooks contract in the rebuild | RM-51, 72 | none before |
| V17 | `pages-C-21` (Historian conversation), `25/30/32/33` (Immersive), `61/62` (Turning Points), `67` (Find Ancestor), `79/80` (Ledger), `84` (Terms clauses) NV | one verification pass at the start of each WP; `84` needs counsel | with the WP | RM-36, 41, 78, 79 |
| V18 | New patch code with no prior run (deep-link reader, `i2` carry-forward, merge fix, minimap, layout listener, `setMapRef`); Bookmarks open in the upgrade drill; Safari SW upgrade | R1 staging drills; Firefox and WebKit runs; devices | R1 gates | RM-09..12 |
| V19 | `dv` migration against real shared links (none inventoried); browser share unknown (no UA data) | fixtures; first-party beacon after RM-26 | RM-61; DG-4 | D-BROWSERS |
| V20 | Reviewer capacity: 155-226 h against 3-4 h/week is 39-75 weeks | charter with two readers, front-loaded sprint | DG-2 | RM-42 |

## 10. Owner decisions with deadlines

Gates: DG-0 2026-10-07, DG-1 2026-10-21, DG-2 2026-11-30, DG-3 2027-01-31, DG-4 2027-04-30, DG-5 after 2027-07-06 [S 01]. **B** = blocking (explicit answer needed); D = default applies at its gate unless overridden in writing. Dates are decision dates, not delivery dates.

| # | Decision | Default | By | Blocks |
|---|---|---|---|---|
| OD-1 | **B** Capacity contract: hours per week and plan S, L or A/F (D-SCOPE-TIERS); Labs (AR hide then retire; Watch Together, Cinematic Export, Sandbox retire) | state hours now; Plan L at 15-30 h; retire Labs | DG-0, confirm DG-3 | everything |
| OD-2 | **B** Name "Gettysburg Interactive Map" with a true non-affiliation sentence (D-NAME); remove in-app sound (D-SOUND); delete the dead heatmap (D-HEATMAP) | approve; remove; delete | DG-0 | RM-09, 17, 25, 37 |
| OD-3 | **B** Historical reviewer and second reader, 5-6 h/week for 8-10 weeks then 3-4 (D-HIST-REVIEW) | name by 2026-10-07 if possible; else labelled fallback | DG-2 | RM-42..45, 74 |
| OD-4 | **B** D-TIME: historian decides the 5 R anchors; owner signs the 3 design anchors and conventions (LMT, first-light tabs, "about") | sign owner items at DG-2, historian items by DG-3; else "proposed" plus pill | DG-2/DG-3 | RM-44, 59, hour pages |
| OD-5 | **B** Contact: forwarder and role addresses; no null-MX (D-CONTACT) | contact@, corrections@, security@ | DG-1 | RM-20, 39 |
| OD-6 | **B** Legal: interim facts-only privacy now; operator identity, governing law, counsel budget before licence, LLM, Classroom (D-LEGAL) | interim now; counsel by DG-3 | DG-1, DG-3 | RM-19, 26, 36 |
| OD-7 | **B** Rights answers (register action 10: paid-app or YouTube provenance, Busey and Martin, registered marks) and licence (D-LICENSE); CWSS emails sent now (D-CWSS) | no open data licence until the audit; link-out only | DG-0, DG-3, DG-5 | RM-35, 36, 86 |
| OD-8 | **B** Continuity: delegate, second remote, ops ceiling 10 h/month (D-CONTINUITY) | as written; maintenance mode per 8.2 | DG-2 | RM-28, 29 |
| OD-9 | Root: landing at `/`, app at `/map` (D-ROOT); entry: no chooser, no fake fast-forward, 20-second moment after a gesture (D-ENTRY) | approve; chooser and sweep removed in R0/R1 | DG-2 (S3) | RM-06, 30, 58 |
| OD-10 | Deploy path: Netlify CLI, plan, credits, GitHub plan (Pro, public after gitleaks, or Free with convention) (D-CI-HOST; ch02 O-T0-4, ch12 #1) | CLI; Pro if affordable | DG-0 | RM-02, 21 |
| OD-11 | Closed-list amendments: error boundary (AMD-T0-1), gold-trail line layer (AMD-T0-2, optional), delete the H1 overlay scripts in `index.html` (ch07 O-3), Street View click-to-load and token literals (ch09) | accept boundary and overlay deletion; gold trail = delete calls | 2026-10-13 | RM-09, 13 |
| OD-12 | Carry-forward rule for units after their last keyframe ("played-through" state in Tranche 0; forever vs TTL for the rebuild) (ch02 O-T0-3, ch03, ch13 Q-DATA-1) | accept for T0; decide TTL at DG-3 | 2026-10-27; DG-3 | RM-11, 54 |
| OD-13 | T0 plus amendment (this chapter): allow small closed-list additions for H5 natural sort, D4 Order of Battle on desktop, H12 Distance tool if the anchors assert once on the frozen bundle, when Plan L is chosen or cutover is more than 6 months away | propose; verify anchors first | DG-1 | RM-64 partly, function grade |
| OD-14 | Real devices: Galaxy A-class 4 GB (also covers Samsung Internet), iPhone SE-class, 4 GB Chromebook; who runs the checks | buy or borrow | before R1b (about 2026-10-24) | RM-10, 13, 50, 89 |
| OD-15 | Second contributor or budget for outside evidence (accessibility evaluation, UX critique, counsel; cost unverified) | none assumed; ask at DG-2 | DG-2, DG-4 | Plan A/F, RM-89 |
| OD-16 | Public claim policy: quote milestones, never "A+" before section 7 evidence; S1 and S2 as separate trains | accept; separate | DG-0 | RM-24, 25, 89 |
| OD-17 | Casualty headline wording, count wording "569 units", B&M as facts-only (Q-DATA-2/3/6); Historian numbers policy (OR returns before Fox before Dyer), B/C off until gate G-X, sensitive-content stance | chapter 13 and 14 defaults | DG-1..DG-3 | RM-34, 37, 40, 41, 74..76 |
| OD-18 | Time programme: night stretches keep density with Story-mode skip; "about" sigma 10 or 20; night tint with Daylight toggle; bridge or wait | chapter 04 defaults; bridge permanent under Plan L | DG-2, DG-3 | RM-44, 59, 80 |
| OD-19 | Design (dark-only, Spectral, education folded in, five-destination IA after the card sort), map engine, renderer, site generator after the spikes; Classroom pilot teachers and `/teach`, `/learn` URLs; embed `frame-ancestors *` on `/embed` only, Cinematic Export and Watch Together paused | chapter 06, 08b, 09 defaults | DG-2, DG-3, R1 | RM-14, 50..58, 83, 85 |

## 11. Risk register

| # | Risk | Likelihood / impact | Trigger | Mitigation | Node |
|---|---|---|---|---|---|
| 1 | Scope 3-5x the register envelope; half-finished everywhere | certain / critical | OD-1 unanswered | plans S, L, A/F; stop rules 5.6; cut list 5.8 | RM-03 |
| 2 | Stale-code trap: bytes shipped under a reused name or before R0 | medium / critical | any deploy outside R0 | `used-names.txt` ledger; R0 drills; kill switch tested | RM-06/07 |
| 3 | Legacy patch fragility (about 119 exact-string anchors, no iOS run) | high / high | anchor count changes; device fail | asserted anchors, red-first tests, device gate at R1b | RM-09..14 |
| 4 | No named reviewer: C4 and H10 cannot be certified; Historian P4 stalls | high / high | none named at DG-2 | labelled fallback; two readers; front-loaded sprint | RM-04/42 |
| 5 | Identity-level SEO changes overlap on a 3.5-month-old domain | medium / high | trains under 4 weeks apart | one train at a time, 28-day baseline, versioned redirect map, structural signals | RM-23..30 |
| 6 | Rights and provenance exposure already live (Busey and Martin, paid-app notes, Mapbox-derived media, 18 monument rows) | medium / high | counsel or owner answers late | retro-audit first, tier gate, D-MEDIA own basemap | RM-35/36 |
| 7 | Telemetry or functions ship before the privacy correction | medium / high | RM-26 before RM-19 | hard dependency; CI network-log test | RM-19/26 |
| 8 | Bus factor is the AI tooling as much as the person | high / high | owner cannot run a runbook alone | 30-minute runbooks, delegate, ADRs, dependency budget | RM-29 |
| 9 | Perf numbers are upper bounds (no real tiles or phones); Mapbox cost, terms, no documented hard spend cap | high / high | first real-tile trace; 35k loads/month | RM-05 first; exception register; Text route; alerts 50/70/90%, poster for bots, map facade | RM-05/29/55/87 |
| 10 | Account takeover through the public Gmail as recovery identity; domain expires 2027-06-13, TLS 2026-11-10 | medium / critical | phishing; no 2FA; alert | passkeys, private recovery mailbox, delegate; renew to 2031; alerts 90/30/7 and 20/10/5 | RM-01/28 |
| 11 | The rebuild never finishes and the patches become the product | high under 30 h/week / high | capacity review at DG-3 | Plan L, permanent bridge, OD-13 amendments | RM-44 |
| 12 | Labs and stretch scope creep; honest hold makes the map look emptier (71-177 units at peak vs up to 478) | medium / medium | any P7 node started; Q-DATA-1 accepted | dispositions at DG-3, WIP 2; "inferred" styling, Method page | RM-79, 47 |
| 13 | Anniversary peak (July 1-3, 2027) meets an unfinished release; free-plan credit pause (300 credits, 15 per deploy) | medium / high | work open on 2027-06-20; plan not checked | freeze 06-25..07-05, hotfixes only; check plan this week, batch weekly, alert at 70% | all, RM-01/21 |

## 12. First 30 days, week by week (2026-10-01 to 2026-10-30)

Do not this week: change any URL form, name or title; delete stale Netlify deploys before the archive exists; make an OG image from a screenshot; write rebuild code; redeploy the downloaded "deploy" zip [S 01 s.2]. Hours per week are the 30 h/week plan; the last column says what to drop at 15 and 10 h/week.

| Week | Work | Hours | Exit gate | At 15 / 10 h/week |
|---|---|---|---|---|
| W1 Oct 1-7 | Thu 10-01 archive zips and sha256 (60 min), Mapbox token and dev token (30), Google key (20), Netlify plan and credits (15). Fri 10-02 GSC and Bing DNS TXT plus baseline (45), headed drag/wheel check and RUM block (20). Sat-Sun accounts, 2FA, multi-year renewal, delegate (60). Mon 10-05 actions 7-11 (hours, reviewer and emails, four quick calls, rights answers, name and contact, 3 h). Wed 10-07 DG-0 ratification (`RM-03`, 2 h); start `RM-02` | 14 | ledger of answers; V1 verdict; 28-day clock started | same; do only owner steps and answers |
| W2 Oct 8-14 | `RM-02`: private repo, commit the Netlify "source" tree as `legacy/dist`, prove Git-deploy byte-identity (119 of 119), `gbg-staging`, gitleaks, second remote, ADR files; `RM-05` start: CDP Referer injection | 30 | byte-identity proof; harness reproduces 64 / 85 | 15 h: RM-02 only; 10 h: RM-02 half |
| W3 Oct 15-21 | `RM-05` finish (real-tile baseline of record); `RM-06` merged patch runner with asserted anchors on md5 `7ef75b95`, new `sw.js` and kill switch; `RM-19` interim privacy and `RM-20` forwarder drafted | 30 | runner passes on the frozen bundle; no reused name | 15 h: RM-05; 10 h: repo finish |
| W4 Oct 22-28 | `RM-06` boot loader, hashed entry and both lazy chunks, animations off, intro deleted; `RM-07` drills (fresh profile, seeded old-SW upgrade, kill, rename); staging soak 48 h | 30 | X1-X3 green on staging; Lighthouse >= 85 with real tiles | 15 h: runner only; 10 h: nothing new |
| W5 Oct 29-30 | D30: GSC baseline archived (Oct 30), keyword map re-score (`RM-49`), four-week capacity review, decision on the R0 ship date (Tue Nov 10 at 30 h/week) | 8 | plan re-baselined from measured burn | re-plan R0 to Dec 15 (15 h) or Jan 19 (10 h) |

The R0 kit is `RM-01, 02, 03, 05, 06, 07`: 14-24 net days on the survival fractions. At 30 h/week the 30 days deliver the low end of the kit (about 14 net days); the R0 ship lands about 2026-11-10.

## 13. Decision conflicts and reconciliations (nothing overridden silently)

1. **Capacity and dates vs the register.** Register Tier-1 envelope 145-210 d and dates R0 10-21, R1 11-05, S3 01-26, cutover 05-15 vs a WBS of 553-939 d for F and 173-302 d for L. DG dates remain decision dates; delivery dates follow section 5.1. Chapter 03's plans A, B, C (35, 15-34, under 15 h/week) assumed 71-115 d of rebuild only: with the full scope, Plan A needs 35 h/week and a second contributor; at 15-30 h/week plan L holds and cutover is not before 2029 at 30 h/week (section 5.5).
2. **R0 date.** 2026-10-21 holds at none of the three capacities (section 5.1); recommended R0 ship 2026-11-10 (30 h), 2026-12-15 (15 h), 2027-01-19 (10 h).
3. **QA effort.** Register QA 10-14 d vs chapter 12's 50-77 d: the 7-day one-week net (`RM-07/08`) is non-negotiable; the remaining suites follow tier and capacity.
4. **Where nightly suites run.** Chapter 12 (staging plus weekly production) vs chapters 05 and 07 (nightly on production): adopt chapter 12, because each fresh load on production is a page view at about 113 views/day and pollutes RUM.
5. **Operations ceiling.** Chapters sum to 12.3 h/month vs 10: fitted to 9.2 h in section 8.1 by digest automation, drill cadence and batching.
6. **Accessibility grade after the bridge.** Chapter 02 says C+; chapter 07 says C; this chapter uses C.
7. **Home title.** D-NAME says "The Battle in Five-Minute Steps"; after the time-warp the step is 0.83-42.3 minutes (chapter 11 DC-1): use "Gettysburg Interactive Map: The Battle, July 1-3, 1863" in S2 unless the owner overrides at DG-0.
8. **R1 trains.** Chapter 02 ships R1 as three trains (45 credits) with an optional R1d on 2026-11-24; the register lists one. Three trains at 30 h/week; two trains (A plus C, then B plus deep links, headers, copy) below that.
9. **Clock bridge.** D-SOURCE item 4 builds the bridge only if cutover is more than 3 months after sign-off; chapter 04 finds 104 days and plans the bridge. Under Plan L there is no cutover, so `RM-44` is in the L path and is permanent.
10. **Register A-line vs grade A.** The register's A-line (Tranche 0, R0/R1, landing, Historian P1) is my path L (173-302 d, because chapters add data identity, time, rights, legal, trust, operations and continuity that the critics rated high). Grade A in function, UX, fit and accessibility needs the rebuild (patch-forever ceiling B / B+ [S 03]).
11. **Legacy closed list vs high defects.** H5, H6, H12, H13, D1, D4 stay open on the frozen app; OD-13 proposes three small amendments.
12. **`/map` is noindex** (D-ROOT) yet is scored by Lighthouse: score SEO on indexable URLs only [S 10 s.9.1, 12 X5].
13. **Reviewer hours.** Chapters 04, 13 and 14 add to 155-226 h vs a 3-4 h/week charter (39-75 weeks): two readers, a front-loaded 5-6 h/week sprint, or the labelled fallback.
14. **Chapter calendars (review 3).** Chapters 10, 11, 12 and 14 quote the register's train and gate dates (S1 11-03..05, S2 12-01, S3 2027-01-12, P2 live before 2027-06-25, R2 mid-December 2026). Each now carries a calendar rule saying section 5.1 of this chapter governs delivery; the register dates remain decision dates and floors only. Nothing in those chapters may be quoted to the owner as a promise.
15. **Shared strings and pages counted once (review 3).** The ledger of section 2 does not name these overlaps, so the node estimates may still carry them twice; re-check each when its node is re-costed. RM-14 must count WP-CONTENT-01 and WP-HIST-01 (Historian `undefined` fix, `historian.html` code) as one change owned by WP-HIST-01 with the strings in WP-CONTENT-01/02; RM-25 counts WP-SEO-08 and WP-CONTENT-07 (S2 names, titles, descriptions) once; RM-83 counts WP-SEO-24 and WP-CONTENT-22/23 once with URLs `/teach` (teachers) and `/learn` (students); RM-76 counts WP-SEO-23 and WP-HIST-26 once; RM-32/RM-38 count WP-DATA-09/17 and WP-CONTENT-03 once; RM-23/24 count WP-SEO-05 with WP-INFRA-10/11/12 once.
16. **Unit-count wording (review 3).** 465 regiments + 104 batteries = 569 units (467 + 103 = 570 records) replaces 466 + 103 in chapters 10, 11 and 14 (chapter 13 s.2.1 and chapter 16 row 13); chapter 08a `unit_counts` must follow.
17. **Interim OG card and manifest timing (review 3).** RM-15 (R1a) ships the interim OG image and manifest cleanup; RM-24 (S1) ships tag parity. Chapter 10 OD-SEO-3 is closed accordingly and its card name is chapter 02's `/og/card-r1.png`.

## 14. Traceability and coverage

- **Work packages.** 447 of 447 chapter WPs appear in a node's source list (script-checked [V]); the JSON carries them per node. **Findings.** The 852 findings are traced through the chapters; UNVERIFIABLE and NOT_VERIFIED are in section 9, REFUTED dropped.
- **Criticals to owners.** C1, C2 -> RM-10 (root cause RM-09); C3 -> RM-11, then RM-44/59; C4 -> RM-43, 44, 45 and the reviewer (RM-42); C5 -> RM-09; C6 -> RM-06; C7 -> RM-14, 22, 77; C8 -> RM-13, 14. New criticals (pointer capture, sound freeze, deep links, XSS, `undefined`) -> RM-09, 12, 14. High and other ids are in `audit_ids` per node.
- **Critic gaps to nodes.** Capacity -> RM-03, sections 0 and 5; contradictions -> register, section 13; browser floor, GPU, in-app, translate, keyboard layouts -> RM-52, 55, 57, 85; schools -> RM-85; backup and vendors -> RM-29, 8.1; operations -> RM-28, section 8; legal and rights -> RM-35, 36; contact -> RM-20; derived media -> RM-15; reviewer -> RM-04, 42; independent evidence -> RM-89; citations -> RM-39; SEO change management -> RM-23..30; soak -> RM-72.
- **Definition of green and the map ceiling.** Section 7 and `RM-05`, `RM-87`.
