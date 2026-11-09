// src/subida.js — Lógica pura del flujo "Subir medición" (sin React Native).

// Tamaño mínimo para analizar una foto. Solo se usa para validar: el usuario nunca ve estas cifras.
export const ANCHO_MINIMO = 640;
export const ALTO_MINIMO = 480;

export const MENSAJE_FOTO_PEQUENA = 'La foto es muy pequeña para analizarla. Tómala más cerca o con mejor calidad.';
export const MENSAJE_FOTOS_PEQUENAS = 'Las fotos son muy pequeñas para analizarlas. Tómalas más cerca o con mejor calidad.';

// '' si la foto sirve; si no, el mensaje (sin píxeles) para el usuario.
export function validarFoto(foto) {
  if (!foto?.uri) return 'No se recibió ninguna foto.';
  if (foto.width && foto.height && (foto.width < ANCHO_MINIMO || foto.height < ALTO_MINIMO)) return MENSAJE_FOTO_PEQUENA;
  return '';
}
