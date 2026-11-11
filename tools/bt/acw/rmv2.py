"""Napoleon TW rigid_model / animatable_rigid_model header and material scan (version 1..17, magic 0x12345678 at byte 4).
Geometry of these files is NOT decoded here (layout differs per version; no public layout was available offline): this module only reads the version, the shader/texture names
(UTF-16 strings) and the byte-identity of the parts, which is what the licence classification needs. See EG-FIG-0012."""
import re, struct

def scan(b):
    if len(b) < 12 or struct.unpack_from('<I', b, 4)[0] != 0x12345678: raise ValueError('not a rigid model')
    ver = struct.unpack_from('<I', b, 0)[0]; lods = struct.unpack_from('<I', b, 8)[0]
    strings = [m.group().decode('utf-16le') for m in re.finditer(rb'(?:[\x20-\x7e]\x00){4,}', b)]
    tex = sorted({s for s in strings if re.search(r'_(diffuse|normal|gloss_map|mask)$|^tex|\.dds$', s)})
    return dict(version=ver, lod_field=lods, texture_names=tex)
