// skins/standards.spec.mjs - THE TOKEN FILE of OPTION A "STANDARDS": one row per token, [name, value, what it does, { min, max, unit }].  A designer edits this file (or sets a value live:
// ?skinset={"standards":{"pole.brigade":28}} or __skinKit.setToken('standards', 'pole.brigade', 28)) and nothing else.  Every token is read by the drawing code or the sizer (test/skin-look.test.mjs fails on a
// token nobody reads).  Lengths are CSS px at 1x; colours are #rrggbb; alphas are 0..1.  The palette is the FIELD ground (the aerial under one warm grade, theme 'dark').
export const STD_TOKENS = [
  // ---- colour: side (cloth) ------------------------------------------------------------------------------------------------------------------------------------------
  ['color.union', '#2b64c8', 'Union cloth.  Deep enough that the white numeral holds 5.6:1 on it, and edged in pale cream so it holds on dark woods too'],
  ['color.confederate', '#c63d1f', 'Confederate cloth.  Vermilion: the colour-blind-safe pair with the blue (Okabe and Ito in spirit), white numeral at 5.1:1'],
  ['color.unknown', '#d4d7d2', 'Side UNKNOWN (10 ids whose id prefix and state code disagree, Contested): neutral pale cloth, hatched, never a side colour'],
  ['color.unionBright', '#7fb0ff', 'Union in light: the strength bar, the selection ring, the carried-forward edge and the leader'],
  ['color.confederateBright', '#ff8a63', 'Confederate in light: the same uses'],
  // ---- colour: ink --------------------------------------------------------------------------------------------------------------------------------------------------
  ['color.pole', '#f2e9d0', 'The pole and its finial: pale cream, the one hard light ink of the picture'],
  ['color.poleEdge', '#0e0c08', 'The dark line the pole and the flag edge stand on so they hold over pale ground (fields, roads)'],
  ['pole.edgeAlpha', 0.88, 'Opacity of the dark line a pole and a flag stand on: heavy enough that the mark holds 3:1 over a mid-tone field (the cream edge alone reaches about 3:1 there)', { min: 0.3, max: 1 }],
  ['color.edge', '#f2e9d0', 'The thin edge of a fresh flag'],
  ['color.glass', '#0e0c08', 'The glass inside a carried-forward (hollow) flag'],
  ['color.ink', '#f7f1e1', 'Lettering of unit codes and names'],
  ['color.tintUnion', '#d6e5ff', 'Lettering of a Union formation or crowd'],
  ['color.tintConfederate', '#ffddcc', 'Lettering of a Confederate formation or crowd'],
  ['color.tintUnknown', '#eceee9', 'Lettering of a formation of unknown side'],
  ['color.tintMixed', '#f1ede0', 'Lettering of a crowd of both sides'],
  ['color.halo', '#0e0c08', 'The dark halo behind every letter'],
  ['color.select', '#ffffff', 'The selection ring of a mark of unknown side (a Union or Confederate mark is ringed in its own light colour)'],
  ['color.numeral', '#ffffff', 'The count inside a crowd flag'],
  ['color.numeralHalo', '#0a0f18', 'Its halo (none by default: the cloth carries the contrast)'],
  // ---- type: sizes live in layout/text.mjs (FONT_SPECS): 12 px semibold for a unit, 13 px bold for a formation or crowd; the numeral is the 12 px semibold with tabular figures ------------
  ['halo.width', 3, 'Width of the halo stroke behind lettering', { min: 0, max: 6, unit: 'px' }],
  ['halo.alpha', 0.86, 'Opacity of the halo stroke', { min: 0, max: 1 }],
  ['halo.soft', 0.32, 'Opacity of the second, wider halo that softens the first', { min: 0, max: 0.6 }],
  ['text.dimAlpha', 1, 'Opacity of lettering when the mark is carried forward (1: it keeps its contrast; the hollow flag carries the age)', { min: 0.3, max: 1 }],
  // ---- the planted standard: pole, foot, shadow -----------------------------------------------------------------------------------------------------------------------
  ['pole.width', 1.6, 'Width of a pole, the hard cream line a flag flies from', { min: 1, max: 3, unit: 'px' }],
  ['pole.unit', 17, 'Height of the pole of a regiment or battery below the full zoom (a small side-and-arm mark)', { min: 8, max: 26, unit: 'px' }],
  ['pole.unitFull', 27, 'Height of the pole of a regiment or battery from the full zoom (default 15)', { min: 10, max: 34, unit: 'px' }],
  ['pole.brigade', 34, 'Height of a brigade standard (and of a crowd of units under no formation)', { min: 14, max: 44, unit: 'px' }],
  ['pole.division', 44, 'Height of a division standard: the scale hierarchy is the pole and the flag, not a box', { min: 16, max: 52, unit: 'px' }],
  ['pole.corps', 56, 'Height of a corps (or army) standard', { min: 18, max: 60, unit: 'px' }],
  ['foot.r', 2.1, 'Radius of the foot of a pole: the unit stands exactly here', { min: 1, max: 4, unit: 'px' }],
  ['shadow.rx', 5.2, 'Half-width of the soft ground shadow under a standard (lit from the north-west, like the relief)', { min: 0, max: 10, unit: 'px' }],
  ['shadow.alpha', 0.5, 'Opacity of that shadow', { min: 0, max: 0.8 }],
  // ---- the flag --------------------------------------------------------------------------------------------------------------------------------------------------------
  ['flag.unitW', 11, 'Length of a regiment flag below the full zoom', { min: 6, max: 20, unit: 'px' }],
  ['flag.unitH', 8, 'Height of a regiment flag below the full zoom', { min: 4, max: 14, unit: 'px' }],
  ['flag.unitFullW', 16, 'Least length of a regiment flag from the full zoom: it lengthens to hold its short code, which stands on the cloth', { min: 8, max: 24, unit: 'px' }],
  ['flag.unitFullH', 18, 'Height of a regiment flag from the full zoom: the 12 px code stands on it with 3 px of plain cloth above and below (director fix 7: a clean ring round every numeral)', { min: 6, max: 22, unit: 'px' }],
  ['flag.brigadeW', 30, 'Length of a brigade flag', { min: 10, max: 34, unit: 'px' }],
  ['flag.brigadeH', 24, 'Height of a brigade flag', { min: 7, max: 28, unit: 'px' }],
  ['flag.divisionW', 38, 'Length of a division flag', { min: 12, max: 40, unit: 'px' }],
  ['flag.divisionH', 30, 'Height of a division flag', { min: 8, max: 34, unit: 'px' }],
  ['flag.corpsW', 48, 'Length of a corps flag', { min: 14, max: 48, unit: 'px' }],
  ['flag.corpsH', 36, 'Height of a corps flag', { min: 10, max: 40, unit: 'px' }],
  ['rank.pip', 2.2, 'Radius of a rank pip on a formation flag: one pip for a brigade, two for a division, three for a corps (derived from the order of battle, no insignia)', { min: 1, max: 3.5, unit: 'px' }],
  ['rank.pipGap', 8, 'Distance between the centres of two rank pips', { min: 4, max: 12, unit: 'px' }],
  ['flag.crowdMinH', 20, 'Least height of a crowd flag: tall enough for its 12 px numeral', { min: 12, max: 24, unit: 'px' }],
  ['flag.notch', 0.34, 'Depth of the swallow-tail of a cavalry flag and of the arrow end of an artillery flag, as a share of the flag height', { min: 0.1, max: 0.6 }],
  ['flag.wave', 1.3, 'How far the cloth rises and falls along its length (px; none under 12 px of length): cloth, not a box', { min: 0, max: 2, unit: 'px' }],
  ['flag.shade', 0.26, 'Strength of the light-to-shade gradient along the cloth', { min: 0, max: 0.5 }],
  ['flag.edge', 1.1, 'Width of the edge of a fresh flag', { min: 0.5, max: 2, unit: 'px' }],
  ['flag.edgeHollow', 1.6, 'Width of the light-side edge of a carried-forward flag', { min: 1, max: 3, unit: 'px' }],
  ['flag.gap', 5, 'Space between a flag and its lettering', { min: 2, max: 10, unit: 'px' }],
  ['flag.padX', 5.5, 'Space between the code or count and the flag edge, at each end: with the edge itself it leaves 3 px of plain cloth (director fix 7)', { min: 1, max: 6, unit: 'px' }],
  ['code.baseline', 4.1, 'Distance of a lettering baseline below the middle of the flag', { min: 2, max: 6, unit: 'px' }],
  ['name.alpha', 1, 'Opacity of the grown-in full name', { min: 0.4, max: 1 }],
  // ---- strength: the slim bar under a regiment flag (Modelled) --------------------------------------------------------------------------------------------------------
  ['strength.bar', 1, 'Show the slim strength bar under a regiment flag from the full zoom (1) or not (0).  It is the placement strength over the unit reference: MODELLED, and not a casualty record', { min: 0, max: 1 }],
  ['strength.h', 2.5, 'Height of the strength bar', { min: 1.5, max: 4, unit: 'px' }],
  ['strength.gap', 2, 'Space between the flag and the strength bar', { min: 1, max: 4, unit: 'px' }],
  ['strength.track', 0.55, 'Opacity of the dark track the bar runs on', { min: 0, max: 1 }],
  // ---- level of detail -------------------------------------------------------------------------------------------------------------------------------------------
  ['detail.corpsNameZoom', 11, 'From this zoom a corps (and a crowd of one) says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.divisionNameZoom', 12.5, 'From this zoom a division says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.brigadeNameZoom', 13, 'From this zoom a brigade says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.crowdNameZoom', 12, 'From this zoom a crowd says what its units share (a number alone never stands for hidden units)', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.fullZoom', 15, 'From this zoom a unit is a FULL mark (a taller pole, a larger flag, its short code, the strength bar); below it a small side-and-arm mark', { min: 12, max: 18, unit: 'zoom' }],
  ['detail.selectGrowZoom', 14, 'From this zoom a selected mark grows its flag and name (a unit inside a crowd steps out of it and stands on its own place); below it the selection is a ring and nothing moves (director fix 6)', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.selectNameMinViewport', 320, 'A selected mark grows its full name only when the window is at least this wide (px); the default admits every phone: the sheet carries the card, the map still shows which mark it is about (director fix 6)', { min: 320, max: 2000, unit: 'px' }],
  ['detail.unitNameZoom', 17, 'From this zoom a unit says its full name: the same mark grows, there is no second box', { min: 14, max: 18, unit: 'zoom' }],
  ['detail.hullZoom', 12, 'From this zoom a crowd shows the true positions of the units it stands for (while pointed at or selected)', { min: 11, max: 18, unit: 'zoom' }],
  // ---- state: carried forward ------------------------------------------------------------------------------------------------------------------------------------
  ['carried.hollow', 1, 'How far a carried-forward flag hollows: 0 = no change, 1 = tinted glass with a light-side edge (the hue stays: never grey)', { min: 0, max: 1 }],
  ['carried.glass', 0.62, 'Opacity of the glass inside a hollow flag', { min: 0, max: 1 }],
  ['carried.tint', 0.3, 'How much of the side colour tints that glass', { min: 0, max: 0.6 }],
  // ---- the casualty memory (fx/memory.mjs; the marks are Documented in number, Modelled in time and place) ---------------------------------------------------------------
  ['memory.enabled', 1, 'Draw the ground marks that remember the losses (1) or not (0)', { min: 0, max: 1 }],
  ['memory.shape', 'bar', 'The mark: bar (a fallen figure) or cross'],
  ['memory.len', 4, 'Length of a mark at the closest zoom (shorter when zoomed out)', { min: 2, max: 9, unit: 'px' }],
  ['memory.width', 1.5, 'Width of one ground mark (a fallen figure or a cross) at the closest zoom', { min: 0.8, max: 3, unit: 'px' }],
  ['memory.union', '#223a66', 'Colour of a Union mark: a dark cloth blue'],
  ['memory.confederate', '#5a2118', 'Colour of a Confederate mark: a dark cloth red-brown'],
  ['memory.edge', '#efe4c6', 'The pale edge that keeps a dark mark readable on dark ground (empty: none)'],
  ['memory.edgeAlpha', 0.38, 'Opacity of the pale or white edge under a ground mark', { min: 0, max: 1 }],
  ['memory.alpha', 0.85, 'Opacity of the ground marks that remember the losses', { min: 0.2, max: 1 }],
  ['memory.fadeTicks', 5, 'Ticks over which a new mark settles on the ground', { min: 1, max: 20, unit: 'ticks' }],
  // ---- crowd member dots -----------------------------------------------------------------------------------------------------------------------------------------------
  ['hull.dot', 2.3, 'Radius of the dot on the true position of one unit a crowd stands for (shown while the crowd is pointed at or selected)', { min: 1, max: 4, unit: 'px' }],
  ['hull.leader', 0.8, 'Opacity of the hairlines from a crowd to its units', { min: 0, max: 1 }],
  ['hull.maxLen', 130, 'Longest hairline from a crowd to a member it stands for (px); a member further off shows its dot alone, so a crowd of scattered units does not throw a spider of lines across the map', { min: 40, max: 600, unit: 'px' }],
  // ---- pin and leader (only for the mark hovered or selected) ----------------------------------------------------------------------------------------------------
  ['pin.r', 2.6, 'Radius of the true-position ring', { min: 1, max: 4, unit: 'px' }],
  ['leader.width', 1, 'Width of the hairline from the true position to its mark', { min: 0.5, max: 2, unit: 'px' }],
  ['leader.alpha', 0.92, 'Opacity of that hairline', { min: 0, max: 1 }],
  // ---- selection and hover ---------------------------------------------------------------------------------------------------------------------------------------
  ['sel.rx', 9, 'Least half-width of the selection ellipse on the ground round the foot (it grows with the pole)', { min: 5, max: 16, unit: 'px' }],
  ['sel.ratio', 0.42, 'Height over width of that ellipse: a ring lying on the ground', { min: 0.2, max: 1 }],
  ['sel.width', 1.8, 'Width of the selection ring, in the mark’s own light colour under a dark hairline', { min: 1, max: 3, unit: 'px' }],
  ['hover.width', 1.2, 'Width of the fainter hover ring', { min: 0.5, max: 2, unit: 'px' }],
  // ---- motion (eased in wall-clock ms) -------------------------------------------------------------------------------------------------------------------------------
  ['motion.selectMs', 140, 'Ease of the selection ring (critically damped)', { min: 0, max: 600, unit: 'ms' }],
  ['motion.hoverMs', 90, 'Ease of the hover state', { min: 0, max: 600, unit: 'ms' }],
];

// ---- variants -------------------------------------------------------------------------------------------------------------------------------------------------------
// One family 'standards' on the FIELD ground; its colour-blind-safe and high-contrast variants (skin ids standards/cvd, standards/contrast).
export const STD_VARIANTS = {
  cvd: { label: 'Colour-blind safe', set: { 'color.union': '#1f6fb5', 'color.confederate': '#b25400', 'color.unionBright': '#6cc0ff', 'color.confederateBright': '#ffb35c', 'color.tintUnion': '#d8f0ff', 'color.tintConfederate': '#ffe5b8', 'memory.union': '#1b3a5c', 'memory.confederate': '#5a3410' } },
  contrast: { label: 'High contrast', set: { 'color.union': '#1d55b8', 'color.confederate': '#b2330f', 'halo.width': 4, 'halo.alpha': 0.95, 'flag.edge': 1.5, 'pole.width': 2, 'sel.width': 2.4, 'color.unknown': '#f2f4f1' } },
};
