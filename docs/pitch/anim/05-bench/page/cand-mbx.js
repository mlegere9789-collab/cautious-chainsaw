// Mapbox-based candidates on a blank local style (0 tile requests):
//   mbx-custom      Mapbox custom WebGL layer, instanced sprites drawn inside the map's own frame
//   mbx-hybrid      custom layer for bodies/glow + a Canvas2D label overlay (crisp system text) drawn in the same render call
//   mbx-sym-set     symbol layers (body, chevron) + circle glow driven by feature-state, positions pushed with source.setData every frame
//   mbx-sym-upd     the same, positions pushed with GeoJSONSource.updateData (dynamic source)
import { Atlas, Cam, TIERS, PAD, drawTile, drawChevron, COL, spriteWH } from './lib.js';
import { TileSprites } from './tiles.js';
import { cfg } from './lib.js';
import { GLSprites } from './glsprites.js';

const TOKEN = 'pk.' + btoa('{"u":"bench","a":"bench"}') + '.bench';        // syntactically valid placeholder, never sent anywhere (blank style, Mapbox hosts blocked by the runner)
const FONT = ['DIN Pro Medium'];

async function mkMap(env) {
  const el = document.createElement('div'); el.style.cssText = `position:absolute;left:0;top:0;width:${env.W}px;height:${env.H}px`; env.host.appendChild(el);
  mapboxgl.accessToken = TOKEN;
  const map = new mapboxgl.Map({
    container: el, center: [env.cam.lng, env.cam.lat], zoom: env.cam.zoom, interactive: false, attributionControl: false, fadeDuration: 0, renderWorldCopies: false, trackResize: false, antialias: false,
    style: { version: 8, glyphs: location.origin + '/fonts/{fontstack}/{range}.pbf', sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#2b3a2b' } }] },
  });
  await new Promise((res) => map.once('load', res));
  env.map = map; env.mapEl = el;
  return map;
}

export async function create(env, name) {
  const map = await mkMap(env);
  if (name === 'mbx-custom' || name === 'mbx-hybrid') return custom(env, map, name === 'mbx-hybrid');
  if (name === 'mbx-fs') return featureState(env, map);
  return symbols(env, map, name === 'mbx-sym-upd');
}

function custom(env, map, hybrid) {
  const { tl, W, H, dpr } = env;
  const atlas = new Atlas(dpr, 4096), ts = new TileSprites(atlas, tl, { text: !hybrid, bakedChev: true });
  const cam = new Cam(W, H), X = new Float64Array(tl.n), Y = new Float64Array(tl.n);
  let spr = null, lc = null, lg = null, latlas = null;
  env.atlasBytes = () => atlas.bytes + (latlas ? latlas.bytes : 0); env.spriteMisses = () => ts.misses; env.canvasBytes = 0;
  if (hybrid) {                                                                         // text on its own 2D canvas above the map
    lc = document.createElement('canvas'); lc.width = Math.round(W * dpr); lc.height = Math.round(H * dpr);
    lc.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`; env.host.appendChild(lc); lg = lc.getContext('2d'); latlas = new Atlas(dpr, 2048);
    env.canvasBytes = lc.width * lc.height * 4;
  }
  const layer = {
    id: 'tiles', type: 'custom', renderingMode: '2d',
    onAdd(m, gl) { spr = new GLSprites(gl, atlas, 4, 1024); },
    render(gl) {
      const t0 = performance.now();
      const c = map.getCenter(); cam.lng = c.lng; cam.lat = c.lat; cam.zoom = map.getZoom(); cam.update(); cam.projectAll(tl, X, Y); spr.reset();
      const pulse = 0.3 + 0.6 * Math.abs(Math.sin(env.sec * 3.3));
      if (hybrid) { lg.setTransform(dpr, 0, 0, dpr, 0, 0); lg.clearRect(0, 0, W, H); }
      for (let j = 0; j < tl.nAlive; j++) {
        const i = tl.alive[j], x = X[i], y = Y[i]; if (x < -100 || x > W + 100 || y < -60 || y > H + 60) continue;
        const e = ts.resolve(i), tier = ts.tier[i], cy = y + (e.h - 2 * (PAD + TIERS[tier].h / 2)) / 2;
        if (tl.engaged[i]) { const ge = ts.glow[tl.side[i]][tier]; spr.push(0, ge.page, x, cy, ge.w, ge.h, ge.u0, ge.v0, ge.u1, ge.v1, pulse, 0); }
        spr.push(1, e.page, x, cy, e.w, e.h, e.u0, e.v0, e.u1, e.v1, tl.a[i], 0);
        if (hybrid) {
          const text = tl.units[i].name, w = TIERS[tier].w - 22, le = latlas.add('l|' + text, w + 2, 14, (g) => { g.font = 'bold 10px system-ui, "Segoe UI", Arial, sans-serif'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(text, 1, 7.5); g.fillStyle = '#fff'; g.fillText(text, 1, 7.5); });
          lg.globalAlpha = tl.a[i]; lg.drawImage(latlas.pages[le.page].c, le.sx, le.sy, le.sw, le.sh, x - TIERS[tier].w / 2 + 22, y - 7, le.w, le.h);
        }
      }
      if (hybrid) lg.globalAlpha = 1;
      const cv = map.getCanvas(); gl.viewport(0, 0, cv.width, cv.height); spr.draw(W, H);
      if (env.measuring) env.jsMs.push(performance.now() - t0);
      if (env.running) map.triggerRepaint();
    },
  };
  map.addLayer(layer);
  return { selfTimed: true, frame() { map.triggerRepaint(); }, dispose() { if (lc) lc.remove(); map.remove(); } };
}

function symbols(env, map, dynamic) {
  const { tl, W, H, dpr } = env, n = tl.n;
  const have = new Set(); let added = 0;
  const imgFor = (side, type, tier, fb, po) => {
    const id = `c${side}${type}${tier}_${fb}_${po}`;
    if (!have.has(id)) {
      const { w, h } = spriteWH(tier), c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr);
      drawTile(g, dpr, { side, type, tier, text: null, frac: fb / 20, posture: po, chev: null });
      map.addImage(id, g.getImageData(0, 0, c.width, c.height), { pixelRatio: dpr }); have.add(id); added++;
    }
    return id;
  };
  for (const s of [0, 1]) {                                                              // facing chevron image, rotated by icon-rotate
    const c = document.createElement('canvas'); c.width = c.height = Math.ceil(44 * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr);
    g.save(); g.translate(22, 22 - 17); g.fillStyle = COL[s].light; g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -5); g.lineTo(4.5, 3); g.lineTo(0, 1); g.lineTo(-4.5, 3); g.closePath(); g.fill(); g.stroke(); g.restore();
    map.addImage('chev' + s, g.getImageData(0, 0, c.width, c.height), { pixelRatio: dpr });
  }
  const feats = new Array(n);
  const mk = (i) => ({ type: 'Feature', id: i, geometry: { type: 'Point', coordinates: [tl.lng[i], tl.lat[i]] }, properties: { img: '', label: tl.units[i].name, b: 0, eng: tl.engaged[i], side: tl.side[i], seq: 0, glow: 0 } });
  for (let i = 0; i < n; i++) feats[i] = mk(i);
  map.addSource('u', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, dynamic });
  map.addLayer({ id: 'glow', type: 'circle', source: 'u', filter: ['==', ['get', 'eng'], 1], paint: { 'circle-radius': 22, 'circle-color': '#9fd0ff', 'circle-opacity': ['get', 'glow'], 'circle-blur': 0.9 } });
  map.addLayer({ id: 'body', type: 'symbol', source: 'u', layout: { 'icon-image': ['get', 'img'], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 10, 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-anchor': 'left', 'text-offset': [0.4, 0], 'text-justify': 'left' }, paint: cfg.v.includes('nohalo') ? {} : { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.6)', 'text-halo-width': 1.5 } });
  map.addLayer({ id: 'chev', type: 'symbol', source: 'u', layout: { 'icon-image': ['concat', 'chev', ['get', 'side']], 'icon-rotate': ['get', 'b'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
  const src = map.getSource('u'); let seq = 0, calls = 0; const lastTier = new Int8Array(n).fill(-1), lastFb = new Int8Array(n), lastPo = new Int8Array(n);
  env.atlasBytes = () => 0; env.spriteMisses = () => added; env.canvasBytes = 0;
  env.stale = []; env.disp = { sets: 0 }; env.dbg = { errors: [], sd: 0, sdLoaded: 0 };
  map.on('error', (e) => { if (env.dbg.errors.length < 6) env.dbg.errors.push(String(e.error && e.error.message || e).slice(0, 200)); });
  map.on('sourcedata', (e) => { if (e.sourceId === 'u') { env.dbg.sd++; if (e.isSourceLoaded) env.dbg.sdLoaded++; } });
  const poll = setInterval(() => {                                                      // staleness of what is DISPLAYED: sentinel feature 0 carries the frame sequence it was built in
    try { const f = map.querySourceFeatures('u', { filter: ['==', ['get', 'label'], tl.units[0].name] })[0]; if (f && env.measuring) env.stale.push(seq - f.properties.seq); } catch (e) { /* tiles not ready */ }
  }, 100);
  return {
    frame(t, cam, sec) {
      seq++;
      const pulse = 0.3 + 0.6 * Math.abs(Math.sin(sec * 3.3)), a = [];
      for (let j = 0; j < tl.nAlive; j++) {
        const i = tl.alive[j], f = feats[i], p = f.properties, tier = tl.s[i] < 600 ? 0 : tl.s[i] < 1500 ? 1 : 2, fb = Math.min(20, Math.round(tl.s[i] / tl.maxS[i] * 20)), po = tl.d[i];
        f.geometry.coordinates = [tl.lng[i], tl.lat[i]];                              // a fresh coordinate pair per frame, like a real update
        if (tier !== lastTier[i] || fb !== lastFb[i] || po !== lastPo[i]) { lastTier[i] = tier; lastFb[i] = fb; lastPo[i] = po; p.img = imgFor(tl.side[i], tl.type[i], tier, fb, po); }
        p.b = tl.b[i]; p.seq = seq; a.push(f);
        p.glow = tl.engaged[i] ? pulse : 0;
      }
      const fc = { type: 'FeatureCollection', features: a };
      if (dynamic) src.updateData(fc); else src.setData(fc);
      env.disp.sets++;
    },
    dispose() { clearInterval(poll); map.remove(); },
  };
}

// feature-state alone: the ~15 % engaged tiles at STATIC positions, their glow opacity written with setFeatureState every frame (positions cannot be changed by feature-state)
function featureState(env, map) {
  const { tl } = env, ids = []; for (let i = 0; i < tl.n; i++) if (tl.engaged[i]) ids.push(i);
  tl.stateAt(600);
  const fc = { type: 'FeatureCollection', features: ids.map((i) => ({ type: 'Feature', id: i, geometry: { type: 'Point', coordinates: [tl.lng[i], tl.lat[i]] }, properties: {} })) };
  map.addSource('g', { type: 'geojson', data: fc });
  map.addLayer({ id: 'glow', type: 'circle', source: 'g', paint: { 'circle-radius': 22, 'circle-color': '#9fd0ff', 'circle-opacity': ['coalesce', ['feature-state', 'glow'], 0], 'circle-blur': 0.9 } });
  env.atlasBytes = () => 0; env.canvasBytes = 0;
  return { frame(t, cam, sec) { const pulse = 0.3 + 0.6 * Math.abs(Math.sin(sec * 3.3)); for (const i of ids) map.setFeatureState({ source: 'g', id: i }, { glow: pulse }); }, dispose() { map.remove(); } };
}
