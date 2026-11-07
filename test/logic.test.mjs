import test from 'node:test';
import assert from 'node:assert/strict';

import {
  nombreCortoBloque,
  inicialBloque,
  puedeGestionarMedicion,
  traducirAuthError,
  calcularNivelCorrosion,
  calcularMetricasLote,
} from '../src/logic.js';

test('puedeGestionarMedicion - permisos por rol (alineados con web)', () => {
  const medicionPropia = { id_medicion: 'm1', tomado_por_id: 'sub-123' };
  const medicionPropiaAlt = { id_medicion: 'm1b', usuario_id: 'sub-123' };
  const medicionAjena = { id_medicion: 'm2', tomado_por_id: 'sub-456' };

  // Super admin y Admin pueden todo
  assert.equal(puedeGestionarMedicion({ rol: 'super_admin', sub: 'sub-999' }, medicionAjena), true);
  assert.equal(puedeGestionarMedicion({ rol: 'admin', sub: 'sub-999' }, medicionAjena), true);

  // Técnico solo lo propio (tomado_por_id o usuario_id)
  assert.equal(puedeGestionarMedicion({ rol: 'tecnico', sub: 'sub-123' }, medicionPropia), true);
  assert.equal(puedeGestionarMedicion({ rol: 'tecnico', sub: 'sub-123' }, medicionPropiaAlt), true);
  assert.equal(puedeGestionarMedicion({ rol: 'tecnico', sub: 'sub-123' }, medicionAjena), false);

  // Cliente nunca puede gestionar (editar/eliminar)
  assert.equal(puedeGestionarMedicion({ rol: 'cliente', sub: 'sub-123' }, medicionPropia), false);
  assert.equal(puedeGestionarMedicion({ rol: 'cliente', sub: 'sub-999' }, medicionAjena), false);

  // Perfil nulo o sin sub
  assert.equal(puedeGestionarMedicion(null, medicionPropia), false);
  assert.equal(puedeGestionarMedicion({ rol: 'tecnico' }, medicionPropia), false);
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
