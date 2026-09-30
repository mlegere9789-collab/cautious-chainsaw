#!/usr/bin/env node
// Generates tools/t0/patches-next/CLOCK.json: the CANDIDATE clock bridge for the frozen legacy app and static pages (WP-TIME-10 bridge).
//
// It routes every clock surface (store clock, HUD, toolbar, mobile header, time bar, tooltips, ancestor rows, event card, unit panel,
// toasts, successions, minimap, hour buttons and keys, Bookmarks/Help chunks, Compare, Living Ledger, Camera, Immersive, Documentary,
// Education, Turning Points, Sandbox, Regiment, Search) through the canonical module inlined as a small function, and marks every
// time as visibly approximate ("about 3:00 PM") because no anchor is signed.
//
// Format (tools/t0/patches/*.json, see tools/t0/README.md): {group, description, patches:[{id, target, find, repl, expect, regex?, note?}]}.
// target: "js" the entry bundle, "help" / "book" the lazy chunks, otherwise a dist-relative path (compare.html ...). A regex patch uses
// Python re semantics and m.expand(repl), so no regex patch repl contains a backslash. Non-regex patches are plain replacements.
// To activate after sign-off: git mv it to tools/t0/patches/B+CLOCK.json and set "group": "B" (extension part of the clock group, R1c),
// or give CLOCK its own entry in trains.json (owner of that file: t0-core). Both were exercised by tools/time/sandbox-build.mjs.
//
// NOTHING HERE SHIPS until the owner and the historian approve the anchors (D-TIME). The file lives in patches-next/ (inert; the T0
// builder loads only tools/t0/patches/). Anchors are asserted against the pristine legacy text by tools/time/check-patches.mjs.
import fs from 'node:fs';
import { P, BUNDLE, writeIfChanged } from './lib.mjs';
import { read, pageFunction, countOf, span } from './extract.mjs';

const bundle = read(BUNDLE);
const inline = fs.readFileSync(P('tools', 'time', 'build', 'gtbg-time.inline.js'), 'utf8').trim();
const iife = fs.readFileSync(P('tools', 'time', 'build', 'gtbg-time.iife.js'), 'utf8').trim();
if (!inline.startsWith('(function(){')) throw new Error('run node tools/time/build.mjs first');

const patches = [];
const add = (id, target, find, repl, expect = 1, regex = false) => { const o = { id, target, find, repl, expect }; if (regex) o.regex = true; patches.push(o); };
const B = (id, find, repl, expect = 1) => add(id, 'js', find, repl, expect);
const BR = (id, find, repl, expect = 1) => add(id, 'js', find, repl, expect, true);
const F = (id, file, find, repl, expect = 1) => add(id, file, find, repl, expect);
const pageScript = (id, file) => F(id, file, '</head>', '<script>' + iife + '</script>\n</head>');

