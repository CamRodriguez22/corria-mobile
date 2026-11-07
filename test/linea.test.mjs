import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mapaCalor, etiquetaCelda, aniosDisponibles, rangoDePreset, rangoEfectivo, filtrarMediciones, hayFiltros, alternarNivel,
  textoResultados, FILTROS_VACIOS,
} from '../src/linea.js';
import {
  puntosTendencia, techoEjeY, marcasEjeY, escalaTendencia, puntoMasCercano, resumenTendencia, lineasAccesibles,
} from '../src/tendencia.js';
import { estadoFotoCola, resumenAvance, indiceActivo, textoEtapa } from '../src/cola.js';

const dia = (fecha, total, peor, extra = {}) => ({ fecha, total, por_nivel: [0, 0, 0, 0], peor_nivel: peor, max_pct: 10, promedio_pct: 5, ...extra });

test('mapaCalor: semanas de lunes a domingo, huecos al inicio y sin días futuros', () => {
  // 2026-01-01 es jueves -> 3 huecos (lun, mar, mié) en la primera semana.
  const m = mapaCalor([dia('2026-01-01', 2, 1), dia('2026-01-05', 1, 3)], 2026, '2026-01-10');
  assert.equal(m.semanas[0].slice(0, 3).every((c) => c === null), true);
  assert.equal(m.semanas[0][3].fecha, '2026-01-01');
  assert.equal(m.semanas[0][3].nivel, 1);
  assert.equal(m.semanas[1][0].fecha, '2026-01-05'); // lunes
  assert.equal(m.semanas[1][0].nivel, 3);
  assert.ok(m.semanas.every((s) => s.length === 7));
  const ultima = m.semanas[m.semanas.length - 1].filter(Boolean).pop();
  assert.equal(ultima.fecha, '2026-01-10'); // hoy es el último día dibujado
  assert.equal(m.diasConFotos, 2);
  assert.equal(m.totalFotos, 3);
  assert.deepEqual(m.meses, [{ semana: 0, nombre: 'ene' }]);
});

test('mapaCalor: años pasados llegan al 31 dic; un año futuro queda vacío; días sin fotos son neutros', () => {
  const pasado = mapaCalor([], 2026, '2027-03-01');
  const celdas = pasado.semanas.flat().filter(Boolean);
  assert.equal(celdas.length, 365);
  assert.equal(celdas[celdas.length - 1].fecha, '2026-12-31');
  assert.equal(celdas.every((c) => c.nivel === null && !c.conFotos), true);
  assert.equal(pasado.meses.length, 12);
  assert.deepEqual(mapaCalor([], 2027, '2026-11-07').semanas, []);
});

test('mapaCalor: un día con fotos pero sin nivel válido queda con nivel null', () => {
  const m = mapaCalor([dia('2026-02-02', 3, null)], 2026, '2026-02-10');
  const c = m.semanas.flat().find((x) => x && x.fecha === '2026-02-02');
  assert.equal(c.conFotos, true);
  assert.equal(c.nivel, null);
});

test('etiquetaCelda en español natural', () => {
  assert.equal(etiquetaCelda({ fecha: '2026-11-07', total: 4, nivel: 3, conFotos: true }), '7 de noviembre de 2026: 4 fotos, peor nivel Severa');
  assert.equal(etiquetaCelda({ fecha: '2026-11-07', total: 1, nivel: 0, conFotos: true }), '7 de noviembre de 2026: 1 foto, peor nivel Sin corrosión');
  assert.equal(etiquetaCelda({ fecha: '2026-11-06', total: 0, nivel: null, conFotos: false }), '6 de noviembre de 2026: sin fotos');
});

test('aniosDisponibles: desde 2026 hasta el año actual', () => {
  assert.deepEqual(aniosDisponibles('2026-11-07'), [2026]);
  assert.deepEqual(aniosDisponibles('2028-02-01'), [2026, 2027, 2028]);
});

