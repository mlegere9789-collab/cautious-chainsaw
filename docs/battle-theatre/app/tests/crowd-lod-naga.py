# Check of the figure pass's WGSL (app/src/crowd/shaders-wgsl.mjs with the prototype's common block, including the cross-fade of lod.mjs) on a SECOND WebGPU implementation: wgpu-native (naga front end, wgpu-core validation)
# running on SwiftShader's Vulkan, software only. Nothing here is a real-GPU result. It builds the five pipelines of gpu.mjs (mid, midS, near, nearS, imp) with the same bind group layouts (group 0 = the prototype's, group 1 = the
# crowd's), the same vertex buffer layouts and the same targets, then the bind group of group 1 with buffers of the sizes gpu.mjs makes, and runs negative controls (each must be refused by the same implementation).
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
res = {'implementation': 'wgpu-native via wgpu-py ' + wgpu.__version__, 'software': True, 'errors': [], 'pipelines': {}, 'controls': {}}
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
res['ok'] = bool(mod) and not res['errors'] and all(res['pipelines'].values()) and res.get('bind_group_32') is True and all(v.startswith('refused') or v == 'accepted' for v in res['controls'].values())
out = arg('--out')
if out: open(out, 'w').write(json.dumps(res, indent=1))
print(json.dumps(res, indent=1)); sys.exit(0 if res['ok'] else 1)
