// tours/director.mjs - the TOUR DIRECTOR: runs a scripted tour (a list of timed steps) against the Studio.  Pure logic, no DOM, no clock of its own: the app (and the tests) call update(dtMs) with the
// time the engine itself was advanced by, so a tour runs on the engine's time, freezes when the tab is hidden, and is exactly reproducible headless.
//
//   tour  = { id, label, group, blurb, steps: [ step ] }
//   step  = { id, ms, enter: [action], caption: caption | (ctx) => caption, live?: true, refresh?: true }   refresh: re-evaluate the caption function twice a second while the step runs (words that quote live numbers)
//   action= { a: 'seek', tick, glide? } | { a: 'camera', lat, lng, zoom, glide?, safe? } | { a: 'play', speed? } | { a: 'pause' } | { a: 'speed', v } | { a: 'compare', mode: 'before'|'after' }
//           | { a: 'style', id, variant? } | { a: 'select', id } | { a: 'metrics', reset?: 'before'|'after'|'both' } | { a: 'panel', tab } | { a: 'results' } | { a: 'overview', on }
//   caption = { kicker, title, text, chips: [{ ev, text }], table?: [{ label, before, after, unit, ... }], live?: true }
//
// Adding a tour is adding data: see tours/library.mjs.  Actions are run by `act` (tours/actions.mjs), captions are handed to `onCaption`.
export function createDirector({ act, onCaption = () => {}, onProgress = () => {}, onEnd = () => {}, ctx = {} }) {
  const S = { tour: null, i: -1, t: 0, elapsed: 0, total: 0, running: false, paused: false, endedBy: null, refreshAt: 0 };
  const stepOf = () => (S.tour ? S.tour.steps[S.i] : null);
  const resolve = (c) => (typeof c === 'function' ? c(ctx) : c);

  function enter(i) {
    S.i = i; S.t = 0; S.refreshAt = 120; const st = stepOf(); if (!st) return; ctx.enteredAtFrame = ctx.engine ? ctx.engine.frames : 0;     // a caption quoting the engine's frame can tell whether the frame it reads was drawn after this step's actions
    for (const a of st.enter || []) { try { act(a, ctx); } catch (e) { S.error = `${S.tour.id}/${st.id}: ${e.message}`; console.warn('tour action failed', S.error); } }
    onCaption(st.caption ? { ...resolve(st.caption), live: !!st.live, step: i + 1, steps: S.tour.steps.length } : null, st, S);
  }
  function finish(by) { const tour = S.tour; S.running = false; S.endedBy = by; onProgress({ tour, frac: by === 'end' ? 1 : S.elapsed / Math.max(1, S.total), step: S.i, stepFrac: 1, done: true }); onEnd(by, tour); }

  const D = {
    get state() { return S; },
    get running() { return S.running; },
    get tour() { return S.tour; },
    /** begin a tour; the first step's actions run now */
    start(tour) {
      if (!tour || !tour.steps || !tour.steps.length) throw new Error('a tour needs at least one step');
      S.tour = tour; S.total = tour.steps.reduce((a, s) => a + s.ms, 0); S.elapsed = 0; S.running = true; S.paused = false; S.endedBy = null; S.error = null; ctx.report = null;
      enter(0); onProgress({ tour, frac: 0, step: 0, stepFrac: 0 });
    },
    stop(by = 'stopped') { if (S.running) finish(by); },
    pause() { S.paused = true; }, resume() { S.paused = false; },
    get paused() { return S.paused; },
    /** jump to the next / previous step (the time bar follows) */
    skip(dir = 1) {
      if (!S.running) return; const n = S.tour.steps.length; const j = S.i + dir;
      if (j >= n) { finish('end'); return; } if (j < 0) { S.elapsed = 0; enter(0); return; }
      S.elapsed = S.tour.steps.slice(0, j).reduce((a, s) => a + s.ms, 0); enter(j);
    },
    /** advance the tour by dtMs of engine time (the app passes the same dt it advanced the engine by) */
    update(dtMs) {
      if (!S.running || S.paused) return; let left = Math.max(0, dtMs);
      while (left > 0 && S.running) {
        const st = stepOf(); const room = st.ms - S.t;
        if (left < room) { S.t += left; S.elapsed += left; left = 0; } else { S.t = st.ms; S.elapsed += room; left -= room; if (S.i + 1 >= S.tour.steps.length) { finish('end'); return; } enter(S.i + 1); }
      }
      if (S.running) {
        const st = stepOf(); if (st.refresh && typeof st.caption === 'function' && S.t >= S.refreshAt) { S.refreshAt = S.t + 500; onCaption({ ...resolve(st.caption), live: !!st.live, step: S.i + 1, steps: S.tour.steps.length, refresh: true }, st, S); }
        onProgress({ tour: S.tour, frac: S.elapsed / S.total, step: S.i, stepFrac: S.t / st.ms });
      }
    },
  };
  return D;
}
