(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const icon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `assets/icons.svg#${name}`);
    svg.append(use);
    return svg;
  };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  const documents = window.HorariosDocuments || [];
  $('documentCount').textContent = `${documents.length} ${documents.length === 1 ? 'documento' : 'documentos'}`;
  for (const documentInfo of documents) {
    const card = element('article', undefined, 'document-card');
    const main = element('div', undefined, 'document-main');
    const symbol = element('span', undefined, 'document-icon'); symbol.append(icon('file'));
    const content = element('div', undefined, 'document-copy');
    content.append(element('span', documentInfo.category, 'document-category'), element('h3', documentInfo.title), element('p', documentInfo.description), element('span', documentInfo.detail, 'document-detail'));
    main.append(symbol, content);

    const actions = element('div', undefined, 'document-actions');
    const preview = element('a', undefined, 'document-preview');
    preview.href = documentInfo.file; preview.target = '_blank'; preview.rel = 'noopener';
    preview.setAttribute('aria-label', `Abrir ${documentInfo.title} en otra pestaña`);
    preview.append(icon('external'), element('span', 'Ver PDF'));
    const download = element('a', undefined, 'document-download');
    download.href = documentInfo.file; download.download = documentInfo.downloadName;
    download.setAttribute('aria-label', `Descargar ${documentInfo.title}`);
    download.append(icon('download'), element('span', 'Descargar'));
    actions.append(preview, download);
    card.append(main, actions);
    $('documentList').append(card);
  }

  let currentPage = location.hash === '#cronograma' ? 'cronograma' : 'inicio';
  const updatePage = () => {
    const route = location.hash.slice(1);
    if (route === 'inicio' || route === 'cronograma') currentPage = route;
    $('inicio').hidden = currentPage !== 'inicio';
    $('cronograma').hidden = currentPage !== 'cronograma';
    document.querySelectorAll('[data-page]').forEach(link => {
      const active = link.dataset.page === currentPage;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = currentPage === 'inicio' ? 'Laboratorios UTP · Inicio' : 'Cronograma de Laboratorios · UTP';
    if (route === 'inicio' || route === 'cronograma') requestAnimationFrame(() => scrollTo(0, 0));
  };
  window.addEventListener('hashchange', updatePage);
  updatePage();
})();
