// src/paleta.js — Colores base y de nivel, sin React Native (los usan DesignTokens y las pruebas de contraste).
//
// Niveles: el relleno es EXACTAMENTE el de la web (COLORES_NIVEL en frontend/src/lib/statusUtils.js):
//   verde #16a34a · ámbar #f59e0b (Leve) · naranja #ea580c (Moderada) · rojo #dc2626 (Severa).
// Esos rellenos no llegan a 4,5:1 como TEXTO sobre el fondo crema de la app (la web usa fondo azul claro y
// sus variantes `--nivel-N-texto` tampoco llegan sobre crema), así que cada nivel tiene una variante
// oscura `texto` que SÍ llega (>= 4,5:1 sobre las tres superficies y sobre su propio tinte).
// Los rellenos solo se usan con un ícono o con texto de tinta encima, nunca como texto solo.

export const SUPERFICIES = {
  bg: '#f5ead8', // fondo cálido de pantalla
  surface: '#ebddc5', // un paso más oscuro
  surfaceAlt: '#fffcf7', // tarjetas: casi blancas, destacan sobre el fondo cálido
};

export const TINTA = '#201e1d';

export const COLORES_NIVEL = ['#16a34a', '#f59e0b', '#ea580c', '#dc2626'];
export const COLORES_TEXTO_NIVEL = ['#166534', '#92400e', '#9a3412', '#a51a1a'];

// Texto/ícono SOBRE el relleno del nivel (>= 4,5:1): tinta sobre verde, ámbar y naranja; blanco sobre rojo.
export const COLORES_SOBRE_NIVEL = [TINTA, TINTA, TINTA, '#ffffff'];

// Tinte translúcido (fondo de insignias): el relleno del nivel al 14 %.
export function tinteNivel(i) {
  const h = COLORES_NIVEL[i];
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.14)`;
}

// ───────────── Contraste WCAG ─────────────
function canal(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function rgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function luminancia(hex) {
  const [r, g, b] = rgb(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}
export function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
// Color `hex` al `alfa` sobre `fondo` (composición normal), en hex.
export function componer(hex, alfa, fondo) {
  const f = rgb(hex);
  const b = rgb(fondo);
  const c = f.map((v, i) => Math.round(v * alfa + b[i] * (1 - alfa)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
