"""Library for the fidelity pilot: waypoint timelines -> per-minute unit states, footprints on the 3DEP ground, evidence envelope,
Monte-Carlo expected fidelity, and the match tiers. Pure functions; no network. Used by build_pilot.py, score_passB.py and score_site.py."""
import math, random
from geo import to_xy, to_ll, dist_m, bearing, elev, slope_aspect, path_time_min

T0 = 16 * 60            # 16:00 LMT in minutes; the pilot hour is 960..1019 (60 unit-minutes) and the boundary row 1020 (17:00)
MINUTES = list(range(T0, T0 + 61))

TIERS = {               # position m, facing deg  (activity class and formation class must also match, in every tier)
    'strict':   (50.0, 15.0),
    'standard': (100.0, 30.0),
    'loose':    (250.0, 60.0),
}

ACT_CLASS = {
    'resting': 'static', 'halted': 'static', 'halted_awaiting_order': 'static', 'standing_under_fire': 'static',
    'marching_double': 'moving', 'marching_quick': 'moving', 'advancing_quick': 'moving', 'advancing_double': 'moving', 'climbing': 'moving',
    'flank_move_left': 'moving', 'flank_move_right': 'moving',
    'forming': 'forming', 'deploying_skirmishers': 'forming', 'unlimbering': 'forming', 'wheeling': 'forming',
    'firing_unspecified': 'engaged', 'skirmishing': 'engaged', 'skirmishers_out': 'engaged', 'advancing_fighting': 'engaged', 'advancing_firing': 'engaged',
}
FORM_CLASS = {
    'column_mass': 'column', 'column_fours': 'column', 'line': 'line', 'line_forming': 'line', 'line_disordered': 'line', 'skirmish_line': 'skirmish',
    'battery_limbered': 'bat_limbered', 'battery_unlimbering': 'bat_action', 'battery_in_action': 'bat_action',
}

def hm(s):
    h, m = s.split(':'); return int(h) * 60 + int(m)

