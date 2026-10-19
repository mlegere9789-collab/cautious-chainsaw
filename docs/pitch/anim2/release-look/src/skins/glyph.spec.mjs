// skins/glyph.spec.mjs - THE TOKEN FILE of OPTION B "GLYPH": one row per token, [name, value, what it does, { min, max, unit }].  A designer edits this file (or sets a value live:
// ?skinset={"glyph":{"glyph.unitFull":14}} or __skinKit.setToken('glyph', 'glyph.unitFull', 14)) and nothing else.  Every token is read by the drawing code or the sizer (test/skin-look.test.mjs fails on a token nobody
// reads).  Lengths are CSS px at 1x; colours are #rrggbb; alphas are 0..1.  The palette is the SURVEY ground (the aerial ghosted into cool white paper, theme 'light'); the DUSK ground is not shipped for this option.
export const GLY_TOKENS = [
  // ---- colour: side -----------------------------------------------------------------------------------------------------------------------------------------------------
  ['color.union', '#1d5bc2', 'Union: the body of a glyph.  Holds 4.8:1 against the survey sheet, and the white numeral holds 6.3:1 on it'],
  ['color.confederate', '#c23d1b', 'Confederate: vermilion, 4.3:1 against the survey sheet, white numeral at 5.2:1.  Blue against vermilion is the colour-blind-safe pair of Okabe and Ito in spirit'],
  ['color.unknown', '#8c949c', 'Side UNKNOWN (10 ids whose id prefix and state code disagree, Contested): neutral grey, an octagon, hatched: never a side colour'],
  ['color.unionTint', '#d6e4fb', 'Union glass: the inside of a carried-forward glyph'],
  ['color.confederateTint', '#f7dccf', 'Confederate glass: the inside of a carried-forward glyph'],
  // ---- colour: ink --------------------------------------------------------------------------------------------------------------------------------------------------
  ['color.outline', '#0f1826', 'The thin dark outline round every glyph (the same ink on every mark: it is the outermost ink and stands off any ground)'],
  ['color.paper', '#ffffff', 'The white that lies under a glyph and its lettering so both hold over dark woods and shadow'],
  ['color.inner', '#ffffff', 'The white arm mark inside a glyph (a slash for cavalry, a dot for artillery) and the numeral of a crowd'],
  ['color.ink', '#151b24', 'Lettering of unit codes and names'],
  ['color.tintUnion', '#103a85', 'Lettering of a Union formation or crowd'],
  ['color.tintConfederate', '#8a2307', 'Lettering of a Confederate formation or crowd'],
  ['color.tintUnknown', '#3c444c', 'Lettering of a formation of unknown side'],
  ['color.tintMixed', '#2a2f36', 'Lettering of a crowd of both sides'],
  ['color.halo', '#ffffff', 'The halo behind every letter'],
  ['color.select', '#101a24', 'The selection ring of a mark of unknown side (a Union or Confederate mark is ringed in its own colour)'],
  ['color.numeralHalo', '#0a0f18', 'The halo of the count inside a crowd glyph (none by default)'],
  // ---- type: sizes live in layout/text.mjs (FONT_SPECS): 12 px semibold for a unit, 13 px bold for a formation or crowd; the numeral is the 12 px semibold ----------------------
  ['halo.width', 3.2, 'Width of the halo stroke behind lettering', { min: 0, max: 6, unit: 'px' }],
  ['halo.alpha', 0.94, 'Opacity of the halo stroke', { min: 0, max: 1 }],
  ['halo.soft', 0.4, 'Opacity of the second, wider halo that softens the first', { min: 0, max: 0.6 }],
  ['text.dimAlpha', 1, 'Opacity of lettering when the mark is carried forward (1: it keeps its contrast)', { min: 0.3, max: 1 }],
  // ---- the glyph -----------------------------------------------------------------------------------------------------------------------------------------------------
  ['glyph.unit', 10, 'Width of the glyph of a regiment or battery below the full zoom (a small side-and-arm mark)', { min: 6, max: 18, unit: 'px' }],
  ['glyph.unitFull', 13, 'Width of the glyph of a regiment or battery from the full zoom (default 15)', { min: 8, max: 22, unit: 'px' }],
  ['glyph.brigade', 17, 'Width of a brigade glyph (and of a crowd of units under no formation); it carries one ring', { min: 10, max: 28, unit: 'px' }],
  ['glyph.division', 20, 'Width of a division glyph; it carries two rings', { min: 12, max: 32, unit: 'px' }],
  ['glyph.corps', 23, 'Width of a corps (or army) glyph; it carries three rings', { min: 14, max: 36, unit: 'px' }],
  ['glyph.crowdMin', 19, 'Least width of a crowd glyph: wide enough for a two-digit 12 px numeral', { min: 14, max: 30, unit: 'px' }],
  ['glyph.round', 3, 'Corner radius of a Confederate glyph (a rounded square)', { min: 0, max: 8, unit: 'px' }],
  ['glyph.outline', 1.2, 'Width of the dark outline of a glyph', { min: 0.5, max: 2.4, unit: 'px' }],
  ['glyph.under', 1.5, 'Width of the white edge under a glyph', { min: 0, max: 3, unit: 'px' }],
  ['arm.stroke', 1.7, 'Width of the white arm mark inside a glyph (cavalry: a slash; artillery: a dot of twice this width)', { min: 1, max: 3, unit: 'px' }],
  ['ring.step', 3.2, 'Distance between the rings of a formation glyph', { min: 2, max: 5, unit: 'px' }],
  ['ring.width', 1.3, 'Width of a ring of a formation glyph', { min: 0.8, max: 2.4, unit: 'px' }],
  ['stack.step', 2.6, 'Offset of each layer behind a crowd glyph (a crowd is a small stack)', { min: 1.5, max: 5, unit: 'px' }],
  ['stack.layers', 2, 'Layers behind a crowd glyph', { min: 1, max: 3 }],
  ['text.gap', 5, 'Space between a glyph and its lettering', { min: 2, max: 10, unit: 'px' }],
  ['code.baseline', 4.1, 'Distance of a lettering baseline below the middle of the glyph', { min: 2, max: 6, unit: 'px' }],
  ['name.alpha', 1, 'Opacity of the grown-in full name', { min: 0.4, max: 1 }],
  // ---- strength: the gauge round a regiment glyph (Modelled) ----------------------------------------------------------------------------------------------------------
  ['gauge.on', 1, 'Show the strength gauge round a regiment glyph from the full zoom (1) or not (0).  It is the placement strength over the unit reference: MODELLED, and not a casualty record', { min: 0, max: 1 }],
  ['gauge.gap', 1.9, 'Space between the glyph and its gauge', { min: 1, max: 4, unit: 'px' }],
  ['gauge.width', 2.4, 'Width of the gauge arc', { min: 1.2, max: 3.6, unit: 'px' }],
  ['gauge.alpha', 0.62, 'Opacity of the filled arc of the gauge (the dark outline ink, lightened so a ring of full strength does not read as a second outline)', { min: 0.3, max: 1 }],
  ['gauge.track', 0.3, 'Opacity of the track the gauge runs on', { min: 0, max: 0.6 }],
  // ---- level of detail ------------------------------------------------------------------------------------------------------------------------------------------
  ['detail.corpsNameZoom', 11, 'From this zoom a corps (and a crowd of one) says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.divisionNameZoom', 12.5, 'From this zoom a division says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.brigadeNameZoom', 13, 'From this zoom a brigade says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.crowdNameZoom', 12, 'From this zoom a crowd says what its units share (a number alone never stands for hidden units)', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.fullZoom', 15, 'From this zoom a unit is a FULL mark (a larger glyph, its short code, the strength gauge); below it a small side-and-arm mark', { min: 12, max: 18, unit: 'zoom' }],
  ['detail.selectGrowZoom', 15, 'From this zoom a selected mark grows its name and the layout makes room for it; below it the selection is a ring and nothing moves', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.selectNameMinViewport', 560, 'A selected mark grows its full name only when the window is at least this wide (px); on a phone the sheet carries the name', { min: 320, max: 2000, unit: 'px' }],
  ['detail.unitNameZoom', 17, 'From this zoom a unit says its full name: the same mark grows, there is no second box', { min: 14, max: 18, unit: 'zoom' }],
  ['detail.hullZoom', 12, 'From this zoom a crowd shows the true positions of the units it stands for (while pointed at or selected)', { min: 11, max: 18, unit: 'zoom' }],
  // ---- state: carried forward --------------------------------------------------------------------------------------------------------------------------------------
  ['carried.hollow', 1, 'How far a carried-forward glyph hollows: 0 = no change, 1 = pale glass in a heavy side-coloured outline (the hue stays: never grey)', { min: 0, max: 1 }],
  ['carried.ring', 2.3, 'Width of the side-coloured outline of a carried-forward glyph', { min: 1, max: 3.5, unit: 'px' }],
  // ---- the casualty memory (fx/memory.mjs; the marks are Documented in number, Modelled in time and place) ------------------------------------------------------------
  ['memory.enabled', 1, 'Draw the ground marks that remember the losses (1) or not (0)', { min: 0, max: 1 }],
  ['memory.shape', 'cross', 'The mark: cross (an ink cross) or bar'],
  ['memory.len', 4, 'Size of a mark at the closest zoom (smaller when zoomed out)', { min: 2, max: 9, unit: 'px' }],
  ['memory.width', 1.3, 'Width of one ground mark (a fallen figure or a cross) at the closest zoom', { min: 0.8, max: 3, unit: 'px' }],
  ['memory.union', '#2a4f8f', 'Colour of a Union mark'],
  ['memory.confederate', '#9a3a20', 'Colour of a Confederate mark'],
  ['memory.edge', '#ffffff', 'The white edge under a mark (empty: none)'],
  ['memory.edgeAlpha', 0.7, 'Opacity of the pale or white edge under a ground mark', { min: 0, max: 1 }],
  ['memory.alpha', 0.78, 'Opacity of the ground marks that remember the losses', { min: 0.2, max: 1 }],
  ['memory.fadeTicks', 5, 'Ticks over which a new mark settles on the ground', { min: 1, max: 20, unit: 'ticks' }],
  // ---- crowd member dots ---------------------------------------------------------------------------------------------------------------------------------------------------
  ['hull.dot', 2.4, 'Radius of the dot on the true position of one unit a crowd stands for (shown while the crowd is pointed at or selected)', { min: 1, max: 4, unit: 'px' }],
  ['hull.leader', 0.85, 'Opacity of the hairlines from a crowd to its units', { min: 0, max: 1 }],
  // ---- pin and leader --------------------------------------------------------------------------------------------------------------------------------------------------
  ['pin.r', 2.6, 'Radius of the true-position ring', { min: 1, max: 4, unit: 'px' }],
  ['leader.width', 1, 'Width of the hairline from the true position to its mark', { min: 0.5, max: 2, unit: 'px' }],
  ['leader.alpha', 0.95, 'Opacity of that hairline', { min: 0, max: 1 }],
  // ---- selection and hover ---------------------------------------------------------------------------------------------------------------------------------------------
  ['sel.gap', 3, 'Space between the glyph (and its gauge or rings) and the selection ring', { min: 1, max: 6, unit: 'px' }],
  ['sel.width', 2, 'Width of the selection ring, in the mark’s own colour under a white hairline', { min: 1, max: 3, unit: 'px' }],
  ['hover.width', 1.3, 'Width of the fainter hover ring', { min: 0.5, max: 2, unit: 'px' }],
  // ---- motion --------------------------------------------------------------------------------------------------------------------------------------------------------------
  ['motion.selectMs', 140, 'Ease of the selection ring (critically damped)', { min: 0, max: 600, unit: 'ms' }],
  ['motion.hoverMs', 90, 'Ease of the hover state', { min: 0, max: 600, unit: 'ms' }],
];

export const GLY_VARIANTS = {
  cvd: { label: 'Colour-blind safe', set: { 'color.union': '#0b64a6', 'color.confederate': '#b04f00', 'color.unionTint': '#d3eaf9', 'color.confederateTint': '#fbe3c4', 'color.tintUnion': '#064c7e', 'color.tintConfederate': '#7a3200', 'memory.union': '#1b4a74', 'memory.confederate': '#8a4a10' } },
  contrast: { label: 'High contrast', set: { 'color.union': '#0e48a8', 'color.confederate': '#a82a08', 'color.unknown': '#5c646c', 'halo.width': 4, 'glyph.outline': 1.6, 'sel.width': 2.6, 'color.tintUnion': '#0a2d73', 'color.tintConfederate': '#731e04' } },
};
