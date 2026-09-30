# ux-flows — UX Research, Journeys and Information Architecture Plan (NO-BUILD)

Specialist: `ux-flows` (multi-agent NO-BUILD plan for gettysburginteractivemap.com). Written 2026-09-30.
Scope: personas; top journeys on desktop and mobile; Nielsen-heuristic and cognitive-walkthrough evaluation of the deployed flows; a redesigned information architecture (primary navigation, unified search / command palette, permalink and sharing model, onboarding, progressive disclosure, empty states, resume, classroom mode, on-site mode); wireframes; a task-success metrics plan; a moderated-testing script for five users; and fix specs (findings `ux-flows-01` ... `ux-flows-28`).

Everything here is read-only analysis of the deployed tree, the deployed bundle (`bundle.pretty.js`, line numbers refer to that file), the live Lighthouse JSON, the Netlify PDFs and the sibling specialists' reports. Nothing in DEPLOY_DIR, SRC_DIR or RECON_SRC was touched. No browser tools were used (shared pane rule) and **no real users were observed**: every "friction" below is a prediction from code, data and analytics, tagged with an evidence grade.

Evidence grades used throughout: **[V]** verified by reading the exact code path or file; **[C]** computed by a script over the deployed data (scripts in `plan-work/tmp-ux-flows/`); **[I]** inferred from code plus standard browser/React behaviour (a 2-minute test settles it); **[E]** estimate or assumption that the test plan in section 10 must confirm. Nielsen severity scale: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe (blocks the task or destroys trust).

Cross-references to sibling reports use their finding ids, for example `app-bugs-05` (deep links), `app-design-14` (splash/onboarding), `app-a11y-03` (entry flow accessibility), `pagesB-01` (dead map links on sub-pages), `bundle-anatomy-13` (splash). I do not restate their implementation detail; I state the UX requirement they must satisfy and add what they did not cover.

---

## 0. Executive summary

**Verdict.** The site is two products stitched together. A single-page map app (13 desktop toolbar buttons, 14 mobile tool tiles, 8 timeline markers) and 20 static "Extra Features" pages (5-group menu) that share only a header, a footer and a data folder. The user has to know that, and has to know which of six different regiment pickers, three different searches and six different "moments" lists to use. Meanwhile the front door is three blocking screens (fake fast-forward splash, "Choose Your Experience", onboarding modal) that ask a phone or a laptop to decide something the browser already knows. The result: a first-time visitor needs at least three clicks and roughly 14 s (9.1 s mobile-lab time-to-interactive plus about 4.9 s of forced splash, [C]/[E]) before touching the map; a keyboard-only visitor cannot get in at all; a recipient of a shared link lands on July 1, tick 1, with none of the shared state.

**The ten discoveries that shape this plan** (new or sharpened by this pass; sibling-known items are marked "known").

1. **Sharing is broken end to end, on both layouts** (known root cause `app-bugs-05`; UX consequence new). The app writes `?t=&u=&z=&ll=` (`bundle.pretty.js:97821-97829`), the sub-pages write `?tick=&vignette=`, `?unit=`, `?lat=&lng=` (`search.html:114,127,139`) and nothing reads any of them. Add: mobile has no working Bookmarks tile at all (`app-bugs-12`), no `navigator.share` exists anywhere in the app region (grep: zero matches for `navigator.share`), and the desktop fallback is `window.prompt("Copy link:")` (`pretty:97932`). Task "share a moment with a friend" succeeds 0 % of the time today.
2. **"Jump to Pickett's Charge" resolves to different moments depending on where you start** [C]. The scrubber marker and the onboarding tour say tick 538; the vignette "Armistead at The Angle" is tick 551; Turning Points says tick 560, which the chronology labels "EAST CAVALRY FIELD"; the Turning Points "Cannonade" is tick 540 (Union artillery replying) while the cannonade begins at 518; "Longstreet's Delayed Attack" points at tick 240 (Berdan's reconnaissance; the assault begins at 256); "Chamberlain's Bayonet Charge" points at 267 (Vincent arrives; the charge is 275). **6 of the 9 Turning Points anchors do not land on the moment they name** (table in Appendix A). Once deep links start working these become visible errors, so one `moments.json` with stable ids must precede the link fix.
3. **There are at least six independent "moment" lists and they disagree** [V/C]: 8 scrubber markers (`pretty:112192-112200`), 5 onboarding tour steps (`pretty:111819`), 24 vignettes, 137 chronology events, 9 Turning Points, 16 walkthrough stops (`pretty:104096`), plus Documentary (24), Students (24 by day), bookmarks, Watch Together stops. A single Moment entity plus playlists is the structural fix (finding 05).
4. **Day 1 afternoon is silent** [C]. No chronology event and no vignette exists for ticks 101-225 (125 ticks, 56 % of Day 1); the gap between vignette triggers 57 and 240 is 183 ticks. At the current "1x" (2 ticks/s, `app-bugs-33`) that is about 63 s of narration-free playback exactly where the Union line collapses and retreats through town, the most pivotal part of Day 1. Also long gaps between vignette triggers: 326 to 460 (134 ticks) and 568 to 675 (107).
5. **The map's own toolbar cannot reach the marquee content on mobile.** The mobile layout has no key-moment markers (the `TO` markers are only rendered in the desktop `IO`, `pretty:112270-112293`), no Bookmarks/Help (dead tiles), no Walkthrough, no Distance tool, and no path to Extra Features except a floating pin that hops corners (`index.html:535-542`). The single richest route to Pickett's Charge on a phone is the July 3 tab plus a blind touch-drag.
6. **Ask the Historian's chronology answers all render the literal word "undefined"** [C] (new; sibling reports did not list it). `historian.html:119-125` reads `e.title` / `e.description` but the data has `event` (`data/chronology_day1.json`: keys `tick,time,event,units_involved,location,significance`). Simulation over all 137 events: 137 of 137 rendered answers end in `: undefined` (e.g. "Day 3, 11:45am — South of The Angle: undefined"). Fix is one line; effect on trust is large (finding 19).
7. **Keyboard-only and screen-reader users are stopped at the first gate** (known `app-a11y` 2.1: layout cards and "Skip intro" are click-only `div`s, `pretty:102767,102789,101581`). From a UX viewpoint this also means the "Choose Your Experience" gate has no legitimate reason to exist: the browser can resolve layout (`pointer`, `width`) without asking, so removing the gate fixes the accessibility blocker, the returning-visitor tax and the mobile mis-selection at once.
8. **On-site use is unsupported in three independent ways** [V]: the map has no geolocation at all (grep: zero `geolocation` matches in the app region), the service worker never caches the HTML shell and never touches cross-origin map tiles (`sw.js:38,72-75`), and the AR page uses only the 30 `terrain.json` places although the bundle already holds 16 tour stops with GPS/Street View and 512 monuments with lat/lon (`pretty:104096`, `pretty:104440`). Installed-PWA orientation is locked to landscape (`manifest.json:9`) while AR is held in portrait.
9. **Classroom use has no teacher surface** [V/C]: no lesson, present, print or class-link feature; the "For Students" page shows `panel_summary` text whose median Flesch-Kincaid grade is 10.9 by my heuristic (21 of 24 above grade 8, [C], heuristic syllable counter, treat as indicative), uses a separate blue palette (`education.html:20`), and every "See it on the map" button is a dead link (`education.html:81`).
10. **Navigation labels collide and overpromise** [V]: the menu button is called "Explore" and its first group is also "Explore" (`site-nav.js:14` and `:169`); "Documentary Mode" is a text reader; "Camera Modes", "Immersive Mode", "Living Ledger", "The Ground Remembers" and "What They Could See" do not say what they do; "NPS Auto Tour" on the map is not the NPS tour (`app-bugs-27`) and nothing on the site says it is not affiliated with the National Park Service (grep: zero matches for affiliat/unofficial in the HTML).

**What I recommend deciding first (owner decisions that unblock everything else).**

| # | Decision | Recommended answer | Why it is first |
|---|---|---|---|
| D1 | Remove the entry gates (chooser + onboarding modal + fake fast-forward) | Yes; replace with auto layout and a 20-second opt-out guided moment | Unblocks keyboard/SR access, returning-visitor tax, first-visit conversion |
| D2 | One canonical URL state contract (section 5.6) | Adopt as written, including `dv` data-version stamp | Every share, resume, classroom and on-site feature is built on it |
| D3 | One `moments.json` with stable ids + playlists | Yes; retire the six hand-kept lists | Prevents wrong-moment deep links, powers chapters, Documentary, classroom |
| D4 | Top-level IA: Battle / Stories / Find / Ask / Visit + More | Adopt after a 1-week card-sort/tree-test (section 10.1) | All naming, header and sitemap work depends on it |
| D5 | Are Classroom and On-site "modes" (context switches) rather than pages? | Yes (`?mode=classroom|present|onsite`) | Keeps the default UI simple while serving two very different contexts |
| D6 | Analytics approach that stays inside the "no third-party analytics" privacy promise | First-party, cookieless, aggregate, opt-in free text (section 9.4) | Without measurement none of the targets can be verified |

**Where this plan moves the grades** (targets, not promises): Usability/learnability desktop B- to A, mobile D+ to A-; Core function mobile D to B+ (with `app-bugs-11/12`); Fit and finish C+/D+ to A-; Accessibility entry path D to B+ (with `app-a11y`); SEO/growth indirectly (moment permalinks, shareability); Performance indirectly (no splash sweep, lite mode). Expected time-to-first-interaction (no gates): from about 14 s to at most LCP + 1 click (target <= 3.5 s p75 on Fast 4G once `bundle-anatomy` lands).

---

## 1. Method, evidence and limits

**Read in full or in the relevant parts:** `BRIEF.md`; `gettysburg-site-audit.md`; `index.html` (all 760 lines, six inline scripts); `site-nav.js`, `site-nav.css`; `sw.js`; `manifest.json`; `netlify.toml`; `historian.html`, `search.html`, `find-ancestor.html`, `education.html`, `documentary.html`, `ar.html`, `embed.html`, `turning-points.html` (points table), `watch-together.html` (tour format, sync code) in full or by extract; a structure extract of all 24 other pages (`tmp-ux-flows/pages-outline.txt`); the deployed bundle app region: app shell and toolbar (`pretty:112940-113300`), keyboard handler (`112966-113052`), splash `tO` (`101471-101600`), layout chooser `dO` (`102752-102830`), onboarding archetypes and tour `xO`/`Gc` (`111799-111870`), transport `IO` (`112200-112375`), mobile tools sheet tiles (`103380-103500`), unit panel `MF` (`97897-98110`), share helpers `$k/TF/kO/RO/IF` (`97815-97870`), Help and Bookmark chunks (strings), search panel `FF` (`98700-98952`), Follow-Ancestor `Zk`, walkthrough stops `d2` (`104096`) and monuments `_A` (`104440`), 24 vignettes, 137 chronology events, 30 terrain locations, 467 regiments; Lighthouse mobile/desktop JSON; the Netlify Web Analytics and RUM PDFs (`tmp-ux-flows/netlify-pdfs.txt`); and the sibling reports `app-bugs.md`, `app-design.md`, `app-a11y.md`, `pages-B.md`, `bundle-anatomy.md` (headings plus the sections cited).

**Scripts written (all in `plan-work/tmp-ux-flows/`):** `fk.py` (Flesch-Kincaid heuristic and data-coverage counts), `moments_xref.py` (moment-list vs chronology cross-reference, Appendix A), `hist_undefined.js` (historian chronology rendering simulation), plus the outline extractor output.

**Limits (state plainly).**
- No observed users, no session recordings, no click-tracking exists on the site (privacy page: only Netlify RUM). Every completion-rate and time-on-task value in sections 3-4 is a **prediction** from the number of screens/clicks/keystrokes in the code. Section 10 defines how to replace them with measurements.
- Netlify analytics gives no device split, no entry-page split and no funnel. I could not measure the mobile/desktop mix. RUM is "All Devices" only. Persona weights are hypotheses.
- I did not run the app on a phone or with a screen reader; the walkthroughs of J8/J9 lean on `app-a11y` (verified by that specialist).
- The tick-to-clock mapping is known-wrong (C3/C4). I therefore express positions in **ticks** and never quote a wall-clock time as fact; proposed on-screen captions avoid clock text until the time specialist's single formatter exists.
- Flesch-Kincaid is computed with a naive syllable counter; proper nouns and long sentences inflate it. Use it only to rank, not to certify a reading level.
- One unrelated personal PDF in `C:/Users/mlege/Videos` was opened by accident while I was extracting the two Netlify PDFs (my loop read every PDF in the folder). I discarded its contents, did not record or use any of it, and re-ran the extraction with the two exact Netlify filenames only. The report contains nothing from it.

**Audit ids** (C1-C8, H1-H13, D1-D4, S1-S4, P1-P7, T1-T3, E1-E5, X1-X5, G1, A1-A6, N1) are used exactly as in `BRIEF.md`.

---

## 2. Personas (hypotheses to validate; composites, not real people)

The site is free, ad-free, no login (`privacy.html`). Traffic (30 days, [V] `netlify-pdfs.txt`): 3,389 pageviews, 1,529 unique visitors; home = 1,713 views; **Direct 2,034 of 2,221 referrals (92 %)**; Google 63, Bing 59, DuckDuckGo 38, ChatGPT 14, Yahoo 13; US 61 %; the next most viewed pages are `/index.html` (86), `/dashboard` (78), `/historian` (68) + `/historian.html` (42), `/documentary` (68), `/camera` (65). Two things follow. Most visits come from people who already know the site (Direct), so the returning-visitor cost is the main tax; and **the Historian is the most-visited feature page in Netlify's top-15 list (110 combined pageviews)**, the strongest available signal that "ask a question" is a top intent (the list is truncated at 15 URLs, so a `.html` variant of another page could be missing). Note `/index.html` (86 views) is the second-most-viewed URL: it is what the ten sub-pages with `href="/index.html"` and every dead "See it on the map" link produce (Section 3, J3), i.e. most of those 86 views are probably forced full reloads of the map from in-site links **[I]** (Netlify's per-URL table has no referrer column, so this cannot be proven from the PDF).

### 2.1 Persona cards

| | **P1 Maya, 8th-grade student** | **P2 Mr. Alvarez, teacher** | **P3 Dana, genealogist / descendant** |
|---|---|---|---|
| Who | 13-14 y, Chromebook at school, phone at home; homework "explain why July 3 mattered" | 8th-grade social studies, projector plus 30 student Chromebooks, 45-minute period | 50-70 y, laptop or tablet, holding a pension index card: "Pvt., Co. G, 24th Michigan"; emotionally invested |
| Context | Short attention, needs a quotable answer, low tolerance for jargon, school Wi-Fi, may be filtered | Needs a link that puts 30 screens on the same moment; must not surprise the class; time-boxed | Patient, careful, reads everything, wants accuracy and caveats, wants something to print or send to family |
| Top jobs | (1) Get the gist of each day; (2) find a person/unit to write about; (3) copy or cite a fact | (1) Prepare a 10-minute segment; (2) project it legibly; (3) send students the same view; (4) print a handout | (1) Identify the regiment; (2) see where it was on each day; (3) casualties/context; (4) share or save; (5) visit the ground |
| Success looks like | Understands in < 3 min; can name 2 events and 1 person; can cite it | Segment prepared in < 10 min; all students on the same moment in < 60 s | Regiment found in < 2 min from "24th Michigan"; sees its path; leaves with a shareable card |
| Device mix (E) | Chromebook 60 %, phone 40 % | Laptop plus projector; students Chromebook | Desktop/tablet 70 %, phone 30 % |
| What breaks today | Splash+chooser+modal; "For Students" text at about grade 11; "See it on the map" dead; 9-11 px UI | No teacher surface; dead links; tiny type on a projector; every student repeats a 14 s gate | Finder searches by *commander surname*, not unit number; abbreviations fail; link back to map is dead; three ancestor tools |
| Primary IA home | Stories, Ask | Teach (More), Stories | Find, Visit |

| | **P4 Chris, battlefield tourist on site** | **P5 Frank, Civil War buff / power user** | **P6 Sam, casual visitor from search or an AI answer** |
|---|---|---|---|
| Who | Family on the auto-tour road, one phone, one hand, sun glare | 40-75 y, desktop 27", knows the OOB, cares about brigade-level accuracy and timing | Anyone; arrives with one question; 10-second patience; probably mobile |
| Context | Portrait phone, spotty signal (E, not measured), battery matters, outdoors, walking | Long sessions, keyboard and mouse, opinions; **most sensitive to C3/C4 clock and moment errors** | Referred by Google/Bing (122 of 2,221 referrals) or ChatGPT (14); lands on `/` or `/historian` |
| Top jobs | (1) What happened where I'm standing; (2) next stop; (3) see it as it was (AR/Street View); (4) works offline | (1) Compare moments; (2) inspect any unit/brigade; (3) precise time and place; (4) sources; (5) report an error | (1) Answer to one question; (2) see the battle move; (3) decide if the site is credible; (4) share it |
| Success looks like | Answer within 2 taps of opening the app; no permission dead ends | Reaches any unit or moment in <= 2 actions; trusts the clock | Sees something moving in < 5 s; gets a cited answer; shares a link |
| What breaks today | No GPS; AR only 30 places; not offline; landscape lock; gates on a phone | 8 px markers; no palette; clock mismatch; dead permalinks | 14 s to first interaction; gates; chooser asks about "Desktop or Mobile" |
| Primary IA home | Visit | Battle, Find | Battle (first), Ask |

**Cross-cutting contexts** (not personas; every journey must be tested in each):
- **C-AT1 Screen-reader user** (NVDA/JAWS/VoiceOver/TalkBack), C-AT2 keyboard-only, C-AT3 low vision (200-400 % zoom), C-AT4 switch/voice. Owner: `app-a11y`; UX requirement is that there is a complete text route (section 5.13).
- **C-NET Slow network / low-end device** (400-500 kbps effective, 4x CPU throttle): section 3 J10.
- **C-RET Returning visitor** (92 % of referrals are direct): every persona after visit 1.

### 2.2 Persona x feature need matrix (which of the current tools matter to whom, and how findable they are today)

Legend: **H** high need, **M** medium, **-** none. "Findable today" is how many clicks from a fresh page load to reach it after gates (desktop; [V] from code).

| Current tool | P1 | P2 | P3 | P4 | P5 | P6 | Findable today (desktop / mobile) |
|---|---|---|---|---|---|---|---|
| Play/scrub the map | H | H | M | M | H | H | 1 / 1 (mobile: off-screen row, C1) |
| Key moments list | H | H | M | H | M | H | scrubber 8 px dots / none on mobile |
| Ask the Historian | H | M | M | M | M | H | overlay pin (hops corners) / icon-only pin |
| Search (units) | M | M | H | M | H | M | `S` letter button, key `S` / Tools sheet |
| Find a regiment/ancestor | - | M | H | M | M | - | ⭐ button + page; 3 tools |
| Regimental biography | M | M | H | M | H | - | Extra Features menu only |
| Share this moment | H | H | H | M | M | H | `B` panel / **not on mobile** |
| Documentary / stories | H | H | M | M | M | H | Extra Features menu |
| Turning Points | M | H | - | - | H | M | Extra Features menu |
| For Students | H | H | - | - | - | M | Extra Features menu (5th group item) |
| Battlefield AR / Near me | - | - | M | H | - | - | Extra Features menu (mobile: icon pin) |
| Soldier's Eye / Street View | M | M | M | H | M | - | 🔭 button / Tools sheet tile |
| Compare Two Moments | - | M | - | - | H | - | Extra Features menu |
| Order of Battle | - | - | M | - | H | - | **absent on desktop** / Tools tile |
| Casualty Dashboard | M | M | M | - | H | - | Extra Features menu |
| Cinematic Export / Watch Together | - | M | - | - | M | - | Extra Features menu |
| Help / shortcuts | - | - | - | - | H | - | `?` glyph button |

Reading the matrix: the tools ranked highest across personas (play, moments, ask, share, find) are precisely the ones with the weakest findability or working state today. The tools with the strongest chrome (Legend, Minimap, Layers, Distance) are needed by the fewest personas.


### 2.3 Top journeys by persona, on desktop and on a phone (target flows; today's blocker in the last column)

Each row is the flow the redesign must make short. "D" desktop, "M" phone. Ids refer to section 3 (journeys) and section 4.2 (friction).

| Persona | Top journey | D: target flow | M: target flow | Today's blocker (friction) |
|---|---|---|---|---|
| **P1 Maya** | Understand Day 3 for homework, then cite it | Stories > Student edition > Day 3 card > "Watch it" > Cite this | Same route with the bottom tab bar; chapter chips on the map | gates (UXF-05); summaries at about grade 11 (UXF-48); "See it on the map" dead (UXF-24) |
| | Pick a unit or person to write about | `Ctrl+K` "20th maine" > Unit page > Cite | Search icon > sheet > Unit page | three searches, exact-ish names (UXF-10, 41) |
| **P2 Mr. Alvarez** | Prepare, project and distribute a lesson | More > For teachers > lesson > Present; copy class link or show QR | Preview the lesson and copy the link from the Teach hub (responsive) | no teacher surface (UXF-47); small type (UXF-38) |
| | Print a handout | Unit page or lesson > Print | n/a (rare on phone) | no print view (`app-design-29`) |
| **P3 Dana** | Find the regiment and follow it | Find > paste "Co. G, 24th Mich. Vol. Inf." > Unit page > Follow on map | same; Unit page day chips replace the trail on a small screen | finder keys on commander (UXF-39); map link dead (UXF-24) |
| | Save or share a family card | Share > image card or Print report | Share sheet (native) | no share on mobile (UXF-25) |
| **P4 Chris** | Learn what happened where I stand | Planning at home: Visit > Battlefield tour > stop > Street View | Visit > Near me > POI card > Watch it happen; Radar or AR | no GPS, no Near me (UXF-49); AR limited (UXF-50); not offline (UXF-51) |
| | Keep going with no signal | Save offline pack at home | Offline pack indicator and Near me on cached data | HTML never cached (UXF-51) |
| **P5 Frank** | Compare two moments or inspect a brigade | Battle > Views > Compare, or `Ctrl+K` `>compare`; Order of Battle tree | Read-mostly: palette, Unit card | OOB missing on desktop (UXF-14); dead permalinks (UXF-24) |
| | Verify or correct a fact | Story or Unit card > Sources > Report a problem | same | no sources, no report (UXF-57); clock wrong (UXF-58) |
| **P6 Sam** | See it move and ask one question | Landing > 20-second moment > Ask; cited answer | same; Ask is a bottom-tab destination | 14 s and three gates (UXF-05); "undefined" answers (UXF-43) |
| | Send it to a friend | Share > Copy link | Share > native sheet | write-only links (UXF-24) |


---

## 3. Journeys and cognitive walkthroughs (current state)

Method: for each journey the steps are taken from the deployed code, and each step is scored with the four cognitive-walkthrough questions (Wharton et al.): **Q1** will the user try to achieve the right effect; **Q2** will they notice the correct action is available; **Q3** will they associate that action with the effect they want; **Q4** after acting, will they see progress. `✓` pass, `✗` fail, `~` doubtful. Friction ids `UXF-nn` are defined in the register (section 4.2). "Predicted" numbers are **[E]** (from step counts and Lighthouse timings) until section 10's tests replace them.

### J1. First visit (P6 Sam, from a Google or AI answer; desktop, with mobile deltas)

| # | User action | System response | Evidence | Q1 Q2 Q3 Q4 | Friction |
|---|---|---|---|---|---|
| 1 | Opens `/` | Static HTML splash "Gettysburg / Watch the battle unfold in real time" paints from HTML with a 0.4 s fade-in (starts at opacity 0, delays FCP) | `index.html:742-748`, `:99` | ✓ ✓ ✓ ✓ | small (see `app-design` 8.1) |
| 2 | Waits | 2.28 MB JS; React mounts; app splash `tO` shows "Loading battle data..." until more than 5 ticks of placements exist, then waits 800 ms, then plays a 3.5 s "Fast-forwarding 3 days of battle..." that writes `currentTick` to the store every animation frame, then a 0.6 s fade | `pretty:101471-101590` (`eO = 3500`, 800 ms at `:101484`) | ✗ ~ ✓ ✓ | UXF-01 |
| 3 | (optional) Clicks "Skip intro ›" | 300 ms fade, then chooser | `pretty:101581` (`div onClick`, 11 px, `#444`, contrast 2.02:1 per `app-a11y`) | ✓ ✗ ✓ ✓ | UXF-02 |
| 4 | Reads "Choose Your Experience: Select the format that best fits your device"; sees an injected banner about "20 more tools ... an AI-style historian, live sound, AR" pointing at "Extra Features, top right" that is not visible yet | Two cards ("Desktop", "Mobile") plus note "You can switch at any time from the settings menu" (no such menu exists on desktop) | `pretty:102759-102815`, `index.html:377` | ✗ ~ ~ ✓ | UXF-03, 06 |
| 5 | Clicks "Select Desktop →" | Map renders; onboarding modal opens on top (first visit) | `pretty:113066-113068` | ✓ ✓ ✓ ✓ | UXF-05 |
| 6 | Chooses an archetype ("New to Gettysburg / History Buff / Power User") | "New" starts a 5-step tour and **moves the map to tick 1 behind the modal**; "Power User" shows a keyboard cheat-sheet | `pretty:111799-111830`, `:111857-111870` | ✗ ~ ✓ ~ | UXF-04 |
| 7 | Clicks "Skip introduction" or completes step 5 | Tick stays at the step's tick (267 or 538); legend, minimap, story panel, event card and toasts are all open | `pretty:111929`, `app-bugs-10` table | ✓ ✓ ✓ ✗ | UXF-07 |
| 8 | Clicks ▶ or presses Space | Animation runs at 2 ticks/s | `pretty:112324` (`title: "Play/Pause (Space)"`), `app-bugs-33` | ✓ ✓ ✓ ✓ | none |

**Totals.** 3 blocking screens (fake fast-forward, layout chooser, onboarding modal); 3 required clicks before the map is usable (Skip, Desktop, Skip introduction) plus Play = 4 actions; 0 of the 3 screens is needed for the goal "watch the battle". Predicted time to first Play: desktop Lighthouse TTI 2.2 s + 4.9 s forced splash + 10-40 s reading/deciding = **about 17-47 s**; mobile 9.1 s TTI + 4.9 s = **at least 14 s before the first choice is even visible** **[E]**. For a visitor who arrived with one question and 10 seconds of patience (P6), this is a bounce risk (no bounce data exists; instrument, section 9).

**Mobile deltas.** (a) The splash title clips ("ETTYSBURC") at 375 px (`app-bugs-11`, 52 px title, 8 px tracking); (b) the chooser does not detect a phone; the first card is "Desktop" and choosing it yields the overflowing layout (C1, C2); (c) "Power User: show me the keyboard shortcuts" is offered on a touch device (`pretty:111814`); (d) after "Mobile": no key-moment markers, off-screen transport row (C1), Tools sheet bottom covered (C2).

**Target path (J1-T).** Static poster paints with the HTML; the map takes over with **no blocking screen**; layout is resolved from `matchMedia`; after map idle a 20-second guided moment begins (skippable, pausable, reduced-motion aware); three choices at the end: "Keep exploring" / "Watch the whole battle (about 9 minutes)" / "Ask a question". Required clicks: 0. Targets: TTFI equals LCP; "played at least 10 s of animation" >= 60 % of first sessions **[E target]**; blocking overlays before interaction = 0 (`app-design` 8.3).

---

### J2. Returning visit (P5 Frank, desktop; also P3, P1)

| # | Action | Response | Evidence | Q1-Q4 | Friction |
|---|---|---|---|---|---|
| 1 | Opens `/` | HTML poster, then app splash again (skip button 11 px); no store of "seen intro" for the splash | `pretty:101471` | ✗ ✗ ✓ ✓ | UXF-01 |
| 2 | Layout chooser again | `Zn` lives only in `useState(null)`; only `gtbg_onboarded` is stored | `pretty:112949` (`[Zn, Dt] = useState(null)`), `:112951`, `app-bugs-11` | ✗ ✓ ✓ ✓ | UXF-03 |
| 3 | Extra Features overlay appears only after a click on an "exit" button or a 1.5 s DOM scan | An inline script scans `body *` for exit-button text (`index.html:497-511`) | `index.html:441-519` | n/a | UXF-11 |
| 4 | Looks for where he left off | Nothing: no resume, no recent moments; only bookmarks he made (`gettysburg_bookmarks`) | `app-bugs-29` Appendix D | ✗ | UXF-26 |

Predicted: **2 mandatory clicks and 5-15 s on every visit** (the audit measured about 15 s; "returning visitors get a ~15 s splash", H3). 92 % of referrals are Direct, so this tax is paid by the majority of visits. **Target (J2-T):** 0 clicks, map resumes at the last view when it is under 30 days old (banner "Continue where you left off: <moment name> — Resume / Start over"), layout persisted or auto, Extra Features (now "Features") always in the header.

---

### J3. Jump to Pickett's Charge (P6/P1; desktop and mobile)

Desktop routes available today (best case after clearing the gates):

| Route | Steps | Outcome today | Evidence | Q-fails |
|---|---|---|---|---|
| A. Scrubber marker | Notice an 8 px dot among 8 markers (`title` tooltip only), click | Tick set to 538. **July 3 data is not downloaded on a jump** (only when playback crosses ticks 200/420), so the map can show July 1/2 carry-over or nothing (`app-bugs-06`) | `pretty:112270-112293` (8 x 8 px `div`, `title: Ie.label`), `app-bugs-06` | Q2 ✗ (8 px, hover-only label), Q4 ✗ (wrong or empty map) |
| B. Day key or tab, then scrub | Press `3` (tick 451 = dawn) then drag the scrubber; assuming a slider about 1000 px wide at a 1440 px window, 675 ticks is 0.67 ticks per pixel and the target is 87 ticks (about 130 px) later **[E]** | Same data-load problem; no framing (`app-bugs-21`) | `pretty:112987-112998` (`case "1"` ... `case "3"`) | Q2 ~, Q4 ✗ |
| C. `S` search "Pickett" | Search panel searches **units** (name, state, commander, id), not moments | No moment result; dead end | `pretty:98822` placeholder "Name, state, commander, or unit ID..." | Q3 ✗ |
| D. Documentary Mode moment, "Watch this moment on the map" | `href=/index.html?tick=551&vignette=V-016`; the map reads neither | Lands on splash, July 1, tick 1 | `documentary.html:92`, `app-bugs-05` | Q4 ✗ (catastrophe) |
| E. Ask the Historian chip "Pickett's Charge" | 3 answer bubbles; "See this moment on the map" link | Same dead link; each vignette bubble also prints a raw "tick n" (`historian.html:109`) | `historian.html:110,147` | Q4 ✗ |
| F. Onboarding tour step 5 | First visit only; 4 "Next" clicks | Tick 538, but the user cannot re-enter the tour | `pretty:111849` (`tick: 538`) | Q2 ✗ on later visits |

Mobile routes: (M-a) July 3 tab (tick 451) then touch-drag the custom scrubber to tick 538: on an assumed 340 px scrubber one pixel is about 2 ticks, so landing on 538 is a blind guess within a few ticks, with **no markers on mobile** (`TO.map` is rendered only inside desktop `IO`, `pretty:112270`); (M-b) tour, first visit only; (M-c) Historian via a collapsed icon pin. No route offers a name to tap.

Moment-anchor divergence (Appendix A): "Pickett's Charge" is tick 538 (scrubber, tour), 551 (vignette "Armistead at The Angle"), and 560 (Turning Points, which the chronology labels "EAST CAVALRY FIELD").

**Predicted:** desktop 4-6 actions and 20-60 s for a first-timer, with a wrong-state risk on the best route; mobile: no reliable route. **[E]**

**Target (J3-T):** three equivalent, discoverable entry points, each <= 2 actions and <= 10 s: (1) command palette `Ctrl/⌘+K` then type "pickett" then Enter; (2) a visible "Moments" chapter row on the timeline (desktop and mobile) with named chapters, "Pickett's Charge" among them; (3) a permalink `/?v=V-016` (always framed on the action, day data loaded before the tick is applied). Success >= 95 % in test T2 (section 10).

