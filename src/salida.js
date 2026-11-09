// src/salida.js — Guardar la nota del resultado antes de salir o reintentar. Sin React Native.
// App crea este manejador con sus dependencias reales (refs con los valores MÁS RECIENTES, guardado local, modal) y la
// pantalla usa exactamente estas funciones; las pruebas ejercen las mismas con dependencias simuladas.

const mismo = (a, b) => Boolean(a && b) && a.id === b.id && a.espesor === b.espesor && a.descripcion === b.descripcion;

// Guarda la nota vigente y VUELVE A GUARDAR mientras el borrador cambie durante el guardado (una edición hecha mientras
// esperaba el almacenamiento no se pierde). Devuelve true si lo último escrito quedó guardado (o no había nada que guardar).
//   leer()  -> { hayResultado, id, espesor, descripcion, cambiaron }   (valores más recientes, p. ej. desde refs)
//   guardar(v) -> Promise<boolean>   guarda EXACTAMENTE la versión v
export async function guardarNotaVigente({ leer, guardar, maxIntentos = 5 }) {
  let guardado = null;
  for (let i = 0; i < maxIntentos; i++) {
    const v = leer();
    if (!v.hayResultado) return true;
    if (guardado ? mismo(guardado, v) : !v.cambiaron) return true;
    if ((await guardar(v)) === false) return false;
    guardado = v;
  }
  return mismo(guardado, leer());
}

// Manejador de "salir del resultado" y "reintentar las fallidas".
//   preguntarNotaFallida({ reintentar, descartar, descartarLabel }) muestra el diálogo (la nota sigue en pantalla);
//   resolverSalida(continuar) sigue con la salida normal (avisa de fotos fallidas pendientes).
export function crearSalidaResultado({ leer, guardar, preguntarNotaFallida, resolverSalida }) {
  const asegurarNota = () => guardarNotaVigente({ leer, guardar });

  const salir = async (continuar) => {
    if (!(await asegurarNota())) {
      preguntarNotaFallida({
        descartarLabel: 'Descartar la nota y continuar',
        reintentar: () => salir(continuar),
        descartar: () => resolverSalida(continuar),
      });
      return;
    }
    resolverSalida(continuar);
  };
  // "Reintentar las fallidas": analizar() limpia las notas del resultado en pantalla, así que primero se guarda la nota
  // vigente; si no se puede guardar, NO se reintenta (la nota sigue en pantalla) y se ofrece reintentar el guardado o
  // descartar la nota y seguir con el análisis.
  const reintentar = async (analizar) => {
    if (!(await asegurarNota())) {
      preguntarNotaFallida({
        descartarLabel: 'Descartar la nota y reintentar',
        reintentar: () => reintentar(analizar),
        descartar: () => analizar(),
      });
      return;
    }
    return analizar();
  };
  return { salir, reintentar };
}
