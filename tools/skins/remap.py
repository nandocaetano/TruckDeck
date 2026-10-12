# Key re-assignment on the art: moves a pictogram + legend from one painted key to another,
# repaints a legend, adds a cloned row of keys. Everything is taken from the panel's own
# picture (nothing is drawn from scratch except the "OK" of the Enter key and the OFF slash).
import numpy as np, cv2, math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

LEG_FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf'

def runs(flags, min_gap=1):
    out, start, gap = [], None, 0
    for i, f in enumerate(list(flags) + [False] * min_gap):
        if f:
            if start is None: start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap: out.append((start, i - gap + 1)); start = None
    return out

def _box(img, w):
    H, W = img.shape[:2]
    x0, y0 = int(w['r'][0] / 100 * W), int(w['r'][1] / 100 * H)
    x1, y1 = min(W, int((w['r'][0] + w['r'][2]) / 100 * W) + 1), min(H, int((w['r'][1] + w['r'][3]) / 100 * H) + 1)
    return x0, y0, x1, y1

def analyse(img, w):
    """What is printed on one key: pictogram rows, legend band, name plate, ink colour."""
    x0, y0, x1, y1 = _box(img, w)
    key = img[y0:y1, x0:x1].copy(); kh, kw = key.shape[:2]
    lum = key.max(2).astype(int)
    small0 = kh < 64 or bool(w.get('io')) or w.get('small')
    mx, my = (2, 2) if small0 else (max(2, int(kw * .1)), max(2, int(kh * .08)))
    mb = 2 if w.get('bm') else my
    inner = np.zeros((kh, kw), bool); inner[my:kh - mb, mx:kw - mx] = True
    if w.get('led'):
        l = w['led']; inner[max(0, int((l[1] - .05) * kh)):int((l[1] + l[3] + .05) * kh)] = False
    small = small0
    light_rows = (lum > 150).mean(1) > 0.62
    plate = np.where(light_rows)[0]; plate = plate[plate > kh * .55]
    plate_box = None
    if not small and len(plate) >= max(3, kh * .08):
        plate_box = (int(plate.min()), int(plate.max()) + 1); inner[plate_box[0] - 1:] = False
    yy, xx = np.mgrid[0:kh, 0:kw]
    rnd = bool(w.get('rnd'))
    if rnd:
        # a round push button: only the disc inside the chrome ring is pictogram
        cy0 = kh * (.42 if kh > kw * 1.12 else .5); R = .33 * min(kw, kh)
        circ = (xx - kw / 2) ** 2 + (yy - cy0) ** 2 <= R * R
        inner &= circ
    if w.get('iz'):
        zone = np.zeros((kh, kw), bool); zone[int(w['iz'][0] * kh):int(w['iz'][1] * kh)] = True
        inner &= zone
    ref = lum[inner] if inner.any() else lum.reshape(-1)
    bg = int(np.median(ref))
    bright = inner & (lum > max(bg + 55, 115))
    rws = np.where(bright.sum(1) > 0)[0]
    blank = bright.sum() < 12 or (len(rws) == 0) or (rws.max() - rws.min()) < .12 * kh
    if blank: bright[:] = False
    ink = None
    if not blank:
        p = key[bright].astype(float); ink = p[p.max(1) >= np.percentile(p.max(1), 50)].mean(0)
    rows = runs(bright.sum(1) > 0, 2)
    if rows and not small:
        # icon and legend can run into each other (narrow rockers): split at the lowest valley of the profile
        a, b = rows[-1]; cnt = bright.sum(1)
        if b - a > .34 * kh:
            cand = [y for y in range(a + int((b - a) * .45), b - 4) if cnt[y] <= .2 * cnt[a:b].max()]
            if cand: v = cand[-1]; rows[-1] = (a, v); rows.append((v + 1, b))
    if os.environ.get('DBGPROF') and rows: print('PROF', kh, kw, [int(v) for v in bright.sum(1)[::3]], rows)
    leg = None
    if rnd and plate_box is None:
        lb = (lum > np.median(lum) + 70) & (yy > kh * .84) & (xx > kw * .05) & (xx < kw * .95)
        rr = np.where(lb.sum(1) > 1)[0]
        if len(rr) >= 4 and (rr.max() - rr.min()) < .26 * kh: leg = (int(rr.min()), int(rr.max()) + 1)
    elif plate_box is None and len(rows) >= 2:
        # the legend is the last wide, low run; a thin glare line under it (key bottom edge) is skipped
        for a, b in reversed(rows[-2:]):
            gl = runs(bright[a:b].sum(0) > 0)
            if not small and 5 <= (b - a) <= .26 * kh and a > .5 * kh and len(gl) >= 2 and gl[-1][1] - gl[0][0] >= .22 * kw and a - rows[0][0] >= (b - a) * 1.0: leg = (a, b); break
    pic_rows = [r for r in rows if r != leg and (leg is None or r[1] <= leg[0])]
    pic = (pic_rows[0][0], pic_rows[-1][1]) if pic_rows and not blank else None
    if w.get('iz'): pic = (int(w['iz'][0] * kh), int(w['iz'][1] * kh))
    return dict(x0=x0, y0=y0, kw=kw, kh=kh, key=key, lum=lum, inner=inner, bright=bright, blank=blank, ink=ink,
                plate=plate_box, leg=leg, pic=pic, small=small, bg=bg)

