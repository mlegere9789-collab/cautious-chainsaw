"""zoom200.py - a crop magnified to 200 % with nearest-neighbour (no smoothing), so every edge of every mark is inspectable pixel by pixel.   python tools/zoom200.py in.png out.png"""
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); w, h = im.size
im.resize((w * 2, h * 2), Image.NEAREST).save(sys.argv[2], optimize=True); print('wrote', sys.argv[2], (w * 2, h * 2))
