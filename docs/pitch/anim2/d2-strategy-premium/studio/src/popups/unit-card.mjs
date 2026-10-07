// popups/unit-card.mjs - P-05 and P-06 (and the phone's P-47): the UNIT CARD.
//   * the HOVER TOOLTIP: a dead popup of the product (it is rendered with props that are never passed, so it never shows) revived: rest the pointer on a tile and a small card names it
//     (who, which side, how strong, how old the last keyframe is).  It stays while the pointer is on the tile or on the card and Esc dismisses it (WCAG 1.4.13: dismissable, hoverable, persistent);
//   * the UNIT CARD of the selected unit (click, or U on the keyboard): a card on free ground with a leader to the tile, and the whole panel in the reading rail: identity and chain of
//     command, the current keyframe, the strength bar, the commander and the command changes, the key action, casualties, the latest positions.
// Every fact carries its evidence label (the site's vocabulary): identity and commander names are Documented (order of battle); positions, the strength at a keyframe and the keyframe list are
// Modelled (hand-authored placement rows, not a record: a strength at a keyframe is NOT a casualty count); casualty totals are Documented from a secondary source whose file metadata
// claims Busey and Martin (not re-read here, and the chip says so); a unit whose id prefix contradicts its state code is shown as Contested, never as one side.
import { clockLine, thousands, chipText, ev, TONES } from './kit.mjs';

const SIDE = { union: 'Union', confederate: 'Confederate', unknown: 'Side unknown', mixed: 'Both sides' };
const KIND = { regiment: 'Regiment', brigade: 'Brigade', division: 'Division', corps: 'Corps', battery: 'Battery', battalion: 'Battalion', army: 'Army' };
const ARM = { infantry: 'infantry', cavalry: 'cavalry', artillery: 'artillery', mixed: 'mixed arms' };
const SEC = 'A secondary source: the file metadata names Busey and Martin, Regimental Strengths and Losses at Gettysburg (1994). The source was not re-read here.';

function chainNames(api, d) { return d.chain.slice(1).filter((c) => c.designation && c.kind !== 'army').reverse().map((c) => c.designation); }

