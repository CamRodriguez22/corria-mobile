// src/miniaturas.js — Vigencia de las URL de foto y envoltorio de caché. Sin React Native.
//
// Las URL url_thumbnail / url_imagen del backend son prefirmadas y VENCEN a la hora (1 h).
// Cada medición cargada del servidor se marca con `_urlTs` (instante de la carga). Una URL
// vencida no se pinta (daría 403): se muestra el marcador de posición hasta recargar.
export const VIDA_URL_MS = 60 * 60 * 1000;
const MARGEN_MS = 5 * 60 * 1000; // se descarta 5 min antes de que venza de verdad
export const REFRESCO_MS = 45 * 60 * 1000; // al volver a la app, recargar si la lista tiene más de esto

// Foto local (recién tomada en este teléfono): no vence.
const esLocal = (m) => Boolean(m?._localUri);

export function urlVigente(m, ahora = Date.now()) {
  if (!m) return false;
  if (esLocal(m)) return true;
  if (!Number.isFinite(m._urlTs)) return false; // sin sello (caché antigua): se asume vencida
  return ahora - m._urlTs < VIDA_URL_MS - MARGEN_MS;
}

// URI para la miniatura de una medición o null (sin URL, o con la URL vencida).
export function miniaturaDe(m, ahora = Date.now()) {
  if (!m) return null;
  if (esLocal(m)) return m._localUri;
  if (!urlVigente(m, ahora)) return null;
  return m.url_thumbnail || m.url_imagen || null;
}

// Foto grande (detalle): igual que la miniatura pero prefiere la imagen completa.
export function imagenDe(m, ahora = Date.now()) {
  if (!m) return null;
  if (esLocal(m)) return m._localUri;
  if (!urlVigente(m, ahora)) return null;
  return m.url_imagen || m.url_thumbnail || null;
}

// Marca las mediciones recién traídas del servidor con el instante de carga.
export function marcarCarga(lista = [], ahora = Date.now()) {
  return lista.map((m) => ({ ...m, _urlTs: ahora }));
}

// Quita las URL vencidas de una lista (p. ej. la leída de la caché al abrir la app).
export function limpiarVencidas(lista = [], ahora = Date.now()) {
  return lista.map((m) => {
    if (urlVigente(m, ahora)) return m;
    const { url_thumbnail, url_imagen, ...resto } = m;
    return resto;
  });
}

// ¿Conviene recargar al volver a la app? Sí si alguna foto con URL ya pasó el umbral.
export function necesitaRefresco(lista = [], ahora = Date.now()) {
  return lista.some((m) => !esLocal(m) && (m.url_thumbnail || m.url_imagen) && !(ahora - m._urlTs < REFRESCO_MS));
}

// ───────── Caché por usuario (perfil y puntos para el modo sin conexión) ─────────
// Se guarda { sub, guardadoEn, datos }. Al cerrar sesión clearLocalData borra todo lo `pixelrust_*`.
export function envolverCache(sub, datos, ahora = Date.now()) {
  return { sub: sub || null, guardadoEn: ahora, datos };
}

// Devuelve los datos solo si la caché es de ese usuario (o si aún no se conoce el usuario y la
// caché tampoco lo trae). Con `sub` distinto -> null: nunca mezclar cuentas.
export function leerCache(envoltorio, sub = null) {
  if (!envoltorio || typeof envoltorio !== 'object' || !('datos' in envoltorio)) return null;
  if (sub && envoltorio.sub && envoltorio.sub !== sub) return null;
  return envoltorio.datos ?? null;
}
