// Function catalog: everything a panel button can do.
// Kept as plain data so presets, the editor picker and the key-setup screen all read the
// same source and can never disagree about a function's key or icon.
'use strict';

// ---- Icons ------------------------------------------------------------------------------
// 24x24, stroke-only pictograms in the spirit of ISO 2575 dashboard symbols.
// Stored as inner SVG markup; drawn with currentColor so the backlight colour is pure CSS.
const ICONS = {
  power: '<path d="M12 3v8"/><path d="M7 6.5a7 7 0 1 0 10 0"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
  engine: '<path d="M4 10h3l2-3h6v3h3v2h2v5h-2v2h-3l-2 2H7v-4H4z"/><path d="M10 4h4"/>',
  parking: '<circle cx="12" cy="12" r="6"/><path d="M10.2 15V9h2.3a1.9 1.9 0 0 1 0 3.8h-2.3"/><path d="M4.2 7a9.5 9.5 0 0 0 0 10M19.8 7a9.5 9.5 0 0 1 0 10"/>',
  brake: '<circle cx="12" cy="12" r="6"/><path d="M12 9v4M12 15.2v.3"/><path d="M4.2 7a9.5 9.5 0 0 0 0 10M19.8 7a9.5 9.5 0 0 1 0 10"/>',
  engbrake: '<path d="M4 8h3l2-3h6v3h3v2h2v4h-2v2h-3l-1 1"/><circle cx="8" cy="17" r="3.5"/><path d="M8 15.5v2M8 18.6v.2"/>',
  retarder: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v5M12 15v5M4 12h5M15 12h5"/>',
  lowbeam: '<path d="M11 6c-4 0-6 3-6 6s2 6 6 6z"/><path d="M14 8l6 2M14 12l6 2M14 16l6 2"/>',
  highbeam: '<path d="M11 6c-4 0-6 3-6 6s2 6 6 6z"/><path d="M14 8h6M14 12h6M14 16h6"/>',
  flash: '<path d="M11 6c-4 0-6 3-6 6s2 6 6 6z"/><path d="M17 7l-2.5 5H18l-2.5 5"/>',
  beacon: '<path d="M7 17v-4a5 5 0 0 1 10 0v4z"/><path d="M5 20h14M12 3v2M4.5 6.5L6 8M19.5 6.5L18 8"/>',
  hazard: '<path d="M12 3l10 17H2z"/><path d="M12 9.5l4.5 7.5h-9z"/>',
  left: '<path d="M3 12l7-7v4h10v6H10v4z"/>',
  right: '<path d="M21 12l-7-7v4H4v6h10v4z"/>',
  horn: '<path d="M3 10v4h3l6 4V6l-6 4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  airhorn: '<path d="M3 9v6l11 3V6z"/><path d="M14 8h3v8h-3M20 9v6M7 16v4"/>',
  wiper: '<path d="M3 9c6-4 12-4 18 0l-3 9H6z"/><path d="M12 18l5-8.5"/>',
  cruise: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-6"/><path d="M12 5v2M6 9l1.5 1.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  resume: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M10 12l5 3-5 3z"/>',
  axle: '<circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M12 13V4M9 7l3-3 3 3"/>',
  taxle: '<path d="M3 5h18v6H3z"/><circle cx="8" cy="17" r="3"/><circle cx="16" cy="17" r="3"/><path d="M12 20v-6M10.5 15.5L12 14l1.5 1.5"/>',
  diff: '<path d="M4 12h16M4 8v8M20 8v8"/><path d="M9 9l6 6M15 9l-6 6"/>',
  cabin: '<path d="M4 20V9l8-5 8 5v11z"/><path d="M4 13h16"/><circle cx="12" cy="17" r="2"/>',
  // Low-fuel telltale: the pump-and-hose shape used on cluster warning lamps.
  fuelpump: '<path d="M4 20V5.5A1.5 1.5 0 0 1 5.5 4h6A1.5 1.5 0 0 1 13 5.5V20"/><path d="M3 20h11"/><path d="M5.5 7.5h6v4h-6z"/><path d="M13 10h3.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 1.5 1.5A1.5 1.5 0 0 0 21 16V9l-2.5-2.5"/>',
  // Battery telltale: case, terminals and the +/- pair, as the cluster lamp draws it.
  battery: '<rect x="3" y="8" width="18" height="9" rx="1.5"/><path d="M7 8V6.5h3V8M14 8V6.5h3V8"/><path d="M7.5 12.5h3M9 11v3M14 12.5h3"/>',
  trailer: '<path d="M3 6h13v9H3z"/><circle cx="7" cy="17.5" r="2"/><circle cx="12" cy="17.5" r="2"/><path d="M16 13h5M21 11v4"/>',
  camera: '<path d="M4 8h10v8H4z"/><path d="M14 11l6-3v8l-6-3z"/>',
  eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
  zoom: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/>',
  mirror: '<rect x="7" y="3" width="11" height="18" rx="2"/><path d="M7 12H3M10 9l5-3M10 14l5-3"/>',
  nav: '<path d="M12 3l7 18-7-4-7 4z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.3"/>',
  job: '<path d="M3 7h12v10H3z"/><path d="M15 10h4l2 3v4h-6"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  wrench: '<path d="M14.5 5.5a4 4 0 0 0 4.8 4.8L9.8 19.8a2 2 0 0 1-2.8-2.8z" transform="rotate(8 12 12)"/>',
  dash: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 14a2.5 2.5 0 0 1 5 0M14 11h4M14 14h4"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  garage: '<path d="M3 11l9-6 9 6v9H3z"/><path d="M7 20v-6h10v6M7 17h10"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  load: '<path d="M4 8h6l2 2h8v9H4z"/><path d="M12 12v5M9.5 14.5L12 12l2.5 2.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  photo: '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-2h5L16 7"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  next: '<path d="M5 6l8 6-8 6zM13 6l8 6-8 6z"/>',
  prev: '<path d="M19 6l-8 6 8 6zM11 6l-8 6 8 6z"/>',
  volup: '<path d="M3 10v4h3l5 4V6l-5 4z"/><path d="M15 12h6M18 9v6"/>',
  voldown: '<path d="M3 10v4h3l5 4V6l-5 4z"/><path d="M15 12h6"/>',
  windown: '<path d="M5 20V11l5-7h9v16z"/><path d="M14 8v7M11.5 12.5L14 15l2.5-2.5"/>',
  winup: '<path d="M5 20V11l5-7h9v16z"/><path d="M14 15V8M11.5 10.5L14 8l2.5 2.5"/>',
  gear: '<path d="M6 6v12M12 6v12M18 6v6M6 12h12"/><circle cx="6" cy="5" r="1.3"/><circle cx="12" cy="5" r="1.3"/><circle cx="18" cy="5" r="1.3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  aleft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  aright: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  neutral: '<circle cx="12" cy="12" r="9"/><path d="M9 16V8l6 8V8"/>',
  suspup: '<path d="M3 19h18"/><path d="M6 15h12"/><path d="M12 3v8M8 7l4-4 4 4"/>',
  suspdown: '<path d="M3 19h18"/><path d="M6 15h12"/><path d="M12 3v8M8 8l4 4 4-4"/>',
  suspreset: '<path d="M3 19h18"/><path d="M6 14h12"/><path d="M8 9h8M8 6h8"/>',
  lane: '<path d="M7 3L4 21M17 3l3 18"/><path d="M12 5v3M12 11v3M12 17v3"/>',
  emergency: '<path d="M12 3l9 16H3z"/><path d="M12 9v5M12 16.5v.5"/>',
  adblue: '<path d="M12 3c-2.8 4-6 7.1-6 10.4a6 6 0 0 0 12 0C18 10.1 14.8 7 12 3z"/><path d="M9 14a3 3 0 0 0 3 3"/>',
  hud: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M7 9h4M7 12h7M8 20h8"/>',
  retauto: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v5M12 15v5M4 12h5M15 12h5"/>',
  mouse: '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v4"/>',
  page: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  // farming
  hitch: '<path d="M4 6v5a5 5 0 0 0 10 0V6"/><path d="M9 16v4M14 9h6M17 6l3 3-3 3"/>',
  unfold: '<path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3M12 6v12"/>',
  lower: '<path d="M12 4v11M8 11l4 4 4-4M4 20h16"/>',
  worker: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  cycle: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  unload: '<path d="M3 7h10v6H3z"/><path d="M13 9h5l2 4v4"/><path d="M17 20l3-3M14 21l1-2M21 19l-2 1"/>',
  door: '<path d="M6 21V3h9l3 2v16z"/><path d="M14 12v.5"/>',
  tractor: '<circle cx="7" cy="16" r="4"/><circle cx="18" cy="17.5" r="2.5"/><path d="M11 16h4.5M5 12V6h7l2 6h5v3"/>',
  cab: '<path d="M2 16V7h8l4 5h6v4"/><path d="M10 7v5h4"/><circle cx="6.5" cy="17" r="2.2"/><circle cx="16.5" cy="17" r="2.2"/>',
  cargo: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM8.5 13h7v7h-7z"/>',
  playpause: '<path d="M5 6l8 6-8 6z"/><path d="M16 6v12M20 6v12"/>',
  mute: '<path d="M3 10v4h3l5 4V6l-5 4z"/><path d="M15 9l6 6M21 9l-6 6"/>',
  dot: '<circle cx="12" cy="12" r="4"/>',
};

