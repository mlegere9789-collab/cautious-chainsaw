/* BASE1863 runtime (tools/t0/base1863/gtb63.js).  build-base1863.mjs wraps it as `const GTB63=(()=>{...})();` into the entry bundle, in front of T4 (the function that adds the
 * app's own layers to a main map), and substitutes the two placeholders __VER__ (tile set version, a content hash) and __CFG__ (JSON: source ranges and bounds, ground colour, texts).
 *
 * What it does (the contract is tools/t0/BASE1863-README.md):
 *   style()    the inline Mapbox style of the two MAIN maps (desktop and phone).  No Mapbox style, no Mapbox raster source: the only picture in the map is the local pyramid
 *              /tiles1863/<ver>/{z}/{x}/{y}.webp (a reconstruction of July 1863, NOT a photograph), over a neutral ground colour.  Glyphs for the product's own labels still come from
 *              Mapbox's font endpoint (text only, no imagery).
 *   attach()   called right after a main map is constructed: error filter for the base tiles (a failed tile is expected offline and must not raise a console error), the permanent
 *              label + "Show what was changed" toggle + sources link, retry of failed tiles when the network returns.
 *   d(), refine()  the product's own overlays (roads-1863, rivers, farms) are re-drawn from the catalogue geometry of the reconstruction instead of the old hand-placed lines.
 * Nothing here runs per frame.  Everything is wrapped so that a failure never stops the map. */
