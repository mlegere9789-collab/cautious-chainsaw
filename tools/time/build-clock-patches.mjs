#!/usr/bin/env node
// Generates tools/t0/patches-next/CLOCK.json: the clock bridge (optional patch group CLOCK) for the app and the static pages (WP-TIME-10 bridge).
// Run it through its wrapper:  node tools/t0/clock/build-clock.mjs   (regenerates the time module build, this file, and proves every anchor on the real R1c tree).
//
// It routes every clock surface (store clock, HUD, toolbar, mobile header, time bar, tooltips, ancestor rows, event card, unit panel,
// toasts, successions, minimap, hour buttons and keys, Bookmarks/Help chunks, Compare, Living Ledger, Camera, Immersive, Documentary,
// Education, Turning Points, Sandbox, Regiment, Search) through the canonical module inlined as a small function, and marks every
// time as visibly approximate ("about 3:00 PM") because no anchor is signed; the tooltip of the main clocks says how sure the clock is (GTBGT.u).
//
// Format (tools/t0/patches/*.json, see tools/t0/README.md): {group, description, patches:[{id, target, find, repl, expect, regex?, note?}]}.
// target: "js" the entry bundle, "help" / "book" the lazy chunks, otherwise a dist-relative path (compare.html ...). A regex patch uses
// Python re semantics and m.expand(repl), so no regex patch repl contains a backslash. Non-regex patches are plain replacements.
// To activate after sign-off: git mv it to tools/t0/patches/B+CLOCK.json and set "group": "B" (extension part of the clock group, R1c),
// or give CLOCK its own entry in trains.json (owner of that file: t0-core). Both were exercised by tools/time/sandbox-build.mjs.
//
// The file lives in patches-next/ (inert; the T0 builder loads only tools/t0/patches/) until the integrator registers the group (tools/t0/CLOCK-README.md).
// Patches written against the pristine text are asserted against it here; patches that must follow groups A..PERF (mobile step buttons ...) are asserted against
// the staged text (tmp/clock-integrate/stage/*.txt, written by tools/t0/clock/build-clock.mjs from a build without CLOCK).
import fs from 'node:fs';
import path from 'node:path';
import { P, BUNDLE, writeIfChanged } from './lib.mjs';
import { read, pageFunction, countOf, span } from './extract.mjs';
import { uncertaintyFnSource } from '../t0/clock/uncertainty-fn.mjs';

const bundle = read(BUNDLE);
const inline = fs.readFileSync(P('tools', 'time', 'build', 'gtbg-time.inline.js'), 'utf8').trim();
const iife = fs.readFileSync(P('tools', 'time', 'build', 'gtbg-time.iife.js'), 'utf8').trim();
const anchorsDoc = JSON.parse(fs.readFileSync(P('data-src', 'time', 'time_anchors.json'), 'utf8'));
const uncFn = uncertaintyFnSource(anchorsDoc);        // GTBGT.u(tick): how sure the clock is (tooltip text)
const subFn = '(function(s,t){return typeof s==="string"?s.replace(/July \\d, (?:about )?\\d{1,2}:\\d{2} [AP]M$/,function(){return GTBGT.f(t,"compat")}):s})';   // GTBGT.s(subtitle, tick)
if (!inline.startsWith('(function(){')) throw new Error('run node tools/time/build.mjs first');

