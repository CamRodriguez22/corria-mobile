import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { EmptyState } from '../DesignComponents';
import { TOKENS, severidad } from '../DesignTokens';
import { IconPuntos, IconChevronRight } from '../Icons';
import { ENTIDAD, CIUDAD } from '../config';
import { agruparPorBloque } from '../utils';
import { inicialBloque } from '../helpers';

const PAD = TOKENS.spacing.lg;

export default function FoldersScreen({
  mediciones,
  bloqueMap,
  listaBloques,
  refreshing,
  onRefresh,
  onOpen,
}) {
  const grupos = useMemo(
    () => agruparPorBloque(mediciones, bloqueMap, listaBloques),
    [mediciones, bloqueMap, listaBloques]
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
    >
      <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>Puntos</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 4 }}>
        Inspecciones agrupadas por punto de monitoreo
      </Text>

      <View
        style={{
          marginTop: 18,
          marginBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: TOKENS.colors.accent2_100,
          borderRadius: TOKENS.radius.lg,
          padding: 16,
          borderWidth: 1,
          borderColor: TOKENS.colors.accent2_200,
        }}
      >
        <IconPuntos size={22} color={TOKENS.colors.accent2_900} />
        <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '700', color: TOKENS.colors.accent2_900, flex: 1 }}>
          {CIUDAD} · {ENTIDAD}
        </Text>
        <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '700', color: TOKENS.colors.accent2_800 }}>
          {mediciones.length} {mediciones.length === 1 ? 'inspección' : 'inspecciones'}
        </Text>
      </View>

      {grupos.length === 0 ? (
        <EmptyState
          title="Sin puntos con inspecciones"
          subtitle="Cuando registres fotos asociadas a puntos, aparecerán organizadas aquí."
        />
      ) : (
        grupos.map((g) => {
          const sev = severidad({ area_corroida_pct: g.peorPct });
          return (
            <Pressable
              key={g.clave}
              onPress={() => onOpen(g.clave)}
              accessibilityRole="button"
              accessibilityLabel={`${g.bloque.nombre}, ${g.items.length} mediciones, severidad máxima ${g.peorPct.toFixed(0)}%`}
              style={({ pressed }) => [
                {
                  backgroundColor: TOKENS.colors.surfaceAlt,
                  borderRadius: TOKENS.radius.lg,
                  padding: 16,
                  marginTop: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  opacity: pressed ? 0.85 : 1,
                  borderWidth: 1,
                  borderColor: TOKENS.colors.border,
                  minHeight: 64,
                  ...TOKENS.shadow.sm,
                },
              ]}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: sev.tint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: TOKENS.fontSizes.h4, fontWeight: '800', color: sev.texto }}>
                  {g.clave === 'SIN_BLOQUE' ? '—' : inicialBloque(g.bloque?.nombre || g.clave)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: TOKENS.fontSizes.h5, fontWeight: '700', color: TOKENS.colors.text }}>
                  {g.bloque.nombre}
                </Text>
                <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 2 }}>
                  {g.items.length} {g.items.length === 1 ? 'medición' : 'mediciones'}
                  {g.items.length ? ` · máx ${g.peorPct.toFixed(0)}%` : ''}
                </Text>
              </View>
              <IconChevronRight size={20} color={TOKENS.colors.neutral500} />
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}
