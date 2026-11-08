import test from 'node:test';
import assert from 'node:assert/strict';

import { diaLocal, fechaLarga, fechaCorta, horaLocal, sumarDias, diaSemana, rotuloDia, formatoPct, pctCorto, fechaHoraLarga, fechaHoraCorta } from '../src/fechas.js';
import {
  construirMosaico, agruparPorDia, dividirEnFilas, filasDeGaleria, etiquetaFoto, etiquetaLote, tituloPunto, estadoPunto, claveLote, agruparLotes, indicadoresLocales, tituloMes, agruparPorMes,
} from '../src/galeria.js';
import { nombreNivel, nivelDeMedicion, NOMBRES_NIVEL } from '../src/niveles.js';
import {
  urlVigente, miniaturaDe, marcarCarga, limpiarVencidas, necesitaRefresco, envolverCache, leerCache, VIDA_URL_MS,
} from '../src/miniaturas.js';
import { nombreRol } from '../src/logic.js';

const med = (id, ts, pct, extra = {}) => ({ id_medicion: id, timestamp: ts, area_corroida_pct: String(pct), ...extra });

test('diaLocal usa UTC-5: 03:00 UTC del día 8 sigue siendo día 7 en Colombia', () => {
  assert.equal(diaLocal('2026-11-08T03:00:00.000000+00:00'), '2026-11-07');
  assert.equal(diaLocal('2026-11-08T05:00:00Z'), '2026-11-08');
  assert.equal(diaLocal('no es fecha'), null);
  assert.equal(diaLocal(undefined), null);
});

test('formatos de fecha en minúscula salvo la inicial', () => {
  assert.equal(fechaLarga('2026-11-07'), '7 de noviembre de 2026');
  assert.equal(fechaLarga('2026-01-01'), '1 de enero de 2026');
  assert.equal(fechaLarga('basura'), '');
  assert.equal(fechaCorta('2026-11-07'), '7 nov');
  assert.equal(fechaCorta('2026-11-07', { conAnio: true }), '7 nov 2026');
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(sumarDias('2026-03-01', -1), '2026-02-28');
  assert.equal(diaSemana('2026-11-07'), 5); // sábado, lunes = 0
  assert.equal(diaSemana('2026-11-09'), 0);
});

test('horaLocal: 12 horas en UTC-5 con espacios duros (no se parte en dos líneas)', () => {
  assert.equal(horaLocal('2026-11-07T17:44:00Z'), '12:44 p. m.');
  assert.equal(horaLocal('2026-11-07T05:05:00Z'), '12:05 a. m.');
  assert.equal(horaLocal('2026-11-07T04:30:00Z'), '11:30 p. m.');
  assert.ok(!horaLocal('2026-11-07T17:44:00Z').includes(' '));
  assert.equal(fechaHoraLarga('2026-11-07T17:44:00Z'), '7 de noviembre de 2026, 12:44 p. m.');
});

test('rotuloDia: hoy, ayer y fecha larga', () => {
  assert.equal(rotuloDia('2026-11-07', '2026-11-07'), 'Hoy · 7 de noviembre de 2026');
  assert.equal(rotuloDia('2026-11-06', '2026-11-07'), 'Ayer · 6 de noviembre de 2026');
  assert.equal(rotuloDia('2026-10-01', '2026-11-07'), '1 de octubre de 2026');
});

test('formatoPct usa coma decimal y espacio duro; pctCorto no inventa decimales', () => {
  assert.equal(formatoPct('20.44'), '20,4 %');
  assert.equal(formatoPct(null), '—');
  assert.equal(pctCorto(20.44), '20 %');
  assert.equal(pctCorto(0.4), '0,4 %');
  assert.equal(pctCorto(0), '0 %');
});

test('niveles: un solo nombre por nivel y nunca "Ninguna"', () => {
  assert.deepEqual(NOMBRES_NIVEL, ['Sin corrosión', 'Leve', 'Moderada', 'Severa']);
  assert.equal(nombreNivel(0), 'Sin corrosión');
  assert.equal(nombreNivel('3'), 'Severa');
  assert.equal(nombreNivel(9), 'Severa');
  assert.equal(nivelDeMedicion({ area_corroida_pct: '12' }), 2);
  assert.equal(nivelDeMedicion({ nivel_corrosion: 1, area_corroida_pct: '40' }), 1);
});

