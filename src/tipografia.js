// src/tipografia.js — Elección de la familia tipográfica según el peso (sin React Native: la usan Typography.js,
// la gráfica SVG y las pruebas). Outfit para la interfaz e IBM Plex Mono para cifras, como la web.
// Con fuentes personalizadas, RN (Android/iOS) ignora `fontWeight`: cada peso es una familia distinta.

const OUTFIT = { 400: 'Outfit_400Regular', 500: 'Outfit_500Medium', 600: 'Outfit_600SemiBold', 700: 'Outfit_700Bold', 800: 'Outfit_800ExtraBold' };
const PLEX = { 400: 'IBMPlexMono_400Regular', 500: 'IBMPlexMono_500Medium', 600: 'IBMPlexMono_600SemiBold', 700: 'IBMPlexMono_700Bold' };

// 'normal' | 'bold' | '100'..'900' | número -> 400 | 500 | 600 | 700 | 800 (Outfit) o hasta 700 (Plex Mono).
export function pesoNumerico(fontWeight) {
  if (fontWeight == null || fontWeight === 'normal') return 400;
  if (fontWeight === 'bold') return 700;
  const n = Number(fontWeight);
  if (!Number.isFinite(n)) return 400;
  if (n <= 400) return 400;
  if (n <= 500) return 500;
  if (n <= 600) return 600;
  if (n <= 700) return 700;
  return 800;
}

// Familia para (`familia`, `fontWeight`): 'mono' -> IBM Plex Mono; cualquier otra o ausente -> Outfit.
export function familiaPara(familia, fontWeight) {
  const p = pesoNumerico(fontWeight);
  if (familia === 'mono') return PLEX[Math.min(p, 700)];
  return OUTFIT[p];
}

// Lista para `useFonts`: nombres de familia que deben estar cargados.
export const FAMILIAS = [...Object.values(OUTFIT), ...Object.values(PLEX)];