export function buildUnitCard(id, api) {
  const tok = api.tok; const d = api.engine.describeUnit(id, api.time.tau); if (!d) return null; const oob = api.pd.oob[id] || null; const tau = api.time.tau;
  const tone = d.side === 'union' ? 'union' : d.side === 'confederate' ? 'confederate' : 'info'; const name = d.designation || d.label || d.id;
  const now = d.now; const ratio = now ? Math.min(1, (now.strength || 0) / (now.strengthRef || 1)) : 0; const chain = chainNames(api, d);
  const kick = { t: 'kicker', shape: 'box', label: d.side === 'unknown' ? 'Side unknown' : `${SIDE[d.side]} · ${KIND[d.kind] || d.kind}` };
  // the arm sits with the chain (the kicker has no room for it beside the three tools, and the mark already carries it)
  const armText = now ? String(ARM[d.arm] || d.arm || '') : ''; const meta = [armText ? armText.charAt(0).toUpperCase() + armText.slice(1) : '', chain.filter((n) => !name.includes(n)).slice(-2).join(' › ')].filter(Boolean).join(' · ');
  const bar = now ? { t: 'bar', value: ratio, label: 'Strength at this placement', value2: `${thousands(now.strength)} of ${thousands(now.strengthRef)}`, sub: 'a placement value, not a casualty record ', chip: ev('Modelled'), aria: `Strength ${thousands(now.strength)} of ${thousands(now.strengthRef)} at this placement` } : { t: 'p', size: 'sm', muted: true, text: 'Not on the field at this moment.' };
  const side = d.sideNote ? [{ t: 'p', size: 'sm', text: d.sideNote }, { t: 'chips', items: [ev('Contested', 'side', 'The id prefix and the state code in the id disagree (03-data-fuel.md, T7). A historian has to decide.')] }] : [];
  const cmd = oob && oob.cmd ? [{ t: 'kv', rows: [['Commander', oob.cmd.name, ev('Documented', 'order of battle', 'Order-of-battle file of the production data')]] }] : [];
  const full = { id: 'full', level: 'full', w: tok('popup.unit.cardW'), content: { label: `Unit: ${name}. ${SIDE[d.side]}.`, blocks: [kick, { t: 'title', text: name }, ...(meta ? [{ t: 'p', size: 'sm', muted: true, text: meta }] : []), bar, ...cmd, ...side, { t: 'actions', items: [{ id: 'details', label: 'Details', icon: 'book', primary: true }, { id: 'map', label: 'Show on map', icon: 'target' }] }] } };
  const compact = { id: 'compact', level: 'compact', w: 250, content: { label: `Unit: ${name}`, blocks: [kick, { t: 'title', text: name }, bar] } };

  // ---- the rail: the whole panel ------------------------------------------------------------------------------------------------------------------------------------
  const succ = api.pd.successions.filter((s) => s.unit === id && s.tick <= tau + 0.5);
  const recent = d.keyframes ? api.battle.units.get(id).kf.filter((k) => k.tick <= tau + 0.5).slice(-tok('popup.unit.recent')).reverse() : [];
  const docBlocks = [
    { t: 'p', size: 'sm', muted: true, text: ARM[d.arm] || d.arm },
    ...(chain.length ? [{ t: 'p', size: 'sm', muted: true, text: chain.join(' › ') }] : []), ...side,
    { t: 'kv', rows: [['Identity', d.inOob ? 'in the order of battle' : 'no complete order-of-battle parent', ev(d.inOob ? 'Documented' : 'Unknown')], ...(oob && oob.state ? [['State', oob.state, ev('Documented')]] : []), ...(oob && oob.days ? [['Days engaged', oob.days.join(', '), ev('Documented', 'secondary', SEC)]] : [])] },
    ...(now ? [{ t: 'title', text: 'At this moment', level: 3 }, bar, { t: 'kv', rows: [['Disposition', now.disposition || 'n/a', ev('Modelled')], ['Last keyframe', `${clockLine(api.clock, now.kfTick).short} (${Math.round(now.ageTicks)} ticks ago${now.untilNext === Infinity ? ', the last one' : ''})`, ev('Modelled')], ['Position', `${now.lat.toFixed(4)}, ${now.lng.toFixed(4)}`, ev('Modelled', 'hand-authored', 'Placement rows are hand-authored and carry no basis field')]] }, ...(now.note ? [{ t: 'quote', text: now.note, cite: 'the keyframe’s own note' }] : [])] : []),
    ...(oob && oob.cmd ? [{ t: 'title', text: 'Command', level: 3 }, { t: 'kv', rows: [['Commander', oob.cmd.name, ev('Documented')], ...(oob.cmd.fate ? [['Fate', oob.cmd.fate, ev('Documented')]] : []), ...(oob.cmd.succ ? [['Successor', oob.cmd.succ.name + (oob.cmd.succ.note ? ` (${oob.cmd.succ.note})` : ''), ev('Documented')]] : [])] }, ...(oob.cmd.note ? [{ t: 'p', text: oob.cmd.note, size: 'sm', italic: true }] : [])] : []),
    ...(succ.length ? [{ t: 'title', text: 'Command changes so far', level: 3 }, { t: 'list', items: succ.map((s) => ({ tone: s.kind, shape: TONES[s.kind].shape, title: s.from, text: s.event, sub: `${clockLine(api.clock, s.tick).short} · ${s.source}` })) }] : []),
    ...(oob && oob.key ? [{ t: 'title', text: 'Key action', level: 3 }, { t: 'p', text: oob.key }, { t: 'chips', items: [ev('Documented', 'secondary', SEC)] }] : []),
    ...(tok('popup.unit.casualties') && oob && oob.str != null ? [{ t: 'title', text: 'Order-of-battle totals', level: 3 }, { t: 'kv', rows: [['Strength', thousands(oob.str), ev('Documented', 'secondary', SEC)], ...(oob.cas != null ? [['Casualties', `${thousands(oob.cas)}${oob.pct != null ? ` (${oob.pct}%)` : ''}`, ev('Documented', 'secondary', SEC)]] : [])] }, { t: 'p', size: 'sm', muted: true, text: 'Totals for the whole battle. They are not the per-keyframe strength above, which is a placement value.' }] : []),
    ...(recent.length ? [{ t: 'title', text: 'Latest positions', level: 3 }, { t: 'list', items: recent.map((k) => ({ tone: 'info', shape: 'pin', title: clockLine(api.clock, k.tick).short, text: `${k.lat.toFixed(4)}, ${k.lng.toFixed(4)} · ${k.disposition}`, sub: `strength ${thousands(k.strength)}` })) }, { t: 'chips', items: [ev('Modelled', 'keyframes', 'Hand-authored placement rows')] }] : []),
  ];
  const tileKey = null; void tileKey;
  const subjects = { units: [id] };
  return {
    key: 'sel-' + id, kind: 'card', tier: 'S', tone, priority: 50, tick: tau, subjects, forms: [full, compact], version: `${id}|${now ? Math.round(now.strength) + '|' + now.kfTick : 'off'}`, live: false, announce: `Selected ${name}. ${SIDE[d.side]}.`,
    doc: { key: 'sel-' + id, tone, kicker: `${SIDE[d.side]} · ${KIND[d.kind] || d.kind}`, title: name, content: { blocks: docBlocks }, subjects, version: `${id}|${Math.round(tau)}` },
    onDismiss: (a) => a.select(null),
    actions: {
      details: (a, card) => a.host.openRail(card.id),
      map: (a, card) => { const r = card && card.anchorRect; if (r) a.ensureVisible({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }, 120); if (card) card.pulseT0 = a.nowMs; },
    },
  };
}

