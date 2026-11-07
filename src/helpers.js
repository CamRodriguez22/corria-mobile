import React from 'react';
import { View, Text } from 'react-native';
import { TOKENS } from './DesignTokens';
import { IconCheck } from './Icons';
import { bloqueDeMedicion } from './utils';

export * from './logic';

export function tituloBloque(m, bloqueMap, bloquesMap = {}) {
  const listaReal = Object.values(bloquesMap);
  const b = bloqueDeMedicion(m, bloqueMap, listaReal.length ? listaReal : undefined);
  return b ? (bloquesMap[b]?.nombre || 'Punto sin nombre') : 'Sin punto';
}

export function ErrorText({ text }) {
  if (!text) return null;
  return (
    <View style={{ backgroundColor: TOKENS.colors.dangerTint, borderRadius: TOKENS.radius.sm, padding: 10, marginBottom: 12 }}>
      <Text style={{ color: TOKENS.colors.danger, fontSize: TOKENS.fontSizes.small, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function CheckRow({ text }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <IconCheck size={16} color={TOKENS.colors.accent2_700} />
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.text }}>{text}</Text>
    </View>
  );
}
