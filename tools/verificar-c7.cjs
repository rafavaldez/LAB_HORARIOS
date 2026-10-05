const assert = require('node:assert/strict');
const fs = require('node:fs');
const XLSX = require('../vendor/xlsx.full.min.js');
const catalog = require('../data/c7.json');
const source = process.argv[2];
if (!source) throw new Error('Indica el archivo C7 original para comparar el catálogo.');
const book = XLSX.read(fs.readFileSync(source), { type: 'buffer' });
assert.equal(catalog.environments.length, book.SheetNames.length);
assert.equal(new Set(catalog.environments.map(env => env.code)).size, book.SheetNames.length);
let total = 0;
for (const name of book.SheetNames) {
  const sheet = book.Sheets[name], env = catalog.environments.find(value => value.sheet === name);
  assert.ok(env, name);
  assert.equal(env.code, sheet.C6.v);
  assert.equal(env.university, sheet.C5.v);
  const end = XLSX.utils.decode_range(sheet['!ref']).e.r + 1;
  const entries = [];
  for (let row = 8; row <= end; row++) {
    if (String(sheet[`B${row}`]?.v || '').startsWith('Nota:')) break;
    const equipment = sheet[`C${row}`]?.v;
    if (equipment === undefined || String(equipment).trim() === '') continue;
    entries.push({ quantity: sheet[`B${row}`]?.v ?? '', name: String(equipment).trim(), comments: String(sheet[`D${row}`]?.v ?? '').trim(), sourceRow: row });
  }
  assert.deepEqual(env.entries, entries, `${name}: el inventario debe coincidir celda por celda.`);
  assert.ok(env.notes.some(note => note.startsWith('DECLARO BAJO')), `${name}: declaración original conservada.`);
  total += entries.length;
}
assert.equal(catalog.environments.find(env => env.code === 'F08L01LA01').name, 'GABINETE DE TOPOGRAFÍA');
assert.equal(catalog.environments.find(env => env.code === 'F08L01LA12').name, 'LABORATORIO DE DESARROLLO DE SOFTWARE');
const pc = catalog.environments.find(env => env.code === 'F08L01LA10');
assert.equal(pc.entries.find(entry => entry.name === 'SOFTWARE - CYBERRAT').quantity, '-');
assert.equal(pc.entries.find(entry => entry.name === 'ESCRITORIO / MESA - ALUMNO').comments, 'BIPERSONALES = 1 / TRIPERSONALES = 12');
console.log(`OK: ${catalog.environments.length} ambientes y ${total} registros coinciden con el C7 original, incluidas cantidades, comentarios y filas de origen.`);
