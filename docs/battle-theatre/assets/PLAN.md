# Battle Theatre: asset, uniform and commander pipeline (blueprint with a working pilot)

Part F, BATTLE THEATRE. Owner of this folder: the assets agent. Date of work: 19 October 2026. Nothing here changes product code, nothing was deployed, sent, bought or signed up for.

Evidence labels used throughout (the site's vocabulary): **Documented** (a source I read says it), **Measured** (a number measured in a source or by a command I ran), **Computed** (derived by arithmetic from those), **Modelled** (my reasoned default, flagged), **Contested** (sources I read disagree), **Unknown** (no source read settles it). A label says what the evidence supports. It is never a reason to lower a gate. Every "Measured" figure below comes from a command whose output is in this folder; the command and file are named next to it.

---------------------------------------------------------------------

## 0. Bottom line

1. **The pipeline works end to end, at prototype quality.** One 20th Maine private of July 1863 was assembled from CC0 parts (MakeHuman base mesh, CMU mocap) plus procedural 1863 kit, retargeted onto a 163-bone rig, walked at the documented quick-time pace, rendered, and measured. It is recognisable as an 1863 Union infantryman, it is not film grade, and section 4.6 says exactly why and what closes each gap.
2. **No open asset gives a rigged, animated, historically correct soldier.** The best open humanoid is low-poly and stylised (Quaternius, 1,578 triangles, CC0). The best CC-BY Civil War scans are static (Sketchfab: 106 CC-BY/CC0 downloadable models found across 24 Civil War queries; none of the Civil War ones rigged or animated). Everything period-specific must be built. That is a production job, estimated in section 5: about 2,200 to 2,900 person-days, USD 0.6 to 2.1 million at market rates (low/mid/high scenarios, assumptions listed, arithmetic in `cost_model.py`).
3. **The commander count is not 700, and the repo's source list is not clean.** The repo OOB seed has 708 distinct commanders. Wikipedia's Gettysburg order-of-battle pages (built on Busey and Martin and the Official Records) name 1,256 distinct officers. In a 12-name spot check of the seed, 3 had wrong names or regiments (57th Virginia "John Godwin", 47th Alabama "James Sheffield", battery "William Rice"). The rosters agent must replace the seed list before any likeness is built.
4. **A likeness exists for at least 39.7 percent of the 708** (281 with a Wikipedia lead image, 118 of them machine-confirmed photographs; every army, corps and division commander has one). The true figure after an archival sweep is higher and not yet known; a labelled estimate is 55 percent (section 2.2).
5. **Three belief-changing findings on dress** (primary texts for the second and third, Wikipedia's unit dates for the first): the **5th New York Zouaves were not at Gettysburg** (service ended 14 May 1863); the **140th and 146th New York received Zouave dress on 3 June 1863**, a month before the battle (Contested against Wikipedia for the 140th); the **Iron Brigade's black hats were issued to the 24th Michigan in late May 1863**. The kit spec labels each.
6. **Regulation numbers are not directly modelable.** The 1861 forage-cap regulation gives crown *seam* lengths of 5.75 to 7.75 inches; built literally they produce a leaning chimney, not a cap (tested, discarded). Artifacts and photographs, not regulations alone, must drive the shapes.
7. **Real-time budget.** On this machine's integrated GPU (Intel Arc Pro 140T, WebGL2) a static instanced 49,170-triangle soldier renders 25.2 million triangles per frame in 21.9 ms (about 1.15 billion triangles per second; section 4.5). That fixes the LOD plan.

---------------------------------------------------------------------

## 1. Historical kit specification

Sources actually read for this section (all fetched by me; public-domain texts from the Internet Archive full-text files unless noted):

| Key | Source | Where |
|---|---|---|
| DRESS61 | Regulations for the Uniform and Dress of the Army of the United States, 1861 (Jan 1861 text) | archive.org id `regulationsforununit` |
| REVREG61 | Revised Regulations for the Army of the United States, 1861, art. 1386-1422 (uniform and dress) | archive.org id `forarregulations00unitrich` |
| ORDN61 | The Ordnance Manual for the Use of the Officers of the United States Army, 1861 (accoutrements pp. 227-230) | archive.org id `ordnancemanualfo00unit_0` |
| TACT63 | The Soldier's Companion (abridged Hardee tactics), 1863 | archive.org id `soldierscompanio00lewi` |
| R146 | Campaigns of the One Hundred and Forty-sixth Regiment New York (1915) | archive.org id `campaignsonehun00braigoog` |
| R24MI | History of the Twenty-fourth Michigan of the Iron Brigade (Curtis, 1891) | archive.org id `historytwentyfo00curtgoog` |
| PAG | Pennsylvania at Gettysburg (dedication volumes) | archive.org id `pennsylvaniaatge02penn_0` |
| GERRISH | Gerrish, Army Life: A Private's Reminiscences of the Civil War (1882, 20th Maine) | archive.org id `armylifeprivates00gerr` |
| NORTON | Norton, The Attack and Defense of Little Round Top (1913) | archive.org id `littleroundtop00nortrich` |
| DAWES | Dawes, Service with the Sixth Wisconsin Volunteers (1890) | archive.org id `servsixthwiscon00dawerich` |
| FREM | Fremantle, Three Months in the Southern States (1863/64) | archive.org id `threemonthsinsou02frem` |
| GOULD | Gould, Investigations in the Military and Anthropological Statistics of American Soldiers (1869) | NLM OCR, collections.nlm.nih.gov/ocr/nlm:nlmuid-8108625-bk |
| WP | Wikipedia articles (secondary; CC BY-SA), excerpts in `data/kit-wikipedia-excerpts.json`, `data/weapons-wikipedia-excerpts.json` | en.wikipedia.org |

Not obtainable and not circumvented: the Official Records volume 27 (no Internet Archive identifier found by the title searches I ran); Busey and Martin; Gottfried, Brigades and Artillery of Gettysburg; the museum catalogues of the Smithsonian and NPS collections. These are named in 1.9 as the sources the full research programme must reach.

### 1.1 Union enlisted infantry (the default set)

| Item | Specification | Source | Label |
|---|---|---|---|
| Sack coat (fatigue) | dark blue flannel, "extending half way down the thigh", loose, no body or sleeve lining (recruits: lined), falling collar, inside pocket left, four coat buttons | DRESS61 art. 15-16 | Documented (regulation). Wartime shade, lining, button count per regiment: Modelled |
| Frock coat (dress) | single-breasted, nine buttons, skirt half the distance hip to knee, standing collar, scale epaulettes, sky-blue welt (infantry) | DRESS61 art. 12 | Documented |
| Trousers | "sky-blue mixture" (white and light blue mixed), loose, "spread well over the boot", reinforced for mounted men | REVREG61 art. 1411 | Documented. NB the earlier Jan 1861 text (DRESS61 art. 28-30) still says dark blue for enlisted men: two regulations in one year; the later one governs wartime issue (Contested on the date it reached the troops) |
| Forage cap | dark blue cloth, four-piece crown, visor 2.25 in (black above), chin strap with yellow-metal buckle, 2 in band, crown seam 5.75-6.25 in front / 7.25-7.75 in behind, tip 5.5-6 in diameter inclined down to the front | REVREG61 art. 1416 | Documented numbers; **3D interpretation Unresolved** (seam lengths, see section 0 item 6). Shape per regiment: Modelled until artifacts/photos fix it |
| Hat (Hardee/black felt) | black felt, brim and crown dimensions in DRESS61 art. 32-33 (OCR of the scan garbled, re-read from the page image), enlisted: double stitching, no binding | DRESS61 | Documented; dimensions Unknown until re-read |
| Shirt, drawers, stockings | flannel, "same as now furnished" | DRESS61 art. 124 | Documented existence; colour/cut Unknown (grey, white, check variants likely) |
| Shoes | brogans/bootees, Quartermaster issue | not in the regulations I read | Modelled; source needed (QM specifications, artifacts) |
| Overcoat | sky-blue cloth, standing collar, single-breasted, cape to the elbows, 24 buttons | DRESS61 art. 122 | Documented (not worn in July heat: Modelled) |
| Blanket | grey wool, black "U.S." 4 in, 7 ft x 5.5 ft, 5 lb | DRESS61 art. 125 | Documented |
| Knapsack | painted canvas; great-coat folded, not rolled, under the flap | DRESS61 art. 130 | Documented. Carried or dropped before the 20th Maine's fight: Contested/Unknown |
| Haversack | painted canvas with an unpainted inside sack | DRESS61 art. 131 | Documented; size Modelled (about 12 x 12 in) |
| Canteen | tin covered with wool cloth; M1858 smooth-side about 7.75 in diameter, brown wool cover | DRESS61 art. 132; dealer catalogues for size | Documented existence; size/colour Modelled (dealer sources are weak) |
| Waist belt | black leather, 1.9 in x 38.5 in, brass oval plate 3.5 x 2.25 in "U.S." | ORDN61 p. 228 | Documented |
| Cartridge box (.58) | black bridle leather, two tins holding 10+6+4 cartridges each = 40 rounds, interior 6.8 x 1.4 x 5.2 in, brass oval plate 3.5 x 2.2 in on the flap; shoulder belt 2.25 x 65.5 in; "new boxes ordered... two small boxes" (footnote) | ORDN61 pp. 227-230 | Documented. Worn on the waist belt at the right hip with the shoulder belt dropped: Modelled |
| Cap pouch | black bridle leather, 3 x 1.25 x 3 in, cone pick | ORDN61 p. 227 | Documented |
| Bayonet scabbard | black bridle leather 19.5 in, brass ferrule and tip, frog on the belt | ORDN61 p. 227-228 | Documented |
| Gun sling | russet bag leather 46 x 1.25 in | ORDN61 p. 228 | Documented |
| NCO and musician marks | chevrons, bars of lace, Hospital steward half-chevron | REVREG61 art. 1386-1401 | Documented |
| Officer coat | frock coat, single-breasted 9 buttons for Captains and Lieutenants; double-breasted for field and general grades (Colonel/Lt Col/Major 7 per row; Brigadier 8 per row in pairs; Major General 9 per row in threes) | DRESS61 art. 1-10 | Documented |
| Officer insignia | shoulder straps, epaulettes (gold; star/eagle/leaf devices), black silk-ribbed binding on hats, feathers by grade, sash, sword and belt | DRESS61 arts. 34-36, 80-92 | Documented |
| Pace | quick time 110 steps/min of 28 in; double-quick 165 steps/min of 33 in; at double-quick the piece is carried at right shoulder shift or trail | TACT63 §21-24, §353 | Documented |

**Quantities per soldier at Gettysburg** (forty rounds issued, a second forty carried is Unknown): Gerrish states forty rounds were dealt out to each man in 1862 (GERRISH, ch. 2). Ammunition shortages on 2 July: men "gather ammunition from the cartridge-boxes of disabled friend or foe" (NORTON; also GERRISH). Documented.

### 1.2 Confederate enlisted infantry (default set)

| Item | Specification | Source | Label |
|---|---|---|---|
| Jacket | by 1863 waist-length gray or butternut shell/short jackets generally worn; single-breasted, 6-9 buttons; Richmond Depot Types I-III with epaulette loops; depot cloth from kersey and broadcloth to jean and satinette; sumac/logwood and walnut dyes fade to butternut; frock coats still seen on enlisted men in photographs after Gettysburg | WP "Military uniforms of the Confederate States" | Documented (secondary); per-regiment cut/colour Unknown |
| Hat | slouch hat (felt or straw) dominant; Wilcox "a short round jacket and a battered straw hat" | FREM (3 July) | Documented for Wilcox; Modelled for the mass |
| Trousers | gray, butternut, or captured sky-blue; mixed | WP; FREM | Modelled |
| Captured Union items | frequent | WP | Documented (secondary) |
| Shoes | many shoeless; the claim that Heth sent Pettigrew into Gettysburg for shoes is in Heth's memoirs and disputed by historians | WP "Battle of Gettysburg", "Henry Heth" | **Contested** |
| Texas | Texas units had captured US blue uniforms (San Antonio, 1861) "worn as late as 1863" | WP | Documented (secondary); whether Hood's brigade wore blue in July 1863: Unknown |
| Louisiana Tigers | Zouave-style dress of the original companies replaced over time by Confederate uniforms and acquired clothing | WP "9th Louisiana", "Louisiana Tigers" | Documented (secondary); July 1863 default |
| Wheat's Tigers | not at Gettysburg as a battalion (Wheat killed 1862); only the later brigade (Hays) was present | repo OOB; WP | Documented |
| Equipment | knapsacks carried by the Alabamians climbing Big Round Top; the rest of the set (blanket roll, haversack, canteen, cartridge box) is the usual Confederate infantry set | NORTON (quoting a Union officer) for the knapsacks only | Documented for knapsacks (one source); the rest Modelled |

### 1.3 Weapons

Specifications below are Wikipedia values (secondary) unless marked ORDN61. Primary confirmation from the Ordnance Manual of 1862 and museum records is part of the research programme.

| Weapon | Data read | Label |
|---|---|---|
| Springfield M1861 | .58, ~9 lb, barrel "41 in" in the article (40 in is the usual figure; Contested), sights 100/300/500 yd, three bands | Documented (secondary) |
| Enfield P1853 | .577, 39 in barrel, 55 in overall (Wikipedia; museum catalogue 55 3/8 in), three bands | Documented (secondary) |
| Lorenz (Austrian) | .54 most used by both sides; Confederates made copies from 1863 | Documented (secondary) |
| Sharps (Berdan's regiments) | falling block, breechloader; per-regiment issue Unknown | Documented (secondary) |
| Spencer | 7-shot, rate over 20 rounds/min; unit issue at Gettysburg Unknown (the repo OOB says 8th Illinois Cavalry used Spencers; **unverified, suspect**) | Documented (type), Unknown (units) |
| Henry | 15-shot; 10,000 saw service, mostly privately bought | Documented (secondary) |
| Colt Army 1860 | .44, 2 lb 11 oz, 6 shots; Remington 1858 .44, 2 lb 13 oz | Documented (secondary) |
| 12-pounder Napoleon | bronze smoothbore, crew 9; 12.03 lb (5.5 kg) round shot to 1,619-1,680 yd at 5 degrees; ammunition chest 28 rounds, loaded chest 650 lb | Documented (secondary) |
| 3-inch ordnance rifle | wrought iron; 1,830 yd at 5 degrees; one recorded burst | Documented (secondary) |
| 10-pdr / 20-pdr Parrott | cast iron with wrought-iron band; the 10-pdr "occasionally burst without warning" | Documented (secondary) |
| Whitworth rifle, Blakely | the Whitworth rifle article read: .451 hexagonal-bore long-range rifle, hit at 2,000 yd where the Enfield managed 1,400, used by Confederate sharpshooters. The Whitworth breech-loading field gun and which Blakely guns were at Gettysburg were **not** read | Documented (rifle, secondary); guns Unknown |
| M1841 12-pdr howitzer | bronze, 4.62 in bore, 1,072 yd at 5 degrees | Documented (secondary) |
| Sabres | M1840 heavy, M1860 light cavalry; Confederate variety | Unknown (dimensions not read) |

Cannon crews, limbers, caissons, horses: a 12-pdr crew is 9; a field limber team is usually six horses, which the Wikipedia "Limbers and caissons" text I read does not state (it says six to ten for siege guns and howitzers): Unknown until the Instruction for Field Artillery (1863 edition, archive.org `instructionforf01deptgoog`, the drill source for crew positions) is parsed; it was downloaded (681 KB) but not yet read into roles: next step 1.9.

### 1.4 Corps badges and flags

Corps and division badges (disc, trefoil, diamond, Maltese cross, Greek cross, crescent, star; red/white/blue by division in 1863 as commonly stated, not verified here), regimental stands of colours, and the Army of Northern Virginia battle flag sizes were **not** verified from a source I could read (the Wikipedia titles I tried do not exist or returned nothing). Unknown until read from the Official Records/Hooker circular (March 1863) and flag collections. The flag count to produce is about 850 (570 units in the repo OOB x about 1.5 stands), costed in section 5.

### 1.5 Per-regiment table

`data/kit-by-regiment.csv` has one row for every unit in the repo's OOB json: **570 rows (329 Union, 241 Confederate)**, with dress class, label, headgear, coat, trousers, source keys and a note. Counts by class (Measured, `build_kit_by_regiment.py`):

| Class | Units | Label |
|---|---|---|
| Union infantry default | 213 | Modelled |
| Confederate infantry default | 162 | Modelled |
| Union artillery default | 55 | Documented (regulation jacket); field wear Unknown |
| Confederate artillery default | 48 | Modelled |
| Union cavalry default | 37 | Documented (regulation jacket); field wear Unknown |
| Confederate cavalry default | 22 | Modelled |
| Union Zouave-1861 pattern, July 1863 unknown (72nd PA, 73rd NY, 44th NY, 95th PA, 23rd PA, 39th NY, 42nd NY) | 7 | Unknown |
| Louisiana Tigers brigade (5th-9th LA) | 5 | Documented (secondary) |
| Iron Brigade (2nd, 6th, 7th WI; 19th IN; 24th MI) | 5 | Documented |
| Texas Brigade (1st, 4th, 5th TX; 3rd AR) | 4 | Unknown |
| 14th Brooklyn (84th NY, plus its alias row) | 2 | Unknown for 1863 |
| 149th, 150th PA (Bucktail brigade) | 2 | Contested |
| 155th PA, 91st PA (regulation dress until 1864) | 2 | Documented |
| 1st US Sharpshooters (green) | 1 | Documented; 1863 amount Unknown |
| 114th PA (Zouaves d'Afrique) | 1 | Documented; garment detail Unknown |
| 146th NY | 1 | Documented |
| 140th NY | 1 | Contested |
| 13th PA Reserves (original Bucktails) | 1 | Documented |
| 20th Maine (pilot unit) | 1 | Modelled |

That is **19 of 570 units (3.3 percent) with a non-default dress finding from a source I read (Documented or Contested), 13 more flagged Unknown (7 Zouave-pattern regiments, 4 Texas Brigade, 2 for the 14th Brooklyn rows), and the pilot unit.** The other 537 carry the honest default of their arm and side, labelled Modelled or Documented-regulation. This does **not** meet "100 percent accurate": the programme to get there is 1.9.

### 1.6 Regiments with unusual dress, by corps and division

| Corps / division | Regiment | Dress | Evidence |
|---|---|---|---|
| I Corps, 1st Div, 1st Bde (Iron Brigade) | 2nd, 6th, 7th Wisconsin; 19th Indiana; 24th Michigan | black Hardee hat, frock coat, leggings | R24MI: hats issued to the 24th in late May 1863, "no other troops wearing them"; 24th history says Confederates on 1 July cried "black-hat fellows" (Documented). Frock coat/leggings: WP (secondary) |
| I Corps, 3rd Div, 2nd Bde | 149th, 150th PA (Bucktails) | bucktail on the cap | Contested: original Bucktails (13th PA Reserves) held the sole right to wear it (PAG); WP says the later regiments wore them |
| V Corps, 3rd Div (Reserves) | 13th PA Reserves (1st Rifles, Bucktails) | bucktail | PAG (Documented) |
| V Corps, 2nd Div, 3rd Bde | 146th NY | red fez with tassel, baggy blue trousers gathered at the knee, white turban for parades only, red 10-ft sash, white leggings; received 3 June 1863 | R146 (Documented) |
| V Corps, 2nd Div, 3rd Bde | 140th NY | same Zouave dress "likewise accorded" with the 146th | R146 says June 1863; WP says January 1864: **Contested** |
| V Corps, 2nd Div, 3rd Bde | 155th PA, 91st PA | regulation until January/February 1864 | R146 footnote (Documented) |
| III Corps, 1st Div, 3rd Bde | 114th PA (Collis's Zouaves d'Afrique) | distinctive Zouave uniform; the Sherfy barn dead were identified as "unknown Zouaves" by uniform fragments | PAG (Documented); cut/colours Unknown |
| I Corps, 1st Div, 2nd Bde | 84th NY (14th Brooklyn) | chasseur dress, red trousers (1861) | WP; 1863 status Unknown |
| II Corps, 2nd Div, 2nd Bde | 72nd PA (Baxter's Fire Zouaves) | modified Zouave jacket with red trim, sky-blue trousers with red stripe (1861) | WP; 1863 status Unknown |
| III Corps, 2nd Div, Excelsior | 73rd NY (Fourth Excelsior, Fire Zouaves) | chasseur jacket, light blue trefoils, gaiters (1861) | WP; 1863 Unknown |
| V Corps, 1st Div, 3rd Bde | 44th NY | Americanised Zouave jacket (1861) | WP; 1863 Unknown. Same brigade as the 20th Maine |
| VI Corps | 95th PA (Gosline's), 23rd PA (Birney's) | Zouave style; the 95th dropped scarlet pants and kepis | WP; 1863 Unknown |
| II Corps, 3rd Div, 3rd Bde | 39th NY (Garibaldi Guard) | Bersaglieri-pattern hats with cock feathers, red-trimmed six-button tunics (1861) | WP; 1863 Unknown |
| Army, sharpshooters | 1st US Sharpshooters (and 2nd detachments) | green | WP; amount worn July 1863 Unknown |
| Cavalry Corps | all | regulation jacket with yellow lace or sack coat; the 1st Maine article says it is unclear which was issued | REGS (Documented); per-regiment Unknown |
| Artillery | all | light-artillery jacket with scarlet trim by regulation; field wear Unknown | REGS |
| Not present | **5th NY (Duryée's Zouaves)**: service ended 14 May 1863. **11th NY (Fire Zouaves)**: service ended June 1862. The repo OOB lists a "U-11NY (Fire Zouaves)" row under III Corps, 2nd Division, 1st Brigade (`U-III-2-1`): **that row is an error** | WP infobox dates; absent from Wikipedia's Gettysburg OOB | Documented |

### 1.7 Findings that correct the repo data

- U-11NY (11th New York, Fire Zouaves) is not a Gettysburg unit.
- The commander seed has errors (3 of 12 spot-checked, 2.2).
- The OOB says the 8th Illinois Cavalry used Spencer rifles on 1 July; unverified, Spencers are usually associated with Michigan units; needs Ordnance returns.

### 1.8 Hardest uncertainty: how "100 percent accurate" is reachable

Fabric, shade, cut, buttons and wear of an individual private cannot be known; some regiments are photographed or have surviving garments, most are not. The achievable standard, stated as a gate: every unit's silhouette (headgear, coat family, trousers, leggings, knapsack/roll, arms) from a regiment history, photograph or artifact where one exists, and where none does, the labelled default of its brigade and state. Colours are fixed to museum-measured swatches where they exist and otherwise to a fade range with a Modelled label. That is a research sweep of the unit histories (Busey and Martin, state adjutant-general reports, regimental histories, Pennsylvania/New York/Maine/Michigan "at Gettysburg" volumes, Fold3/Find a Grave link-outs only), costed in section 5.

### 1.9 What the research programme must read next

Official Records vol. 27 and the Ordnance returns for June 1863; Busey and Martin; Gottfried; Instruction for Field Artillery 1863 (crew roles); Hooker's corps-badge circular; the "at Gettysburg" state volumes (Pennsylvania read here only for Zouave/Bucktail passages); Confederate depot records; museum collections (Smithsonian, NPS Gettysburg, Maine, Pennsylvania and North Carolina state museums); photographs (LOC, USAHEC MOLLUS, state archives).

---------------------------------------------------------------------

## 2. Commander likeness

### 2.1 The population

Command rows were extracted from the repo OOB json (`data/extract_commanders.py`; output `data/commanders-seed.csv`, 839 rows including successions): **708 distinct persons** (army 2, corps 15, division 32, brigade 126, artillery chiefs 3, regiment 415, battery 100, other 11, succession-only 4). Wikipedia's two Gettysburg OOB pages name **1,256 distinct officers** (Union 682, Confederate 574; `data/commanders-wikipedia-oob.csv`; every regiment's colonel, lieutenant colonel, major and captains who held command, plus staff). **Contested**: the true count of named commanders (every officer who commanded a regiment or battery for any part of the battle) is nearer the second number; the exact list needs Busey and Martin and the Official Records.

Seed reliability, 12 random not-on-Wikipedia regimental/battery names checked by web search: 3 wrong (57th Virginia "John Godwin": no such officer found, the nearest match is Colonel Archibald C. Godwin of the 57th North Carolina; "James Sheffield" of the 47th Alabama: Sheffield commanded the 48th; "William Rice" of Rice's Battery: the battery's captain was Robert Sidney Rice). Measured by hand on a sample of 12, so the rate (25 percent) is very uncertain. **Action for the rosters agent: replace the seed list; this blueprint then re-runs unchanged.**

### 2.2 How many have a surviving likeness

Pipeline (`data/tools/commander_pipeline.py`): match each commander to a Wikipedia page through the links on the two OOB pages (precision check: 298 of 315 matched pages mention Gettysburg), read the lead image, its Commons licence and description, classify image type from the file description.

Measured, seed list (708 persons), lead image on Wikipedia:

| Level | Persons | With lead image | Share |
|---|---|---|---|
| Army | 2 | 2 | 100% |
| Corps | 15 | 15 | 100% |
| Division | 32 | 32 | 100% |
| Brigade (incl. artillery brigade chiefs) | 126 | 100 | 79% |
| Artillery chiefs | 3 | 3 | 100% |
| Regiment | 415 | 108 | 26% |
| Battery | 100 | 13 | 13% |
| Other / succession-only | 15 | 8 | 53% |
| **Total** | **708** | **281** | **39.7%** |

Image types of the 281 (from Commons descriptions): 118 photograph, 143 image not auto-classifiable (mostly portrait photographs and engravings; to be classified by eye in the sweep), 11 engraving/print, 2 painting, 7 non-portrait (monument, group). Licences: 265 public domain, 6 "no restrictions", 2 CC BY-SA 3.0, 2 CC BY-SA 4.0, 1 CC0, 5 not stated. Wikipedia's 1,256-name OOB list: 409 linked to a page, **364 with a lead image (29.0%)**.

The Wikipedia figure is a floor, not the answer: pages without a lead image or without any page very likely include men with surviving photographs (candidates to check first: Wainwright, Krzyzanowski, Huey, Muhlenberg; not yet checked), and some men have none (Garnett is commonly said to have no known photograph; source not read). LOC's API returned HTTP 429 to this machine (robots.txt Crawl-delay 5, I did not retry past the limit or route around it), so LOC was reached only through Commons mirrors and web search.

**Estimate (Modelled, flagged):** adding 25 percent of the remaining men (a quick open-web check of 12 random unmatched officers found a likeness for 3: Gray, 6th Michigan Cavalry (Grand Rapids library, rights reserved); Hulings, 49th PA (LOC carte de visite); Sheffield, 48th Alabama (Guntersville Museum and Alabama archives); n=12, very uncertain) gives **55 percent of 708 (388 men) and 47 percent of 1,256 (587 men)**. The archival sweep that settles it is in section 5.

### 2.3 Table of the highest-level commanders

`data/commanders-army-corps-division-table.md` lists all 49 army, corps and division commanders with lead image file, licence, type and any documented physical or horse facts found in their Wikipedia article text. The facts the regex found across all 319 matched pages: horse sentences on 47 pages, build/look on 57, height on 11, facial hair on 6 (candidate sentences, unverified, many noise). Real, usable examples: Meade's horse Old Baldy and Lee's Traveller, Pickett's "Old Black" with kepi-style cap, drooping moustache and long ringlets, Trimble's Jinny, Buford's white Grey Eagle, Walker (6 ft 4 in), Geary (6 ft 6 in, 260 lb), Custer (5 ft 11 in, size 38 jacket, 9C boots), "Extra Billy" Smith (tall beaver hat, blue cotton umbrella). **The documented-physical-facts column is the thin one:** the Official Records, regimental histories and memoirs must supply stature, build, beard and horse for the rest (candidate fact sentences exist for only 91 of the 708, unverified; the rest Unknown today).

Brigade-level commanders with no Wikipedia lead image (26): `data/commanders-likeness.csv`, filter `level=brigade`, `likeness_status != wikipedia-lead-image`.

### 2.4 Worked example: Rufus Dawes, 6th Wisconsin

Role: lieutenant colonel commanding the 6th Wisconsin, Iron Brigade, 1 July 1863 (the railroad cut charge). Sources read: DAWES (memoir), three photographs, Wikipedia. File: `commanders/dawes_three_photographs.jpg` (left: LOC print, middle: 1865-captioned bust, right: full-length).

| Fact | Finding | Source | Label |
|---|---|---|---|
| Likeness | 4 images on Commons: LOC Civil War Photograph Collection print no. 8206 "Bv't. Brig. General R. R. Dawes" (hdl.loc.gov/loc.pnp/cph.3c35922, 1861-65, public domain); two photographs captioned 1865 (full-length with hat in hand; bust); a 145x205 px postwar crop (1900-dated); an 1839-book portrait of an older Rufus Dawes is a different person and is not used | Commons `Category:Rufus R. Dawes` (file metadata fetched) | Documented (exists) |
| Dated to July 1863? | none: the LOC print is titled with a brevet rank (March 1865 or later), the others are captioned 1865 | file metadata | Unknown for July 1863 |
| Facial hair | LOC print: full dark beard; 1865-captioned bust: moustache with small chin tuft; full-length: moustache. Three different looks in the photographs. | photographs viewed | Contested for the day |
| Dress | frock coat, shoulder straps, standing collar; Iron Brigade black hat likely, hat in hand in one photograph (cannot be confirmed as Hardee) | photographs; R24MI for the brigade hats | Modelled; hat Unknown |
| Mount | "my own sturdy old mare"; on 1 July "my horse reared and plunged... fell heavily on her haunches"; the mare was shot and hobbled to the rear; no name given. (The famous "Tartar" is Captain James Stewart's horse, not Dawes's.) | DAWES, chapter "The Sixth Wisconsin at Gettysburg" and the earlier campaign letters | Documented |
| Stature, build | not in the memoir or the photographs | | Unknown |
| Regiment dress | "mismatched uniforms" at first (WP quoting Dawes), gray state clothing in 1861 (DAWES table of contents), black hats later | DAWES; WP | Documented |

What the build would use: head from the LOC print and the 1865 bust (two angles, three-quarter view available: left photograph turned slightly, middle photograph near frontal), beard style chosen by an explicit "July 1863 inferred" label, frock coat of his rank from DRESS61 (field officer double-breasted, 7 buttons per row), black hat from R24MI, sash and sword from REVREG61, a mare of unrecorded colour with a label.

### 2.5 How a likeness is built (method and quality bar)

1. **Tier A (two or more usable photographs, about a quarter of the photographed men, generals first):** photogrammetric-style fit: place the head mesh in each photograph with a camera solve (lens estimated from the carte de visite portrait convention), sculpt to match silhouettes and landmark ratios, project the photographs as base texture (de-lit and de-aged/aged to the date), hand-paint what no photograph shows, hair and beard as cards or strands. 2 artist-days.
2. **Tier B (one photograph):** single-photo reconstruction: same fit with a statistical head model (a CC0/own morph set from the MakeHuman macro targets, since SMPL/FLAME are non-commercial) constrained by landmarks; unseen side filled by symmetry and the model prior. 1 artist-day. Label on the page: "face inferred from one photograph".
3. **Tier C (no photograph found):** a face from the variation library by documented age, rank, state; label "no likeness known; face generated". 0.35 artist-day.
4. **Every likeness carries** its source file URL, licence, date, which angle was used, and an "inferred" flag per feature (beard, hair, eye colour from records where documented).
5. **Quality bar (acceptance test):** (a) overlay of the model rendered from the photograph's camera on the photograph, landmark error under 3 percent of face height; (b) licence recorded; (c) July 1863 appearance reasoned in writing (beard, hair length, insignia of that date: Dawes example above); (d) reviewed against the next-best photograph not used in the fit. Rights: Wikimedia/LOC public domain items are free to use; library or museum photographs with reserved rights (the 6th Michigan Cavalry colonel's, above) need a licence or are used for reference only, never as a texture.

---------------------------------------------------------------------

## 3. Asset sources

### 3.1 What I found and tested

| Asset | What it is | Licence (checked) | Quality for this project |
|---|---|---|---|
| **MakeHuman base mesh + macro targets + 163-bone skeleton + skin weights** (github.com/makehumancommunity/makehuman) | realistic-proportion male/female body (13,380 body vertices, 26,756 triangles), age, muscle, weight, height, race macro modifiers, full fingers/toes/face bones | CC0 (LICENSE.ASSETS.md in the repo; output stated CC0 in LICENSE.md); the app is AGPL but is not used | **Used in the pilot.** Best open base: realistic proportions, a standard rig, variation through targets. No hair, clothing or skin textures in the repo (community assets separate). The animation `walk1.bvh` in the repo is for a different rig and tagged AGPL3, so not used |
| **CMU Graphics Lab Mocap Database** (mocap.cs.cmu.edu) | 2,605 trials, 6 categories, 23 subcategories; 12 Vicon MX-40 cameras at 120 Hz, 41 markers | site: "free for all uses"; "may include this data in commercially-sold products, but you may not resell this data directly, even in converted form"; FAQ: "may be copied, modified, or redistributed without permission"; acknowledgement text requested | **Used in the pilot** (subject 35, trial 01). Good locomotion; no musket drill, no artillery service, no cavalry. The two site pages differ slightly on resale: keep acknowledgements and do not resell the raw data |
| **Quaternius Animated Human** (OpenGameArt) | 1,578-triangle stylised human, 9 animation clips (Idle, Walk, Run, Jump, Death...) | CC0 (License.txt in the zip) | Evaluated, rejected: too stylised for a gate that demands fidelity; render in `pilot/renders/eval_quaternius_animated_human_cc0_1578tris.png` |
| Quaternius Universal Base Characters / Universal Animation Library | ~13k-triangle humanoids with a retargetable humanoid rig; 120+ animations; Standard tier free, Source tier from USD 19.99 | CC0 (pack pages) | Not downloaded (itch.io name-your-price flow needs an interactive purchase step). Good fallback LOD2 bodies |
| Quaternius LowPoly RPG Characters (OpenGameArt) | six fantasy characters, FBX/OBJ/Blend | CC0 (zip License.txt) | Downloaded and inspected for licence only; stylised, rejected |
| **Sketchfab (public API)** | 106 unique downloadable CC-BY/CC0 models from 24 Civil War queries (`data/sketchfab-civil-war-scan.csv`): static scans only; none of the Civil War items is rigged or animated | 104 CC-BY, 2 CC0 | Union soldier by Andy Woodhead (110,841 faces, CC-BY), Springfield 1855 (49,166 faces), Springfield M1861 (1,936 faces), Enfield P1853 (8,260 / 57,148 faces), Napoleon 12-pdr (316,618), two "Civil War Cannon" (317,483 and 858,489). Useful as **reference** and for static props; each needs attribution, retopology and rigging. Downloading needs a Sketchfab login: not done (I do not create accounts) |
| Mixamo | free auto-rigging and a large animation library; account required | secondary summaries only (the Adobe FAQ returned 403 to automated fetch): no redistribution of the raw character/animation files, ML training excluded | **Not usable as shipped assets** for a web page that serves glTF files; useful only as private prototyping reference |
| Marketplace characters (CGTrader, TurboSquid, Fab, Reallusion ActorCore) | rigged Civil War officers and soldiers exist (search results: a rigged American Civil War officer and a rigged Union Major General about USD 40 on CGTrader) | CGTrader and TurboSquid royalty-free terms (secondary summaries; the TurboSquid and Fab pages returned 403) restrict redistribution of models in an extractable/open format | **Web redistribution risk (Contested):** a three.js page ships glTF anyone can save; these licences are written for compiled games. Needs written permission from each vendor or a bespoke contract before any purchased model reaches the public site |
| Rokoko, Marvelous Designer, RealityScan | tools | Rokoko Smartsuit Pro II + Coil Pro bundle USD 6,745 (US store); Marvelous Designer USD 39/month personal or USD 280 per year; RealityScan (ex-RealityCapture) free under USD 1 million revenue, USD 1,250/seat/year above | Cost anchors for section 5; prices from web search, to be re-quoted |

Observed on this machine (folder listing only, nothing run): Maxon Cinema 4D 2025 and 2026, Autodesk, Rhino 8 and SketchUp are installed; Blender is not. Cinema 4D can host cloth simulation and offline hero renders if the owner holds the licences.

### 3.2 Mocap

CMU covers locomotion only. The theatre needs, and must capture or buy: Hardee loading in nine times (load, aim, fire, reload) and bayonet drills; skirmishing and kneeling; marching variations (route step, quick time, double-quick, trail arms); falling, wounding and death variants; carrying the wounded; officers' gestures; flag-bearing; artillery service of the piece (crew of nine roles for each gun type); cavalry riding gaits and sabre cuts; horse locomotion. Route: 12 capture days with trained reenactors on a mid-tier optical stage (USD 1,500-3,000/day, 2026 guide), plus purchased libraries for the generic part, plus cleanup; priced in section 5.

### 3.3 Production route to Hollywood grade

1. **Photogrammetry of reenactor kit**: shoot period-correct reproduction clothing and equipment in RealityScan (free under USD 1 million revenue) for geometry, albedo and normal detail of cloth weaves, leather, brass, wood; use museum-owned artifacts where the museum allows (NPS, Smithsonian). Textures become the dress system's swatch library.
2. **Hero faces**: Tier A/B sculpts (2.5), commissioned from a character artist (market: about USD 2,000+ for a photoreal head and costume, per web anchors; USD 400/day US/EU freelance).
3. **Cloth simulation**: coats, sashes, flags and horse blankets simulated (Marvelous Designer or Cinema 4D), baked into wrinkle/normal maps and a small set of blendshapes per garment so the browser plays them back.
4. **Mocap retargeting** (proved in the pilot) with contact-aware IK and finger poses onto weapons.
5. **Level of detail**: LOD0 hero (50-100k triangles, 4K PBR), LOD1-LOD3 by decimation (counts in 4.5), far field by animated impostors.
6. **Literal "Hollywood grade for 160,000 men in a browser, all at once" is not possible**: it is a close-range gate (every soldier film-grade when the visitor flies to him; the nearest few hundred at full LOD0) plus a mass LOD for the rest. Total present: Union 93,500-104,256 and Confederate 65,000-75,000 (Wikipedia infobox, Official Records cited): the single figure to render is itself **Contested**; the repo OOB gives 93,921 (Union) and 75,000 (Confederate).

---------------------------------------------------------------------

## 4. Pilot: one correct 20th Maine private, July 1863

Code: `pilot/` (Python; MakeHuman, CMU and scipy only). Renders: `pilot/renders/`. Measurements: `pilot_measurements.json`, `pilot_lod_ladder.json`, `pilot_bench_static_instanced.json`. Re-run: `python pilot/build_soldier.py --out soldier.glb`, then `python pilot/measure.py`; the three.js viewer is in `pilot/viewer/` (needs `npm i three@0.160.1` and Playwright; Chrome was used).

### 4.1 What was built

- Body: MakeHuman young male macro, uniform-scaled to **1.740 m** (Gould: Maine soldiers aged 24+, mean stature **68.537 in** from 22,825 men, Table IX, Measured). Mesh volume about 62.5 litres, about 63 kg at tissue density 1.0, against Gould's mean for New England white soldiers of **142.71 lb = 64.7 kg** (n = 939, Table II, Measured): within 3 percent (Computed).
- Skeleton: the 163-bone MakeHuman default rig, rest joints re-derived from the morphed body.
- Kit: 42 mesh parts, 49,170 triangles, 2.2 MB glTF: sack coat (offset shell of the body plus a polar-loft skirt), shirt, collar, buttons, sky-blue trousers, brogans (rounded hull) with soles, M1858-type drooping forage cap with visor and badge, hair, moustache, belt and plate, cartridge box with flap and plate, cap pouch, bayonet scabbard, canteen with strap, haversack with strap, blanket roll, **Enfield P1853** (barrel, stock, three bands, nose cap, lock, hammer, trigger guard, butt plate, ramrod).
- Dress-variation system (`garments.Spec`, `sample_spec(seed)`): skin tone, hair colour, beard style, cloth fade, dirt, mismatched-cloth patches (knee, seat, elbow), hat type and droop, coat length, missing buttons, canteen cover colour, rifle model, pack items, stature, weight, muscle, age. Six random men are in `renders/variation_lineup_seeds_1-6.jpg`.
- Animation: CMU subject 35 trial 01, a full stride found automatically in the take (frames 112-246 of 358 at 120 Hz), retargeted by direction-matching limb segments, fractional spine/neck distribution, two-bone leg IK with the mocap knee as pole vector, flat-foot ankle lock in the ground frame, right arm posed to "right shoulder shift" relative to the spine, loop crossfade. Output 34 frames at 30 fps, `renders/walk_cycle_quick_time.gif` and `renders/walk_strip_8frames.jpg`.

### 4.2 Source for each item

| Item | Value in the pilot | Source | Label |
|---|---|---|---|
| Stature | 1.740 m | GOULD Table IX | Measured |
| Body mass | about 63 kg | GOULD Table II; mesh volume | Measured / Computed |
| Rifle | Enfield P1853, 55 in overall, 39 in barrel, .577 | GERRISH: "Our regiment was equipped and armed with Enfield rifles", forty rounds issued (Sept 1862); CHAMBERLAIN's report to the brigade as printed in NORTON: on 2 July the regiment secured "better muskets than the Enfields, which we found did not stand service well"; dimensions from WP/museum | Documented (use); dimensions Documented (secondary) |
| Rifle swap | Chamberlain told men still carrying Enfields to exchange them for the Springfields lying about after the fight | a web-search summary of NCpedia (secondary, page not read); Chamberlain's own report above says only that better muskets were taken | Contested |
| Ammunition | cartridge box, 40 rounds capacity | ORDN61 p. 227 | Documented |
| Coat | dark blue sack coat, four buttons, falling collar, half way down the thigh | DRESS61 art. 15 | Documented (regulation); 20th Maine actual: Unknown |
| Trousers | sky-blue mixture, loose over the boot | REVREG61 art. 1411 | Documented |
| Cap | M1858-type drooping forage cap | regulation exists (REVREG61 art. 1416) but its dimensions cannot be modelled directly; 20th Maine headgear Unknown | Modelled |
| Belt, plate, boxes, scabbard | dimensions from the Ordnance Manual | ORDN61 pp. 227-230 | Documented |
| Canteen, haversack | M1858 style, 7.75 in; brown wool cover; black tarred haversack | DRESS61 arts. 131-132; dealer sizes | Modelled |
| Blanket roll vs knapsack | roll on the left shoulder, tied right hip | DRESS61 art. 125, 130; carriage on 2 July Unknown | Contested |
| Pace | quick time: 107.5 steps/min, 0.729 m/step, 1.306 m/s | TACT63 §21: 110 steps/min of 28 in = 1.304 m/s (Computed); the clip is the nearest recorded stride, 2.3 percent slow | Measured (clip) vs Documented |
| Carry | right shoulder shift, barrel to the rear | TACT63 §353 (marching at double-quick: right shoulder shift or trail) | Documented (posture); hold on route march Modelled |
| Face, hair, moustache | generic | none | Unknown |
| Powder-blackened hands/face | not modelled | GERRISH ("hands and faces grew grim and black with burning powder") | Documented, to add |

### 4.3 Measured results (`pilot/measure.py`, `pilot_measurements.json`)

- Stride cycle: 1.117 s (34 frames at 30 fps), speed 1.306 m/s, step length 0.729 m, loop seam rotation delta 0.204 degrees against 0.234 degrees typical frame-to-frame: seamless.
- Soles on the ground: mean stance sole height -0.13 cm (range -1.90 to +0.09 cm): the left/right feet plant, with up to **1.9 cm penetration at heel strike**.
- Foot skate (ankle ground-frame speed on flat-foot frames, 8 left + 9 right): mean **16.9 cm/s (13 percent of walking speed)**, 90th percentile 31 cm/s. The ankle is locked during the flat phase; the residual is the foot roll.
- Mesh: 25,824 vertices, 49,170 triangles, 42 parts, 4-bone skinning; glTF 2.2 MB.

### 4.4 LOD ladder (crude vertex clustering, counts only, `pilot_lod_ladder.json`)

Full 49,170 triangles; clustered at 0.6 cm 36,905; 1.0 cm 30,297; 1.6 cm 23,265; 2.5 cm 14,864; 4.0 cm 7,314; 6.5 cm 2,847. (Quality of such LODs is not claimed; a real LOD pass is in section 5.)

### 4.5 Real-time budget, measured

`pilot/viewer/bench.mjs` (Chrome, WebGL2 via ANGLE/D3D11, GPU reported as Intel Arc Pro 140T, 1280x720, PBR material, vertex-colour, static instanced, readPixels sync): 1 soldier 1.71 ms; 16 soldiers 5.31 ms; 64 soldiers 10.28 ms; 256 soldiers 16.78 ms (12.6 M triangles); **512 soldiers 21.91 ms (25.2 M triangles, about 1.15 G triangles/s)**. This is an integrated laptop GPU, static meshes (no skinning), so the real budget with GPU-skinned or vertex-animation-texture characters is lower. Illustrative frame at 60 fps on this class of GPU (a Modelled example, not a measurement): 30 men at LOD0 (49k) = 1.5 M, 120 at 14.9k = 1.8 M, 400 at 7.3k = 2.9 M, 1,500 at 2.8k = 4.2 M, 40,000 impostors at 2 triangles = 0.1 M, total about 10.5 M triangles.

### 4.6 What I saw, and an honest verdict

Looking at the renders (hero views, head, kit, feet, walk strip, variation lineup):

- **Reads as a Union infantryman at a glance:** the silhouette, cap, sack coat, sky-blue trousers, belt and boxes, canteen, rifle on the shoulder, and a walking gait with correct cadence. The six varied men are visibly different men.
- **Quality level: early game-prototype, not film grade.** I would rate it 3 of 10 against a studio digital double and about 5 of 10 against a mid-budget game soldier.
- Defects that are visible, not hidden: flat vertex-colour shading with procedural noise and no weave, wrinkle or seam detail; the sack coat is a smooth shell (pectoral shape leaks through, shoulder seams absent) with a skirt that fans and shows gaps at the hip; brogans are faceted wedges; face is a bare mesh with a blocky moustache, no eyebrows, no skin detail; hair is a jagged shell; hands do not grip the rifle (it floats at the palm); the blanket roll is a tube, not a rolled blanket; no secondary motion (belt, canteen, cartridge box are rigid); heel-strike penetrates the ground by up to 1.9 cm; no cloth, no hair simulation.
- **What it proves:** open CC0 body and mocap data retarget cleanly onto a production rig in a few hundred lines; the dress system generates visibly different men from a seed; unit-level facts (Enfield, stature, pace) can be tied to a source per item; the browser budget is known.

What each defect needs to reach film grade: (1) face: Tier A/B sculpt with scan-quality albedo/normal and eyes/hair rig; (2) cloth: Marvelous Designer garments with weave textures, sewn seams, buttons with holes, baked wrinkles; (3) hands: finger poses and hand IK onto the weapon; (4) secondary motion: verlet/spring chains for belts, canteen, cap-box, scabbard, sash; (5) contact: full foot-lock with toe bending and ground normal; (6) skin/cloth shading: subsurface, sheen, wetness; (7) real LODs and impostors; (8) lighting and atmosphere (smoke, dust, shadows). These feed the estimate below.

---------------------------------------------------------------------

## 5. Effort and cost (estimate; inputs are assumptions, arithmetic is `cost_model.py` -> `cost_model_output.json`)

Day rates (USD per artist-day): low 250, mid 450, high 700 (anchors: web search 2026-10-19: US/EU freelance character artist about 400/day; overseas 140-200/day; senior 80-150/hour). Research day rate 200 / 300 / 450. One person-year = 220 days.

**Kit, animation and pipeline (independent of the commander count): 871 + 352 = 1,223 art-days**

| Block | Days |
|---|---|
| 12 Union unusual-dress sets (10 d each: garments, textures, research, verification) | 120 |
| 8 Confederate dress variants | 80 |
| Union default dress system (coat, hat, trouser, gear variants) | 40 |
| Confederate default dress system | 40 |
| 20 weapon models, wear variants | 60 |
| Artillery: 8 gun types + 4 limber/caisson/wagon | 68 |
| Horses and mules (4 base models, coats, harness) | 48 |
| Flags and standards (about 850 at 0.3 d) | 255 |
| Camp/field equipment | 30 |
| Dress-variation system hardening | 25 |
| LOD0-LOD3, impostors, texture arrays tooling | 60 |
| Cloth simulation set-up and per-asset tuning | 45 |
| Animation: capture days 12, cleanup/retarget 130 clips, foot-lock/IK/crowd 60, artillery sequences 40, cavalry/horse 50, falls/hits/carry 60 | 352 |

**Commanders (two scenarios for the population):**

| | 708 (repo seed) | 1,256 (Wikipedia OOB) |
|---|---|---|
| Likeness found, estimated | 388 (55%) | 587 (47%) |
| Art-days (A 2.0, B 1.0, C 0.35, costume 0.2, QA 0.1 per man) | 809 | 1,345 |
| Research-days (0.25 per man: stature, build, beard, horse, dress for the day) | 177 | 314 |

**Totals (including cash extras: mocap stage 12 days, performers and props, 30 kit-scan sessions, software, purchased assets/packs)**

| Scenario | 708 commanders | 1,256 commanders |
|---|---|---|
| Low (USD 250/day) | USD 585,000 | USD 746,000 |
| **Mid (USD 450/day)** | **USD 1,037,000** | **USD 1,320,000** |
| High (USD 700/day) | USD 1,616,000 | USD 2,053,000 |
| Person-days / person-years | 2,209 / 10.0 | 2,882 / 13.1 |

A team of six artists plus two researchers delivers the 708 case in about 18 months and the 1,256 case in about 23 months (Computed: art-days only, 2,032 and 2,568, divided by 6 artists at 18.3 working days per month). **The owner's "can get assets" reduces cash only where the asset's licence allows web redistribution (3.1): purchased packs help as references and for generic bodies; the period-specific kit and every commander still have to be built.** Not included: the engine, rosters (160,000 names), terrain, audio, and project management.

Cost-driving unknowns, to be closed first: (1) the true commander list (rosters agent); (2) how many units have photographs or artifacts for their dress (the sweep); (3) vendor permission for web distribution of any purchased model; (4) the browser performance of skinned LODs (a second benchmark with GPU skinning).

---------------------------------------------------------------------

## 6. Gates and next actions

1. Replace the commander seed with a verified list; re-run `commander_pipeline.py` (the likeness table rebuilds in minutes).
2. Run the likeness sweep: LOC photographs (through the website, within its rate limit), USAHEC MOLLUS, state archives, the "at Gettysburg" volumes' plates (Internet Archive image lists), Find a Grave link-outs only. Gate: every army, corps, division and brigade commander has a recorded decision (photograph used, or "no likeness known" with the search path).
3. Run the dress sweep: per-regiment histories and artifact catalogues. Gate: every unit row in `kit-by-regiment.csv` has a source-read note or a labelled default; the 19 findings become the first checked rows.
4. Build the kit in the order: Union default, Iron Brigade, the Zouave group, Confederate default, cavalry, artillery with crews, flags.
5. Second pilot: add a skinned LOD benchmark, contact-aware IK, hand IK onto the rifle, one Tier A commander (Dawes), and one cloth-simulated coat. That is the film-grade test.

## Files in this folder

- `PLAN.md` this document.
- `data/` seed and likeness tables (`commanders-seed.csv`, `commanders-likeness.csv`, `commanders-likeness-summary.json`, `commanders-wikipedia-oob.csv`, `commanders-army-corps-division-table.md`), `kit-by-regiment.csv`, `kit-source-key.json`, `kit-wikipedia-excerpts.json`, `weapons-wikipedia-excerpts.json`, `sketchfab-civil-war-scan.csv`, scripts (`extract_commanders.py`, `build_kit_by_regiment.py`, `tools/`).
- `pilot/` code and `pilot/README.md` (how to re-run), `pilot/renders/` stills, GIF, glTF, `pilot/viewer/` rendering and benchmark harness.
- `commanders/dawes_three_photographs.jpg` (Library of Congress and Commons public-domain images).
- `cost_model.py`, `cost_model_output.json`, `pilot_measurements.json`, `pilot_lod_ladder.json`, `pilot_bench_static_instanced.json`.

## Constraints and reports

- Wikipedia-derived text in the data files (excerpts, facts, titles) is CC BY-SA 4.0; each row carries its page URL for attribution. Commons images are used only by reference (file names and licences); the three Dawes thumbnails are Library of Congress/Commons public-domain files.
- NPS Soldiers and Sailors database: the NPS page I fetched states the database "is no longer maintained and updated" and carries no reuse terms on that page; permission would have to be requested in writing through the NPS contact links on the page. I did not scrape it.
- Blocked or refused and not circumvented: Adobe Mixamo FAQ, TurboSquid and Fab licence pages (HTTP 403), LOC API (HTTP 429), web.archive.org (tool refusal), ehistory/HathiTrust/Perseus/civilwartalk (not touched). Secondary summaries are labelled as such.
- Downloads made (all open, all kept in `tmp/bt/assets/`, not in the repo): MakeHuman repository (165 MB, CC0 assets), CMU subject 35 skeleton and one trial, Quaternius Animated Human and RPG Characters zips (CC0, 5 MB and 13 MB), three.js 0.160.1 from npm, Internet Archive public-domain texts.
