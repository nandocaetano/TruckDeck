import sys
pub = sys.argv[1]
p = pub + '/app.js'; s = open(p, encoding='utf-8').read()
def rep(o, n):
    global s
    assert s.count(o) == 1, o
    s = s.replace(o, n)
rep("const a = k.kind === 'ico' ? (active ? 0.95 : 0.6) : k.kind === 'lbl' ? (active ? 0.6 : 0.38) : (active ? 0.5 : 0.24);",
    "const a = k.kind === 'ico' ? (active ? 0.9 : 0.42) : k.kind === 'lbl' ? (active ? 0.5 : 0.26) : (active ? 0.45 : 0.2);")
rep("lmGlow(m, col, sz * 0.5, a * 0.45, lmRect(k, 0));", "lmGlow(m, col, sz * 0.5, a * 0.3, lmRect(k, 0));")
rep("""      lmGlow(m, l.col, r * 2.2, 0.95 * a, lmDisc(cx, cy, r));
      lmGlow(m, l.col, r * 7, 0.45 * a, lmDisc(cx, cy, r));
      m.globalAlpha = a; m.fillStyle = '#fff'; m.beginPath(); m.arc(cx, cy, r * 1.05, 0, Math.PI * 2); m.fill();""",
"""      lmGlow(m, l.col, r * 1.6, 0.9 * a, lmDisc(cx, cy, r * 0.55));
      lmGlow(m, l.col, r * 6, 0.45 * a, lmDisc(cx, cy, r * 0.6));
      m.globalAlpha = a; m.fillStyle = '#fff'; m.beginPath(); m.arc(cx, cy, r * 0.6, 0, Math.PI * 2); m.fill();""")
open(p, 'w', encoding='utf-8').write(s)
c = pub + '/app.css'; t = open(c, encoding='utf-8').read()
o = ".tinfo.hero .th-stats .ti-c span { flex: 0 1 auto; min-width: 0; font-size: 0.72em; line-height: 1; }\n.tinfo.hero .th-stats .ti-c b { flex: none; font-size: 1.3em; line-height: 1; }"
assert t.count(o) == 1
t = t.replace(o, ".tinfo.hero .th-stats .ti-c span { flex: 0 1 auto; min-width: 0; font-size: 0.64em; letter-spacing: 0.04em; line-height: 1; }\n.tinfo.hero .th-stats .ti-c b { flex: none; font-size: 1.2em; line-height: 1; }")
t += "/* fuel / range column carries the longest values (\"1480 km\"): give it the extra width */\n.tinfo.hero .th-stats { grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); }\n"
open(c, 'w', encoding='utf-8').write(t)
print('ok')
