import * as FileSystem from 'expo-file-system/legacy';

const API_BASE = 'https://yzesth1il5.execute-api.us-east-1.amazonaws.com/prod';

function dist(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function decidirUbicacion(lat, lng, puntosExistentes) {
  let cercano = null;
  let minDist = Infinity;
  for (let p of puntosExistentes) {
    const plat = p.lat || p.latitud || p.coordenadas?.lat;
    const plng = p.lng || p.longitud || p.coordenadas?.lng;
    if (!plat) continue;
    const d = dist(lat, lng, plat, plng);
    if (d < 100 && d < minDist) { minDist = d; cercano = p; }
  }
  if (cercano) {
    return { modo: 'planta_existente', id_punto: cercano.id_punto || cercano.puntoId || cercano.id, latitud: lat, longitud: lng };
  }
  return { modo: 'coordenadas_libres', latitud: lat, longitud: lng };
}

export async function getPuntosCercanos(token) {
  const res = await fetch(`${API_BASE}/puntos?limit=200`, { headers: { Authorization: token } });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function subirMedicionReal({ uri, token, ubicacionDecidida }) {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const res = await fetch(`${API_BASE}/medicion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({
      imagen_base64: base64,
      fuente: 'movil',
      ubicacion: ubicacionDecidida,
      latitud_real: ubicacionDecidida.latitud,
      longitud_real: ubicacionDecidida.longitud,
      notas: `movil-radio-100m`
    })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}