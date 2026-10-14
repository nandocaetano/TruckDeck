// Secondary keybinds: a numpad / second keyboard plugged into the PC triggers the same
// panel actions as a tablet tap. InputHelper.cs polls for these combos and reports
// {"type":"hotkey","combo":"..."} on stdout; server.js looks the combo up here.
//
// Two shapes:
//  - gameKeys: [...]   press this into the game, same scancodes the matching panel
//              button already uses in public/catalog.js (keep them in sync by hand —
//              catalog.js is a browser-only script, not requirable from Node).
//  - localAction: '...' not a game key: broadcast to the tablet over SSE so app.js runs
//              a client-side action that has no keyboard equivalent (OBD paging). See
//              public/app.js for the matching case in the SSE 'localAction' handler.
'use strict';

const SECONDARY_KEYBINDS = {
  'ctrl+shift+f1': { gameKeys: ['f'] },     // hazard
  'ctrl+shift+f2': { gameKeys: ['num-'] },  // retarder_auto
  'ctrl+shift+f3': { gameKeys: ['v'] },     // diff_lock
  'ctrl+shift+f4': { gameKeys: ['c'] },     // cruise toggle (closest existing bind to "cruise_set")
  'ctrl+shift+f5': { gameKeys: ['p'] },     // wipers
  'ctrl+shift+f6': { gameKeys: ['o'] },     // beacon
  'ctrl+shift+f7': { gameKeys: ['y'] },     // trailer_axle ("trailer lift")
  // ctrl+shift+f8 ("cabin light") left unbound: catalog.js has no interior-light function yet.
  'ctrl+shift+f9': { gameKeys: ['space'] }, // parking_brake
  'ctrl+shift+f10': { gameKeys: ['z'] },    // engine_brake_toggle
  'ctrl+shift+f11': { gameKeys: ['u'] },    // lift_axle
  'ctrl+shift+f12': { gameKeys: ['h'] },    // horn

  // numpad1 ("theme_prev"), numpad7 ("dark_cabin_toggle"), numpad8 ("units_toggle") and
  // numpad9 ("lang_toggle") were requested but left unbound: none of those are real toggles
  // in app.js today (cabin-dark is automatic from ambient light, there is no units/lang
  // runtime switch, no theme-cycle function for the Modern skin) — wiring them would fire
  // a 'localAction' nothing listens for. Add the real feature first, then bind it here.
  numpad3: { localAction: 'obd_page_next' }, // only direction cycleModernObd supports
  numpad4: { gameKeys: ['media_prev'] },
  numpad5: { gameKeys: ['media_play'] },
  numpad6: { gameKeys: ['media_next'] },
};

module.exports = { SECONDARY_KEYBINDS };
