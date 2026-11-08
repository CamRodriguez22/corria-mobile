// GraficaTendencia.js — Tendencia del % corroído por día para un punto (react-native-svg, sin
// dependencias de gráficas). Un solo eje Y (porcentaje), eje X = tiempo real, línea de 2 px,
// puntos de >= 8 px coloreados por el nivel de ese promedio (el nivel también está en el texto),
// rejilla recesiva y dos líneas de referencia rotuladas: 10 % (Moderada) y 25 % (Severa).
// Tocar un tramo del gráfico elige el día más cercano; siempre hay un día elegido (el último).
// Alternativa accesible: resumen en texto y "Ver como lista".
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { TOKENS, NIVELES } from './DesignTokens';
import { IconTrend, IconNivel } from './Icons';
import { escalaTendencia, resumenTendencia, lineasAccesibles, textoDia, ubicarRotulo, MIN_DIAS_TENDENCIA } from './tendencia';
import { formatoPct, plural } from './fechas';

const ALTO = 232;
const M = { izq: 40, der: 10, arr: 56, abajo: 26 }; // banda superior de 56 para el tooltip
const TINTA = TOKENS.colors.neutral700;
const REJILLA = 'rgba(32,30,29,0.10)';
const LINEA = TOKENS.colors.accent2_700; // un solo color de serie; el nivel va en los puntos

