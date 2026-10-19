"""Build the grain tile (tmp/b1863/build/grain_tile.npy): zero-mean high-pass (sigma 1.5 px) of real field blocks of the mosaic, assembled 1024 x 1024 with random flips."""
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
bank = np.load(os.path.join(C.BUILD, 'bank_field.npy'))
rng = np.random.default_rng(1863)
B = bank.shape[1]
tile = np.zeros((1024 + B, 1024 + B, 3), np.float32)
for y in range(0, 1024, B):
    for x in range(0, 1024, B):
        b = bank[rng.integers(0, len(bank))].astype(np.float32)
        hp = b - cv2.GaussianBlur(b, (0, 0), 1.5)
        if rng.random() < 0.5: hp = hp[:, ::-1]
        if rng.random() < 0.5: hp = hp[::-1]
        if rng.random() < 0.5: hp = hp.transpose(1, 0, 2)
        tile[y:y + B, x:x + B] = hp
tile = tile[:1024, :1024]
tile -= tile.mean((0, 1))
print('grain std', tile.std((0, 1)))
np.save(os.path.join(C.BUILD, 'grain_tile.npy'), tile.astype(np.float16))