---

### J4. Find an ancestor's regiment (P3 Dana; desktop, then phone)

Dana's input is what a pension index card gives her: a regiment number, state and arm ("24th Michigan Infantry, Co. G").

| # | Action | Response | Evidence | Q1-Q4 | Friction |
|---|---|---|---|---|---|
| 1 | Looks for an ancestor tool | Toolbar shows a ⭐ ("Follow Your Ancestor", desktop, `title` only) and, behind "Extra Features", a page "Find Your Ancestor" in group "Data & Records"; three tools: ⭐ panel, `find-ancestor.html`, `regiment.html` | `pretty:113182` (`title: "Follow Your Ancestor"`), `site-nav.js:36-39` | ✓ ~ ~ ✓ | UXF-40 |
| 2a | Page route: types a state or a **commander's surname** | Controls are "Commander surname (optional)" and a state `<select>`; nothing accepts a unit number or name; no input yields results until at least one filter is set | `find-ancestor.html:56-59,106` | ✗ (her mental model is the regiment, not its colonel) ✓ ✓ ✓ | UXF-39 |
| 2b | Picks "Michigan" | Up to 100 results sorted with `localeCompare` (lexicographic: "102nd..." before "10th..."), each showing raw parent ids ("U-I / U-I-1-1") and a "Full regimental biography" link | `find-ancestor.html:108,114,121-123` | ✗ ~ ✓ ✓ | UXF-39 |
| 3 | Opens the biography | `regiment.html?unit=U-24MI...` works (the one sub-page that reads a param) | `regiment.html:247` | ✓ ✓ ✓ ✓ | none |
| 4 | Clicks "See its sector on the map" | `href=/?unit=..&tick=..`; the map ignores both | `regiment.html:247`, `app-bugs-05` | ✓ ✓ ✓ ✗ | UXF-24 |
| 2c | Panel route: types "24th Mich." in the ⭐ panel | `includes` on lower-case id/name with a 15-row cap; "24th mich" matches, "24th Mich." (dot), "Co. G", "twentieth" do not; only units already loaded for played days appear (217 of 478 animated units are missing until a day is played) | `pretty:101039-101050` (`app-bugs-14`), `app-bugs-06` | ~ ✓ ✓ ✗ | UXF-40, 41 |
| 5 | Wants to keep or share | "Copy Shareable Link" writes `?ancestor=U-..`, which only works when the panel is already mounted | `pretty:101225`, `:101019` | ✗ | UXF-24 |
| 6 | Wants the soldier himself | Caveat paragraph (top of page) says individual soldiers are not in the dataset and points to NPS Soldiers and Sailors; there is no per-result next step | `find-ancestor.html:52` | ~ | UXF-42 |

**Predicted:** page route 4-6 actions and a likely wrong-tool first attempt; success rate for "regiment found" plausible ~70 % if she knows the state; success for "see it on the map" 0 % via the biography link. **Target (J4-T):** one **Find a regiment** flow (unit number + state + name, alias-tolerant, natural sort), result = canonical **Unit page** with day-by-day path and casualties, primary actions "Follow on map" (works), "Share", "Print one-page report"; a three-step explainer at the top ("1 Look up your ancestor at NPS Soldiers and Sailors → 2 Type his regiment here → 3 Watch it on the map") and a pasted-text field that accepts "Co. G, 24th Mich. Vol. Inf." Finding 09.

---

### J5. Share a moment (P1/P4/P5)

| # | Action | Response | Evidence | Q1-Q4 | Friction |
|---|---|---|---|---|---|
| 1 | Wants to send this moment to a friend | Desktop: a `B` letter button labelled only by `title="Bookmarks"`, or an unlabeled `⎘` glyph in the unit panel; mobile: Bookmarks/Help tiles are dead | `pretty:113221` (`title: "Bookmarks"`), `:97964-97970`, `app-bugs-12` | ✗ ✗ ~ - | UXF-25 |
| 2 | "Share Current View" | Writes `?t=538&z=..&ll=..` to the clipboard (the unit panel flashes a check mark for 2 s); if the clipboard is blocked it falls back to `window.prompt("Copy link:")` | `pretty:97821-97836`, `:97932` | ~ ✓ ✓ ~ | UXF-25 |
| 3 | Friend opens the link | Splash, chooser, onboarding (first visit), then **July 1, tick 1**: no reader for `t`, `u`, `z`, `ll` | `app-bugs-05` | ✗ ✗ ✗ ✗ | UXF-24 (catastrophe) |
| 4 | Friend sees a rich preview in chat | Every URL has the same `og:image` (`screenshots/day3.png`), title and description | `index.html:21`, `pagesB-09` | ✗ | UXF-27 |

**Predicted:** completion 0 % for the recipient on both layouts; 0 % for the sender on mobile. **Target (J5-T):** one **Share** control on every page (header on desktop, Tools sheet and unit/story cards on mobile) opening a share sheet: link (with a "include my map view" toggle), Web Share on supporting phones, QR code (for projectors and on-site), embed code, image card, print; recipient lands on the exact state in <= 3 s after app-ready with a "Shared moment" chip and a one-tap "Explore from here" (finding 06). Link-restore success >= 99 % (test matrix, section 9).

---

### J6. On-site with AR (P4 Chris; phone, portrait, outdoors)

| # | Action | Response | Evidence | Q1-Q4 | Friction |
|---|---|---|---|---|---|
| 1 | Opens the site on the phone | Splash, chooser (no auto-select), onboarding modal; the map has **no "you are here"**, no locate button | grep: zero `geolocation` in `pretty:96209+` | ✗ ✗ ✗ - | UXF-49 |
| 2 | Wants "what happened where I'm standing" | Nothing answers it; Walkthrough (16 stops with GPS) exists on desktop only; the mobile Tools sheet lacks it | `pretty:103380-103500` | ✗ | UXF-49, 14 |
| 3 | Finds AR | Only via the floating Extra Features icon (hops corners) then group "Experience It" then "Battlefield AR"; leaving the map for the AR page discards the map state | `index.html:535-542`, `site-nav.js:43-50` | ~ ✗ ~ ✓ | UXF-11 |
| 4 | Taps "Start Battlefield AR" | Asks camera, then location, then (iOS) motion permission in one async chain; the motion request runs after two `await`s (iOS requires it inside the user gesture) | `ar.html:154-186` | ✓ ✓ ✓ ~ | UXF-50 [I] |
| 5 | Points the phone | Shows up to 30 place labels within 3 miles and a 70-degree field of view; label text "Little Round Top 0.4 mi · 650 ft"; no story, no tap action; on Android heading uses `360 - alpha`, which is not north-referenced on all devices (the source says so) | `ar.html:122-129`, `:142-150` | ✓ ✓ ✗ ✗ | UXF-50 |
| 6 | Signal drops | HTML is never cached by the service worker (only assets, icons, data after a visit); Mapbox tiles are cross-origin and never cached | `sw.js:38,72-75` | ✗ | UXF-51 |
| 7 | Installs to the home screen | `orientation: landscape` in the manifest | `manifest.json:9` | ✗ | UXF-37 |

**Predicted:** the AR prerequisites are satisfied, but the value delivered (labels for 30 places, no explanation) is low, the path to it is long, and offline fails. **Target (J6-T):** "Visit" is the first tab on-site: Near me (nearest 5 of 528 POIs: 16 stops + 512 monuments, plus 30 places, with distance and compass arrow), tap a POI for "What happened here" with a "Watch it happen" button that frames the map on that moment; AR becomes a view of the same POI list, with a 2-D radar fallback when the camera is denied; offline pack; portrait allowed (finding 14).

---

### J7. Classroom use (P2 Mr. Alvarez, P1 Maya)

| # | Action | Response | Evidence | Friction |
|---|---|---|---|---|
| 1 | Searches for a teacher resource | "For Students" is item 4 of "Learn" in a hidden menu; there is no "For Teachers"; privacy page says the site "is often used in classrooms" | `site-nav.js:29`, `privacy.html` | UXF-47 |
| 2 | Opens "For Students" | Day tabs plus 24 cards using `panel_summary` (median FK grade 10.9 [C], 21 of 24 above grade 8); separate blue palette; each card ends in a dead "See it on the map" | `education.html:20,80-81`, `fk.py` | UXF-48, 24 |
| 3 | Wants to project | App UI text is 9-11 px (49 elements per the audit) | audit D2 | UXF-38, 48 |
| 4 | Wants 30 students on the same moment | No class link; Watch Together needs tick numbers typed into a "Tick (1-675)" box and a public WebRTC broker; export/import a JSON file | `watch-together.html:79,172`, `:64` | UXF-18, 47 |
| 5 | 30 Chromebooks load the site | Each student repeats splash + chooser (about 14 s each) and pulls 1.58 MB (Lighthouse transfer) on school Wi-Fi | `lh_mobile.json` `total-byte-weight` 1,577,215 B | UXF-05 |

**Target (J7-T):** a **Teach** hub (More menu): three ready lessons (each an ordered playlist of moments with a focus question), a **Present** view (large type, high contrast, clicker keys PageUp/PageDown), a **class link** (URL that opens all students on the same playlist at step 1; notes carried in the URL fragment so they never reach server logs), print kit, reading-level toggle; no accounts, no PII (finding 13).

---

### J8. Screen-reader user (C-AT1)

State of the art per `app-a11y` (verified there): zero ARIA in the app region, no landmarks/headings/labels, all 75 buttons unnamed or glyph-named, the map is a `<canvas>` with no alternative, the layout cards are click-only, the timeline `<input type=range>` has no label. Sub-pages are the only reasonably usable surfaces (semantic `main`, headings) but their results regions are not live regions. **Walkthrough:** page loads: the crawler-oriented `#seo-content` block (`h1` plus tool links, `index.html:717-741`) is what a screen reader could read, but React 18 `createRoot` replaces the contents of `#root` on mount and removes it **[I]**; after mount the SR user hears "GETTYSBURG ... Choose Your Experience" and cannot activate either card. Q1 ✓ Q2 ✗ Q3 ✗ Q4 ✗. **Target (J8-T):** a first-class text route (finding 15 and section 5.13): a skip link "Read the battle as text" before anything else, the **Battle Chronicle** (24 moments and 137 events as a navigable, filterable list with "Open on map" buttons) reachable in <= 2 keystrokes from the first Tab stop, the same permalinks, live-region status for search/Ask results.

### J9. Keyboard-only (C-AT2)

Blocked at the layout chooser (`pretty:102767,102789`: `div onClick`; no key handler for those cards; `Enter` and `Space` are consumed by the global handler or ignored). If a keyboard user got past (e.g. after `?layout=` support), further issues: bare-letter shortcuts fire without modifier checks (`Ctrl+F` triggers Filter); Space is swallowed on focused buttons; Esc is ignored while the search input has focus (`pretty:112967`); tab order does not match visual order because `#extra-features` precedes `#root` in the DOM (`index.html:285` vs `:716`) once revealed; focus is never moved into dialogs. **Target:** no gate; skip link plus header landmarks; a shortcut cheat-sheet reachable with `?`; Esc contract (clear text, close top overlay, clear selection); every panel operable by Tab/Enter (section 5.13 and `app-a11y-05/06`).

### J10. Slow 3G (C-NET)

Computed, not measured: Lighthouse mobile transfer is 1,577,215 B (1.5 MB; scripts 600 KB, 135 fetches 918 KB) [V]. At an effective 400 kbps, 1.58 MB x 8 = 12.6 Mb, so **at least 31.5 s** of pure transfer (25 s at 500 kbps) before the map exists [C], plus the first-visit service-worker reload (`index.html:264-268`) and 4.9 s of splash. What the user sees meanwhile: the static HTML title and an indeterminate 2 px bar (`index.html:117-127`); no text content to read, no way to skip ahead. The `#seo-content` prose exists but sits under the splash. **Target (J10-T):** Lite mode (finding 15): if `navigator.connection.saveData` or `effectiveType` is 2g/3g (or the user taps "Lite"), show the Battle Chronicle text view plus a poster image immediately (a few KB), and a "Load the interactive map (about 1.6 MB)" button; determinate loading stages; the map upgrades in place.

### J11. Ask the Historian (P6/P1)

| # | Action | Response | Evidence | Friction |
|---|---|---|---|---|
| 1 | Finds Ask | Pill "Ask the Historian" in the injected overlay (map) or header (sub-pages); on phones the pill is icon-only | `index.html:309`, `site-nav.css:52` | UXF-11 |
| 2 | Types "Why did Lee attack the center on Day 3?" | Stop-word keyword scoring over regiment/vignette/chronology/terrain text; top 3 rendered; the 137 chronology entries contribute only location text and render "...: undefined" | `historian.html:154-193,119-125` | UXF-43, 44 |
| 3 | Reads | Each vignette answer is the entire `full_script` (median 293 words) in one bubble; newest bubble lands under a sticky input bar | `historian.html:109`, `:35`, `:174` | UXF-44 |
| 4 | Wants to see it | Source link "See this moment on the map" (dead link) or none (chronology) | `historian.html:110,124` | UXF-24, 44 |
| 5 | Follow-up | No thread memory, no suggested follow-ups (5 static chips only), no "what I could not find" statement | `historian.html:147` | UXF-44 |

**Target (J11-T):** answer cards with a 2-3 sentence synthesis, numbered citations that open the exact record or moment (working permalinks), a coverage line ("Based on 6 records. Not covered: weather"), follow-up chips, "Ask about this" from any unit or story card, and an opt-in "Send this unanswered question" button (privacy-safe route to expand the databases; section 9.4). Detailed retrieval design belongs to the historian specialist; this plan fixes the interface contract (finding 18).


---

## 4. Heuristic evaluation and friction register

### 4.1 Nielsen's ten heuristics applied to the whole product (desktop / mobile grade, then the evidence)

Grades are my judgement of the deployed state on the A-F scale used in the audit; "sev" is the worst Nielsen severity among the listed frictions.

| # | Heuristic | Desktop | Mobile | Sev | What fails (friction ids) | Sample evidence |
|---|---|---|---|---|---|---|
| H1 | **Visibility of system status** | C | D | 3 | Splash counts "Fast-forwarding 3 days" but the user cannot tell why; Help opens 1-2 s late with no state; Ground Remembers blank ~3 s; July 2/3 data loads only on playback so jumps show an empty or stale map with no indication; no boot-failure path (UXF-01, 29, 30) | `pretty:101542`; `app-bugs-06`; `pagesB` S2 |
| H2 | **Match between system and the real world** | C | C | 3 | "Tick 267/675", "Tick 12" in Documentary, "Tick (1-675)" input; raw unit ids ("U-20ME") under names; "disposition"; "1x (real time)" is false; wrong clock; "NPS Auto Tour" not NPS's (UXF-18, 22, 34, 57) | `pretty:112357`, `documentary.html:89`, `watch-together.html:79,172`, `pretty:97955`, `app-bugs-33` |
| H3 | **User control and freedom** | C | D | 4 | Cannot skip gates by keyboard; no way back from Desktop to Mobile on desktop; "Skip intro" 11 px; Esc ignored in inputs; tour moves the map behind a modal; `history.back()` hack returns to the wrong page (UXF-02, 03, 04, 15, 53, 55) | `pretty:101581`, `pretty:112967`, `site-nav.js:212-224`, `pagesB` 134 |
| H4 | **Consistency and standards** | D | D | 3 | 3 searches, 6 regiment pickers, 2 header systems, letters vs emoji vs SVG icons, two toast systems, "Explore" menu vs group, education page on another palette, 10 pages with `/index.html` back link (UXF-10, 12, 15) | `site-nav.js:14,169`; `education.html:20`; grep of back links |
| H5 | **Error prevention** | C | D | 4 | Links that cannot work (`?tick=`, `?unit=`); mobile tiles that change state nobody renders; dead heatmap key; layout chooser lets a phone pick "Desktop" (UXF-03, 14, 24) | `app-bugs-05,12,24` |
| H6 | **Recognition rather than recall** | D | D | 3 | Toolbar is 5 letters and 7 emoji with hover-only `title`; 20 features behind one pill; shortcuts unseen on screen; no palette; Follow-Ancestor needs an exact-ish typed name; timeline markers unlabeled until hover (UXF-09, 11, 20, 40) | `pretty:113145-113240`; `pretty:112270-112293` |
| H7 | **Flexibility and efficiency of use** | C | D | 3 | No permalink, no resume, no palette, no "next moment"; but keyboard shortcuts exist (a strength for P5); layout choice not remembered (UXF-24, 26, 22) | `pretty:112966-113052` |
| H8 | **Aesthetic and minimalist design** | C | D | 3 | Five things claim the top-right slot; everything opens at once after the tour; legend, minimap, HUD, story panel and event card simultaneously; 9-11 px type (UXF-07, 31, 38) | `app-bugs` Appendix E |
| H9 | **Help users recognize, diagnose, recover from errors** | D | D | 4 | No error boundary (white screen or infinite splash); sub-pages: "Loading..." forever if a fetch fails; Historian prints "undefined"; permission errors on the AR page are the one good example (UXF-29, 33, 43) | `app-bugs-04`; `pagesB-03`; `ar.html:165,179` (good) |
| H10 | **Help and documentation** | C | D | 3 | Help = Shortcuts + About only; PDF is the real manual and needs "Save link as"; guide says Esc closes any panel and Street View panoramas (both untrue); no "report an error"; "Chrome recommended" (UXF-17, 57) | HelpModal chunk strings; `ug.txt` |

**Strengths to keep** (evaluation should say what works): the map metaphor and the animation are the product and are compelling; the sub-page nav pattern (`← GETTYSBURG · Ask the Historian · Explore`) is coherent; the five-group taxonomy already follows user goals ("Drive the map yourself", "Get the story explained", "Research a unit or ancestor", "Feel the scale of it", "Bring others along", `site-nav.js:14-58`); the AR permission pre-explanation and per-permission status list are good practice (`ar.html:59-67`); honest caveats (Sandbox banner "HYPOTHETICAL — NOT HISTORICAL", Find-Ancestor caveat, Aftermath scope note); keyboard shortcuts for playback; the static HTML splash and `#seo-content` prose give crawlers something real; no accounts and no PII (excellent for classrooms).

### 4.2 Friction register (59 items)

Columns: **id**; friction; **sev** (Nielsen 0-4, worst case across personas); heuristic; personas affected; **D/M** = desktop/mobile affected; evidence; fix (finding id in section 11, or sibling finding).

**A. Entry and onboarding**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-01 | Forced fake fast-forward: 800 ms wait + 3.5 s sweep + 0.6 s fade after data is ready, writing the store every frame | 3 | H1, H7 | all | D M | `pretty:101471-101590` | ux-flows-02; `bundle-anatomy-13`, `app-design-14` |
| UXF-02 | "Skip intro ›" is a non-focusable 11 px `#444` `div` | 4 (keyboard) | H3 | P5, AT | D M | `pretty:101581` | ux-flows-02; `app-a11y-03` |
| UXF-03 | Layout chooser every visit; not persisted; no auto-detect; note promises a settings menu that does not exist on desktop | 3 | H3, H5, H7 | all | D M | `pretty:102759-102815`, `:112949` | ux-flows-02; `app-bugs-11` |
| UXF-04 | Onboarding modal: judgmental archetypes ("History Buff", "Power User"), keyboard-shortcut path offered on touch, tour moves map behind modal, copy says "Press Space" | 2 | H2, H8 | P1, P4, P6 | D M | `pretty:111799-111845` | ux-flows-02 |
| UXF-05 | Three stacked blocking screens and >= 3 clicks before first interaction | 3 | H7, H8 | all | D M | J1 | ux-flows-02 |
| UXF-06 | Injected banner "an AI-style historian, live sound" advertises a control that is hidden until a gate is passed | 2 | H2 | P6 | D M | `index.html:377`, `:509-517` | ux-flows-02, 16 |
| UXF-07 | After entry, legend + minimap + story panel + event card + toasts all open | 3 | H8 | all | D M | `app-bugs-10` | ux-flows-11 |
| UXF-08 | No orientation to what the product can do (20 features) except the hidden pill | 3 | H6, H10 | P6, P1 | D M | J1 step 4-7 | ux-flows-02, 04 |

**B. Navigation and discoverability**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-09 | Toolbar: 5 letter buttons (S F L B ?) and 7 emoji, about 28 x 26 px, `title` only (invisible on touch) | 3 | H6 | all | D M | `pretty:113145-113240` | `app-design-12`; ux-flows-04, 11 |
| UXF-10 | Three search entry points (`S` panel, 🔍 "Find Unit / Location" which opens the same panel, "Search Everything" page) with different corpora; six regiment pickers (S panel, ⭐ Follow, Biography, Battle Reports, Find Ancestor, Camera "Follow a Unit") | 3 | H4 | P3, P5 | D M | `pretty:113214`, `search.html`, `regiment.html`, `report.html`, `find-ancestor.html`, `camera.html` | ux-flows-03, 09 |
| UXF-11 | Extra Features pill: outside React at z-index 999999, hidden until a gate is passed, hops among six screen positions after every click, **overlaps the story panel, Walkthrough text, layout-chooser cards and the Help backdrop** (H1), icon-only on phones, first in tab order once revealed | 3 | H4, H6 | all | D M | `index.html:176-206`, `:535-542`, `site-nav.css:52` | ux-flows-04; `app-design-13` |
| UXF-12 | Menu button and first group are both called "Explore"; "Search" filed under "Explore" | 2 | H4 | all | D M | `site-nav.js:14`, `:169` | ux-flows-04, 16 |
| UXF-13 | Opaque or overpromising names (Documentary Mode is a text reader; Camera Modes; Immersive Mode; Living Ledger; The Ground Remembers; What They Could See is not a viewshed; NPS Auto Tour; Virtual Walkthrough; Watch Together is a file exchange; Cinematic Export) | 3 | H2 | P6, P1 | D M | `site-nav.js:16-56`; audit H8 | ux-flows-16 |
| UXF-14 | Layout asymmetry: Order of Battle absent on desktop; Walkthrough, Distance, Locations absent on mobile; five dead mobile tiles | 3 | H4, H5 | P5, P3 | D M | `app-bugs-12,13`; `pretty:103380-103500` | `app-bugs-12,13`; ux-flows-04 |
| UXF-15 | "Back to the map" is `/index.html` on 10 pages (bypasses the history-based return) and `history.back()` returns to the previous *page*, not the map (Historian to Regiment to Back goes to Historian) | 3 | H3, H4 | all | D M | `site-nav.js:212-224`; `pagesB` 134; grep: aftermath, camera, compare, dashboard, documentary, education, report, sandbox, search, viewshed | ux-flows-07 |
| UXF-16 | Sub-pages know nothing about the map state; each hop re-boots the 2.28 MB app (bytes cached, but a full parse, splash and chooser) | 3 | H7 | all | D M | J3/J4 | ux-flows-01, 07, 23 |
| UXF-17 | Help = Shortcuts + About; manual is a PDF ("Download Website Tutorial PDF" button in the top bar); guide inaccuracies (G1) | 3 | H10 | P5, P3 | D | HelpModal chunk; `pretty:113115-113140` | ux-flows-17 |
| UXF-59 | Flat hierarchy: Play is one of five equal small buttons (it differs from its neighbours only by padding 4x18 vs 4x10 and 16 vs 14 px type), the 13 toolbar icons carry equal weight, and the loudest control in the header is a 12 px bold gold "Download Website Tutorial PDF" pill; no single primary action per screen; no `h1` or landmarks in the app shell | 3 | H8, H6 | all | D M | `pretty:112431-112440` (`Po.btn`, `Po.playBtn`), `pretty:113115-113132`, `pretty:113145-113240`; `app-a11y` §1 fact 1 | ux-flows-04, 11, 24 |

**C. Time and moments**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-18 | "Tick n/675" is the visible unit of time in the transport, Documentary eyebrow, Search results and Watch Together input, next to a clock that disagrees with history (C3/C4) | 3 | H2 | all | D M | `pretty:112357`, `documentary.html:89`, `search.html:125`, `watch-together.html:79,172` | ux-flows-05, 16; time specialist |
| UXF-19 | Six moment lists with conflicting ticks; 6 of 9 Turning Points anchors land on another event | 3 | H4, H5 | P1, P5 | D M | Appendix A [C] | ux-flows-05 |
| UXF-20 | Timeline: 8 markers of 8 x 8 px, hover-only names; none on mobile; 24 vignettes and 137 events are not on the timeline | 3 | H6 | P6, P1 | D M | `pretty:112270-112293` | ux-flows-05, 24 |
| UXF-21 | "Dead air": no event and no vignette in ticks 101-225 (125 ticks, 56 % of Day 1); gaps between vignette triggers 57 to 240 (183), 326 to 460 (134), 568 to 675 (107) | 3 | H1, H8 | P6, P1 | D M | [C] Appendix A and `chapters.py`; section 6.5 | ux-flows-24, 26 |
| UXF-22 | Speed label "1x (real time)" false (10 battle-min/s); playback never pauses at narrative cards; no "next moment" | 2 | H2, H7 | P1, P6 | D M | `app-bugs-33` | ux-flows-24 |
| UXF-23 | Compare, Camera, Heat map, Sandbox, Viewshed, Sound, Ledger and Export are separate pages with their own maps and data loads and no state handoff | 3 | H7 | P5, P2 | D | `pages-outline.txt`; `bundle-anatomy-18` | ux-flows-23 |

**D. Sharing and continuity**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-24 | Share/deep links are write-only: the app reads none of `t,u,z,ll,tick,unit,vignette,lat,lng` | 4 | H5, H9 | all | D M | `app-bugs-05`; `search.html:114,127,139` | ux-flows-01 |
| UXF-25 | Share UI: `B` letter button, unlabeled glyph, `window.prompt` fallback; none on mobile; no Web Share, QR or image | 3 | H6 | P1, P4 | D M | `pretty:97932`, `:97964` | ux-flows-06 |
| UXF-26 | No resume, no persisted layout, no recent moments | 3 | H7 | P5, P3, P1 | D M | `app-bugs-29` | ux-flows-08 |
| UXF-27 | Same `og:image` and text for every URL: no per-moment previews | 2 | H10 | P6 | D M | `index.html:21`; `pagesB-09` | ux-flows-06, 25 |
| UXF-28 | Embed page CTA is dead and no embed generator exists though Terms invite embedding | 2 | H5 | P2 | D | `embed.html:60`; `terms.html` | ux-flows-06 |

**E. Feedback, errors, empty states, copy**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-29 | No error boundary or boot-failure path: render error white-screens; failed data leaves an infinite splash | 4 | H9 | all | D M | `app-bugs-04`; `app-design-26` | ux-flows-12 |
| UXF-30 | Missing or late loading states (Help 1-2 s, Ground Remembers ~3 s, lazily loaded day data) | 2 | H1 | all | D M | audit D1, S2; `app-bugs-06` | ux-flows-12 |
| UXF-31 | Toast and card flooding, no live region | 2 | H8 | P1, P6 | D M | `app-bugs-10` | ux-flows-11, 12 |
| UXF-32 | Weak empty states: Regiment landing is one search box over a floating footer, Living Ledger starts at "4 casualties", Dashboard "undefined", "No results" with no alternatives | 2 | H9 | P3, P5 | D M | audit S1, S4, C7; `search.html:64` | ux-flows-12 |
| UXF-33 | Sub-page fetch errors have no retry or offline message | 3 | H9 | all | D M | `pagesB-03` | ux-flows-12 |
| UXF-34 | Dev-log voice and raw data in UI ("undefined", "Commander unrecorded", "alias for U-84NY", raw ids) | 2 | H2 | all | D M | audit H7; `search.html:112`; `pretty:97955` | ux-flows-16 |

**F. Mobile-specific**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-35 | Transport row off-screen; Tools sheet bottom rows covered by the timeline (C1, C2) | 4 | H5 | P4, P6, P1 | M | `app-bugs-11` | `app-bugs-11`, `app-design-02` |
| UXF-36 | Mobile has no key moments, no share, no Help/Bookmarks (dead tiles), no Walkthrough; features only via an icon pin | 3 | H7 | P4, P6 | M | `pretty:103380-103500` | ux-flows-04, 05, 06 |
| UXF-37 | Manifest orientation locked to landscape | 2 | H3 | P4 | M | `manifest.json:9` | `app-a11y-29`; ux-flows-14 |
| UXF-38 | 9-11 px type, targets under 44 px, splash title clipped | 3 | H8 | all | D M | audit D2, S4 | `app-design`, `app-a11y-18,19` |

**G. Ancestor finding**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-39 | Finder keys on commander surname and state, not the unit; lexicographic sort; raw parent ids; hard cap 100 | 3 | H2, H6 | P3 | D M | `find-ancestor.html:56-59,108,114,121` | ux-flows-09 |
| UXF-40 | Three ancestor tools, three UIs; Follow picker capped at 15 rows and only animated-and-loaded units | 3 | H4 | P3 | D M | `pretty:101039-101050`; `app-bugs-06,14` | ux-flows-09 |
| UXF-41 | No alias/abbreviation tolerance ("24th Mich.", "1st Minn.", "Co. G", "twentieth") | 3 | H6 | P3 | D M | `app-bugs-14` | ux-flows-03, 09 |
| UXF-42 | No "what next" after a regiment is found; the NPS Soldiers and Sailors link is inside a caveat | 2 | H10 | P3 | D M | `find-ancestor.html:52` | ux-flows-09 |

**H. Historian**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-43 | Every chronology answer ends in the literal "undefined" (137 of 137) | 3 | H9 | P6, P1 | D M | `historian.html:119-125`; `hist_undefined.js` | ux-flows-19 |
| UXF-44 | Answers are pasted vignettes; newest bubble sits under a sticky input; no follow-ups; no coverage statement; source links dead or absent | 3 | H2, H9 | P6, P1 | D M | `historian.html:35,109,124,147,174` | ux-flows-18 |
| UXF-45 | Ask exists only on a separate page; no "Ask about this" from a unit, story or search miss | 2 | H7 | P6, P5 | D M | `pretty:97897-98110` (no Ask control) | ux-flows-10, 18 |
| UXF-46 | Onboarding copy says "AI-style historian" while the page says "not a live AI model" | 2 | H2 | P6 | D M | `index.html:377`; `historian.html:48` | ux-flows-16 |

**I. Classroom**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-47 | No teacher surface: no lesson, present view, class link or print kit | 3 | H7, H10 | P2 | D | `site-nav.js:29`; J7 | ux-flows-13 |
| UXF-48 | Student page: grade about 10.9 median, separate palette, dead map links; app type too small to project | 3 | H2, H4 | P1, P2 | D M | `education.html:20,80-81`; `fk.py` | ux-flows-13; `pagesB-20,23` |

**J. On-site**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-49 | No GPS, no "you are here", no Near me; 528 POIs unused by any location feature | 3 | H7 | P4 | M | grep (zero `geolocation`); `pretty:104096,104440` | ux-flows-14 |
| UXF-50 | AR: 30 places only; long undifferentiated permission chain (iOS gesture risk [I]); no fallback; 11-12 px HUD; DOM rebuilt on every orientation event | 3 | H5, H7 | P4 | M | `ar.html:46-47,120,151,154-186` | ux-flows-14 |
| UXF-51 | Not usable offline: HTML never cached, tiles never cached | 3 | H7 | P4 | M | `sw.js:38,72-75` | ux-flows-14; `bundle-anatomy-03` |
| UXF-52 | No safety/etiquette copy; no sunlight-legible theme | 2 | H10 | P4 | M | J6 | ux-flows-14 |

**K. Accessibility (entry path only; the full audit is `app-a11y`)**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-53 | Keyboard-only users cannot pass the layout chooser | 4 | H3 | AT | D M | `app-a11y` §1 fact 2; `pretty:102767,102789` | ux-flows-02 |
| UXF-54 | No landmarks, headings, labels; canvas without a text alternative | 4 | H2, H6 | AT | D M | `app-a11y` §1 facts 1 and 3 | ux-flows-15; `app-a11y-08,12,15` |
| UXF-55 | Esc contract inconsistent; bare-letter shortcuts fire with modifiers; Space, `1/2/3`, `+/-` are undiscoverable and absent on touch | 3 | H3, H7 | P5, AT | D | `pretty:112966-113052`; `app-bugs` Appendix I | ux-flows-20 |
| UXF-56 | Tab order differs from visual order (`#extra-features` precedes `#root`) | 2 | H4 | AT | D | `index.html:285` vs `:716` | ux-flows-04 |

