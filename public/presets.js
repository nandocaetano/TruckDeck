// Panels.
// The ten dashboards are ART PANELS: each one is a finished picture (public/skins/<id>-T.jpg
// lying down, <id>-P.jpg upright) with a map of touch areas and live readouts laid over it
// (public/skins.js). Nothing on them is generated or re-drawn: what the artist painted is what
// the player sees, and every painted key works.
// Extra pages a player adds in Edit are plain grids of the app's own keys.
'use strict';

let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return 'w' + Date.now().toString(36) + uidCounter.toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

// Compact constructor for grid keys: (what, x, y, w, h, type).
function B(fnId, x, y, w, h, type, extra) {
  return Object.assign({ id: uid(), t: type || 'rocker', fn: fnId, x, y, w: w || 1, h: h || 1 }, extra || {});
}

// classic: the cab era, used by the music player widget on extra grid pages.
// units: what the speed readout shows by default (the painted dials keep their own scale).
const STYLE_DEFS = {
  modern_us: { classic: false, units: 'mph' },
  modern_eu: { classic: false, units: 'kmh' },
  eu_frame: { classic: false, units: 'kmh' },
  sov_frame: { classic: true, units: 'kmh' },
  modern_br: { classic: false, units: 'kmh', lang: 'pt' },
  modern_heavy: { classic: false, units: 'mph' },
  modern_rugged: { classic: false, units: 'kmh' },
  old_peterbilt: { classic: true, units: 'mph' },
  old_kenworth: { classic: true, units: 'mph' },
  old_scania: { classic: true, units: 'kmh' },
  old_brazil: { classic: true, units: 'kmh', lang: 'pt' },
  old_volvo: { classic: true, units: 'kmh' },
  scania_frame: { classic: false, units: 'kmh' },
  scania25_frame: { classic: false, units: 'kmh' },
};

// What is remembered between panels on this device.
const DEFAULT_SETUP = {
  lang: null,       // 'en' | 'pt' for the app's own texts on the panel; null = device language
  // Crawler gears shown as C1/C2 before the first road gear. -1 = work it out from the
  // truck's gearbox (see gearLabel in app.js); 0, 1 or 2 = fixed by the player.
  gearCrawlers: -1,
};

// The ten art panels, in the order of the artwork. Ids are internal and never shown.
const PRESETS = [
  { id: 'modern_us', name: 'Modern American', note: 'Long haul: truck info, air valves, engine brake stages, mph' },
  { id: 'modern_eu', name: 'Modern European', note: 'Fleet dash: truck info, retarder, cruise, km/h' },
  { id: 'modern_br', name: 'Moderno Brasileiro', note: 'Legendas em português: 3º eixo, buzina a ar, giroflex, km/h' },
  { id: 'modern_heavy', name: 'Modern Heavy Haul', note: 'Night console: CB set, engine brake stages, work lights, mph' },
  { id: 'modern_rugged', name: 'Modern Rugged', note: 'Industrial look with PTO, AUX and six free keys, km/h' },
  { id: 'old_peterbilt', name: 'Classic American · Chrome', note: 'Burl wood, chrome dials, cassette radio, air valves, mph' },
  { id: 'old_kenworth', name: 'Classic American · Rosewood', note: 'Rosewood dash, green-lit dials, air valves, mph' },
  { id: 'old_scania', name: 'Classic European · Black', note: '1980s black dash, amber dials, retarder, km/h' },
  { id: 'old_brazil', name: 'Clássico Brasileiro', note: 'Painel de época, legendas em português, km/h' },
  { id: 'old_volvo', name: 'Classic Nordic · Grey', note: 'Grey 1980s dash, sober keys, retarder, km/h' },
  { id: 'eu_frame', name: 'Modern', note: 'New method: empty frame + keys drawn by the app' },
  { id: 'sov_frame', name: 'Soviet', note: 'Worn enamel plate, real switches and lamps, green segment display, km/h' },
  { id: 'scania_frame', name: 'S/R 2016', note: 'Painel analógico S/R 2016 com computador de bordo e comandos completos' },
  { id: 'scania25_frame', name: 'Digital 2025', note: 'Clean digital frame with live telemetry, information screens and top command row' },
];

