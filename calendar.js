/* Genera un calendario local a partir del Excel publicado. No usa servicios externos. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HorariosCalendar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const peruClock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const compact = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escapeText = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');

  function peruToUtc(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Fecha u hora de clase inválida.');
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    if (hour > 23 || minute > 59) throw new Error('Hora de clase inválida.');
    const wallTime = Date.UTC(year, month - 1, day, hour, minute);
    if (new Date(wallTime).toISOString().slice(0, 10) !== date) throw new Error('Fecha de clase inválida.');
    let utc = wallTime;
    for (let attempt = 0; attempt < 2; attempt++) {
      const parts = Object.fromEntries(peruClock.formatToParts(new Date(utc)).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
      const local = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
      utc += wallTime - local;
    }
    return new Date(utc);
  }

  function fold(line) {
    const encoder = new TextEncoder();
    const output = [];
    let current = '';
    let size = 0;
    for (const character of line) {
      const bytes = encoder.encode(character).length;
      if (size + bytes > 75) { output.push(current); current = ' '; size = 1; }
      current += character;
      size += bytes;
    }
    output.push(current);
    return output.join('\r\n');
  }

  function createCalendar(events, { now = new Date(), environment = '', environmentName = value => value } = {}) {
    const upcoming = events.filter(event => (!environment || event.environment === environment) && peruToUtc(event.date, event.start) > now)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.sourceCell.localeCompare(b.sourceCell));
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Laboratorios UTP//Horarios//ES',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Laboratorios UTP',
    ];
    const stamp = compact(now);
    for (const event of upcoming) {
      const location = environmentName(event.environment);
      const summary = `${event.course} · ${location}`;
      const description = [`Semana ${event.week}`, event.teacher ? `Docente: ${event.teacher}` : '', event.section ? `Sección: ${event.section}` : '', event.program || ''].filter(Boolean).join('\n');
      const uid = `${event.date.replace(/-/g, '')}-${event.sourceCell.replace(/[^A-Za-z0-9]/g, '-')}-${event.start.replace(':', '')}@laboratorios-utp.local`;
      lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`,
        `DTSTART:${compact(peruToUtc(event.date, event.start))}`,
        `DTEND:${compact(peruToUtc(event.date, event.end))}`,
        `SUMMARY:${escapeText(summary)}`, `LOCATION:${escapeText(location)}`,
        `DESCRIPTION:${escapeText(description)}`,
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT30M', `DESCRIPTION:${escapeText(`En 30 minutos: ${summary}`)}`, 'END:VALARM',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT15M', `DESCRIPTION:${escapeText(`En 15 minutos: ${summary}`)}`, 'END:VALARM',
        'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return { content: lines.map(fold).join('\r\n') + '\r\n', count: upcoming.length };
  }

  return { createCalendar, peruToUtc };
});
