import test from 'node:test';
import assert from 'node:assert/strict';
import { historialCargando, historialOk, historialError, hayMasPorCargar } from '../src/historialPunto.js';
import { elegirEstadoPunto } from '../src/puntos.js';

const local = { dia: '2026-11-07', nivel: 1, promedio: 1, fotos: 60, peor: 1, peorPct: 3 };
const resumenFallido = [{ estado: 'error', dias: [], truncado: false }];
// El estado que produce App en cada paso, pasado por la misma expresión que usa FolderScreen.
const parcialCon = (historial) => elegirEstadoPunto({ resumenes: resumenFallido, local, hayMas: hayMasPorCargar(historial) }).parcial;

test('I16: la primera carga en curso cuenta como parcial (hayMas desconocido = true)', () => {
  const h = historialCargando(undefined);
  assert.equal(h.hayMas, true);
  assert.equal(h.estado, 'cargando');
  assert.equal(parcialCon(h), true);
});

test('I16: una primera carga que falla (sin éxito previo) sigue siendo parcial', () => {
  const h = historialError(historialCargando(undefined), 'Sin conexión con el servidor.');
  assert.equal(h.estado, 'error');
  assert.equal(h.hayMas, true);
  assert.equal(parcialCon(h), true);
  assert.equal(parcialCon(undefined), true); // y sin historial todavía
});

test('I16: tras una respuesta exitosa y sin más páginas deja de ser parcial; con más páginas sigue siéndolo', () => {
  assert.equal(parcialCon(historialOk([], false)), false);
  assert.equal(parcialCon(historialOk([], true)), true);
});

test('I16: un error tras un éxito conserva el último hayMas conocido (completo sigue completo)', () => {
  const completo = historialOk([{ id_medicion: 'a' }], false);
  const tras = historialError(historialCargando(completo, true), 'x');
  assert.equal(tras.hayMas, false);
  assert.equal(tras.lista.length, 1);
  assert.equal(parcialCon(tras), false);
  // y uno que tenía más páginas sigue con más
  assert.equal(historialError(historialOk([], true), 'x').hayMas, true);
});

test('I16: "cargar más" conserva la lista y el hayMas previos mientras carga', () => {
  const previo = historialOk([{ id_medicion: 'a' }], true);
  const h = historialCargando(previo, true);
  assert.equal(h.estado, 'mas');
  assert.equal(h.hayMas, true);
  assert.equal(h.lista.length, 1);
});

test('I16: caso del reporte: 150 fotos en el día, solo 60 locales, fallan resumen e historial: se advierte', () => {
  const e = elegirEstadoPunto({ resumenes: resumenFallido, local, hayMas: hayMasPorCargar(historialError(historialCargando(undefined), 'sin red')) });
  assert.equal(e.fuente, 'local');
  assert.equal(e.parcial, true);
});
