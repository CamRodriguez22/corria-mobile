// CalendarioMes.js — Calendario mensual de actividad (reemplaza el mapa de calor anual de celdas de ~22 dp).
// 7 columnas (lunes a domingo), celdas >= 44 dp con el número del día; los días con fotos van rellenos con el
// color del peor nivel de ese día y su ícono (el color nunca va solo). Abre en el mes actual, con mes
// anterior/siguiente. Toca un día con fotos para filtrar la galería por ese día.
// Los datos salen de GET /mediciones/resumen-diario; el calendario sigue los filtros activos (ver
// aplicarFiltrosADias en linea.js).
import React, { useMemo, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { Text } from './Typography';
import { TOKENS, NIVELES } from './DesignTokens';
import { COLORES_SOBRE_NIVEL, ICONO_SOBRE_NIVEL } from './paleta';
import { Button, Spinner, IconButton, SwatchNivel } from './DesignComponents';
import { IconNivel, IconClose, IconChevronLeft, IconChevronRight } from './Icons';
import { calendarioMes, mesDe, mesAnterior, mesSiguiente, limitesMes, etiquetaCelda, NOMBRES_DIA_SEMANA } from './linea';
import { fechaLarga, plural, hoyLocal } from './fechas';

const TINTA = TOKENS.colors.text;
const MARGEN = 12; // el calendario ocupa casi todo el ancho para que cada celda llegue a 44 dp
const ALTO_CELDA = 48;

export function Celda({ celda, ancho, seleccionada, onPress }) {
  if (!celda) return <View style={{ width: ancho, height: ALTO_CELDA }} />;
  const nivel = celda.nivel;
  const relleno = celda.conFotos ? (nivel === null ? TOKENS.colors.neutral400 : NIVELES[nivel].color) : 'transparent';
  const sobre = celda.conFotos ? (nivel === null ? TINTA : COLORES_SOBRE_NIVEL[nivel]) : celda.futuro ? TOKENS.colors.neutral400 : TOKENS.colors.neutral600;
  return (
    <View style={{ width: ancho, height: ALTO_CELDA, alignItems: 'center', justifyContent: 'center' }}>
      <Pressable
        onPress={() => onPress?.(celda)}
        disabled={!celda.conFotos}
        accessibilityRole="button"
        accessibilityLabel={etiquetaCelda(celda)}
        accessibilityState={{ selected: seleccionada, disabled: !celda.conFotos }}
        style={{
          width: ancho - 4,
          height: ALTO_CELDA - 4,
          borderRadius: 12,
          backgroundColor: relleno,
          alignItems: 'center',
          justifyContent: 'center',
          // Hoy: aro del acento. Elegido: aro de tinta.
          borderWidth: seleccionada || celda.esHoy ? 2.5 : 0,
          borderColor: seleccionada ? TINTA : TOKENS.colors.accent,
        }}
      >
        <Text style={{ fontFamily: TOKENS.fonts.mono, fontSize: 14, lineHeight: 17, fontWeight: celda.conFotos || celda.esHoy ? '700' : '400', color: sobre }}>
          {celda.dia}
        </Text>
        {celda.conFotos && nivel !== null ? <IconNivel nivel={nivel} size={12} color={ICONO_SOBRE_NIVEL[nivel]} strokeWidth={2.4} /> : null}
      </Pressable>
    </View>
  );
}

export default function CalendarioMes({ dias = [], estado, truncado = false, error = '', filtrado = false, diaSel, onSelDia, onReintentar, onCambiarMes, hoy = hoyLocal() }) {
  const { width: anchoPantalla } = useWindowDimensions();
  const [mes, setMes] = useState(() => mesDe(hoy) || { anio: new Date().getFullYear(), mes: new Date().getMonth() + 1 });
  const cal = useMemo(() => calendarioMes(dias, mes, hoy), [dias, mes, hoy]);
  const lim = limitesMes(mes, hoy);
  const celdaSel = useMemo(() => cal.semanas.flat().find((c) => c && c.fecha === diaSel) || null, [cal, diaSel]);
  const ancho = Math.floor((anchoPantalla - MARGEN * 2) / 7);
  const titulo = cal.nombre.charAt(0).toUpperCase() + cal.nombre.slice(1);

  const ir = (nuevo) => {
    setMes(nuevo);
    onCambiarMes?.(nuevo);
  };
  const alternar = (celda) => onSelDia?.(diaSel === celda.fecha ? null : celda.fecha);

  return (
    <View style={{ marginHorizontal: -(TOKENS.spacing.lg - MARGEN) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
        <IconButton onPress={() => ir(mesAnterior(mes))} label="Mes anterior" disabled={!lim.puedeAnterior}>
          <IconChevronLeft size={24} color={TOKENS.colors.text} />
        </IconButton>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text }}>
          {titulo}
        </Text>
        <IconButton onPress={() => ir(mesSiguiente(mes))} label="Mes siguiente" disabled={!lim.puedeSiguiente}>
          <IconChevronRight size={24} color={TOKENS.colors.text} />
        </IconButton>
      </View>

      {estado === 'cargando' && !dias.length ? (
        <View style={{ height: 6 * ALTO_CELDA + 40, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={32} thickness={3} />
        </View>
      ) : estado === 'error' && !dias.length ? (
        <View style={{ gap: 8, padding: TOKENS.spacing.lg - MARGEN }}>
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.danger }}>{error || 'No se pudo cargar el calendario.'}</Text>
          <Button variant="tonal" label="Reintentar" fullWidth={false} onPress={onReintentar} />
        </View>
      ) : (
        <View style={{ paddingHorizontal: MARGEN, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row' }} accessible={false} importantForAccessibility="no-hide-descendants">
            {NOMBRES_DIA_SEMANA.map((d) => (
              <View key={d} style={{ width: ancho, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ ...TOKENS.type.labelSmall, color: TOKENS.colors.neutral600 }}>{d}</Text>
              </View>
            ))}
          </View>
          {cal.semanas.map((semana, i) => (
            <View key={i} style={{ flexDirection: 'row' }}>
              {semana.map((c, j) => (
                <Celda key={j} celda={c} ancho={ancho} seleccionada={Boolean(c) && c.fecha === diaSel} onPress={alternar} />
              ))}
            </View>
          ))}
          <View style={{ minHeight: 48, marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: TOKENS.spacing.lg - MARGEN }}>
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
                {cal.diasConFotos
                  ? `${plural(cal.diasConFotos, 'día con fotos', 'días con fotos')} en ${cal.nombre}${filtrado ? ' según tus filtros' : ''}. Toca un día para ver solo sus fotos.`
                  : filtrado
                    ? `Sin fotos en ${cal.nombre} con estos filtros.`
                    : `Sin fotos en ${cal.nombre}.`}
                {truncado ? ' Datos parciales: hay más días de los que se pudieron leer.' : ''}
              </Text>
            )}
          </View>
          <View
            accessibilityLabel="Leyenda: color e ícono por peor nivel del día"
            style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, paddingHorizontal: TOKENS.spacing.lg - MARGEN, paddingTop: 4 }}
          >
            {NIVELES.map((n) => (
              <View key={n.i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SwatchNivel nivel={n.i} size={16} />
                <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>{n.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
