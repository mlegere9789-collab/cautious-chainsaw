#!/usr/bin/env python3
"""
03-cluster-stats.py  --  how many unit tiles collide, at every zoom, from the REAL placements.

Run from the repo root:   python docs/pitch/anim/data/03-cluster-stats.py
Writes:                   docs/pitch/anim/data/cluster-stats.json

Read-only on the product: it reads baseline/dist/data (what production serves) and
legacy/analysis/bundle.pretty.js (only to read which files the app loads and in what order).

What it computes (every number in 03-data-fuel.md section 9 comes from this file's output)
------------------------------------------------------------------------------------------
Input    1,804 placement rows (9 placements_* files + 38 density_* files, loaded in the app's order).
Models of "which tiles are on the map at tick t":
  A  carry   the app AS SHIPPED: every unit with any keyframe <= t is drawn at its last keyframe, forever
             (pretty:96265-96305, y1 + the global cache i2; forward play from tick 1).  Only 188 distinct states.
  B  snapshot only the rows recorded at the most recent keyframe tick <= t, held until the next keyframe tick
             (the most generous honest reading).  188 states.
  C  win24   carry, but a unit is dropped once its last keyframe is more than 24 ticks old (a sensitivity probe,
             NOT a recommendation: the data does not say when a unit leaves the field).
Projection: Web-Mercator with 512 px tiles (mapbox-gl): world = 512 * 2**z CSS px.  North up, pitch 0
(the app never sets pitch or bearing: pretty:97237-97250).  Zooms 11..17 plus 13.5 (the app's start zoom, pretty:97212) and 18 (the app's maxZoom, pretty:97243).
Tile footprints:
  today    the shipped glyph: body w x h, w = clamp(round(strength/4),10,120) px, h = 8 (4 for cavalry), plus the
           3.5 px-radius disposition dot centred 7 px above the body (pretty:96433-96438, 96605-96651).  No label.
  S_24x16  fixed 24x16 px frame (the symbology proposed in docs/plan/specialists/app-design.md 9.2)
  M_40x16  fixed 40x16 px (frame + one-line short code)
  L_72x30  fixed 72x30 px (frame + two lines: short name + strength)
  These three are SENSITIVITY PROBES, not design decisions.
Metrics
  near     two tiles are "within one tile-width" when centre-to-centre distance < W (px); W swept 16..120.
  overlap  two tiles obscure each other when their footprints intersect (strictly).
  moves    minimum number of tiles that must be moved, merged or hidden so that every remaining tile sits on its
           true position, fully visible = n - MIS(overlap graph).  Reported as bounds:
             lb = n - (occupied W x H grid cells, best of 4 offsets)  (valid for equal-size probes: two centres in
                  one W x H cell always overlap, so MIS <= occupied cells)
             ub = n - |greedy independent set| (min-degree greedy, valid construction)
           and merge_removed = sum over overlap clusters of (size - 1) = tiles that disappear if every cluster
           collapses into one badge.
"""
import json, re, math, os, sys, collections, statistics, time
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
os.chdir(ROOT)
D = 'baseline/dist/data/'
OUT = 'docs/pitch/anim/data/cluster-stats.json'

# ------------------------------------------------------------------ load rows exactly as the app does
def load_rows():
    src = open('legacy/analysis/bundle.pretty.js', encoding='utf8').read()
    tf = re.search(r'tF = \{(.*?)\},\n  nF', src, re.S).group(1)
    nf = re.search(r'nF = \{(.*?)\};\nasync function iF', src, re.S).group(1)
    days = {}
    for d, body in re.findall(r'(\d): \[\s*((?:"placements_[a-z0-9_]+\.json",?\s*)+)\]', tf):
        days.setdefault(int(d), []).extend(re.findall(r'"([^"]+)"', body))
    for d, body in re.findall(r'(\d): \[\s*((?:"density_[a-z0-9_]+\.json",?\s*)+)\]', nf):
        days.setdefault(int(d), []).extend(re.findall(r'"([^"]+)"', body))
    rows = []
    for day in (1, 2, 3):
        for f in days[day]:
            j = json.load(open(D + f, encoding='utf8'))
            for r in (j['placements'] if isinstance(j, dict) else j):
                r = dict(r); r['_file'] = f
                rows.append(r)
    return rows

