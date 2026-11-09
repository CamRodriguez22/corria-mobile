// src/subida.js — Lógica pura del flujo "Subir medición" (sin React Native).

// Tamaño mínimo para analizar una foto. Solo se usa para validar: el usuario nunca ve estas cifras.
export const ANCHO_MINIMO = 640;
export const ALTO_MINIMO = 480;

export const MENSAJE_FOTO_PEQUENA = 'La foto es muy pequeña para analizarla. Tómala más cerca o con mejor calidad.';
export const MENSAJE_FOTOS_PEQUENAS = 'Las fotos son muy pequeñas para analizarlas. Tómalas más cerca o con mejor calidad.';

// '' si la foto sirve; si no, el mensaje (sin píxeles) para el usuario.
export function validarFoto(foto) {
  if (!foto?.uri) return 'No se recibió ninguna foto.';
  if (foto.width && foto.height && (foto.width < ANCHO_MINIMO || foto.height < ALTO_MINIMO)) return MENSAJE_FOTO_PEQUENA;
  return '';
}

// ───────────────────────── Formato de la foto ─────────────────────────
// La subida siempre declara image/jpeg (api-real.js pedirUploadUrl). Algunos Android guardan HEIF/HEIC (o WebP)
// en la galería: esas fotos se convierten a JPEG sin avisar. JPEG y PNG se suben tal cual.
const FORMATOS_DIRECTOS = /^(jpe?g|png)$/;

function extensionDe(texto) {
  const limpio = String(texto || '').split(/[?#]/)[0];
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(limpio);
  return m ? m[1].toLowerCase() : '';
}

// true si hay que convertir a JPEG. Primero manda el tipo MIME; sin él, la extensión del nombre o de la URI.
// Sin ninguna pista (p. ej. una URI sin extensión) no se convierte: el selector del sistema ya entrega JPEG.
export function necesitaConvertirAJpeg({ mimeType, fileName, uri } = {}) {
  const mime = String(mimeType || '').toLowerCase().trim();
  if (mime) {
    const tipo = mime.replace(/^image\//, '');
    return !FORMATOS_DIRECTOS.test(tipo);
  }
  const ext = extensionDe(fileName) || extensionDe(uri);
  return ext ? !FORMATOS_DIRECTOS.test(ext) : false;
}
