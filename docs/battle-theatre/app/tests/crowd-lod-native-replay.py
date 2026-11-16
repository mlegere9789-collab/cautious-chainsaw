# Replay, on a REAL OpenGL ES 3.2 context (Mesa llvmpipe, software, through Xvfb and GLX; python standard library only), of the GL calls that the crowd's WebGL2 backend (src/crowd/gl.mjs, unchanged) made in node, recorded by
# tests/crowd-lod-native-record.mjs: the same textures, buffers, vertex arrays, programs (the GLSL of shaders-gl.mjs with the prototype's preamble), uniforms and draws, for the real layer at 13:30 on 3 July and a camera at several
# distances from the largest infantry unit, once with the cross-fade (the product) and once with the hard swap (band 0, hysteresis 0: the earlier behaviour). The prototype renderer's own work is replaced by the least the shaders need: its
# frame block (computed in node as GLRenderer.writeFU does), the soldier, unit and height tables on units 0..6, a flat sky, no ground, no shadow maps (every fragment lit), no fog texture, no post-processing. So a picture shows the
# FIGURES only, through the real shaders, with software GL; it is not the shell, and colour and light are not those of the product.
#   python3 -I docs/battle-theatre/app/tests/crowd-lod-native-replay.py <recordDir> <outDir> [--display :N]
# Writes <outDir>/<label>.png (the frame, tone mapped), <outDir>/montage-*.png, <outDir>/summary.json. Exit 0 when every frame was drawn without a GL error.
import os, sys, json, mmap, zlib, struct, math, subprocess, ctypes as C
import numpy as np                      # tone mapping and the crops of the montages only
HERE = os.path.dirname(os.path.abspath(__file__))
rec, outd = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); os.makedirs(outd, exist_ok=True)
def arg(k, d=None): return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
meta = json.load(open(os.path.join(rec, 'meta.json'))); ops = json.load(open(os.path.join(rec, 'ops.json'))); W, H, TW = meta['W'], meta['H'], meta['TW']
fblobs = open(os.path.join(rec, 'blobs.bin'), 'rb'); mm = mmap.mmap(fblobs.fileno(), 0, access=mmap.ACCESS_COPY); BASE = C.addressof(C.c_char.from_buffer(mm))
ptr = lambda r: C.c_void_p(BASE + r[0]) if r else None