const GTB63 = (() => {
  const VER = "__VER__", B = "/tiles1863/" + VER + "/", CFG = __CFG__;
  const EMPTY = () => ({ type: "FeatureCollection", features: [] });
  const S = { maps: [], errors: 0, retried: 0, lastRetry: 0, overlays: null, loading: false, sharp: false, saveData: false, version: VER, base: B, ctl: [] };
  const LABEL = "Reconstruction of July 1863 (USGS imagery and period maps), not a photograph";
  let cssDone = false;

  function env() {
    try {
      const c = navigator.connection || {};
      const slow = /(^|-)2g$/.test(c.effectiveType || "");
      S.saveData = !!c.saveData || slow || (window.matchMedia && matchMedia("(prefers-reduced-data: reduce)").matches);
      S.sharp = (window.devicePixelRatio || 1) >= 1.5 && !S.saveData;
      S.reducedMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { /* defaults */ }
  }

  function sources() {
    const ts = S.sharp ? 256 : 512;
    const tiles = [B + "{z}/{x}/{y}.webp"];
    return {
      "b1863-wide": { type: "raster", tiles, tileSize: ts, minzoom: CFG.wide.minzoom, maxzoom: CFG.wide.maxzoom, bounds: CFG.wide.bounds, attribution: CFG.attribution },
      "b1863-detail": { type: "raster", tiles, tileSize: ts, minzoom: CFG.detail.minzoom, maxzoom: CFG.detail.maxzoom, bounds: CFG.detail.bounds },
      "b1863-changed": { type: "raster", tiles: [B + "changed/{z}/{x}/{y}.png"], tileSize: 512, minzoom: CFG.changed.minzoom, maxzoom: CFG.changed.maxzoom, bounds: CFG.wide.bounds },
    };
  }

  function layers(visibleChanged) {
    const fade = S.reducedMotion ? 0 : 200;
    return [
      { id: "b1863-wide", type: "raster", source: "b1863-wide", paint: { "raster-fade-duration": fade } },
      { id: "b1863-detail", type: "raster", source: "b1863-detail", paint: { "raster-fade-duration": fade } },
      { id: "b1863-changed", type: "raster", source: "b1863-changed", layout: { visibility: visibleChanged ? "visible" : "none" }, paint: { "raster-opacity": 0.62, "raster-resampling": "nearest", "raster-fade-duration": 0 } },
    ];
  }

  function style() {
    env();
    return {
      version: 8, name: "Gettysburg, July 1863 (reconstruction)", projection: { name: "mercator" },
      glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
      sources: sources(),
      layers: [{ id: "b1863-ground", type: "background", paint: { "background-color": CFG.ground.colour } }].concat(layers(false)),
    };
  }

  function d(key) { return S.overlays && S.overlays[key] ? S.overlays[key] : EMPTY(); }

  function applyOverlays(map) {
    if (!S.overlays) return;
    [["roads-1863", "roads"], ["rivers", "rivers"], ["farms", "farms"]].forEach(([src, key]) => {
      try { const s = map.getSource(src); if (s && s.setData) s.setData(S.overlays[key] || EMPTY()); } catch (e) { /* source gone */ }
    });
  }

  function loadOverlays() {
    if (S.overlays || S.loading) return;
    S.loading = true;
    fetch(B + "overlays.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error("overlays " + r.status)))).then((j) => {
      S.overlays = j; S.maps.forEach((r) => applyOverlays(r.map));
    }).catch(() => { S.loading = false; });
  }

  /* called at the end of T4 (the product has just added roads-1863, rivers, breastworks, farms): the old hand-placed lines are replaced by the catalogue geometry and, as the base
   * now draws the roads and streams themselves, the line layers start hidden (labels stay; the Layers panel can still switch the lines on) */
  function refine(map) {
    try {
      ["roads-1863-line", "rivers-line", "farms-outline"].forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none"); });
      if (map.getLayer("roads-1863-label")) map.setLayoutProperty("roads-1863-label", "symbol-sort-key", ["get", "rank"]);
      applyOverlays(map);
      loadOverlays();
    } catch (e) { /* the map keeps the product's own layers */ }
  }

  function css() {
    if (cssDone || !document.head) return;
    cssDone = true;
    const st = document.createElement("style");
    st.id = "gtb63-css";
    st.textContent =
      ".gtb63-ctl{position:absolute;z-index:12;top:8px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;box-sizing:border-box;pointer-events:auto;background:rgba(10,10,20,.9);color:#e8d5a3;border:1px solid #8b6914;border-radius:6px;padding:6px 10px;font:12px/1.35 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;text-align:left}" +
      ".gtb63-ctl[data-gtb63=desktop]{left:50%;transform:translateX(-50%);width:max-content;max-width:min(940px,calc(100% - 440px))}" +
      ".gtb63-ctl[data-gtb63=phone]{left:8px;max-width:calc(100% - 64px)}" +
      "@media (max-width:900px){.gtb63-ctl[data-gtb63=desktop]{left:190px;transform:none;max-width:calc(100% - 270px)}}" +
      ".gtb63-label{margin:0;font-weight:600;flex:1 1 auto}.gtb63-row{display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px;flex:none}" +
      ".gtb63-ctl[data-gtb63=phone]{font-size:11px}" +
      ".gtb63-btn{font:inherit;color:#e8d5a3;background:rgba(139,105,20,.25);border:1px solid #8b6914;border-radius:4px;padding:3px 9px;min-height:28px;cursor:pointer}" +
      ".gtb63-btn[aria-pressed=true]{background:#8b6914;color:#0a0a14;font-weight:600}.gtb63-btn:focus-visible,.gtb63-link:focus-visible{outline:2px solid #fff;outline-offset:2px}" +
      ".gtb63-link{color:#e8d5a3;text-decoration:underline}.gtb63-leg{flex:0 0 100%;margin:2px 0 0;padding:0;list-style:none;max-height:min(34vh,230px);overflow:auto}" +
      ".gtb63-leg li{display:flex;align-items:center;gap:6px;margin:2px 0;font-size:11px}.gtb63-sw{flex:none;width:12px;height:12px;border:1px solid rgba(255,255,255,.55);border-radius:2px}" +
      ".gtb63-note,.gtb63-status{flex:0 0 100%;margin:0;font-size:11px;opacity:.92}.gtb63-status:empty,.gtb63-note:empty{display:none}.gtb63-leg[hidden],.gtb63-note[hidden]{display:none}" +
      "@media (pointer:coarse){.gtb63-btn{min-height:44px;padding:6px 12px}.gtb63-link{display:inline-block;padding:12px 4px}}" +
      "@media (max-height:420px){.gtb63-leg{max-height:90px}}";
    document.head.appendChild(st);
  }

  function mkLegend(ul) {
    CFG.classes.forEach((c) => {
      const li = document.createElement("li"), sw = document.createElement("span"), tx = document.createElement("span");
      sw.className = "gtb63-sw"; sw.style.background = "rgb(" + c.rgb.join(",") + ")"; sw.setAttribute("aria-hidden", "true");
      tx.textContent = c.text; li.appendChild(sw); li.appendChild(tx); ul.appendChild(li);
    });
  }

  class Ctl {
    constructor(map, layout) { this.map = map; this.layout = layout; this.on = false; }
    onAdd(map) {
      css();
      const el = document.createElement("div");
      el.className = "gtb63-ctl";
      el.setAttribute("role", "region"); el.setAttribute("aria-label", "About the base map");
      el.setAttribute("data-gtb63", this.layout);
      const p = document.createElement("p"); p.className = "gtb63-label"; p.textContent = LABEL; el.appendChild(p);
      const row = document.createElement("div"); row.className = "gtb63-row";
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "gtb63-btn"; btn.textContent = "Show what was changed";
      btn.setAttribute("aria-pressed", "false"); btn.setAttribute("aria-controls", "gtb63-leg-" + this.layout);
      const a = document.createElement("a"); a.className = "gtb63-link"; a.href = B + "ABOUT.txt"; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Sources and licences";
      row.appendChild(btn); row.appendChild(a); el.appendChild(row);
      const note = document.createElement("p"); note.className = "gtb63-note"; note.hidden = true; note.setAttribute("role", "status"); el.appendChild(note);
      const ul = document.createElement("ul"); ul.className = "gtb63-leg"; ul.id = "gtb63-leg-" + this.layout; ul.hidden = true; ul.setAttribute("aria-label", "What each colour means");
      mkLegend(ul); el.appendChild(ul);
      const st = document.createElement("p"); st.className = "gtb63-status"; st.setAttribute("role", "status"); el.appendChild(st);
      this.el = el; this.btn = btn; this.ul = ul; this.note = note; this.st = st;
      btn.addEventListener("click", () => this.set(!this.on));
      ["mousedown", "dblclick", "touchstart", "wheel", "pointerdown"].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation(), { passive: true }));
      this.zoomFn = () => this.zoomNote();
      map.on("zoom", this.zoomFn);
      return el;
    }
    onRemove() { try { this.map.off("zoom", this.zoomFn); } catch (e) { /* removed */ } if (this.el) this.el.remove(); }
    zoomNote() {
      if (!this.note) return;
      const lo = this.on && this.map.getZoom() < CFG.changed.minzoom;
      this.note.hidden = !lo;
      this.note.textContent = lo ? "Zoom in to level " + CFG.changed.minzoom + " or closer to see what was changed." : "";
    }
    set(on) {
      this.on = !!on;
      try { if (this.map.getLayer("b1863-changed")) this.map.setLayoutProperty("b1863-changed", "visibility", this.on ? "visible" : "none"); } catch (e) { /* style swap */ }
      this.btn.setAttribute("aria-pressed", this.on ? "true" : "false");
      this.ul.hidden = !this.on;
      this.zoomNote();
    }
    status(t) { if (this.st) this.st.textContent = t || ""; }
  }

  function rebuild(map, ctl) {
    try {
      const before = map.getLayer("roads-1863-line") ? "roads-1863-line" : void 0;
      ["b1863-changed", "b1863-detail", "b1863-wide"].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
      ["b1863-changed", "b1863-detail", "b1863-wide"].forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
      const src = sources();
      layers(ctl && ctl.on).forEach((l) => { if (!map.getSource(l.source)) map.addSource(l.source, src[l.source]); map.addLayer(l, before); });
    } catch (e) { /* the next retry tries again */ }
  }

  function attach(map, layout) {
    try {
      env();
      const rec = { map, layout, ctl: null };
      S.maps.push(rec);
      const ctl = new Ctl(map, layout);
      rec.ctl = ctl; S.ctl.push(ctl);
      map.getContainer().appendChild(ctl.onAdd(map));
      let errSince = false;
      map.on("error", (e) => {
        const id = e && e.sourceId;
        if (id && String(id).indexOf("b1863") === 0) { S.errors++; errSince = true; ctl.status("Some base-map tiles could not be loaded; the neutral ground colour is shown there. They are requested again when the connection returns."); return; }
        try { console.error(e && e.error ? e.error : e); } catch (_) { /* console gone */ }
      });
      const retry = () => {
        const now = Date.now();
        if (!errSince || now - S.lastRetry < 8000) return;
        S.lastRetry = now; S.retried++; errSince = false; rebuild(map, ctl);
      };
      map.on("moveend", () => { if (navigator.onLine !== false) retry(); });
      window.addEventListener("online", retry);
      map.on("idle", () => { if (!errSince && ctl.st && ctl.st.textContent) ctl.status(""); });
      map.on("remove", () => { ctl.onRemove(); S.maps = S.maps.filter((r) => r.map !== map); S.ctl = S.ctl.filter((c) => c !== ctl); window.removeEventListener("online", retry); });
      window.__gtb63 = S;
    } catch (e) { /* the map still works without the label: but the label is a requirement, so say so */ try { console.warn("GTB63 attach failed", e); } catch (_) { /* no console */ } }
  }

  return { style, d, refine, attach, state: S, version: VER, label: LABEL };
})();
