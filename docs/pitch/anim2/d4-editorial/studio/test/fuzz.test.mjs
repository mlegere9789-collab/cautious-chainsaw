// test/fuzz.test.mjs - a seeded monkey test of the whole engine API: random play / pause / speed / seek (glided and not) / zoom / pan / selection / viewport size / scene jumps and random
// legal changes of every dial, for thousands of frames, with the invariants checked on EVERY frame.  Any exception, overlap, lost unit, non-finite number or duplicate key fails with the seed
// and the action log, so a failure is reproducible:   FUZZ_SEEDS=20 FUZZ_ACTIONS=600 node --test docs/pitch/anim/prototype/test/fuzz.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine, loadDocs } from '../src/headless.mjs';

const { dataset, tokens } = loadDocs();
const SEEDS = +(process.env.FUZZ_SEEDS || 3); const ACTIONS = +(process.env.FUZZ_ACTIONS || 220);
const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const pick = (r, a) => a[Math.floor(r() * a.length)];

// every dial that is safe to randomise (not the diagnostic layout strategy, which is allowed to overlap)
const DIALS = tokens.tokens.filter((t) => !['layout.strategy', 'metrics.overlay', 'skin.id', 'backdrop.id', 'motion.safetyNet'].includes(t.id));
function randomValue(r, t) {
  if (t.type === 'number') { const v = t.min + r() * (t.max - t.min); const steps = Math.round((v - t.min) / t.step); return Math.min(t.max, +(t.min + steps * t.step).toFixed(6)); }
  if (t.type === 'boolean') return r() < 0.5; if (t.type === 'select') return pick(r, t.options).value;
  return t.default;
}

for (let seed = 1; seed <= SEEDS; seed++) {
  test(`fuzz seed ${seed}: ${ACTIONS} random actions, invariants on every frame`, { timeout: 600_000 }, () => {
    const r = rng(seed * 7919); const log = []; const sc = pick(r, dataset.scenes);
    const e = makeEngine({ start: { tick: sc.tick, lat: sc.lat, lng: sc.lng, zoom: sc.zoom } }); e.setViewport(1440, 900); let frames = 0;
    const fail = (msg) => assert.fail(`${msg}\n  seed ${seed}, frame ${frames}\n  last actions: ${log.slice(-8).join(' | ')}`);
    const dimMs = new Map();
    const check = (f, dtMs) => {
      const seen = new Set();
      for (const t of f.tiles) if (t.life === 'live' && t.travelling) { seen.add(t.key); const v = (dimMs.get(t.key) || 0) + dtMs; dimMs.set(t.key, v); if (v > 3000 && !e.transport.gliding) fail(`tile ${t.key} has been dimmed for ${Math.round(v)} ms: a stuck travelling tile`); }
      for (const k of [...dimMs.keys()]) if (!seen.has(k)) dimMs.delete(k);
      // the before mode (compare.mode, one of the random dials) IS the production renderer: it overlaps by design.  Every other invariant holds in both modes, and the Studio's guarantee holds on every frame of the after mode, including right after a switch back.
      if (e.compare === 'after') { if (f.overlaps) fail(`${f.overlaps} overlapping pairs`); if (f.unrepresented) fail(`${f.unrepresented} unrepresented units`); }
      const keys = new Set(); for (const t of f.tiles) { if (keys.has(t.key)) fail('duplicate key ' + t.key); keys.add(t.key); if (![t.x, t.y, t.ax, t.ay, t.w, t.h, t.scale, t.opacity].every(Number.isFinite)) fail('non-finite tile ' + t.key); if (t.opacity < -1e-9 || t.opacity > 1 + 1e-9) fail('opacity ' + t.opacity); }
      if (!Number.isFinite(f.tau) || f.tau < 1 - 1e-9 || f.tau > 675 + 1e-9) fail('tau ' + f.tau); if (!Number.isFinite(f.zoom)) fail('zoom');
    };
    const run = (n, dt) => { for (let i = 0; i < n; i++) { const d = dt(); const f = e.step(d); frames++; check(f, Math.min(d, 50)); } };
    for (let a = 0; a < ACTIONS; a++) {
      const kind = Math.floor(r() * 14); let what = '';
      switch (kind) {
        case 0: e.transport.toggle(); what = 'toggle'; break;
        case 1: { const v = pick(r, [0.25, 0.5, 1, 2, 4, 8, 16]); e.transport.setSpeed(v); what = 'speed ' + v; break; }
        case 2: { const t = 1 + Math.floor(r() * 675); const g = r() < 0.7; e.transport.seek(t, { glide: g }); what = `seek ${t} glide=${g}`; break; }
        case 3: { const z = 11 + r() * 7; e.zoomTo(z, { at: [r() * 1440, r() * 900] }); what = 'zoomTo ' + z.toFixed(2); break; }
        case 4: { const dx = (r() - 0.5) * 600; const dy = (r() - 0.5) * 400; e.panBy(dx, dy); what = `pan ${dx | 0},${dy | 0}`; break; }
        case 5: { const f = e.frame; const t = f && f.tiles.filter((q) => q.life === 'live' && q.kind === 'leaf'); if (t && t.length) { const u = pick(r, t).ids[0]; e.select(u); what = 'select ' + u; } break; }
        case 6: e.select(null); what = 'deselect'; break;
        case 7: { const s = pick(r, dataset.scenes); e.sceneJump(s, { glide: r() < 0.5 }); what = 'scene ' + s.id; break; }
        case 8: { const w = 360 + Math.floor(r() * 1100); const h = 500 + Math.floor(r() * 500); e.setViewport(w, h); what = `viewport ${w}x${h}`; break; }
        case 9: case 10: case 11: { const t = pick(r, DIALS); const v = randomValue(r, t); try { e.tuning.set(t.id, v); what = `set ${t.id}=${v}`; } catch (err) { fail('legal value rejected: ' + t.id + '=' + v + ' ' + err.message); } break; }
        case 12: { e.tuning.reset(); what = 'reset all'; break; }
        case 13: { const m = pick(r, ['dynamics', 'spring', 'snap']); e.tuning.set('motion.mode', m); what = 'mode ' + m; break; }
        default: break;
      }
      log.push(what); run(4 + Math.floor(r() * 10), () => (r() < 0.1 ? 30 + r() * 40 : 12 + r() * 10));
    }
    assert.ok(frames > ACTIONS * 4);
  });
}
