// DesignTokens.js — Estilos React Native basados en el design system Organic
// Traducción de: _ds/organic-33a52a4e-dd64-41a7-8990-ae2bbb2371cc/styles.css

import { StyleSheet } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Tokens de diseño (colores, espacios, tipografía)
// ─────────────────────────────────────────────────────────────
export const TOKENS = {
  // Colores base
  colors: {
    bg: '#f5ead8',           // Fondo cream/sand
    surface: '#ebddc5',      // Superficie un paso más oscura
    text: '#201e1d',         // Texto: marrón oscuro
    accent: '#c67139',       // Accent 1: terracota
    accent2: '#7a8a5e',      // Accent 2: sage
    divider: 'rgba(32,30,29,0.16)',

    // Rampas neutrales (grises cálidos)
    neutral100: '#f9f4ed',
    neutral200: '#eee7db',
    neutral300: '#dcd3c4',
    neutral400: '#c0b6a5',
    neutral500: '#a19786',
    neutral600: '#82796a',
    neutral700: '#645c50',
    neutral800: '#474238',
    neutral900: '#2e2b25',

    // Rampas accent (terracota)
    accent100: '#fff2eb',
    accent200: '#ffe1d0',
    accent300: '#ffc6a5',
    accent400: '#f6a06b',
    accent500: '#d67f48',
    accent600: '#b2622d',
    accent700: '#8c491a',
    accent800: '#643312',
    accent900: '#402310',

    // Rampas accent-2 (sage)
    accent2_100: '#f0fae1',
    accent2_200: '#e1eecc',
    accent2_300: '#ccdbb2',
    accent2_400: '#aebf92',
    accent2_500: '#8fa073',
    accent2_600: '#728157',
    accent2_700: '#56633f',
    accent2_800: '#3d472b',
    accent2_900: '#272e1b',
  },

  // Espaciado (em unidades, convertidas a números para RN)
  spacing: {
    xs: 4,      // --space-1: 4.4px
    sm: 9,      // --space-2: 8.8px
    md: 13,     // --space-3: 13.2px
    base: 18,   // --space-4: 17.6px
    lg: 26,     // --space-6: 26.4px
    xl: 35,     // --space-8: 35.2px
  },

  // Bordes redondeados
  radius: {
    sm: 8,      // --radius-sm
    md: 16,     // --radius-md
    lg: 28,     // --radius-lg
  },

  // Tipografía
  fonts: {
    heading: 'System', // Caprasimo no está disponible en RN, usar System serif
    body: 'System',     // Figtree no disponible, usar System sans
  },

  // Tamaños de fuente
  fontSizes: {
    h1: 42,
    h2: 32,
    h3: 25,
    h4: 20,
    h5: 16,
    h6: 13,
    body: 15,
    small: 13,
    xs: 11,
  },

  // Altura de línea
  lineHeights: {
    heading: 1.12,
    body: 1.55,
  },
};

// ─────────────────────────────────────────────────────────────
// Estilos React Native reutilizables
// ─────────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  // Layout base
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.bg,
  },
  containerPadded: {
    flex: 1,
    backgroundColor: TOKENS.colors.bg,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.lg,
  },

  // Tipografía
  h1: {
    fontSize: TOKENS.fontSizes.h1,
    fontWeight: 'bold',
    color: TOKENS.colors.text,
    lineHeight: TOKENS.fontSizes.h1 * TOKENS.lineHeights.heading,
  },
  h2: {
    fontSize: TOKENS.fontSizes.h2,
    fontWeight: 'bold',
    color: TOKENS.colors.text,
    lineHeight: TOKENS.fontSizes.h2 * TOKENS.lineHeights.heading,
  },
  h3: {
    fontSize: TOKENS.fontSizes.h3,
    fontWeight: '600',
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
    color: TOKENS.colors.text,
    lineHeight: TOKENS.fontSizes.small * TOKENS.lineHeights.body,
  },

  // Botones
  buttonPrimary: {
    backgroundColor: TOKENS.colors.accent,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.base,
    borderRadius: 999, // Pill shape
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: TOKENS.fontSizes.body,
  },
  buttonSecondary: {
    backgroundColor: TOKENS.colors.accent2,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.base,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: TOKENS.fontSizes.body,
  },
  buttonGhost: {
    borderWidth: 2,
    borderColor: TOKENS.colors.accent,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.base,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhostText: {
    color: TOKENS.colors.accent,
    fontWeight: '600',
    fontSize: TOKENS.fontSizes.body,
  },

  // Tarjetas
  card: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    padding: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.base,
    shadowColor: '#2e2b25',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3, // Android shadow
  },
  cardTitle: {
    fontSize: TOKENS.fontSizes.h4,
    fontWeight: '600',
    color: TOKENS.colors.text,
    marginBottom: TOKENS.spacing.sm,
  },
  cardBody: {
    fontSize: TOKENS.fontSizes.body,
    color: TOKENS.colors.text,
    lineHeight: TOKENS.fontSizes.body * TOKENS.lineHeights.body,
  },

  // Campos de entrada
  input: {
    backgroundColor: TOKENS.colors.neutral100,
    borderWidth: 2,
    borderColor: TOKENS.colors.divider,
    borderRadius: TOKENS.radius.md,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm,
    fontSize: TOKENS.fontSizes.body,
    color: TOKENS.colors.text,
  },
  inputFocused: {
    borderColor: TOKENS.colors.accent,
  },

  // Tags / Badges
  tagAccent: {
    backgroundColor: TOKENS.colors.accent100,
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.xs,
    borderRadius: TOKENS.radius.sm,
  },
  tagAccentText: {
    fontSize: TOKENS.fontSizes.xs,
    color: TOKENS.colors.accent700,
    fontWeight: '600',
  },
  tagAccent2: {
    backgroundColor: TOKENS.colors.accent2_100,
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.xs,
    borderRadius: TOKENS.radius.sm,
  },
  tagAccent2Text: {
    fontSize: TOKENS.fontSizes.xs,
    color: TOKENS.colors.accent2_700,
    fontWeight: '600',
  },

  // Dividers
  divider: {
    height: 1,
    backgroundColor: TOKENS.colors.divider,
    marginVertical: TOKENS.spacing.base,
  },

  // Status indicators
  statusSuccess: {
    backgroundColor: TOKENS.colors.accent2_500,
  },
  statusWarning: {
    backgroundColor: TOKENS.colors.accent_500,
  },
  statusError: {
    backgroundColor: '#c84033',
  },

  // Glassmorphic effect (simulado con opacity)
  glassCard: {
    backgroundColor: 'rgba(235, 221, 197, 0.8)',
    borderRadius: TOKENS.radius.lg,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
});

// ─────────────────────────────────────────────────────────────
// Utilidades de color
// ─────────────────────────────────────────────────────────────
export const colorUtils = {
  // Convertir un nivel de corrosión (0-100%) a un color
  corrosionColor: (percentage) => {
    if (percentage < 20) return TOKENS.colors.accent2_500; // Sage (bien)
    if (percentage < 50) return TOKENS.colors.accent_400;  // Naranja (medio)
    return '#c84033'; // Rojo (mal)
  },

  // Convertir confianza del modelo (0-1) a color
  confidenceColor: (confidence) => {
    if (confidence > 0.75) return TOKENS.colors.accent2_500; // Verde
    if (confidence > 0.5) return TOKENS.colors.accent_400;   // Naranja
    return '#c84033'; // Rojo
  },
};

export default styles;