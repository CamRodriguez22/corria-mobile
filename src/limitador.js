// src/limitador.js — Cola con tope de tareas simultáneas (lógica pura, sin React Native).
// Se usa para no lanzar decenas de peticiones a la vez (p. ej. un resumen diario por cada punto).
// Las tareas arrancan en orden de llegada (FIFO); si una falla, el error le llega a quien la pidió
// y la cola sigue con la siguiente.
export function crearLimitador(maxSimultaneas = 3) {
  const max = Math.max(1, Math.floor(maxSimultaneas) || 1);
  const espera = [];
  let activas = 0;

  // Settle obsolete queued callers without invoking their network task.
  const descartarObsoletas = () => {
    for (let i = espera.length - 1; i >= 0; i--) {
      if (!espera[i].vigente()) espera.splice(i, 1)[0].resolver(undefined);
    }
  };

  const siguiente = () => {
    descartarObsoletas();
    while (activas < max && espera.length) {
      const { tarea, vigente, resolver, rechazar } = espera.shift();
      activas++;
      // Promise.resolve().then: una tarea que lanza de forma síncrona también cuenta como fallo, no rompe la cola.
      Promise.resolve()
        .then(() => vigente() ? tarea() : undefined)
        .then(
          (v) => {
            activas--;
            resolver(v);
            siguiente();
          },
          (e) => {
            activas--;
            rechazar(e);
            siguiente();
          }
        );
    }
  };

  return {
    ejecutar(tarea, { vigente = () => true } = {}) {
      return new Promise((resolver, rechazar) => {
        espera.push({ tarea, vigente, resolver, rechazar });
        siguiente();
      });
    },
    descartarObsoletas,
    get activas() {
      return activas;
    },
    get enEspera() {
      return espera.length;
    },
  };
}
