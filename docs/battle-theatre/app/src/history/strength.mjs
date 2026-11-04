// Strengths. The PDF prints a figure only for the 13 corps rows of the B.3 table (Stone Sentinels, a weak source) and for 8 brigades. Those are carried as the printed
// single figures they are (no range is declared by the PDF and none is invented). A leaf unit (regiment, battalion, battery) with no figure of its own gets a PROCEDURAL SHARE:
// the figure of its nearest figured ancestor, less the figures of figured sub-units, shared equally by the leaf units that are on the field. This is not a claim about
// that unit: the basis string says so, the tier is plausible-procedural, the source is weak. Busey and Martin (regimental strengths) are not available.
//
//   strength = { min, max, basis, tier, sources, weak_source, drawn, kind }
//     kind 'printed'   : min = max = the printed figure (a single figure, range not declared); drawn = 0 for aggregates (the leaves carry the figures)
//     kind 'procedural': min = max = null (the record has no figure); drawn = the share, the number of figures the renderer instances
//     kind 'none'      : not on the field (gating rule 2) or no pool; drawn = 0
export const BASIS_PRINTED = 'single figure printed in the PDF B.3 table (Stone Sentinels, caveats in B.1; a weak source); the PDF declares no range, so none is given (C-047)';
export const BASIS_PROCEDURAL = 'plausible-procedural: corps figure shared by regiment count, Busey and Martin not available';

const isLeafLevel = u => ['regiment', 'battalion', 'battery', 'company', 'artillery_battalion'].includes(u.level) || (u.level === 'artillery_brigade' && u.children.length === 0 && u.arm === 'artillery') ||
  (u.children.length === 0 && ['brigade'].includes(u.level) && u.status !== 'on_field');
const onField = u => u.status === 'on_field' || u.status === 'partly_on_field';

// -> Map(unitId -> strength) for every unit, and a report of the pools
export function allocateStrengths(units) {
  const by = new Map(units.map(u => [u.id, u])); const kids = id => by.get(id).children.map(c => by.get(c));
  const out = new Map(), pools = [];
  const leavesUnder = id => { const r = []; const walk = u => { if (u.children.length === 0) { if (isLeafLevel(u)) r.push(u); } else for (const c of kids(u.id)) walk(c); }; walk(by.get(id)); return r; };
  const figure = u => (u.strength && Number.isFinite(u.strength.strength) ? u.strength.strength : null);
  // every leaf is claimed by its nearest figured ancestor (a figured brigade before a figured corps)
  const claimed = new Map();
  const figured = units.filter(u => figure(u) != null).map(u => u.id);
  const depth = id => { let d = 0, u = by.get(id); while (u.parent) { d++; u = by.get(u.parent); } return d; };
  for (const id of figured.sort((a, b) => depth(b) - depth(a))) for (const l of leavesUnder(id)) if (!claimed.has(l.id)) claimed.set(l.id, id);   // deepest figured ancestor first
  const members = new Map(figured.map(id => [id, []])); for (const [leaf, owner] of claimed) members.get(owner).push(by.get(leaf));
  const printed = id => { const s = by.get(id).strength; return { figure: figure(by.get(id)), label: s.label, lost: s.lost, basis_printed: s.basis_printed }; };
  for (const id of figured) {
    const ms = members.get(id).filter(onField), fig = figure(by.get(id));
    // figures of figured sub-units are inside this unit's figure already; the pool is what is left for the leaves it claims directly
    const sub = figured.filter(o => o !== id && isDescendant(by, o, id) && !figured.some(p => p !== o && p !== id && isDescendant(by, o, p) && isDescendant(by, p, id)));   // figured units directly inside (no figured unit between)
    const subFig = sub.reduce((s, o) => s + figure(by.get(o)), 0), pool = fig - subFig;
    const share = ms.length ? Math.round(pool / ms.length) : 0;
    pools.push({ owner: id, figure: fig, sub_figured: sub, pool, leaves_on_field: ms.length, leaves_not_on_field: members.get(id).length - ms.length, share, ...printed(id) });
    for (const l of members.get(id)) out.set(l.id, onField(l) ? { min: null, max: null, drawn: share, kind: 'procedural', basis: `${BASIS_PROCEDURAL}. Share ${share} = ${fmt(pool)} (${by.get(id).name_printed || by.get(id).name} figure${subFig ? ` less ${fmt(subFig)} printed for its sub-units` : ''}) / ${ms.length} leaf units on the field.`, tier: 'plausible-procedural', sources: ['SS-B3', 'PDF-B3'], weak_source: true, pool_owner: id }
      : { min: null, max: null, drawn: 0, kind: 'none', basis: 'not on the field (PDF B.2.4 gating rule 2): no figure is drawn', tier: 'inferred', sources: ['PDF-B24'], weak_source: false, pool_owner: id });
  }
  // printed figures on the units that carry them
  for (const id of figured) { const u = by.get(id), p = printed(id); out.set(id, { min: p.figure, max: p.figure, drawn: 0, kind: 'printed', basis: `${BASIS_PRINTED}; "${p.label}", lost ${fmt(p.lost)}`, tier: 'inferred', sources: ['SS-B3', 'PDF-B3'], weak_source: true, lost: p.lost }); }
  // everything else: aggregates and leaves with no pool
  for (const u of units) if (!out.has(u.id)) {
    if (u.children.length) out.set(u.id, { min: null, max: null, drawn: 0, kind: 'none', basis: 'aggregate: its leaf units carry the figures; no figure is printed for this unit', tier: 'inferred', sources: ['PDF-B3'], weak_source: true });
    else out.set(u.id, { min: null, max: null, drawn: 0, kind: 'none', basis: onField(u) ? 'no figure and no figured ancestor in the record' : 'not on the field (PDF B.2.4 gating rule 2): no figure is drawn', tier: 'open gap', sources: ['PDF-B24'], weak_source: false });
  }
  return { strengths: out, pools, claimed };
}
function isDescendant(by, id, anc) { let u = by.get(id); while (u && u.parent) { if (u.parent === anc) return true; u = by.get(u.parent); } return false; }
const fmt = n => Number(n).toLocaleString('en-US');
export { isLeafLevel, onField };
