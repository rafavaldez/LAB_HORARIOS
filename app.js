(() => {
  'use strict';
  const SOURCE = 'data/GUIAS X SEMANA Y HORARIOS.xlsx';
  const { parseWorkbook, normalize, addDays, minute } = window.HorariosExcel;
  const $ = id => document.getElementById(id);
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const pad = n => String(n).padStart(2, '0');
  const parseDate = iso => new Date(`${iso}T12:00:00`);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const weekday = date => (parseDate(date).getDay() + 6) % 7;
  const el = (tag, content, className) => { const node = document.createElement(tag); if (content !== undefined) node.textContent = content; if (className) node.className = className; return node; };
  function icon(name, extra = '') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `icon ${extra}`); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `assets/icons.svg#${name}`); svg.append(use); return svg;
  }
  const environmentStyle = value => ({
    FISICA: ['Física', 'red', 'flask'], QUIMICA: ['Química', 'blue', 'flask'],
    SOFTWARE: ['Software', 'purple', 'laptop'], GESELL: ['Sala Gesell', 'amber', 'people'],
    SME: ['SME', 'teal', 'people'], GEOLOGIA: ['Geología', 'amber', 'layers'], BIBLIOTECA: ['Biblioteca', 'slate', 'building'],
  }[normalize(value)] || [value, 'slate', 'building']);
  const state = { data: null, weeks: new Map(), dates: new Map(), events: new Map(), loading: false };
  function option(value, label) { const node = el('option', label); node.value = value; return node; }
  function dateFormat(iso, short = false) {
    const value = new Intl.DateTimeFormat('es-PE', short ? { day: '2-digit', month: '2-digit', year: 'numeric' } : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseDate(iso));
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  function setDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parseDate(value).valueOf())) return;
    $('dateInput').value = value;
    const week = state.dates.get(value);
    $('weekSelect').value = week ? String(week.number) : '';
    $('daySelect').value = String(week ? week.dates.indexOf(value) : weekday(value));
    render();
  }
  function renderEmpty(title, message, clear = false) {
    const panel = el('div', undefined, 'empty');
    panel.append(icon('calendar'), el('h3', title), el('p', message));
    if (clear) { const button = el('button', 'Limpiar filtros', 'today-button'); button.onclick = () => { $('searchInput').value = ''; $('envSelect').value = ''; render(); }; panel.append(button); }
    $('results').append(panel);
  }
  function render() {
    if (!state.data) return;
    const date = $('dateInput').value;
    const week = state.dates.get(date);
    const all = state.events.get(date) || [];
    const query = normalize($('searchInput').value);
    const environment = $('envSelect').value;
    const items = all.filter(e => (!environment || e.environment === environment) && (!query || normalize([e.course, e.teacher, e.courseCode, e.section, e.program].join(' ')).includes(query)));
    $('dateTitle').textContent = dateFormat(date);
    $('dateSub').textContent = week ? `Semana ${week.sheet} · ${days[weekday(date)]}${week.inferred ? ' · Fecha calculada' : ''}` : 'Esta fecha no está incluida en el archivo';
    $('weekBadge').textContent = week ? `Semana ${week.sheet}` : 'Sin semana';
    $('statClasses').textContent = items.length;
    $('statEnvs').textContent = new Set(items.map(e => e.environment)).size;
    const minutes = items.reduce((sum, e) => sum + minute(e.end) - minute(e.start), 0);
    $('statHours').textContent = `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} m` : ''}`;
    $('resultCount').textContent = `${items.length} ${items.length === 1 ? 'clase programada' : 'clases programadas'}`;
    const warnings = state.data.warnings.filter(w => w.startsWith('Semanas no incluidas') || (week && w.startsWith(`${week.sheet}:`)));
    $('dataWarnings').hidden = !warnings.length;
    $('dataWarnings').textContent = warnings.join(' ');
    $('results').replaceChildren();
    if (!items.length) {
      renderEmpty('Sin clases para mostrar', !week ? 'Selecciona una semana disponible para consultar sus horarios.' : all.length ? 'Ninguna clase coincide con los filtros seleccionados.' : 'No hay clases registradas para este día en el Excel.', all.length > 0);
      return;
    }
    const groups = new Map();
    for (const event of items) { if (!groups.has(event.environment)) groups.set(event.environment, []); groups.get(event.environment).push(event); }
    let groupIndex = 0;
    for (const [env, events] of groups) {
      const [label, color, symbol] = environmentStyle(env);
      const group = el('details', undefined, 'group'); group.dataset.color = color;
      group.open = !window.matchMedia('(max-width: 600px)').matches || groupIndex++ === 0 || Boolean(query);
      const summary = el('summary');
      summary.append(icon(symbol), el('span', label, 'group-name'), el('span', `${events.length} ${events.length === 1 ? 'clase' : 'clases'}`, 'group-count'), icon('down', 'chevron'));
      const body = el('div', undefined, 'group-events');
      for (const event of events) {
        const article = el('article', undefined, 'event');
        const time = el('div', undefined, 'event-time'); time.append(icon('clock'), el('span', `${event.start} – ${event.end}`));
        const info = el('div', undefined, 'event-body'); info.append(el('div', event.course, 'event-course'));
        if (event.teacher) { const meta = el('div', undefined, 'event-meta'); meta.append(icon('user'), el('span', event.teacher)); info.append(meta); }
        if (event.program) info.append(el('p', event.program, 'event-program'));
        article.append(time, info);
        const code = [event.courseCode, event.section].filter(Boolean).join(' · ');
        if (code) article.append(el('span', code, 'event-code'));
        body.append(article);
      }
      group.append(summary, body); $('results').append(group);
    }
  }
  function installData(data) {
    const selectedDate = $('dateInput').value;
    const selectedEnvironment = $('envSelect').value;
    state.data = data; state.weeks.clear(); state.dates.clear(); state.events.clear();
    for (const week of data.weeks) { state.weeks.set(week.number, week); for (const date of week.dates) state.dates.set(date, week); }
    for (const event of data.events) { if (!state.events.has(event.date)) state.events.set(event.date, []); state.events.get(event.date).push(event); }
    $('weekSelect').replaceChildren(option('', 'Sin semana'), ...data.weeks.map(w => option(w.number, `${w.sheet}${w.inferred ? ' *' : ''}`)));
    $('daySelect').replaceChildren(...days.map((day, index) => option(index, day)));
    const environments = [...new Set(data.events.map(e => e.environment))].sort((a, b) => environmentStyle(a)[0].localeCompare(environmentStyle(b)[0], 'es'));
    $('envSelect').replaceChildren(option('', 'Todos'), ...environments.map(env => option(env, environmentStyle(env)[0])));
    if (environments.includes(selectedEnvironment)) $('envSelect').value = selectedEnvironment;
    $('filterFields').disabled = false; $('searchInput').disabled = false;
    const dates = [...state.dates.keys()].sort();
    const initial = state.dates.has(selectedDate) ? selectedDate : state.dates.has(today()) ? today() : dates.find(date => date >= today()) || dates.at(-1);
    setDate(initial);
    $('sourceInfo').textContent = `${data.weeks.length} ${data.weeks.length === 1 ? 'semana' : 'semanas'} · ${dateFormat(dates[0], true)} — ${dateFormat(dates.at(-1), true)}`;
  }
  async function loadExcel() {
    if (state.loading) return;
    state.loading = true;
    $('refreshBtn').disabled = true; $('refreshBtn').setAttribute('aria-busy', 'true');
    $('cronograma').setAttribute('aria-busy', 'true'); $('errorBox').hidden = true;
    $('loadStatus').textContent = 'Consultando el Excel publicado…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      if (location.protocol === 'file:') throw new Error('Abre esta carpeta con un servidor local o publícala en GitHub Pages. El navegador necesita HTTP para leer el Excel automáticamente.');
      const url = new URL(SOURCE, document.baseURI);
      url.searchParams.set('v', String(Date.now()));
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`No se pudo descargar el Excel (HTTP ${response.status}). Comprueba que exista ${SOURCE} en el sitio publicado.`);
      const buffer = await response.arrayBuffer();
      if (!buffer.byteLength) throw new Error('El Excel publicado está vacío.');
      const data = parseWorkbook(buffer, window.XLSX);
      installData(data);
      $('loadStatus').textContent = `Horarios actualizados · ${new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
    } catch (error) {
      $('errorBox').hidden = false;
      $('errorBox').textContent = error.name === 'AbortError' ? 'La consulta tardó demasiado. Reintenta con Actualizar horarios.' : error.message;
      $('loadStatus').textContent = state.data ? 'No se pudo actualizar. Se conserva la última lectura de esta sesión.' : 'No se han cargado horarios.';
      if (!state.data) { $('dateTitle').textContent = 'Cronograma no disponible'; $('dateSub').textContent = 'Revisa el mensaje y vuelve a intentar.'; }
    } finally {
      clearTimeout(timeout); state.loading = false;
      $('refreshBtn').disabled = false; $('refreshBtn').setAttribute('aria-busy', 'false');
      $('cronograma').setAttribute('aria-busy', 'false');
    }
  }
  $('dateInput').addEventListener('change', () => { if ($('dateInput').value) setDate($('dateInput').value); });
  $('weekSelect').addEventListener('change', () => { const week = state.weeks.get(Number($('weekSelect').value)); if (week) setDate(week.dates[Number($('daySelect').value)]); });
  $('daySelect').addEventListener('change', () => { const week = state.weeks.get(Number($('weekSelect').value)); const day = Number($('daySelect').value); setDate(week ? week.dates[day] : addDays($('dateInput').value, day - weekday($('dateInput').value))); });
  $('envSelect').addEventListener('change', render); $('searchInput').addEventListener('input', render);
  $('prevDay').onclick = () => setDate(addDays($('dateInput').value, -1));
  $('nextDay').onclick = () => setDate(addDays($('dateInput').value, 1));
  $('todayBtn').onclick = () => setDate(today()); $('refreshBtn').onclick = loadExcel;
  $('menuBtn').onclick = () => { const open = $('mainNav').classList.toggle('is-open'); $('menuBtn').setAttribute('aria-expanded', open); };
  $('mainNav').addEventListener('click', () => { $('mainNav').classList.remove('is-open'); $('menuBtn').setAttribute('aria-expanded', 'false'); });
  document.querySelectorAll('.help-trigger').forEach(button => button.onclick = () => $('helpDialog').showModal());
  $('closeHelp').onclick = () => $('helpDialog').close();
  $('helpDialog').addEventListener('click', event => { if (event.target === $('helpDialog')) { const rect = $('helpDialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('helpDialog').close(); } });
  loadExcel();
})();
