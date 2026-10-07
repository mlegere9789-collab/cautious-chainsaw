// popups/story-card.mjs - P-02, the STORY CARD: one card for each of the 24 vignettes ("Reynolds Falls", "Cushing's Battery", "The High Water Mark" ...), triggered when the clock reaches the
// vignette's tick, exactly as in the product, with the product's content: title, "~N min read", the summary, the full script, the place, the units featured, a jump to the moment.
// What changes (02-popups.md 5.3):
//   * a PEEK on the map (title, place, the first lines of the summary, "Read the full story") that is placed on free ground and points at the unit it is about; the full script opens in the
//     reading RAIL, which makes the map smaller instead of covering it, so reading a story can never hide a tile;
//   * the badge names units ("Iron Brigade", not "U-I-1-1"); read time is words over the dial's wpm; the jump button says where it goes ("Go to this moment"), not a bare tick;
//   * two stories at one moment (tick 556) are paged in the rail; the card's life is reading time; a dismissed story returns after a seek away or from the Chronicle;
//   * the text is the vignette's, verbatim: summary and script are never shortened or reworded (the peek clamps the VIEW with CSS, the rail shows everything).
import { clockLine, words, readMs, firstSentence, tickIndex, dedupeNames, ev } from './kit.mjs';

const cache = new WeakMap();
const indexOf = (pd) => { let i = cache.get(pd.stories); if (!i) { i = tickIndex(pd.stories); cache.set(pd.stories, i); } return i; };
const siblingsOf = (pd, s) => pd.stories.filter((x) => x.tick === s.tick && x.id !== s.id);

