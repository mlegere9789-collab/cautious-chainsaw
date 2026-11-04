"""Shared builders for kit units: tier ordering, unit/dispute/open-item registries, badge generation.
Imported by kit_src_union.py, kit_src_confed.py, kit_src_support.py and build_kit_data.py."""
from kit_sources import eff_tier, SOURCES
from kit_items import ITEMS, A, F, item, SHARE_WORD_TUNING

TIER_RANK = {"documented": 3, "inferred": 2, "plausible-procedural": 1}

UNITS = {}        # id -> unit spec
DISPUTES = {}     # id -> dispute record
OPEN_ITEMS = []   # list of open-item dicts (global registry; units reference ids)
DEFAULTS = {}     # id -> default spec


def weakest(tiers):
    return min(tiers, key=lambda t: TIER_RANK[t])


def PP(allowed, keys=(), raw=None, basis="inferred", **kw):
    """plausible-procedural draw instantiated from an inferred/documented basis (PDF B.6.2 'Default ... mix')."""
    return F(allowed, "plausible-procedural", keys, printed_raw=raw, basis_tier=basis, **kw)


def comp(item_id, share="all", printed="documented", keys=(), printed_weak=False, detail=None, **kw):
    """An accoutrement component with its own tier (PDF B.6.2 accoutrement table)."""
    tier, weak, why = eff_tier(printed, list(keys), printed_weak)
    d = A(item_id, share, detail)
    d.update({"tier_printed": printed, "tier": tier, "weak_source": weak, "source_keys": list(keys)})
    if why:
        d["tier_note"] = why
    d.update(kw)
    return d


def ACC(components, note=None, **kw):
    """Accoutrements field: field tier = weakest component tier."""
    tier = weakest([c["tier"] for c in components])
    keys = sorted({k for c in components for k in c["source_keys"]})
    f = {"allowed": components, "tier_printed": "per_component", "tier": tier,
         "weak_source": any(c["weak_source"] for c in components), "source_keys": keys,
         "source_basis": "printed_per_row"}
    if note:
        f["note"] = note
    f.update(kw)
    return f


def finish_field_tier(f):
    """If allowed entries carry their own tier, the field tier is the weakest of field tier and entry tiers."""
    ts = [e["tier"] for e in f["allowed"] if "tier" in e]
    f.setdefault("tier_declared", f["tier"])      # tier of the field's own claim before entry-level tiers pull the field tier down
    if ts:
        f["tier"] = weakest([f["tier"]] + ts)
    return f


def unit(uid, name, army, *, hierarchy_printed=None, corps=None, division=None, brigade=None, group=None,
         branch="infantry", scope="regiment", inherits=None, fields=None, printed=None, presence=None,
         zouave_policy="none", forbidden_tags=(), allowed_tags=(), opens=(), dispute_ids=(), parse_status="parsed",
         state=None, notes=None, conditional=None, weapon_assignment_ids=(), raw=None, named_individuals=None,
         pack_pile_ids=(), **extra):
    assert uid not in UNITS, uid
    u = {"id": uid, "name": name, "army": army, "scope": scope, "branch": branch, "group": group,
         "hierarchy_printed": hierarchy_printed, "corps": corps, "division": division, "brigade": brigade,
         "state": state,
         "presence": presence or {"status": "present_at_gettysburg", "arrival": None,
                                  "arrival_note": "arrival/departure windows live in PDF B.2.4 (not in B.6); not checked here"},
         "inherits": inherits, "fields": {k: finish_field_tier(v) for k, v in (fields or {}).items()},
         "zouave_policy": zouave_policy, "forbidden_tags": sorted(set(forbidden_tags)),
         "allowed_tags": sorted(set(allowed_tags)),
         "open": list(opens), "dispute_ids": list(dispute_ids), "parse_status": parse_status,
         "weapon_assignment_ids": list(weapon_assignment_ids)}
    if printed:
        u["printed"] = printed
    if notes:
        u["notes"] = notes
    if conditional:
        u["conditional_items"] = conditional
    if raw:
        u["raw"] = raw
    if named_individuals:
        u["named_individuals"] = named_individuals
    if pack_pile_ids:
        u["pack_pile_ids"] = list(pack_pile_ids)
    u.update(extra)
    UNITS[uid] = u
    return u


def O(oid, text, gaps=(), keys=()):
    """Register an open item.  gaps = G-ids from PDF B.6.13 that name it ([] = no G item names it)."""
    rec = {"id": oid, "text": text, "gap_ids": list(gaps), "source_keys": list(keys)}
    OPEN_ITEMS.append(rec)
    return oid


def dispute(did, topic, positions, status="disputed", pdf_default=None, handling=None, unit_ids=(), **kw):
    assert did not in DISPUTES, did
    d = {"id": did, "topic": topic, "status": status, "positions": positions,
         "pdf_recommended_default": pdf_default, "owner_decision": "PENDING OWNER", "handling": handling,
         "unit_ids": list(unit_ids)}
    d.update(kw)
    DISPUTES[did] = d
    return did


