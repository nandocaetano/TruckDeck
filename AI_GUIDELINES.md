# AI_GUIDELINES.md — Truck Deck

**Source of truth for any AI or developer working on this project.**
Read this fully before touching a file. Every rule here comes from a bug that
actually happened in this codebase, not from general best practice.

Last verified against the codebase: 2026-10-11.

---

## 0. Read this first: the stack is not what you assume

| Assumption | Reality |
|---|---|
| React Native / React / Vue | **None.** Plain HTML + CSS + ES5-ish JS, no framework, no JSX, no bundler. |
| WebSocket telemetry | **Server-Sent Events** (`EventSource`). Converting it to WebSocket breaks the bridge. |
| `npm run build` | No npm scripts. The build is `node tools/build.js`. |
| `assets/images/` | Does not exist. Artwork lives in `art/`, served skins in `public/skins/`. |
| A component tree | Widgets are plain objects in a layout array, rendered into absolutely positioned `<div>`s. |

If a prompt handed to you asserts any of the left column, correct it before
writing code. Several real defects in this project trace back to an AI acting on
a wrong premise rather than reading the source.

---

## 1. Architecture

### 1.1 Layout of the repo

```
public/          everything the WebView loads (THE front-end)
  app.js         ~5k lines: state, rendering, telemetry, menus
  app.css        all styling, including every panel skin
  catalog.js     the function catalogue (what a button can do)
  skins.js       shared skin registry
  frames.js          SKINS.eu_frame
  frames_sov.js      SKINS.sov_frame
  frames_scania.js   SKINS.scania_frame      ("S/R 2016")
  frames_scania25.js SKINS.scania25_frame + window.SC25  ("Digital 2025")
  presets.js     shipped panel presets
  body.html      the DOM skeleton build.js wraps
  index.html     GENERATED — never hand-edit
bridge/server.js Node HTTP + SSE server, port 8765
tools/build.js   generates public/index.html and dist/preview.html
data/config.json pin and settings
art/             panel artwork (png/jpg) — real assets, never "clean up"
dist/            generated demo build
```

### 1.2 How the app runs

An Android WebView loads `http://<PC-IP>:8765/?pin=<pin>`. The bridge serves
`public/` with `Cache-Control: no-store`. There is no server-side rendering and
no API framework.

### 1.3 Build step — mandatory

`public/index.html` is **generated**. It lists every script with a `?v=<stamp>`
cache-buster so a tablet can never run a stale script.

```
node tools/build.js
```

Run it after **every** change under `public/`. Editing `index.html` by hand is
always wrong: the next build overwrites it. If a change "doesn't appear", the
missing build is the first thing to check.

---

## 2. Telemetry — rules for connecting UI to the game

### 2.1 The actual transport

`bridge/server.js`, line 6, states the design decision explicitly:

> Plain HTTP + Server-Sent Events instead of WebSocket: both are built into Node
> and into the browser.

