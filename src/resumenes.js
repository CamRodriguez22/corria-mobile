// src/resumenes.js — Claves y vigencia de los resúmenes por día (GET /mediciones/resumen-diario). Sin React Native.
// App guarda cada resumen bajo "<id_punto>|<año>" (de un punto) o "<año>" (global de la empresa).

// "P1|2026" -> { idPunto: 'P1', anio: 2026 }; "2026" -> { idPunto: null, anio: 2026 }; otra cosa -> null.
export function parsearClaveResumen(clave) {
  const t = String(clave);
  const i = t.lastIndexOf('|');
  const anio = Number(i === -1 ? t : t.slice(i + 1));
  if (!Number.isInteger(anio)) return null;
  return { idPunto: i === -1 ? null : t.slice(0, i), anio };
}

// Resúmenes que cambian cuando se sube o se borra una foto del punto `idPunto`: los globales y los de ese punto.
// Los de otros puntos siguen valiendo. Solo se recargan los que ya estaban cargados (los demás se piden al abrirlos).
export function resumenesAfectados(claves = [], idPunto) {
  return claves
    .map((c) => parsearClaveResumen(c))
    .filter(Boolean)
    .filter((r) => r.idPunto === null || r.idPunto === idPunto);
}

// Cada petición de un resumen recibe un número; solo vale la respuesta de la ÚLTIMA petición de esa clave
// (una respuesta lenta anterior a una recarga no puede devolver datos viejos).
export function nuevoToken(tokens, clave) {
  tokens[clave] = (tokens[clave] || 0) + 1;
  return tokens[clave];
}

export function tokenVigente(tokens, clave, token) {
  return tokens[clave] === token;
}

// Descarta todas las respuestas en vuelo (p. ej. al refrescar todo o cerrar sesión): ninguna será vigente.
export function invalidarTokens(tokens) {
  for (const k of Object.keys(tokens)) tokens[k] += 1;
}
