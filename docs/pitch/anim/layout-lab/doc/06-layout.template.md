# 06. Collision-free layout: unit tiles that never obscure each other

Prepared 2026-10-05 for the owner's animation pitch (design research and prototype job; **no product code, data or tests were changed**). Author: agent `layout` (files: this page, `data/layout-results.json`, `data/layout-per-tick.json`, `data/layout-tile-spec.json`, and the reproducible lab `layout-lab/`, whose README lists every command). This page is generated from `layout-lab/doc/06-layout.template.md` and the result files by `layout-lab/build-doc.mjs`: no number in it is typed by hand.

The task: *the tiles must never obscure each other and never hide vital information.* This page defines both terms exactly, prototypes the four layout strategies the owner's brief names (a: semantic zoom and aggregation along the order of battle, b: constrained displacement with leader lines and temporal coherence, c: fan-out of co-located units into fixed slots, d: progressive disclosure), measures them on the **real** placements across **all 675 ticks and zooms 11 to 17**, and proposes one algorithm with a **provable** zero-overlap guarantee, shown in the three densest hotspots and confirmed in a real browser.

---

## 0. Verdict (answer first)

1. **It can be guaranteed, and the guarantee holds on every frame measured.** The proposed *certified layout* never emits a frame it has not checked: every tile is placed by an exact minimum-displacement search, a tile that cannot be placed within its displacement budget is **merged into an aggregate tile** (nothing is dropped), and an exact all-pairs check across the whole field decides when the solve is finished. On all 675 ticks at zoom 11 to 17 ({{v e1meta.hybridSolvesRuleA|i}} cold solves under visibility rule A, the worst case; {{v e1meta.hybridSolves|i}} over all three rules) the independent verifier counted **{{v e1agg.A.hybridOverlapsMax|i}} overlapping pairs, {{v e1agg.A.hybridClearanceMax|i}} clearance violations and {{v e1agg.A.hybridDroppedMax|i}} hidden units** (the shipped canvas draws a median of **{{v e1.rules.A.14.legacy.overlapsTotal.p50|i}}** overlapping pairs per tick at zoom 14, {{v e1.rules.A.14.legacy.overlapsTotal.max|i}} at worst). In the {{v e2meta.hybridRuns|i}} hybrid playback runs at 60 fps ({{v e2meta.hybridFrames|i}} frames, three hotspots, zoom 13-15, 1x to 16x) the verifier found {{v e2meta.hybridOverlapPairs|i}} overlapping pairs and {{v e2meta.hybridUnrepresented|i}} unrepresented units across all of those frames ({{v e2meta.hybridFramesWithOverlap|i}} frames with an overlap).
2. **The four strategies are not alternatives, they are stages, and each alone fails** (section 3). Disclosure alone leaves up to {{v e1.rules.A.11.strategies.disclose.overlaps.max|i}} overlapping pairs; displacement alone leaves a typical {{v e1.rules.A.13.strategies.displace.dropped.p50|i}} of {{v e1.rules.A.13.strategies.displace.visible.p50|i}} units without a tile at zoom 13; fan-out alone fails the same way; aggregation alone is safe but throws away detail and distorts position. The hybrid uses disclosure for labels, displacement for positions, fan-out for the expanded list and aggregation as the guaranteed fallback.
3. **The visibility rule matters more than any layout.** The shipped carry-forward rule (A) puts a typical {{v data.visibleUnits.A.median|i}} and at most {{v data.visibleUnits.A.max|i}} tiles on the map; at zoom 13 the certified layout puts {{v e1.rules.A.13.strategies.hybrid.unitsInAggs.p50|i}} of {{v e1.rules.A.13.strategies.hybrid.visible.p50|i}} units inside aggregates on a typical tick. Under the latest-snapshot rule (B) a typical tick has {{v data.visibleUnits.B.median|i}} tiles (at most {{v data.visibleUnits.B.max|i}}) and almost nothing needs to be aggregated. The layout algorithm is correct under either; the owner's choice of rule decides how much of the picture is individual tiles.
4. **Displacement is bounded and honest, or it can be switched off.** Default budget 48 px: a displaced tile keeps a pin on its true position and a leader line, never covers any tile's true position, and moves at most {{v e1.rules.A.14.strategies.hybrid.maxDispPx.max|i}} px (= {{v e1.rules.A.14.strategies.hybrid.maxDispPx.max * 3.669|i}} m at zoom 14, {{v e1.rules.A.17.strategies.hybrid.maxDispPx.max * 0.459|i}} m at zoom 17). With the budget at 0 the same algorithm is pure aggregation and fan-out (section 10), the stance of the sibling data page (`03-data-fuel.md` section 9.6).
5. **Jitter.** Averaged over nine hotspot-and-zoom windows at 4x speed the shipped renderer makes {{v e2by.4x.legacyShipped.popsPerSec|i}} position pops per second (a glyph moving more than 3 px beyond its true position's motion in one frame), a p99 jerk of {{v e2by.4x.legacyShipped.jerkP99|d1}} px/frame^2, and every one of its frames overlaps (about {{v e2by.4x.legacyShipped.overlapPairsPerFrame|i}} pairs). The certified layout makes {{v e2by.4x.hybrid.popsPerSec|i}} pops per second with p99 jerk {{v e2by.4x.hybrid.jerkP99|d2}} (at 1x: {{v e2by.1x.hybrid.popsPerSec|d1}} pops/s against {{v e2by.1x.legacyShipped.popsPerSec|i}}, p99 jerk {{v e2by.1x.hybrid.jerkP99|d3}} against {{v e2by.1x.legacyShipped.jerkP99|d1}}). That is a large reduction, **not a fix**: at 16x (32 ticks per second) {{v e2by.16x.hybrid.popsPerSec|i}} pops per second remain. What remains are structural pushes (a tile appears and pushes a lower-priority neighbour); five smoothing and stability ideas were tried and **none removed them** (section 6.3), so that part is an open item, not a claim.
6. **Cost.** Time per solve on the densest tick (478 units): cold (a seek or a zoom jump) {{v e5.cold.13.hybrid.p50|d1}} ms median at zoom 13 and {{v e5.cold.12.hybrid.p95|d1}} ms p95 at zoom 12; warm (per frame during playback) {{v e5.warm.13.1x.ms.mean|d1}} ms mean and {{v e5.warm.13.1x.ms.p99|d1}} ms p99 at zoom 13, {{v e5.warm.14.1x.ms.mean|d1}} ms mean and {{v e5.warm.14.1x.ms.p99|d1}} ms p99 at zoom 14 (node, one thread, on a machine shared with other jobs; section 5.3). A cold solve is about six frames long at zoom 12-13 and the warm p99 at zoom 14 leaves little of a 16.7 ms frame for drawing: run the solver in a worker and hide a cold solve behind a transition.
7. **Two real bugs were found by the independent verifier while building this** (a spatial-hash stamp collision and a missing cross-group check, appendix B). Each produced one to two overlapping pairs in the frames where it struck, and both are now covered by tests. That is the argument for shipping the verifier with the layout: the guarantee is worth exactly as much as the check that certifies it.

---

## 1. Definitions

### 1.1 Vital information (the list)

A tile is a **chip** (the vital core, a fixed-size rounded box) plus an optional **name label** and, when displaced, a **pin** on the true position. **Vital information of a tile, always fully visible, never overlapped, never omitted:**

| # | Vital item | Where it lives | Source of the datum | Evidence label |
|---|---|---|---|---|
| V1 | **Short name** (at most 9 characters, e.g. `19 IN`, `I/1/1`) | inside the chip | order-of-battle id (the unit's code) | Documented (code derived from the id) |
| V2 | **Side** (Union or Confederate; half and half for a "Contact" aggregate) | chip hue and frame | the order of battle, **not the id prefix**: 10 placed ids carry the wrong prefix (section 2.4) | Documented |
| V3 | **Arm** (infantry, cavalry, artillery; a mixed mark for an aggregate) | glyph inside the chip | registry `arm` / id | Documented |
| V4 | **Representation** (a count badge `x n` or `+k` on an aggregate: how many placement records it stands for) | badge inside the chip | the layout | Computed (a count of records, never of men) |
| V5 | **Strength state** (current strength over reference strength) | bar inside the chip | placement `strength` over the larger of the unit's keyframes and the registry strength | Modelled (per-tick strength is not a casualty record, `03-data-fuel.md` fact 5) |
| V6 | **Selection** | ring, its 2 px reserved in every chip footprint so selecting never changes a footprint | the user | Computed |
| V7 | **True position** | the chip itself when it is not displaced, otherwise a 4 px **pin** on the true coordinate | placements | Modelled (hand-authored positions, `03-data-fuel.md` fact 1) |

**Secondary detail, allowed to collapse (and the first thing to go when space runs out):** the name label (designation), posture mark, facing arrow, engaged ring, numeric strength, corps badge, gun pips, the member hull of an aggregate, the leader line.

### 1.2 "Obscure" (the exact rule)

Two items **obscure** each other at a frame when they belong to **different tiles**, both are **solid** (render opacity at least 0.5), and their rectangles have a Euclidean clearance below zero (their interiors intersect). Items are chips, name labels and pins. Pin against pin is exempt (two units can stand on one coordinate: that is data, and the pins stay readable). A leader line is drawn beneath every chip and label, so it never obscures anything; leader crossings are counted as a tidiness measure, not a violation. **Design clearance:** the solver keeps at least 2 px between any two items so anti-aliasing and 1 px strokes never touch; the verifier reports clearance violations separately and requires zero overlaps.

In addition a **true position must not be covered**: no chip or label may cover the pin box of another tile (a displaced tile whose pin sits under somebody's chip would lie about where the unit is). The solver reserves every tile's true position for everybody else.

**"At every frame, including during motion"** means every rendered frame of a 60 fps playback and every cold solve after a seek or zoom jump, not only the frames at integer ticks. The measurements below verify every one of {{v e2meta.hybridFrames|i}} hybrid playback frames ({{v e2meta.frames|i}} across all variants) and {{v e1meta.hybridSolves|i}} hybrid cold solves ({{v e1meta.solves|i}} across the seven strategies).

**Where "solid" matters.** A tile that is fading in or out (opacity below 0.5) is not an obstacle and not obscured. The lab renders no fades, so everything it measures is steady geometry; the transition rule it implies for the motion layer is in section 6.4.

### 1.3 The tile spec (one place for every number)

All footprint numbers live in `layout-lab/lib/spec.mjs` and are exported to `data/layout-tile-spec.json`: **standard** chip 20 px tall (13 px body, 3 px strength bar, a 2 px selection ring on each side), width = 2 x 5 px padding + 14 px glyph + 3 px gap + measured text width of the short name + 2 x 2 px ring, 36 px minimum (aggregates add the badge); name label 14 px tall at 12 px type; minimum clearance 2 px; pin box 4 px; displacement budget 48 px. **compact** is a 16 px chip with a 40 px budget. **Text widths are measured in real Chrome** (`measure-text.mjs`: glyph advances of the two tile fonts at their real sizes, validated against `measureText` of all {{v textCheck.code.strings|i}} real short codes and labels: worst error {{v textCheck.code.worstRelErr|p1}} and {{v textCheck.label.worstRelErr|p1}}, so a 4 % safety factor is applied). Other platforms render other fonts: the product must measure at run time and the guarantee then holds for the measured box (section 12).

### 1.4 Claims a displaced or aggregated tile makes (and does not make)

| What the viewer sees | What it claims | Label |
|---|---|---|
| a chip on its true position | the unit's authored keyframe position | Modelled |
| a displaced chip + pin + leader | "the unit is at the pin; the chip is parked up to 48 px away so it can be read" | Computed display offset of a Modelled position |
| an aggregate chip `I/1/1 x5` | "5 placement records of the I/1/1 formation are here" (the formation's visible members, not necessarily all its regiments) | Documented formation, Computed count |
| an aggregate chip `Lead +8` | "9 records from several corps, led by the highest-echelon, largest member" | Computed |
| the centre of an aggregate | the strength-weighted centroid of its members; their true positions are drawn as dots and the spread is reported | Computed |
| a `Contact x n` chip (both sides) | "n records of both sides within one tile footprint"; the per-side counts are in the badge text | Computed |

---

## 2. The problem on the real data

### 2.1 Which tiles are on the map (and an independent reproduction)

The lab loads the 47 placement and density files in the app's own load order (1,804 rows; {{v data.uniqueUnitTickKeys|i}} unique (unit, tick) keys; {{v data.units|i}} placed ids; {{v data.repeatedRows|i}} repeated rows of which {{v data.repeatedRowsThatDiffer|i}} differ in position, strength or posture) and applies one of three visibility rules defined by the sibling data page (`03-data-fuel.md` section 9.1):

{{table visibility}}

**Cross-check.** The tile counts above equal the sibling page's (A: 478 at tick 620, typical 384; B: 85 at tick 120, typical 7; C: 98 at tick 72, typical 44) and the number of tiles sharing an identical lat/lng with another reproduces exactly under the hold position model that page uses (rule A: at most {{v data.stacks.A.max|i}} at tick {{v data.stacks.A.atTick|i}}, typical {{v data.stacks.A.median|i}}, largest stack {{v data.stacks.A.largestStack|i}}; rule B: at most {{v data.stacks.B.max|i}}, typical {{v data.stacks.B.median|i}}, largest stack {{v data.stacks.B.largestStack|i}}; computed in `merge.mjs`). The sibling page's own numbers are 125 / 96 / 4 and 8 / 0 / 2: two independent implementations agree.

### 2.2 What production draws today, and proof that the port is faithful

`lib/legacy.mjs` is a source-level port of the shipped canvas renderer (`lS` in `baseline/dist/assets/index-Cg8FAMXN.js`: glyph width strength/4 clamped to 10-120 px, rotated by bearing, 8 relaxation passes, 12 px vertical threshold, black label pills). To check it, the real app (R1c build, real Chrome) was opened at three scenes by deep link and a canvas-2D hook recorded every glyph the app drew; the port predicted the same scene from the placement files:

{{table validate}}

The port reproduces the app's glyph positions to a fraction of a pixel for almost every glyph (the outliers, one glyph of 223 and twelve of 405, are not diagnosed; the relaxation depends on the order of the units, which the port reproduces from the load order). The overlap counts below use the port's geometry (glyph polygons by separating-axis test, label pills from measured text widths scaled to the canvas font size; the pill width model is **not** validated against the app's `measureText`).

### 2.3 How big the problem is: shipped renderer and the new tiles at true positions (rule A)

{{table problem:A}}

*Reading it.* The shipped canvas overlaps thousands of pairs at every zoom up to 14 and still hundreds at zoom 16-17; its relaxation moves glyphs up to **{{v e1.rules.A.14.legacy.maxDispPx.max|i}} px at zoom 14** (= {{v e1.rules.A.14.legacy.maxDispPx.max * 3.669|i}} m) and recomputes from array order every frame. The new, smaller tiles at true positions are not a fix: even at **zoom 17** (0.46 m/px) a typical tick still has {{v e1.rules.A.17.strategies.raw.overlapsChipChip.p50|i}} overlapping chip pairs, because up to {{v data.stacks.A.max|i}} tiles stand on a coordinate shared with another tile (typical {{v data.stacks.A.median|i}}) and, by the sibling page's count, 22 % of the tiles are within 25 m of a neighbour. **No zoom level solves it**; stacks need displacement, fan-out or aggregation at every zoom.

![overlapping pairs by zoom](layout-lab/out/figs/chart-overlaps.png)

### 2.4 Data defects that touch layout

- **Side from the id prefix is wrong for 10 placed ids** (the renderer uses `unit_id.startsWith("U-")`). The lab computes the side from the order of battle where it can and, for ids it cannot resolve, from the state suffix **only when that suffix occurs only on the other side in the registry**; it flags the 10 it changed (the same 10 as the sibling page, ticks 95 and 150):

{{table sideflags}}

  An aggregate that counted such a unit into a Union cluster would show the wrong side count (vital item V2). Fix the data or the renderer before aggregating.
- **Parents.** {{v data.parentSource.oob|i}} of {{v data.units|i}} ids resolve through the order of battle, {{v data.parentSource.idpattern|i}} only through a documented id pattern (labelled as inferred), {{v data.parentSource.none|i}} have no parent and attach to their army as "unassigned". Aggregation along the order of battle is therefore exact for 80 % of the ids and heuristic or flat for the rest.
- **Repeated rows.** {{v data.repeatedRows|i}} rows repeat an already stated (unit, tick) key and {{v data.repeatedRowsThatDiffer|i}} of those disagree; the app (and the lab) keep the row that loads last, so which position shows depends on file load order.
- **Brigade and its regiments on one coordinate.** A brigade record and its own regiments are often placed on the same point (tick 1: `U-I-1-1` and `U-2WI`), so a record and its descendants overlap by construction; aggregation (a brigade tile standing for its regiments) is the honest representation, not displacement.

---

## 3. Four strategies, prototyped and measured

All strategies sit behind one interface (`lib/strategies.mjs`), draw the **same chips**, are verified by the **same independent verifier** (`lib/geom.mjs`, shares no code with any solver) and are measured on the same frames: every tick 1-675 × zoom 11-17 × visibility rules A, B, C, cold start per tick, positions interpolated smoothly between a unit's keyframes (owner decision 5). "Hidden" = a unit on the field that is neither drawn nor counted in an aggregate. Rule A below; B and C in section 5.2.

{{table strategiesA}}

*(overlap pairs on the worst tick / units hidden, typical tick and worst tick in brackets / largest displacement in px)*

### 3.1 (a) Semantic zoom and aggregation along the order of battle

**Algorithm.** Start from one tile per unit. A tile that overlaps another (chip against chip, or a chip covering a foreign true position) is merged with the best partner within reach: the partner with the **deepest common ancestor** in the order of battle, then the nearest; the result is an aggregate tile at the strength-weighted centroid (at the formation's own record when that record is one of the members) named after the common ancestor, with a count badge and an expandable list. Repeat to a fixed point. Two flavours: *data-driven* (merge exactly when tiles would overlap) and *semantic-zoom tiers* (also merge by zoom: corps below z11.6, divisions to z12.6, brigades to z14, regiments above).

**Result.** Zero overlaps and zero hidden units by construction at every zoom, and the cheapest solve. The price is detail and position: at zoom 13, {{v e1.rules.A.13.strategies.aggregate.unitsInAggs.p50|i}} of {{v e1.rules.A.13.strategies.aggregate.visible.p50|i}} units sit inside aggregates (typical tick) and a single aggregate tile can stand for units up to {{v e1.rules.A.13.strategies.aggregate.maxAggSpreadPx.max|i}} px ({{v e1.rules.A.13.strategies.aggregate.maxAggSpreadPx.max * 7.339|i}} m) apart. The tier flavour was meant to be calmer in time (a tile should change only when the zoom crosses a threshold) but, as implemented, it is not: {{v e2by.4x.aggregateTier.tileChurnPerSec|i}} churn events per second against {{v e2by.4x.aggregate.tileChurnPerSec|i}} for the data-driven flavour at 4x, and it gains nothing in detail: both flavours end within a few tiles of each other ({{v e1.rules.A.13.strategies.aggregate.tiles.p50|i}} and {{v e1.rules.A.13.strategies.aggregateTier.tiles.p50|i}} tiles at zoom 13) because the forced merges dominate.

**Failure cases.** Units from several corps piled on one hill (Cemetery Hill) merge across corps: the common ancestor is the army, so the name falls back to `Lead +k` (section 4.6) and the count is the only honest statement; two opposing units on one coordinate become a `Contact` tile. Unassigned ids (66) can only merge with whatever is nearest.

### 3.2 (b) Constrained displacement with leader lines and temporal coherence

**Algorithm.** Tiles are placed in priority order (selected, then larger formations, then larger strength, then id: fully static, so the order never reshuffles). Each chip goes to the **exact nearest free position** to where it would like to be (its true position, or where it was last frame minus a small relaxation toward the true position), inside a displacement budget of 48 px, **never covering any tile's true position**; a displaced chip gets a pin and a leader line. Section 4.2 gives the search and its proof of optimality.

**Result.** Zero overlaps among the tiles it places, but it cannot place them all: at zoom 13 a typical tick has {{v e1.rules.A.13.strategies.displace.dropped.p50|i}} of {{v e1.rules.A.13.strategies.displace.visible.p50|i}} units without a tile, at zoom 14 {{v e1.rules.A.14.strategies.displace.dropped.p50|i}}, and even at zoom 17 up to {{v e1.rules.A.17.strategies.displace.dropped.max|i}} (the stacks). Displacement alone *violates the never-hide rule* wherever the field is crowded; and it has no answer at all for 60 tiles on one coordinate (stress table, section 9).

### 3.3 (c) Fan-out of co-located units into a fixed-slot roster

**Algorithm.** Tiles whose chips overlap form a cluster; a cluster becomes a **roster block**: its members in order-of-battle order in fixed grid slots, the block placed (as one rigid macro tile) by the same exact search with a larger budget (96 px), every member keeping a pin and leader to its true position, no member's pin covered.

**Result.** The slots are tidy and stable, and for small clusters it is the best presentation (it is what the expandable list in section 4.7 uses). As a *whole-field* strategy it fails exactly like (b): at zoom 13 a typical tick leaves {{v e1.rules.A.13.strategies.fanout.dropped.p50|i}} units unplaced because the blocks are bigger than the clusters, blocks move up to {{v e1.rules.A.13.strategies.fanout.maxDispPx.max|i}} px, and leader crossings reach {{v e1.rules.A.14.strategies.fanout.leaderCrossings.max|i}} per frame.

### 3.4 (d) Progressive disclosure

**Algorithm.** The chip (the vital core) is always drawn at the true position; the name label is added only where the free-space test passes (right, left, below, above), with a delay before it may appear and immediate removal when it stops fitting.

**Result.** Labels collapse gracefully ({{v e1.rules.A.13.strategies.disclose.labelFrac.mean|p0}} of leaf tiles keep a label at zoom 13, {{v e1.rules.A.15.strategies.disclose.labelFrac.mean|p0}} at zoom 15) but it moves nothing, so the **chips themselves still overlap**: up to {{v e1.rules.A.14.strategies.disclose.overlaps.max|i}} pairs at zoom 14 and {{v e1.rules.A.17.strategies.disclose.overlaps.max|i}} at zoom 17. Disclosure is necessary (it is how secondary detail leaves) and insufficient.

![the strategies side by side, H1 at zoom 14](layout-lab/out/figs/compare-H1-z14.png)

*(shipped canvas, true positions, (d), (b), (a), (c), certified hybrid; magenta = overlapping items)*

---

## 4. The recommended algorithm: certified layout

One solver, one verifier, one tile spec; the four strategies are **stages of the same pipeline**, not separate pipelines (no second code path to drift out of sync with the first).

### 4.1 Pipeline (one frame)

1. **Footprints** from the tile spec and measured text.
2. **Seed.** Last frame's aggregates are re-created (*sticky aggregates*); optionally a zoom-keyed tier pre-merges by echelon.
3. **Groups.** Tiles that could interact (anchors closer than 2 x budget + chip sizes) are grouped; groups are solved independently.
4. **Place** the tiles of a group in priority order, each by the exact nearest-free search (4.2). A tile starts from where it was last frame (inertia), relaxing 2 px/frame toward its true position; older tiles are placed first (seniority) so a newcomer yields instead of pushing.
5. **On failure, aggregate.** A tile that cannot be placed within the budget is merged with its best partner (deepest common ancestor, then nearest); a failed member of an aggregate that was being split goes back into it. Repeat until every tile of the group is placed.
6. **Certify across groups.** An aggregate's centroid can move into another group's reach, so the union of all placements is checked **exactly** (every chip against every other chip and every foreign true position); conflicting groups are merged and re-solved. The loop ends only when the check passes.
7. **Labels** (best effort, in the free space left, with show delay and slot memory).
8. **Emit** chips, labels, pins and leaders. The independent verifier (tests, lab, optional runtime assertion) re-checks the emitted frame.

**Splitting aggregates is deliberately lazy.** Merges are immediate; a split is only *tried* after the aggregate has existed for at least 30 frames (staggered with a per-aggregate offset, at most 2 trials per frame), with a smaller budget (48 minus a 12 px hysteresis band); if any member fails the whole group snaps back and the clock restarts. "Merge now, split later" is what removes the flicker (section 6).

### 4.2 The core primitive: exact nearest-free placement

For a tile with one rectangle part p and an obstacle rectangle o, the tile centres that violate the clearance g form the **open rectangle** (o.x0 - g - p.x1, o.x1 + g - p.x0) x (o.y0 - g - p.y1, o.y1 + g - p.y0). The feasible region is the plane minus the union of these open rectangles. The point of that region nearest to a desired centre P0 is either P0 or lies on an edge of one of the rectangles, so its x is one of {P0.x} U {x0, x1 of every rectangle} and its y one of {P0.y} U {y0, y1}. The search enumerates those candidates in order of increasing distance (branch and bound) and returns the first feasible one inside the budget disk. **Verified:** on {{v selftest.metrics.optimalityScenes|i}} random scenes the result is feasible and equal to a 0.5 px brute-force scan of the disk (worst excess {{v selftest.metrics.optimalityExcess|d2}} px). A neighbourhood with more than 60 relevant obstacles is declared saturated and fails at once (a conservative failure: it can cause an unnecessary merge, never an overlap; section 10 measures the effect).

### 4.3 The guarantee

**Statement.** The frame the algorithm emits has (i) no two chips with an axis gap below the clearance, (ii) no chip covering another tile's true position, (iii) no label overlapping a chip, a pin or another label, and (iv) every unit on the field represented by exactly one tile (as itself or inside an aggregate).

**Proof.**
- *Within a group (i, ii).* Tiles are placed one after another; each is accepted only at a candidate that the exact test found feasible against **every previously placed chip and every true position of the group**. After the last tile, every pair has therefore been checked once, by the test that characterises feasibility.
- *A group solve terminates.* If any tile fails, at least one pair of tiles is merged (a failed tile always has a partner: the nearest tile of its group is the fallback), so the number of tiles in the group strictly decreases; a group of one tile has no obstacle inside it and sits on its true position. After at most n - 1 rounds every tile is placed.
- *Across groups (i, ii).* After all groups are solved the union of the placements is checked exactly. If a conflict exists the conflicting groups are merged and re-solved; the number of groups strictly decreases, so the loop ends, and it ends only when the exact check finds no conflict. Together with the previous two points every pair of tiles in the field has been checked.
- *Labels (iii).* A label is accepted only after the free-space test against all chips, displaced pins and earlier labels.
- *Representation (iv).* Merging only unions the id sets of tiles; nothing is ever removed.
- *Time.* The last two loops are the only unbounded ones; each strictly shrinks a finite set, so the algorithm always terminates, with **at worst a single aggregate per connected group** (which has no neighbour inside the group).

**What the proof does not cover:** (1) *rectangles, not pixels* (the boxes are the guarantee; glyph pixels inside a box are the visual designer's job); (2) *the text width* (the chip is as wide as the measured text; wider fonts need run-time measurement); (3) *quality* (the algorithm is greedy, not optimal; section 10 quantifies the dials); (4) *time* (worst-case cost grows with the crowd; measured, not bounded, section 5.3); (5) *continuity* (hysteresis is measured, not proven; section 6); (6) *transitions* (fading tiles are exempt by the opacity rule, which is a design contract, section 6.4).

**What backs the proof.** `selftest.mjs`: the verifier equals a brute force on {{v selftest.metrics.randomRectSets|i}} random rectangle sets; the nearest-free search equals a brute force on {{v selftest.metrics.optimalityScenes|i}} scenes; the guarantee holds on {{v selftest.metrics.adversarialScenes|i}} adversarial scenes and on {{v selftest.metrics.dialSolves|i}} solves with random dial settings (budget 0-96, tiers, seniority, escalation, inertia and stickiness on and off); a negative control (displacement only, 60 identical anchors) fails as it should; three mutation tests show the verifier catches a chip dragged onto a chip, a label onto a chip and a pin under a chip:

{{table selftest}}

### 4.4 Policy dials (the system is meant to be tuned and extended)

| dial | default | what it trades | measured in |
|---|---|---|---|
| `dMax` displacement budget | 48 px (standard), 40 (compact) | detail against how far a chip may sit from its true position | 10 |
| `band` split hysteresis | 12 px | flicker against how soon an aggregate opens | 6 |
| `splitDwell` | 30 frames | the same | 6 |
| `relax` | 2 px per frame | how quickly a displaced chip returns | 6 |
| `seniority` | on | pushes by newcomers | 6 |
| `labelShowDelay` | 12 frames | label flicker | 6 |
| `kCap` | 60 | solve time against unnecessary merges | 10 |
| `pinProtect` | on | cost of keeping every true position uncovered | 10 |
| `tier` | off (unstable in time as built) | semantic zoom by echelon | 6.3, 10 |
| `dMax2` escalation | off (raises pops and jerk) | fewer cross-corps merges against longer leaders | 6.3, 10 |
| visibility rule | A (shipped) | the number of tiles at all | 5.2 |
| footprint | standard | the number of aggregates | 10 |

New strategies, naming policies, priority functions and tile variants plug in by adding a function to `STRATEGIES` / `SPECS` and are measured by re-running `selftest.mjs`, `measure.mjs e1` and `e2` unchanged.

### 4.5 Labels and progressive disclosure

The chip carries every vital item, so a label that does not fit is **dropped, never forced**: placement tries right, left, below, above; a label may appear only after fitting for 12 consecutive frames and keeps its slot until it stops fitting. Labels are placed after all chips, so a secondary label can never push a vital chip. At zoom below 12 labels are off (as in the shipped renderer's first tier).

### 4.6 Naming an aggregate

If its members share a formation (brigade, battalion, division, corps) the chip shows that formation's short code and `x n`; if they come from several corps it shows its lead member (highest echelon, then strength) and `+k`; if both sides are present it shows `Contact` and `x n`. The share of aggregate units that carry a formation name is a quality measure reported in section 10 (**formation share**).

### 4.7 The expandable list

Opening an aggregate replaces it with a fixed-slot roster (the members in order-of-battle order, one slot each, a header, at most 24 slots then "+k more"), placed by the same exact search among every other chip, label and true position; each member keeps a pin and leader. The expansion is **certified like everything else**: it is applied only if the exact check of the whole frame passes, otherwise the list opens in a dock and the map is left exactly as it was.

**Measured.** At the three hotspots, zoom 14, 15 and 16, visibility rules A and C, a 1440 x 900 viewport, every aggregate in view was opened one at a time: of {{v figures.expansion.total|i}} aggregates, **{{v figures.expansion.ok|i}} ({{v figures.expansion.share|p0}}) opened in place** and the rest fell back to the dock, either because no free place exists within 200 px or because a member's true position lies under another tile (inside an aggregate the members' positions are not reserved, so another chip may cover one). So the **dock is the default presentation of the expandable list**, and the in-place roster an opportunistic, certified mode that works mostly from zoom 15. An engine-level "open" state that re-solves the neighbours (they would aggregate to make room) would raise the in-place share; it is not built.

![an aggregate opened into its roster, H1](layout-lab/out/figs/expand-H1-z14.png)

### 4.8 Complexity

Per frame: grouping O(n); placement O(sum over groups of g x K^2) with K bounded by `kCap` (60) and g the group size; aggregation rounds at most g - 1 per group; the placement passes actually run are in the last row of the table in section 5.1; certification O(n x neighbours). The lab's measured costs are in 5.3.

---

## 5. Results of the certified layout

### 5.1 All ticks, all zooms (visibility rule A, the worst case)

{{table hybridFull:A}}

*Overlaps, hidden units: zero at every zoom for every tick. "Units inside aggregates" is the price of the footprint and the visibility rule, not of the algorithm.*

![share of units inside aggregates](layout-lab/out/figs/chart-aggshare.png)

### 5.2 The three visibility rules

{{table rules}}

### 5.3 Time per solve (node 24, one thread; `timing.mjs`)

*Measurement conditions: a 16-thread laptop CPU shared with other jobs (other agents' browsers and test runs were active; Windows reported about 50 % total CPU load at a sample taken while the first run of the script was in progress; the figures below come from the rerun that followed, load not sampled), the rest of the lab idle, one solver thread. Treat the figures as conservative: an idle machine is faster. Cold = a freshly created solver; the first of 31 repetitions (JIT warm-up) is dropped.*

**Cold** (a fresh solver: a seek, a zoom jump or the first frame), densest tick (tick {{v e5.densestTick.tick|i}}, {{v e5.densestTick.units|i}} units), median / p95 ms:

{{table timing}}

**Warm** (the per-frame cost during 10 s of 60 fps playback centred on the densest tick, inertia and sticky aggregates active):

{{table warm}}

Every tick of the battle, cold, at zoom 13: median {{v e5.allTicksCold.13.p50|d1}} ms, p95 {{v e5.allTicksCold.13.p95|d1}} ms, worst {{v e5.allTicksCold.13.max|d1}} ms. So a seek at zoom 12-13 costs about a tenth of a second (six frames at 60 fps) and at zoom 15 and above under two frames; playback costs a few milliseconds per frame at zoom 12-13, but at zoom 14-15 the p99 reaches {{v e5.warm.14.1x.ms.p99|d1}} ms of a 16.7 ms frame before any drawing, so the solver belongs in a worker. The same code in Chrome (V8) is reported in section 8.

---

## 6. Time: flicker, jitter, popping

Frame-by-frame playback at **60 fps for 10 s** around each hotspot, zoom 13, 14 and 15, at 1x (2 ticks/s), 4x and 16x (the app's top speed), seven variants: {{v e2meta.runs|i}} runs. Definitions: **tile churn** = tile keys appearing or disappearing while carrying a unit that was on the field in both frames (data-driven entries and exits are not layout flicker; the first second is excluded as warm-up); **pop** = a leaf tile whose centre moves more than 3 px beyond its true position's own motion in one frame; **jerk** = |c(f+1) - 2c(f) + c(f-1)| of the rendered centre, which is 0 for a perfectly smooth glide. Mean over the nine hotspot-zoom combinations:

{{table playback}}

### 6.1 What the numbers say

- **The shipped renderer is the jitter.** Its data path holds a unit's last keyframe and jumps at the next one (`03-data-fuel.md` fact 8), and its stateless relaxation re-sorts overlapping glyphs every frame: {{v e2by.1x.legacyShipped.popsPerSec|i}} pops per second at 1x, {{v e2by.4x.legacyShipped.popsPerSec|i}} at 4x, {{v e2by.16x.legacyShipped.popsPerSec|i}} at 16x. Interpolating the data alone (row 2 of each block) does **not** cure it, it makes it worse ({{v e2by.4x.legacySmooth.popsPerSec|i}} pops per second at 4x): the relaxation, not the data, is the shuffle.
- **Hysteresis is what makes the new layout calm.** Without inertia, sticky aggregates and seniority the hybrid makes {{v e2by.4x.hybridStateless.tileChurnPerSec|i}} tile churn events per second at 4x (with them: {{v e2by.4x.hybrid.tileChurnPerSec|i}}), {{v e2by.4x.hybridStateless.popsPerSec|i}} pops per second (with: {{v e2by.4x.hybrid.popsPerSec|i}}) and a p99 jerk of {{v e2by.4x.hybridStateless.jerkP99|d1}} (with: {{v e2by.4x.hybrid.jerkP99|d2}}); it also costs {{v e2by.4x.hybridStateless.msMean|d1}} ms per frame because every frame is a cold solve (with: {{v e2by.4x.hybrid.msMean|d1}} ms).
- **Zero overlap on every frame**: the hybrid, displacement-only, aggregation-only and tier variants have {{v e2meta.hybridFramesWithOverlap|i}} frames with an overlap (hybrid, {{v e2meta.hybridFrames|i}} frames); the shipped renderer overlaps on {{v e2by.4x.legacyShipped.framesWithOverlap|i}} of {{v e2by.4x.legacyShipped.frames|i}} frames at 4x.
- **Labels** show and hide {{v e2by.4x.hybrid.labelTogglesPerSec|d1}} times per second and change side {{v e2by.4x.hybrid.slotChangesPerSec|d1}} times per second at 4x across about {{v e2by.4x.hybrid.avgTiles|i}} tiles (11-12 frames of delay before a label may appear; immediate removal when it stops fitting).
- **Aggregation-only** never moves a tile (no pops) and is the calmest in jerk, but it has the fewest tiles ({{v e2by.4x.aggregate.avgTiles|i}} against {{v e2by.4x.hybrid.avgTiles|i}}) and its aggregates still churn ({{v e2by.4x.aggregate.tileChurnPerSec|i}} per second): the cost of calm is detail. **Displacement-only** is nearly as smooth as the hybrid but leaves on average {{v e2by.4x.displace.droppedUnitsPerFrame|i}} of {{v e2by.4x.displace.avgVisible|i}} units without any tile on every frame.

### 6.2 What remains

A handful of pushes per second: a tile appears (a unit enters, an aggregate forms) where an existing tile sits and the lower-priority one is moved 5-48 px **in one frame**. Seniority (older tiles are placed first, so a newcomer yields) already cuts them (table below, first two rows); it does not remove them.

### 6.3 Ideas tried for the residual pushes and for purity (measured, kept in `lib/` for the record)

Same three 10 s windows at 4x (8 ticks per second) for every variant; mean over the windows (`experiments.mjs`):

{{table e7}}

- **Seniority** (older tiles first) is kept: without it churn rises by about half and the p99 jerk quadruples.
- **Easing the displacement** (an exponential filter on each tile's offset with newcomers as ghosts, snapped back whenever the eased position would overlap) and **lookahead** (the solver 8 frames ahead, displayed offset = triangular average over 17 frames, same snap-back rule) change nothing measurable (pops {{v e7s.base.pops|d1}} per second without, {{v e7s.easing.pops|d1}} with easing, {{v e7s.lookahead.pops|d1}} with lookahead): a pushed tile has no safe intermediate position, so the filter snaps back (easing: {{v e7s.easing.snapBackShare|p0}} of the eased tile-frames were snapped back; lookahead: {{v e7s.lookahead.snappedBackPerFrame|d1}} tiles per frame had to snap back). Both are rejected.
- **Growth ramp** (newborn tiles enter at 50 % size and grow over 10 frames so a push becomes continuous) feeds back into the fail-and-merge rule: churn rises from {{v e7s.base.churn|d1}} to {{v e7s.growth.churn|d1}} per second. Rejected.
- **Escalated budget** (accept a 72 px leader before merging across formations) raises the share of aggregate units that carry a formation name (section 10) but makes the pushes worse in time (pops {{v e7s.base.pops|d1}} to {{v e7s.escalated.pops|d1}} per second, p99 jerk {{v e7s.base.jerkP99|d2}} to {{v e7s.escalated.jerkP99|d2}}): a plausible cause (not isolated) is that whether the escalation applies depends on a same-formation partner being in reach, which changes as units move. Left as an off-by-default dial.
- **Zoom tiers** (corps, division, brigade pre-merging by zoom) look better in the static tables of section 10 (a higher share of aggregate units with a formation name at zoom 12-13) but are **unstable in time as implemented**: the tier aggregates are rebuilt every frame and bypass the sticky-aggregate memory, so churn rises from {{v e7s.base.churn|d1}} to {{v e7s.tiers.churn|d1}} per second. A sticky tier (tier membership remembered like any other aggregate) is the obvious next experiment; it is not claimed here.

### 6.4 The contract this places on the motion layer

Layout guarantees steady geometry. For births, deaths, merges and splits the motion layer must keep the **opacity rule**: of two overlapping tiles at most one is solid (opacity at least 0.5) at any time, so a merge is a sequenced dissolve (old tiles fade below 0.5 before the aggregate rises above it) or a morph, never two solid chips on one spot. Label appearance and disappearance are exempt (they never overlap by construction). The residual pushes of 6.2 are exactly the events the motion layer should choreograph: with the layout known one frame ahead (the solver can run ahead of the display) a pushed tile can start moving the frame before the pusher arrives. That choreography is **not** verified here.

---

## 7. The three densest hotspots

Ranking: for each tick, the most units within 120 m of one unit (rule A, zoom independent; `hotspots.mjs --find`). The three distinct places on top: **H1** tick 346 (Day 2 evening), **H2** tick 293 (Day 2 afternoon), **H3** tick 556 (Day 3). Place names are the nearest `terrain.json` key location and are labels, not claims (placements sit in a different frame, `03-data-fuel.md` fact 11).

{{table hotspotComp}}

**What the three piles are.** H1 is a *stale* pile: units placed on the evening of Day 1 and carried forward for hundreds of ticks (median age in the table); it disappears under rules B and C (second table below). H2 and H3 are live contact scenes (median age a handful of ticks) with both sides inside 150 m, and they survive every visibility rule: there the layout does real work whatever the owner decides.

**Zoom 13, 14, 15, rule A, every strategy** (per strategy: overlap pairs / units hidden; hybrid: **overlaps** / hidden / tiles with the aggregates in brackets / largest displacement px):

{{table hotspots}}

**The same places under the three visibility rules at zoom 14:**

{{table hotspotRules}}

Legend of the figures: blue = Union, red = Confederate; X = infantry, slash = cavalry, dot = artillery; the white bar under the code is the strength state; `x n` / `+k` = an aggregate (a count of placement records); small white dots = true positions of displaced tiles and of aggregate members; thin lines = leaders; magenta = overlapping items.

![H1 certified hybrid, zoom 14](layout-lab/out/figs/H1-hybrid-z14.png)
![H2 certified hybrid, zoom 13](layout-lab/out/figs/H2-hybrid-z13.png)
![H3 certified hybrid, zoom 15](layout-lab/out/figs/H3-hybrid-z15.png)
![H3 as shipped, zoom 14: the canvas port](layout-lab/out/figs/H3-legacy-z14.png)
![H3, the strategies side by side, zoom 15](layout-lab/out/figs/compare-H3-z15.png)

Real browser screenshots of the shipped app at tick 120 (zoom 14), tick 538 (13.5) and tick 551 (16) were taken by the sibling data page: `data/shots/*.jpg`.

**How the algorithm behaves.** Where chips cannot sit on their true positions they move at most 48 px and keep a pin and a leader; where even that is not enough the units of one formation merge into an aggregate (`I/1 +13`, `II/2/2 x4`); two opposing sides stay in separate aggregates unless a Union and a Confederate tile cannot be separated inside the budget, in which case they merge into a `Contact` tile (units in `Contact` tiles at zoom 14 in the table above). From zoom 16 the three hotspots are individual tiles with a few pins; the stacks on identical coordinates (a brigade and its regiments, batteries) never separate and are the reason displacement and aggregation exist at every zoom.

---

## 8. Browser confirmation

**The lab runs in Chrome on the real data files** (`lab.html`, port 9600; the same `lib/*.mjs`, no precomputed result). `shot-lab.mjs` drives it and reads back what the page computed: the densest tick (tick 620, 478 units), the independent verifier's overlap count, representation, and solve time in V8 (cold solver, 25 repetitions):

{{table browser}}

300 frames (5 s at 60 fps) of playback at 4x with the stateful solver, verified frame by frame in the page:

{{table browserPlayback}}

The live page, hybrid and shipped canvas port at H1 zoom 14 (screenshots of the running lab):

![lab, hybrid](layout-lab/out/figs/lab-H1-hybrid-z14.png)
![lab, legacy](layout-lab/out/figs/lab-H1-legacy-z14.png)

---

## 9. Failure cases and limits

**Stress outside the 1,804 keyframes** (real units, invented positions; `stress.mjs`), zoom 14, hybrid against displacement only:

{{table e6}}

- **Identical anchors:** 478 tiles on one point collapse to 4 aggregates (nine rounds); displacement alone hides 472 of them.
- **A long line** of 478 tiles at under 1 px spacing makes every displacement candidate collide: displacement alone drops **all** of them (every neighbourhood exceeds the saturation cap, a conservative failure), the hybrid merges them into 16 aggregates.
- **Cold-solve latency.** A cold solve at zoom 11-13 takes {{v e5.cold.13.hybrid.p50|d1}}-{{v e5.cold.11.hybrid.p50|d1}} ms median on the densest tick (p95 up to {{v e5.cold.11.hybrid.p95|d1}} ms; the shared machine inflates it). Run it in a worker, keep showing the previous layout, or hide it behind a transition.
- **Aggregate spread.** At low zoom a single aggregate can stand for units kilometres apart (largest {{v e1.rules.A.12.strategies.hybrid.maxAggSpreadPx.max|i}} px at zoom 12). The hull dots and the spread number make this visible; a spread cap would trade against the guarantee and is left as a dial.
- **First-frame transient.** The first frame after a cold start differs from the second (inertia and sticky aggregates are not yet warm); the playback metrics exclude the first second for this reason, and a real seek is a scene change anyway.
- **Mutated inputs:** a unit with a wrong side counts into the wrong aggregate (section 2.4).

---

## 10. Sensitivity of the dials (hybrid, every fifth tick, rule A unless stated)

Cells: tiles drawn at the median tick (`t`) / share of units inside aggregates at the median tick (`agg`) / largest displacement over the sampled ticks / share of the aggregate units whose aggregate carries a formation name (`named`; the rest are `Lead +k` or `Contact`). Zoom 12 to 15; every fifth tick (135 ticks) of rule A unless the row says otherwise; footnote: solve times in this experiment were measured with 6 workers and are not quoted.

**Displacement budget**

{{table sens:dMax}}

**Footprint** (standard: 20 px chips, budget 48; compact: 16 px chips, budget 40)

{{table sens:footprint}}

**Visibility rule**

{{table sens:rule}}

**Saturation cap, pin protection, tiers, escalation**

{{table sens:kCap}}

{{table sens:pinProtect}}

{{table sens:tier}}

{{table sens:dMax2}}

---

## 11. Decisions for the owner, and how to extend the system

The three levers, in order of size (all numbers: median tick of every fifth tick, zoom 14, rule A unless stated, section 10):

1. **Visibility rule** (A shipped, B latest snapshot, C 24-tick window). It decides whether the screen holds {{v data.visibleUnits.A.median|i}} or {{v data.visibleUnits.B.median|i}} tiles: at zoom 14 the certified layout puts {{v e4s.dMax.48.14.unitsInAggs.p50|i}} of {{v e4s.dMax.48.14.visible.p50|i}} units inside aggregates under rule A, {{v e4s.rule.C.14.unitsInAggs.p50|i}} of {{v e4s.rule.C.14.visible.p50|i}} under C and {{v e4s.rule.B.14.unitsInAggs.p50|i}} of {{v e4s.rule.B.14.visible.p50|i}} under B. The layout is certified under all three; the choice belongs to the owner (and to the data: the repo does not say when a unit leaves the field).
2. **Displacement policy.** Keep the 48 px budget with pins and leaders, or change it: at zoom 14 the units inside aggregates are {{v e4s.dMax.0.14.unitsInAggs.p50|i}} with a budget of 0 (pure aggregation and fan-out, the stance of `03-data-fuel.md` section 9.6; the layout stays certified), {{v e4s.dMax.48.14.unitsInAggs.p50|i}} at 48 px and {{v e4s.dMax.96.14.unitsInAggs.p50|i}} at 96 px; the budget has little effect at zoom 12-13 where the field is area-limited, and a large effect at zoom 14-15.
3. **Footprint** (standard 20 px or compact 16 px, or a different tile design): compact lowers the units inside aggregates from {{v e4s.footprint.standard.14.unitsInAggs.p50|i}} to {{v e4s.footprint.compact.14.unitsInAggs.p50|i}} at zoom 14 and from {{v e4s.footprint.standard.13.unitsInAggs.p50|i}} to {{v e4s.footprint.compact.13.unitsInAggs.p50|i}} at zoom 13: a real but smaller effect than the two above. The tile-appearance agent owns the footprint; this page supplies the numbers.

Then:

4. **Extending:** add a strategy to `lib/strategies.mjs`, a footprint to `lib/spec.mjs`, a naming policy to `lib/tiles.mjs`; the selftest, the E1 grid and the playback runs apply unchanged. One verifier, one spec.

## 12. What is not verified

- Rectangular footprints only; no glyph-pixel overlap, no touch hit-target test, no keyboard focus order for aggregates and rosters.
- Text widths are measured on this Windows Chrome (Segoe UI) and validated to 3.7 %; other devices need run-time measurement.
- The pill width model of the legacy overlap count is not validated against the app's `measureText` (glyph **positions** are, section 2.2).
- Transitions, fades and the opacity rule (section 6.4) are a design contract, not tested; the motion layer is not built.
- The 1x / 4x / 16x speeds are taken from the shipped timing constants (500 ms per tick at 1x); real frame pacing on devices is not measured.
- Mobile layout (a second map and canvas in the shipped app) is not covered; the footprint and viewport would need their own run.
- "Aggregates carry formation names for N % of their units" depends on the parent chains (80 % resolved through the order of battle).
- **Interface chrome and popups** (event card, vignette panel, toolbar, monument stars) are outside this layout: the sibling page measured 5-38 % of tile centres in view under another element (`03-data-fuel.md` section 9.7). A tile whose true position lies under a card cannot be rescued by layout, so the remedy is to place the card in the free quadrant of the map and to keep the card's tiles visible; as a solver input, fixed obstacles (exclusion zones) are a small extension of the same engine but cannot be certified for tiles whose true position lies inside them. Not built, not measured.
- No Mapbox GL symbol-layer variant was built (the specialist reports propose one); everything is Canvas / SVG geometry.

---

## Appendix A. Files and reproduction

See `layout-lab/README.md` for every command. Results: `data/layout-results.json` (all measurements, definitions and the spec), `data/layout-per-tick.json` (hybrid per-tick series, rule A), `data/layout-tile-spec.json` (the spec and dial defaults for other agents). Figures: `layout-lab/out/figs/`.

## Appendix B. Bugs the independent verifier found while this was being built

1. **Spatial-hash stamp collision.** The hash marked a rectangle as "already seen" with a per-instance counter; chips live in two hashes (placement and labels), so a counter collision silently skipped an obstacle and a label landed on a chip (1 or 2 overlapping pairs in two runs of the growth-ramp experiment). Fixed with one global counter; the selftest now exercises label placement and many rounds.
2. **Missing cross-group check.** Groups were computed once; an aggregate's centroid can move into another group's reach, and aggregation-only at zoom 15 produced two overlapping chips. Fixed by the certification loop of step 6, which is now part of the guarantee and of the proof.
3. **No merge partner / an inherited offset beyond the budget.** A tile whose inherited offset exceeded a smaller budget had no feasible candidate and no obstacle to merge with; the offset is now clamped to the budget and the partner search is total.

Each was found by the verifier or the dial-space fuzz, not by inspection; none is visible in the screenshots, which is why the check is independent and brute force.