test('rangos de fecha y filtros combinados', () => {
  assert.deepEqual(rangoDePreset('7', '2026-11-07'), { desde: '2026-11-01', hasta: '2026-11-07' });
  assert.deepEqual(rangoDePreset('todo', '2026-11-07'), {});
  assert.deepEqual(rangoEfectivo({ ...FILTROS_VACIOS, dia: '2026-10-03', preset: '7' }, '2026-11-07'), { desde: '2026-10-03', hasta: '2026-10-03' });

  const lista = [
    { id_medicion: 'a', id_punto: 'P1', timestamp: '2026-11-07T15:00:00Z', area_corroida_pct: '30' },
    { id_medicion: 'b', id_punto: 'P2', timestamp: '2026-11-06T15:00:00Z', area_corroida_pct: '12' },
    { id_medicion: 'c', id_punto: 'P1', timestamp: '2026-09-01T15:00:00Z', area_corroida_pct: '0.01' },
  ];
  const ids = (f) => filtrarMediciones(lista, f, { hoy: '2026-11-07' }).map((m) => m.id_medicion);
  assert.deepEqual(ids(FILTROS_VACIOS), ['a', 'b', 'c']);
  assert.deepEqual(ids({ ...FILTROS_VACIOS, niveles: [3] }), ['a']);
  assert.deepEqual(ids({ ...FILTROS_VACIOS, niveles: [0, 2] }), ['b', 'c']);
  assert.deepEqual(ids({ ...FILTROS_VACIOS, idPunto: 'P1' }), ['a', 'c']);
  assert.deepEqual(ids({ ...FILTROS_VACIOS, preset: '7' }), ['a', 'b']);
  assert.deepEqual(ids({ ...FILTROS_VACIOS, dia: '2026-11-06' }), ['b']);
  assert.deepEqual(ids({ ...FILTROS_VACIOS, idPunto: 'P1', preset: '30', niveles: [3] }), ['a']);
  assert.deepEqual(ids({ ...FILTROS_VACIOS, dia: '2025-01-01' }), []);
});

test('hayFiltros, alternarNivel y textos de resultado', () => {
  assert.equal(hayFiltros(FILTROS_VACIOS), false);
  assert.equal(hayFiltros({ ...FILTROS_VACIOS, preset: '30' }), true);
  assert.equal(hayFiltros({ ...FILTROS_VACIOS, niveles: [1] }), true);
  assert.equal(hayFiltros({ ...FILTROS_VACIOS, dia: '2026-11-07' }), true);
  assert.deepEqual(alternarNivel([], 2), [2]);
  assert.deepEqual(alternarNivel([2], 0), [0, 2]);
  assert.deepEqual(alternarNivel([0, 2], 2), [0]);
  assert.equal(textoResultados(1, false), '1 foto');
  assert.equal(textoResultados(12, true), '12 fotos');
  assert.equal(textoResultados(0, true), 'Ninguna foto coincide con los filtros');
  assert.equal(textoResultados(0, false), 'Sin fotos');
});

// ───────── tendencia ─────────
const dias = [
  dia('2026-11-03', 3, 2, { promedio_pct: 12.44, max_pct: 20 }),
  dia('2026-10-30', 1, 1, { promedio_pct: 4 }),
  dia('2026-11-07', 2, 3, { promedio_pct: 30.06, max_pct: 40.5 }),
  dia('2026-11-05', 1, null, { promedio_pct: null }),
];

test('puntosTendencia: ordena, omite días sin promedio y calcula el nivel del promedio', () => {
  const p = puntosTendencia(dias);
  assert.deepEqual(p.map((x) => x.fecha), ['2026-10-30', '2026-11-03', '2026-11-07']);
  assert.deepEqual(p.map((x) => x.nivel), [1, 2, 3]);
  assert.equal(p[1].promedio, 12.4);
  assert.equal(p[0].etiqueta, '30 oct');
  assert.equal(puntosTendencia(dias, 2).length, 2);
  assert.deepEqual(puntosTendencia([]), []);
  assert.equal(puntosTendencia([dia('2026-12-31', 1, 1), dia('2027-01-02', 1, 1)])[0].etiqueta, '31 dic 2026');
});

