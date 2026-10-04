// HTML shell, CSS and helpers shared by the trust pages. No dependencies; no external requests: the only referenced files are the
// site's own shared nav assets (/site-nav.css, /site-nav.js), the convention of every sub-page of the site.

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const num = (n) => Number(n).toLocaleString('en-US');

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };

/** data-source attribute value: pointers into files of this repository, space separated */
export const src = (...p) => ` data-source="${esc(p.join(' '))}"`;

export const PAGES = [
  { slug: 'about', nav: 'About', title: 'About' },
  { slug: 'sources', nav: 'Sources and Methods', title: 'Sources and Methods' },
  { slug: 'standard-of-care', nav: 'Standard of Care', title: 'Standard of Care' },
  { slug: 'corrections', nav: 'Corrections', title: 'Corrections' },
  { slug: 'faq', nav: 'FAQ', title: 'FAQ' },
  { slug: 'accessibility', nav: 'Accessibility Statement', title: 'Accessibility Statement' },
  { slug: 'changelog', nav: 'Changelog', title: 'Changelog' },
  { slug: 'contact', nav: 'Contact', title: 'Contact and Report a Problem' },
];

export const BRAND = 'Gettysburg Interactive Map';

// Palette: every pair used for text is listed in COLOR_PAIRS and checked at build time and in tests (WCAG 2.x contrast, 4.5:1).
export const COLORS = {
  bg: '#0a0a14', panel: '#12121e', panel2: '#181826', text: '#e6e6ee', muted: '#aab2c5', gold: '#e8d5a3', link: '#d9b865', line: '#2e2e44',
  ok: '#8fdcae', warn: '#f0c070', no: '#f4a6a6', ownerBg: '#3a2a00', ownerText: '#ffe2a0', printText: '#000000', printBg: '#ffffff',
};
export const COLOR_PAIRS = [
  ['text', 'bg'], ['text', 'panel'], ['muted', 'bg'], ['muted', 'panel'], ['gold', 'bg'], ['gold', 'panel'], ['link', 'bg'], ['link', 'panel'],
  ['ok', 'panel'], ['warn', 'panel'], ['no', 'panel'], ['ownerText', 'ownerBg'], ['text', 'panel2'], ['link', 'panel2'], ['printText', 'printBg'],
];
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const luminance = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
export const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export const CSS = `
:root{--bg:${COLORS.bg};--panel:${COLORS.panel};--panel2:${COLORS.panel2};--text:${COLORS.text};--muted:${COLORS.muted};--gold:${COLORS.gold};--link:${COLORS.link};--line:${COLORS.line};--ok:${COLORS.ok};--warn:${COLORS.warn};--no:${COLORS.no};--owner-bg:${COLORS.ownerBg};--owner-text:${COLORS.ownerText}}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-padding-top:72px}
body{margin:0;background:var(--bg);color:var(--text);font:17px/1.65 Georgia,'Times New Roman',serif}
.skip-link{position:absolute;left:8px;top:-60px;z-index:1000;background:var(--gold);color:#000;padding:12px 16px;min-height:44px;border-radius:6px;font:600 16px/1.4 system-ui,sans-serif}
.skip-link:focus{top:8px}
:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
main{display:block;max-width:760px;margin:0 auto;padding:28px 16px 56px;overflow-wrap:anywhere}
h1{color:var(--gold);font-size:2rem;line-height:1.2;margin:.2em 0 .4em}
h2{color:var(--gold);font-size:1.35rem;line-height:1.3;margin:2.2em 0 .6em;border-top:1px solid var(--line);padding-top:1em}
h3{color:var(--text);font-size:1.1rem;margin:1.6em 0 .4em}
p,li{max-width:68ch}
a{color:var(--link);text-decoration:underline;text-underline-offset:3px}
a:hover{color:#fff}
.lede{font-size:1.15rem;color:var(--text)}
.tp-meta{font:14px/1.5 system-ui,sans-serif;color:var(--muted)}
.candidate-banner{background:var(--panel);border:1px solid var(--warn);border-left-width:6px;border-radius:8px;padding:12px 16px;margin:0 0 24px;font:15px/1.5 system-ui,sans-serif;color:var(--text)}
.owner-input{background:var(--owner-bg);color:var(--owner-text);border:1px dashed var(--owner-text);border-radius:4px;padding:1px 6px;font:600 .92em/1.5 system-ui,sans-serif}
.tp-table{width:100%;border-collapse:collapse;margin:1em 0;font:15px/1.5 system-ui,sans-serif;background:var(--panel)}
.tp-table caption{text-align:left;color:var(--muted);padding:0 0 8px;font-size:14px}
.tp-table th,.tp-table td{border:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}
.tp-table th{background:var(--panel2);color:var(--gold)}
.tp-table td.n,.tp-table th.n{text-align:right;font-variant-numeric:tabular-nums}
.badge,.chip{display:inline-block;border:1px solid currentColor;border-radius:999px;padding:1px 10px;font:600 13px/1.6 system-ui,sans-serif;white-space:nowrap}
.chip.ok{color:var(--ok)}.chip.part{color:var(--warn)}.chip.no{color:var(--no)}
.badge{color:var(--gold)}
.cards{display:grid;gap:12px;padding:0;list-style:none;margin:1em 0}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.card h2{margin:.1em 0 .3em;padding:0;border:0;font-size:1.1rem;color:var(--text)}
.card p{margin:.4em 0}
.card.s-ok{border-left:6px solid var(--ok)}.card.s-part{border-left:6px solid var(--warn)}.card.s-no{border-left:6px solid var(--no)}
details{background:var(--panel);border:1px solid var(--line);border-radius:8px;margin:10px 0}
summary{cursor:pointer;padding:12px 16px;min-height:44px;font:600 16px/1.5 system-ui,sans-serif;color:var(--gold)}
details>div{padding:0 16px 12px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:8px 18px;border:1px solid var(--link);border-radius:8px;color:var(--link);text-decoration:none;font:600 16px/1.3 system-ui,sans-serif;background:var(--panel)}
.btn:hover{background:var(--panel2);color:#fff}
.toc{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none;margin:1em 0}
.toc a,.tap{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:6px 14px;border:1px solid var(--line);border-radius:8px;text-decoration:none;font:15px/1.3 system-ui,sans-serif;background:var(--panel)}
pre.template{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 16px;overflow:auto;font:14px/1.6 ui-monospace,Consolas,monospace;color:var(--text);white-space:pre-wrap}
.tp-provenance{font:14px/1.6 system-ui,sans-serif;color:var(--muted)}
.tp-provenance code,code{font:13px/1.5 ui-monospace,Consolas,monospace;color:var(--text);word-break:break-word}
.tp-footer{border-top:1px solid var(--line);margin-top:24px;padding:20px 16px 36px;font:14px/1.5 system-ui,sans-serif;color:var(--muted)}
.tp-footer nav{max-width:760px;margin:0 auto}
.tp-footer ul{display:flex;flex-wrap:wrap;gap:6px 6px;list-style:none;margin:0 0 12px;padding:0}
.tp-footer a{display:inline-flex;align-items:center;min-height:44px;min-width:44px;padding:4px 12px;color:var(--link)}
.tp-footer p{max-width:760px;margin:8px auto 0}
.tp-noscript ul{display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:0;padding:8px 16px}
.tp-noscript a{display:inline-flex;align-items:center;min-height:44px;min-width:44px;padding:4px 12px}
@media (max-width:640px){
 h1{font-size:1.6rem}
 .tp-table.stack thead{position:absolute;left:-9999px}
 .tp-table.stack tr{display:block;border:1px solid var(--line);margin:0 0 12px;border-radius:8px;overflow:hidden}
 .tp-table.stack td{display:block;border:0;border-bottom:1px solid var(--line)}
 .tp-table.stack td::before{content:attr(data-label);display:block;color:var(--gold);font-weight:600;font-size:13px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media print{
 @page{margin:18mm}
 html{font-size:11pt}
 body{background:${COLORS.printBg};color:${COLORS.printText};font-family:Georgia,serif}
 .skip-link,#gtbg-nav,#gtbg-nav-mount,.tp-noscript,.tp-footer ul,.toc,.btn,.candidate-banner a{display:none!important}
 main{max-width:none;padding:0}
 h1,h2,h3{color:#000;break-after:avoid}
 h2{border-top:1px solid #000}
 a{color:#000}
 a[href^="http"]::after,a[href^="mailto:"]::after{content:" (" attr(href) ")";font-size:.85em;word-break:break-all}
 .tp-table,.card,details,.candidate-banner{background:#fff;color:#000;border-color:#000}
 .tp-table th{background:#eee;color:#000}
 .tp-table tr,.card{break-inside:avoid}
 details>*{display:block}
 .chip,.badge{color:#000}
 .owner-input{background:#fff;color:#000;border:1px solid #000}
 .tp-footer{border-top:1px solid #000;color:#000}
 .tp-footer p{color:#000}
 .tp-provenance,.tp-meta{color:#000}
 pre.template{background:#fff;color:#000;border-color:#000}
}
`.trim();

