import sys

# ── Fix 1: Soviet glow → bottom-emanating, contained within gauge ──
css_path = sys.argv[1]
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

old_glow = """.k-sgauge .sg::after {
  content: ''; position: absolute; inset: 8%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(ellipse 70% 70% at 50% 50%, rgba(255, 170, 50, 0.45) 0%, rgba(255, 140, 30, 0.18) 40%, transparent 72%);
  opacity: var(--glow, 0); transition: opacity 180ms linear;
  mix-blend-mode: screen;
}"""

# Light source at bottom (80%), elongated ellipse wider than tall, tighter falloff
new_glow = """.k-sgauge .sg::after {
  content: ''; position: absolute; inset: 8%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(ellipse 90% 55% at 50% 82%, rgba(255, 165, 45, 0.52) 0%, rgba(255, 140, 30, 0.22) 30%, rgba(255, 120, 20, 0.06) 55%, transparent 70%);
  opacity: var(--glow, 0); transition: opacity 180ms linear;
  mix-blend-mode: screen;
  overflow: hidden;
}"""

if old_glow not in css:
    print("ERROR: old glow CSS not found", file=sys.stderr)
    sys.exit(1)

css = css.replace(old_glow, new_glow)

# ── Fix 2: rtext text clipping — reduce freight/artist proportions and button size ──
# Make media buttons smaller so they don't eat vertical space
old_rtkeys = """.rt-keys i {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8em;
  height: 1.8em;
  border-radius: 50%;"""

new_rtkeys = """.rt-keys i {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5em;
  height: 1.5em;
  border-radius: 50%;"""

if old_rtkeys not in css:
    print("ERROR: old rt-keys i CSS not found", file=sys.stderr)
    sys.exit(1)

css = css.replace(old_rtkeys, new_rtkeys)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)
print("CSS fixes OK")

# ── Fix 3: JS rtext font sizes — slightly smaller so content fits ──
js_path = sys.argv[2]
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Reduce freight from 0.22 to 0.17
js = js.replace(
    "freightEl.style.fontSize = (boxH * 0.22 * (w.fs || 1)).toFixed(1) + 'px';",
    "freightEl.style.fontSize = (boxH * 0.17 * (w.fs || 1)).toFixed(1) + 'px';"
)

# Reduce artist from 0.28 to 0.22
js = js.replace(
    "artistEl.style.fontSize = (boxH * 0.28 * (w.fs || 1)).toFixed(1) + 'px';",
    "artistEl.style.fontSize = (boxH * 0.22 * (w.fs || 1)).toFixed(1) + 'px';"
)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("JS fixes OK")
