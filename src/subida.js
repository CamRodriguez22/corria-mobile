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
// La subida siempre declara image/jpeg (api-real.js pedirUploadUrl), así que el archivo debe SER un JPEG.
// Algunos Android guardan HEIF/HEIC (o WebP) en la galería y hay galerías con PNG: todo lo que no sea JPEG
// se convierte a JPEG antes de subir. Solo el JPEG se sube tal cual.
const FORMATOS_DIRECTOS = /^jpe?g$/;

function extensionDe(texto) {
  const limpio = String(texto || '').split(/[?#]/)[0];
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(limpio);
  return m ? m[1].toLowerCase() : '';
}

// true si hay que convertir a JPEG. Primero manda el tipo MIME; sin él, la extensión del nombre o de la URI.
// Unknown URI formats must be converted: a content provider does not guarantee JPEG bytes.
export function necesitaConvertirAJpeg({ mimeType, fileName, uri } = {}) {
  const mime = String(mimeType || '').toLowerCase().trim();
  if (mime) {
    const tipo = mime.replace(/^image\//, '');
    return !FORMATOS_DIRECTOS.test(tipo);
  }
  const ext = extensionDe(fileName) || extensionDe(uri);
  return ext ? !FORMATOS_DIRECTOS.test(ext) : Boolean(uri);
}

// Resultado de convertir varias fotos con Promise.allSettled: conserva las que salieron bien (en su orden)
// y cuenta las que fallaron. `error` es el primer motivo, por si fallaron todas.
export function separarConversiones(resultados = []) {
  const buenas = [];
  let omitidas = 0;
  let error = null;
  resultados.forEach((r) => {
    if (r.status === 'fulfilled') buenas.push(r.value);
    else {
      omitidas++;
      error = error || r.reason;
    }
  });
  return { buenas, omitidas, error };
}

export function mensajeFotosOmitidas(n) {
  return n === 1 ? 'No se pudo preparar 1 foto; se omitió.' : `No se pudo preparar ${n} fotos; se omitieron.`;
}

// ───────────────────────── Individual o lote ─────────────────────────
// "Individual": cada foto es una medición suelta (sin lote), aunque se elijan varias.
// "Lote": todas las fotos de la sesión llevan el mismo lote hasta "Terminar lote".
export const MODO_INDIVIDUAL = 'individual';
export const MODO_LOTE = 'lote';

export const TEXTO_MODO = {
  [MODO_INDIVIDUAL]: 'Cada foto se guarda como una medición suelta, sin lote.',
  [MODO_LOTE]: 'Las fotos de esta sesión se agrupan en un lote con el nombre que elijas.',
};

// Lote que lleva cada foto al subirla. Individual NUNCA lleva lote (aunque quede un lote de antes en memoria).
export function paramsLote({ modo, loteId, loteNombre } = {}) {
  if (modo !== MODO_LOTE) return { loteId: undefined, loteNombre: undefined };
  return { loteId: loteId || undefined, loteNombre: String(loteNombre || '').trim() || undefined };
}

// Para continuar hace falta un punto y, en Lote, también el nombre del lote (sin nombre no se crearía el lote).
export function puedeContinuar({ modo, bloqueSel, loteNombre } = {}) {
  if (!bloqueSel) return false;
  return modo === MODO_LOTE ? Boolean(String(loteNombre || '').trim()) : true;
}

// Opciones del selector de fotos según la pestaña y el botón:
//  · cámara: siempre con recorte, una foto;
//  · Individual, "Elegir una foto": galería con recorte (una sola selección);
//  · Individual, "Elegir varias" y Lote: selección múltiple, sin recorte (el selector del sistema no recorta varias).
export function opcionesSelector({ modo, deCamara = false, unaSola = false } = {}) {
  if (deCamara) return { fromCamera: true, allowsMultiple: false, recortar: true };
  if (modo === MODO_INDIVIDUAL && unaSola) return { fromCamera: false, allowsMultiple: false, recortar: true };
  return { fromCamera: false, allowsMultiple: true, recortar: false };
}