function iconSvg(name) {
  const body = ICONS[name] || ICONS.dot;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
}

// ---- Categories -------------------------------------------------------------------------
const CATEGORIES = [
  { id: 'engine', name: 'Engine & brakes', game: 'truck' },
  { id: 'lights', name: 'Lights & signals', game: 'truck' },
  { id: 'cruise', name: 'Cruise control', game: 'truck' },
  { id: 'chassis', name: 'Axles & trailer', game: 'truck' },
  { id: 'gearbox', name: 'Gearbox', game: 'truck' },
  { id: 'cab', name: 'Cab', game: 'truck' },
  { id: 'camera', name: 'Cameras', game: 'truck' },
  { id: 'hud', name: 'Route advisor & HUD', game: 'truck' },
  { id: 'game', name: 'Game', game: 'truck' },
  { id: 'audio', name: 'Radio', game: 'truck' },
  { id: 'farm', name: 'Farming Simulator', game: 'farm' },
  { id: 'media', name: 'Music player', game: 'any' },
];

// ---- Functions --------------------------------------------------------------------------
// keys : default combo, modifiers first.
// bind : true  => ETS2/ATS ships this action UNASSIGNED; `keys` is this app's suggestion and
//                 must be assigned once in the game (Options > Keys & Buttons).
//        false => `keys` is the game's own default.
// mode : 'tap' sends a short press; 'hold' keeps the key down while the finger is down.
// latch: the button represents an on/off state (its LED stays lit).
// tel  : telemetry field that drives the LED when the game is connected.
function fn(id, cat, name, label, icon, keys, extra) {
  return Object.assign({ id, cat, name, label, icon, keys, bind: false, mode: 'tap', latch: false, tel: null, led: 'green' }, extra || {});
}

