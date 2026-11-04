// Renders docs/guide/content.json (+ docs/guide/shots/shots.json) to the HTML that Chrome prints: docs/guide/src/guide.html.
// Pure function of its inputs: the same content and shots always give the same bytes.

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ICONS = {
  play: '<svg class="ico" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1.2v7.6L8.6 5z" fill="currentColor"/></svg>',
  prev: '<svg class="ico" viewBox="0 0 10 10" aria-hidden="true"><path d="M8 1.2v7.6L1.4 5z" fill="currentColor"/></svg>',
  next: '<svg class="ico" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1.2v7.6L8.6 5z" fill="currentColor"/></svg>',
  back12: '<svg class="ico" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.6 1.4h1.3v7.2H1.6zM8.8 1.4v7.2L3.6 5z" fill="currentColor"/></svg>',
  fwd12: '<svg class="ico" viewBox="0 0 10 10" aria-hidden="true"><path d="M7.1 1.4h1.3v7.2H7.1zM1.2 1.4v7.2L6.4 5z" fill="currentColor"/></svg>',
  Left: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5.2 1.2L1.4 5l3.8 3.8M1.8 5h7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  Right: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M4.8 1.2L8.6 5 4.8 8.8M8.2 5h-7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  Up: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.2 4.8L5 1.4l3.8 3.4M5 1.8v7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  Down: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.2 5.2L5 8.6l3.8-3.4M5 8.2v-7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
};
const KEY_LABEL = { Plus: '+', Minus: '-', Equals: '=' };
const ARROW_NAME = { Left: 'Left arrow', Right: 'Right arrow', Up: 'Up arrow', Down: 'Down arrow' };

/** one keyboard shortcut spec such as "Shift+Right" or "Plus or Equals" -> chips */
export function keyChips(spec) {
  if (spec.trim() === '+') return '<kbd>+</kbd>';
  return spec.split(/\s*\+\s*/).map((t, i, a) => {
    const chips = t.split(/\s+or\s+/).map((k) => (ICONS[k] && ARROW_NAME[k] ? `<kbd aria-label="${ARROW_NAME[k]}">${ICONS[k]}</kbd>` : `<kbd>${esc(KEY_LABEL[k] || k)}</kbd>`));
    return chips.join(' <span class="hint">or</span> ') + (i < a.length - 1 ? ' <span class="hint">+</span> ' : '');
  }).join('');
}

