// popups/event-card.mjs - P-01, the EVENT CARD: one card for each chronology event of the production site (137 rows: 45 critical, 73 high, 16 medium, 3 low).
//
// Same words, same trigger, same purpose as the product's card ("REYNOLDS KILLED. Shot through the head ..."), rebuilt so that it can be read and never lies on a tile:
//   * the event text is shown IN FULL (never clamped) and verbatim; the only change is that the internal sentence "Commander succession US-017 activates." is not shown (it leaks an id): the
//     id becomes a link to that command change, printed with its own words and its per-row source (popups/kit.mjs displayText; a test proves text + removed sentence = the source text);
//   * the hand-typed `time` ("7:20am") is not in the data this card reads: the clock line comes from the clock module, "about 10:15 AM", labelled Modelled (02-popups.md F-07);
//   * a ladder of forms: full (critical, slow playback) > compact > chip in the Chronicle strip; tier A for critical, B for high, C for medium; `low` rows are listed in the Chronicle only;
//   * it points: the units named by the row get a leader line and a ring (the row's `units_involved`, the parent tile when a unit has none), the place text is shown;
//   * its life is READING TIME in wall-clock seconds (popups/kit.mjs readMs), and the Chronicle can bring it back.
import { clockLine, displayText, words, readMs, chipText, firstSentence, tickIndex, dedupeNames, ev, TONES } from './kit.mjs';

const cache = new WeakMap();
const indexOf = (pd) => { let i = cache.get(pd.events); if (!i) { i = tickIndex(pd.events); cache.set(pd.events, i); } return i; };
const successionOf = (pd, id) => pd.successions.find((s) => s.id === id) || null;
const SIG_PRIORITY = { critical: 42, high: 20, medium: 10, low: 0 };