# ---- display and context (as crowd-lod-glsl.py)
xv = None
if arg('--display'): os.environ['DISPLAY'] = arg('--display')
else:
    rfd, wfd = os.pipe(); xv = subprocess.Popen(['Xvfb', '-displayfd', str(wfd), '-nolisten', 'tcp', '-screen', '0', '320x240x24'], pass_fds=[wfd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); os.close(wfd); num = b''
    while not num.endswith(b'\n'):
        ch = os.read(rfd, 16)
        if not ch: print('Xvfb did not start'); sys.exit(2)
        num += ch
    os.environ['DISPLAY'] = ':' + num.decode().strip()
x11 = C.CDLL('libX11.so.6'); gl = C.CDLL('libGL.so.1'); x11.XOpenDisplay.restype = C.c_void_p; x11.XOpenDisplay.argtypes = [C.c_char_p]; x11.XDefaultScreen.argtypes = [C.c_void_p]
dpy = x11.XOpenDisplay(os.environ['DISPLAY'].encode()); scr = x11.XDefaultScreen(dpy)
gl.glXChooseFBConfig.restype = C.POINTER(C.c_void_p); gl.glXChooseFBConfig.argtypes = [C.c_void_p, C.c_int, C.POINTER(C.c_int), C.POINTER(C.c_int)]
n = C.c_int(); cfg = gl.glXChooseFBConfig(dpy, scr, (C.c_int * 11)(0x8010, 0x4, 0x8011, 1, 8, 8, 9, 8, 10, 8, 0), C.byref(n))
gl.glXCreatePbuffer.restype = C.c_ulong; gl.glXCreatePbuffer.argtypes = [C.c_void_p, C.c_void_p, C.POINTER(C.c_int)]; pb = gl.glXCreatePbuffer(dpy, cfg[0], (C.c_int * 5)(0x8041, 64, 0x8040, 64, 0))
gl.glXGetProcAddressARB.restype = C.c_void_p; gl.glXGetProcAddressARB.argtypes = [C.c_char_p]
mkctx = C.CFUNCTYPE(C.c_void_p, C.c_void_p, C.c_void_p, C.c_void_p, C.c_int, C.POINTER(C.c_int))(gl.glXGetProcAddressARB(b'glXCreateContextAttribsARB'))
ctx = mkctx(dpy, cfg[0], None, 1, (C.c_int * 7)(0x2091, 3, 0x2092, 0, 0x9126, 0x4, 0)); gl.glXMakeContextCurrent.argtypes = [C.c_void_p, C.c_ulong, C.c_ulong, C.c_void_p]; assert gl.glXMakeContextCurrent(dpy, pb, pb, ctx)
u32, i32, vp, cp, f32, i64 = C.c_uint, C.c_int, C.c_void_p, C.c_char_p, C.c_float, C.c_ssize_t
def F(name, rt, *at):
    a = gl.glXGetProcAddressARB(name.encode()); assert a, 'missing GL entry point ' + name; return C.CFUNCTYPE(rt, *at)(a)
G = {}
for name, rt, at in [('glGetString', cp, [u32]), ('glGetError', u32, []), ('glActiveTexture', None, [u32]), ('glBindTexture', None, [u32, u32]), ('glGenTextures', None, [i32, C.POINTER(u32)]), ('glTexStorage2D', None, [u32, i32, u32, i32, i32]),
    ('glTexStorage3D', None, [u32, i32, u32, i32, i32, i32]), ('glTexSubImage2D', None, [u32, i32, i32, i32, i32, i32, u32, u32, vp]), ('glTexSubImage3D', None, [u32, i32, i32, i32, i32, i32, i32, i32, u32, u32, vp]),
    ('glTexParameteri', None, [u32, u32, i32]), ('glPixelStorei', None, [u32, i32]), ('glGenBuffers', None, [i32, C.POINTER(u32)]), ('glBindBuffer', None, [u32, u32]), ('glBufferData', None, [u32, i64, vp, u32]),
    ('glBufferSubData', None, [u32, i64, i64, vp]), ('glGenVertexArrays', None, [i32, C.POINTER(u32)]), ('glBindVertexArray', None, [u32]), ('glEnableVertexAttribArray', None, [u32]), ('glVertexAttribPointer', None, [u32, i32, u32, C.c_ubyte, i32, vp]),
    ('glVertexAttribIPointer', None, [u32, i32, u32, i32, vp]), ('glVertexAttribDivisor', None, [u32, u32]), ('glCreateShader', u32, [u32]), ('glShaderSource', None, [u32, i32, C.POINTER(cp), C.POINTER(i32)]), ('glCompileShader', None, [u32]),
    ('glGetShaderiv', None, [u32, u32, C.POINTER(i32)]), ('glGetShaderInfoLog', None, [u32, i32, C.POINTER(i32), cp]), ('glCreateProgram', u32, []), ('glAttachShader', None, [u32, u32]), ('glLinkProgram', None, [u32]),
    ('glGetProgramiv', None, [u32, u32, C.POINTER(i32)]), ('glGetProgramInfoLog', None, [u32, i32, C.POINTER(i32), cp]), ('glUseProgram', None, [u32]), ('glGetUniformLocation', i32, [u32, cp]), ('glGetUniformBlockIndex', u32, [u32, cp]),
    ('glUniformBlockBinding', None, [u32, u32, u32]), ('glUniform1i', None, [i32, i32]), ('glUniform1f', None, [i32, f32]), ('glUniform4f', None, [i32, f32, f32, f32, f32]), ('glEnable', None, [u32]), ('glDisable', None, [u32]),
    ('glDepthFunc', None, [u32]), ('glDepthMask', None, [C.c_ubyte]), ('glViewport', None, [i32, i32, i32, i32]), ('glClearColor', None, [f32, f32, f32, f32]), ('glClearDepthf', None, [f32]), ('glClear', None, [u32]),
    ('glDrawArraysInstanced', None, [u32, i32, i32, i32]), ('glDrawElementsInstanced', None, [u32, i32, u32, vp, i32]), ('glBindBufferBase', None, [u32, u32, u32]), ('glFinish', None, []), ('glReadPixels', None, [i32, i32, i32, i32, u32, u32, vp]),
    ('glGenFramebuffers', None, [i32, C.POINTER(u32)]), ('glBindFramebuffer', None, [u32, u32]), ('glGenRenderbuffers', None, [i32, C.POINTER(u32)]), ('glBindRenderbuffer', None, [u32, u32]), ('glRenderbufferStorage', None, [u32, u32, i32, i32]),
    ('glFramebufferRenderbuffer', None, [u32, u32, u32, u32]), ('glFramebufferTexture2D', None, [u32, u32, u32, u32, i32]), ('glCheckFramebufferStatus', u32, [u32]), ('glTexImage2D', None, [u32, i32, i32, i32, i32, i32, u32, u32, vp])]:
    G[name[2].lower() + name[3:]] = F(name, rt, *at)
def gen(fn): v = u32(); fn(1, C.byref(v)); return v.value
print('context:', G['getString'](0x1F01).decode(), '|', G['getString'](0x1F02).decode())
errs = []
def check(what):
    e = G['getError']()
    if e: errs.append(f'{what}: GL error 0x{e:x}'); print('GL ERROR', what, hex(e))

# ---- the host's part: world tables on units 0..6, frame block, palette block, a colour and depth target
def tex2d(unit, ifmt, fmt, ty, w, h, data, filt):
    t = gen(G['genTextures']); G['activeTexture'](0x84C0 + unit); G['bindTexture'](0x0DE1, t); G['texStorage2D'](0x0DE1, 1, ifmt, w, h)
    if data is not None: G['texSubImage2D'](0x0DE1, 0, 0, 0, w, h, fmt, ty, data)
    for p, v in ((0x2801, filt), (0x2800, filt), (0x2802, 0x812F), (0x2803, 0x812F)): G['texParameteri'](0x0DE1, p, v)
    return t
def fromfile(name): b = open(os.path.join(rec, name), 'rb').read(); return (C.c_char * len(b)).from_buffer_copy(b), len(b)
RGBA32F, RGBA, FLOAT, NEAREST, LINEAR = 0x8814, 0x1908, 0x1406, 0x2600, 0x2601
host = {}
for unit, nm, rows in ((4, 'sold0', meta['rows']['sold0']), (5, 'sold1', meta['rows']['sold1']), (6, 'units', meta['rows']['units'])):
    d, _ = fromfile(f'world.{nm}.f32'); host[nm] = tex2d(unit, RGBA32F, RGBA, FLOAT, TW, rows, d, NEAREST)
d, _ = fromfile('world.height.f32'); N = meta['T']['N']; host['height'] = tex2d(0, 0x822E, 0x1903, FLOAT, N, N, d, LINEAR)
host['aerial'] = tex2d(1, 0x8058, RGBA, 0x1401, 1, 1, (C.c_ubyte * 4)(150, 175, 215, 255), LINEAR)
for unit in (2, 3):                                           # shadow maps: 1 x 1 depth 1.0 with the compare mode the prototype sets, so a lookup says "lit"
    t = gen(G['genTextures']); G['activeTexture'](0x84C0 + unit); G['bindTexture'](0x0DE1, t); G['texStorage2D'](0x0DE1, 1, 0x8CAC, 1, 1); G['texSubImage2D'](0x0DE1, 0, 0, 0, 1, 1, 0x1902, FLOAT, (C.c_float * 1)(1.0))
    for p, v in ((0x2801, LINEAR), (0x2800, LINEAR), (0x884C, 0x884E), (0x884D, 0x0201), (0x2802, 0x812F), (0x2803, 0x812F)): G['texParameteri'](0x0DE1, p, v)
host['fu'] = gen(G['genBuffers']); G['bindBuffer'](0x8A11, host['fu']); G['bufferData'](0x8A11, 512, None, 0x88E8)
host['pal'] = gen(G['genBuffers']); G['bindBuffer'](0x8A11, host['pal']); zero = (C.c_float * 256)(); G['bufferData'](0x8A11, 1024, C.cast(zero, vp), 0x88E4)
host['fbo'] = gen(G['genFramebuffers']); G['bindFramebuffer'](0x8D40, host['fbo']); col = gen(G['genTextures']); G['activeTexture'](0x84C0 + 15); G['bindTexture'](0x0DE1, col); G['texStorage2D'](0x0DE1, 1, 0x881A, W, H)
G['framebufferTexture2D'](0x8D40, 0x8CE0, 0x0DE1, col, 0); dep = gen(G['genRenderbuffers']); G['bindRenderbuffer'](0x8D41, dep); G['renderbufferStorage'](0x8D41, 0x81A6, W, H); G['framebufferRenderbuffer'](0x8D40, 0x8D00, 0x8D41, dep)
assert G['checkFramebufferStatus'](0x8D40) == 0x8CD5, 'framebuffer incomplete'; G['activeTexture'](0x84C0); check('host set-up')

# ---- tone mapping and PNG (standard library)
def png(path, w, h, rgb):
    rgb = np.ascontiguousarray(rgb).reshape(h, w * 3).tobytes(); raw = b''.join(b'\x00' + rgb[y * w * 3:(y + 1) * w * 3] for y in range(h)); ch = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw, 6)) + ch(b'IEND', b''))
