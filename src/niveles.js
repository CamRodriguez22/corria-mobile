// src/niveles.js — ÚNICA fuente de los umbrales de severidad y de `num`. Sin dependencias de
// React Native para que node:test lo cargue. La app usa severidadDePct (DesignTokens), que
// delega aquí, así que las pruebas de nivelDePct cubren lo que la app muestra.
//
// Espejo de _calcular_nivel en pf_corrosion_infra/lambda_src/inference/handler.py:
//   0 Sin corrosión (< 0,05 %) · 1 Leve (< 10 %) · 2 Moderada (10 % a < 25 %) · 3 Severa (>= 25 %)
export const UMBRAL_LEVE = 0.05;
export const UMBRAL_MODERADA = 10;
export const UMBRAL_SEVERA = 25;

// Número desde string (los GET devuelven el % como string) o number; si no es finito, `fallback`.
export function num(v, fallback = 0) {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Nivel 0..3 a partir del % de área corroída.
export function nivelDePct(pct) {
  const p = num(pct, 0);
  if (p < UMBRAL_LEVE) return 0;
  if (p < UMBRAL_MODERADA) return 1;
  if (p < UMBRAL_SEVERA) return 2;
  return 3;
}
