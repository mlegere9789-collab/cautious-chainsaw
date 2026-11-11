// Sound provenance and the in-product marking setting (DEC-001).
//
// Every sound the engine can make carries a provenance record. The record decides what the 'What is in this build' panel says (always, in both modes)
// and what, if anything, is shown on the sound itself (decided by ONE config flag, AUDIO_CONFIG.labelMode).
//
//   labelMode 'pdf'        : the PDF's rule (Section S.1, gate Q23, C.10): audio is labelled "modern reconstruction" wherever it is heard or listed
//                            (a persistent audio badge, a tag on each sound in the sound inspector, the legend of every signal), and synthesized content is called so.
//   labelMode 'panel-only' : the owner's chat wish (no 'synthesized' label on the sound). The audio badge and per-sound tags are not drawn. NOTHING is hidden:
//                            the panel still lists every sound family with its provenance kind, licence and gap, and the provenance overlay reads the same records.
//
// DEC-001 (option a) is recorded as a DELEGATED DECISION (decision_log DEC-DELEG-G, DD-14, reversible by the owner): the default is 'panel-only', the disclosure stands in the panel and the
// provenance overlay, modern recordings are never called period sound, and tier marking of non-documented content stays. The PDF's marking ('pdf') stays selectable. This file is the only place.
// A viewer may preview the other mode with ?audioLabel=panel-only; the panel then says it is a preview override.

export const AUDIO_CONFIG = Object.freeze({
  labelMode: 'panel-only',                  // 'pdf' | 'panel-only'   <-- the single flag (delegated default DD-14)
  decision: 'DEC-001',
  decisionStatus: 'Default chosen under delegated authority, reversible by the owner: disclosure in the panel and the provenance overlay; the PDF marking stays selectable',
});

export const LABEL_MODES = Object.freeze({
  'pdf': 'PDF rule: audio labelled as modern reconstruction',
  'panel-only': 'Default (delegated, reversible): disclosed in the panel and provenance overlay, not on the sound',
});

/**
 * Provenance kinds, strongest evidence first. `weaponMatch` says how close the recorded weapon is to the weapon the sound stands for.
 *   real_exact     real recording of the same weapon model (none exists in the ledger)
 *   real_type      real recording of a weapon of the right type (black-powder musket for a musket, field cannon for a gun)
 *   real_standin   real recording of a related sound (type unknown or different): used because nothing closer is licensed
 *   reconstruction real recordings pitched / filtered / layered (derived), or a documented table rendered with a modern timbre (e.g. a bugle call from the manual's name list)
 *   synthesized    produced by the procedural DSP in synth.mjs, no recording involved
 */
export const PROVENANCE_KINDS = Object.freeze({
  real_exact:     { rank: 0, label: 'Real recording of this weapon',                 pdfTag: 'Modern recording' },
  real_type:      { rank: 1, label: 'Real recording of the same type of weapon',     pdfTag: 'Modern recording (same type, not this model)' },
  real_standin:   { rank: 2, label: 'Real recording of a related sound (stand-in)',  pdfTag: 'Modern recording (stand-in)' },
  reconstruction: { rank: 3, label: 'Reconstruction from real recordings or tables', pdfTag: 'Modern reconstruction' },
  synthesized:    { rank: 4, label: 'Synthesized (procedural)',                      pdfTag: 'Synthesized: modern reconstruction' },
});

export const TIERS = Object.freeze(['documented', 'inferred', 'plausible-procedural', 'open gap']);

/** Resolve the effective mode: the config flag, unless a preview override ('pdf' | 'panel-only') is passed. Unknown values fall back to the config. */
export function resolveMode(override = null) {
  if (override === 'pdf' || override === 'panel-only') return { mode: override, override: override !== AUDIO_CONFIG.labelMode };
  return { mode: AUDIO_CONFIG.labelMode, override: false };
}
export function modeFromSearch(search) { try { const v = new URLSearchParams(search || '').get('audioLabel'); return v === 'panel-only' || v === 'pdf' ? v : null; } catch { return null; } }

/**
 * What to draw on / next to a sound. In 'pdf' mode: the tag text. In 'panel-only' mode: null (nothing on the sound).
 * `rec` is a provenance record: { kind, tier, ... }. The PDF's phrase for pure synthesis is kept verbatim.
 */
export function onSoundMark(rec, mode = AUDIO_CONFIG.labelMode) {
  if (mode !== 'pdf') return null;
  const k = PROVENANCE_KINDS[rec.kind]; if (!k) return 'Modern reconstruction';
  return rec.kind === 'synthesized' ? 'Synthesized black-powder audio: modern reconstruction' : k.pdfTag;
}
/** The persistent audio badge (one line). null in 'panel-only' mode. */
export function audioBadge(mode = AUDIO_CONFIG.labelMode) {
  return mode === 'pdf' ? 'Audio: modern reconstruction. No recording of 1863 exists.' : null;
}

/** Fixed disclosure line that the panel shows in BOTH modes. */
export const PANEL_DISCLOSURE = 'No recording of the 1863 battle exists. Every sound here is a modern recording, a reconstruction from recordings and tables, or synthesized; the kind of each is listed below. Distance delay, loudness and muffling are computed from the documented temperature and the terrain.';

/**
 * Build the rows of the 'What is in this build' sound panel from a catalogue of families.
 * `families`: [{ id, name, kind, tier, sources:[ledger entries], gap, basis }] (from catalog.mjs).
 * The result is plain data (title, mode line, rows, gaps, credits), so the UI layer only formats it.
 */
export function buildPanel(families, { mode = AUDIO_CONFIG.labelMode, override = false, stats = null } = {}) {
  const rows = families.map((f) => {
    const srcs = f.sources || [];
    return {
      id: f.id, name: f.name, kind: f.kind, kindLabel: PROVENANCE_KINDS[f.kind]?.label || f.kind, tier: f.tier,
      recordings: srcs.map((s) => ({ ledgerId: s.ledgerId, licence: s.licence, attribution: s.attribution, weaponMatch: s.weaponMatch, shipped: !!s.shipped })),
      gap: f.gap || null, basis: f.basis || null,
      onSound: onSoundMark({ kind: f.kind, tier: f.tier }, mode),
    };
  });
  const gaps = rows.filter((r) => r.gap).map((r) => ({ id: r.id, name: r.name, gap: r.gap }));
  return {
    title: 'Sound: what is in this build',
    disclosure: PANEL_DISCLOSURE,
    labelMode: mode, labelModeText: LABEL_MODES[mode] + (override ? ' (preview override of the default)' : ''),
    decision: AUDIO_CONFIG.decision, decisionStatus: AUDIO_CONFIG.decisionStatus,
    badge: audioBadge(mode), rows, gaps, credits: creditLines(families), stats,
    counts: PROVENANCE_COUNTS(rows),
  };
}
const PROVENANCE_COUNTS = (rows) => { const c = {}; for (const r of rows) c[r.kind] = (c[r.kind] || 0) + 1; return c; };

/** Attribution lines required by the licences of the recordings that are actually shipped (CC BY needs credit; CC0 and public domain are listed anyway). */
export function creditLines(families) {
  const seen = new Set(), out = [];
  for (const f of families) for (const s of f.sources || []) {
    if (!s.shipped || seen.has(s.ledgerId)) continue; seen.add(s.ledgerId);
    out.push({ ledgerId: s.ledgerId, text: s.attribution, licence: s.licence, licenceUrl: s.licenceUrl || null, requiresAttribution: /CC BY/.test(s.licence || '') });
  }
  return out;
}
