import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Button, MeasurementRow, EmptyState, PromptModal } from '../DesignComponents';
import { TOKENS, num, severidad } from '../DesignTokens';
import { IconLotes } from '../Icons';
import { formatDate } from '../utils';
import { tituloBloque } from '../helpers';

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
}) {
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);
  const [renombrandoLote, setRenombrandoLote] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');

  // Agrupar mediciones por lote_id o lote_nombre
  const lotes = useMemo(() => {
    const mapa = {};
    for (const m of mediciones) {
      const loteClave = m.lote_id || m.lote_nombre || 'Sin lote';
      if (!mapa[loteClave]) {
        mapa[loteClave] = {
          id: loteClave,
          nombre: m.lote_nombre || (m.lote_id ? `Lote ${m.lote_id.slice(-6)}` : 'Sin lote'),
          items: [],
          puntoId: m.punto_id || m.id_punto,
          fechaReciente: m.timestamp || 0,
        };
      }
      mapa[loteClave].items.push(m);
      if (new Date(m.timestamp || 0) > new Date(mapa[loteClave].fechaReciente)) {
        mapa[loteClave].fechaReciente = m.timestamp;
      }
    }

    return Object.values(mapa).map((lote) => {
      const pcts = lote.items.map((i) => num(i.area_corroida_pct, 0));
      const maxPct = pcts.length ? Math.max(...pcts) : 0;
      const avgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
      const primerItem = lote.items[0];
      return {
        ...lote,
        maxPct,
        avgPct,
        maxNivel: primerItem ? severidad({ area_corroida_pct: maxPct }) : null,
        puntoTitulo: tituloBloque(primerItem, bloqueMap, bloquesMap),
      };
    }).sort((a, b) => new Date(b.fechaReciente) - new Date(a.fechaReciente));
  }, [mediciones, bloqueMap, bloquesMap]);

  if (loteSeleccionado) {
    const lote = lotes.find((l) => l.id === loteSeleccionado);
    if (!lote) {
      setLoteSeleccionado(null);
      return null;
    }
    return (
      <ScrollView
        contentContainerStyle={{ padding: PAD, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
      >
        <Pressable
          onPress={() => setLoteSeleccionado(null)}
          accessibilityRole="button"
          accessibilityLabel="Volver a la lista de lotes"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, minHeight: 44, justifyContent: 'flex-start' }}
        >
          <Text style={{ fontSize: 16, color: TOKENS.colors.accent, fontWeight: '700' }}>← Volver a lotes</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>
              {lote.nombre}
            </Text>
            <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 4 }}>
              {lote.puntoTitulo} · {lote.items.length} {lote.items.length === 1 ? 'foto' : 'fotos'}
            </Text>
          </View>
          {onRenameLote && puedeRenombrarLote?.(lote.items) && lote.id !== 'Sin lote' && (
            <Button
              label="Renombrar"
              variant="outline"
              size="sm"
              onPress={() => {
                setNuevoNombre(lote.nombre);
                setRenombrandoLote(lote);
              }}
            />
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          <View style={{ flex: 1, backgroundColor: TOKENS.colors.surfaceAlt, padding: 14, borderRadius: TOKENS.radius.md, borderWidth: 1, borderColor: TOKENS.colors.border }}>
            <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: TOKENS.colors.neutral600, textTransform: 'uppercase', fontWeight: '700' }}>Promedio</Text>
            <Text style={{ fontSize: TOKENS.fontSizes.h3, fontWeight: '800', color: TOKENS.colors.text, marginTop: 2 }}>{lote.avgPct.toFixed(1)}%</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: TOKENS.colors.surfaceAlt, padding: 14, borderRadius: TOKENS.radius.md, borderWidth: 1, borderColor: TOKENS.colors.border }}>
            <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: TOKENS.colors.neutral600, textTransform: 'uppercase', fontWeight: '700' }}>Máximo</Text>
            <Text style={{ fontSize: TOKENS.fontSizes.h3, fontWeight: '800', color: lote.maxNivel?.color || TOKENS.colors.text, marginTop: 2 }}>{lote.maxPct.toFixed(1)}%</Text>
          </View>
        </View>

        <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text, marginBottom: 12 }}>
          Fotos del lote ({lote.items.length})
        </Text>
        {lote.items.map((m) => (
          <MeasurementRow
            key={m.id_medicion}
            medicion={m}
            title={formatDate(m.timestamp)}
            subtitle={`${num(m.area_corroida_pct, 0).toFixed(1)}% corroído · Nivel ${m.nivel_corrosion ?? m.nivel ?? '—'}`}
            onPress={() => onOpen(m)}
          />
        ))}

        {renombrandoLote && (
          <PromptModal
            visible={Boolean(renombrandoLote)}
            title="Renombrar lote"
            message={`Ingresa el nuevo nombre para este lote de ${renombrandoLote.items.length} fotos:`}
            initialValue={nuevoNombre}
            placeholder="Nombre del lote"
            onCancel={() => setRenombrandoLote(null)}
            onConfirm={async (valor) => {
              const target = renombrandoLote;
              setRenombrandoLote(null);
              const nombreFinal = (valor || nuevoNombre).trim();
              if (target && nombreFinal && nombreFinal !== target.nombre) {
                const itemsPayload = target.items.map((i) => ({
                  id_punto: i.id_punto || i.punto_id,
                  id_medicion: i.id_medicion,
                }));
                await onRenameLote(itemsPayload, nombreFinal);
              }
            }}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
    >
      <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>Lotes</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 4, marginBottom: 16 }}>
        Grupos de inspección por fecha o campaña
      </Text>

      {lotes.length === 0 ? (
        <EmptyState
          title="No hay lotes registrados"
          subtitle="Las fotos que tomes en grupo o por lote aparecerán organizadas aquí."
        />
      ) : (
        lotes.map((lote) => (
          <Pressable
            key={lote.id}
            onPress={() => setLoteSeleccionado(lote.id)}
            accessibilityRole="button"
            accessibilityLabel={`Lote ${lote.nombre}, ${lote.items.length} fotos, severidad máxima ${lote.maxPct.toFixed(1)}%`}
            style={({ pressed }) => [
              {
                backgroundColor: TOKENS.colors.surfaceAlt,
                borderRadius: TOKENS.radius.lg,
                padding: 16,
                marginBottom: 12,
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
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: lote.maxNivel?.tint || TOKENS.colors.neutral200,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconLotes size={22} color={lote.maxNivel?.color || TOKENS.colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text }}>
                {lote.nombre}
              </Text>
              <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: TOKENS.colors.neutral600, marginTop: 2 }}>
                {lote.puntoTitulo} · {formatDate(lote.fechaReciente)}
              </Text>
              <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: lote.maxNivel?.color || TOKENS.colors.text, marginTop: 2, fontWeight: '600' }}>
                {lote.items.length} {lote.items.length === 1 ? 'foto' : 'fotos'} · Máx {lote.maxPct.toFixed(1)}% (Nivel {lote.maxNivel?.nivel ?? '—'})
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: TOKENS.colors.neutral500 }}>›</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
