<!-- Decoded text of C:\Users\mlege\Downloads\Gettysburg-Report-v2-standalone.html (Claude Design bundled page, 533,499 bytes): the 75,244-character document body, converted from the bundle's template to markdown; embedded assets (React 18.3.1 runtime, doc-page runtime, 'Industry' design-system CSS with Barlow/Barlow Condensed fonts) are not content. Read in full 2026-10-19. -->
Gettysburg 1863 · Battle Simulation Project Bible · v2.0Research report · 19 Oct 2026

Research report · Project bible · v2.0 (full revision) · 19 October 2026

# A 1:1, 24-hour, fly-through, Total War–style recreation of the Battle of Gettysburg: research, audit, and the A–Z build plan for Claude Code

Version 2.0 revises every part of v1.0 to the owner's amended brief. The owner-input list is gone: Claude Code sources every asset itself. The owner's GPU may be used without limit, with an efficiency plan to make rapid, accurate progress. The master timeline, uniform and weapon research, terrain sources, terrain detail, weather, night, cavalry, vegetation and the research-library mandate are all expanded. Everything in both quoted briefs is now in the non-negotiable set. Inline links are sources. **[GK]** marks domain knowledge to be verified in Phase 1 against the primary sources named in Part VI. **[Assessment]** marks my own judgment.

Headline takeaways

1. Total War battles are a per-soldier deterministic simulation plus a presentation layer of motion-captured animation, physical projectiles, particles and layered sound. The project uses that architecture, but the "orders" come from the historical record.

2. Gettysburg is documented to regiment level for strength, losses, armament, positions and movements, by hour for the major actions, and with a published primary-source library numbering tens of thousands of pages. The simulation can therefore place every unit correctly at every hour, day and night, from 26 June to 5 July.

3. Individual soldiers are not individually documented, and the owner has accepted that. The standard is: every soldier is dressed, armed, equipped and behaving exactly as a soldier of that company would have been at that hour. That standard is fully achievable from the record.

4. Every input, including motion data, 3D scans, period audio, terrain data and compute, has a self-sourcing route that Claude Code can run alone (Part V §3). No step waits on the owner.

5. Scale is solved with Unreal Engine 5 Mass agents, tiered LOD, deterministic replay caches and a GPU schedule that keeps the card busy around the clock (Part V §4).

## Contents

I. How Total War battles work · II. Gettysburg as data (forces, commanders, weapons by unit, uniforms by unit and soldier type, cavalry) · III. The 1863 landscape (sources, terrain, buildings, fences, earthworks, gun positions, hospitals, vegetation, weather, sky) · IV. Master timeline, 26 June – 5 July, day and night · V. The A–Z plan: architecture, self-sourcing, GPU efficiency · VI. The research-library mandate · VII. The Claude Code operating bible · Appendix: sources

## Part I. How Total War battles work

Creative Assembly has not published engine internals. This part draws on the observable behavior of the games, modding data tables, community documentation and developer statements [GK]. Treat internal mechanisms as strong inference.

### 1. Engines by game

| Game | Battle tech | What changed [GK] |
| Shogun (2000), Medieval (2002) | 2D sprites on 3D terrain | Eight-facing sprite soldiers, units up to ~120 men, per-soldier stat rolls, death as a falling frame. |
| Rome (2004) and expansions | First fully 3D battle engine | Each soldier a low-poly skinned mesh with mocap cycles. Up to 240 per unit. Physics-driven charge impact, ballistic siege projectiles. |
| Medieval II (2006) | Upgraded Rome engine | **Matched combat**: synced two-man attack/parry/kill clips. Per-soldier face, armor and kit variation. Blood. Early gunpowder. |
| Empire (2009), Napoleon (2010) | **Warscape** | Built for gunpowder. Musket balls and cannonballs are physical projectiles that collide with soldier hitboxes. Roundshot bounces through ranks, canister cones out, shells airburst, buildings take local damage. Rank-firing drills. Volumetric-style smoke. |
| Shogun 2 (2011), Fall of the Samurai (2012) | Warscape + large mocap library | FotS adds 1860s rifled muskets, Armstrong and Parrott-type rifled guns, Gatlings and naval bombardment. The closest series analogue to 1863. |
| Rome II (2013), Attila (2015), Thrones (2018) | **TW Engine 3** | "Unit cam" at soldier eye level, more facial detail, combined land/naval, fire propagation (Attila). |
| Warhammer I–III (2016–22), Three Kingdoms (2019), Troy (2020), Pharaoh (2023) | TW Engine 3 evolutions | Single-entity monsters, hero duels, flying units, dynamic mid-battle weather and spreading fire (Pharaoh). |

### 2. Army → unit → soldier

- **Army** is a list of units plus a general and a command radius; it has no physical state of its own.

- **Unit** is a formation object with a front, depth, facing and a rank/file grid of _slots_, plus shared stats (morale, fatigue, ammunition, melee attack, defense, accuracy, reload). Orders go to the unit; each man walks, runs or turns to reach his slot, so formations visibly ripple and re-dress.

- **Soldier ("entity")** is a skinned mesh with a collision capsule, hit points, an animation state machine and a variant (face, kit, weapon). Movement, projectile hits and melee pairing are resolved per soldier.

- **Determinism**: replays and lockstep multiplayer require that the same seed and inputs produce the same battle. The fly-through needs the same property so any place and time always shows the same thing.

