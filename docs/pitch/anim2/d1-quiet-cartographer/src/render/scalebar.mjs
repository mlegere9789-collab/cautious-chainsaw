// render/scalebar.mjs - the scale bar (round 2): one bar in the stage's bottom-left corner, inside the stage, so it never touches the dock; the page's own type, the ground's own halo.
const FACE = '"QC Sans", "Source Sans 3", Arial, sans-serif';
const niceLen = (mpp, target) => { const raw = target * mpp; const p = 10 ** Math.floor(Math.log10(raw)); const f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; };
let fade = 1;
/** the bar's rectangle in canvas px (the bar and its label), so the marks and names can be tested against it */
export function scaleBarRect(stage, camera) {
  const mpp = camera.mpp(); const len = niceLen(mpp, 88); const px = len / mpp; const t = len >= 1000 ? len / 1000 + ' km' : len + ' m'; return { x0: stage.x0, x1: stage.x0 + 6 + px + 7 + t.length * 6.6 + 4, y0: stage.y1 - 28, y1: stage.y1 };
}
/** drawn small and quiet in the stage's corner; it is orientation, not data, so it gives way (fades) whenever a mark's footprint would touch it (obstacles = rectangles of the solid marks) */
export function drawScaleBar(c, stage, camera, look, obstacles, steps = 1) {
  if (stage.x1 - stage.x0 < 420) return;                                             // a phone's stage is too narrow to share
  const r = scaleBarRect(stage, camera); let hit = false; if (obstacles) for (const o of obstacles) if (o.x0 < r.x1 && o.x1 > r.x0 && o.y0 < r.y1 && o.y1 > r.y0) { hit = true; break; }
  fade += ((hit ? 0 : 1) - fade) * (1 - Math.pow(0.75, steps)); if (Math.abs(fade - (hit ? 0 : 1)) < 0.02) fade = hit ? 0 : 1; if (fade < 0.02) return;
  const L = look.labels; const mpp = camera.mpp(); const len = niceLen(mpp, 88); const px = len / mpp; const x = stage.x0 + 6; const y = stage.y1 - 8;
  c.save(); c.globalAlpha *= fade; c.lineCap = 'butt'; c.lineJoin = 'round'; c.textAlign = 'left';
  c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x, y); c.lineTo(x + px, y); c.lineTo(x + px, y - 4); c.strokeStyle = L.placeHalo; c.lineWidth = 3.6; c.stroke(); c.strokeStyle = L.place; c.lineWidth = 1.2; c.stroke();
  c.font = `400 12px ${FACE}`; c.textBaseline = 'alphabetic'; const t = len >= 1000 ? len / 1000 + ' km' : len + ' m';
  c.lineWidth = 4; c.strokeStyle = L.placeHalo; c.strokeText(t, x + px + 7, y + 0.5); c.fillStyle = L.place; c.fillText(t, x + px + 7, y + 0.5);
  c.restore();
}
