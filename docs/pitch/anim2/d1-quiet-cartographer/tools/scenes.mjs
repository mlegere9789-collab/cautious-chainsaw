// tools/scenes.mjs - renders THE SCENES of the brief (DPR 2, desktop 1440x900 unless noted) into shots/, each with a 100 % crop of its busiest 600x400 CSS-px area, and runs the independent verifier on
// every settled frame.  Real data, real ground, the engine's own layout.  Deterministic: the engine and the director are driven by studio.step() on a virtual clock.
//   node tools/scenes.mjs [--only=s1a,s4] [--out=shots] [--style=night|day] [--dpr=2] [--variant=standard|cvd|contrast]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { open, setScene, shot, args, D1, stopServer } from './lib.mjs';
import { CHECK_JS, BUSIEST_JS } from './check.mjs';

const OUT = path.resolve(args.out || path.join(D1, 'shots', 'round-1')); const DPR = +(args.dpr || 2); const STYLE = args.style || 'day'; const VARIANT = args.variant || 'standard'; const SUFFIX = (STYLE === 'day' ? '' : '-' + STYLE) + (VARIANT === 'standard' ? '' : '-' + VARIANT);
const ANGLE = [39.8117, -77.2347]; const HERBST = [39.8278, -77.2528];
const QUIET_CARDS = { 'popup.event.enabled': false, 'popup.story.enabled': false, 'popup.toast.enabled': false, 'popup.crossout.enabled': false, 'popup.hints.enabled': false, 'popup.banner.enabled': false };      // only the card the scene is about
const SCENES = [
  { id: 's1a', shift: [6, 96], file: 's1a-opening-field-z13.5-t551', tick: 551, lat: 39.81592, lng: -77.23677, zoom: 13.5, safe: true },
  { id: 's1b', shift: [-60, -18], file: 's1b-angle-assault-z15-t556', tick: 556, lat: ANGLE[0], lng: ANGLE[1], zoom: 15, safe: true },
  { id: 's2', shift: [84, -96], file: 's2-wheatfield-rose-woods-z15-t295', tick: 295, lat: 39.7992, lng: -77.2414, zoom: 15, safe: true },
  { id: 's3', shift: [120, -18], file: 's3-cemetery-hill-z15.5-t346', tick: 346, lat: 39.8189, lng: -77.2262, zoom: 15.5, safe: true },
  { id: 's4', shift: [102, 6], file: 's4-closeup-selected-z16.5-t551', tick: 551, lat: ANGLE[0], lng: ANGLE[1], zoom: 16.5, safe: true, popups: true, tokens: QUIET_CARDS, select: 'U-71PA', after: `S.host.dismissAll(); S.host.setSelected('U-71PA'); E.select('U-71PA'); adv(90);` },
  { id: 's5', file: 's5-phone-z14.5-sheet-t551', vp: [390, 844], mobile: true, tick: 551, lat: ANGLE[0], lng: ANGLE[1], zoom: 14.5, safe: true, popups: true, tokens: QUIET_CARDS, select: 'U-14VT', after: `S.host.dismissAll(); S.host.setSelected('U-14VT'); E.select('U-14VT'); adv(60); S.host.openRail('unit-card:sel-U-14VT'); adv(90);`, crop: [390, 330] },
  { id: 's6', shift: [114, 72], file: 's6-event-and-story-in-situ-t28', tick: 28, lat: HERBST[0], lng: HERBST[1], zoom: 14.5, safe: true, popups: true, pre: true },
  { id: 's7', shift: [6, 72], file: 's7-legend-t60', tick: 60, lat: 39.8278, lng: -77.2528, zoom: 14.5, safe: true, popups: true, tokens: QUIET_CARDS, after: `S.host.act('legend:legend', 'toggle'); adv(120);` },
  { id: 's8', shift: [-90, -114], file: 's8-hover-tooltip-z16-t551', tick: 551, lat: ANGLE[0], lng: ANGLE[1], zoom: 16, safe: true, popups: true, tokens: QUIET_CARDS, after: `const f = E.frame; const t = f.tiles.filter((q) => q.solid && q.kind === 'leaf' && q.opacity > 0.99).sort((a, b) => Math.hypot(a.x + f.view.dx - 560, a.y + f.view.dy - 380) - Math.hypot(b.x + f.view.dx - 560, b.y + f.view.dy - 380))[0]; window.__skinKit.setHover(t.key); S.host.setHover({ key: t.key, since: -9e6, x: 0, y: 0 }); adv(90); return t.key;` },
];

