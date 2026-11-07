import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Screen, Header, ResultCard, Field, Button } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconCheck } from '../Icons';

const PAD = TOKENS.spacing.lg;

export default function ResultScreen({
  medicion,
  bloqueSel,
  loteNombre,
  espesor,
  setEspesor,
  descripcion,
  setDescripcion,
  obsOpen,
  setObsOpen,
  obsSaved,
  onSaveObs,
  onNext,
  onTerminarLote,
  onHome,
}) {
  const imagenUri = medicion._localUri || medicion.url_imagen;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Screen>
      <Header title="Resultado del análisis" onBack={onHome} />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
        <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {imagenUri ? (
            <Image
              source={{ uri: imagenUri }}
              style={{
                width: '100%',
                height: 220,
                borderRadius: TOKENS.radius.lg,
                marginBottom: 14,
                backgroundColor: TOKENS.colors.neutral200,
              }}
              resizeMode="cover"
            />
          ) : null}

          <ResultCard
            medicion={medicion}
            ubicacion={`Punto ${bloqueSel}`}
            loteNombre={medicion.lote_nombre || loteNombre}
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 10,
              marginBottom: 12,
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: TOKENS.colors.neutral600, fontSize: TOKENS.fontSizes.small }}>
              Estado de sincronización
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconCheck size={16} color={TOKENS.colors.accent2_800} />
              <Text style={{ color: TOKENS.colors.accent2_800, fontWeight: '700', fontSize: TOKENS.fontSizes.small }}>
                En la nube
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setObsOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Alternar observaciones de campo"
            style={{
              backgroundColor: TOKENS.colors.surfaceAlt,
              borderRadius: TOKENS.radius.md,
              padding: 16,
              marginTop: 4,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: TOKENS.colors.border,
              minHeight: 52,
              ...TOKENS.shadow.sm,
            }}
          >
            <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text }}>
              Observaciones de campo <Text style={{ color: TOKENS.colors.neutral500, fontWeight: '400' }}>(opcional)</Text>
            </Text>
            <Text style={{ fontSize: 20, color: TOKENS.colors.accent, fontWeight: '700' }}>
              {obsOpen ? '−' : '＋'}
            </Text>
          </Pressable>

          {obsOpen && (
            <View
              style={{
                marginTop: 12,
                backgroundColor: TOKENS.colors.surfaceAlt,
                borderRadius: TOKENS.radius.lg,
                padding: 16,
                borderWidth: 1,
                borderColor: TOKENS.colors.border,
                ...TOKENS.shadow.sm,
              }}
            >
              <Field
                label="Espesor de placa (mm)"
                value={espesor}
                onChangeText={setEspesor}
                placeholder="Ej. 2.4"
                keyboardType="decimal-pad"
              />
              <Field
                label="Descripción y notas"
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Condiciones observadas, orientación, notas…"
                multiline
                autoCapitalize="sentences"
              />
              <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: TOKENS.colors.neutral500, marginBottom: 12, lineHeight: 16 }}>
                * El espesor y notas se guardan de forma local en este dispositivo móvil.
              </Text>
              <Button
                variant="ghost"
                label={obsSaved ? 'Guardado en este teléfono ✓' : 'Guardar notas en este teléfono'}
                onPress={onSaveObs}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

        <View style={{ padding: PAD, gap: 10, borderTopWidth: 1, borderTopColor: TOKENS.colors.neutral200 }}>
          <Button
            label={loteNombre ? 'Siguiente foto en este lote' : 'Siguiente foto en este punto'}
            onPress={onNext}
          />
          {!!loteNombre && (
            <Button variant="secondary" label="Terminar lote" onPress={onTerminarLote} />
          )}
          <Button variant="ghost" label="Volver al inicio" onPress={onHome} />
        </View>
      </Animated.View>
    </Screen>
  );
}
