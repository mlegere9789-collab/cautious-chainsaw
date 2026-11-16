# Check of the figure pass's WGSL (app/src/crowd/shaders-wgsl.mjs with the prototype's common block, including the cross-fade of lod.mjs) on a SECOND WebGPU implementation: wgpu-native (naga front end, wgpu-core validation)
# running on SwiftShader's Vulkan, software only. Nothing here is a real-GPU result. It builds the five pipelines of gpu.mjs (mid, midS, near, nearS, imp) with the same bind group layouts (group 0 = the prototype's, group 1 = the
# crowd's), the same vertex buffer layouts and the same targets, then the bind group of group 1 with buffers of the sizes gpu.mjs makes, runs negative controls (each must be refused by the same implementation), and RUNS the dither of the
# cross-fade (the real fadeOf / fadeKeep / fragXY in a full-screen draw of a 3840 x 2160 frame) against the JavaScript reference of lod.mjs, the same comparison as tests/crowd-lod-glsl.py makes for the GLSL.
#   python3 -I docs/battle-theatre/app/tests/crowd-lod-naga.py --wgpu-path <dir with the wgpu package> [--out report.json]
# The wgpu package (pip install --target <dir> wgpu) and a Vulkan ICD (SwiftShader's, found under /opt/pw-browsers) are not vendored. Exit 0 when every check passed and every control was refused.
import os, sys, json, glob, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); BT = os.path.abspath(os.path.join(HERE, '..', '..'))
def arg(k, d=None):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
icd = glob.glob('/opt/pw-browsers/chromium-*/chrome-linux64/vk_swiftshader_icd.json'); os.environ.setdefault('VK_ICD_FILENAMES', icd[0] if icd else '')
wp = arg('--wgpu-path')
if wp: sys.path.insert(0, wp)
import wgpu
DUMP = """import fs from 'node:fs'; const A = process.argv[2]; const { common } = await import(A + 'render/prototype/src/shaders.mjs'); const { wgsl } = await import(A + 'app/src/crowd/shaders-wgsl.mjs');
const K = { frames: 32, frow: '0.0,32.0,64.0,96.0,128.0,160.0,192.0', hrow: '0.0,32.0,64.0' }; fs.writeFileSync(process.argv[3], wgsl(common(K)));"""
tmp = tempfile.mkdtemp(prefix='crowd-wgsl-'); dump = os.path.join(tmp, 'dump.mjs'); wg = os.path.join(tmp, 'crowd.wgsl'); open(dump, 'w').write(DUMP)
subprocess.run(['node', dump, 'file://' + BT + '/', wg], check=True)
res = {'implementation': 'wgpu-native via wgpu-py ' + wgpu.__version__, 'software': True, 'errors': [], 'pipelines': {}, 'controls': {}, 'dither': {}}
ad = wgpu.gpu.request_adapter_sync(); res['adapter'] = {k: (v if isinstance(v, (str, int)) else str(v)) for k, v in dict(ad.info).items()}
want = [f for f in ('float32-filterable',) if f in ad.features]; dev = ad.request_device_sync(required_features=want)
S = wgpu.ShaderStage; VF = S.VERTEX | S.FRAGMENT; HDR = 'rgba16float'; DF = 'depth32float'
def guarded(name, fn):
    try: return fn()
    except Exception as e: res['errors'].append(f'{name}: {type(e).__name__}: {str(e)[:1500]}'); return None
