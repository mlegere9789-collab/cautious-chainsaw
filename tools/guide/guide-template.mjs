// HTML shell and CSS of the user guide. The web page (index.html) and the page the PDF is printed from (print.html) share one body
// and one stylesheet: print.html only drops the shared site menu and applies the light print theme from the first paint.
import { esc, longDate } from '../copy/trust/template.mjs';

export const LIGHT = {
  bg: '#ffffff', text: '#111111', muted: '#444444', gold: '#5a3d00', link: '#0b4a8f', line: '#8a8a8a', panel: '#f4f4f4', panel2: '#e9e9e9', sinceBg: '#fff3d6', sinceText: '#5a3d00', kbdBg: '#f1f1f1',
};
export const DARK = {
  bg: '#0a0a14', text: '#e6e6ee', muted: '#aab2c5', gold: '#e8d5a3', link: '#d9b865', line: '#2e2e44', panel: '#12121e', panel2: '#181826', sinceBg: '#3a2a00', sinceText: '#ffe2a0', kbdBg: '#181826',
};
export const GUIDE_PAIRS = [['text', 'bg'], ['muted', 'bg'], ['gold', 'bg'], ['link', 'bg'], ['text', 'panel'], ['link', 'panel'], ['text', 'panel2'], ['gold', 'panel2'], ['sinceText', 'sinceBg'], ['text', 'kbdBg'], ['muted', 'panel']];
const vars = (c) => Object.entries(c).map(([k, v]) => `--${k}:${v}`).join(';');

export function guideCss({ paper = 'letter' } = {}) {
  const size = paper === 'a4' ? 'A4' : 'Letter';
  return `
:root{${vars(DARK)}}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-padding-top:72px}
body{margin:0;background:var(--bg);color:var(--text);font:17px/1.65 Georgia,'Times New Roman',serif}
.skip-link{position:absolute;left:8px;top:-60px;z-index:1000;background:var(--gold);color:var(--bg);padding:12px 16px;min-height:44px;border-radius:6px;font:600 16px/1.4 system-ui,sans-serif}
.skip-link:focus{top:8px}
:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
main{display:block;max-width:820px;margin:0 auto;padding:28px 16px 56px}
.cover{border-bottom:2px solid var(--line);margin:0 0 18px;padding:0 0 14px}
.eyebrow{font:600 14px/1.4 system-ui,sans-serif;color:var(--muted);margin:0}
h1{color:var(--gold);font-size:2rem;line-height:1.2;margin:.15em 0 .3em}
h2{color:var(--gold);font-size:1.35rem;line-height:1.3;margin:1.8em 0 .5em;border-top:1px solid var(--line);padding-top:.7em;break-after:avoid}
h3{font-size:1.1rem;margin:1.3em 0 .35em;break-after:avoid}
p,li{max-width:70ch}
a{color:var(--link);text-decoration:underline;text-underline-offset:3px}
.meta{font:14px/1.5 system-ui,sans-serif;color:var(--muted)}
.candidate-banner{border:1px solid var(--line);border-left:6px solid var(--gold);padding:10px 14px;margin:0 0 16px;font:15px/1.5 system-ui,sans-serif;background:var(--panel)}
.contents ol{columns:2;column-gap:32px;margin:.5em 0 0;padding-left:0;list-style:none}
.contents li{break-inside:avoid;margin:2px 0}
.tp-table{width:100%;border-collapse:collapse;margin:.8em 0;font:15px/1.45 system-ui,sans-serif;background:var(--panel)}
.tp-table caption{text-align:left;color:var(--muted);padding:0 0 6px;font-size:13px}
.tp-table th,.tp-table td{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top}
.tp-table th{background:var(--panel2);color:var(--gold)}
.tp-table tr{break-inside:avoid}
.tp-table.keep{break-inside:avoid}
.tp-table thead{display:table-header-group;break-after:avoid}
.tp-table caption{break-after:avoid}
.tp-table tbody tr:first-child{break-before:avoid}
kbd,code{font:13px/1.4 ui-monospace,Consolas,monospace;background:var(--kbdBg);border:1px solid var(--line);border-radius:4px;padding:1px 6px;color:var(--text);white-space:nowrap}
code{white-space:normal;word-break:break-word}
.since{display:inline-block;background:var(--sinceBg);color:var(--sinceText);border:1px solid var(--sinceText);border-radius:999px;padding:0 8px;font:600 12px/1.5 system-ui,sans-serif;white-space:nowrap}
.onscreen{font:14px/1.4 system-ui,sans-serif;color:var(--muted)}
.tp-footer{border-top:1px solid var(--line);margin-top:24px;padding:18px 16px 32px;font:14px/1.5 system-ui,sans-serif;color:var(--muted)}
.tp-footer p{max-width:820px;margin:6px auto}
.tp-footer a{display:inline-flex;align-items:center;min-height:44px;padding:4px 8px}
ol,ul{padding-left:1.4em}
li{margin:.25em 0}
@media (max-width:640px){.contents ol{columns:1}h1{font-size:1.6rem}kbd{white-space:normal}.tp-table thead{position:absolute;left:-9999px}.tp-table tr{display:block;border:1px solid var(--line);margin:0 0 10px;border-radius:8px;overflow:hidden}.tp-table td{display:block;border:0;border-bottom:1px solid var(--line);padding:6px 8px}.tp-table td::before{content:attr(data-label);display:block;color:var(--gold);font-weight:600;font-size:13px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
/* light print theme: html.print-theme is set on print.html from the first paint, and @media print applies it to index.html */
html.print-theme{${vars(LIGHT)}}
@media print{:root{${vars(LIGHT)}}}
html.print-theme body,.print-theme body{font:11pt/1.5 Georgia,'Times New Roman',serif}
html.print-theme main{max-width:none;padding:0}
html.print-theme h1{font-size:24pt}
html.print-theme h2{font-size:16pt;margin:1em 0 .35em}
html.print-theme h3{margin:1em 0 .3em}
html.print-theme .tp-table{margin:.6em 0}
html.print-theme li{margin:.15em 0}
html.print-theme h3{font-size:13pt}
html.print-theme .tp-table{font:10pt/1.4 'Segoe UI',Arial,sans-serif}
html.print-theme .tp-table caption{font-size:10pt}
html.print-theme kbd,html.print-theme code{font:10pt/1.3 Consolas,'Courier New',monospace}
html.print-theme .since{font:600 10pt/1.4 'Segoe UI',Arial,sans-serif}
html.print-theme .eyebrow,html.print-theme .meta,html.print-theme .candidate-banner,html.print-theme .onscreen{font-size:10pt}
html.print-theme .skip-link{display:none}
html.print-theme .tp-footer{display:none}
@media print{
 body{font:11pt/1.5 Georgia,'Times New Roman',serif}
 .skip-link,#gtbg-nav,#gtbg-nav-mount,.tp-footer{display:none!important}
 main{max-width:none;padding:0}
 a[href^="http"]{word-break:break-word}
}
@page{size:${size};margin:20mm 18mm 22mm 18mm;@bottom-center{content:"Gettysburg Interactive Map: User Guide, release R1c. Page " counter(page) " of " counter(pages);font:9pt Georgia,serif;color:#444}}
`.trim();
}

