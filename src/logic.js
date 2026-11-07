// src/logic.js — Funciones de lógica pura desacopladas de React Native y del DOM.
// Testeables de forma aislada con node:test.

// Nombre corto para plantillas tipo "Punto {x}" / "Bloque {x}"
export function nombreCortoBloque(bloqueObj, claveFallback = '') {
  if (!bloqueObj) return claveFallback;
  return String(bloqueObj.nombre || '').replace(/^bloque\s+/i, '').trim() || claveFallback;
}

// Inicial para el avatar de puntos/carpetas
export function inicialBloque(nombre = '') {
  if (!nombre) return '?';
  const sinPrefijo = String(nombre).replace(/^bloque\s+/i, '').trim();
  return (sinPrefijo[0] || String(nombre)[0] || '?').toUpperCase();
}

// Reglas de permisos alineadas con el backend (api_mediciones: ROLES_GESTION =
// super_admin, admin, tecnico; el técnico solo toca lo que él tomó):
// - admin / super_admin: gestión total de cualquier foto
// - tecnico: solo fotos tomadas por él mismo
// - cliente (y cualquier otro rol): solo lectura
function normalizarRol(perfil) {
  return String(perfil?.rol || '').trim().toLowerCase();
}

// GET /usuarios/me no trae `sub`: el sub de Cognito llega como `cognito_sub`
// (`id_usuario` es un USR-uuid distinto). Las mediciones guardan ese sub en
// tomado_por_id / usuario_id.
function subDelPerfil(perfil) {
  return perfil?.cognito_sub || perfil?.sub || '';
}

function esMedicionPropia(perfil, medicion) {
  const sub = subDelPerfil(perfil);
  return Boolean(sub) && (medicion?.tomado_por_id === sub || medicion?.usuario_id === sub);
}

export function puedeGestionarMedicion(perfil, medicion) {
  if (!perfil) return false;
  const rol = normalizarRol(perfil);
  if (rol === 'admin' || rol === 'super_admin') return true;
  return rol === 'tecnico' && esMedicionPropia(perfil, medicion);
}

// La respuesta de POST /medicion no trae el autor (el backend lo guarda como
// tomado_por_id/usuario_id = sub de Cognito). Se completa con el sub del perfil para que
// el técnico pueda gestionar la foto recién subida sin esperar a recargar la lista.
export function conAutor(medicion, perfil) {
  const sub = subDelPerfil(perfil);
  if (!medicion || !sub) return medicion;
  return {
    ...medicion,
    tomado_por_id: medicion.tomado_por_id || sub,
    usuario_id: medicion.usuario_id || sub,
  };
}

// Renombrar un lote: el backend exige poder gestionar TODAS las mediciones del
// lote (el técnico solo si todas son suyas).
export function puedeGestionarLote(perfil, mediciones = []) {
  if (!perfil || !mediciones.length) return false;
  return mediciones.every((m) => puedeGestionarMedicion(perfil, m));
}

// Datos de la empresa para encabezados: salen de GET /usuarios/me (empresa_nombre,
// empresa_ciudad, empresa_departamento). Sin perfil o sin esos campos, no se inventa
// ninguna ciudad ni organización: `linea` queda vacía y la pantalla omite la línea.
export function datosEmpresa(perfil) {
  const nombre = String(perfil?.empresa_nombre || '').trim();
  const ciudad = String(perfil?.empresa_ciudad || '').trim();
  const departamento = String(perfil?.empresa_departamento || '').trim();
  return { nombre, ciudad, departamento, linea: [nombre, ciudad].filter(Boolean).join(' · ') };
}

// Traducción humana de errores de autenticación (Cognito) sin jerga técnica
export function traducirAuthError(e) {
  const name = e?.name || '';
  const msg = e?.message || 'No se pudo iniciar sesión.';
  if (name === 'UserNotFoundException' || name === 'NotAuthorizedException')
    return 'Correo o contraseña incorrectos.';
  if (name === 'UserNotConfirmedException') return 'Tu cuenta no está confirmada. Revisa tu correo.';
  if (name === 'PasswordResetRequiredException') return 'Debes restablecer tu contraseña.';
  if (name === 'TooManyRequestsException' || name === 'LimitExceededException')
    return 'Demasiados intentos. Espera un momento.';
  return msg;
}

