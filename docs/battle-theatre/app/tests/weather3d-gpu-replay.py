"""Harness (not a gate): the weather and effects pass of the WebGPU path on a SECOND WebGPU implementation.

Chrome's WebGPU (Dawn, the Tint compiler) is the implementation the layer was built and validated on. This script runs the same WGSL, with the same pipeline state and the same encoding, through wgpu-native
(the implementation behind Firefox's WebGPU: the naga compiler and wgpu-core's validation) on SwiftShader's Vulkan, and, when a capture of Chrome's frames is given, replays each captured pass on it and compares
the result with what Chrome produced. SOFTWARE ONLY: both implementations run on a CPU rasteriser here; nothing in this script is a real-GPU result, and a pass that agrees on two compilers on a CPU says
nothing about a GPU vendor's driver.

  1. the compile and build check (always): the three modules and the optional compute module compile, the four pipelines build with the prototype's real group 0 layout, four negative controls are refused
     (a type error, an unknown name, a texture binding of the wrong sample type, a uniform block hidden from the fragment stage), so the positive result is not vacuous.
  2. the replay (for each captured case): the frame block, the layer's uniform blocks, the effect buffers, the scene depth and the colour target BEFORE the pass are uploaded, the pass is encoded the way gpu.mjs
     encodes it (colour loaded, depth attached read-only and sampled in the same pass, weather multiply and add, then the sprites), and the colour target AFTER the pass is compared with Chrome's (rgba16float,
     per channel, in HDR units: maximum, mean, the 99.99th percentile, the share of texels that differ by more than 1/256, the share that are bit-identical, and how much the pass changed the picture at all).
  3. self-test (--selftest): the replay path on arbitrary numbers at a small size, to prove the machinery encodes without a validation error when no capture is at hand.

  pip install --target <dir> wgpu            # wgpu-py (wgpu-native inside); not part of the product, not vendored
  VK_ICD_FILENAMES=<a SwiftShader Vulkan ICD json> python3 -I docs/battle-theatre/app/tests/weather3d-gpu-replay.py --wgpu-path <dir> --capture <captureDir> [--out report.json] [case ...]
  Capture: tools/horde/bench.sh node docs/battle-theatre/app/tests/weather3d-gpu-capture.mjs <captureDir>
Exit code 1 when the build check, a control or a replay finds a problem. The limits below are the harness's own (a replay is "close" when no channel differs by more than LIMIT_MAX and the mean difference is under LIMIT_MEAN).
"""
import os, sys, json, glob, math, argparse

ap = argparse.ArgumentParser()
ap.add_argument('--wgpu-path', help='directory holding the wgpu package (pip install --target)'); ap.add_argument('--capture', help='directory written by weather3d-gpu-capture.mjs'); ap.add_argument('--wgsl', help='directory with the *.wgsl files (default: <capture>/wgsl)')
ap.add_argument('--out', help='write the report as JSON here'); ap.add_argument('--selftest', action='store_true'); ap.add_argument('--no-controls', action='store_true'); ap.add_argument('--png', action='store_true', help='write a PNG of each replayed pass next to its capture')
ap.add_argument('cases', nargs='*')
A = ap.parse_args()
if A.wgpu_path: sys.path.insert(0, A.wgpu_path)
os.environ.setdefault('VK_ICD_FILENAMES', '/opt/pw-browsers/chromium-1243/chrome-linux64/vk_swiftshader_icd.json')
import numpy as np
import wgpu

HERE = os.path.dirname(os.path.abspath(__file__))
PROTO = os.path.normpath(os.path.join(HERE, '..', '..', 'render', 'prototype', 'data'))
LIMIT_MAX, LIMIT_MEAN = 0.05, 0.002          # HDR units (display white is about 1); harness values, not project gates
S, BU, TU = wgpu.ShaderStage, wgpu.BufferUsage, wgpu.TextureUsage
HDR, DF = 'rgba16float', 'depth32float'
report = {'implementation': 'wgpu-native via wgpu-py ' + wgpu.__version__, 'software': True, 'problems': [], 'build': {}, 'controls': {}, 'cases': {}}
problems = report['problems']

# ------------------------------------------------------------------------------------------------ device
ad = wgpu.gpu.request_adapter_sync(); report['adapter'] = {k: (v if isinstance(v, (str, int)) else str(v)) for k, v in dict(ad.info).items()}
feats = [f for f in ('float32-filterable',) if f in ad.features]; report['features_requested'] = feats
if 'float32-filterable' not in feats: problems.append('the adapter has no float32-filterable: the prototype\'s height texture binding cannot be built')
dev = ad.request_device_sync(required_features=feats)

