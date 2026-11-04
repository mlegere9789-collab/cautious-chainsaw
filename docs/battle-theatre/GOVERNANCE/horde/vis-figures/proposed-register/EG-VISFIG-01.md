# EG-VISFIG-01: Army of Northern Virginia battle flag star count, 12 or 13 (new, source conflict)

| Field | Content |
|---|---|
| ID | EG-VISFIG-01: Army of Northern Virginia battle flag star count, 12 or 13 (new, source conflict) |
| Requirement IDs | R04, R10, R17 |
| Category | source conflict |
| Description | The owner's PDF page 70 prints 12 stars for the ANV square battle flag (its cited source, FOTW, was not read). The US National Park Service, 'Flags at Antietam' and '13th Alabama Battle Flag', state a red square with a blue St Andrew's cross and thirteen stars, and that the 13th Alabama (Archer's Brigade) brought a flag of that type to Gettysburg, the brigade having received new colours of the type in June 1863 (evidence FIG-EV-ANV-13-STARS, institutional interpretive pages, not primary documents). |
| Why literal 100% is not possible or blocked | Both values are supported by a cited text; which one the Gettysburg battlefield view should show by default is a choice between conflicting sources, reserved to the owner (Law cl.6). The NPS statement concerns that regiment's flag and the type, not every brigade's. |
| Evidence searched | NPS Antietam flags page and NPS 13th Alabama article (read 2026-11-04). Not read: FOTW (the PDF's source), Smithsonian NMAH object record nmah_439645 (HTTP 403, a search snippet saying three stars on each arm plus one in the centre is a lead only, not cited), NPS Petersburg flags page (HTTP 404). |
| Autonomous substitute applied | Both counts are built: scenario anvScenario pdf_p70 (12, current default, PENDING OWNER) and nps (13, a centre star added; the arrangement of the 13th star is procedural). Test: tests/figures3d-commanders.test.mjs. |
| Strongest evidence-based reconstruction | Selectable scenario; no default chosen by the model beyond keeping the PDF value pending. |
| Confidence tier | plausible-procedural (arrangement); the count 13 for the 13th Alabama flag is documented by NPS |
| Competing values | 12 (PDF p.70, source not read) versus 13 (NPS). |
| Product marking | Tier overlay on every flag; flag texture flag_anv_battle_13stars_intact.png; scenario selector in the product (browser list). |
| Visual and audio impact | Every Confederate colour-bearer. |
| Review status | internal review only (DEC-006: no public review label); nothing seen in a browser |
| Owner decision requested | Decide the default star count for the ANV battle flag (or keep both selectable and say which is shown first). |
| Agent recommendation | Keep both selectable until the owner decides; fetch FOTW if it becomes reachable. |
| Status | open (conflict carried, PENDING OWNER) |
| Owner decision and date | (filled only from the Decision Log) |
