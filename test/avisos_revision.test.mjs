import test from 'node:test';
import assert from 'node:assert/strict';

import { pesoNumerico, familiaPara, resolverEstilo, marcarFuentes, hayFuentes } from '../src/tipografia.js';
import { tituloMes, filasDeGaleria, estadoPunto, indicadoresLocales, puntoDeAtencion, ordenarPuntosPorGravedad } from '../src/galeria.js';
import { aplicarFiltrosADias } from '../src/linea.js';
import { escalaTendencia } from '../src/tendencia.js';
import { aspectoDeMedicion, aspectoParaMascara } from '../src/mascara.js';
import { notasCambiaron, guardarNota, MENSAJE_NOTA_NO_GUARDADA } from '../src/notas.js';
import { destinoTrasAnalisis, MENSAJE_CANCELADA } from '../src/cola.js';
import { arranqueListo, fuentesCargadas, TIEMPO_ARRANQUE_MS } from '../src/arranque.js';

// ── tipografía ──
test('pesoNumerico: normal, bold, numéricos y basura', () => {
  assert.equal(pesoNumerico(undefined), 400);
  assert.equal(pesoNumerico('normal'), 400);
  assert.equal(pesoNumerico('bold'), 700);
  assert.equal(pesoNumerico('500'), 500);
  assert.equal(pesoNumerico(600), 600);
  assert.equal(pesoNumerico('900'), 800);
  assert.equal(pesoNumerico('abc'), 400);
});

test('familiaPara: Outfit por defecto, Plex Mono para mono (tope 700)', () => {
  assert.equal(familiaPara(undefined, '700'), 'Outfit_700Bold');
  assert.equal(familiaPara('mono', '800'), 'IBMPlexMono_700Bold');
  assert.equal(familiaPara('mono'), 'IBMPlexMono_400Regular');
});

test('resolverEstilo con fuentes: la familia sale del peso y fontWeight queda normal', () => {
  const { estilo } = resolverEstilo({ fontWeight: '700', fontSize: 14 });
  assert.equal(estilo.fontFamily, 'Outfit_700Bold');
  assert.equal(estilo.fontWeight, 'normal');
  assert.equal(estilo.fontSize, 14);
});

test('resolverEstilo sin fuentes: conserva fontWeight y usa monospace para mono', () => {
  const a = resolverEstilo({ fontWeight: '700' }, { fuentes: false }).estilo;
  assert.equal(a.fontWeight, '700');
  assert.equal(a.fontFamily, undefined);
  const b = resolverEstilo({ fontFamily: 'mono', fontWeight: '600' }, { fuentes: false }).estilo;
  assert.equal(b.fontFamily, 'monospace');
  assert.equal(b.fontWeight, '600');
});

test('resolverEstilo anidado: sin familia ni peso hereda; solo con peso conserva la familia mono del padre', () => {
  const padre = resolverEstilo({ fontFamily: 'mono' });
  assert.equal(padre.familia, 'mono');
  const hijoVacio = resolverEstilo({ color: 'red' }, { anidado: true, heredada: padre.familia });
  assert.deepEqual(hijoVacio.estilo, { color: 'red' });
  assert.equal(hijoVacio.familia, 'mono');
  const hijoBold = resolverEstilo({ fontWeight: '800' }, { anidado: true, heredada: padre.familia });
  assert.equal(hijoBold.estilo.fontFamily, 'IBMPlexMono_700Bold');
  // Un hijo que declara su propia familia manda sobre la del padre.
  const hijoOutfit = resolverEstilo({ fontFamily: 'otra', fontWeight: '700' }, { anidado: true, heredada: 'mono' });
  assert.equal(hijoOutfit.estilo.fontFamily, 'Outfit_700Bold');
});

test('marcarFuentes / hayFuentes', () => {
  marcarFuentes(false);
  assert.equal(hayFuentes(), false);
  marcarFuentes(true);
  assert.equal(hayFuentes(), true);
});

