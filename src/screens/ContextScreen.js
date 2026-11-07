import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Screen, Header, Field, Button } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconBuilding, IconGps, IconAlertTriangle } from '../Icons';
import { formatDateTime } from '../utils';

const PAD = TOKENS.spacing.lg;

export default function ContextScreen({
  gps,
  gpsError,
  lugar,
  empresa,
  bloques,
  bloqueSel,
  setBloqueSel,
  loteNombre,
  setLoteNombre,
  onBack,
  onNext,
}) {
  const ciudadDetectada = lugar?.ciudad || empresa?.ciudad || '';

  return (
    <Screen>
      <Header title="Nueva medición" subtitle="Selecciona el punto y lote" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: PAD, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View
          style={{
            backgroundColor: TOKENS.colors.accent2_100,
            borderRadius: TOKENS.radius.lg,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            borderWidth: 1,
            borderColor: TOKENS.colors.accent2_200,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: TOKENS.colors.accent2_200,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconBuilding size={22} color={TOKENS.colors.accent2_900} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '700', color: TOKENS.colors.accent2_900 }}>
              {empresa?.nombre ? `Entidad: ${empresa.nombre}` : 'Nueva medición'}
            </Text>
            {!!(ciudadDetectada || lugar?.barrio) && (
              <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.accent2_800, marginTop: 2 }}>
                {[ciudadDetectada && `Ciudad: ${ciudadDetectada}`, lugar?.barrio].filter(Boolean).join(' · ')}
              </Text>
            )}
            <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: TOKENS.colors.accent2_700, marginTop: 2 }}>
              {formatDateTime()}
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: TOKENS.fontSizes.h6,
            fontWeight: '800',
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: TOKENS.colors.neutral600,
            marginTop: 20,
            marginBottom: 8,
          }}
        >
          Lote (opcional)
        </Text>
        <Field
          label="Nombre del lote"
          placeholder="Ej. Inspección Noviembre, Estructura A"
          value={loteNombre}
          onChangeText={setLoteNombre}
        />

        <Text
          style={{
            fontSize: TOKENS.fontSizes.h6,
            fontWeight: '800',
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: TOKENS.colors.neutral600,
            marginTop: 16,
            marginBottom: 12,
          }}
        >
          Puntos disponibles
        </Text>

        {bloques.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {bloques.map((b) => {
              const active = bloqueSel === b.clave;
              return (
                <Pressable
                  key={b.clave}
                  onPress={() => setBloqueSel(b.clave)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${b.nombre}, ${b.detalle}`}
                  style={{
                    width: '48%',
                    minHeight: 68,
                    borderRadius: TOKENS.radius.md,
                    borderWidth: 1.5,
                    borderColor: active ? TOKENS.colors.accent : TOKENS.colors.neutral300,
                    backgroundColor: active ? TOKENS.colors.accent : TOKENS.colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 12,
                    ...TOKENS.shadow.sm,
                  }}
                >
                  <Text
                    style={{
                      fontSize: TOKENS.fontSizes.h5,
                      fontWeight: '800',
                      color: active ? '#fff' : TOKENS.colors.text,
                      textAlign: 'center',
                    }}
                  >
                    {b.nombre}
                  </Text>
                  {!!b.detalle && (
                    <Text
                      style={{
                        fontSize: TOKENS.fontSizes.xs,
                        color: active ? 'rgba(255,255,255,0.9)' : TOKENS.colors.neutral600,
                        marginTop: 2,
                        textAlign: 'center',
                      }}
                    >
                      {b.detalle}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View
            style={{
              padding: 20,
              backgroundColor: TOKENS.colors.surfaceAlt,
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1,
              borderColor: TOKENS.colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text, textAlign: 'center' }}>
              Tu zona aún no tiene puntos registrados.
            </Text>
            <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
              Pide a un administrador que los cree en la plataforma web para poder asociar tus inspecciones.
            </Text>
          </View>
        )}

        <View
          style={{
            marginTop: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: gpsError ? TOKENS.colors.warningTint : TOKENS.colors.accent2_100,
            borderRadius: TOKENS.radius.md,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: gpsError ? TOKENS.colors.warning : TOKENS.colors.accent2_200,
          }}
        >
          {gpsError ? (
            <IconAlertTriangle size={18} color={TOKENS.colors.warning} />
          ) : (
            <IconGps size={18} color={TOKENS.colors.accent2_800} />
          )}
          <Text
            style={{
              fontSize: TOKENS.fontSizes.small,
              color: gpsError ? TOKENS.colors.warningText : TOKENS.colors.accent2_800,
              flex: 1,
              fontWeight: '500',
            }}
          >
            {gpsError
              ? gpsError
              : gps
              ? `GPS activo · ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`
              : 'Obteniendo ubicación del dispositivo…'}
          </Text>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={{ paddingTop: 16 }}>
          <Button
            label="Capturar foto"
            onPress={onNext}
            disabled={!bloqueSel}
            accessibilityHint={!bloqueSel ? 'Primero selecciona un punto' : undefined}
          />
          <Text style={{ textAlign: 'center', fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500, marginTop: 12 }}>
            {bloqueSel ? 'Las coordenadas se asociarán a la foto' : 'Selecciona un punto para continuar'}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
