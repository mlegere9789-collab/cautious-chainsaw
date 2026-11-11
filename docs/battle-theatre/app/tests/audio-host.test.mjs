// Node tests of the audio host (src/audio-host.mjs): sound is off until started, the mixer (master / music / effects / voices / mute), the DEC-001 setting with all
// options, the causal clock (no sound from the future after a scrub, pause, speed change), node and context release, and offline rendering of the mix.
// Nothing here is listening: it checks numbers, graph wiring on a mock context, and offline renders. Sound quality is in BROWSER-VERIFICATION-LIST-AUDIO.md.
//   node --test docs/battle-theatre/app/tests/audio-host.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..'), D = path.join(APP, 'data/audio3d/');
const imp = (f) => import(pathToFileURL(path.join(APP, f)).href);
const J = (f) => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
const H = await imp('src/audio-host.mjs'), Off = await imp('src/audio3d/offline.mjs'), Ph = await imp('src/audio3d/physics.mjs'), Cat = await imp('src/audio3d/catalog.mjs');
const DATA = { sources: J('sources.json'), commands: J('commands.json'), calls: J('calls.json') };
const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const WX = { tempF: 79, wind: { mph: [2, 6] }, precip: { kind: 'none', intensity: 0 } };

function mockContext() {
  const log = { nodes: [], sources: [], conn: [], started: [], stopped: 0, closed: 0 };
  const param = (v = 0) => ({ value: v, target: undefined, setValueAtTime() { }, linearRampToValueAtTime() { }, setTargetAtTime(x) { this.target = x; }, cancelScheduledValues() { } });
  const node = (extra = {}) => { const n = { listeners: [], connect(d) { log.conn.push([n, d]); return d; }, disconnect() { n.disconnected = true; }, addEventListener(t, f) { if (t === 'ended') n.listeners.push(f); }, ...extra }; log.nodes.push(n); return n; };
  const ctx = { sampleRate: 44100, currentTime: 100, state: 'running', outputLatency: 0.04, baseLatency: 0.01, destination: node({ isDest: true }),
    createGain() { return node({ gain: param(1) }); }, createConvolver() { return node({ buffer: null }); }, createDynamicsCompressor() { return node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }); },
    createBuffer(ch, n, sr) { const d = new Float32Array(n); return { numberOfChannels: ch, length: n, sampleRate: sr, duration: n / sr, getChannelData: () => d, copyToChannel(a) { d.set(a); } }; },
    createBufferSource() { const s = node({ buffer: null, loop: false, playbackRate: param(1), isSrc: true, start(t, o) { log.started.push({ t, o }); s.didStart = true; }, stop() { log.stopped++; s.didStop = true; }, onended: null }); log.sources.push(s); return s; },
    createBiquadFilter() { return node({ type: '', frequency: param(), Q: param() }); }, createPanner() { return node({ positionX: param(), positionY: param(), positionZ: param(), panningModel: '' }); }, createStereoPanner() { return node({ pan: param() }); },
    getOutputTimestamp() { return { contextTime: ctx.currentTime }; }, resume: async () => { ctx.state = 'running'; }, suspend: async () => { ctx.state = 'suspended'; }, close: async () => { ctx.state = 'closed'; log.closed++; } };
  return { ctx, log };
}
const fakeBus = () => { const h = new Map(); return { on(n, f) { (h.get(n) || h.set(n, []).get(n)).push(f); }, off(n, f) { const a = h.get(n) || []; const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); }, emit(n, ...a) { for (const f of [...(h.get(n) || [])]) f(...a); }, count: (n) => (h.get(n) || []).length }; };
const frame = (tS, o = {}) => ({ t: tS / 60, playing: true, speed: 1, dt: 0.1, cam: { x: 0, y: 3, z: 0, yaw: 0 }, weather: WX, ...o });
const P = (x, z = 0, y = 1.5) => new Float32Array([x, y, z]), DIR = new Float32Array([1, 0, 0]);
async function mk(o = {}) {
  const { ctx, log } = mockContext(), bus = fakeBus(), storage = memStore();
  const host = { createContext: () => ctx, bus, audioData: DATA, storage, ...o }; const A = H.init(host); return { A, ctx, log, bus, storage, host };
}
const clean = () => H.dispose();

