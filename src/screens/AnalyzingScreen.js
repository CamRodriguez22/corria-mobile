import React from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { Text } from '../Typography';
import { Screen, Spinner, ProgressBar, Foto, Button } from '../DesignComponents';
import { TOKENS, NIVELES } from '../DesignTokens';
import { IconCheck, IconAlertTriangle, IconNivel } from '../Icons';
import { estadoFotoCola, resumenAvance, indiceActivo, textoEtapa } from '../cola';
import { nivelDeMedicion } from '../niveles';

const PAD = TOKENS.spacing.lg;

function IconoEstado({ estado, item }) {
  if (estado.clave === 'activa') return <Spinner size={22} thickness={3} />;
  if (estado.clave === 'lista') return <IconNivel nivel={nivelDeMedicion(item.medicion || {})} size={22} color={NIVELES[nivelDeMedicion(item.medicion || {})].texto} />;
  if (estado.clave === 'error') return <IconAlertTriangle size={22} color={TOKENS.colors.danger} />;
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TOKENS.colors.neutral400 }} />;
}

export default function AnalyzingScreen({ etapa, colaFotos, bloqueSel, onCancelar }) {
  const { width } = useWindowDimensions();
  const avance = resumenAvance(colaFotos);
  const idx = indiceActivo(colaFotos);
  const actual = colaFotos[idx >= 0 ? idx : colaFotos.length - 1];
  const terminado = etapa === 'completado';
  const titulo = terminado ? 'Análisis completo' : textoEtapa(etapa);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: PAD, gap: 18 }}>
        <View>
          <Foto uri={actual?.uri} style={{ width: width - PAD * 2, height: (width - PAD * 2) * 0.72, borderRadius: TOKENS.radius.lg }} iconSize={40} />
          {!terminado && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                borderRadius: TOKENS.radius.lg,
                backgroundColor: 'rgba(32,30,29,0.38)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: 40, padding: 14 }}>
                <Spinner size={44} thickness={5} />
              </View>
            </View>
          )}
        </View>

        <View style={{ gap: 4 }} accessibilityLiveRegion="polite">
          <Text accessibilityRole="header" style={{ ...TOKENS.type.headlineSmall, color: TOKENS.colors.text }}>
            {titulo}
          </Text>
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
            Punto {bloqueSel}
            {avance.total > 1 && idx >= 0 ? ` · Foto ${idx + 1} de ${avance.total}` : ''}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <ProgressBar value={avance.total > 1 ? avance.porcentaje : etapa === 'analizando_ia' ? 70 : terminado ? 100 : 30} />
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700 }}>{avance.texto}</Text>
        </View>

        {avance.total > 1 && (
          <View style={{ gap: 4 }}>
            {colaFotos.map((f, i) => {
              const estado = estadoFotoCola(f, i === idx ? etapa : '');
              return (
                <View
                  key={i}
                  accessible
                  accessibilityLabel={`Foto ${i + 1}: ${estado.texto}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 4 }}
                >
                  <Foto uri={f.uri} style={{ width: 48, height: 48, borderRadius: 10 }} iconSize={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...TOKENS.type.titleSmall, color: TOKENS.colors.text }}>Foto {i + 1}</Text>
                    <Text style={{ ...TOKENS.type.bodyMedium, color: estado.clave === 'error' ? TOKENS.colors.danger : TOKENS.colors.neutral600 }}>
                      {estado.texto}
                    </Text>
                  </View>
                  <IconoEstado estado={estado} item={f} />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      {!terminado && !!onCancelar && (
        <View style={{ padding: PAD }}>
          <Button variant="outlined" label="Cancelar análisis" onPress={onCancelar} />
        </View>
      )}
    </Screen>
  );
}