const FUNCTION_LIST = [
  // Engine & brakes
  fn('engine', 'engine', 'Start / stop engine', 'START\nSTOP', 'power', ['e'], { latch: true, tel: 'engine' }),
  fn('electrics', 'engine', 'Ignition (electrics)', 'IGNITION', 'key', ['insert'], { bind: true, latch: true, tel: 'electric', led: 'amber' }),
  fn('parking_brake', 'engine', 'Parking brake', 'PARK\nBRAKE', 'parking', ['space'], { latch: true, tel: 'park', led: 'red' }),
  fn('engine_brake', 'engine', 'Engine brake (hold)', 'ENG BRAKE', 'engbrake', ['b'], { mode: 'hold', tel: 'motorBrake', led: 'amber' }),
  fn('engine_brake_toggle', 'engine', 'Engine brake toggle', 'ENG BRAKE', 'engbrake', ['b'], { latch: true, tel: 'motorBrake', led: 'amber' }),
  fn('engine_brake_up', 'engine', 'Engine brake increase', 'JAKE\u00a0+', 'plus', ['shift', 'b'], { bind: true, led: 'amber' }),
  fn('engine_brake_down', 'engine', 'Engine brake decrease', 'JAKE\u00a0\u2212', 'minus', ['ctrl', 'b'], { bind: true, led: 'amber' }),
  fn('retarder_up', 'engine', 'Retarder increase', 'RET\u00a0+', 'plus', [';'], { tel: 'retarderOn', led: 'amber' }),
  fn('retarder_down', 'engine', 'Retarder decrease', 'RET\u00a0−', 'minus', ["'"], { led: 'amber' }),
  fn('retarder_auto', 'engine', 'Automatic retarder', 'AUTO\nRETARDER', 'retauto', ['num-'], { bind: true, latch: true, led: 'amber' }),
  fn('lane_assist', 'engine', 'Lane keeping assist', 'LANE\nASSIST', 'lane', ['num/'], { bind: true, latch: true, led: 'green' }),
  fn('emergency_brake', 'engine', 'Emergency braking', 'EMERG.\nBRAKE', 'emergency', ['num*'], { bind: true, latch: true, led: 'red' }),
  fn('trailer_brake', 'engine', 'Trailer brake (hold)', 'TRAILER\nBRAKE', 'brake', ['x'], { bind: true, mode: 'hold', led: 'red' }),

  // Lights & signals
  fn('lights', 'lights', 'Light modes', 'LIGHTS', 'lowbeam', ['l'], { latch: true, tel: 'lightsOn' }),
  fn('high_beam', 'lights', 'High beam', 'HIGH BEAM', 'highbeam', ['k'], { latch: true, tel: 'high', led: 'blue' }),
  fn('light_horn', 'lights', 'Flash headlights (hold)', 'FLASH', 'flash', ['j'], { mode: 'hold', led: 'blue' }),
  fn('beacon', 'lights', 'Beacon', 'BEACON', 'beacon', ['o'], { latch: true, tel: 'beacon', led: 'amber' }),
  fn('hazard', 'lights', 'Hazard lights', 'HAZARD', 'hazard', ['f'], { latch: true, tel: 'hazard', led: 'red' }),
  fn('blinker_left', 'lights', 'Left indicator', 'LEFT', 'left', ['['], { latch: true, tel: 'blinkL' }),
  fn('blinker_right', 'lights', 'Right indicator', 'RIGHT', 'right', [']'], { latch: true, tel: 'blinkR' }),
  fn('horn', 'lights', 'Horn (hold)', 'HORN', 'horn', ['h'], { mode: 'hold', led: 'white' }),
  fn('air_horn', 'lights', 'Air horn (hold)', 'AIR HORN', 'airhorn', ['n'], { mode: 'hold', led: 'white' }),
  fn('wipers', 'lights', 'Wipers faster', 'WIPERS', 'wiper', ['p'], { latch: true, tel: 'wipers', led: 'amber' }),
  fn('wipers_back', 'lights', 'Wipers off', 'WIPERS OFF', 'wiper', ['p'], {}),   // runs the cycling key until the wipers stop (see wiperOff in app.js)
  fn('cabin_light', 'lights', 'Cabin interior light', 'CABIN\nLIGHT', 'cabin', ['num.'], { bind: true, latch: true }),

  // Cruise control
  fn('cruise', 'cruise', 'Cruise control', 'CRUISE', 'cruise', ['c'], { latch: true, tel: 'cruiseOn', led: 'green' }),
  fn('cruise_up', 'cruise', 'Cruise speed increase', 'SET\u00a0+', 'plus', ['='], { bind: true }),
  fn('cruise_down', 'cruise', 'Cruise speed decrease', 'SET\u00a0−', 'minus', ['-'], { bind: true }),
  fn('cruise_resume', 'cruise', 'Cruise resume', 'RESUME', 'resume', ['backspace'], { bind: true }),

  // Axles & trailer
  fn('lift_axle', 'chassis', 'Lift / drop truck axle', 'AXLE', 'axle', ['u'], { latch: true, tel: 'lift', led: 'amber' }),
  fn('trailer_axle', 'chassis', 'Lift / drop trailer axle', 'T AXLE', 'taxle', ['u'], { latch: true, tel: 'trailerLift', led: 'amber' }),
  fn('diff_lock', 'chassis', 'Differential lock', 'DIFF LOCK', 'diff', ['v'], { latch: true, tel: 'diff', led: 'red' }),
  fn('susp_front_up', 'chassis', 'Front suspension up', 'FRONT\nUP', 'suspup', ['num7'], { bind: true }),
  fn('susp_front_down', 'chassis', 'Front suspension down', 'FRONT\nDOWN', 'suspdown', ['num1'], { bind: true }),
  fn('susp_rear_up', 'chassis', 'Rear suspension up', 'REAR\nUP', 'suspup', ['num9'], { bind: true }),
  fn('susp_rear_down', 'chassis', 'Rear suspension down', 'REAR\nDOWN', 'suspdown', ['num3'], { bind: true }),
  fn('susp_reset', 'chassis', 'Reset suspension', 'RESET\nSUSP.', 'suspreset', ['num5'], { bind: true }),
  fn('trailer_attach', 'chassis', 'Attach / detach trailer', 'TRAILER', 'trailer', ['t'], { latch: true, tel: 'trailer', led: 'green' }),

  // Gearbox
  fn('gear_up', 'gearbox', 'Shift up', 'GEAR\u00a0+', 'up', ['shift']),
  fn('gear_down', 'gearbox', 'Shift down', 'GEAR\u00a0−', 'down', ['ctrl']),
  fn('neutral', 'gearbox', 'Shift to neutral', 'NEUTRAL', 'neutral', ['q'], { bind: true }),
  fn('gearbox_mode', 'gearbox', 'Automatic / sequential', 'AUTO\nMAN', 'gear', ['f9'], { bind: true }),
  fn('range', 'gearbox', 'Range (shifter toggle 1)', 'RANGE', 'gear', ['end'], { bind: true, latch: true, led: 'amber' }),
  fn('splitter', 'gearbox', 'Splitter (shifter toggle 2)', 'SPLIT', 'gear', ['home'], { bind: true, latch: true, led: 'amber' }),

  // Cab
  fn('window_left_down', 'cab', 'Open left window (hold)', 'L WINDOW', 'windown', [','], { bind: true, mode: 'hold' }),
  fn('window_left_up', 'cab', 'Close left window (hold)', 'L WINDOW', 'winup', ['.'], { bind: true, mode: 'hold' }),
  fn('window_right_down', 'cab', 'Open right window (hold)', 'R WINDOW', 'windown', ['/'], { bind: true, mode: 'hold' }),
  fn('window_right_up', 'cab', 'Close right window (hold)', 'R WINDOW', 'winup', ['\\'], { bind: true, mode: 'hold' }),
  fn('dash_display', 'cab', 'Dashboard display mode', 'DASH', 'dash', ['i'], { led: 'white' }),
  fn('dash_map', 'cab', 'Dashboard map mode', 'DASH MAP', 'map', ['ctrl', 'i'], { bind: true }),
  fn('trip_reset', 'cab', 'Trip info reset', 'TRIP\nRESET', 'dash', ['ctrl', 'backspace'], { bind: true }),
  fn('hud', 'cab', 'Show / hide HUD', 'HUD', 'hud', ['num+'], { bind: true, latch: true, led: 'white' }),
  fn('truck_adjust', 'cab', 'Adjust seat & mirrors', 'ADJUST', 'mirror', ['f4']),

  // Cameras
  fn('cam_next', 'camera', 'Next camera', 'CYCLE\nCAMS', 'camera', ['9']),
  fn('cam_prev', 'camera', 'Previous camera', 'PREV\nCAM', 'camera', ['shift', '9'], { bind: true }),
  fn('cam_reset', 'camera', 'Reset cabin camera', 'RESET\nCAM', 'camera', ['num0'], { bind: true }),
  fn('cam_interior', 'camera', 'Interior camera', 'CAB', 'camera', ['1']),
  fn('cam_chase', 'camera', 'Chase camera', 'CHASE', 'camera', ['2']),
  fn('cam_top', 'camera', 'Top-down camera', 'TOP', 'camera', ['3']),
  fn('cam_roof', 'camera', 'Roof camera', 'ROOF', 'camera', ['4']),
  fn('cam_lean', 'camera', 'Lean-out camera', 'LEAN OUT', 'camera', ['5']),
  fn('cam_bumper', 'camera', 'Bumper camera', 'BUMPER', 'camera', ['6']),
  fn('cam_wheel', 'camera', 'On-wheel camera', 'WHEEL', 'camera', ['7']),
  fn('cam_driveby', 'camera', 'Drive-by camera', 'DRIVE BY', 'camera', ['8']),
  fn('look_left', 'camera', 'Look left (hold)', 'LOOK L', 'eye', ['num/'], { mode: 'hold' }),
  fn('look_right', 'camera', 'Look right (hold)', 'LOOK R', 'eye', ['num*'], { mode: 'hold' }),
  fn('cam_zoom', 'camera', 'Zoom interior camera (hold)', 'ZOOM', 'zoom', ['ctrl', 'z'], { bind: true, mode: 'hold' }),

  // Route advisor & HUD
  fn('ra_mouse', 'hud', 'Route advisor mouse control', 'RA MOUSE', 'mouse', ['f1']),
  fn('mirrors', 'hud', 'Show / hide side mirrors', 'MIRRORS', 'mirror', ['f2']),
  fn('ra_modes', 'hud', 'Route advisor modes', 'ADVISOR', 'page', ['f3']),
  fn('ra_nav', 'hud', 'Route advisor: navigation', 'NAV', 'nav', ['f5']),
  fn('ra_job', 'hud', 'Route advisor: job info', 'JOB', 'job', ['f6']),
  fn('ra_diag', 'hud', 'Route advisor: diagnostics', 'DIAG', 'wrench', ['f7'], { led: 'red', long: true }),
  fn('ra_info', 'hud', 'Route advisor: info', 'INFO', 'info', ['f8']),
  fn('ra_next', 'hud', 'Route advisor: next page', 'NEXT', 'next', ['num0']),
  fn('ra_prev', 'hud', 'Route advisor: previous page', 'PREV', 'prev', ['delete'], { bind: true }),

  // Game
  fn('activate', 'game', 'Activate / confirm', 'ENTER', 'check', ['enter'], { mode: 'hold' }),
  fn('menu', 'game', 'Menu / cancel', 'MENU', 'menu', ['esc']),
  // Arrow keys move through menus, the Route Advisor mouse mode and seat adjustment. The game
  // also uses them as a second set of driving keys, so on the road they steer.
  fn('nav_up', 'game', 'Arrow up', 'UP', 'up', ['up'], { mode: 'hold' }),
  fn('nav_down', 'game', 'Arrow down', 'DOWN', 'down', ['down'], { mode: 'hold' }),
  fn('nav_left', 'game', 'Arrow left', 'LEFT', 'aleft', ['left'], { mode: 'hold' }),
  fn('nav_right', 'game', 'Arrow right', 'RIGHT', 'aright', ['right'], { mode: 'hold' }),
  fn('world_map', 'game', 'World map', 'MAP', 'map', ['m'], { led: 'white' }),
  fn('garage', 'game', 'Garage manager', 'GARAGE', 'garage', ['g']),
  fn('quick_save', 'game', 'Quick save', 'Q. SAVE', 'save', ['scrolllock']),
  fn('quick_load', 'game', 'Quick load', 'Q. LOAD', 'load', ['f11'], { bind: true }),
  fn('screenshot', 'game', 'Screenshot', 'PHOTO', 'photo', ['f10']),

  // Radio
  fn('radio', 'audio', 'Audio player', 'RADIO', 'music', ['r']),
  fn('radio_next', 'audio', 'Next favourite station', 'NEXT', 'next', ['pgdn']),
  fn('radio_prev', 'audio', 'Previous favourite station', 'PREV', 'prev', ['pgup']),
  fn('radio_vol_up', 'audio', 'Radio volume up', 'VOL\u00a0+', 'volup', ['ctrl', 'pgup'], { bind: true }),
  fn('radio_vol_down', 'audio', 'Radio volume down', 'VOL\u00a0−', 'voldown', ['ctrl', 'pgdn'], { bind: true }),
  // Generic radio keys: the game has no default for these, so each one is a numpad key the player
  // binds in the game's controls (or in a macro tool) to whatever it should do.
  fn('radio_folder_up', 'audio', 'Radio folder / category up', 'FOLDER\n+', 'up', ['num8'], { bind: true }),
  fn('radio_folder_down', 'audio', 'Radio folder / category down', 'FOLDER\n\u2212', 'down', ['num2'], { bind: true }),
  fn('radio_preset_1', 'audio', 'Radio preset 1', 'PRESET 1', 'music', ['num1'], { bind: true }),
  fn('radio_preset_2', 'audio', 'Radio preset 2', 'PRESET 2', 'music', ['num3'], { bind: true }),
  fn('radio_preset_3', 'audio', 'Radio preset 3', 'PRESET 3', 'music', ['num4'], { bind: true }),
  fn('radio_preset_4', 'audio', 'Radio preset 4', 'PRESET 4', 'music', ['num6'], { bind: true }),
  fn('radio_preset_5', 'audio', 'Radio preset 5', 'PRESET 5', 'music', ['num7'], { bind: true }),
  fn('radio_preset_6', 'audio', 'Radio preset 6', 'PRESET 6', 'music', ['num9'], { bind: true }),

  // Farming Simulator 22/25. Defaults vary between versions and DLCs: `bind: true` flags
  // them all for a check in the game's own controls screen.
  fn('fs_engine', 'farm', 'Start / stop engine', 'ENGINE', 'power', ['enter'], { bind: true, latch: true }),
  fn('fs_attach', 'farm', 'Attach / detach tool', 'ATTACH', 'hitch', ['q'], { bind: true }),
  fn('fs_unfold', 'farm', 'Fold / unfold', 'UNFOLD', 'unfold', ['x'], { bind: true, latch: true, led: 'amber' }),
  fn('fs_lower', 'farm', 'Lower / raise tool', 'LOWER', 'lower', ['v'], { bind: true, latch: true, led: 'amber' }),
  fn('fs_lower_all', 'farm', 'Lower / raise all tools', 'LOWER\nALL', 'lower', ['ctrl', 'v'], { bind: true }),
  fn('fs_turn_on', 'farm', 'Turn tool on / off', 'TOOL ON', 'power', ['b'], { bind: true, latch: true }),
  fn('fs_switch_tool', 'farm', 'Select next tool', 'NEXT\nTOOL', 'cycle', ['g'], { bind: true }),
  fn('fs_worker', 'farm', 'Hire / dismiss worker', 'WORKER', 'worker', ['h'], { bind: true, latch: true }),
  fn('fs_unload', 'farm', 'Unload / tip', 'UNLOAD', 'unload', ['i'], { bind: true }),
  fn('fs_pipe', 'farm', 'Pipe in / out', 'PIPE', 'unfold', ['o'], { bind: true, latch: true, led: 'amber' }),
  fn('fs_cruise', 'farm', 'Cruise control', 'CRUISE', 'cruise', ['3'], { bind: true, latch: true }),
  fn('fs_cruise_down', 'farm', 'Cruise speed decrease', 'SET\u00a0−', 'minus', ['1'], { bind: true }),
  fn('fs_cruise_up', 'farm', 'Cruise speed increase', 'SET\u00a0+', 'plus', ['2'], { bind: true }),
  fn('fs_lights', 'farm', 'Light modes', 'LIGHTS', 'lowbeam', ['f'], { bind: true, latch: true }),
  fn('fs_beacon', 'farm', 'Beacon', 'BEACON', 'beacon', ['home'], { bind: true, latch: true, led: 'amber' }),
  fn('fs_left', 'farm', 'Left indicator', 'LEFT', 'left', ['num1'], { bind: true, latch: true }),
  fn('fs_hazard', 'farm', 'Hazard lights', 'HAZARD', 'hazard', ['num2'], { bind: true, latch: true, led: 'red' }),
  fn('fs_right', 'farm', 'Right indicator', 'RIGHT', 'right', ['num3'], { bind: true, latch: true }),
  fn('fs_horn', 'farm', 'Horn (hold)', 'HORN', 'horn', ['num0'], { bind: true, mode: 'hold', led: 'white' }),
  fn('fs_camera', 'farm', 'Change camera', 'CAMERA', 'camera', ['c'], { bind: true }),
  fn('fs_next_vehicle', 'farm', 'Next vehicle', 'NEXT\nVEHICLE', 'tractor', ['tab'], { bind: true }),
  fn('fs_prev_vehicle', 'farm', 'Previous vehicle', 'PREV\nVEHICLE', 'tractor', ['shift', 'tab'], { bind: true }),
  fn('fs_enter', 'farm', 'Enter / leave vehicle', 'ENTER\nEXIT', 'door', ['e'], { bind: true }),
  fn('fs_radio', 'farm', 'Radio on / off', 'RADIO', 'music', ['f5'], { bind: true }),
  fn('fs_map', 'farm', 'Toggle map', 'MAP', 'map', ['9'], { bind: true }),
  fn('fs_menu', 'farm', 'Menu', 'MENU', 'menu', ['esc'], { bind: true }),
];

