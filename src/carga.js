// Progressive publication shared by independent resource requests. No React dependencies.
export function crearPublicadorCarga({ sesionVigente, esSesionVencida, alVencer, alErrorPublicacion }) {
  let vencida = false;
  let falloPublicacion = false;
  const vigente = () => sesionVigente() && !vencida;

  const tarea = async (promesa, publicar, alFallar) => {
    let recibida = false;
    try {
      const valor = await promesa;
      if (!vigente()) return;
      recibida = true;
      // Async publishers must recheck this guard after every await before publishing again.
      await publicar(valor, vigente);
    } catch (error) {
      if (!vigente()) return;
      if (esSesionVencida(error)) {
        vencida = true;
        alVencer(error);
      } else if (recibida) {
        falloPublicacion = true;
        alErrorPublicacion(error);
      } else {
        await alFallar?.(error);
      }
    }
  };

  return { tarea, vigente, get falloPublicacion() { return falloPublicacion; } };
}
