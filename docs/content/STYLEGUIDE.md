<!-- copy-lint-disable : this file quotes the patterns it bans; the linter must not judge its own rulebook -->
# Content style guide

Status: committed 2026-10-04 as the rulebook for everything a visitor reads on the Gettysburg Interactive Map: the map, the pages, Help, the guide, meta tags, errors and alt text. It implements `docs/plan/FINAL/11-copy-docs-content.md` (WP-CONTENT-06) from the specialist plan `docs/plan/specialists/docs-copy.md` section 6, with the amendments of the final chapter (title separator, High Ground, who may say "I") and the owner's decisions of 2026-10-04 (`docs/decisions/OWNER-DECISIONS-2026-10-04.md`), which override the plan's role addresses: the public contact is the project address only. Where the owner has not decided yet, the rule is marked **[OWNER]** and the default stays in force until the owner answers.

The mechanical rules are enforced by `node tools/copy/copy_lint.mjs` (rule ids in section 16). A rule that cannot be checked by a machine is a review item for whoever approves the text.

## 1. Voice

Four traits, in this order.

| Trait | Means | Does not mean |
|---|---|---|
| Accurate | Say only what the sources support. Give the number, its basis and its range. Say "about" for estimates. | Hedging every sentence, or using "genuine" or "real" as intensifiers. |
| Respectful | Treat the dead as people. Plain verbs: killed, wounded, captured. No sport or game language for casualties. | Solemn or stiff. |
| Warm and curious | Say "you". Invite exploration ("Follow one regiment through three days"). Use specific detail from the record. | Chatty, jokey, exclamation marks, "Don't miss it". |
| Plain | Short sentences, concrete nouns, active voice. Keep proper names and technical terms, and define each once. | Dumbing down. |

Voice by surface:

| Surface | Register | Example |
|---|---|---|
| Map labels, buttons, tooltips | terse, neutral, verb first | "Copy link", "Previous moment" |
| Stories and Documentary Mode | narrative, sourced, past tense for history | "At about 4:30 PM the 20th Maine held the left of the Union line." |
| Data pages (Regimental Biography, Fact Sheets, Dashboard) | precise, complete sentences for notes, every figure with its basis | "It went into the battle with about 308 men and lost 210 killed, wounded, or captured (68.2%)." |
| Sources, Corrections, Accessibility | plain, checkable, dated | "Corps totals are the sum of each corps' engagement periods." |
| Privacy and Terms | neutral and short | "This site does not set its own cookies." |
| Errors and empty states | calm, specific, with the next step | "The casualty data couldn't be loaded. Check your connection and reload the page." |
| About, Corrections, FAQ | a person may speak, in the singular ("I built this map to ...") | the only pages where "I" appears |

**Person.** There is no team. "We", "our" and "us" are never used (rule WE): interface and legal copy say "this site". The owner may say "I" on About, Corrections and FAQ, and nowhere else. **Address.** "You" for the reader, never "the user". **History of the project.** Never in product copy: no drafts, no deployments, no "we haven't been able to". That belongs in the changelog and Known issues (section 15).

## 2. Dates, times and numbers

**Dates.** Month name, day without an ordinal suffix, comma, time: **July 2, 4:30 PM**. Add the year when the context is not obviously 1863: `July 2, 1863, 4:30 PM`. Long form: `Thursday, July 2, 1863` (July 1 was a Wednesday, so July 2 was a Thursday and July 3 a Friday). Ranges take an en dash with no spaces: `July 1–3, 1863`; `July 4–November 1863`. Never `2nd of July`, `7/2`, `July 2nd`. Rule RANGE.

**Times (normative).** `H:MM AM/PM`, capitals, a space: **4:30 PM**. Never `4:30pm`, `4:30 p.m.`, `16:30` or `4 pm`. In running prose "about 4 PM" is allowed; text that a program generates never prints a bare hour. Noon is `12:00 PM`, midnight `12:00 AM`. Ranges: `4:00–5:30 PM`; across noon `11:30 AM–1:00 PM`. After midnight: `12:30 AM, July 3`. Machine form in markup: `<time datetime="1863-07-02T16:30">`. Rule TIMEFMT.

