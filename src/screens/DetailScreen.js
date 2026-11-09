import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Image, Platform, useWindowDimensions } from 'react-native';
import { Text } from '../Typography';
import { Screen, Header, LecturaNivel, FilaDato, IconButton, MenuAcciones, SectionTitle, Segmented, Button } from '../DesignComponents';
import { descargarOriginal, descargarSegmentacion } from '../descargas';
import { esperarImagenLista, mensajeCaptura } from '../descarga';
import FotoConMascara from '../FotoConMascara';
import { hayMascara, aspectoParaMascara, uriParaMedirAspecto } from '../mascara';
import { TOKENS } from '../DesignTokens';
import { IconShare, IconMoreVertical, IconEdit, IconTrash, IconDownload } from '../Icons';
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

  // Descargas: la foto original y la imagen con la corrosión detectada (máscara + contorno de la placa).
  const [descargando, setDescargando] = useState(null); // null | 'original' | 'corrosion'
  const [avisoDescarga, setAvisoDescarga] = useState({ texto: '', error: false });
  const estadoCaptura = useRef('cargando'); // 'cargando' | 'lista' | 'error': ¿la foto de la vista de captura ya cargó?
  // Al cambiar de foto se reinicia durante el render, antes de que la vista de captura (key={uri}) vuelva a montarse.
  useMemo(() => {
    estadoCaptura.current = 'cargando';
  }, [uri]);
  const vistaCaptura = useRef(null); // nativo: vista fuera de pantalla con la foto completa y la máscara dibujada
  const descargar = async (tipo) => {
    if (descargando) return;
    setDescargando(tipo);
    setAvisoDescarga({ texto: '', error: false });
    try {
      let r;
      if (tipo === 'original') r = await descargarOriginal(medicion, uri);
      else {
        // Nativo: solo se captura cuando ESTA foto disparó onLoad en la vista de captura; si falla se aborta
        // (nunca se comparte el marcador de posición).
        if (Platform.OS !== 'web') {
          const msg = mensajeCaptura(await esperarImagenLista(() => estadoCaptura.current));
          if (msg) throw new Error(msg);
        }
        r = await descargarSegmentacion(medicion, { uri, vista: vistaCaptura });
      }
      setAvisoDescarga({ texto: r.mensaje, error: false });
    } catch (e) {
      setAvisoDescarga({ texto: e?.message || 'No se pudo descargar la imagen.', error: true });
    } finally {
      setDescargando(null);
    }
  };
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

        <View style={{ paddingHorizontal: 12, paddingTop: 12, gap: 8 }}>
          <Button
            variant="tonal"
            label="Descargar original"
            left={<IconDownload size={20} color={TOKENS.colors.text} />}
            onPress={() => descargar('original')}
            loading={descargando === 'original'}
            disabled={!uri || descargando === 'corrosion'}
            accessibilityHint="Guarda la foto tal como se tomó"
          />
          {conMascara && (
            <Button
              variant="tonal"
              label="Descargar con corrosión detectada"
              left={<IconDownload size={20} color={TOKENS.colors.text} />}
              onPress={() => descargar('corrosion')}
              loading={descargando === 'corrosion'}
              disabled={!uri || descargando === 'original'}
              accessibilityHint="Guarda la foto con las manchas y el contorno de la placa dibujados"
            />
          )}
          {!!avisoDescarga.texto && (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole={avisoDescarga.error ? 'alert' : undefined}
              style={{ ...TOKENS.type.bodyMedium, color: avisoDescarga.error ? TOKENS.colors.danger : TOKENS.colors.neutral700 }}
            >
              {avisoDescarga.texto}
            </Text>
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
      {/* Solo nativo: la imagen con la máscara a tamaño completo, fuera de pantalla, para capturarla al descargar. */}
      {Platform.OS !== 'web' && conMascara && (
        <View
          ref={vistaCaptura}
          collapsable={false}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: 'absolute', left: -anchoFoto * 2, top: 0, width: anchoFoto, height: Math.round(anchoFoto / aspectoReal) }}
        >
          <FotoConMascara
            key={uri}
            uri={uri}
            medicion={medicion}
            ancho={anchoFoto}
            alto={Math.round(anchoFoto / aspectoReal)}
            aspecto={aspectoReal}
            mostrarMascara
            radio={0}
            onCargada={() => {
              estadoCaptura.current = 'lista';
            }}
            onFallo={() => {
              estadoCaptura.current = 'error';
            }}
          />
        </View>
      )}
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
