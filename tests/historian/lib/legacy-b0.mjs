// legacy-b0.mjs - runs the ACTUAL inline <script> of legacy/dist/historian.html (the deployed page) under a stub DOM with an fs-backed fetch.
// Only instrumentation is added (a stable id per corpus entry and the full ranked list); scoring, ranking and rendering are untouched.
// This reproduces baseline B0 of docs/plan/specialists/hist-current.md from the files in this repository (legacy/ is never modified).
import fs from 'node:fs';
import path from 'node:path';
import { DEPLOY } from './data.mjs';

function makeEl(id) {
  return { id, style: {}, children: [], listeners: {}, value: '', className: '', innerHTML: '', textContent: '', type: '',
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }, appendChild(c) { this.children.push(c); c.parent = this; return c; }, scrollIntoView() {} };
}

export async function loadLegacyHistorian() {
  const html = fs.readFileSync(path.join(DEPLOY, 'historian.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  let code = scripts[0][1];
  code = code.replace('(async function() {', 'return (async function() {');
  code = code.replace("corpus.push({\n        kind: 'regiment',", "corpus.push({ __id: r.regiment_id,\n        kind: 'regiment',");
  code = code.replace("corpus.push({\n        kind: 'vignette',", "corpus.push({ __id: v.vignette_id,\n        kind: 'vignette',");
  code = code.replace("corpus.push({\n        kind: 'chronology',", "corpus.push({ __id: 'D'+c.day+'T'+e.tick,\n        kind: 'chronology',");
  code = code.replace("corpus.push({\n      kind: 'terrain',", "corpus.push({ __id: loc.location_id,\n      kind: 'terrain',");
  code = code.replace(/const ranked = corpus([\s\S]*?)\.sort\(\(a, b\) => b\.s - a\.s\)\s*\.slice\(0, 3\);/,
    "const __all = corpus$1.sort((a, b) => b.s - a.s); globalThis.__full = __all.map(x=>({id:x.e.__id,kind:x.e.kind,s:x.s})); const ranked = __all.slice(0, 3);");
  code = code.replace("document.getElementById('loading').style.display = 'none';", "globalThis.__corpus = corpus; document.getElementById('loading').style.display = 'none';");
  if (!code.includes('__all')) throw new Error('legacy historian instrumentation failed (file changed?)');
  const els = {};
  const document = { getElementById(id) { return els[id] || (els[id] = makeEl(id)); }, createElement(tag) { return makeEl(tag); } };
  const fetch = async (u) => { const txt = fs.readFileSync(path.join(DEPLOY, u.replace(/^\//, '')), 'utf8'); return { json: async () => JSON.parse(txt) }; };
  const g = {};
  await new Function('document', 'fetch', 'globalThis', code)(document, fetch, g);
  const transcript = els['transcript'], form = els['ask-row'], askEl = els['ask'];
  return {
    ask(q) {
      transcript.children.length = 0; g.__full = null; askEl.value = q;
      form.listeners.submit[0]({ preventDefault() {} });
      return { full: g.__full, msgs: transcript.children.map((c) => ({ role: c.className.replace('msg ', ''), html: c.innerHTML })) };
    },
  };
}

const NOANS = /^I couldn.t find anything specific/;
const plain = (h) => String(h).replace(/<a class="src"[^>]*>.*?<\/a>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
/** system adapter over the legacy page for relevance.evaluate() */
export async function legacySystem() {
  const h = await loadLegacyHistorian();
  return async (q) => {
    const r = h.ask(q);
    const bots = r.msgs.filter((m) => m.role === 'bot');
    const texts = bots.map((m) => plain(m.html));
    const refused = bots.length === 1 && NOANS.test(texts[0]);
    return { ranked: (r.full || []).filter((x) => x.s > 0).map((x) => x.id), shown: refused ? [] : (r.full || []).slice(0, 3).map((x) => x.id), bubbles: texts, refused, raw_html: r.msgs.map((m) => m.html).join('\n') };
  };
}
