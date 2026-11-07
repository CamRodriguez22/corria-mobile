// src/linea.js — Línea de tiempo: mapa de calor anual y filtros del historial. Sin React Native.
// Espejo de lib/lineaTiempo.js de la web (barra anual por día local UTC-5).
import { diaLocal, hoyLocal, partesDia, sumarDias, diaSemana, MESES_CORTOS, fechaLarga, plural } from './fechas.js';
import { nivelDeMedicion, nombreNivel } from './niveles.js';

export const ANIO_MINIMO = 2026; // el backend rechaza años anteriores

const nivelValido = (v) => (Number.isInteger(v) && v >= 0 && v <= 3 ? v : null);

// Años que se pueden elegir: desde ANIO_MINIMO hasta el año de `hoy`.
export function aniosDisponibles(hoy = hoyLocal()) {
  const actual = partesDia(hoy)?.anio ?? ANIO_MINIMO;
  const anios = [];
  for (let a = ANIO_MINIMO; a <= Math.max(actual, ANIO_MINIMO); a++) anios.push(a);
  return anios;
}

// Cuadrícula tipo calendario anual: columnas = semanas (lunes a domingo), 7 filas por columna.
// `dias` = lista `dias` de GET /mediciones/resumen-diario. Los días futuros no se dibujan.
// Celda: { fecha, dia, total, nivel (peor nivel o null), conFotos }; hueco = null.
export function mapaCalor(dias = [], anio, hoy = hoyLocal()) {
  const porFecha = new Map((dias || []).map((d) => [d.fecha, d]));
  const inicio = `${anio}-01-01`;
  const finAnio = `${anio}-12-31`;
  if (hoy < inicio) return { semanas: [], meses: [], diasConFotos: 0, totalFotos: 0 };
  const fin = hoy < finAnio ? hoy : finAnio;

  const semanas = [];
  let semana = new Array(diaSemana(inicio)).fill(null);
  const meses = [];
  let diasConFotos = 0;
  let totalFotos = 0;
  for (let f = inicio; f <= fin; f = sumarDias(f, 1)) {
    const p = partesDia(f);
    const d = porFecha.get(f);
    const total = d ? Number(d.total) || 0 : 0;
    if (total > 0) {
      diasConFotos += 1;
      totalFotos += total;
    }
    if (p.dia === 1) meses.push({ semana: semanas.length, nombre: MESES_CORTOS[p.mes - 1] });
    semana.push({ fecha: f, dia: p.dia, total, nivel: total > 0 ? nivelValido(d.peor_nivel) : null, conFotos: total > 0 });
    if (semana.length === 7) {
      semanas.push(semana);
      semana = [];
    }
  }
  if (semana.length) {
    while (semana.length < 7) semana.push(null);
    semanas.push(semana);
  }
  return { semanas, meses, diasConFotos, totalFotos };
}

// "7 de noviembre de 2026: 4 fotos, peor nivel Severa" (lector de pantalla y leyenda del día).
export function etiquetaCelda(celda) {
  if (!celda) return '';
  const base = fechaLarga(celda.fecha);
  if (!celda.conFotos) return `${base}: sin fotos`;
  const nivel = celda.nivel === null ? '' : `, peor nivel ${nombreNivel(celda.nivel)}`;
  return `${base}: ${plural(celda.total, 'foto', 'fotos')}${nivel}`;
}

// ───────────────────────── Filtros del historial ─────────────────────────
export const PRESETS_RANGO = [
  { id: 'todo', label: 'Todo' },
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: '90', label: '90 días' },
];

// Rango { desde, hasta } (días locales, ambos inclusivos) para un preset; {} = sin límite.
export function rangoDePreset(id, hoy = hoyLocal()) {
  const dias = Number(id);
  if (!Number.isFinite(dias) || dias <= 0) return {};
  return { desde: sumarDias(hoy, -(dias - 1)), hasta: hoy };
}

export const FILTROS_VACIOS = { niveles: [], idPunto: null, preset: 'todo', dia: null };

// El filtro efectivo de fechas: un día elegido en el mapa de calor manda sobre el preset.
export function rangoEfectivo(filtros = FILTROS_VACIOS, hoy = hoyLocal()) {
  if (filtros.dia) return { desde: filtros.dia, hasta: filtros.dia };
  return rangoDePreset(filtros.preset || 'todo', hoy);
}

export function hayFiltros(filtros = FILTROS_VACIOS) {
  return Boolean(
    (filtros.niveles && filtros.niveles.length) || filtros.idPunto || filtros.dia || (filtros.preset && filtros.preset !== 'todo')
  );
}

export function alternarNivel(niveles = [], n) {
  return niveles.includes(n) ? niveles.filter((x) => x !== n) : [...niveles, n].sort();
}

// `clavePunto(m)` resuelve a qué punto pertenece una medición (por defecto m.id_punto).
export function filtrarMediciones(lista = [], filtros = FILTROS_VACIOS, { hoy = hoyLocal(), clavePunto = (m) => m.id_punto } = {}) {
  const { desde, hasta } = rangoEfectivo(filtros, hoy);
  const niveles = filtros.niveles || [];
  return lista.filter((m) => {
    if (niveles.length && !niveles.includes(nivelDeMedicion(m))) return false;
    if (filtros.idPunto && clavePunto(m) !== filtros.idPunto) return false;
    if (desde || hasta) {
      const dia = diaLocal(m.timestamp);
      if (!dia) return false;
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
    }
    return true;
  });
}

// "12 fotos" / "1 foto" / "Sin fotos con estos filtros".
export function textoResultados(n, filtrado) {
  if (n === 0) return filtrado ? 'Ninguna foto coincide con los filtros' : 'Sin fotos';
  return plural(n, 'foto', 'fotos');
}
