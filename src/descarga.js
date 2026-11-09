// src/descarga.js — Piezas puras de la descarga de fotos (sin React Native). La imagen "con corrosión detectada"
// se dibuja igual que en la web (MedicionDetailPage.jsx): manchas rojas con relleno translúcido y trazo, y el
// contorno de la placa en verde, con los mismos colores que FotoConMascara.
import { poligonosMascara, contornoPlaca } from './mascara.js';

export const COLOR_CORROSION = '#dc2626'; // mismo rojo de nivel Severa (NIVELES[3])
export const COLOR_PLACA = '#16a34a'; // mismo verde de "Sin corrosión" (NIVELES[0])
export const OPACIDAD_CORROSION = 0.45;

// Nombre de archivo seguro: "foto-<id>-original.jpg" / "foto-<id>-corrosion.png".
export function nombreArchivo(medicion, tipo = 'original') {
  const id = String(medicion?.id_medicion || 'medicion').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'medicion';
  return tipo === 'corrosion' ? `foto-${id}-corrosion.png` : `foto-${id}-original.jpg`;
}

// "#dc2626" + 0.45 -> "rgba(220,38,38,0.45)"
export function rgba(hex, opacidad) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacidad})`;
}

// Órdenes de dibujo sobre una imagen de ancho x alto píxeles (las coordenadas del backend van de 0 a 1).
// Cada orden: { tipo: 'mancha' | 'placa', puntos: [{x, y}] en píxeles, relleno?, trazo, grosor }.
// Grosores como la web: manchas max(1.5, 0,2 % del ancho); placa max(2.5, 0,3 % del ancho).
export function comandosSegmentacion(medicion, ancho, alto) {
  const aPx = (ps) => ps.map((p) => ({ x: Number(p.x) * ancho, y: Number(p.y) * alto }));
  const cmds = poligonosMascara(medicion).map((ps) => ({
    tipo: 'mancha',
    puntos: aPx(ps),
    relleno: rgba(COLOR_CORROSION, OPACIDAD_CORROSION),
    trazo: COLOR_CORROSION,
    grosor: Math.max(1.5, ancho * 0.002),
  }));
  const placa = contornoPlaca(medicion);
  if (placa) cmds.push({ tipo: 'placa', puntos: aPx(placa), relleno: null, trazo: COLOR_PLACA, grosor: Math.max(2.5, ancho * 0.003) });
  return cmds;
}

// ¿La URL se baja de internet (hay que descargarla) o ya es un archivo/objeto local?
export const esUrlRemota = (uri) => /^https?:\/\//i.test(String(uri || ''));

export const MENSAJE_IMAGEN_NO_CARGO = 'No se pudo cargar la foto para generar la imagen. Revisa tu conexión e inténtalo de nuevo.';
export const MENSAJE_IMAGEN_TARDA = 'La foto tarda demasiado en cargar. Inténtalo de nuevo en un momento.';

// Espera a que la foto de la vista de captura haya cargado de verdad (onLoad) antes de capturarla: si se captura antes,
// se compartiría el marcador de posición con la máscara dibujada encima. `leer()` devuelve 'cargando' | 'lista' | 'error'.
// Devuelve 'lista', 'error' o 'tiempo' (pasó `timeoutMs` sin cargar ni fallar). `dormir` se inyecta para probarlo sin esperar.
export async function esperarImagenLista(leer, { timeoutMs = 20000, cada = 100, dormir = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  for (let esperado = 0; ; esperado += cada) {
    const e = leer();
    if (e === 'lista' || e === 'error') return e;
    if (esperado >= timeoutMs) return 'tiempo';
    await dormir(cada);
  }
}

// Texto para el usuario según cómo terminó la espera ('' si se puede capturar).
export function mensajeCaptura(resultado) {
  if (resultado === 'lista') return '';
  return resultado === 'tiempo' ? MENSAJE_IMAGEN_TARDA : MENSAJE_IMAGEN_NO_CARGO;
}

// Antes de un nuevo intento de captura: si la imagen de la vista de captura había fallado, hay que volver a montarla
// (si no, el nuevo intento leería el mismo error al instante). Devuelve { estado, remontar }.
export function prepararIntentoCaptura(estado) {
  return estado === 'error' ? { estado: 'cargando', remontar: true } : { estado, remontar: false };
}
