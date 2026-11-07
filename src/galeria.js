// src/galeria.js — Lógica pura de la galería de fotos (mosaico por día y por lote). Sin React Native.
// Espejo de lib/mosaico.js de la web: fichas cuadradas, un lote se resume en una ficha con portada.
import { nivelDeMedicion, nombreNivel } from './niveles.js';
import { diaLocal, fechaLarga, rotuloDia, formatoPct, plural, hoyLocal, sumarDias } from './fechas.js';
import { miniaturaDe } from './miniaturas.js';

export { miniaturaDe };

export const COLUMNAS_GALERIA = 3;

const ts = (m) => {
  const t = Date.parse(m?.timestamp);
  return Number.isNaN(t) ? 0 : t;
};

// Clave de lote: la misma que usa la pestaña Lotes (lote_id o, si falta, el nombre).
export function claveLote(m) {
  return m?.lote_id || m?.lote_nombre || null;
}

// "Bloque A · Cubierta" -> "Punto A · Cubierta". Nombres que ya empiezan con "Punto" se respetan.
export function tituloPunto(nombre) {
  const n = String(nombre || '').trim();
  if (!n) return 'Punto sin nombre';
  if (/^bloque\s+/i.test(n)) return n.replace(/^bloque\s+/i, 'Punto ');
  return n;
}

export function peorNivel(items = []) {
  return items.reduce((peor, m) => Math.max(peor, nivelDeMedicion(m)), 0);
}

export function maxPct(items = []) {
  const v = items.map((m) => parseFloat(m?.area_corroida_pct)).filter(Number.isFinite);
  return v.length ? Math.max(...v) : null;
}

// Fichas de una lista de mediciones (ya ordenada o no). Con `agrupar`, las fotos del mismo lote
// (2 o más en esta lista) se funden en una ficha de lote: portada = la peor foto del lote.
// El resultado va de la más reciente a la más antigua (por la foto más reciente de cada ficha).
export function construirMosaico(items = [], { agrupar = true } = {}) {
  const orden = [...items].sort((a, z) => ts(z) - ts(a));
  const fichas = [];
  const lotes = new Map();
  for (const m of orden) {
    const k = agrupar ? claveLote(m) : null;
    if (!k) {
      fichas.push({ tipo: 'foto', clave: `f:${m.id_medicion}`, medicion: m, ts: ts(m) });
      continue;
    }
    let l = lotes.get(k);
    if (!l) {
      l = { tipo: 'lote', clave: `l:${k}`, loteClave: k, nombre: m.lote_nombre || '', items: [], ts: ts(m) };
      lotes.set(k, l);
      fichas.push(l);
    }
    l.items.push(m);
  }
  // Un "lote" de una sola foto es una foto suelta con nombre de lote.
  return fichas.map((f) => {
    if (f.tipo !== 'lote') return f;
    if (f.items.length === 1) return { tipo: 'foto', clave: `f:${f.items[0].id_medicion}`, medicion: f.items[0], ts: f.ts };
    const peor = peorNivel(f.items);
    const portada = f.items.find((m) => nivelDeMedicion(m) === peor) || f.items[0];
    return { ...f, total: f.items.length, peorNivel: peor, maxPct: maxPct(f.items), portada };
  });
}

// Agrupa por día local (UTC-5), del más reciente al más antiguo.
export function agruparPorDia(mediciones = []) {
  const mapa = new Map();
  for (const m of mediciones) {
    const dia = diaLocal(m.timestamp) || 'sin-fecha';
    if (!mapa.has(dia)) mapa.set(dia, []);
    mapa.get(dia).push(m);
  }
  return [...mapa.entries()]
    .sort((a, z) => (a[0] < z[0] ? 1 : a[0] > z[0] ? -1 : 0))
    .map(([dia, items]) => ({ dia, items: items.sort((a, z) => ts(z) - ts(a)) }));
}

export function dividirEnFilas(fichas = [], columnas = COLUMNAS_GALERIA) {
  const filas = [];
  for (let i = 0; i < fichas.length; i += columnas) filas.push(fichas.slice(i, i + columnas));
  return filas;
}