def guarded(name, fn):
    """wgpu-py raises a validation error at the call that caused it (this version has no device error scopes)."""
    try: return fn()
    except Exception as e: problems.append(f'{name}: {type(e).__name__}: {str(e)[:700]}'); return None

def read_wgsl(n):
    d = A.wgsl or (os.path.join(A.capture, 'wgsl') if A.capture else None)
    if not d: raise SystemExit('--wgsl <dir> or --capture <dir> is needed for the shader text')
    return open(os.path.join(d, n + '.wgsl')).read()

# ------------------------------------------------------------------------------------------------ the build check
mods = {}
for n in ('weather3d-mul', 'weather3d-add', 'fx3d-sprites', 'fx3d-cull-compute'):
    code = read_wgsl(n); m = guarded('module ' + n, lambda: dev.create_shader_module(label=n, code=code)); mods[n] = m; report['build'].setdefault('modules', {})[n] = bool(m)
    try: info = m.get_compilation_info_sync() if m else []; report['build'].setdefault('compiler_messages', {})[n] = [str(x) for x in info][:10]
    except Exception as e: report['build'].setdefault('compiler_messages', {})[n] = 'not available: ' + str(e)[:100]
VF = S.VERTEX | S.FRAGMENT
# the prototype's group 0 (render/prototype/src/webgpu.mjs buildPipelines) and this layer's own groups (app/src/weather3d/gpu.mjs _build), entry for entry
g0 = guarded('bind group layout g0', lambda: dev.create_bind_group_layout(label='g0L', entries=[
    {'binding': 0, 'visibility': VF, 'buffer': {'type': 'uniform', 'has_dynamic_offset': True, 'min_binding_size': 512}},
    *[{'binding': b, 'visibility': S.VERTEX, 'buffer': {'type': 'read-only-storage'}} for b in (1, 2, 3)],
    {'binding': 4, 'visibility': VF, 'texture': {'sample_type': 'float'}}, {'binding': 5, 'visibility': VF, 'sampler': {'type': 'filtering'}},
    {'binding': 6, 'visibility': S.FRAGMENT, 'texture': {'sample_type': 'depth', 'view_dimension': '2d-array'}}, {'binding': 7, 'visibility': S.FRAGMENT, 'sampler': {'type': 'comparison'}},
    {'binding': 8, 'visibility': S.FRAGMENT, 'texture': {'sample_type': 'float'}}, {'binding': 9, 'visibility': VF, 'buffer': {'type': 'uniform'}},
    {'binding': 10, 'visibility': S.VERTEX, 'buffer': {'type': 'read-only-storage'}}, {'binding': 11, 'visibility': S.FRAGMENT, 'sampler': {'type': 'filtering'}}]))
bglW = guarded('bind group layout W', lambda: dev.create_bind_group_layout(label='weather3d.bglW', entries=[{'binding': 0, 'visibility': S.FRAGMENT, 'buffer': {'type': 'uniform'}}, {'binding': 1, 'visibility': S.FRAGMENT, 'texture': {'sample_type': 'depth'}}]))
bglF = guarded('bind group layout F', lambda: dev.create_bind_group_layout(label='fx3d.bgl', entries=[{'binding': 0, 'visibility': VF, 'buffer': {'type': 'uniform'}}, *[{'binding': b, 'visibility': S.VERTEX, 'buffer': {'type': 'read-only-storage'}} for b in (1, 2, 3)], {'binding': 4, 'visibility': S.FRAGMENT, 'texture': {'sample_type': 'depth'}}]))
plW = guarded('pipeline layout W', lambda: dev.create_pipeline_layout(label='weather3d.layout', bind_group_layouts=[g0, bglW])); plF = guarded('pipeline layout F', lambda: dev.create_pipeline_layout(label='fx3d.layout', bind_group_layouts=[bglF]))
def blend(c, a): return {'color': {'operation': 'add', 'src_factor': c[0], 'dst_factor': c[1]}, 'alpha': {'operation': 'add', 'src_factor': a[0], 'dst_factor': a[1]}}
BL = {'mul': blend(('zero', 'src'), ('zero', 'one')), 'add': blend(('one', 'one'), ('zero', 'one')), 'fx': blend(('one', 'one-minus-src-alpha'), ('one', 'one-minus-src-alpha'))}
def full(n, mode, layout=plW):
    return dev.create_render_pipeline(label=n, layout=layout, vertex={'module': mods[n], 'entry_point': 'vs'}, fragment={'module': mods[n], 'entry_point': 'fs', 'targets': [{'format': HDR, 'blend': BL[mode]}]}, primitive={'topology': 'triangle-list'}, depth_stencil={'format': DF, 'depth_write_enabled': False, 'depth_compare': 'always'})
