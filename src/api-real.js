import * as FileSystem from 'expo-file-system/legacy';
import { AWS_CONFIG, APP_CONFIG } from './config';
import { dist } from './utils';

const API_BASE = AWS_CONFIG.apiBase;

// ===========================================================================
// CONTRATO DE API VERIFICADO POR JOSE NORIEGA - 16 AGOSTO 2026
// Fuente: código real del backend (no adivinado, no inventado)
// Authorization: <token>  -- SIN prefijo "Bearer ", si se agrega deja de andar
// ===========================================================================

// ---------------------------------------------------------------------------
// DECISIÓN DE UBICACIÓN
// ubicacion.modo acepta tres valores confirmados:
//   planta_existente: { modo, id_punto }              — punto ya en DynamoDB
//   planta_nueva:     { modo, sede, ciudad }           — crea punto con nombre
//   coordenadas_libres: { modo, latitud, longitud }    — punto sin nombre
//
// Cambio vs versión anterior: ahora recibe ciudad+barrio del reverseGeocode
// para usar planta_nueva en vez de coordenadas_libres cuando hay info de lugar.
// Así los nuevos puntos quedan nombrados en la base de datos desde el primer POST.
// ---------------------------------------------------------------------------
export function decidirUbicacion(lat, lng, puntosExistentes, ciudad = null, barrio = null) {
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
    };
  }

  // Usa planta_nueva si el reverseGeocode dio ciudad y barrio,
  // para que el backend cree el punto con nombre desde el primer POST.
  if (ciudad && barrio) {
    return { modo: 'planta_nueva', sede: barrio, ciudad };
  }

  // Último recurso: sin info de lugar (GPS sin cobertura de geocoding)
  return { modo: 'coordenadas_libres', latitud: lat, longitud: lng };
}

// ---------------------------------------------------------------------------
// GET /puntos  — lista todas las plantas (cualquier rol)
// GET /puntos/{id_punto} — detalle + historial de cambios de una planta
// ---------------------------------------------------------------------------
export async function getPuntosCercanos(token) {
  const res = await fetch(`${API_BASE}/puntos?limit=200`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`GET /puntos fallo (${res.status}): ${await res.text()}`);
  return await res.json();
}

export async function getDetallePunto(token, id_punto) {
  const res = await fetch(`${API_BASE}/puntos/${id_punto}`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`GET /puntos/${id_punto} fallo (${res.status}): ${await res.text()}`);
  return await res.json();
}

// ---------------------------------------------------------------------------
// GET /mediciones/recientes?limit=N  — últimas N de todos los puntos (máx 100)
// GET /mediciones/{id_punto}         — historial de un punto específico (máx 200)
// Confirmado: trae 14 mediciones en cuenta nueva. El límite de 100 no es el problema.
// ---------------------------------------------------------------------------
export async function getMedicionesRecientes(token, limit = APP_CONFIG.limiteHistorialMax) {
  const limiteSeguro = Math.min(limit, APP_CONFIG.limiteHistorialMax);
  const res = await fetch(`${API_BASE}/mediciones/recientes?limit=${limiteSeguro}`, {
    headers: { Authorization: token },
  });
  if (!res.ok) {
    throw new Error(`GET /mediciones/recientes fallo (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.items || data.mediciones || [];
}

export async function getMedicionesDelPunto(token, id_punto) {
  const res = await fetch(`${API_BASE}/mediciones/${id_punto}`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`GET /mediciones/${id_punto} fallo (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.items || data.mediciones || [];
}

// ---------------------------------------------------------------------------
// GET /alertas?horas=N&nivel_minimo=NIVEL
// Mediciones moderadas/severas/críticas recientes (cualquier rol)
// nivel_minimo: LEVE | MODERADA | SEVERA | CRITICA
// ---------------------------------------------------------------------------
export async function getAlertas(token, horas = 24, nivel_minimo = 'MODERADA') {
  const res = await fetch(
    `${API_BASE}/alertas?horas=${horas}&nivel_minimo=${nivel_minimo}`,
    { headers: { Authorization: token } }
  );
  if (!res.ok) throw new Error(`GET /alertas fallo (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.items || data.alertas || [];
}

// ---------------------------------------------------------------------------
// GET /usuarios/me  — tu perfil
// PUT /usuarios/me  — editar tu perfil (cualquier rol)
// ---------------------------------------------------------------------------
export async function getUsuarioMe(token) {
  const res = await fetch(`${API_BASE}/usuarios/me`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`GET /usuarios/me fallo (${res.status}): ${await res.text()}`);
  return await res.json();
}

export async function updateUsuarioMe(token, data) {
  const res = await fetch(`${API_BASE}/usuarios/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PUT /usuarios/me fallo (${res.status}): ${await res.text()}`);
  return await res.json();
}

// ---------------------------------------------------------------------------
// POST /medicion — sube foto, corre modelo, guarda resultado
//
// Respuesta confirmada del backend:
//   { nivel_corrosion, area_corroida_pct, confianza_promedio, detecciones, id_medicion, id_punto }
//
// Nota: latitud_real y longitud_real van en el body principal (no dentro de ubicacion),
// el backend los usa para georreferencia incluso cuando ubicacion es planta_existente.
// ---------------------------------------------------------------------------
export async function subirMedicionReal({ uri, token, ubicacionDecidida, lat, lng, notas = '' }) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const body = {
    imagen_base64: base64,
    fuente: 'movil',
    ubicacion: ubicacionDecidida,
    latitud_real: lat,
    longitud_real: lng,
    notas: notas || `movil-radio-${APP_CONFIG.radioAgrupacionMetros}m`,
  };

  const res = await fetch(`${API_BASE}/medicion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`POST /medicion fallo (${res.status}): ${await res.text()}`);

  // Devuelve el objeto completo para que App.js pueda mostrar
  // nivel_corrosion, area_corroida_pct, confianza_promedio Y detecciones
  return await res.json();
}