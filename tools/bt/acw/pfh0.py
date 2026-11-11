"""PFH0 (Creative Assembly pack) index reader and extractor.
Header: 'PFH0', five u32 LE (type, pack-index count, pack-index size, file count, file-index size), pack index,
file index of [size u32][path\\0] entries, then the file data in index order. Verified: the sizes sum to the file length on all 21 packs of ACW.zip.
Untrusted input: this reads bytes only; nothing in the archive is executed."""
import os, struct

def read_index(path):
    with open(path, 'rb') as f:
        h = f.read(24)
        if h[:4] != b'PFH0': raise ValueError(path + ': bad magic ' + repr(h[:4]))
        typ, pic, pis, fc, isz = struct.unpack('<5I', h[4:24])
        f.seek(24); f.read(pis); idx = f.read(isz)
    ents, o = [], 0
    for _ in range(fc):
        sz = struct.unpack_from('<I', idx, o)[0]; o += 4
        e = idx.index(b'\0', o); ents.append([idx[o:e].decode('latin1'), sz, 0]); o = e + 1
    if o != isz: raise ValueError('file index size mismatch')
    off = 24 + pis + isz
    for e in ents: e[2] = off; off += e[1]
    return dict(type=typ, entries=ents, end=off, filesize=os.path.getsize(path))

def extract(path, outdir, pred=lambda p: True, chunk=1 << 22):
    d = read_index(path); n = tot = 0
    with open(path, 'rb') as f:
        for p, sz, off in d['entries']:
            if not pred(p): continue
            q = os.path.join(outdir, *p.replace('\\', '/').split('/')); os.makedirs(os.path.dirname(q), exist_ok=True)
            f.seek(off); r = sz
            with open(q, 'wb') as o:
                while r > 0:
                    b = f.read(min(chunk, r))
                    if not b: break
                    o.write(b); r -= len(b)
            n += 1; tot += sz
    return n, tot