P = {}
P['mul'] = guarded('pipeline weather3d-mul', lambda: full('weather3d-mul', 'mul')); P['add'] = guarded('pipeline weather3d-add', lambda: full('weather3d-add', 'add'))
P['fx'] = guarded('pipeline fx3d-sprites', lambda: dev.create_render_pipeline(label='fx3d-sprites', layout=plF, vertex={'module': mods['fx3d-sprites'], 'entry_point': 'vs'}, fragment={'module': mods['fx3d-sprites'], 'entry_point': 'fs', 'targets': [{'format': HDR, 'blend': BL['fx']}]}, primitive={'topology': 'triangle-strip', 'cull_mode': 'none'}, depth_stencil={'format': DF, 'depth_write_enabled': False, 'depth_compare': 'less'}))
cull = guarded('pipeline cullCount (optional compute, not wired)', lambda: dev.create_compute_pipeline(label='cullCount', layout='auto', compute={'module': mods['fx3d-cull-compute'], 'entry_point': 'cullCount'}))
report['build']['pipelines'] = {'weather3d-mul': bool(P['mul']), 'weather3d-add': bool(P['add']), 'fx3d-sprites': bool(P['fx']), 'fx3d-cullCount (compute, optional, not wired)': bool(cull)}
for k, v in {**report['build']['modules'], **report['build']['pipelines']}.items():
    if not v: problems.append('did not build: ' + k)

def refused(name, fn):
    try: fn(); report['controls'][name] = 'ACCEPTED'; problems.append('control not refused: ' + name)
    except Exception as e: report['controls'][name] = 'refused: ' + str(e).replace('\n', ' ')[:140]
if not A.no_controls and mods.get('weather3d-mul'):
    good = read_wgsl('weather3d-mul')
    refused('a type error in the WGSL (a vec3f variable given a f32)', lambda: dev.create_shader_module(label='bad1', code=good.replace('var Dm = vec3f(1.0);', 'var Dm = 1.0;', 1)))
    refused('an unknown member in the WGSL (W.floor for W.floorC)', lambda: dev.create_shader_module(label='bad2', code=good.replace('W.floorC.xyz);', 'W.floor.xyz);', 1)))
    badW = dev.create_bind_group_layout(label='bad.bglW', entries=[{'binding': 0, 'visibility': S.FRAGMENT, 'buffer': {'type': 'uniform'}}, {'binding': 1, 'visibility': S.FRAGMENT, 'texture': {'sample_type': 'float'}}])
    refused('a layout that declares the scene depth as a float texture (the shader reads a depth texture)', lambda: full('weather3d-mul', 'mul', dev.create_pipeline_layout(label='bad.layout', bind_group_layouts=[g0, badW])))
    hid = dev.create_bind_group_layout(label='bad.bglW2', entries=[{'binding': 0, 'visibility': S.VERTEX, 'buffer': {'type': 'uniform'}}, {'binding': 1, 'visibility': S.FRAGMENT, 'texture': {'sample_type': 'depth'}}])
    refused('a layout whose weather uniform block is hidden from the fragment stage', lambda: full('weather3d-mul', 'mul', dev.create_pipeline_layout(label='bad.layout2', bind_group_layouts=[g0, hid])))

