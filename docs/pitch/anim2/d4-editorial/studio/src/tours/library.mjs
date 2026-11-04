// tours/library.mjs - THE TOURS: a guided 60-second Showcase and one scripted run for each of the three hardest places on the field, plus a builder for a before/after replay of whatever the
// viewer is looking at.  A tour is DATA (tours/director.mjs documents the format): copy a block, change the ticks and the words, add it to TOURS.  Nothing here may state a number that is
// not read from the data or from the running engine, except the FACTS below, which test/assemble.test.mjs checks against the research replay every time.
import { STYLES } from '../styles/index.mjs';

/** numbers quoted from research report 01 (docs/pitch/anim/01-current-tiles-jitter.md, 6.1 to 6.4): the whole-battle replay of the shipped playback code at zoom 13.5.  test/production.test.mjs
 *  reproduces every one of them with this Studio's production reproduction, so a caption cannot drift from the code. */
export const FACTS = Object.freeze({ hops: 833, hopFrames: 159, snapBacks: 66, blinkUnits: 407, medianHopPx: 78, zoom: 13.5, source: 'research report 01' });

const ev = (label, text) => ({ ev: label, text });
const when = (ctx, tick) => { const c = ctx.engine.clock.describe(tick); return `${c.date}, about ${c.text}`; };
const num = (n) => n.toLocaleString('en-US');

/** the hardest places (06-layout.md section 7: ranked by the most units within 120 m of one unit; the names are the nearest key locations of the data: labels, not claims) */
export const HOTSPOTS = [
  { id: 'cemetery-hill', label: 'Cemetery Hill', tick: 346, lat: 39.8189, lng: -77.2262, zoom: 14, near: 'Evergreen Cemetery gatehouse', why: 'a stale pile: units placed on the evening of day 1 and carried forward for hundreds of ticks, so most of these tiles are old keyframes' },
  { id: 'rose-woods', label: 'Rose Woods', tick: 293, lat: 39.7994, lng: -77.2417, zoom: 14, near: 'Rose Woods', why: 'both sides within about 150 m of one another, most keyframes only a few ticks old' },
  { id: 'the-angle', label: 'The Angle', tick: 556, lat: 39.8117, lng: -77.2347, zoom: 15, near: 'The Angle (High Water Mark)', why: 'the densest fresh keyframes of the battle, on day 3' },
];

/** one before/after replay: the same ticks, the same camera, both renderers, then the numbers measured on this run */
export function abSteps({ tick, lat, lng, zoom, speed = 4, beforeMs = 7000, afterMs = 7000, resultsMs = 4000, label, intro }) {
  const go = [{ a: 'seek', tick, glide: false }, { a: 'camera', lat, lng, zoom, glide: false }];
  return [
    { id: 'intro', ms: 3000, enter: [{ a: 'pause' }, { a: 'popups', on: false }, { a: 'compare', mode: 'after' }, ...go], caption: intro },
    { id: 'before', ms: beforeMs, live: true, enter: [{ a: 'compare', mode: 'before' }, ...go, { a: 'play', speed }],
      caption: (ctx) => ({ kicker: 'Before · production-style stepping', title: 'Sit still, then hop.', text: `The shipped code, reproduced and checked against the research replay (${FACTS.hops} hops of 8 px or more in the whole battle). Most keyframes of a unit are far apart in time, so it waits and then jumps; bars pile on bars. ${label}.`, chips: [ev('Computed', 'reproduction of the shipped renderer'), ev('Modelled', 'positions')] }) },
    { id: 'after', ms: afterMs, live: true, enter: [{ a: 'compare', mode: 'after' }, ...go, { a: 'play', speed }],
      caption: () => ({ kicker: 'After · Battle Studio', title: 'Continuous. Clear.', text: 'The same ticks, the same camera, the same canvas. Each unit travels smoothly through its keyframes; tiles that cannot stand clear of each other merge into a counted tile, and every unit stays represented.', chips: [ev('Modelled', 'positions between keyframes'), ev('Computed', 'tile counts')] }) },
    { id: 'results', ms: resultsMs, enter: [{ a: 'pause' }, { a: 'results' }],
      caption: (ctx) => ({ kicker: 'Measured on this run', title: ctx.report && ctx.report.ok ? 'Same ticks, two renderers.' : 'Not enough frames to compare.', text: 'Both renderers ran the same ticks at the same speed on this machine; the numbers come from the frames that were drawn, by the same recorder.', chips: [ev('Measured', 'this machine, this run')], table: ctx.report && ctx.report.ok ? ctx.report.rows : null }) },
  ];
}

