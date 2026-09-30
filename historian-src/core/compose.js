// compose.js - answer composers. NOTHING IS GENERATED: every sentence is (a) template text whose slots come from an entity attribute or a fact-table row,
// (b) a verbatim quote of a stored passage (offsets recorded), or (c) an explicit limitation. Invariants I1-I8 are re-checked by lint.js over every answer.
//
// Answer types (docs/plan A1..A14): profile, command, strength/casualties, superlative, evidence quotes, place, compare, list/rollup, route, limited, clarify.
// A composer returns { mode, blocks, src[], chips? } or null (caller falls back to a profile of the best card).
import { fmtN, fmtPct, SIDE_NAME, DAY_NAME, joinList, daysText, ucfirst, endSent, shortRank, personLabel, fateText, withThe } from './format.js';
import { CLOCK_RE } from './text.js';

const lead = (runs, src = []) => ({ t: 'lead', runs: runs.map((r) => (typeof r === 'string' ? { txt: r } : r)), src });
const note = (code, txt) => ({ t: 'note', code, txt });
const ent = (rec, txt) => ({ ent: rec.id, txt: txt || rec.label });
const AUTH_NOTE = 'Figures come from the site’s own order-of-battle records and are approximate; published sources differ.';

// ---------------------------------------------------------------------------------------------------------------------------------------
// record helpers
// ---------------------------------------------------------------------------------------------------------------------------------------
export function helpers(kb) {
  const { idx, facts } = kb;
  const get = (id) => idx.get(id);
  const label = (id) => { const r = get(id); return r ? r.label : ''; };
  const parents = (r) => (r.par || []).map(get).filter(Boolean);
  const kids = (r) => (r.kids || []).map(get).filter(Boolean);
  const sideName = (r) => SIDE_NAME[r.side] || '';
  const cmdOf = (r) => (r.attrs && r.attrs.cmd) || null;
  const cmdText = (c) => (c ? personLabel(c.rank, c.name) : '');
  const parentsText = (r) => {
    const p = parents(r);
    const bde = p.find((x) => x.k === 'brigade'), div = p.find((x) => x.k === 'division'), co = p.find((x) => x.k === 'corps');
    const parts = [];
    if (r.k === 'regiment' || r.k === 'artillery') { if (bde) parts.push(bde.label); if (div) parts.push(div.title); else if (co && !div) parts.push(co.title); }
    else if (r.k === 'brigade') { if (div) parts.push(div.title); else if (co) parts.push(co.title); }
    else if (r.k === 'division') { if (co) parts.push(co.title); }
    else if (r.k === 'artillery-unit') { if (co) parts.push(co.title); }
    if (r.k === 'regiment' && !bde && co) parts.push(co.title);
    return parts.join(', ');
  };
  const daysOf = (r) => daysText(r.attrs && r.attrs.days);
  const isUnit = (r) => ['regiment', 'brigade', 'division', 'corps', 'army', 'artillery', 'artillery-unit'].includes(r.k);
  const nameForLead = (r) => (r.k === 'regiment' || r.k === 'artillery' ? r.title : r.label);
  return { get, label, parents, kids, sideName, cmdOf, cmdText, parentsText, daysOf, isUnit, nameForLead, facts };
}

