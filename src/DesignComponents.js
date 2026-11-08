// DesignComponents.js — Componentes del sistema "Organic" para PIXELRUST.
// Accesibles (roles, labels, área táctil ≥ 48px) y fieles al mockup v2.

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  Animated,
  Easing,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { Text, TextInput as RNTextInput } from './Typography';
import { TOKENS, NIVELES, severidad, confianzaPct, num } from './DesignTokens';
import { nivelDeMedicion } from './niveles';
import { miniaturaDe } from './miniaturas';
import { formatoPct } from './fechas';
import { COLORES_SOBRE_NIVEL } from './paleta';
import {
  IconHome, IconLotes, IconPuntos, IconActivity, IconSettings, IconChevronLeft, IconDot, IconNivel, IconImageOff,
  IconChevronDown, IconClose, IconCheck, IconArrowLeft, IconAlertTriangle, IconWifiOff,
} from './Icons';

// ─────────────────────────────────────────────────────────────
// Movimiento reducido: true si el usuario pidió quitar animaciones (Ajustes del sistema).
// ─────────────────────────────────────────────────────────────
export function useReducedMotion() {
  const [reducido, setReducido] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => vivo && setReducido(Boolean(v)))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReducido(Boolean(v)));
    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, []);
  return reducido;
}

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
  primary: { bg: TOKENS.colors.accent, bgPressed: TOKENS.colors.accent700, fg: '#fff', border: 'transparent' },
  // Tonal (Material 3 "filled tonal"): salvia suave con texto oscuro (>= 10:1).
  tonal: { bg: TOKENS.colors.piedra_200, bgPressed: TOKENS.colors.piedra_300, fg: TOKENS.colors.piedra_900, border: 'transparent' },
  // Outlined y texto: acciones secundarias y de bajo énfasis.
  outlined: { bg: 'transparent', bgPressed: TOKENS.colors.neutral200, fg: TOKENS.colors.neutral700, border: TOKENS.colors.neutral400 },
  text: { bg: 'transparent', bgPressed: TOKENS.colors.neutral200, fg: TOKENS.colors.accentText, border: 'transparent' },
  danger: { bg: 'transparent', bgPressed: TOKENS.colors.dangerTint, fg: TOKENS.colors.danger, border: TOKENS.colors.danger },
};
VARIANTS.secondary = VARIANTS.tonal;
VARIANTS.ghost = VARIANTS.outlined;

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  left = null,
  compact = false,
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
          paddingHorizontal: compact ? 14 : TOKENS.spacing.lg,
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
          <Text style={{ color: v.fg, fontWeight: '700', fontSize: compact ? TOKENS.fontSizes.small + 1 : TOKENS.fontSizes.h5 }} numberOfLines={compact ? 1 : undefined}>{label}</Text>
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
  autoFocus = false,
  accessibilityLabel: etiquetaA11y,
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
        autoFocus={autoFocus}
        accessibilityLabel={etiquetaA11y || label || placeholder}
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
    <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color }}>{label}</Text>
  </View>
);

// Badge de nivel: color + ícono + nombre (nunca solo color). Texto en minúscula salvo la inicial.
export const NivelBadge = ({ nivel = 0, style, compacto = false }) => {
  const s = NIVELES[Math.max(0, Math.min(3, nivel))];
  return (
    <View
      accessible
      accessibilityLabel={s.label}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: s.tint,
          borderRadius: TOKENS.radius.pill,
          paddingHorizontal: compacto ? 9 : 11,
          paddingVertical: compacto ? 4 : 6,
        },
        style,
      ]}
    >
      <IconNivel nivel={s.i} size={compacto ? 14 : 16} color={s.texto} />
      <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '700', color: s.texto }}>{s.label}</Text>
    </View>
  );
};

// Badge de severidad a partir de una medición (o de {nivel_corrosion}/{area_corroida_pct})
export const SeverityBadge = ({ medicion, style, compacto }) => (
  <NivelBadge nivel={nivelDeMedicion(medicion || {})} style={style} compacto={compacto} />
);

