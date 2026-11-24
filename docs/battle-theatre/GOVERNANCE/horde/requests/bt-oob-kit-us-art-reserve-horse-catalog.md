# bt-oob-kit us-art-reserve-horse: catalog items missing

- Guns: the 4 1/2-inch guns of Batteries B and M, 1st Connecticut Heavy Artillery (Tyler, OR27-1-R315: "the two batteries of 4 1/2-inch guns (B and M, First Connecticut Artillery)"), are not in `catalog.artillery_pieces` (no 4.5-inch siege rifle). The guns line of the composite unit `us-art-reserve-taft-1ctheavy` (0270) has `type_id: null`, `count: null` and no candidates. The batteries were not engaged.
- Guns: "10-pounders" (Hill's West Virginia battery, Parsons' 1st New Jersey) and "3-inch" (several batteries) are left as `type_candidates` (the passages do not say Parrott or ordnance rifle); "12-pounders" as Napoleon or 12-pounder howitzer. The 5th New York's "20-pounder Parrotts" resolve to `20pdr_parrott`, the 2d Connecticut's "James" to `14pdr_james_rifle`, the 6th Maine's "Napoleon" to `napoleon_12pdr_m1857`.
- No dress or arms lines were written (no statement found), so no dress item is requested.