// ── arranque ──
test('arranqueListo: espera sesión y fuentes, pero nunca más del tiempo máximo', () => {
  assert.equal(arranqueListo({ booting: true, fuentesListas: true }), false);
  assert.equal(arranqueListo({ booting: false, fuentesListas: false, errorFuentes: false }), false);
  assert.equal(arranqueListo({ booting: false, fuentesListas: true }), true);
  assert.equal(arranqueListo({ booting: false, errorFuentes: true }), true);
  assert.equal(arranqueListo({ booting: true, fuentesListas: false, esperaAgotada: true }), true);
  assert.ok(TIEMPO_ARRANQUE_MS > 0 && TIEMPO_ARRANQUE_MS <= 15000);
});

test('fuentesCargadas: solo si cargaron sin error', () => {
  assert.equal(fuentesCargadas({ fuentesListas: true }), true);
  assert.equal(fuentesCargadas({ fuentesListas: true, errorFuentes: true }), false);
  assert.equal(fuentesCargadas({}), false);
});

// ── galería ──
test('tituloMes: mes válido, inválido (13, 00) y basura', () => {
  assert.equal(tituloMes('2026-11'), 'Noviembre de 2026');
  assert.equal(tituloMes('2026-13'), 'Sin fecha');
  assert.equal(tituloMes('2026-00'), 'Sin fecha');
  assert.equal(tituloMes('hola'), 'Sin fecha');
});

const med = (id, ts, pct) => ({ id_medicion: id, timestamp: ts, area_corroida_pct: String(pct) });

test('filasDeGaleria: porDia true agrupa por día, false sin encabezados, valor raro cae a mes', () => {
  const lista = [med('a', '2026-11-07T15:00:00Z', 1), med('b', '2026-11-05T15:00:00Z', 2)];
  const encab = (o) => filasDeGaleria(lista, { hoy: '2026-11-07', ...o }).filter((f) => f.tipo === 'dia');
  assert.equal(encab({ porDia: true }).length, 2);
  assert.equal(encab({ porDia: false }).length, 0);
  assert.equal(encab({}).length, 1);
  assert.equal(encab({ por: 'cosa' }).length, 1);
  assert.equal(encab({ por: 'dia' }).length, 2);
});

test('estadoPunto: sin fotos o sin fechas válidas -> null; sin % usa el peor nivel', () => {
  assert.equal(estadoPunto([]), null);
  assert.equal(estadoPunto(undefined), null);
  assert.equal(estadoPunto([{ id_medicion: 'x', timestamp: 'no-es-fecha', area_corroida_pct: '5' }]), null);
  const e = estadoPunto([{ id_medicion: 'y', timestamp: '2026-11-07T15:00:00Z', nivel_corrosion: 2 }]);
  assert.equal(e.promedio, null);
  assert.equal(e.nivel, 2);
});

test('indicadoresLocales: cuenta fotos de 30 días y puntos por nivel; ignora puntos sin estado', () => {
  const fotos = [med('a', '2026-11-07T15:00:00Z', 30), med('b', '2026-08-01T15:00:00Z', 1)];
  const r = indicadoresLocales(fotos, [[fotos[0]], [], [fotos[1]]], '2026-11-07');
  assert.equal(r.fotos30, 1);
  assert.deepEqual(r.porNivel, [0, 1, 0, 1]);
  assert.equal(r.severos, 1);
});

test('puntoDeAtencion: usa mas_critico del servidor y acota el nivel; sin nada -> null', () => {
  const srv = { mas_critico: { id_punto: 'P1', nombre: 'Bloque A', nivel: 2, promedio_pct: 12, fecha: '2026-11-07' } };
  const a = puntoDeAtencion(srv, []);
  assert.equal(a.clave, 'P1');
  assert.equal(a.nombre, 'Punto A');
  assert.equal(a.urgente, true);
  assert.equal(puntoDeAtencion({ mas_critico: { id_punto: 'P1', nombre: 'X', nivel: 9 } }, []).nivel, 3);
  assert.equal(puntoDeAtencion({ mas_critico: { id_punto: 'P1', nombre: 'X', nivel: -4 } }, []).nivel, 0);
  // nivel basura: cae al cálculo local, que sin grupos da null
  assert.equal(puntoDeAtencion({ mas_critico: { id_punto: 'P1', nombre: 'X', nivel: 'abc' } }, []), null);
  assert.equal(puntoDeAtencion(null, []), null);
});

