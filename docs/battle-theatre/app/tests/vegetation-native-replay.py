# Replay, on a REAL OpenGL ES 3.2 context (Mesa llvmpipe, software, through Xvfb and GLX; python standard library and numpy for the tone mapping), of the GL calls that the vegetation layer's WebGL2 backend (src/ext/vegetation/gl.mjs,
# unchanged) made in node, recorded by tests/vegetation-native-record.mjs: the same state texture, buffers, vertex arrays, programs (the layer's GLSL with the prototype's preamble), uniforms and draws, for a list of views (a place, a
# time, a camera, the readings of the source conflicts). The shell's own work is replaced by the least the layer's shaders need: its frame block (computed in node as GLRenderer.writeFU does), the terrain's heights on unit 0, a flat sky,
# a plain grey-green ground drawn from those heights (2 m under the true surface, so that the layer's ground cover shows over it), no shadow maps (every fragment lit), no fog texture, no other layer, no post-processing. So a picture shows
# the LAYER over bare ground, through the real shaders, with software GL; it is not the shell and not a browser, and colour and light are not those of the product. No frame time is claimed.
#   python3 -I docs/battle-theatre/app/tests/vegetation-native-replay.py <recordDir> <outDir> [--display :N] [--expo 1.0]
# Writes <outDir>/<label>.png (the frame, tone mapped) and <outDir>/summary.json. Exit 0 when every frame was drawn without a GL error.
import os, sys, json, mmap, zlib, struct, math, subprocess, ctypes as C
import numpy as np                      # tone mapping and the pictures only
HERE = os.path.dirname(os.path.abspath(__file__))
rec, outd = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); os.makedirs(outd, exist_ok=True)
def arg(k, d=None): return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
meta = json.load(open(os.path.join(rec, 'meta.json'))); ops = json.load(open(os.path.join(rec, 'ops.json'))); W, H, TW = meta['W'], meta['H'], meta['TW']
fblobs = open(os.path.join(rec, 'blobs.bin'), 'rb'); mm = mmap.mmap(fblobs.fileno(), 0, access=mmap.ACCESS_COPY); BASE = C.addressof(C.c_char.from_buffer(mm))
ptr = lambda r: C.c_void_p(BASE + r[0]) if r else None
PRE = open(os.path.join(rec, 'pre.glsl')).read()

# ---- display and context (as crowd-lod-native-replay.py)
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
    ('glTexSubImage2D', None, [u32, i32, i32, i32, i32, i32, u32, u32, vp]), ('glTexParameteri', None, [u32, u32, i32]), ('glPixelStorei', None, [u32, i32]), ('glGenBuffers', None, [i32, C.POINTER(u32)]), ('glBindBuffer', None, [u32, u32]),
    ('glBufferData', None, [u32, i64, vp, u32]), ('glBufferSubData', None, [u32, i64, i64, vp]), ('glGenVertexArrays', None, [i32, C.POINTER(u32)]), ('glBindVertexArray', None, [u32]), ('glEnableVertexAttribArray', None, [u32]),
    ('glVertexAttribPointer', None, [u32, i32, u32, C.c_ubyte, i32, vp]), ('glVertexAttribDivisor', None, [u32, u32]), ('glCreateShader', u32, [u32]), ('glShaderSource', None, [u32, i32, C.POINTER(cp), C.POINTER(i32)]),
    ('glCompileShader', None, [u32]), ('glGetShaderiv', None, [u32, u32, C.POINTER(i32)]), ('glGetShaderInfoLog', None, [u32, i32, C.POINTER(i32), cp]), ('glCreateProgram', u32, []), ('glAttachShader', None, [u32, u32]),
    ('glLinkProgram', None, [u32]), ('glGetProgramiv', None, [u32, u32, C.POINTER(i32)]), ('glGetProgramInfoLog', None, [u32, i32, C.POINTER(i32), cp]), ('glUseProgram', None, [u32]), ('glGetUniformLocation', i32, [u32, cp]),
    ('glGetUniformBlockIndex', u32, [u32, cp]), ('glUniformBlockBinding', None, [u32, u32, u32]), ('glUniform1i', None, [i32, i32]), ('glUniform1f', None, [i32, f32]), ('glUniform4f', None, [i32, f32, f32, f32, f32]),
    ('glUniform3fv', None, [i32, i32, vp]), ('glEnable', None, [u32]), ('glDisable', None, [u32]), ('glDepthFunc', None, [u32]), ('glDepthMask', None, [C.c_ubyte]), ('glViewport', None, [i32, i32, i32, i32]),
    ('glClearColor', None, [f32, f32, f32, f32]), ('glClearDepthf', None, [f32]), ('glClear', None, [u32]), ('glDrawArrays', None, [u32, i32, i32]), ('glDrawElementsInstanced', None, [u32, i32, u32, vp, i32]),
    ('glBindBufferBase', None, [u32, u32, u32]), ('glFinish', None, []), ('glReadPixels', None, [i32, i32, i32, i32, u32, u32, vp]), ('glGenFramebuffers', None, [i32, C.POINTER(u32)]), ('glBindFramebuffer', None, [u32, u32]),
    ('glGenRenderbuffers', None, [i32, C.POINTER(u32)]), ('glBindRenderbuffer', None, [u32, u32]), ('glRenderbufferStorage', None, [u32, u32, i32, i32]), ('glFramebufferRenderbuffer', None, [u32, u32, u32, u32]),
    ('glFramebufferTexture2D', None, [u32, u32, u32, u32, i32]), ('glCheckFramebufferStatus', u32, [u32])]:
    G[name[2].lower() + name[3:]] = F(name, rt, *at)
