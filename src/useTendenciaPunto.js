// useTendenciaPunto.js — Pide el resumen por día de un punto (año en curso y el anterior) y arma los datos de
// GraficaTendencia. Lo comparten el detalle del punto y Inicio. `resumenes` y `onCargarResumen` vienen de App.
import { useEffect, useMemo } from 'react';
import { aniosDisponibles } from './linea';
import { puntosTendencia } from './tendencia';
import { hoyLocal } from './fechas';

// `forzar` (p. ej. al tirar para refrescar) vuelve a pedir el resumen aunque ya esté guardado.
export default function useTendenciaPunto(clave, resumenes = {}, onCargarResumen, { forzar = false } = {}) {
  const anios = useMemo(() => aniosDisponibles(hoyLocal()).slice(-2), []);
  useEffect(() => {
    if (!clave || clave === 'SIN_BLOQUE') return;
    anios.forEach((a) => onCargarResumen?.(a, { idPunto: clave, forzar }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, forzar]);

  const resumenesPunto = anios.map((a) => resumenes[`${clave}|${a}`]);
  const dias = resumenesPunto.flatMap((r) => r?.dias || []);
  const puntos = useMemo(() => puntosTendencia(dias), [resumenes, clave]); // eslint-disable-line react-hooks/exhaustive-deps
  const estado = resumenesPunto.some((r) => r?.estado === 'cargando') ? 'cargando' : resumenesPunto.some((r) => r?.estado === 'error') ? 'error' : 'ok';
  return {
    anios,
    resumenesPunto,
    dias,
    puntos,
    estado,
    truncado: resumenesPunto.some((r) => r?.truncado),
    error: resumenesPunto.find((r) => r?.estado === 'error')?.error,
    reintentar: () => anios.forEach((a) => onCargarResumen?.(a, { idPunto: clave, forzar: true })),
  };
}
