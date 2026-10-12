// Hunters Truck Sim Button Box - PC bridge: runs on the gaming PC, zero npm dependencies.
//
//   tablet/phone browser  --HTTP-->  this server  --stdin-->  PowerShell/C# helper  --> game
//                         <--SSE---               <--stdout--  (telemetry)
//
// Plain HTTP + Server-Sent Events instead of WebSocket: both are built into Node and into
// every browser, so there is nothing to install and nothing to compile on the PC.
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.TRUCKDECK_PORT) || 8765;
// When packaged into a single .exe (pkg / Node SEA), __dirname is a virtual path INSIDE the
// binary, so public/, data/ and the PowerShell helper must be found next to the executable
// instead. Plain `node bridge/server.js` keeps the old repo-relative layout unchanged.
let PACKAGED = !!process.pkg;                       // pkg sets process.pkg
if (!PACKAGED) { try { PACKAGED = require('node:sea').isSea(); } catch (e) { /* older node: not packaged */ } }
const ROOT = PACKAGED ? path.dirname(process.execPath) : path.join(__dirname, '..');
const HELPER_DIR = PACKAGED ? path.dirname(process.execPath) : __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const LAYOUTS_FILE = path.join(DATA_DIR, 'layouts.json');

// How long a tapped key stays down. Games poll input once per frame, so anything shorter
// than ~2 frames at low fps can be missed.
const TAP_MS = 70;
// A held key (horn, engine brake...) is force-released after this long without an "up",
// so a tablet that drops off Wi-Fi mid-press cannot leave a key stuck in the game.
const HOLD_TIMEOUT_MS = 15000;

// ---- Key table --------------------------------------------------------------------------
// name -> [set-1 scancode, extended flag]. This doubles as the whitelist: the API can only
// ever press keys listed here.
const KEYS = {
  esc: [0x01, 0], 1: [0x02, 0], 2: [0x03, 0], 3: [0x04, 0], 4: [0x05, 0], 5: [0x06, 0],
  6: [0x07, 0], 7: [0x08, 0], 8: [0x09, 0], 9: [0x0a, 0], 0: [0x0b, 0],
  '-': [0x0c, 0], '=': [0x0d, 0], backspace: [0x0e, 0], tab: [0x0f, 0],
  q: [0x10, 0], w: [0x11, 0], e: [0x12, 0], r: [0x13, 0], t: [0x14, 0], y: [0x15, 0],
  u: [0x16, 0], i: [0x17, 0], o: [0x18, 0], p: [0x19, 0], '[': [0x1a, 0], ']': [0x1b, 0],
  enter: [0x1c, 0], ctrl: [0x1d, 0],
  a: [0x1e, 0], s: [0x1f, 0], d: [0x20, 0], f: [0x21, 0], g: [0x22, 0], h: [0x23, 0],
  j: [0x24, 0], k: [0x25, 0], l: [0x26, 0], ';': [0x27, 0], "'": [0x28, 0], '`': [0x29, 0],
  shift: [0x2a, 0], '\\': [0x2b, 0],
  z: [0x2c, 0], x: [0x2d, 0], c: [0x2e, 0], v: [0x2f, 0], b: [0x30, 0], n: [0x31, 0],
  m: [0x32, 0], ',': [0x33, 0], '.': [0x34, 0], '/': [0x35, 0],
  'num*': [0x37, 0], alt: [0x38, 0], space: [0x39, 0],
  f1: [0x3b, 0], f2: [0x3c, 0], f3: [0x3d, 0], f4: [0x3e, 0], f5: [0x3f, 0], f6: [0x40, 0],
  f7: [0x41, 0], f8: [0x42, 0], f9: [0x43, 0], f10: [0x44, 0], f11: [0x57, 0], f12: [0x58, 0],
  scrolllock: [0x46, 0],
  num7: [0x47, 0], num8: [0x48, 0], num9: [0x49, 0], 'num-': [0x4a, 0],
  num4: [0x4b, 0], num5: [0x4c, 0], num6: [0x4d, 0], 'num+': [0x4e, 0],
  num1: [0x4f, 0], num2: [0x50, 0], num3: [0x51, 0], num0: [0x52, 0], 'num.': [0x53, 0],
  // "extended" keys share a scancode with a numpad key and are told apart by the E0 prefix
  'num/': [0x35, 1], numenter: [0x1c, 1], rctrl: [0x1d, 1], ralt: [0x38, 1],
  home: [0x47, 1], up: [0x48, 1], pgup: [0x49, 1], left: [0x4b, 1], right: [0x4d, 1],
  end: [0x4f, 1], down: [0x50, 1], pgdn: [0x51, 1], insert: [0x52, 1], delete: [0x53, 1],
  // flag 2 = Windows virtual-key code instead of a scancode. Media and volume keys are
  // handled by Windows itself, whatever window has focus.
  media_prev: [0xb1, 2], media_next: [0xb0, 2], media_play: [0xb3, 2],
  vol_mute: [0xad, 2], vol_down: [0xae, 2], vol_up: [0xaf, 2],
};