/** inline markup: **ui label**, [[Key]], _emphasis_, `code`, [text](url), {icon}, {release}, {train}, {updated} */
export function inline(text, ctx = {}) {
  const hold = [];
  const keep = (html) => { hold.push(html); return `\u0001${hold.length - 1}\u0002`; };
  let s = String(text);
  s = s.replace(/\[\[(.+?)\]\]/g, (_, k) => keep(keyChips(k)));
  s = s.replace(/`([^`]+)`/g, (_, c) => keep(`<code>${esc(c)}</code>`));
  s = s.replace(/\[([^\]]+)\]\((https?:[^)]+|mailto:[^)]+)\)/g, (_, t, u) => keep(`<a href="${esc(u)}">${esc(t)}</a>`));
  s = s.replace(/\{(play|prev|next|back12|fwd12)\}/g, (_, k) => keep(ICONS[k]));
  s = s.replace(/\{release\}/g, () => keep(esc((ctx.release && ctx.release.label) || '')));
  s = s.replace(/\{train\}/g, () => keep(esc((ctx.release && ctx.release.train) || '')));
  s = s.replace(/\{updated\}/g, () => keep(esc((ctx.release && ctx.release.updated) || '')));
  s = esc(s);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="ui">$1</strong>');
  s = s.replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  s = s.replace(/\u0001(\d+)\u0002/g, (_, i) => hold[Number(i)]);
  return s;
}

/** the text a reader gets from a string of inline markup: what a PDF text extraction should contain */
export function plain(text) {
  return String(text)
    .replace(/\[\[(Left|Right|Up|Down)\]\]/g, '')
    .replace(/\[\[(.+?)\]\]/g, (_, k) => k.split(/\s*\+\s*/).map((x) => x.split(/\s+or\s+/).map((y) => KEY_LABEL[y] || y).join(' or ')).join(' + '))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:[^)]+|mailto:[^)]+)\)/g, '$1')
    .replace(/\{[a-z0-9]+\}/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------------------------------------------ annotated pictures
const r1 = (v) => Math.round(v * 10) / 10;

/** the SVG overlay: outlines around the measured boxes and numbered badges, sized so a badge prints 0.19 in across */
export function overlay(shot, callouts, displayIn) {
  if (!callouts || !callouts.length) return '';
  const W = shot.cssW, H = shot.cssH, k = W / displayIn;
  const r = 0.095 * k, sw = 0.019 * k, pad = 0.025 * k;
  const out = [];
  const badges = [];
  for (const c of callouts) {
    const b = shot.boxes[c.el];
    if (!b) throw new Error(`callout ${c.n}: element "${c.el}" has no box in shot ${shot.id}`);
    const x = b.x - pad, y = b.y - pad, w = b.w + 2 * pad, h = b.h + 2 * pad;
    const rx = Math.min(0.05 * k, h / 3);
    if (!c.noBox) {
      out.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(rx)}" fill="none" stroke="#0a0a14" stroke-opacity="0.8" stroke-width="${r1(sw * 2.6)}"/>`);
      out.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(rx)}" fill="none" stroke="#e2bb62" stroke-width="${r1(sw)}"/>`);
    }
    const at = c.at || 'tl';
    const cxm = x + w / 2, cym = y + h / 2;
    let cx, cy;
    switch (at) {
      case 't': cx = cxm; cy = y - r * 1.05; break;
      case 'b': cx = cxm; cy = y + h + r * 1.05; break;
      case 'l': cx = x - r * 1.05; cy = cym; break;
      case 'r': cx = x + w + r * 1.05; cy = cym; break;
      case 'tr': cx = x + w + r * 0.2; cy = y - r * 0.2; break;
      case 'bl': cx = x - r * 0.2; cy = y + h + r * 0.2; break;
      case 'br': cx = x + w + r * 0.2; cy = y + h + r * 0.2; break;
      case 'c': cx = cxm; cy = cym; break;
      default: cx = x - r * 0.2; cy = y - r * 0.2; // tl
    }
    cx += (c.dx || 0) * k / 100; cy += (c.dy || 0) * k / 100;      // dx, dy in hundredths of an inch
    cx = Math.max(r + sw, Math.min(W - r - sw, cx)); cy = Math.max(r + sw, Math.min(H - r - sw, cy));
    if (c.lead) {
      // leader from the badge to the nearest point of the box
      const px = Math.max(x, Math.min(x + w, cx)), py = Math.max(y, Math.min(y + h, cy));
      badges.push(`<line x1="${r1(cx)}" y1="${r1(cy)}" x2="${r1(px)}" y2="${r1(py)}" stroke="#0a0a14" stroke-opacity="0.8" stroke-width="${r1(sw * 2.6)}"/><line x1="${r1(cx)}" y1="${r1(cy)}" x2="${r1(px)}" y2="${r1(py)}" stroke="#e2bb62" stroke-width="${r1(sw)}"/>`);
    }
    badges.push(`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="#c9a24b" stroke="#0a0a14" stroke-width="${r1(sw * 1.3)}"/><text x="${r1(cx)}" y="${r1(cy + r * 0.38)}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="${r1(r * 1.12)}" fill="#0a0a14">${esc(c.n)}</text>`);
  }
  return `<svg class="ov" viewBox="0 0 ${r1(W)} ${r1(H)}" preserveAspectRatio="none" aria-hidden="true" role="presentation">${out.join('')}${badges.join('')}</svg>`;
}

const keyedList = (callouts, ctx, cls = '') => callouts && callouts.length
  ? `<ol class="keyed ${cls}">${callouts.map((c) => `<li value="${esc(c.n)}"><span class="n">${esc(c.n)}</span><b>${inline(c.title, ctx)}</b><span class="t">${inline(c.text, ctx)}</span></li>`).join('')}</ol>` : '';

function pic(ctx, shotId, callouts, displayIn, alt) {
  const sh = ctx.shots[shotId];
  const def = ctx.content.shots[shotId];
  if (!sh) throw new Error(`shot "${shotId}" has no capture: run node tools/guide/shots.mjs`);
  const a = alt || (def && def.alt) || '';
  return `<div class="shot"><img src="../shots/${esc(sh.file)}" width="${sh.pxW}" height="${sh.pxH}" alt="${esc(a)}">${overlay({ ...sh, id: shotId }, callouts, displayIn)}</div>`;
}

let figNo = 0;
const figLabel = () => `<b class="fnum">Figure ${++figNo}.</b> `;
const figTitle = (t, ctx) => `<b class="rt"><span class="fnum">Figure ${++figNo}.</span> ${inline(t, ctx)}</b>`;