EXPO = 1.0
def tone(a): v = np.maximum(a[..., :3], 0.0) * EXPO; v = v / (1.0 + v); return (255 * np.power(v, 1 / 2.2) + 0.5).astype(np.uint8)       # Reinhard and a 2.2 gamma: a picture to look at, not the product's grading
SKY = (0.40, 0.55, 0.80)

# ---- optional self test of the host's part: the GLSL of the prototype's preamble (hAt, place) evaluated on the GPU for the middle man, against the numbers node computed (terrain height, position)
def selftest(fu):
    sys.path.insert(0, HERE); pre = open(os.path.join(rec, 'pre.glsl')).read() if os.path.exists(os.path.join(rec, 'pre.glsl')) else None
    if not pre: print('selftest: no pre.glsl in the record directory'); return
    vs = pre + 'void main() { gl_Position = vec4(0.0, 0.0, 0.0, 1.0); gl_PointSize = 1.0; }'
    fs = pre + 'uniform int uI; layout(location=0) out vec4 o; void main() { Pl p = place(uI, cam.w); o = vec4(p.pos, hAt(p.pos.x, p.pos.z)); }'
    pr = compile_prog('selftest', vs, fs); G['useProgram'](pr)
    for blk, bind in (('FU', 0), ('PalU', 1)):
        bi = G['getUniformBlockIndex'](pr, blk.encode())
        if bi != 0xFFFFFFFF: G['uniformBlockBinding'](pr, bi, bind)
    for s_, u in SAMPLERS:
        l = G['getUniformLocation'](pr, s_.encode())
        if l >= 0: G['uniform1i'](l, u)
    fbo = gen(G['genFramebuffers']); G['bindFramebuffer'](0x8D40, fbo); t = gen(G['genTextures']); G['activeTexture'](0x84C0 + 15); G['bindTexture'](0x0DE1, t); G['texStorage2D'](0x0DE1, 1, 0x8814, 1, 1); G['framebufferTexture2D'](0x8D40, 0x8CE0, 0x0DE1, t, 0)
    G['bindBuffer'](0x8A11, host['fu']); arr = (C.c_float * 128)(*fu); G['bufferSubData'](0x8A11, 0, 512, C.cast(arr, vp)); G['bindBufferBase'](0x8A11, 0, host['fu']); G['bindBufferBase'](0x8A11, 1, host['pal'])
    for unit, key in ((0, 'height'), (1, 'aerial'), (4, 'sold0'), (5, 'sold1'), (6, 'units')): G['activeTexture'](0x84C0 + unit); G['bindTexture'](0x0DE1, host[key])
    G['viewport'](0, 0, 1, 1); G['disable'](0xB71); G['useProgram'](pr); G['uniform1i'](G['getUniformLocation'](pr, b'uI'), meta['probe']['mid']); G['drawArraysInstanced'](0, 0, 1, 1)
    # a point primitive: GL_POINTS = 0
    buf = (C.c_float * 4)(); G['readPixels'](0, 0, 1, 1, RGBA, FLOAT, C.cast(buf, vp)); check('selftest')
    pj = meta['probe']; print(f"selftest: GPU place(mid) = ({buf[0]:.2f}, {buf[1]:.2f}, {buf[2]:.2f}), hAt there = {buf[3]:.2f};  node: soldierPlace x z = ({pj['x']:.2f}, {pj['z']:.2f}), T.h = {pj['groundY']:.2f}")
    G['bindFramebuffer'](0x8D40, host['fbo']); G['activeTexture'](0x84C0)
