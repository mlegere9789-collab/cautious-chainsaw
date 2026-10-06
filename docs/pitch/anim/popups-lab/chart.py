from PIL import Image, ImageDraw, ImageFont
W, H = 1100, 520
im = Image.new('RGB', (W, H), (10, 10, 20))
d = ImageDraw.Draw(im)
f = lambda n: ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', n)
d.text((24, 16), 'How long a card is on screen vs how long it takes to read (R1c, measured and computed)', fill=(232, 213, 163), font=f(22))
d.text((24, 48), 'seconds, linear scale; reading at 238 words per minute (Brysbaert 2019); on screen = measured in Chrome', fill=(150, 150, 170), font=f(15))
rows = [
    ('Event card (32 words)', 8.1, [('1x', 0.5), ('4x', 0.117), ('16x', 0.033)]),
    ('Story summary (58 words)', 14.6, [('1x', 1.5), ('4x', 0.382), ('16x', 0.099)]),
    ('Command-change toast (12 words)', 3.0, [('1x', 4.5), ('4x', 1.25), ('16x', 0.316)]),
]
x0, y = 330, 100
scale = 38.0  # px per second
for name, need, shown in rows:
    d.text((24, y + 8), name, fill=(230, 226, 214), font=f(18))
    d.rectangle([x0, y, x0 + need * scale, y + 22], fill=(70, 100, 150))
    d.text((x0 + need * scale + 8, y + 1), 'to read: %.1f s' % need, fill=(150, 180, 220), font=f(16))
    yy = y + 28
    for lab, sec in shown:
        d.rectangle([x0, yy, x0 + max(2, sec * scale), yy + 16], fill=(214, 120, 50))
        d.text((x0 + max(2, sec * scale) + 8, yy - 1), '%s: %.2f s on screen' % (lab, sec), fill=(235, 170, 110), font=f(14))
        yy += 21
    y = yy + 28
d.text((24, H - 54), 'Reading all 45 critical events and 24 story summaries takes 13.5 min; the whole battle plays in 5.6 min at 1x.', fill=(232, 213, 163), font=f(17))
d.text((24, H - 28), 'Toasts are the one card that outlives its reading time at 1x (4.5 s), and a burst of five evicts the oldest after as little as 1 s.', fill=(150, 150, 170), font=f(15))
im.save('docs/pitch/anim/shots/popups/chart-dwell-vs-reading.png', optimize=True)
print(im.size)
