# One-off patch: night light map, instant menu switch, radio/tinfo text fit.
import sys, os
pub = sys.argv[1]
jsp, cssp = os.path.join(pub, 'app.js'), os.path.join(pub, 'app.css')
js = open(jsp, encoding='utf-8').read()
css = open(cssp, encoding='utf-8').read()

def rep(src, old, new, label):
    if src.count(old) != 1:
        sys.exit('anchor not unique/missing: ' + label + ' (' + str(src.count(old)) + ')')
    return src.replace(old, new)

# ---------- 1. menu choice = instant, game clock = smooth ----------
js = rep(js, """    const _cabinTarget = cabinLevel();
    _cabinLv += (_cabinTarget - _cabinLv) * 0.06;
    if (Math.abs(_cabinLv - _cabinTarget) < 0.004) _cabinLv = _cabinTarget;""",
"""    // A choice made in the menu applies at once; only the game clock (auto) fades, so dusk,
    // dawn and a jump in game time (sleeping) slide instead of snapping.
    const _cabinMode = layout().cabin || 'off';
    const _cabinTarget = cabinLevel();
    if (_cabinMode !== _cabinLastMode || _cabinMode !== 'auto') _cabinLv = _cabinTarget;
    else {
      _cabinLv += (_cabinTarget - _cabinLv) * 0.06;
      if (Math.abs(_cabinLv - _cabinTarget) < 0.004) _cabinLv = _cabinTarget;
    }
    _cabinLastMode = _cabinMode;""", 'smooth')
js = rep(js, "  let _cabinLv = 0;   // smoothed cabin level",
     "  let _cabinLastMode = null;   // last cabin setting seen, to tell a menu change from the clock moving\n  let _cabinLv = 0;   // smoothed cabin level", 'lastmode')
# real dashboards dim their screens at night: auto brightness follows the cabin
js = rep(js, "brPref === 'auto' ? (1 - _cabinLv * 0.15)", "brPref === 'auto' ? (1 - _cabinLv * 0.3)", 'autobright')

# ---------- 2. radio screen: keys beside the text on a very low, wide screen ----------
js = rep(js, """      const boxH = node.clientHeight;
      const bEl = node.querySelector('b');""",
"""      const boxH = node.clientHeight;
      // a very low, wide radio screen (tablet upright) puts the media keys beside the text
      // instead of under it, so the three text lines get the whole height
      const wideRt = !!w.two && node.clientWidth > boxH * 4.2;
      node.classList.toggle('rt-wide', wideRt);
      const rk = node.querySelector('.rt-keys');
      if (rk) rk.style.fontSize = (boxH * (wideRt ? 0.3 : 0.17)).toFixed(1) + 'px';
      const bEl = node.querySelector('b');""", 'rtwide')
js = rep(js, "freightEl.style.fontSize = (boxH * 0.14 * (w.fs || 1))", "freightEl.style.fontSize = (boxH * (wideRt ? 0.19 : 0.13) * (w.fs || 1))", 'freight')
js = rep(js, "artistEl.style.fontSize = (boxH * 0.17 * (w.fs || 1))", "artistEl.style.fontSize = (boxH * (wideRt ? 0.21 : 0.16) * (w.fs || 1))", 'artist')
js = rep(js, "(w.two ? 0.28 : 0.58)", "(w.two ? (wideRt ? 0.34 : 0.26) : 0.58)", 'track')

