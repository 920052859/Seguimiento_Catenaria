(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CatenariaSchedule = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const ACTIVITY_WEIGHTS = Object.freeze({
    perforacion: 0.10,
    fijacion: 0.20,
    soporte: 0.20,
    mensula: 0.10,
    aislador: 0.10,
    perfil: 0.20,
    hilo: 0.10,
  });

  function stageOf(support) {
    return String(support.Etapa || support.etapa || '').trim();
  }

  function filterSupports(supports, filters = {}) {
    const search = String(filters.search || '').trim().toLowerCase();
    return (supports || []).filter(support => {
      if (filters.via && String(support.via) !== String(filters.via)) return false;
      if (filters.tramo && String(support.tramo) !== String(filters.tramo)) return false;
      if (filters.etapa && stageOf(support) !== String(filters.etapa)) return false;
      if (filters.estado === 'sin_iniciar' && Number(support.pct || 0) > 0) return false;
      if (filters.estado === 'en_progreso' && (Number(support.pct || 0) <= 0 || Number(support.pct || 0) >= 100)) return false;
      if (filters.estado === 'completo' && Number(support.pct || 0) < 100) return false;
      if (filters.estado === 'adicional' && support.situacion !== 'Adicional') return false;
      if (filters.estado === 'interferencia' && support.situacion !== 'Interferencia') return false;
      if (search) {
        const haystack = [support.id, support.tramo, stageOf(support), support.ubicacion, support.tunel]
          .map(value => String(value || '').toLowerCase()).join(' ');
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }

  function buildStationBounds(supports) {
    const groups = new Map();
    (supports || []).forEach(support => {
      const label = String(support.ubicacion || '').trim().toUpperCase();
      const km = Number(support.km);
      if (!/^E\d+$/.test(label) || !Number.isFinite(km) || km <= 0) return;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(km);
    });
    return [...groups.entries()]
      .map(([label, kms]) => ({label, kmMin:Math.min(...kms), kmMax:Math.max(...kms), count:kms.length}))
      .sort((a,b) => a.kmMin - b.kmMin || a.label.localeCompare(b.label));
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getTime());
    const text = String(value).slice(0,10);
    const date = new Date(text + 'T12:00:00Z');
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function tunnelKey(value) {
    const match = String(value || '').trim().match(/^T[uú]nel\s+(\d+)$/i);
    return match ? `Tunel ${Number(match[1])}` : String(value || '').trim();
  }

  function scheduleForSupport(support, schedule) {
    const stage = stageOf(support);
    const location = String(support.ubicacion || '').trim();
    const tunnel = tunnelKey(location || support.tunel);
    if (location && !/^T[uú]nel\s+\d+$/i.test(location)) return null;
    return schedule && schedule.stages && schedule.stages[stage] &&
      schedule.stages[stage].tunnels && schedule.stages[stage].tunnels[tunnel]
      ? schedule.stages[stage].tunnels[tunnel] : null;
  }

  function progressBetween(date, start, end) {
    const at = date instanceof Date ? date : parseDate(date);
    const from = parseDate(start);
    const to = parseDate(end);
    if (!at || !from || !to || to < from) return null;
    if (at <= from) return 0;
    if (at >= to) return 1;
    return (at - from) / (to - from);
  }

  function plannedStatsForSupports(supports, date, schedule) {
    let earned = 0;
    let denominator = 0;
    let scheduledSupports = 0;
    (supports || []).forEach(support => {
      const supportSchedule = scheduleForSupport(support, schedule);
      if (!supportSchedule) return;
      let supportDenominator = 0;
      let supportEarned = 0;
      Object.entries(ACTIVITY_WEIGHTS).forEach(([activity, weight]) => {
        const window = supportSchedule[activity];
        if (!window) return;
        const progress = progressBetween(date, window.start, window.end);
        if (progress === null) return;
        supportDenominator += weight;
        supportEarned += weight * progress;
      });
      if (supportDenominator > 0) {
        scheduledSupports += 1;
        denominator += supportDenominator;
        earned += supportEarned;
      }
    });
    return {
      planned: denominator > 0 ? earned / denominator * 100 : 0,
      scheduledSupports,
      totalSupports:(supports || []).length,
      coverage:(supports || []).length ? scheduledSupports / supports.length * 100 : 0,
    };
  }

  function plannedPctForSupports(supports, date, schedule) {
    return plannedStatsForSupports(supports, date, schedule).planned;
  }

  function scheduleExtent(supports, schedule) {
    const dates = [];
    (supports || []).forEach(support => {
      const supportSchedule = scheduleForSupport(support, schedule);
      if (!supportSchedule) return;
      Object.values(supportSchedule).forEach(window => {
        const start = parseDate(window.start);
        const end = parseDate(window.end);
        if (start && end && end >= start) dates.push(start, end);
      });
    });
    if (!dates.length) return null;
    return {start:new Date(Math.min(...dates)), end:new Date(Math.max(...dates))};
  }

  function buildPlannedCurve(supports, schedule, intervalDays = 7) {
    const extent = scheduleExtent(supports, schedule);
    if (!extent) return [];
    const step = Math.max(1, Number(intervalDays) || 7) * 86400000;
    const points = [];
    for (let time = extent.start.getTime(); time < extent.end.getTime(); time += step) {
      const date = new Date(time);
      points.push({date, planned:plannedPctForSupports(supports, date, schedule)});
    }
    points.push({date:new Date(extent.end), planned:plannedPctForSupports(supports, extent.end, schedule)});
    return points;
  }

  return {
    ACTIVITY_WEIGHTS,
    stageOf,
    filterSupports,
    buildStationBounds,
    parseDate,
    tunnelKey,
    scheduleForSupport,
    progressBetween,
    plannedStatsForSupports,
    plannedPctForSupports,
    scheduleExtent,
    buildPlannedCurve,
  };
});