rows = load_rows()
assert len(rows) == 1804, len(rows)
by_tick = collections.defaultdict(list)
for r in rows:
    by_tick[r['tick']].append(r)
key_ticks = sorted(by_tick)
assert len(key_ticks) == 188
TMAX = 675

# ------------------------------------------------------------------ registry facts per placed id
ui = json.load(open('data-src/build/unit_index.json', encoding='utf8'))
reg = {u['id']: u for u in ui['units']}
form = {u['id']: u for u in ui['formations']}
def info(uid):
    u = reg.get(uid) or form.get(uid)
    return u

# ------------------------------------------------------------------ places (production terrain.json)
terr = json.load(open(D + 'terrain.json', encoding='utf8'))
terr_legacy = json.load(open('legacy/dist/data/terrain.json', encoding='utf8'))
places = []
for k in terr['key_locations']:
    places.append((k['name'], k['lat'], k['lng'], 'key_location'))
for k in terr['structures']:
    places.append((k['name'], k['lat'], k['lng'], 'structure'))
for k in terr['terrain_features']:
    if 'lat' in k:
        places.append((k['name'], k['lat'], k['lng'], 'feature'))
legacy_loc = {k['name']: (k['lat'], k['lng']) for k in terr_legacy['key_locations']}
P_LAT = np.array([p[1] for p in places]); P_LNG = np.array([p[2] for p in places])
M_LAT = 111195.0
M_LNG = 111195.0 * math.cos(math.radians(39.82))

def nearest_place(lat, lng):
    d = np.hypot((P_LAT - lat) * M_LAT, (P_LNG - lng) * M_LNG)
    i = int(np.argmin(d))
    return places[i][0], round(float(d[i]))

# ------------------------------------------------------------------ geometry
def world_xy(lat, lng, z):
    s = 512.0 * 2.0 ** z
    x = (lng + 180.0) / 360.0 * s
    sinl = np.sin(np.radians(lat))
    y = (0.5 - np.log((1 + sinl) / (1 - sinl)) / (4 * math.pi)) * s
    return x, y

def mpp(z, lat=39.82):
    return 40075016.686 * math.cos(math.radians(lat)) / (512.0 * 2.0 ** z)

def width_today(strength):
    return np.clip(np.round(np.where(strength > 0, strength, 200) / 4.0), 10, 120)

def components(adj):
    """connected components of a boolean adjacency matrix (no scipy): returns label array."""
    n = adj.shape[0]
    lab = -np.ones(n, dtype=int)
    c = 0
    for s in range(n):
        if lab[s] >= 0:
            continue
        stack = [s]; lab[s] = c
        while stack:
            u = stack.pop()
            nb = np.nonzero(adj[u] & (lab < 0))[0]
            lab[nb] = c
            stack.extend(nb.tolist())
        c += 1
    return lab, c

def greedy_mis(adj):
    """min-degree greedy independent set size of one component (adj boolean, no self loops)."""
    n = adj.shape[0]
    alive = np.ones(n, dtype=bool)
    deg = adj.sum(1).astype(int)
    cnt = 0
    while alive.any():
        d = np.where(alive, deg, 1 << 30)
        v = int(np.argmin(d))
        cnt += 1
        rm = adj[v] & alive
        alive[v] = False
        alive[rm] = False
        kill = np.nonzero(rm)[0]
        if kill.size:
            deg = deg - adj[:, kill].sum(1)
        deg = deg - adj[:, v]
    return cnt

class _Budget(Exception):
    pass

def mis_exact(adj, budget=60000):
    """exact maximum independent set size by branch and reduce on bitmasks; returns (size, exact).
    Falls back to the greedy value (a valid lower bound on MIS) when the node budget is exhausted."""
    n = adj.shape[0]
    nb = []
    for i in range(n):
        m = 0
        for j in np.nonzero(adj[i])[0].tolist():
            m |= 1 << j
        nb.append(m)
    memo = {}
    calls = [0]
    def solve(mask):
        if mask == 0:
            return 0
        if mask in memo:
            return memo[mask]
        calls[0] += 1
        if calls[0] > budget:
            raise _Budget()
        m = mask; ans = 0; best_v = -1
        while m:
            low = -1; best_v = -1; best_d = -1
            mm = m
            while mm:
                lsb = mm & -mm
                v = lsb.bit_length() - 1
                mm ^= lsb
                d = (nb[v] & m).bit_count()
                if d <= 1:
                    low = v
                    break
                if d > best_d:
                    best_d = d; best_v = v
            if low >= 0:
                ans += 1
                m &= ~(nb[low] | (1 << low))
                continue
            break
        if m == 0:
            memo[mask] = ans
            return ans
        v = best_v
        a = 1 + solve(m & ~(nb[v] | (1 << v)))
        b = solve(m & ~(1 << v))
        r = ans + (a if a > b else b)
        memo[mask] = r
        return r
    try:
        return solve((1 << n) - 1), True
    except _Budget:
        return greedy_mis(adj), False

