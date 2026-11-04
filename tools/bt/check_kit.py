#!/usr/bin/env python3
"""Kit data checker and anachronism validator (PDF B.6.12 validation test, gate Q03).

Checks the data-checkable subset of B.6.12:
  2 anachronism list, 3 wrong-unit items, 4 branch correctness, 5 tier completeness, 6 reproducibility
  (1 presence test: only 'unit absent from the battle' is checked here; arrival/departure times live in PDF B.2.4 and are checked
   by the caller via the optional presence_fn hook; 7 sample audit needs a renderer: not checkable here)
Usage:
  python tools/bt/check_kit.py            # data checks + population test + self-tests; exit 1 on any ERROR
  python tools/bt/check_kit.py --quiet
API:
  manifest_for(soldier_id, unit_id, seed, date='1863-07-02', rank='private', role='rifleman', variant=None) -> dict
  validate_manifest(manifest, presence_fn=None) -> list[Finding]   (severity 'FAIL' or 'FLAG')
Determinism: the integer mixing is a line-for-line port of docs/battle-theatre/sim/rng.mjs (fmix32, hash4, strId); GOLDEN below
holds values produced by running that JS file under node, and --node re-computes them live when node is on PATH.
Run python with PYTHONIOENCODING=utf-8 on Windows."""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.normpath(os.path.join(HERE, "..", "..", "docs", "battle-theatre", "kit"))
RNG_MJS = os.path.normpath(os.path.join(HERE, "..", "..", "docs", "battle-theatre", "sim", "rng.mjs"))

TIERS = ("documented", "inferred", "plausible-procedural")
ENLISTED = ("private", "corporal", "sergeant", "first sergeant")
OFFICERS = ("lieutenant", "captain", "field officer", "general")
LONG_ARM_BRANCHES = ("infantry", "sharpshooter", "cavalry", "provost", "pioneer")
SWORD_IDS = ("m1850_foot_officer_sword", "m1840_nco_sword", "m1860_light_cav_saber", "m1840_heavy_saber")
FIELD_ORDER = ["headgear", "coat", "shirt", "trousers", "shoes", "accoutrements", "weapon", "bayonet", "sidearm_sword", "sash", "pack_state", "badge", "flag_or_instrument"]
OFFICER_FIELDS = ("coat", "headgear", "trousers", "shirt", "accoutrements", "sidearm_sword", "sash")
COMPONENT_PROB_DIVISOR = 6.0     # tuning parameter: an accoutrement component with weight w is drawn with probability min(1, w/6)
WEAPON_TAGS = {"spencer_repeater": ["spencer"], "henry_rifle": ["henry"], "m1863_rifle_musket": ["m1863"], "whitworth_rifle": ["whitworth"]}
SPENCER_FIRST_DATE = "1863-06-30"      # B.6.12 item 2: no Spencer before this date
BATTLE_WEAPON_KINDS = ("long_arm", "carbine", "repeater")

# Values produced by node on docs/battle-theatre/sim/rng.mjs (see --node to recompute live).
GOLDEN = {
    "fmix32": [[0, 0], [1, 1364076727], [2, 821347078], [305419896, 3816608188], [4294967295, 2180083513]],
    "hash4": [[[0, 0, 0, 0], 3060330894], [[1, 2, 3, 4], 1438725962], [[2026, 12345, 7, 3], 3582043011],
              [[4294967295, 4294967295, 4294967295, 4294967295], 3067594736], [[1863, 987654321, 0, 1], 2304879838]],
    "strId": [["US.2WI", 4228250940], ["S-0001", 3694960479], ["Gettysburg", 112901240], ["", 2872998923], ["CS.5ALBN:0042", 360896349]],
    "rand": [[[1863, 5, 0, 1], 0.09092462016269565], [[1863, 5, 0, 2], 0.5084548841696233], [[99, 7, 3, 0], 0.15517220366746187]],
}
M32 = 0xFFFFFFFF


# ----------------------------------------------------------------------------------------------------------------
# RNG: port of rng.mjs (integer-only mixing; bit-identical to the JS)
def fmix32(h):
    h &= M32
    h ^= h >> 16
    h = (h * 0x85ebca6b) & M32
    h ^= h >> 13
    h = (h * 0xc2b2ae35) & M32
    h ^= h >> 16
    return h & M32


def hash4(a, b, c, d):
    h = fmix32((a & M32) ^ 0x9e3779b9)
    h = fmix32(((h ^ (b & M32)) + 0x7f4a7c15) & M32)
    h = fmix32(((h ^ (c & M32)) + 0x94d049bb) & M32)
    h = fmix32(((h ^ (d & M32)) + 0xbf58476d) & M32)
    return h


def rand(seed, agent, bucket, stream=0):
    return hash4(seed, agent, bucket, stream) / 4294967296.0


def str_id(s):
    h = 2166136261
    b = s.encode("utf-16-le")                    # JS charCodeAt walks UTF-16 code units
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 16777619) & M32
    return fmix32(h)


def soldier_seed(project_seed, soldier_id):
    """PDF B.6.12 'seed': integer derived from soldier_id and the project seed; fixes every draw."""
    return hash4(project_seed & M32, str_id(soldier_id), 0, 0)


def check_golden():
    bad = []
    for x, want in GOLDEN["fmix32"]:
        if fmix32(x) != want:
            bad.append(("fmix32", x, fmix32(x), want))
    for a, want in GOLDEN["hash4"]:
        if hash4(*a) != want:
            bad.append(("hash4", a, hash4(*a), want))
    for s, want in GOLDEN["strId"]:
        if str_id(s) != want:
            bad.append(("strId", s, str_id(s), want))
    for a, want in GOLDEN["rand"]:
        if rand(*a) != want:
            bad.append(("rand", a, rand(*a), want))
    return bad


def node_golden():
    """Recompute the golden values live with node from rng.mjs. Returns (status, detail)."""
    js = ("import {fmix32,hash4,rand,strId} from %s;" % json.dumps("file:///" + RNG_MJS.replace("\\", "/")) +
          "const G=%s;const o={fmix32:G.fmix32.map(([x])=>[x,fmix32(x)]),hash4:G.hash4.map(([a])=>[a,hash4(...a)]),strId:G.strId.map(([s])=>[s,strId(s)]),rand:G.rand.map(([a])=>[a,rand(...a)])};console.log(JSON.stringify(o));" % json.dumps(GOLDEN))
    try:
        r = subprocess.run(["node", "--input-type=module", "-e", js], capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.SubprocessError) as e:
        return "skipped", "node unavailable: %s" % e
    if r.returncode != 0:
        return "error", r.stderr[-300:]
    got = json.loads(r.stdout)
    return ("ok" if got == GOLDEN else "MISMATCH"), (None if got == GOLDEN else "node output differs from GOLDEN")


# ----------------------------------------------------------------------------------------------------------------
# Data loading
class Kit:
    def __init__(self, kit_dir=KIT):
        def ld(n):
            with open(os.path.join(kit_dir, n), encoding="utf-8") as f:
                return json.load(f)
        self.ks = ld("kit_specs.json")
        self.wp = ld("weapons.json")
        self.ab = ld("artillery_batteries.json")
        self.cu = ld("cavalry_units.json")
        self.units = {}
        for src in (self.ks["units"], self.ab["units"], self.cu["units"]):
            for k, v in src.items():
                assert k not in self.units, "duplicate unit id " + k
                self.units[k] = v
        self.defaults = self.ks["defaults"]
        self.items = self.ks["items"]
        self.weapons = self.wp["weapons"]
        self.assign = self.wp["assignments"]
        self.sources = dict(self.ks["sources"])
        for t in (self.wp, self.ab, self.cu):
            self.sources.update(t.get("sources", {}))
        self.disputes = self.ks["disputes"]

    # -- catalog ------------------------------------------------------------------------------------------------
    def cat(self, iid):
        if iid in self.items:
            it = self.items[iid]
            return {"id": iid, "kind": it["kind"], "army": it["army"], "tags": it.get("tags", []), "barred": bool(it.get("barred")), "src": "items"}
        if iid in self.weapons:
            w = self.weapons[iid]
            cat = w["category"]
            kind = "weapon" if cat in BATTLE_WEAPON_KINDS else ("bayonet" if cat == "bayonet" else "sidearm")
            return {"id": iid, "kind": kind, "category": cat, "army": w["army"], "tags": WEAPON_TAGS.get(iid, []), "barred": bool(w.get("barred")), "src": "weapons"}
        return None

    def nonweak(self, keys):
        return any(k in self.sources and not self.sources[k]["weak"] for k in keys)

    def chain(self, unit_id):
        u = self.units[unit_id]
        out = [u]
        nxt = u.get("inherits")
        guard = 0
        while nxt:
            d = self.defaults[nxt]
            out.append(d)
            nxt = d.get("inherits")
            guard += 1
            assert guard < 10
        return out

    def officer_default(self, army):
        return self.defaults["default.%s.officers" % army]