# ------------------------------------------------------------------------------------------------ replay machinery
DEPTH_UP = '''
@group(0) @binding(0) var src: texture_2d<f32>;
struct VO { @builtin(position) pos: vec4f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO { let p = vec2f(select(-1.0, 3.0, i == 1u), select(-1.0, 3.0, i == 2u)); var o: VO; o.pos = vec4f(p, 0.0, 1.0); return o; }
@fragment fn fs(@builtin(position) pos: vec4f) -> @builtin(frag_depth) f32 { return textureLoad(src, vec2i(pos.xy), 0).r; }'''
def depth_upload_pipeline():
    m = dev.create_shader_module(label='replay.depth-upload', code=DEPTH_UP)
    bgl = dev.create_bind_group_layout(label='replay.depth-upload', entries=[{'binding': 0, 'visibility': S.FRAGMENT, 'texture': {'sample_type': 'unfilterable-float'}}])
    return bgl, dev.create_render_pipeline(label='replay.depth-upload', layout=dev.create_pipeline_layout(bind_group_layouts=[bgl]), vertex={'module': m, 'entry_point': 'vs'}, fragment={'module': m, 'entry_point': 'fs', 'targets': []},
                                           primitive={'topology': 'triangle-list'}, depth_stencil={'format': DF, 'depth_write_enabled': True, 'depth_compare': 'always'})

_height = {}
def height_texels():
    """The terrain heights exactly as render/prototype/src/world.mjs loadTerrain makes them (float64 arithmetic, stored as float32), and the FNV hash over 32-bit words that the capture sends."""
    if 'a' not in _height:
        meta = json.load(open(os.path.join(PROTO, 'terrain.json'))); N = meta['N']; u16 = np.fromfile(os.path.join(PROTO, 'height.bin'), dtype='<u2')[:N * N].astype(np.float64)
        sc = (meta['hmax'] - meta['hmin']) / 65535; h = ((meta['hmin'] + u16 * sc) - 150).astype(np.float32); _height['a'] = (N, h)
    return _height['a']
def fnv32(a32):
    h = 0x811c9dc5
    for w in a32.view(np.uint32).tolist(): h = ((h ^ w) * 16777619) & 0xffffffff
    return h

def storage(label, raw, extra=wgpu.BufferUsage.STORAGE):
    n = max(16, (len(raw) + 3) & ~3); b = dev.create_buffer(label=label, size=n, usage=extra | BU.COPY_DST)
    if len(raw): dev.queue.write_buffer(b, 0, raw)
    return b

