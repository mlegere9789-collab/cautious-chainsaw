// The drawers: Events (timeline), Views (camera bookmarks), Sources (conflict scenarios), About (what you are seeing), Settings.
import { Scope } from '../scope.mjs';
import { TIERS, TIER_STYLE, SPEEDS, DEFAULTS, GROUND_NOTE, LABEL_PLACEHOLDER, API_NOTE } from '../config.mjs';
import { BATTLE, EPILOGUE, fmtDate, fmtTime, fmtShort, parts, minOf } from '../clock.mjs';
import { scenarioIsDefault, scenarioLabel, timelineWindowsHref } from '../data.mjs';
import { DELEGATED_KEY, PDF_KEY, DELEGATED_NOTE, withDefault, currentKey, optionLabel, setChoice, resetToDelegated, switchToPdf, scenarioKind } from '../scenario-defaults.mjs';
import { STUB_LINKS } from '../history/stub.mjs';
import { glyphSVG } from '../overlay.mjs';
import { esc, ic, pill, regLink, fmtN, debounce } from './util.mjs';
import { strengthDrawn } from '../history/contract.mjs';
import { mountLayersBlock, mountStructScenarios } from './structures-ui.mjs';
import { soundPanel, mountSoundBlock } from './sound-panel.mjs';
import { mountExtToggles } from './ext-panel.mjs';

export const PANELS = Object.create(null);      // no inherited names: an added panel called "constructor" or "valueOf" is only a name (ui/ext-panel.mjs, chrome.mjs look panels up by name)
const own = (name, th, fn) => { const ps = new Scope(name); PANELS[name].dispose = () => { ps.dispose(); PANELS[name].dispose = null; }; fn(ps); };
const SIDE_ORDER = { Union: 0, Confederate: 1, Other: 2 };

