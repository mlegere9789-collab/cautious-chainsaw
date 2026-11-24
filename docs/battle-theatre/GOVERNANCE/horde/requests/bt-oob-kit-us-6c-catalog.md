# bt-oob-kit / us-6c: catalog requests (code changes of the integrator)

Written 2026-11-24 by workstream bt-oob-kit. Items the lines of `kit/evidence/us-6c.jsonl` give as `null` because the catalog lacks them, and one the compile refuses:
- weapon: the Harper's Ferry musket changed from flintlock to percussion, calibre .68 (49th Pennsylvania, line us-6c:0246; `weapon_id` null); the Belgian rifle (93d Pennsylvania, line us-6c:0249; `weapon_id` null, `imported_arms_not_covered` is the nearest item).
- weapon: the compile dry run says `springfield_model_unspecified` "cannot be assigned to weapon by rule" for line us-6c:0251 (93d Pennsylvania, inferred, July 1863): please check the rule against the item.
- dress, shoes: worn-out shoes and feet tied up in cloths (139th Pennsylvania, June 1863, line us-6c:0253) and shoes badly worn (7th Maine, 1 to 2 July 1863, line us-6c:0254): no catalog item for worn or missing shoes of Union troops (`barefoot_cs` is Confederate).
- dress, badge: the corps line us-6c:0209 gives the Sixth Corps order with a null item (three colours, three catalog items); the regiment lines use `badge_VI_red`, `badge_VI_white` and `badge_VI_blue`.