# ---------- 3. light map ----------
LM = r"""
  // ---- Cabin light map ------------------------------------------------------------------------
  // Night is lit the way 2D games light a scene. The panel art is the albedo; a low-resolution
  // light map multiplies over it. The map starts from a dim, cool ambient (moon and street light
  // through the windscreen: brighter at the top, falling toward the floor, darker in the corners)
  // and every real light source in the cab is added on top: screens, gauge dials, warning lamps
  // and the backlit pictograms of the keys. A source is white where it sits (an emitter is never
  // darkened) and spills its own colour onto the fascia around it with a soft falloff, so keys
  // next to a screen read better than keys in a far corner. A second, additive layer adds a faint
  // bloom halo around the brightest sources. The whole map slides toward white with the cabin
  // level, which is all dusk and dawn need.
  const LM_SCALE = 0.25;                       // the map is soft by nature: a quarter resolution is plenty
  const lmMap = document.createElement('canvas'); lmMap.className = 'lightmap';
  const lmBloom = document.createElement('canvas'); lmBloom.className = 'lightbloom';
  const lmCtx = lmMap.getContext('2d'), lbCtx = lmBloom.getContext('2d');
  let lmSrc = null, lmAt = 0, lmW = 0, lmH = 0;

  // Where every possible light source sits, in map pixels. Positions and colours only change
  // when the panel is rebuilt or resized, so they are read rarely; on/off is read every frame.
  function lmCollect() {
    const pr = panel.getBoundingClientRect();
    const sx = lmW / (pr.width || 1), sy = lmH / (pr.height || 1);
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - pr.left) * sx, y: (r.top - pr.top) * sy, w: r.width * sx, h: r.height * sy }; };
    const cssv = (el, v) => getComputedStyle(el).getPropertyValue(v).trim();
    const src = { probe: panel.firstElementChild, screens: [], lamps: [], dials: [], keys: [] };
    panel.querySelectorAll('.k-gps, .k-rtext, .k-live, .vf-glass, .w.display, .w.radio, .w.live, .w.status, .w.gps').forEach((el) => {
      const b = box(el); if (b.w < 1 || b.h < 1) return;
      b.col = el.classList.contains('vf-glass') ? '#46ebb9' : (cssv(el, '--acc') || '#7fb2ea');
      src.screens.push(b);
    });
    panel.querySelectorAll('.w .led, .w .lamp, .k-spr.s-lamp .pic').forEach((el) => {
      const w = el.closest('.w'); const b = box(el); if (b.w < 0.5) return;
      b.w0 = w; b.engl = w.classList.contains('engl');
      b.col = (w.classList.contains('k-spr') ? cssv(w, '--glow') || cssv(w, '--lamp') : cssv(w, '--lamp') || cssv(w, '--glow')) || '#ffb02e';
      src.lamps.push(b);
    });
    panel.querySelectorAll('.k-sgauge .sg, .k-gauge').forEach((el) => {
      const b = box(el); b.el = el; b.sov = el.classList.contains('sg'); src.dials.push(b);
    });
    // backlit symbols and legends (never the ones drawn inside a screen)
    panel.querySelectorAll('.w .ico, .w .lbl, .k-hot .cap').forEach((el) => {
      if (el.closest('.k-gps, .k-rtext, .rt-keys, .k-live')) return;
      const w = el.closest('.w'); const b = box(el); if (b.w < 0.5) return;
      b.w0 = w; b.kind = el.classList.contains('ico') ? 'ico' : el.classList.contains('lbl') ? 'lbl' : 'cap';
      b.col = cssv(w, '--lamp') || '#ffb02e';
      src.keys.push(b);
    });
    return src;
  }

  // Draws only the blurred shadow of a shape: the shape itself is pushed off the canvas and the
  // shadow offset brings the glow back in place. A gaussian falloff with no hard edge anywhere.
  function lmGlow(ctx, col, blur, alpha, shape) {
    if (alpha <= 0.003) return;
    const off = 20000;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha); ctx.shadowColor = col; ctx.shadowBlur = Math.max(0.5, blur); ctx.shadowOffsetX = off;
    ctx.fillStyle = '#000'; ctx.translate(-off, 0); ctx.beginPath(); shape(ctx); ctx.fill();
    ctx.restore();
  }
  const lmRect = (b, pad) => (c) => c.rect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
  const lmDisc = (cx, cy, r) => (c) => c.arc(cx, cy, Math.max(0.5, r), 0, Math.PI * 2);

  function lmDraw() {
    const c = typeof _cabinLv === 'number' ? _cabinLv : 0;
    if (lmMap.parentNode !== panel) { panel.appendChild(lmMap); panel.appendChild(lmBloom); lmSrc = null; }
    const on = c > 0.01 && !S.edit && !S.deco;
    lmMap.style.display = lmBloom.style.display = on ? '' : 'none';
    if (!on) return;
    const W = Math.max(8, Math.round(panel.clientWidth * LM_SCALE)), H = Math.max(8, Math.round(panel.clientHeight * LM_SCALE));
    if (W !== lmW || H !== lmH) { lmMap.width = lmBloom.width = lmW = W; lmMap.height = lmBloom.height = lmH = H; lmSrc = null; }
    const now = Date.now();
    if (!lmSrc || (lmSrc.probe && !lmSrc.probe.isConnected) || now - lmAt > 2000) { lmSrc = lmCollect(); lmAt = now; }
    const dead = deadNow(), lit = backlit() && !dead;
    const br = parseFloat(panel.style.getPropertyValue('--disp-bright')) || 1;
    const isOn = (w) => w.classList.contains('on') || w.classList.contains('lit');
    const m = lmCtx, bl = lbCtx;

    // ambient: cool, brightest at the windscreen, falling off toward the floor
    m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1; m.shadowBlur = 0;
    const g = m.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgb(78, 86, 108)'); g.addColorStop(0.4, 'rgb(52, 58, 74)'); g.addColorStop(1, 'rgb(32, 35, 45)');
    m.fillStyle = g; m.fillRect(0, 0, W, H);
    // the corners of the cab are the darkest
    m.globalCompositeOperation = 'multiply';
    const v = m.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.hypot(W, H) * 0.62);
    v.addColorStop(0, '#fff'); v.addColorStop(1, 'rgb(140, 140, 150)');
    m.fillStyle = v; m.fillRect(0, 0, W, H);

    m.globalCompositeOperation = 'lighter';
    bl.setTransform(1, 0, 0, 1, 0, 0); bl.globalCompositeOperation = 'source-over'; bl.clearRect(0, 0, W, H);

    // screens: the biggest emitters. Mostly dark glass with bright figures, so the spill is moderate.
    if (!dead) for (const s of lmSrc.screens) {
      const sz = s.w + s.h;
      lmGlow(m, s.col, sz * 0.1, 0.6 * br, lmRect(s, 0));
      lmGlow(m, s.col, sz * 0.4, 0.4 * br, lmRect(s, 0));
      m.globalAlpha = 1; m.fillStyle = '#fff'; m.fillRect(s.x, s.y, s.w, s.h);
      lmGlow(bl, s.col, sz * 0.18, 0.28 * br, lmRect(s, 0));
    }
    // gauge dials: lit from behind only when the dash lighting is on
    for (const d of lmSrc.dials) {
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2, r = Math.min(d.w, d.h) / 2;
      if (d.sov) {
        const gl = parseFloat(d.el.style.getPropertyValue('--glow')) || 0;
        if (gl <= 0.01) continue;
        m.globalAlpha = Math.min(1, 0.8 * gl); m.fillStyle = 'rgb(255, 196, 128)';
        m.beginPath(); m.arc(cx, cy + r * 0.08, r * 0.8, 0, Math.PI * 2); m.fill();
        lmGlow(m, '#ff9a3c', r * 0.9, 0.55 * gl, lmDisc(cx, cy + r * 0.25, r * 0.6));
        lmGlow(bl, '#ff9a3c', r * 0.7, 0.3 * gl, lmDisc(cx, cy + r * 0.25, r * 0.55));
      } else if (lit) {
        m.globalAlpha = 0.85; m.fillStyle = 'rgb(215, 228, 255)';
        m.beginPath(); m.arc(cx, cy, r * 0.92, 0, Math.PI * 2); m.fill();
        lmGlow(m, '#8fbfff', r * 0.8, 0.35, lmDisc(cx, cy, r * 0.8));
      }
    }
    // backlit symbols and legends: a faint warm glow bleeding through the key, stronger when active
    if (lit) for (const k of lmSrc.keys) {
      const active = isOn(k.w0);
      const col = active ? k.col : '#ffdcb0';
      const a = k.kind === 'ico' ? (active ? 0.95 : 0.6) : k.kind === 'lbl' ? (active ? 0.6 : 0.38) : (active ? 0.5 : 0.24);
      const sz = Math.min(k.w, k.h);
      lmGlow(m, col, sz * 0.12, a, lmRect(k, 0));
      lmGlow(m, col, sz * 0.5, a * 0.45, lmRect(k, 0));
    }
    // warning and status lamps: small, intense, strongly coloured
    for (const l of lmSrc.lamps) {
      if (!isOn(l.w0)) continue;
      const a = l.engl ? Math.min(1, parseFloat(l.w0.style.getPropertyValue('--lv')) || 0) : 1;
      if (a <= 0.02) continue;
      const cx = l.x + l.w / 2, cy = l.y + l.h / 2, r = Math.max(l.w, l.h) / 2;
      lmGlow(m, l.col, r * 2.2, 0.95 * a, lmDisc(cx, cy, r));
      lmGlow(m, l.col, r * 7, 0.45 * a, lmDisc(cx, cy, r));
      m.globalAlpha = a; m.fillStyle = '#fff'; m.beginPath(); m.arc(cx, cy, r * 1.05, 0, Math.PI * 2); m.fill();
      lmGlow(bl, l.col, r * 3, 0.6 * a, lmDisc(cx, cy, r));
    }
    // the bloom never washes over a screen's own figures
    bl.globalCompositeOperation = 'destination-out'; bl.globalAlpha = 1; bl.fillStyle = '#000';
    if (!dead) for (const s of lmSrc.screens) bl.fillRect(s.x, s.y, s.w, s.h);

    // dusk and dawn: slide the whole map toward white (no change at all)
    m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1 - c; m.fillStyle = '#fff'; m.fillRect(0, 0, W, H);
    m.globalAlpha = 1;
    lmBloom.style.opacity = c.toFixed(3);
  }
  setInterval(lmDraw, 70);
"""
js = rep(js, """      sg.style.setProperty('--glow', lv.toFixed(3));
    });
  }, 70);
""", """      sg.style.setProperty('--glow', lv.toFixed(3));
    });
  }, 70);
""" + LM, 'lm-anchor')