class Replay:
    def __init__(self, N, heights):
        self.sam_clamp = dev.create_sampler(mag_filter='linear', min_filter='linear', address_mode_u='clamp-to-edge', address_mode_v='clamp-to-edge')
        self.sam_cmp = dev.create_sampler(compare='less', mag_filter='linear', min_filter='linear'); self.sam_wrap = dev.create_sampler(mag_filter='linear', min_filter='linear', mipmap_filter='linear', address_mode_u='repeat', address_mode_v='repeat')
        self.height = dev.create_texture(label='height r32f', size=(N, N, 1), format='r32float', usage=TU.TEXTURE_BINDING | TU.COPY_DST)
        dev.queue.write_texture({'texture': self.height}, heights.tobytes(), {'offset': 0, 'bytes_per_row': N * 4, 'rows_per_image': N}, (N, N, 1))
        # the unused bindings of the prototype's group 0 (the weather shader declares only 0, 4 and 5; the layout has all twelve)
        self.dummy_buf = [dev.create_buffer(size=16, usage=BU.STORAGE | BU.COPY_DST) for _ in range(4)]; self.dummy_u = dev.create_buffer(size=16, usage=BU.UNIFORM | BU.COPY_DST)
        self.dummy_shadow = dev.create_texture(size=(1, 1, 2), format=DF, usage=TU.TEXTURE_BINDING).create_view(dimension='2d-array'); self.dummy_aerial = dev.create_texture(size=(1, 1, 1), format='rgba8unorm', usage=TU.TEXTURE_BINDING).create_view()
        self.depth_bgl, self.depth_pipe = depth_upload_pipeline()
    def run(self, c, w, h):
        """c: dict of raw bytes: pre, depth, fu, wu, fx, events, cum, wind; nSprites, nEvents. Returns the colour target after the pass (float16, w*h*4)."""
        q = dev.queue
        hdr = dev.create_texture(label='hdr', size=(w, h, 1), format=HDR, usage=TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING | TU.COPY_SRC | TU.COPY_DST)
        depth = dev.create_texture(label='depth', size=(w, h, 1), format=DF, usage=TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING)
        dtmp = dev.create_texture(label='depth values', size=(w, h, 1), format='r32float', usage=TU.TEXTURE_BINDING | TU.COPY_DST)
        q.write_texture({'texture': hdr}, c['pre'], {'offset': 0, 'bytes_per_row': w * 8, 'rows_per_image': h}, (w, h, 1)); q.write_texture({'texture': dtmp}, c['depth'], {'offset': 0, 'bytes_per_row': w * 4, 'rows_per_image': h}, (w, h, 1))
        hdrV, depthV, depthRT = hdr.create_view(), depth.create_view(aspect='depth-only'), depth.create_view()
        ub = dev.create_buffer(label='frame uniforms', size=512, usage=BU.UNIFORM | BU.COPY_DST); q.write_buffer(ub, 0, c['fu'])
        bg0 = dev.create_bind_group(layout=g0, entries=[{'binding': 0, 'resource': {'buffer': ub, 'offset': 0, 'size': 512}}, *[{'binding': b, 'resource': {'buffer': self.dummy_buf[i], 'offset': 0, 'size': 16}} for i, b in enumerate((1, 2, 3))],
            {'binding': 4, 'resource': self.height.create_view()}, {'binding': 5, 'resource': self.sam_clamp}, {'binding': 6, 'resource': self.dummy_shadow}, {'binding': 7, 'resource': self.sam_cmp}, {'binding': 8, 'resource': self.dummy_aerial},
            {'binding': 9, 'resource': {'buffer': self.dummy_u, 'offset': 0, 'size': 16}}, {'binding': 10, 'resource': {'buffer': self.dummy_buf[3], 'offset': 0, 'size': 16}}, {'binding': 11, 'resource': self.sam_wrap}])
        ubW = dev.create_buffer(label='weather3d.uniforms', size=len(c['wu']), usage=BU.UNIFORM | BU.COPY_DST); q.write_buffer(ubW, 0, c['wu'])
        bgW = dev.create_bind_group(layout=bglW, entries=[{'binding': 0, 'resource': {'buffer': ubW, 'offset': 0, 'size': len(c['wu'])}}, {'binding': 1, 'resource': depthV}])
        ubF = dev.create_buffer(label='fx3d.uniforms', size=len(c['fx']), usage=BU.UNIFORM | BU.COPY_DST); q.write_buffer(ubF, 0, c['fx'])
        evB, cumB, windB = storage('events', c['events']), storage('cumulative', c['cum']), storage('wind', c['wind'])
        bgF = dev.create_bind_group(layout=bglF, entries=[{'binding': 0, 'resource': {'buffer': ubF, 'offset': 0, 'size': len(c['fx'])}}, {'binding': 1, 'resource': {'buffer': evB, 'offset': 0, 'size': evB.size}}, {'binding': 2, 'resource': {'buffer': cumB, 'offset': 0, 'size': cumB.size}},
            {'binding': 3, 'resource': {'buffer': windB, 'offset': 0, 'size': windB.size}}, {'binding': 4, 'resource': depthV}])
        bgUp = dev.create_bind_group(layout=self.depth_bgl, entries=[{'binding': 0, 'resource': dtmp.create_view()}])
        enc = dev.create_command_encoder()
        p = enc.begin_render_pass(color_attachments=[], depth_stencil_attachment={'view': depthRT, 'depth_clear_value': 1.0, 'depth_load_op': 'clear', 'depth_store_op': 'store'}); p.set_pipeline(self.depth_pipe); p.set_bind_group(0, bgUp); p.draw(3); p.end()
        # the layer's pass, as gpu.mjs encodes it: colour loaded, depth attached read-only and sampled in the same pass
        p = enc.begin_render_pass(color_attachments=[{'view': hdrV, 'load_op': 'load', 'store_op': 'store'}], depth_stencil_attachment={'view': depthRT, 'depth_read_only': True})
        p.set_bind_group(0, bg0, [0]); p.set_bind_group(1, bgW); p.set_pipeline(P['mul']); p.draw(3); p.set_pipeline(P['add']); p.draw(3)
        if c['nSprites'] > 0: p.set_pipeline(P['fx']); p.set_bind_group(0, bgF); p.draw(4, c['nSprites'])
        p.end()
        bpr = (w * 8 + 255) // 256 * 256; out = dev.create_buffer(label='readback', size=bpr * h, usage=BU.COPY_DST | BU.COPY_SRC)       # queue.read_buffer copies it to a staging buffer itself
        enc.copy_texture_to_buffer({'texture': hdr}, {'buffer': out, 'offset': 0, 'bytes_per_row': bpr, 'rows_per_image': h}, (w, h, 1)); q.submit([enc.finish()])
        raw = np.frombuffer(bytes(q.read_buffer(out)), dtype=np.uint8).reshape(h, bpr)[:, :w * 8]; res = np.ascontiguousarray(raw).view(np.float16).reshape(h, w, 4).astype(np.float32)
        for t in (hdr, depth, dtmp): t.destroy()
        return res

    def negative_usage_control(self, w, h):
        """The usage-scope rule the layer's pass relies on, proven by the validator in both directions: depth attached read-only AND sampled in one pass is accepted (run above); depth attached for WRITING and sampled in one pass must be refused."""
        depth = dev.create_texture(label='ctl depth', size=(w, h, 1), format=DF, usage=TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING); hdr = dev.create_texture(label='ctl hdr', size=(w, h, 1), format=HDR, usage=TU.RENDER_ATTACHMENT)
        ubW = dev.create_buffer(size=848, usage=BU.UNIFORM | BU.COPY_DST); ub = dev.create_buffer(size=512, usage=BU.UNIFORM | BU.COPY_DST)
        bgW = dev.create_bind_group(layout=bglW, entries=[{'binding': 0, 'resource': {'buffer': ubW, 'offset': 0, 'size': 848}}, {'binding': 1, 'resource': depth.create_view(aspect='depth-only')}])
        bg0 = dev.create_bind_group(layout=g0, entries=[{'binding': 0, 'resource': {'buffer': ub, 'offset': 0, 'size': 512}}, *[{'binding': b, 'resource': {'buffer': self.dummy_buf[i], 'offset': 0, 'size': 16}} for i, b in enumerate((1, 2, 3))],
            {'binding': 4, 'resource': self.height.create_view()}, {'binding': 5, 'resource': self.sam_clamp}, {'binding': 6, 'resource': self.dummy_shadow}, {'binding': 7, 'resource': self.sam_cmp}, {'binding': 8, 'resource': self.dummy_aerial},
            {'binding': 9, 'resource': {'buffer': self.dummy_u, 'offset': 0, 'size': 16}}, {'binding': 10, 'resource': {'buffer': self.dummy_buf[3], 'offset': 0, 'size': 16}}, {'binding': 11, 'resource': self.sam_wrap}])
        def go():
            enc = dev.create_command_encoder(); p = enc.begin_render_pass(color_attachments=[{'view': hdr.create_view(), 'load_op': 'clear', 'clear_value': (0, 0, 0, 0), 'store_op': 'store'}], depth_stencil_attachment={'view': depth.create_view(), 'depth_clear_value': 1.0, 'depth_load_op': 'load', 'depth_store_op': 'store'})
            p.set_bind_group(0, bg0, [0]); p.set_bind_group(1, bgW); p.set_pipeline(P['mul']); p.draw(3); p.end(); dev.queue.submit([enc.finish()])
        refused('the same depth texture attached for writing and sampled in one pass (the layer attaches it read-only)', go)

