import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Screen, Logo, Field, Button } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { ErrorText } from '../helpers';

const PAD = TOKENS.spacing.lg;

export default function LoginScreen({
  email,
  setEmail,
  pass,
  setPass,
  newPass,
  setNewPass,
  needsNewPass,
  authBusy,
  authError,
  onLogin,
  onNewPassword,
}) {
  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: PAD, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ height: 24 }} />
          <Logo size={18} />
          <Text style={{ fontSize: 36, fontWeight: '800', color: TOKENS.colors.text, marginTop: 20 }}>
            PIXELRUST
          </Text>
          <Text style={{ fontSize: TOKENS.fontSizes.body, color: TOKENS.colors.neutral600, marginTop: 6 }}>
            Detección y vigilancia de corrosión
          </Text>

          <View
            style={{
              marginTop: 28,
              backgroundColor: TOKENS.colors.surfaceAlt,
              borderRadius: TOKENS.radius.lg,
              padding: PAD,
              borderWidth: 1,
              borderColor: TOKENS.colors.border,
              ...TOKENS.shadow.sm,
            }}
          >
            {needsNewPass ? (
              <>
                <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text, marginBottom: 6 }}>
                  Define tu nueva contraseña
                </Text>
                <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginBottom: 16 }}>
                  Por seguridad, ingresa una nueva contraseña para tu cuenta.
                </Text>
                <Field
                  label="Nueva contraseña"
                  value={newPass}
                  onChangeText={setNewPass}
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry
                />
                {!!authError && <ErrorText text={authError} />}
                <Button label="Guardar y entrar" onPress={onNewPassword} loading={authBusy} />
              </>
            ) : (
              <>
                <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text, marginBottom: 6 }}>
                  Iniciar sesión
                </Text>
                <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginBottom: 16 }}>
                  Ingresa con tu usuario o correo institucional
                </Text>
                <Field
                  label="Usuario o correo"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="usuario@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Field
                  label="Contraseña"
                  value={pass}
                  onChangeText={setPass}
                  placeholder="••••••••"
                  secureTextEntry
                />
                {!!authError && <ErrorText text={authError} />}
                <Button label="Iniciar sesión" onPress={onLogin} loading={authBusy} />
                <Text style={{ textAlign: 'center', fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 16, lineHeight: 20 }}>
                  ¿Olvidaste tu contraseña? Contacta al administrador de tu organización para restablecer tu acceso.
                </Text>
              </>
            )}
          </View>

          <View style={{ flex: 1 }} />
          <Text style={{ textAlign: 'center', fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500, marginTop: 32, paddingBottom: 16 }}>
            © 2026 PIXELRUST · Inspección asistida por IA
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
