// Preparación local del catálogo. GitHub Pages sirve únicamente el JSON resultante.
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../vendor/xlsx.full.min.js');
const clean = value => String(value ?? '').replace(/\r\n/g, '\n').trim();
const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase();
const read = file => XLSX.read(fs.readFileSync(file), { type: 'buffer' });

function extract(c7, consolidated) {
  const names = new Map();
  for (const sheetName of consolidated.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(consolidated.Sheets[sheetName], { header: 1, defval: null });
    const header = rows.findIndex(row => row.some(v => normalize(v) === 'COD SUNEDU') && row.some(v => normalize(v) === 'LAB-C6'));
    if (header < 0) continue;
    const fields = rows[header].map(normalize);
    const codeColumn = fields.indexOf('COD SUNEDU'), nameColumn = fields.indexOf('LAB-C6');
    const siteColumn = fields.indexOf('SEDE'), localColumn = fields.indexOf('LOCAL');
    for (const row of rows.slice(header + 1)) {
      const code = normalize(row[codeColumn]).replace(/\s/g, '');
      const name = clean(row[nameColumn]);
      if (!/^F08L01(?:LA|TA)\d+$/.test(code) || !name) continue;
      if (siteColumn >= 0 && normalize(row[siteColumn]) !== 'TACNA') continue;
      if (!names.has(code)) names.set(code, new Map());
      names.get(code).set(normalize(name), { name, site: siteColumn >= 0 ? clean(row[siteColumn]) : 'Tacna', local: localColumn >= 0 ? clean(row[localColumn]) : 'F08L01 - Tacna' });
    }
  }
  const environments = [], codes = new Set();
  for (const sheetName of c7.SheetNames) {
    const sheet = c7.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: { s: { r: 0, c: 0 }, e: range.e }, defval: null });
    const header = rows.findIndex(row => row.some(v => normalize(v).startsWith('NOMBRE DEL EQUIPO')) && row.some(v => normalize(v).startsWith('COMENTARIOS')));
    if (header < 0) throw new Error(`${sheetName}: no se encontró la tabla de equipos.`);
    const fields = rows[header].map(normalize);
    const quantityColumn = fields.findIndex(v => v.includes('DE EQUIPOS'));
    const equipmentColumn = fields.findIndex(v => v.startsWith('NOMBRE DEL EQUIPO'));
    const commentsColumn = fields.findIndex(v => v.startsWith('COMENTARIOS'));
    if (quantityColumn < 0) throw new Error(`${sheetName}: falta la columna de cantidad.`);
    const codeRow = rows.find(row => row.some(v => normalize(v).startsWith('CODIGO DE LABORATORIO')));
    const code = normalize(codeRow?.find(v => /^F08L01(?:LA|TA)\d+$/.test(normalize(v))));
    if (!code || code !== normalize(sheetName) || codes.has(code)) throw new Error(`${sheetName}: código ausente, duplicado o distinto del nombre de hoja.`);
    codes.add(code);
    const matches = [...(names.get(code)?.values() || [])];
    if (matches.length > 1) throw new Error(`${code}: el consolidado contiene nombres contradictorios: ${matches.map(v => v.name).join(', ')}`);
    const entries = [], notes = [];
    let footer = false;
    for (let r = header + 1; r < rows.length; r++) {
      const row = rows[r];
      const quantity = row[quantityColumn], name = clean(row[equipmentColumn]), comments = clean(row[commentsColumn]);
      const populated = row.map(clean).filter(Boolean);
      if (populated.some(v => /^(Nota:|NOMBRE Y FIRMA|DECLARO BAJO)/i.test(v))) footer = true;
      if (footer) { if (populated.length) notes.push(populated.join('\n')); continue; }
      if (!populated.length) continue;
      if (!name) throw new Error(`${sheetName}, fila ${r + 1}: registro sin nombre de equipo.`);
      if (!(typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 0) && !['', '-'].includes(clean(quantity))) throw new Error(`${sheetName}, fila ${r + 1}: cantidad inesperada.`);
      const extra = row.slice(commentsColumn + 1).map(clean).filter(Boolean);
      if (extra.length) throw new Error(`${sheetName}, fila ${r + 1}: datos fuera de las columnas previstas.`);
      entries.push({ quantity: typeof quantity === 'number' ? quantity : clean(quantity), name, comments, sourceRow: r + 1 });
    }
    if (!entries.length) throw new Error(`${sheetName}: inventario vacío.`);
    const universityRow = rows.find(row => row.some(v => normalize(v) === 'NOMBRE DE LA UNIVERSIDAD'));
    environments.push({ code, name: matches[0]?.name || '', nameConfirmed: Boolean(matches.length), site: matches[0]?.site || 'Tacna', local: matches[0]?.local || 'F08L01 - Tacna', type: code.includes('TA') ? 'Taller' : 'Laboratorio / sala', university: clean(universityRow?.[equipmentColumn]), sheet: sheetName, entries, notes });
  }
  return { version: 1, source: 'C7 260823 F08L01 - Tacna.xlsx', nameSource: 'CONSOLIDADO_GENERAL_AGOSTO26.xlsx', environments };
}

if (require.main === module) {
  try {
    const [c7Path, namesPath] = process.argv.slice(2);
    if (!c7Path || !namesPath) throw new Error('Uso: node tools/importar-c7.cjs "C7.xlsx" "CONSOLIDADO.xlsx"');
    const catalog = extract(read(c7Path), read(namesPath));
    fs.writeFileSync(path.join(__dirname, '../data/c7.json'), JSON.stringify(catalog, null, 2) + '\n');
    console.log(`${catalog.environments.length} ambientes, ${catalog.environments.reduce((sum, env) => sum + env.entries.length, 0)} registros.`);
    console.log('Nombres por confirmar: ' + catalog.environments.filter(env => !env.nameConfirmed).map(env => env.code).join(', '));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { extract };
