# Native check of the crowd's GLSL ES 3.00 programs (app/src/crowd/shaders-gl.mjs with the prototype's preamble, including the cross-fade of lod.mjs) on a REAL OpenGL ES 3.2 context: Mesa's llvmpipe (software), reached through Xvfb
# and GLX with the python standard library only (ctypes). It is a second compiler for the shaders that the browser lab (tests/crowd-lod-lab.mjs) and the real-shell run (tests/crowd-lod-shots.mjs) run through ANGLE, and the first one
# that has seen them: nothing here is a browser, a WebGL2 call or a real-GPU result.
#   1. compile and link the five programs of gl.mjs (c-mid, c-midS, c-near, c-nearS, c-imp) exactly as GLRenderer.prog() assembles them;
#   2. the uniforms that gl.mjs looks up and sets (a uniform the compiler drops makes getUniformLocation return null and the browser skips the set without a word) are active, with the type of the setter used (uniform1i, 1f, 4f);
#   3. negative controls: the same context refuses a type error, a varying the vertex shader does not write, a `flat` mismatch, and shows an unused uniform as inactive;
#   4. the dither of the cross-fade, run: the real functions ign / fadeOf / fadeKeep (the text of HEAD, with the prototype's hsh) in a full-screen draw of a 3840 x 2160 frame (scissored to three 96 x 96 windows: the corner, the far corner
#      of 1080p, the far corner of 4K), for 8 figures and 6 range words, against the JavaScript reference of lod.mjs (float64): the pixels that differ lie within 2e-3 of a boundary of the range (float32 against float64), the four levels of a
#      partition cover every pixel exactly once (no gap, no overlap, exact), a second pass in the reverse order gives the same bytes (nothing is remembered between draws), and the comparison fails against the number of another figure.
#   python3 -I docs/battle-theatre/app/tests/crowd-lod-glsl.py [--out report.json] [--display :N]      (without --display it starts its own Xvfb and stops it at the end)
# Needs Xvfb (found on PATH) and the system's Mesa (libGL, libX11); node for the dump helper. Exit 0 when every check passed and every control behaved.
import os, sys, json, re, subprocess, tempfile, shutil, ctypes as C
HERE = os.path.dirname(os.path.abspath(__file__)); BT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE); import crowd_lod_dither as D        # the comparison of a run of the dither with the reference of lod.mjs, shared with crowd-lod-naga.py
def arg(k, d=None): return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
res = {'implementation': 'Mesa (system) over GLX on Xvfb', 'software': True, 'errors': [], 'programs': {}, 'controls': {}, 'uniforms': {}, 'dither': {}}
def fail(msg): res['errors'].append(msg); print('FAIL', msg)

# ---- 0. the sources, written by node
tmp = tempfile.mkdtemp(prefix='crowd-glsl-'); out = os.path.join(tmp, 'src'); os.makedirs(out)
r = subprocess.run(['node', os.path.join(HERE, 'crowd-lod-glsl-dump.mjs'), out], capture_output=True, text=True)
if r.returncode: print(r.stdout, r.stderr); sys.exit(2)
print(r.stdout.strip())
rd = lambda n: open(os.path.join(out, n), encoding='utf8').read()
PROGS = ['c-mid', 'c-midS', 'c-near', 'c-nearS', 'c-imp']; pre, head = rd('pre.glsl'), rd('head.glsl'); ref = D.load_ref(out)

