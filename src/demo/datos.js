// src/demo/datos.js — Datos SINTÉTICOS del modo demo y operaciones puras sobre ellos.
// Sin dependencias de React Native: se prueba con node:test (test/demo.test.mjs).
// Los nombres de campo replican los del backend (lambda_src/api_mediciones, api_usuarios,
// api_puntos, inference); nada de esto es información real.
import { nivelDePct } from '../niveles.js';

export const DEMO_SUB = 'demo-cognito-sub-0001';
export const OTRO_SUB = 'demo-cognito-sub-0002';
export const EMPRESA_ID = 'EMP-demo-0001';
const DIA_MS = 86400000;
const UTC_MENOS_5 = 5 * 3600000;
const MS_LOTE_MAX = 100;

export const PERFIL = {
  id_usuario: 'USR-demo-0001',
  cognito_sub: DEMO_SUB,
  email: 'demo@pixelrust.example',
  nombre: 'Laura Demo',
  rol: 'tecnico',
  empresa_id: EMPRESA_ID,
  empresa_nombre: 'Empresa demo',
  empresa_departamento: 'Departamento demo',
  empresa_ciudad: 'Ciudad demo',
  activo: true,
};

const OTRO_NOMBRE = 'Carlos Ejemplo';

export const BLOQUES = [
  { id_bloque: 'BLQ-demo-0001', nombre: 'Bloque A · Cubierta', descripcion: 'Cubierta galvanizada, costado norte', ciudad: 'Ciudad demo', departamento: 'Departamento demo', coordenadas: { lat: 4.7110, lng: -74.0721 }, tipo_estructura: 'cubierta', empresa_id: EMPRESA_ID },
  { id_bloque: 'BLQ-demo-0002', nombre: 'Bloque B · Fachada', descripcion: 'Fachada metálica oriente', ciudad: 'Ciudad demo', departamento: 'Departamento demo', coordenadas: { lat: 4.7118, lng: -74.0709 }, tipo_estructura: 'fachada', empresa_id: EMPRESA_ID },
  { id_bloque: 'BLQ-demo-0003', nombre: 'Bloque C · Puente peatonal', descripcion: 'Pasarela entre edificios', ciudad: 'Ciudad demo', departamento: 'Departamento demo', coordenadas: { lat: 4.7102, lng: -74.0733 }, tipo_estructura: 'puente', empresa_id: EMPRESA_ID },
  { id_bloque: 'BLQ-demo-0004', nombre: 'Bloque D · Tanque', descripcion: 'Tanque de almacenamiento', ciudad: 'Ciudad demo', departamento: 'Departamento demo', coordenadas: { lat: 4.7095, lng: -74.0698 }, tipo_estructura: 'tanque', empresa_id: EMPRESA_ID },
  { id_bloque: 'BLQ-demo-0005', nombre: 'Bloque E · Estructura de acceso', descripcion: 'Escalera y barandas exteriores', ciudad: 'Ciudad demo', departamento: 'Departamento demo', coordenadas: { lat: 4.7125, lng: -74.0740 }, tipo_estructura: 'escalera', empresa_id: EMPRESA_ID },
];

// 14 fotos reales preparadas fuera del repo (servidas por `python3 -m http.server 3006`).
// w/h = dimensiones del archivo grande; pct = % de corrosión asignado a cada foto para que
// la demo sea determinista (cubre los 4 niveles).
export const FOTOS = [
  [540, 1200, 31.8], [900, 1200, 14.2], [900, 1200, 6.4], [1200, 800, 27.5], [675, 1200, 2.1],
  [1200, 800, 18.9], [1200, 800, 0.0], [1200, 800, 9.3], [675, 1200, 35.6], [1200, 900, 12.7],
  [1200, 800, 4.8], [900, 1200, 22.4], [1200, 800, 0.4], [1200, 800, 29.1],
].map(([w, h, pct], i) => ({ n: i + 1, w, h, pct }));

export function nombreFoto(n) {
  return `foto${String(n).padStart(2, '0')}.jpg`;
}
export function urlsFoto(n, base) {
  const dos = String(n).padStart(2, '0');
  return { url_imagen: `${base}/foto${dos}.jpg`, url_thumbnail: `${base}/thumb${dos}.jpg` };
}

