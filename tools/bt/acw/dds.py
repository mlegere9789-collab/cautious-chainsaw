"""DDS reader: DXT1/DXT3/DXT5 and uncompressed 24/32 bpp -> numpy RGBA8 of mip level 0 (verified by eye on the Napoleon unit atlases)."""
import struct, numpy as np

def _exp565(c):
    return np.stack([((c >> 11) & 31) * 255 // 31, ((c >> 5) & 63) * 255 // 63, (c & 31) * 255 // 31], -1).astype(np.int32)

def _colour_blocks(blk, dxt1):
    c0 = blk[:, 0].astype(np.uint32) | (blk[:, 1].astype(np.uint32) << 8); c1 = blk[:, 2].astype(np.uint32) | (blk[:, 3].astype(np.uint32) << 8)
    p0, p1 = _exp565(c0), _exp565(c1); pal = np.zeros((len(blk), 4, 4), np.int32); pal[..., 3] = 255
    pal[:, 0, :3] = p0; pal[:, 1, :3] = p1; four = (c0 > c1) | (not dxt1)
    pal[:, 2, :3] = np.where(four[:, None], (2 * p0 + p1) // 3, (p0 + p1) // 2); pal[:, 3, :3] = np.where(four[:, None], (p0 + 2 * p1) // 3, 0)
    if dxt1: pal[:, 3, 3] = np.where(four, 255, 0)
    bits = sum(blk[:, 4 + i].astype(np.uint32) << (8 * i) for i in range(4))
    idx = np.stack([(bits >> (2 * i)) & 3 for i in range(16)], 1)
    return np.take_along_axis(pal, idx[:, :, None].repeat(4, 2), 1).astype(np.uint8)

def _alpha5(blk):
    a0, a1 = blk[:, 0].astype(np.int32), blk[:, 1].astype(np.int32); pal = np.zeros((len(blk), 8), np.int32); pal[:, 0] = a0; pal[:, 1] = a1; gt = a0 > a1
    for i in range(2, 8): pal[:, i] = np.where(gt, ((8 - i) * a0 + (i - 1) * a1) // 7, np.where(i < 6, ((6 - i) * a0 + (i - 1) * a1) // 5, np.where(i == 6, 0, 255)))
    bits = np.zeros(len(blk), np.uint64)
    for i in range(6): bits |= blk[:, 2 + i].astype(np.uint64) << np.uint64(8 * i)
    idx = np.stack([((bits >> np.uint64(3 * i)) & np.uint64(7)).astype(np.int64) for i in range(16)], 1)
    return np.take_along_axis(pal, idx, 1)

def _alpha3(blk):
    out = np.zeros((len(blk), 16), np.int32)
    for i in range(8): out[:, 2 * i] = (blk[:, i] & 15) * 17; out[:, 2 * i + 1] = (blk[:, i] >> 4) * 17
    return out

def read_dds(path):
    d = open(path, 'rb').read()
    if d[:4] != b'DDS ': raise ValueError('not a DDS file')
    h = struct.unpack_from('<31I', d, 4); H, W, mips = h[2], h[3], h[6]; pf = h[18:26]; bpp, rm, gm, bm, am = pf[2], pf[3], pf[4], pf[5], pf[6]
    fc = d[84:88]; data = d[128:]
    if fc == b'DX10': raise ValueError('DX10 header unsupported')
    bw, bh = (W + 3) // 4, (H + 3) // 4
    if fc in (b'DXT1', b'DXT3', b'DXT5'):
        bs = 8 if fc == b'DXT1' else 16; raw = np.frombuffer(data[:bw * bh * bs], np.uint8).reshape(-1, bs)
        if fc == b'DXT1': px = _colour_blocks(raw, True)
        else:
            px = _colour_blocks(raw[:, 8:], False); px[:, :, 3] = (_alpha5(raw[:, :8]) if fc == b'DXT5' else _alpha3(raw[:, :8])).astype(np.uint8)
        return px.reshape(bh, bw, 4, 4, 4).transpose(0, 2, 1, 3, 4).reshape(bh * 4, bw * 4, 4)[:H, :W], dict(w=W, h=H, mips=mips, fmt=fc.decode())
    if bpp in (24, 32) and rm:
        n = bpp // 8; a = np.frombuffer(data[:W * H * n], np.uint8).reshape(H, W, n); out = np.zeros((H, W, 4), np.uint8); out[..., 3] = 255
        for k, mask in enumerate((rm, gm, bm)): out[..., k] = a[..., ((mask & -mask).bit_length() - 1) // 8]
        if am and n == 4: out[..., 3] = a[..., ((am & -am).bit_length() - 1) // 8]
        return out, dict(w=W, h=H, mips=mips, fmt='RGBA%d' % bpp)
    raise ValueError('unsupported DDS %r bpp=%d' % (fc, bpp))
