import React from 'react';
import { View, Text } from 'react-native';
import { Screen, Spinner, ProgressBar } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';

export default function AnalyzingScreen({ etapa, colaFotos, bloqueSel }) {
  let mensaje = 'Procesando inspección…';
  let detalle = 'Conectando con el servidor';

  if (etapa === 'preparando_subida') {
    mensaje = 'Preparando almacenamiento';
    detalle = 'Generando enlace seguro en la nube';
  } else if (etapa === 'subiendo_s3') {
    mensaje = 'Subiendo imagen a la nube';
    detalle = 'Cargando foto en alta resolución';
  } else if (etapa === 'analizando_ia') {
    mensaje = 'Analizando corrosión con IA';
    detalle = 'Segmentando placa y calculando severidad';
  } else if (etapa === 'completado') {
    mensaje = '¡Análisis completado!';
    detalle = 'Sincronizando registros en el sistema';
  }

  const procesadas = colaFotos.filter((f) => f.status === 'lista' || f.status === 'error').length;
  const conError = colaFotos.filter((f) => f.status === 'error').length;
  const total = colaFotos.length || 1;
  const progresoPct = Math.round((procesadas / total) * 100);

  return (
    <Screen center style={{ padding: 36, gap: 24 }}>
      <Spinner size={88} thickness={5} />
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            fontSize: TOKENS.fontSizes.h3,
            fontWeight: '800',
            color: TOKENS.colors.text,
            textAlign: 'center',
          }}
        >
          {mensaje}
        </Text>
        <Text
          style={{
            fontSize: TOKENS.fontSizes.small,
            color: TOKENS.colors.neutral600,
            marginTop: 6,
            textAlign: 'center',
          }}
        >
          Punto {bloqueSel} · {detalle}
        </Text>
      </View>
      <View style={{ width: '100%', gap: 10 }}>
        <ProgressBar
          value={total > 1 ? progresoPct : (etapa === 'analizando_ia' ? 75 : etapa === 'completado' ? 100 : 35)}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500 }}>
            {total > 1 ? `Foto ${Math.min(procesadas + 1, total)} de ${total}` : 'Foto en proceso'}
            {conError ? ` · ${conError} con error` : ''}
          </Text>
          <Text style={{ fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.accent, fontWeight: '700' }}>
            {total > 1 ? `${progresoPct}%` : (etapa === 'analizando_ia' ? 'Fase 2 de 2' : 'Fase 1 de 2')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