test('agruparPorDia separa por día local de Colombia, más reciente primero', () => {
  const g = agruparPorDia([
    med('a', '2026-11-08T03:30:00Z', 5), // 7 nov 22:30 local
    med('b', '2026-11-08T06:00:00Z', 5), // 8 nov 01:00 local
    med('c', '2026-11-07T15:00:00Z', 5),
  ]);
  assert.deepEqual(g.map((x) => x.dia), ['2026-11-08', '2026-11-07']);
  assert.deepEqual(g[1].items.map((m) => m.id_medicion), ['a', 'c']);
});

test('construirMosaico: lote de 2+ fotos es una ficha con portada = la peor; 1 foto de lote es suelta', () => {
  const items = [
    med('1', '2026-11-07T15:00:00Z', 3, { lote_id: 'L1', lote_nombre: 'Inspección A' }),
    med('2', '2026-11-07T15:01:00Z', 30, { lote_id: 'L1', lote_nombre: 'Inspección A' }),
    med('3', '2026-11-07T14:00:00Z', 12, { lote_id: 'L2', lote_nombre: 'Solo una' }),
    med('4', '2026-11-07T13:00:00Z', 0.01),
  ];
  const f = construirMosaico(items);
  assert.deepEqual(f.map((x) => x.tipo), ['lote', 'foto', 'foto']);
  assert.equal(f[0].total, 2);
  assert.equal(f[0].peorNivel, 3);
  assert.equal(f[0].portada.id_medicion, '2');
  assert.equal(f[1].medicion.id_medicion, '3');
  assert.equal(construirMosaico(items, { agrupar: false }).every((x) => x.tipo === 'foto'), true);
  assert.equal(claveLote(items[0]), 'L1');
  assert.equal(claveLote(items[3]), null);
});

