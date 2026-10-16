/* Desktruck Atomic Layout Editor. This utility is intentionally isolated from app.js. */
(function () {
  'use strict';

  const STORAGE_KEY = 'desktruck.atomic-layout.v1';
  const OFFICIAL_MODERN = {
    landscape: { name: 'bg-landscape.jpg', src: 'skins/modern/bg-landscape.jpg', width: 2752, height: 1536 },
    portrait: { name: 'bg-portrait.jpg', src: 'skins/modern/bg-portrait.jpg', width: 1152, height: 1728 }
  };
  const SOV_BG_VARIANTS = ['military1', 'military2', 'sigabem', 'vivamexico'];
  const SOV_BG_LABELS = {
    military1: 'Military 1',
    military2: 'Military 2',
    sigabem: 'Siga Bem',
    vivamexico: 'Viva México'
  };
  function officialOf(mode) {
    if (state.skin === 'sov_frame') {
      const variant = SOV_BG_VARIANTS.includes(state.sovBg) ? state.sovBg : 'military1';
      const name = 'bg-' + variant + '-' + mode + '.jpg';
      return mode === 'landscape'
        ? { name: name, src: 'skins/sov/bg/' + name, width: 2752, height: 1536 }
        : { name: name, src: 'skins/sov/bg/' + name, width: 1536, height: 2752 };
    }
    return OFFICIAL_MODERN[mode];
  }
  const ASSETS_MODERN = {
    'btn-rocker-v.png': { label: 'Rocker V', defaultSize: [5.5, 13] },
    'btn-rocker-h.png': { label: 'Rocker H', defaultSize: [13, 5.5] },
    'btn-square.png': { label: 'Square', defaultSize: [8, 8] },
    'btn-3x1-metal.png': { label: 'Metal 3 × 1', defaultSize: [22, 8] },
    'engine_cir.png': { label: 'Motor circular', defaultSize: [8, 8] },
    'engine_cr_vt.png': { label: 'Motor cromado VT', defaultSize: [8, 8] },
    'engine_cromo.png': { label: 'Motor cromado', defaultSize: [8, 8] },
    'engine_old.png': { label: 'Motor clássico', defaultSize: [8, 8] },
    'engine_red.png': { label: 'Motor vermelho', defaultSize: [8, 8] },
    'hazard_black.png': { label: 'Alerta preto', defaultSize: [8, 8] },
    'hazard_sq_blk.png': { label: 'Alerta quadrado', defaultSize: [8, 8] },
    'parking.png': { label: 'Estacionamento', defaultSize: [8, 8] }
  };
  const ASSETS_SOV = {
    'sov_key.png': { label: 'Key', defaultSize: [8, 10] },
    'sov_sq.png': { label: 'Square', defaultSize: [8, 8] },
    'sov_push.png': { label: 'Push', defaultSize: [8, 8] },
    'sov_tog_up.png': { label: 'Toggle up', defaultSize: [6, 12] },
    'sov_tog_mid.png': { label: 'Toggle mid', defaultSize: [6, 12] },
    'sov_tog_down.png': { label: 'Toggle down', defaultSize: [6, 12] },
    'sov_lamp_red_off.png': { label: 'Lamp red off', defaultSize: [7, 7] },
    'sov_lamp_red_on.png': { label: 'Lamp red on', defaultSize: [7, 7] },
    'sov_lamp_green_off.png': { label: 'Lamp green off', defaultSize: [7, 7] },
    'sov_lamp_green_on.png': { label: 'Lamp green on', defaultSize: [7, 7] },
    'sov_lamp_blue_off.png': { label: 'Lamp blue off', defaultSize: [7, 7] },
    'sov_lamp_blue_on.png': { label: 'Lamp blue on', defaultSize: [7, 7] },
    'sov_lamp_amber_off.png': { label: 'Lamp amber off', defaultSize: [7, 7] },
    'sov_lamp_amber_on.png': { label: 'Lamp amber on', defaultSize: [7, 7] },
    'sov_dial_speed.png': { label: 'Dial speed', defaultSize: [18, 18] },
    'sov_dial_rpm.png': { label: 'Dial rpm', defaultSize: [18, 18] },
    'sov_dial_fuel.png': { label: 'Dial fuel', defaultSize: [12, 12] },
    'sov_dial_air.png': { label: 'Dial air', defaultSize: [12, 12] }
  };
  // Visual packages for the toolbox. The palette shows ONE package at a time (cascade /
  // exclusive select). Switch the package dropdown to pull pieces from another pack.
  const PACKAGES = [
    { id: 'modern', label: 'Pacote Moderno', skin: 'eu_frame', assets: ASSETS_MODERN },
    { id: 'soviet', label: 'Pacote Soviético', skin: 'sov_frame', assets: ASSETS_SOV }
  ];
  // Lamps are passive telemetry telltales — never vehicle command keys. Catalog filtered by
  // lamp colour (red/green/blue/amber) from the asset filename.
  const LAMP_TELEMETRY = {
    red: [
      { id: 'ind_speed_alert', name: 'Alerta de Velocidade Excedida', tel: 'speedWarn' },
      { id: 'ind_air_critical', name: 'Pressão de Ar Crítica', tel: 'airWarn' },
      { id: 'parking_brake', name: 'Freio de Mão Ativado', tel: 'park' },
      { id: 'ind_engine_overheat', name: 'Superaquecimento do Motor', tel: 'waterWarn' }
    ],
    green: [
      { id: 'blinker_left', name: 'Seta / Pisca Esquerda', tel: 'blinkL' },
      { id: 'blinker_right', name: 'Seta / Pisca Direita', tel: 'blinkR' },
      { id: 'lights', name: 'Luz de Presença / Farol Baixo', tel: 'lightsOn' },
      { id: 'engine', name: 'Status de Motor Ligado', tel: 'engine' }
    ],
    blue: [
      { id: 'high_beam', name: 'Farol Alto (High beam)', tel: 'high' }
    ],
    amber: [
      { id: 'ind_fuel_reserve', name: 'Reserva de Combustível', tel: 'fuelWarn' },
      { id: 'retarder_auto', name: 'Retardador / Freio Motor Ativo', tel: 'retarderOn' },
      { id: 'diff_lock', name: 'Bloqueio de Diferencial', tel: 'diff' }
    ]
  };
  const DASHBOARDS = {
    'dash-obd': { label: 'Tela OBD', defaultSize: [38, 15] },
    'dash-speedometer': { label: 'Velocímetro', defaultSize: [22, 15] }
  };
  // Anchor presets for the pictogram box (width/height/offsetX/offsetY, % of the button's own
  // rect) -- replaces hand-tuned X/Y for the common cases; opacity is preserved from whatever the
  // button already had, see applyPictogramPreset().
  const PICTOGRAM_PRESETS = {
    center: { width: 32, height: 32, offsetX: 34, offsetY: 34 },
    top: { width: 32, height: 28, offsetX: 34, offsetY: 6 },
    bottom: { width: 32, height: 28, offsetX: 34, offsetY: 58 },
    fill: { width: 90, height: 90, offsetX: 5, offsetY: 5 }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const round = (value, places = 3) => Number(Number(value).toFixed(places));
  const uid = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 7);
  function uniqueElementId(base) {
    const existing = new Set(allElements().map(({ item }) => item.id));
    if (!existing.has(base)) return base;
    let n = 2;
    while (existing.has(base + '-' + n)) n++;
    return base + '-' + n;
  }
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  let orientation = 'landscape';
  let selection = [];
  let copiedSize = null;
  let clipboard = null;
  let clipboardPasteCount = 0;
  let dragState = null;
  let runtimeBackgrounds = {};
  let customAssets = [];
  let state = initialState();
  let needsSeedPush = false;
  let historyStack = [];
  let redoStack = [];
  const HISTORY_LIMIT = 50;
  // Editor-only tool state (A–E editMode symbols): not persisted in atomic-layout.json.
  let buttonsLocked = false;
  // Exclusive palette package (cascade). Defaults to the package that matches state.skin.
  let activePackageId = 'modern';

  function isLampAsset(asset) {
    return /(?:^|[_-])lamp[_-]|sov_lamp_/i.test(String(asset || ''));
  }
  function lampColorOf(asset) {
    const name = String(asset || '').toLowerCase();
    if (name.includes('red')) return 'red';
    if (name.includes('green')) return 'green';
    if (name.includes('blue')) return 'blue';
    if (name.includes('amber') || name.includes('yellow')) return 'amber';
    return 'red';
  }
  function lampIndicatorsFor(asset) {
    return LAMP_TELEMETRY[lampColorOf(asset)] || LAMP_TELEMETRY.red;
  }
  function packageIdForSkin(skin) {
    return skin === 'sov_frame' ? 'soviet' : 'modern';
  }
  function normalizeElementColor(raw) {
    if (raw == null || raw === '') return undefined;
    const s = String(raw).trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(s)) return undefined;
    if (s.toLowerCase() === '#ffffff') return undefined;
    return s.toLowerCase();
  }

  function hasSlots(asset) { return asset === 'btn-3x1-metal.png'; }
  function normalizeSlots(slots) {
    const arr = Array.isArray(slots) ? slots : [];
    return [0, 1, 2].map((i) => String(arr[i] || ''));
  }
  function getAssetDef(key) {
    if (ASSETS_MODERN[key]) return ASSETS_MODERN[key];
    if (ASSETS_SOV[key]) return ASSETS_SOV[key];
    return customAssets.find((asset) => asset.id === key) || null;
  }
  function assetImageSrc(key) {
    if (ASSETS_MODERN[key]) return 'skins/modern/' + key;
    if (ASSETS_SOV[key]) return 'skins/sov/btn/' + key;
    const custom = customAssets.find((asset) => asset.id === key);
    return custom ? custom.src : '';
  }

  // Each skin owns its own buttons/zones so flipping the editor's skin tab (setSkin below)
  // can never make one skin's board overwrite or hide the other's -- that shared-board +
  // global board.skin tag was the root cause of the 2026-10-16 incident (app.js's
  // atomicApplies() compares pg.skin to this one global flag).
  function freshBoard() {
    return {
      orientations: {
        landscape: { buttons: [], zones: defaultZones('landscape') },
        portrait: { buttons: [], zones: defaultZones('portrait') }
      }
    };
  }
  function initialState() {
    return {
      schema: 'desktruck.atomic-layout/v1',
      skin: 'eu_frame',
      sovBg: 'military1',
      gridStep: 1,
      snap: true,
      guides: true,
      boards: {
        eu_frame: freshBoard(),
        sov_frame: freshBoard()
      }
    };
  }

  function defaultZones(mode) {
    if (mode === 'portrait') {
      return [
        makeZone('dash-obd', 'dash-obd-1', 18, 8, 64, 15),
        makeZone('dash-speedometer', 'dash-speedometer-1', 18, 27, 64, 12)
      ];
    }
    return [
      makeZone('dash-obd', 'dash-obd-1', 29, 8, 42, 15),
      makeZone('dash-speedometer', 'dash-speedometer-1', 75, 8, 20, 15)
    ];
  }

  function makeZone(type, id, x, y, width, height) {
    return { id, type, label: DASHBOARDS[type].label, x, y, width, height, zIndex: 1 };
  }

  // ---- Server persistence --------------------------------------------------------------
  // The Editor is the project's one source of truth for a Modern-panel layout: whatever is
  // mapped here has to reach every device, not just the browser/profile it was drawn in. The
  // board therefore lives in data/atomic-layout.json on the PC bridge; localStorage is kept
  // only as an instant local cache and an offline fallback (see bridge/server.js's
  // GET/PUT /api/atomic-layout).
  function resolvePin() {
    try {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get('pin');
      if (fromQuery) { localStorage.setItem('truckdeck.pin', fromQuery); return fromQuery; }
    } catch (error) { /* ignore */ }
    try { return localStorage.getItem('truckdeck.pin') || ''; } catch (error) { return ''; }
  }

  // Boards-aware: v2 payloads nest buttons under boards.eu_frame / boards.sov_frame.
  // Legacy flat payloads (top-level orientations, no boards) still count as having buttons
  // so a stale localStorage cache can seed an empty server without wiping a good board.
  function hasAnyButtons(payload) {
    if (!payload) return false;
    const boards = payload.boards
      ? [payload.boards.eu_frame, payload.boards.sov_frame]
      : [payload];
    return boards.some((board) => {
      if (!board || !board.orientations) return false;
      return ['landscape', 'portrait'].some((mode) => {
        const o = board.orientations[mode];
        return o && Array.isArray(o.buttons) && o.buttons.length > 0;
      });
    });
  }

  function loadLocalPayload() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { return null; }
  }

  async function loadServerPayload() {
    try {
      const res = await fetch('/api/atomic-layout', { headers: { 'X-Pin': resolvePin() } });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) { return null; } // bridge offline: the caller falls back to localStorage
  }

  function applyPayload(saved) {
    const fresh = initialState();
    if (!saved || saved.schema !== fresh.schema) return fresh;
    fresh.skin = saved.skin === 'sov_frame' ? 'sov_frame' : 'eu_frame';
    fresh.sovBg = SOV_BG_VARIANTS.includes(saved.sovBg) ? saved.sovBg : 'military1';
    customAssets = Array.isArray(saved.customAssets)
      ? saved.customAssets.filter((item) => item && typeof item.id === 'string' && typeof item.src === 'string').map((item) => ({
        id: item.id,
        label: String(item.label || 'Personalizado'),
        src: item.src,
        defaultSize: Array.isArray(item.defaultSize) && item.defaultSize.length === 2 ? item.defaultSize : [8, 8]
      }))
      : [];
    // v2 payloads carry a per-skin boards map; a legacy flat payload (top-level `orientations`,
    // no `boards`) is migrated here by reading it as the eu_frame board only -- it predates the
    // Soviet skin, so nothing of substance can be sitting in a sov_frame board that old shape
    // never had.
    ['eu_frame', 'sov_frame'].forEach((skinKey) => {
      const savedBoard = (saved.boards && saved.boards[skinKey])
        || (skinKey === 'eu_frame' && !saved.boards ? saved : null);
      if (!savedBoard || !savedBoard.orientations) return;
      ['landscape', 'portrait'].forEach((mode) => {
        const source = savedBoard.orientations[mode];
        if (!source) return;
        fresh.boards[skinKey].orientations[mode].buttons = Array.isArray(source.buttons) ? source.buttons.map(normalizeButton) : [];
        fresh.boards[skinKey].orientations[mode].zones = Array.isArray(source.zones) ? source.zones.map(normalizeZone) : [];
      });
    });
    fresh.gridStep = clamp(Number(saved.gridStep) || 1, .25, 10);
    fresh.snap = saved.snap !== false;
    fresh.guides = saved.guides !== false;
    return fresh;
  }

  // Server first (it is the authority once any device has synced); if it has no board yet but
  // THIS browser's localStorage does, that board is a PC that mapped its layout before this
  // feature existed — seed the server from it instead of discarding it (persist() below pushes
  // it up right after boot).
  async function loadState() {
    const serverPayload = await loadServerPayload();
    const localPayload = loadLocalPayload();
    const seedFromLocal = !hasAnyButtons(serverPayload) && hasAnyButtons(localPayload);
    if (seedFromLocal) needsSeedPush = true;
    return applyPayload(seedFromLocal ? localPayload : (serverPayload || localPayload));
  }

  let pushTimer = null;
  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushToServer, 600);
  }
  // Only two callers left: saveNow() (explicit Salvar button / Ctrl+S) and the one-time boot
  // reconciliation (needsSeedPush) that seeds the bridge when it has no board yet but this
  // browser's localStorage does. Neither fires on a plain edit anymore -- see persist() above.
  // Always reports a failure -- a silently-ignored res.ok used to make "PIN wrong" or "bridge
  // offline" look identical to "saved fine", which is what made the tablet desync invisible.
  async function pushToServer() {
    const text = JSON.stringify({ ...state, customAssets });
    try {
      const res = await fetch('/api/atomic-layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Pin': resolvePin() },
        body: text
      });
      if (!res.ok) {
        announce(res.status === 401
          ? 'PIN incorreto ou ausente - o bridge recusou o salvamento.'
          : 'Falha ao salvar no bridge (HTTP ' + res.status + ').');
        return false;
      }
      return true;
    } catch (error) {
      announce('Bridge inacessível - alterações ficaram só neste navegador.');
      return false;
    }
  }
  async function saveNow() {
    clearTimeout(pushTimer);
    writeLocal();
    announce('Salvando...');
    const ok = await pushToServer();
    if (ok) announce('Salvo no bridge.');
  }

  // Default pictogram box: centered at ~32% of the button — glanceable without covering the
  // rocker bezel. offset = (100 - size) / 2 keeps the icon centred when size changes.
  function defaultPictogram() { return { width: 32, height: 32, offsetX: 34, offsetY: 34, opacity: 0.92 }; }
  const numOr = (value, fallback) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };
  // Optional hex color on pictogram (A–E schema). Omitted / #ffffff = current white default — no migration.
  function normalizePictoColor(raw) {
    if (raw == null || raw === '') return undefined;
    const s = String(raw).trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(s)) return undefined;
    if (s.toLowerCase() === '#ffffff') return undefined;
    return s.toLowerCase();
  }
  function normalizePictogram(raw) {
    const base = defaultPictogram();
    if (!raw || typeof raw !== 'object') return base;
    const out = {
      width: clamp(numOr(raw.width, base.width), 5, 150),
      height: clamp(numOr(raw.height, base.height), 5, 150),
      offsetX: clamp(numOr(raw.offsetX, base.offsetX), -50, 150),
      offsetY: clamp(numOr(raw.offsetY, base.offsetY), -50, 150),
      opacity: clamp(numOr(raw.opacity, base.opacity), 0, 1)
    };
    const color = normalizePictoColor(raw.color);
    if (color) out.color = color;
    return out;
  }
  // The catalog function this button performs, or null for a custom/blank id (see catalog.js's
  // FUNCTIONS, the same source presets and the key-setup screen already read).
  function fnOf(item) {
    return (item && item.functionId && typeof FUNCTIONS !== 'undefined' && FUNCTIONS[item.functionId]) || null;
  }

  function normalizeButton(item) {
    const resolved = getAssetDef(item.asset);
    const asset = resolved ? item.asset : 'btn-square.png';
    const def = resolved || ASSETS_MODERN['btn-square.png'];
    const out = {
      id: String(item.id || uid('button')),
      asset,
      label: String(item.label || def.label),
      functionId: String(item.functionId || ''),
      pictogram: normalizePictogram(item.pictogram),
      pictogramHidden: Boolean(item.pictogramHidden),
      slots: hasSlots(asset) ? normalizeSlots(item.slots) : undefined,
      x: clamp(Number(item.x) || 10, 0, 99),
      y: clamp(Number(item.y) || 10, 0, 99),
      width: clamp(Number(item.width) || def.defaultSize[0], .2, 100),
      height: clamp(Number(item.height) || def.defaultSize[1], .2, 100),
      zIndex: Number(item.zIndex) || 10,
      hidden: Boolean(item.hidden)
    };
    const color = normalizeElementColor(item.color);
    if (color) out.color = color;
    return out;
  }

  const LEGACY_DASHBOARD_TYPES = { obd: 'dash-obd', tachometer: 'dash-speedometer' };
  function normalizeZone(item) {
    const migratedType = LEGACY_DASHBOARD_TYPES[item.type] || item.type;
    const type = DASHBOARDS[migratedType] ? migratedType : 'dash-obd';
    return {
      id: String(item.id || uid(type)),
      type,
      label: String(item.label || DASHBOARDS[type].label),
      x: clamp(Number(item.x) || 10, 0, 99),
      y: clamp(Number(item.y) || 10, 0, 99),
      width: clamp(Number(item.width) || DASHBOARDS[type].defaultSize[0], .2, 100),
      height: clamp(Number(item.height) || DASHBOARDS[type].defaultSize[1], .2, 100),
      zIndex: Number(item.zIndex) || 1,
      hidden: Boolean(item.hidden)
    };
  }

  function writeLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, customAssets })); } catch (error) { /* private browsing */ }
  }
  // Fernando's rule (2026-10-16): the Editor is a sandbox. Every edit writes to localStorage
  // only; the bridge is touched exclusively by an explicit user action (Salvar button / Ctrl+S
  // -> saveNow(), or the one-time boot reconciliation below) so two open tabs on different
  // skins can never race a PUT into each other's board.
  function persist() {
    writeLocal();
  }

  // Snapshot-based undo/redo: the whole editable state is small JSON (buttons/zones per
  // orientation + settings + customAssets), so a command pattern would be overkill. Call
  // pushHistory() BEFORE a mutation (so the stack holds pre-change states); any new action
  // clears the redo stack, matching standard editor undo semantics.
  function snapshotForHistory() { return JSON.stringify({ state, customAssets }); }
  function pushHistory() {
    historyStack.push(snapshotForHistory());
    if (historyStack.length > HISTORY_LIMIT) historyStack.shift();
    redoStack = [];
    refreshHistoryButtons();
  }
  function restoreSnapshot(json) {
    const data = JSON.parse(json);
    const keptSelection = selection;
    state = data.state;
    customAssets = data.customAssets || [];
    // Keep whatever was selected if it still exists post-restore (e.g. undoing a property edit
    // should leave the same button selected, showing the reverted value) -- only drop entries
    // whose element the undo/redo itself added or removed.
    selection = keptSelection.filter((entry) => findElement(entry.kind, entry.id));
    persist(); renderShippedAssetTools(); renderCustomAssetTools(); render();
  }
  function undo() {
    if (!historyStack.length) return;
    redoStack.push(snapshotForHistory());
    restoreSnapshot(historyStack.pop());
    refreshHistoryButtons();
    announce('Ação desfeita.');
  }
  function redo() {
    if (!redoStack.length) return;
    historyStack.push(snapshotForHistory());
    restoreSnapshot(redoStack.pop());
    refreshHistoryButtons();
    announce('Ação refeita.');
  }
  function refreshHistoryButtons() {
    const undoButton = $('#undoButton');
    const redoButton = $('#redoButton');
    if (undoButton) undoButton.disabled = !historyStack.length;
    if (redoButton) redoButton.disabled = !redoStack.length;
  }

  function activeBoard() { return state.boards[state.skin]; }
  function currentBoard() { return activeBoard().orientations[orientation]; }
  function allElements() { return currentBoard().buttons.map((item) => ({ kind: 'button', item })).concat(currentBoard().zones.map((item) => ({ kind: 'zone', item }))); }
  function findElement(kind, id) { return allElements().find((entry) => entry.kind === kind && entry.item.id === id); }
  function isSelected(kind, id) { return selection.some((entry) => entry.kind === kind && entry.id === id); }

  function init() {
    bindControls();
    renderShippedAssetTools();
    renderCustomAssetTools();
    setOrientation('landscape');
    render();
    refreshHistoryButtons();
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function bindControls() {
    $$('.orientation-button').forEach((button) => button.addEventListener('click', () => setOrientation(button.dataset.orientation)));
    $$('.skin-button').forEach((button) => button.addEventListener('click', () => setSkin(button.dataset.skin)));
    const sovSelect = $('#sovBgSelect');
    if (sovSelect) sovSelect.addEventListener('change', () => setSovBg(sovSelect.value));
    const packageSelect = $('#packageSelect');
    if (packageSelect) {
      packageSelect.value = activePackageId;
      packageSelect.addEventListener('change', () => {
        activePackageId = packageSelect.value === 'soviet' ? 'soviet' : 'modern';
        renderShippedAssetTools();
        announce(activePackageId === 'soviet' ? 'Paleta: Pacote Soviético.' : 'Paleta: Pacote Moderno.');
      });
    }
    $$('.dashboard-tool').forEach(bindTool);
    $('#backgroundInput').addEventListener('change', handleBackgroundFile);
    $('#customAssetInput').addEventListener('change', handleCustomAssetFile);
    $('#resetBackgroundButton').addEventListener('click', () => { delete runtimeBackgrounds[orientation]; render(); announce('Fundo oficial restaurado.'); });
    $('#snapToggle').addEventListener('change', (event) => { state.snap = event.target.checked; persist(); render(); });
    $('#guidesToggle').addEventListener('change', (event) => { state.guides = event.target.checked; persist(); render(); });
    $('#gridStep').addEventListener('change', (event) => { state.gridStep = clamp(Number(event.target.value) || 1, .25, 10); event.target.value = state.gridStep; persist(); render(); });
    const lockToggle = $('#lockKeysToggle');
    if (lockToggle) {
      lockToggle.checked = buttonsLocked;
      lockToggle.addEventListener('change', (event) => {
        buttonsLocked = !!event.target.checked;
        document.body.classList.toggle('keys-locked', buttonsLocked);
        renderStage();
        announce(buttonsLocked ? 'Teclas bloqueadas — arraste só o pictograma.' : 'Teclas desbloqueadas.');
      });
    }
    $('#fitButton').addEventListener('click', () => { $('.canvas-scroll').scrollTo({ top: 0, left: 0, behavior: 'smooth' }); announce('Prancheta ajustada à área visível.'); });
    const clearOrientBtn = $('#clearOrientationButton');
    if (clearOrientBtn) clearOrientBtn.addEventListener('click', clearOrientation);
    const clearAllBtn = $('#clearAllButton');
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllToBackground);
    // Legacy id kept if an old cached editor.html is still open.
    const legacyClear = $('#clearButton');
    if (legacyClear) legacyClear.addEventListener('click', clearOrientation);
    $('#deleteButton').addEventListener('click', deleteSelection);
    $('#copySizeButton').addEventListener('click', copySelectedSize);
    $('#applySizeButton').addEventListener('click', applyCopiedSize);
    $('#copyGroupButton').addEventListener('click', copySelectionToClipboard);
    $('#pasteGroupButton').addEventListener('click', pasteClipboard);
    $('#exportButton').addEventListener('click', exportAll);
    $('#importButton').addEventListener('click', () => $('#importInput').click());
    $('#saveButton').addEventListener('click', saveNow);
    $('#importInput').addEventListener('change', importReport);
    $('#undoButton').addEventListener('click', undo);
    $('#redoButton').addEventListener('click', redo);
    $('#selectedFunctionId').innerHTML = buildFunctionOptionsHtml();
    ['selectedId', 'selectedLabel', 'selectedSlot1', 'selectedSlot2', 'selectedSlot3'].forEach((id) => {
      const field = $('#' + id);
      field.addEventListener('input', updateSelectedMetadata);
      field.addEventListener('blur', () => { metadataHistorySettled = true; });
    });
    $('#selectedFunctionId').addEventListener('change', () => { updateSelectedMetadata(); renderPictogramFields(primarySelected() && primarySelected().item); renderStage(); });
    $('#selectedNoPictogram').addEventListener('change', updateSelectedNoPictogram);
    $$('.preset-button').forEach((button) => button.addEventListener('click', () => applyPictogramPreset(button.dataset.preset)));
    ['selectedPictoW', 'selectedPictoH', 'selectedPictoX', 'selectedPictoY', 'selectedPictoOpacity'].forEach((id) => $('#' + id).addEventListener('change', updateSelectedPictogram));
    // Color: save on input (live), change (picker close), and explicit Aplicar — was only on change and felt unconfirmed.
    const colorInput = $('#selectedPictoColor');
    if (colorInput) {
      colorInput.addEventListener('input', updateSelectedPictogram);
      colorInput.addEventListener('change', updateSelectedPictogram);
    }
    const applyColorBtn = $('#applyPictoColorButton');
    if (applyColorBtn) applyColorBtn.addEventListener('click', () => { updateSelectedPictogram(); announce('Cor do pictograma aplicada.'); });
    const elementColorInput = $('#selectedElementColor');
    if (elementColorInput) {
      elementColorInput.addEventListener('input', applySelectedElementColor);
      elementColorInput.addEventListener('change', applySelectedElementColor);
    }
    const applyElementColorBtn = $('#applyElementColorButton');
    if (applyElementColorBtn) {
      applyElementColorBtn.addEventListener('click', () => {
        applySelectedElementColor();
        announce('Cor do elemento aplicada.');
      });
    }
    $('#resetPictogramButton').addEventListener('click', resetPictogram);
    ['selectedX', 'selectedY', 'selectedW', 'selectedH'].forEach((id) => $('#' + id).addEventListener('change', updateSelectedCoordinates));
    $('#selectedUnit').addEventListener('change', renderInspector);
    const stage = $('#stage');
    stage.addEventListener('dragover', (event) => { event.preventDefault(); stage.classList.add('is-dragover'); });
    stage.addEventListener('dragleave', () => stage.classList.remove('is-dragover'));
    stage.addEventListener('drop', handleDrop);
    stage.addEventListener('pointerdown', (event) => { if (event.target === stage || event.target === $('#stageItems')) { selectOnly(null); } });
  }

  function bindTool(tool) {
    tool.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-desktruck-asset', tool.dataset.asset || '');
      event.dataTransfer.setData('application/x-desktruck-dashboard', tool.dataset.dashboard || '');
    });
    tool.addEventListener('click', () => {
      const rect = $('#stage').getBoundingClientRect();
      if (tool.dataset.asset) {
        const def = getAssetDef(tool.dataset.asset);
        if (def) addButton(tool.dataset.asset, 50 - def.defaultSize[0] / 2, 45);
      }
      if (tool.dataset.dashboard) addZone(tool.dataset.dashboard, 50 - DASHBOARDS[tool.dataset.dashboard].defaultSize[0] / 2, 42);
      $('#stage').focus();
      void rect;
    });
  }

  function renderCustomAssetTools() {
    $$('.asset-tool.is-custom').forEach((node) => node.remove());
    customAssets.forEach((custom) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'asset-tool is-custom';
      button.draggable = true;
      button.dataset.asset = custom.id;
      button.dataset.label = custom.label;
      button.innerHTML = '<span class="asset-preview"><img src="' + custom.src + '" alt=""></span><span><strong>' + escapeHtml(custom.label) + '</strong><small>personalizado</small></span>';
      const remove = document.createElement('span');
      remove.className = 'asset-remove';
      remove.textContent = '×';
      remove.title = 'Remover ativo personalizado da paleta';
      remove.addEventListener('click', (event) => { event.stopPropagation(); removeCustomAsset(custom.id); });
      button.appendChild(remove);
      bindTool(button);
      $('#assetList').appendChild(button);
    });
  }

  function handleCustomAssetFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pushHistory();
      const id = 'custom-' + uid('asset');
      const label = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Botão personalizado';
      customAssets.push({ id, label, src: reader.result, defaultSize: [8, 8] });
      persist();
      renderCustomAssetTools();
      announce('Botão personalizado "' + label + '" adicionado à paleta.');
    };
    reader.readAsDataURL(file);
  }

  function removeCustomAsset(id) {
    if (!window.confirm('Remover este ativo personalizado da paleta? Botões já posicionados com ele continuam a existir, mas sem a imagem na paleta.')) return;
    pushHistory();
    customAssets = customAssets.filter((asset) => asset.id !== id);
    persist(); renderCustomAssetTools(); announce('Ativo personalizado removido da paleta.');
  }

  function setOrientation(next) {
    if (next !== 'landscape' && next !== 'portrait') return;
    orientation = next;
    selection = [];
    $$('.orientation-button').forEach((button) => button.classList.toggle('is-active', button.dataset.orientation === orientation));
    render();
  }

  // Switching tabs is a VIEW change, not an edit: it must never touch history or trigger a
  // save. Each skin already owns its own board (see freshBoard() above), so no data crosses
  // over just by looking at the other tab.
  function setSkin(next) {
    const skin = next === 'sov_frame' ? 'sov_frame' : 'eu_frame';
    if (state.skin === skin) return;
    state.skin = skin;
    if (!SOV_BG_VARIANTS.includes(state.sovBg)) state.sovBg = 'military1';
    // Cascade palette follows the skin tab by default (exclusive package view).
    activePackageId = packageIdForSkin(skin);
    const packageSelect = $('#packageSelect');
    if (packageSelect) packageSelect.value = activePackageId;
    selection = [];
    renderShippedAssetTools();
    render();
    announce(skin === 'sov_frame' ? 'Tema Soviético — empty plate + widgets PNG.' : 'Tema Modern — empty plate + rockers.');
  }

  function setSovBg(variant) {
    const next = SOV_BG_VARIANTS.includes(variant) ? variant : 'military1';
    if (state.sovBg === next) return;
    state.sovBg = next;
    // Drop session override so the official variant plate paints immediately.
    delete runtimeBackgrounds[orientation];
    persist();
    render();
    announce('Fundo soviético: ' + (SOV_BG_LABELS[next] || next) + '.');
  }

  function renderShippedAssetTools() {
    const list = $('#assetList');
    if (!list) return;
    $$('.asset-tool:not(.is-custom), .package-group', list).forEach((node) => node.remove());
    const pack = PACKAGES.find((entry) => entry.id === activePackageId) || PACKAGES[0];
    const fragment = document.createDocumentFragment();
    const group = document.createElement('div');
    group.className = 'package-group';
    group.dataset.package = pack.id;
    const heading = document.createElement('div');
    heading.className = 'package-heading';
    const matchesSkin = pack.skin === state.skin;
    heading.innerHTML = '<span>' + escapeHtml(pack.label) + '</span><span class="package-kicker">' +
      (matchesSkin ? 'PAINEL ATIVO' : 'MISTURAR') + '</span>';
    group.appendChild(heading);
    if (!matchesSkin) {
      const hint = document.createElement('p');
      hint.className = 'package-hint';
      hint.textContent = 'Pacote de outro painel — arraste para misturar no canvas actual.';
      group.appendChild(hint);
    }
    Object.keys(pack.assets).forEach((key) => {
      const def = pack.assets[key];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'asset-tool';
      button.draggable = true;
      button.dataset.asset = key;
      button.dataset.label = def.label;
      button.dataset.package = pack.id;
      const wide = def.defaultSize[0] > def.defaultSize[1] * 1.6;
      button.innerHTML = '<span class="asset-preview' + (wide ? ' asset-preview-wide' : '') + '"><img src="' + assetImageSrc(key) + '" alt=""></span><span><strong>' + escapeHtml(def.label) + '</strong><small>' + escapeHtml(key) + '</small></span>';
      bindTool(button);
      group.appendChild(button);
    });
    fragment.appendChild(group);
    const firstCustom = list.querySelector('.asset-tool.is-custom');
    if (firstCustom) list.insertBefore(fragment, firstCustom);
    else list.appendChild(fragment);
    const buttonsTitle = $('#buttonsPackageTitle');
    if (buttonsTitle) buttonsTitle.textContent = pack.label;
    const buttonsKicker = $('#buttonsPackageKicker');
    if (buttonsKicker) buttonsKicker.textContent = 'PACOTE';
    const packageSelect = $('#packageSelect');
    if (packageSelect) packageSelect.value = pack.id;
  }

  function render() {
    const board = currentBoard();
    const bg = officialOf(orientation);
    const stage = $('#stage');
    stage.dataset.orientation = orientation;
    stage.dataset.skin = state.skin;
    stage.style.setProperty('--stage-aspect', bg.width + ' / ' + bg.height);
    stage.style.backgroundImage = 'url("' + (runtimeBackgrounds[orientation] || bg.src) + '")';
    stage.classList.toggle('has-elements', board.buttons.length + board.zones.length > 0);
    $('#backgroundSwatch').style.backgroundImage = 'url("' + (runtimeBackgrounds[orientation] || bg.src) + '")';
    $('#backgroundMode').textContent = orientation.toUpperCase();
    $('#backgroundName').textContent = runtimeBackgrounds[orientation] ? 'imagem local' : bg.name;
    $('#backgroundPath').textContent = runtimeBackgrounds[orientation] ? 'preview temporário' : bg.src;
    const bgPackage = $('#backgroundPackageLabel');
    if (bgPackage) bgPackage.textContent = state.skin === 'sov_frame' ? 'Fundo Soviético' : 'Fundo Moderno';
    $('#workspaceTitle').innerHTML = (orientation === 'landscape' ? 'Landscape' : 'Portrait') + ' <span>· ' + bg.width + ' × ' + bg.height + '</span>';
    const brand = $('.brand .eyebrow');
    if (brand) brand.textContent = state.skin === 'sov_frame' ? 'DESKTRUCK / SOVIET' : 'DESKTRUCK / MODERN';
    $$('.skin-button').forEach((button) => button.classList.toggle('is-active', button.dataset.skin === state.skin));
    const sovRow = $('#sovBgRow');
    if (sovRow) sovRow.hidden = state.skin !== 'sov_frame';
    const modernBgNote = $('#modernBgNote');
    if (modernBgNote) modernBgNote.hidden = state.skin !== 'eu_frame';
    const sovSelect = $('#sovBgSelect');
    if (sovSelect) sovSelect.value = SOV_BG_VARIANTS.includes(state.sovBg) ? state.sovBg : 'military1';
    $('#snapToggle').checked = state.snap;
    $('#guidesToggle').checked = state.guides;
    $('#gridStep').value = state.gridStep;
    $('#gridOverlay').style.backgroundSize = state.gridStep + '% ' + state.gridStep + '%';
    renderStage();
    renderInspector();
    renderLayers();
    $('#selectionSummary').textContent = selection.length + ' selecionado' + (selection.length === 1 ? '' : 's');
  }

  function renderStage() {
    const root = $('#stageItems');
    root.innerHTML = '';
    const ordered = allElements().sort((a, b) => (a.item.zIndex || 0) - (b.item.zIndex || 0));
    ordered.forEach(({ kind, item }) => {
      const node = document.createElement('div');
      node.className = 'layout-element ' + (kind === 'button' ? 'button-element' : 'zone-element') + (isSelected(kind, item.id) ? ' is-selected' : '') + (item.hidden ? ' is-layer-hidden' : '');
      node.dataset.kind = kind;
      node.dataset.id = item.id;
      node.style.left = item.x + '%';
      node.style.top = item.y + '%';
      node.style.width = item.width + '%';
      node.style.height = item.height + '%';
      node.style.zIndex = item.zIndex || 1;
      if (kind === 'button') {
        const img = document.createElement('img');
        img.src = assetImageSrc(item.asset);
        img.alt = item.label || item.asset;
        node.appendChild(img);
        if (item.color) {
          node.classList.add('has-tint');
          const tint = document.createElement('span');
          tint.className = 'tint-overlay';
          tint.style.background = item.color;
          node.appendChild(tint);
        }
        const hit = document.createElement('span');
        hit.className = 'hit';
        node.appendChild(hit);
        const f = fnOf(item);
        // Lamps are telltales — no vehicle-action pictogram overlay on top of the lamp PNG.
        if (f && !item.pictogramHidden && !isLampAsset(item.asset)) {
          const picto = item.pictogram || defaultPictogram();
          const overlay = document.createElement('span');
          overlay.className = 'pictogram-overlay' + (buttonsLocked ? ' is-editable' : '');
          overlay.dataset.pictogram = 'true';
          overlay.style.left = picto.offsetX + '%';
          overlay.style.top = picto.offsetY + '%';
          overlay.style.width = picto.width + '%';
          overlay.style.height = picto.height + '%';
          overlay.style.opacity = String(picto.opacity);
          if (picto.color) overlay.style.color = picto.color;
          overlay.innerHTML = iconSvg(f.icon);
          if (buttonsLocked && isSelected(kind, item.id)) {
            const pictoHandle = document.createElement('span');
            pictoHandle.className = 'resize-handle pictogram-resize';
            pictoHandle.dataset.pictogramResize = 'true';
            overlay.appendChild(pictoHandle);
          }
          node.appendChild(overlay);
        }
      } else {
        node.textContent = item.label;
      }
      if (isSelected(kind, item.id)) {
        const caption = document.createElement('span');
        caption.className = 'element-caption';
        caption.textContent = item.functionId ? item.id + ' · ' + item.functionId : item.id;
        node.appendChild(caption);
        // Button resize handle only when keys are unlocked (lock = edit symbols only).
        if (!(buttonsLocked && kind === 'button')) {
          const handle = document.createElement('span');
          handle.className = 'resize-handle';
          handle.dataset.resize = 'true';
          node.appendChild(handle);
        }
      }
      if (buttonsLocked && kind === 'button') node.classList.add('is-key-locked');
      node.addEventListener('pointerdown', (event) => startElementPointer(event, kind, item.id));
      node.addEventListener('dblclick', (event) => { event.preventDefault(); selectOnly({ kind, id: item.id }); copySelectedSize(); });
      root.appendChild(node);
    });
    renderGuides([]);
  }

  function renderLayers() {
    const root = $('#layersList');
    root.innerHTML = '';
    const ordered = allElements().slice().sort((a, b) => (b.item.zIndex || 0) - (a.item.zIndex || 0));
    $('#layersCount').textContent = ordered.length;
    if (!ordered.length) {
      const empty = document.createElement('div');
      empty.className = 'layers-empty';
      empty.textContent = 'Nenhum elemento nesta orientação.';
      root.appendChild(empty);
      return;
    }
    ordered.forEach(({ kind, item }) => {
      const row = document.createElement('div');
      row.className = 'layer-row' + (isSelected(kind, item.id) ? ' is-selected' : '') + (item.hidden ? ' is-hidden' : '');
      const badge = document.createElement('span');
      badge.className = 'layer-badge';
      badge.textContent = kind === 'button' ? 'BTN' : (item.type === 'dash-obd' ? 'OBD' : 'SPD');
      const info = document.createElement('span');
      info.className = 'layer-info';
      const name = document.createElement('span');
      name.className = 'layer-name';
      name.textContent = item.label || item.id;
      const idTag = document.createElement('small');
      idTag.className = 'layer-id';
      idTag.textContent = item.id;
      info.appendChild(name); info.appendChild(idTag);
      const visButton = document.createElement('button');
      visButton.type = 'button';
      visButton.className = 'layer-vis';
      visButton.title = item.hidden ? 'Mostrar na prancheta' : 'Ocultar na prancheta';
      visButton.textContent = item.hidden ? '◌' : '●';
      visButton.addEventListener('click', (event) => { event.stopPropagation(); toggleHidden(kind, item.id); });
      row.appendChild(badge); row.appendChild(info); row.appendChild(visButton);
      row.addEventListener('click', (event) => {
        const multi = event.ctrlKey || event.metaKey || event.shiftKey;
        if (multi) toggleSelection({ kind, id: item.id }); else selectOnly({ kind, id: item.id });
      });
      root.appendChild(row);
    });
  }

  function toggleHidden(kind, id) {
    const entry = findElement(kind, id);
    if (!entry) return;
    pushHistory();
    entry.item.hidden = !entry.item.hidden;
    persist(); render();
    announce((entry.item.hidden ? 'Ocultado na prancheta: ' : 'Visível na prancheta: ') + (entry.item.label || entry.item.id));
  }

  function renderGuides(guides) {
    const root = $('#guideOverlay');
    root.innerHTML = '';
    if (!state.guides) return;
    guides.forEach((guide) => {
      const line = document.createElement('span');
      line.className = 'guide-line ' + guide.axis;
      line.style[guide.axis === 'vertical' ? 'left' : 'top'] = guide.value + '%';
      root.appendChild(line);
    });
  }

  function startElementPointer(event, kind, id) {
    event.stopPropagation();
    const multi = event.ctrlKey || event.metaKey || event.shiftKey;
    if (multi) toggleSelection({ kind, id });
    else if (!isSelected(kind, id)) selectOnly({ kind, id });
    const entry = findElement(kind, id);
    if (!entry) return;
    const onPicto = !!(event.target.closest && event.target.closest('[data-pictogram]'));
    const pictoResize = !!(event.target.dataset && event.target.dataset.pictogramResize);
    // Locked keys: button move/resize blocked; only pictogram drag/resize allowed.
    if (buttonsLocked && kind === 'button' && !onPicto && !pictoResize) {
      renderInspector();
      return;
    }
    if (!buttonsLocked && kind === 'button' && onPicto && !event.target.dataset.resize) {
      // Unlocked: clicking the symbol still moves the whole key (overlay has pointer-events only when locked).
    }
    const rect = $('#stage').getBoundingClientRect();
    const positions = selection.map((selected) => {
      const found = findElement(selected.kind, selected.id);
      return found ? { ...selected, x: found.item.x, y: found.item.y, width: found.item.width, height: found.item.height } : null;
    }).filter(Boolean);
    let mode = event.target.dataset.resize ? 'resize' : 'move';
    let pictoStart = null;
    if (buttonsLocked && kind === 'button' && (onPicto || pictoResize)) {
      const picto = entry.item.pictogram || defaultPictogram();
      pictoStart = { offsetX: picto.offsetX, offsetY: picto.offsetY, width: picto.width, height: picto.height };
      mode = pictoResize ? 'pictogram-resize' : 'pictogram-move';
    }
    const buttonRect = event.currentTarget.getBoundingClientRect();
    dragState = {
      mode,
      kind, id, startX: event.clientX, startY: event.clientY, rect, positions, guides: [],
      historyPushed: false,
      pictoStart,
      buttonRect
    };
    $('#stage').classList.add('is-dragging');
    renderInspector();
  }

  function handlePointerMove(event) {
    if (!dragState) return;
    const dx = (event.clientX - dragState.startX) / dragState.rect.width * 100;
    const dy = (event.clientY - dragState.startY) / dragState.rect.height * 100;
    const primary = dragState.positions.find((entry) => entry.kind === dragState.kind && entry.id === dragState.id);
    if (!primary) return;
    if (!dragState.historyPushed) { pushHistory(); dragState.historyPushed = true; }
    if (dragState.mode === 'pictogram-move' || dragState.mode === 'pictogram-resize') {
      const item = findElement(dragState.kind, dragState.id);
      if (!item || !dragState.pictoStart || !dragState.buttonRect) return;
      const bx = dragState.buttonRect.width || 1;
      const by = dragState.buttonRect.height || 1;
      const ddx = (event.clientX - dragState.startX) / bx * 100;
      const ddy = (event.clientY - dragState.startY) / by * 100;
      const cur = item.item.pictogram || defaultPictogram();
      if (dragState.mode === 'pictogram-resize') {
        item.item.pictogram = normalizePictogram({
          ...cur,
          width: dragState.pictoStart.width + ddx,
          height: dragState.pictoStart.height + ddy
        });
      } else {
        item.item.pictogram = normalizePictogram({
          ...cur,
          offsetX: dragState.pictoStart.offsetX + ddx,
          offsetY: dragState.pictoStart.offsetY + ddy
        });
      }
      dragState.guides = [];
    } else if (dragState.mode === 'resize') {
      const item = findElement(dragState.kind, dragState.id);
      if (!item) return;
      item.item.width = clamp(primary.width + dx, .2, 100 - item.item.x);
      item.item.height = clamp(primary.height + dy, .2, 100 - item.item.y);
      dragState.guides = [];
    } else {
      const proposedX = primary.x + dx;
      const proposedY = primary.y + dy;
      const snapped = snapPosition(primary, proposedX, proposedY);
      const offsetX = snapped.x - primary.x;
      const offsetY = snapped.y - primary.y;
      dragState.guides = snapped.guides;
      dragState.positions.forEach((entry) => {
        const item = findElement(entry.kind, entry.id);
        if (!item) return;
        item.item.x = clamp(entry.x + offsetX, 0, 100 - item.item.width);
        item.item.y = clamp(entry.y + offsetY, 0, 100 - item.item.height);
      });
    }
    renderStage();
    renderGuides(dragState.guides);
    renderInspector();
  }

  function handlePointerUp() {
    if (!dragState) return;
    persist();
    dragState = null;
    $('#stage').classList.remove('is-dragging');
    renderGuides([]);
    renderInspector();
  }

  function snapPosition(item, proposedX, proposedY) {
    let x = clamp(proposedX, 0, 100 - item.width);
    let y = clamp(proposedY, 0, 100 - item.height);
    const guides = [];
    if (!state.snap) return { x, y, guides };
    const candidatesX = [0, 50, 100];
    const candidatesY = [0, 50, 100];
    allElements().forEach(({ item: other }) => {
      if (other.id === item.id) return;
      candidatesX.push(other.x, other.x + other.width / 2, other.x + other.width);
      candidatesY.push(other.y, other.y + other.height / 2, other.y + other.height);
    });
    const xSnap = nearestSnap(x, item.width, candidatesX);
    const ySnap = nearestSnap(y, item.height, candidatesY);
    x = xSnap.value; y = ySnap.value;
    if (xSnap.guide !== null) guides.push({ axis: 'vertical', value: xSnap.guide });
    if (ySnap.guide !== null) guides.push({ axis: 'horizontal', value: ySnap.guide });
    return { x, y, guides };
  }

  function nearestSnap(position, size, candidates) {
    const step = Number(state.gridStep) || 1;
    let best = { value: clamp(Math.round(position / step) * step, 0, 100 - size), distance: Math.abs(position - Math.round(position / step) * step), guide: null };
    candidates.forEach((guide) => {
      [position, position + size / 2, position + size].forEach((anchor, index) => {
        const distance = Math.abs(anchor - guide);
        if (distance <= .75 && distance < best.distance) {
          const value = clamp(guide - (index === 1 ? size / 2 : index === 2 ? size : 0), 0, 100 - size);
          best = { value, distance, guide };
        }
      });
    });
    return best;
  }

  function selectOnly(entry) { selection = entry ? [entry] : []; render(); }
  function toggleSelection(entry) {
    const index = selection.findIndex((selected) => selected.kind === entry.kind && selected.id === entry.id);
    if (index >= 0) selection.splice(index, 1); else selection.push(entry);
    render();
  }

  function selectedItems() { return selection.map((entry) => findElement(entry.kind, entry.id)).filter(Boolean); }
  function primarySelected() { return selectedItems()[0]; }

  function renderInspector() {
    const primary = primarySelected();
    const form = $('#inspectorForm');
    $('#inspectorCount').textContent = selection.length;
    if (!primary) { form.hidden = true; $('#emptyInspector').hidden = false; return; }
    form.hidden = false; $('#emptyInspector').hidden = true;
    const item = primary.item;
    const kind = primary.kind;
    const lamp = kind === 'button' && isLampAsset(item.asset);
    $('#selectedType').textContent = kind === 'button' ? (lamp ? 'Lâmpada / indicador' : 'Botão atómico') : 'Zona global';
    $('#selectedAsset').textContent = kind === 'button' ? item.asset : item.type;
    const preview = $('#selectedPreview');
    preview.innerHTML = '';
    preview.classList.toggle('zone-preview', kind === 'zone');
    if (kind === 'button') { const img = document.createElement('img'); img.src = assetImageSrc(item.asset); img.alt = ''; preview.appendChild(img); } else preview.textContent = item.type === 'dash-obd' ? 'OBD' : 'SPD';
    $('#selectedId').value = item.id;
    // Swap the function dropdown between vehicle actions and lamp telemetry catalog.
    const fnSelect = $('#selectedFunctionId');
    const prevValue = item.functionId || '';
    fnSelect.innerHTML = lamp ? buildLampOptionsHtml(item.asset) : buildFunctionOptionsHtml();
    fnSelect.value = prevValue;
    if (prevValue && fnSelect.value !== prevValue) {
      // Keep a custom/stale id visible so the mapping is not silently dropped.
      const orphan = document.createElement('option');
      orphan.value = prevValue;
      orphan.textContent = prevValue + ' (fora do catálogo)';
      fnSelect.appendChild(orphan);
      fnSelect.value = prevValue;
    }
    fnSelect.disabled = kind !== 'button';
    const fnLabel = $('#functionFieldLabel');
    if (fnLabel) fnLabel.textContent = lamp ? 'Indicador de telemetria' : 'Função (catálogo)';
    const lampHint = $('#lampHint');
    if (lampHint) lampHint.hidden = !lamp;
    $('#selectedLabel').value = item.label || '';
    const tintRow = $('#elementTintRow');
    if (tintRow) tintRow.hidden = kind !== 'button';
    const elementColor = $('#selectedElementColor');
    if (elementColor) elementColor.value = item.color || '#ffffff';
    renderPictogramFields(kind === 'button' ? item : null);
    $('#selectedUnit').value = $('#selectedUnit').value || 'percent';
    const unit = $('#selectedUnit').value;
    const dimensions = displayValues(item, unit);
    $('#selectedX').value = dimensions.x;
    $('#selectedY').value = dimensions.y;
    $('#selectedW').value = dimensions.width;
    $('#selectedH').value = dimensions.height;
    $('#positionNote').textContent = unit === 'percent' ? 'Valores relativos ao fundo; o CSS exportado usa %.': 'Campos em px; serão convertidos para % no relatório e no CSS.';
  }

  // Builds the catalog <select> once: one <optgroup> per family (Motor, Iluminação, etc.),
  // reading the same FUNCTION_LIST/CATEGORIES data presets and the key-setup screen use, so the
  // Editor can never drift out of sync with what a function actually does in the app.
  function buildFunctionOptionsHtml() {
    if (typeof FUNCTION_LIST === 'undefined') return '<option value="">— função —</option>';
    const byCat = {};
    FUNCTION_LIST.forEach((f) => { (byCat[f.cat] = byCat[f.cat] || []).push(f); });
    const groups = (typeof CATEGORIES !== 'undefined' ? CATEGORIES : Object.keys(byCat).map((id) => ({ id, name: id })))
      .filter((cat) => byCat[cat.id] && byCat[cat.id].length);
    let html = '<option value="">— personalizado / nenhum —</option>';
    groups.forEach((cat) => {
      html += '<optgroup label="' + escapeHtml(cat.name) + '">';
      byCat[cat.id].forEach((f) => { html += '<option value="' + escapeHtml(f.id) + '">' + escapeHtml(f.name) + '</option>'; });
      html += '</optgroup>';
    });
    return html;
  }

  function buildLampOptionsHtml(asset) {
    const color = lampColorOf(asset);
    const list = lampIndicatorsFor(asset);
    let html = '<option value="">— nenhum indicador —</option>';
    html += '<optgroup label="Telemetria · lâmpada ' + escapeHtml(color) + '">';
    list.forEach((entry) => {
      html += '<option value="' + escapeHtml(entry.id) + '">' + escapeHtml(entry.name) + '</option>';
    });
    html += '</optgroup>';
    return html;
  }

  function renderPictogramFields(item) {
    const fieldset = $('#pictogramFields');
    const noPictogramField = $('#noPictogramField');
    // Lamps never get vehicle-action pictogram chrome — the PNG is the indicator.
    if (!item || isLampAsset(item.asset) || !fnOf(item)) {
      fieldset.hidden = true;
      noPictogramField.hidden = true;
      return;
    }
    noPictogramField.hidden = false;
    $('#selectedNoPictogram').checked = Boolean(item.pictogramHidden);
    fieldset.hidden = Boolean(item.pictogramHidden);
    if (fieldset.hidden) return;
    const picto = item.pictogram || defaultPictogram();
    $('#selectedPictoW').value = picto.width;
    $('#selectedPictoH').value = picto.height;
    $('#selectedPictoX').value = picto.offsetX;
    $('#selectedPictoY').value = picto.offsetY;
    $('#selectedPictoOpacity').value = picto.opacity;
    $('#selectedPictoColor').value = picto.color || '#ffffff';
  }

  function applySelectedElementColor() {
    const primary = primarySelected();
    if (!primary || primary.kind !== 'button') return;
    const colorInput = $('#selectedElementColor');
    if (!colorInput) return;
    pushHistory();
    const color = normalizeElementColor(colorInput.value);
    if (color) primary.item.color = color;
    else delete primary.item.color;
    persist();
    renderStage();
    renderInspector();
  }

  function updateSelectedPictogram() {
    const primary = primarySelected();
    if (!primary || primary.kind !== 'button' || !fnOf(primary.item)) return;
    pushHistory();
    primary.item.pictogram = normalizePictogram({
      width: $('#selectedPictoW').value,
      height: $('#selectedPictoH').value,
      offsetX: $('#selectedPictoX').value,
      offsetY: $('#selectedPictoY').value,
      opacity: $('#selectedPictoOpacity').value,
      color: $('#selectedPictoColor').value
    });
    persist(); renderStage();
  }

  function resetPictogram() {
    const primary = primarySelected();
    if (!primary || primary.kind !== 'button' || !fnOf(primary.item)) return;
    pushHistory();
    primary.item.pictogram = defaultPictogram();
    persist(); render();
  }

  // Independent of functionId: the button still performs its action, it just skips drawing the
  // catalog icon on top -- for carcaças/imagens that already print their own text/symbol.
  function updateSelectedNoPictogram() {
    const primary = primarySelected();
    if (!primary || primary.kind !== 'button' || !fnOf(primary.item)) return;
    pushHistory();
    primary.item.pictogramHidden = $('#selectedNoPictogram').checked;
    persist(); render();
  }

  function applyPictogramPreset(name) {
    const preset = PICTOGRAM_PRESETS[name];
    const primary = primarySelected();
    if (!preset || !primary || primary.kind !== 'button' || !fnOf(primary.item)) return;
    pushHistory();
    const current = primary.item.pictogram || defaultPictogram();
    primary.item.pictogram = normalizePictogram({ ...preset, opacity: current.opacity, color: current.color });
    persist(); render();
    announce('Ancoragem aplicada: ' + name + '.');
  }

  function displayValues(item, unit) {
    if (unit === 'px') {
      const bg = officialOf(orientation);
      return { x: round(item.x / 100 * bg.width, 2), y: round(item.y / 100 * bg.height, 2), width: round(item.width / 100 * bg.width, 2), height: round(item.height / 100 * bg.height, 2) };
    }
    return { x: round(item.x, 3), y: round(item.y, 3), width: round(item.width, 3), height: round(item.height, 3) };
  }

  // Bound to 'input' (fires every keystroke) -- pushHistory() only on the first keystroke of an
  // editing session, or undo would need one press per character. metadataHistorySettled resets
  // on blur (see bindControls) so the next edit starts a fresh checkpoint.
  let metadataHistorySettled = true;
  function updateSelectedMetadata() {
    const primary = primarySelected();
    if (!primary) return;
    if (metadataHistorySettled) { pushHistory(); metadataHistorySettled = false; }
    const previousId = primary.item.id;
    const id = $('#selectedId').value.trim();
    if (id && !allElements().some(({ item }) => item.id === id && item !== primary.item)) primary.item.id = id;
    primary.item.functionId = primary.kind === 'button' ? $('#selectedFunctionId').value.trim() : '';
    primary.item.label = $('#selectedLabel').value.trim() || (primary.kind === 'button' ? (getAssetDef(primary.item.asset) || ASSETS_MODERN['btn-square.png']).label : DASHBOARDS[primary.item.type].label);
    selection = selection.map((entry) => entry.kind === primary.kind && entry.id === previousId ? { kind: primary.kind, id: primary.item.id } : entry);
    persist(); renderStage(); renderInspector();
  }

  function updateSelectedCoordinates() {
    const primary = primarySelected();
    if (!primary) return;
    pushHistory();
    const unit = $('#selectedUnit').value;
    const bg = officialOf(orientation);
    const value = (id, size) => {
      const number = Number($('#' + id).value);
      return unit === 'px' ? number / size * 100 : number;
    };
    primary.item.x = clamp(value('selectedX', bg.width), 0, 99.8);
    primary.item.y = clamp(value('selectedY', bg.height), 0, 99.8);
    primary.item.width = clamp(value('selectedW', bg.width), .2, 100 - primary.item.x);
    primary.item.height = clamp(value('selectedH', bg.height), .2, 100 - primary.item.y);
    persist(); render();
  }

  function copySelectedSize() {
    const primary = primarySelected();
    if (!primary) return;
    copiedSize = { width: primary.item.width, height: primary.item.height, source: primary.item.id };
    announce('Tamanho de ' + primary.item.id + ' copiado. Selecione outros botões e aplique.');
  }

  function applyCopiedSize() {
    if (!copiedSize) { announce('Nenhum tamanho copiado ainda.'); return; }
    pushHistory();
    const targets = selectedItems().filter(({ kind }) => kind === 'button');
    targets.forEach(({ item }) => { item.width = clamp(copiedSize.width, .2, 100 - item.x); item.height = clamp(copiedSize.height, .2, 100 - item.y); });
    persist(); render(); announce('Tamanho aplicado a ' + targets.length + ' botão(ões).');
  }

  function addButton(asset, x, y) {
    const def = getAssetDef(asset);
    if (!def) return;
    pushHistory();
    const number = currentBoard().buttons.length + 1;
    const [width, height] = def.defaultSize;
    const id = uniqueElementId(asset.replace('.png', '') + '-' + number);
    const item = normalizeButton({ id, asset, label: def.label, x, y, width, height, zIndex: 10 + number });
    currentBoard().buttons.push(item); selection = [{ kind: 'button', id: item.id }]; persist(); render(); announce(item.label + ' adicionado.');
  }

  function addZone(type, x, y) {
    if (!DASHBOARDS[type]) return;
    pushHistory();
    const number = currentBoard().zones.filter((zone) => zone.type === type).length + 1;
    const [width, height] = DASHBOARDS[type].defaultSize;
    const id = uniqueElementId(type + '-' + number);
    const item = normalizeZone(makeZone(type, id, x, y, width, height));
    currentBoard().zones.push(item); selection = [{ kind: 'zone', id: item.id }]; persist(); render(); announce(item.label + ' adicionada.');
  }

  function handleDrop(event) {
    event.preventDefault();
    const stage = $('#stage');
    stage.classList.remove('is-dragover');
    const asset = event.dataTransfer.getData('application/x-desktruck-asset');
    const dashboard = event.dataTransfer.getData('application/x-desktruck-dashboard');
    const point = stagePoint(event.clientX, event.clientY);
    if (asset) {
      const def = getAssetDef(asset);
      if (def) addButton(asset, point.x - def.defaultSize[0] / 2, point.y - def.defaultSize[1] / 2);
    }
    if (dashboard) addZone(dashboard, point.x - DASHBOARDS[dashboard].defaultSize[0] / 2, point.y - DASHBOARDS[dashboard].defaultSize[1] / 2);
  }

  function stagePoint(clientX, clientY) {
    const rect = $('#stage').getBoundingClientRect();
    return { x: clamp((clientX - rect.left) / rect.width * 100, 0, 100), y: clamp((clientY - rect.top) / rect.height * 100, 0, 100) };
  }

  function handleBackgroundFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { runtimeBackgrounds[orientation] = reader.result; render(); announce('Imagem local carregada apenas para esta sessão.'); };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function clearOrientation() {
    if (!window.confirm('Limpar botões da orientação?\n\nRemove apenas as teclas/elementos da orientação activa (' + orientation + '). O fundo permanece.')) return;
    pushHistory();
    activeBoard().orientations[orientation] = { buttons: [], zones: [] };
    selection = [];
    persist();
    render();
    announce('Botões da orientação limpos.');
  }

  function clearAllToBackground() {
    if (!window.confirm('Limpar tudo até o background?\n\nRemove todos os elementos desta orientação e restaura o fundo oficial limpo.')) return;
    pushHistory();
    activeBoard().orientations[orientation] = { buttons: [], zones: [] };
    delete runtimeBackgrounds[orientation];
    selection = [];
    persist();
    render();
    announce('Tudo limpo até o background oficial.');
  }

  function deleteSelection() {
    if (!selection.length) return;
    pushHistory();
    const ids = new Set(selection.map((entry) => entry.id));
    currentBoard().buttons = currentBoard().buttons.filter((item) => !ids.has(item.id));
    currentBoard().zones = currentBoard().zones.filter((item) => !ids.has(item.id));
    selection = []; persist(); render(); announce('Elementos removidos.');
  }

  function handleKeydown(event) {
    const tag = document.activeElement && document.activeElement.tagName;
    const key = event.key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;
    if ((tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') && !(mod && ['c', 'v', 'd'].includes(key))) return;
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelection(); }
    if (mod && event.shiftKey && key === 'c') { event.preventDefault(); copySelectedSize(); return; }
    if (mod && event.shiftKey && key === 'v') { event.preventDefault(); applyCopiedSize(); return; }
    if (mod && event.shiftKey && key === 'z') { event.preventDefault(); redo(); return; }
    if (mod && key === 'z') { event.preventDefault(); undo(); return; }
    if (mod && key === 'y') { event.preventDefault(); redo(); return; }
    if (mod && key === 'c') { event.preventDefault(); copySelectionToClipboard(); }
    if (mod && key === 'v') { event.preventDefault(); pasteClipboard(); }
    if (mod && key === 'd') { event.preventDefault(); duplicateSelection(); }
    if (mod && key === 's') { event.preventDefault(); saveNow(); }
  }

  function duplicateSelection() {
    if (!selectedItems().length) return;
    pushHistory();
    const copies = selectedItems().map(({ kind, item }) => kind === 'button' ? normalizeButton({ ...item, id: uniqueElementId(item.id + '-copy'), x: item.x + 2, y: item.y + 2 }) : normalizeZone({ ...item, id: uniqueElementId(item.id + '-copy'), x: item.x + 2, y: item.y + 2 }));
    copies.forEach((item) => (item.asset ? currentBoard().buttons : currentBoard().zones).push(item));
    selection = copies.map((item) => ({ kind: item.asset ? 'button' : 'zone', id: item.id }));
    persist(); render(); announce('Seleção duplicada.');
  }

  function copySelectionToClipboard() {
    const items = selectedItems();
    if (!items.length) { announce('Nada selecionado para copiar.'); return; }
    clipboard = items.map(({ kind, item }) => ({ kind, item: JSON.parse(JSON.stringify(item)) }));
    clipboardPasteCount = 0;
    announce(clipboard.length + ' elemento(s) copiado(s).');
  }

  function pasteClipboard() {
    if (!clipboard || !clipboard.length) { announce('Área de transferência vazia.'); return; }
    pushHistory();
    clipboardPasteCount += 1;
    const offset = clipboardPasteCount * 2;
    const copies = clipboard.map(({ kind, item }) => {
      const clone = JSON.parse(JSON.stringify(item));
      clone.id = String(item.id) + '-paste' + clipboardPasteCount;
      clone.x = clamp(Number(item.x) + offset, 0, 100 - Number(item.width));
      clone.y = clamp(Number(item.y) + offset, 0, 100 - Number(item.height));
      return { kind, item: kind === 'button' ? normalizeButton(clone) : normalizeZone(clone) };
    });
    copies.forEach(({ kind, item }) => {
      if (kind === 'button') currentBoard().buttons.push(item);
      else currentBoard().zones.push(item);
    });
    selection = copies.map(({ kind, item }) => ({ kind, id: item.id }));
    persist(); render(); announce(copies.length + ' elemento(s) colado(s).');
  }

  function buildReport() {
    const orientations = {};
    ['landscape', 'portrait'].forEach((mode) => {
      const bg = officialOf(mode);
      const board = activeBoard().orientations[mode];
      orientations[mode] = {
        background: { file: bg.src, width: bg.width, height: bg.height, localPreviewLoaded: Boolean(runtimeBackgrounds[mode]) },
        zones: board.zones.map((zone) => exportElement(zone, 'dashboard', mode)),
        buttons: board.buttons.map((button) => exportElement(button, 'button', mode))
      };
    });
    return {
      schema: state.schema,
      version: 1,
      skin: state.skin,
      sovBg: state.skin === 'sov_frame' ? (SOV_BG_VARIANTS.includes(state.sovBg) ? state.sovBg : 'military1') : undefined,
      generatedAt: new Date().toISOString(),
      grid: { snap: state.snap, stepPercent: state.gridStep, guides: state.guides },
      customAssets,
      orientations
    };
  }

  function exportElement(item, kind, mode) {
    const bg = officialOf(mode);
    const result = { id: item.id, type: kind, label: item.label, position: { unit: 'percent', x: round(item.x), y: round(item.y), width: round(item.width), height: round(item.height) }, pixels: { x: round(item.x / 100 * bg.width, 2), y: round(item.y / 100 * bg.height, 2), width: round(item.width / 100 * bg.width, 2), height: round(item.height / 100 * bg.height, 2) }, zIndex: item.zIndex || 1 };
    if (kind === 'button') {
      Object.assign(result, {
        asset: item.asset,
        functionId: item.functionId || '',
        pictogram: item.pictogram || defaultPictogram(),
        pictogramHidden: Boolean(item.pictogramHidden),
        slots: Array.isArray(item.slots) ? item.slots : undefined
      });
      if (item.color) result.color = item.color;
    } else result.dashboard = item.type;
    return result;
  }

  function buildCss(report) {
    const lines = [
      '/* Desktruck atomic layout export. Generated by public/editor.html. */',
      '/* The host app should render .modern-atomic-canvas with data-orientation and data-layout-id attributes. */',
      '.modern-atomic-canvas { position: relative; overflow: hidden; background-position: center; background-repeat: no-repeat; background-size: cover; }',
      '.modern-atomic-canvas > [data-layout-id] { position: absolute; box-sizing: border-box; }',
      '.modern-atomic-canvas > .modern-atomic-button { background-repeat: no-repeat; background-position: center; background-size: 100% 100%; }',
      '.modern-atomic-canvas > .modern-atomic-dashboard { border: 1px dashed rgba(117,199,192,.8); }'
    ];
    Object.entries(report.orientations).forEach(([mode, data]) => {
      const bg = officialOf(mode);
      lines.push('', '.modern-atomic-canvas[data-orientation="' + mode + '"] {', '  aspect-ratio: ' + bg.width + ' / ' + bg.height + ';', '  background-image: url("' + bg.src + '");', '}');
      data.zones.concat(data.buttons).forEach((item) => {
        const selector = '.modern-atomic-canvas[data-orientation="' + mode + '"] > [data-layout-id="' + cssQuote(item.id) + '"]';
        const assetSrc = item.asset ? assetImageSrc(item.asset) : '';
        lines.push(selector + ' {', '  left: ' + item.position.x + '%;', '  top: ' + item.position.y + '%;', '  width: ' + item.position.width + '%;', '  height: ' + item.position.height + '%;', '  z-index: ' + item.zIndex + ';', assetSrc ? '  background-image: url("' + assetSrc + '");' : '', item.functionId ? '  --function-id: "' + cssQuote(item.functionId) + '";' : '', '}');
      });
    });
    return lines.filter((line) => line !== undefined).join('\n');
  }

  function cssQuote(value) { return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

  function exportAll() {
    const report = buildReport();
    download('layout-report.json', JSON.stringify(report, null, 2), 'application/json');
    download('layout.generated.css', buildCss(report), 'text/css');
    announce('JSON e CSS exportados.');
  }

  function download(name, contents, type) {
    const blob = new Blob([contents], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 500);
  }

  function importReport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const report = JSON.parse(reader.result);
        pushHistory();
        if (Array.isArray(report.customAssets)) {
          report.customAssets.forEach((item) => {
            if (!item || typeof item.id !== 'string' || typeof item.src !== 'string') return;
            if (customAssets.some((asset) => asset.id === item.id)) return;
            customAssets.push({
              id: item.id,
              label: String(item.label || 'Personalizado'),
              src: item.src,
              defaultSize: Array.isArray(item.defaultSize) && item.defaultSize.length === 2 ? item.defaultSize : [8, 8]
            });
          });
          renderCustomAssetTools();
        }
        // A report targets exactly one skin (whichever was active when it was exported) --
        // set state.skin FIRST so the import writes into that skin's own board, never into
        // whatever tab happened to be open before the import.
        const importSkin = report.skin === 'sov_frame' ? 'sov_frame' : 'eu_frame';
        state.skin = importSkin;
        ['landscape', 'portrait'].forEach((mode) => {
          const source = report.orientations && report.orientations[mode];
          if (!source) return;
          state.boards[importSkin].orientations[mode] = {
            buttons: (source.buttons || []).map((item) => normalizeButton({ id: item.id, asset: item.asset, label: item.label, functionId: item.functionId, pictogram: item.pictogram, pictogramHidden: item.pictogramHidden, slots: item.slots, color: item.color, ...(item.position || {}) })),
            zones: (source.zones || []).map((item) => normalizeZone({ id: item.id, type: item.dashboard || item.type, label: item.label, ...(item.position || {}) }))
          };
        });
        if (report.grid) { state.gridStep = clamp(Number(report.grid.stepPercent) || 1, .25, 10); state.snap = report.grid.snap !== false; state.guides = report.grid.guides !== false; }
        state.sovBg = SOV_BG_VARIANTS.includes(report.sovBg) ? report.sovBg : 'military1';
        activePackageId = packageIdForSkin(importSkin);
        persist(); selection = []; renderShippedAssetTools(); render(); announce('Relatório importado.');
      } catch (error) { announce('Não foi possível importar este JSON.'); }
    };
    reader.readAsText(file); event.target.value = '';
  }

  function announce(message) { $('#statusMessage').textContent = message; }

  async function bootstrap() {
    state = await loadState();
    activePackageId = packageIdForSkin(state.skin);
    init();
    if (needsSeedPush) { needsSeedPush = false; schedulePush(); }
  }

  bootstrap();
}());
