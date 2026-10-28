const assert = require('assert');
const {
  filterSupports,
  buildStationBounds,
  plannedPctForSupports,
  buildPlannedCurve,
  scheduleForSupport,
} = require('./kpi_schedule_utils.js');

const supports = [
  {id:'a', via:1, tramo:'E12-E13', Etapa:'Tramo 3', ubicacion:'E13', tunel:'Tunel 7', km:11890, pct:50},
  {id:'b', via:2, tramo:'E12-E13', Etapa:'Tramo 3', ubicacion:'E13', tunel:'Tunel 7', km:12000, pct:70},
  {id:'c', via:1, tramo:'E16-E17', Etapa:'Tramo 4', ubicacion:'Tunel 11', tunel:'Tunel 11', km:15050, pct:10},
];

assert.deepStrictEqual(
  filterSupports(supports, {etapa:'Tramo 3'}).map(s => s.id),
  ['a','b'],
  'El filtro Etapa debe aceptar la columna nueva y excluir otras etapas'
);

assert.deepStrictEqual(
  buildStationBounds(supports),
  [{label:'E13', kmMin:11890, kmMax:12000, count:2}],
  'La estación debe agrupar ambas vías dentro de un único rectángulo'
);

const schedule = {
  stages: {
    'Tramo 3': {
      tunnels: {
        'Tunel 7': {
          perforacion:{start:'2026-10-01',end:'2026-10-11'},
          fijacion:{start:'2026-10-01',end:'2026-10-11'},
          soporte:{start:'2026-10-11',end:'2026-10-21'},
          mensula:{start:'2026-10-11',end:'2026-10-21'},
          aislador:{start:'2026-10-21',end:'2026-10-31'},
          perfil:{start:'2026-10-21',end:'2026-10-31'},
          hilo:{start:'2026-10-21',end:'2026-10-31'},
        }
      }
    }
  }
};

const tunnelSupports = [
  {id:'t1', via:1, tramo:'E12-E13', Etapa:'Tramo 3', ubicacion:'Tunel 7', tunel:'legacy-value', km:12100, pct:50},
  {id:'t2', via:2, tramo:'E12-E13', Etapa:'Tramo 3', ubicacion:'Tunel 7', tunel:'legacy-value', km:12110, pct:70},
];
assert.strictEqual(scheduleForSupport(supports[0], schedule), null,
  'Una estación no debe heredar la línea base del túnel asociado');
assert(scheduleForSupport(tunnelSupports[0], schedule),
  'La columna ubicacion debe prevalecer sobre el campo tunel histórico');

const halfPlan = plannedPctForSupports(tunnelSupports, new Date('2026-10-06T12:00:00Z'), schedule);
assert(Math.abs(halfPlan - 15) < 0.01, `Plan esperado 15%, obtenido ${halfPlan}`);

const curve = buildPlannedCurve(tunnelSupports, schedule, 7);
assert(curve.length >= 2, 'La curva debe producir puntos temporales');
assert.strictEqual(curve[0].planned, 0, 'La curva debe iniciar en 0%');
assert.strictEqual(curve[curve.length-1].planned, 100, 'La curva debe terminar en 100%');

console.log('schedule utils tests: OK');