// ---- Config (PIN) -----------------------------------------------------------------------
fs.mkdirSync(DATA_DIR, { recursive: true });

// Diagnostic log (data/bridge.log): every key the app sends and every change of the wiper telemetry,
// with a time stamp, so "I press it and nothing happens" can be traced afterwards. Trimmed at 256 KB.
const LOG_FILE = path.join(DATA_DIR, 'bridge.log');
try { if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 262144) fs.writeFileSync(LOG_FILE, ''); } catch (e) { /* ignore */ }
function diag(line) {
  try { fs.appendFileSync(LOG_FILE, new Date().toISOString().slice(11, 23) + '  ' + line + '\n'); } catch (e) { /* ignore */ }
}
diag('--- bridge started ---');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

// The PIN is generated once and reused, so the URL saved on the tablet keeps working.
// It exists because this server types on the PC: without it, anything on the network
// (or any web page open on the PC) could press keys.
const config = readJson(CONFIG_FILE, {});
if (!/^\d{4}$/.test(config.pin || '')) {
  config.pin = String(Math.floor(1000 + Math.random() * 9000));
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ---- Input helper process ---------------------------------------------------------------
let helper = null;
let helperReady = false;
let lastTelemetry = { type: 'tel', sdk: false };
let lastMedia = { type: 'media', running: false, playing: false, artist: '', track: '' };
let lastHelperError = '';
const sseClients = new Set();
const SUPPORTED_PLUGIN_REV = 12;
const badPins = new Map(); // device address -> { count, first, until }

let warnedRev = false;

// ---- Dashboard display sync ----------------------------------------------------------------------
// The SCS telemetry SDK has no channel for the dashboard screen the player is looking at, so the cluster
// follows the player's own binding instead: the bridge reads the game's controls.sii (newest profile of
// ETS2/ATS), finds what is bound to the "display" action (in-game: "Dashboard display modes") and marks
// every controller press that matches it. Both sides then advance on the same physical press.
// controls.sii names a DirectInput device as di8.'{instance}|{PPPPVVVV-0000-0000-0000-504944564944}'
// (product id, vendor id) and its buttons as <dev>.bN, counted from 1 (winmm counts from 0).
let dashBind = { file: '', mtime: 0, list: [] };   // list: [{ vid, pid, btn }]
const padDevs = new Map();
let lastDashPressAt = 0;

// ---- GPS picture for the cluster's map screen ------------------------------------------------------
// The telemetry SDK carries no map and no route, so the map screen shows the game's OWN navigation screen:
// the helper grabs that region of the game window (PrintWindow, or a screen copy while the game is in front)
// and returns a JPEG. One grab at a time; a request that finds the helper busy gets 204 and simply retries.
const pendingFrames = new Map();   // id -> resolve
let frameSeq = 0;
function grabFrame(x, y, w, h, maxW) {
  return new Promise((resolve) => {
    if (!helper || !helperReady) { resolve({ error: 'nohelper' }); return; }
    const id = String(++frameSeq % 1000000);
    const timer = setTimeout(() => { pendingFrames.delete(id); resolve({ error: 'timeout' }); }, 2500);
    pendingFrames.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
    helper.stdin.write('c ' + id + ' ' + x + ' ' + y + ' ' + w + ' ' + h + ' ' + maxW + '\n');
  });
}                          // winmm id -> { vid, pid, name }

function controlsCandidates() {
  const home = process.env.USERPROFILE || os.homedir();
  const docs = [process.env.TRUCKDECK_DOCS, path.join(home, 'Documents'), path.join(home, 'OneDrive', 'Documents'),
    path.join(home, 'OneDrive', 'Documentos'), path.join(home, 'Documentos')].filter(Boolean);
  const out = [];
  for (const d of docs) for (const game of ['Euro Truck Simulator 2', 'American Truck Simulator']) {
    for (const kind of ['steam_profiles', 'profiles']) {
      const base = path.join(d, game, kind);
      let dirs = [];
      try { dirs = fs.readdirSync(base); } catch (e) { continue; }
      for (const prof of dirs) {
        const f = path.join(base, prof, 'controls.sii');
        try { out.push({ f, m: fs.statSync(f).mtimeMs }); } catch (e) { /* profile without controls */ }
      }
    }
  }
  return out.sort((a, b) => b.m - a.m);   // the profile saved last is the one being played
}

function loadDashBinding(force) {
  const c = controlsCandidates()[0];
  if (!c) { if (force) console.log('[dash] No controls.sii found; use "Learn a controller button" in the app menu.'); return; }
  if (!force && c.f === dashBind.file && c.m === dashBind.mtime) return;
  let txt = '';
  try { txt = fs.readFileSync(c.f, 'utf8'); } catch (e) { return; }
  dashBind = { file: c.f, mtime: c.m, list: [] };
  if (!txt.startsWith('SiiNunit')) { console.log('[dash] ' + c.f + ' is encoded; use "Learn a controller button" in the app menu.'); return; }
  const devs = {};
  const reDev = /"device (\w+) `di8\.'\{[^}]*\}\|\{([0-9A-Fa-f]{4})([0-9A-Fa-f]{4})-/g;
  let m;
  while ((m = reDev.exec(txt))) devs[m[1]] = { pid: parseInt(m[2], 16), vid: parseInt(m[3], 16) };
  const line = /"mix display `([^`]*)`"/.exec(txt);
  if (line) {
    const reBtn = /\b(\w+)\.b(\d+)\b/g;
    while ((m = reBtn.exec(line[1]))) {
      const d = devs[m[1]];
      if (d) dashBind.list.push({ vid: d.vid, pid: d.pid, btn: Number(m[2]) - 1 });
    }
  }
  if (dashBind.list.length) {
    console.log('[dash] "Dashboard display modes" is on ' + dashBind.list.map((b) => 'controller ' + b.vid.toString(16).padStart(4, '0') + ':' +
      b.pid.toString(16).padStart(4, '0') + ' button ' + (b.btn + 1)).join(', ') + ' (' + c.f + '). The cluster follows it.');
  } else {
    console.log('[dash] "Dashboard display modes" is not bound to a controller button in ' + c.f + '.');
  }
}

// true when this winmm press is the game's dashboard-display button
function isDashPress(msg) {
  loadDashBinding(false);   // cheap stat; re-parses only when the player changed their controls
  return dashBind.list.some((b) => {
    if (b.btn !== msg.btn) return false;
    if (b.vid === msg.vid && b.pid === msg.pid) return true;
    // some drivers report a generic id through winmm: then accept the button if no device carries the bound id
    const known = [...padDevs.values()].some((d) => d.vid === b.vid && d.pid === b.pid);
    return !known;
  });
}

function broadcast(obj) {
  const line = 'data: ' + JSON.stringify(obj) + '\n\n';
  for (const res of sseClients) res.write(line);
}

function startHelper() {
  loadDashBinding(true);
  if (process.platform !== 'win32') {
    // Lets the server run on any OS for layout editing / development; keys are only logged.
    console.log('[input] Not on Windows: key presses will be logged, not sent.');
    return;
  }
  helper = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', path.join(HELPER_DIR, 'input-helper.ps1'),
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let buffer = '';
  helper.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('{')) continue;
      let msg;
      try { msg = JSON.parse(line); } catch (e) { continue; }
      if (msg.type === 'media') {
        lastMedia = msg;
        broadcast(msg);
      } else if (msg.type === 'frame') {
        const done = pendingFrames.get(msg.id);
        if (done) { pendingFrames.delete(msg.id); done(msg); }
      } else if (msg.type === 'paddev') {
        padDevs.set(msg.dev, msg);
        console.log('[pad] Controller ' + msg.dev + ': ' + (msg.name || '?') + ' (' + msg.vid.toString(16).padStart(4, '0') + ':' + msg.pid.toString(16).padStart(4, '0') + ')');
      } else if (msg.type === 'pad') {
        // a game-controller button was pressed; dash = it is the game's dashboard-display button
        msg.dash = isDashPress(msg);
        msg.auto = dashBind.list.length > 0;
        if (msg.dash) {
          const now = Date.now();
          if (now - lastDashPressAt < 350) return;
          lastDashPressAt = now;
          console.log('[dash] Display button pressed: cluster screen +1');
        }
        broadcast(msg);
      } else if (msg.type === 'ready') {
        helperReady = true;
        console.log('[input] Helper ready.');
      } else if (msg.type === 'tel') {
        // The helper reads fixed byte offsets that are only valid for this plugin revision.
        // On any other revision the values would be garbage, so report "no telemetry" rather
        // than light the wrong lamps.
        if (msg.sdk && msg.rev !== SUPPORTED_PLUGIN_REV) {
          if (!warnedRev) console.log('[telemetry] scs-telemetry.dll is revision ' + msg.rev + ', the bridge needs revision ' + SUPPORTED_PLUGIN_REV + '. Telemetry disabled.');
          warnedRev = true;
          msg = { type: 'tel', sdk: false };
        }
        if (msg.sdk !== lastTelemetry.sdk) {
          console.log(msg.sdk ? '[telemetry] Game connected.' : '[telemetry] Waiting for game / plugin.');
        }
        if (msg.sdk && msg.wipers !== lastTelemetry.wipers) diag('telemetry wipers=' + msg.wipers + ' engine=' + msg.engine + ' electric=' + msg.electric);
        if (msg.sdk !== lastTelemetry.sdk) diag('telemetry connected=' + msg.sdk);
        lastTelemetry = msg;
        broadcast(msg);
      } else if (msg.type === 'error' && msg.msg !== lastHelperError) {
        lastHelperError = msg.msg;
        console.log('[input] ' + msg.msg + ' - if the game runs as administrator, start the bridge as administrator too.');
        broadcast(msg);
      }
    }
  });
  helper.stderr.on('data', (chunk) => console.log('[input] ' + chunk.toString('utf8').trim()));
  helper.on('exit', (code) => {
    helperReady = false;
    helper = null;
    console.log('[input] Helper exited (code ' + code + '). Restarting in 3 s.');
    setTimeout(startHelper, 3000);
  });
}

