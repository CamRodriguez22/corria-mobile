// src/fechas.js — Fechas puras (sin React Native). Todo se calcula en el día local de Colombia
// (UTC-5, sin horario de verano), el mismo que usa el backend en resumen-diario y en desde/hasta.

export const UTC_MENOS_5_MS = 5 * 3600000;
const MS_DIA = 86400000;
const NBSP = ' ';

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function aMs(ts) {
  const t = typeof ts === 'number' ? ts : Date.parse(ts);
  return Number.isFinite(t) ? t : null;
}

// "YYYY-MM-DD" del día local (UTC-5) de un instante, o null si no es una fecha válida.
export function diaLocal(ts) {
  const t = aMs(ts);
  return t === null ? null : new Date(t - UTC_MENOS_5_MS).toISOString().slice(0, 10);
}

export function hoyLocal(ahoraMs = Date.now()) {
  return diaLocal(ahoraMs);
}

export function partesDia(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? ''));
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { anio, mes, dia };
}

// "2026-11-07" -> "7 de noviembre de 2026" (a mano: new Date() corrimiento por zona horaria).
export function fechaLarga(ymd) {
  const p = partesDia(ymd);
  return p ? `${p.dia} de ${MESES[p.mes - 1]} de ${p.anio}` : '';
}

// "2026-11-07" -> "7 nov" (con año: "7 nov 2026").
export function fechaCorta(ymd, { conAnio = false } = {}) {
  const p = partesDia(ymd);
  if (!p) return '';
  const base = `${p.dia} ${MESES_CORTOS[p.mes - 1]}`;
  return conAnio ? `${base} ${p.anio}` : base;
}

// "7 de noviembre" (sin año) para encabezados dentro del año en curso.
export function fechaMedia(ymd) {
  const p = partesDia(ymd);
  return p ? `${p.dia} de ${MESES[p.mes - 1]}` : '';
}

// Hora local de un instante: "12:44 p. m." (espacios duros para que no se parta en 2 líneas).
export function horaLocal(ts) {
  const t = aMs(ts);
  if (t === null) return '';
  const d = new Date(t - UTC_MENOS_5_MS);
  const h24 = d.getUTCHours();
  const h12 = ((h24 + 11) % 12) + 1;
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h12}:${mm}${NBSP}${h24 < 12 ? 'a.' : 'p.'}${NBSP}m.`;
}

export function sumarDias(ymd, n) {
  const p = partesDia(ymd);
  if (!p) return null;
  return new Date(Date.UTC(p.anio, p.mes - 1, p.dia) + n * MS_DIA).toISOString().slice(0, 10);
}

// Lunes = 0 ... domingo = 6.
export function diaSemana(ymd) {
  const p = partesDia(ymd);
  if (!p) return null;
  return (new Date(Date.UTC(p.anio, p.mes - 1, p.dia)).getUTCDay() + 6) % 7;
}

// Encabezado de un día: "Hoy · 7 de noviembre de 2026", "Ayer · …" o solo la fecha larga.
export function rotuloDia(ymd, hoy = hoyLocal()) {
  const larga = fechaLarga(ymd);
  if (!larga) return 'Sin fecha';
  if (ymd === hoy) return `Hoy · ${larga}`;
  if (ymd === sumarDias(hoy, -1)) return `Ayer · ${larga}`;
  return larga;
}

// Fecha y hora para detalle: "7 de noviembre de 2026, 12:44 p. m."
export function fechaHoraLarga(ts) {
  const dia = diaLocal(ts);
  if (!dia) return '';
  return `${fechaLarga(dia)}, ${horaLocal(ts)}`;
}

// "20,4 %" (coma decimal, espacio duro antes del %). Sin número -> "—".
function aNumero(v) {
  if (v == null || v === '') return NaN;
  return typeof v === 'string' ? parseFloat(v) : Number(v);
}

export function formatoPct(v, decimales = 1) {
  const n = aNumero(v);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(decimales).replace('.', ',')}${NBSP}%`;
}

// Para cifras en fuente monoespaciada: sin el espacio antes del % (en mono ocuparía una celda entera).
export function formatoPctMono(v, decimales = 1) {
  const n = aNumero(v);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(decimales).replace('.', ',')}%`;
}

// Para fichas pequeñas: sin decimales salvo por debajo de 1 (para no mostrar "0 %" en 0,4).
export function pctCorto(v) {
  const n = aNumero(v);
  if (!Number.isFinite(n)) return '—';
  return formatoPct(n, n > 0 && n < 1 ? 1 : 0);
}

export function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`;
}

// "1 de noviembre, 2:54 p. m." (con año solo si no es el del día de hoy): para barras de título.
export function fechaHoraCorta(ts, hoy = hoyLocal()) {
  const dia = diaLocal(ts);
  if (!dia) return '';
  const mismoAnio = dia.slice(0, 4) === String(hoy).slice(0, 4);
  return `${mismoAnio ? fechaMedia(dia) : fechaLarga(dia)}, ${horaLocal(ts)}`;
}
