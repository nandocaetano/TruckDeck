/* Desktruck Atomic Layout Editor. This utility is intentionally isolated from app.js. */
(function () {
  'use strict';

  const STORAGE_KEY = 'desktruck.atomic-layout.v1';
  const OFFICIAL = {
    landscape: { name: 'bg-landscape.jpg', src: 'skins/modern/bg-landscape.jpg', width: 2752, height: 1536 },
    portrait: { name: 'bg-portrait.jpg', src: 'skins/modern/bg-portrait.jpg', width: 1152, height: 1728 }
  };
  const ASSETS = {
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
  const DASHBOARDS = {
    obd: { label: 'Tela OBD', defaultSize: [38, 15] },
    tachometer: { label: 'Conta-giros', defaultSize: [22, 15] }
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
  let state = loadState();

  function hasSlots(asset) { return asset === 'btn-3x1-metal.png'; }
  function normalizeSlots(slots) {
    const arr = Array.isArray(slots) ? slots : [];
    return [0, 1, 2].map((i) => String(arr[i] || ''));
  }
  function getAssetDef(key) {
    if (ASSETS[key]) return ASSETS[key];
    return customAssets.find((asset) => asset.id === key) || null;
  }
  function assetImageSrc(key) {
    if (ASSETS[key]) return 'skins/modern/' + key;
    const custom = customAssets.find((asset) => asset.id === key);
    return custom ? custom.src : '';
  }

  function initialState() {
    return {
      schema: 'desktruck.atomic-layout/v1',
      skin: 'eu_frame',
      gridStep: 1,
      snap: true,
      guides: true,
      orientations: {
        landscape: { buttons: [], zones: defaultZones('landscape') },
        portrait: { buttons: [], zones: defaultZones('portrait') }
      }
    };
  }

  function defaultZones(mode) {
    if (mode === 'portrait') {
      return [
        makeZone('obd', 'obd-1', 18, 8, 64, 15),
        makeZone('tachometer', 'tachometer-1', 18, 27, 64, 12)
      ];
    }
    return [
      makeZone('obd', 'obd-1', 29, 8, 42, 15),
      makeZone('tachometer', 'tachometer-1', 75, 8, 20, 15)
    ];
  }

  function makeZone(type, id, x, y, width, height) {
    return { id, type, label: DASHBOARDS[type].label, x, y, width, height, zIndex: 1 };
  }

  function loadState() {
    const fresh = initialState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || saved.schema !== fresh.schema) return fresh;
      customAssets = Array.isArray(saved.customAssets)
        ? saved.customAssets.filter((item) => item && typeof item.id === 'string' && typeof item.src === 'string').map((item) => ({
          id: item.id,
          label: String(item.label || 'Personalizado'),
          src: item.src,
          defaultSize: Array.isArray(item.defaultSize) && item.defaultSize.length === 2 ? item.defaultSize : [8, 8]
        }))
        : [];
      ['landscape', 'portrait'].forEach((mode) => {
        const source = saved.orientations && saved.orientations[mode];
        if (!source) return;
        fresh.orientations[mode].buttons = Array.isArray(source.buttons) ? source.buttons.map(normalizeButton) : [];
        fresh.orientations[mode].zones = Array.isArray(source.zones) ? source.zones.map(normalizeZone) : [];
      });
      fresh.gridStep = clamp(Number(saved.gridStep) || 1, .25, 10);
      fresh.snap = saved.snap !== false;
      fresh.guides = saved.guides !== false;
      return fresh;
    } catch (error) {
      return fresh;
    }
  }

  function normalizeButton(item) {
    const resolved = getAssetDef(item.asset);
    const asset = resolved ? item.asset : 'btn-square.png';
    const def = resolved || ASSETS['btn-square.png'];
    return {
      id: String(item.id || uid('button')),
      asset,
      label: String(item.label || def.label),
      functionId: String(item.functionId || ''),
      slots: hasSlots(asset) ? normalizeSlots(item.slots) : undefined,
      x: clamp(Number(item.x) || 10, 0, 99),
      y: clamp(Number(item.y) || 10, 0, 99),
      width: clamp(Number(item.width) || def.defaultSize[0], .2, 100),
      height: clamp(Number(item.height) || def.defaultSize[1], .2, 100),
      zIndex: Number(item.zIndex) || 10
    };
  }

  function normalizeZone(item) {
    const type = DASHBOARDS[item.type] ? item.type : 'obd';
    return {
      id: String(item.id || uid(type)),
      type,
      label: String(item.label || DASHBOARDS[type].label),
      x: clamp(Number(item.x) || 10, 0, 99),
      y: clamp(Number(item.y) || 10, 0, 99),
      width: clamp(Number(item.width) || DASHBOARDS[type].defaultSize[0], .2, 100),
      height: clamp(Number(item.height) || DASHBOARDS[type].defaultSize[1], .2, 100),
      zIndex: Number(item.zIndex) || 1
    };
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, customAssets })); } catch (error) { /* private browsing */ }
  }

  function currentBoard() { return state.orientations[orientation]; }
  function allElements() { return currentBoard().buttons.map((item) => ({ kind: 'button', item })).concat(currentBoard().zones.map((item) => ({ kind: 'zone', item }))); }
  function findElement(kind, id) { return allElements().find((entry) => entry.kind === kind && entry.item.id === id); }
  function isSelected(kind, id) { return selection.some((entry) => entry.kind === kind && entry.id === id); }

  function init() {
    bindControls();
    renderCustomAssetTools();
    setOrientation('landscape');
    render();
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function bindControls() {
    $$('.orientation-button').forEach((button) => button.addEventListener('click', () => setOrientation(button.dataset.orientation)));
    $$('.asset-tool').forEach(bindTool);
    $$('.dashboard-tool').forEach(bindTool);
    $('#backgroundInput').addEventListener('change', handleBackgroundFile);
    $('#customAssetInput').addEventListener('change', handleCustomAssetFile);
    $('#resetBackgroundButton').addEventListener('click', () => { delete runtimeBackgrounds[orientation]; render(); announce('Fundo oficial restaurado.'); });
    $('#snapToggle').addEventListener('change', (event) => { state.snap = event.target.checked; persist(); render(); });
    $('#guidesToggle').addEventListener('change', (event) => { state.guides = event.target.checked; persist(); render(); });
    $('#gridStep').addEventListener('change', (event) => { state.gridStep = clamp(Number(event.target.value) || 1, .25, 10); event.target.value = state.gridStep; persist(); render(); });
    $('#fitButton').addEventListener('click', () => { $('.canvas-scroll').scrollTo({ top: 0, left: 0, behavior: 'smooth' }); announce('Prancheta ajustada à área visível.'); });
    $('#clearButton').addEventListener('click', clearOrientation);
    $('#deleteButton').addEventListener('click', deleteSelection);
    $('#copySizeButton').addEventListener('click', copySelectedSize);
    $('#applySizeButton').addEventListener('click', applyCopiedSize);
    $('#copyGroupButton').addEventListener('click', copySelectionToClipboard);
    $('#pasteGroupButton').addEventListener('click', pasteClipboard);
    $('#exportButton').addEventListener('click', exportAll);
    $('#importButton').addEventListener('click', () => $('#importInput').click());
    $('#importInput').addEventListener('change', importReport);
    ['selectedId', 'selectedFunctionId', 'selectedLabel', 'selectedSlot1', 'selectedSlot2', 'selectedSlot3'].forEach((id) => $('#' + id).addEventListener('input', updateSelectedMetadata));
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
    customAssets = customAssets.filter((asset) => asset.id !== id);
    persist(); renderCustomAssetTools(); announce('Ativo personalizado removido da paleta.');
  }

  function setOrientation(next) {
    if (!OFFICIAL[next]) return;
    orientation = next;
    selection = [];
    $$('.orientation-button').forEach((button) => button.classList.toggle('is-active', button.dataset.orientation === orientation));
    render();
  }

  function render() {
    const board = currentBoard();
    const bg = OFFICIAL[orientation];
    const stage = $('#stage');
    stage.dataset.orientation = orientation;
    stage.style.setProperty('--stage-aspect', bg.width + ' / ' + bg.height);
    stage.style.backgroundImage = 'url("' + (runtimeBackgrounds[orientation] || bg.src) + '")';
    stage.classList.toggle('has-elements', board.buttons.length + board.zones.length > 0);
    $('#backgroundSwatch').style.backgroundImage = 'url("' + (runtimeBackgrounds[orientation] || bg.src) + '")';
    $('#backgroundMode').textContent = orientation.toUpperCase();
    $('#backgroundName').textContent = runtimeBackgrounds[orientation] ? 'imagem local' : bg.name;
    $('#backgroundPath').textContent = runtimeBackgrounds[orientation] ? 'preview temporário' : bg.src;
    $('#workspaceTitle').innerHTML = (orientation === 'landscape' ? 'Landscape' : 'Portrait') + ' <span>· ' + bg.width + ' × ' + bg.height + '</span>';
    $('#snapToggle').checked = state.snap;
    $('#guidesToggle').checked = state.guides;
    $('#gridStep').value = state.gridStep;
    $('#gridOverlay').style.backgroundSize = state.gridStep + '% ' + state.gridStep + '%';
    renderStage();
    renderInspector();
    $('#selectionSummary').textContent = selection.length + ' selecionado' + (selection.length === 1 ? '' : 's');
  }

  function renderStage() {
    const root = $('#stageItems');
    root.innerHTML = '';
    const ordered = allElements().sort((a, b) => (a.item.zIndex || 0) - (b.item.zIndex || 0));
    ordered.forEach(({ kind, item }) => {
      const node = document.createElement('div');
      node.className = 'layout-element ' + (kind === 'button' ? 'button-element' : 'zone-element') + (isSelected(kind, item.id) ? ' is-selected' : '');
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
      } else {
        node.textContent = item.label;
      }
      if (isSelected(kind, item.id)) {
        const caption = document.createElement('span');
        caption.className = 'element-caption';
        caption.textContent = item.functionId ? item.id + ' · ' + item.functionId : item.id;
        node.appendChild(caption);
        const handle = document.createElement('span');
        handle.className = 'resize-handle';
        handle.dataset.resize = 'true';
        node.appendChild(handle);
      }
      node.addEventListener('pointerdown', (event) => startElementPointer(event, kind, item.id));
      node.addEventListener('dblclick', (event) => { event.preventDefault(); selectOnly({ kind, id: item.id }); copySelectedSize(); });
      root.appendChild(node);
    });
    renderGuides([]);
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
    const rect = $('#stage').getBoundingClientRect();
    const positions = selection.map((selected) => {
      const found = findElement(selected.kind, selected.id);
      return found ? { ...selected, x: found.item.x, y: found.item.y, width: found.item.width, height: found.item.height } : null;
    }).filter(Boolean);
    dragState = {
      mode: event.target.dataset.resize ? 'resize' : 'move',
      kind, id, startX: event.clientX, startY: event.clientY, rect, positions, guides: []
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
    if (dragState.mode === 'resize') {
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
    $('#selectedType').textContent = kind === 'button' ? 'Botão atómico' : 'Zona global';
    $('#selectedAsset').textContent = kind === 'button' ? item.asset : item.type;
    const preview = $('#selectedPreview');
    preview.innerHTML = '';
    preview.classList.toggle('zone-preview', kind === 'zone');
    if (kind === 'button') { const img = document.createElement('img'); img.src = assetImageSrc(item.asset); img.alt = ''; preview.appendChild(img); } else preview.textContent = item.type === 'obd' ? 'OBD' : 'RPM';
    $('#selectedId').value = item.id;
    $('#selectedFunctionId').value = item.functionId || '';
    $('#selectedFunctionId').disabled = kind !== 'button';
    $('#selectedLabel').value = item.label || '';
    $('#selectedUnit').value = $('#selectedUnit').value || 'percent';
    const unit = $('#selectedUnit').value;
    const dimensions = displayValues(item, unit);
    $('#selectedX').value = dimensions.x;
    $('#selectedY').value = dimensions.y;
    $('#selectedW').value = dimensions.width;
    $('#selectedH').value = dimensions.height;
    $('#positionNote').textContent = unit === 'percent' ? 'Valores relativos ao fundo; o CSS exportado usa %.': 'Campos em px; serão convertidos para % no relatório e no CSS.';
  }

  function displayValues(item, unit) {
    if (unit === 'px') {
      const bg = OFFICIAL[orientation];
      return { x: round(item.x / 100 * bg.width, 2), y: round(item.y / 100 * bg.height, 2), width: round(item.width / 100 * bg.width, 2), height: round(item.height / 100 * bg.height, 2) };
    }
    return { x: round(item.x, 3), y: round(item.y, 3), width: round(item.width, 3), height: round(item.height, 3) };
  }

  function updateSelectedMetadata() {
    const primary = primarySelected();
    if (!primary) return;
    const previousId = primary.item.id;
    const id = $('#selectedId').value.trim();
    if (id && !allElements().some(({ item }) => item.id === id && item !== primary.item)) primary.item.id = id;
    primary.item.functionId = primary.kind === 'button' ? $('#selectedFunctionId').value.trim() : '';
    primary.item.label = $('#selectedLabel').value.trim() || (primary.kind === 'button' ? (getAssetDef(primary.item.asset) || ASSETS['btn-square.png']).label : DASHBOARDS[primary.item.type].label);
    selection = selection.map((entry) => entry.kind === primary.kind && entry.id === previousId ? { kind: primary.kind, id: primary.item.id } : entry);
    persist(); renderStage(); renderInspector();
  }

  function updateSelectedCoordinates() {
    const primary = primarySelected();
    if (!primary) return;
    const unit = $('#selectedUnit').value;
    const bg = OFFICIAL[orientation];
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
    const targets = selectedItems().filter(({ kind }) => kind === 'button');
    targets.forEach(({ item }) => { item.width = clamp(copiedSize.width, .2, 100 - item.x); item.height = clamp(copiedSize.height, .2, 100 - item.y); });
    persist(); render(); announce('Tamanho aplicado a ' + targets.length + ' botão(ões).');
  }

  function addButton(asset, x, y) {
    const def = getAssetDef(asset);
    if (!def) return;
    const number = currentBoard().buttons.length + 1;
    const [width, height] = def.defaultSize;
    const id = uniqueElementId(asset.replace('.png', '') + '-' + number);
    const item = normalizeButton({ id, asset, label: def.label, x, y, width, height, zIndex: 10 + number });
    currentBoard().buttons.push(item); selection = [{ kind: 'button', id: item.id }]; persist(); render(); announce(item.label + ' adicionado.');
  }

  function addZone(type, x, y) {
    if (!DASHBOARDS[type]) return;
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
    if (!window.confirm('Remover todos os botões e zonas desta orientação?')) return;
    state.orientations[orientation] = { buttons: [], zones: [] }; selection = []; persist(); render(); announce('Orientação limpa.');
  }

  function deleteSelection() {
    if (!selection.length) return;
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
    if (mod && key === 'c') { event.preventDefault(); copySelectionToClipboard(); }
    if (mod && key === 'v') { event.preventDefault(); pasteClipboard(); }
    if (mod && key === 'd') { event.preventDefault(); duplicateSelection(); }
  }

  function duplicateSelection() {
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
      const bg = OFFICIAL[mode];
      const board = state.orientations[mode];
      orientations[mode] = {
        background: { file: bg.src, width: bg.width, height: bg.height, localPreviewLoaded: Boolean(runtimeBackgrounds[mode]) },
        zones: board.zones.map((zone) => exportElement(zone, 'dashboard', mode)),
        buttons: board.buttons.map((button) => exportElement(button, 'button', mode))
      };
    });
    return { schema: state.schema, version: 1, skin: state.skin, generatedAt: new Date().toISOString(), grid: { snap: state.snap, stepPercent: state.gridStep, guides: state.guides }, customAssets, orientations };
  }

  function exportElement(item, kind, mode) {
    const bg = OFFICIAL[mode];
    const result = { id: item.id, type: kind, label: item.label, position: { unit: 'percent', x: round(item.x), y: round(item.y), width: round(item.width), height: round(item.height) }, pixels: { x: round(item.x / 100 * bg.width, 2), y: round(item.y / 100 * bg.height, 2), width: round(item.width / 100 * bg.width, 2), height: round(item.height / 100 * bg.height, 2) }, zIndex: item.zIndex || 1 };
    if (kind === 'button') Object.assign(result, { asset: item.asset, functionId: item.functionId || '', slots: Array.isArray(item.slots) ? item.slots : undefined });
    else result.dashboard = item.type;
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
      const bg = OFFICIAL[mode];
      lines.push('', '.modern-atomic-canvas[data-orientation="' + mode + '"] {', '  aspect-ratio: ' + bg.width + ' / ' + bg.height + ';', '  background-image: url("' + bg.src + '");', '}');
      data.zones.concat(data.buttons).forEach((item) => {
        const selector = '.modern-atomic-canvas[data-orientation="' + mode + '"] > [data-layout-id="' + cssQuote(item.id) + '"]';
        lines.push(selector + ' {', '  left: ' + item.position.x + '%;', '  top: ' + item.position.y + '%;', '  width: ' + item.position.width + '%;', '  height: ' + item.position.height + '%;', '  z-index: ' + item.zIndex + ';', item.asset ? '  background-image: url("skins/modern/' + item.asset + '");' : '', item.functionId ? '  --function-id: "' + cssQuote(item.functionId) + '";' : '', '}');
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
        ['landscape', 'portrait'].forEach((mode) => {
          const source = report.orientations && report.orientations[mode];
          if (!source) return;
          state.orientations[mode] = {
            buttons: (source.buttons || []).map((item) => normalizeButton({ id: item.id, asset: item.asset, label: item.label, functionId: item.functionId, slots: item.slots, ...(item.position || {}) })),
            zones: (source.zones || []).map((item) => normalizeZone({ id: item.id, type: item.dashboard || item.type, label: item.label, ...(item.position || {}) }))
          };
        });
        if (report.grid) { state.gridStep = clamp(Number(report.grid.stepPercent) || 1, .25, 10); state.snap = report.grid.snap !== false; state.guides = report.grid.guides !== false; }
        persist(); selection = []; render(); announce('Relatório importado.');
      } catch (error) { announce('Não foi possível importar este JSON.'); }
    };
    reader.readAsText(file); event.target.value = '';
  }

  function announce(message) { $('#statusMessage').textContent = message; }

  init();
}());