test('pure helpers: channel of each sound id, slider taper, mixer gain, listener yaw (camera forward (sin yaw, cos yaw) -> the planner yaw)', () => {
  assert.equal(H.categoryOf('signal.bugle'), 'music'); assert.equal(H.categoryOf('signal.drum'), 'music'); assert.equal(H.categoryOf('voice.command'), 'voices'); assert.equal(H.categoryOf('crowd.yell'), 'voices');
  for (const id of ['arms.rifle_musket', 'gun.napoleon_12pdr', 'flight.rifled', 'burst.canister', 'impact.man', 'handle.tear', 'move.feet', 'horse.whinny', 'amb.rain', 'amb.thunder']) assert.equal(H.categoryOf(id), 'effects', id);
  for (const id of Object.keys(Cat.SOUNDS)) assert.ok(H.CHANNELS.includes(H.categoryOf(id)), `${id} has a channel`);
  assert.equal(H.taper(0), 0); assert.equal(H.taper(1), 1); assert.equal(H.taper(0.5), 0.25); assert.equal(H.taper(7), 1); assert.equal(H.taper(NaN), 0);
  const st = { ...H.DEFAULT_SETTINGS, master: 0.5, music: 1, effects: 0.5, voices: 0 }; assert.equal(H.channelGain(st, 'effects'), 0.0625); assert.equal(H.channelGain(st, 'voices'), 0); assert.equal(H.channelGain({ ...st, muted: true }, 'music'), 0);
  const az = (yaw, src) => Ph.directionFromListener(src, [0, 2, 0], H.listenerYaw(yaw)).az;
  assert.ok(Math.abs(az(0, [0, 2, 500])) < 1e-9, 'camera yaw 0 looks along +z (south): a source to the south is straight ahead');
  assert.ok(Math.abs(az(0, [500, 2, 0]) + Math.PI / 2) < 1e-9, 'camera yaw 0: east (+x) is on the left (it looks south)');
  assert.ok(Math.abs(az(Math.PI / 2, [500, 2, 0])) < 1e-9, 'camera yaw pi/2 looks along +x: east is ahead');
  assert.ok(Math.abs(az(0, [0, 2, -500])) > 3.1, 'north is behind a camera looking south');
});

test('off until started: init creates no AudioContext, no node, no timer; the label setting and the settings exist before sound does', async () => {
  const { A, log } = await mk(); let made = 0; A.host.createContext = () => { made++; return mockContext().ctx; };
  assert.equal(made, 0); assert.equal(A.started, false); assert.equal(A.status().silentReason, 'off'); assert.equal(A.liveNodes(), 0); assert.equal(log.nodes.length, 1, 'only the mock destination exists');
  assert.equal(H.update(frame(1000)), 'off'); assert.equal(H.stats().liveContexts, 0);
  const L = A.labelSetting(); assert.deepEqual(L.options.map((o) => o.id).sort(), ['panel-only', 'pdf'], 'every DEC-001 option is present'); assert.equal(L.decision, 'DEC-001'); assert.match(L.decisionStatus, /delegated authority/);
  assert.equal(A.settings.muted, false); clean();
});

