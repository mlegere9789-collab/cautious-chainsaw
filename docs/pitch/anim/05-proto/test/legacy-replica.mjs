// A transcription of the SHIPPED animation semantics (release/R1c: group B's y1 + F4 interpolation and the Ed playback accumulator), so it can be replayed on the real data in Node.
// Fidelity is checked against the real y1 of the built bundle in the browser (test/replica-check.mjs); the Ed frame sequence is transcribed from the minified text:
//   let st=H,ut=0; if(l){const Pe=cF/R; if(Hc+=ze,Hc>=Pe){const ht=Math.floor(Hc/Pe); Hc=Hc%Pe; const it=Math.min(H+ht,s2); if(it!==H&&(...,x({currentTick:it}),...)){...return} ut=Hc/Pe}else ut=Hc/Pe} ... y1(he,st,ut)
// i.e. `st` is the tick read at the START of the frame: on the frame that advances the tick it is still the old tick while `ut` is already the fraction of the new one.
export function makeReplica(byTick, units) {
  const keyed = {};                                                                  // tick -> unit -> record (the last record of a tick wins, like i2[...] = R in order)
  for (const t of Object.keys(byTick)) { keyed[t] = {}; for (const r of byTick[t]) keyed[t][r.unit_id] = r; }
  const kf = {};                                                                     // unit -> sorted keyframe ticks
  for (const t of Object.keys(keyed).map(Number).sort((a, b) => a - b)) for (const id of Object.keys(keyed[t])) (kf[id] ||= []).push(t);
  const latest = (id, f) => { const a = kf[id]; let lo = -1; if (!a) return null; for (let k = 0; k < a.length; k++) { if (a[k] <= f) lo = k; else break; } return lo < 0 ? null : keyed[a[lo]][id]; };
  const ease = (disp, x) => disp === 'Charging Line' ? x * x : disp === 'Chaotic Retreat' ? 1 - (1 - x) * (1 - x) : disp === 'Line of March' ? x : x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  function legacyPos(id, f, x) {                                                     // y1(c, f, x) for one unit: [lng, lat] or null (not drawn)
    const R = latest(id, f), P = keyed[f + 1] && keyed[f + 1][id];
    if (!R) return (P && x >= .5) ? [P.lng, P.lat] : null;                           // a unit that first appears at f+1 is pushed in at x >= .5, half a tick early
    const M = keyed[f] && keyed[f][id];
    if (!(x > 0) || !M || !P) return [R.lng, R.lat];                                 // interpolation only between consecutive ticks that both hold a record of the unit
    if (Math.abs(R.lat - P.lat) + Math.abs(R.lng - P.lng) > .05) return x < .5 ? [R.lng, R.lat] : [P.lng, P.lat];
    const z = ease(R.disposition !== P.disposition ? P.disposition : R.disposition, x);
    return [R.lng + (P.lng - R.lng) * z, R.lat + (P.lat - R.lat) * z];
  }
  function* shippedFrames(frameMs = 1000 / 60, speed = 8) {
    const Pe = 500 / speed; let H = 1, Hc = 0;
    for (let n = 0; n < 200000 && H < 675; n++) {
      Hc += frameMs; let st = H, ut = 0;
      if (Hc >= Pe) { const ht = Math.floor(Hc / Pe); Hc = Hc % Pe; const it = Math.min(H + ht, 675); ut = Hc / Pe; if (it !== H) { yield { st, ut, fresh: it }; H = it; continue; } }
      else ut = Hc / Pe;
      yield { st, ut, fresh: st };
    }
  }
  return { keyed, legacyPos, shippedFrames };
}
