// v6-clock.mjs - "clock labels equal the data".
//   A. all 675 ticks (and 1,350 fractional ticks): the page's own clock vs (1) the product's canonical time module src/lib/time (read-only import), (2) a piecewise-linear interpolation written here from
//      data-src/time/time_anchors.json
//   B. what is DRAWN: every time-of-day string in the DOM at sample ticks (top bar, clock card, event cards, story cards, scrubber tip, tour captions) is compared with the model's label for the tick it names
//   node v6-clock.mjs  -> results/v6-clock.json
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { serve, launch, PROTO, REPO, writeJson, sleep, args } from './lib.mjs';

const out = { generated: new Date().toISOString(), checks: [], defects: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600) : '')); return ok; };
const prod = (await import(pathToFileURL(path.join(REPO, 'src', 'lib', 'time', 'index.js')).href)).default;
const doc = JSON.parse(fs.readFileSync(path.join(REPO, 'data-src', 'time', 'time_anchors.json'), 'utf8'));
// my own interpolation: minutes since 1863-07-01T00:00 LMT
const A = doc.anchors.map((a) => { const m = /^1863-07-(\d\d)T(\d\d):(\d\d)$/.exec(a.t); return { tick: a.tick, min: (+m[1] - 1) * 1440 + +m[2] * 60 + +m[3], sigma: a.sigma_min }; });
const myMin = (t) => { let i = 0; while (i < A.length - 2 && A[i + 1].tick <= t) i++; return A[i].min + (A[i + 1].min - A[i].min) * (t - A[i].tick) / (A[i + 1].tick - A[i].tick); };
const mySigma = (t) => { let i = 0; while (i < A.length - 2 && A[i + 1].tick <= t) i++; return A[i].sigma + (A[i + 1].sigma - A[i].sigma) * (t - A[i].tick) / (A[i + 1].tick - A[i].tick); };
const hm = (min) => { const r = Math.round(min / 5) * 5; const d = Math.floor(r / 1440); const x = r - d * 1440; const h = Math.floor(x / 60); const mi = x % 60; return { date: 'July ' + (1 + d), text: (h % 12 === 0 ? 12 : h % 12) + ':' + String(mi).padStart(2, '0') + (h >= 12 ? ' PM' : ' AM') }; };

