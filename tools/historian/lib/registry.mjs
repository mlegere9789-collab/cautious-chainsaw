// registry.mjs - entity registry (tier T1): one record per unit / person / place / event / vignette / succession / site page, with DERIVED aliases.
// Ids are the site's own ids (U-20ME, C-15AL, BDE:U-I-1-1, DIV:..., CORPS:..., ARMY:U, ART:..., SUCC:..., LOC-###, V-###, DdTt) so every existing battery and
// golden-set id resolves; new namespaces: P:<slug> (person), ABDE:<id> (artillery brigade/battalion), MON:<id>, SITE:<route>, CAS:<name>.
import { baseNorm, tokenize, contentStems, cleanSite, splitSentences } from '../../../historian-src/core/text.js';
import { STATE_CODE, STATE_TITLE, parseDesignation, parseParenKeys, ARM_RANK } from '../../../historian-src/core/units.js';
import { parseName, ordinal, ordinalWord, capitalize, shortRank, RANK_ORDER, isGeneral, CORPS_ROMAN } from './names.mjs';
import { cleanProse, cleanShort, isCrossRef } from './clean.mjs';

const uniq = (a) => [...new Set(a.filter((x) => x !== undefined && x !== null && String(x).trim() !== ''))];
const surnameOf = (n) => { const p = parseName(n); return p ? p.surname : ''; };
const pct1 = (c, s) => (s > 0 ? Math.round((c / s) * 1000) / 10 : null);

/** Parentheticals that are nicknames, not disambiguators. */
function parenNicknames(des) {
  const out = [];
  for (const m of des.matchAll(/\(([^)]*)\)/g)) {
    for (const part of m[1].split('/').map((s) => s.trim())) {
      if (!part) continue;
      if (/detachment|companies|^xii corps|provisional|confederate|eastern shore|commanding|\bdivision$|\bcorps$/i.test(part) && !/brigade/i.test(part)) continue;
      out.push(part);
    }
  }
  return out;
}
const stripParen = (s) => s.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();

const SIDE_NAME = { U: 'Union', C: 'Confederate' };

