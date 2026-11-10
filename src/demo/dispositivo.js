// src/demo/dispositivo.js — Cámara, galería y GPS simulados del modo demo (sin permisos ni sensores).
import { FOTOS, nombreFoto, BLOQUES } from './datos';
import { IMG_BASE } from './flag';

let rotor = 4; // la primera foto de cámara es foto05

const comoPicked = (f) => ({
  uri: `${IMG_BASE}/${nombreFoto(f.n)}`,
  base64: null,
  width: f.w,
  height: f.h,
  mimeType: 'image/jpeg',
});

// Cámara: 1 foto. Galería: 3 fotos seguidas del catálogo (para probar la cola de un lote).
export async function pickPhotosDemo({ fromCamera = false, allowsMultiple = true } = {}) {
  const cuantas = fromCamera || !allowsMultiple ? 1 : 3;
  const fotos = [];
  for (let i = 0; i < cuantas; i++) fotos.push(comoPicked(FOTOS[rotor++ % FOTOS.length]));
  return fotos;
}

export async function getCurrentLocationDemo() {
  const c = BLOQUES[0].coordenadas;
  return { lat: c.lat, lng: c.lng, accuracy: 12 };
}

export async function reverseGeocodeDemo() {
  return { ciudad: 'Ciudad demo', barrio: 'Sector demo', direccion: 'Calle de ejemplo, Ciudad demo' };
}
