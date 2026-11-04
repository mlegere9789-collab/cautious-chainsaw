import { makeEngine } from '../../src/headless.mjs'; import { QUIET_NIGHT, QUIET_DAY } from '../../src/skins/quiet-cartographer.mjs';
const e = makeEngine({ start: { tick: 551, lat: 39.8117, lng: -77.2347, zoom: 16 }, viewport: { w: 1440, h: 900 } });
for (const s of [...QUIET_NIGHT, ...QUIET_DAY]) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer'); e.tuning.set('layout.labels', false);
for (let i = 0; i < 90; i++) e.step(16.667);
const id = process.argv[2] || 'C-53VA'; const f0 = e.frame; const t0 = f0.tiles.find((t) => t.ids[0] === id && t.kind === 'leaf'); console.log('before', t0 && { w: t0.w, name: t0.unit.label, disp: t0.displaced, live: t0.life });
e.select(id); for (let i = 0; i < 80; i++) e.step(16.667); const t1 = e.frame.tiles.find((t) => t.ids.includes(id)); console.log('after', t1 && { kind: t1.kind, w: t1.w, selected: t1.selected, n: t1.n });
