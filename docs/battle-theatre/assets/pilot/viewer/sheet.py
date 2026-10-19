import sys
from PIL import Image
d = sys.argv[1]; names = sys.argv[2].split(','); out = sys.argv[3]; cols = int(sys.argv[4]) if len(sys.argv) > 4 else 2; scale = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
ims = [Image.open(f'{d}/{n}.png').convert('RGB') for n in names]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet = sheet.resize((int(w * cols * scale), int(h * rows * scale)), Image.LANCZOS)
sheet.save(out)
print(sheet.size)