**Never replace SSE with WebSocket.** It is a deliberate choice, not an
oversight. The endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/info` | GET | handshake; `{app:'truckdeck', version:1}` |
| `/api/events` | GET | **SSE stream** — telemetry and media frames |
| `/api/frame` | GET | one-shot snapshot |
| `/api/key` | POST | send a keypress to the game |
| `/api/layouts` | GET/PUT | persist panel layouts |

Auth is a `pin` query parameter. A `401` means a bad pin, and the client must
call `setBridge('pin')` — not retry blindly.

### 2.2 The client contract

```js
events = new EventSource('api/events?pin=' + encodeURIComponent(S.pin));
// ...
if (msg.type === 'tel')   { S.tel = msg; renderStatus(); updateStates(); }
else if (msg.type === 'media') { S.media = msg; updateStates(); }
```

Four connection states, and the UI must handle all four:

| `S.bridge` | Meaning |
|---|---|
| `demo` | no bridge found — the app renders `DEMO_TEL`, a fixed fake frame |
| `ok` | live telemetry flowing |
| `pin` | bridge reachable, pin rejected |
| `lost` | connection dropped; `EventSource` retries on its own |

`DEMO_TEL` (app.js) is why a disconnected panel shows 82 km/h, gear 12, damage
7/1/1 and 11:05. Those are **canned constants**, not a bug. Any new readout must
have a `DEMO_TEL` field too, or it will render blank in demo mode and look broken.

### 2.3 Rules that prevent dead code and broken comms

1. **Never overwrite `app.js` wholesale.** It holds the SSE client, the key
   sender, layout persistence and the menu. Rewriting it to "clean up" the UI
   has destroyed the transport before. Make surgical edits.
2. **Read a telemetry field before you render it.** Confirm the field exists in
   the `tel` message. Inventing a field name produces a permanently blank readout
   that looks like a CSS bug and wastes hours.
3. **Two update paths, do not confuse them.**
   - `renderPanel()` rebuilds DOM. Expensive. Layout changes only.
   - `updateStates()` runs on every telemetry frame and must **only** touch
     classes and text. It explicitly must not rebuild DOM, or it steals touch
     events mid-press.
   A new widget type needs a branch in `updateSkinNode()` — or an early
   `return` if it is static. A type with neither silently never updates.
4. **Removing a widget means removing its update branch too.** An orphaned branch
   querying a node that no longer exists is dead code that throws on every frame.
5. `SC25.ctx` is assigned by `app.js` and read by the cluster each frame. If you
   move cluster code, keep that handshake intact.

---

## 3. Design standards — automotive skeuomorphism

The target is a real moulded plastic control panel photographed in a dark cab.
Not a flat web UI, not a neon gamer theme.

### 3.1 Always-dark, no light mode

The panel simulates a night cab. There is no light theme and no
`prefers-color-scheme` branch. Base plastic sits around `#0b0d0f`–`#161a1c`.
Introducing a light variant breaks the premise.

### 3.2 Material: moulded plastic, not glass

Panel body uses layered grain plus a directional gradient:

```css
background-image:
  repeating-linear-gradient(0deg,  rgba(255,255,255,.006) 0 1px, transparent 1px 3px),
  repeating-linear-gradient(90deg, rgba(0,0,0,.035)      0 1px, transparent 1px 5px),
  linear-gradient(174deg, #141617 0%, #0d0e10 30%, #090a0b 58%, #101213 100%);
background-size: 3px 3px, 5px 5px, 100% 100%;
```

Keep grain opacity under `.04`. Above that it reads as noise, not texture.

### 3.3 Bezels: light from above, always

Every raised control carries the same four-part shadow stack. Top edge catches
light, bottom edge is occluded, plus a contact shadow:

```css
box-shadow:
  0 0 0 0.5px rgba(90,96,100,.18),   /* micro rim, separates from the panel */
  inset 0 1px 0 rgba(255,255,255,.08), /* top highlight = light from above */
  inset 0 -1px 2px rgba(0,0,0,.6),     /* bottom occlusion */
  0 1.5px 3px rgba(0,0,0,.7);          /* contact shadow on the panel */
border-top-color: rgba(65,70,74,.5);   /* lighter top border */
```

A pressed key inverts this: highlight moves to the bottom, contact shadow
collapses. Never fake a press with opacity alone.

### 3.4 Screen depth: radial inner shadow

Any display area (cluster, readouts) is recessed, never flat:

```css
box-shadow:
  inset 0 2px 5px rgba(0,0,0,.6),
  inset 0 0 8px rgba(0,0,0,.3),
  0 1px 0 rgba(255,255,255,.05);
background: linear-gradient(180deg, #050708, #0c0f11);
```

### 3.5 LED and LCD realism: glow, not flat fill

A lit element is a light source. Flat `color: cyan` reads as a web link.

```css
color: var(--accent);
text-shadow: 0 0 calc(var(--u) * .06) color-mix(in srgb, var(--accent) 60%, transparent);
```

Severity palette, used consistently:

| State | Colour |
|---|---|
| normal readout | `#cbd7de` |
| dim label | `#8ea0aa` |
| warn | `#e8a64b` |
| critical | `#ff6b61` |
| accent / active | `var(--accent)` (user-selectable backlight) |