def f16(path, n=None): return np.fromfile(path, dtype=np.float16)
def metrics(a, b, pre):
    d = np.abs(a[..., :3] - b[..., :3]).astype(np.float64); da = np.abs(a[..., 3] - b[..., 3]).astype(np.float64); ch = np.abs(pre[..., :3] - a[..., :3]).max(axis=-1) > 0
    return {'maxAbs': float(d.max()), 'meanAbs': float(d.mean()), 'p9999Abs': float(np.percentile(d, 99.99)), 'over1_256': float((d.max(axis=-1) > 1 / 256).mean()), 'bitIdentical': float((a == b).all(axis=-1).mean()), 'maxAbsAlpha': float(da.max()),
            'finite': bool(np.isfinite(b).all()), 'changedByPass': float(ch.mean()), 'meanAbsChange': float(np.abs(pre[..., :3] - a[..., :3]).mean())}

# ------------------------------------------------------------------------------------------------ run
if A.selftest:
    w, h = 64, 36; N, hh = height_texels(); rep = Replay(N, hh); rng = np.random.default_rng(1863)
    fxu = rng.random(48).astype(np.float32); fxu[46] = 4          # the sprite block's event count (now.z)
    c = {'pre': rng.random((h, w, 4)).astype(np.float16).tobytes(), 'depth': (0.2 + 0.8 * rng.random((h, w))).astype(np.float32).tobytes(), 'fu': rng.random(128).astype(np.float32).tobytes(), 'wu': rng.random(212).astype(np.float32).tobytes(),
         'fx': fxu.tobytes(), 'events': rng.random(4 * 24).astype(np.float32).tobytes(), 'cum': np.array([0, 10, 20, 30, 40], np.uint32).tobytes(), 'wind': rng.random(2 * 32).astype(np.float32).tobytes(), 'nSprites': 40, 'nEvents': 4}       # GSTRIDE = 24 floats per event
    out = guarded('selftest pass', lambda: rep.run(c, w, h)); report['selftest'] = {'ran': out is not None, 'finite': bool(out is not None and np.isfinite(out).all())}; rep.negative_usage_control(w, h)
