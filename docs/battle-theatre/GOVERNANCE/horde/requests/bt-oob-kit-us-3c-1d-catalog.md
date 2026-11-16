# bt-oob-kit / us-3c-1d: catalog additions and questions (kit_items.py, kit_weapons_data.py: integrator)

Written 2026-11-16 by workstream bt-oob-kit. Catalog additions are code changes of the integrator; the evidence lines carry `weapon_id: null` or `item_id: null` and the printed words where the catalog of `groups.json` lacks the item. Nothing in this note changes a file outside the workstream's ownership. The dry-run compile (`python -I tools/bt/kit_overrides.py compile --dry-run --group us-3c-1d`, nothing written) gives 28 operations and 42 unapplied entries, 24 of them routed to the verified tables by design (commanders) and 18 to review; the review reasons are the questions below.

## Weapons

1. "Austrian rifles", "Austrian muskets", "Austrian guns", "the Austrian rifle", "the old Austrian muzzle loaders", with no pattern: the 57th Pennsylvania (lines us-3c-1d:0236, 0237, 0432), the 63d Pennsylvania (0395, 0397), the 124th New York (0383), the 141st Pennsylvania (0386, 0387, 0389), the 40th New York (0411, 0414). The catalog has `lorenz_m1854`; no passage names it, and one (Hays, 0396) names the "four-ribbed bayonets", the 40th's (0412) "four-cornered", the 124th's "sword-bayonets" (0383, no item). A catalog item "Austrian rifled musket, pattern not stated" (with the quadrangular bayonet) would let nine lines compile.
2. `springfield_model_unspecified` is a placeholder that the compile bars from assignment ("cannot be assigned to weapon by rule"): lines 0238 (57th, August 1863), 0388, 0389 (141st), 0404, 0405 (105th), 0408 (17th Maine, after the battle). The passages say "Springfield rifles", "Springfield rifled muskets" or "Springfields" and name no model. Either the rule lets an unspecified Springfield be assigned at the tier of the line, or the catalog needs an assignable item.
3. "Springfield muskets" (the 57th, October 1861, 0431) and "the Springfield smooth-bore musket" (the 3d Maine, 0291): the first names no pattern or calibre, the second a smooth-bore without calibre; neither fits `m1842_smoothbore` or `m1861_springfield` with certainty.
4. "Colt's five-shot revolving rifles" (the 1st Sharpshooters, 0352): the catalog has only the placeholder `revolving_and_other_breechloaders_gap`; Stevens (1892 pp. 26, 163) says both regiments used them until the Sharps rifles came in May and June 1862, so the item is a historical arm of the two regiments, not an arm of July 1863.
5. "Sharps rifles" of .52 calibre (0353, 0355, 0356, 0357, 0436) are mapped to `sharps_rifle_m1859`, the catalog's one Sharps rifle; the passages (Stevens, Fox) give the calibre and not the year of the model. The question is whether the mapping stands at tier documented (the catalog item's own note says Berdan's two regiments used it) or only inferred.
6. "Enfield rifles" and "Enfields" with no pattern (the 17th Maine, 0409; the 124th New York, 0384, 0385) are mapped to `p1853_enfield`; the catalog also has `p1856_58_enfield_short`.

## Dress items

1. "Havelocks" (a gray round hat with a wide black visor, the Sharpshooters of 1861, 0365): no item.
2. "Gray felt, seamless overcoats" (the Sharpshooters, abandoned in 1862, 0366): no item; the regulation blue overcoat of September 1863 (0370) is `overcoat_sky_blue_caped` in kind but the passage says only "regulation blue".
3. "Shirts that were half wool and half cotton" (the 63d, 0400) and "low, broad-soled shoes" (0401): no item; `shirt_wool_gray` and `brogan_jefferson` are near but the passages name neither.
4. "Many of the men were without shoes" (the 17th Maine, 0332), "haversacks slung and blankets rolled, no knapsack" (the 124th New York, 0322): no item; the pack states `pack_none_haversack_canteen` and `pack_blanket_roll_only` exist, but the passages are statements about a few men or a morning.
5. "The State flag" of Pennsylvania (the 114th, 0267): no item (`regimental_color_union`, `national_color_us` exist).
6. "Cap with black plume" (the Sharpshooters, 0359, 0373): the catalog's `kepi_green_berdan` has leather trim and no plume.
7. The 114th Pennsylvania's sash: `sash_zouave_sky_blue_114pa` has the kind accoutrement, so the lines 0421 and 0426 are entered under the kit field `accoutrements` as the kit has it; the passage says "blue" and the item "sky blue".
8. The dress of 1861 and 1862 (the 57th's and 63d's blouses, trousers, forage caps and brogans, 0398 to 0402, 0427 to 0430) is mapped to `sack_coat_union`, `trousers_sky_blue_kersey`, `kepi_m1858` and `brogan_jefferson` with a note on each; these are issue items of the army, not unit items.

## Questions for the integrator

1. The compile leaves to review the 114th Pennsylvania's lines (0422 headgear, 0425 shoes, 0426 accoutrements, 0440 badge: "a delegated decision names the default") and the coat (0266 against 0423: two dates, one item). The record: Rauscher (1892) names a white turban, red pants, Zouave jacket, white leggings and a blue sash and no fez; the derived red diamond (0440) differs from the kit's badge default for the regiment (no badge on most).
2. The Sharpshooters' badge lines (0328, 0329) and the 2d Regiment's weapon (0357: "the record gives US.2USS.weapon only as an inference, and the kit marks it documented"): the record has the Sharps rifle documented for June or July 1862 (0356) and inferred for 2 July; a delegated decision decides whether the kit's tier is lowered.
3. The 99th Pennsylvania's badge lines (0254, 0255, two dates) and the 17th Maine's weapon lines (0408 documented for 3 and 4 July, 0409 inferred for 2 July: Enfield, then Springfield) are "to review by hand" because the value changes across dates.
