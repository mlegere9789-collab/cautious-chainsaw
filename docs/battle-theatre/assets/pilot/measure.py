"""Numeric checks on the pilot clip (every number in PLAN.md Part 4 comes from here): foot sliding, ground penetration, loop continuity."""
import numpy as np, sys, os, json
from scipy.spatial.transform import Rotation as R
import mhlib, cmu, retarget, garments, build_soldier, posing
from posing import fk_world, lbs

HERE = os.path.dirname(os.path.abspath(__file__))


def run(spec=None, out_json=None):
    spec = spec or garments.PILOT_SPEC
    pr = build_soldier.prepare(spec, gear=True, anim=True, verbose=False)
    clip = pr['clip']
    names, heads, parents = pr['names'], pr['heads'], pr['parents']
    T = len(clip['times'])
    dt = 1.0 / clip['fps']
    res = {'frames': T, 'fps': clip['fps'], 'cycle_s': clip['dur'], 'speed_m_s': float(clip['speed']),
           'steps_per_min': 2 * 60 / clip['dur'], 'step_length_m': float(clip['speed'] * clip['dur'] / 2), 'ground_shift_m': clip['ground_shift_m']}
    soles = [p for p in pr['parts'] if p['name'] == 'soles'][0]
    left = soles['V'][:, 0] > 0
    patch = {'L': [], 'R': []}
    minh = []
    for k in range(T):
        P = lbs(soles['V'], soles['J'], soles['W'], heads, parents, names, clip['rot'][k], clip['root'][k])
        minh.append(P[:, 1].min())
        for s, sel in (('L', left), ('R', ~left)):
            Q = P[sel]
            lowest = Q[:, 1].min()
            m = Q[:, 1] < lowest + 0.015
            patch[s].append((Q[m].mean(0), lowest, m.sum()))
    res['lowest_sole_vertex_cm_min'] = float(min(minh) * 100)
    res['lowest_sole_vertex_cm_max_over_cycle'] = float(max(minh) * 100)
    # foot-skate: ground-frame speed of the ankle joint on frames where the sole is on the ground
    # (flat foot: the lower half of the sole vertices (the bottom layer) all within 1.5 cm of the ground).  Ground frame = in-place frame + the clip's own walking speed.
    slide, nst, hov = [], {}, []
    for s in 'LR':
        sel = left if s == 'L' else ~left
        az, lo, flat_ = [], [], []
        for k in range(T):
            G_, P_ = fk_world(heads, parents, names, clip['rot'][k], clip['root'][k])
            az.append(P_['foot.' + s][2] + clip['speed'] * k * dt)
            Qy = lbs(soles['V'][sel], soles['J'][sel], soles['W'][sel], heads, parents, names, clip['rot'][k], clip['root'][k])[:, 1]
            lo.append(Qy.min()); flat_.append(np.percentile(Qy, 45) < 0.015)
        az, lo = np.array(az), np.array(lo)
        v = np.gradient(az, dt)
        stance = np.array(flat_) & (lo < 0.02)         # whole sole (90th percentile) within 1.5 cm of the ground = flat foot
        slide += list(np.abs(v[stance]))
        hov += list(lo[stance] * 100)
        nst[s] = int(stance.sum())
    res['stance_frames_sole_on_ground'] = nst
    res['foot_slide_mean_cm_s'] = float(np.mean(slide) * 100)
    res['foot_slide_p90_cm_s'] = float(np.percentile(slide, 90) * 100)
    res['foot_slide_rel_to_walk_speed'] = float(np.mean(slide) / clip['speed'])
    res['stance_sole_height_above_ground_cm_mean'] = float(np.mean(hov))
    res['stance_sole_height_above_ground_cm_min'] = float(np.min(hov))
    res['stance_sole_height_above_ground_cm_max'] = float(np.max(hov))
    q = clip['rot']

    def pd(a, b):
        return float(np.mean([np.linalg.norm((R.from_quat(a[i]).inv() * R.from_quat(b[i])).as_rotvec()) for i in range(len(a))]))
    typ = np.mean([pd(q[k], q[k + 1]) for k in range(T - 1)])
    res['loop_seam_rot_delta_deg'] = float(np.degrees(pd(q[-1], q[0])))
    res['typical_frame_delta_deg'] = float(np.degrees(typ))
    res['triangles'] = int(sum(len(p['F']) for p in pr['parts']))
    res['parts'] = len(pr['parts'])
    if out_json:
        json.dump(res, open(out_json, 'w'), indent=1)
    return res


if __name__ == '__main__':
    r = run(out_json=sys.argv[1] if len(sys.argv) > 1 else None)
    print(json.dumps(r, indent=1))
