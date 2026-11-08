// src/tendencia.js — Puntos y escala de la gráfica de tendencia por punto. Sin React Native.
// Espejo de lib/tendenciaDiaria.js de la web: un punto por día local con el promedio del % corroído.
import { UMBRAL_MODERADA, nombreNivel, nivelDePct } from './niveles.js';
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
    minPct: esNumero(d.min_pct) ? d.min_pct : null,
    maxPct: esNumero(d.max_pct) ? d.max_pct : null,
    // Fotos del día por nivel (0..3), tal como las agrega el backend en resumen-diario (por_nivel).
    porNivel: Array.isArray(d.por_nivel) && d.por_nivel.length === 4 ? d.por_nivel.map((n) => Math.max(0, Number(n) || 0)) : null,
  }));
}

const PASOS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100];

// Techo del eje Y: el menor paso >= máximo con aire (mínimo 15 %, para que unas décimas no llenen el eje).
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
export function escalaTendencia(puntos = [], { ancho, alto, altoBarras = 0 } = {}) {
  const maximo = Math.max(0, ...puntos.map((p) => Math.max(p.promedio, p.maxPct ?? 0)));
  const techo = techoEjeY(maximo);
  const y = (v) => alto - (Math.min(Math.max(v, 0), techo) / techo) * alto;
  const t0 = puntos.length ? msDia(puntos[0].fecha) : 0;
  const t1 = puntos.length ? msDia(puntos[puntos.length - 1].fecha) : 0;
  const span = Math.max(t1 - t0, MS_DIA);
  const x = (fecha) => (puntos.length < 2 ? ancho / 2 : ((msDia(fecha) - t0) / span) * ancho);
  // Barras de fotos por nivel (panel inferior): altura proporcional al día con más fotos.
  const maxFotos = Math.max(1, ...puntos.map((p) => p.total));
  const unidad = altoBarras / maxFotos;
  const salida = puntos.map((p, i) => {
    const px = x(p.fecha);
    let acum = 0;
    const segmentos = (p.porNivel || [])
      .map((n, nivel) => ({ nivel, n }))
      .filter((s) => s.n > 0)
      .map((s) => {
        const h = s.n * unidad;
        const seg = { nivel: s.nivel, n: s.n, y: altoBarras - acum - h, h };
        acum += h;
        return seg;
      });
    return {
      ...p,
      x: px,
      y: y(p.promedio),
      yMin: p.minPct == null ? null : y(p.minPct),
      yMax: p.maxPct == null ? null : y(p.maxPct),
      // Días desde el punto anterior (null en el primero): la banda solo une días cercanos.
      gapDias: i === 0 ? null : Math.round((msDia(p.fecha) - msDia(puntos[i - 1].fecha)) / MS_DIA),
      segmentos,
    };
  });
  // Ancho de barra: un 70 % del paso mínimo entre días, entre 4 y 14 (el eje X es tiempo real).
  let pasoMin = Infinity;
  for (let i = 1; i < salida.length; i++) pasoMin = Math.min(pasoMin, salida[i].x - salida[i - 1].x);
  const anchoBarra = Number.isFinite(pasoMin) ? Math.max(4, Math.min(14, pasoMin * 0.7)) : 14;
  return {
    techo,
    marcas: marcasEjeY(techo).map((v) => ({ valor: v, y: y(v) })),
    puntos: salida,
    anchoBarra,
    maxFotos,
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

// "7 días con fotos en 92 días (7 ago a 7 nov)": el eje cubre todo el período, no solo los días con datos.
export function rotuloPeriodo(puntos = []) {
  if (!puntos.length) return '';
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const dias = Math.round((msDia(ultimo.fecha) - msDia(primero.fecha)) / MS_DIA) + 1;
  const base = plural(puntos.length, 'día con fotos', 'días con fotos');
  if (puntos.length < 2) return base;
  return `${base} en ${dias} días (${primero.etiqueta} a ${ultimo.etiqueta})`;
}
