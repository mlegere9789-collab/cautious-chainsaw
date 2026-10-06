// Standalone WebGL2 overlay canvas (own context, own frame loop): the raw instanced-sprite cost without Mapbox integration
import { Atlas, TIERS, PAD } from './lib.js';
import { TileSprites } from './tiles.js';
import { GLSprites } from './glsprites.js';

export async function create(env, name) {
  const { tl, host, W, H, dpr } = env;
  const cv = document.createElement('canvas');
  cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); host.appendChild(cv);
  const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
  env.canvasBytes = cv.width * cv.height * 4 * 2;
  const atlas = new Atlas(dpr, 4096), ts = new TileSprites(atlas, tl, { text: true, bakedChev: true }), spr = new GLSprites(gl, atlas, 4, 1024);
  env.atlasBytes = () => atlas.bytes; env.atlasUsed = () => atlas.usedPx; env.spriteMisses = () => ts.misses;
  const X = new Float64Array(tl.n), Y = new Float64Array(tl.n);
  return {
    frame(t, cam, sec) {
      cam.projectAll(tl, X, Y); spr.reset();
      const pulse = 0.3 + 0.6 * Math.abs(Math.sin(sec * 3.3));
      for (let j = 0; j < tl.nAlive; j++) {
        const i = tl.alive[j], x = X[i], y = Y[i];
        if (x < -100 || x > W + 100 || y < -60 || y > H + 60) continue;
        const e = ts.resolve(i), tier = ts.tier[i], cy = y + (e.h - 2 * (PAD + TIERS[tier].h / 2)) / 2;   // sprite centre so that the body centre sits on (x, y)
        if (tl.engaged[i]) { const ge = ts.glow[tl.side[i]][tier]; spr.push(0, ge.page, x, cy, ge.w, ge.h, ge.u0, ge.v0, ge.u1, ge.v1, pulse, 0); }
        spr.push(1, e.page, x, cy, e.w, e.h, e.u0, e.v0, e.u1, e.v1, tl.a[i], 0);
      }
      gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); spr.draw(W, H);
    },
    dispose() { cv.remove(); },
  };
}
