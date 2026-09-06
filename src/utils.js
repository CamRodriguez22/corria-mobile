// src/utils.js — Helpers compartidos. No duplicar en App.js.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { fetchAuthSession } from 'aws-amplify/auth';

import { APP_CONFIG, BLOQUES_CAMPUS, LISTA_BLOQUES, CIUDAD } from './config';
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
// Devuelve { uri, base64, width, height } o null si se canceló.
export async function pickPhoto({ fromCamera = true } = {}) {
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
    base64: true,
    allowsEditing: true,
    exif: false,
  };
  const res = fromCamera
    ? await ImagePicker.launchCameraAsync(opts)
    : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, base64: a.base64 || null, width: a.width, height: a.height, mimeType: a.mimeType };
}

// Valida que la foto sirva para el modelo (mín. 800x600 según el mockup).
export function validarFoto(foto) {
  if (!foto?.uri) return 'No se recibió ninguna foto.';
  if (!foto.base64) return 'La foto no se pudo leer. Vuelve a capturarla.';
  if (foto.width && foto.height && (foto.width < 640 || foto.height < 480)) {
    return 'La foto es muy pequeña. Usa al menos 800 × 600 px.';
  }
  return '';
}

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
    if (s.i >= 3 || pct >= 40) severas += 1;
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
export function bloqueMasCercano(lat, lng, maxMetros = 120) {
  let best = null;
  let bestD = Infinity;
  for (const b of LISTA_BLOQUES) {
    const d = dist(lat, lng, b.lat, b.lng);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best && bestD <= maxMetros ? best.clave : null;
}

// notas del backend: guardamos el bloque como prefijo legible "Bloque K · <texto>".
export function construirNotas(bloque, texto = '') {
  const t = (texto || '').trim();
  return t ? `Bloque ${bloque} · ${t}` : `Bloque ${bloque}`;
}

export function parseBloqueDeNotas(notas = '') {
  const m = /bloque\s+([a-z0-9]+)/i.exec(notas || '');
  return m ? m[1].toUpperCase() : null;
}

// Deriva el bloque de una medición: mapa local -> notas -> GPS más cercano.
export function bloqueDeMedicion(m, mapaLocal = {}) {
  if (!m) return null;
  if (mapaLocal[m.id_medicion]) return mapaLocal[m.id_medicion];
  const porNotas = parseBloqueDeNotas(m.notas);
  if (porNotas && BLOQUES_CAMPUS[porNotas]) return porNotas;
  const lat = m.latitud_real ?? m.punto_info?.coordenadas?.lat;
  const lng = m.longitud_real ?? m.punto_info?.coordenadas?.lng;
  if (lat != null && lng != null) {
    const cerca = bloqueMasCercano(lat, lng, 150);
    if (cerca) return cerca;
  }
  return null;
}

// Agrupa mediciones por bloque del campus (para la pantalla Carpetas).
export function agruparPorBloque(mediciones = [], mapaLocal = {}) {
  const grupos = {};
  for (const clave of Object.keys(BLOQUES_CAMPUS)) grupos[clave] = [];
  const sinBloque = [];
  for (const m of mediciones) {
    const b = bloqueDeMedicion(m, mapaLocal);
    if (b && grupos[b]) grupos[b].push(m);
    else sinBloque.push(m);
  }
  const orden = (arr) => arr.sort((a, z) => new Date(z.timestamp || 0) - new Date(a.timestamp || 0));
  const salida = Object.entries(grupos).map(([clave, items]) => ({
    clave,
    bloque: BLOQUES_CAMPUS[clave],
    items: orden(items),
    peorPct: items.length ? Math.max(...items.map((m) => num(m.area_corroida_pct, 0))) : 0,
  }));
  if (sinBloque.length) {
    salida.push({
      clave: 'SIN_BLOQUE',
      bloque: { clave: 'SIN_BLOQUE', nombre: 'Sin bloque', detalle: 'Fuera del campus' },
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

export { CIUDAD };
