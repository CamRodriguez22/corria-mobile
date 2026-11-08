// src/mascara.js — Máscara de corrosión sobre la foto (pura, sin React Native).
// El backend guarda por medición `mascaras: [{ puntos: [{x, y}] }]` y `contorno_placa: { puntos }`, con x/y
// normalizados en [0, 1] sobre la imagen (ver inference/handler.py y SegmentationOverlay.jsx de la web).
// Las listas (`resumen=1`) las omiten; solo GET /mediciones/{id_punto}?id_medicion= las trae.

const puntosValidos = (ps) => Array.isArray(ps) && ps.length >= 3 && ps.every((p) => Number.isFinite(Number(p?.x)) && Number.isFinite(Number(p?.y)));

// Polígonos de corrosión utilizables de una medición (vacío si el backend no los trajo).
export function poligonosMascara(medicion) {
  const ms = Array.isArray(medicion?.mascaras) ? medicion.mascaras : [];
  return ms.map((m) => m?.puntos).filter(puntosValidos);
}

export function contornoPlaca(medicion) {
  const ps = medicion?.contorno_placa?.puntos;
  return puntosValidos(ps) ? ps : null;
}

export function hayMascara(medicion) {
  return poligonosMascara(medicion).length > 0;
}

// Rectángulo que ocupa la imagen (relación `aspecto` = ancho/alto) dentro de una caja ancho x alto.
//   'cover': llena la caja y recorta (el rectángulo se sale de la caja); 'contain': cabe completa, con franjas.
export function rectDeFoto(ancho, alto, aspecto, modo = 'cover') {
  const cajaAspecto = ancho / alto;
  const llenarAncho = modo === 'cover' ? aspecto <= cajaAspecto : aspecto >= cajaAspecto;
  const w = llenarAncho ? ancho : alto * aspecto;
  const h = llenarAncho ? ancho / aspecto : alto;
  return { x: (ancho - w) / 2, y: (alto - h) / 2, w, h };
}

// Puntos normalizados -> cadena "x,y x,y ..." en píxeles de la caja, para <Polygon points=...>.
export function puntosAPixeles(puntos, rect) {
  return puntos.map((p) => `${(rect.x + Number(p.x) * rect.w).toFixed(2)},${(rect.y + Number(p.y) * rect.h).toFixed(2)}`).join(' ');
}