code = open(wg).read()
mod = guarded('module crowd', lambda: dev.create_shader_module(label='crowd', code=code)); res['module'] = bool(mod)
g0 = dev.create_bind_group_layout(label='g0L', entries=[
  {'binding': 0, 'visibility': VF, 'buffer': {'type': 'uniform', 'has_dynamic_offset': True, 'min_binding_size': 496}},
  *[{'binding': b, 'visibility': S.VERTEX, 'buffer': {'type': 'read-only-storage'}} for b in (1, 2, 3)],
  {'binding': 4, 'visibility': VF, 'texture': {'sample_type': 'float'}}, {'binding': 5, 'visibility': VF, 'sampler': {'type': 'filtering'}},
  {'binding': 6, 'visibility': S.FRAGMENT, 'texture': {'sample_type': 'depth', 'view_dimension': '2d-array'}}, {'binding': 7, 'visibility': S.FRAGMENT, 'sampler': {'type': 'comparison'}},
  {'binding': 8, 'visibility': S.FRAGMENT, 'texture': {'sample_type': 'float'}}, {'binding': 9, 'visibility': VF, 'buffer': {'type': 'uniform'}},
  {'binding': 10, 'visibility': S.VERTEX, 'buffer': {'type': 'read-only-storage'}}, {'binding': 11, 'visibility': S.FRAGMENT, 'sampler': {'type': 'filtering'}}])
def crowd_bgl(cfg_visibility=VF):
    return dev.create_bind_group_layout(label='crowd.bgl', entries=[
      {'binding': 0, 'visibility': S.VERTEX, 'texture': {'sample_type': 'unfilterable-float'}}, {'binding': 1, 'visibility': VF, 'texture': {'sample_type': 'uint'}}, {'binding': 2, 'visibility': VF, 'texture': {'sample_type': 'uint'}},
      {'binding': 3, 'visibility': VF, 'texture': {'sample_type': 'unfilterable-float'}}, {'binding': 4, 'visibility': VF, 'texture': {'sample_type': 'unfilterable-float'}}, {'binding': 5, 'visibility': S.VERTEX, 'buffer': {'type': 'read-only-storage'}},
      {'binding': 6, 'visibility': S.FRAGMENT, 'texture': {'sample_type': 'unfilterable-float', 'view_dimension': '2d-array'}}, {'binding': 7, 'visibility': S.VERTEX, 'texture': {'sample_type': 'unfilterable-float'}}, {'binding': 8, 'visibility': cfg_visibility, 'buffer': {'type': 'uniform'}}])
bgl = crowd_bgl(); layout = dev.create_pipeline_layout(label='crowd.layout', bind_group_layouts=[g0, bgl])
vbs = [{'array_stride': 28, 'attributes': [{'shader_location': 0, 'offset': 0, 'format': 'float32x3'}, {'shader_location': 1, 'offset': 12, 'format': 'snorm8x4'}, {'shader_location': 2, 'offset': 16, 'format': 'uint8x4'}, {'shader_location': 3, 'offset': 20, 'format': 'uint8x4'}, {'shader_location': 4, 'offset': 24, 'format': 'unorm8x4'}]},
       {'array_stride': 48, 'step_mode': 'instance', 'attributes': [{'shader_location': 5, 'offset': 0, 'format': 'float32x4'}, {'shader_location': 6, 'offset': 16, 'format': 'float32x4'}, {'shader_location': 7, 'offset': 32, 'format': 'uint32x4'}]}]
ds = {'format': DF, 'depth_write_enabled': True, 'depth_compare': 'less'}; dsS = {'format': DF, 'depth_write_enabled': True, 'depth_compare': 'less', 'depth_bias': 3, 'depth_bias_slope_scale': 2.5, 'depth_bias_clamp': 0.01}
def mk(vs, shadow, lay=layout, module=None):
    m = module or mod
    return dev.create_render_pipeline(label='crowd.' + vs + ('S' if shadow else ''), layout=lay, vertex={'module': m, 'entry_point': vs, 'buffers': vbs}, fragment=None if shadow else {'module': m, 'entry_point': 'fs_fig', 'targets': [{'format': HDR}]}, primitive={'topology': 'triangle-list', 'cull_mode': 'none'}, depth_stencil=dsS if shadow else ds)
def mkimp(lay=layout, module=None):
    m = module or mod
    return dev.create_render_pipeline(label='crowd.imp', layout=lay, vertex={'module': m, 'entry_point': 'vs_imp'}, fragment={'module': m, 'entry_point': 'fs_imp', 'targets': [{'format': HDR}]}, primitive={'topology': 'triangle-strip'}, depth_stencil=ds)
