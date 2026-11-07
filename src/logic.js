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

// Renombrar un lote: el backend exige poder gestionar TODAS las mediciones del
// lote (el técnico solo si todas son suyas).
export function puedeGestionarLote(perfil, mediciones = []) {
  if (!perfil || !mediciones.length) return false;
  return mediciones.every((m) => puedeGestionarMedicion(perfil, m));
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

// Umbrales de severidad del backend (pf_corrosion_infra/lambda_src/inference/handler.py)
// 0: Sin corrosión (<= 0%)
// 1: Leve (< 10%)
// 2: Moderada (10% a < 25%)
// 3: Severa (>= 25%)
export function calcularNivelCorrosion(areaPct) {
  const n = Number(areaPct);
  if (Number.isNaN(n) || n <= 0) return 0;
  if (n < 10) return 1;
  if (n < 25) return 2;
  return 3;
}

// Cálculo agregado de métricas para un lote de mediciones
export function calcularMetricasLote(items = []) {
  if (!items.length) return { total: 0, avgPct: 0, maxPct: 0, maxNivel: 0 };
  const pcts = items.map((m) => Math.max(0, Number(m.area_corroida_pct || 0)));
  const total = items.length;
  const maxPct = Math.max(...pcts);
  const avgPct = pcts.reduce((acc, v) => acc + v, 0) / total;
  return {
    total,
    avgPct,
    maxPct,
    maxNivel: calcularNivelCorrosion(maxPct),
  };
}
