// src/utils.js — Helpers compartidos. No duplicar en App.js.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { necesitaConvertirAJpeg } from './subida';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { fetchAuthSession } from 'aws-amplify/auth';

import { APP_CONFIG, LISTA_BLOQUES } from './config';
import { num, severidad } from './DesignTokens';

// ───────────────────────────── Geometría ─────────────────────────────
// Distancia en metros entre dos coordenadas (haversine).
export function dist(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || Number.isNaN(Number(v)))) return Infinity;
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ───────────────────────────── Auth ─────────────────────────────
// Token de ID de Cognito (crudo, SIN "Bearer "). El backend lo exige así.
export async function getIdToken() {
  const session = await fetchAuthSession();
  const token = session?.tokens?.idToken?.toString();
  if (!token) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
  return token;
}

// ───────────────────────────── Ubicación ─────────────────────────────
export async function getCurrentLocation() {
  if (process.env.EXPO_PUBLIC_DEMO === '1') return require('./demo/dispositivo').getCurrentLocationDemo();
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    const err = new Error('Sin permiso de ubicación. Actívalo en Ajustes del teléfono.');
    err.code = 'PERM_DENIED';
    throw err;
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
}

export async function reverseGeocode(lat, lng) {
  if (process.env.EXPO_PUBLIC_DEMO === '1') return require('./demo/dispositivo').reverseGeocodeDemo();
  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!a) return { ciudad: null, barrio: null, direccion: null };
    return {
      ciudad: a.city || a.subregion || a.region || null,
      barrio: a.district || a.name || a.street || null,
      direccion: [a.street, a.name, a.city].filter(Boolean).join(', ') || null,
    };
  } catch {
    return { ciudad: null, barrio: null, direccion: null };
  }
}

// ───────────────────────────── Cámara / galería ─────────────────────────────
// Devuelve array de fotos [{ uri, base64, width, height }] o null si se canceló.
// `recortar`: abre el editor de recorte en la galería (solo con una foto; con varias el selector no recorta).
export async function pickPhotos({ fromCamera = false, allowsMultiple = true, recortar = false } = {}) {
  if (process.env.EXPO_PUBLIC_DEMO === '1') return require('./demo/dispositivo').pickPhotosDemo({ fromCamera, allowsMultiple });
  const perm = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    const err = new Error(
      fromCamera
        ? 'Sin permiso de cámara. Actívalo en Ajustes del teléfono.'
        : 'Sin permiso de galería. Actívalo en Ajustes del teléfono.'
    );
    err.code = 'PERM_DENIED';
    throw err;
  }
  const opts = {
    mediaTypes: ['images'],
    quality: 0.6,
    base64: false, // la subida usa la URI (upload-url + S3); base64 solo gastaba memoria
    allowsMultipleSelection: !fromCamera && allowsMultiple,
  };
  const res = fromCamera
    ? await ImagePicker.launchCameraAsync({ ...opts, allowsEditing: true })
    : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsEditing: recortar && !allowsMultiple });
  if (res.canceled || !res.assets?.length) return null;
  return Promise.all(
    res.assets.map((a) =>
      asegurarJpeg({
        uri: a.uri,
        base64: a.base64 || null,
        width: a.width,
        height: a.height,
        mimeType: a.mimeType,
        fileName: a.fileName,
      })
    )
  );
}

// La subida declara image/jpeg: una foto HEIF/WebP/PNG se convierte a JPEG antes de subirla.
// Si la conversión falla se avisa al usuario: nunca se sube un archivo que no sea JPEG con tipo image/jpeg.
async function asegurarJpeg(foto) {
  if (!necesitaConvertirAJpeg(foto)) return foto;
  try {
    const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
    const r = await manipulateAsync(foto.uri, [], { compress: 0.9, format: SaveFormat.JPEG });
    return { ...foto, uri: r.uri, width: r.width || foto.width, height: r.height || foto.height, mimeType: 'image/jpeg', base64: null };
  } catch {
    throw new Error('No se pudo convertir la foto a JPEG. Prueba con otra foto o tómala con la cámara.');
  }
}

