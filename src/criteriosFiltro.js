// src/criteriosFiltro.js — Piezas puras del filtro común de fotos (búsqueda por nombre, fechas). Sin React Native.
// El filtro completo vive en linea.js (`filtrarMediciones`); aquí están el texto y el rango personalizado.
import { partesDia } from './fechas.js';

// Minúsculas, sin tildes ni espacios repetidos: "  Unión   SOLDADA " -> "union soldada".
export function normalizarTexto(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Todas las palabras de `texto` deben aparecer (en cualquier orden) en alguno de los `campos`.
// Texto vacío = coincide siempre. Los campos nulos se ignoran.
export function coincideTexto(texto, campos = []) {
  const palabras = normalizarTexto(texto).split(' ').filter(Boolean);
  if (!palabras.length) return true;
  const pajar = campos.map(normalizarTexto).filter(Boolean).join(' | ');
  return palabras.every((p) => pajar.includes(p));
}

// Campos de nombre que puede traer una foto: la foto, su lote y su punto.
export function camposNombre(m = {}) {
  return [m.nombre, m.lote_nombre, m.bloque_nombre, m.punto_nombre];
}

// "2026-11-07" válido (existe en el calendario).
export function fechaValida(ymd) {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const p = partesDia(ymd);
  if (!p) return false;
  const d = new Date(Date.UTC(p.anio, p.mes - 1, p.dia));
  return d.getUTCFullYear() === p.anio && d.getUTCMonth() === p.mes - 1 && d.getUTCDate() === p.dia;
}

// Rango elegido a mano. Una fecha inválida o vacía se ignora (sin límite en ese extremo); si quedan
// al revés se intercambian. Devuelve {} si no hay ninguna fecha válida.
export function rangoPersonalizado(desde, hasta) {
  let d = fechaValida(String(desde || '').trim()) ? String(desde).trim() : null;
  let h = fechaValida(String(hasta || '').trim()) ? String(hasta).trim() : null;
  if (d && h && d > h) [d, h] = [h, d];
  const r = {};
  if (d) r.desde = d;
  if (h) r.hasta = h;
  return r;
}
