import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSalidaResultado, guardarNotaVigente } from '../src/salida.js';

// Entorno simulado con el MISMO manejador que usa App: un borrador editable, un almacenamiento que puede demorar o fallar,
// y registro de lo guardado, del diálogo y de cómo terminó la salida.
function entorno({ nota = { id: 'A', espesor: '', descripcion: '' }, guardada = null } = {}) {
  const e = {
    nota: { ...nota },
    guardada,
    guardados: [],
    dialogos: [],
    resoluciones: 0,
    falla: false,
    pendientes: [], // funciones que resuelven guardados diferidos
    diferir: false,
  };
  const leer = () => ({
    hayResultado: true,
    id: e.nota.id,
    espesor: e.nota.espesor,
    descripcion: e.nota.descripcion,
    cambiaron: !e.guardada || e.guardada.espesor !== e.nota.espesor || e.guardada.descripcion !== e.nota.descripcion
      ? Boolean(e.nota.espesor || e.nota.descripcion || e.guardada)
      : false,
  });
  const guardar = (v) =>
    new Promise((res) => {
      const terminar = () => {
        if (e.falla) return res(false);
        e.guardados.push({ id: v.id, espesor: v.espesor, descripcion: v.descripcion });
        e.guardada = { espesor: v.espesor, descripcion: v.descripcion };
        res(true);
      };
      if (e.diferir) e.pendientes.push(terminar);
      else terminar();
    });
  e.salida = crearSalidaResultado({
    leer,
    guardar,
    preguntarNotaFallida: (d) => e.dialogos.push(d),
    resolverSalida: () => {
      e.resoluciones++;
    },
  });
  return e;
}
const tick = () => new Promise((r) => setImmediate(r));

test('I14: sin cambios en las notas, la salida sigue sin guardar nada', async () => {
  const e = entorno();
  await e.salida.salir(() => {});
  assert.equal(e.guardados.length, 0);
  assert.equal(e.resoluciones, 1);
});

test('I14: una nota nueva se guarda y luego se sale', async () => {
  const e = entorno({ nota: { id: 'A', espesor: '3', descripcion: 'óxido' } });
  await e.salida.salir(() => {});
  assert.deepEqual(e.guardados, [{ id: 'A', espesor: '3', descripcion: 'óxido' }]);
  assert.equal(e.resoluciones, 1);
});

test('I14: si el usuario edita mientras se guarda, se guarda otra vez la versión vigente antes de salir', async () => {
  const e = entorno({ nota: { id: 'A', espesor: '', descripcion: 'A' } });
  e.diferir = true;
  const salida = e.salida.salir(() => {});
  await tick();
  assert.equal(e.pendientes.length, 1); // primer guardado (versión "A") en espera
  e.nota.descripcion = 'B'; // edición durante la espera
  e.pendientes.shift()(); // el almacenamiento termina de guardar "A"
  await tick();
  assert.equal(e.resoluciones, 0); // todavía no sale: lo vigente ("B") no está guardado
  assert.equal(e.pendientes.length, 1);
  e.pendientes.shift()();
  await salida;
  assert.deepEqual(e.guardados.map((g) => g.descripcion), ['A', 'B']);
  assert.equal(e.resoluciones, 1);
});

test('I14: si el resultado cambia durante el guardado, también se guarda la nota del nuevo resultado', async () => {
  const e = entorno({ nota: { id: 'A', espesor: '', descripcion: 'nota A' } });
  e.diferir = true;
  const salida = e.salida.salir(() => {});
  await tick();
  e.nota = { id: 'B', espesor: '2', descripcion: 'nota B' };
  e.guardada = null;
  e.pendientes.shift()();
  await tick();
  e.pendientes.shift()();
  await salida;
  assert.deepEqual(e.guardados.map((g) => g.id), ['A', 'B']);
});

