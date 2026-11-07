// src/demo/api-demo.js — Sustituto de src/api-real.js en modo demo: datos sintéticos en memoria,
// SIN red. Mismos nombres y firmas que api-real.js. Renombrar/eliminar/subir mutan el store.
import { renombrarPorTandas } from '../logic';
import { IMG_BASE, paramDemo } from './flag';
import {
  BLOQUES,
  PERFIL,
  FOTOS,
  generarMediciones,
  listarRecientes,
  obtenerMedicion,
  renombrar,
  renombrarLoteEnStore,
  eliminar,
  nuevaMedicion,
  calcularIndicadores,
  fotoDeUri,
} from './datos';

let store = null;
let contadorSubidas = 0;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const clonar = (x) => JSON.parse(JSON.stringify(x));

function meds() {
  if (!store) store = generarMediciones(Date.now(), IMG_BASE);
  return store;
}

// ?offline=1 simula que no hay red: todo falla como lo haría el cliente real.
async function red(ms = 250) {
  await espera(ms);
  if (paramDemo('offline') === '1') throw new Error('Sin conexión con el servidor.');
}

export const getMiPerfil = async () => {
  await red(150);
  return clonar(PERFIL);
};

export async function getBloques() {
  await red(200);
  return clonar(BLOQUES);
}

export async function getIndicadores() {
  await red(200);
  const base = paramDemo('vacio') === '1' ? [] : meds();
  return calcularIndicadores(base, BLOQUES, Date.now());
}

export async function getMedicionesRecientes(_token, limit = 15, { hasta, desde } = {}) {
  await red(350);
  if (paramDemo('vacio') === '1') return { total: 0, mediciones: [], truncado: false };
  return clonar(listarRecientes(meds(), { limit, hasta, desde }));
}

export async function getMedicionCompleta(id_punto, id_medicion) {
  if (!id_punto || !id_medicion) return null;
  await red(250);
  const lista = obtenerMedicion(meds(), id_punto, id_medicion);
  if (!lista.length) return null;
  const { mascaras, ...resto } = lista[0];
  return clonar(resto);
}

export async function renombrarMedicion(id_punto, id_medicion, nuevoNombre) {
  await red(250);
  renombrar(meds(), id_medicion, nuevoNombre);
  return { ok: true, nombre: nuevoNombre };
}

export async function renombrarLote(items, nuevoNombre) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Se requiere lista de mediciones.');
  return renombrarPorTandas(
    items.map((it) => ({ id_punto: it.id_punto, id_medicion: it.id_medicion })),
    async (tanda) => {
      await red(250);
      return renombrarLoteEnStore(meds(), tanda, nuevoNombre);
    }
  );
}

export async function eliminarMedicion(id_punto, id_medicion) {
  await red(250);
  store = eliminar(meds(), id_medicion);
  return { ok: true };
}

export async function resolverBloqueId({ bloque } = {}) {
  if (!bloque) throw new Error('Selecciona un punto antes de continuar.');
  if (bloque.id_bloque) return bloque.id_bloque;
  throw new Error('El punto seleccionado no tiene un identificador válido.');
}

export async function pedirUploadUrl() {
  await espera(300);
  return { url: 'demo://sin-red', fields: {}, imagen_key: `demo/${Date.now()}.jpg` };
}

export async function subirFotoAS3() {
  await espera(600);
}

// Simula upload-url -> S3 -> análisis con esperas, sin red. La foto se mapea al catálogo por su URI
// (foto05.jpg …); si no calza, se rota por el catálogo.
export async function subirMedicion({ foto, gps, bloqueId, loteId, loteNombre, notas = '', onEtapa, imagenKey, onImagenKey }) {
  if (!bloqueId) throw new Error('No se pudo determinar el punto de la medición.');
  const bloque = BLOQUES.find((b) => b.id_bloque === bloqueId) || BLOQUES[0];
  let key = imagenKey;
  if (!key) {
    onEtapa?.('preparando_subida');
    const pre = await pedirUploadUrl();
    onEtapa?.('subiendo_s3');
    await subirFotoAS3();
    key = pre.imagen_key;
    onImagenKey?.(key);
  }
  onEtapa?.('analizando_ia');
  await espera(1800);
  const catalogo = fotoDeUri(foto?.uri) || FOTOS[contadorSubidas++ % FOTOS.length];
  const medicion = nuevaMedicion({
    ahoraMs: Date.now(),
    base: IMG_BASE,
    bloque,
    foto: catalogo,
    loteId,
    loteNombre,
    notas,
    lat: gps?.lat,
    lng: gps?.lng,
    idMed: `MED-demo-${Date.now()}-${contadorSubidas}`,
  });
  meds().unshift(clonar(medicion));
  return { medicion };
}
