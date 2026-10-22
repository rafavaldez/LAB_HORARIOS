/* Catálogo de guías: lectura y búsqueda local, sin servicios externos. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HorariosGuides = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const HEADERS = ['Código catálogo', 'CURSO', 'Modalidad de enseñanza (Presencial/Semipresencial)', 'Semana', 'N° de guía', 'Tipo de guía', 'Enlace'];
  const normalize = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

  function csvRows(text) {
    const rows = []; let row = [], value = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') { value += '"'; i++; }
        else if (quoted || !value) quoted = !quoted;
        else throw new Error('Hay comillas inesperadas en el catálogo.');
      } else if (char === ',' && !quoted) { row.push(value); value = ''; }
      else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && text[i + 1] === '\n') i++;
        row.push(value); if (row.some(cell => cell.trim())) rows.push(row);
        row = []; value = '';
      } else value += char;
    }
    if (quoted) throw new Error('El catálogo tiene una celda sin cerrar.');
    row.push(value); if (row.some(cell => cell.trim())) rows.push(row);
    return rows;
  }

  function weeksIn(value) {
    const weeks = new Set();
    const remainder = value.replace(/\b(\d+)\s*(?:a|al|[-–])\s*(\d+)\b/gi, (_, first, last) => {
      const start = Number(first), end = Number(last);
      if (start >= 1 && end >= start && end <= 53) for (let n = start; n <= end; n++) weeks.add(n);
      return '';
    });
    for (const match of remainder.matchAll(/\d+/g)) if (+match[0] >= 1 && +match[0] <= 53) weeks.add(+match[0]);
    return [...weeks].sort((a, b) => a - b);
  }

  function documentLinks(value) {
    let url;
    try { url = new URL(value); } catch { return null; }
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (url.hostname === 'drive.google.com') {
      const id = url.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1];
      if (id) {
        const preview = new URL(`https://drive.google.com/file/d/${id}/preview`);
        const download = new URL('https://drive.google.com/uc');
        download.searchParams.set('export', 'download'); download.searchParams.set('id', id);
        const key = url.searchParams.get('resourcekey');
        if (key) { preview.searchParams.set('resourcekey', key); download.searchParams.set('resourcekey', key); }
        return { original: url.href, preview: preview.href, download: download.href, provider: 'Google Drive', directDownload: true };
      }
    }
    // Un PDF externo puede abrirse en el visor del navegador; download no lo fuerza entre dominios.
    return { original: url.href, preview: url.href, download: url.href, provider: url.hostname === 'silbia2.utp.edu.pe' ? 'Repositorio UTP' : url.hostname, directDownload: false };
  }

  function documentTitle(links, code) {
    if (!links || links.provider === 'Google Drive') return '';
    let name;
    try { name = decodeURIComponent(new URL(links.original).pathname.split('/').at(-1)); } catch { return ''; }
    name = name.replace(/\.(pdf|pptx?|docx?|xlsx?)$/i, '').replace(/_/g, ' ').trim();
    if (name.startsWith(code)) name = name.slice(code.length).replace(/^\s*[-–]\s*/, '');
    return name.replace(/^GUIA\s*N[°º]?\s*\d+\s*[-–]\s*/i, '').replace(/^[A-Z]{3,}\d{2,}\s*[-–]\s*/, '').trim();
  }

  function parseCatalog(text) {
    const rows = csvRows(text);
    const headers = rows.shift()?.map(value => value.trim()) || [];
    const positions = HEADERS.map(header => headers.indexOf(header));
    if (positions.some(index => index < 0)) throw new Error('El archivo de guías no contiene las columnas esperadas.');
    return rows.map((row, index) => {
      if (row.length !== headers.length) throw new Error(`La fila ${index + 2} del catálogo está incompleta.`);
      const [code, course, modality, week, number, type, sourceLink] = positions.map(position => row[position].trim());
      if (!code || !course || !type) throw new Error(`La fila ${index + 2} no identifica el curso y el tipo de guía.`);
      const links = documentLinks(sourceLink), title = documentTitle(links, code);
      return { id: index, code, course, modality, week, number, type, sourceLink, links, title, weeks: weeksIn(week), search: normalize([code, course, number, type, title, week, modality].join(' ')) };
    });
  }

  function filterCatalog(catalog, { query = '', modality = '', type = '', week = '' } = {}) {
    const words = normalize(query).split(' ').filter(Boolean);
    return catalog.filter(guide => (!modality || guide.modality === modality) && (!type || guide.type === type) &&
      (!week || (week === 'none' ? !guide.weeks.length : guide.weeks.includes(Number(week)))) && words.every(word => guide.search.includes(word)));
  }

  function sortCatalog(guides, order = 'course') {
    return [...guides].sort((a, b) => (order === 'week' ? (a.weeks[0] ?? 99) - (b.weeks[0] ?? 99) : 0) ||
      collator.compare(a.course, b.course) || collator.compare(a.code, b.code) ||
      (a.weeks[0] ?? 99) - (b.weeks[0] ?? 99) || collator.compare(a.number, b.number) || a.id - b.id);
  }
  return { csvRows, weeksIn, documentLinks, parseCatalog, filterCatalog, sortCatalog };
});
