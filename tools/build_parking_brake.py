from PIL import Image, ImageDraw, ImageFilter
import math

BASE = 'public/skins/sov/btn/sov_toggle_parking_brake'

def rod_polygon(p0, p1, w0, w1, steps=24):
    x0, y0 = p0
    x1, y1 = p1
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    nx, ny = -dy / length, dx / length
    left, right = [], []
    for i in range(steps + 1):
        t = i / steps
        cx = x0 + dx * t
        cy = y0 + dy * t
        w = (w0 + (w1 - w0) * t) / 2
        left.append((cx + nx * w, cy + ny * w))
        right.append((cx - nx * w, cy - ny * w))
    return left + right[::-1]

def build_mask(size, poly, blur=2.0):
    mask = Image.new('L', size, 0)
    d = ImageDraw.Draw(mask)
    d.polygon(poly, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(blur))

up = Image.open(f'{BASE}_up.png').convert('RGBA')
dn = Image.open(f'{BASE}_down.png').convert('RGBA')
size = up.size
assert dn.size == size

# Rod centerlines measured off the 50px grid overlays.
up_poly = rod_polygon((690, 45), (695, 365), 95, 160)
dn_poly = rod_polygon((690, 330), (670, 1045), 170, 70)

up_mask = build_mask(size, up_poly)
dn_mask = build_mask(size, dn_poly)

# Static frame: start from the down-pose photo, patch its rod pixels with the
# up-pose photo at the same coordinates (clean background there), and vice
# versa for any leftover overlap near the knuckle.
frame = dn.copy()
frame.paste(up, (0, 0), dn_mask)
# second pass: anywhere up_mask also had rod (the knuckle-adjacent overlap),
# fall back to a horizontal clone-fill so no rod sliver survives.
import numpy as np
fr = np.array(frame)
dnm = np.array(dn_mask) > 40
upm = np.array(up_mask) > 40
still_rod = dnm & upm
ys, xs = np.where(still_rod)
for y in sorted(set(ys.tolist())):
    row_xs = xs[ys == y]
    if len(row_xs) == 0:
        continue
    x0, x1 = row_xs.min() - 2, row_xs.max() + 2
    srcL = max(0, x0 - 15)
    srcR = min(size[0] - 1, x1 + 15)
    left_px = fr[y, srcL].astype(float)
    right_px = fr[y, srcR].astype(float)
    n = max(1, x1 - x0)
    for i, x in enumerate(range(x0, x1 + 1)):
        if x < 0 or x >= size[0]:
            continue
        t = i / n
        fr[y, x, :3] = (left_px[:3] * (1 - t) + right_px[:3] * t).astype('uint8')
frame = Image.fromarray(fr, 'RGBA')
frame.save(f'{BASE}_frame.png')

# Lever sprites: rod-only cutouts from each real pose, transparent elsewhere.
lever_up = Image.new('RGBA', size, (0, 0, 0, 0))
lever_up.paste(up, (0, 0), up_mask)
lever_up.save(f'{BASE}_lever_up.png')

lever_down = Image.new('RGBA', size, (0, 0, 0, 0))
lever_down.paste(dn, (0, 0), dn_mask)
lever_down.save(f'{BASE}_lever_down.png')

print('done', size)
