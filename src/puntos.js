// src/puntos.js — Filas de la pestaña Puntos. Sin React Native.
// Cada punto muestra cuántas fotos tiene y su estado actual (promedio del día más reciente con fotos).
// Con el resumen por día del servidor (GET /mediciones/resumen-diario?id_punto=) las cifras son las reales;
// mientras no llega (o si está truncado) se calculan SOLO con las fotos ya cargadas en el teléfono.
import { estadoPunto, ordenarPuntosPorGravedad, tituloPunto } from './galeria.js';
import { nivelDePct, nivelAcotado } from './niveles.js';

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

// Resumen de un punto a partir de sus `dias` (resumen-diario, uno o varios años).
// null si no hay ningún día con fotos. `ultima`: día más reciente con fotos.
export function resumenDePunto(dias = []) {
  const conFotos = (dias || []).filter((d) => d && d.fecha && Number(d.total) > 0);
  if (!conFotos.length) return null;
  const fotos = conFotos.reduce((t, d) => t + Number(d.total), 0);
  const ultima = conFotos.reduce((a, d) => (d.fecha > a.fecha ? d : a));
  const promedio = esNumero(ultima.promedio_pct) ? ultima.promedio_pct : null;
  const nivel = promedio !== null ? nivelDePct(promedio) : nivelAcotado(ultima.peor_nivel);
  return { fotos, dia: ultima.fecha, promedio, nivel };
}

// Fila de un punto. `resumenes` = resúmenes por año guardados ({ estado, dias, truncado }) de ese punto.
// Usa los del servidor solo si TODOS llegaron bien y ninguno está truncado; si no, las fotos cargadas.
// `fuente` dice cuál se usó ('servidor' | 'local') para rotular cifras parciales.
export function filaDePunto({ clave, nombre, items = [], resumenes = [] }) {
  const local = estadoPunto(items);
  const completo = resumenes.length > 0 && resumenes.every((r) => r && r.estado === 'ok' && !r.truncado);
  const srv = completo ? resumenDePunto(resumenes.flatMap((r) => r.dias || [])) : null;
  if (completo) {
    // Un servidor sin días y fotos locales: gana lo local (no mostrar "0 fotos" con fotos a la vista).
    if (srv && srv.fotos >= items.length) {
      return {
        clave,
        nombre,
        fotos: srv.fotos,
        estado: { dia: srv.dia, promedio: srv.promedio, nivel: srv.nivel },
        fuente: 'servidor',
        ultima: items[0] || null,
      };
    }
    if (!srv && !items.length) return { clave, nombre, fotos: 0, estado: null, fuente: 'servidor', ultima: null };
  }
  return {
    clave,
    nombre,
    fotos: items.length,
    estado: local ? { dia: local.dia, promedio: local.promedio, nivel: local.nivel } : null,
    fuente: 'local',
    ultima: items[0] || null,
  };
}

// Filas ordenadas del punto más grave al menos grave; los puntos sin fotos van al final.
export function filasDePuntos(filas = []) {
  return ordenarPuntosPorGravedad(filas.map((f) => ({ ...f })));
}

export function totalFotosPuntos(filas = []) {
  return filas.reduce((t, f) => t + f.fotos, 0);
}

// Chips de Inicio para cambiar de punto en la gráfica: del más grave al menos grave (según las fotos cargadas;
// los puntos sin fotos al final). `grupos` = [{ clave, bloque: { nombre }, estado: estadoPunto(items) }].
export function chipsDePuntos(grupos = []) {
  return ordenarPuntosPorGravedad(grupos.filter((g) => g && g.clave && g.clave !== 'SIN_BLOQUE')).map((g) => ({
    clave: g.clave,
    nombre: tituloPunto(g.bloque?.nombre),
    nivel: g.estado ? g.estado.nivel : null,
  }));
}

// Punto que muestra la gráfica de Inicio: el elegido si sigue existiendo; si no, el de "Requiere atención";
// si tampoco está, el primero de la lista (el más grave). null si no hay puntos.
export function puntoDeTendencia(elegido, claveAtencion, claves = []) {
  if (elegido && claves.includes(elegido)) return elegido;
  if (claveAtencion && claves.includes(claveAtencion)) return claveAtencion;
  return claves[0] || null;
}

// Estado del día más reciente con fotos según el resumen por día del servidor (cuenta TODAS las fotos del día,
// no solo las cargadas). Misma forma que `estadoPunto`: { dia, nivel, promedio, fotos, peor, peorPct }.
export function estadoDesdeResumen(dias = []) {
  const conFotos = (dias || []).filter((d) => d && d.fecha && Number(d.total) > 0);
  if (!conFotos.length) return null;
  const d = conFotos.reduce((a, x) => (x.fecha > a.fecha ? x : a));
  const promedio = esNumero(d.promedio_pct) ? d.promedio_pct : null;
  const nivel = promedio !== null ? nivelDePct(promedio) : nivelAcotado(d.peor_nivel);
  const maxPct = esNumero(d.max_pct) ? d.max_pct : null;
  return {
    dia: d.fecha,
    nivel,
    promedio,
    fotos: Number(d.total),
    peor: Number.isInteger(d.peor_nivel) ? nivelAcotado(d.peor_nivel) : maxPct !== null ? nivelDePct(maxPct) : nivel,
    peorPct: maxPct,
  };
}

// Estado que muestra el detalle del punto. Con el resumen del servidor completo (todos los años bien cargados y sin
// truncar) manda el servidor; si no, se calcula con las fotos cargadas y se marca `parcial` cuando aún hay más fotos
// por cargar (el promedio/peor del día podría cambiar).
//   resumenes: [{ estado, dias, truncado }]; local: estadoPunto(lista); hayMas: ¿faltan fotos por cargar?
export function elegirEstadoPunto({ resumenes = [], local = null, hayMas = false } = {}) {
  const completo = resumenes.length > 0 && resumenes.every((r) => r && r.estado === 'ok' && !r.truncado);
  if (completo) {
    const srv = estadoDesdeResumen(resumenes.flatMap((r) => r.dias || []));
    if (srv) return { estado: srv, parcial: false, fuente: 'servidor' };
  }
  return { estado: local, parcial: Boolean(local) && Boolean(hayMas), fuente: 'local' };
}

// Years arrive oldest first; enqueue every point's current year before historical years.
export function solicitudesResumenPuntos(anios = [], puntos = [], forzar = false) {
  return [...anios].reverse().flatMap((anio) =>
    puntos.map((idPunto) => ({ anio, opciones: { idPunto, forzar } }))
  );
}
