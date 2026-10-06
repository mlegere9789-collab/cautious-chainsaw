// ui/popup-layer.mjs - mounts the cards that the popup host (popups/host.mjs) places: one absolutely positioned element per card, updated every frame.
// A card renders ONCE through card.render(el) (build nodes; never put data into innerHTML) or card.html (a static string authored in the popup's own source).
export function createPopupLayer(container, engine, host) {
  const els = new Map();
  return {
    update(frame, nowMs, dtMs) {
      const placed = host.layout(frame, nowMs, dtMs); const seen = new Set();
      for (const p of placed) {
        seen.add(p.key); let el = els.get(p.key);
        if (!el) { el = document.createElement('div'); el.className = 'pcard'; el.style.width = p.w + 'px'; el.style.minHeight = p.h + 'px'; if (p.card.render) p.card.render(el); else if (p.card.html) el.innerHTML = p.card.html; container.append(el); els.set(p.key, el); }
        el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      }
      for (const [k, el] of els) if (!seen.has(k)) { el.remove(); els.delete(k); }
      return placed.filter((p) => p.leader).map((p) => p.leader);        // leader lines (screen px) for the renderer to draw
    },
  };
}
