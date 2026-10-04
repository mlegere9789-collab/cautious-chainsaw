# What the owner must supply

Status: 2026-10-04. The candidate trust pages (`candidates/trust-pages/`), the user guide (`candidates/user-guide/`) and the style guide are finished as far as evidence allows. This file lists exactly what only the owner can provide, which page needs it, and where it goes. Nothing here has been invented or guessed: an open item is a visible `[OWNER TO PROVIDE: ...]` or `[OWNER TO CONFIRM: ...]` marker on the page, and `node tools/copy/build-trust-pages.mjs --publish` refuses to build while any marker is open.

How to supply a value: edit `tools/copy/trust-config.json` (never the generated HTML), then run `node tools/copy/build-trust-pages.mjs`. Run `node tools/copy/build-trust-pages.mjs --list-owner-inputs` for the live list; the keys below are exactly its keys.

## 0. Already supplied by the owner (2026-10-04, `docs/decisions/OWNER-DECISIONS-2026-10-04.md` items 5 and 6)

| Input | What was supplied | Where it is used |
|---|---|---|
| Creator text | The approved first-person text of `docs/content/APPROVED-BIO.md` (Option 2, "for the love of history"), used verbatim; only the apostrophes are curled when the page is rendered, and a test compares the page with the file | About |
| Public contact | `gettysburginteractivemap@gmail.com` is the only public contact. It is the value of all four keys `contact.general`, `contact.corrections`, `contact.accessibility` and `contact.security` of `tools/copy/trust-config.json`, and the one address `copy_lint` rule PERSONAL_EMAIL allows (`allowedEmails` in `tools/copy/scan-config.json`). Role addresses (D-CONTACT in the plan) are not used | Contact, Corrections, Accessibility Statement, About, the guide |
| Candidate status of Wave 3a | Copy, trust pages and the user guide stay candidates until a train integrates them after verification | all candidate output |

Still optional on About: a photo with alt text, or links ("none requested yet" in `APPROVED-BIO.md`).

## 1. Value still open in `tools/copy/trust-config.json`

| Key | What to supply | Rules | Pages that need it |
|---|---|---|---|
| `creator.reviewer` | The name and credit of the historian who reviews the reconstruction, or the words "none yet". | Until a reviewer is named, every time and every figure stays "Unreviewed reconstruction". All 33 proposed time anchors are in state `proposed` (`data-src/time/time_anchors.json`). | About, Sources and Methods |

## 2. Confirmations in `tools/copy/trust-config.json` (set to `true` only when the statement is true)

| Key | The statement the page makes once confirmed | Why it is held | Pages |
|---|---|---|---|
| `confirmations.nonAffiliation` | "This is an independent project. It is not affiliated with or endorsed by the National Park Service, the Gettysburg Foundation, the American Battlefield Trust, Mapbox or Google." | Only you know whether it is true (plan decision D-AFFIL, register action 10c). | About, FAQ |
| `confirmations.responseTargets` | A target to acknowledge a report within 3 days and to fix it or explain why it stands within 30 days (`targets.acknowledgeDays`, `targets.fixOrExplainDays`). | The targets are stated as intent (plan CD-4 default). Confirm only if you will keep them; change the two numbers if not. | Corrections, Accessibility Statement, Contact |
| `confirmations.noScreenReaderTestOnRecord` | That no test with a screen reader is on record, or the record of one (who, which reader, which browser, when). | The repository holds no such record; if a person did test, the Accessibility Statement should say so. | Accessibility Statement |
| `confirmations.licenseWording` | The licence or reuse wording you want shown to visitors, if any (candidate: "Text and code are all rights reserved. You may quote short passages with credit and a link."). | A licence is a legal choice (decision D-LICENSE, counsel first). The pages say only that no open licence has been published. | FAQ |

## 3. Decisions the pages wait for

| Decision | Default now in force | What changes when you decide |
|---|---|---|
| D-NAME: approve "Gettysburg Interactive Map" as the product name | All candidate text uses it; `copy_lint` rule NAME flags the old name | Identity train: title, headings, manifest and nav change in one deploy |
| Q-DATA-2: the headline casualty wording | No single headline figure is printed; the Sources and Methods page lists the bases and authorities | One sentence can then be written on the Dashboard, Help and FAQ |
| CD-2: publish the history of slavery, emancipation and civilians (plan WP-CONTENT-25) | Not written: no page here covers it | The user guide and About can add a "Why they fought" panel once a reviewer signs the text |
| D-SCOPE-TIERS and the retirement of features | The guide documents the 19 pages in the R1c menu and notes that Battlefield AR is hidden | A page retired from the menu is removed from `tools/guide/features.json` |

