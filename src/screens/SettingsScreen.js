import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button, FilaDato, ScreenTitle } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconLogout } from '../Icons';
import { nombreRol } from '../logic';

const PAD = TOKENS.spacing.lg;

export default function SettingsScreen({ perfil, nombre, iniciales, onLogout }) {
  let appVersion = '2.0.0';
  try {
    appVersion = require('../../app.json').expo?.version || '2.0.0';
  } catch {}

  const filas = [
    perfil?.rol ? { label: 'Rol', value: nombreRol(perfil.rol) } : null,
    perfil?.empresa_nombre ? { label: 'Organización', value: perfil.empresa_nombre } : null,
    perfil?.empresa_ciudad ? { label: 'Ciudad', value: perfil.empresa_ciudad } : null,
  ].filter(Boolean);

  return (
    <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}>
      <ScreenTitle title="Ajustes" subtitle="Tu cuenta y la sesión" />

      <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: TOKENS.colors.accent200,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: TOKENS.colors.accent300,
          }}
        >
          <Text style={{ ...TOKENS.type.titleLarge, color: TOKENS.colors.accent800 }}>{iniciales}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...TOKENS.type.titleLarge, color: TOKENS.colors.text }}>{nombre}</Text>
          {!!perfil?.email && <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 2 }}>{perfil.email}</Text>}
        </View>
      </View>

      {filas.length > 0 && (
        <View style={{ marginTop: 24, gap: 14 }}>
          {filas.map((f) => (
            <FilaDato key={f.label} label={f.label} value={f.value} />
          ))}
        </View>
      )}

      <View style={{ marginTop: 32 }}>
        <Button variant="danger" label="Cerrar sesión" left={<IconLogout size={20} color={TOKENS.colors.danger} />} onPress={onLogout} />
      </View>

      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, textAlign: 'center', marginTop: 24 }}>
        PIXELRUST · versión {appVersion}
      </Text>
    </ScrollView>
  );
}
