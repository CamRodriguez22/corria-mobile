// src/cola.js — Texto de estado de cada foto de la cola de análisis. Sin React Native.
import { nivelDeMedicion, nombreNivel } from './niveles.js';
import { formatoPct } from './fechas.js';

// Etapa del backend (preparando_subida | subiendo_s3 | analizando_ia | completado) a texto corto.
export function textoEtapa(etapa) {
  switch (etapa) {
    case 'preparando_subida': return 'Preparando la subida';
    case 'subiendo_s3': return 'Subiendo la foto';
    case 'analizando_ia': return 'Analizando la corrosión';
    default: return 'Procesando';
  }
}

// Estado visible de una foto de la cola: { clave, texto } con clave en
// 'espera' | 'activa' | 'lista' | 'error'. `etapa` solo aplica a la foto activa.
export function estadoFotoCola(item = {}, etapa = '') {
  if (item.status === 'lista') {
    const m = item.medicion || {};
    const nivel = nombreNivel(nivelDeMedicion(m));
    return { clave: 'lista', texto: `${nivel} · ${formatoPct(m.area_corroida_pct)}` };
  }
  if (item.status === 'error') return { clave: 'error', texto: item.error || 'No se pudo analizar' };
  if (item.status === 'subiendo' || item.status === 'analizando') return { clave: 'activa', texto: textoEtapa(etapa) };
  return { clave: 'espera', texto: 'En espera' };
}

// "2 de 5 fotos listas" (y fallos aparte). Solo para la barra de avance.
export function resumenAvance(cola = []) {
  const total = cola.length;
  const listas = cola.filter((f) => f.status === 'lista').length;
  const fallidas = cola.filter((f) => f.status === 'error').length;
  const hechas = listas + fallidas;
  return {
    total,
    listas,
    fallidas,
    porcentaje: total ? Math.round((hechas / total) * 100) : 0,
    texto: `${listas} de ${total} ${total === 1 ? 'foto lista' : 'fotos listas'}${fallidas ? ` · ${fallidas} con error` : ''}`,
  };
}

// Índice de la foto que se está procesando (la primera subiendo; si no, la primera en espera).
export function indiceActivo(cola = []) {
  const i = cola.findIndex((f) => f.status === 'subiendo' || f.status === 'analizando');
  if (i >= 0) return i;
  return cola.findIndex((f) => f.status === 'esperando' || !f.status);
}