**L. Trust**

| id | Friction | sev | Heur. | Pers. | D/M | Evidence | Fix |
|---|---|---|---|---|---|---|---|
| UXF-57 | No per-moment sources, data version or "report an error"; "NPS" used in feature names with no non-affiliation notice | 3 | H10 | P5, P3, P2 | D M | grep (no affiliat/unofficial in HTML); `site-nav.js` footer has only `mailto` | ux-flows-17, 28 |
| UXF-58 | Visible clock/date/narrative contradictions (C3, C4) undermine credibility for the most engaged persona | 4 | H2 | P5, P3 | D M | audit C3/C4; `app-time` | time specialist; ux-flows-05 (single source of truth) |

**Severity distribution:** 4 (catastrophe): UXF-02, 24, 29, 35, 53, 54, 58 (7 items); 3 (major): 36 items; 2 (minor): 16 items. Every severity-4 item is either an entry blocker, a dead share path, a crash path, or a data-credibility issue; each has a fix in phases 0-2 (section 12); UXF-58 also depends on the time specialist's clock fix.


---

## 5. Redesigned information architecture

### 5.1 Diagnosis: nine structural problems (the IA-level root causes of the register)

| # | Structural problem | Evidence | Frictions explained |
|---|---|---|---|
| S1 | **Two products, no shared state.** A single-page map plus 20 static pages; the only things they share are a header/footer script, a data folder and an unreliable `history.back()` trick | `site-nav.js:203-228`; each sub-page loads its own JSON (`historian.html:75-80`, `search.html:99-103`) | UXF-15, 16, 24 |
| S2 | **One primitive, many hand-kept lists.** A "moment" (a tick with a name and a place) is stored as 8 scrubber markers, 5 tour steps, 24 vignettes, 137 events, 9 Turning Points, 16 stops, bookmarks, Watch Together stops, Compare/Sandbox/Export defaults | `pretty:112192`, `:111819`, `:104096`; `turning-points.html` POINTS | UXF-19, 20, 21 |
| S3 | **Duplicated capabilities.** Three search entry points, six regiment pickers, three ancestor tools, two "back" mechanisms, two toast systems | see UXF-10, 40 | UXF-10, 39, 40, 41 |
| S4 | **Map modes delivered as pages.** Compare, Camera, Heat map, Sandbox, Viewshed, Sound, Ledger, Export each build another Mapbox map and fetch data again | `pages-outline.txt`; `bundle-anatomy-18` (second 1.8 MB Mapbox copy from CDN) | UXF-16, 23 |
| S5 | **Four navigation lists that drift.** Desktop toolbar (13 icons), mobile tool sheet (14 tiles), injected Extra Features pill (20), sub-page nav (20), plus Help and the PDF | `app-bugs-13`; `index.html:295-353` | UXF-09, 11, 14, 17 |
| S6 | **Naming that collides or does not describe.** "Explore" is a button and a group; six feature names do not say what they do | `site-nav.js:14,169` | UXF-12, 13 |
| S7 | **Layout as a user decision.** "Choose Your Experience" instead of responsive layout | `pretty:102752-102830` | UXF-03, 05, 53 |
| S8 | **Contexts unserved.** No classroom, present or on-site context; only "New / Buff / Power User" archetypes, which are skill levels | `pretty:111799-111816` | UXF-47, 49 |
| S9 | **No feedback loop.** Nothing lets a visitor report an error or ask a question the site cannot answer, and nothing measures use | `site-nav.js:194` (footer `mailto` only); privacy page (RUM only) | UXF-57 |

**Discoverability evidence.** Reaching any of the 20 features from the map takes three actions after the gates (open the pill, scan a five-group card menu, pick an item) and the pill itself is hidden until a gate is passed and then moves (`index.html:441-519`, `:535-542`). Netlify's top-15 list shows the busiest feature pages at 40-86 pageviews each in 30 days against 1,713 home views (2-5 % each). That is consistent with weak discoverability but also with low need; the instrumented `nav_click` and feature-reach metrics (section 9) will separate the two.

### 5.2 Principles

1. **Content first.** The first thing a visitor sees is the battle moving; chrome is a thin header and a timeline.
2. **Never ask what the device can answer.** Layout, reduced motion, data-saver and touch are detected; the user can override in Settings, not on a gate.
3. **One thing, one name, one place.** One search, one regiment finder, one moment list, one share button, one back behaviour.
4. **Every state has a URL; every URL restores its state.** Share, resume, classroom links, on-site "you are here" and tests all use the same contract (section 5.6).
5. **Progressive disclosure.** Tier 0 is visible, tier 1 is one tap away, tier 2 appears in context, tier 3 is for experts; nothing opens by itself except by user action or deep link.
6. **Text is a first-class route.** The same content is reachable as text (screen readers, slow networks, no WebGL, search engines) without a separate product.
7. **Contexts are modes, not pages.** Classroom, Present and On-site change defaults and what is shown, not the site map.
8. **Honest names, honest data.** Say what a feature does; show sources; never show ticks, ids or `undefined` to people.
9. **Solo-developer sustainability.** One tool registry, one `moments.json`, one URL contract, one `facts` object; anything that must be kept in sync is generated from data (extends `app-bugs-13`, `app-bugs-15`).

### 5.3 Content model (the nouns), and the verbs

| Entity | Fields (existing source) | Notes |
|---|---|---|
| **Moment** | `id` (V-001.. or new M-xxx), `title`, `tick`, `place {name, lat, lng, zoom}`, `units[]`, `summary` (short, target <= 60 words, grade <= 8), `story` (existing `full_script`), `chapter`, `day`, `significance`, `sources[]`, `kind` (vignette / event / debate / stop / epilogue) | Replaces the 6 lists; source of timeline chapters, Documentary, Turning Points, Students, tour steps, palette results, share cards |
| **Playlist** | `id`, `title`, `moments[]` (ids), `audience`, `kind` (documentary / debates / lesson / tour / user) | Documentary = all 24; Turning Points = 9 debates; onboarding "20 second moment" = 1; lessons = 5-10; user tours (Watch Together) |
| **Unit** | OOB record plus `aliases[]` (generated: "24th Mich.", "24 Michigan"), parent chain, animated flag | Canonical **Unit page** `regiment.html?unit=` (already the one working param) |
| **Place** | `terrain.json` `key_locations` (30) | Fix data typo: "Gulp's Hill saddle" is spelled with G (search for "Culp" would miss it) [C] |
| **POI** | 16 tour stops (`d2`) + 512 monuments (`_A`) with lat/lng, side, group, honors | Move out of the JS bundle into JSON; used by Near me, AR, Search, Visit |
| **Person** | commanders from OOB and `commander_successions.json` | Enables "who was X" queries and the Historian |

**Verbs (the five primary actions, in the words visitors use):** **Watch** (play the battle, hear the story), **Find** (units, people, places), **Ask** (questions), **Visit** (on the ground), **Share** (send, teach, embed, print).

### 5.4 Primary navigation

**Global header (map and every sub-page; one component, replaces the injected pill and the per-page brand/back pair; implements `app-design-13`).** Height 56 px desktop, 48 px compact.

```
Desktop >= 1024:
[◈ Gettysburg]  Battle  Stories  Find  Ask  Visit      [ Search or ask...         Ctrl K ]  [Share ▾]  [⋯ More]
                ^ current page underlined + aria-current="page"

Compact < 768:  [◈]  [July 2 · Moment name]                      [🔍 Search]  [Ask]  [⋯]
                bottom tab bar (all pages): Battle | Stories | Find | Ask | Visit   (56 px + safe-area)
```

| Destination | Purpose in the visitor's words | Contains | Default landing |
|---|---|---|---|
| **Battle** `/` | "Watch it happen" | The animated map, timeline with named **chapters**, moments, unit cards, and the map **views** (Live, Compare, Trail heat map, What-if lab, Sightlines lab) | Map at the resumed or default view |
| **Stories** `/stories` | "Tell me the story" | Documentary (24 moments), Turning Points (9 debates), The Human Cost (Living Ledger), Aftermath, Student edition (a reading-level switch, not a separate site) | Card grid with a "Start with the 20-second moment" tile first |
| **Find** `/find` | "Look something up" | Search (units, people, places, monuments, moments), Regiment finder / ancestor flow, Order of Battle tree, Numbers (Casualty Dashboard), Regiment reports (print) | Search box with featured units and "Looking for an ancestor?" card |
| **Ask** `/ask` | "I have a question" | Ask the Historian, Sources and method, Report an error | Ask box with suggested questions by audience and a coverage note |
| **Visit** `/visit` | "I'm here (or going)" | Near me, Battlefield tour (16 stops), Battlefield AR (with 2-D radar fallback), Soldier's Eye, Offline pack, visit-safety note | Near me if location permitted else tour list |
| **More** (menu) | "Everything else" | For Teachers (Classroom mode launcher), Make and share (Cinematic export, Watch Together, Embed), Help and shortcuts, User guide, Accessibility statement, Privacy, Terms, Contact | n/a |

Five destinations plus More keeps the top level inside a comfortable chunk size. Each of the 20 Extra Features has exactly one home (table 5.5). The marketing idea of "20 Extra Features" survives as a **Features** index page listing all 20 as cards grouped by destination; it is linked from More and the footer, and is the natural crawl hub (`seo` specialist).

**Modes** (context switches; section 6.6, 6.7): **Explore** (default), **Classroom** (simpler type scale and toolset, no third-party embeds, lesson bar), **Present** (projector view, clicker keys), **On-site** (Near me first, big targets, battery saver, offline aware). Set from More > "How are you using this?", by URL (`?mode=`), or by an unobtrusive prompt (for example after 3 lesson-link opens or when inside the park polygon with location already granted). A mode chip appears in the header when not in Explore.

**What is deliberately not in the header:** Layers, Filter, Key, Measure, Order of Battle. They are map tools and live in the map's own **Tools** area (below), because they are meaningless on the other four destinations.

**Map tools area (Battle only).** Desktop: a slim left rail with icon plus label at >= 1280 px (icon-only with tooltip below): Layers, Filter, Key, Measure, Saved moments, Units. Compact: Tools bottom sheet from `⋯` in the header, four columns, labels 12 px, above the transport, never covered. Both draw from one tool registry (`app-bugs-13`).

### 5.5 Where every current control and page goes

**Desktop toolbar and floating controls**

