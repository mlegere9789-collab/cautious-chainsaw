// ui/dom.mjs - a tiny element builder (no framework): h('div', { class: 'row', onclick: fn, 'aria-label': 'x' }, child, 'text', [more children]).
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;                       // only ever fed with strings built in this file, never with data
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  const add = (k) => { if (k === null || k === undefined || k === false) return; if (Array.isArray(k)) k.forEach(add); else el.append(k.nodeType ? k : document.createTextNode(String(k))); };
  kids.forEach(add);
  return el;
}
export const svgIcon = (path, vb = '0 0 24 24') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', vb); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', path); s.appendChild(p); return s; };
export const ICON = {
  play: 'M8 5v14l11-7z', pause: 'M6 5h4v14H6zM14 5h4v14h-4z', step: 'M7 6l8 6-8 6V6zm9 0h2v12h-2z', stepBack: 'M17 6l-8 6 8 6V6zM6 6h2v12H6z', start: 'M6 6h2v12H6zM20 6v12L9.5 12z',
};
export const evBadge = (ev) => h('span', { class: 'ev ev-' + String(ev).split(/[ (]/)[0], title: 'Evidence label: ' + ev }, String(ev).split(/[ (]/)[0]);
export const fmt = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : 'n/a');