**Approximate and contested times.** See section 9. Never print an exact clock for a moment whose time is not signed.

**Numerals.** Digits for every count of people, guns, units and casualties and every figure of 10 or more; words for one to nine in running prose, except with units, times, dates, percentages and unit names. Never start a sentence with a numeral. Thousands separator always (`12,500`). Ranges `1,400–1,470`. Percentages `85.5%` (no space; one decimal for computed rates). Estimates: "about 12,500"; never `~12,500`, `c. 12,500`, "approximately" or "roughly" in the interface.

**Counts come from `data-src/build/facts.json`.** No total is typed into copy (rule COUNT). The facts file is generated; a page that needs "465 regiments" reads it or is built from it.

**Units.** US customary first, metric in parentheses where both are shown: `9,311 ft (2,838 m)`. A space between number and unit: `612 ft`, `3 mi`. Use a non-breaking space between a number and its unit and between a time and AM or PM. Coordinates in visible text: `39.8112° N, 77.2260° W`.

## 3. Names: one name per thing

The names below are normative. `tools/copy/names.json` is the machine copy and rule NAME enforces it.

| Thing | Canonical name | Retired or wrong forms |
|---|---|---|
| Product | Gettysburg Interactive Map; "the map" on second reference **[OWNER: D-NAME, approve before the identity train]** | Gettysburg Animated Battlefield Map, Animated Battlefield Map, Animated Map |
| Menu | More to Explore | Extra Features |
| Page: elevation | High Ground **[D-VIEWSHED]** | What They Could See, Vantage Points |
| Page: ancestors | Find Your Ancestor | Find an Ancestor |
| Map tool | Follow a Regiment | Follow Your Ancestor |
| Page: unit sheets | Regiment Fact Sheets | Battle Reports |
| Page: video | Export a Video | Cinematic Export |
| Map tour | Guided Battle Tour | NPS Auto Tour |
| One of the 24 written accounts | story | vignette, key moment |
| A point in time on the map | moment | tick, snapshot, frame |
| Ask the Historian | Ask the Historian | any AI, assistant or persona wording (rule AIPERSONA) |

Page titles: `{Page} | Gettysburg Interactive Map`, at most 60 characters. A page's H1 equals its navigation label; a subtitle carries the longer description.

**Former names in since-version notes.** Release R1c still shows some labels the style guide retires (for example the menu is still called Extra Features). A guide or changelog entry that has to tell a reader what the screen says today may name the old label, once, inside an element marked `data-lint-allow="NAME"`. Nowhere else.

### People, places and units

- Place names follow the National Park Service spelling: **McPherson Ridge**, **Herbst Woods**, **the Wheatfield**, **the Peach Orchard**, **the Angle**, **High Water Mark** (the place; "high-water mark" only figuratively), **Culp’s Hill**, **Devil’s Den**, **Barlow’s Knoll**, **Pickett’s Charge**. Rule NAME lists the wrong spellings seen in the build.
- Armies: the Army of the Potomac (Union), the Army of Northern Virginia (Confederate). Sides: "Union" and "Confederate", capitalised. "Federal" and "Rebel" only inside quotations.
- Corps: Union with Roman numerals (I Corps), Confederate with ordinals (First Corps).
- Units: ordinal, state, branch on first mention ("20th Maine Infantry"), then the short form ("the 20th Maine"). Brigades take the commander's possessive ("Vincent’s Brigade") or a proper name ("Iron Brigade"). Batteries: "Cushing’s Battery (Battery A, 4th U.S. Artillery)".
- Ranks: full title on first mention ("Brigadier General John Buford"), then the surname. In tight interface space use the abbreviations with periods: Gen., Lt. Gen., Maj. Gen., Brig. Gen., Col., Lt. Col., Maj., Capt., Lt., Sgt., Pvt. (rule ABBREV).
- Possessives of names ending in s take ’s: Sickles’s, Reynolds’s.
- A unit is never shown by its database id (rules IDLEAK, ALIAS).

## 4. Glossary shared by the interface, guide and Sources page