Accent is themeable via the palette picker. **Never hard-code the accent** —
read `var(--accent)` so the user's colour choice propagates.

### 3.6 Typography

Condensed grotesque only: `Barlow Condensed`, `Roboto Condensed`,
`Arial Narrow`. Numeric readouts use `font-variant-numeric: tabular-nums` so
digits do not jitter frame to frame.

---

## 4. Layout, mapping and button rules

### 4.1 The skin coordinate system

A skin declares two cuts and a widget list. Rects are **percentages** of the
panel box, `[x, y, width, height]`:

```js
SKINS.scania25_frame = {
  T: { ar: 1.792, frame: 1, w: [ ... ] },  // landscape (tablet)
  P: { ar: 0.625, frame: 1, w: [ ... ] },  // portrait  (phone)
};
```

`autoSize()` returns `'phone'` when `innerHeight > innerWidth`, which selects the
`P` cut. Both cuts must be maintained — shipping a change to only one leaves
half the users on the old layout.

### 4.2 Mandatory system buttons

Every panel must expose, grouped together and reachable without scrolling:

| Function | Label |
|---|---|
| `quick_save` | Q. SAVE |
| `world_map` | MAP |
| `activate` | ENTER |

Convention: **top-right** in landscape, **first row right-hand group** in
portrait. Users build muscle memory across panels; moving these is a regression.

### 4.3 Grouping into families

Buttons are laid out by family using the `run()` helper, which takes an array of
families and spaces them with a larger gap between families than within one:

```js
...run([['media_prev','media_play','media_next'],
        ['cam_prev','cam_interior','cam_next'],
        ['quick_save','world_map','activate']],
       3.5, 37, 9, 6, 0.8, 3.6, 'box_r1', {wide:1}),
//     x0   y   w  h  gap  famGap
```

Rule: `famGap` must be at least 3× `gap`. That whitespace is the divider — it
separates families without drawing a line. Prefer it to literal borders.

Related controls stay adjacent and symmetric. Signals read left→hazard→right,
mirrored around the panel centre.

### 4.4 Iconography

Inline SVG only, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
`stroke-width="1.7"`, round caps and joins. `currentColor` is what lets a key
inherit its lit/unlit/warn state. Never ship an icon as a raster image, and never
hard-code an icon's stroke colour.

---

## 5. The skin class rule — read this before writing any CSS

**This is the single most expensive bug in the project's history. It has
recurred more than once.**

The same widget renders under two different class schemes:

| Context | Classes on the element |
|---|---|
| Normal grid panel | `w status`, `w kbd`, `w plate` |
| **On a skin** | `w sk k-status`, `w sk k-kbd`, `w sk k-plate` |

So CSS written as:

```css
.w.status .sbar { display: flex; }   /* base rule */
```

**silently does nothing** on a skin panel, because the element is
`.w.sk.k-status`. No error, no warning — the rule just never matches.

What this caused: the status strip's children (`.sbar`, `.sgroup`, `.dmg`) lost
their flex layout, fell back to block, stacked vertically, and a 30px-tall
container painted **159px** of damage readouts and trip text straight down over
the instrument cluster. It was misdiagnosed for several rounds as a stray
background image.

**Rules:**

1. Styling a widget on a skin? Write the selector against `.k-<type>`, scoped to
   the skin: `#app[data-style="<skin>"] #panel.skin.<box> .k-<type>`.
2. Style the **inner** elements too. Skin scope does not inherit the base rules.
3. Any skin widget positioned over a display **must** carry `overflow: hidden`.
   Clipping is the backstop that turns a layout bug into a cosmetic one instead
   of an unusable panel.
4. After adding a widget type to a skin, verify its rendered box height matches
   its declared rect. A mismatch means inner rules are missing.

---

## 6. Strict anti-patterns

### 6.1 Never inject decorative background SVG behind the UI

Large watermark drawings, heraldic crests and road-perspective lines were drawn
behind the live instruments at low opacity. On the portrait cut they scaled up
and read as giant white shapes smeared across the cluster and the button grid.

