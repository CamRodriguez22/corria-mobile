import * as FileSystem from 'expo-file-system/legacy';
import { AWS_CONFIG, APP_CONFIG } from './config';
import { dist } from './utils.js';

const API_BASE = AWS_CONFIG.apiBase;

export function decidirUbicacion(lat, lng, puntosExistentes) {
  let cercano = null;
  let minDist = Infinity;
  for (let p of puntosExistentes) {
    const plat = p.lat || p.latitud || p.coordenadas?.lat;
    const plng = p.lng || p.longitud || p.coordenadas?.lng;
    if (!plat) continue;
    const d = dist(lat, lng, plat, plng);
    if (d < APP_CONFIG.radioAgrupacionMetros && d < minDist) {
      minDist = d;
      cercano = p;
    }
  }
  if (cercano) {
    return {
      modo: 'planta_existente',
      id_punto: cercano.id_punto || cercano.puntoId || cercano.id,
      latitud: lat,
      longitud: lng,
    };
  }
  return { modo: 'coordenadas_libres', latitud: lat, longitud: lng };
}

export async function getPuntosCercanos(token) {
  const res = await fetch(`${API_BASE}/puntos?limit=200`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// Fix punto 2 de Jose - historial compartido con web.
// Unico endpoint real del contrato de API para esto: GET /mediciones/recientes?limit=N (max 100).
// No existe un GET /mediciones generico (sin id_punto) ni un GET /medicion en el backend real -
// los fallbacks a esas rutas en la version anterior nunca iban a funcionar y ademas
// enmascaraban errores reales (token vencido, 500 del backend, etc.) devolviendo [] en silencio,
// haciendo que un fallo real se viera igual que "historial vacio".
export async function getMedicionesRecientes(token, limit = APP_CONFIG.limiteHistorialMax) {
  const limiteSeguro = Math.min(limit, APP_CONFIG.limiteHistorialMax);
  const res = await fetch(`${API_BASE}/mediciones/recientes?limit=${limiteSeguro}`, {
    headers: { Authorization: token },
  });
  if (!res.ok) {
    throw new Error(`GET /mediciones/recientes fallo (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  // Normaliza: puede venir como { items: [] } o [] directo
  return Array.isArray(data) ? data : data.items || data.mediciones || [];
}

export async function subirMedicionReal({ uri, token, ubicacionDecidida }) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const res = await fetch(`${API_BASE}/medicion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({
      imagen_base64: base64,
      fuente: 'movil',
      ubicacion: ubicacionDecidida,
      latitud_real: ubicacionDecidida.latitud,
      longitud_real: ubicacionDecidida.longitud,
      notas: `movil-radio-${APP_CONFIG.radioAgrupacionMetros}m`,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}