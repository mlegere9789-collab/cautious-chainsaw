// Adapter between the animation event bus (src/anim3d/events.mjs, documented in docs/BT-EVENTS.md) and the sound engine.
//   attachAudio(audio, bus) subscribes to fire, reload, command, unit_march and fall and turns them into engine events. It returns { stats, detach }.
// Vectors from the bus are reused between calls (BT-EVENTS 1): they are copied here. Events the engine does not consume are listed in NOT_CONSUMED.
// Time t is the theatre clock in simulation seconds (minutes * 60); the engine uses it as battle seconds unchanged.
export const NOT_CONSUMED = Object.freeze([
  'misfire (no rate is documented; the engine has a gain flag for a cap pop but the adapter does not emit it until a scenario sets a rate)',
  'drill_step', 'footfall (per-figure near-set footfalls: the unit_march bed carries the sound)', 'hoofbeat', 'gun (limber and unlimber carry no position)', 'lie', 'activity',
]);
const MOUNTED = new Set(['walk', 'trot', 'canter', 'gallop']);
const HOOF_VARIANT = { walk: 0, trot: 1, canter: 2, gallop: 3 };
const copy3 = (v) => [v[0], v[1], v[2]];

export function attachAudio(audio, bus, { nearHandlingM = 60 } = {}) {
  const stats = { fire: 0, reloadSounded: 0, reloadSkippedFar: 0, command: 0, march: 0, fall: 0 };
  const near = (t, p) => { const l = audio.planner.listenerAt(t).pos; return Math.hypot(p[0] - l[0], p[2] - l[2]) <= nearHandlingM; };
  const h = {
    fire: (unitId, figureIdx, t, kind, pos, dir, info) => { stats.fire++; audio.onFire(unitId, figureIdx, t, kind, copy3(pos), copy3(dir), info ? { weaponId: info.weaponId, cycleIndex: info.cycleIndex, round: info.round } : null); },
    reload: (unitId, figureIdx, t, step, stepIndex, durationS, pos, info) => {
      const p = copy3(pos); if (!near(t, p)) { stats.reloadSkippedFar++; return; }
      stats.reloadSounded++; audio.onEvent({ type: 'handling', id: (figureIdx * 131 + stepIndex) ^ Math.round(t * 1000), unitId, t, step, x: p[0], y: p[1], z: p[2], seed: figureIdx });
    },
    command: (unitId, officerIdx, t, kind, text, pos, info) => {
      stats.command++; const p = copy3(pos), id = (officerIdx * 977) ^ Math.round(t * 1000);
      if (kind === 'bugle') audio.onEvent({ type: 'signal', instrument: 'bugle', call: text, id, unitId, t, x: p[0], y: p[1], z: p[2] });
      else if (kind === 'drum') audio.onEvent({ type: 'signal', instrument: 'drum', call: text, id, unitId, t, x: p[0], y: p[1], z: p[2] });
      else audio.onEvent({ type: 'command', id, unitId, t, text, x: p[0], y: p[1], z: p[2], commandKind: kind });
    },
    unit_march: (unitId, t, n, stepsPerMin, speedMs, centroid, heading, gait) => {
      stats.march++; const mounted = MOUNTED.has(gait), c = copy3(centroid), v = [Math.sin(heading) * speedMs, 0, Math.cos(heading) * speedMs];
      audio.onEvent({ type: 'march', id: (String(unitId).length * 7919) ^ Math.round(t * 10), unitId, t, men: n, mounted, vel: v, variant: mounted ? HOOF_VARIANT[gait] : stepsPerMin <= 100 ? 0 : stepsPerMin <= 130 ? 1 : 2, x: c[0], y: c[1], z: c[2] });
    },
    fall: (unitId, figureIdx, t, style, pos, info) => { stats.fall++; const p = copy3(pos); audio.onEvent({ type: 'fall', id: (figureIdx * 7907) ^ Math.round(t * 1000), unitId, t, style, x: p[0], y: p[1], z: p[2], seed: figureIdx }); },
  };
  const names = Object.keys(h); for (const n of names) bus.on(n, h[n]);
  return { stats, detach() { for (const n of names) bus.off(n, h[n]); } };
}
