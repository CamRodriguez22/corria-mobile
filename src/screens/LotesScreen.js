import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, RefreshControl, FlatList } from 'react-native';
import { Button, EmptyState, PromptModal, Foto, NivelBadge, ScreenTitle, Header, IconButton } from '../DesignComponents';
import GaleriaFotos from '../GaleriaFotos';
import { TOKENS, NIVELES } from '../DesignTokens';
import { IconChevronRight, IconEdit, IconNivel } from '../Icons';
import { nombrePuntoDe } from '../helpers';
import { filasDeGaleria, agruparLotes, miniaturaDe } from '../galeria';
import { formatoPct, fechaCorta, diaLocal, plural } from '../fechas';

const PAD = TOKENS.spacing.lg;

export default function LotesScreen({
  mediciones,
  bloqueMap,
  bloquesMap,
  refreshing,
  onRefresh,
  onOpen,
  onRenameLote,
  puedeRenombrarLote,
  hayMas,
  cargandoMas,
  onCargarMas,
  // El lote abierto vive en App para sobrevivir a la pantalla de detalle (volver deja el lote abierto).
  loteSeleccionado,
  setLoteSeleccionado,
}) {
  const [renombrandoLote, setRenombrandoLote] = useState(null);

  const { lotes, sueltas } = useMemo(() => {
    const r = agruparLotes(mediciones);
    return {
      sueltas: r.sueltas,
      lotes: r.lotes.map((l) => ({ ...l, puntoTitulo: nombrePuntoDe(l.items[0], bloqueMap, bloquesMap), maxNivel: NIVELES[l.peorNivel] })),
    };
  }, [mediciones, bloqueMap, bloquesMap]);

  const loteAbierto = loteSeleccionado ? lotes.find((l) => l.id === loteSeleccionado) : null;
  // Si el lote ya no existe (se borró su última foto o se recargó), se cierra.
  useEffect(() => {
    if (loteSeleccionado && !loteAbierto) setLoteSeleccionado(null);
  }, [loteSeleccionado, loteAbierto, setLoteSeleccionado]);

  const modalRenombrar = renombrandoLote && (
    <PromptModal
      visible
      title="Renombrar lote"
      message={`Nuevo nombre para este lote de ${plural(renombrandoLote.items.length, 'foto', 'fotos')}:`}
      initialValue={renombrandoLote.nombre}
      placeholder="Nombre del lote"
      onCancel={() => setRenombrandoLote(null)}
      onConfirm={async (valor) => {
        const target = renombrandoLote;
        setRenombrandoLote(null);
        const nombreFinal = (valor || '').trim();
        if (target && nombreFinal && nombreFinal !== target.nombre) {
          await onRenameLote(
            target.items.map((i) => ({ id_punto: i.id_punto || i.punto_id, id_medicion: i.id_medicion })),
            nombreFinal
          );
        }
      }}
    />
  );

  if (loteAbierto) {
    const lote = loteAbierto;
    const puedeRenombrar = Boolean(onRenameLote && puedeRenombrarLote?.(lote.items));
    const cabecera = (
      <View style={{ paddingBottom: 4 }}>
        <Header
          title={lote.nombre}
          subtitle={`${lote.puntoTitulo} · ${plural(lote.items.length, 'foto', 'fotos')}`}
          onBack={() => setLoteSeleccionado(null)}
          right={
            puedeRenombrar ? (
              <IconButton onPress={() => setRenombrandoLote(lote)} label="Renombrar lote">
                <IconEdit size={22} color={TOKENS.colors.text} />
              </IconButton>
            ) : null
          }
        />
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 6 }}>
          <View style={{ flex: 1, backgroundColor: TOKENS.colors.surfaceAlt, padding: 14, borderRadius: TOKENS.radius.md, borderWidth: 1, borderColor: TOKENS.colors.border }}>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Promedio del lote</Text>
            <Text style={{ ...TOKENS.type.titleLarge, color: TOKENS.colors.text, marginTop: 2 }}>{formatoPct(lote.avgPct)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: TOKENS.colors.surfaceAlt, padding: 14, borderRadius: TOKENS.radius.md, borderWidth: 1, borderColor: TOKENS.colors.border }}>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Peor foto</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <IconNivel nivel={lote.peorNivel} size={18} color={lote.maxNivel.texto} />
              <Text style={{ ...TOKENS.type.titleLarge, color: lote.maxNivel.texto }}>{formatoPct(lote.maxPct)}</Text>
            </View>
          </View>
        </View>
        <Text accessibilityRole="header" style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text, paddingHorizontal: PAD, paddingTop: 16, paddingBottom: 10 }}>
          Fotos del lote
        </Text>
      </View>
    );
    return (
      <>
        <GaleriaFotos
          filas={filasDeGaleria(lote.items, { porDia: false, agrupar: false })}
          nombrePunto={() => lote.puntoTitulo}
          onAbrirFoto={onOpen}
          ListHeaderComponent={cabecera}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
        {modalRenombrar}
      </>
    );
  }

  const cabecera = (
    <View style={{ gap: 4, marginBottom: 14 }}>
      <ScreenTitle title="Lotes" subtitle="Fotos que subiste juntas en una misma inspección" />
    </View>
  );

  return (
    <FlatList
      data={lotes}
      keyExtractor={(l) => l.id}
      contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={
        <EmptyState
          title="Aún no hay lotes"
          subtitle="Cuando subas varias fotos con el nombre de un lote, aparecerán agrupadas aquí."
        />
      }
      renderItem={({ item: lote }) => (
        <Pressable
          onPress={() => setLoteSeleccionado(lote.id)}
          accessibilityRole="button"
          accessibilityLabel={`Lote ${lote.nombre}, ${plural(lote.items.length, 'foto', 'fotos')}, ${lote.puntoTitulo}, peor nivel ${lote.maxNivel.label}`}
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
          })}
        >
          <Foto uri={miniaturaDe(lote.portada)} style={{ width: 80, height: 80, borderRadius: 14 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={2} style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text }}>
              {lote.nombre}
            </Text>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
              {plural(lote.items.length, 'foto', 'fotos')}
              {lote.fechaReciente ? ` · ${fechaCorta(diaLocal(lote.fechaReciente))}` : ''}
            </Text>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>{lote.puntoTitulo}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <NivelBadge nivel={lote.peorNivel} compacto />
              <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>hasta {formatoPct(lote.maxPct)}</Text>
            </View>
          </View>
          <IconChevronRight size={20} color={TOKENS.colors.neutral500} />
        </Pressable>
      )}
      ListFooterComponent={
        <View style={{ gap: 12, paddingTop: 4 }}>
          {sueltas > 0 && (
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
              {plural(sueltas, 'foto no pertenece', 'fotos no pertenecen')} a ningún lote. Las encuentras en Actividad.
            </Text>
          )}
          {hayMas && onCargarMas && (
            <Button
              variant="tonal"
              label={cargandoMas ? 'Cargando más…' : 'Cargar fotos anteriores'}
              onPress={onCargarMas}
              loading={cargandoMas}
            />
          )}
        </View>
      }
    />
  );
}
