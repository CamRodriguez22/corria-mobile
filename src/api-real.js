// src/api-real.js — Cliente del backend PIXELRUST (API Gateway + Cognito).
//
// CONTRATO VERIFICADO EN VIVO — 2026-09-06 (llamadas reales con token de Camila):
//   Authorization: <ID token>          (token CRUDO, sin "Bearer ")
//   El backend NO conoce "bloques": trabaja con puntos geolocalizados (id_punto).
//
//   GET    /usuarios/me
//   GET    /puntos?limit=200
//   GET    /puntos/{id_punto}
//   GET    /mediciones/recientes?limit=N      -> { total, mediciones:[...] }   (máx 100)
//   GET    /mediciones/{id_punto}             -> [ ...mediciones ]
//   GET    /alertas?horas=N&nivel_minimo=LEVE|MODERADA|SEVERA|CRITICA
//   POST   /medicion                          -> objeto medición (corre YOLO)
//   DELETE /mediciones/{id_punto}?id_medicion={id_medicion}  -> { ok:true }
//
// Forma de una medición (POST y listados):
//   nivel_corrosion    : number  (0 ninguna · 1 leve · 2 moderada · 3 severa · 4 crítica)
//   area_corroida_pct  : string en los GET ("36.66") / number en el POST  -> usar parseFloat
//   confianza_promedio : 0..1 (string/number)
//   detecciones, mascaras : arrays (mascaras puede pesar cientos de KB — ignorar en móvil)
//   url_imagen, url_thumbnail : URLs S3 prefirmadas (~7 días). El S3 crudo da 403.
//   s3_key_imagen / _thumbnail / _resultado : claves (no accesibles directo)
//   clima, punto_info{ id_punto, sede, ciudad, coordenadas{lat,lng} }, latitud_real, longitud_real

import * as FileSystem from 'expo-file-system/legacy';
import { AWS_CONFIG, APP_CONFIG, CIUDAD } from './config';
import { dist, getIdToken } from './utils';

const API_BASE = AWS_CONFIG.apiBase;

