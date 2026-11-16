# sources-a-EG-11: Source pages read once on the owner's machine that this container cannot re-read (blocked hosts)

| Field | Content |
|---|---|
| ID | sources-a-EG-11 |
| Requirement IDs | R12, R21 |
| Category | blocked / access |
| Description | Twenty hosts answered a robots.txt request with a proxy refusal on 2026-11-13 and again on 2026-11-16: unwritten-record.blogs.archives.gov, web.archive.org, irma.nps.gov, www.xyht.com, www.smithsonianmag.com, www.spokesman.com, gettysburg.stonesentinels.com, support.geocue.com, data.amerigeoss.org, www.sciencebase.gov, www.usgs.gov, tnmaccess.nationalmap.gov, mapping.adamscountypa.gov, elevation.nationalmap.gov, www.nhhistory.org, www.davidrumsey.com, scrcguides.libraries.wm.edu, gettysburghistory.org, storymaps.esri.com, geodata.libraries.mit.edu; forum.game-labs.net and davidrumsey.com (no www) were refused on 2026-11-13 only; www.loc.gov answers 403 to its about-this-collection pages and to the IIIF manifests; ehistory.osu.edu answers with its own bot block; catalog.archives.gov disallows all crawling. The first round read most of these pages on the owner's machine (paraphrases, no verbatim quotes); every statement that rests only on them is carried as blocked_host with no tier above open_gap. Each row of evidence_corrections/sources-a.jsonl lists the exact URL and what to read (26 distinct pages in all). |
| Why literal 100% is not possible or blocked | Proxy refusal (CONNECT 403); the standing rule is never to work around a refused host. |
| Evidence searched | lookups.jsonl (records of 2026-11-13 and 2026-11-16); shard rows R12.001 to R12.022. |
| Autonomous substitute applied | Every such claim is carried as an unverified earlier reading, never as documented. |
| Strongest evidence-based reconstruction | A session with open network access (the owner's machine) reads each listed page, copies the sentences verbatim into a new corrections line and the build rerun matches them in the saved text. |
| Confidence tier | open_gap |
| Competing values | None |
| Product marking | Claims on blocked pages carry no tier above open_gap |
| Visual and audio impact | Terrain source panel, provenance |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None (reading a public page is not an owner-only act); the owner may allow wider network access for the build container. |
| Agent recommendation | Do this in one pass: 26 pages, all public (the NARA catalog page only in a browser, never by crawler). |
| Status | proposed (shard sources-a, close-out of 2026-11-16; not yet merged into register/) |
| Owner decision and date | (filled only from the Decision Log) |