function sendScan(direction, name) {
  const key = KEYS[name];
  if (!key) return;
  if (helper && helperReady) helper.stdin.write(direction + ' ' + key[0] + ' ' + key[1] + '\n');
  else if (process.platform !== 'win32') console.log('[key] ' + (direction === 'd' ? 'down' : 'up  ') + ' ' + name);
}

// A combo is ['ctrl', 'p']: modifiers first, main key last. Press in order, release reversed,
// exactly like fingers on a keyboard, so the game sees the modifier already held.
function pressCombo(keys) { for (const k of keys) sendScan('d', k); }
function releaseCombo(keys) { for (const k of keys.slice().reverse()) sendScan('u', k); }

const heldCombos = new Map(); // combo id -> { timer, keys }

function handleKey(action, keys) {
  diag('key ' + action + ' ' + keys.join('+') + (helper && helperReady ? '' : '  (helper not ready: NOT sent)'));
  const id = keys.join(' '); // space never appears in a key name ('+' does: num+)
  if (action === 'tap') {
    pressCombo(keys);
    setTimeout(() => releaseCombo(keys), TAP_MS);
  } else if (action === 'down') {
    if (heldCombos.has(id)) return; // already held, ignore repeat
    pressCombo(keys);
    heldCombos.set(id, { keys, timer: setTimeout(() => handleKey('up', keys), HOLD_TIMEOUT_MS) });
  } else if (action === 'up') {
    if (!heldCombos.has(id)) return;
    clearTimeout(heldCombos.get(id).timer);
    heldCombos.delete(id);
    releaseCombo(keys);
  }
}

