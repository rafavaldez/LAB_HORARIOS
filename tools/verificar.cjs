// Pruebas del lector: node tools/verificar.cjs. No se ejecutan en GitHub Pages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../vendor/xlsx.full.min.js');
const { parseWorkbook, classText } = require('../excel.js');
const { peruTime, buildMessage } = require('../message.js');
const { lanes } = require('../timeline.js');

const source = fs.readFileSync(path.join(__dirname, '../data/actual/GUIAS X SEMANA Y HORARIOS.xlsx'));
const real = parseWorkbook(source, XLSX);
assert.ok(real.weeks.length > 0);
assert.equal(real.weeks.find(w => w.number === 16).dates[0], '2026-11-23');
assert.equal(real.weeks.find(w => w.number === 16).inferred, false);
for (const event of real.events) {
  assert.ok(real.weeks.find(w => w.number === event.week).dates.includes(event.date));
  assert.ok(event.start < event.end);
  assert.match(event.sourceCell, /^W\d+![A-Z]+\d+$/);
}
function fixture(year, course, duplicate = false) {
  const book = XLSX.utils.book_new();
  for (const number of [1, 2]) {
    const date = (Date.UTC(year, 2, 1) - Date.UTC(1899, 11, 30)) / 86400000;
    const row = number === 1 ? ['SEMANA 01', date] : duplicate ? ['SEMANA 02', date] : ['SEMANA 99'];
    const sheet = XLSX.utils.aoa_to_sheet([row, ['HORA', 'LUNES', 'MARTES'], ['AMBIENTE', 'QUIMICA', 'SME'], ['08:00 - 09:30', `ABC-${course}\nC123-Docente de prueba\n08:00 - 09:30`]]);
    XLSX.utils.book_append_sheet(book, sheet, `W0${number}`);
  }
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}
const season = parseWorkbook(fixture(2027, 'Nuevo ciclo'), XLSX);
assert.equal(season.weeks[0].dates[0], '2027-03-01');
assert.equal(season.weeks[1].dates[0], '2027-03-08');
assert.equal(season.weeks[1].inferred, true);
assert.equal(season.events.length, 2);
assert.throws(() => parseWorkbook(fixture(2027, 'Fechas repetidas', true), XLSX), /misma fecha/);
assert.ok(season.events.every(event => event.course === 'Nuevo ciclo' && event.teacher === 'Docente de prueba'));
assert.equal(classText('IA (Promps)\n15:00 - 16:30').teacher, '');
assert.equal(classText('Evento\n29:00 - 30:00'), null);
assert.throws(() => parseWorkbook(new Uint8Array([1, 2, 3]), XLSX), /Excel|hojas/);
const instant = new Date('2026-09-27T00:05:00Z');
assert.equal(peruTime(instant), '19:05');
assert.equal(buildMessage({ course: 'Química', teacher: 'Ana Pérez', environment: 'QUIMICA' }, 'W07', instant, 'Química'),
  'Siendo las 19:05 horas se da inicio al curso Química - Semana 7, en el laboratorio Química, a cargo del docente Ana Pérez.');
assert.match(buildMessage({ course: 'Física', teacher: 'Ana Pérez', environment: 'FISICA' }, 'W16', instant, 'Física'), /Semana 16,/);
const overlapping = lanes([{ start: '08:00', end: '09:30' }, { start: '08:15', end: '09:00' }, { start: '09:30', end: '10:00' }]);
assert.deepEqual(overlapping.map(entry => [entry.lane, entry.laneCount]), [[0, 2], [1, 2], [0, 1]]);
console.log(`OK: ${real.weeks.length} semanas, ${real.events.length} clases; W16, hora peruana, copia y simultaneidad verificados.`);
