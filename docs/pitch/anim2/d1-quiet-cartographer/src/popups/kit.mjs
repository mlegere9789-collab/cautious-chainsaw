// popups/kit.mjs - the shared vocabulary of every popup: tones and shapes, reading-time maths, evidence chips, the clock line, and the CONTENT MODEL.
//
// A popup does not build DOM.  It describes a card as data (a content model: blocks such as kicker, title, p, meta, chips, bar, list, actions ...) and the layer (ui/popup-layer.mjs) renders every
// card with one design system: the same type scale, the same spacing, the same motion, the same focus and screen-reader behaviour.  That is what makes the popups improvable from one place
// (popups.css and the dials) and testable without a browser (the tests read the model's text; test/popups.test.mjs).  A block of type 'custom' or 'canvas' is the escape hatch for a minimap.
//
// Everything here is pure.  Nothing here knows about the DOM, the engine or the frame.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const words = (s) => ((s || '').trim().match(/\S+/g) || []).length;

/** reading time in wall-clock ms: base + words at `wpm`, clamped (02-popups.md 5.2 rule 3).  cfg = { baseMs, wpm, minMs, maxMs } */
export function readMs(wordCount, cfg) { return clamp(cfg.baseMs + wordCount * 60000 / cfg.wpm, cfg.minMs, cfg.maxMs); }

/** tone = what a card is about.  `shape` is the second cue after colour (never colour alone); the colours live in popups.css as --tone-<name> */
export const TONES = {
  critical: { label: 'Critical', shape: 'star' }, high: { label: 'High', shape: 'dot' }, medium: { label: 'Medium', shape: 'diamond' }, low: { label: 'Low', shape: 'ring' },
  story: { label: 'Story', shape: 'quote' }, info: { label: 'Note', shape: 'dot' }, unit: { label: 'Unit', shape: 'box' }, tour: { label: 'Tour', shape: 'pin' }, day: { label: 'Day', shape: 'sun' },
  killed: { label: 'Killed', shape: 'cross' }, 'mortally-wounded': { label: 'Mortally wounded', shape: 'plus' }, wounded: { label: 'Wounded', shape: 'plus' }, captured: { label: 'Captured', shape: 'flag' },
  'wounded-captured': { label: 'Wounded and captured', shape: 'flag' }, relieved: { label: 'Relieved', shape: 'swap' }, promoted: { label: 'Promoted', shape: 'chevrons' }, arrives: { label: 'Arrives', shape: 'arrow' },
  union: { label: 'Union', shape: 'box' }, confederate: { label: 'Confederate', shape: 'box' },
};


/** the colour family of a tone (popups.css maps tones to --tone-<family> the same way) */
export const FAMILY = { critical: 'critical', killed: 'critical', 'mortally-wounded': 'critical', high: 'high', wounded: 'high', 'wounded-captured': 'high', medium: 'medium', captured: 'medium', story: 'story', tour: 'story', day: 'day' };
export const toneFamily = (tone) => FAMILY[tone] || 'info';

