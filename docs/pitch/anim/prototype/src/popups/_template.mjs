// popups/_template.mjs - COPY THIS to start a popup.  A complete minimal popup on the Overlay Director's contract (popups/host.mjs): when the clock reaches a chronology event it raises a card
// that points at the units named by the row, lives for READING TIME in wall-clock seconds, and has a ladder of forms (a card, then a chip in the Chronicle strip) so that it can never lie on a
// tile and is never lost.  It is not registered by default.
//   1. copy to popups/my-popup.mjs;  2. add it to popups/index.mjs;  3. node docs/pitch/anim/prototype/build.mjs
//   4. (optional) give the module `enabled: (tok) => tok('popup.<style>.enabled')` for a master dial; add dials to tokens/make-popup-tokens.py and read them with api.tok('popup.<style>.<dial>'); give the module `group` and `preview(api)` for a Tuning Studio entry with a button.
// The director gives a module: api.crossed(index) / api.landed(index) (rows the clock has just passed, or has just stopped on: never rows a seek skipped), api.fire(card), api.clock, api.pd (the real
// text), api.tileRect(), api.seek / api.play / api.flyTo / api.select, api.reduced, api.phone.  A card is DATA (a content model of blocks: kicker, title, p, meta, chips, bar, list, actions ...);
// popups/kit.mjs has the helpers, ui/popup-layer.mjs renders every model with the same type, motion, focus and screen-reader behaviour.  Honesty: use clockLine() for any clock (never print your own),
// ev('Documented'|'Measured'|'Computed'|'Modelled'|'Contested'|'Unknown') for any claim a reader could ask "says who?" about, and never put an internal id or a production note in a card.
import { clockLine, displayText, words, readMs, chipText, tickIndex } from './kit.mjs';

const indexes = new WeakMap();           // module state lives in the closure (or in api.host.state.mod): the registry hands out a frozen copy of the definition
export const templatePopup = {
  id: 'template-events', label: 'Template: chronology event card',
  doc: 'The copy-me popup: a card for each chronology event, reading-time life, a leader to the units, a chip when there is no room.',
  update(frame, api) {
    let index = indexes.get(api.pd.events); if (!index) { index = tickIndex(api.pd.events); indexes.set(api.pd.events, index); }
    for (const e of api.crossed(index)) {
      if (e.sig === 'low') continue;
      const text = displayText(e.text).text; const clk = clockLine(api.clock, e.tick);
      api.fire({
        key: 'event-' + e.tick, kind: 'card', tier: e.sig === 'critical' ? 'A' : 'B', tone: e.sig, priority: e.sig === 'critical' ? 42 : 20, tick: e.tick,
        subjects: e.units.length ? { units: e.units } : null,                                    // what the card is about: a leader line and a ring are drawn to it; null = no subject, the chip
        hold: { ms: readMs(words(text), { baseMs: 1500, minMs: 3000, maxMs: 12000, wpm: 238 }) },  // wall-clock reading time, runs only while the battle plays
        forms: [                                                                                  // the ladder, richest first; the director takes the first that fits on free ground
          { id: 'card', level: 'full', w: 300, content: { blocks: [{ t: 'kicker', label: e.sig, right: clk.short }, { t: 'p', text }, { t: 'chips', items: [clk.chip] }] } },
          { id: 'chip', level: 'chip', w: 240, content: { blocks: [], kind: e.sig, line: chipText(text, 60), full: text, label: text } },
        ],
        version: 1,
      });
    }
    return [];
  },
  rows(ctx) { return ctx.pd.events.map((e) => ({ id: 'tpl-' + e.tick, tick: e.tick, kind: 'event', tone: e.sig, title: e.sig, text: displayText(e.text).text, low: e.sig === 'low' })); },   // the Chronicle lists these
};
