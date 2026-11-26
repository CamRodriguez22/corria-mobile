import React, { useMemo, useEffect } from 'react';
import { View, Pressable, RefreshControl, FlatList } from 'react-native';
import { Text } from '../Typography';
import { EmptyState, NivelBadge, ScreenTitle, AvatarButton, AvisoSinConexion, PctMono } from '../DesignComponents';
import { TOKENS, NIVELES } from '../DesignTokens';
import { IconChevronRight, IconNivel } from '../Icons';
import { ICONO_SOBRE_NIVEL } from '../paleta';
import { agruparPorBloque } from '../utils';
import { tituloPunto } from '../galeria';
import { filaDePunto, filasDePuntos, totalFotosPuntos, solicitudesResumenPuntos } from '../puntos';
import { aniosDisponibles } from '../linea';
import { nombreNivel } from '../niveles';
import { formatoPct, fechaCorta, plural, hoyLocal } from '../fechas';

const PAD = TOKENS.spacing.lg;

// Pestaña Puntos: una fila compacta por punto (sin miniaturas, a diferencia de Lotes), con cuántas fotos
// tiene y su estado actual. Al tocar un punto se abre su detalle (gráfica de tendencia y todas sus fotos).
export default function FoldersScreen({
  offline, iniciales, onSettings, mediciones, bloqueMap, listaBloques, empresaLinea, refreshing, onRefresh, onOpen,
  resumenes = {}, onCargarResumen,
}) {
  const grupos = useMemo(() => agruparPorBloque(mediciones, bloqueMap, listaBloques), [mediciones, bloqueMap, listaBloques]);

  // Resumen por día de cada punto (año en curso y el anterior): da el número real de fotos y el último estado.
  const anios = useMemo(() => aniosDisponibles(hoyLocal()).slice(-2), []);
  const claves = grupos.filter((g) => g.clave !== 'SIN_BLOQUE').map((g) => g.clave).join('|');
  useEffect(() => {
    // Al tirar para refrescar se vuelve a pedir aunque ya estuviera guardado.
    // Año en curso primero para todos los puntos, luego el anterior (la cola de App.js respeta este orden).
    const puntos = claves.split('|').filter(Boolean);
    solicitudesResumenPuntos(anios, puntos, refreshing).forEach(({ anio, opciones }) => onCargarResumen?.(anio, opciones));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claves, refreshing]);

  const filas = useMemo(
    () =>
      filasDePuntos(
        grupos
          .filter((g) => g.clave !== 'SIN_BLOQUE' || g.items.length)
          .map((g) =>
            filaDePunto({
              clave: g.clave,
              nombre: g.clave === 'SIN_BLOQUE' ? 'Fotos sin punto' : tituloPunto(g.bloque.nombre),
              items: g.items, // agruparPorBloque ya ordena de la más reciente a la más antigua
              resumenes: g.clave === 'SIN_BLOQUE' ? [] : anios.map((a) => resumenes[`${g.clave}|${a}`]),
            })
          )
      ),
    [grupos, resumenes, anios]
  );
  const parcial = filas.some((f) => f.fuente === 'local' && f.clave !== 'SIN_BLOQUE');

  const cabecera = (
    <View style={{ marginBottom: 14 }}>
      <ScreenTitle
        title="Puntos"
        right={<AvatarButton iniciales={iniciales} onPress={onSettings} />}
        subtitle={[empresaLinea, plural(filas.length, 'punto', 'puntos'), plural(totalFotosPuntos(filas), 'foto', 'fotos')].filter(Boolean).join(' · ')}
      />
      {offline && <View style={{ marginTop: 10 }}><AvisoSinConexion /></View>}
      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 6 }}>
        Del más grave al menos grave, según el promedio del último día con fotos.
        {parcial ? ' Las cifras se completan al cargar cada punto.' : ''}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={filas}
      keyExtractor={(f) => f.clave}
      contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={
        <EmptyState title="Sin puntos" subtitle="Cuando haya puntos de inspección asignados a tu cuenta, aparecerán aquí." />
      }
      renderItem={({ item: f, index }) => {
        const n = f.estado ? NIVELES[f.estado.nivel] : null;
        const ultimo = index === filas.length - 1;
        const etiqueta = f.estado
          ? `${f.nombre}, ${plural(f.fotos, 'foto', 'fotos')}, ${nombreNivel(f.estado.nivel)}${f.estado.promedio === null ? '' : ', promedio ' + formatoPct(f.estado.promedio)}, al ${fechaCorta(f.estado.dia)}`
          : `${f.nombre}, sin fotos todavía`;
        return (
          <Pressable
            onPress={() => onOpen(f.clave)}
            accessibilityRole="button"
            accessibilityLabel={etiqueta}
            accessibilityHint="Abre el punto con su gráfica y todas sus fotos"
            style={({ pressed }) => ({
              minHeight: 72,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: pressed ? TOKENS.colors.neutral100 : TOKENS.colors.surfaceAlt,
              borderColor: TOKENS.colors.border,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderTopWidth: index === 0 ? 1 : 0,
              borderTopLeftRadius: index === 0 ? TOKENS.radius.lg : 0,
              borderTopRightRadius: index === 0 ? TOKENS.radius.lg : 0,
              borderBottomLeftRadius: ultimo ? TOKENS.radius.lg : 0,
              borderBottomRightRadius: ultimo ? TOKENS.radius.lg : 0,
            })}
          >
            {/* Cuadro del nivel actual: color + ícono (el color nunca va solo). */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: n ? n.color : TOKENS.colors.neutral200,
              }}
            >
              {n ? <IconNivel nivel={n.i} size={24} color={ICONO_SOBRE_NIVEL[n.i]} /> : null}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text numberOfLines={2} style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text }}>
                {f.nombre}
              </Text>
              <Text numberOfLines={1} style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
                {f.fotos === 0 ? 'Sin fotos todavía' : `${plural(f.fotos, 'foto', 'fotos')}${f.fuente === 'local' ? ' cargadas' : ''}${f.estado ? ` · al ${fechaCorta(f.estado.dia)}` : ''}`}
              </Text>
            </View>
            {f.estado && (
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {f.estado.promedio !== null && <PctMono value={f.estado.promedio} size={20} />}
                <NivelBadge nivel={f.estado.nivel} compacto />
              </View>
            )}
            <IconChevronRight size={20} color={TOKENS.colors.neutral500} />
          </Pressable>
        );
      }}
    />
  );
}