def gen(fn): v = u32(); fn(1, C.byref(v)); return v.value
print('context:', G['getString'](0x1F01).decode(), '|', G['getString'](0x1F02).decode())
errs = []
def check(what):
    e = G['getError']()
    if e: errs.append(f'{what}: GL error 0x{e:x}'); print('GL ERROR', what, hex(e))

# ---- the host's part: the terrain's heights on unit 0, a 1 x 1 aerial colour, dummy shadow maps, the frame block, the palette block, a colour and depth target
def tex2d(unit, ifmt, fmt, ty, w, h, data, filt):
    t = gen(G['genTextures']); G['activeTexture'](0x84C0 + unit); G['bindTexture'](0x0DE1, t); G['texStorage2D'](0x0DE1, 1, ifmt, w, h)
    if data is not None: G['texSubImage2D'](0x0DE1, 0, 0, 0, w, h, fmt, ty, data)
    for p, v in ((0x2801, filt), (0x2800, filt), (0x2802, 0x812F), (0x2803, 0x812F)): G['texParameteri'](0x0DE1, p, v)
    return t
def fromfile(name): b = open(os.path.join(rec, name), 'rb').read(); return (C.c_char * len(b)).from_buffer_copy(b), len(b)
RGBA32F, RGBA, FLOAT, NEAREST, LINEAR = 0x8814, 0x1908, 0x1406, 0x2600, 0x2601
host = {}; N = meta['T']['N']
d, _ = fromfile('world.height.f32'); host['height'] = tex2d(0, 0x822E, 0x1903, FLOAT, N, N, d, LINEAR)
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
EXPO = float(arg('--expo', 1.0))
def tone(a): v = np.maximum(a[..., :3], 0.0) * EXPO; v = v / (1.0 + v); return (255 * np.power(v, 1 / 2.2) + 0.5).astype(np.uint8)       # Reinhard and a 2.2 gamma: a picture to look at, not the product's grading
SKY = (0.40, 0.55, 0.80)

