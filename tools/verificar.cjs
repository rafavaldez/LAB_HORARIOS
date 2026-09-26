// Pruebas del lector: node tools/verificar.cjs. No se ejecutan en GitHub Pages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../vendor/xlsx.full.min.js');
const { parseWorkbook, classText } = require('../excel.js');

const source = fs.readFileSync(path.join(__dirname, '../data/GUIAS X SEMANA Y HORARIOS.xlsx'));
const real = parseWorkbook(source, XLSX);
assert.ok(real.weeks.length > 0);
for (const event of real.events) {
  assert.ok(real.weeks.find(w => w.number === event.week).dates.includes(event.date));
  assert.ok(event.start < event.end);
  assert.match(event.sourceCell, /^W\d+![A-Z]+\d+$/);
}
function fixture(year, course) {
  const book = XLSX.utils.book_new();
  for (const number of [1, 2]) {
    const date = (Date.UTC(year, 2, 1) - Date.UTC(1899, 11, 30)) / 86400000;
    const row = number === 1 ? ['SEMANA 01', date] : ['SEMANA 99'];
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
assert.ok(season.events.every(event => event.course === 'Nuevo ciclo' && event.teacher === 'Docente de prueba'));
assert.equal(classText('IA (Promps)\n15:00 - 16:30').teacher, '');
assert.equal(classText('Evento\n29:00 - 30:00'), null);
assert.throws(() => parseWorkbook(new Uint8Array([1, 2, 3]), XLSX), /Excel|hojas/);
console.log(`OK: ${real.weeks.length} semanas, ${real.events.length} clases del Excel real; nuevo ciclo, fechas calculadas, celdas sin docente y archivo inválido verificados.`);