const hotspotTour = (h) => ({
  id: 'hotspot-' + h.id, label: h.label, group: 'Hotspots', blurb: `Tick ${h.tick}: ${h.why}.`,
  steps: abSteps({
    tick: h.tick - 6, lat: h.lat, lng: h.lng, zoom: h.zoom, label: `Starts at tick ${h.tick - 6}`,
    intro: (ctx) => ({ kicker: `Hotspot · ${when(ctx, h.tick)}`, title: h.label, text: `Tick ${h.tick}, ${h.why}. The data's nearest key location is ${h.near} (a label, not a claim). Watch the same six minutes twice.`, chips: [ev('Computed', 'ranked by units within 120 m of one unit'), ev('Modelled', 'clock is a candidate')] }),
  }),
});

const SHOWCASE = {
  id: 'showcase', label: '60-second showcase', group: 'Showcase', blurb: 'The before and after, the two looks of the ground, the whole field and the popups, in one minute.',
  steps: [
    { id: 'open', ms: 5000, enter: [{ a: 'pause' }, { a: 'popups', on: false }, { a: 'compare', mode: 'after' }, { a: 'style', id: 'dispatch-paper' }, { a: 'seek', tick: 548, glide: false }, { a: 'camera', lat: 39.8117, lng: -77.2347, zoom: 15, glide: false }, { a: 'speed', v: 1 }],
      caption: (ctx) => { const c = ctx.engine.battle.ds.provenance.counts; return { kicker: `${when(ctx, 548)}`, title: 'Every tile is a real record.', text: `${num(c.units)} units and ${num(c.keyframes)} hand-placed keyframes on ${c.populatedTicks} of 675 ticks. Where a unit stood is Modelled; who it is comes from the order of battle.`, chips: [ev('Documented', 'identity: order of battle'), ev('Modelled', 'positions and clock')] }; } },
    { id: 'before', ms: 9000, live: true, enter: [{ a: 'compare', mode: 'before' }, { a: 'seek', tick: 548, glide: false }, { a: 'play', speed: 4 }],
      caption: () => ({ kicker: 'Before · production-style stepping', title: 'Sit still, then hop.', text: `Reproduced from the shipped code and checked against the research replay: ${FACTS.hops} hops of 8 px or more across the battle. Units wait, then jump; bars pile on bars.`, chips: [ev('Computed', 'matches the shipped code'), ev('Modelled', 'positions')] }) },
    { id: 'after', ms: 9000, live: true, enter: [{ a: 'compare', mode: 'after' }, { a: 'seek', tick: 548, glide: false }, { a: 'play', speed: 4 }],
      caption: () => ({ kicker: 'After · Battle Studio', title: 'Continuous. Clear.', text: 'Same ticks, same camera, same canvas. Each unit travels smoothly through its keyframes. Tiles that cannot stand clear of each other merge into a counted tile; every unit stays represented.', chips: [ev('Modelled', 'positions between keyframes'), ev('Computed', 'tile counts')] }) },
    { id: 'results', ms: 5000, enter: [{ a: 'pause' }, { a: 'results' }],
      caption: (ctx) => ({ kicker: 'Measured on this run', title: ctx.report && ctx.report.ok ? 'Same ticks, two renderers.' : 'Not enough frames to compare.', text: 'The same recorder measured both runs on this machine, frame by frame.', chips: [ev('Measured', 'this machine, this run')], table: ctx.report && ctx.report.ok ? ctx.report.rows : null }) },
    ...STYLES.map((s, i) => ({
      id: 'style-' + s.id, ms: 6000, enter: [{ a: 'style', id: s.id }, ...(i === 0 ? [{ a: 'seek', tick: 551, glide: false }, { a: 'camera', lat: 39.8117, lng: -77.2347, zoom: 16, glide: true }, { a: 'play', speed: 1 }] : [])],
      caption: () => ({ kicker: `Look ${i + 1} of ${STYLES.length}`, title: s.label, text: s.blurb, chips: [ev('Design', 'tile design'), ev('Documented', 'side, arm and identity come from the order of battle')] }),
    })),
    { id: 'field', ms: 8000, refresh: true, enter: [{ a: 'style', id: 'dispatch-paper' }, { a: 'seek', tick: 620, glide: false }, { a: 'camera', lat: 39.81592, lng: -77.23677, zoom: 13.5, glide: true }, { a: 'play', speed: 4 }],
      caption: (ctx) => { const f = ctx.engine.frame; const fresh = ctx.engine.frames > ctx.enteredAtFrame; const live = f ? f.tiles.filter((t) => t.life === 'live').length : 0; const m = ctx.engine.metricsOf('after').summary(); return { kicker: 'The whole field', title: 'One picture. No tile hides another.', text: `${fresh ? `${f.onField} units stand for ${live} tiles on this frame.` : 'Every unit on the field gets a tile or a place in one.'} A tile that cannot stand clear of its neighbours merges into a counted tile; a displaced one keeps a pin on its true position.`, chips: [ev('Computed', 'tile and unit counts, live'), ev('Measured', `${num(m.overlapPairs)} overlapping pairs in ${num(m.frames)} frames so far`)] }; } },
    { id: 'popups', ms: 8000, enter: [{ a: 'popups', on: true }, { a: 'seek', tick: 24, glide: false }, { a: 'camera', lat: 39.8289, lng: -77.2578, zoom: 14.5, glide: false }, { a: 'play', speed: 1 }],
      caption: () => ({ kicker: 'Everything that pops up is kept', title: 'Cards that wait for you to read them.', text: 'Event cards, stories, command changes, the clock and the legend live for reading time, point at the units they describe, and never cover a tile. What does not fit becomes a chip in the Chronicle.', chips: [ev('Documented', 'text verbatim from the chronology data'), ev('Computed', 'placement checked on every frame')] }) },
    { id: 'outro', ms: 4000, enter: [{ a: 'pause' }],
      caption: () => ({ kicker: 'Your turn', title: 'Honest by construction.', text: 'Positions, strengths and the clock are Modelled; the clock is a candidate; the ground is a modern aerial photograph, not the 1863 landscape. Drag, wheel, click a tile; press T to tune every dial.', chips: [ev('Modelled', 'positions, strengths, clock'), ev('Unknown', 'clock reviewed by no historian')] }) },
  ],
};

export const TOURS = [SHOWCASE, ...HOTSPOTS.map(hotspotTour)];

/** a before/after replay of the current view, built on demand: { tick, lat, lng, zoom } of the camera as the viewer left it */
export function viewReplayTour(v) {
  return { id: 'view-replay', label: 'Replay this view', group: 'Compare', blurb: 'The same ticks from here, before and after.', steps: abSteps({ tick: Math.max(1, Math.round(v.tick)), lat: v.lat, lng: v.lng, zoom: v.zoom, speed: 4, beforeMs: 6000, afterMs: 6000, resultsMs: 4000, label: `Starts at tick ${Math.round(v.tick)}`,
    intro: (ctx) => ({ kicker: `Your view · tick ${Math.round(v.tick)}`, title: 'Before and after, from here.', text: `${when(ctx, v.tick)} (candidate clock). The same ticks run twice from this camera.`, chips: [ev('Modelled', 'positions and clock')] }) }) };
}
