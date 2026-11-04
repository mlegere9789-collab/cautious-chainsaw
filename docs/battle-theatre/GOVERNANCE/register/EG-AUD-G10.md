# EG-AUD-G10: Recordings not packaged into the app build

| Field | Content |
|---|---|
| ID | EG-AUD-G10 (audio gap AUD-G10) |
| Requirement IDs | R03, R06 |
| Category | evidence missing |
| Description | Recordings are not packaged into the app build: the default build loads none and plays synthesis only; shipping them needs a packaging decision (the owner publishes drag-and-drop zips) and the attribution lines for CC BY items (FS-162628, FS-18229). |
| Why literal 100% is not possible or blocked | Not blocked by the record: a packaging decision and CC BY attribution lines are outstanding. |
| Evidence searched | app/data/audio3d/sources.json (shippable flags). |
| Autonomous substitute applied | loader.mjs loads shippable ledger entries on request; the panel lists exactly what is loaded. |
| Strongest evidence-based reconstruction | The loader loads shippable ledger entries on request and the panel lists exactly what is loaded; the default build plays synthesis only. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Panel credits list. (audio part's own label for this entry: open gap; recorded here at tier plausible-procedural because the register accepts only documented, inferred or plausible-procedural) |
| Visual and audio impact | Which sounds ship in the owner-published zip. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | none (work continues) |
| Agent recommendation | - |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