// Foto del catálogo a partir de una URI ("…/foto05.jpg"); null si no calza.
export function fotoDeUri(uri) {
  const m = /foto(\d{2})\.jpg/i.exec(String(uri || ''));
  const n = m ? parseInt(m[1], 10) : 0;
  return FOTOS.find((f) => f.n === n) || null;
}

// PRNG determinista (mulberry32): mismos datos en cada arranque.
export function crearRng(semilla = 20261107) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RANGO_NIVEL = [[0.0, 0.04], [0.3, 9.5], [10.5, 24.2], [25.4, 47.0]];

function pctDeNivel(rng, nivel) {
  const [a, b] = RANGO_NIVEL[nivel];
  return Math.round((a + rng() * (b - a)) * 100) / 100;
}

function elegirNivel(rng) {
  const r = rng();
  return r < 0.14 ? 0 : r < 0.46 ? 1 : r < 0.76 ? 2 : 3;
}

// ISO como lo guarda el backend: isoformat(timespec="microseconds") en UTC.
function isoMicro(ms) {
  return new Date(ms).toISOString().replace('Z', '000+00:00');
}

// Instante UTC de las `hora`:`min` locales (UTC-5) de hace `diasAtras` días locales.
function instante(ahoraMs, diasAtras, hora, min, seg) {
  const local = new Date(ahoraMs - UTC_MENOS_5);
  const inicioDiaLocalUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + UTC_MENOS_5;
  return inicioDiaLocalUtc - diasAtras * DIA_MS + ((hora * 60 + min) * 60 + seg) * 1000;
}

function idDemo(rng) {
  const h = () => Math.floor(rng() * 0xffffffff).toString(16).padStart(8, '0');
  return `${h()}-${h().slice(0, 4)}-4${h().slice(0, 3)}-a${h().slice(0, 3)}-${h()}${h().slice(0, 4)}`;
}

// Sesiones: [díasAtrás, índicePunto, tamañoLote (0 = foto suelta), ajena]
const SESIONES = [
  [0, 0, 4, false], [1, 3, 0, false], [2, 1, 0, true], [4, 2, 5, false], [6, 0, 0, false],
  [9, 4, 3, true], [12, 1, 6, false], [15, 3, 0, false], [19, 2, 0, true], [23, 0, 8, false],
  [27, 1, 0, false], [31, 4, 0, false], [36, 3, 4, true], [42, 2, 0, false], [48, 0, 0, false],
  [55, 1, 5, false], [63, 4, 0, true], [71, 3, 0, false], [80, 2, 3, false], [92, 0, 0, false],
  [104, 1, 0, false], [116, 3, 0, true],
  [3, 2, 0, false], [8, 3, 0, false], [13, 0, 0, true], [21, 4, 0, false], [33, 1, 0, false],
  [58, 2, 0, false], [76, 0, 0, true], [98, 4, 0, false],
];

