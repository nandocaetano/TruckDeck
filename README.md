# Hunters Truck Sim Button Box

A virtual button box for Euro Truck Simulator 2, American Truck Simulator, Farming
Simulator and any other PC game. A phone or tablet shows a truck-style switch panel; a
small bridge on the PC turns each tap into a key press and feeds the game's state back to
the lamps.

```
tablet / phone browser  --Wi-Fi-->  bridge on the PC  -->  key press in the game
                        <----------  lamps, speed, gear (ETS2 / ATS telemetry)
```

## Run it

1. Install Node.js LTS on the gaming PC (https://nodejs.org). Nothing else to install.
2. Double-click `start.bat`. Allow it through Windows Firewall on **private** networks
   when asked.
3. The window prints an address such as `http://192.168.1.20:8765/?pin=1234`. Open it in
   the browser of a phone or tablet on the same Wi-Fi. Add it to the home screen for a
   full-screen icon.

Keep the window open while playing. If the game runs as administrator, start
`start.bat` as administrator too, otherwise Windows blocks the key presses.

## Devices

| Device | How | Preset size |
| --- | --- | --- |
| Phone | Browser, held upright | Phone: 4 columns |
| Tablet | Browser, landscape | Tablet: 8 columns |
| Second monitor / touch monitor on the same PC | Open `http://localhost:8765/?pin=...` in a browser window on that monitor | Tablet |

The size is picked automatically for the first panel and can be chosen under
menu > **New panel from preset**. Any grid can be resized or rotated in Edit > **Page**.

Second monitor: clicking the panel takes keyboard focus away from the game, so the bridge
hands focus back to the last window that was not the panel before it types. Run the game
in **borderless or windowed** mode (exclusive fullscreen minimises when it loses focus).

## Dashboards, analog dials, music player

- Ten truck dashboards ship ready: five modern (American, European, Brazilian, Heavy Haul,
  Rugged) and five classic with analog dials. Each exists vertical and horizontal and is
  cut to the rig answers given in **New panel**. The Brazilian ones are printed in
  Portuguese. Any panel can switch dashboard style in the menu and be rebuilt.
- **Gear display** (menu): Auto shows crawler gears as C1/C2 on 12+1 and 12+2 gearboxes in
  ETS2, worked out from the number of forward gears the game reports. Set it by hand if a
  gearbox shows differently.
- **Analog dial** and **Music player** can be added to any panel from an empty cell in Edit.
- The music player shows the track playing in the desktop music app on the PC (read from
  its window title: no login, no API key, nothing sent to the internet) and sends the
  Windows media keys: previous, play/pause, next, volume. Volume is the whole PC's volume.

## What every built-in panel carries (standard)

Rules for all ten dashboards, in both cuts (tablet and phone). Any new or redrawn art must
keep them:

- **Wipers**: two separate keys side by side, "on / faster" and "off / slower".
- **Cruise control** and **engine brake / retarder**: always a group of three keys: decrease
  on the left, on/off in the middle, increase on the right.
- **Hazard** (flashers) on every panel, both cuts. Wipers, cruise control and engine brake keep their
  members side by side in one row: never split across rows.
- The wipers **off** key is a plain button (no LED, only a faint presence light). The game has one
  wiper key that cycles (off, 1, 2, 3, off), so OFF presses it until the game's telemetry says the
  wipers stopped. `data/bridge.log` records every key sent and every wiper change, for diagnosis.
- **LED language** (every key family): off = faint tint of the lamp colour (~20 %), on = full colour with
  a short glow. Colours: park/hazard/diff/assist red, low beam & cruise & trailer green, high beam blue,
  beacon/wipers/engine brake/retarder/axles amber, horns/map/dash white. Horns, map and dash light only
  while pressed; the others latch. Engine start and the F7 assist key need a 1 s hold.
- Key names can be hidden from the menu on every key family (symbol stays).
- **Map, Menu and Camera** on every panel; **Enter** is a normal key of the panel marked
  "OK / ENTER" (no return-arrow symbol: it is a truck panel).
- **Brazilian panels** (Moderno Brasileiro, Classico Brasileiro): legends in Portuguese; the
  trailer is called "TRAILER" (or "cavalo" for the tractor), never "carreta".
- Air valves (Park brake, Trailer air) move like rigid metal knobs: a small straight push, no
  spring-back.
- The information screen of the modern panels is styled to match its dashboard.
- Panels change by a **sideways swipe** that starts between the keys (on the picture or in
  the top bar); a swipe that starts on a key presses that key instead.
- Telltale-row keys on the Rosewood panel (lanes, OK, map pin) rest dim and light up only
  when pressed.
- Extra keys that would not fit the art are made by copying a row of the panel's own picture
  (`tools/skins/plan.py`; on the wood panels the strip is grown with the same wood).

## Keys

Each button presses a key. Most use the game's default key and work immediately.
ETS2/ATS ship some actions with no key at all (cruise speed +/-, trailer axle, windows,
engine brake toggle...). For those, the app suggests a free key that has to be assigned
once in the game:

1. In the app: menu > **Key setup**. The first list is "To assign in game".
2. In the game: Options > Keys & Buttons, click the action.
3. In the app: tap **Send** on that row. The game records the key.

If a default was changed inside the game, set the same key in Key setup.
Bindings are stored per panel.

## Live lamps and readouts (ETS2 / ATS)

Optional. Without it, lamps simply remember the last tap.

1. Download `scs-telemetry.dll` (revision 12) from
   https://github.com/RenCloud/scs-sdk-plugin/releases
2. Copy it to `<game folder>\bin\win_x64\plugins\` (create `plugins` if missing), for
   ETS2 and/or ATS.
3. Start the game and accept the SDK notice. The status pill turns to "ETS2 live" or
   "ATS live".

Farming Simulator and other games have no telemetry here.

## Editing panels

- **Edit**, then tap a free cell to add a button, readout or label.
- Drag to move, drag the orange corner to resize, tap a button for its properties.
- **Page** (in edit mode): grid size, rotate grid, page order.
- Menu > **New panel from preset** asks about the rig once (gearbox, what the wheel already
  has, which optional groups to include) and builds the dashboard from it: ETS2 European,
  ATS American, Brasileiro, Brasileiro antigo, European classic, Soviet classic. Each comes
  vertical or horizontal, with the damage/trip strip and a music player (flat media tile on
  modern cabs, cassette-era unit on classic ones). The Brazilian dashboards are printed in
  Portuguese; any panel can switch legend language in the menu.
- When the grid is full the least important keys are left out; add them back in Edit, or use
  **Add all other functions as extra pages**.
- Fixed presets: Full console (dense, tablet), Farming Simulator, Blank.
- **Custom key** buttons send any key or modifier+key, as tap, hold or on/off switch.
- Panels are saved on the PC (`data/layouts.json`) and shared by every device.

## Files

| Path | What it is |
| --- | --- |
| `bridge/server.js` | HTTP server, PIN check, key queue, telemetry relay |
| `bridge/InputHelper.cs` | Key injection, telemetry reader, focus hand-back |
| `bridge/input-helper.ps1` | Compiles and runs the helper with Windows PowerShell |
| `public/catalog.js` | Function catalog, icons, key names |
| `public/presets.js` | Preset layouts |
| `public/app.js`, `app.css`, `body.html` | Panel app |
| `tools/build.js` | Rebuilds `public/index.html` after editing `body.html` |
| `data/` | PIN and saved panels (created on first run) |

## Limits

- Keyboard emulation only; no virtual joystick (vJoy) yet, so analog axes are out.
- The screen wake lock needs HTTPS, which a LAN address does not have. Raise the
  tablet's screen timeout instead.
- The focus hand-back assumes the game is on the primary monitor.
- The PIN keeps other devices from typing on the PC. It is not encryption: use it on a
  home network only.

## Android app

`android/` is an Android Studio project: a full-screen shell that plays the opening
animation, finds the PC on the Wi-Fi (or takes its address and PIN), opens the panel served
by the bridge, keeps the screen on and hides the system bars. Double-click
`androiduild-apk.bat` to build a test APK (needs the Android SDK that comes with Android
Studio). `store/` holds the 512 px icon, the feature graphic and demo screenshots for the
Google Play listing.