# ---- the replay
H_ = {}                                                       # the recorder's handles -> GL names (or uniform locations)
h = lambda a: H_[a['h']] if isinstance(a, dict) else 0
progs = []; images = {}; shots = []
def compile_prog(name, vs, fs):
    def sh(kind, src):
        s = G['createShader'](kind); G['shaderSource'](s, 1, (cp * 1)(src.encode()), None); G['compileShader'](s); ok = i32(); G['getShaderiv'](s, 0x8B81, C.byref(ok)); b = C.create_string_buffer(65536); G['getShaderInfoLog'](s, 65536, None, b)
        if not ok.value: raise SystemExit(f'shader {name} {"vertex" if kind == 0x8B31 else "fragment"} did not compile:\n' + b.value.decode())
        return s
    p = G['createProgram'](); G['attachShader'](p, sh(0x8B31, vs)); G['attachShader'](p, sh(0x8B30, fs)); G['linkProgram'](p); ok = i32(); G['getProgramiv'](p, 0x8B82, C.byref(ok))
    if not ok.value: b = C.create_string_buffer(65536); G['getProgramInfoLog'](p, 65536, None, b); raise SystemExit(f'program {name} did not link:\n' + b.value.decode())
    return p
SAMPLERS = [('uHeight', 0), ('uAerial', 1), ('uSh0', 2), ('uSh1', 3), ('uSold0', 4), ('uSold1', 5), ('uUnits', 6)]
def bind_blocks(p):
    G['useProgram'](p)
    for blk, bind in (('FU', 0), ('PalU', 1)):
        bi = G['getUniformBlockIndex'](p, blk.encode())
        if bi != 0xFFFFFFFF: G['uniformBlockBinding'](p, bi, bind)
    for s, u in SAMPLERS:
        l = G['getUniformLocation'](p, s.encode())
        if l >= 0: G['uniform1i'](l, u)
