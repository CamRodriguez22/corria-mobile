import React, { useState } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Text } from '../Typography';
import { Screen, Header, Button, Foto } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconCheck, IconTrash } from '../Icons';
import { plural } from '../fechas';

const PAD = TOKENS.spacing.lg;

export default function PreviewScreen({ foto, cola = [], bloqueSel, onBack, onConfirm, onQuitar }) {
  const { width } = useWindowDimensions();
  const varias = cola.length > 1;
  const [sel, setSel] = useState(0);
  const idx = Math.min(sel, Math.max(cola.length - 1, 0));
  const actual = varias ? cola[idx] : foto;
  return (
    <Screen>
      <Header
        title={varias ? `${cola.length} fotos seleccionadas` : 'Revisar foto'}
        subtitle={`Punto ${bloqueSel}`}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={{ padding: PAD, gap: 16 }}>
        <Foto uri={actual?.uri} style={{ width: width - PAD * 2, height: (width - PAD * 2) * 0.8, borderRadius: TOKENS.radius.lg }} iconSize={40} />
        {varias && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cola.map((f, i) => (
              <Pressable
                key={i}
                onPress={() => setSel(i)}
                accessibilityRole="button"
                accessibilityLabel={`Foto ${i + 1} de ${cola.length}`}
                accessibilityState={{ selected: i === idx }}
              >
                <Foto
                  uri={f.uri}
                  style={{
                    width: (width - PAD * 2 - 6 * 3) / 4,
                    height: (width - PAD * 2 - 6 * 3) / 4,
                    borderRadius: 10,
                    borderWidth: i === idx ? 3 : 0,
                    borderColor: TOKENS.colors.accent,
                  }}
                  iconSize={18}
                />
              </Pressable>
            ))}
          </View>
        )}
        {varias && !!onQuitar && (
          <Button
            variant="outlined"
            compact
            fullWidth={false}
            label={`Quitar la foto ${idx + 1}`}
            left={<IconTrash size={18} color={TOKENS.colors.neutral700} />}
            onPress={() => {
              onQuitar(idx);
              setSel(0);
            }}
          />
        )}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconCheck size={18} color={TOKENS.colors.piedra_700} />
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.text }}>
              {actual?.width && actual?.height ? `Resolución ${actual.width} × ${actual.height} px` : 'Resolución válida'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconCheck size={18} color={TOKENS.colors.piedra_700} />
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
