// Benchmark driver. Usage: node run-bench.mjs <suite> [--api webgpu|webgl2] [--res 1080|1440|4k] [--throttle 4] [--shots a,b] [--out tag] [--q "extra=query"]
// Suites: base (every shot, full + film config), ablate, fly, serial, mem
import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
import { launch, open } from './pw.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const suite = process.argv[2] || 'base', api = arg('api', 'webgpu'), res = arg('res', '1080'), thr = +arg('throttle', 1), tag = arg('out', ''), shotsArg = arg('shots', ''), extraQ = arg('q', '');
const [W, H] = res === '4k' ? [3840, 2160] : res === '1440' ? [2560, 1440] : [1920, 1080];
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '../../results'); fs.mkdirSync(OUT, { recursive: true });
const SHOTS = shotsArg ? shotsArg.split(',') : ['overview', 'wide', 'ridge', 'ground', 'line', 'battery', 'cavalry'];
const F_FULL = { terrain: 1, near: 1, mid: 1, far: 1, guns: 1, particles: 1, shadows: 1, post: 1, bloom: 1, dof: 0, mblur: 0, sky: 1 }, F_FILM = { ...F_FULL, dof: 1, mblur: 1 };
async function findChromePid() { const c = await browser.newBrowserCDPSession(); const i = await c.send('SystemInfo.getProcessInfo'); return i.processInfo.map(p => p.id); }
function gpuMem(pid) {
  try {
    const ps = "$p=@(" + pid.join(",") + "); $d=0;$s=0; foreach($i in (Get-Counter '\\GPU Process Memory(*)\\Dedicated Usage','\\GPU Process Memory(*)\\Shared Usage').CounterSamples){ if($i.InstanceName -match 'pid_(\\d+)_' -and ($p -contains [int]$Matches[1])){ if($i.Path -like '*dedicated*'){$d+=$i.CookedValue}else{$s+=$i.CookedValue} } }; \"$d $s\"";
    const o = execSync('powershell -NoProfile -Command -', { input: ps, encoding: 'utf8', timeout: 30000 }).trim().split(/\s+/).map(Number); return { dedicatedMiB: +(o[0] / 1048576).toFixed(1), sharedMiB: +(o[1] / 1048576).toFixed(1) };
  } catch (e) { return { err: String(e).slice(0, 120) }; }
}
const rd = (r) => ({ fps: +r.frameMs.fps.toFixed(1), frame_ms: +r.frameMs.mean.toFixed(2), p95: +r.frameMs.p95.toFixed(2), p99: +r.frameMs.p99.toFixed(2), max: +r.frameMs.max.toFixed(1), hitches: r.hitches, gpuWall: +r.gpuWallMs.toFixed(2),
  cpu: Object.fromEntries(Object.entries(r.cpuMs).map(([k, v]) => [k, +v.toFixed(2)])), gpu: Object.fromEntries(Object.entries(r.gpuMs).map(([k, v]) => [k, +v.toFixed(2)])),
  counts: { nearFoot: r.stats.nearFoot, nearMnt: r.stats.nearMnt, midFoot: r.stats.midFoot, midMnt: r.stats.midMnt, far: r.stats.farFoot + r.stats.farMnt, tris_M: +(r.stats.tris / 1e6).toFixed(2), events: r.stats.events } });