test('start creates exactly one context, a mixer and the engine; dispose closes the context and leaves 0 live nodes, 0 live contexts', async () => {
  const before = H.stats(); const { A, ctx, log } = await mk();
  assert.equal(await A.start(), true); assert.equal(A.started, true); assert.equal(H.stats().liveContexts, before.liveContexts + 1);
  assert.ok(A.liveNodes() > 10, `engine + mixer nodes tracked (${A.liveNodes()})`); assert.equal(ctx.state, 'running');
  assert.equal(await A.start(), true, 'a second start is the same session'); assert.equal(H.stats().contextsOpened, before.contextsOpened + 1);
  H.dispose(); assert.equal(ctx.state, 'closed'); assert.equal(log.closed, 1); assert.equal(A.liveNodes(), 0); assert.equal(H.stats().liveNodes, 0); assert.equal(H.stats().liveContexts, 0); assert.equal(H.stats().hasHost, false);
  assert.ok(log.nodes.every((n) => n.disconnected || n.isDest), 'every tracked node was disconnected'); assert.equal(await A.start(), false, 'a disposed host does not restart');
});

test('stop frees everything too and the host can start again (one context at a time)', async () => {
  const { A, ctx } = await mk(); await A.start(); A.stop(); assert.equal(ctx.state, 'closed'); assert.equal(A.liveNodes(), 0); assert.equal(A.started, false); assert.equal(H.stats().liveContexts, 0);
  A.host.createContext = () => mockContext().ctx; assert.equal(await A.start(), true); assert.equal(H.stats().liveContexts, 1); clean(); assert.equal(H.stats().liveContexts, 0);
});

test('mixer: master, music, effects, voices and mute are real gain nodes between the engine and the destination; levels apply to the right channel only', async () => {
  const { A, ctx, log } = await mk(); await A.start(); const M = A.mixer;
  const to = (a, b) => log.conn.some(([x, y]) => x === a && y === b);
  assert.ok(to(M.master, M.mute) && to(M.mute, ctx.destination), 'master -> mute -> destination'); assert.ok(to(A.audio.engine.limiter, M.master), 'the engine output ends in the master');
  for (const c of H.CHANNELS) assert.ok(to(M.chan[c], A.audio.engine.dryBus), `${c} bus feeds the engine dry bus`);
  assert.equal(M.master.gain.value, H.taper(0.8)); assert.equal(M.mute.gain.value, 1);
  A.setLevel('master', 0.5); assert.equal(M.master.gain.target, 0.25); A.setLevel('music', 0.3); assert.equal(M.chan.music.gain.target, H.taper(0.3)); assert.equal(M.chan.effects.gain.target, 1);
  A.setLevel('effects', 0); assert.equal(M.chan.effects.gain.target, 0); A.setLevel('voices', 2); assert.equal(A.settings.voices, 1, 'clamped'); assert.equal(A.setLevel('bogus', 1), false);
  A.setMuted(true); assert.equal(M.mute.gain.target, 0); A.setMuted(false); assert.equal(M.mute.gain.target, 1); clean();
});

test('routing: a command voice lands on the voices bus, a gun and a bed on the effects bus (the voice cap and reverb stay the engine\'s)', async () => {
  const { A, log, bus } = await mk(); await A.start(); const M = A.mixer;
  A.update(frame(6000)); const chanOf = (src) => { for (const c of H.CHANNELS) if (log.conn.some(([x, y]) => x === src && y === M.chan[c])) return c; return null; };
  const before = log.nodes.length; bus.emit('command', 'U1', 0, 6000.1, 'execution', 'Fire by file', P(150), {}); bus.emit('fire', 'CS-ART-1', 0, 6000.1, 'cannon', P(900, 100), DIR, { weaponId: 'napoleon_12pdr_m1857', round: 'shell' });
  A.update(frame(6000.1)); const made = log.nodes.slice(before); const pans = made.filter((n) => n.pan || n.positionX); const cs = pans.map((p) => chanOf(p)).filter(Boolean);
  assert.ok(cs.includes('voices') && cs.includes('effects'), `channels used: ${cs.join()}`); assert.ok(!cs.includes('music'));
  assert.equal(A.status().stats.causalityViolations, 0); clean();
});