## 4. Dates

| Date | Needed for | Source today |
|---|---|---|
| The release date of R1c (or the version scheme: the plan proposes calendar versions such as 2026.11.0) | Changelog, the guide's cover | None: R1c is built and tested and not deployed (`ops/release-notes/R1c.md`). The pages say "unreleased" and give no version number. |
| The effective date of the Privacy and Terms text | Privacy and Terms pages (not part of this task) | `tools/t0/trains.json` pins 2026-11-03 for the opt-in legal group only |
| The next review date of the Accessibility Statement | Accessibility Statement | The statement is reviewed with every release; the config `asOf` date (2026-10-04) is its last review |
| `asOf` in `tools/copy/trust-config.json` | The "Last reviewed" line on every page and the guide's "Prepared" line | Set to the day you approve the pages |

## 5. Permission and rights statements (nothing is published without them)

| Statement | Needed for | Status |
|---|---|---|
| Rights to the third-party material the map shows (Mapbox imagery and attribution, USGS, National Park Service media and captions, Google Maps and Street View) | A "third-party rights" section of Sources and Methods | Not written. The page says it is not described until the questions are answered. |
| Whether Busey and Martin figures may be shown as facts with attribution | Casualty figures on the map and on Sources and Methods | The authorities file marks them `secondary_unverified`; the tables are never reproduced (`data-src/authorities/authorities.json`) |
| Whether any position or text came from a paid app or a YouTube channel (four data notes cite one) | Sources and Methods | Open (register action 10a); the page does not mention it |
| Written confirmation from the National Park Service before any NPS roster data is used | Find Your Ancestor, the Historian | Not requested here |
| Permission to quote, or link out, the three Sources v2 register entries that need a rights review (entries 586, 589 and 591) | The register summary | `docs/historian/sources-v2/QC-REPORT.md` section 7 lists them |

## 6. What each page needs

| Page | Open items (keys above) | Facts that come from files, not from you |
|---|---|---|
| About | `creator.reviewer`, `confirmations.nonAffiliation` | the approved creator text, counts (`data-src/build/facts.json`), the state of the time anchors, the credit line |
| Sources and Methods | `creator.reviewer` | counts, the nine works the Help dialog lists, the casualty authorities, the register counts (computed from `data-src/sources-v2/registry.json`) |
| Standard of Care | none open; a status moves only when evidence exists | the eight commitments (`docs/pitch/PITCH.md`), the evidence for each status |
| Corrections | `confirmations.responseTargets` | the log format; the log is empty on purpose |
| FAQ | `confirmations.nonAffiliation`, `confirmations.licenseWording` | every answer cites a file; 24 claims are re-checked at every build |
| Accessibility Statement | `confirmations.responseTargets`, `confirmations.noScreenReaderTestOnRecord` | test results from the release notes and two commits; the keyboard reference generated from `tools/guide/features.json` |
| Changelog | the release date or version (section 4) | entries from `ops/release-notes/R0.md` to `R1c.md` |
| Contact | `confirmations.responseTargets` | the one public address |
| User guide (`candidates/user-guide/`) | the release date or version printed on the cover | every shortcut, gesture and page, checked against release R1c by `node tools/guide/check-parity.mjs` |

## 7. Work that needs a person, not a decision

- A historian reviewer: names, reviews the time anchors and the disagreement register, and signs. Until then the pages say "unreviewed".
- An independent accessibility check: a screen-reader read of the pages and the guide, and an independent PDF/UA validation (veraPDF or PAC) of `candidates/user-guide/gettysburg-user-guide.pdf` and the A4 file. This task ran its own checks only.
- A reader for the one public mailbox, so the 3-day target can be met.
- Fonts for the PDF: the guide uses fonts already on the build machine (Georgia, Segoe UI, Consolas, embedded as subsets). A font with an open licence (the plan names Spectral, SIL OFL) must be chosen and shipped for a build that is the same on every machine.
- Hosting decisions (extensionless URLs, `Content-Disposition` for the PDF, `security.txt`) belong to the release trains, not to these candidates.
