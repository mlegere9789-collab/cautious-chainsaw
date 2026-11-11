// ACWII mod provider (Battle Theatre figures): a data-driven, INERT-BY-DEFAULT adapter between the figure system and the cleared ACW mod assets of data/figures3d/acw/.
// Rights: owner-reported verbal permission from the mod author, 2026-11-11; no written text on file (decision log DEC-DELEG-F). The mod author can license only files he made, so every mod file was
// decided by evidence (tools/bt/acw/policy.py): the manifest lists every inclusion and exclusion with its codes. Result of that decision today: NO mod mesh is cleared (every soldier/officer/gun
// mesh is base-game derived, a placeholder, unverified or unevidenced), so the procedural figures stay and the gap is registered (EG-FIG-0012); only the mod-painted Confederate shell-jacket texture
// sheets (Subversion committer ACW_Primergy, no base-game marker) are cleared, and they are used as LEAD colour swatches, never as proof of what a regiment wore (EG-FIG-0011).
// Tier of everything from this module: plausible-procedural (a swatch is a lead colour of the mod artist). Never documented. One-to-one instancing, LOD and the mobile budget are untouched:
// nothing here adds a draw call, a triangle or a per-figure cost (costModel()).
import { TIERS_ACW } from './acw-tiers.mjs';

export const ACW_CREDIT_LINE = "ACWII mod by ACW_Primergy and team (used with the author's permission)";
export const ACW_LICENCE_BASIS = 'owner-reported verbal permission from the mod author, 2026-11-11; no written text on file';
export const ACW_CAPABILITIES = ['soldier', 'officer', 'flag', 'gun', 'horse'];

export function createAcwProvider(data = {}) {
  const manifest = data.manifest || { included: [], excluded: [], summary: {} }, unitMap = data.unitMap || { links: [] }, swatches = (data.swatches && data.swatches.swatches) || {};
  const byUnit = new Map((unitMap.links || []).map(l => [l.kit_unit, l]));
  const includedMeshes = (manifest.included || []).filter(r => /\.(variant_weighted_mesh|variant_part_mesh|rigid_model|animatable_rigid_model)$/i.test(r.path));
  const includedTextures = (manifest.included || []).filter(r => r.output && /\.webp$/.test(r.output));
  const noMeshReason = {
    soldier: 'every per-regiment soldier mesh carries base-game sub-mesh names (norwegian_ski_troops / ottoman_commodore) or has no Subversion record; the base-game heads, hands and skeleton are not in the mod',
    officer: 'officer and general meshes are base-game derived (same sub-mesh names); the named-general meshes have no Subversion record',
    flag: 'the mod ships only HUD flag icons and no cloth model or flag texture of a regiment (the flag-bearer logic file is base-game style)',
    gun: 'gun models share carriage geometry and base-game texture names (field_carriage_*, euro_cannon_barrel_*); the SVN-recorded limber is a four-fold byte copy; rigid-model geometry is not decoded (EG-FIG-0012)',
    horse: 'the mod ships horse textures only (no horse mesh): the horse is the base game',
  };
  return {
    credit() { return { line: ACW_CREDIT_LINE, licence_basis: ACW_LICENCE_BASIS, active: includedMeshes.length + includedTextures.length > 0, marking: 'ACW mod lead (plausible-procedural): shown with the tier mark; the mod is no historical evidence' }; },
    tiers: TIERS_ACW,
    status() { return { meshes_cleared: includedMeshes.length, textures_cleared: includedTextures.length, excluded: (manifest.excluded || []).length, links: byUnit.size, unmatched_kit_units: (unitMap.unmatched_kit_units || []).length }; },
    // The mod link of a kit unit (e.g. 'US.19IN'), or null when the join found none: a lead-derived inference with its gap, never a fact. An ambiguous join (several mod rows share the token) is returned as such, no row is chosen.
    linkFor(unitId) { return byUnit.get(unitId) || null; },
    // what the figure system should do for a (unit, role): the procedural figure is kept unless a CLEARED mod mesh exists for that capability (none today); a cleared swatch can only tint/label.
    figurePlan(unitId, role = 'soldier') {
      const cap = role === 'private' || role === 'soldier' ? 'soldier' : role, link = byUnit.get(unitId) || null, meshes = includedMeshes.filter(m => (m.capability || 'soldier') === cap);
      const sw = link ? [...new Set(link.candidates.flatMap(c => c.cleared_swatches || []))].filter(k => swatches[k]) : [];
      return { unit: unitId, role, mesh: meshes.length ? { source: 'acw', files: meshes.map(m => m.output) } : { source: 'procedural', reason: noMeshReason[cap] || 'no cleared mod mesh', gap: 'EG-FIG-0012' },
        link: link ? { mod_keys: link.candidates.map(c => c.mod_key), ambiguous: link.ambiguous, label: link.label, gap: link.gap } : { gap: 'EG-FIG-0011', reason: 'no mod row joins this kit unit by regiment token; no link is guessed' },
        swatches: sw.map(k => ({ key: k, mean_srgb: swatches[k].mean_srgb, basis: swatches[k].basis })), tier: 'plausible-procedural', credit: sw.length || meshes.length ? ACW_CREDIT_LINE : null };
    },
    coverage() { return ACW_CAPABILITIES.map(c => ({ capability: c, cleared_meshes: includedMeshes.filter(m => (m.capability || 'soldier') === c).length, fallback: 'procedural figures (unchanged)', gap: 'EG-FIG-0012', reason: noMeshReason[c] })); },
    // cost model: textures only, nothing per figure
    costModel() {
      const px = includedTextures.reduce((s, t) => s + t.width * t.height, 0);
      return { meshes: 0, triangles_added_per_figure: 0, draw_calls_added: 0, per_figure_bytes_added: 0, instancing: 'unchanged: one instance per man up to the strength figure (no capping)', mobile_budget: 'unchanged (the swatch sheets are 512x512 and are fetched only when a viewer asks for a swatch)',
        textures: { count: includedTextures.length, download_bytes_webp: includedTextures.reduce((s, t) => s + t.output_bytes, 0), gpu_bytes_rgba8_with_mips: Math.round(px * 4 * 4 / 3) } };
    },
    swatch(key) { return swatches[key] || null; },
  };
}
