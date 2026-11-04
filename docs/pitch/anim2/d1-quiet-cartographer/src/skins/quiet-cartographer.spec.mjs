// skins/quiet-cartographer.spec.mjs - THE TOKEN FILE of the Quiet Cartographer skin: one row per token, [name, value, what it does, { min, max, unit }].  A designer edits this file (or sets a value live:
// battle-studio ?skinset={"quiet-cartographer":{"pip.size":12}}, or __skinKit.setToken('quiet-cartographer', 'pip.size', 12)) and nothing else.  Every token is read by the drawing code or the sizer
// (test/skin-d1.test.mjs fails on a token nobody reads).  Lengths are CSS px at 1x; colours are #rrggbb; alphas are 0..1.
//
// The palette below is NIGHT (the night ground, 'qc-night').  DAY (the light ground, 'qc-day', the page's default) is a variant: same drawing, other values (QC_DAY and QC_DAY_VARIANTS at the bottom).
// ROUND 2: one grammar (a PIP is always the place; a formation or a crowd is a pip with a PENNANT on a staff), selection is a ring round the pip, the strength hairline is gone from the map (the card has it),
// the outer edge of every mark is its own ring (no paper hairline outside it: that was the lowest-contrast ink of a mark on a light ground).
export const QC_TOKENS = [
  // ---- colour: side ------------------------------------------------------------------------------------------------------------------------------------------------
  ['color.union', '#6db1ff', 'Union: the pip, the staff and the carried-forward ring.  Azure, light enough to hold 4.5:1 on a dark aerial'],
  ['color.confederate', '#ff7d55', 'Confederate: vermilion, light enough to hold 4.5:1 on a dark aerial.  Blue against vermilion is the colour-blind-safe pair of Okabe and Ito in spirit (not their exact values)'],
  ['color.unknown', '#e3e8ee', 'Side UNKNOWN (10 ids whose id prefix and state code disagree, Contested): the ink colour of the ground, hatched, never a side colour.  Neutral on purpose: it stays apart from both sides under every colour-vision type'],
  // ---- colour: ink --------------------------------------------------------------------------------------------------------------------------------------------------
  ['color.unionFlag', '#2d6fd3', 'Union pennant cloth and the count inside it: a deeper azure than the pip, so the white numeral holds 4.5:1'],
  ['color.confederateFlag', '#c4401a', 'Confederate pennant cloth: a deeper vermilion than the pip, white numeral at 5.1:1'],
  ['color.glass', '#070b11', 'The glass inside a carried-forward (hollow) pip or pennant: dark on the night ground, paper on the day ground'],
  ['color.ink', '#f6f9fc', 'Lettering of unit codes and numerals'],
  ['color.tintUnion', '#d3e5ff', 'Lettering of a Union formation or crowd (bold, tinted with its side)'],
  ['color.tintConfederate', '#ffdccd', 'Lettering of a Confederate formation or crowd'],
  ['color.tintUnknown', '#f2f5f9', 'Lettering of a formation of unknown side'],
  ['color.tintMixed', '#eef1f4', 'Lettering of a crowd of both sides'],
  ['color.halo', '#070b11', 'The dark halo behind every letter and the dark glass of a carried-forward mark (on the DAY ground this is paper white)'],
  ['color.ring', '#f7fafd', 'The light ring of a fresh pip and the edge of a pennant (on the DAY ground this is dark ink: the ring is the outermost ink of a mark, so it is the colour that stands off the ground)'],
  ['color.select', '#ffffff', 'The selection ring of a mark of unknown side (a Union or Confederate mark is ringed in its own colour)'],
  ['color.numeral', '#ffffff', 'The count inside a pennant: always light, with its own dark halo, on both grounds (the cloth is mid-tone, so the halo carries the contrast)'],
  ['color.numeralHalo', '#0a1118', 'The dark halo of that count'],
  // ---- type: sizes live in layout/text.mjs (FONT_SPECS): 12 px for every lettering; bold for formations and crowds, semibold for units -----------------------------------
  ['halo.width', 3, 'Width of the halo stroke behind lettering', { min: 0, max: 6, unit: 'px' }],
  ['halo.alpha', 0.8, 'Opacity of the halo stroke', { min: 0, max: 1 }],
  ['halo.soft', 0.3, 'Opacity of the second, wider halo that softens the first', { min: 0, max: 0.6 }],
  ['text.dimAlpha', 1, 'Opacity of lettering when the mark is carried forward (a fix a battle day old or more).  1: the lettering of a stale mark stays at full strength and keeps its 4.5:1; the hollow ring and pennant carry the age', { min: 0.3, max: 1 }],
  // ---- unit mark: the pip ---------------------------------------------------------------------------------------------------------------------------------------------
  ['pip.size', 12, 'Width of the pip, ring included.  Infantry is a disc, cavalry a diamond, artillery a triangle', { min: 7, max: 16, unit: 'px' }],
  ['pip.gap', 6, 'Space between the pip and its lettering: wide enough that the selection ring (which stands 2.2 px off the pip) never touches the first letter', { min: 2, max: 8, unit: 'px' }],
  ['pip.ring', 1.5, 'Width of the ring round a fresh pip: it is the outermost ink of the mark (ink on the day ground, light on the night ground), and becomes the side colour when the mark is carried forward', { min: 0.5, max: 2.5, unit: 'px' }],
  ['pip.ringHollow', 2.2, 'Width of the side-coloured ring of a carried-forward pip: thick enough to hold 3:1 against the ground at the opening zoom', { min: 0.8, max: 3, unit: 'px' }],
  ['unit.h', 14, 'Height of the body of a unit mark (the footprint adds the selection margin on each side)', { min: 12, max: 20, unit: 'px' }],
  ['name.alpha', 1, 'Opacity of the grown-in full name (the same semibold cut as the code, at full ink)', { min: 0.4, max: 1 }],
  ['code.baseline', 4.1, 'Distance of the lettering baseline below the middle of a mark (the digits sit centred on the pip)', { min: 2, max: 6, unit: 'px' }],
  // ---- formation and crowd mark: the pennant on its staff -----------------------------------------------------------------------------------------------------------------
  ['foot.size', 9, 'Width of the pip a pennant stands on (a division stands on a slightly larger one, a corps on the largest)', { min: 6, max: 14, unit: 'px' }],
  ['flag.w', 21, 'Length of a brigade pennant, swallow-tail or point included (a division flies 22 % larger, a corps 45 %)', { min: 12, max: 30, unit: 'px' }],
  ['flag.h', 13, 'Height of a brigade pennant', { min: 8, max: 20, unit: 'px' }],
  ['flag.notch', 6, 'Depth of the swallow-tail of a Union pennant and of the point of a Confederate one: the largest device of the mark that is neither colour nor text, so the armies read apart at a glance and in greyscale', { min: 0, max: 9, unit: 'px' }],
  ['flag.staff', 6, 'Length of the staff between the pip and the pennant', { min: 2, max: 14, unit: 'px' }],
  ['staff.width', 1.5, 'Width of the staff the pennant flies from; it stands on the pip, which is the place of the unit', { min: 0.75, max: 2.5, unit: 'px' }],
  ['flag.gap', 5, 'Space between a pennant and its lettering', { min: 2, max: 10, unit: 'px' }],
  ['flag.padX', 3.5, 'Space round the count inside a pennant that has to widen for two digits', { min: 1, max: 6, unit: 'px' }],
  ['flag.edge', 1.1, 'Width of the edge of a fresh pennant (ink on the day ground, light on the night ground)', { min: 0.5, max: 2, unit: 'px' }],
  ['flag.edgeHollow', 2, 'Width of the side-coloured edge of a carried-forward pennant', { min: 1, max: 3, unit: 'px' }],
  // ---- level of detail ----------------------------------------------------------------------------------------------------------------------------------------------
  ['detail.corpsNameZoom', 11, 'From this zoom a corps (and a crowd of one) says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.divisionNameZoom', 12.5, 'From this zoom a division (and a crowd of one) says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.brigadeNameZoom', 13, 'From this zoom a brigade says its name', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.codeZoom', 14, 'From this zoom a unit pip carries its short code (below it a pip is bare: pointing says which unit it is).  The site opens at 13.5, where the formations and crowds are named and the regiments are bare pips: half the lettering of round 1, one rank of bold', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.crowdNameZoom', 12, 'From this zoom a crowd pennant says what its units share (a formation, a corps, both armies): a number alone never stands for hidden units', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.selectGrowZoom', 15, 'From this zoom a selected mark grows its name and the layout makes room for it; below it the selection is a ring (the crowd pennant that stands for a hidden unit gets the ring) and nothing moves, so selecting never re-flows a crowded overview', { min: 10, max: 18, unit: 'zoom' }],
  ['detail.selectNameMinViewport', 560, 'A selected mark grows its full name only when the window is at least this wide (px); on a phone the sheet carries the name and the mark stays small', { min: 320, max: 2000, unit: 'px' }],
  ['detail.unitNameZoom', 17, 'From this zoom a unit says its full name: the same mark grows, there is no second box', { min: 14, max: 18, unit: 'zoom' }],
  ['detail.hullZoom', 12, 'From this zoom a crowd shows the true positions of the units it stands for', { min: 11, max: 18, unit: 'zoom' }],
  // ---- state: carried forward (the one provisional device) -----------------------------------------------------------------------------------------------------
  ['carried.hollow', 1, 'How far a carried-forward pip or pennant hollows: 0 = no change, 1 = fully hollow with a thick side-coloured ring', { min: 0, max: 1 }],
  ['carried.glass', 0.6, 'Opacity of the glass inside a hollow mark', { min: 0, max: 1 }],
  ['carried.tint', 0.34, 'How much of the side colour tints that glass (the hue stays, so a carried-forward mark is never grey)', { min: 0, max: 0.6 }],
  // ---- crowd member dots ---------------------------------------------------------------------------------------------------------------------------------------------
  ['hull.dot', 2.3, 'Radius of the dot on the true position of one unit a crowd stands for (shown while the crowd is pointed at or selected)', { min: 1, max: 4, unit: 'px' }],
  ['hull.leader', 0.75, 'Opacity of the hairlines from a crowd to its units while it is pointed at or selected', { min: 0, max: 1 }],
  // ---- pin and leader (drawn only for the mark that is hovered or selected; a resting field of them was wiring) ----------------------------------------------------------------------------------------------------------------------------
  ['pin.r', 2.4, 'Radius of the true-position ring', { min: 1, max: 4, unit: 'px' }],
  ['leader.width', 1, 'Width of the hairline from the true position to its mark', { min: 0.5, max: 2, unit: 'px' }],
  ['leader.alpha', 0.9, 'Opacity of that hairline', { min: 0, max: 1 }],
  // ---- selection and hover ---------------------------------------------------------------------------------------------------------------------------------------------
  ['sel.gap', 2.2, 'Space between the pip and the selection ring', { min: 1, max: 5, unit: 'px' }],
  ['sel.width', 2, 'Width of the selection ring, in the mark’s own side colour under a paper hairline', { min: 1, max: 3, unit: 'px' }],
  ['hover.width', 1.25, 'Width of the fainter hover ring', { min: 0.5, max: 2, unit: 'px' }],
  // ---- motion (eased in wall-clock ms; the display layer owns position, size, fade and travel: motion.* dials of the engine) -------------------------------
  ['motion.selectMs', 140, 'Ease of the selection ring (critically damped)', { min: 0, max: 600, unit: 'ms' }],
  ['motion.hoverMs', 90, 'Ease of the hover state', { min: 0, max: 600, unit: 'ms' }],
];

// ---- variants: the same drawing under other token sets ----------------------------------------------------------------------------------------------------------------
// Two families (the two grounds): 'quiet-cartographer' is NIGHT, 'quiet-cartographer-day' is DAY; each has a colour-blind-safe and a high-contrast variant (skin ids <family>/cvd, <family>/contrast).
export const QC_DAY = {
  'color.union': '#164fb0', 'color.confederate': '#a63010', 'color.unknown': '#f2f4f7', 'color.unionFlag': '#164fb0', 'color.confederateFlag': '#a63010', 'color.glass': '#fbf8f0',
  'color.ink': '#14202c', 'color.tintUnion': '#12398a', 'color.tintConfederate': '#7c2106', 'color.tintUnknown': '#2a323b', 'color.tintMixed': '#2a3340',
  'color.halo': '#fbf8f0', 'color.ring': '#142231', 'color.select': '#101a24',
  'halo.alpha': 0.92, 'carried.glass': 0.7, 'carried.tint': 0.3,
};
export const QC_NIGHT_VARIANTS = {
  cvd: { label: 'Colour-blind safe', set: { 'color.union': '#52a9e6', 'color.confederate': '#e08a00', 'color.unionFlag': '#1f78b8', 'color.confederateFlag': '#a35f00', 'color.unknown': '#f4f6f9', 'color.tintUnion': '#d6efff', 'color.tintConfederate': '#ffe1ad' } },
  contrast: { label: 'High contrast', set: { 'color.union': '#7ab8ff', 'color.confederate': '#ff8a60', 'color.unionFlag': '#1f5fc0', 'color.confederateFlag': '#b53515', 'color.unknown': '#f6f8fb', 'halo.width': 4, 'halo.alpha': 0.95, 'pip.ring': 1.9, 'text.dimAlpha': 1, 'name.alpha': 1, 'sel.width': 2.5, 'leader.alpha': 1 } },
};
export const QC_DAY_VARIANTS = {
  cvd: { label: 'Colour-blind safe', set: { 'color.union': '#005f99', 'color.confederate': '#c45300', 'color.unionFlag': '#005f99', 'color.confederateFlag': '#a64600', 'color.tintUnion': '#00507f', 'color.tintConfederate': '#7a3200' } },
  contrast: { label: 'High contrast', set: { 'color.union': '#0a3d9c', 'color.confederate': '#a82a08', 'color.unionFlag': '#0a3d9c', 'color.confederateFlag': '#a82a08', 'color.unknown': '#14191f', 'color.tintUnion': '#0a2d73', 'color.tintConfederate': '#7a1e04', 'color.tintUnknown': '#14191f', 'halo.width': 4, 'halo.alpha': 0.96, 'pip.ring': 1.9, 'text.dimAlpha': 1, 'name.alpha': 1, 'sel.width': 2.5, 'leader.alpha': 1 } },
};
