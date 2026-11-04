#!/usr/bin/env node
// Captures the screenshots of the user guide from a real build of the site and records, for every shot, the bounding box of
// each UI element that content.json wants annotated (CSS pixels, relative to the picture). The guide draws its numbered callouts
// from those boxes, so a callout can never drift from the control it points at.
//
//   node tools/guide/shots.mjs [--zip FILE | --dist DIR] [--only id,id] [--group prefix] [--tile-cap N] [--list]
//
// Output: docs/guide/shots/<id>.jpg (or .png) and docs/guide/shots/shots.json.
// Map tiles come from Mapbox through the repository's capped test harness (tests/t0/lib.mjs): every request carries the production
// Referer and counts against a per-run budget (default 1500 requests here; set with --tile-cap).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GUIDE, TMP, loadContent, resolveSite, openSite, runSteps, boxOf, boxOfDef, panelBox, cdpFor, readJson, tileBudget, sleep } from './lib/site.mjs';

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const only = opt('--only') ? opt('--only').split(',') : null;
const group = opt('--group');
const OUT = path.join(GUIDE, 'shots');
const MANIFEST = path.join(OUT, 'shots.json');
const content = loadContent();
tileBudget.cap = Number(opt('--tile-cap') || process.env.T0_TILE_CAP || 1500);

const ids = Object.keys(content.shots).filter((id) => (!only || only.includes(id)) && (!group || id.startsWith(group)));
if (argv.includes('--list')) { console.log(ids.join('\n')); process.exit(0); }
const dist = resolveSite(argv, content);
const siteVersion = (() => { try { return readJson(path.join(dist, 'version.json')); } catch { return {}; } })();
console.log(`site: ${dist}\nbuild: ${siteVersion.train || '?'} ${siteVersion.release || '?'}   shots: ${ids.length}`);
fs.mkdirSync(OUT, { recursive: true });
const manifest = fs.existsSync(MANIFEST) ? readJson(MANIFEST) : { schema: 'gtbg/guide-shots/1', shots: {} };
manifest.build = { train: siteVersion.train || null, release: siteVersion.release || null };
manifest.shots ||= {};

const sessions = new Map();
async function sessionFor(shot, n) {
  const key = `${shot.device || 'desktop'}|${shot.onboarded === false ? 'fresh' : 'seen'}`;
  if (!sessions.has(key)) sessions.set(key, await openSite({ dist, device: shot.device || 'desktop', onboarded: shot.onboarded !== false, cdpPort: 9650 + sessions.size, profile: `guide-${key.replace('|', '-')}-${process.pid}` }));
  return sessions.get(key);
}

const failures = [];
let n = 0;
for (const id of ids) {
  const shot = content.shots[id];
  n++;
  process.stdout.write(`[${n}/${ids.length}] ${id} ... `);
  try {
    const site = await sessionFor(shot, n);
    const { page } = site;
    if (shot.fresh) await page.context().clearCookies().catch(() => {});
    await runSteps(page, shot, site);
    // clip rectangle in CSS pixels
    const vp = site.vp;
    let clip = { x: 0, y: 0, w: vp.width, h: vp.height };
    if (shot.clip) {
      if (shot.clip.sel || shot.clip.panelOf || shot.clip.union) {
        const b = shot.clip.union ? await boxOfDef(page, { union: shot.clip.union }) : shot.clip.panelOf ? await panelBox(page, shot.clip.panelOf) : await boxOf(page, shot.clip.sel);
        if (!b) throw new Error(`clip selector not found: ${shot.clip.sel || shot.clip.panelOf || shot.clip.union}`);
        const pad = shot.clip.pad ?? 0;
        clip = { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad };
      } else clip = { x: shot.clip.x, y: shot.clip.y, w: shot.clip.w, h: shot.clip.h };
      clip.x = Math.max(0, Math.round(clip.x)); clip.y = Math.max(0, Math.round(clip.y));
      clip.w = Math.min(vp.width - clip.x, Math.round(clip.w)); clip.h = Math.min(vp.height - clip.y, Math.round(clip.h));
    }
    // boxes of the elements to annotate
    const boxes = {}; const missing = [];
    for (const [key, sel] of Object.entries(shot.elements || {})) {
      const b = await boxOfDef(page, sel);
      if (!b) { missing.push(key); continue; }
      boxes[key] = { x: round(b.x - clip.x), y: round(b.y - clip.y), w: round(b.w), h: round(b.h) };
    }
    if (missing.length) throw new Error(`elements not found: ${missing.join(', ')}`);
    // capture: scale is relative to CSS pixels x device pixel ratio, so scale = output pixels per CSS pixel / dpr
    const outScale = shot.outScale || (shot.device === 'phone' ? 2 : 1.5);
    const fmt = shot.format || 'jpeg';
    const cdp = await cdpFor(page);
    const r = await cdp.send('Page.captureScreenshot', { format: fmt, quality: fmt === 'jpeg' ? (shot.quality || 80) : undefined, clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: outScale / vp.dpr }, captureBeyondViewport: false });
    const buf = Buffer.from(r.data, 'base64');
    const ext = fmt === 'jpeg' ? 'jpg' : fmt;
    const file = `${id}.${ext}`;
    for (const old of fs.readdirSync(OUT)) if (old.startsWith(id + '.') && old !== file) fs.rmSync(path.join(OUT, old));
    fs.writeFileSync(path.join(OUT, file), buf);
    const [pxW, pxH] = fmt === 'jpeg' ? jpegSize(buf) : [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    manifest.shots[id] = { file, cssW: clip.w, cssH: clip.h, pxW, pxH, bytes: buf.length, boxes, definition: sha(JSON.stringify(shot)) };
    console.log(`${pxW}x${pxH} ${(buf.length / 1024).toFixed(0)} KB, ${Object.keys(boxes).length} boxes`);
  } catch (e) {
    console.log('FAILED: ' + e.message.split('\n')[0]);
    failures.push(`${id}: ${e.message.split('\n')[0]}`);
  }
}
for (const s of sessions.values()) await s.close();
manifest.captured = new Date().toISOString().slice(0, 10);
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log(`\nMapbox requests used: ${tileBudget.used} of ${tileBudget.cap} (blocked ${tileBudget.blocked})`);
if (failures.length) { console.error(`\n${failures.length} shot(s) failed:\n` + failures.join('\n')); process.exit(1); }

function round(v) { return Math.round(v * 10) / 10; }
function sha(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12); }
function jpegSize(b) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return [0, 0];
}