| Term | Public definition |
|---|---|
| moment | a point in the battle you can view on the map; the internal step number appears only in a tooltip as "Frame N of 675" |
| story | one of the 24 written accounts of a key event |
| event | one of the 137 entries in the chronology shown on event cards |
| turning point | one of the nine decisions historians still debate |
| regiment, battery | an infantry or cavalry regiment; an artillery battery |
| order of battle | the list of every unit on the field and how it is organised |
| casualties | men killed, wounded, and captured or missing, added together (define once per page) |
| reconstruction | a position or time worked out from sources, not recorded directly |
| time-lapse | the map's playback: it covers the quiet hours faster and the fighting more slowly |

The counts in the table (24, 137, nine) are written here for the reader of this file only. In copy they come from `facts.json`.

## 5. Capitalisation and punctuation

- Sentence case for buttons, labels, tooltips, headings inside pages and table headers. Title Case only for proper names: the product, feature names, story titles, places and units.
- Never type ALL CAPS in source (rule CAPS). Eyebrows may be capitalised with CSS `text-transform` so that screen readers read the words.
- Dashes: a spaced em dash ` — ` for a break in a sentence; an en dash `–` for a range; never `--` (rule DASH); never a spaced hyphen as a dash (rule HYPHEN). Minus sign `−` (U+2212) for negative values.
- Ellipsis: the single character `…`, only for truncation and loading states; never three dots (rule ELLIPSIS).
- Quotation marks and apostrophes: typographic in rendered text (`“ ”`, `’`); straight only in code and attributes (rule QUOTES). Identity fields in data (designation, name, title) stay ASCII and are curled where the page renders them.
- Serial comma: yes ("killed, wounded, or captured").
- No exclamation marks. No emoji in copy or labels (rule EMOJI); icons are SVG with an accessible name.
- No arrows or glyphs inside link or button text; add them with CSS `::after` marked `aria-hidden`.
- Full stops on complete sentences; none on buttons, labels, tooltips, placeholders or table cells.
- Spell out abbreviations; "for example" and "that is" replace "e.g." and "i.e.".
- `<html lang="en-US">`; mark other languages inline.

## 6. Casualties

- Terms: **killed, wounded, captured or missing.** "Casualties" means all of these added together, defined once per page. Never "KIA", "WIA" or "MIA" (rule CASUALTY); never "dead" to mean casualties.
- Always give the base with the figure: "210 of 308 men (68.2%)". Rates to one decimal, "about" when estimated, a range when sources disagree.
- Unit sentence: "{Unit} went into the battle with about {N} men and lost {C} killed, wounded, or captured ({P}%)."
- Officers: "killed", "mortally wounded (died July 4)", "wounded and captured".
- Tone: no "slaughter", "butchered", "carnage" or "wiped out" except inside a quotation. A superlative needs a source or a softer form ("one of the largest").
- A headline total is never one bare number while the site's own data holds more than one basis. The three bases in the data today are written on the Sources page; the headline wording is the owner's decision **[OWNER: Q-DATA-2]**.

## 7. Missing data

Omit first: do not print a label whose value is absent. When the absence matters, use exactly these strings.

| Id | Text |
|---|---|
| M-NONE | "Not reported" (tooltip: "The sources give no figure for this.") |
| M-COMMANDER | "Commander not named in the order of battle." |
| M-STATE | "State not listed." |
| M-POSITIONS | "This regiment has no positions of its own in the record, so it is shown with its brigade." |
| M-RESULTS | "No results for “{query}”. Try a regiment, a state, or a commander." |

Never: "unrecorded", "N/A", a bare "unknown", "undefined" (rules ABSENCE, UNDEFINED).

## 8. Standard disclaimers (exact wording, reused by id)

One wording per id, in every place the id applies. Ids carry the prefix `dis.` in code. Disclaimers marked **[OWNER]** are true only if the owner confirms the fact.