// Flow every catalog function not yet on the panel onto extra grid pages, one engraved plate
// per category. Offered as an explicit action ("Add all other functions") for players who
// want the complete switchboard behind the art panel.
function autoFillPages(usedIds, game, cols, rows, buttonType) {
  const pages = [];
  let page = null;
  let x = 0;
  let y = 0;

  function newPage() {
    page = { id: uid(), name: 'More ' + (pages.length + 1), cols, rows, widgets: [] };
    pages.push(page);
    x = 0; y = 0;
  }
  function advance(width) {
    x += width;
    if (x >= cols) { x = 0; y += 1; }
    if (y >= rows) page = null; // next placement opens a new page
  }

  for (const cat of CATEGORIES.filter((c) => c.game === game)) {
    const rest = FUNCTION_LIST.filter((f) => f.cat === cat.id && !usedIds.has(f.id));
    if (!rest.length) continue;
    if (!page) newPage();
    // Every category starts its own row: a heading in the middle of a line reads as if
    // the buttons before it belonged to it.
    if (x !== 0) { x = 0; y += 1; if (y >= rows) newPage(); }
    page.widgets.push({ id: uid(), t: 'plate', text: cat.name, x, y, w: Math.min(2, cols), h: 1 });
    advance(Math.min(2, cols));
    for (const f of rest) {
      if (!page) newPage();
      page.widgets.push(B(f.id, x, y, 1, 1, f.latch && buttonType === 'toggle' ? 'toggle' : 'rocker'));
      advance(1);
    }
  }
  return pages;
}

// Mirror a grid page across its diagonal (columns <-> rows). Used by the editor's "Rotate grid".
function transposePage(page) {
  const t = page.cols; page.cols = page.rows; page.rows = t;
  for (const w of page.widgets) {
    const px = w.x; w.x = w.y; w.y = px;
    const pw = w.w; w.w = w.h; w.h = pw;
  }
}

// Bumped whenever the built-in panels change in a way saved copies cannot follow. Panels
// saved by an older version carry a lower number (or none) and are replaced once on load,
// see upgradeStore() in app.js. Generation 5 = the ten art panels.
const LAYOUT_GEN = 5;

// An art page stores no geometry of its own: only which picture it is, which cut is showing
// (size) and the player's changes to individual keys (over). The touch map always comes from
// skins.js, so corrections to it reach panels that were saved earlier.
function createLayoutFromPreset(presetId, size, setup) {
  const p = PRESETS.find((q) => q.id === presetId) || PRESETS[0];
  const def = STYLE_DEFS[p.id];
  const s = Object.assign({}, DEFAULT_SETUP, setup || {});
  s.gearCrawlers = s.gearCrawlers == null ? -1 : Math.max(-1, Math.min(4, Number(s.gearCrawlers) || 0));
  // The Brazilian panels are printed in Portuguese, so the texts the app writes on them
  // (music player messages, week days) are Portuguese too, whatever the device language.
  const lang = def.lang || (s.lang === 'pt' || s.lang === 'en' ? s.lang : 'en');
  return {
    id: uid(),
    name: p.name,
    style: p.id,
    units: def.units,
    lang,
    gearCrawlers: s.gearCrawlers,
    preset: p.id,
    locked: true,   // built-in: not editable; "use as a model" makes an unlocked copy
    gen: LAYOUT_GEN,
    game: 'truck',
    binds: {},
    pages: [{ id: uid(), name: lang === 'pt' ? 'Painel' : 'Drive', skin: p.id, size: size === 'phone' ? 'phone' : 'tablet', over: {}, widgets: [] }],
  };
}

