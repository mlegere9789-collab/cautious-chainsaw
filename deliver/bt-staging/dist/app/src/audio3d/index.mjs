// Public API of the Battle Theatre spatial sound engine (src/audio3d). See docs/AUDIO3D-NOTES.md.
//
//   const audio = await createAudio3D({ baseUrl, search, ctx });      // ctx optional: without it the engine only plans (tests, headless)
//   audio.onFire(unitId, figureIdx, t, weaponKind, position, direction) // the FX / animation fire-event interface (BT-EVENTS.md)
//   audio.onEvent({ type: 'burst' | 'impact' | 'crowd' | 'command' | 'signal' | 'move', ... })
//   audio.update({ battleNow, warp, listener, weather, sun })           // every frame (cheap) : listener pose + environment state
//   audio.pump()                                                        // plan + budget + schedule everything whose arrival is inside the look-ahead
//   audio.panel()   audio.badge()   audio.status()                      // 'What is in this build', the PDF marking (per DEC-001 flag), the honest voice line
import { createPlanner, planBatch, DEFAULT_BUDGET } from './planner.mjs';
import { createBank } from './bank.mjs';
import { Audio3DEngine } from './webaudio.mjs';
import { atmosphereFromWeather, ambientState } from './atmosphere.mjs';
import { makeTerrain } from './terrain.mjs';
import { makeWoodsMask } from './woods.mjs';
import { resolveFamilies, SOUNDS } from './catalog.mjs';
import { buildPanel, resolveMode, modeFromSearch, audioBadge, onSoundMark, AUDIO_CONFIG, LABEL_MODES } from './provenance.mjs';
import { hash3, strSeed } from './rng.mjs';

export * from './physics.mjs';
export { makeWoodsMask };
export { createPlanner, planBatch, DEFAULT_BUDGET, createBank, Audio3DEngine, atmosphereFromWeather, ambientState, makeTerrain, resolveFamilies, SOUNDS, buildPanel, audioBadge, onSoundMark, AUDIO_CONFIG };

async function loadJson(baseUrl, name, fetchFn) { try { const r = await fetchFn(new URL(name, baseUrl).href); return r.ok === false ? null : await r.json(); } catch { return null; } }