// Windows media keys: reach whichever player last had the media session.
FUNCTION_LIST.push(
  fn('media_play', 'media', 'Play / pause', 'PLAY', 'playpause', ['media_play']),
  fn('media_next', 'media', 'Next track', 'NEXT', 'next', ['media_next']),
  fn('media_prev', 'media', 'Previous track', 'PREV', 'prev', ['media_prev']),
  fn('vol_up', 'media', 'PC volume up', 'VOL\u00a0+', 'volup', ['vol_up']),
  fn('vol_down', 'media', 'PC volume down', 'VOL\u00a0\u2212', 'voldown', ['vol_down']),
  fn('vol_mute', 'media', 'PC mute', 'MUTE', 'mute', ['vol_mute'])
);

const FUNCTIONS = {};
for (const f of FUNCTION_LIST) FUNCTIONS[f.id] = f;

// ---- Portuguese legends -------------------------------------------------------------------
// Printed on the keys of panels whose language is Portuguese (the Brazilian dashboards).
// Written the way Brazilian drivers name the controls, not translated word for word.
const LABELS_PT = {
  engine: 'PARTIDA', electrics: 'IGNI\u00c7\u00c3O', parking_brake: 'FREIO\nESTAC.', engine_brake: 'FREIO\nMOTOR',
  engine_brake_toggle: 'FREIO\nMOTOR', engine_brake_up: 'FREIO\nMOTOR\u00a0+', engine_brake_down: 'FREIO\nMOTOR\u00a0\u2212',
  retarder_auto: 'RETARDER\nAUTOM.', lane_assist: 'MANT.\nFAIXA', emergency_brake: 'FREIO\nEMERG.', hud: 'HUD',
  susp_front_up: 'FRENTE\nSOBE', susp_front_down: 'FRENTE\nDESCE', susp_rear_up: 'TRASEIRA\nSOBE', susp_rear_down: 'TRASEIRA\nDESCE', susp_reset: 'REDEF.\nSUSP.',
  cam_prev: 'C\u00c2MERA\nANT.', cam_reset: 'REDEF.\nC\u00c2MERA',
  retarder_up: 'RETARDER\u00a0+', retarder_down: 'RETARDER\u00a0\u2212', trailer_brake: 'FREIO\nTRAILER',
  lights: 'FAR\u00d3IS', high_beam: 'FAROL\nALTO', light_horn: 'LAMPEJO', beacon: 'GIROFLEX', hazard: 'ALERTA',
  blinker_left: 'ESQUERDA', blinker_right: 'DIREITA', horn: 'BUZINA', air_horn: 'BUZINA\nA AR',
  wipers: 'LIMPADOR', wipers_back: 'LIMPADOR\u00a0\u2212',
  cruise: 'PILOTO\nAUTOM.', cruise_up: 'VEL\u00a0+', cruise_down: 'VEL\u00a0\u2212', cruise_resume: 'RETOMAR',
  lift_axle: '3\u00ba EIXO', trailer_axle: 'EIXO\nTRAILER', diff_lock: 'BLOQUEIO\nDIF.', trailer_attach: 'TRAILER',
  gear_up: 'MARCHA\u00a0+', gear_down: 'MARCHA\u00a0\u2212', neutral: 'NEUTRO', gearbox_mode: 'AUTO\nMANUAL', range: 'ALTA\nBAIXA', splitter: 'SPLIT',
  window_left_down: 'VIDRO E\nABRIR', window_left_up: 'VIDRO E\nFECHAR', window_right_down: 'VIDRO D\nABRIR', window_right_up: 'VIDRO D\nFECHAR',
  dash_display: 'PAINEL', dash_map: 'MAPA\nPAINEL', trip_reset: 'ZERAR\nVIAGEM', truck_adjust: 'AJUSTE',
  cam_next: 'TROCAR\nC\u00c2MERA', cam_interior: 'CABINE', cam_chase: 'EXTERNA', cam_top: 'DE CIMA', cam_roof: 'TETO', cam_lean: 'JANELA',
  cam_bumper: 'PARA-\nCHOQUE', cam_wheel: 'RODA', cam_driveby: 'PASSAGEM', look_left: 'OLHAR E', look_right: 'OLHAR D', cam_zoom: 'ZOOM',
  ra_mouse: 'MOUSE\nGPS', mirrors: 'ESPELHOS', ra_modes: 'ASSISTENTE', ra_nav: 'NAVEGAR', ra_job: 'CARGA', ra_diag: 'DIAGN.',
  ra_info: 'INFO', ra_next: 'PR\u00d3X.', ra_prev: 'ANT.',
  activate: 'CONFIRMAR', menu: 'MENU', nav_up: 'CIMA', nav_down: 'BAIXO', nav_left: 'ESQ.', nav_right: 'DIR.',
  world_map: 'MAPA', garage: 'GARAGEM', quick_save: 'SALVAR', quick_load: 'CARREGAR', screenshot: 'FOTO',
  radio: 'R\u00c1DIO', radio_next: 'PR\u00d3X.', radio_prev: 'ANT.', radio_vol_up: 'VOL\u00a0+', radio_vol_down: 'VOL\u00a0\u2212',
  radio_folder_up: 'PASTA\n+', radio_folder_down: 'PASTA\n\u2212', radio_preset_1: 'FAV. 1', radio_preset_2: 'FAV. 2', radio_preset_3: 'FAV. 3',
  radio_preset_4: 'FAV. 4', radio_preset_5: 'FAV. 5', radio_preset_6: 'FAV. 6',
  media_play: 'TOCAR', media_next: 'PR\u00d3X.', media_prev: 'ANT.', vol_up: 'VOL\u00a0+', vol_down: 'VOL\u00a0\u2212', vol_mute: 'MUDO',
};

