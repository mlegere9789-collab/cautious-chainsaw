"""Thin wrapper over tools/bt/or27_find.py: prints citation + context for a regex (usage: orq.py REGEX [context_chars] [max] [part] [recordfilter])."""
import sys, json, subprocess, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
pat = sys.argv[1]; C = sys.argv[2] if len(sys.argv) > 2 else '400'; M = sys.argv[3] if len(sys.argv) > 3 else '40'
part = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != '-' else None; rf = sys.argv[5] if len(sys.argv) > 5 else None
cmd = [sys.executable, '-I', os.path.join(ROOT, 'tools', 'bt', 'or27_find.py'), pat, '-C', C, '--max', M, '--json'] + (['--part', part] if part else [])
out = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', env={**os.environ, 'PYTHONIOENCODING': 'utf-8'}).stdout
d = json.loads(out); n = 0
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
for h in d:
    if rf and not re.search(rf, str(h['record']) + ' ' + str(h['who'])): continue
    n += 1; print(f"[{h['record']} p{h['page']} | {h['who']}]\n  ...{h['context']}...\n")
print(n, 'hits shown of', len(d))