def valid_entry(e, date, kit):
    c = kit.cat(e["item"])
    if c is None or c["barred"]:
        return False
    if e.get("valid_from") and date < e["valid_from"]:
        return False
    if e.get("valid_to") and date > e["valid_to"]:
        return False
    if e.get("only_on") and date != e["only_on"]:
        return False
    return True


def resolve_field(kit, unit_id, field, date, variant=None, rank="private", sv=None):
    """Nearest definition of a field in the chain (unit variant > unit > defaults), honouring date_fallback; officers use the officer
    default unless the unit's definition is unit_wide.  soldier_variants (Ambulance Corps): with sv the named soldier variant's field
    replaces the base; without sv (validation) every soldier variant's entries are added to the allowed set.
    Returns (spec, valid_entries, owner_id) or (None, [], None)."""
    u = kit.units[unit_id]
    chain = kit.chain(unit_id)
    is_off = rank in OFFICERS
    svs = u.get("soldier_variants") or []
    if sv:
        for v in svs:
            if v["id"] == sv and field in v.get("fields", {}):
                spec = v["fields"][field]
                ents = [e for e in spec["allowed"] if valid_entry(e, date, kit)]
                if ents:
                    return spec, ents, unit_id + "@" + sv
    specs = []
    if variant and u.get("variants") and variant in u["variants"] and field in u["variants"][variant]["fields"]:
        specs.append((u["variants"][variant]["fields"][field], unit_id + "#" + variant))
    for node in chain:
        if field in node.get("fields", {}):
            specs.append((node["fields"][field], node["id"]))
    if is_off and field in OFFICER_FIELDS:
        od = kit.officer_default(u["army"])
        if field in od["fields"]:
            unitwide = [s for s, o in specs if s.get("unit_wide")]
            if not unitwide:
                specs = [(od["fields"][field], od["id"])] + specs
    extras = []
    if not sv:
        for v in svs:
            if field in v.get("fields", {}):
                extras += [e for e in v["fields"][field]["allowed"] if valid_entry(e, date, kit)]
    for spec, owner in specs:
        ents = [e for e in spec["allowed"] if valid_entry(e, date, kit)]
        if ents:
            return spec, ents + extras, owner
        if spec.get("date_fallback") == "inherit_default":
            continue
        return spec, [] + extras, owner
    if extras:
        return svs[0]["fields"].get(field) or [v for v in svs if field in v.get("fields", {})][0]["fields"][field], extras, unit_id + "@soldier_variants"
    return None, [], None


def find_entries_anywhere(kit, unit_id, field, item, variant=None):
    """Every spec entry for (unit, field, item) anywhere in the unit, its variants, soldier variants and default chain (for date diagnosis)."""
    u = kit.units[unit_id]
    out = []
    pools = [u]
    if variant and u.get("variants") and variant in u["variants"]:
        pools.append(u["variants"][variant])
    pools += list(kit.chain(unit_id)[1:]) + list(u.get("soldier_variants") or [])
    for node in pools:
        f = node.get("fields", {}).get(field)
        if f:
            out += [e for e in f["allowed"] if e["item"] == item]
    return out


# ----------------------------------------------------------------------------------------------------------------
# Manifest generation
def has_tag(kit, iid, tag):
    c = kit.cat(iid)
    return bool(c) and tag in c["tags"]


def rank_allows_item(kit, iid, rank, unit):
    """Rank rules for sashes and swords (B.6.12 hard limit 4)."""
    c = kit.cat(iid)
    if not c:
        return False
    if rank in OFFICERS:
        return True
    tags = c["tags"]
    if "officer_only" in tags:
        return False
    if "sash" in tags and "zouave" not in tags:
        return rank in ("sergeant", "first sergeant") and iid in ("sash_red_artillery", "sash_yellow_cavalry", "sash_red_cs")
    if iid in SWORD_IDS and unit["branch"] != "cavalry":
        return False
    return True


def manifest_for(soldier_id, unit_id, seed, date="1863-07-02", rank="private", role="rifleman", variant=None, kit=None, flags_in=()):
    """Deterministic kit manifest.  Same (soldier_id, unit_id, seed, date, rank, role, variant) -> identical manifest."""
    kit = kit or get_kit()
    u = kit.units[unit_id]
    if u.get("variants") and not variant:
        raise ValueError("unit %s is disputed (%s): a scenario variant must be selected, no default is chosen: %s" % (unit_id, ",".join(u["dispute_ids"]), ", ".join(u["variants"])))
    if u["presence"]["status"] != "present_at_gettysburg":
        raise ValueError("unit %s is %s: no soldier may be generated" % (unit_id, u["presence"]["status"]))
    sd = soldier_seed(seed, soldier_id)
    army = u["army"]
    out = {"soldier_id": soldier_id, "seed": sd, "project_seed": seed, "unit": unit_id, "army": army, "corps": u.get("corps"), "division": u.get("division"), "brigade": u.get("brigade"),
           "branch": u["branch"], "rank": rank, "role": role, "date": date, "variant": variant, "fields": {}, "tier_map": {}, "source_ids": [], "flags": list(flags_in), "dispute_ids": list(u.get("dispute_ids", []))}
    sources = set()
    sv = None
    svs = u.get("soldier_variants") or []
    if svs:
        wts = kit.ks["tuning_parameters"]["share_word_weights"]["values"]
        ws = [wts.get(v.get("share", "some"), 2.0) for v in svs]
        r = rand(sd, 98, 0, 1) * sum(ws)
        acc = 0.0
        sv = svs[-1]["id"]
        for v, w in zip(svs, ws):
            acc += w
            if r < acc:
                sv = v["id"]
                break
        out["soldier_variant"] = sv
    for fi, field in enumerate(FIELD_ORDER):
        if field in ("weapon", "bayonet") and (u["branch"] not in LONG_ARM_BRANCHES or rank in OFFICERS):
            # artillery / support branches and officers carry no long arm (officers: sidearm/sword field; inferred rule, KIT-NOTES)
            if field == "bayonet":
                out["fields"]["bayonet"] = {"items": ["bayonet_none_not_applicable"], "tier": "inferred", "source_keys": [], "weak_source": None, "owner": "rule:no long arm", "assignment_id": None, "captured": [], "pile_ids": []}
                out["tier_map"]["bayonet"] = "inferred"
            continue
        if field == "bayonet" and u["branch"] == "cavalry":
            out["fields"]["bayonet"] = {"items": ["bayonet_none_not_applicable"], "tier": "inferred", "source_keys": [], "weak_source": None, "owner": "rule:cavalry carbine", "assignment_id": None, "captured": [], "pile_ids": []}
            out["tier_map"]["bayonet"] = "inferred"
            continue
        spec, ents, owner = resolve_field(kit, unit_id, field, date, variant, rank, sv)
        if spec is None:
            continue
        # filter by rank rules and drop-pack pile availability
        ok = []
        for e in ents:
            if not rank_allows_item(kit, e["item"], rank, u):
                continue
            if has_tag(kit, e["item"], "needs_pile_id") and not e.get("pile_id"):
                out["flags"].append("pack_dropped_without_pile_id_skipped")
                continue
            if has_tag(kit, e["item"], "kepi") and army == "confederate" and rank in ENLISTED and e.get("flagged_exception") != "private_purchase":
                continue
            ok.append(e)
        if not ok:
            continue
        chosen = []
        if field == "accoutrements":
            for ci, e in enumerate(ok):
                w = e["weight"]["value"]
                p = 1.0 if e.get("share") == "all" else min(1.0, w / COMPONENT_PROB_DIVISOR)
                if p >= 1.0 or rand(sd, fi, 0, 10 + ci) < p:
                    chosen.append(e)
        else:
            tot = sum(e["weight"]["value"] for e in ok)
            r = rand(sd, fi, 0, 1) * tot
            acc = 0.0
            pick = ok[-1]
            for e in ok:
                acc += e["weight"]["value"]
                if r < acc:
                    pick = e
                    break
            chosen = [pick]
        items = [e["item"] for e in chosen]
        tiers = []
        for e in chosen:
            tiers.append(e.get("tier", spec.get("tier_declared", spec["tier"])))
            if e.get("flagged") or e.get("flagged_exception") or e.get("flagged_exception") == "private_purchase":
                out["flags"].append("flagged_entry:%s" % e["item"])
            if e.get("flagged_exception") == "private_purchase":
                out["flags"].append("private_purchase_exception")
            if has_tag(kit, e["item"], "gap_placeholder"):
                out["flags"].append("gap_placeholder:%s" % e["item"])
        if not tiers:
            tiers = [spec.get("tier_declared", spec["tier"])]
        ftier = min(tiers, key=lambda t: {"documented": 3, "inferred": 2, "plausible-procedural": 1, "gap": 0}.get(t, 0))
        keys = list(spec.get("source_keys", []))
        out["fields"][field] = {"items": items, "tier": ftier, "source_keys": keys, "weak_source": spec.get("weak_source"), "owner": owner,
                                "assignment_id": spec.get("assignment_id"), "captured": [e["item"] for e in chosen if e.get("captured")],
                                "pile_ids": [e["pile_id"] for e in chosen if e.get("pile_id")]}
        out["tier_map"][field] = ftier
        if ftier == "documented":
            sources.update(keys)
    # wear state (PDF: inferred; the level is a tuning parameter drawn per soldier)
    wsid = None
    for w in kit.ks["wear_states"]:
        if w.get("from") and w.get("to") and w["from"] <= date <= w["to"]:
            wsid = w["id"]
    if wsid is None and date <= "1863-06-30":
        wsid = "before_jul1"
    out["wear_state"] = {"state": wsid, "level": round(rand(sd, 99, 0, 1), 6), "tier": "inferred", "level_kind": "tuning_parameter"}
    out["tier_map"]["wear_state"] = "inferred"
    out["source_ids"] = sorted(sources)
    out["flags"] = sorted(set(out["flags"]))
    if u.get("dispute_ids"):
        out["flags"].append("disputed:" + ",".join(u["dispute_ids"]))
    return out


