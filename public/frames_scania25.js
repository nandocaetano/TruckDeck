// Scania 2025 "Smart Dash" digital cluster - ORIGINAL vector redraw.
// Nothing here is copied from SCS or from any mod: no texture, font or file is shipped. The PLACEMENT of every
// read-out, lamp, bar and scale follows the reference layout element by element (its 1440 x 540 coordinate
// sheet: box of each element, alignment, colour, bar range), and every shape is drawn from scratch here.
// The faint heraldic watermark is a simple original SVG drawing for this panel.
//
// Architecture: the cluster is a LOCKED widget ('sc25'). Everything is one SVG driven by live telemetry.
// Screens are NOT touchable: they follow the game's own "dashboard display modes" button (see app.js / bridge).
//
//   SC25.ctx  - set by app.js; returns { dead, t, gear, theme } for the current frame
//   SC25.mount(node, w) - builds the SVG into `node` and starts its own animation loop
'use strict';
window.SC25 = (function () {
  const NS_PAGES = 6;                       // six live telemetry screens; no static GPS capture
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const FONT = '\'Barlow Condensed\',\'Roboto Condensed\',\'Arial Narrow\',sans-serif';

  // ---- Selectable factory backlight palette ------------------------------------------------
  // Premium truck-cluster backlights. Typography stays neutral; live ribbons and active
  // indicators take the selected hue so the display remains legible at a glance.
  const THEMES = {
    // Factory cluster look: cool white readouts, red needles and a restrained amber backlight.
    factory:{ accent:'#d9943c', needle:'#e52c32', glint:'#ffc4b2', speed:'#f5f7f8', odo:'#f5f7f8', ink:'#e8edf0', glow:'#70431f', face:'#171311', backlight:'#100c09' },
    red:    { accent:'#df3c46', needle:'#e83d46', glint:'#ffc0c4', speed:'#fff7f7', glow:'#743239' },
    amber:  { accent:'#e8a64b', needle:'#e8a64b', glint:'#ffe3b4', speed:'#fffaf2', glow:'#76552c' },
    blue:   { accent: '#54a9ff', speed: '#f7fcff', glow: '#245b91' },
    white:  { accent: '#e6eef5', speed: '#ffffff', glow: '#788897' },
    pink:   { accent: '#f078bb', speed: '#fff8fc', glow: '#813e68' },
    green:  { accent: '#48d597', speed: '#f5fff9', glow: '#276e51' },
    lime:   { accent: '#b9e94b', speed: '#fbfff2', glow: '#627b2b' },
    yellow: { accent: '#f2c451', speed: '#fffdf5', glow: '#80652c' },
    purple: { accent: '#b39aff', speed: '#fbf9ff', glow: '#5d4b91' },
  };
  // Digital cluster palette and analog-cluster palette are intentionally distinct.
  const THEME_KEYS = ['blue', 'white', 'pink', 'green', 'lime', 'yellow', 'purple'];
  const SCANIA_THEME_KEYS = ['factory', 'red', 'white', 'blue', 'green', 'amber'];

  // Fixed colours of the reference layout (its AABBGGRR values converted to #rrggbb)
  const C = {
    ink: '#f5fbff',      // primary read-outs
    gray: '#d5e0e7',     // gear and secondary units
    bgray: '#bdcbd3',    // side indicators
    num: '#f4f9fc',      // scale numbers
    unit: '#bdcbd3',     // scale units
    sub: '#9eafb9',
    track: '#35454e', track2: '#35454e', trackDk: '#26343b',
    line: '#81949c', green: '#278ba0', lane: '#8ca0a8',
    tick: '#eaf3f7', tickMinor: '#9bafb7', axis: '#e7f1f5',
    amber: '#d9943c', red: '#dd3d49', blue: '#08d8f2', retarder: '#08d8f2', blink: '#08d8f2', warnAmber: '#d9943c', ok: '#08d8f2', seg: '#26333a', segOn: '#08d8f2',
  };

  // ---- 24x24 line icons, drawn from scratch ------------------------------------------------
  const RING = '<circle cx="12" cy="12" r="6.6"/><path d="M4.6 6.2a9.2 9.2 0 0 0 0 11.6M19.4 6.2a9.2 9.2 0 0 1 0 11.6"/>';
  const IC = {
    beam: '<path d="M13.5 5C9 5 6.5 8.3 6.5 12s2.5 7 7 7c2.6 0 4-3.2 4-7s-1.4-7-4-7z"/><path d="M1.5 7.5h3.5M1.5 10.5h3.5M1.5 13.5h3.5M1.5 16.5h3.5"/>',
    ring: RING,
    lowp: RING + '<path d="M12 8.6v4.2M12 15.2v.3"/>',
    park: RING + '<path d="M10.4 15.6V8.4h2.2a2.1 2.1 0 0 1 0 4.2h-2.2"/>',
    ret: RING + '<path d="M8.6 12c0-2.1 3.4-2.1 3.4 0s3.4 2.1 3.4 0-3.4-2.1-3.4 0-3.4 2.1-3.4 0z"/>',
    left: '<path d="M2.5 12L10 5.5v4H16v5h-6v4z" fill="currentColor" stroke="none"/><rect x="17.5" y="9.5" width="4" height="5" fill="currentColor" stroke="none"/>',
    right: '<path d="M21.5 12L14 5.5v4H8v5h6v4z" fill="currentColor" stroke="none"/><rect x="2.5" y="9.5" width="4" height="5" fill="currentColor" stroke="none"/>',
    engw: '<path d="M5 10h2.5V7.5h6V10H16l2 2v4l-2 2H8l-2-2v-1.5H3V11h2z"/><path d="M11 10.6v3M11 15.5v.3"/>',
    diff: '<path d="M2.5 8.5v7M21.5 8.5v7M2.5 12h4.5M17 12h4.5M9.5 9.5l5 5M14.5 9.5l-5 5"/>',
    fuel: '<path d="M5 20V5.2A1.2 1.2 0 0 1 6.2 4h6.6A1.2 1.2 0 0 1 14 5.2V20M4 20h11M5 11h9M14 8.2h2.2A1.8 1.8 0 0 1 18 10v5.5a1.6 1.6 0 0 0 3.2 0V9l-2.2-2.2"/>',
    fuelIns: '<path d="M5 20V5.2A1.2 1.2 0 0 1 6.2 4h6.6A1.2 1.2 0 0 1 14 5.2V20M4 20h11M14 8.2h2.2A1.8 1.8 0 0 1 18 10v5.5a1.6 1.6 0 0 0 3.2 0V9l-2.2-2.2M9.5 7v3.6M7.7 8.8h3.6M7.7 15.5h3.6"/>',
    range: '<path d="M2.5 12h12M10 7.5l4.5 4.5L10 16.5M19.5 4.5v15"/>',
    cruise: '<path d="M4.2 17.5a8.2 8.2 0 1 1 15.6 0"/><path d="M12 14.8l-4-4.3M3.2 6.2l2.6 2.6"/><path d="M12 6v1.4M17.3 8.6l-1 1M19.5 13.2h-1.4"/>',
    lanes: '<path d="M8 3.5L2.5 21M16 3.5l5.5 17.5M7 7h10M6.2 10.5h11.6M5.2 14h13.6M4.2 17.5h15.6"/>',
    gaugeAvg: '<path d="M3.5 15.5a7.5 7.5 0 1 1 14.4-3"/><path d="M10.8 12.4l-3.6-3.8"/>',
    note: '<path d="M4 4h16v10.5L14.5 20H4z"/><path d="M4 8h16M14.5 20v-5.5H20"/>',
    tipper: '<path d="M2.5 16V8.5h4l2 3.5V16zM8.5 12h13v4h-13z"/><circle cx="6" cy="18" r="1.6"/><circle cx="15.5" cy="18" r="1.6"/><circle cx="19" cy="18" r="1.6"/>',
    oil: '<path d="M3 11h11l3-3h3.5M5 11l1.6 6h7.8L16 11M17 8V6.5h3.5"/><path d="M21 14c.8 1 1 1.7 1 2.2a1 1 0 0 1-2 0c0-.5.2-1.2 1-2.2z"/>',
    water: '<path d="M10.5 3.5v10.3a2.4 2.4 0 1 0 3 0V3.5zM13.5 6h2.5M13.5 9h2.5"/><path d="M3 19c2-1.4 3-1.4 5 0s3 1.4 5 0 3-1.4 5 0 2.5 1.4 3.5.6"/>',
  };
  const icon = (n, x, y, s, color) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 24) + ')" fill="none" style="color:' + color + ';stroke:' + color +
    '" stroke-width="' + (24 / s * 2.2).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round">' + IC[n] + '</g>';
  // text helper: (x, baseline) in cluster units; a = start | middle | end
  const T = (x, y, size, color, str, a, k, extra) => '<text' + (k ? ' data-k="' + k + '"' : '') + ' x="' + x + '" y="' + y + '" font-size="' + size +
    '"' + (a && a !== 'start' ? ' text-anchor="' + a + '"' : '') + ' fill="' + color + '"' + (extra || '') + '>' + str + '</text>';
  // "AVG" sub-label of the consumption / average-speed icons
  const AVG = (x, y, s, color) => '<text x="' + (x + s * 0.98) + '" y="' + (y + s * 0.98) + '" font-size="' + (s * 0.36).toFixed(1) + '" font-weight="700" text-anchor="end" fill="' + color + '">AVG</text>';

  // ---- Geometry ---------------------------------------------------------------------------------
  // Every position below is written in the reference sheet's units (1440 x 540, y down) and mapped with Y().
  // Phone ('tall'): the sheet as it is. Tablet landscape ('wide'): the canvas is 1440 x 804 so it fills the whole
  // panel; the sheet starts TOPY units down (clear of the key row) and its height is stretched by KY so the
  // speed sits right under the keys and the bottom read-outs sit on the bottom edge. Widths are NOT stretched:
  // shapes keep their angle (the scale axes get KY times their run so their slant is unchanged) and every
  // glyph keeps its proportions, only enlarged by G.
  let H = 540, TOPY = 0, KY = 1, G = 1;
  function setGeom(mode) {
    if (mode === 'wide') { H = 804; TOPY = 58; KY = (804 - 58) / 540; G = 1.15; } else { H = 540; TOPY = 0; KY = 1; G = 1; }
  }
  const Y = (y) => TOPY + y * KY;
  const f1 = (n) => (+n).toFixed(1);
  function firstObj() { for (let i = 0; i < arguments.length; i += 1) { const v = arguments[i]; if (v && typeof v === 'object') return v; } return null; }
  function pick(o, keys, d) { for (let i = 0; i < keys.length; i += 1) { const v = o && o[keys[i]]; if (v !== undefined && v !== null && v !== '') return v; } return d; }
  function n(o, keys, d) { const v = Number(pick(o, keys, d || 0)); return Number.isFinite(v) ? v : (d || 0); }
  function b(o, keys) { const v = pick(o, keys, false); return v === true || v === 1 || v === '1' || v === 'true'; }
  function normalizeTel(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      sdk: !!pick(raw, ['sdk'], true),
      speed: n(raw, ['speed', 'truckSpeed'], 0), rpm: n(raw, ['rpm', 'engineRpm'], 0), cruise: n(raw, ['cruise', 'cruiseSpeed'], 0), cruiseOn: b(raw, ['cruiseOn']), limit: n(raw, ['limit', 'speedLimit'], 0),
      fuel: n(raw, ['fuel'], 0), fuelCap: n(raw, ['fuelCap', 'fuelCapacity'], 0), fuelAvg: n(raw, ['fuelAvg', 'fuelAverage'], 0), range: n(raw, ['range', 'fuelRange'], 0), adblue: n(raw, ['adblue'], 0), adblueCap: n(raw, ['adblueCap', 'adblueCapacity'], 0),
      air: n(raw, ['air', 'airPressure'], 0), oilP: n(raw, ['oilP', 'oilPressure'], 0), waterT: n(raw, ['waterT', 'waterTemp'], 0), oilT: n(raw, ['oilT', 'oilTemp'], 0),
      odo: n(raw, ['odo', 'odometer'], 0), time: n(raw, ['time', 'gameTime'], 0), routeDist: n(raw, ['routeDist'], 0), routeTime: n(raw, ['routeTime'], 0),
      high: b(raw, ['high', 'highBeam']), park: b(raw, ['park', 'parkingBrake']), blinkL: b(raw, ['blinkL', 'blinkerLeft']), blinkR: b(raw, ['blinkR', 'blinkerRight']), diff: b(raw, ['diff', 'diffLock']), retarder: n(raw, ['retarder'], 0),
      airWarn: b(raw, ['airWarn']), oilWarn: b(raw, ['oilWarn']), waterWarn: b(raw, ['waterWarn']), fuelWarn: b(raw, ['fuelWarn']), dmgTruck: n(raw, ['dmgTruck'], 0),
      electric: b(raw, ['electric']), engine: b(raw, ['engine'])
    };
  }  // speed scale: 0..200 km/h, matched to the full angled rail
  const sy = (v) => 427.3 - 1.852 * v;
  const sAx = (ym) => 404.6 - 0.1944 * KY * (427.3 - ym);
  // rpm 0..2500: tick at sheet-y 427.3 - 0.13812 v; ticks hang LEFT of an axis that leans the other way
  const ry = (v) => 427.3 - 0.13812 * v;
  const rAx = (ym) => 1034 + 0.1952 * KY * (427.3 - ym);

  // mapped primitives: text keeps its visual centre on the mapped spot, icons are centred on it
  const TT = (x, b, size, color, str, a, k, extra) => T(x, f1(Y(b - 0.35 * size) + 0.35 * size * G), f1(size * G), color, str, a, k, extra);
  const ICO = (n, x, y, s, color) => { const S = s * G, cy = Y(y + s / 2); return icon(n, f1(x + s / 2 - S / 2), f1(cy - S / 2), S, color); };
  const RECT = (x, y, w, h, fill, k) => '<rect' + (k ? ' data-k="' + k + '"' : '') + ' x="' + x + '" y="' + f1(Y(y)) + '" width="' + w + '" height="' + f1(h * G) + '"' +
    (fill.indexOf('var(') === 0 ? ' style="fill:' + fill + '"' : ' fill="' + fill + '"') + '/>';
  // value + smaller unit on one baseline
  const VU = (x, b, vs, us, color, k, unit, a, udy) => '<text x="' + x + '" y="' + f1(Y(b - 0.35 * vs) + 0.35 * vs * G) + '"' + (a && a !== 'start' ? ' text-anchor="' + a + '"' : '') +
    ' fill="' + color + '"><tspan data-k="' + k + '" font-size="' + f1(vs * G) + '">--</tspan><tspan font-size="' + f1(us * G) + '" dy="' + f1((udy || 2) * G) + '">' + unit + '</tspan></text>';
  const AVGT = (x, y, s, color) => TT(x + s * 0.98, y + s * 0.98, s * 0.36, color, 'AVG', 'end', '', ' font-weight="700"');

  // ---- Static markup. Elements the loop updates carry data-k="name" (never an id). -----------------
  function markup() {
    let s = '<defs>' +
      '<linearGradient id="s25RoadFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9db7c0" stop-opacity="0"/><stop offset=".42" stop-color="#9db7c0" stop-opacity=".045"/><stop offset="1" stop-color="#9db7c0" stop-opacity=".22"/></linearGradient>' +
      '<linearGradient id="s25SpeedRibbon" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--accent)" stop-opacity=".06"/><stop offset=".72" stop-color="var(--accent)" stop-opacity=".25"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".92"/></linearGradient>' +
      '<linearGradient id="s25RpmRibbon" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--accent)" stop-opacity=".06"/><stop offset=".72" stop-color="var(--accent)" stop-opacity=".25"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".92"/></linearGradient>' +
      '</defs>';
    s += '<g data-k="all" font-family="' + FONT + '" font-weight="600">';

    // Twin, faint heraldic griffins and a continuous road perspective sit behind the live instruments.
    s += '<g data-k="watermark" fill="none" stroke="#9be9f4" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity=".13">' +
      '<g transform="translate(600 54) scale(.92)"><path d="M57 13c-8-7-21-7-30 1l-9 9 13 2-7 8 18 2c-1 9 3 16 10 21-9 5-14 13-14 23 0 12 10 19 22 16 12-2 20-12 21-23 1-8-4-15-12-21 11-4 18-12 21-24l13-4-14-5 7-8-20 4c-6-5-12-7-19-7z"/><path d="M43 32C29 30 19 21 10 11c2 14 8 23 20 30-12-3-22-1-31 5 13 3 23 8 33 16M53 25c4 7 6 15 5 23M60 27c7 5 13 8 23 8M48 59c7 5 18 7 27 3M49 77c-8 8-17 12-28 12l8 6-9 6 19-2 15-12M70 76l12 13-9-1 5 8-14-6M37 43c-10 3-17 10-22 20M74 53c7 6 12 13 14 21"/></g>' +
      '<g transform="translate(840 54) scale(-.92 .92)"><path d="M57 13c-8-7-21-7-30 1l-9 9 13 2-7 8 18 2c-1 9 3 16 10 21-9 5-14 13-14 23 0 12 10 19 22 16 12-2 20-12 21-23 1-8-4-15-12-21 11-4 18-12 21-24l13-4-14-5 7-8-20 4c-6-5-12-7-19-7z"/><path d="M43 32C29 30 19 21 10 11c2 14 8 23 20 30-12-3-22-1-31 5 13 3 23 8 33 16M53 25c4 7 6 15 5 23M60 27c7 5 13 8 23 8M48 59c7 5 18 7 27 3M49 77c-8 8-17 12-28 12l8 6-9 6 19-2 15-12M70 76l12 13-9-1 5 8-14-6M37 43c-10 3-17 10-22 20M74 53c7 6 12 13 14 21"/></g></g>';
    s += '<g fill="none" stroke="url(#s25RoadFade)" stroke-width="1.35">' +
      '<path d="M720 ' + f1(Y(297)) + 'L575 ' + f1(Y(540)) + 'M720 ' + f1(Y(297)) + 'L865 ' + f1(Y(540)) + '"/></g>';

    // ---- speed scale (left): angled rail, live cyan fill, ticks and numbers ----
    s += '<path data-k="spdFill" fill="url(#s25SpeedRibbon)"/>';
    s += '<path d="M' + f1(sAx(80)) + ' ' + f1(Y(80)) + 'L' + f1(sAx(427.3)) + ' ' + f1(Y(427.3)) + '" stroke="' + C.axis + '" stroke-width="1.6"/>';
    s += '<g data-k="spdTicks">';
    for (let v = 0; v <= 200; v += 10) {
      const ym = sy(v), x = sAx(ym), major = v % 20 === 0;
      s += '<path data-v="' + v + '" d="M' + f1(x + (major ? 0 : 2.8 * G)) + ' ' + f1(Y(ym)) + 'h' + f1((major ? 16.8 : 12.6) * G) + '" stroke="' + (major ? C.tick : C.tickMinor) + '" stroke-width="' + (major ? 2.6 : 1.9) + '"/>';
    }
    s += '</g>';
    for (let v = 0; v <= 200; v += 20) { const ym = sy(v); s += TT(f1(sAx(ym) + 18.5 * G), ym + 9.5, 27, C.num, String(v)); }
    s += TT(395, 455, 19, C.unit, 'km/h');

    // ---- rpm scale (right), mirrored ----
    s += '<path data-k="rpmFill" fill="url(#s25RpmRibbon)"/>';
    s += '<path d="M' + f1(rAx(427.3)) + ' ' + f1(Y(427.3)) + 'L' + f1(rAx(96)) + ' ' + f1(Y(96)) + '" stroke="' + C.axis + '" stroke-width="1.6"/>' +
      '<path d="M' + f1(rAx(96)) + ' ' + f1(Y(96)) + 'L' + f1(rAx(57.4)) + ' ' + f1(Y(57.4)) + '" stroke="' + C.tick + '" stroke-width="2.2"/>';
    s += '<g data-k="rpmTicks">';
    for (let v = 0; v <= 2500; v += 100) {
      const ym = ry(v), x = rAx(ym), major = v % 500 === 0;
      s += '<path data-v="' + v + '" d="M' + f1(x - (major ? 0 : 2.8 * G)) + ' ' + f1(Y(ym)) + 'h' + f1(-(major ? 16.8 : 11.2) * G) + '" stroke="' + (major ? C.tick : C.tickMinor) + '" stroke-width="' + (major ? 2.6 : 1.9) + '"/>';
    }
    s += '</g>';
    [[72, '25'], [140, '20'], [210, '15'], [279, '10'], [348, '5'], [417, '0']].forEach((p) => {
      const ym = p[0] + 12; s += TT(f1(rAx(ym) - 21 * G), ym + 9.5, 27, C.num, p[1], 'end');
    });
    s += TT(969, 455, 19, C.unit, 'rpm x100');

    // ---- lamps (each hidden unless active; the boot self-test lights them all) ----
    const lamp = (k, ic, x, y, color) => '<g data-k="lp_' + k + '" opacity="0">' + ICO(ic, x, y, 44, color) + '</g>';
    s += lamp('beam', 'beam', 65, 5, 'var(--accent)') + lamp('lowp', 'lowp', 227, 5, C.amber) + lamp('park', 'park', 173, 47, 'var(--accent)') +
      lamp('ret', 'ret', 227, 47, C.retarder) + lamp('bl', 'left', 413, 5, 'var(--blinkc)') + lamp('br', 'right', 983, 5, 'var(--blinkc)') +
      lamp('eng', 'engw', 1169, 4, C.amber) + lamp('diff', 'diff', 1385, 5, 'var(--accent)');

    // ---- top centre: cruise, white speed, unit and gear ----
    s += '<g data-k="ccG" opacity="0">' + ICO('cruise', 461, 55, 34, 'var(--accent)') + TT(494, 124, 32, C.ink, '--', 'end', 'tCC') + '</g>';
    s += TT(720, 165, 92, '#f7fcff', '0', 'middle', 'tSpd');
    s += TT(773, 180, 20, C.gray, 'km/h', 'start');
    s += TT(896, 160, 28, C.ink, '--', 'start', 'tGear');
    s += '<g data-k="limitSign"><circle cx="960" cy="380" r="30" fill="#f7fcff" stroke="#dd3d49" stroke-width="7"/><text data-k="tLimit" x="960" y="388" text-anchor="middle" font-size="26" font-weight="700" fill="#101820">90</text></g>';
    s += ICO('tipper', 956, 56, 32, C.bgray);

    // ---- left: brake circuits 1, 2, P with pressure bar and scale track ----
    for (let i = 0; i < 3; i += 1) {
      const y = 201 + i * 51, ty = 221 + i * 51;
      s += ICO('ring', 64, y, 34, C.bgray) + TT(81, y + 23, 16, C.bgray, ['1', '2', 'P'][i], 'middle');
      s += RECT(111, ty, 87, 4, C.line) + (i < 2 ? RECT(204, ty, 87, 4, 'var(--accent)') : RECT(204, ty, 42, 4, 'var(--accent)') + RECT(252, ty, 39, 4, C.line));
      s += RECT(111, 212 + i * 51, 0, 4, 'var(--accent)', 'air' + i);
    }
    // ---- right: consumption ----
    s += ICO('fuel', 1153, 179, 44, C.bgray) + AVGT(1153, 179, 44, C.bgray);
    s += VU(1202, 213, 22, 18, C.bgray, 'tAvg', ' l/100km', 'start', 3);
    s += ICO('fuelIns', 1156, 258, 30, C.bgray);
    s += VU(1195, 285, 22, 18, C.bgray, 'tIns', ' l/h', 'start', 3);
    s += RECT(1152, 306, 228, 4, C.line) + RECT(1152, 297, 0, 4, 'var(--accent)', 'insBar');

    // ---- bottom row on the bottom edge: fuel + range, clock, temperature, T1, AdBlue ----
    s += '<g data-k="fuelIc">' + ICO('fuel', 40, 501, 30, C.ink) + '</g>';
    s += RECT(77, 522, 14, 3, C.track) + RECT(97, 522, 50, 3, C.track) + RECT(153, 522, 70, 3, C.track) + RECT(77, 513, 0, 4, 'var(--accent)', 'fuelBar');
    s += ICO('range', 231, 501, 30, 'var(--accent)');
    s += VU(269, 527, 27, 21, C.ink, 'tRange', ' km');
    s += TT(543, 527, 27, C.ink, '--:--', 'end', 'tClock');
    s += TT(967, 527, 27, C.ink, '-- °C', 'end', 'tAmb');
    s += '<text x="1088" y="' + f1(Y(527 - 9) + 9 * G) + '" font-size="' + f1(25 * G) + '" font-weight="700" fill="' + C.ink + '">T<tspan font-size="' + f1(17 * G) + '" dy="' + f1(3 * G) + '">1</tspan></text>';
    s += VU(1262, 527, 25, 19, C.ink, 'tTrip', '.0 km', 'end');
    s += TT(1276, 515, 15, C.ink, 'Ad', 'start', '', ' font-weight="700"') + TT(1276, 531, 15, C.ink, 'Blue', 'start', '', ' font-weight="700"') +
      '<path transform="translate(1300 ' + f1(Y(511)) + ') scale(' + G + ')" d="M0 -6c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8z" fill="#4b8cf0"/>';
    s += RECT(1313, 522, 10, 3, C.track) + RECT(1329, 522, 76, 3, C.track) + RECT(1313, 514, 0, 4, 'var(--accent)', 'adBar');

    // ---- on-board computer: isolated group below the speed read-out ----
    // They sit on their own display: a dark, slightly see-through panel that hides the road lines behind the
    // data. Type and colours are the reference's (ink #ccdbf0 values, gray #727b86 units/labels), no bright green.
    // value in ink + unit in gray on one baseline
    const VV = (x, b, vs, us, k, unit, a, udy) => '<text x="' + x + '" y="' + f1(Y(b - 0.35 * vs) + 0.35 * vs * G) + '"' + (a && a !== 'start' ? ' text-anchor="' + a + '"' : '') +
      ' fill="' + C.ink + '"><tspan data-k="' + k + '" font-size="' + f1(vs * G) + '">--</tspan><tspan fill="' + C.gray + '" font-size="' + f1(us * G) + '" dy="' + f1((udy || 2) * G) + '">' + unit + '</tspan></text>';
    s += '<g data-k="obd" transform="translate(0 ' + f1(64 * KY) + ')">';
    const title = (str) => TT(720, 186, 20, C.ink, str, 'middle');
    const lbl = (x, b, str) => TT(x, b, 15, C.gray, str);
    const row = (ic, label, b, k, unit) => ICO(ic, 556, b - 21, 26, C.bgray) + TT(594, b - 4, 15, C.gray, label, 'start', '', ' font-weight="700"') + VV(884, b, 30, 16, k, unit, 'end');
    // 1: default - gear and odometer
    s += '<g data-k="pg0">' + title('ODOMETER') + TT(720, 252, 58, C.ink, '--', 'middle', 's0g') +
      TT(720, 286, 23, C.gray, '-- km', 'middle', 's0o') + '</g>';
    // 2: pressure - brake circuits 1 and 2, engine oil; eight segments each on a 0..12 bar scale
    s += '<g data-k="pg1">' + title('Pressure');
    for (let i = 0; i < 3; i += 1) {
      const yc = 214 + i * 34;
      s += i < 2 ? ICO('ring', 554, yc - 15, 30, C.bgray) + TT(569, yc + 5, 14, C.bgray, String(i + 1), 'middle') : ICO('oil', 554, yc - 15, 30, C.bgray);
      for (let j = 0; j < 8; j += 1) {
        s += '<rect data-k="pr' + i + '_' + j + '" x="' + (600 + j * 34) + '" y="' + f1(Y(yc - 6)) + '" width="28" height="' + f1(12 * KY) + '" rx="2" fill="' + C.seg + '"/>';
      }
      s += RECT(600, yc + 11, 266, 2, '#3a424d');
    }
    s += TT(554, 288, 14, C.gray, 'bar') + TT(600, 288, 14, C.gray, '0') + TT(866, 288, 14, C.gray, '12', 'end') + '</g>';
    // 3: temperatures - coolant and oil
    s += '<g data-k="pg2">' + title('Temperatures') + lbl(566, 244, 'WATER') + VV(884, 244, 28, 18, 's2w', ' °C', 'end') +
      lbl(566, 282, 'OIL') + VV(884, 282, 28, 18, 's2o', ' °C', 'end') + '</g>';
    // 4: cruise control - live set speed only; the game provides no ACC-distance map
    s += '<g data-k="pg3">' + title('Cruise Control') + ICO('cruise', 650, 224, 36, C.bgray) +
      TT(720, 256, 38, C.ink, '0', 'middle', 's3v') + TT(720, 283, 17, C.gray, 'km/h', 'middle') + '</g>';
    // 5: fuel & distance - litres in the tank, range
    s += '<g data-k="pg4">' + title('Fuel & Distance') + row('fuel', 'FUEL', 244, 's4f', ' l') + row('range', 'RANGE', 282, 's4r', ' km') + '</g>';
    // 6: consumption - average and instantaneous
    s += '<g data-k="pg5">' + title('Consumption') + row('fuel', 'AVG', 244, 's5a', ' l/100km') + row('fuelIns', 'INST', 282, 's5i', ' l/hr') + '</g>';
    s += '</g>';   // OBD group
    s += '</g>';   // all
    return s;
  }

  // ---- Per-node state & animation loop -------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sc25_' + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sc25_' + k, String(v)); } catch (e) { /* storage blocked: keep in memory only */ } },
  };

  function mount(node, w) {
    setGeom(w && w.mode);
    node.innerHTML = '<svg viewBox="0 0 1440 ' + H + '" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Scania instrument cluster" style="width:100%;height:100%;display:block">' + markup() + '</svg>';
    const svg = node.firstChild;
    const q = {};
    const el = (k) => q[k] || (q[k] = svg.querySelector('[data-k="' + k + '"]'));
    const setT = (k, v) => { const e = el(k); if (e && e.textContent !== v) e.textContent = v; };
    const setW = (k, px) => { const e = el(k); const v = Math.max(0, px).toFixed(1); if (e && e.getAttribute('width') !== v) e.setAttribute('width', v); };
    const show = (k, on) => { const e = el(k); if (e) e.style.display = on ? '' : 'none'; };
    const spdTicks = Array.from(svg.querySelectorAll('[data-k="spdTicks"] path'));
    const rpmTicks = Array.from(svg.querySelectorAll('[data-k="rpmTicks"] path'));
    const segs = [0, 1, 2].map((i) => Array.from({ length: 8 }, (_, j) => svg.querySelector('[data-k="pr' + i + '_' + j + '"]')));

    const st = {
      page: clamp(parseInt(store.get('page', '0'), 10) || 0, 0, NS_PAGES - 1),
      theme: 'blue', mode: 'on', modeAt: 0, power: 1, curSpd: 0, curRpm: 0, wasDead: null,
    };

    function applyTheme() {
      // Stored layouts can outlive the available palette. Resolve legacy/unknown IDs before
      // touching theme fields so an old preference can never crash the dashboard.
      const fallback = THEMES.blue ? 'blue' : THEME_KEYS[0];
      if (!THEMES[st.theme]) st.theme = fallback;
      const th = THEMES[st.theme];
      if (!th || !th.accent || !th.glow || !th.speed) return;
      const host = document.getElementById('panel') || node;   // the background shares the backlight colour
      host.style.setProperty('--accent', th.accent);
      host.style.setProperty('--glow', th.glow);
      host.style.setProperty('--blinkc', th.accent);
      // Put the variables directly on this SVG too: WebView SVG presentation attributes
      // can otherwise keep the inherited value when the parent panel changes themes.
      svg.style.setProperty('--accent', th.accent);
      svg.style.setProperty('--glow', th.glow);
      svg.style.setProperty('--blinkc', th.accent);
      const sp = el('tSpd'); if (sp) sp.setAttribute('fill', th.speed);
    }
    applyTheme(); bindKeys();

    // Screens change only with the game's own "dashboard display modes" button (app.js -> step). No touch.
    node._sc25 = {
      go(n) { st.page = clamp(n, 0, NS_PAGES - 1); store.set('page', st.page); },
      step(d) { st.page = (st.page + d + NS_PAGES) % NS_PAGES; store.set('page', st.page); },
      setTheme(k) {
        const next = THEMES[k] ? k : (THEMES.blue ? 'blue' : THEME_KEYS[0]);
        if (!next) return;
        if (next !== st.theme) { st.theme = next; applyTheme(); }
      },
    };

    // trip meter (T1): the game gives no trip figure, so count from the odometer. Kept on this device.
    function tripKm(odo) {
      let base = parseFloat(store.get('tripBase', 'NaN'));
      if (!Number.isFinite(base) || odo < base) { base = odo; store.set('tripBase', base); }
      return odo - base;
    }
    // Substantial internal ribbons follow the outer edge of each angled scale; the live-value tip glows strongest.
    const ribbon = (ax, ym, inset, width) => {
      const yb = 427.3, yt = clamp(ym, 57, yb);
      const xb = ax(yb) + inset, xt = ax(yt) + inset;
      return 'M' + f1(xb) + ' ' + f1(Y(yb)) + 'L' + f1(xt) + ' ' + f1(Y(yt)) + 'L' + f1(xt + width) + ' ' + f1(Y(yt)) + 'L' + f1(xb + width) + ' ' + f1(Y(yb)) + 'z';
    };

    function frame(ts) {
      if (!node.isConnected) return;                 // panel redrawn: this copy is gone, stop
      requestAnimationFrame(frame);
      const cx = (SC25.ctx && SC25.ctx()) || { dead: false, t: null, gear: '--' };
      const rawTel = firstObj(cx.t, cx.tel, cx.telemetry, cx.data);
      const dead = !!cx.dead, t = (!dead && rawTel) ? normalizeTel(rawTel) : null;
      if (cx.theme) node._sc25.setTheme(cx.theme);

      // ignition: boot sweep when the electrics come on, fade-out when they go off
      if (st.wasDead === null) { st.mode = dead ? 'off' : 'on'; st.power = dead ? 0 : 1; }
      else if (dead !== st.wasDead) { st.mode = dead ? 'shutdown' : 'boot'; st.modeAt = ts; }
      st.wasDead = dead;
      let tgtSpd = t ? Math.abs(t.speed) * 3.6 : 0, tgtRpm = t ? t.rpm : 0, selfTest = false;
      if (st.mode === 'boot') {
        const k = (ts - st.modeAt) / 1000;
        st.power = clamp(k / 0.5, 0, 1);
        const sw = k < 2.4 ? Math.sin(clamp(k / 2.4, 0, 1) * Math.PI) : 0;
        tgtSpd = Math.max(tgtSpd, sw * 200); tgtRpm = Math.max(tgtRpm, sw * 2500); selfTest = k < 2.2;
        if (k >= 2.5) st.mode = 'on';
      } else if (st.mode === 'shutdown') {
        const k = (ts - st.modeAt) / 1000;
        tgtSpd = 0; tgtRpm = 0; st.power = clamp(1 - Math.max(0, k - 0.6) / 0.6, 0, 1);
        if (k >= 1.3) st.mode = 'off';
      } else if (st.mode === 'off') { tgtSpd = 0; tgtRpm = 0; st.power = 0; }
      else st.power = 1;
      st.curSpd += (tgtSpd - st.curSpd) * 0.2;
      st.curRpm += (tgtRpm - st.curRpm) * 0.2;
      el('all').style.opacity = st.power.toFixed(2);
      if (st.power === 0) return;

      // Scales: bold cyan ribbons; ticks above the current value are dimmed.
      const ySp = sy(clamp(st.curSpd, 0, 205)), yRp = ry(clamp(st.curRpm, 0, 2550));
      el('spdFill').setAttribute('d', ribbon(sAx, ySp, -2, -12 * G));
      el('rpmFill').setAttribute('d', ribbon(rAx, yRp, 2, 12 * G));
      const vS = st.curSpd, vR = st.curRpm;
      spdTicks.forEach((p) => { const o = (+p.dataset.v <= vS + 0.5) ? '1' : '.45'; if (p.getAttribute('opacity') !== o) p.setAttribute('opacity', o); });
      rpmTicks.forEach((p) => { const o = (+p.dataset.v <= vR + 10) ? '1' : '.45'; if (p.getAttribute('opacity') !== o) p.setAttribute('opacity', o); });

      // Warning lamps remain visible for real faults; no warm glow is painted into the background.
      const lowAir = !!(t && (t.airWarn !== undefined ? t.airWarn : t.air < 65));
      const engFault = !!(t && (t.dmgTruck >= 10 || t.oilWarn || t.waterWarn));
      const lp = t ? { beam: t.high, park: t.park, lowp: lowAir, ret: t.retarder > 0, bl: t.blinkL, br: t.blinkR, eng: engFault, diff: t.diff } : {};
      ['beam', 'park', 'lowp', 'ret', 'bl', 'br', 'eng', 'diff'].forEach((k) => { el('lp_' + k).setAttribute('opacity', (lp[k] || selfTest) ? 1 : 0); });
      // always-on read-outs
      const spd = Math.round(st.curSpd);
      setT('tSpd', String(spd));
      setT('tLimit', t && t.limit > 0.3 ? String(Math.round(t.limit * 3.6)) : '90');
      show('limitSign', !dead);
      const ccOn = !!(t && (t.cruiseOn !== undefined ? t.cruiseOn : t.cruise > 0.3));
      const cc = ccOn ? String(Math.round(t.cruise * 3.6)) : '--';
      el('ccG').setAttribute('opacity', ccOn ? 1 : 0); setT('tCC', cc);
      const gear = t ? cx.gear : '--';
      setT('tGear', gear);
      const airBar = t ? t.air / 14.5038 : 0;                                 // telemetry reports psi
      const oilBar = t ? t.oilP / 14.5038 : 0;
      for (let i = 0; i < 3; i += 1) { setW('air' + i, 180 * clamp(airBar / 12, 0, 1)); el('air' + i).style.fill = lowAir ? C.amber : 'var(--accent)'; }
      const avg = t && t.fuelAvg > 0 ? (t.fuelAvg * 100).toFixed(1) : '--';   // l/km -> l/100km
      setT('tAvg', avg); setT('tIns', '--');                                   // no instantaneous consumption in the telemetry
      const fuelFrac = t && t.fuelCap > 0 ? clamp(t.fuel / t.fuelCap, 0, 1) : 0;
      const adFrac = t && t.adblueCap > 0 ? clamp(t.adblue / t.adblueCap, 0, 1) : 0;
      setW('fuelBar', 146 * fuelFrac); setW('adBar', 92 * adFrac);
      const lowFuel = !!(t && (t.fuelWarn || fuelFrac < 0.12));
      el('fuelIc').firstChild.style.stroke = lowFuel ? C.amber : C.ink;
      setT('tRange', t ? String(Math.round(t.range)) : '----');
      let clock = '--:--';
      if (t && t.time != null) { const cm = Math.floor(t.time) % 1440; clock = String(Math.floor(cm / 60)).padStart(2, '0') + ':' + String(cm % 60).padStart(2, '0'); }
      setT('tClock', clock);
      setT('tAmb', '-- °C');                                              // no outside temperature in the telemetry
      const trip = t && t.odo != null ? tripKm(t.odo) : null;
      setT('tTrip', trip != null ? String(Math.floor(trip)) : '-----');

      // on-board computer screen
      for (let i = 0; i < NS_PAGES; i += 1) show('pg' + i, i === st.page);
      if (st.page === 0) {
        setT('s0g', gear); setT('s0o', t && t.odo != null ? Math.floor(t.odo).toLocaleString('en-US').replace(/,/g, ' ') : '--');
      } else if (st.page === 1) {
        const lit = [airBar, airBar, oilBar].map((b) => Math.round(clamp(b / 12, 0, 1) * 8));
        const activeSegment = getComputedStyle(svg).getPropertyValue('--accent').trim() || C.segOn;
        segs.forEach((row, i) => row.forEach((r, j) => { const f = j < lit[i] ? activeSegment : C.seg; if (r.getAttribute('fill') !== f) r.setAttribute('fill', f); }));
      } else if (st.page === 2) {
        setT('s2w', t ? String(Math.round(t.waterT)) : '--'); setT('s2o', t ? String(Math.round(t.oilT)) : '--');
      } else if (st.page === 3) {
        setT('s3v', ccOn ? cc : '0');
      } else if (st.page === 4) {
        setT('s4f', t ? String(Math.round(t.fuel)) : '--'); setT('s4r', t ? String(Math.round(t.range)) : '--');
      } else if (st.page === 5) {
        setT('s5a', avg); setT('s5i', '--');
      }
    }
    requestAnimationFrame(frame);
  }

  // Background: one continuous black piece behind the keys and cluster, with a faint road perspective.
  function bgMarkup() {
    return '<rect width="1000" height="1000" fill="#020609"/>' +
      '<defs><linearGradient id="s25BgRoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#77919b" stop-opacity="0"/><stop offset=".55" stop-color="#77919b" stop-opacity=".025"/><stop offset="1" stop-color="#77919b" stop-opacity=".12"/></linearGradient></defs>' +
      '<g fill="none" stroke="url(#s25BgRoad)" stroke-width="1.4"><path d="M500 570L0 1000M500 570L1000 1000"/></g>';
  }
  function mountBg(node) {
    node.innerHTML = '<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" style="width:100%;height:100%;display:block">' + bgMarkup() + '</svg>';
  }
  // Keyboard fallback: when the game's dashboard-display key is a keyboard key and this page has the focus
  let keyBound = false;
  function bindKeys() {
    if (keyBound) return; keyBound = true;
    window.addEventListener('keydown', (ev) => {
      const cx = SC25.ctx && SC25.ctx(); const k = cx && cx.dashKeys; if (!k || !k.length) return;
      const main = k[k.length - 1], mods = k.slice(0, -1);
      if (String(ev.key).toLowerCase() !== main) return;
      if (mods.includes('ctrl') !== ev.ctrlKey || mods.includes('shift') !== ev.shiftKey || mods.includes('alt') !== ev.altKey) return;
      document.querySelectorAll('.k-sc25').forEach((n) => n._sc25 && n._sc25.step(1));
    });
  }

  const SC25 = { mount, mountBg, bindKeys, ctx: null, THEMES: THEMES, THEME_KEYS: THEME_KEYS, SCANIA_THEME_KEYS: SCANIA_THEME_KEYS };
  return SC25;
}());

