// src/api-real.js — Cliente del backend PIXELRUST (API Gateway + Cognito).
//
// CONTRATO VERIFICADO EN VIVO — 2026-09-12 (post fusión Punto→Bloque):
//   Authorization: <ID token>          (token CRUDO, sin "Bearer ")
//   El backend trabaja con bloques (empresa→bloque→punto→medición). /puntos quedó
//   retirado; POST /medicion ahora exige bloque_id (string, bloque YA existente de
//   la empresa del usuario) en la RAÍZ del body.
//
//   GET    /usuarios/me
//   GET    /bloques                           -> { bloques:[...] } (filtrado por empresa del caller)
//   POST   /bloques                           -> bloque creado (tecnico/admin; NO cliente)
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
import { AWS_CONFIG, APP_CONFIG, CIUDAD, DEPARTAMENTO } from './config';
import { getIdToken } from './utils';

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

// ─────────────────────────── Bloques ───────────────────────────
// GET /bloques (sin query param): el backend filtra automático por la empresa
// del usuario logueado (excepto super_admin, que esta app no contempla).
export async function getBloques(token) {
  const data = await req('GET', '/bloques', { token });
  return Array.isArray(data) ? data : data.bloques || data.items || [];
}

// POST /bloques — permitido a tecnico/admin, NO a cliente. El backend asigna
// empresa_id solo del caller: nunca lo mandamos nosotros.
export async function crearBloque({
  nombre,
  lat,
  lng,
  ciudad = CIUDAD,
  departamento = DEPARTAMENTO,
  descripcion,
  tipo_estructura,
  grosor_mm,
  token,
} = {}) {
  const body = { nombre, coordenadas: { lat, lng }, ciudad, departamento };
  if (descripcion) body.descripcion = descripcion;
  if (tipo_estructura) body.tipo_estructura = tipo_estructura;
  if (grosor_mm != null) body.grosor_mm = grosor_mm;
  return req('POST', '/bloques', { token, body });
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

// ─────────────────────────── Resolución de bloque_id ───────────────────────────
// El bloque elegido en ContextScreen puede venir de dos orígenes:
//   - catálogo real (GET /bloques): ya trae id_bloque -> se usa tal cual.
//   - catálogo de respaldo offline (BLOQUES_CAMPUS, sin backend): no tiene
//     id_bloque real, así que hay que CREARLO de verdad antes de subir la
//     medición. Esto reemplaza al viejo modo "planta_nueva" (que creaba un
//     "punto" con nombre) contra el endpoint real /bloques.
export async function resolverBloqueId({ bloque, lat, lng, ciudad = CIUDAD, departamento = DEPARTAMENTO, token } = {}) {
  if (!bloque) throw new Error('Selecciona un bloque antes de continuar.');
  if (bloque.id_bloque) return bloque.id_bloque; // ya es un bloque real del backend
  const creado = await crearBloque({
    nombre: bloque.nombre,
    lat: bloque.lat ?? lat,
    lng: bloque.lng ?? lng,
    ciudad,
    departamento,
    token,
  });
  return creado.id_bloque;
}

// ─────────────────────────── POST /medicion (bajo nivel) ───────────────────────────
export async function subirMedicionReal({ uri, base64, token, bloqueId, lat, lng, notas = '' }) {
  let img = base64;
  if (!img && uri) {
    img = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }
  if (!img) throw new Error('No se pudo leer la imagen.');
  if (!bloqueId) throw new Error('bloque_id es requerido para subir la medición.');

  const body = {
    imagen_base64: img, // CRUDO, sin prefijo "data:image/jpeg;base64," (verificado)
    fuente: 'movil',
    bloque_id: bloqueId,
    latitud_real: lat,
    longitud_real: lng,
    notas: notas || `movil-bloque-${bloqueId}`,
  };
  return req('POST', '/medicion', { token, body, timeoutMs: 120000 });
}

// ─────────────────────────── POST /medicion (alto nivel, para App.js) ───────────────────────────
// foto: { uri, base64 }  ·  gps: { lat, lng }  ·  bloqueId: id_bloque real ya resuelto
// (ver resolverBloqueId). El backend ya no acepta mediciones sin bloque, así que no
// hay modo "coordenadas_libres" de respaldo: si falta bloqueId, falla explícito.
export async function subirMedicion({ foto, gps, bloqueId, notas = '' }) {
  if (!gps?.lat || !gps?.lng) throw new Error('No hay coordenadas GPS para la medición.');
  if (!bloqueId) throw new Error('No se pudo determinar el bloque de la medición.');
  const medicion = await subirMedicionReal({
    uri: foto?.uri,
    base64: foto?.base64,
    lat: gps.lat,
    lng: gps.lng,
    bloqueId,
    notas,
  });
  return { medicion };
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