| Id | Where | Wording |
|---|---|---|
| dis.recon | Sources, Help, guide, FAQ | "Positions are reconstructed from published sources. Where a regiment's exact place at a given time is not recorded, the map shows the best-supported position." |
| dis.clock | clock tooltip, Sources, guide | "Times are approximate. Sources disagree by half an hour or more, and the map plays as a time-lapse." |
| dis.unreviewed | any reconstruction no historian has checked | "Unreviewed reconstruction: a historian has not yet checked this account." |
| dis.disagree | Sources register, unit notes | "Sources disagree here: {a} to {b}. This site uses {c}." |
| dis.casualty | Dashboard, Ledger, Fact Sheets, FAQ | "Casualties are men killed, wounded, and captured or missing, added together." |
| dis.data_limit | Find Your Ancestor, FAQ | "This site lists regiments, not individual soldiers. To find a soldier by name, search the National Park Service's Soldiers and Sailors System." |
| dis.historian | Ask the Historian, guide, FAQ | "Answers come only from this site's records, not from an AI." Add "Each answer shows its source." only once every answer type renders a source line. |
| dis.hypothetical | What-If Sandbox | "Hypothetical. Not history. Nothing you change here is saved or affects the real map." |
| dis.ar | Battlefield AR | "Beta. Compass accuracy varies by phone, so treat the markers as a guide to direction, not a survey." |
| dis.streetview | Soldier's Eye View, Walkthrough | "Street View opens in Google Maps in a new tab and is provided by Google." |
| dis.affil **[OWNER]** | About, footer of Sources | "This is an independent project. It is not affiliated with or endorsed by the National Park Service, the Gettysburg Foundation, the American Battlefield Trust, Mapbox or Google." |
| dis.license_interim **[OWNER, counsel first]** | Terms, Press | "Text and code are all rights reserved. You may quote short passages with credit and a link." |
| dis.sensitive | excerpts of period sources | "This excerpt is a primary source and contains language of its time." |

## 9. Approximate, contested and unknown: wording and badges

The vocabulary below is the pitch's (`docs/pitch/PITCH.md`, "The six evidence badges"). It is a design intent: **no page may show a badge until the evidence behind it exists.** Using a stronger badge than the evidence earns is a copy error, not a style choice.

| Badge | Promise | Use it only when |
|---|---|---|
| Documented | a verbatim passage or figure printed in a named source, with page | the page and edition are recorded |
| Measured | a reading by an instrument or an official return | the instrument or return is named |
| Computed | arithmetic anyone can re-run from documented inputs | the inputs and the method are stated |
| Modelled | a stated model with stated assumptions | the assumptions are on the page |
| Contested | sources disagree; every value is shown with reasons | at least two sources are named |
| Unknown | no source in the collection says | the page also says what source would |

Wording rules:

- **Approximate time:** "about 4:30 PM". A time is exact only after a historian and a second reader have signed it and its uncertainty is under 10 minutes. Until then: `dis.clock`, and the pill "Unreviewed reconstruction".
- **A contested figure:** show the range with the sources: "between about 5:10 and 7:00 PM". Never average and never pick silently (`dis.disagree`).
- **A reconstruction:** say so (`dis.recon`). A position the sources do not give is "shown with its brigade", not "tracked".
- **Never** write "accurate to the minute", "reviewed", "verified" or "fully conforms" without the artefact that earns it (rule CLAIM). "Reviewed" needs a signed decision on file.
- **Quotations** carry author, work and page or date, and a status: recorded, recalled or attributed. Copy says "wrote", "recalled" or "is said to have said" accordingly. An unverified quotation is not published.

## 10. Alt text and non-visual text

| Case | Rule |
|---|---|
| Informative image | one or two sentences, at most 125 characters, what and why, no "image of" |
| Map figure | place, time, what is visible: "Cemetery Ridge at 3:10 PM on July 3: the Confederate advance reaches the Union line." |
| Chart | the takeaway in the alt text, and a data table on the page |
| Decorative | `alt=""` |
| Icon-only control | `aria-label` equals the visible tooltip and the command ("Close", "Search units"); never a glyph |
| Social image | `og:image:alt` on every page |
| PDF figure | a `Figure` tag with `Alt`; decorations are artifacts |
| Map canvas | one region label: "Battle map, July 2, 4:30 PM. 84 units shown." |
| Live region | full sentence, the same clock string as the visible label |