const LABELS_DE = {
  engine: 'START', electrics: 'ZÜNDUNG', parking_brake: 'FESTST.\nBREMSE', engine_brake: 'MOTOR-\nBREMSE', engine_brake_toggle: 'MOTOR-\nBREMSE',
  engine_brake_up: 'MOTORBR. +', engine_brake_down: 'MOTORBR. −', retarder_auto: 'RETARDER\nAUTOM.', lane_assist: 'SPUR-\nASSIST.',
  emergency_brake: 'NOT-\nBREMSE', hud: 'HUD', susp_front_up: 'VORNE\nHOCH', susp_front_down: 'VORNE\nRUNTER', susp_rear_up: 'HINTEN\nHOCH',
  susp_rear_down: 'HINTEN\nRUNTER', susp_reset: 'RESET\nFEDER.', cam_prev: 'KAMERA\nZURÜCK', cam_reset: 'KAMERA\nRESET', retarder_up: 'RETARDER +',
  retarder_down: 'RETARDER −', trailer_brake: 'ANHÄNGER\nBREMSE', lights: 'LICHT', high_beam: 'FERN-\nLICHT', light_horn: 'LICHT-\nHUPE',
  beacon: 'RUNDUM-\nLEUCHTE', hazard: 'WARN-\nBLINKER', blinker_left: 'LINKS', blinker_right: 'RECHTS', horn: 'HUPE', air_horn: 'DRUCKLUFT-\nHUPE',
  wipers: 'WISCHER', wipers_back: 'WISCHER −', cruise: 'TEMPOMAT', cruise_up: 'TEMPO +', cruise_down: 'TEMPO −', cruise_resume: 'FORTSETZ.',
  lift_axle: '3. ACHSE', trailer_axle: 'ANH.\nACHSE', diff_lock: 'DIFF.-\nSPERRE', trailer_attach: 'ANHÄNGER', gear_up: 'GANG +',
  gear_down: 'GANG −', neutral: 'LEERLAUF', gearbox_mode: 'AUTO\nMANUELL', range: 'HOCH\nNIEDRIG', splitter: 'SPLIT',
  window_left_down: 'FENSTER L\nAUF', window_left_up: 'FENSTER L\nZU', window_right_down: 'FENSTER R\nAUF', window_right_up: 'FENSTER R\nZU',
  dash_display: 'ANZEIGE', dash_map: 'KARTE\nANZEIGE', trip_reset: 'TRIP\nRESET', truck_adjust: 'EINSTELL.', cam_next: 'KAMERA\nWECHSEL',
  cam_interior: 'KABINE', cam_chase: 'AUSSEN', cam_top: 'VON OBEN', cam_roof: 'DACH', cam_lean: 'FENSTER', cam_bumper: 'STOSS-\nSTANGE',
  cam_wheel: 'RAD', cam_driveby: 'VORBEI-\nFAHRT', look_left: 'BLICK L', look_right: 'BLICK R', cam_zoom: 'ZOOM', ra_mouse: 'MAUS\nGPS',
  mirrors: 'SPIEGEL', ra_modes: 'ASSISTENT', ra_nav: 'NAVI', ra_job: 'FRACHT', ra_diag: 'DIAGN.', ra_info: 'INFO', ra_next: 'WEITER',
  ra_prev: 'ZURÜCK', activate: 'BESTÄTIGEN', menu: 'MENÜ', nav_up: 'HOCH', nav_down: 'RUNTER', nav_left: 'LINKS', nav_right: 'RECHTS',
  world_map: 'KARTE', garage: 'GARAGE', quick_save: 'SPEICHERN', quick_load: 'LADEN', screenshot: 'FOTO', radio: 'RADIO', radio_next: 'WEITER',
  radio_prev: 'ZURÜCK', radio_vol_up: 'LAUTST. +', radio_vol_down: 'LAUTST. −', radio_folder_up: 'ORDNER\n+', radio_folder_down: 'ORDNER\n−',
  radio_preset_1: 'FAV. 1', radio_preset_2: 'FAV. 2', radio_preset_3: 'FAV. 3', radio_preset_4: 'FAV. 4', radio_preset_5: 'FAV. 5',
  radio_preset_6: 'FAV. 6', media_play: 'PLAY', media_next: 'WEITER', media_prev: 'ZURÜCK', vol_up: 'LAUTST. +', vol_down: 'LAUTST. −',
  vol_mute: 'STUMM',
};

