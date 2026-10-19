// host/trails.mjs - the trails of the app's "Trails ON" button, derived from the TIMELINE (the path a unit has just walked, sampled from its own track at the displayed time) instead of accumulated from frame to frame:
// the same picture whatever the frame rate, no state to clear on a jump, nothing to lag behind the marks.  A trail is drawn only for a unit that is really moving (documented keyframes at different places);
// it is a thin tapering line in the side's cloth colour, beneath every mark.  Modelled (the path between two keyframes is an interpolation), like the marks.
export function createTrails(E) {
  const T = { on: true, flag: null };
  const pts = new Float64Array(2 * 14);
  return {
    enabled() { return T.flag ? !!T.flag() : T.on; },
    setFlag(f) { T.flag = f; },
    busy() { return false; },
    draw(c, env, F) {
      const skin = E.kernel.skins.has(E.tok('skin.id')) ? E.kernel.skins.get(E.tok('skin.id')) : null; const P = skin && skin.skin ? skin.skin.P : null;
      const cu = P ? P['color.unionBright'] : '#6fa0ff'; const cc = P ? P['color.confederateBright'] : '#ff7a66'; const cw = F.view; const z = F.zoom; const SPAN = 6; const N = 12;
      const battle = E.battle; const seen = new Set(); c.lineCap = 'round'; c.lineJoin = 'round';
      for (const t of F.tiles) {
        if (t.kind !== 'leaf' || t.life !== 'live' || t.opacity < 0.5 || !t.moving) continue;
        const u = t.unit; if (!u || seen.has(u.id)) continue; seen.add(u.id);
        const px = t.ax + cw.dx; const py = t.ay + cw.dy; if (px < -200 || py < -200 || px > cw.w + 200 || py > cw.h + 200) continue;
        let n = 0;
        for (let i = 0; i <= N; i++) { const st = battle.stateOf(u, F.tau - SPAN * (i / N)); if (!st) break; pts[2 * n] = st.lng; pts[2 * n + 1] = st.lat; n++; }
        if (n < 2) continue;
        const proj = F.project; let have = false; let ox = 0; let oy = 0;
        c.strokeStyle = t.side === 'union' ? cu : t.side === 'confederate' ? cc : '#d8d8d8';
        let q0 = proj(pts[0], pts[1]);
        for (let i = 1; i < n; i++) {
          const q1 = proj(pts[2 * i], pts[2 * i + 1]);
          if (!have) { ox = px - q0[0]; oy = py - q0[1]; have = true; }                       // anchor the path on the mark's true place (the first sample is the displayed time itself)
          c.globalAlpha = 0.5 * (1 - i / n) * t.opacity; c.lineWidth = 2.2 * (1 - 0.6 * i / n);
          c.beginPath(); c.moveTo(q0[0] + ox, q0[1] + oy); c.lineTo(q1[0] + ox, q1[1] + oy); c.stroke(); q0 = q1;
        }
      }
      c.globalAlpha = 1;
    },
  };
}
