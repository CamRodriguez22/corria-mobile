import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, RefreshControl, useWindowDimensions } from 'react-native';
import { Text } from '../Typography';
import { Fab, Spinner, EmptyState, AvisoSinConexion, SectionTitle, SwatchNivel, AvatarButton } from '../DesignComponents';
import { FilaGaleria, anchoFicha } from '../GaleriaFotos';
import { TOKENS } from '../DesignTokens';
import { IconPlus, IconWifiOff, IconNivel, IconChevronRight } from '../Icons';
import { ICONO_SOBRE_NIVEL } from '../paleta';
import { nombreNivel, nivelAcotado } from '../niveles';
import { formatoPct, fechaCorta, plural } from '../fechas';
import { nombrePuntoDe } from '../helpers';
import { construirMosaico, dividirEnFilas, indicadoresLocales, estadoPunto, puntoDeAtencion } from '../galeria';
import { agruparPorBloque } from '../utils';
import { NIVELES } from '../DesignTokens';

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
  onVerTodas,
  onSettings,
  onAbrirPunto,
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
  const porNivelSrv = indicadoresServidor?.por_nivel;
  const porNivel = Array.isArray(porNivelSrv) && porNivelSrv.length === 4 ? porNivelSrv.map((n) => Number(n) || 0) : locales?.porNivel || [0, 0, 0, 0];
  const totalConEstado = porNivel.reduce((a, b) => a + b, 0);
  // Punto que más atención pide: el `mas_critico` del servidor o, sin él, el peor de los cargados.
  const grupos = useMemo(
    () => agruparPorBloque(mediciones, bloqueMap, Object.values(bloquesMap)).map((g) => ({ ...g, estado: estadoPunto(g.items) })),
    [mediciones, bloqueMap, bloquesMap]
  );
  const atencion = useMemo(() => puntoDeAtencion(indicadoresServidor, grupos), [indicadoresServidor, grupos]);
  const puedeAbrirAtencion = Boolean(atencion && bloquesMap[atencion.clave]);
  const nivelAt = atencion ? nivelAcotado(atencion.nivel) : 0;
  const primerNombre = String(nombre || '').split(' ')[0] || nombre;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: PAD, paddingBottom: 148 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ ...TOKENS.type.headlineMedium, color: TOKENS.colors.text }} numberOfLines={1}>
              Hola, {primerNombre}
            </Text>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 2 }}>Así van tus inspecciones</Text>
          </View>
          <AvatarButton iniciales={iniciales} onPress={onSettings} />
        </View>

        {offline && (
          <View style={{ marginTop: 16 }}>
            <AvisoSinConexion />
          </View>
        )}

        {atencion && (
          <Pressable
            onPress={puedeAbrirAtencion ? () => onAbrirPunto?.(atencion.clave) : undefined}
            disabled={!puedeAbrirAtencion}
            accessibilityRole={puedeAbrirAtencion ? 'button' : undefined}
            accessibilityLabel={`${atencion.urgente ? 'Requiere atención' : 'Punto con más corrosión'}: ${atencion.nombre}, ${nombreNivel(nivelAt)}${atencion.pct == null ? '' : ', ' + formatoPct(atencion.pct)}`}
            accessibilityHint={puedeAbrirAtencion ? 'Abre el punto' : undefined}
            style={({ pressed }) => ({
              marginTop: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 14,
              backgroundColor: TOKENS.colors.surfaceAlt,
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1,
              borderColor: TOKENS.colors.border,
              opacity: pressed ? 0.85 : 1,
              ...TOKENS.shadow.card,
            })}
          >
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: NIVELES[nivelAt].color, alignItems: 'center', justifyContent: 'center' }}>
              <IconNivel nivel={nivelAt} size={30} color={ICONO_SOBRE_NIVEL[nivelAt]} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ ...TOKENS.type.labelSmall, letterSpacing: 0.8, color: NIVELES[nivelAt].texto }}>
                {atencion.urgente ? 'REQUIERE ATENCIÓN' : 'PUNTO CON MÁS CORROSIÓN'}
              </Text>
              <Text numberOfLines={2} style={{ ...TOKENS.type.titleLarge, color: TOKENS.colors.text }}>
                {atencion.nombre}
              </Text>
              <Text style={{ ...TOKENS.type.titleSmall, color: TOKENS.colors.text }}>
                {nombreNivel(nivelAt)}
                {atencion.pct == null ? '' : ` · ${formatoPct(atencion.pct)}`}
              </Text>
              {!!atencion.dia && <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Promedio del {fechaCorta(atencion.dia)}</Text>}
            </View>
            {puedeAbrirAtencion && <IconChevronRight size={20} color={TOKENS.colors.neutral500} />}
          </Pressable>
        )}

        {totalConEstado > 0 && (
          <View style={{ marginTop: 20 }}>
            <SectionTitle title="Estado de los puntos" />
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: -6, marginBottom: 6 }}>
              {plural(totalPuntos, 'punto activo', 'puntos activos')} · {plural(totalMediciones, 'foto', 'fotos')} en 30 días
            </Text>
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
            title="Aún no hay fotos"
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
