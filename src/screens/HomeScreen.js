import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import {
  Button,
  StatCard,
  MeasurementRow,
  Spinner,
  EmptyState,
} from '../DesignComponents';
import { TOKENS, num } from '../DesignTokens';
import { IconAlertTriangle } from '../Icons';
import { formatDate } from '../utils';
import { tituloBloque } from '../helpers';

const PAD = TOKENS.spacing.lg;

export default function HomeScreen({
  nombre,
  iniciales,
  stats,
  indicadoresServidor,
  mediciones,
  bloqueMap,
  bloquesMap,
  offline,
  loading,
  refreshing,
  esCliente,
  onRefresh,
  onNueva,
  onOpen,
  onSettings,
}) {
  const recientes = mediciones.slice(0, 4);

  // Totales reales del servidor (como la web) o cálculo de las cargadas como fallback
  const totalMediciones = indicadoresServidor?.mediciones_30d != null
    ? indicadoresServidor.mediciones_30d
    : stats.total;
  const totalPuntos = indicadoresServidor?.total_puntos != null
    ? indicadoresServidor.total_puntos
    : Object.keys(bloquesMap).length;
  const puntosSeveros = indicadoresServidor?.por_nivel?.[3] ?? stats.severas;

  return (
    <ScrollView
      contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={TOKENS.colors.accent}
        />
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600 }}>Hola,</Text>
          <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text, marginTop: 2 }}>
            {nombre}
          </Text>
        </View>
        <Pressable
          onPress={onSettings}
          accessibilityRole="button"
          accessibilityLabel="Abrir ajustes de perfil"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: TOKENS.colors.accent200,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: TOKENS.colors.accent300,
          }}
        >
          <Text style={{ fontSize: TOKENS.fontSizes.h5, fontWeight: '800', color: TOKENS.colors.accent800 }}>
            {iniciales}
          </Text>
        </Pressable>
      </View>

      {offline && (
        <View
          style={{
            marginTop: 16,
            backgroundColor: TOKENS.colors.warningTint,
            borderRadius: TOKENS.radius.md,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderWidth: 1,
            borderColor: TOKENS.colors.warning,
          }}
        >
          <IconAlertTriangle size={20} color={TOKENS.colors.warning} />
          <Text style={{ color: TOKENS.colors.warningText, fontSize: TOKENS.fontSizes.small, fontWeight: '600', flex: 1 }}>
            Sin conexión — mostrando datos guardados en este dispositivo.
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: TOKENS.spacing.sm, marginTop: 18 }}>
        <StatCard value={totalMediciones} label="En 30 días" />
        <StatCard value={puntosSeveros} label="Puntos severos" color={TOKENS.colors.danger} />
        <StatCard value={totalPuntos} label="Puntos activos" color={TOKENS.colors.accent2_800} />
      </View>

      {!esCliente && (
        <View style={{ marginTop: 20 }}>
          <Button
            label="＋  Nueva medición"
            onPress={onNueva}
            accessibilityHint="Abre la cámara o galería para una nueva inspección"
          />
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 14 }}>
        <Text
          style={{
            fontSize: TOKENS.fontSizes.h6,
            fontWeight: '800',
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: TOKENS.colors.neutral600,
          }}
        >
          Mediciones recientes
        </Text>
      </View>

      {loading && !mediciones.length ? (
        <View style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }}>
          <Spinner />
          <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600 }}>
            Cargando mediciones recientes…
          </Text>
        </View>
      ) : recientes.length ? (
        recientes.map((m) => (
          <MeasurementRow
            key={m.id_medicion}
            medicion={m}
            title={tituloBloque(m, bloqueMap, bloquesMap)}
            subtitle={`${formatDate(m.timestamp)} · ${num(m.area_corroida_pct, 0).toFixed(0)}% corroído`}
            onPress={() => onOpen(m)}
          />
        ))
      ) : (
        <EmptyState
          title="Aún no hay mediciones"
          subtitle="Toca “Nueva medición” para analizar tu primera foto de corrosión."
        />
      )}
    </ScrollView>
  );
}