export function buildStoryCard(s, api, via = 'play') {
  const tok = api.tok; const clk = clockLine(api.clock, s.tick); const names = dedupeNames(s.units.map(api.unitName)); const sibs = siblingsOf(api.pd, s);
  const lines = tok('popup.story.peekLines'); const minutes = Math.max(1, Math.round((words(s.summary) + words(s.script)) / tok('popup.story.wpm')));
  const shownWords = words(s.title) + Math.min(words(s.summary), lines * 9); const ms = readMs(shownWords, { baseMs: tok('popup.dwell.aBaseMs'), minMs: tok('popup.dwell.aMinMs'), maxMs: tok('popup.dwell.aMaxMs'), wpm: tok('popup.read.wpm') });
  const label = `Story: ${s.title}. ${firstSentence(s.summary)} ${s.place}. ${clk.long}.`;
  const kick = { t: 'kicker', label: 'Story', right: `${minutes} min read` };
  const meta = { t: 'meta', rows: [{ icon: 'pin', text: s.place }, ...(names.length ? [{ icon: 'box', text: names.join(' · '), title: 'Units this story features' }] : [])] };
  const peek = { id: 'peek', level: 'full', w: tok('popup.story.peekW'), content: { label, blocks: [kick, { t: 'title', text: s.title, serif: true }, { t: 'p', text: s.summary, lines }, meta, { t: 'chips', items: [clk.chip] }, { t: 'actions', items: [{ id: 'read', label: 'Read the full story', icon: 'book', primary: true }] }] } };
  const compact = { id: 'compact', level: 'compact', w: tok('popup.story.compactW'), content: { label, blocks: [kick, { t: 'title', text: s.title, serif: true }, { t: 'p', text: s.summary, lines: 2 }, { t: 'chips', items: [clk.chip] }] } };
  const mini = { id: 'mini', level: 'compact', w: tok('popup.story.miniW'), tools: ['pin', 'close'], content: { label, blocks: [{ t: 'kicker', label: 'Story', right: clk.short }, { t: 'title', text: s.title, serif: true }, { t: 'p', text: s.summary, lines: 1, size: 'sm' }] } };
  const chip = { id: 'chip', level: 'chip', w: 260, content: { blocks: [], kind: 'Story', line: s.title, full: `Story: ${s.title}. ${s.summary}`, label } };
  const subjects = { units: s.units, place: { lat: s.lat, lng: s.lng, label: s.place } };
  const docBlocks = [
    { t: 'meta', rows: [{ icon: 'pin', text: s.place }, ...(names.length ? [{ icon: 'box', text: names.join(' · ') }] : [])] },
    { t: 'p', text: s.summary, lead: true, serif: true },
    ...s.script.split(/\n{2,}/).map((p) => ({ t: 'p', text: p, serif: true, script: true })),
    { t: 'kv', rows: [['Moment', clk.long, clk.chip], ['Read time', `about ${minutes} min at ${tok('popup.story.wpm')} words a minute`, ev('Computed')]] },
    { t: 'disclosure', label: 'Sources of this vignette file', blocks: [{ t: 'p', size: 'sm', muted: true, text: 'The file lists these sources as a whole; it does not say which source supports which passage, so none is cited for this story alone. The place marker is the vignette’s own coordinate and can be hundreds of metres from the units.' }, { t: 'list', items: (api.pd.fileSources.stories[s.file] || []).map((x) => ({ tone: 'info', shape: 'book', text: x })) }] },
    { t: 'actions', items: [{ id: 'go', label: 'Go to this moment', icon: 'play', primary: true }, { id: 'map', label: 'Show on map', icon: 'target' }, ...sibs.map((x) => ({ id: 'sib:' + x.id, label: `Also at this moment: ${x.title}`, icon: 'book' }))] },
  ];
  return {
    key: 'story-' + s.id, kind: 'card', tier: 'A', tone: 'story', priority: 40, tick: s.tick, subjects, forms: [peek, compact, mini, chip], hold: { ms }, version: 1, announce: label,
    doc: { key: 'story-' + s.id, tone: 'story', kicker: `Story · ${clk.short} · ${minutes} min read`, title: s.title, content: { blocks: docBlocks }, subjects, version: 1 },
    actions: {
      read: (a, card) => a.host.openRail(card.id),
      go: (a) => { a.pause(); a.seek(s.tick, { ms: 180 }); },
      map: (a, card) => { const r = card && card.anchorRect; if (r) a.ensureVisible({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }, 120); if (card) card.pulseT0 = a.nowMs; },
    },
    onAction: (a, action) => { if (action.startsWith('sib:')) { const row = a.rows.rows.find((r) => r.id === 'story-' + action.slice(4)); if (row) { const c = a.reopen(row); if (c) a.host.openRail(c.id); } } },
    via,
  };
}

export const storyCard = {
  id: 'story-card', label: 'Story card', group: 'popup-story', enabled: (tok) => tok('popup.story.enabled'),
  preview(api) { const s = api.scene('fresh2'); api.goTo({ tick: 551, lat: s.lat, lng: s.lng, zoom: 14.5 }); },
  doc: 'A card for each vignette (P-02): a peek on free ground with a leader to the unit it is about; the whole story opens in the reading rail (the map makes room); read time, named units, paged siblings, reading-time life.',
  update(frame, api) {
    const idx = indexOf(api.pd); const tok = api.tok; const auto = tok('popup.story.autoRail');
    const raise = (s, via, after) => { const card = buildStoryCard(s, api, via); const c = api.fire(card, { via, landAfter: after }); if (c && (auto === 'always' || (auto === 'paused' && via === 'land'))) api.host.openRail(c.id); };
    for (const s of api.crossed(idx)) raise(s, 'play', null);
    const land = tok('popup.story.landTicks'); for (const s of api.landed(idx, land)) raise(s, 'land', land);
    return [];
  },
  rows(ctx) { return ctx.pd.stories.map((s) => ({ id: 'story-' + s.id, tick: s.tick, kind: 'story', tone: 'story', title: s.title, text: `${s.title}. ${firstSentence(s.summary)}`, place: s.place, make: (api) => buildStoryCard(s, api, 'reopen') })); },
};
