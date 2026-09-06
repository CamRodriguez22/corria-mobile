// DesignComponents.js — Componentes del sistema "Organic" para PIXELRUST.
// Accesibles (roles, labels, área táctil ≥ 48px) y fieles al mockup v2.

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput as RNTextInput,
  Animated,
  Easing,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { TOKENS, severidad, confianzaPct, num } from './DesignTokens';

// ─────────────────────────────────────────────────────────────
// Screen — contenedor de pantalla con "safe area" sin dependencias nativas extra.
// Android: respeta la altura de la status bar. iOS: margen fijo prudente para el notch.
// ─────────────────────────────────────────────────────────────
const TOP_INSET = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 47;
const BOTTOM_INSET = Platform.OS === 'ios' ? 24 : 8;

export const Screen = ({ children, style, top = true, bottom = false, center = false }) => (
  <View
    style={[
      {
        flex: 1,
        backgroundColor: TOKENS.colors.bg,
        paddingTop: top ? TOP_INSET : 0,
        paddingBottom: bottom ? BOTTOM_INSET : 0,
      },
      center && { alignItems: 'center', justifyContent: 'center' },
      style,
    ]}
  >
    {children}
  </View>
);

// ─────────────────────────────────────────────────────────────
// Logo PIXELRUST (grid de píxeles de óxido)
// ─────────────────────────────────────────────────────────────
export const Logo = ({ size = 14, gap = 3 }) => {
  const cells = [0, 1, 2, 1, 2, 3, 2, 3, 4, 3, 4, 5];
  return (
    <View
      accessibilityLabel="PIXELRUST"
      style={{ width: size * 3 + gap * 2, flexDirection: 'row', flexWrap: 'wrap', gap }}
    >
      {cells.map((c, idx) => (
        <View
          key={idx}
          style={{ width: size, height: size, borderRadius: size * 0.18, backgroundColor: TOKENS.logo[c] }}
        />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Botón único con variantes (accesible)
// ─────────────────────────────────────────────────────────────
const VARIANTS = {
  primary: { bg: TOKENS.colors.accent, bgPressed: TOKENS.colors.accent600, fg: '#fff', border: 'transparent' },
  secondary: { bg: TOKENS.colors.accent2, bgPressed: TOKENS.colors.accent2_600, fg: '#fff', border: 'transparent' },
  ghost: { bg: 'transparent', bgPressed: TOKENS.colors.neutral200, fg: TOKENS.colors.neutral700, border: TOKENS.colors.neutral300 },
  danger: { bg: 'transparent', bgPressed: TOKENS.colors.dangerTint, fg: TOKENS.colors.danger, border: TOKENS.colors.danger },
};

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  left = null,
  style = {},
  accessibilityHint,
}) => {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isOff = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      accessibilityRole="button"
      accessibilityState={{ disabled: isOff, busy: loading }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        {
          minHeight: TOKENS.tapTarget,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          paddingHorizontal: TOKENS.spacing.lg,
          paddingVertical: 15,
          borderRadius: TOKENS.radius.pill,
          borderWidth: v.border === 'transparent' ? 0 : 1.5,
          borderColor: v.border,
          backgroundColor: pressed && !isOff ? v.bgPressed : v.bg,
          opacity: isOff ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {left}
          <Text style={{ color: v.fg, fontWeight: '700', fontSize: TOKENS.fontSizes.h5 }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
};

// Compatibilidad con el código anterior
export const ButtonPrimary = (p) => <Button variant="primary" {...p} label={p.label} />;
export const ButtonSecondary = (p) => <Button variant="secondary" {...p} label={p.label} />;
export const ButtonGhost = (p) => <Button variant="ghost" {...p} label={p.label} />;

// ─────────────────────────────────────────────────────────────
// Tarjeta
// ─────────────────────────────────────────────────────────────
export const Card = ({ children, style = {}, onPress, accessibilityLabel, accessibilityHint }) => {
  const inner = (
    <View
      style={[
        {
          backgroundColor: TOKENS.colors.surfaceAlt,
          borderRadius: TOKENS.radius.lg,
          padding: TOKENS.spacing.lg,
          marginBottom: TOKENS.spacing.base,
          ...TOKENS.shadow.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      {inner}
    </Pressable>
  );
};

export const CardTitle = ({ text, children }) => (
  <Text style={{ fontSize: TOKENS.fontSizes.h4, fontWeight: '700', color: TOKENS.colors.text, marginBottom: TOKENS.spacing.sm }}>
    {text || children}
  </Text>
);

export const CardBody = ({ text, children }) => (
  <Text style={{ fontSize: TOKENS.fontSizes.body, color: TOKENS.colors.neutral700, lineHeight: TOKENS.fontSizes.body * 1.5 }}>
    {text || children}
  </Text>
);

// ─────────────────────────────────────────────────────────────
// Campo de formulario con label y error (accesible)
// ─────────────────────────────────────────────────────────────
export const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  error = '',
  editable = true,
  style = {},
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: TOKENS.spacing.base }, style]}>
      {!!label && <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '600', color: TOKENS.colors.neutral700, marginBottom: 6, paddingLeft: 2 }}>{label}</Text>}
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={TOKENS.colors.neutral500}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        editable={editable}
        accessibilityLabel={label || placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: multiline ? 92 : TOKENS.tapTarget,
          textAlignVertical: multiline ? 'top' : 'center',
          backgroundColor: editable ? '#fff' : TOKENS.colors.neutral200,
          borderWidth: 1.5,
          borderColor: error ? TOKENS.colors.danger : focused ? TOKENS.colors.accent : TOKENS.colors.neutral300,
          borderRadius: multiline ? 18 : TOKENS.radius.md,
          paddingHorizontal: TOKENS.spacing.base,
          paddingVertical: 12,
          fontSize: TOKENS.fontSizes.body,
          color: TOKENS.colors.text,
        }}
      />
      {!!error && (
        <Text style={{ color: TOKENS.colors.danger, fontSize: TOKENS.fontSizes.small, marginTop: 6, paddingLeft: 2 }}>{error}</Text>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Badges
// ─────────────────────────────────────────────────────────────
export const Badge = ({ label, color = TOKENS.colors.accent700, tint = TOKENS.colors.accent100, style = {} }) => (
  <View style={[{ alignSelf: 'flex-start', backgroundColor: tint, borderRadius: TOKENS.radius.pill, paddingHorizontal: 11, paddingVertical: 6 }, style]}>
    <Text style={{ fontSize: TOKENS.fontSizes.xs, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color }}>{label}</Text>
  </View>
);

// Badge de severidad a partir de una medición (o de {nivel_corrosion}/{area_corroida_pct})
export const SeverityBadge = ({ medicion, style }) => {
  const s = severidad(medicion || {});
  return <Badge label={s.short} color={s.color} tint={s.tint} style={style} />;
};

// ─────────────────────────────────────────────────────────────
// StatCard (dashboard)
// ─────────────────────────────────────────────────────────────
export const StatCard = ({ value, label, color = TOKENS.colors.text }) => (
  <View style={{ flex: 1, backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: TOKENS.radius.lg, padding: TOKENS.spacing.base, ...TOKENS.shadow.sm }}>
    <Text style={{ fontSize: 27, fontWeight: '800', color, lineHeight: 30 }}>{value}</Text>
    <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 3 }}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────
// Miniatura de foto (con placeholder de "óxido")
// ─────────────────────────────────────────────────────────────
export const Thumb = ({ uri, size = 52, radius = 14 }) => {
  const base = {
    width: size,
    height: size,
    borderRadius: radius,
    backgroundColor: '#5c4133',
    overflow: 'hidden',
  };
  if (uri) return <Image source={{ uri }} style={base} resizeMode="cover" />;
  return <View style={base} />;
};

// ─────────────────────────────────────────────────────────────
// Fila de medición (lista de historial / recientes / carpeta)
// ─────────────────────────────────────────────────────────────
export const MeasurementRow = ({ medicion, title, subtitle, onPress }) => {
  const pct = num(medicion?.area_corroida_pct, 0);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title || ''}. ${subtitle || ''}. ${severidad(medicion || {}).label}`}
      style={({ pressed }) => [
        {
          backgroundColor: TOKENS.colors.surfaceAlt,
          borderRadius: TOKENS.radius.lg,
          padding: TOKENS.spacing.base,
          marginBottom: TOKENS.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: TOKENS.spacing.md,
          opacity: pressed ? 0.85 : 1,
          ...TOKENS.shadow.sm,
        },
      ]}
    >
      <Thumb uri={medicion?.url_thumbnail || medicion?.url_imagen} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: TOKENS.fontSizes.h5, fontWeight: '700', color: TOKENS.colors.text }}>
          {title}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 2 }}>
          {subtitle || `${pct.toFixed(0)}% corroído`}
        </Text>
      </View>
      <SeverityBadge medicion={medicion} />
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────
// Barra de progreso
// ─────────────────────────────────────────────────────────────
export const ProgressBar = ({ value = 0, color = TOKENS.colors.accent }) => {
  const w = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(w) }}
      style={{ height: 7, backgroundColor: TOKENS.colors.neutral200, borderRadius: TOKENS.radius.pill, overflow: 'hidden' }}
    >
      <View style={{ width: `${w}%`, height: '100%', backgroundColor: color, borderRadius: TOKENS.radius.pill }} />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Spinner de marca (anillo girando) — sirve para la pantalla de análisis
// ─────────────────────────────────────────────────────────────
export const Spinner = ({ size = 60, thickness = 4 }) => {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: thickness,
        borderColor: TOKENS.colors.neutral300,
        borderTopColor: TOKENS.colors.accent,
        transform: [{ rotate }],
      }}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// Overlay de carga a pantalla completa
// ─────────────────────────────────────────────────────────────
export const LoadingOverlay = ({ visible, message = 'Procesando…' }) => {
  if (!visible) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(245,234,216,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: TOKENS.spacing.lg,
        zIndex: 999,
      }}
    >
      <Spinner />
      <Text style={{ fontSize: TOKENS.fontSizes.body, color: TOKENS.colors.text, fontWeight: '600' }}>{message}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Segmented control / filtros
// ─────────────────────────────────────────────────────────────
export const Segmented = ({ options, value, onChange, scroll = false }) => {
  const Wrap = scroll ? ScrollView : View;
  const wrapProps = scroll
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: { gap: 8, paddingRight: 8 } }
    : { style: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' } };
  return (
    <Wrap {...wrapProps}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              minHeight: 40,
              justifyContent: 'center',
              paddingHorizontal: 15,
              paddingVertical: 9,
              borderRadius: TOKENS.radius.pill,
              borderWidth: 1.5,
              borderColor: active ? TOKENS.colors.accent : TOKENS.colors.neutral300,
              backgroundColor: active ? TOKENS.colors.accent : 'transparent',
            }}
          >
            <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '700', color: active ? '#fff' : TOKENS.colors.neutral700 }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </Wrap>
  );
};

// ─────────────────────────────────────────────────────────────
// Estado vacío
// ─────────────────────────────────────────────────────────────
export const EmptyState = ({ title, subtitle, action }) => (
  <View style={{ alignItems: 'center', paddingVertical: TOKENS.spacing.xl, gap: 8 }}>
    <Logo size={12} />
    <Text style={{ fontSize: TOKENS.fontSizes.h4, fontWeight: '700', color: TOKENS.colors.text, marginTop: 8 }}>{title}</Text>
    {!!subtitle && (
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, textAlign: 'center', maxWidth: 260 }}>
        {subtitle}
      </Text>
    )}
    {action}
  </View>
);

// ─────────────────────────────────────────────────────────────
// Divider
// ─────────────────────────────────────────────────────────────
export const Divider = ({ style }) => (
  <View style={[{ height: 1, backgroundColor: TOKENS.colors.divider, marginVertical: TOKENS.spacing.base }, style]} />
);

// ─────────────────────────────────────────────────────────────
// Fila clave/valor para vistas de detalle
// ─────────────────────────────────────────────────────────────
export const KeyRow = ({ label, value, last = false }) => (
  <View>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, paddingVertical: 15, paddingHorizontal: TOKENS.spacing.base }}>
      <Text style={{ fontSize: TOKENS.fontSizes.body, color: TOKENS.colors.neutral600 }}>{label}</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text, textAlign: 'right', flexShrink: 1 }}>
        {value}
      </Text>
    </View>
    {!last && <View style={{ height: 1, backgroundColor: TOKENS.colors.neutral200, marginHorizontal: TOKENS.spacing.base }} />}
  </View>
);

export const KeyValueCard = ({ rows }) => (
  <View style={{ backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: TOKENS.radius.lg, overflow: 'hidden', ...TOKENS.shadow.sm, marginBottom: TOKENS.spacing.base }}>
    {rows.map((r, i) => (
      <KeyRow key={r.label} label={r.label} value={r.value} last={i === rows.length - 1} />
    ))}
  </View>
);

// ─────────────────────────────────────────────────────────────
// Encabezado de pantalla
// ─────────────────────────────────────────────────────────────
export const Header = ({ title, subtitle, onBack = null, right = null }) => (
  <View
    style={{
      backgroundColor: TOKENS.colors.surface,
      paddingHorizontal: TOKENS.spacing.lg,
      paddingTop: TOKENS.spacing.base,
      paddingBottom: TOKENS.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: TOKENS.colors.divider,
      flexDirection: 'row',
      alignItems: 'center',
      gap: TOKENS.spacing.md,
    }}
  >
    {onBack && (
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={TOKENS.hitSlop}
        style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: TOKENS.colors.neutral300, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 22, color: TOKENS.colors.text, marginTop: -2 }}>‹</Text>
      </Pressable>
    )}
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: TOKENS.fontSizes.h3, fontWeight: '800', color: TOKENS.colors.text }}>{title}</Text>
      {!!subtitle && <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 2 }}>{subtitle}</Text>}
    </View>
    {right}
  </View>
);

// ─────────────────────────────────────────────────────────────
// Barra de pestañas inferior
// ─────────────────────────────────────────────────────────────
const TAB_ICON = { home: '⌂', folders: '▤', activity: '◷', settings: '⚙' };

export const TabBar = ({ current, onChange, items }) => (
  <View
    style={{
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: TOKENS.colors.neutral200,
      backgroundColor: TOKENS.colors.surfaceAlt,
      paddingTop: 8,
      paddingBottom: 22,
      paddingHorizontal: 8,
    }}
  >
    {items.map((it) => {
      const active = it.key === current;
      const color = active ? TOKENS.colors.accent700 : TOKENS.colors.neutral500;
      return (
        <Pressable
          key={it.key}
          onPress={() => onChange(it.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          accessibilityLabel={it.label}
          style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6, minHeight: TOKENS.tapTarget, justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 20, color }}>{TAB_ICON[it.key] || '•'}</Text>
          <Text style={{ fontSize: TOKENS.fontSizes.xs, fontWeight: '700', color }}>{it.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

// ResultCard heredado (compat) — usa la severidad real del backend.
export const ResultCard = ({ nivel, percentage, confidence, ubicacion, medicion }) => {
  const m = medicion || { nivel_corrosion: nivel, area_corroida_pct: percentage, confianza_promedio: confidence };
  const s = severidad(m);
  return (
    <View style={{ backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: TOKENS.radius.lg, padding: TOKENS.spacing.lg, ...TOKENS.shadow.md, marginBottom: TOKENS.spacing.base }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: s.color }} />
        <Text style={{ fontSize: TOKENS.fontSizes.xs, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: s.color }}>{s.short}</Text>
      </View>
      <Text style={{ fontSize: 42, fontWeight: '800', color: TOKENS.colors.text }}>{num(m.area_corroida_pct, 0).toFixed(0)}%</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 2 }}>Corrosión detectada</Text>
      <Divider />
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: TOKENS.colors.neutral600, fontSize: TOKENS.fontSizes.body }}>Confianza</Text>
          <Text style={{ fontWeight: '700', fontSize: TOKENS.fontSizes.body }}>{confianzaPct(m.confianza_promedio)}%</Text>
        </View>
        <ProgressBar value={confianzaPct(m.confianza_promedio)} color={TOKENS.colors.accent2} />
        {!!ubicacion && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: TOKENS.colors.neutral600, fontSize: TOKENS.fontSizes.body }}>Ubicación</Text>
            <Text style={{ fontWeight: '700', fontSize: TOKENS.fontSizes.body }}>{ubicacion}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default {
  Screen,
  Logo,
  Button,
  ButtonPrimary,
  ButtonSecondary,
  ButtonGhost,
  Card,
  CardTitle,
  CardBody,
  Field,
  Badge,
  SeverityBadge,
  StatCard,
  Thumb,
  MeasurementRow,
  ProgressBar,
  Spinner,
  LoadingOverlay,
  Segmented,
  EmptyState,
  Divider,
  KeyRow,
  KeyValueCard,
  Header,
  TabBar,
  ResultCard,
};
