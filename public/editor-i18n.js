(function () {
  'use strict';

  const PT = {
    'Desktruck · Layout Editor atómico': 'Desktruck · Atomic Layout Editor',
    'Idioma': 'Language', 'RECURSOS': 'ASSETS', '01 / RECURSOS': '01 / ASSETS', '01 / TECLAS': '01 / KEYS',
    'PRANCHETA': 'CANVAS', '02 / PRANCHETA': '02 / CANVAS', 'CAMADAS': 'LAYERS',
    '03 / CAMADAS': '03 / LAYERS', 'PROPRIEDADES': 'PROPERTIES', '04 / PROPRIEDADES': '04 / PROPERTIES',
    'PROPRIEDADES': 'PROPERTIES', 'Viva México': 'Viva Mexico', 'Siga Bem': 'Siga Bem',
    'atómico': 'atomic', 'Tema': 'Theme', 'Orientação': 'Orientation', 'Histórico': 'History',
    'Desfazer (Ctrl+Z)': 'Undo (Ctrl+Z)', 'Refazer (Ctrl+Y)': 'Redo (Ctrl+Y)',
    'Recuperar trabalho local': 'Recover local work', 'Descartar': 'Discard',
    'Arquivo': 'File', 'Salvar': 'Save', 'Baixar painel atual': 'Download current panel',
    'Baixar todos os painéis': 'Download all panels', 'Importar': 'Import',
    'Retomar rascunho': 'Resume draft', 'Editar': 'Edit', 'Copiar todas as teclas': 'Copy all keys',
    'Colar todas as teclas': 'Paste all keys', 'Excluir todas as teclas': 'Delete all keys',
    'Limpar tudo até o background': 'Clear everything to background', 'Ferramentas': 'Tools',
    'Verificar painéis': 'Check panels', 'Publicar': 'Publish',
    'Salvar no tablet': 'Save to tablet', 'Salvar agora': 'Save now',
    'Paleta': 'Palette', 'Teclas': 'Keys', 'Adicionar tecla': 'Add key', 'Fundo Moderno': 'Modern background',
    'Fundo Soviético': 'Soviet background', 'Variante soviética': 'Soviet variant',
    'Branca / Esmaltada': 'White / Enamel', 'Carregar imagem local': 'Load local image',
    'Usar fundo oficial': 'Use official background', 'Pacote Moderno': 'Modern package',
    'Pacote Soviético': 'Soviet package', 'Pacote OBD': 'OBD package', 'Todos': 'All',
    'Ignição': 'Ignition', 'Motor': 'Engine', 'Rotativo': 'Rotary', 'Freio': 'Brake',
    'Lâmpadas': 'Lamps', 'Novos assets são instalados pelo diretório do TruckDeck e aparecem aqui após o recarregamento.': 'New assets are installed in the TruckDeck directory and appear here after reload.',
    'Zonas de telemetria partilhadas. Botões continuam sempre atómicos.': 'Shared telemetry zones. Buttons remain atomic.',
    'telemetria': 'telemetry', 'Clique num ativo para o adicionar ao centro. Arraste-o para posicionar. Ctrl/⌘ + clique seleciona vários botões (grupo) — arraste para mover o grupo todo. Ctrl/⌘+C copia o grupo selecionado, Ctrl/⌘+V cola-o deslocado para reposicionar.': 'Click an asset to add it to the center. Drag it to position it. Ctrl/⌘ + click selects multiple keys (group) — drag to move the whole group. Ctrl/⌘+C copies the selected group, Ctrl/⌘+V pastes it offset for repositioning.',
    'Clique para adicionar ao centro. Arraste para posicionar. Ctrl/⌘+clique seleciona vários.': 'Click to add to center. Drag to position. Ctrl/⌘+click selects multiple.',
    'Grelha': 'Grid', 'Guias': 'Guides', 'Bloquear Teclas': 'Lock Keys', 'Copiar grupo': 'Copy group',
    'Colar grupo': 'Paste group', 'Ajustar': 'Fit', 'Prancheta de layout': 'Layout canvas',
    'Solte um ativo aqui': 'Drop an asset here', 'ou clique num ativo da paleta': 'or click an asset in the palette',
    'Pronto para posicionar ativos.': 'Ready to position assets.', 'selecionado': 'selected',
    'selecionados': 'selected', 'Camadas & Inspector': 'Layers & Inspector', 'Layers': 'Layers',
    'Selecione um elemento': 'Select an element', 'As dimensões, coordenadas e identidade aparecerão aqui.': 'Dimensions, coordinates and identity will appear here.',
    'Botão': 'Button', 'Identidade / função': 'Identity / function', 'ID do layout': 'Layout ID',
    'Função (catálogo)': 'Function (catalog)', 'O que esta tecla faz?': 'What does this key do?', 'Lâmpada = indicador passivo de telemetria. Não envia comando de veículo.': 'Lamp = passive telemetry indicator. Sends no vehicle command.',
    'Nenhum / sem pictograma (asset já tem texto ou legenda impressa de fábrica)': 'None / no pictogram (asset already has text or a factory-printed label)',
    'Cor do elemento': 'Element color', 'Aplicar cor': 'Apply color', 'Seletor rotativo — posições (base estática, só o pino gira)': 'Rotary selector — positions (static base, pin only rotates)',
    'Raio da coroa (% do componente)': 'Crown radius (% of component)', 'Diâmetro do botão (% do componente)': 'Button diameter (% of component)',
    'Ângulo de fábrica do botão (graus)': 'Factory button angle (degrees)', 'Posições — uma por linha: id | graus | rótulo | icone': 'Positions — one per line: id | degrees | label | icon',
    'Deixe vazio para usar o preset da função (Luzes / Limpa-vidros). O estágio de telemetria é a ordem das linhas. Ícones: nomes do catálogo; nome desconhecido não desenha nada.': 'Leave empty to use the function preset (Lights / Wipers). The telemetry stage is the order of the lines. Icons: catalog names; unknown names draw nothing.',
    'Aplicar posições': 'Apply positions', 'Etiqueta de Texto': 'Text Label', 'Texto na tecla': 'Key text', 'Posição atómica': 'Atomic position',
    'Unidade dos campos': 'Field units', 'Percentagem (%)': 'Percentage (%)', 'Pixels (px)': 'Pixels (px)',
    'Largura': 'Width', 'Altura': 'Height', 'Tamanho': 'Size', 'Valores exportados em percentagem relativa ao fundo.': 'Values exported as a percentage relative to the background.',
    'Pictograma automático': 'Automatic pictogram', 'Ancoragem rápida do ícone dentro do asset. Cor, opacidade e halo são configurações globais do aparelho.': 'Quickly anchor the icon inside the asset. Color, opacity and halo are global device settings.',
    'Centro absoluto': 'Absolute center', 'Topo / visor': 'Top / display', 'Base / rodapé': 'Bottom / footer',
    'Preencher': 'Fill', 'Ajuste fino (avançado)': 'Fine adjustment (advanced)', 'Deslocamento X (%)': 'X offset (%)',
    'Deslocamento Y (%)': 'Y offset (%)', 'Centrar pictograma': 'Center pictogram', 'Copiar pictograma': 'Copy pictogram',
    'Aplicar pictograma': 'Apply pictogram', 'Copiar tecla': 'Copy key', 'Aplicar tecla': 'Apply key',
    'Remover selecionado': 'Remove selected', 'Remover': 'Remove', 'Duplo clique copia as dimensões.': 'Double-click copies dimensions.',
    'Zonas e botões aplicados em tempo real no tablet': 'Zones and buttons applied in real time on the tablet',
    'Mostrar na prancheta': 'Show on canvas', 'Ocultar na prancheta': 'Hide on canvas',
    'Nenhum elemento nesta orientação.': 'No elements in this orientation.', 'personalizado': 'custom',
    'CATEGORIA': 'CATEGORY', 'imagem local': 'local image', 'preview temporário': 'temporary preview',
    'Tema Soviético — empty plate + widgets PNG.': 'Soviet theme — empty plate + PNG widgets.',
    'Tema Modern — empty plate + rockers.': 'Modern theme — empty plate + rockers.',
    'Fechar': 'Close', 'Ação desfeita.': 'Action undone.', 'Ação refeita.': 'Action redone.',
    'Fundo oficial restaurado.': 'Official background restored.', 'Prancheta ajustada à área visível.': 'Canvas fitted to visible area.',
    'Descartar o trabalho local não publicado?\n\nIsto apaga a cópia guardada neste navegador. Se quiser guardá-la antes, clique em "Recuperar", depois em "Salvar rascunho".': 'Discard unpublished local work?\n\nThis deletes the copy saved in this browser. To keep it, click "Recover", then "Save draft".',
    'Descartar o trabalho local não salvo no tablet?\n\nIsto apaga a cópia guardada neste navegador. Se quiser guardá-la antes, clique em "Recuperar", depois em "Salvar rascunho".': 'Discard local work not yet saved to the tablet?\n\nThis deletes the copy saved in this browser. To keep it, click "Recover", then "Save draft".',
    'Remover este ativo personalizado da paleta? Botões já posicionados com ele continuam a existir, mas sem a imagem na paleta.': 'Remove this custom asset from the palette? Keys already placed with it will remain, but without the palette image.',
    'Excluir todas as teclas desta orientação?\n\nAs zonas OBD e o fundo permanecem.': 'Delete all keys in this orientation?\n\nOBD zones and the background remain.',
    'Substituir todas as teclas desta orientação pelas teclas copiadas?': 'Replace all keys in this orientation with the copied keys?',
    'Limpar tudo até o background?\n\nRemove todos os elementos desta orientação e restaura o fundo oficial limpo.': 'Clear everything to the background?\n\nRemove all elements in this orientation and restore the clean official background.',
    'Esta tela tem ': 'This screen has ', 'Publicar no tablet mesmo assim?': 'Publish to the tablet anyway?', 'Salvar no tablet mesmo assim?': 'Save to tablet anyway?',
    'Cor do elemento aplicada.': 'Element color applied.', 'Teclas bloqueadas — arraste só o pictograma.': 'Keys locked — drag only the pictogram.',
    'Teclas desbloqueadas.': 'Keys unlocked.', 'Seletor: preset da função (sem posições manuais).': 'Selector: function preset (no manual positions).',
    'Ativo personalizado removido da paleta.': 'Custom asset removed from palette.',
    'Imagem local carregada apenas para esta sessão.': 'Local image loaded for this session only.',
    'Tudo limpo até o background oficial.': 'Everything cleared to the official background.',
    'Elementos removidos.': 'Elements removed.', 'Seleção duplicada.': 'Selection duplicated.',
    'Nada selecionado para copiar.': 'Nothing selected to copy.', 'Área de transferência vazia.': 'Clipboard is empty.',
    'Painel Publicado!': 'Panel Published!', 'Painel salvo no tablet!': 'Panel saved to tablet!', 'A salvar...': 'Saving...', 'Publicação cancelada. Corrija o que está em vermelho.': 'Publishing cancelled. Fix the items in red.',
    'Publicação cancelada: há teclas ou luzes sem função.': 'Publishing cancelled: some keys or lamps have no function.',
    'Envio cancelado. Corrija o que está em vermelho.': 'Send cancelled. Fix the items in red.',
    'Envio cancelado: há teclas ou luzes sem função.': 'Send cancelled: some keys or lamps have no function.',
    'Tudo certo: nenhuma tecla ou luz sem função.': 'All good: no key or lamp without a function.',
    'Verificação concluída: nenhuma pendência.': 'Check complete: no outstanding issues.',
    'Importado no editor — nada foi enviado ao tablet.': 'Imported into the editor — nothing was sent to the tablet.',
    'Mapeamento importado para revisão. Use “Publicar no tablet” quando estiver pronto.': 'Mapping imported for review. Use “Publish to tablet” when ready.',
    'Mapeamento importado para revisão. Use “Salvar no tablet” quando estiver pronto.': 'Mapping imported for review. Use “Save to tablet” when ready.',
    'Exportado: layout-report-': 'Exported: layout-report-', 'Import failed: ': 'Import failed: ',
    'Avançado': 'Advanced', 'Básico': 'Basic',
    'Abra o editor pelo botão do TruckDeck Bridge no PC.': 'Open the editor using the TruckDeck Bridge button on your PC.',
    'PIN não configurado. Abra o TruckDeck Bridge e configure o PIN.': 'PIN not configured. Open TruckDeck Bridge and set the PIN.',
    '① Escolha o painel': '① Choose the panel',
    '② Toque numa tecla': '② Tap a key',
    '③ Configure': '③ Configure',
    '④ Salvar no tablet': '④ Save to tablet',
    'Passos': 'Steps',
    'Alternar entre modo Básico e Avançado': 'Toggle between Basic and Advanced mode',
    'Telemetria (automática)': 'Telemetry (automatic)',
    'Indicador de telemetria': 'Telemetry indicator',
    'Cópia local descartada.': 'Local copy discarded.',
    'Trabalho local recuperado.': 'Local work recovered.',
    'Rascunho salvo.': 'Draft saved.',
    'Rascunho carregado.': 'Draft loaded.'
  };

  const looseWords = {
    'bege': 'beige', 'preto': 'black', 'vermelho': 'red', 'verde': 'green', 'azul': 'blue',
    'amarelo': 'yellow', 'branco': 'white', 'prata': 'silver', 'aço': 'steel', 'oliva': 'olive',
    'enferrujado': 'rusted', 'desgastado': 'worn', 'brilhante': 'shiny', 'escovado': 'brushed',
    'cromado': 'chrome', 'circular': 'circular', 'clássico': 'classic', 'couro': 'leather',
    'Luzes': 'Lights', 'Limpadores': 'Wipers', 'soviético': 'Soviet', 'cima': 'up', 'meio': 'middle',
    'baixo': 'down', 'triangular': 'triangular', 'vermelha': 'red', 'verde': 'green', 'azul': 'blue',
    'âmbar': 'amber', 'Combustível': 'Fuel', 'Pressão de ar': 'Air pressure', 'Velocímetro': 'Speedometer',
    'Motor': 'Engine', 'Freio': 'Brake', 'Ativado': 'Active', 'Desligado': 'Off', 'Reserva': 'Reserve',
    'Alerta': 'Alert', 'Crítica': 'Critical', 'do': 'of', 'da': 'of', 'de': 'of', 'para': 'for',
    'com': 'with', 'sem': 'without', 'e': 'and'
  };
  const reverse = { en: new Map(), pt: new Map() };
  Object.keys(PT).forEach((key) => { reverse.pt.set(key, key); reverse.en.set(PT[key], key); });
  const textKeys = new WeakMap();
  const attrKeys = new WeakMap();
  let lang = '';
  const storageKey = 'desktruck.editor.lang';

  function normalize(value) { return String(value).replace(/\s+/g, ' ').trim(); }
  function translateLoose(value) {
    return String(value).replace(/[A-Za-zÀ-ÿ]+/g, (word) => looseWords[word] || word);
  }
  function resolveLanguage(value) { return value === 'pt' || value === 'en' ? value : 'en'; }
  function editorLanguage() {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'pt' || saved === 'en') return saved;
    return /^pt/i.test(navigator.language || '') ? 'pt' : 'en';
  }
  function translateValue(value, target) {
    const raw = String(value);
    const key = reverse[target === 'pt' ? 'en' : 'pt'].get(normalize(raw)) || reverse.pt.get(normalize(raw));
    if (key) return target === 'pt' ? key : PT[key];
    let out = raw;
    if (target === 'en') {
      out = out.replace(/^(\d+) selecionado(s?)$/, (_, n) => n + ' selected' + (n === '1' ? '' : ''));
      out = out.replace(/^(\d+) painel\/painéis$/, (_, n) => n + (n === '1' ? ' panel' : ' panels'));
      out = out.replace(/^(\d+) tecla\(s\) copiada\(s\)\.$/, '$1 key(s) copied.');
      out = out.replace(/^(\d+) elemento\(s\) copiado\(s\)\.$/, '$1 element(s) copied.');
    }
    return out;
  }
  function translateNode(node) {
    const current = normalize(node.nodeValue);
    if (!current) return;
    const stored = textKeys.get(node);
    if (stored && typeof stored === 'object') {
      node.nodeValue = lang === 'pt' ? stored.pt : stored.en;
      return;
    }
    const key = stored || reverse[lang === 'pt' ? 'en' : 'pt'].get(current) || reverse.pt.get(current);
    if (!key) {
      const dynamicEnglish = translateValue(current, 'en');
      if (lang === 'en' && dynamicEnglish !== current) {
        textKeys.set(node, { pt: current, en: dynamicEnglish });
        node.nodeValue = dynamicEnglish;
        return;
      }
      const parent = node.parentElement;
      if (lang === 'en' && parent && parent.closest('.asset-tool, .dashboard-tool, .layer-name, option, optgroup, #selectedType, #functionFieldLabel')) {
        const en = translateLoose(current);
        if (en !== current) { textKeys.set(node, { pt: current, en }); node.nodeValue = en; }
      }
      return;
    }
    textKeys.set(node, key);
    const next = lang === 'pt' ? key : PT[key];
    if (node.nodeValue !== next) node.nodeValue = next;
  }
  function translateAttributes(root) {
    const attrs = ['title', 'aria-label', 'placeholder', 'alt'];
    root.querySelectorAll('*').forEach((el) => attrs.forEach((attr) => {
      if (!el.hasAttribute(attr)) return;
      const map = attrKeys.get(el) || {};
      const current = normalize(el.getAttribute(attr));
      const key = map[attr] || reverse[lang === 'pt' ? 'en' : 'pt'].get(current) || reverse.pt.get(current);
      if (!key) return;
      map[attr] = key; attrKeys.set(el, map);
      el.setAttribute(attr, lang === 'pt' ? key : PT[key]);
    }));
  }
  function translateDom(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) continue;
      translateNode(node);
    }
    translateAttributes(root);
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-editor-lang]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.editorLang === lang);
      button.setAttribute('aria-pressed', String(button.dataset.editorLang === lang));
    });
  }
  function editorSetLanguage(next) {
    lang = resolveLanguage(next);
    localStorage.setItem(storageKey, lang);
    translateDom(document.body);
    window.dispatchEvent(new CustomEvent('editorlanguagechange', { detail: { lang } }));
  }
  window.editorLanguage = () => lang;
  window.editorSetLanguage = editorSetLanguage;
  window.editorT = (key) => lang === 'pt' ? key : (PT[key] || key);

  function init() {
    lang = editorLanguage();
    document.querySelectorAll('[data-editor-lang]').forEach((button) => {
      button.addEventListener('click', () => editorSetLanguage(button.dataset.editorLang));
    });
    translateDom(document.body);
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) translateDom(node);
        else if (node.nodeType === Node.TEXT_NODE) translateNode(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
