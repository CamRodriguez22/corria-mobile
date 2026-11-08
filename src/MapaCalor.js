// MapaCalor.js — Mapa de calor anual: una celda por día (columnas = semanas lunes-domingo), coloreada
// por el peor nivel de ese día y marcada con su ícono (el color nunca va solo). Toca un día para filtrar.
// Espejo móvil de la barra anual de la web (lineaTiempo.js), con datos de GET /mediciones/resumen-diario.
import React, { useMemo, useRef } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Text } from './Typography';
import { TOKENS, NIVELES } from './DesignTokens';
import { Segmented, Button, Spinner, SwatchNivel } from './DesignComponents';
import { IconNivel, IconClose } from './Icons';
import { mapaCalor, etiquetaCelda, aniosDisponibles } from './linea';
import { fechaLarga, plural, hoyLocal } from './fechas';

const CELDA = 22;
const SEP = 3;
const PASO = CELDA + SEP;
const COLOR_VACIO = '#e6dccb';
const TINTA = '#201e1d';

export function Celda({ celda, seleccionada, onPress }) {
  if (!celda) return <View style={{ width: CELDA, height: CELDA }} />;
  const nivel = celda.nivel;
  const fondo = !celda.conFotos ? COLOR_VACIO : nivel === null ? TOKENS.colors.neutral400 : NIVELES[nivel].color;
  return (
    <Pressable
      onPress={() => onPress?.(celda)}
      disabled={!celda.conFotos}
      hitSlop={2}
      accessibilityRole="button"
      accessibilityLabel={etiquetaCelda(celda)}
      accessibilityState={{ selected: seleccionada, disabled: !celda.conFotos }}
      style={{
        width: CELDA,
        height: CELDA,
        borderRadius: 5,
        backgroundColor: fondo,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: seleccionada ? 2.5 : 0,
        borderColor: TINTA,
      }}
    >
      {celda.conFotos && nivel !== null ? <IconNivel nivel={nivel} size={13} color={TINTA} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

function Leyenda() {
  return (
    <View
      accessibilityLabel="Leyenda: color e ícono por peor nivel del día"
      style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 12 }}
    >
      {NIVELES.map((n) => (
        <View key={n.i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <SwatchNivel nivel={n.i} />
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>{n.label}</Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: COLOR_VACIO }} />
        <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>Sin fotos</Text>
      </View>
    </View>
  );
}

export default function MapaCalor({ anio, setAnio, resumen, diaSel, onSelDia, onReintentar, hoy = hoyLocal() }) {
  const scroll = useRef(null);
  const anios = aniosDisponibles(hoy);
  const dias = resumen?.dias || [];
  const mapa = useMemo(() => mapaCalor(dias, anio, hoy), [dias, anio, hoy]);
  const celdaSel = useMemo(() => mapa.semanas.flat().find((c) => c && c.fecha === diaSel) || null, [mapa, diaSel]);
  const { width: anchoPantalla } = useWindowDimensions();
  // Ancho visible = un número entero de columnas (sin medias celdas) y alineado con el margen de la página.
  const disponible = anchoPantalla - TOKENS.spacing.lg * 2;
  const columnasVisibles = Math.max(1, Math.floor((disponible + SEP) / PASO));
  const anchoVisible = columnasVisibles * PASO - SEP;
  const ancho = mapa.semanas.length * PASO - SEP;
  const inicioX = Math.max(0, (mapa.semanas.length - columnasVisibles) * PASO);

  const alternar = (celda) => onSelDia?.(diaSel === celda.fecha ? null : celda.fecha);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <Text accessibilityRole="header" style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text, flexShrink: 1 }}>
          Días con fotos
        </Text>
        {anios.length > 1 && (
          <Segmented options={anios.map((a) => ({ value: a, label: String(a) }))} value={anio} onChange={setAnio} />
        )}
      </View>

      {resumen?.estado === 'cargando' && !dias.length ? (
        <View style={{ height: 7 * PASO + 20, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={32} thickness={3} />
        </View>
      ) : resumen?.estado === 'error' && !dias.length ? (
        <View style={{ gap: 8, paddingVertical: 8 }}>
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.danger }}>
            {resumen.error || 'No se pudo cargar el mapa de días.'}
          </Text>
          <Button variant="tonal" label="Reintentar" fullWidth={false} onPress={onReintentar} />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={PASO}
            decelerationRate="fast"
            onContentSizeChange={() => scroll.current?.scrollTo({ x: inicioX, animated: false })}
            accessibilityLabel={`Mapa de calor del año ${anio}: ${plural(mapa.diasConFotos, 'día con fotos', 'días con fotos')}`}
            style={{ width: anchoVisible }}
          >
            <View style={{ width: ancho }}>
              <View style={{ height: 18, marginBottom: 4 }}>
                {mapa.meses.map((m) => (
                  <Text
                    key={m.semana}
                    style={{ position: 'absolute', left: m.semana * PASO, ...TOKENS.type.labelSmall, color: TOKENS.colors.neutral600 }}
                  >
                    {m.nombre}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: SEP }}>
                {mapa.semanas.map((semana, i) => (
                  <View key={i} style={{ gap: SEP }}>
                    {semana.map((c, j) => (
                      <Celda key={j} celda={c} seleccionada={Boolean(c) && c.fecha === diaSel} onPress={alternar} />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
          <Leyenda />
          <View style={{ minHeight: 48, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {celdaSel ? (
              <>
                <View style={{ flex: 1 }} accessibilityLiveRegion="polite">
                  <Text style={{ ...TOKENS.type.titleSmall, color: TOKENS.colors.text }}>{fechaLarga(celdaSel.fecha)}</Text>
                  <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
                    {plural(celdaSel.total, 'foto', 'fotos')}
                    {celdaSel.nivel !== null ? ` · peor nivel ${NIVELES[celdaSel.nivel].label}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onSelDia?.(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar el filtro de día"
                  hitSlop={6}
                  style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconClose size={22} color={TOKENS.colors.neutral700} />
                </Pressable>
              </>
            ) : (
              <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, flex: 1 }}>
                {mapa.diasConFotos
                  ? `${plural(mapa.diasConFotos, 'día con fotos', 'días con fotos')} en ${anio}. Toca un día para ver solo sus fotos.`
                  : `Sin fotos en ${anio}.`}
                {resumen?.truncado ? ' Datos parciales: hay más días de los que se pudieron leer.' : ''}
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}
