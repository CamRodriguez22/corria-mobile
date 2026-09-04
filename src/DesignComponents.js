// DesignComponents.js — Componentes React Native del design system Organic
// Reutilizables y listos para pegar en App.js o screens/

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TOKENS, colorUtils } from './DesignTokens';

// ─────────────────────────────────────────────────────────────
// Botones
// ─────────────────────────────────────────────────────────────
export const ButtonPrimary = ({ label, onPress, disabled = false, style = {} }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? TOKENS.colors.accent600 : TOKENS.colors.accent,
          paddingHorizontal: TOKENS.spacing.lg,
          paddingVertical: TOKENS.spacing.base,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: TOKENS.fontSizes.body }}>
        {label}
      </Text>
    </Pressable>
  );
};

export const ButtonSecondary = ({ label, onPress, disabled = false, style = {} }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? TOKENS.colors.accent2_600 : TOKENS.colors.accent2,
          paddingHorizontal: TOKENS.spacing.lg,
          paddingVertical: TOKENS.spacing.base,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: TOKENS.fontSizes.body }}>
        {label}
      </Text>
    </Pressable>
  );
};

export const ButtonGhost = ({ label, onPress, disabled = false, style = {} }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          borderWidth: 2,
          borderColor: TOKENS.colors.accent,
          paddingHorizontal: TOKENS.spacing.lg,
          paddingVertical: TOKENS.spacing.base,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? TOKENS.colors.accent100 : 'transparent',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: TOKENS.colors.accent, fontWeight: '600', fontSize: TOKENS.fontSizes.body }}>
        {label}
      </Text>
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────
// Tarjetas
// ─────────────────────────────────────────────────────────────
export const Card = ({ children, style = {} }) => {
  return (
    <View
      style={[
        {
          backgroundColor: TOKENS.colors.surface,
          borderRadius: TOKENS.radius.lg,
          padding: TOKENS.spacing.lg,
          marginBottom: TOKENS.spacing.base,
          shadowColor: '#2e2b25',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.16,
          shadowRadius: 10,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const CardTitle = ({ text }) => (
  <Text
    style={{
      fontSize: TOKENS.fontSizes.h4,
      fontWeight: '600',
      color: TOKENS.colors.text,
      marginBottom: TOKENS.spacing.sm,
    }}
  >
    {text}
  </Text>
);

export const CardBody = ({ text }) => (
  <Text
    style={{
      fontSize: TOKENS.fontSizes.body,
      color: TOKENS.colors.text,
      lineHeight: TOKENS.fontSizes.body * TOKENS.lineHeights.body,
    }}
  >
    {text}
  </Text>
);

// ─────────────────────────────────────────────────────────────
// Tarjeta de resultado (para mostrar detección de corrosión)
// ─────────────────────────────────────────────────────────────
export const ResultCard = ({ nivel, percentage, confidence, ubicacion }) => {
  const bgColor = colorUtils.corrosionColor(percentage);
  const confColor = colorUtils.confidenceColor(confidence);

  return (
    <Card>
      <CardTitle text="Resultado de la detección" />

      <View style={{ marginBottom: TOKENS.spacing.md }}>
        <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginBottom: 4 }}>
          Nivel de corrosión
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: TOKENS.spacing.sm,
          }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: bgColor,
            }}
          />
          <Text style={{ fontSize: TOKENS.fontSizes.h4, fontWeight: '700', color: TOKENS.colors.text }}>
            {nivel}
          </Text>
          <Text style={{ fontSize: TOKENS.fontSizes.body, color: TOKENS.colors.neutral600 }}>
            ({percentage}%)
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: TOKENS.spacing.md }}>
        <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginBottom: 4 }}>
          Confianza del modelo
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: TOKENS.spacing.sm,
          }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: confColor,
            }}
          />
          <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '600', color: TOKENS.colors.text }}>
            {Math.round(confidence * 100)}%
          </Text>
        </View>
      </View>

      {ubicacion && (
        <View>
          <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginBottom: 4 }}>
            Ubicación
          </Text>
          <Text style={{ fontSize: TOKENS.fontSizes.body, color: TOKENS.colors.accent700 }}>
            {ubicacion}
          </Text>
        </View>
      )}
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────
// Campos de entrada
// ─────────────────────────────────────────────────────────────
export const TextInput = ({ placeholder, value, onChangeText, secureTextEntry = false, style = {} }) => {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={{ marginBottom: TOKENS.spacing.md }}>
      <View
        style={[
          {
            backgroundColor: TOKENS.colors.neutral100,
            borderWidth: 2,
            borderColor: focused ? TOKENS.colors.accent : TOKENS.colors.divider,
            borderRadius: TOKENS.radius.md,
            paddingHorizontal: TOKENS.spacing.md,
            paddingVertical: TOKENS.spacing.sm,
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            fontSize: TOKENS.fontSizes.body,
            color: TOKENS.colors.text,
            padding: 0,
          }}
          placeholderTextColor={TOKENS.colors.neutral500}
        />
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Tags / Badges
// ─────────────────────────────────────────────────────────────
export const TagAccent = ({ label }) => (
  <View
    style={{
      backgroundColor: TOKENS.colors.accent100,
      paddingHorizontal: TOKENS.spacing.sm,
      paddingVertical: TOKENS.spacing.xs,
      borderRadius: TOKENS.radius.sm,
      alignSelf: 'flex-start',
    }}
  >
    <Text
      style={{
        fontSize: TOKENS.fontSizes.xs,
        color: TOKENS.colors.accent700,
        fontWeight: '600',
      }}
    >
      {label}
    </Text>
  </View>
);

export const TagAccent2 = ({ label }) => (
  <View
    style={{
      backgroundColor: TOKENS.colors.accent2_100,
      paddingHorizontal: TOKENS.spacing.sm,
      paddingVertical: TOKENS.spacing.xs,
      borderRadius: TOKENS.radius.sm,
      alignSelf: 'flex-start',
    }}
  >
    <Text
      style={{
        fontSize: TOKENS.fontSizes.xs,
        color: TOKENS.colors.accent2_700,
        fontWeight: '600',
      }}
    >
      {label}
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────
// Indicadores de estado
// ─────────────────────────────────────────────────────────────
export const StatusBadge = ({ status, label }) => {
  const statusColors = {
    success: TOKENS.colors.accent2_500,
    warning: TOKENS.colors.accent_500,
    error: '#c84033',
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: TOKENS.spacing.sm,
        backgroundColor: statusColors[status] + '20',
        paddingHorizontal: TOKENS.spacing.md,
        paddingVertical: TOKENS.spacing.sm,
        borderRadius: TOKENS.radius.md,
        alignSelf: 'flex-start',
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: statusColors[status],
        }}
      />
      <Text
        style={{
          fontSize: TOKENS.fontSizes.small,
          fontWeight: '600',
          color: statusColors[status],
        }}
      >
        {label}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Divisor
// ─────────────────────────────────────────────────────────────
export const Divider = () => (
  <View
    style={{
      height: 1,
      backgroundColor: TOKENS.colors.divider,
      marginVertical: TOKENS.spacing.base,
    }}
  />
);

// ─────────────────────────────────────────────────────────────
// Encabezado con navegación
// ─────────────────────────────────────────────────────────────
export const Header = ({ title, subtitle, onBack = null }) => {
  return (
    <View
      style={{
        backgroundColor: TOKENS.colors.surface,
        paddingHorizontal: TOKENS.spacing.lg,
        paddingTop: TOKENS.spacing.lg,
        paddingBottom: TOKENS.spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: TOKENS.colors.divider,
      }}
    >
      {onBack && (
        <Pressable onPress={onBack} style={{ marginBottom: TOKENS.spacing.sm }}>
          <Text style={{ fontSize: 28, color: TOKENS.colors.accent }}>←</Text>
        </Pressable>
      )}
      <Text
        style={{
          fontSize: TOKENS.fontSizes.h2,
          fontWeight: '700',
          color: TOKENS.colors.text,
          marginBottom: subtitle ? TOKENS.spacing.xs : 0,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontSize: TOKENS.fontSizes.body,
            color: TOKENS.colors.neutral600,
            lineHeight: TOKENS.fontSizes.body * TOKENS.lineHeights.body,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Loading spinner con marca de diseño
// ─────────────────────────────────────────────────────────────
export const LoadingOverlay = ({ visible, message = 'Procesando...' }) => {
  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(245, 234, 216, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          gap: TOKENS.spacing.lg,
        }}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            borderWidth: 4,
            borderColor: TOKENS.colors.divider,
            borderTopColor: TOKENS.colors.accent,
            animation: 'spin 1s linear infinite',
          }}
        />
        <Text
          style={{
            fontSize: TOKENS.fontSizes.body,
            color: TOKENS.colors.text,
            fontWeight: '500',
          }}
        >
          {message}
        </Text>
      </View>
    </View>
  );
};

export default {
  ButtonPrimary,
  ButtonSecondary,
  ButtonGhost,
  Card,
  CardTitle,
  CardBody,
  ResultCard,
  TextInput,
  TagAccent,
  TagAccent2,
  StatusBadge,
  Divider,
  Header,
  LoadingOverlay,
};