// ---- HTTP -------------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(urlPath, res) {
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  // normalize + prefix check: a request like /../data/config.json must not leak the PIN
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      // the app changes while it is being tuned: never serve stale JS, and never let the WebView's
      // own HTTP cache reuse a response either (no-cache alone was not always honored there).
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const route = url.pathname;

  if (!route.startsWith('/api/')) {
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    serveStatic(decodeURIComponent(route), res);
    return;
  }

  // Unauthenticated on purpose: lets the app tell "bridge reachable, PIN wrong" apart
  // from "no bridge at all" (demo mode).
  if (route === '/api/info') { json(res, 200, { app: 'truckdeck', version: 1 }); return; }

  // The PIN travels in a custom header. Browsers refuse to send custom headers cross-site
  // without a CORS preflight (which this server never approves), so a malicious web page
  // cannot drive the keyboard even if it guesses the address. EventSource cannot set
  // headers, hence the query-string fallback for the read-only stream.
  // A 4-digit PIN falls to guessing in seconds unless guesses are counted. After 10 wrong
  // PINs from one device, that device is refused for 5 minutes.
  const who = req.socket.remoteAddress || '';
  const strikes = badPins.get(who);
  if (strikes && strikes.until > Date.now()) { json(res, 429, { error: 'too many wrong PINs, wait a few minutes' }); return; }
  const pin = req.headers['x-pin'] || url.searchParams.get('pin');
  if (pin !== config.pin) {
    const s = strikes && Date.now() - strikes.first < 5 * 60000 ? strikes : { count: 0, first: Date.now(), until: 0 };
    s.count += 1;
    if (s.count >= 10) { s.until = Date.now() + 5 * 60000; s.count = 0; s.first = Date.now(); }
    badPins.set(who, s);
    json(res, 401, { error: 'bad pin' });
    return;
  }
  if (strikes) badPins.delete(who);

  try {
    if (route === '/api/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive',
      });
      res.write('data: ' + JSON.stringify(lastTelemetry) + '\n\n');
      res.write('data: ' + JSON.stringify(lastMedia) + '\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (route === '/api/frame' && req.method === 'GET') {
      // x, y, w, h: the region of the game window as fractions 0..1; mw: largest width to send back
      const n = (k, d) => { const v = parseFloat(url.searchParams.get(k)); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d; };
      const mw = Math.max(160, Math.min(1200, parseInt(url.searchParams.get('mw'), 10) || 480));
      const r = await grabFrame(n('x', 0.74), n('y', 0.64), n('w', 0.25), n('h', 0.33), mw);
      if (r.data) {
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
        res.end(Buffer.from(r.data, 'base64'));
      } else {
        res.writeHead(204, { 'Cache-Control': 'no-store', 'X-Frame-Error': r.error || 'none' });
        res.end();
      }
      return;
    }

    if (route === '/api/key' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req, 2048));
      const keys = Array.isArray(body.keys) ? body.keys.map(String) : [];
      const valid = keys.length >= 1 && keys.length <= 4 && keys.every((k) => Object.prototype.hasOwnProperty.call(KEYS, k));
      if (!valid || !['tap', 'down', 'up'].includes(body.action)) { json(res, 400, { error: 'bad key' }); return; }
      handleKey(body.action, keys);
      json(res, 200, { ok: true });
      return;
    }

    if (route === '/api/layouts' && req.method === 'GET') {
      json(res, 200, readJson(LAYOUTS_FILE, null));
      return;
    }

    if (route === '/api/layouts' && req.method === 'PUT') {
      const text = await readBody(req, 2 * 1024 * 1024);
      const incoming = JSON.parse(text); // reject garbage before it replaces a good file

      // Key bindings are the most expensive thing in this file to recreate: they
      // are entered by hand, one function at a time. A save that arrives with no
      // bindings at all, replacing a file that HAD them, has already silently
      // wiped a working setup once. Keep the previous file before overwriting so
      // it can be restored, and say so on the console.
      const prev = readJson(LAYOUTS_FILE, null);
      if (prev) {
        const bindCount = (o) => {
          if (!o || !Array.isArray(o.layouts)) return 0;
          let n = Object.keys((o.prefs && o.prefs.binds) || {}).length;
          for (const l of o.layouts) n += Object.keys(l.binds || {}).length;
          return n;
        };
        const before = bindCount(prev), after = bindCount(incoming);
        if (before > 0 && after === 0) {
          const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const keep = LAYOUTS_FILE.replace(/\.json$/, '') + '.' + stamp + '.bak.json';
          try {
            fs.copyFileSync(LAYOUTS_FILE, keep);
            console.log('[layouts] Incoming save has 0 key bindings but the saved file had '
              + before + '. Previous file kept as ' + path.basename(keep) + '.');
          } catch (e) { console.log('[layouts] Could not keep a backup: ' + e.message); }
        }
      }

      // write-then-rename so a crash mid-write cannot corrupt the saved panels
      fs.writeFileSync(LAYOUTS_FILE + '.tmp', text);
      fs.renameSync(LAYOUTS_FILE + '.tmp', LAYOUTS_FILE);
      json(res, 200, { ok: true });
      return;
    }

    json(res, 404, { error: 'unknown route' });
  } catch (e) {
    json(res, 400, { error: String(e.message || e) });
  }
});

