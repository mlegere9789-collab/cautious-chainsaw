"""pg.py REGEX [--w 160] [--per 3] [--only SUBSTR[,SUBSTR]] [--skip SUBSTR[,SUBSTR]] [--max-files 40] [--root DIR]
Fast multi-file search with context: ripgrep selects the files (multiline, case-insensitive), then each file is read once, line-break
hyphenation and whitespace are normalised, and the first --per windows are printed. Skips caches, layout/raw duplicates and .pkl.
Whitespace in REGEX is matched across line breaks (every ' ' in the pattern becomes \\s+)."""
import re, sys, subprocess, os
ROOT = '/home/user/cautious-chainsaw/tmp/library'
a = sys.argv[1:]
rx = a[0]
def opt(name, default=None):
    return a[a.index(name) + 1] if name in a else default
w = int(opt('--w', 160)); per = int(opt('--per', 3)); maxf = int(opt('--max-files', 40))
only = [x for x in (opt('--only') or '').split(',') if x]
skip = [x for x in (opt('--skip') or '').split(',') if x]
root = opt('--root', ROOT)
rxm = '(?s)' + re.sub(r' ', r'\\s+', rx)
cmd = ['rg', '-U', '-i', '-l', '-g', '*.txt', '-g', '!*.layout.txt', '-g', '!*.raw.txt', '-g', '!cache/**', '-g', '!pkl', rxm, root]
out = subprocess.run(cmd, capture_output=True, text=True).stdout.split('\n')
files = [f for f in out if f]
if only:
    files = [f for f in files if any(o in f for o in only)]
if skip:
    files = [f for f in files if not any(s in f for s in skip)]
def norm(t):
    t = re.sub(r'(\w)-\s*\n\s*(?=[a-z])', r'\1', t)
    return re.sub(r'\s+', ' ', t)
reg = re.compile(rx, re.I | re.S)
print('# %d files match' % len(files))
for f in files[:maxf]:
    t = norm(open(f, encoding='utf-8', errors='replace', newline='').read())
    ms = list(reg.finditer(t))
    if not ms:
        ms = list(re.compile(rxm.replace(r'\s+', ' ').replace('(?s)',''), re.I | re.S).finditer(t))
    name = f.replace(ROOT + '/', '')
    print('=== %s : %d hits' % (name, len(ms)))
    for m in ms[:per]:
        s, e = max(0, m.start() - w), min(len(t), m.end() + w)
        print('   ...%s<<%s>>%s...' % (t[s:m.start()], m.group(0), t[m.end():e]))
if len(files) > maxf:
    print('# ... %d more files not shown' % (len(files) - maxf))
