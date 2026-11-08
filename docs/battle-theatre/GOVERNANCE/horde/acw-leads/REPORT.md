# ACW.zip (Napoleon: Total War "American Civil War" mod): decode report

**Status of everything below: tier `lead`. Nothing here is `documented`.** The mod is a game-design artefact by unknown modders; it is at most a pointer to what to look up in a real source (CLAUDE.md Law 4). No mod data, model, texture, audio or full table is copied into this repo. The licence is unverified (the archive contains no licence file), so only structure, counts and short factual summaries are recorded. The full decode lives outside the repo (see "Scratch location").

## 1. Archive

- File: `ACW.zip`, 2,161,900,663 bytes, sha256 `8efdb2627d76678b906a6a44d019fcc698eb3d0d7e79555e390be440d013c9ed`; 36 entries, 3.75 GB uncompressed. Never executed; only unpacked into a scratch dir and parsed with `python3 -I`.
- Contents: `ACW/Core/{Graphics,Main,Maps}`, `ACW/Local`, `ACW/UI`, `ACW/Revert`, `ACW/Launcher` (a .NET/WPF launcher exe, not run; `user.script.txt` is a UTF-16 mod-load list naming 18 packs plus a few engine settings). `Launcher/` is a Napoleon (Warscape) mod load order, so the packs only make sense on top of the Napoleon base game, whose assets are not included.
- 21 `.pack` files, all `PFH0` (Creative Assembly pack). Header verified on every pack: `PFH0`, then five u32 (type, pack-index count, pack-index size, file count, file-index size), pack index, file index of `[size u32][path\0]`, then data in order. Summed sizes equal the file length exactly for all 21. (The earlier `packls.py` mis-read the header because it assumed four u32; the fifth is the file-index size.) Pack type 3 for most, 4 for `acw_local`, 0 for the two `boot.pack`.
- The packs were saved with RPFM (`*.rpfm_reserved` files) and still carry Subversion metadata (see section 7).

## 2. Pack inventory (file counts, bulk content)

| Pack | Files | Holds |
|---|---|---|
| Main/ACW_Data | 372 | 368 DB tables (section 3), 1 UI logo, 3 RPFM housekeeping files |
| Main/ACW_Animations | 13 | 10 animation fragment `.txt` (readable) |
| Main/ACW_Effects | 164 | 158 effect textures (dds/tga), `landbattle.xml`, 2 `.fx` shaders |
| Main/Luac/ACW_Luac | 14 | 10 compiled Lua 5.1 bytecode UI scripts (`ESC Lua Q`), `mod_details.lua` (one line: version string "ACW2 - 2.0 (Dev Ver)") |
| Main/SFX/SFX_Troop | 348 | 345 mp3 voice/shout lines under `Cs\actor*\...` and `Us\actor*\...` (listed, not extracted) |
| Main/SFX/SFX_Music | 611 | 603 wav + 4 mp3 + 1 `.bob`; field-musician calls, front-end music (listed, not extracted; 272 MB) |
| Maps/ACW_Battles | 132 | 124 `radar.jpg` + 5 DB tables (`battles_tables` x3, weather descriptions, sky-type junction) |
| Maps/ACW_Environment1 | 1582 | 126-preset terrain set (part 1): per preset height maps (dds), colour/blend maps (jpg), ground-type map (tga), `bmd.tree_list`, `bmd_*_buildings.building_list`, `battle.environment` (XML lighting), `deployment_areas.xml`, `weather.xml`, `textures.xml`, `definition.xml` |
| Maps/ACW_Environment2 | 1787 | same, part 2 (1.27 GB + 1.11 GB total in the two packs) |
| Graphics/Models/Models_FX1 | 334 | rigid/animatable models (59 `rigid_model`, 31 `animatable_rigid_model`, 3 `fbx`), 9 `variant_weighted_mesh`, 160 dds, SVN text-bases |
| Graphics/Models/Models_FX2 | 80 | 78 `variant_weighted_mesh` (per-regiment/general/cavalry unit meshes, LOD1/LOD3) |
| Graphics/Models/Models_TXT1, TXT2 | 58, 88 | 54+84 unit texture dds, horse textures |
| Graphics/Units/Unit_VariantModels | 516 | 70 `variant_part_mesh` (VMPF), 310 dds, SVN data |
| Graphics/Units/Unit_Atlas | 1337 | 1318 `unit_variant` (VRNT) slot/part descriptors, 8 atlas dds + `.atlas` |
| Graphics/Units/Unit_Icons | 1394 | 1391 UI icon/info tga |
| Graphics/UI/Flags, User_Interface | 703, 522 | flag tga by corps/army, loading-screen pictures (17), skins |
| Local/acw_local | 17 | `localisation.loc` (17,945 strings, mostly stock Napoleon text), `ui.loc` (2,788), 12 advisor mp3 |
| UI/boot, Revert/boot | 19, 19 | front-end UI textures |