// Adapters that exist on the PC but can never be reached from a phone on the
// Wi-Fi: WSL / Hyper-V / VirtualBox / VMware / Docker host-side virtual NICs.
// A machine with WSL installed otherwise advertises something like 172.28.16.1,
// which to a user reading the banner looks exactly as plausible as the real LAN
// address — and nothing on it ever answers.
const VIRTUAL_NIC = /vEthernet|WSL|Hyper-?V|VirtualBox|VMware|Docker|Loopback|TAP-|ZeroTier|Tailscale/i;

// Rank a private IPv4 by how likely it is to be the home LAN the tablet is on.
// Home routers hand out 192.168.x.x far more often than 10.x.x.x, and 172.16-31
// is mostly virtual infrastructure, so it ranks last.
function lanRank(ip) {
  if (/^192\.168\./.test(ip)) return 0;
  if (/^10\./.test(ip)) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
  return 3;
}

// Returns [{ ip, name }], best candidate first.
// Filters out every address a phone cannot route to, so the banner never offers
// a dead one: link-local/APIPA (169.254.x.x — what Windows assigns to a Wi-Fi or
// Bluetooth adapter that is NOT connected) and host-side virtual NICs.
function lanAddresses() {
  const found = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL_NIC.test(name)) continue;
    for (const ni of list || []) {
      if (ni.family !== 'IPv4' || ni.internal) continue;
      if (/^169\.254\./.test(ni.address)) continue;   // APIPA: adapter is down
      found.push({ ip: ni.address, name: name });
    }
  }
  found.sort((a, b) => lanRank(a.ip) - lanRank(b.ip));
  return found;
}

