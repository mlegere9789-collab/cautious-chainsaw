// popups/_template.mjs - COPY THIS to start a popup.  A complete minimal popup that shows the site's own chronology events (dataset.events) as cards, and demonstrates the two things the popup
// research asked for (02-popups.md): a card's lifetime is READING TIME in wall-clock seconds, not ticks (a card stays about 2 s plus 0.3 s per word however fast the clock runs), and it is placed in
// FREE SPACE by the host (never over a tile) with a leader line to its anchor.  It is deliberately plain and is not registered by default (popups/index.mjs).
//   1. copy to popups/my-popup.mjs;  2. add it to popups/index.mjs;  3. node docs/pitch/anim/prototype/build.mjs
// Contract (popups/host.mjs): update(frame, api) -> [{ key, anchor?, size, render(el) | html, priority }];  api = { tok, nowMs, viewport, tileRect(), obstacles, data }.
// Build nodes with textContent in render(el): never put data into innerHTML.
const shown = new Map();                                          // event tick -> wall-clock ms when its card first appeared

export const templatePopup = {
  id: 'template-events', label: 'Template: chronology event card',
  update(frame, api) {
    const events = api.data.events; const out = []; const now = api.nowMs;
    for (const e of events) {
      const near = Math.abs(e.tick - frame.tau) < 0.75;
      if (near && !shown.has(e.tick)) shown.set(e.tick, now);
      const t0 = shown.get(e.tick); if (t0 === undefined) continue;
      const words = e.event.split(/\s+/).length; const holdMs = 2000 + 300 * words;
      if (now - t0 > holdMs) { if (!near) shown.delete(e.tick); continue; }       // read long enough, and the clock has moved on: gone
      out.push({
        key: 'event-' + e.tick, size: { w: 300, h: 96 + Math.ceil(words / 9) * 14 }, priority: e.significance === 'critical' ? 2 : 1,
        render(el) { const b = document.createElement('b'); b.textContent = `Tick ${e.tick} \u00b7 ${e.significance}`; const p = document.createElement('div'); p.textContent = e.event; el.append(b, p); },
      });
    }
    return out;
  },
};