## 11. Microcopy patterns

| Pattern | Template |
|---|---|
| Loading | "Loading the battlefield…"; elsewhere "Loading {thing}…" with `role="status"` |
| Network error | "{Thing} couldn't be loaded. Check your connection and reload the page." and a Reload button; never a file path |
| Unsupported | "This needs WebGL, which your browser has turned off or does not support. Try a current Chrome, Edge, Firefox, or Safari." |
| Success | "Link copied." with `role="status"` |
| Destructive | "Remove this bookmark?" with Remove and Keep |
| Buttons | verb first, sentence case, at most three words |
| Links | descriptive ("Read the Sources page"), never "here"; an external link says it opens in a new tab |
| Tooltips | sentence case, no full stop, at most five words, same wording as the `aria-label` |
| Placeholders | an example, never the label |
| Targets | at least 44 by 44 CSS pixels for touch controls |

## 12. Inclusive and historically responsible language

- Context is content: a history of a battle in 1863 says what the war was about. Use "enslaved people", not "slaves", except in quotations; capitalise "Black".
- "Civil War" is the default name. Other names appear only as historical names inside quotations or explained terms.
- Use a monument's own text when naming it, and explain the phrase once.
- Do not imply moral equivalence or valorise causes; describe what units did and what happened to them. No sport or spectacle language ("epic", "thrilling", "just for fun").
- People are people: full names and roles, ages when known, civilians as part of the story.
- Accessibility language: "screen reader users", "people who use a keyboard".

## 13. Reading level and length

Interface text: Flesch-Kincaid grade 8 or lower, sentences of at most 20 words, paragraphs of at most 4 sentences. Students' text: grade 6 to 7. Stories and Sources may be grade 10 to 12. Card descriptions at most 75 characters; H1 at most 60; meta description 70 to 160; buttons at most three words.

## 14. Banned developer-history patterns

These phrases tell a visitor how the site was built or what it could not do. Each has a rule and a replacement.

| Pattern | Rule | Replace with |
|---|---|---|
| "earlier drafts", "this deployment", "proof of concept", "build plan", "compiled bundle", "workaround" | DEVLOG | what the page does and does not do |
| "which we haven't been able to do" | DEVLOG, WE | the limit stated as a fact about the page ("Compass accuracy varies from phone to phone") |
| "tick", "Tick 538/675", "five-minute", "real time", "minute by minute" | TICK, REALTIME | "moment", the clock string, "time-lapse" |
| `undefined`, `NaN`, `[object Object]`, a snake_case field name, a record id such as `US-017` | UNDEFINED, IDLEAK | fix the code path or omit the label |
| "alias for", "Commander unrecorded" | ALIAS, ABSENCE | fold the alias into its unit; omit the label or use a missing-data phrase (section 7) |
| "an AI-style historian", "chatbot", "I'm ready" | AIPERSONA | "Ask the Historian"; `dis.historian` |
| "TODO", "TBD", "FIXME" | TODO | finish the text; an owner input is a visible `[OWNER TO PROVIDE: ...]` marker and blocks publishing |
| an email address other than the project's public contact, `gettysburginteractivemap@gmail.com` (owner decision 5; the allowed address is `allowedEmails` in `tools/copy/scan-config.json`) | PERSONAL_EMAIL | the public contact address in `tools/copy/trust-config.json` |
| "genuine", "real, working" | HEDGE | delete the adjective |

## 15. Where project history does belong

- The changelog (`/changelog`): what changed, in sentences a visitor understands, newest first. A change that ships appears in the release that ships it, not before.
- Known issues: limits of the current release, each with what a visitor can do instead.
- Corrections: a published error, with date, what it said, what it says now, the source and who reviewed it. No entry is written before the fix has shipped.

## 16. Enforcement