Environment packs: the full index (3,369 entries) is listed; extracted only the cheap parts (xml, `.environment`, tree/building lists, `.tai`, small db): 1,397 files, 129 MB. Not extracted: ~2.3 GB of jpg/dds/tga/bmp/png/psd/raw terrain bitmaps and height maps. Audio (mp3/wav) is listed, not extracted.

## 3. DB tables (ACW_Data): decoding method and reliability

Format observed: optional `fc fd fe ff` marker + u32 version, then `01`, u32 row count, rows. Fields: string = u16 character count + UTF-16LE; booleans u8; ints/floats 4 bytes; some u16. The schema is not shipped; I inferred it (DFS over row 0 plus whole-file parse that must end exactly at EOF; second stage aligns row 0 against later rows to find string slots, leaving numeric gaps as raw bytes). Column names are **not** recovered (no schema), so only positions and values are known; numeric column meaning is inferred from neighbours and is unverified.

- 368 DB files in 37 table families. Cleanly decoded with typed columns (strings/ints/floats, EOF-exact): 78 files. Decoded with string slots exact and numeric blocks kept as raw bytes (EOF-exact): 105 files. Not decoded (strings only harvested, order retained): 185 files = all 125 `unit_stats_land_tables`, 54 of 125 `units_tables`, plus 6 singletons.
- Reliability tiers: A = typed and EOF-exact (kv tables, uniforms, gun types, gun-to-projectile, battle entities, personalities, movement modifiers, experience thresholds, equipment items, rigid/animated warscape tables, loading screens, quotes and quote people). B = string slots exact, numbers raw (units_tables 71 files, factions 3, projectile explosions/impacts, quotes, battlefield buildings, units_to_exclusive_faction_permissions 26). C = harvest only (unit_stats_land, 54 units_tables files incl. CS Cavalry, Early, Pickett, Rodes, US 11th and 12th Corps, `acw_projectiles`, `models_building`, `unit_abilities`, one factions file, equipment themes).
- Table families present: `_kv_fatigue`, `_kv_morale`, `_kv_rules` (name/value balance parameters: 36, 69, 97 keys), `fatigue_effects`, `battle_entities` (42 + 14 + sub-tables; per entity-class radius/mass-like floats), `gun_types` (40), `gun_type_to_projectiles` (101 rows), `projectiles`, `projectiles_explosions` (37), `projectile_impacts`, `battle_personalities` (41; musician/standard-bearer/officer personalities), `uniforms_tables` (49 files: one per battle x side, plus `acw_corps_uniforms`), `units_tables`, `unit_stats_land_tables`, `units_to_exclusive_faction_permissions` (26 battles), `factions`, `battle_type_faction_presets`, `battles_tables` (in Battles pack), `quotes` (76) / `quotes_people` (39), `loading_screens` (27), `unit_special_abilities`, `unit_experience_thresholds`, `unit_movement_modifiers`, `warscape_*` (model bindings).
- These tables are the mod authors' game-balance and asset-binding choices. The kv parameter names (morale thresholds, casualty penalties, flank/rear factors, misfire chances, melee knock-back steps, cover factors) are design knobs and carry no historical authority.

## 4. What is relevant to the Battle Theatre (all `lead`)

**R03 (uniforms/kit).** `Gettysburg_Union_Uniforms` (444 rows) and `Gettysburg_Confed_Uniforms` (355 rows) map each regiment/battery key (e.g. `hc_us_1_inf_19IN`, `hc_cs_hood_inf_4AL`) to a corps group (Union 1st, 2nd, 3rd, 5th, 6th, 11th, 12th; Confed 1st, 2nd, 3rd), an art-carriage variant and a uniform variant. 128 distinct Union and 85 Confed uniform keys; each resolves to a `unit_variant` descriptor in Unit_Atlas (100% match). Variants are role-split (`.soldier`, `.officer`, ...). A `unit_variant` lists slots (hands, heads, belts, hats, legs, plumes, shoulders, torsos, primary/secondary weapon, personal/ambient equipment) and the variant-part paths chosen. Part categories most used by Gettysburg variants: legs (leg_normal, cavalry_trouser_boots, trouser_gaiter), torsos (frock_coat, union_shell_jacket, union_sack_coat, confed_shell_jacket_v2, zouave jacket), hats (kepi, forage_cap, slouch_hat, fez, hardee), belts (blanket roll, brown, medallion), gloves. The same part vocabulary also appears for non-Gettysburg battles. Special-cased variants exist for the Iron Brigade (`acw_inf_line_union_iron_brigade`), a PA/NY/MA/FED state split on the Union side and VA/NC/GA/AL/MS on the Confederate side, and named general models (Meade, Hancock, Buford, Custer, Chamberlain, Lee, Longstreet, Hood, Pickett, Stuart...). Every claim of "regiment X wore Y" is a lead; trace to regimental histories, quartermaster returns and museum-held garments.

