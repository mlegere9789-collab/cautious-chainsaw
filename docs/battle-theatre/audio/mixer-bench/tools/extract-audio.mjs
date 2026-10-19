// Extracts the audio track of a (licensed) video file to a 16-bit WAV, using Chrome's decoder. usage: node extract-audio.mjs <relative path under audio/> <out.wav>
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { serve } from './serve.mjs'; import { launchChrome, newPage, closeChrome } from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(here, '..', '..'); const [src, out] = process.argv.slice(2);
const srv = await serve(10780); const ch = await launchChrome({ headless: true }); const pg = await newPage(ch.port, 'http://127.0.0.1:10780/mixer-bench/probe.html'); await new Promise(r => setTimeout(r, 800));
try {
  const r = await pg.evaluate(`(async()=>{const ctx=new OfflineAudioContext(1,128,${+process.argv[4]||48000});const buf=await ctx.decodeAudioData(await (await fetch('../${src}')).arrayBuffer());const ch=buf.numberOfChannels,n=buf.length;const a=new Int16Array(n*ch);for(let c=0;c<ch;c++){const d=buf.getChannelData(c);for(let i=0;i<n;i++){a[i*ch+c]=Math.max(-32768,Math.min(32767,Math.round(d[i]*32767)));}}
    const u=new Uint8Array(a.buffer);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return {sr:buf.sampleRate,ch,n,b64:btoa(s)};})()`);
  const pcm = Buffer.from(r.b64, 'base64'), h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(r.ch, 22); h.writeUInt32LE(r.sr, 24); h.writeUInt32LE(r.sr * r.ch * 2, 28); h.writeUInt16LE(r.ch * 2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(ROOT, out), Buffer.concat([h, pcm])); console.log('wrote', out, r.sr, 'Hz', r.ch, 'ch', (r.n / r.sr).toFixed(2), 's', pcm.length, 'bytes');
} catch (e) { console.error('ERR', e.message.slice(0, 300)); }
pg.close(); await closeChrome(ch.port); srv.close(); process.exit(0);
