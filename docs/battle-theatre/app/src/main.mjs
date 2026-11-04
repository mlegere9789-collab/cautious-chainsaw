// Page entry. The landing page is inert: no renderer, timer, worker or audio exists until the entry control is used. Entering builds a Theatre; Back disposes it
// completely and returns here. Browser Back and the Back control are the same path.
import { Theatre } from './theatre.mjs';

const landing = document.getElementById('landing'), enterBtn = document.querySelector('[data-bt-enter]'), status = document.getElementById('landing-status'), skip = document.querySelector('.skip');
const tpl = document.getElementById('tpl-theatre'), home = document.getElementById('home-link');
const params = new URLSearchParams(location.search);
const homeHref = params.get('home') || document.querySelector('meta[name="bt-home"]')?.content; if (home && homeHref) home.setAttribute('href', homeHref);

let theatre = null, entering = false;
async function enter(mode = 'click') {
  if (theatre || entering) return; entering = true; enterBtn.disabled = true; status.textContent = 'Preparing the field…';
  try {   // the entry control adds a history entry; arriving by browser Forward reuses the one that exists; a #theatre link is the entry itself
    if (mode === 'click') history.pushState({ bt: 1 }, '', location.pathname + location.search + '#theatre');
    else if (mode === 'deep') history.replaceState({ bt: 1, deep: 1 }, '', location.href);
  } catch { /* history unavailable */ }
  const th = theatre = new Theatre(tpl, { onBack: back });
  landing.hidden = true; landing.setAttribute('inert', ''); skip.setAttribute('href', '#bt-canvas');
  await th.start(); entering = false;
  window.dispatchEvent(new CustomEvent('bt:entered', { detail: { ok: !th.failed && !th.dead } }));
}
function leave(fromHistory) {
  if (!theatre) return; const th = theatre; theatre = null; th.dispose();
  landing.hidden = false; landing.removeAttribute('inert'); skip.setAttribute('href', '#bt-main-action'); enterBtn.disabled = false; status.textContent = '';
  if (!fromHistory && location.hash === '#theatre') { try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ } }
  enterBtn.focus({ preventScroll: true }); entering = false;
  window.dispatchEvent(new CustomEvent('bt:left'));
}
function back() { if (history.state && history.state.bt && !history.state.deep) history.back(); else leave(false); }

enterBtn.addEventListener('click', () => enter('click'));
window.addEventListener('popstate', () => { if (theatre && !(history.state && history.state.bt)) leave(true); else if (!theatre && history.state && history.state.bt) enter('popstate'); });
if (location.hash === '#theatre') enter('deep');