# the bare ground under the layer: a grid over the loaded ground drawn from the height raster (the preamble's hAt), 2 m below the true surface
GRID = 512
TERR_VS = PRE + f'''
out vec3 vWp;
void main() {{
  int id = gl_VertexID; int cell = id / 6, k = id - cell * 6; int cx = cell % {GRID}, cz = cell / {GRID};
  int ox = (k == 1 || k == 3 || k == 4) ? 1 : 0; int oz = (k == 2 || k == 4 || k == 5) ? 1 : 0;
  float x = (float(cx + ox) / {GRID}.0 - 0.5) * terr.x, z = (float(cz + oz) / {GRID}.0 - 0.5) * terr.y;
  vWp = vec3(x, hAt(x, z) - 2.0, z); gl_Position = vp * vec4(vWp, 1.0);
}}'''
TERR_FS = PRE + '''
in vec3 vWp; layout(location=0) out vec4 o;
void main() {
  float e = 3.0; float hx = hAt(vWp.x + e, vWp.z) - hAt(vWp.x - e, vWp.z); float hz = hAt(vWp.x, vWp.z + e) - hAt(vWp.x, vWp.z - e); vec3 N = normalize(vec3(-hx, 2.0 * e, -hz));
  o = vec4(fogged(lit(vec3(0.20, 0.22, 0.15), 0.97, 0.0, N, vWp, 1.0, 1.0), vWp), 1.0);
}'''
terr = None
cur = None; curname = None; nops = 0; nframe = 0
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
    elif k == 'texParameteri': G['texParameteri'](*op[1:4])
    elif k == 'pixelStorei':
        if op[1] not in (0x9240, 0x9241, 0x9243): G['pixelStorei'](*op[1:3])      # UNPACK_FLIP_Y_WEBGL, UNPACK_PREMULTIPLY_ALPHA_WEBGL and UNPACK_COLORSPACE_CONVERSION_WEBGL exist in WebGL only (a native context raises INVALID_ENUM for them)
    elif k == 'texSubImage2D': G['texSubImage2D'](*op[1:9], ptr(op[9]))
    elif k == 'bufferData': G['bufferData'](op[1], op[2], ptr(op[3]), op[4])
    elif k == 'bufferSubData': G['bufferSubData'](op[1], op[2], op[3][1], ptr(op[3]))
    elif k == 'enableVertexAttribArray': G['enableVertexAttribArray'](op[1])
    elif k == 'vertexAttribPointer': G['vertexAttribPointer'](op[1], op[2], op[3], 1 if op[4] else 0, op[5], C.c_void_p(op[6]))
    elif k == 'vertexAttribDivisor': G['vertexAttribDivisor'](op[1], op[2])
    elif k == 'prog': H_[op[1]] = compile_prog(op[2], op[3], op[4]); progs.append((op[2], H_[op[1]]))
    elif k == 'finishProgs':
        for nm, p in progs: bind_blocks(p)
        terr = compile_prog('terrain', TERR_VS, TERR_FS); bind_blocks(terr); check('finishProgs')
    elif k == 'getUniformLocation': H_[op[1]] = G['getUniformLocation'](H_[op[2]], op[3].encode())
    elif k == 'useProgram': G['useProgram'](h(op[1]))
    elif k == 'uniform1i': G['uniform1i'](H_[op[1]['h']] if isinstance(op[1], dict) else -1, op[2])
    elif k == 'uniform1f': G['uniform1f'](H_[op[1]['h']] if isinstance(op[1], dict) else -1, op[2])
    elif k == 'uniform4f': G['uniform4f'](H_[op[1]['h']] if isinstance(op[1], dict) else -1, *op[2:6])
    elif k == 'uniform3fv':
        a = op[2]; arr = (C.c_float * len(a))(*a); G['uniform3fv'](H_[op[1]['h']] if isinstance(op[1], dict) else -1, len(a) // 3, C.cast(arr, vp))
    elif k == 'enable': G['enable'](op[1])
    elif k == 'disable': G['disable'](op[1])
    elif k == 'depthFunc': G['depthFunc'](op[1])
    elif k == 'depthMask': G['depthMask'](1 if op[1] else 0)
    elif k == 'drawArrays': G['drawArrays'](op[1], op[2], op[3])
    elif k == 'drawElementsInstanced': G['drawElementsInstanced'](op[1], op[2], op[3], C.c_void_p(op[4]), op[5])
    elif k == 'frame':
        label, fu = op[1], op[2]; G['bindFramebuffer'](0x8D40, host['fbo']); G['viewport'](0, 0, W, H); G['clearColor'](*SKY, 1.0); G['clearDepthf'](1.0); G['depthMask'](1); G['clear'](0x4100)
        G['bindBuffer'](0x8A11, host['fu']); arr = (C.c_float * 128)(*fu); G['bufferSubData'](0x8A11, 0, 512, C.cast(arr, vp)); G['bindBufferBase'](0x8A11, 0, host['fu']); G['bindBufferBase'](0x8A11, 1, host['pal'])
        for unit, key in ((0, 'height'), (1, 'aerial')): G['activeTexture'](0x84C0 + unit); G['bindTexture'](0x0DE1, host[key])
        G['enable'](0xB71); G['depthFunc'](0x0201); G['disable'](0xB44); G['bindVertexArray'](0); G['useProgram'](terr); G['drawArrays'](4, 0, GRID * GRID * 6)       # the bare ground
        G['activeTexture'](0x84C0); cur = label; nframe += 1; check('ground of ' + label)
    elif k == 'end':
        G['finish'](); buf = (C.c_float * (W * H * 4))(); G['bindFramebuffer'](0x8D40, host['fbo']); G['readPixels'](0, 0, W, H, RGBA, FLOAT, C.cast(buf, vp)); check('frame ' + cur)
        a = np.ctypeslib.as_array(buf).reshape(H, W, 4)[::-1].copy(); images[cur] = tone(a); png(os.path.join(outd, cur + '.png'), W, H, images[cur])
        cov = int((np.abs(a[..., :3] - np.array(SKY)).max(-1) > 3e-3).sum()); print('drawn', cur, 'covered pixels', cov, 'mean rgb', [round(float(x), 3) for x in a[..., :3].reshape(-1, 3).mean(0)]); shots.append({'label': cur, 'covered': cov})
    else: raise SystemExit('replay: the recorded call ' + k + ' is not mapped (add it to vegetation-native-replay.py)')
check('end of replay')
json.dump({'context': G['getString'](0x1F02).decode(), 'renderer': G['getString'](0x1F01).decode(), 'ops': nops, 'frames': nframe, 'gl_errors': errs, 'shots': shots, 'frame_meta': meta['frames']}, open(os.path.join(outd, 'summary.json'), 'w'), indent=1)
if xv: xv.terminate(); xv.wait()
print('GL errors:', errs or 'none'); sys.exit(1 if errs else 0)
