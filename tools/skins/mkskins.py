# Turns the ten concept images into panel skins: crops each screen, removes the painted
# (static) dial needles so live ones can be drawn, samples the colours of every readout so
# live text matches the art, and writes public/skins/*.jpg + public/skins.js.
import glob, json, math, os, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
from boxes import BOX
import importlib, skins_def, remap, plan
importlib.reload(skins_def)

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', '')  # the ten original pictures
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'skins', '')
NUM = {'modern_us': '01', 'modern_eu': '02', 'modern_br': '03', 'modern_heavy': '04', 'modern_rugged': '05',
       'old_peterbilt': '06', 'old_kenworth': '07', 'old_scania': '08', 'old_brazil': '09', 'old_volvo': '10'}
os.makedirs(OUT, exist_ok=True); os.makedirs('rev', exist_ok=True)  # review sheets: every touch area outlined on the art
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 11)

def hexc(c): return '#%02x%02x%02x' % tuple(int(round(v)) for v in c)

def sample(img, r, bar=False):
    """Background and ink colour of a readout. bg = the commonest tone (works for dark LCDs and
    for lit amber displays alike), ink = the pixels furthest from it; for a level bar the ink
    is the most vivid colour instead, so a green bar stays green."""
    H, W = img.shape[:2]
    x0, y0 = int(r[0] / 100 * W), int(r[1] / 100 * H)
    x1, y1 = max(x0 + 2, int((r[0] + r[2]) / 100 * W)), max(y0 + 2, int((r[1] + r[3]) / 100 * H))
    px = img[y0:y1, x0:x1].reshape(-1, 3).astype(float)
    q = (px // 24).astype(int); code = q[:, 0] * 144 + q[:, 1] * 12 + q[:, 2]
    bg = np.median(px[code == np.bincount(code).argmax()], 0)
    d = np.abs(px - bg).sum(1)
    if bar:
        # the unfilled part of a bar is its darkest tone, whatever fills most of it in the art
        lum = px.sum(1); bg = np.median(px[lum <= np.percentile(lum, 15)], 0)
        d = (px.max(1) - px.min(1)) * 2 + px.max(1)
    fg = px[d >= np.percentile(d, 96)].mean(0)
    return hexc(bg), hexc(fg)

def lamp(img, w):
    """Lock a key's lamp box onto the lamp actually painted there and take its colour.
    A dark (unlit) slot has nothing to find: the box stays where the map put it."""
    H, W = img.shape[:2]
    kx, ky, kw, kh = w['r'][0] / 100 * W, w['r'][1] / 100 * H, w['r'][2] / 100 * W, w['r'][3] / 100 * H
    l = w['led']
    x0 = int(max(kx, kx + (l[0] - 0.6 * l[2]) * kw)); x1 = int(min(kx + kw, kx + (l[0] + 1.6 * l[2]) * kw))
    y0 = int(max(ky, ky + (l[1] - 1.2 * l[3]) * kh)); y1 = int(min(ky + kh, ky + (l[1] + 2.2 * l[3]) * kh))
    px = img[y0:y1, x0:x1].astype(int)
    if px.size == 0: return
    mx, mn = px.max(2), px.min(2)
    lit = ((mx > 165) & (mx - mn > 70)) | (mn > 205)
    n, lab, st, _ = cv2.connectedComponentsWithStats(lit.astype(np.uint8), connectivity=8)
    if n < 2: return
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    if st[i, cv2.CC_STAT_AREA] < 6: return
    bx, by, bw, bh = st[i, 0] - 1, st[i, 1] - 1, st[i, 2] + 2, st[i, 3] + 2
    w['led'] = [(x0 + bx - kx) / kw, (y0 + by - ky) / kh, bw / kw, bh / kh]
    sel = px[lab == i]; sat = sel.max(1) - sel.min(1)
    w['lc'] = hexc(sel[sat >= np.percentile(sat, 50)].mean(0))

def needle(img, g):
    """Paint out the art's static needle(s) of one dial; a live one is drawn in the app. Returns the needle colour."""
    H, W = img.shape[:2]
    cx, cy, R = g['c'][0] / 100 * W, g['c'][1] / 100 * H, g['c'][2] / 100 * W
    yy, xx = np.mgrid[0:H, 0:W]
    dx, dy = xx - cx, yy - cy
    r_, g_, b_ = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)
    # needles are red to amber; their soft glow is the same hue, only darker
    # (the amber variant is for the one dial whose needle is amber; it would also eat cream
    # numerals, so it is not the default)
    if g.get('amber'): warm = (r_ > 90) & (r_ > g_ * 1.12) & (r_ > b_ * 2.2)
    else: warm = (r_ > 60) & (r_ > g_ * 1.5) & (r_ > b_ * 1.5)
    mask = np.zeros((H, W), bool)
    angles = g.get('n', g.get('a0', -120))
    for a in (angles if isinstance(angles, list) else [angles]):
        t = math.radians(a); ux, uy = math.sin(t), -math.cos(t)
        along = dx * ux + dy * uy            # distance from the pivot along the needle
        across = np.abs(dx * uy - dy * ux)   # distance sideways from it
        mask |= warm & (along > 0.06 * R) & (along < 0.98 * R) & (across < max(3.0, 0.085 * R))
    if mask.sum() < 8: return '#e23b1c'
    core = mask & (r_ > 150)
    col = img[core if core.sum() > 4 else mask].mean(0)
    m = cv2.dilate(mask.astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
    img[:] = cv2.inpaint(img, m, 5, cv2.INPAINT_TELEA)
    return hexc(col)

# Keys whose only lettering is part of a big knob or button face: nothing to remove there.
NO_LEGEND = {('modern_us', 'parking_brake'), ('modern_us', 'trailer_brake'), ('modern_us', 'engine'), ('modern_br', 'engine'),
             ('modern_heavy', 'parking_brake'), ('modern_heavy', 'trailer_attach'), ('old_peterbilt', 'parking_brake'), ('old_peterbilt', 'trailer_brake')}

def runs(flags, min_gap=1):
    """[start, end) spans of consecutive True values; gaps shorter than min_gap are bridged."""
    out, start, gap = [], None, 0
    for i, f in enumerate(list(flags) + [False] * min_gap):
        if f:
            if start is None: start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap: out.append((start, i - gap + 1)); start = None
    return out

def legend_mask(img, w, sid):
    """Pixels of the printed name of one key (for the "no legends" picture), or None.
    A legend is a short line of several separate glyphs; pictograms are taller or one piece."""
    if (sid, w.get('fn')) in NO_LEGEND: return None
    H, W = img.shape[:2]
    x0, y0 = int(w['r'][0] / 100 * W), int(w['r'][1] / 100 * H)
    x1, y1 = min(W, int((w['r'][0] + w['r'][2]) / 100 * W) + 1), min(H, int((w['r'][1] + w['r'][3]) / 100 * H) + 1)
    key = img[y0:y1, x0:x1].astype(int); kh, kw = key.shape[:2]
    if kh < 12 or kw < 12: return None
    lum = key.max(2)
    full = np.zeros((H, W), np.uint8)
    light_rows = (lum > 150).mean(1) > 0.3
    if light_rows[int(kh * 0.6):].sum() >= max(3, kh * 0.08):
        # name printed dark on a light plate under the key: clear the lettering, keep the plate
        rows = np.where(light_rows)[0]; rows = rows[rows > kh * 0.55]
        m = np.zeros((kh, kw), bool); m[rows] = lum[rows] < 120
        # the plate's own dark frame touches the key edges; lettering does not
        m[:, :max(2, kw // 14)] = False; m[:, -max(2, kw // 14):] = False
    else:
        text = lum > max(int(np.median(lum)) + 70, 140)
        if w.get('led'):   # the lamp is bright too, and is not lettering
            l = w['led']; text[max(0, int((l[1] - 0.04) * kh)):int((l[1] + l[3] + 0.04) * kh)] = False
        spans = runs(text.sum(1) > 0, 2)
        def texty(a, b):
            band = text[a:b]; cols = runs(band.sum(0) > 0)
            wide = (cols[-1][1] - cols[0][0]) if cols else 0
            return (b - a) <= 0.17 * kh and (b - a) >= 4 and len(cols) >= 2 and wide >= 0.14 * kw
        if len(spans) < 2: return None
        good = [sp for sp in spans if texty(*sp)]
        if not good: return None
        low = [sp for sp in good if sp[0] > 0.5 * kh]
        pick = [low[-1]] if low else [good[0]] if good[0][1] < 0.4 * kh else []
        if not pick: return None
        # a second line directly above (or below) belongs to the same legend
        for sp in good:
            if sp not in pick and min(abs(sp[1] - pick[0][0]), abs(sp[0] - pick[0][1])) < (pick[0][1] - pick[0][0]) * 0.9: pick.append(sp)
        m = np.zeros((kh, kw), bool)
        for a, b in pick: m[a:b] = text[a:b]
    if m.sum() < 6: return None
    full[y0:y1, x0:x1] = m.astype(np.uint8) * 255
    return full

# ---- Key barrel (classic panels) ---------------------------------------------------------------
# Painted over the original start button: chrome bezel, black face with the three key positions.
# The key itself and the lit ring are drawn by the app, so the key can turn.
def barrel(d):
    """Key barrel body, d x d pixels, RGBA. Drawn 4x and reduced for clean edges."""
    S4 = d * 4
    im = Image.new('RGBA', (S4, S4), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    c = S4 / 2
    def disc(r, col): dr.ellipse([c - r, c - r, c + r, c + r], fill=col)
    disc(c * 0.995, (14, 15, 16, 255))            # shadow rim
    for i in range(28):                            # chrome bezel: bright near the top edge, darker inside
        t = i / 27; r = c * (0.96 - 0.15 * t)
        v = int(228 - 150 * abs(t - 0.3) * 1.5); disc(r, (v, v + 2, v + 6, 255))
    disc(c * 0.80, (10, 11, 12, 255))             # groove the app lights up
    disc(c * 0.72, (26, 28, 31, 255))             # black face
    for ang, long_ in ((-50, 0), (0, 1), (50, 1)): # key positions: off, electrics, start
        a = math.radians(ang)
        x1, y1 = c + c * 0.69 * math.sin(a), c - c * 0.69 * math.cos(a)
        x0, y0 = c + c * 0.58 * math.sin(a), c - c * 0.58 * math.cos(a)
        dr.line([x0, y0, x1, y1], fill=(235, 238, 242, 255) if long_ else (160, 164, 170, 255), width=max(2, int(c * 0.045)))
    for i in range(12):                            # lock cylinder
        t = i / 11; r = c * (0.33 - 0.05 * t); v = int(120 + 80 * t); disc(r, (v, v, v + 3, 255))
    return im.resize((d, d), Image.LANCZOS)

def paste_barrel(img, w):
    H, W = img.shape[:2]
    d = int(w['c'][2] / 100 * W * 2); d += d % 2
    x, y = int(w['c'][0] / 100 * W - d / 2), int(w['c'][1] / 100 * H - d / 2)
    pil = Image.fromarray(img); b = barrel(d); pil.paste(b, (x, y), b)
    img[:] = np.array(pil)

LEG_FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf'

# ---- Repainting one key as ENTER ---------------------------------------------------------------
def enter_icon(size, ink):
    """Return-arrow pictogram, size x size RGBA, in the key's own ink colour, with a soft glow."""
    from PIL import ImageFilter
    S4 = size * 4; im = Image.new('RGBA', (S4, S4), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    wd = max(3, int(S4 * 0.1)); col = tuple(int(v) for v in ink) + (255,)
    P = lambda x, y: (x * S4, y * S4)
    d.line([P(.78, .2), P(.78, .58), P(.3, .58)], fill=col, width=wd, joint='curve')
    d.polygon([P(.12, .58), P(.36, .38), P(.36, .78)], fill=col)
    glow = im.filter(ImageFilter.GaussianBlur(S4 * 0.05))
    glow.putalpha(glow.getchannel('A').point(lambda v: int(v * 0.45)))
    return Image.alpha_composite(glow, im).resize((size, size), Image.LANCZOS)

def key_ink(img, r):
    """Colour of the lit lettering of a key (None for a blank cap)."""
    H, W = img.shape[:2]
    k = img[int(r[1] / 100 * H):int((r[1] + r[3]) / 100 * H) + 1, int(r[0] / 100 * W):int((r[0] + r[2]) / 100 * W) + 1].reshape(-1, 3).astype(float)
    lum = k.max(1); b = k[lum > max(np.median(lum) + 55, 115)]
    return b[b.max(1) >= np.percentile(b.max(1), 50)].mean(0) if len(b) > 12 else None

def paint_enter(img, w, sid, near=None):
    H, W = img.shape[:2]
    x0, y0 = int(w['r'][0] / 100 * W), int(w['r'][1] / 100 * H)
    x1, y1 = min(W, int((w['r'][0] + w['r'][2]) / 100 * W) + 1), min(H, int((w['r'][1] + w['r'][3]) / 100 * H) + 1)
    key = img[y0:y1, x0:x1].copy(); kh, kw = key.shape[:2]
    lum = key.max(2).astype(int)
    mx, my = max(2, int(kw * .1)), max(2, int(kh * .08))
    inner = np.zeros((kh, kw), bool); inner[my:kh - my, mx:kw - mx] = True
    if w.get('led'):   # the lamp is not lettering
        l = w['led']; inner[max(0, int((l[1] - .05) * kh)):int((l[1] + l[3] + .05) * kh)] = False
    # a light name plate under the key (dark lettering on cream)?
    light_rows = (lum > 150).mean(1) > 0.3
    plate = np.where(light_rows)[0]; plate = plate[plate > kh * .55]
    erase = np.zeros((kh, kw), bool); plate_box = None
    small = kh < 64 or w.get('io')
    if not small and len(plate) >= max(3, kh * .08):
        pr0, pr1 = plate.min(), plate.max() + 1
        pm = np.zeros((kh, kw), bool); pm[pr0:pr1, max(2, kw // 9):kw - max(2, kw // 9)] = True
        erase |= pm & (lum < 125); plate_box = (pr0, pr1); inner[pr0 - 1:] = False
    bright = inner & (lum > max(int(np.median(lum[inner])) + 55, 115))
    _r = np.where(bright.sum(1) > 0)[0]
    # (a cap whose only bright thing is a thin moulded line counts as empty too)
    blank = bright.sum() < 12 or (_r.max() - _r.min()) < .12 * kh          # an empty cap: nothing to erase, lettering colour comes from a neighbour
    if blank:
        bright[:] = False; ink = near if near is not None else np.array([222., 226., 230.])
    else:
        ink = key[bright].astype(float); ink = ink[ink.max(1) >= np.percentile(ink.max(1), 50)].mean(0)
    rows = runs(bright.sum(1) > 0, 2)
    # lowest short band of several glyphs = the printed name; everything above = the pictogram
    leg = None
    if plate_box is None and len(rows) >= 2:
        a, b = rows[-1]
        gl = runs(bright[a:b].sum(0) > 0)
        if not small and 5 <= (b - a) <= .2 * kh and a > .5 * kh and len(gl) >= 3 and gl[-1][1] - gl[0][0] >= .3 * kw and a - rows[0][0] >= (b - a) * 1.5: leg = (a, b)
    pic_rows = [r for r in rows if r != leg]
    erase |= bright
    full = np.zeros((H, W), np.uint8); full[y0:y1, x0:x1] = erase.astype(np.uint8) * 255
    img[:] = cv2.inpaint(img, cv2.dilate(full, np.ones((5, 5), np.uint8)), 4, cv2.INPAINT_TELEA)
    pil = Image.fromarray(img)
    if small:
        # a small icon button: one pictogram in the middle, no room for a name
        _b = np.where(bright.sum(1) > 0)[0]; _m = (_b.min() + _b.max()) / 2 if len(_b) else kh / 2
        _h = min(kw, kh) * .3; ya, yb, cx = int(_m - _h), int(_m + _h), kw / 2
    elif pic_rows and not blank:
        ya, yb = pic_rows[0][0], pic_rows[-1][1]
        cols = np.where(bright[ya:yb].sum(0) > 0)[0]; cx = (cols.min() + cols.max()) / 2
    else: ya, yb, cx = int(kh * .26), int(kh * .62), kw / 2
    size = int(max(10, .42 * min(kw, kh), min((yb - ya) * 1.05, kw * .62))); cy = (ya + yb) / 2
    ic = enter_icon(size, ink); pil.paste(ic, (int(x0 + cx - size / 2), int(y0 + cy - size / 2)), ic)
    dr = ImageDraw.Draw(pil)
    def text(band, colour):
        fs = max(6, int((band[1] - band[0]) * 1.22)); f = ImageFont.truetype(LEG_FONT, fs)
        while f.getlength('ENTER') > kw * .8 and fs > 6: fs -= 1; f = ImageFont.truetype(LEG_FONT, fs)
        dr.text((x0 + kw / 2, y0 + (band[0] + band[1]) / 2), 'ENTER', fill=colour, font=f, anchor='mm')
    if plate_box: text((plate_box[0] + (plate_box[1] - plate_box[0]) * .22, plate_box[1] - (plate_box[1] - plate_box[0]) * .22), (38, 30, 22))
    elif leg: text(leg, tuple(int(v) for v in ink))
    img[:] = np.array(pil)

# ---- Engine brake legends -------------------------------------------------------------------
# The art names the three engine-brake keys "JAKE 1 / 2 / 3", but they work as less / on-off /
# more. Only the printed name is replaced, in the same place and colour; the key is untouched.
JAKE_TEXT = {'engine_brake_down': 'JAKE \u2212', 'engine_brake_toggle': 'JAKE', 'engine_brake_up': 'JAKE +'}
JAKE_PANELS = ('modern_us', 'modern_heavy', 'old_peterbilt')

def relabel(img, w, sid, text):
    m = legend_mask(img, w, sid)
    # (the mapped lamp box can be generous enough to hide the name printed just above the lamp)
    if m is None: m = legend_mask(img, dict(w, led=None), sid)
    if m is None: return False
    ys, xs = np.where(m > 0)
    px = img[m > 0].astype(float); ink = px[px.max(1) >= np.percentile(px.max(1), 50)].mean(0)
    H, W = img.shape[:2]
    kx0, kw = w['r'][0] / 100 * W, w['r'][2] / 100 * W
    img[:] = cv2.inpaint(img, cv2.dilate(m, np.ones((5, 5), np.uint8)), 4, cv2.INPAINT_TELEA)
    pil = Image.fromarray(img); dr = ImageDraw.Draw(pil)
    bh = ys.max() - ys.min() + 1
    fs = max(6, int(bh * 1.3)); f = ImageFont.truetype(LEG_FONT, fs)
    while f.getlength(text) > kw * .98 and fs > 6: fs -= 1; f = ImageFont.truetype(LEG_FONT, fs)
    dr.text((kx0 + kw / 2, (ys.min() + ys.max()) / 2), text, fill=tuple(int(v) for v in ink), font=f, anchor='mm')
    img[:] = np.array(pil)
    return True

# ---- Upright cut: music player last ---------------------------------------------------------
MEDIA_FNS = ('media_prev', 'media_play', 'media_next', 'vol_up', 'vol_down', 'vol_mute', 'radio', 'radio_next', 'radio_prev')

def _span(w, ar, pad=1.3):
    # a dial's glass and chrome ring reach about a third beyond the scale radius that is mapped
    if 'c' in w and w['t'] == 'gauge': return w['c'][1] - w['c'][2] * ar * pad, w['c'][1] + w['c'][2] * ar * pad
    if 'r' not in w: return w['c'][1] - w['c'][2] * ar, w['c'][1] + w['c'][2] * ar
    return w['r'][1], w['r'][1] + w['r'][3]

def radio_last(img, defs):
    """Move the band holding the music player to the bottom of the upright picture, when the
    band holds nothing else. The picture is cut along the darkest rows between bands (the gaps
    between the panel's plates) and the map is shifted with it."""
    H, W = img.shape[:2]; ar = W / H
    media = [w for w in defs if w['t'] in ('rtext', 'knob') or w.get('fn') in MEDIA_FNS]
    rest = [w for w in defs if w not in media]
    if not media: return img
    a = min(_span(w, ar)[0] for w in media); b = max(_span(w, ar)[1] for w in media)
    if any(_span(w, ar, 1.1)[0] < b - .3 and _span(w, ar, 1.1)[1] > a + .3 for w in rest): return img   # shares its band
    # (dial rims are allowed for when choosing where to cut, but never past the player itself)
    above = [min(_span(w, ar)[1], a - .4) for w in rest if _span(w, ar, 1.1)[1] <= a + .3]
    below = [w for w in rest if _span(w, ar, 1.1)[0] >= b - .3]
    if not below: return img                                                                  # already last
    lum = img.max(2).mean(1)
    def seam(lo, hi):
        lo, hi = int(max(0, lo) / 100 * H), int(min(100, hi) / 100 * H)
        return lo if hi <= lo + 1 else lo + int(np.argmin(lum[lo:hi]))
    s1 = seam(max(above) if above else 0, a)
    s2 = seam(b, min(_span(w, ar)[0] for w in below))
    last = max(_span(w, ar)[1] for w in below)
    s3 = seam(last, 100) if 100 - last > 0.8 else H
    out = np.concatenate([img[:s1], img[s2:s3], img[s1:s2], img[s3:]])
    band, tail = (s2 - s1) / H * 100, (s3 - s2) / H * 100
    for w in defs:
        k = w['r'] if 'r' in w else w['c']
        y = _span(w, ar)[0]
        if w in media: k[1] = round(k[1] + tail, 2)
        elif y >= b - .3: k[1] = round(k[1] - band, 2)
    return out

# ---- Engine brake less / more as push buttons (chrome classic, lying cut) ------------------
def jake_buttons(img, defs, src):
    """The art has three toggle levers. Less and more are pressed repeatedly, so those two
    become push buttons: copies of this panel's own chrome start button (taken before the key
    barrel was painted over it), with the lit ring greyed and a - / + on the cap."""
    from PIL import ImageFilter
    H, W = img.shape[:2]
    r_, g_, b_ = src[..., 0].astype(int), src[..., 1].astype(int), src[..., 2].astype(int)
    grey = src.copy(); green = (g_ > r_ * 1.25) & (g_ > b_ * 1.25)
    v = (0.45 * g_[green]).astype(np.uint8) + 40; grey[green] = np.stack([v, v, v], 1)
    for fn, sign in (('engine_brake_down', '-'), ('engine_brake_up', '+')):
        w = [o for o in defs if o.get('fn') == fn][0]
        x0, y0, kw, kh = w['r'][0] / 100 * W, w['r'][1] / 100 * H, w['r'][2] / 100 * W, w['r'][3] / 100 * H
        d = int(kh * .5); cx, cy = x0 + kw / 2, y0 + kh * .43
        # the lever goes first, then the button covers where it stood
        m = np.zeros((H, W), np.uint8)
        cv2.ellipse(m, (int(cx), int(cy)), (int(kw * .42), int(kh * .29)), 0, 0, 360, 255, -1)
        img[:] = cv2.inpaint(img, m, 5, cv2.INPAINT_TELEA)
        btn = Image.fromarray(grey).resize((d, d), Image.LANCZOS)
        am = Image.new('L', (d * 4, d * 4), 0); ImageDraw.Draw(am).ellipse([d * .1, d * .1, d * 3.9, d * 3.9], fill=255)
        am = am.resize((d, d), Image.LANCZOS)
        dr = ImageDraw.Draw(btn); c = d / 2; L = d * .13; t = max(2, int(d * .055))
        dr.line([c - L, c, c + L, c], fill=(24, 24, 26), width=t)
        if sign == '+': dr.line([c, c - L, c, c + L], fill=(24, 24, 26), width=t)
        pil = Image.fromarray(img)
        sh = Image.new('L', (d + 12, d + 12), 0); ImageDraw.Draw(sh).ellipse([4, 6, d + 8, d + 10], fill=150)
        pil.paste((0, 0, 0), (int(cx - d / 2) - 6, int(cy - d / 2) - 4), sh.filter(ImageFilter.GaussianBlur(3)))
        pil.paste(btn, (int(cx - d / 2), int(cy - d / 2)), am)
        img[:] = np.array(pil)

# ---- Key caps ----------------------------------------------------------------------------------
# The touch area of a key is generous on purpose. What MOVES when it is pressed is the cap
# itself, so its outline is measured on the picture: a circle for round buttons, the coloured
# body for air valves, and for rectangular keys the four edges nearest to the mapped area.
from panels import kind_of, PANELS, DOWN_FNS

def _snap(profile, guess, lo, hi):
    """Strongest edge near `guess` within [lo, hi); keeps the guess when nothing stands out."""
    lo, hi = max(0, int(lo)), min(len(profile), int(hi))
    if hi - lo < 3: return guess
    seg = profile[lo:hi]; i = int(np.argmax(seg))
    return lo + i if seg[i] > 1.7 * (np.median(profile[max(0, lo - 20):hi + 20]) + 1) else guess

def find_cap(img, gray, gx, gy, w, sid, size):
    H, W = gray.shape
    x0, y0 = w['r'][0] / 100 * W, w['r'][1] / 100 * H
    x1, y1 = x0 + w['r'][2] / 100 * W, y0 + w['r'][3] / 100 * H
    kw, kh = x1 - x0, y1 - y0
    kind = w.get('kd') or kind_of(sid, size, w['fn'])
    if w.get('io') or kh < (0.062 if size == 'T' else 0.036) * H: kind = 'flat'
    xi0, yi0, xi1, yi1 = int(max(0, x0)), int(max(0, y0)), int(min(W, x1)), int(min(H, y1))
    if kind == 'valve':
        k = img[yi0:yi1, xi0:xi1].astype(int)
        m = (k.max(2) - k.min(2) > 95) & (k.max(2) > 120)
        ys, xs = np.where(m)
        if len(ys) > 30:
            a, b_, c, d = np.percentile(xs, 1), np.percentile(ys, 1), np.percentile(xs, 99), np.percentile(ys, 99)
            return kind, [xi0 + a - 1, yi0 + b_ - 1, xi0 + c + 2, yi0 + d + 2], 0
    if kind == 'round':
        crop = cv2.GaussianBlur(gray[yi0:yi1, xi0:xi1], (5, 5), 0)
        mn = min(kw, kh)
        cs = cv2.HoughCircles(crop, cv2.HOUGH_GRADIENT, dp=1.2, minDist=mn / 3, param1=110, param2=22, minRadius=int(mn * .3), maxRadius=int(mn * .56))
        best = None
        if cs is not None:
            for cx, cy, r in cs[0]:
                off = math.hypot(cx - kw / 2, cy - kh * (0.42 if kh > kw * 1.12 else 0.5)) / mn
                if off < 0.2 and (best is None or r - off * mn > best[2] - best[3] * mn): best = (cx, cy, r, off)
        if best is None: best = (kw / 2, kh * (0.42 if kh > kw * 1.12 else 0.5), mn * .42, 0)
        cx, cy, r = best[:3]
        return 'round', [xi0 + cx - r, yi0 + cy - r, xi0 + cx + r, yi0 + cy + r], 1
    if kind == 'flat':
        return kind, [x0 + kw * .04, y0 + kh * .06, x1 - kw * .04, y1 - kh * .06], 0
    # Rectangular keys: the mapped area itself. Edges found by measurement proved unreliable
    # (a legend or a pictogram often gives a stronger line than the cap's own rim), so the app
    # feathers the moving piece instead: it blends into the picture with no hard outline.
    return kind, [x0, y0, x1, y1], 0

def add_caps(img, ws, sid, size):
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    gx = np.abs(cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)); gy = np.abs(cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3))
    H, W = gray.shape
    for w in ws:
        if w['t'] == 'ign' and w.get('st') in ('lamp', 'btn'):
            # the staged START control keeps the kind and outline of the start key it is
            kind, c, rd = find_cap(img, gray, gx, gy, dict(w, fn='engine'), sid, size)
            w['k'] = kind; w['cap'] = [float(c[0] / W * 100), float(c[1] / H * 100), float((c[2] - c[0]) / W * 100), float((c[3] - c[1]) / H * 100)]
            if rd: w['rd'] = 1
            continue
        if w['t'] != 'hot': continue
        kind, c, rd = find_cap(img, gray, gx, gy, w, sid, size)
        ov = skins_def.CAP_FIX.get((sid, size, w['fn']))   # hand corrections, as fractions of the mapped area
        if ov:
            r = w['r']; c = [(r[0] + r[2] * ov[0]) / 100 * W, (r[1] + r[3] * ov[1]) / 100 * H, (r[0] + r[2] * ov[2]) / 100 * W, (r[1] + r[3] * ov[3]) / 100 * H]
        box = PANELS[sid].get('capbox')
        if box and not ov and kind == PANELS[sid]['default']:
            r = w['r']; c = [(r[0] + r[2] * box[0]) / 100 * W, (r[1] + r[3] * box[1]) / 100 * H, (r[0] + r[2] * box[2]) / 100 * W, (r[1] + r[3] * box[3]) / 100 * H]
        w['k'] = kind
        w['cap'] = [float(c[0] / W * 100), float(c[1] / H * 100), float((c[2] - c[0]) / W * 100), float((c[3] - c[1]) / H * 100)]
        if rd: w['rd'] = 1
        if w['fn'] in DOWN_FNS: w['dn'] = 1


SNAP = {}   # pictures and key positions before any change, for copying pictograms between cuts / panels

def dump(sid, size, ws):
    print(sid, size)
    for i, w in enumerate(ws):
        if w['t'] in ('hot', 'ign') and 'r' in w: print('  %2d %-20s %s' % (i, w.get('fn') or w.get('st'), [round(v, 1) for v in w['r']]))

def _slot(ws, h):
    """key widget by handle: 'fn' (first), 'fn@n' (n-th, reading order)"""
    fn, _, n = h.partition('@')
    c = sorted([w for w in ws if w.get('fn') == fn and w['t'] in ('hot', 'ign') and 'r' in w], key=lambda w: (round(w['r'][1] / 2.5), w['r'][0]))
    assert len(c) > int(n or 0), ('no key', h)
    return c[int(n or 0)]


CUR_DEFS = {}
def p_radio_bottom(sid, img, ws):
    """Upright wood panel: the art's last band (radio + three key stumps cut off by the phone's edge) is
    replaced by wood and a large copy of the tablet cut's radio, with its readout and keys re-seated on it."""
    H, W = img.shape[:2]; tws = CUR_DEFS['T']; timg = SNAP['06T'][0]; TH, TW = timg.shape[:2]
    low = [w for w in ws if 'r' in w and w['r'][1] >= 93.5 and w['t'] in ('hot', 'rtext', 'knob', 'live')]
    yb_p = min(w['r'][1] for w in low) - 1.0
    lum = img.max(2).mean(1); lo, hi = int((yb_p - 1.5) / 100 * H), int((yb_p + .5) / 100 * H)
    yb = lo + int(np.argmin(lum[lo:hi]))
    keep = [w for w in ws if not ('r' in w and w['r'][1] >= yb_p)]
    rx0, ry0, rx1, ry1 = 27.2, 79.4, 61.4, 98.4                                  # the radio on the tablet cut (%)
    sx0, sx1, sy0, sy1 = int(rx0 / 100 * TW), int(rx1 / 100 * TW), int(ry0 / 100 * TH), int(ry1 / 100 * TH)
    dw = int(.92 * W); dh = int(dw * (sy1 - sy0) / (sx1 - sx0)); pad = int(.014 * H)
    hb = dh + 2 * pad; H2 = yb + hb
    fill = remap.wood_fill(img, 0, yb, W, yb + hb)
    bottom = fill.copy(); dx = (W - dw) // 2
    rad = cv2.resize(timg[sy0:sy1, sx0:sx1], (dw, dh), interpolation=cv2.INTER_AREA if dw < sx1 - sx0 else cv2.INTER_CUBIC).astype(np.float32)
    a = np.ones((dh, dw, 1), np.float32)
    for i in range(6):
        v = (i + 1) / 7; a[:, i] = np.minimum(a[:, i], v); a[:, dw - 1 - i] = np.minimum(a[:, dw - 1 - i], v); a[i] = np.minimum(a[i], v); a[dh - 1 - i] = np.minimum(a[dh - 1 - i], v)
    bottom[pad:pad + dh, dx:dx + dw] = (rad * a + bottom[pad:pad + dh, dx:dx + dw] * (1 - a)).astype(np.uint8)
    out = np.concatenate([img[:yb], bottom])
    for w in keep:                                                              # everything above keeps its place
        if 'r' in w: w['r'][1] = w['r'][1] * H / H2; w['r'][3] = w['r'][3] * H / H2
        if 'c' in w: w['c'][1] = w['c'][1] * H / H2
    n_ = 0
    for tw in tws:
        if 'r' not in tw or not (tw['t'] in ('rtext', 'knob') or tw.get('fn') in MEDIA_FNS): continue
        cx, cy = tw['r'][0] + tw['r'][2] / 2, tw['r'][1] + tw['r'][3] / 2
        if not (rx0 <= cx <= rx1 and ry0 <= cy <= ry1): continue
        c = dict(tw); c['r'] = list(tw['r']); n_ += 1; c['id'] = 'kr%d' % n_
        c['r'][0] = (dx + (tw['r'][0] - rx0) / (rx1 - rx0) * dw) / W * 100; c['r'][2] = tw['r'][2] / (rx1 - rx0) * dw / W * 100
        c['r'][1] = (yb + pad + (tw['r'][1] - ry0) / (ry1 - ry0) * dh) / H2 * 100; c['r'][3] = tw['r'][3] / (ry1 - ry0) * dh / H2 * 100
        for k_ in ('planned', 'moved', 'jb'): c.pop(k_, None)
        keep.append(c)
    ws[:] = keep
    return out

def apply_plan(sid, n, size, img, ws):
    P = plan.PLAN.get((sid, size), {})
    if os.environ.get('PRE'):
        t = img.copy(); H = t.shape[0]
        for pc in range(0, 100, 2): cv2.line(t, (0, int(H*pc/100)), (t.shape[1], int(H*pc/100)), (0,255,255) if pc % 10 == 0 else (255,0,255), 1); cv2.putText(t, str(pc), (2, int(H*pc/100)-2), 0, .4, (255,255,0), 1)
        Image.fromarray(t).save('/tmp/pre-%s%s.png' % (n, size))
    if sid in ('old_peterbilt', 'old_kenworth'):
        for w in ws: w['bm'] = 1     # wood panels: the legend sits right at the key's lower edge
    news = []
    if P.get('add'):
        img, news = remap.addrows(img, ws, P['add'], P.get('span', 1.5))
    for band, xr, at, *ex in P.get('strip', []):
        img, g = remap.addstrip(img, ws, band, xr, at, extra=ex[0] if ex else ()); news.append(g)
    if news:
        print('add', sid, size, [len(g) for g in news], img.shape)
        k = 0
        for grp in news:
            for c in grp: k += 1; c['fn'] = '~%d' % k; c['kd'] = kind_of(sid, size, c.pop('src_fn'))
    # moves: [(fn now in the cell, fn whose picture goes into that cell)] - re-seats whole key pictures so that
    # a group (engine brake: less / on-off / more) stands together in one row
    if P.get('moves'):
        H, W = img.shape[:2]; before = img.copy(); cells = {}
        for dst_fn, src_fn in P['moves']:
            dw = next(w for w in ws if w.get('fn') == dst_fn and w['t'] == 'hot'); sw = next(w for w in ws if w.get('fn') == src_fn and w['t'] == 'hot')
            cells[dst_fn] = (dw, dict(sw), src_fn)
        for dst_fn, (dw, sw, src_fn) in cells.items():
            x0, y0 = int(dw['r'][0] / 100 * W), int(dw['r'][1] / 100 * H); x1, y1 = x0 + int(dw['r'][2] / 100 * W), y0 + int(dw['r'][3] / 100 * H)
            sx0, sy0 = int(sw['r'][0] / 100 * W), int(sw['r'][1] / 100 * H); sx1, sy1 = sx0 + int(sw['r'][2] / 100 * W), sy0 + int(sw['r'][3] / 100 * H)
            img[y0:y1, x0:x1] = cv2.resize(before[sy0:sy1, sx0:sx1], (x1 - x0, y1 - y0), interpolation=cv2.INTER_CUBIC)
        for dst_fn, (dw, sw, src_fn) in cells.items():
            kd = sw.get('kd') or kind_of(sid, size, src_fn)
            for k_ in ('led', 'lc', 'solid', 'bm', 'rnd', 'split', 'small'): dw.pop(k_, None); 
            for k_ in ('led', 'lc', 'solid', 'bm', 'rnd', 'split', 'small'):
                if k_ in sw: dw[k_] = sw[k_]
            dw['fn'] = src_fn; dw['kd'] = kd
    if os.environ.get('POST'):
        t = img.copy(); H = t.shape[0]
        for pc in range(0, 100, 2): cv2.line(t, (0, int(H*pc/100)), (t.shape[1], int(H*pc/100)), (0,255,255) if pc % 10 == 0 else (255,0,255), 1); cv2.putText(t, str(pc), (2, int(H*pc/100)-2), 0, .4, (255,255,0), 1)
        for pc in range(0, 100, 5): cv2.line(t, (int(t.shape[1]*pc/100), 0), (int(t.shape[1]*pc/100), H), (0,255,0), 1); cv2.putText(t, str(pc), (int(t.shape[1]*pc/100)+2, 12), 0, .4, (255,255,0), 1)
        Image.fromarray(t).save('/tmp/post-%s%s.png' % (n, size))
    if (sid, size) == ('old_peterbilt', 'P'): img = p_radio_bottom(sid, img, ws)
    SNAP[n + size] = (img.copy(), {})
    for w in ws:
        if w['t'] in ('hot', 'ign') and 'r' in w and w.get('fn'): SNAP[n + size][1].setdefault(w['fn'], []).append(dict(w))
    src_img = img.copy(); jobs = []
    inks = [c for c in (remap.key_ink_(img, o['r']) for o in ws if o['t'] == 'hot' and 'r' in o) if c is not None]
    tint = np.median(np.array(inks), 0) if inks else None
    spares = [s for s in plan.SPARE if not any(w.get('fn') == s[0] for w in ws)]
    pt = skins_def_lang(sid) == 'pt'
    for slot, fn, src, label, flags in P.get('ops', []):
        w = _slot(ws, slot)
        w['rnd'] = 1 if (w.get('kd') or kind_of(sid, size, w.get('fn'))) == 'round' else 0
        text = False
        if fn == 'spare':
            fn, lab = spares.pop(0); label = plan.SPARE_PT[fn] if pt else lab; text = True
        if src == 'text': text = True; src = None
        sw = simg = None
        if isinstance(src, str):
            sw, simg = _slot(ws, src), src_img; sw['rnd'] = 1 if (sw.get('kd') or kind_of(sid, size, sw.get('fn'))) == 'round' else 0
        elif src:
            key, f = src; key = key if len(key) > 1 else n + key
            simg, tab = SNAP[key]; assert f in tab, (sid, size, key, f, list(tab)); sw = tab[f][0]
            sw['rnd'] = 1 if kind_of(key[:2] and {v: k for k, v in NUM.items()}[key[:2]], key[2], f) == 'round' else 0
        jobs.append((w, fn, sw, simg, label, flags + ('x' if (src and not isinstance(src, str)) else '') + ('p' if (src and not isinstance(src, str) and len(src[0]) > 1) else ''), text))
    for w, fn, sw, simg, label, flags, text in jobs:
        if 'small' in flags: w['small'] = 1
        if text: remap.put(img, src_img, w, None, label, icon='text')
        elif sw is not None: remap.put(img, simg, w, sw, label, slash='s' in flags.replace('small', '').replace('ENTER_ON', '').replace('ENTER_OFF', ''), cross='x' in flags, tint=tint if 'p' in flags else None)
        elif label is not None: remap.put(img, src_img, w, None, label)
    for w, fn, sw, simg, label, flags, text in jobs:
        if 'ENTER_OFF' in flags: w.pop('enter', None)       # this key is no longer the Enter key
        if 'ENTER_ON' in flags: w['enter'] = 1              # ...this one is (painted OK / ENTER later)
    for w, fn, *_ in jobs:
        if fn != w.get('fn') and not w.get('kd'): w['kd'] = kind_of(sid, size, w.get('fn'))   # a key stays the kind of hardware it is
        w['fn'] = fn
    return img

def skins_def_lang(sid): return 'pt' if sid in ('modern_br', 'old_brazil') else 'en'

def main():
  skins, only = {}, sys.argv[1:]
  for sid, defs in skins_def.S.items():
      n = NUM[sid]
      full = Image.open(glob.glob(SRC + n + '_*.png')[0]).convert('RGB')
      FW, FH = full.size
      skins[sid] = {}
      for size in 'TP':
          b = BOX[n][size]
          img = np.array(full.crop((int(b[0] * FW), int(b[1] * FH), int(b[2] * FW), int(b[3] * FH))))
          H, W = img.shape[:2]
          if size == 'P' and not any(w.get('moved') for w in defs[size]):
              img = radio_last(img, defs[size]); defs[size][0]['moved'] = 1
              H, W = img.shape[:2]
          CUR_DEFS.clear(); CUR_DEFS.update(defs)
          if os.environ.get('DUMP'): dump(sid, size, defs[size])
          if not defs[size][0].get('planned'): img = apply_plan(sid, n, size, img, defs[size]); defs[size][0]['planned'] = 1; H, W = img.shape[:2]
          if not any(w.get('mark') for w in defs[size]): skins_def.place_mark(sid, size, W / H)   # needs the picture's shape, known only here
          if sid == 'old_peterbilt' and size == 'T' and not defs[size][0].get('jb'):
              g = [w for w in defs[size] if w['t'] == 'ign'][0]['c']
              rr = int(3.75 / 100 * W); cx, cy = int(g[0] / 100 * W), int(g[1] / 100 * H)
              jake_buttons(img, defs[size], img[cy - rr:cy + rr, cx - rr:cx + rr].copy()); defs[size][0]['jb'] = 1
          for w in defs[size]:
              if w['t'] == 'ign' and not w.get('st'): paste_barrel(img, w)
              if w['t'] == 'ign' and w.get('st') == 'knob' and 'c' not in w:
                  # the rotary knob is the red body inside the mapped area: its circle is measured here
                  x0, y0 = int(w['r'][0] / 100 * W), int(w['r'][1] / 100 * H)
                  k = img[y0:int((w['r'][1] + w['r'][3]) / 100 * H), x0:int((w['r'][0] + w['r'][2]) / 100 * W)].astype(int)
                  ys, xs = np.where((k[..., 0] > 120) & (k[..., 0] > k[..., 1] * 1.8) & (k[..., 0] > k[..., 2] * 1.8))
                  cx, cy = (np.percentile(xs, 2) + np.percentile(xs, 98)) / 2, (np.percentile(ys, 2) + np.percentile(ys, 98)) / 2
                  rr = max(np.percentile(xs, 98) - np.percentile(xs, 2), np.percentile(ys, 98) - np.percentile(ys, 2)) / 2 * 1.12
                  w['c'] = [float((x0 + cx) / W * 100), float((y0 + cy) / H * 100), float(rr / W * 100)]
              if sid in JAKE_PANELS and w.get('fn') in JAKE_TEXT and not w.get('jk'):
                  w['jk'] = 1
                  if not relabel(img, w, sid, JAKE_TEXT[w['fn']]): print('no legend found:', sid, size, w['fn'])
              if w.get('enter') and not w.get('done'):
                  hots = [o for o in defs[size] if o['t'] == 'hot' and o is not w]
                  # lettering colour for a blank cap: taken from the nearest key that has some
                  hots.sort(key=lambda o: abs(o['r'][0] - w['r'][0]) + abs(o['r'][1] - w['r'][1]))
                  inks = [c for c in (key_ink(img, o['r']) for o in hots) if c is not None]
                  # prefer a coloured neighbour: the grey of a moulded line is not the panel's lettering colour
                  near = next((c for c in inks if c.max() - c.min() > 40), inks[0] if inks else None)
                  remap.put(img, img.copy(), w, None, None if (w.get('io') or w.get('small')) else 'ENTER', icon='ok', near=near); w['done'] = 1
          # Rosewood: the three small keys at the end of the telltale row (lanes, OK, map pin) were painted
          # lit; they are keys, not warning lights, so they rest dim and light up only under the finger.
          if sid == 'old_kenworth' and size == 'T':
              for w in defs[size]:
                  if w['t'] == 'hot' and w.get('fn') in ('ra_nav', 'activate', 'world_map') and w['r'][1] < 55:
                      bx0, by0 = int(w['r'][0] / 100 * W), int(w['r'][1] / 100 * H); bx1, by1 = int((w['r'][0] + w['r'][2]) / 100 * W), int((w['r'][1] + w['r'][3]) / 100 * H)
                      reg = img[by0:by1, bx0:bx1].astype(np.float32)
                      img[by0:by1, bx0:bx1] = np.clip(reg * 0.3, 0, 255).astype(np.uint8)
          # The info screen (or the player's own GPS page) is drawn over the screen by the app. The
          # painted map under it is wiped so no edge of the old picture shows around the overlay.
          for w in defs[size]:
              if w['t'] == 'gps':
                  gx0, gy0 = int(w['r'][0] / 100 * W), int(w['r'][1] / 100 * H); gx1, gy1 = int((w['r'][0] + w['r'][2]) / 100 * W), int((w['r'][1] + w['r'][3]) / 100 * H)
                  pil = Image.fromarray(img); gl = Image.new('RGB', (gx1 - gx0, gy1 - gy0)); gd = ImageDraw.Draw(gl)
                  for yy in range(gy1 - gy0): c_ = int(15 - 8 * yy / max(1, gy1 - gy0)); gd.line([(0, yy), (gx1 - gx0, yy)], fill=(c_, c_ + 4, c_ + 8))
                  mk = Image.new('L', gl.size, 0); ImageDraw.Draw(mk).rounded_rectangle([0, 0, gl.width - 1, gl.height - 1], radius=int(min(gl.size) * .035), fill=255)
                  pil.paste(gl, (gx0, gy0), mk); img[:] = np.array(pil)
          ws = []
          for i, d in enumerate(defs[size]):
              w = dict(d); w['id'] = 'k%d' % i
              if w['t'] == 'gauge':
                  w['c'] = [w['c'][0], w['c'][1], w['c'][2]]
                  w['ink'] = needle(img, w)
              ws.append(w)
          add_caps(img, ws, sid, size)
          for w in ws:
              if w.get('led'): lamp(img, w)
              if w['t'] == 'hot':
                  # a control that is coloured as an object (yellow valve, red mushroom button)
                  # keeps its colour when off; a key that is only LIT in colour loses it
                  x0, y0 = int(w['r'][0] / 100 * W), int(w['r'][1] / 100 * H)
                  k = img[y0:int((w['r'][1] + w['r'][3]) / 100 * H) + 1, x0:int((w['r'][0] + w['r'][2]) / 100 * W) + 1].astype(int)
                  # (on the cream-plate panel a colour filter would grey the name plates: keys keep their colours there)
                  # a key sitting directly on a coloured surface (wood): filtering its area would show as a grey box
                  edge = np.concatenate([k[:3].reshape(-1, 3), k[-3:].reshape(-1, 3), k[:, :3].reshape(-1, 3), k[:, -3:].reshape(-1, 3)]) if k.size else np.zeros((1, 3), int)
                  if (edge.max(1) - edge.min(1)).mean() > 38: w['solid'] = 1
                  if sid == 'old_brazil' or (k.size and ((k.max(2) - k.min(2) > 90) & (k.max(2) > 120)).mean() > 0.22): w['solid'] = 1
              if w['t'] in ('live', 'rtext', 'fbar', 'cover'):
                  w['bg'], w['ink'] = sample(img, w['r'], w['t'] == 'fbar')
          # second picture of the same panel with the key names cleared (the "no legends" option)
          bare = img.copy(); lm = np.zeros(img.shape[:2], np.uint8)
          for w in ws:
              if w['t'] == 'hot':
                  m = legend_mask(img, w, sid)
                  if m is not None: lm |= m
          if lm.any(): bare = cv2.inpaint(bare, cv2.dilate(lm, np.ones((5, 5), np.uint8)), 4, cv2.INPAINT_TELEA)
          bp = Image.fromarray(bare)
          if size == 'P': bp = bp.resize((W * 2, H * 2), Image.LANCZOS)
          bp.save(OUT + '%s-%sn.jpg' % (sid, size), quality=86, optimize=True)
          pil = Image.fromarray(img)
          if size == 'P':
              # the phone mock-ups are small in the source; resample once here, with a better
              # filter than the browser would use on every frame
              pil = pil.resize((W * 2, H * 2), Image.LANCZOS)
          pil.save(OUT + '%s-%s.jpg' % (sid, size), quality=88, optimize=True)
          # review sheet: every hotspot outlined on the art
          rw = 1300 if size == 'T' else 620
          rv = Image.fromarray(img).resize((rw, int(rw * H / W)), Image.LANCZOS); dr = ImageDraw.Draw(rv, 'RGBA'); RW, RH = rv.size
          for w in ws:
              if 'r' not in w:
                  cx, cy, R = w['c'][0] / 100 * RW, w['c'][1] / 100 * RH, w['c'][2] / 100 * RW
                  dr.ellipse([cx - R, cy - R, cx + R, cy + R], outline=(0, 255, 255, 200))
                  for a, c in ((w.get('a0'), (255, 255, 255, 255)), (w.get('a1'), (255, 0, 255, 255))):
                      if a is None: continue
                      t = math.radians(a); dr.line([cx, cy, cx + R * math.sin(t), cy - R * math.cos(t)], fill=c, width=2)
                  continue
              x, y, ww, hh = [w['r'][0] / 100 * RW, w['r'][1] / 100 * RH, w['r'][2] / 100 * RW, w['r'][3] / 100 * RH]
              col = {'hot': (0, 255, 0), 'live': (0, 255, 255), 'tell': (255, 255, 0), 'gps': (255, 0, 255), 'rtext': (255, 140, 0), 'fbar': (255, 0, 0), 'cover': (255, 255, 255), 'knob': (0, 200, 255), 'sticker': (255, 105, 180), 'ign': (255, 0, 0)}[w['t']]
              dr.rectangle([x, y, x + ww, y + hh], outline=col + (90,), width=1)
              if w.get('cap'):
                  c = w['cap']; box = [c[0] / 100 * RW, c[1] / 100 * RH, (c[0] + c[2]) / 100 * RW, (c[1] + c[3]) / 100 * RH]
                  kc = {'rocker': (0, 255, 0), 'tile': (0, 200, 255), 'round': (255, 0, 255), 'valve': (255, 255, 0), 'toggle': (255, 120, 0), 'flat': (255, 255, 255)}[w['k']]
                  (dr.ellipse if w.get('rd') else dr.rectangle)(box, outline=kc + (255,), width=2)
              if 'led' in w:
                  l = w['led']; dr.rectangle([x + l[0] * ww, y + l[1] * hh, x + (l[0] + l[2]) * ww, y + (l[1] + l[3]) * hh], outline=(255, 255, 255, 255))
              lab = w.get('fn') or w.get('field') or w.get('tel') or w.get('art') or w['t']
          rv.save('rev/%s-%s.jpg' % (n, size), quality=82)
          for w in ws: w.pop('n', None); w.pop('amber', None); w.pop('done', None); w.pop('was', None); w.pop('enter', None); w.pop('io', None); w.pop('jk', None); w.pop('moved', None); w.pop('jb', None); w.pop('rnd', None); w.pop('kd', None); w.pop('iz', None); w.pop('planned', None); w.pop('bm', None)
          skins[sid][size] = {'ar': round(W / H, 4), 'w': ws}

  def num(o):
      if isinstance(o, float): return round(o, 2)
      if isinstance(o, list): return [num(v) for v in o]
      if isinstance(o, dict): return {k: num(v) for k, v in o.items() if v is not None}
      return o
  js = ('// GENERATED by tools/skins (do not edit by hand): hotspot maps of the ten art panels.\n'
        '// Coordinates are percentages of the picture, so they hold at any screen size.\n'
        "'use strict';\nconst SKINS = " + json.dumps(num(skins), separators=(',', ':')) + ';\n')
  open(os.path.join(OUT, '..', 'skins.js'), 'w').write(js)
  print(len(js), sum(os.path.getsize(f) for f in glob.glob(OUT + '*.jpg')))

if __name__ == '__main__': main()
