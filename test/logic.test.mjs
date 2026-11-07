import test from 'node:test';
import assert from 'node:assert/strict';

import {
  nombreCortoBloque,
  inicialBloque,
  puedeGestionarMedicion,
  puedeGestionarLote,
  traducirAuthError,
  nivelDePct,
  dividirEnTandas,
  LOTE_MAX_BACKEND,
  clasificarErrorSubida,
  paginaAnterior,
  mezclarMediciones,
  hayMasMediciones,
  resumirCola,
  textoResumenCola,
  listaDeRespuesta,
  esSesionVencida,
  conAutor,
  parteArchivoForm,
  navegarAtras,
  pendientesAlSalir,
  datosEmpresa,
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

test('nivelDePct - umbrales reales del backend (única fuente, la usa severidadDePct)', () => {
  assert.equal(nivelDePct(0), 0);
  assert.equal(nivelDePct(null), 0);
  assert.equal(nivelDePct(-5), 0);
  assert.equal(nivelDePct('0.04'), 0); // los GET traen el % como string
  assert.equal(nivelDePct(0.05), 1); // Leve desde 0.05
  assert.equal(nivelDePct('5.2'), 1);
  assert.equal(nivelDePct(9.99), 1);
  assert.equal(nivelDePct(10.0), 2); // Moderada 10-25
  assert.equal(nivelDePct(24.9), 2);
  assert.equal(nivelDePct(25.0), 3); // Severa >= 25
  assert.equal(nivelDePct(75.5), 3);
});

test('dividirEnTandas - respeta el máximo de 100 por solicitud del backend', () => {
  const items = Array.from({ length: 250 }, (_, i) => i);
  const tandas = dividirEnTandas(items);
  assert.deepEqual(tandas.map((t) => t.length), [100, 100, 50]);
  assert.deepEqual(tandas.flat(), items);
  assert.deepEqual(dividirEnTandas([]), []);
  assert.equal(LOTE_MAX_BACKEND, 100);
});

test('clasificarErrorSubida - 409 se reintenta, 410 no, 401 no', () => {
  assert.equal(clasificarErrorSubida({ status: 409, message: 'Se está analizando' }).reintentable, true);
  const r410 = clasificarErrorSubida({ status: 410, message: 'Ya se procesó antes' });
  assert.equal(r410.reintentable, false);
  assert.equal(r410.mensaje, 'Ya se procesó antes');
  assert.equal(clasificarErrorSubida({ status: 401 }).reintentable, false);
  assert.equal(clasificarErrorSubida({ status: 500, message: 'Error en el servidor.' }).reintentable, true);
  assert.equal(clasificarErrorSubida(new Error('Sin conexión con el servidor.')).reintentable, true);
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

test('listaDeRespuesta - acepta arreglo, {mediciones} o {items}; nunca revienta', () => {
  assert.deepEqual(listaDeRespuesta([{ a: 1 }]), [{ a: 1 }]);
  assert.deepEqual(listaDeRespuesta({ mediciones: [{ b: 2 }] }), [{ b: 2 }]);
  assert.deepEqual(listaDeRespuesta({ items: [{ c: 3 }] }), [{ c: 3 }]);
  assert.deepEqual(listaDeRespuesta(null), []);
  assert.deepEqual(listaDeRespuesta({}), []);
});

test('esSesionVencida - solo el 401 del backend', () => {
  assert.equal(esSesionVencida({ status: 401 }), true);
  assert.equal(esSesionVencida({ status: 403 }), false);
  assert.equal(esSesionVencida(new Error('Sin conexión con el servidor.')), false);
  assert.equal(esSesionVencida(null), false);
});

test('conAutor - completa tomado_por_id/usuario_id para que el técnico gestione su foto nueva', () => {
  const perfil = { rol: 'tecnico', cognito_sub: 'sub-123', id_usuario: 'USR-abc' };
  const nueva = conAutor({ id_medicion: 'm1' }, perfil);
  assert.equal(nueva.tomado_por_id, 'sub-123');
  assert.equal(nueva.usuario_id, 'sub-123');
  assert.equal(puedeGestionarMedicion(perfil, nueva), true);
  // Respeta lo que ya traiga la respuesta y no muta el original
  const original = { id_medicion: 'm2', tomado_por_id: 'otro' };
  assert.equal(conAutor(original, perfil).tomado_por_id, 'otro');
  assert.equal(original.usuario_id, undefined);
  // Sin perfil/sub no inventa autor
  assert.deepEqual(conAutor({ id_medicion: 'm3' }, null), { id_medicion: 'm3' });
});

test('parteArchivoForm - nativo usa {uri,name,type}; web descarga un Blob con nombre', async () => {
  const nativo = await parteArchivoForm({ uri: 'file:///a.jpg', type: 'image/jpeg', esWeb: false });
  assert.deepEqual(nativo.valor, { uri: 'file:///a.jpg', name: 'foto.jpg', type: 'image/jpeg' });
  assert.equal(nativo.nombre, undefined);

  const blobFalso = { size: 3 };
  let pedida = null;
  const web = await parteArchivoForm({
    uri: 'blob:http://x/1',
    esWeb: true,
    fetchFn: async (u) => {
      pedida = u;
      return { blob: async () => blobFalso };
    },
  });
  assert.equal(pedida, 'blob:http://x/1');
  assert.equal(web.valor, blobFalso);
  assert.equal(web.nombre, 'foto.jpg');
});

test('navegarAtras - limpia carpeta y lote al salir y nunca cae en uno viejo', () => {
  // detalle abierto desde una carpeta -> vuelve a la carpeta
  assert.deepEqual(navegarAtras({ screen: 'detail', tab: 'folders', folderClave: 'B1' }), { screen: 'folder' });
  // salir de la carpeta limpia folderClave
  assert.deepEqual(navegarAtras({ screen: 'folder', tab: 'folders', folderClave: 'B1' }), {
    screen: 'folders',
    folderClave: null,
  });
  // detalle abierto desde un lote -> vuelve a la pestaña Lotes (el lote sigue abierto)
  assert.deepEqual(navegarAtras({ screen: 'detail', tab: 'lotes', loteSel: 'L1' }), { screen: 'lotes' });
  // atrás dentro de un lote -> lista de lotes, no inicio
  assert.deepEqual(navegarAtras({ screen: 'lotes', tab: 'lotes', loteSel: 'L1' }), { loteSel: null });
  // desde la lista de lotes u otra pestaña -> inicio
  assert.deepEqual(navegarAtras({ screen: 'lotes', tab: 'lotes' }), {
    tab: 'home',
    screen: 'home',
    folderClave: null,
    loteSel: null,
  });
  // en inicio no hay a dónde volver (Android sale de la app)
  assert.equal(navegarAtras({ screen: 'home', tab: 'home' }), null);
});

test('pendientesAlSalir - avisa de fotos fallidas y observaciones sin guardar', () => {
  const ok = [{ status: 'lista' }];
  assert.equal(pendientesAlSalir({ cola: ok }).hay, false);
  assert.deepEqual(pendientesAlSalir({ cola: [{ status: 'lista' }, { status: 'error' }] }), {
    fallidas: 1,
    reintentables: 1,
    obsSinGuardar: false,
    hay: true,
  });
  // Observaciones escritas y no guardadas
  assert.equal(pendientesAlSalir({ cola: ok, espesor: '2.4' }).obsSinGuardar, true);
  // Ya guardadas e iguales -> nada pendiente
  const guardada = { espesor: '2.4', descripcion: 'Cara norte' };
  assert.equal(pendientesAlSalir({ cola: ok, espesor: '2.4', descripcion: 'Cara norte', guardada }).hay, false);
  // Editadas después de guardar -> pendiente
  assert.equal(pendientesAlSalir({ cola: ok, espesor: '2.5', descripcion: 'Cara norte', guardada }).obsSinGuardar, true);
  // Vacías -> nada
  assert.equal(pendientesAlSalir({ cola: ok, espesor: ' ', descripcion: '' }).hay, false);
});

test('datosEmpresa - sale del perfil y no inventa ciudad ni organización', () => {
  assert.deepEqual(
    datosEmpresa({ empresa_nombre: 'Acme', empresa_ciudad: 'Medellín', empresa_departamento: 'Antioquia' }),
    { nombre: 'Acme', ciudad: 'Medellín', departamento: 'Antioquia', linea: 'Acme · Medellín' }
  );
  assert.equal(datosEmpresa({ empresa_nombre: 'Acme' }).linea, 'Acme');
  assert.equal(datosEmpresa({ empresa_ciudad: 'Cali' }).linea, 'Cali');
  assert.deepEqual(datosEmpresa(null), { nombre: '', ciudad: '', departamento: '', linea: '' });
});

test('resumirCola/pendientesAlSalir - una fallida definitiva (410) no es reintentable', () => {
  const cola = [{ status: 'lista' }, { status: 'error', definitivo: true, error: 'ya procesada' }];
  assert.equal(resumirCola(cola).fallidas, 1);
  assert.equal(resumirCola(cola).reintentables, 0);
  assert.equal(pendientesAlSalir({ cola }).reintentables, 0);
  assert.equal(pendientesAlSalir({ cola }).hay, true);
});