open(jsp, 'w', encoding='utf-8').write(js)

# ---------- CSS ----------
start = css.index('/* ═══════════════════════  DARK CABIN MODE')
end_m = '#panel.cabin-dark.edit .cap { filter: none; }'
end = css.index(end_m) + len(end_m)
css = css[:start] + """/* ═══════════════════════  DARK CABIN MODE  ═══════════════════════
   The night look is a light map drawn by the app (see lmDraw in app.js): a canvas multiplied
   over the panel (ambient + every light source with its spill) and a faint additive bloom.
   Nothing here dims elements one by one any more.
   ════════════════════════════════════════════════════════════════ */
#panel > canvas.lightmap, #panel > canvas.lightbloom {
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none; border-radius: inherit;
}
#panel > canvas.lightmap { z-index: 7; mix-blend-mode: multiply; }
#panel > canvas.lightbloom { z-index: 8; mix-blend-mode: screen; }

/* screen brightness (menu: Display brightness; auto dims with the cabin like a real dash) */
#panel .k-gps.tinfo, #panel .k-rtext, #panel .k-live, #panel .vf-glass, #panel .w.display, #panel .w.radio {
  filter: brightness(var(--disp-bright, 1));
}

/* extras bar sits outside the panel, so it is dimmed here */
#panel.cabin-dark ~ #extras { background: rgba(6, 6, 8, calc(0.3 + 0.65 * var(--cabin, 0))); }
#panel.cabin-dark ~ #extras .xkey { opacity: calc(1 - 0.6 * var(--cabin, 0)); }
#panel.cabin-dark ~ #extras .xgroup h4 { opacity: calc(1 - 0.6 * var(--cabin, 0)); }""" + css[end:]

# radio: lines never squeezed; wide variant puts the keys at the side
css += """

/* ---- radio screen fit ---- */
.k-rtext > .freight, .k-rtext > small, .k-rtext > b, .k-rtext > .rt-keys { flex-shrink: 0; }
.k-rtext.rt-wide { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-content: center; column-gap: 3%; }
.k-rtext.rt-wide > .freight, .k-rtext.rt-wide > small, .k-rtext.rt-wide > b { grid-column: 1; min-width: 0; display: block; }
.k-rtext.rt-wide > .rt-keys { grid-column: 2; grid-row: 1 / span 3; align-self: center; margin-top: 0; gap: 0.5em; }

/* ---- truck info screen: value cells read label | value on one line, so they fit the low strip ---- */
.tinfo.hero .th-stats .ti-c { flex-direction: row; align-items: center; justify-content: space-between; gap: 0.45em; padding: 0 0.55em; }
.tinfo.hero .th-stats .ti-c span { flex: 0 1 auto; min-width: 0; font-size: 0.72em; line-height: 1; }
.tinfo.hero .th-stats .ti-c b { flex: none; font-size: 1.3em; line-height: 1; }
"""
open(cssp, 'w', encoding='utf-8').write(css)
print('OK')
