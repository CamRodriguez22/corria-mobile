import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoDesdeResumen, elegirEstadoPunto } from '../src/puntos.js';
import { estadoPunto } from '../src/galeria.js';

const dia = (fecha, total, promedio_pct, max_pct, peor_nivel) => ({ fecha, total, promedio_pct, max_pct, peor_nivel });
const ok = (dias, truncado = false) => ({ estado: 'ok', dias, truncado });

test('I10: el estado del día sale del resumen del servidor (promedio, peor foto y total del día)', () => {
  const e = estadoDesdeResumen([dia('2026-11-05', 4, 2, 6, 1), dia('2026-11-07', 133, 12.4, 41, 3)]);
  assert.deepEqual(e, { dia: '2026-11-07', nivel: 2, promedio: 12.4, fotos: 133, peor: 3, peorPct: 41 });
  assert.equal(estadoDesdeResumen([]), null);
  assert.equal(estadoDesdeResumen([dia('2026-11-07', 0, null, null, null)]), null);
});

test('I10: más de 60 fotos en un día: manda el servidor aunque las cargadas den otro promedio', () => {
  const cargadas = Array.from({ length: 60 }, (_, i) => ({ id_medicion: `m${i}`, timestamp: '2026-11-07T15:00:00Z', area_corroida_pct: '1' }));
  const local = estadoPunto(cargadas); // promedio 1 con las 60 cargadas
  const r = elegirEstadoPunto({ resumenes: [ok([dia('2026-11-07', 133, 12.4, 41, 3)])], local, hayMas: true });
  assert.equal(r.fuente, 'servidor');
  assert.equal(r.parcial, false);
  assert.equal(r.estado.fotos, 133);
  assert.equal(r.estado.promedio, 12.4);
  assert.notEqual(r.estado.promedio, local.promedio);
});

test('I10: sin resumen completo se usan las cargadas y se marca parcial si faltan fotos por cargar', () => {
  const local = { dia: '2026-11-07', nivel: 1, promedio: 1, fotos: 60, peor: 1, peorPct: 3 };
  for (const resumenes of [[], [{ estado: 'cargando', dias: [] }], [ok([dia('2026-11-07', 9, 5, 9, 2)], true)], [ok([]), { estado: 'error', dias: [] }]]) {
    const r = elegirEstadoPunto({ resumenes, local, hayMas: true });
    assert.equal(r.fuente, 'local');
    assert.equal(r.parcial, true);
    assert.equal(r.estado, local);
  }
});

test('I10: con todas las fotos cargadas el estado local no es parcial; sin fotos no hay estado ni aviso', () => {
  const local = { dia: '2026-11-07', nivel: 1, promedio: 1, fotos: 3, peor: 1, peorPct: 3 };
  assert.equal(elegirEstadoPunto({ local, hayMas: false }).parcial, false);
  assert.deepEqual(elegirEstadoPunto({ local: null, hayMas: true }), { estado: null, parcial: false, fuente: 'local' });
});
