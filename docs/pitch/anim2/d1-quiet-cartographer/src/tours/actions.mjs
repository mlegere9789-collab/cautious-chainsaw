// tours/actions.mjs - what a tour action DOES to the Studio.  Everything goes through the engine's public API (transport, moveTo, tuning, select), so a tour cannot do anything a viewer cannot,
// and it runs identically in node (headless tests) and in the page.  The page passes `hooks` for the few things that live in the interface (panel, results card, selection highlight).
import { applyStyle } from '../styles/index.mjs';
import { compareReport } from './report.mjs';

/** @param {{engine: object, hooks?: {panel?: Function, results?: Function, select?: Function, metrics?: Function}}} o  @returns {(action: object, ctx?: object) => void} */
export function createActions({ engine, hooks = {} }) {
  const tr = engine.transport; const T = engine.tuning;
  return function act(a, ctx = {}) {
    switch (a.a) {
      case 'seek': tr.seek(a.tick, { glide: !!a.glide, ms: a.ms || 0 }); break;
      case 'camera': engine.moveTo({ lat: a.lat, lng: a.lng, zoom: a.zoom }, { glide: a.glide !== false, safe: a.safe !== false }); break;
      case 'play': if (a.speed) tr.setSpeed(a.speed); tr.play(); break;
      case 'pause': tr.pause(); break;
      case 'speed': tr.setSpeed(a.v); break;
      case 'compare': T.set('compare.mode', a.mode); if (a.fresh !== false) engine.metricsOf(a.mode).reset(); break;
      case 'style': applyStyle(engine, a.id, a.variant || 'standard'); break;
      case 'select': engine.select(a.id || null); if (hooks.select) hooks.select(a.id || null); break;
      case 'metrics': { const which = a.reset || 'both'; for (const m of which === 'both' ? ['before', 'after'] : [which]) engine.metricsOf(m).reset(); if (hooks.metrics) hooks.metrics(a); break; }
      case 'popups': if (ctx.popupsWas === undefined) ctx.popupsWas = T.get('popup.enabled'); T.set('popup.enabled', !!a.on); break;
      case 'panel': if (hooks.panel) hooks.panel(a.tab || null); break;
      case 'results': ctx.report = compareReport(engine); if (hooks.results) hooks.results(ctx.report); break;
      default: throw new Error(`unknown tour action "${a.a}"`);
    }
  };
}
