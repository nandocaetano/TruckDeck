import sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    css = f.read()

# Insert amber glow styles right after the .k-sgauge .sg rule (line 1787)
anchor = """.k-sgauge .sg { height: 100%; max-width: 100%; aspect-ratio: 1; background: url("skins/sov/gauge.png") center / contain no-repeat; filter: drop-shadow(0 3px 4px rgba(40, 25, 5, 0.45)); }"""

glow_css = """.k-sgauge .sg { height: 100%; max-width: 100%; aspect-ratio: 1; background: url("skins/sov/gauge.png") center / contain no-repeat; filter: drop-shadow(0 3px 4px rgba(40, 25, 5, 0.45)); position: relative; --glow: 0; }
.k-sgauge .sg::after {
  content: ''; position: absolute; inset: 8%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(ellipse 70% 70% at 50% 50%, rgba(255, 170, 50, 0.45) 0%, rgba(255, 140, 30, 0.18) 40%, transparent 72%);
  opacity: var(--glow, 0); transition: opacity 180ms linear;
  mix-blend-mode: screen;
}"""

if anchor not in css:
    print("ERROR: .sg anchor not found in CSS", file=sys.stderr)
    sys.exit(1)

css = css.replace(anchor, glow_css)

with open(path, 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS patched OK")