// ------------------------------------------------------------------ main bundle
B('CLK-00-module-inline', ',nA=675;function v4(){', ',nA=675;var GTBGT=' + inline + ';function v4(){');
B('CLK-01-module-export', 'IF as t,yn as u};', 'IF as t,yn as u,GTBGT as G};');
B('CLK-02-store-getTickTime', span(bundle, 'getTickTime:()=>{', '},getCurrentDay:'), 'getTickTime:()=>{const{currentTick:x}=f();return GTBGT.f(x,"compat")},getCurrentDay:');
// the three date sites: regex anchors that match the pristine text and the text after T0 patches D1-D3 (so this group also works after them)
BR('CLK-03-hud-date', 'R=`July \\$\\{l(?:\\+2)?\\}, 1863`', 'R=GTBGT.f(x,"date")');
BR('CLK-04-monument-tooltip-JF', 'function JF\\(c,f\\)\\{.*?\\}(?=function KF\\()', 'function JF(c,f){return GTBGT.f(c,"compat")}');
BR('CLK-05-ancestor-timeline-QF', 'function QF\\(c\\)\\{.*?\\}(?=function Zk\\()', 'function QF(c){return GTBGT.f(c,"compat")}');
B('CLK-06-toolbar-clock', 'const xi=(kt==null?void 0:kt())||`Tick ${c}`,va=c<=225?1:c<=450?2:3;', 'const xi=GTBGT.f(c,"chip"),va=c<=225?1:c<=450?2:3;');
B('CLK-07-mobile-header-date', 'V.jsxs("div",{style:tn.clockDay,children:["July ",di]})', 'V.jsx("div",{style:tn.clockDay,children:GTBGT.f(f,"day")})');
B('CLK-08-mobile-transport-frame', 'V.jsxs("div",{style:tn.tickInfo,children:["Tick ",f,"/",P]})', 'V.jsx("div",{style:tn.tickInfo,children:GTBGT.f(f,"frame")})');
B('CLK-09-timebar-frame', 'V.jsxs("span",{style:Po.tickNum,children:["Tick ",c,"/675"]})', 'V.jsx("span",{style:Po.tickNum,children:GTBGT.f(c,"frame")})');
B('CLK-10-timebar-hour-back', 'onClick:()=>P(c-12),style:Po.btn,title:"Back 1hr (Shift+Left)"', 'onClick:()=>P(GTBGT.after(c,-60)),style:Po.btn,title:"Back 1hr (Shift+Left)"');
B('CLK-11-timebar-hour-forward', 'onClick:()=>P(c+12),style:Po.btn,title:"Fwd 1hr (Shift+Right)"', 'onClick:()=>P(GTBGT.after(c,60)),style:Po.btn,title:"Fwd 1hr (Shift+Right)"');
B('CLK-12-timebar-keys', 'Ie.key==="ArrowRight"&&P(Ie.shiftKey?c+12:c+1),Ie.key==="ArrowLeft"&&P(Ie.shiftKey?c-12:c-1)', 'Ie.key==="ArrowRight"&&P(Ie.shiftKey?GTBGT.after(c,60):c+1),Ie.key==="ArrowLeft"&&P(Ie.shiftKey?GTBGT.after(c,-60):c-1)');
B('CLK-13-global-key-forward', 'currentTick:Math.min(675,Bo+(Ur.shiftKey?12:1))', 'currentTick:Math.min(675,Ur.shiftKey?GTBGT.after(Bo,60):Bo+1)');
B('CLK-14-global-key-back', 'currentTick:Math.max(1,Bo-(Ur.shiftKey?12:1))', 'currentTick:Math.max(1,Ur.shiftKey?GTBGT.after(Bo,-60):Bo-1)');
B('CLK-15-event-card-time', 'V.jsx("div",{style:Vc.time,children:l.time})', 'V.jsx("div",{style:Vc.time,children:GTBGT.f(l.tick,"time")})');
B('CLK-16-unit-panel-time', '["At Tick ",P]', '["At ",GTBGT.f(P,"time")]');
B('CLK-17-toast-time', 'V.jsxs("div",{style:eh.toastTick,children:["Tick ",l.tick]})', 'V.jsx("div",{style:eh.toastTick,children:GTBGT.f(l.tick,"time")})');
B('CLK-18-succession-time', '(tick ${c.successionTick})', '(${GTBGT.f(c.successionTick,"time")})');
B('CLK-19-minimap-footer', '," units · tick ",z]', '," units · ",GTBGT.f(z,"time")]');
B('CLK-20-vignette-jump', 'title:`Jump to tick ${ze.trigger_tick}`,children:["⏩ ",ze.trigger_tick]', 'title:`Jump to ${GTBGT.f(ze.trigger_tick,"time")}`,children:["⏩ ",GTBGT.f(ze.trigger_tick,"time")]');

// ------------------------------------------------------------------ lazy chunks (they read the module from window.GTBGT)
const BM = 'book', HM = 'help';
add('CLK-21-bookmark-import', BM, 'import{u as L,', 'import{G as GT,u as L,');
add('CLK-22-bookmark-list-time', BM, '["Tick ",e.tick,e.unitId&&', '[GT.f(e.tick,"time"),e.unitId&&');
add('CLK-23-help-import', HM, 'import{r as g,j as e,u as a}from', 'import{G as GT,r as g,j as e,u as a}from');
add('CLK-24-help-step-text', HM, 'desc:"Advance one tick (5 minutes)"', 'desc:"Advance one step"');
add('CLK-25-help-hour-text', HM, 'desc:"Advance one hour (12 ticks)"', 'desc:"Skip forward about one hour of battle time"');
add('CLK-26-help-keys-forward', HM, 'setTick(s.shiftKey?c+12:c+1)', 'setTick(s.shiftKey?GT.after(c,60):c+1)');
add('CLK-27-help-keys-back', HM, 'setTick(s.shiftKey?c-12:c-1)', 'setTick(s.shiftKey?GT.after(c,-60):c-1)');

// ------------------------------------------------------------------ static pages (classic scripts: inline GTBGTime global in <head>)
const PAGES = ['compare', 'living-ledger', 'camera', 'immersive', 'documentary', 'education', 'turning-points', 'sandbox', 'regiment', 'search'].map((n) => n + '.html');
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
F('CLK-43-regiment-span', 'regiment.html', 'const span = run.startTick === run.endTick ? `tick ${run.startTick}` : `ticks ${run.startTick}&ndash;${run.endTick}`;', "const span = run.startTick === run.endTick ? GTBGTime.f(run.startTick, 'chip') : GTBGTime.f(run.startTick, 'chip') + '&ndash;' + GTBGTime.f(run.endTick, 'chip');");
F('CLK-44-regiment-day', 'regiment.html', '<div class="tl-meta">Day ${dayForTick(run.startTick)} &middot; ${span}</div>', '<div class="tl-meta">${GTBGTime.f(run.startTick, \'day\')} &middot; ${span}</div>');
// Search meta
F('CLK-45-search-meta', 'search.html', 'meta: `${v.trigger_location} · Tick ${v.trigger_tick}`,', "meta: `${v.trigger_location} · ${GTBGTime.f(v.trigger_tick, 'compat')}`,");

