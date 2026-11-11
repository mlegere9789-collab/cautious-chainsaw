# EG-FIG-0010: Rights basis of the ACWII mod assets: verbal permission only; authorship of each file evidenced only by Subversion committer records

| Field | Content |
|---|---|
| ID | EG-FIG-0010 |
| Requirement IDs | R03, R04, R17 |
| Category | evidence missing (rights) |
| Description | The owner reported on 2026-11-11 that the mod licence was verified by phone with the mod maker and ordered the ACW models used. Recorded as: owner-reported verbal permission from the mod author, 2026-11-11; no written text on file. The mod author (Subversion author ACW_Primergy, ACWII, 2011) can license only files he made. The pack data carries Subversion records for 78 files (all committer ACW_Primergy, md5 equal to the committed bytes); a committer record proves who committed a file, not who drew it. Of 2,200 asset-pack files listed (213 Subversion and housekeeping files are read as evidence, not listed), 24 pass the evidence rules (tools/bt/acw/policy.py) and are shipped; every other file is listed with its reason in data/figures3d/acw/manifest.json. |
| Why literal 100% is not possible or blocked | No written licence, readme or credits exists in the archive (acw-leads ACW-L02); only the owner can obtain or record permission (CLAUDE.md: legal acts are owner-only). |
| Evidence searched | ACW.zip (sha256 8efdb262...c9ed): every .svn/entries (78 file records), mod_details.lua, localisation, launcher strings (read as text, never run). Not searched: the mod's Discord, manual or update pages (links found in the launcher; not visited). |
| Autonomous substitute applied | Only files with a committer record and no base-game marker are shipped; every unclear file is excluded and listed. The credit line is in data/figures3d/acw/credits.json. |
| Strongest evidence-based reconstruction | Procedural figures for everything not cleared; 24 mod-painted Confederate jacket texture sheets as lead swatches. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Credit line "ACWII mod by ACW_Primergy and team (used with the author's permission)" in the product credits data; tier mark on every use; the mod is no historical evidence (ACW-L01..L31). |
| Visual and audio impact | Which soldier, officer, gun and horse models can be used (none today). |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Ask the mod author for a short written confirmation (an email is enough) that names which files are his own work and which derive from the base game (norwegian_ski_troops meshes, field_carriage and euro_cannon_barrel textures, the base-game Euro heads and equipment); with it the excluded files can be re-evaluated and shipped by re-running tools/bt/acw/convert_acw.py. |
| Agent recommendation | Keep the evidence rules: exclude when unclear. Do not ship base-game derived meshes on a verbal permission. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
