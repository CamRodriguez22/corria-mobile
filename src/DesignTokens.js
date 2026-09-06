// DesignTokens.js — Sistema de diseño "Organic" traducido a React Native.
// Base: _ds/organic-33a52a4e-dd64-41a7-8990-ae2bbb2371cc/styles.css (mockup PIXELRUST v2)

import { StyleSheet } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────
export const TOKENS = {
  colors: {
    bg: '#f5ead8', // fondo crema
    surface: '#ebddc5', // superficie un paso más oscura
    surfaceAlt: '#f9f4ed', // tarjetas claras (neutral-100 del mockup)
    text: '#201e1d', // marrón muy oscuro
    textOnAccent: '#ffffff',
    accent: '#c67139', // terracota (marca)
    accent2: '#7a8a5e', // sage
    divider: 'rgba(32,30,29,0.16)',

    // Neutrales cálidos
    neutral100: '#f9f4ed',
    neutral200: '#eee7db',
    neutral300: '#dcd3c4',
    neutral400: '#c0b6a5',
    neutral500: '#a19786',
    neutral600: '#82796a',
    neutral700: '#645c50',
    neutral800: '#474238',
    neutral900: '#2e2b25',

    // Rampa terracota
    accent100: '#fff2eb',
    accent200: '#ffe1d0',
    accent300: '#ffc6a5',
    accent400: '#f6a06b',
    accent500: '#d67f48',
    accent600: '#b2622d',
    accent700: '#8c491a',
    accent800: '#643312',
    accent900: '#402310',

    // Rampa sage
    accent2_100: '#f0fae1',
    accent2_200: '#e1eecc',
    accent2_300: '#ccdbb2',
    accent2_400: '#aebf92',
    accent2_500: '#8fa073',
    accent2_600: '#728157',
    accent2_700: '#56633f',
    accent2_800: '#3d472b',
    accent2_900: '#272e1b',

    // Semánticos
    success: '#5f6d47',
    successTint: 'rgba(122,138,94,0.16)',
    warning: '#c25f2a',
    warningTint: 'rgba(194,95,42,0.14)',
    danger: '#8c3524',
    dangerTint: 'rgba(140,53,36,0.14)',
    critical: '#6e2a1e',
    criticalTint: 'rgba(110,42,30,0.16)',
  },

  // Logo PIXELRUST: degradado de óxido (grid 3x4 en el mockup)
  logo: ['#e8873c', '#d9762f', '#c25f2a', '#a8452a', '#8c3524', '#6e2a1e'],

  spacing: { xs: 4, sm: 9, md: 13, base: 18, lg: 26, xl: 35, xxl: 48 },

  radius: { sm: 8, md: 16, lg: 28, pill: 999 },

  fonts: { heading: 'System', body: 'System' },

  // Escala accesible: cuerpo 16, mínimos legibles, jerarquía clara.
  fontSizes: {
    display: 40,
    h1: 32,
    h2: 29,
    h3: 22,
    h4: 18,
    h5: 16,
    h6: 13,
    body: 16,
    small: 13,
    xs: 11.5,
  },

  lineHeights: { heading: 1.12, body: 1.5 },

  // Objetivo mínimo táctil recomendado (accesibilidad).
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  tapTarget: 48,

  shadow: {
    sm: {
      shadowColor: '#2e2b25',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#2e2b25',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 3,
    },
    lg: {
      shadowColor: '#2e2b25',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};

// ─────────────────────────────────────────────────────────────
// Severidad de corrosión
// El backend devuelve nivel_corrosion como NÚMERO: 0=ninguna 1=leve 2=moderada 3=severa (4=crítica).
// area_corroida_pct y confianza_promedio llegan como string en los GET y como number en el POST.
// ─────────────────────────────────────────────────────────────
export const NIVELES = [
  { i: 0, label: 'Sin corrosión', short: 'NINGUNA', color: TOKENS.colors.success, tint: TOKENS.colors.successTint },
  { i: 1, label: 'Leve', short: 'LEVE', color: TOKENS.colors.success, tint: TOKENS.colors.successTint },
  { i: 2, label: 'Moderada', short: 'MODERADA', color: TOKENS.colors.warning, tint: TOKENS.colors.warningTint },
  { i: 3, label: 'Severa', short: 'SEVERA', color: TOKENS.colors.danger, tint: TOKENS.colors.dangerTint },
  { i: 4, label: 'Crítica', short: 'CRÍTICA', color: TOKENS.colors.critical, tint: TOKENS.colors.criticalTint },
];

export function num(v, fallback = 0) {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Metadatos de severidad a partir del nivel numérico del backend.
export function nivelMeta(nivelCorrosion) {
  const i = Math.max(0, Math.min(4, Math.round(num(nivelCorrosion, 0))));
  return NIVELES[i];
}

// Fallback cuando no hay nivel: derivar de % de área (bandas del mockup).
export function severidadDePct(pct) {
  const p = num(pct, 0);
  if (p >= 40) return NIVELES[3];
  if (p >= 20) return NIVELES[2];
  if (p > 0) return NIVELES[1];
  return NIVELES[0];
}

// Severidad "efectiva": usa el nivel del backend, cae al % si el nivel no viene.
export function severidad(medicion = {}) {
  if (medicion.nivel_corrosion != null && medicion.nivel_corrosion !== '') {
    return nivelMeta(medicion.nivel_corrosion);
  }
  return severidadDePct(medicion.area_corroida_pct);
}

// Confianza del modelo: el backend la da en 0..1 -> % entero.
export function confianzaPct(v) {
  const n = num(v, 0);
  return Math.round((n <= 1 ? n * 100 : n));
}

export const colorUtils = {
  corrosionColor: (pct) => severidadDePct(pct).color,
  confidenceColor: (c) => {
    const n = num(c, 0);
    const p = n <= 1 ? n : n / 100;
    if (p >= 0.75) return TOKENS.colors.accent2_600;
    if (p >= 0.5) return TOKENS.colors.accent500;
    return TOKENS.colors.danger;
  },
};

// ─────────────────────────────────────────────────────────────
// Estilos reutilizables
// ─────────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.bg },
  containerPadded: {
    flex: 1,
    backgroundColor: TOKENS.colors.bg,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.lg,
  },

  display: {
    fontSize: TOKENS.fontSizes.display,
    fontWeight: '800',
    color: TOKENS.colors.text,
    lineHeight: TOKENS.fontSizes.display * TOKENS.lineHeights.heading,
  },
  h1: {
    fontSize: TOKENS.fontSizes.h1,
    fontWeight: '800',
    color: TOKENS.colors.text,
    lineHeight: TOKENS.fontSizes.h1 * TOKENS.lineHeights.heading,
  },
  h2: {
    fontSize: TOKENS.fontSizes.h2,
    fontWeight: '700',
    color: TOKENS.colors.text,
    lineHeight: TOKENS.fontSizes.h2 * TOKENS.lineHeights.heading,
  },
  h3: {
    fontSize: TOKENS.fontSizes.h3,
    fontWeight: '700',
    color: TOKENS.colors.text,
    lineHeight: TOKENS.fontSizes.h3 * TOKENS.lineHeights.heading,
  },
  h4: {
    fontSize: TOKENS.fontSizes.h4,
    fontWeight: '600',
    color: TOKENS.colors.text,
    lineHeight: TOKENS.fontSizes.h4 * TOKENS.lineHeights.heading,
  },
  bodyText: {
    fontSize: TOKENS.fontSizes.body,
    color: TOKENS.colors.text,
    lineHeight: TOKENS.fontSizes.body * TOKENS.lineHeights.body,
  },
  smallText: {
    fontSize: TOKENS.fontSizes.small,
    color: TOKENS.colors.neutral700,
    lineHeight: TOKENS.fontSizes.small * TOKENS.lineHeights.body,
  },
  label: {
    fontSize: TOKENS.fontSizes.small,
    fontWeight: '600',
    color: TOKENS.colors.neutral700,
    marginBottom: 6,
    paddingLeft: 2,
  },
  eyebrow: {
    fontSize: TOKENS.fontSizes.h6,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: TOKENS.colors.neutral600,
  },

  card: {
    backgroundColor: TOKENS.colors.surfaceAlt,
    borderRadius: TOKENS.radius.lg,
    padding: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.base,
    ...TOKENS.shadow.sm,
  },

  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: TOKENS.colors.neutral300,
    borderRadius: TOKENS.radius.md,
    paddingHorizontal: TOKENS.spacing.base,
    paddingVertical: 13,
    fontSize: TOKENS.fontSizes.body,
    color: TOKENS.colors.text,
  },
  inputFocused: { borderColor: TOKENS.colors.accent },

  divider: {
    height: 1,
    backgroundColor: TOKENS.colors.divider,
    marginVertical: TOKENS.spacing.base,
  },

  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export default styles;