/**
 * @param {{guide, mode:'web'|'print', paper:string, publish:boolean, release:string, author:string, description:string}} p
 */
export function renderGuide(p) {
  const { guide, mode } = p;
  const web = mode === 'web';
  const toc = guide.sections.map((s, i) => `<li><a href="#${s.id}">${esc(`${i + 1}. ${s.title}`)}</a></li>`).join('');
  const body = guide.sections.map((s, i) => `<section id="${s.id}" aria-labelledby="${s.id}-h">\n<h2 id="${s.id}-h">${esc(`${i + 1}. ${s.title}`)}</h2>\n${s.html.trim()}\n</section>`).join('\n');
  const banner = p.publish ? '' : `<p class="candidate-banner" role="note" data-candidate="true"><strong>Candidate draft.</strong> This guide is generated from the project’s files and is not published.</p>`;
  return `<!doctype html>
<html lang="en-US"${web ? '' : ' class="print-theme"'}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(guide.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="author" content="${esc(p.author)}">
${web ? '<link rel="stylesheet" href="/site-nav.css">\n' : ''}<style>${guideCss({ paper: p.paper })}</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
${web ? '<div id="gtbg-nav-mount"></div>\n' : ''}<main id="main" tabindex="-1">
<header class="cover">
<p class="eyebrow">Release ${esc(p.release)}</p>
<h1>${esc(guide.title)}</h1>
<p class="meta"><span data-source="tools/copy/trust-config.json#asOf">Prepared <time datetime="${guide.asOf}">${esc(longDate(guide.asOf))}</time></span> from the project’s files. It describes the release as built and tested; the release has not been published.</p>
</header>
${banner}
<nav class="contents" aria-label="Contents">
<h2 id="contents-h">Contents</h2>
<ol>${toc}</ol>
</nav>
${body}
</main>
<footer class="tp-footer">
<p>${esc(guide.title)}. An interactive map of the Battle of Gettysburg, July 1–3, 1863.</p>
</footer>
${web ? '<script src="/site-nav.js" data-current="guide"></script>\n' : ''}</body>
</html>
`;
}
