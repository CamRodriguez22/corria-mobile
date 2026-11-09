// src/notas.js — Lógica pura de las notas (espesor y descripción) del resultado: cuándo difieren de lo guardado
// en el teléfono y cómo guardarlas sin perderlas si el almacenamiento falla. Sin React Native.

export const MENSAJE_NOTA_NO_GUARDADA = 'No se pudo guardar la nota; se reintentará';

// ¿Las notas escritas difieren de lo guardado? Solo cuenta si hay un resultado abierto y algo escrito
// (o algo ya guardado que se borró).
export function notasCambiaron({ hayResultado = false, guardada = null, espesor = '', descripcion = '' } = {}) {
  if (!hayResultado) return false;
  const distinto = String(guardada?.espesor || '') !== String(espesor) || String(guardada?.descripcion || '') !== String(descripcion);
  return distinto && Boolean(String(espesor).trim() || String(descripcion).trim() || guardada);
}

// Guarda las notas de `id` mezcladas con `obsMap`. `guardar(mapa)` persiste (puede lanzar). Nunca lanza:
// si falla devuelve { ok: false } y el mapa anterior, para que el estado local siga igual y el próximo
// cambio reintente. `avisoPendiente` evita repetir el aviso en cada intento fallido seguido.
export async function guardarNota({ obsMap = {}, id, espesor = '', descripcion = '', guardar, avisoPendiente = false }) {
  const nuevo = { ...obsMap, [id]: { espesor, descripcion } };
  try {
    // saveLocal no lanza: devuelve false cuando falla.
    if ((await guardar(nuevo)) === false) throw new Error('no se pudo guardar');
    return { ok: true, obsMap: nuevo, avisar: false, avisoPendiente: false };
  } catch {
    return { ok: false, obsMap, avisar: !avisoPendiente, avisoPendiente: true };
  }
}

// Borrador (espesor y descripción) que corresponde a la foto `id`: lo guardado para esa foto o vacío.
// Las notas pertenecen a UNA medición: al cambiar de resultado o al empezar un análisis se vuelve a partir de aquí,
// para que las notas de la foto A nunca se guarden bajo la foto B.
export function borradorDe(obsMap = {}, id) {
  const g = (id && obsMap && obsMap[id]) || null;
  return { espesor: g?.espesor || '', descripcion: g?.descripcion || '' };
}

// Al salir del resultado: si había notas sin guardar y el guardado falló, NO se sigue (el borrador se conserva
// en pantalla) y se pregunta al usuario; en cualquier otro caso se sigue con la salida normal.
//   cambioNotas: había notas distintas de lo guardado · guardadoOk: resultado de intentar guardarlas (true/false)
export function decidirSalida({ cambioNotas = false, guardadoOk = true } = {}) {
  return cambioNotas && guardadoOk === false ? 'nota_fallida' : 'seguir';
}

export const MENSAJE_NOTA_AL_SALIR =
  'La nota sigue en pantalla pero no se pudo guardar en el teléfono. Si continúas sin guardarla, se perderá.';
