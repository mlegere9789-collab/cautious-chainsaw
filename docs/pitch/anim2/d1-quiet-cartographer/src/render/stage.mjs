// render/stage.mjs - THE STAGE (round 2): the part of the window the frame leaves to the map.  The masthead band, the dock band, the narration column, the side panel and the reading rail are the edges of the
// stage (ui/frame.css); the stage is also inset by a few pixels from the window's own edge.  A mark is drawn whole, or not at all: it lies inside the stage with its whole footprint, or it is faded out as one piece
// (never half-transparent at rest, never cut by a bar or by the screen edge, never a ghost under glass).  Pure functions.
export const EDGE = 6;                                                // px kept clear between a mark and the edge of the stage

/** the stage rectangle in canvas CSS px.  safe = engine.safe (top, right, bottom, left: what the frame covers), mapRect = { w, h } when the reading rail or the phone sheet has narrowed the map viewport */
export function stageRect(safe, cssW, cssH, mapRect) {
  const sf = safe || { top: 0, right: 0, bottom: 0, left: 0 };
  const mw = mapRect ? mapRect.w : cssW; const mh = mapRect ? mapRect.h : cssH;
  const right = mapRect && mw < cssW ? 0 : sf.right; const bottom = mapRect && mh < cssH ? 0 : sf.bottom;      // the rail and the sheet already took their part: do not count the dock twice
  return { x0: (sf.left || 0) + EDGE, y0: (sf.top || 0) + EDGE, x1: mw - (right || 0) - EDGE, y1: mh - (bottom || 0) - EDGE };
}

/** is a box (centre x, y; size w, h; already scaled) entirely inside the stage and clear of the extra rectangles (floating interface)? */
export function boxInStage(st, x, y, w, h, extra) {
  const x0 = x - w / 2; const x1 = x + w / 2; const y0 = y - h / 2; const y1 = y + h / 2;
  if (x0 < st.x0 || x1 > st.x1 || y0 < st.y0 || y1 > st.y1) return false;
  if (extra) for (const r of extra) if (x0 < r.x1 + EDGE && x1 > r.x0 - EDGE && y0 < r.y1 + EDGE && y1 > r.y0 - EDGE) return false;
  return true;
}

/** the obstacles of a stage for the lettering of the ground: the four strips outside it, as rectangles in canvas px */
export function outsideRects(st, cssW, cssH) {
  const out = []; const B = 1e4;
  if (st.y0 > 0) out.push({ x0: -B, x1: B, y0: -B, y1: st.y0 });
  if (st.y1 < cssH) out.push({ x0: -B, x1: B, y0: st.y1, y1: B });
  if (st.x0 > 0) out.push({ x0: -B, x1: st.x0, y0: -B, y1: B });
  if (st.x1 < cssW) out.push({ x0: st.x1, x1: B, y0: -B, y1: B });
  return out;
}
