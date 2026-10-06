// Boot sequence frames (static splash in index.html, then the React 'Loading the battlefield...' layer, then the map)
import fs from 'node:fs';
import { openSession, createStaticServer, sleep, SHOTS, TREES, REPO } from './h.mjs';
import path from 'node:path';
const srv = await createStaticServer({ root: path.join(REPO, TREES.R1c.dir), port: TREES.R1c.port });
const s = await openSession({ profile: 'splash', cdpPort: 9540, viewport: { width: 1440, height: 900, dpr: 1, mobile: false }, onboarded: true, tiles: 'inject' });
const page = s.page;
// slow the network a little so the stages are observable (read-only emulation, local server only)
const c = await s.context.newCDPSession(page);
await c.send('Network.enable');
await c.send('Network.emulateNetworkConditions', { offline: false, latency: 120, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
const t0 = Date.now();
await page.goto(srv.url + '/', { waitUntil: 'commit' });
const frames = [];
for (let i = 0; i < 40; i++) {
  await sleep(i < 6 ? 150 : 400);
  const st = await page.evaluate(() => ({ splash: !!document.getElementById('boot-splash'), canvas: !!document.querySelector('#root canvas'), text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 90), layer: Array.from(document.querySelectorAll('#root *')).some((e) => /Loading the battlefield/.test(e.textContent || '') && e.children.length === 0) })).catch(() => null);
  if (!st) continue;
  const key = `${st.splash}|${st.canvas}|${st.layer}`;
  if (!frames.length || frames[frames.length - 1].key !== key) { const n = frames.length; await page.screenshot({ path: `${SHOTS}/d40-boot-${n}.png` }); frames.push({ n, key, ms: Date.now() - t0, ...st }); console.log(JSON.stringify(frames[frames.length - 1])); }
  if (st.canvas && !st.splash && !st.layer) break;
}
await s.close(); await srv.close();
