// facts.mjs - deterministic fact tables (tier T1). Every number a composer prints comes from an entity attribute or a row computed here (invariant I2).
//   rank      precomputed superlatives with their rule text ("regiments with strength >= 100")
//   rollup    per-state / per-side / per-echelon counts and sums, guns per side, army-vs-corps reconciliation
//   succ      commander successions indexed by unit and by person (the "tenures" table)
//   events    the chronology by day (ids only; text lives in the passage tier; tick-derived clock labels are never carried)
//   scope, unknowns, routes, domain   compiled from tools/historian/data/scope.v1.json
import { parseName } from './names.mjs';
export function buildFacts(site, reg, scopeCfg, { clock = null } = {}) {
  const R = reg.entities;
  const infantry = R.filter((e) => e.k === 'regiment' && !reg.canonOf.has(e.id) && !e.detach);
  const regs = R.filter((e) => e.k === 'regiment' && !reg.canonOf.has(e.id));
  const sideOf = (e) => e.side;

  // ---- rank -------------------------------------------------------------------------------------------------------------------------
  const rank = {};
  const RULE_MIN = 100;
  const row = (e, key) => [e.id, e.attrs[key], e.attrs.casualties, e.attrs.strength];
  const top = (list, key, n = 10) => list.filter((e) => typeof e.attrs[key] === 'number').sort((a, b) => b.attrs[key] - a.attrs[key] || (a.id < b.id ? -1 : 1)).slice(0, n).map((e) => row(e, key));
  // the other end of the same ranking, for "smallest" / "lowest": records with a real figure only (a strength of 0 means "not recorded", not "no men")
  const bottom = (list, key, n = 3) => list.filter((e) => typeof e.attrs[key] === 'number' && (key !== 'strength' || e.attrs[key] > 0)).sort((a, b) => a.attrs[key] - b.attrs[key] || (a.id < b.id ? -1 : 1)).slice(0, n).map((e) => row(e, key));
  const levels = { regiment: regs, brigade: R.filter((e) => e.k === 'brigade'), division: R.filter((e) => e.k === 'division'), corps: R.filter((e) => e.k === 'corps'), artillery: R.filter((e) => e.k === 'artillery') };
  for (const [level, list] of Object.entries(levels)) {
    for (const side of ['U', 'C', 'A']) {
      const L = list.filter((e) => side === 'A' || sideOf(e) === side);
      const big = L.filter((e) => (e.attrs.strength || 0) >= (level === 'regiment' || level === 'artillery' ? RULE_MIN : 1));
      const noEst = big.filter((e) => !(e.attrs.estCas));
      const rateRule = level === 'regiment' || level === 'artillery' ? `${level} records with strength of at least ${RULE_MIN}; records showing zero casualties excluded` : `${level} records`;
      rank[`${level}.rate.${side}`] = { rule: rateRule, rows: top(noEst, 'pct'), low: bottom(noEst.filter((e) => e.attrs.casualties > 0), 'pct') };
      rank[`${level}.losses.${side}`] = { rule: `${level} records ranked by casualty count`, rows: top(L, 'casualties'), low: bottom(L, 'casualties'), zero: L.filter((e) => e.attrs.casualties === 0).length };
      rank[`${level}.size.${side}`] = { rule: `${level} records ranked by strength`, rows: top(L, 'strength'), low: bottom(L, 'strength') };
    }
  }
  // the same rankings inside one state ("which Michigan regiment lost the most men", "the smallest Wisconsin regiment"): key `regiment.<metric>.<side>@<state>`, five from the top and three from the bottom.
  // A question that names a state is answered for that state; it is never answered for the whole army with the state silently dropped.
  const stateKey = (e) => String(e.state || '').toLowerCase();
  const states = [...new Set(regs.map(stateKey).filter(Boolean))].sort();
  for (const st of states) for (const side of ['U', 'C', 'A']) {
    const L = regs.filter((e) => stateKey(e) === st && (side === 'A' || sideOf(e) === side));
    if (!L.length) continue;
    const big = L.filter((e) => (e.attrs.strength || 0) >= RULE_MIN && !e.attrs.estCas);
    rank[`regiment.rate.${side}@${st}`] = { rule: `regiment records of this state with strength of at least ${RULE_MIN}; records showing zero casualties excluded`, rows: top(big, 'pct', 5), low: bottom(big.filter((e) => e.attrs.casualties > 0), 'pct'), n: L.length };
    rank[`regiment.losses.${side}@${st}`] = { rule: 'regiment records of this state ranked by casualty count', rows: top(L, 'casualties', 5), low: bottom(L, 'casualties'), zero: L.filter((e) => e.attrs.casualties === 0).length, n: L.length };
    rank[`regiment.size.${side}@${st}`] = { rule: 'regiment records of this state ranked by strength', rows: top(L, 'strength', 5), low: bottom(L, 'strength'), n: L.length };
  }

  // ---- rollup -----------------------------------------------------------------------------------------------------------------------
  const rollup = { byState: {}, bySide: {}, guns: {}, armyVsCorps: {}, echelons: {} };
  for (const e of regs) {
    const key = `${e.side}|${e.state || ''}`;
    const s = rollup.byState[key] || (rollup.byState[key] = { n: 0, ids: [], strength: 0, casualties: 0 });
    s.n++; s.ids.push(e.id); s.strength += e.attrs.strength || 0; s.casualties += e.attrs.casualties || 0;
  }
  for (const side of ['U', 'C']) {
    const L = regs.filter((e) => e.side === side);
    rollup.bySide[side] = { regiments: L.length, strength: L.reduce((a, e) => a + (e.attrs.strength || 0), 0), casualties: L.reduce((a, e) => a + (e.attrs.casualties || 0), 0) };
    const B = R.filter((e) => e.k === 'artillery' && e.side === side);
    rollup.guns[side] = { batteries: B.length, guns: B.reduce((a, e) => a + (e.attrs.gun_count || 0), 0), casualties: B.reduce((a, e) => a + (e.attrs.casualties || 0), 0) };
    const army = R.find((e) => e.id === 'ARMY:' + side);
    const corps = R.filter((e) => e.k === 'corps' && e.side === side);
    rollup.armyVsCorps[side] = {
      armyStrength: army.attrs.strength, armyCasualties: army.attrs.casualties,
      corpsStrength: corps.reduce((a, e) => a + (e.attrs.strength || 0), 0), corpsCasualties: corps.reduce((a, e) => a + (e.attrs.casualties || 0), 0),
    };
  }
  for (const lvl of ['brigade', 'division', 'corps']) for (const e of R.filter((x) => x.k === lvl)) rollup.echelons[e.id] = e.kids || [];

  // ---- succession index ---------------------------------------------------------------------------------------------------------------
  const succ = { byUnit: {}, byPerson: {} };
  for (const e of R.filter((x) => x.k === 'succession')) {
    const u = e.attrs.unit; if (u) (succ.byUnit[u] || (succ.byUnit[u] = [])).push(e.id);
    for (const nm of [e.attrs.from, e.attrs.to]) {
      if (!nm) continue;
      const pk = parseName(nm); if (!pk) continue;
      const pid = 'P:' + pk.key;
      if (reg.byId.has(pid)) (succ.byPerson[pid] || (succ.byPerson[pid] = [])).push(e.id);
    }
  }

  // ---- events ---------------------------------------------------------------------------------------------------------------------------
  const events = { byDay: { 1: [], 2: [], 3: [] }, critical: { 1: [], 2: [], 3: [] } };
  for (const e of R.filter((x) => x.k === 'chronology')) {
    events.byDay[e.attrs.day].push(e.id);
    if (e.attrs.sig === 'critical') events.critical[e.attrs.day].push(e.id);
  }

  // ---- scope, unknowns, routes ------------------------------------------------------------------------------------------------------------
  const facts = {
    schema: 1, rank, rollup, succ, events,
    clock, scope: scopeCfg.scope_out, unknowns: scopeCfg.unknowns, routes: scopeCfg.routes, domain: scopeCfg.domain_terms, premises: scopeCfg.premises, outcome: scopeCfg.outcome, glossary: scopeCfg.glossary,
    authority: {
      U: { site: 'the site’s order of battle', ...rollup.armyVsCorps.U },
      C: { site: 'the site’s order of battle', ...rollup.armyVsCorps.C },
    },
    battle: (() => { const m = String((site.battle && site.battle.name) || '').match(/^(.*?),\s*(July[^,]*,\s*\d{4})/); return m ? { name: m[1].trim(), dates: m[2].replace(/(\d)[\u2013-](\d)/, '$1 to $2') } : null; })(),
    intents: null,
  };
  return facts;
}
