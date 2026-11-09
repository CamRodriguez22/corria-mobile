import React from 'react';
import Svg, { Path, Polyline, Line, Circle, Rect } from 'react-native-svg';

// Base de los íconos nuevos: misma cuadrícula 24, trazo 2.2, terminaciones redondas.
function Base({ size = 20, color = '#201e1d', strokeWidth = 2.2, style, children }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {children}
    </Svg>
  );
}

export function IconHome({ size = 22, color = '#2563eb', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
}

export function IconLotes({ size = 22, color = '#2563eb', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <Polyline points="3.29 7 12 12 20.71 7" />
      <Line x1="12" y1="22" x2="12" y2="12" />
    </Svg>
  );
}

export function IconPuntos({ size = 22, color = '#2563eb', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <Circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

export function IconActivity({ size = 22, color = '#2563eb', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

export function IconSettings({ size = 22, color = '#2563eb', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

export function IconCamera({ size = 22, color = '#2563eb', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <Circle cx="12" cy="13" r="3" />
    </Svg>
  );
}

export function IconAlertTriangle({ size = 20, color = '#f59e0b', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <Line x1="12" y1="9" x2="12" y2="13" />
      <Line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
  );
}

export function IconCheckCircle({ size = 20, color = '#10b981', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <Polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  );
}

export function IconBuilding({ size = 20, color = '#2563eb', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <Path d="M9 22v-4h6v4" />
      <Line x1="8" y1="6" x2="8.01" y2="6" />
      <Line x1="16" y1="6" x2="16.01" y2="6" />
      <Line x1="12" y1="6" x2="12.01" y2="6" />
      <Line x1="8" y1="10" x2="8.01" y2="10" />
      <Line x1="16" y1="10" x2="16.01" y2="10" />
      <Line x1="12" y1="10" x2="12.01" y2="10" />
      <Line x1="8" y1="14" x2="8.01" y2="14" />
      <Line x1="16" y1="14" x2="16.01" y2="14" />
      <Line x1="12" y1="14" x2="12.01" y2="14" />
    </Svg>
  );
}

export function IconGps({ size = 20, color = '#2563eb', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Circle cx="12" cy="12" r="10" />
      <Line x1="22" y1="12" x2="18" y2="12" />
      <Line x1="6" y1="12" x2="2" y2="12" />
      <Line x1="12" y1="6" x2="12" y2="2" />
      <Line x1="12" y1="22" x2="12" y2="18" />
    </Svg>
  );
}

export function IconCheck({ size = 20, color = '#10b981', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}


export function IconChevronLeft({ size = 20, color = '#201e1d', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

export function IconChevronRight({ size = 20, color = '#201e1d', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Polyline points="9 18 15 12 9 6" />
    </Svg>
  );
}

export function IconArrowLeft({ size = 20, color = '#201e1d', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Line x1="19" y1="12" x2="5" y2="12" />
      <Polyline points="12 19 5 12 12 5" />
    </Svg>
  );
}

export function IconPlus({ size = 20, color = '#201e1d', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

export function IconMinus({ size = 20, color = '#201e1d', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

export function IconDot({ size = 20, color = '#201e1d', strokeWidth = 2.2, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}

// Nivel de corrosión: 0 = círculo con verificación; 1..3 = una, dos o tres barras de severidad.
// Nunca depende solo del color: la forma dice el nivel.
export function IconNivel({ nivel = 0, size = 16, color = '#201e1d', strokeWidth = 2.2, style }) {
  if (nivel <= 0) {
    return (
      <Base size={size} color={color} strokeWidth={strokeWidth} style={style}>
        <Circle cx="12" cy="12" r="9" />
        <Polyline points="8 12.5 11 15.5 16 9" />
      </Base>
    );
  }
  const barras = [
    { x: 5, y2: 15 },
    { x: 12, y2: 10 },
    { x: 19, y2: 4 },
  ];
  return (
    <Base size={size} color={color} strokeWidth={strokeWidth + 0.4} style={style}>
      {barras.map((b, i) => (
        <Line key={b.x} x1={b.x} y1="20" x2={b.x} y2={b.y2} opacity={i < nivel ? 1 : 0.28} />
      ))}
    </Base>
  );
}

export function IconImageOff(p) {
  return (
    <Base {...p}>
      <Rect x="3" y="3" width="18" height="18" rx="2" />
      <Circle cx="9" cy="9" r="1.5" />
      <Path d="m21 15-5-5L5 21" />
    </Base>
  );
}

export function IconClose(p) {
  return (
    <Base {...p}>
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Base>
  );
}

export function IconMoreVertical(p) {
  return (
    <Base {...p}>
      <Circle cx="12" cy="5" r="1.2" fill={p.color || '#201e1d'} />
      <Circle cx="12" cy="12" r="1.2" fill={p.color || '#201e1d'} />
      <Circle cx="12" cy="19" r="1.2" fill={p.color || '#201e1d'} />
    </Base>
  );
}

export function IconShare(p) {
  return (
    <Base {...p}>
      <Circle cx="18" cy="5" r="3" />
      <Circle cx="6" cy="12" r="3" />
      <Circle cx="18" cy="19" r="3" />
      <Line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
      <Line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </Base>
  );
}

export function IconDownload(p) {
  return (
    <Base {...p}>
      <Path d="M12 3v12" />
      <Polyline points="7 10 12 15 17 10" />
      <Path d="M5 20h14" />
    </Base>
  );
}

export function IconEdit(p) {
  return (
    <Base {...p}>
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Base>
  );
}

export function IconTrash(p) {
  return (
    <Base {...p}>
      <Polyline points="3 6 5 6 21 6" />
      <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <Path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Base>
  );
}

export function IconCalendar(p) {
  return (
    <Base {...p}>
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Base>
  );
}

export function IconTrend(p) {
  return (
    <Base {...p}>
      <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <Polyline points="16 7 22 7 22 13" />
    </Base>
  );
}

export function IconChevronDown(p) {
  return (
    <Base {...p}>
      <Polyline points="6 9 12 15 18 9" />
    </Base>
  );
}

export function IconRefresh(p) {
  return (
    <Base {...p}>
      <Polyline points="23 4 23 10 17 10" />
      <Path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" />
    </Base>
  );
}

export function IconWifiOff(p) {
  return (
    <Base {...p}>
      <Line x1="1" y1="1" x2="23" y2="23" />
      <Path d="M16.7 11.1A11 11 0 0 1 21 13.6M5 12.9a11 11 0 0 1 5.2-2.7M8.5 16.4a6 6 0 0 1 7 0M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22.6 8.8" />
      <Line x1="12" y1="20" x2="12.01" y2="20" />
    </Base>
  );
}

export function IconLogout(p) {
  return (
    <Base {...p}>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Polyline points="16 17 21 12 16 7" />
      <Line x1="21" y1="12" x2="9" y2="12" />
    </Base>
  );
}

export function IconImages(p) {
  return (
    <Base {...p}>
      <Rect x="3" y="3" width="18" height="18" rx="2" />
      <Circle cx="9" cy="9" r="1.5" />
      <Path d="m21 15-5-5L5 21" />
    </Base>
  );
}

export function IconFilter(p) {
  return (
    <Base {...p}>
      <Path d="M22 3H2l8 9.5V19l4 2v-8.5Z" />
    </Base>
  );
}