**R01/R02 (order of battle, strengths).** `units_tables` (decoded for 12 of 18 Gettysburg files; names harvested for the rest) holds, in the 12 decoded Gettysburg files, 365 Union and 207 Confederate rows (class mix: line infantry, skirmishers, light infantry, dragoons, cavalry-general, horse artillery). A numeric block per row has a first u32 that is probably the man count (Union range 7 to 907, median 429; Confed 63 to 1413, median 400). Meaning unverified; it must not be used as a strength. The 18 Gettysburg `unit_stats_land` files name 463 Union and 345 Confederate unit records with drill sets (`drill_set_infantry_line` ~500, cavalry ~185, artillery ~135), a "trained" quality tag and a weapon string per record. Weapon strings the mod assigns: Springfield 1861, Springfield 1842 (smoothbore/BnB variants), Enfield Pattern 1853, Lorenz, Mississippi 1841, Whitworth, Sharps, Burnside, Spencer, Colt repeater, plus 3-inch Ordnance, Parrott, Napoleon, howitzer. Compare to authoritative returns/ordnance records before use.

**Artillery and projectiles.** `gun_types` has 40 types (Napoleon, Parrott, Ordnance, howitzers 12/24/32, Whitworth, M1841, Gatling, siege, coastal) mapped to 101 gun-type/projectile/muzzle-flash rows (shot, canister, shell). Projectile fuse/explosion/shell-fragment records exist (37 explosion rows). Pointers only; ballistics and rounds per piece must come from ordnance manuals and returns.

**Figures and animation shards.** The Animations pack ships only 9 fragment `.txt` files (identical `acw_musket_fragment.txt` and `musket_fragment.txt`) and `animation_tables.txt` (687 lines, skeleton types man/cannon/mortar/puckle/rocket/naval_cannon). They reference 822 distinct stock Napoleon `.anim` clips (`Animations/MEN/MUSKET` 814 refs, `SABRE` 532, `FLAG_BEARER`, `ARTILLERY`, `MUSICIAN`, `CAPTAIN`, `Matched_Combat` kill/draw/parry, face anims, `Engine/Cannon`). **No `.anim` motion data is in the mod**: the motions are the base game's, so there is nothing to reuse beyond a category checklist: stand/idle variants (alt stands 1 to 5), walk/run/charge, kneel/crouch/prone, load/aim/fire (each in untrained and trained forms), bayonet, fall/die, officer, musician, standard bearer, matched melee. States are named in upper-case (STAND, STAND_IDLE_n, ...); about 315 states in the musket fragment.

**Models.** 87 `variant_weighted_mesh` (header magic `78 56 34 12`, version 1: a shader-parameter table then material names; the first geometry block appears to hold vertex count, index count, then a third field of 16; 63 of 87 files satisfy index count divisible by 3, so geometry counts are **unverified**, and bone counts and skeleton names were not decoded). Per-unit meshes: 20th Massachusetts (+NCO/officer), Hampton, Clinch, 15th Alabama, 11th Texas Cav, Forrest, Stuart, Buford, Custer, Chamberlain, Burnside, etc.; plus Union infantry/artillery/musician/officer and CSA babydoll/Tiger Zouave. The 20th Massachusetts mesh reuses material names from a stock Napoleon "norwegian_ski_troops" asset, i.e. the authors re-skinned base meshes. 90 rigid models (59 + 31 animatable) are guns/limbers/howitzers (header versions 1 to 17), fences, barns, bridges; 70 VMPF part meshes (heads, hats, equipment such as rifles, flagpoles, drums). Gun, fence and building models are game art of unverified accuracy.