test('puntoDeAtencion sin servidor: el de mayor promedio; ignora grupos sin promedio', () => {
  const grupos = [
    { clave: 'a', bloque: { nombre: 'Bloque A' }, estado: { promedio: 3, nivel: 1, dia: '2026-11-01' } },
    { clave: 'b', bloque: { nombre: 'Bloque B' }, estado: { promedio: 30, nivel: 3, dia: '2026-11-02' } },
    { clave: 'c', bloque: { nombre: 'Bloque C' }, estado: { promedio: null, nivel: 2, dia: '2026-11-03' } },
    { clave: 'd', bloque: { nombre: 'Bloque D' }, estado: null },
  ];
  const r = puntoDeAtencion({}, grupos);
  assert.equal(r.clave, 'b');
  assert.equal(r.urgente, true);
});

test('ordenarPuntosPorGravedad: más grave primero, sin estado al final, estable', () => {
  const g = (clave, estado) => ({ clave, estado });
  const orden = ordenarPuntosPorGravedad([
    g('sin1', null),
    g('leve', { nivel: 1, promedio: 2 }),
    g('severo', { nivel: 3, promedio: 40 }),
    g('sin2', null),
    g('moderado', { nivel: 2, promedio: 15 }),
    g('moderado2', { nivel: 2, promedio: 11 }),
  ]).map((x) => x.clave);
  assert.deepEqual(orden, ['severo', 'moderado', 'moderado2', 'leve', 'sin1', 'sin2']);
});

// ── filtros del calendario ──
test('aplicarFiltrosADias: por nivel con por_nivel numérico o en cadenas, y sin desglose', () => {
  const dias = [
    { fecha: '2026-11-05', total: 5, peor_nivel: 3, por_nivel: [1, 1, 1, 2] },
    { fecha: '2026-11-06', total: 3, peor_nivel: 1, por_nivel: ['1', '2', '0', '0'] },
    { fecha: '2026-11-07', total: 4, peor_nivel: 2 },
    { fecha: '2026-11-08', total: 4, peor_nivel: 3 },
  ];
  const r = aplicarFiltrosADias(dias, { niveles: [1, 3], preset: 'todo' }, '2026-11-08');
  assert.equal(r[0].total, 3); // 1 + 2, nunca concatenado
  assert.equal(r[0].peor_nivel, 3);
  assert.equal(r[1].total, 2); // '2' + '0' sin concatenar
  assert.equal(r[1].peor_nivel, 1);
  assert.equal(r[2].total, 0); // sin desglose y su peor nivel (2) no está en el filtro
  assert.equal(r[2].peor_nivel, null);
  assert.equal(r[3].total, 4); // sin desglose y su peor nivel (3) sí está
});

// ── tendencia ──
test('escalaTendencia: las barras se escalan con lo apilado (porNivel), no con total', () => {
  const puntos = [
    { fecha: '2026-11-01', promedio: 5, total: 2, porNivel: [0, 4, 0, 0], maxPct: 6, minPct: 4 },
    { fecha: '2026-11-02', promedio: 5, total: 1, porNivel: [0, 1, 0, 0], maxPct: 6, minPct: 4 },
  ];
  const e = escalaTendencia(puntos, { ancho: 100, alto: 50, altoBarras: 40 });
  assert.equal(e.maxFotos, 4);
  for (const p of e.puntos) for (const s of p.segmentos) assert.ok(s.y >= 0, 'la barra no se sale por arriba');
  // Sin desglose se usa total
  const e2 = escalaTendencia([{ fecha: '2026-11-01', promedio: 5, total: 7, porNivel: null }], { ancho: 100, alto: 50, altoBarras: 40 });
  assert.equal(e2.maxFotos, 7);
});

// ── máscara ──
test('aspectoDeMedicion / aspectoParaMascara: real si se conoce, null si no', () => {
  assert.equal(aspectoDeMedicion({ width: 1600, height: 800 }), 2);
  assert.equal(aspectoDeMedicion({ width: 0, height: 800 }), null);
  assert.equal(aspectoDeMedicion({}), null);
  assert.equal(aspectoParaMascara({ medicion: {}, medido: null }), null);
  assert.equal(aspectoParaMascara({ medicion: {}, medido: 1.5 }), 1.5);
  assert.equal(aspectoParaMascara({ medicion: { width: 300, height: 400 }, medido: 1.5 }), 0.75);
});