// ================= Events
const timeLabel = e => {
  if (e.parse === 'phrase_only') return `Time not recorded${e.phrase ? ' (' + esc(e.phrase) + ')' : ''}`;
  if (e.parse === 'range' || e.parse === 'band_from_sun_table') return `${e.band ? esc(e.band) + ' ' : ''}${fmtTime(e.earliest)} – ${fmtTime(e.latest)}`;
  return (e.approx ? 'about ' : '') + fmtTime(e.t);
};
function eventDetail(e) {
  const alt = e.alternatives.length ? `<tr><th>Other times given</th><td>${e.alternatives.map(a => esc(a.text)).join('; ')}</td></tr>` : '';
  const win = e.earliest != null && e.latest != null && e.latest !== e.earliest ? `<tr><th>Window</th><td>${fmtShort(e.earliest)} to ${fmtShort(e.latest)} · default ${e.t != null ? fmtShort(e.t) : '—'}</td></tr>` : '';
  return `<div class="card-body" style="padding:0;margin-bottom:6px"><h3 style="margin-top:4px">Selected event</h3><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${pill(e.tier)}<span class="pill">${esc(e.id)}</span><span class="pill" title="Timeline rows stay unverified until checked against a primary source">Seeded, unverified</span></div>
    <p style="font-size:13.5px;line-height:1.5;color:var(--text)">${esc(e.text)}</p>${e.notes ? `<p class="mini" style="margin-top:6px">${esc(e.notes)}</p>` : ''}
    <table class="table" style="margin-top:8px"><tr><th>Time as printed</th><td>${esc(e.raw)}${e.parse === 'phrase_only' ? ' · no clock time, so it is not placed on the minute scale' : ''}</td></tr>${win}${alt}
    <tr><th>Source row</th><td>Plan page ${e.page ?? '—'}${e.weak ? ' · weak-source flag' : ''}</td></tr></table>
    <div class="actions" style="margin-top:10px">${e.register ? regLink(e.register, 'Open the evidence-gap entry') : ''}</div></div>`;
}
PANELS.events = {
  title: 'Timeline events',
  render(body, th) {
    own('events', th, ps => {
      const f = { q: '', tiers: new Set(TIERS), day: 'all', timed: false };
      const days = [...new Set(th.timeline.map(e => e.date).filter(d => d != null))].sort((a, b) => a - b);
      body.innerHTML = `<input class="field" type="search" placeholder="Search ${th.timeline.length} events" aria-label="Search events" data-autofocus id="ev-q">
        <div class="seg" role="group" aria-label="Evidence tier">${TIERS.map(t => `<button type="button" data-tier="${t}" aria-pressed="true">${glyphSVG(t, 12)} ${esc(TIER_STYLE[t].label)}</button>`).join('')}</div>
        <div style="display:flex;gap:10px;margin:8px 0 2px"><select class="field" id="ev-day" aria-label="Day" style="flex:1;height:38px"><option value="all">All days</option>${days.map(d => `<option value="${d}">${fmtDate(d)}</option>`).join('')}</select>
        <label class="check" style="flex:none"><input type="checkbox" id="ev-timed"> Timed only</label></div>
        <p class="mini" id="ev-count" aria-live="polite"></p><div id="ev-pin"></div><ul class="list" id="ev-list"></ul>`;
      const list = body.querySelector('#ev-list'), pin = body.querySelector('#ev-pin'), count = body.querySelector('#ev-count');
      const inRange = e => e.t != null && e.t >= BATTLE.from && e.t < BATTLE.to;
      function draw() {
        const q = f.q.toLowerCase(); const rows = th.timeline.filter(e => f.tiers.has(e.tier) && (f.day === 'all' || e.date === +f.day) && (!f.timed || e.t != null) && (!q || e.text.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.raw.toLowerCase().includes(q)));
        let html = '', last = '#'; const cur = th.state.event?.id;
        for (const e of rows) {
          const key = e.date == null ? 'none' : e.date; if (key !== last) { last = key; html += `<li class="day-h" role="presentation">${e.date == null ? 'Date not given' : fmtDate(e.date, true)}${e.date != null && (e.date < BATTLE.from || e.date >= BATTLE.to) ? ' <span class="mini">· outside the scrubber</span>' : ''}</li>`; }
          html += `<li><button type="button" class="item" data-id="${e.id}" ${e.id === cur ? 'aria-current="true"' : ''}><span class="glyph">${glyphSVG(e.tier, 14)}</span><span class="when">${timeLabel(e)} · ${esc(e.id)}</span><span class="what">${esc(e.label)}</span></button></li>`;
        }
        list.innerHTML = html || '<li class="empty">No event matches.</li>'; count.textContent = `${rows.length} of ${th.timeline.length} events`;
      }
      const showPin = () => { pin.innerHTML = th.state.event ? eventDetail(th.state.event) : ''; };
      ps.on(body.querySelector('#ev-q'), 'input', debounce(th, e => { f.q = e.target.value; draw(); }, 120));
      ps.on(body.querySelector('#ev-day'), 'change', e => { f.day = e.target.value; draw(); });
      ps.on(body.querySelector('#ev-timed'), 'change', e => { f.timed = e.target.checked; draw(); });
      for (const b of body.querySelectorAll('.seg button')) ps.on(b, 'click', () => { const t = b.dataset.tier; if (f.tiers.has(t)) f.tiers.delete(t); else f.tiers.add(t); b.setAttribute('aria-pressed', String(f.tiers.has(t))); draw(); });
      ps.on(list, 'click', ev => {
        const b = ev.target.closest('.item'); if (!b) return; const e = th.timeline.find(x => x.id === b.dataset.id); if (!e) return;
        if (e.t != null && !inRange(e)) { th.state.event = e; th.announce(`${fmtDate(e.t)} is outside the scrubber range; the details are shown.`); }
        else th.jumpEvent(e);
        list.querySelectorAll('[aria-current]').forEach(n => n.removeAttribute('aria-current')); b.setAttribute('aria-current', 'true'); showPin();
      });
      draw(); showPin(); th.bus.on('event', showPin, ps);
    });
  },
};