def grid_cells_min(x, y, W, H):
    best = None
    for ox, oy in ((0, 0), (W / 2, 0), (0, H / 2), (W / 2, H / 2)):
        cx = np.floor((x + ox) / W).astype(np.int64)
        cy = np.floor((y + oy) / H).astype(np.int64)
        k = len(set(zip(cx.tolist(), cy.tolist())))
        best = k if best is None else min(best, k)
    return best

# ------------------------------------------------------------------ state builders
def snapshot(state):
    ids = list(state.keys())
    recs = [state[i] for i in ids]
    a = dict(
        ids=ids,
        lat=np.array([r['lat'] for r in recs]), lng=np.array([r['lng'] for r in recs]),
        strength=np.array([r['strength'] for r in recs], dtype=float),
        tick=np.array([r['tick'] for r in recs]),
        cav=np.array([('CAV' in i) or (r['disposition'] in ('Mounted Cavalry', 'Dismounted Cavalry')) for i, r in zip(ids, recs)]),
        side=np.array([0 if i.startswith('U-') else 1 for i in ids]),
        disp=[r['disposition'] for r in recs],
    )
    return a

def states_A():
    """carry-forward, one state per keyframe tick, with persistence in ticks."""
    st = {}
    out = []
    for i, t in enumerate(key_ticks):
        for r in by_tick[t]:
            st[r['unit_id']] = r        # later rows of the same tick win (as in y1)
        nxt = key_ticks[i + 1] if i + 1 < len(key_ticks) else TMAX + 1
        s = snapshot(st); s['t'] = t; s['w'] = nxt - t
        out.append(s)
    return out

def states_B():
    out = []
    for i, t in enumerate(key_ticks):
        st = {}
        for r in by_tick[t]:
            st[r['unit_id']] = r
        nxt = key_ticks[i + 1] if i + 1 < len(key_ticks) else TMAX + 1
        s = snapshot(st); s['t'] = t; s['w'] = nxt - t
        out.append(s)
    return out

def states_C(win):
    """carry with an age cut-off; state at every tick, merged when the unit set is identical."""
    st = {}
    out = []
    ki = 0
    last = None
    for t in range(1, TMAX + 1):
        if t in by_tick:
            for r in by_tick[t]:
                st[r['unit_id']] = r
        live = {u: r for u, r in st.items() if t - r['tick'] <= win}
        sig = (tuple(sorted(live)), tuple(live[u]['tick'] for u in sorted(live)))
        if sig == last and out:
            out[-1]['w'] += 1
            continue
        last = sig
        s = snapshot(live); s['t'] = t; s['w'] = 1
        out.append(s)
    return out

# ------------------------------------------------------------------ per-state graph metrics
ZOOMS = [11, 12, 13, 13.5, 14, 15, 16, 17, 18]
NEAR_W = [16, 24, 32, 40, 56, 72, 96, 120]
PROBES = {'S_24x16': (24, 16), 'M_40x16': (40, 16), 'L_72x30': (72, 30)}

def near_metrics(x, y, W):
    n = len(x)
    if n == 0:
        return dict(n=0, deg=np.zeros(0, dtype=int), comp_max=0, ncomp_ge2=0)
    dx = x[:, None] - x[None, :]; dy = y[:, None] - y[None, :]
    adj = (dx * dx + dy * dy) < W * W
    np.fill_diagonal(adj, False)
    lab, c = components(adj)
    sizes = np.bincount(lab, minlength=c)
    return dict(n=n, deg=adj.sum(1), comp_max=int(sizes.max()), ncomp_ge2=int((sizes >= 2).sum()),
                lab=lab, sizes=sizes)

