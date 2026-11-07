import React from 'react';
import { View, ScrollView, Image } from 'react-native';
import { Screen, Header, Button } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { CheckRow } from '../helpers';

const PAD = TOKENS.spacing.lg;

export default function PreviewScreen({ foto, bloqueSel, onBack, onConfirm }) {
  return (
    <Screen>
      <Header title="Revisar foto" subtitle={`Punto ${bloqueSel} · validada`} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: PAD }}>
        {foto?.uri ? (
          <Image
            source={{ uri: foto.uri }}
            style={{
              width: '100%',
              height: 280,
              borderRadius: TOKENS.radius.lg,
              backgroundColor: TOKENS.colors.neutral200,
            }}
            resizeMode="cover"
          />
        ) : null}
        <View
          style={{
            marginTop: 16,
            backgroundColor: TOKENS.colors.surfaceAlt,
            borderRadius: TOKENS.radius.lg,
            padding: 16,
            gap: 12,
            borderWidth: 1,
            borderColor: TOKENS.colors.border,
            ...TOKENS.shadow.sm,
          }}
        >
          <CheckRow text={`Resolución ${foto?.width || '—'} × ${foto?.height || '—'} px`} />
          <CheckRow text="Formato y compresión optimizados" />
          <CheckRow text={`Asociado al punto ${bloqueSel}`} />
        </View>
      </ScrollView>
      <View style={{ padding: PAD, gap: 10 }}>
        <Button label="Usar foto y analizar" onPress={onConfirm} />
        <Button variant="ghost" label="Retomar foto" onPress={onBack} />
      </View>
    </Screen>
  );
}