// ------------------------------------------------------------------ sanity: every anchor must match the pristine text exactly `expect` times
const texts = { js: bundle, book: read('assets/BookmarkPanel-C5YT4b5k.js'), help: read('assets/HelpModal-CFV9T0zH.js') };
for (const f of PAGES) texts[f] = page[f];
for (const p of patches) {
  const t = texts[p.target]; if (t == null) throw new Error(`unknown target ${p.target}`);
  const n = p.regex ? [...t.matchAll(new RegExp(p.find, 'g'))].length : countOf(t, p.find);
  if (n !== p.expect) throw new Error(`${p.id}: expected ${p.expect} match(es), found ${n}`);
  if (p.regex && /\\/.test(p.repl)) throw new Error(`${p.id}: a regex patch repl must not contain a backslash`);
}
const NOTES = {
  'CLK-00-module-inline': 'CANDIDATE. Inlines the canonical module (33 proposed anchors, dv 2) as GTBGT; nothing ships before the owner/historian approve D-TIME',
  'CLK-01-module-export': 'exports GTBGT as G so the lazy chunks import it (no bare window reference: the T0 unresolved-globals gate)',
  'CLK-02-store-getTickTime': 'store clock (toolbar label, time bar, mobile header): base 06:00/04:00 and no rollover replaced by the model; keeps the "July N, h:mm AM" shape the mobile header splits on',
  'CLK-03-hud-date': 'HUD badge printed July 3-5 (tab + 2); now the true calendar date, "Night of July 1-2" between midnight and first light. Regex so it also matches after T0 patch D1',
  'CLK-04-monument-tooltip-JF': 'monument hover clock: base 05:00, date + 2 replaced by the model. Regex so it also matches after T0 patch D2',
  'CLK-05-ancestor-timeline-QF': 'Follow-Your-Ancestor rows: same. Regex so it also matches after T0 patch D3',
  'CLK-06-toolbar-clock': 'desktop toolbar: time only ("about 3:00 PM"), no second date beside the "July N" tab label',
  'CLK-07-mobile-header-date': 'mobile header: date from the clock, "Night of July 1-2" after midnight (a Day tab is not a date)',
  'CLK-08-mobile-transport-frame': 'mobile transport row: "Frame n of 675" instead of "Tick n/675"',
  'CLK-09-timebar-frame': 'time bar footer: "Frame n of 675" instead of "Tick n/675"',
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
  'CLK-23-help-import': 'Help chunk imports GTBGT from the entry (export G)',
  'CLK-24-help-step-text': 'Help said one step is 5 minutes; steps are 0.8 to 42 minutes of battle time',
  'CLK-25-help-hour-text': 'Help said one hour is 12 ticks; the hour buttons now step 60 battle minutes',
  'CLK-26-help-keys-forward': 'Help chunk keyboard handler: Shift+ArrowRight 60 battle minutes',
  'CLK-27-help-keys-back': 'Help chunk keyboard handler: Shift+ArrowLeft 60 battle minutes',
};
const PAGE_NOTE = { 'CLK-30': 'inlines the GTBGTime global (classic script) for this page', 'CLK-31': 'Compare: local clock deleted; time from the model (the "Day N" text stays: a tab is a tick range)', 'CLK-32': 'Living Ledger clock from the model', 'CLK-33': 'Ledger static clock text (visible before scripts run) marked approximate', 'CLK-34': 'Ledger callout: a time instead of "tick n"', 'CLK-35': 'atmosphere overlay hour from the clock (thresholds unchanged; WP-TIME-13 replaces them with the solar table)', 'CLK-36': 'shows the clock instead of "Tick n / 675"', 'CLK-37': 'clock text per tick', 'CLK-38': 'Documentary eyebrow: date and time from the clock, no tick number', 'CLK-39': 'Education tab ranges from the module instead of hard-coded 1/225/226/450/451/675', 'CLK-40': 'Education cards show their clock time', 'CLK-41': 'Turning Points: date and time from the clock instead of the typed day part (t175 now reads as night: the misplaced tick becomes visible)', 'CLK-42': 'Sandbox presets start from the clock; the typed description after " -- " stays (t260 is 4:11 PM, after the assault began: content triage)', 'CLK-43': 'Regiment timeline spans as clock times', 'CLK-44': 'Regiment day label from the clock', 'CLK-45': 'Search result meta: a time instead of "Tick n"' };
for (const p of patches) { const n = NOTES[p.id] || PAGE_NOTE[p.id.slice(0, 6)]; if (n) p.note = n; else throw new Error('no note for ' + p.id); }
const description = 'CANDIDATE clock bridge (WP-TIME-10): routes every clock surface of the frozen app and 10 static pages through the canonical module, marks times approximate. Not approved: D-TIME sign-off pending. Inert in patches-next.';
const json = JSON.stringify({ group: 'CLOCK', description, patches }, null, 1) + '\n';
const out = P('tools', 't0', 'patches-next', 'CLOCK.json');
const wrote = writeIfChanged(out, json);
console.log(`${patches.length} patches (${patches.filter((p) => p.regex).length} regex) -> tools/t0/patches-next/CLOCK.json ${wrote ? 'written' : 'unchanged'} (${json.length} bytes)`);
