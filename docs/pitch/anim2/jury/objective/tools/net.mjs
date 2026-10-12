// net.mjs - what each page really fetches (bytes, by kind) from a cold profile: the page, then the field overview (z13.5), then the close-up (z16.5) at the Angle.  Local server, no compression.
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, HERE } from './lib.mjs';
const configs = [['d1', 'night'], ['d2', 'default'], ['d3', 'default'], ['d4', 'paper'], ['d1', 'day'], ['d4', 'aerial']];
await serve(); const out = {};
for (const [d, look] of configs) {
  const b = await launch({ profile: `net-${d}-${look}-${Date.now()}` }); const res = [];
  b.page.on('response', async (r) => { try { const buf = await r.body(); res.push({ url: r.url().replace(/^http:\/\/127\.0\.0\.1:\d+\//, ''), status: r.status(), bytes: buf.length }); } catch (e) { res.push({ url: r.url(), status: r.status(), bytes: null }); } });
  try {
    await openDir(b.page, d, look);
    const mark = () => res.length;
    await b.page.evaluate(() => { const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.transport.pause(); E.transport.seek(551, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom: 13.5 }, { glide: false, safe: true }); window.__adv(150, 16.7); return window.__groundIdle ? 0 : 0; });
    await b.page.evaluate(async () => { for (const g of [globalThis.__ground, globalThis.__realBackdrop]) if (g && g.whenIdle) await g.whenIdle(25000); }); await b.page.waitForTimeout(800);
    const m1 = mark();
    await b.page.evaluate(() => { const E = window.__studio.engine; E.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 16.5 }, { glide: false, safe: true }); window.__adv(150, 16.7); });
    await b.page.evaluate(async () => { for (const g of [globalThis.__ground, globalThis.__realBackdrop]) if (g && g.whenIdle) await g.whenIdle(25000); }); await b.page.waitForTimeout(800);
    const kind = (u) => (/\.html/.test(u.split('?')[0]) ? 'page' : /\.(avif|webp|png|jpg)/.test(u) ? 'tiles' : /\.woff2?/.test(u) ? 'fonts' : /\.json/.test(u) ? 'json' : 'other');
    const sum = (rows) => { const o = {}; for (const r of rows) { const k = kind(r.url); o[k] = o[k] || { files: 0, bytes: 0 }; o[k].files++; o[k].bytes += r.bytes || 0; } o.total = { files: rows.length, bytes: rows.reduce((s, r) => s + (r.bytes || 0), 0) }; return o; };
    out[`${d}-${look}`] = { load_and_field: sum(res.slice(0, m1)), then_closeup: sum(res.slice(m1)), all: sum(res), first_requests: res.slice(0, 4).map((r) => r.url + ' ' + r.bytes), external: b.external };
    console.log(d, look, JSON.stringify(out[`${d}-${look}`].all));
  } finally { await b.close(); }
}
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true }); fs.writeFileSync(path.join(HERE, 'results', 'net.json'), JSON.stringify(out, null, 1)); process.exit(0);
