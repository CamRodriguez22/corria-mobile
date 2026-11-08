// Typography.js — `Text` y `TextInput` de la app: igual que los de react-native, pero eligen la familia
// (Outfit / IBM Plex Mono) según fontWeight. Úsalos en lugar de los de 'react-native'.
// Un Text anidado sin fontFamily ni fontWeight hereda la familia de su padre (como en RN).
import { createContext, useContext } from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { familiaPara } from './tipografia';

const Anidado = createContext(false);

function conFamilia(style, anidado) {
  const plano = StyleSheet.flatten(style) || {};
  if (anidado && plano.fontFamily == null && plano.fontWeight == null) return plano;
  return [plano, { fontFamily: familiaPara(plano.fontFamily, plano.fontWeight), fontWeight: 'normal' }];
}

export function Text({ style, children, ...props }) {
  const anidado = useContext(Anidado);
  return (
    <RNText {...props} style={conFamilia(style, anidado)}>
      <Anidado.Provider value>{children}</Anidado.Provider>
    </RNText>
  );
}

export function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={conFamilia(style, false)} />;
}
