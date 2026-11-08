import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '../Typography';
import { Screen, Header, EmptyState, Button, NivelBadge, Spinner, PctMono } from '../DesignComponents';
import GaleriaFotos from '../GaleriaFotos';
import GraficaTendencia from '../GraficaTendencia';
import { TOKENS } from '../DesignTokens';
import { agruparPorBloque } from '../utils';
import { mezclarMediciones } from '../logic';
import { filasDeGaleria, estadoPunto, tituloPunto } from '../galeria';
import { fechaLarga, fechaMedia, formatoPct, plural, hoyLocal } from '../fechas';
import { nombreNivel } from '../niveles';
import { aniosDisponibles, totalesPorMes } from '../linea';
import { puntosTendencia } from '../tendencia';

const PAD = TOKENS.spacing.lg;

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
  const estado = useMemo(() => estadoPunto(lista), [lista]);

  useEffect(() => {
    if (esPuntoReal && !historial) onCargarHistorial?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // Tendencia: resumen por día de este punto del año en curso y del anterior (si existe en el backend).
  const anios = useMemo(() => aniosDisponibles(hoyLocal()).slice(-2), []);
  useEffect(() => {
    if (!esPuntoReal) return;
    anios.forEach((a) => onCargarResumen?.(a, { idPunto: clave }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  const resumenesPunto = anios.map((a) => resumenes[`${clave}|${a}`]);
  const diasPunto = resumenesPunto.flatMap((r) => r?.dias || []);
  const puntosGrafica = useMemo(() => puntosTendencia(diasPunto), [resumenes, clave]); // eslint-disable-line react-hooks/exhaustive-deps
  const estadoGrafica = resumenesPunto.some((r) => r?.estado === 'cargando') ? 'cargando' : resumenesPunto.some((r) => r?.estado === 'error') ? 'error' : 'ok';

  // Total de cada mes según el servidor (no cambia al cargar más fotos).
  const totalesMes = useMemo(() => totalesPorMes(diasPunto, { truncado: resumenesPunto.some((r) => r?.truncado) }), [resumenes, clave]); // eslint-disable-line react-hooks/exhaustive-deps
  const filas = useMemo(() => filasDeGaleria(lista, { totalesMes }), [lista, totalesMes]);

  const cargando = historial?.estado === 'cargando';
  const cargandoMas = historial?.estado === 'mas';

  const cabecera = (
    <View style={{ paddingHorizontal: PAD, paddingTop: PAD }}>
      {estado ? (
        <View
          accessible
          accessibilityLabel={`Estado del punto el ${fechaLarga(estado.dia)}. Promedio del día: ${estado.promedio === null ? 'sin porcentaje' : formatoPct(estado.promedio)}, ${nombreNivel(estado.nivel)}. Peor foto del día: ${estado.peorPct === null ? '' : formatoPct(estado.peorPct) + ', '}${nombreNivel(estado.peor)}.`}
          style={{
            gap: 12,
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
            {plural(estado.fotos, 'foto', 'fotos')} ese día · {plural(lista.length, 'foto cargada', 'fotos cargadas')} en total
          </Text>
        </View>
      ) : null}
      {esPuntoReal && (
        <View style={{ marginTop: 20 }}>
          <GraficaTendencia
            puntos={puntosGrafica}
            estado={estadoGrafica}
            truncado={resumenesPunto.some((r) => r?.truncado)}
            error={resumenesPunto.find((r) => r?.estado === 'error')?.error}
            onReintentar={() => anios.forEach((a) => onCargarResumen?.(a, { idPunto: clave, forzar: true }))}
            margen={PAD}
          />
        </View>
      )}
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
        ListHeaderComponent={cabecera}
        ListFooterComponent={pie}
        ListEmptyComponent={
          cargando || !historial ? null : (
            <EmptyState title="Punto sin fotos" subtitle="Todavía no se han subido fotos de este punto." />
          )
        }
        contentContainerStyle={{ paddingBottom: 36 }}
      />
    </Screen>
  );
}