/** 24 x 24 icon paths (filled).  Hand-drawn for this prototype, no external font or request. */
export const SHAPES = {
  star: 'M12 2.6l2.8 6 6.5.8-4.8 4.5 1.3 6.5L12 17l-5.8 3.4 1.3-6.5L2.7 9.4l6.5-.8z', dot: 'M12 6.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z', diamond: 'M12 3l8 9-8 9-8-9z',
  ring: 'M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 2.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8z', quote: 'M5 17.5V12c0-3.6 1.7-6 5-6.8l.6 1.7c-1.7.7-2.5 1.9-2.5 3.6H11v7H5zm8 0V12c0-3.6 1.7-6 5-6.8l.6 1.7c-1.7.7-2.5 1.9-2.5 3.6H19v7h-6z',
  cross: 'M10.2 3h3.6v5.4H19v3.4h-5.2V21h-3.6v-9.2H5V8.4h5.2z', plus: 'M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z', flag: 'M6 3h2v18H6zm3 1h10l-2.6 4.2L19 12.4H9z',
  swap: 'M4 8h12V5l5 4.5-5 4.5v-3H4zm16 8H8v3l-5-4.5L8 10v3h12z', chevrons: 'M12 4l7 7-2 2-5-5-5 5-2-2zm0 7l7 7-2 2-5-5-5 5-2-2z', arrow: 'M3 11h12.2l-4.6-4.6L12 5l7 7-7 7-1.4-1.4 4.6-4.6H3z',
  box: 'M4 6h16v12H4zm2.2 2.2v7.6h11.6V8.2z', pin: 'M12 2a6.5 6.5 0 0 0-6.5 6.5c0 4.6 6.5 12.5 6.5 12.5s6.5-7.9 6.5-12.5A6.5 6.5 0 0 0 12 2zm0 9a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
  sun: 'M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM11 2h2v3h-2zm0 17h2v3h-2zM2 11h3v2H2zm17 0h3v2h-3zM4.9 6.3l1.4-1.4 2.1 2.1-1.4 1.4zm10.7 10.7l1.4-1.4 2.1 2.1-1.4 1.4zM4.9 17.7L7 15.6l1.4 1.4-2.1 2.1zM15.6 7l2.1-2.1 1.4 1.4L17 8.4z',
  close: 'M6.4 5L12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z', pinned: 'M14 3l7 7-2 1-3-1-4.5 4.5.5 3.5-1.5 1.5-3-3L3 21l-.5-.5 4.5-4.5-3-3L5.5 11.5 9 12l4.5-4.5-1-3z',
  panel: 'M3 4h18v16H3V4zm2 2v12h8V6H5zm10 0v12h4V6h-4z',
  book: 'M4 4h7a3 3 0 0 1 1 .2A3 3 0 0 1 13 4h7v14h-7a2 2 0 0 0-2 1.6A2 2 0 0 0 9 18H4zm2 2v10h3.5c.6 0 1.1.2 1.5.5V6.2c-.4-.1-.8-.2-1.2-.2zm12 0h-4.8c-.4 0-.8.1-1.2.2v10.3c.4-.3.9-.5 1.5-.5H18z',
  list: 'M4 6h2v2H4zm4 0h12v2H8zm-4 5h2v2H4zm4 0h12v2H8zm-4 5h2v2H4zm4 0h12v2H8z', play: 'M8 5v14l11-7z', target: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z', help: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm-1 13v2h2v-2zm1-9.5c-2 0-3.4 1.2-3.5 3.2h2c.1-.8.6-1.3 1.5-1.3.8 0 1.4.5 1.4 1.2 0 1.4-2.4 1.3-2.4 4.1h2c0-1.8 2.5-1.9 2.5-4.2 0-1.7-1.5-3-3.5-3z',
};

/** evidence chip: the site's six labels, never invented.  `title` is the long explanation shown on hover and read by screen readers. */
export const EVIDENCE = new Set(['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown']);
export function ev(label, text = null, title = null) {
  if (!EVIDENCE.has(label)) throw new RangeError('evidence label must be one of ' + [...EVIDENCE].join(', ') + ', got ' + label);
  return { ev: label, text, title };
}

/** the clock line every popup uses (a popup never prints a clock of its own: 02-popups.md F-07).  `clock` = engine.clock.  The result is always "about", always labelled Modelled. */
export function clockLine(clock, tick) {
  const c = clock.describe(tick);
  return { date: c.date, text: c.text, sigma: c.sigmaMin, short: `about ${c.text}`, long: `${c.date}, about ${c.text}`, chip: ev('Modelled', 'candidate clock', `The clock is a candidate: 33 anchors, all proposed and none reviewed by a historian. About ${c.text} on ${c.date}, give or take ${c.sigmaMin} minutes.`) };
}

