import React from 'react';
import { View, Text } from 'react-native';
import { Screen, Header, Button } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconCamera } from '../Icons';

const PAD = TOKENS.spacing.lg;

export default function CameraScreen({ bloqueSel, onBack, onPick }) {
  return (
    <Screen>
      <Header title="Capturar inspección" subtitle={`Punto ${bloqueSel}`} onBack={onBack} />
      <View style={{ flex: 1, padding: PAD, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        <View
          style={{
            width: 220,
            height: 220,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: TOKENS.colors.accent300,
            borderStyle: 'dashed',
            backgroundColor: TOKENS.colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <IconCamera size={56} color={TOKENS.colors.accent} strokeWidth={1.8} />
          <Text style={{ color: TOKENS.colors.neutral600, fontSize: TOKENS.fontSizes.small, fontWeight: '600' }}>
            Mín. 640 × 480 px
          </Text>
        </View>
        <Text style={{ textAlign: 'center', color: TOKENS.colors.neutral600, fontSize: TOKENS.fontSizes.small, maxWidth: 280, lineHeight: 20 }}>
          Enfoca la placa metálica de frente. Puedes tomar una foto en campo o elegir varias fotos de la galería en lote.
        </Text>
      </View>
      <View style={{ padding: PAD, gap: 12 }}>
        <Button label="Tomar foto con cámara" onPress={() => onPick(true)} />
        <Button variant="secondary" label="Elegir foto(s) de la galería" onPress={() => onPick(false)} />
        <Button variant="ghost" label="Volver" onPress={onBack} />
      </View>
    </Screen>
  );
}
