// src/config.js - Unica fuente de verdad, no duplicar en App.js
// Pool ID y Client ID no son secretos pero no deben estar duplicados ni hardcodeados en App.js
// Para produccion final, mover a .env y app.json extra

export const AWS_CONFIG = {
  userPoolId: 'us-east-1_nirWPCLK5',
  userPoolClientId: '5vp9op8mlq07qbahpna4fjeld0',
  region: 'us-east-1',
  apiBase: 'https://yzesth1il5.execute-api.us-east-1.amazonaws.com/prod',
};

export const APP_CONFIG = {
  radioAgrupacionMetros: 100,
  // Limite REAL confirmado del backend para GET /mediciones/recientes (contrato de API, no adivinado).
  // Pedir mas de esto no rompe nada pero el backend igual lo capea - mejor no mandar un numero mayor
  // desde el cliente para que quede claro cual es el limite real si alguien lee este archivo.
  limiteHistorialMax: 100,
};