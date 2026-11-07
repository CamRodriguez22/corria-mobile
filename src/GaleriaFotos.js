// GaleriaFotos.js — Galería de fotos en cuadrícula de 3 columnas (virtualizada).
// Filas planas de `filasDeGaleria` (src/galeria.js): un encabezado por día y filas de fichas
// cuadradas. Una ficha es una foto (miniatura + nivel + %) o un lote (portada + cantidad + peor nivel).
import React from 'react';
import { View, Text, Pressable, FlatList, useWindowDimensions } from 'react-native';
import { TOKENS } from './DesignTokens';
import { Foto, NivelChip } from './DesignComponents';
import { IconLotes } from './Icons';
import { miniaturaDe, etiquetaFoto, etiquetaLote, COLUMNAS_GALERIA } from './galeria';
import { pctCorto, plural } from './fechas';

export const SEPARACION = 3;

export function anchoFicha(ancho, columnas = COLUMNAS_GALERIA, margen = 0, separacion = SEPARACION) {
  return Math.floor((ancho - margen * 2 - separacion * (columnas - 1)) / columnas);
}

export const FichaFoto = React.memo(function FichaFoto({ medicion, lado, punto, onPress, radio = 0, seleccionada = false }) {
  return (
    <Pressable
      onPress={() => onPress?.(medicion)}
      accessibilityRole="button"
      accessibilityLabel={etiquetaFoto(medicion, { punto })}
      accessibilityState={{ selected: seleccionada }}
      accessibilityHint="Abre el detalle de la foto"
      style={({ pressed }) => ({ width: lado, height: lado, opacity: pressed ? 0.82 : 1 })}
    >
      <Foto uri={miniaturaDe(medicion)} style={{ width: lado, height: lado, borderRadius: radio }} />
      {seleccionada && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: radio, borderWidth: 3, borderColor: TOKENS.colors.accent }}
        />
      )}
      <NivelChip
        nivel={Math.max(0, Math.min(3, Math.round(Number(medicion.nivel_corrosion ?? 0))))}
        texto={medicion.area_corroida_pct == null ? '' : pctCorto(medicion.area_corroida_pct)}
        style={{ position: 'absolute', left: 6, bottom: 6 }}
      />
    </Pressable>
  );
});

export const FichaLote = React.memo(function FichaLote({ ficha, lado, punto, onPress, radio = 0 }) {
  return (
    <Pressable
      onPress={() => onPress?.(ficha)}
      accessibilityRole="button"
      accessibilityLabel={etiquetaLote(ficha, { punto })}
      accessibilityHint="Abre el lote"
      style={({ pressed }) => ({ width: lado, height: lado, opacity: pressed ? 0.82 : 1 })}
    >
      <Foto uri={miniaturaDe(ficha.portada)} style={{ width: lado, height: lado, borderRadius: radio }} />
      <View
        style={{
          position: 'absolute',
          right: 6,
          top: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: 'rgba(32,30,29,0.84)',
          borderRadius: TOKENS.radius.pill,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}
      >
        <IconLotes size={13} color="#fff" />
        <Text style={{ fontSize: TOKENS.fontSizes.xs, fontWeight: '700', color: '#fff' }}>{ficha.total}</Text>
      </View>
      <NivelChip
        nivel={ficha.peorNivel}
        texto={ficha.maxPct == null ? '' : pctCorto(ficha.maxPct)}
        style={{ position: 'absolute', left: 6, bottom: 6 }}
      />
    </Pressable>
  );
});

export function FilaGaleria({ fichas, lado, columnas = COLUMNAS_GALERIA, nombrePunto, onAbrirFoto, onAbrirLote, margen = 0, radio = 0, seleccionadaId = null }) {
  return (
    <View style={{ flexDirection: 'row', gap: SEPARACION, marginBottom: SEPARACION, paddingHorizontal: margen }}>
      {fichas.map((f) =>
        f.tipo === 'lote' ? (
          <FichaLote key={f.clave} ficha={f} lado={lado} radio={radio} punto={nombrePunto?.(f.items[0])} onPress={onAbrirLote} />
        ) : (
          <FichaFoto key={f.clave} medicion={f.medicion} lado={lado} radio={radio} punto={nombrePunto?.(f.medicion)} onPress={onAbrirFoto} seleccionada={seleccionadaId === f.medicion.id_medicion} />
        )
      )}
    </View>
  );
}

export function EncabezadoDia({ titulo, total, margen = TOKENS.spacing.lg }) {
  return (
    <View
      accessibilityRole="header"
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: margen,
        paddingTop: 22,
        paddingBottom: 10,
      }}
    >
      <Text style={{ flex: 1, ...TOKENS.type.titleMedium, color: TOKENS.colors.text }}>{titulo}</Text>
      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>{plural(total, 'foto', 'fotos')}</Text>
    </View>
  );
}

// Lista virtualizada. `filas` sale de `filasDeGaleria`; cabecera, pie y refresco los pone la pantalla.
export default function GaleriaFotos({
  filas,
  nombrePunto,
  onAbrirFoto,
  onAbrirLote,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  refreshControl,
  columnas = COLUMNAS_GALERIA,
  margen = 0,
  contentContainerStyle,
}) {
  const { width } = useWindowDimensions();
  const lado = anchoFicha(width, columnas, margen);
  return (
    <FlatList
      data={filas}
      keyExtractor={(f) => f.clave}
      renderItem={({ item }) =>
        item.tipo === 'dia' ? (
          <EncabezadoDia titulo={item.titulo} total={item.total} />
        ) : (
          <FilaGaleria
            fichas={item.fichas}
            lado={lado}
            columnas={columnas}
            margen={margen}
            nombrePunto={nombrePunto}
            onAbrirFoto={onAbrirFoto}
            onAbrirLote={onAbrirLote}
          />
        )
      }
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      refreshControl={refreshControl}
      initialNumToRender={8}
      windowSize={7}
      removeClippedSubviews
      contentContainerStyle={contentContainerStyle}
    />
  );
}
