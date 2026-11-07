// src/tendencia.js — Puntos y escala de la gráfica de tendencia por punto. Sin React Native.
// Espejo de lib/tendenciaDiaria.js de la web: un punto por día local con el promedio del % corroído.
import { UMBRAL_MODERADA, UMBRAL_SEVERA, nombreNivel, nivelDePct } from './niveles.js';
import { fechaCorta, formatoPct, plural, partesDia } from './fechas.js';

export const DIAS_TENDENCIA_MAX = 90;
export const MIN_DIAS_TENDENCIA = 2;

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);
const MS_DIA = 86400000;
const msDia = (ymd) => {
  const p = partesDia(ymd);
  return p ? Date.UTC(p.anio, p.mes - 1, p.dia) : NaN;
};

// De `dias` (GET /mediciones/resumen-diario) a puntos, del más antiguo al más reciente
// (los últimos `max` días con promedio). El nivel sale del % promedio con los umbrales ISO.
export function puntosTendencia(dias = [], max = DIAS_TENDENCIA_MAX) {
  const elegidos = [...(dias || [])]
    .filter((d) => d && d.fecha && esNumero(d.promedio_pct))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
    .slice(-max);
  const variosAnios = new Set(elegidos.map((d) => d.fecha.slice(0, 4))).size > 1;
  return elegidos.map((d) => ({
    fecha: d.fecha,
    etiqueta: fechaCorta(d.fecha, { conAnio: variosAnios }),
    total: Number(d.total) || 0,
    promedio: Math.round(d.promedio_pct * 10) / 10,
    nivel: nivelDePct(d.promedio_pct),
    peorNivel: Number.isInteger(d.peor_nivel) ? d.peor_nivel : null,
    peorPct: esNumero(d.max_pct) ? d.max_pct : null,
  }));
}

const PASOS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100];

// Techo del eje Y: el menor paso >= máximo con aire; siempre alcanza el umbral de 10 %.
export function techoEjeY(maximo) {
  const objetivo = Math.max((maximo || 0) * 1.15, UMBRAL_MODERADA + 2);
  return PASOS.find((p) => p >= objetivo) ?? 100;
}

export function marcasEjeY(techo) {
  const paso = techo <= 20 ? 5 : techo <= 50 ? 10 : 25;
  const marcas = [];
  for (let v = 0; v <= techo; v += paso) marcas.push(v);
  return marcas;
}

// Geometría de la gráfica dentro de un área `ancho`x`alto` (ya sin márgenes).
// El eje X es el tiempo real (días entre medidas), no el índice: 2 días seguidos y 2 separados por
// un mes no se ven igual. Devuelve coordenadas listas para dibujar.
export function escalaTendencia(puntos = [], { ancho, alto } = {}) {
  const techo = techoEjeY(Math.max(0, ...puntos.map((p) => p.promedio)));
  const y = (v) => alto - (Math.min(Math.max(v, 0), techo) / techo) * alto;
  const t0 = puntos.length ? msDia(puntos[0].fecha) : 0;
  const t1 = puntos.length ? msDia(puntos[puntos.length - 1].fecha) : 0;
  const span = Math.max(t1 - t0, MS_DIA);
  const x = (fecha) => (puntos.length < 2 ? ancho / 2 : ((msDia(fecha) - t0) / span) * ancho);
  const umbrales = [
    { valor: UMBRAL_MODERADA, nivel: 2 },
    { valor: UMBRAL_SEVERA, nivel: 3 },
  ]
    .filter((u) => u.valor <= techo)
    .map((u) => ({ ...u, y: y(u.valor), etiqueta: `${nombreNivel(u.nivel)} desde ${u.valor} %` }));
  return {
    techo,
    marcas: marcasEjeY(techo).map((v) => ({ valor: v, y: y(v) })),
    umbrales,
    puntos: puntos.map((p) => ({ ...p, x: x(p.fecha), y: y(p.promedio) })),
  };
}

// Punto más cercano (en X) a una coordenada tocada; null si no hay puntos.
export function puntoMasCercano(puntosEscala = [], x) {
  let mejor = null;
  let dist = Infinity;
  for (const p of puntosEscala) {
    const d = Math.abs(p.x - x);
    if (d < dist) {
      dist = d;
      mejor = p;
    }
  }
  return mejor;
}

// Resumen en texto (lector de pantalla y vista "tabla" de la gráfica).
export function resumenTendencia(puntos = []) {
  if (puntos.length < MIN_DIAS_TENDENCIA) return '';
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const delta = Math.round((ultimo.promedio - primero.promedio) * 10) / 10;
  const cambio = delta === 0 ? 'sin cambio' : `${delta > 0 ? 'sube' : 'baja'} ${Math.abs(delta).toFixed(1).replace('.', ',')} puntos porcentuales`;
  return (
    `Promedio de corrosión por día, ${plural(puntos.length, 'día', 'días')} entre ${primero.etiqueta} y ${ultimo.etiqueta}. ` +
    `Último día: ${formatoPct(ultimo.promedio)}, ${nombreNivel(ultimo.nivel)}. Desde el primer día ${cambio}.`
  );
}

// Una línea por día (más reciente primero) para la lista accesible.
export function lineasAccesibles(puntos = [], n = 7) {
  return [...puntos].slice(-n).reverse().map((p) => textoDia(p));
}

export function textoDia(p) {
  const peor = p.peorPct == null ? '' : ` · peor foto ${formatoPct(p.peorPct)}`;
  return `${p.etiqueta}: ${formatoPct(p.promedio)} (${nombreNivel(p.nivel)}) · ${plural(p.total, 'foto', 'fotos')}${peor}`;
}

// Rótulo de una línea de referencia (p. ej. "Severa desde 25 %"): se prueba arriba-derecha, arriba-izquierda,
// abajo-derecha y abajo-izquierda de la línea y se elige la primera posición que no tape ningún punto.
// Coordenadas relativas al área de dibujo (sin márgenes). `radio` = radio del punto + aire.
export function ubicarRotulo(umbral, puntos = [], { ancho, alto }, { anchoCaracter = 7.2, relleno = 10, altoRotulo = 18, radio = 9 } = {}) {
  const w = umbral.etiqueta.length * anchoCaracter + relleno;
  const h = altoRotulo;
  const candidatos = [
    { x: ancho - w, y: umbral.y - h - 2 },
    { x: 0, y: umbral.y - h - 2 },
    { x: ancho - w, y: umbral.y + 3 },
    { x: 0, y: umbral.y + 3 },
  ].filter((c) => c.y >= -4 && c.y + h <= alto + 4);
  const choca = (c) =>
    puntos.some((p) => p.x + radio > c.x && p.x - radio < c.x + w && p.y + radio > c.y && p.y - radio < c.y + h);
  const elegido = candidatos.find((c) => !choca(c)) || candidatos[0] || { x: ancho - w, y: umbral.y - h - 2 };
  return { ...elegido, w, h };
}
