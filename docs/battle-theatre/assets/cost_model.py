"""Effort/cost model for the Part F asset pipeline (every input is an explicit assumption; the arithmetic is run by this file).
usage: python cost_model.py > cost_model_output.json     (inputs below; change them and re-run)
Day-rate anchors: web search 2026-10-19 (Polycount forum: ~$400/day US/EU freelance character artist; overseas studios $140-200/day; senior $80-150/h).
Photo-found rate: measured Wikipedia lead image 281/708 (39.7%) for the repo OOB seed list, 364/1256 (29.0%) for Wikipedia's OOB names;
a quick open-web check of 12 random not-on-Wikipedia regimental officers found a likeness for 3 (25%, n=12, very uncertain)."""
import json

RATE = {'low': 250, 'mid': 450, 'high': 700}          # USD per artist-day
RES_RATE = {'low': 200, 'mid': 300, 'high': 450}      # USD per research-day
DAYS_PER_YEAR = 220

def commanders(n_total, measured_photo, extra_found_rate=0.25):
    p_photo = measured_photo / n_total + (1 - measured_photo / n_total) * extra_found_rate
    n_photo = round(n_total * p_photo)
    n_multi = round(n_photo * 0.25)          # assumption: a quarter of photographed men have >= 2 usable photographs (generals)
    n_single = n_photo - n_multi
    n_none = n_total - n_photo
    days = {
        'likeness_multi_photo': n_multi * 2.0,       # 3D head from several photos: sculpt, retopo, texture projection, age/hair/beard for July 1863
        'likeness_single_photo': n_single * 1.0,     # single-photo reconstruction (labelled)
        'likeness_inferred': n_none * 0.35,          # parametric face from the variation library, labelled 'inferred'
        'costume_insignia_horse': n_total * 0.20,    # rank dress, straps/sash/plume, horse colouring from the kit library
        'q_a_and_integration': n_total * 0.10,
    }
    research_days = n_total * 0.25                   # read OR/regimental histories for stature, dress, horse, beard on the day
    return dict(n_total=n_total, p_photo=round(p_photo, 3), n_photo=n_photo, n_multi=n_multi, n_single=n_single, n_none=n_none, art_days=days, art_days_total=sum(days.values()), research_days=research_days)

def kit():
    items = {
        'union_unusual_dress_sets (12 x 10 d)': 12 * 10,
        'confederate_dress_variants (8 x 10 d)': 8 * 10,
        'union_default_dress_system (coats, hats, trousers, gear sets)': 40,
        'confederate_default_dress_system': 40,
        'weapons (20 models x 3 d, incl. wear variants)': 20 * 3,
        'artillery (8 gun types x 6 d + 4 limber/caisson/wagon x 5 d)': 8 * 6 + 4 * 5,
        'horses and mules (4 base x 12 d)': 4 * 12,
        'flags and standards (850 x 0.3 d)': round(850 * 0.3),
        'camp/field equipment (tents, wagons, ambulances, fences)': 30,
        'dress-variation shader/system hardening (colour, wear, patches, hat shape, gear)': 25,
        'cloth/hair/lod pipeline tooling (LOD0-LOD3, impostors, texture arrays)': 60,
        'cloth simulation of coats, flags, horse blankets (setup + per-asset tuning)': 45,
    }
    return items

def animation():
    return {
        'mocap capture days with reenactors (12 d)': 12,                      # priced separately in cash
        'clip cleanup/retarget (130 clips x 1 d)': 130,
        'foot-lock/contact IK, blending and crowd state machine': 60,
        'artillery service-of-the-piece sequences (crew of 9, 3 gun types)': 40,
        'cavalry/horse locomotion and rider coupling': 50,
        'fall/hit/die/wounded-carry variants (60 clips)': 60,
    }

def cash_extras(level):
    r = {'low': 0.6, 'mid': 1.0, 'high': 1.6}[level]
    return {
        'mocap_studio_days_12': round(12 * 2250 * r),            # mid-tier optical stage $1,500-3,000/day (2026 guide); midpoint 2,250
        'reenactor_performers_and_props_12_days': round(12 * 900 * r),
        'photogrammetry_kit_scans_30_sessions': round(30 * 600 * r),   # reenactor kit/uniform item scan sessions (assumption)
        'software_year': round({'low': 3000, 'mid': 6000, 'high': 12000}[level]),   # Marvelous Designer $280/y personal .. enterprise, Substance, Houdini etc.
        'purchased_assets_and_mocap_packs': round(8000 * r),
    }

def total(level):
    rate = RATE[level]; rr = RES_RATE[level]
    out = {'level': level, 'artist_day_rate': rate, 'research_day_rate': rr}
    kd = sum(kit().values()); ad = sum(animation().values())
    out['kit_art_days'] = kd; out['animation_art_days'] = ad
    out['kit_cost'] = kd * rate; out['animation_cost'] = ad * rate
    for name, n, meas in (('commanders_707_seed', 708, 281), ('commanders_1256_wikipedia_oob', 1256, 364)):
        c = commanders(n, meas)
        out[name] = {**c, 'art_cost': round(c['art_days_total'] * rate), 'research_cost': round(c['research_days'] * rr)}
    out['cash_extras'] = cash_extras(level)
    out['cash_extras_total'] = sum(out['cash_extras'].values())
    for name in ('commanders_707_seed', 'commanders_1256_wikipedia_oob'):
        c = out[name]
        tot = out['kit_cost'] + out['animation_cost'] + c['art_cost'] + c['research_cost'] + out['cash_extras_total']
        days = kd + ad + c['art_days_total'] + c['research_days']
        out['total_' + name] = round(tot)
        out['person_days_' + name] = round(days)
        out['person_years_' + name] = round(days / DAYS_PER_YEAR, 1)
    return out

if __name__ == '__main__':
    res = {lv: total(lv) for lv in ('low', 'mid', 'high')}
    res['kit_items'] = kit(); res['animation_items'] = animation()
    print(json.dumps(res, indent=1))
