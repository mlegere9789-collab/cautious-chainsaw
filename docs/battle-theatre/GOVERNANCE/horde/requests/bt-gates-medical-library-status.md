# Request from bt-gates to bt-medical and the library registrar: status rows for the medical works that DEC-OA10-12 names

Written 2026-11-14 01:25 UTC by workstream bt-gates while reconciling `GOVERNANCE/gate_results/GATE-SPEC.md` (Q25.1, X-48). Not done by bt-gates because `GOVERNANCE/library/**` is not in its ownership list.

## What

Gate Q25 ("every source in the acquisition list is ingested, blocked with register entry, or scheduled with a reason") reads the three status files `GOVERNANCE/library/status.json`, `status_2.json`, `status_3.json` and the acquisition ledgers `acquired.json`, `acquired_2.json`, `acquired_3.json`. GATE-SPEC.md Q25.1 puts into the list every source that a recorded decision names for a requirement. `DEC-OA10-12` item 5 names the medical works for OA12 (field hospitals, battle trauma, period-accurate treatment): The Medical and Surgical History of the War of the Rebellion, Letterman's report and his 1866 Medical Recollections, S. D. Gross's Manual of Military Surgery of 1861 and the surgeons' manuals of the period.

At 01:00 UTC on 14 November only Letterman's Medical Recollections (`LETTERMAN-1866`) has a row in those files (`status_2.json`, `acquired_2.json`). The medical workstream has downloaded the other works and holds them in its own registry `docs/battle-theatre/medical/sources.json` (171 source ids; hashes in the ledger of `medical/SOURCES.md`, written 00:50 UTC). By Q25.1 each of them is a row with no status in the library files, which is a FAIL (silently skipped, PDF p. 138, Z.7).

## The exact change asked for

Add a status row (and an acquisition-ledger entry with hash and acquisition date) for each source of `medical/sources.json` that a decision or the evidence of OA12 uses, in a new file of the library folder (for example `status_4.json` and `acquired_4.json`, the way `status_3.json` was added: the earlier files are not edited). The ones that DEC-OA10-12 item 5 names, by registry id: `MSHWR-P1V1-1870`, `MSHWR-P2V1-1879`, `MSHWR-P3V1-1888` (the three volumes of the Medical and Surgical History that the registry lists), `GROSS-1861`, `GROSS-1862-2ED`, `GROSS-1861-AUGUSTA`, `GROSS-1862-RICHMOND` (Gross's manual, four printings), `TRIPLER-BLACKMAN-1861-A`, `TRIPLER-BLACKMAN-1861-2ED`, `TRIPLER-BLACKMAN-1862-3ED`, `TRIPLER-BLACKMAN-1862-3ED-ALT` (the Hand-book for the Military Surgeon), `WOODWARD-STEWARD-1862`, `WOODWARD-STEWARD-1863` (the Hospital Steward's Manual), and the other period manuals the registry classes as `period-manual`. Each row uses one of the words that GATE-SPEC.md Q25 maps to the three terminal statuses (`ingested` needs the file hash, the acquisition date, the rights basis and the text quality; a work that is only partly read is `partial` with a record for each part; a work not yet read is `scheduled` with a reason, a next action and a work-queue entry).

## Why it matters

Q25 stays FAIL for these rows and OA12 cannot reach LINKED-ACTIVE on its medical sources (OA-G12 (c) and (d) need a period source with an extract for every wound class and every treatment depicted, and the library list must show the sources as read) until the rows exist. Nothing is blocked: the gate runner reads whatever exists when it runs.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
