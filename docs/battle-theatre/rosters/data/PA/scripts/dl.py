import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C
for spec in sys.argv[1:]:
    ident, suffix = spec.split(':')
    p = C.fetch('https://archive.org/download/%s/%s_%s' % (ident, ident, suffix), '%s/%s_%s' % (ident, ident, suffix))
    print(spec, p, os.path.getsize(p) if p else None, flush=True)
    if p: C.progress('fetched %s_%s (%d bytes)' % (ident, suffix, os.path.getsize(p)))
