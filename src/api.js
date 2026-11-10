// src/api.js — Fachada del cliente de API. Con EXPO_PUBLIC_DEMO=1 (solo `npm run demo`) usa los datos
// sintéticos de src/demo/api-demo.js; sin la variable es EXACTAMENTE src/api-real.js. La comparación
// va literal para que Metro elimine la rama demo (y su módulo) del bundle de producción.
const impl = process.env.EXPO_PUBLIC_DEMO === '1' ? require('./demo/api-demo') : require('./api-real');

export const getMiPerfil = impl.getMiPerfil;
export const getBloques = impl.getBloques;
export const getIndicadores = impl.getIndicadores;
export const getMedicionesRecientes = impl.getMedicionesRecientes;
export const getMedicionCompleta = impl.getMedicionCompleta;
export const getMedicionesPunto = impl.getMedicionesPunto;
export const getResumenDiario = impl.getResumenDiario;
export const renombrarMedicion = impl.renombrarMedicion;
export const renombrarLote = impl.renombrarLote;
export const eliminarMedicion = impl.eliminarMedicion;
export const resolverBloqueId = impl.resolverBloqueId;
export const subirMedicion = impl.subirMedicion;