// ---- Panel definition ----------------------------------------------------------------------------
// One continuous background ('sc25bg') and the locked cluster. Landscape: ALL keys in ONE row on the top edge:
//   [music: prev, play, next]   [Start/Stop, Park brake] [Left, HAZARD, Right] [Lights, High beam, Beacon, Air horn]
//   [Wipers, Wipers off] [Trailer, Trailer brake, Mirrors]   [Save, Map, Enter]
// The truck keys are 20 % smaller than before; the music and system keys are bare symbols ('mini').
// The cluster keeps the reference proportions and sits on the bottom edge; the clock is centred under the keys.
(function () {
  const K = (k, fn, id, label) => ({ t: 'kbd', k: k, fn: fn, id: id, label: label });
  const F = {
    g1: ['engine', 'parking_brake'],
    g2: ['blinker_left', 'hazard', 'blinker_right'],
    g3: ['lights', 'high_beam', 'beacon', 'air_horn'],
    g4: ['wipers', 'wipers_back'],
    g5: ['trailer_attach', 'trailer_brake', 'mirrors'],
  };
  // visual subtype per function: hazard=triangle, round=ignition accent, rest=rocker
  const kind = (fn) => fn === 'hazard' ? 'hazard' : fn === 'engine' || fn === 'electrics' ? 'round' : 'rocker';
  // lay families out from x0: keys w x h, `gap` inside a family, `famGap` between families
  function run(fams, x0, y, w, h, gap, famGap, tag, extra) {
    let x = x0; const out = [];
    fams.forEach((f) => {
      f.forEach((fn, i) => {
        const o = K(kind(fn), fn, 'k' + tag + '_' + out.length); o.r = [+x.toFixed(2), y, w, h]; if (extra) Object.assign(o, extra); out.push(o);
        x += w + (i < f.length - 1 ? gap : 0);
      });
      x += famGap;
    });
    return out;
  }
  function stack(fns, x, y, w, h, gap, tag, extra) {
    return fns.map((fn, i) => Object.assign(K('rocker', fn, 'k' + tag + '_' + i), { r:[x, y + i * (h + gap), w, h] }, extra || {}));
  }
  const width = (fams, w, gap, famGap) => fams.reduce((a, f) => a + f.length * w + (f.length - 1) * gap, 0) + (fams.length - 1) * famGap;
  const BG = { t: 'sc25bg', r: [0, 0, 100, 100], id: 'sc25bg' };
  const MEDIA = [['media_prev', 'media_play', 'media_next']];
  const QUICK = [['hazard', 'parking_brake', 'lights', 'air_horn', 'wipers']];
  const TRUCK = [F.g1, F.g2, F.g3, F.g4, F.g5];
  // landscape row: truck keys 3.9 x 5.4 (20 % under the previous 4.9 x 6.8), symbols 3.0 wide
  const KW = 3.9, KH = 5.4, KY = 0.9, KG = 0.25, FG = 1.0, MW = 3.0, MG = 0.4;
  const truckW = width(TRUCK, KW, KG, FG);
  SKINS.scania25_frame = {
    T: { ar: 1.792, frame: 1, w: [BG, { t: 'sc25', mode: 'wide', r: [0, 0, 100, 100], id: 'sc25' }]
      .concat(run(MEDIA, 1.0, KY, MW, KH, MG, 0, 'm', { mini: 1 }),
              run(TRUCK, (100 - truckW) / 2, KY, KW, KH, KG, FG, 'a'),
              [{t:'sc25palette',r:[89.2,KY+1.5,1.2,2.4],id:'sc25_palette'}],
              run([['quick_save']], 90.8, KY, 2.4, KH, 0, 0, 's0', { mini: 1 }),
              run([['world_map']], 93.6, KY, 2.4, KH, 0, 0, 's1', { mini: 1 }),
              run([['activate']], 96.4, KY, 2.4, KH, 0, 0, 's2', { mini: 1 })) },
    // Portrait: SC25 digital cluster (top 35%) + clocks + full button box.
    // The cluster uses mode:'wide' (1440×804 viewBox) which nearly matches the
    // portrait container aspect at 100% width × 35% height — the SVG fills the
    // zone edge to edge. xMidYMax meet keeps gauges anchored to the bottom edge.
    P: { ar: 0.625, frame: 1, w: [
      // ── SC25 digital cluster (top ~35%) ──
      { t: 'sc25', mode: 'wide', r: [0, 0, 100, 35], id: 'sc25' },
      // ── status bar overlay (sits on the dark TOPY gap of the cluster) ──
      // Damage + trip on one full-width strip. The decorative 'TRUCKDECK • ETS2'
      // plate was dropped: it carried no data and crowded the trip sentence.
      { t:'status', r:[2,0.8,96,3.5], id:'box_status' },
      // ── palette picker (bottom-right of cluster zone) ──
      { t:'sc25palette', r:[91,30.5,7,3.5], id:'sc25_palette' },
      // ═══ BUTTON BOX — 5-row grid (clocks removed — SC25 cluster has its own) ═══
      // Cluster ends at 35%. Buttons fill 37%–91% with even spacing.

      // ── Row 1 (y=37 h=6): Small horizontal — Audio | Cameras | Actions ──
      ...run([['media_prev','media_play','media_next'],
              ['cam_prev','cam_interior','cam_next'],
              ['quick_save','world_map','activate']],
             3.5, 37, 9, 6, 0.8, 3.6, 'box_r1', {wide:1}),

      // ── Row 2 (y=45 h=13): Portrait — Wipers | Signals | Lights ──
      ...run([['wipers','wipers_back']], 3.5, 45, 11, 13, 1.5, 0, 'box_r2a'),
      Object.assign(K('rocker','blinker_left','box_blink_l',''),{r:[32,45,11,13]}),
      Object.assign(K('hazard','hazard','box_hazard',''),{r:[44.5,45,11,13]}),
      Object.assign(K('rocker','blinker_right','box_blink_r',''),{r:[57,45,11,13]}),
      ...run([['lights','high_beam']], 73, 45, 11, 13, 1.5, 0, 'box_r2c'),

      // ── Row 3 (y=60 h=7): Symmetric — Engine Brake | Cruise | Trailer ──
      ...run([['engine_brake_toggle','cruise','trailer_attach','trailer_brake','emergency_brake']],
             3.5, 60, 15, 7, 4.5, 0, 'box_r3'),

      // ── Row 4 (y=69 h=7): Horizontal — Truck Susp | Mirrors/Assist | Trailer Susp ──
      ...run([['susp_front_up','susp_front_down'],
              ['mirrors','lane_assist','beacon'],
              ['susp_rear_up','susp_rear_down']],
             3.5, 69, 11, 7, 1.5, 5, 'box_r4', {wide:1}),

      // ── Row 5 (y=78 h=13): Footer — Window L | Ignition + Handbrake | Window R ──
      Object.assign(K('rocker','window_left_down','box_win_l',''),{r:[3.5,78,14,13]}),
      Object.assign(K('round','electrics','box_ignition','IGNITION'),{r:[34,78,14,13]}),
      Object.assign(K('rocker','parking_brake','box_park',''),{r:[52,78,14,13]}),
      Object.assign(K('rocker','window_right_down','box_win_r',''),{r:[82.5,78,14,13]}),
    ] },
  };
}());

