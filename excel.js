/* Lectura del Excel en el navegador. No necesita servidor ni conversión previa. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HorariosExcel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  const pad = n => String(n).padStart(2, '0');
  const addDays = (iso, days) => {
    const date = new Date(`${iso}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const timePattern = /\b(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\b/;
  const justTime = /^\s*\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}\s*$/;
  const minute = value => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };

  function classText(value) {
    const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const times = lines.join(' ').match(timePattern);
    if (!times) return null;
    const start = times[1].padStart(5, '0');
    const end = times[2].padStart(5, '0');
    if ([start, end].some(t => Number(t.slice(0, 2)) > 23 || Number(t.slice(3)) > 59) || minute(end) <= minute(start)) return null;
    const detail = lines.filter(line => !justTime.test(line));
    const first = detail[0] || '';
    const code = first.match(/^([A-Z0-9]+)\s*-\s*(.+)$/i);
    const second = detail[1] || '';
    const teacher = second.match(/^([A-Z0-9]+)\s*-\s*(.+)$/i);
    return {
      start, end, courseCode: code ? code[1] : '', course: code ? code[2].trim() : first,
      section: teacher ? teacher[1] : '', teacher: teacher ? teacher[2].trim() : second,
      program: detail.slice(2).join(' · '),
    };
  }

  function parseWorkbook(buffer, XLSX) {
    if (!XLSX?.read) throw new Error('No se encontró el lector de Excel en la carpeta vendor.');
    let book;
    try { book = XLSX.read(buffer, { type: 'array', cellDates: false }); }
    catch { throw new Error('El archivo publicado no es un Excel válido o está dañado.'); }
    const date1904 = Boolean(book.Workbook?.WBProps?.date1904);
    function excelDate(value) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        const date = XLSX.SSF.parse_date_code(value, { date1904 });
        return date ? `${date.y}-${pad(date.m)}-${pad(date.d)}` : '';
      }
      if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
      if (typeof value !== 'string') return '';
      const valueString = value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(valueString)) return valueString;
      const match = valueString.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (!match) return '';
      const result = `${match[3]}-${pad(match[2])}-${pad(match[1])}`;
      const parsed = new Date(`${result}T12:00:00Z`);
      return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === result ? result : '';
    }
    const warnings = [];
    const sheets = [];
    for (const name of book.SheetNames) {
      const match = name.trim().match(/^W0*(\d{1,3})$/i);
      if (!match || Number(match[1]) < 1) continue;
      const number = Number(match[1]);
      const sheetRange = XLSX.utils.decode_range(book.Sheets[name]['!ref'] || 'A1');
      const grid = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, raw: true, defval: null, range: { s: { r: 0, c: 0 }, e: sheetRange.e } });
      const header = grid.findIndex(row => row.some(value => normalize(value) === 'HORA'));
      if (header < 0 || !grid[header + 1]) { warnings.push(`${name}: no se encontró la cabecera HORA.`); continue; }
      const columns = [], starts = new Map();
      let currentDay = -1;
      const environments = grid[header + 1];
      for (let col = 0; col < grid[header].length; col++) {
        const index = DAYS.indexOf(normalize(grid[header][col]));
        if (index >= 0) { currentDay = index; starts.set(index, col); }
        if (currentDay >= 0 && String(environments[col] ?? '').trim()) columns.push({ col, day: currentDay, environment: String(environments[col]).trim() });
      }
      if (!columns.length) { warnings.push(`${name}: no se encontraron ambientes.`); continue; }
      const dateRow = grid.slice(0, header).find(row => row.some(value => {
        const found = normalize(value).match(/^SEMANA\s*0*(\d+)$/);
        return found && Number(found[1]) === number;
      }));
      const dates = Array(7).fill('');
      if (dateRow) for (const [day, col] of starts) {
        const nextCol = [...starts.values()].filter(c => c > col).sort((a, b) => a - b)[0] ?? environments.length;
        for (let c = col; c < nextCol; c++) {
          const parsed = excelDate(dateRow[c]);
          if (parsed) { dates[day] = parsed; break; }
        }
      }
      sheets.push({ number, sheet: name, grid, header, columns, dates });
    }
    sheets.sort((a, b) => a.number - b.number);
    if (!sheets.length) throw new Error('No se encontraron hojas semanales válidas (W01, W02, etc.). Mantén la estructura de la plantilla.');
    const anchors = new Set(sheets.filter(s => s.dates[0]).map(s => addDays(s.dates[0], -7 * (s.number - 1))));
    const firstMonday = anchors.size === 1 ? [...anchors][0] : '';
    const events = [], weeks = [];
    for (const sheet of sheets) {
      let inferred = false;
      let monday = sheet.dates[0];
      if (!monday) {
        const firstKnown = sheet.dates.findIndex(Boolean);
        if (firstKnown >= 0) monday = addDays(sheet.dates[firstKnown], -firstKnown);
        else if (firstMonday) monday = addDays(firstMonday, 7 * (sheet.number - 1));
      }
      if (!monday) { warnings.push(`${sheet.sheet}: no se pudo determinar una fecha; revisa la fila SEMANA ${sheet.number}.`); continue; }
      const dates = sheet.dates.map((value, day) => {
        if (value) return value;
        inferred = true;
        return addDays(monday, day);
      });
      if (inferred) warnings.push(`${sheet.sheet}: fechas calculadas a partir del calendario del archivo.`);
      weeks.push({ number: sheet.number, sheet: sheet.sheet, dates, inferred });
      for (let row = sheet.header + 2; row < sheet.grid.length; row++) {
        for (const column of sheet.columns) {
          const value = sheet.grid[row][column.col];
          if (typeof value !== 'string') continue;
          const event = classText(value);
          if (!event) {
            if (timePattern.test(value)) warnings.push(`${sheet.sheet}!${XLSX.utils.encode_cell({ r: row, c: column.col })}: horario inválido; no se muestra.`);
            continue;
          }
          events.push({ ...event, week: sheet.number, date: dates[column.day], environment: column.environment,
            sourceCell: `${sheet.sheet}!${XLSX.utils.encode_cell({ r: row, c: column.col })}` });
        }
      }
    }
    if (!weeks.length) throw new Error('No hay semanas con fechas utilizables. Revisa las filas SEMANA y sus fechas en el Excel.');
    const dateOwner = new Map();
    for (const week of weeks) for (const date of week.dates) {
      const owner = dateOwner.get(date);
      if (owner && owner !== week.sheet) throw new Error(`${owner} y ${week.sheet} tienen la misma fecha (${date}). Corrige las fechas del Excel antes de publicarlo.`);
      dateOwner.set(date, week.sheet);
    }
    const available = new Set(weeks.map(w => w.number));
    const missing = [];
    for (let i = Math.min(...available); i <= Math.max(...available); i++) if (!available.has(i)) missing.push(`W${pad(i)}`);
    if (missing.length) warnings.push(`Semanas no incluidas en el archivo: ${missing.join(', ')}.`);
    events.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.environment.localeCompare(b.environment, 'es'));
    return { weeks, events, firstMonday, warnings };
  }
  return { parseWorkbook, normalize, addDays, minute, classText };
});