// Umbrales de severidad: ver src/niveles.js (única fuente; DesignTokens.severidadDePct delega ahí).
export { nivelDePct, num } from './niveles.js';

// El backend limita las acciones en lote a LOTE_MAX = 100 mediciones por solicitud
// (api_mediciones/handler.py); un lote más grande se envía por tandas.
export const LOTE_MAX_BACKEND = 100;
export function dividirEnTandas(items = [], tam = LOTE_MAX_BACKEND) {
  const tandas = [];
  for (let i = 0; i < items.length; i += tam) tandas.push(items.slice(i, i + tam));
  return tandas;
}

// Clasifica el error de subir una foto. 409 = la misma foto aún se está analizando (esperar y
// reintentar). 410 = la foto ya se procesó antes y el backend no la reanaliza: reintentar con
// la misma imagen_key daría 410 siempre, así que no es reintentable (el mensaje del backend
// ya dice qué hacer). El resto (red, 5xx) sí se puede reintentar.
export function clasificarErrorSubida(e) {
  const msg = e?.message || 'No se pudo analizar la foto.';
  if (e?.status === 409) {
    return { mensaje: msg, reintentable: true };
  }
  if (e?.status === 410) {
    return {
      mensaje: msg || 'Esta foto ya se procesó antes. Revisa la galería: si no aparece, vuelve a subirla.',
      reintentable: false,
    };
  }
  if (e?.status === 401) return { mensaje: 'Tu sesión expiró. Inicia sesión nuevamente.', reintentable: false };
  return { mensaje: msg, reintentable: true };
}

// ───────────────────────── Paginación de GET /mediciones/recientes ─────────────────────────
// El backend NO tiene cursor. Acepta `limit` (máx. 1000), `desde`/`hasta` (YYYY-MM-DD,
// días locales UTC-5, ambos inclusivos) y, cuando se manda un rango, devuelve
// `truncado: true` si había más resultados que el límite. Para "cargar anteriores"
// se pide `hasta` = día de la medición más antigua cargada: el resultado repite las
// mediciones de ese día (se deduplican por id_medicion) y trae las anteriores.
// DECISIÓN: `hasta` tiene granularidad de DÍA (no de timestamp) y no hay offset, así que el
// backend no puede "saltar" lo ya cargado: el `limit` debe cubrir lo ya cargado de ese día y
// de los anteriores + una página nueva (límite acumulado, tope 1000). Es seguro porque las
// listas usan `resumen=1` (sin máscaras): ~1 KB por medición, 1000 caben en 6 MB.
export const PAGINA_MEDICIONES = 30;
export const LIMITE_MEDICIONES_MAX = 1000;

function tsMs(m) {
  const t = Date.parse(m?.timestamp);
  return Number.isNaN(t) ? null : t;
}

// Parámetros de la siguiente consulta o null si no hay referencia (lista vacía).
export function paginaAnterior(mediciones = [], tamano = PAGINA_MEDICIONES, max = LIMITE_MEDICIONES_MAX) {
  const conFecha = mediciones.map(tsMs).filter((t) => t !== null);
  if (!conFecha.length) return null;
  const masAntigua = Math.min(...conFecha);
  const d = new Date(masAntigua);
  const hasta = d.toISOString().slice(0, 10); // día UTC >= día local UTC-5: nunca se salta datos
  // El rango pedido llega hasta el fin de ese día local (UTC-5) = día siguiente 05:00 UTC.
  const cota = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 5, 0, 0);
  const yaCargadas = conFecha.filter((t) => t <= cota).length;
  return { hasta, limit: Math.min(max, yaCargadas + tamano) };
}

// Une sin duplicar por id_medicion (gana la ya cargada, que puede traer campos locales)
// y ordena de la más reciente a la más antigua.
export function mezclarMediciones(actuales = [], nuevas = []) {
  const vistos = new Set(actuales.map((m) => m.id_medicion));
  const unicas = nuevas.filter((m) => {
    if (vistos.has(m.id_medicion)) return false;
    vistos.add(m.id_medicion);
    return true;
  });
  const lista = [...actuales, ...unicas].sort((a, z) => (tsMs(z) ?? 0) - (tsMs(a) ?? 0));
  return { lista, agregadas: unicas.length };
}