const LABELS_ES = {
  engine: 'ARRANQUE', electrics: 'ENCENDIDO', parking_brake: 'FRENO\nESTAC.', engine_brake: 'FRENO\nMOTOR', engine_brake_toggle: 'FRENO\nMOTOR',
  engine_brake_up: 'FRENO MOT. +', engine_brake_down: 'FRENO MOT. −', retarder_auto: 'RETARDER\nAUTOM.', lane_assist: 'ASIST.\nCARRIL',
  emergency_brake: 'FRENO\nEMERG.', hud: 'HUD', susp_front_up: 'DELANT.\nSUBIR', susp_front_down: 'DELANT.\nBAJAR', susp_rear_up: 'TRASERA\nSUBIR',
  susp_rear_down: 'TRASERA\nBAJAR', susp_reset: 'RESET\nSUSP.', cam_prev: 'CÁMARA\nANT.', cam_reset: 'CÁMARA\nRESET', retarder_up: 'RETARDER +',
  retarder_down: 'RETARDER −', trailer_brake: 'FRENO\nREMOLQUE', lights: 'LUCES', high_beam: 'LUZ\nALTA', light_horn: 'DESTELLO', beacon: 'BALIZA',
  hazard: 'EMERG.', blinker_left: 'IZQUIERDA', blinker_right: 'DERECHA', horn: 'BOCINA', air_horn: 'BOCINA\nAIRE', wipers: 'LIMPIA-\nPARABR.',
  wipers_back: 'LIMPIA −', cruise: 'CRUCERO', cruise_up: 'VEL +', cruise_down: 'VEL −', cruise_resume: 'REANUDAR', lift_axle: '3º EJE',
  trailer_axle: 'EJE\nREMOLQUE', diff_lock: 'BLOQUEO\nDIF.', trailer_attach: 'REMOLQUE', gear_up: 'MARCHA +', gear_down: 'MARCHA −',
  neutral: 'NEUTRO', gearbox_mode: 'AUTO\nMANUAL', range: 'ALTA\nBAJA', splitter: 'SPLIT', window_left_down: 'VENTANA I\nABRIR',
  window_left_up: 'VENTANA I\nCERRAR', window_right_down: 'VENTANA D\nABRIR', window_right_up: 'VENTANA D\nCERRAR', dash_display: 'PANEL',
  dash_map: 'MAPA\nPANEL', trip_reset: 'RESET\nVIAJE', truck_adjust: 'AJUSTE', cam_next: 'CAMBIAR\nCÁMARA', cam_interior: 'CABINA',
  cam_chase: 'EXTERNA', cam_top: 'DESDE\nARRIBA', cam_roof: 'TECHO', cam_lean: 'VENTANA', cam_bumper: 'PARA-\nCHOQUES', cam_wheel: 'RUEDA',
  cam_driveby: 'PASO', look_left: 'MIRAR I', look_right: 'MIRAR D', cam_zoom: 'ZOOM', ra_mouse: 'RATÓN\nGPS', mirrors: 'ESPEJOS',
  ra_modes: 'ASISTENTE', ra_nav: 'NAVEGAR', ra_job: 'CARGA', ra_diag: 'DIAGN.', ra_info: 'INFO', ra_next: 'SIG.', ra_prev: 'ANT.',
  activate: 'CONFIRMAR', menu: 'MENÚ', nav_up: 'ARRIBA', nav_down: 'ABAJO', nav_left: 'IZQ.', nav_right: 'DER.', world_map: 'MAPA', garage: 'GARAJE',
  quick_save: 'GUARDAR', quick_load: 'CARGAR', screenshot: 'FOTO', radio: 'RADIO', radio_next: 'SIG.', radio_prev: 'ANT.', radio_vol_up: 'VOL +',
  radio_vol_down: 'VOL −', radio_folder_up: 'CARPETA\n+', radio_folder_down: 'CARPETA\n−', radio_preset_1: 'FAV. 1', radio_preset_2: 'FAV. 2',
  radio_preset_3: 'FAV. 3', radio_preset_4: 'FAV. 4', radio_preset_5: 'FAV. 5', radio_preset_6: 'FAV. 6', media_play: 'REPROD.', media_next: 'SIG.',
  media_prev: 'ANT.', vol_up: 'VOL +', vol_down: 'VOL −', vol_mute: 'SILENCIO',
};