const browser = await launch({ extra: process.env.GPUFLAGS ? process.env.GPUFLAGS.split(' ') : [] }); const out = { suite, api, res: [W, H], throttle: thr, date: new Date().toISOString(), runs: [] };
const log = []; const qs = `api=${api}&w=${W}&h=${H}&dpr=1${extraQ ? '&' + extraQ : ''}`;
try {
  const o = await open(browser, qs, { w: W, h: H, throttle: thr, log }); const page = o.page; 
  out.adapter = await page.evaluate(() => window.bench.adapter); out.world = await page.evaluate(() => window.bench.world); out.timing = await page.evaluate(() => window.bench.timing); out.loadMs = o.loadMs; out.bytes = { total: o.bytes.total, items: o.bytes.items.filter(x => x[1] > 20000) };
  await page.evaluate(() => window.bench.advance(0.1, 200));
  const rec = async (name, shot, flags, extra = {}, n = 120) => {
    await page.evaluate(([s, f, e]) => { window.bench.setShot(s); window.bench.setFlags(f); window.bench.setOpts(e.opts || {}); if (e.freeze) { window.bench.seek(e.freeze, 40); window.bench.state.paused = true; } else window.bench.state.paused = false; }, [shot, flags, extra]);
    const r = await page.evaluate(([n, o]) => window.bench.record(n, o), [n, extra.rec || {}]);
    const row = { name, shot, flags: Object.entries(flags).filter(([, v]) => v === 0).map(([k]) => '-' + k).join(' ') || 'all', ...rd(r) }; out.runs.push(row);
    console.log(`${(thr > 1 ? 'x' + thr + ' ' : '')}${res} ${name.padEnd(22)} ${shot.padEnd(9)} frame ${row.frame_ms} ms (${row.fps} fps) p99 ${row.p99} | gpuTS ${row.gpu.total} wall ${row.gpuWall} | cpu ${row.cpu.mean} | near ${row.counts.nearFoot}+${row.counts.nearMnt} mid ${row.counts.midFoot}+${row.counts.midMnt} tris ${row.counts.tris_M}M`); return r;
  };
  if (suite === 'base') { for (const s of SHOTS) { await rec('full', s, F_FULL); await rec('film (dof+mblur)', s, F_FILM); } const r = await page.evaluate(() => window.bench.record(10)); out.memItems = r.memItems; out.memAccountedMiB = r.memBytes / 1048576; out.gpuProcessMem = gpuMem(await findChromePid()); }
  if (suite === 'ablate') {
    const abl = ['particles', 'shadows', 'far', 'mid', 'near', 'guns', 'terrain', 'post'];
    for (const s of (shotsArg ? SHOTS : ['ridge', 'line', 'battery'])) { const fz = { freeze: 71.45 }; await rec('all', s, F_FILM, fz); for (const a of abl) await rec('-' + a, s, { ...F_FILM, [a]: 0 }, fz); await rec('sky only', s, { terrain: 0, near: 0, mid: 0, far: 0, guns: 0, particles: 0, shadows: 0, post: 0, bloom: 0, dof: 0, mblur: 0, sky: 1 }, fz); }
  }
  if (suite === 'midr') { for (const s of ['ridge', 'wide']) for (const mr of [100, 200, 300, 500, 800, 1200]) await rec('midR=' + mr, s, F_FULL, { opts: { midR: mr } }); }
  if (suite === 'nearr') { for (const nr of [10, 20, 40, 60, 90, 130]) await rec('nearR=' + nr, 'line', F_FULL, { opts: { nearR: nr, midR: 300 } }); }
  if (suite === 'fly') { await rec('fly-through film', 'ridge', F_FILM, { rec: { path: 'fly', speed: 1 } }, 600); await rec('fly-through x3 speed', 'ridge', F_FILM, { rec: { path: 'fly', speed: 3 } }, 600); await rec('fly-through full', 'ridge', F_FULL, { rec: { path: 'fly', speed: 1 } }, 600); }
  if (suite === 'serial') { await page.evaluate(() => window.bench.setInflight(1)); for (const s of SHOTS) await rec('serial full', s, F_FULL); }
  if (suite === 'mem') { out.gpuProcessMem = gpuMem(await findChromePid()); const cdp = await o.ctx.newCDPSession(page); out.cdpMetrics = (await cdp.send('Performance.getMetrics')).metrics.filter(m => /JSHeap|Nodes|Documents/.test(m.name)); }
  out.log = log.filter(l => !/powerPreference/.test(l)).slice(0, 10);
} catch (e) { console.log('FAIL', String(e).slice(0, 2000)); out.error = String(e).slice(0, 2000); }
fs.writeFileSync(path.join(OUT, `${api}-${suite}-${res}${thr > 1 ? '-x' + thr : ''}${tag}.json`), JSON.stringify(out, null, 1)); await browser.close();