def overlap_adj_probe(x, y, W, H):
    dx = np.abs(x[:, None] - x[None, :]); dy = np.abs(y[:, None] - y[None, :])
    adj = (dx < W) & (dy < H)
    np.fill_diagonal(adj, False)
    return adj

def overlap_adj_today(x, y, w, h):
    # glyph: x extent w (>=7 for the dot), y extent from (y-10.5) to (y+h/2)
    wx = np.maximum(w, 7.0)
    top = y - 10.5; bot = y + h / 2.0
    adj = (np.abs(x[:, None] - x[None, :]) < (wx[:, None] + wx[None, :]) / 2.0) & \
          (top[:, None] < bot[None, :]) & (top[None, :] < bot[:, None])
    np.fill_diagonal(adj, False)
    return adj

def overlap_metrics(adj, x, y, W=None, H=None):
    n = adj.shape[0]
    if n == 0:
        return dict(n=0, in_overlap=0, clusters=0, comp_max=0, merge_removed=0, moves_lb=0, moves_ub=0, exact=True, lab=np.zeros(0, int), sizes=np.zeros(0, int))
    lab, c = components(adj)
    sizes = np.bincount(lab, minlength=c)
    in_overlap = int((sizes[lab] >= 2).sum())
    merge_removed = int((sizes[sizes >= 2] - 1).sum())
    ub = 0; exact_all = True
    for k in np.nonzero(sizes >= 2)[0]:
        idx = np.nonzero(lab == k)[0]
        sub = adj[np.ix_(idx, idx)]
        m, ex = mis_exact(sub)
        exact_all = exact_all and ex
        ub += len(idx) - m
    lb = ub
    if not exact_all:
        lb = 0
        if W is not None:
            lb = max(n - grid_cells_min(x, y, W, H), 0)
        lb = min(lb, ub)
    return dict(n=n, in_overlap=in_overlap, clusters=int((sizes >= 2).sum()), comp_max=int(sizes.max()),
                merge_removed=merge_removed, moves_lb=lb, moves_ub=ub, exact=exact_all, lab=lab, sizes=sizes)

def run_state(s, z, want=('near', 'overlap')):
    x, y = world_xy(s['lat'], s['lng'], z)
    res = {}
    if 'near' in want:
        res['near'] = {W: near_metrics(x, y, W) for W in NEAR_W}
    if 'overlap' in want:
        ov = {}
        for name, (W, H) in PROBES.items():
            adj = overlap_adj_probe(x, y, W, H)
            ov[name] = overlap_metrics(adj, x, y, W, H)
            ov[name]['adj'] = adj
        w = width_today(s['strength']); h = np.where(s['cav'], 4.0, 8.0)
        adj = overlap_adj_today(x, y, w, h)
        ov['today'] = overlap_metrics(adj, x, y)
        ov['today']['adj'] = adj
        res['overlap'] = ov
    res['xy'] = (x, y)
    return res

# ------------------------------------------------------------------ weighted statistics helpers
def wquantile(vals, wts, q):
    vals = np.asarray(vals, dtype=float); wts = np.asarray(wts, dtype=float)
    if vals.size == 0:
        return None
    o = np.argsort(vals); v = vals[o]; w = wts[o]
    c = np.cumsum(w) / w.sum()
    return float(v[np.searchsorted(c, q, side='left').clip(0, len(v) - 1)])

def summarize_series(vals, wts):
    vals = np.asarray(vals, dtype=float); wts = np.asarray(wts, dtype=float)
    return dict(max=float(vals.max()), p50=wquantile(vals, wts, 0.5), p90=wquantile(vals, wts, 0.9),
                mean=float((vals * wts).sum() / wts.sum()),
                ticks_with_any=float(wts[vals > 0].sum()), ticks_total=float(wts.sum()))

def rnd(v, k=2):
    return None if v is None else round(float(v), k)

# ------------------------------------------------------------------ main
t0 = time.time()
models = {'A_carry_as_shipped': states_A(), 'B_latest_keyframe_snapshot': states_B(), 'C_carry_window_24': states_C(24)}
print('states', {k: len(v) for k, v in models.items()}, file=sys.stderr)

