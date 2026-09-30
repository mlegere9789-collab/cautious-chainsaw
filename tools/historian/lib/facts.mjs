// facts.mjs - deterministic fact tables (tier T1). Every number a composer prints comes from an entity attribute or a row computed here (invariant I2).
//   rank      precomputed superlatives with their rule text ("regiments with strength >= 100")
//   rollup    per-state / per-side / per-echelon counts and sums, guns per side, army-vs-corps reconciliation
//   succ      commander successions indexed by unit and by person (the "tenures" table)
//   events    the chronology by day (ids only; text lives in the passage tier; tick-derived clock labels are never carried)
//   scope, unknowns, routes, domain   compiled from tools/historian/data/scope.v1.json
import { parseName } from './names.mjs';
export function buildFacts(site, reg, scopeCfg) {
  const R = reg.entities;
  const infantry = R.filter((e) => e.k === 'regiment' && !reg.canonOf.has(e.id) && !e.detach);
  const regs = R.filter((e) => e.k === 'regiment' && !reg.canonOf.has(e.id));
  const sideOf = (e) => e.side;

  // ---- rank -------------------------------------------------------------------------------------------------------------------------
  const rank = {};
  const RULE_MIN = 100;
  const top = (list, key, n = 10) => list.filter((e) => typeof e.attrs[key] === 'number').sort((a, b) => b.attrs[key] - a.attrs[key] || (a.id < b.id ? -1 : 1)).slice(0, n)
    .map((e) => [e.id, e.attrs[key], e.attrs.casualties, e.attrs.strength]);
  const levels = { regiment: regs, brigade: R.filter((e) => e.k === 'brigade'), division: R.filter((e) => e.k === 'division'), corps: R.filter((e) => e.k === 'corps'), artillery: R.filter((e) => e.k === 'artillery') };
  for (const [level, list] of Object.entries(levels)) {
    for (const side of ['U', 'C', 'A']) {
      const L = list.filter((e) => side === 'A' || sideOf(e) === side);
      const big = L.filter((e) => (e.attrs.strength || 0) >= (level === 'regiment' || level === 'artillery' ? RULE_MIN : 1));
      const noEst = big.filter((e) => !(e.attrs.estCas));
      rank[`${level}.rate.${side}`] = { rule: level === 'regiment' || level === 'artillery' ? `${level} records with strength of at least ${RULE_MIN}; records showing zero casualties excluded` : `${level} records`, rows: top(noEst, 'pct') };
      rank[`${level}.losses.${side}`] = { rule: `${level} records ranked by casualty count`, rows: top(L, 'casualties') };
      rank[`${level}.size.${side}`] = { rule: `${level} records ranked by strength`, rows: top(L, 'strength') };
    }
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
    scope: scopeCfg.scope_out, unknowns: scopeCfg.unknowns, routes: scopeCfg.routes, domain: scopeCfg.domain_terms, premises: scopeCfg.premises,
    authority: {
      U: { site: 'the site’s order of battle', ...rollup.armyVsCorps.U },
      C: { site: 'the site’s order of battle', ...rollup.armyVsCorps.C },
    },
    battle: (() => { const m = String((site.battle && site.battle.name) || '').match(/^(.*?),\s*(July[^,]*,\s*\d{4})/); return m ? { name: m[1].trim(), dates: m[2].replace(/(\d)[\u2013-](\d)/, '$1 to $2') } : null; })(),
    intents: null,
  };
  return facts;
}
