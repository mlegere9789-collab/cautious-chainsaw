// Recording loader (browser) and the deterministic slicer. Recordings are decoded with decodeAudioData, cut into single shots at onsets, and registered with the bank under a sound id
// together with their ledger id, so the panel can say exactly which recordings are in the running build. Nothing is fetched unless the page calls loadRecordings():
// the default build loads none and plays synthesis only (listed honestly by the panel). Only ledger entries with shippable = true are ever loaded.
import { rmsOf } from './dsp.mjs';

/** Onsets of impulsive events: frames of `hopMs` whose RMS jumps above `ratio` times the running floor. Returns sample indices. Deterministic. */
export function detectOnsets(buf, sr, { hopMs = 5, ratio = 6, floor = 1e-4, minGapS = 0.15 } = {}) {
  const hop = Math.max(8, Math.round(hopMs * sr / 1000)), out = []; let prev = floor, last = -1e9;
  for (let i = 0; i + hop < buf.length; i += hop) { const r = Math.max(rmsOf(buf, i, i + hop), 1e-9); if (r > floor && r > ratio * prev && (i - last) / sr >= minGapS) { out.push(i); last = i; } prev = 0.9 * prev + 0.1 * r; }
  return out;
}
/** Cut `buf` into slices of `lenS` seconds starting `preS` before each onset, with a short fade-out, normalized to peak 1; keeps at most `max`. */
export function sliceShots(buf, sr, { lenS = 1.2, preS = 0.01, max = 8, ...o } = {}) {
  return detectOnsets(buf, sr, o).slice(0, max).map((on) => {
    const a = Math.max(0, on - Math.round(preS * sr)), b = Math.min(buf.length, a + Math.round(lenS * sr)), s = buf.slice(a, b), n = Math.min(s.length, Math.round(0.03 * sr));
    for (let i = 0; i < n; i++) s[s.length - 1 - i] *= i / n;
    let pk = 0; for (const x of s) pk = Math.max(pk, Math.abs(x)); if (pk > 0) for (let i = 0; i < s.length; i++) s[i] /= pk;
    return { buf: s, mainAtSamples: on - a };
  });
}
/** Which sound ids a ledger family feeds. */
export const FAMILY_TO_SOUND = Object.freeze({
  small_arms: ['arms.rifle_musket', 'arms.smoothbore_musket'],
  artillery_report: ['gun.napoleon_12pdr', 'gun.rifle_3in', 'gun.parrott_10pdr', 'gun.parrott_20pdr', 'gun.howitzer_12pdr', 'gun.howitzer_24pdr'],
});

/**
 * Browser only. Fetch and decode the shippable recordings of the ledger entries named in `ledgerIds`, slice shots, and return the Map for bank.setRecordings.
 * `baseUrl` points at docs/battle-theatre/ (the ledger `file` paths are relative to it). Bugle calls are registered per call name (key `signal.bugle:the assembly`).
 */
export async function loadRecordings({ ctx, baseUrl, sources, ledgerIds, calls = null, fetchFn = globalThis.fetch }) {
  const map = new Map();
  for (const id of ledgerIds) {
    const s = sources.find((x) => x.ledgerId === id); if (!s || !s.shippable) continue;
    const r = await fetchFn(new URL(s.file, baseUrl).href); if (!r.ok) continue;
    const ab = await ctx.decodeAudioData(await r.arrayBuffer()), mono = ab.getChannelData(0).slice();
    if (s.family === 'signals_bugle' && calls) {
      for (const c of [...calls.bugle, ...(calls.other_calls || [])]) if ((c.recordings || []).includes(id)) { const key = `signal.bugle:${String(c.name).toLowerCase()}`; (map.get(key) || map.set(key, []).get(key)).push({ buf: mono, ledgerId: id, mainAtSamples: 0 }); }
      continue;
    }
    const targets = FAMILY_TO_SOUND[s.family]; if (!targets) continue;
    const slices = sliceShots(mono, ab.sampleRate, s.family === 'artillery_report' ? { lenS: 3.2, ratio: 8 } : {});
    for (const t of targets) for (const sl of slices) (map.get(t) || map.set(t, []).get(t)).push({ ...sl, ledgerId: id });
  }
  return map;
}