// ================= Views (camera bookmarks)
const VIEWS_KEY = 'bt.savedViews';
const readSaved = () => { try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]'); } catch { return []; } };
const writeSaved = v => { try { localStorage.setItem(VIEWS_KEY, JSON.stringify(v)); return true; } catch { return false; } };
PANELS.views = {
  title: 'Views',
  render(body, th) {
    own('views', th, ps => {
      const B = th.bookmarks; let tab = 'tour', side = 'all', q = '', shown = 60;
      body.innerHTML = `<p class="mini" style="margin-bottom:10px">Places from the site's Virtual Walkthrough and Monuments sections, used here only as places to fly to. Nothing in them is changed.</p>
        <div class="seg" role="tablist" aria-label="Kinds of view" id="vw-tabs" style="margin-top:0"><button role="tab" data-tab="tour" aria-selected="true" aria-pressed="true">Tour stops (${B.tour.length})</button><button role="tab" data-tab="mon" aria-selected="false" aria-pressed="false">Monuments (${B.monuments.length})</button><button role="tab" data-tab="unit" aria-selected="false" aria-pressed="false">Units</button><button role="tab" data-tab="saved" aria-selected="false" aria-pressed="false">Saved</button></div>
        <div id="vw-tools"></div><ul class="list" id="vw-list"></ul>`;
      const tools = body.querySelector('#vw-tools'), list = body.querySelector('#vw-list');
      mountLayersBlock(body, th, ps); mountExtToggles(body, th, ps);       // the structure switches, then the switches of the added layers (none: nothing is drawn)
      const monIn = m => { const [x, z] = th.geo.xz(m.lng, m.lat); return th.geo.inside(x, z, 0); };
      const sideName = s => s;
      function draw() {
        let html = '';
        if (tab === 'tour') {
          tools.innerHTML = `<div class="actions" style="margin:8px 0"><button type="button" class="btn-s" id="vw-whole">${ic('focus')}Whole field</button></div>`;
          html = B.tour.map(s => { const [x, z] = th.geo.xz(s.lng, s.lat), ok = th.geo.inside(x, z, 0); return `<li><button type="button" class="item" data-kind="tour" data-id="${s.id}" ${ok ? '' : 'disabled'}><span class="glyph">${ic('pin')}</span><span class="when">${esc(s.label)} · ${esc(s.day)}</span><span class="what">${esc(s.name)}${ok ? '' : ' · outside the loaded ground'}</span></button></li>`; }).join('');
        } else if (tab === 'mon') {
          tools.innerHTML = `<input class="field" type="search" placeholder="Search ${B.monuments.length} monuments" aria-label="Search monuments" value="${esc(q)}" id="vw-q" data-autofocus style="margin-top:8px"><div class="seg" id="vw-side">${['all', 'Union', 'Confederate', 'Other'].map(s => `<button type="button" data-side="${s}" aria-pressed="${side === s}">${s === 'all' ? 'All' : s}</button>`).join('')}</div>`;
          const ql = q.toLowerCase(); const rows = B.monuments.filter(m => (side === 'all' || m.side === side) && (!ql || m.name.toLowerCase().includes(ql) || (m.group || '').toLowerCase().includes(ql)));
          html = rows.slice(0, shown).map(m => { const ok = monIn(m); return `<li><button type="button" class="item" data-kind="mon" data-id="${m.no}" ${ok ? '' : 'disabled'}><span class="glyph">${ic('pin')}</span><span class="when">${esc(m.side)} · ${esc(m.mn || '')}</span><span class="what">${esc(m.name)}${ok ? '' : ' · outside the loaded ground'}</span></button></li>`; }).join('');
          if (rows.length > shown) html += `<li><button type="button" class="btn-s" id="vw-more" style="margin:12px 0">Show more (${rows.length - shown} left)</button></li>`;
          if (!rows.length) html = '<li class="empty">No monument matches.</li>';
        } else if (tab === 'unit') {
          tools.innerHTML = `<input class="field" type="search" placeholder="Search units on the field now" aria-label="Search units" value="${esc(q)}" id="vw-q" data-autofocus style="margin-top:8px"><p class="mini" style="margin:8px 0 0">${th.layer.meta.stub ? LABEL_PLACEHOLDER + ': placeholder units only. ' : 'Only units the record can place are listed. '}A unit appears here only while it is on the field at the current time.</p>`;
          const ql = q.toLowerCase(), st = th.stage; const rows = []; for (let i = 0, nU = th.layer.units.length; i < nU && rows.length < 80; i++) if (st.present[i] && (!ql || th.layer.units[i].name.toLowerCase().includes(ql) || th.layer.units[i].id.toLowerCase().includes(ql))) rows.push(i);
          html = rows.map(i => { const u = th.layer.units[i]; return `<li><button type="button" class="item" data-kind="unit" data-id="${i}"><span class="glyph">${glyphSVG(u.tier, 14)}</span><span class="when">${esc(u.short)} · ${u.side === 'union' ? 'Union' : 'Confederate'} · ${fmtN(strengthDrawn(u))} figures</span><span class="what">${esc(u.name)}</span></button></li>`; }).join('') || '<li class="empty">No unit is on the field at this time.</li>';
        } else {
          const saved = readSaved();
          tools.innerHTML = `<div class="actions" style="margin:8px 0"><button type="button" class="btn-s" id="vw-save" data-autofocus>${ic('pin')}Save this view</button></div><p class="mini">Saved views stay in this browser only.</p>`;
          html = saved.map((v, i) => `<li style="display:flex;align-items:center"><button type="button" class="item" data-kind="saved" data-id="${i}" style="flex:1"><span class="glyph">${ic('pin')}</span><span class="when">${esc(v.when)}</span><span class="what">${esc(v.name)}</span></button><button type="button" class="icon-btn" data-del="${i}" aria-label="Remove ${esc(v.name)}">${ic('close')}</button></li>`).join('') || '<li class="empty">No saved views yet.</li>';
        }
        list.innerHTML = html;
        body.querySelectorAll('#vw-tabs [role=tab]').forEach(b => { const on = b.dataset.tab === tab; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-pressed', String(on)); });
        const qin = body.querySelector('#vw-q'); if (qin) ps.on(qin, 'input', debounce(th, e => { q = e.target.value; shown = 60; keepFocus(); }, 120));
        body.querySelectorAll('#vw-side button').forEach(b => ps.on(b, 'click', () => { side = b.dataset.side; shown = 60; keepFocus(); }));
        const w = body.querySelector('#vw-whole'); if (w) ps.on(w, 'click', () => th.setView('overview'));
        const sv = body.querySelector('#vw-save'); if (sv) ps.on(sv, 'click', () => { const c = th.cam, all = readSaved(); all.push({ name: `View ${all.length + 1}`, when: `${fmtDate(th.state.t)} ${fmtTime(th.state.t)}`, x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, fov: c.fov * 180 / Math.PI }); writeSaved(all) ? th.announce('View saved.') : th.announce('This browser would not let the view be saved.'); draw(); });
        const mo = body.querySelector('#vw-more'); if (mo) ps.on(mo, 'click', () => { shown += 120; draw(); });
      }
      function keepFocus() { const had = document.activeElement?.id; draw(); if (had) body.querySelector('#' + had)?.focus({ preventScroll: true }); }
      ps.on(body.querySelector('#vw-tabs'), 'click', e => { const b = e.target.closest('[role=tab]'); if (b) { tab = b.dataset.tab; q = ''; draw(); } });
      ps.on(list, 'click', e => {
        const del = e.target.closest('[data-del]'); if (del) { const all = readSaved(); all.splice(+del.dataset.del, 1); writeSaved(all); draw(); return; }
        const b = e.target.closest('.item'); if (!b) return; const k = b.dataset.kind, id = b.dataset.id;
        if (k === 'tour') { const s = B.tour.find(x => x.id === +id); th.flyToLngLat(s.lng, s.lat, { view: s.view, height: 30 }); th.announce(`Flying to ${s.label}, ${s.name}.`); }
        else if (k === 'mon') { const m = B.monuments.find(x => x.no === +id); th.flyToLngLat(m.lng, m.lat, { dist: 90, height: 30 }); th.announce(`Flying to ${m.name}.`); }
        else if (k === 'unit') { th.select(+id); th.flyToUnit(+id); }
        else if (k === 'saved') { const v = readSaved()[+id]; if (v) th.controls.flyTo(v); }
      });
      draw();
    });
  },
};

// ================= Sources (conflict scenarios)
PANELS.scenario = {
  title: 'Where sources disagree',
  render(body, th) {
    own('scenario', th, ps => {
      const sc = th.state.scenario; let q = ''; const C = th.conflicts, hasDef = withDefault(C).length > 0;
      const linked = new Set([...(th.layer.meta.linkedConflicts || Object.keys(STUB_LINKS)), 'CF-WIND-SPEED', 'CF-JUL4-RAIN-TIMING', 'CF-JUL2-SKY', 'CF-JUL2-CLOUD-2PM']);
      body.innerHTML = `<p class="mini" style="margin-bottom:12px">${hasDef
        ? `Each entry is a place where the sources give different values. Every entry opens on a <b style="color:var(--text)">default chosen under delegated authority, reversible by the owner</b>, shown with its tier. Every other value, including the plan's own recommended value, stays selectable. Pick any value to see the theatre follow it where it can; entries marked "Used in this preview" change what you see, the rest are carried and listed.`
        : `Each entry is a place where the sources give different values. The delegated defaults were not read, so the default is the plan's recommended value, <b style="color:var(--text)">pending the owner's decision</b>.`}</p>
        <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap"><span class="pill" id="sc-label"></span><span style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn-s" id="sc-reset">${hasDef ? 'Back to the delegated defaults' : 'Reset'}</button>${hasDef ? `<button type="button" class="btn-s" id="sc-pdf">Switch to the PDF's recommended values</button>` : ''}</span></div>
        <input class="field" type="search" placeholder="Search ${C.length} conflicts" aria-label="Search conflicts" id="sc-q" data-autofocus><p class="mini" id="sc-count" style="margin-top:6px" aria-live="polite"></p><div id="sc-list"></div>`;
      const list = body.querySelector('#sc-list'), label = body.querySelector('#sc-label');
      const paintLabel = () => { label.textContent = scenarioLabel(sc, C); label.dataset.kind = hasDef ? scenarioKind(sc, C).kind : 'pdf'; body.querySelector('#sc-reset').disabled = scenarioIsDefault(sc, C); const bp = body.querySelector('#sc-pdf'); if (bp) bp.disabled = scenarioKind(sc, C).kind === 'pdf'; };
      const status = (c, cur) => {
        if (!c.delegated) return '';
        const d = c.delegated, onDef = cur === DELEGATED_KEY, onPdf = cur === PDF_KEY;
        return `<p class="mini deleg" data-on="${onDef}" style="margin-top:8px;display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap">${pill(d.tier)}<span>${onDef ? `${esc(DELEGATED_NOTE)}.` : onPdf ? 'Showing the PDF\'s recommended value.' : 'Showing a value you picked.'} ${onDef ? '' : `Delegated default: ${esc(d.label)}.`}</span></p>
          ${onDef ? '' : '<button type="button" class="btn-s" data-act="deleg" style="margin-top:6px;min-height:30px">Use the delegated default</button> '}${onPdf ? '' : '<button type="button" class="btn-s" data-act="pdf" style="margin-top:6px;min-height:30px">Use the PDF\'s recommended value</button>'}
          <details style="margin-top:6px"><summary class="mini">Why this default</summary><p class="mini" style="margin-top:4px">${esc(d.rationale)} The plan recommends: ${esc(d.pdf)}. Tier: ${esc(d.tier)}${d.basis ? ' · basis: ' + esc(d.basis) : ''}.</p></details>`;
      };
      function draw() {
        const ql = q.toLowerCase(), rows = C.filter(c => !ql || c.id.toLowerCase().includes(ql) || c.topic.toLowerCase().includes(ql));
        list.innerHTML = rows.map(c => { const cur = currentKey(sc, c), base = c.delegated ? DELEGATED_KEY : PDF_KEY, p = c.printed;
          return `<section class="conflict" data-id="${esc(c.id)}" data-changed="${cur !== base}" data-current="${esc(cur)}"><h3><span class="id">${esc(c.id)}</span>${esc(c.topic)}</h3>
            <p class="printed">${p.values != null ? `<b>Values printed:</b> ${esc(p.values)}<br><b>Plan recommends:</b> ${esc(p.recommended)}${p.others ? `<br><b>Others:</b> ${esc(p.others)}` : ''}` : `<b>As printed:</b> ${esc(p.whole)}`}</p>
            <select aria-label="Value for ${esc(c.id)} ${esc(c.topic)}" data-id="${esc(c.id)}">${c.options.map(o => `<option value="${esc(o.key)}" ${o.key === cur ? 'selected' : ''}>${esc(optionLabel(c, o))}</option>`).join('')}</select>
            <div class="deleg-box">${status(c, cur)}</div>
            ${linked.has(c.id) ? '<p class="mini" style="margin-top:6px;color:var(--gold-2)">Used in this preview: the theatre follows this choice.</p>' : ''}</section>`; }).join('') || '<p class="empty">No conflict matches.</p>';
        body.querySelector('#sc-count').textContent = `${rows.length} of ${C.length} conflicts`;
      }
      const choose = (id, key) => { const c = C.find(x => x.id === id); if (!c) return; setChoice(sc, C, c, key); const sec = list.querySelector(`.conflict[data-id="${CSS.escape(id)}"]`); if (sec) { const cur = currentKey(sc, c); sec.dataset.changed = String(cur !== (c.delegated ? DELEGATED_KEY : PDF_KEY)); sec.dataset.current = cur; sec.querySelector('select').value = cur; sec.querySelector('.deleg-box').innerHTML = status(c, cur); } paintLabel(); th.applyScenario(true); };
      ps.on(body.querySelector('#sc-q'), 'input', debounce(th, e => { q = e.target.value; draw(); }, 120));
      ps.on(list, 'change', e => { const s = e.target.closest('select'); if (!s) return; choose(s.dataset.id, s.value); });
      ps.on(list, 'click', e => { const b = e.target.closest('button[data-act]'); if (!b) return; choose(b.closest('.conflict').dataset.id, b.dataset.act === 'pdf' ? PDF_KEY : DELEGATED_KEY); });
      ps.on(body.querySelector('#sc-reset'), 'click', () => { if (hasDef) resetToDelegated(sc, C); else { sc.choices = {}; } paintLabel(); draw(); th.applyScenario(true); });
      const bp = body.querySelector('#sc-pdf'); if (bp) ps.on(bp, 'click', () => { switchToPdf(sc, C); paintLabel(); draw(); th.applyScenario(true); });
      paintLabel(); draw(); mountStructScenarios(body, th, ps);
    });
  },
};

// ================= About
PANELS.info = {
  title: 'What you are seeing',
  render(body, th) {
    own('info', th, ps => {
      const hd = th.stage.header();
      body.innerHTML = `<div class="prose">
        <p>A model of the ground around Gettysburg, Pennsylvania. Figures stand for soldiers, horses and guns. Fly anywhere over it and move through time from 26 June to 14 July 1863, with an epilogue chapter for 19 November 1863.</p>
        <p class="ph"><b>Right now:</b> <span id="in-now"></span></p>
        ${th.layer.meta.stub ? `<h3>What is a stand-in</h3>
        <p>${LABEL_PLACEHOLDER}: every unit, route, arrival time and activity in this preview. They show how the theatre behaves: a unit never appears before its arrival window opens, arrivals are marches, and works are built in a window. They are not where any real regiment stood.</p>`
        : `<h3>What is placed, and what is an open gap</h3>
        <p>The units, their arrival windows and the strengths come from the plan's order of battle and arrival ledger. A unit is drawn only where the ledger, or a statement of an Official Records report or of a state regimental volume that was re-read against its source (the position ledgers), names a road of approach for it or for a formation above it and, after it arrives, a dated place; for a unit placed by an Official Records report or a state regimental volume, the card lists the report or volume, the printed page, the quoted words and the checks the claim passed, and lists the reports that disagree without choosing between them; the rest are listed on their cards as open gaps and are not drawn, because nothing in the record puts them anywhere; a regiment that the record places away from the field (the 84th Pennsylvania, with the supply train) is not drawn and its strength is not counted, and its card says so. A unit enters the loaded ground where its road does, at its ledger gate, and marches in; the ledger time of its first place can refer to a place farther along the road than the edge of the loaded ground, and then it arrives later at drill speed: the card says so and the gate is not moved. Strengths below the printed corps and brigade figures are procedural shares, and formations and the spot inside a named place are plausible-procedural: all are marked.</p>
        ${(() => { const m = th.layer.units.filter(u => u.drawn && u.approach && u.approach.modelled).length; return m ? `<p><b>Modelled approaches.</b> ${m} units are drawn by a road of approach that the record does not print for them or for any formation above them. For each, the road is the one that every documented sibling formation of the same corps names, and no report on the unit’s line of command names another. Their cards are marked “Modelled approach”, say which siblings the road is taken from, and link the register entry; the unit may in fact have come by another road. Their position on each day is the troop-map position, as for any other unit.</p>` : ''; })()}`}
        <h3>What comes from records</h3>
        <dl><dt>${ic('sun')} The sky</dt><dd>The sun and moon are computed for the real place and minute, in local mean time (no standard time existed in 1863). Night is dimmed but never black.</dd>
        <dt>${ic('cloud')} Conditions</dt><dd>Weather and temperature come from the weather record loaded with the page. Where it has nothing for a date, it says so.</dd>
        <dt>${ic('events')} The timeline</dt><dd>${th.timeline.length} rows, each marked with how well it is supported. A row with no clock time is shown as "time not recorded" and is not placed on the minute scale.</dd>
        <dt>${ic('pin')} Places to fly to</dt><dd>${th.bookmarks.tour.length} tour stops and ${th.bookmarks.monuments.length} monuments from the site's Walkthrough and Monuments sections. They are used only as camera positions.</dd></dl>
        <h3>The ground</h3><p>${esc(GROUND_NOTE)}</p>
        ${th.structs ? `<h3>Structures</h3><p>Fences, walls, buildings, roads and the railway are drawn from the 1863 base-map layers, each with its own error and tier (click one for its card; Views has a switch for every class and lists what is not drawn). They are a reconstruction. Where only a point is known the place is marked with a pole, never a building; heights, roofs, colours and fence styles are generic and marked so; a change the record dates only to a day is shown half and half for that day. Works and pre-existing walls have no mapped line and stay rings at the place named.</p>` : ''}
        <h3>How well the record supports a mark</h3>
        <dl>${TIERS.map(t => `<dt>${glyphSVG(t, 16)} ${esc(TIER_STYLE[t].label)}</dt><dd>${{ documented: 'A source that is not just a lead supports exactly this.', inferred: 'Reasoned from sources; not stated outright.', 'plausible-procedural': 'Filled in where the record is silent, and marked so.', 'open gap': 'No source found. Shown as a gap, never hidden.' }[t]}</dd>`).join('')}</dl>
        <p>Turn on <b>Evidence</b> to outline every unit by tier, then click a mark for its sources and register entry.</p>
        <h3>Where sources disagree</h3><p>Open <b>Sources</b> to see every conflicting value. Each entry opens on a default chosen under delegated authority, reversible by the owner, with its tier; the plan's recommended value and every other value stay selectable, and one button switches every entry to the plan's value.</p>
        <h3>Keys</h3>
        <table class="table keys"><tr><td><span class="kbd">W</span> <span class="kbd">A</span> <span class="kbd">S</span> <span class="kbd">D</span></td><td>fly</td></tr><tr><td><span class="kbd">Q</span> <span class="kbd">E</span></td><td>down, up</td></tr><tr><td><span class="kbd">←</span><span class="kbd">→</span><span class="kbd">↑</span><span class="kbd">↓</span></td><td>look (or drag)</td></tr><tr><td><span class="kbd">Shift</span></td><td>faster</td></tr><tr><td>Wheel</td><td>move forward or back</td></tr><tr><td><span class="kbd">Space</span></td><td>play or pause</td></tr><tr><td><span class="kbd">,</span> <span class="kbd">.</span></td><td>10 minutes back, forward (with Shift, one hour)</td></tr><tr><td><span class="kbd">[</span> <span class="kbd">]</span></td><td>previous, next event</td></tr><tr><td><span class="kbd">-</span> <span class="kbd">+</span></td><td>speed ${SPEEDS[0]}× to ${SPEEDS[SPEEDS.length - 1]}×</td></tr><tr><td><span class="kbd">O</span></td><td>evidence marks</td></tr><tr><td><span class="kbd">Home</span></td><td>whole field</td></tr><tr><td><span class="kbd">Esc</span></td><td>close a panel or clear the selection</td></tr></table>
        <h3>Data in this view</h3>
        <table class="table"><tr><th>Source of units</th><td>${esc(th.layer.meta.label)} (history layer contract ${esc(th.layer.meta.contract)})</td></tr><tr><th>Events</th><td>${fmtN(hd.events)} accepted, <span id="in-rej">${hd.rejected}</span> refused by the arrival rule</td></tr><tr><th>Seed · code</th><td>${hd.seed} · ${esc(hd.code)}</td></tr><tr><th>Input hash</th><td><code>${esc(hd.inputHash)}</code></td></tr><tr><th>Sources</th><td id="in-scn">${esc(scenarioLabel(th.state.scenario, th.conflicts))}</td></tr><tr><th>Renderer</th><td>${esc(th.host.api)}${th.host.info.vendor ? ' · ' + esc(th.host.info.vendor) : ''}<br><span class="mini">${esc(API_NOTE)}</span></td></tr></table>
      </div>`;
      const now = body.querySelector('#in-now'); const paint = () => { const k = th.stats; if (k) now.textContent = `${fmtDate(th.state.t)} ${fmtTime(th.state.t)}: ${k.soldiers ? (th.layer.meta.stub ? `${fmtN(k.soldiers)} soldiers, ${k.guns} guns and ${k.units} units are on the field in this model. All are ${LABEL_PLACEHOLDER}s.` : `${fmtN(k.soldiers)} figures in ${k.units} placed units are on the field in this model.`) : (th.layer.meta.stub ? 'no unit is on the field in this model at this time.' : 'no unit the record can place is on the field at this time.')}`; };
      paint(); let at = 0; th.bus.on('frame', () => { const n = performance.now(); if (n - at > 500) { at = n; paint(); } }, ps);
      th.bus.on('scenario', () => { const h = th.stage.header(); body.querySelector('#in-rej').textContent = h.rejected; body.querySelector('#in-scn').textContent = scenarioLabel(th.state.scenario, th.conflicts); }, ps);
    });
  },
};

// ================= Settings
PANELS.settings = {
  title: 'Settings',
  render(body, th) {
    own('settings', th, ps => {
      const S = th.state.settings;
      const rng = (id, lab, min, max, step, val, fmt) => `<div class="set"><label for="${id}">${lab} <output id="${id}-o">${fmt(val)}</output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
      body.innerHTML = `<h3 style="margin-top:0">Light</h3>
        ${rng('st-floor', 'Night floor (never black)', 0.15, 0.6, 0.01, S.nightFloor, v => Math.round(v * 100) + '%')}
        <p class="mini">The darkest the picture is allowed to get. Lower is darker; the sky is always dimmed at night, never blackened.</p>
        <h3>Picture</h3>
        ${rng('st-scale', 'Resolution', 0.5, 1, 0.05, S.renderScale, v => Math.round(v * 100) + '%')}
        ${rng('st-near', 'Close-up detail distance', 20, 90, 5, S.nearR, v => v + ' m')}
        ${rng('st-mid', 'Mid detail distance', 120, 500, 20, S.midR, v => v + ' m')}
        <h3>Marks</h3>
        <label class="check"><input type="checkbox" id="st-works" ${S.works ? 'checked' : ''}> Show works (fences, earthworks)</label>
        <label class="check"><input type="checkbox" id="st-motion" ${th.reduceMotion ? 'checked' : ''}> Reduce motion (no flights, no rain streaks)</label>
        <p class="mini">Reduced motion follows your system setting until you change it here.</p>`;
      const bind = (id, fn, fmt) => { const el = body.querySelector('#' + id); ps.on(el, 'input', () => { const v = +el.value; body.querySelector('#' + id + '-o').textContent = fmt(v); fn(v); }); };
      bind('st-floor', v => { S.nightFloor = v; th.lastLightKey = ''; }, v => Math.round(v * 100) + '%');
      bind('st-scale', v => { S.renderScale = v; th.sizeCanvas(true); }, v => Math.round(v * 100) + '%');
      bind('st-near', v => { S.nearR = v; th.host.setLod(S.nearR, S.midR); }, v => v + ' m');
      bind('st-mid', v => { S.midR = v; th.host.setLod(S.nearR, S.midR); }, v => v + ' m');
      ps.on(body.querySelector('#st-works'), 'change', e => { S.works = e.target.checked; });
      ps.on(body.querySelector('#st-motion'), 'change', e => { S.reduceMotion = e.target.checked; });
      mountSoundBlock(body, th, ps);
    });
  },
};

PANELS.sound = soundPanel;      // also drawn at the end of Settings; opened alone with th.openPanel('sound') or a toolbar button

// panels are drawn on demand by ui/chrome.mjs; nothing needs to exist before one is opened
export function mountPanels(th) { th.PANELS = PANELS; }
