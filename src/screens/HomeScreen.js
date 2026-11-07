import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, useWindowDimensions } from 'react-native';
import { Fab, Spinner, EmptyState, Banner, SectionTitle, SwatchNivel } from '../DesignComponents';
import { FilaGaleria, anchoFicha } from '../GaleriaFotos';
import { TOKENS } from '../DesignTokens';
import { IconPlus, IconWifiOff, IconNivel } from '../Icons';
import { nombrePuntoDe } from '../helpers';
import { construirMosaico, dividirEnFilas, indicadoresLocales } from '../galeria';
import { agruparPorBloque } from '../utils';
import { NIVELES } from '../DesignTokens';

const PAD = TOKENS.spacing.lg;

function Kpi({ valor, etiqueta, color = TOKENS.colors.text, icono }) {
  return (
    <View accessible accessibilityLabel={`${valor} ${etiqueta}`} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icono}
        <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color }}>{valor}</Text>
      </View>
      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700, textAlign: 'center', marginTop: 2 }}>{etiqueta}</Text>
    </View>
  );
}

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
  onVerTodas,
  onSettings,
}) {
  const { width } = useWindowDimensions();
  const lado = anchoFicha(width, 3, PAD);
  const recientes = useMemo(() => dividirEnFilas(construirMosaico(mediciones.slice(0, 6), { agrupar: false }), 3), [mediciones]);

  // Totales reales del servidor (como la web). Sin ellos (ni siquiera en caché) se calculan SOLO con
  // las fotos cargadas: puntos por estado y fotos de los últimos 30 días, nunca fotos contadas como puntos.
  const locales = useMemo(
    () =>
      indicadoresServidor
        ? null
        : indicadoresLocales(
            mediciones,
            agruparPorBloque(mediciones, bloqueMap, Object.values(bloquesMap)).map((g) => g.items)
          ),
    [indicadoresServidor, mediciones, bloqueMap, bloquesMap]
  );
  const totalMediciones = indicadoresServidor?.mediciones_30d ?? locales?.fotos30 ?? 0;
  const totalPuntos = indicadoresServidor?.total_puntos ?? Object.keys(bloquesMap).length;
  const porNivel = indicadoresServidor?.por_nivel || locales?.porNivel || [0, 0, 0, 0];
  const puntosSeveros = porNivel[3] ?? 0;
  const totalConEstado = porNivel.reduce((a, b) => a + b, 0);
  const primerNombre = String(nombre || '').split(' ')[0] || nombre;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: PAD, paddingBottom: 112 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ ...TOKENS.type.headlineMedium, color: TOKENS.colors.text }} numberOfLines={1}>
              Hola, {primerNombre}
            </Text>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 2 }}>Así van tus inspecciones</Text>
          </View>
          <Pressable
            onPress={onSettings}
            accessibilityRole="button"
            accessibilityLabel="Abrir ajustes de perfil"
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: TOKENS.colors.accent200,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: TOKENS.colors.accent300,
            }}
          >
            <Text style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.accent800 }}>{iniciales}</Text>
          </Pressable>
        </View>

        {offline && (
          <View style={{ marginTop: 16 }}>
            <Banner icon={<IconWifiOff size={22} color={TOKENS.colors.warning} />} text="Sin conexión. Ves los datos guardados en este teléfono." />
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            marginTop: 20,
            paddingVertical: 18,
            backgroundColor: TOKENS.colors.surfaceAlt,
            borderRadius: TOKENS.radius.lg,
            borderWidth: 1,
            borderColor: TOKENS.colors.border,
          }}
        >
          <Kpi valor={totalMediciones} etiqueta="fotos en 30 días" />
          <View style={{ width: 1, backgroundColor: TOKENS.colors.neutral200 }} />
          <Kpi
            valor={puntosSeveros}
            etiqueta="puntos severos"
            color={TOKENS.colors.danger}
            icono={<IconNivel nivel={3} size={22} color={TOKENS.colors.danger} />}
          />
          <View style={{ width: 1, backgroundColor: TOKENS.colors.neutral200 }} />
          <Kpi valor={totalPuntos} etiqueta="puntos activos" color={TOKENS.colors.accent2_800} />
        </View>

        {totalConEstado > 0 && (
          <View style={{ marginTop: 20 }}>
            <SectionTitle title="Estado de los puntos" />
            <View
              accessible
              accessibilityLabel={`Puntos por estado: ${NIVELES.map((n) => `${porNivel[n.i]} ${n.label}`).join(', ')}`}
              style={{ gap: 12, marginTop: 4 }}
            >
              <View style={{ flexDirection: 'row', height: 10, gap: 2 }}>
                {NIVELES.filter((n) => porNivel[n.i] > 0).map((n) => (
                  <View key={n.i} style={{ flex: porNivel[n.i], backgroundColor: n.color, borderRadius: 5 }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 }}>
                {NIVELES.filter((n) => porNivel[n.i] > 0).map((n) => (
                  <View key={n.i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <SwatchNivel nivel={n.i} size={18} />
                    <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>
                      {n.label} <Text style={{ fontWeight: '800', color: TOKENS.colors.text }}>{porNivel[n.i]}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <SectionTitle title="Fotos recientes" actionLabel={mediciones.length ? 'Ver todas' : undefined} onAction={onVerTodas} style={{ marginTop: 20 }} />

        {loading && !mediciones.length ? (
          <View style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }}>
            <Spinner />
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Cargando las fotos recientes…</Text>
          </View>
        ) : recientes.length ? (
          <View style={{ marginHorizontal: -PAD, marginTop: 4 }}>
            {recientes.map((fichas, i) => (
              <FilaGaleria
                key={i}
                fichas={fichas}
                lado={lado}
                margen={PAD}
                radio={12}
                nombrePunto={(m) => nombrePuntoDe(m, bloqueMap, bloquesMap)}
                onAbrirFoto={onOpen}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="Aún no hay mediciones"
            subtitle={esCliente ? 'Cuando tu equipo suba fotos, las verás aquí.' : 'Toca “Nueva medición” para analizar tu primera foto de corrosión.'}
          />
        )}
      </ScrollView>
      {!esCliente && (
        <Fab label="Nueva medición" icon={<IconPlus size={22} color="#fff" />} onPress={onNueva} />
      )}
    </View>
  );
}