// Muestra de color de un nivel con su ícono dentro (leyendas): el color nunca va solo.
export const SwatchNivel = ({ nivel = 0, size = 18 }) => {
  const s = NIVELES[Math.max(0, Math.min(3, nivel))];
  return (
    <View style={{ width: size, height: size, borderRadius: 4, backgroundColor: s.color, alignItems: 'center', justifyContent: 'center' }}>
      <IconNivel nivel={s.i} size={size - 6} color={COLORES_SOBRE_NIVEL[s.i]} />
    </View>
  );
};

// Ficha sobre una foto: fondo oscuro translúcido (texto blanco >= 9:1 sobre cualquier foto),
// ícono del nivel en su color de estado y el valor.
export const NivelChip = ({ nivel = 0, texto, style }) => {
  const s = NIVELES[Math.max(0, Math.min(3, nivel))];
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          backgroundColor: 'rgba(32,30,29,0.84)',
          borderRadius: TOKENS.radius.pill,
          paddingLeft: 6,
          paddingRight: 8,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <IconNivel nivel={s.i} size={14} color={s.color} />
      {!!texto && (
        <Text style={{ fontFamily: TOKENS.fonts.mono, fontSize: TOKENS.fontSizes.xs, fontWeight: '600', color: '#fff' }}>
          {String(texto).replace(/\u00a0/g, '')}
        </Text>
      )}
    </View>
  );
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
// Foto con marcador de posición y respaldo si falla: llena su contenedor.
//   sin uri (p. ej. URL vencida) -> marcador con ícono; cargando -> marcador que respira (quieto si
//   el sistema pide menos movimiento); onError -> marcador con ícono. Nunca queda un hueco negro.
// ─────────────────────────────────────────────────────────────
const COLOR_MARCADOR = '#e6dac4';

export const Foto = ({ uri, style, resizeMode = 'cover', iconSize = 24 }) => {
  const [estado, setEstado] = useState(uri ? 'cargando' : 'vacia');
  const reducido = useReducedMotion();
  const pulso = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setEstado(uri ? 'cargando' : 'vacia');
  }, [uri]);
  useEffect(() => {
    if (estado !== 'cargando' || reducido) {
      pulso.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [estado, reducido, pulso]);
  const opacidad = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: COLOR_MARCADOR }, style]}>
      {estado === 'cargando' && (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#d9cbb0', opacity: opacidad }]} />
      )}
      {!!uri && estado !== 'error' && (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          onLoad={() => setEstado('lista')}
          onError={() => setEstado('error')}
          accessibilityIgnoresInvertColors
        />
      )}
      {(estado === 'vacia' || estado === 'error') && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <IconImageOff size={iconSize} color={TOKENS.colors.neutral500} />
        </View>
      )}
    </View>
  );
};

