// GraficaTendencia.js — Tendencia del % corroído por día para un punto (react-native-svg, sin dependencias
// de gráficas). Mismo lenguaje que la gráfica de la web (TendenciaPunto.jsx):
//   arriba  línea del promedio diario (acento naranja) con una banda mín-máx del día y un punto por día
//           coloreado por el nivel de ese promedio;
//   abajo   barras apiladas con las fotos del día por nivel;
//   guías finas y SIN líneas de 10 % / 25 % (decisión del dueño).
// El eje X es tiempo real. Tocar un tramo elige el día más cercano (siempre hay uno elegido: el último) y su
// lectura se muestra ARRIBA de la gráfica, sin tapar datos. Alternativa accesible: resumen y "Ver como lista".
import React, { useMemo, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { Text } from './Typography';
import Svg, { Line, Polyline, Polygon, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { TOKENS, NIVELES } from './DesignTokens';
import { IconTrend } from './Icons';
import { NivelBadge, SwatchNivel } from './DesignComponents';
import { escalaTendencia, resumenTendencia, lineasAccesibles, rotuloPeriodo, MIN_DIAS_TENDENCIA } from './tendencia';
import { familiaPara } from './tipografia';
import { formatoPct, formatoPctMono, plural } from './fechas';

const ALTO_LINEA = 150;
const ALTO_BARRAS = 46;
const SEPARACION = 16;
const M = { izq: 44, der: 12, arr: 8, abajo: 24 };
const ALTO = M.arr + ALTO_LINEA + SEPARACION + ALTO_BARRAS + M.abajo;
const REJILLA = 'rgba(32,30,29,0.10)';
const LINEA = TOKENS.colors.accent; // línea del promedio: el acento de marca; el nivel va en los puntos
const MONO = familiaPara('mono', '400');
const UI = familiaPara('ui', '400');

export default function GraficaTendencia({ puntos = [], estado, truncado = false, error = '', onReintentar, margen = TOKENS.spacing.lg }) {
  const { width } = useWindowDimensions();
  const anchoTotal = Math.max(240, width - margen * 2 - 30); // 30 = relleno de la tarjeta
  const area = { ancho: anchoTotal - M.izq - M.der, alto: ALTO_LINEA, altoBarras: ALTO_BARRAS };
  const [sel, setSel] = useState(null);
  const [lista, setLista] = useState(false);

  const escala = useMemo(() => escalaTendencia(puntos, area), [puntos, area.ancho]); // eslint-disable-line react-hooks/exhaustive-deps
  const ok = puntos.length >= MIN_DIAS_TENDENCIA;
  const actual = escala.puntos[sel ?? escala.puntos.length - 1] || null;
  const yBarras = M.arr + ALTO_LINEA + SEPARACION;

  // Cada punto "posee" el tramo más cercano: el área táctil es el tramo, no el punto.
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
      <IconTrend size={20} color={TOKENS.colors.accentText} />
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
        padding: 15,
        gap: 10,
        ...TOKENS.shadow.card,
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

  // Banda mín-máx: un tramo entre días cercanos (<= 4 días; más separados no se interpola) y, en cada día,
  // una barra vertical de su rango. Un día sin mín/máx usa su promedio.
  const lo = (p) => p.yMin ?? p.y;
  const hi = (p) => p.yMax ?? p.y;
  const tramosBanda = escala.puntos
    .map((p, i) => ({ p, a: escala.puntos[i - 1] }))
    .filter(({ p, a }) => a && p.gapDias <= 4)
    .map(({ p, a }) => [`${M.izq + a.x},${M.arr + hi(a)}`, `${M.izq + p.x},${M.arr + hi(p)}`, `${M.izq + p.x},${M.arr + lo(p)}`, `${M.izq + a.x},${M.arr + lo(a)}`].join(' '));
  const hayBanda = escala.puntos.some((p) => p.yMin != null && p.yMax != null);

  const nivelesVistos = [0, 1, 2, 3].filter((n) => escala.puntos.some((p) => (p.porNivel?.[n] ?? 0) > 0));
  const conRango = actual && actual.minPct != null && actual.maxPct != null;

  return tarjeta(
    <>
      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
        Promedio de % corroído por día · {rotuloPeriodo(puntos)}
      </Text>

      {actual && (
        <View accessibilityLiveRegion="polite" style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: TOKENS.fonts.mono, fontSize: 26, lineHeight: 32, fontWeight: '700', color: TOKENS.colors.text }}>
              {formatoPctMono(actual.promedio)}
            </Text>
            <NivelBadge nivel={actual.nivel} compacto />
          </View>
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>
            {actual.etiqueta} · promedio de {plural(actual.total, 'foto', 'fotos')}
            {conRango ? ` · de ${formatoPct(actual.minPct)} a ${formatoPct(actual.maxPct)}` : ''}
          </Text>
        </View>
      )}

      <View accessible accessibilityLabel={`Gráfica. ${resumenTendencia(puntos)}`} style={{ width: anchoTotal, height: ALTO }}>
        <Svg width={anchoTotal} height={ALTO} aria-hidden>
          {escala.marcas.map((m) => (
            <React.Fragment key={m.valor}>
              <Line x1={M.izq} x2={M.izq + area.ancho} y1={M.arr + m.y} y2={M.arr + m.y} stroke={REJILLA} strokeWidth={1} />
              <SvgText x={M.izq - 8} y={M.arr + m.y + 4} fontSize={12} fontFamily={MONO} fill={TOKENS.colors.neutral600} textAnchor="end">
                {m.valor}%
              </SvgText>
            </React.Fragment>
          ))}

          {tramosBanda.map((pts, i) => (
            <Polygon key={i} points={pts} fill={LINEA} fillOpacity={0.16} />
          ))}
          {escala.puntos.map((p) =>
            p.yMin != null && p.yMax != null && p.yMin - p.yMax > 1 ? (
              <Rect key={`r-${p.fecha}`} x={M.izq + p.x - 4} y={M.arr + p.yMax} width={8} height={p.yMin - p.yMax} rx={4} fill={LINEA} fillOpacity={0.2} />
            ) : null
          )}

          {actual && (
            <Line x1={M.izq + actual.x} x2={M.izq + actual.x} y1={M.arr} y2={yBarras + ALTO_BARRAS} stroke={TOKENS.colors.neutral500} strokeWidth={1} />
          )}

          <Polyline
            points={escala.puntos.map((p) => `${M.izq + p.x},${M.arr + p.y}`).join(' ')}
            fill="none"
            stroke={LINEA}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {escala.puntos.map((p) => {
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

          {/* Panel inferior: fotos del día por nivel (barras apiladas). */}
          <Line x1={M.izq} x2={M.izq + area.ancho} y1={yBarras + ALTO_BARRAS} y2={yBarras + ALTO_BARRAS} stroke={TOKENS.colors.neutral400} strokeWidth={1} />
          <SvgText x={M.izq - 8} y={yBarras + ALTO_BARRAS / 2 + 4} fontSize={12} fontFamily={UI} fill={TOKENS.colors.neutral600} textAnchor="end">
            Fotos
          </SvgText>
          {escala.puntos.map((p) =>
            p.segmentos.map((s) => (
              <Rect
                key={`${p.fecha}-${s.nivel}`}
                x={M.izq + p.x - escala.anchoBarra / 2}
                y={yBarras + s.y}
                width={escala.anchoBarra}
                height={Math.max(s.h, 2)}
                fill={NIVELES[s.nivel].color}
                stroke={TOKENS.colors.surfaceAlt}
                strokeWidth={0.75}
              />
            ))
          )}

          {etiquetasX.map((p) => (
            <SvgText
              key={p.fecha}
              x={M.izq + p.x}
              y={ALTO - 6}
              fontSize={12}
              fontFamily={UI}
              fill={TOKENS.colors.neutral600}
              textAnchor={p === escala.puntos[0] ? 'start' : p === escala.puntos[escala.puntos.length - 1] ? 'end' : 'middle'}
            >
              {p.etiqueta}
            </SvgText>
          ))}
        </Svg>

        {/* Un tramo táctil por punto: objetivo grande y sin ambigüedad. */}
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
      </View>

      {/* Leyenda: qué es cada elemento (el color nunca va solo: cada nivel lleva su nombre). */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: LINEA }} />
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>Promedio</Text>
          </View>
          {hayBanda && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 18, height: 12, borderRadius: 3, backgroundColor: 'rgba(193,70,11,0.16)' }} />
              <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>Mínimo a máximo</Text>
            </View>
          )}
        </View>
        {nivelesVistos.length > 0 && (
          <View accessible accessibilityLabel={`Barras, fotos por nivel: ${nivelesVistos.map((n) => NIVELES[n].label).join(', ')}`} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, alignItems: 'center' }}>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Barras:</Text>
            {nivelesVistos.map((n) => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SwatchNivel nivel={n} size={16} />
                <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>{NIVELES[n].label}</Text>
              </View>
            ))}
          </View>
        )}
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
