// src/historialPunto.js — Estados del historial de un punto ({ lista, hayMas, estado, error }). Sin React Native.
// `hayMas` es "¿faltan fotos del punto por cargar?". Mientras no se haya demostrado lo contrario con una respuesta
// exitosa, se asume que sí (true): una primera carga en curso o fallida NO prueba que las fotos cargadas sean todas.

// Empieza una carga (primera o "cargar más"). Conserva lo que ya hubiera.
export function historialCargando(previo, mas = false) {
  return { lista: previo?.lista || [], hayMas: previo?.hayMas ?? true, estado: mas ? 'mas' : 'cargando', error: '' };
}

// La carga terminó bien: `hayMas` viene de la respuesta del servidor.
export function historialOk(lista, hayMas) {
  return { lista, hayMas: Boolean(hayMas), estado: 'ok', error: '' };
}

// La carga falló: se conserva lo ya cargado y el último `hayMas` conocido (true si nunca se supo).
export function historialError(previo, error) {
  return { lista: previo?.lista || [], hayMas: previo?.hayMas ?? true, estado: 'error', error: error || 'No se pudo cargar el historial del punto.' };
}

// ¿Las fotos cargadas pueden ser solo una parte? (sin historial, cargando o con error sin éxito previo: sí)
export function hayMasPorCargar(historial) {
  return !historial || historial.hayMas !== false;
}
