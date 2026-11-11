// The sound panel: start/stop (a click is required by browsers), master / music / effects / voices levels, mute, the DEC-001 labelling setting with every option,
// the honest status lines and the 'what is in this build' list. It reads the audio host (src/audio-host.mjs); without one it says so. All listeners go through the panel scope.
// Registered as PANELS.sound by ui/panels.mjs and also drawn at the end of Settings (mountSoundBlock). mountSoundBadge draws the persistent PDF marking when the setting is 'pdf'.
import { getCurrent, CHANNELS, CHANNEL_INFO, AUDIO_MAX_WARP } from '../audio-host.mjs';
import { Scope } from '../scope.mjs';
import { esc } from './util.mjs';

const LEVELS = [['master', 'Master volume', 'All sound'], ...CHANNELS.map((c) => [c, { music: 'Music (bugle and drum signals)', effects: 'Effects', voices: 'Voices' }[c], CHANNEL_INFO[c]])];
const pct = (v) => Math.round(v * 100) + '%';

/** Draw the sound controls into `body` (a drawer body or any element). `ps` is a Scope that owns the listeners. */
export function mountSoundBlock(body, th, ps) {
  const host = document.createElement('div'); host.className = 'bt-sound'; body.append(host);
  const A = th && th.audio ? th.audio : getCurrent();
  if (!A) { host.innerHTML = `<h3>Sound</h3><p class="mini">Sound is not set up in this visit.</p>`; return host; }
  const S = A.settings;
  host.innerHTML = `<h3 style="margin-top:0">Sound</h3>
    <p class="mini" id="sd-state" aria-live="polite"></p>
    <div class="actions" style="margin:6px 0 10px"><button type="button" class="btn-s" id="sd-start" data-autofocus></button>
      <label class="check" style="margin-left:10px"><input type="checkbox" id="sd-mute" ${S.muted ? 'checked' : ''}> Mute</label></div>
    ${LEVELS.map(([k, lab, tip]) => `<div class="set"><label for="sd-${k}" title="${esc(tip)}">${esc(lab)} <output id="sd-${k}-o">${pct(S[k])}</output></label><input type="range" id="sd-${k}" min="0" max="1" step="0.01" value="${S[k]}"></div>`).join('')}
    <p class="mini">Sound is off until you start it. It is silent while time is paused, while you drag the time bar (nothing from the future is played) and above ${AUDIO_MAX_WARP}x speed; it is not removed, slow down to hear it. After a jump in time, sounds already in the air arrive on schedule.</p>
    <h3>Marking of the sound</h3>
    <fieldset class="seg-f" style="border:0;padding:0;margin:0" id="sd-label"><legend class="mini" style="padding:0">How the sound itself is labelled (decision <span id="sd-dec"></span>)</legend></fieldset>
    <p class="mini" id="sd-labnote"></p>
    <div id="sd-badge" class="mini" style="margin:6px 0"></div>
    <h3>What is in this build</h3><div id="sd-build" class="mini">Loading the list.</div>`;
  const $ = (s) => host.querySelector(s), state = $('#sd-state'), startBtn = $('#sd-start');
  const paintLabel = () => {
    const L = A.labelSetting(); $('#sd-dec').textContent = `${L.decision}: ${L.decisionStatus}`;
    const fs = $('#sd-label'); if (!fs.querySelector('input')) fs.insertAdjacentHTML('beforeend', L.options.map((o) => `<label class="check"><input type="radio" name="sd-labelmode" value="${esc(o.id)}"> ${esc(o.text)}</label>`).join(''));
    for (const r of fs.querySelectorAll('input')) r.checked = r.value === L.current;
    $('#sd-labnote').textContent = (L.chosenByViewer ? 'Your choice, remembered in this browser only. ' : `Shipped default: ${L.default}. `) + 'The list below is identical in both options; only the badge and the tag on each sound change.';
    const b = A.badge(); $('#sd-badge').textContent = b ? 'Marking shown with the sound: ' + b : 'No marking on the sound (the list below and the evidence overlay still disclose everything).';
  };
  const paint = () => {
    const st = A.status(); startBtn.textContent = st.started ? 'Stop sound' : st.silentReason === 'starting' ? 'Starting' : 'Start sound'; startBtn.setAttribute('aria-pressed', String(st.started)); startBtn.disabled = st.silentReason === 'starting';
    state.textContent = (st.error ? 'Sound could not start: ' + st.error + ' ' : '') + st.silentText + (st.started && st.text ? ' ' + st.text : '') + (st.started ? ` Voices sounding: ${st.voices ?? 0}.` : '');
    paintLabel();
  };
  ps.on(startBtn, 'click', async () => { if (A.started) A.stop(); else await A.start(); paint(); th && th.announce && th.announce(A.started ? 'Sound started.' : 'Sound stopped.'); });
  ps.on($('#sd-mute'), 'change', (e) => { A.setMuted(e.target.checked); });
  for (const [k] of LEVELS) { const el = $('#sd-' + k); ps.on(el, 'input', () => { A.setLevel(k, +el.value); $('#sd-' + k + '-o').textContent = pct(+el.value); }); }
  ps.on($('#sd-label'), 'change', (e) => { if (e.target && e.target.name === 'sd-labelmode') { A.setLabelMode(e.target.value); drawBuild(); } });
  const drawBuild = () => {
    const P = A.panel(); const el = $('#sd-build'); if (!P) return;
    el.innerHTML = `<p>${esc(P.disclosure)}</p><table class="table"><tbody>${P.rows.map((r) => `<tr><th>${esc(r.name)}</th><td>${esc(r.kindLabel)} · ${esc(r.tier)}${r.onSound ? ` · <i>${esc(r.onSound)}</i>` : ''}${r.recordings.length ? `<br>Recordings: ${r.recordings.map((x) => esc(x.ledgerId) + (x.shipped ? ' (loaded)' : ' (not loaded)')).join(', ')}` : ''}${r.gap ? `<br>Gap: ${esc(r.gap)}` : ''}</td></tr>`).join('')}</tbody></table>${P.credits.length ? `<p>Credits: ${P.credits.map((c) => esc(c.text)).join('; ')}</p>` : ''}`;
  };
  A.ensureCatalog().then(() => { if (host.isConnected) drawBuild(); }, () => { $('#sd-build').textContent = 'The list could not be loaded.'; });
  const off = A.onChange(() => { if (!host.isConnected) return; paint(); drawBuild(); }); ps.add(off);
  const tick = ps.interval(() => { if (host.isConnected) paint(); }, 1000); void tick;
  paint(); return host;
}

export const soundPanel = {
  title: 'Sound',
  render(body, th) { const ps = new Scope('sound'); soundPanel.dispose = () => { ps.dispose(); soundPanel.dispose = null; }; mountSoundBlock(body, th, ps); },
};

/** The persistent audio marking of the PDF rule (S.1 / Q23 / C.10): one line, drawn only while the setting is 'pdf' and sound is started. */
export function mountSoundBadge(th) {
  const A = th.audio || getCurrent(); if (!A) return null; const el = document.createElement('div'); el.className = 'bt-audio-badge'; el.setAttribute('role', 'note');
  el.style.cssText = 'position:absolute;left:8px;bottom:8px;z-index:5;padding:3px 8px;border-radius:6px;font:12px system-ui,sans-serif;background:rgba(10,12,20,.7);color:#ecebe6;pointer-events:none';
  const paint = () => { const b = A.started ? A.badge() : null; el.hidden = !b; el.textContent = b || ''; };
  th.root.append(el); paint(); const off = A.onChange(paint); th.scope.add(() => { off(); el.remove(); }); return el;
}