| Rule | Sev | Section | What it catches |
|---|---|---|---|
| DASH | E | 5 | `--` used as a dash |
| HYPHEN | W | 5 | a spaced hyphen used as a dash |
| TICK | E | 4, 14 | the developer word "tick" |
| UNDEFINED | E | 7, 14 | `undefined`, `NaN`, `[object Object]` printed as text |
| TODO | E | 14 | TODO, FIXME, TBD, HACK |
| ALIAS | E | 14 | "alias for" |
| IDLEAK | E | 14 | record ids and snake_case field names inside sentences |
| DEVLOG | E | 1, 14 | development history in product copy |
| AIPERSONA | E | 3, 14 | AI or persona wording for Ask the Historian |
| COUNT | E | 2 | a typed count that disagrees with `facts.json` |
| QUOTES | W | 5 | straight quotes in prose |
| NAME | E | 3 | retired or inconsistent names |
| TIMEFMT | E | 2 | clocks not written `4:30 PM` |
| REALTIME | E | 14 | "real time", "minute by minute", "five-minute" |
| CASUALTY | E | 6 | KIA, WIA, MIA |
| ABBREV | W | 3 | Confed, Fwd, 1hr, ranks without a period |
| EMOJI | E | 5 | emoji and pictographs |
| WE | E | 1 | we, our, us (outside a quotation) |
| HEDGE | W | 14 | "genuine", "real, working" |
| ELLIPSIS | W | 5 | three dots |
| RANGE | W | 2 | `July 1-3` |
| CAPS | W | 5 | ALL CAPS phrases |
| ABSENCE | W | 7 | "unrecorded", "N/A" |
| PERSONAL_EMAIL | E | 14 | a Gmail address other than the project's public contact |
| CLAIM | E | 9 | "accurate to the minute", "fully conforms", "reviewed by a historian" |

Commands (Node 18 or later, no installs):

```
node tools/copy/copy_lint.mjs                       # baseline/dist against tools/copy/baseline.json (the ratchet)
node tools/copy/copy_lint.mjs DIR --no-baseline     # strict: every finding fails (candidate pages, the guide)
node tools/copy/copy_lint.mjs --rules DASH,TICK     # some rules only
node tools/copy/copy_lint.mjs --report out.md       # counts by rule with examples
node --test "tests/copy/*.test.mjs"                 # the rules prove themselves on seeded violations
```

**The ratchet.** `tools/copy/baseline.json` lists the known violations of the production tree by fingerprint, per rule, with an expiry date. A new violation fails the run. A baseline entry that no longer occurs fails too, until `--tighten` deletes it, so the baseline only ever shrinks. After a rule's expiry date every remaining known violation fails. A renewal needs `--renew RULE --until DATE --reason "..."`, is logged in the baseline history and may move the date at most 366 days.

**Suppression.** Only for text that must quote a banned pattern: a quotation, a since-version note, this file. Use `<!-- copy-lint-disable RULE --> ... <!-- copy-lint-enable RULE -->` or `data-lint-allow="RULE"` on the element, always with a reason in a nearby comment. `<code>`, `<pre>` and `<kbd>` are never judged.

**What the linter cannot see.** A value that is `undefined` only at run time (the Historian printing the word for every chronology answer is the known case) is invisible to a static scan. Acceptance for such defects is a browser test, not this linter.

## 17. Owner decisions this guide waits for

| Decision | Default in force | Needed by |
|---|---|---|
| D-NAME: approve "Gettysburg Interactive Map" | the name is used in all candidate text | identity train |
| D-CONTACT: decided by owner decision 5 (2026-10-04): the public contact is `gettysburginteractivemap@gmail.com` only; role addresses are not used | every contact on the trust pages and in the guide is that address | done |
| Creator text on About | decided by owner decision 5: `docs/content/APPROVED-BIO.md`, used verbatim (first person, "for the love of history") | done |
| D-AFFIL: the non-affiliation sentence is true | marked **[OWNER]** | before About or the footer publishes it |
| D-LICENSE: licence wording | `dis.license_interim`, counsel first | before Terms or Press publish it |
| Q-DATA-2: headline casualty wording | no single headline number is printed | before a headline figure is printed anywhere |
| CD-4: response targets | acknowledge within 3 days, fix or explain within 30 days, stated as intent | before Corrections publishes them |
