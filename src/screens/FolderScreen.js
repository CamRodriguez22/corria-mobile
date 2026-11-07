import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { Screen, Header, MeasurementRow, EmptyState } from '../DesignComponents';
import { TOKENS, num } from '../DesignTokens';
import { formatDateTime, agruparPorBloque } from '../utils';

const PAD = TOKENS.spacing.lg;

export default function FolderScreen({
  clave,
  mediciones,
  bloqueMap,
  bloquesMap,
  listaBloques,
  empresaLinea,
  onBack,
  onOpen,
}) {
  const bloque = bloquesMap[clave] || { nombre: 'Sin punto' };
  const items = useMemo(
    () =>
      agruparPorBloque(mediciones, bloqueMap, listaBloques).find((g) => g.clave === clave)?.items || [],
    [mediciones, bloqueMap, listaBloques, clave]
  );

  return (
    <Screen>
      <Header
        title={bloque.nombre}
        subtitle={empresaLinea || undefined}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}>
        {items.length ? (
          items.map((m) => (
            <MeasurementRow
              key={m.id_medicion}
              medicion={m}
              title={`${num(m.area_corroida_pct, 0).toFixed(0)}% corroído`}
              subtitle={formatDateTime(m.timestamp)}
              onPress={() => onOpen(m)}
            />
          ))
        ) : (
          <EmptyState
            title="Punto sin mediciones"
            subtitle="Todavía no se han subido inspecciones asociadas a este punto."
          />
        )}
      </ScrollView>
    </Screen>
  );
}