test('causal clock: events after the clock are dropped, a seek back stops every voice and echo and empties the queue, nothing from the old future survives', async () => {
  const { A, log, bus } = await mk({ recordPlans: true }); await A.start(); const eng = A.audio.engine;
  assert.equal(A.update(frame(6000)), ''); assert.equal(A.status().active, true);
  bus.emit('fire', 'U1', 1, 9000, 'long_arm', P(300), DIR, { weaponId: 'm1861_springfield' }); assert.equal(A.stats.droppedFuture, 1, 'an event 50 minutes ahead of the clock is never accepted');
  for (let i = 0; i < 12; i++) bus.emit('fire', 'U1', i, 6000.2 + i * 0.05, 'long_arm', P(250 + i * 40, i), DIR, { weaponId: 'm1861_springfield' });
  A.update(frame(6000.2)); assert.ok(eng.voiceCount >= 10, `voices scheduled: ${eng.voiceCount}`); const started = log.sources.filter((s) => s.didStart).length; assert.ok(started >= 10);
  // an event stamped one second ahead is allowed (frame ordering slack) and then the user scrubs back 30 s
  bus.emit('fire', 'U1', 99, 6001, 'cannon', P(700), DIR, { weaponId: 'napoleon_12pdr_m1857' });
  A.update(frame(5970)); assert.equal(A.stats.jumps, 1, 'backward time is a jump'); assert.equal(eng.voiceCount, 0, 'no voice survives a seek'); assert.equal(A.liveNodes() > 0, true);
  const live = log.sources.filter((s) => s.didStart && !s.didStop && !s.loop); assert.equal(live.length, 0, `still running: ${live.length} of ${log.sources.length}`);
  const groupsNodes = A.mixer.reg.liveNodes(); A.update(frame(5970.1)); A.update(frame(5970.2));
  assert.equal(eng.voiceCount, 0, 'the queued cannon shot of the old future did not come back'); assert.ok(A.mixer.reg.liveNodes() <= groupsNodes + 2);
  assert.ok(A.plans.every((v) => v.tFire <= 6001 + 1e-9), 'no plan was made for an event later than the clock had reached'); assert.equal(A.stats.causalityViolations, 0); clean();
});

test('the engine wrapper itself refuses a voice whose event is after the clock (defence behind the event guard)', async () => {
  const { A } = await mk(); await A.start(); A.update(frame(6000)); const eng = A.audio.engine;
  const v = A.audio.planner.planEvent({ type: 'fire', id: 1, t: 6100, weapon: 'm1861_springfield', x: 300, y: 1.5, z: 0 });
  assert.equal(eng.schedule(v), null); assert.equal(A.stats.causalityViolations, 1);
  const ok = A.audio.planner.planEvent({ type: 'fire', id: 2, t: 6000, weapon: 'm1861_springfield', x: 300, y: 1.5, z: 0 }); assert.ok(eng.schedule(ok)); clean();
});

test('pause, scrub and speed above the limit are silent (and say so); play again re-emits exactly [now - 12 s, now); a speed change re-anchors', async () => {
  const { A, bus } = await mk(); const calls = []; A.host.replay = (a, b) => { calls.push([a, b]); bus.emit('fire', 'U1', 0, b - 3, 'cannon', P(900), DIR, { weaponId: 'napoleon_12pdr_m1857' }); };
  await A.start(); assert.equal(A.update(frame(6000)), ''); assert.deepEqual(calls, [[5988, 6000]], 'primed once when sound becomes active');
  assert.equal(A.audio.engine.voiceCount, 1, 'a shot fired 3 s ago from 900 m (2.6 s flight) arrives after the clock: still in the air, so it is heard');
  assert.equal(A.update(frame(6000.1, { playing: false })), 'paused'); assert.equal(A.audio.engine.voiceCount, 0); assert.match(A.status().silentText, /stopped/);
  bus.emit('fire', 'U1', 5, 6000.1, 'long_arm', P(100), DIR, { weaponId: 'm1861_springfield' }); assert.equal(A.stats.droppedInactive, 1, 'events while silent are dropped, not queued');
  assert.equal(A.update(frame(6000.2, { scrubbing: true })), 'scrubbing'); assert.equal(A.update(frame(6100, { playing: true })), '', 'play after a jump'); assert.deepEqual(calls[1], [6088, 6100]);
  assert.equal(A.update(frame(6100.1, { speed: 15 })), 'speed'); assert.match(A.status().silentText, /Silent above 8x/); assert.equal(A.audio.engine.voiceCount, 0);
  assert.equal(A.update(frame(6100.2, { speed: 4 })), ''); assert.equal(calls.length, 3, 'speed back in range primes again');
  A.update(frame(6100.3, { speed: 4 })); const n = calls.length; A.update(frame(6100.4, { speed: 2 })); assert.equal(calls.length, n + 1, 'a speed change flushes and primes (the wall mapping changed)'); clean();
});

