import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '../Typography';
import { Screen, Header, Field, Button, Banner, SectionTitle, Segmented } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconGps, IconAlertTriangle, IconCheck } from '../Icons';
import { tituloPunto } from '../galeria';
import { MODO_INDIVIDUAL, MODO_LOTE, TEXTO_MODO, puedeContinuar } from '../subida';

const PAD = TOKENS.spacing.lg;

function FilaPunto({ b, activo, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: activo, checked: activo }}
      accessibilityLabel={[tituloPunto(b.nombre), b.detalle].filter(Boolean).join(', ')}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        borderRadius: TOKENS.radius.md,
        borderWidth: 1.5,
        borderColor: activo ? TOKENS.colors.accent : TOKENS.colors.neutral300,
        backgroundColor: activo ? TOKENS.colors.accent100 : TOKENS.colors.surfaceAlt,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: activo ? TOKENS.colors.accent : TOKENS.colors.neutral500,
          backgroundColor: activo ? TOKENS.colors.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {activo && <IconCheck size={14} color="#fff" strokeWidth={3} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text }}>{tituloPunto(b.nombre)}</Text>
        {!!b.detalle && <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 2 }}>{b.detalle}</Text>}
      </View>
    </Pressable>
  );
}

export default function ContextScreen({
  gps,
  gpsError,
  lugar,
  empresa,
  bloques,
  estadoBloques = 'ok', // 'cargando' | 'error' | 'ok'
  onReintentarBloques,
  bloqueSel,
  setBloqueSel,
  modo = MODO_INDIVIDUAL,
  setModo,
  loteNombre,
  setLoteNombre,
  onBack,
  onNext,
}) {
  const ciudad = lugar?.ciudad || empresa?.ciudad || '';
  const listo = puedeContinuar({ modo, bloqueSel, loteNombre });
  const faltante = !bloqueSel ? 'Elige un punto para continuar' : 'Escribe el nombre del lote para continuar';
  const contexto = [empresa?.nombre, ciudad, lugar?.barrio].filter(Boolean).join(' · ');

  return (
    <Screen>
      <Header title="Nueva medición" subtitle={contexto || 'Elige dónde vas a medir'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View accessibilityLabel="Tipo de subida" style={{ paddingTop: 8 }}>
          <Segmented
            options={[
              { value: MODO_INDIVIDUAL, label: 'Individual' },
              { value: MODO_LOTE, label: 'Lote' },
            ]}
            value={modo}
            onChange={setModo}
          />
        </View>
        <Text accessibilityLiveRegion="polite" style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 8 }}>
          {TEXTO_MODO[modo]}
        </Text>

        <SectionTitle title="Punto" style={{ marginTop: 12 }} />
        <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginBottom: 12 }}>
          Elige el punto de monitoreo donde estás tomando las fotos.
        </Text>

        {bloques.length ? (
          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            {bloques.map((b) => (
              <FilaPunto key={b.clave} b={b} activo={bloqueSel === b.clave} onPress={() => setBloqueSel(b.clave)} />
            ))}
          </View>
        ) : estadoBloques === 'cargando' ? (
          <Text style={{ ...TOKENS.type.bodyLarge, color: TOKENS.colors.neutral600, paddingVertical: 16 }}>Cargando los puntos…</Text>
        ) : estadoBloques === 'error' ? (
          <View style={{ gap: 12 }}>
            <Banner tone="danger" text="No se pudieron cargar los puntos. Revisa tu conexión e inténtalo de nuevo." />
            {!!onReintentarBloques && <Button variant="tonal" label="Reintentar" onPress={onReintentarBloques} />}
          </View>
        ) : (
          <Banner text="Tu zona aún no tiene puntos. Pide a un administrador que los cree en la plataforma web." />
        )}

        {modo === MODO_LOTE && (
          <>
            <SectionTitle title="Nombre del lote" style={{ marginTop: 20 }} />
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginBottom: 10 }}>
              Todas las fotos que subas quedarán juntas bajo este nombre.
            </Text>
            <Field
              label=""
              accessibilityLabel="Nombre del lote"
              placeholder="Por ejemplo: Inspección de noviembre"
              value={loteNombre}
              onChangeText={setLoteNombre}
              autoCapitalize="sentences"
            />
          </>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }}>
          {gpsError ? <IconAlertTriangle size={20} color={TOKENS.colors.warning} /> : <IconGps size={20} color={TOKENS.colors.piedra_800} />}
          <Text style={{ ...TOKENS.type.bodyMedium, color: gpsError ? TOKENS.colors.warningText : TOKENS.colors.neutral700, flex: 1 }}>
            {gpsError
              ? gpsError
              : gps
              ? `Ubicación lista (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}). Se guardará con la foto.`
              : 'Obteniendo la ubicación del teléfono…'}
          </Text>
        </View>
      </ScrollView>

      <View style={{ padding: PAD, paddingTop: 12, borderTopWidth: 1, borderTopColor: TOKENS.colors.neutral300, backgroundColor: TOKENS.colors.surfaceAlt, gap: 8 }}>
        <Button
          label="Continuar"
          onPress={onNext}
          disabled={!listo}
          accessibilityHint={!listo ? faltante : undefined}
        />
        {!listo && (
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, textAlign: 'center' }}>{faltante}</Text>
        )}
      </View>
    </Screen>
  );
}
