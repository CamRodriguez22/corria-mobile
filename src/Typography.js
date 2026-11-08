// Typography.js — `Text` y `TextInput` de la app: igual que los de react-native, pero eligen la familia
// (Outfit / IBM Plex Mono) según fontWeight. Úsalos en lugar de los de 'react-native'.
// Un Text anidado sin fontFamily ni fontWeight hereda la familia de su padre (como en RN); uno que solo trae
// peso conserva la familia (mono u Outfit) del padre. Sin fuentes cargadas se usa la del sistema con su peso.
import { createContext, useContext } from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { hayFuentes, resolverEstilo } from './tipografia';

const Anidado = createContext({ anidado: false, familia: undefined });

export function Text({ style, children, ...props }) {
  const { anidado, familia: heredada } = useContext(Anidado);
  const { estilo, familia } = resolverEstilo(StyleSheet.flatten(style) || {}, { anidado, heredada, fuentes: hayFuentes() });
  return (
    <RNText {...props} style={estilo}>
      <Anidado.Provider value={{ anidado: true, familia }}>{children}</Anidado.Provider>
    </RNText>
  );
}

export function TextInput({ style, ...props }) {
  const { estilo } = resolverEstilo(StyleSheet.flatten(style) || {}, { fuentes: hayFuentes() });
  return <RNTextInput {...props} style={estilo} />;
}
