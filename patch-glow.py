import sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# ── JS patch: add glow logic after needle rotation in sgauge block ──
old_sgauge = """    if (w.t === 'sgauge') {
      const spec = sovSpec(w.field);
      const v = deadNow() ? 0 : gaugeValue(w.field);
      node.querySelector('.needle').style.transform = 'rotate(' + (SWEEP * clamp(v / spec.max, 0, 1)).toFixed(1) + 'deg)';
      return;
    }"""

new_sgauge = """    if (w.t === 'sgauge') {
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

if old_sgauge not in code:
    print("ERROR: sgauge block not found in JS", file=sys.stderr)
    sys.exit(1)

code = code.replace(old_sgauge, new_sgauge)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("JS patched OK")