if mod:
    for name, fn in (('mid', lambda: mk('vs_mid', False)), ('midS', lambda: mk('vs_mid', True)), ('near', lambda: mk('vs_near', False)), ('nearS', lambda: mk('vs_near', True)), ('imp', mkimp)):
        res['pipelines'][name] = bool(guarded('pipeline ' + name, fn))
    # the bind group of group 1 with buffers the sizes gpu.mjs makes: the config block must be at least as large as the struct (32 bytes)
    U = wgpu.BufferUsage; tex = lambda w, h, l, fmt: dev.create_texture(size=(w, h, l), format=fmt, usage=wgpu.TextureUsage.TEXTURE_BINDING | wgpu.TextureUsage.COPY_DST)
    t = {'bones': tex(216, 2, 1, 'rgba16float'), 'inst': tex(4096, 1, 1, 'rgba32uint'), 'varInfo': tex(4096, 1, 1, 'rgba16uint'), 'varPal': tex(4096, 1, 1, 'rgba8unorm-srgb'), 'pal': tex(128, 3, 1, 'rgba32float'), 'imp': tex(384, 64, 2, 'rgba8unorm'), 'meta': tex(2, 1, 1, 'rgba32float')}
    pose = dev.create_buffer(size=96 * 183 * 16, usage=U.STORAGE | U.COPY_DST)
    def bg(cfg_size):
        cfg = dev.create_buffer(size=cfg_size, usage=U.UNIFORM | U.COPY_DST)
        return dev.create_bind_group(layout=bgl, entries=[{'binding': 0, 'resource': t['bones'].create_view()}, {'binding': 1, 'resource': t['inst'].create_view()}, {'binding': 2, 'resource': t['varInfo'].create_view()}, {'binding': 3, 'resource': t['varPal'].create_view()},
          {'binding': 4, 'resource': t['pal'].create_view()}, {'binding': 5, 'resource': {'buffer': pose, 'offset': 0, 'size': 96 * 183 * 16}}, {'binding': 6, 'resource': t['imp'].create_view(dimension='2d-array')}, {'binding': 7, 'resource': t['meta'].create_view()}, {'binding': 8, 'resource': {'buffer': cfg, 'offset': 0, 'size': cfg_size}}])
    res['bind_group_32'] = bool(guarded('bind group with a 32 byte config block', lambda: bg(32)))
    # ---- negative controls: the checks above are not vacuous (each of these MUST be refused by the same implementation)
    def refused(name, fn):
        try: fn(); res['controls'][name] = 'ACCEPTED (the control failed: the validator did not catch it)'
        except Exception as e: res['controls'][name] = 'refused: ' + str(e).replace('\n', ' ')[:200]
    refused('a type error in the fade decode is refused', lambda: dev.create_shader_module(label='bad1', code=code.replace('if (P == 0u) { return vec3f(0.0, 2.0, 0.0); }', 'if (P == 0u) { return 2.0; }', 1)))
    refused('an unknown identifier in the impostor fade is refused', lambda: dev.create_shader_module(label='bad2', code=code.replace('cfg.band', 'cfg.bandwidth', 1)))
    bad_vis = dev.create_bind_group_layout(label='bad.bgl', entries=[{'binding': i, 'visibility': e['visibility'] if i != 8 else S.FRAGMENT, **{k: v for k, v in e.items() if k not in ('binding', 'visibility')}} for i, e in enumerate([
      {'visibility': S.VERTEX, 'texture': {'sample_type': 'unfilterable-float'}}, {'visibility': VF, 'texture': {'sample_type': 'uint'}}, {'visibility': VF, 'texture': {'sample_type': 'uint'}}, {'visibility': VF, 'texture': {'sample_type': 'unfilterable-float'}},
      {'visibility': VF, 'texture': {'sample_type': 'unfilterable-float'}}, {'visibility': S.VERTEX, 'buffer': {'type': 'read-only-storage'}}, {'visibility': S.FRAGMENT, 'texture': {'sample_type': 'unfilterable-float', 'view_dimension': '2d-array'}},
      {'visibility': S.VERTEX, 'texture': {'sample_type': 'unfilterable-float'}}, {'visibility': VF, 'buffer': {'type': 'uniform'}}])])
    refused('a layout whose config block is hidden from the vertex stage (vs_imp reads it) is refused', lambda: mkimp(lay=dev.create_pipeline_layout(label='bad.layout', bind_group_layouts=[g0, bad_vis])))
    sized = dev.create_bind_group_layout(label='sized.bgl', entries=[{'binding': 0, 'visibility': VF, 'buffer': {'type': 'uniform', 'min_binding_size': 32}}])
    refused('a 16 byte config block against a binding that needs the 32 bytes of the struct is refused', lambda: dev.create_bind_group(layout=sized, entries=[{'binding': 0, 'resource': {'buffer': dev.create_buffer(size=16, usage=U.UNIFORM | U.COPY_DST), 'offset': 0, 'size': 16}}]))
    res['controls']['the 32 byte block of gpu.mjs is accepted by the same binding'] = 'accepted' if guarded('sized 32', lambda: dev.create_bind_group(layout=sized, entries=[{'binding': 0, 'resource': {'buffer': dev.create_buffer(size=32, usage=U.UNIFORM | U.COPY_DST), 'offset': 0, 'size': 32}}])) else 'REFUSED'
