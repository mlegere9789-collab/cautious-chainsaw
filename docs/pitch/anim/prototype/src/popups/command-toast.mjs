// popups/command-toast.mjs - P-03, the COMMAND-CHANGE TOAST: one card for each of the 42 command changes of the production site (a general killed, wounded, captured, relieved, promoted, or
// arriving), raised when the clock reaches its tick.  Same facts as the product's toast (the unit, who, what happened, the row's own sentence), rebuilt (02-popups.md F-05, F-06):
//   * the KIND is typed (data/build-popup-data.mjs, audited by test): 9 of the 42 rows used to be titled "Command change" and 5 of those were wounds in their own sentence;
//   * a burst is ONE card: tick 550 has four changes, 551 and 552 two each; they merge ("4 command changes", listed) instead of evicting each other after a second;
//   * no flood after a seek (the director raises nothing for skipped ticks), and the Chronicle holds every row;
//   * all 42 rows carry a per-row source, shown as a Documented chip ("Pfanz First Day p.65"); the source itself was not re-read here and the chip says so on hover;
//   * it points at the unit the command belongs to (leader and ring) and lives for its reading time.
import { clockLine, words, readMs, tickIndex, ev, TONES } from './kit.mjs';

const cache = new WeakMap();
const indexOf = (pd) => { let i = cache.get(pd.successions); if (!i) { i = tickIndex(pd.successions); cache.set(pd.successions, i); } return i; };
const FALL = new Set(['killed', 'mortally-wounded', 'wounded', 'captured', 'wounded-captured']);
const SRC_NOTE = 'The per-row source of this command-change record (commander_successions.json). The source itself was not re-read here.';

export function buildToast(items, api, via = 'play') {
  const tok = api.tok; const first = items[0]; const single = items.length === 1; const clk = clockLine(api.clock, first.tick);
  const worst = items.find((i) => i.kind === 'killed') || items.find((i) => i.kind === 'mortally-wounded') || first; const tone = single ? first.kind : worst.kind;
  const showSrc = tok('popup.toast.showSource');
  const rowLine = (i) => ({ tone: i.kind, shape: TONES[i.kind].shape, title: `${i.from}`, text: i.event, lines: 2, sub: `${TONES[i.kind].label} · ${api.unitName(i.unit)}${showSrc ? ' · ' + i.source : ''}` });
  const label = single ? `Command change: ${first.event}. ${api.unitName(first.unit)}. ${clk.long}.` : `${items.length} command changes: ${items.map((i) => i.event).join('; ')}. ${clk.long}.`;
  const src = (i) => (showSrc ? [ev('Documented', i.source, SRC_NOTE)] : []);
  const blocks = single
    ? [{ t: 'kicker', shape: TONES[first.kind].shape, label: TONES[first.kind].label, right: clk.short }, { t: 'title', text: first.from }, { t: 'p', text: first.event }, { t: 'meta', rows: [{ icon: 'box', text: api.unitName(first.unit) }, ...(first.to && first.to !== first.from ? [{ icon: 'swap', text: `Command passes to ${first.to}` }] : [])] }, { t: 'chips', items: [...src(first), clk.chip] }]
    : [{ t: 'kicker', shape: 'swap', label: `${items.length} command changes`, right: clk.short }, { t: 'list', items: items.map(rowLine), rowH: 54 }, { t: 'chips', items: [clk.chip] }];
  const ms = readMs(items.reduce((n, i) => n + words(i.from) + words(i.event), 0), { baseMs: 0, minMs: tok('popup.dwell.chipMinMs'), maxMs: tok('popup.dwell.chipMaxMs') + (items.length - 1) * 1500, wpm: tok('popup.read.wpm') });
  const mini = { id: 'mini', level: 'compact', w: tok('popup.toast.miniW'), tools: ['pin', 'close'], content: { label, blocks: [{ t: 'kicker', shape: single ? TONES[first.kind].shape : 'swap', label: single ? TONES[first.kind].label : `${items.length} changes`, right: clk.short }, { t: 'p', text: single ? first.event : items.map((i) => i.from).join(', '), lines: 2, size: 'sm' }] } };
  const forms = [{ id: 'toast', level: 'compact', w: tok('popup.toast.w'), content: { label, blocks } }, mini, { id: 'chip', level: 'chip', w: 240, content: { blocks: [], kind: single ? TONES[first.kind].label : 'Command', line: single ? `${first.from}` : `${items.length} command changes`, full: label, label } }];
  const docBlocks = items.flatMap((i) => [{ t: 'kicker', shape: TONES[i.kind].shape, label: TONES[i.kind].label, right: clockLine(api.clock, i.tick).short }, { t: 'title', text: i.from, level: 3 }, { t: 'p', text: i.event, lead: true },
    { t: 'kv', rows: [['Unit', api.unitName(i.unit)], ['Cause', i.cause], ...(i.to && i.to !== i.from ? [['Successor', i.to]] : []), ['Side', i.side === 'union' ? 'Union' : 'Confederate']] }, ...(i.notes ? [{ t: 'p', text: i.notes, italic: true, size: 'sm' }] : []), { t: 'chips', items: [...src(i)] }]);
  const subjects = { units: items.map((i) => i.unit) };
  return {
    key: 'cmd-' + first.id, kind: 'card', tier: 'C', tone, priority: single && (first.kind === 'killed' || first.kind === 'mortally-wounded') ? 25 : 15, tick: first.tick, subjects, forms, hold: { ms }, version: items.length, announce: label,
    doc: { key: 'cmd-' + first.id, tone, kicker: single ? `Command change · ${TONES[first.kind].label}` : `${items.length} command changes`, title: single ? first.from : clk.long, content: { blocks: docBlocks }, subjects, version: items.length },
    actions: { go: (a) => { a.pause(); a.seek(first.tick, { ms: 180 }); } }, via, items,
  };
}

