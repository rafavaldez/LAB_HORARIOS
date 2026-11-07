(() => {
  'use strict';
  const { bounds, lanes, minute, renderTimeScale } = window.HorariosTimeline;
  const el = (tag, text, css) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (css) node.className = css; return node; };
  const shortDay = new Intl.DateTimeFormat('es-PE', { weekday: 'short' });
  const longDay = new Intl.DateTimeFormat('es-PE', { weekday: 'long' });
  const dayDate = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit' });

  window.HorariosWeekView = function renderWeek(container, { week, items, selectedDate, today, environmentStyle, icon, openEvent, selectDate, scrollToSelected }) {
    const range = bounds(items);
    const length = range.end - range.start;
    const grouped = new Map(week.dates.map(date => [date, []]));
    for (const event of items) grouped.get(event.date)?.push(event);

    const bar = el('div', undefined, 'week-toolbar');
    const hint = el('p', 'Toca un día o desliza el tablero para recorrer la semana.', 'week-hint');
    const dayPicker = el('div', undefined, 'week-days');
    dayPicker.setAttribute('role', 'group'); dayPicker.setAttribute('aria-label', 'Saltar a un día de la semana');
    bar.append(dayPicker, hint);

    const board = el('div', undefined, 'week-board');
    board.tabIndex = 0; board.setAttribute('role', 'region'); board.setAttribute('aria-label', 'Clases por día y hora. Desplazamiento horizontal disponible.');
    const grid = el('div', undefined, 'week-grid');
    grid.classList.toggle('is-empty', !items.length);
    grid.style.setProperty('--week-hours', String(length / 60));
    const clock = el('div', undefined, 'week-clock');
    clock.append(el('div', 'Hora', 'week-column-head week-clock-head'));
    const ticks = el('div', undefined, 'week-track timeline-axis shift-track');
    if (items.length) renderTimeScale(grid, ticks, range);
    clock.append(ticks); grid.append(clock);
    const columns = [], dayButtons = [], widths = [];

    for (const [date, events] of grouped) {
      const dateObject = new Date(`${date}T12:00:00`);
      const long = longDay.format(dateObject), short = shortDay.format(dateObject).replace(/\.$/, '');
      const title = `${long} ${dayDate.format(dateObject)}`;
      const entries = lanes(events);
      const widest = Math.max(1, ...entries.map(entry => entry.laneCount));
      widths.push(`max(var(--week-day-min), calc(${widest} * var(--week-lane-width)))`);
      const dayButton = el('button', undefined, 'week-day-button'); dayButton.type = 'button';
      dayButton.setAttribute('aria-label', `${title}: ${events.length} ${events.length === 1 ? 'clase' : 'clases'}`);
      dayButton.append(el('strong', short), el('span', dayDate.format(dateObject)));
      if (date === today) dayButton.dataset.today = '';
      dayPicker.append(dayButton); dayButtons.push(dayButton);

      const column = el('section', undefined, 'week-column'); column.setAttribute('aria-label', title);
      const head = el('div', undefined, 'week-column-head');
      head.append(el('h3', long), el('strong', dayDate.format(dateObject)), el('span', date === today ? 'Hoy' : `${events.length} ${events.length === 1 ? 'clase' : 'clases'}`));
      const track = el('div', undefined, 'week-track shift-track');
      if (!events.length) track.append(el('p', 'Sin clases', 'week-no-classes'));
      for (const { event, lane, laneCount } of entries) {
        const [environment, color, symbol] = environmentStyle(event.environment);
        const card = el('button', undefined, 'week-event parallel-column'); card.type = 'button'; card.dataset.color = color;
        card.classList.toggle('is-overlapping', laneCount > 1);
        card.style.top = `calc(${(minute(event.start) - range.start) / length * 100}% + 2px)`;
        card.style.height = `calc(${(minute(event.end) - minute(event.start)) / length * 100}% - 4px)`;
        card.style.left = `calc(${lane / laneCount * 100}% + 2px)`;
        card.style.width = `calc(${100 / laneCount}% - 4px)`;
        const place = el('span', undefined, 'week-event-place'); place.append(icon(symbol), el('span', environment));
        card.append(el('span', `${event.start}–${event.end}`, 'week-event-time'), el('strong', event.course, 'week-event-course'), place);
        if (event.timeConflict) { card.classList.add('has-time-conflict'); card.append(el('span', 'Revisar hora', 'week-event-conflict')); }
        card.setAttribute('aria-label', `${title}, ${event.start} a ${event.end}, ${event.course}, ${environment}${event.timeConflict ? ', hora por confirmar' : ''}. Abrir detalle.`);
        card.onclick = () => openEvent(event);
        track.append(card);
      }
      column.append(head, track); grid.append(column); columns.push(column);
      dayButton.onclick = () => { selectDate(date); activate(date, true); };
    }
    function activate(date, move) {
      const selected = week.dates.indexOf(date);
      columns.forEach((column, i) => { column.classList.toggle('is-selected', i === selected); dayButtons[i].setAttribute('aria-pressed', String(i === selected)); });
      if (move && selected >= 0 && board.isConnected) {
        const left = columns[selected].getBoundingClientRect().left - board.getBoundingClientRect().left + board.scrollLeft - clock.offsetWidth - board.clientLeft;
        board.scrollTo({ left, behavior: 'instant' });
      }
    }
    grid.style.gridTemplateColumns = `var(--week-time-width) ${widths.map(width => `minmax(${width}, 1fr)`).join(' ')}`;
    grid.style.minWidth = `calc(var(--week-time-width) + ${widths.join(' + ')})`;
    board.append(grid);
    container.append(bar, board);
    activate(selectedDate, false);
    if (scrollToSelected) requestAnimationFrame(() => activate(selectedDate, true));
    return board;
  };
})();