/** the descriptor of one event card (exported for the tests and for the Chronicle, which re-creates a card from its row) */
export function buildEventCard(e, api, via = 'play') {
  const tok = api.tok; const sig = e.sig; const clk = clockLine(api.clock, e.tick); const { text, link } = displayText(e.text);
  const tier = sig === 'critical' ? 'A' : sig === 'high' ? (tok('popup.event.highAs') === 'card' ? 'B' : 'C') : 'C';
  const names = dedupeNames(e.units.map(api.unitName)); const linked = link ? successionOf(api.pd, link) : null;
  const narrMode = tok('popup.event.narrative'); const inline = !!e.narrative && narrMode === 'inline';
  const kick = { t: 'kicker', label: TONES[sig].label, right: clk.short };
  const place = e.place ? { icon: 'pin', text: e.place } : null; const unitRow = names.length ? { icon: 'box', text: names.join(' · '), title: 'Units named by this chronology row' } : null;
  const linkedBlock = linked ? [{ t: 'meta', rows: [{ icon: 'swap', text: `Command change: ${linked.event}${linked.tick !== e.tick ? ` (recorded at ${clockLine(api.clock, linked.tick).short})` : ''}` }] }, { t: 'chips', items: [ev('Documented', linked.source, 'The per-row source of the command-change record')] }] : [];
  const narrative = e.narrative ? (narrMode === 'disclosure' ? [{ t: 'disclosure', label: 'Why it matters', blocks: [{ t: 'p', text: e.narrative, italic: true }] }] : inline ? [{ t: 'p', text: e.narrative, italic: true, size: 'sm' }] : []) : [];
  const cfgOf = (t) => (t === 'A' ? { baseMs: tok('popup.dwell.aBaseMs'), minMs: tok('popup.dwell.aMinMs'), maxMs: tok('popup.dwell.aMaxMs') } : t === 'B' ? { baseMs: tok('popup.dwell.bBaseMs'), minMs: tok('popup.dwell.bMinMs'), maxMs: tok('popup.dwell.bMaxMs') } : { baseMs: 0, minMs: tok('popup.dwell.chipMinMs'), maxMs: tok('popup.dwell.chipMaxMs') });
  const ms = readMs(words(text) + (inline ? words(e.narrative) : 0), { ...cfgOf(tier), wpm: tok('popup.read.wpm') });
  const label = `${TONES[sig].label} event. ${firstSentence(text)} ${e.place || ''} ${clk.long}.`.replace(/\s+/g, ' ').trim();
  const chipForm = { id: 'chip', level: 'chip', w: 260, content: { blocks: [], kind: TONES[sig].label, line: chipText(text, 80), full: `${TONES[sig].label}: ${text}`, label } };
  const fullBlocks = [kick, { t: 'p', text, lead: true }, ...(place || unitRow ? [{ t: 'meta', rows: [place, unitRow].filter(Boolean) }] : []), ...linkedBlock, ...narrative, { t: 'chips', items: [clk.chip] }, ...(e.units.length ? [{ t: 'actions', items: [{ id: 'map', label: 'Show on map', icon: 'target', aria: 'Show the units this event is about on the map' }] }] : [])];
  const compactBlocks = [kick, { t: 'p', text }, ...(place ? [{ t: 'meta', rows: [place] }] : []), { t: 'chips', items: [clk.chip] }];
  const peekBlocks = [kick, { t: 'p', text, lines: 3 }, ...(place ? [{ t: 'meta', rows: [place] }] : [])];
  const forms = [];
  if (tier === 'A') forms.push({ id: 'full', level: 'full', w: tok('popup.event.fullW'), content: { label, blocks: fullBlocks } });
  if (tier !== 'C') forms.push({ id: 'compact', level: 'compact', w: tok('popup.event.compactW'), content: { label, blocks: compactBlocks } });
  forms.push({ id: 'peek', level: 'compact', w: tok('popup.event.peekW'), content: { label, blocks: peekBlocks } });
  forms.push({ id: 'mini', level: 'compact', w: tok('popup.event.miniW'), tools: ['pin', 'close'], content: { label, blocks: [kick, { t: 'p', text, lines: 2 }] } });
  forms.push(chipForm);
  const docBlocks = [{ t: 'p', text, lead: true }, ...(e.narrative ? [{ t: 'p', text: 'Why it matters', size: 'sm', muted: true }, { t: 'p', text: e.narrative, italic: true }] : []), ...linkedBlock,
    { t: 'kv', rows: [...(e.place ? [['Place', e.place]] : []), ['Moment', clk.long, clk.chip], ...(names.length ? [['Units', names.join('; ')]] : []), ['Significance', TONES[sig].label]] },
    { t: 'disclosure', label: 'Sources of this chronology file', blocks: [{ t: 'p', size: 'sm', muted: true, text: 'The file lists these sources as a whole; it does not say which source supports which event, so no single one is cited for this row.' }, { t: 'list', items: (api.pd.fileSources.events[e.file] || []).map((s) => ({ tone: 'info', shape: 'book', text: s })) }] },
    { t: 'actions', items: [{ id: 'go', label: 'Go to this moment', icon: 'play', primary: true }, ...(e.units.length ? [{ id: 'map', label: 'Show on map', icon: 'target' }] : [])] }];
  const subjects = e.units.length ? { units: e.units } : null;
  return {
    key: 'event-' + e.tick, kind: 'card', tier, tone: sig, priority: SIG_PRIORITY[sig], tick: e.tick, subjects, forms, slots: tier === 'A' ? ['tc', 'tr', 'tl', 'bc'] : undefined, hold: { ms }, version: 1, announce: label, narrate: sig === 'critical',          // slots: a critical event with no tile to point at is still a card, on free ground at the edge
    doc: { key: 'event-' + e.tick, tone: sig, kicker: `${TONES[sig].label} event · ${clk.short}`, title: e.place || 'Event', content: { blocks: docBlocks }, subjects, version: 1 },
    actions: {
      go: (a) => { a.pause(); a.seek(e.tick, { ms: 180 }); },
      map: (a, card) => { const r = card && card.anchorRect; if (r) a.ensureVisible({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }, 120); if (card) card.pulseT0 = a.nowMs; else a.host.state.rail && (a.host.state.rail.openedAt = a.nowMs); },
    },
    via,
  };
}

export const eventCard = {
  id: 'event-card', label: 'Event card', group: 'popup-event', enabled: (tok) => tok('popup.event.enabled'),
  preview(api) { api.goTo({ tick: 28, lat: 39.8278, lng: -77.2528, zoom: 14.5 }); },
  doc: 'A card for each chronology event (P-01): the full sentence, the place, the units it is about with a leader line and ring, a clock line from the clock module, reading-time life, a ladder full > compact > chip.',
  update(frame, api) {
    const idx = indexOf(api.pd); const tok = api.tok;
    const raise = (e, via, after) => {
      if (e.sig === 'low') return; if (e.sig === 'medium' && tok('popup.event.mediumAs') === 'off') return;
      const card = buildEventCard(e, api, via); const c = api.fire(card, { via, landAfter: after });
      if (c && tok('popup.event.frameSubject') && e.units.length) for (const id of e.units) { const r = api.tileRect(id); if (r) { api.ensureVisible({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }, 100); break; } }
    };
    for (const e of api.crossed(idx)) raise(e, 'play', null);
    const land = tok('popup.event.landTicks'); for (const e of api.landed(idx, land)) raise(e, 'land', land);
    return [];
  },
  rows(ctx) { return ctx.pd.events.map((e) => ({ id: 'event-' + e.tick, tick: e.tick, kind: 'event', tone: e.sig, title: TONES[e.sig].label, text: displayText(e.text).text, place: e.place, low: e.sig === 'low', make: (api) => buildEventCard(e, api, 'reopen') })); },
};
