(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HorariosTimeline = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const minute = value => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };
  const MORNING_START = minute('07:30');
  const AFTERNOON_START = minute('13:30');
  const AFTERNOON_END = minute('22:30');
  function bounds(events) {
    if (!events.length) return { start: 8 * 60, end: 22 * 60 };
    return {
      start: Math.min(...events.map(event => minute(event.start))),
      end: Math.max(...events.map(event => minute(event.end))),
    };
  }
  function timeScale({ start, end }) {
    const position = time => Math.max(0, Math.min(1, (time - start) / (end - start))) * 100;
    const ticks = [{ time: start, kind: 'start' }];
    const divider = start < AFTERNOON_START && AFTERNOON_START < end;
    for (let time = Math.ceil((start + 30) / 60) * 60; time <= end - 30; time += 60) ticks.push({ time, kind: 'hour' });
    if (AFTERNOON_START - start >= 30 && end - AFTERNOON_START >= 30) ticks.push({ time: AFTERNOON_START, kind: 'shift' });
    ticks.push({ time: end, kind: 'end' });
    ticks.sort((a, b) => a.time - b.time);
    return {
      divider,
      stops: [MORNING_START, AFTERNOON_START, AFTERNOON_END].map(position),
      hourOffset: -(start % 60) / 60,
      ticks: ticks.map(({ time, kind }) => ({ label: `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`, position: position(time), kind })),
    };
  }
  function renderTimeScale(grid, axis, range) {
    const { divider, stops, hourOffset, ticks } = timeScale(range);
    grid.classList.add('shift-grid');
    grid.toggleAttribute('data-shift-divider', divider);
    for (const [index, name] of ['--morning-start', '--afternoon-start', '--afternoon-end'].entries()) grid.style.setProperty(name, `${stops[index]}%`);
    grid.style.setProperty('--timeline-hour-offset', `calc(${hourOffset} * var(--timeline-hour-height))`);
    for (const { label, position, kind } of ticks) {
      const marker = axis.ownerDocument.createElement('span');
      marker.className = `timeline-tick tick-${kind}`;
      marker.textContent = label;
      marker.style.top = `${position}%`;
      axis.append(marker);
    }
  }
  function lanes(events) {
    const sorted = [...events].sort((a, b) => minute(a.start) - minute(b.start) || minute(a.end) - minute(b.end));
    const result = [];
    let cluster = [], laneEnds = [], clusterEnd = -1;
    function finish() {
      for (const entry of cluster) entry.laneCount = laneEnds.length;
      result.push(...cluster); cluster = []; laneEnds = []; clusterEnd = -1;
    }
    for (const event of sorted) {
      const start = minute(event.start), end = minute(event.end);
      if (cluster.length && start >= clusterEnd) finish();
      let lane = laneEnds.findIndex(value => value <= start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = end;
      clusterEnd = Math.max(clusterEnd, end);
      cluster.push({ event, lane, laneCount: 1 });
    }
    if (cluster.length) finish();
    return result;
  }
  return { minute, bounds, lanes, timeScale, renderTimeScale };
});