_KIT = None


def get_kit():
    global _KIT
    if _KIT is None:
        _KIT = Kit()
    return _KIT


# ----------------------------------------------------------------------------------------------------------------
# Validator
class Finding(dict):
    def __init__(self, code, severity, msg, field=None, item=None):
        super().__init__(code=code, severity=severity, msg=msg, field=field, item=item)


def _fail(out, code, msg, field=None, item=None):
    out.append(Finding(code, "FAIL", msg, field, item))


def _flag(out, code, msg, field=None, item=None):
    out.append(Finding(code, "FLAG", msg, field, item))


def validate_manifest(m, presence_fn=None, kit=None):
    """B.6.12 validation items 1-5 for one manifest.  Returns findings; any FAIL fails the build."""
    kit = kit or get_kit()
    out = []
    uid = m.get("unit")
    if uid not in kit.units:
        _fail(out, "UNKNOWN_UNIT", "unit %r is not in the kit data" % uid)
        return out
    u = kit.units[uid]
    army = u["army"]
    date = m["date"]
    rank = m.get("rank", "private")
    fields = m.get("fields", {})
    variant = m.get("variant")

    # 1. presence (data-checkable part)
    if u["presence"]["status"] != "present_at_gettysburg":
        _fail(out, "PRESENCE_ABSENT_UNIT", "unit %s is %s: no soldier may exist (%s)" % (uid, u["presence"]["status"], u["presence"].get("note", "")))
    if presence_fn is not None and not presence_fn(uid, date):
        _fail(out, "PRESENCE_TIME", "unit %s is not on the field at %s (B.2.4)" % (uid, date))
    if u.get("variants") and not variant:
        # disputed unit: infer the variant that holds ALL drawn variant-controlled items; otherwise fail on mixing
        cands = []
        for vk, v in u["variants"].items():
            okv = True
            for fld, vspec in v["fields"].items():
                ids = set(e["item"] for e in vspec["allowed"])
                for iid in fields.get(fld, {}).get("items", []):
                    if iid not in ids:
                        okv = False
            cands.append(vk) if okv else None
        if len(cands) != 1:
            _fail(out, "DISPUTED_VARIANT_MIXED", "unit %s: items do not fit exactly one disputed variant %s" % (uid, list(u["variants"])))
        else:
            variant = cands[0]
    if u.get("dispute_ids"):
        _flag(out, "DISPUTED_FLAGGED", "unit %s carries dispute %s (both variants allowed; variant %s)" % (uid, ",".join(u["dispute_ids"]), variant))

    all_items = []
    # 5. tier completeness
    tmap = m.get("tier_map", {})
    for fld, fv in fields.items():
        t = tmap.get(fld) or fv.get("tier")
        if t is None or t not in TIERS + ("gap",):
            _fail(out, "TIER_MISSING", "field %s has no valid tier (%r)" % (fld, t), fld)
            continue
        if t == "documented":
            keys = fv.get("source_keys") or []
            if not keys or not kit.nonweak(keys):
                _fail(out, "TIER_DOCUMENTED_NO_SOURCE", "field %s is tier documented but cites no non-weak source key (%r)" % (fld, keys), fld)
            if not set(keys) <= set(m.get("source_ids", [])) and keys:
                _fail(out, "TIER_SOURCE_IDS", "field %s source keys not listed in manifest source_ids" % fld, fld)
    for fld in fields:
        if fld not in tmap:
            _fail(out, "TIER_MAP_MISSING_FIELD", "tier_map lacks field %s" % fld, fld)

    # per-item checks
    long_arms = []
    for fld, fv in fields.items():
        for iid in fv.get("items", []):
            all_items.append((fld, iid))
    for fld, iid in all_items:
        c = kit.cat(iid)
        if c is None:
            _fail(out, "UNKNOWN_ITEM", "item %s is not in the catalog" % iid, fld, iid)
            continue
        tags = c["tags"]
        # 2. anachronism list ---------------------------------------------------------------------------
        if c["barred"] or "barred_claim" in tags:
            _fail(out, "ANACH_BARRED_ITEM", "item %s is barred (%s)" % (iid, kit.items.get(iid, kit.weapons.get(iid, {})).get("barred_reason") or kit.items.get(iid, {}).get("label", "")), fld, iid)
        if "type_iii" in tags:
            _fail(out, "ANACH_TYPE_III", "Type III Richmond Depot jacket / transitional kersey jacket postdates the battle", fld, iid)
        if iid == "m1863_rifle_musket" or "m1863" in tags:
            _fail(out, "ANACH_M1863", "M1863 rifle-musket was not in field issue at Gettysburg", fld, iid)
        if iid == "henry_rifle" or "henry" in tags:
            _fail(out, "ANACH_HENRY", "Henry rifle: none documented at Gettysburg; do not place", fld, iid)
        if "wheats_tiger_dress" in tags or "coppens_zouave_dress" in tags:
            _fail(out, "ANACH_WHEATS_COPPENS", "Wheat's Tiger / Coppens' Zouave dress (gone by 1862)", fld, iid)
        if "reference_only" in tags:
            _fail(out, "ANACH_REFERENCE_ONLY", "reference-only item (5th NY dress; unit absent)", fld, iid)
        if "zouave" in tags:
            pol = u.get("zouave_policy")
            if pol == "forbidden" or "zouave" in u.get("forbidden_tags", []):
                _fail(out, "ANACH_ZOUAVE_FORBIDDEN", "Zouave item %s on %s (5th NY / 155th PA / Louisiana forbidden)" % (iid, uid), fld, iid)
            elif pol == "disputed_variant":
                if variant == "regulation_blue_zouave_jan_1864":
                    _fail(out, "ANACH_ZOUAVE_140NY_REGBLUE_VARIANT", "Zouave item on 140th NY in the regulation-blue variant", fld, iid)
            elif pol in (None, "none", "none_drawn_memory_only"):
                _fail(out, "ANACH_ZOUAVE_NON_ZOUAVE_UNIT", "Zouave item %s on %s whose zouave_policy is %s" % (iid, uid, pol), fld, iid)
        if "berdan_green" in tags and "berdan_green" not in u.get("allowed_tags", []):
            _fail(out, "ANACH_BERDAN_GREEN", "Berdan green item %s on %s" % (iid, uid), fld, iid)
        if ("green_hatband" in tags or "green_chevron" in tags) and not ({"green_hatband", "green_chevron"} & set(u.get("allowed_tags", []))):
            _fail(out, "ANACH_GREEN_HATBAND", "green hatband/chevron %s on %s (Irish Brigade or medics: not allowed; Ambulance Corps only)" % (iid, uid), fld, iid)
        if ("green_hatband" in tags or "green_chevron" in tags) and (set(u.get("forbidden_tags", [])) & {"green_hatband"}):
            _fail(out, "ANACH_GREEN_HATBAND_FORBIDDEN_UNIT", "green hatband on forbidden unit %s" % uid, fld, iid)
        if iid == "whitworth_rifle" and u["branch"] in ("infantry", "sharpshooter"):
            if "flagged_exception:whitworth" in m.get("flags", []) and u.get("group") == "cs_sharpshooters":
                _flag(out, "FLAG_WHITWORTH_EXCEPTION", "Whitworth rifle as a flagged plausible-procedural exception for a Confederate sharpshooter", fld, iid)
            else:
                _fail(out, "ANACH_WHITWORTH_INFANTRY", "Whitworth rifle in infantry hands by default", fld, iid)
        if army == "confederate" and "kepi" in tags and rank in ENLISTED:
            if "private_purchase_exception" in m.get("flags", []):
                _flag(out, "FLAG_KEPI_PRIVATE_PURCHASE", "kepi on a Confederate enlisted man as a flagged private-purchase exception", fld, iid)
            else:
                _fail(out, "ANACH_KEPI_CS_PRIVATE", "kepi on a Confederate enlisted man by default (kepis: officers and private purchase only)", fld, iid)
        if iid == "spencer_repeater":
            sp = kit.weapons["spencer_repeater"]["allowed_units"]
            hit = [a for a in sp if a["unit"] == uid]
            if not hit:
                _fail(out, "ANACH_SPENCER_UNIT", "Spencer on %s: allowed only on the 5th Michigan (all) and part of the 6th Michigan" % uid, fld, iid)
            else:
                a = hit[0]
                if date < SPENCER_FIRST_DATE:
                    _fail(out, "ANACH_SPENCER_DATE", "Spencer before %s" % SPENCER_FIRST_DATE, fld, iid)
                elif date < a["valid_from"]:
                    _flag(out, "FLAG_SPENCER_DISPUTED_WINDOW", "Spencer on %s at %s is inside the disputed window %s..%s (documented from %s)" % (uid, date, a["disputed_window"]["from"], a["disputed_window"]["to"], a["valid_from"]), fld, iid)
        # 3. wrong-unit / army ------------------------------------------------------------------------------
        if army == "union" and c["army"] == "confederate":
            _fail(out, "WRONG_ARMY_UNION_HAS_CS_ITEM", "Union soldier carries Confederate item %s" % iid, fld, iid)
        if army == "confederate" and c["army"] == "union":
            captured = iid in (fields.get(fld, {}).get("captured") or [])
            spec_cap = False
            spec, ents, _o = resolve_field(kit, uid, fld, date, variant, rank)
            if spec:
                spec_cap = any(e["item"] == iid and e.get("captured") for e in spec["allowed"])
            if not (captured or spec_cap):
                _fail(out, "WRONG_ARMY_CS_HAS_UNCAPTURED_UNION_ITEM", "Confederate soldier carries Union item %s not marked captured" % iid, fld, iid)
        # 4. branch -------------------------------------------------------------------------------------------
        if "artillery_red" in tags and u["branch"] != "artillery":
            _fail(out, "BRANCH_ARTILLERY_TRIM", "scarlet artillery trim item %s on %s branch" % (iid, u["branch"]), fld, iid)
        if "cavalry_yellow" in tags and u["branch"] != "cavalry":
            _fail(out, "BRANCH_CAVALRY_TRIM", "cavalry yellow item %s on %s branch" % (iid, u["branch"]), fld, iid)
        # rank rules
        if not rank_allows_item(kit, iid, rank, u) and fld in ("accoutrements", "sidearm_sword", "sash", "coat", "headgear", "trousers"):
            _fail(out, "RANK_RULE", "item %s not allowed for rank %s (sash/sword/officer-only item)" % (iid, rank), fld, iid)
        if c["kind"] == "weapon":
            long_arms.append(iid)
    if len(long_arms) > 1:
        _fail(out, "HARD_LIMIT_ONE_LONG_ARM", "more than one long arm: %s" % long_arms, "weapon")

    # 3. membership in the unit's spec (nearest definition at the date)
    for fld, fv in fields.items():
        spec, ents, owner = resolve_field(kit, uid, fld, date, variant, rank)
        allowed = set(e["item"] for e in ents)
        if spec is None:
            if fv.get("items"):
                _fail(out, "WRONG_UNIT_NO_SPEC", "unit %s has no spec for field %s but the manifest has %s" % (uid, fld, fv["items"]), fld)
            continue
        for iid in fv.get("items", []):
            if fld == "bayonet" and iid == "bayonet_none_not_applicable" and (not long_arms or u["branch"] == "cavalry" or rank in OFFICERS or u["branch"] not in LONG_ARM_BRANCHES):
                continue          # rule: no long arm -> bayonet not applicable
            if iid not in allowed:
                # date-specific message
                anywhere = find_entries_anywhere(kit, uid, fld, iid, variant) or [e for e in spec["allowed"] if e["item"] == iid]
                if anywhere and anywhere[0].get("valid_from") and date < anywhere[0]["valid_from"]:
                    _fail(out, "ANACH_DATE", "item %s valid only from %s (manifest date %s)" % (iid, anywhere[0]["valid_from"], date), fld, iid)
                elif anywhere and anywhere[0].get("only_on") and date != anywhere[0]["only_on"]:
                    _fail(out, "ANACH_DATE", "item %s valid only on %s" % (iid, anywhere[0]["only_on"]), fld, iid)
                else:
                    _fail(out, "WRONG_UNIT_ITEM", "item %s is not in the %s spec of %s (owner %s)" % (iid, fld, uid, owner), fld, iid)
        # weapon equals unit assignment or documented default
        if fld == "weapon":
            aid = spec.get("assignment_id")
            if aid and aid in kit.assign:
                a = kit.assign[aid]
                if a["status"] == "assigned":
                    for iid in fv.get("items", []):
                        if iid not in a["weapon_ids"] and iid not in (a.get("candidates_unconfirmed") or []):
                            _fail(out, "WRONG_WEAPON_NOT_ASSIGNED", "weapon %s is not in assignment %s %s" % (iid, aid, a["weapon_ids"]), fld, iid)
                for iid in fv.get("items", []):
                    if iid in (a.get("forbidden_weapon_ids") or []):
                        _fail(out, "WRONG_WEAPON_FORBIDDEN_FOR_UNIT", "weapon %s forbidden for assignment %s" % (iid, aid), fld, iid)
    # badge
    b = fields.get("badge", {}).get("items", [])
    for iid in b:
        c = kit.cat(iid)
        if not c:
            continue
        ctags = [t for t in c["tags"] if t.startswith("corps:")]
        if iid in ("badge_none",):
            continue
        if army != "union":
            _fail(out, "WRONG_BADGE_ARMY", "Confederate soldier with a corps badge %s" % iid, "badge", iid)
            continue
        if "gap_placeholder" in c["tags"]:
            _flag(out, "FLAG_BADGE_UNRESOLVED", "badge colour unresolved for %s (division not printed)" % uid, "badge", iid)
            continue
        want = "corps:" + (u.get("corps") or "?")
        if want not in ctags:
            _fail(out, "WRONG_BADGE_CORPS", "badge %s does not belong to corps %s of %s" % (iid, u.get("corps"), uid), "badge", iid)
        else:
            idt = kit.items[iid]
            if u.get("division") and idt.get("division") and idt["division"] != u["division"]:
                _fail(out, "WRONG_BADGE_DIVISION", "badge %s is division %s but the unit is in division %s" % (iid, idt["division"], u["division"]), "badge", iid)
    return out


