// Kit manifests from kit/kit_specs.json (PDF B.6): the unit's own record when the regiment is in it, else the default for its army and arm. Items are copied as printed
// with their own tier and source keys. The B.6.12 kit validator is not part of this layer: `validator.passed` is null with a note, never true.
// Matching is by army and the unit key in the history id (for example us-1c-1d-meredith-19in -> US.19IN); a key that two history units share is not matched.
const FIELD_LABEL = { headgear: 'Headgear', coat: 'Coat or jacket', shirt: 'Shirt', trousers: 'Trousers', shoes: 'Footwear', accoutrements: 'Accoutrements', bayonet: 'Bayonet', sidearm_sword: 'Sidearm or sword', pack_state: 'Pack', flag_or_instrument: 'Colours or instrument', weapon: 'Shoulder arm', badge: 'Corps badge' };
const nice = s => String(s).replace(/_/g, ' ');
const TIERS = ['documented', 'inferred', 'plausible-procedural', 'open gap'];
export function buildKit({ raw, units }) {
  const K = raw.kit;
  const NA = (id, why) => ({ id: 'KIT-' + id, unit: id, valid_from: null, valid_to: null, items: [{ category: 'Kit', item: why, tier: 'open gap', sources: [], valid_from: null, valid_to: null }], validator: { rule: 'PDF B.6.12 kit validator', passed: null, note: 'not run: ' + why } });
  if (!K) return id => NA(id, 'kit data not available to this layer');
  const keyOf = u => u.army + '.' + u.id.split('-').pop().toUpperCase();
  const byKey = new Map();
  for (const u of units) { if (!['regiment', 'battalion'].includes(u.level)) continue; const k = keyOf(u); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(u.id); }
  const idToKit = new Map(); for (const [k, ids] of byKey) if (ids.length === 1 && K.units[k]) idToKit.set(ids[0], K.units[k]);
  const order = K.meta.field_order || Object.keys(FIELD_LABEL), cache = new Map(), by = new Map(units.map(u => [u.id, u]));
  const text = f => (f.allowed || []).map(a => { const lab = K.items[a.item] ? K.items[a.item].label.split(':')[0] : nice(a.item); return a.share ? `${a.share}: ${lab}` : lab; }).join('; ');
  const fn = (id) => {
    if (cache.has(id)) return cache.get(id);
    const u = by.get(id); let m;
    if (!u || u.children.length) m = NA(id, 'no kit record for a formation above the regiment');
    else {
      const rec = idToKit.get(id), arm = u.arm === 'cavalry' ? 'cavalry' : u.arm === 'artillery' ? 'artillery' : 'infantry', side = u.army === 'US' ? 'union' : 'confederate';
      const def = K.defaults[`default.${side}.${arm}`], fields = { ...(def ? def.fields : {}), ...(rec ? rec.fields : {}) }, items = [];
      for (const k of [...order, ...Object.keys(fields)].filter((x, i, a) => a.indexOf(x) === i)) {
        const f = fields[k]; if (!f || !f.allowed) continue;
        items.push({ category: FIELD_LABEL[k] || nice(k), item: text(f), tier: TIERS.includes(f.tier) ? f.tier : 'plausible-procedural', sources: f.source_keys || [], valid_from: null, valid_to: null });
      }
      m = items.length ? { id: 'KIT-' + id, unit: id, valid_from: null, valid_to: null, items, validator: { rule: 'PDF B.6.12 kit validator', passed: null, note: `not run: the validator is not part of this layer. Items are copied from kit/kit_specs.json (${rec ? 'the unit record ' + rec.id : 'the default for ' + side + ' ' + arm + ', no unit record'}); share words are the PDF's, weights are tuning parameters` } }
        : NA(id, 'the kit record carries no field for this unit');
    }
    cache.set(id, m); return m;
  };
  fn.matched = idToKit.size;
  return fn;
}
