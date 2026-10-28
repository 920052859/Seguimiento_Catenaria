(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CatenaryLocation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeTunnel(value) {
    const match = String(value || '').trim().match(/^t[uú]nel\s+(\d+)$/i);
    return match ? `Túnel ${Number(match[1])}` : '';
  }

  function normalizeStation(value) {
    const match = String(value || '').trim().match(/^(?:estaci[oó]n\s*)?(E\d+|PV\d+)$/i);
    return match ? match[1].toUpperCase() : '';
  }

  function getSupportLocationDetail(support) {
    const source = support || {};
    const rawLocation = String(source.ubicacion || '').trim();
    const station = normalizeStation(rawLocation);
    const locationTunnel = normalizeTunnel(rawLocation);
    const associatedTunnel = normalizeTunnel(source.tunel) || locationTunnel;

    if (station) {
      return {
        environment: 'Estación',
        location: `Estación ${station}`,
        tunnel: associatedTunnel || 'No verificado',
      };
    }

    if (locationTunnel || associatedTunnel) {
      return {
        environment: 'Túnel',
        location: locationTunnel || associatedTunnel,
        tunnel: associatedTunnel || locationTunnel,
      };
    }

    return {
      environment: 'No verificado',
      location: 'No verificado',
      tunnel: 'No verificado',
    };
  }

  return { getSupportLocationDetail, normalizeStation, normalizeTunnel };
});