// stats sentence pieces -------------------------------------------------------------------------------------------------------------------
function statsPieces(r) {
  const a = r.attrs || {};
  const out = {};
  if (typeof a.strength === 'number' && a.strength > 0 && !a.estStrength) out.strength = `about ${fmtN(a.strength)} men`;
  if (typeof a.casualties === 'number') {
    if (a.casualties === 0 && (a.estCas || a.strength > 0)) out.cas = 'no casualties are recorded for it';
    else out.cas = `${fmtN(a.casualties)} casualties${a.pct != null && a.strength > 0 && !a.estStrength ? ` (${fmtPct(a.pct)})` : ''}`;
  }
  if (typeof a.gun_count === 'number') out.guns = `${a.gun_count} ${a.gun_count === 1 ? 'gun' : 'guns'}${a.gun_type ? ` (${a.gun_type})` : ''}`;
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// A1 profile
// ---------------------------------------------------------------------------------------------------------------------------------------
export function profileLead(kb, r) {
  const H = helpers(kb);
  const a = r.attrs || {};
  const runs = [];
  if (H.isUnit(r)) {
    const parents = H.parentsText(r);
    const side = H.sideName(r);
    const what = { regiment: 'regiment', brigade: 'brigade', division: 'division', corps: 'corps', army: 'army', artillery: 'battery', 'artillery-unit': 'artillery command' }[r.k];
    runs.push(ent(r, ucfirst(H.nameForLead(r))), ` (${side}${r.state && r.k === 'regiment' ? `, ${r.state}` : ''}) `);
    if (parents) runs.push(`was a ${what} in ${parents}. `); else runs.push(`was ${['army', 'corps'].includes(r.k) ? 'a ' + what : 'a ' + what} at Gettysburg. `);
    const c = H.cmdOf(r);
    if (c) {
      runs.push(`It was commanded by ${H.cmdText(c)}${c.fate ? ` (${fateText(c.fate)})` : ''}`);
      if (c.succ && c.succ.length) { const s = c.succ[0]; runs.push(`; ${personLabel(s.rank, s.name)} took over${s.when ? ` (${s.when})` : ''}`); }
      runs.push('. ');
    }
    const sp = statsPieces(r);
    const bits = [sp.strength ? `${ucfirst(sp.strength)} were engaged` : null].filter(Boolean);
    const days = H.daysOf(r);
    if (sp.strength && sp.cas) runs.push(`${ucfirst(sp.strength)} were engaged, with ${sp.cas}. `); else if (sp.cas) runs.push(`${ucfirst(sp.cas)}. `);
    if (sp.guns) runs.push(`It had ${sp.guns}. `);
    if (days) runs.push(`Days engaged: ${days}. `);
    if (a.ka) runs.push(endSent(a.ka));
  } else if (r.k === 'terrain') {
    runs.push(ent(r, ucfirst(r.label)), '. ');
    if (a.elevation) runs.push(`Elevation about ${fmtN(a.elevation)} feet. `);
    if (a.days && a.days.length) runs.push(`Relevant on ${daysText(a.days)}. `);
    if (a.ka) runs.push(endSent(a.ka));
  } else if (['road', 'structure', 'feature'].includes(r.k)) {
    runs.push(ent(r, ucfirst(r.label)), '. ');
    if (a.ka) runs.push(endSent(a.ka));
  } else if (r.k === 'person') {
    const roles = (a.roles || []).filter((x) => x.r === 'commander' || x.r === 'chief-artillery');
    runs.push(ent(r, personLabel(a.rank, a.name)));
    if (roles.length) {
      const desc = roles.slice(0, 2).map((x) => (x.r === 'chief-artillery' ? `served as ${x.l}` : `commanded ${x.u && H.get(x.u) ? H.get(x.u).label : x.l}`));
      runs.push(` ${joinList(desc)} at Gettysburg`);
    } else runs.push(' appears in the site’s records');
    runs.push(a.fate ? ` (${fateText(a.fate)}). ` : '. ');
    if (a.notes) runs.push(endSent(a.notes));
  } else if (r.k === 'vignette') {
    runs.push(ent(r, `“${r.title}”`), ` (${a.location}, ${DAY_NAME[a.day]}). `, endSent(a.summary || ''));
  } else if (r.k === 'chronology') {
    runs.push(ent(r, ucfirst(r.title)), ` (${r.place || a.location}, ${DAY_NAME[a.day]}). `, endSent(String(a.text || '').replace(/^[A-Z0-9'’ -]{6,}[.:]s+/, '')));
  } else if (r.k === 'succession') {
    runs.push(ent(r, endSent(r.title)), a.notes ? ' ' + endSent(a.notes) : '');
  } else if (r.k === 'casualty-note') {
    runs.push(ent(r, 'Casualty highlights'), '. ');
  } else if (r.k === 'monument') {
    runs.push(ent(r, r.label), ' is one of the monuments listed on this site.');
  } else if (r.k === 'site') {
    runs.push(ent(r, r.label), '. ', endSent(a.ka || ''));
  } else runs.push(ent(r, r.label), '.');
  return runs;
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// evidence quotes as blocks (already selected by the engine)
// ---------------------------------------------------------------------------------------------------------------------------------------
export const quoteBlocks = (quotes) => quotes.map((q) => ({ ...q }));

// ---------------------------------------------------------------------------------------------------------------------------------------
// A2 command / succession
// ---------------------------------------------------------------------------------------------------------------------------------------
export function commandAnswer(kb, units, S) {
  const H = helpers(kb);
  const blocks = []; const src = [];
  // several echelons of the same name (both armies' "First Corps"): cover each, labelled
  const list = units.filter((u) => H.cmdOf(u)).slice(0, 3);
  if (!list.length) return null;
  const cites = [];
  for (const u of list) {
    const c = H.cmdOf(u);
    const runs = [ent(u, ucfirst(u.k === 'corps' ? u.label : H.nameForLead(u))), ' was commanded at Gettysburg by ', `${H.cmdText(c)}`];
    if (c.fate) runs.push(` (${fateText(c.fate)})`);
    if (c.succ && c.succ.length) runs.push(`; ${joinList(c.succ.map((s) => `${personLabel(s.rank, s.name)}${s.when ? ` (${s.when})` : ''}`))} took over after him`);
    runs.push('.');
    if (u.k === 'army' && u.attrs.assumed) runs.push(` He assumed command ${u.attrs.assumed.replace(/^\s*/, '')}.`);
    blocks.push(lead(runs, [u.id])); src.push(u.id);
    // succession records for this unit
    for (const sid of (kb.facts.succ.byUnit[u.id] || []).slice(0, 4)) {
      const s = H.get(sid); if (!s) continue;
      cites.push(s);
    }
    if (c.notes && list.length === 1) blocks.push(lead([endSent(c.notes)], [u.id]));
    if (/\b(brigades|regiments|divisions|commanders)\b/.test(S.norm) && ['division', 'corps', 'brigade'].includes(u.k) && list.length === 1) {
      const ks = H.kids(u).filter((k) => H.cmdOf(k)).slice(0, 12);
      if (ks.length) { blocks.push({ t: 'list', title: `${ucfirst({ division: 'brigades', corps: 'divisions', brigade: 'regiments' }[u.k])} and their commanders:`, items: ks.map((k) => ({ txt: `${k.label} — ${H.cmdText(H.cmdOf(k))}`, ent: k.id })), src: ks.map((k) => k.id) }); for (const k of ks.slice(0, 3)) src.push(k.id); }
    }
  }
  if (cites.length) {
    blocks.push({ t: 'list', title: 'Changes of command recorded during the battle:', items: cites.map((s) => ({ txt: `${s.title}${s.attrs.when ? ` (${s.attrs.when})` : ''}${s.attrs.source ? `, citing ${s.attrs.source}` : ''}`, ent: s.id })), src: cites.map((s) => s.id) });
    for (const s of cites) src.push(s.id);
  }
  return { mode: 'answer', blocks, src };
}

const sameName = (person, nameStr) => {
  if (!nameStr || !person) return false;
  const n = nameStr.toLowerCase();
  const sn = String(person.attrs.surname || '').toLowerCase();
  const g1 = String(person.attrs.given || '').split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  return n.includes(sn) && (!g1 || n.includes(g1));
};

export function successionAnswer(kb, S, opts = {}) {
  const H = helpers(kb);
  const ids = [];
  const seen = new Set();
  const add = (sid) => { if (!seen.has(sid)) { seen.add(sid); ids.push(sid); } };
  // by person mention
  for (const m of S.mentions) for (const i of m.ids || []) {
    const r = kb.idx.R[i];
    if (r.k === 'person') for (const sid of kb.facts.succ.byPerson[r.id] || []) add(sid);
    else if (H.isUnit(r)) for (const sid of kb.facts.succ.byUnit[r.id] || []) add(sid);
  }
  // person surnames that appear only inside succession records ("who replaced Reynolds")
  if (!ids.length && S.stems) {
    for (const r of kb.idx.R) if (r.k === 'succession' && r.attrs.from && S.stems.some((t) => S.surnameStem(r.attrs.from) === t)) add(r.id);
  }
  if (!ids.length) return null;
  let recs = ids.map(H.get).filter(Boolean);
  // "who replaced X": the record where X is the one relieved comes first; "how did X die": only those records
  const rel = opts.relieved || S.persons[0];
  if (rel) {
    const first = recs.filter((s) => sameName(rel, s.attrs.from)), rest = recs.filter((s) => !sameName(rel, s.attrs.from));
    recs = opts.relieved ? first.filter((s) => ['KIA', 'MW', 'WIA'].includes(s.attrs.cause)) : [...first, ...rest];
  }
  if (!recs.length) return null;
  // prefer records where the mentioned person is the one relieved (question "who replaced X")
  const blocks = []; const src = [];
  for (const s of recs.slice(0, 3)) {
    const a = s.attrs;
    const unit = a.unit ? H.get(a.unit) : null;
    const cause = { KIA: 'was killed in action', MW: 'was mortally wounded', WIA: 'was wounded', SICK: 'fell ill', REL: 'was relieved' }[a.cause];
    const runs = [];
    if (a.to && a.from) {
      if (opts.relieved) runs.push(`${personLabel(a.fromRank, a.from)} ${cause || 'left command'}${unit ? ` while commanding ${withThe(unit.label)}` : ''}; ${personLabel(a.toRank, a.to)} took over.`);
      else runs.push(`${personLabel(a.toRank, a.to)} took over`, unit ? ` ${withThe(unit.label)}` : '', ` after ${personLabel(a.fromRank, a.from)}`, cause ? ` ${cause}` : (a.cause ? ` (${a.cause})` : ''), '.');
      if (a.when) runs.push(` The record gives the time as ${a.when}.`);
    } else runs.push(ent(s, endSent(s.title)));
    if (a.notes) runs.push(' ', endSent(a.notes));
    if (a.source) runs.push(` (The site’s record cites ${a.source}.)`);
    blocks.push(lead(runs, [s.id])); src.push(s.id);
  }
  return { mode: 'answer', blocks, src };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// A3 strength and casualties
// ---------------------------------------------------------------------------------------------------------------------------------------
export function statsAnswer(kb, units, S, which) {
  const H = helpers(kb);
  const blocks = []; const src = [];
  const list = units.filter((u) => u.attrs && (typeof u.attrs.strength === 'number' || typeof u.attrs.casualties === 'number')).slice(0, 2);
  if (!list.length) return null;
  for (const u of list) {
    const a = u.attrs; const sp = statsPieces(u);
    const runs = [];
    const nm = ucfirst(H.nameForLead(u));
    const side = H.sideName(u);
    const armyLevel = u.k === 'army';
    if (which === 'casualties') {
      if (typeof a.casualties === 'number' && a.strength > 0 && !a.estStrength) runs.push(ent(u, nm), ` lost ${fmtN(a.casualties)} of about ${fmtN(a.strength)} men${a.pct != null ? ` (${fmtPct(a.pct)})` : ''}`);
      else if (a.casualties === 0) runs.push(ent(u, nm), ' has no casualties recorded');
      else runs.push(ent(u, nm), ` had ${fmtN(a.casualties)} casualties recorded`);
      if (armyLevel) runs.push(' at Gettysburg (killed, wounded and missing combined)');
      runs.push('.');
    } else {
      if (sp.strength) runs.push(ent(u, nm), ` had ${sp.strength} engaged${armyLevel ? ' at Gettysburg' : ''}`);
      else runs.push(ent(u, nm), ' has no reliable strength figure in the site’s records');
      if (sp.cas) runs.push(`, with ${sp.cas}`);
      runs.push('.');
    }
    if (sp.guns) runs.push(` It had ${sp.guns}.`);
    const days = H.daysOf(u); if (days && !armyLevel) runs.push(` It was engaged on ${days}.`);
    // rank sentence
    const rk = rankSentence(kb, u, which);
    if (rk) runs.push(' ', rk);
    if (a.ka && !armyLevel && u.k !== 'corps' && (a.ka.split(/\s+/).length <= 60)) runs.push(' ', endSent(a.ka));
    blocks.push(lead(runs, [u.id])); src.push(u.id);
  }
  // authority note
  const armies = list.filter((u) => u.k === 'army');
  if (armies.length) {
    const av = kb.facts.rollup.armyVsCorps;
    const bits = [];
    for (const u of armies) { const x = av[u.side]; if (x && x.corpsCasualties && x.armyCasualties && x.corpsCasualties !== x.armyCasualties) bits.push(`${SIDE_NAME[u.side]}: the corps-level rows in the site’s data add up to ${fmtN(x.corpsCasualties)} casualties against an army-level figure of ${fmtN(x.armyCasualties)}`); }
    blocks.push(note('authority-mixed', `${AUTH_NOTE}${bits.length ? ' ' + bits.join('; ') + '.' : ''} Casualties combine killed, wounded and missing.`));
  } else blocks.push(note('authority', AUTH_NOTE));
  return { mode: 'answer', blocks, src };
}

function rankSentence(kb, u, which) {
  if (!['regiment', 'brigade', 'division', 'corps'].includes(u.k)) return '';
  const key = `${u.k}.${which === 'casualties' ? 'rate' : 'losses'}.${u.side}`;
  const row = kb.facts.rank[key]; if (!row) return '';
  const pos = row.rows.findIndex((x) => x[0] === u.id);
  if (pos < 0 || pos > 4) return '';
  const nth = ['highest', 'second highest', 'third highest', 'fourth highest', 'fifth highest'][pos];
  return which === 'casualties' ? `That is the ${nth} casualty rate among ${SIDE_NAME[u.side]} ${u.k}s in the site’s records.` : '';
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// A4 superlatives
// ---------------------------------------------------------------------------------------------------------------------------------------
export function superlativeAnswer(kb, S) {
  const H = helpers(kb);
  const q = S.norm;
  const level = /\bcorps\b|corpsi|corpsv|corpsx/.test(q) ? 'corps' : /\bdivision/.test(q) ? 'division' : /\bbrigade/.test(q) ? 'brigade' : /\b(batter|gun|artiller)/.test(q) ? 'artillery' : 'regiment';
  const wantsRate = /\b(percent|percentage|rate|share)\b/.test(q);
  const lossCue = /\b(lost|lose|losses|casualt\w*|killed|deadliest|bloodiest|died|dead)\b/.test(q);
  const sizeCue = /\b(largest|biggest|smallest|size|strength|numerous)\b/.test(q) || (/\bmost men\b/.test(q) && !lossCue);
  const metric = wantsRate ? 'rate' : sizeCue && !lossCue ? 'size' : 'losses';
  let side = S.side || 'A';
  const words = q.split(' ');
  if (/\bconfederate|rebel|southern\b/.test(q)) side = 'C'; else if (/\bunion|federal|northern\b/.test(q)) side = 'U';
  // "highest casualty rate ... which regiment": rate when 'rate|percent|share' else losses (count) for "most men"; default for "highest casualties" -> rate is what the site's own note reports
  const met = metric === 'losses' && /\bhighest\b/.test(q) && !/\bmost\b|\bnumber\b|\bcount\b/.test(q) ? 'rate' : metric;
  const asc = /\b(smallest|fewest|lowest|least)\b/.test(q);
  const rows = kb.facts.rank[`${level}.${met}.${side}`]; if (!rows || !rows.rows.length) return null;
  const list = asc ? null : rows.rows;
  if (!list) return null;
  const blocks = []; const src = [];
  const top = list.slice(0, 3).map((x) => ({ r: H.get(x[0]), v: x[1], c: x[2], s: x[3] })).filter((x) => x.r);
  const fmtRow = (x) => (met === 'rate' ? `${ent(x.r).txt} — ${fmtPct(x.v)} (${fmtN(x.c)} of about ${fmtN(x.s)} men)` : met === 'losses' ? `${x.r.label} — ${fmtN(x.v)} casualties${x.s ? ` of about ${fmtN(x.s)} men` : ''}` : `${x.r.label} — about ${fmtN(x.v)} men`);
  const first = top[0];
  const sideTxt = side === 'A' ? '' : `${SIDE_NAME[side]} `;
  const what = met === 'rate' ? 'the highest casualty rate' : met === 'losses' ? 'the most casualties' : 'the largest strength';
  blocks.push(lead([ent(first.r, ucfirst(first.r.title || first.r.label)), ` had ${what} of any ${sideTxt}${level} in the site’s records: `, met === 'rate' ? `${fmtPct(first.v)} (${fmtN(first.c)} of about ${fmtN(first.s)} men)` : met === 'losses' ? `${fmtN(first.v)} casualties${first.s ? ` of about ${fmtN(first.s)} men` : ''}` : `about ${fmtN(first.v)} men`, '.'], [first.r.id]));
  src.push(first.r.id);
  if (top.length > 1) {
    blocks.push({ t: 'list', title: 'Next in the site’s records:', items: top.slice(1).map((x) => ({ txt: fmtRow(x).replace(/^.*?— /, `${x.r.label} — `), ent: x.r.id })), src: top.slice(1).map((x) => x.r.id) });
    for (const x of top.slice(1)) src.push(x.r.id);
  }
  blocks.push(note('rank-rule', `Rule: ${rows.rule}. ${AUTH_NOTE}`));
  // the site's own summary note, where it disagrees with the computed ranking, is worth naming
  if (level === 'regiment' && met === 'rate' && side !== 'U') {
    const cn = H.get('CAS:notable_intensity_notes');
    const conf = cn && cn.attrs.notes && cn.attrs.notes.highest_single_regiment_rate && cn.attrs.notes.highest_single_regiment_rate.confederate;
    const c26 = conf ? H.get(conf.unit) : null;
    if (c26 && first.r.id !== c26.id) { blocks.push(note('site-summary', `The site’s own summary note names the ${c26.title.replace(/ Infantry$/, '')} (${fmtPct(conf.rate)}), which has the most casualties by count rather than the highest rate.`)); src.push('CAS:notable_intensity_notes', c26.id); }
  }
  return { mode: 'answer', blocks, src };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// A10 compare
// ---------------------------------------------------------------------------------------------------------------------------------------
export function compareAnswer(kb, units, S) {
  const H = helpers(kb);
  const list = units.filter((u) => u.attrs && typeof u.attrs.strength === 'number').slice(0, 2);
  if (list.length < 2) return null;
  const [a, b] = list;
  const row = (u) => [u.label, H.cmdOf(u) ? H.cmdText(H.cmdOf(u)) : '—', u.attrs.strength && !u.attrs.estStrength ? fmtN(u.attrs.strength) : '—', typeof u.attrs.casualties === 'number' ? fmtN(u.attrs.casualties) : '—', u.attrs.pct != null && !u.attrs.estStrength ? fmtPct(u.attrs.pct) : '—', H.daysOf(u) || '—'];
  const blocks = []; const src = [a.id, b.id];
  const bigger = (a.attrs.strength || 0) === (b.attrs.strength || 0) ? null : (a.attrs.strength > b.attrs.strength ? [a, b] : [b, a]);
  const higher = (a.attrs.pct == null || b.attrs.pct == null || a.attrs.pct === b.attrs.pct) ? null : (a.attrs.pct > b.attrs.pct ? [a, b] : [b, a]);
  const runs = [ent(a), ' and ', ent(b), ': '];
  if (bigger) runs.push(`the ${bigger[0].label} was the larger, with about ${fmtN(bigger[0].attrs.strength)} men against about ${fmtN(bigger[1].attrs.strength)}. `);
  if (higher) runs.push(`The ${higher[0].label} lost the larger share of its men (${fmtPct(higher[0].attrs.pct)} against ${fmtPct(higher[1].attrs.pct)}).`);
  if (!bigger && !higher) runs.push('their figures in the site’s records are the same.');
  blocks.push(lead(runs, src));
  const both = kb.idx.R.filter((r) => (r.k === 'vignette' || r.k === 'chronology') && r.attrs.units && r.attrs.units.includes(a.id) && r.attrs.units.includes(b.id));
  if (both.length) blocks.push(lead(['Both appear in ', joinList(both.slice(0, 2).map((r) => `“${r.title.replace(/^The /, '')}” (${r.place || r.attrs.location}, ${DAY_NAME[r.attrs.day]})`)), ' in the site’s records.'], both.slice(0, 2).map((r) => r.id)));
  blocks.push({ t: 'table', kind: 'compare', caption: 'Side by side', cols: ['Unit', 'Commander', 'Men', 'Casualties', 'Rate', 'Engaged'], rows: [row(a), row(b)], src, note: AUTH_NOTE });
  return { mode: 'answer', blocks, src };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// A11 list / rollup
// ---------------------------------------------------------------------------------------------------------------------------------------
export function rollupAnswer(kb, S, { units }) {
  const H = helpers(kb);
  const state = S.stateMention;
  const blocks = []; const src = [];
  if (state) {
    const side = S.side || null;
    const keys = Object.keys(kb.facts.rollup.byState).filter((k) => k.split('|')[1].toLowerCase() === state && (!side || k.startsWith(side + '|')));
    if (!keys.length) return null;
    const cap = state.replace(/\b[a-z]/g, (c) => c.toUpperCase());
    const parts = [];
    let totalN = 0, totalCas = 0;
    const idsAll = [];
    for (const k of keys.sort()) {
      const g = kb.facts.rollup.byState[k]; totalN += g.n; totalCas += g.casualties; idsAll.push(...g.ids);
      parts.push({ side: k[0], g });
    }
    const sideTxt = side ? `${SIDE_NAME[side]} ` : (keys.length === 1 ? `${SIDE_NAME[keys[0][0]]} ` : '');
    const asksCount = /\bhow many\b/.test(S.norm);
    const recs = idsAll.map(H.get).filter(Boolean);
    const runs = [];
    runs.push(`According to the site’s order of battle there are ${totalN} ${sideTxt}${cap} regiment records`);
    const cav = recs.filter((r) => r.arm === 'cav').length; const art = recs.filter((r) => r.arm === 'art').length;
    if (cav) runs.push(` (including ${cav} cavalry)`);
    runs.push(`, with ${fmtN(totalCas)} casualties in total (the sum of those records’ figures, not a reconciled published total). Batteries are recorded separately.`);
    blocks.push(lead(runs, ['ARMY:' + (side || keys[0][0])]));
    if (!asksCount || totalN <= 14 || /\b(which|list|name)\b/.test(S.norm)) {
      const names = recs.sort((a, b) => (a.ord || 999) - (b.ord || 999) || (a.title < b.title ? -1 : 1)).map((r) => r.label);
      const shown = names.slice(0, 14);
      blocks.push({ t: 'list', title: `${cap} regiments:`, items: shown.map((n, i) => ({ txt: n, ent: recs.sort((a, b) => (a.ord || 999) - (b.ord || 999) || (a.title < b.title ? -1 : 1))[i].id })), more: names.length > shown.length ? `and ${names.length - shown.length} more` : '', src: recs.slice(0, 14).map((r) => r.id) });
    }
    for (const r of recs.slice(0, 3)) src.push(r.id);
    return { mode: 'answer', blocks, src };
  }
  // members of a brigade / division / corps
  const u = units.find((x) => ['brigade', 'division', 'corps'].includes(x.k));
  if (u) {
    const ks = H.kids(u);
    if (!ks.length) return null;
    const noun = { brigade: 'regiments', division: 'brigades', corps: 'divisions' }[u.k];
    const shown = ks.slice(0, 16);
    blocks.push(lead([ent(u, ucfirst(u.label)), ` had ${ks.length} ${noun} in the site’s records: ${joinList(shown.map((k) => k.label))}${ks.length > shown.length ? `, and ${ks.length - shown.length} more` : ''}.`], [u.id]));
    src.push(u.id, ...shown.slice(0, 3).map((k) => k.id));
    const c = H.cmdOf(u); if (c) blocks.push(lead([`${personLabel(c.rank, c.name)} commanded it${c.fate ? ` (${fateText(c.fate)})` : ''}.`], [u.id]));
    if (u.attrs.ka) blocks.push(lead([endSent(u.attrs.ka)], [u.id]));
    return { mode: 'answer', blocks, src };
  }
  return null;
}

/** guns and batteries per side */
export function gunsAnswer(kb, S) {
  const g = kb.facts.rollup.guns;
  if (!g || !g.U || !g.C) return null;
  const blocks = [lead([`According to the site’s battery records there are ${fmtN(g.U.guns)} Union guns in ${g.U.batteries} batteries and ${fmtN(g.C.guns)} Confederate guns in ${g.C.batteries} batteries.`], ['ARMY:U', 'ARMY:C']),
    note('guns-basis', 'These are counts from the site’s 103 battery records, which may be incomplete or overlap (some batteries appear under more than one corps); they are not an authoritative order-of-battle total.')];
  return { mode: 'answer', blocks, src: ['ARMY:U', 'ARMY:C'] };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// battle totals (army level)
// ---------------------------------------------------------------------------------------------------------------------------------------
export function battleTotals(kb, S, { which = 'both', clarify = false } = {}) {
  const U = kb.idx.get('ARMY:U'), C = kb.idx.get('ARMY:C');
  if (!U || !C) return null;
  const v = (x) => x.attrs;
  const runs = [];
  if (S.side === 'U' && which !== 'both') runs.push(`The Army of the Potomac had about ${fmtN(v(U).strength)} men at Gettysburg, with ${fmtN(v(U).casualties)} casualties (${fmtPct(v(U).pct)}).`);
  else if (S.side === 'C' && which !== 'both') runs.push(`The Army of Northern Virginia had about ${fmtN(v(C).strength)} men at Gettysburg, with ${fmtN(v(C).casualties)} casualties (${fmtPct(v(C).pct)}).`);
  else runs.push(`Union: about ${fmtN(v(U).strength)} men and ${fmtN(v(U).casualties)} casualties (${fmtPct(v(U).pct)}). Confederate: about ${fmtN(v(C).strength)} men and ${fmtN(v(C).casualties)} casualties (${fmtPct(v(C).pct)}).`);
  const blocks = [lead(runs, S.side === 'U' && which !== 'both' ? [U.id] : S.side === 'C' && which !== 'both' ? [C.id] : [U.id, C.id])];
  const av = kb.facts.rollup.armyVsCorps;
  const bits = [];
  for (const s of ['U', 'C']) { const x = av[s]; if (x && x.corpsCasualties !== x.armyCasualties) bits.push(`${SIDE_NAME[s]} corps-level rows add up to ${fmtN(x.corpsCasualties)} casualties against ${fmtN(x.armyCasualties)} at army level`); }
  blocks.push(note('authority-mixed', `${AUTH_NOTE} Casualties combine killed, wounded and missing, not deaths alone.${bits.length ? ' In the site’s data ' + bits.join('; ') + '.' : ''}`));
  if (clarify) blocks.push(note('clarify', 'If you meant a particular unit, place or day, name it and I will look up that record.'));
  return { mode: clarify ? 'clarify' : 'answer', blocks, src: S.side === 'U' && which !== 'both' ? [U.id] : S.side === 'C' && which !== 'both' ? [C.id] : [U.id, C.id] };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// outcome
// ---------------------------------------------------------------------------------------------------------------------------------------
export function outcomeAnswer(kb, S, premise) {
  const row = kb.facts.outcome;
  if (!row) return null;
  const blocks = [];
  if (premise) blocks.push(lead([premise], ['ARMY:C', 'ARMY:U']));
  blocks.push(lead([row.text], row.records));
  return { mode: 'answer', blocks, src: [...row.records, 'ARMY:U'], simpleOk: true };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// ancestor / roster honesty
// ---------------------------------------------------------------------------------------------------------------------------------------
export function ancestorAnswer(kb, S, unit) {
  const route = kb.facts.routes.find((r) => r.id === 'ancestor');
  const blocks = [];
  const src = [];
  // a named regiment is the concrete answer: lead with it, then the honest limit and the route
  if (unit) { blocks.push(lead(profileLead(kb, unit), [unit.id])); src.push(unit.id); }
  blocks.push(lead([unit ? 'The site can place the regiment but cannot confirm what an individual soldier did. ' : '', 'Use the ', { ent: 'SITE:find-ancestor', txt: 'Find Your Ancestor' }, ' tool (', { link: route.page, txt: route.page }, ') to look up a regiment by state or commander and follow it through the battle. This site holds regiments, not individual soldiers. For a soldier’s name, search the National Park Service Soldiers and Sailors Database.'], ['SITE:find-ancestor']));
  src.push('SITE:find-ancestor');
  return { mode: 'answer', blocks, src, route: 'ancestor' };
}

/** who fought X: units of the other side that share a vignette or chronology entry with X (or with X's brigade), from the site's own records */
export function opponentsAnswer(kb, unit) {
  const H = helpers(kb);
  const scope = [unit.id, ...(unit.par || []).slice(0, 2)];
  const found = new Map();
  for (const r of kb.idx.R) {
    if (r.k !== 'vignette' && r.k !== 'chronology') continue;
    const us = (r.attrs && r.attrs.units) || [];
    const hit = scope.find((x) => us.includes(x)); if (!hit) continue;
    for (const uid of us) {
      const u = H.get(uid);
      if (!u || !u.side || u.side === unit.side) continue;
      const cur = found.get(uid) || { u, via: [], direct: false };
      cur.via.push(r); cur.direct = cur.direct || hit === unit.id;
      found.set(uid, cur);
    }
  }
  const list = [...found.values()].sort((a, b) => (b.direct ? 1 : 0) - (a.direct ? 1 : 0) || (a.u.k === 'regiment' ? 0 : 1) - (b.u.k === 'regiment' ? 0 : 1) || b.via.length - a.via.length).slice(0, 4);
  if (!list.length) return null;
  const titles = [...new Set(list.flatMap((x) => x.via.map((v) => v.title.replace(/^The /, ''))))].slice(0, 3).map((t) => `“${t}”`);
  const blocks = [lead([ent(unit), ' faced ', joinList(list.map((x) => x.u.label)), ' in the site’s records (', joinList(titles), ').'], [unit.id, ...list.map((x) => x.u.id)])];
  return { mode: 'answer', blocks, src: [...list.map((x) => x.u.id), unit.id, ...list.flatMap((x) => x.via.slice(0, 1).map((v) => v.id))] };
}

export function soldierLimit(kb, S, unit) {
  const blocks = [lead(['I cannot tell whether a specific soldier was at Gettysburg: the site holds regiments, not individual muster rolls. For a soldier’s name, search the National Park Service Soldiers and Sailors Database, or use ', { ent: 'SITE:find-ancestor', txt: 'Find Your Ancestor' }, ' to look up a regiment.'], ['SITE:find-ancestor'])];
  const src = ['SITE:find-ancestor'];
  if (unit) { blocks.push(lead(['What the records do have is the regiment: ', ...profileLead(kb, unit)], [unit.id])); src.push(unit.id); }
  return { mode: 'answer', blocks, src, limited: true, route: 'ancestor' };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// echelons explainer
// ---------------------------------------------------------------------------------------------------------------------------------------
export function echelonAnswer(kb, S) {
  const H = helpers(kb);
  const reg = H.get('U-20ME'), bde = reg && H.parents(reg).find((x) => x.k === 'brigade'), div = reg && H.parents(reg).find((x) => x.k === 'division'), co = reg && H.parents(reg).find((x) => x.k === 'corps');
  if (!reg || !bde || !div || !co) return null;
  if (S.simple) return { mode: 'answer', blocks: [lead([kb.facts.glossary.echelons.text], [reg.id, bde.id, div.id, co.id])], src: [reg.id, bde.id, div.id, co.id] };
  const blocks = [lead([`${kb.facts.glossary.echelons.text} `,
    `As an example from the site’s records, the ${reg.label} (about ${fmtN(reg.attrs.strength)} men) served in ${bde.label} (about ${fmtN(bde.attrs.strength)} men), which was part of the ${div.title} (about ${fmtN(div.attrs.strength)} men) of the ${co.title.replace(/^(First|Second|Third|Fifth|Sixth|Eleventh|Twelfth) Corps$/, '$1 Corps')} (about ${fmtN(co.attrs.strength)} men).`], [reg.id, bde.id, div.id, co.id]),
    note('authority', AUTH_NOTE)];
  return { mode: 'answer', blocks, src: [reg.id, bde.id, div.id, co.id] };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// day summary (no clocks, no ticks): the critical events of the day in order
// ---------------------------------------------------------------------------------------------------------------------------------------
export function daySummary(kb, day, S) {
  const H = helpers(kb);
  const ids = (kb.facts.events.critical[day] || []).slice();
  if (!ids.length) return null;
  const recs = ids.map(H.get).filter(Boolean).sort((a, b) => a.attrs.tick - b.attrs.tick);
  const pick = recs.length > 7 ? recs.filter((_, i) => i % Math.ceil(recs.length / 7) === 0).slice(0, 7) : recs;
  const blocks = [lead([`Key moments of ${DAY_NAME[day]} in the site’s chronology, in order: `], pick.slice(0, 3).map((r) => r.id)),
    { t: 'list', title: '', items: pick.map((r) => ({ txt: `${r.title}${r.place ? ` (${r.place})` : ''}`, ent: r.id })), src: pick.map((r) => r.id) }];
  return { mode: 'answer', blocks, src: pick.slice(0, 3).map((r) => r.id) };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// limited answers
// ---------------------------------------------------------------------------------------------------------------------------------------
export function limitedPlace(kb, S, place, rule) {
  const H = helpers(kb);
  const runs = [rule.text.replace('{place}', /^The /.test(place.label) ? place.label.replace(/^The /, 'the ') : place.label)];
  const blocks = [lead(runs, [place.id])];
  const a = place.attrs || {};
  if (a.ka) blocks.push(lead(['What the records do say about it: ', endSent(a.ka)], [place.id]));
  // a figure attached to the place itself is quoted from its record, with its basis stated
  const m = (a.ka || '').match(/\b(?:nearly|approximately|about)?\s*[\d,]{3,} casualties\b/i);
  if (m) blocks.push(note('unsourced-figure', 'That figure is stated in the site’s terrain record without a unit-by-unit tally or a source, so treat it as an approximation for the whole engagement, not a count of deaths.'));
  return { mode: 'partial', blocks, src: [place.id], limited: true };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// membership: which brigade / division / corps was X part of
// ---------------------------------------------------------------------------------------------------------------------------------------
const LEVEL = { regiment: 0, artillery: 0, brigade: 1, division: 2, corps: 3, army: 4, 'artillery-unit': 1 };
export const levelOf = (r) => LEVEL[r.k] ?? -1;
/** ancestor of a unit at a given echelon ('brigade' | 'division' | 'corps' | 'army'); null when the records do not have it */
export function ancestorAt(kb, r, ech) {
  const H = helpers(kb);
  if (ech === 'army') return H.get('ARMY:' + r.side);
  const chain = H.parents(r);
  return chain.find((x) => x.k === ech) || null;
}
export function membershipAnswer(kb, S, unit, ech) {
  const H = helpers(kb);
  const chain = [...H.parents(unit)];
  const army = H.get('ARMY:' + unit.side); if (army && unit.k !== 'army') chain.push(army);
  const target = ech ? chain.find((x) => x.k === ech) : chain.find((x) => ['brigade', 'division', 'corps'].includes(x.k) && levelOf(x) > levelOf(unit));
  if (!target) return null;
  const blocks = [];
  const nm = ucfirst(H.nameForLead(unit));
  const also = chain.filter((x) => x !== target && levelOf(x) > levelOf(target) && ['division', 'corps'].includes(x.k)).slice(0, 2);
  const tl = target.k === 'brigade' && target.title !== target.label ? `${target.label} (${target.title})` : (target.k === 'corps' ? target.label : target.title === target.label ? target.label : `${target.label} (${target.title})`);
  blocks.push(lead([ent(unit, nm), ' was part of ', ent(target, withThe(tl)), also.length ? `, in ${also.map((x) => x.title).join(' and ')}` : '', '.'], [target.id, unit.id]));
  const a = target.attrs || {}; const sp = statsPieces(target);
  const bits = [];
  if (sp.strength) bits.push(`${ucfirst(sp.strength)} were engaged`);
  if (sp.cas) bits.push(sp.cas);
  if (bits.length) blocks.push(lead([ent(target, ucfirst(target.label)), ' had ', joinList(bits.map((b, i) => (i ? b : b.replace(' were engaged', ' engaged')))), '.'], [target.id]));
  const cm = H.cmdOf(target); if (cm) blocks.push(lead([`It was commanded by ${H.cmdText(cm)}${cm.fate ? ` (${fateText(cm.fate)})` : ''}.`], [target.id]));
  blocks.push(note('authority', AUTH_NOTE));
  return { mode: 'answer', blocks, src: [target.id, unit.id] };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// terrain superlative (highest point, lowest ground)
// ---------------------------------------------------------------------------------------------------------------------------------------
export function terrainSuperlative(kb, S) {
  const H = helpers(kb);
  const low = /\b(lowest|smallest)\b/.test(S.norm);
  const list = kb.idx.R.filter((r) => r.k === 'terrain' && typeof r.attrs.elevation === 'number').sort((a, b) => (low ? a.attrs.elevation - b.attrs.elevation : b.attrs.elevation - a.attrs.elevation));
  if (!list.length) return null;
  const top = list.slice(0, 3);
  const blocks = [lead([ent(top[0]), ` is the ${low ? 'lowest' : 'highest'} of the site\u2019s 30 key locations, at about ${fmtN(top[0].attrs.elevation)} feet. `, endSent(top[0].attrs.ka || '')], [top[0].id])];
  blocks.push({ t: 'list', title: `Next among key locations:`, items: top.slice(1).map((r) => ({ txt: `${r.label} \u2014 about ${fmtN(r.attrs.elevation)} feet`, ent: r.id })), src: top.slice(1).map((r) => r.id) });
  blocks.push(note('basis', 'Elevations are the figures in the site\u2019s terrain records (feet above sea level, approximate).'));
  return { mode: 'answer', blocks, src: top.map((r) => r.id) };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// overview of the battle (facts the site itself states)
// ---------------------------------------------------------------------------------------------------------------------------------------
export function overviewAnswer(kb, S) {
  const H = helpers(kb);
  const U = H.get('ARMY:U'), Cn = H.get('ARMY:C'), end = H.get('D3T675');
  if (!U || !Cn) return null;
  const when = (kb.facts.battle && kb.facts.battle.dates) || 'July 1 to 3, 1863';
  const blocks = [
    lead([`The Battle of Gettysburg was fought ${when}. The `, ent(U), ' under ', H.cmdText(H.cmdOf(U)), ' fought the ', ent(Cn), ' under ', H.cmdText(H.cmdOf(Cn)), `. ${kb.facts.outcome ? kb.facts.outcome.text + ' ' : ''}`,
      `The site’s records give about ${fmtN(U.attrs.strength)} Union and ${fmtN(Cn.attrs.strength)} Confederate men, with ${fmtN(U.attrs.casualties)} and ${fmtN(Cn.attrs.casualties)} casualties (killed, wounded and missing) respectively.`], ['ARMY:U', 'ARMY:C', 'D3T675']),
    note('authority-mixed', AUTH_NOTE)];
  return { mode: 'answer', blocks, src: ['ARMY:U', 'ARMY:C', 'D3T675'] };
}

/** two places side by side: elevation, the days they mattered, and the site's own one-line description of each */
export function comparePlaces(kb, places) {
  const [a, b] = places;
  const row = (r) => [r.label, typeof r.attrs.elevation === 'number' ? `about ${fmtN(r.attrs.elevation)} ft` : '—', daysText(r.attrs.days) || '—', r.attrs.ka || '—'];
  const blocks = [];
  const bits = [];
  if (typeof a.attrs.elevation === 'number' && typeof b.attrs.elevation === 'number' && a.attrs.elevation !== b.attrs.elevation) { const hi = a.attrs.elevation > b.attrs.elevation ? [a, b] : [b, a]; bits.push(`${hi[0].label} is the higher, at about ${fmtN(hi[0].attrs.elevation)} feet against about ${fmtN(hi[1].attrs.elevation)}.`); }
  blocks.push(lead([ent(a), ' and ', ent(b), ': ', ...(bits.length ? [bits[0]] : ['the site records them as separate places.'])], [a.id, b.id]));
  blocks.push({ t: 'table', kind: 'compare-places', caption: 'Side by side', cols: ['Place', 'Elevation', 'Relevant on', 'Site description'], rows: [row(a), row(b)], src: [a.id, b.id], note: 'Elevations are the figures in the site’s terrain records.' });
  return { mode: 'answer', blocks, src: [a.id, b.id] };
}

/** short lead for young readers: name and place only; the quotes carry the story */
export function simpleLead(kb, r) {
  const a = r.attrs || {};
  if (r.k === 'chronology') return [ent(r, ucfirst(r.title)), ` (${r.place || a.location}, ${DAY_NAME[a.day]}).`];
  if (r.k === 'vignette') return [ent(r, `“${r.title}”`), ` (${a.location}, ${DAY_NAME[a.day]}).`];
  return profileLead(kb, r);
}

/** several records sharing one nickname ("the Bucktails"): list the others after the lead */
export function sharedNameList(kb, focus, ids) {
  const H = helpers(kb);
  const others = ids.map((i) => kb.idx.R[i]).filter((r) => r && r.id !== focus.id && r.k !== 'person').slice(0, 6);
  if (!others.length) return null;
  return { t: 'list', title: 'The same name is used for:', items: others.map((r) => ({ txt: r.title === r.label ? r.label : `${r.label} (${r.title})`, ent: r.id })), src: others.map((r) => r.id) };
}

export { lead, note, ent, AUTH_NOTE };