// SSE comment line every 20 s keeps idle connections from being dropped by routers
setInterval(() => { for (const res of sseClients) res.write(': ping\n\n'); }, 20000);

server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE'
    ? 'Port ' + PORT + ' is already in use. Close the other bridge window, or set TRUCKDECK_PORT.'
    : String(e));
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  Hunters Truck Sim Button Box - PC bridge is running.');
  console.log('');
  const ips = lanAddresses();
  console.log('  In the app on your tablet or phone (same network as this PC), type:');
  console.log('');
  if (!ips.length) {
    console.log('    PC address:  (no usable network adapter found)');
    console.log('                 This PC is not on a LAN. Connect it to the same');
    console.log('                 router as the tablet, by cable or Wi-Fi.');
  } else {
    // The first entry is the best guess; mark it so the user is not left choosing
    // between several equally plausible-looking addresses.
    ips.forEach((a, i) => {
      const tag = i === 0 ? '  <-- use this one' : '';
      console.log('    PC address:  ' + a.ip + '   (' + a.name + ')' + tag);
    });
  }
  console.log('    PIN:         ' + config.pin);
  console.log('');
  if (ips.length) {
    console.log('  No app? Open this in the device browser instead:');
    for (const a of ips) console.log('    http://' + a.ip + ':' + PORT + '/?pin=' + config.pin);
    console.log('');
    console.log('  The tablet must be on the same router as this PC. A guest Wi-Fi');
    console.log('  or a repeater with its own subnet will not reach this address.');
    console.log('');
  }
  console.log('  Keep this window open while you play.');
  console.log('');
  startHelper();
});

// Release anything still held when the window is closed, so no key stays stuck
process.on('SIGINT', () => {
  for (const held of Array.from(heldCombos.values())) handleKey('up', held.keys);
  setTimeout(() => process.exit(0), 100);
});