export function buildTooltip(tile, api) {
  const tok = api.tok; const leaf = tile.kind === 'leaf'; const tone = tile.side === 'union' ? 'union' : tile.side === 'confederate' ? 'confederate' : 'info';
  let blocks;
  if (leaf) {
    const id = tile.ids[0]; const d = api.engine.describeUnit(id, api.time.tau); const now = d && d.now; const name = d ? (d.designation || d.label) : tile.short;
    blocks = [{ t: 'kicker', shape: 'box', label: `${SIDE[tile.side] || ''} · ${KIND[d && d.kind] || ''}`.replace(/ · $/, '') }, { t: 'title', text: name }, ...(now ? [{ t: 'bar', value: Math.min(1, now.strength / (now.strengthRef || 1)), label: 'Strength at this placement', value2: `${thousands(now.strength)} of ${thousands(now.strengthRef)}`, sub: 'Modelled placement value', aria: 'strength' }, { t: 'p', size: 'sm', muted: true, text: `${now.disposition || ''} · last keyframe ${Math.round(now.ageTicks)} ticks ago` }] : []), { t: 'p', size: 'sm', muted: true, text: 'Click to open the unit card.' }];
  } else {
    const names = tile.ids.slice(0, 5).map((i) => (api.battle.units.get(i) || {}).label || i);
    blocks = [{ t: 'kicker', shape: 'box', label: 'Aggregate' }, { t: 'title', text: `${tile.n} placement records share this tile` }, { t: 'p', size: 'sm', text: names.join(', ') + (tile.ids.length > 5 ? ` and ${tile.ids.length - 5} more` : '') }, { t: 'chips', items: [ev('Computed', 'records, never men')] }, { t: 'p', size: 'sm', muted: true, text: 'Zoom in to separate them.' }];
  }
  return { key: 'tip-' + tile.key, kind: 'tooltip', tier: 'S', tone, priority: 60, tick: api.time.tau, subjects: { tileKeys: [tile.key] }, forms: [{ id: 'tip', level: 'full', w: tok('popup.unit.tipW'), content: { label: leaf ? 'Unit' : 'Aggregate', blocks } }, { id: 'tip-mini', level: 'compact', w: 190, content: { label: leaf ? 'Unit' : 'Aggregate', blocks: [blocks[0], blocks[1]] } }], version: `${tile.key}|${Math.round(api.time.tau / 4)}` };
}

export const unitCard = {
  id: 'unit-card', label: 'Unit card and hover', group: 'popup-unit', enabled: (tok) => tok('popup.unit.enabled'),
  preview(api) { api.goTo({ tick: 40, lat: 39.8278, lng: -77.2528, zoom: 15 }); api.select('U-I-1-1'); },
  doc: 'The hover tooltip (P-05, revived) and the card of the selected unit (P-06) with the whole panel in the reading rail; every fact carries its evidence label.',
  update(frame, api) {
    const out = []; const sel = api.selectedId;
    if (sel) { const c = buildUnitCard(sel, api); if (c) out.push(c); }
    const hv = api.hover;
    if (hv && api.nowMs - hv.since >= api.tok('popup.unit.tipDelayMs')) {
      const tile = frame.tiles.find((t) => t.key === hv.key && t.solid);
      if (tile && !(sel && tile.ids[0] === sel)) out.push(buildTooltip(tile, api));
    }
    return out;
  },
};
void chipText;