export const Thumb = ({ uri, size = 52, radius = 14, style }) => (
  <Foto uri={uri} style={[{ width: size, height: size, borderRadius: radius }, style]} iconSize={Math.round(size * 0.4)} />
);

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
      <Thumb uri={miniaturaDe(medicion)} />
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
// Cifra de porcentaje: dígitos en IBM Plex Mono y el % en Outfit, más pequeño (en mono la coma y el % ocupan
// una celda entera y la cifra se ve suelta). Sin número: raya.
// ─────────────────────────────────────────────────────────────
export const PctMono = ({ value, size = 34, color = TOKENS.colors.text, weight = '700', style }) => {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (value == null || value === '' || !Number.isFinite(n)) {
    return <Text style={[{ fontFamily: TOKENS.fonts.mono, fontSize: size, lineHeight: Math.round(size * 1.2), fontWeight: weight, color }, style]}>—</Text>;
  }
  return (
    <Text style={[{ color, lineHeight: Math.round(size * 1.2) }, style]}>
      <Text style={{ fontFamily: TOKENS.fonts.mono, fontSize: size, fontWeight: weight }}>{n.toFixed(1).replace('.', ',')}</Text>
      <Text style={{ fontSize: Math.round(size * 0.55), fontWeight: '600' }}> %</Text>
    </Text>
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
  const reducido = useReducedMotion();
  useEffect(() => {
    if (reducido) return undefined;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin, reducido]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: thickness,
        borderColor: TOKENS.colors.neutral300,
        borderTopColor: TOKENS.colors.accent,
        // Con movimiento reducido el anillo queda quieto (sigue indicando "cargando").
        transform: reducido ? [] : [{ rotate }],
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
              minHeight: 44,
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
// Chip de filtro (Material 3): área táctil de 48 con la píldora visible de 36.
//   icono opcional a la izquierda; `menu` agrega la flecha de lista desplegable;
//   `onQuitar` agrega una X para limpiar ese filtro.
// ─────────────────────────────────────────────────────────────
export const Chip = ({ label, selected = false, onPress, icon = null, menu = false, onQuitar, accessibilityLabel }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: TOKENS.tapTarget }}>
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected }}
      style={{
        minHeight: 36,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: icon ? 10 : 14,
        paddingRight: menu || onQuitar ? 8 : 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: selected ? TOKENS.colors.piedra_700 : TOKENS.colors.neutral400,
        backgroundColor: selected ? TOKENS.colors.piedra_200 : 'transparent',
      }}
    >
      {selected && !icon && <IconCheck size={16} color={TOKENS.colors.piedra_900} />}
      {icon}
      <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '600', color: selected ? TOKENS.colors.piedra_900 : TOKENS.colors.neutral700 }}>
        {label}
      </Text>
      {menu && <IconChevronDown size={16} color={selected ? TOKENS.colors.piedra_900 : TOKENS.colors.neutral700} />}
    </Pressable>
    {!!onQuitar && (
      <Pressable
        onPress={onQuitar}
        accessibilityRole="button"
        accessibilityLabel={`Quitar filtro: ${label}`}
        hitSlop={4}
        style={{ width: 36, height: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <IconClose size={18} color={TOKENS.colors.neutral700} />
      </Pressable>
    )}
  </View>
);

// ─────────────────────────────────────────────────────────────
// Hoja inferior de opciones (Material 3 bottom sheet): una sola elección, filas de 56.
// ─────────────────────────────────────────────────────────────
export const HojaOpciones = ({ visible, titulo, opciones, valor, onElegir, onCerrar }) => {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable
        onPress={onCerrar}
        accessibilityLabel="Cerrar"
        style={{ flex: 1, backgroundColor: 'rgba(32,30,29,0.5)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: TOKENS.colors.surfaceAlt,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 12,
            paddingBottom: 24,
            maxHeight: '75%',
          }}
        >
          <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: TOKENS.colors.neutral400, marginBottom: 12 }} />
          <Text accessibilityRole="header" style={{ ...TOKENS.type.titleLarge, color: TOKENS.colors.text, paddingHorizontal: 24, paddingBottom: 8 }}>
            {titulo}
          </Text>
          <ScrollView>
            {opciones.map((o) => {
              const activa = o.value === valor;
              return (
                <Pressable
                  key={String(o.value)}
                  onPress={() => onElegir(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activa }}
                  style={({ pressed }) => ({
                    minHeight: 56,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 24,
                    backgroundColor: pressed ? TOKENS.colors.neutral200 : 'transparent',
                  })}
                >
                  <View style={{ width: 24 }}>{activa ? <IconCheck size={22} color={TOKENS.colors.accentText} /> : null}</View>
                  <View style={{ flex: 1, paddingVertical: 8 }}>
                    <Text style={{ ...TOKENS.type.bodyLarge, fontWeight: activa ? '700' : '400', color: TOKENS.colors.text }}>{o.label}</Text>
                    {!!o.detalle && <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>{o.detalle}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
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
// Botón de ícono (Material 3): 48x48 de área táctil, ícono de 24.
// ─────────────────────────────────────────────────────────────
export const IconButton = ({ children, onPress, label, style, disabled = false }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [
      {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? TOKENS.colors.neutral200 : 'transparent',
        opacity: disabled ? 0.4 : 1,
      },
      style,
    ]}
  >
    {children}
  </Pressable>
);

// ─────────────────────────────────────────────────────────────
// Barra superior (Material 3, pequeña): atrás, título de una línea, acciones a la derecha.
// ─────────────────────────────────────────────────────────────
export const Header = ({ title, subtitle, onBack = null, right = null, lines = 1 }) => (
  <View
    style={{
      backgroundColor: TOKENS.colors.bg,
      minHeight: 64,
      paddingLeft: onBack ? 4 : TOKENS.spacing.lg,
      paddingRight: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    }}
  >
    {onBack && (
      <IconButton onPress={onBack} label="Volver a la pantalla anterior">
        <IconArrowLeft size={24} color={TOKENS.colors.text} />
      </IconButton>
    )}
    <View style={{ flex: 1, minWidth: 0, paddingVertical: 8, paddingLeft: onBack ? 4 : 0 }}>
      <Text accessibilityRole="header" numberOfLines={lines} style={{ ...TOKENS.type.titleLarge, color: TOKENS.colors.text }}>
        {title}
      </Text>
      {!!subtitle && (
        <Text numberOfLines={lines} style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 1 }}>
          {subtitle}
        </Text>
      )}
    </View>
    {right}
  </View>
);

// Título de pantalla de las pestañas (sin etiquetas superiores): titular y bajada opcional.
export const ScreenTitle = ({ title, subtitle, right }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
    <View style={{ flex: 1 }}>
      <Text accessibilityRole="header" style={{ ...TOKENS.type.headlineMedium, color: TOKENS.colors.text }}>
        {title}
      </Text>
      {!!subtitle && <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: 4 }}>{subtitle}</Text>}
    </View>
    {right}
  </View>
);