test('techo y marcas del eje Y: siempre muestra el umbral de 10 %', () => {
  assert.equal(techoEjeY(0), 15);
  assert.equal(techoEjeY(4), 15);
  assert.equal(techoEjeY(18), 25);
  assert.equal(techoEjeY(30), 40);
  assert.equal(techoEjeY(200), 100);
  assert.deepEqual(marcasEjeY(15), [0, 5, 10, 15]);
  assert.deepEqual(marcasEjeY(40), [0, 10, 20, 30, 40]);
});

test('escalaTendencia: X por tiempo real, Y invertida, umbrales solo si caben', () => {
  const p = puntosTendencia(dias);
  const e = escalaTendencia(p, { ancho: 300, alto: 100 });
  assert.equal(e.techo, 40);
  assert.equal(e.puntos[0].x, 0);
  assert.equal(e.puntos[2].x, 300);
  // 30 oct -> 3 nov son 4 de 8 días: mitad exacta
  assert.equal(e.puntos[1].x, 150);
  assert.equal(e.puntos[0].y > e.puntos[2].y, true);
  assert.deepEqual(e.umbrales.map((u) => u.valor), [10, 25]);
  assert.equal(e.umbrales[0].etiqueta, 'Moderada desde 10 %');
  assert.equal(e.umbrales[1].etiqueta, 'Severa desde 25 %');
  const bajo = escalaTendencia(puntosTendencia([dia('2026-11-01', 1, 1, { promedio_pct: 2 }), dia('2026-11-02', 1, 1, { promedio_pct: 3 })]), { ancho: 100, alto: 50 });
  assert.deepEqual(bajo.umbrales.map((u) => u.valor), [10]);
  assert.equal(escalaTendencia([], { ancho: 100, alto: 50 }).puntos.length, 0);
});

test('puntoMasCercano elige el punto más próximo en X', () => {
  const e = escalaTendencia(puntosTendencia(dias), { ancho: 300, alto: 100 });
  assert.equal(puntoMasCercano(e.puntos, 140).fecha, '2026-11-03');
  assert.equal(puntoMasCercano(e.puntos, 1000).fecha, '2026-11-07');
  assert.equal(puntoMasCercano([], 5), null);
});

test('resumenTendencia: exige 2 días y describe el cambio', () => {
  assert.equal(resumenTendencia(puntosTendencia([dia('2026-11-01', 1, 1)])), '');
  const t = resumenTendencia(puntosTendencia(dias));
  assert.match(t, /3 días entre 30 oct y 7 nov/);
  assert.match(t, /Último día: 30,1 %, Severa/);
  assert.match(t, /sube 26,1 puntos porcentuales/);
  assert.equal(lineasAccesibles(puntosTendencia(dias), 2).length, 2);
  assert.match(lineasAccesibles(puntosTendencia(dias))[0], /^7 nov: 30,1 % \(Severa\) · 2 fotos · peor foto 40,5 %$/);
});

// ───────── cola de análisis ─────────
test('estadoFotoCola y avance de la cola', () => {
  assert.deepEqual(estadoFotoCola({ status: 'esperando' }), { clave: 'espera', texto: 'En espera' });
  assert.deepEqual(estadoFotoCola({ status: 'subiendo' }, 'analizando_ia'), { clave: 'activa', texto: 'Analizando la corrosión' });
  assert.equal(estadoFotoCola({ status: 'lista', medicion: { area_corroida_pct: 20.44, nivel_corrosion: 2 } }).texto, 'Moderada · 20,4 %');
  assert.deepEqual(estadoFotoCola({ status: 'error', error: 'Sin conexión' }), { clave: 'error', texto: 'Sin conexión' });
  assert.equal(textoEtapa(''), 'Procesando');
  const cola = [{ status: 'lista' }, { status: 'subiendo' }, { status: 'esperando' }, { status: 'error' }];
  assert.deepEqual(resumenAvance(cola), { total: 4, listas: 1, fallidas: 1, porcentaje: 50, texto: '1 de 4 fotos listas · 1 con error' });
  assert.equal(resumenAvance([{ status: 'lista' }]).texto, '1 de 1 foto lista');
  assert.equal(indiceActivo(cola), 1);
  assert.equal(indiceActivo([{ status: 'lista' }, { status: 'esperando' }]), 1);
  assert.equal(indiceActivo([{ status: 'lista' }]), -1);
});
