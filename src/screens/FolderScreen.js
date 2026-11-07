import React, { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Screen, Header, EmptyState, Button, NivelBadge, Spinner } from '../DesignComponents';
import GaleriaFotos from '../GaleriaFotos';
import { TOKENS } from '../DesignTokens';
import { agruparPorBloque } from '../utils';
import { mezclarMediciones } from '../logic';
import { filasDeGaleria, estadoPunto, tituloPunto } from '../galeria';
import { fechaLarga, formatoPct, plural } from '../fechas';

const PAD = TOKENS.spacing.lg;

export default function FolderScreen({
  clave,
  mediciones,
  bloqueMap,
  bloquesMap,
  listaBloques,
  empresaLinea,
  historial,
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
  const filas = useMemo(() => filasDeGaleria(lista), [lista]);
  const estado = useMemo(() => estadoPunto(lista), [lista]);

  useEffect(() => {
    if (esPuntoReal && !historial) onCargarHistorial?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const cargando = historial?.estado === 'cargando';
  const cargandoMas = historial?.estado === 'mas';

  const cabecera = (
    <View style={{ paddingHorizontal: PAD, paddingTop: PAD }}>
      {estado ? (
        <View
          accessible
          accessibilityLabel={`Estado actual: ${estado.promedio === null ? '' : formatoPct(estado.promedio) + ', '}${fechaLarga(estado.dia)}`}
          style={{ gap: 8 }}
        >
          <Text style={{ ...TOKENS.type.titleSmall, color: TOKENS.colors.neutral600 }}>Estado actual</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <NivelBadge nivel={estado.nivel} />
            {estado.promedio !== null && (
              <Text style={{ ...TOKENS.type.titleLarge, color: TOKENS.colors.text, fontVariant: ['tabular-nums'] }}>
                {formatoPct(estado.promedio)}
              </Text>
            )}
          </View>
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
            Promedio del {fechaLarga(estado.dia)} · {plural(lista.length, 'foto cargada', 'fotos cargadas')}
          </Text>
        </View>
      ) : null}
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
        nombrePunto={() => tituloPunto(bloque.nombre)}
        onAbrirFoto={onOpen}
        onAbrirLote={(f) => onAbrirLote?.(f.loteClave)}
        ListHeaderComponent={cabecera}
        ListFooterComponent={pie}
        ListEmptyComponent={
          cargando || !historial ? null : (
            <EmptyState title="Punto sin mediciones" subtitle="Todavía no se han subido inspecciones asociadas a este punto." />
          )
        }
        contentContainerStyle={{ paddingBottom: 36 }}
      />
    </Screen>
  );
}