// Lista de ~60 mediciones (ordenadas de la más reciente a la más antigua), con TODOS los campos
// (detecciones, clima, …). `listarRecientes` los quita, igual que `resumen=1` en el backend.
export function generarMediciones(ahoraMs, base) {
  const rng = crearRng();
  const out = [];
  let fotoN = 0;
  SESIONES.forEach(([dias, ip, tam, ajena], si) => {
    const punto = BLOQUES[ip];
    const n = tam || 1;
    const nivelBase = elegirNivel(rng);
    const loteId = tam ? `lote_${instante(ahoraMs, dias, 9, 0, 0)}` : null;
    const loteNombre = tam ? `Inspección ${punto.nombre.split(' · ')[0].replace('Bloque ', 'Punto ')} · semana ${si + 1}` : null;
    for (let k = 0; k < n; k++) {
      const nivel = rng() < 0.65 ? nivelBase : elegirNivel(rng);
      const pct = pctDeNivel(rng, nivel);
      let ms = instante(ahoraMs, dias, 8 + Math.floor(rng() * 8), Math.floor(rng() * 60), Math.floor(rng() * 60)) + k * 47000;
      // Nunca en el futuro (si hoy es temprano, las fotos de hoy se corren a hace unas horas).
      if (ms > ahoraMs - 60000) ms = ahoraMs - (90 + si * 11 + k * 4) * 60000;
      const ts = isoMicro(ms);
      const foto = (fotoN++ % FOTOS.length) + 1;
      const sub = ajena ? OTRO_SUB : DEMO_SUB;
      const conf = Math.round((0.78 + rng() * 0.2) * 1000) / 1000;
      const idMed = `MED-${idDemo(rng)}`;
      const m = {
        id_punto: punto.id_bloque,
        sk: `MED#${ts}`,
        id_medicion: idMed,
        tipo_registro: 'medicion',
        timestamp: ts,
        notas: `movil-punto-${punto.id_bloque}`,
        area_corroida_pct: String(pct),
        area_base: 'placa',
        area_corroida_pct_foto: String(Math.round(pct * 0.62 * 100) / 100),
        nivel_corrosion: nivelDePct(pct),
        confianza_promedio: String(conf),
        modelo: 'unet-demo',
        fuente: 'movil',
        bloque_id: punto.id_bloque,
        bloque_nombre: punto.nombre,
        empresa_id: EMPRESA_ID,
        usuario_id: sub,
        tomado_por_id: sub,
        creado_por_nombre: ajena ? OTRO_NOMBRE : PERFIL.nombre,
        latitud_real: Math.round((punto.coordenadas.lat + (rng() - 0.5) * 0.0004) * 1e6) / 1e6,
        longitud_real: Math.round((punto.coordenadas.lng + (rng() - 0.5) * 0.0004) * 1e6) / 1e6,
        tiempo_procesamiento_ms: 1800 + Math.floor(rng() * 2400),
        s3_key_imagen: `empresas/${EMPRESA_ID}/${punto.id_bloque}/${idMed}.jpg`,
        s3_key_thumbnail: `empresas/${EMPRESA_ID}/${punto.id_bloque}/${idMed}_thumb.jpg`,
        s3_key_resultado: `empresas/${EMPRESA_ID}/${punto.id_bloque}/${idMed}.json`,
        ...urlsFoto(foto, base),
        detecciones: pct < 0.05 ? [] : Array.from({ length: 1 + Math.floor(pct / 6) }, (_, d) => ({
          clase: 'corrosion',
          confianza: Math.round((0.7 + rng() * 0.28) * 100) / 100,
          area_px: 1200 + d * 640,
        })),
        clima: { temperatura_c: 18 + Math.floor(rng() * 9), humedad_pct: 55 + Math.floor(rng() * 35), fuente: 'demo' },
      };
      if (loteId) {
        m.lote_id = loteId;
        m.lote_nombre = loteNombre;
      }
      // Algunas fotos tienen nombre propio (como si alguien las hubiera renombrado).
      if (!loteId && rng() < 0.4) m.nombre = ['Viga 4B', 'Cara norte', 'Unión soldada', 'Remache lateral', 'Borde inferior'][Math.floor(rng() * 5)];
      out.push(m);
    }
  });
  return out.sort((a, z) => (a.timestamp < z.timestamp ? 1 : -1));
}

// Día local (UTC-5) "YYYY-MM-DD" de un timestamp ISO.
export function diaLocal(ts) {
  const t = Date.parse(ts);
  return Number.isNaN(t) ? null : new Date(t - UTC_MENOS_5).toISOString().slice(0, 10);
}

const PESADOS = ['detecciones', 'clima', 'mascaras', 'inferencia_local', 'contorno_placa'];
const sinPesados = (m) => {
  const r = { ...m };
  PESADOS.forEach((c) => delete r[c]);
  return r;
};

// GET /mediciones/recientes?limit&desde&hasta&resumen=1 -> { total, mediciones, truncado }
export function listarRecientes(mediciones, { limit = 15, desde, hasta } = {}) {
  let lista = [...mediciones].sort((a, z) => (a.timestamp < z.timestamp ? 1 : -1));
  if (desde) lista = lista.filter((m) => diaLocal(m.timestamp) >= desde);
  if (hasta) lista = lista.filter((m) => diaLocal(m.timestamp) <= hasta);
  const tope = Math.max(1, limit);
  const page = lista.slice(0, tope).map(sinPesados);
  return { total: page.length, mediciones: page, truncado: lista.length > tope };
}

