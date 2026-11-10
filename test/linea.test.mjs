import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calendarioMes, mesAnterior, mesSiguiente, mesDe, limitesMes, nombreMes, aplicarFiltrosADias, totalesPorMes, etiquetaCelda, aniosDisponibles, rangoDePreset, rangoEfectivo, filtrarMediciones, hayFiltros, alternarNivel,
  textoResultados, FILTROS_VACIOS,
} from '../src/linea.js';
import {
  puntosTendencia, rotuloPeriodo, techoEjeY, marcasEjeY, escalaTendencia, puntoMasCercano, resumenTendencia, lineasAccesibles,
} from '../src/tendencia.js';
import { estadoFotoCola, resumenAvance, indiceActivo, textoEtapa, quitarDeCola, marcarCanceladas, MENSAJE_CANCELADA } from '../src/cola.js';

const dia = (fecha, total, peor, extra = {}) => ({ fecha, total, por_nivel: [0, 0, 0, 0], peor_nivel: peor, max_pct: 10, promedio_pct: 5, ...extra });

test('calendarioMes: filas de lunes a domingo, huecos fuera del mes, días con fotos y futuros', () => {
  // Noviembre de 2026 empieza en domingo (6 huecos) y tiene 30 días: 6 filas.
  const c = calendarioMes([dia('2026-11-02', 2, 1), dia('2026-11-07', 3, 3)], { anio: 2026, mes: 11 }, '2026-11-09');
  assert.equal(c.nombre, 'noviembre de 2026');
  assert.ok(c.semanas.every((s) => s.length === 7));
  assert.equal(c.semanas.length, 6);
  assert.equal(c.semanas[0].slice(0, 6).every((x) => x === null), true);
  assert.equal(c.semanas[0][6].fecha, '2026-11-01');
  assert.equal(c.semanas[1][0].fecha, '2026-11-02'); // lunes
  assert.equal(c.semanas[1][0].nivel, 1);
  const todas = c.semanas.flat().filter(Boolean);
  assert.equal(todas.length, 30);
  assert.equal(todas.find((x) => x.fecha === '2026-11-07').nivel, 3);
  assert.equal(todas.find((x) => x.fecha === '2026-11-09').esHoy, true);
  assert.equal(todas.find((x) => x.fecha === '2026-11-10').futuro, true);
  assert.equal(todas.find((x) => x.fecha === '2026-11-08').conFotos, false);
  assert.equal(c.diasConFotos, 2);
  assert.equal(c.totalFotos, 5);
});

test('calendarioMes: febrero de 28 días puede caber en 4 filas y un día sin nivel válido queda null', () => {
  const feb = calendarioMes([dia('2027-02-02', 3, null)], { anio: 2027, mes: 2 }, '2027-03-01'); // feb 2027 empieza lunes
  assert.equal(feb.semanas.length, 4);
  assert.equal(feb.semanas.flat().filter(Boolean).length, 28);
  const c = feb.semanas.flat().find((x) => x && x.fecha === '2027-02-02');
  assert.equal(c.conFotos, true);
  assert.equal(c.nivel, null);
});

test('navegación de meses: cruza de año y se detiene en enero de 2026 y en el mes actual', () => {
  assert.deepEqual(mesAnterior({ anio: 2027, mes: 1 }), { anio: 2026, mes: 12 });
  assert.deepEqual(mesSiguiente({ anio: 2026, mes: 12 }), { anio: 2027, mes: 1 });
  assert.deepEqual(mesDe('2026-11-07'), { anio: 2026, mes: 11 });
  assert.deepEqual(limitesMes({ anio: 2026, mes: 11 }, '2026-11-07'), { puedeAnterior: true, puedeSiguiente: false });
  assert.deepEqual(limitesMes({ anio: 2026, mes: 1 }, '2026-11-07'), { puedeAnterior: false, puedeSiguiente: true });
  assert.deepEqual(limitesMes({ anio: 2026, mes: 12 }, '2027-01-05'), { puedeAnterior: true, puedeSiguiente: true });
  assert.equal(nombreMes({ anio: 2026, mes: 3 }), 'marzo de 2026');
});

test('aplicarFiltrosADias: el calendario sigue nivel y rango de fechas', () => {
  const d = [
    dia('2026-11-01', 5, 3, { por_nivel: [1, 2, 1, 1] }),
    dia('2026-11-06', 2, 1, { por_nivel: [0, 2, 0, 0] }),
    dia('2026-10-01', 1, 2, { por_nivel: [0, 0, 1, 0] }),
  ];
  assert.equal(aplicarFiltrosADias(d, FILTROS_VACIOS, '2026-11-07'), d); // sin filtros, los mismos días
  const sev = aplicarFiltrosADias(d, { ...FILTROS_VACIOS, niveles: [3] }, '2026-11-07');
  assert.deepEqual(sev.map((x) => [x.total, x.peor_nivel]), [[1, 3], [0, null], [0, null]]);
  const leveMod = aplicarFiltrosADias(d, { ...FILTROS_VACIOS, niveles: [1, 2] }, '2026-11-07');
  assert.deepEqual(leveMod.map((x) => [x.total, x.peor_nivel]), [[3, 2], [2, 1], [1, 2]]);
  const sieteDias = aplicarFiltrosADias(d, { ...FILTROS_VACIOS, preset: '7' }, '2026-11-07');
  assert.deepEqual(sieteDias.map((x) => x.total), [5, 2, 0]);
  const dia1 = aplicarFiltrosADias(d, { ...FILTROS_VACIOS, dia: '2026-11-06' }, '2026-11-07');
  assert.equal(dia1, d); // el día elegido se resalta, no atenúa
});

