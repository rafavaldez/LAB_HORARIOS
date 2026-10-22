(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { parseCatalog, filterCatalog, sortCatalog } = window.HorariosGuides;
  const pageSize = 12, format = value => value.toLocaleString('es-PE');
  let catalog = [], filtered = [], page = 1, loading = false, frameTimer;
  const el = (tag, text, css) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (css) node.className = css; return node; };
  const icon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svg.namespaceURI, 'use'); use.setAttribute('href', `assets/icons.svg#${name}`); svg.append(use); return svg;
  };
  const labels = { PRESENCIAL: 'Presencial', SEMIPRESENCIAL: 'Semipresencial' };
  const typeStyle = type => type.includes('PPT') ? 'purple' : type.includes('simplificada') ? 'blue' : type.includes('campo') ? 'amber' : 'red';
  function option(value, label) { const node = el('option', label); node.value = value; return node; }
  function selection() { return { query: $('guideSearch').value, modality: $('guideModality').value, type: $('guideType').value, week: $('guideWeek').value }; }
  function clearFilters() {
    $('guideSearch').value = ''; for (const id of ['guideModality', 'guideType', 'guideWeek']) $(id).value = '';
    update(); $('guideSearch').focus({ preventScroll: true });
  }
  function update() {
    if (!catalog.length) return;
    page = 1;
    filtered = sortCatalog(filterCatalog(catalog, selection()), $('guideSort').value);
    const active = Object.entries(selection()).filter(([, value]) => value.trim());
    $('guideChips').replaceChildren();
    for (const [key, value] of active) {
      const label = key === 'query' ? `Búsqueda: ${value}` : key === 'modality' ? labels[value] || value : key === 'week' ? value === 'none' ? 'Sin semana específica' : `Semana ${value}` : value;
      const chip = el('button', undefined, 'guide-chip'); chip.type = 'button';
      chip.append(el('span', label), icon('close')); chip.setAttribute('aria-label', `Quitar filtro ${label}`);
      chip.onclick = () => { $(key === 'query' ? 'guideSearch' : key === 'modality' ? 'guideModality' : key === 'type' ? 'guideType' : 'guideWeek').value = ''; update(); };
      $('guideChips').append(chip);
    }
    $('guideClear').hidden = !active.length; $('guideChips').hidden = !active.length;
    render();
  }
  function card(guide) {
    const article = el('article', undefined, 'guide-card'); article.dataset.tone = typeStyle(guide.type);
    const top = el('div', undefined, 'guide-card-top'); top.append(el('span', guide.type, 'guide-type'), el('span', guide.code, 'guide-code'));
    const heading = el('h3', guide.course);
    const meta = el('div', undefined, 'guide-meta');
    for (const label of [guide.number !== '-' ? guide.number : '', guide.weeks.length ? `Semana ${guide.week}` : 'Sin semana específica', labels[guide.modality] || guide.modality].filter(Boolean)) meta.append(el('span', label));
    const title = el('p', guide.title, 'guide-document-title');
    const bottom = el('div', undefined, 'guide-card-bottom');
    if (guide.links) {
      const provider = el('span', guide.links.provider, 'guide-provider'); provider.prepend(icon('file'));
      const actions = el('div', undefined, 'guide-card-actions');
      const view = el('button', undefined, 'guide-view'); view.type = 'button';
      view.append(icon('external'), el('span', 'Ver guía')); view.setAttribute('aria-label', `Ver guía de ${guide.course}, ${guide.number}`);
      view.onclick = () => openGuide(guide);
      const download = el('button', undefined, 'guide-save'); download.type = 'button';
      download.append(icon('download'), el('span', 'Descargar')); download.setAttribute('aria-label', `Descargar guía de ${guide.course}, ${guide.number}`);
      download.onclick = () => openGuide(guide, true);
      actions.append(view, download); bottom.append(provider, actions);
    } else {
      const notice = el('p', guide.sourceLink || 'El catálogo no proporciona un enlace para este material.', 'guide-unavailable');
      notice.prepend(icon('help')); bottom.append(notice);
    }
    article.append(top, heading, meta); if (guide.title) article.append(title); article.append(bottom); return article;
  }
  function render() {
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); page = Math.min(page, pages);
    const start = (page - 1) * pageSize, end = Math.min(start + pageSize, filtered.length);
    $('guideResultCount').textContent = `${format(filtered.length)} ${filtered.length === 1 ? 'documento encontrado' : 'documentos encontrados'}`;
    $('guideRange').textContent = filtered.length ? `Mostrando ${format(start + 1)}–${format(end)} de ${format(filtered.length)}` : 'Prueba otro curso, código o una combinación de filtros distinta.';
    $('guideResults').replaceChildren(...filtered.slice(start, end).map(card));
    $('guideEmpty').hidden = Boolean(filtered.length);
    $('guidePagination').hidden = filtered.length <= pageSize;
    $('guidePageInfo').textContent = `Página ${page} de ${format(pages)}`;
    $('guidePrevious').disabled = page === 1; $('guideNext').disabled = page >= pages;
  }
  function changePage(delta) {
    page += delta; render();
    $('guideResultsHeading').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    $('guideResultsHeading').focus({ preventScroll: true });
  }
  function openGuide(guide, downloading = false) {
    if (!guide.links) return;
    $('guideViewerTitle').textContent = guide.course;
    $('guideViewerMeta').textContent = [guide.code, guide.number !== '-' ? guide.number : guide.type, guide.weeks.length ? `Semana ${guide.week}` : '', guide.links.provider].filter(Boolean).join(' · ');
    $('guideOriginal').href = guide.links.original;
    $('guideDownload').href = guide.links.download;
    $('guideDownloadLabel').textContent = guide.links.directDownload ? 'Descargar archivo' : 'Abrir PDF para descargar';
    $('guideViewerNote').textContent = guide.links.directDownload ? 'Puedes descargar el archivo con el botón superior. Google Drive puede solicitar acceso o una confirmación según el documento.' : 'Para guardar el PDF, usa el icono de descarga de su visor. También puedes abrirlo en otra pestaña con «Abrir PDF para descargar».';
    $('guideViewerNote').classList.toggle('is-download', downloading);
    $('guideFrameStatus').textContent = 'Abriendo documento…';
    $('guideFrame').title = `Documento de ${guide.course}`;
    clearTimeout(frameTimer);
    $('guideFrame').src = guide.links.preview;
    frameTimer = setTimeout(() => { $('guideFrameStatus').textContent = '¿No aparece el documento? Pulsa «Abrir original» para verlo en su sitio.'; }, 7000);
    $('guideViewer').showModal(); $('guideViewerClose').focus({ preventScroll: true });
  }
  function closeViewer() { $('guideViewer').close(); }
  async function loadCatalog() {
    if (loading) return;
    loading = true; $('guideRetry').hidden = true;
    $('guideLoadStatus').hidden = false; $('guideLoadStatus').textContent = 'Cargando el catálogo de guías…';
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const url = new URL('data/guias.csv', document.baseURI); url.searchParams.set('v', String(Date.now()));
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('No se encontró el archivo de guías.');
      const next = parseCatalog(await response.text());
      if (!next.length) throw new Error('El catálogo está vacío.');
      catalog = next;
      for (const [id, key, label] of [['guideModality', 'modality', 'Todas las modalidades'], ['guideType', 'type', 'Todos los tipos']]) {
        $(id).replaceChildren(option('', label), ...[...new Set(catalog.map(g => g[key]))].sort((a, b) => a.localeCompare(b, 'es')).map(value => option(value, labels[value] || value)));
      }
      const weeks = [...new Set(catalog.flatMap(g => g.weeks))].sort((a, b) => a - b);
      $('guideWeek').replaceChildren(option('', 'Todas las semanas'), ...weeks.map(week => option(String(week), `Semana ${week}`)), option('none', 'Sin semana específica'));
      $('guideTotal').textContent = format(catalog.length);
      $('guideCourseTotal').textContent = format(new Set(catalog.map(g => g.course)).size);
      $('guideControls').disabled = false; $('guideSort').disabled = false;
      $('guideLoadStatus').hidden = true; $('guideResultsSection').hidden = false;
      update();
    } catch (error) {
      $('guideLoadStatus').textContent = error.name === 'AbortError' ? 'La consulta tardó demasiado. Puedes volver a intentarlo.' : 'No pudimos cargar las guías. Comprueba tu conexión y vuelve a intentarlo.';
      $('guideRetry').hidden = false;
    } finally { clearTimeout(timeout); loading = false; }
  }
  $('guideSearch').addEventListener('input', update);
  for (const id of ['guideModality', 'guideType', 'guideWeek', 'guideSort']) $(id).addEventListener('change', update);
  $('guideClear').addEventListener('click', clearFilters); $('guideEmptyClear').addEventListener('click', clearFilters);
  $('guidePrevious').addEventListener('click', () => changePage(-1)); $('guideNext').addEventListener('click', () => changePage(1));
  $('guideRetry').addEventListener('click', loadCatalog);
  $('guideViewerClose').addEventListener('click', closeViewer);
  $('guideFrame').addEventListener('load', () => { if ($('guideViewer').open) $('guideFrameStatus').textContent = 'Si el visor no carga o solicita acceso, usa «Abrir original».'; });
  $('guideViewer').addEventListener('close', () => { if (!$('guideViewer').open) { clearTimeout(frameTimer); $('guideFrame').removeAttribute('src'); } });
  $('guideViewer').addEventListener('click', event => {
    if (event.target !== $('guideViewer')) return;
    const box = $('guideViewer').getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeViewer();
  });
  // Se consulta al entrar en Guías, sin retrasar el cronograma ni Inicio.
  const enter = () => { if (location.hash === '#guias' && !catalog.length) loadCatalog(); };
  window.addEventListener('hashchange', enter); enter();
})();
