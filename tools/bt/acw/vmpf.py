"""Napoleon TW variant_part_mesh ('VMPF') reader (empirical; verified by exact section-sum chaining on 68 of 70 parts).
  u32 'VMPF', u32 0, u32 1, u32 fmt, u32 nLod, u32 totalVerts, u32 totalIdx, then LOD sections. The first section's (vc, ic) sit in the header (u32 [9],[10]); each later
  section starts with an inline u32 vc, u32 ic. Section = vc * 40-byte vertices, then ic u16 indices (section-local). The sections are descending LODs (e.g. torso 646/539/432/325 verts).
  Vertex (40 B): half x,y,z (position in the slot bone's local frame), half u | half x,y,z, half v | 4 B | 4 B | 4 B packed | 4 B | 4 B (normal/tangent/bone data NOT decoded).
  VERIFIED: UV = (half[3], half[7]) against the texture islands of torso variants; kepi and belt positions place on bone 19 / bone 10 of the Napoleon man skeleton (pb is in the pelvis frame).
  NOT VERIFIED: bone binding of torso and legs parts (the 2-bone residual is 0.2-0.4 m), so those are not placed (see EG-FIG-0012)."""
import struct
import numpy as np

def parse(b):
    if b[:4] != b'VMPF': raise ValueError('magic')
    h = struct.unpack_from('<11I', b, 0); tv, ti = h[5], h[6]; vc, ic = h[9], h[10]; o = 44; secs = []; sv = si = 0
    while True:
        if o + vc * 40 + ic * 2 > len(b): raise ValueError('overrun')
        V = np.frombuffer(b, np.uint8, vc * 40, o).reshape(vc, 40); o += vc * 40; I = np.frombuffer(b, np.uint16, ic, o); o += ic * 2
        secs.append((V, I)); sv += vc; si += ic
        if sv == tv and si == ti: break
        if sv > tv or si > ti: raise ValueError('sum mismatch')
        vc, ic = struct.unpack_from('<2I', b, o); o += 8
    return dict(header=h, sections=secs, tail_off=o, tail=b[o:])

def decode_vertices(V):
    H = np.ascontiguousarray(V).view('<f2')
    return H[:, 0:3].astype(np.float32), H[:, 4:7].astype(np.float32), np.stack([H[:, 3], H[:, 7]], 1).astype(np.float32), V[:, 16:20], H[:, 10:12].astype(np.float32)