result = dict(
    schema='gtbg/pitch-anim/cluster-stats/1',
    generated_by='docs/pitch/anim/data/03-cluster-stats.py',
    generated_on='2026-10-05',
    inputs=dict(
        placement_rows=len(rows), keyframe_ticks=len(key_ticks), distinct_unit_ids=len({r['unit_id'] for r in rows}),
        files_loaded=sorted({r['_file'] for r in rows}),
        projection='Web-Mercator, world = 512*2^z CSS px, north up, pitch 0 (pretty:97237-97250); zoom range of the app 11..18, start 13.5',
        metres_per_css_px={str(z): rnd(mpp(z), 3) for z in ZOOMS},
        units_note='All pixel sizes are CSS px at devicePixelRatio 1; the shipped canvas is not DPR-aware (perf-runtime-10).'),
    models={
        'A_carry_as_shipped': 'every unit with any keyframe <= t is drawn at its last keyframe, never removed (the app as shipped, forward play from tick 1)',
        'B_latest_keyframe_snapshot': 'only the rows recorded at the most recent keyframe tick <= t, held until the next keyframe tick (the most generous honest reading; a strict exact-tick reading, as the overview counter was designed, would draw nothing on the 487 ticks that have no rows)',
        'C_carry_window_24': 'carry-forward but a unit is dropped when its last keyframe is more than 24 ticks old (sensitivity probe only)'},
    tile_footprints={
        'today': 'shipped glyph: body w x h (w=clamp(round(strength/4),10,120), h=8, cavalry 4) + 3.5 px dot centred 7 px above; no label',
        **{k: f'fixed {v[0]}x{v[1]} px probe (not a design decision)' for k, v in PROBES.items()}},
    metric_definitions=dict(
        near='two tiles are within one tile-width when centre distance < W px; cluster = connected component of that graph',
        overlap='two tiles obscure each other when their footprints intersect; cluster = connected component',
        moves='min tiles to move/merge/hide so every remaining tile is fully visible on its true position = n - MIS; given as lb/ub',
        merge_removed='sum over overlap clusters of (size-1): tiles that vanish if every cluster collapses to one badge',
        weights='ticks: a state that persists for k ticks counts k times'),
    by_model={},
)

