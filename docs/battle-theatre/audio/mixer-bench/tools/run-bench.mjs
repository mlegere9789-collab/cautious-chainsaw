// Drives the bench in Chrome (below-normal priority, headless, 48 kHz) through the DevTools protocol and writes results/*.json.
// usage: node tools/run-bench.mjs <suite>   suites: smoke | sweep | scenarios | realtime | quality
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs'; import { launchChrome, newPage, closeChrome } from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), RES = path.join(here, '..', 'results'); fs.mkdirSync(RES, { recursive: true });
const suite = process.argv[2] || 'smoke';
const device = suite === 'device' || suite === 'knee' || suite === 'knee2'; const srv = await serve(10780); const ch = await launchChrome({ headless: !device, mute: !device, extra: device ? ['--window-size=900,600'] : [] });
const pg = await newPage(ch.port, 'http://127.0.0.1:10780/mixer-bench/index.html'); await new Promise(r => setTimeout(r, 1500));
const rss = () => { try { const o = execSync(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"Name='chrome.exe'\\" | Where-Object { $_.CommandLine -like '*${path.basename(ch.profile)}*' } | Measure-Object WorkingSetSize -Sum).Sum/1MB"`, { encoding: 'utf8' }); return +(+o.trim()).toFixed(0); } catch (e) { return null; } };  // working set of THIS bench's Chrome processes only (matched by profile directory)
const env = { chrome: ch.version.Browser, cpu: os.cpus()[0].model, logicalCores: os.cpus().length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1), platform: os.platform() + ' ' + os.release(), priority: 'below-normal (Chrome and children)', otherLoad: 'two other large pipelines running during the runs', date: new Date().toISOString() };
const run = async (fn, spec) => { const r = await pg.evaluate(`BT.${fn}(${JSON.stringify(spec)})`); return r; };
const prep = await pg.evaluate('BT.prepare()'); env.ticksPerSec = prep.ticksPerSec;
const save = (name, obj) => { fs.writeFileSync(path.join(RES, name + '.json'), JSON.stringify({ env, ...obj }, null, 1)); console.log('wrote', name); };
const line = r => `${JSON.stringify(r.spec)}\n   events ${r.events} started ${r.started} voices mean ${r.voices?.mean} max ${r.voices?.max} | block us p50 ${r.perBlockUs?.p50} p99 ${r.perBlockUs?.p99} max ${r.perBlockUs?.max} over ${r.perBlockUs?.blocksOver} | worklet RTF ${r.workletRTF} wall RTF ${r.wallRTF} steals ${r.steals} lateDrops ${r.lateDrops} nan ${r.output?.nanSamples} peak ${r.output?.peak}`;
try {
  if (suite === 'smoke') { const r = await run('runOffline', { kind: 'musket', rate: 400, dur: 6, cannonRate: 2 }); console.log(line(r)); console.log(pg.logs); }
  if (suite === 'sweep') { const out = []; for (const quality of [1, 0]) for (const rate of [100, 200, 400, 800, 1600, 3200, 6400]) { const best = []; for (let rep = 0; rep < 2; rep++) { const r = await run('runOffline', { kind: 'musket', rate, dur: 10, cannonRate: 3, quality, seed: 11 + rep }); best.push(r); console.log(line(r)); if (r.workletRTF > 1.6) break; } out.push(...best); if (best.every(r => r.workletRTF > 1.2)) break; }
    save('sweep-offline', { prep: { poolMB: prep.poolMB, shots: prep.shots }, runs: out }); }
  if (suite === 'scenarios') { const out = [];
    const S = [
      { name: 'cannonade realistic: 150 Confed guns @90 s + 80 Union @120 s', spec: { kind: 'cannonade', dur: 120, confInt: 90, unionInt: 120 } },
      { name: 'cannonade stress: same guns at 6x the historical rate (15 s Confed, 20 s Union)', spec: { kind: 'cannonade', dur: 60, confInt: 15, unionInt: 20 } },
      { name: 'assault at the Angle: 6500 defenders @2.5/min + 3000 attackers @2/min (371 shots/s)', spec: { kind: 'assault', dur: 60, defenders: 6500, attackers: 3000, rD: 2.5, rA: 2.0 } },
      { name: 'assault owner worst case: 10000 men @3/min (500 shots/s)', spec: { kind: 'assault', dur: 60, defenders: 10000, attackers: 0, rD: 3, rA: 3 } },
      { name: 'Day-2-scale ceiling: 40000 men @2.5/min (1667 shots/s)', spec: { kind: 'assault', dur: 40, defenders: 25000, attackers: 15000, rD: 2.5, rA: 2.5 } },
      { name: 'mixed worst: assault 371/s + 6x cannonade', spec: { kind: 'mixed', dur: 60, defenders: 6500, attackers: 3000, rD: 2.5, rA: 2.0, confInt: 15, unionInt: 20 } },
      { name: 'assault 371/s with the camera flying at 30 m/s (Doppler + retarded re-keying)', spec: { kind: 'assault', dur: 60, defenders: 6500, attackers: 3000, rD: 2.5, rA: 2.0, moving: true } },
    ];
    for (const s of S) { const r = await run('runOffline', s.spec); r.name = s.name; out.push(r); console.log(s.name + '\n' + line(r)); }
    save('scenarios-offline', { runs: out }); }
  if (suite === 'realtime') { const out = [];
    const S = [
      { name: 'real-time: assault 371/s + cannonade x6, 60 s', spec: { kind: 'mixed', dur: 60, defenders: 6500, attackers: 3000, rD: 2.5, rA: 2.0, confInt: 15, unionInt: 20, volume: 0.2 } },
      { name: 'real-time: 1667 shots/s ceiling, 40 s', spec: { kind: 'assault', dur: 40, defenders: 25000, attackers: 15000, rD: 2.5, rA: 2.5, volume: 0.2 } },
      { name: 'real-time: 371/s moving camera 30 m/s, 40 s', spec: { kind: 'assault', dur: 40, defenders: 6500, attackers: 3000, rD: 2.5, rA: 2.0, moving: true, volume: 0.2 } },
    ];
    const r0 = rss(); for (const s of S) { const before = rss(); const r = await run('runRealtime', s.spec); r.name = s.name; r.chromeWorkingSetMB = { before, after: rss() }; out.push(r); console.log(s.name, JSON.stringify(r.worklet), JSON.stringify(r.playbackStats), JSON.stringify(r.latency)); }
    save('realtime', { runs: out, chromeWorkingSetMBAtStart: r0 }); }
  if (suite === 'device') { const out = []; const S = [
      { name: 'DEVICE real-time (headed Chrome, real output device, gain 0): assault 371/s + 6x cannonade, 45 s', spec: { kind: 'mixed', dur: 45, defenders: 6500, attackers: 3000, rD: 2.5, rA: 2.0, confInt: 15, unionInt: 20, volume: 0 } },
      { name: 'DEVICE real-time: 1667 shots/s ceiling, 40 s', spec: { kind: 'assault', dur: 40, defenders: 25000, attackers: 15000, rD: 2.5, rA: 2.5, volume: 0 } },
      { name: 'DEVICE real-time: 3200 shots/s (musket stream), 30 s', spec: { kind: 'musket', rate: 3200, dur: 30, cannonRate: 3, volume: 0 } } ];
    for (const s of S) { const before = rss(); const r = await run('runRealtime', s.spec); r.name = s.name; r.chromeWorkingSetMB = { before, after: rss() }; out.push(r); console.log(s.name, JSON.stringify(r.worklet), JSON.stringify(r.playbackStats), JSON.stringify(r.latency)); }
    save('realtime-device', { runs: out }); }
  if (suite === 'knee' || suite === 'knee2') { const out = [];
    for (const [rate, quality] of (suite === 'knee' ? [[4800, 1], [6400, 1], [9600, 0], [12800, 0]] : [[3200, 1], [4000, 1], [4000, 1], [4800, 0], [6400, 0], [6400, 0]])) { const s = { name: `DEVICE real-time knee: ${rate} shots/s, quality ${quality ? 'full' : 'lite'}, 30 s`, spec: { kind: 'musket', rate, dur: 30, cannonRate: 3, quality, volume: 0, maxVoices: 8192 } }; const before = rss(); const r = await run('runRealtime', s.spec); r.name = s.name; r.chromeWorkingSetMB = { before, after: rss() }; out.push(r); console.log(s.name, JSON.stringify(r.worklet), JSON.stringify(r.playbackStats)); }
    save(suite === 'knee' ? 'realtime-knee' : 'realtime-knee2', { runs: out }); }
} catch (e) { console.error('ERR', e.message); console.log(pg.logs); }
pg.close(); await closeChrome(ch.port); srv.close(); process.exit(0);
