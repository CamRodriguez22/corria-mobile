import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { Button, Segmented, EmptyState } from '../DesignComponents';
import GaleriaFotos from '../GaleriaFotos';
import MapaCalor from '../MapaCalor';
import { TOKENS } from '../DesignTokens';
import { nombrePuntoDe } from '../helpers';
import { filasDeGaleria } from '../galeria';
import { filtrarMediciones, FILTROS_VACIOS, hayFiltros, textoResultados } from '../linea';
import { hoyLocal, partesDia } from '../fechas';
import { bloqueDeMedicion } from '../utils';

const PAD = TOKENS.spacing.lg;

export default function ActivityScreen({
  mediciones,
  bloqueMap,
  bloquesMap,
  refreshing,
  hayMas,
  cargandoMas,
  onCargarMas,
  onRefresh,
  onOpen,
  onAbrirLote,
  resumenes = {},
  onCargarResumen,
  onCargarRango,
}) {
  const hoy = hoyLocal();
  const [anio, setAnio] = useState(partesDia(hoy)?.anio || 2026);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const resumen = resumenes[anio];

  // Mapa de días del año elegido (se guarda por año en App).
  useEffect(() => {
    onCargarResumen?.(anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, refreshing]);

  // Al elegir un día se traen TODAS sus fotos (pueden ser más antiguas que las ya cargadas).
  useEffect(() => {
    if (filtros.dia) onCargarRango?.({ desde: filtros.dia, hasta: filtros.dia });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.dia, refreshing]);

  const listaPuntos = useMemo(() => Object.values(bloquesMap || {}), [bloquesMap]);
  const filtradas = useMemo(
    () =>
      filtrarMediciones(mediciones, filtros, {
        hoy,
        clavePunto: (m) => bloqueDeMedicion(m, bloqueMap, listaPuntos.length ? listaPuntos : undefined),
      }),
    [mediciones, filtros, hoy, bloqueMap, listaPuntos]
  );
  const filas = useMemo(() => filasDeGaleria(filtradas, { hoy }), [filtradas, hoy]);
  const filtrado = hayFiltros(filtros);

  const nivelSel = filtros.niveles.length === 1 ? filtros.niveles[0] : 'all';

  const cabecera = (
    <View style={{ padding: PAD, paddingBottom: 4 }}>
      <Text style={{ ...TOKENS.type.headlineMedium, color: TOKENS.colors.text }}>Actividad</Text>
      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 4, marginBottom: 18 }}>
        Todas las fotos, día por día
      </Text>
      <MapaCalor
        anio={anio}
        setAnio={setAnio}
        resumen={resumen}
        diaSel={filtros.dia}
        onSelDia={(dia) => setFiltros((f) => ({ ...f, dia }))}
        onReintentar={() => onCargarResumen?.(anio, { forzar: true })}
        hoy={hoy}
      />
      <View style={{ height: 18 }} />
      <Segmented
        scroll
        value={nivelSel}
        onChange={(v) => setFiltros((f) => ({ ...f, niveles: v === 'all' ? [] : [v] }))}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 0, label: 'Sin corrosión' },
          { value: 1, label: 'Leve' },
          { value: 2, label: 'Moderada' },
          { value: 3, label: 'Severa' },
        ]}
      />
      <Text accessibilityLiveRegion="polite" style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 12 }}>
        {textoResultados(filtradas.length, filtrado)}
      </Text>
    </View>
  );

  return (
    <GaleriaFotos
      filas={filas}
      nombrePunto={(m) => nombrePuntoDe(m, bloqueMap, bloquesMap)}
      onAbrirFoto={onOpen}
      onAbrirLote={(f) => onAbrirLote?.(f.loteClave)}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={
        <View style={{ paddingVertical: 30 }}>
          <EmptyState title="Sin fotos" subtitle="No hay fotos que coincidan con estos filtros." />
        </View>
      }
      ListFooterComponent={
        hayMas && !filtros.dia ? (
          <View style={{ padding: PAD }}>
            <Button
              variant="tonal"
              label={cargandoMas ? 'Cargando más…' : 'Cargar fotos anteriores'}
              onPress={onCargarMas}
              loading={cargandoMas}
            />
          </View>
        ) : (
          <View style={{ height: 36 }} />
        )
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
    />
  );
}