# ---- 1. a display and a GLES 3.x context
xv = None
if arg('--display'): os.environ['DISPLAY'] = arg('--display')
else:
    rfd, wfd = os.pipe(); xv = subprocess.Popen(['Xvfb', '-displayfd', str(wfd), '-nolisten', 'tcp', '-screen', '0', '320x240x24'], pass_fds=[wfd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); os.close(wfd)
    num = b''
    while not num.endswith(b'\n'):
        ch = os.read(rfd, 16)
        if not ch: print('Xvfb did not start'); sys.exit(2)
        num += ch
    os.environ['DISPLAY'] = ':' + num.decode().strip()
def cleanup():
    if xv: xv.terminate(); xv.wait()
    shutil.rmtree(tmp, ignore_errors=True)
x11 = C.CDLL('libX11.so.6'); gl = C.CDLL('libGL.so.1')
x11.XOpenDisplay.restype = C.c_void_p; x11.XOpenDisplay.argtypes = [C.c_char_p]; x11.XDefaultScreen.argtypes = [C.c_void_p]
dpy = x11.XOpenDisplay(os.environ['DISPLAY'].encode()); assert dpy, 'no X display'
scr = x11.XDefaultScreen(dpy)
gl.glXChooseFBConfig.restype = C.POINTER(C.c_void_p); gl.glXChooseFBConfig.argtypes = [C.c_void_p, C.c_int, C.POINTER(C.c_int), C.POINTER(C.c_int)]
n = C.c_int(); cfg = gl.glXChooseFBConfig(dpy, scr, (C.c_int * 11)(0x8010, 0x4, 0x8011, 1, 8, 8, 9, 8, 10, 8, 0), C.byref(n)); assert n.value > 0, 'no pbuffer-capable framebuffer configuration'
gl.glXCreatePbuffer.restype = C.c_ulong; gl.glXCreatePbuffer.argtypes = [C.c_void_p, C.c_void_p, C.POINTER(C.c_int)]
pb = gl.glXCreatePbuffer(dpy, cfg[0], (C.c_int * 5)(0x8041, 64, 0x8040, 64, 0))
gl.glXGetProcAddressARB.restype = C.c_void_p; gl.glXGetProcAddressARB.argtypes = [C.c_char_p]
mkctx = C.CFUNCTYPE(C.c_void_p, C.c_void_p, C.c_void_p, C.c_void_p, C.c_int, C.POINTER(C.c_int))(gl.glXGetProcAddressARB(b'glXCreateContextAttribsARB'))
ctx = mkctx(dpy, cfg[0], None, 1, (C.c_int * 7)(0x2091, 3, 0x2092, 0, 0x9126, 0x4, 0))      # GLX_CONTEXT_ES2_PROFILE_BIT_EXT: a GLES 3.x context
assert ctx, 'no OpenGL ES context (GLX_EXT_create_context_es2_profile)'
gl.glXMakeContextCurrent.argtypes = [C.c_void_p, C.c_ulong, C.c_ulong, C.c_void_p]; assert gl.glXMakeContextCurrent(dpy, pb, pb, ctx)
def F(name, rt, *at):
    a = gl.glXGetProcAddressARB(name.encode()); assert a, 'missing GL entry point ' + name; return C.CFUNCTYPE(rt, *at)(a)
u32, i32, vp, cp = C.c_uint, C.c_int, C.c_void_p, C.c_char_p
glGetString = F('glGetString', cp, u32); glGetError = F('glGetError', u32)
glCreateShader = F('glCreateShader', u32, u32); glShaderSource = F('glShaderSource', None, u32, i32, C.POINTER(cp), C.POINTER(i32)); glCompileShader = F('glCompileShader', None, u32)
glGetShaderiv = F('glGetShaderiv', None, u32, u32, C.POINTER(i32)); glGetShaderInfoLog = F('glGetShaderInfoLog', None, u32, i32, C.POINTER(i32), cp)
glCreateProgram = F('glCreateProgram', u32); glAttachShader = F('glAttachShader', None, u32, u32); glLinkProgram = F('glLinkProgram', None, u32)
glGetProgramiv = F('glGetProgramiv', None, u32, u32, C.POINTER(i32)); glGetProgramInfoLog = F('glGetProgramInfoLog', None, u32, i32, C.POINTER(i32), cp); glUseProgram = F('glUseProgram', None, u32)
glGetUniformLocation = F('glGetUniformLocation', i32, u32, cp); glGetUniformBlockIndex = F('glGetUniformBlockIndex', u32, u32, cp)
glGetActiveUniform = F('glGetActiveUniform', None, u32, u32, i32, C.POINTER(i32), C.POINTER(i32), C.POINTER(u32), cp); glUniform1ui = F('glUniform1ui', None, i32, u32)
glGenFramebuffers = F('glGenFramebuffers', None, i32, C.POINTER(u32)); glBindFramebuffer = F('glBindFramebuffer', None, u32, u32); glGenRenderbuffers = F('glGenRenderbuffers', None, i32, C.POINTER(u32))
glBindRenderbuffer = F('glBindRenderbuffer', None, u32, u32); glRenderbufferStorage = F('glRenderbufferStorage', None, u32, u32, i32, i32); glFramebufferRenderbuffer = F('glFramebufferRenderbuffer', None, u32, u32, u32, u32)
glCheckFramebufferStatus = F('glCheckFramebufferStatus', u32, u32); glViewport = F('glViewport', None, i32, i32, i32, i32); glScissor = F('glScissor', None, i32, i32, i32, i32); glEnable = F('glEnable', None, u32)
glClearColor = F('glClearColor', None, C.c_float, C.c_float, C.c_float, C.c_float); glClear = F('glClear', None, u32); glDrawArrays = F('glDrawArrays', None, u32, i32, i32); glReadPixels = F('glReadPixels', None, i32, i32, i32, i32, u32, u32, vp)
res['context'] = {k: glGetString(c).decode() for k, c in (('vendor', 0x1F00), ('renderer', 0x1F01), ('version', 0x1F02), ('glsl', 0x8B8C))}; print('context:', res['context'])
def lg(kind, obj, n=65536): b = C.create_string_buffer(n); (glGetShaderInfoLog if kind == 's' else glGetProgramInfoLog)(obj, n, None, b); return b.value.decode(errors='replace').strip()
def compile_(stage, src):
    s = glCreateShader(0x8B31 if stage == 'vert' else 0x8B30); glShaderSource(s, 1, (cp * 1)(src.encode()), None); glCompileShader(s); ok = C.c_int(); glGetShaderiv(s, 0x8B81, C.byref(ok)); return s, bool(ok.value), lg('s', s)
def link(vs, fs):
    v, vok, vlog = compile_('vert', vs); f, fok, flog = compile_('frag', fs); p = glCreateProgram(); glAttachShader(p, v); glAttachShader(p, f); glLinkProgram(p); ok = C.c_int(); glGetProgramiv(p, 0x8B82, C.byref(ok))
    return {'prog': p, 'ok': bool(ok.value) and vok and fok, 'vs_ok': vok, 'fs_ok': fok, 'vs_log': vlog, 'fs_log': flog, 'link_log': lg('p', p)}
def actives(p):
    k = C.c_int(); glGetProgramiv(p, 0x8B86, C.byref(k)); o = {}
    for i in range(k.value):
        ln, sz, ty = C.c_int(), C.c_int(), u32(); b = C.create_string_buffer(256); glGetActiveUniform(p, i, 256, C.byref(ln), C.byref(sz), C.byref(ty), b); o[b.value.decode().split('[')[0]] = ty.value
    return o
TY = {0x1406: 'float', 0x8B52: 'vec4', 0x1404: 'int', 0x1405: 'uint', 0x8B5E: 'sampler2D', 0x8DCA: 'isampler2D', 0x8DD2: 'usampler2D', 0x8DC1: 'sampler2DArray', 0x8B62: 'sampler2DShadow', 0x8B5C: 'mat4', 0x8B51: 'vec3', 0x8B50: 'vec2', 0x8DD7: 'usampler2DArray'}

# ---- 2. the five programs
for nme in PROGS:
    L = link(rd(nme + '.vert'), rd(nme + '.frag')); a = actives(L['prog']); blocks = {b: glGetUniformBlockIndex(L['prog'], b.encode()) != 0xFFFFFFFF for b in ('FU', 'PalU')}
    res['programs'][nme] = {'ok': L['ok'], 'vs_log': L['vs_log'][:2000], 'fs_log': L['fs_log'][:2000], 'link_log': L['link_log'][:2000], 'active': {k: TY.get(t, hex(t)) for k, t in sorted(a.items())}, 'blocks': blocks}; 
    print(f"{nme}: {'linked' if L['ok'] else 'FAILED'}; {len(a)} active uniforms; blocks {blocks}" + ('' if L['ok'] else '\n' + '\n'.join([L['vs_log'], L['fs_log'], L['link_log']])))
    if not L['ok']: fail(f'{nme} did not compile and link')
    for w in ('vs_log', 'fs_log', 'link_log'):
        if L[w] and L['ok']: print(f'  note ({nme} {w}): {L[w][:300]}')

# ---- 3. the uniforms gl.mjs looks up and sets
src_gl = open(os.path.join(BT, 'app/src/crowd/gl.mjs'), encoding='utf8').read()
set_names = set(re.findall(r"set\('(\w+)'", src_gl)); loc_names = set(re.findall(r"getUniformLocation\([^,)]+,\s*'(\w+)'\)", src_gl))
SAMPLERS = ['uBones', 'uPoseL0', 'uInst', 'uVarInfo', 'uVarPal', 'uPal', 'uImp', 'uImpMeta']
if set_names != set(SAMPLERS): fail(f'gl.mjs sets {sorted(set_names)}, this test expects {SAMPLERS}')
if not {'uTpf', 'uR', 'uAo'} <= loc_names: fail(f'gl.mjs looks up {sorted(loc_names)}, this test expects uTpf, uR and uAo among them')
EXPECT = {                                          # the program, the uniform, the GLSL type gl.mjs's setter needs: every one of them must be ACTIVE (the browser skips a null location without a word)
  'c-mid': {'uTpf': 'int', 'uAo': 'float', 'uBones': 'sampler2D'}, 'c-midS': {'uTpf': 'int', 'uBones': 'sampler2D'}, 'c-near': {'uAo': 'float', 'uPoseL0': 'sampler2D'}, 'c-nearS': {'uPoseL0': 'sampler2D'},
  'c-imp': {'uR': 'vec4', 'uImp': 'sampler2DArray', 'uImpMeta': 'sampler2D'}}
for pn, want in EXPECT.items():
    act = res['programs'][pn]['active']
    for u, t in want.items():
        ok = act.get(u) == t; res['uniforms'][f'{pn}.{u}'] = act.get(u, 'INACTIVE')
        if not ok: fail(f'{pn}: uniform {u} should be active as {t}, found {act.get(u, "inactive")}')
print('uniforms:', {k: v for k, v in res['uniforms'].items()})
for pn in PROGS:                                    # every sampler gl.mjs binds by uniform1i that the program has active is an integer-settable type
    for u in SAMPLERS:
        t = res['programs'][pn]['active'].get(u)
        if t and not (t.endswith('sampler2D') or t.endswith('Array') or t == 'int'): fail(f'{pn}: {u} is {t}, gl.mjs sets it with uniform1i')

# ---- 4. negative controls (the same context must refuse these)
def control(name, vs, fs, want):
    L = link(vs, fs); got = 'accepted' if L['ok'] else 'refused'; msg = (L['vs_log'] + L['fs_log'] + L['link_log']).replace('\n', ' ')[:200]; res['controls'][name] = f'{got}: {msg}'
    if got != want: fail(f'control "{name}" was {got}, expected {want}')
    return L
VS_OK = pre + head + 'flat out vec3 vFade; uniform uint uP; uniform uint uFig; void main() { vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0); vFade = fadeOf(uP, uFig); }'
FS_OK = pre + head + 'flat in vec3 vFade; out vec4 o; void main() { if (!fadeKeep(vFade, gl_FragCoord.xy)) discard; o = vec4(1.0); }'
control('the dither test program itself is accepted', VS_OK, FS_OK, 'accepted')
control('a type error in the fade decode is refused', VS_OK.replace('vFade = fadeOf(uP, uFig);', 'vFade = 1.0;'), FS_OK, 'refused')
control('an unknown identifier in the fade test is refused', VS_OK, FS_OK.replace('fadeKeep(vFade', 'fadeKeepX(vFade'), 'refused')
control('a varying the fragment shader reads and the vertex shader does not declare is refused at link', VS_OK.replace('flat out vec3 vFade;', 'flat out vec3 vFadeX;').replace('vFade = fadeOf', 'vFadeX = fadeOf'), FS_OK, 'refused')
control('an interpolation qualifier that differs between the stages is refused', VS_OK.replace('flat out vec3 vFade;', 'out vec3 vFade;'), FS_OK, 'refused')
control('an integer varying without flat is refused', VS_OK.replace('flat out vec3 vFade;', 'flat out vec3 vFade; out uint vBad;').replace('vFade = fadeOf', 'vBad = uP; vFade = fadeOf'), FS_OK.replace('out vec4 o;', 'in uint vBad; out vec4 o;'), 'refused')
Lunused = control('a program that does not use a uniform it declares is accepted', VS_OK.replace('uniform uint uP;', 'uniform uint uP; uniform vec4 uR;'), FS_OK, 'accepted')
act = actives(Lunused['prog']); res['controls']['an unused uniform is not active (the failure the uniform check guards against)'] = 'inactive' if 'uR' not in act else 'ACTIVE'
if 'uR' in act: fail('control: an unused uniform was reported active, the uniform check cannot see the dropped uniform')

# the same refusals on the SHIPPED programs: a mutation of the real text (each one a mistake that could be made in shaders-gl.mjs) must not link
MUT = [('c-mid', 'vert', 'fadeOf(iI.w, iI.x)', 'fadeOf(iI.w)', 'the fade decode called with one argument'), ('c-near', 'frag', 'fadeKeep(vFade, gl_FragCoord.xy)', 'fadeKeep(vFade, gl_FragCoord)', 'the fade test given a vec4 for the pixel'),
       ('c-imp', 'frag', 'flat in vec4 vF;', 'in vec4 vF;', 'the impostor fade varying without flat in the fragment shader'), ('c-imp', 'vert', 'bandS(dist / fsc, uR.x, b)', 'bandS(dist / fsc, uR.x)', 'bandS called with two arguments'),
       ('c-mid', 'vert', 'flat out vec3 vFade;', 'flat out vec2 vFade;', 'the fade varying narrowed to a vec2 in the vertex shader')]
for pn, stage, old, new, what in MUT:
    vs_, fs_ = rd(pn + '.vert'), rd(pn + '.frag'); tx = vs_ if stage == 'vert' else fs_
    if tx.count(old) < 1: fail(f'mutation control {what}: the text {old!r} is not in {pn}.{stage} (the shaders changed, update this list)'); continue
    tx = tx.replace(old, new, 1); L = link(tx, fs_) if stage == 'vert' else link(vs_, tx); res['controls'][f'the shipped {pn} with {what} is refused'] = ('refused: ' + (L['vs_log'] + L['fs_log'] + L['link_log']).replace('\n', ' ')[:110]) if not L['ok'] else 'ACCEPTED'
    if L['ok']: fail(f'mutation control: the shipped {pn} with {what} was accepted')

# ---- 5. the dither, run
FW, FH, WIN = ref['frame'][0], ref['frame'][1], ref['win']
fb, rb = u32(), u32(); glGenFramebuffers(1, C.byref(fb)); glBindFramebuffer(0x8D40, fb.value); glGenRenderbuffers(1, C.byref(rb)); glBindRenderbuffer(0x8D41, rb.value); glRenderbufferStorage(0x8D41, 0x8058, FW, FH)
glFramebufferRenderbuffer(0x8D40, 0x8CE0, 0x8D41, rb.value); assert glCheckFramebufferStatus(0x8D40) == 0x8CD5, 'framebuffer incomplete'
glViewport(0, 0, FW, FH); glEnable(0xC11)
def make_draw(vs, fs):                       # a draw function (P word, figure, window) -> the kept mask in GL order, for a program made of these two sources
    LP = link(vs, fs); assert LP['ok'], LP; P = LP['prog']; uP, uFig = glGetUniformLocation(P, b'uP'), glGetUniformLocation(P, b'uFig'); assert uP >= 0 and uFig >= 0
    def draw(Pword, fig, x0, y0):
        glUseProgram(P); glScissor(x0, y0, WIN, WIN); glClearColor(0, 0, 0, 0); glClear(0x4000); glUniform1ui(uP, Pword); glUniform1ui(uFig, fig); glDrawArrays(4, 0, 3)
        buf = (C.c_ubyte * (WIN * WIN * 4))(); glReadPixels(x0, y0, WIN, WIN, 0x1908, 0x1401, buf); return bytes(buf)[0::4]
    return draw
draw = make_draw(VS_OK, FS_OK)
info, errs, ctl = D.battery(ref, draw)
res['dither'].update(info); res['controls'].update(ctl)
for e in errs: fail(e)
# the comparison must see a transcription error between the port and the shader: the same programs with another constant in ign
bad = lambda t: t.replace('0.00583715', '0.0583715', 1); assert bad(FS_OK) != FS_OK            # ign: the vertical weight of the gradient, off by a factor of ten
_, errs_bad, _ = D.battery(ref, make_draw(bad(VS_OK), bad(FS_OK)), log=lambda *a: None)
res['controls']['a wrong constant in ign (0.0583715 for 0.00583715) is caught by the dither comparison'] = ('caught: ' + errs_bad[0][:140]) if errs_bad else 'NOT CAUGHT'
if not errs_bad: fail('control: a changed constant of ign was not caught by the dither comparison')
res['ok'] = not res['errors']
res['gl_error_at_end'] = glGetError(); res['ok'] = res['ok'] and res['gl_error_at_end'] == 0
if res['gl_error_at_end']: print('GL error at the end:', res['gl_error_at_end'])
if arg('--out'): json.dump(res, open(arg('--out'), 'w'), indent=1)
cleanup(); print('RESULT', 'ok' if res['ok'] else 'FAILED'); sys.exit(0 if res['ok'] else 1)