export async function createAudio3D({ baseUrl = new URL('../../data/audio3d/', import.meta.url).href, search = '', ctx = null, T = null, fetchFn = globalThis.fetch, data = null, budget = {}, seed = 1863, woods = undefined } = {}) {
  const d = data || { sources: await loadJson(baseUrl, 'sources.json', fetchFn), commands: await loadJson(baseUrl, 'commands.json', fetchFn), calls: await loadJson(baseUrl, 'calls.json', fetchFn) };
  const sourcesById = Object.fromEntries(((d.sources && d.sources.sources) || []).map((s) => [s.ledgerId, s]));
  const first = resolveMode(modeFromSearch(search)); let mode = first.mode, override = first.override;
  // woods mask (AUD-G08): `woods` = a woods-mask.json object, false to switch it off, or undefined to load data/audio3d/woods-mask.json when the terrain can convert lon/lat (T.xz)
  const woodsData = woods === false || !T || typeof T.xz !== 'function' ? null : (woods || await loadJson(baseUrl, 'woods-mask.json', fetchFn));
  const woodsMask = woodsData ? makeWoodsMask(woodsData, (lng, lat) => T.xz(lng, lat)) : null;
  const terrain = T ? makeTerrain({ heightAt: (x, z) => T.h(x, z), woodsAt: woodsMask ? woodsMask.woodsAt : null, extent: { halfW: T.W / 2, halfH: T.H / 2 } }) : null;
  const bank = createBank({ sr: ctx ? ctx.sampleRate : 44100, data: d });
  const planner = createPlanner({ terrain, budget, seed });
  const engine = ctx ? new Audio3DEngine({ ctx, bank, planner, labelMode: mode, budget }) : null;
  const queue = []; const loaded = new Set(); let battleNow = 0, warp = 1, lastAlloc = null, env = { atm: null, amb: null };
  const api = {
    get mode() { return mode; }, get override() { return override; }, planner, bank, engine, terrain, woods: woodsMask, data: d,
    /** DEC-001 as an in-page setting: switch the labelling between 'pdf' (badge and per-sound tags) and 'panel-only' (nothing on the sound; the panel is identical). Unknown values change nothing. Returns the effective mode. The host decides whether to remember the choice. */
    setLabelMode(m) { if (m !== 'pdf' && m !== 'panel-only') return mode; mode = m; override = m !== AUDIO_CONFIG.labelMode; if (engine) engine.labelMode = m; return mode; },
    /** The options of the setting for a UI: ids, texts, the current value, the shipped default and the decision that is still open. */
    labelSetting() { return { decision: AUDIO_CONFIG.decision, decisionStatus: AUDIO_CONFIG.decisionStatus, default: AUDIO_CONFIG.labelMode, current: mode, options: Object.entries(LABEL_MODES).map(([id, text]) => ({ id, text })) }; },
    /** Register decoded recordings (browser): Map soundId -> [{ buf: Float32Array, ledgerId, mainAtSamples }]. Marks their ledger ids as loaded for the panel. */
    setRecordings(map) { bank.setRecordings(map); loaded.clear(); for (const arr of map.values()) for (const r of arr) loaded.add(r.ledgerId); },
    onFire(unitId, figureIdx, t, weaponKind, position, direction, info = null) { const w = (info && info.weaponId) || weaponKind; queue.push({ type: 'fire', id: hash3(strSeed(String(unitId)), figureIdx >>> 0, Math.round(t * 1000) >>> 0), unitId, t, weapon: w, x: position[0], y: position[1], z: position[2], direction: [direction[0], direction[1], direction[2]], seed: (info && info.cycleIndex) || 0, round: info ? info.round : undefined, defaultedWeapon: !(info && info.weaponId) && weaponKind === 'cannon' }); },
    onEvent(e) { queue.push(e); },
    update({ battleNow: bn, warp: w = 1, listener, weather = null, sun = null, min = null } = {}) {
      battleNow = bn ?? battleNow; warp = w;
      if (listener) planner.setListener(listener);
      if (weather !== null || min !== null) { env.atm = atmosphereFromWeather(weather, min ?? bn / 60, { timeWarp: 1 }); planner.setAtmosphere(env.atm); env.amb = ambientState(weather, sun, env.atm); planner.setAmbientDb(env.amb.ambientFloorDb); }
      if (engine) engine.anchor(battleNow, warp);
    },
    pump(lookaheadS = 30) {
      if (!queue.length) return lastAlloc;
      const due = queue.filter((e) => e.t <= battleNow + lookaheadS); if (!due.length) return lastAlloc;
      for (const e of due) queue.splice(queue.indexOf(e), 1);
      const r = planBatch(planner, due); lastAlloc = r;
      if (engine) { for (const v of r.voices) engine.schedule(v); engine.scheduleFoldedBed(r.bed); }
      return r;
    },
    flush() { queue.length = 0; if (engine) engine.flush(); },
    families() { return resolveFamilies(sourcesById, loaded); },
    panel() { return buildPanel(api.families(), { mode, override, stats: api.status() }); },
    badge() { return audioBadge(mode); },
    status() { const s = lastAlloc ? lastAlloc.stats : planner.stats; return { voicesAlive: engine ? engine.voiceCount : null, individual: s.individual || 0, folded: s.folded || 0, stolen: s.stolen || 0, culledInaudible: s.culledInaudible || 0, text: lastAlloc ? lastAlloc.text : 'No shots sounded yet.', budget: planner.budget.maxVoices }; },
  };
  return api;
}

export { attachAudio, NOT_CONSUMED } from './bus-adapter.mjs';
export { loadRecordings, sliceShots, detectOnsets } from './loader.mjs';