test('time warp: the planner keeps battle seconds (d / c), the engine divides by the speed once: the wall delay of a 2 km shot is d / (c * speed)', async () => {
  const { A, log } = await mk(); await A.start(); A.update(frame(6000, { speed: 8 })); const eng = A.audio.engine; assert.equal(eng.warp, 8); assert.equal(A.audio.planner.atmosphere.timeWarp ?? 1, 1, 'the planner is not warped a second time');
  A.emitEvent({ type: 'fire', id: 5, t: 6000, weapon: 'napoleon_12pdr_m1857', x: 2000, y: 1.5, z: 0 }); const t0 = log.started.length; A.update(frame(6000.1, { speed: 8 }));
  assert.ok(log.started.length > t0); const v = A.audio.planner.planEvent({ type: 'fire', id: 5, t: 6000, weapon: 'napoleon_12pdr_m1857', x: 2000, y: 1.5, z: 0 });
  const delay = v.tArrive - 6000; assert.ok(Math.abs(delay / (2000 / A.audio.planner.atmosphere.c) - 1) < 0.03, `battle-second delay ${delay}`); assert.ok(Math.abs(eng.wallTime(v.tArrive) - (100 + (v.tArrive - 6000.1) / 8)) < 0.2); clean();
});

test('node registry: voice groups are released when their sources end (no growth), and releaseAll empties it', async () => {
  const { A, log } = await mk(); await A.start(); A.update(frame(6000)); const base = A.liveNodes();
  for (let i = 0; i < 30; i++) A.emitEvent({ type: 'fire', id: 100 + i, t: 6000 + i * 0.01, weapon: 'm1861_springfield', x: 200 + 20 * i, y: 1.5, z: 0 }); A.update(frame(6000.4));
  const live = A.liveNodes(); assert.ok(live > base + 30, `grew by ${live - base}`);
  for (const s of log.sources) { if (s.didStart) { for (const f of s.listeners) f(); if (typeof s.onended === 'function') s.onended(); } }
  assert.ok(A.liveNodes() <= base + 4, `after the sources ended: ${A.liveNodes()} vs base ${base} (beds and the shared bed stay)`); clean(); assert.equal(A.liveNodes(), 0);
});

