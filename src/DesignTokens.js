// DesignTokens.js — Sistema de diseño "Organic" traducido a React Native.
// Base: _ds/organic-33a52a4e-dd64-41a7-8990-ae2bbb2371cc/styles.css (mockup PIXELRUST v2)

import { StyleSheet } from 'react-native';
import { num, nivelDePct, nivelDeMedicion, NOMBRES_NIVEL } from './niveles';
import { SUPERFICIES, TINTA, COLORES_NIVEL, COLORES_TEXTO_NIVEL, tinteNivel } from './paleta';

// ─────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────
export const TOKENS = {
  colors: {
    bg: SUPERFICIES.bg, // fondo crema cálido
    surface: SUPERFICIES.surface, // superficie un paso más oscura
    surfaceAlt: SUPERFICIES.surfaceAlt, // tarjetas casi blancas: destacan sobre el fondo
    text: TINTA, // marrón muy oscuro
    textOnAccent: '#ffffff',
    accent: '#C1460B', // terracota de marca (= --accent-amber de la web): fondos con texto blanco (5.06:1)
    accentText: '#9a4a1e', // acento como TEXTO sobre bg/surface/surfaceAlt (≥ 4.65:1)
    divider: 'rgba(32,30,29,0.16)',
    border: '#e3d8c6', // borde sutil de tarjetas y campos

    // Neutrales cálidos ajustados para garantizar contraste WCAG AA (≥ 4.5:1)
    neutral100: '#f9f4ed',
    neutral200: '#eee7db',
    neutral300: '#dcd3c4',
    neutral400: '#a39783',
    neutral500: '#665e53', // 4.76:1 sobre surface, 5.36:1 sobre bg, 5.83:1 sobre surfaceAlt
    neutral600: '#5c5449',
    neutral700: '#4a443a',
    neutral800: '#38332c',
    neutral900: '#23201b',

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

    // Rampa piedra (gris cálido): estados seleccionados, botones tonales y controles neutros.
    // Antes era un verde salvia que chocaba con "Sin corrosión"; el verde queda solo para ese nivel.
    piedra_100: '#f1ece3',
    piedra_200: '#e6ded0',
    piedra_300: '#d6ccba',
    piedra_400: '#b3a893',
    piedra_500: '#8c8270',
    piedra_600: '#6c6354',
    piedra_700: '#4f483c',
    piedra_800: '#383229',
    piedra_900: '#221e18',

    // Semánticos
    success: COLORES_TEXTO_NIVEL[0],
    successTint: tinteNivel(0),
    warning: '#c25f2a', // solo rellenos/íconos (3.55:1 como texto)
    warningText: '#9a4516', // advertencia como TEXTO (≥ 4.84:1 sobre bg/surface/surfaceAlt)
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

  // Outfit para la interfaz e IBM Plex Mono para cifras (igual que la web: --font-ui / --font-data).
  // El componente Text (src/Typography.js) elige la variante según fontWeight; 'mono' = IBM Plex Mono.
  fonts: { ui: 'Outfit', mono: 'mono' },

  // Escala accesible: cuerpo 16, mínimos legibles (≥14pt), jerarquía clara.
  fontSizes: {
    display: 40,
    h1: 32,
    h2: 29,
    h3: 22,
    h4: 18,
    h5: 16,
    h6: 14,
    body: 16,
    small: 14,
    xs: 12,
    tiny: 12, // mínimo absoluto, solo metadatos
  },

  lineHeights: { heading: 1.12, body: 1.5 },

  // Escala tipográfica de Material 3 (sp = dp en RN; sigue el tamaño de fuente del sistema).
  // Mínimo 14 salvo metadatos (labelSmall).
  type: {
    headlineMedium: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
    headlineSmall: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
    titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
    titleMedium: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
    titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
    bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
    bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
    labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
    labelSmall: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  },

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
// El backend devuelve nivel_corrosion como NÚMERO: 0=ninguna 1=leve 2=moderada 3=severa.
// `color` = relleno/punto (el de la web, src/paleta.js); `texto` = variante oscura para usar COMO TEXTO
// (>= 4,5:1 sobre bg, surface, surfaceAlt y el tinte; lo verifica test/paleta.test.mjs).
// area_corroida_pct y confianza_promedio llegan como string en los GET y como number en el POST.
// ─────────────────────────────────────────────────────────────
export const NIVELES = [0, 1, 2, 3].map((i) => ({
  i,
  label: NOMBRES_NIVEL[i],
  color: COLORES_NIVEL[i],
  texto: COLORES_TEXTO_NIVEL[i],
  tint: tinteNivel(i),
}));

export { num };

// Metadatos de severidad a partir del nivel numérico del backend.
export function nivelMeta(nivelCorrosion) {
  const i = Math.max(0, Math.min(3, Math.round(num(nivelCorrosion, 0))));
  return NIVELES[i];
}

// Fallback exacto a la función _calcular_nivel de inference/handler.py (10% y 25%).
export function severidadDePct(pct) {
  return NIVELES[nivelDePct(pct)];
}

// Severidad "efectiva": usa el nivel del backend, cae al % si el nivel no viene.
export function severidad(medicion = {}) {
  return NIVELES[nivelDeMedicion(medicion)];
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
    if (p >= 0.75) return TOKENS.colors.success;
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
