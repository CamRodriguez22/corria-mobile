import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Screen, Header, Field, Button, Banner, SectionTitle } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconGps, IconAlertTriangle, IconCheck } from '../Icons';
import { tituloPunto } from '../galeria';

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
  loteNombre,
  setLoteNombre,
  onBack,
  onNext,
}) {
  const ciudad = lugar?.ciudad || empresa?.ciudad || '';
  const contexto = [empresa?.nombre, ciudad, lugar?.barrio].filter(Boolean).join(' · ');

  return (
    <Screen>
      <Header title="Nueva medición" subtitle={contexto || 'Elige dónde vas a medir'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <SectionTitle title="Punto" />
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

        <SectionTitle title="Lote" style={{ marginTop: 20 }} />
        <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginBottom: 10 }}>
          Opcional. Si subes varias fotos, agrúpalas con un nombre.
        </Text>
        <Field
          label=""
          accessibilityLabel="Nombre del lote (opcional)"
          placeholder="Por ejemplo: Inspección de noviembre"
          value={loteNombre}
          onChangeText={setLoteNombre}
          autoCapitalize="sentences"
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }}>
          {gpsError ? <IconAlertTriangle size={20} color={TOKENS.colors.warning} /> : <IconGps size={20} color={TOKENS.colors.accent2_800} />}
          <Text style={{ ...TOKENS.type.bodyMedium, color: gpsError ? TOKENS.colors.warningText : TOKENS.colors.neutral700, flex: 1 }}>
            {gpsError
              ? gpsError
              : gps
              ? `Ubicación lista (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}). Se guardará con la foto.`
              : 'Obteniendo la ubicación del teléfono…'}
          </Text>
        </View>
      </ScrollView>

      <View style={{ padding: PAD, paddingTop: 12, borderTopWidth: 1, borderTopColor: TOKENS.colors.neutral200, gap: 8 }}>
        <Button
          label="Capturar foto"
          onPress={onNext}
          disabled={!bloqueSel}
          accessibilityHint={!bloqueSel ? 'Primero elige un punto' : undefined}
        />
        {!bloqueSel && (
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, textAlign: 'center' }}>Elige un punto para continuar</Text>
        )}
      </View>
    </Screen>
  );
}
