(function () {
  'use strict';

  const TEXT = {
    en: {
      title: 'TruckDeck Bridge', connection: 'Connection', recommendedAddress: 'Recommended PC address',
      port: 'Port', otherAddresses: 'Other addresses', security: 'Security', pinTitle: 'Bridge PIN',
      show: 'Show', hide: 'Hide', copy: 'Copy', copied: 'Copied', telemetryPlugin: 'Telemetry plugin',
      game: 'Game', checking: 'Checking...', connected: 'Receiving data', offline: 'Not receiving data', pluginInstalled: 'Installed',
      connectedDevices: 'Connected devices', hardware: 'Hardware', controlsTitle: 'Detected controls',
      noControls: 'No controls detected yet.', openEditor: 'Open layout editor',
      networkWarning: 'A guest Wi-Fi network or repeater may isolate this PC from your tablet.',
      keepOpen: 'Keep this window open while you play.', bridgeUnavailable: 'Bridge status is unavailable. Retrying...',
      localOnly: 'This status page is available only on the bridge PC.', pinUnavailable: 'PIN is unavailable.'
    },
    pt: {
      title: 'TruckDeck Bridge', connection: 'Conexão', recommendedAddress: 'Endereço recomendado do PC',
      port: 'Porta', otherAddresses: 'Outros endereços', security: 'Segurança', pinTitle: 'PIN da bridge',
      show: 'Mostrar', hide: 'Ocultar', copy: 'Copiar', copied: 'Copiado', telemetryPlugin: 'Plugin de telemetria',
      game: 'Jogo', checking: 'Verificando...', connected: 'Recebendo dados', offline: 'Sem dados', pluginInstalled: 'Instalado',
      connectedDevices: 'Dispositivos conectados', hardware: 'Hardware', controlsTitle: 'Controles detectados',
      noControls: 'Nenhum controle detectado ainda.', openEditor: 'Abrir editor de layout',
      networkWarning: 'Uma rede Wi-Fi de convidado ou repetidor pode isolar este PC do tablet.',
      keepOpen: 'Mantenha esta janela aberta enquanto joga.', bridgeUnavailable: 'Status da bridge indisponível. Tentando novamente...',
      localOnly: 'Esta página de status só está disponível no PC da bridge.', pinUnavailable: 'PIN indisponível.'
    }
  };

  const $ = (selector) => document.querySelector(selector);
  const storageKey = 'truckdeck.bridge.lang';
  let language = 'en';
  let currentPin = null;
  let pinVisible = false;

  function resolveLanguage(value) { return value === 'pt' ? 'pt' : 'en'; }
  function t(key) { return TEXT[language][key] || TEXT.en[key] || key; }

  function translateDom() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll('[data-lang]').forEach((button) => {
      const active = button.dataset.lang === language;
      button.setAttribute('aria-pressed', String(active));
    });
    updatePinButton();
  }

  function setLanguage(next) {
    language = resolveLanguage(next);
    localStorage.setItem(storageKey, language);
    translateDom();
  }

  function initializeLanguage() {
    const saved = localStorage.getItem(storageKey);
    language = resolveLanguage(saved || (/^pt/i.test(navigator.language || '') ? 'pt' : 'en'));
    translateDom();
  }

  function setLight(selector, active) {
    const light = $(selector);
    if (!light) return;
    light.classList.toggle('is-on', active);
    light.classList.toggle('is-off', !active);
  }

  function setStatusText(selector, active) {
    const node = $(selector);
    if (node) node.textContent = active ? t('connected') : t('offline');
  }

  function renderStatus(status) {
    const addresses = status.addresses || {};
    const primary = addresses.primary;
    $('#primary-address').textContent = primary ? primary.ip : '—';
    $('#bridge-port').textContent = status.port == null ? '—' : String(status.port);

    const otherBox = $('#other-addresses');
    const otherList = $('#other-address-list');
    otherList.textContent = '';
    (addresses.others || []).forEach((address) => {
      const item = document.createElement('li');
      item.textContent = address.ip + (address.name ? ' · ' + address.name : '');
      otherList.appendChild(item);
    });
    otherBox.hidden = !(addresses.others || []).length;

    const pluginFound = !!(status.plugin && status.plugin.found);
    const helperReady = !!(status.helper && status.helper.ready);
    const telemetry = pluginFound && helperReady;
    const game = !!(status.game && status.game.receiving);
    setLight('#telemetry-light', telemetry);
    setLight('#game-light', game);
    var telemetryNode = document.querySelector('#telemetry-status');
    if (telemetryNode) {
      if (game) telemetryNode.textContent = t('connected');
      else if (pluginFound) telemetryNode.textContent = t('pluginInstalled');
      else telemetryNode.textContent = t('offline');
    }
    setStatusText('#game-status', game);
    $('#client-count').textContent = String(Number.isFinite(Number(status.clients)) ? status.clients : 0);

    const controls = Array.isArray(status.controls) ? status.controls : [];
    const controlsList = $('#controls-list');
    controlsList.textContent = '';
    if (!controls.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = t('noControls');
      controlsList.appendChild(empty);
    } else {
      controls.forEach((control) => {
        const item = document.createElement('li');
        const id = control.dev || '?';
        const name = control.name || 'Controller';
        item.textContent = name + ' · ' + id;
        controlsList.appendChild(item);
      });
    }
  }

  function showError(message) {
    const node = $('#connection-error');
    node.textContent = message;
    node.hidden = false;
    setLight('#telemetry-light', false);
    setLight('#game-light', false);
    setStatusText('#telemetry-status', false);
    setStatusText('#game-status', false);
  }

  function clearError() { $('#connection-error').hidden = true; }

  async function refreshStatus() {
    try {
      const response = await fetch('/api/bridge-status', { cache: 'no-store' });
      if (response.status === 403) { showError(t('localOnly')); return; }
      if (!response.ok) throw new Error('HTTP ' + response.status);
      renderStatus(await response.json());
      clearError();
    } catch (error) {
      showError(t('bridgeUnavailable'));
    }
  }

  async function fetchPin() {
    const response = await fetch('/api/bridge-pin', { cache: 'no-store' });
    if (!response.ok) throw new Error('PIN HTTP ' + response.status);
    const body = await response.json();
    if (!/^\d{4}$/.test(String(body.pin || ''))) throw new Error('invalid PIN');
    currentPin = String(body.pin);
    return currentPin;
  }

  function updatePinButton() {
    $('#pin-value').textContent = pinVisible && currentPin ? currentPin : '••••';
    $('#show-pin').textContent = pinVisible ? t('hide') : t('show');
  }

  async function togglePin() {
    if (pinVisible) {
      pinVisible = false;
      updatePinButton();
      return;
    }
    try {
      await fetchPin();
      pinVisible = true;
      updatePinButton();
    } catch (error) {
      showError(t('pinUnavailable'));
    }
  }

  async function copyPin() {
    try {
      const pin = currentPin || await fetchPin();
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(pin);
      else {
        const input = document.createElement('textarea');
        input.value = pin;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      const button = $('#copy-pin');
      button.textContent = t('copied');
      setTimeout(() => { button.textContent = t('copy'); }, 1200);
    } catch (error) {
      showError(t('pinUnavailable'));
    }
  }

  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang));
  });
  $('#show-pin').addEventListener('click', togglePin);
  $('#copy-pin').addEventListener('click', copyPin);
  $('#open-editor').addEventListener('click', () => window.open('/editor.html', '_blank'));
  initializeLanguage();
  refreshStatus();
  setInterval(refreshStatus, 2000);
}());
