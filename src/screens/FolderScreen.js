import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../Typography';
import { Screen, Header, EmptyState, Button, NivelBadge, Spinner, PctMono } from '../DesignComponents';
import GaleriaFotos from '../GaleriaFotos';
import GraficaTendencia from '../GraficaTendencia';
import FiltroFotos from '../FiltroFotos';
import { TOKENS } from '../DesignTokens';
import { agruparPorBloque } from '../utils';
import { mezclarMediciones } from '../logic';
import { filasDeGaleria, estadoPunto, tituloPunto } from '../galeria';
import { fechaLarga, fechaMedia, formatoPct, plural } from '../fechas';
import { nombreNivel } from '../niveles';
import { elegirEstadoPunto } from '../puntos';
import { totalesPorMes, filtrarMediciones, FILTROS_VACIOS, hayFiltros } from '../linea';
import useTendenciaPunto from '../useTendenciaPunto';

const PAD = TOKENS.spacing.lg;

function textoFotosCargadas(n, historial) {
  if (!n) return historial?.estado === 'ok' ? 'Sin fotos' : 'Cargando las fotos…';
  const todas = historial?.estado === 'ok' && !historial.hayMas;
  return todas ? plural(n, 'foto', 'fotos') : `${plural(n, 'foto cargada', 'fotos cargadas')}; hay más por cargar`;
}

