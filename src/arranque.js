// src/arranque.js — Cuándo la app deja la pantalla de arranque. Sin React Native.
// Espera la sesión y las fuentes, pero nunca más de TIEMPO_ARRANQUE_MS: si algo se cuelga (red lenta, fuentes que
// no terminan de cargar) se sigue con lo que haya (fuente del sistema, pantalla de inicio de sesión).
export const TIEMPO_ARRANQUE_MS = 8000;

export function arranqueListo({ booting = true, fuentesListas = false, errorFuentes = false, esperaAgotada = false } = {}) {
  if (esperaAgotada) return true;
  return !booting && Boolean(fuentesListas || errorFuentes);
}

// ¿Usar las fuentes personalizadas? Solo si de verdad cargaron (sin error).
export function fuentesCargadas({ fuentesListas = false, errorFuentes = false } = {}) {
  return Boolean(fuentesListas) && !errorFuentes;
}
