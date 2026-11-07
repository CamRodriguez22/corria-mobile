import React from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { Screen, Header, Button, Foto } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconCheck } from '../Icons';
import { plural } from '../fechas';

const PAD = TOKENS.spacing.lg;

export default function PreviewScreen({ foto, cola = [], bloqueSel, onBack, onConfirm }) {
  const { width } = useWindowDimensions();
  const varias = cola.length > 1;
  return (
    <Screen>
      <Header
        title={varias ? `${cola.length} fotos seleccionadas` : 'Revisar foto'}
        subtitle={`Punto ${bloqueSel}`}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={{ padding: PAD, gap: 16 }}>
        <Foto uri={foto?.uri} style={{ width: width - PAD * 2, height: (width - PAD * 2) * 0.8, borderRadius: TOKENS.radius.lg }} iconSize={40} />
        {varias && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cola.map((f, i) => (
              <Foto key={i} uri={f.uri} style={{ width: (width - PAD * 2 - 6 * 3) / 4, height: (width - PAD * 2 - 6 * 3) / 4, borderRadius: 10 }} iconSize={18} />
            ))}
          </View>
        )}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconCheck size={18} color={TOKENS.colors.accent2_700} />
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.text }}>
              {foto?.width && foto?.height ? `Resolución ${foto.width} × ${foto.height} px` : 'Resolución válida'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconCheck size={18} color={TOKENS.colors.accent2_700} />
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.text }}>Se asociará al punto {bloqueSel}</Text>
          </View>
        </View>
      </ScrollView>
      <View style={{ padding: PAD, gap: 8 }}>
        <Button label={varias ? `Analizar ${plural(cola.length, 'foto', 'fotos')}` : 'Usar foto y analizar'} onPress={onConfirm} />
        <Button variant="text" label={varias ? 'Elegir otras fotos' : 'Retomar foto'} onPress={onBack} />
      </View>
    </Screen>
  );
}