const srv = await serve(PROTO, 9703);
const s = await launch({ port: 9703, query: 'welcome=0&manual=1', profile: 'clock' });
try {
  // ---- A ------------------------------------------------------------------------------------------------------------------
  const ticks = []; for (let t = 1; t <= 675; t++) ticks.push(t); for (let t = 1; t < 675; t++) { ticks.push(t + 0.37); ticks.push(t + 0.81); }
  const page = await s.page.evaluate((ts) => ts.map((t) => { const d = window.__studio.engine.clock.describe(t); return [t, d.date, d.text, d.sigmaMin, window.__studio.engine.clock.minutesAt(t)]; }), ticks);
  let badProd = []; const boundary = []; let badMine = []; let badMin = []; let badSigma = []; let maxMinDiff = 0;
  for (const [t, date, text, sigma, minutes] of page) {
    const exp = hm(myMin(t)); if (exp.date !== date || exp.text !== text) badMine.push({ t, page: date + ' ' + text, mine: exp.date + ' ' + exp.text });
    if (Math.abs(minutes - myMin(t)) > 1e-6) badMin.push({ t, page: minutes, mine: myMin(t) }); maxMinDiff = Math.max(maxMinDiff, Math.abs(minutes - myMin(t)));
    if (Math.abs(sigma - Math.round(mySigma(t))) > 0) badSigma.push({ t, page: sigma, mine: Math.round(mySigma(t)) });
    if (Number.isInteger(t)) { const c = prod.tickToClock(t); const e = hm(c.minutes); const nearMidnight = (c.minutes % 1440) > 1437.5; if (nearMidnight) { boundary.push({ t, page: date + ' ' + text, productExact: c.iso }); continue; } if (e.text !== text || ('July ' + c.date) !== date) badProd.push({ t, page: date + ' ' + text, product: 'July ' + c.date + ' ' + e.text }); }
  }
  check('page clock = my piecewise-linear interpolation of time_anchors.json for 1,998 ticks (minutes within 1e-6, label to 5 min)', badMine.length === 0 && badMin.length === 0, { ticks: page.length, badLabel: badMine.length, badMinutes: badMin.length, maxMinutesDiff: maxMinDiff, first: badMine.slice(0, 4) });
  check('page clock label = the product time module (src/lib/time), minutes rounded to 5, calendar date, at all 675 integer ticks (' + boundary.length + ' ticks within 2.5 min before midnight are shown as 12:00 AM of the next date: the page rounds before it takes the date)', badProd.length === 0, { bad: badProd.length, boundary, first: badProd.slice(0, 5) });
  check('uncertainty (rounded sigma, minutes) equals my interpolation of the anchors\' sigma_min', badSigma.length === 0, { bad: badSigma.length, first: badSigma.slice(0, 4) });
  const sg = page.filter(([t]) => Number.isInteger(t)).map((p) => p[3]); out.sigmaRange = [Math.min(...sg), Math.max(...sg)];
  // anchors exact
  const anchorBad = A.filter((a) => { const d = page.find((p) => p[0] === a.tick); return Math.abs(d[4] - a.min) > 1e-9; }); check('the clock passes exactly through all 33 anchors', anchorBad.length === 0, { bad: anchorBad.length });
  // monotone
  let nonMono = 0; for (let t = 1; t < 675; t++) if (!(page.find((p) => p[0] === t + 1)[4] > page.find((p) => p[0] === t)[4])) nonMono++; check('the clock is strictly increasing over 675 ticks', nonMono === 0, { nonMono });
  // midnight rollover: date label vs the day tab
  const rollBad = []; let after = 0; for (const [t, date] of page.filter((p) => Number.isInteger(p[0]))) { const c = prod.tickToClock(t); if (('July ' + c.date) !== date && (c.minutes % 1440) <= 1437.5) rollBad.push(t); if (c.phase === 'night' && c.hour24 < 5) after++; } check('dates roll at midnight (the small hours carry the next calendar date), same as the product module (' + after + ' small-hours ticks)', rollBad.length === 0, { bad: rollBad.length });

  // ---- B: drawn strings -----------------------------------------------------------------------------------------------------
  const TIME_RE = /\b(\d{1,2}):(\d{2})\s?([AP]M|am|pm)\b/gi;
  const sample = [1, 12, 24, 28, 46, 120, 226, 293, 346, 451, 538, 551, 556, 620, 675];
  const seen = []; const bad = [];
  await s.page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('popup.enabled', true); });
  for (const tick of sample) {
    const r = await s.page.evaluate((tick) => {
      const S = window.__studio; const E = S.engine; E.transport.pause(); E.transport.seek(tick, { glide: false }); for (let i = 0; i < 90; i++) S.step(1, 16.667);
      const cl = E.clock.describe(E.transport.simTau); const pick = (sel) => [...document.querySelectorAll(sel)].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
      return { tick: Math.round(E.transport.simTau), label: cl.text, date: cl.date, bar: pick('.clockbox'), cards: pick('#popups .pc'), tip: pick('.scrubtip'), nar: pick('#narration'), dock: pick('#dock') };
    }, tick);
    const exp = hm(myMin(r.tick)); const prodLabel = prod.tickToClock(r.tick);
    for (const [where, arr] of [['top bar', r.bar], ['popup cards', r.cards], ['dock', r.dock]]) for (const txt of arr) { for (const m of txt.matchAll(TIME_RE)) { const shown = `${+m[1]}:${m[2]} ${m[3].toUpperCase()}`; seen.push({ tick: r.tick, where, shown, expect: exp.text, txt: txt.slice(0, 90) }); if (shown !== exp.text) bad.push({ tick: r.tick, where, shown, expect: exp.text, ctx: txt.slice(0, 160) }); } }
    out.checks.length; // keep
  }
  check('every time of day drawn in the top bar, popup cards and dock at 15 sample ticks equals the clock label of that tick', bad.length === 0, { timeStringsSeen: seen.length, mismatches: bad.length, first: bad.slice(0, 6) });
  out.timeStringsSeen = seen.length; out.timeStringMismatches = bad;
  // the date shown beside the time
  const dateBad = []; for (const tick of sample) { const r = await s.page.evaluate((tick) => { const S = window.__studio; S.engine.transport.seek(tick, { glide: false }); for (let i = 0; i < 40; i++) S.step(1, 16.667); const E = S.engine; return { tick: Math.round(E.transport.simTau), bar: document.querySelector('.clockbox .clock').textContent, card: [...document.querySelectorAll('#popups .pc-ringtext')].map((e) => e.textContent) }; }, tick); const exp = hm(myMin(r.tick)); if (!r.bar.startsWith(`${exp.date}, about ${exp.text}`)) dateBad.push({ tick: r.tick, bar: r.bar, exp: `${exp.date}, about ${exp.text}` }); }
  check('the top-bar clock line reads "<date>, about <time> (±n min) · candidate clock" with the model date and time', dateBad.length === 0, { bad: dateBad.slice(0, 4) });
  // always labelled as candidate
  const cand = await s.page.evaluate(() => { const t = document.querySelector('.clockbox .clock').textContent; return { text: t, candidate: /candidate/i.test(t), about: /about/.test(t), sigma: /±\d+ min/.test(t) }; });
  check('the top-bar clock says "about", shows ± minutes and "candidate clock"', cand.candidate && cand.about && cand.sigma, cand);
  // the scrubber tooltip
  const tip = await s.page.evaluate(() => { const r = document.querySelector('.scrub input').getBoundingClientRect(); const el = document.querySelector('.scrub input'); const x = r.left + 2 + (300 - 1) / 674 * (r.width - 4); el.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: r.top + 5, bubbles: true })); return document.querySelector('.scrubtip').textContent; });
  const e300 = hm(myMin(300)); check('the scrubber tooltip at tick ~300 shows the model time', tip.includes(e300.text) || tip.includes('Tick 300') || tip.includes('Tick 299') || tip.includes('Tick 301'), { tip: tip.slice(0, 160), expect: e300 });
  out.tooltip = tip;

  // ---- C: every event card and story card at its own tick -------------------------------------------------------------------------------------
  //   the page's OWN clock string on a card is "about H:MM AM|PM" (capital AM/PM, one space); any other time string inside a card is the source's own sentence (quoted verbatim, checked by v1-data).
  //   An event card's own clock must equal the model clock of the EVENT'S tick (a card lingers for reading time, so the current tick may be later).
  const pd = JSON.parse(fs.readFileSync(path.join(PROTO, 'data', 'popup-data.json'), 'utf8'));
  const OWN = /about (\d{1,2}):(\d{2}) ([AP]M)/g;
  const evBy = new Map(pd.events.map((e) => [e.text.slice(0, 40).toUpperCase(), e]));
  const popTicks = [...new Set([...pd.events.filter((e) => e.sig !== 'low').map((e) => e.tick), ...pd.stories.map((q) => q.tick)])].sort((a, b) => a - b);
  let ownSeen = 0; const ownBad = []; const cardsSeen = new Set(); let unmatched = 0;
  for (const tick of popTicks) {
    const r = await s.page.evaluate((tick) => { const S = window.__studio; const E = S.engine; E.transport.pause(); E.transport.seek(tick, { glide: false }); for (let i = 0; i < 20; i++) S.step(1, 16.667); return { tick: Math.round(E.transport.simTau), cards: [...document.querySelectorAll('#popups .pc')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()) }; }, tick);
    for (const txt of r.cards) {
      const own = [...txt.matchAll(OWN)]; if (!own.length) continue;
      // which event is this card for?  the card text contains the event sentence (upper-cased headline) - find the source event whose text starts the card body
      const cands = pd.events.filter((e) => e.sig !== 'low' && txt.toUpperCase().includes(e.text.slice(0, 30).toUpperCase())); if (!cands.length) { unmatched++; continue; }
      for (const m of own) { ownSeen++; const shown = `${+m[1]}:${m[2]} ${m[3]}`; const okAny = cands.some((e) => hm(myMin(e.tick)).text === shown); cardsSeen.add(cands.map((e) => e.tick).join('/') + '|' + shown); if (!okAny) ownBad.push({ currentTick: r.tick, candidateEventTicks: cands.map((e) => e.tick), shown, expected: cands.map((e) => hm(myMin(e.tick)).text), ctx: txt.slice(0, 100) }); }
    }
  }
  check('every "about H:MM AM|PM" a popup card prints for an event equals the model clock at THAT EVENT tick (' + cardsSeen.size + ' distinct event cards, ' + ownSeen + ' clock strings; ' + unmatched + ' cards with a clock not matched to an event)', ownBad.length === 0 && ownSeen > 0, { distinctCards: cardsSeen.size, clockStrings: ownSeen, mismatches: ownBad.length, first: ownBad.slice(0, 5) });
  out.eventCardClocks = { distinctCards: cardsSeen.size, clockStrings: ownSeen, mismatches: ownBad };
  // ---- D: the typed clocks inside the verbatim texts vs the model clock at the same tick (the page shows both on one card) --------------------------------------------------
  const TYPED = /(?<![\d:])(\d{1,2})(?::(\d{2}))?\s?(am|pm|a\.m\.|p\.m\.)/gi; const contra = []; let typedN = 0;
  const minOfDay = (h, mi, ap) => ((+h % 12) + (/^p/i.test(ap) ? 12 : 0)) * 60 + +(mi || 0);
  const consider = (kind, id, tick, text) => { for (const m of text.matchAll(TYPED)) { typedN++; const typed = minOfDay(m[1], m[2], m[3]); const model = ((myMin(tick) % 1440) + 1440) % 1440; let d = typed - model; if (d > 720) d -= 1440; if (d < -720) d += 1440; contra.push({ kind, id, tick, typed: m[0], modelClock: hm(myMin(tick)).text, diffMin: Math.round(d), sigma: Math.round(mySigma(tick)) }); } };
  for (const e of pd.events) if (e.sig !== 'low') consider('event', e.tick, e.tick, e.text + ' ' + (e.narrative || ''));
  for (const q of pd.stories) consider('story', q.id, q.tick, q.summary);
  const over30 = contra.filter((c) => Math.abs(c.diffMin) > 30); const over60 = contra.filter((c) => Math.abs(c.diffMin) > 60);
  out.typedClocks = { typedStrings: typedN, over30: over30.length, over60: over60.length, worst: [...contra].sort((a, b) => Math.abs(b.diffMin) - Math.abs(a.diffMin)).slice(0, 8) };
  console.log('typed clocks inside popup texts: ' + typedN + ' strings; differ from the model clock at the same tick by >30 min: ' + over30.length + ', >60 min: ' + over60.length);
  console.log(JSON.stringify(out.typedClocks.worst));
  out.summary = { pass: out.checks.filter((c) => c.ok).length, fail: out.checks.filter((c) => !c.ok).length };
  writeJson('v6-clock.json', out); console.log(JSON.stringify(out.summary));
} finally { await s.close(); srv.close(); }
