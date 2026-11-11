// Counter-based deterministic RNG (PDF D.3.2 "Determinism"): every draw is addressed by (runSeed, agentId, timeBucket, stream),
// so any agent's state at any time is computable and repeatable without replaying from the start. Integer-only mixing (Math.imul, >>> 0)
// so results are bit-identical on every machine/engine (no floating-point state).
export function fmix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16; return h >>> 0;
}
export function hash4(a, b, c, d) {
  let h = fmix32((a >>> 0) ^ 0x9e3779b9);
  h = fmix32(((h ^ (b >>> 0)) + 0x7f4a7c15) >>> 0);
  h = fmix32(((h ^ (c >>> 0)) + 0x94d049bb) >>> 0);
  h = fmix32(((h ^ (d >>> 0)) + 0xbf58476d) >>> 0);
  return h;
}
// uniform [0,1) with 32-bit resolution
export function rand(seed, agent, bucket, stream = 0) { return hash4(seed, agent, bucket, stream) / 4294967296; }
// standard normal via Box-Muller from two streams (deterministic)
export function randn(seed, agent, bucket, stream = 0) {
  const u1 = Math.max(rand(seed, agent, bucket, stream * 2 + 1), 1e-12), u2 = rand(seed, agent, bucket, stream * 2 + 2);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
// stable 32-bit id from a string (unit ids etc.)
export function strId(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return fmix32(h); }
