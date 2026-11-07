import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { Screen, Header, SeverityBadge, KeyValueCard, Button } from '../DesignComponents';
import { TOKENS, num, severidad, confianzaPct } from '../DesignTokens';
import { ENTIDAD, CIUDAD } from '../config';
import { formatDateTime } from '../utils';

const PAD = TOKENS.spacing.lg;

export default function DetailScreen({
  medicion,
  bloque,
  obs,
  puedeGestionar,
  onBack,
  onShare,
  onRename,
  onDelete,
}) {
  const s = severidad(medicion);
  const uri = medicion._localUri || medicion.url_imagen || medicion.url_thumbnail;
  const lat = medicion.latitud_real ?? medicion.punto_info?.coordenadas?.lat;
  const lng = medicion.longitud_real ?? medicion.punto_info?.coordenadas?.lng;
  const clima = medicion.clima || {};
  const tituloFoto = medicion.nombre || medicion.id_medicion;

  return (
    <Screen>
      <Header
        title={tituloFoto}
        subtitle={bloque ? `Punto ${bloque} · ${formatDateTime(medicion.timestamp)}` : formatDateTime(medicion.timestamp)}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 40 }}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{
              width: '100%',
              height: 230,
              borderRadius: TOKENS.radius.lg,
              backgroundColor: TOKENS.colors.neutral200,
            }}
            resizeMode="cover"
          />
        ) : null}

        <View style={{ marginTop: 18 }}>
          <SeverityBadge medicion={medicion} />
        </View>

        <Text style={{ fontSize: 42, fontWeight: '800', color: TOKENS.colors.text, marginTop: 8 }}>
          {num(medicion.area_corroida_pct, 0).toFixed(1)}%
        </Text>
        <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 2 }}>
          {s.label} · Confianza del modelo: {confianzaPct(medicion.confianza_promedio)}%
        </Text>

        <View style={{ marginTop: 18 }}>
          <KeyValueCard
            rows={[
              { label: 'Entidad', value: ENTIDAD },
              { label: 'Lote', value: medicion.lote_nombre || (medicion.lote_id ? `Lote ${medicion.lote_id.slice(-6)}` : 'Sin lote') },
              { label: 'Ciudad', value: medicion.ciudad || medicion.punto_info?.ciudad || CIUDAD },
              {
                label: 'Coordenadas',
                value: lat != null && lng != null ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : '—',
              },
              { label: 'Detecciones', value: String(medicion.detecciones?.length ?? '—') },
              { label: 'Espesor', value: obs?.espesor ? `${obs.espesor} mm` : '—' },
              {
                label: 'Clima',
                value: clima.temperatura_c != null ? `${clima.temperatura_c}°C · ${clima.humedad_pct}% HR` : '—',
              },
              { label: 'Observaciones', value: obs?.descripcion || medicion.notas || 'Sin observaciones' },
            ]}
          />
        </View>

        <View style={{ gap: 12, marginTop: 20 }}>
          <Button variant="ghost" label="Compartir inspección" onPress={onShare} />
          {puedeGestionar && (
            <Button variant="secondary" label="Renombrar foto" onPress={onRename} />
          )}
          {puedeGestionar && (
            <Button variant="danger" label="Eliminar medición" onPress={onDelete} />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