export const commandToast = {
  id: 'command-toast', label: 'Command-change toast', group: 'popup-toast', enabled: (tok) => tok('popup.toast.enabled'),
  preview(api) { const s = api.scene('fresh2'); api.goTo({ tick: 550, lat: s.lat, lng: s.lng, zoom: 14.5 }); },
  doc: 'A toast for each command change (P-03): typed kind, bursts merged into one card, a Documented source chip per row, a leader to the unit, reading-time life; no flood after a seek.',
  update(frame, api) {
    const tok = api.tok; const idx = indexOf(api.pd); const win = tok('popup.toast.coalesceTicks'); const fallOnly = tok('popup.toast.minKind') === 'fall'; const M = api.host.state.mod; const burst = M.toast || (M.toast = { b: null });
    const take = (rows, via) => {
      for (const r of rows) {
        if (fallOnly && !FALL.has(r.kind)) continue;
        const alive = burst.b && api.host.cards.has('command-toast:' + burst.b.key) && Math.abs(r.tick - burst.b.last) <= win && burst.b.items.length < tok('popup.toast.maxItems') && !burst.b.items.some((i) => i.id === r.id);
        if (alive) { burst.b.items.push(r); burst.b.last = r.tick; api.fire(buildToast(burst.b.items, api, via), { via, renew: true }); }
        else { burst.b = { key: 'cmd-' + r.id, items: [r], last: r.tick }; api.fire(buildToast(burst.b.items, api, via), { via }); }
      }
    };
    take(api.crossed(idx), 'play'); take(api.landed(idx, 0.5), 'land');
    return [];
  },
  rows(ctx) { return ctx.pd.successions.map((s) => ({ id: 'cmd-' + s.id, tick: s.tick, kind: 'command', kindLabel: TONES[s.kind].label, tone: s.kind, title: s.from, text: s.event, place: ctx.unitName(s.unit), make: (api) => buildToast([s], api, 'reopen') })); },
};
