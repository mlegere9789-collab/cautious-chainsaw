# EG-AUD-G13: Voice budget defaults and planner CPU cost on phones not measured in a browser

| Field | Content |
|---|---|
| ID | EG-AUD-G13 (audio gap AUD-G13) |
| Requirement IDs | R03, R06 |
| Category | evidence missing |
| Description | Voice budget defaults (160 individually sounded voices, 40 HRTF) and the planner's CPU cost on phones are not measured. |
| Why literal 100% is not possible or blocked | Not blocked by the record: no browser measurement has been made (no browser run permitted in this session). |
| Evidence searched | audio/PLAN.md 6.2 measured an AudioWorklet mixer (1,700 voices) in Chrome 155; the Web Audio graph here is unmeasured; planner cost measured in node only. |
| Autonomous substitute applied | Budget and fold-to-bed policy with an honest indicator; browser measurement listed. |
| Strongest evidence-based reconstruction | Budget and fold-to-bed policy with an honest indicator; browser measurement listed. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | UI line from allocate(). (audio part's own label for this entry: open gap; recorded here at tier plausible-procedural because the register accepts only documented, inferred or plausible-procedural) |
| Visual and audio impact | Number of individually sounded voices on weak devices. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | none (work continues) |
| Agent recommendation | - |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
