// Deterministic, integer-mixing random numbers for the sound engine (same family as sim/rng.mjs: a replay of the same events sounds identical).
// Self-contained so the audio module can be shipped without the sim folder.
export function fmix32(h) { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; }
export function hash3(a, b, c) {
  let h = fmix32((a >>> 0) ^ 0x9e3779b9);
  h = fmix32(((h ^ (b >>> 0)) + 0x7f4a7c15) >>> 0);
  return fmix32(((h ^ (c >>> 0)) + 0x94d049bb) >>> 0);
}
/** Uniform [0,1) addressed by (seed, a, b): no state, so any draw is reproducible out of order. */
export const unit = (seed, a = 0, b = 0) => hash3(seed, a, b) / 4294967296;
/** Sequential generator (mulberry32) for buffers: same seed gives the same Float32 samples on every engine. */
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  next.gauss = () => { const u = Math.max(next(), 1e-12), v = next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return next;
}
/** Stable 32-bit hash of a string (ids such as unit ids and sound ids) so a string id can seed a stream. */
export function strSeed(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
