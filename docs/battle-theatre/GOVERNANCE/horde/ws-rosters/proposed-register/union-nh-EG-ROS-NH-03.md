# EG-ROS-NH-03: Adjutant-General's reports of 1865 and 1866 (New Hampshire): the regimental rosters cannot be read from the text layer

| Field | Content |
|---|---|
| ID | EG-ROS-NH-03 |
| Requirement IDs | OA03; R22; Law clauses 3, 4 and 7 |
| Category | evidence present, text layer unreadable |
| Description | The earlier editions of the New Hampshire roll (Report of the Adjutant-General of the State of New Hampshire, 1865 volumes 1 and 2 and 1866 volumes 1 and 2; Internet Archive items reportofadjutant01newh, reportofadjutant02newh, reportofadjutant661newh, reportofadjutant0266newh) print a regimental roster for the 2nd, 5th and 12th Regiments and the First Light Battery. They would be a printing of the same men that is independent of the 1895 Register (Ayling says in his introduction that these reports contain errors he corrected). |
| Why literal 100% is not possible or blocked | The roster pages are tables printed sideways. The OCR text layer of the four items (tesseract 5 on three of them, none named on the fourth) read them upside down: a line such as "poyomorg" stands for "promoted". The reading is not recoverable by a rule (a letter-by-letter decoding would be a guess). The only other reading is of the page images, which the proxy refuses (host ia600608.us.archive.org, HTTP 403, 2026-11-13 20:29 UTC). |
| Evidence searched | The four texts were fetched (archive.org /cors/, sha256 in tmp/library/rosters/MANIFEST-union-nh.json and data2/sources/NH-AGR-1865.json) and the roster leaves of all four read: 1865 vol. 1 leaf 123 ("SECOND REGIMENT"), 1865 vol. 2 leaves 223 and 631 (12th Regiment, First Light Battery), 1866 vol. 1 leaf 47; all read upside down and unreadable. 1866 vol. 2: the page read (leaf 475, "MILITARY HISTORY - SECOND REGIMENT", printed p. 427) is readable narrative history; roster pages of this volume were not located (the volume was not read through). |
| Autonomous substitute applied | None. The Ayling Register is the only roll of the four units in the unit files. |
| Strongest evidence-based reconstruction | None possible from the text layer. |
| Confidence tier | open gap |
| Competing values | - |
| Product marking | The sources page of the roster states that the 1865-66 rosters were inspected and could not be read, with this id. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Allow a page-image route (the image hosts of the Internet Archive) or download the roster leaves in a browser into tmp/library/rosters/NH-AGR-1865; the second-reading route of the plan (G02) then reads them. |
| Agent recommendation | Do not decode the sideways OCR; read the images once a route exists. |
| Status | open (proposed by bt-rosters / union-nh; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
