// Sample bank: turns a sound id + variant into a mono Float32Array, deterministically, by calling the procedural synthesis (or, in the browser, by returning a decoded
// recording slice when one is registered for the id). Buffers are cached by (soundId, variant, sampleRate). Seeds come from hashing the id and variant, never from Math.random.
import { SOUNDS } from './catalog.mjs';
import { strSeed, hash3 } from './rng.mjs';
import { commandPhrase } from './synth-voice.mjs';
import { bugleCall } from './synth-music.mjs';

export function createBank({ sr = 44100, data = {}, recordings = null } = {}) {
  const cache = new Map();
  const state = { data, recordings };                  // data: { commands, calls }; recordings: Map soundId -> [{ buf: Float32Array, ledgerId }]
  const seedOf = (soundId, variant) => hash3(strSeed(soundId), variant, 1863);

  function synth(soundId, variant) {
    const s = SOUNDS[soundId], seed = seedOf(soundId, variant), { fn, kind } = s.synth;
    switch (soundId) {
      case 'crowd.cheer': case 'crowd.yell': case 'crowd.roar': return fn(sr, seed, { n: 20, kind });
      case 'voice.command': { const ph = (state.data.commands?.phrases || [])[variant % Math.max(1, (state.data.commands?.phrases || []).length)]; if (!ph) return null; const r = commandPhrase(sr, ph.words, { seed, gaps: ph.gaps, f0: 135 + (variant % 3) * 18 }); return { ...r, phraseId: ph.id }; }
      case 'signal.bugle': { const call = (state.data.calls?.bugle || []).find((c) => c.notation && c.notation.length); if (!call) return null; return bugleCall(sr, call.notation, { tempo: call.tempo || 90, seed }); }
      case 'signal.drum': return fn(sr, seed, 2.5);
      case 'flight.smoothbore': case 'flight.rifled': return fn(sr, seed, kind, 2.0);
      case 'move.hooves': return fn(sr, seed, { gait: ['walk', 'trot', 'canter', 'gallop'][variant % 4], horses: 8, seconds: 4 });
      case 'move.wheels': return fn(sr, seed, 6, { teams: 1 + (variant % 2) });
      case 'move.feet': return fn(sr, seed, { men: 40, stepsPerMin: [90, 110, 165][variant % 3], seconds: 5 });
      case 'horse.whinny': case 'horse.snort': return fn(sr, seed);
      case 'amb.insects': return fn(sr, seed, 12, { tF: 68, n: 9 });
      case 'amb.birds': return fn(sr, seed, 14, { density: 0.5 });
      case 'amb.rain': return fn(sr, seed, 10, 0.5);
      case 'amb.wind': return fn(sr, seed, 12, 2);
      case 'amb.thunder': return fn(sr, seed, 9, 0.5 + 0.2 * (variant % 3));
      default: return fn(sr, seed, kind);
    }
  }
  /** Returns { buf, mainAtSamples, loop, provenance } or null when the sound cannot be made (e.g. a bugle call with no transcribed notation). */
  function get(soundId, variant = 0, extra = {}) {
    const key = `${soundId}#${variant}@${sr}${extra.words ? '|' + extra.words.join(' ') : ''}${extra.call ? '|' + extra.call : ''}`; if (cache.has(key)) return cache.get(key);
    let out = null;
    if (soundId === 'voice.command' && extra.words && extra.words.length) { const r = commandPhrase(sr, extra.words, { seed: seedOf(soundId, variant), f0: 135 + (variant % 3) * 18, gaps: extra.words.map(() => 0.12) }); out = { ...r, provenance: { synthesized: true } }; cache.set(key, out); return out; }
    const rec = state.recordings && (state.recordings.get(extra.call ? `${soundId}:${extra.call}` : soundId) || (extra.call ? null : state.recordings.get(soundId)));
    if (rec && rec.length) { const r = rec[variant % rec.length]; out = { buf: r.buf, mainAtSamples: r.mainAtSamples || 0, loop: false, provenance: { ledgerId: r.ledgerId } }; }
    else if (soundId === 'signal.bugle' && extra.call && !rec) { out = null; }
    else { const r = synth(soundId, variant); if (r) out = { ...r, provenance: { synthesized: true } }; }
    cache.set(key, out); return out;
  }
  return { sr, get, setData(d) { state.data = d; cache.clear(); }, setRecordings(r) { state.recordings = r; cache.clear(); }, count: () => cache.size, clear: () => cache.clear() };
}
