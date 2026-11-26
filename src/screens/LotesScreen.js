import React, { useState, useMemo, useEffect } from 'react';
import { View, Pressable, RefreshControl, FlatList } from 'react-native';
import { Text } from '../Typography';
import { Button, Spinner, EmptyState, PromptModal, Foto, NivelBadge, ScreenTitle, Header, IconButton, AvatarButton, PctMono, AvisoSinConexion } from '../DesignComponents';
import GaleriaFotos from '../GaleriaFotos';
import FiltroFotos from '../FiltroFotos';
import { TOKENS, NIVELES } from '../DesignTokens';
import { IconChevronRight, IconEdit, IconNivel } from '../Icons';
import { nombrePuntoDe } from '../helpers';
import { claveCacheMiniatura } from '../miniaturas';
import { filasDeGaleria, agruparLotes, miniaturaDe } from '../galeria';
import { estadoRenombrarLote } from '../lotes';
import { filtrarMediciones, FILTROS_VACIOS, hayFiltros } from '../linea';
import { formatoPct, fechaCorta, diaLocal, plural } from '../fechas';

const PAD = TOKENS.spacing.lg;

export default function LotesScreen({
  offline,
  iniciales,
  onSettings,
  mediciones,
  bloqueMap,
  bloquesMap,
  refreshing,
  onRefresh,
  onOpen,
  onRenameLote,
  puedeRenombrarLote,
  // Estado de la carga del historial completo: 'idle' | 'cargando' | 'ok' | 'error'.
  historialEstado = 'ok',
  onReintentarHistorial,
  // El lote abierto vive en App para sobrevivir a la pantalla de detalle (volver deja el lote abierto).
  loteSeleccionado,
  setLoteSeleccionado,
}) {
  const [renombrandoLote, setRenombrandoLote] = useState(null);
  // Filtro común de las fotos del lote abierto (se reinicia al cambiar de lote).
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  useEffect(() => {
    setFiltros(FILTROS_VACIOS);
  }, [loteSeleccionado]);

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
    const renombrado = estadoRenombrarLote({ historialEstado, puedeGestionar: puedeRenombrar });
    const fotosLote = filtrarMediciones(lote.items, filtros, { nombresExtra: () => [lote.nombre, lote.puntoTitulo] });
    const filtrado = hayFiltros(filtros);
    const cabecera = (
      <View style={{ paddingBottom: 4 }}>
        <Header
          title={lote.nombre}
          subtitle={`${lote.puntoTitulo} · ${plural(lote.items.length, 'foto', 'fotos')}`}
          onBack={() => setLoteSeleccionado(null)}
          right={
            puedeRenombrar ? (
              <IconButton onPress={() => setRenombrandoLote(lote)} label="Renombrar lote" disabled={!renombrado.permitido}>
                <IconEdit size={22} color={renombrado.permitido ? TOKENS.colors.text : TOKENS.colors.neutral500} />
              </IconButton>
            ) : null
          }
        />
        {!!renombrado.aviso && puedeRenombrar && (
          <View style={{ paddingHorizontal: PAD, paddingTop: 8, gap: 6 }}>
            <Text accessibilityLiveRegion="polite" style={{ ...TOKENS.type.bodyMedium, color: renombrado.reintentar ? TOKENS.colors.danger : TOKENS.colors.neutral700 }}>
              {renombrado.aviso}
            </Text>
            {renombrado.reintentar && !!onReintentarHistorial && <Button variant="tonal" label="Reintentar" onPress={onReintentarHistorial} />}
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 6 }}>
          <View style={{ flex: 1, backgroundColor: TOKENS.colors.surfaceAlt, padding: 14, borderRadius: TOKENS.radius.md, borderWidth: 1, borderColor: TOKENS.colors.border, ...TOKENS.shadow.card }}>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Promedio del lote</Text>
            <PctMono value={lote.avgPct} size={24} style={{ marginTop: 2 }} />
          </View>
          <View style={{ flex: 1, backgroundColor: TOKENS.colors.surfaceAlt, padding: 14, borderRadius: TOKENS.radius.md, borderWidth: 1, borderColor: TOKENS.colors.border, ...TOKENS.shadow.card }}>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Peor foto</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <IconNivel nivel={lote.peorNivel} size={18} color={lote.maxNivel.texto} />
              <PctMono value={lote.maxPct} size={24} color={lote.maxNivel.texto} />
            </View>
          </View>
        </View>
        <Text accessibilityRole="header" style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text, paddingHorizontal: PAD, paddingTop: 16, paddingBottom: 10 }}>
          Fotos del lote
        </Text>
        <FiltroFotos filtros={filtros} onChange={setFiltros} total={fotosLote.length} />
      </View>
    );
    return (
      <>
        <GaleriaFotos
          filas={filasDeGaleria(fotosLote, { porDia: false, agrupar: false })}
          nombrePunto={() => lote.puntoTitulo}
          onAbrirFoto={onOpen}
          ListHeaderComponent={cabecera}
          ListEmptyComponent={
            filtrado ? (
              <View style={{ paddingVertical: 30 }}>
                <EmptyState title="Sin fotos" subtitle="Ninguna foto del lote coincide con estos filtros." />
              </View>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
        {modalRenombrar}
      </>
    );
  }

  const cargandoHistorial = historialEstado === 'cargando';
  const cabecera = (
    <View style={{ gap: 4, marginBottom: 14 }}>
      <ScreenTitle title="Lotes" subtitle="Fotos que subiste juntas en una misma inspección" right={<AvatarButton iniciales={iniciales} onPress={onSettings} />} />
      {cargandoHistorial && (
        <View accessibilityLiveRegion="polite" accessibilityLabel="Cargando todos los lotes" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <Spinner size={20} thickness={2} />
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Cargando todos los lotes…</Text>
        </View>
      )}
      {offline && <View style={{ marginTop: 10 }}><AvisoSinConexion /></View>}
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
        cargandoHistorial ? null : (
          <EmptyState
            title="Aún no hay lotes"
            subtitle="Cuando subas varias fotos con el nombre de un lote, aparecerán agrupadas aquí."
          />
        )
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
            gap: 10,
            opacity: pressed ? 0.85 : 1,
            borderWidth: 1,
            borderColor: TOKENS.colors.border,
            ...TOKENS.shadow.card,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Foto uri={miniaturaDe(lote.portada)} cacheKey={claveCacheMiniatura(lote.portada)} style={{ width: 64, height: 64, borderRadius: 14 }} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text numberOfLines={1} style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text }}>
                {lote.nombre}
              </Text>
              <Text numberOfLines={1} style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
                {plural(lote.items.length, 'foto', 'fotos')}
                {lote.fechaReciente ? ` · ${fechaCorta(diaLocal(lote.fechaReciente))}` : ''}
              </Text>
              <Text numberOfLines={1} style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
                {lote.puntoTitulo}
              </Text>
            </View>
            <IconChevronRight size={20} color={TOKENS.colors.neutral500} />
          </View>
          {/* Nivel y peor foto en la misma fila, con todo el ancho de la tarjeta. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <NivelBadge nivel={lote.peorNivel} compacto />
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>
              Peor foto <Text style={{ fontWeight: '700', color: TOKENS.colors.text }}>{formatoPct(lote.maxPct)}</Text>
            </Text>
          </View>
        </Pressable>
      )}
      ListFooterComponent={
        <View style={{ gap: 12, paddingTop: 4 }}>
          {sueltas > 0 && (
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
              {plural(sueltas, 'foto no pertenece', 'fotos no pertenecen')} a ningún lote. Las encuentras en Actividad.
            </Text>
          )}
          {historialEstado === 'error' && (
            <View style={{ gap: 8 }}>
              <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.danger }}>
                No se pudo cargar todo el historial: algunos lotes pueden verse incompletos.
              </Text>
              {!!onReintentarHistorial && <Button variant="tonal" label="Reintentar" onPress={onReintentarHistorial} />}
            </View>
          )}
        </View>
      }
    />
  );
}