They have been **deleted from source**, not merely hidden. Do not reintroduce
them. If decoration is ever wanted, it must be: outside the interactive area,
clipped by `overflow: hidden`, and under `opacity: .06`.

Hiding such a thing with CSS alone is not a fix — a later selector change brings
it back. Remove it from the markup.

### 6.2 Never put a border on the central OBD display

The on-board computer group sits on the cluster's own dark glass. A border turns
it into a floating web card and destroys the single-instrument illusion. Depth
comes from the inner shadow in §3.4, never from an outline.

### 6.3 No ghost overlays or z-index races

Loading and connection overlays must be removed from the DOM when dismissed, not
parked at `opacity: 0`. An invisible full-size overlay still swallows touches,
and the resulting "buttons do nothing" bug is very hard to trace.

Z-index budget for a skin panel:

| Layer | z-index |
|---|---|
| skin background / cluster | 0–10 |
| keys and readouts | 10–30 |
| palette picker, popovers | 40 |
| modals | 100+ |

Anything above 100 that is not a modal is a bug.

### 6.4 No redundant chrome

If the cluster already shows a value, do not add a second widget showing it
again. Two clocks (one in the cluster, one below) and a static
`TRUCKDECK • ETS2` nameplate were both removed: they consumed prime space and
carried no information. Space on a phone panel is for controls and live data.

### 6.5 No unstructured code

- Comments explain **why**, not what. `// set width to 50%` is noise;
  `// 55% leaves room for the trip sentence to truncate instead of wrap` is not.
- Match the surrounding style. This codebase uses compact single-quote JS and
  grouped CSS blocks with section banners. Do not introduce a new formatting
  dialect in one file.
- No dependencies. The project ships zero npm runtime packages on purpose.
- English for all code, identifiers, comments and UI strings — without exception,
  including in Portuguese-language conversations.

---

## 7. Verification protocol — do not skip

Two failures in this project were caused by *reporting success without
checking*. Both are cheap to prevent.

### 7.1 A successful write is not a deployed change

A file copy to the PC reported success and **did not actually land**. The build
then ran against the old file and reported success too. Three "fixed" messages
went out while nothing had changed on disk.

After deploying, re-read the file on the target and assert the change is present:

```
grep -n "<the string you just changed>" public/frames_scania25.js
```

If it is not there, the write did not happen. Re-commit and check again.

### 7.2 Grep proves the source, not the render

Source being clean does not mean the panel looks right. The watermark was gone
from the source while the panel was still visibly broken — by a different cause
entirely.

Render it and **look at it**:

```js
// headless check: portrait viewport forces the P cut
const page = await browser.newPage({ viewport: { width: 460, height: 900 } });
await page.goto('file://' + path.resolve('dist/preview.html'));
// select the panel, then:
await page.screenshot({ path: 'check.png' });
```

`dist/preview.html` is self-contained and runs without the bridge, in demo mode.
It is the fastest honest check available.

Useful assertions to run in the page:

```js
document.querySelectorAll('[data-k="watermark"]').length   // expect 0
document.querySelector('.k-status').getBoundingClientRect() // height must match the rect
```

### 7.3 "Nothing changed" checklist, in order

1. Did `node tools/build.js` run after the edit?
2. Did the file actually land on disk? (§7.1)
3. Is the bridge running? `node server.js` from `bridge/`.
4. Did the WebView reload? Force-close the app; `no-store` covers the server side
   but not an already-loaded page.
5. Only then suspect the code.

---

## 8. Checklist before declaring a panel change done

- [ ] `node tools/build.js` ran without error
- [ ] Change verified present in the file **on the target machine**
- [ ] Both `T` and `P` cuts updated
- [ ] Rendered and visually inspected at portrait and landscape
- [ ] No element's rendered box exceeds its declared rect
- [ ] Mandatory buttons (save / map / enter) still present and grouped
- [ ] New readouts have a `DEMO_TEL` field
- [ ] New widget types handled in `updateSkinNode()`
- [ ] No new decorative background SVG
- [ ] Accent read from `var(--accent)`, not hard-coded