def severity_counts(findings):
    n = {"FAIL": 0, "FLAG": 0}
    for f in findings:
        n[f["severity"]] += 1
    return n


# ----------------------------------------------------------------------------------------------------------------
# Data checks over the shipped JSON
def data_checks(kit):
    errs, warns, info = [], [], {}

    def E(code, msg):
        errs.append((code, msg))

    def Wn(code, msg):
        warns.append((code, msg))

    known_sources = set(kit.sources)

    def check_field(owner, fname, f):
        if not isinstance(f, dict) or "tier" not in f:
            E("TIER_MISSING", "%s.%s has no tier" % (owner, fname))
            return
        t = f["tier"]
        if t not in TIERS:
            E("TIER_INVALID", "%s.%s tier %r" % (owner, fname, t))
        keys = f.get("source_keys", [])
        for k in keys:
            if k not in known_sources:
                E("SOURCE_KEY_UNKNOWN", "%s.%s cites unknown source key %s" % (owner, fname, k))
        if t == "documented":
            if not keys or not kit.nonweak(keys):
                E("DOCUMENTED_WITHOUT_NONWEAK_SOURCE", "%s.%s is documented but cites only %r" % (owner, fname, keys))
            if f.get("weak_source"):
                E("DOCUMENTED_BUT_WEAK", "%s.%s documented with weak_source true" % (owner, fname))
        if f.get("tier_printed") not in (None,) and t == "documented" and f.get("tier_printed") not in ("documented", "per_component", "documented (correction)"):
            pass
        for e in f.get("allowed", []):
            if kit.cat(e["item"]) is None:
                E("ITEM_UNKNOWN", "%s.%s allows unknown item %s" % (owner, fname, e["item"]))
            w = e.get("weight")
            if not w or w.get("kind") != "tuning_parameter" or w.get("historical_basis") is not False:
                E("WEIGHT_NOT_TUNING", "%s.%s item %s weight is not flagged tuning_parameter / historical_basis false" % (owner, fname, e["item"]))
            if "tier" in e:
                if e["tier"] not in TIERS:
                    E("ENTRY_TIER_INVALID", "%s.%s item %s tier %r" % (owner, fname, e["item"], e["tier"]))
                if e["tier"] == "documented" and not kit.nonweak(e.get("source_keys", [])) and not kit.nonweak(keys):
                    E("ENTRY_DOCUMENTED_NO_SOURCE", "%s.%s item %s documented without non-weak key" % (owner, fname, e["item"]))
            if e.get("only_on") is None and has_tag(kit, e["item"], "needs_day_gate"):
                E("DAY_GATE_MISSING", "%s.%s item %s needs only_on" % (owner, fname, e["item"]))
            if has_tag(kit, e["item"], "needs_pile_id") and not e.get("pile_id"):
                Wn("PACK_DROPPED_NO_PILE_ID", "%s.%s allows pack_dropped without a pile id (not drawn by manifest_for; open item: pile position/time not in B.6.2)" % (owner, fname))

    def check_allowed_vs_unit(uid, u, fname, f, where):
        for e in f.get("allowed", []):
            iid = e["item"]
            c = kit.cat(iid)
            if not c:
                continue
            tags = c["tags"]
            fb = set(u.get("forbidden_tags", []))
            bad = fb & set(tags)
            if bad:
                E("UNIT_ALLOWS_FORBIDDEN_TAG", "%s.%s allows %s with forbidden tag(s) %s" % (uid, where, iid, sorted(bad)))
            if c["barred"] and not e.get("flagged"):
                E("UNIT_ALLOWS_BARRED_ITEM", "%s.%s allows barred item %s" % (uid, where, iid))
            if "reference_only" in tags:
                E("UNIT_ALLOWS_REFERENCE_ITEM", "%s.%s allows reference-only item %s" % (uid, where, iid))
            if "type_iii" in tags or "wheats_tiger_dress" in tags or "coppens_zouave_dress" in tags:
                E("UNIT_ALLOWS_ANACHRONISM", "%s.%s allows %s" % (uid, where, iid))
            if "berdan_green" in tags and "berdan_green" not in u.get("allowed_tags", []) and u["id"] != "default.union.infantry":
                E("BERDAN_GREEN_OUTSIDE_BERDAN", "%s.%s allows %s" % (uid, where, iid))
            if ("green_hatband" in tags or "green_chevron" in tags) and not ({"green_hatband", "green_chevron"} & set(u.get("allowed_tags", []))):
                E("GREEN_HATBAND_OUTSIDE_AMBULANCE", "%s.%s allows %s" % (uid, where, iid))
            if "zouave" in tags and u.get("zouave_policy") in (None, "none", "forbidden", "none_drawn_memory_only") and u["id"] not in kit.defaults:
                E("ZOUAVE_ON_NON_ZOUAVE_UNIT", "%s.%s allows %s" % (uid, where, iid))
            if iid in ("spencer_repeater",):
                if uid not in [a["unit"] for a in kit.weapons["spencer_repeater"]["allowed_units"]]:
                    E("SPENCER_OUTSIDE_ALLOWED_UNITS", "%s.%s allows Spencer" % (uid, where))
                elif not e.get("valid_from"):
                    E("SPENCER_NO_DATE", "%s.%s Spencer entry lacks valid_from" % (uid, where))
            if iid in ("henry_rifle", "m1863_rifle_musket"):
                E("UNIT_ALLOWS_BARRED_ARM", "%s.%s allows %s" % (uid, where, iid))
            if iid == "whitworth_rifle" and u["branch"] in ("infantry", "sharpshooter") and not e.get("flagged_exception"):
                E("WHITWORTH_INFANTRY_DEFAULT", "%s.%s allows Whitworth rifle by default" % (uid, where))
            if c["army"] == "union" and u["army"] == "confederate" and not e.get("captured") and not c["army"] == "either":
                E("CS_UNIT_ALLOWS_UNCAPTURED_UNION_ITEM", "%s.%s allows Union item %s not marked captured" % (uid, where, iid))
            if c["army"] == "confederate" and u["army"] == "union":
                E("UNION_UNIT_ALLOWS_CS_ITEM", "%s.%s allows Confederate item %s" % (uid, where, iid))
            if "kepi" in tags and u["army"] == "confederate" and "officer" not in uid and e.get("flagged_exception") != "private_purchase":
                E("CS_KEPI_NOT_FLAGGED", "%s.%s allows a kepi on Confederate enlisted men without the private-purchase flag" % (uid, where))
            if "artillery_red" in tags and u["branch"] != "artillery" and u["id"] not in kit.defaults:
                E("BRANCH_TRIM_MISMATCH", "%s.%s artillery trim item on %s" % (uid, where, u["branch"]))
            if "cavalry_yellow" in tags and u["branch"] != "cavalry" and u["id"] not in kit.defaults:
                E("BRANCH_TRIM_MISMATCH", "%s.%s cavalry yellow item on %s" % (uid, where, u["branch"]))

    nfields = 0
    for did, d in kit.defaults.items():
        for fname, f in d.get("fields", {}).items():
            nfields += 1
            check_field(did, fname, f)
            check_allowed_vs_unit(did, d, fname, f, fname)
    for uid, u in kit.units.items():
        if u.get("inherits") and u["inherits"] not in kit.defaults:
            E("INHERITS_UNKNOWN", "%s inherits unknown %s" % (uid, u["inherits"]))
        for did in u.get("dispute_ids", []):
            if did not in kit.disputes:
                E("DISPUTE_UNKNOWN", "%s cites unknown dispute %s" % (uid, did))
        for fname, f in u.get("fields", {}).items():
            nfields += 1
            check_field(uid, fname, f)
            check_allowed_vs_unit(uid, u, fname, f, fname)
            if fname == "weapon":
                aid = f.get("assignment_id")
                if aid and aid not in kit.assign:
                    E("ASSIGNMENT_UNKNOWN", "%s weapon cites unknown assignment %s" % (uid, aid))
                if aid and aid in kit.assign:
                    a = kit.assign[aid]
                    ok = set(a["weapon_ids"]) | set(a.get("candidates_unconfirmed", []))
                    if a["status"] != "assigned":
                        ok |= {"m1861_springfield", "p1853_enfield"}
                    for e in f["allowed"]:
                        if e["item"] not in ok:
                            E("WEAPON_NOT_IN_ASSIGNMENT", "%s weapon %s is outside assignment %s %s" % (uid, e["item"], aid, sorted(ok)))
        for vk, v in (u.get("variants") or {}).items():
            for fname, f in v["fields"].items():
                nfields += 1
                check_field(uid + "#" + vk, fname, f)
                if "zouave" in "".join(sum([kit.cat(e["item"])["tags"] for e in f["allowed"] if kit.cat(e["item"])], [])) and vk == "regulation_blue_zouave_jan_1864":
                    E("REGBLUE_VARIANT_HAS_ZOUAVE", "%s#%s allows zouave items" % (uid, vk))
        for aid in u.get("weapon_assignment_ids", []):
            if aid not in kit.assign:
                E("ASSIGNMENT_UNKNOWN", "%s lists unknown assignment %s" % (uid, aid))
    info["fields_checked"] = nfields
    # weapons dictionary
    for wid, w in kit.weapons.items():
        for k in w.get("source_keys", []):
            if k not in known_sources:
                E("SOURCE_KEY_UNKNOWN", "weapon %s cites unknown key %s" % (wid, k))
        if w["tier"] == "documented" and not kit.nonweak(w["source_keys"]):
            E("DOCUMENTED_WITHOUT_NONWEAK_SOURCE", "weapon %s documented without non-weak key" % wid)
        if w["tier"] == "gap" and not w.get("gap_ids"):
            E("GAP_WITHOUT_ID", "weapon %s tier gap with no gap id" % wid)
        if w["tier"] not in TIERS + ("gap",):
            E("TIER_INVALID", "weapon %s tier %r" % (wid, w["tier"]))
    for aid, a in kit.assign.items():
        for wid in a["weapon_ids"]:
            if wid not in kit.weapons:
                E("ASSIGNMENT_WEAPON_UNKNOWN", "%s lists unknown weapon %s" % (aid, wid))
            elif kit.weapons[wid]["barred"]:
                E("ASSIGNMENT_BARRED_WEAPON", "%s assigns barred weapon %s" % (aid, wid))
            elif kit.weapons[wid].get("not_assignable"):
                E("ASSIGNMENT_NOT_ASSIGNABLE", "%s assigns not-assignable weapon %s" % (aid, wid))
        for k in a["source_keys"]:
            if k not in known_sources:
                E("SOURCE_KEY_UNKNOWN", "%s cites unknown key %s" % (aid, k))
        for uidx in a["unit_ids"]:
            if uidx not in kit.units and uidx != "CS.ART.HURT":
                E("ASSIGNMENT_UNIT_UNKNOWN", "%s names unit %s not in the kit data" % (aid, uidx))
        if a["tier"] == "documented" and not kit.nonweak(a["source_keys"]):
            E("DOCUMENTED_WITHOUT_NONWEAK_SOURCE", "%s documented without non-weak key" % aid)
    # default weapon distributions
    for did in ("default.union.infantry", "default.confederate.infantry", "default.confederate.cavalry", "default.union.cavalry"):
        f = kit.defaults[did]["fields"]["weapon"]
        tot = sum(e["weight"]["value"] for e in f["allowed"])
        info["default_weapon_weight_sum_" + did] = round(tot, 4)
        if abs(tot - 1.0) > 0.02:
            E("DEFAULT_WEAPON_WEIGHTS_NOT_1", "%s weapon weights sum to %.4f" % (did, tot))
        exc = sum(e["weight"]["value"] for e in f["allowed"] if e.get("flagged_exception"))
        cap = max([e.get("max_share_cap", 1.0) for e in f["allowed"] if e.get("flagged_exception")] or [1.0])
        if exc > cap + 1e-9:
            E("DEFAULT_EXCEPTION_SHARE_OVER_CAP", "%s flagged exceptions %.4f exceed cap %.2f" % (did, exc, cap))
    # artillery
    pieces = kit.wp["artillery"]["pieces"]
    for bid, c in kit.ab["batteries"].items():
        for g in c["guns"]:
            if g["type_id"] not in pieces:
                E("BATTERY_GUN_TYPE_UNKNOWN", "%s gun type %s" % (bid, g["type_id"]))
        for k in c["source_keys"]:
            if k not in known_sources:
                E("SOURCE_KEY_UNKNOWN", "battery %s key %s" % (bid, k))
        if c["tier"] not in TIERS + ("gap",):
            E("TIER_INVALID", "battery %s tier %r" % (bid, c["tier"]))
        if c["tier"] == "documented" and not kit.nonweak(c["source_keys"]):
            E("DOCUMENTED_WITHOUT_NONWEAK_SOURCE", "battery %s" % bid)
    inv = kit.wp["artillery"]["inventory"]
    su = sum(v["union"] for v in inv["by_type"].values())
    sc = sum(v["confederate"] for v in inv["by_type"].values())
    info["inventory_by_type_sum"] = (su, sc)
    if (su, sc) != (inv["totals_strategypage"]["union"], inv["totals_strategypage"]["confederate"]):
        Wn("PDF_DEFECT_INVENTORY_SUM", "B.6.14.1 inventory rows sum to %d / %d but the printed totals are %d / %d (PDF arithmetic; both kept)" % (su, sc, inv["totals_strategypage"]["union"], inv["totals_strategypage"]["confederate"]))
    toe = [t for t in kit.wp["artillery"]["teams_and_vehicles"] if t["id"] == "toe_6pdr_mounted"][0]["values"]["horses_12pdr"]
    hs = sum(toe["draught"].values()) + sum(toe["saddle"].values())
    if hs != toe["stated_total"]:
        Wn("PDF_DEFECT_HORSE_TOTAL", "B.6.14.4 horse items sum to %d, stated total %d (PDF says the items sum to 148 against 149)" % (hs, toe["stated_total"]))
    for grp, rows in kit.ks.get("reference_tables", {}).items():
        for r in rows:
            if r["tier"] not in TIERS + ("gap",):
                E("TIER_INVALID", "reference %s tier %r" % (r["id"], r["tier"]))
            if r["tier"] == "documented" and not kit.nonweak(r["source_keys"]):
                E("DOCUMENTED_WITHOUT_NONWEAK_SOURCE", "reference %s documented without non-weak key" % r["id"])
            for k in r["source_keys"]:
                if k not in known_sources:
                    E("SOURCE_KEY_UNKNOWN", "reference %s key %s" % (r["id"], k))
    for g in kit.ks.get("pdf_open_items_G1_G21", []):
        if not g.get("affected"):
            E("GAP_UNMAPPED", "PDF gap %s maps to no kit record" % g["id"])
    info["pdf_gaps_mapped"] = len(kit.ks.get("pdf_open_items_G1_G21", []))
    ostrength = sum(1 for _ in kit.units)
    info["units_total"] = ostrength
    return errs, warns, info