// ¿Puede haber más mediciones en el servidor?
// - con rango, el backend lo dice con `truncado`;
// - sin rango (primera página) se infiere: llegó el máximo pedido.
export function hayMasMediciones(resp, limitePedido, agregadas = 1) {
  if (!resp || agregadas === 0) return false;
  if (typeof resp.truncado === 'boolean') return resp.truncado;
  const total = Array.isArray(resp) ? resp.length : (resp.mediciones || []).length;
  return total >= limitePedido;
}

// Lista de mediciones de una respuesta de GET /mediciones/recientes (objeto o arreglo).
export function listaDeRespuesta(resp) {
  if (Array.isArray(resp)) return resp;
  return resp?.mediciones || resp?.items || [];
}

// API Gateway responde 401 cuando el token de Cognito venció o no es válido.
export function esSesionVencida(e) {
  return e?.status === 401;
}

// Parte `file` del FormData del POST prefirmado a S3. En React Native nativo basta
// {uri,name,type}; en web FormData exige un Blob/File, así que se descarga la URI
// (blob: / data:) a un Blob. `fetchFn` se inyecta para poder probarlo sin red.
export async function parteArchivoForm({ uri, type = 'image/jpeg', nombre = 'foto.jpg', esWeb = false, fetchFn }) {
  if (!esWeb) return { valor: { uri, name: nombre, type }, nombre: undefined };
  const resp = await fetchFn(uri);
  const blob = await resp.blob();
  return { valor: blob, nombre };
}

// ───────────────────────── Navegación hacia atrás ─────────────────────────
// Devuelve los cambios de estado de navegación para "atrás" desde detalle, carpeta o
// pantallas con pestañas, o null si no hay a dónde volver (en Android, salir de la app).
// Salir de una carpeta siempre limpia folderClave y salir de un lote limpia loteSel, para
// que un "atrás" posterior nunca caiga en una carpeta o lote viejo.
export function navegarAtras({ screen, tab, folderClave = null, loteSel = null }) {
  if (screen === 'detail') return { screen: folderClave ? 'folder' : tab };
  if (screen === 'folder') return { screen: 'folders', folderClave: null };
  if (tab === 'lotes' && loteSel) return { loteSel: null };
  if (tab !== 'home') return { tab: 'home', screen: 'home', folderClave: null, loteSel: null };
  return null;
}

// ───────────────────────── Cola de fotos (lote en análisis) ─────────────────────────
// Cada ítem: { uri, base64, status: 'esperando'|'subiendo'|'lista'|'error', error?, imagenKey?, medicion? }
export function resumirCola(cola = []) {
  const listas = cola.filter((f) => f.status === 'lista');
  const fallidas = cola.filter((f) => f.status === 'error');
  return {
    total: cola.length,
    listas: listas.length,
    fallidas: fallidas.length,
    // Las fallidas con `definitivo` (410) no se reintentan: se descartan o se vuelven a tomar.
    reintentables: fallidas.filter((f) => !f.definitivo).length,
    primerError: fallidas[0]?.error || '',
    // Última foto analizada con éxito: su imagen y su medición siempre van juntas.
    ultimaLista: listas.length ? listas[listas.length - 1] : null,
  };
}

// ¿Qué se perdería al salir de la pantalla de resultado? Fotos fallidas de la cola y
// observaciones escritas que no coinciden con lo ya guardado en el teléfono.
export function pendientesAlSalir({ cola = [], espesor = '', descripcion = '', guardada = null } = {}) {
  const fallidas = cola.filter((f) => f.status === 'error').length;
  const reintentables = cola.filter((f) => f.status === 'error' && !f.definitivo).length;
  const e = String(espesor || '').trim();
  const d = String(descripcion || '').trim();
  const obsSinGuardar =
    Boolean(e || d) && (String(guardada?.espesor || '').trim() !== e || String(guardada?.descripcion || '').trim() !== d);
  return { fallidas, reintentables, obsSinGuardar, hay: fallidas > 0 || obsSinGuardar };
}

// Texto de resumen para un lote con varias fotos ("3 de 5 fotos analizadas; 2 fallaron").
export function textoResumenCola({ total, listas, fallidas }) {
  if (total <= 1 && !fallidas) return '';
  const base = `${listas} de ${total} ${total === 1 ? 'foto analizada' : 'fotos analizadas'}`;
  if (!fallidas) return base + '.';
  return `${base}; ${fallidas} ${fallidas === 1 ? 'falló' : 'fallaron'}.`;
}
