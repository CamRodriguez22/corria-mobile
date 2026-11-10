// src/limitador.js — Cola con tope de tareas simultáneas (lógica pura, sin React Native).
// Se usa para no lanzar decenas de peticiones a la vez (p. ej. un resumen diario por cada punto).
// Las tareas arrancan en orden de llegada (FIFO); si una falla, el error le llega a quien la pidió
// y la cola sigue con la siguiente.
export function crearLimitador(maxSimultaneas = 3) {
  const max = Math.max(1, Math.floor(maxSimultaneas) || 1);
  const espera = [];
  let activas = 0;

  const siguiente = () => {
    while (activas < max && espera.length) {
      const { tarea, resolver, rechazar } = espera.shift();
      activas++;
      // Promise.resolve().then: una tarea que lanza de forma síncrona también cuenta como fallo, no rompe la cola.
      Promise.resolve()
        .then(tarea)
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
    ejecutar(tarea) {
      return new Promise((resolver, rechazar) => {
        espera.push({ tarea, resolver, rechazar });
        siguiente();
      });
    },
    get activas() {
      return activas;
    },
    get enEspera() {
      return espera.length;
    },
  };
}
