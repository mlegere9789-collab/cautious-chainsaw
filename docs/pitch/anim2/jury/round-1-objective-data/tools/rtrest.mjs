// rtrest.mjs - the same question in the REAL page (its own animation loop, no virtual clock): after a jump to the field view, does it come to rest?  CPU throttled 1x, 2x, 4x, 6x (the CDP emulation the forks' pacing tests use).
//   node rtrest.mjs  -> results/rtrest.json
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, HERE } from './lib.mjs';
const srv = await serve(); const out = [];
for (const [d, look] of [['d1', 'day'], ['d4', 'paper']]) for (const vp of ['desktop', 'phone']) for (const cpu of [1, 2, 4, 6]) {
  const dims = vp === 'phone' ? { w: 390, h: 844, mobile: true } : { w: 1440, h: 900, mobile: false };
  const b = await launch({ ...dims, dpr: 2, cpu, profile: `rt-${d}` });
  try {
    await openDir(b.page, d, look, '', { manual: false });
    const r = await b.page.evaluate(async ({ zoom }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.select(null); E.transport.pause(); E.transport.seek(551, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom }, { glide: false, safe: true });
      await new Promise((r) => setTimeout(r, 15000));
      const prev = new Map(); const worst = new Map(); const iv = []; let frames = 0; let framesWith = 0; let last = performance.now();
      await new Promise((res) => { const f = (now) => { iv.push(now - last); last = now; const fr = E.frame; frames++; let any = false; const v = fr.view; for (const t of fr.tiles) { if (t.life !== 'live') continue; const x = t.x + v.dx; const y = t.y + v.dy; const p = prev.get(t.key); if (p) { const dd = Math.hypot(x - p[0], y - p[1]); if (dd > 0.5) { any = true; const w = worst.get(t.key) || { n: 0, max: 0 }; w.n++; w.max = Math.max(w.max, dd); worst.set(t.key, w); } } prev.set(t.key, [x, y]); } if (any) framesWith++; if (frames < 180) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      const a = [...worst.values()]; const s = [...iv.slice(5)].sort((x, y) => x - y);
      return { frames, framesMoving: framesWith, tilesMoving: a.length, maxStep: a.length ? +Math.max(...a.map((w) => w.max)).toFixed(1) : 0, busy: E.busy(), frameMs: { med: +s[Math.floor(s.length / 2)].toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1) } };
    }, { zoom: vp === 'phone' ? 13 : 13.5 });
    out.push({ dir: d, look, vp, cpu, ...r }); console.log(d, vp, 'cpu', cpu, JSON.stringify(r));
  } catch (e) { console.log('FAILED', d, vp, cpu, e.message.slice(0, 120)); out.push({ dir: d, look, vp, cpu, error: e.message.slice(0, 120) }); } finally { try { await b.close(); } catch (e) { /* closed */ } }
  fs.writeFileSync(path.join(HERE, 'results', 'rtrest.json'), JSON.stringify(out, null, 1));
}
fs.writeFileSync(path.join(HERE, 'results', 'rtrest.json'), JSON.stringify(out, null, 1)); srv.close(); process.exit(0);
