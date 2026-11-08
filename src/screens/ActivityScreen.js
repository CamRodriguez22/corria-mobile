import React, { useState, useMemo, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View, RefreshControl, ScrollView, Pressable } from 'react-native';
import { Text } from '../Typography';
import { Button, Chip, HojaOpciones, EmptyState, ScreenTitle, AvatarButton, AvisoSinConexion } from '../DesignComponents';
import GaleriaFotos from '../GaleriaFotos';
import CalendarioMes from '../CalendarioMes';
import { TOKENS, NIVELES } from '../DesignTokens';
import { IconNivel } from '../Icons';
import { nombrePuntoDe } from '../helpers';
import { filasDeGaleria } from '../galeria';
import {
  filtrarMediciones, FILTROS_VACIOS, hayFiltros, textoResultados, alternarNivel, rangoEfectivo, PRESETS_RANGO,
  aplicarFiltrosADias, totalesPorMes, aniosDisponibles,
} from '../linea';
import { hoyLocal, fechaMedia } from '../fechas';
import { tituloPunto } from '../galeria';
import { bloqueDeMedicion } from '../utils';

const PAD = TOKENS.spacing.lg;

export default function ActivityScreen({
  offline,
  iniciales,
  onSettings,
  mediciones,
  bloqueMap,
  bloquesMap,
  refreshing,
  hayMas,
  cargandoMas,
  onCargarMas,
  onRefresh,
  onOpen,
  onAbrirLote,
  resumenes = {},
  onCargarResumen,
  onCargarRango,
}) {
  const hoy = hoyLocal();
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [hoja, setHoja] = useState(null); // 'punto' | 'fechas' | null
  const [parcial, setParcial] = useState(false);

  // Resumen por día de cada año disponible (del punto elegido, si hay filtro de punto): alimenta el calendario
  // y los totales reales por mes de la galería. Se pide una vez por año y se guarda en App.
  const anios = useMemo(() => aniosDisponibles(hoy), [hoy]);
  useEffect(() => {
    anios.forEach((a) => onCargarResumen?.(a, { idPunto: filtros.idPunto || null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anios, filtros.idPunto, refreshing]);
  const resumenesAnio = anios.map((a) => resumenes[filtros.idPunto ? `${filtros.idPunto}|${a}` : a]);
  const diasAnios = resumenesAnio.flatMap((r) => r?.dias || []);
  const estadoResumen = resumenesAnio.some((r) => r?.estado === 'cargando') ? 'cargando' : resumenesAnio.some((r) => r?.estado === 'error') ? 'error' : 'ok';
  const resumenTruncado = resumenesAnio.some((r) => r?.truncado);
  const resumenVacio = resumenesAnio.every((r) => r?.estado === 'ok' && !r.dias.length);

  // Con un día o un rango de fechas se traen TODAS sus fotos (pueden ser más antiguas que las
  // ya cargadas). El rango sale de los filtros; el servidor avisa si hubo más de las que caben.
  const rango = rangoEfectivo(filtros, hoy);
  useEffect(() => {
    if (!rango.desde && !rango.hasta) {
      setParcial(false);
      return;
    }
    let vivo = true;
    Promise.resolve(onCargarRango?.(rango)).then((r) => vivo && setParcial(Boolean(r?.truncado)));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rango.desde, rango.hasta, refreshing]);

  const listaPuntos = useMemo(() => Object.values(bloquesMap || {}), [bloquesMap]);
  const filtradas = useMemo(
    () =>
      filtrarMediciones(mediciones, filtros, {
        hoy,
        clavePunto: (m) => bloqueDeMedicion(m, bloqueMap, listaPuntos.length ? listaPuntos : undefined),
      }),
    [mediciones, filtros, hoy, bloqueMap, listaPuntos]
  );
  const filtrado = hayFiltros(filtros);
  // El calendario y los totales por mes siguen los mismos filtros que la galería.
  const diasFiltrados = useMemo(() => aplicarFiltrosADias(diasAnios, filtros, hoy), [diasAnios, filtros, hoy]);
  const totalesMes = useMemo(
    () => totalesPorMes(filtros.dia ? diasFiltrados.filter((d) => d.fecha === filtros.dia) : diasFiltrados, { truncado: resumenTruncado }),
    [diasFiltrados, filtros.dia, resumenTruncado]
  );
  const filas = useMemo(() => filasDeGaleria(filtradas, { hoy, totalesMes }), [filtradas, hoy, totalesMes]);

  const puntoSel = filtros.idPunto ? bloquesMap?.[filtros.idPunto] : null;
  const presetSel = PRESETS_RANGO.find((p) => p.id === filtros.preset) || PRESETS_RANGO[0];
  const opcionesPunto = [{ value: null, label: 'Todos los puntos' }].concat(
    listaPuntos.map((b) => ({ value: b.clave, label: tituloPunto(b.nombre) }))
  );
  const opcionesFechas = PRESETS_RANGO.map((p) => ({
    value: p.id,
    label: p.id === 'todo' ? 'Todas las fechas' : `Últimos ${p.label}`,
  }));
  const quitarTodo = () => setFiltros(FILTROS_VACIOS);

  const cabecera = (
    <View style={{ paddingTop: PAD, paddingBottom: 4 }}>
      <View style={{ paddingHorizontal: PAD }}>
        <View style={{ marginBottom: 14 }}>
          <ScreenTitle title="Actividad" subtitle="Todas las fotos, día por día" right={<AvatarButton iniciales={iniciales} onPress={onSettings} />} />
          {offline && <View style={{ marginTop: 10 }}><AvisoSinConexion /></View>}
        </View>
        <CalendarioMes
          dias={diasFiltrados}
          estado={estadoResumen}
          truncado={resumenTruncado}
          error={resumenesAnio.find((r) => r?.estado === 'error')?.error}
          filtrado={filtros.niveles.length > 0 || filtros.preset !== 'todo' || Boolean(filtros.idPunto)}
          diaSel={filtros.dia}
          onSelDia={(dia) => setFiltros((f) => ({ ...f, dia }))}
          onReintentar={() => anios.forEach((a) => onCargarResumen?.(a, { idPunto: filtros.idPunto || null, forzar: true }))}
          hoy={hoy}
        />
      </View>

      <Text accessibilityRole="header" style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text, paddingHorizontal: PAD, marginTop: 18 }}>
        Filtrar fotos
      </Text>
      <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: PAD, paddingRight: PAD + 32, gap: 8, alignItems: 'center' }}
      >
        {NIVELES.map((n) => {
          const activo = filtros.niveles.includes(n.i);
          return (
            <Chip
              key={n.i}
              label={n.label}
              selected={activo}
              icon={<IconNivel nivel={n.i} size={16} color={activo ? TOKENS.colors.piedra_900 : n.texto} />}
              onPress={() => setFiltros((f) => ({ ...f, niveles: alternarNivel(f.niveles, n.i) }))}
            />
          );
        })}
        <Chip
          label={puntoSel ? tituloPunto(puntoSel.nombre) : 'Punto'}
          selected={Boolean(puntoSel)}
          menu
          onPress={() => setHoja('punto')}
          accessibilityLabel={puntoSel ? `Punto: ${tituloPunto(puntoSel.nombre)}` : 'Filtrar por punto'}
          onQuitar={puntoSel ? () => setFiltros((f) => ({ ...f, idPunto: null })) : undefined}
        />
        {filtros.dia ? (
          <Chip label={`Día: ${fechaMedia(filtros.dia)}`} selected onPress={() => {}} onQuitar={() => setFiltros((f) => ({ ...f, dia: null }))} />
        ) : (
          <Chip
            label={filtros.preset === 'todo' ? 'Fechas' : `Últimos ${presetSel.label}`}
            selected={filtros.preset !== 'todo'}
            menu
            onPress={() => setHoja('fechas')}
            accessibilityLabel="Filtrar por fechas"
            onQuitar={filtros.preset !== 'todo' ? () => setFiltros((f) => ({ ...f, preset: 'todo' })) : undefined}
          />
        )}
      </ScrollView>
      {/* Degradado a la derecha: indica que la fila sigue y no corta chips a media palabra. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(245,234,216,0)', TOKENS.colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 36 }}
      />
      </View>

      <View style={{ paddingHorizontal: PAD, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text accessibilityLiveRegion="polite" style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, flex: 1 }}>
          {textoResultados(filtradas.length, filtrado)}
          {parcial ? ' · Datos parciales: hay más fotos de las que se pudieron cargar' : ''}
        </Text>
        {filtrado && (
          <Pressable
            onPress={quitarTodo}
            accessibilityRole="button"
            accessibilityLabel="Limpiar todos los filtros"
            style={{ minHeight: 48, justifyContent: 'center', paddingLeft: 12 }}
          >
            <Text style={{ ...TOKENS.type.labelLarge, color: TOKENS.colors.accentText }}>Limpiar filtros</Text>
          </Pressable>
        )}
      </View>
      <HojaOpciones
        visible={hoja === 'punto'}
        titulo="Filtrar por punto"
        opciones={opcionesPunto}
        valor={filtros.idPunto}
        onElegir={(v) => {
          setFiltros((f) => ({ ...f, idPunto: v }));
          setHoja(null);
        }}
        onCerrar={() => setHoja(null)}
      />
      <HojaOpciones
        visible={hoja === 'fechas'}
        titulo="Filtrar por fechas"
        opciones={opcionesFechas}
        valor={filtros.preset}
        onElegir={(v) => {
          setFiltros((f) => ({ ...f, preset: v }));
          setHoja(null);
        }}
        onCerrar={() => setHoja(null)}
      />
    </View>
  );

  // Sin ninguna foto cargada y sin filtros, el mapa de días y los filtros no sirven: estado vacío simple.
  if (!mediciones.length && !filtrado && resumenVacio) {
    return (
      <ScrollView
        contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
      >
        <ScreenTitle title="Actividad" subtitle="Todas las fotos, día por día" right={<AvatarButton iniciales={iniciales} onPress={onSettings} />} />
        <EmptyState title="Aún no hay fotos" subtitle="Cuando subas tus primeras fotos, las verás aquí día por día." />
      </ScrollView>
    );
  }

  return (
    <GaleriaFotos
      filas={filas}
      mostrarDia
      nombrePunto={(m) => nombrePuntoDe(m, bloqueMap, bloquesMap)}
      onAbrirFoto={onOpen}
      onAbrirLote={(f) => onAbrirLote?.(f.loteClave)}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={
        <View style={{ paddingVertical: 30 }}>
          <EmptyState title="Sin fotos" subtitle="No hay fotos que coincidan con estos filtros." />
        </View>
      }
      ListFooterComponent={
        hayMas && !rango.desde && !rango.hasta ? (
          <View style={{ padding: PAD }}>
            <Button
              variant="tonal"
              label={cargandoMas ? 'Cargando más…' : 'Cargar fotos anteriores'}
              onPress={onCargarMas}
              loading={cargandoMas}
            />
          </View>
        ) : (
          <View style={{ height: 36 }} />
        )
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
    />
  );
}
