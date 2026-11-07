import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Button, Segmented, EmptyState } from '../DesignComponents';
import { TOKENS, num, severidad } from '../DesignTokens';
import { IconChevronRight } from '../Icons';
import { tituloBloque } from '../helpers';

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
}) {
  const [filtro, setFiltro] = useState('all');

  const filtradas = useMemo(() => {
    if (filtro === 'all') return mediciones;
    return mediciones.filter((m) => severidad(m).i === filtro);
  }, [mediciones, filtro]);

  // Agrupación cronológica por día
  const eventosPorDia = useMemo(() => {
    const grupos = {};
    for (const m of filtradas) {
      const fecha = m.timestamp ? new Date(m.timestamp) : new Date();
      const fechaClave = !isNaN(fecha.getTime())
        ? fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Recientes';
      if (!grupos[fechaClave]) grupos[fechaClave] = [];
      grupos[fechaClave].push(m);
    }
    return Object.entries(grupos);
  }, [filtradas]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
    >
      <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>Línea de tiempo</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 4, marginBottom: 14 }}>
        Historial cronológico de inspecciones
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

      <View style={{ marginTop: 20 }}>
        {eventosPorDia.length ? (
          eventosPorDia.map(([dia, items]) => (
            <View key={dia} style={{ marginBottom: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TOKENS.colors.accent }} />
                <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '700', color: TOKENS.colors.neutral800, textTransform: 'capitalize' }}>
                  {dia}
                </Text>
                <Text style={{ fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500 }}>
                  ({items.length} {items.length === 1 ? 'medición' : 'mediciones'})
                </Text>
              </View>

              <View style={{ paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: TOKENS.colors.neutral200, marginLeft: 3 }}>
                {items.map((m) => {
                  const s = severidad(m);
                  const hora = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  const titulo = m.nombre || tituloBloque(m, bloqueMap, bloquesMap);
                  return (
                    <Pressable
                      key={m.id_medicion}
                      onPress={() => onOpen(m)}
                      accessibilityRole="button"
                      accessibilityLabel={`${titulo}, ${s.label}, ${num(m.area_corroida_pct, 0).toFixed(1)}% corroído`}
                      style={{
                        backgroundColor: TOKENS.colors.surfaceAlt,
                        borderRadius: TOKENS.radius.md,
                        padding: 14,
                        marginBottom: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        minHeight: 56,
                        borderWidth: 1,
                        borderColor: TOKENS.colors.border,
                        ...TOKENS.shadow.sm,
                      }}
                    >
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: s.color }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text }}>
                            {titulo}
                          </Text>
                          <Text style={{ fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500 }}>
                            {hora}
                          </Text>
                        </View>
                        <Text style={{ fontSize: TOKENS.fontSizes.small, color: s.texto, fontWeight: '600', marginTop: 2 }}>
                          {num(m.area_corroida_pct, 0).toFixed(1)}% · {s.label}
                        </Text>
                        {!!m.lote_nombre && (
                          <Text style={{ fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500, marginTop: 2 }}>
                            Lote: {m.lote_nombre}
                          </Text>
                        )}
                      </View>
                      <IconChevronRight size={18} color={TOKENS.colors.neutral500} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        ) : (
          <View style={{ paddingVertical: 30 }}>
            <EmptyState title="Sin mediciones registradas" subtitle="No hay inspecciones que coincidan con este filtro." />
          </View>
        )}
        {hayMas && (
          <View style={{ marginTop: 14 }}>
            <Button
              variant="secondary"
              label={cargandoMas ? 'Cargando más…' : 'Cargar mediciones anteriores'}
              onPress={onCargarMas}
              loading={cargandoMas}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}
