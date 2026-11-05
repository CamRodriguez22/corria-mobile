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
//   POST   /medicion                          -> objeto medición (corre análisis IA)
//   PATCH  /mediciones/{id_punto}?id_medicion={id} -> renombra foto { nombre }
//   POST   /mediciones/lote/renombrar         -> renombra lote { mediciones: [{id_punto, id_medicion}], nombre }
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
    const serverMsg = (data && (data.error || data.message)) || (typeof text === 'string' && text.length < 200 ? text : null);
    let userMsg = serverMsg;
    if (!userMsg) {
      if (res.status === 401) userMsg = 'Tu sesión expiró. Inicia sesión nuevamente.';
      else if (res.status === 403) userMsg = 'No tienes permiso para realizar esta acción.';
      else if (res.status === 404) userMsg = 'El recurso solicitado no fue encontrado.';
      else if (res.status >= 500) userMsg = 'Error en el servidor. Intenta de nuevo en unos momentos.';
      else userMsg = `Ocurrió un error (${res.status}). Intenta de nuevo.`;
    }
    const err = new Error(userMsg);
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

// ─────────────────────────── Indicadores y resumen del servidor ───────────────────────────
export async function getIndicadores(token) {
  return req('GET', '/indicadores', { token });
}

// ─────────────────────────── Mediciones ───────────────────────────
export async function getMedicionesRecientes(token, limit = APP_CONFIG.limiteHistorialMovil, cursor = null) {
  const lim = Math.min(limit, APP_CONFIG.limiteHistorialMax);
  let path = `/mediciones/recientes?limit=${lim}`;
  if (cursor) path += `&cursor=${encodeURIComponent(cursor)}`;
  const data = await req('GET', path, { token });
  return data;
}
// Alias con nombre pedido en el prompt.
export const listarMediciones = (limit) => getMedicionesRecientes(undefined, limit);
export const fetchUserMeasurements = (limit) => getMedicionesRecientes(undefined, limit);

export async function getMedicionesDelPunto(token, id_punto) {
  const data = await req('GET', `/mediciones/${id_punto}`, { token });
  return Array.isArray(data) ? data : data.mediciones || data.items || [];
}

// PATCH /mediciones/{id_punto}?id_medicion={id_medicion} (renombrar foto)
export async function renombrarMedicion(id_punto, id_medicion, nuevoNombre, token) {
  if (!id_punto || !id_medicion) throw new Error('Faltan id_punto o id_medicion.');
  return req('PATCH', `/mediciones/${id_punto}?id_medicion=${encodeURIComponent(id_medicion)}`, {
    token,
    body: { nombre: nuevoNombre },
  });
}

// POST /mediciones/lote/renombrar (renombrar lote)
export async function renombrarLote(items, nuevoNombre, token) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Se requiere lista de mediciones.');
  const formateados = items.map((it) => ({
    id_punto: it.id_punto,
    id_medicion: it.id_medicion,
  }));
  return req('POST', '/mediciones/lote/renombrar', {
    token,
    body: { items: formateados, nombre: nuevoNombre },
  });
}

// DELETE /mediciones/{id_punto}?id_medicion={id_medicion}
export async function eliminarMedicion(id_punto, id_medicion, token) {
  if (!id_punto || !id_medicion) throw new Error('Faltan id_punto o id_medicion para eliminar.');
  return req('DELETE', `/mediciones/${id_punto}?id_medicion=${encodeURIComponent(id_medicion)}`, { token });
}

// ─────────────────────────── Resolución de bloque_id (punto) ───────────────────────────
export async function resolverBloqueId({ bloque } = {}) {
  if (!bloque) throw new Error('Selecciona un punto antes de continuar.');
  if (bloque.id_bloque) return bloque.id_bloque;
  throw new Error('El punto seleccionado no tiene un identificador válido.');
}

// ─────────────────────────── Subida de fotos grandes (upload-url + S3) ───────────────────────────
export async function pedirUploadUrl(contentType = 'image/jpeg', token) {
  return req('POST', '/medicion/upload-url', {
    token,
    body: { content_type: contentType },
  });
}

export async function subirFotoAS3({ url, fields }, uri) {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', {
    uri,
    name: 'foto.jpg',
    type: fields['Content-Type'] || 'image/jpeg',
  });

  const res = await fetch(url, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Error al subir la imagen al almacenamiento (${res.status}).`);
  }
}

// ─────────────────────────── POST /medicion (bajo nivel) ───────────────────────────
export async function subirMedicionReal({ uri, base64, token, bloqueId, lat, lng, loteId, loteNombre, notas = '', onEtapa }) {
  if (!bloqueId) throw new Error('bloque_id es requerido para subir la medición.');

  let imgB64 = base64;
  let imagenKey = null;

  // Si la foto es grande o no viene en base64, usa upload-url a S3
  const debeUsarS3 = !imgB64 || (imgB64.length > 3.5 * 1024 * 1024);

  if (debeUsarS3 && uri) {
    if (onEtapa) onEtapa('preparando_subida');
    const presigned = await pedirUploadUrl('image/jpeg', token);
    imagenKey = presigned.imagen_key;
    if (onEtapa) onEtapa('subiendo_s3');
    await subirFotoAS3(presigned, uri);
    imgB64 = null; // no viaja en el body si se subió a S3
  } else if (!imgB64 && uri) {
    imgB64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }

  if (onEtapa) onEtapa('analizando_ia');

  const body = {
    fuente: 'movil',
    bloque_id: bloqueId,
    notas: notas || `movil-bloque-${bloqueId}`,
  };
  if (imagenKey) {
    body.imagen_key = imagenKey;
  } else if (imgB64) {
    body.imagen_base64 = imgB64;
  } else {
    throw new Error('No se pudo preparar la imagen para el análisis.');
  }

  if (lat != null && lng != null) {
    body.latitud_real = lat;
    body.longitud_real = lng;
  }
  if (loteId) body.lote_id = loteId;
  if (loteNombre) body.lote_nombre = loteNombre;

  return req('POST', '/medicion', { token, body, timeoutMs: 120000 });
}

// ─────────────────────────── POST /medicion (alto nivel, para App.js) ───────────────────────────
// foto: { uri, base64 }  ·  gps: { lat, lng } (opcional) ·  bloqueId: id_bloque real
export async function subirMedicion({ foto, gps, bloqueId, loteId, loteNombre, notas = '', onEtapa }) {
  if (!bloqueId) throw new Error('No se pudo determinar el punto de la medición.');
  const medicion = await subirMedicionReal({
    uri: foto?.uri,
    base64: foto?.base64,
    lat: gps?.lat,
    lng: gps?.lng,
    bloqueId,
    loteId,
    loteNombre,
    notas,
    onEtapa,
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
