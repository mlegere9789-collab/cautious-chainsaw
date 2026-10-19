"""What-if: how far the expected fidelity (aligned, standard tier) rises if the evidence improves. Scenarios scale the pilot's own uncertainties:
sigma_m of every waypoint (position evidence: Bachelder/NPS tablets georeferenced) and the timing constants (clock evidence: diaries, letters, second regimental accounts).
usage: python whatif.py -> results/whatif.json  (about 1 min)"""
import copy, importlib, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(BASE, 'pilot'))
import pilot_lib as L
D = importlib.import_module('defs_passA')
rw = {u: L.resolve(D.WP[u]) for u in D.ORDER}
SC = [m for m in L.MINUTES if m < L.T0 + 60]
def run(sig_scale, floor, sd_group, kappa, onset, slack, K=250):
    out = {}
    for u in D.ORDER:
        r = copy.deepcopy(rw[u])
        for w in r: w['sigma_m'] = max(floor, w['sigma_m'] * sig_scale)
        out[u] = L.mc_aligned(r, sd_group=sd_group, slack=slack, K=K, seed=5, kappa=kappa, onset_sd=onset)
    f = lambda tier, us=D.ORDER: round(sum(out[u][tier][m] for u in us for m in SC) / (len(us) * len(SC)), 4)
    return dict(strict=f('strict'), standard=f('standard'), loose=f('loose'),
                standard_U=f('standard', [u for u in D.ORDER if u[0] == 'U']), standard_C=f('standard', [u for u in D.ORDER if u[0] == 'C']),
                share_ge97_standard=round(sum(out[u]['standard'][m] >= 0.97 for u in D.ORDER for m in SC) / (len(D.ORDER) * len(SC)), 4))
SCEN = {
 'S0 pilot as derived (aligned, slack 3)':                 dict(sig_scale=1.0, floor=0, sd_group=4.0, kappa=0.20, onset=3.0, slack=3),
 'S1 positions georeferenced (sigma x0.4, floor 25 m)':     dict(sig_scale=0.4, floor=25, sd_group=4.0, kappa=0.20, onset=3.0, slack=3),
 'S2 S1 + clocks tightened (group 2 min, kappa 0.10, onset 1.5)': dict(sig_scale=0.4, floor=25, sd_group=2.0, kappa=0.10, onset=1.5, slack=3),
 'S3 S2 with slack 2 min':                                 dict(sig_scale=0.4, floor=25, sd_group=2.0, kappa=0.10, onset=1.5, slack=2),
 'S4 ideal (sigma 25 m, group 1, kappa 0.05, onset 1, slack 2)': dict(sig_scale=0.0, floor=25, sd_group=1.0, kappa=0.05, onset=1.0, slack=2),
 'S5 ideal with slack 0':                                   dict(sig_scale=0.0, floor=25, sd_group=1.0, kappa=0.05, onset=1.0, slack=0),
}
res = {k: run(**v) for k, v in SCEN.items()}
json.dump(dict(note='Expected fidelity under the pilot uncertainty model; scenarios scale the model, they do not measure new evidence.', scenarios=res), open(os.path.join(BASE, 'results', 'whatif.json'), 'w'), indent=1)
for k, v in res.items(): print(k, v)
