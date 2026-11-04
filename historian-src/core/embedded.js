// embedded.js - the dispatches, telegrams and short letters that the volume prints INSIDE a report or a collection of enclosures (Parts 1 and 2 of the Official Records, vol. 27), found in a passage by their
// layout. Part 3 is made of dispatches and the corpus build cuts it into one document each; Part 1 prints Meade's telegrams to Halleck, Hooker's to the President, Howard's notes to Butterfield under the
// number of the report they belong to ("Headquarters Army of the Potomac, / July 2, 1863 - 8 p. m. (Received July 3, 5.15 p. m.) / Maj. Gen. H. W. Halleck, / General-in-Chief: / The enemy attacked me about 4 p. m. this
// day ... / GEO. G. MEADE, / Major-General."), and a question "what did Meade telegraph to Halleck on July 2" has to be able to find them.
// Pure and shared: the corpus build (tools/historian/lib/corpus-or.mjs) tags the passages that hold one (K:dispatch, D:<date>, F:<sender stem>, A:<addressee stems>), and the engine (reports.js) restricts the quoted
// window of such a passage to the block that matches the question (the date, the sender, the addressee), so a window never mixes two dispatches. Nothing is guessed: a field the layout does not give is null.
//
//   embeddedDispatches(text) -> [{ s, e, h, written (ISO), clock (as printed), received (as printed), addressee, sender, words }]    s, e: offsets in `text` of the block (header to signature and the title and addressee lines under it); h: end of the header paragraph
//
// A block is a header (a date of 1863 in a short paragraph, with the institution or place line above it), a body, and a signature (capitals, with a title). It counts as a dispatch when its date lies in
// June 1 to August 3, 1863 and it either prints a clock or a "(Received ...)" / "(Sent ...)" note, or is a short letter (at most 400 words): a report is long, and a report's own heading is not a dispatch.

