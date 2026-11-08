import React, { useEffect, useState } from 'react';
import { View, ScrollView, Image, useWindowDimensions } from 'react-native';
import { Text } from '../Typography';
import { Screen, Header, Foto, LecturaNivel, FilaDato, IconButton, MenuAcciones, SectionTitle } from '../DesignComponents';
import { TOKENS } from '../DesignTokens';
import { IconShare, IconMoreVertical, IconEdit, IconTrash } from '../Icons';
import { imagenDe } from '../miniaturas';
import { fechaHoraLarga, fechaHoraCorta } from '../fechas';
import { plural } from '../fechas';

const PAD = TOKENS.spacing.lg;

// Proporción real de la foto (ancho/alto) para mostrarla completa y a todo el ancho.
function useAspecto(uri, porDefecto = 4 / 3) {
  const [aspecto, setAspecto] = useState(porDefecto);
  useEffect(() => {
    if (!uri) return undefined;
    let vivo = true;
    Image.getSize(
      uri,
      (w, h) => vivo && w > 0 && h > 0 && setAspecto(w / h),
      () => {}
    );
    return () => {
      vivo = false;
    };
  }, [uri]);
  return Math.min(Math.max(aspecto, 0.6), 1.8);
}

export default function DetailScreen({ medicion, puntoNombre, empresa, obs, puedeGestionar, onBack, onShare, onRename, onDelete }) {
  const [menu, setMenu] = useState(false);
  const { width } = useWindowDimensions();
  const uri = imagenDe(medicion);
  const aspecto = useAspecto(uri);
  const lat = medicion.latitud_real ?? medicion.punto_info?.coordenadas?.lat;
  const lng = medicion.longitud_real ?? medicion.punto_info?.coordenadas?.lng;
  const clima = medicion.clima || {};
  const fecha = fechaHoraLarga(medicion.timestamp);
  const titulo = medicion.nombre || puntoNombre || 'Medición';
  const subtitulo = medicion.nombre ? [puntoNombre, fechaHoraCorta(medicion.timestamp)].filter(Boolean).join(' · ') : fechaHoraCorta(medicion.timestamp);
  const ciudad = medicion.ciudad || medicion.punto_info?.ciudad || empresa?.ciudad || '';
  const coords = lat != null && lng != null ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : '';

  // Solo se muestran los datos que existen: nada de "—" ni de identificadores crudos.
  const filas = [
    puntoNombre ? { label: 'Punto', value: puntoNombre } : null,
    medicion.lote_nombre ? { label: 'Lote', value: medicion.lote_nombre } : null,
    fecha ? { label: 'Fecha', value: fecha } : null,
    medicion.creado_por_nombre ? { label: 'Tomada por', value: medicion.creado_por_nombre } : null,
    ciudad || coords ? { label: 'Ubicación', value: [ciudad, coords].filter(Boolean).join(' · ') } : null,
    Array.isArray(medicion.detecciones) ? { label: 'Zonas', value: plural(medicion.detecciones.length, 'zona detectada', 'zonas detectadas') } : null,
    clima.temperatura_c != null ? { label: 'Clima', value: `${clima.temperatura_c} °C · ${clima.humedad_pct} % de humedad` } : null,
    obs?.espesor ? { label: 'Espesor', value: `${obs.espesor} mm` } : null,
    obs?.descripcion ? { label: 'Observaciones', value: obs.descripcion } : null,
  ].filter(Boolean);

  const acciones = (
    <View style={{ flexDirection: 'row' }}>
      <IconButton onPress={onShare} label="Compartir inspección">
        <IconShare size={22} color={TOKENS.colors.text} />
      </IconButton>
      {puedeGestionar && (
        <IconButton onPress={() => setMenu(true)} label="Más acciones">
          <IconMoreVertical size={22} color={TOKENS.colors.text} />
        </IconButton>
      )}
    </View>
  );

  return (
    <Screen>
      <Header title={titulo} subtitle={subtitulo} onBack={onBack} right={acciones} lines={2} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Foto completa (sin recortar la placa), a todo el ancho y con tope de alto para ver la lectura debajo. */}
        <Foto
          uri={uri}
          style={{ width, height: Math.min(width / aspecto, width * 1.1), backgroundColor: '#26211c' }}
          resizeMode="contain"
          iconSize={48}
        />

        <View style={{ padding: PAD, gap: 20 }}>
          <LecturaNivel medicion={medicion} />
          <View>
            <SectionTitle title="Detalles" />
            <View style={{ gap: 14, paddingTop: 4 }}>
              {filas.map((f) => (
                <FilaDato key={f.label} label={f.label} value={f.value} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <MenuAcciones
        visible={menu}
        onCerrar={() => setMenu(false)}
        items={[
          { label: 'Renombrar foto', icon: <IconEdit size={22} color={TOKENS.colors.text} />, onPress: onRename },
          { label: 'Eliminar medición', icon: <IconTrash size={22} color={TOKENS.colors.danger} />, onPress: onDelete, destructive: true },
        ]}
      />
    </Screen>
  );
}
