// popups/hints.mjs - P-38 and P-31, the HINTS: short contextual hints (the product's onboarding lines and Distance-Tool prompts) and the full list of keys.  Four hints, each shown once and only
// when it is useful, each gone as soon as it is used or after its time:
//   1. Space plays, arrows step                       (until the clock has moved)
//   2. click a tile or press U to open a unit card    (after the battle has played a while, until a unit has been selected)
//   3. the Chronicle: C lists everything so far, N and P step between moments   (when the first card has gone to the strip)
// A hint is free-standing (it has no subject), so it is placed on free ground at the bottom or top of the map or not at all.  `?` (or the ? button) opens the help in the rail: every key,
// and what the site's six evidence labels mean.  The text states what the prototype does; nothing about the battle.
import { ev, EVIDENCE } from './kit.mjs';

const KEYS = [['Space', 'Play or pause'], ['← →', 'Step one tick (Shift: one hour)'], ['[  ]', 'Slower, faster'], ['U  Shift+U', 'Select the next or previous tile; opens its unit card'], ['N  P', 'Next or previous moment of the Chronicle (pauses there)'], ['C', 'Open or close the Chronicle list'], ['Enter', 'Open the newest card in the reading panel'], ['Esc', 'Close one layer: tooltip, panel, then the newest card, then the selection'], ['T  I  M  A', 'Tuning Studio, inspector, metrics, about'], ['?', 'This list']];
const EVIDENCE_TEXT = { Documented: 'printed in a named source (order-of-battle names, commander names, per-row sources)', Measured: 'read from an instrument or counted from a record', Computed: 'derived from the data by a stated rule (counts, aggregates, ticks)', Modelled: 'authored or interpolated, not recorded: every position, every strength value, every clock time', Contested: 'the sources disagree', Unknown: 'nobody has decided yet' };

function hint(id, text, api) {
  const tok = api.tok;
  return { key: 'hint-' + id, kind: 'card', tier: 'D', tone: 'info', priority: 1, bare: false, moment: false, slots: ['bc', 'tc'], hold: { ms: tok('popup.hints.holdMs'), always: true }, version: 1, announce: text, tick: api.time.tau,
    forms: [{ id: 'hint', level: 'compact', w: 360, content: { label: 'Hint: ' + text, blocks: [{ t: 'kicker', shape: 'help', label: 'Hint', right: 'press ? for all keys' }, { t: 'p', text }] } }] };
}

export const hints = {
  id: 'hints', label: 'Hints', group: 'popup-hints', enabled: (tok) => tok('popup.hints.enabled'),
  preview(api) { const st = api.host.state.mod.hints; if (st) { st.shown.clear(); st.n = 0; st.t0 = api.nowMs - 2000; st.playedAt = null; st.tau0 = api.time.tau; } },
  doc: 'Contextual hints (P-38, P-31) shown once each, and the help in the rail: every key and what the evidence labels mean.',
  toolbar: [{ id: 'help', label: '?', title: 'Keys and what the evidence labels mean (?)', run: (api) => api.host.toggleDoc('hints:help'), pressed: (host) => !!(host.rail && host.rail.id === 'hints:help') }],
  update(frame, api) {
    const tok = api.tok; const M = api.host.state.mod; const st = M.hints || (M.hints = { shown: new Set(), n: 0, t0: api.nowMs, playedAt: null, tau0: api.time.tau });
    const out = [{
      key: 'help', kind: 'doc', tier: 'S', tone: 'info', forms: [], version: 1,
      doc: { key: 'help', tone: 'info', kicker: 'Help', title: 'Keys and labels', version: 1, content: { blocks: [
        { t: 'kv', rows: KEYS }, { t: 'title', text: 'Evidence labels', level: 3 }, { t: 'list', items: [...EVIDENCE].map((k) => ({ tone: 'info', shape: 'book', title: k, text: EVIDENCE_TEXT[k] })) },
        { t: 'p', size: 'sm', muted: true, text: 'Cards stay on screen for the time it takes to read them while the battle plays, stop when you hover, focus or pin them, and are never placed over a tile. Whatever does not fit becomes a chip in the Chronicle strip; nothing is lost.' }] } },
    }];
    if (api.time.playing && st.playedAt == null) st.playedAt = api.nowMs;
    const quiet = ![...api.host.cards.values()].some((c) => c.def && c.def.id !== 'hints' && c.spec.kind === 'card' && c.phase !== 'out' && !c.lane);          // a hint never competes with a card that is being read
    const can = (id) => quiet && !st.shown.has(id) && st.n < tok('popup.hints.maxShown');
    const show = (id, text) => { st.shown.add(id); st.n++; api.fire(hint(id, text, api), { via: 'play' }); };
    if (can('play') && st.playedAt == null && Math.abs(api.time.tau - st.tau0) < 0.5 && api.nowMs - st.t0 > 1500) show('play', 'Press Space to play the battle. Arrow keys step one tick; Shift steps an hour.');
    else if (st.playedAt != null && can('play')) st.shown.add('play');
    if (can('select') && st.playedAt != null && api.nowMs - st.playedAt > 9000 && !api.selectedId) show('select', 'Click a tile, or press U, to open its unit card with its commander and strength.');
    if (api.selectedId) st.shown.add('select');
    if (can('chronicle') && api.host.state.stats.laneFalls > 0) show('chronicle', 'Cards that find no free ground wait as chips below. Press C for everything so far, N and P to step between moments.');
    if (api.host.rail && api.host.rail.id === 'chronicle:list') st.shown.add('chronicle');
    return out;
  },
};
void ev;
