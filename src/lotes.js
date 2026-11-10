// src/lotes.js — Reglas puras de la pestaña Lotes (sin React Native).

export const AVISO_LOTE_CARGANDO = 'Cargando todas las fotos del lote… Podrás renombrarlo cuando termine.';
export const AVISO_LOTE_ERROR = 'No se pudo cargar todo el historial, así que el lote puede verse incompleto y no se puede renombrar todavía.';

// Renombrar un lote cambia el nombre solo de las fotos que la app conoce: con el historial a medias el lote
// quedaría partido en dos nombres. Solo se permite con el historial completo ('ok').
// `historialEstado`: 'idle' | 'cargando' | 'ok' | 'error'. `aviso` se muestra dentro del detalle del lote.
export function estadoRenombrarLote({ historialEstado = 'ok', puedeGestionar = true } = {}) {
  if (historialEstado === 'ok') return { permitido: Boolean(puedeGestionar), aviso: '', reintentar: false };
  if (historialEstado === 'error') return { permitido: false, aviso: AVISO_LOTE_ERROR, reintentar: true };
  return { permitido: false, aviso: AVISO_LOTE_CARGANDO, reintentar: false };
}
