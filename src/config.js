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
  //   GET  /puntos?limit=200
  //   GET  /puntos/{id_punto}
  //   GET  /mediciones/recientes?limit=N        -> { total, mediciones: [...] }   (máx 100)
  //   GET  /mediciones/{id_punto}               -> [ ...mediciones ]
  //   GET  /alertas?horas=N&nivel_minimo=LEVE|MODERADA|SEVERA|CRITICA
  //   POST /medicion                            -> objeto medición (corre YOLO)
  //   DELETE /mediciones/{id_punto}?id_medicion={id_medicion}  -> { ok: true }
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
    borradorPendiente: 'pixelrust_borrador_pendiente',
  },
  carpetaFotos: 'PIXELRUST_Mediciones',
};

// ─────────────────────────────────────────────────────────────
// Contexto institucional del proyecto (demo Uninorte).
// El backend NO tiene concepto de "bloque": trabaja con puntos geolocalizados.
// Aquí los bloques del campus son una etiqueta visual mapeada a coordenadas fijas;
// la app las usa para decidir la ubicación real que se envía al backend.
// ─────────────────────────────────────────────────────────────
export const ENTIDAD = 'Uninorte';
export const CIUDAD = 'Barranquilla';

export const BLOQUES_CAMPUS = {
  G: { clave: 'G', nombre: 'Bloque G', detalle: 'Aulas', lat: 11.0192, lng: -74.8515, radio: 60 },
  J: { clave: 'J', nombre: 'Bloque J', detalle: 'Laboratorios', lat: 11.0180, lng: -74.8503, radio: 60 },
  K: { clave: 'K', nombre: 'Bloque K', detalle: 'Oficinas', lat: 11.0198, lng: -74.8495, radio: 60 },
  L: { clave: 'L', nombre: 'Bloque L', detalle: 'Biblioteca', lat: 11.0175, lng: -74.8522, radio: 60 },
};

export const LISTA_BLOQUES = Object.values(BLOQUES_CAMPUS);