export default function FolderScreen({
  clave,
  mediciones,
  bloqueMap,
  bloquesMap,
  listaBloques,
  empresaLinea,
  historial,
  resumenes = {},
  onCargarResumen,
  onCargarHistorial,
  onBack,
  onOpen,
  onAbrirLote,
}) {
  const bloque = bloquesMap[clave] || { nombre: 'Sin punto' };
  const esPuntoReal = clave !== 'SIN_BLOQUE';

  // Primero lo ya cargado en Inicio/Actividad (aparece al instante); después el historial real del punto.
  const locales = useMemo(
    () => agruparPorBloque(mediciones, bloqueMap, listaBloques).find((g) => g.clave === clave)?.items || [],
    [mediciones, bloqueMap, listaBloques, clave]
  );
  const lista = useMemo(() => mezclarMediciones(locales, historial?.lista || []).lista, [locales, historial]);
  const estadoLocal = useMemo(() => estadoPunto(lista), [lista]);

  useEffect(() => {
    if (esPuntoReal && !historial) onCargarHistorial?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // Tendencia: resumen por día de este punto del año en curso y del anterior (si existe en el backend).
  const tendencia = useTendenciaPunto(esPuntoReal ? clave : null, resumenes, onCargarResumen);
  const { resumenesPunto, dias: diasPunto } = tendencia;
  // Estado del día más reciente: con el resumen del servidor (todas las fotos del día); si no, con las cargadas y se avisa.
  const { estado, parcial: estadoParcial } = useMemo(
    () => elegirEstadoPunto({ resumenes: esPuntoReal ? resumenesPunto : [], local: estadoLocal, hayMas: !historial || historial.hayMas }),
    [resumenes, estadoLocal, historial, esPuntoReal, clave] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Total de cada mes según el servidor (no cambia al cargar más fotos).
  const totalesMes = useMemo(() => totalesPorMes(diasPunto, { truncado: resumenesPunto.some((r) => r?.truncado) }), [resumenes, clave]); // eslint-disable-line react-hooks/exhaustive-deps
  // Filtro común (nombre, fechas, nivel) sobre las fotos cargadas del punto.
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const nombreDelPunto = tituloPunto(bloque.nombre);
  const filtradas = useMemo(
    () => filtrarMediciones(lista, filtros, { clavePunto: () => clave, nombresExtra: () => nombreDelPunto }),
    [lista, filtros, clave, nombreDelPunto]
  );
  const filtrado = hayFiltros(filtros);
  // Con filtros, los totales por mes del servidor ya no corresponden a lo que se ve.
  const filas = useMemo(() => filasDeGaleria(filtradas, { totalesMes: filtrado ? null : totalesMes }), [filtradas, totalesMes, filtrado]);

  const cargando = historial?.estado === 'cargando';
  const cargandoMas = historial?.estado === 'mas';

  const cabecera = (
    <View style={{ paddingHorizontal: PAD, paddingTop: PAD }}>
      {esPuntoReal && (
        <View>
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
      {estado ? (
        <View
          accessible
          accessibilityLabel={`Estado del punto el ${fechaLarga(estado.dia)}. Promedio del día: ${estado.promedio === null ? 'sin porcentaje' : formatoPct(estado.promedio)}, ${nombreNivel(estado.nivel)}. Peor foto del día: ${estado.peorPct === null ? '' : formatoPct(estado.peorPct) + ', '}${nombreNivel(estado.peor)}.`}
          style={{
            gap: 12,
            marginTop: esPuntoReal ? 16 : 0,
            backgroundColor: TOKENS.colors.surfaceAlt,
            borderRadius: TOKENS.radius.lg,
            borderWidth: 1,
            borderColor: TOKENS.colors.border,
            padding: 16,
            ...TOKENS.shadow.card,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...TOKENS.type.titleSmall, color: TOKENS.colors.neutral600 }}>Estado del punto</Text>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>{fechaMedia(estado.dia)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ ...TOKENS.type.labelSmall, color: TOKENS.colors.neutral600 }}>PROMEDIO DEL DÍA</Text>
              {estado.promedio !== null && (
                <PctMono value={estado.promedio} size={24} />
              )}
              <NivelBadge nivel={estado.nivel} compacto />
            </View>
            <View style={{ width: 1, backgroundColor: TOKENS.colors.neutral200 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ ...TOKENS.type.labelSmall, color: TOKENS.colors.neutral600 }}>PEOR FOTO DEL DÍA</Text>
              {estado.peorPct !== null && (
                <PctMono value={estado.peorPct} size={24} />
              )}
              <NivelBadge nivel={estado.peor} compacto />
            </View>
          </View>
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
            {plural(estado.fotos, 'foto', 'fotos')} ese día
          </Text>
          {estadoParcial && (
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.warningText }}>
              Calculado con las fotos cargadas; puede cambiar al cargar más.
            </Text>
          )}
        </View>
      ) : null}
      <Text accessibilityRole="header" style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text, marginTop: 24 }}>
        Fotos del punto
      </Text>
      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 2 }}>
        {textoFotosCargadas(lista.length, historial)}
      </Text>
    </View>
  );

  const filtro = (
    <FiltroFotos
      filtros={filtros}
      onChange={setFiltros}
      total={filtradas.length}
      nota={filtrado && (historial?.hayMas || !historial) ? 'Solo entre las fotos cargadas' : ''}
    />
  );

  const cabeceraCompleta = (
    <View>
      {cabecera}
      {filtro}
    </View>
  );

  const pie = (
    <View style={{ padding: PAD, gap: 12 }}>
      {(cargando || cargandoMas) && (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <Spinner size={32} thickness={3} />
        </View>
      )}
      {historial?.estado === 'error' && (
        <View style={{ gap: 8 }}>
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.danger }}>{historial.error}</Text>
          <Button variant="tonal" label="Reintentar" onPress={() => onCargarHistorial?.({ mas: lista.length > 0 && Boolean(historial.lista?.length) })} />
        </View>
      )}
      {historial?.estado === 'ok' && historial.hayMas && (
        <Button variant="tonal" label="Cargar más fotos" onPress={() => onCargarHistorial?.({ mas: true })} />
      )}
      {historial?.estado === 'ok' && !historial.hayMas && lista.length > 0 && (
        <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, textAlign: 'center' }}>
          Estas son todas las fotos de este punto.
        </Text>
      )}
    </View>
  );

  return (
    <Screen>
      <Header title={tituloPunto(bloque.nombre)} subtitle={empresaLinea || undefined} onBack={onBack} />
      <GaleriaFotos
        filas={filas}
        mostrarDia
        nombrePunto={() => tituloPunto(bloque.nombre)}
        onAbrirFoto={onOpen}
        onAbrirLote={(f) => onAbrirLote?.(f.loteClave)}
        ListHeaderComponent={cabeceraCompleta}
        ListFooterComponent={pie}
        ListEmptyComponent={
          cargando || !historial ? null : filtrado && lista.length ? (
            <EmptyState title="Sin fotos" subtitle="Ninguna foto cargada coincide con estos filtros." />
          ) : (
            <EmptyState title="Punto sin fotos" subtitle="Todavía no se han subido fotos de este punto." />
          )
        }
        contentContainerStyle={{ paddingBottom: 36 }}
      />
    </Screen>
  );
}