export function buildRegistry(site, { curated = { entries: [] } } = {}) {
  const E = [];
  const byId = new Map();
  const labels = new Map(); // id -> display label (for humanising ids inside text)
  const add = (e) => { for (const k of ['title', 'label', 'short', 'place']) if (typeof e[k] === 'string') e[k] = cleanSite(e[k]); e.aliases = e.aliases || []; e.grp = e.grp || []; e.people = e.people || []; if (byId.has(e.id)) throw new Error('duplicate entity id ' + e.id); byId.set(e.id, e); E.push(e); return e; };

  // ------------------------------------------------------------------------------------------------------------------
  // pass 1: labels for every unit id (used by cleanProse to humanise ids embedded in site strings)
  // ------------------------------------------------------------------------------------------------------------------
  const regShort = (r) => {
    const pd = parseDesignation(r.designation);
    const state = pd ? STATE_TITLE(pd.state) : (r.state || '');
    let s;
    if (pd) {
      const armWord = { cav: ' Cavalry', res: ' Reserves', ss: ' Sharpshooters', bn: ' Battalion' }[pd.arm] || '';
      s = `${ordinal(pd.ord)} ${state === 'Brooklyn' ? 'New York' : state}${armWord}`;
    } else s = stripParen(r.designation).replace(/\s+(Volunteer\s+)?Infantry\b/i, '');
    const detach = /detachment|companies only|\(XII Corps\)/i.test(r.designation) || /-b$/.test(r.id);
    return detach ? `${s} (detachment)` : s;
  };
  const brigLabel = (b) => {
    const nick = (b.designation.match(/\(([^)]*)\)/) || [])[1];
    return nick && /brigade|bucktails/i.test(nick) ? nick.replace(/\s*\(.*$/, '') : stripParen(b.designation).replace(/, .*$/, '');
  };
  for (const r of site.regiments) labels.set(r.id, regShort(r));
  for (const b of site.brigades) labels.set(b.id, brigLabel(b));
  for (const b of site.brigades) labels.set('BDE:' + b.id, brigLabel(b));
  for (const d of site.divisions) { const l = /Division,/.test(d.designation) && /^(First|Second|Third) Division/.test(d.designation) ? stripParen(d.designation) : stripParen(d.designation); labels.set(d.id, l); labels.set('DIV:' + d.id, l); }
  for (const c of site.corps) { const l = `${SIDE_NAME[c.side]} ${stripParen(c.designation)}`; labels.set(c.id, l); labels.set('CORPS:' + c.id, l); }
  for (const b of site.batteries) labels.set(b.id, stripParen(b.designation));
  for (const a of site.artUnits) labels.set(a.id, stripParen(a.designation));
  const nameOf = (id) => labels.get(id) || null;
  const CP = { nameOf }; // cleanProse options

  // ------------------------------------------------------------------------------------------------------------------
  // people: parsed once from every commander mention; entities added at the end
  // ------------------------------------------------------------------------------------------------------------------
  const persons = new Map(); // key -> {key, names:Set, ranks:Set, given, surname, roles:[], fate, notes}
  const notePerson = (nm, role) => {
    const p = parseName(nm); if (!p || !p.key || !p.rank || /--|\bsuccessor\b/i.test(nm)) return null; // only ranked, real names become persons
    let rec = persons.get(p.key);
    if (!rec) { rec = { key: p.key, name: p.name, given: p.given, surname: p.surname, ranks: new Set(), roles: [], fate: null, notes: '' }; persons.set(p.key, rec); }
    if (p.rank) rec.ranks.add(p.rank);
    if (p.name.length > rec.name.length) { rec.name = p.name; rec.given = p.given; }
    rec.roles.push(role);
    return p;
  };

  // commander object -> normalised {name, rank, fate, notes, succ:[{name,rank,when}]}
  const cmdOf = (cm, unitId, unitLabel) => {
    if (!cm || !cm.name) return null;
    const p = parseName(cm.name);
    const succ = [];
    let s = cm.successor;
    while (s && s.name) { const sp = parseName(s.name); succ.push({ name: sp.name, rank: sp.rank, when: cleanShort(s.assumed_command || '', CP) }); notePerson(s.name, { unit: unitId, label: unitLabel, role: 'successor', when: cleanShort(s.assumed_command || '', CP) }); s = s.successor || s.second_successor; }
    if (cm.successor && cm.successor.second_successor && !succ.some((x) => x.name === parseName(cm.successor.second_successor.name).name)) { const s2 = cm.successor.second_successor; succ.push({ name: parseName(s2.name).name, rank: parseName(s2.name).rank, when: cleanShort(s2.assumed_command || '', CP) }); notePerson(s2.name, { unit: unitId, label: unitLabel, role: 'successor', when: '' }); }
    const fate = isCrossRef(cm.fate) ? '' : cleanShort(cm.fate || '', CP);
    const notes = cleanShort(cm.notes || '', CP);
    notePerson(cm.name, { unit: unitId, label: unitLabel, role: 'commander' });
    const rec = persons.get(p.key);
    if (rec && !rec.fate && fate) rec.fate = fate;
    if (rec && !rec.notes && notes) rec.notes = notes;
    return { name: p.name, rank: p.rank, fate, notes, succ, pkey: p.key };
  };

  // ------------------------------------------------------------------------------------------------------------------
  // regiments
  // ------------------------------------------------------------------------------------------------------------------
  const brigIds = new Set(site.brigades.map((b) => b.id)), divIds = new Set(site.divisions.map((b) => b.id)), corpsIds = new Set(site.corps.map((b) => b.id));
  const canonOf = new Map(); // detachment / alias id -> canonical id
  for (const r of site.regiments) {
    if (r.alias_for) { canonOf.set(r.id, r.alias_for); continue; }
    const pd = parseDesignation(r.designation);
    const label = labels.get(r.id);
    const cm = cmdOf(r.commander, r.id, label);
    const nicks = parenNicknames(r.designation);
    const grp = nicks.filter((n) => /brigade|division/i.test(n));
    const nick = nicks.filter((n) => !/brigade|division/i.test(n));
    const state = r.state && r.state !== 'Regular Army' ? r.state : (pd ? STATE_TITLE(pd.state) : '');
    const pcts = r.casualty_percentage != null ? r.casualty_percentage : pct1(r.casualties, r.strength);
    const par = [];
    if (r.parent_brigade_id && brigIds.has(r.parent_brigade_id)) par.push('BDE:' + r.parent_brigade_id);
    const bg = site.brigades.find((b) => b.id === r.parent_brigade_id);
    if (bg && bg.parent_division_id && divIds.has(bg.parent_division_id)) par.push('DIV:' + bg.parent_division_id);
    if (r.parent_corps_id && corpsIds.has(r.parent_corps_id)) par.push('CORPS:' + r.parent_corps_id);
    const detach = /detachment|companies only/i.test(r.designation) || /-b$|-XII$|-R-F$/.test(r.id) || /^See /.test(r.commander && r.commander.fate || '');
    if (detach) { const m = r.id.replace(/(-b|-B|-XII|-F|-EH)$/, ''); if (m !== r.id && site.regiments.some((x) => x.id === m)) canonOf.set(r.id, m); }
    const e = add({
      id: r.id, k: 'regiment', side: r.id.startsWith('C-') ? 'C' : 'U', title: stripParen(r.designation), label, short: label,
      arm: pd ? pd.arm : 'inf', ord: pd ? pd.ord : null, state, par, detach,
      body: cleanProse(`${state} ${r.key_action}`, CP) + ' ' + (cm && cm.fate ? cm.fate : ''),
      people: cm ? [cm.name, ...cm.succ.map((x) => x.name)] : [],
      attrs: { strength: r.strength, casualties: r.casualties, pct: pcts, pctDerived: r.casualty_percentage == null && pcts != null, days: r.days_engaged || [], cmd: cm, ka: cleanProse(r.key_action, CP), nick: nick, estCas: r.casualties === 0 && r.strength > 0, note: cleanShort(r.notes || '', CP) },
      grp, nick,
    });
    e.aliases.push(...nick);
    for (const nk of nick) {
      // "Berdan's" -> "Berdan's Sharpshooters"; "2nd Bucktails" / "Original Bucktails" -> "Bucktails"; "Garibaldi Guard" stays as is
      const armLabel = { ss: 'Sharpshooters', res: 'Reserves', cav: 'Cavalry' }[pd ? pd.arm : 'inf'];
      if (/'s$/.test(nk) && armLabel) e.aliases.push(`${nk} ${armLabel}`);
      const m = nk.match(/(?:^|\s)(Bucktails?|Zouaves|Guard|Rifles)$/i); if (m) e.aliases.push(m[1]);
      const t = nk.match(/^(?:1st|2nd|3rd|\d+th|Original)\s+(\S+)$/i); if (t) e.aliases.push(t[1]);
    }
  }
  // alias stubs (U-14BK): fold into the canonical record as an alias, never a card of their own
  for (const r of site.regiments) if (r.alias_for) { const c = byId.get(r.alias_for); if (c) c.aliases.push(stripParen(r.designation)); }

  // ------------------------------------------------------------------------------------------------------------------
  // brigades / divisions / corps / armies
  // ------------------------------------------------------------------------------------------------------------------
  const bdeMembers = new Map();
  for (const r of E) if (r.k === 'regiment' && r.par[0]) { const k = r.par[0]; (bdeMembers.get(k) || bdeMembers.set(k, []).get(k)).push(r.id); }
  for (const b of site.brigades) {
    const id = 'BDE:' + b.id, label = labels.get(id);
    const cm = cmdOf(b.commander, id, label);
    const nickAll = parenNicknames(b.designation);
    const sn = cm ? surnameOf(cm.name) : '';
    const par = [];
    if (b.parent_division_id && divIds.has(b.parent_division_id)) par.push('DIV:' + b.parent_division_id);
    if (b.parent_corps_id && corpsIds.has(b.parent_corps_id)) par.push('CORPS:' + b.parent_corps_id);
    const members = (b.regiment_ids || []).filter((x) => byId.has(x) && !canonOf.has(x));
    const e = add({
      id, k: 'brigade', side: b.side, title: stripParen(b.designation), label, short: label, par, kids: members, state: b.state || '',
      body: cleanProse(`${b.state || ''} ${b.key_action} ${b.notes || ''}`, CP) + ' ' + (cm ? cm.fate : ''),
      people: cm ? [cm.name, ...cm.succ.map((x) => x.name)] : [],
      attrs: { strength: b.strength, casualties: b.casualties, pct: b.casualty_percentage != null ? b.casualty_percentage : pct1(b.casualties, b.strength), days: b.days_engaged, cmd: cm, ka: cleanProse(b.key_action, CP), nick: nickAll, states: b.state || '' },
    });
    e.aliases.push(...nickAll);
    for (const nk of nickAll) { const t = nk.match(/^[A-Za-z.]+'s\s+(.+\s(?:Brigade|Bucktails))$/i) || nk.match(/^[A-Za-z.]+'s\s+(Bucktails)$/i); if (t) e.aliases.push(t[1]); }
    if (sn) e.aliases.push(`${sn}'s Brigade`, `${sn} Brigade`);
    if (/^(First|Second|Third|Fourth|Reserve)/.test(b.designation)) e.aliases.push(b.designation.replace(/\s*\(.*$/, ''));
  }
  for (const d of site.divisions) {
    const id = 'DIV:' + d.id, label = labels.get(id);
    const cm = cmdOf(d.commander, id, label);
    const sn = cm ? surnameOf(cm.name) : '';
    const nick = parenNicknames(d.designation);
    const par = d.parent_corps_id && corpsIds.has(d.parent_corps_id) ? ['CORPS:' + d.parent_corps_id] : [];
    if (!par.length) { const m = d.id.match(/^([UC]-(?:[IVX]+|CAV))-/); if (m && corpsIds.has(m[1])) par.push('CORPS:' + m[1]); }
    const e = add({
      id, k: 'division', side: d.side, title: stripParen(d.designation), label, short: label, par, kids: (d.brigade_ids || []).map((x) => 'BDE:' + x).filter((x) => byId.has(x)),
      body: cleanProse(`${d.notes || ''}`, CP) + ' ' + (cm ? cm.fate : ''), people: cm ? [cm.name, ...cm.succ.map((x) => x.name)] : [],
      attrs: { strength: d.strength, casualties: d.casualties, pct: d.casualty_percentage != null ? d.casualty_percentage : pct1(d.casualties, d.strength), days: d.days_engaged, cmd: cm, ka: cleanProse(d.notes || '', CP), nick },
    });
    e.aliases.push(...nick);
    if (sn) e.aliases.push(`${sn}'s Division`, `${sn} Division`);
    if (d.side === 'U') e.aliases.push(stripParen(d.designation));
  }
  for (const c of site.corps) {
    const id = 'CORPS:' + c.id, label = labels.get(id);
    const cm = cmdOf(c.commander, id, label);
    const sn = cm ? surnameOf(cm.name) : '';
    const roman = c.id.replace(/^[UC]-/, '');
    const e = add({
      id, k: 'corps', side: c.side, title: stripParen(c.designation), label, short: label, par: [], kids: (c.division_ids || []).map((x) => 'DIV:' + x).filter((x) => byId.has(x)),
      body: cleanProse(`${c.notes || ''}`, CP) + ' ' + (cm ? cm.fate + ' ' + cm.notes : ''), people: cm ? [cm.name, ...cm.succ.map((x) => x.name)] : [],
      attrs: { strength: c.strength, casualties: c.casualties, pct: c.casualty_percentage != null ? c.casualty_percentage : pct1(c.casualties, c.strength), days: c.days_engaged, cmd: cm, ka: cleanProse(c.notes || '', CP), chiefArt: c.chief_of_artillery || null, nick: [] },
    });
    e.aliases.push(`${roman} Corps`, `${sn} Corps`, `${sn}'s Corps`);
    if (CORPS_ROMAN[roman]) e.aliases.push(`${CORPS_ROMAN[roman]} Corps`, `${SIDE_NAME[c.side]} ${CORPS_ROMAN[roman]} Corps`);
    e.aliases.push(`${SIDE_NAME[c.side]} ${roman} Corps`);
    if (c.side === 'C' && c.id === 'C-I') e.aliases.push('Longstreet Corps'); // covered by surname alias above; explicit for clarity
  }
  for (const a of site.armies) {
    const label = a.side === 'U' ? 'Army of the Potomac' : 'Army of Northern Virginia';
    const cm = cmdOf(a.commander, a.id, label);
    add({
      id: a.id, k: 'army', side: a.side, title: a.designation, label, short: label, par: [], kids: site.corps.filter((c) => c.side === a.side).map((c) => 'CORPS:' + c.id),
      body: cleanProse(`${a.commander.notes || ''}`, CP) + ' ' + (cm ? cm.fate : ''), people: cm ? [cm.name] : [],
      attrs: { strength: a.strength, casualties: a.casualties, pct: a.casualty_percentage, days: [1, 2, 3], cmd: cm, ka: '', nick: [], assumed: cleanShort(a.commander.assumed_command || '', CP) },
      aliases: a.side === 'U' ? ['Union army', 'army of the potomac', 'federal army', 'Union', 'AoP', 'Union forces'] : ['Confederate army', 'army of northern virginia', 'ANV', 'rebel army', 'Confederate', 'Confederacy', 'Confederate forces', "Lee's army"],
    });
  }

  // ------------------------------------------------------------------------------------------------------------------
  // artillery
  // ------------------------------------------------------------------------------------------------------------------
  const abdeOf = new Map();
  for (const a of site.artUnits) for (const b of a.batteries) abdeOf.set(b, a.id);
  for (const a of site.artUnits) {
    const id = 'ABDE:' + a.id, label = labels.get(a.id);
    const cm = cmdOf(a.commander, id, label);
    const nick = parenNicknames(a.designation);
    const sn = cm ? surnameOf(cm.name) : '';
    const e = add({
      id, k: 'artillery-unit', side: a.side, title: stripParen(a.designation), label, short: label, par: a.corps ? ['CORPS:' + a.corps].filter((x) => byId.has(x)) : [], kids: a.batteries.map((x) => 'ART:' + x),
      body: cleanProse(a.notes || '', CP) + ' ' + (cm ? cm.fate + ' ' + cm.notes : ''), people: cm ? [cm.name] : [], attrs: { cmd: cm, ka: cleanProse(a.notes || '', CP), nick },
    });
    e.aliases.push(...nick);
    if (sn) e.aliases.push(`${sn}'s battalion`, `${sn}'s artillery`, `${sn} battalion`);
  }
  for (const b of site.batteries) {
    const label = labels.get(b.id);
    const cm = cmdOf(b.commander, 'ART:' + b.id, label);
    const nick = parenNicknames(b.designation);
    const parent = abdeOf.get(b.id);
    const sn = cm ? surnameOf(cm.name) : '';
    const templated = (b.gun_count === 4 && b.strength === 80) || (b.gun_count === 6 && b.strength === 107);
    const e = add({
      id: 'ART:' + b.id, k: 'artillery', side: b.side, title: stripParen(b.designation), label, short: label, par: parent ? ['ABDE:' + parent] : [],
      body: cleanProse(`${b.key_action} ${b.gun_type || ''}`, CP) + ' ' + (cm ? cm.fate : ''), people: cm ? [cm.name] : [],
      attrs: { strength: b.strength, casualties: b.casualties, pct: pct1(b.casualties, b.strength), gun_count: b.gun_count, gun_type: b.gun_type, cmd: cm, ka: cleanProse(b.key_action, CP), nick, estStrength: templated, days: [] },
    });
    e.aliases.push(...nick);
    if (sn) e.aliases.push(`${sn}'s Battery`, `${sn} Battery`);
    e.aliases.push(stripParen(b.designation));
  }
  for (const c of site.artChiefs) {
    if (!c.name) continue;
    notePerson(c.name, { unit: c.side === 'U' ? 'ARMY:U' : 'ARMY:C', label: `Chief of Artillery, ${c.scope}`, role: 'chief-artillery' });
    const rec = persons.get(parseName(c.name).key); if (rec && !rec.fate && c.fate) rec.fate = cleanShort(c.fate, CP); if (rec && !rec.notes && c.notes) rec.notes = cleanShort(c.notes, CP);
  }
  for (const c of site.artChiefsByCorps) {
    if (!c.name) continue;
    notePerson(c.name, { unit: 'CORPS:' + c.corps, label: `Chief of Artillery, ${labels.get('CORPS:' + c.corps)}`, role: 'chief-artillery' });
    const rec = persons.get(parseName(c.name).key); if (rec && !rec.fate && c.fate) rec.fate = cleanShort(c.fate, CP); if (rec && !rec.notes && c.notes) rec.notes = cleanShort(c.notes, CP);
  }

  // ------------------------------------------------------------------------------------------------------------------
  // successions
  // ------------------------------------------------------------------------------------------------------------------
  const unitIdOf = (x) => (byId.has(x) ? x : byId.has('BDE:' + x) ? 'BDE:' + x : byId.has('DIV:' + x) ? 'DIV:' + x : byId.has('CORPS:' + x) ? 'CORPS:' + x : byId.has('ART:' + x) ? 'ART:' + x : byId.has('ABDE:' + x) ? 'ABDE:' + x : null);
  for (const s of site.successions) {
    const okName = (n) => { const q = parseName(n); return q && q.rank && !/--|\bsuccessor\b/i.test(n) ? q : null; };
    const from = okName(s.from), to = okName(s.to);
    const uid = unitIdOf(s.unit_id);
    if (from) notePerson(s.from, { unit: uid, label: labels.get(uid) || '', role: 'relieved', when: cleanShort(s.approx_time, CP), cause: s.cause });
    if (to) notePerson(s.to, { unit: uid, label: labels.get(uid) || '', role: 'successor', when: cleanShort(s.approx_time, CP), cause: s.cause });
    add({
      id: 'SUCC:' + s.id, k: 'succession', side: s.side, title: cleanShort(s.event, CP), label: cleanShort(s.event, CP), short: cleanShort(s.event, CP), par: uid ? [uid] : [],
      body: cleanProse(`${s.notes} ${s.cause} ${s.approx_time}`, CP), people: [from && from.name, to && to.name].filter(Boolean),
      attrs: { unit: uid, from: from && from.name, fromRank: from && from.rank, to: to && to.name, toRank: to && to.rank, cause: cleanShort(s.cause || '', CP), when: cleanShort(s.approx_time, CP), notes: cleanProse(s.notes, CP), source: cleanShort(s.source, CP) },
    });
  }

  // ------------------------------------------------------------------------------------------------------------------
  // terrain
  // ------------------------------------------------------------------------------------------------------------------
  for (const l of site.locations) {
    const paren = (l.name.match(/\(([^)]+)\)/) || [])[1];
    const clean = stripParen(l.name).replace(/^The /, '');
    const e = add({
      id: l.id, k: 'terrain', side: null, title: l.name.replace(/^Gulp's/, "Culp's"), label: stripParen(l.name), short: stripParen(l.name), par: [],
      place: l.name, body: cleanProse(l.significance, CP),
      attrs: { elevation: l.elevation_ft, days: l.day_relevance, ka: cleanProse(l.significance, CP), lat: l.lat, lng: l.lng },
    });
    e.aliases.push(clean, ...(paren ? [paren] : []), l.name.replace(/^Gulp/, 'Culp'));
    if (/^The /.test(l.name)) e.aliases.push(l.name);
  }
  for (const x of site.roads) { const e = add({ id: 'ROAD:' + x.id, k: 'road', side: null, title: x.name, label: stripParen(x.name), short: stripParen(x.name), par: [], place: x.name, body: cleanProse(`${x.direction} ${x.significance}`, CP), attrs: { ka: cleanProse(x.significance, CP), direction: x.direction } }); e.aliases.push(stripParen(x.name)); }
  for (const x of site.structures) { const e = add({ id: 'STR:' + x.id, k: 'structure', side: null, title: x.name, label: stripParen(x.name), short: stripParen(x.name), par: [], place: x.name, body: cleanProse(x.significance, CP), attrs: { ka: cleanProse(x.significance, CP), stype: x.type } }); e.aliases.push(stripParen(x.name), ...(x.name.match(/\(([^)]+)\)/) ? [x.name.match(/\(([^)]+)\)/)[1]] : [])); }
  for (const x of site.features) { const e = add({ id: 'TF:' + x.id, k: 'feature', side: null, title: x.name, label: stripParen(x.name), short: stripParen(x.name), par: [], place: x.name, body: cleanProse(x.significance, CP), attrs: { ka: cleanProse(x.significance, CP), ftype: x.type } }); e.aliases.push(stripParen(x.name)); }

  // ------------------------------------------------------------------------------------------------------------------
  // vignettes and chronology events
  // ------------------------------------------------------------------------------------------------------------------
  const dayOfTick = (t) => (t <= 225 ? 1 : t <= 450 ? 2 : 3);
  for (const v of site.vignettes) {
    const e = add({
      id: v.id, k: 'vignette', side: null, title: v.title, label: v.title, short: v.title, par: [], place: v.trigger_location,
      body: cleanProse(`${v.panel_summary}\n\n${v.full_script}`, CP),
      attrs: { summary: cleanProse(v.panel_summary, CP), day: dayOfTick(v.trigger_tick), units: v.units_featured.map((u) => unitIdOf(u)).filter(Boolean), location: cleanSite(v.trigger_location), tick: v.trigger_tick },
    });
    e.aliases.push(v.title.replace(/^The /, ''));
  }
  const caseLabel = (s) => s.toLowerCase().replace(/(^|[\s(\-])([a-z])/g, (m, p, c) => p + c.toUpperCase()).replace(/'S\b/g, "'s").replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (m, n, t) => n + t.toLowerCase()).replace(/\bKia\b/g, 'KIA').replace(/\bUs\b/g, 'US').replace(/\bNc\b/g, 'NC').replace(/\bNy\b/g, 'NY').replace(/\bPa\b/g, 'PA')
    .replace(/(\S) (Of|The|And|In|At|On|To|For|By|Or|A|An|With|Over|Into|From)(?= )/g, (m, p, w) => `${p} ${w.toLowerCase()}`);   // small words stay small ("Armistead Leads Men over the Wall")
  for (const ev of site.chronology) {
    const text = cleanProse(ev.event, CP);
    const lead = (ev.event.match(/^([A-Z0-9][A-Z0-9'’\-]+(?: [A-Z0-9'’\-]+){1,8})(?:[.:]| --)\s/) || [])[1];
    const first = (splitSentences(text)[0] ? text.slice(splitSentences(text)[0].s, splitSentences(text)[0].e) : text).replace(/^[^A-Za-z0-9]+/, '');
    const title = lead ? caseLabel(lead) : (first.length > 96 ? first.slice(0, 93).replace(/\s+\S*$/, '') + '…' : first);
    const e = add({
      id: ev.id, k: 'chronology', side: null, title, label: title, short: title, par: [], place: ev.location,
      body: `${text} ${cleanProse(ev.narrative, CP)}`,
      attrs: { day: ev.day, sig: ev.significance, location: cleanSite(ev.location), units: (ev.units_involved || []).map((u) => unitIdOf(u)).filter(Boolean), tick: ev.tick, text, narrative: cleanProse(ev.narrative, CP) },
    });
    if (lead) {
      e.aliases.push(lead);
      const toks = lead.split(' ');
      const last = toks[toks.length - 1].toLowerCase();
      if (toks.length > 2 && /^(begins|kia|killed|wounded|falls|collapses|arrives|ends|starts|opens|assault|charge|advance)$/.test(last)) e.aliases.push(toks.slice(0, -1).join(' '));
      if (toks.length > 3 && /^(mortally|leads|men)$/.test(toks[toks.length - 2].toLowerCase())) e.aliases.push(toks.slice(0, -2).join(' '));
    }
  }

  // ------------------------------------------------------------------------------------------------------------------
  // casualty notes, monuments, site pages
  // ------------------------------------------------------------------------------------------------------------------
  const n = site.casualtyNotes;
  add({
    id: 'CAS:notable_intensity_notes', k: 'casualty-note', side: null, title: 'Highest regimental casualty rates and most intense periods of the battle', label: 'Casualty highlights', short: 'Casualty highlights', par: [],
    body: cleanProse(`Highest single-regiment casualty rate: Union ${n.highest_single_regiment_rate.union.note} (${n.highest_single_regiment_rate.union.rate}%); Confederate ${n.highest_single_regiment_rate.confederate.note} (${n.highest_single_regiment_rate.confederate.rate}%). ${n.most_compressed_union.note} ${n.most_compressed_confederate.note} ${n.longest_sustained_action.note}`, CP),
    aliases: ['highest casualties', 'deadliest regiment', 'worst casualties', 'highest casualty rate', 'most casualties', 'bloodiest regiment'],
    attrs: { ka: '', notes: (() => { const c = JSON.parse(JSON.stringify(n)); const walk = (o) => { for (const k of Object.keys(o)) { if (k === 'note') o[k] = cleanShort(o[k], CP); else if (o[k] && typeof o[k] === 'object') walk(o[k]); } }; walk(c); return c; })() },
  });
  for (const m of site.monuments) {
    const e = add({ id: 'MON:' + m.id, k: 'monument', side: m.side === 'confederate' ? 'C' : m.side === 'union' ? 'U' : null, title: m.name, label: m.name, short: m.name, par: [], body: cleanProse(m.name, CP), attrs: { ka: '', src: m.source, lat: m.lat, lng: m.lng } });
    e.aliases.push(m.name.replace(/ State Memorial$/, ' Memorial'));
  }
  add({
    id: 'SITE:find-ancestor', k: 'site', side: null, title: 'Find Your Ancestor', label: 'Find Your Ancestor', short: 'Find Your Ancestor', par: [],
    body: 'Look up your ancestor: pick their regiment and follow its movements through the battle. Find your ancestor by regiment, state or commander.',
    aliases: ['find my ancestor', 'ancestor', 'great grandfather', 'genealogy', 'family history', 'soldier named'], attrs: { href: '/find-ancestor.html', ka: 'Look up a regiment by state or commander and follow it through the battle.' },
  });

  // ------------------------------------------------------------------------------------------------------------------
  // persons (after every commander mention was collected)
  // ------------------------------------------------------------------------------------------------------------------
  const personEntities = [];
  for (const rec of [...persons.values()].sort((a, b) => (a.key < b.key ? -1 : 1))) {
    const rank = [...rec.ranks].sort((a, b) => (RANK_ORDER[b] || 0) - (RANK_ORDER[a] || 0))[0] || '';
    const roles = rec.roles.filter((r) => r.unit && byId.has(r.unit));
    const seen = new Set(); const uroles = [];
    for (const r of roles) { const k = r.unit + '|' + r.role; if (!seen.has(k)) { seen.add(k); uroles.push(r); } }
    const label = `${rank ? shortRank(rank) + ' ' : ''}${rec.name}`;
    const e = add({
      id: 'P:' + rec.key, k: 'person', side: null, title: `${rank ? rank + ' ' : ''}${rec.name}`, label, short: rec.name, par: [], people: [rec.name], body: rec.fate || '',
      attrs: { rank, name: rec.name, given: rec.given, surname: rec.surname, fate: rec.fate || '', notes: rec.notes || '', roles: uroles.map((r) => ({ u: r.unit, l: r.label, r: r.role, w: r.when || '' })), general: isGeneral(rank), prom: 0 },
    });
    const sn = rec.surname, given = rec.given;
    e.aliases.push(rec.name, ...(given ? [`${given.split(' ')[0]} ${sn}`] : []));
    for (const rk of rec.ranks) e.aliases.push(`${rk} ${sn}`, `${shortRank(rk)} ${sn}`);
    if (isGeneral(rank)) e.aliases.push(`General ${sn}`);
    personEntities.push(e);
  }
  // prominence: the highest echelon a person commanded (army 4, corps 3, division 2, brigade 1) - decides whether a bare surname is ambiguous ("Lee", "Hays")
  const LEVEL = { army: 4, corps: 3, division: 2, brigade: 1 };
  for (const p of personEntities) p.attrs.prom = Math.max(0, ...p.attrs.roles.filter((r) => r.r === 'commander').map((r) => LEVEL[(byId.get(r.u) || {}).k] || 0));
  // side for persons (from the side of their first unit role)
  for (const p of personEntities) { const r = p.attrs.roles[0]; const u = r && byId.get(r.u); p.side = u ? u.side : null; }

  // ------------------------------------------------------------------------------------------------------------------
  // derived regiment aliases from the grammar (explicit surface forms: "1st Minnesota", "First Minnesota", "1 MN", "1st MN")
  // ------------------------------------------------------------------------------------------------------------------
  const unitKeys = new Map();
  const addKey = (key, id, arm) => { const arr = unitKeys.get(key) || unitKeys.set(key, []).get(key); if (!arr.some((x) => x.id === id)) arr.push({ id, arm }); };
  for (const e of E) {
    if (e.k !== 'regiment' && !(e.k === 'artillery' && parseDesignation(e.title))) continue;
    const pd = parseDesignation(e.title.replace(/\s*\(.*$/, '') + ' ' + '');
    const src = site.regiments.find((r) => r.id === e.id);
    const des = src ? src.designation : e.title;
    const p = parseDesignation(des);
    if (p) {
      const st = p.state;
      addKey(`#${p.ord}|${st}`, e.id, p.arm);
      const code = STATE_CODE[st];
      const stT = STATE_TITLE(st === 'brooklyn' ? 'new york' : st);
      const ordW = capitalize(ordinalWord(p.ord));
      const armWord = { cav: ' Cavalry', res: ' Reserves', ss: ' Sharpshooters', bn: ' Battalion' }[p.arm] || '';
      const base = `${ordinal(p.ord)} ${stT}${armWord}`;
      e.aliases.push(base, `${ordW} ${stT}${armWord}`, `${p.ord} ${stT}${armWord}`);
      if (code) e.aliases.push(`${ordinal(p.ord)} ${code}${armWord}`, `${p.ord} ${code}${armWord}`);
      if (p.arm === 'inf') e.aliases.push(`${ordinal(p.ord)} ${stT} Infantry`, `${ordinal(p.ord)} ${stT} Volunteers`);
    }
    for (const pk of parseParenKeys(des)) addKey(`#${pk.ord}|${pk.state}`, e.id, pk.arm);
    // artillery-style designation aliases handled in the artillery block
  }
  // "14th Brooklyn": explicit
  const bk = site.regiments.find((r) => r.alias_for);
  if (bk && byId.has(bk.alias_for)) addKey('#14|brooklyn', bk.alias_for, 'inf');

  // ------------------------------------------------------------------------------------------------------------------
  // people aliases on their units: commander names are searchable, but they LINK to the person; units keep them in BM25 `people`.
  // ------------------------------------------------------------------------------------------------------------------

  // ------------------------------------------------------------------------------------------------------------------
  // curated aliases (seed file): attach variants to entities that already own the canon phrase, or to explicit targets
  // ------------------------------------------------------------------------------------------------------------------
  const surfaceIndex = new Map();
  const reindex = () => { surfaceIndex.clear(); for (const e of E) for (const s of [e.title, e.label, ...e.aliases]) { const k = contentStems(s).join(' '); if (k) (surfaceIndex.get(k) || surfaceIndex.set(k, new Set()).get(k)).add(e.id); } };
  reindex();
  const curatedApplied = [];
  for (const ent of curated.entries || []) {
    let targets = ent.targets ? ent.targets.filter((t) => byId.has(t)) : [...(surfaceIndex.get(contentStems(ent.canon).join(' ')) || [])];
    // never let a curated entry attach to a person/regiment by accident when targeting a brigade/place canon
    if (!ent.targets) targets = targets.filter((t) => byId.get(t).k !== 'person');
    for (const t of targets) { const e = byId.get(t); e.aliases.push(ent.canon, ...(ent.variants || [])); }
    curatedApplied.push({ canon: ent.canon, targets });
  }

  // finalise aliases: cleaned, unique, never the empty string
  for (const e of E) {
    const seen = new Set(); const out = [];
    for (const a of [...e.aliases]) {
      const t = cleanSite(a).replace(/^the\s+/i, (m) => m); if (!t) continue;
      const k = baseNorm(t); if (!k || seen.has(k)) continue; seen.add(k); out.push(t);
    }
    e.aliases = out;
  }
  return { entities: E, byId, labels, unitKeys, canonOf, persons: personEntities, curatedApplied, nameOf };
}
