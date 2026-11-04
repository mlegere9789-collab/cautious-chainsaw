# vis-audio shard report (2026-11-04)

Inspected leftovers: dl.log (retry of Fatigue and Church at 60 s spacing, both HTTP 200, sha1 equal to Commons), commons-recheck.json (Commons imageinfo, licence and sha1 for the eight files), ledger-round3.mjs (idempotent script that ledgered them). The script had already been applied: sources.json holds 42 sources, all files on disk with matching sha256 (re-verified), BL-COMMONS-RATE closed, LEDGER2.csv updated, tests in audio3d-round2.test.mjs.

Done this run: AUD-G11 set to closed in app/data/audio3d/gaps.json (it still read open); results.jsonl (6 rows); proposed-register/EG-VISAUD-G11.md. No downloads were made (nothing new to fetch); previously failed hosts stay recorded as failed in sources.json.

Still open (register, no workaround): AUD-G01 (no 1863 weapon recordings), G02 (call notation), G03, G04, G05, G06, G07, G08, G09 (nobody has listened), G10 (packaging decision), G12, G13. Browser checks: docs/BROWSER-VERIFICATION-LIST-AUDIO.md.
