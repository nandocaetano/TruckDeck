// Hunters Truck Sim Button Box - panel app. Vanilla JS on purpose: it is served to whatever old tablet is
// mounted next to the wheel, straight from the bridge, with no build step.
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const app = $('#app');
  const panel = $('#panel');
  const stage = $('#stage');
  const tabs = $('#tabs');
  const sheet = $('#sheet');
  const scrim = $('#scrim');
  const toastEl = $('#toast');
  const statusEl = $('#status');

  // ---- Crash banner (debug aid) -------------------------------------------------------------
  // A render bug used to leave the screen stuck (blank panel, gallery gone, nothing to tap).
  // Until every panel type is exercised on real hardware, surface the actual error instead of
  // failing silently, so whatever goes wrong can be read off the screen and reported, not guessed.
  function showCrash(err) {
    try {
      let box = document.getElementById('crashbox');
      if (!box) {
        box = document.createElement('div');
        box.id = 'crashbox';
        box.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(10,12,14,0.96);color:#f2a23a;' +
          'font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;padding:16px;overflow:auto;white-space:pre-wrap;' +
          'word-break:break-word;';
        box.addEventListener('click', () => { box.remove(); });
        document.body.appendChild(box);
      }
      const msg = (err && err.stack) ? err.stack : String(err);
      box.textContent = 'Truck Deck crashed. Tap to dismiss, then screenshot this before closing.\n\n' + msg;
    } catch (e) { /* if even this fails, there is nothing left to do */ }
  }
  window.addEventListener('error', (ev) => showCrash(ev.error || ev.message));
  window.addEventListener('unhandledrejection', (ev) => showCrash(ev.reason));

  const S = {
    store: null,          // { layouts: [...], activeId }
    page: 0,
    edit: false,
    sel: null,            // selected widget id (edit mode)
    tel: { sdk: false },  // last telemetry frame from the bridge
    media: { running: false, playing: false, artist: '', track: '' }, // what the PC's music player is playing
    bridge: 'demo',       // 'demo' (no bridge found) | 'ok' | 'pin' | 'lost'
    pin: '',
    latched: {},          // local on/off memory for functions the game does not report
    pressed: new Set(),   // widget ids with a finger currently on them
    u: 60,                // cell size in px
    phase: true,          // flasher phase for hazard / indicator lamps when no game drives them
    obc: false,           // on-board computer showing instead of the panel
    bulbUntil: 0,         // telltale bulb-check deadline (ms)
    rotLocal: {},         // rotary detent held until telemetry leaves the stage the click started from
    lightHold: null,      // same hold for the lights rotary; low_beam follows it while unconfirmed
  };

  // Modern (eu_frame) ignition boot sequence — logo → bulb check → gauge sweep → data reveal.
  // Phases are driven from updateStates on the electric rising edge (~3.2s total).
  const MODERN_BOOT = {
    LOGO_MS: 600,
    BULB_MS: 2000,
    SWEEP_UP_MS: 400,
    SWEEP_DOWN_MS: 400,
    REVEAL_MS: 400
  };
  MODERN_BOOT.TOTAL_MS = MODERN_BOOT.BULB_MS + MODERN_BOOT.SWEEP_UP_MS + MODERN_BOOT.SWEEP_DOWN_MS + MODERN_BOOT.REVEAL_MS;
  let modernBoot = { phase: 'off', at: 0 }; // off | booting | running
  let modernShuttingDown = false;
  let _modernIgnPowered = null;

  function modernBootElapsed() { return Date.now() - (modernBoot.at || 0); }
  function modernBooting() { return modernBoot.phase === 'booting'; }
  // 0..100 during sweep window; null outside (use live telemetry).
  function modernBootSweepPct() {
    if (!modernBooting()) return null;
    const k = modernBootElapsed();
    const t0 = MODERN_BOOT.BULB_MS;
    const up = MODERN_BOOT.SWEEP_UP_MS;
    const down = MODERN_BOOT.SWEEP_DOWN_MS;
    if (k < t0) return 0;
    if (k < t0 + up) return ((k - t0) / up) * 100;
    if (k < t0 + up + down) return (1 - (k - t0 - up) / down) * 100;
    return null;
  }
  function modernBootPhaseName() {
    if (!modernBooting()) return modernBoot.phase === 'running' ? 'running' : 'off';
    const k = modernBootElapsed();
    if (k < MODERN_BOOT.LOGO_MS) return 'logo';
    if (k < MODERN_BOOT.BULB_MS) return 'bulbs';
    if (k < MODERN_BOOT.BULB_MS + MODERN_BOOT.SWEEP_UP_MS + MODERN_BOOT.SWEEP_DOWN_MS) return 'sweep';
    return 'reveal';
  }
  function ensureIgnBootOverlay() {
    if (panel.querySelector('.ign-boot')) return;
    const host = panel.querySelector('.obd-screens');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'ign-boot';
    el.setAttribute('aria-hidden', 'true');
    // PNG from AntiGravity when ready; inline griffin shield is the interim mark (no "Scania" word).
    el.innerHTML =
      '<div class="ign-boot-mark">' +
        '<video class="ign-boot-vid" src="skins/modern/dash/boot_v8.mp4" muted playsinline autoplay disablepictureinpicture ' +
          'style="pointer-events:none;object-fit:contain" ' +
          'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'\'"></video>' +
        '<img class="ign-boot-img" src="skins/modern/dash/boot_logo.png" alt="" style="display:none" onerror="this.style.display=\'none\';this.nextElementSibling.hidden=false">' +
        '<svg class="ign-boot-svg" viewBox="0 0 120 140" hidden aria-hidden="true">' +
          '<defs><linearGradient id="ignBootG" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#f4f7fb"/><stop offset="1" stop-color="#8aa0b0"/></linearGradient></defs>' +
          '<path fill="url(#ignBootG)" d="M60 4 108 28v40c0 36-22 62-48 72C34 130 12 104 12 68V28Z"/>' +
          '<path fill="#0a1218" d="M60 18 96 36v30c0 28-16 48-36 56-20-8-36-28-36-56V36Z"/>' +
          '<path fill="#18d7ef" d="M60 42c-10 8-16 18-16 30 0 8 3 14 8 19l8-8c-3-3-5-7-5-11 0-8 4-14 13-22zm0 0c10 8 16 18 16 30 0 8-3 14-8 19l-8-8c3-3 5-7 5-11 0-8-4-14-13-22z"/>' +
          '<text x="60" y="118" text-anchor="middle" fill="#9eb0bc" font-size="11" font-family="Barlow,sans-serif" font-weight="700">V8</text>' +
        '</svg>' +
      '</div>';
    host.appendChild(el);
  }
  function startModernBoot() {
    if (page().skin !== 'eu_frame') return;
    modernBoot = { phase: 'booting', at: Date.now() };
    S.bulbUntil = Date.now() + MODERN_BOOT.BULB_MS;
    ensureIgnBootOverlay();
    panel.classList.add('ign-booting');
    panel.dataset.boot = 'logo';
    const vid = panel.querySelector('.ign-boot-vid');
    if (vid) {
      // The UI reveal is driven by the video's own 'ended' event, not a fixed timer, so the
      // OBD content never appears while boot_v8.mp4 is still on screen. TOTAL_MS in
      // tickModernBoot() stays only as a fallback if the video errors or never fires 'ended'.
      // A short black pause after the clip ends (systems "waking up") feels more OEM than an
      // instant cut straight from the last video frame into a fully lit panel.
      vid.addEventListener('ended', function () {
        vid.style.visibility = 'hidden';
        setTimeout(function () { stopModernBoot('running'); }, 1500);
      }, { once: true });
      try { vid.currentTime = 0; vid.play().catch(function () {}); } catch (e) {}
    }
  }
  function stopModernBoot(to) {
    modernBoot = { phase: to || 'off', at: Date.now() };
    panel.classList.remove('ign-booting');
    const o = panel.querySelector('.ign-boot');
    if (o) o.remove();
    if (to === 'running') panel.dataset.boot = 'running';
    else delete panel.dataset.boot;
  }
  function stopModernShutdown() {
    modernShuttingDown = false;
    panel.classList.remove('ign-shutting-down');
    const o = panel.querySelector('.ign-shutdown');
    if (o) o.remove();
  }
  function startModernShutdown() {
    if (modernShuttingDown || page().skin !== 'eu_frame') return;
    modernShuttingDown = true;
    panel.classList.add('ign-shutting-down');
    const host = panel.querySelector('.obd-screens');
    if (!host || host.querySelector('.ign-shutdown')) return;
    const vid = document.createElement('video');
    vid.className = 'ign-shutdown';
    vid.src = 'skins/modern/dash/shutdown_v8.mp4';
    vid.muted = true;
    vid.playsInline = true;
    vid.autoplay = true;
    vid.setAttribute('disablepictureinpicture', '');
    vid.style.pointerEvents = 'none';
    vid.style.objectFit = 'contain';
    vid.setAttribute('aria-hidden', 'true');
    vid.addEventListener('ended', stopModernShutdown);
    vid.addEventListener('error', stopModernShutdown);
    host.appendChild(vid);
    try { vid.play().catch(function () {}); } catch (e) {}
  }
  function tickModernBoot() {
    if (page().skin !== 'eu_frame') { if (modernBoot.phase !== 'off') stopModernBoot('off'); return; }
    if (!modernBooting()) return;
    const phase = modernBootPhaseName();
    panel.dataset.boot = phase;
    // Fallback only: the normal path is the video's 'ended' listener in startModernBoot().
    // This fires solely if boot_v8.mp4 fails to load/play, so the UI is never stuck hidden.
    if (modernBootElapsed() >= MODERN_BOOT.TOTAL_MS + 4000) stopModernBoot('running');
  }

  // Static city -> country lookup (ETS2 base map + main DLC map city names as reported by the
  // SDK's cityFrom/cityTo strings). Not exhaustive; unknown cities just show no country tag.
  // The SDK has no "current country" / map-position field, so only origin and destination
  // can be resolved this way — there is no feasible way to show where the truck is *now*.
  const CITY_COUNTRY = {
    'Antwerp': 'BE', 'Brussels': 'BE', 'Liège': 'BE', 'Charleroi': 'BE', 'Mons': 'BE',
    'Amsterdam': 'NL', 'Rotterdam': 'NL', 'Eindhoven': 'NL', 'Groningen': 'NL', 'Breda': 'NL', 'Maastricht': 'NL',
    'Luxembourg': 'LU',
    'Berlin': 'DE', 'Hamburg': 'DE', 'Munich': 'DE', 'Frankfurt': 'DE', 'Cologne': 'DE', 'Stuttgart': 'DE',
    'Dortmund': 'DE', 'Essen': 'DE', 'Hannover': 'DE', 'Leipzig': 'DE', 'Dresden': 'DE', 'Nuremberg': 'DE',
    'Bremen': 'DE', 'Duisburg': 'DE', 'Kiel': 'DE', 'Karlsruhe': 'DE', 'Mannheim': 'DE', 'Flensburg': 'DE',
    'Rostock': 'DE', 'Wilhelmshaven': 'DE', 'Osnabrück': 'DE', 'Kassel': 'DE',
    'Warsaw': 'PL', 'Kraków': 'PL', 'Wrocław': 'PL', 'Poznań': 'PL', 'Gdańsk': 'PL', 'Katowice': 'PL',
    'Łódź': 'PL', 'Szczecin': 'PL', 'Bydgoszcz': 'PL', 'Lublin': 'PL', 'Białystok': 'PL', 'Kielce': 'PL',
    'Olsztyn': 'PL', 'Opole': 'PL', 'Rzeszów': 'PL', 'Zielona Góra': 'PL',
    'Prague': 'CZ', 'Brno': 'CZ', 'Ostrava': 'CZ', 'Plzeň': 'CZ', 'Karlovy Vary': 'CZ',
    'Hradec Králové': 'CZ', 'Liberec': 'CZ', 'Olomouc': 'CZ', 'Ústí nad Labem': 'CZ',
    'Vienna': 'AT', 'Salzburg': 'AT', 'Graz': 'AT', 'Linz': 'AT', 'Innsbruck': 'AT', 'Klagenfurt': 'AT',
    'Zürich': 'CH', 'Geneva': 'CH', 'Bern': 'CH', 'Basel': 'CH', 'Lausanne': 'CH', 'Lugano': 'CH', 'St. Gallen': 'CH',
    'Turin': 'IT', 'Milan': 'IT', 'Venice': 'IT', 'Bologna': 'IT', 'Genoa': 'IT',
    'Paris': 'FR', 'Lyon': 'FR', 'Marseille': 'FR', 'Lille': 'FR', 'Calais': 'FR', 'Strasbourg': 'FR',
    'Bordeaux': 'FR', 'Nantes': 'FR', 'Toulouse': 'FR', 'Nice': 'FR', 'Metz': 'FR', 'Reims': 'FR',
    'Le Havre': 'FR', 'Clermont-Ferrand': 'FR', 'Dijon': 'FR',
    'London': 'UK', 'Manchester': 'UK', 'Birmingham': 'UK', 'Glasgow': 'UK', 'Edinburgh': 'UK',
    'Liverpool': 'UK', 'Cardiff': 'UK', 'Dover': 'UK', 'Leeds': 'UK', 'Southampton': 'UK',
    'Bristol': 'UK', 'Newcastle': 'UK', 'Aberdeen': 'UK',
    'Madrid': 'ES', 'Barcelona': 'ES', 'Valencia': 'ES', 'Seville': 'ES', 'Bilbao': 'ES',
    'Zaragoza': 'ES', 'Santander': 'ES', 'A Coruña': 'ES', 'Vigo': 'ES', 'Málaga': 'ES',
    'Lisbon': 'PT', 'Porto': 'PT', 'Faro': 'PT', 'Braga': 'PT', 'Coimbra': 'PT',
    'Copenhagen': 'DK', 'Aarhus': 'DK', 'Esbjerg': 'DK', 'Aalborg': 'DK',
    'Stockholm': 'SE', 'Gothenburg': 'SE', 'Malmö': 'SE', 'Norrköping': 'SE', 'Örebro': 'SE', 'Sundsvall': 'SE',
    'Oslo': 'NO', 'Bergen': 'NO', 'Trondheim': 'NO', 'Stavanger': 'NO',
    'Helsinki': 'FI', 'Turku': 'FI', 'Tampere': 'FI',
    'Budapest': 'HU', 'Debrecen': 'HU', 'Szeged': 'HU', 'Győr': 'HU',
    'Bratislava': 'SK', 'Košice': 'SK', 'Žilina': 'SK',
    'Ljubljana': 'SI', 'Maribor': 'SI',
    'Zagreb': 'HR', 'Split': 'HR', 'Rijeka': 'HR',
  };
  const cityCountry = (city) => CITY_COUNTRY[city] || '';

  // Shown on the readouts when no bridge is reachable, so the preview is not a wall of dashes.
  const DEMO_TEL = { sdk: true, dmgTruck: 7, dmgTrailer: 1, dmgCargo: 1, routeDist: 369000, routeTime: 14700, time: 1 * 1440 + 11 * 60 + 5, speed: 22.8, gear: 12, cruise: 22.2, fuel: 640, fuelCap: 1000, rpm: 1250, air: 118, retarder: 0, retSteps: 3,
    // on-board computer
    onJob: true, cargo: 'Machine parts', mass: 21500, cityFrom: 'Rotterdam', compFrom: 'EuroGoodies', cityTo: 'Lyon', compTo: 'Tradeaux', income: 18450,
    jobKm: 942, due: 2 * 1440 + 6 * 60, truck: 'Demo', model: 'Truck', odo: 184230, range: 1480, fuelAvg: 0.31, adblue: 62, adblueCap: 80,
    oilP: 58, oilT: 96, waterT: 84, batt: 27.6, brakeT: 110, limit: 25, wear: [4, 7, 2, 5, 3], game: 1,
    high: true, park: false, parking: true, low: true, electric: true, engine: true,
    blinkL: false, blinkR: false, oilWarn: false, battWarn: false, lift: false, trailerLift: false };
  // Trucks report the gear as a bare number; crawler gears (C1, C2) are that same count
  // started early. "Auto" reads the gearbox size from the game, the rest pin it by hand.
  // Gearbox display layouts — these mirror the game's own "Layout do câmbio" list so a player
  // picks the exact same name they use in-game and the readout matches the truck's HUD. SCS
  // telemetry sends only a raw gear index (never L/H or range), so each layout is described by:
  //   crawl = how many crawler gears sit below gear 1 (shown C1, C2)
  //   split = true when every main gear has a low/high half (1L, 1H, 2L...) and reverse is RL, RH
  // Verified 2026-10-08 against real ETS2 trucks (Scania/Volvo/ZF 12, 12+2, 16, reduzida, alta/baixa).
  // `game` groups them in the menu; ATS layouts get added as another group later.
  const GEARBOXES = [
    { k: 'auto',       game: '',     label: 'Auto (detect from truck)' },
    { k: 'reduzida',   game: 'ets2', label: 'Reduzida',                crawl: 2, split: false },
    { k: 'altabaixa',  game: 'ets2', label: 'Alta/baixa',              crawl: 2, split: false },
    { k: 'red_altab',  game: 'ets2', label: 'Reduzida + alta/baixa',   crawl: 2, split: false },
    { k: 'scania12',   game: 'ets2', label: 'Scania 12 velocidades',   crawl: 0, split: true },
    { k: 'scania12p2', game: 'ets2', label: 'Scania 12+2 velocidades', crawl: 2, split: true },
    { k: 'volvo12',    game: 'ets2', label: 'Volvo 12 velocidades',    crawl: 0, split: true },
    { k: 'volvo12p2',  game: 'ets2', label: 'Volvo 12+2 velocidades',  crawl: 2, split: true },
    { k: 'zf12',       game: 'ets2', label: 'ZF 12 velocidades',       crawl: 0, split: true },
    { k: 'zf16',       game: 'ets2', label: 'ZF 16 velocidades',       crawl: 0, split: true },
    // American Truck Simulator: stock ATS transmissions display the gearDashboard integer as a
    // plain sequential number on the HUD (1, 2, 3...) — no crawl prefix, no L/H split.
    // This was confirmed by in-game testing: ATS Reduzida shows "1" (not "C1") on the game HUD.
    // Steam community corroborates: stock 18-speed shows "1, 2, 3... 18" sequentially.
    { k: 'ats_reduzida',  game: 'ats', label: 'Reduzida',                      crawl: 0, split: false },
    { k: 'ats_altabaixa', game: 'ats', label: 'Alta/baixa',                    crawl: 0, split: false },
    { k: 'ats_red_altab', game: 'ats', label: 'Reduzida + alta/baixa',        crawl: 0, split: false },
    { k: 'eaton10',       game: 'ats', label: 'Eaton Fuller 10 velocidades',  crawl: 0, split: false },
    { k: 'eaton13',       game: 'ats', label: 'Eaton Fuller 13 velocidades',  crawl: 0, split: false },
    { k: 'eaton18',       game: 'ats', label: 'Eaton Fuller 18 velocidades',  crawl: 0, split: false },
  ];
  const GEARBOX_GROUPS = [
    { game: 'ets2', label: 'Euro Truck Simulator 2' },
    { game: 'ats', label: 'American Truck Simulator' },
  ];
  const GEARBOX_MIGRATE = { '-1': 'auto', '0': 'auto', '1': 'auto', '2': 'reduzida', '5': 'scania12', '6': 'scania12p2' };
  function gearboxKey(v) {
    if (v == null) return 'auto';
    const s = String(v);
    if (GEARBOXES.some((x) => x.k === s)) return s;
    return GEARBOX_MIGRATE[s] || 'auto';               // migrate the old numeric setting
  }
  function gearboxOf() { return GEARBOXES.find((x) => x.k === gearboxKey(layout().gearCrawlers)) || GEARBOXES[0]; }
  function gearboxOptionsHtml(sel) {
    const a = GEARBOXES[0];                             // 'auto' sits above the game groups
    let h = '<option value="auto"' + ('auto' === sel ? ' selected' : '') + '>' + esc(a.label) + '</option>';
    for (const grp of GEARBOX_GROUPS) {
      const items = GEARBOXES.filter((x) => x.game === grp.game);
      if (!items.length) continue;
      h += '<optgroup label="' + esc(grp.label) + '">';
      for (const gb of items) h += '<option value="' + esc(gb.k) + '"' + (gb.k === sel ? ' selected' : '') + '>' + esc(gb.label) + '</option>';
      h += '</optgroup>';
    }
    return h;
  }

  // ---- Storage ---------------------------------------------------------------------------
  // localStorage can throw or come back empty (private windows, previews); the app must
  // still run, so every access is guarded and nothing depends on it succeeding.
  function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function lsSet(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* in-memory only */ } }

  // ---- Layout Editor bridge ---------------------------------------------------------------
  // The atomic Layout Editor (editor.html) saves its own board under this key, independent of
  // the layout store above. The Modern panel (eu_frame) picks up its dash-obd/dash-speedometer
  // zones from there, live, so a player's Layers edits apply without a separate publish step.
  const ATOMIC_LAYOUT_KEY = 'desktruck.atomic-layout.v1';
  let atomicRaw = null, atomicCache = null;
  function atomicBoard() {
    const raw = lsGet(ATOMIC_LAYOUT_KEY);
    if (raw !== atomicRaw) {
      atomicRaw = raw;
      try { atomicCache = JSON.parse(raw || 'null'); } catch (e) { atomicCache = null; }
    }
    return atomicCache;
  }
  // Each skin owns its own board under boards.<skin> (see editor.js's freshBoard()/activeBoard()
  // — this is the other half of the 2026-10-16 fix). A legacy payload synced before that change
  // is still a flat {orientations,...} with a single top-level skin tag; read it as eu_frame
  // only, since Soviet boards didn't exist in that shape.
  // Soviet empty-plate boards (3 keys for 5 visual backgrounds):
  //   white              → boards.sov_white     (isolated)
  //   military1|military2 → boards.sov_military (shared skeleton)
  //   sigabem|vivamexico → boards.sov_frame     (shared skeleton)
  // Canonical variants + aliases (380.jpg = Siga Bem, 378.jpg = Viva México).
  const SOV_BG_VARIANTS = ['white', 'military1', 'military2', 'sigabem', 'vivamexico'];
  const SOV_BG_ALIASES = {
    '380': 'sigabem', '380.jpg': 'sigabem', siga: 'sigabem', siga_bem: 'sigabem',
    sigabem: 'sigabem', 'siga bem': 'sigabem', sigabem_landscape: 'sigabem',
    '378': 'vivamexico', '378.jpg': 'vivamexico', viva: 'vivamexico', viva_mexico: 'vivamexico',
    vivamexico: 'vivamexico', 'viva mexico': 'vivamexico', 'viva méxico': 'vivamexico',
    vivamexico_landscape: 'vivamexico',
    white: 'white', branca: 'white', enamel: 'white', esmaltada: 'white',
    military1: 'military1', mil1: 'military1', military_1: 'military1',
    military2: 'military2', mil2: 'military2', military_2: 'military2'
  };
  function normalizeSovBg(sovBg) {
    const raw = String(sovBg == null ? 'white' : sovBg).trim();
    if (!raw) return 'white';
    const key = raw.toLowerCase().replace(/\\+/g, '/').split('/').pop();
    const bare = key.replace(/\.(jpe?g|png|webp)$/i, '');
    const hit = SOV_BG_ALIASES[key] || SOV_BG_ALIASES[bare] || SOV_BG_ALIASES[bare.replace(/[-_\s]+/g, '')]
      || SOV_BG_ALIASES[raw.toLowerCase()] || SOV_BG_ALIASES[raw.toLowerCase().replace(/[-_\s]+/g, '')];
    if (hit) return hit;
    // Fuzzy: any token containing sigabem / vivamexico / military
    if (/siga/.test(bare)) return 'sigabem';
    if (/viva|mexico|méxico/.test(bare)) return 'vivamexico';
    if (/military?\s*2|mil2/.test(bare)) return 'military2';
    if (/military?\s*1|mil1|military/.test(bare)) return 'military1';
    if (/white|branca|enamel|esmalt/.test(bare)) return 'white';
    return SOV_BG_VARIANTS.includes(bare) ? bare : 'white';
  }
  function sovBoardKey(sovBg) {
    const v = normalizeSovBg(sovBg);
    if (v === 'white') return 'sov_white';
    if (v === 'military1' || v === 'military2') return 'sov_military';
    // sigabem | vivamexico | aliases 380/378 → shared Siga/Viva skeleton
    return 'sov_frame';
  }
  // White / Militar plates are remapped from scratch — empty board must stay empty
  // (never inherit Siga Bem / Viva México buttons from boards.sov_frame).
  // Siga Bem / Viva México (and aliases 380/378) are NOT empty-plate — they use sov_frame buttons.
  function isEmptyPlateSovBg(sovBg) {
    const v = normalizeSovBg(sovBg);
    return v === 'white' || v === 'military1' || v === 'military2';
  }
  function emptyAtomicBoard(skinKey) {
    return {
      skin: skinKey || 'sov_white',
      orientations: {
        landscape: { buttons: [], zones: [] },
        portrait: { buttons: [], zones: [] }
      }
    };
  }
  function boardFor(skin, sovBg) {
    const board = atomicBoard();
    if (!board) return null;
    if (board.boards) {
      if (skin === 'sov_frame') {
        const bg = sovBg != null ? sovBg : (layout() && layout().sovBg);
        const key = sovBoardKey(bg);
        if (isEmptyPlateSovBg(bg)) {
          // Isolated boards only — never fall back to sov_frame (Siga/Viva).
          return board.boards[key] || emptyAtomicBoard(key);
        }
        return board.boards[key] || board.boards.sov_frame || null;
      }
      return board.boards[skin] || null;
    }
    if (skin === 'eu_frame' && board.orientations) return board;
    return null;
  }
  // Shared by connect()'s initial fetch and the SSE-triggered refetch below: write the PC's
  // atomic-layout payload into localStorage only when it actually differs, and drop the cached
  // parse so atomicBoard() re-reads it on the next call.
  function applyAtomicLayoutPayload(body) {
    if (!body || body.schema !== 'desktruck.atomic-layout/v1') return false;
    const text = JSON.stringify(body);
    if (text === lsGet(ATOMIC_LAYOUT_KEY)) return false;
    lsSet(ATOMIC_LAYOUT_KEY, text);
    atomicRaw = null; // force atomicBoard() to re-parse instead of serving its old cache
    return true;
  }
  function boardHasButtons(board) {
    if (!board || !board.orientations) return false;
    for (const mode of ['landscape', 'portrait']) {
      const o = board.orientations[mode];
      if (o && Array.isArray(o.buttons) && o.buttons.length) return true;
    }
    return false;
  }
  function hasAtomicButtons(skin) {
    if (skin === 'sov_frame') {
      // Include shared Siga/Viva board (sigabem) plus isolated white/military plates.
      return boardHasButtons(boardFor('sov_frame', 'sigabem'))
        || boardHasButtons(boardFor('sov_frame', 'white'))
        || boardHasButtons(boardFor('sov_frame', 'military1'))
        || boardHasButtons(boardFor('sov_frame', 'military2'));
    }
    if (skin) return boardHasButtons(boardFor(skin));
    return boardHasButtons(boardFor('eu_frame')) || hasAtomicButtons('sov_frame');
  }
  // If the Layout Editor saved buttons, open a panel for whichever skin actually has them so
  // widgetsOf() paints them. Call again after connect() sync — the PC store can overwrite
  // activeId. Prefers eu_frame when both skins have buttons (today's default panel).
  function preferAtomicModern() {
    if (!S.store || !Array.isArray(S.store.layouts)) return false;
    const wantSkin = hasAtomicButtons('eu_frame') ? 'eu_frame' : (hasAtomicButtons('sov_frame') ? 'sov_frame' : null);
    if (!wantSkin) return false;
    const target = S.store.layouts.find((l) => l.preset === wantSkin
      || (l.pages || []).some((pg) => pg && pg.skin === wantSkin));
    if (!target || S.store.activeId === target.id) return false;
    S.store.activeId = target.id;
    S.page = 0;
    return true;
  }
  // Only the two dashboard zone types are read here; the editor's buttons are bridged
  // separately by atomicDashButtons()/atomicDashButtonsSig() below.
  function atomicDashZones(cut, skin) {
    const resolvedSkin = skin || 'eu_frame';
    const board = boardFor(resolvedSkin, resolvedSkin === 'sov_frame' ? sovBgOf(layout()) : null);
    const mode = cut === 'P' ? 'portrait' : 'landscape';
    const o = board && board.orientations && board.orientations[mode];
    if (!o || !Array.isArray(o.zones)) return [];
    return o.zones.filter((z) => z && !z.hidden && (z.type === 'dash-obd' || z.type === 'dash-speedometer'));
  }

  // Passive lamp telltales from the Layout Editor (mirrors editor.js LAMP_TELEMETRY).
  // keys:[] so press() never sends a vehicle command; lighting comes from tel + behavior.
  const LAMP_INDICATORS = {
    hazard_alert: { tel: 'hazard', behavior: 'blink' },
    trailer_brake: { tel: 'trailerBrake', behavior: 'steady' },
    engine_stalled: { tel: 'engineStalled', behavior: 'steady' },
    parking_brake: { tel: 'park', behavior: 'steady' },
    over_speed_alert: { tel: 'speedWarn', behavior: 'blink' },
    air_pressure_critical: { tel: 'airWarn', behavior: 'blink' },
    engine_overheat: { tel: 'waterWarn', behavior: 'steady' },
    fuel_reserve: { tel: 'fuelWarn', behavior: 'steady' },
    retarder_active: { tel: 'retarderOn', behavior: 'steady' },
    diff_lock: { tel: 'diff', behavior: 'steady' },
    turn_signal_single: { tel: 'blinkEither', behavior: 'blink' },
    left_turn_signal: { tel: 'blinkL', behavior: 'blink' },
    right_turn_signal: { tel: 'blinkR', behavior: 'blink' },
    low_beam: { tel: 'low', behavior: 'steady' },
    parking_lights: { tel: 'parking', behavior: 'steady' },
    engine_running: { tel: 'engine', behavior: 'steady' },
    high_beam: { tel: 'high', behavior: 'steady' }
  };
  const LAMP_ID_ALIASES = {
    ind_speed_alert: 'over_speed_alert',
    ind_air_critical: 'air_pressure_critical',
    ind_engine_overheat: 'engine_overheat',
    ind_fuel_reserve: 'fuel_reserve',
    blinker_left: 'left_turn_signal',
    blinker_right: 'right_turn_signal',
    lights: 'low_beam',
    parking_light: 'parking_lights',
    position_lights: 'parking_lights',
    presence: 'parking_lights',
    engine: 'engine_running',
    retarder_auto: 'retarder_active'
  };
  function resolveLampIndicatorId(functionId) {
    const id = String(functionId || '');
    if (!id) return '';
    if (LAMP_INDICATORS[id]) return id;
    if (LAMP_ID_ALIASES[id] && LAMP_INDICATORS[LAMP_ID_ALIASES[id]]) return LAMP_ID_ALIASES[id];
    return '';
  }
  function isLampAssetKey(asset) {
    return /(?:^|[_-])lamp[_-]|sov_lamp_/i.test(String(asset || ''));
  }
  // Photoreal Soviet dial faces from the Layout Editor — passive gauges, never keys.
  function dialFieldFromAsset(asset) {
    const m = String(asset || '').match(/(?:^|[_-])dial[_-](speed|rpm|fuel|air)\b/i)
      || String(asset || '').match(/sov_dial_(speed|rpm|fuel|air)/i);
    return m ? m[1].toLowerCase() : '';
  }

  // The editor lets a player type any free-text functionId; this maps the ones already saved
  // (Portuguese slugs, some with typos) to real catalog ids from FUNCTION_LIST. A functionId
  // not found here, and not already a real catalog id, resolves to 'custom' (an inert key —
  // see fnOf()/keysOf() in catalog.js's FUNCTIONS lookup) instead of breaking anything.
  const ATOMIC_FN_ALIASES = {
    subirsuspensaotraseira: 'susp_rear_up', subirsuspensaoatras: 'susp_rear_up',
    subirsusoensaofrente: 'susp_front_up', subirsuspensaofrente: 'susp_front_up',
    abaixarsuspensaotraseira: 'susp_rear_down', baixarsuspensaoatras: 'susp_rear_down',
    abaixarsuspensaofrente: 'susp_front_down', baixarsuspensaofrente: 'susp_front_down',
    resetsuspensao: 'susp_reset', seretsuspensao: 'susp_reset',
    engate: 'trailer_attach', engatar: 'trailer_attach',
    suspensaotrailer: 'trailer_axle',
    espelhos: 'mirrors',
    assistentefaixa: 'lane_assist', assitentedefaixa: 'lane_assist',
    liga_desliga: 'engine',
    freio_de_estacionamento: 'parking_brake', freio_estacionamento: 'parking_brake',
    alerta: 'hazard',
    limpadoroff: 'wipers_back', limpador_off: 'wipers_back',
    limpador: 'wipers', limpodor: 'wipers',
    luz: 'lights', luzalta: 'high_beam',
    mapa: 'world_map',
    salvar: 'quick_save',
    enter: 'activate',
    diminuircruzeiro: 'cruise_down', cruzeiro: 'cruise', aumentarcruzeiro: 'cruise_up',
    diminuirfreiomotor: 'engine_brake_down',
    ligarfreiomotor: 'engine_brake_toggle', ligadesligafreiomotor: 'engine_brake_toggle',
    aumentarfreiomotor: 'engine_brake_up', aumentafreiomotor: 'engine_brake_up',
    diminuirretarder: 'retarder_down', ligarretarder: 'retarder_auto', aumentarretarder: 'retarder_up',
    freiotrailer: 'trailer_brake',
    freioemergencia: 'emergency_brake'
  };
  // menu and other ids already matching FUNCTION_LIST pass through unchanged; an empty or
  // unmapped functionId falls through to 'custom', the same inert key fnOf() already handles.
  function resolveFn(functionId) {
    const id = String(functionId || '');
    if (!id) return 'custom';
    if (ATOMIC_FN_ALIASES[id]) return ATOMIC_FN_ALIASES[id];
    return FUNCTIONS[id] ? id : 'custom';
  }

  // A button's asset is either a shipped picture (Modern: skins/modern/<file>, Soviet:
  // skins/sov/btn/<file>) or a player-uploaded custom asset, stored once top-level (shared by
  // both skins' boards) as a data URI in customAssets and referenced here by its id.
  function resolveAtomicAsset(customAssets, skin, key) {
    if (!key) return null;
    const custom = Array.isArray(customAssets) && customAssets.find((a) => a && a.id === key);
    if (custom) return custom.src || null;
    if (typeof key === 'string' && /^mod_rotary_/i.test(key)) return SKIN_PATH + 'modern/' + key;
    if (typeof key === 'string' && key.indexOf('sov_') === 0) return SKIN_PATH + 'sov/btn/' + key;
    if (skin === 'sov_frame') return SKIN_PATH + 'sov/btn/' + key;
    return SKIN_PATH + 'modern/' + key;
  }
  // Editor-authored asset keys/filenames end up concatenated into a CSS url("...") below; escape
  // backslashes and quotes so a stray " in a player-typed filename can't break out of the string.
  function cssUrl(src) {
    return 'url("' + String(src).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '")';
  }

  // Reads the editor's free-position buttons for one cut, normalized to the shape widgetsOf()
  // can drop straight into a widget list (same w.r free-position rect the dash zones use).
  // The Editor auto-overlays a function's official pictogram on top of the physical asset photo
  // (e.g. the icon on the black rocker key); size/position/opacity are the Editor's own, stored
  // per button and independent of the asset image. 'custom'/blank functionId -> no overlay.
  function atomicButtonPicto(fnId, raw) {
    const f = FUNCTIONS[fnId];
    if (!f || fnId === 'custom' || !raw) return null;
    const picto = {
      icon: f.icon,
      w: Number(raw.width) || 55, h: Number(raw.height) || 55,
      ox: Number(raw.offsetX) || 0, oy: Number(raw.offsetY) || 0,
      op: Math.max(0, Math.min(1, Number(raw.opacity)))
    };
    // Optional pictogram.color (hex). Omitted = white CSS default — no migration on old boards.
    if (typeof raw.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.color) && raw.color.toLowerCase() !== '#ffffff') {
      picto.color = raw.color.toLowerCase();
    }
    return picto;
  }
  // True when `label` is only the asset/function identity (not a player-typed caption).
  function isIdentityKeyLabel(label, asset, fnId) {
    const raw = String(label || '').trim();
    if (!raw) return true;
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const n = norm(raw);
    if (fnId && n === norm(fnId)) return true;
    const base = String(asset || '').replace(/\.[^.]+$/, '');
    if (base) {
      if (n === norm(base) || n === norm(base.replace(/^sov_/, '').replace(/^btn-/, ''))) return true;
    }
    // Shipped ASSETS_* titles from the Layout Editor palette.
    if (/^(rocker\s*[vh]|toggle(\s+(up|mid|down))?|push(\s+\w+)?|square(\s+\w+)?|key(\s+\w+)?|lamp\s+\w+(\s+\w+)?|dial\s+\w+|parking brake(\s+\w+)?|hazard(\s+\w+)?)$/i.test(raw)) return true;
    return false;
  }
  function atomicOverlayLabel(rawLabel, asset, fnId, hasPicto) {
    if (rawLabel && !isIdentityKeyLabel(rawLabel, asset, fnId)) return rawLabel;
    if (!hasPicto || !fnId || !FUNCTIONS[fnId]) return '';
    return String(FUNCTIONS[fnId].label || FUNCTIONS[fnId].name || '').replace(/\n/g, ' ').trim();
  }
  function atomicDashButtons(cut, skin) {
    const resolvedSkin = skin || 'eu_frame';
    const board = boardFor(resolvedSkin, resolvedSkin === 'sov_frame' ? sovBgOf(layout()) : null);
    const customAssets = atomicBoard() && atomicBoard().customAssets;
    const mode = cut === 'P' ? 'portrait' : 'landscape';
    const o = board && board.orientations && board.orientations[mode];
    if (!o || !Array.isArray(o.buttons)) return [];
    const mapped = o.buttons.filter((b) => b && !b.hidden).map((b) => {
      const dialField = dialFieldFromAsset(b.asset);
      const rect = [Number(b.x) || 0, Number(b.y) || 0, Number(b.w ?? b.width) || 1, Number(b.h ?? b.height) || 1];
      // Dial PNGs are analogue faces: emit sgauge (passive, needle from telemetry) — never kbd.
      if (dialField) {
        return {
          id: 'atomic-' + b.id,
          t: 'sgauge',
          field: dialField,
          r: rect,
          zIndex: Math.max(Number(b.zIndex) || 10, 60)
        };
      }
      // Soviet key slot → 3 ignition modes from Editor functionId:
      //   electrics     → Electrics Only (simple latch kbd)
      //   engine        → Engine Only start/stop (simple latch kbd)
      //   ign_combined / ign / empty → Combined dual-stage (t:'ign')
      const assetKeyRaw = String(b.asset || '').replace(/\s+/g, '');
      // Glass lens (sov_lens.png; legacy name sov_push_lens.png): a decorative sheet of glass
      // parked over a dial niche. NOT a button: no press, no telemetry, no sink, no pointer events.
      // Rides above the dial faces by default so the reflection sits on top of the glass.
      if (/^sov_(?:push_)?lens(?:\.png)?$/i.test(assetKeyRaw)) {
        return {
          id: 'atomic-' + b.id,
          t: 'lens',
          r: rect,
          zIndex: Math.max(Number(b.zIndex) || 10, 70),
          asset: resolveAtomicAsset(customAssets, resolvedSkin, b.asset)
        };
      }
      if (/^sov_key(?:_slot|_kamaz)?(?:\.png)?$/i.test(assetKeyRaw)) {
        const keyFn = String(b.functionId || '').trim();
        const assetSrc = resolveAtomicAsset(customAssets, resolvedSkin, b.asset);
        if (keyFn === 'electrics' || keyFn === 'engine') {
          return {
            id: 'atomic-' + b.id,
            t: 'kbd',
            fn: keyFn,
            r: rect,
            zIndex: Number(b.zIndex) || 10,
            asset: assetSrc,
            keyTurn: true,
            pictogramHidden: true
          };
        }
        return {
          id: 'atomic-' + b.id,
          t: 'ign',
          st: 'btn',
          ignMode: 'combined',
          r: rect,
          zIndex: Number(b.zIndex) || 10,
          asset: assetSrc
        };
      }
      const isLamp = isLampAssetKey(b.asset);
      let lampId = isLamp ? resolveLampIndicatorId(b.functionId) : '';
      const assetKey = String(b.asset || '');
      // Absolute rule (Fernando, 2026-10-18): colour NEVER determines function.
      // A lamp with an empty functionId stays inert until mapped in the Editor.
      // Multi-stage lever family: editor places ONE state (mid/off/up); app swaps up/down art.
      const isParkTog = /sov_toggle_parking_brake/i.test(assetKey);
      const isTog = isParkTog || /^sov_tog_(?:up|mid|down)(?:\.|$)/i.test(assetKey) || /sov_toggle_/i.test(assetKey);
      const isRocker = /btn-rocker/i.test(assetKey);
      const isModLights = /mod_rotary_lights\.png$/i.test(assetKey);
      const isModWipers = /mod_rotary_wipers\.png$/i.test(assetKey);
      const isRotary = /sov_rotary_(?:dial|base)/i.test(assetKey) || isModLights || isModWipers;
      // Hazard rule (definitive):
      //   sov_push_hazard.png          → plain physical push (sink on press, no lamp swap)
      //   sov_push_hazard_{off,on}.png → static body; only internal light OFF↔ON synced to tel
      const isHazLit = /sov_push_hazard_(?:off|on)(?:\.|$)/i.test(assetKey);
      const isHazPush = /sov_push_hazard(?:\.|$)/i.test(assetKey) && !isHazLit;
      // Function-named Soviet photos bind their catalog command when the editor left functionId empty.
      let fnHint = b.functionId;
      if (!fnHint) {
        if (isParkTog || /sov_toggle_parking_brake|sov_push_parking_brake/i.test(assetKey)) fnHint = 'parking_brake';
        else if (isHazLit || isHazPush) fnHint = 'hazard';
        else if (isModWipers) fnHint = 'wipers';
        else if (isRotary) fnHint = 'lights';
        else if (lampId) fnHint = lampId;
      }
      const resolved = lampId || (isLamp ? (fnHint || 'custom') : resolveFn(fnHint));
      // Parking/hazard photos already carry Soviet legends — never overlay a catalog pictogram.
      const hidePicto = !!(b.pictogramHidden || isRotary || /parking_brake/i.test(assetKey) || /sov_push_hazard/i.test(assetKey) || /sov_key/i.test(assetKey));
      const picto = (isLamp || hidePicto) ? null : atomicButtonPicto(resolved, b.pictogram);
      // Label rule: custom typed text, else the pictogram/function display name — never
      // technical ids (parking_brake) or stock asset titles (Rocker V, Lamp red off).
      const rawLabel = String(b.label || '').trim();
      const overlayLabel = atomicOverlayLabel(rawLabel, assetKey, resolved, !!picto);
      const out = {
        id: 'atomic-' + b.id,
        t: 'kbd',
        fn: resolved,
        r: rect,
        zIndex: Number(b.zIndex) || 10,
        asset: resolveAtomicAsset(customAssets, resolvedSkin, b.asset),
        picto: picto
      };
      if (isLamp) out.lamp = true;
      // engine_running telltale keeps the alternator --lv flicker; presence/low_beam follows lightsOn.
      if (lampId === 'engine_running') out.eng = true;
      if (isTog) out.tog = true;
      if (isParkTog) out.parkTog = true;
      if (isHazLit) out.hazardFail = true; // class name kept; means "lit indicator, static body"
      if (isRocker) out.rocker = true;
      // Yellow parking push: the black bezel is bolted to the panel and must NOT move, so the
      // photo ships as two layers — _frame (static housing + dark recess) and _core (the yellow
      // cap alone). Only the core gets the :active sink. JSON keeps the original asset name.
      if (/sov_push_parking_brake(?:\.png)?$/i.test(assetKeyRaw)) {
        out.asset = String(out.asset).replace(/sov_push_parking_brake\.png/i, 'sov_push_parking_brake_frame.png');
        out.pbCore = String(out.asset).replace(/_frame\.png$/i, '_core.png');
      }
      if (isRotary) {
        out.rotary = true;
        if (isModLights) out.modRotary = 'lights';
        if (isModWipers) out.modRotary = 'wipers';
        out.states = normalizeRotaryStates(b.states, resolved, assetKey);
        const pinName = b.pinAsset || (isModLights ? 'mod_rotary_lights_knob.png'
          : isModWipers ? 'mod_rotary_wipers_knob.png' : 'sov_rotary_knob.png');
        out.pinAsset = resolveAtomicAsset(customAssets, resolvedSkin, pinName);
        out.crownR = clamp(Number(b.crownR) || 42, 0, 48);
        // Knob disc diameter as a % of the dial square. 58 = the Soviet well.
        // Modern crops are measured: lights 56.4, wipers 57.6.
        const lenDefault = isModLights ? 56.4 : isModWipers ? 57.6 : 58;
        out.pinLen = clamp(Number(b.pinLen) || lenDefault, 20, 100);
        // The knob art is photographed already turned; subtract its baked angle so a state's
        // `deg` is the real legend angle printed on the housing (0 = 12 o'clock, cw +).
        const bakeDefault = isModLights ? 27.3 : isModWipers ? 26.5 : 24.1;
        out.pinBake = Number.isFinite(Number(b.pinBake)) ? Number(b.pinBake) : bakeDefault;
      }
      // "Down" half of a rocker tilts the other way while held.
      if (isRocker && /(?:^|_)(?:down|off|minus|slower)(?:_|$)/i.test(String(resolved || ''))) out.rockerDn = true;
      if (overlayLabel) out.label = overlayLabel;
      if (b.color) out.color = b.color;
      return out;
    });
    // Dial faces are hub-transparent; a stray widget parked on the same niche shows its green LED
    // through the centre. Drop any non-dial widget whose centre sits inside a dial rect.
    // The glass lens is the one exception: it exists to be laid over a dial.
    const dials = mapped.filter((w) => w.t === 'sgauge');
    if (!dials.length) return mapped;
    return mapped.filter((w) => {
      if (w.t === 'sgauge' || w.t === 'lens') return true;
      const cx = w.r[0] + w.r[2] / 2, cy = w.r[1] + w.r[3] / 2;
      return !dials.some((d) => cx >= d.r[0] && cx <= d.r[0] + d.r[2] && cy >= d.r[1] && cy <= d.r[1] + d.r[3]);
    });
  }
  // Cheap fingerprint for the memo key in widgetsOf(): id/functionId/asset-key/zIndex plus
  // geometry (x,y,width,height) and the pictogram's own box, so drag/resize in the editor and
  // pictogram edits both invalidate the cache. Never the resolved asset src -- that can be a
  // multi-MB base64 data URI.
  function atomicDashButtonsSig(cut, skin) {
    const board = boardFor(skin || 'eu_frame', (skin || 'eu_frame') === 'sov_frame' ? sovBgOf(layout()) : null);
    const mode = cut === 'P' ? 'portrait' : 'landscape';
    const o = board && board.orientations && board.orientations[mode];
    if (!o || !Array.isArray(o.buttons)) return '';
    return o.buttons.filter((b) => b && !b.hidden).map((b) => {
      const p = b.pictogram || {};
      return b.id + ':' + (b.functionId || '') + ':' + (b.asset || '') + ':' + (b.zIndex || '') + ':' + (b.pictogramHidden ? 1 : 0)
        + ':' + (b.x || 0) + ',' + (b.y || 0) + ',' + (b.w ?? b.width ?? 0) + ',' + (b.h ?? b.height ?? 0)
        + ':' + (p.width || 0) + ',' + (p.height || 0) + ',' + (p.offsetX || 0) + ',' + (p.offsetY || 0) + ',' + (p.opacity || 0) + ',' + (p.color || '')
        + ':' + (b.label || '') + ':' + (b.color || '');
    }).join('|');
  }

  let saveTimer = null;
  function save() {
    applyPrefs();
    const text = JSON.stringify(S.store);
    lsSet('truckdeck.store', text);
    if (S.bridge !== 'ok') return;
    // Debounced: dragging a widget across the grid should not hammer the PC with writes.
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      fetch('api/layouts', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Pin': S.pin }, body: text }).catch(() => {});
    }, 600);
  }

  function validStore(s) {
    return s && Array.isArray(s.layouts) && s.layouts.length > 0 && s.layouts.every((l) => l && Array.isArray(l.pages) && l.pages.length > 0);
  }

  // Which layout suits the screen right now: upright -> vertical, lying down -> horizontal.
  const autoSize = () => (window.innerHeight > window.innerWidth ? 'phone' : 'tablet');
  const pageSize = (pg) => (pg.skin ? pg.size : pg.cols > pg.rows ? 'tablet' : 'phone');
  // text printed on the panel follows the panel's own language, not the app menus
  const panelText = () => PANEL_TEXT[layout().lang] || PANEL_TEXT.en;

  function layout() { return S.store.layouts.find((l) => l.id === S.store.activeId) || S.store.layouts[0]; }

  // ---- Settings shared by every panel -----------------------------------------------------------
  // Language, speed unit, gear display, backlight, key names, auto-rotate and the key bindings are
  // the player's own, not a panel's: they live once in store.prefs and are copied onto every panel
  // (the rest of the app keeps reading them from the panel). Changing one on any panel changes it
  // on all of them, and a panel added later starts with the same settings.
  const GLOBAL_KEYS = ['lang', 'units', 'temp', 'gearCrawlers', 'lights', 'cabin', 'brightness', 'names', 'keyLabels', 'pictograms', 'labelFont', 'autoRotate', 'obdTheme'];
  const LABEL_FONTS = [
    ['barlow', 'Barlow Condensed'],
    ['share', 'Share Tech Mono'],
    ['arialn', 'Arial Narrow'],
    ['roboto', 'Roboto Condensed'],
    ['oswald', 'Oswald'],
  ];
  function ensurePrefs() {
    const st = S.store;
    let migrated = false;
    // panels added after the first release: offer them to devices that were set up earlier
    for (const id of ['eu_frame', 'sov_frame']) {
      if (st.layouts.some((l) => l.preset === id)) continue;
      const made = createLayoutFromPreset(id, autoSize(), loadSetup());
      made.gen = LAYOUT_GEN;
      st.layouts.push(made);
    }
    // the screen-mirror GPS was retired: take its widget and settings out of saved panels
    for (const l of st.layouts) {
      delete l.gps; delete l.gpsUrl; if (l.screen) delete l.screen;
      for (const pg of l.pages || []) {
        if (pg.widgets) {
          for (const w of pg.widgets) {
            if (w.t === 'radio') { w.t = 'radio_widget'; migrated = true; }
          }
          if (!pg.skin) pg.widgets = pg.widgets.filter((w) => w.t !== 'gps');
        }
      }
    }
    if (!st.prefs) {
      const a = st.layouts.find((l) => l.id === st.activeId) || st.layouts[0];
      // panels used to keep their own bindings: merge them all, the open panel winning a clash
      const binds = Object.assign.apply(null, [{}].concat(st.layouts.filter((l) => l !== a).map((l) => l.binds || {}), [a.binds || {}]));
      st.prefs = { lang: ['pt', 'de', 'es', 'fr'].includes(a.lang) ? a.lang : 'en', units: a.units === 'mph' ? 'mph' : 'kmh',
        gearCrawlers: gearboxKey(a.gearCrawlers), lights: a.lights || 'auto', cabin: a.cabin || 'off', brightness: a.brightness || 'auto',
        temp: a.temp === 'f' ? 'f' : 'c',
        names: a.names || 'show', keyLabels: a.keyLabels || 'show', pictograms: a.pictograms || 'show',
        labelFont: a.labelFont || 'barlow', autoRotate: a.autoRotate !== false, obdTheme: a.obdTheme || 'v8-blue', binds };
    }
    if (!st.prefs.obdTheme) st.prefs.obdTheme = 'v8-blue';   // devices set up before the OBD theme engine shipped
    if (!st.prefs.keyLabels) st.prefs.keyLabels = st.prefs.names || 'show';
    if (!st.prefs.pictograms) st.prefs.pictograms = 'show';
    if (!st.prefs.labelFont) st.prefs.labelFont = 'barlow';
    // One-off: auto-rotate was left switched off on devices set up while the vertical panels were being
    // reworked, which keeps the horizontal art on an upright screen. Turn it back on once; the player can
    // still switch it off again in the menu.
    if (st.prefs && !st.prefs.rotReset) { st.prefs.autoRotate = true; st.prefs.rotReset = 1; }
    applyPrefs();
    return migrated;
  }
  function applyPrefs() {
    const pr = S.store.prefs;
    if (!pr) return;
    for (const l of S.store.layouts) {
      for (const k of GLOBAL_KEYS) l[k] = pr[k];
      l.binds = Object.assign({}, pr.binds);
    }
    app.dataset.obdTheme = pr.obdTheme || 'v8-blue';
  }
  function setPref(key, value) { S.store.prefs[key] = value; save(); }

  function page() {
    const l = layout();
    S.page = clamp(S.page, 0, l.pages.length - 1);
    return l.pages[S.page];
  }

  // ---- Art pages -----------------------------------------------------------------------------
  // An art page is a picture with a map of touch areas and live readouts over it. The map
  // lives in skins.js; the page itself only remembers what the player changed on single keys
  // (`over`), so a corrected map reaches panels that were saved before the correction.
  const SKIN_PATH = 'skins/';
  // Picture shown for a panel in the gallery and in the lists. Painted panels are their own
  // picture. Frame panels (empty plate + keys drawn by the app) normally ship a capture of the
  // finished panel: skins/<id>-<cut>v.jpg, listed here with its aspect ratio. Modern uses its
  // canonical background pair instead; a cut with no capture borrows the landscape one.
  const PREVIEWS = { eu_frame: { T: 2752 / 1536, P: 1152 / 1728 }, sov_frame: { T: 2752 / 1536, P: 1536 / 2752 }, scania25_frame: { T: 1.792 } };
  function sovBgOf(l) {
    // Always normalize so aliases (380/378, SigaBem, …) resolve before the whitelist.
    return normalizeSovBg((l && l.sovBg) || 'white');
  }
  // Empty-plate background for frame skins. Modern uses the leather pair; Soviet uses one of
  // the parked variants under skins/sov/bg/ (default white enamel). layoutRef lets the gallery
  // preview each panel's own sovBg instead of the active layout's.
  const panelAsset = (skinId, cut, hideNames, layoutRef) => {
    if (skinId === 'eu_frame') {
      return SKIN_PATH + 'modern/' + (cut === 'P' ? 'bg-portrait.jpg' : 'bg-landscape.jpg');
    }
    if (skinId === 'sov_frame') {
      const variant = sovBgOf(layoutRef || layout());
      return SKIN_PATH + 'sov/bg/bg-' + variant + '-' + (cut === 'P' ? 'portrait' : 'landscape') + '.jpg';
    }
    return SKIN_PATH + skinId + '-' + cut + (hideNames ? 'n' : '') + '.jpg';
  };
  const previewOf = (skinId, cut, layoutRef) => {
    const pv = PREVIEWS[skinId];
    if (pv) {
      const c = pv[cut] ? cut : 'T';
      const usePlate = skinId === 'eu_frame' || skinId === 'sov_frame';
      return { src: usePlate ? panelAsset(skinId, c, false, layoutRef) : SKIN_PATH + skinId + '-' + c + 'v.jpg', ar: pv[c] };
    }
    return { src: panelAsset(skinId, cut, false, layoutRef), ar: SKINS[skinId][cut].ar };
  };
  const skinCut = (pg) => (pg.size === 'phone' ? 'P' : 'T');
  const skinOf = (pg) => (pg.skin && SKINS[pg.skin] ? SKINS[pg.skin][skinCut(pg)] : null);
  // A saved Layout Editor zone becomes the same widget shape frames.js already ships for
  // eu_frame's fixed dash-speedometer (gps/hero) and dash-obd (rtext/two/utility) slots, just
  // positioned by the zone's own r instead of the preset's. On sov_frame, dash-obd is the
  // Soviet VFD (green segment display) — same shape as frames_sov w_info — not the Modern
  // 5-page OBD cluster.
  function dashWidgetFromZone(z, skin) {
    const r = [z.x, z.y, z.w ?? z.width, z.h ?? z.height];
    if (z.type === 'dash-speedometer') {
      return { t: 'gps', hero: 1, r: r, id: z.id };
    }
    if (skin === 'sov_frame') {
      return { t: 'gps', vfd: 1, r: r, id: z.id };
    }
    return { t: 'rtext', two: true, utility: 1, r: r, id: z.id, bg: '#010203', ink: '#d9f4ff' };
  }
  let skinMemo = { key: '', list: [] };
  // Each skin reads only its own board (boardFor(pg.skin)) so eu_frame and sov_frame can
  // never leak into each other. Siga Bem / Viva México (boards.sov_frame) keep normal atomic
  // loading. White / Militar empty-plate boards ALWAYS take the atomic path — even with
  // buttons:[] — so factory spr/sgauge never inherit onto a clean enamel plate.
  function atomicApplies(pg) {
    if (pg.skin !== 'eu_frame' && pg.skin !== 'sov_frame') return false;
    const bg = pg.skin === 'sov_frame' ? sovBgOf(layout()) : null;
    if (pg.skin === 'sov_frame' && isEmptyPlateSovBg(bg)) return true;
    return boardHasButtons(boardFor(pg.skin, bg));
  }
  function widgetsOf(pg) {
    const skin = skinOf(pg);
    if (!skin) return pg.widgets || [];
    const cut = skinCut(pg);
    const useAtomic = atomicApplies(pg);
    const sovBg = pg.skin === 'sov_frame' ? sovBgOf(layout()) : null;
    const emptyPlate = pg.skin === 'sov_frame' && isEmptyPlateSovBg(sovBg);
    const zones = useAtomic ? atomicDashZones(cut, pg.skin) : [];
    const buttons = useAtomic ? atomicDashButtons(cut, pg.skin) : [];
    const buttonsSig = useAtomic ? atomicDashButtonsSig(cut, pg.skin) : '';
    const key = pg.id + cut + (sovBg || '') + JSON.stringify(pg.over || {}) + JSON.stringify(zones) + buttonsSig;
    if (skinMemo.key !== key) {
      // Zones from the editor replace the preset's fixed w_drive/w_media slots wholesale; a
      // saved set of buttons replaces the preset's whole fixed key grid (the upper/brakes/
      // utility/system groups built by modernSet/modernSystem in frames.js) the same way --
      // all or nothing, so a board with no buttons leaves the factory grid byte-for-byte stock.
      // Soviet factory parts (spr/sgauge/VFD) have no `g` group tag — filtering only `!w.g`
      // left them stacked under the atomic board (double gauges + double switches). When the
      // sov_frame board has buttons — OR when white/military empty-plate is active — drop
      // those factory widgets so only empty plate + JSON remain (zero DOM keys if array []).
      let base = zones.length ? skin.w.filter((w) => w.id !== 'w_drive' && w.id !== 'w_media') : skin.w;
      if (pg.skin === 'sov_frame' && (buttons.length || emptyPlate)) {
        base = base.filter((w) => w.t !== 'spr' && w.t !== 'sgauge' && w.t !== 'kbd' && w.t !== 'tell' && w.id !== 'w_info');
      } else if (buttons.length) {
        base = base.filter((w) => !w.g);
      }
      const list = base.concat(zones.map((z) => dashWidgetFromZone(z, pg.skin))).concat(buttons);
      skinMemo = { key, list: list.map((w) => Object.assign({ sk: true }, w, (pg.over || {})[cut + ':' + w.id])) };
    }
    return skinMemo.list;
  }

  // ---- Following screen rotation ------------------------------------------------------------
  // Every art panel exists in two cuts, lying down and upright. Turning the device swaps the
  // cut; key changes are kept per cut, so nothing is lost by turning back.
  function syncOrientation() {
    const l = layout();
    if (S.edit) return false;
    const want = autoSize();
    // autoRotate off freezes a panel on the cut it last used. Soviet was left
    // on the phone cut, so a horizontal screen kept painting the portrait board.
    // That skin follows the screen. Other panels still honour the switch.
    const follow = l.autoRotate !== false;
    let changed = false;
    for (const pg of l.pages) {
      if (!pg.skin || pg.size === want) continue;
      if (follow || pg.skin === 'sov_frame') { pg.size = want; changed = true; }
    }
    return changed;
  }

  // The ten built-in panels are locked: they always look and work as shipped. A player who
  // wants changes takes one as a model, which makes an unlocked copy that is theirs to edit.
  // (Panels saved before the lock existed are the built-in ones: lock them.)
  function lockBuiltIns() {
    for (const l of S.store.layouts) if (l.locked === undefined) l.locked = l.pages.some((p) => p.skin);
  }
  function copyAsModel(l) {
    const copy = JSON.parse(JSON.stringify(l));
    copy.id = uid();
    copy.locked = false;
    const base = l.name + (l.lang === 'pt' ? ' (meu)' : ' (mine)');
    let n = 2;
    copy.name = base;
    while (S.store.layouts.some((x) => x.name === copy.name)) { copy.name = base + ' ' + n; n += 1; }
    S.store.layouts.push(copy);
    S.store.activeId = copy.id;
    return copy;
  }

  // Back to the keys exactly as painted: forget every change made on this panel's art page.
  function resetLayout(l) {
    for (const pg of l.pages) if (pg.skin) pg.over = {};
  }

  // The four built-in panels every installation starts with.
  const SHIPPED_PRESETS = ['eu_frame', 'sov_frame', 'scania_frame', 'scania25_frame'];
  function defaultDashboards(setup) {
    return SHIPPED_PRESETS.map((id) => createLayoutFromPreset(id, autoSize(), setup));
  }

  // Inject any shipped panel the store doesn't have yet (e.g. new premium panels added
  // after the first install). Runs once on load; new panels appear at the end of the list.
  function ensureShippedPanels() {
    const have = new Set(S.store.layouts.map((l) => l.preset));
    let added = 0;
    let renamed = 0;
    for (const id of SHIPPED_PRESETS) {
      if (!have.has(id)) {
        const l = createLayoutFromPreset(id, autoSize(), loadSetup());
        // carry over key bindings from an existing panel so player's custom keybinds apply
        const donor = S.store.layouts[0];
        if (donor && donor.binds) l.binds = Object.assign({}, donor.binds);
        S.store.layouts.push(l);
        added += 1;
      }
    }
    const srPanel = S.store.layouts.find((l) => l.preset === 'scania_frame');
    if (srPanel && /scania/i.test(srPanel.name || '')) { srPanel.name = 'S/R 2016'; renamed = 1; }
    const digitalPanel = S.store.layouts.find((l) => l.preset === 'scania25_frame');
    if (digitalPanel && /scania/i.test(digitalPanel.name || '')) { digitalPanel.name = 'Digital 2025'; renamed = 1; }
    return added + renamed;
  }
  // first run: the Brazilian panel on a Portuguese-language device, the European one elsewhere
  const firstPanel = (list) => list.find((l) => l.preset === (/^pt/i.test(navigator.language || '') ? 'modern_br' : 'modern_eu')) || list[0];

  // One-time upgrade of a store saved by an older version. Earlier versions drew their own
  // dashboards; those are replaced by the ten art panels. What the player configured carries
  // over: key bindings and the gear display.
  function upgradeStore() {
    const old = S.store.layouts.filter((l) => !(l.gen >= LAYOUT_GEN));
    if (!old.length) return 0;
    lsSet('truckdeck.backup', JSON.stringify(S.store)); // one step back, in case it is wanted
    const active = S.store.layouts.find((l) => l.id === S.store.activeId) || old[0];
    const binds = Object.assign.apply(null, [{}].concat(old.map((l) => l.binds || {})));
    const fresh = defaultDashboards(loadSetup());
    for (const l of fresh) {
      l.binds = Object.assign({}, binds);
      if (active.gearCrawlers != null) l.gearCrawlers = active.gearCrawlers;
    }
    S.store.layouts = fresh.concat(S.store.layouts.filter((l) => l.gen >= LAYOUT_GEN));
    // open on the panel that replaces the one that was in use, when there is an obvious one
    S.store.activeId = (fresh.find((l) => l.preset === active.preset) || firstPanel(fresh)).id;
    return fresh.length;
  }

  // ---- Functions, keys and state -----------------------------------------------------------
  // Pieces that show something but are not pressed.
  const PASSIVE = new Set(['display', 'plate', 'gps', 'gauge', 'cgauge', 'sc25', 'sc25bg', 'sc25clock', 'sc25palette', 'scaniapalette', 'radio_widget', 'status', 'live', 'tell', 'rtext', 'fbar', 'cover', 'knob', 'sticker', 'ign', 'sgauge', 'lens']);

  // Resolve a widget to the function it performs, with per-widget overrides applied.
  function fnOf(w) {
    if (PASSIVE.has(w.t)) return null;
    // Atomic lamp telltales (w.lamp): passive, no keys. Lamp-only ids (not in FUNCTIONS) also
    // resolve here so over_speed_alert etc. light without becoming pressable catalog keys.
    // Shared ids (parking_brake, high_beam, diff_lock, trailer_brake) stay catalog commands
    // unless the widget is explicitly a lamp asset.
    const lampId = w.lamp
      ? resolveLampIndicatorId(w.fn)
      : (LAMP_INDICATORS[w.fn] && !FUNCTIONS[w.fn] ? w.fn : '');
    if (lampId && LAMP_INDICATORS[lampId]) {
      const ind = LAMP_INDICATORS[lampId];
      return {
        id: lampId,
        name: lampId,
        label: w.label != null ? w.label : lampId,
        icon: 'dot',
        keys: [],
        mode: 'tap',
        latch: true,
        tel: ind.tel,
        led: 'green',
        bind: false,
        behavior: ind.behavior
      };
    }
    const base = w.fn === 'custom' || !FUNCTIONS[w.fn]
      ? { id: 'custom', name: 'Custom key', label: 'CUSTOM', icon: 'dot', keys: [], mode: 'tap', latch: false, tel: null, led: 'green', bind: false }
      : FUNCTIONS[w.fn];
    const f = Object.assign({}, base);
    const labs = LABELS_BY_LANG[layout().lang]; if (labs && labs[base.id]) f.label = labs[base.id];
    if (w.label != null) f.label = w.label;
    if (w.icon) f.icon = w.icon;
    if (w.led) f.led = w.led;
    if (base.id === 'custom') {
      f.keys = w.keys || [];
      f.mode = w.mode || 'tap';
      f.latch = !!w.latch;
    }
    return f;
  }

  // Keys are bound per panel, not per button: rebinding "High beam" once fixes every
  // button that uses it, and each panel can match a different game profile.
  function keysOf(w) {
    if (w.fn === 'custom' || !FUNCTIONS[w.fn]) return w.keys || [];
    return layout().binds[w.fn] || FUNCTIONS[w.fn].keys;
  }

  function telValue(key) {
    const t = S.tel;
    if (!t || !t.sdk) return undefined;
    if (key === 'lightsOn') return !!(t.low || t.parking);
    if (key === 'high') return !!(t.high || t.highBeam);
    if (key === 'parking') return !!(t.parking || t.parkingLights);
    if (key === 'retarderOn') return t.retarder > 0;
    // warning lamps of the painted telltale rows
    // (the truck's own warning flags when the helper sends them, a threshold otherwise)
    if (key === 'airlow') return t.airWarn !== undefined ? t.airWarn : t.air < 65;
    if (key === 'check') return !!(t.oilWarn || t.waterWarn) || t.dmgTruck >= 10;
    if (key === 'batt') return t.battWarn !== undefined ? t.battWarn || (!!t.electric && !t.engine) : !!t.electric && !t.engine;
    // Lamp-indicator derived flags (editor LAMP_TELEMETRY → app interpreter).
    if (key === 'blinkEither') return !!(t.blinkL || t.blinkR);
    if (key === 'speedWarn') return t.limit > 0.5 && Math.abs(t.speed) > t.limit;
    if (key === 'engineStalled') return !!(t.electric && !t.engine && (Number(t.rpm) || 0) === 0);
    if (key === 'trailerBrake') return t.trailerBrake !== undefined ? !!t.trailerBrake : false; // stub: SDK gap
    if (key === 'engine') return t.engine !== undefined ? !!t.engine : (Number(t.rpm) || 0) > 0;
    // `diff` passes through t.diff when the helper sends it (frames_scania25 already maps diffLock).
    return t[key];
  }

  // 0 = off, 1 = auto, 2 = parking/dash, 3 = low beam. The SDK only reports parking/low-beam
  // booleans (no "auto"), so a live frame collapses to 0/2/3. A click holds its detent until
  // that frame leaves the stage the click started from.
  // SDK stage, or null when the game is not reporting. Never reads the click hold.
  function telLightStage() {
    const t = S.tel && S.tel.sdk ? S.tel : null;
    return t ? (t.low ? 3 : t.parking ? 2 : 0) : null;
  }
  // Stage the last lights-rotary click asked for, while telemetry is still on the stage
  // that click left. Null once the game confirms or moves somewhere else.
  function unconfirmedLightStage() {
    const h = S.lightHold;
    if (!h || h.stage == null) return null;
    const live = telLightStage();
    if (live === null || live === h.from) return h.stage;
    return null;
  }
  function lightStage() {
    const held = unconfirmedLightStage();
    if (held !== null) return held;
    const live = telLightStage();
    return live === null ? (S.lightLocal || 0) : live;
  }

  // ---- Rotary selector (sov_rotary_base + pin) ---------------------------------------------
  // `stage` is the ENGINE's own stage number for that function, never a private counter:
  //   lights → lightStage() 0=off 1=auto 2=parking 3=low  (1 only reachable offline: the SDK
  //            has no "auto" flag, so live truth collapses to 0/2/3 — see lightStage)
  //   wipers → 0..3 speed count (the game key cycles; the SDK only reports a boolean)
  // A state with stage:null never lights up from telemetry — it stays a mirror position.
  const ROTARY_PRESETS = {
    // Angles measured off the printed legends of sov_rotary_dial.png (0deg = 12 o'clock, cw +):
    //   crossed headlight +58 (off) | AUTO 0 | bulb -66 (parking) | low beam 180.
    // No label/icon: this housing already carries its own silkscreen, so the CSS crown stays empty.
    lights: [
      { id: 'off', stage: 0, deg: 58 },
      { id: 'auto', stage: 1, deg: 0 },
      { id: 'parking', stage: 2, deg: -66 },
      { id: 'low', stage: 3, deg: 180 }
    ],
    wipers: [
      { id: 'off', stage: 0, deg: -90, label: '0' },
      { id: 'w1', stage: 1, deg: 0, label: 'I' },
      { id: 'w2', stage: 2, deg: 45, label: 'II' },
      { id: 'w3', stage: 3, deg: 90, label: 'III' }
    ],
    // Modern housings (Pacote Moderno only). Angles measured on the printed legends.
    // Lights art is AUTO / bulb / dipped-beam D — three detents, not the Soviet four.
    mod_lights: [
      { id: 'auto', stage: 1, deg: 0 },
      { id: 'lamp', stage: 2, deg: -68.2 },
      { id: 'beam', stage: 3, deg: 179 }
    ],
    // Wipers art: AUTO at 3 o'clock, normal at 12, fast at 9, OFF at 6.
    // Click order is that list. stage 0 is only the telemetry-off detent.
    mod_wipers: [
      { id: 'auto', stage: 1, deg: 91.4 },
      { id: 'norm', stage: 2, deg: 0.6 },
      { id: 'fast', stage: 3, deg: -84.8 },
      { id: 'off', stage: 0, deg: 180 }
    ]
  };
  // Icons come from the shared catalog only (allowlist); an unknown name draws nothing instead
  // of a placeholder dot, so a typo in the JSON fails visibly.
  function rotaryIcon(name) {
    const key = String(name || '');
    return (key && typeof ICONS !== 'undefined' && ICONS[key]) ? key : '';
  }
  function rotaryPresetList(fnId, assetKey) {
    const key = String(assetKey || '');
    if (/mod_rotary_lights/i.test(key)) return ROTARY_PRESETS.mod_lights;
    if (/mod_rotary_wipers/i.test(key)) return ROTARY_PRESETS.mod_wipers;
    return ROTARY_PRESETS[fnId];
  }
  function normalizeRotaryStates(raw, fnId, assetKey) {
    const list = Array.isArray(raw) && raw.length ? raw : rotaryPresetList(fnId, assetKey);
    if (!Array.isArray(list) || !list.length) return [];
    return list.slice(0, 8).map((s, i) => {
      const src = s && typeof s === 'object' ? s : {};
      const stage = Number(src.stage);
      return {
        id: String(src.id || ('p' + i)),
        stage: Number.isFinite(stage) ? stage : null,
        deg: Number.isFinite(Number(src.deg)) ? Number(src.deg) : (i * 45 - 90),
        label: String(src.label == null ? '' : src.label).slice(0, 6),
        icon: rotaryIcon(src.icon)
      };
    });
  }
  // Live stage for a rotary's function. For lights this is raw telemetry (null offline);
  // the click hold is applied in rotaryIndex / lightStage, not here.
  function rotaryStage(w, f) {
    if (f && f.id === 'lights') return telLightStage();
    if (f && f.id === 'wipers') {
      const live = telValue('wipers');
      if (live === false) return 0;
      if (live === true) return clamp(Number(S.wipLvl) || 1, 1, 3);
      return clamp(Number(S.wipLvl) || 0, 0, 3);
    }
    return null;
  }
  // 1 = wipers reported on, 0 = reported off, null = no telemetry. Ignores the local speed count.
  function telWiperOn() {
    const live = telValue('wipers');
    if (live === true) return 1;
    if (live === false) return 0;
    return null;
  }
  function rotaryIndex(w, f) {
    const states = w.states || [];
    if (!states.length) return 0;
    const local = S.rotLocal[w.id];
    // Modern wiper: hold the clicked detent until the on/off bit actually changes.
    // wipLvl is not the hold key — writing it would release the pin on the same frame.
    if (w.modRotary === 'wipers') {
      const tel = telWiperOn();
      if (local && local.index != null && (tel === null || tel === local.telFrom)) {
        return clamp(Number(local.index) || 0, 0, states.length - 1);
      }
      if (local && local.index != null) delete S.rotLocal[w.id];
      const stage = tel === 1 ? clamp(Number(S.wipLvl) || 1, 1, 3) : 0;
      let best = -1;
      for (let i = 0; i < states.length; i += 1) {
        const st = states[i].stage;
        if (st === null) continue;
        if (st === stage) return i;
        if (st < stage && (best < 0 || st > states[best].stage)) best = i;
      }
      return best < 0 ? 0 : best;
    }
    const lights = !!(f && f.id === 'lights');
    // Hold the detent until telemetry leaves the stage the click started from.
    // A 1.5s timeout snapped the pin back when the game never applied the key.
    const live = lights ? telLightStage() : rotaryStage(w, f);
    if (local && local.index != null && (live === null || live === local.from)) {
      return clamp(Number(local.index) || 0, 0, states.length - 1);
    }
    if (local && local.index != null) {
      delete S.rotLocal[w.id];
      if (lights) S.lightHold = null;
    }
    const stage = lights ? (live === null ? (S.lightLocal || 0) : live) : live;
    if (stage === null || !states.some((s) => s.stage !== null)) {
      return clamp(Number(local && local.index != null ? local.index : 0) || 0, 0, states.length - 1);
    }
    let best = -1;
    for (let i = 0; i < states.length; i += 1) {
      const st = states[i].stage;
      if (st === null) continue;
      if (st === stage) return i;
      if (st < stage && (best < 0 || st > states[best].stage)) best = i;
    }
    return best < 0 ? 0 : best;
  }

  // Lamps are passive (keys:[]), so they never build a latch of their own: when the helper
  // never reports the field the telltale would stay dark forever. These mirror the control
  // the driver actually pressed. Only consulted when telemetry is undefined — a reported
  // false always wins (see isOn).
  const LAMP_FALLBACK = {
    hazard_alert: () => !!S.latched.hazard,
    high_beam: () => !!S.latched.high_beam,
    parking_brake: () => !!S.latched.parking_brake,
    low_beam: () => (S.lightLocal || 0) >= 3,
    parking_lights: () => (S.lightLocal || 0) >= 2
  };

  function isOn(w) {
    const f = fnOf(w);
    if (!f) return false;
    // Lights rotary: the clicked detent owns these lamps until telemetry leaves `from`.
    if (f.id === 'low_beam' || f.id === 'parking_lights') {
      const held = unconfirmedLightStage();
      if (held !== null) return f.id === 'low_beam' ? held >= 3 : held >= 2;
    }
    // Truth comes from the game whenever it reports this state...
    const live = f.tel ? telValue(f.tel) : undefined;
    if (live !== undefined) return !!live;
    // ...otherwise from our own memory of the last press (can drift if the key is also
    // pressed on the keyboard; unavoidable without telemetry).
    const mirror = LAMP_FALLBACK[f.id];
    if (mirror) return mirror();
    if (f.latch) return !!S.latched[f.id === 'custom' ? w.id : f.id];
    return S.pressed.has(w.id);
  }

  // Short buzz under the finger. Needs the VIBRATE permission inside the Android app; where
  // the device or browser has no vibration this quietly does nothing.
  function buzz(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* not allowed */ } }
  }

  // ---- Bridge ------------------------------------------------------------------------------
  let sendChain = Promise.resolve();
  function send(action, keys) {
    if (!keys || !keys.length || S.bridge !== 'ok') return;
    // Requests are chained so a fast press/release pair can never arrive as release/press.
    sendChain = sendChain.then(() => {
      const t0 = performance.now();
      return fetch('api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Pin': S.pin },
        body: JSON.stringify({ action, keys }),
      }).then((r) => {
        if (r.status === 401) { setBridge('pin'); return; }
        S.lat = Math.round(performance.now() - t0);   // round-trip of the last key press, shown in the status pill
        renderStatus();
      }, () => setBridge('lost'));
    });
  }

  function setBridge(state) {
    if (S.bridge === state) return;
    S.bridge = state;
    if (state !== 'ok') S.lat = null;
    renderStatus();
    updateStates();
    if (state === 'lost') setTimeout(connect, 3000);
  }

  // Fired when the bridge broadcasts 'atomic-layout' (the Editor just saved): pulls the new
  // board and repaints immediately, instead of waiting for this tablet's next full connect().
  function refetchAtomicLayout() {
    fetchJson('api/atomic-layout', { headers: { 'X-Pin': S.pin } }).then((atomicRes) => {
      if (atomicRes && atomicRes.status === 200 && applyAtomicLayoutPayload(atomicRes.body)) {
        preferAtomicModern();
        renderAll();
      }
    }).catch(() => {});
  }

  let events = null;
  function openEvents() {
    if (events) events.close();
    events = new EventSource('api/events?pin=' + encodeURIComponent(S.pin));
    events.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === 'tel') { S.tel = msg; renderStatus(); updateStates(); }
      else if (msg.type === 'media') { S.media = msg; updateStates(); }
      else if (msg.type === 'pad') {
        S.lastPad = msg.btn;
        const lay = layout(), sc = lay.sc25 || {};
        if (S.padLearn) { S.padLearn = false; lay.sc25 = lay.sc25 || {}; lay.sc25.padBtn = msg.btn; save(); toast('Controller button ' + msg.btn + ' now changes the cluster screen.'); }
        else {
          S.dashAuto = !!msg.auto;
          const manual = !msg.auto && sc.padBtn !== undefined && sc.padBtn !== '' && msg.btn === Number(sc.padBtn);
          if ((msg.dash || manual) && !(S.tel && S.tel.paused)) {
            document.querySelectorAll('.k-sc25').forEach((n) => n._sc25 && n._sc25.step(1));
            document.querySelectorAll('.scania-obc').forEach((n) => cycleScania(n));
            // Modern OBD (eu_frame utility) — same pad channel as S/R 2016; do not touch scania lines above.
            document.querySelectorAll('.k-rtext.modern-utility').forEach((n) => cycleModernObd(n));
          }
        }
      }
      else if (msg.type === 'atomic-layout') refetchAtomicLayout();
      else if (msg.type === 'error') toast(msg.msg);
      else if (msg.type === 'localAction' && msg.action === 'obd_page_next') {
        document.querySelectorAll('.k-rtext.modern-utility').forEach((n) => cycleModernObd(n));
      }
    };
    events.onerror = () => {
      // EventSource retries by itself; only the status pill needs to know.
      if (S.bridge === 'ok') { S.tel = { sdk: false }; setBridge('lost'); }
    };
  }

  function fetchJson(url, options, timeoutMs) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs || 3000);
    return fetch(url, Object.assign({ signal: ctl.signal }, options || {}))
      .then((r) => r.json().then((body) => ({ status: r.status, body })))
      .finally(() => clearTimeout(timer));
  }

  // Look for the bridge on the same origin that served the page. Opened as a plain file or
  // as a hosted preview there is none: the app then runs as a demo with nothing sent.
  // A page left open keeps running the code it loaded, while pictures are fetched fresh: after
  // an update on the PC that mix shows keys in the wrong places. So the page checks which
  // version the PC is serving and reloads itself when it is not the one it is running.
  let reloadTried = false;
  function checkVersion() {
    if (reloadTried || !window.TRUCKDECK_VERSION) return;
    fetch('index.html?t=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).then((html) => {
      const m = /TRUCKDECK_VERSION = "([^"]+)"/.exec(html);
      if (m && m[1] !== window.TRUCKDECK_VERSION && !S.edit) { reloadTried = true; location.reload(); }
    }).catch(() => {});
  }
  setInterval(checkVersion, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });

  // Dispatch alert: takes over the music player's own display box, scrolling right-to-left
  // exactly 3 times (CSS animation-iteration-count: 3), then restores the normal track/artist
  // view on animationend — same box, no separate footer element.
  function showCompanyMessage(text) {
    document.querySelectorAll('.company-message').forEach((el) => {
      el.textContent = text;
      const player = el.closest('.obd-media');
      if (player) player.classList.remove('alert');
      el.classList.remove('active');
      void el.offsetWidth; // reflow so re-adding 'active' restarts the animation
      el.classList.add('active');
      if (player) player.classList.add('alert');
    });
  }
  window.showCompanyMessage = showCompanyMessage;
  document.addEventListener('animationend', (ev) => {
    if (ev.target.classList && ev.target.classList.contains('company-message')) {
      ev.target.classList.remove('active');
      const player = ev.target.closest('.obd-media');
      if (player) player.classList.remove('alert');
    }
  });

  function connect() {
    // `stage` records how far the handshake got. The catch below covers the WHOLE
    // chain - not just the two fetches, but the store upgrade and the first render
    // too - so an exception thrown long after the bridge answered correctly used to
    // land the app in 'demo' with no trace of why. Keep this breadcrumb.
    let stage = 'api/info';
    return fetchJson('api/info').then((info) => {
      if (!info.body || info.body.app !== 'truckdeck') throw new Error('not a bridge');
      // Loopback /api/info may include pin so local SSE/key work without ?pin=
      if (!S.pin && info.body.pin) {
        S.pin = String(info.body.pin);
        lsSet('truckdeck.pin', S.pin);
      }
      checkVersion();
      stage = 'api/layouts';
      // Fetched alongside the layout store, not after it: the Layout Editor is the source of
      // truth for the Modern board, so a tablet that never opened the editor still needs the
      // PC's saved buttons/zones on every (re)connect, not just on its own first boot.
      return Promise.all([
        fetchJson('api/layouts', { headers: { 'X-Pin': S.pin } }),
        fetchJson('api/atomic-layout', { headers: { 'X-Pin': S.pin } }).catch(() => null),
      ]);
    }).then(([res, atomicRes]) => {
      if (res.status === 401) { setBridge('pin'); return; }
      stage = 'store';
      S.bridge = 'ok';
      // A failed fetch, a 401, or an empty/invalid body must leave the existing localStorage
      // board alone - this only ever replaces it with a validly-schemed payload from the PC.
      const atomicChanged = atomicRes && atomicRes.status === 200
        && applyAtomicLayoutPayload(atomicRes.body);
      if (validStore(res.body)) {
        // The PC copy wins: it is what every device shares.
        S.store = res.body;
        lockBuiltIns();
        const upgraded = upgradeStore();
        const injected = ensureShippedPanels();
        const migrated = ensurePrefs();
        // PC store may point at a non-Modern panel; re-prefer atomic board after sync.
        preferAtomicModern();
        lsSet('truckdeck.store', JSON.stringify(S.store));
        if (injected || migrated) save();
        S.sel = null;
        S.page = 0;
        renderAll();
        if (upgraded) { save(); toast('Your panels were replaced by the ten art panels'); }
      } else {
        preferAtomicModern();
        if (atomicChanged) renderAll();
        save(); // first run: seed the PC with this device's panels
      }
      stage = 'events';
      openEvents();
      renderStatus();
      stage = 'done';
    }).catch((e) => {
      // Never swallow this again: without the reason, a perfectly healthy bridge
      // is indistinguishable from no bridge at all.
      console.error('[bridge] connect failed at stage "' + stage + '":',
        (e && (e.stack || e.message)) || e);
      if (S.bridge === 'lost') setTimeout(connect, 3000);
      else setBridge('demo');
    });
  }

  // ---- Rendering ---------------------------------------------------------------------------
  function labelHtml(text) { return esc(text).replace(/\n/g, '<br>'); }

  // ---- Analog dials -------------------------------------------------------------------------
  // Per-skin gauge overrides: only the fields that differ from the generic defaults.
  // Scania S-series: tachometer reads 0-25 (×100), eco zone 1000-1400, red zone 2100-2500.
  // Air warning threshold aligned with SDK airPressureWarning (65 psi).
  const GAUGE_OVERRIDES = {
    scania_frame: {
      rpm:  { max: 2500, bands: [[1000, 1400, 'eco'], [2100, 2500, 'red']] },
      air:  { bands: [[0, 65, 'red']] },
    },
  };

  // One generic dial: 270 degrees of sweep starting bottom-left, like a mechanical VDO-style
  // instrument. Each field only supplies its scale; per-skin overrides refine it.
  function gaugeSpec(field) {
    const mph = layout().units === 'mph';
    let spec;
    switch (field) {
      case 'rpm': spec = { max: 3000, major: 500, minor: 100, unit: panelText().unitRpm, text: (v) => v / 100, bands: [[1000, 1500, 'eco'], [2400, 3000, 'red']] }; break;
      case 'fuel': spec = { max: 1, major: 0.5, minor: 0.25, unit: panelText().unitFuel, text: (v) => (v === 0 ? panelText().fuelEmpty : v === 1 ? panelText().fuelFull : '\u00bd'), bands: [[0, 0.12, 'red']] }; break;
      case 'air': spec = { max: 150, major: 30, minor: 10, unit: panelText().unitAir, text: (v) => v, bands: [[0, 60, 'red']] }; break;
      default: spec = mph
        ? { max: 90, major: 10, minor: 5, unit: 'MPH', text: (v) => v, bands: [] }
        : { max: 140, major: 20, minor: 10, unit: 'KM/H', text: (v) => v, bands: [] };
    }
    // Apply per-skin overrides (merge shallow: bands and max replace, rest stays)
    const ov = GAUGE_OVERRIDES[layout().style];
    if (ov && ov[field]) Object.assign(spec, ov[field]);
    return spec;
  }

  const SWEEP_START = 135; // degrees clockwise from "3 o'clock" (SVG y axis points down)
  const SWEEP = 270;
  const gaugeAngle = (spec, value) => SWEEP_START + SWEEP * clamp(value / spec.max, 0, 1);
  const polar = (r, deg) => [100 + r * Math.cos(deg * Math.PI / 180), 100 + r * Math.sin(deg * Math.PI / 180)];
  const pt = (r, deg) => polar(r, deg).map((n) => n.toFixed(1)).join(' ');

  function gaugeSvg(field) {
    const spec = gaugeSpec(field);
    let marks = '';
    for (const band of spec.bands) {
      const a0 = gaugeAngle(spec, band[0]);
      const a1 = gaugeAngle(spec, band[1]);
      marks += '<path class="band ' + band[2] + '" d="M' + pt(80, a0) + 'A80 80 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + pt(80, a1) + '"/>';
    }
    // integer step count avoids drifting on fractional scales (fuel: 0.25 steps)
    const steps = Math.round(spec.max / spec.minor);
    const perMajor = Math.round(spec.major / spec.minor);
    for (let i = 0; i <= steps; i += 1) {
      const v = i * spec.minor;
      const a = gaugeAngle(spec, v);
      const major = i % perMajor === 0;
      marks += '<path class="' + (major ? 'tick major' : 'tick') + '" d="M' + pt(major ? 70 : 76, a) + 'L' + pt(86, a) + '"/>';
      if (major) {
        const p = polar(55, a);
        marks += '<text class="num" x="' + p[0].toFixed(1) + '" y="' + (p[1] + 6).toFixed(1) + '">' + esc(spec.text(v)) + '</text>';
      }
    }
    return '<svg viewBox="0 0 200 200" aria-hidden="true"><circle class="face" cx="100" cy="100" r="92"/>' + marks +
      '<text class="unit" x="100" y="176">' + esc(spec.unit) + '</text>' +
      '<g class="needle"><path d="M84 97L172 100L84 103z"/></g><circle class="hub" cx="100" cy="100" r="9"/></svg>';
  }

  // ---- Compound gauge (Scania-style) ---------------------------------------------------------
  // Full instrument with analog arc + digital readouts in the center, rendered as one SVG
  // plus overlay DOM elements for the digital data (speed/odo for speedo, clock/temps for tacho).
  // The SVG uses a 200×200 viewBox; DOM overlays are positioned absolutely over the widget.
  function cgaugeSvg(w) {
    const max = w.max || 120;
    const major = w.major || 20;
    const minor = w.minor || 10;
    const bands = w.bands || [];
    const variant = w.variant || 'speedo';
    const unit = w.unit || 'km/h';

    // Arc geometry: 270° sweep starting at 135° (7 o'clock position)
    const startAngle = 135;
    const sweepDeg = 270;
    const valAngle = (v) => startAngle + sweepDeg * clamp(v / max, 0, 1);

    let svg = '';

    // Dark face circle with subtle gradient
    svg += '<defs>';
    svg += '<radialGradient id="cg_face_' + w.id + '" cx="50%" cy="48%" r="50%">';
    svg += '<stop offset="0%" stop-color="var(--scania-face-center,#1a1d22)"/>';
    svg += '<stop offset="54%" stop-color="#101114"/>';
    svg += '<stop offset="100%" stop-color="#050607"/>';
    svg += '</radialGradient>';
    // Chrome bezel gradient
    svg += '<linearGradient id="cg_bezel_' + w.id + '" x1="0" y1="0" x2="0" y2="1">';
    svg += '<stop offset="0%" stop-color="#888c94"/>';
    svg += '<stop offset="50%" stop-color="#50545a"/>';
    svg += '<stop offset="100%" stop-color="#2a2d32"/>';
    svg += '</linearGradient>';
    svg += '<linearGradient id="cg_facebezel_' + w.id + '" x1="0" y1="0" x2="0" y2="1">';
    svg += '<stop offset="0%" stop-color="#755e50"/><stop offset="16%" stop-color="#45372f"/><stop offset="55%" stop-color="#171311"/><stop offset="88%" stop-color="#30241e"/><stop offset="100%" stop-color="#090807"/>';
    svg += '</linearGradient>';
    svg += '<linearGradient id="cg_needle_' + w.id + '" gradientUnits="userSpaceOnUse" x1="97" y1="40" x2="103" y2="40">';
    svg += '<stop offset="0%" stop-color="color-mix(in srgb,var(--scania-needle,#dd3d49) 55%,#050505)"/><stop offset="25%" stop-color="var(--scania-needle,#dd3d49)"/><stop offset="48%" stop-color="var(--scania-needle-glint,#ffd1c2)"/><stop offset="55%" stop-color="var(--scania-accent,#d9943c)"/><stop offset="72%" stop-color="var(--scania-needle,#dd3d49)"/><stop offset="100%" stop-color="color-mix(in srgb,var(--scania-needle,#dd3d49) 55%,#050505)"/>';
    svg += '</linearGradient>';
    svg += '</defs>';

    // Round instrument housing: three concentric circles restore the classic circular bezel.
    svg += '<circle class="cg-housing-shadow" cx="100" cy="102" r="96" fill="#030303"/>';
    svg += '<circle class="cg-housing" cx="100" cy="100" r="96" fill="url(#cg_bezel_' + w.id + ')" stroke="#080808" stroke-width="1.5"/>';
    svg += '<circle cx="100" cy="100" r="92.5" fill="none" stroke="url(#cg_facebezel_' + w.id + ')" stroke-width="3.2"/>';
    svg += '<circle cx="100" cy="100" r="89" fill="url(#cg_face_' + w.id + ')" stroke="#1a1715" stroke-width="1.1"/>';
    svg += '<path d="M38 37 A88 88 0 0 1 162 37" fill="none" stroke="rgba(255,224,199,.20)" stroke-width="1.2"/>';

    // Color bands (eco blue, red danger)
    for (const band of bands) {
      const a0 = valAngle(band[0]);
      const a1 = valAngle(band[1]);
      const large = (a1 - a0) > 180 ? 1 : 0;
      const color = band[2] === 'eco' ? '#1a6bc4' : band[2] === 'red' ? '#cc2020' : '#888';
      // outer arc band
      svg += '<path d="M' + pt(88, a0) + 'A88 88 0 ' + large + ' 1 ' + pt(88, a1) + '" fill="none" stroke="' + color + '" stroke-width="5" stroke-linecap="butt" opacity="0.85"/>';
    }

    // Tick marks and numbers
    const steps = Math.round(max / minor);
    const perMajor = Math.round(major / minor);
    for (let i = 0; i <= steps; i++) {
      const v = i * minor;
      const a = valAngle(v);
      const isMajor = (i % perMajor) === 0;
      const innerR = isMajor ? 72 : 79;
      const outerR = 86;
      const strokeW = isMajor ? 2 : 0.8;
      const color = isMajor ? '#d0d4da' : '#606468';
      svg += '<line x1="' + polar(innerR, a)[0].toFixed(1) + '" y1="' + polar(innerR, a)[1].toFixed(1) +
        '" x2="' + polar(outerR, a)[0].toFixed(1) + '" y2="' + polar(outerR, a)[1].toFixed(1) +
        '" stroke="' + color + '" stroke-width="' + strokeW + '"/>';

      if (isMajor) {
        // Number labels at major ticks
        const labelR = 62;
        const p = polar(labelR, a);
        const label = variant === 'tacho' ? String(v / 100) : String(v);
        svg += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 1).toFixed(1) +
          '" text-anchor="middle" dominant-baseline="central" fill="#c8ccd2" font-size="' +
          (variant === 'tacho' ? '11' : '10') + '" font-family="Arial,sans-serif">' + esc(label) + '</text>';
      }
    }

    // Unit label near the top of the dial
    if (variant === 'speedo') {
      svg += '<text x="100" y="32" text-anchor="middle" fill="#707478" font-size="7" font-family="Arial,sans-serif">' + esc(unit) + '</text>';
    } else {
      // tacho: "1/min × 100" at top
      svg += '<text x="100" y="28" text-anchor="middle" fill="#707478" font-size="6.5" font-family="Arial,sans-serif">' + esc(unit) + '</text>';
    }

    // Needle — red, triangular, with shadow
    svg += '<g class="cg-needle" style="transform-box:view-box;transform-origin:100px 100px">';
    svg += '<path d="M97.5 30 L100 18 L102.5 30 L101.2 98 L98.8 98 Z" fill="url(#cg_needle_' + w.id + ')" opacity="0.97"/>';
    svg += '<circle cx="100" cy="100" r="6" fill="#1a1d22" stroke="#444" stroke-width="1.2"/>';
    svg += '</g>';

    return '<svg class="cg-svg" viewBox="0 0 200 200" aria-hidden="true">' + svg + '</svg>';
  }

  // Update a compound gauge's needle and digital readouts every frame.
  // The needle rotates from 0° (rest, 7 o'clock) through 270° of sweep.
  // Digital elements are plain DOM spans updated by text content.
  function updateCgauge(w, node) {
    const dead = deadNow();
    const t = dead ? null : curTel();
    const mph = layout().units === 'mph';
    const pt2 = layout().lang === 'pt';
    const L = (en, p) => (pt2 ? p : en);
    node.classList.toggle('dead', dead);

    // Needle angle: same 270° sweep as the existing gauges
    let rawVal = 0;
    if (t) {
      if (w.field === 'rpm') rawVal = Number(t.rpm) || 0;
      else rawVal = Math.abs(Number(t.speed) || 0) * (mph ? 2.23694 : 3.6);
    }
    const max = w.max || 120;
    // Needle rotation: 0° = resting at 7-o'clock (the SVG needle points straight up at 0°).
    // The arc spans 270° starting from 135° past 12-o'clock — which means the needle's
    // rotation offset from its drawn position (straight up) is -135° at zero and
    // +135° at full scale. Map value → rotation:
    const needleDeg = -135 + 270 * clamp(rawVal / max, 0, 1);
    const needleEl = node.querySelector('.cg-needle');
    if (needleEl) needleEl.style.transform = 'rotate(' + needleDeg.toFixed(1) + 'deg)';

    // Values are displayed on the centre information screen, not over the analogue dial.
    if (w.variant === 'speedo') {
      const spd = t ? Math.round(Math.abs(t.speed) * (mph ? 2.23694 : 3.6)) : 0;
      const speedEl = node.querySelector('.cg-speed');
      if (speedEl && speedEl.textContent !== String(spd)) speedEl.textContent = spd;

      const unitEl = node.querySelector('.cg-speed-unit');
      if (unitEl) unitEl.textContent = mph ? 'mph' : 'km/h';

      // Odometer
      const odoEl = node.querySelector('.cg-odo');
      if (odoEl) {
        const odo = t ? (mph ? (t.odo * 0.621371).toFixed(1) + ' mi' : t.odo.toFixed(1) + ' km') : '0 km';
        if (odoEl.textContent !== odo) odoEl.textContent = odo;
      }

      // Trip meter
      const tripEl = node.querySelector('.cg-trip');
      if (tripEl && t) {
        const trip = t.trip != null ? (mph ? (t.trip * 0.621371).toFixed(1) : t.trip.toFixed(1)) : '';
        const txt = trip ? (L('trip', 'trip') + ' ' + trip) : '';
        if (tripEl.textContent !== txt) tripEl.textContent = txt;
      }

      // Destination city
      const cityEl = node.querySelector('.cg-city');
      if (cityEl) {
        const city = t && t.cityTo && t.onJob !== false ? t.cityTo : '';
        if (cityEl.textContent !== city) cityEl.textContent = city;
      }

      // Fuel bar fill
      const fillEl = node.querySelector('.cg-fuelbar-fill');
      if (fillEl) {
        const pctFuel = t && t.fuelCap > 0 ? clamp(t.fuel / t.fuelCap, 0, 1) * 100 : 0;
        fillEl.style.width = pctFuel + '%';
        // color: red below ~15%, amber below ~30%, green otherwise
        fillEl.style.background = pctFuel < 15 ? '#cc2020' : pctFuel < 30 ? '#cc8800' : '#2a8844';
      }
    } else {
      // Tachometer digital readouts

      // Day of week
      const dayEl = node.querySelector('.cg-day');
      if (dayEl && t) {
        const day = panelText().days[Math.floor(t.time / 1440) % 7] || '';
        if (dayEl.textContent !== day) dayEl.textContent = day;
      }

      // Clock
      const clockEl = node.querySelector('.cg-clock');
      if (clockEl) {
        const mins = t ? ((Math.round(t.time) % 1440) + 1440) % 1440 : 0;
        const hh = String(Math.floor(mins / 60)).padStart(2, '0');
        const mm = String(mins % 60).padStart(2, '0');
        const txt = hh + ':' + mm;
        if (clockEl.textContent !== txt) clockEl.textContent = txt;
      }

      // Temperature 1: water
      const t1El = node.querySelector('.cg-temp1');
      if (t1El) {
        const txt = t && t.waterT != null ? fmtTemp(t.waterT) : '';
        if (t1El.textContent !== txt) t1El.textContent = txt;
      }

      // Temperature 2: oil
      const t2El = node.querySelector('.cg-temp2');
      if (t2El) {
        const txt = t && t.oilT != null ? fmtTemp(t.oilT) : '';
        if (t2El.textContent !== txt) t2El.textContent = txt;
      }

      // Rest timer (minutes remaining)
      const restEl = node.querySelector('.cg-rest');
      if (restEl) {
        const txt = t && t.restTime != null && t.restTime > 0
          ? Math.floor(t.restTime / 60) + ' ' + L('minut', 'min')
          : '';
        if (restEl.textContent !== txt) restEl.textContent = txt;
      }

      // L N H E indicator bars:
      //   L = low beam, N = navigation/cruise, H = high beam, E = engine brake
      const inds = node.querySelectorAll('.cg-ind');
      if (inds.length >= 4 && t) {
        inds[0].classList.toggle('on', !!(t.low || t.parking));    // L - lights
        inds[1].classList.toggle('on', t.cruise > 0.5);           // N - cruise/nav
        inds[2].classList.toggle('on', !!t.high);                 // H - high beam
        inds[3].classList.toggle('on', t.retarder > 0);           // E - engine brake
      }
    }
  }

  function gaugeValue(field) {
    const t = S.tel && S.tel.sdk ? S.tel : (S.bridge === 'demo' ? DEMO_TEL : null);
    if (!t) return 0;
    if (field === 'rpm') return t.rpm;
    if (field === 'fuel') return t.fuelCap > 0 ? t.fuel / t.fuelCap : 0;
    if (field === 'air') return t.air;
    return Math.abs(t.speed) * (layout().units === 'mph' ? 2.23694 : 3.6);
  }

  // ---- Art page pieces -----------------------------------------------------------------------
  const curTel = () => (S.tel && S.tel.sdk ? S.tel : (S.bridge === 'demo' ? DEMO_TEL : null));

  // ---- Temperature unit -------------------------------------------------------------------
  // Temperature is its own setting, NOT derived from the speed unit. Britain runs the
  // ETS2 UK map in mph while every gauge there still reads Celsius, so tying the two
  // together would force Fahrenheit on anyone driving it. Defaults to Celsius, which is
  // what the game reports; Fahrenheit is a display-time conversion.
  const tempUnit = () => (layout().temp === 'f' ? '\u00b0F' : '\u00b0C');
  const tempNum = (c) => (layout().temp === 'f' ? Number(c) * 9 / 5 + 32 : Number(c));
  // `sep` is the gap between number and unit: '' on the tight dial read-outs, ' ' in prose rows.
  const fmtTemp = (c, sep) => {
    const g = sep == null ? '' : sep;
    return (c == null || !Number.isFinite(Number(c))) ? '--' + g + tempUnit()
      : Math.round(tempNum(c)) + g + tempUnit();
  };

  // Needle angle of a painted dial, in degrees clockwise from 12 o'clock. Each dial brings
  // its own scale: where its first and last marks sit (a0, a1), its top value and its unit,
  // or value/angle pairs (pts) when the painted scale is not evenly spaced.
  // Truck switched off (game connected and engine/electrics off, or the player stopped it here):
  // needles at rest, readouts dark, warning lamps out. With no game and no press it stays as painted.
  function deadNow() { return ignState() === 0 && (!!(S.tel && S.tel.sdk) || ignLocal !== 0 || !!S.ignUsed); }
  function skinNeedleAngle(g) {
    const t = deadNow() ? null : curTel();     // ignition off: every needle rests at zero
    let v = 0;
    if (t) {
      if (g.field === 'rpm') v = t.rpm;
      else if (g.field === 'fuel') v = t.fuelCap > 0 ? t.fuel / t.fuelCap : 0;
      else if (g.field === 'air') v = g.unit === 'bar' ? t.air / 14.5038 : t.air; // the game reports psi
      else v = Math.abs(t.speed) * (g.unit === 'mph' ? 2.23694 : 3.6);
    }
    if (g.pts) {
      const p = g.pts;
      if (v <= p[0][0]) return p[0][1];
      for (let i = 1; i < p.length; i += 1) {
        if (v <= p[i][0]) return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * (v - p[i - 1][0]) / (p[i][0] - p[i - 1][0]);
      }
      return p[p.length - 1][1];
    }
    const max = g.max || (g.field === 'rpm' ? 3000 : g.field === 'fuel' ? 1 : g.field === 'air' ? 150 : 120);
    const a0 = g.a0 == null ? -120 : g.a0;
    const a1 = g.a1 == null ? 120 : g.a1;
    return a0 + (a1 - a0) * clamp(v / max, 0, 1);
  }

  // What a painted readout shows right now: [main line, second line].
  function liveText(w) {
    const t = curTel();
    if (!t) return ['--', ''];
    const mph = layout().units === 'mph';
    const clock = (mins) => {
      const m = ((Math.round(mins) % 1440) + 1440) % 1440;
      const h = Math.floor(m / 60);
      // h12: the readout is painted as a 12-hour clock and is wide enough for AM/PM
      return w.h12 ? ((h % 12) || 12) + ':' + pad2(m % 60) + (h < 12 ? ' AM' : ' PM') : pad2(h) + ':' + pad2(m % 60);
    };
    const dist = () => (t.routeDist > 0 ? (mph ? Math.round(t.routeDist / 1609.34) + ' mi' : Math.round(t.routeDist / 1000) + ' km') : '--');
    switch (w.field) {
      case 'speed': return [String(Math.round(Math.abs(t.speed) * (mph ? 2.23694 : 3.6))), w.stack ? (mph ? 'MPH' : 'km/h') : ''];
      case 'gear': return [gearLabel(t), ''];
      case 'fuel': return [t.fuelCap > 0 ? Math.round(t.fuel / t.fuelCap * 100) + '%' : '--', ''];
      case 'time': return [clock(t.time), ''];
      case 'dist': return [dist(), ''];
      case 'left': {
        if (!(t.routeTime > 0)) return ['--', ''];
        const m = Math.round(t.routeTime / 60);
        return [Math.floor(m / 60) + 'h ' + pad2(m % 60) + 'm', ''];
      }
      // arrival = game clock now + driving time left on the route
      case 'eta': return [t.routeTime > 0 ? clock(t.time + t.routeTime / 60) : '--:--', ''];
      case 'trip2': return [panelText().days[Math.floor(t.time / 1440) % 7] + ' ' + clock(t.time), dist()];
      default: return ['--', ''];
    }
  }

  // Lamp colours for keys whose painted lamp is dark in the art (nothing to sample there).
  const LAMP_COLORS = { green: '#3dff7a', amber: '#ffb02e', red: '#ff3b30', blue: '#4aa8ff', white: '#f2f6ff' };
  const pct = (n) => (Math.round(n * 100) / 100) + '%';

  // The moving piece of a key: a copy of the key's own picture, cut from the panel image, laid
  // exactly over the original. Pressing transforms this copy (it tilts, sinks or flips,
  // according to the kind of control), so what moves is the painted key itself.
  // cap = [x, y, w, h] in % of the panel; base = the element's own box, same units.
  function capHtml(w, base) {
    const c = w.cap;
    if (!c) return '';
    const bx = c[2] >= 99.9 ? 0 : c[0] / (100 - c[2]) * 100;
    const by = c[3] >= 99.9 ? 0 : c[1] / (100 - c[3]) * 100;
    return '<i class="cap c-' + w.k + (w.rd ? ' rd' : '') + (w.dn ? ' dn' : '') + '" style="left:' + pct((c[0] - base[0]) / base[2] * 100) + ';top:' + pct((c[1] - base[1]) / base[3] * 100) +
      ';width:' + pct(c[2] / base[2] * 100) + ';height:' + pct(c[3] / base[3] * 100) +
      ';background-size:' + (10000 / c[2]).toFixed(2) + '% ' + (10000 / c[3]).toFixed(2) + '%;background-position:' + bx.toFixed(3) + '% ' + by.toFixed(3) + '%"></i>';
  }

  // Rocker keys with a photo asset were inset to 25% hitbox because their transparent PNG
  // margin overlaps the neighbour key (~24% of button width) — see .has-asset .hit in app.css.
  // A key with no other asset box within that same margin has no neighbour to steal taps from,
  // so its hitbox can go full-size (.hit-full). Checked against the page's own widget list,
  // in the same r = [x%, y%, w%, h%] units as w.r.
  function pageHasNeighbor(w) {
    const list = page().widgets || [];
    const m = 0.25; // match the .hit inset margin
    const ax0 = w.r[0] - w.r[2] * m, ax1 = w.r[0] + w.r[2] * (1 + m);
    const ay0 = w.r[1] - w.r[3] * m, ay1 = w.r[1] + w.r[3] * (1 + m);
    for (const o of list) {
      if (o === w || !o.r || !o.asset) continue;
      const bx0 = o.r[0], bx1 = o.r[0] + o.r[2], by0 = o.r[1], by1 = o.r[1] + o.r[3];
      if (ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0) return true;
    }
    return false;
  }

  // fit() has already sized the panel; percentages alone can inherit its stretch.
  function squareSkinNode(node, r) {
    const pw = parseFloat(panel.style.width), ph = parseFloat(panel.style.height);
    const width = pw * r[2] / 100, height = ph * r[3] / 100;
    const side = Math.min(width, height);
    node.style.left = (pw * r[0] / 100 + (width - side) / 2) + 'px';
    node.style.top = (ph * r[1] / 100 + (height - side) / 2) + 'px';
    node.style.width = side + 'px';
    node.style.height = side + 'px';
  }
  function mountKeyCore(node, w) {
    node.classList.add('key-turn');
    squareSkinNode(node, w.r);
    const slot = /sov_key_(?:slot|kamaz)/i.test(w.asset);
    node.style.setProperty('--key-radius', slot ? '19.5%' : '17.5%');
    node.innerHTML += '<i class="key-core" aria-hidden="true"></i>';
  }

  function skinWidgetEl(w) {
    const node = document.createElement('div');
    node.className = 'w sk k-' + w.t + (w.recess ? ' recess' : '');
    if (page().skin === 'eu_frame') node.classList.add('k-modern');
    node.dataset.id = w.id;
    if (w.g) node.dataset.group = w.g;
    if (w.fn) node.dataset.fn = w.fn;
    const mandatory = w.t === 'kbd' && w.mini && ['quick_save', 'world_map', 'activate'].includes(w.fn);
    if (mandatory) node.classList.add('mandatory-action');
    if (w.t === 'sc25palette' || w.t === 'scaniapalette') {
      const isScania = w.t === 'scaniapalette';
      const pt = (layout().lang || '').toLowerCase().startsWith('pt');
      const labels = pt
        ? { factory:'Original', red:'Vermelho', white:'Branco', blue:'Azul', green:'Verde', amber:'Âmbar', pink:'Rosa acetinado', lime:'Verde-limão', yellow:'Amarelo rally', purple:'Roxo ultravioleta' }
        : { factory:'Factory', red:'Red', white:'White', blue:'Blue', green:'Green', amber:'Amber', pink:'Satin rose', lime:'Lime', yellow:'Rally yellow', purple:'Ultraviolet' };
      const colors = SC25.THEMES;
      const selected = (isScania ? normalizeScaniaTheme : normalizeSc25Theme)(isScania
        ? (layout().scania && layout().scania.theme)
        : (layout().sc25 && layout().sc25.theme));
      const themeKeys = isScania
        ? SC25.SCANIA_THEME_KEYS
        : SC25.THEME_KEYS.filter((key) => key !== 'factory');
      const themeLabel = (key) => labels[key] || key;
      node.className = 'w sk k-sc25palette' + (isScania ? ' k-scania-palette' : '');
      node.style.cssText = 'left:' + pct(w.r[0]) + ';top:' + pct(w.r[1]) + ';width:' + pct(w.r[2]) + ';height:' + pct(w.r[3]);
      node.innerHTML = '<button type="button" class="sc25-palette-current" data-sc25-color-toggle aria-label="' +
        esc(pt ? 'Mudar cor do painel' : 'Change panel colour') + '" title="' + esc(pt ? 'Cor do painel' : 'Panel colour') +
        '" aria-haspopup="listbox" aria-expanded="false" style="--swatch:' + colors[selected].accent + '"><i></i></button><div class="sc25-palette-list" role="listbox" aria-label="' +
        esc(pt ? 'Cores do painel' : 'Panel colours') + '">' + themeKeys.map((key) =>
          '<button type="button" class="sc25-palette-option' + (key === selected ? ' selected' : '') + '" data-sc25-theme="' + key +
          '" role="option" aria-selected="' + (key === selected ? 'true' : 'false') + '" aria-label="' + esc(themeLabel(key)) +
          '" title="' + esc(themeLabel(key)) + '" style="--swatch:' + colors[key].accent + '"><i></i></button>').join('') + '</div>';
      return node;
    }
    if (w.t === 'gauge') {
      // art-method: c = [cx%, cy%, radius%]; frame-method: r = [x%, y%, w%, h%]
      if (w.r) {
        node.style.cssText = 'left:' + pct(w.r[0]) + ';top:' + pct(w.r[1]) + ';width:' + pct(w.r[2]) + ';height:' + pct(w.r[3]);
      } else {
        const ar = skinOf(page()).ar;
        node.style.cssText = 'left:' + pct(w.c[0] - w.c[2]) + ';top:' + pct(w.c[1] - w.c[2] * ar) + ';width:' + pct(w.c[2] * 2) + ';height:' + pct(w.c[2] * 2 * ar);
      }
      const n0 = (w.n0 || 0.1) * 100;   // the needle starts outside the painted hub cap
      const n1 = (w.nl || 0.84) * 100;
      node.innerHTML = '<svg viewBox="-100 -100 200 200" preserveAspectRatio="none" aria-hidden="true"><g class="sneedle" fill="' + esc(w.ink) + '">' +
        '<path d="M-3.4 ' + -n0 + 'L-1 ' + -n1 + 'L1 ' + -n1 + 'L3.4 ' + -n0 + 'z"/></g></svg>';
      return node;
    }
    if (w.t === 'sc25') {
      node.className = 'w sk k-sc25';
      node.style.cssText = 'left:' + pct(w.r[0]) + ';top:' + pct(w.r[1]) + ';width:' + pct(w.r[2]) + ';height:' + pct(w.r[3]);
      SC25.ctx = () => {
        const t = curTel(), l = layout();
        return { dead: deadNow(), t: t, gear: t ? gearLabel(t) : '--', theme: normalizeSc25Theme(l.sc25 && l.sc25.theme),
          dashKeys: (l.binds && l.binds.dash_display) || FUNCTIONS.dash_display.keys };
      };
      SC25.mount(node, w);
      return node;
    }
    if (w.t === 'sc25bg') {
      node.className = 'w sk k-sc25bg';
      node.style.cssText = 'left:0;top:0;width:100%;height:100%';
      SC25.mountBg(node);
      return node;
    }
    if (w.t === 'sc25clock') {
      node.className = 'w sk k-sc25clock';
      node.style.cssText = 'left:' + pct(w.r[0]) + ';top:' + pct(w.r[1]) + ';width:' + pct(w.r[2]) + ';height:' + pct(w.r[3]);
      return node;
    }
    if (w.t === 'cgauge') {
      // Analogue dial and needle; live values are shown on the centre information screen.
      // Positioned by r = [x%, y%, w%, h%] like every frame-method widget.
      node.className = 'w sk k-cgauge cg-' + (w.variant || 'speedo');
      if (skinOf(page()) && skinOf(page()).ar < 1) node.classList.add('portrait');
      node.style.cssText = 'left:' + pct(w.r[0]) + ';top:' + pct(w.r[1]) + ';width:' + pct(w.r[2]) + ';height:' + pct(w.r[3]);
      // SVG layer: face, bezel, ticks, numbers, bands, needle
      let html = cgaugeSvg(w);
      if (w.variant === 'speedo') {
        html += '<div class="cg-digital cg-speedo-dig"><b class="cg-speed">0</b><small class="cg-speed-unit">km/h</small><span class="cg-odo">0 km</span><span class="cg-trip"></span><span class="cg-city"></span><div class="cg-fuelbar"><i class="cg-fuelbar-e">E</i><span class="cg-fuelbar-track"><i class="cg-fuelbar-fill"></i></span><i class="cg-fuelbar-f">F</i></div></div>';
      } else {
        html += '<div class="cg-digital cg-tacho-dig"><small class="cg-day"></small><b class="cg-clock">00:00</b><span class="cg-temp1"></span><span class="cg-temp2"></span><span class="cg-rest"></span><div class="cg-indicators"><span>F</span><span>N</span><span>A</span><span>R</span></div></div>';
      }
      node.innerHTML = html;
      return node;
    }
    if (w.t === 'ign') {
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', 'Ignition key');
      const ar = skinOf(page()).ar;
      // Photoreal key-slot from the Layout Editor: same hitbox pattern as has-asset keys.
      if (w.asset) {
        node.classList.add('has-asset', 'lampst', 'hit-full');
        node.style.cssText = 'left:' + pct(w.r[0]) + ';top:' + pct(w.r[1]) + ';width:' + pct(w.r[2]) + ';height:' + pct(w.r[3]);
        node.style.setProperty('--asset', cssUrl(w.asset));
        if (w.zIndex) node.style.zIndex = w.zIndex;
        node.innerHTML = '<i class="cap"></i><i class="hit" aria-hidden="true"></i>';
        mountKeyCore(node, w);
        return node;
      }
      if (w.st === 'lamp' || w.st === 'btn') {
        // the panel's own START key or button: its lamp / glow shows the stage (amber = electrics, green = running)
        node.classList.add('lampst');
        node.style.cssText = 'left:' + pct(w.r[0]) + ';top:' + pct(w.r[1]) + ';width:' + pct(w.r[2]) + ';height:' + pct(w.r[3]);
        node.innerHTML = capHtml(w, w.r) + (w.led ? '<i class="lamp" style="left:' + pct(w.led[0] * 100) + ';top:' + pct(w.led[1] * 100) + ';width:' + pct(w.led[2] * 100) + ';height:' + pct(w.led[3] * 100) + '"></i>' : '');
        return node;
      }
      const box = [w.c[0] - w.c[2], w.c[1] - w.c[2] * ar, w.c[2] * 2, w.c[2] * 2 * ar];
      node.style.cssText = 'left:' + pct(box[0]) + ';top:' + pct(box[1]) + ';width:' + pct(box[2]) + ';height:' + pct(box[3]);
      if (w.st === 'knob') {
        // the panel's own rotary knob: the painted knob itself turns, over a dark well
        node.classList.add('knobst');
        node.innerHTML = '<i class="well"></i>' + capHtml({ cap: box, k: 'round', rd: 1 }, box);
        return node;
      }
      // key barrel: the key and the lit ring are live, the barrel body is in the picture
      node.innerHTML = '<svg viewBox="-100 -100 200 200" aria-hidden="true"><circle class="iring" r="76" fill="none" stroke-width="7"/>' +
        '<g class="ikey"><path d="M-13 -56Q0 -66 13 -56L17 -8Q30 4 17 20L13 56Q0 66 -13 56L-17 20Q-30 4 -17 -8Z" fill="#17191c" stroke="#4a4e54" stroke-width="2.5"/>' +
        '<path d="M-6 -50Q0 -55 6 -50L8 -10H-8Z" fill="#33373c"/><rect x="-2.5" y="-44" width="5" height="30" rx="2.5" fill="#e9ecef"/></g></svg>';
      return node;
    }
    node.style.cssText = 'left:' + pct(w.r[0]) + ';top:' + pct(w.r[1]) + ';width:' + pct(w.r[2]) + ';height:' + pct(w.r[3]);
    if (w.t === 'tell') {
      const f = w.fn && FUNCTIONS[w.fn];
      const icon = w.icon || (f && f.icon) || 'dot';
      node.className = 'w sk k-tell tell-' + (w.lamp || 'white');
      node.innerHTML = '<span class="tell-ico">' + iconSvg(icon) + '</span>';
      node.setAttribute('aria-hidden', 'true');
      return node;
    }
    if (w.t === 'lens') {
      // Decorative glass over a dial niche. Pure overlay: aria-hidden, no role, no LED, no press;
      // pointer-events:none in CSS so taps fall through to whatever sits underneath.
      node.className = 'w sk k-lens';
      squareSkinNode(node, w.r);
      if (w.zIndex) node.style.zIndex = w.zIndex;
      if (w.asset) node.style.setProperty('--asset', cssUrl(w.asset));
      node.setAttribute('aria-hidden', 'true');
      return node;
    }
    if (w.t === 'sgauge') {
      // Real dial photo (face, numerals and bezel baked in); the app only draws the needle on top.
      // Passive: no role=button, no LED, no press — pointer-events:none in CSS.
      node.className = 'w sk k-sgauge k-vgauge' + (w.small ? ' small' : '');
      squareSkinNode(node, w.r);
      if (w.zIndex) node.style.zIndex = w.zIndex;
      node.innerHTML = '<div class="sg sg-' + w.field + '">' + sovGaugeSvg(w.field) + '</div>';
      return node;
    }
    if (w.t === 'spr') {
      // A real part cut from the photo: lit square key, toggle, chrome push button, key switch or lamp,
      // with a name tag under it. Its states (lit, lever up, pressed) are CSS on the same picture.
      const f = fnOf(w);
      const ph = parseFloat(panel.style.height) || 400;
      node.className = 'w sk k-spr k-vbtn s-' + w.k + (w.c ? ' c-' + w.c : '') + (w.k === 'lamp' ? ' passive' : '');
      node.style.setProperty('--ph', ((w.ph || 1) * 100).toFixed(1) + '%');
      node.style.setProperty('--pa', String(w.pa || 1));
      node.style.setProperty('--k', (w.r[3] / 100 * ph * (w.ph || 1)).toFixed(1) + 'px');
      if (f && w.k !== 'lamp') {
        node.setAttribute('role', 'button');
        node.setAttribute('aria-label', f.name === 'Custom key' ? (f.label || 'Custom key') : f.name);
      }
      node.innerHTML = '<i class="pic">' + (w.k === 'sq' && f ? '<span class="ico i-' + esc(f.icon) + '">' + iconSvg(f.icon) + '</span>' : '') + '</i>' +
        (w.k === 'lamp' || !f ? '' : '<span class="tag">' + esc(String(f.label || '').replace(/\n/g, ' ')) + '</span>');
      return node;
    }
    if (w.t === 'kbd') {
      // A key drawn by the app (cap, pictogram, name, lamp) inside an empty slot of a frame picture.
      // Same look as the keys of the grid pages; --k is the key's smaller side in pixels.
      const f = fnOf(w);
      const pw = parseFloat(panel.style.width) || 600, ph = parseFloat(panel.style.height) || 400;
      const kpx = Math.min(w.r[2] / 100 * pw, w.r[3] / 100 * ph);
      const wide = (w.r[2] / 100 * pw) > (w.r[3] / 100 * ph) * 1.35;   // low, wide slot: pictogram and name side by side
      const isolated = w.asset && !pageHasNeighbor(w);
      node.className = 'w sk k-kbd' + (page().skin === 'eu_frame' ? ' k-modern' : '') + ' ' + (w.k || 'rocker') + (w.mini ? ' mini' : '') + (wide ? ' wide' : '') + (mandatory ? ' mandatory-action' : '') + (w.asset ? ' has-asset' : '') + (isolated ? ' hit-full' : '');
      node.dataset.led = f.led;
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', f.name === 'Custom key' ? (f.label || 'Custom key') : f.name);
      node.style.setProperty('--k', kpx.toFixed(1) + 'px');
      if (w.rad) node.style.setProperty('--cap-radius', String(w.rad));   // corners follow the slot of this frame
      // A button bridged from the Layout Editor carries its own reference picture and the
      // editor's own stacking order; it paints over the drawn rocker cap instead of sitting
      // behind the usual icon + label (.has-asset in app.css), and keeps the layer order the
      // player set for overlapping free-position buttons.
      if (w.asset) node.style.setProperty('--asset', cssUrl(w.asset));
      if (w.zIndex) node.style.zIndex = w.zIndex;
      if (w.lamp) node.classList.add('passive', 'atomic-lamp');
      if (w.eng) node.classList.add('engl');
      if (w.tog) node.classList.add('asset-tog');
      if (w.hazardFail) node.classList.add('hazard-fail');
      if (w.rocker) node.classList.add('asset-rocker');
      if (w.pbCore) node.classList.add('pb-split');
      if (w.rockerDn) node.classList.add('is-dn');
      node.innerHTML = widgetHtml({ id: w.id, t: w.k || 'rocker', fn: w.fn });
      // Photo assets already carry their own lamps/legends — strip the synthetic LED strip.
      if (w.asset) {
        node.querySelectorAll('.led').forEach((el) => el.remove());
        node.innerHTML += '<i class="hit" aria-hidden="true"></i>';
      }
      // Atomic lamp photos ship as *_off.png; app swaps to *_on.png + glow by colour (Regra 3).
      if (w.lamp && w.asset) {
        node.dataset.lampOff = w.asset;
        node.dataset.lampOn = String(w.asset).replace(/_off(\.[^.]+)$/i, '_on$1');
        const color = ((String(w.asset).match(/sov_lamp_(red|green|amber|blue|white)/i) || [])[1] || '').toLowerCase();
        if (color) {
          node.dataset.lampColor = color;
          node.style.setProperty('--lamp-glow', LAMP_COLORS[color] || LAMP_COLORS.green);
        }
      }
      // Hazard OFF/ON lit pair: static body; updateKey swaps --asset with blink/telemetry phase.
      if (w.hazardFail) {
        node.dataset.hazardOff = 'skins/sov/btn/sov_push_hazard_off.png';
        node.dataset.hazardOn = 'skins/sov/btn/sov_push_hazard_on.png';
        node.style.setProperty('--asset', cssUrl(node.dataset.hazardOff));
        node.style.setProperty('--haz-glow', LAMP_COLORS.amber);
        node.style.setProperty('--haz-light', cssUrl(node.dataset.hazardOff));
        node.innerHTML += '<i class="hazard-light" aria-hidden="true"></i>';
      }
      // Soviet toggle shells: remember up/down art so .on can flip the lever photo.
      if (w.tog) {
        if (w.parkTog || /sov_toggle_parking_brake/i.test(String(w.asset || ''))) {
          node.dataset.togDown = 'skins/sov/btn/sov_toggle_parking_brake_down.png';
          node.dataset.togUp = 'skins/sov/btn/sov_toggle_parking_brake_up.png';
        } else {
          node.dataset.togDown = 'skins/sov/btn/sov_tog_down.png';
          node.dataset.togUp = 'skins/sov/btn/sov_tog_up.png';
        }
      }
      // Parking push: the yellow cap is its own layer so only it can sink into the bezel.
      if (w.pbCore) {
        node.style.setProperty('--pb-core', cssUrl(w.pbCore));
        node.innerHTML += '<i class="pb-core" aria-hidden="true"></i>';
      }
      // Rotary selector: static base (.cap) + static icon crown + the pin as the ONLY moving
      // layer. The crown counter-rotates each tick so labels stay upright.
      if (w.rotary && (w.states || []).length) {
        node.classList.add('k-rotary');
        squareSkinNode(node, w.r);
        if (w.pinAsset) node.style.setProperty('--pin', cssUrl(w.pinAsset));
        node.style.setProperty('--rot-rn', String((w.crownR || 42) / 100));   // fraction of --k (the square side)
        node.style.setProperty('--pin-size', (w.pinLen || 58) + '%');
        node.style.setProperty('--pin-bake', (w.pinBake || 0) + 'deg');
        // A housing with its legends already printed (sov_rotary_dial) needs no CSS crown.
        const drawCrown = w.states.some((st) => st.icon || st.label);
        const crown = !drawCrown ? '' : w.states.map((st) => '<i class="rot-tick" data-p="' + esc(st.id) + '" style="--a:' + st.deg + 'deg">'
          + (st.icon ? '<span class="rot-ico">' + iconSvg(st.icon) + '</span>'
            : (st.label ? '<span class="rot-txt">' + esc(st.label) + '</span>' : '')) + '</i>').join('');
        node.innerHTML += (crown ? '<i class="rot-crown" aria-hidden="true">' + crown + '</i>' : '')
          + '<i class="rot-pin" aria-hidden="true"></i>';
      }
      if (w.keyTurn) mountKeyCore(node, w);
      if (w.asset && w.picto) {
        node.innerHTML += '<span class="atomic-picto" style="left:' + w.picto.ox + '%;top:' + w.picto.oy
          + '%;width:' + w.picto.w + '%;height:' + w.picto.h + '%;opacity:' + w.picto.op
          + (w.picto.color ? ';color:' + w.picto.color : '') + '">' + iconSvg(w.picto.icon) + '</span>';
      }
      if (w.label) {
        const lb = w.labelBox || {};
        const hasBox = lb && (lb.w || lb.h || lb.ox || lb.oy);
        const style = hasBox
          ? 'left:' + (Number(lb.ox) || 0) + '%;top:' + (Number(lb.oy) || 0) + '%;width:' + (Number(lb.w) || 84) + '%;height:' + (Number(lb.h) || 18) + '%;right:auto;bottom:auto;'
          : '';
        node.innerHTML += '<span class="key-label' + (hasBox ? ' is-placed' : '') + '"'
          + (style ? ' style="' + style + '"' : '') + '>' + esc(String(w.label).toUpperCase()) + '</span>';
      }
      if (w.color) {
        node.classList.add('has-tint');
        node.innerHTML += '<span class="tint-overlay" style="background:' + esc(w.color) + '"></span>';
      }
      return node;
    }
    // readouts are written in the colours sampled from the art under them
    if (w.bg) { node.style.setProperty('--bg', w.bg); node.style.setProperty('--ink', w.ink); }
    if (w.t === 'hot') {
      const f = fnOf(w);
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', f.id === 'custom' ? 'Custom key' : f.name);
      node.style.setProperty('--lamp', LAMP_COLORS[f.led] || w.lc || LAMP_COLORS.green);
      node.innerHTML = capHtml(w, w.r) + (w.split ? '<i class="half up">+</i><i class="half lo">\u2212</i>' : '');
      if (w.led) node.innerHTML += '<i class="lamp" style="left:' + pct(w.led[0] * 100) + ';top:' + pct(w.led[1] * 100) + ';width:' + pct(w.led[2] * 100) + ';height:' + pct(w.led[3] * 100) + '"></i>';
      else node.classList.add('nolamp');
    } else if (w.t === 'live') {
      node.innerHTML = '<b></b>' + (w.stack || w.field === 'trip2' ? '<small></small>' : '');
      if (OBC_FIELDS.has(w.field)) { node.classList.add('tap'); node.setAttribute('role', 'button'); node.setAttribute('aria-label', 'On-board computer'); }
    } else if (w.t === 'rtext') {
      node.classList.toggle('modern-utility', !!w.utility);
      if (w.utility) {
        const ptObd = layout().lang === 'pt';
        const L = (en, p) => (ptObd ? p : en);
        const tell = (flag, file) => '<i class="tell" data-flag="' + flag + '" data-src="skins/modern/obd/telltales/' + file + '"><img src="skins/modern/obd/telltales/' + file + '_off.png" alt=""></i>';
        const cell = (key, file, unit) =>
          '<div class="obd-cell" data-k="' + key + '"><img class="obd-ico" src="skins/modern/obd/' + file + '.png" alt="">' +
          '<div class="obd-read"><b class="obd-val">--</b><small class="obd-unit">' + unit + '</small></div>' +
          (key === 'fuel' || key === 'air' || key === 'air2' ? '<div class="obd-fuelbar" data-bar="' + key + '"><i></i></div>' : '') + '</div>';
        // Text cells with a small caption (pages without dedicated PNG icons yet).
        const textCell = (key, unit, label) =>
          '<div class="obd-cell" data-k="' + key + '">' +
            (label ? '<small class="obd-lbl">' + label + '</small>' : '') +
            '<div class="obd-read"><b class="obd-val">--</b><small class="obd-unit">' + unit + '</small></div></div>';
        // Telltale rendered as inline SVG (no PNG asset yet) reusing the .tell-green/.tell-blue
        // palette already defined for .k-tell elsewhere in app.css.
        const tellSvg = (flag, color, svgPath) =>
          '<i class="tell tell-svg tell-' + color + '" data-flag="' + flag + '"><svg viewBox="0 0 20 20">' + svgPath + '</svg></i>';
        // ISO 2575 pictograms, thin outline strokes (no filled mass -> no "blurry blob" look).
        // Position/parking lamp: lamp housing + single horizontal ray.
        const bulbSvg = '<path d="M3 7.3h6.3c1.7 0 3.1 1.1 3.1 2.7s-1.4 2.7-3.1 2.7H3z" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><line x1="13.4" y1="10" x2="17.2" y2="10" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>';
        // Low beam: lamp housing + rays angled down-left (cutoff), per standard dash convention.
        const beamSvg = '<path d="M3 7.3h6.3c1.7 0 3.1 1.1 3.1 2.7s-1.4 2.7-3.1 2.7H3z" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><line x1="13.6" y1="8.1" x2="17.6" y2="6.6" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><line x1="14" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><line x1="13.6" y1="11.9" x2="17.3" y2="13.4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>';
        const ptitle = (txt) => '<div class="obd-ptitle">' + txt + '</div>';
        // .obd-body is the flex layout wrapper; .modern-utility only hosts container-type:size.
        // Five pages, 1:1 parity with the Scania S/R 2016 cluster layout Fernando specified.
        node.dataset.screen = '0';
        node.innerHTML =
          '<div class="obd-body">' +
            '<div class="mu-head"><span></span><time></time></div>' +
            '<div class="obd-tell-l">' +
              tellSvg('parking', 'green', bulbSvg) + tellSvg('low', 'green', beamSvg) +
              tell('park', 'park') + tell('blinkL', 'blink_l') + tell('blinkR', 'blink_r') +
            '</div>' +
            '<div class="obd-screens">' +
              '<div class="obd-screen active" data-si="0">' + ptitle(L('PRESSURE', 'PRESSÃO')) + '<div class="obd-core">' +
                cell('air', 'air', 'psi') + cell('air2', 'air', 'psi') + textCell('oilP', 'bar', L('OIL P', 'ÓLEO')) +
              '</div></div>' +
              '<div class="obd-screen" data-si="1">' + ptitle(L('TEMPERATURES', 'TEMPERATURAS')) + '<div class="obd-core">' +
                cell('water', 'water', '°C') + textCell('oilT', '°', L('OIL T', 'ÓLEO')) +
              '</div></div>' +
              '<div class="obd-screen" data-si="2">' + ptitle(L('CRUISE CONTROL', 'CRUZEIRO')) + '<div class="obd-core obd-core-cruise">' +
                '<div class="obd-cruise-gfx" aria-hidden="true"><i class="ocg-truck"></i><i class="ocg-ring ocg-r1"></i><i class="ocg-ring ocg-r2"></i><i class="ocg-ring ocg-r3"></i></div>' +
                textCell('cruise', '', L('CRUISE SET', 'CRUZEIRO')) + textCell('retarder', '', L('RETARDER', 'RETARDER')) +
              '</div></div>' +
              '<div class="obd-screen" data-si="3">' + ptitle(L('FUEL & CONSUMPTION', 'COMBUSTÍVEL')) + '<div class="obd-core">' +
                cell('fuel', 'fuel', 'l') + textCell('range', 'km', L('RANGE', 'AUTONOMIA')) +
                textCell('consAvg', 'l/100', L('AVG', 'MÉDIA')) + textCell('consInst', 'l/h', L('INST', 'INST')) +
              '</div></div>' +
              '<div class="obd-screen obd-screen-trip" data-si="4">' + ptitle(L('CARGO & TRIP', 'CARGA E VIAGEM')) +
                '<div class="obd-trip obd-trip-full">' +
                  '<div class="obd-trip-row" data-trip="dest"><span class="obd-trip-lbl">' + L('DESTINATION', 'DESTINO') + '</span><b class="obd-trip-val">--</b></div>' +
                  '<div class="obd-trip-row" data-trip="cargo"><span class="obd-trip-lbl">' + L('CARGO', 'CARGA') + '</span><b class="obd-trip-val">--</b></div>' +
                  '<div class="obd-trip-row" data-trip="mass"><span class="obd-trip-lbl">' + L('WEIGHT', 'PESO') + '</span><b class="obd-trip-val">--</b></div>' +
                  '<div class="obd-trip-row" data-trip="income"><span class="obd-trip-lbl">' + L('JOB PAYOUT', 'GANHO DO FRETE') + '</span><b class="obd-trip-val">--</b></div>' +
                  '<div class="obd-trip-row" data-trip="eta"><span class="obd-trip-lbl">' + L('TIME LEFT', 'HORAS REST.') + '</span><b class="obd-trip-val">--</b></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="obd-tell-r">' +
              tell('high', 'high') + tell('oilWarn', 'oil') + tell('battWarn', 'batt') +
              tell('lift', 'lift') + tell('trailerLift', 'trailer_lift') +
            '</div>' +
            '<div class="obd-media">' +
              '<div class="omp-normal">' +
                '<span class="omp-cover">' + iconSvg('music') + '</span>' +
                '<div class="omp-text">' +
                  '<b class="omp-track"></b>' +
                  '<small class="omp-artist"></small>' +
                '</div>' +
                '<div class="omp-ctrl">' +
                  '<div class="omp-keys">' + MEDIA_FOOTER_KEYS.map((k) =>
                    '<i data-media="' + k[0] + '" role="button" aria-label="' + k[2] + '">' + iconSvg(k[1]) + '</i>').join('') + '</div>' +
                  '<div class="omp-progress"><i></i></div>' +
                '</div>' +
                '<div class="omp-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
              '</div>' +
              '<div class="omp-alert company-message"></div>' +
            '</div>' +
            '<div class="obd-dmg">' + ['dmgTruck', 'dmgTrailer', 'dmgCargo'].map((k) =>
              '<i class="obd-dmg-bar" data-dmg="' + k + '"><small></small><u><b></b></u></i>').join('') + '</div>' +
          '</div>';
      } else {
        node.innerHTML = (w.two ? '<em class="freight"></em><small></small>' : '') +
          '<b><span></span></b>' +
          (w.two ? '<div class="rt-keys"><i data-media="media_prev" role="button" aria-label="Previous">' + iconSvg('prev') + '</i><i data-media="media_play" role="button" aria-label="Play/Pause">' + iconSvg('playpause') + '</i><i data-media="media_next" role="button" aria-label="Next">' + iconSvg('next') + '</i></div>' : '');
      }
    } else if (w.t === 'fbar') {
      node.innerHTML = '<i></i>';
    } else if (w.t === 'gps') {
      // The game gives no map to show here, so the screen works as the truck's own
      // information display. Its cells are filled by updateSkinNode.
      node.classList.add('tinfo');
      node.dataset.theme = (page() && page().skin) || '';   // each panel styles its own screen
      if (w.hero) node.dataset.hero = '1';        // merged panel: speed, gear and fuel are shown here too
      if (w.padR) node.dataset.padr = String(w.padR); // right part of the screen is left free for another widget on top
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', 'On-board computer');
      if (w.scania) {
        // SCS Scania 2016 Standard cluster: its eight factory display pages.
        node.classList.add('scania-obc');
        node.dataset.screen = '0';
        const tr = (en, pt) => layout().lang === 'pt' ? pt : en;
        const tabIcons = [
          '<svg viewBox="0 0 20 20"><path d="M10 1 3 4v5c0 4.7 3 8.2 7 10 4-1.8 7-5.3 7-10V4zm0 3a5 5 0 110 10 5 5 0 010-10z" fill="currentColor"/></svg>',
          '<svg viewBox="0 0 20 20"><path d="M3 3h6v6H3zm8 0h6v6h-6zM3 11h6v6H3zm8 0h6v6h-6z" fill="currentColor"/></svg>',
          '<svg viewBox="0 0 20 20"><path d="M10 2a2 2 0 012 2v6.3a4 4 0 11-4 0V4a2 2 0 012-2zm-1 10.8a2.5 2.5 0 101.8 0V6H9z" fill="currentColor"/></svg>',
          '<svg viewBox="0 0 20 20"><path d="M2 10a8 8 0 1116 0h-2a6 6 0 10-12 0zm7-5h2v5l4 2-1 1.7-5-2.7z" fill="currentColor"/></svg>',
          '<svg viewBox="0 0 20 20"><path d="M5 2h8l4 4v12H3V2zm1 2v4h8V6l-3-2zm0 7v2h8v-2zm0 4v1h6v-1z" fill="currentColor"/></svg>',
          '<svg viewBox="0 0 20 20"><path d="M3 3h14v2H3zm0 6h14v2H3zm0 6h14v2H3z" fill="currentColor"/></svg>',
          '<svg viewBox="0 0 20 20"><path d="M3 15h14v2H3zm2-2 2-8h6l2 8zm5-6-1 4h2z" fill="currentColor"/></svg>',
          '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 5v5l3 2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
        ];
        const tabs = tabIcons.map((ico, i) =>
          '<i class="sc-tab' + (i === 0 ? ' active' : '') + '" data-si="' + i + '">' + ico + '</i>'
        ).join('');
        node.innerHTML =
          '<div class="sc-tabs">' + tabs + '</div>' +
          '<div class="sc-title">' + tr('Vehicle data', 'Dados do veículo') + '</div>' +
          '<div class="sc-body">' +
            '<div class="sc-screen sc-home active"><div class="sc-row"><span class="sc-lbl">' + tr('GEAR', 'MARCHA') + '</span><span class="sc-val sc-home-gear">--</span></div><div class="sc-row"><span class="sc-lbl">' + tr('ODOMETER', 'ODÔMETRO') + '</span><span class="sc-val sc-home-odo">--</span></div></div>' +
            '<div class="sc-screen sc-press">' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('AIR PRESSURE', 'PRESSÃO DE AR') + '</span><span class="sc-val sc-air-val">-- bar</span></div>' +
              '<div class="sc-press-bar"><i class="sc-pb-fill sc-air1-fill"></i></div>' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('OIL PRESSURE', 'PRESSÃO DO ÓLEO') + '</span><span class="sc-val sc-oilp-val">-- bar</span></div>' +
            '</div>' +
            '<div class="sc-screen sc-temps">' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('WATER', 'ÁGUA') + '</span><span class="sc-val sc-temp-water">' + fmtTemp(null) + '</span></div>' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('OIL', 'ÓLEO') + '</span><span class="sc-val sc-temp-oil">' + fmtTemp(null) + '</span></div>' +
            '</div>' +
            '<div class="sc-screen sc-cruise">' +
              '<div class="sc-page-caption">' + tr('CRUISE CONTROL', 'CONTROLE DE CRUZEIRO') + '</div>' +
              '<div class="sc-cruise-speed"><span class="sc-cs-val">--</span><small>km/h</small></div>' +
              '<div class="sc-cruise-info"><span class="sc-ci-gear"></span><span class="sc-ci-limit"></span></div>' +
            '</div>' +
            '<div class="sc-screen sc-fuel">' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('FUEL', 'COMBUSTÍVEL') + '</span><span class="sc-val sc-fuel-val">-- l</span></div>' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('RANGE', 'AUTONOMIA') + '</span><span class="sc-val sc-range-val">-- km</span></div>' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('AVERAGE', 'MÉDIA') + '</span><span class="sc-val sc-cons-avg">-- l/100km</span></div>' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('INSTANT', 'INSTANTÂNEO') + '</span><span class="sc-val sc-cons-inst">-- l/h</span></div>' +
            '</div>' +
            '<div class="sc-screen sc-speed"><span class="sc-lbl">' + tr('SPEED', 'VELOCIDADE') + '</span><b class="sc-speed-val">--</b><small>km/h</small><span class="sc-speed-limit"></span></div>' +
            '<div class="sc-screen sc-truck">' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('GEAR', 'MARCHA') + '</span><span class="sc-val sc-truck-gear">--</span></div>' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('ODOMETER', 'ODÔMETRO') + '</span><span class="sc-val sc-trip-val">-- km</span></div>' +
            '</div>' +
            '<div class="sc-screen sc-timer">' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('GAME TIME', 'HORA DO JOGO') + '</span><span class="sc-val sc-time-val">--:--</span></div>' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('DISTANCE LEFT', 'DISTÂNCIA RESTANTE') + '</span><span class="sc-val sc-route-dist">--</span></div>' +
              '<div class="sc-row"><span class="sc-lbl">' + tr('DRIVE TIME LEFT', 'TEMPO RESTANTE') + '</span><span class="sc-val sc-route-time">--</span></div>' +
              '<div class="sc-row"><span class="sc-lbl">ETA</span><span class="sc-val sc-route-eta">--:--</span></div>' +
            '</div>' +
          '</div>';
      } else
      if (w.vfd) {
        // old vacuum-fluorescent display: green seven-segment figures behind dark glass.
        // k-vfd-float: position is pinned to --vfd-x/--vfd-y (defaults = this rect's own left/top),
        // so a future drag feature can move it just by rewriting those two custom properties.
        node.classList.add('vfd', 'k-vfd-float');
        node.style.setProperty('--vfd-x', pct(w.r[0]));
        node.style.setProperty('--vfd-y', pct(w.r[1]));
        node.style.setProperty('left', 'var(--vfd-x)');
        node.style.setProperty('top', 'var(--vfd-y)');
        node.innerHTML = '<div class="vf-glass"><div class="vf-d" data-k="spd"></div><div class="vf-d" data-k="gear"></div><div class="vf-d" data-k="fuel"></div><div class="vf-d" data-k="time"></div></div>' +
          '<div class="vf-cap"><span></span><span></span><span></span><span></span></div>';
      } else
      if (w.hero) {
        // Modern digital cluster (eu_frame only): vertical RPM | giant speed+gear | tele column.
        // .spd-body mirrors .obd-body — outer node hosts container-type:size; flex/grid lives inside.
        node.classList.add('hero');
        const tele = (k) => '<div class="ti-c" data-k="' + k + '"><span></span><b>--</b></div>';
        node.innerHTML =
          '<div class="spd-body">' +
            '<div class="spd-rpm" aria-hidden="true"><i class="spd-rpm-track"><u class="spd-rpm-fill"></u></i></div>' +
            '<div class="spd-core"><b class="spd-speed">--</b><small class="spd-unit">km/h</small><div class="spd-gear">--</div><div class="spd-limit"><b></b></div></div>' +
            '<div class="spd-tele">' + tele('oil') + tele('batt') + tele('range') + tele('trip') + '</div>' +
            '<div class="spd-foot"><span class="spd-time">--:--</span><span class="spd-odo">--</span></div>' +
          '</div>';
      } else
      node.innerHTML = '<div class="ti-head"><span class="ti-dest"></span><span class="ti-clock"></span></div>' +
        '<div class="ti-dmg"><span class="ti-di"><span class="ico">' + iconSvg('cab') + '</span><b></b></span><span class="ti-di"><span class="ico">' + iconSvg('trailer') + '</span><b></b></span><span class="ti-di"><span class="ico">' + iconSvg('cargo') + '</span><b></b></span></div>' +
        '<div class="ti-rpm"><i><u></u></i><b></b></div><div class="ti-grid"></div><div class="ti-foot"></div>';
    } else if (w.t === 'knob') {
      node.setAttribute('role', 'slider');
      node.setAttribute('aria-label', 'Volume');
      node.innerHTML = '<i></i>';   // a light mark that travels round the painted knob as it is turned
    } else if (w.t === 'sticker') {
      node.style.transform = 'rotate(' + w.rot + 'deg)';
      node.innerHTML = stickerSvg(w.art);
    } else if (w.t === 'plate') {
      // skin plates: section labels and recessed background panels
      node.innerHTML = '<div class="cap"><span class="lbl">' + labelHtml(w.text || '') + '</span></div>';
    } else if (w.t === 'status') {
      // skin status bar: damage indicators + trip info
      const cell = (icon, key) => '<span class="dmg" data-k="' + key + '"><span class="ico">' + iconSvg(icon) + '</span><b></b></span>';
      node.innerHTML = '<div class="sbar"><div class="sgroup">' + cell('cab', 'dmgTruck') + cell('trailer', 'dmgTrailer') + cell('cargo', 'dmgCargo') +
        '</div><div class="sgroup trip"></div></div>';
    }
    return node;
  }

  // Largest type that fits a painted readout: sized by the box height first, then measured and
  // shrunk if the text is wider than the box (the tablet may be showing a fallback font, so
  // the width cannot be guessed from the character count). Skipped when nothing changed.
  function fitText(el, text, boxW, boxH, share) {
    const key = text + '|' + boxW + '|' + boxH;
    if (el.dataset.fit === key) return;
    el.dataset.fit = key;
    el.textContent = text;
    let size = Math.max(6, boxH * share);
    el.style.fontSize = size.toFixed(1) + 'px';
    const wide = el.offsetWidth;
    if (wide > boxW * 0.94) el.style.fontSize = Math.max(6, size * boxW * 0.94 / wide).toFixed(1) + 'px';
  }

  // Functions whose lamp flashes while they are on, like the real switches.
  // Lamp-indicator ids with behavior:'blink' join this set so updateKey reuses the flasher.
  const BLINK = new Set(['hazard', 'blinker_left', 'blinker_right', 'fs_hazard', 'fs_left', 'fs_right']
    .concat(Object.keys(LAMP_INDICATORS).filter((id) => LAMP_INDICATORS[id].behavior === 'blink')));

  // Key backlight: on a real dash the legends light up with the first stage of the lights.
  // 'auto' follows the truck (parking lights or low beam); with no game connected the panel
  // stays lit, as painted. The player can also force it on or off.
  // Like the truck: the first stage of the lights switches the dash lighting on, and it then
  // stays on when the lights are switched off again, until the electrics go off.
  let dashLit = false;
  function backlit() {
    const mode = layout().lights || 'auto';
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    const t = S.tel && S.tel.sdk ? S.tel : null;
    if (!t) return true;                       // no game connected: as painted
    if (!t.electric) dashLit = false;
    else if (t.parking || t.low) dashLit = true;
    return dashLit;
  }

  // Text for a segment display: capitals without accents, which is all such a display has.
  const seg = (text) => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const classicNow = () => panel.classList.contains('classic');

  // State of a key drawn by the app: lit, resting or pressed. Same rules as the painted keys.
  function updateKey(w, node) {
    const f = fnOf(w);
    let on = f.id === 'wipers_back' ? false : isOn(w);
    if (f.id === 'lights') { const st = lightStage(); on = st > 0; node.dataset.stage = String(st); }
    // wipers: three lamp segments, one per speed. The game only reports on/off, so the speed is the app's own
    // count of presses (it is 1 when the wipers were switched on from the keyboard).
    if (f.id === 'wipers') node.dataset.wip = on ? String(clamp(S.wipLvl || 1, 1, 3)) : '0';
    let shown = on;
    if (on && BLINK.has(f.id)) {
      const t = S.tel && S.tel.sdk ? S.tel : null;
      if (!t) shown = S.phase;
      else if (f.id === 'hazard' || f.id === 'hazard_alert' || f.id === 'turn_signal_single') shown = !!(t.blinkL || t.blinkR);
      else if ((f.id === 'blinker_left' || f.id === 'left_turn_signal') && t.hazard) shown = !!(t.blinkL || t.blinkR);
      else if ((f.id === 'blinker_right' || f.id === 'right_turn_signal') && t.hazard) shown = !!(t.blinkL || t.blinkR);
      else if (f.behavior === 'blink' || (LAMP_INDICATORS[f.id] && LAMP_INDICATORS[f.id].behavior === 'blink')) {
        const tel = (LAMP_INDICATORS[f.id] && LAMP_INDICATORS[f.id].tel) || f.tel;
        // blinkL/R/Either already pulse from SDK; steady flags (speedWarn, airWarn…) use local phase.
        if (tel !== 'blinkL' && tel !== 'blinkR' && tel !== 'blinkEither' && tel !== 'hazard') shown = S.phase;
      }
    }
    if (w.keyTurn) node.style.setProperty('--key-deg', on ? '45deg' : '0deg');
    node.classList.toggle('on', shown);
    // Physical retention follows the latched/telemetry truth (`on`), not the blink phase (`shown`),
    // so hazard/parking stay visually pressed while their lamp may flash.
    node.classList.toggle('in', !!(f.latch && on));
    node.classList.toggle('idle', !shown && f.id !== 'hazard' && f.id !== 'hazard_alert' && (f.latch || !!f.tel));
    node.classList.toggle('down', S.pressed.has(w.id));
    node.classList.toggle('sel', S.edit && S.sel === w.id);
    // Atomic lamp off/on photo swap (engl / low-beam flicker owns --asset via its timer).
    if (node.dataset.lampOff && !node.classList.contains('engl') && !node.dataset.hazardOff) {
      node.style.setProperty('--asset', cssUrl(shown ? (node.dataset.lampOn || node.dataset.lampOff) : node.dataset.lampOff));
    }
    // Hazard lit pair: body stays put; only internal light follows blink/telemetry (`shown`).
    if (node.dataset.hazardOff && node.dataset.hazardOn) {
      const latched = !!(f.latch ? on : shown);
      node.style.setProperty('--haz-light', cssUrl(latched && shown ? node.dataset.hazardOn : node.dataset.hazardOff));
    }
    // Rotary selector: only the pin turns. Index from the engine stage (telemetry first),
    // mirror index as fallback for functions the engine has no stage for.
    if (w.rotary && (w.states || []).length) {
      const idx = rotaryIndex(w, f);
      const st = w.states[idx];
      node.dataset.s = String(idx);
      node.dataset.pos = st.id;
      node.style.setProperty('--rot-deg', st.deg + 'deg');
      node.querySelectorAll('.rot-tick').forEach((el, i) => el.classList.toggle('is-live', i === idx));
    }
    // Soviet toggle levers: swap PNG by latch/telemetry.
    // Parking brake is mechanically inverted vs a normal switch:
    //   OFF (released) = lever UP · ON (set) = lever DOWN.
    if (node.dataset.togDown && node.dataset.togUp) {
      const engaged = !!(f.latch ? on : shown);
      const parkLever = !!(w.parkTog || f.id === 'parking_brake');
      const art = parkLever
        ? (engaged ? node.dataset.togDown : node.dataset.togUp)
        : (engaged ? node.dataset.togUp : node.dataset.togDown);
      node.style.setProperty('--asset', cssUrl(art));
    }
  }

  function updateSkinNode(w, node) {
    if (w.t === 'knob' || w.t === 'sticker' || w.t === 'plate' || w.t === 'lens') return;
    if (w.t === 'status') {
      // skin status bar: update damage figures and trip info, same logic as grid status
      const t = S.tel && S.tel.sdk ? S.tel : (S.bridge === 'demo' ? DEMO_TEL : null);
      for (const el of node.querySelectorAll('.dmg')) {
        const k = el.dataset.k;
        const v = !t || (k !== 'dmgTruck' && t.trailer === false) ? '--' : t[k] + '%';
        el.lastChild.textContent = v;
        el.dataset.level = t && t[k] >= 15 ? 'bad' : t && t[k] >= 5 ? 'warn' : '';
      }
      const trip = displayParts({ field: 'trip' });
      const tripEl = node.querySelector('.trip');
      if (tripEl) tripEl.textContent = trip.val === '--' ? '--' : trip.val + (trip.small ? ' · ' + trip.small : ' · ' + panelText().noTrip);
      return;
    }
    if (w.t === 'sc25clock') {
      if (w.field === 'clock') {
        const d = new Date();
        node.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
      } else node.textContent = liveText({ field: 'time' })[0];
      return;
    }
    if (w.t === 'kbd') { updateKey(w, node); return; }
    if (w.t === 'spr') {
      if (w.eng) { node.classList.add('engl'); return; }       // engine lamp: driven by its own flicker timer
      updateKey(w, node);
      if (w.k === 'lamp' && deadNow()) node.classList.remove('on');
      // square key: no light of its own (the lamp above it tells the state); it stays pushed in while latched on
      // (not for hazard and indicators: their state pulses with the flasher, and the key must not pulse with it)
      if (w.k === 'sq') { const f = fnOf(w); node.classList.toggle('in', !!(f && f.latch && !BLINK.has(f.id) && isOn(w))); }
      return;
    }
    if (w.t === 'sgauge') {
      // Angle from telemetry value only — widget width/height never enter this formula.
      const spec = sovSpec(w.field);
      const v = deadNow() ? 0 : gaugeValue(w.field);
      const needle = node.querySelector('.needle');
      if (needle) needle.style.transform = 'rotate(' + (SWEEP * clamp(v / spec.max, 0, 1)).toFixed(1) + 'deg)';
      return;
    }
    if (w.t === 'sc25' || w.t === 'sc25bg') return;
    if (w.t === 'cgauge') {
      updateCgauge(w, node);
      return;
    }
    if (w.t === 'ign') {
      const state = ignState();
      node.dataset.s = String(state);
      node.style.setProperty('--key-deg', (state === 2 ? 90 : state ? 45 : 0) + 'deg');
      return;
    }
    if (w.t === 'live' || w.t === 'rtext' || w.t === 'fbar') node.classList.toggle('dead', deadNow());   // keeps its dark backing, loses the figures
    if (w.t === 'gauge') {
      node.querySelector('.sneedle').style.transform = 'rotate(' + skinNeedleAngle(w).toFixed(1) + 'deg)';
    } else if (w.t === 'live') {
      let parts = liveText(w);
      if (classicNow()) parts = parts.map(seg);
      const two = node.childNodes.length > 1;
      const trip = w.field === 'trip2';
      fitText(node.firstChild, parts[0], node.clientWidth, node.clientHeight, two ? (trip ? 0.4 : 0.62) : 0.82);
      if (two) fitText(node.lastChild, parts[1], node.clientWidth, node.clientHeight, trip ? 0.4 : 0.24);
    } else if (w.t === 'tell') {
      // with no game connected the lamps stay as painted
      const v = telValue(w.tel);
      // electrics just switched on: every lamp shows for a moment; electrics off: none does
      const check = Date.now() < (S.bulbUntil || 0);
      const dead = ignState() === 0 && (!!(S.tel && S.tel.sdk) || ignLocal !== 0 || S.ignUsed);
      const unknown = !S.tel || !S.tel.sdk || v === undefined;
      node.classList.toggle('off', !check && (unknown || dead || !v));
    } else if (w.t === 'rtext') {
      const v = mediaView();
      const playing = v.state === '▶' && v.top !== 'DEMO';
      let line = w.two || !playing ? v.line : v.top + ' - ' + v.line;
      if (classicNow()) { line = seg(line); v.top = seg(v.top); }
      const boxH = node.clientHeight;
      if (w.utility) {
        const d = new Date();
        const ptU = layout().lang === 'pt';
        const L = (en, p) => (ptU ? p : en);
        const clockMins = (mins) => {
          const m = ((Math.round(mins) % 1440) + 1440) % 1440;
          return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
        };
        const tm = node.querySelector('.mu-head time');
        const st = node.querySelector('.mu-head span');
        if (tm) {
          const clock = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
          if (tm.textContent !== clock) tm.textContent = clock;
        }
        if (st) {
          // setBridge uses 'ok'/'demo'/'pin'/'lost' — never 'online'
          const status = S.bridge === 'ok' ? 'MEDIA' : (S.bridge === 'demo' ? 'DEMO' : 'OFFLINE');
          if (st.textContent !== status) st.textContent = status;
        }
        const tl = curTel();
        const setCell = (key, valTxt) => {
          node.querySelectorAll('.obd-cell[data-k="' + key + '"] .obd-val').forEach((el) => {
            if (el.textContent !== valTxt) el.textContent = valTxt;
          });
        };
        const mphU = layout().units === 'mph';
        const spdU = (ms) => Math.round(Math.abs(ms) * (mphU ? 2.23694 : 3.6));
        const spdUnit = mphU ? 'mph' : 'km/h';
        const distUnit = mphU ? 'mi' : 'km';
        setCell('water', tl && tl.waterT != null && Number.isFinite(Number(tl.waterT)) ? String(Math.round(tempNum(tl.waterT))) : '--');
        // Fuel & Distance page shows the level in litres (Fernando's spec), not percent;
        // the bar fill still tracks the tank fraction.
        const fuelPct = tl && tl.fuelCap > 0 ? clamp(tl.fuel / tl.fuelCap, 0, 1) * 100 : null;
        setCell('fuel', tl && tl.fuelCap > 0 ? String(Math.round(tl.fuel)) : '--');
        const bootSweep = modernBootSweepPct();
        node.querySelectorAll('.obd-fuelbar[data-bar="fuel"] i').forEach((fuelBar) => {
          fuelBar.style.width = (bootSweep != null ? bootSweep : (fuelPct != null ? fuelPct : 0)) + '%';
        });
        setCell('air', tl && tl.air != null ? String(Math.round(tl.air)) : '--');
        setCell('air2', tl && tl.air != null ? String(Math.round(tl.air)) : '--');
        const airPct = tl && tl.air != null ? clamp(Number(tl.air) / 150, 0, 1) * 100 : null;
        node.querySelectorAll('.obd-fuelbar[data-bar="air"] i, .obd-fuelbar[data-bar="air2"] i').forEach((airBar) => {
          airBar.style.width = (bootSweep != null ? bootSweep : (airPct != null ? airPct : 0)) + '%';
        });
        setCell('oilP', tl && tl.oilP != null && Number.isFinite(Number(tl.oilP)) ? (Number(tl.oilP) / 14.5038).toFixed(1) : '--');
        setCell('cruise', tl && tl.cruise > 0.5 ? String(spdU(tl.cruise)) : L('OFF', 'DESL.'));
        setCell('retarder', tl ? tl.retarder + '/' + tl.retSteps : '--');
        // Decorative rear-of-truck/distance-ring graphic: static art, only its glow state is real,
        // lighting up whenever cruise control is actually engaged (Fernando's spec, no ACC telemetry exists).
        node.querySelectorAll('.obd-cruise-gfx').forEach((g) => g.classList.toggle('active', !!(tl && tl.cruise > 0.5)));
        setCell('consAvg', tl && tl.fuelAvg > 0 ? (tl.fuelAvg * 100).toFixed(1) : '--');
        setCell('consInst', tl && tl.fuelRate != null && Number(tl.fuelRate) > 0 ? Number(tl.fuelRate).toFixed(1) : '--');
        setCell('range', tl && tl.range > 0 ? String(mphU ? Math.round(tl.range / 1.60934) : Math.round(tl.range)) : '--');
        setCell('oilT', tl && tl.oilT != null ? String(Math.round(tempNum(tl.oilT))) : '--');
        setCell('batt', tl && tl.batt != null ? Number(tl.batt).toFixed(1) : '--');
        const adbluePct = tl && tl.adblueCap > 0 ? Math.round(tl.adblue / tl.adblueCap * 100) : null;
        setCell('adblue', adbluePct != null ? String(adbluePct) : '--');
        setCell('truck', tl && tl.truck ? String(tl.truck) : '--');
        setCell('model', tl && tl.model ? String(tl.model) : '--');
        const wearAvg = tl && Array.isArray(tl.wear) && tl.wear.length
          ? Math.round(tl.wear.reduce((a, b) => a + b, 0) / tl.wear.length) : null;
        setCell('wear', wearAvg != null ? String(wearAvg) : '--');
        setCell('gameTime', tl && tl.time != null ? clockMins(tl.time) : '--');
        node.querySelectorAll('.obd-cell[data-k="water"] .obd-unit, .obd-cell[data-k="oilT"] .obd-unit').forEach((u) => { u.textContent = tempUnit(); });
        node.querySelectorAll('.obd-cell[data-k="cruise"] .obd-unit').forEach((u) => { u.textContent = spdUnit; });
        node.querySelectorAll('.obd-cell[data-k="range"] .obd-unit').forEach((u) => { u.textContent = distUnit; });
        // Damage bars (Truck/Trailer/Cargo) fill the OBD's free space, matching the .sbar
        // percentage-bar convention already used by the Damage & trip widget.
        const dmgLbl = { dmgTruck: L('TRUCK', 'CAMIÃO'), dmgTrailer: L('TRAILER', 'TRAILER'), dmgCargo: L('CARGO', 'CARGA') };
        node.querySelectorAll('.obd-dmg-bar').forEach((bar) => {
          const k = bar.dataset.dmg;
          const hidden = k !== 'dmgTruck' && tl && tl.trailer === false;
          const v = tl && !hidden ? (tl[k] || 0) : null;
          const lbl = bar.querySelector('small');
          const fillB = bar.querySelector('u b');
          if (lbl && lbl.textContent !== dmgLbl[k]) lbl.textContent = dmgLbl[k];
          if (fillB) fillB.style.width = (v != null ? v : 0) + '%';
          bar.classList.toggle('bad', v != null && v >= 15);
          bar.classList.toggle('warn', v != null && v >= 5 && v < 15);
          bar.classList.toggle('hidden', !!hidden);
        });
        const now = Date.now();
        const bulbCheck = now < (S.bulbUntil || 0);
        node.querySelectorAll('.tell').forEach((el) => {
          const flag = el.dataset.flag;
          let on = !!(tl && tl[flag]);
          // Lights rotary detent owns the position-lamp and dipped-beam telltales until
          // telemetry leaves the stage the click started from. `park` stays the brake.
          if (flag === 'low' || flag === 'parking') {
            const held = unconfirmedLightStage();
            if (held !== null) on = flag === 'low' ? held >= 3 : held >= 2;
          }
          if ((flag === 'lift' || flag === 'trailerLift') && now < (S.liftFlashUntil || 0) && S.liftFlashFlag === flag) on = true;
          if (bulbCheck) on = true; // ignition bulb check / modern boot
          el.classList.toggle('lit', on);
          const img = el.querySelector('img');
          const base = el.dataset.src;
          if (img && base) {
            const next = base + (on ? '_on.png' : '_off.png');
            if (!img.getAttribute('src') || !img.getAttribute('src').endsWith(on ? '_on.png' : '_off.png')) img.src = next;
          }
        });
        // Slim global footer player, visible on every page above the TRUCK/TRAILER/CARGO bar.
        // Clean "Music Player" \u2014 no in-game FM radio switch; always mirrors the PC bridge's
        // now-playing text. Volume keys stay mapped to the OS media keys (Windows/Spotify).
        const mediaLive = S.bridge === 'demo' || !!(S.media && (S.media.running || S.media.playing || S.media.title || S.media.artist));
        const trackTxt = v.top === 'DEMO' ? (v.line || 'DEMO') : (v.line || v.top || (mediaLive ? '' : '\u2014'));
        const artistTxt = (S.media && S.media.artist) || '';
        const isPlaying = v.state === '\u25b6';
        const ptMedia = layout().lang === 'pt';
        const ompTrack = node.querySelector('.omp-track');
        const trackLabel = (ptMedia ? 'FAIXA: ' : 'TRACK: ') + (trackTxt || '\u2014');
        if (ompTrack && ompTrack.textContent !== trackLabel) ompTrack.textContent = trackLabel;
        const ompArtist = node.querySelector('.omp-artist');
        const artistLabel = artistTxt ? (ptMedia ? 'ARTISTA: ' : 'ARTIST: ') + artistTxt : '';
        if (ompArtist && ompArtist.textContent !== artistLabel) ompArtist.textContent = artistLabel;
        const ompEl = node.querySelector('.obd-media');
        if (ompEl) ompEl.classList.toggle('playing', isPlaying);
        // Cargo & Trip screen (data-si="4"): trip fields read straight off raw telemetry.
        const tripEl = node.querySelector('.obd-trip');
        if (tripEl) {
          const pt = layout().lang === 'pt';
          const cur = layout().currency || '\u20ac';
          const onJob = tl && tl.onJob !== false && tl.cityFrom;
          const set = (k, v) => { const el = tripEl.querySelector('[data-trip="' + k + '"] .obd-trip-val'); if (el && el.textContent !== v) el.textContent = v; };
          const destCc = onJob ? cityCountry(tl.cityTo) : '';
          set('dest', onJob ? [tl.cityTo + (destCc ? ' (' + destCc + ')' : ''), tl.compTo].filter(Boolean).join(' \u00b7 ') : '--');
          set('cargo', onJob ? (tl.cargo || '--') : '--');
          set('mass', onJob && tl.mass > 0 ? (tl.mass / 1000).toFixed(1).replace('.', pt ? ',' : '.') + ' t' : '--');
          set('income', onJob && tl.income > 0 ? cur + Math.round(tl.income / 100).toLocaleString(pt ? 'pt-BR' : 'en-US') : '--');
          set('eta', onJob && tl.routeTime > 0 ? Math.floor(tl.routeTime / 3600) + 'h' + pad2(Math.round(tl.routeTime / 60) % 60) : '--');
        }
      } else {
        // Classic / non-utility rtext (media strip)
        const wideRt = !!w.two && node.clientWidth > boxH * 4.2;
        node.classList.toggle('rt-wide', wideRt);
        const rk = node.querySelector('.rt-keys');
        if (rk) rk.style.fontSize = (boxH * (wideRt ? 0.3 : 0.17)).toFixed(1) + 'px';
        const bEl = node.querySelector('b');
        if (bEl) {
          const span = bEl.firstChild;
          if (w.two) {
            const freightEl = node.querySelector('.freight');
            const tl = curTel();
            let freightTxt = '';
            if (tl && tl.onJob !== false && tl.cityFrom) {
              const cur = layout().currency || '\u20ac';
              freightTxt = tl.cityFrom + ' \u2192 ' + tl.cityTo + ' \u00b7 ' + (tl.cargo || '') +
                (tl.income ? ' \u00b7 ' + cur + (tl.income / 100).toLocaleString(undefined, { minimumFractionDigits: 0 }) : '');
            }
            if (freightEl && freightEl.textContent !== freightTxt) freightEl.textContent = freightTxt;
            if (freightEl) freightEl.style.fontSize = (boxH * (wideRt ? 0.19 : 0.13) * (w.fs || 1)).toFixed(1) + 'px';
            const artistEl = node.querySelector('small');
            if (artistEl) {
              artistEl.textContent = v.top;
              artistEl.style.fontSize = (boxH * (wideRt ? 0.21 : 0.16) * (w.fs || 1)).toFixed(1) + 'px';
            }
          }
          bEl.style.fontSize = (boxH * (w.two ? (wideRt ? 0.34 : 0.26) : 0.58) * (w.fs || 1)).toFixed(1) + 'px';
          if (span && span.textContent !== line) {
            span.textContent = line;
            bEl.classList.remove('scroll');
            bEl.classList.toggle('scroll', span.offsetWidth > bEl.clientWidth + 2);
          }
        }
      }
    } else if (w.t === 'fbar') {
      const t = curTel();
      node.firstChild.style.width = (t && t.fuelCap > 0 ? clamp(t.fuel / t.fuelCap, 0, 1) * 100 : 0) + '%';
    } else if (w.t === 'gps') {
      if (node.classList.contains('tinfo')) updateTruckInfo(node);
    } else if (w.t === 'hot') {
      const f = fnOf(w);
      let on = f.id === 'wipers_back' ? false : isOn(w);   // the off key has no LED: only a faint presence light
      // Lights key: one key, the game cycles it. Stage 1 = parking (dash lighting), 2 = headlights, 0 = off;
      // the lamp is amber on stage 1 and green on stage 2.
      if (f.id === 'lights') { const st = lightStage(); on = st > 0; node.dataset.stage = String(st); }
      let shown = on;
      if (on && BLINK.has(f.id)) {
        // With the game connected the indicator lamps already flash in the telemetry; the
        // hazard key (reported as a steady state) borrows them. Without it, our own flasher.
        const t = S.tel && S.tel.sdk ? S.tel : null;
        if (!t) shown = S.phase;
        else if (f.id === 'hazard' || f.id === 'hazard_alert' || f.id === 'turn_signal_single') shown = !!(t.blinkL || t.blinkR);
        else if ((f.id === 'blinker_left' || f.id === 'left_turn_signal') && t.hazard) shown = !!(t.blinkL || t.blinkR);
        else if ((f.id === 'blinker_right' || f.id === 'right_turn_signal') && t.hazard) shown = !!(t.blinkL || t.blinkR);
        else if (f.behavior === 'blink' || (LAMP_INDICATORS[f.id] && LAMP_INDICATORS[f.id].behavior === 'blink')) {
          const tel = (LAMP_INDICATORS[f.id] && LAMP_INDICATORS[f.id].tel) || f.tel;
          if (tel !== 'blinkL' && tel !== 'blinkR' && tel !== 'blinkEither' && tel !== 'hazard') shown = S.phase;
        }
      }
      node.classList.toggle('on', shown);
      node.classList.toggle('plain', f.id === 'wipers_back');
      // a switch that is off is not lit in colour (controls that ARE coloured keep it)
      node.classList.toggle('idle', !shown && !w.solid && w.fn !== 'hazard' && w.fn !== 'hazard_alert' && (f.latch || !!f.tel));
      node.classList.toggle('down', S.pressed.has(w.id));
      node.classList.toggle('sel', S.edit && S.sel === w.id);
    }
  }

  // ---- Ignition key (classic panels) ---------------------------------------------------------
  // One barrel, three taps, like turning a real key: electrics, start, everything off.
  // 0 = off, 1 = electrics on, 2 = engine running, 3 = stalled. The game says which when
  // it is connected; otherwise the app keeps count itself.
  let ignLocal = 0;
  // Stall has no dedicated SDK field: electrics stay on but rpm drops to 0 after the engine
  // has actually been running (electric-but-never-run is just the pre-start idle, not a stall).
  let ignWasRunning = false;
  function ignState() {
    const t = S.tel && S.tel.sdk ? S.tel : null;
    if (!t) return ignLocal;
    if (t.engine) { ignWasRunning = true; return 2; }
    if (t.electric) {
      const stalled = ignWasRunning && (Number(t.rpm) || 0) === 0;
      if (!stalled) ignWasRunning = false;
      return stalled ? 3 : 1;
    }
    ignWasRunning = false;
    return 0;
  }
  // How a truck is started, and what the game allows:
  //   real cab : key to ON (electrics: dash lights up, every warning lamp shows for a moment),
  //              key held against a spring to START until the engine fires, key springs back to
  //              ON; key to OFF stops the engine and the electrics together.
  //   game     : "electrics" and "start/stop engine" are two separate on/off keys, and the
  //              engine key alone also brings the electrics up.
  // So: press 1 = electrics (with the lamp check), press 2 = start (the key sits at START while
  // the finger is down and springs back), press 3 = engine off, then electrics off.
  let ignTried = 0;   // when "electrics" was last sent without the game reacting
  function pressIgn(node) {
    // Combined (Electrics + Engine) state machine on one physical key:
    //   stage 0 → 1st tap: electrics ON + red timer ring on the key
    //   stage 1/3 → 2nd tap: engine START
    //   stage 2 → tap: engine OFF then electrics OFF
    const l = layout();
    const keyOf = (id) => (l.binds && l.binds[id]) || (FUNCTIONS[id] && FUNCTIONS[id].keys) || [];
    const before = ignState();
    buzz(before === 0 ? 14 : 30);
    if (before === 0) {
      send('tap', keyOf('electrics'));
      ignLocal = 1;
      if (!S.tel || !S.tel.sdk) S.latched.engine = false;
      // Visual timer: red spinning ring while electrics come up (not a hold-to-confirm).
      if (node) {
        node.classList.add('holding', 'ign-timer');
        const clear = () => { node.classList.remove('holding', 'ign-timer'); };
        setTimeout(clear, 1100);
      }
    } else if (before === 1 || before === 3) {
      send('tap', keyOf('engine'));
      if (node) {
        node.classList.add('crank');
        const back = () => { node.classList.remove('crank'); node.removeEventListener('pointerup', back); node.removeEventListener('pointercancel', back); node.removeEventListener('pointerleave', back); };
        node.addEventListener('pointerup', back); node.addEventListener('pointercancel', back); node.addEventListener('pointerleave', back);
        setTimeout(back, 1200);
      }
      ignLocal = 2;
      if (!S.tel || !S.tel.sdk) S.latched.engine = true;
    } else {
      send('tap', keyOf('engine'));
      setTimeout(() => send('tap', keyOf('electrics')), 120);
      ignLocal = 0;
      if (!S.tel || !S.tel.sdk) S.latched.engine = false;
    }
    S.ignUsed = true;
    updateStates();
  }

  // Photoreal key-slot (has-asset): tap advances the Combined machine immediately.
  function tapIgnCombined(node) {
    pressIgn(node);
  }

  function holdIgnition(node) {
    // Classic / non-photo keys still need a deliberate 1 s hold so a brush never kills the engine.
    let done = false;
    node.classList.add('holding');
    const cancel = () => {
      node.removeEventListener('pointerup', cancel);
      node.removeEventListener('pointercancel', cancel);
      node.removeEventListener('pointerleave', cancel);
      clearTimeout(timer);
      if (!done) node.classList.remove('holding');
    };
    const timer = setTimeout(() => {
      done = true;
      node.classList.remove('holding');
      cancel();
      pressIgn(node);
    }, 1000);
    node.addEventListener('pointerup', cancel);
    node.addEventListener('pointercancel', cancel);
    node.addEventListener('pointerleave', cancel);
  }

  // ---- Truck information screen (modern panels) ---------------------------------------------
  // ---- Old Soviet panel ---------------------------------------------------------------------------
  // Scales chosen to fit the dial in the photo: seven long marks, 45 degrees apart, over 270 degrees.
  function sovSpec(field) {
    const mph = layout().units === 'mph';
    switch (field) {
      case 'rpm': return { max: 3000, step: 500, text: (v) => v / 100, unit: '\u00d7100' };
      case 'fuel': return { max: 1, step: 0.5, text: (v) => (v === 0 ? '0' : v === 1 ? '1' : '\u00bd'), unit: panelText().unitFuel };
      case 'air': return { max: 150, step: 50, text: (v) => v, unit: 'PSI' };
      default: return mph ? { max: 90, step: 15, text: (v) => v, unit: 'MPH' } : { max: 120, step: 20, text: (v) => v, unit: 'KM/H' };
    }
  }
  function sovGaugeSvg(field) {
    const spec = sovSpec(field);
    let nums = '';
    for (let v = 0; v <= spec.max + 1e-9; v += spec.step) {
      const p = polar(68, SWEEP_START + SWEEP * v / spec.max);
      nums += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 3).toFixed(1) + '">' + esc(String(spec.text(Math.round(v * 100) / 100))) + '</text>';
    }
    // the needle is drawn pointing at the first mark and turned by CSS
    const a = SWEEP_START * Math.PI / 180;
    const tip = [100 + 78 * Math.cos(a), 100 + 78 * Math.sin(a)], tail = [100 - 14 * Math.cos(a), 100 - 14 * Math.sin(a)];
    // Needle is drawn already at SWEEP_START (135°). CSS rotate(SWEEP * v/max) adds only the
    // telemetry angle — widget width/height never enter the formula. Pivot = viewBox (100,100).
    return '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g class="nums">' + nums + '</g><text class="unit" x="100" y="165">' + esc(spec.unit) + '</text>' +
      '<g class="needle" style="transform-box:view-box;transform-origin:100px 100px"><line x1="' + tail[0].toFixed(1) + '" y1="' + tail[1].toFixed(1) + '" x2="' + tip[0].toFixed(1) + '" y2="' + tip[1].toFixed(1) + '"/></g>' +
      '<circle class="hub" cx="100" cy="100" r="7"/><circle class="hub2" cx="100" cy="100" r="2.6"/></svg>';
  }
  // Engine lamp beside the key: an old bulb fed by a tired alternator. Off with the engine off, a faint
  // unsteady glow on ignition only, and with the engine running its brightness follows the engine speed:
  // weak and stuttering at idle (with the odd drop-out), strong and steady at speed.
  let engLv = 0;
  setInterval(() => {
    // Factory .k-spr.engl and atomic .k-kbd.engl (low-beam telltale) share the same --lv flicker.
    const nodes = panel.querySelectorAll('.engl');
    if (!nodes.length) return;
    const t = curTel();
    let target = 0;
    if (t && !deadNow()) {
      const running = t.engine !== false && t.rpm > 150;
      if (!running) target = 0.14 + Math.random() * 0.05;
      else {
        const k = clamp((t.rpm - 450) / 1300, 0, 1);            // 0 at idle, 1 from about 1750 rpm
        const flick = (0.34 - 0.29 * k) * (Math.random() * 2 - 1); // wide swing at idle, almost none at speed
        target = 0.42 + 0.58 * k + flick;
        if (k < 0.25 && Math.random() < 0.07) target *= 0.3;      // the bulb "misses" now and then at idle
      }
    }
    engLv += (clamp(target, 0, 1.1) - engLv) * 0.55;             // a filament does not switch instantly
    const v = engLv.toFixed(3);
    const lit = engLv > 0.05;
    nodes.forEach((n) => {
      n.style.setProperty('--lv', v);
      n.classList.toggle('lit', lit);
      if (n.dataset.lampOn && n.dataset.lampOff) {
        n.style.setProperty('--asset', cssUrl(lit ? n.dataset.lampOn : n.dataset.lampOff));
      }
    });
  }, 70);

  // Hazard lit (hazard-fail): no erratic fail-flicker. Light OFF↔ON is owned by updateKey
  // and stays in sync with blink/telemetry phase. Body never sinks (CSS transform:none).

  // Polyvox-style amber gauge glow: each gauge has its own flickering bulb on tired Soviet wiring.
  // Follows dash lights (backlit()), intensity tracks RPM, each gauge flickers independently.
  setInterval(() => {
    const gauges = panel.querySelectorAll('.k-sgauge .sg');
    if (!gauges.length) return;
    const t = curTel();
    const lit = backlit() && !deadNow();
    gauges.forEach((sg) => {
      let lv = parseFloat(sg.dataset.glv) || 0;
      // unique seed per gauge so each one flickers on its own cycle
      if (!sg.dataset.gseed) sg.dataset.gseed = String(Math.random());
      const seed = parseFloat(sg.dataset.gseed);
      let target = 0;
      if (lit && t) {
        const rpm = t.rpm || 0;
        const running = t.engine !== false && rpm > 150;
        if (!running) {
          // ignition only, engine off: very faint unstable glow
          target = 0.08 + Math.random() * 0.04;
        } else {
          const k = clamp((rpm - 500) / 1800, 0, 1);            // 0 at idle, 1 from ~2300 rpm
          // per-gauge flicker: wide swing at idle, almost none at speed
          const flick = (0.06 - 0.05 * k) * (Math.random() * 2 - 1);
          // sine-wave micro-tremor offset by the gauge's own seed
          const tremor = Math.sin(Date.now() * 0.003 + seed * 628) * 0.012 * (1 - k * 0.8);
          // Keep the face readable while capping the high-RPM peak ~30% lower.
          target = 0.17 + 0.35 * k + flick * 0.7 + tremor * 0.7;
          // occasional dropout at low RPM: the bulb "misses" — old wiring
          if (k < 0.15 && Math.random() < (0.008 + seed * 0.005)) target *= 0.4;
        }
      }
      // filament inertia: slightly different response time per gauge
      const smooth = 0.42 + seed * 0.18;
      lv += (clamp(target, 0, 1) - lv) * smooth;
      sg.dataset.glv = lv.toFixed(4);
      sg.style.setProperty('--glow', lv.toFixed(3));
    });
  }, 70);

  // ---- Cabin light map ------------------------------------------------------------------------
  // Night is lit the way 2D games light a scene. The panel art is the albedo; a low-resolution
  // light map multiplies over it. The map starts from a dim, cool ambient (moon and street light
  // through the windscreen: brighter at the top, falling toward the floor, darker in the corners)
  // and every real light source in the cab is added on top: screens, gauge dials, warning lamps
  // and the backlit pictograms of the keys. A source is white where it sits (an emitter is never
  // darkened) and spills its own colour onto the fascia around it with a soft falloff, so keys
  // next to a screen read better than keys in a far corner. A second, additive layer adds a faint
  // bloom halo around the brightest sources. The whole map slides toward white with the cabin
  // level, which is all dusk and dawn need.
  const LM_SCALE = 0.25;                       // the map is soft by nature: a quarter resolution is plenty
  const lmCssv = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
  const lmMap = document.createElement('canvas'); lmMap.className = 'lightmap';
  const lmBloom = document.createElement('canvas'); lmBloom.className = 'lightbloom';
  const lmCtx = lmMap.getContext('2d'), lbCtx = lmBloom.getContext('2d');
  let lmSrc = null, lmAt = 0, lmW = 0, lmH = 0;

  // Where every possible light source sits, in map pixels. Positions and colours only change
  // when the panel is rebuilt or resized, so they are read rarely; on/off is read every frame.
  function lmCollect() {
    const pr = panel.getBoundingClientRect();
    const sx = lmW / (pr.width || 1), sy = lmH / (pr.height || 1);
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - pr.left) * sx, y: (r.top - pr.top) * sy, w: r.width * sx, h: r.height * sy }; };
    const src = { probe: panel.firstElementChild, screens: [], lamps: [], dials: [], keys: [] };
    panel.querySelectorAll('.k-gps, .k-rtext, .k-live, .vf-glass, .w.display, .w.radio_widget, .w.live, .w.status, .w.gps, .scania-obc').forEach((el) => {
      const b = box(el); if (b.w < 1 || b.h < 1) return;
      b.col = el.classList.contains('scania-obc') ? (lmCssv(panel, '--scania-accent') || '#54a9ff') : (el.classList.contains('vf-glass') ? '#46ebb9' : (lmCssv(el, '--acc') || '#7fb2ea'));
      src.screens.push(b);
    });
    panel.querySelectorAll('.w .led, .w .lamp, .k-spr.s-lamp .pic, .k-tell .tell-ico').forEach((el) => {
      const w = el.closest('.w'); const b = box(el); if (b.w < 0.5) return;
      b.w0 = w; b.engl = w.classList.contains('engl');
      b.tell = w.classList.contains('k-tell');
      b.col = b.tell ? getComputedStyle(el).color : (w.classList.contains('k-spr') ? lmCssv(w, '--glow') || lmCssv(w, '--lamp') : lmCssv(w, '--lamp') || lmCssv(w, '--glow')) || '#ffb02e';
      src.lamps.push(b);
    });
    panel.querySelectorAll('.k-sgauge .sg, .k-gauge, .k-cgauge').forEach((el) => {
      const b = box(el); b.el = el; b.sov = el.classList.contains('sg'); b.scania = el.classList.contains('k-cgauge');
      if (b.scania) b.col = lmCssv(panel, '--scania-accent') || '#54a9ff';
      src.dials.push(b);
    });
    // backlit symbols and legends (never the ones drawn inside a screen)
    panel.querySelectorAll('.w .ico, .w .lbl, .w .atomic-picto, .k-hot .cap').forEach((el) => {
      if (el.closest('.k-gps, .k-rtext, .rt-keys, .k-live')) return;
      const w = el.closest('.w'); const b = box(el); if (b.w < 0.5) return;
      b.w0 = w; b.kind = el.classList.contains('ico') || el.classList.contains('atomic-picto') ? 'ico' : el.classList.contains('lbl') ? 'lbl' : 'cap';
      b.col = lmCssv(w, '--lamp') || '#ffb02e';
      src.keys.push(b);
    });
    return src;
  }

  // Draws only the blurred shadow of a shape: the shape itself is pushed off the canvas and the
  // shadow offset brings the glow back in place. A gaussian falloff with no hard edge anywhere.
  function lmGlow(ctx, col, blur, alpha, shape) {
    if (alpha <= 0.003) return;
    const off = 20000;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha); ctx.shadowColor = col; ctx.shadowBlur = Math.max(0.5, blur); ctx.shadowOffsetX = off;
    ctx.fillStyle = '#000'; ctx.translate(-off, 0); ctx.beginPath(); shape(ctx); ctx.fill();
    ctx.restore();
  }
  const lmRect = (b, pad) => (c) => c.rect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
  const lmDisc = (cx, cy, r) => (c) => c.arc(cx, cy, Math.max(0.5, r), 0, Math.PI * 2);

  function lmDraw() {
    const c = typeof _cabinLv === 'number' ? _cabinLv : 0;
    if (lmMap.parentNode !== panel) { panel.appendChild(lmMap); panel.appendChild(lmBloom); lmSrc = null; }
    const on = c > 0.01 && !S.edit && !S.deco;
    lmMap.style.display = lmBloom.style.display = on ? '' : 'none';
    if (!on) return;
    const W = Math.max(8, Math.round(panel.clientWidth * LM_SCALE)), H = Math.max(8, Math.round(panel.clientHeight * LM_SCALE));
    if (W !== lmW || H !== lmH) { lmMap.width = lmBloom.width = lmW = W; lmMap.height = lmBloom.height = lmH = H; lmSrc = null; }
    const now = Date.now();
    if (!lmSrc || (lmSrc.probe && !lmSrc.probe.isConnected) || now - lmAt > 2000) { lmSrc = lmCollect(); lmAt = now; }
    const dead = deadNow(), lit = backlit() && !dead;
    const br = parseFloat(panel.style.getPropertyValue('--disp-bright')) || 1;
    const isOn = (w) => w.classList.contains('on') || w.classList.contains('lit');
    const m = lmCtx, bl = lbCtx;

    // ambient: cool, brightest at the windscreen, falling off toward the floor
    m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1; m.shadowBlur = 0;
    const g = m.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgb(78, 86, 108)'); g.addColorStop(0.4, 'rgb(52, 58, 74)'); g.addColorStop(1, 'rgb(32, 35, 45)');
    m.fillStyle = g; m.fillRect(0, 0, W, H);
    // the corners of the cab are the darkest
    m.globalCompositeOperation = 'multiply';
    const v = m.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.hypot(W, H) * 0.62);
    v.addColorStop(0, '#fff'); v.addColorStop(1, 'rgb(140, 140, 150)');
    m.fillStyle = v; m.fillRect(0, 0, W, H);

    m.globalCompositeOperation = 'lighter';
    bl.setTransform(1, 0, 0, 1, 0, 0); bl.globalCompositeOperation = 'source-over'; bl.clearRect(0, 0, W, H);

    // screens: the biggest emitters. Mostly dark glass with bright figures, so the spill is moderate.
    if (!dead) for (const s of lmSrc.screens) {
      const sz = s.w + s.h;
      lmGlow(m, s.col, sz * 0.1, 0.6 * br, lmRect(s, 0));
      lmGlow(m, s.col, sz * 0.4, 0.4 * br, lmRect(s, 0));
      m.globalAlpha = 1; m.fillStyle = '#fff'; m.fillRect(s.x, s.y, s.w, s.h);
      lmGlow(bl, s.col, sz * 0.18, 0.28 * br, lmRect(s, 0));
    }
    // gauge dials: lit from behind only when the dash lighting is on
    for (const d of lmSrc.dials) {
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2, r = Math.min(d.w, d.h) / 2;
      if (d.sov) {
        const gl = parseFloat(d.el.style.getPropertyValue('--glow')) || 0;
        // Soviet gauges: warm amber pool, enough to read the face but not a floodlight.
        // Even unlit (gl≈0) keep a faint base disc so numerals don't vanish into the night lightmap.
        m.globalAlpha = gl > 0.01 ? Math.min(1, 0.7 * gl) : 0.4;
        m.fillStyle = 'rgb(255, 196, 128)';
        m.beginPath(); m.arc(cx, cy + r * 0.05, r * 0.82, 0, Math.PI * 2); m.fill();
        if (gl <= 0.01) continue;
        lmGlow(m, '#ff9a3c', r * 0.8, 0.4 * gl, lmDisc(cx, cy + r * 0.15, r * 0.6));
        lmGlow(m, '#ffb85c', r * 1.2, 0.12 * gl, lmDisc(cx, cy, r * 0.7));
        lmGlow(bl, '#ff9a3c', r * 0.6, 0.18 * gl, lmDisc(cx, cy + r * 0.15, r * 0.5));
      } else if (d.scania && !dead && (lit || panel.classList.contains('scania-powered'))) {
        m.globalAlpha = lit ? 0.76 : 0.42; m.fillStyle = '#e6f3ff';
        m.beginPath(); m.arc(cx, cy, r * 0.9, 0, Math.PI * 2); m.fill();
        lmGlow(m, d.col || '#54a9ff', r * 0.82, lit ? 0.42 : 0.2, lmDisc(cx, cy, r * 0.78));
        lmGlow(bl, d.col || '#54a9ff', r * 0.68, lit ? 0.24 : 0.1, lmDisc(cx, cy, r * 0.62));
      } else if (lit) {
        m.globalAlpha = 0.85; m.fillStyle = 'rgb(215, 228, 255)';
        m.beginPath(); m.arc(cx, cy, r * 0.92, 0, Math.PI * 2); m.fill();
        lmGlow(m, '#8fbfff', r * 0.8, 0.35, lmDisc(cx, cy, r * 0.8));
      }
    }
    // backlit symbols and legends: a faint warm glow bleeding through the key, stronger when active
    if (lit) for (const k of lmSrc.keys) {
      const active = isOn(k.w0);
      const col = active ? k.col : (panel.classList.contains('scania-sr') ? lmCssv(panel, '--scania-accent') || '#54a9ff' : '#ffdcb0');
      const a = 0.85 * (k.kind === 'ico' ? (active ? 0.9 : 0.42) : k.kind === 'lbl' ? (active ? 0.5 : 0.26) : (active ? 0.45 : 0.2));
      const sz = Math.min(k.w, k.h);
      lmGlow(m, col, sz * 0.12, a, lmRect(k, 0));
      lmGlow(m, col, sz * 0.5, a * 0.3, lmRect(k, 0));
    }
    // warning and status lamps: small, intense, strongly coloured
    const ledGlow = 0.72 + 0.43 * c; // restrained by day, broader/brighter in a dark cabin
    for (const l of lmSrc.lamps) {
      if (l.tell ? l.w0.classList.contains('off') : !isOn(l.w0)) continue;
      const a = l.engl ? Math.min(1, parseFloat(l.w0.style.getPropertyValue('--lv')) || 0) : 1;
      if (a <= 0.02) continue;
      const cx = l.x + l.w / 2, cy = l.y + l.h / 2, r = Math.max(l.w, l.h) / 2;
      lmGlow(m, l.col, r * (1.35 + 0.45 * c), 0.9 * a * ledGlow, lmDisc(cx, cy, r * 0.55));
      lmGlow(m, l.col, r * (4.5 + 2.2 * c), 0.45 * a * ledGlow, lmDisc(cx, cy, r * 0.6));
      m.globalAlpha = a; m.fillStyle = '#fff'; m.beginPath(); m.arc(cx, cy, r * 0.6, 0, Math.PI * 2); m.fill();
      lmGlow(bl, l.col, r * (2.2 + 1.5 * c), 0.6 * a * ledGlow, lmDisc(cx, cy, r));
    }
    // the bloom never washes over a screen's own figures
    bl.globalCompositeOperation = 'destination-out'; bl.globalAlpha = 1; bl.fillStyle = '#000';
    if (!dead) for (const s of lmSrc.screens) bl.fillRect(s.x, s.y, s.w, s.h);

    // dusk and dawn: slide the whole map toward white (no change at all)
    m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1 - c; m.fillStyle = '#fff'; m.fillRect(0, 0, W, H);
    m.globalAlpha = 1;
    lmBloom.style.opacity = c.toFixed(3);
  }
  setInterval(lmDraw, 70);

  // Seven-segment figures. Lit segments glow, the others stay faintly visible, as on the real tube.
  const SEG7 = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
    '-': 'g', N: 'ceg', R: 'eg', C: 'adef', A: 'abcefg', D: 'bcdeg', P: 'abefg', E: 'adefg', F: 'aefg', L: 'def', H: 'bcefg', U: 'bcdef', O: 'abcdef', ' ': '' };
  const SEG_PATH = { a: 'M3.2 2H8.8', b: 'M10 3.2V8.8', c: 'M10 11.2V16.8', d: 'M3.2 18H8.8', e: 'M2 11.2V16.8', f: 'M2 3.2V8.8', g: 'M3.2 10H8.8' };
  function seg7(text) {
    let out = '';
    for (const ch of String(text).toUpperCase()) {
      if (ch === ':') { out += '<svg class="col" viewBox="0 0 4 20"><circle cx="2" cy="6.5" r="1"/><circle cx="2" cy="13.5" r="1"/></svg>'; continue; }
      const on = SEG7[ch] === undefined ? '' : SEG7[ch];
      if (ch === ' ') { out += '<svg class="col" viewBox="0 0 12 20"></svg>'; continue; }
      out += '<svg viewBox="0 0 12 20">' + 'abcdefg'.split('').map((k) => '<path' + (on.indexOf(k) >= 0 ? ' class="on"' : '') + ' d="' + SEG_PATH[k] + '"/>').join('') + '</svg>';
    }
    return out;
  }
  function updateVfd(node) {
    const pt = layout().lang === 'pt';
    const t = deadNow() ? null : curTel();
    const mph = layout().units === 'mph';
    node.style.fontSize = Math.max(8, node.clientHeight / 5.2).toFixed(1) + 'px';   // captions scale with the display
    const set = (k, text) => { const el = node.querySelector('.vf-d[data-k="' + k + '"]'); if (el.dataset.v !== text) { el.dataset.v = text; el.innerHTML = seg7(text); } };
    const caps = node.querySelectorAll('.vf-cap span');
    const names = [mph ? 'MPH' : 'KM/H', pt ? 'MARCHA' : 'GEAR', pt ? 'COMB. %' : 'FUEL %', pt ? 'HORA' : 'TIME'];
    caps.forEach((c, i) => { if (c.textContent !== names[i]) c.textContent = names[i]; });
    if (!t) { set('spd', '   '); set('gear', '  '); set('fuel', '   '); set('time', '  :  '); return; }
    const spd = Math.round(Math.abs(t.speed) * (mph ? 2.23694 : 3.6));
    const m = ((Math.round(t.time) % 1440) + 1440) % 1440;
    set('spd', String(spd).padStart(3, ' '));
    set('gear', String(gearLabel(t)).replace(/[^0-9A-Za-z-]/g, '').slice(-2).padStart(2, ' '));
    set('fuel', (t.fuelCap > 0 ? String(Math.round(t.fuel / t.fuelCap * 100)) : '--').padStart(3, ' '));
    set('time', pad2(Math.floor(m / 60)) + ':' + pad2(m % 60));
  }

  // Smooth RPM bar toward telemetry (~10 Hz SSE) so the fill looks ~60 fps instead of stepped.
  let rpmSmoothPct = 0;
  let rpmSmoothRaf = 0;
  let rpmSmoothNode = null;
  function rpmSmoothTick() {
    rpmSmoothRaf = 0;
    const node = rpmSmoothNode;
    if (!node || !node.isConnected) return;
    const fill = node.querySelector('.spd-rpm-fill');
    const target = Number(node.dataset.rpmTarget);
    if (!fill || !Number.isFinite(target)) return;
    const next = rpmSmoothPct + (target - rpmSmoothPct) * 0.28;
    rpmSmoothPct = Math.abs(target - next) < 0.15 ? target : next;
    fill.style.height = rpmSmoothPct.toFixed(2) + '%';
    if (rpmSmoothPct !== target) {
      rpmSmoothRaf = requestAnimationFrame(rpmSmoothTick);
    }
  }
  function setRpmBarSmooth(node, pct) {
    node.dataset.rpmTarget = String(pct);
    rpmSmoothNode = node;
    if (!rpmSmoothRaf) rpmSmoothRaf = requestAnimationFrame(rpmSmoothTick);
  }

  // Modern digital speedometer (dash-speedometer → gps/hero). Scales via CSS cq* on .spd-body —
  // do not set node.style.fontSize here (that fought container queries on the old hero).
  function updateHeroInfo(node) {
    const pt = layout().lang === 'pt';
    const L = (en, p) => (pt ? p : en);
    const t = curTel();
    const mph = layout().units === 'mph';
    const setTxt = (sel, txt) => { const el = node.querySelector(sel); if (el && el.textContent !== txt) el.textContent = txt; };
    const setTele = (key, label, value, level) => {
      const cell = node.querySelector('.spd-tele .ti-c[data-k="' + key + '"]');
      if (!cell) return;
      const span = cell.querySelector('span');
      const b = cell.querySelector('b');
      if (span && span.textContent !== label) span.textContent = label;
      if (b && b.textContent !== value) b.textContent = value;
      cell.classList.toggle('bad', level === 'bad');
      cell.classList.toggle('warn', level === 'warn');
    };
    const fill = node.querySelector('.spd-rpm-fill');
    const rpmTrack = node.querySelector('.spd-rpm');
    // layout().rpmTrack === false → bare colored fill only (no silhouette PNG).
    node.classList.toggle('no-rpm-track', layout().rpmTrack === false);
    if (!t) {
      setTxt('.spd-speed', '--');
      setTxt('.spd-unit', mph ? 'mph' : 'km/h');
      setTxt('.spd-gear', '--');
      const limitElEmpty = node.querySelector('.spd-limit');
      if (limitElEmpty) limitElEmpty.classList.remove('show', 'bad');
      setTele('oil', L('Oil', 'Óleo'), '--');
      setTele('batt', L('Battery', 'Bateria'), '--');
      setTele('range', L('Range', 'Autonomia'), '--');
      setTele('trip', L('Trip', 'Viagem'), '--');
      setTxt('.spd-time', '--:--');
      setTxt('.spd-odo', '--');
      const bootSweepEmpty = modernBootSweepPct();
      setRpmBarSmooth(node, bootSweepEmpty != null ? bootSweepEmpty : 0);
      if (rpmTrack) rpmTrack.classList.toggle('red', bootSweepEmpty != null && bootSweepEmpty > 80);
      return;
    }
    const spd = (ms) => Math.round(Math.abs(ms) * (mph ? 2.23694 : 3.6));
    const dist = (km) => (mph ? Math.round(km * 0.621371) + ' mi' : Math.round(km) + ' km');
    const clock = (mins) => { const m = ((Math.round(mins) % 1440) + 1440) % 1440; return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); };
    const has = (v) => v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v));
    const over = t.limit > 0.5 && Math.abs(t.speed) > t.limit * 1.06;
    const speedEl = node.querySelector('.spd-speed');
    const speedVal = spd(t.speed);
    if (speedEl) {
      speedEl.classList.toggle('bad', over);
      speedEl.classList.toggle('three-digits', speedVal > 99);
    }
    setTxt('.spd-speed', String(speedVal));
    setTxt('.spd-unit', mph ? 'mph' : 'km/h');
    setTxt('.spd-gear', gearLabel(t));
    const limitEl = node.querySelector('.spd-limit');
    if (limitEl) {
      const hasLimit = t.limit > 0.5;
      limitEl.classList.toggle('show', hasLimit);
      limitEl.classList.toggle('bad', over);
      // Pulses red only while actually speeding past a known limit (not just "close to it").
      limitEl.classList.toggle('over-limit', hasLimit && Math.abs(t.speed) > t.limit);
      const limB = limitEl.querySelector('b');
      if (limB && hasLimit) { const txt = String(spd(t.limit)); if (limB.textContent !== txt) limB.textContent = txt; }
    }
    setTele('oil', L('Oil', 'Óleo'), has(t.oilT) ? Math.round(t.oilT) + '°' : '--', t.oilWarn ? 'bad' : '');
    setTele('batt', L('Battery', 'Bateria'), has(t.batt) ? Number(t.batt).toFixed(1) + ' V' : '--', t.battWarn ? 'bad' : '');
    setTele('range', L('Range', 'Autonomia'), t.range > 0 ? dist(t.range) : '--', t.fuelWarn ? 'bad' : '');
    setTele('trip', L('Trip', 'Viagem'), t.routeDist > 0 ? dist(t.routeDist / 1000) : '--');
    setTxt('.spd-time', clock(t.time));
    setTxt('.spd-odo', has(t.odo) ? (mph ? Math.round(t.odo * 0.621371) + ' mi' : Math.round(t.odo) + ' km') : '--');
    const rpmMax = gaugeSpec('rpm').max;
    const bootSweep = modernBootSweepPct();
    const rpmPct = bootSweep != null ? bootSweep : clamp(t.rpm / rpmMax, 0, 1) * 100;
    setRpmBarSmooth(node, rpmPct);
    const redStart = (gaugeSpec('rpm').bands.find((b) => b[2] === 'red') || [2400])[0];
    if (rpmTrack) rpmTrack.classList.toggle('red', bootSweep != null ? bootSweep > 80 : t.rpm > redStart);
  }

  // What a modern cab shows on its centre display, laid out in fixed places so the eye learns
  // them: route on top, engine speed, then a grid of values, wear and warnings at the bottom.
  function updateTruckInfo(node) {
    if (node.classList.contains('scania-obc')) { updateScaniaObc(node); return; }
    if (node.classList.contains('vfd')) { updateVfd(node); return; }
    if (node.classList.contains('hero')) { updateHeroInfo(node); return; }
    const pt = layout().lang === 'pt';
    const L = (en, p) => (pt ? p : en);
    const t = curTel();
    const mph = layout().units === 'mph';
    const h = node.clientHeight;
    // Three shapes of screen: a low wide strip (one row of four values), a tall narrow one
    // (two columns) and the normal one (three columns). Type is as large as the shape allows.
    const hero = node.dataset.hero === '1';
    const padR = Number(node.dataset.padr) || 0;
    if (padR) node.style.paddingRight = (node.offsetWidth * padR).toFixed(1) + 'px';
    const wd = node.clientWidth * (1 - padR);
    const small = h < wd * 0.42;
    const cols = small ? (hero ? 5 : 4) : wd < h * 1.25 ? 2 : 3;
    node.classList.toggle('small', small);
    node.style.fontSize = Math.max(7, small ? Math.min(h / 7.6, wd / 30) : Math.min(h / 15, wd / (cols * 7.6))).toFixed(1) + 'px';
    node.querySelector('.ti-grid').style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    const set = (sel, html) => { const el = node.querySelector(sel); if (el.innerHTML !== html) el.innerHTML = html; };
    if (!t) {
      set('.ti-dest', L('Waiting for the game', 'Aguardando o jogo')); set('.ti-clock', ''); set('.ti-rpm b', ''); set('.ti-grid', ''); set('.ti-foot', '');
      node.querySelector('.ti-rpm u').style.width = '0%';
      { const db = node.querySelector('.ti-dmg'); if (db) db.querySelectorAll('.ti-di b').forEach(b => b.textContent = ''); }
      return;
    }
    const spd = (ms) => Math.round(Math.abs(ms) * (mph ? 2.23694 : 3.6));
    const dist = (km) => (mph ? Math.round(km * 0.621371) + ' mi' : Math.round(km) + ' km');
    const clock = (mins) => { const m = ((Math.round(mins) % 1440) + 1440) % 1440; return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); };
    const has = (v) => v !== undefined && v !== null && v !== '';
    // header: where to, how far, when
    const route = t.routeDist > 0 ? dist(t.routeDist / 1000) + ' \u00b7 ' + L('arr. ', 'cheg. ') + clock(t.time + t.routeTime / 60) : panelText().noTrip;
    set('.ti-dest', (has(t.cityTo) && t.onJob !== false ? '<b>' + esc(t.cityTo) + '</b> ' : '') + esc(route));
    set('.ti-clock', panelText().days[Math.floor(t.time / 1440) % 7] + ' ' + clock(t.time));
    // damage indicators bar
    const dmgBar2 = node.querySelector('.ti-dmg');
    if (dmgBar2) {
      const vals = [t.dmgTruck || 0, t.dmgTrailer || 0, t.dmgCargo || 0];
      const spans = dmgBar2.querySelectorAll('.ti-di');
      for (let i = 0; i < 3; i++) {
        spans[i].querySelector('b').textContent = vals[i] + '%';
        spans[i].dataset.level = vals[i] >= 15 ? 'bad' : vals[i] >= 5 ? 'warn' : '';
      }
      spans[1].style.display = t.trailer === false ? 'none' : '';
      spans[2].style.display = t.trailer === false ? 'none' : '';
    }
    // engine speed bar, red past 2000
    node.querySelector('.ti-rpm u').style.width = clamp(t.rpm / gaugeSpec('rpm').max, 0, 1) * 100 + '%';
    node.querySelector('.ti-rpm').classList.toggle('red', t.rpm > (gaugeSpec('rpm').bands.find(b => b[2] === 'red') || [2000])[0]);
    set('.ti-rpm b', Math.round(t.rpm / 10) * 10 + ' rpm');
    const cell = (label, value, level) => '<div class="ti-c' + (level ? ' ' + level : '') + '"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
    const over = t.limit > 0.5 && Math.abs(t.speed) > t.limit * 1.06;
    const cells = [
      cell(L('Limit', 'Limite'), t.limit > 0.5 ? String(spd(t.limit)) : '--', over ? 'bad' : ''),
      cell(L('Cruise', 'Piloto'), t.cruise > 0.5 ? String(spd(t.cruise)) : L('off', 'desl.')),
      cell(L('Range', 'Autonomia'), t.range > 0 ? dist(t.range) : '--', t.fuelWarn ? 'bad' : ''),
      cell(L('Avg', 'M\u00e9dia'), t.fuelAvg > 0 ? (t.fuelAvg * 100).toFixed(1) + ' L' : '--'),
      cell(L('Air', 'Ar'), Math.round(t.air) + ' psi', t.airWarn || t.air < 65 ? 'bad' : ''),
      cell(L('Coolant', '\u00c1gua'), has(t.waterT) ? Math.round(t.waterT) + '\u00b0' : '--', t.waterWarn ? 'bad' : ''),
      cell(L('Oil', '\u00d3leo'), has(t.oilT) ? Math.round(t.oilT) + '\u00b0' : '--', t.oilWarn ? 'bad' : ''),
      cell(L('Battery', 'Bateria'), has(t.batt) ? Number(t.batt).toFixed(1) + ' V' : '--', t.battWarn ? 'bad' : ''),
    ];
    if (t.adblueCap > 0) cells.push(cell('AdBlue', Math.round(t.adblue / t.adblueCap * 100) + '%', t.adblueWarn ? 'bad' : ''));
    if (hero) {
      // speed, gear and fuel first (they used to live in their own small windows), then the two most useful extras
      cells.splice(0, 8, cell(L('Speed', 'Velocidade'), String(spd(t.speed)) + ' ' + (mph ? 'mph' : 'km/h'), over ? 'bad' : ''), cell(L('Gear', 'Marcha'), gearLabel(t)),
        cell(L('Fuel', 'Combust.'), t.fuelCap > 0 ? Math.round(t.fuel / t.fuelCap * 100) + '%' : '--', t.fuelWarn ? 'bad' : ''),
        cell(L('Limit', 'Limite'), t.limit > 0.5 ? String(spd(t.limit)) : '--', over ? 'bad' : ''), cell(L('Range', 'Autonomia'), t.range > 0 ? dist(t.range) : '--', t.fuelWarn ? 'bad' : ''));
    }
    set('.ti-grid', cells.slice(0, small ? cols : cols === 2 ? 8 : 9).join(''));
    // footer: wear, then whatever needs attention
    const lvl = (v) => (v >= 15 ? ' bad' : v >= 5 ? ' warn' : '');
    const dmg = (label, v) => '<span class="ti-d' + lvl(v) + '">' + esc(label) + ' <b>' + v + '%</b></span>';
    const warn = [];
    if (t.park) warn.push(L('PARK BRAKE', 'FREIO EST.'));
    if (t.airWarn) warn.push(L('LOW AIR', 'AR BAIXO'));
    if (t.fuelWarn) warn.push(L('LOW FUEL', 'COMB. BAIXO'));
    if (over) warn.push(L('SPEED', 'VELOCIDADE'));
    set('.ti-foot', (warn.length ? '<span class="ti-w">' + esc(warn.join(' · ')) + '</span>' : ''));
  }

  // ---- Modern OBD pages (eu_frame utility) — pad cycles like S/R 2016 -------------------------
  const MODERN_OBD_SCREENS = 5;
  function cycleModernObd(node, selected) {
    const n = MODERN_OBD_SCREENS;
    const cur = Number(node.dataset.screen) || 0;
    const next = Number.isInteger(selected) && selected >= 0 && selected < n ? selected : (cur + 1) % n;
    node.dataset.screen = String(next);
    node.querySelectorAll('.obd-screen').forEach((s, i) => s.classList.toggle('active', i === next));
    buzz(12);
  }

  // ---- Scania OBC update ---------------------------------------------------------------------
  // The Scania S/R 2016 Standard display exposes eight factory pages.
  const SCANIA_SCREENS = ['Vehicle data', 'Pressure', 'Temperatures', 'Cruise Control', 'Fuel', 'Speed', 'Vehicle', 'Timer'];

  function cycleScania(node, selected) {
    // The in-game Dashboard display modes control advances pages, matching the companion panel.
    const n = SCANIA_SCREENS.length;
    const cur = (Number(node.dataset.screen) || 0);
    const next = Number.isInteger(selected) && selected >= 0 && selected < n ? selected : (cur + 1) % n;
    node.dataset.screen = String(next);
    // update tab highlight
    const tabs = node.querySelectorAll('.sc-tab');
    tabs.forEach((tab, i) => tab.classList.toggle('active', i === next));
    // show correct screen
    const screens = node.querySelectorAll('.sc-screen');
    screens.forEach((s, i) => s.classList.toggle('active', i === next));
    // update title
    const title = node.querySelector('.sc-title');
    if (title) title.textContent = layout().lang === 'pt'
      ? ['Dados do veículo', 'Pressão', 'Temperaturas', 'Cruise control', 'Combustível', 'Velocidade', 'Veículo', 'Temporizadores'][next]
      : SCANIA_SCREENS[next];
    buzz(12);
  }

  function updateScaniaObc(node) {
    const pt = layout().lang === 'pt';
    const L = (en, p) => (pt ? p : en);
    const t = curTel();
    const mph = layout().units === 'mph';
    const dead = deadNow();
    const scr = Number(node.dataset.screen) || 0;
    node.classList.toggle('compact', node.clientHeight > 0 && node.clientWidth / node.clientHeight > 2.8);

    // helper: convert m/s to display speed
    const spd = (ms) => Math.round(Math.abs(ms) * (mph ? 2.23694 : 3.6));
    const dist = (km) => (mph ? Math.round(km * 0.621371) + ' mi' : Math.round(km) + ' km');
    const clock = (mins) => {
      const m = ((Math.round(mins) % 1440) + 1440) % 1440;
      return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
    };
    const hm = (mins) => Math.floor(mins / 60) + ' h ' + pad2(Math.round(mins) % 60) + ' min';
    const setVal = (sel, txt) => { const el = node.querySelector(sel); if (el && el.textContent !== txt) el.textContent = txt; };

    // update only the active screen for efficiency
    if (!t) {
      // No telemetry means no displayed readings; never keep stale or invented values.
      node.classList.toggle('dead', dead && !t);
      const unavailable = {
        '.sc-air-val': '-- bar', '.sc-oilp-val': '-- bar', '.sc-temp-water': fmtTemp(null),
        '.sc-temp-oil': fmtTemp(null), '.sc-cs-val': '--', '.sc-ci-gear': '--',
        '.sc-ci-limit': '', '.sc-fuel-val': '-- l',
        '.sc-range-val': '-- ' + (mph ? 'mi' : 'km'), '.sc-cons-avg': '-- l/100km',
        '.sc-cons-inst': '-- l/h', '.sc-speed-val': '--', '.sc-speed-limit': '',
        '.sc-truck-gear': '--', '.sc-trip-val': '-- ' + (mph ? 'mi' : 'km'),
        '.sc-home-gear': '--', '.sc-home-odo': '-- ' + (mph ? 'mi' : 'km'),
        '.sc-truck-name': '--', '.sc-time-val': '--:--', '.sc-route-dist': '--',
        '.sc-route-time': '--', '.sc-route-eta': '--:--'
      };
      Object.keys(unavailable).forEach((sel) => setVal(sel, unavailable[sel]));
      const fill = node.querySelector('.sc-air1-fill');
      if (fill) fill.style.width = '0%';
      return;
    }
    if (dead) { node.classList.add('dead'); return; }
    node.classList.remove('dead');
    const gameTime = Number.isFinite(t.time) ? clock(t.time) : '--:--';

    const has = (v) => v !== undefined && v !== null && Number.isFinite(Number(v));
    const airBar = has(t.air) ? clamp(Number(t.air) / 14.5038, 0, 6.9) : 0;
    setVal('.sc-air-val', has(t.air) ? airBar.toFixed(1) + ' bar' : '-- bar');
    const airFill = node.querySelector('.sc-air1-fill');
    if (airFill) { airFill.style.width = clamp(airBar / 6.9, 0, 1) * 100 + '%'; airFill.classList.toggle('low', !!t.airWarn); }
    setVal('.sc-oilp-val', has(t.oilP) ? (Number(t.oilP) / 14.5038).toFixed(1) + ' bar' : '-- bar');
    setVal('.sc-temp-water', fmtTemp(has(t.waterT) ? t.waterT : null));
    setVal('.sc-temp-oil', fmtTemp(has(t.oilT) ? t.oilT : null));
    setVal('.sc-cs-val', t.cruise > 0.5 ? String(spd(t.cruise)) : '--');
    setVal('.sc-ci-gear', gearLabel(t));
    setVal('.sc-ci-limit', t.limit > 0.5 ? L('Speed limit ', 'Limite ') + spd(t.limit) : '');
    setVal('.sc-fuel-val', t.fuelCap > 0 ? Math.round(t.fuel) + ' l' : '-- l');
    setVal('.sc-range-val', t.range > 0 ? dist(t.range) : '-- ' + (mph ? 'mi' : 'km'));
    setVal('.sc-cons-avg', t.fuelAvg > 0 ? (t.fuelAvg * 100).toFixed(1) + ' l/100km' : '-- l/100km');
    setVal('.sc-cons-inst', has(t.fuelRate) && t.fuelRate > 0 ? Number(t.fuelRate).toFixed(1) + ' l/h' : '-- l/h');
    setVal('.sc-speed-val', spd(t.speed));
    setVal('.sc-speed-limit', t.limit > 0.5 ? L('Limit ', 'Lim. ') + spd(t.limit) : '');
    setVal('.sc-truck-gear', gearLabel(t));
    const odo = has(t.odo)
      ? (mph ? Math.floor(Number(t.odo) * 0.621371) + ' mi' : Math.floor(Number(t.odo)) + ' km')
      : '-- ' + (mph ? 'mi' : 'km');
    setVal('.sc-trip-val', odo);
    setVal('.sc-home-gear', gearLabel(t));
    setVal('.sc-home-odo', odo);
    setVal('.sc-truck-name', t.truck || t.model || '--');
    setVal('.sc-time-val', gameTime);
    setVal('.sc-route-dist', t.routeDist > 0 ? dist(t.routeDist / 1000) : '--');
    setVal('.sc-route-time', t.routeTime > 0 ? hm(t.routeTime / 60) : '--');
    setVal('.sc-route-eta', t.routeTime > 0 ? clock(t.time + t.routeTime / 60) : '--:--');
  }


  // ---- Volume knob ---------------------------------------------------------------------------
  // The radio's round knob: put a finger on it and slide up to turn the volume up, down to
  // turn it down. Every step is one press of the PC volume key, with a tick under the finger.
  const KNOB_STEP = 14; // px of travel per volume step
  function startKnob(w, node, ev) {
    let lastY = ev.clientY;
    let steps = 0;
    try { node.setPointerCapture(ev.pointerId); } catch (e) { /* old browsers */ }
    node.classList.add('down');
    const onMove = (e) => {
      while (Math.abs(lastY - e.clientY) >= KNOB_STEP) {
        const up = lastY > e.clientY;
        lastY += up ? -KNOB_STEP : KNOB_STEP;
        steps += 1;
        send('tap', [up ? 'vol_up' : 'vol_down']);
        node.dataset.a = String((Number(node.dataset.a) || 0) + (up ? 18 : -18));
        node.firstChild.style.transform = 'rotate(' + node.dataset.a + 'deg)';
        buzz(8);
      }
    };
    const onUp = () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
      node.classList.remove('down');
      // a short press without turning: play/pause, on radios that have no other key for it
      if (!steps && w.tap && FUNCTIONS[w.tap]) { send('tap', layout().binds[w.tap] || FUNCTIONS[w.tap].keys); buzz(12); }
    };
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onUp);
  }

  // ---- Stickers ------------------------------------------------------------------------------
  // Original drawings, laid over blank parts of the classic panels and switchable in the
  // menu. They are worn on purpose: speckled print, yellowed paper, a corner torn off.
  let stickerCount = 0;
  function stickerSvg(art) {
    stickerCount += 1;
    const id = 'stk' + stickerCount;
    // worn print: noise punches small holes in the ink; torn: a jagged bite out of one corner
    const defs = '<defs><filter id="' + id + 'w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="' + (stickerCount * 7 + 3) + '" result="n"/>' +
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.4 2.75" result="holes"/><feComposite in="SourceGraphic" in2="holes" operator="in"/></filter>' +
      '<linearGradient id="' + id + 'y" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe6cb"/><stop offset=".55" stop-color="#e2d5b1"/><stop offset="1" stop-color="#c9b88d"/></linearGradient>';
    if (art === 'gratidao') {
      return '<svg viewBox="0 0 300 150" aria-hidden="true">' + defs +
        '<clipPath id="' + id + 'c"><path d="M0 0H238l6 9 9-3 4 11 10-2 3 12 11 1 2 10 17 3V150H0z"/></clipPath></defs>' +
        '<g clip-path="url(#' + id + 'c)"><rect x="6" y="14" width="288" height="124" rx="26" fill="url(#' + id + 'y)" stroke="#8a7a55" stroke-width="1.5"/>' +
        '<g filter="url(#' + id + 'w)"><path d="M34 112c60-14 150-18 236-9l-4 12c-80-8-160-4-228 10z" fill="#1c7a3c"/>' +
        '<text x="150" y="96" text-anchor="middle" font-family="Impact, Haettenschweiler, \'Arial Narrow Bold\', \'Arial Black\', sans-serif" font-size="58" font-style="italic" fill="#f2c400" stroke="#14110c" stroke-width="9" stroke-linejoin="round" paint-order="stroke" transform="rotate(-4 150 80)" textLength="236" lengthAdjust="spacingAndGlyphs">GRATIDÃO</text>' +
        '<path d="M250 34l4 10 11 1-8 7 3 11-10-6-9 6 2-11-8-7 11-1z" fill="#1c7a3c" stroke="#14110c" stroke-width="2"/></g>' +
        '<path d="M22 40l40-9M60 128l34 4M206 26l22 3" stroke="#7d6d48" stroke-width="1" opacity=".5"/></g></svg>';
    }
    if (art === 'frog') {
      // the author's mark ("Sapinho"): same frog as the app logo, as a small round sticker
      return '<svg viewBox="0 0 200 200" aria-hidden="true">' + defs + '</defs>' +
        '<circle cx="100" cy="100" r="96" fill="url(#' + id + 'y)" stroke="#8a7a55" stroke-width="2"/>' +
        '<g filter="url(#' + id + 'w)"><circle cx="100" cy="100" r="84" fill="#14171a"/>' +
        '<path d="M40 124c0-30 26-44 60-44s60 14 60 44c0 26-26 40-60 40s-60-14-60-40z" fill="#5fbf3f"/>' +
        '<circle cx="70" cy="80" r="23" fill="#5fbf3f"/><circle cx="130" cy="80" r="23" fill="#5fbf3f"/>' +
        '<circle cx="70" cy="79" r="15" fill="#f2a23a"/><ellipse cx="70" cy="79" rx="5.5" ry="9.5" fill="#14110c"/>' +
        '<circle cx="130" cy="79" r="15" fill="#f2a23a"/><ellipse cx="130" cy="79" rx="5.5" ry="9.5" fill="#14110c"/>' +
        '<path d="M64 124q36 22 72 0" fill="none" stroke="#173d14" stroke-width="6" stroke-linecap="round"/></g></svg>';
    }
    // 'cwb': round badge with an araucaria pine, the tree of Curitiba
    return '<svg viewBox="0 0 200 200" aria-hidden="true">' + defs +
      '<clipPath id="' + id + 'c"><path d="M0 0H200V132l-12 4 3 11-12 2-1 12-12-2-5 11-11-5-6 9-9-7V200H0z"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + 'c)"><circle cx="100" cy="100" r="94" fill="url(#' + id + 'y)" stroke="#8a7a55" stroke-width="1.5"/>' +
      '<g filter="url(#' + id + 'w)"><circle cx="100" cy="100" r="82" fill="#17512d" stroke="#14110c" stroke-width="5"/>' +
      '<g fill="#efe6cb"><rect x="96" y="58" width="8" height="62"/><path d="M52 62q48-26 96 0q-48-9-96 0zM62 80q38-18 76 0q-38-6-76 0zM72 96q28-12 56 0q-28-4-56 0z"/></g>' +
      '<text x="100" y="158" text-anchor="middle" font-family="Impact, Haettenschweiler, \'Arial Black\', sans-serif" font-size="46" fill="#f2c400" stroke="#14110c" stroke-width="6" paint-order="stroke" stroke-linejoin="round" letter-spacing="3">CWB</text></g>' +
      '<path d="M40 60l22 14M132 40l18 20" stroke="#7d6d48" stroke-width="1" opacity=".5"/></g></svg>';
  }

  const obcEl = $('#obc');
  const hasSkin = () => layout().pages.some((p) => p.skin);
  // Readouts that open the on-board computer when tapped: the panel's own trip display.
  const OBC_FIELDS = new Set(['gear', 'time', 'trip2', 'dist', 'left', 'eta']);
  function toggleObc() { S.obc = !S.obc; buzz(12); renderAll(); }
  obcEl.addEventListener('click', (ev) => { if (ev.target.closest('[data-act="obc-close"]')) toggleObc(); });

  // ---- On-board computer ---------------------------------------------------------------------
  // Everything the game reports about the job, the route and the truck's health, on one page.
  function obcHtml() {
    const pt = layout().lang === 'pt';
    const L = (en, p) => (pt ? p : en);
    const t = curTel();
    if (!t) return '<button class="btn obc-back" data-act="obc-close">\u2190 ' + L('Back to the panel', 'Voltar ao painel') + '</button><p class="obc-wait">' + L('Waiting for the game. The on-board computer needs the telemetry plugin (ETS2 and ATS).', 'Aguardando o jogo. O computador de bordo precisa do plugin de telemetria (ETS2 e ATS).') + '</p>';
    const mph = layout().units === 'mph';
    const num = (v) => Math.round(v).toLocaleString(pt ? 'pt-BR' : 'en-US');
    const dist = (km) => (mph ? num(km * 0.621371) + ' mi' : num(km) + ' km');
    const hm = (mins) => Math.floor(mins / 60) + ' h ' + pad2(Math.round(mins) % 60) + ' min';
    const clock = (mins) => { const m = ((Math.round(mins) % 1440) + 1440) % 1440; return panelText().days[Math.floor(mins / 1440) % 7] + ' ' + pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); };
    const has = (v) => v !== undefined && v !== null && v !== '';
    const row = (label, value, level) => '<div class="orow' + (level ? ' ' + level : '') + '"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
    const bar = (label, pct) => '<div class="obar' + (pct >= 15 ? ' bad' : pct >= 5 ? ' warn' : '') + '"><span>' + esc(label) + '</span><i><u style="width:' + clamp(pct, 0, 100) + '%"></u></i><b>' + pct + '%</b></div>';
    const card = (title, body) => '<section class="ocard"><h3>' + esc(title) + '</h3>' + body + '</section>';

    // --- job
    let job;
    if (t.onJob === false || !has(t.cargo)) job = '<p class="obc-none">' + L('No job in progress', 'Sem frete em andamento') + '</p>';
    else {
      const left = has(t.due) && t.due > 0 ? t.due - t.time : null;   // minutes until the deadline
      const late = left !== null && t.routeTime > 0 && left < t.routeTime / 60;
      job = row(L('Cargo', 'Carga'), t.cargo) +
        (t.mass > 0 ? row(L('Weight', 'Peso'), (t.mass / 1000).toFixed(1).replace('.', pt ? ',' : '.') + ' t') : '') +
        row(L('From', 'Origem'), [t.cityFrom, t.compFrom].filter(has).join(' · ') || '--') +
        row(L('To', 'Destino'), [t.cityTo, t.compTo].filter(has).join(' · ') || '--') +
        (t.jobKm > 0 ? row(L('Job distance', 'Distância do frete'), dist(t.jobKm)) : '') +
        (t.income > 0 ? row(L('Pay', 'Pagamento'), (t.game === 2 ? '$ ' : '€ ') + num(t.income)) : '') +
        (left !== null ? row(L('Deadline', 'Prazo'), left > 0 ? clock(t.due) + ' (' + hm(left) + ')' : L('Late', 'Atrasado'), left <= 0 ? 'bad' : late ? 'warn' : '') : '');
    }
    // --- route
    const route = (t.routeDist > 0
      ? row(L('Distance left', 'Falta'), dist(t.routeDist / 1000)) + row(L('Driving time left', 'Tempo de viagem'), hm(t.routeTime / 60)) + row(L('Arrival', 'Chegada'), clock(t.time + t.routeTime / 60))
      : '<p class="obc-none">' + panelText().noTrip + '</p>') +
      row(L('Game time', 'Hora no jogo'), clock(t.time)) +
      (t.limit > 0.5 ? row(L('Speed limit', 'Limite da via'), Math.round(t.limit * (mph ? 2.23694 : 3.6)) + (mph ? ' mph' : ' km/h'), Math.abs(t.speed) > t.limit * 1.06 ? 'bad' : '') : '') +
      row(L('Cruise control', 'Piloto automático'), t.cruise > 0.5 ? Math.round(t.cruise * (mph ? 2.23694 : 3.6)) + (mph ? ' mph' : ' km/h') : L('Off', 'Desligado'));
    // --- truck
    const fuelPct = t.fuelCap > 0 ? Math.round(t.fuel / t.fuelCap * 100) : 0;
    const truck = ([t.truck, t.model].filter(has).length ? row(L('Truck', 'Caminhão'), [t.truck, t.model].filter(has).join(' ')) : '') +
      (t.odo > 0 ? row(L('Odometer', 'Odômetro'), dist(t.odo)) : '') +
      row(L('Fuel', 'Combustível'), num(t.fuel) + ' / ' + num(t.fuelCap) + ' L (' + fuelPct + '%)', t.fuelWarn || fuelPct < 12 ? 'bad' : '') +
      (t.range > 0 ? row(L('Range', 'Autonomia'), dist(t.range)) : '') +
      (t.fuelAvg > 0 ? row(L('Average consumption', 'Consumo médio'), (t.fuelAvg * 100).toFixed(1).replace('.', pt ? ',' : '.') + ' L/100 km') : '') +
      (t.adblueCap > 0 ? row('AdBlue', num(t.adblue) + ' / ' + num(t.adblueCap) + ' L', t.adblueWarn ? 'bad' : '') : '') +
      row(L('Brake air', 'Ar dos freios'), Math.round(t.air) + ' psi', t.airWarn || t.air < 65 ? 'bad' : '');
    // --- health
    const wear = Array.isArray(t.wear) ? t.wear : null;
    const names = [L('Engine', 'Motor'), L('Transmission', 'Câmbio'), L('Cabin', 'Cabine'), L('Chassis', 'Chassi'), L('Wheels', 'Rodas')];
    const health = (wear ? wear.map((v, i) => bar(names[i], v)).join('') : bar(L('Truck', 'Caminhão'), t.dmgTruck || 0)) +
      (t.trailer === false ? '' : bar(L('Trailer', 'Trailer'), t.dmgTrailer || 0) + bar(L('Cargo', 'Carga'), t.dmgCargo || 0));
    const engine = (has(t.oilT) ? row(L('Oil temperature', 'Temperatura do óleo'), fmtTemp(t.oilT, ' ')) : '') +
      (has(t.oilP) ? row(L('Oil pressure', 'Pressão do óleo'), Math.round(t.oilP) + ' psi', t.oilWarn ? 'bad' : '') : '') +
      (has(t.waterT) ? row(L('Coolant', 'Água do motor'), fmtTemp(t.waterT, ' '), t.waterWarn ? 'bad' : '') : '') +
      (has(t.batt) ? row(L('Battery', 'Bateria'), Number(t.batt).toFixed(1).replace('.', pt ? ',' : '.') + ' V', t.battWarn ? 'bad' : '') : '') +
      (has(t.brakeT) ? row(L('Brake temperature', 'Temperatura dos freios'), fmtTemp(t.brakeT, ' '), t.brakeT > 250 ? 'warn' : '') : '') +
      row('RPM', num(t.rpm)) + row(L('Gear', 'Marcha'), gearLabel(t));
    return '<button class="btn obc-back" data-act="obc-close">\u2190 ' + L('Back to the panel', 'Voltar ao painel') + '</button>' + (S.bridge === 'demo' ? '<p class="obc-demo">' + L('Demo values: connect to the PC to see your truck.', 'Valores de demonstração: conecte ao PC para ver seu caminhão.') + '</p>' : '') +
      '<div class="ogrid">' + card(L('Job', 'Frete'), job) + card(L('Route', 'Rota'), route) + card(L('Truck', 'Caminhão'), truck) +
      card(L('Wear and damage', 'Desgaste e danos'), health) + card(L('Engine and systems', 'Motor e sistemas'), engine) + '</div>';
  }
  let obcLast = '';
  function updateObc() {
    if (!S.obc) return;
    const html = obcHtml();
    if (html !== obcLast) { obcEl.innerHTML = html; obcLast = html; }
  }

  // ---- Music player ------------------------------------------------------------------------
  const MEDIA_KEYS = [['media_prev', 'prev'], ['media_play', 'playpause'], ['media_next', 'next'], ['vol_down', 'voldown'], ['vol_up', 'volup']];
  // Slim global footer player (Fernando's "Modo Mídia" layout): just Prev/Play/Next —
  // Volume stays on the OS media keys (Windows/Spotify), not a footer button.
  const MEDIA_FOOTER_KEYS = [['media_prev', 'prev', 'Previous'], ['media_play', 'playpause', 'Play/Pause'], ['media_next', 'next', 'Next']];

  function mediaView() {
    const text = panelText();
    if (S.bridge === 'demo') return { top: 'DEMO', line: text.radioDemo, state: '\u25b6' };
    const m = S.media || {};
    if (!m.running) return { top: text.radioTop, line: text.radioOpen, state: '' };
    if (!m.playing) return { top: text.radioTop, line: text.radioPaused, state: '\u2759\u2759' };
    return { top: m.artist || text.radioTop, line: m.track || '', state: '\u25b6' };
  }

  function widgetHtml(w) {
    const f = fnOf(w);
    if (w.t === 'status') {
      const cell = (icon, key) => '<span class="dmg" data-k="' + key + '"><span class="ico">' + iconSvg(icon) + '</span><b></b></span>';
      return '<div class="sbar"><div class="sgroup">' + cell('cab', 'dmgTruck') + cell('trailer', 'dmgTrailer') + cell('cargo', 'dmgCargo') +
        '</div><div class="sgroup trip"></div></div>';
    }
    if (w.t === 'gauge') {
      return '<div class="dial">' + gaugeSvg(w.field) + '</div>';
    }
    if (w.t === 'radio_widget') {
      // eq: spectrum bars, shown by CSS on the classic cabs only
      return '<div class="unit"><div class="vfd">' +
        '<div class="eq" aria-hidden="true">' + '<i></i>'.repeat(9) + '</div>' +
        '<div class="vfd-text"><div class="vfd-top"><span class="artist"></span><span class="state"></span></div>' +
        '<div class="track"><span></span></div></div></div><div class="mkeys">' +
        MEDIA_KEYS.map((k) => '<div class="mkey" role="button" aria-label="' + esc(FUNCTIONS[k[0]].name) + '" data-media="' + k[0] + '">' + iconSvg(k[1]) + '</div>').join('') +
        '</div></div>';
    }
    if (w.t === 'display') {
      return '<div class="lcd"><span class="cap2"></span><span class="val"></span></div>';
    }
    if (w.t === 'plate') {
      return '<div class="cap"><span class="lbl">' + labelHtml(w.text || '') + '</span></div>';
    }
    // longest line decides the type size, so "BLOQUEIO DIF." fits the same cap as "HORN".
    // A label that is two explicit lines OR two words (it will wrap) must fit TWO lines plus the
    // icon inside the key, so it gets the '.two' shrink even when each line is individually short
    // (e.g. "TRASEIRA SOBE" was clipped because neither word trips the length thresholds).
    const _lines = String(f.label).split('\n');
    const longest = Math.max.apply(null, _lines.map((line) => line.length));
    const twoLine = _lines.length > 1 || /\s/.test(String(f.label).trim());
    const _cls = (longest > 10 ? 'xlong' : longest > 8 ? 'long' : twoLine ? 'long' : '') + (twoLine ? ' two' : '');
    const lbl = '<span class="lbl' + (_cls.trim() ? ' ' + _cls.trim() : '') + '">' + labelHtml(f.label) + '</span>';
    const ico = '<span class="ico">' + iconSvg(f.icon) + '</span>';
    const led = '<i class="led"></i>';
    switch (w.t) {
      case 'round':
        return '<div class="cap"><div class="bezel"><div class="core">' + ico + lbl + led + '</div></div></div>';
      case 'toggle':
        return '<div class="cap">' + lbl + '<span class="sw"><i class="nut"></i><i class="bat"></i></span>' + led + '</div>';
      case 'hazard':
        return '<div class="cap"><svg class="tri" viewBox="0 0 100 90" aria-hidden="true"><path d="M50 6L95 84H5z"/><path d="M50 36L72 74H28z"/></svg></div>';
      case 'valve':
        return '<div class="cap"><div class="knob">' + lbl + '</div></div>';
      default:
        return '<div class="cap">' + ico + lbl + led + '</div>';
    }
  }

  function widgetEl(w) {
    const f = fnOf(w);
    const node = document.createElement('div');
    node.className = 'w ' + w.t + (w.t === 'display' && w.h > w.w ? ' tall' : '') + (w.t === 'display' && w.field === 'trip' ? ' textual' : '') +
      // modern cabs get a flat media tile, classic cabs a cassette-era head unit
      (w.t === 'radio_widget' ? (STYLE_DEFS[layout().style] && STYLE_DEFS[layout().style].classic ? ' classic' : ' modern') + (w.h === 1 ? ' compact' : '') : '') +
      (w.t === 'status' && w.w <= 4 ? ' stack' : '');
    node.dataset.id = w.id;
    if (f) {
      node.dataset.led = f.led;
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', f.name === 'Custom key' ? (f.label || 'Custom key') : f.name);
    }
    if (w.t === 'valve') node.dataset.color = w.color || 'yellow';
    // --k: grows with the smaller side but sub-linearly, so 2x2 keys do not shout
    const k = S.u * Math.pow(Math.min(w.w, w.h), 0.8);
    node.style.cssText = 'left:' + w.x * S.u + 'px;top:' + w.y * S.u + 'px;width:' + w.w * S.u + 'px;height:' + w.h * S.u + 'px;--k:' + k + 'px';
    node.innerHTML = widgetHtml(w) + '<i class="grip"></i>';
    return node;
  }

  // ---- Auxiliary switch bank ------------------------------------------------------------------
  // Only when the screen is clearly wider than the picture (a tablet held upright showing the
  // tall cut), and only for controls the showing cut really lacks. One plate beside the panel,
  // one labelled row per group, lit in the panel's own lettering colour. Nothing is added just
  // to fill space: with every group already on the panel the plate is not drawn at all.
  const AUX_GROUPS = [
    ['CRUISE', 'PILOTO', ['cruise_down', 'cruise', 'cruise_up']],
    ['INDICATORS', 'SETAS', ['blinker_left', 'blinker_right']],
    ['RETARDER', 'RETARDER', ['retarder_down', 'retarder_up']],
    ['VIEW', 'VISÃO', ['look_left', 'cam_next', 'look_right']],
    ['TRAILER AXLE', 'EIXO TRAILER', ['trailer_axle']],
  ];
  const extrasEl = $('#extras');
  let extrasKey = '';
  function layoutExtras(freeW, height) {
    const pg = page();
    const have = new Set(widgetsOf(pg).map((w) => w.fn).filter(Boolean));
    // a group is offered only when the cut has none of it (half a group would read as a mistake)
    // Off unless the player asks for it in the menu: a second block of keys beside a painted
    // panel reads as a different product, so by default the panel stands alone, centred.
    const groups = layout().aux === true && freeW >= 170 ? AUX_GROUPS.filter((g) => !g[2].some((f) => have.has(f))) : [];
    const width = Math.min(250, freeW);
    const rowH = Math.round(width * 0.36);
    const fit = Math.max(0, Math.floor((height - 34) / (rowH + 26)));
    const list = groups.slice(0, fit);
    extrasEl.hidden = !list.length;
    if (!list.length) { extrasKey = ''; return; }
    const skin = skinOf(pg);
    const ink = (skin.w.find((w) => w.t === 'live' && w.ink) || {}).ink || '#e8eef4';
    extrasEl.style.cssText = 'width:' + width + 'px;--acc:' + ink + ';--rowh:' + rowH + 'px';
    const pt = layout().lang === 'pt';
    const key = pg.id + skinCut(pg) + list.map((g) => g[0]).join() + pt + width;
    if (key === extrasKey) return;       // unchanged: leave the DOM alone (a finger may be on a key)
    extrasKey = key;
    extrasEl.innerHTML = '<i class="scr a"></i><i class="scr b"></i><i class="scr c"></i><i class="scr d"></i>' + list.map((g) =>
      '<div class="xgroup"><h4>' + esc(pt ? g[1] : g[0]) + '</h4><div class="xrow">' + g[2].map((f) => {
        const fn = fnOf({ t: 'rocker', fn: f });
        return '<button class="xkey" data-fn="' + f + '" aria-label="' + esc(fn.name) + '"><i class="led"></i><span class="ico">' + iconSvg(fn.icon) + '</span></button>';
      }).join('') + '</div></div>').join('');
  }
  function updateExtras() {
    if (extrasEl.hidden) return;
    extrasEl.classList.toggle('unlit', !backlit());
    for (const node of extrasEl.querySelectorAll('.xkey')) {
      const w = { id: 'x-' + node.dataset.fn, t: 'rocker', fn: node.dataset.fn };
      node.classList.toggle('on', isOn(w));
      node.classList.toggle('down', S.pressed.has(w.id));
    }
  }
  extrasEl.addEventListener('pointerdown', (ev) => {
    const node = ev.target.closest('.xkey');
    if (!node || S.edit) return;
    ev.preventDefault();
    press({ id: 'x-' + node.dataset.fn, t: 'rocker', fn: node.dataset.fn }, node, ev);
  });

  function fit() {
    const p = page();
    const skin = skinOf(p);
    stage.classList.toggle('skin', !!skin);
    if (skin) {
      // The picture decides the shape. It is fitted inside the stage keeping its own proportions;
      // only a small difference (up to 10%) is absorbed by stretching, so a screen whose shape is
      // close to the art still gets edge to edge, and any other shape (a tablet turned upright,
      // a long phone) gets the art centred and undistorted over a blurred copy of itself.
      const edge = document.getElementById('app').classList.contains('fs') ? 0 : 8;   // full screen: right up to the glass
      const availW = Math.max(40, stage.clientWidth - edge);
      const availH = Math.max(40, stage.clientHeight - edge);
      const ar = skin.ar || 1.5;
      // A frame panel is only an empty frame (the app draws keys and text itself, never stretched), so it may
      // be stretched much further: an upright tablet is far wider than the phone-shaped vertical art.
      const MAXS = skin.frame ? 1.42 : 1.1;               // largest allowed stretch per axis
      let w = Math.min(availW, availH * ar);              // "contain"
      let h = w / ar;
      // Soviet landscape plates are 2752×1536. Growing height on its own
      // turned that wide cut into a taller frame, so horizontal showed the
      // portrait shape. Keep this cut's ratio and only scale it uniformly.
      if (p.skin === 'sov_frame' && ar >= 1) {
        const grow = Math.min(MAXS, availW / w, availH / h);
        w = Math.floor(Math.min(availW, w * grow));
        h = Math.floor(w / ar);
        if (h > availH) { h = Math.floor(availH); w = Math.floor(h * ar); }
      } else {
        w = Math.floor(Math.min(availW, w * MAXS));         // then grow towards the screen, capped
        h = Math.floor(Math.min(availH, h * MAXS));
      }
      panel.style.width = w + 'px';
      panel.style.height = h + 'px';
      layoutExtras(0, 0);
      // soft, out-of-focus copy of the panel behind everything: the screen never shows a bare gap
      stage.style.setProperty('--amb', 'url("' + panelAsset(p.skin, skinCut(p), false) + '")');
      S.u = Math.max(20, w / 12);
      panel.style.setProperty('--u', S.u + 'px');
      return;
    }
    layoutExtras(0, 0);
    const availW = stage.clientWidth - 16;
    const availH = stage.clientHeight - 16;
    // Square cells, as large as fit: switch caps keep their proportions on any screen.
    S.u = Math.max(20, Math.floor(Math.min(availW / p.cols, availH / p.rows)));
    panel.style.width = p.cols * S.u + 'px';
    panel.style.height = p.rows * S.u + 'px';
    panel.style.setProperty('--u', S.u + 'px');
  }

  function mountModernGrids(p) {
    if (p.skin !== 'eu_frame') return;
    const portrait = skinCut(p) === 'P';
    const ph = parseFloat(panel.style.height) || 600;
    for (const name of ['upper', 'brakes', 'utility', 'system']) {
      const items = Array.from(panel.querySelectorAll(':scope > .w.sk[data-group="' + name + '"]'));
      if (!items.length) continue;
      const group = document.createElement('div');
      group.className = 'w sk k-modern modern-grid modern-grid-' + name + (portrait ? ' portrait' : ' landscape');
      group.dataset.modernGrid = name;
      panel.appendChild(group);
      const cellFraction = name === 'system' ? 0.035 : (portrait && name !== 'upper' ? 0.06 : 0.095);
      for (const item of items) {
        item.style.setProperty('--k', Math.max(14, ph * cellFraction).toFixed(1) + 'px');
        group.appendChild(item);
      }
    }
  }

  // The night lightmap covers every widget, so a glow inside the rotary is multiplied
  // away. This layer sits above that map. CSS masks it to the engraved marks and
  // sets the opacity from --cabin. Positions only; no per-function colour.
  function syncRotaryGlow() {
    const prev = panel.querySelector(':scope > .rotary-backlights');
    if (prev) prev.remove();
    if (!panel.classList.contains('eu-modern')) return;
    const nodes = panel.querySelectorAll('.k-modern.k-rotary');
    if (!nodes.length) return;
    const host = document.createElement('div');
    host.className = 'rotary-backlights';
    const pr = panel.getBoundingClientRect();
    nodes.forEach((el) => {
      const id = el.dataset.id || '';
      const key = /mod_rotary_wipers/.test(id) ? 'wipers' : (/mod_rotary_lights/.test(id) ? 'lights' : '');
      if (!key) return;
      const r = el.getBoundingClientRect();
      const mark = document.createElement('i');
      mark.dataset.mark = key;
      mark.style.left = (r.left - pr.left) + 'px';
      mark.style.top = (r.top - pr.top) + 'px';
      mark.style.width = r.width + 'px';
      mark.style.height = r.height + 'px';
      host.appendChild(mark);
    });
    panel.appendChild(host);
  }

  function renderPanel() {
    fit();
    const p = page();
    const skin = skinOf(p);
    panel.classList.toggle('edit', S.edit);
    panel.classList.toggle('hide-labels', layout().names === 'hide' || layout().keyLabels === 'hide');
    panel.classList.toggle('hide-pictograms', layout().pictograms === 'hide');
    panel.dataset.labelFont = layout().labelFont || 'barlow';
    panel.classList.toggle('skin', !!skin);
    panel.classList.toggle('eu-modern', !!skin && p.skin === 'eu_frame');
    panel.classList.toggle('scania-sr', !!skin && p.skin === 'scania_frame');
    panel.classList.toggle('scania-portrait', !!skin && p.skin === 'scania_frame' && p.size === 'phone');
    _scanIgnPowered = null;
    panel.classList.toggle('sc25-box', !!skin && p.skin === 'scania25_frame' && p.size === 'phone');
    // "n" pictures are the same panels with the key names cleared
    panel.style.backgroundImage = skin
      ? 'url("' + panelAsset(p.skin, skinCut(p), layout().names === 'hide' && !skin.frame) + '")'
      : '';
    panel.style.setProperty('--skin', panel.style.backgroundImage || 'none');   // the key caps are cut from the same picture
    panel.classList.toggle('classic', !!skin && !!STYLE_DEFS[p.skin] && STYLE_DEFS[p.skin].classic);
    applySc25Colors(p.skin, p.size);
    panel.textContent = '';
    for (const w of widgetsOf(p)) {
      // the author's mark stays; the decorative stickers follow the menu switch
      if (w.t === 'sticker' && !w.mark && layout().stickers === false) continue;
      panel.appendChild(w.sk ? skinWidgetEl(w) : widgetEl(w));
    }
    if (p.skin === 'eu_frame' && modernBooting()) ensureIgnBootOverlay();
    mountModernGrids(p);
    syncRotaryGlow();
    panel.classList.toggle('deco', !!S.deco);
    decoNodes();
    if (!skin && !p.widgets.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = S.edit ? 'Tap any cell to add a button.' : 'This page is empty. Tap Edit, then tap a cell to add a button.';
      panel.appendChild(hint);
    }
    updateStates();
  }

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    return '#' + ch.map((c) => { const v = Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k)); return clamp(v, 0, 255).toString(16).padStart(2, '0'); }).join('');
  }
  function applySc25Colors(skinId, size) {
    const names = ['--print', '--sc25-bg', '--sc25-bg2', '--sc25-bg3', '--sc25-accent', '--scania-accent', '--scania-needle', '--scania-needle-glint', '--scania-odo', '--scania-obc-ink', '--scania-obc-glow', '--scania-backlight', '--scania-face-center'];
    if (skinId === 'scania_frame') {
      const theme = SC25.THEMES && SC25.THEMES[normalizeScaniaTheme(layout().scania && layout().scania.theme)];
      if (!theme) return;
      panel.style.setProperty('--scania-accent', theme.accent);
      panel.style.setProperty('--scania-needle', theme.needle || theme.accent);
      panel.style.setProperty('--scania-needle-glint', theme.glint || theme.accent);
      panel.style.setProperty('--scania-odo', theme.odo || theme.accent);
      panel.style.setProperty('--scania-obc-ink', theme.ink || theme.accent);
      panel.style.setProperty('--scania-obc-glow', theme.glow);
      panel.style.setProperty('--scania-backlight', theme.backlight || '#080b0f');
      panel.style.setProperty('--scania-face-center', theme.face || '#171a1e');
      panel.style.setProperty('--accent', theme.accent);
      panel.style.setProperty('--glow', theme.glow);
      panel.style.setProperty('--blinkc', theme.accent);
      return;
    }
    if (skinId !== 'scania25_frame') { names.forEach((n) => panel.style.removeProperty(n)); return; }
    const c = layout().sc25 || {};
    const theme = SC25.THEMES && SC25.THEMES[normalizeSc25Theme(c.theme)];
    if (!theme) return;
    if (size === 'phone') panel.style.removeProperty('--sc25-accent');
    else panel.style.setProperty('--sc25-accent', theme.accent);
    panel.style.setProperty('--accent', theme.accent);
    panel.style.setProperty('--glow', theme.glow);
    panel.style.setProperty('--blinkc', theme.accent);
    const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : null);
    const ink = hex(c.print), bg = hex(c.bg);
    if (ink) panel.style.setProperty('--print', ink);
    if (bg) { panel.style.setProperty('--sc25-bg', bg); panel.style.setProperty('--sc25-bg2', shade(bg, .35)); panel.style.setProperty('--sc25-bg3', shade(bg, -.4)); }
  }
  function normalizeSc25Theme(key) {
    const legacy = { orange:'yellow', red:'pink', cyan:'blue' };
    const normalized = legacy[key] || key;
    return SC25.THEMES && SC25.THEMES[normalized] ? normalized : 'blue';
  }
  function normalizeScaniaTheme(key) {
    const legacy = { orange:'amber', cyan:'blue' };
    const normalized = legacy[key] || key;
    return SC25.SCANIA_THEME_KEYS && SC25.SCANIA_THEME_KEYS.includes(normalized) ? normalized : 'factory';
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // How many crawler gears this gearbox has, when the player left it on Auto.
  // The game sends the dashboard gear as a number only, so the label is rebuilt from the
  // number of forward gears: in ETS2 a 14-speed is a 12+2 (C1, C2, then 1-12) and a
  // 13-speed a 12+1. Anything else is shown as plain numbers; the menu can override it.
  function autoCrawlers(t) {
    if (!t || t.game !== 1) return 0;
    if (t.gears === 14) return 2;
    if (t.gears === 13) return 1;
    return 0;
  }

  function gearLabel(t) {
    const raw = Number(t && t.gear);
    if (!Number.isFinite(raw)) return '--';
    const g = Math.trunc(raw);
    if (g === 0) return 'N';
    const gb = gearboxOf();
    if (gb.k === 'auto') {                              // plain numbering, crawler count read from the box
      if (g < 0) return 'R' + (g < -1 ? -g : '');
      const cr = autoCrawlers(t);
      if (cr && g <= cr) return 'C' + g;
      return String(Math.max(1, g - cr));
    }
    const cr = gb.crawl || 0;
    if (gb.split) {                                     // 1L, 1H, 2L, 2H...; reverse RL, RH
      if (g < 0) { const i = -g; return 'R' + (i % 2 ? 'L' : 'H'); }
      if (g <= cr) return 'C' + g;                      // crawler gears below gear 1
      const n = g - cr;
      return Math.ceil(n / 2) + (n % 2 ? 'L' : 'H');
    }
    if (g < 0) return 'R' + (g < -1 ? -g : '');         // plain numbers, with any crawlers (Reduzida etc.)
    if (g <= cr) return 'C' + g;
    return String(g - cr);
  }

  function displayParts(w) {
    const def = DISPLAY_FIELDS.find((d) => d.id === w.field) || DISPLAY_FIELDS[0];
    const t = S.tel && S.tel.sdk ? S.tel : (S.bridge === 'demo' ? DEMO_TEL : null);
    const mph = layout().units === 'mph';
    const toUnit = (ms) => Math.round(Math.abs(ms) * (mph ? 2.23694 : 3.6));
    const unit = mph ? 'mph' : 'km/h';
    let val = '--';
    let small = '';
    switch (def.id) {
      case 'clock': { const d = new Date(); val = pad2(d.getHours()) + ':' + pad2(d.getMinutes()); break; }
      case 'time': if (t) { const m = t.time % 1440; val = pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); } else val = '--:--'; break;
      case 'speed': if (t) val = toUnit(t.speed); small = unit; break;
      case 'gear': if (t) val = gearLabel(t); break;
      case 'cruise': if (t) { if (t.cruise > 0.5) { val = toUnit(t.cruise); small = unit; } else val = 'OFF'; } break;
      case 'fuel': if (t && t.fuelCap > 0) { val = Math.round(t.fuel / t.fuelCap * 100); small = '%'; } break;
      case 'rpm': if (t) val = Math.round(t.rpm); break;
      case 'air': if (t) val = Math.round(t.air); break;
      case 'retarder': if (t) val = t.retarder + '/' + t.retSteps; break;
      case 'dmg_truck': if (t) { val = t.dmgTruck; small = '%'; } break;
      case 'dmg_trailer': if (t) { val = t.trailer === false ? '--' : t.dmgTrailer; small = '%'; } break;
      case 'dmg_cargo': if (t) { val = t.trailer === false ? '--' : t.dmgCargo; small = '%'; } break;
      case 'trip':
        if (t) {
          // game time counts minutes from a Monday 00:00
          const m = t.time % 1440;
          val = panelText().days[Math.floor(t.time / 1440) % 7] + ' ' + pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
          if (t.routeDist > 0) {
            const dist = mph ? Math.round(t.routeDist / 1609.34) + ' mi' : Math.round(t.routeDist / 1000) + ' km';
            const mins = Math.round(t.routeTime / 60);
            small = dist + ' \u00b7 ' + Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min';
          }
        }
        break;
    }
    return { label: panelText().display[def.id] || def.label, val, small };
  }


  // Dark cabin mode: simulates sitting in a dark truck cabin at night.
  // Returns 0 (full daylight) to 1 (full night) — the transition follows in-game time
  // so dusk and dawn happen gradually over ~2.5 game-hours.
  // 'dark' forces 1, 'off' forces 0, 'auto' follows the game clock.
  let _cabinLastMode = null;   // last cabin setting seen, to tell a menu change from the clock moving
  let _cabinLv = 0;   // smoothed cabin level — interpolated toward cabinLevel() at 10Hz
  let _scanIgnPowered = null;
  function cabinLevel() {
    const mode = layout().cabin || 'off';
    if (mode === 'off') return 0;
    if (mode === 'dark') return 1;
    // auto: gradual transition following in-game time of day
    const t = curTel();
    if (!t || t.time === undefined || t.time === null) return 0;
    const m = ((Math.round(t.time) % 1440) + 1440) % 1440; // minutes within the day (0-1439)
    // Day   07:00–18:00  →  0  (bright cabin)
    if (m >= 420 && m <= 1080) return 0;
    // Dusk  18:00–20:30  →  0 → 1  (gradually darkens)
    if (m > 1080 && m < 1230) return (m - 1080) / 150;
    // Night 20:30–04:30  →  1  (fully dark)
    if (m >= 1230 || m <= 270) return 1;
    // Dawn  04:30–07:00  →  1 → 0  (gradually brightens)
    return 1 - (m - 270) / 150;
  }

  // Cheap state pass: touches classes and readout text only, never rebuilds the DOM, so it
  // can run on every telemetry frame (10 Hz) without stealing touch events mid-press.
  function updateStates() {
    updateObc();
    updateExtras();
    const _isScaniaSR = page().skin === 'scania_frame';
    const _isModern = page().skin === 'eu_frame';
    if (_isScaniaSR) {
      const _powered = !deadNow();
      if (_scanIgnPowered === false && _powered) {
        S.bulbUntil = Date.now() + 1300;
        panel.classList.add('scania-starting');
        setTimeout(() => { panel.classList.remove('scania-starting'); updateStates(); }, 1100);
      }
      _scanIgnPowered = _powered;
      panel.classList.toggle('scania-powered', _powered);
    } else {
      _scanIgnPowered = null;
      panel.classList.remove('scania-starting', 'scania-powered');
    }
    // Modern digital cluster: rising edge of electrics → boot sequence (logo/bulbs/sweep/reveal).
    if (_isModern) {
      const _powered = ignState() > 0;
      if (_modernIgnPowered === false && _powered) startModernBoot();
      if (!_powered && modernBoot.phase !== 'off') stopModernBoot('off');
      if (_modernIgnPowered === true && !_powered) startModernShutdown();
      if (_powered && modernShuttingDown) stopModernShutdown();
      _modernIgnPowered = _powered;
      tickModernBoot();
      if (modernBooting()) ensureIgnBootOverlay();
    } else if (modernBoot.phase !== 'off') {
      stopModernBoot('off');
      _modernIgnPowered = null;
      stopModernShutdown();
    }
    panel.classList.toggle('unlit', panel.classList.contains('skin') && !backlit());
    // smooth cabin darkness: interpolate toward target at ~10Hz for gradual dusk/dawn
    // A choice made in the menu applies at once; only the game clock (auto) fades, so dusk,
    // dawn and a jump in game time (sleeping) slide instead of snapping.
    const _cabinMode = layout().cabin || 'off';
    const _cabinTarget = cabinLevel();
    if (_cabinMode !== _cabinLastMode || _cabinMode !== 'auto') _cabinLv = _cabinTarget;
    else {
      _cabinLv += (_cabinTarget - _cabinLv) * 0.06;
      if (Math.abs(_cabinLv - _cabinTarget) < 0.004) _cabinLv = _cabinTarget;
    }
    _cabinLastMode = _cabinMode;
    panel.style.setProperty('--cabin', _cabinLv.toFixed(3));
    panel.classList.toggle('cabin-dark', _cabinLv > 0.02);
    // display brightness: 'auto' dims with cabin, fixed values stay constant
    const brPref = layout().brightness || 'auto';
    const brVal = brPref === 'auto' ? (1 - _cabinLv * 0.3) : parseFloat(brPref) / 100;
    panel.style.setProperty('--disp-bright', brVal.toFixed(3));
    const byId = {};
    for (const w of widgetsOf(page())) byId[w.id] = w;
    for (const node of panel.children) {
      const w = byId[node.dataset.id];
      if (!w) continue;
      if (w.sk) { updateSkinNode(w, node); continue; }
      if (w.t === 'display') {
        const d = displayParts(w);
        const html = esc(d.val) + (d.small ? '<small>' + esc(d.small) + '</small>' : '');
        const valEl = node.querySelector('.val');
        if (valEl.innerHTML !== html) valEl.innerHTML = html;
        node.querySelector('.cap2').textContent = d.label;
        continue;
      }
      if (w.t === 'plate') continue;
      if (w.t === 'gauge' || w.t === 'radio_widget' || w.t === 'status') node.classList.toggle('sel', S.edit && S.sel === w.id);
      if (w.t === 'status') {
        const t = S.tel && S.tel.sdk ? S.tel : (S.bridge === 'demo' ? DEMO_TEL : null);
        for (const el of node.querySelectorAll('.dmg')) {
          const k = el.dataset.k;
          // no trailer hooked up: nothing to report for trailer and cargo
          const v = !t || (k !== 'dmgTruck' && t.trailer === false) ? '--' : t[k] + '%';
          el.lastChild.textContent = v;
          // damage worth a look turns the figure amber, serious damage red
          el.dataset.level = t && t[k] >= 15 ? 'bad' : t && t[k] >= 5 ? 'warn' : '';
        }
        const trip = displayParts({ field: 'trip' });
        node.querySelector('.trip').textContent = trip.val === '--' ? '--' : trip.val + (trip.small ? ' \u00b7 ' + trip.small : ' \u00b7 ' + panelText().noTrip);
        continue;
      }
      if (w.t === 'gauge') {
        const deg = gaugeAngle(gaugeSpec(w.field), gaugeValue(w.field));
        node.querySelector('.needle').style.transform = 'rotate(' + deg.toFixed(1) + 'deg)';
        continue;
      }
      if (w.t === 'radio_widget') {
        const v = mediaView();
        // one-row radios have a single text line: artist and title share it
        if (w.h === 1 && v.state === '\u25b6' && v.top !== 'DEMO') v.line = v.top + ' \u2013 ' + v.line;
        node.classList.toggle('playing', v.state === '\u25b6');
        node.querySelector('.artist').textContent = v.top;
        node.querySelector('.state').textContent = v.state;
        const track = node.querySelector('.track');
        const span = track.firstChild;
        if (span.textContent !== v.line) {
          span.textContent = v.line;
          // long titles scroll like an old head unit; short ones sit still
          track.classList.toggle('scroll', v.line.length > 22);
        }
        continue;
      }
      node.classList.toggle('on', isOn(w));
      node.classList.toggle('down', S.pressed.has(w.id));
      node.classList.toggle('sel', S.edit && S.sel === w.id);
    }
  }

  function renderTabs() {
    const l = layout();
    tabs.innerHTML = l.pages.map((p, i) =>
      '<button class="tab" role="tab" aria-selected="' + (i === S.page) + '" data-page="' + i + '">' + esc(p.name) + '</button>').join('');
  }

  function renderStatus() {
    const game = S.tel && S.tel.sdk ? (S.tel.game === 2 ? 'ATS live' : 'ETS2 live') : 'Connected';
    const text = { demo: 'Demo', ok: game + (S.lat != null ? ' \u00b7 ' + S.lat + ' ms' : ''), pin: 'PIN needed', lost: 'Bridge lost' }[S.bridge];
    statusEl.dataset.state = S.bridge;
    const _fsLed = fsExit && fsExit.querySelector('.fs-led');
    if (_fsLed) _fsLed.dataset.state = S.bridge;
    statusEl.querySelector('b').textContent = text;
    statusEl.title = text;
  }

  function renderAll() {
    if (syncOrientation()) save();
    app.dataset.style = layout().style || 'eu';
    $('#btnEdit').textContent = S.edit ? 'Done' : 'Edit';
    $('#btnEdit').classList.toggle('active', S.edit);
    $('#btnPage').hidden = !S.edit;
    renderTabs();
    // the on-board computer takes the panel's place while it is open
    panel.hidden = S.obc;
    obcEl.hidden = !S.obc;
    obcLast = '';
    renderPanel();
    renderStatus();
  }

  let toastTimer = null;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }



  // ---- Wipers OFF ---------------------------------------------------------------------------
  // ETS2 has one wiper key that CYCLES (off, 1, 2, 3, off...). "Wipers back" has no default key, so
  // sending it does nothing in the game. OFF therefore presses the cycling key until the game
  // reports the wipers stopped (live telemetry), and only if that never happens (the player gave
  // the game separate faster / slower keys, which stops the cycle) falls back to the "slower" key.
  let wipBusy = false;
  async function wiperOff() {
    if (wipBusy) return;
    wipBusy = true;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const cycle = layout().binds.wipers || FUNCTIONS.wipers.keys, slower = ['ctrl', 'p'];
    try {
      if (telValue('wipers') === undefined) {
        // no telemetry: use the count of "faster" presses (4 positions in the cycle)
        const n = S.wipLvl ? 4 - S.wipLvl : 0;
        for (let i = 0; i < n; i += 1) { send('tap', cycle); await wait(260); }
      } else {
        const stopped = async () => { if (telValue('wipers') !== false) return false; await wait(600); return telValue('wipers') === false; };
        let ok = await stopped();
        for (let i = 0; i < 4 && !ok; i += 1) { send('tap', cycle); await wait(450); ok = await stopped(); }
        for (let i = 0; i < 3 && !ok; i += 1) { send('tap', slower); await wait(400); ok = await stopped(); }
      }
    } finally {
      S.wipLvl = 0; S.latched.wipers = false; wipBusy = false; updateStates();
    }
  }

  if (/[?&]debug\b/.test(location.search)) window.__td = { S, wiperOff };   // test hook (not used in normal runs)

  // ---- Play mode: pressing buttons ---------------------------------------------------------
  function press(w, node, ev) {
    const f = fnOf(w);
    if (!f) return;
    // Atomic lamps are passive telltales — never send keys or flip local latches.
    if (w.lamp || (f.keys && f.keys.length === 0 && LAMP_INDICATORS[f.id])) return;
    if (f.long) {
      // a key that must not fire by accident (roadside assistance...): hold it for one second
      node.classList.add('holding');
      let t = 0;
      const stop = () => { clearTimeout(t); node.classList.remove('holding'); node.removeEventListener('pointerup', stop); node.removeEventListener('pointercancel', stop); node.removeEventListener('pointerleave', stop); };
      t = setTimeout(() => { stop(); S.pressed.add(w.id); send('tap', keysOf(w)); buzz(30); updateStates(); setTimeout(() => { S.pressed.delete(w.id); updateStates(); }, 500); }, 1000);
      node.addEventListener('pointerup', stop); node.addEventListener('pointercancel', stop); node.addEventListener('pointerleave', stop);
      return;
    }
    const keys = keysOf(w);
    S.pressed.add(w.id);
    if (w.rotary && (w.states || []).length) {
      // Index first, then write lightLocal. Incrementing lightLocal before rotaryIndex
      // made lightStage() already return the new step, so the dial jumped two detents offline.
      const prevRotary = rotaryIndex(w, f);
      const nextRotary = (prevRotary + 1) % w.states.length;
      const nextStage = w.states[nextRotary].stage;
      const liveNow = f.id === 'lights' ? telLightStage() : rotaryStage(w, f);
      const fromStage = (liveNow === null || liveNow === undefined) ? w.states[prevRotary].stage : liveNow;
      const hold = {
        index: nextRotary,
        stage: Number.isFinite(nextStage) ? nextStage : null,
        from: Number.isFinite(fromStage) ? fromStage : null
      };
      if (w.modRotary === 'wipers') hold.telFrom = telWiperOn();
      S.rotLocal[w.id] = hold;
      if (f.id === 'lights' && Number.isFinite(nextStage)) {
        S.lightLocal = nextStage;
        S.lightHold = hold;
      }
    } else if (f.id === 'lights') {
      S.lightLocal = ((S.lightLocal || 0) + 1) % 4;
    }

    // Suspension telltales: brief local flash, then settle to SDK lift/trailerLift state.
    if (/^susp_/.test(f.id)) {
      S.liftFlashUntil = Date.now() + 800;
      S.liftFlashFlag = /rear|trailer/i.test(f.id) ? 'trailerLift' : 'lift';
    }
    let skipSend = false;
    if (f.id === 'wipers') {
      if (w.modRotary === 'wipers') {
        // AUTO → normal → fast → OFF (6 o'clock) → AUTO. Each on-detent sends one
        // cycle tap. OFF runs wiperOff(), which keeps tapping until the wipers stop.
        const hold = S.rotLocal[w.id];
        const st = hold && w.states[hold.index];
        if (st && st.id === 'off') {
          skipSend = true;
          wiperOff();
          S.wipLvl = 0;
        } else {
          S.wipLvl = st && Number.isFinite(Number(st.stage)) ? Number(st.stage) : 0;
        }
      } else {
        // The game's wiper key cycles: off, 1, 2, 3, off... The app counts the steps; at the top it
        // stays put (a further press would wrap to OFF, the opposite of "faster").
        if (telValue('wipers') === false && !wipBusy) S.wipLvl = 0;
        if ((S.wipLvl || 0) >= 3) skipSend = true; else S.wipLvl = (S.wipLvl || 0) + 1;
      }
    }
    if (f.id === 'wipers_back') { S.latched.wipers = false; skipSend = true; wiperOff(); }   // off also releases the "on" key
    let holdKeepalive = null;
    if (skipSend) { /* handled above */ } else if (f.mode === 'hold') {
      send('down', keys);
      // Keep the PC-side watchdog (15s safety auto-release) alive for long holds
      // such as refueling, where filling the tank can take well over 15s.
      holdKeepalive = setInterval(() => { if (S.pressed.has(w.id)) send('down', keys); }, 5000);
    } else send('tap', keys);
    // Without live telemetry for this function, remember the toggle ourselves.
    if (f.latch && (!f.tel || telValue(f.tel) === undefined)) {
      const key = f.id === 'custom' ? w.id : f.id;
      S.latched[key] = !S.latched[key];
    }
    if (w.modRotary === 'wipers') S.latched.wipers = (S.wipLvl || 0) > 0;
    buzz(12);
    updateStates();

    const release = () => {
      node.removeEventListener('pointerup', release);
      node.removeEventListener('pointercancel', release);
      node.removeEventListener('lostpointercapture', release);
      if (!S.pressed.has(w.id)) return;
      S.pressed.delete(w.id);
      if (holdKeepalive) { clearInterval(holdKeepalive); holdKeepalive = null; }
      if (f.mode === 'hold') send('up', keys);
      updateStates();
    };
    // Capture keeps "up" coming to this button even if the finger slides off it,
    // otherwise a held horn would stay stuck on.
    try { node.setPointerCapture(ev.pointerId); } catch (e) { /* old browsers */ }
    node.addEventListener('pointerup', release);
    node.addEventListener('pointercancel', release);
    node.addEventListener('lostpointercapture', release);
  }

  // ---- Edit mode: grid operations ----------------------------------------------------------
  function isFree(p, x, y, w, h, exceptId) {
    if (x < 0 || y < 0 || x + w > p.cols || y + h > p.rows) return false;
    return !p.widgets.some((o) => o.id !== exceptId && x < o.x + o.w && o.x < x + w && y < o.y + o.h && o.y < y + h);
  }

  function findWidget(id) { return widgetsOf(page()).find((w) => w.id === id); }

  function startEditGesture(w, node, ev) {
    const resizing = ev.target.classList.contains('grip');
    const startX = ev.clientX;
    const startY = ev.clientY;
    let moved = false;
    try { node.setPointerCapture(ev.pointerId); } catch (e) { /* old browsers */ }

    const onMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Small dead zone: a tap that wobbles a few pixels must still open the properties.
      if (!moved && Math.hypot(dx, dy) < 8) return;
      moved = true;
      node.classList.add('dragging');
      if (resizing) {
        node.style.width = Math.max(S.u * 0.6, w.w * S.u + dx) + 'px';
        node.style.height = Math.max(S.u * 0.6, w.h * S.u + dy) + 'px';
      } else {
        node.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      }
    };
    const onUp = (e) => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
      if (!moved) { S.sel = w.id; updateStates(); openProps(w.id); return; }
      const p = page();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (resizing) {
        const nw = clamp(Math.round((w.w * S.u + dx) / S.u), 1, p.cols - w.x);
        const nh = clamp(Math.round((w.h * S.u + dy) / S.u), 1, p.rows - w.y);
        if (isFree(p, w.x, w.y, nw, nh, w.id)) { w.w = nw; w.h = nh; save(); } else toast('Not enough free cells to grow there.');
      } else {
        const nx = clamp(Math.round((w.x * S.u + dx) / S.u), 0, p.cols - w.w);
        const ny = clamp(Math.round((w.y * S.u + dy) / S.u), 0, p.rows - w.h);
        if (isFree(p, nx, ny, w.w, w.h, w.id)) { w.x = nx; w.y = ny; save(); } else toast('That spot is taken.');
      }
      renderPanel();
    };
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onUp);
  }

  // Frame-method buttons use percentages instead of grid cells. The shipped arrangement stays
  // ready to use, while a copied panel can move its keys without leaving holes in the artwork.
  // Modern (eu_frame) keys live in CSS Grid recesses: free dragging cannot change their slot,
  // so a tap opens properties and a drag is cancelled instead of writing a dead `r` override.
  let skinEditMoved = false;
  function startSkinEditGesture(w, node, ev) {
    const startX = ev.clientX;
    const startY = ev.clientY;
    const rect = panel.getBoundingClientRect();
    const modernGrid = page().skin === 'eu_frame' && !!w.g;
    let moved = false;
    try { node.setPointerCapture(ev.pointerId); } catch (e) { /* old browsers */ }
    const onMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 8) return;
      moved = true;
      if (modernGrid) return;
      node.classList.add('dragging');
      node.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    };
    const onUp = (e) => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
      if (!moved) {
        S.sel = w.id;
        updateStates();
        openProps(w.id);
        return;
      }
      if (modernGrid) {
        toast('Modern buttons stay in their recesses. Tap a button to change its function.');
        return;
      }
      const dx = (e.clientX - startX) / rect.width * 100;
      const dy = (e.clientY - startY) / rect.height * 100;
      const r = w.r.slice();
      r[0] = clamp(r[0] + dx, 0, 100 - r[2]);
      r[1] = clamp(r[1] + dy, 0, 100 - r[3]);
      setOver(w, { r: r.map((n) => Math.round(n * 1000) / 1000) });
      skinEditMoved = true;
      setTimeout(() => { skinEditMoved = false; }, 0);
      renderPanel();
    };
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onUp);
  }

  function chooseSc25Theme(theme) {
    if (!SC25.THEMES || !SC25.THEMES[theme]) return;
    const l = layout();
    const isScania = page().skin === 'scania_frame';
    const state = isScania ? (l.scania = l.scania || {}) : (l.sc25 = l.sc25 || {});
    state.theme = theme;
    save();
    // Update the existing frame in place; keep its layout and controls exactly where they are.
    applySc25Colors(page().skin, page().size);
    const cluster = panel.querySelector('.k-sc25');
    if (cluster && cluster._sc25) cluster._sc25.setTheme(theme);
    panel.querySelectorAll('[data-sc25-theme]').forEach((option) => {
      const selected = option.dataset.sc25Theme === theme;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    const palette = panel.querySelector('.k-sc25palette');
    if (palette) {
      const current = palette.querySelector('.sc25-palette-current');
      if (current) current.style.setProperty('--swatch', SC25.THEMES[theme].accent);
      palette.classList.remove('open');
      const toggle = palette.querySelector('[data-sc25-color-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  }

  panel.addEventListener('pointerdown', (ev) => {
    const colorOption = ev.target.closest('[data-sc25-theme]');
    const colorToggle = ev.target.closest('[data-sc25-color-toggle]');
    const palette = ev.target.closest('.k-sc25palette');
    if (colorOption || colorToggle) {
      ev.preventDefault(); ev.stopPropagation();
      if (colorOption) chooseSc25Theme(colorOption.dataset.sc25Theme);
      else if (palette) {
        const open = palette.classList.toggle('open');
        colorToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      return;
    }
    const openedPalette = panel.querySelector('.k-sc25palette.open');
    if (openedPalette && !palette) {
      openedPalette.classList.remove('open');
      const toggle = openedPalette.querySelector('[data-sc25-color-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
    const node = ev.target.closest('.w');
    if (S.edit) {
      if (node) {
        const w = findWidget(node.dataset.id);
        if (!w) return;
        if (w.sk) {
          if (page().skin !== 'eu_frame' || w.t !== 'kbd') return;
          ev.preventDefault(); startSkinEditGesture(w, node, ev);
          return;
        }
        ev.preventDefault(); startEditGesture(w, node, ev);
      }
      return; // empty cells are handled on "click", below
    }
    if (!node) return;
    // frame-method panels: only kbd buttons and media keys respond to touch
    const _fw = findWidget(node.dataset.id);
    // Allow kbd/spr/gps/ign on frame panels. Ign was missing here — photoreal sov_key_slot
    // never received presses (Regra 4: ignition/electrics).
    if (_fw && _fw.sk && skinOf(page()) && skinOf(page()).frame && _fw.t !== 'kbd' && _fw.t !== 'spr' && _fw.t !== 'gps' && _fw.t !== 'ign' && !ev.target.closest('[data-media]')) return;
    ev.preventDefault();
    // the music player has its own keys inside one widget
    const mediaKey = ev.target.closest('[data-media]');
    if (mediaKey) {
      send('tap', [mediaKey.dataset.media]);
      mediaKey.classList.add('down');
      setTimeout(() => mediaKey.classList.remove('down'), 140);
      buzz(12);
      return;
    }
    const w = findWidget(node.dataset.id);
    if (w && w.t === 'knob') { startKnob(w, node, ev); return; }
    if (w && w.t === 'ign') {
      // Photo key-slot: Combined = tap state machine (electrics → timer → engine).
      // Classic painted key: keep the 1 s hold so a brush never kills the engine.
      if (node.classList.contains('has-asset')) tapIgnCombined(node);
      else holdIgnition(node);
      return;
    }
    if (w && w.t === 'kbd' && page().skin === 'scania_frame' && page().size === 'phone' && w.fn === 'engine') {
      holdIgnition(node);
      return;
    }
    if (w && w.t === 'gps' && node.classList.contains('tinfo')) {
      // The display is read-only by touch; screen changes follow the in-game display-mode control.
      if (node.classList.contains('scania-obc')) {
        return;
      }
      toggleObc(); return;
    }
    if (w && w.t === 'live') { if (OBC_FIELDS.has(w.field)) toggleObc(); return; }
    if (w && w.split) {
      // two-way rocker: the lower half is the second function (wipers: slower / off)
      const box = node.getBoundingClientRect();
      const lower = ev.clientY > box.top + box.height / 2;
      node.classList.toggle('lo', lower);
      if (lower) { press({ id: w.id, t: 'hot', fn: w.split }, node, ev); return; }
    }
    if (w) press(w, node, ev);
  });
  // Change of panel: the new one slides in from the side the finger went (or rises a little when picked
  // from the menu), eases out, and its lamps come up a moment after the picture, like a dash waking.
  function panelAnim(dir) {
    if (!panel.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = dir ? 'translateX(' + (dir * 7) + '%) scale(0.97)' : 'translateY(2.5%) scale(0.975)';
    let done = false;
    const reset = () => {
      if (done) return;
      done = true;
      panel.style.filter = ''; panel.style.opacity = ''; panel.style.transform = '';
    };
    try {
      const anim = panel.animate(
        [
          { transform: from, opacity: 0, filter: 'blur(6px) brightness(0.6)' },
          { transform: 'none', opacity: 1, filter: 'blur(0px) brightness(1)' },
        ],
        { duration: 460, easing: 'cubic-bezier(0.18, 0.85, 0.22, 1)' }
      );
      anim.finished.then(reset).catch(reset);
      // Some WebView builds never settle the Animation's "finished" promise (seen switching
      // panels quickly on a tablet): without this, the blur/opacity from the first frame stays
      // stuck as an inline style forever, over anything the menus change, until the app is
      // closed and reopened. A hard timeout guarantees the clean-up runs either way.
      setTimeout(reset, 600);
    } catch (e) {
      reset();
    }
  }

  // ---- Swipe sideways: previous / next panel ------------------------------------------------
  // Only a drag that starts OFF a key counts (between the keys, on the picture, in the bars):
  // a key reacts the moment it is touched, so a swipe starting on one would also press it.
  let swipe = null;
  document.addEventListener('pointerdown', (ev) => {
    swipe = null;
    if (S.edit || S.deco || S.obc || !ev.isPrimary || !sheet.hidden || !galleryEl.hidden) return;
    if (ev.target.closest('.w, .k-deco, button, input, select, textarea, a, #sheet, #gallery')) return;
    swipe = { x: ev.clientX, y: ev.clientY, t: performance.now() };
  }, true);
  document.addEventListener('pointerup', (ev) => {
    const s = swipe; swipe = null;
    if (!s || S.edit || !sheet.hidden) return;
    const dx = ev.clientX - s.x; const dy = ev.clientY - s.y;
    // long, mostly horizontal and quick enough not to be a slow drag
    if (Math.abs(dx) < 140 || Math.abs(dx) < Math.abs(dy) * 1.25 || performance.now() - s.t > 800) return;
    const all = S.store.layouts; if (all.length < 2) return;
    const i = all.findIndex((l) => l.id === S.store.activeId);
    const n = all[(i + (dx < 0 ? 1 : -1) + all.length) % all.length];
    S.store.activeId = n.id; S.page = 0; save(); renderAll(); panelAnim(dx < 0 ? 1 : -1); toast(n.name + '  ' + (all.indexOf(n) + 1) + '/' + all.length);
  }, true);
  document.addEventListener('pointercancel', () => { swipe = null; }, true);
  // Adding on "click", not "pointerdown": the drawer opens under the finger, and opening it
  // earlier would let the same tap fall through onto whatever list item appears there.
  panel.addEventListener('click', (ev) => {
    if (!S.edit) return;
    if (skinEditMoved) { skinEditMoved = false; return; }
    const node = ev.target.closest('.w');
    if (node) {
      const w = findWidget(node.dataset.id);
      if (w && w.sk && (w.t === 'hot' || w.t === 'kbd')) { S.sel = w.id; updateStates(); openProps(w.id); }
      return;
    }
    if (page().skin) return;
    const rect = panel.getBoundingClientRect();
    const x = clamp(Math.floor((ev.clientX - rect.left) / S.u), 0, page().cols - 1);
    const y = clamp(Math.floor((ev.clientY - rect.top) / S.u), 0, page().rows - 1);
    if (isFree(page(), x, y, 1, 1)) openAdd(x, y);
  });
  // Long-press must not pop the browser's context menu over the panel.
  panel.addEventListener('contextmenu', (ev) => ev.preventDefault());

  // ---- Sheet plumbing ----------------------------------------------------------------------
  let sheetHandler = null;
  // side: 'left' for the main menu and everything opened from it (the menu button lives on
  // the left), 'right' for editing sheets so they do not cover the top-left of the panel.
  // Omitted: stay on the side of the sheet that is already open.
  function openSheet(title, bodyHtml, handler, side) {
    if (side || sheet.hidden) sheet.classList.toggle('left', side === 'left');
    sheet.innerHTML = '<div class="sheet-head"><h2>' + esc(title) + '</h2><button class="btn small" data-act="close">Close</button></div>' +
      '<div class="sheet-body">' + bodyHtml + '</div>';
    sheetHandler = handler || null;
    sheet.hidden = false;
    scrim.hidden = false;
  }
  function closeSheet() {
    sheet.hidden = true;
    scrim.hidden = true;
    sheetHandler = null;
    if (S.sel) { S.sel = null; updateStates(); }
  }
  scrim.addEventListener('click', closeSheet);
  sheet.addEventListener('click', (ev) => {
    const target = ev.target.closest('[data-act]');
    if (!target) return;
    if (target.dataset.act === 'close') { closeSheet(); return; }
    if (sheetHandler) sheetHandler(target.dataset.act, target, ev);
  });
  // Text boxes report on "input", selects on "change". Never both: a text box also fires
  // "change" when it loses focus, i.e. in the middle of a tap on a list item, and re-rendering
  // the list at that moment would swallow the tap.
  sheet.addEventListener('input', (ev) => {
    if (sheetHandler && ev.target.dataset.field && ev.target.tagName !== 'SELECT' && ev.target.type !== 'checkbox') sheetHandler('field', ev.target, ev);
  });
  sheet.addEventListener('change', (ev) => {
    if (sheetHandler && ev.target.dataset.field && (ev.target.tagName === 'SELECT' || ev.target.type === 'checkbox')) sheetHandler('field', ev.target, ev);
  });

  // A destructive button asks for a second tap instead of a confirm() dialog
  // (dialogs are blocked in embedded previews and break fullscreen on tablets).
  function armed(target) {
    if (target.classList.contains('armed')) return true;
    target.classList.add('armed');
    target.dataset.original = target.textContent;
    target.textContent = 'Tap again to confirm';
    setTimeout(() => { if (target.isConnected) { target.classList.remove('armed'); target.textContent = target.dataset.original; } }, 3000);
    return false;
  }

  const options = (list, selected) => list.map((o) =>
    '<option value="' + esc(o[0]) + '"' + (o[0] === selected ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('');

  // Combos are edited as "one optional modifier + one key": covers everything the games
  // accept and stays usable on a touch screen with no physical keyboard to capture from.
  function comboHtml(keys, fieldPrefix) {
    const mod = keys.length > 1 ? keys[0] : '';
    const main = keys.length ? keys[keys.length - 1] : '';
    return '<div class="combo">' +
      '<select data-field="' + fieldPrefix + ':mod" aria-label="Modifier">' + options([['', 'Key only']].concat(MODIFIER_KEYS.map((k) => [k, keyLabel(k)])), mod) + '</select>' +
      '<select class="grow" data-field="' + fieldPrefix + ':key" aria-label="Key">' + options([['', 'No key']].concat(MAIN_KEYS.map((k) => [k, keyLabel(k)])), main) + '</select>' +
      '</div>';
  }
  // Read both selects from the DOM rather than patching the stored combo: the modifier is
  // often chosen first, while there is still no key to attach it to.
  function readCombo(target) {
    const selects = target.closest('.combo').querySelectorAll('select');
    const mod = selects[0].value;
    const main = selects[1].value;
    if (!main) return [];
    return mod && mod !== main ? [mod, main] : [main];
  }

  // ---- Sheet: add a control ----------------------------------------------------------------
  function functionListHtml(filter, placed) {
    const q = filter.trim().toLowerCase();
    const game = layout().game;
    let html = '';
    // The panel's own game first; the other catalog stays reachable for mixed panels.
    const cats = CATEGORIES.slice().sort((a, b) => (a.game === game ? 0 : 1) - (b.game === game ? 0 : 1));
    for (const cat of cats) {
      const items = FUNCTION_LIST.filter((f) => f.cat === cat.id && (!q || (f.name + ' ' + cat.name).toLowerCase().includes(q)));
      if (!items.length) continue;
      html += '<div class="group"><h3>' + esc(cat.name) + '</h3><div class="list">' + items.map((f) =>
        '<button class="item" data-act="pick" data-fn="' + f.id + '"><span class="ico">' + iconSvg(f.icon) + '</span>' +
        '<span class="name">' + esc(f.name) + (placed.has(f.id) ? '<small>Already on this panel</small>' : '') + '</span>' +
        '<span class="kbd">' + esc(comboLabel(layout().binds[f.id] || f.keys)) + '</span></button>').join('') + '</div></div>';
    }
    return html || '<p class="note">No function matches that search.</p>';
  }

  function placedFunctions() {
    const set = new Set();
    for (const p of layout().pages) for (const w of widgetsOf(p)) { if (w.fn) set.add(w.fn); if (w.split) set.add(w.split); if (w.t === 'ign') { set.add('electrics'); set.add('engine'); } }
    for (const node of extrasEl.querySelectorAll('.xkey')) set.add(node.dataset.fn);
    return set;
  }

  // onPick(fnId | 'custom' | 'display' | 'plate')
  function openPicker(title, onPick) {
    const placed = placedFunctions();
    openSheet(title,
      '<div class="group"><div class="row">' +
      '<button class="btn grow" data-act="pick" data-fn="custom">Custom key</button>' +
      '<button class="btn grow" data-act="pick" data-fn="display">Readout</button>' +
      '<button class="btn grow" data-act="pick" data-fn="plate">Label</button>' +
      '<button class="btn grow" data-act="pick" data-fn="gauge">Analog dial</button>' +
      '<button class="btn grow" data-act="pick" data-fn="radio_widget">Music player</button>' +
      '<button class="btn grow" data-act="pick" data-fn="status">Damage and trip</button></div>' +
      '<input type="search" id="fnSearch" data-field="search" placeholder="Search functions" autocomplete="off"></div>' +
      '<div id="fnList" style="display:flex;flex-direction:column;gap:18px">' + functionListHtml('', placed) + '</div>',
      (act, target) => {
        if (act === 'field') $('#fnList', sheet).innerHTML = functionListHtml(target.value, placed);
        else if (act === 'pick') onPick(target.dataset.fn);
      });
  }

  function openAdd(x, y) {
    sheet.classList.remove('left');
    openPicker('Add to panel', (id) => {
      const p = page();
      let w;
      if (id === 'display') {
        // readouts want two cells; fall back to one if the neighbour is taken
        const wide = isFree(p, x, y, 2, 1) ? 2 : 1;
        w = { id: uid(), t: 'display', field: 'speed', x, y, w: wide, h: 1 };
      } else if (id === 'plate') {
        w = { id: uid(), t: 'plate', text: 'Label', x, y, w: isFree(p, x, y, 2, 1) ? 2 : 1, h: 1 };
      } else if (id === 'status') {
        // widest strip that fits from this cell
        let width = 1;
        while (width < 7 && isFree(p, x, y, width + 1, 1)) width += 1;
        w = { id: uid(), t: 'status', x, y, w: width, h: 1 };
      } else if (id === 'gauge') {
        const side = isFree(p, x, y, 2, 2) ? 2 : 1;
        w = { id: uid(), t: 'gauge', field: 'speed', x, y, w: side, h: side };
      } else if (id === 'radio_widget') {
        // a head unit is wide: 4x2, then 3x2, then whatever fits
        const size = isFree(p, x, y, 4, 2) ? [4, 2] : isFree(p, x, y, 3, 2) ? [3, 2] : isFree(p, x, y, 2, 1) ? [2, 1] : [1, 1];
        w = { id: uid(), t: 'radio_widget', x, y, w: size[0], h: size[1] };
      } else if (id === 'custom') {
        w = { id: uid(), t: 'rocker', fn: 'custom', label: 'CUSTOM', icon: 'dot', keys: [], mode: 'tap', x, y, w: 1, h: 1 };
      } else {
        w = { id: uid(), t: FUNCTIONS[id].latch ? 'toggle' : 'rocker', fn: id, x, y, w: 1, h: 1 };
      }
      p.widgets.push(w);
      save();
      renderPanel();
      // Custom keys and labels are useless until configured: go straight to their properties.
      if (id === 'custom' || id === 'plate' || id === 'display' || id === 'gauge') { S.sel = w.id; updateStates(); openProps(w.id); } else closeSheet();
    });
  }

  // ---- Sheet: control properties -----------------------------------------------------------
  const TYPE_OPTIONS = [['rocker', 'Rocker switch'], ['toggle', 'Toggle switch'], ['round', 'Round push button'], ['hazard', 'Hazard triangle'], ['valve', 'Air valve knob']];
  const LED_OPTIONS = [['green', 'Green'], ['amber', 'Amber'], ['red', 'Red'], ['blue', 'Blue'], ['white', 'White']];

  function openProps(id) {
    const w = findWidget(id);
    if (!w) { closeSheet(); return; }
    if (w.sk) { openSkinProps(w); return; }
    sheet.classList.remove('left'); // editing sheets always sit on the right
    const f = fnOf(w);
    const custom = f && f.id === 'custom';
    let body = '';

    if (w.t === 'display') {
      body += '<label class="field"><span>Shows</span><select data-field="field">' + options(DISPLAY_FIELDS.map((d) => [d.id, d.name]), w.field) + '</select></label>' +
        '<p class="note">Readouts need the telemetry plugin in ETS2 or ATS. Real time works everywhere.</p>';
    } else if (w.t === 'plate') {
      body += '<label class="field"><span>Text</span><input type="text" data-field="text" value="' + esc(w.text || '') + '"></label>';
    } else if (w.t === 'status') {
      body += '<p class="note">Truck, trailer and cargo damage, then game day and time, distance and driving time left on the route. Needs the telemetry plugin (ETS2 and ATS).</p>';
    } else if (w.t === 'gauge') {
      body += '<label class="field"><span>Dial</span><select data-field="field">' + options(GAUGE_FIELDS.map((d) => [d.id, d.name]), w.field) + '</select></label>' +
        '<p class="note">Dials follow the game through the telemetry plugin (ETS2 and ATS).</p>';
    } else if (w.t === 'radio_widget') {
      body += '<p class="note">Shows the track playing in the music app on the PC and sends the Windows media keys: previous, play/pause, next, volume. ' +
        'The volume keys change the whole PC volume, not only the music.</p>';
    } else {
      body += '<div class="group"><h3>Function</h3><div class="row"><b class="grow">' + esc(custom ? 'Custom key' : f.name) + '</b>' +
        '<button class="btn small" data-act="change-fn">Change</button></div>';
      if (custom) {
        body += comboHtml(w.keys || [], 'keys') +
          '<label class="field"><span>Press behaviour</span><select data-field="behaviour">' + options([
            ['tap', 'Tap: one short press'], ['hold', 'Hold: key stays down while pressed'], ['latch', 'Switch: tap, lamp stays on until tapped again'],
          ], w.latch ? 'latch' : (w.mode || 'tap')) + '</select></label>';
      } else {
        body += '<p class="note">Sends <span class="kbd">' + esc(comboLabel(keysOf(w))) + '</span>' +
          (f.bind ? '. This action has no default key in the game: assign it once under Key setup.' : ', the game default.') + '</p>' +
          '<button class="btn" data-act="keys">Key setup</button>';
      }
      body += '</div>';
      body += '<div class="group"><h3>Look</h3>' +
        '<label class="field"><span>Control</span><select data-field="t">' + options(TYPE_OPTIONS, w.t) + '</select></label>';
      if (w.t === 'valve') {
        body += '<label class="field"><span>Knob</span><select data-field="color">' + options([['yellow', 'Yellow diamond'], ['red', 'Red octagon']], w.color || 'yellow') + '</select></label>';
      }
      body += '<label class="field"><span>Legend (line break allowed)</span><textarea data-field="label" rows="2">' + esc(f.label) + '</textarea></label>';
      if (w.t !== 'hazard' && w.t !== 'valve') {
        body += '<label class="field"><span>Pictogram</span><select data-field="icon">' + options(Object.keys(ICONS).map((k) => [k, k]), f.icon) + '</select></label>' +
          '<label class="field"><span>Lamp colour</span><select data-field="led">' + options(LED_OPTIONS, f.led) + '</select></label>';
      }
      body += '</div>';
    }

    body += '<div class="group"><h3>Size</h3><div class="row">' +
      '<div class="sizer"><span>Width</span><div class="stepper"><button class="btn" data-act="size" data-d="w-">−</button><b>' + w.w + '</b><button class="btn" data-act="size" data-d="w+">+</button></div></div>' +
      '<div class="sizer"><span>Height</span><div class="stepper"><button class="btn" data-act="size" data-d="h-">−</button><b>' + w.h + '</b><button class="btn" data-act="size" data-d="h+">+</button></div></div>' +
      '</div></div>' +
      '<div class="row"><button class="btn grow" data-act="duplicate">Duplicate</button><button class="btn grow danger" data-act="delete">Remove</button></div>';

    openSheet({ display: 'Readout', plate: 'Label', gauge: 'Analog dial', radio_widget: 'Music player', status: 'Damage and trip' }[w.t] || 'Button', body, (act, target) => {
      const p = page();
      if (act === 'field') {
        const key = target.dataset.field;
        const v = target.value;
        if (key === 'keys:mod' || key === 'keys:key') w.keys = readCombo(target);
        else if (key === 'behaviour') { w.latch = v === 'latch'; w.mode = v === 'hold' ? 'hold' : 'tap'; }
        else w[key] = v;
        save();
        // Rebuild just this widget so typing in the legend field keeps its focus.
        const old = panel.querySelector('[data-id="' + w.id + '"]');
        if (old) old.replaceWith(widgetEl(w));
        S.sel = w.id;
        updateStates();
        // Changing the control type changes which fields apply.
        if (key === 't') openProps(w.id);
        return;
      }
      if (act === 'size') {
        const d = target.dataset.d;
        const nw = w.w + (d === 'w+' ? 1 : d === 'w-' ? -1 : 0);
        const nh = w.h + (d === 'h+' ? 1 : d === 'h-' ? -1 : 0);
        if (nw < 1 || nh < 1) return;
        if (!isFree(p, w.x, w.y, nw, nh, w.id)) { toast('Not enough free cells to grow there.'); return; }
        w.w = nw; w.h = nh;
        save(); renderPanel(); S.sel = w.id; openProps(w.id);
      } else if (act === 'delete') {
        p.widgets.splice(p.widgets.indexOf(w), 1);
        save(); closeSheet(); renderPanel();
      } else if (act === 'duplicate') {
        // first free spot that fits, scanning row by row
        for (let y = 0; y < p.rows; y += 1) {
          for (let x = 0; x < p.cols; x += 1) {
            if (isFree(p, x, y, w.w, w.h)) {
              const copy = Object.assign(JSON.parse(JSON.stringify(w)), { id: uid(), x, y });
              p.widgets.push(copy);
              save(); renderPanel(); S.sel = copy.id; openProps(copy.id);
              return;
            }
          }
        }
        toast('No free space on this page for a copy.');
      } else if (act === 'change-fn') {
        openPicker('Choose function', (fnId) => {
          if (['display', 'plate', 'gauge', 'radio_widget', 'status'].includes(fnId)) { toast('Add readouts and labels from an empty cell.'); return; }
          w.fn = fnId;
          // drop overrides that belonged to the previous function
          delete w.label; delete w.icon; delete w.led;
          if (fnId === 'custom') { w.label = 'CUSTOM'; w.icon = 'dot'; w.keys = w.keys || []; }
          save(); renderPanel(); S.sel = w.id; openProps(w.id);
        });
      } else if (act === 'keys') {
        openKeys();
      }
    });
  }

  // ---- Sheet: a key of an art panel -----------------------------------------------------------
  // The picture is fixed; what a painted key DOES is the player's to change.
  function setOver(w, patch) {
    const pg = page();
    const key = skinCut(pg) + ':' + w.id;
    pg.over = pg.over || {};
    if (patch) pg.over[key] = Object.assign({}, pg.over[key], patch); else delete pg.over[key];
    save();
  }

  function openSkinProps(stale) {
    sheet.classList.remove('left');
    const w = findWidget(stale.id);
    const f = fnOf(w);
    const custom = f.id === 'custom';
    const changed = !!(page().over || {})[skinCut(page()) + ':' + w.id];
    let body = '<div class="group"><h3>Function</h3><div class="row"><b class="grow">' + esc(custom ? 'Custom key' : f.name) + '</b>' +
      '<button class="btn small" data-act="change-fn">Change</button></div>';
    if (custom) {
      body += comboHtml(w.keys || [], 'keys') +
        '<label class="field"><span>Press behaviour</span><select data-field="behaviour">' + options([
          ['tap', 'Tap: one short press'], ['hold', 'Hold: key stays down while pressed'], ['latch', 'Switch: tap, lamp stays on until tapped again'],
        ], w.latch ? 'latch' : (w.mode || 'tap')) + '</select></label>' +
        '<p class="note">Choose the key this button presses on the PC, then give the same key to any action in the game’s Options › Keys &amp; Buttons.</p>';
    } else {
      body += '<p class="note">Sends <span class="kbd">' + esc(comboLabel(keysOf(w))) + '</span>' +
        (f.bind ? '. This action has no default key in the game: assign it once under Key setup.' : ', the game default.') + '</p>' +
        '<button class="btn" data-act="keys">Key setup</button>';
    }
    body += '</div>' + (changed ? '<button class="btn" data-act="default">Restore this button</button>' : '') +
      '<p class="note">' + (page().skin === 'eu_frame'
        ? 'In Edit mode, drag this button to move it. Its function and position are saved separately for portrait and landscape.'
        : 'The picture of the panel is fixed. Keys that are not on it go on an extra page: Page › New page.') + '</p>';
    openSheet('Button', body, (act, target) => {
      if (act === 'field') {
        const key = target.dataset.field;
        if (key === 'keys:mod' || key === 'keys:key') setOver(w, { keys: readCombo(target) });
        else if (key === 'behaviour') setOver(w, { latch: target.value === 'latch', mode: target.value === 'hold' ? 'hold' : 'tap' });
        updateStates();
      } else if (act === 'change-fn') {
        openPicker('Choose function', (fnId) => {
          if (PASSIVE.has(fnId)) { toast('A painted key can only take a key function.'); return; }
          setOver(w, fnId === 'custom' ? { fn: 'custom', keys: [], mode: 'tap', latch: false } : { fn: fnId });
          renderPanel(); S.sel = w.id; updateStates(); openSkinProps(w);
        });
      } else if (act === 'default') {
        setOver(w, null);
        renderPanel(); S.sel = w.id; updateStates(); openSkinProps(w);
      } else if (act === 'keys') {
        openKeys();
      }
    });
  }

  // ---- Sheet: page settings ----------------------------------------------------------------
  function openPage() {
    sheet.classList.remove('left');
    const l = layout();
    const p = page();
    // a new page is a free grid sized for the way the device is held right now
    const blank = () => (autoSize() === 'phone' ? { cols: 4, rows: 6 } : { cols: 8, rows: 4 });
    openSheet('Page',
      '<label class="field"><span>Name</span><input type="text" data-field="name" value="' + esc(p.name) + '"></label>' +
      (p.skin ? '<p class="note">' + (p.skin === 'eu_frame'
        ? 'Modern starts with a complete mapped layout. In Edit mode, drag a button to move it or tap it to change its function; portrait and landscape positions are saved independently.'
        : p.skin === 'sov_frame'
        ? 'Soviet uses an empty plate plus live keys. Pick the fascia photo under Menu › This panel › Soviet background. Layout Editor boards with skin sov_frame replace the factory grid when they have buttons.'
        : 'This page is the panel picture: its keys stay where they are painted. Tap a key in Edit to change what it does, or add a page of your own keys below.') + '</p>' :
      '<div class="group"><h3>Grid</h3><div class="row">' +
      '<div class="sizer"><span>Columns</span><div class="stepper"><button class="btn" data-act="grid" data-d="c-">−</button><b>' + p.cols + '</b><button class="btn" data-act="grid" data-d="c+">+</button></div></div>' +
      '<div class="sizer"><span>Rows</span><div class="stepper"><button class="btn" data-act="grid" data-d="r-">−</button><b>' + p.rows + '</b><button class="btn" data-act="grid" data-d="r+">+</button></div></div></div>' +
      '<button class="btn" data-act="rotate">Rotate grid (landscape ↔ portrait)</button>' +
      '<p class="note">More cells means smaller buttons. Rotate swaps columns and rows and moves every button with them.</p></div>') +
      '<div class="group"><h3>Order</h3><div class="row"><button class="btn grow" data-act="move" data-d="-1">Move left</button><button class="btn grow" data-act="move" data-d="1">Move right</button></div></div>' +
      '<div class="row"><button class="btn grow" data-act="add">New page</button><button class="btn grow danger" data-act="delete">Delete page</button></div>',
      (act, target) => {
        if (act === 'field') { p.name = target.value || 'Page'; save(); renderTabs(); return; }
        if (act === 'grid') {
          const d = target.dataset.d;
          const cols = p.cols + (d === 'c+' ? 1 : d === 'c-' ? -1 : 0);
          const rows = p.rows + (d === 'r+' ? 1 : d === 'r-' ? -1 : 0);
          if (cols < 1 || rows < 1 || cols > 24 || rows > 24) return;
          if (p.widgets.some((w) => w.x + w.w > cols || w.y + w.h > rows)) { toast('Move or remove the buttons in the last row or column first.'); return; }
          p.cols = cols; p.rows = rows;
        } else if (act === 'rotate') {
          transposePage(p);
        } else if (act === 'move') {
          const to = S.page + Number(target.dataset.d);
          if (to < 0 || to >= l.pages.length) return;
          l.pages.splice(S.page, 1);
          l.pages.splice(to, 0, p);
          S.page = to;
        } else if (act === 'add') {
          l.pages.push(Object.assign({ id: uid(), name: 'Page ' + (l.pages.length + 1), widgets: [] }, p.skin ? blank() : { cols: p.cols, rows: p.rows }));
          S.page = l.pages.length - 1;
        } else if (act === 'delete') {
          if (l.pages.length === 1) { toast('A panel needs at least one page.'); return; }
          if (!armed(target)) return;
          l.pages.splice(S.page, 1);
          S.page = Math.max(0, S.page - 1);
        }
        save(); renderAll(); openPage();
      });
  }

  // ---- Sheet: key setup --------------------------------------------------------------------
  function openKeys() {
    const B = S.store.prefs.binds;   // shared by every panel
    const placed = placedFunctions();
    const used = FUNCTION_LIST.filter((f) => placed.has(f.id));
    const toBind = used.filter((f) => f.bind);
    const rowHtml = (f) => {
      const keys = B[f.id] || f.keys;
      return '<div class="keyrow"><div class="top"><b>' + esc(f.name) + '</b>' +
        (f.bind ? '<span class="tag">Assign in game</span>' : '') + '</div>' +
        '<div class="row">' + '<div class="grow">' + comboHtml(keys, 'bind:' + f.id) + '</div>' +
        '<button class="btn small" data-act="test" data-fn="' + f.id + '">Send</button></div></div>';
    };
    openSheet('Key setup',
      '<p class="note">Each button presses a key on the PC. Functions marked <span class="tag">Assign in game</span> have no default key in the game. ' +
      'To assign one: open the game’s Options › Keys &amp; Buttons, click the action, then tap <b>Send</b> here. The game records the key and the button works from then on.</p>' +
      (toBind.length ? '<div class="group"><h3>To assign in game (' + toBind.length + ')</h3><div class="list">' + toBind.map(rowHtml).join('') + '</div></div>' : '') +
      '<div class="group"><h3>Using game defaults</h3><div class="list">' + used.filter((f) => !f.bind).map(rowHtml).join('') + '</div>' +
      '<p class="note">Changed a default inside the game? Set the same key here.</p></div>',
      (act, target) => {
        if (act === 'field') {
          const f = FUNCTIONS[target.dataset.field.split(':')[1]]; // bind:<fn>:<mod|key>
          const next = readCombo(target);
          if (!next.length) return;
          // Store only real overrides so future catalog fixes still reach untouched functions.
          if (next.join(' ') === f.keys.join(' ')) delete B[f.id]; else B[f.id] = next;
          save();
        } else if (act === 'test') {
          const f = FUNCTIONS[target.dataset.fn];
          if (S.bridge !== 'ok') { toast('Not connected to the PC bridge, nothing was sent.'); return; }
          send('tap', B[f.id] || f.keys);
          toast('Sent ' + comboLabel(B[f.id] || f.keys));
        }
      });
  }

  // ---- Sheet: main menu --------------------------------------------------------------------
  function openMenu() {
    const l = layout();
    const skinId = (l.pages.find((p) => p.skin) || {}).skin;
    const hasSkin = !!skinId;
    const hasStickers = hasSkin && SKINS[skinId] && ['T', 'P'].some((c) => SKINS[skinId][c].w.some((w) => w.t === 'sticker'));
    const stateText = {
      demo: 'No PC bridge found. Buttons are not sent anywhere. Start the PC bridge and connect with the address and PIN it shows.',
      ok: S.tel && S.tel.sdk ? 'Connected. Lamps and readouts follow the game.' : 'Connected to the PC. Game telemetry not detected, so lamps remember presses instead.',
      pin: 'The PC bridge answered but the PIN is wrong. Enter the PIN shown in the PC bridge window.',
      lost: 'Lost contact with the PC. Retrying every few seconds.',
    }[S.bridge];
    const pr = S.store.prefs;
    openSheet('Truck Deck',
      '<div class="group menu-panel"><h3>Menu do Painel</h3>' +
      '<button class="item current" data-act="gallery">' + thumb(skinId) + '<span class="name">' + esc(l.name) +
      '<small>' + S.store.layouts.length + ' panels. Tap to choose another.</small></span></button>' +
      '<button class="btn primary" data-act="gallery">Choose a panel</button></div>' +

      '<div class="group menu-app-settings"><h3>Menu Geral</h3>' +
      '<div class="row"><label class="field grow"><span>Language</span><select data-field="lang">' + options([['en', 'English'], ['pt', 'Português'], ['de', 'Deutsch'], ['es', 'Español'], ['fr', 'Français']], pr.lang) + '</select></label>' +
      '<label class="field grow"><span>Speed</span><select data-field="units">' + options([['kmh', 'km/h'], ['mph', 'mph']], pr.units) + '</select></label>' +
      '<label class="field grow"><span>Temperature</span><select data-field="temp">' + options([['c', '\u00b0C'], ['f', '\u00b0F']], pr.temp || 'c') + '</select></label></div>' +
      '<label class="field"><span>Gear display</span><select data-field="gearCrawlers">' + gearboxOptionsHtml(gearboxKey(pr.gearCrawlers)) + '</select></label>' +
      '<div class="row"><label class="field grow"><span>Key backlight</span><select data-field="lights">' + options([
        ['auto', 'Auto: with the truck lights'], ['on', 'Always on'], ['off', 'Off'],
      ], pr.lights || 'auto') + '</select></label>' +
      '<label class="field grow"><span>Key names</span><select data-field="names">' + options([['show', 'Shown'], ['hide', 'Hidden']], pr.names || 'show') + '</select></label></div>' +
      '<div class="row"><label class="field grow"><span>Text labels</span><select data-field="keyLabels">' + options([['show', 'Shown'], ['hide', 'Hidden']], pr.keyLabels || 'show') + '</select></label>' +
      '<label class="field grow"><span>Pictograms</span><select data-field="pictograms">' + options([['show', 'Shown'], ['hide', 'Hidden']], pr.pictograms || 'show') + '</select></label></div>' +
      '<label class="field"><span>Label font</span><select data-field="labelFont">' + options(LABEL_FONTS, pr.labelFont || 'barlow') + '</select></label>' +
      '<label class="field"><span>Dark cabin</span><select data-field="cabin">' + options([
        ['off', 'Off'], ['auto', 'Auto: follows the game clock'], ['dark', 'Always dark'],
      ], pr.cabin || 'off') + '</select></label>' +
      '<label class="field"><span>Display brightness</span><select data-field="brightness">' + options([
        ['auto', 'Auto'], ['100', '100%'], ['80', '80%'], ['60', '60%'], ['40', '40%'], ['20', '20%'],
      ], pr.brightness || 'auto') + '</select></label>' +
      (skinId === 'eu_frame' || skinId === 'modern_eu' || skinId === 'modern_us' || skinId === 'modern_br' || skinId === 'modern_heavy' || skinId === 'modern_rugged'
        ? '<label class="field"><span>OBD cluster theme</span><select data-field="obdTheme">' + options([
            ['v8-blue', 'V8 Blue'], ['scania-white', 'Scania White'], ['classic-amber', 'Classic Amber'],
            ['emerald-green', 'Emerald Green'], ['red-line', 'Red Line'], ['cyber-neon', 'Cyber Neon'], ['monochrome', 'Monochrome'],
            ['reggae-roots', 'Reggae Roots'],
          ], pr.obdTheme || 'v8-blue') + '</select></label>'
        : '') +
      check('autoRotate', 'Switch between vertical and horizontal when the screen turns', pr.autoRotate !== false) +
      '<div class="row"><button class="btn grow" data-act="keys">Key setup</button><button class="btn grow" data-act="transfer">Export / import</button></div>' +
      '<p class="note">These stay the same on every panel, including the ones you add later.</p></div>' +

      '<div class="group menu-panel-detail"><h4>Painel ativo</h4>' +
      (l.locked ? '<p class="note"><b>' + esc(l.name) + '</b> is a built-in panel: its keys cannot be changed. Use it as a model to get a copy you can edit freely.</p>' +
      '<button class="btn primary" data-act="duplicate">Use as a model (editable copy)</button>'
        : '<label class="field"><span>Name</span><input type="text" data-field="name" value="' + esc(l.name) + '"></label>') +
      (skinId === 'scania25_frame' ? '<h3>Panel colours</h3>' +
        '<label class="field"><span>Cluster backlight</span><select data-field="sc25:theme">' + options([['orange', 'Orange'], ['red', 'Red'], ['blue', 'Blue'], ['cyan', 'Cyan'], ['purple', 'Purple'], ['white', 'White']], (l.sc25 && l.sc25.theme) || 'orange') + '</select></label>' +
        '<div class="row"><label class="field grow"><span>Key legend</span><input type="color" data-field="sc25:print" value="' + ((l.sc25 && l.sc25.print) || '#e8ecf0') + '"></label>' +
        '<label class="field grow"><span>Panel</span><input type="color" data-field="sc25:bg" value="' + ((l.sc25 && l.sc25.bg) || '#0a0c10') + '"></label></div>' +
        '<button class="btn" data-act="sc25home">Cluster back to screen 1</button><button class="btn" data-act="sc25learn">' + (S.padLearn ? 'Press the controller button now...' : 'Learn a controller button') + '</button>' +
        '<p class="note">' + (S.dashAuto ? 'Sync: automatic. ' : '') + 'Learned controller button: ' + ((l.sc25 && l.sc25.padBtn !== undefined && l.sc25.padBtn !== '') ? l.sc25.padBtn : 'none') + '. Last button seen: ' + (S.lastPad === undefined ? 'none yet' : S.lastPad) + '.</p>' : '') +
      (skinId === 'sov_frame' ? '<label class="field"><span>Soviet background</span><select data-field="sovBg">' + options([
        ['white', 'Branca / Esmaltada'], ['military1', 'Military 1'], ['military2', 'Military 2'], ['sigabem', 'Siga Bem'], ['vivamexico', 'Viva México'],
      ], sovBgOf(l)) + '</select></label>' +
      '<p class="note">Empty plate behind the Soviet keys. Default is the clean white enamel plate; photoreal variants stay available.</p>' : '') +
      (hasSkin ? '<button class="btn" data-act="deco">Stickers: add, move, remove</button>' : '') +
      (hasStickers ? check('stickers', 'Show the stickers that come with this panel', l.stickers !== false) : '') +
      (hasSkin && !l.locked ? '<button class="btn" data-act="rebuild">Put every key back as in the art</button>' : '') +
      (l.game && !l.locked ? '<button class="btn" data-act="fill">Add all other functions as extra pages</button>' : '') +
      (l.locked ? '' : '<div class="row"><button class="btn grow" data-act="duplicate">Duplicate</button><button class="btn grow danger" data-act="delete">Delete panel</button></div>') + '</div>' +

      '<div class="group menu-general"><h3>Settings do App</h3><p class="note">' + esc(stateText) + '</p>' +
      '<div class="row"><input class="grow" type="text" id="pinInput" inputmode="numeric" maxlength="4" placeholder="PIN" value="' + esc(S.pin) + '" aria-label="PIN">' +
      '<button class="btn" data-act="pin">Connect</button></div>' +
      (window.HuntersApp ? '<button class="btn" data-act="changepc">Connect to another PC</button>' : '<button class="btn" data-act="fullscreen">Full screen</button>') +
      '<p class="note">Version ' + esc(window.TRUCKDECK_VERSION || 'unknown') + '</p></div>',
      (act, target) => {
        if (act === 'field') {
          if (target.dataset.field.indexOf('sc25:') === 0) { l.sc25 = l.sc25 || {}; l.sc25[target.dataset.field.slice(5)] = target.value; save(); renderPanel(); return; }
          if (target.dataset.field === 'sovBg') {
            l.sovBg = sovBgOf({ sovBg: target.value });
            skinMemo = { key: '', list: [] };
            save(); renderPanel(); return;
          }
          if (target.dataset.field === 'stickers') { l.stickers = target.checked; save(); renderPanel(); return; }
          if (GLOBAL_KEYS.includes(target.dataset.field)) {
            const f = target.dataset.field;
            const v = f === 'autoRotate' ? target.checked : target.value;
            setPref(f, v);
            // setPref only writes prefs; every layout keeps its own copy of these keys (made once at
            // load, see applyPrefs/ensurePrefs), so without this the new choice has no visible effect
            // until the app is fully reloaded.
            applyPrefs();
            if (f === 'autoRotate' || f === 'cabin' || f === 'brightness') renderAll(); else { updateStates(); renderPanel(); }   // readouts depend on unit and language: rebuild
            return;
          }
          l[target.dataset.field] = target.value || (target.dataset.field === 'name' ? 'Panel' : target.value);
          save();
          renderPanel();
        } else if (act === 'sc25home') {
          document.querySelectorAll('.k-sc25').forEach((n) => n._sc25 && n._sc25.go(0)); toast('Cluster set to screen 1.');
        } else if (act === 'sc25learn') {
          S.padLearn = !S.padLearn; closeSheet(); openMenu(); if (S.padLearn) toast('Press the controller button you want to use.');
        } else if (act === 'gallery') {
          closeSheet(); openGallery();
        } else if (act === 'deco') {
          closeSheet(); startDeco();
        } else if (act === 'use') {
          S.store.activeId = target.dataset.id; S.page = 0; save(); renderAll(); closeSheet(); panelAnim(0);
        } else if (act === 'new') {
          openPresets();
        } else if (act === 'keys') {
          openKeys();
        } else if (act === 'transfer') {
          openTransfer();
        } else if (act === 'rebuild') {
          if (!armed(target)) return;
          resetLayout(l);
          save(); renderAll(); closeSheet(); toast('Keys are back as in the art');
        } else if (act === 'fill') {
          const first = l.pages[0];
          const upright = autoSize() === 'phone';
          const extra = autoFillPages(placedFunctions(), l.game, first.skin ? (upright ? 4 : 8) : first.cols, first.skin ? (upright ? 6 : 4) : first.rows, 'rocker');
          if (!extra.length) { toast('Every function is already on this panel.'); return; }
          for (const pg of extra) l.pages.push(pg);
          save(); renderAll(); closeSheet();
          toast(extra.length + (extra.length === 1 ? ' page added' : ' pages added'));
        } else if (act === 'duplicate') {
          copyAsModel(l);
          S.page = 0;
          save(); renderAll(); openMenu();
        } else if (act === 'delete') {
          if (S.store.layouts.length === 1) { toast('This is the only panel. Create another one first.'); return; }
          if (!armed(target)) return;
          S.store.layouts.splice(S.store.layouts.indexOf(l), 1);
          S.store.activeId = S.store.layouts[0].id; S.page = 0;
          save(); renderAll(); openMenu();
        } else if (act === 'pin') {
          S.pin = $('#pinInput', sheet).value.trim();
          lsSet('truckdeck.pin', S.pin);
          connect().then(() => { openMenu(); });
        } else if (act === 'changepc') {
          // Android app only: back to its own connect screen
          window.HuntersApp.changePc();
        } else if (act === 'fullscreen') {
          toggleFullscreen();
          closeSheet();
        }
      }, 'left');
  }

  // ---- Panel gallery -------------------------------------------------------------------------
  // A full-screen carousel of the player's panels: the real art, big, one swipe apart.
  const galleryEl = document.createElement('div');
  galleryEl.id = 'gallery';
  galleryEl.hidden = true;
  document.body.appendChild(galleryEl);
  const closeGallery = () => { galleryEl.hidden = true; galleryEl.textContent = ''; };

  function openGallery() {
    const cut = autoSize() === 'phone' ? 'P' : 'T';
    const act = layout().id;
    const note = (x) => {
      const p = PRESETS.find((q) => q.id === x.preset);
      return x.locked && p ? p.note : (x.pages.length + (x.pages.length === 1 ? ' page' : ' pages') + ', editable');
    };
    const card = (x) => {
      const skin = x.pages[0].skin;
      const pv = skin && SKINS[skin] ? previewOf(skin, cut, x) : null;
      const ar = pv ? pv.ar : 1.4;
      return '<article class="gcard' + (x.id === act ? ' current' : '') + '" data-id="' + x.id + '">' +
        '<div class="gpic" style="aspect-ratio:' + ar + '">' + (pv ? '<img src="' + pv.src + '" alt="" draggable="false">' : '<span>' + esc(x.name) + '</span>') + '</div>' +
        '<h3>' + esc(x.name) + '</h3><p>' + esc(note(x)) + '</p>' +
        '<button class="btn ' + (x.id === act ? '' : 'primary') + '" data-g="use" data-id="' + x.id + '">' + (x.id === act ? 'In use' : 'Use this panel') + '</button></article>';
    };
    galleryEl.innerHTML = '<header><h2>Panels</h2><span class="gcount"></span><button class="btn small" data-g="close">Close</button></header>' +
      '<div class="gtrack">' + S.store.layouts.map(card).join('') +
      '<article class="gcard gadd"><div class="gpic plus">+</div><h3>Add a panel</h3><p>Another copy of any built-in panel, or an editable copy to make your own.</p>' +
      '<button class="btn primary" data-g="add">Add a panel</button></article></div>' +
      '<button class="gnav prev" data-g="prev" aria-label="Previous">‹</button><button class="gnav next" data-g="next" aria-label="Next">›</button>';
    galleryEl.hidden = false;
    const track = galleryEl.querySelector('.gtrack');
    const cur = track.querySelector('.current');
    if (cur) track.scrollLeft = cur.offsetLeft - (track.clientWidth - cur.offsetWidth) / 2;
    const count = () => {
      const cards = [].slice.call(track.children);
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      cards.forEach((c, i) => { if (Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid) < Math.abs(cards[best].offsetLeft + cards[best].offsetWidth / 2 - mid)) best = i; });
      const gc = galleryEl.querySelector('.gcount');
      if (gc) gc.textContent = (best + 1) + ' / ' + cards.length;
    };
    track.addEventListener('scroll', count, { passive: true });
    count();
  }
  galleryEl.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-g]');
    if (!b) return;
    const track = galleryEl.querySelector('.gtrack');
    const g = b.dataset.g;
    if (g === 'close') closeGallery();
    else if (g === 'prev' || g === 'next') track.scrollBy({ left: (g === 'next' ? 1 : -1) * track.clientWidth * 0.7, behavior: 'smooth' });
    else if (g === 'add') { closeGallery(); openPresets(); }
    else if (g === 'use') {
      S.store.activeId = b.dataset.id; S.page = 0; S.edit = false; save(); closeGallery(); renderAll(); panelAnim(0);
    }
  });

  // Click activation also covers keyboard/assistive input; pointerdown above only shields
  // these controls from the panel's generic button/edit gestures.
  panel.addEventListener('click', (ev) => {
    // Pointer interactions are handled on pointerdown for instant response; detail 0 is
    // the keyboard/assistive-technology click path.
    if (ev.detail !== 0) return;
    const colorOption = ev.target.closest('[data-sc25-theme]');
    const colorToggle = ev.target.closest('[data-sc25-color-toggle]');
    const palette = ev.target.closest('.k-sc25palette');
    if (colorOption) {
      ev.preventDefault(); ev.stopPropagation();
      chooseSc25Theme(colorOption.dataset.sc25Theme);
    } else if (colorToggle && palette) {
      ev.preventDefault(); ev.stopPropagation();
      const open = palette.classList.toggle('open');
      colorToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  });

  // ---- Stickers of your own ------------------------------------------------------------------
  // Pure decoration. Pick as many as you like from the catalogue, drag them anywhere on the panel,
  // size and turn them. They never catch a touch outside this mode, so a key under a sticker
  // still works. Positions are kept per panel and per cut (lying down / upright).
  const DECO_FONT = "Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Black', sans-serif";
  const DECO = [
    { id: 'humildade', name: 'Humildade', vb: [300, 110] },
    { id: 'abencoado', name: 'Abençoado', vb: [300, 110] },
    { id: 'fe', name: 'Fé', vb: [120, 170] },
    { id: 'gratidao', name: 'Gratidão', vb: [300, 150], own: true },
    { id: 'estrada', name: 'Estrada é vida', vb: [300, 120] },
    { id: 'caminhoneiro', name: 'Caminhoneiro a bordo', vb: [200, 200] },
    { id: 'trevo', name: 'Fé na estrada', vb: [170, 190] },
    { id: 'turbo', name: 'Turbo', vb: [200, 150] },
    { id: 'volante', name: 'Volante', vb: [160, 160] },
    { id: 'limite', name: '80 km/h', vb: [150, 150] },
    { id: 'lesma', name: 'Sem pressa', vb: [260, 140] },
    { id: 'estrela', name: 'Cinco estrelas', vb: [180, 180] },
    { id: 'br277', name: 'BR-277', vb: [150, 170] },
    { id: 'cwb', name: 'CWB', vb: [200, 200], own: true },
    { id: 'frog', name: 'Sapinho', vb: [200, 200], own: true },
  ];
  // worn print and a die-cut paper border: noise punches small holes in the ink
  function decoWrap(vb, inner) {
    stickerCount += 1;
    const id = 'dc' + stickerCount;
    return '<svg viewBox="-9 -9 ' + (vb[0] + 18) + ' ' + (vb[1] + 18) + '" aria-hidden="true"><defs><filter id="' + id + '" x="-6%" y="-6%" width="112%" height="112%">' +
      '<feMorphology in="SourceAlpha" operator="dilate" radius="5" result="d"/><feFlood flood-color="#efe8d2"/><feComposite in2="d" operator="in" result="paper"/>' +
      '<feMerge result="m"><feMergeNode in="paper"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="' + (stickerCount * 5 + 1) + '" result="n"/>' +
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.6 3.15" result="h"/>' +
      '<feComposite in="m" in2="h" operator="in"/></filter></defs><g filter="url(#' + id + ')">' + inner + '</g></svg>';
  }
  const dt = (x, y, size, fill, str, text, extra) => '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="' + DECO_FONT + '" font-size="' + size + '" fill="' + fill + '" stroke="' + str + '" stroke-width="' + (size / 7) + '" stroke-linejoin="round" paint-order="stroke" ' + (extra || '') + '>' + text + '</text>';
  const myStickers = () => (S.store.prefs && S.store.prefs.mine) || [];
  function decoSvg(art) {
    if (art.indexOf('img:') === 0) {
      const m = myStickers().find((x) => 'img:' + x.id === art);
      return m ? '<img src="' + m.url + '" alt="" draggable="false">' : '';
    }
    if (art === 'gratidao' || art === 'frog' || art === 'cwb') return stickerSvg(art);
    const d = DECO.find((x) => x.id === art);
    if (!d) return '';
    let g = '';
    if (art === 'humildade') {
      g = '<path d="M14 84c70-10 170-12 272-4l-3 14c-90-6-176-4-264 8z" fill="#1f8a3f"/>' +
        dt(150, 70, 64, '#f6c915', '#17110b', 'HUMILDADE', 'font-style="italic" textLength="268" lengthAdjust="spacingAndGlyphs" transform="rotate(-3 150 60)"') +
        '<path d="M16 20c-8 0-10 8-6 12m10-12c-8 0-10 8-6 12" stroke="#d93a2b" stroke-width="5" fill="none" stroke-linecap="round"/>';
    } else if (art === 'abencoado') {
      g = '<ellipse cx="238" cy="14" rx="36" ry="9" fill="none" stroke="#f6c915" stroke-width="6" transform="rotate(-8 238 14)"/>' +
        dt(150, 78, 62, '#ffffff', '#17110b', 'ABENÇOADO', 'font-style="italic" textLength="276" lengthAdjust="spacingAndGlyphs" transform="rotate(-4 150 60)"') +
        '<path d="M30 96c60-8 150-10 240-2" stroke="#17110b" stroke-width="5" fill="none" stroke-linecap="round"/>';
    } else if (art === 'fe') {
      g = '<path d="M50 6h20v40h32v20H70v96H50V66H18V46h32z" fill="#fff" stroke="#17110b" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M60 18v132M26 56h68" stroke="#d6cbb0" stroke-width="3" fill="none"/>' + dt(60, 150, 22, '#17110b', '#fff', 'FÉ', 'font-style="italic"');
    } else if (art === 'estrada') {
      g = '<rect x="4" y="6" width="292" height="108" rx="16" fill="#1b1d20" stroke="#f6c915" stroke-width="5"/>' +
        '<path d="M120 112L144 40h12l24 72z" fill="#44484d"/><path d="M150 108v-14M150 84v-12M150 62v-8" stroke="#f6c915" stroke-width="4"/>' +
        dt(150, 30, 26, '#f6c915', '#1b1d20', 'ESTRADA É VIDA', 'textLength="250" lengthAdjust="spacingAndGlyphs"');
    } else if (art === 'caminhoneiro') {
      g = '<rect x="46" y="14" width="108" height="108" rx="10" fill="#f6c915" stroke="#17110b" stroke-width="6" transform="rotate(45 100 68)"/>' +
        '<path d="M58 78V58h42v20zM100 62h20l10 10v6h-30z" fill="#17110b"/><circle cx="72" cy="82" r="7" fill="#17110b"/><circle cx="118" cy="82" r="7" fill="#17110b"/>' +
        '<rect x="10" y="150" width="180" height="34" rx="6" fill="#17110b"/>' + dt(100, 175, 20, '#f6c915', '#17110b', 'CAMINHONEIRO A BORDO', 'textLength="164" lengthAdjust="spacingAndGlyphs"');
    } else if (art === 'trevo') {
      const leaf = '<path d="M0 0C-34-8-40-48-14-52C-3-54 0-44 0-38C0-44 3-54 14-52C40-48 34-8 0 0z" fill="#35b34a" stroke="#14572a" stroke-width="4" stroke-linejoin="round"/><path d="M0-4V-34" stroke="#7fe08c" stroke-width="3"/>';
      g = '<g transform="translate(85 80)">' + [45, 135, 225, 315].map((a) => '<g transform="rotate(' + a + ')">' + leaf + '</g>').join('') + '</g>' +
        '<path d="M85 90c10 22 20 36 34 44" stroke="#14572a" stroke-width="6" fill="none" stroke-linecap="round"/>' +
        '<rect x="6" y="148" width="158" height="34" rx="6" fill="#fff" stroke="#17110b" stroke-width="4"/>' + dt(85, 174, 22, '#17110b', '#fff', 'FÉ NA ESTRADA', 'textLength="144" lengthAdjust="spacingAndGlyphs"');
    } else if (art === 'turbo') {
      g = '<path d="M100 4c10 26 40 38 40 74 0 30-20 50-40 54-20-4-40-24-40-54 0-20 12-30 20-44 2 12 8 18 14 20-4-26 0-38 6-50z" fill="#f26a1b" stroke="#17110b" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M100 54c6 14 22 22 22 42 0 16-10 26-22 28-12-2-22-12-22-28 0-12 8-18 12-26 2 8 6 10 10 10z" fill="#ffd23a"/>' +
        dt(100, 146, 36, '#ffffff', '#17110b', 'TURBO', 'font-style="italic"');
    } else if (art === 'volante') {
      g = '<circle cx="80" cy="80" r="66" fill="none" stroke="#17110b" stroke-width="18"/><circle cx="80" cy="80" r="66" fill="none" stroke="#9aa0a6" stroke-width="3"/>' +
        '<path d="M16 86h46l18 16 18-16h46" stroke="#17110b" stroke-width="12" fill="none" stroke-linejoin="round"/><path d="M80 102v50" stroke="#17110b" stroke-width="12"/>' +
        '<circle cx="80" cy="84" r="20" fill="#f6c915" stroke="#17110b" stroke-width="5"/><path d="M80 72l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#17110b"/>';
    } else if (art === 'limite') {
      g = '<circle cx="75" cy="75" r="70" fill="#fff" stroke="#d3261c" stroke-width="14"/>' + dt(75, 96, 60, '#17110b', '#fff', '80', '');
    } else if (art === 'lesma') {
      g = '<path d="M40 120c-14 0-20-10-14-20 6-8 20-4 30-6h150c18 0 20 20 4 24-8 2-60 2-170 2z" fill="#a9d36a" stroke="#17110b" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M34 98c-2-18 0-32-6-42M52 96c2-16 8-28 16-36" stroke="#17110b" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="28" cy="52" r="6" fill="#fff" stroke="#17110b" stroke-width="3"/><circle cx="70" cy="56" r="6" fill="#fff" stroke="#17110b" stroke-width="3"/>' +
        '<circle cx="150" cy="70" r="44" fill="#d9903a" stroke="#17110b" stroke-width="5"/><path d="M150 70m0 0c0-8 8-10 12-6s2 14-8 16-20-6-18-20 14-24 30-20 28 20 20 36" fill="none" stroke="#7a4513" stroke-width="5" stroke-linecap="round"/>' +
        dt(130, 20, 26, '#ffffff', '#17110b', 'SEM PRESSA', 'transform="rotate(-3 130 20)" textLength="170" lengthAdjust="spacingAndGlyphs"');
    } else if (art === 'estrela') {
      g = '<path d="M90 8l24 54 58 6-44 38 14 58-52-30-52 30 14-58L8 68l58-6z" fill="#f6c915" stroke="#17110b" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M90 28l14 34 36 4" stroke="#fff3a8" stroke-width="4" fill="none" stroke-linecap="round"/>' + dt(90, 112, 24, '#17110b', '#f6c915', '5 ★', '');
    } else if (art === 'br277') {
      g = '<path d="M75 4c28 10 58 12 68 12v78c0 36-34 56-68 72C41 150 7 130 7 94V16c10 0 40-2 68-12z" fill="#fff" stroke="#17110b" stroke-width="6" stroke-linejoin="round"/>' +
        dt(75, 62, 48, '#17110b', '#fff', 'BR', 'textLength="66" lengthAdjust="spacingAndGlyphs"') + dt(75, 118, 50, '#17110b', '#fff', '277', 'textLength="86" lengthAdjust="spacingAndGlyphs"');
    }
    return decoWrap(d.vb, g);
  }
  const decoCut = () => (page().size === 'phone' ? 'P' : 'T');
  function decoList() {
    const p = page();
    if (!p.skin) return [];
    p.deco = p.deco || { T: [], P: [] };
    return p.deco[decoCut()] || (p.deco[decoCut()] = []);
  }
  function decoNodes() {
    const p = page();
    if (!p.skin || !p.deco) return;
    for (const d of (p.deco[decoCut()] || [])) {
      const n = document.createElement('div');
      n.className = 'k-deco' + (S.deco && S.deco.sel === d.id ? ' sel' : '');
      n.dataset.id = d.id;
      n.style.cssText = 'left:' + d.x + '%;top:' + d.y + '%;width:' + d.w + '%;transform:translate(-50%,-50%) rotate(' + d.rot + 'deg)';
      n.innerHTML = decoSvg(d.art);
      panel.appendChild(n);
    }
  }
  const decoBar = document.createElement('div');
  decoBar.id = 'decobar';
  decoBar.hidden = true;
  decoBar.innerHTML = '<button data-d="add" class="btn primary">Add sticker</button><button data-d="smaller" class="btn" aria-label="Smaller">\u2212</button><button data-d="bigger" class="btn" aria-label="Larger">+</button>' +
    '<button data-d="left" class="btn" aria-label="Turn left">\u21b6</button><button data-d="right" class="btn" aria-label="Turn right">\u21b7</button><button data-d="del" class="btn danger">Remove</button><button data-d="done" class="btn primary">Done</button>';
  document.body.appendChild(decoBar);

  function startDeco() {
    const i = layout().pages.findIndex((p) => p.skin);
    if (i < 0) { toast('Stickers go on the painted panel.'); return; }
    S.page = i; S.edit = false; S.deco = { sel: null };
    decoBar.hidden = false;
    renderAll();
    toast('Add a sticker, then drag it where you want it.');
  }
  function endDeco() {
    S.deco = null; decoBar.hidden = true; save(); renderAll();
  }
  function shrinkImage(file, done) {
    const fr = new FileReader();
    fr.onerror = () => done(null);
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => done(null);
      im.onload = () => {
        let max = 360, url = '';
        for (let i = 0; i < 4; i += 1) {
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          url = c.toDataURL('image/png');
          if (url.length < 160000) break;
          max = Math.round(max * 0.7);
        }
        done(url.length < 220000 ? url : null);
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function openDecoCatalog() {
    const mine = myStickers();
    openSheet('Add a sticker',
      '<label class="btn primary mine-add">My sticker from this device<input type="file" accept="image/*" data-mine hidden></label>' +
      '<p class="note">Pick any picture from the gallery (a PNG with a clear background looks best). It stays on this device and your PC, nothing is shared.</p>' +
      (mine.length ? '<div class="stickergrid">' + mine.map((m) => '<div class="stkwrap"><button class="stkpick" data-act="pick" data-id="img:' + m.id + '"><span class="stkart"><img src="' + m.url + '" alt=""></span><small>Mine</small></button>' +
        '<button class="stkdel" data-act="delmine" data-id="' + m.id + '" aria-label="Delete this sticker">\u00d7</button></div>').join('') + '</div>' : '') +
      '<div class="stickergrid">' + DECO.map((d) =>
      '<button class="stkpick" data-act="pick" data-id="' + d.id + '"><span class="stkart">' + decoSvg(d.id) + '</span><small>' + esc(d.name) + '</small></button>').join('') + '</div>',
      (act, t) => {
        if (act === 'delmine') {
          const pr = S.store.prefs;
          pr.mine = myStickers().filter((x) => x.id !== t.dataset.id);
          for (const l of S.store.layouts) for (const pg of l.pages) if (pg.deco) for (const c of ['T', 'P']) pg.deco[c] = (pg.deco[c] || []).filter((d) => d.art !== 'img:' + t.dataset.id);
          save(); renderPanel(); openDecoCatalog();
          return;
        }
        if (act !== 'pick') return;
        const list = decoList();
        const jitter = list.length * 4;
        const item = { id: uid(), art: t.dataset.id, x: 50 + (jitter % 24) - 8, y: 50 + (jitter % 16) - 4, w: decoCut() === 'P' ? 30 : 15, rot: 0 };
        list.push(item);
        S.deco.sel = item.id;
        save(); closeSheet(); renderPanel();
      }, 'right');
  }
  sheet.addEventListener('change', (ev) => {
    const inp = ev.target;
    if (!S.deco || !inp.matches || !inp.matches('input[data-mine]') || !inp.files || !inp.files[0]) return;
    shrinkImage(inp.files[0], (url) => {
      if (!url) { toast('That picture could not be used.'); return; }
      const pr = S.store.prefs;
      pr.mine = myStickers().concat([{ id: uid(), url }]).slice(-12);
      save(); openDecoCatalog();
      toast('Added. Tap it to place it on the panel.');
    });
  });
  decoBar.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-d]');
    if (!b || !S.deco) return;
    const list = decoList();
    const cur = list.find((x) => x.id === S.deco.sel);
    const a = b.dataset.d;
    if (a === 'add') { openDecoCatalog(); return; }
    if (a === 'done') { endDeco(); return; }
    if (!cur) { toast('Tap a sticker first.'); return; }
    if (a === 'smaller') cur.w = Math.max(4, cur.w * 0.88);
    else if (a === 'bigger') cur.w = Math.min(70, cur.w * 1.14);
    else if (a === 'left') cur.rot -= 10;
    else if (a === 'right') cur.rot += 10;
    else if (a === 'del') { list.splice(list.indexOf(cur), 1); S.deco.sel = null; }
    save(); renderPanel();
  });
  // drag a sticker across the panel (only while arranging)
  panel.addEventListener('pointerdown', (ev) => {
    if (!S.deco) return;
    const el = ev.target.closest('.k-deco');
    if (!el) { if (S.deco.sel) { S.deco.sel = null; panel.querySelectorAll('.k-deco.sel').forEach((n) => n.classList.remove('sel')); } return; }
    const d = decoList().find((x) => x.id === el.dataset.id);
    if (!d) return;
    S.deco.sel = d.id;
    panel.querySelectorAll('.k-deco.sel').forEach((n) => n.classList.remove('sel'));
    el.classList.add('sel');
    const r = panel.getBoundingClientRect();
    const sx = ev.clientX, sy = ev.clientY, ox = d.x, oy = d.y;
    try { el.setPointerCapture(ev.pointerId); } catch (e) { /* old browsers */ }
    const mv = (e) => {
      d.x = clamp(ox + ((e.clientX - sx) / r.width) * 100, 0, 100);
      d.y = clamp(oy + ((e.clientY - sy) / r.height) * 100, 0, 100);
      el.style.left = d.x + '%'; el.style.top = d.y + '%';
    };
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); save(); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });

  // ---- Sheet: add a panel ---------------------------------------------------------------------
  // What is remembered on this device between panels: text language and gear display.
  function loadSetup() {
    let saved = null;
    try { saved = JSON.parse(lsGet('truckdeck.setup')); } catch (e) { saved = null; }
    const s = Object.assign({}, DEFAULT_SETUP, saved || {});
    s.gearCrawlers = gearboxKey(s.gearCrawlers);
    // first run: Portuguese on a Portuguese-language device, English otherwise
    if (!['pt', 'en', 'de', 'es', 'fr'].includes(s.lang)) {
      const dl = (navigator.language || '').slice(0, 2).toLowerCase();
      s.lang = ['pt', 'de', 'es', 'fr'].includes(dl) ? dl : 'en';
    }
    return s;
  }

  const check = (field, label, on) =>
    '<label class="check"><input type="checkbox" data-field="' + field + '"' + (on ? ' checked' : '') + '><span>' + esc(label) + '</span></label>';

  // small picture of an art panel for the lists
  const thumb = (skinId) => (skinId && SKINS[skinId] ? '<img class="thumb" src="' + previewOf(skinId, 'T').src + '" alt="" loading="lazy">' : '');

  function openPresets() {
    openSheet('Add a panel',
      '<p class="note">Each panel turns with the screen and every key painted on it works. What a key does can be changed in Edit.</p>' +
      '<div class="list">' + PRESETS.map((p) =>
        '<button class="item" data-act="preset" data-id="' + p.id + '">' + thumb(p.id) + '<span class="name">' + esc(p.name) + '<small>' + esc(p.note) + '</small></span></button>').join('') + '</div>',
      (act, target) => {
        if (act !== 'preset') return;
        const fresh = createLayoutFromPreset(target.dataset.id, autoSize(), loadSetup());
        // a second copy of the same panel gets a number so the list stays readable
        let n = 2;
        const base = fresh.name;
        while (S.store.layouts.some((x) => x.name === fresh.name)) { fresh.name = base + ' ' + n; n += 1; }
        // key bindings already set up on the current panel come along
        fresh.binds = Object.assign({}, layout().binds);
        S.store.layouts.push(fresh);
        S.store.activeId = fresh.id; S.page = 0;
        save(); renderAll(); closeSheet();
      });
  }

  function openTransfer() {
    openSheet('Export / import',
      '<p class="note">This text is the whole panel. Copy it to back it up or share it; paste one here to add it as a new panel.</p>' +
      '<textarea id="transferText" rows="10" spellcheck="false">' + esc(JSON.stringify(layout())) + '</textarea>' +
      '<div class="row"><button class="btn grow" data-act="copy">Copy</button><button class="btn grow primary" data-act="import">Import as new panel</button></div>',
      (act) => {
        const box = $('#transferText', sheet);
        if (act === 'copy') {
          const fallback = () => { box.select(); toast('Text selected. Use your device’s Copy.'); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(box.value).then(() => toast('Copied'), fallback);
          else fallback();
        } else if (act === 'import') {
          let data;
          try { data = JSON.parse(box.value); } catch (e) { toast('That text is not a button box panel.'); return; }
          if (!validStore({ layouts: [data] })) { toast('That text is not a button box panel.'); return; }
          data.id = uid();
          data.binds = data.binds || {};
          data.name = (data.name || 'Panel') + ' (imported)';
          S.store.layouts.push(data); S.store.activeId = data.id; S.page = 0;
          save(); renderAll(); closeSheet(); toast('Panel imported');
        }
      });
  }

  // ---- Header ------------------------------------------------------------------------------
  tabs.addEventListener('click', (ev) => {
    const t = ev.target.closest('.tab');
    if (!t) return;
    S.page = Number(t.dataset.page);
    S.sel = null;
    renderTabs(); renderPanel();
  });
  $('#btnMenu').addEventListener('click', openMenu);

  // Full screen: a quiet key beside the connection pill. Hidden where the browser has no
  // fullscreen API at all (iPhone Safari), instead of offering a button that does nothing.
  const btnFull = $('#btnFull');
  const canFullscreen = !!document.documentElement.requestFullscreen;
  // inside the Android app the window is already immersive, so the key would do nothing useful
  btnFull.hidden = !canFullscreen || !!window.HuntersApp;
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (canFullscreen) document.documentElement.requestFullscreen().catch(() => toast('This browser does not allow full screen here.'));
    else toast('This browser does not allow full screen here.');
  }
  btnFull.addEventListener('click', toggleFullscreen);
  // In full screen the top bar goes away and the panel takes the whole screen; a small, dim button in the
  // top right corner (over the frame's margin, clear of every key) leaves full screen.
  const fsExit = document.createElement('button');
  fsExit.id = 'fsExit';
  fsExit.hidden = true;
  fsExit.setAttribute('aria-label', 'Exit full screen');
  fsExit.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg><i class="fs-led"></i>';
  fsExit.addEventListener('click', toggleFullscreen);
  $('#app').appendChild(fsExit);
  // floating fullscreen button (bottom-right corner, always visible outside fullscreen)
  const btnCornerFs = document.createElement('button');
  btnCornerFs.id = 'btnCornerFs';
  btnCornerFs.setAttribute('aria-label', 'Full screen');
  btnCornerFs.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  btnCornerFs.hidden = !canFullscreen || !!window.HuntersApp;
  btnCornerFs.addEventListener('click', toggleFullscreen);
  $('#app').appendChild(btnCornerFs);
  document.addEventListener('fullscreenchange', () => {
    const fs = !!document.fullscreenElement;
    btnFull.classList.toggle('on', fs);
    $('#app').classList.toggle('fs', fs);
    fsExit.hidden = !fs;
    btnCornerFs.hidden = fs || !canFullscreen || !!window.HuntersApp;
    // sync the bridge LED inside fsExit
    const led = fsExit.querySelector('.fs-led');
    if (led) led.dataset.state = S.bridge || 'demo';
    renderPanel();
  });
  $('#btnPage').addEventListener('click', openPage);
  $('#btnEdit').addEventListener('click', () => {
    if (!S.edit && layout().locked) {
      // built-in panels stay as shipped: offer the editable copy instead of opening the editor
      openSheet('Built-in panel', '<p class="note">This panel is locked so it always works as shipped. To change keys or add pages, use it as a model: you get your own copy, and the original stays.</p>' +
        '<button class="btn primary" data-act="model">Use as a model and edit my copy</button>', (act) => {
        if (act !== 'model') return;
        copyAsModel(layout());
        S.page = 0; S.obc = false; S.edit = true;
        save(); closeSheet(); renderAll();
        toast('This copy is yours. Tap a key to change what it does.');
      }, 'right');
      return;
    }
    S.obc = false;
    S.edit = !S.edit;
    S.sel = null;
    // Entering edit mode with a finger still on a held key would leave it stuck down.
    S.pressed.clear();
    renderAll();
    if (S.edit) toast(page().skin ? 'Tap a key to change what it does.' : 'Tap a free cell to add. Drag to move. Drag the corner to resize.');
  });
  statusEl.addEventListener('click', openMenu);

  // Refit on rotation / resize; ResizeObserver also catches the address bar hiding on phones.
  const onResize = () => { if (syncOrientation()) { save(); renderAll(); } else renderPanel(); };
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
  else window.addEventListener('resize', onResize);

  // Flasher for hazard and indicator lamps when no game is driving them (demo, no telemetry)
  setInterval(() => { S.phase = !S.phase; if (!(S.tel && S.tel.sdk)) updateStates(); }, 420);

  // Real-time clock readouts tick without telemetry
  setInterval(updateStates, 5000);

  // Keep the tablet awake while the panel is open. Only granted on secure origins, so over
  // plain LAN HTTP this quietly does nothing and the device's own screen timeout applies.
  document.addEventListener('pointerdown', function keepAwake() {
    document.removeEventListener('pointerdown', keepAwake);
    if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').catch(() => {});
  });

  // ---- Boot --------------------------------------------------------------------------------
  function boot() {
    // PIN arrives in the address printed by the bridge; keep it, then clean the address bar
    // so it does not end up in screenshots.
    let urlPin = null;
    try { urlPin = new URLSearchParams(location.search).get('pin'); } catch (e) { /* ignore */ }
    if (urlPin) {
      lsSet('truckdeck.pin', urlPin);
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
    }
    S.pin = urlPin || lsGet('truckdeck.pin') || '';

    let stored = null;
    try { stored = JSON.parse(lsGet('truckdeck.store')); } catch (e) { stored = null; }
    if (validStore(stored)) { S.store = stored; lockBuiltIns(); }
    else {
      // a new installation has all ten panels, one tap apart
      const all = defaultDashboards(loadSetup());
      S.store = { layouts: all, activeId: firstPanel(all).id };
    }
    upgradeStore();
    ensureShippedPanels();
    ensurePrefs();
    // The standalone development preview is for the cluster currently being tuned.
    // Keep the installed app's saved panel selection untouched.
    if (/\/dist\/preview\.html$/i.test(location.pathname.replace(/\\/g, '/'))) {
      const srPreview = S.store.layouts.find((l) => l.preset === 'scania_frame');
      if (srPreview) { S.store.activeId = srPreview.id; S.page = 0; }
    }
    preferAtomicModern();
    lsSet('truckdeck.store', JSON.stringify(S.store));
    renderAll();
    connect();
  }

  boot();

  // Opening animation: plays once per load, then gets out of the way. Inside the Android app
  // the shell has already played it before loading this page, so it is skipped there.
  const bootEl = $('#boot');
  if (bootEl) {
    if (window.HuntersApp) bootEl.remove();
    else {
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => bootEl.classList.add('done'), reduced ? 500 : 1900);
      setTimeout(() => bootEl.remove(), reduced ? 800 : 2400);
    }
  }
})();
