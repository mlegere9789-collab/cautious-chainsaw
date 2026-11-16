# Native check of the GLSL ES 3.00 programs of the vegetation layer (app/src/ext/vegetation/gl.mjs and shell.mjs, with the prototype's preamble) on a REAL OpenGL ES 3.x context: Mesa's llvmpipe (software), reached through Xvfb and GLX
# with the python standard library only (ctypes). It is a second compiler for the programs that the browser run (tests/vegetation-browser.mjs) compiles through ANGLE, and the first one that has seen the text since the sway of the wind, the
# fifth texel of the state (the share of trees kept) and the standing crop were added: nothing here is a browser, a WebGL2 call, a picture or a real-GPU result.
#   1. compile and link the four programs (veg-decal, veg-tree, veg-tree-shadow, veg-shell) exactly as GLRenderer.prog() assembles them;
#   2. the uniforms that gl.mjs looks up and sets (a uniform the compiler drops makes getUniformLocation return null and the browser skips the set without a word) are active, with the GLSL type of the setter used;
#   3. negative controls: the same context refuses a type error in the trees' text and a varying the vertex shader does not write, and shows an unused uniform as inactive (so a pass above is not a context that accepts anything).
#   python3 -I docs/battle-theatre/app/tests/vegetation-glsl.py [--out report.json] [--display :N]      (without --display it starts its own Xvfb and stops it at the end)
# Needs Xvfb (found on PATH) and the system's Mesa (libGL, libX11); node for the dump helper. Exit 0 when every check passed and every control behaved. About 5 s of CPU.
import os, sys, json, subprocess, tempfile, shutil, ctypes as C
HERE = os.path.dirname(os.path.abspath(__file__))
def arg(k, d=None): return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
res = {'implementation': 'Mesa (system) over GLX on Xvfb', 'software': True, 'errors': [], 'programs': {}, 'controls': {}, 'uniforms': {}}
def fail(msg): res['errors'].append(msg); print('FAIL', msg)

# ---- 0. the sources, written by node
tmp = tempfile.mkdtemp(prefix='veg-glsl-'); out = os.path.join(tmp, 'src'); os.makedirs(out)
r = subprocess.run(['node', os.path.join(HERE, 'vegetation-glsl-dump.mjs'), out], capture_output=True, text=True)
if r.returncode: print(r.stdout, r.stderr); sys.exit(2)
print(r.stdout.strip())
rd = lambda n: open(os.path.join(out, n), encoding='utf8').read()
PROGS = ['veg-decal', 'veg-tree', 'veg-tree-shadow', 'veg-shell']; SET = json.loads(rd('uniforms.json'))

# ---- 1. a display and a GLES 3.x context (as crowd-lod-glsl.py)
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
u32, i32, cp = C.c_uint, C.c_int, C.c_char_p
glGetString = F('glGetString', cp, u32)
glCreateShader = F('glCreateShader', u32, u32); glShaderSource = F('glShaderSource', None, u32, i32, C.POINTER(cp), C.POINTER(i32)); glCompileShader = F('glCompileShader', None, u32)
glGetShaderiv = F('glGetShaderiv', None, u32, u32, C.POINTER(i32)); glGetShaderInfoLog = F('glGetShaderInfoLog', None, u32, i32, C.POINTER(i32), cp)
glCreateProgram = F('glCreateProgram', u32); glAttachShader = F('glAttachShader', None, u32, u32); glLinkProgram = F('glLinkProgram', None, u32)
glGetProgramiv = F('glGetProgramiv', None, u32, u32, C.POINTER(i32)); glGetProgramInfoLog = F('glGetProgramInfoLog', None, u32, i32, C.POINTER(i32), cp)
glGetActiveUniform = F('glGetActiveUniform', None, u32, u32, i32, C.POINTER(i32), C.POINTER(i32), C.POINTER(u32), cp); glGetUniformLocation = F('glGetUniformLocation', i32, u32, cp)
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
TY = {0x1406: 'float', 0x8B52: 'vec4', 0x1404: 'int', 0x1405: 'uint', 0x8B5E: 'sampler2D', 0x8DCA: 'isampler2D', 0x8DD2: 'usampler2D', 0x8DC1: 'sampler2DArray', 0x8B62: 'sampler2DShadow', 0x8B5C: 'mat4', 0x8B51: 'vec3', 0x8B50: 'vec2'}

# ---- 2. the four programs
linked = {}
for nme in PROGS:
    L = link(rd(nme + '.vert'), rd(nme + '.frag')); linked[nme] = L; a = actives(L['prog'])
    res['programs'][nme] = {'ok': L['ok'], 'vs_log': L['vs_log'][:2000], 'fs_log': L['fs_log'][:2000], 'link_log': L['link_log'][:2000], 'active': {k: TY.get(t, hex(t)) for k, t in sorted(a.items())}}
    print(f"{nme}: {'linked' if L['ok'] else 'FAILED'}; {len(a)} active uniforms" + ('' if L['ok'] else '\n' + '\n'.join([L['vs_log'], L['fs_log'], L['link_log']])))
    if not L['ok']: fail(f'{nme} did not compile and link')
    for w in ('vs_log', 'fs_log', 'link_log'):
        if L[w] and L['ok']: print(f'  note ({nme} {w}): {L[w][:300]}')

