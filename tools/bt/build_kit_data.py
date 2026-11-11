"""Build docs/battle-theatre/kit/{kit_specs,weapons,artillery_batteries,cavalry_units}.json from the kit_* data modules.
Run: python tools/bt/build_kit_data.py   (deterministic; no network).  Then: python tools/bt/check_kit.py"""
import json
import os
import sys
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "docs", "battle-theatre", "kit"))

import kit_src_union, kit_src_confed, kit_src_support, kit_src_artillery, kit_src_cavalry   # noqa: E402,F401  (order matters: each populates the registries)
from kit_core import UNITS, DISPUTES, OPEN_ITEMS, DEFAULTS, CORPS_BADGE_CELLS, BADGE_SHAPES                  # noqa: E402
from kit_items import ITEMS, SHARE_WORD_TUNING                                                              # noqa: E402
from kit_sources import SOURCES                                                                              # noqa: E402
import kit_weapons_data as KW                                                                               # noqa: E402
import kit_artillery_data as KA                                                                             # noqa: E402
import kit_src_artillery as AR                                                                              # noqa: E402
import kit_src_cavalry as CV                                                                                # noqa: E402
import kit_reference as RF                                                                                  # noqa: E402
import kit_gaps as GP                                                                                       # noqa: E402  (also adds B.6.6 context to the weapon records)
from kit_src_union import PACK_PILES                                                                        # noqa: E402
from kit_src_support import NAMED_OFFICERS, NAMED_OPEN, RANK_RULES, WEAR_STATES                             # noqa: E402

SCHEMA = "kit-1"
GENERATED_NOTE = "kit data of the Battle Theatre: every entry carries its tier and its source"

TIERS = ("documented", "inferred", "plausible-procedural")


def dump(name, obj):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False, sort_keys=False)
        f.write("\n")
    return p


def used_sources(*objs):
    keys = set()

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ("source_keys", "manual_keys", "table_source_keys") and isinstance(v, list):
                    keys.update(x for x in v if isinstance(x, str))
                walk(v)
        elif isinstance(o, list):
            for x in o:
                walk(x)
    for o in objs:
        walk(o)
    return {k: SOURCES[k] for k in sorted(keys) if k in SOURCES}, sorted(k for k in keys if k not in SOURCES)


def count_fields(units):
    n = 0
    for u in units.values():
        n += len(u.get("fields", {}))
        for v in (u.get("variants") or {}).values():
            n += len(v.get("fields", {}))
    return n