Napoleon community data shows the parameterization: infantry weight classes carry run speed and mass (light 4.05/80, medium 3.6/90), cavalry mass runs 450–900 and drives charge impact, and training sets how tightly and quickly a formation re-forms ([Ragnar, Steam guide, 2019–20](https://steamcommunity.com/sharedfiles/filedetails/?id=1722597677)).

### 3. Movement

- Locomotion blend spaces (walk, quick march, run, charge) scaled by slope, ground type and fatigue; units slow on hills, in woods and in water.

- Unit-level pathing across the map with local avoidance between soldiers; wheels and about-faces are per-soldier drill animations.

- Cavalry use separate horse and rider rigs with gait transitions; charge mass knocks infantry over with procedural falls or ragdoll.

- Artillery limbers and unlimbers: the limber-team-gun model is swapped for a deployed gun and a crew working round it. In Napoleon the horses flee if the gun is caught in melee and the piece is stranded ([Ragnar](https://steamcommunity.com/sharedfiles/filedetails/?id=1722597677)).

### 4. Melee between individual troops

- When units touch, soldiers pick nearby opponents, so the fighting front is a set of pairings.

- Each pairing rolls hit chance from melee attack against defense. Statistics decide the _outcome_; animation then shows it: fight-idle, attack, block, hit-react, or a synced **matched kill**.

- Charge bonus is a short boost after impact; bayonet units carry high charge bonus and moderate melee ([Ragnar](https://steamcommunity.com/sharedfiles/filedetails/?id=1722597677)).

- Morale is the main lever: units waver, rout and rally, with flee animations and loosened formation.

### 5. Small-arms projectiles

- From Empire on, each shot is a physical projectile with velocity, drop and collision. Accuracy perturbs the aim vector; misses strike ground, trees or men behind.

- In Napoleon only the front rank of line infantry fires; flintlocks reload in 20 s at range 80, and reload skill cuts the time by a percentage. Light-infantry weapons let every man fire ([Ragnar](https://steamcommunity.com/sharedfiles/filedetails/?id=1722597677)).

- Presentation: muzzle flash, a smoke puff that grows and drifts on the wind, impact dust or splinters, hit-react or death, and a positional crack and report.

### 6. Artillery

| Ammunition | Simulation and presentation |
| Roundshot | Low arc, bounces and rolls, can hit several units in a lane; the only shot that damages walls. Napoleon ranges 450 (6-pdr) to 600 (12/18-pdr) ([Ragnar](https://steamcommunity.com/sharedfiles/filedetails/?id=1722597677)). |
| Canister | Short-range cone of sub-projectiles; range 120–150 by caliber; the AI aims at the ends of a unit ([Ragnar](https://steamcommunity.com/sharedfiles/filedetails/?id=1722597677)). |
| Shell | Higher arc, airburst or impact detonation, radial fragment damage, large morale shock; howitzer shell range about 400 ([Ragnar](https://steamcommunity.com/sharedfiles/filedetails/?id=1722597677)). |
| Crew animation | Sponge → load → ram → prime → aim/traverse → fire → recoil → run up. Each crew position has its own clip; crews can be shot down and rate of fire falls [GK]. |
| Impact | Dirt plume and crater decal, bodies thrown by impulse, ragdoll death, smoke and debris, near-impact camera shake, distance-delayed sound [GK]. |

### 7. Rendering and sound

- Instancing, aggressive mesh and animation LOD, impostor-like far LODs, and unit variants assembled from heads, bodies, kit and palettes [GK].

- Heightfield terrain with splat textures, scattered trees and rocks, prefab buildings with destruction states, dynamic time of day and weather in later titles [GK].

- Layered audio: unit loops, event one-shots, voice barks, state-driven music [GK].

**[Assessment]** Take the architecture, drop the abstractions. Total War rolls statistics because players give orders. Here unit paths and engagement outcomes come from the record, and individual-level events are filled in by a seeded, physically plausible simulation constrained to reproduce documented regimental losses.

## Part II. Gettysburg as data

### 1. Scale

| Measure | Union (Army of the Potomac) | Confederate (Army of Northern Virginia) |
| Strength | 93,500–104,256; 360 guns; 36 cavalry regiments | 65,000–75,000 (possibly 80,000); 270 guns; 9,500 cavalry |
| Casualties | 23,055 (3,155 k / 14,531 w / 5,369 c-m) | 23,231 per Busey & Martin (4,708 / 12,693 / 5,830); others up to 28,000 |
| By corps (k/w/m) | I 6,059 · II 4,369 · III 4,211 · V 2,187 · VI 242 · XI 3,801 · XII 1,082 · Cav 852 · Arty Res 242 | First 7,665 · Second 6,686 · Third 8,495 · Cavalry 380 |

Source: [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg), citing Busey & Martin (2005). Where sources disagree, store both values with their source.

### 2. Command structure

**Union.** Meade. I Corps Reynolds (k. 1 July) → Doubleday → Newton; divisions Wadsworth, Robinson, Doubleday/Rowley. II Hancock; Caldwell, Gibbon, Hays. III Sickles; Birney, Humphreys. V Sykes; Barnes, Ayres, Crawford. VI Sedgwick; Wright, Howe, Newton/Wheaton. XI Howard; Barlow, von Steinwehr, Schurz. XII Slocum; Williams, Geary. Cavalry Pleasonton; Buford, Gregg, Kilpatrick. Artillery Reserve Tyler; chief of artillery Hunt ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)).

**Confederate.** Lee. First Corps Longstreet; McLaws, Pickett, Hood. Second Ewell; Early, Johnson, Rodes. Third Hill; Anderson, Heth, Pender. Cavalry Stuart; Hampton, F. Lee, Robertson, Jenkins, Jones, Imboden, Chambliss ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)).

**Lieutenant to general.** The complete order of battle to every regiment and battery, with succession as commanders fell, is in the _Official Records_ vol. 27, Busey & Martin, and on the NPS field tablets [GK]. Company officers are in state rosters (Bates for Pennsylvania, Phisterer for New York, the Roster of Confederate Soldiers, and state adjutant-general reports). Likenesses are graded _photo-verified_, _described_ (age, height, complexion, hair and eye color from enlistment and service records), or _reconstructed_. Per the amended brief, a reconstructed officer must be a period-exact officer of that grade, arm and regiment, not a portrait.

### 3. Weapons, by type and by unit

About 90% of infantry on both sides carried rifle-muskets (Alexander's figure for the ANV). The Union mainstays were the M1861 Springfield, the P53 Enfield and the Austrian Lorenz ([Bilby, American Rifleman, 2013](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)). 36% of Union regiments carried two or more weapon types ([IMFDB](https://www.imfdb.org/wiki/Gettysburg)). The average infantry engagement range was about 200 yards ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)). The authoritative per-regiment source is the quarterly ordnance returns for 30 June 1863 (NARA RG 156), compiled in print by Busey & Martin and in Coates & Thomas (_An Introduction to Civil War Small Arms_) [GK]. Phase 1 ingests them company by company.

| Weapon | Specification [GK unless cited] | Who carried it at Gettysburg |
| US M1861 Springfield rifle-musket | .58, 40-in barrel, 3-leaf rear sight, ~9 lb, triangular socket bayonet. Contractor variants (Colt Special Model 1861 with different hammer and bands; Amoskeag, Providence Tool, Lamson etc.) | Majority of AoP infantry ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)); e.g. 2nd Wisconsin, 151st Pennsylvania (issued winter 1862–63, [Wikipedia](https://en.wikipedia.org/wiki/151st_Pennsylvania_Infantry_Regiment)) |
| US M1855 rifle-musket and M1855 rifle | .58, Maynard tape primer door on lock, patchbox on early rifles | 153rd Pennsylvania (with Lorenz, [Wikipedia](https://en.wikipedia.org/wiki/153rd_Pennsylvania_Infantry_Regiment)); scattered through both armies |
| US M1863 Type I | .58, no band springs, redesigned hammer; production began 1863 | Small numbers possible in freshly re-armed Union regiments; verify per return |
| US M1842 musket (smoothbore and rifled) | .69, buck-and-ball cartridge (one ball + three buckshot) | 12th New Jersey, Irish Brigade (63rd/69th/88th NY), 145th PA, parts of 1st Minnesota, 106th PA, 4th and 8th Ohio ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/); [forum compilation of returns](https://www.muzzleloadingforum.com/threads/federal-smoothbores-at-gettysburg-jul-1863.114962/)); ~10% of arms captured by I Corps on 1 July were smoothbores |
| US M1841 "Mississippi" rifle | .54 or re-bored .58, brass furniture, sword or saber bayonet | Some Confederate regiments and a few Union units |
| British P1853 Enfield rifle-musket; P1856/58 short rifles | .577, 39-in barrel, ladder sight; short rifles with saber bayonet for sergeants and rifle companies | The most common Confederate import ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)); very common in Union regiments (149th PA all-Enfield, [Wikipedia](https://en.wikipedia.org/wiki/149th_Pennsylvania_Infantry_Regiment); 64th NY mixed, [Wikipedia](https://en.wikipedia.org/wiki/64th_New_York_Infantry_Regiment)) |
| Austrian Lorenz M1854 | .54 (some bored to .58), quadrangular bayonet, block or leaf sight | Many Union regiments (20th Maine mix, [IMFDB](https://www.imfdb.org/wiki/Gettysburg); 153rd PA); also Confederate |
| CS Richmond rifle-musket | .58, Harpers Ferry tooling, low "humpback" lockplate, brass buttplate and nosecap | ANV regiments; also the 34th Virginia Cavalry Battalion's short Richmonds ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)) |
| CS Fayetteville rifle | .58, two-band, brass furniture, saber bayonet | North Carolina regiments ([TeachersFirst / Gottfried](https://teachersfirst.org/gettysburg/weapons.cfm)) |
| Saxon/Dresden M1857, Prussian M1831 Potsdam, French M1842 | European imports, .69–.71 | Scattered Union regiments (64th NY carried Potsdams and French M1842s, [Wikipedia](https://en.wikipedia.org/wiki/64th_New_York_Infantry_Regiment)) |
| Sharps M1859 rifle (breech-loader) | .52 linen cartridge, double-set triggers on many, 30-in barrel, socket bayonet | 1st and 2nd U.S. Sharpshooters ([Wikipedia](https://en.wikipedia.org/wiki/2nd_United_States_Sharpshooters); [HistoryNet](https://historynet.com/how-these-elite-civil-war-marksmen-changed-the-face-of-warfare/)); Massachusetts sharpshooter companies; some in 1st Minnesota |
| Heavy target rifles (Morgan James, Langdon) with telescopic sights | 15–30 lb, one per company in the regimental wagons for the USSS; three-man shooter/spotter teams observed firing at the Bliss barn | Massachusetts sharpshooter companies; USSS reserve ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)) |
| Sharps, Burnside, Smith, Gallager, Merrill, Sharps & Hankins carbines | .50–.54, single-shot breech-loaders, specialty cartridges | Nearly every Union cavalryman, with saber and revolver; 9th NY Cavalry had Sharps & Hankins ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)) |
| Spencer repeating rifle | .56-56 rimfire, 7-shot tube; carbines not yet produced | 5th Michigan and part of 6th Michigan Cavalry, East Cavalry Field, 3 July only. Buford's men did _not_ have them on 1 July ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/); minority view recorded at [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)) |
| Revolvers: Colt M1860 Army .44, Colt M1851 Navy .36, Remington M1858, Starr, LeMat (rare) | Cap-and-ball six-shooters | Cavalry, officers, some artillerymen; used at point-blank range on East Cavalry Field ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)) |
| Edged: M1860 light cavalry saber, M1840 heavy saber, M1840 NCO sword, M1850 foot officer's sword, M1832 artillery short sword, bowie knives | — | By arm and rank; Wade Hampton was sabered twice in the head by 1st New Jersey troopers ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)) |
| Confederate cavalry long arms | Enfield and Richmond muskets and carbines, captured Sharps, shotguns | Stuart's brigades; the 34th VA Battalion fought as mounted infantry ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)) |
| Artillery: M1857 12-pdr Napoleon; 3-in Ordnance Rifle; 10-pdr and 20-pdr Parrott; 12-pdr and 24-pdr howitzers; 6-pdr guns (CS); Whitworth and Blakely breech-loaders (CS); James rifles | Ammunition: solid shot, shell, case (spherical/Schenkl/Hotchkiss/Parrott), canister; Bormann and paper time fuzes; Confederate fuzes unreliable | Battery-by-battery armament is in Gottfried, _The Artillery of Gettysburg_ (2008), and the OR; ingest per battery and per gun |

### 4. Uniforms and equipment, by army, arm, unit and soldier type [GK; verify per unit in Phase 3]

**Union infantry, standard.** Dark-blue wool four-button fatigue blouse (sack coat) or nine-button frock coat; sky-blue kersey trousers (dark blue for some early-war regiments); M1858 forage cap or 1858 Hardee hat; brogans; waist belt with US oval plate, cap pouch, M1855/61 cartridge box on a sling with eagle plate, bayonet scabbard; haversack, canteen (smooth or bullseye), knapsack or blanket roll; tin cup. Corps badges, ordered March 1863, were worn on the cap: I disc, II trefoil, III diamond, V Maltese cross, VI Greek cross, XI crescent, XII star, in red, white or blue for 1st, 2nd and 3rd divisions. Wear states: dust, sweat, mud after 4 July rain.

**Union distinctive units.** Iron Brigade (2nd, 6th, 7th Wisconsin, 19th Indiana, 24th Michigan): black Hardee hats, frock coats, white leggings in some companies. Bucktails (149th and 150th Pennsylvania): deer tail on the cap ([Wikipedia](https://en.wikipedia.org/wiki/149th_Pennsylvania_Infantry_Regiment)). Zouaves: 114th Pennsylvania (Collis's, red trousers, fez/turban, blue jacket with red trim), 140th New York, 146th New York (sky-blue zouave dress), 5th New York Duryée (not present; exclude), 155th Pennsylvania (zouave dress issued 1864; blue at Gettysburg). Irish Brigade: green regimental flags, M1842 muskets. Pennsylvania Reserves: standard dress. 2nd Vermont Brigade (nine-month men): new issue, little wear. XI Corps German regiments: standard dress, some with Hardee hats. Excelsior Brigade, Philadelphia Brigade: standard. Garibaldi Guard (39th NY): mixed dress with bersaglieri-style plumes largely gone by 1863.

**U.S. Sharpshooters (1st and 2nd USSS).** Dark-green frock coat with light-green piping, green forage cap (black plume officially, Vermonters wore evergreen sprigs), green or sky-blue trousers depending on supply, leather leggings, hair-covered calfskin knapsacks early in the war; by 1863 a mix of green and standard blue ([CivilWarTalk](https://civilwartalk.com/threads/the-famed-berdans-sharpshooters-and-their-unique-uniforms.88753/); [CivilWarTalk](https://civilwartalk.com/threads/berdan-green.49788/); [Wikipedia](https://en.wikipedia.org/wiki/1st_United_States_Sharpshooters)). Armed with the Sharps M1859 rifle; worked as skirmishers in open order in Pitzer's Woods, at Devil's Den and the Peach Orchard ([Wikipedia](https://en.wikipedia.org/wiki/Hiram_Berdan)). Four companies of the 1st USSS expended 95 rounds per man in a 15-minute fight in Pitzer's Woods on the morning of 2 July ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)).

**Confederate sharpshooter battalions.** Brigade-level battalions picked from the best shots in early 1863, in ordinary infantry dress, armed with rifle-muskets, well trained; fired from the Bliss barn and town rooftops; one South Carolina battalion fired 200+ rounds per man on the morning of 3 July ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)). Whitworths were probably not present ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)).

**Confederate infantry.** Richmond Depot Type II shell jacket (gray wool or jean cloth, fading to butternut), state-issue jackets (North Carolina gray sack coats; Georgia, Alabama, Mississippi, Texas, Louisiana variants), imported English gray-blue kersey and cadet-gray cloth, captured sky-blue Union trousers, slouch hats and kepis, blanket rolls, tarred haversacks, tin drum canteens, captured US accouterments. Shortage of shoes is documented (Heth's reason for approaching town, [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). Within-company variation is the rule, so per-company distributions, not one template, are historically right.

**Officers.** Union: dark-blue frock, shoulder straps by grade, crimson silk sash (buff for generals), M1850 sword, revolver, boots, slouch hat or kepi, field glasses. Confederate: gray frock or jacket, collar insignia (bars for lieutenants/captains, stars for field grade, wreathed stars for generals), Austrian-knot sleeve braid, buff or gold sash, often non-regulation hats. Generals' documented appearances (Lee on Traveller in a plain gray coat; Longstreet in a black slouch hat; Hancock in a clean white shirt on 3 July; Reynolds, Buford, Armistead with his hat on his sword point) are recorded in memoirs and must be matched.

**Cavalry.** Union: dark-blue shell jacket with yellow worsted tape, reinforced sky-blue trousers, boots, M1858 or slouch hat, carbine on a sling with snap-hook, saber on belt slings, revolver in a flap holster, horse furniture (McClellan saddle, blue saddle blanket, nosebag, picket pin, lariat). Every fourth man as horse-holder when dismounted ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)). Custer's personal black-velvet jacket and red necktie; Buford in a hunting shirt. Confederate: gray or butternut jackets, yellow trim where issued, captured gear, Jenifer and McClellan saddles, shotguns in Jenkins's brigade.

**Artillery.** Union: shell jacket with red tape, red-trimmed kepi, M1832 short sword for some, revolvers for a few; drivers with leg guards; limbers, caissons, battery wagon and forge painted olive drab with black ironwork; horses in six-horse teams. Confederate: red-trimmed where available, often plain. Horse artillery distinguished by mounted crews.

**Other soldier types present and required.** Engineers and pioneers (axes, spades, picks; built roads, cleared fields of fire, cut abatis); Signal Corps (flags and torches on Little Round Top and the Seminary cupola); provost guard; ambulance corps (green half-chevron sleeve badge, stretchers, Rucker and Wheeling ambulances); surgeons and hospital stewards (green sash, medical knapsack, operating kit); chaplains; musicians and drummer boys (herringbone-braided coats in some regiments; served as stretcher-bearers in combat); color guard (sergeant and corporals, flags cased on the march, uncased in action); staff officers and couriers; teamsters and wagon trains (army wagons with white canvas, six-mule teams); sutlers; prisoners under guard; civilians (John Burns in his swallowtail coat, townspeople, farm families sheltering in cellars). Each must be modelled, placed and animated where the record puts them.

### 5. Cavalry operations to include

- 30 June: Buford's division (Gamble, Devin) rides into town; vedettes pushed out on the Chambersburg, Mummasburg, Carlisle and Harrisburg roads; Buford observes from the Seminary cupola.

- 1 July 07:30–10:30: dismounted fight behind fences and trees, horse-holders to the rear, Calef's horse battery on the Pike, fighting withdrawal to McPherson Ridge ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)).

- 1 July afternoon: Devin screens the north; Gamble covers the I Corps retreat south of the Seminary.

- 2 July: Buford withdrawn to Westminster late morning; Hunterstown fight, Custer vs. Hampton, evening; Stuart arrives about noon ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)).

- 3 July ~15:00: East Cavalry Field, Gregg and Custer vs. Stuart, dismounted firefight at the Rummel farm, then mounted charges and a saber melee ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)). South Cavalry Field: Merritt's regulars and Farnsworth's charge, five attacks, Farnsworth killed ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)).

- 4–5 July: Imboden's wagon train, Kilpatrick at Monterey Pass, pursuit.

## Part III. The 1863 landscape

### 1. Terrain sources, 1850s–1890s

- **Hopkins, _Map of Adams Co., Pennsylvania_ (1858)**, the landowner map both armies used; names every farm ([Codex 99](http://www.codex99.com/cartography/gettysburg.html); LOC).

- **Bachelder isometric drawing (1863)** and **Bachelder troop-position maps (1873–76; 28 sheets, daily and some hourly)** ([Codex 99](http://www.codex99.com/cartography/gettysburg.html); LOC; Big Map Blog).

- **Cope's reconnaissance sketch (Oct 1863)**, in the OR Atlas ([Codex 99](http://www.codex99.com/cartography/gettysburg.html)).

- **Warren survey (Oct 1868–Oct 1869; ink-on-linen 1:2,400, 4-ft contours, building and tree types)**, NARA 305571; 1:12,000 field-checked version in the OR Atlas. The primary topographic source, better for 1868 than 1863, so cross-check fences and woodlots against 1863 testimony ([Codex 99](http://www.codex99.com/cartography/gettysburg.html)).

- **Cope's 1896 and 1904 park maps** (fence types sometimes differ from Warren, e.g. the Brien farm, [NPS Brien Farm report](https://npshistory.com/publications/gett/brien-farm.pdf)).

- **Wartime photographs**: Gardner, O'Sullivan, Gibson (5–7 July 1863), the Tysons, Weaver, Brady (mid-July); Frassanito's camera-position studies (_Gettysburg: A Journey in Time_; _Early Photography at Gettysburg_) locate each view to the meter [GK].

- **Civilian damage claims** (Pennsylvania Border Claims, 1868–71) list fences, crops, buildings and livestock destroyed, farm by farm [GK].

- **Jacobs's map and notes (1863)**, Adams County Historical Society holdings, deeds, tax lists and the Bachelder Papers (3 vols., Ladd & Ladd) [GK].

- **Period descriptions of crops and woods** in regimental histories and the OR.

### 2. Terrain sources, modern

- **USGS 3DEP / PAMAP LiDAR** bare-earth DEM, free download; **USGS Fairfield and Gettysburg 1:24,000 quads** ([NPS vegetation report](https://irma.nps.gov/DataStore/DownloadFile/151134)).

- **NPS Cultural Landscape Reports** (First Day's Battlefield, 732 acres, Mummasburg to Hagerstown Road, [GNMP blog](https://npsgnmp.wordpress.com/2014/02/21/cultural-landscape-report-for-gettysburgs-first-days-battlefield/); Little Round Top; Cemetery Ridge), **Historic Structure Reports** and farm studies (e.g. the Brien farm report, [npshistory.com](https://npshistory.com/publications/gett/brien-farm.pdf)), and the **1999 GMP/EIS** historical base maps that drove rehabilitation of woodlots, orchards, thickets and fencing to 1863 character ([NPS](https://www.nps.gov/gett/learn/nature/index.htm); [NPS video](https://www.nps.gov/media/video/view.htm?id=528D1AF9-CE02-CB51-379A942DA07773E6)).

- **NPS Vegetation Classification and Mapping report** (2003 aerials, 2004 field sampling): Dry Oak–Mixed Hardwood dominant on the diabase sill, Chestnut Oak and Tuliptree forest, Sycamore floodplain forest along streams ([NPS IRMA](https://irma.nps.gov/DataStore/DownloadFile/151134)).

- **Knowles GIS viewshed reconstruction** and the Smithsonian interactive ([Codex 99](http://www.codex99.com/cartography/gettysburg.html)); **American Battlefield Trust** time-step maps ([ABT](https://www.battlefields.org/learn/maps/gettysburg-picketts-charge-july-3-1863)); Gottfried's, Laino's and Imhof's map atlases [GK].

- **Modern imagery** for photogrammetry: NAIP aerials, PA orthophotos, open street-level imagery, published photographs and video of Devil's Den, Little Round Top, Culp's Hill boulders.

### 3. Reconstruction method

Start from the LiDAR DEM. Remove modern features (park avenues, the 1974 and 2008 visitor centers, monuments, highway cuts, the railroad as later built, quarries). Re-impose Warren's 4-ft contours where they differ and the 1863 drainage (Willoughby Run, Pitzer Run, Plum Run, Rock Creek, Stevens Run, the mill races at McAllister's and Bream's). Place every 1863 structure, fence line, orchard, woodlot, field and lane from the Warren map, Hopkins names, damage claims and the CLR base maps, then validate every placement against located wartime photographs. Each object carries its provenance and confidence grade.

### 4. Buildings (all to be modelled; representative list)

Town: ~450 structures on the 1863 street grid including the courthouse, the Diamond, the Wills house, the Fahnestock store, Christ Lutheran and St James Lutheran churches, the Presbyterian and Catholic churches, the railroad depot and unfinished rail cut, Pennsylvania College (Pennsylvania Hall), the Lutheran Seminary (Schmucker Hall with cupola), the Evergreen Cemetery gatehouse, the Wagon Hotel, the Shriver and Jacobs houses, the McClellan house where Ginnie Wade was killed. Farms: Herbst, McPherson (barn hospital, barn only survives), Forney, Hagy, Blocher, Almshouse, Benner, Culp, Spangler (Henry, George, Abraham), Leister (Meade's HQ), Brien, Codori, Trostle (Abraham; shell hole in the barn gable), Klingel, Rogers, Sherfy (house and barn burned 3 July), Wentz, Warfield, Rose (house and barn; wheatfield), Weikert (Jacob and George), Slyder, Bushman, Snyder, Hummelbaugh, Patterson, Bliss (house and barn burned ~10:00 3 July), Pitzer, McMillan, Thompson (Lee's HQ), Rummel (East Cavalry Field), Lott, Daniel Lady, Black Horse Tavern, Cashtown Inn, Marsh Creek mills [GK; each to be confirmed from the Warren map, damage claims and NPS HSRs].

### 5. Fences, with time-stamped damage

- **Types.** Post-and-rail ("thoroughfare" fence, legally required along public roads), post-and-board, Virginia worm (zigzag) between interior fields, and stone walls where fields were cleared of rock. The park today maintains over 200 miles of historically placed fencing ([CivilWarTalk](https://civilwartalk.com/threads/fences-at-gettysburg.14703/)).

- **Emmitsburg Road.** Post-and-rail on the west side and post-and-board on the east, with the road sunken about two feet; posts sunk deep and rails mortised, so they could not be pushed over, and climbing them under fire broke up Pickett–Pettigrew–Trimble at 15:30–16:15 ([ABT](https://www.battlefields.org/learn/maps/gettysburg-picketts-charge-july-3-1863); [HistoryNet](https://historynet.com/picketts-charge-gettysburg/); [Encyclopedia Virginia](https://encyclopediavirginia.org/entries/picketts-charge/); [Emerging Civil War](https://emergingcivilwar.com/2022/09/30/fence-friday-post-and-rail/)). Barksdale's men tore down a section further south during the 2 July assault ([CivilWarTalk](https://civilwartalk.com/threads/the-failure-of-picketts-charge.159590/)).

- **Worm fences** were knocked flat, carried off for firewood, or stacked into breastworks (wartime photographs show worm rails "scattered like chaff" while post-and-rail stands, [CivilWarTalk](https://civilwartalk.com/threads/the-failure-of-picketts-charge.159590/)). On the Brien farm Union soldiers removed fences for firewood and fortifications over 1–3 July ([NPS](https://npshistory.com/publications/gett/brien-farm.pdf)).

- **Stone walls**: the Angle wall and the low wall along Cemetery Ridge, the walls on Culp's Hill and around the Rose and Weikert farms, the wall at the Wheatfield's Stony Hill.

- **Rule (non-negotiable).** Every fence segment is an object with a type, a start state at 06:00 on 26 June, and a damage timeline tied to events (a unit crossing, a shell impact, a foraging party, a breastwork detail). No fence is shown damaged before the event that damaged it, and every known removal is shown as an action.

### 6. Earthworks, defenses and gun positions (constructed in time, never pre-placed)

- **Cemetery Hill lunettes.** Dug by XI Corps and I Corps artillery during the night of 1–2 July around the batteries at the cemetery gate and on East Cemetery Hill [GK]. Show the digging through the night.

- **Culp's Hill breastworks.** Greene's brigade (60th, 78th, 102nd, 137th, 149th New York) built log-and-earth works with a head-log beginning around midday 2 July after Greene insisted on it, extending along the upper and lower hill; Kane's and Candy's men extended them; Johnson attacked them after about 18:00 ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). The traverse that Greene refused along the saddle is part of the record [GK].

- **Little Round Top.** Stone breastworks piled by Vincent's and Weed's survivors and by the Pennsylvania Reserves during the night of 2–3 July, visible in the 6 July photographs [GK].

- **Seminary Ridge.** I Corps rail barricade and shallow works west of the Seminary on the afternoon of 1 July; Confederate works along the ridge on 3–4 July as Lee prepared to receive attack [GK].

- **Big Round Top, Cemetery Ridge, the Baltimore Pike line, Powers Hill, the Taneytown Road reserve artillery park, the Spangler farm artillery park** ([Spangler farm history](https://www.womenhistoryblog.com/2011/05/george-spangler-farm.html)).

- **Gun positions.** Every battery's position at every hour comes from the OR, Gottfried, Bachelder and the NPS tablets: Calef on the Pike; Hall at the railroad cut; Wiedrich, Ricketts, Stevens and Cooper on Cemetery Hill; Hazlett (Little Round Top, guns manhandled up the slope 2 July); Smith at Devil's Den; Bigelow at the Trostle farm (prolonge firing and loss of four guns); Cushing, Arnold, Brown, Rorty, Cowan at the Angle; the Alexander/Walton line along the Emmitsburg Road and Seminary Ridge for the 3 July cannonade (150–170 guns, [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)); Benner's Hill (Latimer); Oak Hill (Carter). Limber positions, caisson lines and horse lines are placed behind each.

### 7. Field hospitals and the medical system

Corps hospitals: I Corps first at the Seminary and churches in town, then east of Rock Creek; II Corps at the Schwartz and Jacob Schwartz farms at the angle of White Run and Rock Creek; III Corps on the Taneytown Road then near Rock Creek; V Corps on the Taneytown Road west of Round Top on 2 July, near Two Taverns on 3 July; VI Corps at the John Trostle house east of Rock Creek; XI Corps at the George Spangler farm (1,900+ wounded; Armistead died in the summer kitchen; artillery and ammunition park on the farm; Confederate prisoners in the wagon shed); XII Corps at the George Bushman farm near Rock Creek; Cavalry Corps at the Presbyterian church and other town buildings; Camp Letterman on the George Wolf farm on the York Pike from late July ([HMDB marker](https://www.hmdb.org/m.asp?m=13265); [Gettysburg Foundation](https://gettysburgfoundation.org/george-spangler-farm); [womenhistoryblog](https://www.womenhistoryblog.com/2011/05/george-spangler-farm.html); [Gettysburg Sentinels](https://www.gettysburgsentinels.com/caring-for-the-wounded-camp-letterman); [Wikipedia](https://en.wikipedia.org/wiki/Camp_Letterman)). Roughly 160 buildings in and around town served as hospitals ([Ghost City Tours, secondary](https://ghostcitytours.com/gettysburg/haunted-gettysburg/haunted-field-hospitals/)); a 1991 tour catalogued 17 Union and 18 Confederate sites ([PA-Roots](https://www.pa-roots.com/pacw/hospitals/gettysburghospitals.html)), and a modern site index lists some 40 farms, churches, schools and mills ([Green Heron](https://gettysburg.thegreenheron.net/site-map/)). Confederate hospitals: the Black Horse Tavern, Bream's Mill, Crawford, Currens, Plank, Butt, Cobean, Hankey, Lady and Crist farms, the Lutheran Seminary and Pennsylvania College [GK]. Under Letterman's system, regimental aid stations sat just behind the line, division hospitals two to three miles back, with ambulance trains between [GK]. On 4 July, 1.39 inches of rain swelled Plum Run and drowned wounded still lying in low ground ([AMS](https://headlines.ametsoc.org/2013/07/03/remembering-the-battle-and-the-weather/)).

### 8. Vegetation and crops in the first week of July 1863

- **Woodlots.** Managed farm woodlots of oak, hickory and American chestnut on the diabase ridges, with thin understory because of grazing and firewood cutting; chestnut was a major canopy species in 1863 and is absent today, so modern surveys must be corrected [GK; species mix from [NPS vegetation report](https://irma.nps.gov/DataStore/DownloadFile/151134)]. Named woods: Herbst/McPherson, Reynolds, Pitzer, Spangler, Biesecker, Rose, Trostle, Weikert, Ziegler's Grove, the Copse, Culp's Hill forest, the Round Tops (Little Round Top's west face had been logged the previous year, leaving it open) [GK].

- **Crops.** Wheat standing ripe, chest-high in Rose's Wheatfield and ready for harvest; oats, rye, timothy hay, corn knee- to waist-high, clover; the Sherfy peach orchard in full leaf with green fruit; Codori and other apple orchards; kitchen gardens (soldiers ate Brien's vegetables, [NPS](https://npshistory.com/publications/gett/brien-farm.pdf)) [GK; per-field crop from damage claims].

- **Ground cover.** Pastures grazed short; stubble; meadow grass along Plum Run; marsh at the foot of Little Round Top; thickets and briers in Devil's Den; rail piles.

- **Trampling.** Crops flattened by troop movement are a time-stamped change in the same way as fences.

### 9. Weather, light and sky (hourly simulation driver)

Prof. Michael Jacobs (Pennsylvania College) observed at 7 a.m., 2 p.m. and 9 p.m. as a Smithsonian Meteorological Project observer. 1 July: sky covered all day; 7 a.m. stratocumulus; 2 p.m. 76°F, very gentle southern breeze (2 mph); 9 p.m. cirrostratus. 2 July: 8 a.m. stratocumulus; 2 p.m. 81°F, sky 3/10 clear; 9 p.m. cirrus, gentle breeze. 3 July: 8 a.m. stratocumulus; 2 p.m. 87°F, clearing, the month's high, "massive thunder-cloud of summer"; thunderstorm about 6 p.m. 4 July: rain most of the day, 1.39 in. ([Gettysburg College archives](https://www.gettysburg.edu/news/stories?id=1e6a98de-63a7-4ce2-814b-68b658762243); [Baltimore Sun](https://www.baltimoresun.com/weather/bs-md-weatherpage-0629-20130628-story.html); [HistoryNet](https://historynet.com/gettysburg-heat/); [AMS](https://headlines.ametsoc.org/2013/07/03/remembering-the-battle-and-the-weather/)). Humidity is reconstructed from Harrisburg-area observers within 35 miles ([HistoryNet](https://historynet.com/gettysburg-heat/)). Sun and moon positions are computed for 39.81°N 77.23°W; the moon was full on the night of 1 July and lit the night actions on Culp's Hill and Cemetery Hill on 2 July [GK, verify against an ephemeris]. Black-powder smoke hung in the still air and accumulated in hollows; its drift follows Jacobs's wind.

**Night rule (per brief).** The simulation runs 24 hours a day from 26 June to 5 July. Night is rendered as a dim sky with moonlight, starlight and firelight, with an exposure floor so that every activity remains visible: campfires and cooking, picket lines and vedettes, digging, felling, artillery parks, wagon trains moving, wounded collection by lantern, burial, the 1–2 July all-night marches of II, V, VI and XII Corps and of Pickett, Law and Johnson, Sickles's and Meade's councils at the Leister house, Longstreet's countermarch preparations, and the Confederate withdrawal from town on the night of 3–4 July.

## Part IV. Master timeline (backbone for scripting)

Times are from the cited sources where linked; otherwise [GK] from the standard narratives (Coddington, Pfanz, Sears, Trudeau) and must be reconciled in Phase 5. Civil War clock times were unsynchronized; each event stores a time window and its sources. The event graph will hold thousands of nodes; this table is the spine.

| When | Event, with the units and places to animate |
| 26 Jun | Early's division enters Gettysburg after skirmishing with the 26th PA Emergency Militia; burns rail cars and the Rock Creek covered bridge; departs 27 Jun for York ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 28 Jun | Meade replaces Hooker at Frederick. Lee, at Chambersburg, learns from Harrison the scout that the AoP is north of the Potomac and orders concentration at Cashtown [GK]. |
| 29 Jun | Lee's army strung from Chambersburg to Carlisle to Wrightsville. Stuart's three brigades riding around the Union army, Hanover fight 30 Jun ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 30 Jun | Pettigrew's brigade approaches, sees Buford arriving ~11:00 and withdraws to Cashtown. Buford posts Gamble west, Devin north; vedettes out 3–4 miles; HQ at the Eagle Hotel; Buford climbs the Seminary cupola. Reynolds's wing at Marsh Creek and Emmitsburg; XI Corps at Emmitsburg; II Corps Uniontown; III Corps Bridgeport; V Corps Union Mills; VI Corps Manchester; XII Corps Littlestown [GK]. Night: Confederate camps at Cashtown, Heidlersburg, Fayetteville. |
| 1 Jul 05:00–07:30 | Heth's division (Archer, Davis leading, Pettigrew, Brockenbrough) marches east on the Chambersburg Pike; vedette fire; Lt. Marcellus Jones fires from a fence rail at ~600 yd ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/); [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 07:30–10:20 | Dismounted cavalry delays along Herr Ridge to McPherson Ridge; Calef's battery; Confederates deploy from column into line ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 10:00–11:30 | I Corps arrives (Wadsworth first); Reynolds killed near Herbst Woods ~10:15; Iron Brigade captures Archer; railroad-cut fight, 6th Wisconsin and 2nd Mississippi colors; Doubleday takes command ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg); [Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)). |
| 11:30–14:30 | Lull on the Pike. XI Corps arrives through town ~12:30 (153rd PA after an 11-mile march, [Wikipedia](https://en.wikipedia.org/wiki/153rd_Pennsylvania_Infantry_Regiment)); Howard leaves von Steinwehr on Cemetery Hill. Rodes deploys on Oak Hill; Carter's guns open [GK]. |
| 14:00–16:00 | Rodes attacks: O'Neal repulsed, Iverson's brigade shot down in Forney's field; Early arrives on the Harrisburg Road; Barlow's Knoll overrun, Barlow wounded; Heth's full division and Pender attack McPherson Ridge and the Seminary; 26th NC vs. 24th MI; Heth wounded; I Corps rail barricade at the Seminary; retreat through town; Coster's brigade at the brickyard; railroad-cut captures ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 16:00–19:00 | Rally on Cemetery Hill; Hancock arrives ~16:30; Wadsworth to Culp's Hill; Lee's "if practicable" order; Ewell declines; Johnson's division arrives toward dusk on the York Pike; XII Corps arrives at Rock Creek and Little Round Top area; III Corps leading elements arrive at dusk ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg); [GK]). |
| Night 1–2 Jul | Meade arrives at the Leister house ~midnight. Lunettes dug on Cemetery Hill. II Corps bivouacs on the Taneytown Road; V Corps night march from Hanover; VI Corps begins its 34-mile march from Manchester; Pickett's division leaves Chambersburg; Law's brigade leaves New Guilford (28 miles in 11 hours). Confederate wounded collected into town buildings; Union wounded left in the Seminary and churches. Pickets along Stevens Run and the Emmitsburg Road exchange fire. Full moon [GK] ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 2 Jul 04:00–09:00 | Johnson's skirmishers probe Culp's Hill; Union pickets at Rock Creek. Lee's reconnaissance (Johnston) rides to Little Round Top. Hood and McLaws near Herr Ridge after a night march. II Corps takes position on Cemetery Ridge ~07:00; V Corps arrives on the Baltimore Pike; XII Corps on Culp's Hill; Geary withdrawn from Little Round Top [GK]. |
| 07:30–12:00 | Berdan's 1st USSS and 3rd Maine reconnoiter Pitzer's Woods, 15-minute firefight with Wilcox ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)). Lee issues the attack order ~11:00; Longstreet's countermarch via Black Horse Tavern begins ~noon. Stuart arrives about noon. Pickett and Law arrive late morning ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). Greene begins breastworks on Culp's Hill. Buford's division departs for Westminster [GK]. |
| 12:00–15:00 | Sickles advances III Corps to the Peach Orchard and Emmitsburg Road ~13:00–14:00; Hunt inspects the line; III Corps artillery deploys; Meade's 15:00 corps commanders' meeting; Meade rides to Sickles; Confederate artillery opens 15:00 ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). VI Corps lead elements arrive ~14:00–16:00 [GK]. Warren on Little Round Top ~15:30. |
| 16:00–17:30 | Hood attacks ~16:00: Law and Robertson through the Slyder farm toward Devil's Den, Big Round Top and Little Round Top; Hood wounded; Smith's battery at Devil's Den; Ward's brigade holds fire to 200 yd ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)); Vincent's brigade reaches Little Round Top minutes ahead; 20th Maine vs. 15th Alabama; Hazlett's guns hauled up; Weed and O'Rorke (140th NY) arrive; Vincent, Weed, Hazlett, O'Rorke killed; 20th Maine bayonet charge ~18:30 ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 17:00–18:30 | McLaws attacks ~17:00: Kershaw and Semmes into the Wheatfield and Stony Hill; Caldwell's division (Cross, Kelly's Irish Brigade after Father Corby's absolution, Zook, Brooke) counterattacks and is destroyed piecemeal; Barksdale's Mississippians break the Peach Orchard ~18:00; Sickles's leg shattered ~18:30; Bigelow's battery at the Trostle farm; Sherfy barn and buildings fought through; Wofford sweeps the Wheatfield; Ayres's Regulars cross Plum Run; Pennsylvania Reserves charge from Little Round Top at dusk ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 18:00–19:30 | Anderson's division: Wilcox, Lang and Wright reach Cemetery Ridge; 1st Minnesota's charge ~19:00; Wright's Georgians at the Codori farm and the crest; Posey and Mahone do not advance; Hancock plugs the line with Willard's brigade (Barksdale killed) and reinforcements from I, II, XII Corps ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 16:00–20:00 | Ewell's artillery on Benner's Hill (Latimer mortally wounded) duels Cemetery Hill; Johnson's three brigades cross Rock Creek ~19:00 and attack Culp's Hill at dusk, taking the lower works vacated by XII Corps; Greene's brigade holds with I and XI Corps reinforcements ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 20:00–22:00 | Hays's Louisiana Tigers and Avery's North Carolinians (Avery mortally wounded) storm East Cemetery Hill in the dark, reach Wiedrich's and Ricketts's guns; hand-to-hand with rammers and handspikes; Carroll's brigade counterattacks; Rodes fails to advance ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). Hunterstown cavalry fight at dusk. |
| Night 2–3 Jul | Meade's council of war at the Leister house ~21:00–midnight. XII Corps returns to Culp's Hill to find the lower works occupied. Stone works piled on Little Round Top. Wounded collected across the Wheatfield and Plum Run by lantern; Confederate wounded at the Rose and Warfield farms. Confederate artillery massed along Seminary Ridge and the Emmitsburg Road overnight; Pickett's division moves to Spangler's Woods. Johnson reinforced by Smith, Daniel and O'Neal [GK]. |
| 3 Jul 04:30–11:00 | Union artillery opens on Culp's Hill ~04:30; seven hours of infantry fighting; Steuart's and Walker's attacks, the 2nd Massachusetts and 27th Indiana charge across Spangler's Meadow ~10:00; Confederates withdraw ~11:00 ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). Bliss farm: 14th Connecticut burns the barn and house ~10:00 [GK]. Sharpshooter duels from town rooftops and the Bliss barn ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)). |
| 11:00–13:00 | Lull. Pickett, Pettigrew and Trimble lie in Spangler's Woods and along Seminary Ridge in the sun. Hunt reviews the Union artillery. 12th New Jersey breaks down buck-and-ball cartridges ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)). Stuart moves to Cress Ridge. |
| 13:00–15:00 | Two signal guns; 150–170 Confederate guns open; Union reply after ~15 min with ~80 guns; Meade's HQ struck; Hunt orders a slow cease to husband ammunition ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). 2 p.m. 87°F ([Baltimore Sun](https://www.baltimoresun.com/weather/bs-md-weatherpage-0629-20130628-story.html)). |
| 15:00–16:15 | Assault steps off ~15:00; 12,500 men; Pickett's left oblique; flanking fire from Cemetery Hill and Little Round Top; 8th Ohio and 126th NY flank Brockenbrough and Davis ~15:30–15:45; Emmitsburg Road fences ~15:45–16:15; canister and volleys at 50 yd; Garnett killed, Kemper wounded; Armistead over the Angle wall; Cushing killed; 72nd and 69th PA, Hall's and Harrow's brigades converge; repulse ~16:15 ([ABT](https://www.battlefields.org/learn/maps/gettysburg-picketts-charge-july-3-1863); [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 15:00–17:00 | East Cavalry Field: dismounted fight at the Rummel farm, 5th Michigan Spencers vs. 34th VA Battalion, then Hampton's and Fitz Lee's charge met by Custer ("Come on, you Wolverines") and the 1st Michigan; Hampton sabered ([Bilby](https://www.americanrifleman.org/content/the-guns-of-gettysburg/)). South Cavalry Field: Merritt and Farnsworth; Farnsworth killed ~17:30 ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |
| 17:00–22:00 | Lee rides among the survivors ("all my fault"); Confederate line re-forms on Seminary Ridge; thunderstorm ~18:00 ([Gettysburg College](https://www.gettysburg.edu/news/stories?id=1e6a98de-63a7-4ce2-814b-68b658762243)); wounded crawl and are carried from the Emmitsburg Road fields; Union line cheers; Meade rides the line. Night: Confederates evacuate the town; Ewell's corps falls back to Seminary Ridge [GK]. |
| 4 Jul | Armies face each other in rain (1.39 in.). Union skirmishers enter town at dawn; prisoners counted; burial details begin; horse carcasses burned; Imboden's 17-mile wagon train of wounded leaves in the afternoon via Cashtown; Lee's infantry retreats after dark by the Fairfield Road ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg); [AMS](https://headlines.ametsoc.org/2013/07/03/remembering-the-battle-and-the-weather/)). Vicksburg surrenders the same day. |
| 5–7 Jul | Monterey Pass cavalry fight; Gardner's photographers arrive; VI Corps follows to Fairfield; field hospitals overflow; 14,000 Union wounded and 8,000 Confederate prisoners in a town of 2,400 ([Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Gettysburg)). |

**Arrival rule (per brief).** No unit appears before its documented arrival. The event graph stores each regiment's march route, departure and arrival times, so a viewer on 1 July sees only I, XI and Buford's units and the Confederate units that were present, and sees II, III, V, VI and XII Corps, Pickett, Law, Johnson, Anderson and Stuart on the roads at the hours they were on them.

## Part V. The A–Z plan

### 1. Architecture

Unreal Engine 5 (Nanite, Lumen or path tracing, World Partition, Mass Entity, Niagara, MetaSounds, Movie Render Queue, Sequencer), C++ and Python tooling, a Postgres/PostGIS **Battle Knowledge Base** (BKB) as the single source of truth, Git with LFS, and a continuous-integration farm on the owner's machine. UE5's Mass framework is the engine's in-house ECS built for massive crowds ([MassSample](https://github.com/Megafunk/MassSample)); benchmarks show 10,000 agents at 4.6 ms on an RTX 4080 and 20,000 at 8.2 ms, with skeletal near-LOD agents about 50× the cost of instanced far agents ([StraySpark](https://www.strayspark.studio/blog/crowd-traffic-simulation-ue5-mass-ai)). All ~165,000 soldiers, ~60,000 horses and ~10,000 vehicles are simulated at every time step; only those near the camera are rendered at full fidelity.

### 2. The 26 steps

1. **Repository and BKB schema**: units, people, kit, weapons, objects (buildings, fences, trees, rocks, guns), events, trajectories, sources, confidence.

2. **Library ingest** (Part VI): download, OCR, parse and index every free primary and secondary source; extract people, places, times, units and claims with citations.

3. **Order of battle to company**, with strengths by day and losses (Busey & Martin), commander succession, routes and arrival times.

4. **Soldier roster**: one row per man where rosters exist; age, height, complexion, occupation, fate; otherwise a demographic draw from the regiment's roster distribution, flagged.

5. **Commander likenesses**: graded; photo-matched MetaHuman heads for every photographed officer, described or period-reconstructed for the rest.

6. **Kit specifications** per regiment and company from ordnance returns, clothing returns, photographs and regimental histories; variance distributions; wear states by day.

7. **Weapon physics**: velocity, mass, drag, rate of fire, misfire, fuze behavior; calibrated to ~200-yd engagements.

8. **Terrain base**: LiDAR → de-modernize → Warren contours → 1863 drainage.

9. **Landscape layer**: woodlots by species and density including chestnut, orchards, crops by field, fences by segment and type, stone walls, lanes, roads and surfaces, the railroad cut, streams and mill dams.

10. **Buildings**: every 1863 structure with interiors where documented and time-stamped damage states.

11. **Rocks and micro-terrain**: photogrammetry of Devil's Den, the Slaughter Pen, Little Round Top, Culp's Hill, validated against wartime photographs.

12. **Fortifications as construction events**: no pre-placed works; each work has a digging crew, tools, a progress curve and the time window from the record.

13. **Atmosphere**: Jacobs's observations hour by hour, ephemeris sun and moon, humidity reconstruction, the 3 July storm, 4 July rain, smoke advection.

14. **Event graph**: every attested action as a node with unit, place polygon, time window, sources and conflicting accounts.

15. **Unit trajectories**: continuous paths from waypoints at march rates with column-to-line deployments per Casey's and Hardee's tactics, including every approach march.

16. **Soldier simulation**: Mass agents in slots; fire, reload, melee pairing, morale, fatigue, heat; deterministic and time-addressable.

17. **Loss constraint solver**: regimental k/w/m as targets; named fates scripted.

18. **Animation**: the full drill and action library (Part V §3).

19. **Crowd LOD**: skeletal near, vertex-animation-texture mid, instanced and impostor far; dithered transitions; occlusion-aware downgrades.

20. **VFX**: black-powder smoke, flash, bursts, case, canister, dust, splinters, fire, blood and wounds, rain and mud.

21. **Audio**: sourced and synthesized period sound with physically based propagation driven by the global event log, so empty woods carry the distant fight correctly.

22. **Medical and aftermath**: aid stations, ambulance trains, hospitals, prisoners, burials, carcass fires.

23. **Viewer**: free camera, a scrubber from 26 June to 5 July with jump-to-event, play at any speed forward or back, unit and soldier inspectors showing sources and grades; offline film path.

24. **Validation**: automated audits against the BKB, replay-hash determinism, photo-match tests, accuracy dashboards per sector and hour.

25. **Staged vertical slices**: McPherson Ridge 1 July → Little Round Top → Pickett's Charge → full field.

26. **Continuous upgrade**: every asset has a fidelity grade; the pipeline re-sources and re-bakes automatically when a better source appears.

### 3. Self-sourcing every input (no owner input is required)

| Input | How Claude Code obtains or produces it on its own |
| Motion data (drill, loading in nine times, volley fire, skirmish, bayonet, artillery crew drill, cavalry, digging, felling, stretcher carrying, surgery, burial, camp life) | (a) Markerless motion capture from existing video: published reenactment drill footage, living-history demonstrations, and documentary film, processed with open-source multi-person pose and shape estimation (e.g. 4D-Humans, WHAM, MediaPipe) into skeletal clips, then cleaned, retargeted and foot-locked. (b) Open mocap libraries (CMU, Mixamo, Rokoko free sets) for base locomotion. (c) Physics-based and procedural animation (ragdoll with muscle tone, IK, motion matching) for falls, impacts and terrain adaptation. (d) Matched-combat pairs assembled from (a) and (c) with contact solving. Every clip is validated frame-by-frame against the 1862 manuals (Casey, Hardee, Gilham, the 1860 Artillery Manual, Cooke's and Poinsett's cavalry tactics). |
| 3D terrain, rocks, buildings | USGS 3DEP LiDAR (free), NAIP and state orthophotos, open street-level and user-published imagery for photogrammetry, Warren-map contours, NPS HSR drawings, wartime photographs for texture and form reference. Where no scan can be built, model from measured drawings and photographs. |
| Uniforms, weapons, flags, equipment | Museum collections' published photographs and measurements (Smithsonian, Gettysburg NMP, the Museum of the Confederacy/ACWM, state museums), the Quartermaster regulations of 1861, surviving-example studies, and flag registries (Pennsylvania Capitol Preservation Committee, [151st PA colors](https://en.wikipedia.org/wiki/151st_Pennsylvania_Infantry_Regiment)). Modelled to measurement with procedural cloth and wear. |
| Audio: muskets, carbines, revolvers, artillery by caliber and charge, horses, drums, bugles, voices, wind, rain, insects | Public-domain and Creative-Commons field recordings (Freesound, Internet Archive, NPS media, reenactment video audio tracks), separated and cleaned; plus physically based synthesis of black-powder reports (muzzle blast modelling by charge mass and bore), and a propagation engine (speed-of-sound delay, air absorption at Jacobs's temperature and humidity, terrain diffraction, acoustic shadow) so that every listener position hears the correct mix. Ambient layers scale with the agent density within earshot ([StraySpark](https://www.strayspark.studio/blog/crowd-traffic-simulation-ue5-mass-ai)). |
| Faces and bodies | MetaHuman Creator and open body-model fits to period photographs; demographic draws for unnamed soldiers. |
| Compute | The owner's GPU, run continuously (§4). Everything is designed to be resumable and incremental. |
| Historical validation | Replaces a human review panel with automated multi-source agreement scoring: every claim is checked against every other source in the ingested library; disagreements open tickets that Claude Code resolves by weight of primary evidence and records as alternatives. |

**[Assessment]** This route is complete and runs without owner input. Its fidelity ceiling is the quality of the best public material at any moment; step Z keeps raising that ceiling automatically.

### 4. GPU and token efficiency plan (rapid and accurate)

- **Keep the GPU saturated 24/7.** A job queue (bakes, photogrammetry solves, pose estimation, simulation runs, Nanite builds, VAT bakes, lightmap and path-traced test renders, regression captures) with priorities, checkpointing and automatic resume. Interactive work pre-empts; the queue backfills idle time.

- **Determinism as a cache.** Because the battle is deterministic, simulation state is snapshotted every simulated minute and stored; scrubbing loads the nearest snapshot and replays forward. Nothing is ever simulated twice for the same inputs.

- **Hierarchical dirty tracking.** Every asset and event records its input hashes; a change re-runs only dependents (a changed fence line re-bakes its sector, not the field).

- **Fidelity ladders.** Each step first produces a low-fidelity proxy that unblocks downstream work, then upgrades in the queue. Vertical slices prove the pipeline on small areas before scaling.

- **Budgets.** Skeletal near-LOD agent count is capped per frame (the dominant cost); mid and far tiers are VAT and instanced; off-screen agents simulate but do not render ([StraySpark](https://www.strayspark.studio/blog/crowd-traffic-simulation-ue5-mass-ai)).

- **Token economy for Claude Code.** Batch scripts over single edits; generated code and data are derived from the BKB, never hand-typed; long references are summarized into structured notes once and reused; progress is measured against `REQUIREMENTS.md` so no effort is spent twice.

- **Accuracy gates.** Nothing advances a fidelity rung until its BKB audit passes; speed never bypasses the citation rule.

## Part VI. The research-library mandate

The brief requires reading and auditing the full freely available library on the battle and carrying the animation's accuracy as far as it goes. The library, with where to obtain it free, is the Phase 1 ingest list. Claude Code reads, indexes, cross-references and cites all of it.

- **Primary, official.** _The War of the Rebellion: Official Records_, Series I vol. 27 parts 1–3 (every Union and Confederate report, order and dispatch for the campaign), Cornell MOA and HathiTrust; the OR Atlas (David Rumsey); the _Medical and Surgical History of the War of the Rebellion_; quarterly ordnance returns (NARA RG 156) as compiled in print; the Bachelder Papers (Ladd & Ladd, 3 vols.; many letters digitized by the New Hampshire Historical Society); the Pennsylvania Border Claims; the Warren survey and Bachelder maps (NARA, LOC).

- **Primary, personal.** Hundreds of memoirs, diaries and letters on Internet Archive and HathiTrust: Alexander, Longstreet, Early, Hood, Haskell, Chamberlain, Hunt, Doubleday, Howard, Schurz, Gibbon, Fremantle, Ross, Sorrel, Dawes, Rhodes, Stiles, Casler, the Southern Historical Society Papers, _Battles and Leaders of the Civil War_, _Confederate Veteran_, the _National Tribune_; Jacobs, _Notes on the Rebel Invasion_ (1864); Hoke, _The Great Invasion_; civilian accounts (Tillie Pierce, Sallie Broadhead, Daniel Skelly, Fannie Buehler, Albertus McCreary); newspapers via Chronicling America (the _Gettysburg Compiler_, _Adams Sentinel_, Philadelphia and Richmond papers).

- **Rosters and regimental histories.** Bates, _History of Pennsylvania Volunteers_; Phisterer and the NY Monuments Commission's _New York at Gettysburg_ (3 vols.); _Pennsylvania at Gettysburg_; Clark's _North Carolina Regiments_; Virginia Regimental Histories; Alabama, Georgia, Mississippi, Texas, Louisiana, South Carolina, Maine, Vermont, Michigan, Wisconsin, Indiana, Ohio, Massachusetts, New Jersey, Minnesota, Delaware, Maryland rosters and unit histories on Archive.org.

- **Standard scholarship** (acquire where free; otherwise ingest through library access and cite): Coddington; Pfanz (_The First Day_, _The Second Day_, _Culp's Hill and Cemetery Hill_); Sears; Trudeau; Guelzo; Hess, _Pickett's Charge_; Harman, _Lee's Real Plan_; Busey & Martin; Gottfried (_Brigades_, _Artillery_, _Maps_); Laino's _Gettysburg Campaign Atlas_; Frassanito's photo studies; Wittenberg and Petruzzi on the cavalry; Adelman and Smith on Devil's Den; Desjardin on Little Round Top; Jorgensen on the Wheatfield; Shultz on artillery; the Gettysburg Magazine run; NPS Cultural Landscape Reports and Historic Structure Reports; the Gettysburg Discussion Group archive; the Licensed Battlefield Guide essays.

- **Images.** LOC Civil War photographs (Gardner, O'Sullivan, Brady), the Tyson and Weaver views, the Philippoteaux Cyclorama (sky reconstructed from Jacobs's notes, [Celebrate Gettysburg](https://celebrategettysburg.com/curb-appeal-copy/)), Forbes and Waud sketches, period cartes de visite of officers (LOC, MOLLUS-Mass collection, state archives).

- **Audit method.** Every claim is extracted with its source, grouped with agreeing and conflicting claims, weighted by proximity to the event (participant > contemporary observer > later historian) and by corroboration, and written into the BKB with its grade. Conflicts are preserved and surfaced in the viewer.

## Part VII. The Claude Code operating bible

Law 0 — the unbreakable law

**Nothing in either quoted brief is negotiable. There are no exceptions to any requirement. If you believe you have found an exception, you are wrong. Find the way to meet the requirement. However laborious the task, you will do it; every task in this bible is within your abilities to execute or to orchestrate without the project owner's input.**

Included under Law 0 by the owner's amendment: every soldier dressed, armed and equipped with 100% period accuracy for his company and hour; every unit, commander and action, day and night, shown where and when the record puts it, including approach marches and arrival times; a 24-hour animation with a dimmed but fully visible night; earthworks constructed on screen, never pre-placed; fence, crop and building damage shown at the moment it occurred; photorealistic weather and environment from Jacobs's observations; cavalry in full; trees, crops and plant growth as they stood in the first week of July 1863; navigation to any point in time, forward or back; terrain, buildings, fences, defenses, gun positions and hospitals to the furthest extent of all available knowledge; the reading and auditing of the entire free online library on the battle; self-sourcing of motion data, scans, audio and validation with no owner input; unlimited use of the owner's GPU; and relentless efficiency.

**How to apply Law 0.** (1) Never cut, simplify away or defer a requirement. (2) Where the record is silent, do not omit; build the best-evidenced reconstruction, grade it, and keep looking. (3) Where a task needs material you cannot generate from nothing, source it yourself by the routes in Part V §3, then ingest and validate. (4) Never present a reconstruction as attested fact; Law 0 compels completeness and never permits invented sources. (5) If you catch yourself writing "out of scope", "not feasible", "would require the owner to", or "future work", stop: that sentence is the exception you are wrong about.

### Standing rules

1. The BKB is the only source of truth. No visual, audio or behavioral element ships without a BKB row citing its source and grade.

2. `REQUIREMENTS.md` lists every clause of both briefs with an ID, status, evidence and the commits that advanced it. Every commit message names the IDs it serves.

3. Determinism: same seed and time, same frame. CI fails on replay-hash divergence.

4. Conflicts are never resolved silently: store every account, choose a default by evidentiary weight, surface the alternatives in the inspector.

5. Time is a first-class axis. Every object has a state timeline; nothing exists, appears, changes or breaks outside its documented window.

6. Casualties, wounds, hospitals and burials are rendered with documentary seriousness.

7. Vertical slices first; each sector completes terrain, units, animation, VFX, audio and validation before scaling.

8. The GPU never idles; the job queue is always full; checkpoints are always written.

### Process, phase by phase

| Phase | Claude Code does | Exit criteria |
| 0 Setup | Repo, UE5 project, PostGIS BKB, CI, job queue, `REQUIREMENTS.md` with every clause, source-catalogue scripts | Every clause has an ID; the queue runs on the GPU |
| 1 Library ingest | Download, OCR, parse, entity-extract and cross-reference every item in Part VI; georeference every map | Every item indexed; order of battle to company; every regiment with strength, losses, arms and route |
| 2 People | Soldier rows, commander succession, likeness grading, MetaHuman pipeline | Every officer lieutenant to general has a graded likeness; every soldier has a period-exact appearance |
| 3 Material culture | Kit per company, weapon variant per company, flags, horses and tack, wagons, guns, limbers, medical and engineer equipment | Every unit and soldier type fully specified and sourced |
| 4 Terrain | LiDAR, de-modernization, Warren fusion, landscape, buildings, rocks, fences, crops, species including chestnut | Contours within Warren tolerance; every 1863 structure, fence segment and field placed; photo-match tests pass |
| 5 Events | Event graph 26 June – 5 July with time windows, conflicts, damage and construction events | Every regiment and battery has a continuous timeline; every fence, building and work has a state timeline |
| 6 Simulation | Mass agents, drills, fire, melee, morale, heat, loss solver, medical evacuation, construction, camp life, approach marches | Losses match Busey & Martin per regiment; replay deterministic; arrivals exact |
| 7 Animation | Video-derived and procedural clip library, matched pairs, crew drills, VAT bakes, manual-verified | Every action in the event graph has a validated clip |
| 8 Atmosphere & VFX | Jacobs-driven weather, ephemeris sky, night exposure floor, smoke, fire, rain, mud | Visibility and smoke match eyewitness accounts per sector and hour; night fully legible |
| 9 Audio | Sourced and synthesized library, propagation engine, event-driven mix | Empty-woods test passes at any place and time |
| 10 Viewer & film | Free camera, bidirectional scrubber, inspectors, Movie Render Queue path | Whole battle viewable from any place and time, forward and back |
| 11 Validation & upgrade | Automated audits, multi-source agreement scoring, accuracy dashboards, continuous re-sourcing | Zero unresolved requirement IDs; upgrade loop running |

## Appendix — Sources

1. [Wikipedia, "Battle of Gettysburg"](https://en.wikipedia.org/wiki/Battle_of_Gettysburg) (accessed Oct 2026), citing Busey & Martin (2005).

2. J. G. Bilby, ["The Guns of Gettysburg," American Rifleman, 3 Jul 2013](https://www.americanrifleman.org/content/the-guns-of-gettysburg/).

3. [IMFDB, "Gettysburg"](https://www.imfdb.org/wiki/Gettysburg); [Muzzleloading Forum, Federal smoothbores (returns compilation)](https://www.muzzleloadingforum.com/threads/federal-smoothbores-at-gettysburg-jul-1863.114962/).

4. [TeachersFirst, Weapons](https://teachersfirst.org/gettysburg/weapons.cfm), citing Gottfried (2008).

5. Wikipedia regimental pages: [149th PA](https://en.wikipedia.org/wiki/149th_Pennsylvania_Infantry_Regiment), [151st PA](https://en.wikipedia.org/wiki/151st_Pennsylvania_Infantry_Regiment), [153rd PA](https://en.wikipedia.org/wiki/153rd_Pennsylvania_Infantry_Regiment), [64th NY](https://en.wikipedia.org/wiki/64th_New_York_Infantry_Regiment), [1st USSS](https://en.wikipedia.org/wiki/1st_United_States_Sharpshooters), [2nd USSS](https://en.wikipedia.org/wiki/2nd_United_States_Sharpshooters), [Hiram Berdan](https://en.wikipedia.org/wiki/Hiram_Berdan), [Camp Letterman](https://en.wikipedia.org/wiki/Camp_Letterman).

6. Sharpshooter dress: [CivilWarTalk](https://civilwartalk.com/threads/the-famed-berdans-sharpshooters-and-their-unique-uniforms.88753/); [CivilWarTalk](https://civilwartalk.com/threads/berdan-green.49788/); [HistoryNet](https://historynet.com/how-these-elite-civil-war-marksmen-changed-the-face-of-warfare/); [Civil War Monitor](https://www.civilwarmonitor.com/sharpshooters/).

7. Fences: [CivilWarTalk](https://civilwartalk.com/threads/fences-at-gettysburg.14703/); [CivilWarTalk](https://civilwartalk.com/threads/the-failure-of-picketts-charge.159590/); [Emerging Civil War](https://emergingcivilwar.com/2022/09/30/fence-friday-post-and-rail/); [American Battlefield Trust](https://www.battlefields.org/learn/maps/gettysburg-picketts-charge-july-3-1863); [HistoryNet](https://historynet.com/picketts-charge-gettysburg/); [Encyclopedia Virginia](https://encyclopediavirginia.org/entries/picketts-charge/); [NPS, Brien Farm report](https://npshistory.com/publications/gett/brien-farm.pdf).

8. Hospitals: [HMDB](https://www.hmdb.org/m.asp?m=13265); [Gettysburg Foundation](https://gettysburgfoundation.org/george-spangler-farm); [womenhistoryblog](https://www.womenhistoryblog.com/2011/05/george-spangler-farm.html); [PA-Roots](https://www.pa-roots.com/pacw/hospitals/gettysburghospitals.html); [Green Heron site index](https://gettysburg.thegreenheron.net/site-map/); [Gettysburg Sentinels](https://www.gettysburgsentinels.com/caring-for-the-wounded-camp-letterman).

9. Weather: [Gettysburg College](https://www.gettysburg.edu/news/stories?id=1e6a98de-63a7-4ce2-814b-68b658762243); [Baltimore Sun](https://www.baltimoresun.com/weather/bs-md-weatherpage-0629-20130628-story.html); [HistoryNet](https://historynet.com/gettysburg-heat/); [AMS](https://headlines.ametsoc.org/2013/07/03/remembering-the-battle-and-the-weather/); [Celebrate Gettysburg](https://celebrategettysburg.com/curb-appeal-copy/).

10. Landscape: [Codex 99](http://www.codex99.com/cartography/gettysburg.html); [NPS Nature & Science](https://www.nps.gov/gett/learn/nature/index.htm); [NPS Natural Features](https://www.nps.gov/gett/learn/nature/naturalfeaturesandecosystems.htm); [NPS Vegetation Classification](https://irma.nps.gov/DataStore/DownloadFile/151134); [GNMP CLR notice](https://npsgnmp.wordpress.com/2014/02/21/cultural-landscape-report-for-gettysburgs-first-days-battlefield/); [NPS rehabilitation video](https://www.nps.gov/media/video/view.htm?id=528D1AF9-CE02-CB51-379A942DA07773E6).

11. Engine and crowds: Ragnar, [Napoleon unit guide](https://steamcommunity.com/sharedfiles/filedetails/?id=1722597677); [StraySpark, UE5 Mass crowds (2026)](https://www.strayspark.studio/blog/crowd-traffic-simulation-ue5-mass-ai); [MassSample](https://github.com/Megafunk/MassSample); [MASSIVE](https://en.wikipedia.org/wiki/MASSIVE_(software)).

12. Primary sources to ingest in Phase 1 are listed in Part VI.