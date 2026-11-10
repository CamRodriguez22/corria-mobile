// src/demo/flag.js — Modo demo SOLO PARA DESARROLLO (datos sintéticos, sin red).
// Se activa con EXPO_PUBLIC_DEMO=1 (npm run demo). Sin la variable, nada de src/demo/
// se carga: los puntos de entrada (App.js, src/api.js, src/utils.js) usan
// `process.env.EXPO_PUBLIC_DEMO === '1'` literal para que Metro elimine esas ramas.
export const IMG_BASE = (process.env.EXPO_PUBLIC_DEMO_IMG_BASE || 'http://localhost:3006').replace(/\/+$/, '');

// Parámetros de URL que fuerzan estados en la web demo (para capturas):
//   ?offline=1 -> toda llamada de lectura falla (banner sin conexión, historial desde caché)
//   ?vacio=1   -> el servidor responde sin mediciones (estados vacíos)
export function paramDemo(nombre) {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    return new URLSearchParams(window.location.search).get(nombre);
  } catch {
    return null;
  }
}
