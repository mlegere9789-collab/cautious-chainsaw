"""Napoleon TW variant_weighted_mesh (magic 0x12345678, v1) reader (empirical; chains to the exact end of file on 86 of 87 files).
Layout (empirical, verified by exact EOF chaining on all files):
 u32 magic 0x12345678, u32 version, u32 nparam, nparam*[u16 len, UTF-16 name, value block] ... (shader param table, skipped by scanning to the mesh table at 0x1d8
 mesh table: u32 n; n*[u16 len, UTF-16 name, u32 vcount, u32 icount]
 per mesh: u32 vcount; vcount * vertex; u32 icount; icount*u32 index
 vertex: uv(2f) normal(3f) tangent(3f) u32 ninfl, ninfl*[u32 bone, pos_local(3f), vec_local(3f), weight f], 4*u32 zero pad. ninfl is 1 or 2 in all 86 files.
 The per-influence 3f after the position is NOT a rigid image of the model-space normal (tested), so it is not used. The bone-local positions ARE exactly rigid:
 two-influence vertices give the relative transform of two bone frames (fit error 3e-7 m over all files), which bindpose.py chains into the rest pose.
 euro_equipment.variant_weighted_mesh has no mesh table of this form and is not decoded.
"""
import struct,hashlib
def find_table(b):
    for o in range(12,min(len(b),4000)-6):
        n=struct.unpack_from('<I',b,o)[0]
        if 1<=n<=40:
            p=o+4;ok=True;names=[]
            for i in range(n):
                if p+2>len(b):ok=False;break
                l=struct.unpack_from('<H',b,p)[0]
                if not(3<=l<=80) or p+2+2*l+8>len(b):ok=False;break
                raw=b[p+2:p+2+2*l]
                if any(raw[k]!=0 for k in range(1,len(raw),2)) or not all(32<=raw[k]<127 for k in range(0,len(raw),2)):ok=False;break
                names.append((raw[::2].decode(),)+struct.unpack_from('<II',b,p+2+2*l));p+=2+2*l+8
            if ok: return o,names,p
    return None
def parse(b):
    if b[:4]!=b'xV4\x12': raise ValueError('magic')
    ver=struct.unpack_from('<I',b,4)[0]
    t=find_table(b)
    if not t: raise ValueError('no mesh table')
    o0,names,o=t
    meshes=[]
    for (nm,vc,ic) in names:
        n=struct.unpack_from('<I',b,o)[0]; 
        if n!=vc: raise ValueError('vcount %s %d %d'%(nm,n,vc))
        o+=4; vs=o
        V=[]
        for i in range(n):
            uv=struct.unpack_from('<2f',b,o); nr=struct.unpack_from('<3f',b,o+8); tg=struct.unpack_from('<3f',b,o+20)
            k=struct.unpack_from('<I',b,o+32)[0]
            if k>8: raise ValueError('infl count %d'%k)
            infl=[]
            p=o+36
            for j in range(k):
                bi=struct.unpack_from('<I',b,p)[0]; pos=struct.unpack_from('<3f',b,p+4); nl=struct.unpack_from('<3f',b,p+16); w=struct.unpack_from('<f',b,p+28)[0]
                infl.append((bi,pos,nl,w)); p+=32
            o=p+16
            V.append((uv,nr,tg,infl))
        vh=hashlib.sha256(b[vs:o]).hexdigest()
        m=struct.unpack_from('<I',b,o)[0]
        if m!=ic: raise ValueError('icount %s %d %d'%(nm,m,ic))
        o+=4; I=struct.unpack_from('<%dI'%m,b,o); o+=4*m
        if I and max(I)>=n: raise ValueError('index oob')
        meshes.append(dict(name=nm,verts=V,idx=I,vhash=vh))
    return dict(version=ver,table_off=o0,meshes=meshes,tail=b[o:],tail_off=o)