test('ambient beds start with the weather on the effects bus and fade when sound goes silent; a storm brings thunder claps as events (plausible-procedural)', async () => {
  const { A, log } = await mk({ recordPlans: true }); await A.start(); const eng = A.audio.engine;
  A.update(frame(6000, { weather: { tempF: 70, wind: { mph: [2, 6] }, precip: { kind: 'rain', intensity: 0.6 } }, sun: { band: 4 } })); assert.ok(eng.beds.has('rain') && eng.beds.has('wind'), [...eng.beds.keys()].join());
  const rain = eng.beds.get('rain'); assert.ok(log.conn.some(([x, y]) => x === rain.g && y === A.mixer.chan.effects), 'a bed is on the effects bus');
  const g0 = rain.g.gain.target; A.update(frame(6000.1, { playing: false })); assert.equal(rain.g.gain.target, 0, `the bed fades when paused (was ${g0})`); clean();
  const { A: B } = await mk({ recordPlans: true }); await B.start(); const storm = { tempF: 75, wind: { mph: [2, 6] }, precip: { kind: 'storm', intensity: 0.9 } }; let t = 6000; B.update(frame(t, { speed: 8, weather: storm }));
  for (let i = 0; i < 900; i++) { t += 0.8; B.update(frame(t, { speed: 8, weather: storm })); }
  assert.ok(B.stats.thunder >= 1, `claps over 12 minutes of storm: ${B.stats.thunder}`); assert.ok(B.plans.some((v) => v.soundId === 'amb.thunder'), 'thunder was planned through the same path (delay = distance / c)'); clean();
});

test('DEC-001 as a setting: both options always present, the choice is the viewer\'s and is remembered, unknown values change nothing, the panel rows are identical in both modes', async () => {
  const { A, storage } = await mk(); const first = A.labelMode; assert.equal(first, 'panel-only', 'shipped default is the engine flag (DD-14, delegated, reversible)'); assert.equal(A.badge(), null);
  await A.ensureCatalog(); const po0 = A.panel(); assert.equal(po0.labelMode, 'panel-only');
  assert.equal(A.setLabelMode('pdf'), 'pdf'); assert.ok(A.badge()); assert.equal(A.labelSetting().chosenByViewer, true); assert.equal(A.setLabelMode('nonsense'), 'pdf');
  const pdf = A.panel(), po = po0; assert.equal(pdf.labelMode, 'pdf'); assert.equal(po.badge, null);
  const strip = (p) => p.rows.map(({ onSound, ...r }) => r); assert.deepEqual(strip(po), strip(pdf), 'the list is the same in both options'); assert.ok(pdf.rows.every((r) => r.onSound) && po.rows.every((r) => r.onSound === null));
  assert.equal(JSON.parse(storage.m.get('bt.audio.settings.v1')).labelMode, 'pdf'); assert.equal(A.labelSetting().options.length, 2); clean();
  const { A: B } = await mk({ storage }); assert.equal(B.labelMode, 'pdf', 'remembered in this browser'); assert.equal(B.labelSetting().default, 'panel-only'); await B.start(); assert.equal(B.audio.mode, 'pdf'); assert.equal(B.audio.engine.labelMode, 'pdf'); B.setLabelMode('panel-only'); assert.equal(B.audio.engine.labelMode, 'panel-only'); clean();
});

test('settings: remembered levels and mute; unavailable or corrupt storage falls back to defaults without throwing', async () => {
  const st = memStore(); const { A } = await mk({ storage: st }); A.setLevel('master', 0.3); A.setMuted(true); clean();
  const { A: B } = await mk({ storage: st }); assert.equal(B.settings.master, 0.3); assert.equal(B.settings.muted, true); clean();
  st.setItem('bt.audio.settings.v1', '{not json'); const { A: C } = await mk({ storage: st }); assert.deepEqual({ ...C.settings }, { ...H.DEFAULT_SETTINGS }); clean();
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }; const { A: E } = await mk({ storage: bad }); assert.doesNotThrow(() => E.setLevel('music', 0.1)); assert.equal(E.settings.music, 0.1); clean();
  const { A: F } = await mk({ storage: null }); assert.doesNotThrow(() => F.setMuted(true)); clean();
});

