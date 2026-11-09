import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, useWindowDimensions } from 'react-native';
import { Text } from '../Typography';
import { Fab, Spinner, EmptyState, AvisoSinConexion, SectionTitle, AvatarButton, Chip } from '../DesignComponents';
import GraficaTendencia from '../GraficaTendencia';
import useTendenciaPunto from '../useTendenciaPunto';
import { FilaGaleria, anchoFicha } from '../GaleriaFotos';
import { TOKENS } from '../DesignTokens';
import { IconPlus, IconWifiOff, IconNivel, IconChevronRight } from '../Icons';
import { ICONO_SOBRE_NIVEL } from '../paleta';
import { nombreNivel, nivelAcotado } from '../niveles';
import { formatoPct, fechaCorta } from '../fechas';
import { nombrePuntoDe } from '../helpers';
import { construirMosaico, dividirEnFilas, estadoPunto, puntoDeAtencion } from '../galeria';
import { chipsDePuntos, puntoDeTendencia } from '../puntos';
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
  resumenes = {},
  onCargarResumen,
}) {
  const { width } = useWindowDimensions();
  const lado = anchoFicha(width, 3, PAD);
  const recientes = useMemo(() => dividirEnFilas(construirMosaico(mediciones.slice(0, 6), { agrupar: false }), 3), [mediciones]);

  // Punto que más atención pide: el `mas_critico` del servidor o, sin él, el peor de los cargados.
  const grupos = useMemo(
    () => agruparPorBloque(mediciones, bloqueMap, Object.values(bloquesMap)).map((g) => ({ ...g, estado: estadoPunto(g.items) })),
    [mediciones, bloqueMap, bloquesMap]
  );
  const atencion = useMemo(() => puntoDeAtencion(indicadoresServidor, grupos), [indicadoresServidor, grupos]);
  const puedeAbrirAtencion = Boolean(atencion && bloquesMap[atencion.clave]);
  const nivelAt = atencion ? nivelAcotado(atencion.nivel) : 0;
  // Gráfica de tendencia: por defecto el punto de "Requiere atención"; los chips cambian de punto.
  const [elegido, setElegido] = useState(null);
  const chips = useMemo(() => chipsDePuntos(grupos), [grupos]);
  const claveGrafica = puntoDeTendencia(elegido, atencion?.clave, chips.map((c) => c.clave));
  const tendencia = useTendenciaPunto(claveGrafica, resumenes, onCargarResumen, { forzar: refreshing });
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

        {claveGrafica && (
          <View style={{ marginTop: 20 }}>
            <SectionTitle title="Tendencia por punto" />
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -PAD }}
                contentContainerStyle={{ paddingHorizontal: PAD, gap: 8, alignItems: 'center' }}
                accessibilityLabel="Elegir el punto de la gráfica"
              >
                {chips.map((c) => {
                  const activo = c.clave === claveGrafica;
                  return (
                    <Chip
                      key={c.clave}
                      label={c.nombre}
                      selected={activo}
                      icon={c.nivel === null ? null : <IconNivel nivel={c.nivel} size={16} color={activo ? TOKENS.colors.piedra_900 : NIVELES[c.nivel].texto} />}
                      accessibilityLabel={`Ver la tendencia de ${c.nombre}`}
                      onPress={() => setElegido(c.clave)}
                    />
                  );
                })}
              </ScrollView>
            </View>
            <GraficaTendencia
              puntos={tendencia.puntos}
              estado={tendencia.estado}
              truncado={tendencia.truncado}
              error={tendencia.error}
              onReintentar={tendencia.reintentar}
              margen={PAD}
            />
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