# ---- the replay
H_ = {}                                                       # the recorder's handles -> GL names (or uniform locations)
h = lambda a: H_[a['h']] if isinstance(a, dict) else 0
progs = []; images = {}; raw_ = {}; shots = []
def compile_prog(name, vs, fs):
    def sh(kind, src):
        s = G['createShader'](kind); G['shaderSource'](s, 1, (cp * 1)(src.encode()), None); G['compileShader'](s); ok = i32(); G['getShaderiv'](s, 0x8B81, C.byref(ok)); b = C.create_string_buffer(65536); G['getShaderInfoLog'](s, 65536, None, b)
        if not ok.value: raise SystemExit(f'shader {name} {"vertex" if kind == 0x8B31 else "fragment"} did not compile:\n' + b.value.decode())
        return s
    p = G['createProgram'](); G['attachShader'](p, sh(0x8B31, vs)); G['attachShader'](p, sh(0x8B30, fs)); G['linkProgram'](p); ok = i32(); G['getProgramiv'](p, 0x8B82, C.byref(ok))
    if not ok.value: b = C.create_string_buffer(65536); G['getProgramInfoLog'](p, 65536, None, b); raise SystemExit(f'program {name} did not link:\n' + b.value.decode())
    return p
SAMPLERS = [('uHeight', 0), ('uAerial', 1), ('uSh0', 2), ('uSh1', 3), ('uSold0', 4), ('uSold1', 5), ('uUnits', 6), ('uVat', 7), ('uAtlas', 8), ('uPose', 9), ('uGuns', 10), ('uEv', 11), ('uSrc', 12), ('uHdr', 12), ('uDepthT', 13), ('uBloom', 14), ('uDepth', 13)]
cur = None; nops = 0; nframe = 0
for op in ops:
    k = op[0]; nops += 1
    if k == 'createTexture': H_[op[1]] = gen(G['genTextures'])
    elif k == 'createBuffer': H_[op[1]] = gen(G['genBuffers'])
    elif k == 'createVertexArray': H_[op[1]] = gen(G['genVertexArrays'])
    elif k == 'activeTexture': G['activeTexture'](op[1])
    elif k == 'bindTexture': G['bindTexture'](op[1], h(op[2]))
    elif k == 'bindBuffer': G['bindBuffer'](op[1], h(op[2]))
    elif k == 'bindVertexArray': G['bindVertexArray'](h(op[1]))
    elif k == 'texStorage2D': G['texStorage2D'](*op[1:6])
    elif k == 'texStorage3D': G['texStorage3D'](*op[1:7])
    elif k == 'texParameteri': G['texParameteri'](*op[1:4])
    elif k == 'pixelStorei': G['pixelStorei'](*op[1:3])
    elif k == 'texSubImage2D': G['texSubImage2D'](*op[1:9], ptr(op[9]))
    elif k == 'texSubImage3D': G['texSubImage3D'](*op[1:11], ptr(op[11]))
    elif k == 'bufferData': G['bufferData'](op[1], op[2], ptr(op[3]), op[4])
    elif k == 'bufferSubData': G['bufferSubData'](op[1], op[2], op[3][1], ptr(op[3]))
    elif k == 'enableVertexAttribArray': G['enableVertexAttribArray'](op[1])
    elif k == 'vertexAttribPointer': G['vertexAttribPointer'](op[1], op[2], op[3], 1 if op[4] else 0, op[5], C.c_void_p(op[6]))
    elif k == 'vertexAttribIPointer': G['vertexAttribIPointer'](op[1], op[2], op[3], op[4], C.c_void_p(op[5]))
    elif k == 'vertexAttribDivisor': G['vertexAttribDivisor'](op[1], op[2])
    elif k == 'prog': H_[op[1]] = compile_prog(op[2], op[3], op[4]); progs.append((op[2], H_[op[1]]))
    elif k == 'finishProgs':
        for nm, p in progs:
            G['useProgram'](p)
            for blk, bind in (('FU', 0), ('PalU', 1)):
                bi = G['getUniformBlockIndex'](p, blk.encode())
                if bi != 0xFFFFFFFF: G['uniformBlockBinding'](p, bi, bind)
            for s, u in SAMPLERS:
                l = G['getUniformLocation'](p, s.encode())
                if l >= 0: G['uniform1i'](l, u)
        check('finishProgs')
    elif k == 'getUniformLocation': H_[op[1]] = G['getUniformLocation'](H_[op[2]], op[3].encode())
    elif k == 'useProgram': G['useProgram'](h(op[1]))
    elif k == 'uniform1i': G['uniform1i'](H_[op[1]['h']] if isinstance(op[1], dict) else -1, op[2])
    elif k == 'uniform1f': G['uniform1f'](H_[op[1]['h']] if isinstance(op[1], dict) else -1, op[2])
    elif k == 'uniform4f': G['uniform4f'](H_[op[1]['h']] if isinstance(op[1], dict) else -1, *op[2:6])
    elif k == 'enable': G['enable'](op[1])
    elif k == 'disable': G['disable'](op[1])
    elif k == 'depthFunc': G['depthFunc'](op[1])
    elif k == 'depthMask': G['depthMask'](1 if op[1] else 0)
    elif k == 'drawArraysInstanced':
        if arg('--skip') != 'imp': G['drawArraysInstanced'](*op[1:5])
    elif k == 'drawElementsInstanced':
        if arg('--skip') != 'mesh': G['drawElementsInstanced'](op[1], op[2], op[3], C.c_void_p(op[4]), op[5])
    elif k == 'frame':
        label, fu = op[1], op[2]; G['bindFramebuffer'](0x8D40, host['fbo']); G['viewport'](0, 0, W, H); G['clearColor'](*SKY, 1.0); G['clearDepthf'](1.0); G['depthMask'](1); G['clear'](0x4100)
        G['bindBuffer'](0x8A11, host['fu']); arr = (C.c_float * 128)(*fu); G['bufferSubData'](0x8A11, 0, 512, C.cast(arr, vp)); G['bindBufferBase'](0x8A11, 0, host['fu']); G['bindBufferBase'](0x8A11, 1, host['pal'])
        for unit, key in ((0, 'height'), (1, 'aerial'), (2, None), (3, None), (4, 'sold0'), (5, 'sold1'), (6, 'units')):
            if key: G['activeTexture'](0x84C0 + unit); G['bindTexture'](0x0DE1, host[key])
        G['activeTexture'](0x84C0); cur = label; nframe += 1
        if '--selftest' in sys.argv and nframe == 1: selftest(fu)
    elif k == 'end':
        G['finish'](); buf = (C.c_float * (W * H * 4))(); G['bindFramebuffer'](0x8D40, host['fbo']); G['readPixels'](0, 0, W, H, RGBA, FLOAT, C.cast(buf, vp)); check('frame ' + cur)
        a = np.ctypeslib.as_array(buf).reshape(H, W, 4)[::-1].copy(); images[cur] = tone(a); raw_[cur] = a; png(os.path.join(outd, cur + '.png'), W, H, images[cur]); print('drawn', cur, 'covered pixels', int((np.abs(a[..., :3] - np.array(SKY)).max(-1) > 3e-3).sum()))
    else: raise SystemExit('replay: the recorded call ' + k + ' is not mapped (add it to crowd-lod-native-replay.py)')