def build():
    inf_units = {k: v for k, v in UNITS.items() if v["branch"] not in ("artillery", "cavalry")}
    art_units = {k: v for k, v in UNITS.items() if v["branch"] == "artillery"}
    cav_units = {k: v for k, v in UNITS.items() if v["branch"] == "cavalry"}
    tuning = {
        "share_word_weights": {"values": SHARE_WORD_TUNING, "kind": "tuning_parameter", "historical_basis": False,
                               "note": "PDF B.6.2: the notes give no counts, so every default-mix weight is a tuning parameter with no historical basis, to be replaced the moment a sourced count is found. The share WORD is the PDF's; the number is ours."},
        "default_weapon_weights": {"note": "weights inside default.*.weapon fields (kit_src_union.dw / kit_src_cavalry.dwc) are tuning parameters; Union default long arms derive from Barry's 1864 chart (regiments, not men) normalised over the date-correct pair, flagged exceptions capped at 10%"},
        "wear_levels": "WEAR_STATES levels are tuning parameters (no source quantifies soiling)",
    }
    meta = {"schema": SCHEMA, "note": GENERATED_NOTE, "built": "deterministic (no timestamp)", "pdf_sections": "B.6.1-B.6.15 (plan-clean.txt pages 66-90)",
            "tiers": list(TIERS), "gap_status": "open_gap (tier 'gap': PDF lists GAP rows as open gaps and gives them no tier)"}
    src_tbl, missing = used_sources(RF.REFERENCE, GP.GAP_TABLE, GP.SCENE_EVIDENCE, GP.CONFLICTS_CARRIED, KW.AMMUNITION, UNITS, DEFAULTS, ITEMS, DISPUTES, OPEN_ITEMS, KW.WEAPONS, KW.ASSIGNMENTS, KA.PIECES, AR.ARTY_CARDS, CV.CAV_CARDS, NAMED_OFFICERS, RANK_RULES, PACK_PILES)
    assert not missing, missing

    kit_specs = {
        "meta": dict(meta, kind="kit_specs", counts={"units": len(inf_units), "defaults": len(DEFAULTS), "items": len(ITEMS), "disputes": len(DISPUTES), "open_items": len(OPEN_ITEMS),
                                                      "unit_fields_with_tier": count_fields(inf_units), "pack_piles": len(PACK_PILES), "named_individuals": len(NAMED_OFFICERS), "pdf_open_items": len(GP.GAP_TABLE), "reference_rows": sum(len(v) for v in RF.REFERENCE.values())},
                     cross_files={"weapons": "weapons.json", "artillery": "artillery_batteries.json", "cavalry": "cavalry_units.json"},
                     field_order=["headgear", "coat", "shirt", "trousers", "shoes", "accoutrements", "weapon", "bayonet", "sidearm_sword", "sash", "pack_state", "badge", "flag_or_instrument"],
                     rule="A field is 'documented' only if it cites at least one non-weak source key AND the PDF does not itself mark the support weak (CLAUDE.md Law cl.4); Wikipedia/forum/blog/auction-only = inferred with weak_source true. tier_printed keeps the PDF word."),
        "tuning_parameters": tuning,
        "sources": src_tbl,
        "items": ITEMS,
        "corps_badges": CORPS_BADGE_CELLS,
        "defaults": DEFAULTS,
        "units": inf_units,
        "disputes": DISPUTES,
        "open_items": OPEN_ITEMS,
        "pack_piles": PACK_PILES,
        "named_individuals": {"records": NAMED_OFFICERS, "not_done": NAMED_OPEN},
        "reference_tables": RF.REFERENCE,
        "pdf_open_items_G1_G21": GP.GAP_TABLE,
        "conflicts_carried": GP.CONFLICTS_CARRIED,
        "scene_evidence_records": GP.SCENE_EVIDENCE,
        "leads_to_verify_not_facts": GP.LEADS_TO_VERIFY,
        "rank_rules": RANK_RULES,
        "wear_states": WEAR_STATES,
    }

    pieces_conf = [c for p in KA.PIECES.values() for c in p["conflicts"]]
    weapons = {
        "meta": dict(meta, kind="weapons", counts={"weapons": len(KW.WEAPONS), "assignments": len(KW.ASSIGNMENTS), "artillery_pieces": len(KA.PIECES), "ammunition_types": len(KA.AMMO_TYPES), "crew_roles": len(KA.CREW["roles"]),
                                                    "drill_states": len(KA.CREW["states"])}),
        "tier_rule": KW.__doc__,
        "weapons": KW.WEAPONS,
        "assignments": KW.ASSIGNMENTS,
        "unit_row_rule": KW.UNIT_ROW_RULE,
        "overall_shares": KW.OVERALL_SHARES,
        "barry_chart": KW.BARRY_CHART,
        "data_quality_flags": KW.DATA_QUALITY_FLAGS,
        "print_sources_that_settle_open_rows": KW.SETTLING_PRINT_SOURCES,
        "ammunition": KW.AMMUNITION,
        "artillery": {
            "pieces": KA.PIECES,
            "inventory": KA.INVENTORY,
            "known_battery_armament": KA.BATTERY_ARMAMENT_KNOWN,
            "ballistic_modelling_rule": KA.BALLISTIC_RULE,
            "ammunition_types": KA.AMMO_TYPES,
            "battery_stock": KA.BATTERY_STOCK,
            "fuzes": KA.FUZES,
            "round_totals": KA.ROUND_TOTALS,
            "ammunition_choice": KA.AMMO_CHOICE,
            "crew": KA.CREW,
            "teams_and_vehicles": KA.TEAMS,
            "placement": KA.PLACEMENT,
            "fire_effect_rules": AR.FIRE_EFFECT_RULES,
            "total_war_note": AR.TW_NOTE,
            "conflicts": pieces_conf,
            "drill_files": ["docs/battle-theatre/drill/drill_artillery.json", "docs/battle-theatre/drill/ordnance_tables.json", "docs/battle-theatre/drill/drill_infantry.json", "docs/battle-theatre/drill/drill_hardee.json", "docs/battle-theatre/drill/drill_compare.json"],
        },
        "sources": used_sources(KW.WEAPONS, KW.ASSIGNMENTS, KA.PIECES, KA.CREW, KA.AMMO_TYPES, KW.AMMUNITION)[0],
    }

    artillery = {
        "meta": dict(meta, kind="artillery_batteries", counts={"batteries": len(AR.ARTY_CARDS), "formations": len(AR.BRIGADES), "kit_units": len(art_units), "with_stated_guns": sum(1 for c in AR.ARTY_CARDS.values() if c["guns"]),
                                                               "with_detail_rows": sum(1 for c in AR.ARTY_CARDS.values() if c.get("details"))},
                     note="Gun counts are copied as printed; 'gap' where the PDF gives none.  The 4-gun-per-battery Confederate default is NOT applied to any card (PDF: usable only as a total check)."),
        "formations": AR.BRIGADES,
        "batteries": AR.ARTY_CARDS,
        "units": art_units,
        "formation_detail_rows": AR.FORMATION_ROWS,
        "cannonade_july3": AR.CANNONADE,
        "order_of_battle_notes": AR.LANE_NOTE,
        "gaps_B6_14_10": [{"gap": g, "source_that_would_settle_it": s, "status": st} for g, s, st in AR.GAPS_B6_14_10],
        "sources": used_sources(AR.ARTY_CARDS, AR.BRIGADES, AR.DETAILS, AR.FORMATION_ROWS, AR.CANNONADE)[0],
    }
    cavalry = {
        "meta": dict(meta, kind="cavalry_units", counts={"regiments_and_battalions": len(CV.CAV_CARDS), "formations": len(CV.CAV_FORMATIONS), "kit_units": len(cav_units)}),
        "formations": CV.CAV_FORMATIONS,
        "cards": CV.CAV_CARDS,
        "units": cav_units,
        "strengths": CV.STRENGTHS,
        "strengths_note": CV.STRENGTHS_NOTE,
        "carbines": CV.CARBINE_FACTS,
        "horses": CV.HORSES,
        "horse_animation_rule": CV.HORSE_RULE,
        "behaviour_states": [{"state": s, "used_for": u, "tier": "plausible-procedural"} for s, u in CV.CAV_STATES],
        "arrival_rule_facts": CV.STATES_FACTS,
        "conflicts_register": [{"conflict": a, "positions": b, "handling": c, "status": "carried"} for a, b, c in CV.CAV_CONFLICTS],
        "gaps": [{"gap": g, "source_that_would_settle_it": s} for g, s in CV.CAV_GAPS],
        "action_table_note": "The B.6.15.3 action-by-action table (June 26 - July 16) is event data, not kit data; it is NOT reproduced here (routed to the timeline: GOVERNANCE/timeline_seed.jsonl). Listed in KIT-NOTES.md.",
        "sources": used_sources(CV.CAV_CARDS, CV.STRENGTHS, CV.HORSES, CV.CARBINE_FACTS)[0],
    }
    paths = [dump("kit_specs.json", kit_specs), dump("weapons.json", weapons), dump("artillery_batteries.json", artillery), dump("cavalry_units.json", cavalry)]
    return paths, kit_specs, weapons, artillery, cavalry


if __name__ == "__main__":
    paths, ks, w, a, c = build()
    for p in paths:
        print(p, os.path.getsize(p))
    print("units", len(ks["units"]), "arty units", len(a["units"]), "cav units", len(c["units"]), "items", len(ks["items"]), "weapons", len(w["weapons"]))