test('totalesPorMes: totales reales por mes (estables al paginar) y nada si el resumen es parcial', () => {
  const d = [dia('2026-11-01', 5, 3), dia('2026-11-06', 2, 1), dia('2026-10-01', 1, 2), dia('2026-10-02', 0, null)];
  assert.deepEqual(totalesPorMes(d), { '2026-11': 7, '2026-10': 1 });
  assert.equal(totalesPorMes(d, { truncado: true }), null);
  assert.deepEqual(totalesPorMes([]), {});
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

test('techo y marcas del eje Y: mínimo 15 %', () => {
  assert.equal(techoEjeY(0), 15);
  assert.equal(techoEjeY(4), 15);
  assert.equal(techoEjeY(18), 25);
  assert.equal(techoEjeY(30), 40);
  assert.equal(techoEjeY(200), 100);
  assert.deepEqual(marcasEjeY(15), [0, 5, 10, 15]);
  assert.deepEqual(marcasEjeY(40), [0, 10, 20, 30, 40]);
});

test('escalaTendencia: X por tiempo real, Y invertida, sin líneas de umbral', () => {
  const p = puntosTendencia(dias);
  const e = escalaTendencia(p, { ancho: 300, alto: 100 });
  assert.equal(e.techo, 50);
  assert.equal(e.puntos[0].x, 0);
  assert.equal(e.puntos[2].x, 300);
  // 30 oct -> 3 nov son 4 de 8 días: mitad exacta
  assert.equal(e.puntos[1].x, 150);
  assert.equal(e.puntos[0].y > e.puntos[2].y, true);
  assert.equal('umbrales' in e, false); // decisión del dueño: sin líneas de 10 % / 25 %
  assert.equal(escalaTendencia([], { ancho: 100, alto: 50 }).puntos.length, 0);
});

test('puntosTendencia: conserva mínimo, máximo y fotos por nivel del día', () => {
  const [p] = puntosTendencia([dia('2026-11-03', 3, 2, { promedio_pct: 12, min_pct: 4.5, max_pct: 20, por_nivel: [0, 1, 2, 0] })]);
  assert.equal(p.minPct, 4.5);
  assert.equal(p.maxPct, 20);
  assert.deepEqual(p.porNivel, [0, 1, 2, 0]);
  const [q] = puntosTendencia([dia('2026-11-03', 1, 1, { promedio_pct: 3, por_nivel: undefined })]);
  assert.equal(q.minPct, null);
  assert.equal(q.porNivel, null);
});

test('escalaTendencia: banda mín-máx y barras apiladas por nivel', () => {
  const p = puntosTendencia([
    dia('2026-11-01', 4, 2, { promedio_pct: 10, min_pct: 5, max_pct: 20, por_nivel: [0, 1, 3, 0] }),
    dia('2026-11-02', 2, 1, { promedio_pct: 5, min_pct: 5, max_pct: 5, por_nivel: [0, 2, 0, 0] }),
  ]);
  const e = escalaTendencia(p, { ancho: 100, alto: 100, altoBarras: 40 });
  const [a, b] = e.puntos;
  assert.equal(a.yMax < a.y && a.y < a.yMin, true); // más corrosión = más arriba (y menor)
  assert.equal(b.yMin, b.yMax);
  assert.equal(e.maxFotos, 4);
  // el día con 4 fotos llena el panel: 1 + 3 fotos, apiladas de abajo hacia arriba
  assert.deepEqual(a.segmentos.map((s) => [s.nivel, s.n]), [[1, 1], [2, 3]]);
  assert.equal(Math.round(a.segmentos.reduce((t, s) => t + s.h, 0)), 40);
  assert.equal(Math.round(b.segmentos[0].h), 20);
  assert.equal(e.anchoBarra, 14); // con 2 días el paso (100) permite el máximo
});

test('rotuloPeriodo: días con fotos frente al período que cubre el eje', () => {
  assert.equal(rotuloPeriodo([]), '');
  assert.equal(rotuloPeriodo(puntosTendencia([dia('2026-11-01', 1, 1)])), '1 día con fotos');
  const largo = puntosTendencia([dia('2026-08-07', 1, 1), dia('2026-09-20', 1, 1), dia('2026-11-07', 1, 1)]);
  assert.equal(rotuloPeriodo(largo), '3 días con fotos en 93 días (7 ago a 7 nov)');
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


test('quitarDeCola: quita solo la foto indicada y no muta', () => {
  const cola = [{ uri: 'a' }, { uri: 'b' }, { uri: 'c' }];
  assert.deepEqual(quitarDeCola(cola, 1).map((f) => f.uri), ['a', 'c']);
  assert.equal(cola.length, 3);
  assert.equal(quitarDeCola(cola, 7), cola);
  assert.equal(quitarDeCola(cola, -1), cola);
  assert.deepEqual(quitarDeCola([{ uri: 'a' }], 0), []);
});

test('marcarCanceladas: lo que no se envió queda fallido y reintentable; lo ya hecho no se toca', () => {
  const cola = [{ status: 'lista', medicion: { id_medicion: 'm' } }, { status: 'subiendo' }, { status: 'esperando' }, { status: 'error', error: 'x', definitivo: true }];
  const r = marcarCanceladas(cola);
  assert.equal(r[0].status, 'lista');
  assert.equal(r[1].status, 'subiendo'); // la foto en curso termina por su cuenta
  assert.deepEqual([r[2].status, r[2].error, r[2].definitivo], ['error', MENSAJE_CANCELADA, false]);
  assert.equal(r[3].definitivo, true);
  assert.equal(resumenAvance(marcarCanceladas([{ status: 'lista' }, { status: 'esperando' }])).fallidas, 1);
});
