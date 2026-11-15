# bt-oob-kit / us-1c: catalog additions, second pass (kit_items.py, kit_weapons_data.py: integrator)

Written 2026-11-15 by workstream bt-oob-kit. Catalog additions are code changes of the integrator; the evidence lines carry `weapon_id: null` or `item_id: null` and the printed words where the catalog of `groups.json` lacks the item. Nothing in this note changes a file outside the workstream's ownership. The first pass's note is `bt-oob-kit-us-1c-catalog.md`.

## Weapons

1. "Enfield rifles" with no pattern: the 150th Pennsylvania (lines us-1c:0474, 0475; the inferred 0476) and the 80th New York (0511). The catalog has `p1853_enfield` and `p1856_58_enfield_short`; the passages name neither pattern.
2. "Austrian rifled muskets" and "the Austrian musket" with no model: the 80th New York (0512) and the 14th Vermont (0519). The catalog has `lorenz_m1854`; the passages do not name it.
3. "Harper's Ferry smooth bore buck and ball muskets, caliber .69" (the 83rd New York, 0513): the catalog has `m1842_smoothbore` and `smoothbore_69_musket_unspecified`; the passage names the maker's place and the calibre but not the model, so the line carries the printed words (the calibre is in the text, not in `caliber_in`).
4. "Muskets, a species of ancient weapon difficult to classify" (the 88th Pennsylvania, 0503): no item.

## Dress items

1. "Fly tents" (the 13th Vermont, 0515): no catalog item; the kit's `shelter_half` is described as "unlikely in July 1863; gap leaning inferred". The 150th Pennsylvania's "shelter-tent" (0479) uses `shelter_half`; the question for the integrator is whether the Vermont "fly tents" are the same item, and whether `shelter_half` keeps its conditional-gap status in the light of two documented mentions on 1 July.

## Items that exist and were used

`gum_blanket` (0479, 0515), `shelter_half` (0479), `blanket_roll_union` (0479), `pack_knapsack_on` (0520, 0521).

## Questions for the integrator

1. The compile applies lines whose date lies inside 26 June to 16 July 1863: of this pass the 13th Vermont's `gum_blanket` (0515, dated 1 July, night), the 150th's `gum_blanket`, `shelter_half` and `blanket_roll_union` (0479), the 13th and 14th Vermont's `pack_knapsack_on` (0520 dated 25 June, 0521), the 150th's inferred arms line (0476, no weapon id: verified tables only).
2. Lines 0479 and 0259 (the 150th's packs): the 150th's knapsacks piled (Chamberlin) and "everything but guns, accouterments, haversacks and canteens" (Captain Jones, R068, line 0259) are compatible; one man's roll of gum blanket and shelter-tent (0479) shows the second statement is not literally true for every man. The kit's `pack_state` cell stays as line 0259 gives it; the note of 0479 says so.