test('filasDeGaleria: encabezado por día y filas de 3 fichas (la última puede quedar corta)', () => {
  const lista = [];
  for (let i = 0; i < 7; i++) lista.push(med(`h${i}`, `2026-11-07T1${i}:00:00Z`, i));
  lista.push(med('ayer', '2026-11-06T15:00:00Z', 1));
  const filas = filasDeGaleria(lista, { hoy: '2026-11-07', por: 'dia' });
  assert.deepEqual(filas.map((f) => f.tipo), ['dia', 'fila', 'fila', 'fila', 'dia', 'fila']);
  assert.equal(filas[0].titulo, 'Hoy · 7 de noviembre de 2026');
  assert.deepEqual(filas.filter((f) => f.tipo === 'fila').map((f) => f.fichas.length), [3, 3, 1, 1]);
  assert.equal(new Set(filas.map((f) => f.clave)).size, filas.length);
  assert.deepEqual(dividirEnFilas([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(dividirEnFilas([], 3), []);
  // sin días: solo filas
  assert.ok(filasDeGaleria(lista, { porDia: false }).every((f) => f.tipo === 'fila'));
  assert.ok(filasDeGaleria(lista, { por: 'ninguno' }).every((f) => f.tipo === 'fila'));
});

test('etiquetas accesibles', () => {
  const m = med('x', '2026-11-07T15:00:00Z', 20.4, { nivel_corrosion: 2 });
  assert.equal(etiquetaFoto(m, { punto: 'Punto A' }), 'Moderada, 20,4 %, 7 de noviembre de 2026, Punto A');
  assert.equal(etiquetaFoto({ ...m, nombre: 'Viga 4B' }), 'Viga 4B, Moderada, 20,4 %, 7 de noviembre de 2026');
  assert.equal(
    etiquetaLote({ nombre: 'Semana 1', total: 5, peorNivel: 3 }, { punto: 'Punto A' }),
    'Lote Semana 1, 5 fotos, peor nivel Severa, Punto A'
  );
});

test('tituloPunto cambia "Bloque" por "Punto" sin duplicar', () => {
  assert.equal(tituloPunto('Bloque A · Cubierta'), 'Punto A · Cubierta');
  assert.equal(tituloPunto('Punto 3'), 'Punto 3');
  assert.equal(tituloPunto('Cubierta norte'), 'Cubierta norte');
  assert.equal(tituloPunto(''), 'Punto sin nombre');
});

test('estadoPunto: promedio del día más reciente', () => {
  assert.equal(estadoPunto([]), null);
  const e = estadoPunto([
    med('a', '2026-11-07T15:00:00Z', 4),
    med('b', '2026-11-07T16:00:00Z', 30),
    med('c', '2026-10-01T16:00:00Z', 90),
  ]);
  assert.equal(e.dia, '2026-11-07');
  assert.equal(e.promedio, 17);
  assert.equal(e.nivel, 2);
  assert.equal(e.fotos, 2);
  // la insignia muestra el promedio (Moderada) y la peor foto del día es otra cosa (Severa, 30 %)
  assert.equal(e.peor, 3);
  assert.equal(e.peorPct, 30);
});

test('vigencia de miniaturas: la URL firmada dura 1 h', () => {
  const ahora = 1_000_000_000_000;
  const m = marcarCarga([{ id_medicion: 'a', url_thumbnail: 'https://s3/t.jpg', url_imagen: 'https://s3/i.jpg' }], ahora)[0];
  assert.equal(urlVigente(m, ahora + 10 * 60000), true);
  assert.equal(miniaturaDe(m, ahora + 10 * 60000), 'https://s3/t.jpg');
  assert.equal(urlVigente(m, ahora + VIDA_URL_MS - 60000), false); // dentro del margen de 5 min
  assert.equal(miniaturaDe(m, ahora + VIDA_URL_MS + 1), null);
  // sin sello (caché antigua) = vencida; foto local nunca vence
  assert.equal(urlVigente({ url_thumbnail: 'x' }, ahora), false);
  assert.equal(miniaturaDe({ _localUri: 'file://f.jpg' }, ahora + 99 * VIDA_URL_MS), 'file://f.jpg');
  // sin thumbnail se usa la imagen
  assert.equal(miniaturaDe({ _urlTs: ahora, url_imagen: 'https://s3/i.jpg' }, ahora), 'https://s3/i.jpg');
});

test('limpiarVencidas quita las URL vencidas y deja el resto de la medición', () => {
  const ahora = 5_000_000_000_000;
  const lista = [
    { id_medicion: 'viejo', area_corroida_pct: '3', url_thumbnail: 'u', url_imagen: 'v', _urlTs: ahora - 2 * VIDA_URL_MS },
    { id_medicion: 'nuevo', url_thumbnail: 'u2', _urlTs: ahora - 1000 },
  ];
  const r = limpiarVencidas(lista, ahora);
  assert.equal(r[0].url_thumbnail, undefined);
  assert.equal(r[0].url_imagen, undefined);
  assert.equal(r[0].area_corroida_pct, '3');
  assert.equal(r[1].url_thumbnail, 'u2');
});

test('necesitaRefresco: recargar al volver si la lista tiene más de 45 min', () => {
  const ahora = 9_000_000_000_000;
  assert.equal(necesitaRefresco([{ url_thumbnail: 'a', _urlTs: ahora - 10 * 60000 }], ahora), false);
  assert.equal(necesitaRefresco([{ url_thumbnail: 'a', _urlTs: ahora - 50 * 60000 }], ahora), true);
  assert.equal(necesitaRefresco([{ _localUri: 'f', url_thumbnail: 'a' }], ahora), false);
  assert.equal(necesitaRefresco([], ahora), false);
});

test('caché por usuario: no se mezcla entre cuentas', () => {
  const env = envolverCache('sub-1', { nombre: 'Laura' }, 123);
  assert.deepEqual(leerCache(env, 'sub-1'), { nombre: 'Laura' });
  assert.deepEqual(leerCache(env), { nombre: 'Laura' });
  assert.equal(leerCache(env, 'sub-2'), null);
  assert.equal(leerCache(null), null);
  assert.equal(leerCache({ nada: 1 }), null);
});

test('nombreRol nunca muestra el identificador crudo', () => {
  assert.equal(nombreRol('tecnico'), 'Técnico');
  assert.equal(nombreRol('super_admin'), 'Superadministrador');
  assert.equal(nombreRol('otro_rol'), 'Otro rol');
  assert.equal(nombreRol(undefined), '');
});

test('agruparLotes: las fotos sin lote no son un lote y el resumen sale del lote', () => {
  const { lotes, sueltas } = agruparLotes([
    med('1', '2026-11-05T15:00:00Z', 4, { lote_id: 'L1', lote_nombre: 'Semana 1' }),
    med('2', '2026-11-05T15:05:00Z', 30, { lote_id: 'L1', lote_nombre: 'Semana 1' }),
    med('3', '2026-11-07T15:00:00Z', 12, { lote_id: 'L2' }),
    med('4', '2026-11-07T16:00:00Z', 1),
    med('5', '2026-11-07T17:00:00Z', 2),
  ]);
  assert.equal(sueltas, 2);
  assert.deepEqual(lotes.map((l) => l.id), ['L2', 'L1']);
  assert.equal(lotes[0].nombre, 'Lote L2'); // sin nombre: nunca "Sin lote"
  const l1 = lotes[1];
  assert.equal(l1.items.length, 2);
  assert.equal(l1.maxPct, 30);
  assert.equal(l1.avgPct, 17);
  assert.equal(l1.peorNivel, 3);
  assert.equal(l1.portada.id_medicion, '2');
  assert.equal(l1.items[0].id_medicion, '2'); // más reciente primero
});

test('fechaHoraCorta omite el año si es el actual', () => {
  assert.equal(fechaHoraCorta('2026-11-01T19:54:00Z', '2026-11-07'), '1 de noviembre, 2:54\u00A0p.\u00A0m.');
  assert.equal(fechaHoraCorta('2025-12-31T19:54:00Z', '2026-11-07'), '31 de diciembre de 2025, 2:54\u00A0p.\u00A0m.');
  assert.equal(fechaHoraCorta('x', '2026-11-07'), '');
});

test('indicadoresLocales: fotos de los últimos 30 días y puntos por nivel (no cuenta fotos como puntos)', () => {
  const grave = [med('a', '2026-11-06T15:00:00Z', 30), med('b', '2026-11-06T16:00:00Z', 40), med('c', '2026-11-05T16:00:00Z', 50)];
  const leve = [med('d', '2026-11-01T15:00:00Z', 3)];
  const viejo = [med('e', '2026-08-01T15:00:00Z', 1)];
  const todas = [...grave, ...leve, ...viejo];
  const r = indicadoresLocales(todas, [grave, leve, viejo, []], '2026-11-07');
  assert.equal(r.fotos30, 4);
  assert.deepEqual(r.porNivel, [0, 2, 0, 1]);
  assert.equal(r.severos, 1); // un punto severo, aunque tenga 3 fotos severas
});

test('por mes: rejilla continua, un encabezado por mes y filas llenas', () => {
  const lista = [];
  for (let i = 0; i < 5; i++) lista.push(med(`n${i}`, `2026-11-0${i + 1}T15:00:00Z`, i));
  for (let i = 0; i < 2; i++) lista.push(med(`o${i}`, `2026-10-1${i}T15:00:00Z`, i));
  const filas = filasDeGaleria(lista, { hoy: '2026-11-07' });
  assert.deepEqual(filas.map((f) => f.tipo), ['dia', 'fila', 'fila', 'dia', 'fila']);
  assert.equal(filas[0].titulo, 'Noviembre de 2026');
  assert.equal(filas[0].total, 5);
  assert.deepEqual(filas.filter((f) => f.tipo === 'fila').map((f) => f.fichas.length), [3, 2, 2]);
  assert.equal(filas[3].titulo, 'Octubre de 2026');
});

test('tituloMes y agruparPorMes usan el mes local UTC-5', () => {
  assert.equal(tituloMes('2026-01'), 'Enero de 2026');
  assert.equal(tituloMes('x'), 'Sin fecha');
  const g = agruparPorMes([med('a', '2026-12-01T03:00:00Z', 1), med('b', '2026-12-01T06:00:00Z', 1)]); // a: 30 nov local
  assert.deepEqual(g.map((x) => x.dia), ['2026-12', '2026-11']);
});

test('filasDeGaleria: el total del mes sale del servidor y no cambia al paginar', () => {
  const m = (id, ts) => ({ id_medicion: id, timestamp: ts, nivel_corrosion: 1, area_corroida_pct: '5' });
  const pag1 = [m('a', '2026-11-07T15:00:00Z'), m('b', '2026-11-06T15:00:00Z'), m('c', '2026-10-05T15:00:00Z')];
  const pag2 = [...pag1, m('d', '2026-10-04T15:00:00Z'), m('e', '2026-10-03T15:00:00Z')];
  const totales = { '2026-11': 2, '2026-10': 3 };
  const enc = (lista, tot) => filasDeGaleria(lista, { totalesMes: tot }).filter((f) => f.tipo === 'dia').map((f) => [f.titulo, f.total, f.cargadas]);
  assert.deepEqual(enc(pag1, totales), [['Noviembre de 2026', 2, 2], ['Octubre de 2026', 3, 1]]);
  assert.deepEqual(enc(pag2, totales), [['Noviembre de 2026', 2, 2], ['Octubre de 2026', 3, 3]]); // mismo total
  assert.deepEqual(enc(pag1, null), [['Noviembre de 2026', 2, 2], ['Octubre de 2026', 1, 1]]); // sin resumen: lo cargado
  assert.deepEqual(enc(pag1, { '2026-11': 1 }), [['Noviembre de 2026', 2, 2], ['Octubre de 2026', 1, 1]]); // nunca menos de lo cargado
});