def icon_of(src, sw):
    """The pictogram of a key as an RGBA cut-out (colours kept, background transparent)."""
    S = analyse(src, sw)
    if S['pic'] is None: return None, S
    ya, yb = S['pic']; m = S['bright'].copy(); m[:max(0, ya - 1)] = False; m[yb + 1:] = False
    if S['leg']: m[S['leg'][0] - 1:] = False
    cols = np.where(m.sum(0) > 0)[0]
    if not len(cols): return None, S
    xa, xb = cols.min(), cols.max() + 1
    soft = cv2.GaussianBlur(cv2.dilate(m.astype(np.uint8) * 255, np.ones((5, 5), np.uint8)), (5, 5), 0).astype(float) / 255
    alpha = np.clip((S['lum'] - S['bg'] - 25) / 70.0, 0, 1) * soft
    pad = 3
    ya0, yb0 = max(0, ya - pad), min(S['kh'], yb + pad); xa0, xb0 = max(0, xa - pad), min(S['kw'], xb + pad)
    rgba = np.dstack([S['key'][ya0:yb0, xa0:xb0], (alpha[ya0:yb0, xa0:xb0] * 255).astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA'), S

def ok_icon(h, ink):
    S4 = 4; im = Image.new('RGBA', (int(h * 1.5) * S4, h * S4), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(LEG_FONT, int(h * S4 * .85))
    d.text((im.width / 2, im.height / 2), 'OK', fill=tuple(int(v) for v in ink) + (255,), font=f, anchor='mm')
    glow = im.filter(ImageFilter.GaussianBlur(S4 * 2)); glow.putalpha(glow.getchannel('A').point(lambda v: int(v * .45)))
    return Image.alpha_composite(glow, im).resize((int(h * 1.5), h), Image.LANCZOS)

def put(img, src, w, sw=None, label=None, icon=None, slash=False, near=None, cross=False, tint=None):
    """Repaint key `w` of img. sw: key of `src` whose pictogram is copied (None = keep this key's
    own); icon='ok' draws the OK mark; label: new legend text (None = keep, '' = none)."""
    A = analyse(img, w); x0, y0, kw, kh = A['x0'], A['y0'], A['kw'], A['kh']
    if os.environ.get('DBGLEG'): print('   put', w.get('fn'), label, 'leg', A['leg'], 'plate', A['plate'], 'pic', A['pic'], 'kh', kh, 'bg', A['bg'])
    cut, S = (None, None)
    if icon in ('ok', 'text'): pass
    elif sw is not None: cut, S = icon_of(src, sw)
    # ink of the old legend / icon, read before anything is erased
    leg_ink = None
    if A['leg']:
        a, b = A['leg']; p = A['key'][a:b][A['bright'][a:b]].astype(float)
        if len(p): leg_ink = p[p.max(1) >= np.percentile(p.max(1), 50)].mean(0)
    ink = A['ink'] if A['ink'] is not None else (S['ink'] if S is not None and S['ink'] is not None else near if near is not None else np.array([222., 226., 230.]))
    erase = np.zeros((kh, kw), bool)
    change_icon = icon in ('ok', 'text') or cut is not None
    if change_icon:
        loose = A['inner'] & (A['lum'] > A['bg'] + 28) & ~_legmask(A)
        if A['plate']: loose[A['plate'][0] - 1:] = False
        if A['ink'] is not None and (A['ink'].max() - A['ink'].min()) > 70:
            sat = (A['key'].max(2).astype(int) - A['key'].min(2).astype(int)) > 40
            loose |= A['inner'] & sat & (A['lum'] > A['bg'] + 8)
        if A['pic']: loose[:max(0, A['pic'][0] - 4)] = False; loose[A['pic'][1] + 4:] = False
        else: loose[:] = False
        erase |= loose | (A['bright'] & ~_legmask(A))
    if label is not None:
        if A['plate']:
            p0, p1 = A['plate']; pm = np.zeros((kh, kw), bool); pm[p0:p1, max(2, kw // 9):kw - max(2, kw // 9)] = True
            erase |= pm & (A['lum'] < 125)
        elif A['leg']:
            a, b = A['leg']; band = np.zeros((kh, kw), bool); band[max(0, a - 1):b + 1, 2:kw - 2] = True
            erase |= band & (A['lum'] > A['bg'] + 30)
    H, W = img.shape[:2]
    full = np.zeros((H, W), np.uint8); full[y0:y0 + kh, x0:x0 + kw] = erase.astype(np.uint8) * 255
    if full.any(): img[:] = cv2.inpaint(img, cv2.dilate(full, np.ones((7, 7), np.uint8)), 5, cv2.INPAINT_TELEA)
    pil = Image.fromarray(img)
    if change_icon:
        if w.get('rnd') and not A['pic']: cy = kh * (.42 if kh > kw * 1.12 else .5); ph = kh * .3
        elif S is not None and S['pic'] and not A['small'] and not cross and not A['pic']: cy = (S['pic'][0] + S['pic'][1]) / 2 / S['kh'] * kh; ph = A['kh'] * .3
        elif A['pic']: cy = (A['pic'][0] + A['pic'][1]) / 2; ph = A['pic'][1] - A['pic'][0]
        else: cy = kh * (.42 if (A['plate'] or label) and not A['small'] else .5); ph = kh * .32
        if A['small']: cy = kh / 2; ph = min(kw, kh) * .5
        if icon == 'text': ic = None
        elif icon == 'ok':
            ic = ok_icon(int(max(10, min(ph * 1.0, kh * .36 if not A['small'] else kh * .5))), ink)
        else:
            if tint is not None:
                a_ = np.array(cut)[..., 3:4].astype(float); rgb = np.array(cut)[..., :3].astype(float)
                l_ = rgb.max(2, keepdims=True); l_ = l_ / max(1.0, np.percentile(l_[a_[..., 0] > 128], 90) if (a_[..., 0] > 128).any() else 255)
                cut = Image.fromarray(np.dstack([np.clip(np.array(tint, float)[None, None, :] * np.clip(l_, 0, 1.15), 0, 255), a_]).astype(np.uint8), 'RGBA')
            sc = ((A['kh'] / max(1, S['kh'])) if not cross else (A['kh'] / max(1, S['kh']) + A['kw'] / max(1, S['kw'])) / 2) if not A['small'] else min(kw, kh) * .55 / max(1, cut.height)
            sc = min(sc, kw * .78 / cut.width, (kh * .6) / cut.height)
            ic = cut.resize((max(4, int(cut.width * sc)), max(4, int(cut.height * sc))), Image.LANCZOS)
            if slash:
                d4 = ic.size; big = ic.resize((d4[0] * 3, d4[1] * 3), Image.LANCZOS)
                # a thin slash, kept inside the pictogram (a long thick stroke reads as a crossed-out box)
                dr = ImageDraw.Draw(big); t = max(4, int(d4[1] * .075) * 3)
                col = tuple(int(v) for v in ink) + (255,)
                p0 = (big.size[0] * .1, big.size[1] * .1); p1 = (big.size[0] * .9, big.size[1] * .9)
                dr.line([p0, p1], fill=(8, 8, 8, 255), width=t + 6)
                dr.line([p0, p1], fill=col, width=t)
                ic = big.resize(d4, Image.LANCZOS)
        if ic is not None: pil.paste(ic, (int(x0 + kw / 2 - ic.width / 2), int(y0 + cy - ic.height / 2)), ic)
    if label and icon == 'text':
        dr = ImageDraw.Draw(pil)
        # plain legends are always the neutral cream of the other keys (a copied key's lit colour would tint them)
        col = tuple(int(v) for v in ink) if (ink.max() - ink.min()) < 45 else (232, 226, 214)
        cyt = y0 + kh * .48                                              # one height for every plain legend
        fs = max(7, int(kh * .13)); f = ImageFont.truetype(LEG_FONT, fs)
        while f.getlength(label) > kw * .86 and fs > 7: fs -= 1; f = ImageFont.truetype(LEG_FONT, fs)
        dr.text((x0 + kw / 2, cyt), label, fill=col, font=f, anchor='mm')
    elif label:
        dr = ImageDraw.Draw(pil)
        if A['plate']: band = (A['plate'][0] + (A['plate'][1] - A['plate'][0]) * .22, A['plate'][1] - (A['plate'][1] - A['plate'][0]) * .22); col = (38, 30, 22)
        elif A['leg']: band = A['leg']; col = tuple(int(v) for v in (leg_ink if leg_ink is not None else ink))
        elif S is not None and S['leg']: band = (S['leg'][0] / S['kh'] * kh, S['leg'][1] / S['kh'] * kh); col = tuple(int(v) for v in (S['ink'] if S['ink'] is not None else ink))
        else: band = (kh * .74, kh * .88); col = tuple(int(v) for v in ink)
        fs = max(6, int((band[1] - band[0]) * 1.22)); f = ImageFont.truetype(LEG_FONT, fs)
        ch = f.getbbox('H')[3] - f.getbbox('H')[1]
        if ch > 0: fs = max(6, int(fs * min(1.25, (band[1] - band[0]) / ch))); f = ImageFont.truetype(LEG_FONT, fs)
        while f.getlength(label) > kw * .9 and fs > 6: fs -= 1; f = ImageFont.truetype(LEG_FONT, fs)
        dr.text((x0 + kw / 2, y0 + (band[0] + band[1]) / 2), label, fill=col, font=f, anchor='mm')
    img[:] = np.array(pil)

def _legmask(A):
    m = np.zeros_like(A['bright'])
    if A['leg']: m[A['leg'][0]:A['leg'][1]] = True
    return m

# ---- extra rows of keys ----------------------------------------------------------------------
def seam(img, y_pct, span=1.5):
    H = img.shape[0]; lum = img.max(2).mean(1)
    lo, hi = int(max(0, y_pct - span) / 100 * H), int(min(100, y_pct + span) / 100 * H)
    return lo + int(np.argmin(lum[lo:hi])) if hi > lo + 1 else int(y_pct / 100 * H)

def addrows(img, defs, specs, span=1.5):
    """specs = [(band, at), ...] in % of the ORIGINAL picture height. Each band (between two seams,
    snapped to the darkest line nearby) is cloned and the copy inserted at `at`. Hotspots below an
    insertion move down; keys inside a band are cloned with fn '~'. Returns the new picture and the
    clones in reading order (spec by spec)."""
    H, W = img.shape[:2]
    ins = []
    for k, (band, at) in enumerate(specs):
        ins.append((seam(img, at, span), seam(img, band[0], span), seam(img, band[1], span), k))
    ins.sort()
    parts, last, off, offs = [], 0, 0, {}
    for ya, y0, y1, k in ins:
        parts += [img[last:ya], img[y0:y1]]; last = ya
        offs[k] = off; off += y1 - y0
    parts.append(img[last:]); out = np.concatenate(parts); H2 = out.shape[0]
    def shift(y, h=0):
        # decided by the key's centre: a hotspot that starts a little above the seam still belongs below it
        return y + sum(y1 - y0 for ya, y0, y1, k in ins if y + h / 2 >= ya - 1)
    news_all = [None] * len(specs)
    for ya, y0, y1, k in ins:
        cl = []
        for w in defs:
            if w.get('t') != 'hot' or 'r' not in w: continue
            y = w['r'][1] / 100 * H; h = w['r'][3] / 100 * H
            if y0 <= y + h / 2 <= y1:
                c = dict(w); c['r'] = list(w['r']); c['fn'] = '~'; c['src_fn'] = w.get('fn')
                for k_ in ('mark', 'enter', 'was', 'io', 'small', 'done', 'split'): c.pop(k_, None)
                cl.append((c, y + (ya - y0) + offs[k], h))
        cl.sort(key=lambda t: (round(t[1] / 6), t[0]['r'][0]))
        for c, ny, h in cl:
            c['r'][1] = round(ny / H2 * 100, 3); c['r'][3] = round(h / H2 * 100, 3)
        news_all[k] = [c for c, _, _ in cl]
    for w in defs:
        if 'r' in w:
            y = w['r'][1] / 100 * H; h = w['r'][3] / 100 * H
            w['r'][1] = shift(y, h) / H2 * 100; w['r'][3] = h / H2 * 100
        if 'c' in w:     # round things (gauges, knobs): centre y is a % of the height too
            w['c'][1] = shift(w['c'][1] / 100 * H) / H2 * 100
    for n in news_all: defs.extend(n)
    return out, news_all


def _max_rect(mask):
    """Largest all-true rectangle of a boolean map (histogram method): (area, y0, y1, x0, x1)."""
    h, w = mask.shape; hist = np.zeros(w, int); best = (0, 0, 0, 0, 0)
    for y in range(h):
        hist = np.where(mask[y], hist + 1, 0); st = []
        for x in range(w + 1):
            cur = hist[x] if x < w else 0; start = x
            while st and st[-1][1] >= cur:
                sx, sh = st.pop(); ar = sh * (x - sx)
                if ar > best[0]: best = (ar, y - sh + 1, y + 1, sx, x)
                start = sx
            st.append((start, cur))
    return best

def wood_fill(img, x0, y0, x1, y1, seed=3):
    """Fill a rectangle with wood: the largest plain-wood rectangle of the picture, scaled to fit
    (burl grain is soft, so a stretch reads as wood), used for strips that extend a wood panel."""
    H, W = img.shape[:2]; f = img.astype(np.float32)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]; lum = f.max(2)
    m = ((r > g * 1.1) & (r > b * 1.3) & (r - b > 24) & (lum > 36) & (lum < 170)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    m[y0 - 8:y1 + 8, :] = 0
    m = cv2.erode(m, np.ones((7, 7), np.uint8))
    small = cv2.resize(m, (W // 3, H // 3), interpolation=cv2.INTER_AREA) > 0.99
    ar, ya, yb, xa, xb = _max_rect(small)
    assert ar > 100, 'no wood to learn from'
    patch = img[ya * 3:yb * 3, xa * 3:xb * 3]
    h, w = y1 - y0, x1 - x0
    # mirror-tile when the patch is smaller than the target on an axis, so a stretch never gets extreme
    reps_y, reps_x = max(1, round(h / patch.shape[0])), max(1, round(w / patch.shape[1]))
    row = [patch if i % 2 == 0 else patch[:, ::-1] for i in range(reps_x)]
    tile = np.concatenate(row, 1); col = [tile if i % 2 == 0 else tile[::-1] for i in range(reps_y)]
    tile = np.concatenate(col, 0)
    return cv2.resize(tile, (w, h), interpolation=cv2.INTER_CUBIC)

def addstrip(img, defs, band, xr, at, span=0.3, extra=()):
    """Like addrows for a wood panel whose row does not run edge to edge: only the x range `xr`
    (% of width) of `band` (% of height) is copied, the rest of the new strip is grown wood.
    Returns picture and the clones (reading order)."""
    H, W = img.shape[:2]
    ya, y0, y1 = seam(img, at, span), seam(img, band[0], span), seam(img, band[1], span)
    xa, xb = int(xr[0] / 100 * W), int(xr[1] / 100 * W); hh = y1 - y0
    strip = np.zeros((hh, W, 3), np.uint8)
    fill = wood_fill(img, 0, ya, W, ya + hh)
    strip[:] = fill
    src = img[y0:y1, xa:xb].copy()
    # feathered join so the copied housing sits in the wood without a hard edge
    a = np.ones((hh, xb - xa, 1), np.float32); fe = 8
    for i in range(fe):
        v = (i + 1) / (fe + 1); a[:, i] = np.minimum(a[:, i], v); a[:, xb - xa - 1 - i] = np.minimum(a[:, xb - xa - 1 - i], v)
    strip[:, xa:xb] = (src * a + fill[:, xa:xb] * (1 - a)).astype(np.uint8)
    # extra housings copied from elsewhere in the picture (band, source x range, destination x, all %):
    # fills wood that would stay empty beside the main copy
    xcl = []
    for eb, exr, edx in extra:
        e0, e1 = seam(img, eb[0], span), seam(img, eb[1], span)
        segs = exr if isinstance(exr[0], (list, tuple)) else [exr]       # source x ranges, joined left to right
        pieces = [img[e0:e1, int(a / 100 * W):int(b / 100 * W)] for a, b in segs]
        es = np.concatenate(pieces, 1)
        if es.shape[0] != hh: es = cv2.resize(es, (es.shape[1], hh), interpolation=cv2.INTER_CUBIC)
        es = es.astype(np.float32)
        ww, dx = es.shape[1], int(edx / 100 * W)
        offs, cum = [], 0
        for a_, b_ in segs:                                              # where each source piece lands
            offs.append((int(a_ / 100 * W), int(b_ / 100 * W), dx + cum)); cum += int(b_ / 100 * W) - int(a_ / 100 * W)
        a = np.ones((hh, ww, 1), np.float32)
        for i in range(fe):
            v = (i + 1) / (fe + 1); a[:, i] = np.minimum(a[:, i], v); a[:, ww - 1 - i] = np.minimum(a[:, ww - 1 - i], v)
        strip[:, dx:dx + ww] = (es * a + strip[:, dx:dx + ww] * (1 - a)).astype(np.uint8)
        for ea, eb_, pdx in offs: xcl.append((e0, e1, ea, eb_, pdx))
    out = np.concatenate([img[:ya], strip, img[ya:]]); H2 = out.shape[0]
    cl = []
    for e0, e1, ea, eb_, dx in xcl:
        for w in defs:
            if w.get('t') != 'hot' or 'r' not in w: continue
            y = w['r'][1] / 100 * H; h = w['r'][3] / 100 * H; x = w['r'][0] / 100 * W + w['r'][2] / 200 * W
            if e0 <= y + h / 2 <= e1 and ea <= x <= eb_:
                f = hh / (e1 - e0)
                c = dict(w); c['r'] = list(w['r']); c['fn'] = '~'; c['src_fn'] = w.get('fn')
                c['r'][0] += (dx - ea) / W * 100; c['r'][2] = w['r'][2]
                for k_ in ('mark', 'enter', 'was', 'io', 'small', 'done', 'split'): c.pop(k_, None)
                cl.append((c, ya + (y - e0) * f, h * f))
    for w in defs:
        if w.get('t') != 'hot' or 'r' not in w: continue
        y = w['r'][1] / 100 * H; h = w['r'][3] / 100 * H; x = w['r'][0] / 100 * W + w['r'][2] / 200 * W
        if y0 <= y + h / 2 <= y1 and xa <= x <= xb:
            c = dict(w); c['r'] = list(w['r']); c['fn'] = '~'; c['src_fn'] = w.get('fn')
            for k_ in ('mark', 'enter', 'was', 'io', 'small', 'done', 'split'): c.pop(k_, None)
            cl.append((c, y + (ya - y0), h))
    cl.sort(key=(lambda t: t[0]['r'][0]) if extra else (lambda t: (round(t[1] / 6), t[0]['r'][0])))
    for w in defs:
        if 'r' in w:
            y = w['r'][1] / 100 * H; h = w['r'][3] / 100 * H
            w['r'][1] = (y + (hh if y + h / 2 >= ya - 1 else 0)) / H2 * 100; w['r'][3] = h / H2 * 100
        if 'c' in w:
            yy = w['c'][1] / 100 * H; w['c'][1] = (yy + (hh if yy >= ya - 1 else 0)) / H2 * 100
    for c, ny, h in cl: c['r'][1] = ny / H2 * 100; c['r'][3] = h / H2 * 100
    defs.extend(c for c, _, _ in cl)
    return out, [c for c, _, _ in cl]

def key_ink_(img, r):
    """Colour of the lit pictograms on a key (None for a blank cap)."""
    H, W = img.shape[:2]
    k = img[int(r[1] / 100 * H):int((r[1] + r[3]) / 100 * H) + 1, int(r[0] / 100 * W):int((r[0] + r[2]) / 100 * W) + 1].reshape(-1, 3).astype(float)
    if not len(k): return None
    lum = k.max(1); b = k[lum > max(np.median(lum) + 55, 115)]
    return b[b.max(1) >= np.percentile(b.max(1), 50)].mean(0) if len(b) > 12 else None
