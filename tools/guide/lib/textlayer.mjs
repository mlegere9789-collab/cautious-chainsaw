// Linting the text layer of a PDF that was printed from an HTML page. The PDF has no markup, so the exemptions the HTML declares
// (code, kbd and pre elements, and elements marked data-lint-allow) cannot travel with the text. They travel as counts instead: the
// text layer may hold exactly as many occurrences of a banned word as the exempt parts of the HTML do, and every occurrence beyond
// that is a finding. A stray banned word in the prose of the PDF is therefore still caught.
import { extractHtml } from '../../copy/lib/extract.mjs';
import { RULES, matchRules } from '../../copy/lib/rules.mjs';
import { lintSource } from '../../copy/lib/lint.mjs';

const key = (f) => `${f.rule}\u0001${f.match.toLowerCase()}`;
const bump = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);

/** the multiset of (rule, matched text) that the HTML itself exempts */
export function exemptMultiset(html, env) {
  const items = extractHtml(html, { keepSkipped: true });
  const ctxBase = { names: env.names, counts: env.counts, facts: env.facts, proseKeys: env.scan.proseKeys, allowedEmails: env.scan.allowedEmails || [] };
  const out = new Map();
  for (const it of items) {
    const exempt = it.skipped ? null : (it.ignore && it.ignore.size ? it.ignore : undefined);
    if (it.skipped || exempt) {
      // judge the exempt text with no suppression, then count only what the exemption covers
      const found = matchRules({ ...it, ignore: new Set(), quoted: false }, ctxBase, null);
      for (const m of found) { if (it.skipped || exempt.has(m.rule) || exempt.has('*')) bump(out, `${m.rule}\u0001${it.text.slice(m.index, m.index + m.length).toLowerCase()}`); }
    }
  }
  return out;
}

/** findings in the text layer that the HTML does not exempt (a finding beyond the exempt count is reported) */
export function textLayerFindings({ text, html, env }) {
  const raw = lintSource('guide.txt', text, env).findings;
  const budget = exemptMultiset(html, env);
  const left = [];
  for (const f of raw) {
    const k = key(f);
    if ((budget.get(k) || 0) > 0) { budget.set(k, budget.get(k) - 1); continue; }
    left.push(f);
  }
  return { findings: left, rawCount: raw.length, exempted: raw.length - left.length };
}

export { RULES };
