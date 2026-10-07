// popups/minimap.mjs - P-13, the OVERVIEW MAP.  A small map of every unit on the field with a box for what the main map shows; a click flies there (the product's overview does the same).
// Fixes the research found in the product's: the phone version drew only units with a keyframe exactly at the current tick (empty on 72 % of ticks); this one draws every tile of the
// frame being drawn, like the desktop one.  New: when a card is about something OFF-SCREEN the overview pulses a ring where it is, the cue the camera does not give.  A persistent popup:
// it steps aside (and returns after a calm delay) when a tile would be under it.  Dots are the true positions of the tiles (Modelled); the box is the camera.

const EXT = { north: 39.862, south: 39.768, west: -77.322, east: -77.176 };
const SLOT_ALT = { tl: 'bl', bl: 'tl', tr: 'br', br: 'tr' };
const COL = { union: '#4d8fe0', confederate: '#8a929e', unknown: '#e09a1a', mixed: '#b58be0' };

export const minimap = {
  id: 'minimap', label: 'Overview map', group: 'popup-minimap', enabled: (tok) => tok('popup.minimap.enabled'),
  doc: 'The overview map (P-13): every tile of the frame, the camera box, click to fly, a pulse for off-screen subjects; steps aside for tiles.',
  update(frame, api) {
    const tok = api.tok; const W = tok('popup.minimap.w'); const cw = W - 26; const ch = Math.round(cw * 0.84); const slot = tok('popup.minimap.slot'); const eng = api.engine; const st = api.host.state.mod.mini || (api.host.state.mod.mini = { last: 0, pulses: [] });
    const toXY = (lng, lat) => [(lng - EXT.west) / (EXT.east - EXT.west) * cw, (EXT.north - lat) / (EXT.north - EXT.south) * ch];
    const paint = (g, w, h) => {
      const f = eng.frame; if (!f) return; g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(128,128,128,0.10)'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(128,128,128,0.25)'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
      const cam = eng.camera; let n = 0;
      for (const t of f.tiles) { if (t.life !== 'live') continue; const p = cam.fromScreen(t.ax + f.view.dx, t.ay + f.view.dy); const [x, y] = toXY(p[0], p[1]); g.fillStyle = COL[t.side] || COL.unknown; g.fillRect(x - 1, y - 1, t.kind === 'agg' ? 3 : 2, t.kind === 'agg' ? 3 : 2); n++; }
      const c0 = cam.fromScreen(0, 0); const c1 = cam.fromScreen(cam.w, cam.h); const a = toXY(c0[0], c0[1]); const b = toXY(c1[0], c1[1]);
      g.strokeStyle = '#f2b700'; g.lineWidth = 1.6; g.strokeRect(Math.max(0.8, a[0]), Math.max(0.8, a[1]), Math.min(w - 1.6, b[0]) - Math.max(0.8, a[0]), Math.min(h - 1.6, b[1]) - Math.max(0.8, a[1]));
      for (const c of api.host.cards.values()) { if (c.phase === 'out' || !c.subj || !c.subj.tiles.length || c.spec.kind === 'hud') continue; const r = c.anchorRect; if (!r) continue; if (r.x1 > 0 && r.x0 < cam.w && r.y1 > 0 && r.y0 < cam.h) continue; const p = cam.fromScreen((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2); const [x, y] = toXY(p[0], p[1]); const ph = ((performance.now() / 900) % 1); g.strokeStyle = '#e0553a'; g.lineWidth = 1.6; g.globalAlpha = 1 - ph; g.beginPath(); g.arc(x, y, 3 + ph * 8, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
      st.n = n;
    };
    const click = (fx, fy) => { const lng = EXT.west + fx * (EXT.east - EXT.west); const lat = EXT.north - fy * (EXT.north - EXT.south); api.flyTo({ lat, lng, glide: true, safe: false }); };
    const label = 'Overview map of the field with a box for the main map. Click to move the main map there.';
    return [{ key: 'overview', kind: 'hud', tier: 'S', tone: 'info', priority: 4, slots: [slot, SLOT_ALT[slot]], version: W, forms: [{ id: 'full', level: 'full', w: W, content: { label, blocks: [{ t: 'canvas', w: cw, h: ch, paint, click, label }] } }] }];
  },
};
