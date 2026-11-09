// src/detalle.js — Decisiones puras del detalle de una foto (sin React Native).

// Una foto de la lista (modo resumen) o recién subida NO trae las máscaras: el detalle completo se pide aparte
// (GET /mediciones/{id_punto}?id_medicion=). Se decide por lo que realmente hace falta (mascaras / contorno_placa),
// no por `detecciones` (una foto recién subida trae `detecciones` pero no `mascaras`).
export function necesitaDetalleCompleto(m) {
  if (!m || !m.id_punto || !m.id_medicion) return false;
  if (m._detalleCompleto === true) return false;
  return !Array.isArray(m.mascaras);
}

// Une el detalle completo del servidor con lo que ya mostraba la pantalla.
//   prev     lo que muestra ahora el detalle · abierta  lo que se mostraba al abrirlo (antes de la respuesta)
//   completa respuesta del servidor · ahora  instante de la respuesta (sello de las URL firmadas)
// Gana lo remoto (incluidas url_imagen / url_thumbnail y un _urlTs nuevo, para que una URL vieja no pise la fresca).
// Solo se conserva lo propio del teléfono: _localUri y un nombre cambiado mientras llegaba la respuesta.
export function fusionarDetalle({ prev, abierta, completa, ahora = Date.now() }) {
  const salida = { ...prev, ...completa, _urlTs: ahora, _detalleCompleto: true };
  if (prev?._localUri) salida._localUri = prev._localUri;
  if (prev && abierta && prev.nombre !== abierta.nombre) salida.nombre = prev.nombre;
  return salida;
}

// Cambia el detalle abierto solo si sigue siendo la misma foto (una respuesta tardía no pisa otra pantalla).
// `cambio` es un objeto a mezclar, una función (prev) => nuevo o null para cerrar el detalle.
export function actualizarDetalleSiEs(prev, id, cambio) {
  if (!prev || prev.id_medicion !== id) return prev;
  if (cambio === null) return null;
  return typeof cambio === 'function' ? cambio(prev) : { ...prev, ...cambio };
}

// ¿El detalle abierto es de la foto `id`?
export function esDetalleDe(detalle, id) {
  return Boolean(detalle) && detalle.id_medicion === id;
}

// El detalle solo existe mientras la pantalla es 'detail': al salir (atrás, nueva medición, otra pestaña) se descarta,
// para que una respuesta tardía (p. ej. el éxito de un borrado) no crea que la foto sigue abierta.
export function detalleTrasCambiarPantalla(screen, detalle) {
  return screen === 'detail' ? detalle : null;
}

// Tras borrar la foto `id` con éxito: la lista siempre se actualiza (lo hace quien llama), pero solo se navega si el
// usuario SIGUE en el detalle de esa misma foto. Si ya está en otra pantalla, no se le mueve.
export function destinoTrasBorrar({ screen, detalle, id, folderClave = null, tab = 'home' } = {}) {
  if (screen === 'detail' && esDetalleDe(detalle, id)) return { navegar: true, destino: folderClave ? 'folder' : tab };
  return { navegar: false, destino: null };
}
