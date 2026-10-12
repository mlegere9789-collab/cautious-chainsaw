"""strips-compose.py - joins the eight frames of each strip (results/strips-src) into one picture per strip (shots/motion-<name>.png) with the time of every frame."""
import json, os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'results', 'strips-src'); OUT = os.path.join(ROOT, 'shots', 'round-1'); os.makedirs(OUT, exist_ok=True)
meta = json.load(open(os.path.join(SRC, 'meta.json')))
try:
    F = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 24); S = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 20)
except Exception:
    F = S = ImageFont.load_default()


def strip(name, title, sub, labels):
    ims = [Image.open(os.path.join(SRC, f'{name}-{i}.png')).convert('RGB') for i in range(8)]
    w, h = ims[0].size
    pad = 10
    head = 84
    foot = 14
    W = 4 * w + 5 * pad
    H = head + 2 * (h + 34) + foot
    sheet = Image.new('RGB', (W, H), (251, 248, 241))
    d = ImageDraw.Draw(sheet)
    d.text((pad * 2, 12), title, font=F, fill=(26, 34, 48))
    d.text((pad * 2, 46), sub, font=S, fill=(79, 91, 106))
    for i, im in enumerate(ims):
        r, c = divmod(i, 4)
        x = pad + c * (w + pad)
        y = head + r * (h + 34)
        sheet.paste(im, (x, y + 30))
        d.rectangle([x, y + 30, x + w - 1, y + 30 + h - 1], outline=(217, 207, 186))
        d.text((x + 2, y + 2), labels[i], font=S, fill=(26, 34, 48))
    sheet.save(os.path.join(OUT, f'motion-{name}.png'), optimize=True)
    print('wrote', f'motion-{name}.png', sheet.size)


m = meta
strip('march', f"A march: {m['march']['unit']} under way at {m['march']['speed']}x, {m['march']['pxPerFrame']} px a frame",
      'eight consecutive frames, 16.7 ms apart (60 Hz), camera still: the step changes smoothly from frame to frame', [f'frame {i}   +{i * 16.7:.0f} ms' for i in range(8)])
strip('arrival', f"An arrival: {m['arrival']['unit']} appears at its first keyframe (tick {m['arrival']['tick']})",
      'eight frames 80 ms apart from the moment the clock starts, 0.1 tick before the keyframe: the mark fades in while it grows from 85 percent, the disc settles, a ring leaves it', [f'frame {i}   +{i * 80} ms' for i in range(8)])
strip('growth', f"The name grows out of the mark ({m['growth']['unit']}): hover, then selection",
      'frames 0-3: the pointer rests on the mark (50 ms apart), the code gives way to the name; frames 4-7: a click, the amber ring draws itself', [f'frame {i}   +{(i % 4) * 50} ms' + ('  hover' if i < 4 else '  click') for i in range(8)])

strip('deploy', f"A deployment: the crowd {m['deploy']['crowd']} ({m['deploy']['records']} records) opens as the camera moves in, zoom {m['deploy']['zoom']}",
      'eight frames 67 ms apart: the members glide apart on a critically damped spring, the crowd mark fades out after they are half there, no two solid marks ever overlap', [f'frame {i}   +{i * 67} ms' for i in range(8)])
