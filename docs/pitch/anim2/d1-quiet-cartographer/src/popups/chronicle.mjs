// popups/chronicle.mjs - the CHRONICLE: everything that has happened so far, in one list, so that no popup is ever lost.  02-popups.md 5.6: reading just the critical events and stories takes
// 13.5 minutes in a show that plays for 5.6 at 1x, so most cards cannot be read in passing; the Chronicle is the answer to "what did I just miss?".
//   * it is a pure view of the rows that every popup module contributes (rows(ctx)) up to the clock: seek backwards and it shrinks, seek forwards and it grows, nothing is accumulated;
//   * each row can be reopened as a pinned card (the recall path of a dismissed card) or the clock can go to it; N and P step the clock from row to row;
//   * the strip in the dock (ui/popup-layer.mjs) carries the chips of cards that found no room, and this list opens in the reading rail (key C).
import { clockLine, chipText, TONES } from './kit.mjs';

function build(api, passed, low, limit) {
  const rows = api.rows.rows.filter((r) => r.tick <= api.time.tau + 0.5 && (low || !r.low)); const shown = rows.slice(-limit).reverse();
  const items = shown.map((r) => ({ tone: r.tone, shape: r.shape || (TONES[r.tone] || TONES.info).shape, title: `${clockLine(api.clock, r.tick).short} · ${r.kindLabel || (TONES[r.tone] || TONES.info).label}`, text: chipText(r.text, 180), sub: r.place || null,
    actions: [{ id: 'go:' + r.id, label: 'Go to', aria: 'Go to this moment: ' + chipText(r.text, 60) }, ...(r.make ? [{ id: 'open:' + r.id, label: 'Reopen', aria: 'Reopen the card: ' + chipText(r.text, 60) }] : [])] }));
  return { blocks: [{ t: 'p', size: 'sm', muted: true, text: `${rows.length} moments up to the clock${rows.length > shown.length ? `; the latest ${shown.length} are listed` : ''}. Press N and P to step from moment to moment.` }, ...(items.length ? [{ t: 'list', items }] : [{ t: 'p', text: 'Nothing has happened yet. Press Space to play.', muted: true }])] };
}

export const chronicle = {
  id: 'chronicle', label: 'Chronicle', group: 'popup-chronicle', enabled: (tok) => tok('popup.chronicle.enabled'),
  preview(api) { api.host.openRail('chronicle:list'); },
  doc: 'The list of every moment so far, with Reopen and Go to; the strip in the dock holds the chips of cards that found no room.',
  toolbar: [{ id: 'open', phone: false, label: 'Chronicle', title: 'Everything that has happened so far (C)', run: (api) => api.host.toggleDoc('chronicle:list'), pressed: (host) => !!(host.rail && host.rail.id === 'chronicle:list') }],
  update(frame, api) {
    const tok = api.tok; const low = tok('popup.chronicle.low'); const limit = tok('popup.chronicle.recentRows'); const passed = api.rows.rows.filter((r) => r.tick <= api.time.tau + 0.5 && (low || !r.low)).length; const total = api.rows.rows.filter((r) => low || !r.low).length;
    const ver = passed + ':' + total + ':' + limit;
    const find = (id) => api.rows.rows.find((r) => r.id === id);
    return [{
      key: 'list', kind: 'doc', tier: 'S', version: ver, forms: [],
      doc: { key: 'list', tone: 'info', kicker: 'Chronicle', title: `${passed} of ${total} moments so far`, content: () => build(api, passed, low, limit), version: ver },
      onAction: (a, action) => { const [verb, id] = [action.slice(0, action.indexOf(':')), action.slice(action.indexOf(':') + 1)]; const r = find(id); if (!r) return; if (verb === 'go') { a.pause(); a.seek(r.tick, { ms: 180 }); } else if (verb === 'open') a.reopen(r); },
    }];
  },
};