/**
 * @param {object} p { slug, title, description, h1, body, jsonld?, provenance:[{path,note}], asOf, publish, linkStyle, canonicalStyle, siteUrl, owner:{unresolved:[]} }
 */
export function renderPage(p) {
  const href = (slug) => (p.linkStyle === 'clean' ? `/${slug}` : `${slug}.html`);
  const canon = `${p.siteUrl}/${p.canonicalStyle === 'html' ? p.slug + '.html' : p.slug}`;
  const fullTitle = `${p.title} | ${BRAND}`;
  const navLinks = PAGES.map((pg) => `<li><a href="${href(pg.slug)}"${pg.slug === p.slug ? ' aria-current="page"' : ''}>${esc(pg.nav)}</a></li>`).join('');
  const banner = p.publish ? '' : `<aside class="candidate-banner" role="note" data-candidate="true"><strong>Candidate draft.</strong> This page is not published and has not been reviewed by the owner. Text in a box such as <span class="owner-input">[OWNER TO PROVIDE: contact address]</span> or <span class="owner-input">[OWNER TO CONFIRM: a statement]</span> needs the owner before it can go live.</aside>`;
  const prov = p.provenance.map((x) => `<li><code>${esc(x.path)}</code>${x.sha ? ` (sha256 ${esc(x.sha)}&hellip;)` : ''}: ${esc(x.note)}</li>`).join('');
  const meta = `<p class="tp-meta">Last reviewed: <time datetime="${p.asOf}"${src('tools/copy/trust-config.json#asOf')}>${esc(longDate(p.asOf))}</time>.${p.publish ? '' : ' Status: candidate.'}</p>`;
  const ld = p.jsonld ? `<script type="application/ld+json">${JSON.stringify(p.jsonld)}</script>` : '';
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="${COLORS.bg}">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${esc(canon)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(p.description)}">
<link rel="stylesheet" href="/site-nav.css">
<link rel="stylesheet" href="${p.linkStyle === 'clean' ? '/trust.css' : 'trust.css'}">
${ld}
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
<div id="gtbg-nav-mount"></div>
<noscript><nav class="tp-noscript" aria-label="Trust pages without script"><ul>${navLinks}</ul></nav></noscript>
<main id="main" tabindex="-1">
${banner}
<h1>${esc(p.h1)}</h1>
${meta}
${p.body}
<section class="tp-provenance" aria-labelledby="prov-h">
<h2 id="prov-h">How this page was made</h2>
<p>Every figure and every statement about the site on this page is traced to a file of this project, listed here. Elements carry a <code>data-source</code> attribute naming the file (and the field) they came from.</p>
<ul>${prov}</ul>
</section>
</main>
<footer class="tp-footer">
<nav aria-label="Trust pages">
<ul>${navLinks}<li><a href="/privacy.html">Privacy</a></li><li><a href="/terms.html">Terms</a></li></ul>
</nav>
<p>${esc(BRAND)}. An interactive map of the Battle of Gettysburg, July 1&ndash;3, 1863.</p>
</footer>
<script src="/site-nav.js" data-current="trust"></script>
</body>
</html>
`;
}

/** responsive table: headers[], rows[][] (cells are HTML strings); `n` marks numeric columns */
export function table({ caption, captionSrc = null, headers, rows, numeric = [], stack = true, rowSources = [], keep = false }) {
  const th = headers.map((h, i) => `<th scope="col"${numeric.includes(i) ? ' class="n"' : ''}>${h}</th>`).join('');
  const body = rows.map((r, ri) => {
    const cells = r.map((c, i) => `<td data-label="${esc(headers[i].replace(/<[^>]+>/g, ''))}"${numeric.includes(i) ? ' class="n"' : ''}>${c}</td>`).join('');
    // the sources named inside a row's cells become the sources of the whole row, so a figure in any cell is traceable
    const own = [...cells.matchAll(/data-source="([^"]+)"/g)].flatMap((m) => m[1].split(' '));
    const all = [...new Set([...(rowSources[ri] || []), ...own])];
    return `<tr${all.length ? src(...all) : ''}>${cells}</tr>`;
  }).join('');
  const cap = captionSrc ? `<span${src(...captionSrc)}>${caption}</span>` : caption;
  return `<table class="tp-table${stack ? ' stack' : ''}${keep ? ' keep' : ''}"><caption>${cap}</caption><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}
