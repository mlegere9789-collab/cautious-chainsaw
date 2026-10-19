// fx/memory.mjs - THE BATTLE REMEMBERS: the casualty-memory device.  Every mark is one deposit of data/memory.json: a spot on the ground where about ten men of a unit were killed, wounded or missing, drawn on the
// ground from the clock tick it falls on, and never removed (the field keeps what was lost).  Drawn beneath every tile and every label, so it can never cover anything vital.
//
// Evidence, as the legend says it: the number of men per unit is Documented (secondary: the registry's total, killed + wounded + missing); WHEN inside the day and WHERE along the unit's route are MODELLED
// (data/build-memory.mjs).  A unit with no figure leaves no mark.  The look comes from the skin's own tokens (memory.*), so each option draws its own: 'bar' = a fallen figure (a short bar at its own angle with a
// pale edge), 'cross' = an ink cross.
export function createMemory(engine, data) {
  const marks = data.marks; const n = marks.length; let hi = 0;
  const upper = (t) => { let a = 0; let b = n; while (a < b) { const m = (a + b) >> 1; if (marks[m][0] <= t) a = m + 1; else b = m; } return a; };      // first mark whose tick is after t
  const API = {
    id: 'memory', label: 'The battle remembers', count: () => hi, total: n, data,
    update() { /* nothing to advance: the marks are a function of the tick */ },
    draw(c, frame, env) {
      const skin = engine.kernel.skins.has(engine.tok('skin.id')) ? engine.kernel.skins.get(engine.tok('skin.id')) : null; const S = skin && skin.skin ? skin.skin.P : null;
      if (!S || !S['memory.enabled']) { hi = 0; return; }
      const tick = frame.tau; hi = upper(tick); const cam = engine.camera; const z = frame.zoom; const w = cam.w || 1440; const h = cam.h || 900;
      const len = S['memory.len'] * (0.55 + 0.45 * Math.min(1, Math.max(0, (z - 13) / 3))) * (1 + 0.55 * Math.min(1.5, Math.max(0, z - 15.5))); const lw = S['memory.width'] * (0.7 + 0.3 * Math.min(1, Math.max(0, (z - 13) / 3)));
      const shape = S['memory.shape']; const uC = S['memory.union']; const cC = S['memory.confederate']; const edge = S['memory.edge']; const a0 = S['memory.alpha']; const edgeA = S['memory.edgeAlpha'];
      c.lineCap = 'round'; const fade = S['memory.fadeTicks'];
      for (let pass = 0; pass < (edge ? 2 : 1); pass++) {
        for (let i = 0; i < hi; i++) {
          const m = marks[i]; const p = cam.toScreen(m[2], m[1]); const x = p[0]; const y = p[1]; if (x < -10 || y < -10 || x > w + 10 || y > h + 10) continue;
          const age = tick - m[0]; const k = age >= fade ? 1 : Math.max(0, age / fade); const ang = m[4] / 256 * Math.PI; const dx = Math.cos(ang) * len / 2; const dy = Math.sin(ang) * len / 2;
          c.globalAlpha = a0 * k; c.beginPath();
          if (shape === 'cross') { const r = len / 2; c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x - r, y + r); c.lineTo(x + r, y - r); }
          else { c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy); }
          const head = shape === 'bar' && z >= 15.5;      // close up, a fallen figure: the body and a head at one end
          if (pass === 0 && edge) { c.strokeStyle = edge; c.lineWidth = lw + 1.6; c.globalAlpha = edgeA * k; c.stroke(); if (head) { c.beginPath(); c.arc(x + dx, y + dy, lw * 0.95 + 0.8, 0, 6.2832); c.fillStyle = edge; c.fill(); } }
          else { c.strokeStyle = m[3] ? cC : uC; c.lineWidth = lw; c.stroke(); if (head) { c.beginPath(); c.arc(x + dx, y + dy, lw * 0.95, 0, 6.2832); c.fillStyle = m[3] ? cC : uC; c.fill(); } }
        }
      }
      c.globalAlpha = 1;
    },
  };
  return API;
}
