# EG-FIG-0011: ACW mod links of Gettysburg units and mod swatch colours are lead-derived inferences, not records of what a regiment wore

| Field | Content |
|---|---|
| ID | EG-FIG-0011 |
| Requirement IDs | R03, R04 |
| Category | evidence missing |
| Description | data/figures3d/acw/unit-map.json joins 77 of the 135 kit units to the mod's Gettysburg uniform tables by the regiment token of the mod key (hc_us_1_inf_19IN to US.19IN); 19 joins are ambiguous (several mod rows share the token) and no row is chosen; 58 kit units have no join (brigade-level kit units such as CS.LAW); 675 mod keys have no kit unit. The mod table records the modders' choices (acw-leads ACW-L03, L04, L06, L07), not regimental dress. The cleared jacket swatches are the mean colour of mod-painted texture sheets. |
| Why literal 100% is not possible or blocked | Whether regiment X wore Y is a question for regimental histories, quartermaster returns and surviving garments, none of which was read here (Law 4). |
| Evidence searched | The mod uniform tables (decoded Gettysburg_Union_Uniforms 444 rows, Gettysburg_Confed_Uniforms 355 rows) and unit_variant part lists; kit/kit_specs.json. Not searched: any real source for any regiment. |
| Autonomous substitute applied | Each link carries the label "lead-derived inference" and this gap id; the kit manifest remains the dress authority; the swatch is a lead colour only. |
| Strongest evidence-based reconstruction | The kit manifest's dress (documented/inferred/plausible per field) drives the figure; the mod link is shown as a lead. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | F-ACW-UNIT-LINK and F-ACW-SWATCH in src/figures3d/acw-tiers.mjs; every link labelled in unit-map.json. |
| Visual and audio impact | No figure changes: links and swatches are metadata until a cleared mesh exists. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Authorise the real-source lookup per regiment (state regimental histories, quartermaster returns, museum garments) so the links can be confirmed or dropped. |
| Agent recommendation | Keep the links as leads; never promote them. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
