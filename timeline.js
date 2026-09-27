(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HorariosTimeline = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const minute = value => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };
  function bounds(events) {
    if (!events.length) return { start: 8 * 60, end: 22 * 60 };
    return {
      start: Math.floor(Math.min(...events.map(event => minute(event.start))) / 60) * 60,
      end: Math.ceil(Math.max(...events.map(event => minute(event.end))) / 60) * 60,
    };
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
  return { minute, bounds, lanes };
});
