#!/usr/bin/env python3
"""Zero-token gain pipeline. Run after any lane task that changed evidence, and at least once a day:

    python3 -I tools/horde/after_task.py --cost <usd>

1. rebuild the derived tables from the evidence on disk (tools/bt/kit_verified.py build: verified_oob.json, verified_batteries.json);
2. re-run every light gate runner with the command stored in its own result file (a runner that fails is reported, never skipped silently);
3. append a scoreboard line (tools/horde/scoreboard.py) and print the change.
Only the runners set results; nothing here edits a pass flag."""
import glob, json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GR = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'gate_results')


def run(cmd, timeout):
    t = time.time()
    try:
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
        return r.returncode, (r.stdout + r.stderr).strip().splitlines()[-1:] or [''], round(time.time() - t, 1)
    except subprocess.TimeoutExpired:
        return 124, ['timeout'], round(time.time() - t, 1)


def main():
    cost = sys.argv[sys.argv.index('--cost') + 1] if '--cost' in sys.argv else None
    rc, tail, sec = run([sys.executable, '-I', 'tools/bt/kit_verified.py', 'build'], 600)
    print('kit_verified build: exit %d (%.0fs) %s' % (rc, sec, tail[0][:160]))
    for f in sorted(glob.glob(os.path.join(GR, 'Q*.json'))):
        if f.endswith('.prev.json'):
            continue
        try:
            d = json.load(open(f, encoding='utf-8'))
        except Exception:
            continue
        cmd = d.get('command')
        if not isinstance(cmd, str) or not cmd.startswith('python3 '):
            print('%s: no stored python command, not re-run' % os.path.basename(f))
            continue
        argv = [sys.executable, '-I'] + cmd.split()[1:]
        rc, tail, sec = run(argv, 900)
        print('%s: exit %d (%.0fs) %s' % (d.get('gate', os.path.basename(f)), rc, sec, tail[0][:170]))
    args = [sys.executable, '-I', 'tools/horde/scoreboard.py'] + (['--cost', cost] if cost else []) + ['--note', 'after_task pipeline']
    r = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    try:
        d = json.loads(r.stdout)
        print('gate items', d['bt']['gate_items'])
        print('vs last line', d.get('vs_last_line'))
        print('vs previous day', d.get('vs_previous_day'))
    except Exception:
        print(r.stdout[-500:], r.stderr[-300:])
    return r.returncode


if __name__ == '__main__':
    sys.exit(main())
