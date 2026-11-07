import React, { useState, useMemo } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { Button, Segmented, EmptyState } from '../DesignComponents';
import GaleriaFotos from '../GaleriaFotos';
import { TOKENS, severidad } from '../DesignTokens';
import { nombrePuntoDe } from '../helpers';
import { filasDeGaleria } from '../galeria';

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
}) {
  const [filtro, setFiltro] = useState('all');

  const filtradas = useMemo(() => {
    if (filtro === 'all') return mediciones;
    return mediciones.filter((m) => severidad(m).i === filtro);
  }, [mediciones, filtro]);

  const filas = useMemo(() => filasDeGaleria(filtradas), [filtradas]);

  const cabecera = (
    <View style={{ padding: PAD, paddingBottom: 4 }}>
      <Text style={{ ...TOKENS.type.headlineMedium, color: TOKENS.colors.text }}>Actividad</Text>
      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 4, marginBottom: 14 }}>
        Todas las fotos, día por día
      </Text>
      <Segmented
        scroll
        value={filtro}
        onChange={setFiltro}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 0, label: 'Sin corrosión' },
          { value: 1, label: 'Leve' },
          { value: 2, label: 'Moderada' },
          { value: 3, label: 'Severa' },
        ]}
      />
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
          <EmptyState title="Sin mediciones registradas" subtitle="No hay inspecciones que coincidan con este filtro." />
        </View>
      }
      ListFooterComponent={
        hayMas ? (
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
