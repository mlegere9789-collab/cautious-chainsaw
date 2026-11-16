#!/usr/bin/env python3
"""For every gate Q01..Q28: its key input paths (files and folders named in section 4 of GATE-SPEC-B.md under "Inputs present" and "Already checked"),
the last commit that touched each, and whether anything under it changed after the last edit of the fifth pass (BASE, the checkpoint commit that holds
the fifth pass's file) or is modified in the working tree now.  Read-only (git log, git diff, git status); writes nothing.

    python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass6/inputs_delta.py [BASE]      prints one TSV table and a per-gate summary

Method, so the statement "unchanged since the fourth pass" is recomputable and not a reading of modification times:
  changed_since_base = `git diff --name-only BASE HEAD -- <path>` is not empty (committed change), or `git status --porcelain -- <path>` is not empty (working tree).
A path that does not exist is printed as ABSENT.
"""
import subprocess, sys, os, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 6)))
BASE = sys.argv[1] if len(sys.argv) > 1 else '52261939'
BT = 'docs/battle-theatre/'
G = BT + 'GOVERNANCE/'
A = BT + 'app/'
T = A + 'tests/'

INPUTS = {
    'Q01': [BT + 'kit/verified_oob.json', 'tools/bt/gates/q01_oob.py', 'tools/bt/gates/q01_layer.mjs', 'tools/bt/gates/oobgates_common.py', 'tools/bt/gates/oob_layer_lib.mjs', 'tests/governance/gates/test_q01.py', G + 'gate_results/Q01.json', BT + 'history/units.json', BT + 'history/arrivals.json', BT + 'history/not_on_field.json', BT + 'kit/kit_specs.json', BT + 'kit/artillery_batteries.json',
            BT + 'kit/cavalry_units.json', BT + 'kit/weapons.json', BT + 'kit/evidence', BT + 'kit/overrides', BT + 'history/undrawn/roster-gaps.json',
            'tools/bt/check_arrivals.py', 'tools/bt/kit_verified.py', 'tools/bt/kit_evidence_check.py', A + 'data/kit-crosswalk.json', T + 'history.test.mjs'],
    'Q02': ['tools/bt/gates/q02_provenance.py', 'tools/bt/gates/q02_layer.mjs', 'tools/bt/gates/datum_classes.json', 'tools/bt/gates/lib', 'tests/governance/gates/test_q02.py', G + 'gate_results/Q02.json', 'tools/bt/validate_provenance.py', A + 'src/history/contract.mjs', A + 'data-contract.md', BT + 'history/positions', G + 'timeline_verified.jsonl',
            G + 'conflicts_structured.json', BT + 'history/undrawn', A + 'src/history/real.mjs'],
    'Q03': ['tools/bt/gates/q03_anachronism.py', 'tools/bt/gates/q03_structures.py', 'tools/bt/gates/q03_scene.mjs', 'tools/bt/gates/q03_flags.json', 'tests/governance/gates/test_q03.py', 'tests/governance/gates/test_q03_scene.py', 'tools/bt/check_kit.py', 'tools/bt/check_figures.py', A + 'data/figures-validation.json', BT + 'kit', A + 'src/ext', A + 'data/site-memorials.json',
            A + 'data/site-memorial-years.json', A + 'data/structures3d.json', A + 'src/figures3d', T + 'manifest.test.mjs', T + 'ext-monuments.test.mjs'],
    'Q04': ['tools/bt/gates/q04_arrival.py', 'tools/bt/gates/q04_arrival.mjs', 'tools/bt/gates/q456_lib.mjs', 'tests/governance/gates/test_q04.py', 'tools/bt/check_arrivals.py', BT + 'sim', A + 'src/history', A + 'src/stage.mjs', BT + 'history/arrivals.json', T + 'arrival.spec.mjs', T + 'history.test.mjs'],
    'Q05': ['tools/bt/gates/q05_speed.py', 'tools/bt/gates/q05_speed.mjs', 'tests/governance/gates/test_q05.py', A + 'src/history', A + 'src/stage.mjs', A + 'src/config.mjs', BT + 'sim', T + 'history.test.mjs', T + 'daypos.test.mjs', T + 'unit.test.mjs'],
    'Q06': ['tools/bt/gates/q06_path.py', 'tools/bt/gates/q06_path.mjs', 'tests/governance/gates/test_q06.py', A + 'src/history', BT + 'history/undrawn', BT + 'history/undrawn/status.json', A + 'data/placement.json', A + 'data/sibling-approach.json', T + 'sibling.test.mjs'],
    'Q07': [BT + 'structures', 'tools/bt/check_structures.py', A + 'data/structures3d.json', T + 'structures3d.test.mjs', T + 'structures-ws6.test.mjs', T + 'structures3d.spec.mjs',
            G + 'evidence_corrections/fence-1.jsonl', G + 'evidence_corrections/fence-2.jsonl', G + 'evidence_corrections/fence-3.jsonl'],
    'Q08': [BT + 'structures/structures.json', BT + 'structures/works_stages.json', A + 'data/works3d.json', 'tools/bt/check_structures.py', T + 'structures-ws6.test.mjs',
            G + 'evidence_corrections/fence-1.jsonl', G + 'evidence_corrections/terrain-1.jsonl', G + 'evidence_corrections/terrain-2.jsonl', BT + 'life'],
    'Q09': [BT + 'structures/state_schedule.json', BT + 'structures/hospitals.json', A + 'data/fx3d/fires.json', 'tools/bt/check_structures.py', BT + 'town', T + 'fx3d.test.mjs'],
    'Q10': [T + 'sky.spec.mjs', A + 'src/config.mjs', A + 'src/weather3d', A + 'src/fx3d', BT + 'environment', 'tools/bt/check_environment.py', T + 'weather3d.test.mjs',
            T + 'weather3d-gpu.test.mjs', T + 'weather3d-gpu-check.mjs', A + 'tests/results/weather3d-webgpu', A + 'docs/GATE-HOOKS.md'],
    'Q11': [BT + 'environment', 'tools/bt/ephemeris.py', 'tools/bt/check_environment.py', A + 'src/astro.mjs'],
    'Q12': [BT + 'sim', T + 'scrub.spec.mjs', T + 'casualties.spec.mjs', T + 'lib.mjs', A + 'tests/results/sw-round-1', A + 'tests/results/SW-STATUS.md', 'tools/bt/check_structures.py', T + 'unit.test.mjs'],
    'Q13': [A + 'src/audio3d', A + 'src/audio-host.mjs', A + 'data/audio3d', T + 'audio3d.test.mjs', T + 'audio-host.test.mjs', T + 'audio3d-round2.test.mjs', BT + 'environment/weather_timeline.json'],
    'Q14': [BT + 'kit/verified_batteries.json', 'tools/bt/gates/q14_ordnance.py', 'tools/bt/gates/q14_layer.mjs', 'tests/governance/gates/test_q14.py', G + 'gate_results/Q14.json', BT + 'kit/artillery_batteries.json', BT + 'kit/KIT-NOTES.md', BT + 'drill', 'tools/bt/drill_check.py', A + 'data/battery-guns.json', A + 'data/artillery-train.json',
            T + 'structures-ws6.test.mjs', T + 'fx3d.test.mjs', T + 'anim3d.test.mjs'],
    'Q15': [T + 'perf.spec.mjs', T + 'lib.mjs', G + 'hardware_profile.json', T + 'structures3d.spec.mjs', 'tools/accept/thresholds.json'],
    'Q16': ['tools/bt/photomatch', T + 'photomatch-q16.test.mjs', 'tests/photomatch.test.mjs', A + 'docs/PHOTOMATCH.md', G + 'evidence_corrections/web-photomatch.jsonl'],
    'Q17': ['tools/bt/realize', G + 'realizations', 'tools/bt/check_coverage.py', 'tests/governance', G + 'timeline_seed.jsonl', G + 'timeline_verified.jsonl', G + 'timeline_windows.jsonl',
            G + 'timeline_corrections', G + 'epilogue_seed.jsonl', G + 'register_index.json'],
    'Q18': [G + 'requirements.json', 'tools/bt/check_governance.py', 'tools/bt/check_coverage.py', 'tools/bt/link_subreqs.py', 'tools/bt/register_from_proposed.py', G + 'register_index.json',
            G + 'register_aliases.json', G + 'subreq_links.json'],
    'Q19': ['tools/bt/gates/q19_claims.py', 'tests/governance/gates/test_q19.py', G + 'gate_results/Q19.json', G + 'claim_ledger.json', BT + 'history/positions', A + 'tools/claim-ledger.mjs', G + 'conflict_register.json', G + 'conflicts_structured.json', G + 'decisions/conflict_defaults.json',
            BT + 'library/or27_claim_checks.json', T + 'claims.test.mjs', T + 'scenario-defaults.test.mjs', BT + 'fidelity/tools/check_quotes.py'],
    'Q20': ['tools/bt/gates/q20_cavalry.py', 'tools/bt/gates/q20_layer.mjs', 'tests/governance/gates/test_q20.py', G + 'gate_results/Q20.json', BT + 'kit/cavalry_action_table.json', BT + 'kit/cavalry_units.json', A + 'data/cavalry-horses.json', A + 'src/history/cavalry.mjs', T + 'cavalry-ws10.test.mjs', 'tools/bt/check_kit.py'],
    'Q21': [A + 'src/ext/vegetation', A + 'data/vegetation.json', 'tools/bt/vegetation', T + 'vegetation.test.mjs', T + 'vegetation-shell.test.mjs', T + 'vegetation-scene.test.mjs',
            T + 'vegetation-wind.test.mjs', T + 'vegetation-browser.mjs', A + 'docs/VEGETATION-NOTES.md', G + 'evidence_corrections/web-nps-landscape.jsonl'],
    'Q22': [BT + 'environment/weather_timeline.json', 'tools/bt/check_environment.py', A + 'src/weather3d', A + 'src/environment.mjs', T + 'weather3d.test.mjs', T + 'weather3d-gpu.test.mjs',
            A + 'docs/BROWSER-VERIFICATION-LIST-WEATHER.md', A + 'docs/WEATHER3D-WEBGPU-NOTES.md', A + 'docs/GATE-HOOKS.md'],
    'Q23': ['tools/bt/gates/q23_marking.py', 'tools/bt/gates/q23_app.mjs', 'tools/bt/gates/content_classes.json', 'tests/governance/gates/test_q23.py', 'tests/governance/gates/test_q23_app.py', G + 'gate_results/Q23.json', G + 'register_index.json', G + 'register', 'tools/bt/check_coverage.py', A + 'src/ui/extensions.mjs', A + 'docs/GATE-HOOKS.md', A + 'src/config.mjs', A + 'src/overlay.mjs', T + 'ext-loader.test.mjs'],
    'Q24': [A + 'tests/results', 'tools/accept/lib/imgdiff.mjs', 'tools/accept/thresholds.json', A + 'tests/weather3d-shots.mjs'],
    'Q25': ['tools/bt/gates/q25_library.py', 'tools/bt/gates/lib/acquisition_list.json', 'tests/governance/gates/test_q25.py', G + 'gate_results/Q25.json', G + 'library', BT + 'terrain/terrain_sources.json', 'tools/bt/terrain_check.py', T + 'audio3d.test.mjs'],
    'Q26': [A + 'data/casualty-flow.json', BT + 'structures/hospitals.json', A + 'data/casualty-sources.json', A + 'data/engagements.json', BT + 'medical', 'tools/bt/medical', T + 'medical-evidence.test.mjs',
            T + 'casualties.test.mjs', T + 'casualties.spec.mjs'],
    'Q27': [G + 'budget'],
    'Q28': [G + 'epilogue_seed.jsonl', G + 'conflict_register.json', A + 'src/clock.mjs', BT + 'environment/ephemeris_1863.json', G + 'evidence_corrections/web-newspapers.jsonl'],
}