// ── notas (autoguardado) ──
test('notasCambiaron: sin resultado no; escribir sí; igual a lo guardado no; borrar lo guardado sí', () => {
  assert.equal(notasCambiaron({ hayResultado: false, espesor: '3' }), false);
  assert.equal(notasCambiaron({ hayResultado: true, espesor: '', descripcion: '' }), false);
  assert.equal(notasCambiaron({ hayResultado: true, espesor: '3', descripcion: '' }), true);
  assert.equal(notasCambiaron({ hayResultado: true, guardada: { espesor: '3', descripcion: 'x' }, espesor: '3', descripcion: 'x' }), false);
  assert.equal(notasCambiaron({ hayResultado: true, guardada: { espesor: '3', descripcion: '' }, espesor: '', descripcion: '' }), true);
});

test('guardarNota: éxito devuelve el mapa nuevo', async () => {
  let guardado = null;
  const r = await guardarNota({ obsMap: { a: { espesor: '1' } }, id: 'b', espesor: '2', descripcion: 'd', guardar: async (m) => { guardado = m; return true; } });
  assert.equal(r.ok, true);
  assert.deepEqual(guardado, { a: { espesor: '1' }, b: { espesor: '2', descripcion: 'd' } });
  assert.deepEqual(r.obsMap, guardado);
  assert.equal(r.avisoPendiente, false);
});

test('guardarNota: si falla (lanza o devuelve false) no lanza, conserva el mapa y avisa solo una vez', async () => {
  const previo = { a: { espesor: '1' } };
  const lanza = async () => { throw new Error('disco lleno'); };
  const falso = async () => false;
  const r1 = await guardarNota({ obsMap: previo, id: 'b', espesor: '2', guardar: lanza });
  assert.equal(r1.ok, false);
  assert.equal(r1.obsMap, previo);
  assert.equal(r1.avisar, true);
  const r2 = await guardarNota({ obsMap: previo, id: 'b', espesor: '23', guardar: falso, avisoPendiente: r1.avisoPendiente });
  assert.equal(r2.ok, false);
  assert.equal(r2.avisar, false);
  // El siguiente cambio reintenta y, si sale bien, se limpia el aviso pendiente.
  const r3 = await guardarNota({ obsMap: previo, id: 'b', espesor: '234', guardar: async () => true, avisoPendiente: r2.avisoPendiente });
  assert.equal(r3.ok, true);
  assert.equal(r3.avisoPendiente, false);
  assert.match(MENSAJE_NOTA_NO_GUARDADA, /No se pudo guardar la nota/);
});

// ── destino tras el análisis (cancelar) ──
test('destinoTrasAnalisis: con una lista va al resultado (la última); cancelada sin listas vuelve a revisar; sin listas es error', () => {
  const lista = (n) => ({ uri: n, status: 'lista' });
  const r = destinoTrasAnalisis({ cola: [lista('1'), { status: 'error', error: 'x' }, lista('3')], cancelada: true });
  assert.equal(r.destino, 'result');
  assert.equal(r.ultima.uri, '3');
  const c = destinoTrasAnalisis({ cola: [{ status: 'error', error: MENSAJE_CANCELADA }], cancelada: true });
  assert.equal(c.destino, 'preview');
  const e = destinoTrasAnalisis({ cola: [{ status: 'error', error: 'Sin red' }] });
  assert.equal(e.destino, 'error');
  assert.equal(e.mensaje, 'Sin red');
  assert.equal(destinoTrasAnalisis({ cola: [] }).mensaje, 'No se pudo procesar ninguna foto.');
});

import { uriParaMedirAspecto } from '../src/mascara.js';
test('uriParaMedirAspecto: nada si el API trae width/height; si no, la miniatura y, sin ella, la foto', () => {
  assert.equal(uriParaMedirAspecto({ medicion: { width: 800, height: 600 }, uri: 'g', uriMini: 'm' }), null);
  assert.equal(uriParaMedirAspecto({ medicion: {}, uri: 'g', uriMini: 'm' }), 'm');
  assert.equal(uriParaMedirAspecto({ medicion: {}, uri: 'g', uriMini: null }), 'g');
  assert.equal(uriParaMedirAspecto({ medicion: {} }), null);
});
