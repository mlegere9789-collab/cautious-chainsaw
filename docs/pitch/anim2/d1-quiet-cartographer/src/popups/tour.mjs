// popups/tour.mjs - P-07, the AUTO TOUR: the 16 stops of the production site's "NPS Auto Tour" (Mcpherson Ridge, Oak Ridge ... Confederate Avenue), each a title, a subtitle and three paragraphs of
// narration, with a map flight to the stop and a few ticks of the battle played there.  Same stops, same words, same order, same dots and Previous / Next, same "play the stop's tick window,
// then pause" behaviour and the same "closing restores the speed".  What changes (02-popups.md F-04, F-07, F-15):
//   * the narration lives in the reading RAIL and the map flies to the stop INSIDE the free part of the screen: the product's drawer covered 36.6 % of the map and the flight put the stop's
//     coordinates 4 px inside the drawer's top edge, so every stop's subject sat under its own description; here the stop is marked on the map with a dashed ring and a leader from the rail;
//   * the hand-typed clock after the dash of each subtitle ("July 2, 4:00 PM") contradicts the clock module (11 of 13 differ by hours) and is not shown; the clock module's line is;
//   * the product's one video (stop 1) points at an NPS page that answers "not available"; it is not embedded (this page makes no network request), the page is named as text, and a
//     Measured chip says what was found;
//   * the name "NPS Auto Tour" claims a numbering that has not been matched to the National Park Service's list: this card says "Auto tour" and says so (Unknown).
import { clockLine, ev, tourSubtitle } from './kit.mjs';

const VIDEO_NOTE = 'Read with curl on 2026-10-05 (02-popups.md F-15): the page answered HTTP 200 with the text "The video you have requested is not available at this time."';

function stopCard(T, api) {
  const tok = api.tok; const stops = api.pd.tour; const stop = stops[T.i]; const clk = clockLine(api.clock, stop.tick); const n = stops.length;
  const paras = stop.narrative.split(/\n{2,}/).map((p) => ({ t: 'p', text: p, serif: true, script: true }));
  const blocks = [
    { t: 'p', text: tourSubtitle(stop.subtitle), muted: true, lead: true }, { t: 'chips', items: [{ ev: 'Modelled', text: `${clk.long} (candidate clock)`, title: clk.chip.title }] },
    ...paras, { t: 'dots', n, active: T.i, label: 'Tour stops' },
    { t: 'actions', items: [{ id: 'prev', label: 'Previous', aria: 'Previous stop' }, { id: 'next', label: T.i === n - 1 ? 'Finish' : 'Next', primary: true, aria: T.i === n - 1 ? 'Finish the tour' : 'Next stop' }, { id: 'replay', label: 'Replay this stop', icon: 'play' }, { id: 'end', label: 'End tour' }] },
    ...(stop.videoUrl ? [{ t: 'disclosure', label: 'Video of this stop', blocks: [{ t: 'p', size: 'sm', text: `The product shows a video here, from this page: ${stop.videoUrl}` }, { t: 'chips', items: [ev('Measured', 'page reports it is not available', VIDEO_NOTE)] }] }] : []),
    { t: 'chips', items: [ev('Unknown', 'stop numbering is this site’s own', 'The product calls this the NPS Auto Tour. Its stop numbers have not been matched to the National Park Service’s own list (02-popups.md F-15, decision D-4).')] },
  ];
  return {
    key: 'tour', kind: 'doc', tier: 'S', tone: 'tour', priority: 70, openOnAppear: true, forms: [], version: `${T.i}|${T.phase}`,
    doc: { key: 'tour', noFrame: true, tone: 'tour', kicker: `Auto tour · stop ${T.i + 1} of ${n}`, title: stop.title, content: { blocks }, subjects: { place: { lat: stop.lat, lng: stop.lng, label: stop.title } }, version: `${T.i}|${T.phase}` },
    actions: {
      prev: (a) => go(T, a, (T.i + n - 1) % n), next: (a) => { if (T.i === n - 1) a.host.closeRail(); else go(T, a, T.i + 1); }, replay: (a) => go(T, a, T.i), end: (a) => a.host.closeRail(),
    },
    onAction: (a, action) => { if (action.startsWith('goto:')) go(T, a, +action.slice(5)); },
    onRailClose: (a) => stop_(T, a),
  };
}

function go(T, api, i) {
  const stop = api.pd.tour[i]; T.i = i; T.phase = 'fly'; T.t0 = api.nowMs; T.playUntil = null;
  api.pause(); api.flyTo({ lat: stop.lat, lng: stop.lng, zoom: stop.zoom, glide: true, safe: true }); api.seek(stop.tick, { glide: true, ms: 380 });
}
function stop_(T, api) {
  if (!T.active) return; T.active = false; T.phase = 'idle';
  if (api.tok('popup.tour.restoreSpeed') && T.prevSpeed != null) api.setSpeed(T.prevSpeed);
}
function start(T, api) {
  if (T.active) { api.host.closeRail(); return; }
  T.active = true; T.prevSpeed = api.speed(); T.i = 0; T.phase = 'fly'; go(T, api, 0);
}

export const tour = {
  id: 'tour', label: 'Auto tour', group: 'popup-tour', enabled: (tok) => tok('popup.tour.enabled'),
  preview(api) { start(api.host.state.mod.tour || (api.host.state.mod.tour = { active: false, i: 0, phase: 'idle' }), api); },
  doc: 'The 16-stop tour (P-07) in the reading rail; the map flies to each stop inside the free part of the screen and marks it with a dashed ring.',
  toolbar: [{ id: 'tour', phone: false, label: 'Auto tour', title: 'A 16-stop tour of the battle: map flight, narration, a few ticks played at each stop', run: (api) => start(api.host.state.mod.tour || (api.host.state.mod.tour = { active: false, i: 0, phase: 'idle' }), api), pressed: (host) => !!(host.state.mod.tour && host.state.mod.tour.active) }],
  update(frame, api) {
    const T = api.host.state.mod.tour; if (!T || !T.active) return [];
    const tok = api.tok; const stop = api.pd.tour[T.i];
    if (T.phase === 'fly' && api.nowMs - T.t0 > 700 && !api.time.gliding) {
      if (tok('popup.tour.autoplay')) { api.setSpeed(tok('popup.tour.speedX')); api.play(); T.playUntil = api.nowMs + stop.tickWindow * tok('popup.tour.msPerTick'); T.phase = 'play'; } else T.phase = 'idle';
    } else if (T.phase === 'play' && api.nowMs >= T.playUntil) { api.pause(); T.phase = 'idle'; }
    return [stopCard(T, api)];
  },
};
