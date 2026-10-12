// skins/quiet-cartographer.spec.mjs - THE TOKEN FILE of the Quiet Cartographer skin: one row per token, [name, value, what it does, { min, max, unit }].  A designer edits this file (or sets a value live:
// battle-studio ?skinset={"quiet-cartographer":{"pip.size":12}}, or __skinKit.setToken('quiet-cartographer', 'pip.size', 12)) and nothing else.  Every token is read by the drawing code or the sizer
// (test/skins-d1.test.mjs fails on a token nobody reads).  Lengths are CSS px at 1x; colours are #rrggbb; alphas are 0..1.
//
// The palette below is NIGHT (the default ground, 'qc-night').  DAY (the light ground, 'qc-day') is a variant: same drawing, other values (QC_VARIANTS at the bottom).
export const QC_TOKENS = [
  // ---- colour: side ------------------------------------------------------------------------------------------------------------------------------------------------
  ['color.union', '#62a6ff', 'Union: the pip, the flag and the count disc.  Azure, light enough to read on a dark aerial'],
  ['color.confederate', '#e4522a', 'Confederate: vermilion.  Blue against vermilion is the colour-blind-safe pair of Okabe and Ito in spirit (not their exact values)'],
  ['color.unknown', '#e3e8ee', 'Side UNKNOWN (10 ids whose id prefix and state code disagree, Contested): the ink colour of the ground, hatched, never a side colour.  Neutral on purpose: it stays apart from both sides under every colour-vision type'],
  // ---- colour: ink --------------------------------------------------------------------------------------------------------------------------------------------------
  ['color.unionFlag', '#2d6fd3', 'Union flag cloth and the count inside it: a deeper azure than the pip, so the white numeral holds 4.5:1 (4.85)'],
  ['color.confederateFlag', '#c4401a', 'Confederate flag cloth: a deeper vermilion than the pip, white numeral at 5.1:1'],
  ['color.glass', '#070b11', 'The glass inside a carried-forward (hollow) pip or flag: dark on the night ground, paper on the day ground'],
  ['color.ink', '#f6f9fc', 'Lettering of unit codes and numerals'],
  ['color.tintUnion', '#d3e5ff', 'Lettering of a Union formation (the formation name is soft, haloed, tinted with its side)'],
  ['color.tintConfederate', '#ffdccd', 'Lettering of a Confederate formation'],
  ['color.tintUnknown', '#f2f5f9', 'Lettering of a formation of unknown side'],
  ['color.tintMixed', '#eef1f4', 'Lettering of an aggregate of both sides, or of a side that is not one formation'],
  ['color.halo', '#070b11', 'The dark halo behind every letter, the dark hairline round a pip and the dark glass of a carried-forward mark (on the DAY ground this is paper white)'],
  ['color.ring', '#f7fafd', 'The light ring of a fresh pip and the staff of a standard (on the DAY ground this is dark ink)'],
  ['color.select', '#ffffff', 'The selection ring and the fainter hover ring, in the margin of the footprint'],
  ['color.numeral', '#ffffff', 'The count inside a standard: always light, with its own dark halo, on both grounds (the flag fill is mid-tone, so the halo carries the contrast)'],
  ['color.numeralHalo', '#0a1118', 'The dark halo of that count'],
  // ---- type: sizes live in layout/text.mjs (FONT_SPECS): 11 px for codes, numerals and names, 13 px for formations; these tokens set the rendering --------------------
  ['halo.width', 2.4, 'Width of the halo stroke behind lettering', { min: 0, max: 6, unit: 'px' }],
  ['halo.alpha', 0.66, 'Opacity of the halo stroke', { min: 0, max: 1 }],
  ['halo.soft', 0.3, 'Opacity of the second, wider halo that softens the first', { min: 0, max: 0.6 }],
  ['halo.plate', 0, 'Opacity of the glass behind a mark (one rounded fill inside the footprint; costs about 3 ms per frame for 350 marks, so it is 0, lettering only, on the night ground and 0.2 on the day ground)', { min: 0, max: 0.6 }],
  ['text.dimAlpha', 1, 'Opacity of lettering when the mark is carried forward (a fix a battle day old or more).  1: the lettering of a stale mark stays at full strength and keeps its 4.5:1 (round 0 dimmed it to 0.74 and 0.86, and a hostile reading found the stale crowds illegible); the hollow ring and flag carry the age', { min: 0.3, max: 1 }],
  // ---- unit mark: the pip ---------------------------------------------------------------------------------------------------------------------------------------------
  ['pip.size', 11, 'Width of the pip, ring included.  Infantry is a disc, cavalry a diamond, artillery a triangle', { min: 7, max: 16, unit: 'px' }],
  ['pip.gap', 4, 'Space between the pip and its lettering', { min: 2, max: 8, unit: 'px' }],
  ['pip.ring', 1.25, 'Width of the light ring round a fresh pip (it becomes the side colour when the mark is carried forward)', { min: 0.5, max: 2.5, unit: 'px' }],
  ['pip.ringHollow', 1.9, 'Width of the side-coloured ring of a carried-forward pip: thick enough to read at the opening zoom', { min: 0.8, max: 3, unit: 'px' }],
  ['pip.hairlineAlpha', 0.62, 'Opacity of that hairline (the DAY ground uses a paper-white one at a higher opacity)', { min: 0.2, max: 1 }],
  ['pip.hairline', 0.9, 'Width of the dark hairline outside the ring: the contrast guarantee on a pale ground', { min: 0, max: 2, unit: 'px' }],
  ['unit.h', 14, 'Height of the body of a unit mark (the footprint adds the selection band on each side)', { min: 12, max: 20, unit: 'px' }],
  ['name.alpha', 1, 'Opacity of the grown-in full name (the code is bolder; both are full ink)', { min: 0.4, max: 1 }],
  ['code.baseline', 4.1, 'Distance of the lettering baseline below the middle of a mark (the digits sit centred on the pip)', { min: 2, max: 6, unit: 'px' }],
  // ---- formation mark: the standard ---------------------------------------------------------------------------------------------------------------------------------
  ['flag.w', 15, 'Width of a standard (the flag of a formation or of an aggregate), notch included', { min: 10, max: 24, unit: 'px' }],
  ['flag.h', 11, 'Height of the flag of a brigade standard; a division flies 12 % taller, a corps 26 % taller', { min: 8, max: 18, unit: 'px' }],
  ['flag.notch', 3.5, 'Depth of the swallow-tail', { min: 0, max: 7, unit: 'px' }],
  ['flag.staff', 5, 'How far the staff runs below the flag', { min: 0, max: 12, unit: 'px' }],
  ['staff.width', 1.5, 'Width of the staff (the flag is hung from its top, its foot stands on the true position)', { min: 0.75, max: 2.5, unit: 'px' }],
  ['flag.gap', 5, 'Space between a standard and its lettering', { min: 2, max: 10, unit: 'px' }],
  ['flag.padX', 3.5, 'Space round the count inside a flag that has to widen for two digits', { min: 1, max: 6, unit: 'px' }],
  ['formation.h', 20, 'Height of the body of a formation or aggregate mark', { min: 16, max: 26, unit: 'px' }],
  // ---- level of detail ----------------------------------------------------------------------------------------------------------------------------------------------
  ['detail.corpsNameZoom', 11, 'From this zoom a corps (and an aggregate of one) says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.divisionNameZoom', 12.5, 'From this zoom a division (and an aggregate of one) says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.brigadeNameZoom', 13, 'From this zoom a brigade says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.codeZoom', 13, 'From this zoom a unit pip carries its short code (below it a pip is bare: the hover and the card say which unit it is).  13 is below the opening zoom of the site, 13.5: the first view names what it shows', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.crowdNameZoom', 12, 'From this zoom a crowd standard says what its units share (a formation, a corps, both sides): a number alone never stands for hidden units', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.selectGrowZoom', 15, 'From this zoom a selected mark grows its name (and a unit its strength hairline) and the layout makes room for it; below it the selection is a ring (the crowd standard that stands for a hidden unit gets the ring) and nothing moves, so selecting never re-flows a crowded overview', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.selectNameMinViewport', 560, 'A selected mark grows its full name only when the window is at least this wide (px); on a phone the card carries the name and the mark stays small', { min: 320, max: 2000, unit: 'px' }],
  ['detail.unitNameZoom', 16, 'From this zoom a unit says its full name: the same mark grows, there is no second box', { min: 14, max: 18, unit: 'zoom' }],
  ['detail.hullZoom', 12, 'From this zoom an aggregate shows the true positions of the units it stands for', { min: 11, max: 18, unit: 'zoom' }],
  // ---- state: carried forward (the one provisional device) -----------------------------------------------------------------------------------------------------
  ['carried.hollow', 1, 'How far a carried-forward pip or flag hollows: 0 = no change, 1 = fully hollow with a side-coloured ring', { min: 0, max: 1 }],
  ['carried.glass', 0.72, 'Opacity of the glass inside a hollow mark', { min: 0, max: 1 }],
  ['carried.tint', 0.3, 'How much of the side colour tints that glass (the hue stays, so a carried-forward mark is never grey)', { min: 0, max: 0.6 }],
  ['tail.alpha', 1, 'Opacity of the tail of a crowd name (", 3 unlisted": units the order of battle gives no parent), set in regular weight beside the semibold name, at full strength', { min: 0.4, max: 1 }],
  ['brig.alpha', 1, 'Opacity of a brigade name (semibold 12 px, tinted with its side: quieter than the bold 13 px of a division or a corps)', { min: 0.5, max: 1 }],
  // ---- strength hairline (Modelled) ------------------------------------------------------------------------------------------------------------------------------
  ['gauge.h', 3, "Thickness of the strength hairline (Modelled: this keyframe's strength over the unit's reference strength; a state, not a casualty record)", { min: 1, max: 4, unit: 'px' }],
  ['gauge.w', 22, 'Length of the strength hairline that joins a SELECTED unit mark after its name', { min: 12, max: 40, unit: 'px' }],
  ['gauge.gap', 7, 'Space between the name and the strength hairline', { min: 3, max: 14, unit: 'px' }],
  ['gauge.trackAlpha', 0.3, 'Opacity of the empty part of the hairline', { min: 0, max: 0.8 }],
  // ---- aggregate member dots ---------------------------------------------------------------------------------------------------------------------------------------
  ['hull.dot', 2.3, 'Radius of the dot on the true position of one unit an aggregate stands for (shown while the aggregate is hovered or selected)', { min: 1, max: 4, unit: 'px' }],
  ['hull.leader', 0.75, 'Opacity of the hairlines from an aggregate to its units while it is hovered or selected', { min: 0, max: 1 }],
  // ---- pin and leader (drawn only for the mark that is hovered or selected; a resting field of them was wiring) ----------------------------------------------------------------------------------------------------------------------------
  ['pin.r', 2.4, 'Radius of the true-position ring', { min: 1, max: 4, unit: 'px' }],
  ['leader.width', 1, 'Width of the hairline from the true position to its mark', { min: 0.5, max: 2, unit: 'px' }],
  ['leader.alpha', 0.78, 'Opacity of that hairline', { min: 0, max: 1 }],
  // ---- selection and hover ---------------------------------------------------------------------------------------------------------------------------------------------
  ['sel.radius', 7, 'Corner radius of the selection ring', { min: 2, max: 12, unit: 'px' }],
  ['sel.width', 1.5, 'Width of the selection ring', { min: 1, max: 3, unit: 'px' }],
  ['hover.plate', 0.18, 'Extra glass behind the mark on hover', { min: 0, max: 0.5 }],
  // ---- motion (eased in wall-clock ms; the display layer owns position, size, fade and travel: motion.* dials of the engine) -------------------------------
  ['motion.selectMs', 140, 'Ease of the selection ring (critically damped)', { min: 0, max: 600, unit: 'ms' }],
  ['motion.hoverMs', 90, 'Ease of the hover state', { min: 0, max: 600, unit: 'ms' }],
];

// ---- variants: the same drawing under other token sets ----------------------------------------------------------------------------------------------------------------
// Two families (the two grounds): 'quiet-cartographer' is NIGHT, 'quiet-cartographer-day' is DAY; each has a colour-blind-safe and a high-contrast variant (skin ids <family>/cvd, <family>/contrast).
export const QC_DAY = {
  'color.union': '#1a58c4', 'color.confederate': '#d2441a', 'color.unknown': '#2a323b', 'color.unionFlag': '#1a58c4', 'color.confederateFlag': '#c4401a', 'color.glass': '#fbf8f0',
  'color.ink': '#14202c', 'color.tintUnion': '#17418f', 'color.tintConfederate': '#8a2307', 'color.tintUnknown': '#2a323b', 'color.tintMixed': '#2a3340',
  'color.halo': '#fbf8f0', 'color.ring': '#142231', 'color.select': '#101a24',
  'halo.alpha': 0.9, 'halo.plate': 0, 'pip.hairlineAlpha': 0.92, 'carried.glass': 0.9, 'carried.tint': 0.16,
};
export const QC_NIGHT_VARIANTS = {
  cvd: { label: 'Colour-blind safe', set: { 'color.union': '#52a9e6', 'color.confederate': '#d98200', 'color.unionFlag': '#1f78b8', 'color.confederateFlag': '#a35f00', 'color.unknown': '#f4f6f9', 'color.tintUnion': '#d6efff', 'color.tintConfederate': '#ffe1ad' } },
  contrast: { label: 'High contrast', set: { 'color.union': '#6db1ff', 'color.confederate': '#ff7a4d', 'color.unionFlag': '#1f5fc0', 'color.confederateFlag': '#b53515', 'color.unknown': '#f6f8fb', 'halo.width': 4, 'halo.alpha': 0.95, 'halo.plate': 0.4, 'pip.ring': 1.75, 'pip.hairline': 1.4, 'text.dimAlpha': 1, 'name.alpha': 1, 'sel.width': 2.25, 'leader.alpha': 1 } },
};
export const QC_DAY_VARIANTS = {
  cvd: { label: 'Colour-blind safe', set: { 'color.union': '#005f99', 'color.confederate': '#d25a00', 'color.unionFlag': '#005f99', 'color.confederateFlag': '#a64600', 'color.tintUnion': '#00507f', 'color.tintConfederate': '#7a3200' } },
  contrast: { label: 'High contrast', set: { 'color.union': '#0a3d9c', 'color.confederate': '#a82a08', 'color.unionFlag': '#0a3d9c', 'color.confederateFlag': '#a82a08', 'color.unknown': '#14191f', 'color.tintUnion': '#0a2d73', 'color.tintConfederate': '#7a1e04', 'color.tintUnknown': '#14191f', 'halo.width': 4, 'halo.alpha': 0.96, 'halo.plate': 0.5, 'pip.ring': 1.75, 'pip.hairline': 1.4, 'text.dimAlpha': 1, 'name.alpha': 1, 'sel.width': 2.25, 'leader.alpha': 1 } },
};
