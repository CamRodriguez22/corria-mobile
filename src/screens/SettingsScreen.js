import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button, KeyValueCard } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';

const PAD = TOKENS.spacing.lg;

export default function SettingsScreen({ perfil, nombre, iniciales, onLogout }) {
  let appVersion = '2.0.0';
  try {
    appVersion = require('../../app.json').expo?.version || '2.0.0';
  } catch {}

  return (
    <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 36 }}>
      <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>Ajustes</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 4 }}>
        Información de cuenta y sesión
      </Text>

      <View
        style={{
          marginTop: 20,
          backgroundColor: TOKENS.colors.surfaceAlt,
          borderRadius: TOKENS.radius.lg,
          padding: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          borderWidth: 1,
          borderColor: TOKENS.colors.border,
          ...TOKENS.shadow.sm,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: TOKENS.colors.accent200,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: TOKENS.colors.accent300,
          }}
        >
          <Text style={{ fontSize: TOKENS.fontSizes.h4, fontWeight: '800', color: TOKENS.colors.accent800 }}>
            {iniciales}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: TOKENS.fontSizes.h5, fontWeight: '700', color: TOKENS.colors.text }}>
            {nombre}
          </Text>
          <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 2 }}>
            {perfil?.email || '—'}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 18 }}>
        <KeyValueCard
          rows={[
            { label: 'Rol', value: perfil?.rol || '—' },
            { label: 'Organización', value: perfil?.empresa_nombre || '—' },
            { label: 'Ciudad', value: perfil?.empresa_ciudad || '—' },
            { label: 'Versión', value: appVersion },
          ]}
        />
      </View>

      <View style={{ marginTop: 24 }}>
        <Button variant="danger" label="Cerrar sesión" onPress={onLogout} />
      </View>
    </ScrollView>
  );
}
