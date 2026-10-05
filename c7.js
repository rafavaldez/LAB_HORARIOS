(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  let catalog = null, selected = null;
  const label = env => env.name || 'Nombre por confirmar';

  function renderSelection() {
    selected = catalog.environments.find(env => env.code === $('c7Environment').value) || null;
    $('c7Preview').hidden = !selected;
    $('c7Open').disabled = !selected;
    if (!selected) return;
    $('c7Type').textContent = selected.type;
    $('c7SelectedName').textContent = label(selected);
    $('c7SelectedCode').textContent = selected.code;
    $('c7SelectedInfo').replaceChildren(element('span', selected.site), element('span', `${selected.entries.length} registros`), element('span', 'Formato C7'));
  }
  function filterEnvironments() {
    if (!catalog) return;
    const query = normalize($('c7EnvironmentSearch').value).replace(/\s+/g, ' ').trim();
    const previous = $('c7Environment').value;
    const matches = catalog.environments.filter(env => query.split(' ').every(term => normalize(`${label(env)} ${env.code} ${env.type}`).includes(term)));
    $('c7Environment').replaceChildren();
    for (const env of matches) {
      const option = element('option', `${label(env)} · ${env.code}`);
      option.value = env.code;
      $('c7Environment').append(option);
    }
    if (matches.some(env => env.code === previous)) $('c7Environment').value = previous;
    $('c7Environment').disabled = !matches.length;
    $('c7Status').textContent = matches.length ? 'Selecciona un ambiente y abre su C7 para consultar todos los equipos y comentarios.' : 'No hay ambientes que coincidan. Prueba con otro nombre o código.';
    renderSelection();
  }
  function renderEquipment() {
    if (!selected) return;
    const query = normalize($('c7EquipmentSearch').value).trim();
    const entries = selected.entries.filter(entry => query.split(/\s+/).every(term => normalize(`${entry.name} ${entry.comments}`).includes(term)));
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      const row = element('tr');
      const quantity = element('td', entry.quantity === '' ? '—' : String(entry.quantity), 'c7-quantity');
      quantity.dataset.label = 'N.º de equipos';
      const name = element('td', entry.name, 'c7-equipment-name');
      const comments = element('td', entry.comments || '—', 'c7-comments');
      if (!entry.comments) comments.classList.add('c7-no-comment');
      comments.dataset.label = 'Comentarios';
      row.append(quantity, name, comments); fragment.append(row);
    }
    $('c7Rows').replaceChildren(fragment);
    $('c7RecordCount').textContent = query ? `${entries.length} de ${selected.entries.length} registros` : `${selected.entries.length} registros`;
    $('c7NoEquipment').hidden = Boolean(entries.length);
  }
  function openInventory() {
    if (!selected) return;
    $('c7DialogTitle').textContent = label(selected);
    $('c7DialogMeta').textContent = `${selected.code} · ${selected.local}`;
    $('c7University').textContent = selected.university;
    $('c7NameNotice').hidden = selected.nameConfirmed;
    $('c7EquipmentSearch').value = '';
    $('c7Notes').replaceChildren(...selected.notes.map(note => element('p', note)));
    $('c7Dialog').querySelector('details').open = false;
    $('c7Source').textContent = `Fuente: ${catalog.source} · Hoja ${selected.sheet}.`;
    $('c7Rows').closest('table').querySelector('caption').textContent = `Equipos de ${label(selected)} · ${selected.code}`;
    renderEquipment();
    $('c7Dialog').showModal();
    $('c7Dialog').querySelector('.c7-dialog-body').scrollTop = 0;
    $('c7Close').focus({ preventScroll: true });
  }
  async function loadCatalog() {
    $('c7Retry').hidden = true;
    $('c7Status').textContent = 'Consultando los inventarios publicados…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const url = new URL('data/c7.json', document.baseURI);
      url.searchParams.set('v', String(Date.now()));
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('No se encontró el catálogo de inventarios.');
      const data = await response.json();
      if (!Array.isArray(data.environments) || !data.environments.length || data.environments.some(env => !env.code || !Array.isArray(env.entries))) throw new Error('El catálogo de inventarios no es válido.');
      catalog = data;
      $('c7Count').textContent = `${catalog.environments.length} ambientes`;
      $('c7EnvironmentSearch').disabled = false;
      filterEnvironments();
    } catch (error) {
      $('c7Status').textContent = error.name === 'AbortError' ? 'La consulta tardó demasiado. Pulsa Reintentar.' : 'No se pudieron cargar los inventarios. Pulsa Reintentar.';
      $('c7Retry').hidden = false;
    } finally { clearTimeout(timeout); }
  }
  $('c7EnvironmentSearch').addEventListener('input', filterEnvironments);
  $('c7Environment').addEventListener('change', renderSelection);
  $('c7Open').addEventListener('click', openInventory);
  $('c7EquipmentSearch').addEventListener('input', renderEquipment);
  $('c7Retry').addEventListener('click', loadCatalog);
  $('c7Close').addEventListener('click', () => $('c7Dialog').close());
  $('c7Dialog').addEventListener('click', event => {
    if (event.target !== $('c7Dialog')) return;
    const rect = $('c7Dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('c7Dialog').close();
  });
  loadCatalog();
})();
