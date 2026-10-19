// host/chrome.css.mjs - THE LOOK OF THE APP'S POPUPS, one stylesheet.  Tokens first (a designer changes them and nothing else); then the surfaces, the flag-tab, the type, the controls, the legend and the hover card.
// The app's cards style themselves with inline styles, so every rule here that has to win carries !important and is keyed on the data-gta attribute the director sets (host/popups.mjs scan()).
// Language (from docs/pitch/anim2/release-look, option A "Standards"): warm smoked glass, cream ink, one brass hairline, angular corners (3 and 5 px: cloth and pole, never pills), a 4 px flag-tab on the left edge of
// every card in the card's own tone, one face (QC Sans) for everything that is read as interface and a serif for titles, one motion curve (140, 240 or 380 ms).
export const CHROME_CSS = `
:root {
  --gta-glass: rgba(22,19,13,.94); --gta-glass-lo: rgba(22,19,13,.82); --gta-edge: rgba(244,236,216,.17); --gta-line: rgba(244,236,216,.12); --gta-brass: #c9a24d;
  --gta-ink: #f4ecd8; --gta-muted: #cdc2a8; --gta-faint: #aa9f88; --gta-title: #fbf4e0;
  --gta-union: #86b2ff; --gta-confederate: #ff9a72; --gta-high: #e8bf5a; --gta-critical: #f2905a; --gta-story: #e9d29a; --gta-info: #a9bff0;
  --gta-shadow: 0 2px 4px rgba(0,0,0,.4), 0 16px 40px rgba(0,0,0,.5); --gta-ease: cubic-bezier(.2,.72,.2,1);
  --gta-font: "QC Sans", "Source Sans 3", Arial, "Helvetica Neue", sans-serif; --gta-serif: Georgia, "Times New Roman", serif;
}
[data-gta]:not([data-gta="tip"]):not([data-gta="toast"]) { background: var(--gta-glass) !important; border: 1px solid var(--gta-edge) !important; border-top-color: color-mix(in srgb, var(--gta-brass) 55%, var(--gta-edge)) !important;
  border-radius: 5px !important; box-shadow: var(--gta-shadow) !important; -webkit-backdrop-filter: blur(12px) saturate(1.05) !important; backdrop-filter: blur(12px) saturate(1.05) !important; color: var(--gta-ink) !important; font-family: var(--gta-font) !important; }
[data-gta]:not([data-gta="tip"]):not([data-gta="toast"])::before { content: ""; position: absolute; top: 14px; left: -1px; width: 4px; height: 30px; border-radius: 0 2px 2px 0; background: var(--gta-tone, var(--gta-brass)); pointer-events: none; }
[data-gta="event"] { --gta-tone: var(--gta-high); } [data-gta="story"] { --gta-tone: var(--gta-story); } [data-gta="tour"] { --gta-tone: var(--gta-info); } [data-gta="unit"] { --gta-tone: var(--gta-brass); }
[data-gta="hud"], [data-gta="minimap"] { background: var(--gta-glass-lo) !important; }
[data-gta] * { font-family: var(--gta-font); } [data-gta] [style*="Georgia"], [data-gta] [style*="serif"] { font-family: var(--gta-serif) !important; color: var(--gta-title) !important; }
[data-gta] button { font-family: var(--gta-font) !important; transition: background 140ms var(--gta-ease), color 140ms var(--gta-ease), border-color 140ms var(--gta-ease); }
[data-gta] button[aria-label="Close"], [data-gta] button[aria-label^="Close"] { color: var(--gta-faint) !important; width: 24px; height: 24px; border-radius: 3px !important; display: inline-flex; align-items: center; justify-content: center; }
[data-gta] button[aria-label="Close"]:hover, [data-gta] button[aria-label^="Close"]:hover { background: rgba(244,236,216,.12) !important; color: var(--gta-ink) !important; }
[data-gta] button:focus-visible { outline: 2px solid #fff !important; box-shadow: 0 0 0 4px rgba(0,0,0,.55) !important; outline-offset: 2px; }
[data-gta] ::-webkit-scrollbar { width: 8px; } [data-gta] ::-webkit-scrollbar-thumb { background: rgba(244,236,216,.22); border-radius: 4px; } [data-gta] ::-webkit-scrollbar-track { background: transparent; }

/* the ladder of forms of a card that must find free ground (host/popups.mjs): form 1 drops the italic narrative and shortens the reading; form 2 is the shortest (the words are the same, the card scrolls) */
[data-gta="event"][data-gta-form="1"] > div:last-child[style*="italic"], [data-gta="event"][data-gta-form="2"] > div:last-child[style*="italic"] { display: none !important; }
[data-gta="event"][data-gta-form="2"] { width: 330px !important; }
/* an event card and a toast only tell: they have no action in their body, so the map under them stays draggable; their buttons keep the pointer */
[data-gta="event"], [data-gta="toast"] { pointer-events: none !important; } [data-gta="event"] button, [data-gta="toast"] button { pointer-events: auto !important; }
[data-gta="story"][data-gta-form="1"] { max-height: 300px !important; } [data-gta="story"][data-gta-form="2"] { max-height: 200px !important; width: 300px !important; }

/* the command toasts: the same glass, a flag-tab each */
[data-gta="toast"] > div { background: var(--gta-glass) !important; border: 1px solid var(--gta-edge) !important; border-top-color: color-mix(in srgb, var(--gta-brass) 55%, var(--gta-edge)) !important; border-radius: 5px !important; box-shadow: var(--gta-shadow) !important; -webkit-backdrop-filter: blur(12px) !important; backdrop-filter: blur(12px) !important; position: relative; font-family: var(--gta-font) !important; color: var(--gta-ink) !important; }
[data-gta="toast"] > div::before { content: ""; position: absolute; top: 12px; left: -1px; width: 4px; height: 26px; border-radius: 0 2px 2px 0; background: var(--gta-high); }
[data-gta="toast"] > div * { font-family: var(--gta-font) !important; }

/* the legend: the skin's own */
[data-gta="legend"] > div:first-child > div:first-child, [data-gta="legend"] > [role="group"] { display: none !important; }
[data-gta="legend"] > div:first-child { border-bottom: 0 !important; padding: 8px 8px 0 12px !important; justify-content: flex-end !important; position: absolute; right: 0; top: 0; z-index: 2; background: transparent !important; }
[data-gta="legend"] { width: min(352px, calc(100vw - 32px)) !important; max-height: min(70vh, 640px); overflow-y: auto; }
[data-gta-legend] { padding: 12px 14px 14px; font-family: var(--gta-font); color: var(--gta-ink); }
[data-gta-legend] .gl-title { font: 700 13px/1.2 var(--gta-font); letter-spacing: .01em; color: var(--gta-title); margin: 0 28px 8px 0; }
[data-gta-legend] canvas.gl-fig { display: block; margin: 0 0 8px; max-width: 100%; }
[data-gta-legend] ul.gl-rows { list-style: none; margin: 0; padding: 0; } [data-gta-legend] li { display: grid; grid-template-columns: 22px 1fr auto; column-gap: 8px; align-items: start; padding: 5px 0; border-top: 1px solid var(--gta-line); font: 400 12px/1.35 var(--gta-font); }
[data-gta-legend] .gl-sw { width: 20px; height: 14px; background-size: 100% 100%; background-repeat: no-repeat; border-radius: 2px; margin-top: 1px; } [data-gta-legend] .gl-tx { color: var(--gta-ink); }
[data-gta-legend] em.ev, #gta-tip span.ev { font: 600 10px/1.2 var(--gta-font); font-style: normal; letter-spacing: .04em; text-transform: uppercase; padding: 1px 5px; border: 1px solid currentColor; border-radius: 2px; white-space: nowrap; }
.ev-Documented { color: #7fd6b2; } .ev-Modelled { color: #e8bf5a; } .ev-Computed { color: #a9bff0; } .ev-Contested { color: #f2905a; } .ev-Measured { color: #7fd0e0; } .ev-Unknown { color: #b6bcc6; } .ev-Design { color: #c6b6ee; }

/* the hover card */
#gta-tip { position: fixed; left: 0; top: 0; z-index: 600; width: 250px; padding: 9px 12px 10px; border-radius: 5px; background: var(--gta-glass); border: 1px solid var(--gta-edge); border-top-color: color-mix(in srgb, var(--gta-brass) 55%, var(--gta-edge)); box-shadow: var(--gta-shadow); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); color: var(--gta-ink); font-family: var(--gta-font); transition: opacity 140ms var(--gta-ease); pointer-events: none; }
#gta-tip::before { content: ""; position: absolute; top: 10px; left: -1px; width: 4px; height: 24px; border-radius: 0 2px 2px 0; background: var(--gta-brass); } #gta-tip[data-tone="union"]::before { background: var(--gta-union); } #gta-tip[data-tone="confederate"]::before { background: var(--gta-confederate); }
#gta-tip .gt-kick { font: 700 10px/1.2 var(--gta-font); letter-spacing: .1em; text-transform: uppercase; color: var(--gta-brass); } #gta-tip[data-tone="union"] .gt-kick { color: var(--gta-union); } #gta-tip[data-tone="confederate"] .gt-kick { color: var(--gta-confederate); }
#gta-tip .gt-title { font: 700 14px/1.25 var(--gta-font); color: var(--gta-title); margin: 3px 0 4px; } #gta-tip .gt-line { font: 400 12px/1.4 var(--gta-font); color: var(--gta-muted); } #gta-tip .gt-ev { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
@media (prefers-reduced-motion: reduce) { [data-gta], [data-gta] *, #gta-tip { transition: none !important; } }
@media (max-width: 700px) { #gta-tip { display: none; } }
`;
