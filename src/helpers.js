import React from 'react';
import { View, Text } from 'react-native';
import { TOKENS } from './DesignTokens';
import { bloqueDeMedicion } from './utils';

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
      <Text style={{ color: TOKENS.colors.accent2_700, fontWeight: '800' }}>✓</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.text }}>{text}</Text>
    </View>
  );
}

// bloquesMap: catálogo real cargado del backend (o de respaldo offline)
export function tituloBloque(m, bloqueMap, bloquesMap = {}) {
  const listaReal = Object.values(bloquesMap);
  const b = bloqueDeMedicion(m, bloqueMap, listaReal.length ? listaReal : undefined);
  return b ? (bloquesMap[b]?.nombre || `Bloque ${b}`) : 'Sin bloque';
}

// Nombre corto para plantillas tipo "Bloque {x}"
export function nombreCortoBloque(bloqueObj, claveFallback = '') {
  if (!bloqueObj) return claveFallback;
  return String(bloqueObj.nombre || '').replace(/^bloque\s+/i, '').trim() || claveFallback;
}

// Inicial para el avatar de carpetas
export function inicialBloque(nombre = '') {
  const sinPrefijo = String(nombre).replace(/^bloque\s+/i, '').trim();
  return (sinPrefijo[0] || String(nombre)[0] || '?').toUpperCase();
}

export function traducirAuthError(e) {
  const name = e?.name || '';
  const msg = e?.message || 'No se pudo iniciar sesión.';
  if (name === 'UserNotFoundException' || name === 'NotAuthorizedException')
    return 'Correo o contraseña incorrectos.';
  if (name === 'UserNotConfirmedException') return 'Tu cuenta no está confirmada. Revisa tu correo.';
  if (name === 'PasswordResetRequiredException') return 'Debes restablecer tu contraseña.';
  if (name === 'TooManyRequestsException' || name === 'LimitExceededException')
    return 'Demasiados intentos. Espera un momento.';
  return msg;
}
