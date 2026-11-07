import test from 'node:test';
import assert from 'node:assert/strict';

import {
  nombreCortoBloque,
  inicialBloque,
  puedeGestionarMedicion,
  puedeGestionarLote,
  traducirAuthError,
  calcularNivelCorrosion,
  calcularMetricasLote,
  paginaAnterior,
  mezclarMediciones,
  hayMasMediciones,
  resumirCola,
  textoResumenCola,
} from '../src/logic.js';

test('puedeGestionarMedicion - permisos por rol (forma real de /usuarios/me)', () => {
  const medicionPropia = { id_medicion: 'm1', tomado_por_id: 'sub-123' };
  const medicionPropiaAlt = { id_medicion: 'm1b', usuario_id: 'sub-123' };
  const medicionAjena = { id_medicion: 'm2', tomado_por_id: 'sub-456' };
  // /usuarios/me no trae `sub`: trae cognito_sub e id_usuario (USR-uuid distinto)
  const perfil = (rol, cognito_sub = 'sub-123') => ({ rol, cognito_sub, id_usuario: 'USR-abc' });

  // Super admin y Admin pueden todo
  assert.equal(puedeGestionarMedicion(perfil('super_admin', 'sub-999'), medicionAjena), true);
  assert.equal(puedeGestionarMedicion(perfil('admin', 'sub-999'), medicionAjena), true);
  // Rol tolerante a mayúsculas y espacios
  assert.equal(puedeGestionarMedicion(perfil(' Admin '), medicionAjena), true);

  // Técnico solo lo propio (tomado_por_id o usuario_id)
  assert.equal(puedeGestionarMedicion(perfil('tecnico'), medicionPropia), true);
  assert.equal(puedeGestionarMedicion(perfil('Tecnico'), medicionPropiaAlt), true);
  assert.equal(puedeGestionarMedicion(perfil('tecnico'), medicionAjena), false);
  // id_usuario NO es el sub
  assert.equal(
    puedeGestionarMedicion({ rol: 'tecnico', id_usuario: 'sub-123' }, medicionPropia),
    false
  );

  // Cliente nunca puede gestionar (editar/eliminar)
  assert.equal(puedeGestionarMedicion(perfil('cliente'), medicionPropia), false);
  assert.equal(puedeGestionarMedicion(perfil('cliente', 'sub-999'), medicionAjena), false);

  // Perfil nulo o sin sub
  assert.equal(puedeGestionarMedicion(null, medicionPropia), false);
  assert.equal(puedeGestionarMedicion({ rol: 'tecnico' }, medicionPropia), false);
});

test('puedeGestionarLote - el técnico solo si todas las fotos son suyas', () => {
  const propia = { id_medicion: 'a', tomado_por_id: 'sub-123' };
  const otra = { id_medicion: 'b', usuario_id: 'sub-123' };
  const ajena = { id_medicion: 'c', tomado_por_id: 'sub-456' };
  const tec = { rol: 'tecnico', cognito_sub: 'sub-123' };

  assert.equal(puedeGestionarLote(tec, [propia, otra]), true);
  assert.equal(puedeGestionarLote(tec, [propia, ajena]), false);
  assert.equal(puedeGestionarLote({ rol: 'admin', cognito_sub: 'x' }, [propia, ajena]), true);
  assert.equal(puedeGestionarLote({ rol: 'super_admin' }, [ajena]), true);
  assert.equal(puedeGestionarLote({ rol: 'cliente', cognito_sub: 'sub-123' }, [propia]), false);
  assert.equal(puedeGestionarLote(tec, []), false);
  assert.equal(puedeGestionarLote(null, [propia]), false);
});

test('nombreCortoBloque y inicialBloque', () => {
  assert.equal(nombreCortoBloque({ nombre: 'Bloque G' }), 'G');
  assert.equal(nombreCortoBloque({ nombre: 'bloque J' }), 'J');
  assert.equal(nombreCortoBloque({ nombre: 'Torre Norte' }), 'Torre Norte');
  assert.equal(nombreCortoBloque(null, 'Punto X'), 'Punto X');

  assert.equal(inicialBloque('Bloque G'), 'G');
  assert.equal(inicialBloque('bloque K'), 'K');
  assert.equal(inicialBloque('Estructura Sur'), 'E');
  assert.equal(inicialBloque(''), '?');
  assert.equal(inicialBloque(null), '?');
});

test('traducirAuthError - mensajes amigables sin jerga técnica', () => {
  assert.equal(
    traducirAuthError({ name: 'UserNotFoundException' }),
    'Correo o contraseña incorrectos.'
  );
  assert.equal(
    traducirAuthError({ name: 'NotAuthorizedException' }),
    'Correo o contraseña incorrectos.'
  );
  assert.equal(
    traducirAuthError({ name: 'TooManyRequestsException' }),
    'Demasiados intentos. Espera un momento.'
  );
  assert.equal(
    traducirAuthError({ message: 'Error de red' }),
    'Error de red'
  );
  assert.equal(
    traducirAuthError(null),
    'No se pudo iniciar sesión.'
  );
});

