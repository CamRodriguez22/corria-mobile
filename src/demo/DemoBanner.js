// src/demo/DemoBanner.js — Aviso permanente de que los datos son sintéticos (solo modo demo).
import { View, Text } from 'react-native';

export default function DemoBanner() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 9999 }}
    >
      <View style={{ backgroundColor: '#201e1d', paddingHorizontal: 10, paddingVertical: 2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
        <Text accessibilityLabel="Modo demo, datos de ejemplo" style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 }}>
          Modo demo · datos de ejemplo
        </Text>
      </View>
    </View>
  );
}