def fmt(m):
    return '%02d:%02d' % (int(m) // 60, int(m) % 60)

def angdiff(a, b):
    d = abs(a - b) % 360
    return d if d <= 180 else 360 - d

def lerp_ang(a, b, f):
    d = ((b - a + 540) % 360) - 180
    return (a + d * f) % 360

def resolve(wps):
    """absolute minutes (t, lo, hi) for each waypoint; rel waypoints hang on an earlier waypoint of the same unit"""
    byid = {}
    out = []
    for w in wps:
        if w['rel']:
            ref, dt, dlo, dhi = w['rel']; r = byid[ref]
            t, lo, hi = r['T'] + dt, r['LO'] + dlo, r['HI'] + dhi
        else:
            t, lo, hi = hm(w['t']), hm(w['lo']), hm(w['hi'])
        x, y = to_xy(*w['pos'])
        e = dict(w); e.update(T=t, LO=lo, HI=hi, X=x, Y=y); byid[w['wid']] = e; out.append(e)
    return out

def check_monotone(rw):
    errs = []
    for a, b in zip(rw, rw[1:]):
        for k in ('T', 'LO', 'HI'):
            if b[k] < a[k]:
                errs.append(f"{a['wid']}->{b['wid']}: {k} goes backwards ({fmt(a[k])} > {fmt(b[k])})")
    for w in rw:
        if not (w['LO'] <= w['T'] <= w['HI']):
            errs.append(f"{w['wid']}: best time outside its window")
    return errs

def state_at(rw, m, key='T'):
    """interpolated state at minute m using the waypoint times of `key` (T best, LO earliest, HI latest). Returns (x, y, facing, wp_index_of_state, progress)"""
    ts = [w[key] for w in rw]
    if m <= ts[0]:
        w = rw[0]; return w['X'], w['Y'], w['facing'], 0, 0.0
    if m >= ts[-1]:
        w = rw[-1]; return w['X'], w['Y'], w['facing'], len(rw) - 1, float(len(rw) - 1)
    for i in range(len(rw) - 1):
        if ts[i] <= m < ts[i + 1]:
            a, b = rw[i], rw[i + 1]
            f = (m - ts[i]) / max(1e-9, (ts[i + 1] - ts[i]))
            return a['X'] + (b['X'] - a['X']) * f, a['Y'] + (b['Y'] - a['Y']) * f, lerp_ang(a['facing'], b['facing'], f), i, i + f
    w = rw[-1]; return w['X'], w['Y'], w['facing'], len(rw) - 1, float(len(rw) - 1)

def path_point(rw, p):
    i = int(min(max(p, 0), len(rw) - 1 - 1e-9)); f = min(max(p - i, 0.0), 1.0)
    if i >= len(rw) - 1:
        w = rw[-1]; return w['X'], w['Y'], w['facing']
    a, b = rw[i], rw[i + 1]
    return a['X'] + (b['X'] - a['X']) * f, a['Y'] + (b['Y'] - a['Y']) * f, lerp_ang(a['facing'], b['facing'], f)

def sigma_at(rw, p):
    i = int(min(max(p, 0), len(rw) - 1 - 1e-9)); f = min(max(p - i, 0.0), 1.0)
    if i >= len(rw) - 1: return rw[-1]['sigma_m']
    return rw[i]['sigma_m'] * (1 - f) + rw[i + 1]['sigma_m'] * f

# ------------------------------------------------------------------------------------------------------ footprint on the ground
FILE_M = 0.56      # 22 inches per file in line (drill-book constant, NOT re-read in this pilot: Unverified constant U1)
PACE_M = 0.76      # 30 inch pace in column (U1)
GUN_INT_M = 12.8   # 14 yards between guns in action (U1)

def footprint_dims(uinfo, formation, ranks=2):
    n = uinfo['strength']
    if formation in ('line', 'line_forming', 'line_disordered'):
        front = max(10.0, (n / 2.0) * FILE_M) if uinfo.get('front_ranks', 2) == 2 else n * 1.2
        return front, 4.0
    if formation == 'skirmish_line':
        return max(20.0, n * 3.8), 12.0
    if formation == 'column_fours':
        return 2.6, max(8.0, (n / 4.0) * PACE_M * 1.0)
    if formation == 'column_mass':
        return max(10.0, (n / 2.0) * FILE_M / 5.0), 26.0
    if formation == 'battery_limbered':
        return 6.0, 130.0
    if formation in ('battery_unlimbering', 'battery_in_action'):
        g = uinfo.get('guns', 6); return GUN_INT_M * (g - 1) + 6.0, 24.0
    return 20.0, 20.0

def polygon(x, y, facing_deg, front, depth):
    """rectangle: `front` across the facing direction, `depth` along it (rear behind the facing). Returns 4 (x, y) corners"""
    th = math.radians(facing_deg)
    fx, fy = math.sin(th), math.cos(th)         # unit vector to the front
    rx, ry = fy, -fx                            # unit vector to the right of the facing direction
    cs = []
    for sf, sr in ((+0.5, -0.5), (+0.5, +0.5), (-0.5, +0.5), (-0.5, -0.5)):
        cs.append((x + fx * depth * sf + rx * front * sr, y + fy * depth * sf + ry * front * sr))
    return cs

def ground_of(poly_xy, cx, cy):
    """elevation at the corners and the centre, mean slope and downslope aspect at the centre, max corner spread"""
    zs = [elev(*to_ll(px, py)) for px, py in poly_xy]
    z0 = elev(*to_ll(cx, cy))
    sl, asp = slope_aspect(*to_ll(cx, cy))
    return dict(z=round(z0, 1), z_min=round(min(zs), 1), z_max=round(max(zs), 1), slope_deg=round(sl, 1), downslope_aspect_deg=round(asp, 0))

# ------------------------------------------------------------------------------------------------------ rows
def build_rows(uid, uinfo, wps, with_ground=True):
    rw = resolve(wps)
    errs = check_monotone(rw)
    rows = []
    for m in MINUTES:
        x, y, fc, i, p = state_at(rw, m, 'T')
        w = rw[i]
        act = w['activity']; form = w['formation']
        # a waypoint is the state that STARTS there; between two waypoints that differ in activity the earlier one holds until the next
        front, depth = footprint_dims(uinfo, form)
        poly = polygon(x, y, fc, front, depth)
        g = ground_of(poly, x, y) if with_ground else {}
        lon, lat = to_ll(x, y)
        # envelope
        _, _, _, _, p_hi = state_at(rw, m, 'LO')    # earliest-times timeline is furthest along
        _, _, _, _, p_lo = state_at(rw, m, 'HI')    # latest-times timeline is least far along
        samples = [p_lo + (p_hi - p_lo) * k / 12.0 for k in range(13)]
        pts = [path_point(rw, s) for s in samples]
        R = max(math.hypot(px - x, py - y) for px, py, _ in pts) + sigma_at(rw, p)
        fhw = max(angdiff(f, fc) for _, _, f in pts)
        acts = sorted({ACT_CLASS[rw[min(int(s + 1e-9), len(rw) - 1)]['activity']] for s in samples})
        forms = sorted({FORM_CLASS[rw[min(int(s + 1e-9), len(rw) - 1)]['formation']] for s in samples})
        fine_acts = sorted({rw[min(int(s + 1e-9), len(rw) - 1)]['activity'] for s in samples})
        det = {}
        for tier, (tp, tf) in TIERS.items():
            det[tier] = bool(R <= tp and fhw <= tf and len(acts) == 1 and len(forms) == 1)
        # casualties: lower bound 0; upper bound = final loss once the earliest possible contact has happened
        first_fire = next((q for q in rw if ACT_CLASS[q['activity']] == 'engaged'), None)
        fin = uinfo.get('final_cas')
        cas_hi = 0 if (first_fire is None or m < first_fire['LO']) else (fin if fin is not None else None)
        rows.append(dict(
            unit=uid, t=fmt(m), minute=m, lon=round(lon, 6), lat=round(lat, 6), facing=round(fc, 0),
            formation=form, formation_class=FORM_CLASS[form], activity=act, activity_class=ACT_CLASS[act],
            strength=uinfo['strength'], front_m=round(front, 1), depth_m=round(depth, 1),
            polygon=[[round(a, 6), round(b, 6)] for a, b in (to_ll(px, py) for px, py in poly)], ground=g,
            wp_from=w['wid'], wp_next=rw[min(i + 1, len(rw) - 1)]['wid'], srcs=w['srcs'], ev=w['ev'],
            envelope=dict(radius_m=round(R, 0), facing_hw=round(fhw, 0), activity_classes=acts, formation_classes=forms, fine_activities=fine_acts,
                          t_early_progress=round(p_hi, 2), t_late_progress=round(p_lo, 2)),
            determined=det, cas_lo=0, cas_hi=cas_hi, cas_final=fin,
        ))
    return rw, rows, errs

# ------------------------------------------------------------------------------------------------------ Monte Carlo
def tri(rng, lo, mode, hi):
    if hi <= lo: return mode
    return rng.triangular(lo, hi, mode)

def draw_timeline(rw, rng, mode):
    """one plausible history: waypoint times and positions jittered inside their evidence. mode 'P1' independent; 'P2' common-mode clock error"""
    z = max(-2.0, min(2.0, rng.gauss(0, 1)))
    ws = []
    for w in rw:
        width = max(1.0, w['HI'] - w['LO'])
        if mode == 'P1':
            t = tri(rng, w['LO'], w['T'], w['HI'])
        else:
            t = w['T'] + z * width / 4.0 + rng.gauss(0, width / 10.0)
            t = min(max(t, w['LO']), w['HI'])
        ws.append(t)
    ws.sort()
    out = []
    for w, t in zip(rw, ws):
        e = dict(w); e['T'] = t
        e['X'] = w['X'] + rng.gauss(0, w['sigma_m'] / 2.0)       # sigma_m is a ~95% half-width: sd = sigma/2
        e['Y'] = w['Y'] + rng.gauss(0, w['sigma_m'] / 2.0)
        e['facing'] = (w['facing'] + rng.gauss(0, max(1.0, w['facing_sd']) / 2.0)) % 360
        out.append(e)
    return out

def classes_at(rw, m, key='T'):
    _, _, _, i, _ = state_at(rw, m, key)
    return ACT_CLASS[rw[i]['activity']], FORM_CLASS[rw[i]['formation']]

def mc_expected(rw, mode, K=600, seed=7):
    """P(match) per minute and tier: share of K plausible histories whose state at minute m lies within tolerance of the reference timeline"""
    rng = random.Random(seed)
    ref = {m: (state_at(rw, m, 'T')[:3], classes_at(rw, m)) for m in MINUTES}
    hit = {tier: {m: 0 for m in MINUTES} for tier in TIERS}
    for _ in range(K):
        d = draw_timeline(rw, rng, mode)
        for m in MINUTES:
            x, y, fc, _, _ = state_at(d, m, 'T'); ac, fo = classes_at(d, m)
            (rx, ry, rf), (rac, rfo) = ref[m]
            dp = math.hypot(x - rx, y - ry); df = angdiff(fc, rf)
            for tier, (tp, tf) in TIERS.items():
                if dp <= tp and df <= tf and ac == rac and fo == rfo:
                    hit[tier][m] += 1
    return {tier: {m: hit[tier][m] / K for m in MINUTES} for tier in TIERS}

# ------------------------------------------------------------------------------------------------------ statistics
def wilson(k, n, z=1.96):
    if n == 0: return (0.0, 1.0)
    p = k / n; d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d; h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))