/**
 * The chronology rows print an internal bookkeeping sentence ("Commander succession US-017 activates.") that means nothing to a visitor and leaks an id (02-popups.md F-16).  It is not shown;
 * the id becomes a link to that command change.  Returns { text, link } where text + the removed sentence is the source text (a test proves it for all 137 rows).
 */
export const INTERNAL_SENTENCE = /\s*Commander succession ([A-Z]{2}-\d{3}) activates\.?/;
/** ROUND 2: the data sets the first sentence of 25 events in capitals ("REYNOLDS KILLED. Shot through the head ...").  A card does not shout: that lead is set in title case ("Reynolds Killed."), words of the sentence kept,
 *  acronyms (KIA, US) and ordinals (1ST -> 1st) as they should be.  The source text is untouched (displayText still strips only the internal sentence). */
const SMALL = new Set(['of', 'the', 'and', 'at', 'in', 'to', 'on', 'for', 'a', 'an', 'by', 'from']); const KEEP = new Set(['KIA', 'US', 'CSA']);
export function leadCase(text) {
  const m = /^([A-Z0-9][A-Z0-9'’.,\- ]{4,}?)([.:;!?])(\s|$)/.exec(text || ''); if (!m || !/[A-Z]{2}/.test(m[1])) return text;
  const run = m[1].split(/(\s+)/).map((w, i) => {
    if (!w.trim() || KEEP.has(w)) return w; if (/^\d+(ST|ND|RD|TH)(['’]S)?$/.test(w)) return w.toLowerCase();
    const low = w.toLowerCase(); if (i > 0 && SMALL.has(low)) return low; if (/^[IVX]{1,4}$/.test(w) && w.length > 1) return w;
    return low.replace(/(^|['’\-])([a-z])/g, (q, a, b) => (a === '' || a === '-' ? a + b.toUpperCase() : a + b)).replace(/^[a-z]/, (c) => c.toUpperCase());
  }).join('');
  return run + m[2] + text.slice(m[0].length - m[3].length);
}
export function displayText(text) { const m = INTERNAL_SENTENCE.exec(text); return m ? { text: text.replace(INTERNAL_SENTENCE, '').trim(), link: m[1], removed: m[0] } : { text, link: null, removed: '' }; }

/** "The Battle Begins — July 1, 7:30 AM" -> "The Battle Begins": the hand-typed clock after the dash contradicts the clock module (02-popups.md 3.4) and is not shown; the clock line replaces it */
export function tourSubtitle(sub) { const i = sub.indexOf(' — '); return i < 0 ? sub : sub.slice(0, i); }

export const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export const thousands = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : 'n/a');

/** the plain text of a content model (screen reader label, live region, tests): every block that carries words, in order */
export function textOf(content) {
  const out = [];
  const walk = (b) => {
    if (!b) return;
    if (Array.isArray(b)) { b.forEach(walk); return; }
    switch (b.t) {
      case 'kicker': out.push([b.label, b.right].filter(Boolean).join(' ')); break;
      case 'title': case 'p': out.push(b.text); break;
      case 'quote': out.push(b.text); if (b.cite) out.push(b.cite); break;
      case 'meta': for (const r of b.rows) out.push(r.text); break;
      case 'chips': for (const c of b.items) out.push([c.ev, c.text].filter(Boolean).join(' ')); break;
      case 'bar': out.push([b.label, b.sub].filter(Boolean).join(' ')); break;
      case 'kv': for (const r of b.rows) out.push(r[0] + ' ' + r[1]); break;
      case 'list': for (const i of b.items) out.push([i.title, i.text].filter(Boolean).join(' ')); break;
      case 'actions': break;
      case 'disclosure': out.push(b.label); walk(b.blocks); break;
      case 'scroll': walk(b.blocks); break;
      case 'swatches': for (const r of b.rows) out.push(r.text); break;
      default: if (b.text) out.push(b.text);
    }
  };
  walk(content.blocks); return out.filter(Boolean).join('\n');
}

// ---- height estimate -----------------------------------------------------------------------------------------------------------------------------------
// Used where there is no DOM (node tests, the first frame): a CONSERVATIVE estimate of a card's height from its model and width.  In the browser the layer measures the real element instead,
// and the real number is what placement uses.  Constants are the type scale of popups.css (13 px body, 1.5 line height, 16 px title) with an average glyph width of 0.56 em, wider than system-ui.
const TYPE = { body: [13, 19.5], small: [11.5, 17], title: [16, 22], serif: [17, 24], big: [22, 30], kicker: [10, 14] };
const lines = (text, w, fs) => Math.max(1, Math.ceil((text || '').length * fs * 0.56 / Math.max(40, w)));
export function estimateHeight(content, w, opts = {}) {
  const padX = opts.padX ?? 28; const inner = w - padX; let h = opts.padY ?? 22;
  const block = (b) => {
    switch (b.t) {
      case 'kicker': return 18;
      case 'title': { const [fs, lh] = b.size === 'big' ? TYPE.big : b.serif ? TYPE.serif : TYPE.title; return lines(b.text, inner, fs) * lh + 4; }
      case 'p': { const [fs, lh] = b.size === 'sm' ? TYPE.small : TYPE.body; return Math.min(b.lines || 999, lines(b.text, inner, fs)) * lh + 6; }
      case 'quote': return lines(b.text, inner - 16, 13) * 19.5 + (b.cite ? 18 : 0) + 8;
      case 'meta': return b.rows.length * 20;
      case 'chips': return 26 * Math.max(1, Math.ceil(b.items.reduce((s, c) => s + 70 + (c.text || '').length * 6, 0) / inner));
      case 'bar': return 32;
      case 'kv': return b.rows.length * 20 + 4;
      case 'list': return b.items.length * (b.rowH || 44);
      case 'actions': return 38;
      case 'disclosure': return 28 + (b.open ? (b.blocks || []).reduce((s, x) => s + block(x), 0) : 0);
      case 'scroll': return Math.min(b.maxH || 160, (b.blocks || []).reduce((s, x) => s + block(x), 0));
      case 'canvas': return b.h || 100;
      case 'swatches': return b.rows.length * 34;
      case 'progress': return 3;
      default: return 20;
    }
  };
  for (const b of content.blocks) h += block(b) + (opts.gap ?? 6);
  return Math.ceil(h);
}

/** build a deterministic, sorted index over rows with a `tick`, with the one query the triggers need: rows with a < tick <= b */
export function tickIndex(rows) {
  const sorted = rows.slice().sort((p, q) => p.tick - q.tick);
  const lowerBound = (t) => { let lo = 0; let hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid].tick <= t) lo = mid + 1; else hi = mid; } return lo; };   // first index with tick > t
  return { rows: sorted, between: (a, b) => { const out = []; for (let i = lowerBound(a); i < sorted.length && sorted[i].tick <= b; i++) out.push(sorted[i]); return out; }, upTo: (b) => lowerBound(b) };
}

/** short text for a chip: whole words only, ends with an ellipsis; the complete text is always one action away */
export function chipText(text, max = 64) {
  const t = (text || '').replace(/\s+/g, ' ').trim(); if (t.length <= max) return t;
  const cut = t.slice(0, max - 1); const sp = cut.lastIndexOf(' '); return (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[,;:\s-]+$/, '') + '…';
}
/** the first sentence of a text (for compact forms and announcements) */
export function firstSentence(text) { const m = /^(.+?[.!?])(\s|$)/.exec((text || '').trim()); return m ? m[1] : (text || '').trim(); }

/** names of units for a card: drop a name that another listed name already contains ("First Corps" inside "First Brigade, ... First Corps (Iron Brigade)") */
export function dedupeNames(names) { const u = [...new Set(names)]; return u.filter((n) => !u.some((m) => m !== n && m.includes(n))); }