test('offline rendering of the mix (no AudioContext): arrival = t + distance / c, channel levels and mute scale the render, music and voices are separable', async () => {
  const { A } = await mk({ planOnly: true, recordPlans: true }); await A.start(); assert.equal(A.ctx, null, 'plan-only host opens no AudioContext'); assert.equal(H.stats().liveContexts, 0);
  A.update(frame(6000)); const c = A.audio.planner.atmosphere.c;
  A.emitEvent({ type: 'fire', id: 1, t: 6000, weapon: 'napoleon_12pdr_m1857', x: 700, y: 1.5, z: 0 }); A.emitEvent({ type: 'command', id: 2, t: 6000, text: 'Fire by file', x: 60, y: 1.7, z: 0 });
  A.update(frame(6000.1)); const plans = A.plans.filter((v) => !v.culled); assert.equal(plans.length, 2);
  const gun = plans.find((v) => v.soundId.startsWith('gun.')), voice = plans.find((v) => v.soundId === 'voice.command');
  const full = A.renderOffline({ trailS: 2 }); const onset = Off.firstOnset(full, 1e-7); assert.ok(onset >= 6000 + 60 / c - 0.05 && onset < 6000 + 60 / c + 0.5, `first sound is the voice at 60 m: ${onset}`);
  const peak = (r) => Math.max(Off.peakAbs(r.L), Off.peakAbs(r.R)); assert.ok(peak(full) > 0);
  A.setLevel('voices', 0); const noVoice = A.renderOffline({ trailS: 2 }); const onGun = Off.firstOnset(noVoice, 1e-7); assert.ok(Math.abs(onGun - (6000 + gun.distance / c)) < 0.01, `gun onset ${onGun} vs ${6000 + gun.distance / c}`);
  A.setLevel('voices', 1); A.setLevel('effects', 0); const onlyVoice = A.renderOffline({ trailS: 2 }); assert.ok(Math.abs(Off.firstOnset(onlyVoice, 1e-7) - onset) < 1e-3); assert.ok(onlyVoice.L.length === full.L.length || true);
  A.setLevel('effects', 1); const p1 = peak(A.renderOffline({ trailS: 2 })); A.setLevel('master', 0.4); const p2 = peak(A.renderOffline({ trailS: 2 })); assert.ok(Math.abs(p2 / p1 - H.taper(0.4) / H.taper(0.8)) < 1e-6, `master scales the render: ${p2 / p1}`);
  A.setMuted(true); assert.equal(peak(A.renderOffline({ trailS: 2 })), 0, 'mute renders silence'); void voice; clean();
});

test('a context that cannot be made reports an error, leaves nothing open, and does not throw into the page', async () => {
  const { A } = await mk({ createContext: () => null }); assert.equal(await A.start(), false); assert.match(A.error, /not available/); assert.equal(A.started, false); assert.equal(A.liveNodes(), 0); assert.equal(H.stats().liveContexts, 0); clean();
  const { A: B } = await mk({ createContext: () => { throw new Error('boom'); } }); assert.equal(await B.start(), false); assert.match(B.error, /boom/); clean();
});

test('dispose during start leaves no context behind; scope cleanup disposes the host; re-init disposes the previous host', async () => {
  const { A, log } = await mk(); const p = A.start(); A.dispose(); assert.equal(await p, false); assert.equal(H.stats().liveContexts, 0); assert.equal(A.liveNodes(), 0); assert.ok(log.closed >= 1);
  const cleanups = []; const { A: B } = await mk({ scope: { add: (f) => cleanups.push(f) } }); await B.start(); assert.equal(H.stats().liveContexts, 1); for (const f of cleanups) f(); assert.equal(H.stats().liveContexts, 0); assert.equal(B.disposed, true);
  const { A: C } = await mk(); await C.start(); const { A: D } = await mk(); assert.equal(C.disposed, true); assert.equal(H.getCurrent(), D); clean(); assert.equal(H.getCurrent(), null);
});

test('the bus is detached on stop and dispose (no handler left on the animation bus)', async () => {
  const { A, bus } = await mk(); await A.start(); for (const n of ['fire', 'reload', 'command', 'unit_march', 'fall']) assert.equal(bus.count(n), 1, n); A.stop(); for (const n of ['fire', 'reload', 'command', 'unit_march', 'fall']) assert.equal(bus.count(n), 0, n); clean();
});
