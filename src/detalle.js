// src/detalle.js — Decisiones puras del detalle de una foto (sin React Native).

// Una foto de la lista (modo resumen) o recién subida NO trae las máscaras: el detalle completo se pide aparte
// (GET /mediciones/{id_punto}?id_medicion=). Se decide por lo que realmente hace falta (mascaras / contorno_placa),
// no por `detecciones` (una foto recién subida trae `detecciones` pero no `mascaras`).
export function necesitaDetalleCompleto(m) {
  if (!m || !m.id_punto || !m.id_medicion) return false;
  if (m._detalleCompleto === true) return false;
  return !Array.isArray(m.mascaras);
}