hot = {}    # hotspot collections
for mname, states in models.items():
    print('model', mname, file=sys.stderr)
    mres = dict(population={}, zoom={})
    wts = np.array([s['w'] for s in states], dtype=float)
    ns = np.array([len(s['ids']) for s in states], dtype=float)
    mres['population'] = dict(
        states=len(states),
        tiles_on_map=summarize_series(ns, wts),
        by_side_at_max=None,
        max_at_tick=int(states[int(np.argmax(ns))]['t']))
    # age (ticks since last keyframe) of drawn tiles, weighted
    ages = []; agew = []
    for s in states:
        # state starts at tick s['t']; ages are measured at that tick (lower bound)
        ages.extend((s['t'] - s['tick']).tolist()); agew.extend([s['w']] * len(s['ids']))
    ages = np.array(ages); agew = np.array(agew)
    mres['population']['age_in_ticks_of_drawn_tiles_at_state_start'] = dict(
        p50=wquantile(ages, agew, .5), p90=wquantile(ages, agew, .9), max=float(ages.max()),
        share_older_than_12=float(agew[ages > 12].sum() / agew.sum()),
        share_older_than_48=float(agew[ages > 48].sum() / agew.sum()),
        share_older_than_225=float(agew[ages > 225].sum() / agew.sum()))
    do_overlap_all = True
    for z in ZOOMS:
        zr = dict(near={}, overlap={})
        near_series = {W: [] for W in NEAR_W}
        near_ncomp = {W: [] for W in NEAR_W}
        near_deg_vals = {W: [] for W in NEAR_W}; near_deg_w = {W: [] for W in NEAR_W}
        ov_series = {k: collections.defaultdict(list) for k in list(PROBES) + ['today']}
        for si, s in enumerate(states):
            r = run_state(s, z)
            for W in NEAR_W:
                m = r['near'][W]
                near_series[W].append(m['comp_max']); near_ncomp[W].append(m['ncomp_ge2'])
                near_deg_vals[W].append(m['deg']); near_deg_w[W].append(np.full(len(m['deg']), s['w'], dtype=float))
            for k, m in r['overlap'].items():
                for f in ('n', 'in_overlap', 'clusters', 'comp_max', 'merge_removed', 'moves_lb', 'moves_ub', 'exact'):
                    ov_series[k][f].append(m[f])
            # hotspot capture (overlap graph, M probe) for model A and B only
            if mname in ('A_carry_as_shipped', 'B_latest_keyframe_snapshot'):
                m = r['overlap']['M_40x16']
                if m['comp_max'] >= 2:
                    x, y = r['xy']
                    lab = m['lab']; sizes = m['sizes']
                    # the top 3 clusters of the state
                    for k in np.argsort(-sizes)[:3]:
                        if sizes[k] < 3:
                            break
                        idx = np.nonzero(lab == k)[0]
                        lat = float(s['lat'][idx].mean()); lng = float(s['lng'][idx].mean())
                        nm, dist = nearest_place(lat, lng)
                        hot.setdefault((mname, z), []).append(dict(
                            tick=int(s['t']), persists_ticks=int(s['w']), n=int(len(idx)),
                            union=int((s['side'][idx] == 0).sum()), confederate=int((s['side'][idx] == 1).sum()),
                            lat=round(lat, 5), lng=round(lng, 5), nearest_place=nm, nearest_place_m=dist,
                            spread_m=round(float(max(np.ptp(s['lat'][idx]) * M_LAT, np.ptp(s['lng'][idx]) * M_LNG))),
                            ids=[s['ids'][i] for i in idx[:12]],
                            max_age_ticks=int((s['t'] - s['tick'][idx]).max())))
        # near-metric summaries
        for W in NEAR_W:
            dv = np.concatenate(near_deg_vals[W]) if near_deg_vals[W] else np.zeros(0)
            dw = np.concatenate(near_deg_w[W]) if near_deg_w[W] else np.zeros(0)
            zr['near'][str(W)] = dict(
                largest_cluster=summarize_series(near_series[W], wts),
                clusters_ge2=summarize_series(near_ncomp[W], wts),
                neighbours_per_tile=dict(
                    p50=wquantile(dv, dw, .5), p90=wquantile(dv, dw, .9), p99=wquantile(dv, dw, .99), max=float(dv.max()),
                    share_with_ge1=float(dw[dv >= 1].sum() / dw.sum()),
                    share_with_ge3=float(dw[dv >= 3].sum() / dw.sum()),
                    share_with_ge10=float(dw[dv >= 10].sum() / dw.sum())))
        for k, d in ov_series.items():
            n_arr = np.array(d['n'], dtype=float)
            ent = {}
            for f in ('in_overlap', 'clusters', 'comp_max', 'merge_removed', 'moves_lb', 'moves_ub'):
                vals = d[f]
                if any(v is None for v in vals):
                    ent[f] = None
                    continue
                ent[f] = summarize_series(vals, wts)
            ent['tiles'] = summarize_series(n_arr, wts)
            ent['moves_exact_in_all_states'] = bool(all(d['exact']))
            ent['moves_states_exact'] = int(sum(1 for v in d['exact'] if v))
            frac = np.array(d['in_overlap'], dtype=float) / np.maximum(n_arr, 1)
            ent['share_of_tiles_overlapped'] = dict(p50=wquantile(frac, wts, .5), p90=wquantile(frac, wts, .9), max=float(frac.max()))
            ent['share_of_ticks_with_any_overlap'] = float(wts[np.array(d['in_overlap']) > 0].sum() / wts.sum())
            # worst state
            j = int(np.argmax(d['in_overlap']))
            ent['worst_state'] = dict(tick=int(states[j]['t']), tiles=int(d['n'][j]), overlapped=int(d['in_overlap'][j]),
                                      merge_removed=int(d['merge_removed'][j]),
                                      moves_lb=d['moves_lb'][j], moves_ub=int(d['moves_ub'][j]), largest_cluster=int(d['comp_max'][j]))
            zr['overlap'][k] = ent
            if mname in ('A_carry_as_shipped', 'B_latest_keyframe_snapshot') and k in ('today', 'M_40x16'):
                zr.setdefault('series_by_state', {})[k] = dict(
                    ticks=[int(s['t']) for s in states], persists=[int(s['w']) for s in states],
                    tiles=[int(v) for v in d['n']], overlapped=[int(v) for v in d['in_overlap']],
                    largest_cluster=[int(v) for v in d['comp_max']], merge_removed=[int(v) for v in d['merge_removed']],
                    moves_ub=[int(v) for v in d['moves_ub']])
        mres['zoom'][str(z)] = zr
        print(f'  z={z} done {time.time()-t0:.0f}s', file=sys.stderr)
    result['by_model'][mname] = mres