| Current | Where today (`pretty`) | New home | New label | Disposition |
|---|---|---|---|---|
| `S` Search | 113147 | Header search field and palette (`Ctrl/⌘+K`, `/`, `S`) | Search | Merge into palette; keep key `S` |
| `F` Filter | 113153 | Battle > Tools rail | Filter units | Rename |
| `☰` Unit Roster | 113159 | Find > Order of Battle (list view) | Units on the field | Merge with OOB into one panel with Tree and List views |
| `L` Legend | 113165 | Bottom-left collapsible "Key" | Key | Rename, collapsed by default |
| 🗿 Monuments | 113171 | Layers panel toggle | Monuments | Merge; delete the second (star) overlay script `index.html:608-714` |
| 🔭 Soldier's Eye View | 113177 | Visit | Soldier's Eye | Move |
| ⭐ Follow Your Ancestor | 113182 (`title: "Follow Your Ancestor"`) | Find > Unit page button and side panel | Follow a regiment | Rename (the use case is the ancestor; the noun is the regiment) |
| 📏 Distance Tool | 113188 | Tools rail | Measure | Rename |
| 🗺 Map Layers | 113194 | Tools rail | Layers | Move |
| 📍 Locations | 113204 | Layers panel toggle | Place names | Merge |
| 🔍 Find Unit / Location | 113214 | (retire; duplicate of `S`) | n/a | Retire |
| `B` Bookmarks | 113221 | Header Share ▾ and Tools rail | Saved moments | Rename, merge with share |
| `?` Help | 113226 | More > Help; `?` key | Help and shortcuts | Move |
| Toggle Units | 113112 | Layers panel toggle | Units | Move |
| Download Website Tutorial PDF | 113115-113132 | Help modal | User guide (PDF) | Move out of top bar |
| Virtual Walkthrough | 113137 | Visit | Battlefield tour | Rename and move |
| NPS Auto Tour launcher (`XF`, component at 100323) | 100473 | Stories playlist "The battle in 5 minutes" and Visit | Guided battle tour | Rename (not NPS's tour; `app-bugs-27`) |
| Sound button (`yO`) | 111768 | Settings (until rebuilt) | Sound | Hide until `app-bugs-03` |
| Minimap (`WF`), HUD, fps, Trails | various | Layers toggles; clock chip; hide fps | Overview map, Trails | Merge |

(Line numbers are the `title:`/`children:` lines of each toolbar button, verified by grep on `bundle.pretty.js`.)

**Mobile Tools sheet tiles (14)**

| Tile | New home | Note |
|---|---|---|
| Search | Header search icon and palette | Free the tile |
| Filter, Order of Battle, Unit Roster | Tools sheet; OOB and Roster merged into one tile "Order of Battle" | `app-bugs-13` tree |
| Monuments, Map Layers, Legend, Mini Map | Layers sheet (one tile "Layers") with Key inside | Four tiles become one |
| Soldier's View | Visit tab | |
| Follow Ancestor | Find tab / Unit page | |
| NPS Auto Tour | Stories > "The battle in 5 minutes" | |
| Bookmarks | Header Share and Tools "Saved moments" | Currently dead (`app-bugs-12`) |
| Help | More | Currently dead |
| Desktop View | Settings > Layout (Auto / Compact / Full) | The only tile that makes the layout a permanent choice; removed as a promise |

**The 20 Extra Features and the two neighbours**

| Page today | New destination | New label | Form |
|---|---|---|---|
| Search Everything (`/search.html`) | Find | Search | Becomes the full-page view of the palette (`/find?q=`); old URL 301 |
| Compare Moments | Battle > View | Compare | Interim: page with `?tick=&t2=`; target: in-map split view |
| Camera Modes | Battle > View | Camera: Director / Follow | Interim page; target: transport option "Follow the action" (`app-bugs-21` director) |
| What They Could See | Battle > View (lab) | Sightlines (lab) | Rename until real viewshed exists (H8) |
| What-If Sandbox | Battle > View (lab) | What-if (lab) | Keep the "HYPOTHETICAL" banner |
| Ask the Historian | Ask | Ask the Historian | Top-level destination and contextual "Ask about this" |
| Documentary Mode | Stories | Documentary | Real linear experience with map inline (`pagesB-14`) |
| Turning Points | Stories | Nine turning points | Anchors fixed via `moments.json` |
| For Students | Stories (reading-level switch) and Teach hub | Student edition | Same stories, `level=student`, grade <= 8 summaries |
| Aftermath | Stories | Aftermath | |
| Regimental Biography | Find | Regiment profile | Canonical Unit page |
| Find Your Ancestor | Find | Find a regiment or ancestor | One flow (finding 09) |
| Casualty Dashboard | Find | Numbers | Fix C7 first |
| Battle Reports | Find | One-page report | `?print=1` view of the Unit page |
| Immersive Mode | Battle > View | Sound | Toggle in Settings; accessible controls |
| The Living Ledger | Stories | The human cost | Also a HUD counter toggle |
| The Ground Remembers | Battle > View | Heat map ("Where the fighting was") | Layer/mode |
| Battlefield AR | Visit | Battlefield AR | With radar fallback |
| Watch Together | More > Make and share (Teach) | Watch Together | Simplify: class link and Present replace most use |
| Cinematic Export | More > Make and share | Make a video | |
| Embed page (unlinked) | More > Make and share | Embed a moment | Generator with copyable code |


### 5.6 URL state and sharing model (permalink schema)

This section is the contract that share, resume, classroom links, on-site "Near me", the palette, Documentary, the Historian citations and the test harness all depend on. It extends `app-bugs-05` (Appendix F) and `app-a11y-26` (state in the URL) into one table so the three plans cannot diverge.

**5.6.1 Goals.** (1) Every shareable state has a short, readable URL. (2) Parsing is total: it never throws, ignores what it cannot validate, and is idempotent. (3) A URL keeps pointing at the same *event* even if the tick calibration changes (see `dv`). (4) No personal data ever appears in a URL; free text is opt-in and length-capped. (5) A deep link suppresses the intro, the welcome moment and the resume banner. (6) The same contract is written by the map and by every sub-page.

**5.6.2 Canonical parameters** (canonical name first; aliases are accepted on read and never written):

| Param | Type / range | Example | Meaning | History op | Aliases (legacy) |
|---|---|---|---|---|---|
| `tick` | int 1-675 | `538` | Frame to show. Wins over `day` | `push` on jumps, `replace` on scrub-end and pause | `t` (app `$k`, `pretty:97823`) |
| `day` | 1-3 | `3` | Dawn of that day (framed). Ignored if `tick` present | push | none |
| `v` | vignette id (`V-016`), later `M-xxx` | `V-016` | Open the story card, frame its place; if `tick` absent use the moment's tick | push | `vignette` (sub-pages) |
| `unit` | OOB id | `U-24MI` | Select, pin and frame; if `tick` absent use its first keyframe | push | `u` (app, `search.html:114`, `regiment.html:247`) |
| `follow` | OOB id | `U-20ME` | Open Follow panel, draw trail, camera follows | push | `ancestor` (`pretty:101019`) |
| `at` | `lat,lng` (4 dp, about 11 m) | `39.8138,-77.2350` | Camera centre | replace (debounced 800 ms after move end) | `ll`; pair `lat` + `lng` (`search.html:139`) |
| `z` | 11-18 (1 dp) | `15.2` | Zoom | replace | `zoom` |
| `br`, `pt` | bearing 0-360, pitch 0-60 (integers) | `br=30&pt=45` | Rotated or 3-D camera; omitted when 0 | replace | none |
| `cam` | `free\|director\|follow` | `director` | Camera mode: free (default), Director (auto-frames the densest action, `camera.html:105-141`), Follow (locks on `unit` or `follow`) | replace | none |
| `panel` | `story\|unit\|search\|filter\|layers\|oob\|saved\|help\|tour\|eye\|ask\|measure` | `oob` | Side panel or sheet that is open | push | none |
| `q` | text, max 80 | `pickett` | Open the palette prefilled (never persisted, never auto-selected) | none | none |
| `ask` | text, max 200 | `why did lee attack the center` | Open Ask prefilled; **never auto-submitted** | none | none |
| `view` | `map\|text` | `text` | Force the text route (section 5.13) | replace | none |
| `mode` | `explore\|classroom\|present\|onsite` | `classroom` | Context mode (sections 6.6, 6.7) | replace | none |
| `level` | `full\|student` | `student` | Reading level for story text | replace | none |
| `layout` | `auto\|compact\|full` | `compact` | Override responsive resolution | replace | `layout=mobile` maps to `compact`, `desktop` to `full` |
| `pl` | up to 24 comma-separated moment ids | `V-009,V-010,V-012` | Playlist (lesson, tour) | push | none |
| `step` | int >= 1 | `2` | Index within `pl` | replace | none |
| `tick2` | int 1-675 | `300` | Second moment (Compare view) | replace | none |
| `dv` | int | `1` | Data-version stamp of the tick calibration the link was made with | written always, never typed | none |
| `intro` | `0\|1` | `0` | Force-skip or replay the guided moment | none | none |
| `src` | slug | `share` | Channel tag for metrics (stripped from the address bar after read); never a user id | none | none |

Reserved for other plans and passed through untouched: `motion`, `contrast`, `palette`, `debug` (`app-a11y-26`, `app-bugs-37`). **Fragment (`#`) is reserved** for content that must never reach server logs: `#n=` (teacher notes, base64url JSON, <= 1.5 KB) and `#tour=` (Watch Together tour payload, replacing the JSON-file exchange for short tours).

**5.6.3 Parse (total, ordered).**

```js
// lib/state-url.js
const ENUM = { view:['map','text'], mode:['explore','classroom','present','onsite'], level:['full','student'],
               layout:['auto','compact','full'], cam:['free','director','follow'], panel:[/* registry ids */] };
export function parseState(search, hash, facts) {
  const p = new URLSearchParams(search), out = {}, warn = [];
  const num = (v,lo,hi) => { const n = Number(v); return Number.isFinite(n) && n>=lo && n<=hi ? n : undefined; };
  const first = (...k) => k.map(x => p.get(x)).find(v => v != null);          // canonical first, then aliases
  out.dv      = num(p.get('dv'),1,99) ?? 1;                                    // legacy links have no dv: treat as 1
  out.tick    = num(first('tick','t'),1,facts.maxTick);
  out.day     = num(p.get('day'),1,3);
  const v     = first('v','vignette');       if (v && facts.momentIds.has(v)) out.v = v;
  const u     = first('unit','u');           if (u && facts.unitIds.has(u))   out.unit = u;
  const f     = first('follow','ancestor');  if (f && facts.unitIds.has(f))   out.follow = f;
  const ll    = (first('at','ll') || (p.get('lat') && p.get('lng') ? `${p.get('lat')},${p.get('lng')}` : '')).split(',').map(Number);
  if (ll.length===2 && ll.every(Number.isFinite) && inBounds(ll)) out.at = { lat: ll[0], lng: ll[1] };
  out.z       = num(first('z','zoom'),11,18);
  out.br      = num(p.get('br'),0,360);  out.pt = num(p.get('pt'),0,60);
  for (const k of ['view','mode','level','layout','cam','panel']) { const s=(p.get(k)||'').toLowerCase(); if (ENUM[k].includes(s)) out[k]=s; }
  if (out.layout==='mobile') out.layout='compact'; if (out.layout==='desktop') out.layout='full';   // legacy
  const pl = (p.get('pl')||'').split(',').filter(id => facts.momentIds.has(id)).slice(0,24); if (pl.length) out.pl = pl;
  out.step    = num(p.get('step'),1,24);
  out.tick2   = num(p.get('tick2'),1,facts.maxTick);
  out.q       = (p.get('q')||'').slice(0,80) || undefined;
  out.ask     = (p.get('ask')||'').slice(0,200) || undefined;
  if (out.tick != null && out.dv !== facts.dv) out.tick = migrateTick(out.tick, out.dv);         // event-identity migration
  return { state: out, isDeepLink: Object.keys(out).some(k => !['dv','src','mode','level','layout','view'].includes(k)), warn };
}
```

Rules: unknown parameters are ignored; invalid values are dropped with one `console.info` in dev and a `deep_link_error` metric (no value logged); `tick` outranks `day`; `v` sets `tick` only if absent; `unit` not in the animated set still opens the Unit page (profile) and shows "This regiment is not animated on the map"; precedence is canonical > alias.

**5.6.4 Serialise (minimal and stable).** `serializeState(store, {scope})` with `scope` in `moment | view | playlist`. Omit defaults; fixed key order (`tick, v, unit, follow, cam, at, z, br, pt, panel, pl, step, mode, level, dv`) so identical states give identical URLs (cacheable, diff-able); lat/lng 4 dp, zoom 1 dp; typical share URL about 55-90 characters:
`https://gettysburginteractivemap.com/?tick=551&v=V-016&at=39.8104,-77.2358&z=16.4&dv=1`. `mode` is included only if not `explore`. `src` is appended by the share sheet only for metrics (channel), not by hand.

**5.6.5 History semantics.** `pushState` for discrete navigation (jump to moment or day, select a unit, open or close a panel, change view); `replaceState` for continuous changes (scrub end, pause, move end); **no URL updates while playing** (2 ticks/s would churn history and cost frames); "Copy link" recomputes from the store at click time. Back returns to the previous discrete state; `popstate` re-applies state without re-running the intro or the entry flow.

**5.6.6 Boot order.** `parseState` runs before any UI is drawn and before the intro decision: (1) resolve `layout`, `view`, `mode`, reduced motion, data-saver; (2) if a deep link: skip intro, welcome and resume banner; await `ensureDay(dayOf(tick))` (`app-bugs-06`), then apply `tick`, `unit`, `v`, `panel`, `follow`, then `camera.frame()` unless `at` is given (`app-bugs-21`); (3) announce through the polite live region "Opened Pickett's Charge" and show a dismissible **"Shared moment"** chip with [Explore from here] and [Start from the beginning]; (4) otherwise resume or first-run (sections 5.9, 5.12).

**5.6.7 Data-version stamp `dv` (new; prevents silent link rot).** The tick-to-clock calibration is known-wrong (C3/C4) and will change. If the fix re-times frames (not merely relabels them), every previously shared URL and every localStorage bookmark (`gettysburg_bookmarks` stores ticks, `pretty:97821-97852`) would point at a different event. So: assign each chronology event and vignette a permanent id once, write `dv` into every URL and bookmark, and keep `data/tick-migrations.json` mapping `(dv, tick)` to the current tick by event identity (identity function when only labels change). Cost: one small JSON and one function; benefit: links made today survive the time fix. Owner decision needed on the retime approach (time specialist).

**5.6.8 Legacy producers to repoint (all through one helper `mapLink({tick, unit, v, at, z, panel})`, as proposed in `pagesB` `js/links.js`).**

| Producer | Today | New |
|---|---|---|
| `documentary.html:92`, `education.html:81`, `historian.html:110`, `search.html:127` | `/index.html?tick=..&vignette=..` or `/?tick=..&vignette=..` | `/?v=V-016` (tick derived) |
| `embed.html:60` | `https://.../index.html?tick=..&vignette=..` | `https://.../?v=V-016&src=embed` |
| `turning-points.html:118` | `/?tick=${p.tick}` (6 of 9 anchors wrong, Appendix A) | `/?v=<moment id>` after `moments.json` |
| `search.html:114`, `regiment.html:247` | `/index.html?unit=..`, `/?unit=..&tick=..` | `/?unit=U-24MI` |
| `search.html:139` | `/index.html?lat=..&lng=..` | `/?at=39.8183,-77.2258&z=15.5` |
| app `$k` (`pretty:97821`), Follow share (`pretty:101225`) | `?t=&u=&z=&ll=`, `?ancestor=` | serializer above; still parse `t,u,z,ll,ancestor` |
| `/index.html` (86 views in 30 days) | serves the map | `301 / ` preserving the query (Netlify redirect; verify it keeps the query string) |

**5.6.9 Content permalinks vs view permalinks.** A **view permalink** (`/?v=V-016&...`) restores app state; it is not an SEO page (canonical `/`). A **content permalink** is a static page with its own title, description, canonical and `og:image`, for social cards and search: `/moments/<slug>/` (24 now), `/units/<slug>/` (467), `/places/<slug>/` (30), `/stops/<n>/` (16), generated from the same JSON at deploy time. Each shows the summary, sources, a large "Watch it on the map" button (view permalink) and "Ask about this". Because all pages share one `og:image` today (UXF-27), even a template-based card (title on brand background with place and day) is a large improvement; real map-crop cards can follow. Owner: `seo` specialist for generation; requirement here: every "Share" produces a URL whose preview says what it is.

**5.6.10 Share sheet (component spec).** Opens from header **Share** (desktop), from the Tools sheet, and from a share button on every Story and Unit card (labelled, 44 px).

| Element | Behaviour |
|---|---|
| Title and preview | "Share this moment": moment name, day and place; preview of the unfurl card (title, description, image) |
| Scope switch | "Just this moment" (default; `v` or `tick`+`unit`) / "My exact view" (adds `at`, `z`, `panel`) / "Playlist" (when `pl` is active) |
| **Copy link** | `navigator.clipboard.writeText`; on success announce "Link copied" (polite live region) and show inline toast; on failure show a read-only input pre-selected, **never `window.prompt`** (`pretty:97932`) |
| **Share...** | `navigator.share({title, text, url})` when `navigator.canShare`; hidden otherwise |
| QR code | Client-side generated (inline SVG, error correction M, minimum 200 px); "Scan to open on your phone"; "Save image" for slides (classroom, on-site) |
| Embed | iframe snippet for `embed.html?v=..&src=embed` with size options; live preview; the page itself must be framable (`app-bugs`/`infra` X4 hygiene) |
| Image card | Download 1200 x 630 PNG (map canvas plus caption, Mapbox attribution kept visible in the image); needs `preserveDrawingBuffer` or a render-then-`toBlob` sequence (risk: verify on iOS) |
| Print | Opens the print view of the Unit or Story (`?print=1`) |
| Report | "Report a problem with this moment" (section 8, `mailto:` with the permalink and app version prefilled) |

Recipient experience: lands on the exact state in <= 3 s after app-ready (target), sees the "Shared moment" chip, the map framed on the action, the story card open, no gates.

---

### 5.7 Unified search and command palette (`Ctrl/⌘+K`)

**Purpose.** One entry replacing the `S` panel, the "Find Unit / Location" button (same panel, `pretty:113214`), the Search Everything page, the per-page regiment pickers' search logic, and the Historian's search-like entry, and adding commands. It also becomes the fastest route to "Pickett's Charge" (J3) and the place to hand a failed search to the Historian.

**Corpora and counts** (measured from the deployed data [C]): 467 units (regiments and batteries) plus 135 brigade/division/corps nodes; about 407 commander names; 24 moments (vignettes) and 137 chronology events; 30 places; 512 monuments and 16 tour stops (now inside the JS bundle: `pretty:104440`, `:104096`; move to JSON); about 25 commands; Help topics. A prototype index of 1,086 entries (units, moments, events, places, 428 monuments) is **184.6 KB raw / 31.6 KB gzip** [C, `index_size.py`]; the full corpus is roughly 225 KB raw / 40 KB gzip. That is small enough to load on first focus (or at idle after app-ready) and cache in the service worker, and to search on the main thread in well under a frame.

**Entry points.** `Ctrl/⌘+K` and `/` (when focus is not in a field); header search field (click or tap); `S` retained as a documented alias opening the palette scoped to Units; mobile: search icon in the compact header opens a full-screen sheet. Never auto-focused on page load; no autofocus on touch devices (fixes `search.html:54` `autofocus`).

**Result types and primary action.**

| Type | Example query | Row | Enter | Secondary (row buttons and `Alt+Enter`) |
|---|---|---|---|---|
| Moment | `pickett`, `angle` | title, chapter, day | Jump to it, frame, open its story | Share, Ask about this |
| Unit | `20th maine`, `24 mich` | designation, side badge, state | Select and frame on the map (on Battle) or open the Unit page (elsewhere) | Profile, Follow, Ask |
| Person | `chamberlain` | name, role, unit | Open the unit they commanded | Ask "Who was ...?" |
| Place | `devil's den` | name, elevation, days | Fly to place | Moments here, Nearby monuments |
| Monument or stop | `1st minnesota monument` | name, honors, side | Fly to it and open its card (stop: open the tour at that step) | Directions (on-site) |
| Command | `layers`, `go to day 3`, `share` | verb phrase and shortcut | Run it | none |
| Ask | any question, or no result | "Ask the Historian: '...'" | Open Ask prefilled (not sent) | none |

**Grammar (accelerators, all optional).** `>` commands; `@` units and people; `#` places and monuments; `?` force Ask; a date phrase ("july 2", "day 3") jumps to that day's dawn; a bare number with a hash ("#538") is hidden for power users (tick). Clock queries ("3:10 pm") are **disabled until the single canonical clock exists** (C3/C4) so the palette never hands out wrong times.

**Normaliser and aliases (the hard part).** `norm(s)`: lower-case; NFKD strip accents; replace `. , ' ’ " ( )` with spaces; collapse spaces. Ordinal words to digits ("twentieth" to "20th"); optional ordinal suffix ("20 maine" equals "20th maine"); state abbreviations both ways (Mich./MI/Michigan, Minn., Mass., N.Y., Penn./Pa./PA, Va.); arm words ignored when matching but shown in display (Inf., Infantry, Vols., Volunteer(s)); "Btty" and "Battery"; "Co. G" is recognised and dropped (companies are not indexed; the row says so); corps names as roman or word ("I Corps" equals "First Corps"). A curated **alias table** (owner and historian reviewed) covers places and events: Little Round Top (LRT), The Angle (High Water Mark; Copse of Trees is a nearby landmark, not identical), Devil's Den, Peach Orchard, Wheatfield, Culp's Hill, Cemetery Hill. Data fix found while sizing: the terrain entry "**Gulp's** Hill saddle" (`terrain.json`, `LOC-` entry with `day_relevance [2,3]`) looks like a typo of "Culp's"; a "culp" search would miss it [C].

**Ranking.** Field weights title > alias > secondary > body. Match classes in order: exact, prefix, word-prefix, substring, fuzzy (edit distance <= 1 for tokens of 5+ characters). Type priors adapt to context and query shape: digits plus an ordinal or a state name favours Units; a question word or trailing "?" puts **Ask** first; on Battle, moments and units rank above places; on Find, units first. Tie-breaks: significance (critical moments first), then natural order (numeric-aware), then recency from the resume store. Group results by type, show the top 5 per group and a "See all 23 units" row.

**States.** *Empty query*: recent items (up to 5), suggested queries ("20th Maine", "Pickett's Charge", "Devil's Den", "Who was Chamberlain?"), commands cheat-sheet. *Loading* (first open before the index arrives): the input is usable immediately and a 1-line "Loading records..." row appears if the wait exceeds 300 ms. *No results*: "No match for 'xyz'. Try fewer words. [Ask the Historian] [Browse the Order of Battle] [Send this so we can add it (optional)]". *Error* (index failed): fall back to the OOB list and say so.

**Accessibility contract.** ARIA 1.2 combobox: `role=combobox` input with `aria-controls`, `aria-expanded`, `aria-activedescendant`; `role=listbox` with `role=option` rows and `role=group` headings; result count and no-results in a `role=status` region ("7 results"); dialog semantics when it opens as an overlay (focus trap, Esc closes and returns focus to the invoker); keyboard: Up/Down move, Home/End, Enter primary, Alt+Enter secondary, Esc (clear text first, then close); scope chips are a `radiogroup` reachable by Tab; works with 200-400 % zoom and forced colors; touch rows >= 56 px; input font 16 px (prevents iOS zoom). Focus-not-obscured by the sticky header (`app-a11y-23`).

**Implementation.** Build `data/search-index.v1.json` at deploy time from the data files (single source of truth; regenerate on every data change; test asserts entry counts equal data counts); hand-rolled scorer (about 150 lines) plus the normaliser is preferred over a library because the corpus is tiny and normalisation is the hard part; if a library is chosen, pick an MIT-licensed one and verify its size at implementation time (no size claim is made here). Lazy-load on first focus or idle; cache in the service worker; scoring on the main thread (measure: p95 < 20 ms on a mid-range phone [E]); no Worker needed.

**Seed test set (golden queries; expand to 60).** `20th maine`, `20 maine`, `twentieth maine`: 20th Maine first. `24th mich.`, `24 michigan`: 24th Michigan first. `1st minn`: 1st Minnesota first. `chamberlain`: Person Chamberlain then 20th Maine. `little round top`: Place first, then moments 267 and 275. `pickett's charge`: moment or chapter at 538 first. `angle`, `high water mark`: The Angle. `culp`: Culp's Hill and the corrected "Culp's Hill saddle". `devils den`: Devil's Den (missing apostrophe). `why did lee attack the center?`: Ask row first. `garnett`: moment at 550. `july 3`: command "Go to July 3". `>layers`: command. `zzzz`: no-results state with Ask fallback. Each has an expected type and rank <= 3.

**Metrics hooks.** `palette_open(source)`, `palette_select(type, rank, scope, query_len)`, `palette_empty(query_len)`, `palette_to_ask` (no raw text; section 9.4).

---

### 5.8 Naming

| Current | Proposed | Reason |
|---|---|---|
| "Explore" (menu button and group) | Button: **Features** (index) or removed in favour of the five destinations; group names follow 5.4 | Collision (`site-nav.js:14,169`) |
| Extra Features | Features | "Extra" implies optional, but Ask and Find are core |
| Search Everything | Search | It is the search |
| Camera Modes | Camera | Two modes; name the outcome: "Follow the action" |
| What They Could See | Sightlines (lab) | It is an elevation-ranked line-of-sight, not a viewshed (its own text says so) |
| Documentary Mode | Documentary | "Mode" is filler; it will be a real documentary player |
| Immersive Mode | Sound | Says what it is |
| Living Ledger | The human cost | Plain; keep "Living Ledger" as subtitle |
| The Ground Remembers | Heat map | Plain label, poetic subtitle "Where the fighting kept returning" |
| NPS Auto Tour (map) | Guided battle tour | Not the NPS tour; avoids implied affiliation |
| Virtual Walkthrough | Battlefield tour | Matches Visit; "NPS Auto Tour stops" remains a sub-label for the 16 official stops |
| Watch Together | Watch Together | Keep; add "share a tour" subtitle |
| Cinematic Export | Make a video | Task name |
| Follow Your Ancestor | Follow a regiment | Object of the action |
| Find Your Ancestor's Regiment | Find a regiment | Works for research beyond ancestry |
| Unit Roster / Order of Battle | Order of Battle | One panel |
| Tick n/675 | Time and moment name ("Little Round Top") | Ticks are internal; tooltip may show "moment 267" |
| Toggle Units | Units (switch) | |
| Bookmarks | Saved moments | |
| "AI-style historian" | "answers from 1,000+ cited records" (numbers from `facts`) | Matches what it is |


### 5.9 Onboarding: a 20-second guided moment instead of gates

**What goes.** The React "fast-forward" splash (`tO`, `pretty:101471-101590`), the layout chooser (`dO`, `pretty:102752-102830`), the three-archetype onboarding modal and its 5-step modal tour (`xO`, `Gc`, `bO`, `pretty:111799-112021`), and the injected banner script (`index.html:355-396`). Their jobs are absorbed as follows: layout by detection and a Settings override; "what is this" by the guided moment; "what can I do" by the header, the palette and three one-time hints; the tour survives as an optional "Take the 60-second tour" in Help (coach marks, non-modal), as in `app-design-14`.

**Why one moment and not a tour.** A tour explains controls before the visitor has a reason to care. The product's value is seeing the battle move. So the first experience is 20 seconds of the product, with a caption, that ends with three real choices. The visitor has moved from "what is this" to "I want to keep watching" before any chrome is explained.

**The moment (default: the Pickett's Charge assault, ticks 535-556).** Chosen because it is the most recognised event, spans a clear arc in 21 ticks (about 10.5 s at 2 ticks/s), and has strong data: chronology events at ticks 538, 544, 549, 551 and 556 (`chronology_day3.json`). Data cost is tiny: the Day-3 slice for ticks 521-600 is 18 KB raw, 4 KB gzip [C]. The moment id is configuration (`moments.json` `intro: "V-016"` plus `intro_captions`), so the owner can swap it (for example to "The First Shot") without code. A/B test candidates: Pickett's Charge vs First Shot vs no intro.

| t (s) | Screen | Caption (draft; historian sign-off; **no clock text until C3/C4 is fixed**) | Controls |
|---|---|---|---|
| 0.0-1.5 | Map idle; camera flies to frame Seminary Ridge to the Angle; caption card appears (bottom-left desktop; above the transport on mobile) | Eyebrow "July 3, 1863". Title "Pickett's Charge". "About 12,500 Confederates cross a mile of open ground." | Skip (44 px), Pause |
| 1.5 | Playback starts at tick 535 (2 ticks/s) | (title stays) | same |
| 3.0 | tick 538 | "They step off Seminary Ridge, a mile-wide line." | same |
| 6.0 | tick 544 | "Union artillery tears at them; they reach the Emmitsburg Road." | same |
| 9.5 | tick 551 | "At the Angle they reach the stone wall; Armistead leads his men over it." | same |
| 12.0 | tick 556, playback pauses | "The assault collapses." | same |
| 12.0-20.0 | Hold; end card | "That was 21 of 675 moments." Buttons: **Watch the whole battle from dawn**, **Explore on my own**, **Ask a question** | three 44 px buttons; auto-collapses to a chip if ignored |

Captions are derived from the site's own chronology text (for example event 538 "approximately 12,500 men in a mile-wide front", 544 "reaches the Emmitsburg Road", 549 "reaches the stone wall at The Angle", 551 "ARMISTEAD LEADS MEN OVER THE WALL", 556 "assault collapses"; the 549 and 551 events are merged into one caption), shortened to <= 14 words each.

**Behaviour rules.**
- Non-modal; `role="region" aria-label="Guided moment"`; **no focus trap**; captions announced once each through a polite live region, at most one per 2.5 s (the schedule above gives 3.0, 2.5 and 2.5 s gaps); Esc or Skip ends it and sets `onboarding.status = "skipped"`.
- Any drag, pinch or scroll on the map means "I have control": playback pauses, the card collapses to a chip "Resume the 20-second intro / Dismiss".
- `prefers-reduced-motion`: no fly-in, no autoplay; show the five captions as steps with Next/Previous (jumps, no interpolation).
- Data-saver or slow network (`saveData`, effective type 2g/3g, or no map-ready in 6 s): skip and offer Lite mode (section 5.13).
- Deep link, classroom/present/on-site mode, or a return visit: never shown (resume or lesson bar instead).
- If the slice fails to load within 3 s: skip silently; no error UI.
- Replay: Help > "Replay the 20-second intro" (`?intro=1`). Persist `onboarding.status` in the prefs object (`app-design` 8.2 schema).

**Three one-time hints (cap: 3 ever, one per session, dismiss forgets).** (1) After 30 s of exploration: "Search or ask anything: press Ctrl+K" (desktop) or the search icon pulse (mobile); (2) first unit selected: highlight "Follow" and "Ask about this" on the unit card; (3) second session: a "New" dot on Share. No perpetual glow (the current `gtbg-pin-glow` animation runs forever, `site-nav.css:41,48`).

**Entry-specific behaviours.**

| Arrives via | Sees |
|---|---|
| `/` first visit | Poster, then the 20-second moment |
| `/` return visit | Resume (section 5.12) |
| Shared moment link | "Shared moment" chip, no intro |
| Historian/Search citation | Same as shared moment |
| Classroom link | Lesson bar (step 1 of N), no intro |
| Sub-page directly (for example `/historian`) | The page, header with Battle/Stories/Find/Ask/Visit and a "Watch the battle" call to action |

**Metrics** (section 9): `intro_shown`, `intro_skip(at_s)`, `intro_complete`, `intro_choice`, `first_play_ms`, engaged-session rate for intro vs no-intro. Detecting a 10-point lift on a 40 % baseline (alpha 0.05, power 0.8) needs about 384 first-time visitors per arm [C, standard two-proportion formula]. The site has about 51 unique visitors a day in total (1,529 in 30 days) and I assume roughly 35 of them are first-time **[E]**, so two arms take about 22 days; run the test for a month or accept a larger minimum detectable effect.

**Content dependency.** `moments.json` intro captions and `chapter` names (owner and a historian reviewer); a still poster image of the final frame (WebP, target < 40 KB) for the LCP and for Lite mode.

---

### 5.10 Progressive disclosure

**Tiers.**

| Tier | Purpose | Contents (desktop and mobile) | Visible |
|---|---|---|---|
| **0 Essential (<= 8 controls)** | Watch and orient | Header: brand, date and moment chip, Search/Ask field, Share, Menu. Timeline: Play/Pause, previous/next moment, scrubber with chapters, speed (one control), day tabs | Always |
| **1 On demand (one tap)** | Shape the view | Layers, Filter, Key, Overview map, Saved moments, Measure, Order of Battle, Units switch | In Tools rail (desktop) or Tools sheet (mobile); closed by default |
| **2 Contextual** | Act on what you selected | Unit card: Profile, Follow, Ask, Share. Story card: Watch, Read more, Ask, Share | Appear with the selection; never on load |
| **3 Expert** | Power | Palette commands and grammar, shortcuts, Compare/Heat/What-if views, Make a video, Watch Together, `?debug` | Behind menus, shortcuts and More |

**Default state on first load (each is a rule; tests in section 11).** Key: collapsed to a "Key" button. Overview map: off below 1200 px. Story and event cards: none open on load; during playback a story appears as a compact, dismissible card only when the user has not opted out, at most one card at a time, story preferred over event (`app-bugs-10`). Toasts: at most 3, auto-dismiss after 4.5 s with pause on hover and focus, cleared on jump or Esc. Locations: on. Monuments: off below zoom 14. Trails: on. HUD: clock chip only (fps hidden). Filters, Measure, OOB: off.

**Ladder (what the product suggests next, at most one suggestion per session).** After a visitor selects 3 units: "Follow a regiment through all three days". After 3 sessions: "Tip: press Ctrl+K". After the fifth Documentary moment read: "See it move: open Battle at this moment". The ladder is data-driven from local counters and never sends anything to a server.

**By mode.** Classroom: Tier 0 plus lesson bar, Search, Ask off by default (see 6.6), third-party embeds off. Present: Tier 0 hidden except clock and moment name. On-site: Tier 0 plus Near me; Layers reduced to Roads, Monuments and Places. Explore: all tiers.

**Reduce cognitive load by naming, not hiding.** Tier 1 tools carry labels at >= 1280 px; on compact they are labelled in the sheet. Tooltips are keyboard- and touch-reachable (`app-design-18`).

---

### 5.11 Empty, loading, error and offline states (catalog)

One component (`StateCard`: icon, title, body, actions; `variant = loading | empty | error | offline | permission`), one voice (short, calm, tells the visitor what to do next), status announced with `role="status"` (polite) and only blocking failures with `role="alert"`; no focus stealing; Retry moves focus to the region heading after it succeeds. Copy is draft in the museum voice; the owner edits.

| # | Surface | State | Copy (draft) | Primary / secondary action |
|---|---|---|---|---|
| 1 | Boot | Loading | "Loading the battlefield..." with stage text Map, Units, Story; determinate | after 4 s: "Still loading. Slow connection? [Read the text version]" |
| 2 | Boot | Unsupported or WebGL failure | "The interactive map can't start on this device. You can still read the battle as a timeline." | [Open the text version] / [Try again] |
| 3 | Map | Day data loading after a jump | "Loading July 3..." skeleton over the map; scrub disabled up to 2 s | none |
| 4 | Map | Day data failed | "We couldn't load July 3. Your place is saved." | [Retry] (not cached as loaded, `app-bugs-06`) |
| 5 | Palette | Empty query | recents, suggestions, commands | Enter to open |
| 6 | Palette | No results | "No match for 'xyz'. Try fewer words." | [Ask the Historian] [Browse the Order of Battle] [Send this so we can add it (optional)] |
| 7 | Ask | Loading | "Searching 1,000+ records..." | none |
| 8 | Ask | No answer | "I couldn't find that in the records I have (units, moments, events, places)." | [Try these questions] [Send this question (optional)] |
| 9 | Follow | Before selection | "Pick a regiment. Try 24th Michigan or 1st Minnesota." | [Browse by state] |
| 10 | Follow / Unit | Recorded but not animated | "This regiment is in the Order of Battle but is not animated on the map." | [Open its profile] |
| 11 | Unit card | Not on the field at this moment | "Not on the field at this moment." | [Jump to when it first appears] |
| 12 | Filters | Everything filtered out | "No units match these filters (0 of 467)." | [Reset filters] |
| 13 | Saved moments | Empty | "No saved moments yet. Save one to find it again, or share it." | [Save this moment] |
| 14 | Find a regiment | Before search (fixes S1) | Featured regiments, "Browse by state", the three-step explainer | [Try 24th Michigan] |
| 15 | Living Ledger / The human cost | Start of playback | "0 casualties recorded yet. The count builds as the battle unfolds." | [Play] |
| 16 | Dashboard | Chart or data error | "The chart couldn't load. The table below has the same numbers." | [Retry] |
| 17 | Any sub-page | Fetch failed | "We couldn't load this page's records." | [Retry] [Open the text version] |
| 18 | Any | Offline | "You're offline. Saved battlefield data is available; the map may not load." | [Open saved data] |
| 19 | Visit / AR | Location denied | "Location is off. You can still browse the stops." | [How to turn it on] [Browse stops] |
| 20 | AR | Camera denied | "Camera access is off. Radar shows the same places without the camera." | [Open Radar] |
| 21 | AR / Near me | No compass sensor | "This device can't tell which way it's facing. Places are listed by distance." | none |
| 22 | Near me | Far from the park | "You look to be about 12 miles from the battlefield. Showing the tour list." | [Browse stops] |
| 23 | Deep link | Invalid | chip: "That link didn't include a valid moment. Here is the battle from the start." | [Dismiss] |
| 24 | Slow network | Long wait | "This is taking a while (about 1.6 MB)." | [Keep waiting] [Read the text version] |
| 25 | Share | Clipboard blocked | read-only field with the link preselected | [Copy] |
| 26 | Lesson | Finished | "End of lesson." | [Replay] [Next lesson] [Back to the map] |
| 27 | Story mode | Quiet stretch skipped | "Quiet stretch: skipped 125 moments." | [Jump back] |

---

### 5.12 Resume where you left off

**Saved (local only).** `gb.v2.prefs.resume = { tick, unit, at, z, panel, plStep, dv, savedAt }`, written on pause, scrub end, selection change and `pagehide` (debounced; try/catch; memory fallback when storage is blocked). A separate `recent` array (last 5 moments and units) feeds the palette's empty state. `sessionStorage` also keeps `lastView` so **"Back to the battle" from any sub-page is a real link** to the same state (replaces `history.back()`, fixes UXF-15).

**When applied.** Return visit and no deep link and no `?mode`: if last saved <= 7 days ago, **auto-resume** with a persistent-for-10-seconds chip "Back where you left off: Day 2, Little Round Top. [Start over]"; if 8-30 days, show the same as a banner asking [Resume] [Start over]; if > 30 days or cleared, start fresh with the guided moment only if it was never seen. Rationale: the return audience is the majority (Direct 92 %); auto-resume with a one-tap undo costs zero clicks and respects the visitor who wants to start over.

**Controls.** Help > "Reset saved data" (clears resume, recents, prefs, saved moments after a confirm); the privacy page lists the keys (`X5`). Layout and mode preferences use the same object.

---

### 5.13 The text and Lite route (screen reader, slow network, no WebGL, crawlers)

**One route serves four needs.** A screen-reader or keyboard-only visitor, a phone on a slow link, a device without WebGL, and a crawler all want the same thing: the story and the data without a canvas.

**Entry points.** (1) First focusable element on every page: skip link "Read the battle as text"; (2) header "Text version" item (More menu) and `?view=text`; (3) automatic when `navigator.connection.saveData` is true or `effectiveType` is `slow-2g/2g/3g` (Chromium only) **or**, on every browser, when map-ready has not fired after 6 s ("Still loading. [Read the text version]"); (4) WebGL failure (state 2 above); (5) `<noscript>`.

**Content: the Battle Chronicle** (a static, indexable page, generated from the JSON): chapters (section 6.2) with their moments; for each moment: title, day, place, 1-2 sentence summary, "Read more", "Open on the map" (permalink), "Ask about this"; filter by day; search within; each moment can expand "Units on the field at this moment" (the a11y **Data View**, `app-a11y-08`) and events feed (`app-a11y-12`). Target weight < 100 KB, no map assets, no Mapbox, works without JS for the reading path. It replaces the crawler-only `#seo-content` block (`index.html:717-741`, E4) with real, visible content, which also answers the "adjacent to cloaking" concern in the audit.

**Upgrade path.** A persistent button "Load the interactive map (about 1.6 MB)" swaps in the map in place, keeping the scroll position as the current moment (state via the same URL contract).

**Acceptance.** With JS disabled the chronicle reads end to end; with a screen reader, the first Tab stop is the skip link and the chronicle can be traversed by headings (H1 page, H2 chapter, H3 moment); Lighthouse mobile performance and accessibility >= 98 on the chronicle; LCP <= 1.5 s on Fast 4G; bytes < 100 KB.


---

## 6. Content, playback and context modes

### 6.1 The Moment model (one list to replace six)

```jsonc
// data/moments.json  (single source; ids are permanent; everything else is generated from it; values illustrative)
{
  "version": 1, "dv": 1,
  "chapters": [ { "id": "c11", "day": 3, "title": "Pickett's Charge and the Angle", "tick": [538, 556], "color": "day3" } ],
  "moments": [
    { "id": "V-016", "kind": "vignette",                       // vignette | event | debate | stop | epilogue
      "title": "Armistead at The Angle", "tick": 551, "chapter": "c11",
      "place": { "name": "The Angle, Cemetery Ridge", "lat": 39.8128, "lng": -77.2357, "zoom": 16.4 },
      "units": ["<oob-id>", "<oob-id>"],                        // ids validated against the OOB (illustrative)
      "summary": "...",                                        // <= 60 words, grade <= 8 (Student edition)
      "story": "...",                                          // existing full_script
      "marker": true,                                          // appears on the timeline
      "sources": [ { "cite": "Official Records ...", "loc": "..." } ],
      "intro": false } ],
  "playlists": [
    { "id": "documentary", "title": "The battle in 24 moments", "moments": ["V-001", "V-002", "..."] },
    { "id": "debates", "title": "Nine turning points", "moments": ["M-101", "..."], "fields": ["debate"] },
    { "id": "intro-tour", "title": "60-second tour", "moments": ["V-001", "V-002", "V-009", "V-016"] },
    { "id": "lesson-day2-15", "title": "Day 2 in 15 minutes", "audience": "teacher", "moments": ["V-008", "V-009", "V-010", "V-012"],
      "focus": ["Why did both sides want Little Round Top?"] } ]
}
```

The other lists become generated views of this file: the timeline's markers and chapter bands, Documentary (playlist `documentary`, tie-break by id: V-019 and V-023 share tick 556, `pagesB` noted), Turning Points (`debates`, each anchored to a moment id and *validated* against the chronology), Students (per-day playlists with `student_summary`), the onboarding tour, walkthrough stops (a stop may reference a moment), bookmarks (user playlists that store moment id or tick with `dv`), Watch Together stops, Compare/Sandbox/Export defaults, and the palette's Moment results. `E-D<day>-<tick>` ids are derived for the 137 chronology events so a link can point at one.

**Lint gates (run in CI; `qa-ci` specialist).** ids unique; `tick` within its chapter range; each debate or vignette has a chronology event within +-3 ticks whose text contains one of its curated keywords (this fails 6 of the 9 current Turning Points anchors, Appendix A); `units` exist in the OOB; student `summary` Flesch-Kincaid <= 8.0 (real tool, not my heuristic); `sources` non-empty; no clock text is stored (clock is computed by the single formatter).

### 6.2 Chapters (draft, for owner and historian review)

Chapters give the timeline names ("where am I?"), give mobile a chip row, give Documentary and Students their headings and give screen-reader users landmarks. Boundaries below are derived only from the data's own ticks [C, `chapters.py`]; names are drafts; **no clock times are shown** until the single formatter exists.

| # | Day | Chapter (draft) | Ticks (count) | Vignettes | Chronology events (critical/high/other) | Longest silent run inside |
|---|---|---|---|---|---|---|
| 1 | 1 | First contact | 1-27 (27) | 1 (V-001) | 12 (0/9/3) | 3 |
| 2 | 1 | Reynolds and the Iron Brigade | 28-51 (24) | 3 (V-002, 003, 004) | 13 (5/6/2) | 5 |
| 3 | 1 | Oak Ridge and Barlow's Knoll | 52-100 (49) | 2 (V-005, 006) | 17 (7/6/4) | 9 |
| **4** | 1 | **The collapse and the retreat through town** | **101-225 (125)** | **0** | **0** | **125** |
| 5 | 2 | Sickles moves forward | 226-255 (30) | 2 (V-007, 008) | 7 (1/5/1) | 4 |
| 6 | 2 | Little Round Top | 256-277 (22) | 2 (V-009, 010) | 12 (7/5/0) | 2 |
| 7 | 2 | Wheatfield, Peach Orchard and Trostle Farm | 278-314 (37) | 2 (V-011, 012) | 16 (8/8/0) | 5 |
| 8 | 2 | Culp's Hill and Cemetery Hill at dusk | 315-450 (136) | 2 (V-013, 014) | 14 (3/8/3) | 19 |
| 9 | 3 | Culp's Hill retaken | 451-515 (65) | 1 (V-022) | 11 (0/8/3) | 14 |
| 10 | 3 | The cannonade | 516-537 (22) | 2 (V-015, 017) | 8 (3/4/1) | 4 |
| 11 | 3 | Pickett's Charge and the Angle | 538-556 (19) | 4 (V-016, 018, 019, 023) | 15 (9/6/0) | 1 |
| 12 | 3 | The cavalry fights | 557-575 (19) | 2 (V-020, 021) | 7 (1/6/0) | 3 |
| 13 | 3 | The long afternoon | 576-675 (100) | 1 (V-024) | 5 (1/2/2) | 29 |

Rendering: desktop, chapter bands on the scrubber with labels >= 12 px (collapse to alternating labels under 900 px); mobile, a horizontally scrollable chip row above the scrubber with the current chapter centred (chip = 44 px high). Next/Previous **moment** buttons move between `marker:true` moments.

### 6.3 Playback and Story mode

- **Two paces.** *Continuous* (today's behaviour) and *Story* (recommended default for first-time visitors and for Classroom): 1x speed (2 ticks/s, `app-bugs-33`), auto-pause at each `critical` event (45 of 137) for up to 4 s or until the visitor presses Space, show its card, then continue; **skip quiet stretches** (a run of >= 20 event-free ticks) at 8x with a non-blocking note ("Quiet stretch: skipped 125 moments. Jump back"). Rough duration: 675 ticks / 2 per second = 337 s (5.6 min); 45 pauses x 4 s adds 180 s; total about 8.6 min minus skipped stretches, i.e. "the whole battle in about 9 minutes" **[C arithmetic, E for the pause length]**. Any manual scrub cancels auto-pause until the next Play. Pace is a two-option segmented control in the transport (not a hidden setting).
- **Transport.** Play/Pause; Previous and Next **moment** (new); fine step +-1 tick via the `,` and `.` keys and long-press on mobile; speed as one control with labelled ladder ("1x = 10 battle minutes per second", `app-bugs-33`); day tabs; scrubber with `aria-valuetext` "Day 3, Pickett's Charge" (`app-a11y-07`).
- **Time display.** Clock chip "July 3 - Pickett's Charge" from the canonical clock and moment name; "Tick 538" only in a tooltip and the debug overlay (fixes UXF-18).
- **Keys (proposal; reconcile in the single shortcut registry, `app-bugs-09`).** `]` next moment, `[` previous moment (bracket keys are conventional and unused today), `,` and `.` step, `Shift+Left/Right` +-1 hour (existing). `1/2/3` become "jump to that day and frame it" (`app-bugs-21`), not "set tick".
- **Timeline markers.** Real `button`s with a 24 px minimum hit area (44 px on touch), `aria-label` the moment name, tooltip on hover and focus (`app-design-18`); the 8 current markers become the `marker:true` subset (about 12).

### 6.4 Ask the Historian: integration contract (retrieval design belongs to the historian specialist)

**Entry points.** Header field ("Search or ask..."); the **Ask** destination; **"Ask about this"** on every Unit, Story and Moment card (prefills the question with context: unit id, tick, moment); palette `Shift+Enter` and the auto Ask row on question-shaped queries or no results; every static permalink page.

**Interface (stable so retrieval can evolve from static keyword to hybrid to LLM without UI changes).**

```js
ask({ q, context: { tick, unit, v, at, level } })
  -> { mode: 'static' | 'retrieval' | 'llm',
       answer: { summary: string, bullets?: string[] },              // 2-3 sentences; never the raw full_script dump
       citations: [ { n: 1, id: 'V-016', type: 'moment', label: 'Armistead at The Angle', href: '/?v=V-016' } ],
       coverage: { records: 6, types: ['moment','event','unit'], note?: 'Weather is not covered.' },
       followups: string[],                                          // 2-3 chips
       confidence: 'covered' | 'partial' | 'none' }
```

**Display.** Answer card: summary; numbered citation chips that open working permalinks (fixing the dead "See this moment on the map" links, UXF-24); a coverage line ("Based on 6 records"); follow-up chips; "Show sources (6)"; "Was this helpful?" (local, optional) and "Report an error" (mailto with the question and permalink). Newest answer aligns to the top of the viewport; the input never covers content (`historian.html:35,174` today); the last 10 exchanges persist in `sessionStorage` so Back does not lose the thread. On the map the Ask panel is a **right-dock drawer** so the map stays visible.

**Honesty rules.** The label says what it is ("Answers from the site's own records" for static/retrieval; "AI summary of these sources" if an LLM is ever used, with sources listed first). No unsourced sentences. `confidence: none` says so and offers alternatives. The out-of-scope response ("That's outside this site's records") is a designed state (catalog row 8). In Classroom mode any external-model path is **off by default** and disclosed if enabled (query text would leave the browser; privacy page must say so, `X5`).

**Closing the loop on database growth.** An opt-in **"Send this question"** button on no-answer states (a Netlify Form or `mailto:`; the visitor sees exactly what is sent: the question text and nothing else) creates a reviewable log of unanswered questions. The owner reviews the top 20 a month; those are the highest-value records to add to the expanded databases (section 9.4).

**Quick correctness fix now (independent, finding 19):** chronology answers print `undefined` (UXF-43).

### 6.5 Quiet stretches ("dead air") analysis

[C] from `chronology_day*.json` and `vignettes_part*.json`, ticks not times:

- **Day 1 ticks 101-225 (125 ticks) have no chronology event and no vignette**: 56 % of Day 1 and 18.5 % of the whole battle are silent. The last Day-1 event is at tick 100; the next event is tick 226 (Day 2's opening). That silence covers the Union collapse and retreat through the town and the rally on Cemetery Hill, the most consequential part of Day 1 (Turning Points has an anchor at tick 175 for Ewell's decision but no event or vignette exists there; UXF-19/21).
- Gaps between vignette triggers (ignoring chronology events): 57 to 240 (183 ticks), 326 to 460 (134), 568 to 675 (107).
- Day 3 chapter 13 (ticks 576-675, 100 ticks) has 5 events and a 29-tick silent run; Day 2 chapter 8 (315-450) has a 19-tick run.
- At the current 1x (2 ticks/s) the Day-1 silence is about 63 s of playback with no card or narration; at 8x about 8 s.

**Remedies (in priority order).** (1) **Author 5-8 moments for chapter 4** (topics implied by the site's own Turning Points text: the afternoon assaults on McPherson's and Seminary Ridge, the collapse north of town, the retreat through the streets, the rally on Cemetery Hill, Ewell's "if practicable" decision); historian-reviewed with sources. (2) Story mode skip (6.3) as the interim. (3) Timeline shows "no recorded events in this stretch" honestly (no fake fill). (4) Chronicle text (5.13) states the gap. (5) Later: machine-derived "what changed" digests from placement data (counts of units advancing or retreating per window), clearly labelled as derived, only after accuracy review.

### 6.6 Classroom and Present mode

**Who and what.** P2 (teacher) and P1 (student). Requirement: a teacher can prepare a 10-minute segment in <= 10 minutes, project it legibly, put 30 students on the same moment in <= 60 s, hand out a printable, and never worry about accounts or data. No accounts, no PII, no third-party exposure by default.

**Entry.** More > **For teachers** (`/teach/`); `?mode=classroom`; class links; a prompt after the third lesson-link open ("Use Classroom mode?").

**Teach hub (`/teach/`).**

| Block | Content |
|---|---|
| Start in 60 seconds | 3 steps: choose a lesson, project it (Present), share the link or QR |
| Lessons (3 to start) | e.g. "Day 1 in 15 minutes", "Little Round Top: two decisions", "Pickett's Charge: what happened at the wall"; each = playlist + focus questions + 6-10 vocabulary terms + printable handout + link + QR + short alias `/l/<slug>` (Netlify redirect to the long URL; static lessons only) |
| Build your own | Pick moments, reorder, add notes; generates `?mode=classroom&pl=..&step=1` plus notes in the **fragment** (`#n=`) so notes never reach server logs |
| Present | Launches Present mode on the chosen lesson |
| Print kit | One-page regiment reports, the key, a blank timeline (print CSS; `app-design-29`) |
| Student edition | The reading-level switch (`level=student`; summaries <= grade 8) |
| Cite this site | Generated citation for the current moment (MLA, APA, Chicago templates; verify against current style guides at build) |
| Facts | "No accounts. No personal information collected. Works on Chromebooks. Third-party content is off in Classroom mode unless you turn it on." (matches `privacy.html` "Children's privacy") |

**Classroom mode UI.** Type scale +12 %, 48 px targets (`app-design` density option), light theme available, lesson bar ("Lesson: Day 2 in 15 minutes - Step 2 of 6 - Little Round Top [Previous] [Next] [Focus question]"), each step auto-frames the map, optional self-check (3 questions per step, revealed on tap, never stored or sent); students can break out and explore, and "Back to step 2" returns. Third-party embeds (Street View, NPS video, PeerJS live sync, Google Maps hand-off) are off by default; a teacher toggle enables them. Ask is available in records-only mode.

**Present mode (`?mode=present`).** UI scale 1.35x; Tier 1 hidden; clock and moment title large; captions >= 28 px; clicker keys: `PageDown`, `Right` next step or moment; `PageUp`, `Left` previous; `Space` play/pause; `B` dim map to refocus attention; `Q` show a QR code in the corner so students open the same moment; cursor hidden after 3 s idle; respects reduced motion.

**Live sync (optional, experimental).** Keep Watch Together for teacher-led sync, but replace typing tick numbers ("Tick (1-675)", `watch-together.html:79,172`) with "Add this moment" from the map, display the 5-letter code at projector size, and pilot on 2-3 school networks (WebRTC through a public broker may be blocked; **[E], not verified**). The reliable fallback is link plus QR.

**Load.** 30 students x 1.58 MB (Lighthouse transfer) on shared Wi-Fi is a real burst; "Prepare for class" warms the cache on the teacher's device; the performance plan (`bundle-anatomy`) and Lite mode are the real fix.

**Calendar.** Fall term is now; Remembrance Day (November 19) is seven weeks away; a first classroom kit (3 lessons, Present, print) is a realistic target for early November **[E]**.

### 6.7 On-site mode

**Who.** P4 on a phone in portrait, one-handed, outdoors, possibly weak signal **[E, not measured]**. **Entry.** Visit tab; `?mode=onsite`; optional prompt "Are you at the battlefield?" only when location permission is already granted and the position is inside a padded bounding box of the POI set (POI extents: monuments lat 39.777-39.853, lng -77.286 to -77.163, about 8.5 x 10.5 km [C, 442 of 512 monuments parsed]; compute from data at build, pad by 2 km). Location is **never requested on page load**.

**Near me (the home of On-site mode).** After an explicit "Use my location" tap: nearest 5 of 528 POIs (16 tour stops, 512 monuments; plus 30 places) with distance (feet/miles for US locales) and, when a heading is available, a compass arrow; "See 20 more". Tap a POI: card with name, side badge, **What happened here** (2-3 sentences: the first paragraph of the stop's `history[]` or the linked moment's summary), **Watch it happen** (jump the map to that moment and frame the place), Street View, Directions (hand-off to the system maps app; disclosed), Save, Share. Location `watchPosition` runs only while Near me or AR is visible; low accuracy by default and high accuracy only for "follow me" and AR; updates throttled to one per 2 s; stopped when the tab is hidden.

**Map.** "You are here" dot with an accuracy ring, a recenter button and follow mode; Battery saver chip (30 fps cap, trails and glow off; pause when hidden).

**AR (same POI list; camera optional).** Redesigned permission sequence: a pre-prompt with three rows (Location, Motion, Camera), each with a plain reason and live status (as now, `ar.html:59-67`, which is good); request **Motion first, directly in the click handler** (iOS requires `DeviceOrientationEvent.requestPermission()` inside the user gesture; today it runs after two awaits, `ar.html:154-186`), then Location, then Camera last, with graceful degradation: camera denied gives **Radar** (2-D, north-up or heading-up, same POIs); motion denied gives a distance-sorted list. Heading: `deviceorientationabsolute` where available, `webkitCompassHeading` on iOS, low-pass smoothing, "move your phone in a figure eight" prompt when accuracy is low; render with persistent elements and `transform` at <= 30 fps (today `overlay.innerHTML = ''` on every orientation event, `ar.html:120,151`); declutter to at most 5 labels; tapping a label opens the POI card; HUD text >= 14 px; Exit and controls >= 44 px.

**Offline pack.** "Save the battlefield for offline (about N MB)" stores the app shell, data JSON, POI JSON, the search index and a park-bounding-box map. The service worker must be rewritten (`bundle-anatomy-03`): HTML is never cached today (`sw.js:72-75`) and cross-origin tiles are skipped (`sw.js:38`). **Tile caching needs a licence check**: verify Mapbox's terms before caching its tiles; the safe alternative is a self-hosted vector or raster extract for the park (map-engine decision, `bundle-anatomy-16`). Show status ("Offline ready, 12.4 MB"), request persistent storage (`navigator.storage.persist()`), report `navigator.storage.estimate()`, and provide an update and remove control. Budget: shell about 0.6 MB (brotli), data about 0.2 MB, index about 0.04 MB, tiles <= 25 MB **[E]**.

**Other.** Remove the landscape lock (`manifest.json:9`); "Outdoor" display option (larger type, 48 px targets, high-contrast light chrome); one-time safety line ("Watch your step and stay on paths. Please don't climb on monuments or cannons. Follow park signs and rules."); a visible non-affiliation notice and a link to the park's official page (verify the URL at implementation). **Calendar:** the anniversary (July 1-3) is nine months away; aim to be field-tested by early June 2027 **[E]**.


---

## 7. Wireframes (structure and behaviour; not visual design)

Conventions: `[Button]`, `(radio)`, `▾` menu, `‹ ›` scroll, `▌` current/active, `░` map area. Sizes in CSS px. Visual tokens, type and colour come from `app-design`; every interactive element is >= 44 px on touch (>= 32 px with 24 px minimum spacing on desktop), text >= 12 px. Placeholder names and counts are illustrative and must be generated from data (`facts`).

### W1. Battle, desktop (>= 1280 px)

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◈ Gettysburg  Battle Stories Find Ask Visit │ Jul 3 · Pickett's Charge │ 🔍 Search or ask… ⌘K │ Share ▾ │ ⋯ │ 56
├────────┬──────────────────────────────────────────────────────────────────────────┬───────────┤
│ Layers │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ Story  ✕ │
│ Filter │░░░░░░░░░░░░░░░░░░░░░░░░░ M A P (Mapbox canvas) ░░░░░░░░░░░░░░░░░░░░░░░░░░│ Armistead │
│ Key    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ at The    │
│ Measure│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ Angle     │
│ Saved  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ 2-3 line  │
│ Units ☑│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ summary   │
│  (rail │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ [Read more]│
│  56 px │░ [Key ▸]                                                  [Overview ▸]  ░│ [▶ Watch] │
│  icons;│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ [Ask][Share]│
│  labels│                                                                          │ dock 360 │
│  ≥1280)│                                                                          │           │
├────────┴──────────────────────────────────────────────────────────────────────────┴───────────┤
│ July 1 │ July 2 │▌July 3│  ▏ Culp's ▕▏Cannonade▕▏ Pickett's Charge & the Angle ▕▏Cavalry▕▏Afternoon▕   │ 96
│ [⏮][◀][▶ Play][▶][⏭] [◂ Prev moment][Next moment ▸]  Pace (Story) Continuous   1× ▾    ─────●────── │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

Behaviour notes: header is the same component on every page (`aria-current` on the page's destination); left rail holds Tier-1 map tools only and is collapsible; **the right dock holds one card at a time** (story, unit, ask, layers, OOB); Key and Overview are collapsed FABs (`app-bugs-10`); the timeline shows chapter bands with names and `marker:true` moments as buttons; nothing floats above the header; no element above z `--z-sheet`. Below 1024 px the rail becomes icon-only and the dock becomes a bottom sheet.

### W2. Battle, phone (375 x 812, portrait)

```
┌─────────────────────────────┐
│ Jul 3 · Pickett's Ch…  🔍 Ask ⋯│ 48  (44 px targets; date/moment chip truncates first)
├─────────────────────────────┤
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░ M A P ░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░ ┌─────────────────────┐ ░░│
│░░ │ Armistead at The     │ ░░│  compact story card (peek);
│░░ │ Angle        [▶][⤴] │ ░░│  swipe up = full, swipe down = dismiss
│░░ └─────────────────────┘ ░░│
│░ [Key]          [◎]        ░│
├─────────────────────────────┤
│ ‹ Cannonade  ▌Pickett's Charge  Cavalry ›│ chapter chips, 44 px, current centred
│ [◀] [▶ Play] [▶]  1× ▾  Story ▾  [Next ▸]│ 44
│ ════════════●═══════════════│ scrubber 44 (real <input type=range>, aria-valuetext)
├─────────────────────────────┤
│ Battle Stories Find  Ask Visit│ 56 + safe-area-inset-bottom
└─────────────────────────────┘
```

Behaviour notes: **no row exceeds 375 px** (fixes C1: controls wrap or scroll, never centre-overflow); Tools sheet opens from `⋯` **above** the transport with a scrim (fixes C2); five tabs are real links; the same tool registry drives the sheet; the map keeps a 44 px Recenter button; landscape uses the compact layout with a right-hand sheet.

### W3. Command palette (desktop dialog; phone sheet)

```
┌───────────────────────────────────────────────────────────────┐        ┌───────────────────────────┐
│ 🔍  20th ma▏                                          Esc     │        │ ‹ Cancel     Search or ask │
│ (All) (Units) (Moments) (Places) (Ask)                        │        │ 🔍 20th ma▏                │ 16 px input
├───────────────────────────────────────────────────────────────┤        │ (All)(Units)(Moments)(Pl.)›│
│ UNITS                                                         │        ├───────────────────────────┤
│ ▌20th Maine Infantry       Union · Maine · Vincent's Bde      │        │ UNITS                      │
│    [Profile] [Follow] [Ask]                                   │        │ ▌20th Maine Infantry       │ 56 px rows
│  20th Massachusetts Infantry   Union · Massachusetts          │        │   Union · Maine            │
│ PEOPLE                                                        │        │  20th Massachusetts …      │
│  Joshua Chamberlain        Colonel, 20th Maine                │        │ PEOPLE                     │
│ MOMENTS                                                       │        │  Joshua Chamberlain        │
│  Chamberlain's Charge      Little Round Top · Day 2           │        │ MOMENTS                    │
│ ASK                                                           │        │  Chamberlain's Charge      │
│  Ask the Historian: "20th ma"                                 │        │ ASK                        │
├───────────────────────────────────────────────────────────────┤        │  Ask the Historian…        │
│ ↑↓ move  ↵ open  Alt+↵ profile  ⇧↵ ask  Esc close             │        └───────────────────────────┘
└───────────────────────────────────────────────────────────────┘
```
Empty query: recents (up to 5), suggestions, commands. No-results row offers Ask, Browse OOB and the optional "Send this". Combobox/listbox semantics, result count in a polite status region (section 5.7).

### W4. The 20-second guided moment (first visit)

```
Desktop                                                                         Phone
┌───────────────────────────────────────────────────────────────┐             ┌─────────────────────┐
│ header (as W1)                                                │             │ header (as W2)      │
├───────────────────────────────────────────────────────────────┤             │░░░░░░░░ MAP ░░░░░░░░│
│░░░░░░░░░░░░░░░░ MAP flies to Seminary Ridge → the Angle ░░░░░│             │░░░░░░░░░░░░░░░░░░░░░│
│░ ┌──────────────────────────────┐ ░░░░░░░░░░░░░░░░░░░░░░░░░░│             │░ ┌────────────────┐ │
│░ │ JULY 3, 1863                 │ ░░░░░░░░░░░░░░░░░░░░░░░░░░│             │░ │ JULY 3, 1863   │ │
│░ │ Pickett's Charge             │ ░░░░░░░░░░░░░░░░░░░░░░░░░░│             │░ │ Pickett's      │ │
│░ │ They step off Seminary Ridge,│ ░░░░░░░░░░░░░░░░░░░░░░░░░░│             │░ │ Charge         │ │
│░ │ a mile-wide line.            │ ░░░░░░░░░░░░░░░░░░░░░░░░░░│             │░ │ caption…       │ │
│░ │ [Skip]  [Pause]    ●○○○○     │ ░░░░░░░░░░░░░░░░░░░░░░░░░░│             │░ │ [Skip][Pause]  │ │
│░ └──────────────────────────────┘ ░░░░░░░░░░░░░░░░░░░░░░░░░░│             │░ └────────────────┘ │
├───────────────────────────────────────────────────────────────┤             │ timeline (as W2)    │
│ timeline (as W1), playing ticks 535 → 556                     │             └─────────────────────┘
└───────────────────────────────────────────────────────────────┘

End card (t = 12 s)                            "That was 21 of 675 moments."
     [▶ Watch the whole battle from dawn]   [Explore on my own]   [Ask a question]
```

Non-modal region, captions in a polite live region, Skip = button + Esc, any map gesture takes control (card collapses to a chip). Reduced motion: static steps with Next/Previous.

### W5. Share sheet (desktop popover; phone bottom sheet)

```
┌─ Share this moment ─────────────────────────── ✕ ┐
│ ┌───────────────────────────────────────────────┐ │
│ │ [unfurl preview: image]                        │ │
│ │ Armistead at The Angle - Day 3                 │ │
│ │ gettysburginteractivemap.com                   │ │
│ └───────────────────────────────────────────────┘ │
│ ( Just this moment )  ( My exact view )           │
│ https://…/?tick=551&v=V-016&dv=1                  │
│ [ Copy link ]  [ Share… ]  [ QR ]                 │
│ Embed · Image card · Print · Cite this            │
│ Report a problem with this moment                 │
└───────────────────────────────────────────────────┘
```
"Share…" appears only when `navigator.canShare`; "Copy link" announces "Link copied"; clipboard failure shows a selected read-only field (never `window.prompt`).

### W6. Unit card and Story card (cross-links)

```
┌ 20th Maine Infantry ─────────────────── ✕ ┐        ┌ Armistead at The Angle ───────────── ✕ ┐
│ ▌Union · Maine                            │        │ Chapter 11 · Pickett's Charge           │
│ Fifth Corps › 3rd Div › Vincent's Bde     │        │ Day 3 · [clock chip]  Read time ~1 min  │
│ [Line of Battle]   ≈ {n} men now          │        │ {summary, 2-3 lines}                    │
│ Key action: {2 lines}                     │        │ {story, expandable}                      │
│ Casualties {pct}% ({k} KIA · {w} WIA)     │        │ Sources (2) ▾                           │
│ [▶ Follow]  [Profile]  [Ask]  [Share]     │        │ [▶ Watch] [Ask] [Share]   ‹ 1 of 2 ›    │
└───────────────────────────────────────────┘        └─────────────────────────────────────────┘
```
Ids ("U-20ME") and "Tick n" are not shown; "Recent positions" shows times, not ticks; the share glyph gets a label; Ask opens the right dock with the question prefilled.

### W7. Find a regiment (page) and the Unit page

```
Find a regiment or ancestor                                            ← 1  Look up your ancestor at NPS Soldiers and Sailors ↗
"Type a regiment (24th Michigan), a state, or paste a line from a record"  2  Type his regiment here
[ Co. G, 24th Mich. Vol. Inf.                              ] [Find]       3  Watch it on the map
State [Any ▾]   Side (All)(Union)(Confederate)   Arm (All)(Inf)(Cav)(Art)
─────────────────────────────────────────────────────────────────────────────────
Best match  ▌24th Michigan Infantry · Union · Michigan · Iron Brigade         [Open profile] [Follow]
              Recognised "Co. G" (companies are not indexed; the regiment is)
Other matches  2nd Michigan…  4th Michigan…                (natural order: 2nd, 4th, 24th)
Featured  1st Minnesota · 20th Maine · 26th North Carolina · 24th Michigan ...

Unit page (canonical /regiment?unit=)
[Union | Confederate] 24th Michigan Infantry     [▶ Follow on map] [Share] [Print one-page report]
Where it was: Day 1 ▪▪▪▪ Day 2 · Day 3   (mini path map + 3 day chips)      Casualties, strength, commander, key action
Moments that mention it (links) · Sources · "Look up individual soldiers: NPS Soldiers and Sailors ↗"
```

### W8. Features index and More menu

```
Desktop mega-menu (More ▾ or "Features")                     Phone: More tab (full page list)
┌─ Battle ────────┬─ Stories ─────────┬─ Find ──────────────┐   ┌──────────────────────────────┐
│ Live map        │ Documentary       │ Search              │   │ For teachers                 │
│ Compare         │ Nine turning pts  │ Find a regiment     │   │ Make a video · Watch Together│
│ Camera          │ The human cost    │ Order of Battle     │   │ Embed a moment               │
│ Heat map        │ Aftermath         │ Numbers             │   │ Sources and method           │
│ What-if (lab)   │ Student edition   │ One-page report     │   │ Help and shortcuts           │
│ Sightlines (lab)│                   │                     │   │ User guide (PDF)             │
├─ Ask ───────────┼─ Visit ───────────┼─ More ──────────────┤   │ Accessibility statement      │
│ Ask the Historian│ Near me           │ For teachers        │   │ Text version                 │
│ Sources & method │ Battlefield tour  │ Make a video        │   │ Privacy · Terms · Contact    │
│ Report an error  │ Battlefield AR    │ Watch Together      │   │ Report an error              │
│                 │ Soldier's Eye     │ Embed · Help        │   └──────────────────────────────┘
│                 │ Offline pack      │ Text version        │
└─────────────────┴───────────────────┴─────────────────────┘   (All 20 features appear here, once each.)
```

### W9. Classroom: Teach hub, lesson bar, Present

```
/teach/                                                     Lesson bar (Classroom mode, over the map)
Start in 60 seconds:  1 Pick a lesson  2 Present  3 Share   ┌──────────────────────────────────────────────┐
[Day 1 in 15 min] [Little Round Top] [Pickett's Charge]      │ Day 2 in 15 minutes · Step 2 of 6            │
  each: focus questions · vocabulary · handout · link · QR   │ Little Round Top      [◂ Prev] [Next ▸]      │
[Build your own]  [Print kit]  [Student edition]  [Cite]     │ Focus question ▾   Break out ▸  Back to step │
"No accounts. No personal information collected."            └──────────────────────────────────────────────┘

Present mode (?mode=present)
┌───────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░ MAP (UI 1.35×) ░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ JULY 2 · LITTLE ROUND TOP (large)                    ┌──QR──┐ │  clicker: PgDn/→ next · PgUp/← back
│ caption ≥ 28 px                                      └──────┘ │  Space play · B dim · Q QR
└───────────────────────────────────────────────────────────────┘
```

### W10. On-site: Near me, POI card, AR with Radar fallback (phone)

```
Visit (Near me)                       POI card                           AR / Radar
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│ Near me      [Use my  │   │ Little Round Top   ✕ │   │ (camera view or Radar)│
│              location]│   │ Tour stop 8 · Union  │   │      N                │
│ ▌Little Round Top ↗ 0.2mi│  │ What happened here:  │   │   ·Devil's Den        │
│  Devil's Den     ↖ 0.3mi│  │ {2-3 sentences}      │   │ ▲ you      ·Wheatfield│
│  Wheatfield      ← 0.5mi│  │ [▶ Watch it happen]  │   │  ·LRT                 │
│  Plum Run        ← 0.6mi│  │ [Street View][Directions]│  │ tap a label → card   │
│ See 20 more            │   │ [Save] [Share]       │   │ [Radar|Camera] [Exit] │
│ [Tour list] [Offline ✓]│   │ Watch your step…     │   └───────────────────────┘
└───────────────────────┘   └───────────────────────┘
```
Bearings and distances come from the device; when no heading is available the arrows disappear and rows are distance-sorted; Radar works without camera or compass.

### W11. State examples

```
Resume chip (top-centre, 10 s)                Quiet stretch (timeline, Story mode)
┌────────────────────────────────────────┐    ▏Retreat through town▕ ░░░░ (no recorded events) ░░░░ ▏Sickles▕
│ Back where you left off: Day 2 ·       │    toast: "Quiet stretch: skipped 125 moments.  [Jump back]"
│ Little Round Top.        [Start over]  │
└────────────────────────────────────────┘
Boot failure                                                   Offline
┌────────────────────────────────────────┐    ┌───────────────────────────────────────────────┐
│ The interactive map can't start here.  │    │ You're offline. Saved battlefield data is     │
│ You can still read the battle as a     │    │ available; the map may not load.  [Open saved]│
│ timeline.  [Open text version] [Retry] │    └───────────────────────────────────────────────┘
└────────────────────────────────────────┘
```

### W12. Text version (Battle Chronicle)

```
[Skip to chapters]                                        ┌ Load the interactive map (about 1.6 MB) ┐
H1 The Battle of Gettysburg, July 1-3, 1863               └──────────────────────────────────────────┘
Filter: (All)(Day 1)(Day 2)(Day 3)   Search within [          ]
H2 11 · Pickett's Charge and the Angle  (Day 3, moments 538-556)
  H3 Armistead at The Angle   {summary}  [Read more] [Open on the map] [Ask about this]
     ▾ Units on the field at this moment (Data View)   ▾ Events (15)
```


---

## 8. Microcopy, voice and the trust layer

### 8.1 Voice rules

Museum voice: plain, specific, calm, second person only when instructing. No dev-log sentences ("Earlier drafts of this tool tried...", "we haven't been able to do from here", "data note"), no engine words (tick, disposition, ids, `undefined`), no marketing hedges ("AI-style"), sentence-case labels, numbers generated from `facts` (never typed), honest scope ("as far as the records show"), <= 16 words per hint, <= 2 sentences per error.

### 8.2 Copy deck: current to proposed (every line is owner-editable; evidence shows where it lives)

| Where | Current | Proposed | Evidence |
|---|---|---|---|
| App splash | "Fast-forwarding 3 days of battle..." / "Skip intro ›" | (removed) / "Loading the battlefield..." with stage names | `pretty:101542,101581` |
| Layout chooser note | "You can switch at any time from the settings menu" | (removed; Settings > Layout: Auto / Compact / Full) | `pretty:102815` |
| Injected banner | "20 more tools live behind Extra Features, top right — search, an AI-style historian, live sound, AR, and more. Don't miss them." | (removed; one coach hint on the header search) | `index.html:377` |
| Archetype card | "Power User: Show me the keyboard shortcuts and let me go." | (removed; shortcuts live in Help) | `pretty:111814-111817` |
| Transport | "Tick 267/675" | "July 2 · Little Round Top" (tooltip: "moment 267 of 675") | `pretty:112357` |
| Speed | "1x (real time)" | "1x: 10 battle minutes per second" | `pretty:97429` |
| Toolbar | "Toggle Units", "Download Website Tutorial PDF", "Bookmarks", letter "S", "F", "L", "B", "?" | "Units", "User guide (PDF)" (in Help), "Saved moments", icons plus labels | `pretty:113112,113132,113221` |
| Unit panel | unit id under the name ("U-20ME"); "Recent Positions" with tick numbers; glyph `⎘` share | hidden id; times; labelled "Share" | `pretty:97955,98031` |
| Search placeholders | "Name, state, commander, or unit ID..." / "Search regiments, vignettes, locations..." | "Search units, people, places, moments - or ask a question" | `pretty:98822`, `search.html:54` |
| Search rows | "Commander unrecorded", "14th Brooklyn (alias for U-84NY)" | "Commander not recorded"; alias hidden | `search.html:112`; audit H7 |
| Historian banner | "This runs entirely in your browser and answers only from this site's own published data -- 467 regimental records ... It is a search-and-synthesis tool, not a live AI model ..." | "Answers come from this site's own records: {units} units, {moments} moments, {events} events and {places} places. Every answer lists its sources." | `historian.html:48` |
| Historian empty | "I couldn't find anything specific about that in the regimental records, narrative vignettes, chronology, or terrain data. Try a regiment name..." | see catalog row 8 (states what is and is not covered, offers next steps) | `historian.html:186` |
| Find ancestor | h1 "Find Your Ancestor's Regiment"; sub "Search by state, or by a commander's surname..." | h1 "Find a regiment"; three-step explainer; input accepts a pasted record line | `find-ancestor.html:47-48` |
| AR caveat | "...its on-the-ground accuracy can only be confirmed by testing it while actually standing at Gettysburg, which we haven't been able to do from here." | "Accuracy depends on your phone's compass and GPS. If labels look off, move your phone in a figure eight." | `ar.html:56` |
| Viewshed / Dashboard notes | developer-style caveats (audit H7) | one-line honest scope plus a "Sources" link | audit H7, C7 |
| Documentary sub | "All 24 of the battle's key moments ... use as a script for narration" | "{n} moments from July 1-3, 1863, in order. Read at your own pace or press Listen." | `documentary.html:49`; `pagesB` 290 |
| Documentary eyebrow | "Day 3 · Tick 551 · The Angle, Cemetery Ridge" | "July 3 · The Angle, Cemetery Ridge" | `documentary.html:89` |
| Features naming | "Extra Features", "Explore" | "Features"; destinations Battle / Stories / Find / Ask / Visit | `site-nav.js:14,169` |
| Attribution | (none) | Footer and About: "An independent project. Not affiliated with or endorsed by the National Park Service." (**owner must confirm the statement is true**) | grep: no affiliat/unofficial in HTML |
| 404 | "This ground isn't on the map." | keep (a strength) plus Battle / Search links | `404.html` |

### 8.3 "Report a problem" and corrections (closes the feedback loop; trust for P5, P3, P2)

**Entry points.** Story card, Unit card, Unit page, Ask answers, Moment permalink pages, footer, Help. **Dialog.** Category (Wrong date or time; Wrong place; Wrong unit information; Typo or wording; Other), a text box (<= 500 characters), an optional reply email (explicit opt-in, unchecked), and read-only attachments shown to the visitor: the permalink and the site/data version (`dv`, build id). No browser fingerprint. **Transport (MVP).** A prefilled `mailto:` (zero infrastructure and no new data processor); when volume warrants, a Netlify Form (verify current free-tier limits; add it to the privacy page as a data processor). **Public corrections log** (`/corrections`): date, what changed, source; a small "Updated <date>" line on each moment. **Response promise** stated on the page (for example "reviewed weekly"). This also feeds database growth (section 6.4).


---

## 9. Task-success metrics plan

### 9.1 What the metrics must decide

(1) Is a first-time visitor reaching the battle and staying? (2) Can each persona finish its top task (section 3) and how fast? (3) Do share, resume and deep links actually restore state? (4) Is the Historian answering, and what is it missing (this feeds the database expansion)? (5) Are Core Web Vitals green for real users by device and by flow? (6) Did a release make anything worse (regression gate)?

There is **no baseline today**: no click analytics exist; Netlify gives pageviews, referrers and countries (`netlify-pdfs.txt`) and RUM p75 for LCP, INP, CLS, FCP, FID with no device split or attribution. So the first deliverable of this section is a **two-week baseline** before Phase 1 ships.

### 9.2 Framework (HEART plus funnels) and targets

Targets are **proposals**; each is validated against the two-week baseline and adjusted once (not repeatedly). "Engaged session" = at least 30 s of map playback, or at least 2 moment views, or a search or Ask with a result opened.

| Dimension | Metric (definition) | Target (p50/p75 as stated) | Source |
|---|---|---|---|
| **Adoption / first run** | Blocking overlays before first interaction | 0 | Playwright + event `overlay_shown` |
| | `time_to_map_interactive` (navigation start to first Play possible) | <= 3.5 s p75 Fast 4G desktop; <= 5 s mobile (after `bundle-anatomy`) | RUM custom mark |
| | First-session engaged rate | >= 60 % (baseline first) | `session_engaged` |
| | Guided-moment skip rate | <= 60 % (skips at < 3 s are counted separately) | `intro_skip` |
| **Task success** | Jump to a named moment: `moment_jump` applied state within 1.5 s and tick/day data loaded | >= 99 % | `moment_jump_ok` |
| | Palette: query to selected result | median <= 6 s; zero-result rate <= 8 % | `palette_*` |
| | Find a regiment: `finder_open` to `unit_page_open` in <= 120 s | >= 70 % | funnel |
| | Share-link landing restores state | >= 99 % (`deep_link_ok` / `deep_link_open`) | `deep_link_*` |
| | Ask: answer with >= 1 citation opened | >= 30 % of answered asks | `ask_*` |
| | Ask: no-answer rate | <= 25 % on launch, falling with each database release | `ask_no_answer` |
| **Engagement** | Median map playback per engaged session | >= 90 s | `play_seconds` |
| | Feature reach: share of engaged sessions that open at least one non-map feature (Stories, Find, Ask, Visit, More) | baseline first, then +50 % relative | `nav_click` |
| | Chapters reached per engaged session | >= 2 | `chapter_enter` |
| **Retention** | Return within 14 days (cohort by first-visit week; local-only marker plus aggregate) | baseline first | `visit_return` (aggregate) |
| | Resume used on return visits | >= 50 % of returns with a saved view accept auto-resume (no "Start over") | `resume_*` |
| **Happiness** | SUS (moderated tests) | >= 80 (mean; roughly an "A" on the Sauro-Lewis scale, verify) | section 10 |
| | Single Ease Question (7-point) per task | median >= 6 | section 10 |
| | Optional 1-tap "Was this helpful?" on Ask and story cards | >= 60 % positive of votes | `helpful_vote` |
| **Reliability** | Boot failure rate | < 0.5 % of sessions | `boot_fail` |
| | Error-boundary trips | < 0.3 % of sessions | `error_boundary` |
| | Deep-link error rate | < 1 % | `deep_link_error` |
| **Performance (RUM, p75, by mobile/desktop, by flow)** | LCP / INP / CLS / FCP / TTFB | <= 2500 ms / <= 200 ms / <= 0.1 / <= 1800 ms / <= 800 ms (green) | `web-vitals` attribution build + Netlify RUM |
| **Classroom** | Lesson link opens that advance at least one step | >= 80 % | `lesson_*` |
| **On-site** | Near me: location granted then a POI card opened in < 60 s | >= 70 % of on-site sessions | `near_me_*` |
| | Offline pack saved and later used offline | tracked | `offline_*` |

### 9.3 Event taxonomy (no personal data; no raw text)

All events carry: `t` (ms since navigation), `page` (route template, no query), `layout` (compact/full), `mode`, `first_visit` (bool, from local marker), `net` (effectiveType bucket where available), `dv`, build id. No user id, no IP retention, no cookies; a random in-memory `session` id that never leaves the page lifetime and is not stored.

| Event | Extra properties | Fired when |
|---|---|---|
| `app_ready` | `ttfi_ms` | map idle and Play possible |
| `intro_shown` / `intro_skip` / `intro_complete` / `intro_choice` | `at_s`, `choice` | guided moment lifecycle |
| `layout_resolved` | `source` (auto/setting/param) | boot |
| `play` / `pause` / `pace_change` | `pace`, `speed` | transport |
| `moment_jump` / `moment_jump_ok` | `source` (chapter, marker, palette, story, link, playlist), `id` | jump requested/applied |
| `chapter_enter` | `chapter` | playback or jump enters a chapter |
| `nav_click` | `dest` (battle/stories/find/ask/visit/more), `item`, `source` (header, tab bar, palette, card) | any navigation |
| `palette_open` / `palette_select` / `palette_empty` / `palette_to_ask` | `source`, `type`, `rank`, `scope`, `query_len` | palette use (never the text) |
| `unit_select` / `unit_follow` / `unit_profile` | `source` | unit interactions |
| `finder_open` / `finder_result_open` / `unit_page_open` | `parsed` (alias-hit bool), `rank` | ancestor funnel |
| `share_open` / `share_copy` / `share_native` / `share_qr` / `share_embed` | `scope` | share sheet |
| `deep_link_open` / `deep_link_ok` / `deep_link_error` | `params` (names only), `legacy` (bool) | boot from a URL |
| `resume_auto` / `resume_start_over` | `age_days` bucket | return visit |
| `ask_submit` / `ask_answer` / `ask_no_answer` / `ask_citation_open` / `helpful_vote` | `confidence`, `mode`, `n_citations` | Historian |
| `report_open` / `report_send` | `category` | report a problem |
| `near_me_permission` / `near_me_poi_open` / `ar_start` / `ar_mode` / `offline_saved` | `result`, `mode` | on-site |
| `lesson_open` / `lesson_step` / `present_start` | `lesson`, `step` | classroom |
| `text_view_open` / `lite_offered` / `lite_accepted` | `reason` | text route |
| `boot_fail` / `error_boundary` / `js_error` | `code` (no stack text with user data) | reliability |
| `cwv` (LCP, INP, CLS, FCP, TTFB) | metric, value, attribution target (selector), interaction type | `web-vitals` |

### 9.4 Privacy, hosting and legal (keep the site's promise)

`privacy.html` promises "no third-party analytics beyond the performance monitoring" and says the site "is often used in classrooms" and collects no personal information, including from students. Any measurement must preserve that. Design rules: aggregate counters only; no persistent identifiers; no IP storage; honour Do Not Track and Global Privacy Control (skip all events); no free text except explicit opt-in submissions ("Send this question"), sent through a separate channel and clearly labelled; retention 13 months; a short public "How we measure" page; update the privacy policy (`X5`) before shipping.

**Options (choose after a privacy/legal read; I verified none of the vendor claims here):**
1. **First-party endpoint**: a small Netlify Function receiving `sendBeacon` posts and writing only daily aggregate counters to Netlify Blobs or a KV (no rows per visit). Lowest privacy risk, some code.
2. **Privacy-focused hosted analytics** (candidates to evaluate: Plausible, Umami, GoatCounter): cookieless, event support; verify licensing, price, data location, custom-event limits and whether their terms are acceptable for a site used by children.
3. **Netlify Analytics only** (already on): pageviews and referrers only; insufficient for funnels.
Recommendation: 1 or 2, with `web-vitals` (attribution build) reporting to the same sink; ship the baseline collection first.

### 9.5 Performance with attribution (ties to `bundle-anatomy-06`)

RUM is Poor on LCP/INP/CLS/FCP with no explanation. Report `web-vitals` with attribution: the LCP element and its resource, INP's interaction target and phase split (input delay / processing / presentation), CLS shift sources; segment by layout, first vs return visit, mode and connection bucket. UX-relevant custom marks: `time_to_map_interactive`, `time_to_first_play`, `palette_first_result_ms`. Lab (Lighthouse) only sees the splash state (it never passes the gates, `lh_mobile.json`), so RUM plus Playwright traces of the real flows are the truth.

### 9.6 Experiments

| Experiment | Arms | Primary metric | Notes |
|---|---|---|---|
| Guided moment | Pickett's Charge / First Shot / none | engaged-session rate, `time_to_first_play` | Needs about 384 first-time visitors per arm for a 10-point lift on a 40 % baseline; about 3 weeks for two arms at about 35 first-timers a day **[E]** |
| Chapter chips vs none (mobile) | 2 | `moment_jump` per session | |
| Ask entry prominence | header field only vs field plus Ask tab | `ask_submit` rate | |
| Auto-resume vs banner | 2 | `resume_start_over` rate | ethics: none |
Randomisation is client-side and deterministic per visit (no stored id: use a per-page-load random draw and record the arm as an event property).

### 9.7 Moderated-test targets per journey (used in section 10; also the release gate)

| Journey | Completion (5 of 5 users unaided unless stated) | Time | Other |
|---|---|---|---|
| J1 First visit (T1) | starts playback or opens a moment within 60 s: 5/5 | <= 30 s | 0 gate complaints |
| J3 Jump to Pickett's Charge (T2) | 5/5 | <= 30 s desktop, <= 45 s phone | correct moment and data visible |
| J11 Ask (T3) | 4/5 restate one reason with a citation | <= 90 s | trust >= 5/7 with reasons given |
| J4 Ancestor (T4) | 4/5 find unit and see Day-1 path | <= 120 s | zero wrong-tool restarts |
| J5 Share (T5) | 5/5; recipient window shows the same moment | <= 30 s | |
| J7 Teach (T6) | 4/5 teachers find lesson or Present | <= 180 s | students' link opens on the same step |
| J6 On-site (T7) | 4/5 reach "What happened here" | <= 60 s | no dead-end permission |
| Back/recovery (T8) | 5/5 | <= 15 s | |
| AT run (T9) | 1/1 completes both parts | <= 2x the median sighted-mouse time | no keyboard trap |
| SUS | mean >= 80 | | SEQ median >= 6 |


---

## 10. Research and moderated-testing program

### 10.1 Before anything is built: validate the IA cheaply (Week 1)

Three unmoderated studies on the *proposed* labels, before any header or nav code is written. They cost the owner a day to set up and cannot be replaced by opinion.

| Study | Method | Participants | Pass threshold | Decides |
|---|---|---|---|---|
| **Closed card sort** | 20 feature cards (name plus one-line description, as in section 5.5) into the 5 destinations plus More, with an "unsure" pile and a free-text "what would you call this?" | 15-20 (mix: teachers, hobbyists, general adults) | >= 70 % agreement for at least 15 of 20 cards; every card with < 50 % agreement is renamed or re-homed | Group membership (for example Compare and Camera under Battle vs Find) |
| **Tree test** | Text-only tree (destinations to items, no visuals), 10 tasks: find where to look up an ancestor's regiment; jump to Pickett's Charge; ask a question about why Lee attacked; prepare a class lesson; nearest monument while standing at the park; send a moment to a friend; compare two moments; see casualties by corps; make a video; report a wrong date | 20 | success >= 80 % on >= 8 of 10 tasks; directness >= 70 % | Labels and depth |
| **First-click** (on W1/W2 wireframe images) | "Where would you click to ..." five tasks | 20 | correct first click >= 70 % | Header, Tools rail, chip row |

DIY route without paid tools: a static HTML tree test hosted on the site's own Netlify project and collecting answers through Netlify Forms (about half a day); recruit through the site's own audience (a banner on the map for one week: "Help us organise the site: 3 minutes"), a teachers' group, a local historical society and a genealogy group. Record no personal data; state that at the start.

### 10.2 Moderated study, five participants (reusable across rounds)

**Design.** One script, nine tasks, run **three times** on the same tasks: Round 0 on today's site (baseline: 5 users), Round 1 after Phase 1 (5 new users), Round 2 after Phases 2-3 (5 new users). Same tasks let you measure change. If budget forces a choice, run Round 0 with 3 users on T1, T3 and T4 only (highest uncertainty), then full rounds afterward. Five users per round finds most problems for a homogeneous group; because personas differ, each round deliberately spreads the five across personas instead of repeating one.

**Participants (round 1 mapping; each round uses new people).**

| Slot | Persona | Device | Recruit from | Notes |
|---|---|---|---|---|
| A | P1 student (or proxy) | Chromebook or phone | Teacher-referred 13-15 year old **with parent or guardian consent and school approval**; if that is impractical, a 9th-10th grader or college freshman doing the 8th-grade task framing (record as a limitation) | Consent forms in plain language; parent may sit in; no recording of the minor's face without consent |
| B | P2 teacher | laptop | middle-school social studies teacher | brings own class context |
| C | P3 genealogist or descendant | desktop or tablet | genealogy society, local history group, family-history forum | uses **their own ancestor's regiment** if it fought at Gettysburg, otherwise an assigned one |
| D | P4 visitor (or planning a visit) | own phone, portrait | people who visit or plan to visit Gettysburg | best run on site; remote fallback uses the demo location (`?demo=lrt`, a test-only Near me location) and is flagged as reduced fidelity |
| E | AT user | own screen reader plus keyboard (NVDA, JAWS or VoiceOver); or keyboard-only if no SR | disability community groups; paid | AT users are compensated at a professional rate; this session also feeds `app-a11y-33` |
P5 (buff) and P6 (casual, mobile, AI-referral) appear in Round 2 and through the field metrics; every participant still performs T1 as a **first visit**, which covers P6's flow for all five.

**Logistics.** 60 minutes, remote (video call with screen share and audio recording) or in person; the participant's **own device and browser**; a **fresh profile** (private window) so the first-visit flow is real; a test URL with `?src=test`; one observer optional; pilot with a colleague first. Incentive: for example a gift card sized to the audience (owner sets; teachers and AT users at professional rates). Consent: purpose, recording, anonymised quotes, right to stop, data deletion after 12 months, no PII stored; minors need a guardian signature. Recordings stored in the owner's private storage, not shared.

**Session outline (60 min).** 0-5 welcome and consent; 5-10 background questions; 10-45 tasks (T1-T8, plus T9 for slot E), about 4 minutes each; 45-55 debrief and SUS; 55-60 wrap-up.

**Facilitator script (read the bold lines aloud).**

> **"Thanks for helping. We're testing the website, not you; nothing you do is wrong. Please think aloud: say what you're looking at, what you expect, and what surprises you. I can't answer questions about how it works during the tasks, but I'll answer everything afterwards. You can stop at any time."**

Background questions (5): How do you usually learn about the Civil War or family history? Have you visited Gettysburg? How do you use maps online? (device, habits) Anything that makes websites hard for you? Have you used this site before? (If yes, screen out for a first-visit round.)

Hint ladder (use in order, log the level): 0 none; 1 wait 10 s and repeat the task; 2 "What are you looking for right now?"; 3 point to the region of the screen; 4 tell them. Log every hint. Never say a control's name before the participant does.

**Tasks.** Read the scenario; give the card if the participant wants to reread it. After each task ask the **Single Ease Question** ("Overall, how easy or difficult was this task? 1 very difficult to 7 very easy") and "What made you say that?".

| # | Scenario (read aloud) | Start | Success (unaided) | Target time | Probes |
|---|---|---|---|---|---|
| **T1 First impression and first visit** | **"Open this address. Before you touch anything: what do you think this site is for, and who is it for? Then take a minute and explore however you like."** (watch, do not help; note first click and time to first Play) | blank tab | Starts playback or opens a moment within 60 s | <= 30 s | What did you expect after the first screen? Anything you skipped? Did you notice other features? |
| **T2 Jump to a moment** | **"You've heard about Pickett's Charge and want to watch it. Show me how you'd get to it."** | on the map | Map is at the charge (moments 535-556) with units visible; participant can say what they see | <= 30 s desktop, <= 45 s phone | How sure are you this is the right moment? How did you decide where to look? |
| **T3 Ask a question** | **"A friend asked why Lee ordered the attack on the center on the third day. Find out what you can."** | on the map | Finds an answer or record and restates one reason; names the source | <= 90 s | Where did that come from? How much do you trust it (1-7) and why? What would make you trust it more? |
| **T4 Find an ancestor's regiment** | **"Your great-great-grandfather served in <assigned unit>, Company G. See whether you can find where his regiment was on the first day."** (assign among 24th Michigan, 1st Minnesota, 26th North Carolina, or the participant's own) | on the map | Unit found; Day-1 path or position visible | <= 120 s | Which tool did you look for? What would you do next with this? |
| **T5 Share** | **"You want a friend to see exactly what you're looking at now. Send them the moment."** (observer opens the copied link in a second window) | on a moment | Link copied within 30 s **and** the second window shows the same moment (not tick 1) | <= 30 s | What do you expect your friend to see? Would you post this? |
| **T6 Teach** (teacher; others as "a parent helping with homework") | **"You have ten minutes with eighth graders tomorrow to teach the second day. Set up something you can show on a projector and something the students can open on their Chromebooks."** | home | Finds Teach, a lesson or Present; students' link opens on the same step | <= 180 s | What would you print? What's missing? Would your school's network allow this? |
| **T7 On site** (slot D; others by imagination) | **"You're standing at Little Round Top with your family. What happened here?"** | on the map or Visit | Reaches a "What happened here" card | <= 60 s | Did the permission requests make sense? What would you do offline? |
| **T8 Recovery** | **"You opened Documentary a minute ago. Go back to the map exactly where you were."** | Documentary page | Returns to the same battle state | <= 15 s | Did you expect it to remember? |
| **T9 Keyboard and screen reader** (slot E) | **"Using only your keyboard and screen reader: play the second day and tell me what the first story is about. Then find the 20th Maine."** | home | Both parts completed without a trap | <= 2x the median sighted-mouse time | Where were you unsure where you were? What was announced too much or too little? |

**Post-test (10 min).** **SUS** (10 items, 5-point). Then: "Describe the site in three words." "What is the one thing you'd change?" "How likely are you to recommend it to someone who'd enjoy it (0-10)?" "Would you come back? For what?" "Did you notice the Features/Ask/Visit/More?" "What's missing?"

**Observer sheet (one row per task).** Success (0 fail, 0.5 partial, 1 pass); time; assist level (0-4); errors and dead-ends; key quotes (verbatim with timestamp); emotion (frustration, delight); severity (0-4) and heuristic; suspected friction id (`UXF-nn`). Also log **first click**, **hover on unlabeled icons**, **back-button use**, and any place the participant reads aloud text that says `undefined`, "Tick", or an id.

**Analysis and gates.** Within 48 hours: affinity-map the notes; count how many of 5 participants hit each problem; rank by severity x frequency. Rules: any severity-4 problem or any problem seen by >= 3 of 5 is fixed before the round is called done; a problem seen once with severity 3 goes on the backlog unless it hits AT or safety; report = top 10 problems with a 20-second clip each, the task table (success, time, SEQ), SUS, and the friction ids closed or opened. A round "passes" when section 9.7's targets are met.

**Pilot and materials checklist.** Pilot session first; staging URL; three assigned ancestors; a second window for T5; phone screen-share instructions; consent (adult, guardian); SUS and SEQ forms; observation sheet; recording; incentives; a plan B for T7 (demo location); an AT-friendly meeting link and a phone number for the AT participant.

### 10.3 Ongoing research after launch

Monthly review of the opt-in unanswered-question log and the "Report a problem" inbox; quarterly 3-user mini-test on one new feature; a spring classroom pilot with 2-3 teachers (school networks, Chromebooks, projector) before the fall term; a field test on site before the July anniversary; the accessibility program in `app-a11y-33`.


---

## 11. Findings register (fix specs)

Severity: critical | high | medium. Effort: S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d. `audit_refs` use the BRIEF ids ([] = new). Long-form design lives in sections 3-10; each finding cites them.

| id | Title | Severity | Effort | Depends on |
|---|---|---|---|---|
| ux-flows-01 | One URL-state contract: parse on load, serialise on share, legacy migration, data-version stamp | critical | L | app-bugs-05, app-bugs-06, app-bugs-10, ux-flows-05 |
| ux-flows-02 | Remove the three entry gates; resolve layout automatically; add a skippable 20-second guided moment | critical | L | app-design-14, bundle-anatomy-13, app-bugs-10, app-bugs-11, app-a11y-03, ux-flows-01, ux-flows-05 |
| ux-flows-03 | Unified search and command palette (Ctrl/Cmd+K): units, people, places, monuments, moments, commands, Ask | high | L | ux-flows-05, app-bugs-14, app-a11y-14 |
| ux-flows-04 | One global IA: shared header, five destinations plus More, Features index, every control re-homed | high | L | app-design-12, app-design-13, app-bugs-13, ux-flows-16, ux-flows-22 |
| ux-flows-05 | One moments.json (ids, chapters, playlists) replaces six divergent lists; fix Turning Points anchors; named chapters on the timeline | high | L | app-time |
| ux-flows-06 | Share sheet: labelled Share on every page, Web Share, QR, embed generator, image card, print, cite; mobile parity | high | M | ux-flows-01 |
| ux-flows-07 | Reliable 'Back to the battle': real link with last view; fix /index.html back links and cross-page history.back() | high | S | ux-flows-01 |
| ux-flows-08 | Resume where you left off and a zero-click returning-visit path | high | M | ux-flows-01, ux-flows-02, app-bugs-29 |
| ux-flows-09 | One 'Find a regiment or ancestor' flow: alias-tolerant finder, canonical Unit page, working Follow, what-next | high | L | ux-flows-03, ux-flows-01, app-bugs-06, app-bugs-14 |
| ux-flows-10 | Unit, Story and Moment cards: cross-links (Profile, Follow, Ask, Share), no ids or ticks, labelled controls | high | M | ux-flows-01, ux-flows-06, ux-flows-18 |
| ux-flows-11 | Progressive disclosure: tiers, calm defaults on load, one card at a time, capped hints | high | M | app-bugs-10, app-design-10 |
| ux-flows-12 | State catalog and StateCard: loading, empty, error, offline, permission, boot failure, retry | high | M | app-design-26, app-bugs-04, app-bugs-06 |
| ux-flows-13 | Classroom and Present modes with a Teach hub: lessons, class link/QR, print kit, student edition, cite, no accounts | high | L | ux-flows-01, ux-flows-05, ux-flows-06, pagesB-23, app-design-29 |
| ux-flows-14 | On-site mode: Near me, GPS dot, 528 POIs, AR redesign with radar fallback, offline pack, portrait | high | XL | ux-flows-01, ux-flows-05, bundle-anatomy-03, bundle-anatomy-16, app-a11y-29 |
| ux-flows-15 | Text and Lite route: Battle Chronicle, skip link, data-saver/no-WebGL fallback, upgrade in place | medium | M | ux-flows-05, app-a11y-08, app-a11y-12, app-a11y-15 |
| ux-flows-16 | Naming and copy pass: honest names, no jargon, no dev-log voice, no 'AI-style', non-affiliation notice | medium | M | ux-flows-04, ux-flows-22 |
| ux-flows-17 | Help and documentation IA: task-based Help, in-context hints, keyboard sheet from the registry, guide in sync | medium | M | app-bugs-13, ux-flows-04 |
| ux-flows-18 | Ask the Historian UX contract: contextual entry, answer cards with citations and coverage, drawer, thread, opt-in question log | medium | M | ux-flows-01, ux-flows-03, ux-flows-19 |
| ux-flows-19 | Quick fix: Historian chronology answers render the literal word 'undefined' (137 of 137) | high | S | - |
| ux-flows-20 | Shortcut and Esc contract with discoverability: registry-driven, hints on desktop, none on touch | medium | M | app-bugs-09, app-a11y-06, ux-flows-04 |
| ux-flows-21 | Measurement: two-week baseline, privacy-safe event taxonomy, web-vitals attribution, dashboards, experiments | medium | M | bundle-anatomy-06, ux-flows-22 |
| ux-flows-22 | Research program: card sort, tree test, first-click, three rounds of five-user moderated tests, ongoing loops | medium | M | - |
| ux-flows-23 | Map-mode convergence roadmap: Compare, Camera, Heat map, What-if, Sightlines, Sound, Human cost, Video as views of one map | medium | XL | ux-flows-01, ux-flows-04, bundle-anatomy-18, app-design-02 |
| ux-flows-24 | Playback UX: Story pace, previous/next moment, quiet-stretch skip, honest speed labels, chapter chips, marker buttons | medium | M | ux-flows-05, app-bugs-21, app-bugs-33, app-a11y-07 |
| ux-flows-25 | Content permalink pages with unique share cards for moments, units, places and stops | medium | L | ux-flows-05, ux-flows-01, N1 |
| ux-flows-26 | Fill the Day-1 afternoon silence and other quiet stretches with sourced moments | high | L | ux-flows-05, app-time |
| ux-flows-27 | UX release gate: heuristic and cognitive-walkthrough checklist per release; friction register kept alive | medium | S | ux-flows-22, app-design-34 |
| ux-flows-28 | Trust layer: per-moment sources, data version and 'Updated' line, Report a problem, public corrections log, Sources and method | medium | M | ux-flows-05, ux-flows-16 |

### ux-flows-01: One URL-state contract: parse on load, serialise on share, legacy migration, data-version stamp

- **Severity** critical. **Effort** L. **Audit refs** new. **Depends on** app-bugs-05, app-bugs-06, app-bugs-10, ux-flows-05.
- **Evidence.** The app writes ?t=&u=&z=&ll= (bundle.pretty.js:97821-97829, prompt fallback :97932) and ?ancestor= (:101225); sub-pages write ?tick=&vignette= (documentary.html:92, education.html:81, historian.html:110, search.html:127, embed.html:60), ?unit= (search.html:114, regiment.html:247) and ?lat=&lng= (search.html:139); the only reader is ?ancestor inside the Follow panel (pretty:101019); the splash resets currentTick (pretty:101497-101502). /index.html is the 2nd most viewed URL (86 views in 30 d, Netlify PDF).
- **Root cause.** No routing layer: each feature invented its own parameters; no notion of data version, so a future clock/retime fix would silently re-point every shared link and bookmark.
- **Fix spec.** Implement section 5.6: lib/state-url.js with parseState (total, ordered, aliases t/u/ll/lat+lng/ancestor/vignette accepted), serializeState (minimal, stable key order, 4 dp lat/lng), migrateTick(dv,tick) backed by data/tick-migrations.json; boot reader runs before the intro decision, awaits ensureDay(dayOf(tick)) then applies tick/unit/v/panel/follow then camera.frame(); pushState for discrete navigation, replaceState for scrub-end/pause/move-end, never while playing; one mapLink({tick,unit,v,at,z,panel}) helper used by all 10 producer sites and the app share helpers; 301 /index.html -> / (verify query is preserved); write dv into every URL and bookmark.
- **Acceptance test.** Table-driven Playwright over 60 URLs: /?tick=551&v=V-016 -> Day 3 data loaded, tick 551, story open, camera on the Angle, no intro; /?unit=U-24MI -> unit card; /?tick=9999&unit=nope -> normal start plus 'invalid link' chip; serialize(parse(u)) == u; a link crawler over the 10 producers lands every link on its intended state; Back returns to the previous discrete state; legacy t/u/z/ll links from old bookmarks still open.
- **Metric or grade moved.** Core function (desktop and mobile), Usability; deep_link_ok >= 99 %; closes UXF-16 and UXF-24.

### ux-flows-02: Remove the three entry gates; resolve layout automatically; add a skippable 20-second guided moment

- **Severity** critical. **Effort** L. **Audit refs** H3, A6. **Depends on** app-design-14, bundle-anatomy-13, app-bugs-10, app-bugs-11, app-a11y-03, ux-flows-01, ux-flows-05.
- **Evidence.** Splash tO waits for data, then 800 ms + 3.5 s sweep writing the store each frame + 0.6 s fade (pretty:101471-101590; Skip is a div, 11 px, #444, :101581); chooser dO cards are div onClick and the note promises a non-existent settings menu (pretty:102759-102815, :102767,:102789); layout state is useState(null) and only gtbg_onboarded is stored (pretty:112949-112951); onboarding archetypes offer Power User on touch (pretty:111814); injected banner text index.html:377. J1: >= 3 blocking screens, >= 3 clicks, ~14 s before the first choice on mobile.
- **Root cause.** Layout and orientation are treated as user decisions instead of detected preferences; onboarding explains controls before showing value; nothing persists.
- **Fix spec.** Delete the React fast-forward splash, chooser, archetype modal and the banner script (index.html:355-396). resolveLayout(pref) from matchMedia (width, pointer) with a Settings override (Auto/Compact/Full). GuidedMoment component driven by moments.json intro + intro_captions: fly-in 1.5 s, play ticks 535-556 at 1x (~10.5 s), hold, end card with three choices (Watch the whole battle / Explore / Ask); non-modal region, no focus trap, Skip is a 44 px button and Esc, any map gesture takes control, captions in a polite live region <= 1 per 2.5 s, reduced-motion = static steps, data-saver/slow = Lite mode, never on deep link/classroom/resume. Three one-time hints (cap 3). Help > Replay and optional 60-second coach-mark tour. Migrate gtbg_onboarded to onboarding.status. Data slice for ticks 521-600 is 4 KB gzip.
- **Acceptance test.** Fresh private profile: zero role=dialog or full-screen overlays before first interaction; keyboard-only reaches Play with Tab+Enter; 320/375 px: no clipped glyphs, no horizontal overflow; reduced-motion: no autoplay, five steps with Next/Previous; second visit: no guided moment; T1 in moderated test: 5/5 start playback within 60 s; guided moment lasts 20 s +- 2 s in a trace (captions at 3.0, 6.0, 9.5, 12.0 s).
- **Metric or grade moved.** Usability D+/B- -> A-, first-run friction, keyboard/SR entry (UXF-01..08, 53), time_to_first_play; RUM (no store sweep during load window).

### ux-flows-03: Unified search and command palette (Ctrl/Cmd+K): units, people, places, monuments, moments, commands, Ask

- **Severity** high. **Effort** L. **Audit refs** H5, H7. **Depends on** ux-flows-05, app-bugs-14, app-a11y-14.
- **Evidence.** Three search entry points with different corpora: S panel (pretty:98822, units only), the magnifier that opens the same panel (pretty:113214), Search Everything page (search.html:99-141, autofocus :54); six regiment pickers (S panel, Follow pretty:101039, regiment.html, report.html, find-ancestor.html, camera.html); plain includes/subsequence scoring; sorting by localeCompare (H5); no aliases; 'Gulp's Hill saddle' typo in terrain.json hides a 'culp' match.
- **Root cause.** Each feature built its own picker and index; nothing normalises ordinals, abbreviations or punctuation.
- **Fix spec.** Section 5.7: build data/search-index.v1.json at deploy time (about 225 KB raw / 40 KB gzip for ~1,300 entries; prototype 184.6 KB / 31.6 KB for 1,086) from the data files; hand-rolled scorer plus normaliser (ordinal words, optional suffix, state abbreviations both ways, Inf./Vols./Btty, Co. G recognised and dropped, corps roman/word), curated alias table for places/events; ranking exact>prefix>word-prefix>substring>fuzzy(<=1 for 5+ chars) with type priors by context and query shape; groups of 5; commands (> prefix), @ # ? accelerators; date phrases; clock queries disabled until the canonical clock exists; Ask fallback row and Shift+Enter; lazy-load on first focus/idle; service-worker cache. ARIA 1.2 combobox/listbox, status region, Esc contract, 56 px touch rows, 16 px input, no autofocus on load/touch. Replace S panel, magnifier tool and search.html body (keep /search.html?q= route). Fix the Gulp's/Culp's typo.
- **Acceptance test.** Golden set of 60 queries (seed in section 5.7) each returns its expected type at rank <= 3, including '20 maine', 'twentieth maine', '24th mich.', '1st minn', 'chamberlain', 'devils den', 'culp', 'pickett's charge', 'why did lee attack the center?' (Ask first) and 'zzzz' (no-results state); p95 query time < 20 ms on a mid-range phone; axe 0 and NVDA/VoiceOver announce result counts; test asserts index entry counts equal data counts.
- **Metric or grade moved.** Usability B- -> A (P3, P5, P6), UXF-10, 41; palette_select rank; zero-result rate <= 8 %.

### ux-flows-04: One global IA: shared header, five destinations plus More, Features index, every control re-homed

- **Severity** high. **Effort** L. **Audit refs** H1, H6, D4. **Depends on** app-design-12, app-design-13, app-bugs-13, ux-flows-16, ux-flows-22.
- **Evidence.** Four drifting navigation lists: desktop toolbar of 13 icons (pretty:113145-113240), mobile sheet of 14 tiles (pretty:103391-103482), injected pill of 20 features that hops among six positions (index.html:176-206, :535-542), sub-page nav (site-nav.js:12-58); menu button and first group both 'Explore' (site-nav.js:14,169); OOB absent on desktop, Walkthrough/Distance/Locations absent on mobile; tab order differs from visual order (index.html:285 vs :716).
- **Root cause.** Navigation was added per feature and per layout; no single tool registry and no information architecture.
- **Fix spec.** Adopt section 5.4-5.5: one GlobalHeader component on the map and all sub-pages (Battle, Stories, Find, Ask, Visit, search field, Share, More; bottom tab bar on compact); map tools (Layers, Filter, Key, Measure, Saved, Units) in a Tools rail/sheet driven by the single tool registry (app-bugs-13); re-home every control per the tables in 5.5; Features index page as the crawl hub; delete the injected overlay and its six scripts (index.html:168-237, 285-606); keep file URLs (no renames) and add hub pages; Settings > Layout replaces the layout promise; validate labels first with the card sort and tree test (ux-flows-22).
- **Acceptance test.** Card sort >= 70 % agreement on >= 15 of 20 cards and tree test >= 80 % success on >= 8 of 10 tasks before build; after build: header component identical (DOM and position within 1 px) on 27 pages and 30 app states; #extra-features absent; every one of the 20 features reachable in <= 2 clicks from any page; tab order equals visual order; registry test asserts every tool has a panel and appears in Help.
- **Metric or grade moved.** Usability B-/D+ -> A-/B+, Fit and finish, discoverability and hierarchy (UXF-09..14, 56, 59); feature-page views per session.

### ux-flows-05: One moments.json (ids, chapters, playlists) replaces six divergent lists; fix Turning Points anchors; named chapters on the timeline

- **Severity** high. **Effort** L. **Audit refs** C4. **Depends on** app-time.
- **Evidence.** Lists: 8 scrubber markers (pretty:112192-112200), 5 tour steps (pretty:111819), 24 vignettes, 137 chronology events, 9 Turning Points (turning-points.html POINTS), 16 stops (pretty:104096), Documentary, Students, bookmarks, Watch Together stops. Pickett's Charge = tick 538 (scrubber, tour), 551 (vignette V-016), 560 (Turning Points; chronology@560 = EAST CAVALRY FIELD). 6 of 9 Turning Points anchors do not land on the named event (Appendix A): 175 has no event (nearest is 226), 240 = Berdan's reconnaissance (Longstreet's assault is 256), 267 = Vincent arrives (Chamberlain's charge is 275), 340 = 'fighting dies down', 540 = Union artillery replying (cannonade begins 518), 560 = East Cavalry Field. Scrubber has 8 px div markers and none on mobile (pretty:112270-112293).
- **Root cause.** A moment is hand-typed independently in each place; nothing validates that a tick matches a named event.
- **Fix spec.** Create data/moments.json per section 6.1 (ids permanent, kind, tick, chapter, place, units, summary, story, marker flag, sources, intro flag) plus 13 chapters (section 6.2) and playlists (documentary, debates, intro-tour, lessons, per-day student sets). Generate: timeline chapter bands and marker buttons, mobile chapter chips, Documentary, Turning Points, Students, tour steps, palette moments, walkthrough links. Correct the 6 wrong Turning Points anchors (owner/historian choose target moments). Add lint (ids unique, tick in chapter, keyword match within +-3 ticks of a chronology event, units exist, student summary FK <= 8 with a real tool, sources present). Derive E-D<day>-<tick> ids for events.
- **Acceptance test.** moments lint passes in CI; Turning Points 9/9 anchors match a chronology event containing the curated keyword within +-3 ticks; deleting any hand-kept list file fails the build (proves generation); Documentary tie (V-019/V-023 at tick 556) ordered deterministically; timeline shows 13 named chapters at 375 and 1440 px with 44 px hit areas on touch.
- **Metric or grade moved.** Historical/data consistency C- -> B+ (with time specialist), Usability; UXF-18..21.

### ux-flows-06: Share sheet: labelled Share on every page, Web Share, QR, embed generator, image card, print, cite; mobile parity

- **Severity** high. **Effort** M. **Audit refs** H7. **Depends on** ux-flows-01.
- **Evidence.** Share is a letter-B button plus an unlabeled glyph share button (pretty:113221, :97964-97970); clipboard failure calls window.prompt (pretty:97932); no navigator.share anywhere in the app region (grep zero); mobile Bookmarks tile is dead (app-bugs-12); embed CTA is a dead link (embed.html:60) though Terms invite embedding; one og:image for every URL (index.html:21).
- **Root cause.** Share was implemented as a side effect of Bookmarks with no reader on the other end and no mobile path.
- **Fix spec.** Section 5.6.10: Share control in the header (desktop), Tools sheet and on every Story/Unit card (labelled, 44 px); sheet with preview, scope switch (moment / exact view / playlist), Copy link with live-region confirmation and a selected read-only field fallback (no prompt), Share... when navigator.canShare, client-side QR (inline SVG, save as image), embed snippet with preview for embed.html?v=..., image card (1200x630, attribution kept; verify render-then-toBlob on iOS), print view, Cite this (MLA/APA/Chicago templates verified against current guides), Report a problem. Recipient sees a 'Shared moment' chip with Explore from here.
- **Acceptance test.** T5 in moderated test 5/5 within 30 s and the second window shows the same moment; Playwright: copy then open in a fresh context restores state; iOS Safari and Android Chrome show the native share sheet; QR scans to the same URL; embed iframe renders on a test page; keyboard-only and screen-reader operable; share_open -> share_copy tracked.
- **Metric or grade moved.** Usability, Core function (mobile D -> B+), UXF-25, 27, 28.

### ux-flows-07: Reliable 'Back to the battle': real link with last view; fix /index.html back links and cross-page history.back()

- **Severity** high. **Effort** S. **Audit refs** T3. **Depends on** ux-flows-01.
- **Evidence.** Ten pages use href="/index.html" (aftermath.html:41, documentary.html:47, education.html:42, search.html:50, camera, compare, dashboard, report, sandbox, viewshed) but wireBackLinks only rewires a[href="/"] (site-nav.js:212); history.back() is called whenever the referrer is same-origin and history.length > 1, so Historian -> Regiment -> Back returns to Historian (pagesB:134); /index.html shows 86 pageviews in 30 d.
- **Root cause.** Back navigation is emulated with history heuristics instead of an explicit link to a known state.
- **Fix spec.** Phase 0 (S, no app change): change the 10 hrefs to "/" and only call history.back() when history.state.fromMap is true. Phase 1: the map writes sessionStorage['gtbg:lastView'] (state-url string) on pagehide and after discrete changes; the header shows 'Back to the battle' as a real <a href> to '/?' + lastView (falls back to '/'); add 301 /index.html -> /.
- **Acceptance test.** Historian -> Regiment -> Back to the battle lands on the map state that was open before Historian; sub-page opened in a new tab links to '/'; Documentary and Students links work; grep shows no href="/index.html"; access log shows no /index.html hits after deploy.
- **Metric or grade moved.** Usability, reliability of navigation (UXF-15), fewer forced reloads.

### ux-flows-08: Resume where you left off and a zero-click returning-visit path

- **Severity** high. **Effort** M. **Audit refs** H3. **Depends on** ux-flows-01, ux-flows-02, app-bugs-29.
- **Evidence.** Only gtbg_onboarded, gtbg_prefs (legend/minimap) and gettysburg_bookmarks persist (app-bugs Appendix D); layout state is in memory (pretty:112949); returning visitors pay splash + chooser each visit (J2); 92 % of referrals are Direct (Netlify PDF).
- **Root cause.** No persisted view state; no resume concept.
- **Fix spec.** Section 5.12: gb.v2.prefs.resume {tick, unit, at, z, panel, plStep, dv, savedAt} written on pause, scrub end, selection change and pagehide (try/catch, memory fallback); recent[] (5) feeds the palette; auto-resume if <= 7 days with a 10-second 'Start over' chip, banner if 8-30 days, fresh after 30; not applied when a deep link or ?mode is present; Help > Reset saved data; list keys on the privacy page.
- **Acceptance test.** Second visit reopens at the last view with the chip in <= LCP + 300 ms and zero clicks; 'Start over' restores default; storage blocked (private mode) still works; deep link wins over resume; keys documented on privacy.html.
- **Metric or grade moved.** Usability, retention (resume accepted >= 50 %), UXF-26.

### ux-flows-09: One 'Find a regiment or ancestor' flow: alias-tolerant finder, canonical Unit page, working Follow, what-next

- **Severity** high. **Effort** L. **Audit refs** H5, H7. **Depends on** ux-flows-03, ux-flows-01, app-bugs-06, app-bugs-14.
- **Evidence.** find-ancestor.html searches by commander surname and state only (:56-59,106), sorts with localeCompare (:108), caps at 100 (:114), shows raw parent ids (:121); Follow picker uses lower-case includes with 15/20-row caps and only loaded animated units (pretty:101039-101050; 217 of 478 units missing until a day is played, app-bugs-06); biography 'See its sector' link is dead (regiment.html:247); caveat with the NPS link is a paragraph (find-ancestor.html:52); three ancestor tools, six pickers.
- **Root cause.** Three tools built for different inputs; the mental model of a descendant (regiment number, state, arm) is never parsed.
- **Fix spec.** Section 3 J4-T and W7: one finder built on the palette normaliser (accepts 'Co. G, 24th Mich. Vol. Inf.', '1st Minn', 'twentieth maine', '26 NC'); chips for state/side/arm; natural sort; brigade and division names (not ids); featured units; three-step explainer with the NPS Soldiers and Sailors link on every result; canonical Unit page (regiment.html) with day chips, casualties, commander, moments that mention it, Follow on map (uses follow=), Share, Print; commander search kept as a secondary filter; replace the other pickers (Follow, Battle Reports, Camera) with the shared UnitPicker; unit-not-animated state.
- **Acceptance test.** Golden finder queries return the expected unit first; order is 2nd, 4th, 24th; T4 in moderated tests >= 4/5 within 120 s; 'Follow on map' opens the map with the trail; grep finds one UnitPicker; results show no 'U-' ids; the NPS link appears on each result.
- **Metric or grade moved.** Usability (P3), Core function; finder_open -> unit_page_open >= 70 %; UXF-39..42.

### ux-flows-10: Unit, Story and Moment cards: cross-links (Profile, Follow, Ask, Share), no ids or ticks, labelled controls

- **Severity** high. **Effort** M. **Audit refs** H7, D2. **Depends on** ux-flows-01, ux-flows-06, ux-flows-18.
- **Evidence.** Unit panel shows the raw unit id under the name (pretty:97955), 'Recent Positions' with tick numbers (pretty:98031-98060), unlabeled share glyph (pretty:97964-97970), no link to the profile page, Follow, or Ask; story panel exposes 'Jump to tick' with a fast-forward glyph (pretty:98322-98340).
- **Root cause.** Cards were built as data dumps; the sub-pages that could deepen them are separate products with no link back.
- **Fix spec.** Section W6: Unit card actions [Follow] [Profile] [Ask about this] [Share]; hide ids; times from the canonical formatter; labelled controls; 'Not on the field at this moment' state with 'Jump to when it first appears'; Story card actions [Watch] [Ask] [Share], sources disclosure, 'n of m' pager; Ask opens the right-dock drawer with context prefilled.
- **Acceptance test.** Each action works from mouse, touch and keyboard; no string matching /^U-|^C-/ visible in the DOM text of cards; axe 0; T2/T3 flows use the card actions without hints.
- **Metric or grade moved.** Usability (P3, P5), discoverability of Ask/Profile; UXF-34, 45.

### ux-flows-11: Progressive disclosure: tiers, calm defaults on load, one card at a time, capped hints

- **Severity** high. **Effort** M. **Audit refs** H4, D2. **Depends on** app-bugs-10, app-design-10.
- **Evidence.** After entry legend, minimap, story panel, event card and toasts are all open (app-bugs-10 table: showLegend default true pretty:9417, minimap default pretty:9418); five components claim the top-right slot (app-bugs Appendix E); the tour Skip leaves the map at the step's tick (pretty:111856-111874).
- **Root cause.** No owner of what is open; every panel keeps local state and its own anchor.
- **Fix spec.** Section 5.10: tiers 0-3; defaults on first load (Key collapsed, Overview off < 1200 px, no story/event card open on load, toasts <= 3 with 4.5 s auto-dismiss and pause on hover/focus, Monuments off below zoom 14, HUD = clock chip only); right dock holds one card; ladder suggests the next tier once per session; 'New' dot for 14 days; mode differences (Classroom, Present, On-site).
- **Acceptance test.** Fresh load: count of open panels/cards = 0 and toasts = 0; jump to a moment opens at most one card (story preferred over event); toasts clear within 5 s under fake timers and hidden-tab throttling; Playwright over 200 random panel states shows no overlap of interactive rects.
- **Metric or grade moved.** Fit and finish C+/D+ -> A-, INP/CLS (fewer late-appearing cards); UXF-07, 31, 59.

### ux-flows-12: State catalog and StateCard: loading, empty, error, offline, permission, boot failure, retry

- **Severity** high. **Effort** M. **Audit refs** C7, S1, S2, S4, D1. **Depends on** app-design-26, app-bugs-04, app-bugs-06.
- **Evidence.** No error boundary: render error white-screens or leaves the splash forever (app-bugs-04); Help appears 1-2 s late with no state (D1); Ground Remembers blank ~3 s (S2); day data failures cached as loaded (app-bugs-06); sub-pages have no retry (pagesB-03); Regiment page opens as a lone search box over a floating footer (S1); Living Ledger starts at '4 casualties' (S4); Dashboard shows 'undefined' (C7).
- **Root cause.** States other than the happy path were never designed.
- **Fix spec.** Implement the 27-row catalog in section 5.11 as one StateCard component (variants loading/empty/error/offline/permission), ErrorBoundary with a text-version fallback, boot-failure path (state 2), per-fetch timeout/retry/ok-check wrapper on sub-pages, aria-busy skeletons with reserved height, polite status vs assertive alert rules, Retry focus management.
- **Acceptance test.** Playwright fault injection: block a day file -> 'We couldn't load July 3' with Retry (and not cached as loaded); throw in a component -> boundary card with 'Open text version'; offline -> banner; every row of the catalog has a test; axe 0 on each state; no state steals focus.
- **Metric or grade moved.** Reliability B-/C -> A-, UXF-29..33, RUM (fewer blank frames).

### ux-flows-13: Classroom and Present modes with a Teach hub: lessons, class link/QR, print kit, student edition, cite, no accounts

- **Severity** high. **Effort** L. **Audit refs** G1. **Depends on** ux-flows-01, ux-flows-05, ux-flows-06, pagesB-23, app-design-29.
- **Evidence.** No teacher surface (site-nav.js:12-58 has For Students only); education.html uses panel_summary (median Flesch-Kincaid grade 10.9 by a heuristic counter, 21 of 24 above 8, fk.py), its own palette (:20) and dead map links (:81); Watch Together needs typed ticks and a public WebRTC broker (watch-together.html:64,79,172); app type 9-11 px unreadable on a projector; privacy.html says the site is often used in classrooms and collects no personal information.
- **Root cause.** Classroom was a page, not a context; teacher tasks (prepare, project, distribute, print, cite) were never mapped.
- **Fix spec.** Section 6.6: /teach/ hub (60-second start, 3 lessons each with focus questions, vocabulary, handout, link, QR, /l/<slug> alias), Build your own (pl= playlist plus notes in the URL fragment so they never reach logs), Present (UI x1.35, captions >= 28 px, PageUp/PageDown/arrow clicker keys, B dim, Q QR), Classroom mode (type +12 %, 48 px targets, lesson bar, self-check questions not stored, third-party embeds off by default, Ask records-only), Student edition (level=student, grade <= 8 measured with a real tool), Cite this site, print kit; pilot Watch Together on 2-3 school networks or replace by link+QR. Preserve 'no accounts, no PII'.
- **Acceptance test.** T6: 4/5 teachers find lesson/Present within 180 s and the students' link opens on the same step; Present readable at 5 m in a classroom photo test; lesson link opens on a Chromebook with no third-party requests (network log); notes in #n= never appear in server logs; student summaries lint <= 8.0; print handout fits one page.
- **Metric or grade moved.** Usability (P1, P2), growth (teacher adoption); UXF-47, 48.

### ux-flows-14: On-site mode: Near me, GPS dot, 528 POIs, AR redesign with radar fallback, offline pack, portrait

- **Severity** high. **Effort** XL. **Audit refs** E1, H13. **Depends on** ux-flows-01, ux-flows-05, bundle-anatomy-03, bundle-anatomy-16, app-a11y-29.
- **Evidence.** No geolocation in the app region (grep zero in pretty:96209+); AR uses only 30 terrain places within 3 mi and a 70-degree field of view (ar.html:122-129), requests camera, location, then iOS motion in one async chain (ar.html:154-186), heading falls back to 360 - alpha (ar.html:142-150), rebuilds overlay.innerHTML on every orientation event (ar.html:120,151), HUD 11-12 px (ar.html:46-47); 16 stops with GPS/Street View (pretty:104096) and 512 monuments with lat/lon (pretty:104440) are unused by AR; sw.js never caches HTML (sw.js:72-75) or cross-origin tiles (sw.js:38); manifest orientation landscape (manifest.json:9).
- **Root cause.** On-site use was never a designed context; AR was built on the smallest place list.
- **Fix spec.** Section 6.7: Visit tab with Near me (explicit 'Use my location' tap, never on load; nearest 5 of 528 POIs + 30 places with distance and arrow; POI card: What happened here, Watch it happen, Street View, Directions, Save, Share); You-are-here dot and follow mode; POIs moved to JSON; AR sequence: Motion first inside the click handler, then Location, then Camera; graceful degradation to Radar (2-D) or a distance list; deviceorientationabsolute/webkitCompassHeading with smoothing and figure-eight calibration hint; persistent label elements via transform at <= 30 fps, <= 5 labels, tap for card; HUD >= 14 px; offline pack (shell, data, POI, index, park-bbox map) with status, persist(), estimate(); tile caching only after a licence check or with a self-hosted park extract; remove the landscape lock; Outdoor display option; battery saver; safety line; non-affiliation notice; demo location ?demo=lrt for testing.
- **Acceptance test.** On an iPhone and a mid-range Android at the park (or demo location): T7 4/5 reach 'What happened here' in <= 60 s; denying camera yields Radar, denying motion yields a list, denying location yields the stop list; offline pack: airplane mode then open the app and Near me works; portrait install keeps orientation; label jitter < 3 degrees RMS at rest [E]; battery drain measured over a 15-minute session and reported.
- **Metric or grade moved.** Usability (P4), Core function (mobile), Performance on mobile; UXF-37, 49..52.

### ux-flows-15: Text and Lite route: Battle Chronicle, skip link, data-saver/no-WebGL fallback, upgrade in place

- **Severity** medium. **Effort** M. **Audit refs** E4, P1. **Depends on** ux-flows-05, app-a11y-08, app-a11y-12, app-a11y-15.
- **Evidence.** Keyboard/SR users cannot pass the first gate (app-a11y §1 fact 2); the map is a canvas with no alternative (fact 3); #seo-content sits under the splash and is removed on mount (index.html:717-741, :424-426) and is a crawler-only block (E4); Lighthouse mobile transfer 1,577,215 B, >= 31.5 s of pure transfer at 400 kbps (J10) with only an indeterminate bar (index.html:117-127).
- **Root cause.** No text-first path; the only content that exists before the app loads is hidden.
- **Fix spec.** Section 5.13: static, indexable Battle Chronicle generated from moments.json (H1 page, H2 chapters, H3 moments; summary, Read more, Open on map, Ask about this; Data View per moment); entry points: first-Tab skip link, More > Text version, ?view=text, automatic on saveData/2g/3g or after 6 s without map-ready, WebGL failure, noscript; persistent 'Load the interactive map (about 1.6 MB)' upgrade keeping the current moment; page < 100 KB; replaces #seo-content.
- **Acceptance test.** JS disabled: chronicle reads end to end; screen reader: first Tab stop is the skip link and headings traverse chapters; Lighthouse mobile performance and accessibility >= 98 on the chronicle; LCP <= 1.5 s on Fast 4G; upgrade keeps the moment.
- **Metric or grade moved.** Accessibility D -> B+ (entry), SEO/growth, Performance on slow networks; UXF-54, J8, J10.

### ux-flows-16: Naming and copy pass: honest names, no jargon, no dev-log voice, no 'AI-style', non-affiliation notice

- **Severity** medium. **Effort** M. **Audit refs** H7, H8, H9, H10, E2. **Depends on** ux-flows-04, ux-flows-22.
- **Evidence.** Rename and copy tables in 5.8 and 8.2: 'Explore' collision (site-nav.js:14,169); 'Tick 267/675' (pretty:112357); '1x (real time)' (pretty:97429); banner 'AI-style historian' (index.html:377) vs 'not a live AI model' (historian.html:48); dev-log sentences (ar.html:56, viewshed, dashboard note); raw ids and 'Commander unrecorded' (search.html:112); 'NPS Auto Tour' for a non-NPS tour (app-bugs-27) with no non-affiliation statement (grep zero).
- **Root cause.** Copy was written during development and never edited as product voice; feature names were coined per feature.
- **Fix spec.** Apply the tables in 5.8 and 8.2 through one strings file (or the tool registry/moments data) so counts come from facts; edit site-nav.js GROUPS labels/descriptions and index.html copy now (no app patch needed); app strings via the tranche-0 patch or the R1 port; add the footer/About non-affiliation sentence (owner confirms it is true); run a copy read-through with the owner in the museum voice.
- **Acceptance test.** grep of deployed HTML/JS finds none of: 'Tick ' in user text, 'AI-style', 'real time' next to 1x, 'undefined', 'alias for', 'Earlier drafts', 'haven't been able to do from here'; tree-test labels match the final names; non-affiliation text present on footer and About.
- **Metric or grade moved.** Fit and finish, Usability (comprehension), trust; UXF-06, 12, 13, 34, 46.

### ux-flows-17: Help and documentation IA: task-based Help, in-context hints, keyboard sheet from the registry, guide in sync

- **Severity** medium. **Effort** M. **Audit refs** G1, D1. **Depends on** app-bugs-13, ux-flows-04.
- **Evidence.** Help modal has two tabs, Keyboard Shortcuts and About (helpmodal chunk strings); the manual is a PDF surfaced as a 12 px gold top-bar button 'Download Website Tutorial PDF' (pretty:113115-113132); guide says Esc closes any panel and describes Street View panoramas (G1); Help lists 'H = heatmap' that does nothing (app-a11y notes); About says '445+ units' (H10).
- **Root cause.** Help, guide, toolbar and mobile sheet are four hand-written lists (app-bugs-13).
- **Fix spec.** Help modal tabs: Start here (task cards: watch, find, ask, visit, share, teach), Shortcuts (generated from the registry), About and sources, Accessibility, Contact and Report a problem; 'Replay the 20-second intro' and '60-second tour'; PDF becomes a link inside Help with correct Content-Disposition behaviour; guide text generated from the same registry and facts; loading state (D1).
- **Acceptance test.** Help opens < 300 ms or shows a skeleton; shortcut table equals the registry (test); every tool in the registry appears in Help and the guide build; counts equal facts; PDF is reachable from Help.
- **Metric or grade moved.** Documentation B -> A, Usability; UXF-17.

### ux-flows-18: Ask the Historian UX contract: contextual entry, answer cards with citations and coverage, drawer, thread, opt-in question log

- **Severity** medium. **Effort** M. **Audit refs** H8. **Depends on** ux-flows-01, ux-flows-03, ux-flows-19.
- **Evidence.** Answers paste whole vignettes (median 293 words, historian.html:109), the newest bubble scrolls under the sticky input (historian.html:35,174), only 5 static suggestion chips (:147), chronology answers have no source link (:124), banner says 'AI-style' (index.html:377), Ask exists only on a separate page and as a corner pill; the Historian is the most-visited feature page in Netlify's top-15 list (110 combined pageviews).
- **Root cause.** Historian was built as a keyword lister with a chat skin; no interface contract, no entry from context.
- **Fix spec.** Section 6.4: stable ask() interface {mode, answer{summary,bullets}, citations[], coverage, followups[], confidence}; answer card with numbered citation chips to working permalinks, coverage line, follow-up chips, 'Show sources', local helpful vote, Report an error; entry points: header field, Ask tab, 'Ask about this' on cards, palette Shift+Enter and auto Ask row, permalink pages; right-dock drawer on the map; last 10 exchanges in sessionStorage; input never covers content; opt-in 'Send this question' (mailto or Netlify Form) to build the unanswered-question log; Classroom mode: external model off by default and disclosed. Retrieval design stays with the historian specialist.
- **Acceptance test.** T3: 4/5 restate one reason with a named source in <= 90 s; every citation opens the right record; last answer fully visible above the input at 320 px; no-answer state offers alternatives; unanswered-question log receives only opted-in text.
- **Metric or grade moved.** Usability (P6, P1), trust; ask_citation_open >= 30 %; UXF-44..46.

### ux-flows-19: Quick fix: Historian chronology answers render the literal word 'undefined' (137 of 137)

- **Severity** high. **Effort** S. **Audit refs** new. **Depends on** nothing.
- **Evidence.** historian.html:119 builds search text from e.title/e.description/e.location and :123 renders e.description || e.title, but chronology events have keys tick, time, event, units_involved, location, significance (chronology_day1.json). Simulation over all 137 events (tmp-ux-flows/hist_undefined.js): 137 of 137 rendered answers end with ': undefined', e.g. 'Day 3, 11:45am — South of The Angle: undefined'. Because text is built only from location, chronology also matches only on place names.
- **Root cause.** Schema mismatch between the page and the data file.
- **Fix spec.** In historian.html use e.event: text = `${e.event} ${e.location||''} ${(e.units_involved||[]).join(' ')}`; render html = `<b>Day ${day}${e.time?', '+e.time:''}${e.location?' — '+e.location:''}:</b> ${e.event}`; add srcHref '/?tick='+e.tick (becomes v= or tick= per ux-flows-01) with label 'See this moment on the map'. Add a unit test that renders every corpus entry and fails on /undefined|null|NaN/.
- **Acceptance test.** Script renders all 137 chronology entries with none matching /undefined/; a query for 'Herbst Woods' returns event text; the same lint runs on regiment, vignette and terrain entries.
- **Metric or grade moved.** Reliability, trust (H9), Usability; UXF-43.

### ux-flows-20: Shortcut and Esc contract with discoverability: registry-driven, hints on desktop, none on touch

- **Severity** medium. **Effort** M. **Audit refs** H2, D2. **Depends on** app-bugs-09, app-a11y-06, ux-flows-04.
- **Evidence.** Bare-letter shortcuts fire without modifier checks and ignore only INPUT targets (pretty:112966-113052); '1/2/3' set the tick without loading or framing (pretty:112987-113010); Esc ignored inside inputs and does not clear pinned units (pretty:112967, :97909 vs :113034); Help lists a dead H shortcut; shortcuts are unseen on screen and 'Power User: keyboard shortcuts' is offered on touch (pretty:111814).
- **Root cause.** One hand-written global handler; no registry; no on-screen affordance.
- **Fix spec.** Registry-driven shortcuts (app-bugs-09, app-a11y-06) plus UX: show key hints in tooltips and palette rows on (hover:hover) devices only; '?' opens the cheat sheet; Esc stack (clear text, close top overlay, clear selection, exit tool); 1/2/3 = jump to day and frame; ] and [ = next/previous moment, , and . = step (proposal to reconcile with the registry); guard for modifiers, editable targets, dialogs and focused buttons; no shortcut text on touch.
- **Acceptance test.** Keyboard matrix test (input, select, dialog, button, Ctrl/Alt/Meta) passes; Esc order test; cheat sheet equals registry; touch emulation shows no shortcut copy; ] and [ move between marker moments.
- **Metric or grade moved.** Usability (P5), Accessibility; UXF-55.

### ux-flows-21: Measurement: two-week baseline, privacy-safe event taxonomy, web-vitals attribution, dashboards, experiments

- **Severity** medium. **Effort** M. **Audit refs** P1. **Depends on** bundle-anatomy-06, ux-flows-22.
- **Evidence.** No click analytics; privacy.html promises no third-party analytics beyond Netlify RUM; RUM is Poor on LCP, INP, CLS, FCP with no attribution or device split; Netlify pageviews give /index.html 86 views and per-page counts only; Lighthouse never passes the gates so it cannot measure the map (lh_mobile.json).
- **Root cause.** No measurement design, so nothing can prove a fix worked.
- **Fix spec.** Section 9: baseline collection first; event taxonomy (9.3, no PII, no raw text, in-memory session id, DNT/GPC honoured); option 1 first-party Netlify Function with daily aggregates or option 2 a privacy-focused hosted tool after a legal read (vendor claims unverified here); web-vitals attribution build reporting LCP element, INP target and phase split, CLS sources segmented by layout/first-vs-return/mode/network; custom marks time_to_map_interactive and time_to_first_play; weekly KPI review, monthly unanswered-question review; experiments with sample-size arithmetic; update privacy policy (X5) and add a 'How we measure' page.
- **Acceptance test.** Baseline dashboard live before Phase 1 ships; every event in 9.3 fires in a Playwright run with the expected properties and no text fields; GPC on -> zero events; privacy page updated; p75 CWV visible by mobile/desktop.
- **Metric or grade moved.** Enables verification of every grade and green-metric claim; Performance visibility.

### ux-flows-22: Research program: card sort, tree test, first-click, three rounds of five-user moderated tests, ongoing loops

- **Severity** medium. **Effort** M. **Audit refs** new. **Depends on** nothing.
- **Evidence.** No user research exists; every completion/time figure in this report is a prediction from code (evidence grade E); persona weights are unknown (no device split).
- **Root cause.** Design decisions have been made by the builder without observing users.
- **Fix spec.** Section 10: Week 1 unmoderated closed card sort (15-20), tree test (20, 10 tasks) and first-click (20); moderated rounds of five (Round 0 baseline on today's site or a 3-user reduced baseline; Round 1 after Phase 1; Round 2 after Phases 2-3) with the same nine tasks, consent and minor-safety rules, hint ladder, observer sheet, SUS and SEQ; gates in 9.7; monthly and quarterly loops; spring classroom pilot; on-site field test before July.
- **Acceptance test.** Card sort >= 70 % agreement on >= 15 of 20 cards; tree test >= 80 % success on >= 8 of 10 tasks; each round produces the top-10 problem report and the task table; a round passes when the section 9.7 targets are met; SUS mean >= 80 by Round 2.
- **Metric or grade moved.** Confidence in Usability grades; feeds ux-flows-04, 13, 14.

### ux-flows-23: Map-mode convergence roadmap: Compare, Camera, Heat map, What-if, Sightlines, Sound, Human cost, Video as views of one map

- **Severity** medium. **Effort** XL. **Audit refs** S2, S3, P2. **Depends on** ux-flows-01, ux-flows-04, bundle-anatomy-18, app-design-02.
- **Evidence.** Eight sub-pages each create their own Mapbox map (second 1.8 MB copy from the CDN, bundle-anatomy-18) and re-fetch data; none read the map's state (pages-outline.txt); Compare defaults ticks 60 vs 300 (compare.html), Cinematic Export defaults 540-600, Camera uses its own director algorithm (camera.html:105-141).
- **Root cause.** Features were added as pages to avoid touching the un-editable bundle (N1).
- **Fix spec.** Interim (S-M, no app change): every mode page accepts the state contract (?tick=&unit=&tick2=&at=), shows a 'Back to the battle at <moment>' link and a 'Open this moment in the map' button, and uses the shared header. Target (XL, after source is recoverable): a view switcher in the map (Live, Compare split, Heat map layer, What-if lab, Sightlines lab, Follow camera, Sound toggle, Human-cost HUD, Record clip) sharing one map instance, store and data; retire the duplicate maps.
- **Acceptance test.** Interim: every mode page round-trips a state (open from the map at a moment, return to the same moment); Target: one canvas element in the map view in every mode (document.querySelectorAll('canvas.mapboxgl-canvas').length == 1); no second Mapbox script request; each view has a permalink.
- **Metric or grade moved.** Performance (one map, less JS), Usability (P5), Fit and finish; UXF-16, 23.

### ux-flows-24: Playback UX: Story pace, previous/next moment, quiet-stretch skip, honest speed labels, chapter chips, marker buttons

- **Severity** medium. **Effort** M. **Audit refs** H9, D3. **Depends on** ux-flows-05, app-bugs-21, app-bugs-33, app-a11y-07.
- **Evidence.** Markers are 8 x 8 px divs with title only and none on mobile (pretty:112270-112293); transport has only +-1 tick and +-12 ticks (pretty:112324-112356); '1x (real time)' is 2 ticks/s (pretty:97429, app-bugs-33); playback never pauses at narrative cards; Day 1 ticks 101-225 have no events (section 6.5).
- **Root cause.** Transport was designed for scrubbing, not for story pacing.
- **Fix spec.** Section 6.3: Pace segmented control (Story | Continuous); Story = 1x, auto-pause at 45 critical events for <= 4 s or Space, skip event-free runs >= 20 ticks at 8x with a 'Jump back' toast; Previous/Next moment buttons; ',' and '.' fine step, long-press on mobile; speed ladder labelled '1x: 10 battle minutes per second'; chapter chips (mobile) and bands (desktop); markers as buttons with 24 px (44 px touch) hit areas and accessible names; aria-valuetext 'Day 3, Pickett's Charge'; time chip from the canonical clock.
- **Acceptance test.** Story mode runs Day 1 without silent stretches over 20 ticks (skipped) and pauses on every critical event; manual scrub cancels auto-pause; marker buttons pass axe and target-size; T2 in tests <= 30 s desktop, <= 45 s phone; whole-battle Story run measured (target about 9 minutes).
- **Metric or grade moved.** Usability (P6, P1), Core function; UXF-20..22, 59.

### ux-flows-25: Content permalink pages with unique share cards for moments, units, places and stops

- **Severity** medium. **Effort** L. **Audit refs** T1, E5. **Depends on** ux-flows-05, ux-flows-01, N1.
- **Evidence.** One og:image (screenshots/day3.png) and near-identical metadata on every page (index.html:21, pagesB-09); only ~8 % of referrals are from search (Netlify PDF); shared URLs are query-state only and cannot carry unique previews.
- **Root cause.** The app is a single URL; there are no per-entity pages.
- **Fix spec.** Section 5.6.9: generate /moments/<slug>/ (24), /units/<slug>/ (467), /places/<slug>/ (30), /stops/<n>/ (16) from the JSON at deploy time: unique title/description/canonical/JSON-LD, summary and sources, big 'Watch it on the map' (view permalink), 'Ask about this'; 1200x630 share card (template first, map crops later); sitemap entries; view permalinks canonicalise to /. Owner: seo specialist for generation.
- **Acceptance test.** Each page has a unique title and og:image; social-preview validators render the card; Lighthouse SEO 100 and performance >= 95; sitemap lists all; 'Watch it on the map' restores the state (ux-flows-01).
- **Metric or grade moved.** SEO/growth (T1), shareability, Usability; UXF-27.

### ux-flows-26: Fill the Day-1 afternoon silence and other quiet stretches with sourced moments

- **Severity** high. **Effort** L. **Audit refs** C4. **Depends on** ux-flows-05, app-time.
- **Evidence.** Ticks 101-225 (125 ticks, 56 % of Day 1, 18.5 % of the battle) have no chronology event and no vignette; the last Day-1 event is tick 100 and the next is 226; Turning Points anchors tick 175 (Ewell's decision) to nothing; gaps between vignette triggers: 57 to 240 (183), 326 to 460 (134), 568 to 675 (107); Day 3 ticks 576-675 have 5 events and a 29-tick run (chapters.py, moments_xref.py).
- **Root cause.** Content was authored around the dramatic moments; the collapse and retreat of Day 1 afternoon has no record in the data.
- **Fix spec.** Owner and a historian author 5-8 moments for chapter 4 (afternoon assaults on McPherson's and Seminary Ridge, collapse north of town, retreat through the streets, rally on Cemetery Hill, Ewell's discretionary order), each with sources and a tick anchored to the animation; fill Day 3 chapter 13 similarly; until then Story mode skips and the timeline/chronicle state 'No recorded events in this stretch'. Machine-derived 'what changed' digests only after accuracy review and clearly labelled.
- **Acceptance test.** No run of >= 20 event-free ticks remains in Day 1; every new moment passes the moments lint (keyword within +-3 ticks of a chronology event) and has >= 1 source; owner/historian sign-off recorded.
- **Metric or grade moved.** Content depth A- -> A, Historical consistency, Usability (dead air); UXF-21.

### ux-flows-27: UX release gate: heuristic and cognitive-walkthrough checklist per release; friction register kept alive

- **Severity** medium. **Effort** S. **Audit refs** new. **Depends on** ux-flows-22, app-design-34.
- **Evidence.** No UX or acceptance checklist exists; regressions (dead links, gates, dead tiles) shipped repeatedly (deploy-history.md); one solo developer.
- **Root cause.** No definition of done that includes user-facing flows.
- **Fix spec.** One-page gate applied to every release: the 11 journeys run as Playwright smoke flows (J1 to J11 minus on-site), a 10-heuristic self-check on changed surfaces, a 4-question cognitive walkthrough for any new flow, the friction register updated (UXF ids closed or opened), and the copy grep list from ux-flows-16; failing any severity-4 item blocks release.
- **Acceptance test.** The gate is in the repo and CI; a deliberately broken link, an added gate and a new 'Tick' string each fail it.
- **Metric or grade moved.** Sustains A+ grades; regression prevention.

### ux-flows-28: Trust layer: per-moment sources, data version and 'Updated' line, Report a problem, public corrections log, Sources and method

- **Severity** medium. **Effort** M. **Audit refs** G1, H7. **Depends on** ux-flows-05, ux-flows-16.
- **Evidence.** The site's only feedback route is a footer mailto (site-nav.js:194); the map shows no sources per moment or data version; history/clock contradictions (C3/C4) are visible to the audience most sensitive to them (P5, P3); no non-affiliation statement while using 'NPS' names (grep zero).
- **Root cause.** No provenance surface and no correction loop.
- **Fix spec.** Section 8.3: Report a problem dialog (categories, <= 500 chars, optional reply email, read-only permalink and version) via mailto first, Netlify Form later (update the privacy page); /corrections public log (date, change, source); 'Updated <date>' and Sources disclosure on every moment and unit page; Sources and method page (what is modelled vs sourced, how ticks map to time, known limits); footer non-affiliation sentence.
- **Acceptance test.** Every moment card shows Sources (>= 1) and an Updated date; Report opens with permalink and version prefilled and sends nothing else; /corrections lists changes; method page linked from Ask, Help and footer.
- **Metric or grade moved.** Trust, Documentation, Historical credibility (P5, P3, P2); UXF-57, 58.



---

## 12. Phasing, dependencies and effort

Effort classes: S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d; midpoints S 0.25, M 1, L 3.5, XL 8 give **about 62 developer-days** for all 28 findings (three S, fourteen M, nine L, two XL) as one solo developer would do them, **before** overlap with the sibling plans (`app-design`, `app-a11y`, `app-bugs`, `bundle-anatomy`), which carry much of the same code work (shell, dialogs, registry, service worker). Treat the UX items as *specifications for those builds* plus the pieces that only UX owns: the state contract, moments data and chapters, palette, Teach hub, On-site mode, text route, research and metrics.

**The decision that gates the code (N1).** There is no editable source for the map (`BRIEF` N1). Everything that must change inside the React app (gates, reader, palette, share sheet, cards, tools rail, states, Near me) depends on either the validated hot-patch route (R0, usable only for small string-level changes) or the port to readable source (R1, `app-bugs` foundation, 8-12 d). Items marked *static* below need neither: they are edits to sub-pages, `site-nav.js`, `netlify.toml`, data files and new static pages.

| Phase | Weeks | Contents | Type | Gate to exit |
|---|---|---|---|---|
| **P0 Quick wins and groundwork** | 0-1 | ux-flows-19 (undefined fix); ux-flows-07 phase 0 (10 hrefs to `/`, history rule); ux-flows-16 (site-nav names and descriptions, index banner copy, sub-page copy, non-affiliation line once the owner confirms it is true); ux-flows-05 phase 0 (`moments.json` v0 and the six wrong Turning Points anchors); `/index.html` 301; manifest orientation; ux-flows-22 (card sort, tree test, first-click); ux-flows-21 baseline collection; ux-flows-27 gate draft | static | grep list clean; tree test >= 80 %; baseline dashboard live |
| **P1 Front door and state** | 2-5 | ux-flows-01 (state contract, reader), 02 (remove gates, guided moment), 08 (resume), 11 (disclosure defaults), 12 (states, boundary), 06 (share sheet), 24 partial (marker buttons, next/previous moment, chapter chips), 20 partial (Esc stack) | app (R0 or R1) | Moderated Round 1 (5 users): T1, T2, T5, T8 targets met; keyboard-only can enter |
| **P2 One product** | 5-9 | ux-flows-03 (palette), 04 (global header and IA), 09 (finder), 10 (cards), 15 (text route), 17 (Help), 18 (Ask contract), 28 (trust layer), 25 (permalink pages) | app plus static | Round 2 (5 users) tasks T3, T4 met; SUS >= 80 |
| **P3 Contexts and depth** | 9-16 | ux-flows-13 (Classroom, Present, Teach), 14 (On-site), 23 (mode convergence, interim then target), 26 (author the missing moments), 24 remainder (Story pace), 20 remainder | app plus content | Round 2 completion; classroom pilot with 2-3 teachers; on-site field test |

**Calendar anchors (proposals).** Fall term is now: ship the classroom kit (P3 subset: 3 lessons, Present, print) by early November (Remembrance Day, November 19, is seven weeks away). The battle anniversary (July 1-3) is nine months away: have On-site mode field-tested by early June 2027. Both are seasonal traffic peaks the site has no data for yet; the baseline (ux-flows-21) will show whether they are real.

**Critical path.** `N1 decision` to `R1 shell` (`app-design-02`) to `ux-flows-01` (state) plus `ux-flows-05` (moments) to `ux-flows-02/03/04/06` to `ux-flows-13/14`. Independent tracks that can start now: P0 static items, research (`ux-flows-22`), content authoring (`ux-flows-26`, `ux-flows-05` copy, lessons), the metrics endpoint.

**What can be verified without users.** Every acceptance test in section 11 has an automated or scripted form (Playwright, axe, link crawler, lint, fault injection). User-facing success (completion, time, SEQ, SUS, trust) needs the moderated rounds in section 10; do not claim an A+ usability grade before Round 2 passes.

### 12.1 Traceability: audit ids to findings

| Audit id | Where this plan addresses it |
|---|---|
| C1, C2 | W2 layout rules; `app-bugs-11/12`; ux-flows-04, 11 |
| C3, C4 | ux-flows-05 (single source, `dv`), 26, 28; time specialist |
| C6 | ux-flows-02 (no reload path for first-run) with `bundle-anatomy-01` |
| C7 | ux-flows-12 (state catalog row 16) |
| H1 | ux-flows-04 (overlay removed; header) |
| H2 | ux-flows-20 |
| H3 | ux-flows-02, 08 |
| H4 | ux-flows-11 |
| H5 | ux-flows-03, 09 |
| H6 | ux-flows-04 |
| H7, H8, H10 | ux-flows-16, 18 |
| H9 | ux-flows-24 |
| H13 | ux-flows-14 |
| D1 | ux-flows-12, 17 |
| D2, D3, D4 | ux-flows-11, 20, 24, 04 |
| S1, S2, S4 | ux-flows-12 |
| P1, P2 | ux-flows-21, 15, 23 |
| E1, E2, E4, E5 | ux-flows-14, 16, 15, 25 |
| T1, T3 | ux-flows-25, 01, 07 |
| X5 | ux-flows-21, 28 (privacy page updates) |
| G1 | ux-flows-17, 28 |
| A6 | ux-flows-02 |
| N1 | dependency for every app change |

### 12.2 Journey to friction to finding

| Journey | Frictions | Findings |
|---|---|---|
| J1 First visit | UXF-01..08 | 02, 11, 15, 16 |
| J2 Returning | UXF-01, 03, 26 | 02, 08 |
| J3 Jump to Pickett's | UXF-19..22, 24, 36, 59 | 01, 03, 05, 24, 26 |
| J4 Ancestor | UXF-39..42 | 03, 09 |
| J5 Share | UXF-24..28 | 01, 06, 25 |
| J6 On-site | UXF-37, 49..52 | 14 |
| J7 Classroom | UXF-47, 48 | 13 |
| J8 Screen reader | UXF-53, 54 | 02, 15 |
| J9 Keyboard | UXF-53, 55, 56 | 02, 04, 20 |
| J10 Slow 3G | UXF-01, 33 | 15, 12, 21 |
| J11 Ask | UXF-43..46 | 18, 19, 10 |

---

## 13. Risks, assumptions to validate and open questions

**Risks and mitigations**
1. *App patch fragility (N1).* Any change to the minified bundle is tied to one hash; mitigate by sequencing P0 static work first and building P1+ on R1 source (`app-bugs` foundation).
2. *Map-tile caching licence.* Offline maps may not be allowed with the current provider's terms (not verified here); mitigate with a licence check or a self-hosted park extract; do not ship tile caching before that.
3. *Scope creep for one developer.* 28 findings; mitigate with the phase gates, the shared registry/moments/URL contract (each removes duplicate work) and by dropping "mode convergence" (23) to the interim state if time runs out.
4. *Privacy regression.* Measurement, share cards, feedback forms and any external model touch the "no personal data, classroom safe" promise; mitigate with 9.4 rules, a privacy-page update before each and a review checklist in ux-flows-27.
5. *Content bottleneck.* Chapter names, captions, lessons, chapter-4 moments and student summaries need a historian's review; mitigate by using the site's own text and sources, tagging everything `reviewed_by`, and shipping Story mode's quiet-stretch skip as the interim.
6. *Browser quirks.* iOS Safari (motion permission gesture, `toBlob` of the map canvas, storage eviction), Chromium-only `navigator.connection`, Web Share support; mitigate with feature detection and the device matrix in the QA plan; the iOS motion-permission ordering claim is **[I]** until tested on a device.
7. *Test power.* A/B tests at about 35 first-time visitors a day are slow; mitigate with moderated rounds for decisions and A/B only for the two or three questions where it matters.
8. *Palette performance and accessibility.* Combobox semantics are easy to get wrong; mitigate with the golden set, axe and NVDA/VoiceOver scripts (ux-flows-03).

**Assumptions to validate (each maps to a test in section 10).**

| # | Assumption | Test |
|---|---|---|
| A1 | Most visitors are on desktop but a large minority on phones (unknown split) | baseline event `layout_resolved` |
| A2 | The 20-second Pickett's Charge moment beats no intro and beats First Shot | A/B, T1 |
| A3 | The five destinations match visitors' mental model | card sort, tree test |
| A4 | Teachers can use link plus QR and school networks allow map tiles (and, separately, WebRTC) | classroom pilot |
| A5 | On-site signal is weak enough to need offline | field test; ask in T7 debrief |
| A6 | Descendants search by regiment number and state, not by commander | T4, unanswered log |
| A7 | Auto-resume with a Start over chip is preferred to a banner | `resume_start_over` rate |
| A8 | Flesch-Kincaid grade of the current student text is above grade 8 | run a real readability tool on `student_summary` |
| A9 | Story pace makes the battle about 9 minutes and is preferred by first-timers | T1/T2 observation, SEQ |
| A10 | The 6 wrong Turning Points anchors are content errors, not intentional "lead-in" anchors | owner/historian review (Appendix A) |

**Open questions for the owner**
1. Approve removing the layout chooser, onboarding modal and fake fast-forward (D1), and choose the default 20-second moment (Pickett's Charge recommended; First Shot alternative).
2. Approve the five-destination IA and labels after the card sort and tree test (D4).
3. For the clock fix (C3/C4): relabel only, or re-time the data? This decides whether `dv` migrations map ticks (5.6.7).
4. Measurement route (D6): first-party aggregate endpoint or a hosted privacy-focused tool; comfortable with a privacy-policy update?
5. Do you have two or three teachers for a classroom pilot, and is "no accounts, ever" a permanent principle?
6. Is "an independent project, not affiliated with or endorsed by the National Park Service" a true statement for the site? (I cannot verify it.)
7. Who reviews chapter names, captions, lesson text and the missing Day-1 afternoon moments (a named historian or a trusted reader)?
8. Offline map: willing to self-host a park extract, or check and accept the current provider's terms?
9. Watch Together: keep the peer-to-peer broker feature, or replace it with link plus QR and Present?
10. Light theme and Student edition: merge into one design system (`app-design` Q-1, Q-2)?
11. Budget for participant incentives and one paid AT session per round?
12. Spanish (or other language) for classrooms: in scope later?
13. Sound: remove, or rebuild (`app-bugs` Appendix L, Q1)? It decides whether "Sound" appears in the Battle views.

---

## Appendix A. Moment-list cross-reference [C] (`tmp-ux-flows/moments_xref.py`, chronology from `data/chronology_day*.json`)

"chronology@N" is the event at that tick (or the nearest, with the offset). Vignette titles are those whose `trigger_tick` equals the tick. Times in brackets are the data's own labels (known unreliable, C4) and are shown only to identify events.

**Turning Points** (`turning-points.html` POINTS)

| Turning point (as titled) | Tick | Chronology at that tick | Vignette at tick | Lands on the named moment? |
|---|---|---|---|---|
| Buford's Decision to Stand | 1 | @1 [5:00am] "Both armies on the march. Buford's Union cavalry occupies Gettysburg." | none | plausible (opening) |
| Ewell's Discretion on Cemetery Hill | 175 | none; nearest @226 (+51) "Both armies consolidate overnight positions" | none | **no** |
| Longstreet's Delayed Attack | 240 | @240 [6:10am] "Berdan's sharpshooters ... sent into Pitzer's Woods" | Berdan's Reconnaissance | **no** (Longstreet's assault begins @256) |
| Chamberlain's Bayonet Charge | 267 | @267 [8:25am] "Vincent's brigade arrives on Little Round Top" | Vincent and Little Round Top | **no** (charge is @275, vignette V-010) |
| Collapse at the Wheatfield and Peach Orchard | 300 | @300 [11:10am] "Bigelow's Trostle Farm withdrawal" | Bigelow's Last Stand | partial (adjacent event) |
| Night Assault on Culp's and Cemetery Hill | 340 | @340 [2:20pm] "Fighting dies down across the battlefield" | none | **no** |
| Culp's Hill Retaken | 460 | @460 [5:45am] "Colgrove's controversial charge. Mudge's 2nd Massachusetts..." | Mudge and the Charge at Culp's Hill | yes |
| The Cannonade and Its Effect | 540 | @540 [11:15am] "Union artillery opens ... as the Confederate line advances" | none | **no** (cannonade begins @518) |
| Pickett's Charge and the Decision to Attack the Center | 560 | @560 [12:55pm] "EAST CAVALRY FIELD. Stuart's cavalry..." | none | **no** |

**Scrubber markers** (`TO`, `pretty:112192-112200`): all 8 land on an event at their exact tick (17 Calef opens fire; 28 Reynolds killed; 52 Rodes attacks; 267 Vincent arrives; 302 1st Minnesota's charge; 518 The cannonade begins; 538 Pickett's Charge begins; 551 Armistead leads men over the wall). Note "First shot" is marker 17 (Calef) while the vignette "The First Shot" is tick 12.

**Onboarding tour** (`Gc`, `pretty:111819`): ticks 1, 17, 28, 267, 538 all land on events; the step titled "The Crisis at Little Round Top" lands on Vincent's arrival, not the charge.

**Event-density facts** [C]: 137 events (45 critical, 73 high, 16 medium, 3 low); Day 1: 42 events, all at ticks 1-100; Day 2: 49; Day 3: 46; 24 vignettes: 6 on Day 1 (ticks 12-57), 8 on Day 2 (240-326), 10 on Day 3 (460-675); V-019 and V-023 share tick 556.

## Appendix B. Legacy URL and storage inventory (for migration)

| Scheme | Producers | Reader | Migration |
|---|---|---|---|
| `?t=&u=&z=&ll=` | app `$k` (`pretty:97821-97829`), bookmarks (`:97862`) | none | accepted as aliases (`t`,`u`,`z`,`ll`) |
| `?ancestor=` | Follow share (`pretty:101225`) | `pretty:101019` (only when the panel is mounted) | alias of `follow` |
| `?tick=&vignette=` | documentary, education, historian, search, embed, turning-points (`?tick=` only) | none | use `v=` (tick derived); still parse both |
| `?unit=(&tick=)` | search, regiment | regiment.html only | canonical `unit=` |
| `?lat=&lng=` | search locations (`search.html:139`) | none | alias for `at=lat,lng` |
| `/index.html` path | 10 back links; 86 views/30 d | serves map | 301 to `/` |
| `?layout=mobile|desktop` | none today | none | map to `compact|full` |
| localStorage `gtbg_onboarded`, `gtbg_prefs`, `gettysburg_bookmarks`, `gtbg-ef-hidden`, `gtbg_watch_together_tour` | app, index.html, watch-together | same | migrate to `gb.v2.prefs` and the bookmark schema with `dv`; delete `gtbg-ef-hidden` with the overlay |

## Appendix C. Files and scripts produced (scratch only)

`plan-work/tmp-ux-flows/`: `pages-outline.txt` (structure of every sub-page), `netlify-pdfs.txt` (text of the two Netlify PDFs), `fk.py` (reading-level and coverage heuristic), `moments_xref.py` (moment-list cross-reference), `hist_undefined.js` (historian chronology rendering simulation), `chapters.py` (chapter table and Story-mode arithmetic), `index_size.py` (search-index size prototype), `findings.py` and `findings.json` (generator for section 11), `part-*.md` (report parts).



## Verification

Adversarial verifier pass (read-only; live `curl`, `bundle.pretty.js`, DEPLOY_DIR files, data files re-computed). Verdicts: CONFIRMED / CORRECTED / REFUTED / UNVERIFIABLE. Nothing was refuted: the evidence (line numbers, snippets, counts) held up almost everywhere; the corrections are mostly about hidden dependencies and fix mechanics.

**Evidence spot-checks that held (re-run by the verifier).** `$k` share builder `pretty:97821-97829`, `window.prompt` `:97932`, unit id `:97955`, only URL reader `:101019` (Follow-panel `?ancestor`; the URL is built at `:101117`, the button is `:101225`); no `navigator.share` and no app-level `geolocation` (only Mapbox internals `:94853-95434`); splash `tO` 800 ms + `eO=3500` + 600 ms (`:101471-101590`), skip `<div>` 11 px `#444` (`:101670-101677`); chooser `dO` divs (`:102752-102815`); `useState(null)` layout and `gtbg_onboarded` (`:112949-112951`); keyboard handler ignores only `INPUT` (`:112967`) and has no modifier check; 13 toolbar buttons (`:113145-113240`), 14 mobile tiles (`:103385-103490`); 8 scrubber markers (`:112192-112201`), 5 tour steps (`:111818`); `index.html` lines 21, 117-127, 285, 377, 424, 717, 6-candidate mover 528-545; 10 pages with `href="/index.html"` (exact list matches); `historian.html:119/123` (`e.description || e.title`); `site-nav.js:14,169,194,212`; `sw.js:38,72-75`; `manifest.json:9`; `ar.html` chain; Netlify PDF numbers (86, 110 = 68+42, 2,034/2,221 = 91.6 %, search 173/2,221 = 7.8 %); Lighthouse transfer 1,577,215 B (31.5 s at 400 kbps arithmetic correct); vignette gaps 183/134/107; no chronology event in ticks 101-225 (last Day-1 event 100, next 226); 45 critical events; 137 events with unique ticks; chapter-table counts sum to 24 vignettes and 137 events; monument bbox (512 monuments, lat 39.777-39.853, lng -77.286 to -77.163); mapbox-gl 3.24.1 = 1,796,551 B; NPS Soldiers and Sailors link returns 200; `embed.html` has both `X-Frame-Options: DENY` and `frame-ancestors *` live.

### Verdict table

| Finding | Verdict | Verifier note |
|---|---|---|
| ux-flows-01 | **CORRECTED** | Evidence real. Fix needs five changes: (1) `parseState` validates `unit`/`follow` against `facts.unitIds`, which is undefined; it must be OOB ids UNION animated ids (87-100 of 478 animated ids are not in the OOB; the app emits `u=` for any selected id, so today's links would be dropped). (2) `dv` + `tick-migrations.json` by event identity: `app-time` section 5/8 already decided ticks stay the stable key (piecewise-linear warp, zero migration); event identity is undefined for non-event ticks. Keep `dv` as a reserved stamp with an identity migration. (3) `at` collides with `app-time` section 8 (`at` = ISO time, plus `av`, `vignette`); one contract must win. (4) Hard dependency on seek-safe `stateAt` (missed-01). (5) `/index.html` 301 needs `force = true` (missed-05). Effort L holds only if `stateAt` and R1 land separately. |
| ux-flows-02 | **CORRECTED** | Evidence real. The sweep is not only theatre: it fills the module-global forward-fill cache `i2` (`pretty:96265-96305`, `y1`), so deleting it without `stateAt` makes every jump render almost empty (missed-01). Data cost claim is wrong for a faithful intro: the 521-600 placements file is 4.1 KB gz, but tick 535 has 18 exact rows while 451 units have a keyframe at or before it, the app also loads 12 overlapping density files (about 18.6 KB gz), and tick 556 has zero exact rows; budget about 25-45 KB gz or ship a pre-baked snapshot. Desktop loads only Day 1 at boot (Day 2/3 load only inside the playback loop, `:96991-96992`); the mobile map loads all three (`:103040-103042`). A hot-patch shortcut exists (replace the chooser with an auto `Dt(...)`), which is S, not L. Acceptance test must add: fresh profile with SW install shows no `location.reload()` mid-intro (C6, `index.html:255-277`). Timing arithmetic (3.0/6.0/9.5/12.0 s) verified. |
| ux-flows-03 | **CORRECTED** | Evidence real (`pretty:98822`, `:113214`, six pickers confirmed, `Gulp's Hill saddle` present). "467 units (regiments and batteries)" is wrong: 467 are regiments only (8 regiment files sum to 467); 103 batteries sit in nested artillery dicts, so 570 units + 135 nodes. `index_size.py` counted only `regiments` and parsed 428 of 512 monuments (report says 428 in 5.7 and 442 in 6.7). Size estimate (225 KB / 40 KB) is still plausible; entry counts, golden set and the "0 of 467" copy need 570. |
| ux-flows-04 | **CORRECTED** | Evidence real (13/14/20 lists, 'Explore' twice, injected pill). "Delete index.html:285-606 and six scripts" is unsafe: that range holds 5 inline scripts, and the one at 398-440 is the only source of `aria-label`/`title` for the S/F/L/B/? toolbar buttons and the only thing that removes `#seo-content`. Sequence: app-level labels first (or R1), then delete. Script 608-714 (Monuments star overlay) is not covered by any finding. Desktop has `Unit Roster` (Jk) and mobile has both Roster and `Order of Battle` (Xk): "OOB absent on desktop" is accurate for the tree, and 5.5 already merges them. |
| ux-flows-05 | **CONFIRMED** | All 6 anchors re-verified (175 none; 240 Berdan vs 256; 267 Vincent vs 275; 340 'fighting dies down'; 540 vs 518; 560 East Cavalry). 240 and 540 could be deliberate lead-ins (report A10 already says so); 4 are unambiguous. Do not derive permanent ids as `E-D<day>-<tick>`: `app-time` lists misordered/wrong-day events that will need re-ticking; use sequence slugs. |
| ux-flows-06 | **CONFIRMED** | Evidence real. Add: unit dots are drawn on a separate overlay `<canvas>` appended over the map (`pretty:102993-103007`), so the image card must composite both canvases (and needs a `preserveDrawingBuffer` or render-event patch in a bundle we cannot edit today). |
| ux-flows-07 | **CORRECTED** | Evidence real. Two design errors: (a) `history.state.fromMap` can never be true on the sub-page (state belongs to the entry that set it; the map cannot write the next entry's state); gate on the `document.referrer` pathname being `/` or `/index.html` instead. (b) Phase 1 replaces `history.back()` with a real link, but `netlify.toml:65-70` and `site-nav.js:203-210` deliberately restored bfcache so Back returns to the map instantly with no reload; a real link forfeits that. Keep: the click handler prefers `history.back()` when the previous entry is the map, else navigates to `/?` + `lastView`. Also the `/index.html` 301 needs `force = true`. Changing the 10 hrefs to `/` alone routes them into the same-origin `history.back()` heuristic (Documentary to Historian to Back). |
| ux-flows-08 | **CORRECTED** | Code evidence real. "Direct = 92 % of referrals so the majority are returning" is an inference the data cannot support: Direct includes bots (about 18 % of views come from CN/SG/HK/DE per the audit), dark-social shares and first-time typed URLs. Severity holds on code grounds (chooser and splash every visit); the weight must come from the ux-flows-21 baseline. |
| ux-flows-09 | **CONFIRMED** | `find-ancestor.html` 56-59, 106-121 verified; 15/20 caps and `localeCompare` verified; six pickers verified. '217 of 478 missing' is desktop-only (Day 2/3 not loaded until playback). Unit count wording as in 03. |
| ux-flows-10 | **CONFIRMED** | `pretty:97955`, `:98031-98060` (Recent Positions), `:97964-97970`, `:98322-98340` verified. |
| ux-flows-11 | **CONFIRMED** | `pretty:9417/9418` defaults verified; tour skip behaviour verified. |
| ux-flows-12 | **CONFIRMED** | `zp` `.catch(() => ({placements: []}))` then marks the day loaded (`pretty:96900-96925`, store `:9397-9406`) verified. |
| ux-flows-13 | **CORRECTED** | Evidence real (FK re-run: panel_summary median 10.9, 21/24 above 8; `education.html:20,80,81`; `watch-together.html:64,79`; privacy line 41). Effort L (2-5 d) is too low: 3 lessons with questions, vocabulary and handouts, Present, Classroom, QR, `/l/` aliases, print kit, rewriting 24 summaries to grade 8, plus a school-network pilot. Class as XL (8-15 d incl. content); the 62-day total is understated. |
| ux-flows-14 | **CORRECTED** | Evidence real (16 stops + 512 monuments = 528, `sw.js:38,72-75`, `manifest.json:9`, `ar.html` chain). XL is the right class but the 8-day midpoint is not: AR rebuild across iOS/Android sensors, POI cards, offline pack with a tile-licence decision, portrait, battery saver, and a field test realistically take 20-30 d. The iOS motion-ordering claim is [I] (correctly flagged). |
| ux-flows-15 | **CONFIRMED** | 1,577,215 B and 31.5 s verified; `#seo-content` lines verified; `navigator.connection` is Chromium-only (risk 6 already says so). |
| ux-flows-16 | **CONFIRMED** | All cited strings verified; no non-affiliation text anywhere in the HTML. |
| ux-flows-17 | **CONFIRMED** | Help chunk has 'Keyboard Shortcuts' and 'About', '445+ Union and Confederate units'; PDF button `pretty:113115-113132` (12 px); H key toggles a store flag nothing renders (`app-bugs-24`). |
| ux-flows-18 | **CONFIRMED** | `historian.html:35, 109, 124, 147, 174` verified; user text escapes only `<` (no XSS). |
| ux-flows-19 | **CONFIRMED** | Re-ran the exact code path: `{day: i+1, ...d}` so `c.day` is defined; all 137 render `...: undefined`; no event has `title` or `description`; the live page still ships `e.description || e.title`. The fix uses a bare `day`; in the page it is `c.day`. |
| ux-flows-20 | **CONFIRMED** | `1/2/3` set the tick with no load on desktop is true (lazy day load only in the playback loop); `h` -> heatmap flag is dead; Esc omits `pinnedUnitId`. WCAG 2.1.4 is handled by `app-a11y-06`. |
| ux-flows-21 | **CONFIRMED** | Privacy promise verified (`privacy.html`). Effort M understates baseline + endpoint + taxonomy + dashboards + experiments (closer to L). |
| ux-flows-22 | **UNVERIFIABLE** | "No user research exists" and persona weights cannot be checked from files. Sample-size arithmetic checked: two-proportion 40 % to 50 %, alpha 0.05, power 0.8 gives about 387 per arm (report: 384); 1,529/30 = 51 visitors/day correct. |
| ux-flows-23 | **CONFIRMED** | Eight feature pages each construct a Mapbox map from the CDN 3.24.1; Compare 60/300 and Export 540/600 defaults verified; `camera.html:105` `placementAtTick` verified. |
| ux-flows-24 | **CONFIRMED** | Markers are 8x8 `div`s, transport +-1/+-12 only, 45 critical events, Day 1 silence verified. Prev/Next-moment and chapter jumps inherit the `stateAt` dependency (missed-01). |
| ux-flows-25 | **CORRECTED** | Unit pages are 570 (467 regiments + 103 batteries), not 467; there is no build step today (N1) so generation needs a pipeline; thin-content and duplicate-template risk for 500+ near-identical pages is not discussed (add unique fields: key_action, strength, casualties, commander, moments). |
| ux-flows-26 | **CONFIRMED** | Data verified (125 silent ticks, tick 175 has no event). Research and sourcing effort for 5-8 cited moments plus Day 3 is likely above L; tick assignment depends on the canonical clock (`app-time`), already listed. |
| ux-flows-27 | **UNVERIFIABLE** | Process item; I did not verify "no acceptance checklist exists" (deploy-history not opened). Plan is reasonable. |
| ux-flows-28 | **CONFIRMED** | Footer mailto `site-nav.js:194`; no affiliation statement found in any HTML. |

### Missed issues (in scope, not in the report)

1. **Seek-safe rendering (`stateAt`) is an unlisted hard dependency (high).** `y1` forward-fills from a module-global `i2` that is never cleared (`pretty:96265-96305`, `app-bugs-07`, `app-time-07`); the splash sweep currently primes it. Data: 1,804 keyframe rows on 188 of 675 ticks; exact rows at tick 535 = 18, 538 = 32, 551 = 10, 556 = 0, while 451 units have a keyframe at or before tick 535. Without `stateAt`, deep links, the guided moment, chapter chips, next/previous moment, resume and playlists render nearly empty maps once the sweep is deleted. `ux-flows.md` has zero mentions of seek/forward-fill/`i2`. Fix: add `app-time-07`/`app-bugs-07` as a dependency of 01, 02, 05, 08, 24 and put a `?tick=551` render test (unit count) in their acceptance tests.
2. **URL contract collides with `app-time` section 8 (high).** `app-time` defines `at` = ISO time, `av`, `vignette`, ticks stable, zero migration; ux-flows defines `at` = lat,lng, `dv`, `v`, event-identity migration. The report says it unifies the plans but never read `app-time` section 8. Fix: single owner module; rename one `at` (for example `clock` vs `center`); fold `av` into `dv`; drop `tick-migrations.json` unless a retime is chosen.
3. **Unit-id domain and counts (medium).** `facts.unitIds` is undefined in `parseState`; 87-100 animated ids are not in the OOB; 467 = regiments only, +103 batteries = 570 units. Affects palette, Unit pages (570), deep-link validation, "0 of 467" copy. Fix: `unitIds = OOB ids UNION animated ids`; regenerate counts from data.
4. **Unsafe index.html deletion range (medium).** `index.html:398-440` is the only accessible-name source for the toolbar (S/F/L/B/?) and the `#seo-content` remover; `608-714` is the Monuments star overlay; range 285-606 has 5 scripts, not 6. Fix: label the toolbar in the app first (tranche 0) and give the Monuments overlay its own finding.
5. **Netlify `/index.html` 301 is a no-op without `force = true` (medium).** Redirects do not shadow an existing file; `index.html` exists (live `curl` returns 200 with no redirect). Netlify docs confirm query strings are passed through on 200/301/302, so the query concern in 5.6.8 is settled, but `force = true` is missing from the spec.
6. **Permanent ids that embed ticks (low).** `E-D<day>-<tick>` breaks when an event is re-ticked (`app-time` lists misordered/wrong-day events). Use sequence slugs plus an alias table.
7. **Copy: "skipped 125 moments" (low).** 125 is ticks, not curated moments; the same report renames ticks to moments elsewhere. Use "a quiet stretch" without a count, or "about 10 hours of battle time" once the canonical clock exists.
