// tests/t0/lib_clock.mjs - helpers for specs that must read the clock of a tree WITH the CLOCK group and of a tree without it.
// CLOCK (tools/t0/CLOCK-README.md) removes "Tick n/675" and "n units . tick m" from the page: the frame is the data-gt-frame attribute of the footer clock (desktop) or the
// transport row (phone shell); the minimap caption reads "n units . about 5:00 AM" and the toolbar clock "July 1, about 5:00 AM" (a legacy tree prints "July 1, 6:00 AM").
// Trees without CLOCK keep the old text; every helper reads the attribute first and falls back to the legacy text, so one spec checks both.

/** the frame number (1..675) the page shows, or null */
export async function readFrame(page) {
  return page.evaluate(() => {
    const f = document.querySelector('[data-gt-frame]');
    if (f) { const n = Number(f.getAttribute('data-gt-frame')); if (Number.isFinite(n)) return n; }
    const m = /Tick (\d+)\/675/.exec(document.body.innerText);
    return m ? Number(m[1]) : null;
  });
}

/** parse text (document.body.innerText) for the minimap caption: { units, legacyTick (null on a CLOCK tree), label } */
export function parseCaption(text) {
  const m = /(\d+) units · (?:tick (\d+)|([^\n|]+?))(?:\s{2,}|\n|$)/.exec(text.replace(/\s+/g, ' ') + '\n') || /(\d+) units · (?:tick (\d+)|(about [^|]*?\d{1,2}:\d{2} [AP]M|\d{1,2}:\d{2} [AP]M))/.exec(text.replace(/\s+/g, ' '));
  return m ? { units: Number(m[1]), legacyTick: m[2] ? Number(m[2]) : null, label: m[3] || null } : null;
}

/** the toolbar/HUD clock in either wording: "July 1, 6:00 AM" or "July 1, about 6:00 AM": { day, clock } */
export function parseClock(text) {
  const m = /July (\d+), (?:about )?(\d{1,2}:\d{2} [AP]M)/.exec(text);
  return m ? { day: Number(m[1]), clock: m[2] } : null;
}

/** one atomic snapshot of the page for specs that compare the frame with what the page prints (no race between two evaluates): { text (whitespace-collapsed innerText), frame (number|null) } */
export async function readPageState(page) {
  return page.evaluate(() => {
    const text = document.body.innerText.replace(/\s+/g, ' ');
    let frame = null;
    const f = document.querySelector('[data-gt-frame]');
    if (f) { const n = Number(f.getAttribute('data-gt-frame')); if (Number.isFinite(n)) frame = n; }
    if (frame === null) { const m = /Tick (\d+)\/675/.exec(text); if (m) frame = Number(m[1]); }
    return { text, frame };
  });
}

/** the toolbar clock with its wording kept: "July 1, about 5:00 AM" gives { day: 1, label: 'about 5:00 AM' }, a legacy tree "July 1, 6:00 AM" gives { day: 1, label: '6:00 AM' } */
export function parseClockLabel(text) {
  const m = /July (\d+), ((?:about )?\d{1,2}:\d{2} [AP]M)/.exec(text);
  return m ? { day: Number(m[1]), label: m[2] } : null;
}

/** the minimap caption in whitespace-collapsed text (parseCaption expects the raw line structure): "27 units · about 5:00 AM" gives { units: 27, legacyTick: null, label: 'about 5:00 AM' }, "70 units · tick 12" gives { units: 70, legacyTick: 12, label: null } */
export function parseCaptionCollapsed(text) {
  const m = /(\d+) units · (?:tick (\d+)|((?:about )?\d{1,2}:\d{2} [AP]M))/.exec(text);
  return m ? { units: Number(m[1]), legacyTick: m[2] ? Number(m[2]) : null, label: m[3] || null } : null;
}

// ---- added by the spec-repair pass (functions only; nothing above this line changed) ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));

/** the patch groups a built tree carries (its version.json), or [] for a tree without one (legacy/dist) */
export function treeGroups(dist) {
  try { return JSON.parse(fs.readFileSync(path.join(dist, 'version.json'), 'utf8')).groups || []; } catch { return []; }
}
/** true when the tree under test was built with the named group (CLOCK, DATA, MON, ANIM, POLISH, PERF2, BASE1863, ...); decided from the tree's own files, never from the page */
export const treeHas = (dist, group) => treeGroups(dist).includes(group);

/** the independent clock oracle (tools/t0/clock/oracle.mjs, reads the adjudicated anchors only); used for expectations on a tree that has CLOCK */
let ORACLE = null;
export async function loadOracle() {
  if (!ORACLE) { const { makeOracle } = await import(pathToFileURL(path.join(HERE, '..', '..', 'tools', 't0', 'clock', 'oracle.mjs')).href); ORACLE = makeOracle(); }
  return ORACLE;
}

/**
 * CLOCK: an "hour" step (Shift+Arrow, the hour buttons) moves 60 battle minutes, not 12 frames.  True when `to` is the frame nearest to clock(from) +- 60 minutes
 * (within half a frame step; the ends of the battle clamp).  `O` is the oracle from loadOracle().
 */
export function hourStepOk(O, from, to, dir) {
  const target = O.minutes(from) + 60 * dir;
  if (target >= O.minutes(675)) return to === 675 || to > from;
  if (target <= O.minutes(1)) return to === 1 || to < from;
  const step = Math.max(O.minutes(Math.min(675, to + 1)) - O.minutes(to), O.minutes(to) - O.minutes(Math.max(1, to - 1)));
  return to !== from && Math.abs(O.minutes(to) - target) <= step / 2 + 1e-6;
}