// Encabezado de sección: el título habla por sí solo; acción opcional a la derecha.
export const SectionTitle = ({ title, actionLabel, onAction, style }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }, style]}>
    <Text accessibilityRole="header" style={{ ...TOKENS.type.titleLarge, color: TOKENS.colors.text }}>
      {title}
    </Text>
    {!!actionLabel && (
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        style={{ minHeight: 48, justifyContent: 'center', paddingLeft: 12 }}
      >
        <Text style={{ ...TOKENS.type.labelLarge, color: TOKENS.colors.accentText }}>{actionLabel}</Text>
      </Pressable>
    )}
  </View>
);

// Aviso en banda (sin conexión, errores recuperables).
export const Banner = ({ text, tone = 'warning', icon, action, onAction }) => {
  const tonos = {
    warning: { bg: TOKENS.colors.warningTint, fg: TOKENS.colors.warningText, icon: TOKENS.colors.warning },
    danger: { bg: TOKENS.colors.dangerTint, fg: TOKENS.colors.danger, icon: TOKENS.colors.danger },
  };
  const t = tonos[tone] || tonos.warning;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: t.bg, borderRadius: TOKENS.radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {icon || <IconAlertTriangle size={22} color={t.icon} />}
      <Text style={{ ...TOKENS.type.bodyMedium, color: t.fg, flex: 1, fontWeight: '600' }}>{text}</Text>
      {!!action && (
        <Pressable onPress={onAction} accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text style={{ ...TOKENS.type.labelLarge, color: t.fg }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
};

// Aviso de "sin conexión" igual en todas las pestañas.
export const AvisoSinConexion = () => (
  <Banner icon={<IconWifiOff size={22} color={TOKENS.colors.warning} />} text="Sin conexión. Ves los datos guardados en este teléfono." />
);

// Botón de acción flotante extendido (Material 3): una sola acción principal por pantalla.
export const Fab = ({ label, icon, onPress, style }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [
      {
        position: 'absolute',
        right: 16,
        bottom: 16,
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        borderRadius: 16,
        backgroundColor: pressed ? TOKENS.colors.accent700 : TOKENS.colors.accent,
        ...TOKENS.shadow.md,
      },
      style,
    ]}
  >
    {icon}
    <Text style={{ ...TOKENS.type.labelLarge, fontSize: 16, color: '#fff' }}>{label}</Text>
  </Pressable>
);

// Snackbar: aviso breve y pasajero (se oculta solo). Quien lo usa controla `visible`.
export const Snackbar = ({ visible, message, actionLabel, onAction, onDismiss }) => {
  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(() => onDismiss?.(), 4500);
    return () => clearTimeout(t);
  }, [visible, message, onDismiss]);
  if (!visible) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 96,
        minHeight: 48,
        backgroundColor: TOKENS.colors.text,
        borderRadius: 8,
        paddingLeft: 16,
        paddingRight: actionLabel ? 4 : 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...TOKENS.shadow.md,
      }}
    >
      <Text style={{ ...TOKENS.type.bodyMedium, color: '#f5ead8', flex: 1, paddingVertical: 12 }}>{message}</Text>
      {!!actionLabel && (
        <Pressable onPress={onAction} accessibilityRole="button" style={{ minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' }}>
          <Text style={{ ...TOKENS.type.labelLarge, color: TOKENS.colors.accent400 }}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

// Menú de acciones de la barra superior (Material 3): lista corta bajo el botón de tres puntos.
export const MenuAcciones = ({ visible, onCerrar, items }) => {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable onPress={onCerrar} accessibilityLabel="Cerrar menú" style={{ flex: 1 }}>
        <View
          accessibilityRole="menu"
          style={{
            position: 'absolute',
            right: 8,
            top: TOP_INSET + 52,
            minWidth: 220,
            backgroundColor: TOKENS.colors.surfaceAlt,
            borderRadius: 12,
            paddingVertical: 8,
            ...TOKENS.shadow.lg,
          }}
        >
          {items.map((it) => (
            <Pressable
              key={it.label}
              onPress={() => {
                onCerrar();
                it.onPress?.();
              }}
              accessibilityRole="menuitem"
              style={({ pressed }) => ({
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: 16,
                backgroundColor: pressed ? TOKENS.colors.neutral200 : 'transparent',
              })}
            >
              {it.icon}
              <Text style={{ ...TOKENS.type.bodyLarge, color: it.destructive ? TOKENS.colors.danger : TOKENS.colors.text }}>{it.label}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Barra de pestañas inferior
// ─────────────────────────────────────────────────────────────
const renderTabIcon = (key, color) => {
  switch (key) {
    case 'home':
      return <IconHome size={24} color={color} />;
    case 'lotes':
      return <IconLotes size={24} color={color} />;
    case 'folders':
      return <IconPuntos size={24} color={color} />;
    case 'activity':
      return <IconActivity size={24} color={color} />;
    case 'settings':
      return <IconSettings size={24} color={color} />;
    default:
      return <IconDot size={24} color={color} />;
  }
};

// Avatar con las iniciales: abre Ajustes (cuenta y cerrar sesión) desde cualquier pestaña.
export const AvatarButton = ({ iniciales, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Abrir ajustes y cuenta"
    style={({ pressed }) => ({
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: pressed ? TOKENS.colors.accent300 : TOKENS.colors.accent200,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: TOKENS.colors.accent300,
    })}
  >
    <Text style={{ ...TOKENS.type.titleMedium, color: TOKENS.colors.accent800 }}>{iniciales}</Text>
  </Pressable>
);

export const TabBar = ({ current, onChange, items }) => (
  <View
    accessibilityRole="tablist"
    style={{
      flexDirection: 'row',
      backgroundColor: TOKENS.colors.surfaceAlt,
      borderTopWidth: 1,
      borderTopColor: TOKENS.colors.neutral200,
      paddingTop: 12,
      paddingBottom: 16,
      paddingHorizontal: 4,
    }}
  >
    {items.map((it) => {
      const active = it.key === current;
      const color = active ? TOKENS.colors.accent900 : TOKENS.colors.neutral600;
      return (
        <Pressable
          key={it.key}
          onPress={() => onChange(it.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          accessibilityLabel={it.label}
          style={{ flex: 1, alignItems: 'center', gap: 4, minHeight: 56 }}
        >
          {/* Indicador activo (píldora) de Material 3 */}
          <View
            style={{
              width: 64,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? TOKENS.colors.accent200 : 'transparent',
            }}
          >
            {renderTabIcon(it.key, color)}
          </View>
          {/* 12 sp (como Material 3): con 360 dp o letra grande, 4 rótulos caben sin apretarse. */}
          <Text numberOfLines={1} style={{ ...TOKENS.type.labelSmall, fontWeight: active ? '800' : '600', color }}>
            {it.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

// LecturaNivel — la lectura de una medición: nivel (ícono + nombre), % y su aclaración honesta.
//   El % es aproximado y se mide sobre la placa cuando el backend lo indica (area_base = 'placa').
// ─────────────────────────────────────────────────────────────
export const LecturaNivel = ({ medicion, compacta = false }) => {
  const s = severidad(medicion || {});
  const sobrePlaca = medicion?.area_base === 'placa' || medicion?.area_corroida_pct_foto != null;
  const conf = medicion?.confianza_promedio;
  if (compacta) {
    // Bloque compacto (detalle de foto): ícono + nivel + aclaración a la izquierda y el % grande en cifras a la derecha.
    return (
      <View
        accessible
        accessibilityLabel={`${s.label}, ${formatoPct(medicion?.area_corroida_pct)} ${sobrePlaca ? 'sobre la placa' : 'de la foto'}, aproximado${conf != null ? `, confianza del modelo ${confianzaPct(conf)} %` : ''}`}
        style={{ gap: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: s.color, alignItems: 'center', justifyContent: 'center' }}>
            <IconNivel nivel={s.i} size={28} color={COLORES_SOBRE_NIVEL[s.i]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...TOKENS.type.titleMedium, color: s.texto }}>{s.label}</Text>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>{sobrePlaca ? 'Aproximado sobre la placa' : 'Aproximado sobre la foto'}</Text>
          </View>
          <PctMono value={medicion?.area_corroida_pct} size={32} />
        </View>
        {conf != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Confianza del modelo</Text>
            <View style={{ flex: 1 }}>
              <ProgressBar value={confianzaPct(conf)} color={TOKENS.colors.piedra_600} />
            </View>
            <Text style={{ fontFamily: TOKENS.fonts.mono, fontSize: 14, fontWeight: '600', color: TOKENS.colors.text }}>{confianzaPct(conf)}%</Text>
          </View>
        )}
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={`${s.label}, ${formatoPct(medicion?.area_corroida_pct)} ${sobrePlaca ? 'sobre la placa' : 'de la foto'}, aproximado${conf != null ? `, confianza del modelo ${confianzaPct(conf)} %` : ''}`}
      style={{ gap: 12 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: s.color, alignItems: 'center', justifyContent: 'center' }}>
          <IconNivel nivel={s.i} size={32} color={COLORES_SOBRE_NIVEL[s.i]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...TOKENS.type.titleLarge, color: s.texto }}>{s.label}</Text>
          <PctMono value={medicion?.area_corroida_pct} size={38} />
        </View>
      </View>
      <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>
        {sobrePlaca ? 'Aproximado sobre la placa' : 'Aproximado sobre la foto'}. Depende del encuadre y no reemplaza una inspección en sitio.
      </Text>
      {conf != null && (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600 }}>Confianza del modelo</Text>
            <Text style={{ ...TOKENS.type.titleSmall, color: TOKENS.colors.text }}>{confianzaPct(conf)} %</Text>
          </View>
          <ProgressBar value={confianzaPct(conf)} color={TOKENS.colors.piedra_600} />
        </View>
      )}
    </View>
  );
};

// Tarjeta con la lectura (resultado de un análisis).
export const ResultCard = ({ medicion, ubicacion, loteNombre, nivel, percentage, confidence }) => {
  const m = medicion || { nivel_corrosion: nivel, area_corroida_pct: percentage, confianza_promedio: confidence };
  return (
    <View style={{ backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: TOKENS.radius.lg, padding: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.border, marginBottom: TOKENS.spacing.base, ...TOKENS.shadow.card }}>
      <LecturaNivel medicion={m} />
      {!!(ubicacion || loteNombre || m.lote_nombre) && (
        <View style={{ marginTop: 14, gap: 8, borderTopWidth: 1, borderTopColor: TOKENS.colors.neutral200, paddingTop: 14 }}>
          {!!ubicacion && <FilaDato label="Punto" value={ubicacion} />}
          {!!(loteNombre || m.lote_nombre) && <FilaDato label="Lote" value={loteNombre || m.lote_nombre} />}
        </View>
      )}
    </View>
  );
};

// Fila etiqueta / valor, el valor se parte en varias líneas en vez de truncarse.
export const FilaDato = ({ label, value }) => (
  <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
    <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, width: 104 }}>{label}</Text>
    <Text style={{ ...TOKENS.type.titleSmall, color: TOKENS.colors.text, flex: 1 }}>{value}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────
// ConfirmModal — Diálogo de Material 3 (reemplazo accesible de Alert.alert).
//   Título, mensaje y acciones de texto alineadas a la derecha; la acción destructiva usa el color de
//   peligro y siempre nombra lo que hace ("Eliminar", "Cerrar sesión"), nunca "Aceptar".
// ─────────────────────────────────────────────────────────────
const AccionTexto = ({ label, onPress, danger = false, primary = false }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => ({
      minHeight: 48,
      minWidth: 64,
      paddingHorizontal: 12,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: pressed ? (danger ? TOKENS.colors.dangerTint : TOKENS.colors.neutral200) : 'transparent',
    })}
  >
    <Text
      style={{
        ...TOKENS.type.labelLarge,
        fontSize: 15,
        color: danger ? TOKENS.colors.danger : primary ? TOKENS.colors.accentText : TOKENS.colors.neutral700,
      }}
    >
      {label}
    </Text>
  </Pressable>
);

const Dialogo = ({ children, onCancel }) => (
  <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
    <View style={{ flex: 1, backgroundColor: 'rgba(32,30,29,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <View
        accessibilityViewIsModal
        style={{ backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: 28, paddingTop: 24, paddingHorizontal: 24, paddingBottom: 16, width: '100%', maxWidth: 360, ...TOKENS.shadow.lg }}
      >
        {children}
      </View>
    </View>
  </Modal>
);

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  variant = 'primary', // primary | danger
  extraLabel = '', // tercera acción opcional (p. ej. "Descartar y continuar")
  onExtra,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;
  const apilado = Boolean(extraLabel);
  return (
    <Dialogo onCancel={onCancel}>
      {!!title && (
        <Text accessibilityRole="header" style={{ ...TOKENS.type.headlineSmall, fontWeight: '700', color: TOKENS.colors.text, marginBottom: 12 }}>
          {title}
        </Text>
      )}
      {!!message && <Text style={{ ...TOKENS.type.bodyLarge, color: TOKENS.colors.neutral700 }}>{message}</Text>}
      <View
        style={{
          flexDirection: apilado ? 'column' : 'row',
          alignItems: apilado ? 'flex-end' : 'center',
          justifyContent: 'flex-end',
          gap: 4,
          marginTop: 20,
        }}
      >
        {!!cancelLabel && <AccionTexto label={cancelLabel} onPress={onCancel} />}
        {!!extraLabel && <AccionTexto label={extraLabel} onPress={onExtra} danger />}
        <AccionTexto label={confirmLabel} onPress={onConfirm} danger={variant === 'danger'} primary={variant !== 'danger'} />
      </View>
    </Dialogo>
  );
};

// ─────────────────────────────────────────────────────────────
// PromptModal — Diálogo con un campo de texto (reemplazo de Alert.prompt)
// ─────────────────────────────────────────────────────────────
export const PromptModal = ({
  visible,
  title,
  message,
  initialValue = '',
  placeholder = '',
  confirmLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, visible]);

  if (!visible) return null;

  return (
    <Dialogo onCancel={onCancel}>
      {!!title && (
        <Text accessibilityRole="header" style={{ ...TOKENS.type.headlineSmall, fontWeight: '700', color: TOKENS.colors.text, marginBottom: 8 }}>
          {title}
        </Text>
      )}
      {!!message && <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral700, marginBottom: 16 }}>{message}</Text>}
      <Field label="" value={value} onChangeText={setValue} placeholder={placeholder} autoFocus accessibilityLabel={title} />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
        <AccionTexto label={cancelLabel} onPress={onCancel} />
        <AccionTexto label={confirmLabel} onPress={() => onConfirm(value)} primary />
      </View>
    </Dialogo>
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
  ScreenTitle,
  LecturaNivel,
  FilaDato,
  SectionTitle,
  Banner,
  Fab,
  Snackbar,
  MenuAcciones,
  IconButton,
  Chip,
  HojaOpciones,
  Foto,
  NivelBadge,
  NivelChip,
  SwatchNivel,
};
