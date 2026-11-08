import React, { useMemo } from 'react';
import { View, Pressable, RefreshControl, FlatList } from 'react-native';
import { Text } from '../Typography';
import { EmptyState, Foto, NivelBadge, ScreenTitle, AvatarButton, AvisoSinConexion } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconChevronRight } from '../Icons';
import { agruparPorBloque } from '../utils';
import { miniaturaDe, estadoPunto, tituloPunto, ordenarPuntosPorGravedad } from '../galeria';
import { formatoPct, fechaCorta, plural } from '../fechas';

const PAD = TOKENS.spacing.lg;

export default function FoldersScreen({ offline, iniciales, onSettings, mediciones, bloqueMap, listaBloques, empresaLinea, refreshing, onRefresh, onOpen }) {
  // Del punto más grave al menos grave (nivel del promedio del día más reciente, luego su %).
  const grupos = useMemo(
    () =>
      ordenarPuntosPorGravedad(
        agruparPorBloque(mediciones, bloqueMap, listaBloques).map((g) => ({
          ...g,
          estado: estadoPunto(g.items),
          ultima: g.items[0], // agruparPorBloque ya ordena de la más reciente a la más antigua
        }))
      ),
    [mediciones, bloqueMap, listaBloques]
  );

  const cabecera = (
    <View style={{ marginBottom: 14 }}>
      <ScreenTitle
        title="Puntos"
        right={<AvatarButton iniciales={iniciales} onPress={onSettings} />}
        subtitle={[empresaLinea, plural(mediciones.length, 'foto cargada', 'fotos cargadas'), 'del más grave al menos grave'].filter(Boolean).join(' · ')}
      />
      {offline && <View style={{ marginTop: 10 }}><AvisoSinConexion /></View>}
    </View>
  );

  return (
    <FlatList
      data={grupos}
      keyExtractor={(g) => g.clave}
      contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={
        <EmptyState title="Sin puntos con fotos" subtitle="Cuando registres fotos asociadas a puntos, aparecerán organizadas aquí." />
      }
      renderItem={({ item: g }) => {
        const nombre = g.clave === 'SIN_BLOQUE' ? 'Fotos sin punto' : tituloPunto(g.bloque.nombre);
        return (
          <Pressable
            onPress={() => onOpen(g.clave)}
            accessibilityRole="button"
            accessibilityLabel={`${nombre}, ${plural(g.items.length, 'foto cargada', 'fotos cargadas')}`}
            style={({ pressed }) => ({
              backgroundColor: TOKENS.colors.surfaceAlt,
              borderRadius: TOKENS.radius.lg,
              padding: 12,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              opacity: pressed ? 0.85 : 1,
              borderWidth: 1,
              borderColor: TOKENS.colors.border,
              ...TOKENS.shadow.card,
            })}
          >
            <Foto uri={g.ultima ? miniaturaDe(g.ultima) : null} style={{ width: 72, height: 72, borderRadius: 14 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={2} style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text }}>
                {nombre}
              </Text>
              {g.estado ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <NivelBadge nivel={g.estado.nivel} compacto />
                    {g.estado.promedio !== null && (
                      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>
                        promedio <Text style={{ fontWeight: '700', color: TOKENS.colors.text }}>{formatoPct(g.estado.promedio)}</Text>
                      </Text>
                    )}
                  </View>
                  <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
                    {plural(g.items.length, 'foto', 'fotos')} · al {fechaCorta(g.estado.dia)}
                  </Text>
                </>
              ) : (
                <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Sin fotos todavía</Text>
              )}
            </View>
            <IconChevronRight size={20} color={TOKENS.colors.neutral500} />
          </Pressable>
        );
      }}
    />
  );
}