// ─────────────────────────── fetch con timeout + errores claros ───────────────────────────
async function req(method, path, { token, body, timeoutMs = 60000 } = {}) {
  const auth = token || (await getIdToken());
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: auth, // CRUDO, sin "Bearer "
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(t);
    if (e.name === 'AbortError') throw new Error('El servidor tardó demasiado. Revisa tu conexión.');
    throw new Error('Sin conexión con el servidor.');
  }
  clearTimeout(t);

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || text || `Error ${res.status}`;
    const err = new Error(`${method} ${path} — ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ─────────────────────────── Perfil ───────────────────────────
export async function getUsuarioMe(token) {
  return req('GET', '/usuarios/me', { token });
}
export async function updateUsuarioMe(token, data) {
  return req('PUT', '/usuarios/me', { token, body: data });
}
export const getMiPerfil = () => req('GET', '/usuarios/me');

// ─────────────────────────── Puntos ───────────────────────────
export async function getPuntosCercanos(token) {
  const data = await req('GET', '/puntos?limit=200', { token });
  return Array.isArray(data) ? data : data.items || data.puntos || [];
}
export async function getDetallePunto(token, id_punto) {
  return req('GET', `/puntos/${id_punto}`, { token });
}

// ─────────────────────────── Mediciones ───────────────────────────
export async function getMedicionesRecientes(token, limit = APP_CONFIG.limiteHistorialMovil) {
  const lim = Math.min(limit, APP_CONFIG.limiteHistorialMax);
  const data = await req('GET', `/mediciones/recientes?limit=${lim}`, { token });
  return Array.isArray(data) ? data : data.mediciones || data.items || [];
}
// Alias con nombre pedido en el prompt.
export const listarMediciones = (limit) => getMedicionesRecientes(undefined, limit);
export const fetchUserMeasurements = (limit) => getMedicionesRecientes(undefined, limit);

export async function getMedicionesDelPunto(token, id_punto) {
  const data = await req('GET', `/mediciones/${id_punto}`, { token });
  return Array.isArray(data) ? data : data.mediciones || data.items || [];
}

export async function getAlertas(token, horas = 24, nivel_minimo = 'MODERADA') {
  const data = await req('GET', `/alertas?horas=${horas}&nivel_minimo=${nivel_minimo}`, { token });
  return Array.isArray(data) ? data : data.items || data.alertas || [];
}

// DELETE /mediciones/{id_punto}?id_medicion={id_medicion}
export async function eliminarMedicion(id_punto, id_medicion, token) {
  if (!id_punto || !id_medicion) throw new Error('Faltan id_punto o id_medicion para eliminar.');
  return req('DELETE', `/mediciones/${id_punto}?id_medicion=${encodeURIComponent(id_medicion)}`, { token });
}

// ─────────────────────────── Decisión de ubicación ───────────────────────────
// ubicacion.modo:
//   planta_existente:   { modo, id_punto }               — reusar punto ya en DynamoDB
//   planta_nueva:       { modo, sede, ciudad }            — crea punto con nombre
//   coordenadas_libres: { modo, latitud, longitud }       — punto sin nombre
export function decidirUbicacion(lat, lng, puntosExistentes = [], ciudad = null, barrio = null) {
  let cercano = null;
  let minDist = Infinity;
  for (const p of puntosExistentes) {
    const plat = p.lat || p.latitud || p.coordenadas?.lat;
    const plng = p.lng || p.longitud || p.coordenadas?.lng;
    if (plat == null) continue;
    const d = dist(lat, lng, plat, plng);
    if (d < APP_CONFIG.radioAgrupacionMetros && d < minDist) {
      minDist = d;
      cercano = p;
    }
  }
  if (cercano) return { modo: 'planta_existente', id_punto: cercano.id_punto || cercano.puntoId || cercano.id };
  if (ciudad && barrio) return { modo: 'planta_nueva', sede: barrio, ciudad };
  return { modo: 'coordenadas_libres', latitud: lat, longitud: lng };
}

// Ubicación para una foto tomada "en el Bloque X": reusa punto cercano o crea uno con
// sede = "Bloque X" para que quede nombrado en la base desde el primer POST.
export async function decidirUbicacionBloque({ bloqueClave, lat, lng, ciudad = CIUDAD }) {
  let puntos = [];
  try {
    puntos = await getPuntosCercanos();
  } catch {
    puntos = [];
  }
  const decidida = decidirUbicacion(lat, lng, puntos, ciudad, `Bloque ${bloqueClave}`);
  return decidida;
}

// ─────────────────────────── POST /medicion (bajo nivel) ───────────────────────────
export async function subirMedicionReal({ uri, base64, token, ubicacionDecidida, lat, lng, notas = '' }) {
  let img = base64;
  if (!img && uri) {
    img = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }
  if (!img) throw new Error('No se pudo leer la imagen.');

  const body = {
    imagen_base64: img, // CRUDO, sin prefijo "data:image/jpeg;base64," (verificado)
    fuente: 'movil',
    ubicacion: ubicacionDecidida,
    latitud_real: lat,
    longitud_real: lng,
    notas: notas || `movil-radio-${APP_CONFIG.radioAgrupacionMetros}m`,
  };
  return req('POST', '/medicion', { token, body, timeoutMs: 120000 });
}

// ─────────────────────────── POST /medicion (alto nivel, para App.js) ───────────────────────────
// foto: { uri, base64 }  ·  gps: { lat, lng }  ·  bloqueClave: "K"
export async function subirMedicion({ foto, gps, bloqueClave, ciudad = CIUDAD, notas = '' }) {
  if (!gps?.lat || !gps?.lng) throw new Error('No hay coordenadas GPS para la medición.');
  const ubicacion = await decidirUbicacionBloque({ bloqueClave, lat: gps.lat, lng: gps.lng, ciudad });
  const medicion = await subirMedicionReal({
    uri: foto?.uri,
    base64: foto?.base64,
    ubicacionDecidida: ubicacion,
    lat: gps.lat,
    lng: gps.lng,
    notas,
  });
  return { medicion, ubicacion };
}

// Guardar observaciones (espesor/nota) tras el análisis: se hace un PUT del perfil no aplica;
// el backend actual no expone PATCH de medición, así que las observaciones se conservan
// localmente y se reenvían en la nota de la siguiente subida. Se expone para que App.js
// pueda persistirlas en AsyncStorage.
export function componerObservaciones({ bloqueClave, espesor, descripcion }) {
  const partes = [`Bloque ${bloqueClave}`];
  if (espesor) partes.push(`espesor ${espesor} mm`);
  if (descripcion) partes.push(descripcion);
  return partes.join(' · ');
}