// GET /mediciones/{id_punto}?resumen=1&limite&desde&hasta -> { id_punto, total, mediciones, truncado? }.
// Mismas reglas que el handler: sin rango, límite por defecto 50 (máx. 500) y sin `truncado`;
// con rango, límite por defecto 500 y `truncado` si había más.
export function listarPorPunto(mediciones, id_punto, { limite, desde, hasta } = {}) {
  const conRango = Boolean(desde || hasta);
  const tope = Math.max(1, Math.min(limite ?? (conRango ? 500 : 50), 500));
  let lista = mediciones.filter((m) => m.id_punto === id_punto).sort((a, z) => (a.timestamp < z.timestamp ? 1 : -1));
  if (desde) lista = lista.filter((m) => diaLocal(m.timestamp) >= desde);
  if (hasta) lista = lista.filter((m) => diaLocal(m.timestamp) <= hasta);
  const page = lista.slice(0, tope).map(sinPesados);
  const cuerpo = { id_punto, total: page.length, mediciones: page };
  if (conRango) cuerpo.truncado = lista.length > tope;
  return cuerpo;
}

// GET /mediciones/resumen-diario?anio&id_punto -> agregados por día local (misma forma que el handler).
export function resumenDiario(mediciones, anio, id_punto = null) {
  const dias = {};
  let imagenes = 0;
  const lotesTotal = new Set();
  let enLotes = 0;
  for (const m of mediciones) {
    if (id_punto && m.id_punto !== id_punto) continue;
    const dia = diaLocal(m.timestamp);
    if (!dia || !dia.startsWith(`${anio}-`)) continue;
    const d = (dias[dia] ||= { fecha: dia, total: 0, por_nivel: [0, 0, 0, 0], peor_nivel: null, max_pct: null, sumPct: 0, nPct: 0, sumNiv: 0, nNiv: 0, lotes: {} });
    d.total++;
    imagenes++;
    const nivel = m.nivel_corrosion;
    if (Number.isInteger(nivel) && nivel >= 0 && nivel <= 3) {
      d.por_nivel[nivel]++;
      d.sumNiv += nivel;
      d.nNiv++;
      d.peor_nivel = d.peor_nivel === null ? nivel : Math.max(d.peor_nivel, nivel);
    }
    const pct = parseFloat(m.area_corroida_pct);
    if (Number.isFinite(pct)) {
      d.max_pct = d.max_pct === null ? pct : Math.max(d.max_pct, pct);
      d.sumPct += pct;
      d.nPct++;
    }
    if (m.lote_id) {
      d.lotes[m.lote_id] = (d.lotes[m.lote_id] || 0) + 1;
      lotesTotal.add(m.lote_id);
      enLotes++;
    }
  }
  const salida = Object.keys(dias).sort().map((k) => {
    const d = dias[k];
    return {
      fecha: d.fecha,
      total: d.total,
      por_nivel: d.por_nivel,
      peor_nivel: d.peor_nivel,
      max_pct: d.max_pct,
      promedio_pct: d.nPct ? d.sumPct / d.nPct : null,
      nivel_promedio: d.nNiv ? Math.round((d.sumNiv / d.nNiv) * 100) / 100 : null,
      nivel_ponderado: d.nNiv ? Math.floor(d.sumNiv / d.nNiv + 0.5) : null,
      lotes: { count: Object.keys(d.lotes).length, imagenes: Object.values(d.lotes).reduce((a, b) => a + b, 0) },
    };
  });
  return { anio, id_punto, dias: salida, totales: { imagenes, lotes: lotesTotal.size, imagenes_en_lotes: enLotes }, truncado: false };
}

export function obtenerMedicion(mediciones, id_punto, id_medicion) {
  const m = mediciones.find((x) => x.id_punto === id_punto && x.id_medicion === id_medicion);
  return m ? [{ ...m }] : [];
}

// Devuelve true si renombró.
export function renombrar(mediciones, id_medicion, nombre) {
  const m = mediciones.find((x) => x.id_medicion === id_medicion);
  if (!m) return false;
  m.nombre = nombre;
  return true;
}

// POST /mediciones/lote/renombrar -> cambia lote_nombre de cada medición indicada.
export function renombrarLoteEnStore(mediciones, items, nombre) {
  if (items.length > MS_LOTE_MAX) throw new Error('Demasiadas mediciones en una solicitud.');
  const ids = new Set(items.map((i) => i.id_medicion));
  let n = 0;
  mediciones.forEach((m) => {
    if (ids.has(m.id_medicion)) {
      m.lote_nombre = nombre;
      n++;
    }
  });
  return { ok: true, renombradas: n, idsRenombrados: items.map((i) => i.id_medicion) };
}

