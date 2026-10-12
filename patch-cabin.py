import sys

js_path = sys.argv[1]
css_path = sys.argv[2]

with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# ═══ JS CHANGES ═══

# 1. Add 'cabin' to GLOBAL_KEYS
js = js.replace(
    "const GLOBAL_KEYS = ['lang', 'units', 'gearCrawlers', 'lights', 'names', 'autoRotate'];",
    "const GLOBAL_KEYS = ['lang', 'units', 'gearCrawlers', 'lights', 'cabin', 'names', 'autoRotate'];"
)

# 2. Add cabin to ensurePrefs default (next to lights)
js = js.replace(
    "lights: a.lights || 'auto',",
    "lights: a.lights || 'auto', cabin: a.cabin || 'off',"
)

# 3. Add cabinDark() function right after backlit()
# Find the end of backlit function — locate the closing of the function
# backlit() returns true/false and ends before a certain line
# Let me find the exact location by searching for the function
backlit_marker = "  function backlit() {"
backlit_idx = js.index(backlit_marker)
# Find the function's return block and the next function after it
# The backlit function ends just before a comment about the render loop or similar
# Let's find it by looking for the next top-level function/variable after backlit

# Actually let me add cabinDark() right before the updateStates line that uses it
# I'll add it as a one-liner helper

cabin_func = """
  // Dark cabin mode: simulates sitting in a dark truck cabin at night.
  // 'auto' follows the truck lights — when the dash is lit, the cabin goes dark (night driving).
  // 'dark' forces it on, 'off' keeps the panel looking bright as before.
  function cabinDark() {
    const mode = layout().cabin || 'off';
    if (mode === 'dark') return true;
    if (mode === 'off') return false;
    // auto: dark when the dash lighting is on (lights on → nighttime → dark cabin)
    return backlit();
  }

"""

# Insert cabinDark() right before updateStates
update_marker = "  // Cheap state pass: touches classes and readout text only"
if update_marker not in js:
    print("ERROR: updateStates marker not found", file=sys.stderr)
    sys.exit(1)
js = js.replace(update_marker, cabin_func + "  // Cheap state pass: touches classes and readout text only")

# 4. Add cabin-dark class toggle in updateStates, right after the unlit toggle
js = js.replace(
    "panel.classList.toggle('unlit', panel.classList.contains('skin') && !backlit());",
    "panel.classList.toggle('unlit', panel.classList.contains('skin') && !backlit());\n    panel.classList.toggle('cabin-dark', cabinDark());"
)

# 5. Add cabin setting dropdown in the settings menu, right after the lights dropdown row
old_lights_row = """'<div class="row"><label class="field grow"><span>Key backlight</span><select data-field="lights">' + options([
        ['auto', 'Auto: with the truck lights'], ['on', 'Always on'], ['off', 'Off'],
      ], pr.lights || 'auto') + '</select></label>' +
      '<label class="field grow"><span>Key names</span><select data-field="names">' + options([['show', 'Shown'], ['hide', 'Hidden']], pr.names || 'show') + '</select></label></div>' +"""

new_lights_row = """'<div class="row"><label class="field grow"><span>Key backlight</span><select data-field="lights">' + options([
        ['auto', 'Auto: with the truck lights'], ['on', 'Always on'], ['off', 'Off'],
      ], pr.lights || 'auto') + '</select></label>' +
      '<label class="field grow"><span>Key names</span><select data-field="names">' + options([['show', 'Shown'], ['hide', 'Hidden']], pr.names || 'show') + '</select></label></div>' +
      '<label class="field"><span>Dark cabin</span><select data-field="cabin">' + options([
        ['off', 'Off'], ['auto', 'Auto: with the truck lights'], ['dark', 'Always dark'],
      ], pr.cabin || 'off') + '</select></label>' +"""

if old_lights_row not in js:
    print("ERROR: lights row not found in settings", file=sys.stderr)
    sys.exit(1)
js = js.replace(old_lights_row, new_lights_row)

# 6. Make cabin setting trigger renderAll like autoRotate does (visual state change)
# Currently: if (f === 'autoRotate') renderAll(); else { updateStates(); renderPanel(); }
# Change to include 'cabin'
js = js.replace(
    "if (f === 'autoRotate') renderAll(); else { updateStates(); renderPanel(); }",
    "if (f === 'autoRotate' || f === 'cabin') renderAll(); else { updateStates(); renderPanel(); }"
)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("JS OK")

# ═══ CSS CHANGES ═══
# Add dark cabin styles at the end of the file

