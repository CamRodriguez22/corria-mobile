import React, { useEffect, useState } from 'react';
import { View, ScrollView, Image, useWindowDimensions } from 'react-native';
import { Text } from '../Typography';
import { Screen, Header, LecturaNivel, FilaDato, IconButton, MenuAcciones, SectionTitle, Segmented } from '../DesignComponents';
import FotoConMascara from '../FotoConMascara';
import { hayMascara, aspectoParaMascara, uriParaMedirAspecto } from '../mascara';
import { TOKENS } from '../DesignTokens';
import { IconShare, IconMoreVertical, IconEdit, IconTrash } from '../Icons';
import { imagenDe, miniaturaDe } from '../miniaturas';
import { fechaHoraLarga, fechaHoraCorta } from '../fechas';
import { plural } from '../fechas';

const PAD = TOKENS.spacing.lg;

// Proporción real de la foto (ancho/alto) para mostrarla completa y a todo el ancho.
// Devuelve null mientras no se conozca (o si no se puede medir).
function useAspecto(uri) {
  const [aspecto, setAspecto] = useState(null);
  useEffect(() => {
    setAspecto(null);
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
  return aspecto;
}

export default function DetailScreen({ medicion, puntoNombre, empresa, obs, puedeGestionar, onBack, onShare, onRename, onDelete }) {
  const [menu, setMenu] = useState(false);
  const [vista, setVista] = useState('original'); // 'original' | 'corrosion'
  const { width } = useWindowDimensions();
  const uri = imagenDe(medicion);
  // Miniatura (ya en caché por la galería): se pinta al instante mientras llega la foto completa.
  const uriMini = miniaturaDe(medicion);
  // La proporción sale del API (width/height) o de la miniatura; la foto grande no se baja solo para medirla.
  const medido = useAspecto(uriParaMedirAspecto({ medicion, uri, uriMini }));
  // Aspecto real: el del API o el medido en la imagen. Solo mientras se desconoce, la caja usa 4:3 y la máscara
  // no se dibuja (con un aspecto supuesto saldría estirada).
  const aspectoReal = aspectoParaMascara({ medicion, medido });
  const aspecto = aspectoReal || 4 / 3;
  // Foto a todo el ancho (con un margen pequeño y esquinas redondeadas); el alto sigue su proporción real,
  // acotado para que la lectura de abajo siempre se vea. Con tope, la foto se recorta (cover), nunca hay franjas.
  const anchoFoto = width - 24;
  const altoFoto = Math.round(Math.min(Math.max(anchoFoto / aspecto, anchoFoto * 0.62), anchoFoto * 1.12));
  const conMascara = hayMascara(medicion) && aspectoReal != null;
  const lat = medicion.latitud_real ?? medicion.punto_info?.coordenadas?.lat;
  const lng = medicion.longitud_real ?? medicion.punto_info?.coordenadas?.lng;
  const clima = medicion.clima || {};
  const fecha = fechaHoraLarga(medicion.timestamp);
  const titulo = medicion.nombre || puntoNombre || 'Foto';
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
    Array.isArray(medicion.detecciones) ? { label: 'Manchas', value: plural(medicion.detecciones.length, 'mancha detectada', 'manchas detectadas') } : null,
    clima.temperatura_c != null ? { label: 'Clima', value: `${clima.temperatura_c} °C · ${clima.humedad_pct} % de humedad` } : null,
    obs?.espesor ? { label: 'Espesor', value: `${obs.espesor} mm` } : null,
    obs?.descripcion ? { label: 'Observaciones', value: obs.descripcion } : null,
  ].filter(Boolean);

  const acciones = (
    <View style={{ flexDirection: 'row' }}>
      <IconButton onPress={onShare} label="Compartir resultado">
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
      <Header title={titulo} subtitle={subtitulo} onBack={onBack} right={acciones} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 12, gap: 10 }}>
          <FotoConMascara uri={uri} uriMini={uriMini} medicion={medicion} ancho={anchoFoto} alto={altoFoto} aspecto={aspecto} mostrarMascara={conMascara && vista === 'corrosion'} />
          {conMascara && (
            <View accessibilityLabel="Vista de la foto">
              <Segmented
                options={[
                  { value: 'original', label: 'Original' },
                  { value: 'corrosion', label: 'Corrosión detectada' },
                ]}
                value={vista}
                onChange={setVista}
              />
            </View>
          )}
        </View>

        <View style={{ padding: PAD, gap: 20 }}>
          <LecturaNivel medicion={medicion} compacta />
          <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, marginTop: -8 }}>
            Depende del encuadre y no reemplaza una inspección en sitio.
          </Text>
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
          { label: 'Eliminar foto', icon: <IconTrash size={22} color={TOKENS.colors.danger} />, onPress: onDelete, destructive: true },
        ]}
      />
    </Screen>
  );
}