const results = [];
for (const sc of SCENES) {
  if (args.only && !args.only.split(',').includes(sc.id)) continue;
  const vp = sc.vp || [1440, 900];
  const s = await open({ w: vp[0], h: vp[1], dpr: DPR, mobile: !!sc.mobile, profile: sc.id });
  try {
    await setScene(s.page, { tick: sc.tick, lat: sc.lat, lng: sc.lng, zoom: sc.zoom, safe: !!sc.safe, shift: sc.shift || [0, 0], popups: !!sc.popups, tokens: sc.tokens || null, select: sc.select || null, style: STYLE, variant: VARIANT, steps: 150 });
    let extra = null;
    if (sc.after) extra = await s.page.evaluate(`(async () => { const S = window.__studio; const E = S.engine; const adv = globalThis.__advance; ${sc.after} })()`);
    await s.page.evaluate(() => globalThis.__ground.whenIdle(20000)); await s.page.evaluate(() => globalThis.__advance(24));
    const chk = await s.page.evaluate(CHECK_JS);
    const file = path.join(OUT, sc.file + SUFFIX + '.png'); await shot(s.page, file);
    const cw = sc.crop ? sc.crop[0] : 600; const ch = sc.crop ? sc.crop[1] : 400; const box = await s.page.evaluate(BUSIEST_JS(Math.min(cw, vp[0]), Math.min(ch, vp[1] - 200)));
    await shot(s.page, path.join(OUT, sc.file + SUFFIX + '-crop.png'), { clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
    if (['s1a', 's4'].includes(sc.id)) execFileSync('python', [path.join(D1, 'tools', 'zoom200.py'), path.join(OUT, sc.file + SUFFIX + '-crop.png'), path.join(OUT, sc.file + SUFFIX + '-crop-200pct.png')], { stdio: 'inherit' });      // the busiest 600 x 400 magnified to 200 %, nearest neighbour: every edge can be inspected
    const row = { scene: sc.id, file: path.relative(D1, file).split(path.sep).join('/'), vp, dpr: DPR, tick: sc.tick, zoom: sc.zoom, ...chk, crop: box, cards: await s.page.evaluate(() => window.__studio.cardStats ? { frames: window.__studio.cardStats.frames, over: window.__studio.cardStats.over } : null), errors: s.errors.filter((e) => !/404/.test(e)), external: s.requests, extra: typeof extra === 'string' ? extra : null };
    results.push(row); console.log(JSON.stringify({ scene: row.scene, marks: row.marks, inView: row.inView, units: row.units, aggregates: row.aggregates, merged: row.unitsInAggregates, coreOverlaps: row.coreOverlaps, pinCovered: row.pinCovered, unrep: row.unrepresented, inMargin: row.inMargin, minClear: row.minClear, engineOverlaps: row.engineOverlaps, crop: `${box.x},${box.y} (${box.marks} marks)`, errors: row.errors.length, external: row.external.length }));
  } finally { await s.close(); }
}
await stopServer();
fs.mkdirSync(path.join(D1, 'results'), { recursive: true });
const rf = path.join(D1, 'results', `scene-checks${SUFFIX}.json`); const prev = args.only && fs.existsSync(rf) ? JSON.parse(fs.readFileSync(rf, 'utf8')).filter((r) => !results.some((q) => q.scene === r.scene)) : [];
fs.writeFileSync(rf, JSON.stringify([...prev, ...results], null, 1));