const patches = [];
const add = (id, target, find, repl, expect = 1, regex = false) => { const o = { id, target, find, repl, expect }; if (regex) o.regex = true; patches.push(o); };
const B = (id, find, repl, expect = 1) => add(id, 'js', find, repl, expect);
const BR = (id, find, repl, expect = 1) => add(id, 'js', find, repl, expect, true);
const F = (id, file, find, repl, expect = 1) => add(id, file, find, repl, expect);
const pageScript = (id, file) => F(id, file, '</head>', '<script>' + iife + '\nGTBGTime.u=' + uncFn + ';</script>\n</head>');
const STAGE = P('tmp', 'clock-integrate', 'stage');
const stageText = (target) => { const f = path.join(STAGE, target + '.txt'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
const AFTER = new Set();                               // ids of patches that follow groups A..PERF (asserted against the staged text, not the pristine one)
const after = (id) => { AFTER.add(id); };

// ------------------------------------------------------------------ main bundle
B('CLK-00-module-inline', ',nA=675;function v4(){', ',nA=675;var GTBGT=' + inline + ';GTBGT.u=' + uncFn + ';GTBGT.s=' + subFn + ';function v4(){');
B('CLK-01-module-export', 'IF as t,yn as u};', 'IF as t,yn as u,GTBGT as G};');
B('CLK-02-store-getTickTime', span(bundle, 'getTickTime:()=>{', '},getCurrentDay:'), 'getTickTime:()=>{const{currentTick:x}=f();return GTBGT.f(x,"compat")},getCurrentDay:');
// the three date sites: regex anchors that match the pristine text and the text after T0 patches D1-D3 (so this group also works after them)
BR('CLK-03-hud-date', 'R=`July \\$\\{l(?:\\+2)?\\}, 1863`', 'R=GTBGT.f(x,"date")');
BR('CLK-04-monument-tooltip-JF', 'function JF\\(c,f\\)\\{.*?\\}(?=function KF\\()', 'function JF(c,f){return GTBGT.f(c,"compat")}');
BR('CLK-05-ancestor-timeline-QF', 'function QF\\(c\\)\\{.*?\\}(?=function Zk\\()', 'function QF(c){return GTBGT.f(c,"compat")}');
B('CLK-06-toolbar-clock', 'const xi=(kt==null?void 0:kt())||`Tick ${c}`,va=c<=225?1:c<=450?2:3;', 'const xi=GTBGT.f(c,"chip"),va=c<=225?1:c<=450?2:3;');
B('CLK-07-mobile-header-date', 'V.jsxs("div",{style:tn.clockDay,children:["July ",di]})', 'V.jsx("div",{style:tn.clockDay,children:GTBGT.f(f,"day")})');
// chapter 04 section 4.9: the frame number is a tooltip or ?debug=1 string, never visible text and never "tick": the visible text is the time
B('CLK-08-mobile-transport-frame', 'V.jsxs("div",{style:tn.tickInfo,children:["Tick ",f,"/",P]})', 'V.jsx("div",{style:tn.tickInfo,"data-gt-frame":f,title:GTBGT.f(f,"frame")+" · "+GTBGT.u(f),children:GTBGT.f(f,"time")})');
B('CLK-09-timebar-frame', 'V.jsxs("span",{style:Po.tickNum,children:["Tick ",c,"/675"]})', 'V.jsx("span",{style:Po.tickNum,"data-gt-frame":c,title:GTBGT.f(c,"frame")+" · "+GTBGT.u(c),children:GTBGT.f(c,"time")})');
B('CLK-10-timebar-hour-back', 'onClick:()=>P(c-12),style:Po.btn,title:"Back 1hr (Shift+Left)"', 'onClick:()=>P(GTBGT.after(c,-60)),style:Po.btn,title:"Back 1hr (Shift+Left)"');
B('CLK-11-timebar-hour-forward', 'onClick:()=>P(c+12),style:Po.btn,title:"Fwd 1hr (Shift+Right)"', 'onClick:()=>P(GTBGT.after(c,60)),style:Po.btn,title:"Fwd 1hr (Shift+Right)"');
B('CLK-12-timebar-keys', 'Ie.key==="ArrowRight"&&P(Ie.shiftKey?c+12:c+1),Ie.key==="ArrowLeft"&&P(Ie.shiftKey?c-12:c-1)', 'Ie.key==="ArrowRight"&&P(Ie.shiftKey?GTBGT.after(c,60):c+1),Ie.key==="ArrowLeft"&&P(Ie.shiftKey?GTBGT.after(c,-60):c-1)');
B('CLK-13-global-key-forward', 'currentTick:Math.min(675,Bo+(Ur.shiftKey?12:1))', 'currentTick:Math.min(675,Ur.shiftKey?GTBGT.after(Bo,60):Bo+1)');
B('CLK-14-global-key-back', 'currentTick:Math.max(1,Bo-(Ur.shiftKey?12:1))', 'currentTick:Math.max(1,Ur.shiftKey?GTBGT.after(Bo,-60):Bo-1)');
B('CLK-15-event-card-time', 'V.jsx("div",{style:Vc.time,children:l.time})', 'V.jsx("div",{style:Vc.time,title:GTBGT.u(l.tick),children:GTBGT.f(l.tick,"time")})');
B('CLK-16-unit-panel-time', '["At Tick ",P]', '["At ",GTBGT.f(P,"time")]');
B('CLK-17-toast-time', 'V.jsxs("div",{style:eh.toastTick,children:["Tick ",l.tick]})', 'V.jsx("div",{style:eh.toastTick,children:GTBGT.f(l.tick,"time")})');
B('CLK-18-succession-time', '(tick ${c.successionTick})', '(${GTBGT.f(c.successionTick,"time")})');
B('CLK-19-minimap-footer', '," units · tick ",z]', '," units · ",GTBGT.f(z,"time")]');
// the default name of a new bookmark was the event name or "Tick n" (saved in localStorage, shown in the Bookmarks list): the last visible "Tick n" of the bundle.
// A neutral word, not a clock: a stored label would freeze a clock string into the visitor's storage (the time is shown beside it by CLK-22).
B('CLK-19b-bookmark-default-label', '675:"End of the battle"}[c]||`Tick ${c}`}', '675:"End of the battle"}[c]||"Saved moment"}');
B('CLK-20-vignette-jump', 'title:`Jump to tick ${ze.trigger_tick}`,children:["⏩ ",ze.trigger_tick]', 'title:`Jump to ${GTBGT.f(ze.trigger_tick,"time")}`,children:["⏩ ",GTBGT.f(ze.trigger_tick,"time")]');
// --- surfaces found by the 2026-10-19 audit of the R1c tree (tests/t0/clock.spec.mjs T0-CLK-06..)
// desktop time bar: the big clock says how sure it is; "Prev/Next tick" tooltips; the legend and the opening screen no longer promise five-minute steps
B('CLK-46-timebar-clock-title', 'V.jsx("div",{style:Po.time,children:R()})', 'V.jsx("div",{style:Po.time,title:GTBGT.u(c),children:R()})');
B('CLK-47-timebar-prev-title', 'title:"Prev tick (Left)"', 'title:"Previous step (Left)"');
B('CLK-48-timebar-next-title', 'title:"Next tick (Right)"', 'title:"Next step (Right)"');
B('CLK-49-legend-note', '"unit strength at current tick"', '"unit strength at the current moment"');
B('CLK-50-intro-hero-text', '"July 1–3, 1863 · 675 five-minute snapshots"', '"July 1–3, 1863 · 675 snapshots in time"');
// the unit panel's "Recent Positions" listed bare frame numbers (12, 17, 28 ...): the clock, with the frame number as the tooltip
B('CLK-51-unit-history-time', 'V.jsx("span",{style:ji.histTick,children:pe})', 'V.jsx("span",{style:ji.histTick,title:GTBGT.f(pe,"frame"),children:GTBGT.f(pe,"time")})');
B('CLK-52-unit-history-width', 'histTick:{fontSize:10,color:"#555",fontFamily:"monospace",minWidth:24}', 'histTick:{fontSize:10,color:"#8a8a9a",fontFamily:"monospace",minWidth:84}');
// the scrubber marker called "First shot" sat on frame 17, where the Calef battery opens fire; the first shot is frame 12 (anchor 12, 7:30 AM; chronology and IF())
B('CLK-53-scrubber-first-shot', 'TO=[{tick:17,label:"First shot"', 'TO=[{tick:12,label:"First shot"');
// the Story cards (Tour of 16 stories): the subtitle carried a hand-typed clock ("July 1, 4:00 PM") that was up to 55 minutes away from the frame the card flies to;
// GTBGT.s(subtitle, tick) swaps a trailing typed clock for the clock of that frame and leaves any other subtitle alone ("July 1, early afternoon", "July 2-3"), so it
// holds whatever the data group made of the text.
B('CLK-54-story-subtitle-clock', 'V.jsx("div",{style:Zr.stopSubtitle,children:M.subtitle})', 'V.jsx("div",{style:Zr.stopSubtitle,children:GTBGT.s(M.subtitle,M.tick)})');
// the mobile transport (group C) promised "5 minutes" for a step; a step is 0.8 to 42 minutes of battle time
B('CLK-55-mobile-step-back', '"aria-label":"Step back 5 minutes",title:"Step back 5 minutes"', '"aria-label":"Previous step",title:"Previous step"'); after('CLK-55-mobile-step-back');
B('CLK-56-mobile-step-forward', '"aria-label":"Step forward 5 minutes",title:"Step forward 5 minutes"', '"aria-label":"Next step",title:"Next step"'); after('CLK-56-mobile-step-forward');

// ------------------------------------------------------------------ lazy chunks (they read the module from window.GTBGT)
const BM = 'book', HM = 'help';
add('CLK-21-bookmark-import', BM, 'import{u as L,', 'import{G as GT,u as L,');
add('CLK-22-bookmark-list-time', BM, '["Tick ",e.tick,e.unitId&&', '[GT.f(e.tick,"time"),e.unitId&&');
add('CLK-23-help-import', HM, 'import{r as g,j as e,u as a}from', 'import{G as GT,r as g,j as e,u as a}from');
add('CLK-24-help-step-text', HM, 'desc:"Advance one tick (5 minutes)"', 'desc:"Advance one step"');
add('CLK-25-help-hour-text', HM, 'desc:"Advance one hour (12 ticks)"', 'desc:"Skip forward about one hour of battle time"');
add('CLK-26-help-keys-forward', HM, 'setTick(s.shiftKey?c+12:c+1)', 'setTick(s.shiftKey?GT.after(c,60):c+1)');
add('CLK-27-help-keys-back', HM, 'setTick(s.shiftKey?c-12:c-1)', 'setTick(s.shiftKey?GT.after(c,-60):c-1)');
add('CLK-57-help-step-back', HM, 'desc:"Go back one tick"', 'desc:"Go back one step"');
add('CLK-58-help-day1', HM, 'desc:"Jump to July 1, dawn (tick 1)"', 'desc:"Jump to the July 1 tab, "+GT.f(1,"time")');
add('CLK-59-help-day2', HM, 'desc:"Jump to July 2, dawn (tick 226)"', 'desc:"Jump to the July 2 tab, "+GT.f(226,"time")');
add('CLK-60-help-day3', HM, 'desc:"Jump to July 3, dawn (tick 451)"', 'desc:"Jump to the July 3 tab, "+GT.f(451,"time")');
// bookmarks saved before this release carry the default label "Tick 538" in the visitor's localStorage: shown as "Saved moment" (the time stands beside it)
add('CLK-61-bookmark-old-label', BM, 'children:e.label}),t.jsxs("div",{style:o.itemMeta', 'children:/^Tick \\d+$/.test(e.label)?"Saved moment":e.label}),t.jsxs("div",{style:o.itemMeta');
add('CLK-62-bookmark-remove-label', BM, '"aria-label":"Remove bookmark "+e.label', '"aria-label":"Remove bookmark "+(/^Tick \\d+$/.test(e.label)?"saved moment":e.label)'); after('CLK-62-bookmark-remove-label');

// ------------------------------------------------------------------ static pages (classic scripts: inline GTBGTime global in <head>)
const PAGES = ['compare', 'living-ledger', 'camera', 'immersive', 'documentary', 'education', 'turning-points', 'sandbox', 'regiment', 'search', 'historian', 'cinematic-export', 'watch-together', 'ground-remembers'].map((n) => n + '.html');
const page = Object.fromEntries(PAGES.map((f) => [f, read(f)]));
for (const f of PAGES) pageScript(`CLK-30-module-${f.replace('.html', '')}`, f);

// Compare: replace the local clock (approxTimeForTick); the "Day N" text stays (a tab is a tick range, not a date)
{
  const fn = pageFunction(page['compare.html'], 'approxTimeForTick');
  F('CLK-31-compare-clock', 'compare.html', fn.src, "function approxTimeForTick(tick) {\n    return GTBGTime.f(tick, 'chip');\n  }");
}
// Living Ledger
{
  const fn = pageFunction(page['living-ledger.html'], 'timeForTick');
  F('CLK-32-ledger-clock', 'living-ledger.html', fn.src, "function timeForTick(tick) {\n    return GTBGTime.f(tick, 'compat');\n  }");
  F('CLK-33-ledger-static-clock', 'living-ledger.html', '<div class="clock" id="clock">July 1, 5:00 AM</div>', '<div class="clock" id="clock">July 1, about 5:00 AM</div>');
  F('CLK-34-ledger-callout-time', 'living-ledger.html', '<b>${due.trigger_location}, tick ${due.trigger_tick}:</b>', "<b>${due.trigger_location}, ${GTBGTime.f(due.trigger_tick, 'time')}:</b>");
}
// Camera and Immersive: hour of day from the clock (atmosphere overlay), and the clock instead of "Tick n / 675"
for (const f of ['camera.html', 'immersive.html']) {
  const n = f.replace('.html', '');
  const fn = pageFunction(page[f], 'hourForTick');
  F(`CLK-35-${n}-hour`, f, fn.src, "function hourForTick(tick) {\n    return GTBGTime.hour(tick);\n  }");
  F(`CLK-36-${n}-tick-display`, f, '<span id="tick-display">Tick <b id="tick-num">1</b> / 675</span>', '<span id="tick-display"><b id="tick-num">July 1, about 5:00 AM</b></span>');
  F(`CLK-37-${n}-tick-text`, f, "document.getElementById('tick-num').textContent = tick;", "document.getElementById('tick-num').textContent = GTBGTime.f(tick, 'compat');");
}
// Documentary eyebrow
F('CLK-38-documentary-eyebrow', 'documentary.html', '`Day ${dayForTick(v.trigger_tick)} · Tick ${v.trigger_tick} · ${v.trigger_location}`', "`${GTBGTime.f(v.trigger_tick, 'long')} · ${v.trigger_location}`");
// Education: tab ranges from the module, and a clock line on each card
F('CLK-39-education-tab-ranges', 'education.html', 'const DAY_TICK_RANGES = { 1: [1, 225], 2: [226, 450], 3: [451, 675] };', 'const DAY_TICK_RANGES = { 1: [GTBGTime.tabStart(1), GTBGTime.tabStart(2) - 1], 2: [GTBGTime.tabStart(2), GTBGTime.tabStart(3) - 1], 3: [GTBGTime.tabStart(3), GTBGTime.tickMax] };');
F('CLK-40-education-card-time', 'education.html', 'card.innerHTML = `<div class="story-title">${v.title}</div>', "card.innerHTML = `<div class=\"story-title\">${v.title}</div>\n        <div class=\"story-text\" style=\"font-size:0.85em;opacity:0.75\">${GTBGTime.f(v.trigger_tick, 'long')}</div>");
// Turning Points: date and part of day from the clock instead of the typed "Day 1 · Late afternoon"
F('CLK-41-turning-points-day', 'turning-points.html', '<div class="tp-day">${p.day} &middot; ${p.location}</div>', "<div class=\"tp-day\">${GTBGTime.f(p.tick, 'long')} &middot; ${p.location}</div>");
// Sandbox: option labels start from the clock; the typed description after " -- " stays
F('CLK-42-sandbox-labels', 'sandbox.html', 'opt.value = sp.tick; opt.textContent = sp.label;', "opt.value = sp.tick; opt.textContent = GTBGTime.f(sp.tick, 'long') + ' — ' + sp.label.split(' -- ').slice(1).join(' -- ');");
// Regiment timeline
F('CLK-43-regiment-span', 'regiment.html', 'const span = run.startTick === run.endTick ? `tick ${run.startTick}` : `ticks ${run.startTick}&ndash;${run.endTick}`;', "const span = run.startTick === run.endTick ? GTBGTime.f(run.startTick, 'chip') : GTBGTime.f(run.startTick, 'chip') + '&ndash;' + (GTBGTime.f(run.startTick, 'day') === GTBGTime.f(run.endTick, 'day') ? GTBGTime.f(run.endTick, 'time').replace(/^about /, '') : GTBGTime.f(run.endTick, 'chip'));");
F('CLK-44-regiment-day', 'regiment.html', '<div class="tl-meta">Day ${dayForTick(run.startTick)} &middot; ${span}</div>', '<div class="tl-meta">${GTBGTime.f(run.startTick, \'day\')} &middot; ${span}</div>');
// Search meta
F('CLK-45-search-meta', 'search.html', 'meta: `${v.trigger_location} · Tick ${v.trigger_tick}`,', "meta: `${v.trigger_location} · ${GTBGTime.f(v.trigger_tick, 'compat')}`,");

// Ask the Historian: the chronology answers printed the hand-typed `time` of the data file ("Day 1, 7:30am"); the model clock of the event's frame instead. Done where the
// files are loaded, so the later page groups (which rewrite the answer templates) keep their anchors. The vignette answers printed "tick 12".
F('CLK-70-historian-chronology-clock', 'historian.html', ".then(d => ({ day: i + 1, ...d }))", ".then(d => ({ day: i + 1, ...d, events: (d.events || []).map(e => (e && e.tick ? { ...e, time: GTBGTime.f(e.tick, 'compat') } : e)) }))");
F('CLK-71-historian-vignette-clock', 'historian.html', '(${v.trigger_location}, tick ${v.trigger_tick})', "(${v.trigger_location}, ${GTBGTime.f(v.trigger_tick, 'compat')})");
// Cinematic export: the caption over the picture and the two frame inputs
F('CLK-72-cinematic-caption-preview', 'cinematic-export.html', "v ? `${v.trigger_location} — tick ${startTick}` : `Tick ${startTick}`", "v ? `${v.trigger_location} — ${GTBGTime.f(startTick, 'compat')}` : GTBGTime.f(startTick, 'compat')");
F('CLK-73-cinematic-caption-record', 'cinematic-export.html', "v ? `${v.trigger_location} — tick ${tick}` : `Tick ${tick}`", "v ? `${v.trigger_location} — ${GTBGTime.f(tick, 'compat')}` : GTBGTime.f(tick, 'compat')");
F('CLK-74-cinematic-start-hint', 'cinematic-export.html', '<input type="number" id="start-tick" min="1" max="675" value="540" />', '<input type="number" id="start-tick" min="1" max="675" value="540" /> <small id="start-time" aria-live="polite"></small>');
F('CLK-75-cinematic-end-hint', 'cinematic-export.html', '<input type="number" id="end-tick" min="1" max="675" value="600" />', '<input type="number" id="end-tick" min="1" max="675" value="600" /> <small id="end-time" aria-live="polite"></small>');
F('CLK-76-cinematic-hint-script', 'cinematic-export.html', "document.getElementById('start-tick').addEventListener('change', updatePreview);", "document.getElementById('start-tick').addEventListener('change', updatePreview);\n  [['start-tick', 'start-time'], ['end-tick', 'end-time']].forEach(([inp, out]) => { const el = document.getElementById(inp), o = document.getElementById(out); const upd = () => { const t = Math.round(Number(el.value)); o.textContent = t >= 1 && t <= 675 ? GTBGTime.f(t, 'compat') : ''; }; el.addEventListener('input', upd); el.addEventListener('change', upd); upd(); });");
// Ground Remembers: "Reveal through tick 675"
F('CLK-77-ground-label', 'ground-remembers.html', '<label>Reveal through tick <span id="reveal-label">675</span>', '<label>Reveal through <span id="reveal-label">July 3, about 8:00 PM</span>');
F('CLK-78-ground-label-input', 'ground-remembers.html', 'labelEl.textContent = revealEl.value;', "labelEl.textContent = GTBGTime.f(Number(revealEl.value), 'compat');");
F('CLK-79-ground-label-play', 'ground-remembers.html', 'labelEl.textContent = v;', "labelEl.textContent = GTBGTime.f(v, 'compat');");
// Watch Together: the page group of the sub-pages rewrites the stop rows and the messages, so this is a late hook (after those templates ran): the words "Tick n" become the clock
F('CLK-80-watch-together-late-hook', 'watch-together.html', '<div id="gtbg-footer-mount"></div>', '<script>(function () { var G = window.GTBGTime; if (!G) return;\n  function fix() {\n    var els = document.querySelectorAll(".stop-tick, #caption-bar, #add-stop-msg");\n    for (var i = 0; i < els.length; i++) { var el = els[i], t = el.textContent, m = /^Tick (\\d+)(?: — ([\\s\\S]*))?$/.exec(t);\n      if (m) { var s = G.f(+m[1], "compat"); el.textContent = m[2] != null ? s + " — " + m[2] : s; }\n      else if (/tick number/.test(t)) el.textContent = t.replace("tick number", "frame number"); }\n  }\n  var inp = document.getElementById("new-tick");\n  if (inp) { inp.setAttribute("placeholder", "Frame (1-675)"); inp.setAttribute("aria-label", "Frame number"); var h = document.createElement("small"); h.setAttribute("aria-live", "polite"); h.id = "new-tick-time"; inp.insertAdjacentElement("afterend", h);\n    var upd = function () { var n = Math.round(Number(inp.value)); h.textContent = inp.value.trim() !== "" && n >= 1 && n <= 675 ? " " + G.f(n, "compat") : ""; }; inp.addEventListener("input", upd); }\n  new MutationObserver(fix).observe(document.body, { childList: true, subtree: true, characterData: true }); fix();\n})();</script>\n<div id="gtbg-footer-mount"></div>');

// Compare: "Tick 60" beside each slider and "as of tick n" in the unit popup showed frame numbers; the left label is now the date, the right one the time, the frame and the uncertainty a tooltip
for (const side of [['a', '60'], ['b', '300']]) {
  F(`CLK-81-compare-label-${side[0]}`, 'compare.html', `<span>Tick <b id="tick-num-${side[0]}">${side[1]}</b></span>`, `<span><b id="tick-num-${side[0]}">July 1</b></span>`);
}
F('CLK-82-compare-label-text', 'compare.html', 'document.getElementById(tickNumId).textContent = tick;', "{ const nb = document.getElementById(tickNumId); nb.textContent = GTBGTime.f(tick, 'day'); nb.title = GTBGTime.f(tick, 'frame') + ' · ' + GTBGTime.u(tick); }");
F('CLK-83-compare-popup', 'compare.html', 'as of tick ${p.asOfTick}', "as of ${GTBGTime.f(p.asOfTick, 'compat')}");
F('CLK-84-compare-hint', 'compare.html', 'Set each map to a different tick and compare unit positions side by side', 'Set each map to a different moment and compare unit positions side by side');
// Camera and Immersive describe their behaviour with "each tick"
F('CLK-85-camera-prose', 'camera.html', 'wherever the most units are engaged, each tick.', 'wherever the most units are engaged, at every step.');
F('CLK-86-immersive-prose', 'immersive.html', 'real unit density at each tick --', 'real unit density at each moment --');
// Sandbox presets: the descriptions say what the frame shows; the old clock put them at 4:10 PM ("before Longstreet's assault": it opens at 4:00 PM, anchor 256),
// 3:45 PM ("moments before Pickett's Charge reaches the wall": Armistead is over the wall at 3:35 PM, anchor 551) and 3:45 PM ("mid-morning": I Corps on McPherson's Ridge is the 10:15 AM
// fight, anchor 28). Each starts on a frame the anchors put inside what its description says: 252 (3:30 PM), 548 (3:25 PM), 30 (10:25 AM). The label's clock comes from CLK-42.
F('CLK-87-sandbox-preset-1', 'sandbox.html', '{ tick: 260, label: "Day 2, mid-afternoon (tick 260) -- before Longstreet\'s assault" },', '{ tick: 252, label: "Day 2, mid-afternoon -- before Longstreet\'s assault opens" },');
F('CLK-88-sandbox-preset-2', 'sandbox.html', '{ tick: 553, label: "Day 3, ~3:00pm (tick 553) -- moments before Pickett\'s Charge reaches the wall" },', '{ tick: 548, label: "Day 3, mid-afternoon -- moments before Pickett\'s Charge reaches the wall" },');
F('CLK-89-sandbox-preset-3', 'sandbox.html', '{ tick: 62, label: "Day 1, mid-morning (tick 62) -- I Corps holding McPherson\'s Ridge" },', '{ tick: 30, label: "Day 1, mid-morning -- I Corps holding McPherson\'s Ridge" },');
F('CLK-90-sandbox-default', 'sandbox.html', 'loadTickIntoSandbox(260);', 'loadTickIntoSandbox(252);');
// Cinematic export: the two inputs ask for a frame number; the visible words say frame, not tick (the sub-page group wrote those labels, so this is a late hook)
F('CLK-91-cinematic-labels-hook', 'cinematic-export.html', '<div id="gtbg-footer-mount"></div>', '<script>(function () { var m = { "start-tick": "Start frame", "end-tick": "End frame" }; Object.keys(m).forEach(function (id) { var l = document.querySelector(\'label[for="\' + id + \'"]\'); if (!l) { var i = document.getElementById(id); l = i && i.parentElement && i.parentElement.querySelector("label"); } if (l) l.textContent = m[id]; }); })();</script>\n<div id="gtbg-footer-mount"></div>');

// ------------------------------------------------------------------ chapter 04 section 4.9: the frame number is never visible text
// ("Frame 538 of 675" is allowed as a tooltip: every frame-style call must be the value of a `title:` property or attribute)
for (const p of patches) {
  for (const m of p.repl.matchAll(/\w+\.f\([^()]*,\s*["']frame["']\s*\)/g)) {
    if (!/title\s*[:=]\s*["'`]?$/.test(p.repl.slice(Math.max(0, m.index - 12), m.index))) throw new Error(`${p.id}: the frame style must only feed a title (tooltip), found ${m[0]} outside one`);
  }
  if (/["'`]Tick\b|\btick \$\{|Tick \$\{/.test(p.repl)) throw new Error(`${p.id}: visible "Tick" text (chapter 04 section 4.9)`);
}

// ------------------------------------------------------------------ sanity: every anchor must match the pristine text exactly `expect` times
// (patches that follow groups A..PERF: the staged text of a build without CLOCK, written by tools/t0/clock/build-clock.mjs)
const texts = { js: bundle, book: read('assets/BookmarkPanel-C5YT4b5k.js'), help: read('assets/HelpModal-CFV9T0zH.js') };
for (const f of PAGES) texts[f] = page[f];
let checkedStaged = 0;
for (const p of patches) {
  let t = texts[p.target]; if (t == null) throw new Error(`unknown target ${p.target}`);
  if (AFTER.has(p.id)) { t = stageText(p.target); if (t == null) { console.warn(`note: ${p.id} follows groups A..PERF and no staged text exists (run node tools/t0/clock/build-clock.mjs): not asserted here`); continue; } checkedStaged++; }
  const n = p.regex ? [...t.matchAll(new RegExp(p.find, 'g'))].length : countOf(t, p.find);
  if (n !== p.expect) throw new Error(`${p.id}: expected ${p.expect} match(es), found ${n}`);
  if (p.regex && /\\(?!g<\d>)/.test(p.repl)) throw new Error(`${p.id}: a regex patch repl may contain a backslash only as a group reference`);
}
const NOTES = {
  'CLK-00-module-inline': 'Inlines the canonical time module (33 adjudicated anchors, data-src/time/time_anchors.json) as GTBGT, plus GTBGT.u (how sure the clock is: tooltip text from the anchors) and GTBGT.s (swaps a typed clock at the end of a story subtitle for the clock of its frame)',
  'CLK-01-module-export': 'exports GTBGT as G so the lazy chunks import it (no bare window reference: the T0 unresolved-globals gate)',
  'CLK-02-store-getTickTime': 'store clock (toolbar label, time bar, mobile header): base 06:00/04:00 and no rollover replaced by the model; keeps the "July N, h:mm AM" shape the mobile header splits on',
  'CLK-03-hud-date': 'HUD badge printed July 3-5 (tab + 2); now the true calendar date, "Night of July 1-2" between midnight and first light. Regex so it also matches after T0 patch D1',
  'CLK-04-monument-tooltip-JF': 'monument hover clock: base 05:00, date + 2 replaced by the model. Regex so it also matches after T0 patch D2',
  'CLK-05-ancestor-timeline-QF': 'Follow-Your-Ancestor rows: same. Regex so it also matches after T0 patch D3',
  'CLK-06-toolbar-clock': 'desktop toolbar: time only ("about 3:00 PM"), no second date beside the "July N" tab label',
  'CLK-07-mobile-header-date': 'mobile header: date from the clock, "Night of July 1-2" after midnight (a Day tab is not a date)',
  'CLK-08-mobile-transport-frame': 'mobile transport row: the time ("about 3:00 PM") instead of "Tick n/675"; "Frame n of 675" and the uncertainty only in the tooltip (chapter 04 section 4.9: never visible text); data-gt-frame carries the frame id for tests and tools',
  'CLK-09-timebar-frame': 'time bar footer: the time instead of "Tick n/675"; "Frame n of 675" only in the tooltip (chapter 04 section 4.9)',
  'CLK-10-timebar-hour-back': 'Back 1hr was 12 ticks (12 minutes to 42 hours of battle time): now 60 battle minutes',
  'CLK-11-timebar-hour-forward': 'Fwd 1hr: same',
  'CLK-12-timebar-keys': 'time bar Shift+arrow: 60 battle minutes',
  'CLK-13-global-key-forward': 'global Shift+ArrowRight: 60 battle minutes',
  'CLK-14-global-key-back': 'global Shift+ArrowLeft: 60 battle minutes',
  'CLK-15-event-card-time': 'event card printed the hand-typed label (5 of 102 within 30 min of history); now the model time at the event tick',
  'CLK-16-unit-panel-time': '"At Tick n" becomes "At 4:30 PM"',
  'CLK-17-toast-time': 'commander toast footer "Tick n" becomes a time',
  'CLK-18-succession-time': 'unit panel succession "(tick n)" becomes a time',
  'CLK-19-minimap-footer': 'minimap footer "tick n" becomes a time (the units count itself is a T0 patch)',
  'CLK-20-vignette-jump': 'vignette jump button and tooltip show a time, not a tick number',
  'CLK-21-bookmark-import': 'Bookmarks chunk imports GTBGT from the entry (export G)',
  'CLK-22-bookmark-list-time': 'Bookmarks list meta "Tick n" becomes a time',
  'CLK-19b-bookmark-default-label': 'the default name of a new bookmark ("Tick n" when the tick has no event name) becomes "Saved moment": the last visible "Tick n" in the bundle; a neutral word, because the label is stored in the visitor\'s browser and must not freeze a clock string',
  'CLK-23-help-import': 'Help chunk imports GTBGT from the entry (export G)',
  'CLK-24-help-step-text': 'Help said one step is 5 minutes; steps are 0.8 to 42 minutes of battle time',
  'CLK-25-help-hour-text': 'Help said one hour is 12 ticks; the hour buttons now step 60 battle minutes',
  'CLK-26-help-keys-forward': 'Help chunk keyboard handler: Shift+ArrowRight 60 battle minutes',
  'CLK-27-help-keys-back': 'Help chunk keyboard handler: Shift+ArrowLeft 60 battle minutes',
  'CLK-46-timebar-clock-title': 'desktop time bar: the big clock carries a tooltip with the uncertainty and the adjudicated status (GTBGT.u)',
  'CLK-47-timebar-prev-title': 'tooltip "Prev tick (Left)" becomes "Previous step (Left)" (a frame is not shown as a tick)',
  'CLK-48-timebar-next-title': 'tooltip "Next tick (Right)" becomes "Next step (Right)"',
  'CLK-49-legend-note': 'legend note "at current tick" becomes "at the current moment"',
  'CLK-50-intro-hero-text': 'opening screen promised "675 five-minute snapshots"; the frames are 0.8 to 42 minutes of battle time apart',
  'CLK-51-unit-history-time': 'unit panel "Recent Positions" listed bare frame numbers (12, 17, 28); now the clock, the frame number only in the tooltip',
  'CLK-52-unit-history-width': 'room for the clock text in that column; the colour passes 4.5:1 on the panel background',
  'CLK-53-scrubber-first-shot': 'the scrubber marker "First shot" sat on frame 17 (Calef opens fire); the first shot is frame 12 (anchor 12, 7:30 AM; time-plan defect TICK-PLACEMENT)',
  'CLK-54-story-subtitle-clock': 'Story card subtitle: a typed clock at its end ("July 1, 4:00 PM") becomes the clock of the frame the card flies to; other subtitles stay',
  'CLK-55-mobile-step-back': 'mobile transport (group C) said "Step back 5 minutes"; a step is 0.8 to 42 minutes of battle time',
  'CLK-56-mobile-step-forward': 'same for the forward step',
  'CLK-57-help-step-back': 'Help: "Go back one tick" becomes "Go back one step"',
  'CLK-58-help-day1': 'Help: the 1 key jumps to the July 1 tab, shown with its clock instead of "dawn (tick 1)"',
  'CLK-59-help-day2': 'Help: the 2 key, same',
  'CLK-60-help-day3': 'Help: the 3 key, same',
  'CLK-61-bookmark-old-label': 'bookmarks saved by earlier releases have the label "Tick n" in the visitor\'s storage: listed as "Saved moment"',
  'CLK-62-bookmark-remove-label': 'same for the screen-reader name of the remove button',
};
const PAGE_NOTE = { 'CLK-30': 'inlines the GTBGTime global (classic script) for this page', 'CLK-31': 'Compare: local clock deleted; time from the model (the "Day N" text stays: a tab is a tick range)', 'CLK-32': 'Living Ledger clock from the model', 'CLK-33': 'Ledger static clock text (visible before scripts run) marked approximate', 'CLK-34': 'Ledger callout: a time instead of "tick n"', 'CLK-35': 'atmosphere overlay hour from the clock (thresholds unchanged; WP-TIME-13 replaces them with the solar table)', 'CLK-36': 'shows the clock instead of "Tick n / 675"', 'CLK-37': 'clock text per tick', 'CLK-38': 'Documentary eyebrow: date and time from the clock, no tick number', 'CLK-39': 'Education tab ranges from the module instead of hard-coded 1/225/226/450/451/675', 'CLK-40': 'Education cards show their clock time', 'CLK-41': 'Turning Points: date and time from the clock instead of the typed day part (t175 now reads as night: the misplaced tick becomes visible)', 'CLK-42': 'Sandbox presets start from the clock; the typed description after " -- " stays (t260 is 4:11 PM, after the assault began: content triage)', 'CLK-43': 'Regiment timeline spans as clock times', 'CLK-44': 'Regiment day label from the clock', 'CLK-45': 'Search result meta: a time instead of "Tick n"', 'CLK-70': 'Ask the Historian: chronology answers show the model clock of the event frame (done where the file is loaded, so the later page groups keep their anchors)', 'CLK-71': 'Ask the Historian: vignette answers show the clock instead of "tick n"', 'CLK-72': 'Cinematic export: preview caption shows the clock', 'CLK-73': 'Cinematic export: recorded captions show the clock', 'CLK-74': 'Cinematic export: the clock beside the start frame input', 'CLK-75': 'Cinematic export: the clock beside the end frame input', 'CLK-76': 'Cinematic export: keeps those two clocks current', 'CLK-77': 'Ground Remembers: "Reveal through tick 675" becomes the clock', 'CLK-78': 'Ground Remembers: the label follows the slider', 'CLK-79': 'Ground Remembers: the label follows the build-up animation', 'CLK-81': 'Compare: the label beside each slider is the date, not "Tick n"', 'CLK-82': 'Compare: that label follows the slider; the frame number and the uncertainty are its tooltip', 'CLK-83': 'Compare: unit popup "as of tick n" becomes the clock', 'CLK-84': 'Compare: the hint no longer says tick', 'CLK-85': 'Camera: prose says step, not tick', 'CLK-86': 'Immersive: prose says moment, not tick', 'CLK-87': 'Sandbox preset 1 starts at frame 252 (3:30 PM), before the assault that opens at 4:00 PM (anchor 256); it was frame 260 (4:10 PM)', 'CLK-88': 'Sandbox preset 2 starts at frame 548 (3:25 PM), before Armistead is over the wall at 3:35 PM (anchor 551); it was frame 553 (3:45 PM)', 'CLK-89': 'Sandbox preset 3 starts at frame 30 (10:25 AM), I Corps on McPherson\'s Ridge (anchor 28, 10:15 AM); it was frame 62 (3:45 PM, "mid-morning")', 'CLK-90': 'Sandbox opens on the first preset (frame 252)', 'CLK-91': 'Cinematic export: the input labels say frame (late hook, the sub-page group wrote the labels)', 'CLK-80': 'Watch Together: a late hook (the sub-page group rewrites the stop rows and messages) turns "Tick n" into the clock, the input into a frame field with its clock beside it' };
for (const p of patches) { const n = NOTES[p.id] || PAGE_NOTE[p.id.slice(0, 6)]; if (n) p.note = n; else throw new Error('no note for ' + p.id); }
const description = 'Optional group CLOCK (owner decision 2026-10-05, item 2): every clock, date and time-derived string of the app and of 14 static pages comes from the one time module (data-src/time/time_anchors.json, 33 adjudicated anchors, none signed), printed with "about", with the uncertainty in the tooltip. Ticks stay permanent frame ids. Regenerate: node tools/t0/clock/build-clock.mjs. Inert in patches-next until registered (tools/t0/CLOCK-README.md).';
const json = JSON.stringify({ group: 'CLOCK', description, patches }, null, 1) + '\n';
const out = P('tools', 't0', 'patches-next', 'CLOCK.json');
const wrote = writeIfChanged(out, json);
console.log(`${patches.length} patches (${patches.filter((p) => p.regex).length} regex) -> tools/t0/patches-next/CLOCK.json ${wrote ? 'written' : 'unchanged'} (${json.length} bytes)`);