def git(*args):
    return subprocess.run(['git', '-C', ROOT] + list(args), capture_output=True, text=True, encoding='utf-8').stdout


head = git('rev-parse', '--short', 'HEAD').strip()
print('# BASE %s HEAD %s checked %s UTC' % (BASE, head, subprocess.run(['date', '-u', '+%FT%TZ'], capture_output=True, text=True).stdout.strip()))
print('gate\tpath\tstatus\tlast_commit\tchanged_since_base\tfiles_changed_since_base\tdirty_in_working_tree')
summary = collections.OrderedDict()
for g, paths in INPUTS.items():
    changed_any = []
    for p in paths:
        full = os.path.join(ROOT, p)
        if not os.path.exists(full):
            print('%s\t%s\tABSENT\t-\t-\t0\t0' % (g, p)); continue
        last = git('log', '-1', '--format=%h %cd', '--date=format:%m-%d %H:%M', '--', p).strip() or '(untracked)'
        ch = [x for x in git('diff', '--name-only', BASE, 'HEAD', '--', p).splitlines() if x.strip()]
        dirty = [x for x in git('status', '--porcelain', '--', p).splitlines() if x.strip()]
        flag = 'CHANGED' if (ch or dirty) else 'same'
        if ch or dirty: changed_any.append(p)
        print('%s\t%s\tpresent\t%s\t%s\t%d\t%d' % (g, p, last, flag, len(ch), len(dirty)))
    summary[g] = (len(paths), changed_any)
print()
print('# per gate: inputs listed, inputs changed since BASE (committed or dirty)')
for g, (n, ch) in summary.items():
    print('%s\t%d\t%d\t%s' % (g, n, len(ch), '; '.join(c.replace(BT, '') for c in ch)))
