# EG-VISFIG-02: Named commanders and Rufus Dawes, update of EG-FIG-0004

| Field | Content |
|---|---|
| ID | EG-VISFIG-02: Named commanders and Rufus Dawes, update of EG-FIG-0004 |
| Requirement IDs | R04, OA04, R17 |
| Category | evidence missing (partly closed) |
| Description | Round result: a registry of 27 named commanders (8 kit named records, 18 named open-gap generals from the kit, Dawes) is now addressable in code and data (data/figures3d/commanders.json); each builds a generic officer figure at its rank from its kit unit, marked 'no individual model'. Dawes's rank and command are documented by his own report (OR27-1-R035, printed p. 275: Lieutenant Colonel, 6th Wisconsin). Dress, face, height and weapon of every commander except what the kit records give remain open. |
| Why literal 100% is not possible or blocked | No portrait, description of dress or face from a primary source is in the local library; the kit's named records are secondary or lead sources and stay at their effective tiers (Pickett, Meade, Hancock, Buford inferred; Custer, Stuart plausible-procedural; Lee's horse Traveller documented). |
| Evidence searched | kit/kit_specs.json named_individuals and rank_rules; history/positions/positions_A.jsonl POS-A-1D1-021 (Dawes). Not done: Dawes's memoir 'Service with the Sixth Wisconsin Volunteers', Library of Congress and National Archives portraits (public domain), Brady collection: not fetched this round, recorded as not done rather than failed. |
| Autonomous substitute applied | Generic officer figure with the commander's rank, officer flag and a visible card text; named_items from the kit record are returned beside the manifest and NOT applied, so a weak-source detail is never drawn as fact. |
| Strongest evidence-based reconstruction | Generic officer at rank, marked. |
| Confidence tier | plausible-procedural (figure); documented (Dawes's rank and command); gap (dress and face) |
| Competing values | - |
| Product marking | Card: 'no individual model: generic officer figure of the unit at this rank; the dress and face of this man are not in the record' (data/figures3d/commanders.json card); the UI card wiring is in the history layer (browser list). |
| Visual and audio impact | Every named commander, brigade to army. |
| Review status | internal review only (DEC-006: no public review label); nothing seen in a browser |
| Owner decision requested | Allow public-domain portrait and memoir sources (Library of Congress, National Archives, the Dawes memoir on archive.org) to be read so dress and likenesses can be reconstructed where they exist (labelled; R17 forbids a photo replica of a real person, so likeness is limited to documented features such as Howard's missing arm, Ewell's leg and Pickett's ringlets, each only when a non-lead source is read). |
| Agent recommendation | Keep marked; read the Dawes memoir first. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
