// Assembles docs/pitch/anim/data/current-metrics.json from the individual measurement outputs (all produced by scripts in this folder).
import fs from 'node:fs';
import path from 'node:path';
import { summarize } from './timing-summary.mjs';
import { rawRows } from './rawrows.mjs';
const W = 'C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/';
const R = 'C:/Users/mlege/gettysburg-map/';
const J = (f) => JSON.parse(fs.readFileSync(W + f, 'utf8'));
const out = { schema: 'current-metrics/1', note: 'Every number below was produced by a script in docs/pitch/anim/harness-current/ (copy of tmp/pitch-anim/a1). Evidence labels: Measured = read from the running page; Computed = derived from the shipped code and data by script; Documented = text in a file or page; Modelled = interpolated or inferred; Unknown = not established.' };
out.meta = { generated: new Date().toISOString(), subject: 'Unit tiles and the movement animation of the Gettysburg map as shipped: production (baseline/dist, identical to the live site on 2026-10-05 per tools/t0/baseline.py verify-live: 119 files, 148 requests) and the fixed build release/R1c/dist', author: 'agent a1-current (pitch-anim)' };
const loc = J('locate.json');
out.builds = { baseline: { dist: 'baseline/dist', entry: loc.baseline.file, md5: loc.baseline.md5, role: 'what production serves (verified identical to live, 2026-10-05)' }, r1c: { dist: 'release/R1c/dist', entry: loc.r1c.file, md5: loc.r1c.md5, role: 'the fixed release train (not deployed)' }, functionLocations_line_col_in_minified_entry: { baseline: loc.baseline.where, r1c: loc.r1c.where } };
out.environment = J('env.json');
out.environment.tileRequests = 'every browser process stayed at or under 300 Mapbox requests (harness cap); see per-script logs';
// ---------------------------------------------------------------- data
const da = J('data-analysis.json'); const oj = J('oob-join.json'); const lc = J('label-calcs.json'); const mc = J('misc-calcs.json');
const rows = rawRows();
const sideSuffix = rows.filter((r) => /^U-\d+(AL|TX|NC|SC|GA|MS|LA|FL|AR|TN)$/.test(r.unit_id));
const sideIds = {}; sideSuffix.forEach((r) => { (sideIds[r.unit_id] ||= []).push(`tick ${r.tick} ${r.disposition} (${r._file})`); });
const events = []; for (const d of [1, 2, 3]) events.push(...JSON.parse(fs.readFileSync(`${R}baseline/dist/data/chronology_day${d}.json`, 'utf8')).events);
const nonLow = events.filter((e) => e.significance !== 'low'); const perTick = {}; nonLow.forEach((e) => { perTick[e.tick] = (perTick[e.tick] || 0) + 1; });
const vig = []; for (const p of [1, 2, 3]) vig.push(...JSON.parse(fs.readFileSync(`${R}baseline/dist/data/vignettes_part${p}.json`, 'utf8')).vignettes);
const succ = JSON.parse(fs.readFileSync(`${R}baseline/dist/data/oob/commander_successions.json`, 'utf8')); const sAll = [...succ.union_successions, ...succ.confederate_successions]; const sPer = {}; sAll.forEach((s) => { sPer[s.approx_tick] = (sPer[s.approx_tick] || 0) + 1; });
out.data = { ...da, oob_join: oj, label_uniqueness: lc, side_prefix_suspects: { rule: 'unit_id starts with U- (drawn Union blue) but ends in a Confederate state code (AL, TX, NC, ...)', ids: Object.keys(sideIds).length, detail: sideIds, evidence: 'Computed from ids; whether these are authoring errors is Unknown until a historian checks them' }, hit_flash_and_engaged: { hitFlash: mc.hitFlash, engagedByZoom: mc.engaged }, orientation: mc.orientation };
// ---------------------------------------------------------------- tile specification
const mPerPx = (z) => (40075016.686 * Math.cos((39.812 * Math.PI) / 180)) / (512 * 2 ** z);
out.tile_spec = {
  evidence: 'Computed from the shipped draw routine lS (extracted from the bundle and run), Measured on the page by the canvas probe; specimen sheet = the same routine run on synthetic placements',
  canvas: { element: 'one full-size 2D canvas, z-index 10, above the Mapbox canvas; backing store = CSS pixels (no devicePixelRatio scaling)', baselinePointerEvents: 'auto (swallows mouse pan and wheel, measured)', r1cPointerEvents: 'none (map receives input, clicks come from the map click event)', redrawsOnMapMove: { baseline: false, r1c: 'yes, via GtbgRepaint on move and resize' } },
  width_px: { desktop: 'clamp(round(strength / 4), 10, 120)', phone: 'clamp(round(strength / 6), 10, 60) (canvas width < 500)', share_of_keyframe_rows_at_cap: { desktop: da.tile_width_px_desktop.share_of_rows_at_cap, phone: da.tile_width_px_phone.share_of_rows_at_cap } },
  height_px: { infantry_and_other: 8, cavalry: 4, artillery_outline: 10, skirmish_line: 'dashed 2 px line, 4-3 pattern' },
  shapes: { 'Deployed/Limbered Artillery or id contains ART': 'outline rectangle 2 px in side colour plus a centre line half the width', 'Skirmish Line': 'dashed line (4 px dash, 3 px gap), 2 px, side colour', 'all other dispositions': 'filled rectangle in side colour, 1 px border, opacity 0.88 (1.0 when selected)' },
  colours: { union_fill: '#3a6bc4', union_border: '#1a3a7a', confederate_fill: '#c43a3a', confederate_border: '#7a1a1a', hit_flash_union: '#88ccff', hit_flash_confederate: '#ff9944', selected_glow: '#e8d5a3 shadowBlur 14', engaged_glow: 'white shadowBlur 8, alpha 0.4 + 0.6 * |sin(t/300)| (about 1.06 Hz), reduced to a constant under reduced motion in R1c only' },
  rotation: 'rotate((bearing - 90) deg): the long axis is parallel to the facing direction for every tile (451 of 451 checked); placement_schema.json says Line of Battle extends perpendicular to bearing',
  disposition_badge: 'a 7 px circle (radius 3.5, 1 px black ring) drawn 7 px above the tile centre in screen space, never rotated; it is the only difference between Line of Battle, Charging Line, Chaotic Retreat, Line of March, Reserve and Bivouac tiles, and between mounted and dismounted cavalry and deployed and limbered artillery',
  label: { box: 'rgba(0,0,0,0.72), padding 3 x 2 px, centred 13 px above the tile centre, text #aaccff (Union) or #ffbbaa (Confederate)', rules: 'none below zoom 12 (14 on the phone) unless selected; zoom 12-13.99: first 6 characters of the id label; 14-16.49: full id label; 16.5+: id label + strength; font bold 8 px (<14), 9 px (14-16), 10 px (>=16 or selected)', source_of_text: 'always derived from unit_id; OOB designation is never used (an empty object is passed to the label function)', no_collision_handling: true },
  relaxation: '8 passes of pairwise pushing on unrotated boxes (width/2+2 by a 12 px band), displaced tiles get a 0.5 px leader line when moved more than 3 px; runs every redraw from scratch',
  leader_lines_in_frame_at_tick546_z13_5: 'about 320 (Measured, 409 tiles drawn)',
  trails: { canvas: 'z-index 8, intrinsic size 300 x 150 in both builds (never resized): trail segments only exist inside the top-left 300 x 150 px, 3.7 percent of a 1440 x 852 map', measured: J('input-baseline.json').trailCanvas },
  minimum_zoom_reality: mc.effectiveMinZoomFromMaxBounds,
  per_zoom: [11, 12, 13, 13.5, 14, 15, 16, 17, 18].map((z) => ({ zoom: z, metres_per_px: +mPerPx(z).toFixed(2), tile_120px_is_metres: Math.round(120 * mPerPx(z)), tile_8px_height_is_metres: +(8 * mPerPx(z)).toFixed(1), engaged_radius_40px_is_metres: Math.round(40 * mPerPx(z)), label: z < 12 ? 'none' : z < 14 ? 'id label cut to 6 chars, 8 px' : z < 16.5 ? 'id label, ' + (z < 16 ? '9' : '10') + ' px' : 'id label + strength, 10 px' })),
};
// ---------------------------------------------------------------- legend
out.legend_vs_drawn = { evidence: 'Documented (legend tables NF, UF, jF and the notes in VF, identical in both builds) versus Computed (colours the shipped routine paints, 9 sample ticks, all dispositions)', ...J('legend-check.json') };
// ---------------------------------------------------------------- popups
const pr = { baseline: J('popups-baseline-desktop.json'), r1c: J('popups-r1c-desktop.json') };
const keep = (st) => st.rects.filter((r) => +r.z > 10 && !(r.tag === 'A') && !(r.w >= 1430 && r.h >= 800)).map((r) => `${r.w}x${r.h}@${r.x},${r.y} z${r.z} ${r.txt.slice(0, 26)}`);
out.popups = {
  evidence: 'Documented from the bundle code (positions in style objects) and Measured (DOM rectangles at 1440x900 and 390x844)',
  catalogue: [
    { name: 'Vignette card (CF)', trigger: 'currentTick within trigger_tick .. trigger_tick+2', count: vig.length, trigger_ticks: vig.map((v) => v.trigger_tick), position_code: 'absolute top 60 right 16, 340 x up to (100vh-200), z 92', visible_seconds: { '1x': 1.5, '2x': 0.75, '4x': 0.375, '8x': 0.1875 }, note: 'visibility is tied to ticks, not seconds; dismissed ids stay dismissed until a jump larger than 1 tick' },
    { name: 'Event card (LF)', trigger: 'chronology event at exactly the current tick, significance not low', events: nonLow.length, distinct_ticks: Object.keys(perTick).length, ticks_with_two_or_more: Object.values(perTick).filter((n) => n > 1).length, max_events_in_one_tick: Math.max(...Object.values(perTick)), position_code: 'absolute bottom 120, centred, 460 wide, z 85', visible_seconds: { '1x': 0.5, '2x': 0.25, '4x': 0.125, '8x': 0.0625 }, note: 'the data has one non-low event per tick (134 events on 134 ticks), so the +N more line never appears; a jump of more than 1 tick clears the dismissed set' },
    { name: 'Commander toasts (qF)', trigger: 'playing, a succession approx_tick crossed', events: sAll.length, ticks_with_two_or_more: Object.values(sPer).filter((n) => n > 1).length, max_in_one_tick: Math.max(...Object.values(sPer)), position_code: 'absolute top 60 right 16, 300 wide, stack of up to 4, 4.5 s each, z 200', note: 'sits at the same corner as the vignette card and above it (z 200 over z 92)' },
    { name: 'Succession cards (nO)', trigger: 'commanderSuccessions in the store', status: 'never populated: the store initialises the array to [] and no code writes it (grep of both bundles), so this popup cannot appear', evidence_label: 'Computed from source' },
    { name: 'Unit info panel (MF)', trigger: 'selected or pinned unit that resolves in the OOB table', position_code: 'fixed top 60 left 16, 280 wide, up to (100vh-200), z 92 (desktop); full-width sheet above the timeline on the phone', note: 'renders nothing when the unit id is not in the OOB table; shows disposition and strength only when the unit has a row at exactly the current tick' },
    { name: 'Legend (VF)', trigger: 'open by default (persisted in localStorage)', position_code: 'fixed bottom 160 left 16, 240 x 359, z 88' },
    { name: 'Overview minimap (WF)', position_code: 'absolute bottom right, 162 x 176, z 88' },
    { name: 'HUD clock and speed (_F)', position_code: 'absolute top 56 left 16, 160 x 43, z 88' },
    { name: 'Timeline dock', position_code: 'absolute bottom 0, 127 px tall, z 100: the unit canvas extends underneath it (canvas 852 px tall, 127 px of it covered)' },
    { name: 'Hover tooltip (fF)', status: 'mounted without its props (hoveredUnit, mousePos), so it always returns null: there is no hover reaction (Measured: no DOM or pixel change on hover)' },
    { name: 'NPS Auto Tour (XF)', position_code: 'button absolute bottom right z 200; flyTo then plays 2x for tickWindow*250 ms' },
  ],
  measured_rectangles_desktop_1440x900: Object.fromEntries(['baseline', 'r1c'].map((b) => [b, Object.fromEntries(Object.entries(pr[b].states).map(([k, v]) => [k, keep(v)]))])),
  covered_by_overlays: J('covered-by-ui.json').map((r) => ({ build: r.build, vp: r.vp, state: r.state.replace(/^\w+ \w+ /, ''), tick: r.tick, tilesDrawn: r.tilesDrawnInView, tileCentreUnderAnOverlay: r.tileCentreUnderAnOverlay, tilesHalfOrMoreUnderOverlays: r.tilesAtLeast50PercentUnderOverlays, canvasShareCovered: r.canvasShareCoveredByOverlays, centreUnderBy: r.centreUnderBy })),
  covered_by_overlays_note: 'the tile set is the intended carry-forward picture (what R1c draws); for the baseline it measures what its layout WOULD cover, because the production tile set is wrong (see input_and_state)',
};
// ---------------------------------------------------------------- input and state
const hit = { r1c: J('hit-r1c.json') };
out.input_and_state = {
  mouse: { baseline: J('input-baseline.json').mouse, r1c: J('input-r1c.json').mouse },
  canvas: { baseline: J('input-baseline.json').canvas, r1c: J('input-r1c.json').canvas },
  hover: { baseline: J('input-baseline.json').hover, r1c: J('input-r1c.json').hover },
  intro: { baseline: J('intro-baseline.json'), r1c: J('intro-r1c.json'), note: 'times in ms from navigation; baseline shows Loading, then a 3.5 s fast-forward of all 675 ticks (the unit layer redraws about 213 times), then the layout chooser; R1c shows none of it' },
  state_after_actions: { baseline: J('state-baseline.json').steps, r1c: J('state-r1c.json').steps, note: 'tilesDrawnInView versus the carry-forward expectation at the same tick and the default camera; extra = tiles that should not be there (ghosts), missing = tiles that should be there' },
  sound_guard_freeze: { baseline: J('sound-baseline.json'), r1c: J('sound-r1c.json') },
  hit_test_real_clicks_vs_model_r1c: hit.r1c.results.map((r) => ({ zoom_requested: r.zoom, camera: r.camera, tile_width_px: r.tileW, clicks: r.clicks.map((c) => `${c.dx}px from centre: ${c.observed || 'nothing'}${c.modelAgrees ? '' : ' (model differs)'}`) })),
  hit_target_model: J('hit-model.json'),
  hit_rule: 'click -> unproject -> nearest unit by degrees among the cells within 0.002 deg of the click (about 220 m north-south, 170 m east-west) of the TRUE positions of the current tick; no pixel radius, no use of the drawn (displaced) tile; a click with no candidate deselects',
  baseline_hit_note: 'in production the same click code runs (identical text in both bundles); real clicks at the tile centre selected it in 4 of 4 zooms (first input run); off-centre clicks follow the same rule',
};
// ---------------------------------------------------------------- timing
const tdesk = { baseline: J('runs-baseline-timing-desktop.json'), r1c: J('runs-r1c-timing-desktop.json') };
const tph = { baseline: J('runs-baseline-timing-phone.json'), r1c: J('runs-r1c-timing-phone.json') };
const slim = (s) => ({ run: s.label, speed: s.speed, ticks: `${s.start} to ${s.endTick}`, cpuThrottle: s.cpuThrottle, seconds: s.seconds, pageFps: s.page.fps, frameIntervalMs: s.page.dtMs, framesOver20msPct: s.page.over20ms_pct, framesOver34msPct: s.page.over34ms_pct, framesOver50msPct: s.page.over50ms_pct, framesOver100ms: s.page.over100ms, unitRedrawsPerSecond: s.unitCanvas.redrawsPerSec, unitRedrawIntervalMs: s.unitCanvas.intervalMs, drawCallbackMs: s.unitCanvas.drawCallbackMs, longTasks: s.longTasks, canvas: s.canvas });
out.timing = { evidence: 'Measured: real Chrome 155 (headless=new, real GPU), rAF cadence of the page, one entry per unit-canvas redraw, duration of the rAF callback that drew, PerformanceObserver long tasks (>50 ms). Absolute fps and ms depend on this machine; the pattern (cadence bimodal at 16.7 and 33.4 ms in dense scenes) is what matters.', desktop: Object.fromEntries(Object.entries(tdesk).map(([b, d]) => [b, d.runs.map((r) => slim(summarize(r)))])), phone_390x844_dpr3: Object.fromEntries(Object.entries(tph).map(([b, d]) => [b, d.runs.map((r) => slim(summarize(r)))])) };
// ---------------------------------------------------------------- motion
const winFiles = fs.readdirSync(W).filter((f) => /^runs-r1c-timing-desktop\.analysis-/.test(f));
const windows = winFiles.flatMap((f) => J(f)).sort((a, b) => a.label.localeCompare(b.label));
out.motion = {
  evidence: 'Computed by replaying the shipped Ed/y1/F4/lS code (extracted from the bundle) with the REAL rAF timestamps of each browser run. Validation: for 3 real R1c runs (487, 365 and 485 frames) the replay reproduced every frame (tile count, sum of x, y, angle, width, label count) with zero difference.',
  replay_validation: { run: 'trace-1x-dense, trace-8x-dense, trace-1x-sparse (R1c)', frames: [487, 365, 485], framesMatching: [487, 365, 485], worstAbsDiff: 0 },
  baseline_note: 'the interpolation, easing, hop and snap-back code is byte-identical in the baseline bundle (F4, z4, y1 apart from the carry-forward cache); only the unit SET differs (stale cache), so the motion numbers apply to the units the baseline draws; the baseline cannot be replayed exactly because its cache depends on which ticks were visited',
  whole_battle_60hz_position_only: J('fast-motion.json').map((m) => ({ speed: m.speedLabel, ticks: `${m.startTick} to ${m.endTick}`, seconds: m.seconds, frames: m.frames, unitFrames: m.unitFrames, staticShareOfUnitFrames: m.staticShare, hops: m.hops, snapBacks: m.snapBacks, easing: m.easing, smoothFrames: m.smoothFrames, interpolatedStepsWithinATick: m.interpolatedStepsWithinATick, afterSnapBackFrame: m.afterSnapBackFrame, pairHandoverSteps: m.pairHandoverSteps, firstAppearances: m.firstAppearances, reappearances: m.reappearances, reappearedAfterExactlyOneFrameAbsent: m.reappearedAfterExactlyOneFrameAbsent })),
  windows_with_drawing_and_real_timestamps: windows.map((m) => ({ run: m.label, frames: m.frames, seconds: m.seconds, ticksAdvanced: m.ticksAdvanced, tilesInView: m.tilesInView, staticShareOfUnitFrames: m.staticShare, hops: m.hops, relaxation_offset_jumps_static_camera: m.relaxation, appear: m.appear })),
  pop_in_flicker_in_real_browser_traces: (() => { const d = J('runs-r1c-trace-desktop.json'); return d.runs.map((run) => { const F = run.frames; const seq = []; for (let i = 1; i < F.length; i++) if (F[i].n !== F[i - 1].n) seq.push(`${F[i - 1].n}>${F[i].n} (tick ${F[i].tick})`); return { run: run.label, tilesInViewPerFrame_changes_first12: seq.slice(0, 12), reading: 'a count that rises, falls back at the tick boundary, then rises again is a unit that pops in half a tick early, vanishes for one frame and pops in again' }; }); })(),
  exemplar_unit_trace: J('exemplar-trace.json'),
  step_and_scrub: J('scrub-calcs.json'),
  camera_motion_layout_stability: J('camera-motion.json'),
  label_flicker: J('label-flicker.json'),
};
// ---------------------------------------------------------------- overlap
const os = J('overlap-summary.json'); const osp = J('overlap-summary-phone.json'); const hs = J('hotspots.json');
const pick = (o, mode) => Object.values(o).filter((v) => v.mode === mode).map((v) => ({ zoom: v.zoom, tilesDrawn: v.tilesDrawn, ticksWithAnyTileOverlap_of_675: v.ticksWithAnyTileOverlap, overlapPairs: v.overlapPairs, tilesTouchingAnotherTile: v.tilesTouchingAnotherTile, tilesHalfOrMoreHidden: v.tilesHalfOrMoreHidden, tilesAlmostFullyHidden: v.tilesAlmostFullyHidden95, meanHiddenShareOfATile: v.meanHiddenShareOfATile, dotsHalfOrMoreHiddenByOthers: v.disposition_dots_covered, dotsHalfCoveredByOwnLabel_mean: v.dotsHalfCoveredByOwnLabelMean, labelsMostlyCoveredByLaterLabels: v.labelsMostlyCoveredByLaterLabels, labelBoxPairsOverlapping: v.labelBoxPairsOverlapping, largestOverlapCluster: v.largestOverlapCluster, topClustersByPlace: v.topClustersByPlace }));
out.overlap = {
  evidence: 'Computed: the shipped lS drawn for every displayed state (carry-forward, one per keyframe tick, 188 states standing for all 675 ticks) into a recording context with real Chrome text widths; geometry census of the recorded tiles, dots and labels',
  method: 'pairs = tile bodies (rotated rectangles) that overlap by more than 0.5 px; hidden share = share of a tile body covered by LATER tiles or by OTHER units labels (labels are painted after all tiles); dot hidden = at least half of the badge disc covered by others; label illegible = more than 30 percent covered by a later label',
  caution_zoom_11_12: 'the desktop camera cannot go below zoom 12.04 on 1440 px (maxBounds), so z11 and z12 columns on desktop are virtual',
  desktop_1440x852_default_centre: pick(os, 'view'), desktop_every_unit_any_pan: pick(os, 'global'), phone_390x607_default_centre: pick(osp, 'view'),
  hotspots: { overlap_clusters: 'see topClustersByPlace per zoom (place = nearest key location of data/terrain.json); clusters include stale carry-forward units', geographic_density_150m: hs.topPerPlace.map((r) => ({ tick: r.tick, unitsWithin150m: r.densest150m, place: r.name, metresFromPlace: r.meters, unitsShown: r.unitsShown })), geographic_density_fresh_units_150m: hs.topFresh, freshDefinition: hs.freshDefinition },
};
out.unverified = [
  'Absolute frame times and fps were measured on one machine (Intel Core Ultra 7 265H, Arc Pro 140T, Chrome 155, headless=new): a low-end phone will be slower, and no real phone was tested; the 4x CPU throttle runs are an emulation',
  'The phone numbers use Chrome device emulation (390x844, DPR 3, touch) on the desktop, not a real handset; the canvas size check (390 px backing store at DPR 3) is exact, the speed is not',
  'The baseline (production) motion cannot be replayed exactly because its carry-forward cache depends on every tick it has ever drawn; baseline statements about the unit set come from real runs (state_after_actions), baseline motion statements rest on the byte-identical interpolation code',
  'The side-prefix suspects (U- ids with Confederate state codes) are inferred from the id text; a historian has not checked them',
  'Whether hop distances such as 5.7 km in 5 minutes are authoring choices or errors in the placements is Unknown; they are reported as data, not corrected',
  'Hit-test model versus real clicks: 20 of 21 real clicks (R1c, zoom 12.04, 14 and 17) selected exactly what the model predicted; the one difference is a click 400 px from a tile at zoom 12.04. The baseline click code is identical but its tile set is wrong, so only the centre click was tried there',
  'No hover reaction was found in the code and none was observed; touch interaction (tap select, 300 ms tap rule) was read from code only',
  'Mapbox basemap tiles were not part of the measurement subject; their GPU cost is included in the page frame times but not separated',
];
fs.mkdirSync(R + 'docs/pitch/anim/data', { recursive: true });
fs.writeFileSync(R + 'docs/pitch/anim/data/current-metrics.json', JSON.stringify(out, null, 1));
console.log('written', (fs.statSync(R + 'docs/pitch/anim/data/current-metrics.json').size / 1024).toFixed(0) + ' KB');