# --------------------------------------------------------------------------------------------------------------
# Corps badges (PDF B.6.2 'Corps badges').  Shape tier is as printed; division colours are the documented RULE applied
# to the order of battle, so each colour cell is inferred.
BADGE_SHAPES = {
    "I": ("disc (sphere/circle)", "documented", True, ["Wiki-IronBde", "Wiki-Badges"],
          "documented (Katcher table quoted on a forum, weak; Wikipedia Iron Brigade page says a red I Corps patch on the hat, which fits 1st Division red). Conflict in wording: 'circle patch' vs 'sphere'; treat as a disc",
          [("1st", "red", "Wadsworth"), ("2nd", "white", "Robinson"), ("3rd", "blue", "Doubleday/Rowley")]),
    "II": ("trefoil (clover leaf)", "documented", True, ["Wiki-Badges"], "documented (same forum table, weak)",
           [("1st", "red", "Caldwell"), ("2nd", "white", "Gibbon/Harrow"), ("3rd", "blue", "Hays")]),
    "III": ("lozenge (diamond)", "documented", True, ["Wiki-Badges", "AuthCamp-Badges"], "documented (same table, weak; the 124th NY example above)",
            [("1st", "red", "Birney/Ward"), ("2nd", "white", "Humphreys")]),
    "V": ("maltese cross", "documented", True, ["Wiki-Badges"], "documented (same table, weak)",
          [("1st", "red", "Barnes"), ("2nd", "white", "Ayres"), ("3rd", "blue", "Crawford, Pennsylvania Reserves")]),
    "VI": ("greek cross", "documented", True, ["Wiki-Badges"], "documented (same table, weak)",
           [("1st", "red", "Wright"), ("2nd", "white", "Howe"), ("3rd", "blue", "Newton/Wheaton")]),
    "XI": ("crescent", "documented", True, ["Wiki-Badges"], "documented (same table, weak)",
           [("1st", "red", "Barlow/Ames"), ("2nd", "white", "von Steinwehr"), ("3rd", "blue", "Schurz/Schimmelfennig")]),
    "XII": ("star", "plausible-procedural", False, [], "NOT sourced in the notes; from background memory only (both the v1 and v2 notes flag it). Treat as a lead, not a fact",
            [("1st", None, "Williams/Ruger"), ("2nd", None, "Geary")]),
    "CAV": ("crossed sabers", "plausible-procedural", False, [], "NOT sourced; memory only", []),
}
CORPS_BADGE_CELLS = {}   # corps -> printed row, for kit_specs.json


def make_badge_items():
    item("badge_none", "badge", "either", "No corps badge", [])
    item("badge_corps_unresolved", "badge", "union", "GAP PLACEHOLDER: corps badge whose division colour cannot be derived because the division is not printed for this unit", ["badge", "gap_placeholder"])
    for corps, (shape, ptier, weak, keys, raw, divs) in BADGE_SHAPES.items():
        for div, color, cmdr in divs:
            iid = "badge_%s_%s" % (corps, color if color else "div" + div)
            item(iid, "badge", "union", "%s corps badge (%s), %s division %s" % (corps, shape, div, color or "colour not derived"),
                 ["badge", "corps:" + corps], corps=corps, shape=shape, division=div, color=color,
                 positions=["kepi_top", "hat_left_side", "left_breast"])
        if corps == "CAV":
            item("badge_CAV_crossed_sabers", "badge", "union", "Cavalry Corps badge: crossed sabers (UNSOURCED, memory only)",
                 ["badge", "corps:CAV"], corps="CAV", shape=shape, color=None, positions=["kepi_top", "hat_left_side", "left_breast"])
        CORPS_BADGE_CELLS[corps] = {"shape": shape, "shape_tier_printed": ptier, "printed_source_status": raw,
                                    "weak_source": True,
                                    "source_keys": keys,
                                    "divisions": [{"division": d, "color": c, "commander_printed": m,
                                                   "tier": "inferred" if c else "plausible-procedural",
                                                   "note": "division colour = documented rule applied to the order of battle"} for d, c, m in divs]}


make_badge_items()


def badge_item_for(corps, division):
    """Badge item id from corps + division (division as '1st'|'2nd'|'3rd' or None)."""
    if corps not in BADGE_SHAPES:
        return None
    divs = {d: c for d, c, m in BADGE_SHAPES[corps][5]}
    if division in divs:
        c = divs[division]
        return "badge_%s_%s" % (corps, c if c else "div" + division)
    return "badge_corps_unresolved"


def badge_field(corps, division, *, all_men=False, extra_keys=()):
    """Corps-badge field for a Union unit.  Product rule (PDF B.6.2): badges on a minority of soldiers at three
    documented positions, with homemade variance.  Shape tier as printed (forum table, weak => inferred, weak)."""
    bid = badge_item_for(corps, division)
    shape, ptier, weak, keys, raw, _ = BADGE_SHAPES[corps]
    share = "all" if all_men else "minority"
    entries = [A(bid, share, "positions: kepi top, left side of hat, or over the left breast; homemade variance (size, shade, slightly wrong shape) on some", positions=["kepi_top", "hat_left_side", "left_breast"])]
    if not all_men:
        entries.append(A("badge_none", "most", "most soldiers show no badge (product rule)"))
    if ptier == "documented":
        f = F(entries, "documented", list(keys) + list(extra_keys), printed_weak=True,
              printed_raw=raw, note="shape per corps table; colour by division rule is inferred; issue per regiment in July 1863 is OPEN (G4)")
    else:
        f = F(entries, "plausible-procedural", list(keys), printed_raw=raw,
              note="shape unsourced: product rule requires the soldier's badge field be tagged plausible-procedural")
    if bid == "badge_corps_unresolved":
        f["tier"] = "plausible-procedural"
        f["note"] = (f.get("note", "") + "; division not printed in B.6.3 for this unit, colour cannot be derived here").strip("; ")
    return f


def ordn(n):
    if 10 <= n % 100 <= 20:
        suf = "th"
    else:
        suf = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return "%d%s" % (n, suf)
