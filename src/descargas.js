// src/descargas.js — Descargar la foto original o la imagen con la corrosión detectada.
//   Web:    se baja la foto con fetch (blob; el atributo `download` no sirve con URL de otro origen), la
//           segmentación se compone en un canvas a la resolución original (como MedicionDetailPage.jsx de la
//           web) y se guarda con un enlace de descarga.
//   Nativo: el original se baja a la caché y se abre la hoja de compartir del sistema (Guardar en Fotos /
//           Archivos, WhatsApp…); la segmentación se captura (react-native-view-shot) de la vista con la máscara.
// Cada función devuelve { mensaje } para avisar al usuario o lanza un Error con un texto en español.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { comandosSegmentacion, esUrlRemota, nombreArchivo } from './descarga';

const web = Platform.OS === 'web';

function guardarBlobWeb(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function blobDe(uri) {
  const r = await fetch(uri, { mode: 'cors', cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.blob();
}

async function compartirNativo(uri, { mimeType, UTI, titulo }) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir ni guardar archivos.');
  await Sharing.shareAsync(uri, { mimeType, UTI, dialogTitle: titulo });
}

export async function descargarOriginal(medicion, uri) {
  if (!uri) throw new Error('La foto ya no está disponible. Actualiza la lista e inténtalo de nuevo.');
  const nombre = nombreArchivo(medicion, 'original');
  if (web) {
    try {
      guardarBlobWeb(await blobDe(uri), nombre);
      return { mensaje: 'Foto original descargada.' };
    } catch {
      // Sin permiso CORS o sin red: se abre la foto en otra pestaña para guardarla desde allí.
      window.open(uri, '_blank', 'noopener');
      return { mensaje: 'Se abrió la foto en otra pestaña; guárdala desde allí.' };
    }
  }
  let archivo = uri;
  if (esUrlRemota(uri)) {
    const destino = `${FileSystem.cacheDirectory}${nombre}`;
    const r = await FileSystem.downloadAsync(uri, destino);
    if (r.status && r.status >= 400) throw new Error('No se pudo bajar la foto. Revisa tu conexión.');
    archivo = r.uri;
  }
  await compartirNativo(archivo, { mimeType: 'image/jpeg', UTI: 'public.jpeg', titulo: 'Guardar foto original' });
  return { mensaje: 'Foto original lista para guardar.' };
}

// Web: `uri` es la foto original. Nativo: `vista` es la ref de la vista con la foto y la máscara dibujadas.
export async function descargarSegmentacion(medicion, { uri, vista } = {}) {
  const nombre = nombreArchivo(medicion, 'corrosion');
  if (web) {
    if (!uri) throw new Error('La foto ya no está disponible. Actualiza la lista e inténtalo de nuevo.');
    let objectUrl;
    try {
      objectUrl = URL.createObjectURL(await blobDe(uri));
      const img = new window.Image();
      img.src = objectUrl;
      await new Promise((ok, mal) => {
        img.onload = ok;
        img.onerror = mal;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      for (const c of comandosSegmentacion(medicion, canvas.width, canvas.height)) {
        ctx.beginPath();
        c.puntos.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        if (c.relleno) {
          ctx.fillStyle = c.relleno;
          ctx.fill();
        }
        ctx.strokeStyle = c.trazo;
        ctx.lineWidth = c.grosor;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
      if (!blob) throw new Error('canvas vacío');
      guardarBlobWeb(blob, nombre);
      return { mensaje: 'Imagen con la corrosión detectada descargada.' };
    } catch {
      throw new Error('No se pudo generar la imagen con la corrosión detectada. Puedes descargar la foto original.');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }
  if (!vista?.current) throw new Error('La imagen aún no está lista. Espera un momento e inténtalo de nuevo.');
  const archivo = await captureRef(vista, { format: 'png', quality: 1, result: 'tmpfile' });
  await compartirNativo(archivo, { mimeType: 'image/png', UTI: 'public.png', titulo: 'Guardar imagen con corrosión detectada' });
  return { mensaje: 'Imagen con la corrosión detectada lista para guardar.' };
}