test('calcularNivelCorrosion - umbrales reales del backend (0-3)', () => {
  assert.equal(calcularNivelCorrosion(0), 0);
  assert.equal(calcularNivelCorrosion(null), 0);
  assert.equal(calcularNivelCorrosion(-5), 0);
  assert.equal(calcularNivelCorrosion(5.2), 1); // Leve (<10)
  assert.equal(calcularNivelCorrosion(9.99), 1); // Leve (<10)
  assert.equal(calcularNivelCorrosion(10.0), 2); // Moderada (10-25)
  assert.equal(calcularNivelCorrosion(24.9), 2); // Moderada (10-25)
  assert.equal(calcularNivelCorrosion(25.0), 3); // Severa (>=25)
  assert.equal(calcularNivelCorrosion(75.5), 3); // Severa (>=25)
});

test('calcularMetricasLote - agregación de fotos en tanda/lote', () => {
  const loteVacio = calcularMetricasLote([]);
  assert.equal(loteVacio.total, 0);
  assert.equal(loteVacio.avgPct, 0);
  assert.equal(loteVacio.maxPct, 0);
  assert.equal(loteVacio.maxNivel, 0);

  const fotos = [
    { area_corroida_pct: 5 },
    { area_corroida_pct: 15 },
    { area_corroida_pct: 25 },
  ];
  const resultado = calcularMetricasLote(fotos);
  assert.equal(resultado.total, 3);
  assert.equal(resultado.avgPct, 15);
  assert.equal(resultado.maxPct, 25);
  assert.equal(resultado.maxNivel, 3); // Severa
});

test('paginaAnterior - hasta = día de la más antigua, límite cubre las ya cargadas', () => {
  assert.equal(paginaAnterior([]), null);
  assert.equal(paginaAnterior([{ id_medicion: 'x' }]), null);

  const meds = [
    { id_medicion: 'a', timestamp: '2026-11-05T15:00:00+00:00' },
    { id_medicion: 'b', timestamp: '2026-11-04T10:00:00+00:00' },
    { id_medicion: 'c', timestamp: '2026-11-04T09:00:00+00:00' },
  ];
  const p = paginaAnterior(meds, 30);
  assert.equal(p.hasta, '2026-11-04');
  // 'b' y 'c' caen en el rango pedido; 'a' (11-05 15:00Z) queda fuera del fin del día local 11-04
  assert.equal(p.limit, 2 + 30);
  // el límite nunca pasa del máximo del backend
  assert.equal(paginaAnterior(meds, 5000, 1000).limit, 1000);
});

test('mezclarMediciones - dedupe por id y orden descendente', () => {
  const actuales = [
    { id_medicion: 'a', timestamp: '2026-11-05T10:00:00Z', _localUri: 'file://a' },
    { id_medicion: 'b', timestamp: '2026-11-04T10:00:00Z' },
  ];
  const nuevas = [
    { id_medicion: 'b', timestamp: '2026-11-04T10:00:00Z' },
    { id_medicion: 'c', timestamp: '2026-11-03T10:00:00Z' },
    { id_medicion: 'd', timestamp: '2026-11-04T12:00:00Z' },
  ];
  const { lista, agregadas } = mezclarMediciones(actuales, nuevas);
  assert.deepEqual(lista.map((m) => m.id_medicion), ['a', 'd', 'b', 'c']);
  assert.equal(agregadas, 2);
  assert.equal(lista[0]._localUri, 'file://a');
  assert.equal(mezclarMediciones(actuales, actuales).agregadas, 0);
});

test('hayMasMediciones - usa truncado con rango y el total sin rango', () => {
  assert.equal(hayMasMediciones({ total: 30, mediciones: new Array(30) }, 30), true);
  assert.equal(hayMasMediciones({ total: 12, mediciones: new Array(12) }, 30), false);
  assert.equal(hayMasMediciones({ mediciones: [], truncado: true }, 60, 5), true);
  assert.equal(hayMasMediciones({ mediciones: [], truncado: false }, 60, 5), false);
  // si el rango no aportó nada nuevo, no se ofrece cargar más (evita bucle vacío)
  assert.equal(hayMasMediciones({ mediciones: [], truncado: true }, 60, 0), false);
  assert.equal(hayMasMediciones(null, 30), false);
});

test('resumirCola - imagen y medición salen del mismo ítem; fallidas visibles', () => {
  const cola = [
    { uri: 'file://1', status: 'lista', medicion: { id_medicion: 'm1' } },
    { uri: 'file://2', status: 'error', error: 'Sin conexión con el servidor.', imagenKey: 'k2' },
    { uri: 'file://3', status: 'lista', medicion: { id_medicion: 'm3' } },
    { uri: 'file://4', status: 'error', error: 'Otro' },
    { uri: 'file://5', status: 'esperando' },
  ];
  const r = resumirCola(cola);
  assert.equal(r.total, 5);
  assert.equal(r.listas, 2);
  assert.equal(r.fallidas, 2);
  assert.equal(r.primerError, 'Sin conexión con el servidor.');
  assert.equal(r.ultimaLista.uri, 'file://3');
  assert.equal(r.ultimaLista.medicion.id_medicion, 'm3');

  assert.equal(textoResumenCola({ total: 5, listas: 3, fallidas: 2 }), '3 de 5 fotos analizadas; 2 fallaron.');
  assert.equal(textoResumenCola({ total: 3, listas: 2, fallidas: 1 }), '2 de 3 fotos analizadas; 1 falló.');
  assert.equal(textoResumenCola({ total: 4, listas: 4, fallidas: 0 }), '4 de 4 fotos analizadas.');
  assert.equal(textoResumenCola({ total: 1, listas: 1, fallidas: 0 }), '');
  assert.equal(resumirCola([]).ultimaLista, null);
});
