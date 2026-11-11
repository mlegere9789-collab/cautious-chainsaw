# Workstream 9 report: library queue, 2026-11-11

Rules followed: only openly readable pre-1929 public-domain texts; archive.org via `https://archive.org/cors/<id>/<file>`, one request per second, no logins, no CAPTCHA or block circumvention; no register entry edited; `library/status.json` and `acquired.json` untouched (new files `library/acquired_2.json`, `library/status_2.json`). Raw text is in `tmp/library/ws9/` (gitignored); sha256 manifest `tmp/library/ws9/MANIFEST.json`. Scripts used are in `scripts/`.

## Counts

Sources acquired this pass: 99 archive.org items (all pre-1929, all hash-recorded in `library/acquired_2.json`): 36 books, pamphlets and OR Ser. III vol. 2, plus 63 further items = 61 weekly newspaper issues (Gettysburg Compiler 30, Adams Sentinel 31, Jun-Dec 1863) and OR Ser. I vol. 25 Part II and vol. 29 Part II. Books: Jacobs 1864, Letterman 1866, 6 Bachelder items (one, Long's map, has no usable text), NJ x2, VT x2, OH x2, IN, 1st Minnesota, Boston burial report, Everett 1864 pamphlet, Revised Report 1867, Bartlett 1874, Indiana 1865, Haskell, Fremantle, Alexander, Longstreet, F. M. Pierce (secondary), Tillie Pierce, Meade Life and Letters (2 vols), SHSP vols 4/5/6/11/12, Hospital Scenes 1864.
Previously acquired items re-fetched and sha256-verified against `acquired.json`: 9 of 9 match (NY 1900/v2/v3, PA 1904/1914-v2, ME, MI, Fox, B&L 3).
Failed or blocked (recorded, not circumvented): chroniclingamerica.loc.gov (proxy refusal); npshistory.com, ehistory.osu.edu, babel.hathitrust.org, maine.gov, catalog.archives.gov, gutenberg.org (root probe, no connection); no archive.org item found for Massachusetts at Gettysburg or Gibbon's Personal Recollections; OR vol. 25 and 29 Part I and Ser. III vol. 3 not located; VA/NC/GA/AL/SC/TX volumes and most of the 52 SHSP volumes not searched or not acquired; bulk loc.gov newspaper OCR deferred. Skipped by instruction: Coddington and other in-copyright works.

## Gaps narrowed or closed (proposals in `proposed-register-updates/`, none applied)

Closed: none.
Narrowed: EG-0026 (and EG-0019 only as to the Jun 25 rain and Jul 4 rain, Jacobs table not found), EG-0106 (with conflicts C-005, C-006, C-007, C-008, C-011, C-021), EG-0112, EG-0120, EG-0127 (E-001 and E-008 supported; E-005 planned only; E-014 reworded), EG-0124 (with EG-0118/EG-0119 count support from Letterman).
Basis corrected, not narrowed: EG-0087 (Adams Sentinel read directly; no date, no fence text).
Read and NOT narrowed (failed lookups recorded): EG-0107 and EG-0110 (Law's essay read, no interval and no 48th Alabama position), EG-0009 (NY vol. 3 says only the 146th adopted Zouave dress in 1863), EG-0020 (corroboration only), EG-0130 (NPS lookups remain failed).
Tiers: no promotion beyond a passage; the strongest proposed change is plausible-procedural to documented for E-001 serenade, E-008 Marine Band, E-014 (as reworded) and the before-daylight hospital removal of about 12,000 wounded, each on named passages.

## Gaps still open

All 494 register entries with Status "open" before this pass remain open (nothing was edited). The substantive open items this pass touched: Union-side Jul 4 rain clock, humidity/pressure/Jacobs original sheets, Hood/McLaws own writings, hours for Stuart's brigades, E-002 Harper house, E-005 occurrence, McDougall and the 18:00 hour, Camp Letterman opening date, burial returns, 140th NY dress, 48th Alabama position, Vincent-Law interval.

## Caveats

All texts are unverified OCR; the 1863 newspaper OCR is multi-column and noisy, so only legible fragments are quoted. Fremantle's "7 A.M." reads "Y A. M." in OCR and needs a page-image check. Retrospective memoirs (Alexander, Law, Letterman) are carried as witness statements, not as resolution of conflicts.