const LABELS_FR = {
  engine: 'DÉMARRER', electrics: 'CONTACT', parking_brake: 'FREIN\nPARKING', engine_brake: 'FREIN\nMOTEUR', engine_brake_toggle: 'FREIN\nMOTEUR',
  engine_brake_up: 'FREIN MOT. +', engine_brake_down: 'FREIN MOT. −', retarder_auto: 'RALENTIS.\nAUTOM.', lane_assist: 'AIDE AU\nMAINTIEN',
  emergency_brake: 'FREIN\nURGENCE', hud: 'HUD', susp_front_up: 'AVANT\nMONTER', susp_front_down: 'AVANT\nBAISSER', susp_rear_up: 'ARRIÈRE\nMONTER',
  susp_rear_down: 'ARRIÈRE\nBAISSER', susp_reset: 'RESET\nSUSPENS.', cam_prev: 'CAMÉRA\nPRÉC.', cam_reset: 'CAMÉRA\nRESET',
  retarder_up: 'RALENTIS. +', retarder_down: 'RALENTIS. −', trailer_brake: 'FREIN\nREMORQUE', lights: 'PHARES', high_beam: 'FEUX DE\nROUTE',
  light_horn: 'APPEL\nPHARES', beacon: 'GYROPHARE', hazard: 'WARNING', blinker_left: 'GAUCHE', blinker_right: 'DROITE', horn: 'KLAXON',
  air_horn: 'TROMPE\nA AIR', wipers: 'ESSUIE-\nGLACE', wipers_back: 'ESSUIE −', cruise: 'RÉGUL.\nVITESSE', cruise_up: 'VIT +', cruise_down: 'VIT −',
  cruise_resume: 'REPRENDRE', lift_axle: '3E ESSIEU', trailer_axle: 'ESSIEU\nREMORQUE', diff_lock: 'BLOCAGE\nDIFF.', trailer_attach: 'REMORQUE',
  gear_up: 'VITESSE +', gear_down: 'VITESSE −', neutral: 'POINT\nMORT', gearbox_mode: 'AUTO\nMANUEL', range: 'HAUTE\nBASSE', splitter: 'SPLIT',
  window_left_down: 'VITRE G\nOUVRIR', window_left_up: 'VITRE G\nFERMER', window_right_down: 'VITRE D\nOUVRIR', window_right_up: 'VITRE D\nFERMER',
  dash_display: 'TABLEAU\nBORD', dash_map: 'CARTE\nTABLEAU', trip_reset: 'RESET\nTRAJET', truck_adjust: 'RÉGLAGE', cam_next: 'CHANGER\nCAMÉRA',
  cam_interior: 'CABINE', cam_chase: 'EXTÉRIEUR', cam_top: 'VUE DU\nDESSUS', cam_roof: 'TOIT', cam_lean: 'FENÊTRE', cam_bumper: 'PARE-\nCHOCS',
  cam_wheel: 'ROUE', cam_driveby: 'PASSAGE', look_left: 'REGARD G', look_right: 'REGARD D', cam_zoom: 'ZOOM', ra_mouse: 'SOURIS\nGPS',
  mirrors: 'RÉTRO-\nVISEURS', ra_modes: 'ASSISTANT', ra_nav: 'NAVIGUER', ra_job: 'FRET', ra_diag: 'DIAGN.', ra_info: 'INFO', ra_next: 'SUIV.',
  ra_prev: 'PRÉC.', activate: 'CONFIRMER', menu: 'MENU', nav_up: 'HAUT', nav_down: 'BAS', nav_left: 'GAUCHE', nav_right: 'DROITE',
  world_map: 'CARTE', garage: 'GARAGE', quick_save: 'SAUVEG.', quick_load: 'CHARGER', screenshot: 'PHOTO', radio: 'RADIO', radio_next: 'SUIV.',
  radio_prev: 'PRÉC.', radio_vol_up: 'VOL +', radio_vol_down: 'VOL −', radio_folder_up: 'DOSSIER\n+', radio_folder_down: 'DOSSIER\n−',
  radio_preset_1: 'FAV. 1', radio_preset_2: 'FAV. 2', radio_preset_3: 'FAV. 3', radio_preset_4: 'FAV. 4', radio_preset_5: 'FAV. 5',
  radio_preset_6: 'FAV. 6', media_play: 'LECTURE', media_next: 'SUIV.', media_prev: 'PRÉC.', vol_up: 'VOL +', vol_down: 'VOL −', vol_mute: 'MUET',
};

const LABELS_BY_LANG = { pt: LABELS_PT, de: LABELS_DE, es: LABELS_ES, fr: LABELS_FR };