elif A.capture:
    cases = A.cases or sorted(d for d in os.listdir(A.capture) if os.path.exists(os.path.join(A.capture, d, 'meta.json')))
    N, hh = height_texels(); hsh = fnv32(hh); rep = Replay(N, hh); report['heightHash'] = hsh; ctl_done = False
    for name in cases:
        d = os.path.join(A.capture, name); meta = json.load(open(os.path.join(d, 'meta.json'))); w, h = meta['w'], meta['h']
        if meta.get('heightHash') != hsh: problems.append(f'{name}: the terrain heights differ from the capture (hash {hsh} against {meta.get("heightHash")}): the replay would not be the same input'); continue
        rd = lambda f, mode='rb': open(os.path.join(d, f), mode).read()
        c = {'pre': rd('pre.f16'), 'depth': rd('depth.f32'), 'fu': rd('fu.f32'), 'wu': rd('wu.f32'), 'fx': rd('fx.f32'), 'events': rd('events.f32'), 'cum': rd('cum.u32'), 'wind': rd('wind.f32'), 'nSprites': meta['nSprites'], 'nEvents': meta['nEvents']}
        post = np.fromfile(os.path.join(d, 'post.f16'), dtype=np.float16).reshape(h, w, 4).astype(np.float32); pre = np.frombuffer(c['pre'], dtype=np.float16).reshape(h, w, 4).astype(np.float32)
        got = guarded('replay ' + name, lambda: rep.run(c, w, h))
        if got is None: report['cases'][name] = {'ran': False}; continue
        m = metrics(post, got, pre); m['nSprites'] = meta['nSprites']; m['what'] = meta.get('what'); m['close'] = bool(m['maxAbs'] <= LIMIT_MAX and m['meanAbs'] <= LIMIT_MEAN and m['finite']); report['cases'][name] = m
        if not m['close']: problems.append(f'{name}: the replay is not close to Chrome\'s pass (max {m["maxAbs"]:.4f}, mean {m["meanAbs"]:.5f}; limits {LIMIT_MAX}, {LIMIT_MEAN})')
        if m['changedByPass'] < 0.05: problems.append(f'{name}: the pass changed under 5 percent of the picture; the comparison says little')
        if A.png:
            import zlib, struct
            def png(path, arr):
                a8 = np.clip(np.power(np.clip(arr[..., :3], 0, None), 1 / 2.2) * 255 + 0.5, 0, 255).astype(np.uint8); hh_, ww_ = a8.shape[:2]; raw = b''.join(b'\x00' + a8[y].tobytes() for y in range(hh_))
                ch = lambda t, dd: struct.pack('>I', len(dd)) + t + dd + struct.pack('>I', zlib.crc32(t + dd) & 0xffffffff)
                open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', ww_, hh_, 8, 2, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw, 6)) + ch(b'IEND', b''))
            png(os.path.join(d, 'replay-tonemapped-gamma.png'), got); png(os.path.join(d, 'chrome-tonemapped-gamma.png'), post)
        print(f'{name:28s} max {m["maxAbs"]:.5f} mean {m["meanAbs"]:.6f} p99.99 {m["p9999Abs"]:.5f} >1/256 {m["over1_256"]:.5f} bit-identical {m["bitIdentical"]:.4f} changed-by-pass {m["changedByPass"]:.3f} sprites {meta["nSprites"]}', flush=True)
    if not ctl_done and cases and not A.no_controls: rep.negative_usage_control(w, h); ctl_done = True
report['ok'] = not problems and all(str(v).startswith('refused') for v in report['controls'].values())
if A.out: json.dump(report, open(A.out, 'w'), indent=1)
print(json.dumps({k: report[k] for k in ('ok', 'problems', 'build', 'controls')}, indent=1))
sys.exit(0 if report['ok'] else 1)
