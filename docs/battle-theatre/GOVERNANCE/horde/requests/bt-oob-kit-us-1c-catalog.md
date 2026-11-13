# bt-oob-kit / us-1c: catalog additions (kit_items.py, kit_weapons_data.py: integrator)

Written 2026-11-13 by workstream bt-oob-kit. Catalog additions are code changes of the integrator; the evidence lines carry `weapon_id: null` or `item_id: null` and the printed words where the catalog of `groups.json` lacks the item. Nothing in this note changes a file outside the workstream's ownership.

## Weapons

1. "Belgian muskets" or "Belgian rifles" with no pattern: the 6th Wisconsin's Belgian muskets of 1861 (line us-1c:0239), the 142nd Pennsylvania's "Belgian rifles" of 1862 (0406), the old French and Belgian muskets of the Vermont regiments (0264, 0265). The catalog has `imported_arms_not_covered`; whether it is the id to use for a passage that names the country and not the pattern is the integrator's decision. Until then the lines carry the printed words.
2. "Austrian rifles" with no pattern: the 13th, 14th and 16th Vermont (0263 to 0265) and the 105th New York, now companies F to K of the 94th New York (0407). The catalog has `lorenz_m1854`; the passages do not name the Lorenz pattern, so no id is given.
3. "Enfield rifle" with no pattern: the 12th and 13th Massachusetts (0242, 0244), the 94th New York (0252), the 76th New York (0253), the 14th and 16th Vermont (0264, 0265). The catalog has `p1853_enfield` and `p1856_58_enfield_short`; no passage names the pattern.
4. "Springfield rifles" with no model: the 6th Wisconsin (0239) and the 151st Pennsylvania (0255) use `springfield_model_unspecified`, which exists.
5. Bayonet states: the lines for a charge with the bayonet (0353 to 0359) use `arms` with `kit_field: bayonet` and `socket_bayonet`; the kit's bayonet state items are dress items. The route the compile should take for a state of the bayonet is the integrator's decision (the same question as in the note of group us-2c-1d).

## Dress items (nothing in the catalog)

1. The 14th Brooklyn's (84th New York) chasseur dress of 1862 (0249 to 0251): red trousers, dark blue jacket with two rows of bell buttons, a red breast piece with a row of bell buttons, a red cap. The catalog's Zouave items belong to named regiments (the 114th Pennsylvania, 44th, 146th, 5th and 39th New York); none fits.
2. The 13th Massachusetts' dark-blue loose jacket of flannel, light-blue cloth pants and regulation cap of 1861 (0245 to 0247): no matching item (`sack_coat_union`, `trousers_sky_blue_kersey` and `kepi_m1858` are the nearest; the passage names none of them).
3. The 6th Wisconsin's gray state uniform of 1861 (0240): no item (`shirt_wool_gray` and `trousers_cs_gray` are Confederate items).
4. The 12th Massachusetts' white havelocks and blue coats with red-lined overcoats folded on the knapsacks (0243): no havelock item.
5. The Iron Brigade's division colours (a large white triangular flag with the red disc of the First Corps, carried from 1 June 1863, 0237): no item beside `regimental_color_union` and `national_color_us`.
6. The 16th Maine's knapsacks and overcoats of 1862 and the men without tents or overcoats (0408, 0409): the lines use `item_id: null`.

## Items that exist and were used

`hardee_hat_iron_brigade`, `badge_I_red`, `badge_I_white`, `badge_I_blue`, `cap_deer_tail`, `pack_dropped`, `pack_none_haversack_canteen`, `springfield_model_unspecified`, `socket_bayonet`.

## Questions for the integrator

1. The 24 derived badge lines (0414 to 0437) are tier inferred and dated 1 July 1863, so the compile will apply them to the kit's `badge` cells of 24 regiments. The three Vermont regiments are not derived. Confirm that the cells are wanted before the compile runs.
2. The kit holds `lorenz_m1854` for the 2nd Wisconsin and `m1861_springfield` for the 24th Michigan (inferred); no source read states either (see the register proposal kit-us-1c-01).