# ------------------------------------------------------------------ zoom independent: coincident and hierarchical stacks
print('stacks', file=sys.stderr)

def chain(uid):
    inf = info(uid)
    return {p['id'] for p in (inf.get('parents') or [])} if inf else set()

def zoom_independent(states, label):
    w = np.array([s['w'] for s in states], dtype=float)
    coinc_tiles = []; coinc_max = []; nn_rows = []; hier_pairs = []; hier_d = []; hier_w = []
    stack_pairs = collections.Counter(); stack_pair_w = collections.Counter()
    for s in states:
        lat = s['lat']; lng = s['lng']; ids = s['ids']
        key = list(zip(np.round(lat, 4).tolist(), np.round(lng, 4).tolist()))
        cnt = collections.Counter(key)
        coinc_tiles.append(sum(v for v in cnt.values() if v >= 2))
        coinc_max.append(max(cnt.values()))
        dx = (lng[:, None] - lng[None, :]) * M_LNG; dy = (lat[:, None] - lat[None, :]) * M_LAT
        d = np.hypot(dx, dy); np.fill_diagonal(d, np.inf)
        nn_rows.append(d.min(1) if len(ids) > 1 else np.array([np.inf]))
        pos = {u: i for i, u in enumerate(ids)}
        pairs = 0
        for u in ids:
            for pid in chain(u):
                if pid in pos:
                    pairs += 1; hier_d.append(float(d[pos[u], pos[pid]])); hier_w.append(s['w'])
        hier_pairs.append(pairs)
        # classify tile pairs that share an exact coordinate
        groups = collections.defaultdict(list)
        for i, k in enumerate(key):
            groups[k].append(i)
        for g in groups.values():
            for a in range(len(g)):
                for b in range(a + 1, len(g)):
                    ua, ub = ids[g[a]], ids[g[b]]
                    if ua.startswith('U-') != ub.startswith('U-'):
                        kind = 'enemy_sides'
                    elif ub in chain(ua) or ua in chain(ub):
                        kind = 'ancestor_and_descendant'
                    elif chain(ua) & chain(ub) and info(ua) and info(ub):
                        kind = 'same_formation_siblings'
                    elif info(ua) is None or info(ub) is None:
                        kind = 'same_side_one_id_unresolved'
                    else:
                        kind = 'same_side_unrelated'
                    stack_pairs[kind] += 1; stack_pair_w[kind] += s['w']
    nn_all = np.concatenate(nn_rows)
    nn_w = np.concatenate([np.full(len(r), s['w'], dtype=float) for r, s in zip(nn_rows, states)])
    nn_all = np.where(np.isfinite(nn_all), nn_all, 1e9)
    def share_lt(v, ww, th):
        return float(ww[v < th].sum() / ww.sum())
    hd = np.array(hier_d); hw = np.array(hier_w)
    return dict(
        nearest_neighbour_m=dict(p50=wquantile(nn_all, nn_w, .5), p25=wquantile(nn_all, nn_w, .25), p10=wquantile(nn_all, nn_w, .1),
                                 share_lt_1m=share_lt(nn_all, nn_w, 1), share_lt_25m=share_lt(nn_all, nn_w, 25), share_lt_50m=share_lt(nn_all, nn_w, 50),
                                 share_lt_100m=share_lt(nn_all, nn_w, 100), share_lt_250m=share_lt(nn_all, nn_w, 250)),
        exact_same_coordinate_stacks=dict(
            tiles_sharing_a_coordinate_with_another=summarize_series(coinc_tiles, w),
            largest_stack=summarize_series(coinc_max, w),
            pair_kinds_tick_weighted=dict(stack_pair_w),
            pair_kinds_state_count=dict(stack_pairs)),
        ancestor_and_descendant_both_drawn=dict(
            pairs_per_state=summarize_series(hier_pairs, w),
            distance_m_p50=wquantile(hd, hw, .5) if hd.size else None,
            share_within_30m=share_lt(hd, hw, 30) if hd.size else None,
            share_within_100m=share_lt(hd, hw, 100) if hd.size else None,
            share_within_300m=share_lt(hd, hw, 300) if hd.size else None))