check('end of replay')
# ---- montages: the middle of the frame (the unit's middle man) for each distance, the cross-fade row above the hard row
def crop(img, cx, cy, w, h, zoom):
    x0, y0 = max(0, cx - w // 2), max(0, cy - h // 2); c = img[y0:y0 + h, x0:x0 + w]; return np.repeat(np.repeat(c, zoom, 0), zoom, 1)
def strip(name, rows, w, h, zoom, cy=H // 2):
    """rows: lists of frame labels; every cell is the crop (w x h, enlarged by `zoom`) around the middle of its frame, where the camera looks at the man the strip follows."""
    rs = [np.concatenate([crop(images[l], W // 2, cy, w, h, zoom) for l in row], axis=1) for row in rows if all(l in images for l in row)]
    if rs: sheet = np.concatenate(rs, axis=0); png(os.path.join(outd, name), sheet.shape[1], sheet.shape[0], sheet)
fr = {f['label']: f for f in meta['frames']}
def nums(grp, scene='track'): return sorted({f['D'] for f in meta['frames'] if f['grp'] == grp and f['scene'] == scene})
nearD = nums('near'); farD = [D for D in nums('far') if 70 <= D <= 84]
lab = lambda m, D, sc='track': f'{sc}-{m}-{D:g}'
if nearD:
    a, b = nearD[:len(nearD) // 2], nearD[len(nearD) // 2:]
    strip('strip-near-a.png', [[lab('fade', D) for D in a], [lab('hard', D) for D in a]], 170, 260, 1)
    strip('strip-near-b.png', [[lab('fade', D) for D in b], [lab('hard', D) for D in b]], 170, 260, 1)
if farD: strip('strip-far.png', [[lab('fade', D) for D in farD], [lab('hard', D) for D in farD]], 64, 80, 3)
for sc, w_, h_, z_, nm in (('diag', 640, 360, 1, 'diag-near.png'),):
    if all(lab(m, 8, sc) in images for m in ('fade', 'hard')): png(os.path.join(outd, nm), W, H * 2, np.concatenate([images[lab('fade', 8, sc)], images[lab('hard', 8, sc)]], axis=0))
if all(lab(m, 60, 'diag') in images for m in ('fade', 'hard')): strip('diag-far.png', [[lab('fade', 60, 'diag')], [lab('hard', 60, 'diag')]], 320, 180, 2)
json.dump({'context': G['getString'](0x1F02).decode(), 'renderer': G['getString'](0x1F01).decode(), 'ops': nops, 'frames': nframe, 'gl_errors': errs, 'frame_meta': meta['frames']}, open(os.path.join(outd, 'summary.json'), 'w'), indent=1)
if xv: xv.terminate(); xv.wait()
print('GL errors:', errs or 'none'); sys.exit(1 if errs else 0)
