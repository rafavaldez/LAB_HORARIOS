(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HorariosMessage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function peruTime(now = new Date()) {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(now);
  }
  function buildMessage(event, week, now = new Date(), environment = event.environment) {
    const teacher = event.teacher?.trim() || 'no consignado';
    const weekMatch = /^W?0*(\d+)$/i.exec(String(week).trim());
    const weekNumber = weekMatch ? Number(weekMatch[1]) : week;
    return `Siendo las ${peruTime(now)} horas se da inicio al curso ${event.course} - Semana ${weekNumber}, en el laboratorio ${environment}, a cargo del docente ${teacher}.`;
  }
  return { peruTime, buildMessage };
});