// Filas planas para una FlatList virtualizada: un encabezado por día y filas de `columnas` fichas.
//   { tipo: 'dia', clave, dia, titulo, total }  ·  { tipo: 'fila', clave, fichas }
export function filasDeGaleria(mediciones = [], { columnas = COLUMNAS_GALERIA, agrupar = true, porDia = true, hoy = hoyLocal() } = {}) {
  const grupos = porDia ? agruparPorDia(mediciones) : [{ dia: null, items: mediciones }];
  const filas = [];
  for (const g of grupos) {
    if (porDia) {
      filas.push({
        tipo: 'dia',
        clave: `d:${g.dia}`,
        dia: g.dia,
        titulo: g.dia === 'sin-fecha' ? 'Sin fecha' : rotuloDia(g.dia, hoy),
        total: g.items.length,
      });
    }
    dividirEnFilas(construirMosaico(g.items, { agrupar }), columnas).forEach((fichas, i) => {
      filas.push({ tipo: 'fila', clave: `r:${g.dia}:${i}:${fichas[0].clave}`, fichas });
    });
  }
  return filas;
}

// Nombre accesible de una ficha: "Moderada, 20,4 %, 7 de noviembre de 2026, Punto A".
export function etiquetaFoto(m, { punto = '' } = {}) {
  const nivel = nivelDeMedicion(m);
  const dia = diaLocal(m?.timestamp);
  return [
    m?.nombre || null,
    nombreNivel(nivel),
    m?.area_corroida_pct == null ? null : formatoPct(m.area_corroida_pct),
    dia ? fechaLarga(dia) : null,
    punto || null,
  ].filter(Boolean).join(', ');
}

export function etiquetaLote(ficha, { punto = '' } = {}) {
  const partes = [
    `Lote ${ficha.nombre || 'sin nombre'}`,
    plural(ficha.total, 'foto', 'fotos'),
    `peor nivel ${nombreNivel(ficha.peorNivel)}`,
    punto || null,
  ];
  return partes.filter(Boolean).join(', ');
}

// Estado actual de un punto = promedio del día más reciente con fotos (igual que /indicadores).
export function estadoPunto(items = []) {
  const conDia = items.map((m) => ({ m, dia: diaLocal(m.timestamp) })).filter((x) => x.dia);
  if (!conDia.length) return null;
  const ultimo = conDia.reduce((a, x) => (x.dia > a ? x.dia : a), '');
  const delDia = conDia.filter((x) => x.dia === ultimo).map((x) => x.m);
  const pcts = delDia.map((m) => parseFloat(m.area_corroida_pct)).filter(Number.isFinite);
  const promedio = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
  const nivel = promedio === null ? peorNivel(delDia) : nivelDeMedicion({ area_corroida_pct: promedio });
  return { dia: ultimo, nivel, promedio, fotos: delDia.length };
}

// Lotes a partir de una lista de mediciones (misma clave que `claveLote`). Las fotos sin lote NO
// forman un lote: se cuentan aparte en `sueltas`. Más reciente primero.
export function agruparLotes(mediciones = []) {
  const mapa = new Map();
  let sueltas = 0;
  for (const m of mediciones) {
    const k = claveLote(m);
    if (!k) {
      sueltas += 1;
      continue;
    }
    if (!mapa.has(k)) mapa.set(k, { id: k, nombre: m.lote_nombre || `Lote ${String(m.lote_id || k).slice(-6)}`, items: [] });
    mapa.get(k).items.push(m);
  }
  const lotes = [...mapa.values()].map((l) => {
    const items = [...l.items].sort((a, z) => ts(z) - ts(a));
    const pcts = items.map((m) => parseFloat(m.area_corroida_pct)).filter(Number.isFinite);
    const peor = peorNivel(items);
    return {
      ...l,
      items,
      fechaReciente: items[0]?.timestamp || null,
      peorNivel: peor,
      maxPct: pcts.length ? Math.max(...pcts) : null,
      avgPct: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
      portada: items.find((m) => nivelDeMedicion(m) === peor) || items[0],
    };
  });
  lotes.sort((a, z) => ts({ timestamp: z.fechaReciente }) - ts({ timestamp: a.fechaReciente }));
  return { lotes, sueltas };
}

// Respaldo de los indicadores de Inicio cuando no hay respuesta del servidor (sin conexión y sin
// caché): mismo criterio que /indicadores pero SOLO sobre las fotos cargadas en el teléfono.
// `puntosItems` = una lista de fotos por punto. Estado de un punto = promedio de su día más reciente.
export function indicadoresLocales(mediciones = [], puntosItems = [], hoy = hoyLocal()) {
  const desde = sumarDias(hoy, -29);
  const fotos30 = mediciones.filter((m) => {
    const d = diaLocal(m.timestamp);
    return d && d >= desde && d <= hoy;
  }).length;
  const porNivel = [0, 0, 0, 0];
  for (const items of puntosItems) {
    const e = estadoPunto(items);
    if (e) porNivel[e.nivel] += 1;
  }
  return { fotos30, porNivel, severos: porNivel[3] };
}
