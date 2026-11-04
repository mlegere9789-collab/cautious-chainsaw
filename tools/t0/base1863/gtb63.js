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
  const S = { maps: [], errors: 0, retried: 0, lastRetry: 0, overlays: null, loading: false, sharp: false, saveData: false, version: VER, base: B, ctl: [], place: { runs: 0, moves: 0, conflicts: 0, yields: 0, err: null, last: null } };
  const LABEL = "Reconstruction of July 1863, not a photograph: a USDA NAIP aerial photograph of 4 June 2013 with post-1863 features removed and 1863 features added from period maps";
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
      "b1863-changed": { type: "raster", tiles: [B + "changed/{z}/{x}/{y}.png"], tileSize: 512, minzoom: CFG.changed.minzoom, maxzoom: 15, bounds: CFG.wide.bounds },
      "b1863-changed-detail": { type: "raster", tiles: [B + "changed/{z}/{x}/{y}.png"], tileSize: 512, minzoom: 16, maxzoom: 16, bounds: CFG.detail.bounds },
    };
  }

  function layers(visibleChanged) {
    const fade = S.reducedMotion ? 0 : 200;
    return [
      { id: "b1863-wide", type: "raster", source: "b1863-wide", paint: { "raster-fade-duration": fade } },
      { id: "b1863-detail", type: "raster", source: "b1863-detail", paint: { "raster-fade-duration": fade } },
      { id: "b1863-changed", type: "raster", source: "b1863-changed", layout: { visibility: visibleChanged ? "visible" : "none" }, paint: { "raster-opacity": 0.62, "raster-resampling": "nearest", "raster-fade-duration": 0 } },
      { id: "b1863-changed-detail", type: "raster", source: "b1863-changed-detail", layout: { visibility: visibleChanged ? "visible" : "none" }, paint: { "raster-opacity": 0.62, "raster-resampling": "nearest", "raster-fade-duration": 0 } },
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
      ".gtb63-ctl{position:absolute;z-index:12;top:8px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;box-sizing:border-box;pointer-events:auto;background:rgba(10,10,20,.9);color:#e8d5a3;border:1px solid #8b6914;border-radius:6px;padding:5px 10px;font:12px/1.3 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;text-align:left}" +
      /* the positions below are only where the box stands before placement has run (and if it never runs); once the placer has run the inline left/top/width win */
      ".gtb63-ctl[data-gtb63=desktop]{left:446px;transform:none;width:max-content;max-width:min(940px,calc(100% - 622px))}" +
      ".gtb63-ctl[data-gtb63=phone]{left:8px;max-width:calc(100% - 64px)}" +
      "@media (max-width:900px){.gtb63-ctl[data-gtb63=desktop]{left:190px;transform:none;max-width:calc(100% - 270px)}}" +
      ".gtb63-ctl[data-placed]{max-width:none}" +
      /* until the first placement (a frame or two) the box is not drawn, so it never appears at the CSS position and jumps; if placement cannot run it is drawn after 1.5 s at the CSS position */
      ".gtb63-ctl:not([data-placed]){visibility:hidden;animation:gtb63-vis 0s 1.5s forwards}@keyframes gtb63-vis{to{visibility:visible}}" +
      ".gtmon-sheet[data-gtb63-room=h]{max-height:min(var(--gtb63-room,9999px),min(58vh,440px))!important}" +
      ".gtbg-mp-story[data-gtb63-room=h]{max-height:min(var(--gtb63-room,9999px),calc(var(--gt-maph,9999px) * .68))}.gtbg-mp-story[data-gtb63-room=t]{top:var(--gtb63-top)}.gtbg-mp-story[data-gtb63-room]>div:not([data-collapsed]){flex:0 1 auto;min-height:min(90px,100%)}" +
      ".gtb63-label{margin:0;font-weight:600;flex:1 1 auto}.gtb63-row{display:flex;flex-wrap:wrap;align-items:center;gap:2px 4px;flex:0 1 auto;min-width:0;max-width:100%}" +
      ".gtb63-ctl[data-gtb63=phone]{font-size:12px;padding:4px 6px}" +
      ".gtb63-btn{font:inherit;color:#e8d5a3;background:#2a2410;border:1px solid #8b6914;border-radius:4px;padding:3px 9px;min-height:28px;cursor:pointer}" +
      ".gtb63-btn[aria-pressed=true]{background:#c8a84a;color:#0a0a14;font-weight:600}.gtb63-btn:focus-visible,.gtb63-link:focus-visible{outline:2px solid #fff;outline-offset:2px}" +
      ".gtb63-link{color:#e8d5a3;text-decoration:underline}.gtb63-leg{position:absolute;z-index:2;left:-1px;top:calc(100% + 4px);width:max(calc(100% + 2px),min(280px,calc(100vw - 16px)));box-sizing:border-box;margin:0;padding:6px 10px;list-style:none;background:rgba(10,10,20,.95);border:1px solid #8b6914;border-radius:6px;max-height:var(--gtb63-legmax,min(34vh,230px));overflow:auto}.gtb63-ctl[data-leg=up] .gtb63-leg{top:auto;bottom:calc(100% + 4px)}.gtb63-ctl[data-legx=r] .gtb63-leg{left:auto;right:-1px}" +
      ".gtb63-ctl[data-wide] .gtb63-leg{columns:2;column-gap:20px}.gtb63-leg li{break-inside:avoid}" +
      ".gtb63-leg li{display:flex;align-items:center;gap:6px;margin:2px 0;font-size:12px}.gtb63-sw{flex:none;width:12px;height:12px;border:1px solid rgba(255,255,255,.55);border-radius:2px}" +
      ".gtb63-note,.gtb63-status{flex:0 0 100%;margin:0;font-size:12px;opacity:.92}.gtb63-status:empty,.gtb63-note:empty{display:none}.gtb63-leg[hidden],.gtb63-note[hidden]{display:none}" +
      "@media (pointer:coarse){.gtb63-btn{min-height:44px;padding:6px 6px;min-width:0}.gtb63-link{display:inline-flex;align-items:center;min-height:44px;padding:0 2px;min-width:0}.gtb63-row{flex-wrap:nowrap}}      /* touch: the two controls share one 44 px row and wrap their own words when the box is narrow */" +
      "@media (max-height:420px){.gtb63-leg{max-height:var(--gtb63-legmax,90px)}}";
    document.head.appendChild(st);
  }

  function mkLegend(ul) {
    CFG.classes.forEach((c) => {
      const li = document.createElement("li"), sw = document.createElement("span"), tx = document.createElement("span");
      sw.className = "gtb63-sw"; sw.setAttribute("aria-hidden", "true");
      if (c.code === 0 || c.code === 22) { sw.style.background = "transparent"; sw.style.borderStyle = "dashed"; } else sw.style.background = "rgb(" + c.rgb.join(",") + ")";
      tx.textContent = c.text; li.appendChild(sw); li.appendChild(tx); ul.appendChild(li);
    });
  }

  /* PLACEMENT.  The box is permanent (the owner's label), so it must never stand on a card or on any other floating furniture of the page (POLISH layout: the cards, the unit card, the legend,
   * the menu cluster, the day badge, the overview, the toasts, the Mapbox controls; the phone shell's card stack, pop-up, sheets and bars).  Where they stand depends on the viewport, the moment
   * and, with ANIM, on a glide of 260 ms, so no fixed position is clear in every state.  The box therefore reads the real rectangles and puts itself where it fits:
   *   - the candidates are the top-left corners that lie at the edges of the furniture (right of it, below it) and the home corner (right of the menu cluster on the desktop, top-left on the phone);
   *   - at a candidate the box takes the widest width that stops short of the next piece of furniture to its right and wraps (taller, never smaller than its natural 12 px text and controls);
   *   - the cheapest candidate wins: distance from home, plus a penalty for being narrower than its natural width; the box stays where it is while it is still free (no hopping) and returns
   *     home when home is free again;
   *   - a card that glides (ANIM moves cards with CSS `translate`) is read as the hull of where it is and where it is going, so the box leaves before the card arrives;
   *   - the legend of the change layer is a panel the visitor opens on purpose: it hangs under the box (above it when there is no room below) and is not part of the placement;
   *   - on the phone the card stack is the one piece of furniture that may give way: when no free place exists the box takes the place that leaves the stack most room and the stack is capped to what
   *     is left (its cards shrink and scroll); when that is not enough either the box stands at the place with the least overlap and says so (data-conflict), never hidden, never smaller than its text.
   * It runs on changes (a mutation of a furniture element, a resize, the end of a transition), at most about 16 times a second, not per frame. */
  const FURN = [
    "[data-gtbg-card]", "#gt-unit-panel", "[role=group][aria-label=Legend]", "[role=log][aria-label='Battle events'] > div", "#extra-features", ".gtmon-sheet",
    ".gtbg-m-legend", ".gtbg-m-mini", ".gtbg-m-popup", ".gtbg-mp-story", ".gtbg-mp-toast", ".gtbg-m-top", ".gtbg-m-days", ".gtbg-m-dock",
    ".mapboxgl-ctrl-top-right .mapboxgl-ctrl-group", ".mapboxgl-ctrl-logo", ".mapboxgl-ctrl-attrib", ".mapboxgl-ctrl-bottom-left", ".mapboxgl-ctrl-bottom-right", ".mapboxgl-ctrl-top-left"].join(",");
  const GAP = 6, GAPV = 3, GAPR = 2, MARGIN = 8;
  const px2 = (v) => { const m = /(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?/.exec(v || ""); return m ? [+m[1], +(m[2] || 0)] : [0, 0]; };

  class Placer {
    constructor(ctl) { this.c = ctl; this.raf = 0; this.timer = 0; this.last = 0; this.cur = null; this.sig = ""; this.found = { t: 0, list: [] }; this.off = []; this.mo = null; this.started = false; }
    start() {
      if (this.started) return; this.started = true;
      const go = () => this.schedule();
      window.addEventListener("resize", go); this.off.push(() => window.removeEventListener("resize", go));
      for (const ev of ["transitionend", "animationend"]) { document.addEventListener(ev, go, true); this.off.push(() => document.removeEventListener(ev, go, true)); }
      try { this.c.map.on("resize", go); this.off.push(() => { try { this.c.map.off("resize", go); } catch (e) { /* gone */ } }); } catch (e) { /* no map events */ }
      try {
        const own = this.c.el, hit = (n) => n.nodeType === 1 && !own.contains(n) && (n.matches(FURN) || !!n.querySelector(FURN));
        this.mo = new MutationObserver((recs) => {
          for (const r of recs) {
            const t = r.target; if (!t || t.nodeType !== 1 || own.contains(t)) continue;
            if (r.type === "attributes") { if (t === document.documentElement || t === document.body || (t.closest && t.closest(FURN))) return this.schedule(); continue; }      // (the page publishes its layout variables on <html>: --gt-rail-top, --gt-evt-h, --gt-dock)
            if ((t.closest && t.closest(FURN)) || [...r.addedNodes].some(hit) || [...r.removedNodes].some(hit)) return this.schedule();
          }
        });
        this.mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden", "aria-hidden", "data-collapsed", "data-gtbg-card", "data-gta-form"] });
        this.off.push(() => this.mo && this.mo.disconnect());
      } catch (e) { /* no observer: placement still runs on resize, toggle and status changes */ }
      const tick = setInterval(go, 1200); this.off.push(() => clearInterval(tick));                // a cheap safety net: a layout change that no mutation announced (the pass ends at once when nothing moved)
      this.schedule();
    }
    stop() { this.off.forEach((f) => f()); this.off = []; if (this.raf) cancelAnimationFrame(this.raf); if (this.timer) clearTimeout(this.timer); this.raf = this.timer = 0; this.started = false; }
    schedule() {
      if (this.raf || this.timer) return;
      const wait = Math.max(0, 60 - (performance.now() - this.last));
      const go = () => { this.timer = 0; this.raf = requestAnimationFrame(() => { this.raf = 0; try { this.run(); } catch (e) { S.place.err = String(e && e.stack || e).slice(0, 300); /* the position stays */ } }); };
      if (wait > 0) this.timer = setTimeout(go, wait); else go();
    }
    /** the pieces of furniture that float over the map, as boxes in the map container's coordinates (a gliding card: the hull of its start and its end) */
    obstacles(hr) {
      const own = this.c.el, out = [], seen = new Set();
      const add = (e, kind) => {
        if (!e || seen.has(e) || own.contains(e) || e.contains(own)) return; seen.add(e);
        const cs = getComputedStyle(e); if (cs.display === "none") return;
        if (kind !== "menu" && (cs.visibility === "hidden")) return;                                // (the menu cluster hides while a panel is open and comes back: its place stays reserved)
        if (kind !== "menu" && +cs.opacity < 0.05) { let fade = false; try { fade = e.getAnimations().some((a) => a.playState === "running"); } catch (x) { /* no animations API */ } if (!fade) return; }      // an element that is fading in is already furniture
        const r = e.getBoundingClientRect(); if (r.width < 8 || r.height < 8) return;
        let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
        if (e.style && e.style.translate) { const a = px2(cs.translate), b = px2(e.style.translate), dx = b[0] - a[0], dy = b[1] - a[1]; if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) { x0 = Math.min(x0, r.left + dx); x1 = Math.max(x1, r.right + dx); y0 = Math.min(y0, r.top + dy); y1 = Math.max(y1, r.bottom + dy); } }
        x0 -= hr.left; x1 -= hr.left; y0 -= hr.top; y1 -= hr.top;
        if (x1 <= 0 || y1 <= 0 || x0 >= hr.width || y0 >= hr.height) return;
        if ((x1 - x0) > hr.width * 0.9 && (y1 - y0) > hr.height * 0.9) return;                 // a modal or a full-screen layer is not furniture
        out.push({ x0, y0, x1, y1, kind: kind || "f", e });
      };
      document.querySelectorAll(FURN).forEach((e) => add(e, e.id === "extra-features" ? "menu" : e.matches(".mapboxgl-ctrl-attrib,.mapboxgl-ctrl-logo,.mapboxgl-ctrl-bottom-left,.mapboxgl-ctrl-bottom-right") ? "b" : e.matches(".mapboxgl-ctrl-group") ? "c" : "f"));
      const now = performance.now();
      if (now - this.found.t > 1500 || this.found.list.some((q) => !q.e.isConnected)) {          // the few pieces that have no class or id of their own: found by what they say, cached
        const list = [], root = document.querySelector("main#root");
        if (root) {
          const divs = [...root.querySelectorAll("div")], pos = (d) => getComputedStyle(d).position === "absolute";
          const badge = divs.find((d) => d.children.length >= 1 && d.textContent.length < 70 && /\((base speed|slow|fast)\)/.test(d.textContent) && pos(d));
          const over = divs.find((d) => d.firstElementChild && /^Overview/.test(d.firstElementChild.textContent) && d.children.length === 3 && d.querySelector("canvas"));
          if (badge) list.push({ e: badge, kind: "badge" }); if (over) list.push({ e: over, kind: "f" });
          for (const b of root.querySelectorAll("button")) {
            const t = b.textContent.trim();
            if (b.title === "Show legend" || b.title === "Show minimap" || (/Trails/.test(t) && t.length < 16) || (/NPS Auto Tour|Guided Battle Tour/.test(t) && t.length < 30)) list.push({ e: b, kind: "c" });
          }
        }
        this.found = { t: now, list };
      }
      this.found.list.forEach((q) => add(q.e, q.kind));
      return out;
    }
    /** the legend of the change layer is a tool panel the visitor opened on purpose: it hangs under the box (above it when there is no room below), as tall as the room allows, and does not take part in the placement */
    legend(pick, W, H, bottom) {
      const el = this.c.el, ul = this.c.ul; if (!ul || ul.hidden) { el.removeAttribute("data-leg"); el.removeAttribute("data-legx"); el.style.removeProperty("--gtb63-legmax"); return; }
      const h = el.offsetHeight, nat = window.innerHeight <= 420 ? 90 : Math.min(window.innerHeight * 0.34, 230);
      const below = bottom - (pick.y + h) - 6, above = pick.y - 6 - 2;
      const up = below < Math.min(nat, 120) && above > below;
      el.setAttribute("data-leg", up ? "up" : "down");
      el.style.setProperty("--gtb63-legmax", Math.floor(Math.max(64, Math.min(nat, up ? above : below))) + "px");
      if (pick.x + 280 > W - MARGIN) el.setAttribute("data-legx", "r"); else el.removeAttribute("data-legx");
    }
    run() {
      const ctl = this.c, el = ctl.el, host = el && el.parentElement; if (!host || !host.isConnected) return;
      if (getComputedStyle(el).display === "none") return;
      const hr = host.getBoundingClientRect(), W = hr.width, H = hr.height; if (W < 120 || H < 100) return;
      this.last = performance.now();
      // the piece of furniture that may give way: the phone's card stack, or the Monuments card (portrait sheet) while it is open (it hides the stack then)
      const storyEl = document.querySelector(".gtbg-mp-story"), sheetEl = document.querySelector(".gtmon-sheet:not(.gtmon-side)");
      const stackEl = sheetEl && getComputedStyle(sheetEl).display !== "none" ? sheetEl : storyEl;
      for (const o2 of [sheetEl, storyEl]) if (o2 && o2 !== stackEl && o2.hasAttribute("data-gtb63-room")) o2.removeAttribute("data-gtb63-room");
      const wasYielded = stackEl ? stackEl.getAttribute("data-gtb63-room") || "" : "";
      let obs = this.obstacles(hr);                                                               // everything as it stands now (cards as drawn, the stack as capped)
      // the stack as it would stand on its own (uncapped), and the cards that are still inside the column dropped from the list (the column's box stands for them); a card ANIM has moved out stays
      let sNat = null;
      if (stackEl) {
        const sCur = obs.find((o) => o.e === stackEl);
        if (wasYielded) { stackEl.removeAttribute("data-gtb63-room"); const r = stackEl.getBoundingClientRect(); stackEl.setAttribute("data-gtb63-room", wasYielded); sNat = { x0: r.left - hr.left, y0: r.top - hr.top, x1: r.right - hr.left, y1: r.bottom - hr.top, kind: "f", e: stackEl }; } else if (sCur) sNat = sCur;
        const within = (o, b) => b && o.x0 >= b.x0 - 2 && o.x1 <= b.x1 + 2 && o.y0 >= b.y0 - 2 && o.y1 <= b.y1 + 2;
        obs = obs.filter((o) => o === sCur ? false : !(stackEl.contains(o.e) && (stackEl === sheetEl || within(o, sNat) || within(o, sCur))));      // (inside the Monuments card everything scrolls with it: its own box stands for all of it)
        if (sNat && sNat.y1 - sNat.y0 >= 8) obs.push(sNat);
      }
      const natObs = obs;
      const coarse = !!(window.matchMedia && matchMedia("(pointer:coarse)").matches); let bottom = H - (coarse ? 52 : 32);
      for (const o of obs) if (o.kind === "b" && o.y0 > H * 0.3) bottom = Math.min(bottom, o.y0 - GAP);          // the Mapbox wordmark and the attribution line keep their strip: the picture ends there (the map element runs on under the timeline)
      const mk = () => [Math.round(W), Math.round(H), el.offsetHeight, ctl.st ? ctl.st.textContent.length : 0, ctl.on ? 1 : 0, ctl.note && !ctl.note.hidden ? 1 : 0].concat(natObs.map((o) => [o.x0, o.y0, o.x1, o.y1].map(Math.round).join(","))).join("|");
      const sig = mk(); if (sig === this.sig && this.cur) return;
      const hcache = new Map();
      const setW = (w) => { el.style.width = w + "px"; el.style.maxWidth = "none"; };
      const hOf = (w) => { w = Math.round(w); if (!hcache.has(w)) { setW(w); hcache.set(w, el.offsetHeight); } return hcache.get(w); };
      // natural width (one wide row, capped) and the narrowest the controls allow
      el.style.width = "max-content"; el.style.maxWidth = "none";
      const nat = Math.min(940, Math.ceil(el.getBoundingClientRect().width), W - 2 * MARGIN);
      const wmin = Math.min(nat, 148);                                                              // narrower than this the words of the controls would break mid-word
      // home: the top corner; on the desktop right of the menu cluster and the day badge
      let hx = MARGIN; const hy = MARGIN;
      if (ctl.layout === "desktop") for (const o of obs) if ((o.kind === "badge" || o.kind === "menu") && o.y0 < hy + 100) hx = Math.max(hx, o.x1 + 12);
      hx = Math.min(hx, Math.max(MARGIN, W - MARGIN - wmin));
      const fit = (x, y, cap) => {
        let w = Math.min(cap, W - MARGIN - x); if (w < wmin) return null;
        for (let it = 0; it < 6; it++) {
          const h = hOf(w); if (y + h > bottom) return null;
          let lim = W - MARGIN;
          for (const o of obs) {
            if (o.y1 <= y - GAPV || o.y0 >= y + h + GAPV) continue;
            if (o.x1 <= x - GAP) continue;
            if (o.x0 >= x + GAP) lim = Math.min(lim, o.x0 - GAPR); else return null;
          }
          const nw = Math.min(w, lim - x); if (nw < wmin) return null;
          if (nw >= w - 0.5) return { x, y, w, h, cost: Math.abs(y - hy) + 0.6 * Math.abs(x - hx) + 0.35 * (nat - w) };
          w = Math.floor(nw);
        }
        return null;
      };
      const search = (low) => {
        let best = null; const xs = new Set([Math.ceil(hx), MARGIN]), ys = new Set([hy]);
        for (const o of obs) { if (o.x1 + GAP < W - MARGIN - wmin) xs.add(Math.ceil(o.x1 + GAP)); if (o.y1 + GAPV < bottom - 30) ys.add(Math.ceil(o.y1 + GAPV)); }
        for (const y of ys) for (const x of xs) { const f = fit(x, y, nat); if (f) { if (low) f.cost = f.y + f.h; if (!best || f.cost < best.cost) best = f; } }
        return best;
      };
      let pick = null, kept = false;
      const homeFit = fit(Math.ceil(hx), hy, nat);
      if (this.cur) { const c = fit(this.cur.x, this.cur.y, this.cur.w); if (c && (!homeFit || c.cost <= homeFit.cost + 40)) { pick = c; kept = true; } }
      if (!pick && homeFit) pick = homeFit;
      if (!pick) pick = search();
      let conflict = false, yielded = false;
      const scs = stackEl && stackEl.isConnected ? getComputedStyle(stackEl) : null, smode = scs ? (scs.maxHeight !== "none" ? "h" : scs.top !== "auto" ? "t" : "") : "";   // h: portrait column grown up from the dock (capped in height); t: landscape column (its top moves down)
      if (!pick && smode && sNat) {
        // the phone's card stack (portrait: a column that grows up from the dock; landscape: the right-hand column; the cards inside shrink and scroll) is the one piece of furniture that can give way: when no place is free the box takes
        // the place that leaves the stack most room and the stack is capped to what is left under it.  The stack must keep what it needs to stay readable (see need()); otherwise the box overlaps and says so.
        // what the stack needs to stay readable: a collapsed chip is 44 px, every other card keeps at least 90 px (the phone tests call a card squashed under 90 px), 8 px between cards
        const need = () => { let n = 0, k = 0; for (const c of stackEl.children) { if (getComputedStyle(c).display === "none") continue; n += c.hasAttribute("data-collapsed") ? 44 : Math.min(90, c.scrollHeight); k++; } return n + 8 * Math.max(0, k - 1); };
        const saved = obs; obs = obs.filter((o) => o !== sNat); const c = search(true); obs = saved;      // the lowest bottom edge
        if (c) { const room = sNat.y1 - (c.y + c.h + GAPV); if (room >= need()) { pick = c; yielded = true; stackEl.setAttribute("data-gtb63-room", smode); const ds = document.documentElement.style; ds.setProperty("--gtb63-room", Math.floor(room) + "px"); ds.setProperty("--gtb63-top", Math.ceil(hr.top + c.y + c.h + GAPV) + "px"); } }
      }
      if (!yielded && wasYielded && stackEl.isConnected) stackEl.removeAttribute("data-gtb63-room");
      if (!pick) {                                                                                 // no free place: stand where the overlap is least, and say so
        conflict = true; let bestA = 1e9; const xs = new Set([MARGIN, Math.ceil(hx)]), ys = new Set([hy]);
        for (const o of obs) { xs.add(Math.max(MARGIN, Math.ceil(o.x1 + GAP))); ys.add(Math.max(MARGIN, Math.ceil(o.y1 + GAP))); }
        // a control (a button, the zoom group, the attribution) must never be covered: it weighs 50 times a panel, and the width stops short of a control to the right
        for (const y of ys) for (const x of xs) {
          let w = Math.max(wmin, Math.min(nat, W - MARGIN - x)); if (x + w > W - MARGIN + 0.5) continue;
          for (let it = 0; it < 3; it++) { const h0 = hOf(w); for (const o of obs) if ((o.kind === "c" || o.kind === "b") && o.y1 > y - GAPV && o.y0 < y + h0 + GAPV && o.x0 >= x + GAP) w = Math.max(wmin, Math.min(w, Math.floor(o.x0 - GAPR - x))); }
          const h = hOf(w); if (y + h > bottom) continue;
          let a = 0; for (const o of obs) { const ow = Math.min(x + w, o.x1) - Math.max(x, o.x0), oh = Math.min(y + h, o.y1) - Math.max(y, o.y0); if (ow > 0 && oh > 0) a += ow * oh * (o.kind === "c" || o.kind === "b" ? 50 : 1); }
          a += (y + h) * 300; if (a < bestA) { bestA = a; pick = { x, y, w, h }; }          // among equal overlaps the box that ends highest (the middle of the map stays free to tap)
        }
        if (!pick) pick = { x: MARGIN, y: hy, w: Math.max(wmin, Math.min(nat, W - 2 * MARGIN)), h: 0 };
      }
      setW(pick.w);
      el.style.left = "0"; el.style.top = "0"; el.style.transform = "translate(" + Math.round(pick.x) + "px," + Math.round(pick.y) + "px)"; el.setAttribute("data-placed", "1");      // a transform, not left/top: moving the box is never a layout shift
      if (ctl.layout === "desktop") { if (pick.w >= 380) el.setAttribute("data-wide", ""); else el.removeAttribute("data-wide"); }
      if (conflict) el.setAttribute("data-conflict", "1"); else el.removeAttribute("data-conflict");
      this.legend(pick, W, H, bottom);
      const moved = !this.cur || Math.abs(this.cur.x - pick.x) > 0.5 || Math.abs(this.cur.y - pick.y) > 0.5 || Math.abs(this.cur.w - pick.w) > 0.5;
      this.cur = { x: pick.x, y: pick.y, w: pick.w }; this.sig = mk();
      S.place.runs++; if (moved) S.place.moves++; if (conflict) S.place.conflicts++; if (yielded) S.place.yields++; S.place.last = { x: pick.x, y: pick.y, w: pick.w, kept, conflict, yielded };
    }
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
      const ul = document.createElement("ul"); ul.className = "gtb63-leg"; ul.id = "gtb63-leg-" + this.layout; ul.hidden = true; ul.tabIndex = 0; ul.setAttribute("aria-label", "What each colour means");
      mkLegend(ul); el.appendChild(ul);
      const st = document.createElement("p"); st.className = "gtb63-status"; st.setAttribute("role", "status"); el.appendChild(st);
      this.el = el; this.btn = btn; this.link = a; this.ul = ul; this.note = note; this.st = st;
      if (this.layout === "desktop") el.setAttribute("data-wide", "");
      this.placer = new Placer(this);
      btn.addEventListener("click", () => this.set(!this.on));
      ["mousedown", "dblclick", "touchstart", "wheel", "pointerdown"].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation(), { passive: true }));
      this.zoomFn = () => this.zoomNote();
      map.on("zoom", this.zoomFn);
      this.zoomFn2 = () => this.placer && this.placer.schedule(); map.on("zoomend", this.zoomFn2);
      this.styleFn = () => { if (this.on) this.applyVis(); };       // the style may still be loading when the button is pressed: the layers appear as soon as they exist
      map.on("styledata", this.styleFn); map.on("idle", this.styleFn);
      setTimeout(() => { try { this.placer.start(); } catch (e) { /* the CSS position stays */ } }, 0);
      return el;
    }
    onRemove() { try { if (this.placer) this.placer.stop(); this.map.off("zoom", this.zoomFn); this.map.off("zoomend", this.zoomFn2); this.map.off("styledata", this.styleFn); this.map.off("idle", this.styleFn); } catch (e) { /* removed */ } if (this.el) this.el.remove(); }
    applyVis() {
      let ok = true;
      try { ["b1863-changed", "b1863-changed-detail"].forEach((id) => { if (this.map.getLayer(id)) this.map.setLayoutProperty(id, "visibility", this.on ? "visible" : "none"); else ok = false; }); } catch (e) { ok = false; }
      if (this.on && !ok) this.status("The map is still loading: the change layer appears as soon as it is ready.");
      else if (this.st && /still loading/.test(this.st.textContent)) this.status("");
      return ok;
    }
    zoomNote() {
      if (!this.note) return;
      const lo = this.on && this.map.getZoom() < CFG.changed.minzoom;
      this.note.hidden = !lo;
      this.note.textContent = lo ? "Zoom in to level " + CFG.changed.minzoom + " or closer to see what was changed." : "";
      if (this.placer) this.placer.schedule();
    }
    set(on) {
      this.on = !!on;
      this.applyVis();
      this.btn.setAttribute("aria-pressed", this.on ? "true" : "false");
      this.ul.hidden = !this.on;
      this.zoomNote();
      if (this.placer) this.placer.schedule();
    }
    status(t) { if (this.st) this.st.textContent = t || ""; if (this.placer) this.placer.schedule(); }
  }

  function rebuild(map, ctl) {
    try {
      const before = map.getLayer("roads-1863-line") ? "roads-1863-line" : void 0;
      const ids = ["b1863-changed-detail", "b1863-changed", "b1863-detail", "b1863-wide"];
      ids.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
      ids.forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
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
      try { map.setMaxZoom(CFG.maxZoom || 17); } catch (e) { /* the style limit stays */ }      // the picture is 0.92 m per pixel at z16: z17 is a 2x enlargement, nothing beyond is offered (pass 7)
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