// Devuelve { uri, base64, width, height } o null si se canceló (compatibilidad).
export async function pickPhoto({ fromCamera = true } = {}) {
  const fotos = await pickPhotos({ fromCamera, allowsMultiple: false });
  return fotos?.[0] || null;
}

// Validación del tamaño mínimo de la foto (lógica pura en ./subida; mensajes sin píxeles).
export { validarFoto } from './subida';

// ───────────────────────────── Fechas ─────────────────────────────
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatDate(ts) {
  const d = ts ? new Date(ts) : new Date();
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function formatDateTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${hh}:${mm}`;
}

export function relativeDate(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < day && d.getDate() === new Date().getDate()) return `Hoy · ${formatDateTime(ts).split('· ')[1]}`;
  if (diff < 2 * day) return `Ayer · ${formatDateTime(ts).split('· ')[1]}`;
  return formatDateTime(ts);
}

export function fechaCarpeta(ts) {
  const d = ts ? new Date(ts) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ───────────────────────────── Estadísticas ─────────────────────────────
export function calcularEstadisticas(mediciones = []) {
  const total = mediciones.length;
  if (!total) return { total: 0, severas: 0, promedioPct: 0, promedioLabel: '—' };
  let suma = 0;
  let severas = 0;
  for (const m of mediciones) {
    const pct = num(m.area_corroida_pct, 0);
    suma += pct;
    const s = severidad(m);
    if (s.i >= 3 || pct >= 25) severas += 1;
  }
  const promedioPct = Math.round(suma / total);
  return {
    total,
    severas,
    promedioPct,
    promedioLabel: severidad({ area_corroida_pct: promedioPct }).label,
  };
}

// ───────────────────────────── AsyncStorage ─────────────────────────────
export async function saveLocal(key, data) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.log('saveLocal', key, e?.message);
    return false;
  }
}

export async function loadLocal(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.log('loadLocal', key, e?.message);
    return fallback;
  }
}

// Borra TODO lo que la app guarda del usuario: las claves de AsyncStorage (las
// declaradas en APP_CONFIG.storageKeys más cualquier otra con prefijo `pixelrust_`)
// y las fotos locales de guardarFotoLocal. Las claves de Amplify las limpia signOut().
export async function clearLocalData() {
  let ok = true;
  try {
    const keys = new Set(Object.values(APP_CONFIG.storageKeys));
    const todas = await AsyncStorage.getAllKeys();
    todas.filter((k) => k.startsWith('pixelrust_')).forEach((k) => keys.add(k));
    await AsyncStorage.multiRemove([...keys]);
  } catch (e) {
    console.log('clearLocalData', e?.message);
    ok = false;
  }
  try {
    // Sin sistema de archivos en web (documentDirectory es null/undefined).
    if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
      await FileSystem.deleteAsync(FileSystem.documentDirectory + APP_CONFIG.carpetaFotos + '/', {
        idempotent: true,
      });
    }
  } catch (e) {
    console.log('clearLocalData fotos', e?.message);
    ok = false;
  }
  return ok;
}

// ───────────────────────────── Fotos locales ─────────────────────────────
// Guarda la foto en DocumentDirectory/PIXELRUST_Mediciones/{bloque}/{fecha}/ + metadata JSON.
export async function guardarFotoLocal({ uri, base64, bloque = 'SIN_BLOQUE', id, meta = {}, ts }) {
  try {
    const rootDir = FileSystem.documentDirectory + APP_CONFIG.carpetaFotos + '/';
    const dir = `${rootDir}${bloque}/${fechaCarpeta(ts)}/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const stamp = id || `MED-${Date.now()}`;
    const fotoPath = `${dir}${stamp}.jpg`;
    if (base64) {
      await FileSystem.writeAsStringAsync(fotoPath, base64, { encoding: FileSystem.EncodingType.Base64 });
    } else if (uri) {
      await FileSystem.copyAsync({ from: uri, to: fotoPath });
    }
    await FileSystem.writeAsStringAsync(
      `${dir}${stamp}.json`,
      JSON.stringify({ id: stamp, bloque, ts: ts || new Date().toISOString(), fotoPath, ...meta }, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    return fotoPath;
  } catch (e) {
    console.log('guardarFotoLocal', e?.message);
    return null;
  }
}

// ───────────────────────────── Bloques del campus ─────────────────────────────
// Adapta un bloque real del backend (GET/POST /bloques) a la misma forma que ya
// usan las pantallas para BLOQUES_CAMPUS: { clave, nombre, detalle, lat, lng }.
// clave = id_bloque real (antes era una letra fija G/J/K/L). Se conserva
// id_bloque explícito además, para distinguir "bloque real" de "bloque de
// respaldo offline" (ver resolverBloqueId en api-real.js).
export function adaptarBloque(b) {
  return {
    clave: b.id_bloque,
    id_bloque: b.id_bloque,
    nombre: b.nombre,
    detalle: b.descripcion || [b.ciudad, b.departamento].filter(Boolean).join(', ') || '',
    lat: b.coordenadas?.lat,
    lng: b.coordenadas?.lng,
  };
}

// listaBloques: por defecto el catálogo de respaldo offline (BLOQUES_CAMPUS);
// App.js pasa el catálogo real cargado del backend cuando está disponible.
export function bloqueMasCercano(lat, lng, maxMetros = 120, listaBloques = LISTA_BLOQUES) {
  let best = null;
  let bestD = Infinity;
  for (const b of listaBloques) {
    if (b.lat == null || b.lng == null) continue;
    const d = dist(lat, lng, b.lat, b.lng);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best && bestD <= maxMetros ? best.clave : null;
}

// notas del backend: guardamos el punto como prefijo legible "Punto K · <texto>".
// (Las mediciones antiguas usan el prefijo "Bloque K": parseBloqueDeNotas acepta ambos.)
export function construirNotas(bloque, texto = '') {
  const t = (texto || '').trim();
  return t ? `Punto ${bloque} · ${t}` : `Punto ${bloque}`;
}

export function parseBloqueDeNotas(notas = '') {
  // Incluye guiones: los id_bloque reales (uuid) los usan; las claves de
  // BLOQUES_CAMPUS (letras) también matchean igual que antes.
  const m = /(?:punto|bloque)\s+([a-z0-9-]+)/i.exec(notas || '');
  return m ? m[1].toUpperCase() : null;
}

// Deriva el bloque de una medición: mapa local -> notas -> GPS más cercano.
// listaBloques: catálogo contra el que se valida/busca (real del backend o
// respaldo offline BLOQUES_CAMPUS por defecto).
export function bloqueDeMedicion(m, mapaLocal = {}, listaBloques = LISTA_BLOQUES) {
  if (!m) return null;
  if (mapaLocal[m.id_medicion]) return mapaLocal[m.id_medicion];
  // El backend real ya devuelve id_punto = id_bloque directamente en cada
  // medición (fusión Punto→Bloque, ver lambda_src/api_mediciones/handler.py:
  // "Hoy id_punto vale el id_bloque"). Es la fuente más confiable — se prioriza
  // sobre las heurísticas de abajo (notas/GPS), que solo tienen sentido cuando
  // no hay id_punto (p. ej. datos viejos o el catálogo de respaldo offline).
  if (m.id_punto) return m.id_punto;
  const porNotas = parseBloqueDeNotas(m.notas);
  if (porNotas && listaBloques.some((b) => String(b.clave).toUpperCase() === porNotas)) {
    return listaBloques.find((b) => String(b.clave).toUpperCase() === porNotas).clave;
  }
  const lat = m.latitud_real ?? m.punto_info?.coordenadas?.lat;
  const lng = m.longitud_real ?? m.punto_info?.coordenadas?.lng;
  if (lat != null && lng != null) {
    const cerca = bloqueMasCercano(lat, lng, 150, listaBloques);
    if (cerca) return cerca;
  }
  return null;
}

// Agrupa mediciones por bloque (para la pantalla Carpetas). listaBloques: catálogo
// real cargado del backend, o BLOQUES_CAMPUS de respaldo si no hay conexión.
export function agruparPorBloque(mediciones = [], mapaLocal = {}, listaBloques = LISTA_BLOQUES) {
  const grupos = {};
  const bloquesPorClave = {};
  for (const b of listaBloques) {
    bloquesPorClave[b.clave] = b;
    grupos[b.clave] = [];
  }
  const sinBloque = [];
  for (const m of mediciones) {
    const b = bloqueDeMedicion(m, mapaLocal, listaBloques);
    if (b && grupos[b]) grupos[b].push(m);
    else sinBloque.push(m);
  }
  const orden = (arr) => arr.sort((a, z) => new Date(z.timestamp || 0) - new Date(a.timestamp || 0));
  const salida = Object.entries(grupos).map(([clave, items]) => ({
    clave,
    bloque: bloquesPorClave[clave],
    items: orden(items),
    peorPct: items.length ? Math.max(...items.map((m) => num(m.area_corroida_pct, 0))) : 0,
  }));
  if (sinBloque.length) {
    salida.push({
      clave: 'SIN_BLOQUE',
      bloque: { clave: 'SIN_BLOQUE', nombre: 'Sin punto', detalle: 'Sin punto asignado' },
      items: orden(sinBloque),
      peorPct: Math.max(...sinBloque.map((m) => num(m.area_corroida_pct, 0))),
    });
  }
  return salida;
}

// ───────────────────────────── Historial del backend (legado) ─────────────────────────────
// Se conserva por compatibilidad: agrupa por ciudad/barrio usando punto_info.
export function agruparMedicionesEnCiudades(mediciones) {
  const ciudadesMap = {};
  for (const m of mediciones) {
    const puntoInfo = m.punto_info || {};
    const ciudadNombre = puntoInfo.ciudad || m.ciudad || 'Desconocido';
    const barrioNombre = m.barrio || m.sede || puntoInfo.sede || 'general';
    const lat = puntoInfo.coordenadas?.lat ?? m.latitud_real ?? m.lat;
    const lng = puntoInfo.coordenadas?.lng ?? m.longitud_real ?? m.lng;
    if (!ciudadesMap[ciudadNombre]) ciudadesMap[ciudadNombre] = { ciudad: ciudadNombre, subcarpetas: {} };
    if (!ciudadesMap[ciudadNombre].subcarpetas[barrioNombre]) {
      ciudadesMap[ciudadNombre].subcarpetas[barrioNombre] = {
        id: `${ciudadNombre}-${barrioNombre}`,
        nombre: barrioNombre,
        lat,
        lng,
        fotos: [],
      };
    }
    const tsRaw = m.timestamp || m.fecha || null;
    ciudadesMap[ciudadNombre].subcarpetas[barrioNombre].fotos.push({
      id: m.id_medicion || m.id,
      uri: m.url_imagen || m.url_thumbnail || m.uri,
      pct: num(m.area_corroida_pct, 0),
      nivel: m.nivel_corrosion ?? m.nivel ?? 0,
      fecha: tsRaw ? new Date(tsRaw).toLocaleDateString() : new Date().toLocaleDateString(),
      _ts: tsRaw,
      lat,
      lng,
    });
  }
  return Object.values(ciudadesMap)
    .sort((a, b) => a.ciudad.localeCompare(b.ciudad))
    .map((c) => ({
      ciudad: c.ciudad,
      subcarpetas: Object.values(c.subcarpetas)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((s) => ({ ...s, fotos: [...s.fotos].sort((a, b) => new Date(b._ts || 0) - new Date(a._ts || 0)) })),
    }));
}

