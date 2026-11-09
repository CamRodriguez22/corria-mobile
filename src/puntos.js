// src/puntos.js — Filas de la pestaña Puntos. Sin React Native.
// Cada punto muestra cuántas fotos tiene y su estado actual (promedio del día más reciente con fotos).
// Con el resumen por día del servidor (GET /mediciones/resumen-diario?id_punto=) las cifras son las reales;
// mientras no llega (o si está truncado) se calculan SOLO con las fotos ya cargadas en el teléfono.
import { estadoPunto, ordenarPuntosPorGravedad } from './galeria.js';
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
