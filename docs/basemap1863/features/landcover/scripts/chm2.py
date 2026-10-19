import numpy as np, sys
from scipy import ndimage as ndi
from PIL import Image
src = sys.argv[1]; out = sys.argv[2]
d = np.load(src); top = d['top']; gnd = d['gnd']; cnt = d['cnt']; multi = d['multi']
ny, nx = top.shape
has_g = gnd < 9000; has_t = top > -9000
# fill ground by nearest then smooth
idx = ndi.distance_transform_edt(~has_g, return_distances=False, return_indices=True)
g = gnd[tuple(idx)]; g = ndi.gaussian_filter(g, 1.0)
t = np.where(has_t, top, g)
chm = np.clip(t - g, 0, 60).astype(np.float32)
# multi-return fraction (smoothed) as vegetation vs building cue
mf = ndi.uniform_filter(multi.astype(np.float32), 3) / np.maximum(ndi.uniform_filter(cnt.astype(np.float32), 3), 1e-3)
np.savez_compressed(out, chm=chm, mf=mf.astype(np.float32), gnd=g.astype(np.float32), cnt=cnt)
print('chm stats', np.percentile(chm, [50, 75, 90, 99]), 'cover has_g', has_g.mean(), 'has_t', has_t.mean())
# preview
c = np.clip(chm / 25, 0, 1); Image.fromarray((c[::-1][::-1] * 255).astype(np.uint8)).save('chm_preview.png')
