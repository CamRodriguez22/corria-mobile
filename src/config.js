// src/config.js — Única fuente de verdad. No duplicar en App.js.
// Pool ID y Client ID no son secretos, pero no deben estar hardcodeados en App.js.
// Para producción final: mover a app.json > extra o a variables de entorno.

export const AWS_CONFIG = {
  userPoolId: 'us-east-1_nirWPCLK5',
  userPoolClientId: '5vp9op8mlq07qbahpna4fjeld0',
  region: 'us-east-1',
  // API Gateway (Cognito authorizer). Contrato verificado en vivo el 2026-09-06:
  //   Authorization: <ID token>   (token crudo, SIN "Bearer ")
  //   GET  /usuarios/me
  //   GET  /bloques                              -> { bloques: [...] } (filtrado por empresa del caller)
  //   POST /bloques                              -> bloque creado (tecnico/admin; NO cliente)
  //   GET  /mediciones/recientes?limit=N        -> { total, mediciones: [...] }   (máx 100)
  //   GET  /mediciones/{id_punto}               -> [ ...mediciones ]
  //   GET  /alertas?horas=N&nivel_minimo=LEVE|MODERADA|SEVERA|CRITICA
  //   POST /medicion                            -> objeto medición (corre YOLO); requiere bloque_id en la raíz
  //   DELETE /mediciones/{id_punto}?id_medicion={id_medicion}  -> { ok: true }
  // NOTA (2026-09-12): /puntos quedó retirado tras la fusión Punto→Bloque del backend real.
  apiBase: 'https://yzesth1il5.execute-api.us-east-1.amazonaws.com/prod',
};

export const APP_CONFIG = {
  // Radio (m) para agrupar una foto nueva con un punto de inspección ya existente.
  radioAgrupacionMetros: 100,
  // Límite real del backend para GET /mediciones/recientes.
  limiteHistorialMax: 100,
  // Traemos pocas para el móvil: cada medición real puede traer máscaras de cientos de KB.
  limiteHistorialMovil: 15,
  paginaHistorial: 10,
  // Clave de AsyncStorage.
  storageKeys: {
    historialCache: 'pixelrust_historial_cache',
    bloquePorMedicion: 'pixelrust_bloque_por_medicion',
    obsPorMedicion: 'pixelrust_obs_por_medicion',
    borradorPendiente: 'pixelrust_borrador_pendiente',
  },
  carpetaFotos: 'PIXELRUST_Mediciones',
};

// ─────────────────────────────────────────────────────────────
// Contexto institucional por defecto (fallback hasta cargar perfil).
// ─────────────────────────────────────────────────────────────
export const ENTIDAD = 'PixelRust';
export const CIUDAD = 'Barranquilla';
export const DEPARTAMENTO = 'Atlántico';

export const BLOQUES_CAMPUS = {};
export const LISTA_BLOQUES = [];
