/* Desktruck Atomic Layout Editor. This utility is intentionally isolated from app.js. */
(function () {
  'use strict';

  const STORAGE_KEY = 'desktruck.atomic-layout.v1';
  const OFFICIAL_MODERN = {
    landscape: { name: 'bg-landscape.jpg', src: 'skins/modern/bg-landscape.jpg', width: 2752, height: 1536 },
    portrait: { name: 'bg-portrait.jpg', src: 'skins/modern/bg-portrait.jpg', width: 1152, height: 1728 }
  };
  const SOV_BG_VARIANTS = ['white', 'military1', 'military2', 'sigabem', 'vivamexico'];
  const SOV_BG_LABELS = {
    white: 'Branca / Esmaltada',
    military1: 'Military 1',
    military2: 'Military 2',
    sigabem: 'Siga Bem',
    vivamexico: 'Viva México'
  };
  // Source aliases: 380.jpg = Siga Bem, 378.jpg = Viva México (Fernando's numbered masters).
  const SOV_BG_ALIASES = {
    '380': 'sigabem', '380.jpg': 'sigabem', siga: 'sigabem', siga_bem: 'sigabem',
    'siga bem': 'sigabem', sigabem: 'sigabem',
    '378': 'vivamexico', '378.jpg': 'vivamexico', viva: 'vivamexico', viva_mexico: 'vivamexico',
    'viva mexico': 'vivamexico', 'viva méxico': 'vivamexico', vivamexico: 'vivamexico',
    white: 'white', branca: 'white', enamel: 'white',
    military1: 'military1', mil1: 'military1', military2: 'military2', mil2: 'military2'
  };
  function normalizeSovBg(sovBg) {
    const raw = String(sovBg == null ? 'white' : sovBg).trim();
    if (!raw) return 'white';
    const key = raw.toLowerCase().replace(/\\+/g, '/').split('/').pop();
    const bare = key.replace(/\.(jpe?g|png|webp)$/i, '');
    const hit = SOV_BG_ALIASES[key] || SOV_BG_ALIASES[bare]
      || SOV_BG_ALIASES[bare.replace(/[-_\s]+/g, '')]
      || SOV_BG_ALIASES[raw.toLowerCase()];
    if (hit) return hit;
    if (/siga/.test(bare)) return 'sigabem';
    if (/viva|mexico|méxico/.test(bare)) return 'vivamexico';
    if (/military?\s*2|mil2/.test(bare)) return 'military2';
    if (/military?\s*1|mil1|military/.test(bare)) return 'military1';
    if (/white|branca|enamel|esmalt/.test(bare)) return 'white';
    return SOV_BG_VARIANTS.includes(bare) ? bare : 'white';
  }
  function officialOf(mode) {
    if (state.skin === 'sov_frame') {
      const variant = normalizeSovBg(state.sovBg);
      const name = 'bg-' + variant + '-' + mode + '.jpg';
      return mode === 'landscape'
        ? { name: name, src: 'skins/sov/bg/' + name, width: 2752, height: 1536 }
        : { name: name, src: 'skins/sov/bg/' + name, width: 1536, height: 2752 };
    }
    return OFFICIAL_MODERN[mode];
  }
  // ─── ASSET CATALOG ────────────────────────────────────────────────────────
  // Fonte única de todos os assets do editor atômico.
  // category: 'rocker' | 'round' | 'push' | 'ignition' | 'engine' |
  //           'rotary' | 'toggle' | 'hazard' | 'brake' | 'lamp' | 'gauge'
  // resolver: 'modern' usa skins/modern/ | 'sov' usa skins/sov/btn/ | omitido = modern
  const ASSET_CATALOG = [
    // ── Rocker ───────────────────────────────────────────────────────────────
    { file: 'btn-rocker-v.png',              label: 'Rocker vertical',          defaultSize: [5.5, 13], category: 'rocker', resolver: 'modern' },
    { file: 'mod_rocker_metal.png',          label: 'Rocker metal',             defaultSize: [10, 6],   category: 'rocker', resolver: 'modern' },
    { file: 'mod_rocker_beige.png',          label: 'Rocker bege',              defaultSize: [10, 6],   category: 'rocker', resolver: 'modern' },
    { file: 'sov_rocker_blue.png',           label: 'Rocker azul',              defaultSize: [10, 6],   category: 'rocker', resolver: 'sov' },
    { file: 'sov_rocker_blue_rusted.png',    label: 'Rocker azul enferrujado',  defaultSize: [10, 6],   category: 'rocker', resolver: 'sov' },
    { file: 'sov_rocker_diamond_gunmetal.png', label: 'Rocker diamond gunmetal',defaultSize: [10, 6],   category: 'rocker', resolver: 'sov' },
    { file: 'sov_rocker_diamond_silver.png', label: 'Rocker diamond prata',     defaultSize: [10, 6],   category: 'rocker', resolver: 'sov' },
    { file: 'sov_rocker_glossy.png',         label: 'Rocker glossy',            defaultSize: [10, 6],   category: 'rocker', resolver: 'sov' },
    { file: 'sov_rocker_matte.png',          label: 'Rocker matte',             defaultSize: [10, 6],   category: 'rocker', resolver: 'sov' },
    { file: 'sov_rocker_olive.png',          label: 'Rocker oliva',             defaultSize: [10, 6],   category: 'rocker', resolver: 'sov' },
    { file: 'sov_rocker_red_glossy.png',     label: 'Rocker vermelho glossy',   defaultSize: [10, 6],   category: 'rocker', resolver: 'sov' },
    { file: 'sov_rocker_red_leather.png',    label: 'Rocker couro vermelho',    defaultSize: [10, 6],   category: 'rocker', resolver: 'sov' },
    { file: 'sov_rocker_yellow.png',         label: 'Rocker amarelo',           defaultSize: [10, 6],   category: 'rocker', resolver: 'sov' },
    // ── Round ────────────────────────────────────────────────────────────────
    { file: 'mod_round_glossy_black.png',    label: 'Round preto glossy',       defaultSize: [7, 7],    category: 'round',  resolver: 'modern' },
    { file: 'mod_round_matte_black.png',     label: 'Round preto matte',        defaultSize: [7, 7],    category: 'round',  resolver: 'modern' },
    { file: 'mod_round_brushed_metal.png',   label: 'Round metal escovado',     defaultSize: [7, 7],    category: 'round',  resolver: 'modern' },
    { file: 'mod_round_beige.png',           label: 'Round bege',               defaultSize: [7, 7],    category: 'round',  resolver: 'modern' },
    { file: 'sov_round_rust_green.png',      label: 'Round ferrugem verde',     defaultSize: [7, 7],    category: 'round',  resolver: 'sov' },
    { file: 'sov_round_rust_blue.png',       label: 'Round ferrugem azul',      defaultSize: [7, 7],    category: 'round',  resolver: 'sov' },
    { file: 'sov_round_diamond_steel.png',   label: 'Round diamond aço',        defaultSize: [7, 7],    category: 'round',  resolver: 'sov' },
    { file: 'sov_round_worn_red.png',        label: 'Round desgastado vermelho',defaultSize: [7, 7],    category: 'round',  resolver: 'sov' },
    { file: 'sov_round_worn_orange.png',     label: 'Round desgastado laranja', defaultSize: [7, 7],    category: 'round',  resolver: 'sov' },
    { file: 'sov_round_shiny_steel.png',     label: 'Round aço brilhante',      defaultSize: [7, 7],    category: 'round',  resolver: 'sov' },
    { file: 'sov_round_shiny_red.png',       label: 'Round vermelho brilhante', defaultSize: [7, 7],    category: 'round',  resolver: 'sov' },
    { file: 'sov_round_electric_off.png',    label: 'Round elétrico',           defaultSize: [7, 7],    category: 'round',  resolver: 'sov' },
    // sov_round_red_metal.png intentionally NOT listed: the file is a cropped sprite-sheet fragment (873x256, two buttons on white), not a housing. PNG kept on disk.
    { file: 'sov_round_rusted_blue.png',     label: 'Round enferrujado azul',   defaultSize: [7, 7],    category: 'round',  resolver: 'sov' },
    { file: 'sov_round_rusted_olive.png',    label: 'Round enferrujado oliva',  defaultSize: [7, 7],    category: 'round',  resolver: 'sov' },
    { file: 'sov_round_rusted_red.png',      label: 'Round enferrujado vermelho',defaultSize: [7, 7],   category: 'round',  resolver: 'sov' },
    // ── Push / Square ────────────────────────────────────────────────────────
    { file: 'btn-square.png',                label: 'Square moderno',           defaultSize: [8, 8],    category: 'push',   resolver: 'modern' },
    { file: 'sov_sq_boss.png',               label: 'Square boss',              defaultSize: [8, 8],    category: 'push',   resolver: 'sov' },
    { file: 'sov_sq_flat.png',               label: 'Square flat',              defaultSize: [8, 8],    category: 'push',   resolver: 'sov' },
    { file: 'sov_sq_waffle.png',             label: 'Square waffle',            defaultSize: [8, 8],    category: 'push',   resolver: 'sov' },
    { file: 'sov_sq_grid.png',               label: 'Square grid',              defaultSize: [8, 8],    category: 'push',   resolver: 'sov' },
    { file: 'sov_push.png',                  label: 'Push',                     defaultSize: [8, 8],    category: 'push',   resolver: 'sov' },
    { file: 'sov_push_dish.png',             label: 'Push côncavo',             defaultSize: [7, 7],    category: 'push',   resolver: 'sov' },
    { file: 'sov_push_worn.png',             label: 'Push desgastado',          defaultSize: [7, 7],    category: 'push',   resolver: 'sov' },
    { file: 'sov_push_scratched.png',        label: 'Push arranhado',           defaultSize: [7, 7],    category: 'push',   resolver: 'sov' },
    // ── Ignição ──────────────────────────────────────────────────────────────
    { file: 'sov_key_slot.png',              label: 'Slot chave',               defaultSize: [8, 10],   category: 'ignition', resolver: 'sov' },
    { file: 'sov_key_kamaz.png',             label: 'Chave Kamaz',              defaultSize: [8, 10],   category: 'ignition', resolver: 'sov' },
    // ── Motor / Elétrica ─────────────────────────────────────────────────────
    { file: 'engine_cir.png',                label: 'Motor circular',           defaultSize: [8, 8],    category: 'engine', resolver: 'modern' },
    { file: 'engine_cr_vt.png',              label: 'Motor cromado VT',         defaultSize: [8, 8],    category: 'engine', resolver: 'modern' },
    { file: 'engine_cromo.png',              label: 'Motor cromado',            defaultSize: [8, 8],    category: 'engine', resolver: 'modern' },
    { file: 'engine_old.png',               label: 'Motor clássico',           defaultSize: [8, 8],    category: 'engine', resolver: 'modern' },
    { file: 'engine_red.png',               label: 'Motor vermelho',           defaultSize: [8, 8],    category: 'engine', resolver: 'modern' },
    // ── Rotativo ─────────────────────────────────────────────────────────────
    { file: 'mod_rotary_lights.png',         label: 'Luzes (modern)',           defaultSize: [12, 12],  category: 'rotary', resolver: 'modern' },
    { file: 'mod_rotary_wipers.png',         label: 'Limpadores (modern)',      defaultSize: [12, 12],  category: 'rotary', resolver: 'modern' },
    { file: 'sov_rotary_lights.png',         label: 'Luzes (soviético)',        defaultSize: [12, 12],  category: 'rotary', resolver: 'sov' },
    { file: 'sov_rotary_wipers.png',         label: 'Limpadores (soviético)',   defaultSize: [12, 12],  category: 'rotary', resolver: 'sov' },
    // ── Toggle ───────────────────────────────────────────────────────────────
    { file: 'sov_tog_up.png',                label: 'Toggle cima',              defaultSize: [6, 12],   category: 'toggle', resolver: 'sov' },
    { file: 'sov_tog_mid.png',               label: 'Toggle meio',              defaultSize: [6, 12],   category: 'toggle', resolver: 'sov' },
    { file: 'sov_tog_down.png',              label: 'Toggle baixo',             defaultSize: [6, 12],   category: 'toggle', resolver: 'sov' },
    // ── Hazard ───────────────────────────────────────────────────────────────
    { file: 'hazard_black.png',              label: 'Hazard preto',             defaultSize: [8, 8],    category: 'hazard', resolver: 'modern' },
    { file: 'hazard_sq_blk.png',             label: 'Hazard quadrado',          defaultSize: [8, 8],    category: 'hazard', resolver: 'modern' },
    { file: 'sov_push_hazard.png',           label: 'Hazard push',              defaultSize: [7, 7],    category: 'hazard', resolver: 'sov' },
    { file: 'sov_push_hazard_off.png',       label: 'Hazard off',               defaultSize: [7, 7],    category: 'hazard', resolver: 'sov' },
    { file: 'sov_push_hazard_on.png',        label: 'Hazard on',                defaultSize: [7, 7],    category: 'hazard', resolver: 'sov' },
    // ── Freio ────────────────────────────────────────────────────────────────
    { file: 'sov_push_parking_brake.png',    label: 'Parking brake push',       defaultSize: [7, 7],    category: 'brake',  resolver: 'sov' },
    // ── Lâmpadas ─────────────────────────────────────────────────────────────
    { file: 'sov_lamp_red_off.png',          label: 'Lâmpada vermelha off',     defaultSize: [7, 7],    category: 'lamp',   resolver: 'sov' },
    { file: 'sov_lamp_red_on.png',           label: 'Lâmpada vermelha on',      defaultSize: [7, 7],    category: 'lamp',   resolver: 'sov' },
    { file: 'sov_lamp_green_off.png',        label: 'Lâmpada verde off',        defaultSize: [7, 7],    category: 'lamp',   resolver: 'sov' },
    { file: 'sov_lamp_green_on.png',         label: 'Lâmpada verde on',         defaultSize: [7, 7],    category: 'lamp',   resolver: 'sov' },
    { file: 'sov_lamp_blue_off.png',         label: 'Lâmpada azul off',         defaultSize: [7, 7],    category: 'lamp',   resolver: 'sov' },
    { file: 'sov_lamp_blue_on.png',          label: 'Lâmpada azul on',          defaultSize: [7, 7],    category: 'lamp',   resolver: 'sov' },
    { file: 'sov_lamp_amber_off.png',        label: 'Lâmpada âmbar off',        defaultSize: [7, 7],    category: 'lamp',   resolver: 'sov' },
    { file: 'sov_lamp_amber_on.png',         label: 'Lâmpada âmbar on',         defaultSize: [7, 7],    category: 'lamp',   resolver: 'sov' },
    // ── Gauges / Dials ───────────────────────────────────────────────────────
    { file: 'sov_dial_speed.png',            label: 'Velocímetro',              defaultSize: [18, 18],  category: 'gauge',  resolver: 'sov' },
    { file: 'sov_dial_rpm.png',              label: 'RPM',                      defaultSize: [18, 18],  category: 'gauge',  resolver: 'sov' },
    { file: 'sov_dial_fuel.png',             label: 'Combustível',              defaultSize: [12, 12],  category: 'gauge',  resolver: 'sov' },
    { file: 'sov_dial_air.png',              label: 'Pressão de ar',            defaultSize: [12, 12],  category: 'gauge',  resolver: 'sov' },
    { file: 'sov_lens.png',                  label: 'Gauge lens',               defaultSize: [12, 12],  category: 'gauge',  resolver: 'sov' },
  ];

  // Compatibilidade retroativa — qualquer código que ainda leia ASSETS_MODERN ou ASSETS_SOV
  // continua funcionando enquanto migramos a UI (remover após Fase 2).
  const ASSETS_MODERN = Object.fromEntries(
    ASSET_CATALOG.filter(a => a.resolver !== 'sov').map(a => [a.file, { label: a.label, defaultSize: a.defaultSize }])
  );
  const ASSETS_SOV = Object.fromEntries(
    ASSET_CATALOG.filter(a => a.resolver === 'sov').map(a => [a.file, { label: a.label, defaultSize: a.defaultSize }])
  );
  // PACKAGES mantido temporariamente para não quebrar UI atual (removido na Fase 2)
  const PACKAGES = [
    { id: 'modern', label: 'Pacote Moderno',   skin: 'eu_frame',  assets: ASSETS_MODERN },
    { id: 'soviet', label: 'Pacote Soviético', skin: 'sov_frame', assets: ASSETS_SOV   },
  ];
  // Lamps are passive telemetry telltales — never vehicle command keys. Catalog filtered by
  // lamp colour (red/green/blue/amber) from the asset filename.
  // Passive telltale catalog (editor-only). `behavior` drives blink vs steady in app.js.
  // Legacy ids (ind_*, blinker_*, lights, engine, retarder_auto) stay accepted via LAMP_ID_ALIASES.
  const LAMP_TELEMETRY = {
    red: [
      { id: 'hazard_alert', name: 'Hazard / Pisca-Alerta', tel: 'hazard', behavior: 'blink' },
      { id: 'trailer_brake', name: 'Freio do Reboque', tel: 'trailerBrake', behavior: 'steady' },
      { id: 'engine_stalled', name: 'Motor Desligado / Morreu', tel: 'engineStalled', behavior: 'steady' },
      { id: 'parking_brake', name: 'Freio de Mão Ativado', tel: 'park', behavior: 'steady' },
      { id: 'over_speed_alert', name: 'Alerta de Velocidade Excedida', tel: 'speedWarn', behavior: 'blink' },
      { id: 'air_pressure_critical', name: 'Pressão de Ar Crítica', tel: 'airWarn', behavior: 'blink' },
      { id: 'engine_overheat', name: 'Superaquecimento do Motor', tel: 'waterWarn', behavior: 'steady' }
    ],
    amber: [
      { id: 'hazard_alert', name: 'Hazard / Pisca-Alerta', tel: 'hazard', behavior: 'blink' },
      { id: 'fuel_reserve', name: 'Reserva de Combustível', tel: 'fuelWarn', behavior: 'steady' },
      { id: 'retarder_active', name: 'Retardador / Freio Motor Ativo', tel: 'retarderOn', behavior: 'steady' },
      { id: 'diff_lock', name: 'Bloqueio de Diferencial', tel: 'diff', behavior: 'steady' }
    ],
    green: [
      { id: 'turn_signal_single', name: 'Pisca Combinado Genérico', tel: 'blinkEither', behavior: 'blink' },
      { id: 'left_turn_signal', name: 'Seta Esquerda', tel: 'blinkL', behavior: 'blink' },
      { id: 'right_turn_signal', name: 'Seta Direita', tel: 'blinkR', behavior: 'blink' },
      { id: 'low_beam', name: 'Luz de Presença / Farol Baixo', tel: 'lightsOn', behavior: 'steady' },
      { id: 'parking_lights', name: 'Luzes de Presença (só parking)', tel: 'parking', behavior: 'steady' },
      { id: 'engine_running', name: 'Status do Motor Ligado', tel: 'engine', behavior: 'steady' },
      { id: 'cruise_active', name: 'Piloto Automático (Cruise) Ligado', tel: 'cruiseOn', behavior: 'steady' }
    ],
    blue: [
      { id: 'high_beam', name: 'Farol Alto', tel: 'high', behavior: 'steady' }
    ]
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
    cruise_on: 'cruise_active',
    cruise_control: 'cruise_active',
    retarder_auto: 'retarder_active'
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
  let activeCategory = 'all';

  function isLampAsset(asset) {
    return /(?:^|[_-])lamp[_-]|sov_lamp_/i.test(String(asset || ''));
  }
  // Analogue dial faces — passive gauges in the live app (no click, no LED, needle from telemetry).
  function isDialAsset(asset) {
    return /sov_dial_(speed|rpm|fuel|air)|(?:^|[_-])dial[_-](speed|rpm|fuel|air)\b/i.test(String(asset || ''));
  }
  function isCircularOverlayAsset(asset) {
    return isDialAsset(asset) || /(?:^|\/)sov_(?:push_)?lens\.png$/i.test(String(asset || ''));
  }
  // Rotary selector: static housing photo (sov_rotary_dial) + rotating knob crop
  // (sov_rotary_knob). The CSS icon crown is only drawn for housings with no printed legend.
  function isRotaryAsset(asset) {
    return /sov_rotary_(?:dial|base|lights|wipers)/i.test(String(asset || ''))
      || /mod_rotary_(?:lights|wipers)\.png$/i.test(String(asset || ''));
  }
  // Measured off the printed legends (0deg = 12 o'clock, clockwise positive).
  // Lights: AUTO 0, bulb -68.2, dipped beam 179.
  // Wipers: AUTO 91.4 (3h), normal 0.6 (12h), fast -84.8 (9h), OFF 180 (6h).
  // Stages stay in app.js (telemetry). The editor only stores the knob geometry.
  function modernRotaryPreset(asset) {
    const key = String(asset || '');
    if (/mod_rotary_lights\.png$/i.test(key)) {
      return {
        functionId: 'lights',
        pinAsset: 'mod_rotary_lights_knob.png',
        pinLen: 56.4,
        pinBake: 27.3,
        states: [
          { id: 'auto', deg: 0 },
          { id: 'lamp', deg: -68.2 },
          { id: 'beam', deg: 179 }
        ]
      };
    }
    // Soviet housings: same logic as the Modern ones, different art. Knob crops are 54.2% of the dial
    // square and were photographed turned 28.6deg (measured on the files).
    if (/sov_rotary_lights\.png$/i.test(key)) {
      return {
        functionId: 'lights',
        pinAsset: 'sov_rotary_lights_knob.png',
        pinLen: 54.2,
        pinBake: 28.6,
        states: [
          { id: 'off', deg: -85 },
          { id: 'parking', deg: 0 },
          { id: 'low', deg: 93 }
        ]
      };
    }
    if (/sov_rotary_wipers\.png$/i.test(key)) {
      return {
        functionId: 'wipers',
        pinAsset: 'sov_rotary_wipers_knob.png',
        pinLen: 54.2,
        pinBake: 28.6,
        states: [
          { id: 'off', deg: -88 },
          { id: 'norm', deg: 0 },
          { id: 'fast', deg: 92 }
        ]
      };
    }
    if (/mod_rotary_wipers\.png$/i.test(key)) {
      return {
        functionId: 'wipers',
        pinAsset: 'mod_rotary_wipers_knob.png',
        pinLen: 57.6,
        pinBake: 26.5,
        states: [
          { id: 'auto', deg: 91.4 },
          { id: 'norm', deg: 0.6 },
          { id: 'fast', deg: -84.8 },
          { id: 'off', deg: 180 }
        ]
      };
    }
    return null;
  }
  // One position per line: id | deg | label | icon  (icon validated against the catalog in app.js)
  function parseRotaryStates(text) {
    return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 8)
      .map((line, i) => {
        const cell = line.split('|').map((part) => part.trim());
        const deg = Number(cell[1]);
        return {
          id: (cell[0] || ('p' + i)).replace(/[^\w-]/g, '').slice(0, 20) || ('p' + i),
          stage: i,
          deg: Number.isFinite(deg) ? clamp(deg, -180, 180) : (i * 45 - 90),
          label: String(cell[2] || '').slice(0, 6),
          icon: String(cell[3] || '').replace(/[^\w-]/g, '').slice(0, 24)
        };
      });
  }
  function rotaryStatesText(states) {
    return (Array.isArray(states) ? states : []).map((st) => [st.id, st.deg, st.label || '', st.icon || ''].join(' | ')).join('\n');
  }
  function normalizeRotaryStates(raw) {
    if (!Array.isArray(raw) || !raw.length) return undefined;
    return parseRotaryStates(rotaryStatesText(raw.map((st, i) => ({
      id: String((st && st.id) || ('p' + i)),
      deg: Number((st && st.deg)),
      label: (st && st.label) || '',
      icon: (st && st.icon) || ''
    }))));
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
  function resolveLampFunctionId(functionId) {
    const id = String(functionId || '');
    if (!id) return '';
    if (LAMP_ID_ALIASES[id]) return LAMP_ID_ALIASES[id];
    return id;
  }
  // Stock asset names are identity only; custom tags (PARKING, HAZARD…) paint as overlay.
  // Text-label overlay is DEACTIVATED (Nando, 2026-10-22: feature dropped; removal tracked as a task).
  // Reversible switch: flip to false to bring the overlay back. The stored item.label stays
  // untouched because it is also the layer name shown in the Layers panel.
  const LABEL_OVERLAY_DISABLED = true;
  function buttonOverlayLabel(item) {
    if (LABEL_OVERLAY_DISABLED) return '';
    const label = String(item && item.label || '').trim();
    if (!label) return '';
    const def = getAssetDef(item.asset);
    if (def && label === def.label) return '';
    return label;
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

  function getAssetDef(key) {
    if (ASSETS_MODERN[key]) return ASSETS_MODERN[key];
    if (ASSETS_SOV[key]) return ASSETS_SOV[key];
    return customAssets.find((asset) => asset.id === key) || null;
  }
  function editorAssetSrc(entry) {
    if (entry.resolver === 'sov') return 'skins/sov/btn/' + entry.file;
    return 'skins/modern/' + entry.file;
  }
  // Round/rocker pieces are drawn as a static housing + a separate "<name>_key.png" disc/key
  // (same split app.js uses at runtime). The palette thumbnail must stack both layers, otherwise
  // the housing alone looks like an empty socket. Returns null for pieces with no key layer.
  // The regex mirrors app.js isSegRound/isSegRocker so editor and app agree on what has a key.
  function editorKeyLayer(entry) {
    const file = String(entry && entry.file || '');
    const kind = /(?:mod_rocker_|sov_rocker_)[^/]*(?<!_key)\.png$/i.test(file)
      ? 'rocker'
      : (/(?:mod_round_|sov_round_)[^/]*(?<!_key)\.png$/i.test(file) ? 'round' : null);
    if (!kind) return null;
    const keyFile = file.replace(/\.png$/i, '_key.png');
    return { kind, file: keyFile, src: editorAssetSrc({ resolver: /^sov_/i.test(file) ? 'sov' : 'modern', file: keyFile }) };
  }

  function assetImageSrc(key) {
    // Modern rotary housings and their knob crops always live under skins/modern,
    // even if the piece is dropped onto another board.
    if (/^mod_rotary_/i.test(String(key || ''))) return 'skins/modern/' + key;
    if (/^sov_rotary_(?:knob|lights_knob|wipers_knob)\.png$/i.test(String(key || ''))) return 'skins/sov/btn/' + key;
    // Prefer the active skin's pack when a key exists in both (e.g. btn-rocker-v.png).
    if (state.skin === 'sov_frame' && ASSETS_SOV[key]) return 'skins/sov/btn/' + key;
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
      sovBg: 'white',
      gridStep: 1,
      snap: true,
      guides: true,
      boards: {
        eu_frame: freshBoard(),
        sov_frame: freshBoard(),
        // White enamel niches differ from Siga/Viva — isolated empty board for remapping.
        sov_white: freshBoard(),
        // Military 1 and Military 2 are independent boards (decoupled 2026-10-19 —
        // editing one must never touch the other's layout).
        sov_military_1: freshBoard(),
        sov_military_2: freshBoard()
      }
    };
  }
  function sovBoardKey(sovBg) {
    const v = normalizeSovBg(sovBg);
    if (v === 'white') return 'sov_white';
    if (v === 'military1') return 'sov_military_1';
    if (v === 'military2') return 'sov_military_2';
    // sigabem | vivamexico | 380 | 378 → shared Siga Bem / Viva México skeleton
    return 'sov_frame';
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

  // SSOT: a board KEY present in a payload is authoritative for that board, even when
  // its buttons array is empty (an intentionally cleared panel). Only a key that is
  // completely ABSENT from the payload is considered unmapped there.
  const BOARD_KEYS = ['eu_frame', 'sov_frame', 'sov_white', 'sov_military_1', 'sov_military_2'];

  function boardForKey(payload, key) {
    if (!payload) return null;
    if (!payload.boards) return key === 'eu_frame' && payload.orientations ? payload : null;
    let board = payload.boards[key];
    // Migration: Military 1 and 2 used to share one board (boards.sov_military); before that,
    // two ultra-legacy standalone keys (sov_military1/2, no underscore). Military 1 inherits the
    // shared board's data once; Military 2 never does — it was never that board's real content.
    if (!board && key === 'sov_military_1') board = payload.boards.sov_military || payload.boards.sov_military1;
    if (!board && key === 'sov_military_2') board = payload.boards.sov_military2;
    return board || null;
  }

  function boardPresent(payload, key) {
    const board = boardForKey(payload, key);
    return !!(board && board.orientations);
  }

  // Server is authoritative per board key. A key missing entirely from the server
  // (never mapped there) seeds from this browser's local cache; a key present on the
  // server -- even with buttons:[] -- never gets overwritten by a stale local copy.
  function mergeBoardsPerKey(serverPayload, localPayload) {
    const base = serverPayload || localPayload || null;
    if (!base) return { payload: null, seeded: false };
    const merged = JSON.parse(JSON.stringify(base));
    if (!merged.boards) merged.boards = {};
    let seeded = false;
    BOARD_KEYS.forEach((key) => {
      if (boardPresent(serverPayload, key)) return;
      if (boardPresent(localPayload, key)) {
        merged.boards[key] = boardForKey(localPayload, key);
        seeded = true;
      }
    });
    return { payload: merged, seeded };
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
    fresh.sovBg = normalizeSovBg(saved.sovBg);
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
    BOARD_KEYS.forEach((skinKey) => {
      // Military 1 inherits the old shared sov_military board once; Military 2 starts clean.
      let savedBoard = saved.boards && boardForKey(saved, skinKey);
      if (!savedBoard && skinKey === 'eu_frame' && !saved.boards) savedBoard = saved;
      if (!savedBoard || !savedBoard.orientations) return;
      if (!fresh.boards[skinKey]) fresh.boards[skinKey] = freshBoard();
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
    const { payload: merged, seeded } = mergeBoardsPerKey(serverPayload, localPayload);
    if (seeded) needsSeedPush = true;
    rescuePayload = computeRescue(serverPayload, localPayload); // BEFORE applyPayload/persist overwrite localStorage
    return applyPayload(merged);
  }

  let pushTimer = null;
  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      // Initial offline-cache recovery must seed every board, not only the selected one.
      const boards = {};
      Object.entries(state.boards).forEach(([key, board]) => {
        const orientations = {};
        Object.entries(board.orientations).forEach(([mode, data]) => {
          orientations[mode] = { buttons: data.buttons.map(exportElement), zones: data.zones.map(exportElement) };
        });
        boards[key] = { orientations };
      });
      pushToServer({ ...state, boards, customAssets });
    }, 600);
  }
  // Only two callers left: saveNow() (explicit Salvar button / Ctrl+S) and the one-time boot
  // reconciliation (needsSeedPush) that seeds the bridge when it has no board yet but this
  // browser's localStorage does. Neither fires on a plain edit anymore -- see persist() above.
  // Always reports a failure -- a silently-ignored res.ok used to make "PIN wrong" or "bridge
  // offline" look identical to "saved fine", which is what made the tablet desync invisible.
  async function pushToServer(payload = buildReport()) {
    const text = JSON.stringify(payload);
    try {
      const res = await fetch('/api/atomic-layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Pin': resolvePin() },
        body: text
      });
      if (!res.ok) {
        const message = res.status === 401
          ? 'PIN incorreto ou ausente - o bridge recusou o salvamento.'
          : 'Falha ao salvar no bridge (HTTP ' + res.status + ').';
        announce(message, 'error');
        return { ok: false, message };
      }
      return { ok: true };
    } catch (error) {
      const message = 'Bridge inacessível - alterações ficaram só neste navegador. (' + (error && error.message || error) + ')';
      announce(message, 'error');
      return { ok: false, message };
    }
  }
  // ---- Drafts and rescue ------------------------------------------------------------------
  // Why this exists: at load the SERVER wins per board (see mergeBoardsPerKey) and every board
  // already exists there, so anything edited but not yet published used to be dropped on the next
  // reload. Three safety nets, none of which touches the bridge or the tablet:
  //  1. rescue   - at boot, unpublished work found in localStorage is copied to its own key and
  //                offered back through the "Recuperar trabalho local" button.
  //  2. drafts   - "Salvar rascunho" downloads ALL boards to a .json; "Retomar rascunho" loads it.
  //  3. warning  - closing/reloading with changes since the last draft/publish asks first.
  const RESCUE_KEY = 'truckdeck.atomic.rescue.v1';
  let unsavedWork = false;
  let rescuePayload = null; // { savedAt, boards: { key: board in server (w/h) format }, customAssets }

  function toServerBoard(board) {
    const out = { orientations: {} };
    const conv = (item) => {
      if (item && item.w === undefined && item.width !== undefined) { const { width, height, ...rest } = item; return { ...rest, w: width, h: height }; }
      return item;
    };
    Object.entries((board && board.orientations) || {}).forEach(([mode, data]) => {
      out.orientations[mode] = { buttons: ((data && data.buttons) || []).map(conv), zones: ((data && data.zones) || []).map(conv) };
    });
    return out;
  }
  // Order-independent fingerprint of everything a user can change on a board.
  function boardSignature(board) {
    const r2 = (n) => Math.round(Number(n) * 100) / 100;
    const parts = [];
    ['landscape', 'portrait'].forEach((mode) => {
      const data = board && board.orientations && board.orientations[mode];
      ['buttons', 'zones'].forEach((kind) => {
        ((data && data[kind]) || []).forEach((i) => parts.push([mode, kind, i.id, i.asset, i.functionId, i.label,
          r2(i.x), r2(i.y), r2(i.w), r2(i.h), JSON.stringify(i.pictogram || null), 
          i.color || '', i.hidden ? 1 : 0].join('|')));
      });
    });
    return parts.sort().join('\n');
  }
  function findUnpublishedBoards(serverPayload, localPayload) {
    const found = {};
    if (!serverPayload || !localPayload || localPayload.schema !== initialState().schema) return found;
    BOARD_KEYS.forEach((key) => {
      if (!boardPresent(localPayload, key) || !boardPresent(serverPayload, key)) return; // a board missing on the server is seeded by mergeBoardsPerKey
      const local = toServerBoard(boardForKey(localPayload, key));
      const hasContent = ['landscape', 'portrait'].some((m) => local.orientations[m] && local.orientations[m].buttons.length);
      if (!hasContent) return; // an empty local board is nothing worth rescuing
      if (boardSignature(toServerBoard(boardForKey(serverPayload, key))) === boardSignature(local)) return; // already published
      found[key] = local;
    });
    return found;
  }
  // The layout in localStorage can be ~3 MB (custom assets are inlined), so a rescue copy of
  // everything would blow the ~5 MB quota. Keep only the custom assets the rescued boards use.
  function referencedCustomAssets(boards, list) {
    const used = new Set();
    Object.values(boards).forEach((board) => Object.values((board && board.orientations) || {}).forEach((data) => {
      ((data && data.buttons) || []).forEach((item) => { if (item && item.asset) used.add(item.asset); });
    }));
    return (Array.isArray(list) ? list : []).filter((a) => a && used.has(a.id));
  }
  function computeRescue(serverPayload, localPayload) {
    const fresh = findUnpublishedBoards(serverPayload, localPayload);
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(RESCUE_KEY) || 'null'); } catch (error) { stored = null; }
    const boards = {};
    // Older rescue entries stay only while the server still differs from them (once published they are stale).
    if (stored && stored.boards && serverPayload) {
      Object.entries(stored.boards).forEach(([key, board]) => {
        if (!BOARD_KEYS.includes(key) || !boardPresent(serverPayload, key)) return;
        if (boardSignature(toServerBoard(boardForKey(serverPayload, key))) !== boardSignature(toServerBoard(board))) boards[key] = board;
      });
    }
    Object.assign(boards, fresh);
    if (!Object.keys(boards).length) { try { localStorage.removeItem(RESCUE_KEY); } catch (error) { /* ignore */ } return null; }
    const gotFresh = Object.keys(fresh).length > 0;
    const out = {
      savedAt: gotFresh ? new Date().toISOString() : (stored && stored.savedAt) || new Date().toISOString(),
      boards,
      customAssets: referencedCustomAssets(boards, (gotFresh && localPayload && Array.isArray(localPayload.customAssets)) ? localPayload.customAssets : ((stored && stored.customAssets) || []))
    };
    try { localStorage.setItem(RESCUE_KEY, JSON.stringify(out)); } catch (error) { /* quota: the in-memory copy still serves this session */ }
    return out;
  }
  // All boards in server (w/h) format, whichever one is on screen. Same shape schedulePush() sends.
  function buildAllBoardsPayload() {
    const boards = {};
    Object.entries(state.boards).forEach(([key, board]) => {
      const orientations = {};
      Object.entries(board.orientations).forEach(([mode, data]) => {
        orientations[mode] = { buttons: data.buttons.map(exportElement), zones: data.zones.map(exportElement) };
      });
      boards[key] = { orientations };
    });
    return { ...state, boards, customAssets };
  }
  // Replaces only the boards present in `source`, through the same validated path a server refetch uses.
  function applyBoardsFromPayload(source) {
    const base = buildAllBoardsPayload();
    Object.keys(source.boards || {}).forEach((key) => {
      if (BOARD_KEYS.includes(key) && boardPresent(source, key)) base.boards[key] = toServerBoard(boardForKey(source, key));
    });
    if (Array.isArray(source.customAssets)) {
      const have = new Set(base.customAssets.map((a) => a && a.id));
      source.customAssets.forEach((a) => { if (a && typeof a.id === 'string' && !have.has(a.id)) base.customAssets.push(a); });
    }
    state = applyPayload(base);
    activePackageId = packageIdForSkin(state.skin);
    selection = [];
    persist(); renderCustomAssetTools(); renderShippedAssetTools(); render();
  }
  function refreshRescueButton() {
    const btn = $('#rescueButton');
    if (!btn) return;
    const n = rescuePayload ? Object.keys(rescuePayload.boards).length : 0;
    btn.hidden = !n;
    const discard = $('#rescueDiscardButton');
    if (discard) discard.hidden = !n;
    if (n) btn.textContent = 'Recuperar trabalho local (' + n + (n === 1 ? ' painel)' : ' painéis)');
  }
  // Drops the stale local copy for good. writeLocal() is what makes it stick: without it the old
  // localStorage layout would simply re-trigger the rescue offer on the next load.
  function discardRescue() {
    if (!rescuePayload) return;
    const ok = window.confirm('Descartar o trabalho local não publicado?\n\nIsto apaga a cópia guardada neste navegador. Se quiser guardá-la antes, clique em "Recuperar", depois em "Salvar rascunho".');
    if (!ok) return;
    rescuePayload = null;
    try { localStorage.removeItem(RESCUE_KEY); } catch (error) { /* ignore */ }
    writeLocal();
    refreshRescueButton();
    toast('Cópia local descartada.', 'success');
    announce('Cópia local descartada.', 'success');
  }
  function applyRescue() {
    if (!rescuePayload) return;
    const count = Object.keys(rescuePayload.boards).length;
    pushHistory(); // so Ctrl+Z brings back what was on screen before
    applyBoardsFromPayload(rescuePayload);
    try { localStorage.removeItem(RESCUE_KEY); } catch (error) { /* ignore */ }
    rescuePayload = null;
    refreshRescueButton();
    toast('Trabalho local recuperado (' + count + ' painel/painéis). Ctrl+Z desfaz. Ainda não foi publicado.', 'success');
    announce('Trabalho local recuperado.', 'success');
  }
  function saveDraft() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
    const payload = { ...buildAllBoardsPayload(), draft: { savedAt: d.toISOString() } };
    download('truckdeck-rascunho-' + stamp + '.json', JSON.stringify(payload, null, 2), 'application/json');
    unsavedWork = false;
    const pending = auditBoards(BOARD_KEYS);
    if (pending.length) {
      showProblems(pending, 'Rascunho salvo em Downloads.');
    } else {
      toast('Rascunho salvo (todos os painéis) na pasta Downloads. Nada foi enviado ao tablet.', 'success');
      announce('Rascunho salvo.', 'success');
    }
  }
  function validateDraft(report) {
    if (!report || report.schema !== state.schema) throw new Error('o arquivo não é um layout do TruckDeck.');
    if (!report.boards || typeof report.boards !== 'object') throw new Error('o arquivo não tem painéis.');
    const keys = Object.keys(report.boards).filter((k) => BOARD_KEYS.includes(k));
    if (!keys.length) throw new Error('nenhum painel reconhecido.');
    keys.forEach((key) => {
      ['landscape', 'portrait'].forEach((mode) => {
        const o = report.boards[key] && report.boards[key].orientations && report.boards[key].orientations[mode];
        if (!o || !Array.isArray(o.buttons) || !Array.isArray(o.zones)) throw new Error('painel ' + key + ' incompleto (' + mode + ').');
        const ids = new Set();
        o.buttons.concat(o.zones).forEach((item) => {
          if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)
              || ['x', 'y', 'w', 'h'].some((f) => !Number.isFinite(item[f]))
              || item.x < 0 || item.y < 0 || item.x > 100 || item.y > 100 || item.w <= 0 || item.h <= 0 || item.w > 100 || item.h > 100) {
            throw new Error('elemento inválido em ' + key + '/' + mode + '.');
          }
          ids.add(item.id);
        });
      });
    });
    return keys;
  }
  async function loadDraft(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const report = JSON.parse(await file.text());
      const keys = validateDraft(report); // validate everything before touching state
      pushHistory();
      applyBoardsFromPayload(report);
      unsavedWork = true;
      toast('Rascunho carregado (' + keys.length + ' painel/painéis). Ainda não foi enviado ao tablet.', 'success');
      announce('Rascunho carregado.', 'success');
    } catch (error) {
      const message = 'Rascunho inválido: ' + (error && error.message || error);
      toast(message, 'error');
      announce(message, 'error');
    } finally {
      input.value = '';
    }
  }
  window.addEventListener('beforeunload', (event) => {
    if (!unsavedWork) return;
    event.preventDefault();
    event.returnValue = ''; // the browser shows its own generic "leave site?" prompt
  });

  // ---- Pre-send check: keys / lights with no function ----------------------------------------
  // Runs on "Publicar no tablet" (active board, asks before sending), on "Salvar rascunho" (all
  // boards, warns only) and on the "Verificar" button. Flagged pieces get a red silhouette that
  // pulses for PROBLEM_FLASH_MS. The rules mirror what app.js does at runtime, so this never
  // cries wolf on pieces the app already handles:
  //  - dials and the glass lens are passive by design;
  //  - parking / hazard pushes and the lights / wipers rotaries get their function from the art
  //    when functionId is empty (fnHint in app.js);
  //  - a lamp with no functionId stays inert ("colour NEVER determines function").
  const PROBLEM_FLASH_MS = 6000;
  const BOARD_LABELS = { eu_frame: 'Modern', sov_frame: 'Siga Bem / Viva México', sov_white: 'Soviet · Branca', sov_military_1: 'Soviet · Military 1', sov_military_2: 'Soviet · Military 2' };
  const PROBLEM_REASONS = { 'key-none': 'tecla sem função', 'key-invalid': 'função inexistente', 'lamp-none': 'luz sem função', 'lamp-invalid': 'indicador inexistente' };
  const IMPLICIT_FUNCTION_ASSET = /sov_toggle_parking_brake|sov_push_parking_brake|sov_push_hazard(?:_off|_on)?(?:\.|$)|sov_rotary_(?:dial|base|lights|wipers)|mod_rotary_(?:lights|wipers)\.png$/i;
  let problemFlash = null; // { until, keys: Set('board|orientation|id') }
  let problemTimer = null;

  function allLampIds() {
    const ids = new Set();
    Object.values(LAMP_TELEMETRY).forEach((list) => list.forEach((entry) => ids.add(entry.id)));
    return ids;
  }
  // null when the button is fine, otherwise { kind: 'key'|'lamp', code }.
  function buttonProblem(item, lampIds) {
    if (!item || item.hidden) return null;
    const asset = String(item.asset || '');
    if (isCircularOverlayAsset(asset)) return null; // dials + lens: passive, no function by design
    const fid = String(item.functionId || '');
    if (isLampAsset(asset)) {
      if (!fid) return { kind: 'lamp', code: 'lamp-none' };
      return lampIds.has(resolveLampFunctionId(fid)) ? null : { kind: 'lamp', code: 'lamp-invalid' };
    }
    if (!fid) return IMPLICIT_FUNCTION_ASSET.test(asset) ? null : { kind: 'key', code: 'key-none' };
    return fnOf(item) ? null : { kind: 'key', code: 'key-invalid' };
  }
  function auditBoards(keys) {
    const lampIds = allLampIds();
    const out = [];
    keys.forEach((key) => {
      const board = state.boards[key];
      if (!board) return;
      ['landscape', 'portrait'].forEach((mode) => {
        const data = board.orientations && board.orientations[mode];
        ((data && data.buttons) || []).forEach((item) => {
          const problem = buttonProblem(item, lampIds);
          if (problem) out.push({ key, mode, id: item.id, asset: item.asset, kind: problem.kind, code: problem.code });
        });
      });
    });
    return out;
  }
  function summarizeProblems(problems) {
    const keys = problems.filter((p) => p.kind === 'key').length;
    const lamps = problems.filter((p) => p.kind === 'lamp').length;
    const parts = [];
    if (keys) parts.push(keys + (keys === 1 ? ' tecla' : ' teclas') + ' sem função');
    if (lamps) parts.push(lamps + (lamps === 1 ? ' luz' : ' luzes') + ' sem função');
    return parts.join(' e ');
  }
  function describeProblems(problems, max = 8) {
    const lines = problems.slice(0, max).map((p) => '• ' + (BOARD_LABELS[p.key] || p.key) + ' · ' + p.mode + ' · ' + p.id + ' — ' + PROBLEM_REASONS[p.code]);
    if (problems.length > max) lines.push('• … e mais ' + (problems.length - max));
    return lines.join('\n');
  }
  // True while a red silhouette should be drawn on this button (checked by renderStage).
  function isFlaggedNow(item) {
    return !!(problemFlash && Date.now() < problemFlash.until && problemFlash.keys.has(activeBoardKey() + '|' + orientation + '|' + item.id));
  }
  function showProblems(problems, prefix) {
    clearTimeout(problemTimer);
    problemFlash = { until: Date.now() + PROBLEM_FLASH_MS, keys: new Set(problems.map((p) => p.key + '|' + p.mode + '|' + p.id)) };
    problemTimer = setTimeout(() => { problemFlash = null; renderStage(); }, PROBLEM_FLASH_MS);
    renderStage();
    const here = problems.filter((p) => p.key === activeBoardKey() && p.mode === orientation).length;
    const elsewhere = problems.length - here;
    let message = (prefix ? prefix + ' ' : '') + 'Atenção: ' + summarizeProblems(problems) + '.';
    if (here) message += ' Em vermelho nesta tela: ' + here + '.';
    if (elsewhere) message += ' Em outro painel ou orientação: ' + elsewhere + ' (troque de tela para vê-las piscar com "Verificar").';
    toast(message, 'warn');
    announce(message, 'warn');
  }
  function runCheck() {
    const problems = auditBoards(BOARD_KEYS);
    if (!problems.length) {
      toast('Tudo certo: nenhuma tecla ou luz sem função.', 'success');
      announce('Verificação concluída: nenhuma pendência.', 'success');
      return;
    }
    showProblems(problems);
  }
  // Lets the red silhouette reach the screen before a blocking confirm() dialog opens.
  function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 60)));
  }

  async function saveNow() {
    // Pre-send check: only the board being sent (buildReport sends the active one).
    const pending = auditBoards([activeBoardKey()]);
    if (pending.length) {
      showProblems(pending);
      await nextPaint();
      const proceed = window.confirm('Esta tela tem ' + summarizeProblems(pending) + ':\n\n' + describeProblems(pending) + '\n\nPublicar no tablet mesmo assim?');
      if (!proceed) {
        toast('Publicação cancelada. Corrija o que está em vermelho.', 'error');
        announce('Publicação cancelada: há teclas ou luzes sem função.', 'error');
        return;
      }
    }
    clearTimeout(pushTimer);
    writeLocal();
    const btn = $('#saveButton');
    if (btn) btn.disabled = true;
    announce('A salvar...', 'pending');
    toast('A salvar...', 'pending');
    const result = await pushToServer();
    if (btn) btn.disabled = false;
    if (result.ok) {
      unsavedWork = false;
      announce('Painel Publicado!', 'success');
      toast('Painel Publicado!', 'success');
    } else {
      announce(result.message, 'error');
      toast(result.message, 'error');
    }
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
    // The lever widget was removed in 8a6706d; any board saved before that still references
    // these two assets and must land on the standard toggle (same functionId), not btn-square.
    const rawAsset = /^sov_toggle_parking_brake_(up|down)\.png$/.test(item.asset)
      ? 'sov_tog_up.png' : item.asset;
    const resolved = getAssetDef(rawAsset);
    const asset = resolved ? rawAsset : 'btn-square.png';
    const def = resolved || ASSETS_MODERN['btn-square.png'];
    const out = {
      id: String(item.id || uid('button')),
      asset,
      label: String(item.label || def.label),
      functionId: String(item.functionId || (rawAsset !== item.asset ? 'parking_brake' : '')),
      pictogram: normalizePictogram(item.pictogram),
      pictogramHidden: Boolean(item.pictogramHidden),
      x: clamp(numOr(item.x, 10), 0, 99),
      y: clamp(numOr(item.y, 10), 0, 99),
      width: clamp(Number(item.w ?? item.width) || def.defaultSize[0], .2, 100),
      height: clamp(Number(item.h ?? item.height) || def.defaultSize[1], .2, 100),
      zIndex: Number(item.zIndex) || 10,
      hidden: Boolean(item.hidden)
    };
    const color = normalizeElementColor(item.color);
    if (color) out.color = color;
    if (isRotaryAsset(asset)) {
      // Rotary extras survive save / export / import (normalizeButton is a strict whitelist).
      // Modern detents are NOT written here: line order would replace the telemetry stage.
      // An empty `states` array lets app.js apply the measured preset for that asset.
      const preset = modernRotaryPreset(asset);
      if (!out.functionId && preset) out.functionId = preset.functionId;
      const states = normalizeRotaryStates(item.states);
      if (states) out.states = states;
      const pinAsset = item.pinAsset || (preset && preset.pinAsset);
      if (pinAsset) out.pinAsset = String(pinAsset).slice(0, 120);
      out.crownR = clamp(numOr(item.crownR, 42), 0, 48);
      out.pinLen = clamp(numOr(item.pinLen, preset ? preset.pinLen : 58), 20, 100);
      out.pinBake = clamp(numOr(item.pinBake, preset ? preset.pinBake : 24.1), -180, 180);
    }
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
      x: clamp(numOr(item.x, 10), 0, 99),
      y: clamp(numOr(item.y, 10), 0, 99),
      width: clamp(Number(item.w ?? item.width) || DASHBOARDS[type].defaultSize[0], .2, 100),
      height: clamp(Number(item.h ?? item.height) || DASHBOARDS[type].defaultSize[1], .2, 100),
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
    unsavedWork = true;
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

  function activeBoardKey() {
    if (state.skin === 'sov_frame') return sovBoardKey(state.sovBg);
    return state.skin;
  }
  function activeBoard() {
    const key = activeBoardKey();
    if (!state.boards[key]) state.boards[key] = freshBoard();
    return state.boards[key];
  }
  function currentBoard() { return activeBoard().orientations[orientation]; }
  function allElements() { return currentBoard().buttons.map((item) => ({ kind: 'button', item })).concat(currentBoard().zones.map((item) => ({ kind: 'zone', item }))); }
  function findElement(kind, id) { return allElements().find((entry) => entry.kind === kind && entry.item.id === id); }
  function isSelected(kind, id) { return selection.some((entry) => entry.kind === kind && entry.id === id); }

  function init() {
    // Below 1120px (editor.css) both side panels become bottom drawers; each toggle button
    // opens the drawer it lives inside (toolbox's "Adicionar tecla", inspector's "Camadas &
    // Inspector"). No-op above that width, where both panels are already fully visible.
    for (const toggle of $$('.drawer-toggle')) {
      const drawer = toggle.closest('.toolbox, .inspector');
      if (!drawer) continue;
      const openLabel = toggle.textContent;
      toggle.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.textContent = isOpen ? 'Fechar' : openLabel;
      });
    }
    const packaged = document.body.dataset.editorMode === 'packaged';
    if (packaged) {
      const backgroundUploadButton = $('#backgroundInput').closest('.file-button');
      if (backgroundUploadButton) backgroundUploadButton.hidden = true;
      const customAssetButton = $('.custom-asset-button');
      if (customAssetButton) customAssetButton.hidden = true;
    }
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
    document.querySelectorAll('#categoryFilter .cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#categoryFilter .cat-btn')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.cat;
        renderShippedAssetTools();
      });
    });    $$('.dashboard-tool').forEach(bindTool);
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
    $('#fitButton').addEventListener('click', () => {
      fitStage(officialOf(orientation));
      $('.canvas-scroll').scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      announce('Prancheta ajustada à área visível.');
    });
    window.addEventListener('resize', () => fitStage(officialOf(orientation)));
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
    $('#draftSaveButton').addEventListener('click', saveDraft);
    $('#draftLoadButton').addEventListener('click', () => $('#draftInput').click());
    $('#draftInput').addEventListener('change', loadDraft);
    $('#checkButton').addEventListener('click', runCheck);
    $('#rescueButton').addEventListener('click', applyRescue);
    $('#rescueDiscardButton').addEventListener('click', discardRescue);
    $('#saveLocalButton').addEventListener('click', () => {
      writeLocal();
      announce('Estado salvo localmente.', 'success');
      toast('Estado salvo localmente.', 'success');
    });
    $('#importButton').addEventListener('click', () => $('#importInput').click());
    $('#saveButton').addEventListener('click', saveNow);
    $('#importInput').addEventListener('change', importReport);
    $('#undoButton').addEventListener('click', undo);
    $('#redoButton').addEventListener('click', redo);
    $('#selectedFunctionId').innerHTML = buildFunctionOptionsHtml();
    ['selectedId', 'selectedLabel'].forEach((id) => {
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
    const applyRotaryBtn = $('#applyRotaryButton');
    if (applyRotaryBtn) applyRotaryBtn.addEventListener('click', applySelectedRotary);
    $('#resetPictogramButton').addEventListener('click', resetPictogram);
    ['selectedX', 'selectedY'].forEach((id) => $('#' + id).addEventListener('change', updateSelectedCoordinates));
    [['selectedWRange', 'selectedW'], ['selectedHRange', 'selectedH'], ['selectedSizeRange', 'selectedSize']].forEach(([rangeId, numberId]) => {
      const range = $('#' + rangeId);
      const number = $('#' + numberId);
      range.addEventListener('input', () => { number.value = range.value; updateSelectedCoordinates(); });
      number.addEventListener('input', () => { range.value = number.value; updateSelectedCoordinates(); });
      number.addEventListener('change', updateSelectedCoordinates);
    });
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
    state.sovBg = normalizeSovBg(state.sovBg);
    selection = [];
    renderShippedAssetTools();
    render();
    announce(skin === 'sov_frame' ? 'Tema Soviético — empty plate + widgets PNG.' : 'Tema Modern — empty plate + rockers.');
  }

  function setSovBg(variant) {
    const next = normalizeSovBg(variant);
    if (state.sovBg === next) return;
    const prevKey = activeBoardKey();
    state.sovBg = next;
    // Ensure the isolated military board exists before paint; never copy/overwrite sov_frame.
    if (!state.boards[activeBoardKey()]) state.boards[activeBoardKey()] = freshBoard();
    // Drop session override so the official variant plate paints immediately.
    delete runtimeBackgrounds[orientation];
    selection = [];
    persist();
    render();
    const note = (prevKey !== activeBoardKey())
      ? ' (mapa isolado: ' + activeBoardKey() + ')'
      : '';
    announce('Fundo soviético: ' + (SOV_BG_LABELS[next] || next) + note + '.');
  }

  function renderShippedAssetTools() {
    const list = $('#assetList');
    if (!list) return;
    $$('.asset-tool:not(.is-custom), .package-group', list).forEach((node) => node.remove());
    // Filtro por categoria
    const items = activeCategory === 'all'
      ? ASSET_CATALOG
      : ASSET_CATALOG.filter(a => a.category === activeCategory);
    const fragment = document.createDocumentFragment();
    const group = document.createElement('div');
    group.className = 'package-group';
    group.dataset.category = activeCategory;
    const heading = document.createElement('div');
    heading.className = 'package-heading';
    const activeButton = document.querySelector('#categoryFilter .cat-btn.active');
    const categoryLabel = activeButton ? activeButton.textContent : 'Todos';
    heading.innerHTML = '<span>' + escapeHtml(categoryLabel) + '</span><span class="package-kicker">CATEGORIA</span>';
    group.appendChild(heading);
    items.forEach((entry) => {
      const key = entry.file;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'asset-tool';
      button.draggable = true;
      button.dataset.asset = key;
      button.dataset.label = entry.label;
      button.dataset.package = entry.resolver === 'sov' ? 'soviet' : 'modern';
      const wide = entry.defaultSize[0] > entry.defaultSize[1] * 1.6;
      const keyLayer = editorKeyLayer(entry);
      // .asset-stack shrink-wraps the housing image so the key layer's % inset matches the app.
      const thumb = keyLayer
        ? '<span class="asset-stack"><img src="' + editorAssetSrc(entry) + '" alt=""><img class="asset-key asset-key-' + keyLayer.kind + '" src="' + keyLayer.src + '" alt=""></span>'
        : '<img src="' + editorAssetSrc(entry) + '" alt="">';
      button.innerHTML = '<span class="asset-preview' + (wide ? ' asset-preview-wide' : '') + '">' + thumb + '</span><span><strong>' + escapeHtml(entry.label) + '</strong><small>' + escapeHtml(key) + '</small></span>';
      bindTool(button);
      group.appendChild(button);
    });
    fragment.appendChild(group);
    const firstCustom = list.querySelector('.asset-tool.is-custom');
    if (firstCustom) list.insertBefore(fragment, firstCustom);
    else list.appendChild(fragment);
    const buttonsTitle = $('#buttonsPackageTitle');
    if (buttonsTitle) buttonsTitle.textContent = categoryLabel;
    const buttonsKicker = $('#buttonsPackageKicker');
    if (buttonsKicker) buttonsKicker.textContent = 'CATEGORIA';
  }
  // Scale the stage box with object-fit:contain math so portrait (tall) plates
  // fit fully inside .canvas-scroll — no top/bottom crop from overflow:hidden + cover.
  function fitStage(bg) {
    const scroll = $('.canvas-scroll');
    const wrap = $('.stage-wrap');
    if (!scroll || !wrap || !bg) return;
    const pad = 40; // matches .canvas-scroll padding
    const availW = Math.max(120, scroll.clientWidth - pad);
    const availH = Math.max(120, scroll.clientHeight - pad);
    const ar = bg.width / bg.height;
    const maxW = Math.min(availW, 1050);
    const w = Math.min(maxW, availH * ar);
    wrap.style.width = Math.round(w) + 'px';
  }

  function render() {
    const board = currentBoard();
    const bg = officialOf(orientation);
    const stage = $('#stage');
    stage.dataset.orientation = orientation;
    stage.dataset.skin = state.skin;
    stage.style.setProperty('--stage-aspect', bg.width + ' / ' + bg.height);
    stage.style.backgroundImage = 'url("' + (runtimeBackgrounds[orientation] || bg.src) + '")';
    fitStage(bg);
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
    if (sovSelect) sovSelect.value = normalizeSovBg(state.sovBg);
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
    const stage = $('#stage');
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
        // aspect-ratio cannot override two definite inline dimensions. Gauges and the glass
        // lens therefore receive a real square box, centred inside the mapped rectangle.
        const rotary = isRotaryAsset(item.asset);
        if (isCircularOverlayAsset(item.asset) || rotary) {
          const boxW = stage.clientWidth * item.width / 100;
          const boxH = stage.clientHeight * item.height / 100;
          const side = Math.min(boxW, boxH);
          if (!rotary) node.classList.add('is-circular-overlay');
          if (rotary) node.classList.add('is-rotary');
          node.style.left = 'calc(' + item.x + '% + ' + ((boxW - side) / 2) + 'px)';
          node.style.top = 'calc(' + item.y + '% + ' + ((boxH - side) / 2) + 'px)';
          node.style.width = side + 'px';
          node.style.height = side + 'px';
        }
        const img = document.createElement('img');
        img.src = assetImageSrc(item.asset);
        img.alt = item.label || item.asset;
        node.appendChild(img);
        const catalogEntry = ASSET_CATALOG.find((entry) => entry.file === item.asset);
        const keyLayer = editorKeyLayer(catalogEntry);
        if (keyLayer && keyLayer.src) {
          const keyImg = document.createElement('img');
          keyImg.className = 'canvas-key canvas-key-' + keyLayer.kind;
          keyImg.src = keyLayer.src;
          keyImg.alt = '';
          keyImg.setAttribute('aria-hidden', 'true');
          // Box comes from keyboxes.js (fractions of the housing) so the key stretches WITH the housing.
          const kb = window.KEY_BOXES && window.KEY_BOXES[item.asset];
          if (kb) { keyImg.style.left = kb[0] + '%'; keyImg.style.top = kb[1] + '%'; keyImg.style.width = kb[2] + '%'; keyImg.style.height = kb[3] + '%'; keyImg.style.inset = 'auto'; keyImg.style.left = kb[0] + '%'; keyImg.style.top = kb[1] + '%'; }
          keyImg.draggable = false;
          node.appendChild(keyImg);
        }
        if (rotary) {
          const preset = modernRotaryPreset(item.asset);
          const states = (item.states && item.states.length) ? item.states : (preset && preset.states);
          const st = states && states[0];
          const deg = st && Number.isFinite(Number(st.deg)) ? Number(st.deg) : 0;
          const bake = numOr(item.pinBake, preset ? preset.pinBake : 24.1);
          const pinLen = numOr(item.pinLen, preset ? preset.pinLen : 58);
          const pinKey = item.pinAsset || (preset && preset.pinAsset) || 'sov_rotary_knob.png';
          const pin = document.createElement('img');
          pin.className = 'rotary-pin';
          pin.alt = '';
          pin.src = assetImageSrc(pinKey);
          pin.style.setProperty('--pin-turn', (deg - bake) + 'deg');
          node.appendChild(pin);
          node.style.setProperty('--pin-size', pinLen + '%');
        }
        if (item.color) {
          node.classList.add('has-tint');
          const artSrc = assetImageSrc(item.asset);
          if (artSrc) node.style.setProperty('--art-url', 'url("' + artSrc.replace(/\\/g, '/').replace(/"/g, '\\"') + '")');
          const tint = document.createElement('span');
          tint.className = 'tint-overlay';
          tint.style.background = item.color;
          node.appendChild(tint);
        }
        if (isFlaggedNow(item)) {
          // Red silhouette = the art's own alpha shape used as a mask, so it follows the key outline.
          node.classList.add('is-problem');
          const silhouetteSrc = assetImageSrc(item.asset);
          if (silhouetteSrc) node.style.setProperty('--art-url', 'url("' + silhouetteSrc.replace(/\\/g, '/').replace(/"/g, '\\"') + '")');
          const silhouette = document.createElement('span');
          silhouette.className = 'problem-silhouette';
          node.appendChild(silhouette);
        }
        const hit = document.createElement('span');
        hit.className = 'hit';
        node.appendChild(hit);
        const f = fnOf(item);
        // Lamps / dials are passive — no vehicle-action pictogram overlay on the PNG.
        if (f && !item.pictogramHidden && !isLampAsset(item.asset) && !isDialAsset(item.asset) && !isRotaryAsset(item.asset)) {
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
        const textLabel = buttonOverlayLabel(item);
        if (textLabel) {
          const labelEl = document.createElement('span');
          labelEl.className = 'key-label';
          labelEl.textContent = textLabel.toUpperCase();
          node.appendChild(labelEl);
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
    const dial = kind === 'button' && isDialAsset(item.asset);
    $('#selectedType').textContent = kind === 'button'
      ? (lamp ? 'Lâmpada / indicador' : dial ? 'Mostrador analógico (passivo)' : isRotaryAsset(item.asset) ? 'Seletor rotativo' : 'Botão atómico')
      : 'Zona global';
    $('#selectedAsset').textContent = kind === 'button' ? item.asset : item.type;
    const preview = $('#selectedPreview');
    preview.innerHTML = '';
    preview.classList.toggle('zone-preview', kind === 'zone');
    if (kind === 'button') { const img = document.createElement('img'); img.src = assetImageSrc(item.asset); img.alt = ''; preview.appendChild(img); } else preview.textContent = item.type === 'dash-obd' ? 'OBD' : 'SPD';
    $('#selectedId').value = item.id;
    // Swap the function dropdown between vehicle actions and lamp telemetry catalog.
    // Dials are passive gauges — no function binding (telemetry drives the needle in app.js).
    const fnSelect = $('#selectedFunctionId');
    const prevValue = lamp ? (resolveLampFunctionId(item.functionId) || item.functionId || '') : (item.functionId || '');
    fnSelect.innerHTML = dial
      ? '<option value="">— mostrador passivo (telemetria) —</option>'
      : (lamp ? buildLampOptionsHtml(item.asset) : buildFunctionOptionsHtml());
    fnSelect.value = dial ? '' : prevValue;
    if (!dial && prevValue && fnSelect.value !== prevValue) {
      // Keep a custom/stale id visible so the mapping is not silently dropped.
      const orphan = document.createElement('option');
      orphan.value = prevValue;
      orphan.textContent = prevValue + ' (fora do catálogo)';
      fnSelect.appendChild(orphan);
      fnSelect.value = prevValue;
    }
    fnSelect.disabled = kind !== 'button' || dial;
    const fnLabel = $('#functionFieldLabel');
    if (fnLabel) fnLabel.textContent = dial ? 'Telemetria (automática)' : lamp ? 'Indicador de telemetria' : 'Função (catálogo)';
    const lampHint = $('#lampHint');
    if (lampHint) lampHint.hidden = !lamp;
    $('#selectedLabel').value = item.label || '';
    const tintRow = $('#elementTintRow');
    if (tintRow) tintRow.hidden = kind !== 'button';
    const elementColor = $('#selectedElementColor');
    if (elementColor) elementColor.value = item.color || '#ffffff';
    renderRotaryFields(kind === 'button' ? item : null);
    renderPictogramFields(kind === 'button' ? item : null);
    $('#selectedUnit').value = $('#selectedUnit').value || 'percent';
    const unit = $('#selectedUnit').value;
    const dimensions = displayValues(item, unit);
    $('#selectedX').value = dimensions.x;
    $('#selectedY').value = dimensions.y;
    $('#selectedW').value = dimensions.width;
    $('#selectedH').value = dimensions.height;
    const circular = kind === 'button' && (isCircularOverlayAsset(item.asset) || isRotaryAsset(item.asset));
    const bg = officialOf(orientation);
    const maxWidth = unit === 'px' ? bg.width * (100 - item.x) / 100 : 100 - item.x;
    const maxHeight = unit === 'px' ? bg.height * (100 - item.y) / 100 : 100 - item.y;
    const sidePx = Math.min(item.width * bg.width / 100, item.height * bg.height / 100);
    const size = unit === 'px' ? sidePx : sidePx / Math.min(bg.width, bg.height) * 100;
    [['selectedWRange', dimensions.width, maxWidth], ['selectedHRange', dimensions.height, maxHeight]].forEach(([id, value, max]) => {
      const input = $('#' + id);
      input.max = Math.max(.2, max);
      input.value = value;
    });
    const sizeMaxPx = Math.min(bg.width * (100 - item.x) / 100, bg.height * (100 - item.y) / 100);
    const sizeMax = unit === 'px' ? sizeMaxPx : sizeMaxPx / Math.min(bg.width, bg.height) * 100;
    $('#selectedSizeRange').max = Math.max(.2, sizeMax);
    $('#selectedSizeRange').value = size;
    $('#selectedSize').value = Number(size.toFixed(2));
    $('#selectedWField').hidden = circular;
    $('#selectedHField').hidden = circular;
    $('#selectedSizeField').hidden = !circular;
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
    // Lamps / dials never get vehicle-action pictogram chrome — the PNG is the face.
    if (!item || isLampAsset(item.asset) || isDialAsset(item.asset) || isRotaryAsset(item.asset) || !fnOf(item)) {
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

  function renderRotaryFields(item) {
    const box = $('#rotaryFields');
    if (!box) return;
    if (!item || !isRotaryAsset(item.asset)) { box.hidden = true; return; }
    box.hidden = false;
    const preset = modernRotaryPreset(item.asset);
    $('#selectedCrownR').value = numOr(item.crownR, 42);
    $('#selectedPinLen').value = numOr(item.pinLen, preset ? preset.pinLen : 58);
    $('#selectedPinBake').value = numOr(item.pinBake, preset ? preset.pinBake : 24.1);
    $('#selectedRotStates').value = rotaryStatesText(item.states);
  }

  function applySelectedRotary() {
    const primary = primarySelected();
    if (!primary || primary.kind !== 'button' || !isRotaryAsset(primary.item.asset)) return;
    pushHistory();
    const item = primary.item;
    item.crownR = clamp(numOr($('#selectedCrownR').value, 42), 0, 48);
    item.pinLen = clamp(numOr($('#selectedPinLen').value, 58), 20, 100);
    item.pinBake = clamp(numOr($('#selectedPinBake').value, 24.1), -180, 180);
    const states = parseRotaryStates($('#selectedRotStates').value);
    if (states.length) item.states = states; else delete item.states;
    persist();
    renderStage();
    renderInspector();
    announce(states.length ? ('Seletor: ' + states.length + ' posicoes aplicadas.') : 'Seletor: preset da funcao (sem posicoes manuais).');
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
    let nextFn = primary.kind === 'button' ? $('#selectedFunctionId').value.trim() : '';
    // Dials stay function-less — needle angle comes from truck.speed / rpm / fuel / air only.
    if (primary.kind === 'button' && isDialAsset(primary.item.asset)) nextFn = '';
    if (primary.kind === 'button' && isLampAsset(primary.item.asset) && nextFn) {
      nextFn = resolveLampFunctionId(nextFn) || nextFn;
    }
    primary.item.functionId = nextFn;
    // Text label overlay: keep typed value (incl. empty). Layers fall back to asset/id when blank.
    const typedLabel = $('#selectedLabel').value.trim();
    if (typedLabel) primary.item.label = typedLabel;
    else if (primary.kind === 'button') primary.item.label = (getAssetDef(primary.item.asset) || ASSETS_MODERN['btn-square.png']).label;
    else primary.item.label = DASHBOARDS[primary.item.type].label;
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
    if (primary.kind === 'button' && (isCircularOverlayAsset(primary.item.asset) || isRotaryAsset(primary.item.asset))) {
      const raw = Number($('#selectedSize').value);
      const sidePx = unit === 'px' ? raw : raw / 100 * Math.min(bg.width, bg.height);
      primary.item.width = clamp(sidePx / bg.width * 100, .2, 100 - primary.item.x);
      primary.item.height = clamp(sidePx / bg.height * 100, .2, 100 - primary.item.y);
    } else {
      primary.item.width = clamp(value('selectedW', bg.width), .2, 100 - primary.item.x);
      primary.item.height = clamp(value('selectedH', bg.height), .2, 100 - primary.item.y);
    }
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
      clone.x = clamp(Number(item.x) + offset, 0, 100 - Number(item.w ?? item.width));
      clone.y = clamp(Number(item.y) + offset, 0, 100 - Number(item.h ?? item.height));
      return { kind, item: kind === 'button' ? normalizeButton(clone) : normalizeZone(clone) };
    });
    copies.forEach(({ kind, item }) => {
      if (kind === 'button') currentBoard().buttons.push(item);
      else currentBoard().zones.push(item);
    });
    selection = copies.map(({ kind, item }) => ({ kind, id: item.id }));
    persist(); render(); announce(copies.length + ' elemento(s) colado(s).');
  }

  // Export and PUT share the exact runtime board representation.
  function buildReport() {
    const boardKey = activeBoardKey();
    const orientations = {};
    ['landscape', 'portrait'].forEach((mode) => {
      const board = activeBoard().orientations[mode];
      orientations[mode] = {
        buttons: board.buttons.map(exportElement),
        zones: board.zones.map(exportElement)
      };
    });
    return {
      schema: state.schema, boardKey, skin: state.skin, sovBg: state.sovBg,
      customAssets, boards: { [boardKey]: { orientations } }
    };
  }

  function resolveImportBoardKey(report) {
    if (!report || !BOARD_KEYS.includes(report.boardKey)) {
      throw new Error('Missing or invalid boardKey. Import cancelled.');
    }
    return report.boardKey;
  }

  function exportElement(item) {
    const { width, height, ...rest } = item;
    return { ...rest, w: width, h: height };
  }

  function validateReport(report) {
    const key = resolveImportBoardKey(report);
    if (report.schema !== state.schema) throw new Error('Unsupported layout schema.');
    const board = report.boards && report.boards[key];
    if (!board || !board.orientations) throw new Error('Missing board orientations. Export this layout again.');
    for (const mode of ['landscape', 'portrait']) {
      const orientation = board.orientations[mode];
      if (!orientation) throw new Error('Missing orientation: ' + mode);
      const ids = new Set();
      for (const kind of ['buttons', 'zones']) {
        if (!Array.isArray(orientation[kind])) throw new Error('Invalid ' + kind + ' in ' + mode);
        for (const item of orientation[kind]) {
          if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)
              || item.position || !['x', 'y', 'w', 'h'].every((field) => Number.isFinite(item[field]))
              || item.x < 0 || item.y < 0 || item.x > 100 || item.y > 100
              || item.w <= 0 || item.h <= 0 || item.w > 100 || item.h > 100) {
            throw new Error('Invalid flat layout element in ' + mode + '. Import cancelled.');
          }
          ids.add(item.id);
        }
      }
    }
    return key;
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
    Object.entries(report.boards[report.boardKey].orientations).forEach(([mode, data]) => {
      const bg = officialOf(mode);
      lines.push('', '.modern-atomic-canvas[data-orientation="' + mode + '"] {', '  aspect-ratio: ' + bg.width + ' / ' + bg.height + ';', '  background-image: url("' + bg.src + '");', '}');
      data.zones.concat(data.buttons).forEach((item) => {
        const selector = '.modern-atomic-canvas[data-orientation="' + mode + '"] > [data-layout-id="' + cssQuote(item.id) + '"]';
        const assetSrc = item.asset ? assetImageSrc(item.asset) : '';
        lines.push(selector + ' {', '  left: ' + item.x + '%;', '  top: ' + item.y + '%;', '  width: ' + item.w + '%;', '  height: ' + item.h + '%;', '  z-index: ' + item.zIndex + ';', assetSrc ? '  background-image: url("' + assetSrc + '");' : '', item.functionId ? '  --function-id: "' + cssQuote(item.functionId) + '";' : '', '}');
      });
    });
    return lines.filter((line) => line !== undefined).join('\n');
  }

  function cssQuote(value) { return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

  function exportAll() {
    const report = buildReport();
    const key = report.boardKey || activeBoardKey() || 'board';
    // Named exports prevent generic layout-report.json from being applied to the wrong board.
    download('layout-report-' + key + '.json', JSON.stringify(report, null, 2), 'application/json');
    download('css-' + key + '.css', buildCss(report), 'text/css');
    announce('Exportado: layout-report-' + key + '.json + css-' + key + '.css');
  }

  function download(name, contents, type) {
    const blob = new Blob([contents], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 500);
  }

  let importing = false;
  async function importReport(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file || importing) return;
    importing = true;
    $('#importButton').disabled = true;
    try {
      const report = JSON.parse(await file.text());
      const key = validateReport(report); // Validate everything before touching state or history.
      const assets = new Map(customAssets.map((asset) => [asset.id, asset]));
      if (report.customAssets !== undefined && !Array.isArray(report.customAssets)) throw new Error('Invalid custom assets.');
      (report.customAssets || []).forEach((asset) => {
        if (!asset || typeof asset.id !== 'string' || typeof asset.src !== 'string') throw new Error('Invalid custom asset.');
        if (assets.has(asset.id) && assets.get(asset.id).src !== asset.src) throw new Error('Custom asset conflict: ' + asset.id);
        assets.set(asset.id, asset);
      });
      pushHistory();
      customAssets = Array.from(assets.values());
      state.skin = key === 'eu_frame' ? 'eu_frame' : 'sov_frame';
      const bg = normalizeSovBg(report.sovBg);
      state.sovBg = sovBoardKey(bg) === key ? bg
        : key === 'sov_white' ? 'white'
        : key === 'sov_military_1' ? 'military1'
        : key === 'sov_military_2' ? 'military2' : 'sigabem';
      // Geometry is flat on disk; the editor retains its DOM sizing field names.
      const orientations = {};
      for (const mode of ['landscape', 'portrait']) {
        const source = report.boards[key].orientations[mode];
        const editable = ({ w, h, ...item }) => ({ ...item, width: w, height: h });
        orientations[mode] = { buttons: source.buttons.map(editable), zones: source.zones.map(editable) };
      }
      state.boards[key] = { orientations };
      activePackageId = packageIdForSkin(state.skin);
      selection = [];
      persist(); renderCustomAssetTools(); renderShippedAssetTools(); render();
      clearTimeout(pushTimer);
      announce('Saving imported layout...');
      if (await pushToServer(buildReport())) announce('Imported and saved: ' + key + '. Tablet update sent.');
    } catch (error) {
      announce('Import failed: ' + error.message);
    } finally {
      input.value = '';
      importing = false;
      $('#importButton').disabled = false;
    }
  }

  function announce(message, state) {
    const el = $('#statusMessage');
    el.textContent = message;
    el.classList.remove('is-pending', 'is-success', 'is-error', 'is-warn');
    if (state) el.classList.add('is-' + state);
  }
  let toastTimer = null;
  function toast(message, state) {
    const el = $('#publishToast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = message;
    el.classList.remove('is-pending', 'is-success', 'is-error', 'is-warn');
    el.classList.add('is-' + state);
    el.hidden = false;
    if (state !== 'pending') {
      toastTimer = setTimeout(() => { el.hidden = true; }, state === 'error' ? 6000 : state === 'warn' ? 9000 : 2600);
    }
  }

  // ---- Live sync (bridge SSE) ----------------------------------------------------------------
  // Mirrors app.js's refetchAtomicLayout(): the bridge broadcasts 'atomic-layout' whenever
  // data/atomic-layout.json changes on disk (another tab's Salvar, or a direct file edit by a
  // script), and every open Editor tab refetches instead of going stale until its next reload.
  // Safety lock: never clobber this tab's in-progress work. A drag/resize in flight (dragState)
  // or focus sitting in a text input/select (a label or numeric field being typed into) means
  // this tab's local state wins for now; the event is dropped rather than queued, since the
  // next save/broadcast will carry the same change again once the user is done.
  function editingLocally() {
    if (dragState) return true;
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  async function refetchFromServer() {
    if (editingLocally()) return;
    const serverPayload = await loadServerPayload();
    if (!serverPayload) return;
    const { payload: merged } = mergeBoardsPerKey(serverPayload, loadLocalPayload());
    state = applyPayload(merged);
    activePackageId = packageIdForSkin(state.skin);
    selection = [];
    persist();
    renderCustomAssetTools();
    renderShippedAssetTools();
    render();
    announce('Layout atualizado (alteração detectada no disco/bridge).');
  }

  let events = null;
  function openEvents() {
    if (events) events.close();
    events = new EventSource('api/events?pin=' + encodeURIComponent(resolvePin()));
    events.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === 'atomic-layout') refetchFromServer();
    };
    events.onerror = () => { /* EventSource retries on its own */ };
  }

  async function bootstrap() {
    state = await loadState();
    activePackageId = packageIdForSkin(state.skin);
    init();
    refreshRescueButton();
    if (needsSeedPush) { needsSeedPush = false; schedulePush(); }
    openEvents();
  }

  bootstrap();
}());