result['zoom_independent'] = dict(
    note='Ground distances in metres, independent of zoom. Placement coordinates carry 4 decimals = 11.1 m north-south, 8.5 m east-west. '
         'Stacks = tiles on an identical lat/lng pair: no zoom level separates them, so they must be merged or fanned out at every zoom. '
         'Ancestor/descendant = a brigade, division or corps tile and one of its own regiments both on the map (parents from data-src/build/unit_index.json; only the 383 placed ids that resolve are testable).',
    A_carry_as_shipped=zoom_independent(models['A_carry_as_shipped'], 'A'),
    B_latest_keyframe_snapshot=zoom_independent(models['B_latest_keyframe_snapshot'], 'B'))

# ------------------------------------------------------------------ hotspots
def episodes(lst):
    """merge consecutive states of the same place into episodes; keep the largest cluster as the headline"""
    lst = sorted(lst, key=lambda h: (h['nearest_place'], h['tick']))
    out = []; cur = None
    for h in lst:
        if cur and cur['nearest_place'] == h['nearest_place'] and h['tick'] <= cur['last_tick'] + 2:
            cur['last_tick'] = max(cur['last_tick'], h['tick'] + h['persists_ticks'] - 1)
            if h['n'] > cur['max_n']:
                cur.update(max_n=h['n'], at_tick=h['tick'], union=h['union'], confederate=h['confederate'],
                           centroid=[h['lat'], h['lng']], spread_m=h['spread_m'], ids=h['ids'], nearest_place_m=h['nearest_place_m'],
                           max_age_ticks=h['max_age_ticks'])
            cur['tick_weight'] += h['persists_ticks']
        else:
            cur = dict(nearest_place=h['nearest_place'], first_tick=h['tick'], last_tick=h['tick'] + h['persists_ticks'] - 1,
                       max_n=h['n'], at_tick=h['tick'], union=h['union'], confederate=h['confederate'], centroid=[h['lat'], h['lng']],
                       spread_m=h['spread_m'], ids=h['ids'], nearest_place_m=h['nearest_place_m'], max_age_ticks=h['max_age_ticks'],
                       tick_weight=h['persists_ticks'])
            out.append(cur)
    for e in out:
        e['day'] = 1 if e['at_tick'] <= 225 else 2 if e['at_tick'] <= 450 else 3
    return sorted(out, key=lambda e: (-e['max_n'], e['at_tick']))

result['hotspots'] = {}
for (mname, z), lst in sorted(hot.items(), key=lambda kv: (kv[0][0], kv[0][1])):
    eps = episodes(lst)
    result['hotspots'][f'{mname}|z{z}'] = dict(
        footprint='overlap clusters of >= 3 tiles with the M_40x16 probe; one episode = consecutive states at the same nearest place',
        episodes_top=eps[:14],
        episodes_total=len(eps))

def _moved(k):
    return round(math.hypot((k['lat'] - legacy_loc[k['name']][0]) * M_LAT, (k['lng'] - legacy_loc[k['name']][1]) * M_LNG))

result['places_note'] = dict(
    source='baseline/dist/data/terrain.json (what production serves): 30 key locations + 8 structures + 3 located features',
    legacy_differs=[dict(name=k['name'], moved_m=_moved(k)) for k in terr['key_locations'] if _moved(k) > 0],
    caveat='Production moved eight key locations by 166-733 m relative to legacy/dist (docs/baseline-drift.md). The placements were authored against an unknown reference; nearest_place is a label for the reader, not a claim that the cluster is at that place.')
result['runtime_seconds'] = round(time.time() - t0, 1)

def round_floats(o, k=3):
    if isinstance(o, float):
        return round(o, k)
    if isinstance(o, dict):
        return {a: round_floats(b, k) for a, b in o.items()}
    if isinstance(o, list):
        return [round_floats(b, k) for b in o]
    return o

json.dump(round_floats(result), open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('wrote', OUT, os.path.getsize(OUT), 'bytes', file=sys.stderr)
