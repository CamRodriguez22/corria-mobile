import React from 'react';
import { View } from 'react-native';
import { Text } from '../Typography';
import { Screen, Header, Button } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconCamera, IconImages } from '../Icons';

const PAD = TOKENS.spacing.lg;

export default function CameraScreen({ bloqueSel, modo = 'individual', onBack, onPick }) {
  const esLote = modo === 'lote';
  return (
    <Screen>
      <Header title="Capturar inspección" subtitle={`Punto ${bloqueSel}`} onBack={onBack} />
      <View style={{ flex: 1, padding: PAD, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        <View
          style={{
            width: 200,
            height: 200,
            borderRadius: 28,
            borderWidth: 2,
            borderColor: TOKENS.colors.accent300,
            borderStyle: 'dashed',
            backgroundColor: TOKENS.colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconCamera size={56} color={TOKENS.colors.accent} strokeWidth={1.8} />
        </View>
        <Text style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.text, textAlign: 'center' }}>Enfoca la placa de frente</Text>
        <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, textAlign: 'center', maxWidth: 300 }}>
          {esLote
            ? 'Toma una foto en campo o elige varias de la galería: todas quedarán en el mismo lote.'
            : 'Toma una foto en campo o elige de la galería: cada foto se guarda como una medición suelta.'}
        </Text>
      </View>
      <View style={{ padding: PAD, gap: 12 }}>
        <Button label="Tomar foto con la cámara" left={<IconCamera size={20} color="#fff" />} onPress={() => onPick(true)} />
        {esLote ? (
          <Button variant="tonal" label="Elegir fotos de la galería" left={<IconImages size={20} color={TOKENS.colors.piedra_900} />} onPress={() => onPick(false)} />
        ) : (
          <>
            <Button
              variant="tonal"
              label="Elegir una foto"
              left={<IconImages size={20} color={TOKENS.colors.piedra_900} />}
              onPress={() => onPick(false, { unaSola: true })}
              accessibilityHint="Abre la galería y te deja recortar la foto"
            />
            <Button
              variant="tonal"
              label="Elegir varias fotos"
              left={<IconImages size={20} color={TOKENS.colors.piedra_900} />}
              onPress={() => onPick(false)}
              accessibilityHint="Abre la galería para elegir varias; no se pueden recortar"
            />
          </>
        )}
      </View>
    </Screen>
  );
}