def kinematic_check(rw):
    """for each leg between consecutive waypoints that is a march: the straight-line speed needed at the best times, the slope-aware minimum time
    at the double-quick (138 m/min, 165 steps x 33 in, drill constant U1) with a rough-ground factor of 0.8, and the verdict"""
    res = []
    for a, b in zip(rw, rw[1:]):
        d = math.hypot(b['X'] - a['X'], b['Y'] - a['Y'])
        if d < 30: continue
        dt = b['T'] - a['T']
        need = d / dt if dt > 0 else float('inf')
        pts = [to_ll(a['X'], a['Y']), to_ll(b['X'], b['Y'])]
        tmin, L, asc = path_time_min(pts, 138.0, rough=0.8)
        tmin_hi = tmin       # fastest case
        # fastest the leg can be with both windows used: b earliest minus a latest
        dt_fast = b['LO'] - a['HI']
        res.append(dict(leg=f"{a['wid']}->{b['wid']}", metres=round(d), ascent_m=round(asc), best_dt_min=dt, speed_needed_mpm=round(need, 1) if dt > 0 else None,
                        min_time_double_quick_min=round(tmin_hi, 1), feasible_at_best=(dt >= tmin_hi * 0.999), window_dt_min=dt_fast,
                        feasible_in_window=((b['HI'] - a['LO']) >= tmin_hi * 0.999)))
    return res


