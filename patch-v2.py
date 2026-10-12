import sys

js_path = sys.argv[1]
css_path = sys.argv[2]

with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# ── JS: Remove the static glow from sgauge render loop ──
old_sgauge = """    if (w.t === 'sgauge') {
      const spec = sovSpec(w.field);
      const v = deadNow() ? 0 : gaugeValue(w.field);
      node.querySelector('.needle').style.transform = 'rotate(' + (SWEEP * clamp(v / spec.max, 0, 1)).toFixed(1) + 'deg)';
      // Polyvox-style amber glow: intensity follows RPM, only when dash lights are on
      const sg = node.querySelector('.sg');
      let gl = 0;
      if (backlit() && !deadNow()) {
        const t = curTel();
        const rpm = (t && t.rpm) || 0;
        // idle (~600) = dim glow 0.12, mid (~1400) = moderate 0.4, high (~2200+) = full 0.75
        gl = 0.12 + 0.63 * clamp((rpm - 500) / 1800, 0, 1);
      }
      sg.style.setProperty('--glow', gl.toFixed(3));
      return;
    }"""

new_sgauge = """    if (w.t === 'sgauge') {
      const spec = sovSpec(w.field);
      const v = deadNow() ? 0 : gaugeValue(w.field);
      node.querySelector('.needle').style.transform = 'rotate(' + (SWEEP * clamp(v / spec.max, 0, 1)).toFixed(1) + 'deg)';
      return;
    }"""

if old_sgauge not in js:
    print("ERROR: old sgauge block not found", file=sys.stderr)
    sys.exit(1)
js = js.replace(old_sgauge, new_sgauge)

# ── JS: Add flickering gauge glow interval right after the engLv interval (after its closing }) ──
# Find the end of the engLv setInterval block
eng_end = "nodes.forEach((n) => { n.style.setProperty('--lv', v); n.classList.toggle('lit', engLv > 0.05); });\n  }, 70);"

glow_interval = """nodes.forEach((n) => { n.style.setProperty('--lv', v); n.classList.toggle('lit', engLv > 0.05); });
  }, 70);

  // Polyvox-style amber gauge glow: each gauge has its own flickering bulb on tired Soviet wiring.
  // Follows dash lights (backlit()), intensity tracks RPM, each gauge flickers independently.
  setInterval(() => {
    const gauges = panel.querySelectorAll('.k-sgauge .sg');
    if (!gauges.length) return;
    const t = curTel();
    const lit = backlit() && !deadNow();
    gauges.forEach((sg) => {
      let lv = parseFloat(sg.dataset.glv) || 0;
      // unique seed per gauge so each one flickers on its own cycle
      if (!sg.dataset.gseed) sg.dataset.gseed = String(Math.random());
      const seed = parseFloat(sg.dataset.gseed);
      let target = 0;
      if (lit && t) {
        const rpm = t.rpm || 0;
        const running = t.engine !== false && rpm > 150;
        if (!running) {
          // ignition only, engine off: very faint unstable glow
          target = 0.06 + Math.random() * 0.04;
        } else {
          const k = clamp((rpm - 500) / 1800, 0, 1);            // 0 at idle, 1 from ~2300 rpm
          // per-gauge flicker: wide swing at idle, almost none at speed
          const flick = (0.22 - 0.19 * k) * (Math.random() * 2 - 1);
          // sine-wave micro-tremor offset by the gauge's own seed
          const tremor = Math.sin(Date.now() * 0.0035 + seed * 628) * 0.025 * (1 - k * 0.8);
          target = 0.16 + 0.54 * k + flick + tremor;
          // occasional dropout at low RPM: the bulb "misses" — old wiring
          if (k < 0.3 && Math.random() < (0.035 + seed * 0.025)) target *= 0.12;
        }
      }
      // filament inertia: slightly different response time per gauge
      const smooth = 0.42 + seed * 0.18;
      lv += (clamp(target, 0, 1) - lv) * smooth;
      sg.dataset.glv = lv.toFixed(4);
      sg.style.setProperty('--glow', lv.toFixed(3));
    });
  }, 70);"""

if eng_end not in js:
    print("ERROR: engLv interval end not found", file=sys.stderr)
    sys.exit(1)
js = js.replace(eng_end, glow_interval)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("JS OK")

# ── CSS: Damage bar larger ──
css = css.replace(
    "font-size: 0.78em;\n  white-space: nowrap;\n  color: #8496a6;",
    "font-size: 0.92em;\n  white-space: nowrap;\n  color: #8496a6;"
)
css = css.replace(
    ".ti-di .ico { width: 1.15em; height: 1.15em; opacity: 0.7; }",
    ".ti-di .ico { width: 1.2em; height: 1.2em; opacity: 0.7; }"
)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)
print("CSS OK")
