"""Synthetic round-trip tests of the decoders (no mod data needed):  python3 -I tools/bt/acw/test_decoders.py"""
import os, struct, sys, tempfile, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dds, vwm, vmpf, pfh0, policy, bindpose, rmv2

def u16s(s): return struct.pack('<H', len(s)) + s.encode('utf-16le')

class T(unittest.TestCase):
    def test_dxt1_dxt5_solid_colours(self):
        hdr = bytearray(128); hdr[:4] = b'DDS '; struct.pack_into('<31I', hdr, 4, 124, 0x1007, 4, 4, 0, 0, 1, *([0] * 11), 32, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); hdr[84:88] = b'DXT1'
        red = (31 << 11); blk = struct.pack('<HHI', red, red, 0)
        p = tempfile.mktemp(); open(p, 'wb').write(bytes(hdr) + blk); im, i = dds.read_dds(p); self.assertEqual(i['fmt'], 'DXT1'); self.assertEqual(tuple(im[0, 0]), (255, 0, 0, 255))
        hdr[84:88] = b'DXT5'; a = bytes([200, 100]) + bytes(6); open(p, 'wb').write(bytes(hdr) + a + blk); im, i = dds.read_dds(p); self.assertEqual(tuple(im[3, 3]), (255, 0, 0, 200)); os.remove(p)
    def test_vwm_two_meshes_chain_to_eof(self):
        pre = struct.pack('<III', 0x12345678, 1, 0) + b'\0' * 0x1d8
        def vert(infl):
            b = struct.pack('<2f3f3fI', .5, .5, 0, 1, 0, 1, 0, 0, len(infl))
            for bone, w in infl: b += struct.pack('<I3f3ff', bone, .1, .2, .3, 0, 1, 0, w)
            return b + b'\0' * 16
        names = [('a_body', [[(4, 1.0)], [(4, .5), (5, .5)], [(5, 1.0)]], [0, 1, 2]), ('a_head', [[(6, 1.0)]] * 3, [2, 1, 0])]
        t = struct.pack('<I', len(names)) + b''.join(u16s(n) + struct.pack('<II', len(v), len(i)) for n, v, i in names)
        g = b''.join(struct.pack('<I', len(v)) + b''.join(vert(x) for x in v) + struct.pack('<I', len(i)) + struct.pack('<%dI' % len(i), *i) for n, v, i in names)
        m = vwm.parse(pre + t + g); self.assertEqual([x['name'] for x in m['meshes']], ['a_body', 'a_head']); self.assertEqual(len(m['meshes'][0]['verts']), 3); self.assertEqual(len(m['meshes'][0]['verts'][1][3]), 2); self.assertEqual(m['tail'], b'')
        with self.assertRaises(ValueError): vwm.parse(b'RIFF' + b'\0' * 100)
    def test_vmpf_lod_sections(self):
        def v(): return np.zeros(20, '<f2').view(np.uint8).tobytes()
        s0 = (3, 3); s1 = (2, 3)
        raw = struct.pack('<11I', 0x46504d56, 0, 1, 9, 2, 5, 6, 9, 2, 3, 3) + v() * 3 + struct.pack('<3H', 0, 1, 2) + struct.pack('<2I', *s1) + v() * 2 + struct.pack('<3H', 0, 1, 1)
        m = vmpf.parse(raw); self.assertEqual([len(V) for V, I in m['sections']], [3, 2]); self.assertEqual(m['tail'], b'')
    def test_pfh0_round_trip(self):
        files = [('a\\b.dds', b'1234'), ('c.txt', b'xy')]; idx = b''.join(struct.pack('<I', len(d)) + p.encode() + b'\0' for p, d in files)
        raw = b'PFH0' + struct.pack('<5I', 3, 0, 0, len(files), len(idx)) + idx + b''.join(d for p, d in files); p = tempfile.mktemp(); open(p, 'wb').write(raw)
        d = pfh0.read_index(p); self.assertEqual(d['end'], len(raw)); self.assertEqual([e[0] for e in d['entries']], ['a\\b.dds', 'c.txt']); od = tempfile.mkdtemp(); self.assertEqual(pfh0.extract(p, od)[0], 2); self.assertEqual(open(os.path.join(od, 'a', 'b.dds'), 'rb').read(), b'1234')
    def test_policy_markers(self):
        self.assertIn('S-SUBMESH', policy.stock_markers('x/y_lod1.variant_weighted_mesh', ['norwegian_ski_troops_head01']))
        self.assertIn('S-FILENAME', policy.stock_markers('unitmodels/euro_officer2_lod1.variant_weighted_mesh')); self.assertIn('S-FILENAME', policy.stock_markers('unitmodels/general3_north_lod1.x'))
        self.assertIn('S-PATH', policy.stock_markers('variantmodels/unitparts/acw/skinparts/head_cossack/mesh.x')); self.assertIn('S-TEXREF', policy.stock_markers('a.rigid_model', [], ['field_carriage_diffuse']))
        self.assertEqual(policy.stock_markers('unitparts/acw/torso/confed_shell_jacket/dark_butternut/texture_diffuse.dds'), [])
    def test_bindpose_rigid_pair(self):
        rng = np.random.default_rng(1); A = rng.normal(size=(20, 3)); th = .7; R = np.array([[np.cos(th), -np.sin(th), 0], [np.sin(th), np.cos(th), 0], [0, 0, 1]]); t = np.array([.1, .2, .3])
        R2, t2, err = bindpose.kabsch_t(A, A @ R.T + t); self.assertLess(err.max(), 1e-9); self.assertTrue(np.allclose(R, R2))
    def test_rmv2_scan(self):
        b = struct.pack('<III', 4, 0x12345678, 3) + 'field_carriage_diffuse'.encode('utf-16le') + b'\0\0'; s = rmv2.scan(b); self.assertEqual(s['version'], 4); self.assertEqual(s['texture_names'], ['field_carriage_diffuse'])
if __name__ == '__main__': unittest.main(verbosity=1)
