(() => {
  'use strict';
  const { bounds, lanes, minute, renderTimeScale, MORNING_START, AFTERNOON_START, AFTERNOON_END } = window.HorariosTimeline;
  const el = (tag, text, css) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (css) node.className = css; return node; };
  const shortDay = new Intl.DateTimeFormat('es-PE', { weekday: 'short' });
  const longDay = new Intl.DateTimeFormat('es-PE', { weekday: 'long' });
  const dayDate = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit' });
  const timeLabel = mins => [Math.floor(mins / 60), mins % 60].map(n => String(n).padStart(2, '0')).join(':');

  window.HorariosWeekView = function renderWeek(container, { week, items, selectedDate, today, environmentStyle, openEvent, selectDate, shifts, onFilter }) {
    const inline = el('div');
    const shell = el('div', undefined, 'week-shell');
    const dialog = el('dialog', undefined, 'week-full');
    dialog.setAttribute('aria-labelledby', 'weekFullscreenTitle');
    const fullTitle = el('h2', `Semana ${week.number}`);
    fullTitle.id = 'weekFullscreenTitle';
    const fullDates = week.dates.map(date => dayDate.format(new Date(`${date}T12:00:00`)));
    const fullCopy = el('div', undefined, 'week-full-title');
    fullCopy.append(fullTitle, el('span', `${fullDates[0]} – ${fullDates.at(-1)}`));
    fullCopy.hidden = true;
    const bar = el('div', undefined, 'week-toolbar');
    const tools = el('div', undefined, 'week-zoom-tools');
    const buttons = el('div', undefined, 'week-zoom-buttons');
    buttons.setAttribute('role', 'group');
    buttons.setAttribute('aria-label', 'Ampliación del horario');
    const button = (label, description) => {
      const node = el('button', label, 'week-zoom-button');
      node.type = 'button'; node.setAttribute('aria-label', description);
      return node;
    };
    const smaller = button('−', 'Reducir horario'), larger = button('+', 'Ampliar horario');
    smaller.classList.add('week-zoom-step'); larger.classList.add('week-zoom-step');
    const fit = button('Ajustar', 'Ajustar a la semana completa');
    const expand = button('Pantalla completa', 'Ver la semana en pantalla completa');
    expand.classList.add('week-expand');
    const close = button('Cerrar', 'Cerrar pantalla completa');
    close.hidden = true;
    const level = el('span', undefined, 'week-zoom-level');
    level.setAttribute('role', 'status');
    const coverage = el('span', undefined, 'week-coverage');
    coverage.setAttribute('role', 'status');
    const shiftFilters = el('div', undefined, 'week-shifts');
    shiftFilters.setAttribute('role', 'group');
    shiftFilters.setAttribute('aria-label', 'Turnos por hora de inicio');
    for (const [key, name, start, end] of [
      ['morning', 'Mañana', MORNING_START, AFTERNOON_START],
      ['afternoon', 'Tarde', AFTERNOON_START, AFTERNOON_END],
    ]) {
      const label = el('label', undefined, 'week-shift');
      label.dataset.shift = key;
      const input = el('input');
      input.type = 'checkbox';
      input.checked = shifts[key];
      input.setAttribute('aria-label', name);
      input.onchange = () => {
        shifts[key] = input.checked;
        zoom.refresh(drawSchedule());
      };
      label.append(input, el('strong', name), el('span', `${timeLabel(start)}–${timeLabel(end)}`));
      shiftFilters.append(label);
    }
    buttons.append(smaller, level, larger, fit);
    tools.append(fullCopy, shiftFilters, buttons, expand, close);
    const dayPicker = el('div', undefined, 'week-days');
    dayPicker.setAttribute('role', 'group'); dayPicker.setAttribute('aria-label', 'Saltar a un día de la semana');
    bar.append(tools, coverage, dayPicker);

    const board = el('div', undefined, 'week-board');
    board.tabIndex = 0; board.setAttribute('role', 'region'); board.setAttribute('aria-label', 'Clases por día y hora. Usa + para ampliar, − para reducir y 0 para ajustar.');
    const stage = el('div', undefined, 'week-stage');
    const grid = el('div', undefined, 'week-grid');
    const empty = el('p', undefined, 'week-filter-empty');
    empty.setAttribute('role', 'status');
    stage.append(grid);
    board.append(stage);
    shell.append(bar, board, empty);
    inline.append(shell);
    container.append(inline, dialog);
    const zoom = window.HorariosWeekZoom({ shell, board, stage, grid, dialog, inline, controls: { smaller, larger, fit, expand, close, level, fullCopy } });
    zoom.refresh(drawSchedule());
    return zoom.destroy;

    function drawSchedule() {
      const visible = items.filter(event => shifts[minute(event.start) < AFTERNOON_START ? 'morning' : 'afternoon']);
      onFilter(visible);
      const range = bounds(visible);
      const length = range.end - range.start;
      const grouped = new Map(week.dates.map(date => [date, []]));
      for (const event of visible) grouped.get(event.date)?.push(event);
      coverage.textContent = visible.length
        ? `7 días · ${timeLabel(range.start)}–${timeLabel(range.end)} · ${visible.length} ${visible.length === 1 ? 'clase' : 'clases'}`
        : '7 días · Sin clases visibles';
      empty.hidden = visible.length > 0;
      empty.textContent = shifts.morning || shifts.afternoon ? 'No hay clases con estos filtros.' : 'Selecciona Mañana o Tarde para ver las clases.';
      grid.replaceChildren();
      dayPicker.replaceChildren();
      grid.classList.toggle('is-empty', !visible.length);
      grid.style.setProperty('--week-hours', String(length / 60));
      const clock = el('div', undefined, 'week-clock');
      clock.append(el('div', 'Hora', 'week-column-head week-clock-head'));
      const ticks = el('div', undefined, 'week-track timeline-axis shift-track');
      if (visible.length) renderTimeScale(grid, ticks, range);
      clock.append(ticks);
      grid.append(clock);
      const columns = [], dayButtons = [], headings = [], widths = [];

      function activate(date) {
        const selected = week.dates.indexOf(date);
        columns.forEach((column, i) => {
          column.classList.toggle('is-selected', i === selected);
          dayButtons[i].setAttribute('aria-pressed', String(i === selected));
          headings[i].setAttribute('aria-pressed', String(i === selected));
        });
      }
      for (const [date, events] of grouped) {
        const dateObject = new Date(`${date}T12:00:00`);
        const long = longDay.format(dateObject), short = shortDay.format(dateObject).replace(/\.$/, '');
        const dateText = dayDate.format(dateObject);
        const title = `${long} ${dateText}`;
        const count = `${events.length} ${events.length === 1 ? 'clase' : 'clases'}`;
        const entries = lanes(events);
        const widest = Math.max(1, ...entries.map(entry => entry.laneCount));
        widths.push(`max(var(--week-day-min), calc(${widest} * var(--week-lane-width)))`);
        const dayButton = el('button', undefined, 'week-day-button'); dayButton.type = 'button';
        dayButton.setAttribute('aria-label', `${title}, ${count}`);
        dayButton.append(el('strong', short), el('span', dateText));
        if (date === today) dayButton.dataset.today = '';
        dayPicker.append(dayButton); dayButtons.push(dayButton);

        const column = el('section', undefined, 'week-column'); column.setAttribute('aria-label', title);
        const head = el('button', undefined, 'week-column-head');
        head.type = 'button';
        head.setAttribute('aria-label', `Ampliar ${title}, ${count}${date === today ? ', hoy' : ''}`);
        const heading = el('span', undefined, 'week-column-date');
        heading.append(el('strong', short), el('span', dateText));
        head.append(heading, el('span', date === today ? `Hoy · ${count}` : count, 'week-column-count'));
        headings.push(head);
        const track = el('div', undefined, 'week-track shift-track');
        if (visible.length && !events.length) track.append(el('p', 'Sin clases', 'week-no-classes'));
        for (const { event, lane, laneCount } of entries) {
          const [environment, color] = environmentStyle(event.environment);
          const card = el('button', undefined, 'week-event parallel-column'); card.type = 'button'; card.dataset.color = color;
          card.classList.toggle('is-overlapping', laneCount > 1);
          card.style.top = `calc(${(minute(event.start) - range.start) / length * 100}% + 2px)`;
          card.style.height = `calc(${(minute(event.end) - minute(event.start)) / length * 100}% - 4px)`;
          card.style.left = `calc(${lane / laneCount * 100}% + 2px)`;
          card.style.width = `calc(${100 / laneCount}% - 4px)`;
          const place = el('span', environment, 'week-event-place');
          card.append(el('span', `${event.start}–${event.end}`, 'week-event-time'), el('strong', event.course, 'week-event-course'), place);
          if (event.timeConflict) { card.classList.add('has-time-conflict'); card.append(el('span', 'Revisar hora', 'week-event-conflict')); }
          card.setAttribute('aria-label', `${title}, ${event.start} a ${event.end}, ${event.course}, ${environment}${event.timeConflict ? ', hora por confirmar' : ''}. Abrir detalle.`);
          card.onclick = () => openEvent(event);
          track.append(card);
        }
        column.append(head, track); grid.append(column); columns.push(column);
        dayButton.onclick = head.onclick = () => {
          selectedDate = date;
          selectDate(date);
          activate(date);
          zoom.jump(column);
        };
      }
      grid.style.gridTemplateColumns = `var(--week-time-width) ${widths.join(' ')}`;
      grid.style.width = `calc(var(--week-time-width) + ${widths.join(' + ')})`;
      activate(selectedDate);
      return visible.length ? length / 60 : 0;
    }
  };
})();