const MONTH = '(?:Jun|June|Jul|July|Aug|August|Jnne|Jidy|Julv|Ju1y|J\\s?uly?|J\\s?une?)';
const DATE_RE = new RegExp(`\\b(${MONTH})\\.?\\s*([0-9lI]{1,2})\\s?(?:st|d|nd|rd|th)?\\s*(?:\\[[^\\]]{0,6}\\])?\\s*(?:[,.;:]\\s*)*[-—–*^\\s]{0,3}([1I]\\s?8\\s?[6G]\\s?[0-9])`);
const MON = { jun: 6, jnn: 6, jul: 7, jid: 7, ju1: 7, aug: 8 };
const monthOf = (w) => { const t = String(w).replace(/\s/g, '').toLowerCase().slice(0, 3); return MON[t] || (t[0] === 'j' && /y$/.test(String(w).toLowerCase()) ? 7 : t[0] === 'j' ? 6 : null); };
const INSTIT = /^(?:Headquarters|Hdqrs|Hd\.?\s?qrs|Head-?quarters|War Department|Navy Department|Executive|Office|Department|Camp|Signal|Telegraph|Fort|Near|Cavalry|Army|Corps)\b/i;
const RECIPIENT = /^(?:(?:Maj(?:or)?|Brig(?:adier)?|Lieut(?:enant)?|Lt|Col(?:onel)?|Capt(?:ain)?|Gen(?:eral)?|Hon|His Excellency|His Honor|The President|The Secretary|The Governor|Commanding|Commander|Chief|Adjutant|Assistant|Mr|Governor|Dr|Surg|Admiral|Commodore|Rear|Colonel|Telegraph|Operator|Superintendent|Military|President|Secretary|Quartermaster|Provost|Signal|Commissary|Judge|Mayor|Sir)\b|To the\b)/i;
const SIG_NAME = /^[^a-z\n]{0,6}[A-Z0-9][A-Z0-9.’' ,*\-]{3,46}[.,]?$/;
const TITLE = /\b(?:General|Major|Colonel|Captain|Lieutenant|Secretary|Staff|Commanding|Adjutant|Volunteers|Governor|President|Engineers?|Operator|Surgeon|Chief|Officer|Assistant|Aide|Cavalry|Commander)\b/;

/** paragraphs of a passage with their offsets */
function paragraphs(text) {
  const out = []; const re = /[^\n]+(?:\n(?!\n)[^\n]+)*/g; let m;
  while ((m = re.exec(text))) out.push({ s: m.index, e: m.index + m[0].length, t: m[0].replace(/\s+/g, ' ').trim() });
  return out;
}
const isoOf = (m, d, y) => {
  const mo = monthOf(m); const day = +String(d).replace(/[lI]/g, '1'); const yr = +String(y).replace(/\s/g, '').replace(/[Il]/g, '1').replace(/G/g, '6');
  if (!mo || !(day >= 1 && day <= 31) || yr !== 1863) return null;
  return `1863-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const CLOCK_AFTER = /^[\s,.;:*^~'’-]*[-—–]?\s*(?:\(?\s*)?((?:12\s*m\b\.?|\d{1,2}\s*[.:]\s*\d{2}|\d{1,2})\s*[-.,]?\s*(?:[ap]\s?\.?\s?-?\s?m\b\.?|[ap]\.(?![A-Za-z])|noon\b|midnight\b|o.{0,2}clock\b))/i;
const RECEIVED = /\(\s*((?:Copy\s+)?[Rr]eceived|Sent)\b[^)\n]{0,90}\)?/;

/** the signature at paragraph i: { name, end } where end is the index of the last paragraph that belongs to it (title lines), or null */
function signatureAt(P, i) {
  const t = P[i].t;
  // "O. O. HOWARD, Major-General , Commanding." in one paragraph
  { const m = /^([A-Z0-9][A-Z0-9.’' *\-]{3,40}[A-Z0-9.])\s*,\s*((?:[A-Z][a-z]+|[A-Z]{2,})[\s\S]{0,70})$/.exec(t); if (m && TITLE.test(m[2]) && /[A-Z]{3}/.test(m[1]) && !/[a-z]{3}/.test(m[1])) return { name: m[1].trim(), end: i }; }
  if (!SIG_NAME.test(t) || !/[A-Z]{3}/.test(t) || /[a-z]{3}/.test(t.replace(/\b(?:Mc|Mac|De|Van|Von)[A-Z]/g, ''))) return null;
  const name = t.replace(/[\s,.]+$/, '');
  if (/^(?:UNION|CONFEDERATE|REPLIES|QUESTIONS|ADDENDA|CORRESPONDENCE|FIRST|SECOND|THIRD|ARMY|CORPS)\b/.test(name)) return null;
  let end = i;
  for (let k = i + 1; k < Math.min(P.length, i + 3); k++) { const u = P[k].t; if (u.length <= 80 && TITLE.test(u) && !/[:]$/.test(u) && !/^(?:Headquarters|Hdqrs)/i.test(u) && !/^[A-Za-z.-]+(?:\s[A-Za-z.-]+)?\s[A-Z][a-z]+,$/.test(u)) end = k; else break; }      // a title line ends with a full stop; "Major-General Butterfield," under a signature is the addressee set at the foot
  return { name, end };
}

export function embeddedDispatches(text) {
  const P = paragraphs(String(text)); const out = [];
  // 1. headers: a short paragraph carrying a date of 1863 in its first 90 characters
  const heads = [];
  P.forEach((p, i) => {
    if (p.t.length > 220) return;
    const m = DATE_RE.exec(p.t); if (!m || m.index > 90) return;
    const iso = isoOf(m[1], m[2], m[3]); if (!iso) return;
    if (/^[a-z]/.test(p.t)) return;                                                              // a date inside a sentence
    if (/^(?:minutes of council|abstract|return|troops|organization|itinerary)/i.test(p.t)) return;
    heads.push({ i, iso, m });
  });
  heads.forEach((h, k) => {
    const hp = P[h.i];
    // the institution / place lines above (up to two short paragraphs, none of them a signature or a sentence)
    let first = h.i;
    for (let j = h.i - 1; j >= Math.max(0, h.i - 2); j--) { const t = P[j].t; if (t.length <= 80 && (INSTIT.test(t) || /,\s*$/.test(t)) && !signatureAt(P, j) && !/[.!?]\s*$/.test(t.replace(/(?:Pa|Va|Md|Ky|Mo|Ga|D\. C|Tenn|N\. Y)\.,?\s*$/, ''))) first = j; else break; }
    // the clock and the note that follow the date, in the header paragraph or in the next ones
    const after = hp.t.slice(h.m.index + h.m[0].length);
    const ck = CLOCK_AFTER.exec(after); let clock = ck ? ck[1].replace(/\s+/g, ' ') : null;
    let received = (RECEIVED.exec(hp.t) || [])[0] || null; let last = h.i;
    const nextHead = k + 1 < heads.length ? heads[k + 1].i : P.length;
    // 2. the signature: the first one before the next header
    let sig = null, sigAt = -1;
    for (let j = h.i + 1; j < nextHead; j++) { const sg = signatureAt(P, j); if (sg) { sig = sg; sigAt = j; break; } }
    const bodyEnd = sig ? sig.end : nextHead - 1;
    // (Received ...) / (Sent ...) on a paragraph of its own, and a clock the paragraph above/below carries
    for (let j = h.i + 1; j <= Math.min(bodyEnd, h.i + 4); j++) {
      const t = P[j].t;
      if (!received) { const r = RECEIVED.exec(t); if (r && t.length <= 120) received = r[0]; }
      if (!clock && j === h.i + 1 && /^m\.?$/i.test(t)) continue;
    }
    // the addressee: the recipient-led paragraphs right under the header (after any note), or on the header line itself after the clock
    const addr = [];
    for (let j = h.i + 1; j <= Math.min(bodyEnd, h.i + 4); j++) {
      const t = P[j].t;
      if (/^\(\s*(?:Copy\s+)?(?:[Rr]eceived|Sent)/.test(t) || /^m\.?$/i.test(t)) continue;
      if (/^(?:Sir|General|Colonel|Major|Captain|Dear [A-Za-z]+)\s*[:,]\s*\S/.test(t)) break;                                // "Sir : The fire has been concentrated ..." opens the body
      if (RECIPIENT.test(t) && t.length <= 110 && (addr.length || /[:,]\s*$|^General\b|^Sir\b/.test(t) || t.length <= 70)) { addr.push(t.replace(/[\s:;]+$/, '')); if (/:\s*$/.test(t)) break; continue; }
      break;
    }
    // the recipient may also stand on the header line itself, after the clock and the note ("July 2, 1863 - 8 p. m. (Received July 3, 5.15 p. m.) Maj. Gen. H. W. Halleck,"), and go on in the paragraphs under it ("General-in-Chief :")
    const tailTxt = (ck ? after.slice(ck[0].length) : after).replace(/^[\s.,;:*^~'’\-—–]*(?:\([^)]*\)\s*)?[\s.,;:]*/, '').trim();
    if (tailTxt && RECIPIENT.test(tailTxt) && tailTxt.length <= 130) addr.unshift(tailTxt.replace(/[\s:;]+$/, ''));
    let addressee = addr.length ? addr.join(' ') : null;
    // 3. what stands under the signature: title lines (in sig.end) and the addressee the volume sets at the foot of a letter ("Major-General Butterfield, / Chief of Staff.")
    let endIdx = bodyEnd;
    if (sig) { const foot = []; for (let j = sig.end + 1; j < Math.min(nextHead, sig.end + 4); j++) { const t = P[j].t; if (RECIPIENT.test(t) && t.length <= 110 && !signatureAt(P, j)) { foot.push(t); endIdx = j; } else break; } if (!addressee && foot.length) addressee = foot.join(' ').replace(/[\s:;.]+$/, ''); }
    const s = P[first].s, e = P[Math.max(endIdx, last)].e;
    const body = text.slice(P[h.i].e, e); const words = (body.match(/\S+/g) || []).length;
    const written = h.iso;
    const inWindow = written >= '1863-06-01' && written <= '1863-08-03';
    const dispatchLike = !!clock || !!received || (sig && words <= 400);
    if (!inWindow || !dispatchLike || (!sig && !clock && !received)) return;
    out.push({ s, e, h: hp.e, written, clock, received, addressee, sender: sig ? sig.name.replace(/\s+/g, ' ') : null, words });
  });
  return out;
}