// ------------------------------------------------------------------------------------------------ blocks
function block(b, ctx) {
  const I = (t) => inline(t, ctx);
  switch (b.t) {
    case 'p': return `<p${b.cls ? ` class="${b.cls}"` : ''}>${I(b.text)}</p>`;
    case 'lead': return `<p class="lead">${I(b.text)}</p>`;
    case 'h2': return `<h2 id="${esc(b.id || ctx.slug(b.text))}">${I(b.text)}</h2>`;
    case 'h3': return `<h3>${I(b.text)}</h3>`;
    case 'steps': return `<ol class="steps">${b.items.map((x) => `<li>${I(x)}</li>`).join('')}</ol>`;
    case 'list': return `<ul class="list">${b.items.map((x) => `<li>${I(x)}</li>`).join('')}</ul>`;
    case 'callout': return `<aside class="box ${esc(b.kind || 'note')}"><div class="bt">${esc(b.title || ({ note: 'Note', tip: 'Tip', careful: 'Good to know' })[b.kind || 'note'])}</div>${(b.text instanceof Array ? b.text : [b.text]).map((t) => `<p>${I(t)}</p>`).join('')}</aside>`;
    case 'pagebreak': return '<div class="pb"></div>';
    case 'figure': {
      const w = { full: 6.8, w6: 6, w5: 5, w4: 4 }[b.layout || 'full'];
      const cls = `fig-${b.layout || 'full'}`;
      return `<div class="figunit"><figure class="${cls}">${pic(ctx, b.shot, b.callouts, w, b.alt)}<figcaption>${figLabel()}${I(b.caption || '')}</figcaption></figure>${b.nokey ? '' : keyedList(b.callouts, ctx, b.cols === 1 ? 'one' : '')}</div>`;
    }
    case 'side': {
      // picture at the left (b.w inches wide), numbered notes (and optional copy) at the right
      const w = b.w || 2.6;
      return `<div class="side" style="--w:${w}in"><figure>${pic(ctx, b.shot, b.callouts, w, b.alt)}<figcaption>${figLabel()}${I(b.caption || '')}</figcaption></figure><div class="copy">${(b.before || []).map((x) => block(x, ctx)).join('')}${keyedList(b.callouts, ctx)}${(b.after || []).map((x) => block(x, ctx)).join('')}</div></div>`;
    }
    case 'row': {
      const n = b.items.length; const w = b.w || (n === 3 ? 2.13 : 3.3);
      return `<div class="row${n}${b.w ? ' narrow' : ''}" style="${b.w ? `--rw:${w}in` : ''}">${b.items.map((it) => `<figure>${pic(ctx, it.shot, it.callouts, w, it.alt)}<figcaption>${figTitle(it.title, ctx)}<span>${I(it.caption || '')}</span></figcaption></figure>`).join('')}</div>`;
    }
    case 'phones': {
      return `<div class="phones">${b.items.map((it) => `<figure>${pic(ctx, it.shot, it.callouts, 2.1, it.alt)}<figcaption>${figTitle(it.title, ctx)}<span>${I(it.caption || '')}</span></figcaption>${keyedList(it.callouts, ctx)}</figure>`).join('')}</div>`;
    }
    case 'keys': {
      const rows = b.groups.map((g) => `<tr class="grp"><td colspan="2">${esc(g.title)}</td></tr>${g.rows.map((r) => `<tr><td class="k">${keyChips(r[0])}</td><td>${I(r[1])}</td></tr>`).join('')}`).join('');
      return `<table class="keys"><caption>${esc(b.caption || 'Keyboard shortcuts')}</caption><thead><tr><th>Key</th><th>What it does</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    case 'table': {
      const head = b.head ? `<thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>` : '';
      return `<table class="${esc(b.cls || 'plain')}${(b.keep || (b.rows || []).length <= 6) ? ' keep' : ''}">${b.caption ? `<caption>${esc(b.caption)}</caption>` : ''}${head}<tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${I(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    case 'tools': {
      // numbered rows that match the badges on a toolbar picture
      return `<table class="tools"><caption>${esc(b.caption || 'The toolbar, left to right')}</caption><thead><tr><th></th><th>Button</th><th>Key</th><th>What it does</th></tr></thead><tbody>${b.rows.map((r) => `<tr><td class="n"><span>${esc(r.n)}</span></td><td class="nm">${I(r.name)}</td><td class="ky">${r.key ? keyChips(r.key) : '<span class="hint">none</span>'}</td><td>${I(r.text)}</td></tr>`).join('')}</tbody></table>`;
    }
    case 'swatches': {
      return `<table class="plain sw"><caption>${esc(b.caption)}</caption><thead><tr><th></th><th>${esc(b.head[0])}</th><th>${esc(b.head[1])}</th></tr></thead><tbody>${b.rows.map((r) => `<tr><td class="s"><i style="background:${esc(r[0])}"></i></td><td class="nm">${I(r[1])}</td><td>${I(r[2])}</td></tr>`).join('')}</tbody></table>`;
    }
    case 'menu': {
      return `<div class="menu-groups">${b.groups.map((g) => `<div><b>${esc(g.name)}</b><i>${esc(g.why)}</i>${g.items.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`).join('')}</div>`;
    }
    case 'cards': {
      const one = (c) => `<article class="pcard">${pic(ctx, c.shot, null, 3.3, c.alt)}<h4>${esc(c.title)}</h4><div class="tag">${esc(c.group)} <span>·</span> <a href="${esc(ctx.content.meta.siteUrl + c.path)}">${esc(c.path)}</a></div><p>${I(c.text)}</p></article>`;
      const rows = []; for (let i = 0; i < b.items.length; i += 2) rows.push(`<div class="cardrow">${b.items.slice(i, i + 2).map(one).join('')}</div>`);
      return `<div class="cards">${rows.join('')}</div>`;
    }
    default: throw new Error(`unknown block type "${b.t}"`);
  }
}

// ------------------------------------------------------------------------------------------------ document
export function renderGuide({ content, shots, tocPages = {}, stamp = '' }) {
  figNo = 0;
  const slugs = new Set();
  const slug = (t) => { let s = 'h-' + String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); let n = 1, o = s; while (slugs.has(s)) s = o + '-' + ++n; slugs.add(s); return s; };
  const ctx = { content, shots: shots.shots, release: content.release, slug };
  const I = (t) => inline(t, ctx);
  const m = content.meta;
  const cover = content.cover;
  const coverShot = shots.shots[cover.shot];

  const pageRules = content.chapters.map((c) => `@page ch${c.no} { @top-left { content: "Gettysburg Interactive Map"; font: 600 7pt/1 var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); vertical-align: bottom; padding-bottom: 0.2in; } @top-right { content: "${c.no}   ${c.title.replace(/"/g, '\\"')}"; font: 600 7pt/1 var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); vertical-align: bottom; padding-bottom: 0.2in; } @bottom-right { content: counter(page); font: 500 8pt/1 var(--sans); color: var(--ink-3); vertical-align: top; padding-top: 0.25in; } @bottom-left { content: "${content.release.label}"; font: 500 7pt/1 var(--sans); letter-spacing: 0.08em; color: var(--ink-3); vertical-align: top; padding-top: 0.25in; } }`).join('\n');
  const frontRule = `@page front { @bottom-left { content: "${content.release.label}"; } }`;

  const toc = content.chapters.map((c) => `<li><a href="#ch-${c.no}"><span class="num">${c.no}</span><span class="ttl">${esc(c.title)}</span><span class="sub">${esc(c.sub || '')}</span><span class="pg">${tocPages[`ch-${c.no}`] ?? ''}</span></a></li>`).join('');

  const end = content.end;
  const endHtml = end ? `<div class="endcard"><h2 id="h-end">${esc(end.title)}</h2>${end.paras.map((p) => `<p>${I(p)}</p>`).join('')}<p class="small">${I(end.credits)}</p></div>` : '';
  const chapters = content.chapters.map((c, i) => `<section class="chapter" id="ch-${c.no}" style="page: ch${c.no}">
<header><div class="no">Chapter ${c.no}</div><h1>${esc(c.title)}</h1><p class="lead">${I(c.lead)}</p></header>
${c.blocks.map((b) => block(b, ctx)).join('\n')}
${i === content.chapters.length - 1 ? endHtml : ''}
</section>`).join('\n');

  return `<!doctype html>
<html lang="${esc(m.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.subject)}">
<link rel="stylesheet" href="guide.css">
<style>
${frontRule}
${pageRules}
</style>
</head>
<body>
<section class="cover" id="cover" aria-label="Cover">
  <div class="art" role="img" aria-label="${esc(content.shots[cover.shot].alt)}" style="background-image:url('../shots/${esc(coverShot.file)}')"></div>
  <div class="band"></div>
  <div class="eyebrow"><span></span>${esc(cover.eyebrow)}</div>
  <div class="title-block"><div class="h1" style="font:600 58pt/60pt var(--serif);letter-spacing:-0.012em;color:#fbf6e6;margin:0 0 14pt">${esc(cover.title)}</div><p class="sub">${I(cover.subtitle)}</p></div>
  <div class="foot"><div><b>${esc(content.release.label)}</b></div><div class="r">${esc(m.site)}</div></div>
</section>
<section class="front" id="front">
  <h2 class="sec" id="contents">Contents</h2><div class="rule"></div>
  <ol class="toc">${toc}</ol>
  <div class="quick"><h3>${esc(content.intro.quickTitle)}</h3><ol>${content.intro.quick.map((q) => `<li>${I(q)}</li>`).join('')}</ol></div>
  <h2 id="before-you-begin" style="margin-top:0">${esc(content.intro.title)}</h2>
  <p>${I(content.intro.text)}</p>
</section>
${chapters}
${stamp}
</body>
</html>
`;
}