# ---- 3. the uniforms gl.mjs looks up and sets, with the type of its setter (gl.uniform1i for a sampler unit, 1f, 4f, 3fv)
EXPECT = {
  'veg-decal': {'uVegState': 'sampler2D', 'uVisit': 'sampler2D', 'uT': 'float', 'uGrid': 'vec4', 'uOverlay': 'float', 'uVisitOn': 'float', 'uTierCol': 'vec3'},
  'veg-tree': {'uVegState': 'sampler2D', 'uFar': 'float', 'uTrunk': 'float', 'uSpA': 'vec3', 'uSpB': 'vec3', 'uWind': 'vec4', 'uSway': 'float'},
  'veg-tree-shadow': {'uVegState': 'sampler2D', 'uFar': 'float'},
  'veg-shell': {'uVegState': 'sampler2D', 'uVisit': 'sampler2D', 'uT': 'float', 'uGrid': 'vec4', 'uVisitOn': 'float', 'uRange': 'float', 'uLayers': 'float', 'uWind': 'vec4', 'uSway': 'float'}}
# a uniform the layer sets that a program does not read: the shadow pass sets uTrunk = 0, but its text throws the trunk away itself (m.z < 0.5 gives HID), so the compiler drops it and the set goes to a null location, which WebGL
# ignores. It must stay so: if the text started to read it the expectation would have to be written again.
DROPPED_OK = {'veg-tree-shadow': {'uTrunk': 'the text discards the trunk part itself'}}
for pn, want in EXPECT.items():
    if set(want) | set(DROPPED_OK.get(pn, {})) != set(SET[pn]): fail(f'{pn}: the dump names {sorted(SET[pn])}, this test expects {sorted(set(want) | set(DROPPED_OK.get(pn, {})))}')
    for u, why in DROPPED_OK.get(pn, {}).items():
        v = rd(pn + '.vert'); ok = u not in res['programs'][pn]['active'] and 'm.z < 0.5) { gl_Position = HID; return; }' in v; res['uniforms'].setdefault(pn, {})[u] = {'expected': 'inactive by design', 'why': why, 'ok': ok}
        if not ok: fail(f'{pn}: {u} should be dropped by the compiler because {why}, and it is not (or the text changed)')
    act = res['programs'][pn]['active']; res['uniforms'].setdefault(pn, {})
    for u, ty in want.items():
        ok = act.get(u) == ty; res['uniforms'][pn][u] = {'expected': ty, 'active': act.get(u)}
        if not ok: fail(f'{pn}: {u} is {act.get(u) or "not active (the browser would skip the set without a word)"}, the setter in gl.mjs needs {ty}')
    print(f'{pn}: ' + ('every uniform the layer sets is active with the type of its setter' if all(res['uniforms'][pn][u]['expected'] == res['uniforms'][pn][u]['active'] for u in want) else 'SOME UNIFORMS WRONG') + ''.join(f'; {u} is dropped by design ({why})' for u, why in DROPPED_OK.get(pn, {}).items()))

# ---- 4. negative controls: the context is not one that accepts anything
tree_vs, tree_fs = rd('veg-tree.vert'), rd('veg-tree.frag')
def ctl(name, ok, detail=''):
    res['controls'][name] = {'ok': bool(ok), 'detail': detail}; print(('control ok   ' if ok else 'CONTROL FAIL ') + name + (' ' + detail if detail else ''))
    if not ok: fail('control: ' + name)
i = tree_vs.rindex('void main()'); j = tree_vs.index('{', i)
bad = tree_vs[:j + 1] + ' float zz = vec2(1.0); ' + tree_vs[j + 1:]; L = link(bad, tree_fs); ctl('a type error in the trees\' vertex text is refused', not L['vs_ok'] and not L['ok'], L['vs_log'][:120])
bad_f = tree_fs.replace('void main()', 'in float vNoSuchVarying; void main() { float q = vNoSuchVarying; ', 1) if 'void main() {' not in tree_fs else tree_fs.replace('void main() {', 'in float vNoSuchVarying; void main() { float q = vNoSuchVarying;', 1)
L = link(tree_vs, bad_f); ctl('a varying the vertex text does not write is refused at link', not L['ok'], (L['fs_log'] or L['link_log'])[:120])
unused = tree_vs.replace('void main()', 'uniform float uUnusedControl; void main()', 1); L = link(unused, tree_fs); a = actives(L['prog']) if L['ok'] else {}
ctl('an unused uniform is shown as inactive (so the check of section 3 can fail)', L['ok'] and 'uUnusedControl' not in a and glGetUniformLocation(L['prog'], b'uUnusedControl') == -1, f"ok={L['ok']}")

res['ok'] = not res['errors']
if arg('--out'): json.dump(res, open(arg('--out'), 'w'), indent=1)
cleanup()
print('RESULT', 'ok' if res['ok'] else 'FAILED: ' + '; '.join(res['errors']))
sys.exit(0 if res['ok'] else 1)