cabin_css = """
/* ════════════════════════════════════════════════════════════════════════════
   Dark cabin mode: everything dark except the instrument light sources.
   The panel looks like you're sitting in a truck cabin at night.
   ════════════════════════════════════════════════════════════════════════════ */

/* ---- Panel surface: near-black with a hint of the art's texture ---- */
#panel.cabin-dark.skin {
  background-color: #0c0c0c !important;
  background-blend-mode: multiply;
}
#panel.cabin-dark:not(.skin) {
  background: #040404 !important;
  border-color: #0a0a0a !important;
}
/* dim the glass sheen overlay in dark mode */
#panel.cabin-dark.skin::after {
  opacity: 0.15;
}

/* ---- Non-skin panels: darken button caps ---- */
#panel.cabin-dark:not(.skin) {
  --cap-hi: #0a0a0a;
  --cap-mid: #060606;
  --cap-lo: #040404;
}
#panel.cabin-dark:not(.skin) .w {
  color: rgba(255, 255, 255, 0.04);
  text-shadow: none;
}
#panel.cabin-dark:not(.skin) .ico { opacity: 0.04; }
#panel.cabin-dark:not(.skin) .lbl { opacity: 0.04; }
#panel.cabin-dark:not(.skin) .led { opacity: 0.12; }
/* lit buttons: lamp LED and icon glow through the dark */
#panel.cabin-dark:not(.skin) .w.on .led { opacity: 1; }
#panel.cabin-dark:not(.skin) .w.on .ico { opacity: 0.55; }
#panel.cabin-dark:not(.skin) .w.on .lbl { opacity: 0.08; }

/* ---- Skin panels: buttons are part of the surface art, already darkened ---- */
/* pressed state cap also darkens */
#panel.cabin-dark.skin .cap { filter: brightness(0.08); }
/* lamps still bloom through the dark */
#panel.cabin-dark.skin .k-hot.on .lamp {
  box-shadow: 0 0 6px 2px var(--lamp), 0 0 16px 5px color-mix(in srgb, var(--lamp) 50%, transparent), 0 0 36px 10px color-mix(in srgb, var(--lamp) 16%, transparent);
}

/* ---- Soviet switches/toggles/keys: nearly invisible ---- */
#panel.cabin-dark .k-spr .pic { filter: brightness(0.06) !important; }
#panel.cabin-dark .k-spr .tag { opacity: 0.04; }
/* but indicator lamps keep their glow */
#panel.cabin-dark .k-spr.s-lamp.on .pic {
  filter: brightness(1.4) saturate(1.5) drop-shadow(0 0 calc(var(--k) * 0.18) var(--glow)) !important;
}
/* engine lamp keeps its RPM-following glow */
#panel.cabin-dark .k-spr.s-lamp.engl.lit .pic {
  filter: brightness(calc(0.6 + 1.2 * var(--lv))) saturate(calc(0.8 + 1 * var(--lv))) drop-shadow(0 0 calc(var(--k) * 0.2 * var(--lv)) rgba(40, 255, 130, calc(0.9 * var(--lv)))) !important;
}
#panel.cabin-dark .k-spr.s-lamp.engl.lit .pic::after {
  filter: brightness(calc(0.5 + 1.5 * var(--lv))) saturate(calc(0.7 + 1.2 * var(--lv))) drop-shadow(0 0 calc(var(--k) * 0.14 * var(--lv)) rgba(40, 255, 130, calc(0.9 * var(--lv))));
}

/* ---- Knobs: barely visible ---- */
#panel.cabin-dark .k-knob { opacity: 0.06; }
#panel.cabin-dark .k-knob i::after { opacity: 0.15; } /* the white dot is a tiny reference point */

/* ---- Displays: LIGHT SOURCES — stay bright, add bloom ---- */
#panel.cabin-dark .k-gps.tinfo {
  box-shadow: 0 0 22px 6px rgba(90, 150, 210, 0.12), 0 0 6px 2px rgba(90, 150, 210, 0.08);
}
#panel.cabin-dark .k-rtext {
  box-shadow: 0 0 16px 4px rgba(90, 150, 210, 0.1), 0 0 4px 1px rgba(90, 150, 210, 0.06);
}
#panel.cabin-dark .k-live {
  box-shadow: 0 0 12px 3px rgba(90, 150, 210, 0.08);
}

/* Soviet VFD seven-segment: already glows green, add bloom */
#panel.cabin-dark .vfd .vf-glass {
  box-shadow: 0 0 24px 6px rgba(60, 240, 180, 0.1), 0 0 8px 2px rgba(60, 240, 180, 0.06);
}
/* VFD orange labels */
#panel.cabin-dark .vfd .vf-cap {
  text-shadow: 0 0 6px rgba(230, 150, 50, 0.4);
}

/* Soviet gauges: amber glow already there, add outer bloom when lit */
#panel.cabin-dark .k-sgauge .sg {
  filter: drop-shadow(0 3px 4px rgba(40, 25, 5, 0.45)) drop-shadow(0 0 calc(12px * var(--glow, 0)) rgba(255, 170, 50, calc(0.2 * var(--glow, 0))));
}

/* Skin gauges (modern panel): add subtle bloom */
#panel.cabin-dark .k-gauge {
  filter: drop-shadow(0 0 8px rgba(200, 220, 240, 0.06));
}

/* Non-skin display widgets: keep bright */
#panel.cabin-dark .display .lcd {
  box-shadow: 0 0 10px 2px rgba(100, 160, 220, 0.08);
}

/* ---- Extras bar (the bottom toolbar) ---- */
#panel.cabin-dark ~ #extras { background: rgba(2, 2, 2, 0.95); }
#panel.cabin-dark ~ #extras .xkey { color: #1a1c1e; }
#panel.cabin-dark ~ #extras .xgroup h4 { color: #111214; }

/* ---- Stickers: dim them in the dark ---- */
#panel.cabin-dark .k-sticker { opacity: 0.06; }

/* ---- Edit mode: override dark cabin so the user can see the layout ---- */
#panel.cabin-dark.edit { background-blend-mode: normal !important; background-color: #050505 !important; }
#panel.cabin-dark.edit .k-spr .pic { filter: none !important; }
#panel.cabin-dark.edit .k-spr .tag { opacity: 1; }
#panel.cabin-dark.edit .cap { filter: none; }
"""

css += cabin_css

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)
print("CSS OK")