# ----------------------------------------------------------------------------------------------------------------
# Self tests
def mk(kit, unit_id, date="1863-07-02", rank="private", variant=None, flags=(), **over):
    """Hand-built manifest.  over: field -> items list (tier defaults to 'plausible-procedural')."""
    fields, tmap = {}, {}
    for fld, items in over.items():
        items = items if isinstance(items, list) else [items]
        fields[fld] = {"items": items, "tier": "plausible-procedural", "source_keys": [], "weak_source": True}
        tmap[fld] = "plausible-procedural"
    return {"soldier_id": "TEST", "unit": unit_id, "date": date, "rank": rank, "variant": variant, "fields": fields, "tier_map": tmap, "source_ids": [], "flags": list(flags)}


def codes(findings, sev=None):
    return sorted({f["code"] for f in findings if sev is None or f["severity"] == sev})


def self_tests(kit, verbose=True):
    res = []

    def T(name, cond, detail=""):
        res.append((name, bool(cond), detail))

    # golden / determinism
    bad = check_golden()
    T("rng golden values (python == node-produced JS values)", not bad, str(bad[:2]))
    m1 = manifest_for("S-0001", "US.2WI", 1863)
    m2 = manifest_for("S-0001", "US.2WI", 1863)
    m3 = manifest_for("S-0001", "US.2WI", 1864)
    T("reproducibility: same seed -> identical manifest", json.dumps(m1, sort_keys=True) == json.dumps(m2, sort_keys=True))
    T("reproducibility: different project seed changes the seed", m1["seed"] != m3["seed"])
    T("manifest of a real draw validates clean", not codes(validate_manifest(m1, kit=kit), "FAIL"), str(codes(validate_manifest(m1, kit=kit), "FAIL")))
    # deliberately anachronistic manifests must FAIL
    cs = "CS.5TX"
    bad1 = mk(kit, cs, headgear="kepi_cs", coat="cs_type_iii_jacket", weapon="henry_rifle", accoutrements=["cs_cartridge_box"])
    f = validate_manifest(bad1, kit=kit)
    T("anachronistic CS private (Type III + kepi + Henry) FAILS", {"ANACH_TYPE_III", "ANACH_KEPI_CS_PRIVATE", "ANACH_HENRY"} <= set(codes(f, "FAIL")), str(codes(f, "FAIL")))
    f = validate_manifest(mk(kit, "US.20ME", weapon="m1863_rifle_musket"), kit=kit)
    T("M1863 rifle-musket FAILS", "ANACH_M1863" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.CAV.1MICH", weapon="spencer_repeater", date="1863-07-03"), kit=kit)
    T("Spencer on 1st Michigan FAILS (unit)", "ANACH_SPENCER_UNIT" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.CAV.8IL", weapon="spencer_repeater", date="1863-07-03"), kit=kit)
    T("Spencer on Buford's 8th Illinois FAILS", "ANACH_SPENCER_UNIT" in codes(f, "FAIL"))
    f = validate_manifest(mk(kit, "US.CAV.5MICH", weapon="spencer_repeater", date="1863-06-29"), kit=kit)
    T("Spencer before June 30 FAILS", "ANACH_SPENCER_DATE" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.CAV.5MICH", weapon="spencer_repeater", date="1863-07-03"), kit=kit)
    T("Spencer on 5th Michigan 3 Jul passes", not codes(f, "FAIL") or codes(f, "FAIL") == [], str(codes(f)))
    f = validate_manifest(mk(kit, "US.CAV.6MICH", weapon="spencer_repeater", date="1863-06-30"), kit=kit)
    T("Spencer on 6th Michigan 30 Jun (Hanover) is FLAGGED disputed, not failed", "FLAG_SPENCER_DISPUTED_WINDOW" in codes(f, "FLAG") and "ANACH_SPENCER_DATE" not in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.155PA", headgear="fez_red_114pa"), kit=kit)
    T("Zouave fez on 155th PA FAILS", "ANACH_ZOUAVE_FORBIDDEN" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.5NY_INF", headgear="fez_red_5ny_reference"), kit=kit)
    T("5th NY infantry soldier FAILS (unit absent + reference Zouave dress)", {"PRESENCE_ABSENT_UNIT", "ANACH_ZOUAVE_FORBIDDEN", "ANACH_REFERENCE_ONLY"} <= set(codes(f, "FAIL")), str(codes(f)))
    f = validate_manifest(mk(kit, "CS.5LA", headgear="fez_red_114pa"), kit=kit)
    T("Zouave item on a Louisiana soldier FAILS", "ANACH_ZOUAVE_FORBIDDEN" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "CS.9LA", coat="jacket_tiger_zouave_style", headgear="hat_wheats_tiger"), kit=kit)
    T("Wheat's Tiger dress on Louisiana FAILS", "ANACH_WHEATS_COPPENS" in codes(f, "FAIL"))
    f = validate_manifest(mk(kit, "CS.4TX", coat="dress_coppens_zouave"), kit=kit)
    T("Coppens' Zouave dress FAILS", "ANACH_WHEATS_COPPENS" in codes(f, "FAIL"))
    f = validate_manifest(mk(kit, "US.20ME", headgear="kepi_green_berdan", coat="berdan_green_frock_coat"), kit=kit)
    T("Berdan green on another unit FAILS", "ANACH_BERDAN_GREEN" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.63NY", headgear="kepi_ambulance_green_band"), kit=kit)
    T("green hatband on the Irish Brigade FAILS", "ANACH_GREEN_HATBAND" in codes(f, "FAIL") or "ANACH_GREEN_HATBAND_FORBIDDEN_UNIT" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.SUP.MEDICAL", headgear="kepi_ambulance_green_band"), kit=kit)
    T("green hatband on medical men (not Ambulance Corps) FAILS", "ANACH_GREEN_HATBAND" in codes(f, "FAIL") or "ANACH_GREEN_HATBAND_FORBIDDEN_UNIT" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.SUP.AMBULANCE", headgear="kepi_ambulance_green_band", coat="sack_coat_ambulance_green_chevron"), kit=kit)
    T("green band on the Ambulance Corps passes", not codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "CS.5ALBN", weapon="whitworth_rifle"), kit=kit)
    T("Whitworth rifle in infantry hands by default FAILS", "ANACH_WHITWORTH_INFANTRY" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.20ME", accoutrements=["cs_cartridge_box"]), kit=kit)
    T("Union soldier with a Confederate item FAILS", "WRONG_ARMY_UNION_HAS_CS_ITEM" in codes(f, "FAIL"))
    f = validate_manifest(mk(kit, "US.12NJ", weapon="m1861_springfield"), kit=kit)
    T("weapon outside the unit assignment (12th NJ with M1861) FAILS", {"WRONG_UNIT_ITEM", "WRONG_WEAPON_NOT_ASSIGNED"} & set(codes(f, "FAIL")), str(codes(f)))
    f = validate_manifest(mk(kit, "US.2WI", badge="badge_V_red"), kit=kit)
    T("badge of the wrong corps FAILS", "WRONG_BADGE_CORPS" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.2WI", badge="badge_I_blue"), kit=kit)
    T("badge of the wrong division FAILS", "WRONG_BADGE_DIVISION" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "CS.5TX", badge="badge_I_red"), kit=kit)
    T("corps badge on a Confederate FAILS", "WRONG_BADGE_ARMY" in codes(f, "FAIL"))
    f = validate_manifest(mk(kit, "US.2WI", weapon=["lorenz_m1854", "springfield_model_unspecified"]), kit=kit)
    T("two long arms on one soldier FAILS", "HARD_LIMIT_ONE_LONG_ARM" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.ART.4th_US_A", headgear="kepi_m1858", coat="mounted_jacket_cavalry_union"), kit=kit)
    T("cavalry yellow on artillery FAILS (branch)", "BRANCH_CAVALRY_TRIM" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.20ME", coat="jacket_artillery_red_trim"), kit=kit)
    T("scarlet artillery trim on infantry FAILS (branch)", "BRANCH_ARTILLERY_TRIM" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.20ME", rank="private", accoutrements=["sash_crimson_union"]), kit=kit)
    T("sash on a private FAILS (rank rule)", "RANK_RULE" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.20ME", rank="private", sidearm_sword=["m1850_foot_officer_sword"]), kit=kit)
    T("officer sword on a private FAILS (rank rule)", "RANK_RULE" in codes(f, "FAIL"), str(codes(f)))
    # tier completeness
    bt = mk(kit, "US.20ME", headgear="kepi_m1858")
    del bt["tier_map"]["headgear"]
    f = validate_manifest(bt, kit=kit)
    T("field without a tier FAILS", {"TIER_MISSING", "TIER_MAP_MISSING_FIELD"} & set(codes(f, "FAIL")), str(codes(f)))
    bt = mk(kit, "US.20ME", headgear="kepi_m1858")
    bt["tier_map"]["headgear"] = "documented"
    bt["fields"]["headgear"]["tier"] = "documented"
    f = validate_manifest(bt, kit=kit)
    T("documented field without a source key FAILS", "TIER_DOCUMENTED_NO_SOURCE" in codes(f, "FAIL"), str(codes(f)))
    bt = mk(kit, "US.20ME", headgear="kepi_m1858")
    bt["fields"]["headgear"].update({"tier": "documented", "source_keys": ["Wiki-UnionUnif"]})
    bt["tier_map"]["headgear"] = "documented"
    bt["source_ids"] = ["Wiki-UnionUnif"]
    f = validate_manifest(bt, kit=kit)
    T("documented field citing only a Wikipedia key FAILS", "TIER_DOCUMENTED_NO_SOURCE" in codes(f, "FAIL"), str(codes(f)))
    # dates
    f = validate_manifest(mk(kit, "US.146NY", date="1863-06-02", headgear="fez_red_146ny", coat="zouave_jacket_146ny"), kit=kit)
    T("146th NY Zouave dress before 3 Jun 1863 FAILS", "ANACH_DATE" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.146NY", date="1863-07-02", headgear="fez_red_146ny", coat="zouave_jacket_146ny"), kit=kit)
    T("146th NY Zouave dress on 2 Jul passes", not codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.1MN", date="1863-07-02", pack_state="pack_used_as_cover"), kit=kit)
    T("pack used as cover on 2 Jul FAILS (only 3 Jul)", "ANACH_DATE" in codes(f, "FAIL"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.1MN", date="1863-07-03", pack_state="pack_used_as_cover"), kit=kit)
    T("pack used as cover on 3 Jul passes", not codes(f, "FAIL"), str(codes(f)))
    # 140th NY: both variants allowed, flagged
    for var, kw in (("regulation_blue_zouave_jan_1864", dict(headgear="kepi_m1858", coat="sack_coat_union", trousers="trousers_sky_blue_kersey")),
                    ("zouave_from_1863_06_03", dict(headgear="zouave_dress_unspecified_headgear", coat="zouave_dress_unspecified_coat", trousers="zouave_dress_unspecified_trousers"))):
        f = validate_manifest(mk(kit, "US.140NY", variant=var, **kw), kit=kit)
        T("140th NY variant %s: allowed and flagged (disputed)" % var, not codes(f, "FAIL") and "DISPUTED_FLAGGED" in codes(f, "FLAG"), str(codes(f)))
    f = validate_manifest(mk(kit, "US.140NY", variant="regulation_blue_zouave_jan_1864", headgear="zouave_dress_unspecified_headgear"), kit=kit)
    T("140th NY: Zouave item inside the regulation-blue variant FAILS", {"ANACH_ZOUAVE_140NY_REGBLUE_VARIANT", "WRONG_UNIT_ITEM"} & set(codes(f, "FAIL")), str(codes(f)))
    f = validate_manifest(mk(kit, "US.140NY", headgear="kepi_m1858", coat="zouave_dress_unspecified_coat"), kit=kit)
    T("140th NY: items mixed across the two variants FAIL", "DISPUTED_VARIANT_MIXED" in codes(f, "FAIL") or "WRONG_UNIT_ITEM" in codes(f, "FAIL"), str(codes(f)))
    try:
        manifest_for("S-1", "US.140NY", 1863)
        T("140th NY: manifest_for refuses to choose a default variant", False)
    except ValueError:
        T("140th NY: manifest_for refuses to choose a default variant", True)
    try:
        manifest_for("S-1", "US.5NY_INF", 1863)
        T("manifest_for refuses an absent unit", False)
    except ValueError:
        T("manifest_for refuses an absent unit", True)
    # mutation tests: inject faults into REAL generated manifests; every mutation must be caught
    import copy
    caught, total = {}, {}
    units = [uid for uid, u in sorted(kit.units.items()) if u["presence"]["status"] == "present_at_gettysburg" and not u.get("variants") and u["branch"] in ("infantry", "sharpshooter")]
    for k, uid in enumerate(units):
        u = kit.units[uid]
        base = manifest_for("MUT:%s" % uid, uid, 1863, date="1863-07-02", rank="private", kit=kit)
        muts = []
        if u["army"] == "confederate":
            muts.append(("type_iii_jacket", "coat", ["cs_type_iii_jacket"], "ANACH_TYPE_III"))
            muts.append(("kepi_on_private", "headgear", ["kepi_cs"], "ANACH_KEPI_CS_PRIVATE"))
            muts.append(("corps_badge_on_confederate", "badge", ["badge_I_red"], "WRONG_BADGE_ARMY"))
        else:
            muts.append(("henry", "weapon", ["henry_rifle"], "ANACH_HENRY"))
            muts.append(("m1863", "weapon", ["m1863_rifle_musket"], "ANACH_M1863"))
            muts.append(("confederate_item_on_union", "accoutrements", ["cs_cartridge_box"], "WRONG_ARMY_UNION_HAS_CS_ITEM"))
            muts.append(("berdan_green_elsewhere", "coat", ["berdan_green_frock_coat"], "ANACH_BERDAN_GREEN" if "berdan_green" not in u.get("allowed_tags", []) else None))
            muts.append(("green_hatband", "headgear", ["kepi_ambulance_green_band"], "ANACH_GREEN_HATBAND" if "green_hatband" not in u.get("allowed_tags", []) else None))
            muts.append(("zouave_item_wrong_unit", "headgear", ["fez_red_114pa"], "ANACH_ZOUAVE_" if u.get("zouave_policy") in (None, "none", "none_drawn_memory_only", "forbidden") or "zouave" in u.get("forbidden_tags", []) else None))
        muts.append(("whitworth", "weapon", ["whitworth_rifle"], "ANACH_WHITWORTH_INFANTRY"))
        muts.append(("two_long_arms", "weapon", ["p1853_enfield", "m1861_springfield"], "HARD_LIMIT_ONE_LONG_ARM"))
        muts.append(("tier_removed", None, None, "TIER_MAP_MISSING_FIELD"))
        for name, fld, items, want in muts:
            if want is None:
                continue
            m = copy.deepcopy(base)
            if name == "tier_removed":
                if "coat" not in m["tier_map"]:
                    continue
                del m["tier_map"]["coat"]
            else:
                m["fields"][fld] = {"items": items, "tier": "plausible-procedural", "source_keys": [], "weak_source": True}
                m["tier_map"][fld] = "plausible-procedural"
            total[name] = total.get(name, 0) + 1
            if any(c.startswith(want) for c in codes(validate_manifest(m, kit=kit), "FAIL")):
                caught[name] = caught.get(name, 0) + 1
    miss = {k: (total[k], caught.get(k, 0)) for k in total if caught.get(k, 0) != total[k]}
    T("mutation tests: %d fault injections into real manifests, all caught" % sum(total.values()), not miss, str(miss))
    return res


def population_test(kit, per_unit=24, dates=("1863-07-01", "1863-07-02", "1863-07-03"), seed=1863):
    """Generate manifests for every present unit and validate them all.  Any FAIL is a data error."""
    ranks = ["private"] * 14 + ["corporal"] * 4 + ["sergeant", "first sergeant", "lieutenant", "captain", "field officer", "general"]
    n = 0
    fails, flags = {}, {}
    problems = []
    for uid, u in sorted(kit.units.items()):
        if u["presence"]["status"] != "present_at_gettysburg":
            continue
        variants = list((u.get("variants") or {"": None}).keys())
        for date in dates:
            for vi, var in enumerate(variants):
                for i in range(per_unit):
                    rank = ranks[i % len(ranks)]
                    sid = "%s:%s:%04d" % (uid, date[-2:], i)
                    try:
                        m = manifest_for(sid, uid, seed, date=date, rank=rank, variant=var or None, kit=kit)
                    except Exception as e:      # generation must never raise for a present unit
                        problems.append((uid, "manifest_for raised %r" % (e,)))
                        break
                    n += 1
                    for f in validate_manifest(m, kit=kit):
                        d = flags if f["severity"] == "FLAG" else fails
                        d.setdefault(f["code"], []).append((sid, f["msg"]))
                    # tier completeness of the generated manifest
                    for fld in m["fields"]:
                        if fld not in m["tier_map"]:
                            problems.append((sid, "tier_map missing " + fld))
    return n, fails, flags, problems


def main(argv):
    quiet = "--quiet" in argv
    kit = get_kit()
    rc = 0
    print("check_kit: %d units (%d infantry/support, %d artillery, %d cavalry), %d items, %d weapons" % (
        len(kit.units), len(kit.ks["units"]), len(kit.ab["units"]), len(kit.cu["units"]), len(kit.items), len(kit.weapons)))
    errs, warns, info = data_checks(kit)
    print("data checks: %d ERROR, %d WARN (fields checked: %d)" % (len(errs), len(warns), info["fields_checked"]))
    for code, msg in errs[:60]:
        print("  ERROR %s: %s" % (code, msg))
    if len(errs) > 60:
        print("  ... %d more errors" % (len(errs) - 60))
    if not quiet:
        for code, msg in warns[:40]:
            print("  WARN  %s: %s" % (code, msg))
    if errs:
        rc = 1
    ns, nd = node_golden() if "--node" in argv else ("not requested", "use --node to recompute with node")
    print("rng golden vs node: %s%s" % (ns, "" if not nd else " (" + str(nd) + ")"))
    if ns in ("MISMATCH", "error"):
        rc = 1
    res = self_tests(kit)
    npass = sum(1 for _, ok, _ in res if ok)
    print("self-tests: %d/%d pass" % (npass, len(res)))
    for name, ok, detail in res:
        if not ok:
            print("  FAIL self-test: %s  %s" % (name, detail))
            rc = 1
        elif not quiet:
            print("  ok   %s" % name)
    n, fails, flags, problems = population_test(kit)
    print("population test: %d manifests generated and validated; FAIL codes: %s; FLAG codes: %s; generation problems: %d" % (
        n, {k: len(v) for k, v in fails.items()} or "none", {k: len(v) for k, v in sorted(flags.items())} or "none", len(problems)))
    for code, lst in fails.items():
        for sid, msg in lst[:3]:
            print("  POPFAIL %s %s: %s" % (code, sid, msg))
    for p in problems[:10]:
        print("  PROBLEM", p)
    if fails or problems:
        rc = 1
    print("RESULT:", "PASS" if rc == 0 else "FAIL", "(exit %d)" % rc)
    return rc


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
