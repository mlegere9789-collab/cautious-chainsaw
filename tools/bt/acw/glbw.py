"""Minimal glTF 2.0 binary writer (numpy): meshes with POSITION/NORMAL/TEXCOORD_0/JOINTS_0/WEIGHTS_0, skin, images (png/webp)."""
import json,struct,numpy as np
class GLB:
    def __init__(s): s.bin=bytearray(); s.bv=[]; s.acc=[]; s.j={'asset':{'version':'2.0','generator':'bt-acw-converter'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[],'textures':[],'images':[],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],'skins':[],'extensionsUsed':[]}
    def _view(s,data,target=None):
        while len(s.bin)%4: s.bin.append(0)
        o=len(s.bin); s.bin+=data; bv={'buffer':0,'byteOffset':o,'byteLength':len(data)}
        if target: bv['target']=target
        s.bv.append(bv); return len(s.bv)-1
    def accessor(s,arr,ctype,typ,target=None,minmax=False):
        arr=np.ascontiguousarray(arr); v=s._view(arr.tobytes(),target)
        a={'bufferView':v,'componentType':ctype,'count':int(len(arr)),'type':typ}
        if minmax: a['min']=arr.min(0).astype(float).tolist(); a['max']=arr.max(0).astype(float).tolist()
        s.acc.append(a); return len(s.acc)-1
    def image(s,data,mime):
        v=s._view(data); s.j['images'].append({'bufferView':v,'mimeType':mime})
        if mime=='image/webp' and 'EXT_texture_webp' not in s.j['extensionsUsed']: s.j['extensionsUsed'].append('EXT_texture_webp')
        return len(s.j['images'])-1
    def texture(s,img,mime):
        if mime=='image/webp': s.j['textures'].append({'sampler':0,'extensions':{'EXT_texture_webp':{'source':img}}})
        else: s.j['textures'].append({'sampler':0,'source':img})
        return len(s.j['textures'])-1
    def pack(s):
        j=dict(s.j); j['bufferViews']=s.bv; j['accessors']=s.acc; j['buffers']=[{'byteLength':len(s.bin)}]
        for k in list(j):
            if j[k]==[] : del j[k]
        js=json.dumps(j,separators=(',',':')).encode()
        while len(js)%4: js+=b' '
        b=bytes(s.bin)
        while len(b)%4: b+=b'\0'
        return struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(b))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(b),0x004E4942)+b