test('I14: si el guardado falla, no sale: el diálogo ofrece reintentar o descartar y la nota sigue intacta', async () => {
  const e = entorno({ nota: { id: 'A', espesor: '3', descripcion: 'nota' } });
  e.falla = true;
  await e.salida.salir(() => {});
  assert.equal(e.resoluciones, 0);
  assert.equal(e.dialogos.length, 1);
  assert.deepEqual(e.nota, { id: 'A', espesor: '3', descripcion: 'nota' });
  e.falla = false;
  e.dialogos[0].reintentar();
  await tick();
  await tick();
  assert.equal(e.resoluciones, 1);
  assert.equal(e.guardados.length, 1);
});

test('I14: "descartar" sigue con la salida sin guardar', async () => {
  const e = entorno({ nota: { id: 'A', espesor: '3', descripcion: 'nota' } });
  e.falla = true;
  await e.salida.salir(() => {});
  e.dialogos[0].descartar();
  assert.equal(e.resoluciones, 1);
  assert.equal(e.guardados.length, 0);
});

test('guardarNotaVigente se rinde si el borrador nunca se estabiliza', async () => {
  let n = 0;
  const ok = await guardarNotaVigente({
    leer: () => ({ hayResultado: true, id: 'A', espesor: '', descripcion: String(n++), cambiaron: true }),
    guardar: async () => true,
    maxIntentos: 3,
  });
  assert.equal(ok, false);
});

// ───── I13: "Reintentar las fallidas" desde el resultado ─────
function conAnalisis(e) {
  e.analisis = 0;
  e.analizar = async () => {
    // lo que hace App.analizar: limpia las notas del resultado en pantalla
    e.analisis++;
    e.nota = { id: 'B', espesor: '', descripcion: '' };
  };
  return e;
}

test('I13: Reintentar guarda primero la nota escrita (aunque el autoguardado de 700 ms no haya corrido) y luego analiza', async () => {
  const e = conAnalisis(entorno({ nota: { id: 'A', espesor: '3', descripcion: 'recién escrita' } }));
  const orden = [];
  const original = e.analizar;
  e.analizar = async () => {
    orden.push(`analizar con ${e.guardados.length} guardado(s)`);
    return original();
  };
  await e.salida.reintentar(e.analizar);
  assert.deepEqual(e.guardados, [{ id: 'A', espesor: '3', descripcion: 'recién escrita' }]);
  assert.deepEqual(orden, ['analizar con 1 guardado(s)']);
});

test('I13: con el almacenamiento fallando NO se analiza (no se borra la nota) y se ofrece reintentar o descartar', async () => {
  const e = conAnalisis(entorno({ nota: { id: 'A', espesor: '3', descripcion: 'nota' } }));
  e.falla = true;
  await e.salida.reintentar(e.analizar);
  assert.equal(e.analisis, 0);
  assert.deepEqual(e.nota, { id: 'A', espesor: '3', descripcion: 'nota' });
  assert.equal(e.dialogos.length, 1);
  assert.match(e.dialogos[0].descartarLabel, /reintentar/i);
  // el usuario reintenta guardar y ahora funciona
  e.falla = false;
  e.dialogos[0].reintentar();
  await tick();
  await tick();
  assert.equal(e.analisis, 1);
  assert.equal(e.guardados.length, 1);
});

test('I13: descartar la nota sigue con el análisis', async () => {
  const e = conAnalisis(entorno({ nota: { id: 'A', espesor: '3', descripcion: 'nota' } }));
  e.falla = true;
  await e.salida.reintentar(e.analizar);
  e.dialogos[0].descartar();
  await tick();
  assert.equal(e.analisis, 1);
  assert.equal(e.guardados.length, 0);
});

test('I13: sin nota nueva, Reintentar analiza directo', async () => {
  const e = conAnalisis(entorno());
  await e.salida.reintentar(e.analizar);
  assert.equal(e.analisis, 1);
  assert.equal(e.guardados.length, 0);
});
