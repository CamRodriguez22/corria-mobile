import React, { useEffect, useMemo, useRef } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Animated, Easing, useWindowDimensions } from 'react-native';
import { Text } from '../Typography';
import { Screen, Header, ResultCard, Field, Button, Banner, Foto, SectionTitle, IconButton, useReducedMotion } from '../DesignComponents';
import { FilaGaleria, anchoFicha } from '../GaleriaFotos';
import { TOKENS } from '../DesignTokens';
import { IconCheck, IconPlus, IconMinus, IconHome } from '../Icons';
import { textoResumenCola } from '../logic';
import { construirMosaico, dividirEnFilas } from '../galeria';
import { imagenDe, claveCacheImagen } from '../miniaturas';

const PAD = TOKENS.spacing.lg;

export default function ResultScreen({
  medicion,
  cola = [],
  onSeleccionar,
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
  resumenLote,
  onReintentar,
  onBack,
  onHome,
}) {
  const { width } = useWindowDimensions();
  const reducido = useReducedMotion();
  const fadeAnim = useRef(new Animated.Value(reducido ? 1 : 0)).current;

  useEffect(() => {
    if (reducido) {
      fadeAnim.setValue(1);
      return;
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, [fadeAnim, reducido]);

  // Todas las fotos analizadas de la tanda (con su foto local) y la elegida.
  const analizadas = useMemo(
    () => cola.filter((f) => f.status === 'lista' && f.medicion).map((f) => ({ ...f.medicion, _localUri: f.uri })),
    [cola]
  );
  const filas = useMemo(() => dividirEnFilas(construirMosaico(analizadas, { agrupar: false }), 3), [analizadas]);
  const lado = anchoFicha(width, 3, PAD);
  const varias = analizadas.length > 1;

  const resumen = resumenLote ? textoResumenCola(resumenLote) : '';
  const hayFallidas = Boolean(resumenLote?.fallidas);
  const uri = imagenDe(medicion);

  return (
    <Screen>
      <Header
        title="Resultado"
        subtitle={resumen || `Punto ${bloqueSel}`}
        onBack={onBack || onHome}
        right={
          <IconButton onPress={onHome} label="Volver al inicio">
            <IconHome size={24} color={TOKENS.colors.text} />
          </IconButton>
        }
      />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
            {hayFallidas && (
              <View style={{ gap: 10 }}>
                <Banner tone="danger" text={resumenLote.primerError || 'Algunas fotos no se pudieron analizar.'} />
                {resumenLote?.reintentables > 0 && onReintentar && <Button variant="tonal" label="Reintentar las fallidas" onPress={onReintentar} />}
              </View>
            )}

            {varias && (
              <View>
                <SectionTitle title="Fotos analizadas" />
                <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginBottom: 10 }}>
                  Toca una para ver su resultado.
                </Text>
                <View style={{ marginHorizontal: -PAD }}>
                  {filas.map((fichas, i) => (
                    <FilaGaleria
                      key={i}
                      fichas={fichas}
                      lado={lado}
                      margen={PAD}
                      radio={12}
                      seleccionadaId={medicion?.id_medicion}
                      onAbrirFoto={onSeleccionar}
                    />
                  ))}
                </View>
              </View>
            )}

            <Foto uri={uri} cacheKey={claveCacheImagen(medicion)} style={{ width: width - PAD * 2, height: (width - PAD * 2) * 0.58, borderRadius: TOKENS.radius.lg }} iconSize={40} />

            <ResultCard medicion={medicion} ubicacion={`Punto ${bloqueSel}`} loteNombre={medicion.lote_nombre || loteNombre} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
              <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Estado de sincronización</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <IconCheck size={16} color={TOKENS.colors.piedra_800} />
                <Text style={{ ...TOKENS.type.titleSmall, color: TOKENS.colors.piedra_800 }}>En la nube</Text>
              </View>
            </View>

            <Pressable
              onPress={() => setObsOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Alternar observaciones de campo"
              accessibilityState={{ expanded: obsOpen }}
              style={{
                backgroundColor: TOKENS.colors.surfaceAlt,
                borderRadius: TOKENS.radius.md,
                paddingHorizontal: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: TOKENS.colors.border,
                minHeight: 56,
              }}
            >
              <Text style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text }}>
                Observaciones de campo <Text style={{ color: TOKENS.colors.neutral600, fontWeight: '400' }}>(opcional)</Text>
              </Text>
              {obsOpen ? <IconMinus size={20} color={TOKENS.colors.accentText} /> : <IconPlus size={20} color={TOKENS.colors.accentText} />}
            </Pressable>

            {obsOpen && (
              <View style={{ backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: TOKENS.radius.lg, padding: 16, borderWidth: 1, borderColor: TOKENS.colors.border }}>
                <Field label="Espesor de placa (mm)" value={espesor} onChangeText={setEspesor} placeholder="Por ejemplo 2.4" keyboardType="decimal-pad" />
                <Field
                  label="Descripción y notas"
                  value={descripcion}
                  onChangeText={setDescripcion}
                  placeholder="Condiciones observadas, orientación, notas…"
                  multiline
                  autoCapitalize="sentences"
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLiveRegion="polite">
                  {obsSaved && <IconCheck size={16} color={TOKENS.colors.piedra_700} />}
                  <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, flex: 1 }}>
                    {obsSaved ? 'Guardado solo en este teléfono.' : 'Se guarda solo en este teléfono, automáticamente.'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={{ padding: PAD, gap: 8, borderTopWidth: 1, borderTopColor: TOKENS.colors.neutral300, backgroundColor: TOKENS.colors.surfaceAlt }}>
          {/* Una sola acción principal; terminar el lote es secundaria y neutral (no compite con ella). */}
          <Button label={loteNombre ? 'Siguiente foto en este lote' : 'Siguiente foto en este punto'} onPress={onNext} />
          {!!loteNombre && <Button variant="outlined" compact label="Terminar lote" onPress={onTerminarLote} />}
        </View>
      </Animated.View>
    </Screen>
  );
}