**Terrain.** 126 battle presets (Gettysburg: Barlow's Knoll, Cemetery Ridge, Culp's Hill, McPherson's Ridge, Round Tops, each with B variants; battle text says "Presented at a one-to-one scale" and gives 2048 m base terrain, season summer, `lc_eu_south_s_arid` climate key, weather "dry", sun colour/direction in `battle.environment`, deployment rectangles in `deployment_areas.xml`, per-preset tree/building placement lists (binary, magic `CE AB 00 00`, `LRDZ` block, not decoded)). These are a lead for where the mod authors put trees/buildings, nothing more; height-map provenance is unknown. Per CLAUDE.md, never derive 1863 profiles from this.

**Text.** 17,945 localisation strings are mostly stock Napoleon; ACW-specific ones are battle descriptions (`battles_description_ACWHMPB_*`), 76 quotes (US/CS figures, UK magazines), unit names. The Gettysburg descriptions contain misspellings and factual claims (e.g. an unspecified "Blochers Hill" naming for Barlow's Knoll). Treat as unreviewed.

## 5. What could not be decoded, and why

- `unit_stats_land_tables` (all 125) and 54 `units_tables`, `acw_projectiles`, `models_building`, `unit_abilities`: the rows mix strings, booleans, u16 and optional strings; without the Napoleon DB schema the inference cannot place field boundaries reliably. Strings are harvested; numbers are not decoded. (Public RPFM schemas could not be fetched in this session: repository access was denied.)
- Model geometry counts, bone counts, skeleton names: no public layout for the Napoleon `variant_weighted_mesh`/`rigid_model` was available offline; only string tables and the first block header were read.
- `.tree_list`/`.building_list`/`.farm_manager`: binary, compressed or encoded block; not decoded.
- Lua UI bytecode: not decompiled; strings only.
- SFX/music: listed only. Terrain bitmaps and height maps: not extracted (about 2.3 GB).
- The two `boot.pack` share a base name; the extract of `UI/boot` overwrote `Revert/boot` in scratch (UI textures only).

## 6. Licence and authorship evidence found inside the data

No licence, readme, credits screen or author string exists in the data or loc files (the front-end has a stock "Credits" button label only). Indirect evidence only:
- Subversion metadata (`.svn/entries`, 100 entries in Models_FX1 and Unit_VariantModels): every committed file records author **`ACW_Primergy`**, revision timestamps 2011-05-21 to 2011-11-09, repository `https://subversion.assembla.com/svn/empire_american_civil_war.4` (an Assembla project; the mod lineage is therefore an *Empire: Total War* "American Civil War" mod, ported here to Napoleon). Repository UUID `4ca84c4f-01e6-4a0a-bfcb-691c0f47ad24`.
- `mod_details.lua`: "ACW2 - 2.0 (Dev Ver)". Localisation key prefix `ACWHMPB`; unit-set prefixes `acw_`, `acw2_`, `acw3_`, `acw4_`; `hc_` ("hardcore") prefix; launcher assembly name `ACW-Hardcore` (namespace `ACW_Hardcore`, window title "ACW: American Civil War"; the exe has a LegalCopyright version-resource field whose value I did not examine).
- Launcher exe strings (read as text, not run, not visited): a Discord invite `discord.gg/rgH7XmJ`, a published Google Doc link, and a netlify.app link, probably the mod's community, manual and update page. These are the best routes to the maintainers.
- Quote credits in `acw_quotes_people` credit historical speakers, not modders.
- Third-party content likely inside: stock Napoleon base game assets (re-skinned), Empire/Napoleon vanilla models and textures, and possibly community assets. The licence of each is unknown.
Conclusion: the owner should contact the maintainers via the Discord/Doc links, quoting `ACW_Primergy` and the Assembla project name, before any asset (as opposed to a lead) is used. Until then, no asset enters the product.

## 7. Scratch location and sizes

Under the session scratchpad: `acw-dl/ACW.zip` (2.16 GB), `acw-x/zip/` (3.3 GB, raw unzip minus SFX_Music), `acw-x/files/<pack>/` (1.2 GB, pack contents; audio and terrain bitmaps skipped) with a full `<pack>.index.tsv` for every pack including SFX_Music, `acw-x/decoded/` (11 MB JSON of decoded tables, `_summary.tsv`, `_summary2.tsv`), `acw-x/decoded_localisation.json`, `acw-x/unit_variants.json`. Tools in `acw-tools/`: `pfh0.py` (streaming reader/extractor), `extract_all.py`, `dbinfer.py`, `dbalign.py`, `decode_all.py`, `decode2.py`, `loc.py`, `variants.py`.