# ------------------------------------------------------------------------------------------------------ clock-aligned Monte Carlo (P3)
LEG_KAPPA = 0.20      # relative error of a leg duration: march legs 20 percent (Modelled, sensitivity 0.1..0.4 in the report)
ONSET_SD = 3.0        # minutes: sd of the lag between a formation event and the onset of fire (Modelled)

def draw_aligned(rw, rng, sd_group, kappa=LEG_KAPPA, onset_sd=ONSET_SD):
    """a plausible history with the COMMON clock error removed: the unit's first moving waypoint is displaced by a unit-group offset
    (sd_group minutes) and every later leg keeps its nominal duration +- kappa (marching) or +- onset_sd (a change of activity class).
    Positions and facings are jittered as in draw_timeline."""
    k0 = next((i for i, w in enumerate(rw) if ACT_CLASS[w['activity']] == 'moving'), 0)
    ts = [w['T'] for w in rw]
    off = rng.gauss(0, sd_group)
    new = [ts[0] + off]
    for i in range(1, len(rw)):
        nominal = ts[i] - ts[i - 1]
        if i <= k0:
            dt = nominal
        else:
            sd = max(0.5, nominal * kappa)
            if ACT_CLASS[rw[i]['activity']] != ACT_CLASS[rw[i - 1]['activity']]:
                sd = math.hypot(sd, onset_sd)
            dt = max(0.2, nominal + rng.gauss(0, sd))
        new.append(new[-1] + dt)
    out = []
    for w, t in zip(rw, new):
        e = dict(w); e['T'] = t
        e['X'] = w['X'] + rng.gauss(0, w['sigma_m'] / 2.0); e['Y'] = w['Y'] + rng.gauss(0, w['sigma_m'] / 2.0)
        e['facing'] = (w['facing'] + rng.gauss(0, max(1.0, w['facing_sd']) / 2.0)) % 360
        out.append(e)
    return out

def mc_aligned(rw, sd_group=4.0, slack=0, K=600, seed=7, kappa=LEG_KAPPA, onset_sd=ONSET_SD):
    """P(match) per minute with the common clock error removed and a +-slack minute time tolerance (a unit-minute matches if the sampled state is
    on the reference trajectory at SOME reference time within slack minutes of m, with position, facing, activity class and formation class all inside tolerance)"""
    rng = random.Random(seed)
    offs = [k * 0.5 for k in range(int(-2 * slack), int(2 * slack) + 1)] if slack > 0 else [0.0]
    refs = {}
    for m in MINUTES:
        refs[m] = [(state_at(rw, m + o, 'T')[:3], classes_at(rw, m + o)) for o in offs]
    hit = {tier: {m: 0 for m in MINUTES} for tier in TIERS}
    for _ in range(K):
        d = draw_aligned(rw, rng, sd_group, kappa, onset_sd)
        for m in MINUTES:
            x, y, fc, _, _ = state_at(d, m, 'T'); ac, fo = classes_at(d, m)
            ok = {tier: False for tier in TIERS}
            for (rx, ry, rf), (rac, rfo) in refs[m]:
                if ac != rac or fo != rfo: continue
                dp = math.hypot(x - rx, y - ry); df = angdiff(fc, rf)
                for tier, (tp, tf) in TIERS.items():
                    if dp <= tp and df <= tf: ok[tier] = True
            for tier in TIERS:
                if ok[tier]: hit[tier][m] += 1
    return {tier: {m: hit[tier][m] / K for m in MINUTES} for tier in TIERS}