# ---- the dither, run: the real fadeOf / fadeKeep / fragXY of the crowd's WGSL (with the prototype's hsh and the frame block F) in a full-screen draw of a 3840 x 2160 frame, scissored to three 96 x 96 windows, for 8 figures and 6 range words,
# against the JavaScript reference of lod.mjs (the same comparison as tests/crowd-lod-glsl.py, which runs the GLSL of the WebGL2 path): a pixel decision may differ only within 2e-3 of a boundary (float32 against float64), the four levels of
# a partition cover every pixel exactly once, a second pass in the reverse order gives the same bytes, and the comparison fails against the number of another figure. fragXY turns the top-left origin of WebGPU into the bottom-left
# origin of GL: both APIs must give the same pixels.
sys.path.insert(0, HERE); import crowd_lod_dither as D, struct
if mod and '--no-dither' not in sys.argv:
    ref_dir = os.path.join(tmp, 'ref'); os.makedirs(ref_dir); subprocess.run(['node', os.path.join(HERE, 'crowd-lod-glsl-dump.mjs'), ref_dir], check=True, capture_output=True); ref = D.load_ref(ref_dir)
    FW, FH, WIN = ref['frame'][0], ref['frame'][1], ref['win']
    TEST = """
@group(1) @binding(15) var<uniform> DTP: vec4u;
struct DTO { @builtin(position) pos: vec4f, @location(0) @interpolate(flat) fade: vec3f }
@vertex fn vs_dither(@builtin(vertex_index) vi: u32) -> DTO { var o: DTO; let v = vec2f(f32((vi << 1u) & 2u), f32(vi & 2u)); o.pos = vec4f(v.x * 2.0 - 1.0, v.y * 2.0 - 1.0, 0.0, 1.0); o.fade = fadeOf(DTP.x, DTP.y); return o; }
@fragment fn fs_dither(i: DTO) -> @location(0) vec4f { if (!fadeKeep(i.fade, fragXY(i.pos))) { discard; } return vec4f(1.0 + F.scr.z * 0.0); }          // F.scr.z is 0: the colour is exactly 1, and the frame block stays in use when fragXY is broken for a control
"""
    def make_draw(code_text):
        tmod = dev.create_shader_module(label='crowd+dither', code=code_text + TEST)
        pipe = dev.create_render_pipeline(label='dither', layout='auto', vertex={'module': tmod, 'entry_point': 'vs_dither'}, fragment={'module': tmod, 'entry_point': 'fs_dither', 'targets': [{'format': 'rgba8unorm'}]}, primitive={'topology': 'triangle-list'})
        q = dev.queue; BU, TU = wgpu.BufferUsage, wgpu.TextureUsage
        Fb = dev.create_buffer(label='F', size=496, usage=BU.UNIFORM | BU.COPY_DST); q.write_buffer(Fb, 352, struct.pack('<4f', FW, FH, 0, 0))      # FU.scr at byte 352 (five mat4x4f, cam, sun, scr): scr.y = the height, as the host writes it
        TPb = dev.create_buffer(label='DTP', size=16, usage=BU.UNIFORM | BU.COPY_DST)
        bg0 = dev.create_bind_group(layout=pipe.get_bind_group_layout(0), entries=[{'binding': 0, 'resource': {'buffer': Fb, 'offset': 0, 'size': 496}}])
        bg1 = dev.create_bind_group(layout=pipe.get_bind_group_layout(1), entries=[{'binding': 15, 'resource': {'buffer': TPb, 'offset': 0, 'size': 16}}])
        tex = dev.create_texture(label='frame', size=(FW, FH, 1), format='rgba8unorm', usage=TU.RENDER_ATTACHMENT | TU.COPY_SRC); view = tex.create_view()
        bpr = (WIN * 4 + 255) // 256 * 256; outb = dev.create_buffer(label='readback', size=bpr * WIN, usage=BU.COPY_DST | BU.COPY_SRC)
        def draw(P, fig, x0, y0):                           # (x0, y0) in GL window coordinates (origin bottom left); the readback has its top row first
            ytop = FH - y0 - WIN; q.write_buffer(TPb, 0, struct.pack('<4I', P, fig, 0, 0)); enc = dev.create_command_encoder()
            rp = enc.begin_render_pass(color_attachments=[{'view': view, 'clear_value': (0, 0, 0, 0), 'load_op': 'clear', 'store_op': 'store'}]); rp.set_pipeline(pipe); rp.set_bind_group(0, bg0); rp.set_bind_group(1, bg1)
            rp.set_scissor_rect(x0, ytop, WIN, WIN); rp.draw(3); rp.end()
            enc.copy_texture_to_buffer({'texture': tex, 'origin': (x0, ytop, 0)}, {'buffer': outb, 'offset': 0, 'bytes_per_row': bpr, 'rows_per_image': WIN}, (WIN, WIN, 1)); q.submit([enc.finish()])
            raw = bytes(q.read_buffer(outb)); m = bytearray(WIN * WIN)
            for r in range(WIN): m[(WIN - 1 - r) * WIN:(WIN - r) * WIN] = raw[r * bpr:r * bpr + WIN * 4:4]      # row r from the top is row WIN-1-r from the bottom
            return bytes(m)
        return draw
    def dither_run():
        info, errs, ctl = D.battery(ref, make_draw(code)); res['dither'] = info; res['dither_controls'] = ctl
        res['errors'].extend('dither: ' + e for e in errs)
        for name, old, new in (('a fragXY that does not turn the y axis over is caught by the dither comparison', 'F.scr.y - p.y', 'p.y'), ('a wrong constant in ign (0.0583715 for 0.00583715) is caught by the dither comparison', '0.00583715', '0.0583715')):
            assert old in code, old
            _, errs_bad, _ = D.battery(ref, make_draw(code.replace(old, new, 1)), log=lambda *a: None)
            res['dither_controls'][name] = ('caught: ' + errs_bad[0][:140]) if errs_bad else 'NOT CAUGHT'
            if not errs_bad: res['errors'].append('control: ' + name.replace('is caught', 'was NOT caught'))
    guarded('dither run', dither_run)
res['ok'] = bool(mod) and not res['errors'] and all(res['pipelines'].values()) and (res.get('dither', {}).get('differing_outside_tolerance') == 0 or '--no-dither' in sys.argv) and res.get('bind_group_32') is True and all(v.startswith('refused') or v == 'accepted' for v in res['controls'].values())
out = arg('--out')
if out: open(out, 'w').write(json.dumps(res, indent=1))
print(json.dumps(res, indent=1)); sys.exit(0 if res['ok'] else 1)