export default function GraficaTendencia({ puntos = [], estado, truncado = false, error = '', onReintentar, margen = TOKENS.spacing.lg }) {
  const { width } = useWindowDimensions();
  const anchoTotal = Math.max(240, width - margen * 2 - 28); // 28 = relleno de la tarjeta
  const area = { ancho: anchoTotal - M.izq - M.der, alto: ALTO - M.arr - M.abajo };
  const [sel, setSel] = useState(null);
  const [lista, setLista] = useState(false);

  const escala = useMemo(() => escalaTendencia(puntos, area), [puntos, area.ancho, area.alto]);
  const ok = puntos.length >= MIN_DIAS_TENDENCIA;
  const actual = escala.puntos[sel ?? escala.puntos.length - 1] || null;

  // Fronteras entre tramos: cada punto "posee" el tramo más cercano (el área táctil es el tramo).
  const tramos = useMemo(
    () =>
      escala.puntos.map((p, i, arr) => {
        const ini = i === 0 ? 0 : (arr[i - 1].x + p.x) / 2;
        const fin = i === arr.length - 1 ? area.ancho : (p.x + arr[i + 1].x) / 2;
        return { i, left: M.izq + ini, width: Math.max(fin - ini, 1) };
      }),
    [escala, area.ancho]
  );

  const encabezado = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <IconTrend size={20} color={TOKENS.colors.accent2_800} />
      <Text accessibilityRole="header" style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text, flex: 1 }}>
        Tendencia del punto
      </Text>
    </View>
  );

  const tarjeta = (hijos) => (
    <View
      style={{
        backgroundColor: TOKENS.colors.surfaceAlt,
        borderRadius: TOKENS.radius.lg,
        borderWidth: 1,
        borderColor: TOKENS.colors.border,
        padding: 14,
        gap: 10,
      }}
    >
      {encabezado}
      {hijos}
    </View>
  );

  if (estado === 'cargando' && !puntos.length) {
    return tarjeta(<Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Cargando la tendencia…</Text>);
  }
  if (estado === 'error' && !puntos.length) {
    return tarjeta(
      <View style={{ gap: 8 }}>
        <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.danger }}>{error || 'No se pudo cargar la tendencia.'}</Text>
        {!!onReintentar && (
          <Pressable onPress={onReintentar} accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }}>
            <Text style={{ ...TOKENS.type.labelLarge, color: TOKENS.colors.accentText }}>Reintentar</Text>
          </Pressable>
        )}
      </View>
    );
  }
  if (!ok) {
    return tarjeta(
      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>
        {puntos.length === 1
          ? 'Hay fotos de un solo día. Con fotos de al menos 2 días distintos verás cómo evoluciona este punto.'
          : 'Todavía no hay fotos con porcentaje en este punto. Cuando haya fotos de 2 días distintos verás su evolución aquí.'}
      </Text>
    );
  }

  // Etiquetas del eje X: primer día, último y uno intermedio si cabe.
  const etiquetasX = [escala.puntos[0], escala.puntos[escala.puntos.length - 1]];
  const medio = escala.puntos[Math.floor((escala.puntos.length - 1) / 2)];
  if (medio && medio.x > 70 && area.ancho - medio.x > 70) etiquetasX.splice(1, 0, medio);

  const tipW = 188;
  const tipLeft = actual ? Math.min(Math.max(M.izq + actual.x - tipW / 2, M.izq - 4), anchoTotal - tipW) : 0;

  return tarjeta(
    <>
      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
        Promedio de % corroído por día · {plural(puntos.length, 'día', 'días')}
      </Text>

      <View
        accessible
        accessibilityLabel={`Gráfica. ${resumenTendencia(puntos)}`}
        style={{ width: anchoTotal, height: ALTO }}
      >
        <Svg width={anchoTotal} height={ALTO} aria-hidden>
          {escala.marcas.map((m) => (
            <React.Fragment key={m.valor}>
              <Line x1={M.izq} x2={M.izq + area.ancho} y1={M.arr + m.y} y2={M.arr + m.y} stroke={REJILLA} strokeWidth={1} />
              <SvgText x={M.izq - 6} y={M.arr + m.y + 4} fontSize={12} fill={TOKENS.colors.neutral600} textAnchor="end">
                {m.valor} %
              </SvgText>
            </React.Fragment>
          ))}
          {escala.umbrales.map((u) => {
            // Rótulo sobre su línea, con fondo del color de la tarjeta, en la primera esquina que no tape puntos.
            const r = ubicarRotulo(u, escala.puntos, area);
            return (
              <React.Fragment key={u.valor}>
                <Line x1={M.izq} x2={M.izq + area.ancho} y1={M.arr + u.y} y2={M.arr + u.y} stroke={TINTA} strokeWidth={1.25} />
                <Rect x={M.izq + r.x} y={M.arr + r.y} width={r.w} height={r.h} rx={4} fill={TOKENS.colors.surfaceAlt} fillOpacity={0.96} />
                <SvgText x={M.izq + r.x + r.w - 5} y={M.arr + r.y + r.h - 5} fontSize={12} fontWeight="600" fill={TINTA} textAnchor="end">
                  {u.etiqueta}
                </SvgText>
              </React.Fragment>
            );
          })}
          {actual && (
            <Line x1={M.izq + actual.x} x2={M.izq + actual.x} y1={M.arr} y2={M.arr + area.alto} stroke={TOKENS.colors.neutral500} strokeWidth={1} />
          )}
          <Polyline
            points={escala.puntos.map((p) => `${M.izq + p.x},${M.arr + p.y}`).join(' ')}
            fill="none"
            stroke={LINEA}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {escala.puntos.map((p, i) => {
            const esSel = actual && p.fecha === actual.fecha;
            return (
              <Circle
                key={p.fecha}
                cx={M.izq + p.x}
                cy={M.arr + p.y}
                r={esSel ? 6.5 : 5}
                fill={NIVELES[p.nivel].color}
                stroke={TOKENS.colors.surfaceAlt}
                strokeWidth={2}
              />
            );
          })}
          {etiquetasX.map((p, i) => (
            <SvgText
              key={p.fecha}
              x={M.izq + p.x}
              y={ALTO - 6}
              fontSize={12}
              fill={TOKENS.colors.neutral600}
              textAnchor={p === escala.puntos[0] ? 'start' : p === escala.puntos[escala.puntos.length - 1] ? 'end' : 'middle'}
            >
              {p.etiqueta}
            </SvgText>
          ))}
        </Svg>

        {/* Un tramo táctil por punto (cada punto posee el tramo más cercano): objetivo grande y sin ambigüedad. */}
        {tramos.map((t) => (
          <Pressable
            key={t.i}
            onPress={() => setSel(t.i)}
            accessible={false}
            focusable={false}
            aria-hidden
            style={{ position: 'absolute', left: t.left, width: t.width, top: 0, height: ALTO - M.abajo }}
          />
        ))}

        {actual && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: tipLeft,
              top: 0,
              width: tipW,
              backgroundColor: TOKENS.colors.text,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] }}>{formatoPct(actual.promedio)}</Text>
            <Text style={{ fontSize: 12, color: '#f5ead8' }} numberOfLines={1}>
              {actual.etiqueta} · {NIVELES[actual.nivel].label} · {plural(actual.total, 'foto', 'fotos')}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {actual && <IconNivel nivel={actual.nivel} size={16} color={NIVELES[actual.nivel].texto} />}
        <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700, flex: 1 }} accessibilityLiveRegion="polite">
          {actual ? textoDia(actual) : ''}
        </Text>
      </View>

      {truncado && (
        <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.warningText }}>
          Datos parciales: hay más días de los que se pudieron leer, así que la gráfica puede no mostrar todo.
        </Text>
      )}

      <Pressable
        onPress={() => setLista((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: lista }}
        style={{ minHeight: 48, justifyContent: 'center' }}
      >
        <Text style={{ ...TOKENS.type.labelLarge, color: TOKENS.colors.accentText }}>{lista ? 'Ocultar la lista de días' : 'Ver como lista'}</Text>
      </Pressable>
      {lista && (
        <View style={{ gap: 6 }}>
          {lineasAccesibles(puntos, 10).map((t) => (
            <Text key={t} style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>
              {t}
            </Text>
          ))}
        </View>
      )}
    </>
  );
}