// Devuelve el store sin la medición (nuevo arreglo).
export function eliminar(mediciones, id_medicion) {
  return mediciones.filter((m) => m.id_medicion !== id_medicion);
}

// Respuesta de POST /medicion (number en pct/confianza, como el backend).
export function nuevaMedicion({ ahoraMs, base, bloque, foto, loteId, loteNombre, notas, lat, lng, idMed }) {
  const pct = foto.pct;
  const ts = isoMicro(ahoraMs);
  const m = {
    id_medicion: idMed,
    id_punto: bloque.id_bloque,
    timestamp: ts,
    fuente: 'movil',
    nivel_corrosion: nivelDePct(pct),
    area_corroida_pct: pct,
    area_base: 'placa',
    confianza_promedio: 0.91,
    detecciones: pct < 0.05 ? [] : [{ clase: 'corrosion', confianza: 0.9, area_px: 2400 }, { clase: 'corrosion', confianza: 0.84, area_px: 1100 }],
    mascaras: [],
    modelo: 'unet-demo',
    latitud_real: lat ?? bloque.coordenadas.lat,
    longitud_real: lng ?? bloque.coordenadas.lng,
    notas: notas || `movil-punto-${bloque.id_bloque}`,
    bloque_id: bloque.id_bloque,
    bloque_nombre: bloque.nombre,
    empresa_id: EMPRESA_ID,
    usuario_id: DEMO_SUB,
    tomado_por_id: DEMO_SUB,
    creado_por_nombre: PERFIL.nombre,
    clima: { temperatura_c: 22, humedad_pct: 68, fuente: 'demo' },
    tiempo_procesamiento_ms: 2300,
    ...urlsFoto(foto.n, base),
  };
  if (loteId) m.lote_id = loteId;
  if (loteNombre) m.lote_nombre = loteNombre;
  return m;
}

// GET /indicadores (forma de api_mediciones._indicadores). Estado de cada punto = promedio
// de su día más reciente con mediciones.
export function calcularIndicadores(mediciones, bloques, ahoraMs) {
  const hoy = diaLocal(new Date(ahoraMs).toISOString());
  const inicio = new Date(Date.parse(hoy + 'T00:00:00Z') - 29 * DIA_MS).toISOString().slice(0, 10);
  const porNivel = [0, 0, 0, 0];
  let sinMed = 0;
  let con30 = 0;
  const criticos = [];
  const atrasados = [];
  for (const b of bloques) {
    const dePunto = mediciones.filter((m) => m.id_punto === b.id_bloque);
    if (!dePunto.length) {
      sinMed++;
      atrasados.push({ id_punto: b.id_bloque, nombre: b.nombre, dias: null, fecha: null });
      continue;
    }
    const ultimaFecha = dePunto.map((m) => diaLocal(m.timestamp)).sort().pop();
    const delDia = dePunto.filter((m) => diaLocal(m.timestamp) === ultimaFecha);
    const prom = delDia.reduce((s, m) => s + parseFloat(m.area_corroida_pct), 0) / delDia.length;
    const nivel = nivelDePct(prom);
    porNivel[nivel]++;
    if (ultimaFecha >= inicio) con30++;
    criticos.push({ id_punto: b.id_bloque, nombre: b.nombre, promedio_pct: Math.round(prom * 100) / 100, nivel, fecha: ultimaFecha });
    atrasados.push({ id_punto: b.id_bloque, nombre: b.nombre, dias: Math.round((Date.parse(hoy) - Date.parse(ultimaFecha)) / DIA_MS), fecha: ultimaFecha });
  }
  const masCritico = criticos.sort((a, z) => z.promedio_pct - a.promedio_pct)[0] || null;
  const masAtrasado = atrasados.sort((a, z) => (z.dias ?? 1e9) - (a.dias ?? 1e9))[0] || null;
  return {
    total_puntos: bloques.length,
    por_nivel: porNivel,
    sin_mediciones: sinMed,
    mas_critico: masCritico,
    subieron_nivel: { cantidad: 0, puntos: [] },
    cobertura: { con_medicion_30d: con30, total_puntos: bloques.length, mas_atrasado: masAtrasado },
    mediciones_30d: mediciones.filter((m) => diaLocal(m.timestamp) >= inicio).length,
    mediciones_30d_truncado: false,
    puntos_truncados: 0,
    parcial: false,
    generado_en: new Date(ahoraMs).toISOString().slice(0, 19) + 'Z',
  };
}
