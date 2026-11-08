// src/linea.js — Línea de tiempo: mapa de calor anual y filtros del historial. Sin React Native.
// Espejo de lib/lineaTiempo.js de la web (barra anual por día local UTC-5).
import { diaLocal, hoyLocal, partesDia, sumarDias, diaSemana, MESES, fechaLarga, plural } from './fechas.js';
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

// ───────────────────────── Calendario mensual ─────────────────────────
export const NOMBRES_DIA_SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

// Mes { anio, mes (1..12) } de un día "YYYY-MM-DD".
export function mesDe(ymd) {
  const p = partesDia(ymd);
  return p ? { anio: p.anio, mes: p.mes } : null;
}

export function mesAnterior({ anio, mes }) {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export function mesSiguiente({ anio, mes }) {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

const claveMes = ({ anio, mes }) => anio * 12 + (mes - 1);

// Se puede ir al mes anterior hasta enero de ANIO_MINIMO y al siguiente hasta el mes de `hoy`.
export function limitesMes(mes, hoy = hoyLocal()) {
  const actual = mesDe(hoy) || { anio: ANIO_MINIMO, mes: 1 };
  return {
    puedeAnterior: claveMes(mes) > claveMes({ anio: ANIO_MINIMO, mes: 1 }),
    puedeSiguiente: claveMes(mes) < claveMes(actual),
  };
}

// "noviembre de 2026"
export function nombreMes({ anio, mes }) {
  return `${MESES[mes - 1]} de ${anio}`;
}

// Calendario de un mes: filas de 7 (lunes a domingo); fuera del mes = null. Celda:
// { fecha, dia, total, nivel (peor nivel o null), conFotos, futuro, esHoy }.
// `dias` = lista `dias` de GET /mediciones/resumen-diario (ya filtrada con aplicarFiltrosADias si hay filtros).
export function calendarioMes(dias = [], { anio, mes }, hoy = hoyLocal()) {
  const porFecha = new Map((dias || []).map((d) => [d.fecha, d]));
  const primero = `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-01`;
  const siguiente = mesSiguiente({ anio, mes });
  const ultimo = sumarDias(`${String(siguiente.anio).padStart(4, '0')}-${String(siguiente.mes).padStart(2, '0')}-01`, -1);
  const semanas = [];
  let semana = new Array(diaSemana(primero)).fill(null);
  let diasConFotos = 0;
  let totalFotos = 0;
  for (let f = primero; f <= ultimo; f = sumarDias(f, 1)) {
    const d = porFecha.get(f);
    const total = d ? Number(d.total) || 0 : 0;
    if (total > 0) {
      diasConFotos += 1;
      totalFotos += total;
    }
    semana.push({
      fecha: f,
      dia: partesDia(f).dia,
      total,
      nivel: total > 0 ? nivelValido(d.peor_nivel) : null,
      conFotos: total > 0,
      futuro: f > hoy,
      esHoy: f === hoy,
    });
    if (semana.length === 7) {
      semanas.push(semana);
      semana = [];
    }
  }
  if (semana.length) {
    while (semana.length < 7) semana.push(null);
    semanas.push(semana);
  }
  return { anio, mes, nombre: nombreMes({ anio, mes }), semanas, diasConFotos, totalFotos };
}

// El calendario sigue los filtros activos (nivel y rango de fechas; el punto se resuelve pidiendo el
// resumen de ese punto). Con niveles elegidos, cada día cuenta solo las fotos de esos niveles
// (por_nivel del backend) y su peor nivel es el peor entre ellos; fuera del rango, el día queda vacío.
// El día elegido (filtros.dia) no atenúa nada: se resalta en el calendario.
export function aplicarFiltrosADias(dias = [], filtros = FILTROS_VACIOS, hoy = hoyLocal()) {
  const niveles = filtros.niveles || [];
  const { desde, hasta } = rangoDePreset(filtros.preset || 'todo', hoy);
  if (!niveles.length && !desde && !hasta) return dias || [];
  return (dias || []).map((d) => {
    if ((desde && d.fecha < desde) || (hasta && d.fecha > hasta)) return { ...d, total: 0, peor_nivel: null };
    if (!niveles.length || !Array.isArray(d.por_nivel)) return d;
    const vistos = niveles.filter((n) => (d.por_nivel[n] || 0) > 0);
    return { ...d, total: vistos.reduce((t, n) => t + d.por_nivel[n], 0), peor_nivel: vistos.length ? Math.max(...vistos) : null };
  });
}

// Fotos por mes ("2026-11" -> n) desde el resumen diario: totales reales del servidor, que no cambian
// al paginar el historial. Con un resumen truncado los totales serían parciales: devuelve null.
export function totalesPorMes(dias = [], { truncado = false } = {}) {
  if (truncado) return null;
  const totales = {};
  for (const d of dias || []) {
    const n = Number(d.total) || 0;
    if (n > 0 && d.fecha) totales[d.fecha.slice(0, 7)] = (totales[d.fecha.slice(0, 7)] || 0) + n;
  }
  return totales;
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