// Other text drawn on the panel itself (readouts, dials, radio, GPS), per panel language.
const PANEL_TEXT = {
  en: {
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    display: {},
    unitRpm: 'RPM \u00d7100', unitFuel: 'FUEL', unitAir: 'AIR PSI', fuelEmpty: 'E', fuelFull: 'F',
    truck: 'Truck', trailer: 'Trailer', cargo: 'Cargo',
    radioDemo: 'Start the PC bridge to see your music', radioOpen: 'Start your music player on the PC', radioPaused: 'Paused', radioTop: 'MUSIC', noTrip: 'No route set',
  },
  de: {
    days: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    display: { time: 'SPIELZEIT', speed: 'GESCHW.', gear: 'GANG', cruise: 'TEMPOMAT', fuel: 'KRAFTST.', rpm: 'DREHZAHL', air: 'LUFT PSI',
      retarder: 'RETARDER', clock: 'UHRZEIT', dmg_truck: 'ZUGMASCH.', dmg_trailer: 'ANH\u00c4NGER', dmg_cargo: 'LADUNG', trip: 'FAHRT' },
    unitRpm: 'RPM \u00d7100', unitFuel: 'KRAFTST.', unitAir: 'LUFT PSI', fuelEmpty: 'L', fuelFull: 'V',
    truck: 'Zugmaschine', trailer: 'Anh\u00e4nger', cargo: 'Ladung',
    radioDemo: 'PC-Bridge starten, um Musik zu sehen', radioOpen: '\u00d6ffne deinen Musik-Player am PC', radioPaused: 'Pausiert', radioTop: 'MUSIK', noTrip: 'Keine Route gesetzt',
  },
  es: {
    days: ['Lun', 'Mar', 'Mi\u00e9', 'Jue', 'Vie', 'S\u00e1b', 'Dom'],
    display: { time: 'HORA DEL JUEGO', speed: 'VELOCIDAD', gear: 'MARCHA', cruise: 'CRUCERO', fuel: 'COMB.', rpm: 'RPM', air: 'AIRE PSI',
      retarder: 'RETARDER', clock: 'HORA REAL', dmg_truck: 'CABEZA TRACT.', dmg_trailer: 'REMOLQUE', dmg_cargo: 'CARGA', trip: 'VIAJE' },
    unitRpm: 'RPM \u00d7100', unitFuel: 'COMB.', unitAir: 'AIRE PSI', fuelEmpty: 'V', fuelFull: 'L',
    truck: 'Cabeza tractora', trailer: 'Remolque', cargo: 'Carga',
    radioDemo: 'Inicia el puente del PC para ver tu m\u00fasica', radioOpen: 'Abre tu reproductor de m\u00fasica en el PC', radioPaused: 'Pausado', radioTop: 'M\u00daSICA', noTrip: 'Sin ruta establecida',
  },
  fr: {
    days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    display: { time: 'HEURE JEU', speed: 'VITESSE', gear: 'VITESSE', cruise: 'R\u00c9GUL.', fuel: 'CARBUR.', rpm: 'RPM', air: 'AIR PSI',
      retarder: 'RALENTIS.', clock: 'HEURE R\u00c9ELLE', dmg_truck: 'TRACTEUR', dmg_trailer: 'REMORQUE', dmg_cargo: 'CARGAISON', trip: 'TRAJET' },
    unitRpm: 'RPM \u00d7100', unitFuel: 'CARBUR.', unitAir: 'AIR PSI', fuelEmpty: 'V', fuelFull: 'P',
    truck: 'Tracteur', trailer: 'Remorque', cargo: 'Cargaison',
    radioDemo: 'D\u00e9marrez le pont PC pour voir votre musique', radioOpen: 'Ouvrez votre lecteur de musique sur le PC', radioPaused: 'En pause', radioTop: 'MUSIQUE', noTrip: 'Aucun itin\u00e9raire d\u00e9fini',
  },
  pt: {
    days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'S\u00e1b', 'Dom'],
    display: { time: 'HORA DO JOGO', speed: 'VELOCIDADE', gear: 'MARCHA', cruise: 'PILOTO', fuel: 'COMB.', rpm: 'RPM', air: 'AR PSI',
      retarder: 'RETARDER', clock: 'HORA REAL', dmg_truck: 'CAVALO', dmg_trailer: 'TRAILER', dmg_cargo: 'CARGA', trip: 'VIAGEM' },
    unitRpm: 'RPM \u00d7100', unitFuel: 'COMB.', unitAir: 'AR PSI', fuelEmpty: 'V', fuelFull: 'C',
    truck: 'Cavalo', trailer: 'Trailer', cargo: 'Carga',
    radioDemo: 'Inicie a ponte no PC para ver sua m\u00fasica', radioOpen: 'Abra seu tocador de m\u00fasica no PC', radioPaused: 'Pausado', radioTop: 'M\u00daSICA', noTrip: 'Sem rota definida',
  },
};

// ---- Keys offered by the editor ---------------------------------------------------------
// Must stay a subset of the KEYS table in bridge/server.js (the server rejects anything else).
const MODIFIER_KEYS = ['ctrl', 'shift', 'alt'];
const MAIN_KEYS = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
  'space', 'enter', 'esc', 'tab', 'backspace', 'insert', 'delete', 'home', 'end', 'pgup', 'pgdn',
  'up', 'down', 'left', 'right', 'scrolllock',
  '-', '=', '[', ']', ';', "'", ',', '.', '/', '\\', '`',
  'num0', 'num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'num7', 'num8', 'num9',
  'num+', 'num-', 'num*', 'num/', 'num.', 'numenter',
  'shift', 'ctrl', 'alt',
  'media_play', 'media_next', 'media_prev', 'vol_up', 'vol_down', 'vol_mute',
];

const KEY_LABELS = {
  space: 'Space', enter: 'Enter', esc: 'Esc', tab: 'Tab', backspace: 'Backspace', insert: 'Insert',
  delete: 'Delete', home: 'Home', end: 'End', pgup: 'Page Up', pgdn: 'Page Down', up: 'Up', down: 'Down',
  left: 'Left', right: 'Right', scrolllock: 'Scroll Lock', ctrl: 'Ctrl', shift: 'Shift', alt: 'Alt',
  numenter: 'Num Enter', media_play: 'Media play/pause', media_next: 'Media next', media_prev: 'Media previous',
  vol_up: 'Volume up', vol_down: 'Volume down', vol_mute: 'Volume mute',
};

function keyLabel(k) {
  if (KEY_LABELS[k]) return KEY_LABELS[k];
  if (k.startsWith('num')) return 'Num ' + k.slice(3);
  return k.toUpperCase();
}

function comboLabel(keys) {
  return (keys || []).map(keyLabel).join(' + ');
}

// Analog dials available to the "gauge" widget
const GAUGE_FIELDS = [
  { id: 'speed', name: 'Speedometer' },
  { id: 'rpm', name: 'Tachometer' },
  { id: 'fuel', name: 'Fuel' },
  { id: 'air', name: 'Air pressure' },
];

// Telemetry readouts available to the "display" widget
const DISPLAY_FIELDS = [
  { id: 'time', name: 'Game time', label: 'GAME TIME' },
  { id: 'speed', name: 'Speed', label: 'SPEED' },
  { id: 'gear', name: 'Gear', label: 'GEAR' },
  { id: 'cruise', name: 'Cruise speed', label: 'CRUISE' },
  { id: 'fuel', name: 'Fuel', label: 'FUEL' },
  { id: 'rpm', name: 'Engine RPM', label: 'RPM' },
  { id: 'air', name: 'Air pressure', label: 'AIR PSI' },
  { id: 'retarder', name: 'Retarder level', label: 'RETARDER' },
  { id: 'clock', name: 'Real time', label: 'REAL TIME' },
  { id: 'dmg_truck', name: 'Truck damage', label: 'TRUCK' },
  { id: 'dmg_trailer', name: 'Trailer damage', label: 'TRAILER' },
  { id: 'dmg_cargo', name: 'Cargo damage', label: 'CARGO' },
  { id: 'trip', name: 'Trip: day, time, distance and time left', label: 'TRIP' },
];
