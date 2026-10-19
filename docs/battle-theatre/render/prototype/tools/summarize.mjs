// Prints markdown tables from results/*.json (used to write PLAN.md). Usage: node summarize.mjs [filter]
import fs from 'node:fs'; import path from 'node:path';
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '../../results'); const filt = process.argv[2] || '';
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json') && f.includes(filt) && !/^(gait|anim|compute)/.test(f)).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f))); console.log(`\n### ${f}  (${d.api} ${d.res?.join('x')} throttle ${d.throttle} adapter ${JSON.stringify(d.adapter)})`);
  if (d.error) { console.log('ERROR', d.error.slice(0, 300)); continue; }
  console.log('| run | shot | fps | frame ms | p99 | max | hitches | gpuTS ms | gpuWall ms | cpu ms | near | mid | Mtris |'); console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of d.runs) console.log(`| ${r.name} | ${r.shot} | ${r.fps} | ${r.frame_ms} | ${r.p99} | ${r.max} | ${r.hitches} | ${r.gpu.total ?? ''} | ${r.gpuWall} | ${r.cpu.mean} | ${r.counts.nearFoot}+${r.counts.nearMnt} | ${r.counts.midFoot}+${r.counts.midMnt} | ${r.counts.tris_M} |`);
  if (d.timing) console.log('load', JSON.stringify(d.timing), 'loadMs', d.loadMs, 'bytes', d.bytes?.total); if (d.gpuProcessMem) console.log('gpu process mem', JSON.stringify(d.gpuProcessMem), 'accounted MiB', d.memAccountedMiB?.toFixed(1));
}
